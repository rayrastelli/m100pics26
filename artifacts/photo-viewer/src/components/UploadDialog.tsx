import { useState, useRef } from "react";
import { X, UploadCloud, FileImage, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUploadGalleryPhoto } from "@/hooks/use-photos";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadDialog({ isOpen, onClose }: UploadDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { mutate: uploadPhoto, isPending } = useUploadGalleryPhoto();
  const { toast } = useToast();

  const resetState = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setTitle("");
    setDescription("");
  };

  const handleClose = () => {
    if (!isPending) {
      resetState();
      onClose();
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, GIF, WebP).",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    // Auto-fill title from filename if empty
    if (!title) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setTitle(nameWithoutExt);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    uploadPhoto(
      { data: { file: selectedFile, title: title || "Untitled", description } },
      {
        onSuccess: () => {
          toast({
            title: "Photo uploaded",
            description: "Your photo has been added to the gallery."
          });
          handleClose();
        },
        onError: (err) => {
          toast({
            title: "Upload failed",
            description: err.message || "An error occurred during upload.",
            variant: "destructive"
          });
        }
      }
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card w-full max-w-md rounded-2xl border border-white/10 shadow-2xl shadow-black overflow-hidden pointer-events-auto flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
                <h2 className="text-lg font-semibold text-foreground font-display">Upload Photo</h2>
                <button 
                  onClick={handleClose}
                  disabled={isPending}
                  className="p-2 -mr-2 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto hide-scrollbar flex-1">
                {!selectedFile ? (
                  <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group",
                      isDragging 
                        ? "border-primary bg-primary/5 scale-[0.98]" 
                        : "border-white/10 hover:border-white/20 hover:bg-white/5"
                    )}
                  >
                    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="text-base font-medium mb-1">Click or drag image here</h3>
                    <p className="text-sm text-muted-foreground">Supports JPG, PNG, GIF, WebP up to 10MB</p>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black/50 border border-white/10 group">
                      <img 
                        src={previewUrl!} 
                        alt="Preview" 
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <button
                          onClick={() => resetState()}
                          className="px-4 py-2 bg-black/50 hover:bg-black/80 text-white rounded-lg backdrop-blur-md text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <FileImage className="w-4 h-4" /> Replace Image
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Title</label>
                        <input 
                          type="text" 
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="A beautiful sunset..."
                          className="w-full bg-background border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-white placeholder:text-muted-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Description (Optional)</label>
                        <textarea 
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Tell a story about this photo..."
                          rows={3}
                          className="w-full bg-background border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none text-white placeholder:text-muted-foreground"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-white/5 bg-background/50 flex justify-end gap-3">
                <button 
                  onClick={handleClose}
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpload}
                  disabled={!selectedFile || isPending}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isPending ? "Uploading..." : "Upload Photo"}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
