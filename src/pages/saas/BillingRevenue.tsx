import React, { useState } from 'react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

interface Invoice {
  id: string;
  tenantName: string;
  amount: number;
  tax: number;
  date: string;
  dueDate: string;
  status: 'Paid' | 'Unpaid' | 'Overdue' | 'Refunded';
}

export const BillingRevenue: React.FC = () => {
  const invoices: Invoice[] = [
    { id: 'INV-2026-001', tenantName: 'Apex IIT Academy', amount: 162000, tax: 29160, date: '2026-01-15', dueDate: '2026-02-15', status: 'Paid' },
    { id: 'INV-2026-002', tenantName: 'Bright Future Coaching', amount: 15000, tax: 2700, date: '2026-07-01', dueDate: '2026-07-15', status: 'Paid' },
    { id: 'INV-2026-003', tenantName: 'Vanguard Global', amount: 300000, tax: 54000, date: '2026-08-01', dueDate: '2026-08-15', status: 'Unpaid' },
    { id: 'INV-2026-004', tenantName: 'Zenith Career Hub', amount: 45000, tax: 8100, date: '2026-06-10', dueDate: '2026-07-10', status: 'Overdue' }
  ];

  const outstandingAmount = invoices
    .filter(inv => inv.status === 'Unpaid' || inv.status === 'Overdue')
    .reduce((sum, inv) => sum + inv.amount + inv.tax, 0);

  const outstandingCount = invoices
    .filter(inv => inv.status === 'Unpaid' || inv.status === 'Overdue')
    .length;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterTenant, setFilterTenant] = useState('All');

  const uniqueTenants = Array.from(new Set(invoices.map(inv => inv.tenantName)));

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || inv.status === filterStatus;
    const matchesTenant = filterTenant === 'All' || inv.tenantName === filterTenant;
    return matchesSearch && matchesStatus && matchesTenant;
  });

  const statusColors = {
    Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Unpaid: 'bg-amber-50 text-amber-700 border-amber-200',
    Overdue: 'bg-red-50 text-red-700 border-red-200',
    Refunded: 'bg-slate-100 text-slate-500 border-slate-300'
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">Billing &amp; SaaS Revenue</h2>
        <p className="text-sm text-slate-500 mt-1">
          Monitor your subscription MRR/ARR charts, issue invoices, configure taxes, and process payment transactions.
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Monthly Recurring Revenue (MRR)</span>
          <span className="text-2xl font-extrabold text-slate-900 block mt-1">₹4,25,000</span>
          <span className="text-xs text-emerald-600 font-semibold block mt-1">↑ 14.5% month over month</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Annual Recurring Revenue (ARR)</span>
          <span className="text-2xl font-extrabold text-slate-900 block mt-1">₹51,00,000</span>
          <span className="text-xs text-emerald-600 font-semibold block mt-1">On-track for Q3 goal</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Outstanding Payments</span>
          <span className="text-2xl font-extrabold text-amber-600 block mt-1">₹{outstandingAmount.toLocaleString()}</span>
          <span className="text-xs text-amber-500 font-semibold block mt-1">{outstandingCount} invoices pending follow-up</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Failed Payments (30d)</span>
          <span className="text-2xl font-extrabold text-slate-900 block mt-1">0</span>
          <span className="text-xs text-emerald-600 font-semibold block mt-1">100% checkout conversion rate</span>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm items-end">
        <Input label="Search" placeholder="Search by invoice ID or tenant name..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
        <Select 
          label="Tenant Name" 
          value={filterTenant} 
          onChange={(e) => setFilterTenant(e.target.value)} 
          options={[
            { value: 'All', label: 'All Tenants' },
            ...uniqueTenants.map(t => ({ value: t, label: t }))
          ]} 
        />
        <Select 
          label="Payment Status" 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)} 
          options={[
            { value: 'All', label: 'All Statuses' },
            { value: 'Paid', label: 'Paid' },
            { value: 'Unpaid', label: 'Unpaid' },
            { value: 'Overdue', label: 'Overdue' },
            { value: 'Refunded', label: 'Refunded' }
          ]} 
        />
      </div>

      {/* Invoices register */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-sm">Invoice Management Desk</h3>
        </div>

        <div className="overflow-x-auto">
          {filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No invoices found matching the filters.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Invoice ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Tenant Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Billing Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Due Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Base Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Estimated GST</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Total Payable</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-600">{inv.id}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{inv.tenantName}</td>
                    <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">{inv.date}</td>
                    <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">{inv.dueDate}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800">₹{inv.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-500">₹{inv.tax.toLocaleString()}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">₹{(inv.amount + inv.tax).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusColors[inv.status]}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
