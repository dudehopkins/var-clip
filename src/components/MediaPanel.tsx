import { Upload, X, File, Download, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MediaItem {
  id: string;
  type: "image" | "file";
  url: string;
  name?: string;
  size?: number;
}

interface MediaPanelProps {
  items: MediaItem[];
  onUpload: (file: File) => void;
  onRemove: (id: string) => void;
  onDownload: (url: string, name: string) => void;
  uploadProgress?: number;
  isUploading?: boolean;
}

export const MediaPanel = ({ items, onUpload, onRemove, onDownload, uploadProgress = 0, isUploading = false }: MediaPanelProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onUpload(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => onUpload(file));
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-end p-3 border-b border-border/50 bg-gradient-to-r from-card/40 to-card/20 backdrop-blur-sm">
        <label
          htmlFor="file-upload"
          className="cursor-pointer"
        >
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-2 hover:bg-primary/10 hover:text-primary transition-all pointer-events-none"
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Upload</span>
          </Button>
        </label>
        <input
          id="file-upload"
          type="file"
          className="hidden"
          onChange={handleFileChange}
          multiple
          disabled={isUploading}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isUploading && (
          <div className="mb-4 p-4 border border-border rounded-lg bg-card">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - uploadProgress / 100)}`}
                    className="text-primary transition-all duration-300"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-semibold text-foreground">{uploadProgress}%</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Uploading...</p>
                <p className="text-xs text-muted-foreground">Please wait</p>
              </div>
            </div>
          </div>
        )}
        
        {items.length === 0 ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            className={cn(
              "flex flex-col items-center justify-center h-full border-2 border-dashed rounded-xl transition-all",
              isDragging 
                ? "border-primary bg-primary/5 scale-105" 
                : "border-border hover:border-primary/50"
            )}
          >
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <div className="p-4 rounded-full bg-primary/10 border border-primary/20">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Select, paste or drop files here
                </p>
                <p className="text-xs text-muted-foreground">
                  Images and documents supported
                </p>
              </div>
              <label>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.csv,.json,.xml,.sql,.parquet,.avro,.orc,.tsv,.zip,.rar"
                  multiple
                />
                <Button variant="outline" size="sm" asChild>
                  <span className="cursor-pointer">Browse Files</span>
                </Button>
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="relative group rounded-lg overflow-hidden border border-border bg-card hover:border-primary/50 transition-all animate-slide-in"
              >
                {item.type === "image" ? (
                  <div className="relative">
                    <div className="aspect-video">
                      <img
                        src={item.url}
                        alt="Uploaded content"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background"
                        onClick={() => onDownload(item.url, item.name || "image")}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-8 w-8"
                        onClick={() => onRemove(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3">
                    <div className="p-2 rounded-lg bg-secondary">
                      <File className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(item.size)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => onDownload(item.url, item.name || "file")}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onRemove(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
