import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ClipboardHeader } from "@/components/ClipboardHeader";
import { TextEditor } from "@/components/TextEditor";
import { MediaPanel } from "@/components/MediaPanel";
import { useRealtimeSession } from "@/hooks/useRealtimeSession";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const { sessionCode: urlSessionCode } = useParams();
  const [sessionCode, setSessionCode] = useState<string>("");
  const [textContent, setTextContent] = useState("");
  
  // Generate or use existing session code
  useEffect(() => {
    if (urlSessionCode) {
      setSessionCode(urlSessionCode);
    } else {
      // Generate random session code
      const newCode = Math.random().toString(36).substring(2, 8);
      setSessionCode(newCode);
      navigate(`/${newCode}`, { replace: true });
    }
  }, [urlSessionCode, navigate]);

  const { isConnected, userCount, items, addTextItem, addFileItem, removeItem, clearText } =
    useRealtimeSession(sessionCode);

  // Sync text content from items
  useEffect(() => {
    const textItems = items.filter((item) => item.item_type === "text");
    if (textItems.length > 0) {
      const latestText = textItems[textItems.length - 1];
      if (latestText.content !== textContent) {
        setTextContent(latestText.content || "");
      }
    } else if (textItems.length === 0 && textContent) {
      // Clear local text if all text items are deleted
      setTextContent("");
    }
  }, [items]);

  const handleTextChange = (content: string) => {
    setTextContent(content);
  };

  // Debounced save effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (textContent) {
        addTextItem(textContent);
      }
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [textContent, addTextItem]);

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

  if (!sessionCode) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ClipboardHeader
        sessionCode={sessionCode}
        isConnected={isConnected}
        userCount={userCount}
      />
      
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 border-b lg:border-b-0 lg:border-r border-border">
          <TextEditor
            content={textContent}
            onChange={handleTextChange}
            onPaste={handlePaste}
            onClear={handleClearText}
          />
        </div>
        
        <div className="flex-1 lg:max-w-md xl:max-w-lg">
          <MediaPanel
            items={mediaItems}
            onUpload={handleFileUpload}
            onRemove={removeItem}
            onDownload={handleDownload}
          />
        </div>
      </main>
    </div>
  );
};

export default Index;
