import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  staffSalaryApi,
  type StaffSalaryHistoryResponse,
  type SalaryPaymentRecord
} from '../../services/staffSalaryApi';
import {
  History,
  Calendar,
  DollarSign,
  CreditCard,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  User,
  AlertCircle,
  Loader2,
  ArrowUpRight
} from 'lucide-react';
import { formatDate } from '../../utils/dateFormatter';

interface StaffSalaryHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffId: number | null;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const fmt = (n: number) => '₹' + (Number(n) || 0).toLocaleString('en-IN');

export const StaffSalaryHistoryModal: React.FC<StaffSalaryHistoryModalProps> = ({
  isOpen,
  onClose,
  staffId
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [historyData, setHistoryData] = useState<StaffSalaryHistoryResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && staffId) {
      fetchHistory();
    } else {
      setHistoryData(null);
    }
  }, [isOpen, staffId]);

  const fetchHistory = async () => {
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
  };

  const staff = historyData?.staff;
  const summary = historyData?.summary;
  const history = historyData?.history || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Staff Salary Detail & Complete Payment History"
      size="full"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-slate-500 font-medium">
            {history.length} payment record{history.length !== 1 ? 's' : ''} on file
          </span>
          <Button variant="outline" onClick={onClose} className="px-5 font-semibold">
            Close Full View
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 size={36} className="animate-spin text-blue-600" />
          <p className="text-sm text-slate-500 font-medium">Loading salary history records...</p>
        </div>
      ) : errorMsg ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3">
          <AlertCircle size={20} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      ) : staff ? (
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Staff Header Profile Card */}
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
                    Effective From: {formatDate(staff.salaryEffectiveFrom)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Aggregated KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 flex items-center gap-4 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center shrink-0">
                <DollarSign size={24} />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                  Total Disbursed To Date
                </span>
                <span className="text-xl font-extrabold text-emerald-950 mt-0.5 block">{fmt(summary?.totalPaid || 0)}</span>
                <span className="text-[11px] text-emerald-700 font-medium">Cumulative salary payments</span>
              </div>
            </div>

            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 flex items-center gap-4 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-700 flex items-center justify-center shrink-0">
                <Calendar size={24} />
              </div>
              <div>
                <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
                  Total Months Processed
                </span>
                <span className="text-xl font-extrabold text-blue-950 mt-0.5 block">
                  {summary?.monthsPaid || 0} Month{(summary?.monthsPaid || 0) !== 1 ? 's' : ''}
                </span>
                <span className="text-[11px] text-blue-700 font-medium">Disbursed payroll cycles</span>
              </div>
            </div>

            <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-4 flex items-center gap-4 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-700 flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <span className="text-xs font-bold text-purple-800 uppercase tracking-wider block">
                  Last Disbursement Date
                </span>
                <span className="text-sm font-bold text-purple-950 mt-1 block">
                  {summary?.lastPaymentDate ? formatDate(summary.lastPaymentDate) : 'No payments yet'}
                </span>
                <span className="text-[11px] text-purple-700 font-medium">Latest settlement record</span>
              </div>
            </div>
          </div>

          {/* Historical Payments Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <History size={16} className="text-slate-500" />
                Complete Chronological Salary Ledger
              </h4>
              <span className="text-xs text-slate-500 font-semibold bg-white px-2.5 py-1 rounded-md border border-slate-200">
                {history.length} Record{history.length !== 1 ? 's' : ''}
              </span>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Clock size={40} className="mx-auto text-slate-300 mb-2.5" />
                <p className="text-base font-semibold text-slate-700">No salary payment records found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Salary disbursements recorded in the monthly payroll status view will automatically appear in this history.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-600">
                      <th className="py-3 px-4">Payroll Cycle</th>
                      <th className="py-3 px-4">Amount Disbursed</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Disbursement Date</th>
                      <th className="py-3 px-4">Payment Mode</th>
                      <th className="py-3 px-4">Transaction Reference</th>
                      <th className="py-3 px-4">Remarks / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {history.map((record) => {
                      const mName = MONTH_NAMES[record.salary_month - 1] || `Month ${record.salary_month}`;
                      const modeLabel = record.payment_mode ? record.payment_mode.replace(/_/g, ' ') : 'Bank Transfer';

                      return (
                        <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                            {mName} {record.salary_year}
                          </td>
                          <td className="py-3.5 px-4 font-extrabold text-emerald-700 text-sm">
                            {fmt(record.amount)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 size={12} className="text-emerald-600" />
                              PAID
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 font-medium">
                            {formatDate(record.paid_date)}
                          </td>
                          <td className="py-3.5 px-4 capitalize">
                            <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md text-xs font-semibold border border-slate-200 inline-block">
                              {modeLabel}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-700 font-medium">
                            {record.reference || <span className="text-slate-300 font-sans">—</span>}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                            {record.remarks || <span className="text-slate-300">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
};
