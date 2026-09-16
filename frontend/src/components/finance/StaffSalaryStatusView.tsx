import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Pagination } from '../ui/Pagination';
import { useApp } from '../../context/AppContext';
import {
  staffSalaryApi,
  type StaffSalaryStatusItem,
  type SalaryStatusSummary
} from '../../services/staffSalaryApi';
import { PaySalaryModal } from './PaySalaryModal';
import { StaffSalaryHistoryModal } from './StaffSalaryHistoryModal';
import {
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Users,
  CreditCard,
  Eye,
  Loader2,
  Building2,
  Briefcase,
  Layers,
  ChevronLeft,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { formatDate } from '../../utils/dateFormatter';

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
}

export const StaffSalaryStatusView: React.FC<StaffSalaryStatusViewProps> = ({
  branchFilter = 'All',
  branchOptions = [],
  onBranchChange,
  onNavigateToMaster
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
      addToast({
        title: 'Error',
        message: err?.response?.data?.message || err.message || 'Failed to load monthly salary status.',
        type: 'error'
      });
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

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Calendar size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Salary Status Operations</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Monthly branch salary tracking, payment processing, and real-time paid vs. pending status
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* Month Stepper Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800">
              {monthName} {selectedYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {onNavigateToMaster && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToMaster}
              className="text-slate-700 hover:text-slate-900 font-semibold"
            >
              <Users size={14} className="mr-1.5" />
              Salary Master
            </Button>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Salary */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Total Salary ({monthName})
            </span>
            <span className="text-2xl font-black text-slate-900 tracking-tight mt-0.5 block">
              {fmt(summary.totalSalary)}
            </span>
            <span className="text-[11px] text-slate-400 font-medium mt-1 block">
              {summary.totalStaff} Total Staff Members
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <DollarSign size={24} />
          </div>
        </div>

        {/* Total Paid */}
        <div className="bg-white border border-emerald-200/80 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">
              Paid Amount
            </span>
            <span className="text-2xl font-black text-emerald-700 tracking-tight mt-0.5 block">
              {fmt(summary.paidAmount)}
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-800 font-semibold">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{summary.paidCount} Staff Paid</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* Total Pending */}
        <div className="bg-white border border-amber-200/80 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider block">
              Pending Amount
            </span>
            <span className="text-2xl font-black text-amber-700 tracking-tight mt-0.5 block">
              {fmt(summary.pendingAmount)}
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-amber-800 font-semibold">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
              <span>{summary.pendingCount} Staff Pending</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock size={24} />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(Number(e.target.value));
                setPage(1);
              }}
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                setPage(1);
              }}
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="PAID">PAID Only</option>
              <option value="PENDING">PENDING Only</option>
            </select>
          </div>

          {/* Employee Type */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Type:</span>
            <select
              value={employeeTypeFilter}
              onChange={(e) => {
                setEmployeeTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="All">All Types</option>
              <option value="Teaching">Teaching / Teacher</option>
              <option value="Non-Teaching">Non-Teaching</option>
              <option value="Administration">Administration</option>
              <option value="Counsellor">Counsellor</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search staff name or ID..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setStatusFilter('All');
            setEmployeeTypeFilter('All');
            setSearchTerm('');
            setPage(1);
          }}
          className="text-slate-600 hover:text-slate-900 self-end md:self-auto"
        >
          Reset
        </Button>
      </div>

      {/* Salary Status Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 size={32} className="animate-spin text-blue-600" />
            <p className="text-sm text-slate-500 font-medium">Evaluating monthly salary status...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Users size={40} className="mx-auto text-slate-300 mb-2.5" />
            <h3 className="text-base font-semibold text-slate-700">No salary records found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              No staff records matching your filter criteria were found for {monthName} {selectedYear}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Employee Type</th>
                  <th className="py-3 px-4">Monthly Salary</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Payment Details</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {records.map((item) => {
                  const isPaid = item.payment_status === 'PAID';

                  return (
                    <tr key={item.staff_id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Staff Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${
                              isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {item.first_name?.[0] || ''}
                            {item.last_name?.[0] || ''}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 leading-tight">{item.full_name}</div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">
                              {item.employee_id || `ID: ${item.staff_id}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {item.employee_type || 'Staff'}
                        </span>
                        {item.designation && (
                          <div className="text-[11px] text-slate-400 mt-0.5">{item.designation}</div>
                        )}
                      </td>

                      {/* Salary */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        {fmt(item.salary_amount)}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 size={13} />
                            PAID
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock size={13} />
                            PENDING
                          </span>
                        )}
                      </td>

                      {/* Payment Details */}
                      <td className="py-3.5 px-4 text-xs">
                        {isPaid ? (
                          <div>
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <span>Paid on: {formatDate(item.paid_date!)}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                              <span className="capitalize">{item.payment_mode?.replace(/_/g, ' ') || 'Bank Transfer'}</span>
                              {item.reference && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono text-slate-600">{item.reference}</span>
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Awaiting payment record</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {isPaid ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setHistoryStaffId(item.staff_id)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1 text-xs font-semibold flex items-center gap-1.5 border border-transparent hover:border-blue-200 ml-auto"
                          >
                            <Eye size={13} />
                            View History
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setPayingStaff(item)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1 text-xs font-bold shadow-xs flex items-center gap-1.5 ml-auto"
                          >
                            <DollarSign size={13} />
                            Pay Salary
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/50">
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(total / limit)}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

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

      {/* Staff Salary History Modal */}
      {historyStaffId && (
        <StaffSalaryHistoryModal
          isOpen={Boolean(historyStaffId)}
          onClose={() => setHistoryStaffId(null)}
          staffId={historyStaffId}
        />
      )}
    </div>
  );
};
