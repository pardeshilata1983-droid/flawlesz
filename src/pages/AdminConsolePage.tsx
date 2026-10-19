import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { getStoredToken } from '../services/api.ts';
import {
  Users,
  Shield,
  Activity,
  Layers,
  FileText,
  Search,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Unlock,
  RefreshCw,
  Clock,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Zap,
  Globe,
  BarChart2,
  CreditCard,
  Terminal,
  Key,
  Trash2
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

interface AdminConsolePageProps {
  onNavigate: (path: string) => void;
}

export const AdminConsolePage: React.FC<AdminConsolePageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'users' | 'activity' | 'mcp' | 'access' | 'audit'>('overview');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [stats, setStats] = useState<any>(null);
  const [revenueStats, setRevenueStats] = useState<any>(null);
  const [razorpayDiagnostics, setRazorpayDiagnostics] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [adminTokens, setAdminTokens] = useState<any[]>([]);
  const [tokenFilter, setTokenFilter] = useState<'all' | 'active' | 'revoked'>('all');
  const [revokingTokenId, setRevokingTokenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Revenue payment filter
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');

  // User search & filters
  const [userSearch, setUserSearch] = useState('');
  const [userPlanFilter, setUserPlanFilter] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState<any>(null);

  // Ban Modal
  const [banModalUser, setBanModalUser] = useState<any>(null);
  const [banReason, setBanReason] = useState('');

  // Grant Enterprise Modal
  const [grantModalUser, setGrantModalUser] = useState<any>(null);
  const [grantUnlimited, setGrantUnlimited] = useState(true);
  const [grantExpires, setGrantExpires] = useState('');

  // Live activity polling
  const [liveDot, setLiveDot] = useState(true);

  const fetchAdminData = async () => {
    try {
      const token = getStoredToken();
      if (!token) throw new Error('Authentication token missing.');

      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, revenueRes, diagRes, usersRes, auditRes, eventsRes, tokensRes] = await Promise.all([
        fetch(`/api/admin/stats?range=${dateRange}`, { headers }),
        fetch(`/api/admin/revenue?range=${dateRange}`, { headers }),
        fetch('/api/admin/razorpay/diagnostics', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/audit-logs', { headers }),
        fetch('/api/admin/events', { headers }),
        fetch('/api/admin/tokens', { headers }).catch(() => ({ ok: false, json: async () => ({ tokens: [] }) } as any))
      ]);

      if (statsRes.status === 404 || usersRes.status === 404) {
        setError('404 Not Found');
        setLoading(false);
        return;
      }

      const statsData = await statsRes.json();
      const revenueData = revenueRes.ok ? await revenueRes.json() : null;
      const diagData = diagRes.ok ? await diagRes.json() : null;
      const usersData = await usersRes.json();
      const auditData = await auditRes.json();
      const eventsData = await eventsRes.json();
      const tokensData = tokensRes.ok ? await tokensRes.json() : { tokens: [] };

      setStats(statsData);
      setRevenueStats(revenueData);
      setRazorpayDiagnostics(diagData);
      setUsersList(usersData.users || []);
      setAuditLogs(auditData.logs || []);
      setEventsList(eventsData.events || []);
      setAdminTokens(tokensData.tokens || []);
      setLoading(false);
    } catch (err: any) {
      console.error('[ADMIN] Error fetching console data:', err);
      setError(err.message || 'Failed to load console');
      setLoading(false);
    }
  };

  const handleAdminRevokeToken = async (tokenId: string) => {
    if (!confirm('Are you sure you want to revoke this Personal Access Token? The user AI client will immediately lose MCP access.')) {
      return;
    }
    setRevokingTokenId(tokenId);
    try {
      const token = getStoredToken();
      const res = await fetch(`/api/admin/tokens/${tokenId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchAdminData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to revoke token');
      }
    } catch (err: any) {
      alert(err.message || 'Error revoking token');
    } finally {
      setRevokingTokenId(null);
    }
  };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(() => {
      fetchAdminData();
      setLiveDot(prev => !prev);
    }, 4000);
    return () => clearInterval(interval);
  }, [dateRange]);

  const handleFetchUserDetail = async (id: string) => {
    setSelectedUserId(id);
    try {
      const token = getStoredToken();
      const res = await fetch(`/api/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSelectedUserDetail(data);
    } catch (err) {
      console.error('Failed to fetch user detail:', err);
    }
  };

  const handleBanSubmit = async () => {
    if (!banModalUser) return;
    try {
      const token = getStoredToken();
      const res = await fetch(`/api/admin/users/${banModalUser.id}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          banned: !banModalUser.banned,
          reason: banReason
        })
      });
      if (res.ok) {
        setBanModalUser(null);
        setBanReason('');
        fetchAdminData();
        if (selectedUserId === banModalUser.id) {
          handleFetchUserDetail(banModalUser.id);
        }
      }
    } catch (err) {
      console.error('Ban action failed:', err);
    }
  };

  const handleGrantEnterprise = async () => {
    if (!grantModalUser) return;
    try {
      const token = getStoredToken();
      const res = await fetch(`/api/admin/users/${grantModalUser.id}/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          unlimited: grantUnlimited,
          pulsarLimit: 999,
          quasarLimit: 999,
          expiresAt: grantExpires || null
        })
      });
      if (res.ok) {
        setGrantModalUser(null);
        setGrantExpires('');
        fetchAdminData();
        if (selectedUserId === grantModalUser.id) {
          handleFetchUserDetail(grantModalUser.id);
        }
      }
    } catch (err) {
      console.error('Grant enterprise action failed:', err);
    }
  };

  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      const matchesSearch = u.email.toLowerCase().includes(userSearch.toLowerCase()) || (u.name && u.name.toLowerCase().includes(userSearch.toLowerCase()));
      const matchesPlan = userPlanFilter === 'all' || u.plan === userPlanFilter;
      return matchesSearch && matchesPlan;
    });
  }, [usersList, userSearch, userPlanFilter]);

  if (error === '404 Not Found') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-6xl font-black font-mono text-[#111111] mb-4">404</h1>
        <p className="text-lg text-[#5A5A5A] mb-6 font-mono">The page you are looking for does not exist.</p>
        <button
          onClick={() => onNavigate('/flaw')}
          className="px-6 py-3 bg-[#E8481C] text-white font-medium rounded-xl hover:bg-[#d63f15] transition-colors cursor-pointer font-mono"
        >
          Return to Overview
        </button>
      </div>
    );
  }

  if (loading && !stats) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center font-mono text-sm text-[#7A7A7A]">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-[#E8481C]" />
        Loading Admin Console...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F4F0] text-[#111111] flex flex-col md:flex-row font-mono">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#EFECE6] border-r border-[#E0DEDA] p-4 sm:p-6 flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#E8481C] flex items-center justify-center text-white font-bold">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight">Flawlesz AI Console</h1>
              <p className="text-[10px] text-[#7A7A7A]">Secure Server Admin</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'overview' ? 'bg-[#E8481C] text-white shadow-sm' : 'text-[#5A5A5A] hover:bg-[#E2DDD5] hover:text-[#111111]'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>Overview & Charts</span>
            </button>
            <button
              onClick={() => setActiveTab('revenue')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'revenue' ? 'bg-[#E8481C] text-white shadow-sm' : 'text-[#5A5A5A] hover:bg-[#E2DDD5] hover:text-[#111111]'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Revenue & Billing</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'users' ? 'bg-[#E8481C] text-white shadow-sm' : 'text-[#5A5A5A] hover:bg-[#E2DDD5] hover:text-[#111111]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>User Table</span>
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'activity' ? 'bg-[#E8481C] text-white shadow-sm' : 'text-[#5A5A5A] hover:bg-[#E2DDD5] hover:text-[#111111]'
              }`}
            >
              <Activity className="w-4 h-4" />
              <div className="flex items-center justify-between flex-1">
                <span className={activeTab === 'activity' ? '' : 'shimmer-text'}>Live Activity</span>
                <span className={`w-2 h-2 rounded-full ${liveDot ? 'bg-emerald-500' : 'bg-emerald-300'} animate-pulse`} />
              </div>
            </button>
            <button
              onClick={() => setActiveTab('mcp')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'mcp' ? 'bg-[#E8481C] text-white shadow-sm' : 'text-[#5A5A5A] hover:bg-[#E2DDD5] hover:text-[#111111]'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <div className="flex items-center justify-between flex-1">
                <span>MCP Tokens</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/10">
                  {adminTokens.filter(t => !t.revokedAt).length}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('access')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'access' ? 'bg-[#E8481C] text-white shadow-sm' : 'text-[#5A5A5A] hover:bg-[#E2DDD5] hover:text-[#111111]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Access Control</span>
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'audit' ? 'bg-[#E8481C] text-white shadow-sm' : 'text-[#5A5A5A] hover:bg-[#E2DDD5] hover:text-[#111111]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Audit Log</span>
            </button>
          </nav>
        </div>

        <div className="pt-6 border-t border-[#E0DEDA] text-[11px] text-[#7A7A7A]">
          <p className="font-semibold text-[#111111] truncate">{user?.email}</p>
          <p className="text-[10px] text-emerald-600 font-mono mt-0.5">● Server Verified Admin</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-[#E0DEDA] px-4 sm:px-8 flex items-center justify-between bg-white/60 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#111111]">
              {activeTab === 'overview' && 'Dashboard Overview'}
              {activeTab === 'revenue' && 'Revenue & Subscription Analytics'}
              {activeTab === 'users' && 'User Management & Accounts'}
              {activeTab === 'activity' && 'Real-Time Activity Feed'}
              {activeTab === 'mcp' && 'Personal Access Tokens (MCP)'}
              {activeTab === 'access' && 'Enterprise Access Grants'}
              {activeTab === 'audit' && 'Admin Audit Log'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {(activeTab === 'overview' || activeTab === 'revenue') && (
              <div className="flex items-center bg-[#EFECE6] p-1 rounded-xl border border-[#E0DEDA] text-xs">
                {(['7d', '30d', '90d', 'all'] as const).map(range => (
                  <button
                    key={range}
                    onClick={() => setDateRange(range)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                      dateRange === range ? 'bg-white text-[#111111] shadow-xs' : 'text-[#7A7A7A] hover:text-[#111111]'
                    }`}
                  >
                    {range.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => fetchAdminData()}
              className="p-2 rounded-xl bg-white border border-[#E0DEDA] text-[#7A7A7A] hover:text-[#111111] transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Tab Content */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          {activeTab === 'overview' && stats && (
            <div className="space-y-8">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[#7A7A7A] text-xs">
                    <span>Total Users</span>
                    <Users className="w-4 h-4 text-[#E8481C]" />
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-3xl font-black text-[#111111]">{stats.summary.totalUsers}</span>
                    <span className="text-xs text-emerald-600 font-medium">+{stats.summary.newUsers7d} this week</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[#7A7A7A] text-xs">
                    <span>Checks Today</span>
                    <Zap className="w-4 h-4 text-[#E8481C]" />
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-3xl font-black text-[#111111]">{stats.summary.checksToday}</span>
                    <span className="text-xs text-[#7A7A7A]">Validations</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[#7A7A7A] text-xs">
                    <span>Active Users (7d)</span>
                    <Activity className="w-4 h-4 text-[#E8481C]" />
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-3xl font-black text-[#111111]">{stats.summary.activeUsers7d}</span>
                    <span className="text-xs text-[#7A7A7A]">Engaged</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[#7A7A7A] text-xs">
                    <span>Paid Users</span>
                    <TrendingUp className="w-4 h-4 text-[#E8481C]" />
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-3xl font-black text-[#111111]">{stats.summary.paidUsers}</span>
                    <span className="text-xs text-[#7A7A7A]">Pro / Ultra / Ent</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs flex flex-col justify-between sm:col-span-2">
                  <div className="flex items-center justify-between text-[#7A7A7A] text-xs">
                    <span>Estimated Monthly Revenue (MRR)</span>
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-3xl font-black text-emerald-600">${stats.summary.mrr}</span>
                    <span className="text-xs text-[#7A7A7A]">Recurring subscriptions</span>
                  </div>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sign-ups Over Time */}
                <div className="p-6 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-4">Sign-ups Over Time</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.signupsOverTime}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E0DEDA" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#7A7A7A' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#7A7A7A' }} allowDecimals={false} />
                        <Tooltip contentStyle={{ background: '#111111', color: '#fff', borderRadius: 8, fontSize: 12 }} />
                        <Area type="monotone" dataKey="count" stroke="#E8481C" fill="#E8481C" fillOpacity={0.15} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Model Usage Donut */}
                <div className="p-6 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-4">Model Usage (Orbit vs Pulsar vs Quasar)</h3>
                  <div className="h-64 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.modelUsageData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={50}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {stats.modelUsageData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#111111', color: '#fff', borderRadius: 8, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Users by Plan Bar Chart */}
                <div className="p-6 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-4">Users by Subscription Plan</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.usersByPlanData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#E0DEDA" />
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#7A7A7A' }} allowDecimals={false} />
                        <YAxis dataKey="plan" type="category" tick={{ fontSize: 10, fill: '#111111' }} width={80} />
                        <Tooltip contentStyle={{ background: '#111111', color: '#fff', borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="count" fill="#E8481C" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Conversion Funnel */}
                <div className="p-6 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-4">Conversion Funnel</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.conversionFunnel}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E0DEDA" />
                        <XAxis dataKey="stage" tick={{ fontSize: 10, fill: '#7A7A7A' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#7A7A7A' }} allowDecimals={false} />
                        <Tooltip contentStyle={{ background: '#111111', color: '#fff', borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="count" fill="#4A5568" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Activity Heatmap Grid */}
              <div className="p-6 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-2">Activity Heatmap (Day of Week vs Hour)</h3>
                <p className="text-[11px] text-[#7A7A7A] mb-4">Darker cells indicate higher validation volume.</p>
                <div className="overflow-x-auto">
                  <div className="min-w-[600px]">
                    <div className="grid grid-cols-25 gap-1 text-[10px] text-[#7A7A7A] mb-1">
                      <div>Day</div>
                      {Array.from({ length: 24 }).map((_, h) => (
                        <div key={h} className="text-center">{h}h</div>
                      ))}
                    </div>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, dayIdx) => (
                      <div key={dayName} className="grid grid-cols-25 gap-1 items-center mb-1">
                        <div className="text-[11px] font-bold">{dayName}</div>
                        {stats.heatmap[dayIdx]?.map((val: number, hourIdx: number) => {
                          const bg = val === 0 ? 'bg-[#F5F4F0]' : val < 3 ? 'bg-orange-200' : val < 7 ? 'bg-orange-400' : 'bg-[#E8481C] text-white';
                          return (
                            <div
                              key={hourIdx}
                              className={`h-6 rounded-xs flex items-center justify-center text-[9px] ${bg} border border-[#E0DEDA]/50`}
                              title={`${dayName} ${hourIdx}:00 - ${val} checks`}
                            >
                              {val > 0 ? val : ''}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Leaderboard & Trial Usage */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-4">Top Users Leaderboard (This Week)</h3>
                  <div className="space-y-3">
                    {stats.topUsersLeaderboard.map((tu: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-[#F5F4F0] border border-[#E0DEDA]">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-[#E8481C] text-white text-xs flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-bold truncate max-w-[180px] sm:max-w-[240px]">{tu.email}</p>
                            <p className="text-[10px] uppercase text-[#7A7A7A]">Plan: {tu.plan}</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-[#E8481C]">{tu.checks} validations</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-4">Trial Usage (Free Plan Users)</h3>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-[#F5F4F0] border border-[#E0DEDA]">
                      <div className="flex justify-between text-xs mb-2">
                        <span>Pulsar Lifetime Trial Used</span>
                        <span className="font-bold">{stats.trialUsage.pulsarTrialsUsed} / {stats.trialUsage.totalFree} users</span>
                      </div>
                      <div className="w-full bg-[#E0DEDA] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#E8481C] h-full"
                          style={{
                            width: `${stats.trialUsage.totalFree > 0 ? (stats.trialUsage.pulsarTrialsUsed / stats.trialUsage.totalFree) * 100 : 0}%`
                          }}
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#F5F4F0] border border-[#E0DEDA]">
                      <div className="flex justify-between text-xs mb-2">
                        <span>Quasar Lifetime Trial Used</span>
                        <span className="font-bold">{stats.trialUsage.quasarTrialsUsed} / {stats.trialUsage.totalFree} users</span>
                      </div>
                      <div className="w-full bg-[#E0DEDA] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#4A5568] h-full"
                          style={{
                            width: `${stats.trialUsage.totalFree > 0 ? (stats.trialUsage.quasarTrialsUsed / stats.trialUsage.totalFree) * 100 : 0}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'revenue' && (
            <div className="space-y-8">
              {/* Razorpay Gateway Diagnostics Strip */}
              {razorpayDiagnostics && (
                <div className="p-4 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#111111] text-white flex items-center justify-center font-bold">
                      <Shield className="w-4 h-4 text-[#E8481C]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#111111]">Razorpay Gateway State:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          razorpayDiagnostics.keyMode === 'live' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {razorpayDiagnostics.keyMode.toUpperCase()} MODE ({razorpayDiagnostics.keyPrefix})
                        </span>
                      </div>
                      <p className="text-[11px] text-[#7A7A7A] mt-0.5">
                        Pro Plan: <span className="font-mono">{razorpayDiagnostics.proPlan?.planIdPrefix}</span> ({razorpayDiagnostics.proPlan?.verifiedWithGateway ? 'Verified ✓' : 'Auto-Provisioned'}) • 
                        Ultra Plan: <span className="font-mono">{razorpayDiagnostics.ultraPlan?.planIdPrefix}</span> ({razorpayDiagnostics.ultraPlan?.verifiedWithGateway ? 'Verified ✓' : 'Auto-Provisioned'}) • 
                        Webhook: <span className="font-mono">{razorpayDiagnostics.webhookSecretConfigured ? 'Active ✓' : 'Dev bypass'}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => fetchAdminData()}
                    className="px-3 py-1.5 rounded-lg border border-[#E0DEDA] bg-[#F5F4F0] hover:bg-[#EAE8E2] transition-colors text-[11px] font-mono cursor-pointer shrink-0"
                  >
                    Re-verify Gateway
                  </button>
                </div>
              )}

              {/* Revenue Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[#7A7A7A] text-xs">
                    <span>Total Gross Revenue</span>
                    <DollarSign className="w-4 h-4 text-[#E8481C]" />
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-2xl sm:text-3xl font-black text-[#111111]">
                      ₹{(revenueStats?.summary?.totalRevenueRs ?? (stats?.summary?.paidUsers ? stats.summary.paidUsers * 1999 : 0)).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] text-emerald-600 font-medium">Captured</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[#7A7A7A] text-xs">
                    <span>Monthly Recurring (MRR)</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-600">
                      ₹{(revenueStats?.summary?.mrrRs ?? (stats?.summary?.paidUsers ? stats.summary.paidUsers * 1999 : 0)).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] text-[#7A7A7A]">per month</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[#7A7A7A] text-xs">
                    <span>Paid Subscribers</span>
                    <CreditCard className="w-4 h-4 text-[#E8481C]" />
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-2xl sm:text-3xl font-black text-[#111111]">
                      {revenueStats?.summary?.activePaidSubscribers ?? stats?.summary?.paidUsers ?? 0}
                    </span>
                    <span className="text-[11px] text-[#7A7A7A]">Active Pro/Ultra</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[#7A7A7A] text-xs">
                    <span>Avg Revenue / User (ARPU)</span>
                    <Zap className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-2xl sm:text-3xl font-black text-[#111111]">
                      ₹{(revenueStats?.summary?.arpu ?? (revenueStats?.summary?.activePaidSubscribers ? Math.round(revenueStats.summary.mrrRs / revenueStats.summary.activePaidSubscribers) : 1999)).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] text-[#7A7A7A]">/ paid user</span>
                  </div>
                </div>
              </div>

              {/* Revenue Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Over Time Line Chart */}
                <div className="p-6 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">Revenue Over Time (₹)</h3>
                      <p className="text-[11px] text-[#7A7A7A]">Captured subscription charges across time</p>
                    </div>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueStats?.revenueOverTime?.length ? revenueStats.revenueOverTime : [
                        { date: '2026-09-22', revenue: 1999 },
                        { date: '2026-09-24', revenue: 3998 },
                        { date: '2026-09-26', revenue: 4999 },
                        { date: '2026-09-28', revenue: 6998 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E0DEDA" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#7A7A7A' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#7A7A7A' }} tickFormatter={(val) => `₹${val}`} />
                        <Tooltip
                          formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                          contentStyle={{ background: '#111111', color: '#fff', borderRadius: 8, fontSize: 12 }}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#E8481C" fill="#E8481C" fillOpacity={0.15} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Revenue by Plan Donut Chart */}
                <div className="p-6 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-1">Revenue by Subscription Plan</h3>
                  <p className="text-[11px] text-[#7A7A7A] mb-4">Distribution of recurring earnings by tier</p>
                  <div className="h-64 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={revenueStats?.revenueByPlan?.length ? revenueStats.revenueByPlan : [
                            { name: 'Pro (₹1,999/mo)', value: 1999, color: '#E8481C' },
                            { name: 'Ultra (₹4,999/mo)', value: 4999, color: '#3B82F6' },
                            { name: 'Enterprise', value: 0, color: '#10B981' }
                          ]}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={50}
                          label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                        >
                          {(revenueStats?.revenueByPlan || []).map((entry: any, index: number) => (
                            <Cell key={`rev-cell-${index}`} fill={entry.color || '#E8481C'} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                          contentStyle={{ background: '#111111', color: '#fff', borderRadius: 8, fontSize: 12 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Subscriptions vs Cancellations & Past Due Users */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* New Subs vs Cancellations */}
                <div className="p-6 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-1">New Subscribers vs Churn</h3>
                  <p className="text-[11px] text-[#7A7A7A] mb-4">Subscriber acquisitions vs cancellations</p>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueStats?.newSubsVsCancellations || [
                        { month: 'Last Month', newSubs: 3, cancellations: 0 },
                        { month: 'This Month', newSubs: 5, cancellations: 1 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E0DEDA" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#7A7A7A' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#7A7A7A' }} allowDecimals={false} />
                        <Tooltip contentStyle={{ background: '#111111', color: '#fff', borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="newSubs" name="New Subscriptions" fill="#10B981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="cancellations" name="Cancellations" fill="#EF4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Failed and Past Due Subscriptions */}
                <div className="p-6 rounded-2xl bg-white border border-[#E0DEDA] shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">Failed & Past Due Subscriptions</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        {revenueStats?.failedAndPastDueUsers?.length || 0} At Risk
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7A7A7A] mb-4">Users with pending or failed recurring payment attempts</p>

                    {(!revenueStats?.failedAndPastDueUsers || revenueStats.failedAndPastDueUsers.length === 0) ? (
                      <div className="p-6 rounded-xl bg-[#F5F4F0] border border-[#E0DEDA] text-center text-xs text-[#7A7A7A]">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                        All paid subscriptions are healthy and in good standing. No past-due accounts.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {revenueStats.failedAndPastDueUsers.map((u: any) => (
                          <div key={u.id} className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-xs flex items-center justify-between">
                            <div>
                              <p className="font-bold text-[#111111]">{u.email}</p>
                              <p className="text-[10px] text-amber-800">Plan: {u.plan.toUpperCase()} • Status: {u.status}</p>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedUserId(u.id);
                                handleFetchUserDetail(u.id);
                              }}
                              className="px-2.5 py-1 bg-white border border-amber-300 rounded text-[10px] font-medium text-amber-900 hover:bg-amber-100 cursor-pointer"
                            >
                              Inspect
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Live Razorpay Payments Ledger */}
              <div className="bg-white p-6 rounded-2xl border border-[#E0DEDA] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">Razorpay Payment Ledger</h3>
                    <p className="text-[11px] text-[#7A7A7A]">Real-time record of all subscription invoices and charges</p>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <input
                      type="text"
                      placeholder="Filter by email or payment ID..."
                      value={paymentSearch}
                      onChange={e => setPaymentSearch(e.target.value)}
                      className="text-xs bg-[#F5F4F0] border border-[#E0DEDA] rounded-xl px-3 py-1.5 focus:outline-none w-full sm:w-60"
                    />
                    <select
                      value={paymentStatusFilter}
                      onChange={e => setPaymentStatusFilter(e.target.value)}
                      className="text-xs bg-[#F5F4F0] border border-[#E0DEDA] rounded-xl px-3 py-1.5 focus:outline-none"
                    >
                      <option value="all">All Statuses</option>
                      <option value="captured">Captured</option>
                      <option value="failed">Failed</option>
                      <option value="pending">Pending</option>
                    </select>
                    <a
                      href="/api/admin/export/payments"
                      download="flaw_payments_export.csv"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111111] text-white text-xs font-medium hover:bg-black transition-colors cursor-pointer shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </a>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E0DEDA] text-[#7A7A7A] uppercase text-[10px]">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">User Email</th>
                        <th className="py-2.5 px-3">Plan</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Razorpay Payment ID</th>
                        <th className="py-2.5 px-3">Subscription ID</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E0DEDA]">
                      {(!revenueStats?.recentPayments || revenueStats.recentPayments.length === 0) ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-[#7A7A7A]">
                            No subscription charges recorded yet. When users upgrade to Pro or Ultra, transactions appear here in real time.
                          </td>
                        </tr>
                      ) : (
                        revenueStats.recentPayments
                          .filter((p: any) => {
                            const matchSearch =
                              !paymentSearch ||
                              p.userEmail?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
                              p.razorpayPaymentId?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
                              p.razorpaySubscriptionId?.toLowerCase().includes(paymentSearch.toLowerCase());
                            const matchStatus = paymentStatusFilter === 'all' || p.status === paymentStatusFilter;
                            return matchSearch && matchStatus;
                          })
                          .map((p: any) => (
                            <tr key={p.id} className="hover:bg-[#F5F4F0]/60 transition-colors">
                              <td className="py-3 px-3 text-[11px] text-[#7A7A7A] whitespace-nowrap">
                                {new Date(p.createdAt).toLocaleString()}
                              </td>
                              <td className="py-3 px-3 font-medium text-[#111111] max-w-[200px] truncate">
                                {p.userEmail}
                              </td>
                              <td className="py-3 px-3">
                                <span className="uppercase text-[10px] px-2 py-0.5 rounded font-bold bg-[#E8481C]/10 text-[#E8481C]">
                                  {p.plan}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-bold text-[#111111]">
                                ₹{(p.amount / 100).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-3 font-mono text-[10px] text-[#5A5A5A]">
                                {p.razorpayPaymentId}
                              </td>
                              <td className="py-3 px-3 font-mono text-[10px] text-[#5A5A5A]">
                                {p.razorpaySubscriptionId || '—'}
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold ${
                                    p.status === 'captured'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : p.status === 'failed'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {p.status === 'captured' && <CheckCircle2 className="w-3 h-3" />}
                                  {p.status === 'failed' && <XCircle className="w-3 h-3" />}
                                  {p.status.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E0DEDA]">
                <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1">
                  <Search className="w-4 h-4 text-[#7A7A7A]" />
                  <input
                    type="text"
                    placeholder="Search users by email or name..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="w-full sm:w-80 text-xs bg-transparent focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <select
                    value={userPlanFilter}
                    onChange={e => setUserPlanFilter(e.target.value)}
                    className="text-xs bg-[#F5F4F0] border border-[#E0DEDA] rounded-xl px-3 py-2 focus:outline-none"
                  >
                    <option value="all">All Plans</option>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="ultra">Ultra</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                  <a
                    href="/api/admin/export/users"
                    download="flaw_users_export.csv"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#E8481C] text-white text-xs font-medium hover:bg-[#d63f15] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </a>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#E0DEDA] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#EFECE6] border-b border-[#E0DEDA] text-[#7A7A7A] uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-4">User</th>
                        <th className="p-4">Plan</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Checks</th>
                        <th className="p-4">Sign-up Date</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E0DEDA]">
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-[#F5F4F0]/60 transition-colors">
                          <td className="p-4">
                            <p className="font-bold text-[#111111]">{u.email}</p>
                            {u.name && <p className="text-[10px] text-[#7A7A7A]">{u.name}</p>}
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-orange-100 text-[#E8481C]">
                              {u.plan}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-xs text-[10px] font-bold ${u.role === 'admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-4">
                            {u.banned ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-bold bg-rose-100 text-rose-700">
                                <XCircle className="w-3 h-3" /> Banned
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                <CheckCircle2 className="w-3 h-3" /> Active
                              </span>
                            )}
                          </td>
                          <td className="p-4 font-bold">{u.totalChecks}</td>
                          <td className="p-4 text-[#7A7A7A]">{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => handleFetchUserDetail(u.id)}
                              className="px-2.5 py-1 rounded-lg bg-[#F5F4F0] border border-[#E0DEDA] hover:bg-[#E2DDD5] text-xs cursor-pointer"
                            >
                              Detail
                            </button>
                            <button
                              onClick={() => setBanModalUser(u)}
                              className={`px-2.5 py-1 rounded-lg text-xs cursor-pointer ${
                                u.banned ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {u.banned ? 'Unban' : 'Ban'}
                            </button>
                            <button
                              onClick={() => setGrantModalUser(u)}
                              className="px-2.5 py-1 rounded-lg bg-orange-50 text-[#E8481C] border border-orange-200 text-xs cursor-pointer"
                            >
                              Grant Ent
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-[#E0DEDA]">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${liveDot ? 'bg-emerald-500' : 'bg-emerald-300'} animate-pulse`} />
                  <span className="text-xs font-bold shimmer-text">Live Activity Feed (Auto-refreshing)</span>
                </div>
                <a
                  href="/api/admin/export/events"
                  download="flaw_events_export.csv"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#E8481C] text-white text-xs font-medium hover:bg-[#d63f15] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Events CSV</span>
                </a>
              </div>

              <div className="bg-white rounded-2xl border border-[#E0DEDA] overflow-hidden p-6">
                <div className="space-y-3">
                  {eventsList.map((evt: any) => (
                    <div key={evt.id} className="flex items-center justify-between p-3.5 rounded-xl bg-[#F5F4F0] border border-[#E0DEDA] text-xs">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${
                          evt.type === 'signup' ? 'bg-emerald-500' :
                          evt.type === 'login' ? 'bg-blue-500' :
                          evt.type === 'idea_check' ? 'bg-[#E8481C]' :
                          evt.type === 'ban' ? 'bg-rose-600' : 'bg-gray-500'
                        }`} />
                        <div>
                          <p className="font-bold text-[#111111]">{evt.userEmail}</p>
                          <p className="text-[10px] text-[#7A7A7A]">Type: <span className="uppercase">{evt.type}</span> {evt.metadata ? `— ${JSON.stringify(evt.metadata)}` : ''}</p>
                        </div>
                      </div>
                      <span className="text-[11px] text-[#7A7A7A]">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'access' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-[#E0DEDA]">
                <h3 className="text-sm font-bold uppercase tracking-wider mb-2">Enterprise Manual Grants</h3>
                <p className="text-xs text-[#7A7A7A] mb-6">
                  Grant enterprise AI access to verified offline / telephone customers without Razorpay checkout.
                </p>

                <div className="space-y-4">
                  {usersList.filter(u => u.plan === 'enterprise').map(u => (
                    <div key={u.id} className="p-4 rounded-xl bg-[#F5F4F0] border border-[#E0DEDA] flex items-center justify-between">
                      <div>
                        <p className="font-bold text-xs">{u.email}</p>
                        <p className="text-[10px] text-[#7A7A7A]">
                          Granted By: {u.enterpriseGrant?.grantedBy || 'Admin'} on {u.enterpriseGrant?.grantedAt ? new Date(u.enterpriseGrant.grantedAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        Enterprise Active
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mcp' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-[#E0DEDA] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E0DEDA]">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111]">Personal Access Tokens (MCP)</h3>
                    <p className="text-[11px] text-[#7A7A7A]">Manage and revoke all user MCP access tokens across the platform</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={tokenFilter}
                      onChange={e => setTokenFilter(e.target.value as any)}
                      className="text-xs bg-[#F5F4F0] border border-[#E0DEDA] rounded-xl px-3 py-1.5 focus:outline-none"
                    >
                      <option value="all">All Tokens ({adminTokens.length})</option>
                      <option value="active">Active ({adminTokens.filter(t => !t.revokedAt).length})</option>
                      <option value="revoked">Revoked ({adminTokens.filter(t => t.revokedAt).length})</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E0DEDA] text-[#7A7A7A] uppercase text-[10px]">
                        <th className="py-2.5 px-3">Created</th>
                        <th className="py-2.5 px-3">User Email</th>
                        <th className="py-2.5 px-3">Token Name</th>
                        <th className="py-2.5 px-3 font-mono">Prefix</th>
                        <th className="py-2.5 px-3">Last Used</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E0DEDA]">
                      {adminTokens.filter(t => {
                        if (tokenFilter === 'active') return !t.revokedAt;
                        if (tokenFilter === 'revoked') return Boolean(t.revokedAt);
                        return true;
                      }).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-[#7A7A7A]">
                            No personal access tokens generated yet.
                          </td>
                        </tr>
                      ) : (
                        adminTokens
                          .filter(t => {
                            if (tokenFilter === 'active') return !t.revokedAt;
                            if (tokenFilter === 'revoked') return Boolean(t.revokedAt);
                            return true;
                          })
                          .map(t => (
                            <tr key={t.id} className="hover:bg-[#F5F4F0]/60 transition-colors">
                              <td className="py-3 px-3 text-[11px] text-[#7A7A7A] whitespace-nowrap">
                                {new Date(t.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-3 font-medium text-[#111111] truncate max-w-[180px]">
                                {t.userEmail}
                              </td>
                              <td className="py-3 px-3 font-semibold text-[#111111]">
                                {t.name}
                              </td>
                              <td className="py-3 px-3 font-mono text-[11px] text-[#E8481C]">
                                {t.prefix}
                              </td>
                              <td className="py-3 px-3 text-[11px] text-[#7A7A7A]">
                                {t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleString() : 'Never'}
                              </td>
                              <td className="py-3 px-3">
                                {t.revokedAt ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold bg-rose-100 text-rose-800">
                                    REVOKED
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">
                                    ACTIVE
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right">
                                {!t.revokedAt && (
                                  <button
                                    onClick={() => handleAdminRevokeToken(t.id)}
                                    disabled={revokingTokenId === t.id}
                                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>{revokingTokenId === t.id ? 'Revoking...' : 'Revoke'}</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E0DEDA] overflow-hidden p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider mb-4">Admin Audit Trail</h3>
                <div className="space-y-3">
                  {auditLogs.map((log: any) => (
                    <div key={log.id} className="p-4 rounded-xl bg-[#F5F4F0] border border-[#E0DEDA] text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#E8481C]">{log.action}</span>
                        <span className="text-[10px] text-[#7A7A7A]">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-[11px] text-[#111111]">Admin: <span className="font-semibold">{log.adminEmail}</span></p>
                      {log.targetUserEmail && <p className="text-[11px] text-[#7A7A7A]">Target User: {log.targetUserEmail}</p>}
                      {log.metadata && <p className="text-[10px] font-mono bg-white p-2 rounded border border-[#E0DEDA] mt-1">{JSON.stringify(log.metadata)}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* User Detail Slide-over / Modal */}
      {selectedUserId && selectedUserDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E0DEDA] max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-[#E0DEDA] pb-4">
              <div>
                <h3 className="text-sm font-bold">{selectedUserDetail.user.email}</h3>
                <p className="text-[11px] text-[#7A7A7A]">ID: {selectedUserDetail.user.id}</p>
              </div>
              <button
                onClick={() => { setSelectedUserId(null); setSelectedUserDetail(null); }}
                className="px-3 py-1.5 rounded-lg bg-[#F5F4F0] hover:bg-[#E2DDD5] text-xs cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-[#F5F4F0] rounded-xl">
                <p className="text-[#7A7A7A]">Plan</p>
                <p className="font-bold uppercase mt-1">{selectedUserDetail.user.plan}</p>
              </div>
              <div className="p-3 bg-[#F5F4F0] rounded-xl">
                <p className="text-[#7A7A7A]">Status</p>
                <p className="font-bold mt-1">{selectedUserDetail.user.banned ? 'Banned' : 'Active'}</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-3">Validation History ({selectedUserDetail.history.length})</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedUserDetail.history.map((h: any) => (
                  <div key={h.id} className="p-3 rounded-xl bg-[#F5F4F0] border border-[#E0DEDA] text-xs">
                    <p className="font-bold">{h.title || h.idea}</p>
                    <p className="text-[10px] text-[#7A7A7A] mt-1">{new Date(h.createdAt).toLocaleString()} • Model: {h.model || 'orbit'}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {banModalUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E0DEDA] max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold">
              {banModalUser.banned ? 'Unban Account' : 'Ban Account'} ({banModalUser.email})
            </h3>
            {!banModalUser.banned && (
              <div>
                <label className="text-xs text-[#7A7A7A] block mb-1">Reason for Ban</label>
                <input
                  type="text"
                  placeholder="e.g. Terms violation or abuse"
                  value={banReason}
                  onChange={e => setBanReason(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-[#F5F4F0] border border-[#E0DEDA] focus:outline-none"
                />
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setBanModalUser(null)}
                className="px-4 py-2 rounded-xl bg-[#F5F4F0] text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBanSubmit}
                className={`px-4 py-2 rounded-xl text-xs font-medium text-white cursor-pointer ${
                  banModalUser.banned ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirm {banModalUser.banned ? 'Unban' : 'Ban'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grant Enterprise Modal */}
      {grantModalUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E0DEDA] max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold">Grant Enterprise Access ({grantModalUser.email})</h3>
            <div className="space-y-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={grantUnlimited}
                  onChange={e => setGrantUnlimited(e.target.checked)}
                />
                <span>Unlimited Validations & Quotas</span>
              </label>
              <div>
                <label className="text-[#7A7A7A] block mb-1">Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={grantExpires}
                  onChange={e => setGrantExpires(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-[#F5F4F0] border border-[#E0DEDA] focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setGrantModalUser(null)}
                className="px-4 py-2 rounded-xl bg-[#F5F4F0] text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleGrantEnterprise}
                className="px-4 py-2 rounded-xl bg-[#E8481C] text-white text-xs font-medium hover:bg-[#d63f15] cursor-pointer"
              >
                Grant Enterprise
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
