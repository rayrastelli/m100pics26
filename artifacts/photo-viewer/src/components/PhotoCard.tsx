import { useState } from "react";
import { Trash2, Loader2, AtSign } from "lucide-react";
import { Photo } from "@/hooks/usePhotos";
import { RatingPicker } from "@/components/RatingPicker";

interface PhotoCardProps {
  photo: Photo;
  index: number;
  onClick: () => void;
  onDelete: (photo: Photo) => Promise<void>;
  onRate: (photoId: string, rating: number | null) => Promise<void>;
}

export function PhotoCard({ photo, index, onClick, onDelete, onRate }: PhotoCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this photo?")) return;
    setIsDeleting(true);
    await onDelete(photo);
    setIsDeleting(false);
  };

  return (
    <div
      className="group relative aspect-square cursor-pointer overflow-hidden bg-zinc-800 rounded-xl"
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={onClick}
    >
      <img
        src={photo.url}
        alt={photo.title}
        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        loading="lazy"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="absolute inset-0 p-3 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="flex justify-end">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 bg-black/60 hover:bg-red-600 text-white rounded-full backdrop-blur-md transition-colors disabled:opacity-50"
            title="Delete photo"
          >
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        <div className="space-y-1.5">
          <div onClick={(e) => e.stopPropagation()}>
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

      {photo.rating !== null && (
        <div className="absolute bottom-2 right-2 opacity-100 group-hover:opacity-0 transition-opacity">
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
