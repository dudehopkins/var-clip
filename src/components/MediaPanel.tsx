import { Upload, X, File, Download, Trash2 } from "lucide-react";
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
}

export const MediaPanel = ({ items, onUpload, onRemove, onDownload }: MediaPanelProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onUpload(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h2 className="text-sm font-medium text-muted-foreground">Media & Files</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
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
                  onChange={handleFileInput}
                  accept="image/*,.pdf,.doc,.docx,.txt"
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
