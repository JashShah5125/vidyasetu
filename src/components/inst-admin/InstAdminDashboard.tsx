import React, { useState, useMemo } from 'react';
import { 
  Building2, ChevronRight, GraduationCap, Users, DollarSign, 
  Wallet, Network, Filter
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

// ─── Simple KPI Card Component ──────────────────────────────────────────────
const KpiCard: React.FC<{
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
}> = ({ title, value, subValue, icon }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-3">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
        <p className="text-3xl font-display font-bold text-slate-900 mt-1">{value}</p>
      </div>
      <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-600">
        {icon}
      </div>
    </div>
    {subValue && (
      <p className="text-sm font-medium text-slate-500">{subValue}</p>
    )}
  </div>
);

export const InstAdminDashboard: React.FC = () => {
  const { currentUser, students, staff, branches, courses, batches } = useApp();
  
  // Filter states
  const [filters, setFilters] = useState({
    branch: 'all',
    course: 'all',
    program: 'all',
    level: 'all'
  });

  // Calculate Metrics based on filters (for now simple calculations)
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (filters.branch !== 'all' && s.branch !== filters.branch) return false;
      if (filters.course !== 'all' && s.course !== filters.course) return false;
      return true;
    });
  }, [students, filters]);

  const activeStaff = staff.filter(s => s.status === 'Active').length;
  const activeBranches = branches.filter(b => b.status === 'Active').length;
  
  const totalFeesTarget = filteredStudents.reduce((acc, s) => acc + (s.feePlan?.total || 0), 0);
  const totalFeesPaid = filteredStudents.reduce((acc, s) => acc + (s.feePlan?.paid || 0), 0);
  const totalFeesPending = filteredStudents.reduce((acc, s) => acc + (s.feePlan?.pending || 0), 0);
  
  const feePercentage = totalFeesTarget > 0 ? Math.round((totalFeesPaid / totalFeesTarget) * 100) : 0;

  const uniquePrograms = useMemo(() => Array.from(new Set(courses.flatMap(c => c.programs || []))), [courses]);
  const uniqueLevels = useMemo(() => Array.from(new Set(batches.map(b => b.level).filter((l): l is string => Boolean(l)))), [batches]);

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  if (!currentUser) return null;

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
            Good morning, {currentUser.name.split(' ')[0]}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Institute-wide performance snapshot · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
      
      {/* ── Dashboard Filters ──────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 mr-2">
          <Filter size={16} /> Filters:
        </div>
        
        <select 
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none focus:border-blue-500 min-w-[140px]"
          value={filters.branch}
          onChange={(e) => setFilters(prev => ({...prev, branch: e.target.value}))}
        >
          <option value="all">All Branches</option>
          {branches.map(b => (
            <option key={b.id || b.name} value={b.name}>{b.name}</option>
          ))}
        </select>

        <select 
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none focus:border-blue-500 min-w-[140px]"
          value={filters.course}
          onChange={(e) => setFilters(prev => ({...prev, course: e.target.value}))}
        >
          <option value="all">All Courses</option>
          {courses.map(c => (
            <option key={c.id || c.code} value={c.name}>{c.name}</option>
          ))}
        </select>

        <select 
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none focus:border-blue-500 min-w-[140px]"
          value={filters.program}
          onChange={(e) => setFilters(prev => ({...prev, program: e.target.value}))}
        >
          <option value="all">All Programs</option>
          {uniquePrograms.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <select 
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none focus:border-blue-500 min-w-[140px]"
          value={filters.level}
          onChange={(e) => setFilters(prev => ({...prev, level: e.target.value}))}
        >
          <option value="all">All Levels</option>
          {uniqueLevels.map(l => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        <KpiCard
          title="Total Students"
          value={filteredStudents.length}
          subValue={`${filteredStudents.filter(s => s.status === 'Active Student').length} active currently`}
          icon={<GraduationCap size={20} />}
        />
        <KpiCard
          title="Total Staff"
          value={activeStaff}
          subValue="Across all branches"
          icon={<Users size={20} />}
        />
        <KpiCard
          title="Fee Collection"
          value={`${feePercentage}%`}
          subValue={`₹${(totalFeesPaid / 100000).toFixed(2)}L of ₹${(totalFeesTarget / 100000).toFixed(2)}L`}
          icon={<Wallet size={20} />}
        />
        <KpiCard
          title="Outstanding Fees"
          value={formatCurrency(totalFeesPending)}
          subValue="Pending to be collected"
          icon={<DollarSign size={20} />}
        />
        <KpiCard
          title="Active Branches"
          value={`${activeBranches} / ${branches.length}`}
          subValue="Currently operational"
          icon={<Network size={20} />}
        />
      </div>
    </div>
  );
};
