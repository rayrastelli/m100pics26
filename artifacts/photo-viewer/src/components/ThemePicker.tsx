import { useState } from "react";
import { Palette, Check } from "lucide-react";
import { THEMES, useTheme, type ThemeMeta } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Change theme"
        className="flex items-center gap-1.5 p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
      >
        <Palette className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl p-3 min-w-[200px]">
            <p className="text-xs font-medium text-zinc-500 px-1 pb-2">Theme</p>
            <div className="space-y-0.5">
              {THEMES.map((t) => (
                <ThemeRow
                  key={t.id}
                  theme={t}
                  active={t.id === theme}
                  onSelect={() => { setTheme(t.id); setOpen(false); }}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ThemeRow({ theme, active, onSelect }: { theme: ThemeMeta; active: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors",
        active
          ? "bg-zinc-800 text-zinc-100"
          : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
      )}
    >
      {/* Swatch */}
      <span className="flex gap-0.5 flex-shrink-0">
        <span
          className="w-3.5 h-3.5 rounded-full border border-white/10"
          style={{ background: theme.swatch }}
        />
        {theme.swatchAlt && (
          <span
            className="w-3.5 h-3.5 rounded-full border border-white/10 -ml-1.5"
            style={{ background: theme.swatchAlt }}
          />
        )}
      </span>
      <span className="flex-1 text-left">{theme.label}</span>
      {active && <Check className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />}
    </button>
  );
}
