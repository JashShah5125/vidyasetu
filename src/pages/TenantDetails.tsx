import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import { formatDate } from '../data/mockData';

export const TenantDetails: React.FC<{ tenantId: string; onBack: () => void }> = ({ tenantId, onBack }) => {
  const { tenants, toggleTenantStatus } = useApp();
  const viewingTenant = tenants.find(t => t.id === tenantId);
  
  const [manageTab, setManageTab] = useState<'profile' | 'billing' | 'limits' | 'status' | 'payments'>('profile');

  if (!viewingTenant) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" onClick={onBack} style={{ gap: '6px' }}>
          <ArrowLeft size={16} /> Back to Tenants
        </Button>
        <div className="p-8 text-center bg-white border border-slate-200 rounded-xl">
          <h2 className="text-xl font-bold text-slate-700">Tenant not found</h2>
          <p className="text-sm text-slate-500 mt-2">The requested tenant ID does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Back button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={onBack} className="p-2 h-10 w-10 flex items-center justify-center rounded-xl">
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">Tenant Details</h2>
            <p className="text-sm text-slate-500 mt-1">Manage profile, limits, and billing for this workspace.</p>
          </div>
        </div>
        {/* We can hide Edit button for now or just trigger a toast, but let's leave it and maybe it's not strictly necessary to fix edit immediately if we just want to remove popup */}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
        {/* Top Info Banner */}
        <div className="flex items-center gap-4 bg-slate-50 border border-slate-150 p-5 rounded-xl shadow-inner">
          <div className="w-14 h-14 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xl shadow flex-shrink-0">
            {viewingTenant.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-lg font-bold text-slate-900 truncate">{viewingTenant.name}</h4>
            <div className="text-sm text-slate-500 font-mono mt-1">Tenant ID: {viewingTenant.id}</div>
          </div>
          <div className="flex items-center gap-3 select-none flex-shrink-0">
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${
              viewingTenant.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {viewingTenant.status}
            </span>
            <span className="text-[11px] text-slate-600 font-bold bg-white border border-slate-200 shadow-sm px-3 py-1.5 rounded-full uppercase tracking-wider">
              {viewingTenant.plan}
            </span>
          </div>
        </div>

        {/* Tabs Selector */}
        <div className="flex border-b border-slate-200 gap-2 flex-wrap">
          {[
            { id: 'profile', label: 'General & Admin' },
            { id: 'billing', label: 'Plan & Subscription' },
            { id: 'limits', label: 'Resource Limits' },
            { id: 'payments', label: 'Payment & Invoice History' },
            { id: 'status', label: 'SaaS Status Actions' }
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setManageTab(t.id as any)}
              className={`px-5 py-3 text-sm font-bold border-b-2 transition-all ${
                manageTab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-t-lg'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="min-h-[300px] pt-4">
          {manageTab === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
              <div className="space-y-4">
                <h5 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Institute Profile</h5>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-slate-500 font-semibold block mb-1">GSTIN Registration:</span>
                    <span className="font-semibold text-slate-800 text-base">{viewingTenant.gstNo || '27AAAAA0000A1Z5'}</span>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500 font-semibold block mb-1">Physical Address:</span>
                    <span className="font-semibold text-slate-800 block">{viewingTenant.address || '401, Western Express Highway, Mumbai'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Admin Account</h5>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-slate-500 font-semibold block mb-1">Admin Username:</span>
                    <span className="font-semibold text-slate-800 text-base">{viewingTenant.ownerName}</span>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500 font-semibold block mb-1">Admin Email Login:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-semibold text-slate-800 font-mono">{viewingTenant.email}</span>
                      {(!viewingTenant.defaultEmail || viewingTenant.defaultEmail === viewingTenant.email) && (
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-2 py-0.5 rounded shadow-sm">
                          ★ Default Login
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500 font-semibold block mb-1">Mobile Contact:</span>
                    <span className="font-semibold text-slate-800 font-mono">{viewingTenant.mobile}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {manageTab === 'billing' && (
            <div className="space-y-6 text-sm">
              <h5 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Billing Lifecycle &amp; Subscription Terms</h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 font-semibold block mb-1 uppercase tracking-wider">Plan Template</span>
                  <span className="text-lg font-bold text-slate-800">{viewingTenant.plan}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 font-semibold block mb-1 uppercase tracking-wider">Start Date</span>
                  <span className="text-lg font-bold text-slate-800">{formatDate(viewingTenant.startDate || '2026-04-15')}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 font-semibold block mb-1 uppercase tracking-wider">Expiration Date</span>
                  <span className="text-lg font-bold text-slate-800">{formatDate(viewingTenant.renewalDate)}</span>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 flex items-start gap-3">
                <span className="text-xl">ℹ</span>
                <p>Terms and renewal actions can be configured on the <strong>Tenant Subscriptions</strong> tab under Subscription Management in the sidebar.</p>
              </div>
            </div>
          )}

          {manageTab === 'limits' && (
            <div className="space-y-6">
              <h5 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Scalability Boundaries &amp; Resource Allotments</h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5 text-center">
                  <span className="text-xs text-slate-500 font-bold block uppercase tracking-widest mb-2">Max Branches</span>
                  <span className="text-3xl font-black text-slate-800 block">{viewingTenant.maxBranches || '5'}</span>
                </div>
                <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5 text-center">
                  <span className="text-xs text-slate-500 font-bold block uppercase tracking-widest mb-2">Max Students</span>
                  <span className="text-3xl font-black text-slate-800 block">{viewingTenant.maxStudents || '1000'}</span>
                </div>
                <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5 text-center">
                  <span className="text-xs text-slate-500 font-bold block uppercase tracking-widest mb-2">Cloud Storage</span>
                  <span className="text-3xl font-black text-slate-800 block">{viewingTenant.maxStorage || '20 GB'}</span>
                </div>
                <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5 text-center">
                  <span className="text-xs text-slate-500 font-bold block uppercase tracking-widest mb-2">Max File Size</span>
                  <span className="text-3xl font-black text-slate-800 block">{viewingTenant.maxFileSize || '20 MB'}</span>
                </div>
              </div>
            </div>
          )}

          {manageTab === 'payments' && (
            <div className="space-y-6">
              <h5 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Payment &amp; Invoice History</h5>
              <div className="overflow-hidden border border-slate-200 rounded-xl shadow-sm">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase text-xs tracking-wider">
                      <th className="px-5 py-4">Invoice ID</th>
                      <th className="px-5 py-4">Billing Cycle</th>
                      <th className="px-5 py-4">Paid Date</th>
                      <th className="px-5 py-4">Amount Paid</th>
                      <th className="px-5 py-4">Gateway Reference</th>
                      <th className="px-5 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                    {[
                      { id: 'INV-2026-081', plan: viewingTenant.plan, date: formatDate(viewingTenant.startDate || '2026-04-15'), amt: '₹15,000 + GST', ref: 'pay_RZP98425102', status: 'Settled' },
                      { id: 'INV-2026-015', plan: viewingTenant.plan, date: '15-01-2026', amt: '₹15,000 + GST', ref: 'pay_RZP88125412', status: 'Settled' }
                    ].map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4 font-mono font-bold text-slate-800">{inv.id}</td>
                        <td className="px-5 py-4 font-semibold">{inv.plan}</td>
                        <td className="px-5 py-4 font-mono text-slate-500">{inv.date}</td>
                        <td className="px-5 py-4 font-bold text-emerald-700">{inv.amt}</td>
                        <td className="px-5 py-4 font-mono text-slate-400">{inv.ref}</td>
                        <td className="px-5 py-4">
                          <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {manageTab === 'status' && (
            <div className="space-y-6">
              <h5 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Active Status Suspensions / Activations</h5>
              <div className="flex items-center gap-6 bg-white border border-slate-200 shadow-sm rounded-xl p-6">
                <div className="flex-1">
                  <h6 className="text-base font-bold text-slate-900">Current Access Status: <span className={viewingTenant.status === 'Active' ? 'text-emerald-600' : 'text-red-600'}>{viewingTenant.status}</span></h6>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    Suspending a tenant prevents their staff, teachers, and students from accessing their portals immediately. They will receive a "Service Suspended" screen upon login.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleTenantStatus(viewingTenant.id)}
                  className={`inline-flex items-center gap-2 text-sm font-bold px-6 py-3 border rounded-xl cursor-pointer transition-all shadow-sm ${
                    viewingTenant.status === 'Active'
                      ? 'border-red-200 text-red-700 bg-red-50 hover:bg-red-100'
                      : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                  }`}
                >
                  {viewingTenant.status === 'Active' ? 'Suspend Access' : 'Activate Access'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
