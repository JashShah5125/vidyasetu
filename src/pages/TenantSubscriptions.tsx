import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Plus, Edit, Eye, Trash, AlertTriangle } from 'lucide-react';
import type { TenantSubscription, SubscriptionPlan } from '../data/mockData';
import { formatDate } from '../data/mockData';

// ─── Status badge colors ────────────────────────────────────────────────────
const statusColors: Record<TenantSubscription['status'], string> = {
  Active: 'bg-emerald-50 text-emerald-700',
  Trial: 'bg-blue-50 text-blue-700',
  Expired: 'bg-red-50 text-red-600',
  Cancelled: 'bg-slate-100 text-slate-500',
  Pending: 'bg-amber-50 text-amber-700'
};

export const TenantSubscriptions: React.FC = () => {
  const { plans, tenants, tenantSubscriptions, addTenantSubscription, updateTenantSubscription, deleteTenantSubscription } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingItem, setViewingItem] = useState<TenantSubscription | null>(null);
  const [showView, setShowView] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortBy, setSortBy] = useState('tenantName');

  // Form state – Tenant
  const [tenantId, setTenantId] = useState('');
  // Plan
  const [planId, setPlanId] = useState('');
  // Subscription period
  const [startDate, setStartDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [billingCycle, setBillingCycle] = useState<TenantSubscription['billingCycle']>('Yearly');
  const [status, setStatus] = useState<TenantSubscription['status']>('Active');
  // Commercial
  const [discount, setDiscount] = useState('');
  const [finalPrice, setFinalPrice] = useState('');
  const [tax, setTax] = useState('18');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  // Overrides
  const [ovMaxBranches, setOvMaxBranches] = useState('');
  const [ovMaxStaff, setOvMaxStaff] = useState('');
  const [ovMaxStudents, setOvMaxStudents] = useState('');
  const [ovMaxParents, setOvMaxParents] = useState('');
  const [ovMaxTeachers, setOvMaxTeachers] = useState('');
  const [ovMaxStorage, setOvMaxStorage] = useState('');
  const [ovMaxFileSize, setOvMaxFileSize] = useState('');
  const [ovSms, setOvSms] = useState('');
  const [ovWhatsapp, setOvWhatsapp] = useState('');
  const [ovApiCalls, setOvApiCalls] = useState('');

  const activePlans = plans.filter(p => p.status === 'Active');

  const visiblePlans = activePlans.filter(p => {
    if (!tenantId) return !p.visibleTo || p.visibleTo.includes('All') || p.visibleTo.length === 0;
    const isPublic = !p.visibleTo || p.visibleTo.includes('All') || p.visibleTo.length === 0;
    const isSpecific = p.visibleTo && p.visibleTo.includes(tenantId);
    return isPublic || isSpecific;
  });

  // Auto-populate final price when plan or discount changes
  const selectedPlan: SubscriptionPlan | undefined = plans.find(p => p.id === planId);

  const autoFinalPrice = () => {
    if (!selectedPlan) return '';
    const base = selectedPlan.price;
    const d = parseFloat(discount) || 0;
    return Math.round(base - (base * d / 100)).toString();
  };

  const resetForm = () => {
    setTenantId(''); setPlanId(''); setStartDate(''); setExpiryDate('');
    setBillingCycle('Yearly'); setStatus('Active');
    setDiscount(''); setFinalPrice(''); setTax('18'); setInvoiceNumber('');
    setOvMaxBranches(''); setOvMaxStaff(''); setOvMaxStudents('');
    setOvMaxParents(''); setOvMaxTeachers(''); setOvMaxStorage('');
    setOvMaxFileSize(''); setOvSms(''); setOvWhatsapp(''); setOvApiCalls('');
  };

  const populateForm = (sub: TenantSubscription) => {
    setTenantId(sub.tenantId); setPlanId(sub.planId);
    setStartDate(sub.startDate); setExpiryDate(sub.expiryDate);
    setBillingCycle(sub.billingCycle); setStatus(sub.status);
    setDiscount(sub.discount.toString()); setFinalPrice(sub.finalPrice.toString());
    setTax(sub.tax.toString()); setInvoiceNumber(sub.invoiceNumber);
    setOvMaxBranches(sub.overrides.maxBranches?.toString() ?? '');
    setOvMaxStaff(sub.overrides.maxStaffUsers?.toString() ?? '');
    setOvMaxStudents(sub.overrides.maxStudents?.toString() ?? '');
    setOvMaxParents(sub.overrides.maxParents?.toString() ?? '');
    setOvMaxTeachers(sub.overrides.maxTeachers?.toString() ?? '');
    setOvMaxStorage(sub.overrides.maxStorage ?? '');
    setOvMaxFileSize(sub.overrides.maxFileSize ?? '');
    setOvSms(sub.overrides.maxSmsCredits?.toString() ?? '');
    setOvWhatsapp(sub.overrides.maxWhatsappMsgs?.toString() ?? '');
    setOvApiCalls(sub.overrides.maxApiCalls?.toString() ?? '');
  };

  const handleOpenAdd = () => {
    setEditingId(null); resetForm(); setShowModal(true);
  };

  const handleOpenEdit = (sub: TenantSubscription) => {
    setEditingId(sub.id); populateForm(sub); setShowView(false); setShowModal(true);
  };

  const buildOverrides = () => {
    const ov: TenantSubscription['overrides'] = {};
    if (ovMaxBranches) ov.maxBranches = parseInt(ovMaxBranches);
    if (ovMaxStaff) ov.maxStaffUsers = parseInt(ovMaxStaff);
    if (ovMaxStudents) ov.maxStudents = parseInt(ovMaxStudents);
    if (ovMaxParents) ov.maxParents = parseInt(ovMaxParents);
    if (ovMaxTeachers) ov.maxTeachers = parseInt(ovMaxTeachers);
    if (ovMaxStorage) ov.maxStorage = ovMaxStorage;
    if (ovMaxFileSize) ov.maxFileSize = ovMaxFileSize;
    if (ovSms) ov.maxSmsCredits = parseInt(ovSms);
    if (ovWhatsapp) ov.maxWhatsappMsgs = parseInt(ovWhatsapp);
    if (ovApiCalls) ov.maxApiCalls = parseInt(ovApiCalls);
    return ov;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !planId || !startDate || !expiryDate) return;

    const tenant = tenants.find(t => t.id === tenantId);
    const plan = plans.find(p => p.id === planId);
    if (!tenant || !plan) return;

    const payload: Omit<TenantSubscription, 'id'> = {
      tenantId, tenantName: tenant.name,
      planId, planName: plan.name,
      startDate, expiryDate, billingCycle, status,
      discount: parseFloat(discount) || 0,
      finalPrice: parseFloat(finalPrice || autoFinalPrice()) || 0,
      tax: parseFloat(tax) || 0,
      invoiceNumber,
      overrides: buildOverrides()
    };

    if (editingId) {
      updateTenantSubscription(editingId, payload);
      setSuccessMsg(`Subscription for "${tenant.name}" updated.`);
    } else {
      addTenantSubscription(payload);
      setSuccessMsg(`Subscription for "${tenant.name}" created on plan "${plan.name}".`);
    }

    setShowModal(false);
    resetForm();
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Cancel subscription for "${name}"? The tenant will lose access upon expiry.`)) {
      deleteTenantSubscription(id);
      setSuccessMsg(`Subscription for "${name}" cancelled.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  // ─── Effective limits display ────────────────────────────────────────────
  const effectiveLimit = (planVal: number, overrideVal: number | undefined) => {
    if (overrideVal !== undefined) return overrideVal === -1 ? 'Unlimited*' : `${overrideVal.toLocaleString()}*`;
    return planVal === -1 ? 'Unlimited' : planVal.toLocaleString();
  };



  const filteredAndSortedSubs = tenantSubscriptions
    .filter(sub => {
      const matchSearch = sub.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sub.tenantId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sub.planName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchPlan = filterPlan === 'All' || sub.planName === filterPlan;
      const matchStatus = filterStatus === 'All' || sub.status === filterStatus;
      return matchSearch && matchPlan && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'tenantName') return a.tenantName.localeCompare(b.tenantName);
      if (sortBy === 'planName') return a.planName.localeCompare(b.planName);
      if (sortBy === 'startDate') return a.startDate.localeCompare(b.startDate);
      return 0;
    });

  const handleExportCSV = () => {
    if (filteredAndSortedSubs.length === 0) return;
    const headers = Object.keys(filteredAndSortedSubs[0]);
    const csvRows = [];
    csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));
    
    for (const row of filteredAndSortedSubs) {
      const values = headers.map(header => {
        const val = row[header as keyof typeof row];
        const strVal = typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? '');
        const escaped = strVal.replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
    
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "subscriptions_registry.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm">
          ✓ {successMsg}
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Tenant Subscription manager</h2>
          <p className="text-sm text-slate-500 mt-1">Assign plans to tenants, adjust billing cycle parameters, and override limits.</p>
        </div>
        <Button variant="primary" style={{ gap: '6px' }} onClick={handleOpenAdd}>
          <Plus size={16} /> Assign Plan to Tenant
        </Button>
      </div>

      {/* Architecture note */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 flex gap-3">
        <span className="text-blue-500 mt-0.5 flex-shrink-0">ℹ</span>
        <div>
          <strong>Architecture:</strong> A <em>Plan</em> is the template. A <em>Subscription</em> is a tenant's purchase of that plan.
          Override limits here allow per-customer negotiated terms without changing the plan for everyone.
          Fields marked <strong>*</strong> in details indicate an active override.
        </div>
      </div>

      {/* Search, Filter, Sort Controls & Export CSV */}
      <div className="flex flex-col md:flex-row gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm items-end justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 flex-1 w-full items-end">
          <Input 
            placeholder="Search by ID, name, plan..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
          <Select 
            label="Plan Template" 
            value={filterPlan} 
            onChange={(e) => setFilterPlan(e.target.value)} 
            options={[
              { value: 'All', label: 'All Plans' },
              ...plans.map(p => ({ value: p.name, label: p.name }))
            ]} 
          />
          <Select 
            label="Status" 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)} 
            options={[
              { value: 'All', label: 'All Status' },
              { value: 'Active', label: 'Active' },
              { value: 'Expired', label: 'Expired' }
            ]} 
          />
          <Select 
            label="Sort By" 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)} 
            options={[
              { value: 'tenantName', label: 'Tenant Name' },
              { value: 'planName', label: 'Plan Name' },
              { value: 'startDate', label: 'Start Date' }
            ]} 
          />
        </div>
        <Button variant="secondary" onClick={handleExportCSV}>Export CSV</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Active Subscriptions</CardTitle></CardHeader>
        <Table headers={['Tenant', 'Plan', 'Billing Cycle', 'Start Date', 'Expiry Date', 'Price', 'Status', 'Payment Status', 'Overrides', 'Actions']}>
          {(() => {
            const itemsPerPage = 3;
            const paginatedSubs = filteredAndSortedSubs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
            
            if (paginatedSubs.length === 0 && filteredAndSortedSubs.length > 0 && currentPage > 1) {
              setCurrentPage(currentPage - 1);
            }
            
            return (
              <>
                {paginatedSubs.map((sub, idx) => {
                  const plan = plans.find(p => p.id === sub.planId);
                  const hasOverrides = Object.keys(sub.overrides).length > 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-800">{sub.tenantName}</div>
                        <div className="text-xs text-slate-400 font-mono">{sub.tenantId}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-700 text-sm">{sub.planName}</div>
                        {plan && <div className="text-xs text-slate-400">{plan.code}</div>}
                      </td>
                      <td className="px-4 py-4"><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">{sub.billingCycle}</span></td>
                      <td className="px-4 py-4 font-mono text-xs whitespace-nowrap text-slate-600">{formatDate(sub.startDate)}</td>
                      <td className="px-4 py-4 font-mono text-xs whitespace-nowrap text-slate-600">{formatDate(sub.expiryDate)}</td>
                      <td className="px-4 py-4 font-semibold text-slate-800 whitespace-nowrap text-sm">
                        {sub.finalPrice === 0
                          ? <span className="text-emerald-600 font-bold">Free</span>
                          : `₹${sub.finalPrice.toLocaleString()}`}
                        {sub.discount > 0 && <span className="text-xs text-emerald-600 ml-1">({sub.discount}% off)</span>}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[sub.status]}`}>{sub.status}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${
                          sub.finalPrice === 0
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : sub.status === 'Expired'
                            ? 'bg-red-50 text-red-650 border-red-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {sub.finalPrice === 0 ? 'Exempt' : sub.status === 'Expired' ? 'Unpaid' : 'Paid'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {hasOverrides
                          ? <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full"><AlertTriangle size={10} /> Custom</span>
                          : <span className="text-xs text-slate-400">Plan defaults</span>}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-1.5 flex-wrap">
                          <button onClick={() => { setViewingItem(sub); setShowView(true); }}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1.5 border border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors">
                            <Eye size={13} /> View
                          </button>
                          <button onClick={() => handleOpenEdit(sub)}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1.5 border border-slate-200 text-blue-600 bg-blue-50/50 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors">
                            <Edit size={13} /> Edit
                          </button>
                          <button onClick={() => handleDelete(sub.id, sub.tenantName)}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1.5 border border-red-100 text-red-600 bg-red-50/50 hover:bg-red-50 rounded-lg cursor-pointer transition-colors">
                            <Trash size={13} /> Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredAndSortedSubs.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-slate-400 text-sm">
                      No subscriptions match the selected criteria.
                    </td>
                  </tr>
                )}
              </>
            );
          })()}
        </Table>
        {(() => {
          const itemsPerPage = 3;
          const totalPages = Math.ceil(filteredAndSortedSubs.length / itemsPerPage);
          if (totalPages <= 1) return null;
          return (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 border-t border-slate-200 p-4 text-xs font-semibold text-slate-500 shadow-sm select-none">
              <div>
                Showing <span className="text-slate-800 font-bold">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredAndSortedSubs.length)}</span> to <span className="text-slate-800 font-bold">{Math.min(currentPage * itemsPerPage, filteredAndSortedSubs.length)}</span> of <span className="text-slate-855 font-bold">{filteredAndSortedSubs.length}</span> subscriptions
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                      currentPage === i + 1
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          );
        })()}
      </Card>

      {/* ── Assign / Edit Subscription Modal ── */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Tenant Subscription' : 'Assign Plan to Tenant'} size="3xl">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Tenant & Plan */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-1.5 select-none">01. Tenant &amp; Plan</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="Tenant" required value={tenantId} onChange={e => setTenantId(e.target.value)}
                options={[
                  { value: '', label: 'Select Tenant' },
                  ...tenants.map(t => ({ value: t.id, label: `${t.name} (${t.id})` }))
                ]} />
              <Select label="Subscription Plan" required value={planId} onChange={e => { setPlanId(e.target.value); }}
                options={[
                  { value: '', label: 'Select Plan' },
                  ...visiblePlans.map(p => ({ value: p.id, label: `${p.name} — ${p.currency} ${p.price === 0 ? 'Free' : p.price.toLocaleString()} / ${p.billingType}` }))
                ]} />
            </div>
            {selectedPlan && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div><span className="text-blue-400 font-bold block">Plan Code</span><span className="font-mono font-bold text-blue-800">{selectedPlan.code}</span></div>
                <div><span className="text-blue-400 font-bold block">Price</span><span className="font-bold text-blue-800">{selectedPlan.currency} {selectedPlan.price.toLocaleString()}</span></div>
                <div><span className="text-blue-400 font-bold block">Trial Days</span><span className="font-bold text-blue-800">{selectedPlan.trialDays}d</span></div>
                <div><span className="text-blue-400 font-bold block">Auto Renewal</span><span className="font-bold text-blue-800">{selectedPlan.autoRenewal ? 'Yes' : 'No'}</span></div>
              </div>
            )}
          </div>

          {/* Subscription period */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-1.5 select-none">02. Subscription Period</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Start Date" type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} />
              <Input label="Expiry Date" type="date" required value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="Billing Cycle" value={billingCycle} onChange={e => setBillingCycle(e.target.value as typeof billingCycle)}
                options={[
                  { value: 'Monthly', label: 'Monthly' }, { value: 'Quarterly', label: 'Quarterly' },
                  { value: 'Yearly', label: 'Yearly' }, { value: 'Lifetime', label: 'Lifetime' }
                ]} />
              <Select label="Status" value={status} onChange={e => setStatus(e.target.value as typeof status)}
                options={[
                  { value: 'Active', label: 'Active' }, { value: 'Trial', label: 'Trial' },
                  { value: 'Pending', label: 'Pending' }, { value: 'Expired', label: 'Expired' },
                  { value: 'Cancelled', label: 'Cancelled' }
                ]} />
            </div>
          </div>

          {/* Commercial */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-1.5 select-none">03. Commercial</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input label="Discount %" type="number" min={0} max={100} placeholder="e.g. 10"
                  value={discount} onChange={e => { setDiscount(e.target.value); setFinalPrice(autoFinalPrice()); }} />
              </div>
              <div>
                <Input label="Final Price" type="number" placeholder="Auto-calculated or override"
                  value={finalPrice || autoFinalPrice()} onChange={e => setFinalPrice(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Tax %" type="number" placeholder="e.g. 18" value={tax} onChange={e => setTax(e.target.value)} />
              <Input label="Invoice Number" placeholder="e.g. INV-2026-042" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
            </div>
          </div>

          {/* Override limits */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-1.5 select-none">04. Override Limits <span className="text-slate-400 font-normal normal-case tracking-normal">(leave blank to use plan defaults)</span></h4>
            {selectedPlan && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <strong>Plan defaults:</strong> Branches {selectedPlan.maxBranches === -1 ? 'Unlimited' : selectedPlan.maxBranches} · Students {selectedPlan.maxStudents === -1 ? 'Unlimited' : selectedPlan.maxStudents} · Staff {selectedPlan.maxStaffUsers === -1 ? 'Unlimited' : selectedPlan.maxStaffUsers}
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Input label="Max Branches" type="number" placeholder="Plan default" value={ovMaxBranches} onChange={e => setOvMaxBranches(e.target.value)} />
              <Input label="Max Staff Users" type="number" placeholder="Plan default" value={ovMaxStaff} onChange={e => setOvMaxStaff(e.target.value)} />
              <Input label="Max Students" type="number" placeholder="Plan default" value={ovMaxStudents} onChange={e => setOvMaxStudents(e.target.value)} />
              <Input label="Max Parents" type="number" placeholder="Plan default" value={ovMaxParents} onChange={e => setOvMaxParents(e.target.value)} />
              <Input label="Max Teachers" type="number" placeholder="Plan default" value={ovMaxTeachers} onChange={e => setOvMaxTeachers(e.target.value)} />
              <Select label="Max Storage" value={ovMaxStorage} onChange={e => setOvMaxStorage(e.target.value)}
                options={[{ value: '', label: 'Plan default' }, { value: '5 GB', label: '5 GB' }, { value: '20 GB', label: '20 GB' }, { value: '100 GB', label: '100 GB' }, { value: '500 GB', label: '500 GB' }]} />
              <Select label="Max File Size" value={ovMaxFileSize} onChange={e => setOvMaxFileSize(e.target.value)}
                options={[{ value: '', label: 'Plan default' }, { value: '5 MB', label: '5 MB' }, { value: '20 MB', label: '20 MB' }, { value: '50 MB', label: '50 MB' }, { value: '200 MB', label: '200 MB' }]} />
              <Input label="Max SMS Credits" type="number" placeholder="Plan default" value={ovSms} onChange={e => setOvSms(e.target.value)} />
              <Input label="Max WhatsApp Msgs" type="number" placeholder="Plan default" value={ovWhatsapp} onChange={e => setOvWhatsapp(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">{editingId ? 'Save Changes' : 'Create Subscription'}</Button>
          </div>
        </form>
      </Modal>

      {/* ── View Details Modal ── */}
      {showView && viewingItem && (
        <Modal isOpen={showView} onClose={() => { setShowView(false); setViewingItem(null); }}
          title="Subscription Details" size="2xl">
          <div className="space-y-5">
            {/* Header card */}
            <div className="flex items-center gap-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white p-4 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-white/10 font-bold flex items-center justify-center text-lg uppercase">
                {viewingItem.tenantName.substring(0, 2)}
              </div>
              <div>
                <h4 className="font-bold text-base">{viewingItem.tenantName}</h4>
                <div className="text-xs opacity-60 font-mono mt-0.5">{viewingItem.tenantId}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-lg font-bold">{viewingItem.planName}</div>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold mt-1 ${statusColors[viewingItem.status]}`}>{viewingItem.status}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {[
                { label: 'Start Date', val: formatDate(viewingItem.startDate) },
                { label: 'Expiry Date', val: formatDate(viewingItem.expiryDate) },
                { label: 'Billing Cycle', val: viewingItem.billingCycle },
                { label: 'Invoice', val: viewingItem.invoiceNumber || '—' },
              ].map(({ label, val }) => (
                <div key={label} className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">{label}</span>
                  <span className="font-mono font-bold text-slate-800 block mt-0.5">{val}</span>
                </div>
              ))}
            </div>

            {/* Commercial */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mb-3">Commercial</p>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-center">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Discount</span>
                  <span className="font-bold text-emerald-600 text-sm">{viewingItem.discount}%</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-center">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Final Price</span>
                  <span className="font-bold text-slate-800 text-sm">₹{viewingItem.finalPrice.toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-center">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">GST %</span>
                  <span className="font-bold text-slate-800 text-sm">{viewingItem.tax}%</span>
                </div>
              </div>
            </div>

            {/* Effective limits with overrides */}
            {(() => {
              const plan = plans.find(p => p.id === viewingItem.planId);
              if (!plan) return null;
              return (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mb-3">
                    Effective Limits <span className="text-amber-600 font-bold">(*overridden)</span>
                  </p>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {[
                      { label: 'Branches', p: plan.maxBranches, o: viewingItem.overrides.maxBranches },
                      { label: 'Staff Users', p: plan.maxStaffUsers, o: viewingItem.overrides.maxStaffUsers },
                      { label: 'Students', p: plan.maxStudents, o: viewingItem.overrides.maxStudents },
                      { label: 'Parents', p: plan.maxParents, o: viewingItem.overrides.maxParents },
                      { label: 'Teachers', p: plan.maxTeachers, o: viewingItem.overrides.maxTeachers },
                    ].map(({ label, p, o }) => (
                      <div key={label} className={`rounded-lg p-2.5 text-center border ${o !== undefined ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                        <span className="text-[9px] font-bold block uppercase text-slate-400">{label}</span>
                        <span className={`text-sm font-bold block mt-0.5 ${o !== undefined ? 'text-amber-700' : 'text-slate-800'}`}>
                          {effectiveLimit(p, o)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="secondary" onClick={() => { setShowView(false); setViewingItem(null); }}>Close</Button>
              <Button variant="primary" style={{ gap: '6px' }} onClick={() => handleOpenEdit(viewingItem)}>
                <Edit size={14} /> Edit Subscription
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
