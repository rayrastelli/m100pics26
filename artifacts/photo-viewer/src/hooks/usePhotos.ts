import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { uploadToGcs, deleteFromGcs, gcsPublicUrl, isGcsPath } from "@/lib/gcs";

export interface Photo {
  id: string;
  user_id: string;
  user_tag: string | null;
  title: string;
  description: string | null;
  storage_path: string;   // GCS: "pictureapp/<tag>/<file>", Supabase (legacy): "<uuid>/<file>"
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
  url?: string;           // Derived: GCS public URL or Supabase Storage URL (legacy)
}

const SUPABASE_BUCKET = "band-pics";

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
      description?: string
    ): Promise<{ error: string | null }> => {
      if (!user) return { error: "Not authenticated" };
      if (!profile?.user_tag) return { error: "User tag not set — please set up your profile first" };

      try {
        // 1. Upload to GCS via signed URL
        const { objectPath, publicUrl, error: uploadErr } = await uploadToGcs(file, profile.user_tag);
        if (uploadErr) return { error: uploadErr };

        // 2. Get image dimensions
        const dimensions = await getImageDimensions(file);

        // 3. Save metadata to Supabase DB (storage_path = GCS object path)
        const autoTags = profile.user_tag ? [profile.user_tag] : [];

        const { error: dbErr } = await supabase.from("photos").insert({
          user_id: user.id,
          user_tag: profile.user_tag,
          title: title || file.name,
          description: description || null,
          storage_path: objectPath,
          filename: file.name,
          mime_type: file.type,
          size: file.size,
          width: dimensions?.width ?? null,
          height: dimensions?.height ?? null,
          rating: null,
          tags: autoTags,
        });

        if (dbErr) {
          // Best-effort cleanup: delete the GCS object
          await deleteFromGcs(objectPath!).catch(() => {});
          throw dbErr;
        }

        // Optimistically add to state
        const newPhoto: Photo = {
          id: "",
          user_id: user.id,
          user_tag: profile.user_tag,
          title: title || file.name,
          description: description || null,
          storage_path: objectPath!,
          filename: file.name,
          mime_type: file.type,
          size: file.size,
          width: dimensions?.width ?? null,
          height: dimensions?.height ?? null,
          rating: null,
          slideshow: false,
          active: true,
          tags: autoTags,
          created_at: new Date().toISOString(),
          url: publicUrl!,
        };
        setPhotos((prev) => [newPhoto, ...prev]);

        // Refresh to get the real DB row (with id, etc.)
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
        // 1. Delete from storage (GCS or legacy Supabase)
        if (isGcsPath(photo.storage_path)) {
          const { error: gcsErr } = await deleteFromGcs(photo.storage_path);
          if (gcsErr) throw new Error(gcsErr);
        } else {
          const { error: storageErr } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .remove([photo.storage_path]);
          if (storageErr) throw storageErr;
        }

        // 2. Delete metadata from Supabase DB
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
      setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, tags } : p)));
      const { error: rpcErr } = await supabase.rpc("update_photo_tags", {
        photo_id: photoId,
        new_tags: tags,
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
