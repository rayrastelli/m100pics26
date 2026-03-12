import { useState, useEffect } from "react";
import { Upload, LogOut, Images, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePhotos } from "@/hooks/usePhotos";
import { PhotoCard } from "@/components/PhotoCard";
import { Lightbox } from "@/components/Lightbox";
import { UploadDialog } from "@/components/UploadDialog";
import { EmptyState } from "@/components/EmptyState";

interface GalleryPageProps {
  onAdminClick: () => void;
}

export default function GalleryPage({ onAdminClick }: GalleryPageProps) {
  const { user, isAdmin, signOut } = useAuth();
  const { photos, loading, error, fetchPhotos, uploadPhoto, deletePhoto } = usePhotos();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleDelete = async (photo: import("@/hooks/usePhotos").Photo) => {
    const { error } = await deletePhoto(photo);
    if (error) alert(`Delete failed: ${error}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-zinc-800 rounded-lg flex items-center justify-center">
              <Images className="w-4 h-4 text-zinc-300" />
            </div>
            <span className="font-semibold text-zinc-100 tracking-tight">Folio</span>
            {photos.length > 0 && (
              <span className="text-xs text-zinc-400 ml-1">{photos.length} photo{photos.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 hidden sm:block truncate max-w-[160px]">{user?.email}</span>
            {isAdmin && (
              <button
                onClick={onAdminClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/20 transition-colors"
                title="Admin panel"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Admin
              </button>
            )}
            <button
              onClick={() => setUploadOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium hover:bg-white transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload
            </button>
            <button
              onClick={signOut}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
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
              />
            ))}
          </div>
        )}
      </main>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((i) => Math.max(0, (i ?? 0) - 1))}
          onNext={() => setLightboxIndex((i) => Math.min(photos.length - 1, (i ?? 0) + 1))}
        />
      )}

      <UploadDialog
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUpload={uploadPhoto}
      />
    </div>
  );
}
