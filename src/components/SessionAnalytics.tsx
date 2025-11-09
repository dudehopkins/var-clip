import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Users, Type, Image, File, HardDrive } from "lucide-react";

interface SessionAnalyticsProps {
  sessionCode: string;
}

interface AnalyticsData {
  unique_visitors: number;
  total_items: number;
  characters: number;
  words: number;
  image_items: number;
  file_items: number;
  total_data_bytes: number;
}

export const SessionAnalytics = ({ sessionCode }: SessionAnalyticsProps) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const { data: session } = await supabase
        .from("sessions")
        .select("id")
        .eq("session_code", sessionCode)
        .single();

      if (!session) return;

      // Get session items directly for realtime data
      const { data: items } = await supabase
        .from("session_items")
        .select("*")
        .eq("session_id", session.id);

      // Get analytics stats
      const { data: stats } = await supabase
        .from("session_stats")
        .select("*")
        .eq("id", session.id)
        .single();

      if (items) {
        // Calculate text statistics
        const textItems = items.filter(item => item.item_type === 'text');
        const allText = textItems.map(item => item.content || '').join(' ');
        const characters = allText.length;
        const words = allText.trim() ? allText.trim().split(/\s+/).length : 0;

        // Count image and file items
        const imageItems = items.filter(item => item.item_type === 'image').length;
        const fileItems = items.filter(item => item.item_type === 'file').length;

        // Calculate total data bytes
        const totalDataBytes = items.reduce((sum, item) => sum + (Number(item.file_size) || 0), 0);

        setAnalytics({
          unique_visitors: Number(stats?.unique_visitors || 0),
          total_items: items.length,
          characters,
          words,
          image_items: imageItems,
          file_items: fileItems,
          total_data_bytes: totalDataBytes,
        });
      }
    };

    fetchAnalytics();

    // Subscribe to real-time updates on session_items
    const channel = supabase
      .channel('session-analytics-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_items'
        },
        () => fetchAnalytics()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_analytics'
        },
        () => fetchAnalytics()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionCode]);

  if (!analytics) return null;

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
              <div className="text-lg font-bold">{analytics.unique_visitors}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            <Type className="w-4 h-4 text-blue-500" />
            <div>
              <div className="text-xs text-muted-foreground">Characters</div>
              <div className="text-lg font-bold">{analytics.characters.toLocaleString()}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            <Type className="w-4 h-4 text-blue-500" />
            <div>
              <div className="text-xs text-muted-foreground">Words</div>
              <div className="text-lg font-bold">{analytics.words.toLocaleString()}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            <Image className="w-4 h-4 text-green-500" />
            <div>
              <div className="text-xs text-muted-foreground">Images</div>
              <div className="text-lg font-bold">{analytics.image_items}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            <File className="w-4 h-4 text-orange-500" />
            <div>
              <div className="text-xs text-muted-foreground">Files</div>
              <div className="text-lg font-bold">{analytics.file_items}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
          <HardDrive className="w-4 h-4 text-purple-500" />
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Total Data Shared</div>
            <div className="text-lg font-bold">{formatBytes(analytics.total_data_bytes)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
