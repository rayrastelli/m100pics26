import { useState } from "react";
import { cn } from "@/lib/utils";

interface RatingPickerProps {
  value: number | null;
  onChange?: (rating: number | null) => void;
  readonly?: boolean;
  size?: "sm" | "md";
}

const TOTAL = 7;

export function RatingPicker({ value, onChange, readonly = false, size = "md" }: RatingPickerProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const active = hovered ?? value ?? 0;

  const circleSize = size === "sm"
    ? "w-3 h-3"
    : "w-4 h-4";

  const gap = size === "sm" ? "gap-1" : "gap-1.5";

  const handleClick = (i: number) => {
    if (readonly || !onChange) return;
    // Click same rating → clear it
    onChange(value === i ? null : i);
  };

  return (
    <div
      className={cn("flex items-center", gap)}
      onMouseLeave={() => !readonly && setHovered(null)}
    >
      {Array.from({ length: TOTAL }, (_, idx) => idx + 1).map((i) => (
        <button
          key={i}
          type="button"
          disabled={readonly}
          onClick={(e) => { e.stopPropagation(); handleClick(i); }}
          onMouseEnter={() => !readonly && setHovered(i)}
          className={cn(
            "rounded-full border-2 transition-all duration-100",
            circleSize,
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110",
            i <= active
              ? ratingColor(active)
              : "border-zinc-600/60 bg-transparent"
          )}
          title={readonly ? `Rating: ${value ?? "none"}` : `Rate ${i}`}
        />
      ))}
    </div>
  );
}

function ratingColor(rating: number): string {
  // 1-2: red, 3-4: amber, 5-6: blue, 7: emerald
  if (rating <= 2) return "border-red-500 bg-red-500";
  if (rating <= 4) return "border-amber-400 bg-amber-400";
  if (rating <= 6) return "border-blue-400 bg-blue-400";
  return "border-emerald-400 bg-emerald-400";
}
