import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { X, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagEditorProps {
  tags: string[];
  allTags: string[];
  onChange: (tags: string[]) => void;
  className?: string;
}

export function TagEditor({ tags, allTags, onChange, className }: TagEditorProps) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = allTags.filter(
    (t) => t.toLowerCase().includes(input.toLowerCase()) && !tags.includes(t)
  );

  const add = (tag: string) => {
    const trimmed = tag.trim().toLowerCase().replace(/\s+/g, "-");
    if (!trimmed || tags.includes(trimmed)) return;
    onChange([...tags, trimmed]);
    setInput("");
  };

  const remove = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === "," || e.key === "Tab") && input.trim()) {
      e.preventDefault();
      add(input);
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      remove(tags[tags.length - 1]);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        className="flex flex-wrap gap-1.5 p-2 bg-white/5 border border-white/10 rounded-xl cursor-text min-h-[42px]"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Existing tag chips */}
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 px-2 py-0.5 bg-zinc-700 rounded-md text-xs text-white/80"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(tag); }}
              className="text-white/40 hover:text-white transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {/* Input */}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={tags.length === 0 ? "Add tags…" : ""}
          className="flex-1 min-w-[100px] bg-transparent text-sm text-white/80 placeholder:text-white/30 outline-none"
          list="tag-suggestions"
        />
        <datalist id="tag-suggestions">
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>

      {/* Dropdown suggestions */}
      {focused && input && suggestions.length > 0 && (
        <div className="mt-1 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden max-h-44 overflow-y-auto">
          {suggestions.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={() => add(s)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors text-left"
            >
              <Tag className="w-3 h-3 text-zinc-500 flex-shrink-0" />
              {s}
            </button>
          ))}
          {!allTags.includes(input.trim().toLowerCase()) && input.trim() && (
            <button
              type="button"
              onMouseDown={() => add(input)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-400 hover:bg-zinc-700 transition-colors text-left border-t border-zinc-700"
            >
              <Tag className="w-3 h-3 flex-shrink-0" />
              Create "<span className="font-medium">{input.trim()}</span>"
            </button>
          )}
        </div>
      )}

      <p className="mt-1.5 text-xs text-white/25">
        Press Enter, Tab, or comma to add · Backspace to remove last
      </p>
    </div>
  );
}
