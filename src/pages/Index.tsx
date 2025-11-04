import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ClipboardHeader } from "@/components/ClipboardHeader";
import { TextEditor } from "@/components/TextEditor";
import { MediaPanel } from "@/components/MediaPanel";
import { SessionLanding } from "@/components/SessionLanding";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { AdvancedGraphics } from "@/components/AdvancedGraphics";
import { SessionPasswordDialog } from "@/components/SessionPasswordDialog";
import { useRealtimeSession } from "@/hooks/useRealtimeSession";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import bcrypt from "bcryptjs";

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
          .select("password_hash")
          .eq("session_code", sessionCode)
          .single();

        if (error || !session) {
          // New session
          setIsNewSession(true);
          setShowPasswordDialog(true);
          setIsCheckingSession(false);
          return;
        }

        if (session.password_hash) {
          // Protected session - check if already authenticated
          const storedAuth = sessionStorage.getItem(`session_auth_${sessionCode}`);
          if (storedAuth === "true") {
            setIsAuthenticated(true);
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

  const handlePasswordSubmit = async (password: string | null, isProtected: boolean) => {
    if (!sessionCode) return;

    try {
      if (isNewSession) {
        // Create new session
        const passwordHash = password ? await bcrypt.hash(password, 10) : null;
        
        const { error } = await supabase
          .from("sessions")
          .insert({
            session_code: sessionCode,
            password_hash: passwordHash,
          });

        if (error) throw error;

        if (password) {
          sessionStorage.setItem(`session_auth_${sessionCode}`, "true");
        }
        setIsAuthenticated(true);
        setIsNewSession(false);
        toast.success(isProtected ? "Protected session created!" : "Session created!");
      } else {
        // Verify password for existing session
        const { data: session } = await supabase
          .from("sessions")
          .select("password_hash")
          .eq("session_code", sessionCode)
          .single();

        if (!session?.password_hash) {
          setIsAuthenticated(true);
          return;
        }

        const isValid = await bcrypt.compare(password || "", session.password_hash);
        
        if (isValid) {
          sessionStorage.setItem(`session_auth_${sessionCode}`, "true");
          setIsAuthenticated(true);
          toast.success("Access granted!");
        } else {
          toast.error("Incorrect password");
          setShowPasswordDialog(true);
        }
      }
    } catch (error) {
      console.error("Error handling password:", error);
      toast.error("Failed to authenticate");
    }
  };

  // Initialize hooks first (hooks must be called unconditionally)
  const { isConnected, userCount, items, addTextItem, addFileItem, removeItem, clearText, uploadProgress, isUploading } =
    useRealtimeSession(sessionCode || "");
  
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
      
      <ClipboardHeader
        sessionCode={sessionCode}
        isConnected={isConnected}
        userCount={userCount}
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
        </div>
      </main>
    </div>
  );
};

export default Index;
