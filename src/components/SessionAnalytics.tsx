import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Users, Type, Image, File, HardDrive } from "lucide-react";

interface SessionItem {
  id: string;
  item_type: string;
  content?: string | null;
  file_size?: number | null;
  file_name?: string | null;
  file_url?: string | null;
}

interface SessionAnalyticsProps {
  sessionCode: string;
  items?: SessionItem[];
  textContent?: string;
}

export const SessionAnalytics = ({ sessionCode, items = [], textContent = "" }: SessionAnalyticsProps) => {
  const [uniqueVisitors, setUniqueVisitors] = useState(0);

  // Calculate analytics directly from props for instant updates
  const characters = textContent.length;
  const words = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
  const imageItems = items.filter(item => item.item_type === 'image').length;
  const fileItems = items.filter(item => item.item_type === 'file').length;
  const totalDataBytes = items.reduce((sum, item) => sum + (Number(item.file_size) || 0), 0);

  useEffect(() => {
    const fetchVisitors = async () => {
      const { data: session } = await supabase
        .from("sessions")
        .select("id")
        .eq("session_code", sessionCode)
        .single();

      if (!session) return;

      const { data: stats } = await supabase
        .from("session_stats")
        .select("unique_visitors")
        .eq("id", session.id)
        .single();

      if (stats) {
        setUniqueVisitors(Number(stats.unique_visitors || 0));
      }
    };

    fetchVisitors();

    // Subscribe to analytics changes for visitor count updates
    const channel = supabase
      .channel(`analytics-${sessionCode}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_analytics'
        },
        () => fetchVisitors()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionCode]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Session Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            <Users className="w-4 h-4 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Visitors</div>
              <div className="text-lg font-bold">{uniqueVisitors}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            <Type className="w-4 h-4 text-blue-500" />
            <div>
              <div className="text-xs text-muted-foreground">Characters</div>
              <div className="text-lg font-bold">{characters.toLocaleString()}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            <Type className="w-4 h-4 text-blue-500" />
            <div>
              <div className="text-xs text-muted-foreground">Words</div>
              <div className="text-lg font-bold">{words.toLocaleString()}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            <Image className="w-4 h-4 text-green-500" />
            <div>
              <div className="text-xs text-muted-foreground">Images</div>
              <div className="text-lg font-bold">{imageItems}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            <File className="w-4 h-4 text-orange-500" />
            <div>
              <div className="text-xs text-muted-foreground">Files</div>
              <div className="text-lg font-bold">{fileItems}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
          <HardDrive className="w-4 h-4 text-purple-500" />
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Total Data Shared</div>
            <div className="text-lg font-bold">{formatBytes(totalDataBytes)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
