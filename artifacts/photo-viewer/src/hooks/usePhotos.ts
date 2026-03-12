import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

export interface Photo {
  id: string;
  user_id: string;
  user_tag: string | null;
  title: string;
  description: string | null;
  storage_path: string;   // GCS object path: pictureapp/<usertag>/<filename>
  filename: string;
  mime_type: string;
  size: number;
  width: number | null;
  height: number | null;
  rating: number | null;
  slideshow: boolean;
  active: boolean;
  created_at: string;
  url?: string;           // Derived: full GCS public URL
}

const GCS_BUCKET = "boosterpics2026";

// Base URL for the api-server. In Replit dev the proxy routes /api to the
// api-server automatically, so an empty string (relative path) works.
// For Hostinger production, set VITE_API_URL to the deployed api-server origin.
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

function gcsPublicUrl(objectPath: string): string {
  return `https://storage.googleapis.com/${GCS_BUCKET}/${objectPath}`;
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
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (dbErr) throw dbErr;

      const photosWithUrls = (data ?? []).map((photo: Photo) => ({
        ...photo,
        url: gcsPublicUrl(photo.storage_path),
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
        // 1. Get a signed upload URL from the api-server
        const signRes = await fetch(`${API_BASE}/api/storage/sign-upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            userTag: profile.user_tag,
          }),
        });

        if (!signRes.ok) {
          const body = await signRes.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? "Failed to get upload URL");
        }

        const { signedUrl, objectPath, publicUrl } = await signRes.json() as {
          signedUrl: string;
          objectPath: string;
          publicUrl: string;
        };

        // 2. PUT the file directly to GCS using the signed URL
        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        if (!uploadRes.ok) {
          throw new Error(`GCS upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
        }

        // 3. Get image dimensions
        const dimensions = await getImageDimensions(file);

        // 4. Save metadata to Supabase (storage_path = GCS object path)
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
        });

        if (dbErr) {
          // Best-effort cleanup: delete the uploaded GCS file
          await fetch(`${API_BASE}/api/storage/object`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ objectPath }),
          }).catch(() => {});
          throw dbErr;
        }

        // Optimistically add the new photo to state
        const newPhoto: Photo = {
          id: "",
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
          slideshow: false,
          active: true,
          created_at: new Date().toISOString(),
          url: publicUrl,
        };
        setPhotos((prev) => [newPhoto, ...prev]);

        // Then refresh to get the real DB row (with id, etc.)
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
        // 1. Delete from GCS
        const delRes = await fetch(`${API_BASE}/api/storage/object`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ objectPath: photo.storage_path }),
        });

        if (!delRes.ok) {
          const body = await delRes.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? "GCS delete failed");
        }

        // 2. Delete metadata from Supabase
        const { error: dbErr } = await supabase
          .from("photos")
          .delete()
          .eq("id", photo.id);
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
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, rating } : p))
      );
      try {
        const { error: dbErr } = await supabase
          .from("photos")
          .update({ rating })
          .eq("id", photoId);
        if (dbErr) {
          await fetchPhotos();
          throw dbErr;
        }
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

  return { photos, loading, error, fetchPhotos, uploadPhoto, deletePhoto, ratePhoto, toggleSlideshow, toggleActive };
}

async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
