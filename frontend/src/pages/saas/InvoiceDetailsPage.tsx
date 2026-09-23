import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Loader2, ArrowLeft, Edit, Receipt, Building2, CalendarDays, Hash, BadgeCheck, FileText, User } from 'lucide-react';
import { billingService } from '../../services/billingService';
import { formatDate } from '../../utils/dateFormatter';

const getCurrencySymbol = (c?: string) => {
  switch (c) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    default: return '₹';
  }
};

const formatCurr = (n: number, currency = 'INR') => {
  const sym = getCurrencySymbol(currency);
  const loc = currency === 'USD' ? 'en-US' : currency === 'EUR' ? 'de-DE' : currency === 'GBP' ? 'en-GB' : 'en-IN';
  return `${sym}${Math.round(n || 0).toLocaleString(loc)}`;
};

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '-';

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-500 border-slate-200',
  unpaid: 'bg-amber-50 text-amber-700 border-amber-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
  refunded: 'bg-slate-100 text-slate-500 border-slate-300',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-300'
};

export const InvoiceDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    billingService.getInvoiceById(Number(id))
      .then(setInvoice)
      .catch((err) => setError(err?.response?.data?.message || 'Failed to load invoice'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-sm text-slate-500 font-semibold">{error || 'Invoice not found.'}</p>
        <Link to="/billing" className="text-xs font-bold text-indigo-600 hover:underline">← Back to Billing</Link>
      </div>
    );
  }

  const curr = invoice.currency || 'INR';
  const amounts = [
    { label: 'Plan Amount', value: formatCurr(invoice.plan_amount, curr) },
    { label: 'Setup Fee', value: formatCurr(invoice.setup_fee, curr) },
    { label: 'Discount', value: `- ${formatCurr(invoice.discount_amount, curr)} (${invoice.discount_percent || 0}%)` },
    { label: 'Subtotal', value: formatCurr(invoice.subtotal, curr) },
    { label: `Tax (${invoice.tax_rate || 0}%)`, value: formatCurr(invoice.tax_amount, curr) }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <button
            onClick={() => navigate('/billing')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Billing
          </button>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2">Invoice Details</h2>
          <p className="text-sm text-slate-500 mt-1">Full record for invoice <span className="font-mono font-bold text-indigo-600">{invoice.invoice_number}</span></p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={() => navigate('/billing')}>Back to Billing</Button>
          <Button onClick={() => navigate(`/billing/invoices/${invoice.id}/edit`)} className="gap-2">
            <Edit size={15} /> Edit Invoice
          </Button>
        </div>
      </div>

      {/* Status strip */}
      <div className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
            <Receipt size={20} />
          </div>
          <div>
            <div className="text-sm font-extrabold text-slate-900">{invoice.invoice_number}</div>
            <div className="text-xs text-slate-500">Issued {formatDate(invoice.created_at)}</div>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColors[invoice.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
          {cap(invoice.status)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 space-y-5">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Building2 size={15} className="text-indigo-600" /> Tenant &amp; Plan
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Tenant</span>
                <span className="text-base font-bold text-slate-900">{invoice.tenant_name}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Subscription Plan</span>
                <span className="text-base font-bold text-slate-900">{invoice.plan_name}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Billing Cycle</span>
                <span className="text-base font-bold text-slate-900 capitalize">{invoice.billing_cycle}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Currency</span>
                <span className="text-base font-bold text-slate-900">{invoice.currency}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-5">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <CalendarDays size={15} className="text-indigo-600" /> Billing Period
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Period Start</span>
                <span className="text-base font-bold text-slate-900">{formatDate(invoice.billing_period_start)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Period End</span>
                <span className="text-base font-bold text-slate-900">{formatDate(invoice.billing_period_end)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Payment Date</span>
                <span className="text-base font-bold text-slate-900">{formatDate(invoice.payment_date)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Payment Method</span>
                <span className="text-base font-bold text-slate-900">{invoice.payment_method || '-'}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-5">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <User size={15} className="text-indigo-600" /> Payment &amp; Reference
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Provider Transaction ID</span>
                <span className="text-sm font-bold text-slate-900 break-all">{invoice.provider_transaction_id || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Payment Reference</span>
                <span className="text-sm font-bold text-slate-900 break-all">{invoice.payment_reference || '-'}</span>
              </div>
            </div>
            {invoice.notes && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Notes</span>
                <p className="text-sm text-slate-700 mt-1">{invoice.notes}</p>
              </div>
            )}
          </Card>
        </div>

        {/* Right: amount summary */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4">
              <Hash size={15} className="text-indigo-600" /> Amount Breakdown
            </h3>
            <div className="space-y-3">
              {amounts.map(a => (
                <div key={a.label} className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-xs text-slate-500 font-medium">{a.label}</span>
                  <span className="text-sm font-bold text-slate-800">{a.value}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Total</span>
                <span className="text-2xl font-extrabold text-indigo-600">{formatCurr(invoice.total_amount, curr)}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-3">
              <BadgeCheck size={15} className="text-indigo-600" /> Meta
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">Created At</span>
                <span className="text-xs font-bold text-slate-800">{formatDate(invoice.created_at)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">Created By (User ID)</span>
                <span className="text-xs font-bold text-slate-800">{invoice.created_by || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">Last Updated</span>
                <span className="text-xs font-bold text-slate-800">{formatDate(invoice.updated_at)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};