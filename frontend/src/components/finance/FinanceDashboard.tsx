import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  TrendingDown,
  TrendingUp,
  Clock,
  Wallet,
  FileText,
  Plus,
  ArrowRight,
  Building2,
  CreditCard,
  Briefcase,
  Zap,
  Wrench,
  Truck,
  BookOpen,
  Tag,
  RefreshCw,
  Check,
  Users,
  ShieldAlert,
  Sparkles,
  Layers,
  AlertCircle,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import { otherExpenseApi, type OtherExpenseRecord } from '../../services/otherExpenseApi';
import { otherIncomeApi, type OtherIncomeRecord } from '../../services/otherIncomeApi';
import { staffSalaryApi, type SalaryStatusSummary } from '../../services/staffSalaryApi';
import api from '../../services/api';

export type DatePreset = 'daily' | 'weekly' | 'monthly';
export type FinanceScope = 'branch' | 'institute';

interface UnifiedTransaction {
  id: string;
  date: string;
  category: string;
  description: string;
  payee?: string;
  method: string;
  amount: number;
  direction: 'Debit' | 'Credit';
  status: string;
  source: 'database';
}

interface BranchAnalyticsItem {
  id: number;
  name: string;
  studentsCount: number;
  arr: number;
  mrr: number;
  totalExpected: number;
  totalCollected: number;
  totalRemaining: number;
  overdueAmount: number;
  defaulterCount: number;
  contributionPct: number;
  realizationRate: number;
}

interface PaymentModeItem {
  mode: string;
  count: number;
  amount: number;
  percentage: number;
}

interface FinanceAnalyticsData {
  institute: {
    name: string;
    totalStudents: number;
    arr: number;
    mrr: number;
    totalExpected: number;
    totalCollected: number;
    totalRemaining: number;
    overdueAmount: number;
    defaulterCount: number;
    realizationRate: number;
  };
  branch: BranchAnalyticsItem;
  branchesComparison: BranchAnalyticsItem[];
  paymentModes: PaymentModeItem[];
  periodFees?: {
    today_inst?: number | string;
    week_inst?: number | string;
    month_inst?: number | string;
    today_branch?: number | string;
    week_branch?: number | string;
    month_branch?: number | string;
  };
  periodExpenses?: {
    today_inst_exp?: number | string;
    week_inst_exp?: number | string;
    month_inst_exp?: number | string;
    today_branch_exp?: number | string;
    week_branch_exp?: number | string;
    month_branch_exp?: number | string;
  };
  expenseTrend?: Array<{
    label: string;
    year: string;
    ym: string;
    amount: number | string;
  }>;
}

const formatCompactCurrency = (val: number): string => {
  const num = Math.round(val || 0);
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)} L`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
};

const CircularProgress: React.FC<{ percentage: number; strokeColor: string; size?: number }> = ({
  percentage,
  strokeColor,
  size = 34
}) => {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePct = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = circumference - (safePct / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e2e8f0"
          strokeWidth="3"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <span className="absolute text-[8px] font-mono font-bold text-slate-800">
        {Math.round(safePct)}%
      </span>
    </div>
  );
};

export const FinanceDashboard: React.FC = () => {
  const { currentUser, branches } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // ── Scoping & Filtering ──
  const [scope, setScope] = useState<FinanceScope>('branch');
  const [preset, setPreset] = useState<DatePreset>('monthly');
  const [cashFlowTab, setCashFlowTab] = useState<'inflows' | 'outflows'>('inflows');

  // ── Live Database State ──
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);
  const [isLoadingDb, setIsLoadingDb] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [justRefreshed, setJustRefreshed] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');

  const [dbExpenses, setDbExpenses] = useState<OtherExpenseRecord[]>([]);
  const [dbIncomes, setDbIncomes] = useState<OtherIncomeRecord[]>([]);
  const [dbSalarySummary, setDbSalarySummary] = useState<SalaryStatusSummary | null>(null);
  const [analyticsData, setAnalyticsData] = useState<FinanceAnalyticsData | null>(null);

  const [selectedTransaction, setSelectedTransaction] = useState<UnifiedTransaction | null>(null);

  // ── Load live database financial intelligence ──
  const fetchDatabaseData = useCallback(async () => {
    setIsRefreshing(true);
    const startTime = Date.now();
    try {
      const now = new Date();
      const resolvedBranchId = currentUser?.branchId
        || (currentUser as any)?.branch_id
        || (branches.find(b => b.name === currentUser?.branch)?.id)
        || branches[0]?.id;
      const branchParam = resolvedBranchId ? { branchId: resolvedBranchId } : {};

      const [expensesRes, incomesRes, salaryRes, analyticsRes] = await Promise.allSettled([
        otherExpenseApi.getOtherExpenses({ limit: 200, ...(resolvedBranchId ? { branchId: resolvedBranchId } : {}) }),
        otherIncomeApi.getOtherIncomes({ limit: 200, ...(resolvedBranchId ? { branchId: resolvedBranchId } : {}) }),
        staffSalaryApi.getSalaryStatus({ month: now.getMonth() + 1, year: now.getFullYear() }).catch(() => null),
        api.get('/branch/finance/analytics', { params: branchParam })
      ]);

      let hasLiveDb = false;

      if (expensesRes.status === 'fulfilled' && expensesRes.value?.records) {
        setDbExpenses(expensesRes.value.records);
        hasLiveDb = true;
      }

      if (incomesRes.status === 'fulfilled' && incomesRes.value?.records) {
        setDbIncomes(incomesRes.value.records);
        hasLiveDb = true;
      }

      if (salaryRes.status === 'fulfilled' && salaryRes.value?.summary) {
        setDbSalarySummary(salaryRes.value.summary);
      }

      if (analyticsRes.status === 'fulfilled' && analyticsRes.value?.data?.data) {
        setAnalyticsData(analyticsRes.value.data.data);
        hasLiveDb = true;
      }

      setIsDbConnected(hasLiveDb);

      // Keep minimum 450ms spinning feel so user sees it actively refreshing
      const elapsed = Date.now() - startTime;
      if (elapsed < 450) {
        await new Promise(r => setTimeout(r, 450 - elapsed));
      }

      setJustRefreshed(true);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastRefreshedAt(timeStr);
      setTimeout(() => setJustRefreshed(false), 2000);
    } catch (err) {
      console.warn('Failed to load database financial data:', err);
      setIsDbConnected(false);
    } finally {
      setIsLoadingDb(false);
      setIsRefreshing(false);
    }
  }, [currentUser, branches]);

  useEffect(() => {
    fetchDatabaseData();
  }, [fetchDatabaseData, location.pathname]);

  // ── Normalize Date to Local YYYY-MM-DD ──
  const toLocalDateStr = useCallback((val: any): string => {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val).slice(0, 10);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const referenceDateStr = useMemo(() => {
    return toLocalDateStr(new Date());
  }, [toLocalDateStr]);

  const weekRange = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(today);
    mon.setDate(today.getDate() + diffToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return {
      start: toLocalDateStr(mon),
      end: toLocalDateStr(sun)
    };
  }, [toLocalDateStr]);

  const isDateInPreset = useCallback((dateStr: string) => {
    if (!dateStr) return false;
    const d = toLocalDateStr(dateStr);
    if (preset === 'daily') {
      return d === referenceDateStr;
    }
    if (preset === 'weekly') {
      return d >= weekRange.start && d <= weekRange.end;
    }
    const currentMonthPrefix = referenceDateStr.slice(0, 7);
    return d.startsWith(currentMonthPrefix);
  }, [preset, referenceDateStr, weekRange, toLocalDateStr]);

  // ── Filtered DB Datasets ──
  const filteredDbExpenses = useMemo(() => {
    return dbExpenses.filter(e => isDateInPreset(e.expense_date));
  }, [dbExpenses, isDateInPreset]);

  const filteredDbIncomes = useMemo(() => {
    return dbIncomes.filter(i => isDateInPreset(i.income_date));
  }, [dbIncomes, isDateInPreset]);

  // ── Active Scope Metrics ──
  const activeMetrics = useMemo(() => {
    if (!analyticsData) return null;
    return scope === 'institute' ? analyticsData.institute : analyticsData.branch;
  }, [scope, analyticsData]);

  // ── Dynamic Dynamic Calculations From Database ──
  const totalPeriodFeeIncome = useMemo(() => {
    if (!analyticsData) return 0;
    const pf = analyticsData.periodFees || {};

    if (scope === 'institute') {
      if (preset === 'daily') return Number(pf.today_inst || 0);
      if (preset === 'weekly') return Number(pf.week_inst || 0);
      return Number(pf.month_inst || analyticsData.institute.totalCollected || 0);
    } else {
      if (preset === 'daily') return Number(pf.today_branch || 0);
      if (preset === 'weekly') return Number(pf.week_branch || 0);
      return Number(pf.month_branch || analyticsData.branch.totalCollected || 0);
    }
  }, [scope, preset, analyticsData]);

  const otherIncomeTotal = useMemo(() => {
    return filteredDbIncomes.reduce((a, b) => a + Number(b.amount || 0), 0);
  }, [filteredDbIncomes]);

  const totalIncome = useMemo(() => {
    return totalPeriodFeeIncome + otherIncomeTotal;
  }, [totalPeriodFeeIncome, otherIncomeTotal]);

  const totalDebitExpenses = useMemo(() => {
    const vouchersSum = filteredDbExpenses.reduce((a, b) => a + Number(b.amount || 0), 0);
    const salariesSum = preset === 'monthly' && dbSalarySummary?.paidAmount
      ? Number(dbSalarySummary.paidAmount)
      : 0;
    return vouchersSum + salariesSum;
  }, [filteredDbExpenses, preset, dbSalarySummary]);

  const currentBalance = totalIncome - totalDebitExpenses;
  const activePeriodSpend = totalDebitExpenses;

  // Overdue and Defaulters directly from database
  const overdueReceivables = useMemo(() => {
    if (!activeMetrics) return 0;
    return activeMetrics.overdueAmount || 0;
  }, [activeMetrics]);

  const defaultersCount = useMemo(() => {
    if (!activeMetrics) return 0;
    return activeMetrics.defaulterCount || 0;
  }, [activeMetrics]);

  // ── Live Recent Transactions from DB ──
  const recentTransactions = useMemo<UnifiedTransaction[]>(() => {
    const list: UnifiedTransaction[] = [];

    dbExpenses.forEach(e => {
      list.push({
        id: e.expense_record_number || `OEX-${e.id}`,
        date: e.expense_date ? String(e.expense_date).slice(0, 10) : referenceDateStr,
        category: e.category || 'Maintenance',
        description: e.title || e.description || 'Expense Voucher',
        payee: e.payee || undefined,
        method: e.payment_mode ? e.payment_mode.replace('_', ' ').toUpperCase() : 'Bank Transfer',
        amount: Number(e.amount || 0),
        direction: 'Debit',
        status: e.status === 2 ? 'Paid' : e.status === 0 ? 'Pending' : e.status === 1 ? 'Approved' : 'Pending',
        source: 'database'
      });
    });

    dbIncomes.forEach(i => {
      list.push({
        id: i.income_record_number || `OIN-${i.id}`,
        date: i.income_date ? String(i.income_date).slice(0, 10) : referenceDateStr,
        category: 'Other Income',
        description: i.title || i.description || 'Income Receipt',
        method: i.payment_mode ? i.payment_mode.replace('_', ' ').toUpperCase() : 'Bank Transfer',
        amount: Number(i.amount || 0),
        direction: 'Credit',
        status: 'Paid',
        source: 'database'
      });
    });

    return list
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [dbExpenses, dbIncomes, referenceDateStr]);

  // ── Category Breakdown directly from DB ──
  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};

    filteredDbExpenses.forEach(e => {
      const cat = e.category || 'Other';
      breakdown[cat] = (breakdown[cat] || 0) + Number(e.amount || 0);
    });
    if (preset === 'monthly' && dbSalarySummary?.paidAmount) {
      breakdown['Salaries'] = (breakdown['Salaries'] || 0) + Number(dbSalarySummary.paidAmount);
    }

    const totalDebits = totalDebitExpenses || 1;

    return Object.entries(breakdown)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: Math.round((amount / totalDebits) * 100)
      }))
      .filter(c => c.amount > 0 || preset === 'monthly')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [filteredDbExpenses, preset, dbSalarySummary, totalDebitExpenses]);

  // ── Chart Visualization Data directly from DB ──
  const chartData = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    if (preset === 'daily') {
      const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const parts = weekRange.start.split('-').map(Number);
      const todayStr = referenceDateStr;

      return daysOfWeek.map((dayName, idx) => {
        const d = new Date(parts[0], parts[1] - 1, parts[2] + idx);
        const dateStr = toLocalDateStr(d);

        let dayAmount = 0;
        dbExpenses.forEach(e => {
          if (toLocalDateStr(e.expense_date) === dateStr) {
            dayAmount += Number(e.amount || 0);
          }
        });

        return {
          name: dayName,
          date: dateStr,
          amount: Math.round(dayAmount),
          isCurrent: dateStr === todayStr
        };
      });
    }

    if (preset === 'weekly') {
      const currentDay = today.getDate();
      const currentMonthPrefix = referenceDateStr.slice(0, 7);

      const weeks = [
        { name: 'Week 1', startDay: 1, endDay: 7, isCurrent: currentDay <= 7 },
        { name: 'Week 2', startDay: 8, endDay: 14, isCurrent: currentDay > 7 && currentDay <= 14 },
        { name: 'Week 3', startDay: 15, endDay: 21, isCurrent: currentDay > 14 && currentDay <= 21 },
        { name: 'Week 4', startDay: 22, endDay: 31, isCurrent: currentDay > 21 },
      ];

      return weeks.map(w => {
        let weekAmount = 0;
        dbExpenses.forEach(e => {
          const dateStr = toLocalDateStr(e.expense_date);
          if (dateStr.startsWith(currentMonthPrefix)) {
            const dayNum = Number(dateStr.slice(8, 10));
            if (dayNum >= w.startDay && dayNum <= w.endDay) {
              weekAmount += Number(e.amount || 0);
            }
          }
        });

        return {
          name: w.name,
          amount: Math.round(weekAmount),
          isCurrent: w.isCurrent
        };
      });
    }

    // Default: Monthly Trend (trailing 4 calendar months directly from DB)
    const months = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const monthPrefix = `${y}-${String(m + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
      const yearLabel = String(y);

      let totalMonthExpense = 0;
      dbExpenses.forEach(e => {
        const expDate = toLocalDateStr(e.expense_date);
        if (expDate.startsWith(monthPrefix)) {
          totalMonthExpense += Number(e.amount || 0);
        }
      });
      if (i === 0 && dbSalarySummary?.paidAmount) {
        totalMonthExpense += Number(dbSalarySummary.paidAmount);
      }

      months.push({
        name: monthLabel,
        year: yearLabel,
        amount: Math.round(totalMonthExpense),
        isCurrent: i === 0
      });
    }

    return months;
  }, [preset, referenceDateStr, weekRange, dbExpenses, dbSalarySummary, toLocalDateStr]);

  const peakChartAmount = useMemo(() => {
    return Math.max(...chartData.map(m => m.amount), 0);
  }, [chartData]);

  // Payment method badge
  const getPaymentBadge = (method: string) => {
    const m = (method || '').toUpperCase();
    if (m.includes('BANK') || m.includes('NETBANKING')) {
      return { label: 'Bank Transfer', icon: Building2, cls: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    if (m.includes('UPI')) {
      return { label: 'UPI', icon: Zap, cls: 'bg-purple-50 text-purple-700 border-purple-200' };
    }
    if (m.includes('CASH')) {
      return { label: 'Cash', icon: Wallet, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    return { label: method || 'Cheque', icon: CreditCard, cls: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'Salaries':
        return { icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50', barColor: '#2563eb' };
      case 'Electricity':
        return { icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50', barColor: '#f59e0b' };
      case 'Maintenance':
        return { icon: Wrench, color: 'text-violet-600', bg: 'bg-violet-50', barColor: '#8b5cf6' };
      case 'Transport':
      case 'Travel':
        return { icon: Truck, color: 'text-emerald-600', bg: 'bg-emerald-50', barColor: '#10b981' };
      case 'Stationery':
      case 'Office Supplies':
        return { icon: BookOpen, color: 'text-rose-600', bg: 'bg-rose-50', barColor: '#f43f5e' };
      default:
        return { icon: Tag, color: 'text-slate-600', bg: 'bg-slate-100', barColor: '#64748b' };
    }
  };

  // Inflow modes pie data
  const inflowPieData = useMemo(() => {
    if (!analyticsData?.paymentModes || analyticsData.paymentModes.length === 0) return [];
    const colorMap: Record<string, string> = {
      'UPI': '#8b5cf6',
      'NetBanking': '#3b82f6',
      'Bank Transfer': '#3b82f6',
      'Cash': '#10b981',
      'Cheque': '#64748b',
      'Online Gateway': '#f59e0b',
    };
    const defaultColors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4', '#ec4899'];
    return analyticsData.paymentModes.map((pm, idx) => ({
      name: pm.mode,
      value: pm.amount,
      percentage: pm.percentage,
      count: pm.count,
      color: colorMap[pm.mode] || defaultColors[idx % defaultColors.length]
    }));
  }, [analyticsData?.paymentModes]);

  // Outflow categories pie data
  const outflowPieData = useMemo(() => {
    return categoryBreakdown.map(c => ({
      name: c.name,
      value: c.amount,
      percentage: c.percentage,
      color: getCategoryTheme(c.name).barColor
    }));
  }, [categoryBreakdown]);

  // Primary Inflow Mode calculation
  const primaryInflowMode = useMemo(() => {
    if (!analyticsData?.paymentModes || analyticsData.paymentModes.length === 0) return null;
    return [...analyticsData.paymentModes].sort((a, b) => b.amount - a.amount)[0];
  }, [analyticsData?.paymentModes]);

  // Custom Chart Tooltip
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white px-3 py-2 rounded-lg shadow-xl border border-slate-700/60 text-xs space-y-0.5 pointer-events-none">
          <div className="text-[10px] text-slate-400 font-bold uppercase">
            {preset === 'monthly' ? `${label} ${data.year || new Date().getFullYear()}` : `${label}`}
          </div>
          <div className="text-sm font-bold text-white font-mono">
            ₹{Number(data.amount).toLocaleString('en-IN')}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Pie Tooltip
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const slice = data.payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white px-2.5 py-1.5 rounded-lg shadow-xl border border-slate-700/60 text-xs pointer-events-none z-50">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: slice.color || data.fill || '#3b82f6' }} />
            <span className="text-[10px] text-slate-300 font-medium">{data.name}</span>
          </div>
          <div className="text-xs font-bold text-white font-mono mt-0.5">
            ₹{Number(data.value).toLocaleString('en-IN')}
            {slice.percentage !== undefined && (
              <span className="text-[9px] text-slate-400 font-normal ml-1 font-sans">({slice.percentage}%)</span>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // If still loading initial data from database
  if (isLoadingDb && !analyticsData) {
    return (
      <div className="p-8 text-center space-y-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs animate-pulse">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <h3 className="text-base font-bold text-slate-800">
          Fetching Live Financial Metrics from Database...
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Querying MySQL database for Institute &amp; Branch MRR, ARR, student fee assignments, voucher registers, and transaction ledgers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in pb-10">

      {/* ── Compact Header & Executive Controls ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-xl px-4 py-3 shadow-xs">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-display font-bold text-slate-900 tracking-tight leading-snug">
              Accounting &amp; Finance
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Welcome, <strong className="font-semibold text-slate-700">{currentUser?.name || 'Finance Staff'}</strong>. Enterprise MRR, ARR, cash inflows, operational books, and vouchers.
          </p>
        </div>

        {/* Action Controls & Scope Selectors */}
        <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">

          {/* Row 1: Time Filters & Refresh */}
          <div className="flex flex-wrap items-center gap-2">

            {/* Time Preset: Daily | Weekly | Monthly */}
            <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-xl border border-slate-200 shadow-2xs h-8 box-border">
              <button
                type="button"
                onClick={() => setPreset('daily')}
                className={`h-full px-2.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center ${preset === 'daily' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setPreset('weekly')}
                className={`h-full px-2.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center ${preset === 'weekly' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setPreset('monthly')}
                className={`h-full px-2.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center ${preset === 'monthly' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                Monthly
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchDatabaseData}
              disabled={isRefreshing}
              className="group flex items-center gap-1.5 h-8 px-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-2xs active:scale-95 disabled:opacity-75"
            >
              <RefreshCw
                size={13}
                className={`transition-transform duration-500 text-slate-500 group-hover:rotate-180 group-hover:text-slate-700 ${
                  isRefreshing ? 'animate-spin text-blue-600' : ''
                }`}
              />
              <span>Refresh</span>
            </button>
          </div>

          {/* Row 2: Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/expense-ledger')}
              className="group flex items-center gap-1.5 h-8 px-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap"
            >
              <FileText size={13} className="text-slate-500 group-hover:text-slate-700" />
              <span>Ledger</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/expense-voucher')}
              className="group flex items-center gap-1.5 h-8 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
            >
              <Plus size={14} className="stroke-[2.5]" />
              <span>Create Voucher</span>
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MASTER EXECUTIVE FINANCIAL & REVENUE CONSOLE
          Combined ARR, MRR, Scope Comparisons & Core Cash Ledger KPIs
         ══════════════════════════════════════════════════════════════════ */}
      {analyticsData && (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">

          {/* ── Header: Title, Live Sync & Scope Switcher ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-white border-b border-slate-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                <Layers size={14} className="stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-display font-extrabold text-slate-900 uppercase tracking-wider truncate">
                    Financial Summary
                  </h2>
                  <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Sync
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">
                  Expected yearly and monthly fees, pending balances, and live cash flow
                </p>
              </div>
            </div>

            {/* Quick Scope Segmented Selector */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/80 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setScope('institute')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${scope === 'institute'
                    ? 'bg-white text-indigo-700 shadow-2xs font-extrabold border border-indigo-100'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <Sparkles size={11} className={scope === 'institute' ? 'text-indigo-600' : 'text-slate-400'} />
                <span>All Branches</span>
              </button>
              <button
                type="button"
                onClick={() => setScope('branch')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${scope === 'branch'
                    ? 'bg-white text-blue-700 shadow-2xs font-extrabold border border-blue-100'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <Building2 size={11} className={scope === 'branch' ? 'text-blue-600' : 'text-slate-400'} />
                <span>{analyticsData.branch.name}</span>
              </button>
            </div>
          </div>

          {/* ── Active Scope Financial Intelligence Pane (Single Focused View) ── */}
          <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-50/50 via-white to-white">
            {scope === 'institute' ? (
              <div className="space-y-3.5">
                {/* Scope Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                      <Sparkles size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">
                          All Branches Overview
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <div className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                        {analyticsData.institute.name}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3 Core Metric Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50/70 rounded-xl border border-slate-150">
                  {/* ARR */}
                  <div className="px-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                      ANNUAL RUN-RATE (ARR)
                    </span>
                    <div className="text-lg sm:text-xl font-black font-mono text-slate-900 leading-tight mt-1">
                      {formatCompactCurrency(analyticsData.institute.arr)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block truncate mt-0.5">
                      ₹{analyticsData.institute.arr.toLocaleString('en-IN')} total annualized
                    </span>
                  </div>

                  {/* MRR */}
                  <div className="px-2 sm:border-l border-slate-200/80">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 block">
                      MONTHLY RECURRING (MRR)
                    </span>
                    <div className="text-lg sm:text-xl font-black font-mono text-indigo-600 leading-tight mt-1">
                      {formatCompactCurrency(analyticsData.institute.mrr)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block truncate mt-0.5">
                      ₹{analyticsData.institute.mrr.toLocaleString('en-IN')}/mo run-rate
                    </span>
                  </div>

                  {/* Realization Rate */}
                  <div className="px-2 sm:border-l border-slate-200/80 flex items-center justify-between">
                    <div className="min-w-0">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                        Fee Collection Rate
                      </span>
                      <div className="text-lg sm:text-xl font-black font-mono text-emerald-600 leading-tight mt-1">
                        {analyticsData.institute.realizationRate}%
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                        Fee Collections Realized
                      </span>
                    </div>
                    <CircularProgress
                      percentage={analyticsData.institute.realizationRate}
                      strokeColor="#10b981"
                      size={36}
                    />
                  </div>
                </div>

                {/* Sub-strip: Students, Pipeline, Overdue Defaulters */}
                <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Users size={13} className="text-slate-400 shrink-0" />
                    <strong className="text-slate-800 font-mono">{analyticsData.institute.totalStudents}</strong> Total Students
                  </span>
                  <span className="font-mono text-slate-500">
                    Pending Fees: <strong className="text-slate-800">{formatCompactCurrency(analyticsData.institute.totalRemaining)}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-md font-mono font-bold text-[10px]">
                    <ShieldAlert size={12} className="text-amber-600 shrink-0" />
                    ₹{analyticsData.institute.overdueAmount.toLocaleString('en-IN')} Overdue ({analyticsData.institute.defaulterCount} Students)
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Scope Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                      <Building2 size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">
                          Branch Overview
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
                          {analyticsData.branch.contributionPct}% of Total Fees
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <div className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                        {analyticsData.branch.name} Branch
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3 Core Metric Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50/70 rounded-xl border border-slate-150">
                  {/* ARR */}
                  <div className="px-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                      ANNUAL RUN-RATE (ARR)
                    </span>
                    <div className="text-lg sm:text-xl font-black font-mono text-slate-900 leading-tight mt-1">
                      {formatCompactCurrency(analyticsData.branch.arr)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block truncate mt-0.5">
                      ₹{analyticsData.branch.arr.toLocaleString('en-IN')} total annualized
                    </span>
                  </div>

                  {/* MRR */}
                  <div className="px-2 sm:border-l border-slate-200/80">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600 block">
                      MONTHLY RECURRING (MRR)
                    </span>
                    <div className="text-lg sm:text-xl font-black font-mono text-blue-600 leading-tight mt-1">
                      {formatCompactCurrency(analyticsData.branch.mrr)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block truncate mt-0.5">
                      ₹{analyticsData.branch.mrr.toLocaleString('en-IN')}/mo run-rate
                    </span>
                  </div>

                  {/* Collection Rate */}
                  <div className="px-2 sm:border-l border-slate-200/80 flex items-center justify-between">
                    <div className="min-w-0">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                        Fee Collection Rate
                      </span>
                      <div className="text-lg sm:text-xl font-black font-mono text-cyan-600 leading-tight mt-1">
                        {analyticsData.branch.realizationRate}%
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                        Collected of branch fees
                      </span>
                    </div>
                    <CircularProgress
                      percentage={analyticsData.branch.realizationRate}
                      strokeColor="#0284c7"
                      size={36}
                    />
                  </div>
                </div>

                {/* Sub-strip: Students, Balance, Overdue Defaulters */}
                <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Users size={13} className="text-slate-400 shrink-0" />
                    <strong className="text-slate-800 font-mono">{analyticsData.branch.studentsCount}</strong> Students
                  </span>
                  <span className="font-mono text-slate-500">
                    Pending Fees: <strong className="text-slate-800">{formatCompactCurrency(analyticsData.branch.totalRemaining)}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-md font-mono font-bold text-[10px]">
                    <ShieldAlert size={12} className="text-amber-600 shrink-0" />
                    ₹{analyticsData.branch.overdueAmount.toLocaleString('en-IN')} Overdue ({analyticsData.branch.defaulterCount} Students)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Cash Flow Summary (Bottom Telemetry Ribbon) ── */}
          <div className="border-t border-slate-200/80 bg-slate-50/70 p-3 sm:px-4 sm:py-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-200/50">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                <Wallet size={12} className="text-slate-400" />
                <span>Cash Flow Summary</span>
                <span className="text-slate-400 font-normal">({scope === 'institute' ? 'All Branches' : analyticsData.branch.name})</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Timeframe: <strong className="text-slate-700 capitalize">{preset === 'daily' ? 'Today' : preset === 'weekly' ? 'This Week' : 'This Month'}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {/* Stat 1: TOTAL REVENUE */}
              <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200/70 shadow-2xs flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                    TOTAL REVENUE
                  </span>
                  <div className="text-sm sm:text-base font-black font-mono text-slate-900 leading-tight mt-0.5 truncate">
                    ₹{totalIncome.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[9px] text-emerald-600 font-semibold block mt-0.5 truncate">
                    Verified Inflows
                  </span>
                </div>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <TrendingUp size={14} className="stroke-[2.5]" />
                </div>
              </div>

              {/* Stat 2: TOTAL EXPENSES */}
              <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200/70 shadow-2xs flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                    TOTAL EXPENSES
                  </span>
                  <div className="text-sm sm:text-base font-black font-mono text-slate-900 leading-tight mt-0.5 truncate">
                    ₹{totalDebitExpenses.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[9px] text-rose-600 font-semibold block mt-0.5 truncate">
                    Debits &amp; Vouchers
                  </span>
                </div>
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                  <TrendingDown size={14} className="stroke-[2.5]" />
                </div>
              </div>

              {/* Stat 3: OPERATING SURPLUS */}
              <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200/70 shadow-2xs flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                    OPERATING SURPLUS
                  </span>
                  <div className={`text-sm sm:text-base font-black font-mono leading-tight mt-0.5 truncate ${currentBalance >= 0 ? 'text-slate-900' : 'text-rose-600'
                    }`}>
                    {currentBalance < 0 ? `-₹${Math.abs(currentBalance).toLocaleString('en-IN')}` : `₹${currentBalance.toLocaleString('en-IN')}`}
                  </div>
                  <span className={`text-[9px] font-semibold block mt-0.5 truncate ${currentBalance >= 0 ? 'text-blue-600' : 'text-rose-600'
                    }`}>
                    {currentBalance >= 0 ? 'Net Operating Margin' : 'Operating Deficit'}
                  </span>
                </div>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${currentBalance >= 0 ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                  }`}>
                  <Wallet size={14} className="stroke-[2.5]" />
                </div>
              </div>

              {/* Stat 4: Period Expenses */}
              <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200/70 shadow-2xs flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                    PERIOD SPEND
                  </span>
                  <div className="text-sm sm:text-base font-black font-mono text-slate-900 leading-tight mt-0.5 truncate">
                    ₹{activePeriodSpend.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[9px] text-amber-700 font-semibold block mt-0.5 truncate">
                    {preset} Cycle Burn
                  </span>
                </div>
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                  <Clock size={14} className="stroke-[2.5]" />
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── Operational Analytics: 2 Balanced Cards (Trend Chart & Cash Flow Dynamics) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">

        {/* Card 1: Expenses Trend Chart (Col span 6) */}
        <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-xs font-display font-extrabold text-slate-800 uppercase tracking-wider">
                  {preset === 'daily'
                    ? 'Daily Outflows Run-Rate'
                    : preset === 'weekly'
                      ? 'Weekly Expenses Run Rate'
                      : 'Monthly Expenses Trend & Payroll'}
                </h3>
                <span className="text-[10px] text-slate-400">
                  Cycle expense variance &amp; operational vouchers
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg font-mono shrink-0 border border-slate-200/80">
                  Peak: <strong className="text-slate-900">₹{peakChartAmount.toLocaleString('en-IN')}</strong>
                </span>
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="w-full h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="expenseTrendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={46}
                    tick={{ fill: '#94a3b8', fontSize: 9 }}
                    tickFormatter={(v: number) => `₹${v >= 1000 ? `${v / 1000}k` : v}`}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#expenseTrendGradient)"
                    dot={{ r: 3.5, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 5.5, fill: '#1d4ed8', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Expenses Telemetry</span>
            <span className="font-semibold text-slate-700 font-mono">Total Recorded: ₹{totalDebitExpenses.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Card 2: Combined Cash Flow Channels & Distribution (Col span 6) */}
        <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-xs font-display font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard size={13} className="text-purple-600" />
                  Cash Flow Dynamics
                </h3>
                <span className="text-[10px] text-slate-400">
                  Payment channels collection vs expense heads
                </span>
              </div>

              {/* Segmented Switcher Pill: Inflows vs Outflows */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setCashFlowTab('inflows')}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1.5 ${cashFlowTab === 'inflows'
                      ? 'bg-white text-purple-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <Zap size={11} className={cashFlowTab === 'inflows' ? 'text-purple-600' : 'text-slate-400'} />
                  <span>Inflows</span>
                  <span className="text-[9px] bg-purple-50 text-purple-700 px-1 py-0.2 rounded font-mono font-semibold">
                    {inflowPieData.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCashFlowTab('outflows')}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1.5 ${cashFlowTab === 'outflows'
                      ? 'bg-white text-rose-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <CreditCard size={11} className={cashFlowTab === 'outflows' ? 'text-rose-600' : 'text-slate-400'} />
                  <span>Outflows</span>
                  <span className="text-[9px] bg-rose-50 text-rose-700 px-1 py-0.2 rounded font-mono font-semibold">
                    {outflowPieData.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Tab 1: Inflow Modes View */}
            {cashFlowTab === 'inflows' ? (
              <div className="flex flex-col sm:flex-row items-center gap-5 pt-1 pb-1">
                {/* Donut Chart */}
                <div className="w-28 h-28 relative shrink-0">
                  {inflowPieData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip content={<CustomPieTooltip />} />
                          <Pie
                            data={inflowPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={28}
                            outerRadius={48}
                            paddingAngle={3}
                          >
                            {inflowPieData.map((entry, index) => (
                              <Cell key={`inflow-cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                        <span className="text-xs font-black text-slate-800 leading-none">
                          {inflowPieData.length}
                        </span>
                        <span className="text-[8px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">
                          Modes
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full rounded-full border border-dashed border-slate-200 flex items-center justify-center text-[9px] text-slate-400">
                      No Data
                    </div>
                  )}
                </div>

                {/* Modes Breakdown List - Wide, breathable, no truncation */}
                <div className="flex-1 min-w-0 space-y-2 w-full">
                  {analyticsData?.paymentModes?.map((pm, idx) => {
                    const badge = getPaymentBadge(pm.mode);
                    const IconComponent = badge.icon;
                    const sliceColor = inflowPieData.find(p => p.name === pm.mode)?.color || '#8b5cf6';

                    return (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sliceColor }} />
                            <span className={`p-0.5 rounded ${badge.cls}`}>
                              <IconComponent size={9} />
                            </span>
                            <span className="text-slate-800 font-semibold truncate">{pm.mode}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({pm.count})</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold text-slate-900 font-mono text-xs">
                              {formatCompactCurrency(pm.amount)}
                            </span>
                            <span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-1.5 py-0.2 rounded font-mono">
                              {pm.percentage}%
                            </span>
                          </div>
                        </div>

                        {/* Progress track */}
                        <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                          <div
                            style={{ width: `${pm.percentage}%`, backgroundColor: sliceColor }}
                            className="h-full rounded-full transition-all duration-300"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Tab 2: Outflows View */
              <div className="flex flex-col sm:flex-row items-center gap-5 pt-1 pb-1">
                {/* Outflow Donut Chart */}
                <div className="w-28 h-28 relative shrink-0">
                  {outflowPieData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip content={<CustomPieTooltip />} />
                          <Pie
                            data={outflowPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={28}
                            outerRadius={48}
                            paddingAngle={3}
                          >
                            {outflowPieData.map((entry, index) => (
                              <Cell key={`outflow-cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                        <span className="text-xs font-black text-slate-800 leading-none">
                          {outflowPieData.length}
                        </span>
                        <span className="text-[8px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">
                          Heads
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full rounded-full border border-dashed border-slate-200 flex items-center justify-center text-[9px] text-slate-400">
                      Empty
                    </div>
                  )}
                </div>

                {/* Categories Breakdown List - Wide, breathable, no truncation */}
                <div className="flex-1 min-w-0 space-y-2 w-full">
                  {categoryBreakdown.length === 0 ? (
                    <div className="text-xs text-slate-400 py-6 text-center">
                      No expense records in this {preset} period
                    </div>
                  ) : (
                    categoryBreakdown.map((c, idx) => {
                      const meta = getCategoryTheme(c.name);
                      const maxVal = Math.max(...categoryBreakdown.map(x => x.amount)) || 1;
                      const pct = (c.amount / maxVal) * 100;

                      return (
                        <div key={idx} className="space-y-0.5">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meta.barColor }} />
                              <span className="text-slate-800 font-semibold truncate">{c.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-bold text-slate-900 font-mono text-xs">
                                ₹{c.amount.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-1.5 py-0.2 rounded font-mono">
                                {c.percentage}%
                              </span>
                            </div>
                          </div>

                          {/* Progress track */}
                          <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                            <div
                              style={{
                                width: `${pct}%`,
                                backgroundColor: meta.barColor
                              }}
                              className="h-full rounded-full transition-all duration-300"
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Combined Bottom Strip */}
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            {cashFlowTab === 'inflows' ? (
              <>
                <span>
                  Primary Gateway:{' '}
                  <strong className="text-slate-800">
                    {primaryInflowMode
                      ? `${primaryInflowMode.mode} (${primaryInflowMode.percentage}% Volume)`
                      : 'None recorded'}
                  </strong>
                </span>
                <span className="font-semibold text-emerald-600 font-mono">
                  +{formatCompactCurrency(totalIncome)} In
                </span>
              </>
            ) : (
              <>
                <span>
                  Cycle Recorded Burn:{' '}
                  <strong className="text-slate-800 font-mono">
                    ₹{totalDebitExpenses.toLocaleString('en-IN')}
                  </strong>
                </span>
                <span className="font-semibold text-rose-600 font-mono">
                  -{formatCompactCurrency(totalDebitExpenses)} Out
                </span>
              </>
            )}
          </div>
        </div>

      </div>

      {/* ── Compact Recent Ledger Voucher Logs ── */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">

        {/* Table Header */}
        <div className="px-3.5 py-2.5 border-b border-slate-150 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Recent Ledger Logs (Live MySQL)
            </h3>
          </div>

          <button
            onClick={() => navigate('/expense-ledger')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            <span>Open Full Ledger</span>
            <ArrowRight size={12} />
          </button>
        </div>

        {/* Compact Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-3.5 py-2">Record #</th>
                <th className="px-3.5 py-2">Date</th>
                <th className="px-3.5 py-2">Category</th>
                <th className="px-3.5 py-2">Description</th>
                <th className="px-3.5 py-2">Method</th>
                <th className="px-3.5 py-2 text-right">Debit</th>
                <th className="px-3.5 py-2 text-right">Credit</th>
                <th className="px-3.5 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3.5 py-6 text-center text-slate-400 text-xs">
                    No transactions recorded in database yet
                  </td>
                </tr>
              ) : (
                recentTransactions.map((v, idx) => {
                  const payMeta = getPaymentBadge(v.method);

                  return (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-3.5 py-2 font-mono font-bold text-[11px] text-blue-600">
                        {v.id}
                      </td>
                      <td className="px-3.5 py-2 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {v.date}
                      </td>
                      <td className="px-3.5 py-2 whitespace-nowrap">
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {v.category}
                        </span>
                      </td>
                      <td className="px-3.5 py-2 font-medium text-slate-700 truncate max-w-[200px]">
                        {v.description}
                      </td>
                      <td className="px-3.5 py-2 text-[11px] text-slate-500 whitespace-nowrap font-medium">
                        {payMeta.label}
                      </td>
                      <td className="px-3.5 py-2 text-right whitespace-nowrap font-mono font-bold text-rose-600 text-[11px]">
                        {v.direction === 'Debit' ? `₹${v.amount.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="px-3.5 py-2 text-right whitespace-nowrap font-mono font-bold text-emerald-600 text-[11px]">
                        {v.direction === 'Credit' ? `₹${v.amount.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="px-3.5 py-2 text-center whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${v.status === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* ── Transaction Detail Modal ── */}
      {selectedTransaction && (
        <Modal
          isOpen={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          title={`Transaction ${selectedTransaction.id}`}
          size="sm"
          footer={
            <div className="flex justify-between items-center w-full">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedTransaction(null)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedTransaction(null);
                  navigate('/expense-ledger');
                }}
              >
                Open in Full Ledger
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-600 uppercase text-[10px]">Amount ({selectedTransaction.direction})</span>
              <span className={`text-lg font-bold font-mono ${selectedTransaction.direction === 'Credit' ? 'text-emerald-600' : 'text-slate-900'
                }`}>
                {selectedTransaction.direction === 'Debit' ? '-' : '+'}₹{selectedTransaction.amount.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-400 block text-[10px]">Date</span>
                <span className="font-semibold text-slate-800">{selectedTransaction.date}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-400 block text-[10px]">Category</span>
                <span className="font-semibold text-slate-800">{selectedTransaction.category}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-400 block text-[10px]">Method</span>
                <span className="font-semibold text-slate-800">{selectedTransaction.method}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-400 block text-[10px]">Status</span>
                <span className="font-semibold text-slate-800">{selectedTransaction.status}</span>
              </div>
            </div>
            {selectedTransaction.payee && (
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-400 block text-[10px]">Payee / Vendor</span>
                <span className="font-semibold text-slate-800">{selectedTransaction.payee}</span>
              </div>
            )}
            <div className="p-2.5 bg-slate-50 rounded-lg">
              <span className="text-slate-400 block text-[10px]">Description</span>
              <span className="text-slate-700">{selectedTransaction.description}</span>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
