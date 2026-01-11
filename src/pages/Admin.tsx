import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { 
  Shield, Activity, Database, Clock, Users, Trash2, Lock, Unlock, 
  FileText, Image, FileIcon, Search, Download, ArrowUpDown, ArrowUp, 
  ArrowDown, Eye, CalendarIcon, RefreshCw, ChevronLeft, ChevronRight 
} from "lucide-react";
import { format } from "date-fns";

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
  has_password?: boolean;
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

type SortField = 'session_code' | 'created_at' | 'expires_at' | 'unique_visitors' | 'total_data_bytes' | 'last_activity';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 10;

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminSecret, setAdminSecret] = useState<string>("");
  const [sessions, setSessions] = useState<SessionStat[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<SessionStat[]>([]);
  const [recentActivity, setRecentActivity] = useState<AnalyticsEvent[]>([]);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [deletingSession, setDeletingSession] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [securityFilter, setSecurityFilter] = useState<string>("all");
  
  // Date range filter
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  
  // Details view state
  const [selectedSession, setSelectedSession] = useState<SessionStat | null>(null);
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Password input dialog
  const [showPasswordDialog, setShowPasswordDialog] = useState(true);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  const handleAdminLogin = async () => {
    if (!passwordInput) {
      setAuthError("Please enter the admin password");
      return;
    }

    setLoading(true);
    setAuthError("");

    try {
      // Validate admin access via server-side Edge Function
      const { data, error } = await supabase.functions.invoke('get-admin-data', {
        body: { adminSecret: passwordInput }
      });

      if (error || !data) {
        setAuthError("Access denied - invalid admin credentials");
        setLoading(false);
        return;
      }

      // Store in session (not localStorage) - cleared when browser closes
      setAdminSecret(passwordInput);
      setIsAdmin(true);
      setShowPasswordDialog(false);
      
      // Set the fetched data
      setSessions(data.sessions || []);
      setRecentActivity(data.recentActivity || []);
      
    } catch (error) {
      console.error('Admin login error:', error);
      setAuthError("Access denied");
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = useCallback(async () => {
    if (!adminSecret) return;

    try {
      const { data, error } = await supabase.functions.invoke('get-admin-data', {
        body: { adminSecret }
      });

      if (error || !data) {
        toast.error('Failed to load dashboard data');
        if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
          setIsAdmin(false);
          setShowPasswordDialog(true);
          setAdminSecret("");
        }
        return;
      }

      setSessions(data.sessions || []);
      setRecentActivity(data.recentActivity || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    }
  }, [adminSecret]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...sessions];

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(s => 
        s.session_code.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(s => {
        const isExpired = s.expires_at && new Date(s.expires_at) < new Date();
        return statusFilter === "active" ? !isExpired : isExpired;
      });
    }

    // Apply security filter
    if (securityFilter !== "all") {
      filtered = filtered.filter(s => 
        securityFilter === "protected" ? s.has_password : !s.has_password
      );
    }

    // Apply date range filter
    if (startDate) {
      filtered = filtered.filter(s => new Date(s.created_at) >= startDate);
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(s => new Date(s.created_at) <= endOfDay);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (sortField === 'created_at' || sortField === 'expires_at' || sortField === 'last_activity') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    setFilteredSessions(filtered);
    setCurrentPage(1);
  }, [sessions, searchQuery, statusFilter, securityFilter, sortField, sortDirection, startDate, endDate]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredSessions.length / ITEMS_PER_PAGE);
  const paginatedSessions = filteredSessions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-50" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const viewSessionDetails = async (session: SessionStat) => {
    setSelectedSession(session);
    setShowDetailsDialog(true);
    
    // Session details are fetched via admin API to ensure authorization
    try {
      const { data: items, error: itemsError } = await supabase
        .from('session_items')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false });

      if (itemsError) throw itemsError;

      setSessionDetails({
        items: items || [],
        analytics: recentActivity.filter(a => a.session_id === session.id).slice(0, 20)
      });
    } catch (error) {
      console.error('Error fetching session details:', error);
      toast.error('Failed to load session details');
    }
  };

  const exportData = (format: 'csv' | 'json') => {
    try {
      if (format === 'json') {
        const dataStr = JSON.stringify(filteredSessions, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sessions-${new Date().toISOString()}.json`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        const headers = ['Code', 'Status', 'Security', 'Created', 'Expires', 'Visitors', 'Text Items', 'Images', 'Files', 'Data Size', 'Last Activity'];
        const rows = filteredSessions.map(s => [
          s.session_code,
          (!s.expires_at || new Date(s.expires_at) > new Date()) ? 'Active' : 'Expired',
          s.has_password ? 'Protected' : 'Public',
          new Date(s.created_at).toLocaleString(),
          s.expires_at ? new Date(s.expires_at).toLocaleString() : 'Never',
          s.unique_visitors,
          s.text_items,
          s.image_items,
          s.file_items,
          formatBytes(Number(s.total_data_bytes)),
          s.last_activity ? new Date(s.last_activity).toLocaleString() : 'None'
        ]);
        
        const csvContent = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        const dataBlob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sessions-${new Date().toISOString()}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }
      
      toast.success(`Exported ${filteredSessions.length} sessions as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  const handleDeleteSession = async (sessionCode: string) => {
    if (!confirm(`Are you sure you want to delete session "${sessionCode}"?`)) return;
    
    setDeletingSession(sessionCode);
    try {
      const { error } = await supabase.functions.invoke('cleanup-expired-session', {
        body: { sessionCode, forceDelete: true, isAdmin: true },
        headers: { 'x-admin-secret': adminSecret }
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

  const handleBulkDelete = async () => {
    if (selectedSessions.length === 0) return;
    if (!confirm(`Delete ${selectedSessions.length} selected session(s)?`)) return;

    setBulkDeleting(true);
    let deleted = 0;
    
    for (const sessionCode of selectedSessions) {
      try {
        await supabase.functions.invoke('cleanup-expired-session', {
          body: { sessionCode, forceDelete: true, isAdmin: true },
          headers: { 'x-admin-secret': adminSecret }
        });
        deleted++;
      } catch (error) {
        console.error(`Error deleting ${sessionCode}:`, error);
      }
    }
    
    setSelectedSessions([]);
    setBulkDeleting(false);
    toast.success(`Deleted ${deleted}/${selectedSessions.length} session(s)`);
    fetchDashboardData();
  };

  const handleBulkSelectAll = () => {
    if (selectedSessions.length === paginatedSessions.length) {
      setSelectedSessions([]);
    } else {
      setSelectedSessions(paginatedSessions.map(s => s.session_code));
    }
  };

  const handleSelectAllFiltered = () => {
    if (selectedSessions.length === filteredSessions.length) {
      setSelectedSessions([]);
    } else {
      setSelectedSessions(filteredSessions.map(s => s.session_code));
    }
  };

  const toggleSessionSelection = (sessionCode: string) => {
    setSelectedSessions(prev => 
      prev.includes(sessionCode) 
        ? prev.filter(s => s !== sessionCode)
        : [...prev, sessionCode]
    );
  };

  const clearDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  // Show password dialog if not authenticated
  if (showPasswordDialog) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-6 h-6" />
              Admin Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="admin-password" className="text-sm font-medium">
                Enter admin password
              </label>
              <Input
                id="admin-password"
                type="password"
                placeholder="Admin password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleAdminLogin()}
                disabled={loading}
              />
              {authError && (
                <p className="text-sm text-destructive">{authError}</p>
              )}
            </div>
            <Button 
              onClick={handleAdminLogin} 
              className="w-full gap-2"
              disabled={loading || !passwordInput}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Access Dashboard
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/')} 
              className="w-full"
              disabled={loading}
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const totalSessions = filteredSessions.length;
  const activeSessions = filteredSessions.filter(s => !s.expires_at || new Date(s.expires_at) > new Date()).length;
  const protectedSessions = filteredSessions.filter(s => s.has_password).length;
  const totalVisitors = filteredSessions.reduce((sum, s) => sum + Number(s.unique_visitors), 0);
  const totalData = filteredSessions.reduce((sum, s) => sum + Number(s.total_data_bytes), 0);

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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchDashboardData} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
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

        {/* Search, Filters & Date Range */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by session code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="expired">Expired Only</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={securityFilter} onValueChange={setSecurityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by security" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Security</SelectItem>
                  <SelectItem value="protected">Protected Only</SelectItem>
                  <SelectItem value="public">Public Only</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Range Filters */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 justify-start">
                    <CalendarIcon className="w-4 h-4" />
                    {startDate ? format(startDate, "MMM d") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 justify-start">
                    <CalendarIcon className="w-4 h-4" />
                    {endDate ? format(endDate, "MMM d") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {(startDate || endDate) && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Date filter active</span>
                <Button variant="ghost" size="sm" onClick={clearDateFilters}>
                  Clear dates
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sessions Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Sessions ({totalSessions})
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                {selectedSessions.length > 0 && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleSelectAllFiltered}
                      className="gap-2"
                    >
                      {selectedSessions.length === filteredSessions.length ? 'Deselect All' : `Select All ${filteredSessions.length}`}
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleBulkDelete}
                      disabled={bulkDeleting}
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      {bulkDeleting ? 'Deleting...' : `Delete ${selectedSessions.length}`}
                    </Button>
                  </>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportData('csv')}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  CSV
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportData('json')}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  JSON
                </Button>
              </div>
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
                        checked={selectedSessions.length === paginatedSessions.length && paginatedSessions.length > 0}
                        onChange={handleBulkSelectAll}
                        className="w-4 h-4 rounded border-border cursor-pointer"
                      />
                    </th>
                    <th 
                      className="text-left p-2 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => handleSort('session_code')}
                    >
                      <div className="flex items-center gap-1">
                        Code <SortIcon field="session_code" />
                      </div>
                    </th>
                    <th className="text-left p-2 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-2 text-sm font-medium text-muted-foreground">Security</th>
                    <th 
                      className="text-left p-2 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center gap-1">
                        Created <SortIcon field="created_at" />
                      </div>
                    </th>
                    <th 
                      className="text-left p-2 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => handleSort('expires_at')}
                    >
                      <div className="flex items-center gap-1">
                        Expires <SortIcon field="expires_at" />
                      </div>
                    </th>
                    <th 
                      className="text-left p-2 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => handleSort('last_activity')}
                    >
                      <div className="flex items-center gap-1">
                        Activity <SortIcon field="last_activity" />
                      </div>
                    </th>
                    <th className="text-left p-2 text-sm font-medium text-muted-foreground">Content</th>
                    <th 
                      className="text-left p-2 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => handleSort('unique_visitors')}
                    >
                      <div className="flex items-center gap-1">
                        Visitors <SortIcon field="unique_visitors" />
                      </div>
                    </th>
                    <th 
                      className="text-left p-2 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => handleSort('total_data_bytes')}
                    >
                      <div className="flex items-center gap-1">
                        Data Size <SortIcon field="total_data_bytes" />
                      </div>
                    </th>
                    <th className="text-left p-2 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSessions.map((session) => {
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
                          <button
                            onClick={() => viewSessionDetails(session)}
                            className="text-sm font-mono font-bold hover:text-primary cursor-pointer flex items-center gap-1"
                          >
                            {session.session_code}
                            <Eye className="w-3 h-3" />
                          </button>
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
                                  Protected
                                </Badge>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-4 h-4 text-green-500" />
                                <Badge variant="outline" className="border-green-500 text-green-500">
                                  Public
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredSessions.length)} of {filteredSessions.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8"
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
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
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentActivity.slice(0, 20).map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      event.action.includes('create') ? 'bg-green-500' :
                      event.action.includes('delete') ? 'bg-red-500' :
                      event.action.includes('view') ? 'bg-blue-500' :
                      'bg-yellow-500'
                    }`} />
                    <div>
                      <span className="text-sm font-medium">{event.action}</span>
                      <div className="text-xs text-muted-foreground">
                        {event.ip_address ? `IP: ${event.ip_address.substring(0, 15)}...` : 'Unknown IP'}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(event.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Session Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Session Details: {selectedSession?.session_code}
              </DialogTitle>
            </DialogHeader>
            
            {selectedSession && sessionDetails && (
              <div className="space-y-6">
                {/* Session Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Status</span>
                    <div>
                      {(!selectedSession.expires_at || new Date(selectedSession.expires_at) > new Date()) ? (
                        <Badge className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="destructive">Expired</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Security</span>
                    <div>
                      {selectedSession.has_password ? (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-500">Protected</Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-500 text-green-500">Public</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Created</span>
                    <div className="text-sm">{new Date(selectedSession.created_at).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Expires</span>
                    <div className="text-sm">
                      {selectedSession.expires_at 
                        ? new Date(selectedSession.expires_at).toLocaleString() 
                        : 'Never'}
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h4 className="font-medium mb-2">Session Items ({sessionDetails.items.length})</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {sessionDetails.items.map((item: any) => (
                      <div key={item.id} className="p-2 rounded bg-muted/50 text-sm">
                        <div className="flex items-center gap-2">
                          {item.item_type === 'text' && <FileText className="w-4 h-4" />}
                          {item.item_type === 'image' && <Image className="w-4 h-4" />}
                          {item.item_type === 'file' && <FileIcon className="w-4 h-4" />}
                          <span className="font-medium capitalize">{item.item_type}</span>
                          {item.file_name && <span className="text-muted-foreground">- {item.file_name}</span>}
                        </div>
                        {item.content && (
                          <div className="mt-1 text-xs text-muted-foreground truncate">
                            {item.content.substring(0, 100)}...
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Analytics */}
                <div>
                  <h4 className="font-medium mb-2">Recent Activity</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {sessionDetails.analytics.map((event: any) => (
                      <div key={event.id} className="p-2 rounded bg-muted/50 text-sm flex justify-between">
                        <span>{event.action}</span>
                        <span className="text-muted-foreground">{new Date(event.created_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Admin;
