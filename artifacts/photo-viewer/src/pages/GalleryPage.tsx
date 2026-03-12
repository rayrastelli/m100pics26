import { useState, useEffect } from "react";
import { Upload } from "lucide-react";
import { usePhotos } from "@/hooks/usePhotos";
import { PhotoCard } from "@/components/PhotoCard";
import { Lightbox } from "@/components/Lightbox";
import { UploadDialog } from "@/components/UploadDialog";
import { EmptyState } from "@/components/EmptyState";

export default function GalleryPage() {
  const { photos, loading, error, fetchPhotos, uploadPhoto, deletePhoto, ratePhoto } = usePhotos();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleDelete = async (photo: import("@/hooks/usePhotos").Photo) => {
    const { error } = await deletePhoto(photo);
    if (error) alert(`Delete failed: ${error}`);
  };

  const handleRate = async (photoId: string, rating: number | null) => {
    await ratePhoto(photoId, rating);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-zinc-500">
          {photos.length > 0
            ? `${photos.length} photo${photos.length !== 1 ? "s" : ""}`
            : ""}
        </p>
        <button
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium hover:bg-white transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          Upload
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-32">
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 mb-6">
          {error}
        </div>
      )}

      {!loading && photos.length === 0 && (
        <EmptyState onUploadClick={() => setUploadOpen(true)} />
      )}

      {!loading && photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
          {photos.map((photo, i) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              index={i}
              onClick={() => setLightboxIndex(i)}
              onDelete={handleDelete}
              onRate={handleRate}
            />
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((i) => Math.max(0, (i ?? 0) - 1))}
          onNext={() => setLightboxIndex((i) => Math.min(photos.length - 1, (i ?? 0) + 1))}
          onRate={handleRate}
        />
      )}

      <UploadDialog
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUpload={uploadPhoto}
      />
    </main>
  );
}
