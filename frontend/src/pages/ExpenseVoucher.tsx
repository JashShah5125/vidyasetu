import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { saveVoucher } from '../utils/expenseService';
import type { Voucher } from '../utils/expenseService';
import { FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export const ExpenseVoucher: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [voucherType, setVoucherType] = useState<Voucher['type']>('Expense');
  const [category, setCategory] = useState<Voucher['category']>('Electricity');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<Voucher['paymentMethod']>('Bank Transfer');
  const [paidTo, setPaidTo] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [status, setStatus] = useState<Voucher['status']>('Paid');

  // Handle voucher type changing to change default direction and categories
  const handleVoucherTypeChange = (val: string) => {
    const vt = val as Voucher['type'];
    setVoucherType(vt);
    // Auto-set category based on voucher type
    if (vt === 'Receipt' || vt === 'Fee') {
      setCategory('Donations');
    } else {
      setCategory('Electricity');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !paidTo) {
      alert('Please fill in Description, Amount, and Paid To / Received From.');
      return;
    }

    const direction: Voucher['direction'] = (voucherType === 'Receipt' || voucherType === 'Fee') ? 'Credit' : 'Debit';

    const voucherData: Omit<Voucher, 'id'> = {
      date,
      type: voucherType,
      category,
      description,
      amount: parseFloat(amount),
      paymentMethod,
      paidTo,
      referenceNo: referenceNo || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      attachmentName: attachment ? attachment.name : undefined,
      status,
      direction,
      branch: currentUser?.branch || 'Mumbai West'
    };

    saveVoucher(voucherData);
    setSuccessMsg('Voucher Saved Successfully in accounting registry!');
    
    // Clear form
    setDescription('');
    setAmount('');
    setPaidTo('');
    setReferenceNo('');
    setAttachment(null);

    setTimeout(() => {
      setSuccessMsg('');
      navigate('/expense-ledger');
    }, 2000);
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 p-6 md:p-8 animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">
            Accounting Voucher Entry
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Create payment vouchers, receipts, and expense notes in a ledger.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm">
          <CheckCircle2 className="text-emerald-600" size={20} />
          <span>{successMsg}</span>
        </div>
      )}

      <Card className="border border-slate-200 shadow-xl overflow-hidden rounded-2xl">
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-blue-100" />
            <span className="font-semibold text-sm uppercase tracking-wider font-mono">Accounting Entry Form</span>
          </div>
          <span className="text-xs font-bold font-mono opacity-80">Voucher Entry Mode</span>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              type="text"
              label="Branch"
              value={currentUser?.branch || 'Mumbai West'}
              disabled
              className="bg-slate-100 border-slate-200 cursor-not-allowed font-semibold text-slate-500"
            />

            <Select
              label="Voucher Type"
              value={voucherType}
              onChange={(e) => handleVoucherTypeChange(e.target.value)}
              options={[
                { value: 'Expense', label: 'Expense Voucher (Outflow)' },
                { value: 'Payment', label: 'Payment Voucher (Outflow)' },
                { value: 'Salary', label: 'Salary Voucher (Outflow)' },
                { value: 'Purchase', label: 'Purchase Voucher (Outflow)' },
                { value: 'Receipt', label: 'Receipt Voucher (Inflow)' },
                { value: 'Fee', label: 'Fee Receipt (Inflow)' }
              ]}
            />

            <Input
              type="date"
              label="Voucher Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />

            <Select
              label="Accounting Category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Voucher['category'])}
              options={
                (voucherType === 'Receipt' || voucherType === 'Fee')
                  ? [
                      { value: 'Donations', label: 'Donations' },
                      { value: 'Fees', label: 'Student Fees' },
                      { value: 'Other', label: 'Other Income / Scrap' }
                    ]
                  : [
                      { value: 'Salaries', label: 'Salaries & Wages' },
                      { value: 'Electricity', label: 'Electricity Bills' },
                      { value: 'Maintenance', label: 'Maintenance & Repairs' },
                      { value: 'Stationery', label: 'Stationery & Printing' },
                      { value: 'Transport', label: 'Transport / Bus Fuel' },
                      { value: 'Hostel', label: 'Hostel Operations' },
                      { value: 'Other', label: 'Other Expenses' }
                    ]
              }
            />

            <Input
              type="number"
              label="Transaction Amount (₹)"
              placeholder="e.g. 12500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />

            <Input
              type="text"
              label={ (voucherType === 'Receipt' || voucherType === 'Fee') ? "Received From" : "Paid To" }
              placeholder={ (voucherType === 'Receipt' || voucherType === 'Fee') ? "e.g. Student Account or Donor" : "e.g. Vendor or Staff Name" }
              value={paidTo}
              onChange={(e) => setPaidTo(e.target.value)}
              required
            />

            <Select
              label="Payment Method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as Voucher['paymentMethod'])}
              options={[
                { value: 'Bank Transfer', label: 'Bank Transfer' },
                { value: 'UPI', label: 'UPI / GPay / PhonePe' },
                { value: 'Cash', label: 'Cash Account' },
                { value: 'Cheque', label: 'Cheque' }
              ]}
            />

            <Input
              type="text"
              label="Reference / Instrument No."
              placeholder="e.g. ELEC-0726 or UPI Ref No"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
            />

            <Select
              label="Voucher Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Voucher['status'])}
              options={[
                { value: 'Paid', label: 'Cleared / Paid' },
                { value: 'Pending', label: 'Accrued / Pending' }
              ]}
            />

            <div className="md:col-span-2">
              <Input
                type="text"
                label="Voucher Description"
                placeholder="Provide short memo/details of the transaction..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="md:col-span-2 border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="block text-xs font-bold text-slate-700">Attachment Upload</span>
                <span className="text-[11px] text-slate-400">Upload invoices, receipts or expense slips (Max 5MB)</span>
              </div>
              <label className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition">
                {attachment ? attachment.name : 'Upload Bill'}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setAttachment(e.target.files[0]);
                    }
                  }}
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Save Voucher
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
