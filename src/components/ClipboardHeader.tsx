import { Clipboard, Users, Share2, Copy } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "./ThemeToggle";

interface ClipboardHeaderProps {
  sessionCode: string;
  isConnected: boolean;
  userCount: number;
}

export const ClipboardHeader = ({ sessionCode, isConnected, userCount }: ClipboardHeaderProps) => {
  const handleShare = () => {
    const url = `${window.location.origin}/${sessionCode}`;
    navigator.clipboard.writeText(url);
    toast.success("Session link copied to clipboard!");
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50" 
            style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary/30 to-secondary/30 border border-primary/30 backdrop-blur-sm"
               style={{ boxShadow: 'var(--shadow-neon)' }}>
            <Clipboard className="w-5 h-5 text-primary animate-pulse" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              ClipSync
            </h1>
          </div>
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 border border-border backdrop-blur-sm hover:bg-muted/70 hover:border-primary/50 transition-all group cursor-pointer"
          >
            <span className="text-xs text-muted-foreground font-medium">Session:</span>
            <code className="text-sm font-mono text-primary font-bold tracking-wider">{sessionCode}</code>
            <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-card/50 border border-border">
            <Users className="w-4 h-4 text-accent" />
            <span className="text-foreground font-semibold">{userCount}</span>
            <span className="text-muted-foreground">online</span>
          </div>
          {isConnected ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 border-2 border-accent/50 animate-glow-pulse"
                 style={{ boxShadow: '0 0 20px hsl(var(--accent) / 0.5)' }}>
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-sm font-bold text-accent">Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/20 border-2 border-destructive/50">
              <div className="w-2 h-2 rounded-full bg-destructive" />
              <span className="text-sm font-bold text-destructive">Disconnected</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
