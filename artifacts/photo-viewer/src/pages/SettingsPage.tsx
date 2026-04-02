import { useEffect, useState } from "react";
import { Plus, Trash2, Tag, AlertCircle, Loader2 } from "lucide-react";
import { useTags } from "@/hooks/useTags";
import { useAuth } from "@/hooks/useAuth";
import {
  DEFAULT_TAG_SHORTCUT_SETTINGS,
  readTagShortcutSettings,
  TagShortcutSettings,
  writeTagShortcutSettings,
} from "@/lib/tagShortcutSettings";

export default function SettingsPage() {
  const { tags, loading, error, addTag, deleteTag } = useTags();
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [shortcutTags, setShortcutTags] = useState<TagShortcutSettings>(
    DEFAULT_TAG_SHORTCUT_SETTINGS,
  );

  useEffect(() => {
    if (!user) return;
    setShortcutTags(readTagShortcutSettings(user.id));
  }, [user]);

  const setShortcutTag = (key: keyof TagShortcutSettings, value: string) => {
    if (!user) return;
    const normalized = value || null;
    setShortcutTags((prev) => {
      const next = { ...prev, [key]: normalized };
      writeTagShortcutSettings(user.id, next);
      return next;
    });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setAdding(true);
    setAddError(null);
    const { error: err } = await addTag(input);
    if (err) setAddError(err);
    else setInput("");
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteTag(id);
    setDeletingId(null);
  };

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage the master list of picture tags. These tags appear in the photo editor and gallery filter.
        </p>
      </div>

      {/* Tag Definitions section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-zinc-400" />
          <h2 className="text-base font-semibold text-zinc-200">Keyboard Picture Tag Shortcuts</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(["j", "k", "l"] as const).map((keyName) => (
            <div key={keyName}>
              <label className="block text-xs text-zinc-400 mb-1.5 uppercase">
                {keyName} spot
              </label>
              <select
                value={shortcutTags[keyName] ?? ""}
                onChange={(e) => setShortcutTag(keyName, e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              >
                <option value="">(none)</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.name}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <p className="text-xs text-zinc-600">
          In Gallery view, hover a photo and press <span className="text-zinc-400">J</span>,{" "}
          <span className="text-zinc-400">K</span>, or <span className="text-zinc-400">L</span> to toggle the selected picture tag on/off.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-zinc-400" />
          <h2 className="text-base font-semibold text-zinc-200">Picture Tags</h2>
          <span className="ml-auto text-xs text-zinc-500">{tags.length} tag{tags.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Add form */}
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => { setInput(e.target.value); setAddError(null); }}
            placeholder="e.g. colorguard, drumline, piccolo…"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-zinc-500 transition-colors"
            disabled={adding}
          />
          <button
            type="submit"
            disabled={adding || !input.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-200 active:bg-zinc-300 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add
          </button>
        </form>

        {addError && (
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {addError}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Tags table */}
        <div className="border border-zinc-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
            </div>
          ) : tags.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">
              No tags yet. Add one above.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">Tag</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wide hidden sm:table-cell">Added</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {tags.map((tag) => (
                  <tr key={tag.id} className="group hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <Tag className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                        <span className="text-zinc-200 font-medium">{tag.name}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 hidden sm:table-cell">
                      {new Date(tag.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => handleDelete(tag.id)}
                        disabled={deletingId === tag.id}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                        title={`Delete "${tag.name}"`}
                      >
                        {deletingId === tag.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-zinc-600">
          Tags are stored in lowercase with hyphens instead of spaces (e.g. "Color Guard" becomes "color-guard").
          Deleting a tag from this list does not remove it from photos that already have it.
        </p>
      </section>
    </main>
  );
}
