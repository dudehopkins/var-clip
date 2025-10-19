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
    <header className="flex items-center justify-between p-4 md:p-6 border-b border-border backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
          <Clipboard className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Clipboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge 
              variant={isConnected ? "default" : "secondary"}
              className={isConnected ? "bg-accent text-accent-foreground animate-glow-pulse" : ""}
            >
              {isConnected ? "Connected" : "Connecting..."}
            </Badge>
            {userCount > 0 && (
              <Badge variant="outline" className="gap-1">
                <Users className="w-3 h-3" />
                {userCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      <Button 
        onClick={handleShare}
        className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        <span className="hidden md:inline">{sessionCode}</span>
        <Share2 className="w-4 h-4" />
      </Button>
    </header>
  );
};
