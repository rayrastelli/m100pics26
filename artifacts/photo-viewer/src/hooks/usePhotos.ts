import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

export interface Photo {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  storage_path: string;
  filename: string;
  mime_type: string;
  size: number;
  width: number | null;
  height: number | null;
  rating: number | null;
  created_at: string;
  url?: string;
}

export function usePhotos() {
  const { user } = useAuth();
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

      const photosWithUrls = (data ?? []).map((photo: Photo) => {
        const { data: urlData } = supabase.storage
          .from("photos")
          .getPublicUrl(photo.storage_path);
        return { ...photo, url: urlData.publicUrl };
      });

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

      try {
        const ext = file.name.split(".").pop();
        const storagePath = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from("photos")
          .upload(storagePath, file, { contentType: file.type });

        if (uploadErr) throw uploadErr;

        const dimensions = await getImageDimensions(file);

        const { error: dbErr } = await supabase.from("photos").insert({
          user_id: user.id,
          title: title || file.name,
          description: description || null,
          storage_path: storagePath,
          filename: file.name,
          mime_type: file.type,
          size: file.size,
          width: dimensions?.width ?? null,
          height: dimensions?.height ?? null,
          rating: null,
        });

        if (dbErr) {
          await supabase.storage.from("photos").remove([storagePath]);
          throw dbErr;
        }

        await fetchPhotos();
        return { error: null };
      } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : "Upload failed" };
      }
    },
    [user, fetchPhotos]
  );

  const deletePhoto = useCallback(
    async (photo: Photo): Promise<{ error: string | null }> => {
      try {
        const { error: storageErr } = await supabase.storage
          .from("photos")
          .remove([photo.storage_path]);
        if (storageErr) throw storageErr;

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

  return { photos, loading, error, fetchPhotos, uploadPhoto, deletePhoto, ratePhoto };
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
