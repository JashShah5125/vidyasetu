import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { Upload, Loader2, ArrowLeft, ArrowRight, AlertCircle, Eye, Wallet, Plus } from 'lucide-react';
import { BulkImportModal } from '../components/ui/BulkImportModal';
import { getStudents, getAcademicOptions, type StudentRosterItem, type AcademicOptions } from '../services/studentApi';
import {
  getStudentLedger,
  createInvoice,
  type StudentLedger,
  type StudentLedgerInvoice
} from '../services/paymentApi';

const fmt = (n: number) => '₹' + (Number(n) || 0).toLocaleString('en-IN');

const MODES = [
  { value: 'UPI', label: 'UPI / GPay' },
  { value: 'Cash', label: 'Cash Payment' },
  { value: 'Cheque', label: 'Bank Cheque' },
  { value: 'Bank Transfer', label: 'NEFT / IMPS' }
];

const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const FEE_STATUS_OPTIONS = [
  { value: 'All', label: 'All Fee Statuses' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partial', label: 'Partially Paid' },
  { value: 'paid', label: 'Fully Paid' }
];

const statusBadge = (status?: string) => {
  let cls = 'bg-slate-100 text-slate-600';
  let label = (status || '—').toUpperCase();
  if (status === 'paid') { cls = 'bg-emerald-50 text-emerald-600 border border-emerald-200'; }
  else if (status === 'partial') { cls = 'bg-amber-50 text-amber-600 border border-amber-200'; }
  else if (status === 'unpaid') { cls = 'bg-red-50 text-red-600 border border-red-200'; }
  return { cls, label };
};

export const Fees: React.FC = () => {
  const { addToast, currentUser } = useApp();
  const isBranchAdmin = currentUser?.role === 'branch-admin' || (currentUser?.role as string) === 'branch_admin';

  // ── View routing ──
  const [view, setView] = useState<'register' | 'collect'>('register');

  // ── Roster / fee register ──
  const [roster, setRoster] = useState<StudentRosterItem[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [rosterTotal, setRosterTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('All');
  const [feeStatus, setFeeStatus] = useState('All');
  const limit = 10;

  const [academicOptions, setAcademicOptions] = useState<AcademicOptions | null>(null);

  const activeBranchId = academicOptions?.branch?.id?.toString() || (academicOptions?.branches && academicOptions.branches.length === 1 ? academicOptions.branches[0].id.toString() : currentUser?.branchId || '');
  const activeBranchName = academicOptions?.branch?.name || (academicOptions?.branches && academicOptions.branches.length === 1 ? academicOptions.branches[0].name : currentUser?.branch || 'Assigned Branch');

  // Load dropdown options dynamically from backend
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await getAcademicOptions();
        const data = res?.data ?? res;
        if (data && (data.courses || data.branches)) {
          setAcademicOptions(data);
        } else {
          console.warn('Academic options returned unexpected shape:', res);
        }
      } catch (err) {
        console.error('Failed to load academic options:', err);
      }
    };
    fetchOptions();
  }, []);

  // ── Selected student ledger ──
  const [selectedStudentId, setSelectedStudentId] = useState<number | 0>(0);
  const [ledger, setLedger] = useState<StudentLedger | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // ── Invoice detail ──
  const [viewInvoice, setViewInvoice] = useState<StudentLedgerInvoice | null>(null);

  // ── New invoice form ──
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invAmount, setInvAmount] = useState('');
  const [invMode, setInvMode] = useState('UPI');
  const [invTxnRef, setInvTxnRef] = useState('');
  const [invDescription, setInvDescription] = useState('');
  const [invRemarks, setInvRemarks] = useState('');
  const [invSubmitting, setInvSubmitting] = useState(false);
  const [invError, setInvError] = useState<string | null>(null);

  // ── Misc ──
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const fetchRoster = async (p: number, setLoading = true) => {
    try {
      if (setLoading) setRosterLoading(true);
      setRosterError(null);
      const res = await getStudents({
        page: p,
        limit,
        search,
        branchId: isBranchAdmin ? undefined : branch,
        batchId: 'All',
        bundleId: 'All',
        status: 'All',
        feeStatus
      });
      if (res.data) {
        setRoster(res.data);
        setRosterTotal(res.pagination?.total || res.data.length);
      }
    } catch (err: any) {
      console.error('Failed to fetch students:', err);
      setRosterError(err?.message || 'Failed to load student fee register');
    } finally {
      if (setLoading) setRosterLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster(1);
  }, [search, branch, feeStatus, isBranchAdmin]);

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchRoster(p);
  };

  // Load selected student's ledger
  const loadLedger = useCallback(async (id: number) => {
    try {
      setLedgerLoading(true);
      const data = await getStudentLedger(id);
      setLedger(data);
    } catch (err: any) {
      console.error('Failed to load ledger:', err);
      addToast(err?.message || 'Failed to load student ledger', 'error');
    } finally {
      setLedgerLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (!selectedStudentId) {
      setLedger(null);
      return;
    }
    loadLedger(selectedStudentId);
  }, [selectedStudentId, loadLedger]);

  const openCollect = (student: StudentRosterItem) => {
    setSelectedStudentId(student.id);
    setView('collect');
  };

  const backToRegister = () => {
    setView('register');
    setSelectedStudentId(0);
    setLedger(null);
    setViewInvoice(null);
    fetchRoster(page, false);
  };

  const openInvoiceModal = () => {
    setInvAmount('');
    setInvMode('UPI');
    setInvTxnRef('');
    setInvDescription('');
    setInvRemarks('');
    setInvError(null);
    setShowInvoiceModal(true);
  };

  const submitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvError(null);
    const amountNum = Number(invAmount);
    if (!selectedStudentId) {
      setInvError('No student selected');
      return;
    }
    if (!amountNum || amountNum <= 0) {
      setInvError('Enter an invoice amount greater than zero');
      return;
    }
    try {
      setInvSubmitting(true);
      const result = await createInvoice({
        student_id: selectedStudentId,
        amount: amountNum,
        payment_mode: invMode,
        transaction_reference: invTxnRef.trim() || undefined,
        description: invDescription.trim() || undefined,
        remarks: invRemarks.trim() || undefined
      });
      addToast(`Invoice ${result.invoice.invoice_number} created for ${fmt(amountNum)}`, 'success');
      setShowInvoiceModal(false);
      await loadLedger(selectedStudentId);
    } catch (err: any) {
      console.error('Invoice creation failed:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to create invoice';
      setInvError(msg);
      addToast(msg, 'error');
    } finally {
      setInvSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    if (roster.length === 0) {
      addToast('No student records available to export', 'error');
      return;
    }
    const dataToExport = roster.map(s => ({
      'Student ID': s.student_code,
      'Name': s.full_name,
      'Branch': s.branch_name || '',
      'Batch': s.batch_name || '',
      'Total Fees': s.total_fees || 0,
      'Paid': s.fees_paid || 0,
      'Outstanding': s.fees_outstanding || 0,
      'Fee Status': s.fee_status || ''
    }));
    const csvRows = [];
    const headers = Object.keys(dataToExport[0]);
    csvRows.push(headers.join(','));
    for (const row of dataToExport) {
      const values = headers.map(header => {
        const val = (row as Record<string, any>)[header] || '';
        return `"${('' + val).replace(/"/g, '\\"')}"`;
      });
      csvRows.push(values.join(','));
    }
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "student_fee_register.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uniqueBranches = useMemo(() => Array.from(new Set(roster.map(s => s.branch_name).filter(Boolean))), [roster]);
  const totalPages = Math.ceil(rosterTotal / limit) || 1;

  const summary = useMemo(() => ({
    billed: round2(roster.reduce((s, r) => s + (Number(r.total_fees) || 0), 0)),
    collected: round2(roster.reduce((s, r) => s + (Number(r.fees_paid) || 0), 0)),
    outstanding: round2(roster.reduce((s, r) => s + (Number(r.fees_outstanding) || 0), 0)),
    dueCount: roster.filter(r => (r.fee_status && r.fee_status !== 'paid')).length
  }), [roster]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Collect Payments</h2>
          <p className="text-sm text-slate-500 mt-1">
            Review each student's fee profile and the invoices already collected.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-1.5 font-bold">
            <Upload size={14} /> Bulk Import
          </Button>
          <Button variant="secondary" onClick={handleExportCSV}>Export CSV</Button>
        </div>
      </div>

      {view === 'register' ? (
        <>
          {/* Quick summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <div className="p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Debited (shown)</div>
                <div className="text-xl font-bold text-slate-800 mt-1">{fmt(summary.billed)}</div>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Collected</div>
                <div className="text-xl font-bold text-emerald-600 mt-1">{fmt(summary.collected)}</div>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Outstanding</div>
                <div className="text-xl font-bold text-red-500 mt-1">{fmt(summary.outstanding)}</div>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Students with Dues</div>
                <div className="text-xl font-bold text-amber-600 mt-1">{summary.dueCount}</div>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Search"
              placeholder="Name / Student Code / Mobile..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            {!isBranchAdmin ? (
              <Select
                label="Branch"
                value={branch}
                onChange={(e) => { setBranch(e.target.value); setPage(1); }}
                options={[
                  { value: 'All', label: 'All Branches' },
                  ...(academicOptions?.branches || []).map(b => ({ value: b.id.toString(), label: b.name }))
                ]}
              />
            ) : (
              <Select
                label="Branch"
                value={activeBranchId}
                disabled={true}
                options={[
                  { value: activeBranchId, label: activeBranchName }
                ]}
              />
            )}
            <Select
              label="Fee Status"
              value={feeStatus}
              onChange={(e) => { setFeeStatus(e.target.value); setPage(1); }}
              options={FEE_STATUS_OPTIONS}
            />
          </div>

          {/* Fee register table */}
          <Card>
            <CardHeader>
              <CardTitle>Student Fee Register</CardTitle>
            </CardHeader>
            <Table
              headers={['Student ID', 'Student', 'Branch / Batch', 'Total Fees', 'Paid', 'Outstanding', 'Fee Status', '']}
              dense
              colWidths={['100px', '20%', '18%', '11%', '11%', '12%', '10%', '90px']}
            >
              {rosterLoading && roster.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="flex items-center justify-center py-10 text-slate-400 text-sm">
                      <Loader2 size={18} className="animate-spin mr-2" /> Loading fee register...
                    </div>
                  </td>
                </tr>
              ) : rosterError ? (
                <tr>
                  <td colSpan={8}>
                    <div className="py-10 text-center">
                      <div className="text-xs text-red-600 flex items-center justify-center gap-2">
                        <AlertCircle size={15} /> {rosterError}
                      </div>
                      <Button size="sm" variant="secondary" className="mt-3 font-bold" onClick={() => fetchRoster(page)}>Retry</Button>
                    </div>
                  </td>
                </tr>
              ) : roster.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="py-12 text-center text-slate-400 text-sm">No students match the current filters.</div>
                  </td>
                </tr>
              ) : (
                roster.map(s => {
                  const badge = statusBadge(s.fee_status);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-3 font-mono font-bold text-xs text-slate-600 whitespace-nowrap">{s.student_code}</td>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-800">{s.full_name}</div>
                        <div className="text-[11px] text-slate-400">{s.mobile || ''}</div>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">
                        <div>{s.branch_name || '—'}</div>
                        <div className="text-[11px] text-slate-400">{s.batch_name || ''}</div>
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold text-slate-800 whitespace-nowrap">{fmt(s.total_fees || 0)}</td>
                      <td className="px-3 py-3 text-sm font-semibold text-emerald-600 whitespace-nowrap">{fmt(s.fees_paid || 0)}</td>
                      <td className="px-3 py-3 text-sm font-bold text-red-500 whitespace-nowrap">{fmt(s.fees_outstanding || 0)}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button
                          size="sm"
                          variant={s.fee_status && s.fee_status === 'paid' ? 'secondary' : 'primary'}
                          className="font-bold"
                          onClick={() => openCollect(s)}
                        >
                          Collect <ArrowRight size={13} className="ml-1" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </Table>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={rosterTotal}
              pageSize={limit}
              onPageChange={handlePageChange}
            />
          </Card>
        </>
      ) : (
        /* ── COLLECT VIEW ── */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={backToRegister} className="flex items-center gap-1.5 font-bold">
              <ArrowLeft size={15} /> Back to Student Register
            </Button>
          </div>

          {ledgerLoading ? (
            <Card>
              <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 size={20} className="animate-spin mr-2" /> Loading fee profile...</div>
            </Card>
          ) : !ledger ? (
            <Card>
              <div className="py-16 text-center text-slate-400 text-sm">
                <AlertCircle size={28} className="mx-auto mb-3 text-slate-300" />
                Could not load this student's fee profile.
              </div>
            </Card>
          ) : (
            <>
              {/* ── Fee Profile ── */}
              <Card>
                <CardHeader>
                  <CardTitle>Fee Profile</CardTitle>
                </CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-600/10 border border-blue-200 text-blue-700 font-display font-bold flex items-center justify-center text-base uppercase">
                      {(ledger.full_name || '?').slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-lg font-bold text-slate-900">{ledger.full_name}</div>
                      <div className="text-xs font-mono text-slate-400 mt-0.5">
                        {ledger.student_code} · {ledger.branch_name || '—'}{ledger.batch_name ? ` · ${ledger.batch_name}` : ''}
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold w-fit ${statusBadge(ledger.feeAssignment?.status).cls}`}>
                    {statusBadge(ledger.feeAssignment?.status).label}
                  </span>
                </div>

                {ledger.feeAssignment ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Amount</div>
                        <div className="text-2xl font-bold text-slate-900 mt-1">{fmt(ledger.feeAssignment.net_amount)}</div>
                      </div>
                      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                        <div className="text-xs font-bold uppercase tracking-wider text-emerald-500">Paid Till Now</div>
                        <div className="text-2xl font-bold text-emerald-600 mt-1">{fmt(ledger.feeAssignment.paid_amount)}</div>
                      </div>
                      <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                        <div className="text-xs font-bold uppercase tracking-wider text-red-400">Remaining Amount</div>
                        <div className="text-2xl font-bold text-red-500 mt-1">{fmt(ledger.feeAssignment.balance_amount)}</div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all"
                          style={{ width: `${ledger.feeAssignment.net_amount > 0 ? Math.min(100, Math.round((ledger.feeAssignment.paid_amount / ledger.feeAssignment.net_amount) * 100)) : 0}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                        <span>{ledger.feeAssignment.net_amount > 0 ? Math.round((ledger.feeAssignment.paid_amount / ledger.feeAssignment.net_amount) * 100) : 0}% collected</span>
                        <span>{ledger.invoices.length} invoice{ledger.invoices.length === 1 ? '' : 's'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Concession</div>
                        <div className="text-slate-700 font-semibold mt-0.5">{fmt(ledger.feeAssignment.total_concession)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Down Payment</div>
                        <div className="text-slate-700 font-semibold mt-0.5">{fmt(ledger.feeAssignment.down_payment)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Installment Plan</div>
                        <div className="text-slate-700 font-semibold mt-0.5">{ledger.feeAssignment.installment_count} × {fmt(ledger.feeAssignment.installment_amount)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Enrollment</div>
                        <div className="text-slate-700 font-semibold mt-0.5">{ledger.enrollment_id ? `#${ledger.enrollment_id}` : '—'}</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                    <AlertCircle size={15} className="shrink-0 text-amber-600 mt-0.5" />
                    <span>No fee assignment found for this student.</span>
                  </div>
                )}
              </Card>

              {/* ── Invoices ── */}
              <Card>
                <CardHeader>
                  <CardTitle>Invoices ({ledger.invoices.length})</CardTitle>
                  <Button size="sm" variant="primary" className="flex items-center gap-1.5 font-bold" onClick={openInvoiceModal}>
                    <Plus size={14} /> New Invoice
                  </Button>
                </CardHeader>
                <Table
                  headers={['Invoice No', 'Description', 'Amount', 'Paid', 'Balance', 'Payment Date', 'Mode', 'Status', '']}
                  dense
                  colWidths={['120px', '22%', '10%', '10%', '10%', '13%', '11%', '9%', '70px']}
                >
                  {ledger.invoices.length === 0 ? (
                    <tr>
                      <td colSpan={9}>
                        <div className="py-12 text-center text-slate-400 text-sm">
                          <Wallet size={28} className="mx-auto mb-3 text-slate-300" />
                          No invoices recorded for this student yet.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    ledger.invoices.map(inv => {
                      const st = statusBadge(inv.status);
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-3 font-mono font-bold text-xs text-slate-700 whitespace-nowrap">{inv.invoice_number}</td>
                          <td className="px-3 py-3 text-sm text-slate-600">
                            <div className="font-semibold text-slate-800">{inv.description || (inv.installment_number === 0 ? 'Downpayment' : `Installment ${inv.installment_number}`)}</div>
                            <div className="text-[11px] text-slate-400">{inv.issue_date} → {inv.due_date}</div>
                          </td>
                          <td className="px-3 py-3 text-sm font-semibold text-slate-800 whitespace-nowrap">{fmt(inv.amount)}</td>
                          <td className="px-3 py-3 text-sm font-semibold text-emerald-600 whitespace-nowrap">{fmt(inv.paid_amount)}</td>
                          <td className="px-3 py-3 text-sm font-semibold whitespace-nowrap">{inv.balance_due > 0 ? <span className="text-red-500">{fmt(inv.balance_due)}</span> : <span className="text-slate-400">₹0</span>}</td>
                          <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">{inv.payment_date ? String(inv.payment_date).slice(0, 10) : '—'}</td>
                          <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">{inv.payment_mode || '—'}</td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <Button size="sm" variant="outline" className="flex items-center gap-1 font-bold" onClick={() => setViewInvoice(inv)}>
                              <Eye size={13} /> View
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </Table>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Invoice Detail Modal */}
      <Modal
        isOpen={!!viewInvoice}
        onClose={() => setViewInvoice(null)}
        title={viewInvoice ? `Invoice ${viewInvoice.invoice_number}` : 'Invoice'}
        size="md"
      >
        {viewInvoice && (
          <div className="space-y-4 text-sm text-slate-600">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">{viewInvoice.invoice_number}</div>
                <div className="text-xs text-slate-400 mt-0.5">{ledger?.full_name} · {ledger?.student_code}</div>
              </div>
              <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold ${statusBadge(viewInvoice.status).cls}`}>
                {statusBadge(viewInvoice.status).label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</div>
                <div className="text-slate-700 font-medium mt-0.5">{viewInvoice.description || (viewInvoice.installment_number === 0 ? 'Downpayment' : `Installment ${viewInvoice.installment_number}`)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Installment No.</div>
                <div className="text-slate-700 font-medium mt-0.5">{viewInvoice.installment_number === 0 ? 'Downpayment' : viewInvoice.installment_number}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Issue Date</div>
                <div className="text-slate-700 font-medium mt-0.5">{viewInvoice.issue_date}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Due Date</div>
                <div className="text-slate-700 font-medium mt-0.5">{viewInvoice.due_date}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount</div>
                <div className="text-slate-800 font-bold mt-0.5">{fmt(viewInvoice.amount)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Balance Due</div>
                <div className="text-red-500 font-bold mt-0.5">{fmt(viewInvoice.balance_due)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Paid Amount</div>
                <div className="text-emerald-600 font-bold mt-0.5">{fmt(viewInvoice.paid_amount)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Date</div>
                <div className="text-slate-700 font-medium mt-0.5">{viewInvoice.payment_date ? String(viewInvoice.payment_date).slice(0, 10) : '—'}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Mode</div>
                <div className="text-slate-700 font-medium mt-0.5">{viewInvoice.payment_mode || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Transaction Ref</div>
                <div className="text-slate-700 font-medium mt-0.5 break-all">{viewInvoice.transaction_reference || '—'}</div>
              </div>
            </div>

            {viewInvoice.remarks && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Remarks</div>
                <div className="text-slate-600 mt-0.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs">{viewInvoice.remarks}</div>
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end pt-4 border-t border-slate-100 mt-5">
          <Button variant="primary" onClick={() => setViewInvoice(null)}>Close</Button>
        </div>
      </Modal>

      {/* New Invoice Modal */}
      <Modal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        title="New Invoice — Record a Collection"
        size="md"
      >
        <form onSubmit={submitInvoice} className="space-y-4 text-sm text-slate-600">
          {ledger && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">{ledger.full_name}</div>
                <div className="text-xs font-mono text-slate-400 mt-0.5">{ledger.student_code}</div>
              </div>
              <div className="text-right text-xs">
                <div className="text-slate-500">Remaining</div>
                <div className="font-bold text-red-500">{fmt(ledger.feeAssignment?.balance_amount || 0)}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Amount Received (₹)"
              type="number"
              min={0}
              step={1}
              value={invAmount}
              onChange={(e) => setInvAmount(e.target.value)}
              placeholder="0.00"
            />
            <Select label="Payment Mode" value={invMode} onChange={(e) => setInvMode(e.target.value)} options={MODES} />
          </div>

          <Input label="Transaction Reference (optional)" value={invTxnRef} onChange={(e) => setInvTxnRef(e.target.value)} placeholder="UTR / Cheque no. / Ref ID" />
          <Input label="Description (optional)" value={invDescription} onChange={(e) => setInvDescription(e.target.value)} placeholder="e.g. Admission fee, Term 1 fee..." />
          <Input label="Remarks (optional)" value={invRemarks} onChange={(e) => setInvRemarks(e.target.value)} placeholder="Notes for this invoice" />

          {invError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{invError}</span>
            </div>
          )}

          <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 text-xs text-indigo-700">
            <span className="font-bold">Paid collection:</span> this invoice records {Number(invAmount) > 0 ? fmt(Number(invAmount)) : 'the amount'} as received and updates the student's Paid / Remaining.
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setShowInvoiceModal(false)} disabled={invSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={invSubmitting} className="flex items-center gap-1.5 font-bold">
              {invSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Create Invoice
            </Button>
          </div>
        </form>
      </Modal>

      <BulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Bulk Import Fee Payments"
        description="Bulk CSV import is coming soon. Please record payments individually for now."
        sampleHeaders={['StudentId', 'Amount', 'PaymentMode']}
        sampleRows={[
          ['S-201', '15000', 'Bank Transfer'],
          ['S-204', '8500', 'UPI']
        ]}
        onImport={() => {
          addToast('Bulk import is not available yet', 'error');
        }}
      />
    </div>
  );
};