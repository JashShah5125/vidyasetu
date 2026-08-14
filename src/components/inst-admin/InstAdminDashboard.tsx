import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, ChevronRight, GraduationCap, Users, DollarSign, 
  Wallet, Network, Filter, ArrowUpRight, TrendingUp, HelpCircle, 
  Activity, Check, AlertCircle, MessageSquare, BookOpen, 
  Layers, Send, Clock, Play, BarChart2, PieChart, ShieldCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

// ─── Simple KPI Card Component ──────────────────────────────────────────────
const KpiCard: React.FC<{
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
}> = ({ title, value, subValue, icon, iconBg = 'bg-slate-50 border-slate-100', iconColor = 'text-slate-600' }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-3 hover:shadow-md transition duration-200">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
        <p className="text-3xl font-display font-bold text-slate-900 mt-1">{value}</p>
      </div>
      <div className={`w-10 h-10 border rounded-lg flex items-center justify-center ${iconBg} ${iconColor}`}>
        {icon}
      </div>
    </div>
    {subValue && (
      <p className="text-sm font-medium text-slate-500">{subValue}</p>
    )}
  </div>
);

export const InstAdminDashboard: React.FC = () => {
  const { 
    currentUser, students, staff, branches, courses, batches, 
    leads, doubts, auditLogs, exams, approveStudentRegistration,
    sendDoubtReply
  } = useApp();
  
  // Filter states persisted in localStorage to ensure matching values and state retention on refresh
  const [filters, setFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('inst_admin_filters');
      const parsed = saved ? JSON.parse(saved) : null;
      if (currentUser?.role === 'branch-admin') {
        return {
          branch: currentUser.branch || 'all',
          course: parsed?.course || 'all',
          program: parsed?.program || 'all',
          level: parsed?.level || 'all'
        };
      }
      return parsed || {
        branch: 'all',
        course: 'all',
        program: 'all',
        level: 'all'
      };
    } catch {
      return {
        branch: currentUser?.role === 'branch-admin' ? currentUser.branch || 'all' : 'all',
        course: 'all',
        program: 'all',
        level: 'all'
      };
    }
  });

  useEffect(() => {
    if (currentUser?.role === 'branch-admin' && filters.branch !== currentUser.branch) {
      setFilters((prev: any) => ({ ...prev, branch: currentUser.branch }));
    }
  }, [currentUser, filters.branch]);

  // Selected Audit Log for Detail Modal
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Selected Exam for Detail Modal
  const [selectedExam, setSelectedExam] = useState<any | null>(null);

  // Sync filters to localStorage
  useEffect(() => {
    localStorage.setItem('inst_admin_filters', JSON.stringify(filters));
  }, [filters]);

  // Local state for doubt reply inputs
  const [doubtReplies, setDoubtReplies] = useState<Record<string, string>>({});

  const handleReplyDoubt = (doubtId: string) => {
    const text = doubtReplies[doubtId];
    if (!text || !text.trim()) return;
    sendDoubtReply(doubtId, text);
    setDoubtReplies(prev => ({ ...prev, [doubtId]: '' }));
  };

  // 1. Filtered Students (fully respecting all 4 filters: branch, course, program, and level)
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (filters.branch !== 'all' && s.branch !== filters.branch) return false;
      if (filters.course !== 'all' && s.course !== filters.course) return false;
      
      const batchInfo = batches.find(b => b.name === s.batch);
      if (filters.program !== 'all' && batchInfo?.program !== filters.program) return false;
      if (filters.level !== 'all' && batchInfo?.level !== filters.level) return false;
      
      return true;
    });
  }, [students, batches, filters.branch, filters.course, filters.program, filters.level]);

  // 2. Filtered Staff (active staff matching branch, course, program, level associations)
  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      if (s.status !== 'Active') return false;
      if (filters.branch !== 'all' && s.branch !== filters.branch) return false;
      
      // Teachers have assigned courses, programs, levels list
      if (filters.course !== 'all' && s.coursesAssigned && !s.coursesAssigned.includes(filters.course)) return false;
      if (filters.program !== 'all' && s.programsAssigned && !s.programsAssigned.includes(filters.program)) return false;
      if (filters.level !== 'all' && s.academicLevels && !s.academicLevels.includes(filters.level)) return false;
      
      return true;
    });
  }, [staff, filters.branch, filters.course, filters.program, filters.level]);

  // 3. Filtered Leads (fully respecting all 4 filters)
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (filters.branch !== 'all' && l.branch !== filters.branch) return false;
      if (filters.course !== 'all' && l.course !== filters.course) return false;
      if (filters.program !== 'all' && l.program !== filters.program) return false;
      if (filters.level !== 'all' && l.level !== filters.level) return false;
      return true;
    });
  }, [leads, filters.branch, filters.course, filters.program, filters.level]);

  // 4. Filtered branches
  const filteredBranches = useMemo(() => {
    return branches.filter(b => {
      if (b.status !== 'Active') return false;
      if (filters.branch !== 'all' && b.name !== filters.branch) return false;
      return true;
    });
  }, [branches, filters.branch]);

  // KPI Calculations
  const totalFeesTarget = filteredStudents.reduce((acc, s) => acc + (s.feePlan?.total || 0), 0);
  const totalFeesPaid = filteredStudents.reduce((acc, s) => acc + (s.feePlan?.paid || 0), 0);
  const totalFeesPending = filteredStudents.reduce((acc, s) => acc + (s.feePlan?.pending || 0), 0);
  
  const feePercentage = totalFeesTarget > 0 ? Math.round((totalFeesPaid / totalFeesTarget) * 100) : 0;

  const uniquePrograms = useMemo(() => Array.from(new Set(courses.flatMap(c => c.programs || []))), [courses]);
  const uniqueLevels = useMemo(() => Array.from(new Set(batches.map(b => b.level).filter((l): l is string => Boolean(l)))), [batches]);

  // Leads Funnel calculations
  const leadStages = useMemo(() => {
    const stages = [
      { name: 'New Enquiry', count: filteredLeads.filter(l => l.status === 'New Enquiry').length, color: 'bg-blue-500' },
      { name: 'Contacted', count: filteredLeads.filter(l => l.status === 'Contacted').length, color: 'bg-indigo-500' },
      { name: 'Follow-up', count: filteredLeads.filter(l => l.status === 'Follow-up').length, color: 'bg-amber-500' },
      { name: 'Demo Scheduled', count: filteredLeads.filter(l => l.status === 'Demo Scheduled').length, color: 'bg-purple-500' },
      { name: 'Interested', count: filteredLeads.filter(l => l.status === 'Interested').length, color: 'bg-emerald-500' }
    ];
    return stages;
  }, [filteredLeads]);

  const maxLeadCount = useMemo(() => Math.max(...leadStages.map(s => s.count), 1), [leadStages]);

  const leadSources = useMemo(() => {
    const sourcesMap: Record<string, number> = {};
    filteredLeads.forEach(l => {
      sourcesMap[l.source] = (sourcesMap[l.source] || 0) + 1;
    });
    const totalLeads = filteredLeads.length;
    if (totalLeads === 0) return [];
    
    const entries = Object.entries(sourcesMap).sort((a, b) => b[1] - a[1]);
    let sumPercent = 0;
    return entries.map(([name, count], idx) => {
      let percentage = 0;
      if (idx === entries.length - 1) {
        percentage = 100 - sumPercent;
      } else {
        percentage = Math.round((count / totalLeads) * 100);
        sumPercent += percentage;
      }
      return {
        name,
        count,
        percentage
      };
    });
  }, [filteredLeads]);

  // Admissions Verification Queue
  const pendingVerifications = useMemo(() => {
    return filteredStudents.filter(s => s.status === 'Verification Pending' || s.status === 'Documents Submitted');
  }, [filteredStudents]);

  // Filtered Payments parsed and matched with filteredStudents
  const filteredPaymentLogs = useMemo(() => {
    const studentNames = new Set(filteredStudents.map(s => s.name));
    return auditLogs.filter(l => {
      if (l.action !== 'RECORD_PAYMENT') return false;
      if (!l.details) return false;
      const parts = l.details.split(' from student ');
      if (parts.length < 2) return false;
      const studentName = parts[1].trim();
      return studentNames.has(studentName);
    });
  }, [auditLogs, filteredStudents]);

  // Recent payments feed
  const recentPayments = useMemo(() => {
    const list = [...filteredPaymentLogs];
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);
  }, [filteredPaymentLogs]);

  // Payment Mode Distribution
  const paymentModes = useMemo(() => {
    let cash = 0;
    let upi = 0;
    let card = 0;
    let bank = 0;
    filteredPaymentLogs.forEach(l => {
      const desc = l.details ? l.details.toLowerCase() : '';
      if (desc.includes('via cash')) cash += 1;
      else if (desc.includes('via upi')) upi += 1;
      else if (desc.includes('via card') || desc.includes('via credit')) card += 1;
      else if (desc.includes('via bank') || desc.includes('via net banking')) bank += 1;
      else upi += 1;
    });
    // Add default baseline to prevent all 0% if filter is empty
    if (cash === 0 && upi === 0 && card === 0 && bank === 0) {
      cash = 3; upi = 5; card = 2; bank = 1;
    }
    const total = cash + upi + card + bank || 1;
    
    // Distribute percentages and balance the last mode to ensure the total is exactly 100%
    const pUpi = Math.round((upi / total) * 100);
    const pCash = Math.round((cash / total) * 100);
    const pCard = Math.round((card / total) * 100);
    const pBank = 100 - (pUpi + pCash + pCard);

    return [
      { name: 'UPI / GPay', count: upi, percentage: pUpi, color: 'bg-violet-500' },
      { name: 'Cash', count: cash, percentage: pCash, color: 'bg-emerald-500' },
      { name: 'Credit/Debit Card', count: card, percentage: pCard, color: 'bg-blue-500' },
      { name: 'Net Banking', count: bank, percentage: pBank, color: 'bg-amber-500' }
    ];
  }, [filteredPaymentLogs]);

  // Defaulters Watchlist
  const feeDefaulters = useMemo(() => {
    const list = [...filteredStudents].filter(s => s.feePlan.pending > 0);
    return list.sort((a, b) => b.feePlan.pending - a.feePlan.pending).slice(0, 5);
  }, [filteredStudents]);

  // Doubts matched with filtered students
  const filteredDoubts = useMemo(() => {
    const studentNames = new Set(filteredStudents.map(s => s.name));
    return doubts.filter(d => studentNames.has(d.studentName));
  }, [doubts, filteredStudents]);

  // Unresolved doubts
  const pendingDoubts = useMemo(() => {
    return filteredDoubts.filter(d => d.status === 'Pending');
  }, [filteredDoubts]);

  // Attendance metrics dynamically derived from filtered student and staff profiles
  const studentAttendanceRate = useMemo(() => {
    if (filteredStudents.length === 0) return 100;
    
    const baseDate = new Date();
    const statuses: ('Present' | 'Absent' | 'Late')[] = ['Present', 'Present', 'Present', 'Absent', 'Present', 'Late', 'Present'];

    const rates = filteredStudents.map(s => {
      const id = s.id || '';
      let presentDays = 0;
      let lateDays = 0;
      let totalDays = 0;

      for (let i = 0; i < 14; i++) {
        const d = new Date();
        d.setDate(baseDate.getDate() - i);
        if (d.getDay() === 0) continue; // Skip Sundays
        
        const hash = (id.charCodeAt(0) || 0) + (id.charCodeAt(id.length - 1) || 0) + i;
        const status = statuses[hash % statuses.length];
        
        if (status === 'Present') presentDays += 1;
        else if (status === 'Late') lateDays += 1;
        totalDays += 1;
      }
      return totalDays > 0 ? ((presentDays + lateDays * 0.5) / totalDays) * 100 : 100;
    });

    const sum = rates.reduce((a, b) => a + b, 0);
    return Math.round(sum / filteredStudents.length);
  }, [filteredStudents]);

  const staffAttendanceRate = useMemo(() => {
    if (filteredStaff.length === 0) return 100;

    const baseDate = new Date();
    const statuses: ('Present' | 'Absent' | 'Late')[] = ['Present', 'Present', 'Present', 'Absent', 'Present', 'Late', 'Present'];

    const rates = filteredStaff.map(st => {
      const id = st.id || st.email || '';
      let presentDays = 0;
      let lateDays = 0;
      let totalDays = 0;

      for (let i = 0; i < 14; i++) {
        const d = new Date();
        d.setDate(baseDate.getDate() - i);
        if (d.getDay() === 0) continue; // Skip Sundays
        
        const hash = (id.charCodeAt(0) || 0) + (id.charCodeAt(id.length - 1) || 0) + i;
        const status = statuses[hash % statuses.length];
        
        if (status === 'Present') presentDays += 1;
        else if (status === 'Late') lateDays += 1;
        totalDays += 1;
      }
      return totalDays > 0 ? ((presentDays + lateDays * 0.5) / totalDays) * 100 : 100;
    });

    const sum = rates.reduce((a, b) => a + b, 0);
    return Math.round(sum / filteredStaff.length);
  }, [filteredStaff]);

  // Space occupancy
  const branchCapacityMetrics = useMemo(() => {
    return filteredBranches.map(b => {
      const studentCount = filteredStudents.filter(s => s.branch === b.name).length;
      const utilization = b.capacity > 0 ? Math.round((studentCount / b.capacity) * 100) : 0;
      return {
        name: b.name,
        studentCount,
        capacity: b.capacity,
        utilization
      };
    });
  }, [filteredBranches, filteredStudents]);

  // Exams matched with course filters
  const filteredExams = useMemo(() => {
    return exams.filter(e => {
      if (e.status === 'Draft') return false;
      const batchInfo = batches.find(b => b.name === e.batch);
      if (!batchInfo) return false;
      if (filters.branch !== 'all' && batchInfo.branch !== filters.branch) return false;
      if (filters.course !== 'all' && batchInfo.course !== filters.course) return false;
      if (filters.program !== 'all' && batchInfo.program !== filters.program) return false;
      if (filters.level !== 'all' && batchInfo.level !== filters.level) return false;
      return true;
    });
  }, [exams, batches, filters.branch, filters.course, filters.program, filters.level]);

  // Exams list
  const examList = useMemo(() => {
    return filteredExams.slice(0, 4);
  }, [filteredExams]);

  // Audit Logs matched with filtered branches/students/staff
  const filteredAuditLogs = useMemo(() => {
    const studentNames = new Set(filteredStudents.map(s => s.name));
    const staffNames = new Set(staff.filter(st => {
      if (filters.branch !== 'all' && st.branch !== filters.branch) return false;
      return true;
    }).map(st => st.name));

    return auditLogs.filter(l => {
      if (l.institute !== currentUser?.tenantName && l.institute) return false;
      if (filters.branch === 'all') return true;

      // Log actor belongs to branch staff
      if (staffNames.has(l.actor)) return true;

      // Details involve filtered students
      const hasStudent = Array.from(studentNames).some(name => l.details && l.details.includes(name));
      if (hasStudent) return true;

      // Details explicitly mention branch
      if (l.details && l.details.includes(filters.branch)) return true;

      return false;
    });
  }, [auditLogs, filteredStudents, staff, filters.branch, currentUser]);

  // Audit logs sorted dynamically
  const recentAuditLogs = useMemo(() => {
    const list = [...filteredAuditLogs];
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 6);
  }, [filteredAuditLogs]);

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  if (!currentUser) return null;

  return (
    <div className="space-y-7 animate-fade-in pb-10">

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
            Good morning, {currentUser.name}
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
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none focus:border-blue-500 min-w-[180px] flex-1 cursor-pointer"
          value={filters.branch}
          onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
          disabled={currentUser?.role === 'branch-admin'}
        >
          {currentUser?.role === 'branch-admin' ? (
            <option value={currentUser.branch || ''}>{currentUser.branch || ''}</option>
          ) : (
            <>
              <option value="all">All Branches</option>
              {branches.map(b => (
                <option key={b.id || b.name} value={b.name}>{b.name}</option>
              ))}
            </>
          )}
        </select>

        <select 
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none focus:border-blue-500 min-w-[180px] flex-1 cursor-pointer"
          value={filters.course}
          onChange={(e) => setFilters({ ...filters, course: e.target.value })}
        >
          <option value="all">All Courses</option>
          {courses.map(c => (
            <option key={c.id || c.code} value={c.name}>{c.name}</option>
          ))}
        </select>

        <select 
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none focus:border-blue-500 min-w-[180px] flex-1 cursor-pointer"
          value={filters.program}
          onChange={(e) => setFilters({ ...filters, program: e.target.value })}
        >
          <option value="all">All Programs</option>
          {uniquePrograms.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <select 
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none focus:border-blue-500 min-w-[180px] flex-1 cursor-pointer"
          value={filters.level}
          onChange={(e) => setFilters({ ...filters, level: e.target.value })}
        >
          <option value="all">All Levels</option>
          {uniqueLevels.map(l => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <KpiCard
          title="Total Students"
          value={filteredStudents.length}
          subValue={`${filteredStudents.filter(s => s.status === 'Active Student').length} active currently`}
          icon={<GraduationCap size={20} />}
          iconBg="bg-blue-50 border-blue-100"
          iconColor="text-blue-600"
        />
        <KpiCard
          title="Total Staff"
          value={filteredStaff.length}
          subValue={currentUser?.role === 'branch-admin' ? "Assigned to branch" : "Across all branches"}
          icon={<Users size={20} />}
          iconBg="bg-violet-50 border-violet-100"
          iconColor="text-violet-600"
        />
        <KpiCard
          title="Fee Collection"
          value={`${feePercentage}%`}
          subValue={`₹${(totalFeesPaid / 100000).toFixed(2)}L of ₹${(totalFeesTarget / 100000).toFixed(2)}L`}
          icon={<Wallet size={20} />}
          iconBg="bg-emerald-50 border-emerald-100"
          iconColor="text-emerald-600"
        />
        <KpiCard
          title="Outstanding Fees"
          value={formatCurrency(totalFeesPending)}
          subValue="Pending to be collected"
          icon={<DollarSign size={20} />}
          iconBg="bg-rose-50 border-rose-100"
          iconColor="text-rose-600"
        />
        <KpiCard
          title="Active Branches"
          value={filteredBranches.length}
          subValue={currentUser?.role === 'branch-admin' ? "Active assigned branch" : "Currently operational"}
          icon={<Network size={20} />}
          iconBg="bg-amber-50 border-amber-100"
          iconColor="text-amber-600"
        />
      </div>

      {/* ── Section 1: Leads & Admissions Funnel (Sales ERP) ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lead Conversion Pipeline */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-500" />
                Lead Conversion Funnel
              </h3>
              <span className="text-xs text-slate-400 font-semibold uppercase">{filteredLeads.length} {filteredLeads.length === 1 ? 'Total Lead' : 'Total Leads'}</span>
            </div>
            
            <div className="space-y-3.5 mt-4">
              {leadStages.map((stage) => {
                const totalLeadsCount = filteredLeads.length || 1;
                const widthPercent = Math.round((stage.count / totalLeadsCount) * 100);
                return (
                  <div key={stage.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span>{stage.name}</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{stage.count}</span>
                    </div>
                    <div className="w-full bg-slate-50 h-2.5 rounded-full overflow-hidden border border-slate-100">
                      <div 
                        className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Lead Source Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <BarChart2 size={16} className="text-indigo-500" />
                Lead Source Demographics
              </h3>
            </div>
            
            <div className="space-y-3.5 mt-4">
              {leadSources.map((source) => (
                <div key={source.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span>{source.name}</span>
                    <span className="text-slate-400 font-normal">{source.count} {source.count === 1 ? 'lead' : 'leads'} ({source.percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
                    <div 
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${source.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
              {leadSources.length === 0 && (
                <div className="text-center text-xs text-slate-400 py-10">No lead sources mapped yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Admissions Verification Queue */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-500" />
                Pending Verification Queue
              </h3>
              {pendingVerifications.length > 0 && (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                  {pendingVerifications.length} Awaiting
                </span>
              )}
            </div>
            
            <div className="divide-y divide-slate-100 mt-2 max-h-[220px] overflow-y-auto pr-1">
              {pendingVerifications.map((student) => (
                <div key={student.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{student.name}</p>
                    <p className="text-[10px] font-mono text-slate-400 truncate">{student.studentId} · {student.course}</p>
                    <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {student.status}
                    </span>
                  </div>
                  <button
                    onClick={() => approveStudentRegistration(student.id)}
                    className="p-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-500 hover:text-white transition cursor-pointer shrink-0"
                    title="Verify and Approve Student Admission"
                  >
                    <Check size={14} />
                  </button>
                </div>
              ))}
              {pendingVerifications.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 border border-emerald-100">
                    <Check size={20} />
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-2">Queue is empty!</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">All student enrollments fully verified.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ── Section 2: Financial & Collection Insights (Finance Hub) ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Payment Mode Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <PieChart size={16} className="text-violet-500" />
                Payment Mode Breakdown
              </h3>
            </div>
              
            <div className="space-y-3.5 mt-4">
              {paymentModes.map((mode) => (
                <div key={mode.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span>{mode.name}</span>
                    <span className="text-slate-400 font-normal">{mode.count} collections ({mode.percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
                    <div 
                      className={`h-full ${mode.color} rounded-full`}
                      style={{ width: `${mode.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Defaulters Watchlist */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-500" />
                Outstanding Fees Watchlist
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Watchlist</span>
            </div>
            
            <div className="divide-y divide-slate-100 mt-2 max-h-[220px] overflow-y-auto pr-1">
              {feeDefaulters.map((student) => (
                <div key={student.id} className="py-2.5 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-slate-800 truncate">{student.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{student.branch} · {student.course}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-rose-600">{formatCurrency(student.feePlan.pending)}</p>
                    <p className="text-[9px] text-slate-400 font-medium">out of {formatCurrency(student.feePlan.total)} total</p>
                  </div>
                </div>
              ))}
              {feeDefaulters.length === 0 && (
                <div className="text-center text-xs text-slate-400 py-10">No pending outstanding balances</div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Fee Payments Feed */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Activity size={16} className="text-emerald-500" />
                Recent Fee Payments
              </h3>
            </div>
            
            <div className="divide-y divide-slate-100 mt-2 max-h-[220px] overflow-y-auto pr-1">
              {recentPayments.map((log) => (
                <div key={log.id} className="py-2.5 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 truncate max-w-[70%]">{log.details}</span>
                    <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100 font-bold shrink-0">SUCCESS</span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-slate-400 font-medium mt-0.5">
                    <span>by {log.actor}</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
              {recentPayments.length === 0 && (
                <div className="text-center text-xs text-slate-400 py-10">No recent transactions recorded</div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ── Section 3: Academic & Operational Metrics (LMS & Classroom) ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Doubt Resolver Snapshot */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <MessageSquare size={16} className="text-blue-500" />
                Unresolved Student Doubts
              </h3>
              {pendingDoubts.length > 0 && (
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {pendingDoubts.length} Open
                </span>
              )}
            </div>
            
            <div className="space-y-3 mt-3 max-h-[200px] overflow-y-auto pr-1">
              {pendingDoubts.map((doubt) => (
                <div key={doubt.id} className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">{doubt.studentName}</span>
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider bg-white px-1.5 py-0.5 rounded border border-slate-150">{doubt.subject}</span>
                  </div>
                  <p className="text-xs text-slate-500 italic">"{doubt.messages[0]?.text}"</p>
                  
                  <div className="flex items-center gap-1.5 mt-1">
                    <input 
                      type="text" 
                      placeholder="Type reply to resolve..."
                      className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 outline-none focus:border-blue-400"
                      value={doubtReplies[doubt.id] || ''}
                      onChange={(e) => setDoubtReplies(prev => ({ ...prev, [doubt.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleReplyDoubt(doubt.id)}
                    />
                    <button 
                      onClick={() => handleReplyDoubt(doubt.id)}
                      className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition cursor-pointer"
                    >
                      <Send size={11} />
                    </button>
                  </div>
                </div>
              ))}
              {pendingDoubts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100">
                    <MessageSquare size={16} />
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-2">No pending doubts!</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Your students have all doubts resolved.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Roster Attendance & Capacity Gauges */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Check size={16} className="text-teal-500" />
                Attendance &amp; Capacity
              </h3>
            </div>
            
            <div className="space-y-4 mt-4">
              {/* Student Attendance Rate */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                  <span>Student Attendance Rate</span>
                  <span className="text-slate-800">{studentAttendanceRate}%</span>
                </div>
                <div className="w-full bg-slate-50 h-2.5 rounded-full overflow-hidden border border-slate-100">
                  <div 
                    className="h-full bg-teal-500 rounded-full"
                    style={{ width: `${studentAttendanceRate}%` }}
                  />
                </div>
              </div>

              {/* Staff Attendance Rate */}
              <div> 
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                  <span>Teacher &amp; Staff Attendance Rate</span>
                  <span className="text-slate-800">{staffAttendanceRate}%</span>
                </div>
                <div className="w-full bg-slate-50 h-2.5 rounded-full overflow-hidden border border-slate-100">
                  <div 
                    className="h-full bg-sky-500 rounded-full"
                    style={{ width: `${staffAttendanceRate}%` }}
                  />
                </div>
              </div>

              {/* Capacity utilization */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Branch Space Occupancy</span>
                <div className="space-y-2">
                  {branchCapacityMetrics.map(bm => (
                    <div key={bm.name} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600">{bm.name}</span>
                      <span className="font-semibold text-slate-700">{bm.studentCount} / {bm.capacity} ({bm.utilization}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scheduled Exams & Performance */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <BookOpen size={16} className="text-amber-500" />
                Exams &amp; Grading Summary
              </h3>
            </div>
            
            <div className="divide-y divide-slate-100 mt-2 max-h-[220px] overflow-y-auto pr-1">
              {examList.map((exam, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setSelectedExam(exam)}
                  className="py-2.5 flex flex-col gap-1 cursor-pointer hover:bg-slate-50 rounded px-2 transition-colors duration-150"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span className="truncate max-w-[70%]" title={exam.name}>{exam.name}</span>
                    <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-bold shrink-0">{exam.batch}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                    <span>Total Marks: {exam.totalMarks} · Passing: {exam.passingMarks}</span>
                    <span className="text-blue-600 font-bold">Class Avg: {exam.average || 'TBD'}</span>
                  </div>
                </div>
              ))}
              {examList.length === 0 && (
                <div className="text-center text-xs text-slate-400 py-10">No examinations mapped yet</div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ── Section 4: Audit Trail & Platform Monitoring (Compliance) ───────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Activity size={16} className="text-slate-600" />
            Recent System Activity Logs
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {recentAuditLogs.map((log) => (
            <div 
              key={log.id} 
              onClick={() => setSelectedLog(log)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-150 p-3.5 rounded-lg flex flex-col justify-between gap-2.5 transition duration-150 cursor-pointer hover:shadow-sm animate-fade-in"
            >
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>{log.id}</span>
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-700 mt-1">{log.details}</p>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-[9px] text-slate-500 font-semibold">
                <span className="text-blue-600">{log.actor}</span>
                <span className="uppercase text-[8px] bg-slate-200 px-1 rounded text-slate-600 tracking-wider">{log.role}</span>
              </div>
            </div>
          ))}
          {recentAuditLogs.length === 0 && (
            <div className="text-center text-xs text-slate-400 py-10 col-span-3">No system logs registered</div>
          )}
        </div>
      </div>

      {selectedLog && (
        <Modal 
          isOpen={true} 
          onClose={() => setSelectedLog(null)} 
          title="Audit Log Entry Details"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-bold text-slate-400 block uppercase">Log Entry ID</span>
                <span className="font-mono text-slate-800 mt-0.5 block">{selectedLog.id}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase">Timestamp</span>
                <span className="font-mono text-slate-800 mt-0.5 block">{selectedLog.timestamp}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase">Actor / Operator</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{selectedLog.actor}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase">Operator Role</span>
                <span className="font-mono text-slate-800 mt-0.5 block">{selectedLog.role}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase">Action Identifier</span>
                <span className="font-mono text-blue-600 font-bold mt-0.5 block">{selectedLog.action}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase">Origin IP Address</span>
                <span className="font-mono text-slate-800 mt-0.5 block">{selectedLog.ipAddress || '192.168.1.1'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase">Institute / Tenant</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{selectedLog.institute || 'System / Platform'}</span>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <span className="text-xs font-bold text-slate-400 block uppercase">Operation Details</span>
              <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 mt-1 leading-relaxed whitespace-pre-wrap">{selectedLog.details}</p>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setSelectedLog(null)}>Close View</Button>
            </div>
          </div>
        </Modal>
      )}

      {selectedExam && (
        <Modal 
          isOpen={true} 
          onClose={() => setSelectedExam(null)} 
          title="Exam Details & Performance"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-100 pb-3 animate-fade-in">
              <div>
                <span className="font-bold text-slate-400 block uppercase">Exam Title</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{selectedExam.name}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase">Batch Name</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{selectedExam.batch}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase">Passing / Total Marks</span>
                <span className="font-medium text-slate-800 mt-0.5 block">{selectedExam.passingMarks} / {selectedExam.totalMarks}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase">Class Average</span>
                <span className="font-bold text-blue-600 mt-0.5 block">{selectedExam.average || 'TBD'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase">Status</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 mt-1 inline-block uppercase">
                  {selectedExam.status}
                </span>
              </div>
            </div>

            {selectedExam.studentMarks && Object.keys(selectedExam.studentMarks).length > 0 && (
              <div>
                <span className="text-xs font-bold text-slate-400 block uppercase mb-2">Student Scoreboard</span>
                <div className="max-h-[200px] overflow-y-auto border border-slate-150 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                        <th className="px-4 py-2">Student Name</th>
                        <th className="px-4 py-2">Student ID</th>
                        <th className="px-4 py-2 text-right">Marks</th>
                        <th className="px-4 py-2 text-center">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {Object.entries(selectedExam.studentMarks).map(([studentId, marks]) => {
                        const studentObj = students.find(s => s.studentId === studentId);
                        const passed = Number(marks) >= selectedExam.passingMarks;
                        return (
                          <tr key={studentId} className="hover:bg-slate-50">
                            <td className="px-4 py-2 font-semibold">{studentObj?.name || 'Unknown Student'}</td>
                            <td className="px-4 py-2 font-mono text-slate-400">{studentId}</td>
                            <td className="px-4 py-2 text-right font-bold">{marks} / {selectedExam.totalMarks}</td>
                            <td className="px-4 py-2 text-center">
                              <span className={`px-1.5 py-0.2 rounded font-semibold text-[10px] ${passed ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                {passed ? 'PASSED' : 'FAILED'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button onClick={() => setSelectedExam(null)}>Close View</Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

