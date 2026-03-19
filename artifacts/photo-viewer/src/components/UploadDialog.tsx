import { useState, useRef, useCallback } from "react";
import { X, UploadCloud, Loader2, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TagEditor } from "@/components/TagEditor";

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  allTags: string[];
  onUpload: (file: File, title: string, tags: string[]) => Promise<{ error: string | null }>;
}

type FileStatus = "pending" | "uploading" | "done" | "error";

interface QueuedFile {
  id: string;
  file: File;
  previewUrl: string;
  title: string;
  status: FileStatus;
  errorMsg?: string;
}

function makeId() {
  return Math.random().toString(36).slice(2);
}

export function UploadDialog({ isOpen, onClose, allTags, onUpload }: UploadDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!arr.length) return;
    const items: QueuedFile[] = arr.map((f) => ({
      id: makeId(),
      file: f,
      previewUrl: URL.createObjectURL(f),
      title: f.name.replace(/\.[^/.]+$/, ""),
      status: "pending",
    }));
    setQueue((prev) => [...prev, ...items]);
  }, []);

  const removeFile = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const setTitle = (id: string, title: string) => {
    setQueue((prev) => prev.map((f) => (f.id === id ? { ...f, title } : f)));
  };

  const reset = () => {
    setQueue((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      return [];
    });
    setSelectedTags([]);
  };

  const handleClose = () => {
    if (isRunning) return;
    reset();
    onClose();
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const handleUploadAll = async () => {
    const pending = queue.filter((f) => f.status === "pending");
    if (!pending.length) return;
    setIsRunning(true);

    for (const item of pending) {
      setQueue((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "uploading" } : f));

      const { error } = await onUpload(item.file, item.title || "Untitled", selectedTags);

      setQueue((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? { ...f, status: error ? "error" : "done", errorMsg: error ?? undefined }
            : f
        )
      );
    }

    setIsRunning(false);
  };

  const allDone = queue.length > 0 && queue.every((f) => f.status === "done" || f.status === "error");
  const pendingCount = queue.filter((f) => f.status === "pending").length;
  const doneCount = queue.filter((f) => f.status === "done").length;
  const errorCount = queue.filter((f) => f.status === "error").length;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={handleClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-zinc-900 border border-zinc-700/60 w-full max-w-lg rounded-2xl shadow-2xl pointer-events-auto flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-800 flex-shrink-0">
            <h2 className="text-base font-semibold text-zinc-100">
              Upload Photos
              {queue.length > 0 && (
                <span className="ml-2 text-sm font-normal text-zinc-500">
                  {queue.length} selected
                </span>
              )}
            </h2>
            <button
              onClick={handleClose}
              disabled={isRunning}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tags — outside the scrollable area so the dropdown isn't clipped */}
          <div className="px-4 pt-3 pb-2 border-b border-zinc-800/60 flex-shrink-0">
            <p className="text-xs font-medium text-zinc-500 mb-1.5">
              Tags
              <span className="ml-1.5 font-normal text-zinc-600">applied to all photos</span>
            </p>
            <TagEditor
              tags={selectedTags}
              allTags={allTags}
              onChange={setSelectedTags}
            />
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">

            {/* Drop zone */}
            <div className="p-4 pb-0">
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => !isRunning && fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer",
                  queue.length === 0 ? "py-12 flex-col" : "py-4",
                  isDragging
                    ? "border-zinc-400 bg-zinc-800/60"
                    : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/30",
                  isRunning && "pointer-events-none opacity-40"
                )}
              >
                <div className={cn(
                  "rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0",
                  queue.length === 0 ? "w-14 h-14" : "w-9 h-9"
                )}>
                  <UploadCloud className={cn("text-zinc-400", queue.length === 0 ? "w-7 h-7" : "w-4 h-4")} />
                </div>
                {queue.length === 0 ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-zinc-300 mb-1">Click or drag images here</p>
                    <p className="text-xs text-zinc-600">JPG, PNG, GIF, WebP · multiple files supported</p>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400">Add more photos</p>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.length && addFiles(e.target.files)}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
              </div>
            </div>

            {/* Queue list */}
            {queue.length > 0 && (
              <div className="p-4 space-y-2">
                {queue.map((item) => (
                  <QueueRow
                    key={item.id}
                    item={item}
                    onRemove={() => removeFile(item.id)}
                    onTitleChange={(t) => setTitle(item.id, t)}
                    disabled={isRunning}
                  />
                ))}
              </div>
            )}

            {/* Summary after upload */}
            {allDone && (
              <div className="px-4 pb-4">
                <div className={cn(
                  "rounded-xl px-4 py-3 text-sm",
                  errorCount > 0
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                    : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                )}>
                  {doneCount > 0 && `${doneCount} photo${doneCount !== 1 ? "s" : ""} uploaded successfully.`}
                  {errorCount > 0 && ` ${errorCount} failed — see errors above.`}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-zinc-800 flex justify-between items-center flex-shrink-0">
            <button
              onClick={handleClose}
              disabled={isRunning}
              className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {allDone ? "Close" : "Cancel"}
            </button>

            <div className="flex items-center gap-3">
              {queue.length > 0 && !isRunning && !allDone && (
                <button
                  onClick={reset}
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  Clear all
                </button>
              )}
              {!allDone && (
                <button
                  onClick={handleUploadAll}
                  disabled={pendingCount === 0 || isRunning}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 text-zinc-900 hover:bg-zinc-200 active:bg-zinc-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isRunning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isRunning
                    ? "Uploading…"
                    : pendingCount === 1
                      ? "Upload 1 photo"
                      : `Upload ${pendingCount} photos`}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// ─── Individual row in the queue ─────────────────────────────────────────────

function QueueRow({
  item,
  onRemove,
  onTitleChange,
  disabled,
}: {
  item: QueuedFile;
  onRemove: () => void;
  onTitleChange: (t: string) => void;
  disabled: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-xl bg-zinc-800/50 border p-3 transition-colors",
      item.status === "done"    && "border-emerald-500/20",
      item.status === "error"   && "border-red-500/20",
      item.status === "uploading" && "border-zinc-600",
      item.status === "pending" && "border-zinc-700/60",
    )}>
      {/* Thumbnail */}
      <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-900">
        <img src={item.previewUrl} alt={item.title} className="w-full h-full object-cover" />
      </div>

      {/* Title input */}
      <div className="flex-1 min-w-0">
        <input
          type="text"
          value={item.title}
          onChange={(e) => onTitleChange(e.target.value)}
          disabled={disabled || item.status === "done"}
          placeholder="Title"
          className="w-full bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none disabled:opacity-60"
        />
        {item.status === "error" && item.errorMsg && (
          <p className="text-xs text-red-400 mt-0.5 truncate">{item.errorMsg}</p>
        )}
        {item.status === "pending" && (
          <p className="text-xs text-zinc-600 mt-0.5">{formatBytes(item.file.size)}</p>
        )}
      </div>

      {/* Status / remove */}
      <div className="flex-shrink-0 flex items-center">
        {item.status === "uploading" && (
          <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
        )}
        {item.status === "done" && (
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        )}
        {item.status === "error" && (
          <AlertCircle className="w-4 h-4 text-red-400" />
        )}
        {item.status === "pending" && (
          <button
            onClick={onRemove}
            disabled={disabled}
            className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors rounded-md hover:bg-zinc-700 disabled:opacity-40"
            title="Remove"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
