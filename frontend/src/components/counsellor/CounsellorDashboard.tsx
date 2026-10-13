import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Phone,
  PhoneCall,
  CheckSquare,
  RefreshCw,
  Calendar,
  ChevronRight,
  Plus,
  Sparkles,
  TrendingUp,
  Layers,
  DollarSign,
  ClipboardList,
  Zap,
  Award,
  Building2,
  ArrowUpRight,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import {
  getEnquiries,
  toLead,
  type EnquiryRow
} from '../../services/enquiryApi';
import { getAcademicOptions } from '../../services/studentApi';
import type { Lead } from '../../types';

export type DatePreset = 'today' | 'weekly' | 'monthly' | 'all';
export type FunnelViewTab = 'funnel' | 'trend' | 'courses';

const SOURCE_COLORS: Record<string, string> = {
  'Walk-in': '#3b82f6',
  'Phone Call': '#f59e0b',
  'Website': '#06b6d4',
  'Social Media': '#8b5cf6',
  'WhatsApp': '#10b981',
  'Referral': '#ec4899',
  'Campaign/Event': '#f97316',
  'Google Ads': '#ef4444',
  'Other': '#64748b'
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2 rounded-xl shadow-xl border border-slate-800 text-xs">
        <div className="font-bold text-slate-200 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.payload?.color }} />
          <span>{data.name}</span>
        </div>
        <div className="mt-1 flex items-center gap-2 font-mono">
          <span className="text-white font-black text-sm">{data.value} leads</span>
          <span className="text-slate-400 font-sans text-xs">({data.payload?.pct}%)</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    if (!data) return null;
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-800 text-xs">
        <div className="font-bold text-slate-200 flex items-center gap-2">
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-bold">
            {data.stage}
          </span>
          <span>{data.name}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2 font-mono">
          <span className="text-blue-400 font-black text-sm">{data.count} leads</span>
          <span className="text-slate-400 font-sans text-xs">({data.pct}% of total)</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomAreaTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-800 text-xs">
        <div className="font-bold text-slate-300 mb-1">{label}</div>
        <div className="space-y-1 font-mono">
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-300 font-sans text-xs">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.name}:</span>
              </span>
              <span className="font-bold text-white">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const CounsellorDashboard: React.FC = () => {
  const { currentUser, addToast } = useApp();
  const navigate = useNavigate();

  // Data states
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [enquiryRows, setEnquiryRows] = useState<EnquiryRow[]>([]);
  const [mappedLeads, setMappedLeads] = useState<Lead[]>([]);
  const [, setAcademicCourses] = useState<Array<{ id: number; name: string }>>([]);

  // Active Chart Tab state
  const [funnelTab, setFunnelTab] = useState<FunnelViewTab>('funnel');

  // Filter & Search states
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sourceFilter, setSourceFilter] = useState<string>('All');

  // Fetch academic options for courses
  useEffect(() => {
    getAcademicOptions()
      .then((res) => {
        const data = res?.data || res;
        if (data?.courses && Array.isArray(data.courses)) {
          setAcademicCourses(data.courses.map((c: any) => ({ id: Number(c.id), name: c.name })));
        }
      })
      .catch((err) => console.error('Error fetching academic options in CounsellorDashboard:', err));
  }, []);

  // Fetch real enquiries from API
  const fetchEnquiriesData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const res = await getEnquiries({ limit: 500 });
      if (res && Array.isArray(res.data)) {
        const rows: EnquiryRow[] = res.data;
        setEnquiryRows(rows);
        const mapped = rows.map(toLead);
        setMappedLeads(mapped);
      } else {
        setEnquiryRows([]);
        setMappedLeads([]);
      }
    } catch (err: any) {
      console.error('Failed to load enquiries in CounsellorDashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEnquiriesData();
  }, [fetchEnquiriesData]);



  // Filter leads based on date preset
  const filteredByDateLeads = useMemo(() => {
    if (datePreset === 'all') return mappedLeads;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneWeekAgo = Date.now() - 7 * 86400000;
    const oneMonthAgo = Date.now() - 30 * 86400000;

    return mappedLeads.filter((l) => {
      const row = enquiryRows.find((r) => String(r.id) === l.id);
      const createdAtTime = row?.created_at ? new Date(row.created_at).getTime() : 0;
      if (!createdAtTime) return true;

      if (datePreset === 'today') return createdAtTime >= startOfToday;
      if (datePreset === 'weekly') return createdAtTime >= oneWeekAgo;
      if (datePreset === 'monthly') return createdAtTime >= oneMonthAgo;
      return true;
    });
  }, [mappedLeads, enquiryRows, datePreset]);

  // Calculate Key Performance Metrics
  const stats = useMemo(() => {
    const totalLeads = filteredByDateLeads.length;
    const newEnquiries = filteredByDateLeads.filter((l) => l.status === 'New Enquiry' || l.status === 'Assigned').length;
    const pendingCallbacks = filteredByDateLeads.filter(
      (l) => l.status === 'Follow-up' || l.status === 'Contacted' || Boolean(l.nextFollowUp)
    ).length;
    const interestedLeads = filteredByDateLeads.filter(
      (l) => l.status === 'Interested' || l.status === 'Demo Scheduled' || l.status === 'Fee Discussion'
    ).length;
    const convertedLeads = filteredByDateLeads.filter((l) => l.status === 'Converted').length;

    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0.0';

    return {
      totalLeads,
      newEnquiries,
      pendingCallbacks,
      interestedLeads,
      convertedLeads,
      conversionRate
    };
  }, [filteredByDateLeads]);

  // Funnel Stage Counts for Graph
  const funnelStages = useMemo(() => {
    const counts = {
      newEnquiry: 0,
      followUp: 0,
      interested: 0,
      feeDiscussion: 0,
      converted: 0
    };

    filteredByDateLeads.forEach((l) => {
      const s = l.status;
      if (s === 'New Enquiry' || s === 'Assigned') counts.newEnquiry++;
      else if (s === 'Contacted' || s === 'Follow-up') counts.followUp++;
      else if (s === 'Interested' || s === 'Demo Scheduled') counts.interested++;
      else if (s === 'Fee Discussion') counts.feeDiscussion++;
      else if (s === 'Converted') counts.converted++;
      else counts.newEnquiry++;
    });

    const total = filteredByDateLeads.length || 1;

    return [
      {
        id: 'new',
        name: 'New Enquiry',
        stage: 'Stage 1',
        count: counts.newEnquiry,
        pct: Math.round((counts.newEnquiry / total) * 100),
        color: '#3b82f6',
        filterVal: 'New Enquiry'
      },
      {
        id: 'followup',
        name: 'Follow-up',
        stage: 'Stage 2',
        count: counts.followUp,
        pct: Math.round((counts.followUp / total) * 100),
        color: '#f59e0b',
        filterVal: 'Follow-up'
      },
      {
        id: 'interested',
        name: 'Interested',
        stage: 'Stage 3',
        count: counts.interested,
        pct: Math.round((counts.interested / total) * 100),
        color: '#10b981',
        filterVal: 'Interested'
      },
      {
        id: 'fee',
        name: 'Fee Discussion',
        stage: 'Stage 4',
        count: counts.feeDiscussion,
        pct: Math.round((counts.feeDiscussion / total) * 100),
        color: '#06b6d4',
        filterVal: 'Fee Discussion'
      },
      {
        id: 'converted',
        name: 'Admissions Closed',
        stage: 'Stage 5',
        count: counts.converted,
        pct: Math.round((counts.converted / total) * 100),
        color: '#8b5cf6',
        filterVal: 'Converted'
      }
    ];
  }, [filteredByDateLeads]);

  // Lead Acquisition Source Breakdown for Pie Chart
  const sourceBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredByDateLeads.forEach((l) => {
      const src = l.source || 'Walk-in';
      counts[src] = (counts[src] || 0) + 1;
    });

    const total = filteredByDateLeads.length || 1;
    return Object.entries(counts)
      .map(([source, count]) => ({
        source,
        count,
        pct: Math.round((count / total) * 100),
        color: SOURCE_COLORS[source] || '#64748b'
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredByDateLeads]);

  const channelPieData = useMemo(() => {
    return sourceBreakdown.map((item) => ({
      name: item.source,
      value: item.count,
      pct: item.pct,
      color: item.color
    }));
  }, [sourceBreakdown]);

  // Dynamic monthly timeline trend computed from real database records (Assessment Year cycle: April to March)
  const monthlyTrendData = useMemo(() => {
    const ayMonths = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const calendarMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthMap: Record<string, { total: number; converted: number }> = {};

    ayMonths.forEach((m) => {
      monthMap[m] = { total: 0, converted: 0 };
    });

    enquiryRows.forEach((r) => {
      if (!r.created_at) return;
      const d = new Date(r.created_at);
      if (isNaN(d.getTime())) return;
      const mName = calendarMonthNames[d.getMonth()];
      if (monthMap[mName]) {
        monthMap[mName].total++;
        if (Number(r.status) === 7) {
          monthMap[mName].converted++;
        }
      }
    });

    return ayMonths.map((m) => ({
      month: m,
      enquiries: monthMap[m].total,
      converted: monthMap[m].converted
    }));
  }, [enquiryRows]);

  // Course Demand Breakdown
  const courseDemandData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredByDateLeads.forEach((l) => {
      const c = l.course || 'General';
      counts[c] = (counts[c] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({
        name: name.length > 16 ? name.slice(0, 16) + '...' : name,
        fullName: name,
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredByDateLeads]);



  const branchLabel = currentUser?.branch || currentUser?.tenantName || 'Main Campus';

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── Top Header Section with Role Badge & Action Toolbar ── */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/90 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Counsellor CRM • Admissions Desk
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                <Building2 size={13} className="text-slate-500" />
                {branchLabel}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-slate-900 tracking-tight">
              Admissions &amp; Enquiry CRM Desk
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
              Welcome back, <strong className="font-bold text-slate-800">{currentUser?.name || 'Counsellor'}</strong>. Monitor lead velocity, close admissions, and manage daily callback priorities.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2.5 shrink-0 self-end lg:self-center">
            {/* Row 1: Time Filters & Refresh */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Date Preset Filter */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                {(['all', 'today', 'weekly', 'monthly'] as DatePreset[]).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDatePreset(preset)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
                      datePreset === preset
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {preset === 'all' ? 'All Time' : preset === 'today' ? 'Today' : preset === 'weekly' ? 'This Week' : 'This Month'}
                  </button>
                ))}
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => fetchEnquiriesData(true)}
                disabled={refreshing}
                title="Refresh CRM Data"
                className="group flex items-center gap-1.5 h-8 px-2.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
              >
                <RefreshCw size={13} className={`transition-transform duration-500 ${refreshing ? 'animate-spin text-slate-400' : 'text-slate-500 group-hover:rotate-180 group-hover:text-slate-700'}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>

            {/* Row 2: "+ Log New Enquiry" Button shifted to right corner */}
            <Button
              variant="primary"
              onClick={() => {
                const leadsRoute = currentUser?.role === 'branch-admin'
                  ? '/branch/leads'
                  : currentUser?.role === 'inst-admin'
                  ? '/admin/leads'
                  : '/counsellor/leads';
                navigate(`${leadsRoute}?action=new`, { state: { openAddLead: true, fromDashboard: true } });
              }}
              className="flex items-center gap-1.5 cursor-pointer h-9 px-3.5 text-xs font-bold rounded-xl shadow-xs transition-transform active:scale-95"
              style={{ backgroundColor: '#2563eb', color: 'white' }}
            >
              <Plus size={14} className="stroke-[2.5]" />
              <span>Log New Enquiry</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Executive 4-Column KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inflow Card */}
        <div className="group relative overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200">
          <div className="absolute top-0 right-0 w-32 h-32 bg-radial from-blue-500/10 via-transparent to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Inflow Leads
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center ring-4 ring-blue-50/60 shadow-xs transition-transform group-hover:scale-105">
              <Users size={20} className="stroke-[2.2]" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono text-slate-900 tracking-tight">
            {stats.totalLeads}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>{stats.newEnquiries} fresh enquiries recorded</span>
          </div>
        </div>

        {/* Pending Callbacks Card */}
        <div className="group relative overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200">
          <div className="absolute top-0 right-0 w-32 h-32 bg-radial from-amber-500/10 via-transparent to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Pending Callbacks
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center ring-4 ring-amber-50/60 shadow-xs transition-transform group-hover:scale-105">
              <PhoneCall size={20} className="stroke-[2.2]" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono text-amber-600 tracking-tight">
            {stats.pendingCallbacks}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Scheduled touchpoints awaiting call</span>
          </div>
        </div>

        {/* Interested Leads Card */}
        <div className="group relative overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200">
          <div className="absolute top-0 right-0 w-32 h-32 bg-radial from-emerald-500/10 via-transparent to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              High-Intent / Interested
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center ring-4 ring-emerald-50/60 shadow-xs transition-transform group-hover:scale-105">
              <Sparkles size={20} className="stroke-[2.2]" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono text-emerald-700 tracking-tight">
            {stats.interestedLeads}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Demo or fee negotiation active</span>
          </div>
        </div>

        {/* Admissions Conversion Card */}
        <div className="group relative overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200">
          <div className="absolute top-0 right-0 w-32 h-32 bg-radial from-purple-500/10 via-transparent to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Admissions Conversion
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center ring-4 ring-purple-50/60 shadow-xs transition-transform group-hover:scale-105">
              <Award size={20} className="stroke-[2.2]" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono text-purple-700 tracking-tight">
            {stats.conversionRate}%
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span>{stats.convertedLeads} students confirmed &amp; enrolled</span>
          </div>
        </div>
      </div>

      {/* ── 5-Phase Lifecycle Workflow Ribbon ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Admissions Pipeline Lifecycle Stages
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Click any phase to open CRM view</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {/* Phase 1 */}
          <div
            onClick={() => navigate('/counsellor/leads')}
            className="cursor-pointer bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/10 rounded-xl p-3 transition-all hover:scale-[1.02] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-300">Phase 1</span>
              <Users size={14} className="text-blue-400" />
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-white">Lead Pipeline</div>
              <div className="text-[11px] text-slate-300 mt-0.5">{stats.newEnquiries} Inflow Leads</div>
            </div>
            <div className="mt-2.5 flex items-center text-[10px] text-blue-300 font-semibold gap-1">
              <span>View Roster</span>
              <ArrowUpRight size={11} />
            </div>
          </div>

          {/* Phase 2 */}
          <div
            onClick={() => navigate('/counsellor/leads/fee')}
            className="cursor-pointer bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/10 rounded-xl p-3 transition-all hover:scale-[1.02] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-300">Phase 2</span>
              <DollarSign size={14} className="text-cyan-400" />
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-white">Fee Discussion</div>
              <div className="text-[11px] text-slate-300 mt-0.5">Pricing &amp; Discounts</div>
            </div>
            <div className="mt-2.5 flex items-center text-[10px] text-cyan-300 font-semibold gap-1">
              <span>Configure Fees</span>
              <ArrowUpRight size={11} />
            </div>
          </div>

          {/* Phase 3 */}
          <div
            onClick={() => navigate('/counsellor/leads/admission')}
            className="cursor-pointer bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/10 rounded-xl p-3 transition-all hover:scale-[1.02] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">Phase 3</span>
              <ClipboardList size={14} className="text-amber-400" />
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-white">Admission &amp; Docs</div>
              <div className="text-[11px] text-slate-300 mt-0.5">Document Audit</div>
            </div>
            <div className="mt-2.5 flex items-center text-[10px] text-amber-300 font-semibold gap-1">
              <span>Verify Docs</span>
              <ArrowUpRight size={11} />
            </div>
          </div>

          {/* Phase 4 */}
          <div
            onClick={() => navigate('/counsellor/leads/batch')}
            className="cursor-pointer bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/10 rounded-xl p-3 transition-all hover:scale-[1.02] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300">Phase 4</span>
              <Layers size={14} className="text-indigo-400" />
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-white">Batch Allocation</div>
              <div className="text-[11px] text-slate-300 mt-0.5">Classroom &amp; Group</div>
            </div>
            <div className="mt-2.5 flex items-center text-[10px] text-indigo-300 font-semibold gap-1">
              <span>Allocate Batches</span>
              <ArrowUpRight size={11} />
            </div>
          </div>

          {/* Phase 5 */}
          <div
            onClick={() => navigate('/counsellor/leads/payment')}
            className="cursor-pointer bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/10 rounded-xl p-3 transition-all hover:scale-[1.02] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">Phase 5</span>
              <Zap size={14} className="text-emerald-400" />
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-white">Payment &amp; Activation</div>
              <div className="text-[11px] text-slate-300 mt-0.5">Token Receipt &amp; Roll</div>
            </div>
            <div className="mt-2.5 flex items-center text-[10px] text-emerald-300 font-semibold gap-1">
              <span>Collect &amp; Activate</span>
              <ArrowUpRight size={11} />
            </div>
          </div>
        </div>
      </div>

      {/* ── REDESIGNED SECTION: Dynamic Database Charts & Donut Graphs ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Chart Card: Interactive Recharts Funnel & Analytics (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 size={17} className="text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Admissions Velocity &amp; Pipeline Analytics
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dynamic database telemetry of lead conversion stages &amp; monthly inflow.
                </p>
              </div>

              {/* Chart Mode Switcher Pills */}
              <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFunnelTab('funnel')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    funnelTab === 'funnel'
                      ? 'bg-white text-slate-900 font-bold shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Funnel Stages
                </button>
                <button
                  type="button"
                  onClick={() => setFunnelTab('trend')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    funnelTab === 'trend'
                      ? 'bg-white text-slate-900 font-bold shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Monthly Trend (Apr–Mar)
                </button>
                <button
                  type="button"
                  onClick={() => setFunnelTab('courses')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    funnelTab === 'courses'
                      ? 'bg-white text-slate-900 font-bold shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Course Demand
                </button>
              </div>
            </div>

            {/* Dynamic Graph Container */}
            <div className="h-64 w-full pt-2">
              {funnelTab === 'funnel' && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={funnelStages}
                    margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Bar
                      dataKey="count"
                      radius={[8, 8, 0, 0]}
                      onClick={(data: any) => {
                        const targetVal = data?.filterVal || data?.payload?.filterVal;
                        if (targetVal) {
                          setStatusFilter((prev) => (prev === targetVal ? 'All' : targetVal));
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {funnelStages.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={statusFilter === entry.filterVal ? '#1d4ed8' : entry.color}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}

              {funnelTab === 'trend' && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={monthlyTrendData}
                    margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="colorEnquiries" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorConverted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomAreaTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="enquiries"
                      name="Total Enquiries"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorEnquiries)"
                    />
                    <Area
                      type="monotone"
                      dataKey="converted"
                      name="Admissions Closed"
                      stroke="#8b5cf6"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorConverted)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {funnelTab === 'courses' && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={courseDemandData}
                    layout="vertical"
                    margin={{ top: 10, right: 20, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }}
                      width={110}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(val: any, _: any, item: any) => [`${val} Enquiries`, item.payload?.fullName]}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                <span>Active Leads</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
                <span>Admissions Closed</span>
              </span>
            </div>
            <span className="font-bold font-mono text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200/80">
              {stats.conversionRate}% Conversion Benchmark
            </span>
          </div>
        </div>

        {/* Right Chart Card: Interactive Recharts Donut & Source Breakdown (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <PieChartIcon size={17} className="text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Lead Acquisition Channels (Pie Chart)
                </h3>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Distribution of incoming student touchpoints sourced from active campaigns.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
              {/* Donut Chart */}
              <div className="w-40 h-40 relative shrink-0">
                {channelPieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip content={<CustomPieTooltip />} />
                        <Pie
                          data={channelPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={46}
                          outerRadius={70}
                          paddingAngle={3}
                          className="cursor-pointer"
                          onClick={(data) => {
                            if (data?.name) {
                              setSourceFilter((prev) => (prev === data.name ? 'All' : data.name));
                            }
                          }}
                        >
                          {channelPieData.map((entry, index) => (
                            <Cell
                              key={`source-cell-${index}`}
                              fill={entry.color}
                              stroke={sourceFilter === entry.name ? '#0f172a' : '#ffffff'}
                              strokeWidth={sourceFilter === entry.name ? 2 : 1}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                      <span className="text-base font-black font-mono text-slate-900 leading-none">
                        {stats.totalLeads}
                      </span>
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">
                        Total Leads
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full rounded-full border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">
                    No Data
                  </div>
                )}
              </div>

              {/* Dynamic Interactive Channel List */}
              <div className="flex-1 min-w-0 space-y-1 w-full">
                {sourceBreakdown.map((item, idx) => {
                  const isSelected = sourceFilter === item.source;
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSourceFilter(isSelected ? 'All' : item.source);
                      }}
                      className={`cursor-pointer px-2.5 py-1 rounded-lg border transition-all flex items-center justify-between text-xs ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/70 shadow-xs'
                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/70'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-semibold text-slate-800 truncate">{item.source}</span>
                      </div>

                      <div className="flex items-center gap-2 font-mono shrink-0">
                        <span className="font-bold text-slate-900">{item.count}</span>
                        <span className="text-slate-400 text-[11px] font-sans w-7 text-right">
                          {item.pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Primary Lead Source</span>
            <span className="font-bold text-slate-800">
              {sourceBreakdown[0]?.source || 'Walk-in'} ({sourceBreakdown[0]?.count || 0} leads)
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
