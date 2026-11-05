import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { 
  Calendar, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Bell, 
  Clock, 
  Layers, 
  DollarSign, 
  Loader2 
} from 'lucide-react';
import { 
  type StudentLedger, 
  generateInstallmentSchedule, 
  type GenerateInstallmentsPayload 
} from '../../services/paymentApi';

interface InstallmentScheduleBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  ledger: StudentLedger | null;
  onSuccess: (message: string) => void;
}

const fmt = (n: number) => '₹' + (Number(n) || 0).toLocaleString('en-IN');
const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const InstallmentScheduleBuilderModal: React.FC<InstallmentScheduleBuilderModalProps> = ({
  isOpen,
  onClose,
  ledger,
  onSuccess
}) => {
  const feeAssignment = ledger?.feeAssignment;

  const netFee = feeAssignment?.net_amount ?? 0;
  const currentPaid = feeAssignment?.paid_amount ?? 0;
  const initialDownPayment = feeAssignment?.down_payment ?? 0;

  // Form State
  const [scheduleType, setScheduleType] = useState<'monthly' | 'termly' | 'custom'>('monthly');
  const [installmentCount, setInstallmentCount] = useState<number>(scheduleType === 'termly' ? 3 : 6);
  const [downPayment, setDownPayment] = useState<number>(initialDownPayment);
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

  // Sync count defaults when schedule type changes
  useEffect(() => {
    if (scheduleType === 'termly') {
      setInstallmentCount(3);
    } else if (scheduleType === 'monthly') {
      setInstallmentCount(6);
    }
  }, [scheduleType]);

  // Reset initial values when ledger opens
  useEffect(() => {
    if (feeAssignment) {
      setDownPayment(feeAssignment.down_payment || 0);
    }
    setError(null);
  }, [feeAssignment, isOpen]);

  // Calculations
  const remainingBalance = useMemo(() => {
    return Math.max(0, netFee - currentPaid - downPayment);
  }, [netFee, currentPaid, downPayment]);

  // Live Projected Schedule
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
      onSuccess(res.message || 'Installment schedule successfully built and saved.');
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to generate schedule.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!ledger) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Automated Installment Schedule Builder"
      maxWidth="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Student Context Bar */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 p-4 rounded-xl border border-blue-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Student</span>
            <div className="font-bold text-slate-900 text-sm">{ledger.full_name} ({ledger.student_code})</div>
            <div className="text-slate-500">{ledger.batch_name || 'Classroom Roster'}</div>
          </div>
          <div className="flex items-center gap-4 text-right">
            <div>
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Net Fee</span>
              <div className="font-bold text-slate-900 text-sm tabular-nums">{fmt(netFee)}</div>
            </div>
            <div>
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Paid so far</span>
              <div className="font-bold text-emerald-700 text-sm tabular-nums">{fmt(currentPaid)}</div>
            </div>
            <div>
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">To Schedule</span>
              <div className="font-extrabold text-blue-700 text-sm tabular-nums">{fmt(remainingBalance)}</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Schedule Parameters */}
          <div className="md:col-span-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Installment Cadence
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleType('monthly')}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    scheduleType === 'monthly'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Calendar size={13} />
                  <span>Monthly</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleType('termly')}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    scheduleType === 'termly'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Layers size={13} />
                  <span>Termly (Quarterly)</span>
                </button>
              </div>
            </div>

            {/* Installment Count Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Number of Installments: <span className="text-blue-600 font-extrabold">{installmentCount}</span>
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(scheduleType === 'termly' ? [2, 3, 4] : [2, 3, 4, 6, 8, 10, 12]).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setInstallmentCount(n)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      installmentCount === n
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {n} {scheduleType === 'termly' ? 'Terms' : 'Mo'}
                  </button>
                ))}
              </div>
            </div>

            {/* Down Payment Override */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Down Payment / Registration Fee
              </label>
              <Input
                type="number"
                min={0}
                max={netFee}
                value={downPayment}
                onChange={(e) => setDownPayment(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0"
                className="text-xs"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Deducted upfront before calculating remaining installment splits.
              </span>
            </div>

            {/* First Due Date & Day of Month */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
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
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
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
                  style={{ padding: '6px 10px', fontSize: '12px' }}
                />
              </div>
            </div>

            {/* Automated Reminders Option */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sendReminder}
                  onChange={(e) => setSendReminder(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Bell size={13} className="text-blue-600" />
                    Automated SMS &amp; WhatsApp Reminders
                  </span>
                  <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                    Automatically schedules payment reminders 3 days before and on the installment due date.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Right Column: Live Projected Timeline & Table */}
          <div className="md:col-span-7 flex flex-col justify-between bg-slate-50 border border-slate-200/80 rounded-xl p-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-blue-600" />
                  Projected Installment Roster ({previewSchedule.length} payments)
                </span>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {fmt(remainingBalance)} Total
                </span>
              </div>

              {previewSchedule.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Configure the schedule parameters on the left to preview the breakdown.
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[300px] divide-y divide-slate-100 my-2 pr-1">
                  {previewSchedule.map((item) => (
                    <div key={item.number} className="py-2.5 flex items-center justify-between text-xs hover:bg-white/80 rounded-lg px-2 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {item.number}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-800">{item.label}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock size={11} /> Due on {item.formattedDueDate}
                          </div>
                        </div>
                      </div>
                      <div className="text-right font-mono font-bold text-slate-900 text-sm">
                        {fmt(item.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <CheckCircle2 size={13} className="text-emerald-600" />
                Unpaid draft invoices will be automatically replaced with this structured plan.
              </span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={submitting || previewSchedule.length === 0}
            className="flex items-center gap-2 font-bold px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Generating Schedule...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Generate &amp; Save Schedule</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

