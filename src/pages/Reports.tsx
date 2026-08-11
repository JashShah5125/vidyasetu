import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Award,
  Filter,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';
import { INITIAL_SUBJECTS_MAP } from '../data/mockData';
import { useLocation } from 'react-router-dom';
import { getVouchers } from '../utils/expenseService';
import type { Voucher } from '../utils/expenseService';

interface PeriodData {
  admissions: string;
  revenue: string;
  avgMarks: string;
  chartLabels: string[];
  admissionsChart: number[];
  revenueChart: number[];
}

interface FilteredData {
  day: PeriodData;
  week: PeriodData;
  month: PeriodData;
  year: PeriodData;
}

const tenantMetrics: Record<string, FilteredData> = {
  All: {
    day: {
      admissions: '1 Student',
      revenue: 'Rs. 8K',
      avgMarks: '84.0%',
      chartLabels: ['9 AM', '12 PM', '3 PM', '6 PM', '9 PM'],
      admissionsChart: [30, 110, 50, 30, 10],
      revenueChart: [40, 140, 70, 40, 20]
    },
    week: {
      admissions: '4 Students',
      revenue: 'Rs. 45K',
      avgMarks: '83.5%',
      chartLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      admissionsChart: [40, 80, 60, 110, 80, 20, 10],
      revenueChart: [60, 110, 90, 150, 110, 30, 20]
    },
    month: {
      admissions: '12 Students',
      revenue: 'Rs. 1.3L',
      avgMarks: '83.8%',
      chartLabels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      admissionsChart: [80, 150, 190, 110],
      revenueChart: [110, 190, 220, 140]
    },
    year: {
      admissions: '72 Students',
      revenue: 'Rs. 8.5L',
      avgMarks: '83.2%',
      chartLabels: ['2022', '2023', '2024', '2025', '2026'],
      admissionsChart: [80, 120, 160, 190, 220],
      revenueChart: [90, 130, 170, 200, 230]
    }
  },
  'VS-001': {
    day: {
      admissions: '1 Student',
      revenue: 'Rs. 6K',
      avgMarks: '85.0%',
      chartLabels: ['9 AM', '12 PM', '3 PM', '6 PM', '9 PM'],
      admissionsChart: [20, 90, 30, 20, 0],
      revenueChart: [30, 110, 40, 30, 10]
    },
    week: {
      admissions: '3 Students',
      revenue: 'Rs. 32K',
      avgMarks: '85.5%',
      chartLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      admissionsChart: [30, 60, 40, 90, 60, 10, 0],
      revenueChart: [40, 85, 65, 120, 85, 20, 10]
    },
    month: {
      admissions: '7 Students',
      revenue: 'Rs. 95K',
      avgMarks: '85.2%',
      chartLabels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      admissionsChart: [50, 110, 140, 90],
      revenueChart: [80, 140, 170, 110]
    },
    year: {
      admissions: '48 Students',
      revenue: 'Rs. 6.2L',
      avgMarks: '84.8%',
      chartLabels: ['2022', '2023', '2024', '2025', '2026'],
      admissionsChart: [55, 85, 115, 135, 155],
      revenueChart: [65, 95, 125, 145, 175]
    }
  },
  'VS-002': {
    day: {
      admissions: '0 Students',
      revenue: 'Rs. 2K',
      avgMarks: '82.0%',
      chartLabels: ['9 AM', '12 PM', '3 PM', '6 PM', '9 PM'],
      admissionsChart: [10, 20, 20, 10, 10],
      revenueChart: [10, 30, 30, 10, 10]
    },
    week: {
      admissions: '1 Student',
      revenue: 'Rs. 13K',
      avgMarks: '81.2%',
      chartLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      admissionsChart: [10, 20, 20, 20, 20, 10, 10],
      revenueChart: [20, 25, 25, 30, 25, 10, 10]
    },
    month: {
      admissions: '3 Students',
      revenue: 'Rs. 25K',
      avgMarks: '81.5%',
      chartLabels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      admissionsChart: [30, 40, 50, 20],
      revenueChart: [30, 50, 50, 30]
    },
    year: {
      admissions: '24 Students',
      revenue: 'Rs. 2.3L',
      avgMarks: '80.8%',
      chartLabels: ['2022', '2023', '2024', '2025', '2026'],
      admissionsChart: [25, 35, 45, 55, 65],
      revenueChart: [25, 35, 45, 55, 55]
    }
  },
  'VS-003': {
    day: {
      admissions: '0 Students',
      revenue: 'Rs. 0',
      avgMarks: '84.0%',
      chartLabels: ['9 AM', '12 PM', '3 PM', '6 PM', '9 PM'],
      admissionsChart: [0, 0, 0, 0, 0],
      revenueChart: [0, 0, 0, 0, 0]
    },
    week: {
      admissions: '0 Students',
      revenue: 'Rs. 0',
      avgMarks: '84.0%',
      chartLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      admissionsChart: [0, 0, 0, 0, 0, 0, 0],
      revenueChart: [0, 0, 0, 0, 0, 0, 0]
    },
    month: {
      admissions: '2 Students',
      revenue: 'Rs. 10K',
      avgMarks: '84.0%',
      chartLabels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      admissionsChart: [0, 10, 10, 0],
      revenueChart: [0, 10, 10, 0]
    },
    year: {
      admissions: '12 Students',
      revenue: 'Rs. 1.0L',
      avgMarks: '84.0%',
      chartLabels: ['2022', '2023', '2024', '2025', '2026'],
      admissionsChart: [15, 20, 20, 25, 20],
      revenueChart: [15, 20, 20, 25, 15]
    }
  }
};

const branchMetrics: Record<string, FilteredData> = {
  All: {
    day: {
      admissions: '1 Student',
      revenue: 'Rs. 8K',
      avgMarks: '84.0%',
      chartLabels: ['9 AM', '12 PM', '3 PM', '6 PM', '9 PM'],
      admissionsChart: [30, 110, 50, 30, 10],
      revenueChart: [40, 140, 70, 40, 20]
    },
    week: {
      admissions: '4 Students',
      revenue: 'Rs. 45K',
      avgMarks: '83.5%',
      chartLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      admissionsChart: [40, 80, 60, 110, 80, 20, 10],
      revenueChart: [60, 110, 90, 150, 110, 30, 20]
    },
    month: {
      admissions: '12 Students',
      revenue: 'Rs. 1.3L',
      avgMarks: '83.8%',
      chartLabels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      admissionsChart: [80, 150, 190, 110],
      revenueChart: [110, 190, 220, 140]
    },
    year: {
      admissions: '72 Students',
      revenue: 'Rs. 8.5L',
      avgMarks: '83.2%',
      chartLabels: ['2022', '2023', '2024', '2025', '2026'],
      admissionsChart: [80, 120, 160, 190, 220],
      revenueChart: [90, 130, 170, 200, 230]
    }
  },
  'Mumbai West': {
    day: {
      admissions: '1 Student',
      revenue: 'Rs. 6K',
      avgMarks: '85.0%',
      chartLabels: ['9 AM', '12 PM', '3 PM', '6 PM', '9 PM'],
      admissionsChart: [20, 90, 30, 20, 0],
      revenueChart: [30, 110, 40, 30, 10]
    },
    week: {
      admissions: '3 Students',
      revenue: 'Rs. 32K',
      avgMarks: '85.5%',
      chartLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      admissionsChart: [30, 60, 40, 90, 60, 10, 0],
      revenueChart: [40, 85, 65, 120, 85, 20, 10]
    },
    month: {
      admissions: '8 Students',
      revenue: 'Rs. 95K',
      avgMarks: '85.2%',
      chartLabels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      admissionsChart: [50, 110, 140, 90],
      revenueChart: [80, 140, 170, 110]
    },
    year: {
      admissions: '48 Students',
      revenue: 'Rs. 6.2L',
      avgMarks: '84.8%',
      chartLabels: ['2022', '2023', '2024', '2025', '2026'],
      admissionsChart: [55, 85, 115, 135, 155],
      revenueChart: [65, 95, 125, 145, 175]
    }
  },
  'Pune Camp': {
    day: {
      admissions: '0 Students',
      revenue: 'Rs. 2K',
      avgMarks: '82.0%',
      chartLabels: ['9 AM', '12 PM', '3 PM', '6 PM', '9 PM'],
      admissionsChart: [10, 20, 20, 10, 10],
      revenueChart: [10, 30, 30, 10, 10]
    },
    week: {
      admissions: '1 Student',
      revenue: 'Rs. 13K',
      avgMarks: '81.2%',
      chartLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      admissionsChart: [10, 20, 20, 20, 20, 10, 10],
      revenueChart: [20, 25, 25, 30, 25, 10, 10]
    },
    month: {
      admissions: '4 Students',
      revenue: 'Rs. 35K',
      avgMarks: '81.0%',
      chartLabels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      admissionsChart: [30, 40, 50, 20],
      revenueChart: [30, 50, 50, 30]
    },
    year: {
      admissions: '24 Students',
      revenue: 'Rs. 2.3L',
      avgMarks: '80.8%',
      chartLabels: ['2022', '2023', '2024', '2025', '2026'],
      admissionsChart: [25, 35, 45, 55, 65],
      revenueChart: [25, 35, 45, 55, 55]
    }
  }
};

interface ReportsProps {
  mode?: 'saas' | 'institute';
}

export const Reports: React.FC<ReportsProps> = ({ mode = 'institute' }) => {
  const { branches, students, courses, batches, currentUser } = useApp();
  const location = useLocation();
  const [selectedTenant, setSelectedTenant] = useState('All');
  const [selectedBranch, setSelectedBranch] = useState(
    (currentUser?.role === 'branch-admin' || currentUser?.role === 'finance')
      ? currentUser.branch || 'Mumbai West'
      : 'All'
  );
  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [activeStatsTab, setActiveStatsTab] = useState<'courses' | 'programs' | 'subjects'>('courses');
  const [vouchers, setVouchers] = useState<Voucher[]>(() => getVouchers());
  const [reportTab, setReportTab] = useState<'p&l' | 'academic'>(currentUser?.role === 'finance' ? 'p&l' : 'academic');

  useEffect(() => {
    setVouchers(getVouchers());
  }, [location.pathname]);

  // ----------------------------------------------------
  // DYNAMIC P&L STATISTICS CALCULATIONS
  // ----------------------------------------------------
  const filteredVouchersForPnL = useMemo(() => {
    return vouchers.filter(v => {
      const today = '2026-08-11';
      if (timePeriod === 'day') {
        return v.date === today;
      } else if (timePeriod === 'week') {
        return v.date >= '2026-08-05' && v.date <= today;
      } else if (timePeriod === 'month') {
        return v.date.startsWith('2026-08');
      } else if (timePeriod === 'year') {
        return v.date.startsWith('2026');
      }
      return true;
    });
  }, [vouchers, timePeriod]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => selectedBranch === 'All' || s.branch === selectedBranch);
  }, [students, selectedBranch]);

  const studentFeeIncome = useMemo(() => {
    const totalPaid = filteredStudents.reduce((acc, s) => acc + s.feePlan.paid, 0);
    if (timePeriod === 'day') return Math.round(totalPaid * 0.01);
    if (timePeriod === 'week') return Math.round(totalPaid * 0.15);
    if (timePeriod === 'month') return Math.round(totalPaid * 0.40);
    return totalPaid;
  }, [filteredStudents, timePeriod]);

  const manualReceiptIncome = useMemo(() => {
    return filteredVouchersForPnL
      .filter(v => v.direction === 'Credit')
      .reduce((acc, v) => acc + v.amount, 0);
  }, [filteredVouchersForPnL]);

  const totalIncome = studentFeeIncome + manualReceiptIncome;

  const expensesByCategory = useMemo(() => {
    const breakdown: Record<string, number> = {
      'Salaries': 0,
      'Electricity': 0,
      'Maintenance': 0,
      'Stationery': 0,
      'Transport': 0,
      'Other': 0
    };
    
    filteredVouchersForPnL.forEach(v => {
      if (v.direction === 'Debit') {
        const cat = v.category in breakdown ? v.category : 'Other';
        breakdown[cat] += v.amount;
      }
    });
    
    return breakdown;
  }, [filteredVouchersForPnL]);

  const totalExpensePnL = useMemo(() => {
    return Object.values(expensesByCategory).reduce((acc, val) => acc + val, 0);
  }, [expensesByCategory]);

  const netSurplus = totalIncome - totalExpensePnL;
  const netMarginPct = totalIncome > 0 ? ((netSurplus / totalIncome) * 100).toFixed(1) : '0.0';

  const activeMetricsSet = mode === 'saas'
    ? (tenantMetrics[selectedTenant] || tenantMetrics.All)
    : (branchMetrics[selectedBranch] || branchMetrics.All);

  const currentMetrics = activeMetricsSet[timePeriod];

  const availableBranchOptions = currentUser?.role === 'branch-admin'
    ? [{ value: currentUser.branch || '', label: currentUser.branch || '' }]
    : [
        { value: 'All', label: 'All Branches' },
        ...branches.map(b => ({ value: b.name, label: b.name }))
      ];

  // ----------------------------------------------------
  // DYNAMIC ACADEMIC STATISTICS CALCULATIONS
  // ----------------------------------------------------
  const uniquePrograms = Array.from(new Set(batches.map(b => b.program).filter(Boolean))) as string[];

  const courseStats = courses.map(c => {
    const enrolledCount = students.filter(s => s.course === c.name).length;
    const courseBatches = batches.filter(b => b.course === c.name).length;
    return {
      code: c.code,
      name: c.name,
      duration: c.duration,
      batchesCount: courseBatches,
      studentsCount: enrolledCount
    };
  });

  const programStats = uniquePrograms.map(p => {
    const programBatches = batches.filter(b => b.program === p);
    const batchNames = programBatches.map(b => b.name);
    const enrolledCount = students.filter(s => batchNames.includes(s.batch || '')).length;
    return {
      name: p,
      batchesCount: programBatches.length,
      studentsCount: enrolledCount
    };
  });

  const getCourseNameByCode = (code: string) => {
    if (code === '8TH-STD') return '8th Standard';
    if (code === 'JEE-PREP') return 'JEE Prep Course';
    if (code === 'NEET-PREM') return 'NEET Batch Premium';
    if (code === 'FOUND-10') return 'Class 10 Foundation';
    return code;
  };

  const subjectStats = Object.keys(INITIAL_SUBJECTS_MAP).flatMap(key => {
    const parts = key.split('-');
    const courseCodePart = parts[0] === '8TH' ? '8TH-STD' : parts[0] === 'JEE' ? 'JEE-PREP' : parts[0] === 'NEET' ? 'NEET-PREM' : 'FOUND-10';
    const levelPart = parts[parts.length - 1];
    const programPart = parts.slice(parts[0] === '8TH' ? 2 : 1, parts.length - 1).join('-');

    const matchingBatches = batches.filter(b => 
      b.course === getCourseNameByCode(courseCodePart) && 
      b.program === programPart && 
      b.level === levelPart
    );
    const batchNames = matchingBatches.map(b => b.name);
    const enrolledCount = students.filter(s => batchNames.includes(s.batch || '')).length;

    const subjectsList = INITIAL_SUBJECTS_MAP[key] || [];
    return subjectsList.map(item => ({
      id: item.id,
      code: item.code,
      name: item.name,
      type: item.type,
      course: getCourseNameByCode(courseCodePart),
      program: programPart,
      studentsCount: enrolledCount
    }));
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">
            {mode === 'saas' ? 'Analytics & Reports Desk' : 'Institute Analytics & Reports'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {mode === 'saas' 
              ? 'Review long-term coaching revenue charts, attendance averages, and admission flows.'
              : 'Review revenue metrics, attendance statistics, and admissions across your institute\'s branches.'
            }
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 text-xs font-semibold ml-auto">
          {/* Time Period Filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 flex items-center gap-1"><Calendar size={14} /> Time:</span>
            <Select 
              value={timePeriod} 
              onChange={(e) => setTimePeriod(e.target.value as any)} 
              options={[
                { value: 'day', label: 'Daily' },
                { value: 'week', label: 'Weekly' },
                { value: 'month', label: 'Monthly' },
                { value: 'year', label: 'Yearly' }
              ]} 
              style={{ padding: '4px 8px', fontSize: '12px', minWidth: '150px' }}
            />
          </div>

          {/* Tenant/Branch Filter */}
          {mode === 'saas' ? (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 flex items-center gap-1"><Filter size={14} /> Tenant:</span>
              <Select 
                value={selectedTenant} 
                onChange={(e) => setSelectedTenant(e.target.value)} 
                options={[
                  { value: 'All', label: 'All Tenants' },
                  { value: 'VS-001', label: 'Apex IIT Academy' },
                  { value: 'VS-002', label: 'Vanguard Classes' },
                  { value: 'VS-003', label: 'Bright Future Tuition' }
                ]} 
                style={{ padding: '4px 8px', fontSize: '12px', minWidth: '180px' }}
              />
            </div>
          ) : (
            currentUser?.role !== 'finance' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 flex items-center gap-1"><Filter size={14} /> Branch:</span>
                <Select 
                  value={selectedBranch} 
                  onChange={(e) => setSelectedBranch(e.target.value)} 
                  options={availableBranchOptions} 
                  style={{ padding: '4px 8px', fontSize: '12px', minWidth: '180px' }}
                  disabled={currentUser?.role === 'branch-admin'}
                />
              </div>
            )
          )}
        </div>
      </div>

      {/* Report Type Tabs */}
      {mode === 'saas' ? (
        <div className="space-y-6">
          {/* SaaS Cards stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            <Card>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">New Admissions</span>
                  <div className="text-2xl font-display font-bold text-slate-900 mt-1">{currentMetrics.admissions}</div>
                </div>
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100">
                  <Users size={18} />
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gross Revenue</span>
                  <div className="text-2xl font-display font-bold text-slate-900 mt-1">{currentMetrics.revenue}</div>
                </div>
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center border border-emerald-100">
                  <DollarSign size={18} />
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Average Marks</span>
                  <div className="text-2xl font-display font-bold text-slate-900 mt-1">{currentMetrics.avgMarks}</div>
                </div>
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center border border-indigo-100">
                  <Award size={18} />
                </div>
              </div>
            </Card>
          </div>

          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Tenant Performance Comparison Matrix</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                    <th className="px-6 py-4">Tenant Code</th>
                    <th className="px-6 py-4">Institute Name</th>
                    <th className="px-6 py-4 text-center">New Admissions</th>
                    <th className="px-6 py-4 text-center">Gross Revenue</th>
                    <th className="px-6 py-4 text-center">Avg Test Marks</th>
                    <th className="px-6 py-4 text-center">Access Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                  {[
                    { code: 'TEN-VS1', name: 'Apex IIT Academy', admissions: '12 Students', revenue: '₹1,30,000', marks: '83.8%', status: 'Active' },
                    { code: 'TEN-VS2', name: 'Vanguard Classes', admissions: '6 Students', revenue: '₹55,000', marks: '78.5%', status: 'Active' },
                    { code: 'TEN-VS3', name: 'Bright Future Tuition', admissions: '2 Students', revenue: '₹10,000', marks: '84.0%', status: 'Active' }
                  ].map((row) => (
                    <tr key={row.code} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">{row.code}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{row.name}</td>
                      <td className="px-6 py-4 text-center font-medium">{row.admissions}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-800">{row.revenue}</td>
                      <td className="px-6 py-4 text-center font-medium text-slate-700">{row.marks}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* P&L Cards summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Card className="p-5 border border-slate-200 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Revenue</span>
                <div className="text-3xl font-display font-extrabold text-emerald-600 mt-1">₹{totalIncome.toLocaleString()}</div>
                <span className="text-[10px] text-slate-400 font-semibold block mt-1">Fee Receipts + Ledger Credits</span>
              </div>
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
                <ArrowUpRight size={24} />
              </div>
            </Card>

            <Card className="p-5 border border-slate-200 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Operating Expenses</span>
                <div className="text-3xl font-display font-extrabold text-rose-600 mt-1">₹{totalExpensePnL.toLocaleString()}</div>
                <span className="text-[10px] text-slate-400 font-semibold block mt-1">Voucher Debit Outflows</span>
              </div>
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center border border-rose-100">
                <ArrowDownLeft size={24} />
              </div>
            </Card>

            <Card className="p-5 border border-slate-200 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Net Surplus (Profit)</span>
                <div className={`text-3xl font-display font-extrabold mt-1 ${netSurplus >= 0 ? 'text-blue-600' : 'text-rose-700'}`}>
                  ₹{netSurplus.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-400 font-semibold block mt-1">Margin Percentage: {netMarginPct}%</span>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                netSurplus >= 0 ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-red-50 text-red-600 border-red-100'
              }`}>
                <TrendingUp size={24} />
              </div>
            </Card>
          </div>

          {/* Detailed Statement Table */}
          <Card className="border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
            <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base tracking-wide uppercase font-mono">Profit &amp; Loss Statement</h3>
                <p className="text-[10px] text-slate-300 mt-0.5">Apex IIT Academy &bull; Period: {timePeriod.toUpperCase()}</p>
              </div>
              <span className="text-xs font-mono font-bold bg-slate-700/60 px-3 py-1 rounded border border-slate-600 text-slate-300">
                FY 2026-2027
              </span>
            </div>

            <div className="p-6">
              <table className="w-full text-left border-collapse">
                <tbody>
                  {/* Revenue Header */}
                  <tr className="bg-slate-100/80 font-bold border-b border-slate-200 text-slate-800 text-sm uppercase">
                    <td className="px-6 py-3">1. Revenue / Operating Inflows</td>
                    <td className="px-6 py-3 text-right">Amount (₹)</td>
                  </tr>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-8 py-3 text-sm text-slate-600 font-medium">Student Tuition Fees Collections</td>
                    <td className="px-6 py-3 text-right font-mono font-bold text-slate-900">₹{studentFeeIncome.toLocaleString()}</td>
                  </tr>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-8 py-3 text-sm text-slate-600 font-medium">Manual Receipts &amp; Donations</td>
                    <td className="px-6 py-3 text-right font-mono font-bold text-slate-900">₹{manualReceiptIncome.toLocaleString()}</td>
                  </tr>
                  <tr className="bg-emerald-50/40 border-b border-slate-200 font-bold">
                    <td className="px-6 py-3 text-sm text-emerald-800">Total Revenue (A)</td>
                    <td className="px-6 py-3 text-right font-mono font-bold text-emerald-700">₹{totalIncome.toLocaleString()}</td>
                  </tr>

                  {/* Expenses Header */}
                  <tr className="bg-slate-100/80 font-bold border-b border-slate-200 text-slate-800 text-sm uppercase pt-6">
                    <td className="px-6 py-3">2. Operating Expenses / Outflows</td>
                    <td className="px-6 py-3 text-right">Amount (₹)</td>
                  </tr>
                  {Object.entries(expensesByCategory).map(([cat, amt]) => (
                    <tr key={cat} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-8 py-3 text-sm text-slate-600 font-medium">{cat} Expenditures</td>
                      <td className="px-6 py-3 text-right font-mono font-semibold text-slate-700">₹{amt.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-rose-50/40 border-b border-slate-200 font-bold">
                    <td className="px-6 py-3 text-sm text-rose-800">Total Expenses (B)</td>
                    <td className="px-6 py-3 text-right font-mono font-bold text-rose-700">₹{totalExpensePnL.toLocaleString()}</td>
                  </tr>

                  {/* Summary row */}
                  <tr className="bg-slate-800 text-white font-bold text-base">
                    <td className="px-6 py-4 rounded-bl-xl">Net Surplus</td>
                    <td className="px-6 py-4 text-right font-mono rounded-br-xl">₹{netSurplus.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* Consolidated branch performance metric */}
          {selectedBranch === 'All' && currentUser?.role !== 'branch-admin' && (
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle>Branch Consolidated Performance Matrix</CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                      <th className="px-6 py-4">Branch Code</th>
                      <th className="px-6 py-4">Branch Name</th>
                      <th className="px-6 py-4 text-center">New Admissions</th>
                      <th className="px-6 py-4 text-center">Gross Revenue</th>
                      <th className="px-6 py-4 text-center">Avg Test Marks</th>
                      <th className="px-6 py-4 text-center">Branch Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                    {[
                      { code: 'MUM-WEST', name: 'Mumbai West', admissions: '8 Students', revenue: '₹95,000', marks: '85.2%', status: 'Active' },
                      { code: 'PUN-CAMP', name: 'Pune Camp', admissions: '4 Students', revenue: '₹35,000', marks: '81.0%', status: 'Active' }
                    ].map((row) => (
                      <tr key={row.code} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">{row.code}</td>
                        <td className="px-6 py-4 font-semibold text-slate-900">{row.name}</td>
                        <td className="px-6 py-4 text-center font-medium">{row.admissions}</td>
                        <td className="px-6 py-4 text-center font-bold text-slate-800">{row.revenue}</td>
                        <td className="px-6 py-4 text-center font-medium text-slate-700">{row.marks}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            row.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
