import { ImagePlus } from "lucide-react";
import { motion } from "framer-motion";

interface EmptyStateProps {
  onUploadClick: () => void;
}

export function EmptyState({ onUploadClick }: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-32 px-4 text-center"
    >
      <div className="w-24 h-24 bg-secondary/50 rounded-full flex items-center justify-center mb-6 border border-white/5 relative">
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
        <ImagePlus className="w-10 h-10 text-primary relative z-10" />
      </div>
      
      <h2 className="text-2xl font-display font-semibold text-white mb-3">
        Your gallery is empty
      </h2>
      <p className="text-muted-foreground max-w-md mx-auto mb-8 text-base">
        Upload your first photo to start building your collection. 
        High-resolution images will be beautifully presented in the dark grid.
      </p>
      
      <button 
        onClick={onUploadClick}
        className="px-8 py-3.5 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
      >
        Upload First Photo
      </button>
    </motion.div>
  );
}
