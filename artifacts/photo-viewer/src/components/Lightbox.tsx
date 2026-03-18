import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight, HardDrive, Maximize, FileImage, MonitorPlay } from "lucide-react";
import { Photo } from "@/hooks/usePhotos";
import { RatingPicker } from "@/components/RatingPicker";
import { TagEditor } from "@/components/TagEditor";
import { formatBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface LightboxProps {
  photos: Photo[];
  index: number;
  allTags: string[];
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onRate: (photoId: string, rating: number | null) => Promise<unknown>;
  onToggleSlideshow: (photoId: string, slideshow: boolean) => Promise<unknown>;
  onUpdateTags: (photoId: string, tags: string[]) => Promise<unknown>;
}

export function Lightbox({
  photos, index, allTags, onClose, onPrev, onNext, onRate, onToggleSlideshow, onUpdateTags,
}: LightboxProps) {
  const photo = photos[index];

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onPrev, onNext]);

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/96 backdrop-blur-xl"
      onClick={onClose}
    >
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/70 to-transparent">
        <span className="text-white/50 text-sm">{index + 1} / {photos.length}</span>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 z-10 p-3 rounded-full bg-black/40 text-white/70 hover:bg-black/70 hover:text-white transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {index < photos.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 z-10 p-3 rounded-full bg-black/40 text-white/70 hover:bg-black/70 hover:text-white transition-all"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      <div
        className="flex flex-col items-center w-full max-w-2xl mx-16 max-h-screen py-16 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          key={photo.id}
          src={photo.url}
          alt={photo.title}
          className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-2xl"
        />
        <div className="mt-5 w-full space-y-4 px-2">
          <h2 className="text-white font-semibold text-lg text-center">{photo.title}</h2>

          {/* Rating */}
          <div className="flex items-center justify-center gap-3">
            <RatingPicker
              value={photo.rating}
              onChange={(r) => onRate(photo.id, r)}
              size="md"
            />
            {photo.rating !== null && (
              <span className="text-xs text-white/40">{photo.rating}/7</span>
            )}
          </div>

          {/* Slideshow toggle */}
          <div className="flex justify-center">
            <button
              onClick={() => onToggleSlideshow(photo.id, !photo.slideshow)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                photo.slideshow
                  ? "bg-blue-500/80 text-white hover:bg-blue-600"
                  : "bg-white/10 text-white/50 hover:bg-white/20 hover:text-white"
              )}
            >
              <MonitorPlay className="w-4 h-4" />
              {photo.slideshow ? "In slideshow" : "Add to slideshow"}
            </button>
          </div>

          {/* Tags */}
          <div>
            <p className="text-xs text-white/40 mb-1.5 text-center">Tags</p>
            <TagEditor
              tags={photo.tags ?? []}
              allTags={allTags}
              onChange={(tags) => onUpdateTags(photo.id, tags)}
            />
          </div>

          {/* Metadata */}
          {photo.description && (
            <p className="text-white/60 text-sm text-center">{photo.description}</p>
          )}
          <div className="flex items-center justify-center gap-4 text-xs text-white/40 flex-wrap">
            {photo.user_tag && (
              <span className="text-white/50 font-medium">@{photo.user_tag}</span>
            )}
            <span className="flex items-center gap-1.5"><HardDrive className="w-3 h-3" />{formatBytes(photo.size)}</span>
            {photo.width && photo.height && (
              <span className="flex items-center gap-1.5"><Maximize className="w-3 h-3" />{photo.width} × {photo.height}</span>
            )}
            <span className="flex items-center gap-1.5"><FileImage className="w-3 h-3" />{photo.mime_type.split("/")[1]?.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
