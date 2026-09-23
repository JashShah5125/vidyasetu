import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { billingService } from '../../services/billingService';
import { useApp } from '../../context/AppContext';
import { BulkImportModal } from '../../components/ui/BulkImportModal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Pagination } from '../../components/ui/Pagination';
import { Table } from '../../components/ui/Table';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Download, TrendingUp, Banknote, CheckCircle, AlertOctagon, AlertTriangle,
  Layers, Loader2, Wallet, FileText, Calendar, RotateCcw, Search, Filter,
  Plus, Eye, Edit3, Trash2, Upload, X
} from 'lucide-react';

interface Invoice {
  dbId: number;
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
  const navigate = useNavigate();
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

  // Generate list of proper Financial Years dynamically (April 1 to March 31)
  const financialYears = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentYear = today.getFullYear();
    const currentFyStart = currentMonth >= 4 ? currentYear : currentYear - 1;
    
    const fys = [];
    for (let i = 0; i < 6; i++) {
      const startYr = currentFyStart - i;
      const endYr = startYr + 1;
      const label = `FY ${startYr}-${String(endYr).slice(-2)}${i === 0 ? ' (Current FY)' : ''}`;
      const startDate = `${startYr}-04-01`;
      const endDate = `${endYr}-03-31`;
      fys.push({
        value: String(startYr),
        label,
        startDate,
        endDate
      });
    }
    return fys;
  }, []);

  const handleSelectFy = (fyValue: string) => {
    if (fyValue === 'all') {
      setPeriodYear('all');
      setPeriodStartDate('');
      setPeriodEndDate('');
    } else {
      const found = financialYears.find(f => f.value === fyValue);
      if (found) {
        setPeriodYear(fyValue);
        setPeriodStartDate(found.startDate);
        setPeriodEndDate(found.endDate);
      }
    }
    setCurrentPage(1);
  };

  const currentFyLabel = useMemo(() => {
    if (periodYear === 'all' && !periodStartDate && !periodEndDate) {
      return 'All Financial Years';
    }
    const found = financialYears.find(f => f.value === periodYear);
    if (found && periodStartDate === found.startDate && periodEndDate === found.endDate) {
      return `FY ${found.value}-${String(Number(found.value) + 1).slice(-2)}`;
    }
    if (periodStartDate && periodEndDate) {
      const startD = new Date(periodStartDate);
      const endD = new Date(periodEndDate);
      if (startD.getMonth() === 3 && startD.getDate() === 1 && endD.getMonth() === 2 && endD.getDate() === 31) {
        return `FY ${startD.getFullYear()}-${String(endD.getFullYear()).slice(-2)}`;
      }
      return `${periodStartDate} to ${periodEndDate}`;
    }
    if (periodYear !== 'all') {
      return `FY ${periodYear}-${String(Number(periodYear) + 1).slice(-2)}`;
    }
    return 'All Financial Years';
  }, [periodYear, periodStartDate, periodEndDate, financialYears]);

  const isPeriodFilterActive = useMemo(
    () => periodYear !== 'all' || Boolean(periodStartDate) || Boolean(periodEndDate),
    [periodYear, periodStartDate, periodEndDate]
  );

  const [showImportModal, setShowImportModal] = useState(false);
  const { addToast } = useApp();

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

  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const openCreateInvoice = () => {
    navigate('/billing/invoices/new');
  };

  const openEditInvoice = (inv: Invoice) => {
    navigate(`/billing/invoices/${inv.dbId}/edit`);
  };

  const handleOpenDeleteInvoice = (inv: Invoice) => {
    setDeletingInvoice(inv);
  };

  const handleConfirmDeleteInvoice = async () => {
    if (!deletingInvoice) return;
    setDeleteSubmitting(true);
    try {
      await billingService.deleteInvoice(deletingInvoice.dbId);
      addToast(`Invoice #${deletingInvoice.id} deleted successfully.`, 'success');
      setDeletingInvoice(null);
      loadData();
    } catch (err: any) {
      addToast(err?.response?.data?.message || 'Failed to delete invoice', 'error');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Bulk import — backend not wired yet; parse + hand rows to a placeholder handler.
  const handleBulkImport = (rows: any[]) => {
    if (rows.length === 0) return;
    console.log('Invoices bulk import payload (backend pending):', rows);
    addToast(`Parsed ${rows.length} invoice rows. Bulk import endpoint not built yet.`, 'warning');
  };

  const [trendChartType, setTrendChartType] = useState<'area' | 'bar'>('area');
  const [planViewType, setPlanViewType] = useState<'stacked' | 'donut'>('stacked');

  const planChartData = useMemo(
    () => byPlan.map(p => ({ name: p.plan_name, collected: p.collected, outstanding: p.outstanding })),
    [byPlan]
  );

  const planTotals = useMemo(() => {
    const totalCollected = planChartData.reduce((acc, p) => acc + (Number(p.collected) || 0), 0);
    const totalOutstanding = planChartData.reduce((acc, p) => acc + (Number(p.outstanding) || 0), 0);
    const totalRevenue = totalCollected + totalOutstanding;
    return { totalCollected, totalOutstanding, totalRevenue };
  }, [planChartData]);

  const planDonutData = useMemo(() => {
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];
    return planChartData.map((p, idx) => {
      const val = (Number(p.collected) || 0) + (Number(p.outstanding) || 0);
      return {
        name: p.name,
        value: val,
        collected: Number(p.collected) || 0,
        outstanding: Number(p.outstanding) || 0,
        color: colors[idx % colors.length]
      };
    }).filter(d => d.value > 0);
  }, [planChartData]);

  const peakTrendMonth = useMemo(() => {
    if (!trend || trend.length === 0) return null;
    let maxItem = trend[0];
    for (const t of trend) {
      if (Number(t.raw || 0) > Number(maxItem?.raw || 0)) {
        maxItem = t;
      }
    }
    return maxItem && Number(maxItem.raw || 0) > 0 ? maxItem : null;
  }, [trend]);

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
      <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Billing &amp; SaaS Revenue</h2>
          <p className="text-base text-slate-500 mt-2">
            Track recurring revenue, receivables, plan performance, and invoices.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant={showPeriodFilter || isPeriodFilterActive ? "primary" : "outline"}
            onClick={() => setShowPeriodFilter(!showPeriodFilter)}
            className="flex items-center gap-2 text-xs font-semibold cursor-pointer shadow-sm"
          >
            <Filter size={15} />
            <span>{showPeriodFilter ? 'Close Filter' : 'Filter Period'}</span>
            {isPeriodFilterActive && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            )}
          </Button>
          <Button variant="secondary" onClick={handleExportCSV} className="flex items-center gap-1.5 cursor-pointer shrink-0">
            <Download size={16} /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => setShowImportModal(true)} className="flex items-center gap-1.5 cursor-pointer shrink-0">
            <Upload size={16} /> Bulk Import
          </Button>
          <Button onClick={openCreateInvoice} className="flex items-center gap-1.5 cursor-pointer shrink-0">
            <Plus size={16} /> Create Invoice
          </Button>
        </div>
      </div>

      {/* Right-Side Period & Metrics Filter Drawer */}
      {showPeriodFilter && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={() => setShowPeriodFilter(false)}
        >
          <div 
            className="w-full sm:w-[380px] h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-slide-left overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <Filter size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Period Filter</h3>
                  <p className="text-xs text-slate-500">Filter KPIs, charts, and invoice calculations</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPeriodFilter(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-5 space-y-6 flex-1">
              {/* Quick Presets */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Quick Presets</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectFy('all')}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left transition-all cursor-pointer ${
                      periodYear === 'all' && !periodStartDate && !periodEndDate
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    All Financial Years
                  </button>
                  {financialYears.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSelectFy(financialYears[0].value)}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left transition-all cursor-pointer ${
                        periodYear === financialYears[0].value && periodStartDate === financialYears[0].startDate
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {financialYears[0].label.replace(' (Current FY)', '')} (Current)
                    </button>
                  )}
                  {financialYears.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleSelectFy(financialYears[1].value)}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left transition-all cursor-pointer ${
                        periodYear === financialYears[1].value && periodStartDate === financialYears[1].startDate
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {financialYears[1].label} (Prev FY)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const d30 = new Date();
                      d30.setDate(today.getDate() - 30);
                      setPeriodYear('all');
                      setPeriodStartDate(d30.toISOString().split('T')[0]);
                      setPeriodEndDate(today.toISOString().split('T')[0]);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left transition-all cursor-pointer ${
                      periodStartDate && !periodEndDate
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Last 30 Days
                  </button>
                </div>
              </div>

              {/* Financial Year Selector */}
              <div className="space-y-2">
                <Select
                  label="Financial Year (April – March)"
                  value={periodYear}
                  onChange={(e) => handleSelectFy(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Financial Years' },
                    ...financialYears.map(f => ({ value: f.value, label: f.label }))
                  ]}
                />
              </div>

              {/* Custom Date Range */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Custom Date Range</span>
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
              </div>

              {/* Active Filter State Notice */}
              {isPeriodFilterActive && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    Active Filter Applied
                  </div>
                  <p className="text-amber-700">
                    Charts, metrics, and trends are currently scoped to this custom period.
                  </p>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={handleClearPeriodFilters}
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 border-slate-200 cursor-pointer"
              >
                <RotateCcw size={14} /> Reset
              </Button>
              <Button
                variant="primary"
                onClick={() => setShowPeriodFilter(false)}
                className="flex-1 text-xs font-bold cursor-pointer"
              >
                Apply &amp; Close
              </Button>
            </div>
          </div>
        </div>,
        document.body
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
        <Card className="overflow-hidden relative">
          {/* Toggle pinned top-right */}
          <div className="absolute top-3 right-3 z-10 inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setTrendChartType('area')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                trendChartType === 'area'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Area
            </button>
            <button
              type="button"
              onClick={() => setTrendChartType('bar')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                trendChartType === 'bar'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Bars
            </button>
          </div>
          <CardHeader className="py-3 px-4 pr-28">
            <CardTitle className="text-sm font-bold text-slate-900 leading-snug truncate">
              Cumulative Revenue Trend
            </CardTitle>
            <p className="text-[11px] text-slate-400 truncate">{currentFyLabel}</p>
          </CardHeader>
          <div className="w-full h-48">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
            ) : trend.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">No revenue data found</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {trendChartType === 'area' ? (
                  <AreaChart data={trend} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                    <defs>
                      <linearGradient id="revAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={4} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      width={52}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      tickFormatter={(v: number) => {
                        if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
                        if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
                        return `₹${v.toLocaleString('en-IN')}`;
                      }}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const val = Number(payload[0].value || 0);
                          return (
                            <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-slate-700/50 text-xs space-y-1 min-w-[150px]">
                              <div className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">{label}</div>
                              <div className="text-base font-extrabold text-indigo-300">₹{val.toLocaleString('en-IN')}</div>
                              <div className="text-[10px] text-slate-400">Cumulative Subscription Revenue</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="raw"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#revAreaGrad)"
                      activeDot={{ r: 6, fill: '#4f46e5', stroke: '#fff', strokeWidth: 3 }}
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={trend} margin={{ top: 10, right: 16, left: 0, bottom: 4 }} barCategoryGap="25%">
                    <defs>
                      <linearGradient id="revBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={4} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      width={52}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      tickFormatter={(v: number) => {
                        if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
                        if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
                        return `₹${v.toLocaleString('en-IN')}`;
                      }}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const val = Number(payload[0].value || 0);
                          return (
                            <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-slate-700/50 text-xs space-y-1 min-w-[150px]">
                              <div className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">{label}</div>
                              <div className="text-base font-extrabold text-indigo-300">₹{val.toLocaleString('en-IN')}</div>
                              <div className="text-[10px] text-slate-400">Cumulative Subscription Revenue</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="raw" fill="url(#revBarGrad)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden relative">
          {/* Toggle pinned top-right */}
          <div className="absolute top-3 right-3 z-10 inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setPlanViewType('stacked')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                planViewType === 'stacked'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Stacked
            </button>
            <button
              type="button"
              onClick={() => setPlanViewType('donut')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                planViewType === 'donut'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Donut
            </button>
          </div>
          <CardHeader className="py-3 px-4 pr-28">
            <CardTitle className="text-sm font-bold text-slate-900 leading-snug truncate">
              Revenue by Plan
            </CardTitle>
            <p className="text-[11px] text-slate-400 truncate">Collected vs. outstanding</p>
          </CardHeader>
          <div className="w-full h-48">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
            ) : planChartData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">No plan data</div>
            ) : planViewType === 'stacked' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planChartData} layout="vertical" margin={{ top: 10, right: 20, left: 8, bottom: 4 }}>
                  <defs>
                    <linearGradient id="collectedGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                    <linearGradient id="outstandingGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#fbbf24" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickFormatter={(v: number) => (v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${v.toLocaleString('en-IN')}`)}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }}
                    width={110}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const collected = Number(data.collected || 0);
                        const outstanding = Number(data.outstanding || 0);
                        const total = collected + outstanding;
                        const rate = total > 0 ? Math.round((collected / total) * 100) : 0;
                        return (
                          <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-slate-700/50 text-xs space-y-1.5 min-w-[180px]">
                            <div className="font-bold text-slate-200">{data.name || label}</div>
                            <div className="space-y-1 pt-1 border-t border-slate-800">
                              <div className="flex justify-between items-center text-emerald-400">
                                <span>Collected:</span>
                                <span className="font-bold">₹{collected.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="flex justify-between items-center text-amber-400">
                                <span>Outstanding:</span>
                                <span className="font-bold">₹{outstanding.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="flex justify-between items-center text-slate-300 font-bold pt-1 border-t border-slate-800">
                                <span>Total:</span>
                                <span>₹{total.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="text-[10px] text-indigo-300 font-semibold text-right">
                                {rate}% Realization
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="collected" name="Collected" fill="url(#collectedGrad)" radius={[0, 0, 0, 0]} stackId="a" />
                  <Bar dataKey="outstanding" name="Outstanding" fill="url(#outstandingGrad)" radius={[0, 6, 6, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-between h-full px-4">
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const collected = Number(data.collected || 0);
                            const outstanding = Number(data.outstanding || 0);
                            const total = collected + outstanding;
                            const rate = total > 0 ? Math.round((collected / total) * 100) : 0;
                            return (
                              <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-slate-700/50 text-xs space-y-1.5 min-w-[180px]">
                                <div className="font-bold text-slate-200">{data.name}</div>
                                <div className="space-y-1 pt-1 border-t border-slate-800">
                                  <div className="flex justify-between items-center text-emerald-400">
                                    <span>Collected:</span>
                                    <span className="font-bold">₹{collected.toLocaleString('en-IN')}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-amber-400">
                                    <span>Outstanding:</span>
                                    <span className="font-bold">₹{outstanding.toLocaleString('en-IN')}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-slate-300 font-bold pt-1 border-t border-slate-800">
                                    <span>Total:</span>
                                    <span>₹{total.toLocaleString('en-IN')}</span>
                                  </div>
                                  <div className="text-[10px] text-indigo-300 font-semibold text-right">
                                    {rate}% Realization
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Pie
                        data={planDonutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={82}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {planDonutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 space-y-2.5 pr-2">
                  {planDonutData.map((p, idx) => {
                    const percent = planTotals.totalRevenue > 0 ? Math.round((p.value / planTotals.totalRevenue) * 100) : 0;
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }}></span>
                          <span className="font-semibold text-slate-700 truncate">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-slate-900">₹{p.value >= 100000 ? `${(p.value / 100000).toFixed(1)}L` : p.value.toLocaleString('en-IN')}</span>
                          <span className="text-[10px] text-slate-400 font-medium">({percent}%)</span>
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>Total Portfolio</span>
                    <span className="text-slate-900">{formatINR(planTotals.totalRevenue)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Invoice Register Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900">
            Invoices Register
          </CardTitle>
          <p className="text-xs text-slate-500">Filter, search, and view individual SaaS billing invoices</p>
        </CardHeader>
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 w-full items-end">
            <div className="relative">
              <Input
                label="Search Invoice / Tenant"
                placeholder="Search invoice number or tenant..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                wrapperClassName="mb-0"
                className="pr-8"
              />
              <Search size={14} className="absolute right-3 top-[34px] text-slate-400 pointer-events-none" />
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
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50 rounded-lg gap-1.5 h-[34px] shrink-0 cursor-pointer shadow-sm whitespace-nowrap"
              >
                <RotateCcw size={14} />
                Clear Filters
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
          <Table
            dense
            minWidth="1050px"
            colWidths={['140px', '22%', '16%', '110px', '110px', '125px', '100px', '120px']}
            headers={[
              'Invoice No',
              'Tenant',
              'Plan / Cycle',
              'Start Date',
              'Due Date',
              'Total (INR)',
              'Status',
              { label: 'Actions', align: 'center', minWidth: '120px' }
            ]}
          >
            {invoices.map((inv) => (
              <tr
                key={inv.id}
                onClick={() => openEditInvoice(inv)}
                className="hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <td className="px-3 py-3 text-sm font-semibold text-slate-900 whitespace-nowrap">{inv.id}</td>
                <td className="px-3 py-3 text-sm font-semibold text-slate-900 whitespace-nowrap">{inv.tenantName}</td>
                <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">
                  <span className="font-semibold text-slate-800">{inv.planName}</span>
                  <span className="text-slate-400 capitalize block text-xs">{inv.billingCycle}</span>
                </td>
                <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">{inv.date || '-'}</td>
                <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">{inv.dueDate || '-'}</td>
                <td className="px-3 py-3 font-bold text-slate-900 text-sm whitespace-nowrap">{formatINR(inv.total)}</td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusColors[inv.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openViewInvoice(inv); }}
                      title="View invoice"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openEditInvoice(inv); }}
                      title="Edit invoice"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleOpenDeleteInvoice(inv); }}
                      title="Delete invoice"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
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

      <BulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleBulkImport}
        title="Bulk Import Invoices"
        description="Upload a CSV of SaaS invoices to create them in bulk. Each row is validated and inserted as a new invoice."
        sampleHeaders={[
          'tenant_name',
          'plan_code',
          'billing_cycle',
          'billing_period_start',
          'billing_period_end',
          'plan_amount',
          'setup_fee',
          'discount_percent',
          'tax_rate',
          'currency',
          'status',
          'payment_date',
          'payment_method',
          'payment_reference',
          'notes'
        ]}
        sampleRows={[
          ['Allen Career Institute', 'GROWTH', 'yearly', '2026-04-01', '2027-03-31', '120000', '2500', '10', '18', 'INR', 'unpaid', '', '', '', 'Imported invoice'],
          ['Aakash Institute', 'PRO', 'quarterly', '2026-07-01', '2026-09-30', '45000', '0', '0', '18', 'INR', 'paid', '2026-07-01', 'Razorpay', 'pay_123456', 'Imported invoice']
        ]}
      />

      {/* DELETE INVOICE CONFIRMATION MODAL */}
      {deletingInvoice && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => !deleteSubmitting && setDeletingInvoice(null)} />
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 text-center animate-fade-in relative z-10 my-auto">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Delete Invoice?</h3>
              <p className="text-sm text-slate-500 mt-1">
                Are you sure you want to delete invoice <span className="font-bold text-slate-800">#{deletingInvoice.id}</span> for <span className="font-bold text-slate-800">{deletingInvoice.tenantName}</span>?
              </p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left">
              <p className="text-xs text-amber-800 font-semibold flex items-center gap-1.5">
                <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                This will remove the invoice from billing views. A record is retained in the database for audit integrity.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button variant="secondary" onClick={() => setDeletingInvoice(null)} disabled={deleteSubmitting}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleConfirmDeleteInvoice} disabled={deleteSubmitting}>
                {deleteSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
