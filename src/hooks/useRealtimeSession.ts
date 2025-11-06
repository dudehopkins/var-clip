import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";
import { textContentSchema, fileSchema } from "@/lib/validation";

interface SessionItem {
  id: string;
  item_type: "text" | "image" | "file";
  content?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  position: number;
  created_at: string;
}

export const useRealtimeSession = (sessionCode: string, isAuthenticated: boolean = true) => {
  const [isConnected, setIsConnected] = useState(false);
  const [userCount, setUserCount] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [items, setItems] = useState<SessionItem[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);

  // Initialize or join session
  useEffect(() => {
    if (!sessionCode || !isAuthenticated) return;

    const initSession = async () => {
      // Only check if session exists, don't create it
      const { data: existingSession } = await supabase
        .from("sessions")
        .select("id")
        .eq("session_code", sessionCode)
        .maybeSingle();

      if (existingSession) {
        setSessionId(existingSession.id);
        
        // Load existing items
        const { data: sessionItems } = await supabase
          .from("session_items")
          .select("*")
          .eq("session_id", existingSession.id)
          .order("created_at", { ascending: true });

        if (sessionItems) {
          setItems(sessionItems as SessionItem[]);
        }
      }
    };

    initSession();
  }, [sessionCode, isAuthenticated]);

  // Set up realtime subscription
  useEffect(() => {
    if (!sessionId) return;

    const realtimeChannel = supabase
      .channel(`session:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "session_items",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setItems((prev) => [...prev, payload.new as SessionItem]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "session_items",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setItems((prev) => prev.filter((item) => item.id !== payload.old.id));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "session_items",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setItems((prev) =>
            prev.map((item) => (item.id === payload.new.id ? (payload.new as SessionItem) : item))
          );
        }
      )
      .on("presence", { event: "sync" }, () => {
        const state = realtimeChannel.presenceState();
        setUserCount(Object.keys(state).length);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
          realtimeChannel.track({ online_at: new Date().toISOString() });
        }
      });

    setChannel(realtimeChannel);

    return () => {
      realtimeChannel.unsubscribe();
    };
  }, [sessionId]);

  const addTextItem = useCallback(
    async (content: string) => {
      if (!sessionId || !content.trim()) return;

      // Validate content size
      const validation = textContentSchema.safeParse(content);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      // Check if there's already a text item for this session
      const existingTextItem = items.find((item) => item.item_type === "text");

      if (existingTextItem) {
        // Update existing text item
        const { error } = await supabase
          .from("session_items")
          .update({ content })
          .eq("id", existingTextItem.id);

        if (error) {
          toast.error("Failed to save text");
        }
      } else {
        // Create new text item
        const { error } = await supabase.from("session_items").insert({
          session_id: sessionId,
          item_type: "text",
          content,
          position: items.length,
        });

        if (error) {
          toast.error("Failed to save text");
        }
      }
    },
    [sessionId, items]
  );

  const addFileItem = useCallback(
    async (file: File) => {
      if (!sessionId) return;

      // Validate file before upload
      const validation = fileSchema.safeParse({
        name: file.name,
        size: file.size,
        type: file.type,
      });
      
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      try {
        setIsUploading(true);
        setUploadProgress(0);

        // Upload file to Supabase Storage with progress tracking
        const fileExt = file.name.split(".").pop();
        const fileName = `${sessionId}/${Date.now()}.${fileExt}`;
        
        // Simulate progress for smaller files (Supabase doesn't provide native progress)
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => Math.min(prev + 10, 90));
        }, 100);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("session-files")
          .upload(fileName, file);

        clearInterval(progressInterval);
        setUploadProgress(95);

        if (uploadError) throw uploadError;

        // Get signed URL (bucket is now private)
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from("session-files")
          .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 days expiry

        if (signedUrlError) throw signedUrlError;
        
        const fileUrl = signedUrlData.signedUrl;

        // Save to database
        const isImage = file.type.startsWith("image/");
        const { error } = await supabase.from("session_items").insert({
          session_id: sessionId,
          item_type: isImage ? "image" : "file",
          file_url: fileUrl,
          file_name: file.name,
          file_size: file.size,
          position: items.length,
        });

        if (error) throw error;

        setUploadProgress(100);
        toast.success("File uploaded successfully!");
      } catch (error) {
        toast.error("Failed to upload file");
        console.error(error);
      } finally {
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 500);
      }
    },
    [sessionId, items.length]
  );

  const removeItem = useCallback(async (itemId: string) => {
    // Optimistically update UI immediately
    setItems((prev) => prev.filter((item) => item.id !== itemId));
    
    const { error } = await supabase
      .from("session_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      toast.error("Failed to remove item");
      // Revert optimistic update on error
      const { data } = await supabase
        .from("session_items")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      if (data) setItems(data as SessionItem[]);
    } else {
      toast.success("Item removed");
    }
  }, [sessionId]);

  const clearText = useCallback(async () => {
    if (!sessionId) return;

    const textItems = items.filter((item) => item.item_type === "text");
    
    if (textItems.length > 0) {
      const { error } = await supabase
        .from("session_items")
        .delete()
        .in("id", textItems.map(item => item.id));
      
      if (error) {
        toast.error("Failed to clear text");
      }
    }
  }, [sessionId, items]);

  return {
    isConnected,
    userCount,
    items,
    addTextItem,
    addFileItem,
    removeItem,
    clearText,
    uploadProgress,
    isUploading,
  };
};
