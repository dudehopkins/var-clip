import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface SessionCountdownProps {
  sessionCode: string;
}

export const SessionCountdown = ({ sessionCode }: SessionCountdownProps) => {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExpiration = async () => {
      const { data } = await supabase
        .from("sessions")
        .select("expires_at")
        .eq("session_code", sessionCode)
        .single();

      if (data?.expires_at) {
        setExpiresAt(data.expires_at);
      }
    };

    fetchExpiration();
  }, [sessionCode]);

  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const remaining = expiry - now;

      if (remaining <= 0) {
        setTimeRemaining(0);
        handleExpiration();
      } else {
        setTimeRemaining(remaining);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleExpiration = async () => {
    try {
      toast.error("Session has expired and will be deleted");
      
      // Call cleanup function
      await supabase.functions.invoke('cleanup-expired-session', {
        body: { sessionCode }
      });

      // Redirect to home after a short delay
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error) {
      console.error("Error handling expiration:", error);
    }
  };

  if (!expiresAt || timeRemaining === null) {
    return null;
  }

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(" ");
  };

  const isExpiringSoon = timeRemaining < 300000; // Less than 5 minutes

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium ${
        isExpiringSoon
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground"
      }`}
    >
      <Clock className="w-3.5 h-3.5" />
      <span>Expires in: {formatTime(timeRemaining)}</span>
    </div>
  );
};
