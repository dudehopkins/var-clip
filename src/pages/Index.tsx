import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { ClipboardHeader } from "@/components/ClipboardHeader";
import { TextEditor } from "@/components/TextEditor";
import { MediaPanel } from "@/components/MediaPanel";
import { SessionLanding } from "@/components/SessionLanding";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { AdvancedGraphics } from "@/components/AdvancedGraphics";
import { useRealtimeSession } from "@/hooks/useRealtimeSession";
import { toast } from "sonner";

const Index = () => {
  const { sessionCode } = useParams();
  const [textContent, setTextContent] = useState("");
  const isTypingRef = useRef(false);
  const lastSavedContentRef = useRef("");

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
      
      {/* Unified Section Headers */}
      <div className="flex items-center border-b border-border bg-card/30 backdrop-blur-sm">
        <div className="flex-1 p-3 lg:border-r border-border">
          <h2 className="text-sm font-semibold text-foreground">Text Content</h2>
        </div>
        <div className="w-full lg:w-[400px] xl:w-[480px] p-3">
          <h2 className="text-sm font-semibold text-foreground">Media & Files</h2>
        </div>
      </div>
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 border-b border-border flex flex-col lg:border-r">
          <TextEditor
            content={textContent}
            onChange={handleTextChange}
            onPaste={handlePaste}
            onClear={handleClearText}
          />
        </div>
        
        <div className="w-full lg:w-[400px] xl:w-[480px] flex flex-col lg:flex-row lg:w-full lg:border-t">
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
