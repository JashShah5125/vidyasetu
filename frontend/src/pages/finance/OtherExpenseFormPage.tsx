import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import {
  otherExpenseApi,
  EXPENSE_CATEGORIES
} from '../../services/otherExpenseApi';
import { getAcademicOptions } from '../../services/studentApi';
import {
  ArrowLeft,
  Loader2,
  Save,
  Receipt
} from 'lucide-react';

const fmt = (n: number) => '₹' + (Number(n) || 0).toLocaleString('en-IN');

export const OtherExpenseFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, addToast } = useApp();

  const [submitting, setSubmitting] = useState(false);
  const [branchOptions, setBranchOptions] = useState<{ value: string; label: string }[]>([]);

  // Form state
  const [formBranchId, setFormBranchId] = useState<string>('');
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Other Expenses');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formStatus, setFormStatus] = useState<number>(0);
  const [formPaymentMode, setFormPaymentMode] = useState('bank_transfer');
  const [formReference, setFormReference] = useState('');
  const [formPayee, setFormPayee] = useState('');

  // Load branch options
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const opts = await getAcademicOptions();
        if (opts?.branches && Array.isArray(opts.branches)) {
          const bOpts = opts.branches.map((b: any) => ({ value: String(b.id), label: b.name }));
          setBranchOptions(bOpts);
          const userBranchId = currentUser?.branchId ? String(currentUser.branchId) : null;
          if (userBranchId) {
            setFormBranchId(userBranchId);
          } else if (bOpts.length > 0) {
            setFormBranchId(bOpts[0].value);
          }
        }
      } catch (e) {
        console.warn('Failed to load branches', e);
      }
    };
    loadBranches();
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amt = Number(formAmount);
    if (!formTitle.trim()) {
      addToast('Please enter an expense title', 'error');
      return;
    }
    if (!amt || amt <= 0) {
      addToast('Please enter a valid amount greater than zero', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const chosenBranch = formBranchId || currentUser?.branch_id || (currentUser?.branch as any)?.id || 1;
      const created = await otherExpenseApi.createOtherExpense({
        branchId: Number(chosenBranch),
        title: formTitle.trim(),
        amount: amt,
        expenseDate: formDate,
        category: formCategory,
        status: formStatus,
        paymentMode: formPaymentMode,
        referenceNumber: formReference.trim() || undefined,
        description: formDescription.trim() || undefined,
        payee: formPayee.trim() || undefined
      });
      addToast(`Expense record ${created.expense_record_number} recorded for ${fmt(amt)}`, 'success');
      navigate(`/finance/expenses/other/${created.id}`);
    } catch (err: any) {
      console.error('Create failed:', err);
      addToast(err?.response?.data?.message || 'Failed to create expense record', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/finance/expenses/other')}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Record New Expense</h2>
            <p className="text-sm text-slate-500 mt-0.5">Add a new miscellaneous operational expense entry</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2">
                  <Receipt size={18} className="text-blue-600" />
                  Expense Details
                </CardTitle>
              </CardHeader>
              <div className="p-5 space-y-4">
                {branchOptions.length > 1 && (
                  <Select
                    label="Branch *"
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    options={branchOptions}
                    required
                  />
                )}

                <Input
                  label="Expense Title *"
                  placeholder="e.g. Office Supplies, Petty Cash, Maintenance"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Category *"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    options={EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }))}
                  />
                  <Select
                    label="Status *"
                    value={String(formStatus)}
                    onChange={(e) => setFormStatus(Number(e.target.value))}
                    options={[
                      { value: '0', label: 'Pending' },
                      { value: '1', label: 'Approved' },
                      { value: '2', label: 'Paid' },
                      { value: '3', label: 'Rejected' }
                    ]}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Amount (₹) *"
                    type="number"
                    min={1}
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    required
                  />
                  <Input
                    label="Expense Date *"
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                  />
                </div>

                <Input
                  label="Description / Purpose Notes"
                  placeholder="e.g. Purchase of printer cartridges for main office"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="border-b border-slate-100">
                <CardTitle>Payment Info</CardTitle>
              </CardHeader>
              <div className="p-5 space-y-4">
                <Select
                  label="Payment Mode *"
                  value={formPaymentMode}
                  onChange={(e) => setFormPaymentMode(e.target.value)}
                  options={[
                    { value: 'bank_transfer', label: 'Bank Transfer (NEFT/RTGS)' },
                    { value: 'upi', label: 'UPI / GPay' },
                    { value: 'cash', label: 'Cash' },
                    { value: 'cheque', label: 'Cheque' },
                    { value: 'card', label: 'Debit / Credit Card' }
                  ]}
                />
                <Input
                  label="Transaction Reference / UTR"
                  placeholder="e.g. TXN123456 or Cheque #"
                  value={formReference}
                  onChange={(e) => setFormReference(e.target.value)}
                />
                <Input
                  label="Payee / Vendor"
                  placeholder="e.g. ABC Traders, Stationery World"
                  value={formPayee}
                  onChange={(e) => setFormPayee(e.target.value)}
                />
              </div>
            </Card>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/finance/expenses/other')}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="font-bold flex items-center gap-1.5" disabled={submitting}>
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save Expense Record
          </Button>
        </div>
      </form>
    </div>
  );
};
