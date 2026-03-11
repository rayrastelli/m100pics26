import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Info, Calendar, HardDrive, Maximize, FileImage } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getGetPhotoFileUrl } from "@/hooks/use-photos";
import type { Photo } from "@workspace/api-client-react";
import { formatBytes } from "@/lib/utils";
import { format } from "date-fns";

interface LightboxProps {
  photos: Photo[];
  initialIndex: number;
  onClose: () => void;
}

export function Lightbox({ photos, initialIndex, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showInfo, setShowInfo] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const currentPhoto = photos[currentIndex];
  const hasNext = currentIndex < photos.length - 1;
  const hasPrev = currentIndex > 0;

  useEffect(() => {
    setIsLoaded(false);
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && hasNext) setCurrentIndex((prev) => prev + 1);
      if (e.key === "ArrowLeft" && hasPrev) setCurrentIndex((prev) => prev - 1);
      if (e.key === "i") setShowInfo((prev) => !prev);
    };

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden"; // Prevent scrolling
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [hasNext, hasPrev, onClose]);

  if (!currentPhoto) return null;

  const imageUrl = getGetPhotoFileUrl(currentPhoto.id);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl"
      >
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/80 to-transparent">
          <div className="text-white/70 text-sm font-medium px-4">
            {currentIndex + 1} / {photos.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInfo(!showInfo)}
              className={`p-3 rounded-full transition-colors ${showInfo ? 'bg-white/20 text-white' : 'bg-black/50 text-white/70 hover:text-white hover:bg-white/10'}`}
              title="Toggle Info (i)"
            >
              <Info className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-3 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        {hasPrev && (
          <button
            onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => prev - 1); }}
            className="absolute left-4 z-50 p-4 rounded-full bg-black/20 text-white/50 hover:bg-black/60 hover:text-white transition-all transform hover:-translate-x-1"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
        )}
        
        {hasNext && (
          <button
            onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => prev + 1); }}
            className="absolute right-4 z-50 p-4 rounded-full bg-black/20 text-white/50 hover:bg-black/60 hover:text-white transition-all transform hover:translate-x-1"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        )}

        {/* Main Image */}
        <div className="relative w-full h-full flex items-center justify-center p-12" onClick={onClose}>
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}
          <motion.img
            key={currentPhoto.id}
            src={imageUrl}
            alt={currentPhoto.title}
            className={`max-w-full max-h-full object-contain drop-shadow-2xl transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setIsLoaded(true)}
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          />
        </div>

        {/* Info Panel */}
        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 glass-panel rounded-2xl p-6 w-full max-w-lg z-50 shadow-2xl"
            >
              <h3 className="text-xl font-display font-semibold text-white mb-2">{currentPhoto.title}</h3>
              {currentPhoto.description && (
                <p className="text-white/70 text-sm mb-4 leading-relaxed">{currentPhoto.description}</p>
              )}
              
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-3 text-white/60 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(currentPhoto.createdAt), "MMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-3 text-white/60 text-sm">
                  <HardDrive className="w-4 h-4" />
                  <span>{formatBytes(currentPhoto.size)}</span>
                </div>
                {currentPhoto.width && currentPhoto.height && (
                  <div className="flex items-center gap-3 text-white/60 text-sm">
                    <Maximize className="w-4 h-4" />
                    <span>{currentPhoto.width} × {currentPhoto.height}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-white/60 text-sm">
                  <FileImage className="w-4 h-4" />
                  <span className="uppercase">{currentPhoto.mimeType.split('/')[1] || 'IMAGE'}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
