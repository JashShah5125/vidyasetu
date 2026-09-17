import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  staffSalaryApi,
  type SalaryPaymentRecord
} from '../../services/staffSalaryApi';
import {
  DollarSign,
  Calendar,
  CreditCard,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';

interface EditSalaryPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: SalaryPaymentRecord | null;
  staffName?: string;
  onSuccess: () => void;
  addToast: (toast: { title?: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const fmt = (n: number) => '₹' + (Number(n) || 0).toLocaleString('en-IN');

export const EditSalaryPaymentModal: React.FC<EditSalaryPaymentModalProps> = ({
  isOpen,
  onClose,
  payment,
  staffName = 'Staff Member',
  onSuccess,
  addToast
}) => {
  const [amount, setAmount] = useState<string>('');
  const [paidDate, setPaidDate] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('bank_transfer');
  const [reference, setReference] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (payment) {
      setAmount(String(payment.amount || ''));
      setPaidDate(
        payment.paid_date ? String(payment.paid_date).slice(0, 10) : new Date().toISOString().split('T')[0]
      );
      setPaymentMode(payment.payment_mode || 'bank_transfer');
      setReference(payment.reference || '');
      setRemarks(payment.remarks || '');
      setErrorMsg(null);
    }
  }, [payment]);

  if (!payment) return null;

  const monthName = MONTH_NAMES[payment.salary_month - 1] || `Month ${payment.salary_month}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const numAmt = Number(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      setErrorMsg('Please enter a valid disbursement amount greater than 0.');
      return;
    }

    try {
      setIsSubmitting(true);
      await staffSalaryApi.updateSalaryPayment(payment.id, {
        amount: numAmt,
        paidDate,
        paymentMode,
        reference: reference.trim() || null,
        remarks: remarks.trim() || null
      });

      addToast({
        title: 'Payment Record Updated',
        message: `Updated salary payment for ${monthName} ${payment.salary_year} (${fmt(numAmt)}).`,
        type: 'success'
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error updating salary payment:', err);
      setErrorMsg(err?.response?.data?.message || err.message || 'Failed to update salary payment record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Salary Payment: ${monthName} ${payment.salary_year}`}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 font-bold"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Staff & Cycle Header */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-900 block">{staffName}</span>
            <span className="text-xs text-slate-500">
              Payroll Cycle: <strong>{monthName} {payment.salary_year}</strong>
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            PAID RECORD
          </span>
        </div>

        {/* Amount Paid */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Disbursed Amount (₹) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-sm">
              ₹
            </span>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Date of Payment */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Payment Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            required
            value={paidDate}
            onChange={(e) => setPaidDate(e.target.value)}
            className="w-full px-3 py-2 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Payment Mode */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Payment Mode
          </label>
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className="w-full px-3 py-2 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="bank_transfer">Bank Transfer / NEFT / IMPS</option>
            <option value="upi">UPI / QR Payment</option>
            <option value="cheque">Cheque</option>
            <option value="cash">Cash</option>
            <option value="online">Online Gateway</option>
          </select>
        </div>

        {/* Transaction Reference */}
        <div>
          <Input
            label="Transaction Reference / Cheque No."
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. UTR-982341209, CHQ-00912"
          />
        </div>

        {/* Remarks / Notes */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Remarks / Payment Notes
          </label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Cleared via HDFC Bank, bonus included..."
            className="w-full px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </form>
    </Modal>
  );
};
