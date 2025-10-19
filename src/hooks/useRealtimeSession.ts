import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";

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

export const useRealtimeSession = (sessionCode: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [userCount, setUserCount] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [items, setItems] = useState<SessionItem[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Initialize or join session
  useEffect(() => {
    const initSession = async () => {
      // Check if session exists
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
      } else {
        // Create new session
        const { data: newSession, error } = await supabase
          .from("sessions")
          .insert({ session_code: sessionCode })
          .select("id")
          .single();

        if (error) {
          toast.error("Failed to create session");
          return;
        }

        setSessionId(newSession.id);
      }
    };

    initSession();
  }, [sessionCode]);

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

      const { error } = await supabase.from("session_items").insert({
        session_id: sessionId,
        item_type: "text",
        content,
        position: items.length,
      });

      if (error) {
        toast.error("Failed to save text");
      }
    },
    [sessionId, items.length]
  );

  const addFileItem = useCallback(
    async (file: File) => {
      if (!sessionId) return;

      try {
        // Upload file to Supabase Storage
        const fileExt = file.name.split(".").pop();
        const fileName = `${sessionId}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("session-files")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("session-files")
          .getPublicUrl(fileName);

        // Save to database
        const isImage = file.type.startsWith("image/");
        const { error } = await supabase.from("session_items").insert({
          session_id: sessionId,
          item_type: isImage ? "image" : "file",
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          position: items.length,
        });

        if (error) throw error;

        toast.success("File uploaded successfully!");
      } catch (error) {
        toast.error("Failed to upload file");
        console.error(error);
      }
    },
    [sessionId, items.length]
  );

  const removeItem = useCallback(async (itemId: string) => {
    const { error } = await supabase
      .from("session_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      toast.error("Failed to remove item");
    } else {
      toast.success("Item removed");
    }
  }, []);

  const clearText = useCallback(async () => {
    if (!sessionId) return;

    const textItems = items.filter((item) => item.item_type === "text");
    
    for (const item of textItems) {
      await supabase
        .from("session_items")
        .delete()
        .eq("id", item.id);
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
  };
};
