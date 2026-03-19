import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { X, Tag, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagEditorProps {
  tags: string[];
  allTags: string[];
  onChange: (tags: string[]) => void;
  className?: string;
}

export function TagEditor({ tags, allTags, onChange, className }: TagEditorProps) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalise = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "-");

  // Tags not yet applied, matching the search input
  const search = input.toLowerCase();
  const matchingExisting = allTags.filter(
    (t) => t.toLowerCase().includes(search) && !tags.includes(t)
  );
  // Already-applied tags matching search (so user can remove via dropdown too)
  const matchingApplied = tags.filter((t) => t.toLowerCase().includes(search));

  const isNewTag =
    input.trim().length > 0 &&
    !allTags.map(normalise).includes(normalise(input)) &&
    !tags.map(normalise).includes(normalise(input));

  const addTag = useCallback(
    (raw: string) => {
      const tag = normalise(raw);
      if (!tag || tags.includes(tag)) return;
      onChange([...tags, tag]);
      setInput("");
    },
    [tags, onChange]
  );

  const removeTag = useCallback(
    (tag: string) => onChange(tags.filter((t) => t !== tag)),
    [tags, onChange]
  );

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === "," || e.key === "Tab") && input.trim()) {
      e.preventDefault();
      // If exactly one matching suggestion exists and input isn't a new tag, pick it
      if (matchingExisting.length === 1 && !isNewTag) {
        addTag(matchingExisting[0]);
      } else {
        addTag(input);
      }
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className={cn("w-full relative", className)}>
      {/* ── Chip + input row ── */}
      <div
        className={cn(
          "flex flex-wrap gap-1.5 p-2 border rounded-xl cursor-text min-h-[42px] transition-colors",
          open
            ? "bg-white/8 border-zinc-500"
            : "bg-white/5 border-zinc-600 hover:border-zinc-500"
        )}
        onClick={() => { inputRef.current?.focus(); setOpen(true); }}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 px-2 py-0.5 bg-zinc-600/80 rounded-md text-xs text-white/90 select-none"
          >
            <Tag className="w-2.5 h-2.5 text-white/40" />
            {tag}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); removeTag(tag); }}
              className="text-white/40 hover:text-white/90 transition-colors ml-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onKeyDown={handleKey}
          placeholder={tags.length === 0 ? "Add tags…" : ""}
          className="flex-1 min-w-[90px] bg-transparent text-sm text-zinc-400 placeholder:text-zinc-600 outline-none py-0.5"
        />
      </div>

      {/* ── Dropdown ── */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-zinc-850 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
          style={{ backgroundColor: "#1e1e22" }}>
          {/* Applied tags (shown first so user can remove) */}
          {matchingApplied.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Applied</span>
              </div>
              {matchingApplied.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); removeTag(tag); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700/60 transition-colors"
                >
                  <span className="w-4 h-4 rounded border border-zinc-300 bg-zinc-200 flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-zinc-900" />
                  </span>
                  <Tag className="w-3 h-3 text-zinc-400 flex-shrink-0" />
                  <span>{tag}</span>
                </button>
              ))}
              {(matchingExisting.length > 0 || isNewTag) && (
                <div className="mx-3 border-t border-zinc-700/60 my-1" />
              )}
            </>
          )}

          {/* Available tags */}
          {matchingExisting.length > 0 && (
            <>
              {matchingApplied.length === 0 && (
                <div className="px-3 pt-2 pb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                    {input ? "Matching" : "All tags"}
                  </span>
                </div>
              )}
              <div className="max-h-44 overflow-y-auto">
                {matchingExisting.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); addTag(tag); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700/60 transition-colors"
                  >
                    <span className="w-4 h-4 rounded border border-zinc-600 flex-shrink-0" />
                    <Tag className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                    <span>{tag}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Create new tag */}
          {isNewTag && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); addTag(input); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-blue-400 hover:bg-zinc-700/60 transition-colors border-t border-zinc-700/60"
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              <span>
                Create tag <span className="font-semibold">"{normalise(input)}"</span>
              </span>
            </button>
          )}

          {/* Empty state */}
          {matchingApplied.length === 0 && matchingExisting.length === 0 && !isNewTag && (
            <p className="px-3 py-3 text-sm text-zinc-500 text-center">
              {allTags.length === 0
                ? "No tags yet — type to create one"
                : "No matching tags"}
            </p>
          )}

          <div className="px-3 py-1.5 border-t border-zinc-700/60">
            <p className="text-[10px] text-zinc-600">
              Enter · Tab · comma to add &nbsp;·&nbsp; Backspace to remove last
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
