import { useState, useCallback } from "react";
import {
  Check,
  Star,
  Eye,
  EyeOff,
  MonitorPlay,
  MonitorOff,
  Tag,
  X,
  ChevronDown,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
} from "lucide-react";
import { Photo } from "@/hooks/usePhotos";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TableViewProps {
  photos: Photo[];
  allTags: string[];
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onRate: (photoId: string, rating: number | null) => Promise<{ error: string | null }>;
  onToggleActive: (photoId: string, active: boolean) => Promise<{ error: string | null }>;
  onToggleSlideshow: (photoId: string, slideshow: boolean) => Promise<{ error: string | null }>;
  onUpdateTags: (photoId: string, tags: string[]) => Promise<{ error: string | null }>;
  onOpenPhoto: (index: number) => void;
  currentUserId?: string;
  onDelete?: (photo: Photo) => Promise<void>;
  thumbSizeClass?: string;
}

// ─── Dot rating cell ──────────────────────────────────────────────────────────

function dotColor(rating: number): string {
  if (rating <= 2) return "border-red-400 bg-red-400";
  if (rating <= 4) return "border-amber-400 bg-amber-400";
  if (rating <= 6) return "border-blue-400 bg-blue-400";
  return "border-emerald-400 bg-emerald-400";
}

function RatingCell({ photo, onRate }: { photo: Photo; onRate: TableViewProps["onRate"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const set = async (r: number) => {
    setSaving(true);
    const newRating = photo.rating === r ? null : r;
    await onRate(photo.id, newRating);
    setSaving(false);
  };

  const display = hover ?? photo.rating ?? 0;

  if (saving) return <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />;

  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
        <button
          key={n}
          onMouseEnter={() => setHover(n)}
          onClick={() => set(n)}
          className="p-0.5 rounded transition-colors"
        >
          <div
            className={cn(
              "w-2 h-2 rounded-full border transition-colors",
              n <= display
                ? dotColor(hover ?? photo.rating ?? display)
                : "border-zinc-600 bg-transparent",
              hover !== null && "opacity-80",
            )}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Tag cell (inline editor) ─────────────────────────────────────────────────

function TagCell({
  photo,
  allTags,
  onUpdateTags,
}: {
  photo: Photo;
  allTags: string[];
  onUpdateTags: TableViewProps["onUpdateTags"];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const tags = photo.tags ?? [];

  const toggle = async (tag: string) => {
    setSaving(true);
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    await onUpdateTags(photo.id, next);
    setSaving(false);
  };

  const visible = allTags.filter((t) => t.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative flex items-center gap-1 flex-wrap min-w-[120px]">
      {tags.slice(0, 3).map((t) => (
        <span key={t} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-700 rounded text-xs text-zinc-300">
          {t}
        </span>
      ))}
      {tags.length > 3 && (
        <span className="text-xs text-zinc-500">+{tags.length - 3}</span>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-0.5 rounded hover:bg-zinc-700 transition-colors"
        title="Edit tags"
      >
        {saving ? (
          <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />
        ) : (
          <Tag className="w-3 h-3 text-zinc-500 hover:text-zinc-300 transition-colors" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => { setOpen(false); setSearch(""); }} />
          <div className="absolute left-0 top-full mt-1 z-30 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden min-w-[180px]">
            <div className="p-2 border-b border-zinc-700">
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tags…"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-zinc-500"
              />
            </div>
            <div className="max-h-44 overflow-y-auto">
              {visible.length === 0 && (
                <p className="px-3 py-2 text-xs text-zinc-500 text-center">No tags</p>
              )}
              {visible.map((tag) => {
                const checked = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggle(tag)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
                  >
                    <span className={cn(
                      "w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                      checked ? "bg-zinc-100 border-zinc-100" : "border-zinc-500",
                    )}>
                      {checked && <Check className="w-2 h-2 text-zinc-900" />}
                    </span>
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Toggle cell ──────────────────────────────────────────────────────────────

function ToggleCell({
  value,
  onIcon,
  offIcon,
  onLabel,
  offLabel,
  onToggle,
}: {
  value: boolean;
  onIcon: React.ReactNode;
  offIcon: React.ReactNode;
  onLabel: string;
  offLabel: string;
  onToggle: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const handle = async () => {
    setSaving(true);
    await onToggle();
    setSaving(false);
  };
  return (
    <button
      onClick={handle}
      disabled={saving}
      title={value ? onLabel : offLabel}
      className={cn(
        "p-1.5 rounded-lg transition-colors",
        value
          ? "text-emerald-400 hover:bg-emerald-400/10"
          : "text-zinc-600 hover:bg-zinc-700 hover:text-zinc-400",
        "disabled:opacity-40",
      )}
    >
      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (value ? onIcon : offIcon)}
    </button>
  );
}

// ─── Bulk action bar ──────────────────────────────────────────────────────────

function BulkBar({
  selected,
  photos,
  allTags,
  onClearSelection,
  onBulkRate,
  onBulkActive,
  onBulkSlideshow,
  onBulkTag,
}: {
  selected: Set<string>;
  photos: Photo[];
  allTags: string[];
  onClearSelection: () => void;
  onBulkRate: (r: number | null) => Promise<void>;
  onBulkActive: (v: boolean) => Promise<void>;
  onBulkSlideshow: (v: boolean) => Promise<void>;
  onBulkTag: (tags: string[]) => Promise<void>;
}) {
  const [ratingOpen, setRatingOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // Compute the union of tags across all selected photos
  const selectedPhotos = photos.filter((p) => selected.has(p.id));
  const unionTags = [...new Set(selectedPhotos.flatMap((p) => p.tags ?? []))];

  const toggleBulkTag = async (tag: string) => {
    setSaving(true);
    const allHave = selectedPhotos.every((p) => (p.tags ?? []).includes(tag));
    const next = allHave
      ? selectedPhotos.map((p) => ({ id: p.id, tags: (p.tags ?? []).filter((t) => t !== tag) }))
      : selectedPhotos.map((p) => ({ id: p.id, tags: [...new Set([...(p.tags ?? []), tag])] }));
    await onBulkTag(next.flatMap((p) => p.tags));
    // Actually call per-photo — handled in parent
    setSaving(false);
  };

  const visibleTags = allTags.filter((t) => t.toLowerCase().includes(tagSearch.toLowerCase()));
  const count = selected.size;

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl sticky top-0 z-10 shadow-lg">
      <button onClick={onClearSelection} className="p-1 rounded hover:bg-zinc-700 transition-colors">
        <X className="w-3.5 h-3.5 text-zinc-400" />
      </button>
      <span className="text-sm font-medium text-zinc-200">
        {count} selected
      </span>

      <div className="w-px h-4 bg-zinc-700 mx-1" />

      {/* Bulk rate */}
      <div className="relative">
        <button
          onClick={() => { setRatingOpen((o) => !o); setTagOpen(false); }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs text-zinc-300 transition-colors"
        >
          <Star className="w-3 h-3" />
          Rate
          <ChevronDown className={cn("w-3 h-3 transition-transform", ratingOpen && "rotate-180")} />
        </button>
        {ratingOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setRatingOpen(false)} />
            <div className="absolute left-0 top-full mt-1 z-30 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden min-w-[140px]">
              {[null, 1, 2, 3, 4, 5, 6, 7].map((r) => (
                <button
                  key={String(r)}
                  onClick={async () => {
                    setRatingOpen(false);
                    setSaving(true);
                    await onBulkRate(r);
                    setSaving(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  {r === null ? (
                    <span className="text-zinc-500">Clear rating</span>
                  ) : (
                    <span className="flex items-center gap-1">
                      {Array.from({ length: r }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                      ))}
                      <span className="ml-1 text-zinc-400">{r}</span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bulk tag */}
      <div className="relative">
        <button
          onClick={() => { setTagOpen((o) => !o); setRatingOpen(false); }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs text-zinc-300 transition-colors"
        >
          <Tag className="w-3 h-3" />
          Tag
          <ChevronDown className={cn("w-3 h-3 transition-transform", tagOpen && "rotate-180")} />
        </button>
        {tagOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => { setTagOpen(false); setTagSearch(""); }} />
            <div className="absolute left-0 top-full mt-1 z-30 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden min-w-[200px]">
              <div className="p-2 border-b border-zinc-700">
                <input
                  autoFocus
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  placeholder="Search tags…"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-zinc-500"
                />
              </div>
              <p className="px-3 py-1.5 text-xs text-zinc-500 border-b border-zinc-700">
                Applies / removes tag from all {count} photos
              </p>
              <div className="max-h-44 overflow-y-auto">
                {visibleTags.length === 0 && (
                  <p className="px-3 py-2 text-xs text-zinc-500 text-center">No tags</p>
                )}
                {visibleTags.map((tag) => {
                  const allHave = selectedPhotos.every((p) => (p.tags ?? []).includes(tag));
                  const someHave = selectedPhotos.some((p) => (p.tags ?? []).includes(tag));
                  return (
                    <button
                      key={tag}
                      disabled={saving}
                      onClick={async () => {
                        setSaving(true);
                        const add = !allHave;
                        const updates = selectedPhotos.map((p) => ({
                          id: p.id,
                          tags: add
                            ? [...new Set([...(p.tags ?? []), tag])]
                            : (p.tags ?? []).filter((t) => t !== tag),
                        }));
                        await onBulkTag(updates as unknown as string[]);
                        setSaving(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-40"
                    >
                      <span className={cn(
                        "w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0",
                        allHave ? "bg-zinc-100 border-zinc-100" : someHave ? "bg-zinc-500 border-zinc-500" : "border-zinc-500",
                      )}>
                        {allHave && <Check className="w-2 h-2 text-zinc-900" />}
                        {someHave && !allHave && <span className="w-1.5 h-1.5 rounded-sm bg-zinc-100" />}
                      </span>
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bulk active */}
      <button
        disabled={saving}
        onClick={async () => { setSaving(true); await onBulkActive(true); setSaving(false); }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs text-zinc-300 transition-colors disabled:opacity-40"
      >
        <Eye className="w-3 h-3" /> Activate
      </button>
      <button
        disabled={saving}
        onClick={async () => { setSaving(true); await onBulkActive(false); setSaving(false); }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs text-zinc-300 transition-colors disabled:opacity-40"
      >
        <EyeOff className="w-3 h-3" /> Deactivate
      </button>

      {/* Bulk slideshow */}
      <button
        disabled={saving}
        onClick={async () => { setSaving(true); await onBulkSlideshow(true); setSaving(false); }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs text-zinc-300 transition-colors disabled:opacity-40"
      >
        <MonitorPlay className="w-3 h-3" /> + Slideshow
      </button>
      <button
        disabled={saving}
        onClick={async () => { setSaving(true); await onBulkSlideshow(false); setSaving(false); }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs text-zinc-300 transition-colors disabled:opacity-40"
      >
        <MonitorOff className="w-3 h-3" /> – Slideshow
      </button>

      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400 ml-1" />}
    </div>
  );
}

// ─── Delete cell (inline confirm) ─────────────────────────────────────────────

function DeleteCell({ photo, onDelete }: { photo: Photo; onDelete: (photo: Photo) => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (photo.active) return <span />;

  if (deleting) return <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500 mx-auto" />;

  if (confirming) {
    return (
      <div className="flex items-center justify-center gap-1">
        <button
          onClick={async () => {
            setDeleting(true);
            await onDelete(photo);
          }}
          className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
          title="Confirm delete"
        >
          Delete
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="p-0.5 rounded hover:bg-zinc-700 transition-colors text-zinc-500 hover:text-zinc-300"
          title="Cancel"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="p-1.5 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-400/10 transition-colors mx-auto block"
      title="Delete photo"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}

// ─── Pagination (reusable) ────────────────────────────────────────────────────

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => {
      if (totalPages <= 7) return true;
      if (p === 1 || p === totalPages) return true;
      if (Math.abs(p - currentPage) <= 1) return true;
      return false;
    })
    .reduce<(number | "…")[]>((acc, p, idx, arr) => {
      if (idx > 0 && typeof arr[idx - 1] === "number" && (p as number) - (arr[idx - 1] as number) > 1) {
        acc.push("…");
      }
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button onClick={() => onPageChange(1)} disabled={currentPage === 1}
        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors">
        <ChevronsLeft className="w-4 h-4" />
      </button>
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-1">
        {pages.map((item, idx) =>
          item === "…" ? (
            <span key={`e-${idx}`} className="px-1.5 text-zinc-600 text-sm">…</span>
          ) : (
            <button key={item} onClick={() => onPageChange(item as number)}
              className={cn(
                "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                currentPage === item ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
              )}>
              {item}
            </button>
          )
        )}
      </div>
      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}
        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors">
        <ChevronRight className="w-4 h-4" />
      </button>
      <button onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}
        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors">
        <ChevronsRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Main TableView ───────────────────────────────────────────────────────────

export function TableView({
  photos,
  allTags,
  currentPage,
  totalPages,
  onPageChange,
  onRate,
  onToggleActive,
  onToggleSlideshow,
  onUpdateTags,
  onOpenPhoto,
  currentUserId,
  onDelete,
  thumbSizeClass = "w-12 h-12",
}: TableViewProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSelected = photos.length > 0 && photos.every((p) => selected.has(p.id));
  const someSelected = !allSelected && photos.some((p) => selected.has(p.id));

  const toggleAll = useCallback(() => {
    setSelected(allSelected ? new Set() : new Set(photos.map((p) => p.id)));
  }, [allSelected, photos]);

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  // Bulk operations — fan out to each selected photo
  const bulkRate = useCallback(async (rating: number | null) => {
    await Promise.all([...selected].map((id) => onRate(id, rating)));
  }, [selected, onRate]);

  const bulkActive = useCallback(async (active: boolean) => {
    await Promise.all([...selected].map((id) => onToggleActive(id, active)));
  }, [selected, onToggleActive]);

  const bulkSlideshow = useCallback(async (slideshow: boolean) => {
    await Promise.all([...selected].map((id) => onToggleSlideshow(id, slideshow)));
  }, [selected, onToggleSlideshow]);

  const bulkTag = useCallback(async (updates: unknown) => {
    const arr = updates as Array<{ id: string; tags: string[] }>;
    await Promise.all(arr.map(({ id, tags }) => onUpdateTags(id, tags)));
  }, [onUpdateTags]);

  return (
    <div className="space-y-3">
      {/* Bulk bar */}
      {selected.size > 0 && (
        <BulkBar
          selected={selected}
          photos={photos}
          allTags={allTags}
          onClearSelection={clearSelection}
          onBulkRate={bulkRate}
          onBulkActive={bulkActive}
          onBulkSlideshow={bulkSlideshow}
          onBulkTag={bulkTag as (tags: string[]) => Promise<void>}
        />
      )}

      {/* Table */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60">
                <th className="pl-4 pr-2 py-3 w-10">
                  <button
                    onClick={toggleAll}
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                      allSelected ? "bg-zinc-100 border-zinc-100" : someSelected ? "bg-zinc-600 border-zinc-600" : "border-zinc-600",
                    )}
                  >
                    {allSelected && <Check className="w-2.5 h-2.5 text-zinc-900" />}
                    {someSelected && !allSelected && <span className="w-1.5 h-1.5 rounded-sm bg-zinc-100" />}
                  </button>
                </th>
                <th className="w-14" />
                <th className="px-3 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Title</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide hidden sm:table-cell">By</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide hidden md:table-cell">Date</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Rating</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide hidden lg:table-cell">Tags</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-zinc-500 uppercase tracking-wide w-12">Active</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-zinc-500 uppercase tracking-wide w-12">Show</th>
                {onDelete && currentUserId && <th className="w-12" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {photos.map((photo, photoIndex) => {
                const sel = selected.has(photo.id);
                return (
                  <tr
                    key={photo.id}
                    className={cn(
                      "group transition-colors",
                      sel ? "bg-zinc-800/60" : "hover:bg-zinc-800/30",
                    )}
                  >
                    {/* Checkbox */}
                    <td className="pl-4 pr-2 py-2.5">
                      <button
                        onClick={() => toggleOne(photo.id)}
                        className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0",
                          sel ? "bg-zinc-100 border-zinc-100" : "border-zinc-600 group-hover:border-zinc-400",
                        )}
                      >
                        {sel && <Check className="w-2.5 h-2.5 text-zinc-900" />}
                      </button>
                    </td>

                    {/* Thumbnail — click to open lightbox */}
                    <td className="py-1.5 pr-2">
                      <button
                        onClick={() => onOpenPhoto(photoIndex)}
                        className={cn(thumbSizeClass, "rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0 block hover:ring-2 hover:ring-zinc-400 transition-all")}
                      >
                        {(photo.thumb_url ?? photo.url) ? (
                          <img
                            src={photo.thumb_url ?? photo.url}
                            alt={photo.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-700" />
                        )}
                      </button>
                    </td>

                    {/* Title */}
                    <td className="px-3 py-2.5 max-w-[180px]">
                      <span className="text-zinc-200 font-medium truncate block">{photo.title}</span>
                      {photo.description && (
                        <span className="text-zinc-500 text-xs truncate block">{photo.description}</span>
                      )}
                    </td>

                    {/* Uploader */}
                    <td className="px-3 py-2.5 hidden sm:table-cell">
                      <span className="text-zinc-400 text-xs">{photo.user_tag ?? "—"}</span>
                    </td>

                    {/* Date */}
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      <span className="text-zinc-500 text-xs whitespace-nowrap">
                        {new Date(photo.created_at).toLocaleDateString()}
                      </span>
                    </td>

                    {/* Rating */}
                    <td className="px-3 py-2.5">
                      <RatingCell photo={photo} onRate={onRate} />
                    </td>

                    {/* Tags */}
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      <TagCell photo={photo} allTags={allTags} onUpdateTags={onUpdateTags} />
                    </td>

                    {/* Active toggle */}
                    <td className="px-3 py-2.5 text-center">
                      <ToggleCell
                        value={photo.active}
                        onIcon={<Eye className="w-3.5 h-3.5" />}
                        offIcon={<EyeOff className="w-3.5 h-3.5" />}
                        onLabel="Active — click to deactivate"
                        offLabel="Inactive — click to activate"
                        onToggle={() => onToggleActive(photo.id, !photo.active)}
                      />
                    </td>

                    {/* Slideshow toggle */}
                    <td className="px-3 py-2.5 text-center">
                      <ToggleCell
                        value={photo.slideshow}
                        onIcon={<MonitorPlay className="w-3.5 h-3.5" />}
                        offIcon={<MonitorOff className="w-3.5 h-3.5" />}
                        onLabel="In slideshow — click to remove"
                        offLabel="Not in slideshow — click to add"
                        onToggle={() => onToggleSlideshow(photo.id, !photo.slideshow)}
                      />
                    </td>

                    {/* Delete — only for the photo's owner */}
                    {onDelete && currentUserId && (
                      <td className="pr-3 py-2.5 text-center">
                        {photo.user_id === currentUserId ? (
                          <DeleteCell photo={photo} onDelete={onDelete} />
                        ) : (
                          <span />
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
