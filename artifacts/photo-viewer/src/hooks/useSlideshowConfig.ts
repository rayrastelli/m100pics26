import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

const CONFIG_ID = "default";

export function useSlideshowConfig() {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("slideshow_config")
      .select("photo_ids")
      .eq("id", CONFIG_ID)
      .single();
    const ids: string[] = Array.isArray(data?.photo_ids) ? data.photo_ids : [];
    setSavedIds(ids);
    setLoading(false);
    return ids;
  }, []);

  const save = useCallback(async (ids: string[]) => {
    setSaving(true);
    await supabase
      .from("slideshow_config")
      .upsert({ id: CONFIG_ID, photo_ids: ids, updated_at: new Date().toISOString() });
    setSavedIds(ids);
    setSaving(false);
  }, []);

  return { savedIds, loading, saving, load, save };
}
