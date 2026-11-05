import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import {
  ArrowLeft,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Bell,
  Clock,
  Layers,
  DollarSign,
  Loader2,
  Check,
  User,
  GraduationCap
} from 'lucide-react';
import {
  getStudentLedger,
  generateInstallmentSchedule,
  type StudentLedger,
  type GenerateInstallmentsPayload
} from '../../services/paymentApi';

interface InstallmentScheduleBuilderPageProps {
  studentId?: number;
  initialLedger?: StudentLedger | null;
  onBack?: () => void;
  onSuccess?: (msg: string) => void;
}

const fmt = (n: number) => '₹' + (Number(n) || 0).toLocaleString('en-IN');
const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const InstallmentScheduleBuilderPage: React.FC<InstallmentScheduleBuilderPageProps> = ({
  studentId: propStudentId,
  initialLedger,
  onBack: propOnBack,
  onSuccess: propOnSuccess
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ studentId?: string }>();
  const { addToast, currentUser } = useApp();

  const isBranchAdmin = currentUser?.role === 'branch-admin';

  const effectiveStudentId = propStudentId || Number(params.studentId) || (location.state as any)?.studentId;

  const [ledger, setLedger] = useState<StudentLedger | null>(initialLedger || null);
  const [loadingLedger, setLoadingLedger] = useState<boolean>(!initialLedger);

  // Form State
  const [scheduleType, setScheduleType] = useState<'monthly' | 'termly' | 'custom'>('monthly');
  const [installmentCount, setInstallmentCount] = useState<number>(6);
  const [downPayment, setDownPayment] = useState<number>(0);
  const [firstDueDate, setFirstDueDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(10);
    return d.toISOString().slice(0, 10);
  });
  const [dueDay, setDueDay] = useState<number>(10);
  const [sendReminder, setSendReminder] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load ledger if not provided via props
  const loadStudentLedger = useCallback(async (sid: number) => {
    try {
      setLoadingLedger(true);
      const data = await getStudentLedger(sid);
      setLedger(data);
      if (data.feeAssignment) {
        setDownPayment(data.feeAssignment.down_payment || 0);
      }
    } catch (err: any) {
      console.error('Failed to load student ledger:', err);
      addToast(err?.response?.data?.message || err.message || 'Failed to load student fee profile', 'error');
    } finally {
      setLoadingLedger(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (initialLedger) {
      setLedger(initialLedger);
      if (initialLedger.feeAssignment) {
        setDownPayment(initialLedger.feeAssignment.down_payment || 0);
      }
      setLoadingLedger(false);
    } else if (effectiveStudentId) {
      loadStudentLedger(effectiveStudentId);
    }
  }, [initialLedger, effectiveStudentId, loadStudentLedger]);

  // Adjust default count when scheduleType toggles
  useEffect(() => {
    if (scheduleType === 'termly') {
      setInstallmentCount(3);
    } else if (scheduleType === 'monthly') {
      setInstallmentCount(6);
    }
  }, [scheduleType]);

  const feeAssignment = ledger?.feeAssignment;
  const netFee = feeAssignment?.net_amount ?? 0;
  const currentPaid = feeAssignment?.paid_amount ?? 0;

  // Remaining balance to split
  const remainingBalance = useMemo(() => {
    return Math.max(0, netFee - currentPaid - downPayment);
  }, [netFee, currentPaid, downPayment]);

  // Live Projected Schedule Table
  const previewSchedule = useMemo(() => {
    if (installmentCount <= 0 || remainingBalance <= 0) return [];

    const count = installmentCount;
    const base = Math.floor(remainingBalance / count);
    const remainder = round2(remainingBalance - (base * count));
    const monthInterval = scheduleType === 'termly' ? 3 : 1;

    const baseDate = new Date(firstDueDate);
    if (isNaN(baseDate.getTime())) return [];

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return Array.from({ length: count }, (_, i) => {
      const d = new Date(baseDate);
      d.setMonth(d.getMonth() + (i * monthInterval));
      if (dueDay) d.setDate(Math.min(28, dueDay));

      const isLast = i === count - 1;
      const amount = base + (isLast ? remainder : 0);

      const label = scheduleType === 'termly'
        ? `Term ${i + 1} (${monthNames[d.getMonth()]} ${d.getFullYear()})`
        : `Installment ${i + 1} (${monthNames[d.getMonth()]} ${d.getFullYear()})`;

      return {
        number: i + 1,
        label,
        dueDate: d.toISOString().slice(0, 10),
        amount,
        formattedDueDate: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      };
    });
  }, [remainingBalance, installmentCount, scheduleType, firstDueDate, dueDay]);

  const handleBack = () => {
    if (propOnBack) {
      propOnBack();
    } else {
      const basePath = isBranchAdmin ? '/branch/fees' : '/admin/fees';
      navigate(basePath);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledger) return;

    if (remainingBalance <= 0 && currentPaid < netFee) {
      setError('Remaining balance to schedule must be greater than zero.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: GenerateInstallmentsPayload = {
        scheduleType,
        installmentCount,
        firstDueDate,
        dueDay,
        downPayment,
        sendReminder
      };

      const res = await generateInstallmentSchedule(ledger.id, payload);
      const msg = res.message || 'Installment schedule successfully built and saved.';

      if (propOnSuccess) {
        propOnSuccess(msg);
      } else {
        addToast(msg, 'success');
        handleBack();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to generate schedule.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingLedger) {
    return (
      <div className="py-24 text-center">
        <Loader2 size={32} className="animate-spin mx-auto text-blue-600 mb-3" />
        <p className="text-sm text-slate-500 font-medium">Loading student fee profile...</p>
      </div>
    );
  }

  if (!ledger) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <AlertCircle size={40} className="mx-auto text-amber-500" />
        <h3 className="text-lg font-bold text-slate-800">Student Profile Not Found</h3>
        <p className="text-sm text-slate-500">Could not resolve active fee ledger for the requested student.</p>
        <Button variant="secondary" onClick={handleBack}>
          <ArrowLeft size={14} className="mr-1.5" /> Back to Fee Collections
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-12">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors cursor-pointer mb-2"
          >
            <ArrowLeft size={14} /> Back to Student Ledger
          </button>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-display font-bold text-slate-900">
              Automated Installment Schedule Builder
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Full Page Console
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Structure and auto-split course fees into monthly or termly installments with automated SMS/WhatsApp reminders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" variant="secondary" onClick={handleBack} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting || previewSchedule.length === 0}
            className="flex items-center gap-2 font-bold px-6 shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Generating Schedule...</span>
              </>
            ) : (
              <>
                <Sparkles size={15} />
                <span>Generate &amp; Save Schedule</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Student Master Context Card (Vidya Setu Theme) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-xl font-bold font-display uppercase tracking-wider text-blue-700 shrink-0">
              {ledger.full_name.slice(0, 2)}
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-blue-600 font-bold">
                Student Account Profile
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                {ledger.full_name}
                <span className="text-xs font-mono font-normal text-slate-500">({ledger.student_code})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <GraduationCap size={14} className="text-blue-600" />
                <span className="font-medium text-slate-700">{ledger.batch_name || 'Classroom Batch'}</span>
                <span>&bull;</span>
                <span>{ledger.branch_name || 'Main Campus'}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6 text-right">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                Agreed Net Fee
              </span>
              <span className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5 block tabular-nums">
                {fmt(netFee)}
              </span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 block">
                Paid so far
              </span>
              <span className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-0.5 block tabular-nums">
                {fmt(currentPaid)}
              </span>
            </div>
            <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700 block">
                To Schedule
              </span>
              <span className="text-xl sm:text-2xl font-extrabold text-blue-800 mt-0.5 block tabular-nums">
                {fmt(remainingBalance)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 shadow-xs">
          <AlertCircle size={16} className="shrink-0 text-red-600" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Main Builder Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (5 cols): Parameter Controls */}
        <div className="lg:col-span-5 space-y-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">1. Choose Billing Cadence</h4>
            <p className="text-xs text-slate-500 mb-3">Select the recurring frequency for student installments.</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setScheduleType('monthly')}
                className={`py-3 px-4 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  scheduleType === 'monthly'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300'
                }`}
              >
                <Calendar size={18} />
                <span>Monthly Installments</span>
                <span className="text-[10px] font-normal opacity-80">Every month</span>
              </button>
              <button
                type="button"
                onClick={() => setScheduleType('termly')}
                className={`py-3 px-4 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  scheduleType === 'termly'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300'
                }`}
              >
                <Layers size={18} />
                <span>Termly (Quarterly)</span>
                <span className="text-[10px] font-normal opacity-80">Every 3 months</span>
              </button>
            </div>
          </div>

          {/* Number of Installments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                2. Number of Installments
              </label>
              <span className="text-sm font-extrabold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                {installmentCount} {scheduleType === 'termly' ? 'Terms' : 'Monthly Payments'}
              </span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {(scheduleType === 'termly' ? [2, 3, 4] : [2, 3, 4, 6, 8, 10, 12]).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setInstallmentCount(n)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    installmentCount === n
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {n} {scheduleType === 'termly' ? 'Terms' : 'Mo'}
                </button>
              ))}
            </div>
          </div>

          {/* Down Payment Deduction */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              3. Down Payment / Admission Fee
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
              <Input
                type="number"
                min={0}
                max={netFee}
                value={downPayment}
                onChange={(e) => setDownPayment(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0"
                className="pl-8 text-sm font-semibold"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Collected upfront upon registration. Remaining balance ({fmt(remainingBalance)}) will be split evenly.
            </span>
          </div>

          {/* Billing Cycle Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                First Due Date
              </label>
              <Input
                type="date"
                value={firstDueDate}
                onChange={(e) => setFirstDueDate(e.target.value)}
                className="text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Due Day of Month
              </label>
              <Select
                value={String(dueDay)}
                onChange={(e) => setDueDay(Number(e.target.value))}
                options={[
                  { value: '1', label: '1st of month' },
                  { value: '5', label: '5th of month' },
                  { value: '10', label: '10th of month' },
                  { value: '15', label: '15th of month' },
                  { value: '20', label: '20th of month' },
                  { value: '25', label: '25th of month' }
                ]}
                style={{ padding: '8px 12px', fontSize: '12px' }}
              />
            </div>
          </div>

          {/* Automated Reminders Option */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sendReminder}
                onChange={(e) => setSendReminder(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Bell size={14} className="text-blue-600" />
                  Automated SMS &amp; WhatsApp Reminders
                </span>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                  The system will automatically dispatch reminder alerts to the student and parent mobile numbers 3 days prior to each due date.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Right Column (7 cols): Interactive Live Schedule Roster */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-600" />
                Projected Installment Roster ({previewSchedule.length} payments)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Exact billing breakdown calculated in real-time
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-mono">
                Total: {fmt(remainingBalance)}
              </span>
            </div>
          </div>

          {previewSchedule.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-xs">
              Configure parameters on the left to generate the preview table.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="px-4 py-3 w-12 text-center">#</th>
                    <th className="px-4 py-3">Installment Label</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3 text-right">Installment Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {previewSchedule.map((item) => (
                    <tr key={item.number} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 text-center font-bold text-slate-400">
                        {item.number}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{item.label}</div>
                        <div className="text-[10px] text-slate-400">Tuition Fee Installment</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-800 flex items-center gap-1.5">
                          <Clock size={12} className="text-slate-400" />
                          <span>{item.formattedDueDate}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                        {fmt(item.amount)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Unpaid Draft
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Verification Banner */}
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 flex items-start gap-3 text-xs text-blue-900">
            <CheckCircle2 size={16} className="text-blue-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold block">Automated Database Replacement Rule:</span>
              <span>
                Saving this schedule will automatically replace any existing unpaid draft invoices for this student with these {previewSchedule.length} official structured installment invoices. Any already paid invoices and receipts remain 100% untouched.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

