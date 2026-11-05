import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  CreditCard,
  Search,
  Filter,
  RefreshCw,
  Download,
  Calendar,
  Building2,
  Check,
  X,
  FileText,
  Loader2,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import {
  getReconciliationTransactions,
  updateReconciliationStatus,
  type ReconciliationTransaction,
  type ReconciliationSummary,
  type GetReconciliationParams
} from '../../services/paymentApi';

const fmt = (n: number) => '₹' + (Number(n) || 0).toLocaleString('en-IN');

export const PaymentReconciliationPage: React.FC = () => {
  const { branches, currentUser, addToast } = useApp();
  const isBranchAdmin = currentUser?.role === 'branch-admin';

  // Filters
  const [search, setSearch] = useState<string>('');
  const [status, setStatus] = useState<string>('all');
  const [paymentMode, setPaymentMode] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>(
    isBranchAdmin ? (currentUser?.branch || 'All') : 'All'
  );

  // Pagination & Data
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(15);
  const [transactions, setTransactions] = useState<ReconciliationTransaction[]>([]);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Action Modals
  const [reconcileModalOpen, setReconcileModalOpen] = useState<boolean>(false);
  const [activeTargetIds, setActiveTargetIds] = useState<number[]>([]);
  const [bankReference, setBankReference] = useState<string>('');
  const [bankDate, setBankDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [reconciliationNotes, setReconciliationNotes] = useState<string>('');
  const [modalMode, setModalMode] = useState<'reconciled' | 'discrepancy'>('reconciled');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Resolve branch ID for API query
  const resolvedBranchId = useMemo(() => {
    if (selectedBranch === 'All' || selectedBranch === 'all') return undefined;
    const match = branches.find(b => b.name === selectedBranch);
    return match ? String(match.id) : undefined;
  }, [selectedBranch, branches]);

  // Load Transactions
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    try {
      const params: GetReconciliationParams = {
        branchId: resolvedBranchId,
        status: status !== 'all' ? status : undefined,
        paymentMode: paymentMode !== 'all' ? paymentMode : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: search.trim() || undefined,
        page,
        limit
      };

      const res = await getReconciliationTransactions(params);
      setTransactions(res.transactions || []);
      setSummary(res.summary || null);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalItems(res.pagination?.totalItems || 0);
    } catch (err: any) {
      console.error('Failed to load reconciliation transactions:', err);
      addToast(err?.response?.data?.message || 'Failed to load reconciliation data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [resolvedBranchId, status, paymentMode, startDate, endDate, search, page, limit, addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Multi-select handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(transactions.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Open Reconcile Modal
  const openReconcileModal = (targetIds: number[], mode: 'reconciled' | 'discrepancy' = 'reconciled') => {
    setActiveTargetIds(targetIds);
    setModalMode(mode);
    setBankReference('');
    setBankDate(new Date().toISOString().slice(0, 10));
    setReconciliationNotes(
      mode === 'reconciled' 
        ? 'Verified against bank credit statement.' 
        : 'Discrepancy flagged: requires manual bank / parent follow-up.'
    );
    setReconcileModalOpen(true);
  };

  // Submit Reconcile / Discrepancy Action
  const handleSubmitReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTargetIds.length === 0) return;

    setSubmitting(true);
    try {
      const res = await updateReconciliationStatus({
        paymentIds: activeTargetIds,
        status: modalMode,
        bankReference: bankReference.trim() || undefined,
        bankDate: bankDate || undefined,
        reconciliationNotes: reconciliationNotes.trim() || undefined
      });

      addToast(res.message || `Successfully marked ${res.updatedCount} transaction(s) as ${modalMode}.`, 'success');
      setReconcileModalOpen(false);
      setSelectedIds([]);
      loadData(true);
    } catch (err: any) {
      addToast(err?.response?.data?.message || err.message || 'Failed to update reconciliation', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = [
      'Transaction ID',
      'Receipt No',
      'Receipt Date',
      'Student Name',
      'Student Code',
      'Branch',
      'Batch',
      'Payment Mode',
      'Amount',
      'Payment Reference / UTR',
      'Reconciliation Status',
      'Bank Value Date',
      'Reconciled By',
      'Notes'
    ];

    const rows = transactions.map(t => [
      t.id,
      t.receipt_number,
      t.receipt_date,
      t.student_name,
      t.student_code || '',
      t.branch_name || '',
      t.batch_name || '',
      t.payment_mode,
      t.amount,
      t.reference_number || t.bank_reference || '',
      t.reconciliation_status,
      t.bank_date || '',
      t.reconciled_by_name || '',
      t.reconciliation_notes || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `payment_reconciliation_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'reconciled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} className="text-emerald-600" />
            Reconciled
          </span>
        );
      case 'discrepancy':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle size={12} className="text-rose-600" />
            Discrepancy
          </span>
        );
      case 'unreconciled':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={12} className="text-amber-500" />
            Pending Bank Credit
          </span>
        );
    }
  };

  const getModeBadge = (mode: string) => {
    const m = (mode || '').toLowerCase();
    if (m.includes('upi')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (m.includes('cash')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (m.includes('cheque')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (m.includes('bank') || m.includes('transfer')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (m.includes('card')) return 'bg-sky-50 text-sky-700 border-sky-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const branchOptions = useMemo(() => {
    if (isBranchAdmin) {
      return [{ value: currentUser?.branch || 'Main Campus', label: currentUser?.branch || 'Main Campus' }];
    }
    return [
      { value: 'All', label: 'All Branches' },
      ...branches.map(b => ({ value: b.name, label: b.name }))
    ];
  }, [branches, isBranchAdmin, currentUser]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-display font-bold text-slate-900">
              Payment Reconciliation Desk
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Banking Audit &bull; Sprint 4
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Reconcile recorded student fee payments, UPI receipts, and clearing cheques against bank settlement statements.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <Download size={14} /> Export CSV
          </Button>

          <button
            type="button"
            onClick={() => loadData(false)}
            disabled={refreshing}
            className="flex items-center gap-1.5 h-8 px-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Refresh transactions"
          >
            <RefreshCw size={13} className={`text-slate-500 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* KPI Deck */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Collected */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Collections</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {summary ? fmt(summary.totalAmount) : '—'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {summary?.totalCount || 0} recorded payment transaction(s)
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <CreditCard size={20} />
          </div>
        </div>

        {/* Bank Reconciled */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Bank Reconciled</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-0.5">
              {summary ? fmt(summary.reconciledAmount) : '—'}
            </p>
            <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
              {summary?.reconciliationRate || 0}% Cleared ({summary?.reconciledCount || 0} txns)
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <ShieldCheck size={20} />
          </div>
        </div>

        {/* Pending Bank Verification */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Clearance</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-0.5">
              {summary ? fmt(summary.unreconciledAmount) : '—'}
            </p>
            <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
              {summary?.unreconciledCount || 0} In-transit / unverified
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
            <Clock size={20} />
          </div>
        </div>

        {/* Discrepancies */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Discrepancies</p>
            <p className="text-2xl font-extrabold text-rose-600 mt-0.5">
              {summary ? fmt(summary.discrepancyAmount) : '—'}
            </p>
            <p className="text-[10px] text-rose-600 font-semibold mt-0.5">
              {summary?.discrepancyCount || 0} flagged for review
            </p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          {/* Search */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Search Student / Receipt / UTR
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. Aarav, RCPT-2026, UTR-9821..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all text-slate-800"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Status
            </label>
            <Select
              value={status}
              onChange={e => {
                setStatus(e.target.value);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'reconciled', label: 'Reconciled' },
                { value: 'unreconciled', label: 'Pending Clearance' },
                { value: 'discrepancy', label: 'Discrepancy' }
              ]}
              style={{ padding: '6px 10px', fontSize: '12px' }}
            />
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Payment Mode
            </label>
            <Select
              value={paymentMode}
              onChange={e => {
                setPaymentMode(e.target.value);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'All Modes' },
                { value: 'UPI', label: 'UPI / GPay' },
                { value: 'Cash', label: 'Cash' },
                { value: 'Cheque', label: 'Cheque' },
                { value: 'Bank Transfer', label: 'Bank Transfer' },
                { value: 'Card', label: 'Card' }
              ]}
              style={{ padding: '6px 10px', fontSize: '12px' }}
            />
          </div>

          {/* Branch Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Branch Campus
            </label>
            <Select
              value={selectedBranch}
              onChange={e => {
                setSelectedBranch(e.target.value);
                setPage(1);
              }}
              options={branchOptions}
              disabled={isBranchAdmin}
              style={{ padding: '6px 10px', fontSize: '12px' }}
            />
          </div>

          {/* Date Range: From */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all text-slate-800"
            />
          </div>
        </div>

        {/* Reset Filter Button */}
        {(search || status !== 'all' || paymentMode !== 'all' || startDate || endDate || selectedBranch !== 'All') && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatus('all');
                setPaymentMode('all');
                setStartDate('');
                setEndDate('');
                setSelectedBranch('All');
                setPage(1);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Bulk Selection Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-xl shadow-md flex items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">
              {selectedIds.length}
            </span>
            <span>transaction(s) selected for bulk action</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openReconcileModal(selectedIds, 'reconciled')}
              className="px-3 py-1.5 rounded-lg bg-white text-emerald-800 font-bold text-xs hover:bg-emerald-50 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <CheckCircle2 size={13} className="text-emerald-600" />
              Mark Reconciled
            </button>
            <button
              type="button"
              onClick={() => openReconcileModal(selectedIds, 'discrepancy')}
              className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
            >
              <AlertTriangle size={13} />
              Flag Discrepancy
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-white/80 hover:text-white text-xs underline ml-2 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Transactions Table */}
      <Card className="p-0 overflow-hidden border border-slate-200 shadow-sm rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="px-4 py-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={transactions.length > 0 && selectedIds.length === transactions.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3.5">Receipt # &bull; Date</th>
                <th className="px-4 py-3.5">Student Profile</th>
                <th className="px-4 py-3.5 text-center">Mode</th>
                <th className="px-4 py-3.5">Bank Ref / UTR</th>
                <th className="px-4 py-3.5 text-right">Amount (₹)</th>
                <th className="px-4 py-3.5 text-center">Reconciliation Status</th>
                <th className="px-4 py-3.5">Clearing / Value Date</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <Loader2 size={24} className="animate-spin mx-auto text-blue-600 mb-2" />
                    Loading reconciliation roster...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <CheckCircle2 size={32} className="mx-auto text-slate-300 mb-2" />
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => {
                  const isChecked = selectedIds.includes(t.id);
                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-slate-50/80 transition-colors ${isChecked ? 'bg-blue-50/40' : ''}`}
                    >
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(t.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-mono font-bold text-slate-900">{t.receipt_number || `#${t.receipt_id}`}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {t.receipt_date ? new Date(t.receipt_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{t.student_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {t.student_code || 'ID #' + t.student_id} {t.batch_name ? `• ${t.batch_name}` : ''}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getModeBadge(t.payment_mode)}`}>
                          {t.payment_mode}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-mono text-xs text-slate-800 truncate max-w-[150px]">
                          {t.bank_reference || t.reference_number || '—'}
                        </div>
                        {t.reconciliation_notes && (
                          <div className="text-[10px] text-slate-400 italic truncate max-w-[160px]">
                            {t.reconciliation_notes}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                        {fmt(t.amount)}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        {getStatusBadge(t.reconciliation_status)}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="text-slate-800 font-medium">
                          {t.bank_date ? new Date(t.bank_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </div>
                        {t.reconciled_by_name && (
                          <div className="text-[10px] text-slate-400">
                            By {t.reconciled_by_name}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {t.reconciliation_status !== 'reconciled' ? (
                            <button
                              type="button"
                              onClick={() => openReconcileModal([t.id], 'reconciled')}
                              className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                              title="Mark Reconciled with Bank"
                            >
                              <Check size={12} />
                              Reconcile
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openReconcileModal([t.id], 'discrepancy')}
                              className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                              title="Flag Discrepancy"
                            >
                              <AlertTriangle size={12} />
                              Discrepancy
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 bg-white">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={limit}
              onPageChange={setPage}
            />
          </div>
        )}
      </Card>

      {/* Reconcile / Discrepancy Modal */}
      <Modal
        isOpen={reconcileModalOpen}
        onClose={() => setReconcileModalOpen(false)}
        title={modalMode === 'reconciled' ? 'Confirm Bank Reconciliation' : 'Flag Transaction Discrepancy'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmitReconcile} className="space-y-4">
          <div className="p-3 rounded-xl border bg-slate-50 text-xs text-slate-700">
            <span className="font-bold block text-slate-900 mb-0.5">
              Target Transactions: {activeTargetIds.length} payment(s) selected
            </span>
            <span>
              {modalMode === 'reconciled'
                ? 'These payments will be marked as bank-verified and cleared in the audit books.'
                : 'These payments will be marked with a discrepancy flag for audit investigation.'
              }
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Bank Value Date / Settlement Date
            </label>
            <Input
              type="date"
              value={bankDate}
              onChange={e => setBankDate(e.target.value)}
              className="text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Bank Reference / Settlement UTR
            </label>
            <Input
              type="text"
              placeholder="e.g. HDFC-SETTLE-892182"
              value={bankReference}
              onChange={e => setBankReference(e.target.value)}
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Auditor / Verification Remarks
            </label>
            <textarea
              rows={3}
              value={reconciliationNotes}
              onChange={e => setReconciliationNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all text-slate-800"
              placeholder="Add verification notes..."
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setReconcileModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={modalMode === 'reconciled' ? 'primary' : 'danger'}
              disabled={submitting}
              className="font-bold flex items-center gap-1.5"
            >
              {submitting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : modalMode === 'reconciled' ? (
                <CheckCircle2 size={13} />
              ) : (
                <AlertTriangle size={13} />
              )}
              <span>{modalMode === 'reconciled' ? 'Confirm Reconciled' : 'Flag Discrepancy'}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

