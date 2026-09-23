import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Loader2, Receipt, ArrowLeft, AlertCircle } from 'lucide-react';
import { billingService } from '../../services/billingService';
import { tenantService } from '../../services/tenantService';
import { planService } from '../../services/planService';

const BILLING_CYCLES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half Yearly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'lifetime', label: 'Lifetime' }
];

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'cancelled', label: 'Cancelled' }
];

const PAYMENT_METHODS = [
  { value: 'Razorpay', label: 'Razorpay' },
  { value: 'UPI', label: 'UPI' },
  { value: 'Bank Transfer', label: 'Bank Transfer' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'Cash', label: 'Cash' }
];

const CURRENCIES = [
  { value: 'INR', label: 'INR (₹)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' }
];

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const emptyForm = {
  invoice_number: '',
  tenant_id: '',
  plan_id: '',
  billing_cycle: 'yearly',
  billing_period_start: '',
  billing_period_end: '',
  plan_amount: '',
  setup_fee: '',
  discount_percent: '',
  tax_rate: '18',
  currency: 'INR',
  status: 'draft',
  payment_date: '',
  payment_method: '',
  provider_transaction_id: '',
  payment_reference: '',
  notes: ''
};

export const InvoiceFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id) && id !== 'new';

  const [form, setForm] = useState<any>(emptyForm);
  const [tenants, setTenants] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [amountTouched, setAmountTouched] = useState(false);

  const cyclePriceKey: Record<string, string> = {
    monthly: 'monthlyPrice',
    quarterly: 'quarterlyPrice',
    half_yearly: 'halfYearlyPrice',
    yearly: 'yearlyPrice',
    lifetime: 'lifetimePrice'
  };

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true);
    try {
      const [tenantRes, planRes] = await Promise.all([
        tenantService.getTenants({ status: 'active', limit: 200 }),
        planService.getPlans(['active'])
      ]);
      const tenantRows = Array.isArray(tenantRes?.data) ? tenantRes.data : [];
      setTenants(tenantRows.filter((t: any) => t.tenant_type === 'customer'));
      setPlans(Array.isArray(planRes?.data) ? planRes.data : []);
    } catch (err) {
      console.error('Failed to load invoice form options:', err);
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    setError('');
    setAmountTouched(false);
    loadOptions();

    if (isEditing && id) {
      setLoadingForm(true);
      billingService.getInvoiceById(Number(id))
        .then((row) => {
          setForm({
            invoice_number: row.invoice_number || '',
            tenant_id: String(row.tenant_id ?? ''),
            plan_id: String(row.plan_id ?? ''),
            billing_cycle: row.billing_cycle || 'yearly',
            billing_period_start: row.billing_period_start ? String(row.billing_period_start).substring(0, 10) : '',
            billing_period_end: row.billing_period_end ? String(row.billing_period_end).substring(0, 10) : '',
            plan_amount: row.plan_amount == null ? '' : String(row.plan_amount),
            setup_fee: row.setup_fee == null ? '' : String(row.setup_fee),
            discount_percent: row.discount_percent == null ? '' : String(row.discount_percent),
            tax_rate: row.tax_rate == null ? '18' : String(row.tax_rate),
            currency: row.currency || 'INR',
            status: row.status || 'draft',
            payment_date: row.payment_date ? String(row.payment_date).substring(0, 10) : '',
            payment_method: row.payment_method || '',
            provider_transaction_id: row.provider_transaction_id || '',
            payment_reference: row.payment_reference || '',
            notes: row.notes || ''
          });
        })
        .catch((err) => setError(err?.response?.data?.message || 'Failed to load invoice'))
        .finally(() => setLoadingForm(false));
    } else {
      setForm(emptyForm);
    }
  }, [isEditing, id, loadOptions]);

  const setField = (key: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  };

  const applyPlanPricing = (planId: string, cycle: string) => {
    if (isEditing || amountTouched) return;
    const plan = plans.find((p) => String(p.id) === String(planId));
    if (!plan) return;
    const price = parseFloat(plan[cyclePriceKey[cycle]] ?? '') || 0;
    if (price > 0) setField('plan_amount', String(price));
    const setupFee = parseFloat(plan.setupFee ?? '') || 0;
    if (setupFee > 0) setField('setup_fee', String(setupFee));
  };

  const handlePlanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const planId = e.target.value;
    setField('plan_id', planId);
    applyPlanPricing(planId, form.billing_cycle);
  };

  const handleCycleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cycle = e.target.value;
    setField('billing_cycle', cycle);
    if (form.plan_id) applyPlanPricing(form.plan_id, cycle);
  };

  const totals = useMemo(() => {
    const planAmount = parseFloat(form.plan_amount) || 0;
    const setupFee = parseFloat(form.setup_fee) || 0;
    const base = planAmount + setupFee;
    const discountPercent = Math.min(100, Math.max(0, parseFloat(form.discount_percent) || 0));
    const discountAmount = round2((base * discountPercent) / 100);
    const subtotal = round2(base - discountAmount);
    const taxRate = parseFloat(form.tax_rate) || 0;
    const taxAmount = round2((subtotal * taxRate) / 100);
    const totalAmount = round2(subtotal + taxAmount);
    return { base, discountAmount, subtotal, taxAmount, totalAmount };
  }, [form.plan_amount, form.setup_fee, form.discount_percent, form.tax_rate]);

  const showError = (msg: string) => {
    setError(msg);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    setError('');
    if (!form.tenant_id) { showError('Please select a tenant'); return; }
    if (!form.plan_id) { showError('Please select a subscription plan'); return; }
    if (!form.billing_period_start || !form.billing_period_end) { showError('Billing period start and end are required'); return; }

    let paymentDate = form.payment_date;
    if ((form.status === 'paid' || form.status === 'refunded') && !paymentDate) {
      paymentDate = new Date().toISOString().substring(0, 10);
    }

    const payload = {
      invoice_number: form.invoice_number?.trim() || null,
      tenant_id: Number(form.tenant_id),
      plan_id: Number(form.plan_id),
      billing_cycle: form.billing_cycle,
      billing_period_start: form.billing_period_start,
      billing_period_end: form.billing_period_end,
      plan_amount: parseFloat(form.plan_amount) || 0,
      setup_fee: parseFloat(form.setup_fee) || 0,
      discount_percent: parseFloat(form.discount_percent) || 0,
      tax_rate: parseFloat(form.tax_rate) || 0,
      currency: form.currency,
      status: form.status,
      payment_date: paymentDate || null,
      payment_method: form.payment_method || null,
      provider_transaction_id: form.provider_transaction_id || null,
      payment_reference: form.payment_reference || null,
      notes: form.notes || null
    };

    setSaving(true);
    try {
      if (isEditing && id) {
        await billingService.updateInvoice(Number(id), payload);
      } else {
        await billingService.createInvoice(payload);
      }
      navigate('/billing');
    } catch (err: any) {
      showError(err?.response?.data?.message || 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const currSymbol = useMemo(() => {
    switch (form.currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return '₹';
    }
  }, [form.currency]);

  const currLocale = useMemo(() => {
    switch (form.currency) {
      case 'USD': return 'en-US';
      case 'EUR': return 'de-DE';
      case 'GBP': return 'en-GB';
      default: return 'en-IN';
    }
  }, [form.currency]);

  const fmt = (n: number) => `${currSymbol}${Math.round(n).toLocaleString(currLocale)}`;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <button
            onClick={() => navigate('/billing')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Billing
          </button>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
            {isEditing ? 'Edit Invoice' : 'Create New Invoice'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isEditing
              ? 'Update the invoice details. Totals are always recalculated on the server.'
              : 'Issue a new SaaS subscription invoice for a customer tenant.'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={() => navigate('/billing')} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Receipt size={15} />}
            {isEditing ? 'Save Changes' : 'Create Invoice'}
          </Button>
        </div>
      </div>

      {loadingForm || loadingOptions ? (
        <div className="flex items-center justify-center py-24 bg-white border border-slate-100 rounded-2xl">
          <Loader2 size={28} className="animate-spin text-indigo-500" />
        </div>
      ) : (
        <>
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-2xl p-4 shadow-sm animate-shake">
              <AlertCircle size={20} className="text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-xs text-indigo-700 font-medium">
            <Receipt size={14} className="shrink-0" />
            Leave the invoice number blank to auto-generate it (INV-YYYY-NNNN). You can also type a custom number.
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-5">
            {/* Reference */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Invoice Number (optional)"
                placeholder="Auto-generated if blank"
                value={form.invoice_number}
                onChange={(e) => setField('invoice_number', e.target.value)}
                className="font-mono"
              />
              <Select
                label="Currency"
                value={form.currency}
                onChange={(e) => setField('currency', e.target.value)}
                options={CURRENCIES}
              />
            </div>

            {/* Tenant & Plan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Tenant (Institute)"
                required
                value={form.tenant_id}
                onChange={(e) => setField('tenant_id', e.target.value)}
                options={[{ value: '', label: 'Select tenant...' }, ...tenants.map((t) => ({ value: String(t.id), label: t.name }))]}
              />
              <Select
                label="Subscription Plan"
                required
                value={form.plan_id}
                onChange={handlePlanChange}
                options={[{ value: '', label: 'Select plan...' }, ...plans.map((p) => ({ value: String(p.id), label: p.name }))]}
              />
            </div>

            {/* Cycle & Period */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Billing Cycle"
                value={form.billing_cycle}
                onChange={handleCycleChange}
                options={BILLING_CYCLES}
              />
              <Input
                label="Period Start"
                type="date"
                required
                value={form.billing_period_start}
                onChange={(e) => setField('billing_period_start', e.target.value)}
              />
              <Input
                label="Period End"
                type="date"
                required
                value={form.billing_period_end}
                onChange={(e) => setField('billing_period_end', e.target.value)}
              />
            </div>

            {/* Amounts */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Input
                label="Plan Amount"
                type="number"
                min={0}
                step="0.01"
                required
                value={form.plan_amount}
                onChange={(e) => { setAmountTouched(true); setField('plan_amount', e.target.value); }}
              />
              <Input
                label="Setup Fee"
                type="number"
                min={0}
                step="0.01"
                value={form.setup_fee}
                onChange={(e) => setField('setup_fee', e.target.value)}
              />
              <Input
                label="Discount (%)"
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={form.discount_percent}
                onChange={(e) => setField('discount_percent', e.target.value)}
              />
              <Input
                label="Tax Rate (%)"
                type="number"
                min={0}
                step="0.01"
                value={form.tax_rate}
                onChange={(e) => setField('tax_rate', e.target.value)}
              />
            </div>

            {/* Live totals preview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 border border-slate-100 rounded-xl p-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Base Amount</span>
                <span className="text-lg font-extrabold text-slate-900">{fmt(totals.base)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Discount</span>
                <span className="text-lg font-extrabold text-red-500">- {fmt(totals.discountAmount)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Tax</span>
                <span className="text-lg font-extrabold text-slate-900">{fmt(totals.taxAmount)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total</span>
                <span className="text-lg font-extrabold text-indigo-600">{fmt(totals.totalAmount)}</span>
              </div>
            </div>

            {/* Status & Payment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Status"
                value={form.status}
                onChange={(e) => setField('status', e.target.value)}
                options={STATUSES}
              />
              <Input
                label="Payment Date"
                type="date"
                value={form.payment_date}
                onChange={(e) => setField('payment_date', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Payment Method"
                value={form.payment_method}
                onChange={(e) => setField('payment_method', e.target.value)}
                options={PAYMENT_METHODS}
              />
              <Input
                label="Provider Transaction ID"
                value={form.provider_transaction_id}
                onChange={(e) => setField('provider_transaction_id', e.target.value)}
              />
              <Input
                label="Payment Reference"
                value={form.payment_reference}
                onChange={(e) => setField('payment_reference', e.target.value)}
              />
            </div>

            <Input
              label="Notes"
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder="Optional internal notes for this invoice"
            />
          </div>
        </>
      )}
    </div>
  );
};