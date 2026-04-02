import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { uploadPhotoVariants, uploadToGcs, deleteFromGcs, gcsPublicUrl, isGcsPath } from "@/lib/gcs";

export interface Photo {
  id: string;
  user_id: string;
  user_tag: string | null;
  title: string;
  description: string | null;
  storage_path: string;   // GCS: "pictureapp/<tag>/<file>", Supabase (legacy): "<uuid>/<file>"
  thumb_path: string | null;
  med_path: string | null;
  filename: string;
  mime_type: string;
  size: number;
  width: number | null;
  height: number | null;
  rating: number | null;
  slideshow: boolean;
  active: boolean;
  tags: string[];
  created_at: string;
  url?: string;       // Derived: full-resolution (GCS or legacy Supabase)
  thumb_url?: string; // Derived: 400px thumbnail
  med_url?: string;   // Derived: 1200px medium
}

const SUPABASE_BUCKET = "band-pics";

function normalizeTagName(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, "-");
}

function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map(normalizeTagName).filter(Boolean))];
}

async function ensureTagDefinitions(tags: string[]): Promise<void> {
  const normalized = normalizeTags(tags);
  if (normalized.length === 0) return;
  const payload = normalized.map((name) => ({ name }));
  const { error } = await supabase
    .from("tag_definitions")
    .upsert(payload, { onConflict: "name", ignoreDuplicates: true });
  if (error) throw error;
}

function resolvePhotoUrl(storagePath: string): string {
  if (isGcsPath(storagePath)) {
    return gcsPublicUrl(storagePath);
  }
  // Legacy: photo lives in Supabase Storage
  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export function usePhotos() {
  const { user, profile } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPhotos = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbErr } = await supabase
        .from("photos")
        .select("*")
        .order("created_at", { ascending: false });

      if (dbErr) throw dbErr;

      const photosWithUrls = (data ?? []).map((photo: Photo) => ({
        ...photo,
        tags: photo.tags ?? [],
        url: resolvePhotoUrl(photo.storage_path),
        thumb_url: photo.thumb_path ? gcsPublicUrl(photo.thumb_path) : undefined,
        med_url: photo.med_path ? gcsPublicUrl(photo.med_path) : undefined,
      }));

      setPhotos(photosWithUrls);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load photos");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const uploadPhoto = useCallback(
    async (
      file: File,
      title: string,
      tags?: string[]
    ): Promise<{ error: string | null }> => {
      if (!user) return { error: "Not authenticated" };
      if (!profile?.user_tag) return { error: "User tag not set — please set up your profile first" };

      try {
        // 1. Attempt multi-variant upload (full + thumb + med).
        //    If resizing or the extra uploads fail for any reason, fall back
        //    to a plain single-file upload so the photo is never lost.
        let fullPath: string;
        let thumbPath: string | null = null;
        let medPath: string | null = null;
        const pathsToClean: string[] = [];

        const variantResult = await uploadPhotoVariants(file, profile.user_tag);
        if (variantResult.error === null) {
          fullPath = variantResult.fullPath;
          thumbPath = variantResult.thumbPath;
          medPath = variantResult.medPath;
          pathsToClean.push(fullPath);
          if (thumbPath) pathsToClean.push(thumbPath);
          if (medPath) pathsToClean.push(medPath);
        } else {
          // Variant upload failed — fall back to full-res only
          console.warn("[upload] variant upload failed, falling back:", variantResult.error);
          const single = await uploadToGcs(file, profile.user_tag);
          if (single.error) return { error: single.error };
          fullPath = single.objectPath!;
          pathsToClean.push(fullPath);
        }

        // 2. Get image dimensions from the original file
        const dimensions = await getImageDimensions(file);

        // 3. Save metadata to Supabase DB.
        //    Only include thumb_path / med_path when they were actually created —
        //    this keeps the INSERT compatible even if migration 012 hasn't run yet.
        // Merge the user's own tag with any tags chosen at upload time
        const autoTags = profile.user_tag ? [profile.user_tag] : [];
        const mergedTags = normalizeTags([...autoTags, ...(tags ?? [])]);
        await ensureTagDefinitions(mergedTags);

        const insertData: Record<string, unknown> = {
          user_id: user.id,
          user_tag: profile.user_tag,
          title: title || file.name,
          description: null,
          storage_path: fullPath,
          filename: file.name,
          mime_type: file.type,
          size: file.size,
          width: dimensions?.width ?? null,
          height: dimensions?.height ?? null,
          rating: null,
          tags: mergedTags,
        };
        if (thumbPath) insertData.thumb_path = thumbPath;
        if (medPath) insertData.med_path = medPath;

        const { error: dbErr } = await supabase.from("photos").insert(insertData);

        if (dbErr) {
          // Best-effort cleanup of all uploaded GCS objects
          await Promise.allSettled(pathsToClean.map((p) => deleteFromGcs(p)));
          throw dbErr;
        }

        // Refresh to get the real DB row (with id, timestamps, etc.)
        await fetchPhotos();
        return { error: null };
      } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : "Upload failed" };
      }
    },
    [user, profile, fetchPhotos]
  );

  const deletePhoto = useCallback(
    async (photo: Photo): Promise<{ error: string | null }> => {
      try {
        if (isGcsPath(photo.storage_path)) {
          // Delete all three variants in parallel (ignore 404s)
          await Promise.allSettled([
            deleteFromGcs(photo.storage_path),
            photo.thumb_path ? deleteFromGcs(photo.thumb_path) : Promise.resolve(),
            photo.med_path ? deleteFromGcs(photo.med_path) : Promise.resolve(),
          ]);
        } else {
          // Legacy Supabase Storage
          const { error: storageErr } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .remove([photo.storage_path]);
          if (storageErr) throw storageErr;
        }

        // Delete metadata from Supabase DB
        const { error: dbErr } = await supabase.from("photos").delete().eq("id", photo.id);
        if (dbErr) throw dbErr;

        setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
        return { error: null };
      } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : "Delete failed" };
      }
    },
    []
  );

  const ratePhoto = useCallback(
    async (photoId: string, rating: number | null): Promise<{ error: string | null }> => {
      setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, rating } : p)));
      try {
        const { error: dbErr } = await supabase.from("photos").update({ rating }).eq("id", photoId);
        if (dbErr) { await fetchPhotos(); throw dbErr; }
        return { error: null };
      } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : "Rating failed" };
      }
    },
    [fetchPhotos]
  );

  const toggleSlideshow = useCallback(
    async (photoId: string, slideshow: boolean): Promise<{ error: string | null }> => {
      setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, slideshow } : p)));
      try {
        const { error: dbErr } = await supabase.from("photos").update({ slideshow }).eq("id", photoId);
        if (dbErr) { await fetchPhotos(); throw dbErr; }
        return { error: null };
      } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : "Toggle failed" };
      }
    },
    [fetchPhotos]
  );

  const toggleActive = useCallback(
    async (photoId: string, active: boolean): Promise<{ error: string | null }> => {
      setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, active } : p)));
      try {
        const { error: dbErr } = await supabase.from("photos").update({ active }).eq("id", photoId);
        if (dbErr) { await fetchPhotos(); throw dbErr; }
        return { error: null };
      } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : "Toggle failed" };
      }
    },
    [fetchPhotos]
  );

  const updateTags = useCallback(
    async (photoId: string, tags: string[]): Promise<{ error: string | null }> => {
      const normalizedTags = normalizeTags(tags);
      setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, tags: normalizedTags } : p)));
      try {
        await ensureTagDefinitions(normalizedTags);
      } catch (err: unknown) {
        await fetchPhotos();
        return { error: err instanceof Error ? err.message : "Failed to save tag definitions" };
      }
      const { error: rpcErr } = await supabase.rpc("update_photo_tags", {
        photo_id: photoId,
        new_tags: normalizedTags,
      });
      if (rpcErr) {
        await fetchPhotos();
        return { error: rpcErr.message };
      }
      return { error: null };
    },
    [fetchPhotos]
  );

  return { photos, loading, error, fetchPhotos, uploadPhoto, deletePhoto, ratePhoto, toggleSlideshow, toggleActive, updateTags };
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}
