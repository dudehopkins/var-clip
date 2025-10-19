import { Textarea } from "@/components/ui/textarea";
import { Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface TextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onClear: () => void;
}

export const TextEditor = ({ content, onChange, onPaste, onClear }: TextEditorProps) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard!");
  };

  const handleClear = () => {
    onClear();
    toast.success("Text cleared!");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h2 className="text-sm font-medium text-muted-foreground">Text Content</h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            disabled={!content}
            className="h-8 gap-2"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Copy</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClear}
            disabled={!content}
            className="h-8 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
        </div>
      </div>
      
      <Textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onPaste={onPaste}
        placeholder="Type your text or paste content using Ctrl + V..."
        className="flex-1 resize-none border-0 focus-visible:ring-0 bg-transparent text-foreground placeholder:text-muted-foreground/50 p-4"
      />
    </div>
  );
};
