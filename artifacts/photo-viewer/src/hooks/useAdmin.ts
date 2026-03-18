import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Profile } from "./useAuth";
import { gcsPublicUrl, isGcsPath, deleteFromGcs } from "@/lib/gcs";

const SUPABASE_BUCKET = "band-pics";

function resolvePhotoUrl(storagePath: string): string {
  if (isGcsPath(storagePath)) return gcsPublicUrl(storagePath);
  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export interface AdminPhoto {
  id: string;
  user_id: string;
  user_tag: string | null;
  title: string;
  description: string | null;
  storage_path: string;
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
  url?: string;
  owner_email?: string;
}

export function useAdmin() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [allPhotos, setAllPhotos] = useState<AdminPhoto[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Users ----

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    else setUsers((data ?? []) as Profile[]);
    setUsersLoading(false);
  }, []);

  const createUser = useCallback(async (email: string, password: string, role: "user" | "admin") => {
    const { data, error: authErr } = await supabase.auth.signUp({ email, password });
    if (authErr) return { error: authErr.message };
    if (!data.user) return { error: "User creation failed" };

    if (role === "admin") {
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", data.user.id);
      if (profileErr) return { error: profileErr.message };
    }

    await fetchUsers();
    return { error: null };
  }, [fetchUsers]);

  const updateUser = useCallback(async (userId: string, updates: { role?: "user" | "admin"; disabled?: boolean }) => {
    const { error: err } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);
    if (err) return { error: err.message };
    await fetchUsers();
    return { error: null };
  }, [fetchUsers]);

  const deleteUser = useCallback(async (userId: string) => {
    const { error: err } = await supabase
      .from("profiles")
      .update({ disabled: true })
      .eq("id", userId);
    if (err) return { error: err.message };
    await fetchUsers();
    return { error: null };
  }, [fetchUsers]);

  // ---- Photos ----

  const fetchAllPhotos = useCallback(async () => {
    setPhotosLoading(true);
    setError(null);

    const { data: photos, error: photoErr } = await supabase
      .from("photos")
      .select("*")
      .order("created_at", { ascending: false });

    if (photoErr) {
      setError(photoErr.message);
      setPhotosLoading(false);
      return;
    }

    const { data: profiles } = await supabase.from("profiles").select("id, email");
    const profileMap = new Map((profiles ?? []).map((p: { id: string; email: string }) => [p.id, p.email]));

    const photosWithUrls = (photos ?? []).map((photo: AdminPhoto) => ({
      ...photo,
      tags: photo.tags ?? [],
      url: resolvePhotoUrl(photo.storage_path),
      owner_email: profileMap.get(photo.user_id) ?? "Unknown",
    }));

    setAllPhotos(photosWithUrls);
    setPhotosLoading(false);
  }, []);

  const deleteAnyPhoto = useCallback(async (photo: AdminPhoto) => {
    // Delete from storage (GCS or legacy Supabase)
    if (isGcsPath(photo.storage_path)) {
      const { error: gcsErr } = await deleteFromGcs(photo.storage_path);
      if (gcsErr) return { error: gcsErr };
    } else {
      const { error: storageErr } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .remove([photo.storage_path]);
      if (storageErr) return { error: storageErr.message };
    }

    const { error: dbErr } = await supabase.from("photos").delete().eq("id", photo.id);
    if (dbErr) return { error: dbErr.message };

    setAllPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    return { error: null };
  }, []);

  return {
    users, usersLoading,
    allPhotos, photosLoading,
    error,
    fetchUsers, createUser, updateUser, deleteUser,
    fetchAllPhotos, deleteAnyPhoto,
  };
}
