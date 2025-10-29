import { Clipboard, Share2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ClipboardHeaderProps {
  sessionCode: string;
  isConnected: boolean;
  userCount: number;
}

export const ClipboardHeader = ({ sessionCode, isConnected, userCount }: ClipboardHeaderProps) => {
  const handleShare = () => {
    const url = `${window.location.origin}/${sessionCode}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  return (
    <header className="flex items-center justify-between p-4 md:p-6 border-b border-border backdrop-blur-sm bg-background/50">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 shadow-lg">
          <Clipboard className="w-6 h-6 text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Clipboard
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge 
              variant={isConnected ? "default" : "secondary"}
              className={isConnected ? "bg-accent text-accent-foreground animate-glow-pulse border-accent/50" : ""}
            >
              {isConnected ? "Connected" : "Connecting..."}
            </Badge>
            {userCount > 0 && (
              <Badge variant="outline" className="gap-1 border-primary/30">
                <Users className="w-3 h-3" />
                {userCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      <Button 
        onClick={handleShare}
        className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl transition-all"
      >
        <span className="hidden md:inline font-semibold">{sessionCode}</span>
        <Share2 className="w-4 h-4" />
      </Button>
    </header>
  );
};
