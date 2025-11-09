import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SessionActionsProps {
  sessionCode: string;
  expiresAt: string | null;
  hasPassword?: boolean;
}

export const SessionActions = ({ sessionCode, expiresAt, hasPassword = false }: SessionActionsProps) => {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState("");
  const [deletePassword, setDeletePassword] = useState("");

  const handleDeleteClick = () => {
    if (hasPassword) {
      setShowPasswordDialog(true);
    } else {
      setShowDeleteDialog(true);
    }
  };

  const handleVerifyPassword = async () => {
    if (!deletePassword) {
      toast.error("Please enter password");
      return;
    }

    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-session-password', {
        body: { sessionCode, password: deletePassword }
      });

      if (error || !data?.success) {
        toast.error("Incorrect password");
        setIsDeleting(false);
        return;
      }

      // Password verified, proceed with deletion
      await handleDelete();
    } catch (error) {
      console.error("Error verifying password:", error);
      toast.error("Failed to verify password");
      setIsDeleting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('cleanup-expired-session', {
        body: { sessionCode, forceDelete: true }
      });

      if (error) {
        toast.error("Failed to delete session");
        return;
      }

      toast.success("Session deleted successfully");
      navigate("/");
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Failed to delete session");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setShowPasswordDialog(false);
      setDeletePassword("");
    }
  };

  const handleExtend = async () => {
    const minutes = parseInt(extendMinutes);
    if (!minutes || minutes < 1) {
      toast.error("Please enter a valid number of minutes");
      return;
    }

    setIsExtending(true);
    try {
      const { error } = await supabase.functions.invoke('extend-session', {
        body: { sessionCode, extendMinutes: minutes }
      });

      if (error) {
        toast.error("Failed to extend session");
        return;
      }

      toast.success(`Session extended by ${minutes} minutes`);
      window.location.reload();
    } catch (error) {
      console.error("Error extending session:", error);
      toast.error("Failed to extend session");
    } finally {
      setIsExtending(false);
      setShowExtendDialog(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {expiresAt && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowExtendDialog(true)}
          className="gap-2"
        >
          <Clock className="w-4 h-4" />
          Extend
        </Button>
      )}
      
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDeleteClick}
        className="gap-2"
      >
        <Trash2 className="w-4 h-4" />
        Delete
      </Button>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Password</DialogTitle>
            <DialogDescription>
              This session is password-protected. Enter the password to delete.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-password">Session Password</Label>
              <Input
                id="delete-password"
                type="password"
                placeholder="Enter session password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
            </div>
            <Button
              onClick={handleVerifyPassword}
              disabled={isDeleting || !deletePassword}
              className="w-full"
              variant="destructive"
            >
              {isDeleting ? "Verifying..." : "Verify & Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Session
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this session and all its contents (text, images, files).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Session"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Session Duration</DialogTitle>
            <DialogDescription>
              Add more time before this session expires
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="extend-minutes">Additional Minutes</Label>
              <Input
                id="extend-minutes"
                type="number"
                placeholder="e.g., 30"
                value={extendMinutes}
                onChange={(e) => setExtendMinutes(e.target.value)}
                min="1"
              />
            </div>
            <Button
              onClick={handleExtend}
              disabled={isExtending || !extendMinutes}
              className="w-full"
            >
              {isExtending ? "Extending..." : "Extend Session"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
