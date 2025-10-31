import { Textarea } from "@/components/ui/textarea";
import { Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTypingSound } from "@/hooks/useTypingSound";

interface TextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onClear: () => void;
}

export const TextEditor = ({ content, onChange, onPaste, onClear }: TextEditorProps) => {
  const { playKeystroke } = useTypingSound();
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
      <div className="flex items-center justify-end gap-2 p-3 border-b border-border/50 bg-gradient-to-r from-card/20 to-card/40 backdrop-blur-sm">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          disabled={!content}
          className="h-8 gap-2 hover:bg-primary/10 hover:text-primary transition-all"
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
      
      <Textarea
        value={content}
        onChange={(e) => {
          onChange(e.target.value);
          playKeystroke();
        }}
        onPaste={onPaste}
        placeholder="Type your text or paste content using Ctrl + V..."
        className="flex-1 resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-foreground placeholder:text-muted-foreground/50 p-4"
      />
    </div>
  );
};
