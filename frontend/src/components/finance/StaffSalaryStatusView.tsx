import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '../ui/Card';
import { Table } from '../ui/Table';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Pagination } from '../ui/Pagination';
import { useApp } from '../../context/AppContext';
import {
  staffSalaryApi,
  type StaffSalaryStatusItem,
  type SalaryStatusSummary,
  type SalaryPaymentRecord
} from '../../services/staffSalaryApi';
import { PaySalaryModal } from './PaySalaryModal';
import { EditSalaryPaymentModal } from './EditSalaryPaymentModal';
import { StaffSalaryHistoryView } from './StaffSalaryHistoryView';
import {
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Search,
  Filter,
  Users,
  CreditCard,
  Eye,
  Loader2,
  Building2,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Wallet,
  RotateCcw,
  Pencil,
  Trash2
} from 'lucide-react';
import { formatDate, formatDateForInput } from '../../utils/dateFormatter';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const fmt = (n: number) => '₹' + (Number(n) || 0).toLocaleString('en-IN');

interface StaffSalaryStatusViewProps {
  branchFilter?: string;
  branchOptions?: { value: string; label: string }[];
  onBranchChange?: (branchId: string) => void;
  onNavigateToMaster?: () => void;
  onDetailViewChange?: (isActive: boolean) => void;
}

export const StaffSalaryStatusView: React.FC<StaffSalaryStatusViewProps> = ({
  branchFilter = 'All',
  branchOptions = [],
  onBranchChange,
  onNavigateToMaster,
  onDetailViewChange
}) => {
  const { addToast } = useApp();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const limit = 15;

  const [loading, setLoading] = useState<boolean>(true);
  const [records, setRecords] = useState<StaffSalaryStatusItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [summary, setSummary] = useState<SalaryStatusSummary>({
    totalSalary: 0,
    paidAmount: 0,
    pendingAmount: 0,
    totalStaff: 0,
    paidCount: 0,
    pendingCount: 0
  });

  // Action Modals
  const [payingStaff, setPayingStaff] = useState<StaffSalaryStatusItem | null>(null);
  const [historyStaffId, setHistoryStaffId] = useState<number | null>(null);
  const [editingPayment, setEditingPayment] = useState<{ record: SalaryPaymentRecord; staffName: string } | null>(null);
  const [deletingItem, setDeletingItem] = useState<StaffSalaryStatusItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    const isDetail = Boolean(historyStaffId);
    onDetailViewChange?.(isDetail);
    if (isDetail) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      const mainContainer = document.getElementById('main-scroll-container');
      if (mainContainer) {
        mainContainer.scrollTop = 0;
      }
    }
  }, [historyStaffId, onDetailViewChange]);

  const handleDeletePayment = async () => {
    if (!deletingItem || !deletingItem.payment_id) return;
    try {
      setIsDeleting(true);
      await staffSalaryApi.deleteSalaryPayment(deletingItem.payment_id);
      addToast(`Salary disbursement for ${deletingItem.full_name} (${monthName} ${selectedYear}) has been removed. Status reverted to PENDING.`, 'success');
      setDeletingItem(null);
      fetchStatus();
    } catch (err: any) {
      console.error('Error deleting salary payment:', err);
      addToast(err?.response?.data?.message || err.message || 'Failed to delete payment record.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await staffSalaryApi.getSalaryStatus({
        month: selectedMonth,
        year: selectedYear,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        employeeType: employeeTypeFilter !== 'All' ? employeeTypeFilter : undefined,
        search: searchTerm.trim() || undefined,
        branchId: branchFilter !== 'All' ? branchFilter : undefined,
        page,
        limit
      });

      if (res.success && Array.isArray(res.data)) {
        setRecords(res.data);
        setTotal(res.pagination?.total || res.data.length);
        if (res.summary) {
          setSummary(res.summary);
        }
      } else {
        setRecords([]);
        setTotal(0);
      }
    } catch (err: any) {
      console.error('Error fetching monthly salary status:', err);
      addToast(err?.response?.data?.message || err.message || 'Failed to load monthly salary status.', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, statusFilter, employeeTypeFilter, searchTerm, branchFilter, page, addToast]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const monthName = MONTH_NAMES[selectedMonth - 1] || `Month ${selectedMonth}`;

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
    setPage(1);
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
    setPage(1);
  };

  const settlementPercent = summary.totalSalary > 0 
    ? Math.round((summary.paidAmount / summary.totalSalary) * 100) 
    : 0;

  const pageSalarySum = useMemo(() => {
    return records.reduce((acc, r) => acc + Number(r.salary_amount || 0), 0);
  }, [records]);

  const hasActiveFilters = Boolean(
    searchTerm ||
    statusFilter !== 'All' ||
    employeeTypeFilter !== 'All'
  );

  const handleResetFilters = () => {
    setStatusFilter('All');
    setEmployeeTypeFilter('All');
    setSearchTerm('');
    setPage(1);
  };

  const getEmployeeTypeBadge = (type?: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('teach') || t.includes('faculty')) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
    }
    if (t.includes('admin')) {
      return 'bg-sky-50 text-sky-700 border-sky-200/80';
    }
    if (t.includes('counsel')) {
      return 'bg-purple-50 text-purple-700 border-purple-200/80';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200/80';
  };

  const renderPaymentModeBadge = (mode?: string) => {
    const m = (mode || 'bank_transfer').toLowerCase().trim();
    if (m === 'upi') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200/80 text-[10px] font-bold">
          UPI
        </span>
      );
    }
    if (m === 'cash') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-bold">
          Cash
        </span>
      );
    }
    if (m === 'cheque') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 text-[10px] font-bold">
          Cheque
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 text-[10px] font-bold">
        Bank
      </span>
    );
  };

  if (historyStaffId) {
    return (
      <StaffSalaryHistoryView
        key={historyStaffId}
        staffId={historyStaffId}
        onBack={() => setHistoryStaffId(null)}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── 4 KPI Financial Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Salary */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-slate-300 hover:shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate mr-1">
              Total Salary ({monthName})
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200/80 shadow-2xs group-hover:scale-105 transition-transform">
              <Wallet size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 mt-2 tracking-tight">
            {fmt(summary.totalSalary)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100/90 font-medium">
            <span>Gross commitment</span>
            <span className="font-semibold text-slate-600 font-mono">{summary.totalStaff} staff members</span>
          </div>
        </div>

        {/* Paid Amount */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-emerald-300 hover:shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Paid Amount
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/80 shadow-2xs group-hover:scale-105 transition-transform">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 mt-2 tracking-tight">
            {fmt(summary.paidAmount)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100/90 font-medium">
            <span>Disbursed for {monthName}</span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {summary.paidCount} staff disbursed
            </span>
          </div>
        </div>

        {/* Pending Amount */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-amber-300 hover:shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Pending Amount
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100/80 shadow-2xs group-hover:scale-105 transition-transform">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-amber-700 mt-2 tracking-tight">
            {fmt(summary.pendingAmount)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100/90 font-medium">
            <span>Awaiting payout</span>
            <span className="font-semibold text-amber-600 font-mono">{summary.pendingCount} staff pending</span>
          </div>
        </div>

        {/* Disbursement Rate */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-indigo-300 hover:shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
              Disbursement Rate
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/80 shadow-2xs group-hover:scale-105 transition-transform">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-indigo-900 mt-2 tracking-tight">
            {settlementPercent}%
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100/90 font-medium">
            <span>Settlement progress</span>
            <span className="font-semibold text-indigo-600 font-mono">{summary.paidCount} of {summary.totalStaff} completed</span>
          </div>
        </div>
      </div>

      {/* ── Filters & Month Navigator Bar ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Filter size={14} className="text-slate-400" />
              <span>Salary Cycle & Filter Controls</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Month Switcher */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-all shadow-2xs cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-xs font-bold font-mono px-2 text-slate-700">
                {monthName} {selectedYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-all shadow-2xs cursor-pointer"
                title="Next Month"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw size={12} /> Reset Filters
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 items-end">
          {/* Search Input */}
          <div className="lg:col-span-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Search Staff
            </label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Search staff name or employee ID..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Month Selector */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(Number(e.target.value));
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Disbursement Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="PAID">PAID Only</option>
              <option value="PENDING">PENDING Only</option>
            </select>
          </div>

          {/* Employee Type */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Employee Type
            </label>
            <select
              value={employeeTypeFilter}
              onChange={(e) => {
                setEmployeeTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="All">All Types</option>
              <option value="Teaching">Teaching / Faculty</option>
              <option value="Non-Teaching">Non-Teaching</option>
              <option value="Administration">Administration</option>
              <option value="Counsellor">Counsellor</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Table Card Container ── */}
      <Card className="p-0 overflow-hidden border border-slate-200/90 rounded-2xl shadow-xs bg-white">
        <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/80 shadow-2xs">
              <Users size={17} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-snug">Monthly Salary Disbursement Registry</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing {records.length} of {total} staff members for {monthName} {selectedYear}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {records.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200/80 text-xs font-semibold text-slate-600 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400">Page Total:</span>
                <span className="font-mono font-bold text-slate-900">{fmt(pageSalarySum)}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200/80 text-xs font-semibold text-slate-600 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Settled:</span>
              <span className="font-mono font-bold text-emerald-600">{fmt(summary.paidAmount)}</span>
              <span className="text-slate-300">/</span>
              <span className="font-mono text-slate-500">{fmt(summary.totalSalary)}</span>
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 size={26} className="animate-spin text-blue-600" />
            <p className="text-xs text-slate-500 font-medium">Evaluating monthly salary status...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Users size={24} />
            </div>
            <h3 className="text-base font-semibold text-slate-700">No salary records found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              No staff records matching your filter criteria were found for {monthName} {selectedYear}.
            </p>
            {hasActiveFilters && (
              <Button size="sm" variant="secondary" onClick={handleResetFilters} className="mt-4 font-semibold">
                Reset Filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <Table
              dense
              borderless
              headers={[
                { label: 'Staff Member', align: 'left' },
                { label: 'Employee ID', align: 'left' },
                { label: 'Employee Type', align: 'left' },
                { label: 'Monthly Salary', align: 'left' },
                { label: 'Status', align: 'center' },
                { label: 'Payment Details', align: 'left' },
                { label: 'Actions', align: 'right' }
              ]}
            >
              {records.map((item) => {
                const isPaid = item.payment_status === 'PAID';
                const initials = (item.full_name || 'ST')
                  .trim()
                  .split(/\s+/)
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                return (
                  <tr key={item.staff_id} className="hover:bg-slate-50/70 transition-colors group">
                    {/* Staff Name */}
                    <td className="px-3.5 py-3 text-left whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200/70 shrink-0">
                          {initials}
                        </div>
                        <span className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">
                          {item.full_name}
                        </span>
                      </div>
                    </td>

                    {/* Employee ID */}
                    <td className="px-3.5 py-3 text-left whitespace-nowrap font-mono text-xs text-slate-700 font-medium">
                      <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/70 text-slate-700 font-mono text-xs">
                        {item.employee_id || `ID: ${item.staff_id}`}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="px-3.5 py-3 text-left whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getEmployeeTypeBadge(item.employee_type)}`}>
                        {item.employee_type || 'Staff'}
                      </span>
                    </td>

                    {/* Monthly Salary */}
                    <td className="px-3.5 py-3 text-left font-black font-mono text-slate-900 text-sm whitespace-nowrap tabular-nums">
                      {fmt(item.salary_amount)}
                    </td>

                    {/* Status Badge */}
                    <td className="px-3.5 py-3 text-center whitespace-nowrap">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                          <CheckCircle2 size={13} className="text-emerald-600" />
                          PAID
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs">
                          <Clock size={13} className="text-amber-600" />
                          PENDING
                        </span>
                      )}
                    </td>

                    {/* Payment Details */}
                    <td className="px-3.5 py-3 text-left text-xs whitespace-nowrap">
                      {isPaid ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {renderPaymentModeBadge(item.payment_mode)}
                          <span className="text-slate-700 font-medium">
                            Paid on {formatDate(item.paid_date!)}
                          </span>
                          {item.reference && (
                            <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
                              #{item.reference}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Awaiting payment record</span>
                      )}
                    </td>

                    {/* Action Column */}
                    <td className="px-3.5 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setHistoryStaffId(item.staff_id)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200/80 hover:border-slate-300 transition-all shadow-2xs cursor-pointer"
                          title="View Historical Salary Payment Records"
                        >
                          <Eye size={14} />
                        </button>

                        {isPaid ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                if (item.payment_id) {
                                  setEditingPayment({
                                    record: {
                                      id: item.payment_id,
                                      salary_month: selectedMonth,
                                      salary_year: selectedYear,
                                      amount: Number(item.paid_amount || item.salary_amount || 0),
                                      paid_date: item.paid_date ? formatDateForInput(item.paid_date) : formatDateForInput(new Date()),
                                      payment_mode: item.payment_mode || 'bank_transfer',
                                      reference: item.reference || null,
                                      remarks: item.remarks || null,
                                      created_at: item.payment_recorded_at || '',
                                      status: 'PAID'
                                    },
                                    staffName: item.full_name
                                  });
                                }
                              }}
                              className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-blue-200/80 hover:border-blue-300 transition-all shadow-2xs cursor-pointer"
                              title="Edit Payment Record"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingItem(item)}
                              className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200/80 hover:border-rose-300 transition-all shadow-2xs cursor-pointer"
                              title="Void / Delete Payment (Revert to PENDING)"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setPayingStaff(item)}
                            className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs rounded-lg cursor-pointer"
                            title="Disburse / Record Salary Payment"
                          >
                            <DollarSign size={13} />
                            <span>Pay Salary</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </Table>

            {/* Total Summary Footer Bar */}
            <div className="bg-slate-50/80 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold border-t border-slate-200/80">
              <span className="text-slate-500">
                Showing page <strong className="text-slate-700">{page}</strong> of <strong className="text-slate-700">{Math.max(1, Math.ceil(total / limit))}</strong> ({total} total staff)
              </span>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                  <span className="text-slate-600">
                    Disbursed: <strong className="text-emerald-700 font-mono text-sm">{fmt(summary.paidAmount)}</strong> ({settlementPercent}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-600">
                    Pending: <strong className="text-amber-700 font-mono text-sm">{fmt(summary.pendingAmount)}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Pagination Footer */}
            <div className="p-4 bg-white border-t border-slate-100">
              <Pagination
                currentPage={page}
                totalPages={Math.max(1, Math.ceil(total / limit))}
                totalItems={total}
                pageSize={limit}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </Card>

      {/* Pay Salary Modal */}
      {payingStaff && (
        <PaySalaryModal
          isOpen={Boolean(payingStaff)}
          onClose={() => setPayingStaff(null)}
          staff={payingStaff}
          month={selectedMonth}
          year={selectedYear}
          onPaymentSuccess={() => {
            fetchStatus();
          }}
        />
      )}

      {/* Edit Salary Payment Modal */}
      {editingPayment && (
        <EditSalaryPaymentModal
          isOpen={Boolean(editingPayment)}
          onClose={() => setEditingPayment(null)}
          payment={editingPayment.record}
          staffName={editingPayment.staffName}
          onSuccess={fetchStatus}
          addToast={addToast}
        />
      )}

      {/* Void / Delete Payment Confirmation Modal */}
      {deletingItem && (
        <Modal
          isOpen={Boolean(deletingItem)}
          onClose={() => setDeletingItem(null)}
          title="Void / Delete Salary Payment"
          size="md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => setDeletingItem(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDeletePayment}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 font-bold"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Voiding...
                  </>
                ) : (
                  'Yes, Void Payment'
                )}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs">
              <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-sm">Void payment for {deletingItem.full_name}?</span>
                <p className="mt-1">
                  This will remove the payment record of <strong>{fmt(Number(deletingItem.paid_amount || deletingItem.salary_amount || 0))}</strong> for{' '}
                  <strong>{monthName} {selectedYear}</strong>.
                  The monthly status for {deletingItem.full_name} will automatically revert back to <strong>PENDING</strong>.
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

