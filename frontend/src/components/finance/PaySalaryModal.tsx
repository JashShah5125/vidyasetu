import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { staffSalaryApi, type StaffSalaryStatusItem } from '../../services/staffSalaryApi';
import { useApp } from '../../context/AppContext';
import { DollarSign, CheckCircle2, User, Calendar, CreditCard, FileText, AlertCircle, Loader2 } from 'lucide-react';

interface PaySalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffSalaryStatusItem | null;
  month: number;
  year: number;
  onPaymentSuccess: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const PaySalaryModal: React.FC<PaySalaryModalProps> = ({
  isOpen,
  onClose,
  staff,
  month,
  year,
  onPaymentSuccess
}) => {
  const { addToast } = useApp();
  const [amount, setAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('bank_transfer');
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (staff) {
      setAmount(String(staff.salary_amount || 0));
      setPaymentMode('bank_transfer');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setReference('');
      setRemarks('');
      setErrorMsg(null);
    }
  }, [staff, isOpen]);

  if (!staff) return null;

  const monthName = MONTH_NAMES[month - 1] || `Month ${month}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid salary amount greater than 0.');
      return;
    }

    if (!paymentDate) {
      setErrorMsg('Please select a valid payment date.');
      return;
    }

    try {
      setIsSubmitting(true);
      await staffSalaryApi.paySalary(staff.staff_id, {
        salaryMonth: month,
        salaryYear: year,
        amount: numAmount,
        paidDate: paymentDate,
        paymentMode,
        reference: reference.trim() || undefined,
        remarks: remarks.trim() || undefined,
        branchId: staff.branch_id
      });

      addToast({
        title: 'Payment Recorded',
        message: `Salary for ${staff.full_name} (${monthName} ${year}) marked as PAID.`,
        type: 'success'
      });

      onPaymentSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error paying salary:', err);
      setErrorMsg(err?.response?.data?.message || err.message || 'Failed to record salary payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Salary Payment"
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Recording...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} className="mr-2" />
                Confirm Payment
              </>
            )}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-red-700 text-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Staff & Period Summary Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base">
                {staff.first_name[0]}
                {staff.last_name ? staff.last_name[0] : ''}
              </div>
              <div>
                <h4 className="text-base font-semibold text-slate-900">{staff.full_name}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span className="font-mono bg-slate-200/70 px-1.5 py-0.5 rounded text-slate-700">
                    {staff.employee_id || `ID: ${staff.staff_id}`}
                  </span>
                  <span>•</span>
                  <span>{staff.employee_type}</span>
                  {staff.designation && (
                    <>
                      <span>•</span>
                      <span>{staff.designation}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Pay Period</span>
              <p className="text-sm font-bold text-blue-700 mt-0.5">
                {monthName} {year}
              </p>
            </div>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Salary Amount (₹) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">₹</span>
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="0"
                className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Default monthly salary configured in staff master
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Payment Mode <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="bank_transfer">Bank Transfer (IMPS / NEFT)</option>
              <option value="upi">UPI / Online App</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash</option>
              <option value="rtgs">RTGS</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Transaction Ref / Cheque No.
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. TXN987654321"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Remarks / Payment Notes
          </label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={2}
            placeholder="Optional internal remarks or voucher details..."
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
          />
        </div>
      </form>
    </Modal>
  );
};
