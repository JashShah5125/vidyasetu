import React, { useState } from 'react';
import {
  GraduationCap, Users, DollarSign, TrendingUp, BookOpen,
  TrendingDown, AlertTriangle, CheckCircle, Building2,
  ClipboardList, MessageSquare, ChevronRight,
  ArrowUpRight, ArrowDownRight,
  Star, CalendarDays, Layers, UserCheck, Activity, Percent, Download, Eye
} from 'lucide-react';
import { useApp } from '../../context/AppContext';


// ─── Types ────────────────────────────────────────────────────────────────────

type BranchFilter = 'all' | string;
type TimeFilter = 'today' | 'week' | 'month' | 'year';

// ─── Reusable Sub-components ──────────────────────────────────────────────────

const Badge: React.FC<{ children: React.ReactNode; color: string }> = ({ children, color }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${color}`}>
    {children}
  </span>
);

const ProgressBar: React.FC<{ value: number; max: number; color: string }> = ({ value, max, color }) => {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-bold text-slate-500 w-8 text-right">{pct}%</span>
    </div>
  );
};

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  trend?: { dir: 'up' | 'down'; label: string };
  accentColor?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, sub, icon, iconBg, trend, accentColor = 'border-transparent' }) => (
  <div className={`bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow duration-200 border-l-4 ${accentColor}`}>
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-display font-bold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
      <div className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
    </div>
    {trend && (
      <div className={`flex items-center gap-1 text-[11px] font-semibold ${trend.dir === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
        {trend.dir === 'up' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
        {trend.label}
      </div>
    )}
  </div>
);

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}
const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div>
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export const InstAdminDashboard: React.FC = () => {
  const { currentUser, students, leads, branches, courses, batches, staff, auditLogs } = useApp();

  const [branchFilter, setBranchFilter] = useState<BranchFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');

  if (!currentUser) return null;

  // ── Derived metrics from real data ──────────────────────────────────────────
  const activeStudents = students.filter(s => s.status === 'Active Student');
  const pendingStudents = students.filter(s => s.status !== 'Active Student');
  const newLeads = leads.filter(l => l.status === 'New Enquiry');
  const hotLeads = leads.filter(l => l.status === 'Interested');
  const activeBranches = branches.filter(b => b.status === 'Active');

  const totalFeesCollected = students.reduce((sum, s) => sum + s.feePlan.paid, 0);
  const totalFeesPending = students.reduce((sum, s) => sum + s.feePlan.pending, 0);
  const totalFeesTarget = students.reduce((sum, s) => sum + s.feePlan.total, 0);

  const activeCourses = courses.length;
  const activeBatches = batches.length;
  const activeStaff = staff.filter(s => s.status === 'Active').length;

  const fmtCurrency = (n: number) =>
    n >= 100000
      ? `₹${(n / 100000).toFixed(1)}L`
      : `₹${n.toLocaleString('en-IN')}`;

  // Branch filter options
  const branchOptions = [
    { value: 'all', label: 'All Branches' },
    ...branches.map(b => ({ value: b.name, label: b.name }))
  ];

  // Time filter options
  const timeOptions: { value: TimeFilter; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
  ];

  // Admission funnel data
  const funnelStages = [
    { label: 'New Enquiries', count: newLeads.length + 12, color: 'bg-blue-500', textColor: 'text-blue-600', pct: 100 },
    { label: 'Contacted', count: leads.filter(l => l.status === 'Contacted').length + 8, color: 'bg-indigo-500', textColor: 'text-indigo-600', pct: 75 },
    { label: 'Follow-up', count: leads.filter(l => l.status === 'Follow-up').length + 5, color: 'bg-violet-500', textColor: 'text-violet-600', pct: 55 },
    { label: 'Interested', count: hotLeads.length + 3, color: 'bg-amber-500', textColor: 'text-amber-600', pct: 38 },
    { label: 'Converted', count: activeStudents.length, color: 'bg-emerald-500', textColor: 'text-emerald-600', pct: 22 },
  ];

  // Branch performance data
  const branchPerformance = [
    { name: 'Mumbai West', students: 287, target: 300, fees: 24.6, attendance: 93.2, newAdm: 18 },
    { name: 'Pune Camp', students: 163, target: 200, fees: 12.8, attendance: 89.7, newAdm: 9 },
  ];

  // Counsellor leaderboard
  const counsellorData = [
    { name: 'Priya Sen', leads: 24, converted: 14, rate: 58 },
    { name: 'Amit Verma', leads: 19, converted: 9, rate: 47 },
    { name: 'Riya Sharma', leads: 16, converted: 10, rate: 63 },
  ];

  // Pending approvals
  const pendingApprovals = [
    { type: 'Fee Discount', student: 'Rohan Deshmukh', amount: '₹8,000', requested_by: 'Priya Sen', urgency: 'high' },
    { type: 'Expense Approval', student: 'Branch: Mumbai West', amount: '₹45,000', requested_by: 'Seema Deshpande', urgency: 'medium' },
    { type: 'Scholarship', student: 'Arjun Mehta', amount: '₹15,000', requested_by: 'Amit Verma', urgency: 'low' },
    { type: 'Result Publish', student: 'JEE-Morning-A Batch', amount: '—', requested_by: 'Prof. Kelkar', urgency: 'high' },
  ];

  // Academic snapshot
  const academicAlerts = [
    { icon: <AlertTriangle size={14} />, text: '3 students below 75% attendance this month', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
    { icon: <ClipboardList size={14} />, text: '5 pending assignment submissions for JEE-Morning-A', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
    { icon: <CheckCircle size={14} />, text: 'NEET Batch results pending publication', color: 'text-violet-600', bg: 'bg-violet-50 border-violet-100' },
    { icon: <MessageSquare size={14} />, text: '2 unresolved doubts older than 48 hours', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
  ];

  const urgencyColor: Record<string, string> = {
    high: 'text-red-600 bg-red-50 border-red-100',
    medium: 'text-amber-600 bg-amber-50 border-amber-100',
    low: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  };

  return (
    <div className="space-y-7 animate-fade-in">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
            <Building2 size={13} />
            <span className="uppercase tracking-wider">{currentUser.tenantName}</span>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="text-slate-400 uppercase tracking-wider">Institute Admin</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-slate-900 leading-tight">
            Good morning, {currentUser.name.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Institute-wide performance snapshot · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            {timeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setTimeFilter(opt.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                  timeFilter === opt.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <select
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-500 cursor-pointer"
          >
            {branchOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm transition-colors">
            <Download size={13} />
            Export
          </button>
        </div>
      </div>

      {/* ── KPI Row 1 — Executive KPIs ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <KpiCard
          label="Total Students"
          value={students.length}
          sub={`${activeStudents.length} active`}
          icon={<GraduationCap size={20} className="text-blue-600" />}
          iconBg="bg-blue-50 border border-blue-100"
          trend={{ dir: 'up', label: '+4 this month' }}
          accentColor="border-l-blue-500"
        />
        <KpiCard
          label="Active Leads"
          value={leads.length}
          sub={`${newLeads.length} new today`}
          icon={<Users size={20} className="text-amber-600" />}
          iconBg="bg-amber-50 border border-amber-100"
          trend={{ dir: 'up', label: '+7 this week' }}
          accentColor="border-l-amber-500"
        />
        <KpiCard
          label="Fee Collected"
          value={fmtCurrency(totalFeesCollected)}
          sub={`Target: ${fmtCurrency(totalFeesTarget)}`}
          icon={<DollarSign size={20} className="text-emerald-600" />}
          iconBg="bg-emerald-50 border border-emerald-100"
          trend={{ dir: 'up', label: '+₹35K this week' }}
          accentColor="border-l-emerald-500"
        />
        <KpiCard
          label="Outstanding Dues"
          value={fmtCurrency(totalFeesPending)}
          sub={`${pendingStudents.length} students pending`}
          icon={<AlertTriangle size={20} className="text-red-500" />}
          iconBg="bg-red-50 border border-red-100"
          trend={{ dir: 'down', label: 'Down from last month' }}
          accentColor="border-l-red-400"
        />
        <KpiCard
          label="Active Branches"
          value={`${activeBranches.length} / ${branches.length}`}
          sub="All operational"
          icon={<Building2 size={20} className="text-indigo-600" />}
          iconBg="bg-indigo-50 border border-indigo-100"
          accentColor="border-l-indigo-400"
        />
        <KpiCard
          label="Total Staff"
          value={activeStaff}
          sub={`${activeBatches} active batches`}
          icon={<UserCheck size={20} className="text-teal-600" />}
          iconBg="bg-teal-50 border border-teal-100"
          accentColor="border-l-teal-400"
        />
        <KpiCard
          label="Attendance (Avg)"
          value="91.4%"
          sub="Across all branches"
          icon={<Percent size={20} className="text-violet-600" />}
          iconBg="bg-violet-50 border border-violet-100"
          trend={{ dir: 'up', label: '+2.1% vs last week' }}
          accentColor="border-l-violet-400"
        />
      </div>

      {/* ── Row 2: Branch Performance + Pending Approvals ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Branch Performance Widget */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Branch Performance</h3>
              <p className="text-xs text-slate-400 mt-0.5">Admissions, fees, and attendance by branch</p>
            </div>
            <button className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
              View All <ChevronRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {branchPerformance.map((branch, idx) => (
              <div key={idx} className="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <p className="text-sm font-bold text-slate-800">{branch.name}</p>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 ml-4">
                      {branch.students} / {branch.target} students · {branch.newAdm} new this month
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">₹{branch.fees}L collected</p>
                    <p className="text-xs text-slate-400">Attendance: {branch.attendance}%</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase mb-1">Student Capacity</p>
                    <ProgressBar value={branch.students} max={branch.target} color="bg-blue-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase mb-1">Attendance Rate</p>
                    <ProgressBar value={branch.attendance} max={100} color="bg-emerald-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Pending Approvals</h3>
              <p className="text-xs text-slate-400 mt-0.5">Requires your action</p>
            </div>
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {pendingApprovals.length}
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {pendingApprovals.map((item, idx) => (
              <div key={idx} className="px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-slate-800">{item.type}</p>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${urgencyColor[item.urgency]}`}>
                        {item.urgency}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 truncate">{item.student}</p>
                    <p className="text-[10px] text-slate-400">by {item.requested_by}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-slate-700">{item.amount}</p>
                    <button className="mt-1 text-[10px] font-bold text-blue-600 hover:underline">Review</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-slate-100">
            <button className="w-full text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline text-center">
              View all approvals →
            </button>
          </div>
        </div>
      </div>

      {/* ── Row 3: Admission Funnel + Counsellor Leaderboard ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Admission Funnel */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
          <SectionHeader
            title="Admissions Pipeline"
            subtitle={`All branches · ${timeFilter === 'today' ? 'Today' : timeFilter === 'week' ? 'This week' : timeFilter === 'month' ? 'This month' : 'This year'}`}
            action={
              <div className="flex items-center gap-2">
                <select
                  className="text-[11px] border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 font-semibold outline-none focus:border-blue-400 bg-white"
                  defaultValue="all"
                >
                  <option value="all">All Sources</option>
                  <option value="google">Google Ads</option>
                  <option value="referral">Referral</option>
                  <option value="walkin">Walk-in</option>
                </select>
              </div>
            }
          />
          <div className="grid grid-cols-5 gap-2 mb-6">
            {funnelStages.map((stage, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2">
                <div className="relative w-full flex flex-col items-center">
                  <div
                    className={`w-full ${stage.color} rounded-t-lg opacity-20`}
                    style={{ height: `${stage.pct * 0.8 + 20}px` }}
                  />
                  <div
                    className={`absolute bottom-0 w-full ${stage.color} rounded-t-lg`}
                    style={{ height: `${stage.pct * 0.4 + 10}px` }}
                  />
                </div>
                <span className={`text-lg font-display font-bold ${stage.textColor}`}>{stage.count}</span>
                <span className="text-[10px] text-slate-500 text-center font-semibold leading-tight">{stage.label}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div className="text-center">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Conversion Rate</p>
              <p className="text-xl font-display font-bold text-emerald-600 mt-0.5">22%</p>
            </div>
            <div className="text-center border-x border-slate-100">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Avg Days to Convert</p>
              <p className="text-xl font-display font-bold text-blue-600 mt-0.5">12d</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Lost / Dropped</p>
              <p className="text-xl font-display font-bold text-red-500 mt-0.5">7</p>
            </div>
          </div>
        </div>

        {/* Counsellor Leaderboard */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
          <SectionHeader
            title="Counsellor Performance"
            subtitle="Conversion ranking"
          />
          <div className="space-y-3">
            {counsellorData.map((c, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                  idx === 0 ? 'bg-amber-100 text-amber-700' :
                  idx === 1 ? 'bg-slate-100 text-slate-600' :
                  'bg-orange-50 text-orange-600'
                }`}>
                  {idx === 0 ? <Star size={12} /> : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-slate-800 truncate">{c.name}</p>
                    <span className="text-xs font-bold text-emerald-600 ml-2">{c.rate}%</span>
                  </div>
                  <ProgressBar value={c.rate} max={100} color={idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : 'bg-blue-500'} />
                  <p className="text-[10px] text-slate-400 mt-1">{c.converted} / {c.leads} leads converted</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 font-semibold uppercase mb-3">Source Performance</p>
            {[
              { source: 'Google Ads', leads: 18, pct: 72, color: 'bg-blue-500' },
              { source: 'Referral', leads: 14, pct: 56, color: 'bg-emerald-500' },
              { source: 'Walk-in', leads: 8, pct: 32, color: 'bg-amber-500' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-slate-500 font-semibold w-16 truncate">{s.source}</span>
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.pct}%` }} />
                </div>
                <span className="text-[10px] font-bold text-slate-600 w-4 text-right">{s.leads}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 4: Academic Monitoring + Finance Overview ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Academic Monitoring */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Academic Snapshot</h3>
                <p className="text-xs text-slate-400 mt-0.5">Schedule, attendance, doubts & tasks</p>
              </div>
              <select
                className="text-[11px] border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 font-semibold outline-none focus:border-blue-400 bg-white"
                defaultValue="all"
              >
                <option value="all">All Batches</option>
                {batches.map(b => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick stat pills */}
          <div className="grid grid-cols-4 border-b border-slate-100">
            {[
              { label: 'Batches', value: activeBatches, icon: <Layers size={13} />, color: 'text-blue-600' },
              { label: 'Courses', value: activeCourses, icon: <BookOpen size={13} />, color: 'text-indigo-600' },
              { label: 'Today Lectures', value: 7, icon: <CalendarDays size={13} />, color: 'text-violet-600' },
              { label: 'Open Doubts', value: 2, icon: <MessageSquare size={13} />, color: 'text-orange-600' },
            ].map((m, i) => (
              <div key={i} className={`p-4 text-center ${i < 3 ? 'border-r border-slate-100' : ''}`}>
                <div className={`flex justify-center mb-1 ${m.color}`}>{m.icon}</div>
                <p className="text-lg font-display font-bold text-slate-900">{m.value}</p>
                <p className="text-[10px] text-slate-400 font-semibold">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Alerts */}
          <div className="p-4 space-y-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Alerts & Actions Required</p>
            {academicAlerts.map((alert, idx) => (
              <div key={idx} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border ${alert.bg}`}>
                <span className={`mt-0.5 flex-shrink-0 ${alert.color}`}>{alert.icon}</span>
                <p className={`text-xs font-medium ${alert.color}`}>{alert.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Finance Overview */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Finance Overview</h3>
                <p className="text-xs text-slate-400 mt-0.5">Collections, dues, and income/expense</p>
              </div>
              <button className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                Full Report <ChevronRight size={12} />
              </button>
            </div>
          </div>

          {/* Fee progress */}
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-600">Fee Collection Progress</p>
              <p className="text-xs font-bold text-emerald-600">
                {totalFeesTarget > 0 ? Math.round((totalFeesCollected / totalFeesTarget) * 100) : 0}% collected
              </p>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${totalFeesTarget > 0 ? (totalFeesCollected / totalFeesTarget) * 100 : 0}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                <p className="text-[10px] text-emerald-600 font-bold uppercase">Collected</p>
                <p className="text-base font-display font-bold text-emerald-700 mt-0.5">{fmtCurrency(totalFeesCollected)}</p>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                <p className="text-[10px] text-red-500 font-bold uppercase">Pending</p>
                <p className="text-base font-display font-bold text-red-600 mt-0.5">{fmtCurrency(totalFeesPending)}</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Target</p>
                <p className="text-base font-display font-bold text-slate-700 mt-0.5">{fmtCurrency(totalFeesTarget)}</p>
              </div>
            </div>
          </div>

          {/* Defaulters quick list */}
          <div className="px-6 py-4 border-b border-slate-100">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Top Defaulters</p>
            <div className="space-y-2">
              {students
                .filter(s => s.feePlan.pending > 0)
                .sort((a, b) => b.feePlan.pending - a.feePlan.pending)
                .slice(0, 3)
                .map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                        {s.name[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{s.name}</p>
                        <p className="text-[10px] text-slate-400">{s.course} · {s.branch}</p>
                      </div>
                    </div>
                    <span className="font-bold text-red-600">{fmtCurrency(s.feePlan.pending)}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Income vs Expense snapshot */}
          <div className="px-6 py-4">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Income vs Expense (This Month)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-center">
                  <TrendingUp size={14} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold">Income</p>
                  <p className="text-sm font-bold text-emerald-600">₹2.85L</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-50 border border-red-100 rounded-lg flex items-center justify-center">
                  <TrendingDown size={14} className="text-red-500" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold">Expense</p>
                  <p className="text-sm font-bold text-red-500">₹1.42L</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 5: Staff Summary + Recent Registrations ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Staff Summary */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Staff Summary</h3>
            <p className="text-xs text-slate-400 mt-0.5">{activeStaff} active · all branches</p>
          </div>
          <div className="divide-y divide-slate-50">
            {staff.map((member, idx) => (
              <div key={idx} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-[11px] font-bold text-blue-600">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{member.name}</p>
                    <p className="text-[10px] text-slate-400">{member.role} · {member.branch}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  member.status === 'Active'
                    ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                    : 'text-slate-400 bg-slate-100 border-slate-200'
                }`}>
                  {member.status}
                </span>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-slate-100">
            <button className="w-full text-xs font-semibold text-blue-600 hover:underline">View full staff directory →</button>
          </div>
        </div>

        {/* Recent Student Registrations */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Recent Student Registrations</h3>
              <p className="text-xs text-slate-400 mt-0.5">Latest admissions across all branches</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="text-[11px] border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 font-semibold outline-none focus:border-blue-400 bg-white"
                defaultValue="all"
              >
                <option value="all">All Courses</option>
                {courses.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
              <button className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors">
                <Eye size={13} />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Student ID', 'Name', 'Course / Batch', 'Branch', 'Admission Date', 'Fee Status', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs text-slate-600">
                {students.map((s, idx) => {
                  const feePercent = s.feePlan.total > 0 ? Math.round((s.feePlan.paid / s.feePlan.total) * 100) : 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-[11px] text-slate-600">{s.studentId}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 flex-shrink-0">
                            {s.name[0]}
                          </div>
                          <p className="font-semibold text-slate-800 whitespace-nowrap">{s.name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-700">{s.course}</p>
                        <p className="text-[10px] text-slate-400">{s.batch}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{s.branch}</td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">{s.admissionDate}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${feePercent >= 75 ? 'bg-emerald-500' : feePercent >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                              style={{ width: `${feePercent}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500">{feePercent}%</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{fmtCurrency(s.feePlan.paid)} / {fmtCurrency(s.feePlan.total)}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          s.status === 'Active Student'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            : s.status === 'Verification Pending'
                            ? 'bg-amber-50 text-amber-600 border-amber-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {students.length === 0 && (
              <div className="px-6 py-8 text-center text-xs text-slate-400">No students registered yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 6: Recent Audit / Activity Log ────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Recent Activity Log</h3>
            <p className="text-xs text-slate-400 mt-0.5">System audit trail · critical actions</p>
          </div>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 hover:underline">
            <Activity size={13} /> View Full Audit Log
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Timestamp', 'Actor', 'Role', 'Action', 'Details'].map(h => (
                  <th key={h} className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs text-slate-600">
              {auditLogs.slice(0, 6).map((log, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-3.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                  <td className="px-6 py-3.5 font-semibold text-slate-800 whitespace-nowrap">{log.actor}</td>
                  <td className="px-6 py-3.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">{log.role}</span>
                  </td>
                  <td className="px-6 py-3.5 font-mono text-[11px] text-blue-600 whitespace-nowrap">{log.action}</td>
                  <td className="px-6 py-3.5 text-slate-500 max-w-xs truncate">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {auditLogs.length === 0 && (
            <div className="px-6 py-8 text-center text-xs text-slate-400">No recent activity.</div>
          )}
        </div>
      </div>

    </div>
  );
};
