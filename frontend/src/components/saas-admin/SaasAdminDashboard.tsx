import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  Building2,
  DollarSign,
  ShieldAlert,
  CheckCircle,
  Clock,
  Ticket,
  AlertOctagon,
  Loader2,
  Layers,
  Award,
  TrendingUp,
  CreditCard,
  Banknote,
  Wallet,
  AlertTriangle,
  FileText,
  ArrowRight,
  Sparkles,
  UserCheck,
  Users,
  UserPlus,
  Shield,
  Filter,
  Check,
} from 'lucide-react';
import api from '../../services/api';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../ui/chart';
import { Table } from '../ui/Table';

interface ExpiringTenant {
  id: number;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  start_date?: string | null;
  end_date: string | null;
  days_left: number | null;
  plan_name: string;
  admin_email: string;
  owner_name?: string;
}

interface AcademicYearOption {
  id: number;
  name: string;
  start_year: number;
  end_year: number;
  value: string;
}

interface UserMetrics {
  total_users: number;
  active_users: number;
  inactive_users: number;
  suspended_users: number;
  expired_users: number;
  new_users: number;
}

interface RecentUser {
  id: number;
  name: string;
  email: string;
  user_type: string;
  status: string;
  created_at: string;
  tenant_name: string;
}

interface SaasStats {
  total_tenants: number;
  active_tenants: number;
  suspended_tenants: number;
  draft_tenants: number;
  expired_tenants: number;
  status_distribution?: { status: string; count: number }[];
  expiring_tenants?: ExpiringTenant[];
  recently_registered?: ExpiringTenant[];
  user_metrics?: UserMetrics;
  user_role_distribution?: { user_type: string; count: number }[];
  recently_registered_users?: RecentUser[];
  pending_approvals: number;
  total_plans: number;
  total_mrr: number;
  plan_distribution: { plan: string; count: number }[];
  mrr_trend?: { m: string; val: string; raw_val: number; h: string; isCurrent: boolean }[];
}

interface RecentPayment {
  id: number;
  invoice_number: string;
  tenant_id: number;
  total_amount: number;
  payment_method: string | null;
  payment_reference: string | null;
  payment_date: string;
  status: string;
  tenant_name: string;
  tenant_slug: string;
  plan_name: string;
}

interface BillingSummary {
  mrr: number;
  arr: number;
  total_revenue: number;
  collected_revenue: number;
  outstanding: number;
  net_revenue?: number;
  available_years?: number[];
  recent_payments?: RecentPayment[];
}

interface RevenueTrendItem {
  m: string;
  val: string;
  raw_val: number;
  h: string;
  isCurrent: boolean;
}

// Chart configuration for shadcn UI status chart
const statusChartConfig: ChartConfig = {
  active: { label: 'Active', color: '#10b981' },
  draft: { label: 'Draft / Onboarding', color: '#f59e0b' },
  suspended: { label: 'Suspended', color: '#ef4444' },
  expired: { label: 'Expired', color: '#64748b' },
};

const planChartConfig: ChartConfig = {
  count: { label: 'Institutes', color: '#6366f1' },
};

const userStatusChartConfig: ChartConfig = {
  active: { label: 'Active', color: '#10b981' },
  inactive: { label: 'Inactive', color: '#94a3b8' },
  suspended: { label: 'Suspended', color: '#ef4444' },
  expired: { label: 'Expired', color: '#f59e0b' },
};

const userRoleChartConfig: ChartConfig = {
  count: { label: 'Users', color: '#3b82f6' },
};

export const SaasAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<SaasStats | null>(null);
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendItem[]>([]);
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [expiringLimit, setExpiringLimit] = useState<string>('10');
  const [loading, setLoading] = useState(true);
  const [hoveredStatusIndex, setHoveredStatusIndex] = useState<number | null>(null);

  const formatINR = (n: number) => {
    const val = Math.round(n);
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2).replace(/\.00$/, '')}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2).replace(/\.00$/, '')}L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  // Fetch Academic Years dynamically from database
  useEffect(() => {
    const fetchAcademicYears = async () => {
      try {
        const { data } = await api.get('/admin/dashboard/academic-years');
        if (data.status === 'success' && Array.isArray(data.data)) {
          setAcademicYears(data.data);
        }
      } catch (err) {
        console.error('Failed to load academic years:', err);
      }
    };
    fetchAcademicYears();
  }, []);

  // Fetch Stats with Global Time Range Filter
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/admin/dashboard/saas-stats', {
          params: { expiring_limit: expiringLimit, time_range: timeRange }
        });
        if (data.status === 'success') setStats(data.data);
      } catch (err) {
        console.error('Failed to load SaaS dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [expiringLimit, timeRange]);

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        const { data: billingData } = await api.get('/admin/billing/summary', {
          params: { year: selectedYear, month: selectedMonth }
        });
        if (billingData.status === 'success') setBilling(billingData.data);

        const { data: revenueData } = await api.get('/admin/dashboard/saas-revenue', {
          params: { year: selectedYear, month: selectedMonth }
        });
        if (revenueData.status === 'success') {
          const trend = (revenueData.data.revenue_trend || []).map((t: any) => ({
            ...t,
            raw_val: Number(t.raw_val) || 0,
          }));
          setRevenueTrend(trend);
        }
      } catch (err) {
        console.error('Failed to load filtered revenue & billing data:', err);
      }
    };
    fetchBillingData();
  }, [selectedYear, selectedMonth]);

  const StatCard = ({
    label,
    value,
    color,
    icon: Icon,
    bg,
    border,
    subtext,
  }: {
    label: string;
    value: React.ReactNode;
    color: string;
    icon: React.ElementType;
    bg: string;
    border: string;
    subtext?: string;
  }) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{label}</span>
        <div className={`w-9 h-9 ${bg} ${color} rounded-xl flex items-center justify-center ${border}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-2">
        <span className={`text-2xl font-extrabold block ${color}`}>
          {loading ? <Loader2 size={20} className="animate-spin text-slate-300" /> : value}
        </span>
        {subtext && <span className="text-[11px] text-slate-400 font-medium block mt-0.5">{subtext}</span>}
      </div>
    </div>
  );

  // Status donut chart data preparation
  const statusPieData = React.useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Active', value: stats.active_tenants || 0, color: '#10b981', key: 'active' },
      { name: 'Draft', value: stats.draft_tenants || 0, color: '#f59e0b', key: 'draft' },
      { name: 'Suspended', value: stats.suspended_tenants || 0, color: '#ef4444', key: 'suspended' },
      { name: 'Expired', value: stats.expired_tenants || 0, color: '#64748b', key: 'expired' },
    ].filter(item => item.value > 0);
  }, [stats]);

  // User status donut chart data preparation
  const userStatusPieData = React.useMemo(() => {
    if (!stats?.user_metrics) return [];
    const m = stats.user_metrics;
    return [
      { name: 'Active', value: m.active_users || 0, color: '#10b981', key: 'active' },
      { name: 'Inactive', value: m.inactive_users || 0, color: '#94a3b8', key: 'inactive' },
      { name: 'Suspended', value: m.suspended_users || 0, color: '#ef4444', key: 'suspended' },
      { name: 'Expired', value: m.expired_users || 0, color: '#f59e0b', key: 'expired' },
    ].filter(item => item.value > 0);
  }, [stats]);

  const getStatusBadge = (status: number | string | undefined | null) => {
    const s = status !== undefined && status !== null ? String(status).toLowerCase().trim() : '';
    switch (s) {
      case '1':
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Active
          </span>
        );
      case '2':
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={11} />
            Draft
          </span>
        );
      case '0':
      case 'suspended':
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <AlertOctagon size={11} />
            Inactive
          </span>
        );
      case '3':
      case 'deleted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
            Deleted
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <AlertTriangle size={11} />
            Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
            {status || 'Unknown'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Dashboard Top Header - Clean standalone without card wrapper */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Platform Overview & Tenant Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time cross-tenant infrastructure analytics, status metrics, subscription breakdown, revenue reports, and tenant onboarding pipeline.
          </p>
        </div>

        {/* 1. Global Dashboard Filter (Daily, Weekly, Monthly) - Standalone */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setTimeRange('daily')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              timeRange === 'daily'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daily
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('weekly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              timeRange === 'weekly'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('monthly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              timeRange === 'monthly'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* SECTION 2 — DIAGRAMS & CHARTS FOR TENANTS & PLANS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Diagram 1: Tenant Status Distribution Donut Chart */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col space-y-3">
          <div className="border-b border-slate-100 pb-2.5">
            <h4 className="font-bold text-slate-900 text-sm leading-tight">Tenant Status Distribution</h4>
            <p className="text-xs text-slate-500 font-normal mt-0.5">Proportional breakdown by tenant account status</p>
          </div>

          <div className="relative w-full h-44 flex items-center justify-center my-0 py-0">
            {loading ? (
              <Loader2 size={24} className="animate-spin text-slate-300" />
            ) : statusPieData.length === 0 ? (
              <span className="text-xs text-slate-400 font-medium">No tenant status data available</span>
            ) : (
              <ChartContainer config={statusChartConfig} className="h-44 w-full">
                <PieChart margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                  <Tooltip
                    wrapperStyle={{ zIndex: 50, pointerEvents: 'none' }}
                    offset={18}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        const total = stats?.total_tenants || 1;
                        const pct = ((item.value / total) * 100).toFixed(1);
                        return (
                          <div className="bg-white/95 backdrop-blur-md border border-slate-200 p-2.5 rounded-xl shadow-xl space-y-0.5 pointer-events-none min-w-[130px] whitespace-nowrap z-50 animate-fade-in">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                              <span className="font-bold text-xs text-slate-800">{item.name} Status</span>
                            </div>
                            <div className="text-sm font-extrabold text-slate-900">
                              {item.value} {item.value === 1 ? 'Institute' : 'Institutes'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              {pct}% of all platform tenants
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                    onMouseEnter={(_, index) => setHoveredStatusIndex(index)}
                    onMouseLeave={() => setHoveredStatusIndex(null)}
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke={hoveredStatusIndex === index ? '#ffffff' : 'none'}
                        strokeWidth={hoveredStatusIndex === index ? 3 : 0}
                        className="cursor-pointer transition-all duration-150"
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}

            {/* Inner Ring Text */}
            {!loading && stats && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-extrabold text-slate-900 leading-none">{stats.total_tenants}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Total Tenants</span>
              </div>
            )}
          </div>

          {/* Legend Chips with two-way hover sync */}
          <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 text-xs">
            <div
              onMouseEnter={() => {
                const idx = statusPieData.findIndex((s) => s.key === 'active');
                if (idx !== -1) setHoveredStatusIndex(idx);
              }}
              onMouseLeave={() => setHoveredStatusIndex(null)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                hoveredStatusIndex !== null && statusPieData[hoveredStatusIndex]?.key === 'active'
                  ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-slate-50/80 border-slate-100 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span
                  className={`font-medium ${
                    hoveredStatusIndex !== null && statusPieData[hoveredStatusIndex]?.key === 'active'
                      ? 'text-emerald-900 font-bold'
                      : 'text-slate-600'
                  }`}
                >
                  Active
                </span>
              </div>
              <span
                className={`font-bold ${
                  hoveredStatusIndex !== null && statusPieData[hoveredStatusIndex]?.key === 'active'
                    ? 'text-emerald-900'
                    : 'text-slate-900'
                }`}
              >
                {stats?.active_tenants ?? 0}
              </span>
            </div>

            <div
              onMouseEnter={() => {
                const idx = statusPieData.findIndex((s) => s.key === 'draft');
                if (idx !== -1) setHoveredStatusIndex(idx);
              }}
              onMouseLeave={() => setHoveredStatusIndex(null)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                hoveredStatusIndex !== null && statusPieData[hoveredStatusIndex]?.key === 'draft'
                  ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
                  : 'bg-slate-50/80 border-slate-100 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span
                  className={`font-medium ${
                    hoveredStatusIndex !== null && statusPieData[hoveredStatusIndex]?.key === 'draft'
                      ? 'text-amber-900 font-bold'
                      : 'text-slate-600'
                  }`}
                >
                  Draft
                </span>
              </div>
              <span
                className={`font-bold ${
                  hoveredStatusIndex !== null && statusPieData[hoveredStatusIndex]?.key === 'draft'
                    ? 'text-amber-900'
                    : 'text-slate-900'
                }`}
              >
                {stats?.draft_tenants ?? 0}
              </span>
            </div>

            <div
              onMouseEnter={() => {
                const idx = statusPieData.findIndex((s) => s.key === 'suspended');
                if (idx !== -1) setHoveredStatusIndex(idx);
              }}
              onMouseLeave={() => setHoveredStatusIndex(null)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                hoveredStatusIndex !== null && statusPieData[hoveredStatusIndex]?.key === 'suspended'
                  ? 'bg-red-50 border-red-300 ring-2 ring-red-500/20 shadow-xs'
                  : 'bg-slate-50/80 border-slate-100 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                <span
                  className={`font-medium ${
                    hoveredStatusIndex !== null && statusPieData[hoveredStatusIndex]?.key === 'suspended'
                      ? 'text-red-900 font-bold'
                      : 'text-slate-600'
                  }`}
                >
                  Suspended
                </span>
              </div>
              <span
                className={`font-bold ${
                  hoveredStatusIndex !== null && statusPieData[hoveredStatusIndex]?.key === 'suspended'
                    ? 'text-red-900'
                    : 'text-slate-900'
                }`}
              >
                {stats?.suspended_tenants ?? 0}
              </span>
            </div>

            <div
              onMouseEnter={() => {
                const idx = statusPieData.findIndex((s) => s.key === 'expired');
                if (idx !== -1) setHoveredStatusIndex(idx);
              }}
              onMouseLeave={() => setHoveredStatusIndex(null)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                hoveredStatusIndex !== null && statusPieData[hoveredStatusIndex]?.key === 'expired'
                  ? 'bg-slate-200/80 border-slate-300 ring-2 ring-slate-400/20 shadow-xs'
                  : 'bg-slate-50/80 border-slate-100 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                <span
                  className={`font-medium ${
                    hoveredStatusIndex !== null && statusPieData[hoveredStatusIndex]?.key === 'expired'
                      ? 'text-slate-900 font-bold'
                      : 'text-slate-600'
                  }`}
                >
                  Expired
                </span>
              </div>
              <span
                className={`font-bold ${
                  hoveredStatusIndex !== null && statusPieData[hoveredStatusIndex]?.key === 'expired'
                    ? 'text-slate-900'
                    : 'text-slate-900'
                }`}
              >
                {stats?.expired_tenants ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Diagram 2: Subscription Plan Adoption Chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col space-y-3">
          <div className="flex items-start justify-between border-b border-slate-100 pb-2.5 gap-3">
            <div>
              <h4 className="font-bold text-slate-900 text-sm leading-tight">Subscription Plan Adoption Breakdown</h4>
              <p className="text-xs text-slate-500 font-normal mt-0.5">Active customer tenant distribution across platform tiers</p>
            </div>
            <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5 shrink-0 pt-0.5">
              <span>Most Popular: <strong className="text-slate-900 font-bold">{stats?.plan_distribution?.[0]?.plan || '—'}</strong></span>
            </div>
          </div>

          <div className="w-full h-44 my-0 py-0">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-slate-300" />
              </div>
            ) : !stats?.plan_distribution || stats.plan_distribution.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                No active plan subscriptions found
              </div>
            ) : (
              <ChartContainer config={planChartConfig} className="h-44 w-full">
                <BarChart
                  data={stats.plan_distribution}
                  layout="vertical"
                  margin={{ top: 4, right: 20, left: 5, bottom: 14 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  {/* 3. X-Axis formatted as proper whole numbers with visible title */}
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickFormatter={(v) => (Number.isInteger(Number(v)) ? String(v) : '')}
                    domain={[0, (dataMax: number) => Math.max(dataMax + 1, 3)]}
                    label={{
                      value: 'Number of Tenants',
                      position: 'insideBottom',
                      offset: -8,
                      style: { fill: '#64748b', fontSize: 11, fontWeight: 700, textAnchor: 'middle' }
                    }}
                  />
                  <YAxis
                    type="category"
                    dataKey="plan"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }}
                    width={105}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                      fontWeight: 600,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                    }}
                    formatter={(value) => [`${value} ${Number(value) === 1 ? 'Tenant' : 'Tenants'}`, 'Number of Tenants']}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={18}>
                    {stats.plan_distribution.map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={['#6366f1', '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981'][idx % 5]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </div>

          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">Total Available Plans: <strong className="text-slate-800 font-bold">{stats?.total_plans || 0}</strong></span>
            <span className="text-slate-500 font-medium">Avg Revenue / Active Tenant: <strong className="text-emerald-700 font-bold">₹{stats && stats.active_tenants > 0 ? Math.round(stats.total_mrr / stats.active_tenants).toLocaleString() : 0} / mo</strong></span>
          </div>
        </div>
      </div>

      {/* SECTION 2 — EXPIRING SUBSCRIPTIONS & RENEWALS TABLE CARD */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">
              Expiring Subscriptions & Plan Renewals
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Institutes with active or trialing plans expiring soon requiring renewal</p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
              <span className="text-slate-500 font-semibold">Show Top:</span>
              <select
                value={expiringLimit}
                onChange={(e) => setExpiringLimit(e.target.value)}
                className="bg-transparent font-extrabold text-slate-900 outline-none cursor-pointer"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="all">All</option>
              </select>
            </div>

            <button
              onClick={() => navigate('/tenants')}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
            >
              View All Institutes Registry
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <Table
          dense
          minWidth="805px"
          colWidths={['160px', '125px', '105px', '105px', '130px', '95px', '85px']}
          headers={[
            'Institute Name',
            'Current Plan',
            'Start Date',
            'Expiry Date',
            { label: 'Expiry Urgency', align: 'center' },
            { label: 'Status', align: 'center' },
            { label: 'Action', align: 'right' }
          ]}
        >
          {loading ? (
            <tr>
              <td colSpan={7} className="px-3.5 py-6 text-center text-slate-400">
                <Loader2 size={20} className="animate-spin inline-block mr-2" />
                Loading expiring subscriptions...
              </td>
            </tr>
          ) : !(stats?.expiring_tenants || stats?.recently_registered) || (stats?.expiring_tenants || stats?.recently_registered)?.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-3.5 py-6 text-center text-slate-400">
                No subscriptions currently expiring soon
              </td>
            </tr>
          ) : (
            (stats?.expiring_tenants || stats?.recently_registered || []).map((tenant) => (
              <tr key={tenant.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => navigate(`/tenants/${tenant.id}`)}>
                <td className="px-3.5 py-3 font-semibold text-slate-900 text-sm">
                  {tenant.name}
                </td>
                <td className="px-3.5 py-3 text-sm">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {tenant.plan_name || 'Standard Tier'}
                  </span>
                </td>
                <td className="px-3.5 py-3 text-slate-600 text-sm whitespace-nowrap">
                  {tenant.start_date
                    ? new Date(tenant.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : (tenant.created_at
                        ? new Date(tenant.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—')}
                </td>
                <td className="px-3.5 py-3 text-slate-600 text-sm whitespace-nowrap">
                  {tenant.end_date ? new Date(tenant.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </td>
                <td className="px-3.5 py-3 text-center whitespace-nowrap">
                  {(() => {
                    const days = tenant.days_left;
                    if (tenant.status === 'expired' || (days !== null && days < 0)) {
                      return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                          <AlertOctagon size={11} />
                          Expired {days !== null ? `(${Math.abs(days)}d ago)` : ''}
                        </span>
                      );
                    }
                    if (days !== null && days <= 7) {
                      return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                          <AlertTriangle size={11} className="text-amber-600" />
                          {days === 0 ? 'Expires Today!' : `${days} ${days === 1 ? 'day' : 'days'} left`}
                        </span>
                      );
                    }
                    if (days !== null && days <= 30) {
                      return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock size={11} className="text-amber-600" />
                          {days} days left
                        </span>
                      );
                    }
                    if (tenant.end_date) {
                      return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle size={11} className="text-emerald-500" />
                          {days !== null ? `${days} days left` : 'Active'}
                        </span>
                      );
                    }
                    return (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        No Expiry Date
                      </span>
                    );
                  })()}
                </td>
                <td className="px-3.5 py-3 text-center whitespace-nowrap">
                  {getStatusBadge(tenant.status)}
                </td>
                <td className="px-3.5 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/tenants/${tenant.id}`); }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-900 hover:underline cursor-pointer inline-flex items-center gap-1"
                  >
                    Inspect
                    <ArrowRight size={12} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </Table>
      </div>

      {/* SECTION 3 — FINANCE & REVENUE SUMMARY CARDS WITH YEAR/MONTH FILTERS */}
      <div className="space-y-3.5 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">
              Revenue & Financial Overview
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Real database subscription revenue metrics filtered by tenure and calendar period</p>
          </div>

          {/* 5. Dynamic Year Filter populated from Academic Years table */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
              <Filter size={13} className="text-indigo-600" />
              <span className="text-slate-500 font-semibold">Academic Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent font-extrabold text-slate-900 outline-none cursor-pointer"
              >
                <option value="all">All Academic Years</option>
                {academicYears.length > 0
                  ? academicYears.map((ay) => (
                      <option key={ay.id} value={String(ay.start_year || ay.value)}>
                        {ay.name} ({ay.start_year})
                      </option>
                    ))
                  : (billing?.available_years && billing.available_years.length > 0
                      ? billing.available_years
                      : [new Date().getFullYear()]
                    ).map((yr) => (
                      <option key={yr} value={String(yr)}>
                        {yr}
                      </option>
                    ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
              <span className="text-slate-500 font-semibold">Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent font-extrabold text-slate-900 outline-none cursor-pointer"
              >
                <option value="all">All Months</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>
          </div>
        </div>

        {/* 5 Financial KPI Cards: MRR, ARR, Total Revenue, Collected Revenue, Outstanding Revenue */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <StatCard
            label="MRR (Monthly Recurring)"
            value={loading ? '—' : formatINR(billing?.mrr || 0)}
            color="text-emerald-700"
            icon={TrendingUp}
            bg="bg-emerald-50"
            border="border border-emerald-200"
            subtext="Normalized monthly revenue"
          />
          <StatCard
            label="ARR (Annual Run-Rate)"
            value={loading ? '—' : formatINR(billing?.arr || 0)}
            color="text-indigo-600"
            icon={DollarSign}
            bg="bg-indigo-50"
            border="border border-indigo-200"
            subtext="Annualized recurring projection"
          />
          <StatCard
            label="Total Invoiced Revenue"
            value={loading ? '—' : formatINR(billing?.total_revenue || 0)}
            color="text-blue-600"
            icon={Banknote}
            bg="bg-blue-50"
            border="border border-blue-200"
            subtext="Total created invoice value"
          />
          <StatCard
            label="Collected Revenue"
            value={loading ? '—' : formatINR(billing?.collected_revenue || 0)}
            color="text-emerald-600"
            icon={CheckCircle}
            bg="bg-emerald-50"
            border="border border-emerald-200"
            subtext="Paid invoice receipts"
          />
          <StatCard
            label="Outstanding Revenue"
            value={loading ? '—' : formatINR(billing?.outstanding || 0)}
            color="text-amber-600"
            icon={AlertOctagon}
            bg="bg-amber-50"
            border="border border-amber-200"
            subtext="Unpaid & overdue receivables"
          />
        </div>
      </div>

      {/* PLATFORM REVENUE TREND BAR CHART */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">
              Platform Revenue Cumulative Growth ({selectedYear === 'all' ? new Date().getFullYear() : selectedYear})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Monthly cumulative subscription earnings across all tenant accounts</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-purple-600/30 border border-purple-200 rounded"></span>
              <span className="text-slate-500">Historical Months</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-purple-600 rounded shadow-sm shadow-purple-500/20 animate-pulse"></span>
              <span className="text-slate-800">Current Month</span>
            </div>
          </div>
        </div>

        <div className="w-full h-72 pt-4">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-slate-300" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={revenueTrend.map(t => ({ month: t.m, revenue: t.raw_val, isCurrent: t.isCurrent }))}
                margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
                barCategoryGap="25%"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  width={70}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(value: number) => {
                    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
                    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
                    return `₹${value.toLocaleString('en-IN')}`;
                  }}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {revenueTrend.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={entry.isCurrent ? '#7c3aed' : '#c4b5fd'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* RECENT SUBSCRIPTION PAYMENTS LIVE TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-bold text-slate-900 text-sm">
              Recent Subscription Payments
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">Top 5 recent completed paid invoice transactions and plan receipts</p>
          </div>
          <button
            onClick={() => navigate('/billing')}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-800 transition-colors cursor-pointer self-start sm:self-auto flex items-center gap-1"
          >
            View All Invoices &rarr;
          </button>
        </div>

        <Table
          dense
          minWidth="760px"
          colWidths={['120px', '160px', '135px', '120px', '110px', '115px']}
          headers={[
            'Invoice No.',
            'Institute / Tenant',
            'Subscription Tier',
            'Payment Date',
            { label: 'Amount Paid', align: 'right' },
            { label: 'Status', align: 'center' }
          ]}
        >
          {loading ? (
            <tr>
              <td colSpan={6} className="px-3.5 py-8 text-center text-slate-400">
                <Loader2 size={20} className="animate-spin inline-block mr-2" />
                Loading recent payments...
              </td>
            </tr>
          ) : !billing?.recent_payments || billing.recent_payments.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3.5 py-6 text-center text-slate-400">
                No recent payments found for the selected period
              </td>
            </tr>
          ) : (
            billing.recent_payments.map((pmt) => (
              <tr key={pmt.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-3.5 py-3 font-semibold text-slate-900 text-sm whitespace-nowrap">
                  {pmt.invoice_number}
                </td>
                <td className="px-3.5 py-3 font-semibold text-slate-900 text-sm">
                  {pmt.tenant_name}
                </td>
                <td className="px-3.5 py-3 text-sm whitespace-nowrap">
                  <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded text-sm font-medium">
                    {pmt.plan_name || 'Standard Plan'}
                  </span>
                </td>
                <td className="px-3.5 py-3 text-slate-700 text-sm whitespace-nowrap">
                  {pmt.payment_date ? new Date(pmt.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </td>
                <td className="px-3.5 py-3 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                  {formatINR(pmt.total_amount)}
                </td>
                <td className="px-3.5 py-3 text-center whitespace-nowrap">
                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border bg-emerald-50 text-emerald-700 border-emerald-200">
                    Paid ({pmt.payment_method || 'Online'})
                  </span>
                </td>
              </tr>
            ))
          )}
        </Table>
      </div>

      {/* SECTION 4 — USER ECOSYSTEM & STATUS BREAKDOWN */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">
              Platform User Status Overview
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Cross-tenant user account status metrics and recent user registrations</p>
          </div>
          <button
            onClick={() => navigate('/users-and-roles')}
            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer self-start sm:self-auto"
          >
            Manage Users & Roles
            <ArrowRight size={14} />
          </button>
        </div>

        {/* User Status Metric Cards (Total, Active, Inactive, Suspended, Expired, New Users) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          <StatCard
            label="Total Users"
            value={stats?.user_metrics?.total_users ?? '—'}
            color="text-slate-900"
            icon={Users}
            bg="bg-slate-100"
            border="border border-slate-200"
            subtext="All registered accounts"
          />
          <StatCard
            label="Active Users"
            value={stats?.user_metrics?.active_users ?? '—'}
            color="text-emerald-600"
            icon={CheckCircle}
            bg="bg-emerald-50"
            border="border border-emerald-200"
            subtext="Live & operational"
          />
          <StatCard
            label="Inactive Users"
            value={stats?.user_metrics?.inactive_users ?? '—'}
            color="text-slate-600"
            icon={Clock}
            bg="bg-slate-50"
            border="border border-slate-200"
            subtext="Currently inactive"
          />
          <StatCard
            label="Suspended Users"
            value={stats?.user_metrics?.suspended_users ?? '—'}
            color="text-red-600"
            icon={AlertOctagon}
            bg="bg-red-50"
            border="border border-red-200"
            subtext="App access blocked"
          />
          <StatCard
            label="Expired Users"
            value={stats?.user_metrics?.expired_users ?? '—'}
            color="text-amber-600"
            icon={AlertTriangle}
            bg="bg-amber-50"
            border="border border-amber-200"
            subtext="Terminated / expired"
          />
          <StatCard
            label="New Users (30d)"
            value={stats?.user_metrics?.new_users ?? '—'}
            color="text-blue-600"
            icon={UserPlus}
            bg="bg-blue-50"
            border="border border-blue-200"
            subtext="Joined last 30 days"
          />
        </div>

        {/* Recently Registered Users Live Table */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">
                Recently Registered Users
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">Latest user account registrations across all institutes</p>
            </div>
            <button
              onClick={() => navigate('/users-and-roles')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer self-start sm:self-auto flex items-center gap-1"
            >
              Inspect All Users &rarr;
            </button>
          </div>

          <Table
            dense
            minWidth="740px"
            colWidths={['200px', '140px', '170px', '120px', '110px']}
            headers={[
              'User & Email',
              'Role / User Type',
              'Institute / Tenant',
              'Joined Date',
              { label: 'Status', align: 'center' }
            ]}
          >
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3.5 py-8 text-center text-slate-400">
                  <Loader2 size={20} className="animate-spin inline-block mr-2" />
                  Loading recent users...
                </td>
              </tr>
            ) : !stats?.recently_registered_users || stats.recently_registered_users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3.5 py-6 text-center text-slate-400">
                  No recent user registrations found
                </td>
              </tr>
            ) : (
              stats.recently_registered_users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3.5 py-3 text-sm">
                    <div className="text-slate-900 font-semibold">{user.name}</div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                  </td>
                  <td className="px-3.5 py-3 text-sm">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {user.user_type?.replace(/_/g, ' ')?.toUpperCase() || 'USER'}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-slate-600 text-sm font-medium">
                    {user.tenant_name || 'Vidya Setu Platform'}
                  </td>
                  <td className="px-3.5 py-3 text-slate-500 text-sm font-medium whitespace-nowrap">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-3.5 py-3 text-center whitespace-nowrap">
                    {getStatusBadge(user.status || 'active')}
                  </td>
                </tr>
              ))
            )}
          </Table>
        </div>
      </div>
    </div>
  );
};
