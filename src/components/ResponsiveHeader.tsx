import { useState } from "react";
import { Clipboard, Users, Share2, Copy, Menu, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { ThemeToggle } from "./ThemeToggle";
import { SessionSettings } from "./SessionSettings";
import { SessionCountdown } from "./SessionCountdown";
import { SessionActions } from "./SessionActions";

interface ResponsiveHeaderProps {
  sessionCode: string;
  isConnected: boolean;
  userCount: number;
  isPublic: boolean;
  isAuthenticated: boolean;
  expiresAt: string | null;
  hasPassword: boolean;
  onSettingsUpdated: () => void;
}

export const ResponsiveHeader = ({ 
  sessionCode, 
  isConnected, 
  userCount, 
  isPublic, 
  isAuthenticated, 
  expiresAt,
  hasPassword,
  onSettingsUpdated 
}: ResponsiveHeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleShare = () => {
    const url = `${window.location.origin}/${sessionCode}`;
    navigator.clipboard.writeText(url);
    toast.success("Session link copied to clipboard!");
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50" 
            style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center justify-between p-4">
        {/* Logo and Session Code - Always Visible */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-primary/30 to-secondary/30 border border-primary/30 backdrop-blur-sm"
               style={{ boxShadow: 'var(--shadow-neon)' }}>
            <Clipboard className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-pulse" />
            <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              varsclip
            </h1>
          </div>
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border backdrop-blur-sm hover:bg-muted/70 hover:border-primary/50 transition-all group cursor-pointer"
          >
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Session:</span>
            <code className="text-xs sm:text-sm font-mono text-primary font-bold tracking-wider">{sessionCode}</code>
            <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        </div>
        
        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-3">
          <SessionCountdown sessionCode={sessionCode} />
          <SessionActions 
            sessionCode={sessionCode}
            expiresAt={expiresAt}
            hasPassword={hasPassword}
          />
          <SessionSettings 
            sessionCode={sessionCode} 
            isPublic={isPublic}
            isAuthenticated={isAuthenticated}
            onSettingsUpdated={onSettingsUpdated}
          />
          <ThemeToggle />
          
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

        {/* Mobile Menu */}
        <div className="flex lg:hidden items-center gap-2">
          {/* User count and connection status - visible on mobile */}
          <div className="flex items-center gap-2 text-sm px-2 py-1 rounded-lg bg-card/50 border border-border">
            <Users className="w-3 h-3 text-accent" />
            <span className="text-foreground font-semibold text-xs">{userCount}</span>
          </div>
          
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-accent' : 'bg-destructive'} animate-pulse`} />
          
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px]">
              <div className="flex flex-col gap-4 mt-8">
                <div className="pb-4 border-b border-border">
                  <h3 className="font-semibold mb-2">Session Status</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Users online:</span>
                      <span className="text-sm font-bold">{userCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Connection:</span>
                      <span className={`text-sm font-bold ${isConnected ? 'text-accent' : 'text-destructive'}`}>
                        {isConnected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <SessionCountdown sessionCode={sessionCode} />
                  
                  <div className="flex flex-col gap-2">
                    <SessionActions 
                      sessionCode={sessionCode}
                      expiresAt={expiresAt}
                      hasPassword={hasPassword}
                    />
                  </div>
                  
                  <SessionSettings 
                    sessionCode={sessionCode} 
                    isPublic={isPublic}
                    isAuthenticated={isAuthenticated}
                    onSettingsUpdated={onSettingsUpdated}
                  />
                  
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Theme</span>
                      <ThemeToggle />
                    </div>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
