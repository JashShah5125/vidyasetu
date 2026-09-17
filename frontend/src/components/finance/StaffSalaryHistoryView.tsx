import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Table } from '../ui/Table';
import { Modal } from '../ui/Modal';
import {
  staffSalaryApi,
  type StaffSalaryHistoryResponse,
  type SalaryPaymentRecord
} from '../../services/staffSalaryApi';
import { EditSalaryPaymentModal } from './EditSalaryPaymentModal';
import { useApp } from '../../context/AppContext';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  History,
  Building2,
  Briefcase,
  Users,
  Pencil,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { formatDate } from '../../utils/dateFormatter';

interface StaffSalaryHistoryViewProps {
  staffId: number;
  onBack: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const fmt = (n: number) => '₹' + (Number(n) || 0).toLocaleString('en-IN');

export const StaffSalaryHistoryView: React.FC<StaffSalaryHistoryViewProps> = ({
  staffId,
  onBack
}) => {
  const { addToast } = useApp();
  const [loading, setLoading] = useState<boolean>(true);
  const [historyData, setHistoryData] = useState<StaffSalaryHistoryResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // CRUD states
  const [editingPayment, setEditingPayment] = useState<SalaryPaymentRecord | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<SalaryPaymentRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const mainContainer = document.getElementById('main-scroll-container');
    if (mainContainer) {
      mainContainer.scrollTop = 0;
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!staffId) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await staffSalaryApi.getStaffSalaryHistory(staffId);
      if (res.success && res.data) {
        setHistoryData(res.data);
      } else {
        setErrorMsg(res.message || 'Could not load salary history.');
      }
    } catch (err: any) {
      console.error('Error fetching staff salary history:', err);
      setErrorMsg(err?.response?.data?.message || err.message || 'Failed to load salary history.');
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDeletePayment = async () => {
    if (!deletingPayment) return;
    try {
      setIsDeleting(true);
      await staffSalaryApi.deleteSalaryPayment(deletingPayment.id);
      const mName = MONTH_NAMES[deletingPayment.salary_month - 1] || `Month ${deletingPayment.salary_month}`;
      addToast({
        title: 'Payment Voided',
        message: `Salary disbursement for ${mName} ${deletingPayment.salary_year} has been removed. Month status reverted to PENDING.`,
        type: 'success'
      });
      setDeletingPayment(null);
      fetchHistory();
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

  const staff = historyData?.staff;
  const summary = historyData?.summary;
  const history = historyData?.history || [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-4 bg-white rounded-2xl border border-slate-200">
        <Loader2 size={36} className="animate-spin text-blue-600" />
        <p className="text-sm text-slate-500 font-medium">Loading salary history records...</p>
      </div>
    );
  }

  if (errorMsg || !staff) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Salary History</h2>
        </div>

        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-center gap-3">
          <AlertCircle size={22} className="shrink-0" />
          <span>{errorMsg || 'Failed to load staff information.'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ── Top Navigation Bar ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
            title="Back to Salary List"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Salary History: {staff.name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Employee ID: <span className="font-mono font-semibold text-slate-700">{staff.employeeId || `ID: ${staff.id}`}</span> • Branch: <span className="font-semibold text-slate-700">{staff.branchName || 'Main Campus'}</span>
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="flex items-center gap-1.5 font-semibold text-slate-700"
        >
          <ArrowLeft size={14} /> Back to List
        </Button>
      </div>

      {/* ── Staff Profile Banner ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center font-bold text-2xl shadow-inner shrink-0">
              {staff.firstName?.[0] || 'S'}
              {staff.lastName?.[0] || ''}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-xl font-bold text-white tracking-tight">{staff.name}</h3>
                <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {staff.employeeType}
                </span>
                <span className="font-mono text-xs text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-md border border-white/10">
                  {staff.employeeId || `ID: ${staff.id}`}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mt-2">
                {staff.designation && (
                  <span className="font-medium text-slate-200">Designation: <strong>{staff.designation}</strong></span>
                )}
                {staff.department && (
                  <>
                    <span>•</span>
                    <span>Department: <strong>{staff.department}</strong></span>
                  </>
                )}
                {staff.branchName && (
                  <>
                    <span>•</span>
                    <span>Branch: <strong>{staff.branchName}</strong></span>
                  </>
                )}
                {staff.joiningDate && (
                  <>
                    <span>•</span>
                    <span>Joined: {formatDate(staff.joiningDate)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Current Salary Badge */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-3.5 md:text-right shrink-0">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
              Current Base Monthly Salary
            </span>
            <span className="text-2xl font-black text-emerald-400 tracking-tight block mt-0.5">
              {fmt(staff.currentSalary)} <span className="text-xs font-normal text-emerald-300">/ mo</span>
            </span>
            {staff.salaryEffectiveFrom && (
              <span className="text-[11px] text-slate-300 block mt-1 font-medium">
                Effective: {formatDate(staff.salaryEffectiveFrom)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Aggregated Compact KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-l-4 border-l-emerald-500 shadow-xs hover:shadow-sm transition-shadow">
          <div className="p-3 sm:p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Total Disbursed To Date
              </span>
              <div className="w-6.5 h-6.5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign size={14} />
              </div>
            </div>
            <div className="text-xl font-bold text-emerald-700 mt-0.5 tabular-nums tracking-tight">
              {fmt(summary?.totalPaid || 0)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
              Cumulative salary payments
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-blue-600 shadow-xs hover:shadow-sm transition-shadow">
          <div className="p-3 sm:p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                Total Months Processed
              </span>
              <div className="w-6.5 h-6.5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar size={14} />
              </div>
            </div>
            <div className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums tracking-tight">
              {summary?.monthsPaid || 0} Month{(summary?.monthsPaid || 0) !== 1 ? 's' : ''}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
              Disbursed payroll cycles
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-xs hover:shadow-sm transition-shadow">
          <div className="p-3 sm:p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
                Last Disbursement Date
              </span>
              <div className="w-6.5 h-6.5 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center">
                <CheckCircle2 size={14} />
              </div>
            </div>
            <div className="text-xl font-bold text-purple-900 mt-0.5 tabular-nums tracking-tight truncate">
              {summary?.lastPaymentDate ? formatDate(summary.lastPaymentDate) : 'No payments yet'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
              Latest settlement record
            </div>
          </div>
        </Card>
      </div>

      {/* ── Historical Payments Table Template ── */}
      <Card className="p-0 overflow-hidden border border-slate-200 shadow-sm">
        {history.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Clock size={40} className="mx-auto text-slate-300 mb-2.5" />
            <h3 className="text-base font-semibold text-slate-700">No salary payment records found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Salary disbursements recorded in the monthly payroll status view will automatically appear in this history table.
            </p>
          </div>
        ) : (
          <Table
            dense
            borderless
            headers={[
              { label: 'Payroll Cycle', align: 'left' },
              { label: 'Amount Disbursed', align: 'left' },
              { label: 'Status', align: 'center' },
              { label: 'Disbursement Date', align: 'left' },
              { label: 'Payment Mode', align: 'left' },
              { label: 'Transaction Reference', align: 'left' },
              { label: 'Remarks / Notes', align: 'left' },
              { label: 'Actions', align: 'right' }
            ]}
          >
            {history.map((record) => {
              const mName = MONTH_NAMES[record.salary_month - 1] || `Month ${record.salary_month}`;
              const modeLabel = record.payment_mode ? record.payment_mode.replace(/_/g, ' ') : 'Bank Transfer';

              return (
                <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-3.5 py-3 text-left whitespace-nowrap font-bold text-slate-900 text-sm">
                    {mName} {record.salary_year}
                  </td>
                  <td className="px-3.5 py-3 text-left whitespace-nowrap font-extrabold text-emerald-700 text-sm">
                    {fmt(record.amount)}
                  </td>
                  <td className="px-3.5 py-3 text-center whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 size={12} className="text-emerald-600" />
                      PAID
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-left text-slate-700 font-medium text-xs whitespace-nowrap">
                    {formatDate(record.paid_date)}
                  </td>
                  <td className="px-3.5 py-3 text-left whitespace-nowrap capitalize">
                    <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md text-xs font-semibold border border-slate-200 inline-block">
                      {modeLabel}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-left font-mono text-slate-700 font-medium text-xs whitespace-nowrap">
                    {record.reference || <span className="text-slate-300 font-sans">—</span>}
                  </td>
                  <td className="px-3.5 py-3 text-left text-slate-600 text-xs max-w-xs truncate">
                    {record.remarks || <span className="text-slate-300">—</span>}
                  </td>

                  {/* Actions Column */}
                  <td className="px-3.5 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingPayment(record)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 hover:border-blue-200 transition-colors"
                        title="Edit Payment Record"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingPayment(record)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 hover:border-rose-200 transition-colors"
                        title="Delete Payment Record"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      {/* Edit Payment Modal */}
      {editingPayment && (
        <EditSalaryPaymentModal
          isOpen={Boolean(editingPayment)}
          onClose={() => setEditingPayment(null)}
          payment={editingPayment}
          staffName={staff.name}
          onSuccess={fetchHistory}
          addToast={addToast}
        />
      )}

      {/* Delete / Void Payment Confirmation Modal */}
      {deletingPayment && (
        <Modal
          isOpen={Boolean(deletingPayment)}
          onClose={() => setDeletingPayment(null)}
          title="Void / Delete Salary Payment"
          size="md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => setDeletingPayment(null)}
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
                    Deleting...
                  </>
                ) : (
                  'Yes, Delete Payment'
                )}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-sm">Are you sure you want to void this payment?</span>
                <p className="mt-1">
                  This will remove the payment record of <strong>{fmt(deletingPayment.amount)}</strong> for{' '}
                  <strong>{MONTH_NAMES[deletingPayment.salary_month - 1]} {deletingPayment.salary_year}</strong>.
                  The monthly status for {staff.name} will automatically revert back to <strong>PENDING</strong>.
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
