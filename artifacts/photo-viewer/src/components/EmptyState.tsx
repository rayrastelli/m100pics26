import { ImagePlus } from "lucide-react";

interface EmptyStateProps {
  onUploadClick: () => void;
}

export function EmptyState({ onUploadClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
      <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mb-6 border border-zinc-700">
        <ImagePlus className="w-9 h-9 text-zinc-500" />
      </div>
      <h2 className="text-xl font-semibold text-zinc-200 mb-2">Your gallery is empty</h2>
      <p className="text-zinc-500 max-w-xs mx-auto mb-8 text-sm leading-relaxed">
        Upload your first photo to start building your collection.
      </p>
      <button
        onClick={onUploadClick}
        className="px-6 py-2.5 bg-zinc-100 text-zinc-900 rounded-full text-sm font-medium hover:bg-white transition-colors shadow-lg"
      >
        Upload First Photo
      </button>
    </div>
  );
}
