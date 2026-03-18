import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface TagDefinition {
  id: string;
  name: string;
  created_at: string;
}

export function useTags() {
  const [tags, setTags] = useState<TagDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("tag_definitions")
      .select("*")
      .order("name", { ascending: true });
    if (err) setError(err.message);
    else setTags(data ?? []);
    setLoading(false);
  }, []);

  const addTag = useCallback(async (name: string): Promise<{ error: string | null }> => {
    const trimmed = name.trim().toLowerCase().replace(/\s+/g, "-");
    if (!trimmed) return { error: "Tag name cannot be empty" };
    const { data, error: err } = await supabase
      .from("tag_definitions")
      .insert({ name: trimmed })
      .select()
      .single();
    if (err) {
      if (err.code === "23505") return { error: `Tag "${trimmed}" already exists` };
      return { error: err.message };
    }
    setTags((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return { error: null };
  }, []);

  const deleteTag = useCallback(async (id: string): Promise<{ error: string | null }> => {
    const { error: err } = await supabase.from("tag_definitions").delete().eq("id", id);
    if (err) return { error: err.message };
    setTags((prev) => prev.filter((t) => t.id !== id));
    return { error: null };
  }, []);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  const tagNames = tags.map((t) => t.name);

  return { tags, tagNames, loading, error, fetchTags, addTag, deleteTag };
}
