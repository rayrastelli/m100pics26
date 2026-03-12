import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Photo } from "@/hooks/usePhotos";

interface PhotoCardProps {
  photo: Photo;
  index: number;
  onClick: () => void;
  onDelete: (photo: Photo) => Promise<void>;
}

export function PhotoCard({ photo, index, onClick, onDelete }: PhotoCardProps) {
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
        <h3 className="text-white text-sm font-medium truncate drop-shadow-md">
          {photo.title}
        </h3>
      </div>
    </div>
  );
}
