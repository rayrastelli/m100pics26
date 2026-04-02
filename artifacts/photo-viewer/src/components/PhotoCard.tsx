import { AtSign, MonitorPlay, Eye, EyeOff } from "lucide-react";
import { Photo } from "@/hooks/usePhotos";
import { RatingPicker } from "@/components/RatingPicker";
import { cn } from "@/lib/utils";

interface PhotoCardProps {
  photo: Photo;
  index: number;
  onClick: () => void;
  onRate: (photoId: string, rating: number | null) => Promise<unknown>;
  onToggleSlideshow: (photoId: string, slideshow: boolean) => Promise<unknown>;
  onToggleActive: (photoId: string, active: boolean) => Promise<unknown>;
  onHoverStart?: (photoId: string) => void;
  onHoverEnd?: () => void;
}

export function PhotoCard({
  photo, index, onClick, onRate, onToggleSlideshow, onToggleActive, onHoverStart, onHoverEnd,
}: PhotoCardProps) {
  const stopProp = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      className={cn(
        "group relative aspect-square cursor-pointer overflow-hidden bg-zinc-800 rounded-xl transition-opacity",
        !photo.active && "opacity-50"
      )}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={onClick}
      onMouseEnter={() => onHoverStart?.(photo.id)}
      onMouseLeave={() => onHoverEnd?.()}
    >
      <img
        src={photo.thumb_url ?? photo.url}
        alt={photo.title}
        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        loading="lazy"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Hover controls */}
      <div className="absolute inset-0 p-3 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">

        {/* Top row: status toggles */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1" onClick={stopProp}>
            {/* Slideshow toggle */}
            <button
              onClick={() => onToggleSlideshow(photo.id, !photo.slideshow)}
              title={photo.slideshow ? "Remove from slideshow" : "Add to slideshow"}
              className={cn(
                "p-1.5 rounded-full backdrop-blur-md transition-colors",
                photo.slideshow
                  ? "bg-blue-500/80 text-white hover:bg-blue-600"
                  : "bg-black/60 text-white/50 hover:bg-black/80 hover:text-white"
              )}
            >
              <MonitorPlay className="w-3.5 h-3.5" />
            </button>

            {/* Active toggle */}
            <button
              onClick={() => onToggleActive(photo.id, !photo.active)}
              title={photo.active ? "Mark as inactive" : "Mark as active"}
              className={cn(
                "p-1.5 rounded-full backdrop-blur-md transition-colors",
                photo.active
                  ? "bg-emerald-500/80 text-white hover:bg-emerald-600"
                  : "bg-black/60 text-red-400 hover:bg-black/80 hover:text-red-300"
              )}
            >
              {photo.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Bottom row: rating + title + user tag */}
        <div className="space-y-1.5">
          <div onClick={stopProp}>
            <RatingPicker
              value={photo.rating}
              onChange={(r) => onRate(photo.id, r)}
              size="sm"
            />
          </div>
          <h3 className="text-white text-sm font-medium truncate drop-shadow-md">
            {photo.title}
          </h3>
          {photo.user_tag && (
            <div className="flex items-center gap-1">
              <AtSign className="w-3 h-3 text-white/50 flex-shrink-0" />
              <span className="text-white/60 text-xs truncate">{photo.user_tag}</span>
            </div>
          )}
        </div>
      </div>

      {/* Always-visible badges (hidden on hover) */}
      <div className="absolute top-2 left-2 flex gap-1 group-hover:opacity-0 transition-opacity pointer-events-none">
        {photo.slideshow && (
          <div className="p-1 bg-blue-500/70 rounded-full backdrop-blur-sm">
            <MonitorPlay className="w-3 h-3 text-white" />
          </div>
        )}
        {!photo.active && (
          <div className="p-1 bg-black/60 rounded-full backdrop-blur-sm">
            <EyeOff className="w-3 h-3 text-red-400" />
          </div>
        )}
      </div>

      {/* Rating dots (non-hover) */}
      {photo.rating !== null && (
        <div className="absolute bottom-2 right-2 opacity-100 group-hover:opacity-0 transition-opacity pointer-events-none">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 7 }, (_, i) => i + 1).map((i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full border ${
                  i <= (photo.rating ?? 0)
                    ? ratingDotColor(photo.rating ?? 0)
                    : "border-white/20 bg-transparent"
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ratingDotColor(rating: number): string {
  if (rating <= 2) return "border-red-400 bg-red-400";
  if (rating <= 4) return "border-amber-400 bg-amber-400";
  if (rating <= 6) return "border-blue-400 bg-blue-400";
  return "border-emerald-400 bg-emerald-400";
}
