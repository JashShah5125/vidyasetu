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
      title="Staff Salary Detail & History"
      size="3xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-slate-500 font-medium">
            {history.length} payment record{history.length !== 1 ? 's' : ''} on file
          </span>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <Loader2 size={32} className="animate-spin text-blue-600" />
          <p className="text-sm text-slate-500 font-medium">Loading salary history records...</p>
        </div>
      ) : errorMsg ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3">
          <AlertCircle size={20} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      ) : staff ? (
        <div className="space-y-6">
          {/* Staff Header Profile Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-5 text-white shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-13 h-13 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center font-bold text-xl shadow-inner">
                  {staff.firstName?.[0] || 'S'}
                  {staff.lastName?.[0] || ''}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white tracking-tight">{staff.name}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      {staff.employeeType}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1">
                    <span className="font-mono text-slate-400">{staff.employeeId || `ID: ${staff.id}`}</span>
                    {staff.designation && (
                      <>
                        <span>•</span>
                        <span>{staff.designation}</span>
                      </>
                    )}
                    {staff.branchName && (
                      <>
                        <span>•</span>
                        <span>{staff.branchName}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Current Salary Badge */}
              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl px-4 py-2.5 sm:text-right shrink-0">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                  Current Monthly Salary
                </span>
                <span className="text-xl font-extrabold text-emerald-400 tracking-tight block mt-0.5">
                  {fmt(staff.currentSalary)}
                </span>
                {staff.salaryEffectiveFrom && (
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Effective: {formatDate(staff.salaryEffectiveFrom)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Aggregated KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-700 flex items-center justify-center shrink-0">
                <DollarSign size={20} />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                  Total Paid
                </span>
                <span className="text-lg font-bold text-emerald-950">{fmt(summary?.totalPaid || 0)}</span>
              </div>
            </div>

            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-700 flex items-center justify-center shrink-0">
                <Calendar size={20} />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider block">
                  Months Paid
                </span>
                <span className="text-lg font-bold text-blue-950">
                  {summary?.monthsPaid || 0} Month{(summary?.monthsPaid || 0) !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="bg-purple-50/70 border border-purple-200/80 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-700 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-purple-800 uppercase tracking-wider block">
                  Last Payment Date
                </span>
                <span className="text-sm font-bold text-purple-950 mt-0.5 block">
                  {summary?.lastPaymentDate ? formatDate(summary.lastPaymentDate) : 'No payments yet'}
                </span>
              </div>
            </div>
          </div>

          {/* Historical Payments Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <History size={14} className="text-slate-500" />
                Chronological Payment History
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">
                {history.length} Record{history.length !== 1 ? 's' : ''}
              </span>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-10 px-4">
                <Clock size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-600">No salary payment records found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Salary payments recorded in the monthly status view will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-2.5 px-3.5">Month & Year</th>
                      <th className="py-2.5 px-3.5">Amount Paid</th>
                      <th className="py-2.5 px-3.5">Status</th>
                      <th className="py-2.5 px-3.5">Paid Date</th>
                      <th className="py-2.5 px-3.5">Mode</th>
                      <th className="py-2.5 px-3.5">Reference / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {history.map((record) => {
                      const mName = MONTH_NAMES[record.salary_month - 1] || `Month ${record.salary_month}`;
                      const modeLabel = record.payment_mode ? record.payment_mode.replace(/_/g, ' ') : 'Bank Transfer';

                      return (
                        <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3.5 font-semibold text-slate-800">
                            {mName} {record.salary_year}
                          </td>
                          <td className="py-3 px-3.5 font-bold text-emerald-700">
                            {fmt(record.amount)}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 size={11} />
                              PAID
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-slate-600 font-medium">
                            {formatDate(record.paid_date)}
                          </td>
                          <td className="py-3 px-3.5 text-slate-700 capitalize">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                              {modeLabel}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-slate-500 max-w-[200px]">
                            {record.reference && (
                              <div className="font-mono text-[11px] text-slate-700 font-semibold truncate" title={record.reference}>
                                {record.reference}
                              </div>
                            )}
                            {record.remarks && (
                              <div className="text-[11px] text-slate-500 italic truncate" title={record.remarks}>
                                {record.remarks}
                              </div>
                            )}
                            {!record.reference && !record.remarks && <span className="text-slate-300">—</span>}
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
