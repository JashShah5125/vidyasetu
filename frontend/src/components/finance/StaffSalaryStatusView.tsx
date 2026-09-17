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
      addToast({
        title: 'Payment Voided',
        message: `Salary disbursement for ${deletingItem.full_name} (${monthName} ${selectedYear}) has been removed. Status reverted to PENDING.`,
        type: 'success'
      });
      setDeletingItem(null);
      fetchStatus();
    } catch (err: any) {
      console.error('Error deleting salary payment:', err);
      addToast({
        title: 'Error',
        message: err?.response?.data?.message || err.message || 'Failed to delete payment record.',
        type: 'error'
      });
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

  const settlementPercent = summary.totalSalary > 0 
    ? Math.round((summary.paidAmount / summary.totalSalary) * 100) 
    : 0;

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
    <div className="space-y-6">
      {/* ── Standard 4-Column Compact KPI Financial Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Salary */}
        <Card className="border-l-4 border-l-slate-700 shadow-xs hover:shadow-sm transition-shadow">
          <div className="p-3 sm:p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate mr-1">
                Total Salary ({monthName})
              </span>
              <div className="w-6.5 h-6.5 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <DollarSign size={14} />
              </div>
            </div>
            <div className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums tracking-tight">
              {fmt(summary.totalSalary)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">
              {summary.totalStaff} Total Staff Members
            </div>
          </div>
        </Card>

        {/* Paid Amount */}
        <Card className="border-l-4 border-l-emerald-500 shadow-xs hover:shadow-sm transition-shadow">
          <div className="p-3 sm:p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Paid Amount
              </span>
              <div className="w-6.5 h-6.5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={14} />
              </div>
            </div>
            <div className="text-xl font-bold text-emerald-700 mt-0.5 tabular-nums tracking-tight">
              {fmt(summary.paidAmount)}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold mt-0.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0"></span>
              <span>{summary.paidCount} Staff Disbursed</span>
            </div>
          </div>
        </Card>

        {/* Pending Amount */}
        <Card className="border-l-4 border-l-amber-500 shadow-xs hover:shadow-sm transition-shadow">
          <div className="p-3 sm:p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                Pending Amount
              </span>
              <div className="w-6.5 h-6.5 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock size={14} />
              </div>
            </div>
            <div className="text-xl font-bold text-amber-700 mt-0.5 tabular-nums tracking-tight">
              {fmt(summary.pendingAmount)}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-amber-700 font-semibold mt-0.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shrink-0"></span>
              <span>{summary.pendingCount} Staff Pending</span>
            </div>
          </div>
        </Card>

        {/* Disbursement Rate */}
        <Card className="border-l-4 border-l-indigo-500 shadow-xs hover:shadow-sm transition-shadow">
          <div className="p-3 sm:p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                Disbursement Rate
              </span>
              <div className="w-6.5 h-6.5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <TrendingUp size={14} />
              </div>
            </div>
            <div className="text-xl font-bold text-indigo-900 mt-0.5 tabular-nums tracking-tight">
              {settlementPercent}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">
              {summary.paidCount} of {summary.totalStaff} completed
            </div>
          </div>
        </Card>
      </div>

      {/* ── Filters Toolbar Bar ── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(Number(e.target.value));
                setPage(1);
              }}
              className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                setPage(1);
              }}
              className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="PAID">PAID Only</option>
              <option value="PENDING">PENDING Only</option>
            </select>
          </div>

          {/* Employee Type */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type:</span>
            <select
              value={employeeTypeFilter}
              onChange={(e) => {
                setEmployeeTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="All">All Types</option>
              <option value="Teaching">Teaching / Faculty</option>
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
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
          className="text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1.5 self-end md:self-auto"
        >
          <RotateCcw size={13} />
          Reset
        </Button>
      </div>

      {/* ── Standard Table Template Card Container ── */}
      <Card className="p-0 overflow-hidden border border-slate-200 shadow-sm">

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

              return (
                <tr key={item.staff_id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Staff Name */}
                  <td className="px-3.5 py-3 text-left whitespace-nowrap">
                    <span className="font-semibold text-slate-900 text-sm">
                      {item.full_name}
                    </span>
                  </td>

                  {/* Employee ID */}
                  <td className="px-3.5 py-3 text-left whitespace-nowrap font-mono text-xs text-slate-600 font-medium">
                    {item.employee_id || `ID: ${item.staff_id}`}
                  </td>

                  {/* Type */}
                  <td className="px-3.5 py-3 text-left whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {item.employee_type || 'Staff'}
                    </span>
                  </td>

                  {/* Monthly Salary */}
                  <td className="px-3.5 py-3 text-left font-bold text-slate-900 text-sm whitespace-nowrap">
                    {fmt(item.salary_amount)}
                  </td>

                  {/* Status Badge */}
                  <td className="px-3.5 py-3 text-center whitespace-nowrap">
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        PAID
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock size={13} className="text-amber-600" />
                        PENDING
                      </span>
                    )}
                  </td>

                  {/* Payment Details */}
                  <td className="px-3.5 py-3 text-left text-xs whitespace-nowrap">
                    {isPaid ? (
                      <span className="text-slate-800 font-medium">
                        Paid on {formatDate(item.paid_date!)} • <span className="capitalize text-slate-600">{item.payment_mode?.replace(/_/g, ' ') || 'Bank Transfer'}</span>
                        {item.reference && <span className="font-mono text-slate-500 ml-1">({item.reference})</span>}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Awaiting payment record</span>
                    )}
                  </td>

                  {/* Action Column */}
                  <td className="px-3.5 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setHistoryStaffId(item.staff_id)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                        title="View Historical Salary Payment Records"
                      >
                        <Eye size={15} />
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
                                    paid_date: item.paid_date || new Date().toISOString().split('T')[0],
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
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 hover:border-blue-200 transition-colors"
                            title="Edit Payment Record"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingItem(item)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 hover:border-rose-200 transition-colors"
                            title="Void / Delete Payment (Revert to PENDING)"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setPayingStaff(item)}
                          className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
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
        )}

        {/* Pagination Footer */}
        {total > limit && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/50">
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(total / limit)}
              onPageChange={setPage}
            />
          </div>
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
            <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
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
