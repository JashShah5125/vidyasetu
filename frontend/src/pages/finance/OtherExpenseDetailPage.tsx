import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import {
  otherExpenseApi,
  type OtherExpenseRecord,
  STATUS_MAP,
  EXPENSE_CATEGORIES
} from '../../services/otherExpenseApi';
import { getAcademicOptions } from '../../services/studentApi';
import { formatDate as fmtDate } from '../../utils/dateFormatter';
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Trash2,
  Eye,
  AlertTriangle,
  Save,
  X,
  Receipt
} from 'lucide-react';

const fmt = (n: number) => '₹' + (Number(n) || 0).toLocaleString('en-IN');

export const OtherExpenseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, addToast } = useApp();
  const startInEditMode = searchParams.get('edit') === 'true';

  const [record, setRecord] = useState<OtherExpenseRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Other Expenses');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStatus, setFormStatus] = useState<number>(0);
  const [formPaymentMode, setFormPaymentMode] = useState('bank_transfer');
  const [formReference, setFormReference] = useState('');
  const [formPayee, setFormPayee] = useState('');

  const [branchOptions, setBranchOptions] = useState<{ value: string; label: string }[]>([]);

  const fetchRecord = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await otherExpenseApi.getOtherExpenseById(id);
      setRecord(data);
      if (startInEditMode) {
        setFormTitle(data.title);
        setFormCategory(data.category || 'Other Expenses');
        setFormDescription(data.description || '');
        setFormAmount(String(data.amount));
        setFormDate(data.expense_date);
        setFormStatus(data.status);
        setFormPaymentMode(data.payment_mode || 'bank_transfer');
        setFormReference(data.reference_number || '');
        setFormPayee(data.payee || '');
        setEditing(true);
      }
    } catch (err: any) {
      console.error('Failed to load expense:', err);
      addToast(err?.response?.data?.message || 'Failed to load expense record', 'error');
      navigate('/finance/expenses/other');
    } finally {
      setLoading(false);
    }
  }, [id, addToast, navigate, startInEditMode]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  // Load branch options
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const opts = await getAcademicOptions();
        if (opts?.branches && Array.isArray(opts.branches)) {
          setBranchOptions(opts.branches.map((b: any) => ({ value: String(b.id), label: b.name })));
        }
      } catch (e) {
        console.warn('Failed to load branches', e);
      }
    };
    loadBranches();
  }, []);

  // Populate form when entering edit mode
  const startEditing = () => {
    if (!record) return;
    setFormTitle(record.title);
    setFormCategory(record.category || 'Other Expenses');
    setFormDescription(record.description || '');
    setFormAmount(String(record.amount));
    setFormDate(record.expense_date);
    setFormStatus(record.status);
    setFormPaymentMode(record.payment_mode || 'bank_transfer');
    setFormReference(record.reference_number || '');
    setFormPayee(record.payee || '');
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;

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
      const updated = await otherExpenseApi.updateOtherExpense(record.id, {
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
      setRecord(updated);
      setEditing(false);
      addToast(`Expense record ${updated.expense_record_number} updated successfully`, 'success');
    } catch (err: any) {
      console.error('Update failed:', err);
      addToast(err?.response?.data?.message || 'Failed to update expense record', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!record) return;
    try {
      setSubmitting(true);
      await otherExpenseApi.deleteOtherExpense(record.id);
      addToast(`Expense record ${record.expense_record_number} deleted successfully`, 'success');
      setShowDeleteModal(false);
      navigate('/finance/expenses/other');
    } catch (err: any) {
      console.error('Delete failed:', err);
      addToast(err?.response?.data?.message || 'Failed to delete expense record', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-blue-500" />
        <span className="ml-3 text-sm text-slate-500 font-medium">Loading expense record...</span>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-sm text-slate-500 font-semibold">Expense record not found.</p>
        <button onClick={() => navigate('/finance/expenses/other')} className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">
          ← Back to Other Expenses
        </button>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[record.status] || STATUS_MAP[0];

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
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{record.expense_record_number}</h2>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                statusInfo.color === 'emerald' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                statusInfo.color === 'blue' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                statusInfo.color === 'amber' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                statusInfo.color === 'rose' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {statusInfo.label}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{record.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!editing ? (
            <>
              <Button variant="secondary" onClick={startEditing} className="flex items-center gap-1.5 font-bold">
                <Pencil size={14} /> Edit
              </Button>
              <Button variant="primary" className="bg-rose-600 hover:bg-rose-700 font-bold flex items-center gap-1.5" onClick={() => setShowDeleteModal(true)}>
                <Trash2 size={14} /> Delete
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={cancelEditing} disabled={submitting} className="flex items-center gap-1.5">
                <X size={14} /> Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={submitting} className="flex items-center gap-1.5 font-bold">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <Receipt size={18} className="text-blue-600" />
                Expense Details
              </CardTitle>
            </CardHeader>
            <div className="p-5">
              {editing ? (
                <form onSubmit={handleSave} className="space-y-4">
                  <Input
                    label="Expense Title *"
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
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Title</span>
                    <span className="font-bold text-slate-900 text-sm">{record.title}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Category</span>
                    <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">{record.category}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Amount</span>
                    <span className="font-bold text-base text-rose-700 tabular-nums">{fmt(record.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Expense Date</span>
                    <span className="font-semibold text-slate-700 text-sm">{fmtDate(record.expense_date)}</span>
                  </div>
                  {record.description && (
                    <div className="pt-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Description</span>
                      <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                        {record.description}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-slate-100">
              <CardTitle>Payment & Tracking</CardTitle>
            </CardHeader>
            <div className="p-5">
              {editing ? (
                <div className="space-y-4">
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
                    value={formReference}
                    onChange={(e) => setFormReference(e.target.value)}
                  />
                  <Input
                    label="Payee / Vendor"
                    value={formPayee}
                    onChange={(e) => setFormPayee(e.target.value)}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Payment Mode</span>
                    <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium capitalize">
                      {(record.payment_mode || '').replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Reference / UTR</span>
                    <span className="font-mono text-xs font-semibold text-slate-700">{record.reference_number || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Payee / Vendor</span>
                    <span className="text-sm font-semibold text-slate-700">{record.payee || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Branch</span>
                    <span className="inline-flex px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
                      {record.branch_name || 'Main Campus'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Recorded By</span>
                    <span className="text-sm text-slate-600">{record.creator_name || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Created At</span>
                    <span className="text-xs text-slate-500">{fmtDate(record.created_at)}</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Attachments */}
          {record.attachment_urls && record.attachment_urls.length > 0 && !editing && (
            <Card>
              <CardHeader className="border-b border-slate-100">
                <CardTitle>Attachments ({record.attachment_urls.length})</CardTitle>
              </CardHeader>
              <div className="p-5">
                <ul className="space-y-2">
                  {record.attachment_urls.map((url, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs text-blue-600 hover:underline">
                      <Eye size={12} />
                      <span className="truncate">{url.split('/').pop()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowDeleteModal(false)}
          title="Confirm Expense Deletion"
          size="sm"
        >
          <div className="space-y-4 text-sm text-slate-600">
            <div className="flex items-center gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
              <AlertTriangle size={24} className="shrink-0 text-rose-600" />
              <p className="text-xs font-medium">
                Are you sure you want to delete expense record <strong className="font-bold">{record.expense_record_number}</strong> ({fmt(record.amount)})?
              </p>
            </div>
            <p className="text-xs text-slate-500">
              This will mark the record as deleted and remove it from your active expense totals. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="primary" className="bg-rose-600 hover:bg-rose-700 font-bold" onClick={handleDelete} disabled={submitting}>
                {submitting ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                Confirm Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
