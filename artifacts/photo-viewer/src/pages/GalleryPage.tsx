import { useState, useEffect, useMemo } from "react";
import { Upload, ChevronDown, Check, MonitorPlay, Eye, AtSign, X } from "lucide-react";
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

// ─── Filters ──────────────────────────────────────────────────────────────────

type RatingFilter  = "all" | "unrated" | 1 | 2 | 3 | 4 | 5 | 6 | 7;
type StatusFilter  = "all" | "active" | "inactive";
type SlideshowFilter = "all" | "slideshow";

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

function applyFilters(
  photos: Photo[],
  rating: RatingFilter,
  status: StatusFilter,
  slideshow: SlideshowFilter,
  tags: string[]
): Photo[] {
  return photos.filter((p) => {
    if (rating === "unrated" && p.rating !== null) return false;
    if (typeof rating === "number" && (p.rating === null || p.rating < rating)) return false;
    if (status === "active"   && !p.active) return false;
    if (status === "inactive" &&  p.active) return false;
    if (slideshow === "slideshow" && !p.slideshow) return false;
    if (tags.length > 0 && !tags.includes(p.user_tag ?? "")) return false;
    return true;
  });
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

// ─── Tag dropdown ─────────────────────────────────────────────────────────────

function TagDropdown({
  tags, selected, onChange,
}: {
  tags: string[];
  selected: string[];
  onChange: (t: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  if (tags.length === 0) return null;

  const toggle = (tag: string) => {
    onChange(
      selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag]
    );
  };

  const label =
    selected.length === 0
      ? "Tag"
      : selected.length === 1
      ? selected[0]
      : `${selected.length} tags`;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm transition-colors",
          selected.length > 0
            ? "bg-zinc-100 text-zinc-900 border-zinc-100 font-medium"
            : "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300"
        )}
      >
        <AtSign className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="max-w-[100px] truncate">{label}</span>
        {selected.length > 0 ? (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); onChange([]); }}
            className="ml-0.5 hover:text-red-400 transition-colors flex-shrink-0"
          >
            <X className="w-3 h-3" />
          </span>
        ) : (
          <ChevronDown className={cn("w-3.5 h-3.5 flex-shrink-0 transition-transform", open && "rotate-180")} />
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 z-20 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden min-w-[180px] max-h-72 overflow-y-auto">
            {/* Select all / clear */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700">
              <span className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Tags</span>
              {selected.length > 0 && (
                <button
                  onClick={() => onChange([])}
                  className="text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            {tags.map((tag) => {
              const checked = selected.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggle(tag)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  {/* Checkbox */}
                  <span className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                    checked ? "bg-zinc-100 border-zinc-100" : "border-zinc-500 bg-transparent"
                  )}>
                    {checked && <Check className="w-2.5 h-2.5 text-zinc-900" />}
                  </span>
                  <span className="flex items-center gap-1.5 min-w-0">
                    <AtSign className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                    <span className="truncate">{tag}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Filter pill ──────────────────────────────────────────────────────────────

function Pill({
  active, onClick, children, icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border",
        active
          ? "bg-zinc-100 text-zinc-900 border-zinc-100"
          : "bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GalleryPage() {
  const { photos, loading, error, fetchPhotos, uploadPhoto, deletePhoto, ratePhoto, toggleSlideshow, toggleActive } = usePhotos();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sort, setSort] = useState<SortKey>("newest");
  const [ratingFilter, setRatingFilter]       = useState<RatingFilter>("all");
  const [statusFilter, setStatusFilter]       = useState<StatusFilter>("active");
  const [slideshowFilter, setSlideshowFilter] = useState<SlideshowFilter>("all");
  const [tagFilter, setTagFilter]             = useState<string[]>([]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    photos.forEach((p) => { if (p.user_tag) set.add(p.user_tag); });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [photos]);

  const displayedPhotos = useMemo(
    () => sortPhotos(applyFilters(photos, ratingFilter, statusFilter, slideshowFilter, tagFilter), sort),
    [photos, sort, ratingFilter, statusFilter, slideshowFilter, tagFilter]
  );

  const handleDelete = async (photo: Photo) => {
    const { error } = await deletePhoto(photo);
    if (error) alert(`Delete failed: ${error}`);
  };

  const anyFilterActive =
    ratingFilter !== "all" || statusFilter !== "all" || slideshowFilter !== "all" || tagFilter.length > 0;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

      {/* ── Filter bar ── */}
      <div className="space-y-2 mb-8">

        {/* Row 1: status + slideshow filters + count + sort + upload */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Status filter */}
            <Pill active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>All</Pill>
            <Pill
              active={statusFilter === "active"}
              onClick={() => setStatusFilter(statusFilter === "active" ? "all" : "active")}
              icon={<Eye className="w-3 h-3" />}
            >Active</Pill>

            {/* Divider */}
            <span className="w-px h-4 bg-zinc-700 mx-0.5" />

            {/* Slideshow filter */}
            <Pill
              active={slideshowFilter === "slideshow"}
              onClick={() => setSlideshowFilter(slideshowFilter === "slideshow" ? "all" : "slideshow")}
              icon={<MonitorPlay className="w-3 h-3" />}
            >Slideshow</Pill>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-zinc-500 whitespace-nowrap">
              {anyFilterActive || displayedPhotos.length !== photos.length
                ? `${displayedPhotos.length} of ${photos.length}`
                : photos.length > 0
                  ? `${photos.length} photo${photos.length !== 1 ? "s" : ""}`
                  : ""}
            </span>
            <TagDropdown tags={allTags} selected={tagFilter} onChange={setTagFilter} />
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

        {/* Row 2: rating filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {RATING_FILTERS.map((f) => (
            <Pill
              key={String(f.key)}
              active={ratingFilter === f.key}
              onClick={() => setRatingFilter(f.key)}
              icon={f.dot ? <span className={cn("w-2 h-2 rounded-full flex-shrink-0", f.dot)} /> : undefined}
            >
              {f.label}
            </Pill>
          ))}
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
          <p className="text-zinc-500 text-sm">No photos match these filters.</p>
          <button
            onClick={() => { setRatingFilter("all"); setStatusFilter("active"); setSlideshowFilter("all"); setTagFilter([]); }}
            className="mt-3 text-xs text-zinc-400 underline hover:text-zinc-200 transition-colors"
          >
            Clear all filters
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
              onRate={ratePhoto}
              onToggleSlideshow={toggleSlideshow}
              onToggleActive={toggleActive}
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
          onRate={ratePhoto}
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
