import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Shield, Activity, Database, Clock, Users } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface SessionStat {
  id: string;
  session_code: string;
  created_at: string;
  expires_at: string | null;
  is_public: boolean;
  unique_visitors: number;
  total_items: number;
  text_items: number;
  image_items: number;
  file_items: number;
  total_data_bytes: number;
  last_activity: string | null;
}

interface AnalyticsEvent {
  id: string;
  session_id: string;
  action: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  metadata: any;
}

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionStat[]>([]);
  const [recentActivity, setRecentActivity] = useState<AnalyticsEvent[]>([]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      // For now, use a simple token-based auth
      // In production, this should be replaced with proper authentication
      const adminToken = localStorage.getItem('admin_token');
      
      if (adminToken !== 'VARS_ADMIN_2024') {
        const token = prompt('Enter admin password:');
        if (token === 'VARS_ADMIN_2024') {
          localStorage.setItem('admin_token', token);
          setIsAdmin(true);
          fetchDashboardData();
        } else {
          toast.error('Access denied');
          navigate('/');
        }
      } else {
        setIsAdmin(true);
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      toast.error('Access denied');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch session stats
      const { data: statsData, error: statsError } = await supabase
        .from('session_stats')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (statsError) throw statsError;
      setSessions(statsData || []);

      // Fetch recent analytics
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('session_analytics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (analyticsError) throw analyticsError;
      setRecentActivity(analyticsData || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const totalSessions = sessions.length;
  const activeSessions = sessions.filter(s => !s.expires_at || new Date(s.expires_at) > new Date()).length;
  const totalVisitors = sessions.reduce((sum, s) => sum + Number(s.unique_visitors), 0);
  const totalData = sessions.reduce((sum, s) => sum + Number(s.total_data_bytes), 0);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">VarsClip Traffic Monitor</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSessions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{activeSessions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Visitors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalVisitors}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Data Shared</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatBytes(totalData)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Active Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 text-sm font-medium text-muted-foreground">Code</th>
                    <th className="text-left p-2 text-sm font-medium text-muted-foreground">Created</th>
                    <th className="text-left p-2 text-sm font-medium text-muted-foreground">Expires</th>
                    <th className="text-left p-2 text-sm font-medium text-muted-foreground">Type</th>
                    <th className="text-left p-2 text-sm font-medium text-muted-foreground">Visitors</th>
                    <th className="text-left p-2 text-sm font-medium text-muted-foreground">Items</th>
                    <th className="text-left p-2 text-sm font-medium text-muted-foreground">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <code className="text-sm font-mono">{session.session_code}</code>
                      </td>
                      <td className="p-2 text-sm">
                        {new Date(session.created_at).toLocaleString()}
                      </td>
                      <td className="p-2 text-sm">
                        {session.expires_at 
                          ? new Date(session.expires_at).toLocaleString()
                          : <Badge variant="secondary">Never</Badge>
                        }
                      </td>
                      <td className="p-2">
                        {session.is_public 
                          ? <Badge variant="outline">Public</Badge>
                          : <Badge>Protected</Badge>
                        }
                      </td>
                      <td className="p-2 text-sm">{session.unique_visitors}</td>
                      <td className="p-2 text-sm">{session.total_items}</td>
                      <td className="p-2 text-sm">{formatBytes(Number(session.total_data_bytes))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recentActivity.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{event.action}</Badge>
                      <span className="text-sm text-muted-foreground">{event.ip_address}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{event.user_agent}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(event.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
