import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { billingService } from '../../services/billingService';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Pagination } from '../../components/ui/Pagination';
import { Table } from '../../components/ui/Table';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Download, TrendingUp, Banknote, CheckCircle, AlertOctagon,
  Layers, Loader2, Wallet, FileText, Calendar, RotateCcw, Search, Filter
} from 'lucide-react';

interface Invoice {
  id: string;
  tenantName: string;
  planName: string;
  billingCycle: string;
  amount: number;
  tax: number;
  total: number;
  date: string;
  dueDate: string;
  paymentMethod: string;
  status: 'Paid' | 'Unpaid' | 'Overdue' | 'Refunded' | 'Draft';
}

interface Summary {
  mrr: number;
  arr: number;
  total_revenue: number;
  collected_revenue: number;
  outstanding: number;
  net_revenue?: number;
  total_tax?: number;
  refunded?: number;
  paid_count?: number;
  outstanding_count?: number;
  available_years?: number[];
  recent_payments?: any[];
}

const formatINR = (n: number) => {
  const val = Math.round(n || 0);
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2).replace(/\.00$/, '')}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2).replace(/\.00$/, '')}L`;
  return `₹${val.toLocaleString('en-IN')}`;
};

export const BillingRevenue: React.FC = () => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [byPlan, setByPlan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Period Filters state (hidden by default)
  const [showPeriodFilter, setShowPeriodFilter] = useState(false);
  const [periodYear, setPeriodYear] = useState<string>('all');
  const [periodStartDate, setPeriodStartDate] = useState<string>('');
  const [periodEndDate, setPeriodEndDate] = useState<string>('');

  // Table Register Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterTenant, setFilterTenant] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 8;

  const isPeriodFilterActive = useMemo(
    () => periodYear !== 'all' || Boolean(periodStartDate) || Boolean(periodEndDate),
    [periodYear, periodStartDate, periodEndDate]
  );

  const uniqueTenants = useMemo(
    () => Array.from(new Set(invoices.map(inv => inv.tenantName))),
    [invoices]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    const yrParam = periodYear === 'all' ? undefined : periodYear;
    const startParam = periodStartDate || undefined;
    const endParam = periodEndDate || undefined;

    try {
      const [summaryRes, trendRes, planRes, invoiceRes] = await Promise.all([
        billingService.getBillingSummary(yrParam, undefined, startParam, endParam),
        billingService.getRevenueTrend(yrParam, startParam, endParam),
        billingService.getRevenueByPlan(startParam, endParam),
        billingService.getInvoices(currentPage, itemsPerPage, searchTerm, filterStatus, filterTenant, startParam, endParam)
      ]);

      if (summaryRes?.data) setSummary(summaryRes.data);
      if (trendRes?.data?.trend) setTrend(trendRes.data.trend);
      if (planRes?.data) setByPlan(planRes.data);
      if (invoiceRes?.data) setInvoices(Array.isArray(invoiceRes.data) ? invoiceRes.data : []);
      if (invoiceRes?.pagination) {
        setTotalPages(Math.max(1, Math.ceil(invoiceRes.pagination.total / itemsPerPage)));
        setTotalItems(invoiceRes.pagination.total);
      }
    } catch (err) {
      console.error('Failed to load billing metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [periodYear, periodStartDate, periodEndDate, currentPage, searchTerm, filterStatus, filterTenant]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClearPeriodFilters = () => {
    setPeriodYear('all');
    setPeriodStartDate('');
    setPeriodEndDate('');
    setCurrentPage(1);
  };

  const handleClearTableFilters = () => {
    setSearchTerm('');
    setFilterStatus('All');
    setFilterTenant('All');
    setCurrentPage(1);
  };

  const statusColors: Record<string, string> = {
    Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Unpaid: 'bg-amber-50 text-amber-700 border-amber-200',
    Overdue: 'bg-red-50 text-red-700 border-red-200',
    Refunded: 'bg-slate-100 text-slate-500 border-slate-300',
    Draft: 'bg-slate-50 text-slate-500 border-slate-200'
  };

  const handleExportCSV = () => {
    if (invoices.length === 0) return;
    const headers = ['Invoice No', 'Tenant', 'Plan', 'Cycle', 'Start Date', 'Due Date', 'Base (INR)', 'Tax (INR)', 'Total (INR)', 'Method', 'Status'];
    const rows = invoices.map(inv => [
      inv.id, inv.tenantName, inv.planName, inv.billingCycle, inv.date, inv.dueDate,
      inv.amount, inv.tax, inv.total, inv.paymentMethod, inv.status
    ]);
    const csv = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = 'billing_invoices_report.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const planChartData = useMemo(
    () => byPlan.map(p => ({ name: p.plan_name, collected: p.collected, outstanding: p.outstanding })),
    [byPlan]
  );

  const yoyDelta = useMemo(() => {
    if (trend.length < 2) return null;
    const paidRaw = trend.filter(t => t.raw > 0);
    if (paidRaw.length < 2) return null;
    const last = Number(paidRaw[paidRaw.length - 1].raw);
    const prev = Number(paidRaw[paidRaw.length - 2].raw);
    if (!prev) return null;
    return ((last - prev) / prev) * 100;
  }, [trend]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Billing &amp; SaaS Revenue</h2>
          <p className="text-base text-slate-500 mt-2">
            Monthly recurring revenue, collected vs. outstanding receivables, payment and plan breakdowns, and the full invoice register.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant={showPeriodFilter || isPeriodFilterActive ? "primary" : "outline"}
            onClick={() => setShowPeriodFilter(!showPeriodFilter)}
            className="flex items-center gap-2 text-xs font-semibold cursor-pointer shadow-sm"
          >
            <Filter size={15} />
            <span>{showPeriodFilter ? 'Hide Period Filter' : 'Filter Period'}</span>
            {isPeriodFilterActive && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            )}
          </Button>
          <Button variant="secondary" onClick={handleExportCSV} className="flex items-center gap-1.5 cursor-pointer shrink-0">
            <Download size={16} /> Export CSV
          </Button>
        </div>
      </div>

      {/* Period Filter Bar (Hidden by default, toggled via Filter Period button) */}
      {showPeriodFilter && (
        <div className="bg-white border border-indigo-100 p-4 rounded-xl shadow-md space-y-2 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Calendar size={15} className="text-indigo-600" />
              <span>Period Filter (Calculates KPI Cards &amp; Charts)</span>
            </div>
            {isPeriodFilterActive && (
              <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                Active Period Filter
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1.5fr_1.5fr_auto] gap-4 items-end w-full">
            <Select
              label="Year"
              value={periodYear}
              onChange={(e) => { setPeriodYear(e.target.value); setCurrentPage(1); }}
              options={[
                { value: 'all', label: 'All Years' },
                ...(summary?.available_years || []).map(y => ({ value: String(y), label: String(y) }))
              ]}
            />
            <Input
              label="Start Date"
              type="date"
              value={periodStartDate}
              onChange={(e) => { setPeriodStartDate(e.target.value); setCurrentPage(1); }}
            />
            <Input
              label="End Date"
              type="date"
              value={periodEndDate}
              onChange={(e) => { setPeriodEndDate(e.target.value); setCurrentPage(1); }}
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-transparent select-none opacity-0" aria-hidden="true">Action</span>
              <Button
                variant="outline"
                onClick={handleClearPeriodFilters}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50 rounded-lg gap-1.5 h-[38px] shrink-0 cursor-pointer shadow-sm whitespace-nowrap"
              >
                <RotateCcw size={14} />
                Reset Period
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Invoiced Revenue</span>
            <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100"><Wallet size={18} /></div>
          </div>
          <span className="text-2xl font-extrabold text-slate-900 block mt-2">{loading ? <Loader2 size={20} className="animate-spin text-slate-300" /> : formatINR(summary?.total_revenue || 0)}</span>
          <span className="text-[11px] text-slate-400 font-medium block mt-0.5">Total created invoice value</span>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly Recurring Revenue</span>
            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100"><TrendingUp size={18} /></div>
          </div>
          <span className="text-2xl font-extrabold text-slate-900 block mt-2">{loading ? <Loader2 size={20} className="animate-spin text-slate-300" /> : formatINR(summary?.mrr || 0)}</span>
          <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
            {yoyDelta === null ? 'Normalized monthly revenue' : <>MoM {yoyDelta.toFixed(1)}%</>}
          </span>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Annual Run-Rate (ARR)</span>
            <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100"><Banknote size={18} /></div>
          </div>
          <span className="text-2xl font-extrabold text-slate-900 block mt-2">{loading ? <Loader2 size={20} className="animate-spin text-slate-300" /> : formatINR(summary?.arr || 0)}</span>
          <span className="text-[11px] text-slate-400 font-medium block mt-0.5">Annualized recurring projection</span>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Collected Revenue</span>
            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100"><CheckCircle size={18} /></div>
          </div>
          <span className="text-2xl font-extrabold text-emerald-600 block mt-2">{loading ? <Loader2 size={20} className="animate-spin text-slate-300" /> : formatINR(summary?.collected_revenue || 0)}</span>
          <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
            {summary?.paid_count ? `${summary.paid_count} paid invoices` : 'Paid invoice receipts'}
          </span>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Outstanding Receivables</span>
            <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100"><AlertOctagon size={18} /></div>
          </div>
          <span className="text-2xl font-extrabold text-amber-600 block mt-2">{loading ? <Loader2 size={20} className="animate-spin text-slate-300" /> : formatINR(summary?.outstanding || 0)}</span>
          <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
            {summary?.outstanding_count ? `${summary.outstanding_count} unpaid/overdue` : 'Unpaid & overdue receivables'}
          </span>
        </Card>
      </div>

      {/* Revenue charts: trend + by plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp size={16} className="text-purple-600" />
                  Cumulative Revenue Trend ({periodYear === 'all' ? 'All Years' : periodYear})
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Monthly cumulative subscription earnings from paid invoices</p>
              </div>
            </div>
          </CardHeader>
          <div className="w-full h-72">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
            ) : trend.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">No revenue data found</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 10, right: 20, left: 10, bottom: 5 }} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={8} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={70}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickFormatter={(v: number) => {
                      if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
                      return `₹${v.toLocaleString('en-IN')}`;
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 600 }}
                    formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Cumulative Revenue']}
                  />
                  <Bar dataKey="raw" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers size={16} className="text-indigo-600" />
              Revenue by Plan
            </CardTitle>
            <span className="text-xs text-slate-500">Collected vs. outstanding</span>
          </CardHeader>
          <div className="w-full h-72">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
            ) : planChartData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">No plan data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planChartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v: number) => (v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${v.toLocaleString('en-IN')}`)} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} width={110} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} />
                  <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[0, 4, 4, 0]} stackId="a" />
                  <Bar dataKey="outstanding" name="Outstanding" fill="#f59e0b" radius={[0, 4, 4, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Invoice Register Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText size={16} className="text-slate-700" />
            Invoices Register
          </CardTitle>
          <p className="text-xs text-slate-500">Filter, search, and view individual SaaS billing invoices</p>
        </CardHeader>
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-3 w-full">
            <div className="relative">
              <Input
                label="Search Invoice / Tenant"
                placeholder="Search invoice number or tenant..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                wrapperClassName="mb-0"
              />
              <Search size={14} className="absolute right-3 top-[38px] text-slate-400 pointer-events-none" />
            </div>
            <Select
              label="Status"
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              options={[
                { value: 'All', label: 'All Statuses' },
                { value: 'Paid', label: 'Paid' },
                { value: 'Unpaid', label: 'Unpaid' },
                { value: 'Overdue', label: 'Overdue' },
                { value: 'Draft', label: 'Draft' }
              ]}
            />
            <Select
              label="Tenant"
              value={filterTenant}
              onChange={(e) => { setFilterTenant(e.target.value); setCurrentPage(1); }}
              options={[
                { value: 'All', label: 'All Tenants' },
                ...uniqueTenants.map(t => ({ value: t, label: t }))
              ]}
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-transparent select-none opacity-0" aria-hidden="true">Action</span>
              <Button
                variant="outline"
                onClick={handleClearTableFilters}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50 rounded-lg gap-1.5 h-[38px] shrink-0 cursor-pointer shadow-sm whitespace-nowrap"
              >
                <RotateCcw size={14} />
                Clear Table Filters
              </Button>
            </div>
          </div>
        </div>

        {loading && invoices.length === 0 ? (
          <div className="p-12 text-center">
            <Loader2 size={32} className="mx-auto text-indigo-500 animate-spin mb-3" />
            <p className="text-sm text-slate-500 font-semibold">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 font-semibold">
            No invoices match the specified period or table filters.
          </div>
        ) : (
          <Table headers={['Invoice No', 'Tenant', 'Plan / Cycle', 'Start Date', 'Due Date', 'Total (INR)', 'Method', 'Status']}>
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50 transition">
                <td className="px-3 py-3 font-mono text-xs font-bold text-indigo-600">{inv.id}</td>
                <td className="px-3 py-3 font-bold text-slate-900 text-sm">{inv.tenantName}</td>
                <td className="px-3 py-3 text-xs text-slate-600">
                  <span className="font-semibold">{inv.planName}</span>
                  <span className="text-slate-400 capitalize block">{inv.billingCycle}</span>
                </td>
                <td className="px-3 py-3 text-xs text-slate-600 font-medium whitespace-nowrap">{inv.date || '-'}</td>
                <td className="px-3 py-3 text-xs text-slate-600 font-medium whitespace-nowrap">{inv.dueDate || '-'}</td>
                <td className="px-3 py-3 font-bold text-slate-900 text-sm whitespace-nowrap">{formatINR(inv.total)}</td>
                <td className="px-3 py-3 text-xs text-slate-600 capitalize font-medium">{inv.paymentMethod || '-'}</td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusColors[inv.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {inv.status}
                  </span>
                </td>
              </tr>
            ))}
          </Table>
        )}

        {totalItems > itemsPerPage && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </Card>
    </div>
  );
};
