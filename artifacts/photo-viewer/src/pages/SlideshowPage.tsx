import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play, Pause, ChevronLeft, ChevronRight, Maximize, Minimize,
  Settings2, GripVertical, Save, X, Loader2, MonitorPlay,
  ChevronUp, ChevronDown, FolderOpen, Trash2, Plus,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { gcsPublicUrl, isGcsPath } from "@/lib/gcs";
import { useSlideshowConfig, Slideshow } from "@/hooks/useSlideshowConfig";

interface SlideshowPhoto {
  id: string;
  title: string;
  storage_path: string;
  thumb_path: string | null;
  med_path: string | null;
  url: string;
  thumb_url: string;
  med_url: string;
}

function suggestShowName(shows: Slideshow[]): string {
  let max = 0;
  for (const s of shows) {
    const m = s.name.match(/^slideshow_(\d+)$/i);
    if (m) { const n = parseInt(m[1], 10); if (n > max) max = n; }
  }
  return `slideshow_${max + 1}`;
}

function resolveUrl(path: string): string {
  if (isGcsPath(path)) return gcsPublicUrl(path);
  const { data } = supabase.storage.from("band-pics").getPublicUrl(path);
  return data.publicUrl;
}

function buildOrderedPhotos(ids: string[], map: Map<string, SlideshowPhoto>): SlideshowPhoto[] {
  const ordered: SlideshowPhoto[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const p = map.get(id);
    if (p) { ordered.push(p); seen.add(id); }
  }
  // Append any slideshow photos not in the saved order
  for (const p of map.values()) {
    if (!seen.has(p.id)) ordered.push(p);
  }
  return ordered;
}

type EditTab = "shows" | "order";

export default function SlideshowPage() {
  const {
    shows, currentShowId, loading: configLoading, saving,
    loadShows, createShow, deleteShow, selectShow,
  } = useSlideshowConfig();

  const photoMapRef = useRef<Map<string, SlideshowPhoto>>(new Map());

  const [photos, setPhotos] = useState<SlideshowPhoto[]>([]);
  const [currentShowName, setCurrentShowName] = useState<string>("");
  const [loadingPhotos, setLoadingPhotos] = useState(true);

  const [current, setCurrent] = useState(0);
  const [shownIndex, setShownIndex] = useState(0);
  const [imgOpacity, setImgOpacity] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [intervalSecs, setIntervalSecs] = useState(3);
  const [fadeDuration, setFadeDuration] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [editTab, setEditTab] = useState<EditTab>("shows");
  const [editOrder, setEditOrder] = useState<SlideshowPhoto[]>([]);
  const [newShowName, setNewShowName] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [isOverRemove, setIsOverRemove] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  // ── Crossfade when current changes ───────────────────────────────────────

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setShownIndex(current);
      return;
    }
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    if (fadeDuration === 0) {
      setShownIndex(current);
      setImgOpacity(1);
      return;
    }
    const halfMs = fadeDuration * 500;
    setImgOpacity(0);
    fadeTimerRef.current = setTimeout(() => {
      setShownIndex(current);
      requestAnimationFrame(() => requestAnimationFrame(() => setImgOpacity(1)));
    }, halfMs);
    return () => { if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current); };
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Apply a show's ordering to the photo list ─────────────────────────────

  const applyShow = useCallback((show: Slideshow | null | undefined) => {
    const ids = show?.photo_ids ?? [];
    const ordered = buildOrderedPhotos(ids, photoMapRef.current);
    setPhotos(ordered);
    setEditOrder(ordered);
    setCurrentShowName(show?.name ?? "");
    setCurrent(0);
  }, []);

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      setLoadingPhotos(true);
      const [allShows, photosResult] = await Promise.all([
        loadShows(),
        supabase.from("photos").select("*").eq("slideshow", true),
      ]);

      const map = new Map<string, SlideshowPhoto>();
      for (const p of (photosResult.data ?? []) as any[]) {
        map.set(p.id, {
          id: p.id,
          title: p.title,
          storage_path: p.storage_path,
          thumb_path: p.thumb_path ?? null,
          med_path: p.med_path ?? null,
          url: resolveUrl(p.storage_path),
          thumb_url: p.thumb_path ? gcsPublicUrl(p.thumb_path) : resolveUrl(p.storage_path),
          med_url: p.med_path ? gcsPublicUrl(p.med_path) : resolveUrl(p.storage_path),
        });
      }
      photoMapRef.current = map;

      // Find the previously selected show (or default to first)
      const savedId = localStorage.getItem("bandpics-current-show");
      const active = allShows.find((s) => s.id === savedId) ?? allShows[0] ?? null;
      applyShow(active);
      setLoadingPhotos(false);
    }
    init();
  }, [loadShows, applyShow]);

  // ── Auto-advance timer ────────────────────────────────────────────────────

  const advance = useCallback(() => {
    setCurrent((c) => (c + 1) % Math.max(photos.length, 1));
  }, [photos.length]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (playing && autoAdvance && photos.length > 1) {
      timerRef.current = setTimeout(advance, intervalSecs * 1000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, autoAdvance, intervalSecs, current, advance, photos.length]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editMode) return;
      if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
      if (e.key === "ArrowRight") setCurrent((c) => (c + 1) % Math.max(photos.length, 1));
      if (e.key === "ArrowLeft") setCurrent((c) => (c - 1 + photos.length) % Math.max(photos.length, 1));
      if (e.key === "Escape" && isFullscreen) exitFullscreen();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editMode, photos.length, isFullscreen]);

  // ── Fullscreen ────────────────────────────────────────────────────────────

  const enterFullscreen = async () => {
    try { await containerRef.current?.requestFullscreen(); setIsFullscreen(true); }
    catch { setIsFullscreen(true); }
  };
  const exitFullscreen = async () => {
    try { await document.exitFullscreen(); } catch {}
    setIsFullscreen(false);
  };
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── Reorder helpers ───────────────────────────────────────────────────────

  const moveUp = (i: number) => {
    if (i === 0) return;
    setEditOrder((o) => { const a = [...o]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a; });
  };
  const moveDown = (i: number) => {
    setEditOrder((o) => {
      if (i >= o.length - 1) return o;
      const a = [...o]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a;
    });
  };
  const onDragStart = (i: number) => setDragIndex(i);
  const onDragEnter = (i: number) => { setDragOver(i); setIsOverRemove(false); };
  const onDragEnd = () => {
    if (dragIndex !== null && dragOver !== null && dragIndex !== dragOver) {
      setEditOrder((o) => {
        const a = [...o];
        const [item] = a.splice(dragIndex, 1);
        a.splice(dragOver, 0, item);
        return a;
      });
    }
    setDragIndex(null);
    setDragOver(null);
    setIsOverRemove(false);
  };

  const removeFromOrder = (i: number) => {
    setEditOrder((o) => o.filter((_, idx) => idx !== i));
  };

  // ── Save as new show ──────────────────────────────────────────────────────

  const handleSaveAsNew = async () => {
    const name = newShowName.trim();
    if (!name) { setSaveError("Enter a name for this show."); return; }
    setSaveError(null);
    const { show, error } = await createShow(name, editOrder.map((p) => p.id));
    if (error) { setSaveError(error); return; }
    setPhotos(editOrder);
    setCurrentShowName(show!.name);
    setNewShowName("");
    setEditMode(false);
  };

  // ── Load a show ───────────────────────────────────────────────────────────

  const handleLoadShow = (show: Slideshow) => {
    selectShow(show.id);
    applyShow(show);
    setEditMode(false);
  };

  // ── Delete a show ─────────────────────────────────────────────────────────

  const handleDeleteShow = async (id: string) => {
    if (!confirm("Delete this show? This cannot be undone.")) return;
    setDeletingId(id);
    await deleteShow(id);
    setDeletingId(null);
    // If we deleted the active show, reflect the new current in the viewer
    if (id === currentShowId) {
      const remaining = shows.filter((s) => s.id !== id);
      applyShow(remaining[0] ?? null);
    }
  };

  const handleCancelEdit = () => {
    setEditOrder(photos);
    setNewShowName("");
    setSaveError(null);
    setEditMode(false);
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const photo = photos[current] ?? null;
  const isLoading = loadingPhotos || configLoading;

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] bg-zinc-950">
        <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    );
  }

  if (photos.length === 0 && shows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] bg-zinc-950 gap-3">
        <MonitorPlay className="w-10 h-10 text-zinc-700" />
        <p className="text-zinc-500 text-sm">No photos are marked for slideshow yet.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative bg-black select-none overflow-hidden"
      style={{ height: isFullscreen ? "100vh" : "calc(100vh - 56px)" }}
    >
      {/* ── Current photo ── */}
      {photos[shownIndex] && (
        <img
          src={photos[shownIndex].med_url}
          alt={photos[shownIndex].title}
          className="absolute inset-0 w-full h-full object-contain"
          style={{
            opacity: imgOpacity,
            transition: fadeDuration > 0 ? `opacity ${fadeDuration / 2}s ease-in-out` : "none",
          }}
          draggable={false}
        />
      )}

      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/30 via-transparent to-black/20" />

      {/* ── Prev / Next arrows ── */}
      {photos.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((c) => (c - 1 + photos.length) % photos.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white/70 hover:bg-black/60 hover:text-white transition-all backdrop-blur-sm"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => setCurrent((c) => (c + 1) % photos.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white/70 hover:bg-black/60 hover:text-white transition-all backdrop-blur-sm"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* ── Bottom info ── */}
      {currentShowName && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-4 py-1 bg-black/50 rounded-full text-white/50 text-xs backdrop-blur-sm">
          {currentShowName}
        </div>
      )}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 rounded-full text-white/60 text-xs backdrop-blur-sm">
        {current + 1} / {photos.length}
      </div>

      {/* ── Controls hover zone (top-left) ── */}
      <div
        className="absolute top-0 left-0 w-72 h-56"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {!showControls && (
          <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-white/20" />
        )}

        <div className={`absolute top-3 left-3 w-64 bg-black/75 backdrop-blur-md border border-white/10 rounded-2xl p-4 space-y-3 transition-all duration-200 ${
          showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
        }`}>
          {/* Play / Pause + actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="flex items-center gap-2 flex-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-colors"
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {playing ? "Pause" : "Play"}
            </button>
            <button
              onClick={() => (isFullscreen ? exitFullscreen() : enterFullscreen())}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
            <button
              onClick={() => { setEditMode(true); setEditOrder(photos); setPlaying(false); setNewShowName(suggestShowName(shows)); }}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
              title="Manage shows"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>

          {/* Auto-advance toggle */}
          <div className="flex items-center justify-between">
            <span className="text-white/70 text-xs">Auto-advance</span>
            <button
              onClick={() => setAutoAdvance((a) => !a)}
              className={`relative w-9 h-5 rounded-full transition-colors ${autoAdvance ? "bg-emerald-500" : "bg-white/20"}`}
            >
              <span className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${autoAdvance ? "translate-x-[16px]" : "translate-x-0"}`} />
            </button>
          </div>

          {/* Interval */}
          {autoAdvance && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-white/70 text-xs shrink-0">Seconds</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setIntervalSecs((s) => Math.max(1, s - 1))}
                  className="w-6 h-6 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-white text-xs transition-colors">−</button>
                <span className="text-white text-sm w-6 text-center">{intervalSecs}</span>
                <button onClick={() => setIntervalSecs((s) => Math.min(30, s + 1))}
                  className="w-6 h-6 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-white text-xs transition-colors">+</button>
              </div>
            </div>
          )}

          {/* Fade */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-white/70 text-xs shrink-0">Fade (s)</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setFadeDuration((s) => Math.max(0, +(s - 0.5).toFixed(1)))}
                className="w-6 h-6 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-white text-xs transition-colors">−</button>
              <span className="text-white text-sm w-6 text-center">{fadeDuration}</span>
              <button onClick={() => setFadeDuration((s) => Math.min(5, +(s + 0.5).toFixed(1)))}
                className="w-6 h-6 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-white text-xs transition-colors">+</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit / Manage panel ── */}
      {editMode && (
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-40"
          onClick={handleCancelEdit}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-xl mx-4 overflow-hidden shadow-2xl flex flex-col"
            style={{ maxHeight: "85vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
              <h2 className="text-sm font-semibold text-zinc-100">Manage Slideshows</h2>
              <button onClick={handleCancelEdit} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-800 shrink-0">
              <TabBtn active={editTab === "shows"} onClick={() => setEditTab("shows")} icon={<FolderOpen className="w-3.5 h-3.5" />} label="Shows" />
              <TabBtn active={editTab === "order"} onClick={() => { setEditTab("order"); setNewShowName((n) => n || suggestShowName(shows)); }} icon={<GripVertical className="w-3.5 h-3.5" />} label="Edit Order" />
            </div>

            {/* ── Shows tab ── */}
            {editTab === "shows" && (
              <div className="overflow-y-auto flex-1">
                {shows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-600 text-sm gap-2">
                    <MonitorPlay className="w-8 h-8" />
                    <p>No saved shows yet.</p>
                    <p className="text-xs">Go to "Edit Order" to arrange photos and save a new show.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800">
                    {shows.map((show) => {
                      const isActive = show.id === currentShowId;
                      return (
                        <div key={show.id} className={`flex items-center gap-3 px-5 py-3 ${isActive ? "bg-zinc-800/60" : "hover:bg-zinc-800/30"} transition-colors`}>
                          <MonitorPlay className={`w-4 h-4 shrink-0 ${isActive ? "text-emerald-400" : "text-zinc-600"}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate ${isActive ? "text-zinc-100 font-medium" : "text-zinc-300"}`}>{show.name}</p>
                            <p className="text-xs text-zinc-600">{show.photo_ids.length} photo{show.photo_ids.length !== 1 ? "s" : ""} · {new Date(show.created_at).toLocaleDateString()}</p>
                          </div>
                          {isActive && (
                            <span className="text-xs text-emerald-400 font-medium shrink-0">Active</span>
                          )}
                          {!isActive && (
                            <button
                              onClick={() => handleLoadShow(show)}
                              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-300 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors shrink-0"
                            >
                              <FolderOpen className="w-3 h-3" /> Load
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteShow(show.id)}
                            disabled={deletingId === show.id}
                            className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-40 shrink-0"
                            title="Delete show"
                          >
                            {deletingId === show.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Edit Order tab ── */}
            {editTab === "order" && (
              <>
                <div className="overflow-y-auto flex-1 divide-y divide-zinc-800">
                  {editOrder.map((p, i) => (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={() => onDragStart(i)}
                      onDragEnter={() => onDragEnter(i)}
                      onDragEnd={onDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                      className={`flex items-center gap-3 px-4 py-2.5 transition-colors cursor-grab active:cursor-grabbing ${
                        dragOver === i ? "bg-zinc-700/60" : "hover:bg-zinc-800/50"
                      }`}
                    >
                      <GripVertical className="w-4 h-4 text-zinc-600 shrink-0" />
                      <span className="text-xs text-zinc-600 w-5 text-right shrink-0">{i + 1}</span>
                      <img src={p.thumb_url} alt={p.title} className="w-10 h-10 object-cover rounded-lg shrink-0" />
                      <span className="flex-1 text-sm text-zinc-300 truncate">{p.title}</span>
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button onClick={() => moveUp(i)} disabled={i === 0}
                          className="p-0.5 text-zinc-500 hover:text-zinc-200 disabled:opacity-20 transition-colors">
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => moveDown(i)} disabled={i === editOrder.length - 1}
                          className="p-0.5 text-zinc-500 hover:text-zinc-200 disabled:opacity-20 transition-colors">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromOrder(i)}
                        className="p-1 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors shrink-0"
                        title="Remove from slideshow"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Remove zone — visible while dragging */}
                {dragIndex !== null && (
                  <div
                    onDragEnter={() => setIsOverRemove(true)}
                    onDragLeave={() => setIsOverRemove(false)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex !== null) removeFromOrder(dragIndex);
                      setDragIndex(null);
                      setDragOver(null);
                      setIsOverRemove(false);
                    }}
                    className={`flex items-center justify-center gap-2 px-4 py-3 border-t transition-all duration-150 ${
                      isOverRemove
                        ? "bg-red-500/20 border-red-500/30 text-red-400"
                        : "border-zinc-800 text-zinc-600"
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">
                      {isOverRemove ? "Release to remove from slideshow" : "Drag here to remove"}
                    </span>
                  </div>
                )}

                {/* Save as new show footer */}
                <div className="px-5 py-4 border-t border-zinc-800 shrink-0 space-y-2">
                  <p className="text-xs text-zinc-500">Save this order as a new named show:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newShowName}
                      onChange={(e) => { setNewShowName(e.target.value); setSaveError(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveAsNew(); }}
                      placeholder="e.g. Championship 2026"
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-all"
                    />
                    <button
                      onClick={handleSaveAsNew}
                      disabled={saving || !newShowName.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-200 active:bg-zinc-300 transition-colors disabled:opacity-50 shrink-0"
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      {saving ? "Saving…" : "Save as New"}
                    </button>
                  </div>
                  {saveError && <p className="text-xs text-red-400">{saveError}</p>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
        active
          ? "border-zinc-100 text-zinc-100"
          : "border-transparent text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {icon} {label}
    </button>
  );
}
