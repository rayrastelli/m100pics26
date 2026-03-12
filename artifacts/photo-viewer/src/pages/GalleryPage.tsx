import { useState, useEffect, useMemo } from "react";
import { Upload, ChevronDown, Check } from "lucide-react";
import { usePhotos, Photo } from "@/hooks/usePhotos";
import { PhotoCard } from "@/components/PhotoCard";
import { Lightbox } from "@/components/Lightbox";
import { UploadDialog } from "@/components/UploadDialog";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

// ─── Sort ────────────────────────────────────────────────────────────────────

type SortKey = "newest" | "oldest" | "best" | "worst" | "title-az" | "title-za";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest",   label: "Newest first"  },
  { key: "oldest",   label: "Oldest first"  },
  { key: "best",     label: "Best rated"    },
  { key: "worst",    label: "Worst rated"   },
  { key: "title-az", label: "Title A – Z"   },
  { key: "title-za", label: "Title Z – A"   },
];

function sortPhotos(photos: Photo[], key: SortKey): Photo[] {
  return [...photos].sort((a, b) => {
    switch (key) {
      case "newest":   return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "oldest":   return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "best":     return (b.rating ?? -1) - (a.rating ?? -1);
      case "worst":    return (a.rating ?? 99) - (b.rating ?? 99);
      case "title-az": return a.title.localeCompare(b.title);
      case "title-za": return b.title.localeCompare(a.title);
      default:         return 0;
    }
  });
}

// ─── Filter ───────────────────────────────────────────────────────────────────

type RatingFilter = "all" | "unrated" | 1 | 2 | 3 | 4 | 5 | 6 | 7;

const RATING_FILTERS: { key: RatingFilter; label: string; dot?: string }[] = [
  { key: "all",     label: "All"      },
  { key: "unrated", label: "Unrated"  },
  { key: 1,         label: "1+", dot: "bg-red-400"     },
  { key: 2,         label: "2+", dot: "bg-red-400"     },
  { key: 3,         label: "3+", dot: "bg-amber-400"   },
  { key: 4,         label: "4+", dot: "bg-amber-400"   },
  { key: 5,         label: "5+", dot: "bg-blue-400"    },
  { key: 6,         label: "6+", dot: "bg-blue-400"    },
  { key: 7,         label: "7",  dot: "bg-emerald-400" },
];

function filterPhotos(photos: Photo[], filter: RatingFilter): Photo[] {
  if (filter === "all")     return photos;
  if (filter === "unrated") return photos.filter((p) => p.rating === null);
  return photos.filter((p) => p.rating !== null && p.rating >= (filter as number));
}

// ─── Sort dropdown ────────────────────────────────────────────────────────────

function SortDropdown({ value, onChange }: { value: SortKey; onChange: (k: SortKey) => void }) {
  const [open, setOpen] = useState(false);
  const label = SORT_OPTIONS.find((o) => o.key === value)?.label ?? "Sort";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
      >
        {label}
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-20 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden min-w-[150px]">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => { onChange(opt.key); setOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                {opt.label}
                {opt.key === value && <Check className="w-3.5 h-3.5 text-zinc-400" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GalleryPage() {
  const { photos, loading, error, fetchPhotos, uploadPhoto, deletePhoto, ratePhoto } = usePhotos();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sort, setSort] = useState<SortKey>("newest");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const displayedPhotos = useMemo(
    () => sortPhotos(filterPhotos(photos, ratingFilter), sort),
    [photos, sort, ratingFilter]
  );

  const handleDelete = async (photo: Photo) => {
    const { error } = await deletePhoto(photo);
    if (error) alert(`Delete failed: ${error}`);
  };

  const handleRate = async (photoId: string, rating: number | null) => {
    await ratePhoto(photoId, rating);
  };

  const filtered = displayedPhotos.length !== photos.length;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">

        {/* Rating filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          {RATING_FILTERS.map((f) => (
            <button
              key={String(f.key)}
              onClick={() => setRatingFilter(f.key)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border",
                ratingFilter === f.key
                  ? "bg-zinc-100 text-zinc-900 border-zinc-100"
                  : "bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200"
              )}
            >
              {f.dot && (
                <span className={cn("w-2 h-2 rounded-full flex-shrink-0", f.dot)} />
              )}
              {f.label}
            </button>
          ))}
        </div>

        {/* Right side: count + sort + upload */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 whitespace-nowrap">
            {filtered
              ? `${displayedPhotos.length} of ${photos.length}`
              : photos.length > 0
                ? `${photos.length} photo${photos.length !== 1 ? "s" : ""}`
                : ""}
          </span>
          <SortDropdown value={sort} onChange={setSort} />
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium hover:bg-white transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex justify-center py-32">
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 mb-6">
          {error}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && photos.length === 0 && (
        <EmptyState onUploadClick={() => setUploadOpen(true)} />
      )}

      {/* ── No results after filter ── */}
      {!loading && photos.length > 0 && displayedPhotos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-zinc-500 text-sm">No photos match this filter.</p>
          <button
            onClick={() => setRatingFilter("all")}
            className="mt-3 text-xs text-zinc-400 underline hover:text-zinc-200 transition-colors"
          >
            Show all photos
          </button>
        </div>
      )}

      {/* ── Grid ── */}
      {!loading && displayedPhotos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
          {displayedPhotos.map((photo, i) => (
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

      {/* ── Lightbox ── */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={displayedPhotos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((i) => Math.max(0, (i ?? 0) - 1))}
          onNext={() => setLightboxIndex((i) => Math.min(displayedPhotos.length - 1, (i ?? 0) + 1))}
          onRate={handleRate}
        />
      )}

      {/* ── Upload dialog ── */}
      <UploadDialog
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUpload={uploadPhoto}
      />
    </main>
  );
}
