import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ResponsiveHeader } from "@/components/ResponsiveHeader";
import { TextEditor } from "@/components/TextEditor";
import { MediaPanel } from "@/components/MediaPanel";
import { SessionLanding } from "@/components/SessionLanding";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { AdvancedGraphics } from "@/components/AdvancedGraphics";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SessionPasswordDialog } from "@/components/SessionPasswordDialog";
import { SessionAnalytics } from "@/components/SessionAnalytics";
import { useRealtimeSession } from "@/hooks/useRealtimeSession";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Index = () => {
  const { sessionCode } = useParams();
  const navigate = useNavigate();
  const [textContent, setTextContent] = useState("");
  const isTypingRef = useRef(false);
  const lastSavedContentRef = useRef("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [isNewSession, setIsNewSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Check if session exists and requires password
  useEffect(() => {
    const checkSession = async () => {
      if (!sessionCode) {
        setIsCheckingSession(false);
        return;
      }

      try {
        const { data: session, error } = await supabase
          .from("sessions")
          .select("id, password_hash, is_public, expires_at")
          .eq("session_code", sessionCode)
          .single();

        if (error || !session) {
          // New session
          setIsNewSession(true);
          setShowPasswordDialog(true);
          setIsCheckingSession(false);
          return;
        }

        // Update public status and expiration
        setIsPublic(session.is_public);
        setExpiresAt(session.expires_at);
        setHasPassword(!!session.password_hash);

        if (session.password_hash) {
          // Protected session - check if token exists and is valid
          const storedToken = sessionStorage.getItem(`session_token_${sessionCode}`);
          if (storedToken) {
            // Validate token with database
            const { data: tokenData } = await supabase
              .from('session_tokens')
              .select('expires_at')
              .eq('token', storedToken)
              .eq('session_id', session.id)
              .single();
            
            if (tokenData && new Date(tokenData.expires_at) > new Date()) {
              setIsAuthenticated(true);
              setSessionToken(storedToken);
            } else {
              // Token invalid or expired
              sessionStorage.removeItem(`session_token_${sessionCode}`);
              setShowPasswordDialog(true);
            }
          } else {
            setShowPasswordDialog(true);
          }
        } else {
          // Public session
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Error checking session:", error);
        toast.error("Failed to check session");
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, [sessionCode]);

  const handleSettingsUpdated = async () => {
    // Refresh session data after settings update
    if (!sessionCode) return;
    
    try {
    // Clear token if settings changed
    sessionStorage.removeItem(`session_token_${sessionCode}`);
    setSessionToken(null);
      
      const { data: session } = await supabase
        .from("sessions")
        .select("is_public, password_hash, expires_at")
        .eq("session_code", sessionCode)
        .single();
      
      if (session) {
      setIsPublic(session.is_public);
      setExpiresAt(session.expires_at);
      setHasPassword(!!session.password_hash);
        
        // If session now requires password, show dialog
        if (session.password_hash) {
          setIsAuthenticated(false);
          setShowPasswordDialog(true);
        } else {
          // Public session, mark as authenticated
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error("Error refreshing session data:", error);
    }
  };

  const handlePasswordSubmit = async (password: string | null, isProtected: boolean, durationMinutes?: number | null) => {
    if (!sessionCode) return;

    try {
      // Call server-side Edge Function for secure password handling
      const { data, error } = await supabase.functions.invoke('verify-session-password', {
        body: {
          sessionCode,
          password: isProtected ? password : null,
          isCreating: isNewSession,
          durationMinutes: durationMinutes,
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        toast.error("Failed to process request");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        if (!isNewSession) {
          setShowPasswordDialog(true);
        }
        return;
      }

      if (data?.success) {
        // Store server-validated token if provided
        if (data.token) {
          sessionStorage.setItem(`session_token_${sessionCode}`, data.token);
          setSessionToken(data.token);
        }
        
        // Refresh session data to get latest state
        const { data: session } = await supabase
          .from("sessions")
          .select("is_public, expires_at")
          .eq("session_code", sessionCode)
          .single();
        
        if (session) {
          setIsPublic(session.is_public);
          setExpiresAt(session.expires_at);
        }
        
        setIsAuthenticated(true);
        setIsNewSession(false);
        setShowPasswordDialog(false);
        
        toast.success(
          isNewSession 
            ? (isProtected ? "Protected session created!" : "Session created!") 
            : "Access granted!"
        );
      }
    } catch (error) {
      console.error("Error handling password:", error);
      toast.error("Failed to authenticate");
    }
  };

  // Initialize hooks first (hooks must be called unconditionally)
  const { isConnected, userCount, items, addTextItem, addFileItem, removeItem, clearText, uploadProgress, isUploading } =
    useRealtimeSession(sessionCode || "", isAuthenticated);

  // Track analytics when session is accessed
  useEffect(() => {
    if (sessionCode && isAuthenticated) {
      supabase.functions.invoke('track-analytics', {
        body: {
          sessionCode,
          action: 'session_accessed',
          metadata: { timestamp: new Date().toISOString() }
        }
      });
    }
  }, [sessionCode, isAuthenticated]);
  
  // Sync text content from items (only when not actively typing)
  useEffect(() => {
    if (isTypingRef.current) return;
    
    const textItems = items.filter((item) => item.item_type === "text");
    if (textItems.length > 0) {
      const latestText = textItems[textItems.length - 1];
      if (latestText.content && latestText.content !== textContent) {
        setTextContent(latestText.content);
        lastSavedContentRef.current = latestText.content;
      }
    } else if (textItems.length === 0) {
      setTextContent("");
      lastSavedContentRef.current = "";
    }
  }, [items]);

  const handleTextChange = (content: string) => {
    setTextContent(content);
    isTypingRef.current = true;
  };

  // Debounced save effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (textContent !== lastSavedContentRef.current) {
        addTextItem(textContent);
        lastSavedContentRef.current = textContent;
      }
      isTypingRef.current = false;
    }, 800);
    return () => clearTimeout(timeoutId);
  }, [textContent, addTextItem]);

  // Show landing page if no session code
  if (!sessionCode) {
    return <SessionLanding />;
  }

  // Show loading or password dialog if checking session
  if (isCheckingSession || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
        <AnimatedBackground />
        <AdvancedGraphics />
        {isCheckingSession && !showPasswordDialog && (
          <LoadingScreen message="Loading session..." />
        )}
        <SessionPasswordDialog
          open={showPasswordDialog}
          onOpenChange={setShowPasswordDialog}
          onSubmit={handlePasswordSubmit}
          isNewSession={isNewSession}
        />
      </div>
    );
  }

  const handleClearText = async () => {
    setTextContent("");
    await clearText();
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.indexOf("image") !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await addFileItem(file);
          toast.success("Image pasted!");
        }
      }
    }
  };

  const handleFileUpload = async (file: File) => {
    await addFileItem(file);
  };

  const handleDownload = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Download started!");
    } catch (error) {
      toast.error("Failed to download file");
      console.error(error);
    }
  };

  const mediaItems = items
    .filter((item) => item.item_type === "image" || item.item_type === "file")
    .map((item) => ({
      id: item.id,
      type: item.item_type as "image" | "file",
      url: item.file_url || "",
      name: item.file_name,
      size: item.file_size,
    }));

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <AnimatedBackground />
      <AdvancedGraphics />
      
      <ResponsiveHeader
        sessionCode={sessionCode}
        isConnected={isConnected}
        userCount={userCount}
        isPublic={isPublic}
        isAuthenticated={isAuthenticated}
        expiresAt={expiresAt}
        hasPassword={hasPassword}
        sessionToken={sessionToken}
        onSettingsUpdated={handleSettingsUpdated}
      />
      
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Text Content Section */}
        <div className="flex-1 border-b lg:border-b-0 lg:border-r border-border flex flex-col">
          <div className="p-3 border-b border-border bg-card/30 backdrop-blur-sm">
            <h2 className="text-sm font-semibold text-foreground">Text Content</h2>
          </div>
          <TextEditor
            content={textContent}
            onChange={handleTextChange}
            onPaste={handlePaste}
            onClear={handleClearText}
          />
        </div>
        
        {/* Media & Files Section */}
        <div className="flex-1 lg:w-[400px] xl:w-[480px] flex flex-col">
          <div className="p-3 border-b border-border bg-card/30 backdrop-blur-sm">
            <h2 className="text-sm font-semibold text-foreground">Media & Files</h2>
          </div>
          <MediaPanel
            items={mediaItems}
            onUpload={handleFileUpload}
            onRemove={removeItem}
            onDownload={handleDownload}
            uploadProgress={uploadProgress}
            isUploading={isUploading}
          />
          
          {/* Session Analytics in sidebar */}
          <div className="p-4 border-t border-border">
            <SessionAnalytics 
              sessionCode={sessionCode} 
              items={items}
              textContent={textContent}
            />
          </div>
        </div>
      </main>
      
    </div>
  );
};

export default Index;
