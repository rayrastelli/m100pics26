import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

const CURRENT_KEY = "bandpics-current-show";

export interface Slideshow {
  id: string;
  name: string;
  photo_ids: string[];
  created_at: string;
  updated_at: string;
}

export function useSlideshowConfig() {
  const [shows, setShows] = useState<Slideshow[]>([]);
  const [currentShowId, setCurrentShowId] = useState<string | null>(
    () => localStorage.getItem(CURRENT_KEY)
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadShows = useCallback(async (): Promise<Slideshow[]> => {
    setLoading(true);
    const { data } = await supabase
      .from("slideshows")
      .select("*")
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Slideshow[];
    setShows(list);
    setLoading(false);
    return list;
  }, []);

  const createShow = useCallback(async (name: string, ids: string[]): Promise<{ show: Slideshow | null; error: string | null }> => {
    setSaving(true);
    const { data, error } = await supabase
      .from("slideshows")
      .insert({ name: name.trim(), photo_ids: ids })
      .select()
      .single();
    setSaving(false);
    if (error || !data) return { show: null, error: error?.message ?? "Unknown error" };
    const show = data as Slideshow;
    setShows((prev) => [show, ...prev]);
    setCurrentShowId(show.id);
    localStorage.setItem(CURRENT_KEY, show.id);
    return { show, error: null };
  }, []);

  const deleteShow = useCallback(async (id: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.from("slideshows").delete().eq("id", id);
    if (error) return { error: error.message };
    setShows((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (currentShowId === id) {
        const fallback = next[0]?.id ?? null;
        setCurrentShowId(fallback);
        if (fallback) localStorage.setItem(CURRENT_KEY, fallback);
        else localStorage.removeItem(CURRENT_KEY);
      }
      return next;
    });
    return { error: null };
  }, [currentShowId]);

  const selectShow = useCallback((id: string) => {
    setCurrentShowId(id);
    localStorage.setItem(CURRENT_KEY, id);
  }, []);

  const updateShow = useCallback(
    async (
      id: string,
      updates: { name?: string; photo_ids?: string[] },
    ): Promise<{ show: Slideshow | null; error: string | null }> => {
      setSaving(true);
      const { data, error } = await supabase
        .from("slideshows")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      setSaving(false);
      if (error || !data) {
        return { show: null, error: error?.message ?? "Unknown error" };
      }
      const show = data as Slideshow;
      setShows((prev) => prev.map((s) => (s.id === id ? show : s)));
      return { show, error: null };
    },
    [],
  );

  return {
    shows,
    currentShowId,
    loading,
    saving,
    loadShows,
    createShow,
    deleteShow,
    selectShow,
    updateShow,
  };
}
