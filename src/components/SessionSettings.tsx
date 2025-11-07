import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SessionSettingsProps {
  sessionCode: string;
  isPublic: boolean;
  onSettingsUpdated: () => void;
}

export const SessionSettings = ({ sessionCode, isPublic, onSettingsUpdated }: SessionSettingsProps) => {
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [removePassword, setRemovePassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateSettings = async () => {
    const token = sessionStorage.getItem(`session_token_${sessionCode}`);
    
    if (!token) {
      toast.error("You must be authenticated to change session settings");
      return;
    }

    // Validation
    if (removePassword) {
      // Making session public
      setIsUpdating(true);
      try {
        const { data, error } = await supabase.functions.invoke('update-session-settings', {
          body: {
            sessionCode,
            token,
            makePublic: true,
          },
        });

        if (error) throw error;

        if (data?.error) {
          toast.error(data.error);
          return;
        }

        sessionStorage.removeItem(`session_token_${sessionCode}`);
        toast.success("Session is now public");
        setOpen(false);
        onSettingsUpdated();
      } catch (error) {
        console.error("Error updating settings:", error);
        toast.error("Failed to update session settings");
      } finally {
        setIsUpdating(false);
      }
    } else if (newPassword) {
      // Setting or changing password
      if (newPassword !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }

      if (newPassword.length < 12) {
        toast.error("Password must be at least 12 characters");
        return;
      }

      setIsUpdating(true);
      try {
        const { data, error } = await supabase.functions.invoke('update-session-settings', {
          body: {
            sessionCode,
            token,
            newPassword,
          },
        });

        if (error) throw error;

        if (data?.error) {
          toast.error(data.error);
          return;
        }

        toast.success("Password updated! You'll need to re-authenticate.");
        setOpen(false);
        setNewPassword("");
        setConfirmPassword("");
        
        // Trigger re-authentication without full reload
        onSettingsUpdated();
      } catch (error) {
        console.error("Error updating settings:", error);
        toast.error("Failed to update password");
      } finally {
        setIsUpdating(false);
      }
    } else {
      toast.error("Please enter a new password or choose to remove it");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Session Settings</DialogTitle>
          <DialogDescription>
            Manage password protection and privacy settings for this session.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-2">
              {isPublic ? (
                <Unlock className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Lock className="w-4 h-4 text-muted-foreground" />
              )}
              <Label htmlFor="public-toggle" className="text-sm">
                Current Status: {isPublic ? "Public" : "Password Protected"}
              </Label>
            </div>
          </div>

          {!isPublic && (
            <div className="flex items-center justify-between space-x-2 p-3 border rounded-lg bg-muted/30">
              <Label htmlFor="remove-password" className="text-sm cursor-pointer">
                Remove password protection
              </Label>
              <Switch
                id="remove-password"
                checked={removePassword}
                onCheckedChange={(checked) => {
                  setRemovePassword(checked);
                  if (checked) {
                    setNewPassword("");
                    setConfirmPassword("");
                  }
                }}
              />
            </div>
          )}

          {!removePassword && (
            <>
              <div className="space-y-2">
                <Label htmlFor="new-password">
                  {isPublic ? "Set Password" : "New Password"}
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={removePassword}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 12 characters, must include uppercase, lowercase, and number
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={removePassword}
                />
              </div>
            </>
          )}

          <Button
            onClick={handleUpdateSettings}
            disabled={isUpdating || (!removePassword && (!newPassword || !confirmPassword))}
            className="w-full"
          >
            {isUpdating ? "Updating..." : "Update Settings"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
