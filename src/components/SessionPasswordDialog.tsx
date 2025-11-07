import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, Unlock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { passwordSchema } from "@/lib/validation";
import { SessionDurationSelector } from "./SessionDurationSelector";

interface SessionPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (password: string | null, isProtected: boolean, durationMinutes?: number | null) => void;
  isNewSession?: boolean;
}

export const SessionPasswordDialog = ({ 
  open, 
  onOpenChange, 
  onSubmit,
  isNewSession = false 
}: SessionPasswordDialogProps) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isProtected, setIsProtected] = useState(false);
  const [error, setError] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isProtected) {
      if (!password) {
        setError("Password is required");
        return;
      }
      
      if (isNewSession && password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      // Validate password strength
      const validation = passwordSchema.safeParse(password);
      if (!validation.success) {
        setError(validation.error.errors[0].message);
        return;
      }
    }

    onSubmit(isProtected ? password : null, isProtected, durationMinutes);
    setPassword("");
    setConfirmPassword("");
    setIsProtected(false);
    setDurationMinutes(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md cyber-border bg-card/95 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="font-orbitron text-2xl flex items-center gap-2">
            {isProtected ? (
              <>
                <Lock className="w-5 h-5 text-primary" />
                <span className="neon-text">Secure Session</span>
              </>
            ) : (
              <>
                <Unlock className="w-5 h-5 text-accent" />
                <span>Session Access</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isNewSession
              ? "Configure password protection for this session"
              : "Enter password to access this protected session"}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {isNewSession && (
            <>
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Password Protection</Label>
                  <p className="text-xs text-muted-foreground">
                    Require password to access this session
                  </p>
                </div>
                <Switch
                  checked={isProtected}
                  onCheckedChange={setIsProtected}
                />
              </div>

              <SessionDurationSelector onDurationSelect={setDurationMinutes} />
            </>
          )}

          {(isProtected || !isNewSession) && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isNewSession ? "Create password" : "Enter password"}
                  className="cyber-border"
                  autoFocus
                />
              </div>

              {isNewSession && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="cyber-border"
                  />
                </div>
              )}
            </>
          )}

          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}

          <div className="flex gap-3">
            {!isNewSession && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button type="submit" className="flex-1 cyber-border">
              {isNewSession ? (isProtected ? "Create Protected Session" : "Create Session") : "Unlock"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};