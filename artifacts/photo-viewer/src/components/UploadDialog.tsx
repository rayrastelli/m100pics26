import { useState, useRef } from "react";
import { X, UploadCloud, FileImage, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, title: string, description?: string) => Promise<{ error: string | null }>;
}

export function UploadDialog({ isOpen, onClose, onUpload }: UploadDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setTitle("");
    setDescription("");
    setError(null);
  };

  const handleClose = () => {
    if (!isPending) {
      resetState();
      onClose();
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (JPG, PNG, GIF, WebP).");
      return;
    }
    setError(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsPending(true);
    setError(null);
    const { error } = await onUpload(selectedFile, title || "Untitled", description || undefined);
    setIsPending(false);
    if (error) {
      setError(error);
    } else {
      resetState();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={handleClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-zinc-900 border border-zinc-700/60 w-full max-w-md rounded-2xl shadow-2xl pointer-events-auto flex flex-col max-h-[90vh]">
          <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-800">
            <h2 className="text-base font-semibold text-zinc-100">Upload Photo</h2>
            <button
              onClick={handleClose}
              disabled={isPending}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {!selectedFile ? (
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200",
                  isDragging
                    ? "border-zinc-400 bg-zinc-800/60 scale-[0.98]"
                    : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/40"
                )}
              >
                <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                  <UploadCloud className="w-7 h-7 text-zinc-400" />
                </div>
                <p className="text-sm font-medium text-zinc-300 mb-1">Click or drag image here</p>
                <p className="text-xs text-zinc-600">JPG, PNG, GIF, WebP up to 50MB</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-zinc-800 group">
                  <img src={previewUrl!} alt="Preview" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <button
                      onClick={() => resetState()}
                      className="px-4 py-2 bg-black/70 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-black/90 transition-colors"
                    >
                      <FileImage className="w-4 h-4" /> Replace
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="A beautiful moment..."
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description (optional)</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tell a story..."
                      rows={3}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-all resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-sm text-red-400">
                {error}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-zinc-800 flex justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={isPending}
              className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 text-zinc-900 hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isPending ? "Uploading…" : "Upload"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
