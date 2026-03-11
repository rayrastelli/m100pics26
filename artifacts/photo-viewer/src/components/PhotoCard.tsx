import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { getGetPhotoFileUrl, useDeleteGalleryPhoto } from "@/hooks/use-photos";
import type { Photo } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

interface PhotoCardProps {
  photo: Photo;
  index: number;
  onClick: () => void;
}

export function PhotoCard({ photo, index, onClick }: PhotoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { mutate: deletePhoto, isPending: isDeleting } = useDeleteGalleryPhoto();
  const { toast } = useToast();
  
  const imageUrl = getGetPhotoFileUrl(photo.id);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening lightbox
    
    if (confirm("Are you sure you want to delete this photo?")) {
      deletePhoto(
        { id: photo.id },
        {
          onSuccess: () => {
            toast({ description: "Photo deleted successfully" });
          },
          onError: () => {
            toast({ 
              title: "Error", 
              description: "Failed to delete photo", 
              variant: "destructive" 
            });
          }
        }
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        ease: [0.23, 1, 0.32, 1], 
        delay: index * 0.05 
      }}
      className="group relative aspect-square cursor-pointer overflow-hidden bg-secondary rounded-xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <img
        src={imageUrl}
        alt={photo.title}
        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        loading="lazy"
      />
      
      {/* Gradient Overlay */}
      <div 
        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Content */}
      <div 
        className={`absolute inset-0 p-4 flex flex-col justify-between transition-opacity duration-300 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex justify-end">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 bg-black/50 hover:bg-destructive/90 text-white rounded-full backdrop-blur-md transition-colors disabled:opacity-50"
            title="Delete photo"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
        
        <div>
          <h3 className="text-white font-medium truncate text-lg drop-shadow-md">
            {photo.title}
          </h3>
          {photo.description && (
            <p className="text-white/80 text-sm truncate mt-0.5">
              {photo.description}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
