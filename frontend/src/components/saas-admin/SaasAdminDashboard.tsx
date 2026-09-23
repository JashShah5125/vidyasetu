import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
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
  AlertOctagon,
  Loader2,
  Layers,
  TrendingUp,
  CreditCard,
  Banknote,
  AlertTriangle,
  ArrowRight,
  UserCheck,
  Users,
  UserPlus,
  Filter,
  RefreshCw,
  PieChart as PieIcon,
  BarChart3,
  Activity,
  Calendar,
} from 'lucide-react';
import api from '../../services/api';
import {
  ChartContainer,
  type ChartConfig,
} from '../ui/chart';
import { Table } from '../ui/Table';

export type DatePreset = 'daily' | 'weekly' | 'monthly';

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
  expiring_renewals_count?: number;
  new_tenants?: number;
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
  time_range?: string;
  interval_days?: number;
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

const statusChartConfig: ChartConfig = {
  active: { label: 'Active', color: '#10b981' },
  draft: { label: 'Draft', color: '#f59e0b' },
  suspended: { label: 'Suspended', color: '#ef4444' },
  expired: { label: 'Expired', color: '#64748b' },
};

const userStatusChartConfig: ChartConfig = {
  active: { label: 'Active', color: '#10b981' },
  inactive: { label: 'Inactive', color: '#94a3b8' },
  suspended: { label: 'Suspended', color: '#ef4444' },
  expired: { label: 'Expired', color: '#f59e0b' },
};

export const SaasAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<DatePreset>('monthly');
  const [activeEcosystemTab, setActiveEcosystemTab] = useState<'tenants' | 'users'>('tenants');
  const [activeTableTab, setActiveTableTab] = useState<'expiring' | 'payments' | 'users'>('expiring');

  const [stats, setStats] = useState<SaasStats | null>(null);
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendItem[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [expiringLimit, setExpiringLimit] = useState<string>('5');
  const [loading, setLoading] = useState(true);
  const [hoveredStatusIndex, setHoveredStatusIndex] = useState<number | null>(null);
  const [hoveredUserStatusIndex, setHoveredUserStatusIndex] = useState<number | null>(null);

  const computeDates = (p: DatePreset) => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (p === 'daily') {
      return { from: fmt(today), to: fmt(today) };
    }
    if (p === 'weekly') {
      const past7 = new Date(today);
      past7.setDate(today.getDate() - 6);
      return { from: fmt(past7), to: fmt(today) };
    }
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: fmt(firstOfMonth), to: fmt(today) };
  };

  const formatINR = (n: number) => {
    const val = Math.round(n);
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2).replace(/\.00$/, '')}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2).replace(/\.00$/, '')}L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

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

  const fetchStats = async () => {
    try {
      setLoading(true);
      const dates = computeDates(preset);
      const { data } = await api.get('/admin/dashboard/saas-stats', {
        params: {
          expiring_limit: expiringLimit,
          preset,
          time_range: preset,
          startDate: dates.from,
          endDate: dates.to
        }
      });
      if (data.status === 'success') setStats(data.data);
    } catch (err) {
      console.error('Failed to load SaaS dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBillingData = async () => {
    try {
      const dates = computeDates(preset);
      const { data: billingData } = await api.get('/admin/billing/summary', {
        params: {
          year: selectedYear,
          month: selectedMonth,
          preset,
          time_range: preset,
          startDate: dates.from,
          endDate: dates.to
        }
      });
      if (billingData.status === 'success') setBilling(billingData.data);

      const { data: revenueData } = await api.get('/admin/dashboard/saas-revenue', {
        params: {
          year: selectedYear,
          month: selectedMonth,
          preset,
          time_range: preset,
          startDate: dates.from,
          endDate: dates.to
        }
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

  useEffect(() => {
    fetchStats();
  }, [preset, expiringLimit]);

  useEffect(() => {
    fetchBillingData();
  }, [preset, selectedYear, selectedMonth]);

  const handleRefresh = () => {
    fetchStats();
    fetchBillingData();
  };

  // Status donut chart data
  const statusPieData = React.useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Active', value: stats.active_tenants || 0, color: '#10b981', key: 'active' },
      { name: 'Draft', value: stats.draft_tenants || 0, color: '#f59e0b', key: 'draft' },
      { name: 'Suspended', value: stats.suspended_tenants || 0, color: '#ef4444', key: 'suspended' },
      { name: 'Expired', value: stats.expired_tenants || 0, color: '#64748b', key: 'expired' },
    ].filter(item => item.value > 0);
  }, [stats]);

  // User status donut chart data
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Active
          </span>
        );
      case '2':
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={10} />
            Draft
          </span>
        );
      case '0':
      case 'suspended':
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
            <AlertOctagon size={10} />
            Inactive
          </span>
        );
      case '3':
      case 'deleted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-300">
            Deleted
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <AlertTriangle size={10} />
            Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-50 text-slate-600 border border-slate-200">
            {status || 'Unknown'}
          </span>
        );
    }
  };

  const getRoleBadge = (role: string | null | undefined) => {
    const text = (role || 'USER').replace(/_/g, ' ').toUpperCase();
    const normalized = (role || '').toLowerCase().trim();

    let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';

    if (normalized.includes('parent') || normalized.includes('guardian')) {
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
    } else if (normalized.includes('student') || normalized.includes('learner')) {
      colorClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    } else if (normalized.includes('finance') || normalized.includes('accountant') || normalized.includes('acc')) {
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (normalized.includes('teacher') || normalized.includes('faculty') || normalized.includes('instructor')) {
      colorClasses = 'bg-teal-50 text-teal-700 border-teal-200';
    } else if (normalized.includes('counsel')) {
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
    } else if (normalized.includes('branch')) {
      colorClasses = 'bg-sky-50 text-sky-700 border-sky-200';
    } else if (normalized.includes('inst') || normalized.includes('institute') || normalized.includes('owner')) {
      colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
    } else if (normalized.includes('saas') || normalized.includes('super')) {
      colorClasses = 'bg-purple-50 text-purple-700 border-purple-200';
    }

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider border shadow-2xs ${colorClasses}`}>
        {text}
      </span>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in pb-8">
      {/* ── HEADER: Title + Granularity Pills + Refresh ─────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Overview and Tenant Insights
            </h1>

          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-tenant infrastructure, revenue intelligence, and platform health telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {/* Day / Week / Month Toggle Pills */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setPreset('daily')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${preset === 'daily'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setPreset('weekly')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${preset === 'weekly'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setPreset('monthly')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${preset === 'monthly'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
            >
              Monthly
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh dashboard telemetry"
            className="flex items-center gap-1.5 h-8 px-2.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
          >
            <RefreshCw
              size={13}
              className={`transition-transform duration-500 ${loading ? 'animate-spin text-slate-400' : 'text-slate-500 group-hover:rotate-180'
                }`}
            />
            <span className="hidden md:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* ── ROW 1: COMPACT EXECUTIVE KPI CARDS (6 in a row) ────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: Active Tenants */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Tenants</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <Building2 size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900">
                {loading ? <Loader2 size={16} className="animate-spin text-slate-300" /> : (stats?.active_tenants ?? 0)}
              </span>
              <span className="text-[10px] font-bold text-slate-400">/ {stats?.total_tenants ?? 0} total</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
              {stats?.draft_tenants ? `${stats.draft_tenants} in onboarding` : '100% operational'}
            </span>
          </div>
        </div>

        {/* KPI 2: MRR */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monthly MRR</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-emerald-700 block">
              {loading ? <Loader2 size={16} className="animate-spin text-slate-300" /> : formatINR(billing?.mrr || stats?.total_mrr || 0)}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Normalized monthly rate</span>
          </div>
        </div>

        {/* KPI 3: Collected Revenue */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Collected Revenue</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
              <Banknote size={14} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-slate-900 block">
              {loading ? <Loader2 size={16} className="animate-spin text-slate-300" /> : formatINR(billing?.collected_revenue || 0)}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5 truncate">
              Inv: {formatINR(billing?.total_revenue || 0)}
            </span>
          </div>
        </div>

        {/* KPI 4: Outstanding */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outstanding</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <AlertOctagon size={14} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-amber-600 block">
              {loading ? <Loader2 size={16} className="animate-spin text-slate-300" /> : formatINR(billing?.outstanding || 0)}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Unpaid invoices</span>
          </div>
        </div>

        {/* KPI 5: Total Users */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Users</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
              <Users size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-900">
                {loading ? <Loader2 size={16} className="animate-spin text-slate-300" /> : (stats?.user_metrics?.active_users ?? 0)}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">/ {stats?.user_metrics?.total_users ?? 0}</span>
            </div>
            <span className="text-[10px] text-indigo-600 font-bold block mt-0.5">
              +{stats?.user_metrics?.new_users ?? 0} {preset === 'daily' ? 'today' : preset === 'weekly' ? 'this wk' : 'this mo'}
            </span>
          </div>
        </div>

        {/* KPI 6: Expiring Soon */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expiring Renewals</span>
            <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 border border-red-200 flex items-center justify-center">
              <AlertTriangle size={14} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-red-600 block">
              {loading ? <Loader2 size={16} className="animate-spin text-slate-300" /> : (stats?.expiring_renewals_count ?? 0)}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Institutes requiring attention</span>
          </div>
        </div>
      </div>

      {/* ── ROW 2: DENSE TWO-COLUMN GRAPHS (Revenue Area Chart + Ecosystem Hub) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 7 cols: Platform Revenue Growth Trend */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-sm">
                  {preset === 'daily'
                    ? 'Daily Revenue Trajectory (7 Days)'
                    : preset === 'weekly'
                      ? 'Weekly Revenue Trajectory (8 Weeks)'
                      : `Revenue Collection Trend (${selectedYear === 'all' ? 'All-Time / ' + new Date().getFullYear() : selectedYear})`}
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Real-time paid invoice receipts aggregated by period</p>
            </div>

            {/* Academic Year & Month Filters */}
            <div className="flex items-center gap-1.5 text-xs self-start sm:self-auto">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="h-7 text-[11px] font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-800 outline-none cursor-pointer hover:bg-slate-100/80"
              >
                <option value="all">All AY</option>
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

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-7 text-[11px] font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-800 outline-none cursor-pointer hover:bg-slate-100/80"
              >
                <option value="all">All Months</option>
                <option value="1">Jan</option>
                <option value="2">Feb</option>
                <option value="3">Mar</option>
                <option value="4">Apr</option>
                <option value="5">May</option>
                <option value="6">Jun</option>
                <option value="7">Jul</option>
                <option value="8">Aug</option>
                <option value="9">Sep</option>
                <option value="10">Oct</option>
                <option value="11">Nov</option>
                <option value="12">Dec</option>
              </select>
            </div>
          </div>

          {/* Area / Bar Chart */}
          <div className="w-full h-52 outline-none focus:outline-none focus-visible:outline-none select-none [&_*]:outline-none [&_*]:focus:outline-none">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-slate-300" />
              </div>
            ) : revenueTrend.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                No revenue trend data for selected period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }}>
                <AreaChart
                  data={revenueTrend.map(t => ({ month: t.m, revenue: t.raw_val, isCurrent: t.isCurrent }))}
                  margin={{ top: 10, right: 12, left: -15, bottom: 0 }}
                  style={{ outline: 'none' }}
                >
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                  />
                  <YAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickFormatter={(v: number) => {
                      if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
                      if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
                      return `₹${v.toLocaleString('en-IN')}`;
                    }}
                  />
                  <Tooltip
                    cursor={{ stroke: '#6366f1', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      fontSize: '11px',
                      fontWeight: 700,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                    }}
                    formatter={(val) => [Number(val) > 0 ? formatINR(Number(val)) : '—', 'Collected']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#revenueGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500 font-medium">
              Annual Projected (ARR): <strong className="text-indigo-600 font-bold">{formatINR(billing?.arr || 0)}</strong>
            </span>
            <span className="text-slate-500 font-medium">
              Avg / Active Tenant: <strong className="text-emerald-700 font-bold">₹{stats && stats.active_tenants > 0 ? Math.round(stats.total_mrr / stats.active_tenants).toLocaleString() : 0} / mo</strong>
            </span>
          </div>
        </div>

        {/* Right 5 cols: Ecosystem & Breakdown Hub (Donut + Bars) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3">
          {/* Sub-Tabs: Tenants vs Users */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveEcosystemTab('tenants')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${activeEcosystemTab === 'tenants'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                <PieIcon size={12} />
                Tenants & Plans
              </button>
              <button
                type="button"
                onClick={() => setActiveEcosystemTab('users')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${activeEcosystemTab === 'users'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                <Users size={12} />
                Users & Roles
              </button>
            </div>

            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {activeEcosystemTab === 'tenants' ? 'Tenant Distribution' : 'User Base Breakdown'}
            </span>
          </div>

          {activeEcosystemTab === 'tenants' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 items-center">
                {/* Donut Chart */}
                <div className="col-span-5 relative h-36 flex items-center justify-center">
                  {loading ? (
                    <Loader2 size={20} className="animate-spin text-slate-300" />
                  ) : statusPieData.length === 0 ? (
                    <span className="text-[10px] text-slate-400">No status data</span>
                  ) : (
                    <ChartContainer config={statusChartConfig} className="h-36 w-full">
                      <PieChart margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                        <Pie
                          data={statusPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={36}
                          outerRadius={52}
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
                              strokeWidth={hoveredStatusIndex === index ? 2 : 0}
                              className="cursor-pointer transition-all duration-150"
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                  )}
                  {!loading && stats && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-base font-black text-slate-900 leading-none">{stats.total_tenants}</span>
                      <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Tenants</span>
                    </div>
                  )}
                </div>

                {/* Status Chips */}
                <div className="col-span-7 grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-emerald-50/60 border border-emerald-100">
                    <span className="text-slate-600 font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Active
                    </span>
                    <strong className="text-emerald-900 font-bold">{stats?.active_tenants ?? 0}</strong>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-amber-50/60 border border-amber-100">
                    <span className="text-slate-600 font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" /> Draft
                    </span>
                    <strong className="text-amber-900 font-bold">{stats?.draft_tenants ?? 0}</strong>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-red-50/60 border border-red-100">
                    <span className="text-slate-600 font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500" /> Suspended
                    </span>
                    <strong className="text-red-900 font-bold">{stats?.suspended_tenants ?? 0}</strong>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-100/60 border border-slate-200">
                    <span className="text-slate-600 font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-slate-400" /> Expired
                    </span>
                    <strong className="text-slate-900 font-bold">{stats?.expired_tenants ?? 0}</strong>
                  </div>
                </div>
              </div>

              {/* Plan Distribution Progress list */}
              <div className="border-t border-slate-100 pt-2 space-y-1.5">
                {(() => {
                  const totalSubscribed = (stats?.plan_distribution || []).reduce((acc, p) => acc + Number(p.count || 0), 0) || (stats?.total_tenants || 1);
                  return (
                    <>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Subscription Tier Adoption</span>
                        <span>{totalSubscribed} {totalSubscribed === 1 ? 'Tenant' : 'Tenants'} ({stats?.total_plans || 0} Plans)</span>
                      </div>
                      {(!stats?.plan_distribution || stats.plan_distribution.length === 0) ? (
                        <div className="text-[11px] text-slate-400 py-1 text-center">No plan adoption data</div>
                      ) : (
                        stats.plan_distribution.map((item, idx) => {
                          const pct = totalSubscribed > 0
                            ? Number(((item.count / totalSubscribed) * 100).toFixed(1))
                            : 0;
                          return (
                            <div key={idx} className="space-y-0.5">
                              <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                                <span className="truncate">{item.plan}</span>
                                <span className="text-slate-900 font-bold">
                                  {item.count} {item.count === 1 ? 'Institute' : 'Institutes'} ({pct}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(pct, 100)}%`,
                                    backgroundColor: ['#6366f1', '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981'][idx % 5]
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 items-center">
                {/* User Donut Chart */}
                <div className="col-span-5 relative h-36 flex items-center justify-center">
                  {loading ? (
                    <Loader2 size={20} className="animate-spin text-slate-300" />
                  ) : userStatusPieData.length === 0 ? (
                    <span className="text-[10px] text-slate-400">No user metrics</span>
                  ) : (
                    <ChartContainer config={userStatusChartConfig} className="h-36 w-full">
                      <PieChart margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                        <Pie
                          data={userStatusPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={36}
                          outerRadius={52}
                          paddingAngle={3}
                          dataKey="value"
                          onMouseEnter={(_, index) => setHoveredUserStatusIndex(index)}
                          onMouseLeave={() => setHoveredUserStatusIndex(null)}
                        >
                          {userStatusPieData.map((entry, index) => (
                            <Cell
                              key={`user-cell-${index}`}
                              fill={entry.color}
                              stroke={hoveredUserStatusIndex === index ? '#ffffff' : 'none'}
                              strokeWidth={hoveredUserStatusIndex === index ? 2 : 0}
                              className="cursor-pointer transition-all duration-150"
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                  )}
                  {!loading && stats?.user_metrics && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-base font-black text-slate-900 leading-none">{stats.user_metrics.total_users}</span>
                      <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Users</span>
                    </div>
                  )}
                </div>

                {/* User Status Badges */}
                <div className="col-span-7 grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-emerald-50/60 border border-emerald-100">
                    <span className="text-slate-600 font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Active
                    </span>
                    <strong className="text-emerald-900 font-bold">{stats?.user_metrics?.active_users ?? 0}</strong>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-600 font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-slate-400" /> Inactive
                    </span>
                    <strong className="text-slate-900 font-bold">{stats?.user_metrics?.inactive_users ?? 0}</strong>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-red-50/60 border border-red-100">
                    <span className="text-slate-600 font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500" /> Suspended
                    </span>
                    <strong className="text-red-900 font-bold">{stats?.user_metrics?.suspended_users ?? 0}</strong>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-blue-50/60 border border-blue-100">
                    <span className="text-slate-600 font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500" /> New
                    </span>
                    <strong className="text-blue-900 font-bold">{stats?.user_metrics?.new_users ?? 0}</strong>
                  </div>
                </div>
              </div>

              {/* Roles Breakdown */}
              <div className="border-t border-slate-100 pt-2 space-y-1.5">
                {(() => {
                  const totalUsers = (stats?.user_role_distribution || []).reduce((acc, u) => acc + Number(u.count || 0), 0) || (stats?.user_metrics?.total_users || 1);
                  return (
                    <>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Role Distribution</span>
                        <span>{totalUsers} {totalUsers === 1 ? 'User' : 'Users'}</span>
                      </div>
                      {(!stats?.user_role_distribution || stats.user_role_distribution.length === 0) ? (
                        <div className="text-[11px] text-slate-400 py-1 text-center">No role metrics available</div>
                      ) : (
                        stats.user_role_distribution.map((item, idx) => {
                          const pct = totalUsers > 0
                            ? Number(((item.count / totalUsers) * 100).toFixed(1))
                            : 0;
                          return (
                            <div key={idx} className="space-y-0.5">
                              <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                                <span className="truncate capitalize">{item.user_type?.replace(/_/g, ' ')}</span>
                                <span className="text-slate-900 font-bold">
                                  {item.count} {item.count === 1 ? 'User' : 'Users'} ({pct}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(pct, 100)}%`,
                                    backgroundColor: ['#3b82f6', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b'][idx % 5]
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── ROW 3: UNIFIED HIGH-DENSITY ACTIVITY CENTER (Segmented Table Tabs) ── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
        {/* Table Selector Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
          {/* Segmented Table Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTableTab('expiring')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTableTab === 'expiring'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <span>Expiring Renewals</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700">
                {stats?.expiring_renewals_count ?? stats?.expiring_tenants?.length ?? 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTableTab('payments')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTableTab === 'payments'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <span>Recent Payments</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700">
                {billing?.recent_payments?.length || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTableTab('users')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTableTab === 'users'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <span>Recent Users</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700">
                {stats?.recently_registered_users?.length || 0}
              </span>
            </button>
          </div>

          {/* Contextual Action Link */}
          <div className="flex items-center gap-3 text-xs font-bold">
            {activeTableTab === 'expiring' && (
              <>
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                  <span className="text-slate-400 text-[11px]">Limit:</span>
                  <select
                    value={expiringLimit}
                    onChange={(e) => setExpiringLimit(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer text-xs"
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="all">All</option>
                  </select>
                </div>
                <button
                  onClick={() => navigate('/tenants')}
                  className="text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  Tenants Registry <ArrowRight size={12} />
                </button>
              </>
            )}

            {activeTableTab === 'payments' && (
              <button
                onClick={() => navigate('/billing')}
                className="text-emerald-600 hover:text-emerald-800 transition-colors flex items-center gap-1 cursor-pointer"
              >
                All Invoices & Receipts <ArrowRight size={12} />
              </button>
            )}

            {activeTableTab === 'users' && (
              <button
                onClick={() => navigate('/users-and-roles')}
                className="text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 cursor-pointer"
              >
                Manage All Users <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Table Content */}
        {activeTableTab === 'expiring' && (
          <Table
            dense
            minWidth="760px"
            colWidths={['180px', '130px', '110px', '110px', '120px', '80px', '70px']}
            headers={[
              'Institute Name',
              'Current Plan',
              'Start Date',
              'Renewal / End Date',
              'Time Remaining',
              { label: 'Status', align: 'center' },
              { label: 'Action', align: 'right' }
            ]}
          >
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-400 text-xs">
                  <Loader2 size={16} className="animate-spin inline-block mr-2" />
                  Loading renewal schedule...
                </td>
              </tr>
            ) : !stats?.expiring_tenants || stats.expiring_tenants.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-400 text-xs">
                  No expiring tenant subscriptions found
                </td>
              </tr>
            ) : (
              stats.expiring_tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2.5 text-xs">
                    <div className="font-bold text-slate-900">{tenant.name}</div>
                    <div className="text-[10px] text-slate-400">{tenant.admin_email || tenant.slug}</div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-700 font-medium">
                    {tenant.plan_name || 'Standard Tier'}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                    {tenant.start_date ? new Date(tenant.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-700 font-semibold whitespace-nowrap">
                    {tenant.end_date ? new Date(tenant.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                    {(() => {
                      const days = tenant.days_left;
                      if (days !== null && days < 0) {
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-100 text-red-700">
                            Expired ({Math.abs(days)}d ago)
                          </span>
                        );
                      }
                      if (days !== null && days <= 7) {
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-50 text-red-600 border border-red-200">
                            {days} days left
                          </span>
                        );
                      }
                      if (days !== null && days <= 30) {
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            {days} days left
                          </span>
                        );
                      }
                      return (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {days !== null ? `${days} days left` : 'Active'}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-2.5 text-center whitespace-nowrap">
                    {getStatusBadge(tenant.status)}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => navigate(`/tenants/${tenant.id}`)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-900 hover:underline cursor-pointer"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))
            )}
          </Table>
        )}

        {activeTableTab === 'payments' && (
          <Table
            dense
            minWidth="740px"
            colWidths={['110px', '180px', '130px', '110px', '110px', '100px']}
            headers={[
              'Invoice No.',
              'Institute / Tenant',
              'Plan Tier',
              'Payment Date',
              { label: 'Amount Paid', align: 'right' },
              { label: 'Status', align: 'center' }
            ]}
          >
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-400 text-xs">
                  <Loader2 size={16} className="animate-spin inline-block mr-2" />
                  Loading payments...
                </td>
              </tr>
            ) : !billing?.recent_payments || billing.recent_payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-400 text-xs">
                  No payment transactions found for this period
                </td>
              </tr>
            ) : (
              billing.recent_payments.map((pmt) => (
                <tr key={pmt.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2.5 font-bold text-slate-900 text-xs whitespace-nowrap">
                    {pmt.invoice_number}
                  </td>
                  <td className="px-3 py-2.5 text-slate-800 text-xs font-semibold">
                    {pmt.tenant_name}
                  </td>
                  <td className="px-3 py-2.5 text-xs whitespace-nowrap text-slate-600 font-medium">
                    {pmt.plan_name || 'Standard Tier'}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 text-xs whitespace-nowrap">
                    {pmt.payment_date ? new Date(pmt.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-black text-slate-900 text-xs whitespace-nowrap">
                    {formatINR(pmt.total_amount)}
                  </td>
                  <td className="px-3 py-2.5 text-center whitespace-nowrap">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Paid ({pmt.payment_method || 'Online'})
                    </span>
                  </td>
                </tr>
              ))
            )}
          </Table>
        )}

        {activeTableTab === 'users' && (
          <Table
            dense
            minWidth="720px"
            colWidths={['200px', '140px', '180px', '110px', '90px']}
            headers={[
              'User & Email',
              'Role / Account Type',
              'Institute / Tenant',
              'Registered Date',
              { label: 'Status', align: 'center' }
            ]}
          >
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-400 text-xs">
                  <Loader2 size={16} className="animate-spin inline-block mr-2" />
                  Loading user registrations...
                </td>
              </tr>
            ) : !stats?.recently_registered_users || stats.recently_registered_users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-400 text-xs">
                  No recent user registrations found
                </td>
              </tr>
            ) : (
              stats.recently_registered_users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2.5 text-xs">
                    <div className="text-slate-900 font-bold">{user.name}</div>
                    <div className="text-[10px] text-slate-400">{user.email}</div>
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {getRoleBadge(user.user_type)}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700 text-xs font-semibold">
                    {user.tenant_name || 'Vidya Setu Platform'}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 text-xs whitespace-nowrap">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-center whitespace-nowrap">
                    {getStatusBadge(user.status || 'active')}
                  </td>
                </tr>
              ))
            )}
          </Table>
        )}
      </div>
    </div>
  );
};
