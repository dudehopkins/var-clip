import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Shield, Activity, Database, Clock, Users, Trash2, Lock, Unlock, FileText, Image, FileIcon } from "lucide-react";
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
  has_password?: boolean; // Indicator if session has password protection
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
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [deletingSession, setDeletingSession] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      // For now, use a simple token-based auth
      // In production, this should be replaced with proper authentication
      const adminToken = localStorage.getItem('admin_token');
      
      if (adminToken !== 'admin@clip4all2002') {
        const token = prompt('Enter admin password:');
        if (token === 'admin@clip4all2002') {
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
      // Fetch sessions directly to check for password protection
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (sessionsError) throw sessionsError;

      // Fetch session stats and merge with password info
      const { data: statsData, error: statsError } = await supabase
        .from('session_stats')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (statsError) throw statsError;
      
      // Merge password info with stats
      const mergedData = (statsData || []).map(stat => {
        const session = sessionsData?.find(s => s.id === stat.id);
        return {
          ...stat,
          has_password: session?.password_hash != null
        };
      });
      
      setSessions(mergedData);

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

  const handleDeleteSession = async (sessionCode: string) => {
    if (!confirm(`Are you sure you want to delete session "${sessionCode}"?`)) return;
    
    setDeletingSession(sessionCode);
    try {
      const { error } = await supabase.functions.invoke('cleanup-expired-session', {
        body: { sessionCode, forceDelete: true }
      });

      if (error) throw error;
      toast.success('Session deleted successfully');
      fetchDashboardData();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    } finally {
      setDeletingSession(null);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedSessions.length === 0) return;
    if (!confirm(`Delete ${selectedSessions.length} selected session(s)?`)) return;

    for (const sessionCode of selectedSessions) {
      try {
        await supabase.functions.invoke('cleanup-expired-session', {
          body: { sessionCode, forceDelete: true }
        });
      } catch (error) {
        console.error(`Error deleting ${sessionCode}:`, error);
      }
    }
    
    setSelectedSessions([]);
    toast.success(`Deleted ${selectedSessions.length} session(s)`);
    fetchDashboardData();
  };

  const toggleSessionSelection = (sessionCode: string) => {
    setSelectedSessions(prev => 
      prev.includes(sessionCode) 
        ? prev.filter(s => s !== sessionCode)
        : [...prev, sessionCode]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSessions.length === sessions.length) {
      setSelectedSessions([]);
    } else {
      setSelectedSessions(sessions.map(s => s.session_code));
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
  const protectedSessions = sessions.filter(s => s.has_password).length;
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Database className="w-4 h-4" />
                Total Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSessions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Active Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{activeSessions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Protected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{protectedSessions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Visitors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalVisitors}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Database className="w-4 h-4" />
                Data Shared
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatBytes(totalData)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Sessions Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Active Sessions
              </CardTitle>
              {selectedSessions.length > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleDeleteSelected}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete {selectedSessions.length} Selected
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">
                      <input
                        type="checkbox"
                        checked={selectedSessions.length === sessions.length && sessions.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-border cursor-pointer"
                      />
                    </th>
                    <th className="text-left p-2 text-sm font-medium text-muted-foreground">Code</th>
                    <th className="text-left p-2 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-2 text-sm font-medium text-muted-foreground">Security</th>
                    <th className="text-left p-2 text-sm font-medium text-muted-foreground">Created</th>
                    <th className="text-left p-2 text-sm font-medium text-muted-foreground">Expires</th>
                    <th className="text-left p-2 text-sm font-medium text-muted-foreground">Activity</th>
                    <th className="text-left p-2 text-sm font-medium text-muted-foreground">Content</th>
                    <th className="text-left p-2 text-sm font-medium text-muted-foreground">Visitors</th>
                    <th className="text-left p-2 text-sm font-medium text-muted-foreground">Data Size</th>
                    <th className="text-left p-2 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => {
                    const isExpired = session.expires_at && new Date(session.expires_at) < new Date();
                    const isActive = !isExpired;
                    
                    return (
                      <tr key={session.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={selectedSessions.includes(session.session_code)}
                            onChange={() => toggleSessionSelection(session.session_code)}
                            className="w-4 h-4 rounded border-border cursor-pointer"
                          />
                        </td>
                        <td className="p-2">
                          <code className="text-sm font-mono font-bold">{session.session_code}</code>
                        </td>
                        <td className="p-2">
                          {isActive ? (
                            <Badge variant="default" className="bg-green-500">Active</Badge>
                          ) : (
                            <Badge variant="destructive">Expired</Badge>
                          )}
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {session.has_password ? (
                              <>
                                <Lock className="w-4 h-4 text-yellow-500" />
                                <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                                  Password Protected
                                </Badge>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-4 h-4 text-green-500" />
                                <Badge variant="outline" className="border-green-500 text-green-500">
                                  Public Access
                                </Badge>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-sm text-muted-foreground">
                          {new Date(session.created_at).toLocaleDateString()}
                          <br />
                          <span className="text-xs">{new Date(session.created_at).toLocaleTimeString()}</span>
                        </td>
                        <td className="p-2 text-sm">
                          {session.expires_at ? (
                            <div>
                              {new Date(session.expires_at).toLocaleDateString()}
                              <br />
                              <span className="text-xs text-muted-foreground">
                                {new Date(session.expires_at).toLocaleTimeString()}
                              </span>
                            </div>
                          ) : (
                            <Badge variant="secondary">No Expiration</Badge>
                          )}
                        </td>
                        <td className="p-2 text-sm">
                          {session.last_activity ? (
                            <div className="text-muted-foreground">
                              {new Date(session.last_activity).toLocaleDateString()}
                              <br />
                              <span className="text-xs">
                                {new Date(session.last_activity).toLocaleTimeString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No activity</span>
                          )}
                        </td>
                        <td className="p-2">
                          <div className="flex flex-col gap-1 text-xs">
                            <div className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              <span>{session.text_items} text</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Image className="w-3 h-3" />
                              <span>{session.image_items} images</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FileIcon className="w-3 h-3" />
                              <span>{session.file_items} files</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-2 text-sm font-medium">{session.unique_visitors}</td>
                        <td className="p-2 text-sm font-mono">
                          {formatBytes(Number(session.total_data_bytes))}
                        </td>
                        <td className="p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSession(session.session_code)}
                            disabled={deletingSession === session.session_code}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {deletingSession === session.session_code ? (
                              <span className="text-xs">Deleting...</span>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
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
