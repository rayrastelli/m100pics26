import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play, Pause, ChevronLeft, ChevronRight, Maximize, Minimize,
  Settings2, GripVertical, Save, X, Loader2, MonitorPlay,
  ChevronUp, ChevronDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { gcsPublicUrl, isGcsPath } from "@/lib/gcs";
import { useSlideshowConfig } from "@/hooks/useSlideshowConfig";

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

function resolveUrl(path: string): string {
  if (isGcsPath(path)) return gcsPublicUrl(path);
  const { data } = supabase.storage.from("band-pics").getPublicUrl(path);
  return data.publicUrl;
}

export default function SlideshowPage() {
  const { savedIds, loading: configLoading, saving, load: loadConfig, save: saveConfig } = useSlideshowConfig();

  const [photos, setPhotos] = useState<SlideshowPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [interval, setIntervalSecs] = useState(3);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editOrder, setEditOrder] = useState<SlideshowPhoto[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsAreaRef = useRef<HTMLDivElement>(null);

  // ── Load photos + config ──────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      setLoadingPhotos(true);
      const [savedPhotoIds, photosResult] = await Promise.all([
        loadConfig(),
        supabase.from("photos").select("*").eq("slideshow", true),
      ]);

      const raw: SlideshowPhoto[] = (photosResult.data ?? []).map((p: any) => ({
        id: p.id,
        title: p.title,
        storage_path: p.storage_path,
        thumb_path: p.thumb_path ?? null,
        med_path: p.med_path ?? null,
        url: resolveUrl(p.storage_path),
        thumb_url: p.thumb_path ? gcsPublicUrl(p.thumb_path) : resolveUrl(p.storage_path),
        med_url: p.med_path ? gcsPublicUrl(p.med_path) : resolveUrl(p.storage_path),
      }));

      const photoMap = new Map(raw.map((p) => [p.id, p]));

      // Saved order first (only those still marked slideshow), then extras
      const ordered: SlideshowPhoto[] = [];
      for (const id of savedPhotoIds) {
        const p = photoMap.get(id);
        if (p) { ordered.push(p); photoMap.delete(id); }
      }
      for (const p of photoMap.values()) ordered.push(p);

      setPhotos(ordered);
      setEditOrder(ordered);
      setLoadingPhotos(false);
    }
    init();
  }, [loadConfig]);

  // ── Auto-advance timer ────────────────────────────────────────────────────

  const advance = useCallback(() => {
    setCurrent((c) => (c + 1) % Math.max(photos.length, 1));
  }, [photos.length]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (playing && autoAdvance && photos.length > 1) {
      timerRef.current = setTimeout(advance, interval * 1000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, autoAdvance, interval, current, advance, photos.length]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editMode) return;
      if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
      if (e.key === "ArrowRight") { setCurrent((c) => (c + 1) % Math.max(photos.length, 1)); }
      if (e.key === "ArrowLeft") { setCurrent((c) => (c - 1 + photos.length) % Math.max(photos.length, 1)); }
      if (e.key === "Escape" && isFullscreen) exitFullscreen();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editMode, photos.length, isFullscreen]);

  // ── Fullscreen ────────────────────────────────────────────────────────────

  const enterFullscreen = async () => {
    try {
      await containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } catch { setIsFullscreen(true); }
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

  // ── Edit helpers ──────────────────────────────────────────────────────────

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

  // Drag-and-drop reorder
  const onDragStart = (i: number) => setDragIndex(i);
  const onDragEnter = (i: number) => setDragOver(i);
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
  };

  const handleSave = async () => {
    await saveConfig(editOrder.map((p) => p.id));
    setPhotos(editOrder);
    setCurrent(0);
    setEditMode(false);
  };

  const handleCancelEdit = () => {
    setEditOrder(photos);
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

  if (photos.length === 0) {
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
      {photo && (
        <img
          key={photo.id}
          src={photo.med_url}
          alt={photo.title}
          className="absolute inset-0 w-full h-full object-contain transition-opacity duration-700"
          draggable={false}
        />
      )}

      {/* ── Subtle gradient overlay for controls readability ── */}
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

      {/* ── Photo counter bottom center ── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 rounded-full text-white/60 text-xs backdrop-blur-sm">
        {current + 1} / {photos.length}
      </div>

      {/* ── Photo title bottom ── */}
      {photo?.title && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/50 rounded-full text-white/80 text-sm max-w-xs truncate backdrop-blur-sm">
          {photo.title}
        </div>
      )}

      {/* ── Controls hover zone (top-left) ── */}
      <div
        ref={controlsAreaRef}
        className="absolute top-0 left-0 w-72 h-48"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* Tiny indicator dot when controls hidden */}
        {!showControls && (
          <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-white/20" />
        )}

        {/* Controls card */}
        <div className={`absolute top-3 left-3 w-64 bg-black/75 backdrop-blur-md border border-white/10 rounded-2xl p-4 space-y-3 transition-all duration-200 ${
          showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
        }`}>
          {/* Play / Pause row */}
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
              onClick={() => { setEditMode(true); setEditOrder(photos); setPlaying(false); }}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
              title="Edit order"
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
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoAdvance ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </div>

          {/* Interval */}
          {autoAdvance && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-white/70 text-xs shrink-0">Seconds</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIntervalSecs((s) => Math.max(1, s - 1))}
                  className="w-6 h-6 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-white text-xs transition-colors"
                >−</button>
                <span className="text-white text-sm w-6 text-center">{interval}</span>
                <button
                  onClick={() => setIntervalSecs((s) => Math.min(30, s + 1))}
                  className="w-6 h-6 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-white text-xs transition-colors"
                >+</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Edit panel ── */}
      {editMode && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-40" onClick={handleCancelEdit}>
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg mx-4 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-100">Edit Slideshow Order</h2>
              <button onClick={handleCancelEdit} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-[60vh] divide-y divide-zinc-800">
              {editOrder.map((p, i) => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={() => onDragStart(i)}
                  onDragEnter={() => onDragEnter(i)}
                  onDragEnd={onDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                    dragOver === i ? "bg-zinc-700/60" : "hover:bg-zinc-800/50"
                  }`}
                >
                  <GripVertical className="w-4 h-4 text-zinc-600 shrink-0 cursor-grab active:cursor-grabbing" />
                  <img
                    src={p.thumb_url}
                    alt={p.title}
                    className="w-10 h-10 object-cover rounded-lg shrink-0"
                  />
                  <span className="flex-1 text-sm text-zinc-300 truncate">{p.title}</span>
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={() => moveUp(i)}
                      disabled={i === 0}
                      className="p-0.5 text-zinc-500 hover:text-zinc-200 disabled:opacity-20 transition-colors"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveDown(i)}
                      disabled={i === editOrder.length - 1}
                      className="p-0.5 text-zinc-500 hover:text-zinc-200 disabled:opacity-20 transition-colors"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-800">
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-1.5 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-200 active:bg-zinc-300 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? "Saving…" : "Save Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
