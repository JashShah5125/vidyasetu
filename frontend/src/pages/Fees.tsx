import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { Upload, Loader2, ArrowLeft, ArrowRight, AlertCircle, Eye, Pencil, Trash2, Wallet, Plus, SlidersHorizontal, RotateCcw, X, Filter, Search, FileText, CheckCircle2, Calendar, CreditCard } from 'lucide-react';
import { BulkImportModal } from '../components/ui/BulkImportModal';
import { getStudents, getAcademicOptions, type StudentRosterItem, type AcademicOptions } from '../services/studentApi';
import {
  getStudentLedger,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  type StudentLedger,
  type StudentLedgerInvoice
} from '../services/paymentApi';
import { formatDate as fmtDate } from '../utils/dateFormatter';

const fmt = (n: number) => '₹' + (Number(n) || 0).toLocaleString('en-IN');

const MODES = [
  { value: 'UPI', label: 'UPI / GPay' },
  { value: 'Cash', label: 'Cash Payment' },
  { value: 'Cheque', label: 'Bank Cheque' },
  { value: 'Bank Transfer', label: 'NEFT / IMPS' }
];

const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const COMPLIANCE_STATUS_OPTIONS = [
  { value: 'All', label: 'All Statuses' },
  { value: 'overdue', label: 'Overdue Dues Only' },
  { value: 'on_schedule', label: 'On Schedule' },
  { value: 'paid', label: 'Fully Paid' }
];

const statusBadge = (status?: string, totalFees?: number) => {
  const norm = (status || '').toLowerCase().trim();
  let cls = 'bg-slate-100 text-slate-700 border border-slate-200';
  let label = 'UNASSIGNED';

  if (!norm || norm === 'unassigned' || totalFees === 0) {
    return { cls: 'bg-slate-100 text-slate-600 border border-slate-200', label: 'UNASSIGNED' };
  }

  if (norm === 'paid') {
    cls = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    label = 'PAID';
  } else if (norm === 'partial' || norm === 'partially_paid') {
    cls = 'bg-amber-50 text-amber-700 border border-amber-200';
    label = 'PARTIAL';
  } else if (norm === 'unpaid' || norm === 'pending') {
    cls = 'bg-slate-100 text-slate-700 border border-slate-200';
    label = 'UNPAID';
  } else if (norm === 'overdue') {
    cls = 'bg-rose-50 text-rose-700 border border-rose-200';
    label = 'OVERDUE';
  } else if (norm) {
    label = norm.toUpperCase();
  }

  return { cls, label };
};

const getCalculationFlag = (s: StudentRosterItem) => {
  const isOverdue = (Number(s.fees_overdue) || 0) > 0;
  const remaining = s.fees_remaining !== undefined ? Number(s.fees_remaining) : (Number(s.fees_outstanding) || 0);
  const total = Number(s.total_fees) || 0;
  const paid = Number(s.fees_paid) || 0;

  if (total <= 0 && (!s.fee_status || s.fee_status.toLowerCase() === 'unassigned')) {
    return {
      flag: 'unassigned',
      label: 'No Plan Assigned',
      badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200'
    };
  }

  if (s.fee_status === 'paid' || (total > 0 && remaining <= 0)) {
    return {
      flag: 'settled',
      label: 'Settled',
      badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    };
  }

  if (isOverdue) {
    return {
      flag: 'overdue',
      label: 'Overdue Dues',
      badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200'
    };
  }

  if (paid > 0 && remaining > 0) {
    return {
      flag: 'partial',
      label: 'In Progress',
      badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200'
    };
  }

  return {
    flag: 'on_schedule',
    label: 'On Schedule',
    badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200'
  };
};

const getComplianceStatus = (s: StudentRosterItem) => {
  const isOverdue = (Number(s.fees_overdue) || 0) > 0;
  const remaining = s.fees_remaining !== undefined ? Number(s.fees_remaining) : (Number(s.fees_outstanding) || 0);
  const total = Number(s.total_fees) || 0;

  if (total <= 0) {
    return {
      status: 'unassigned',
      label: 'Unassigned',
      badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200 font-medium'
    };
  }

  if (s.fee_status === 'paid' || (total > 0 && remaining <= 0)) {
    return {
      status: 'paid',
      label: 'Fully Paid',
      badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold'
    };
  }

  if (isOverdue) {
    return {
      status: 'overdue',
      label: 'Overdue',
      badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
    };
  }

  return {
    status: 'on_schedule',
    label: 'On Schedule',
    badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200 font-medium'
  };
};

interface FeesProps {
  initialTab?: 'record' | 'defaulters';
}

export const Fees: React.FC<FeesProps> = ({ initialTab }) => {
  const { addToast, currentUser } = useApp();
  const isBranchAdmin = currentUser?.role === 'branch-admin' || (currentUser?.role as string) === 'branch_admin' || currentUser?.role === 'finance' || currentUser?.userType === 'finance' || Boolean(currentUser?.branchId);

  // ── View routing ──
  const [view, setView] = useState<'register' | 'collect' | 'view_invoice' | 'edit_invoice'>('register');

  // ── Filters state ──
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('All');
  const [academicYear, setAcademicYear] = useState('All');
  const [course, setCourse] = useState('All');
  const [program, setProgram] = useState('All');
  const [level, setLevel] = useState('All');
  const [batch, setBatch] = useState('All');
  const [feeStatus, setFeeStatus] = useState(initialTab === 'defaulters' ? 'overdue' : 'All');

  // ── Roster / fee register ──
  const [roster, setRoster] = useState<StudentRosterItem[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [rosterTotal, setRosterTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [summaryStats, setSummaryStats] = useState({
    totalExpected: 0,
    totalCollected: 0,
    totalRemaining: 0,
    totalOverdue: 0,
    defaulterCount: 0
  });
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
        if (data && (data.courses || data.branches || data.academicYears)) {
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

  // Filter courses assigned to the active or selected branch
  const availableCourses = useMemo(() => {
    const selectedBranchId = isBranchAdmin ? activeBranchId : (branch !== 'All' ? branch : null);
    if (!selectedBranchId) return academicOptions?.courses || [];

    if (academicOptions?.courseBranches && academicOptions.courseBranches.length > 0) {
      const assignedIds = new Set(
        academicOptions.courseBranches
          .filter(cb => cb.branch_id?.toString() === selectedBranchId.toString())
          .map(cb => cb.course_id?.toString())
      );
      if (assignedIds.size > 0) {
        return (academicOptions.courses || []).filter(c => assignedIds.has(c.id?.toString()));
      }
    }
    return academicOptions?.courses || [];
  }, [academicOptions, branch, isBranchAdmin, activeBranchId]);

  // Cascaded filter options derived from academicOptions and assigned branch programs
  const availablePrograms = useMemo(() => {
    const selectedBranchId = isBranchAdmin ? activeBranchId : (branch !== 'All' ? branch : null);
    let progs = academicOptions?.programs || [];

    // Filter by branch assigned programs if mapping exists
    if (selectedBranchId && academicOptions?.branchPrograms && academicOptions.branchPrograms.length > 0) {
      const assignedProgIds = new Set(
        academicOptions.branchPrograms
          .filter(bp => bp.branch_id?.toString() === selectedBranchId.toString())
          .map(bp => bp.program_id?.toString())
      );
      if (assignedProgIds.size > 0) {
        progs = progs.filter(p => assignedProgIds.has(p.id?.toString()));
      }
    }

    if (course !== 'All') {
      return progs.filter(p => p.course_id?.toString() === course);
    } else {
      const validCourseIds = new Set(availableCourses.map(c => c.id?.toString()));
      return progs.filter(p => validCourseIds.has(p.course_id?.toString()));
    }
  }, [academicOptions, course, branch, isBranchAdmin, activeBranchId, availableCourses]);

  const availableLevels = useMemo(() => {
    return (academicOptions?.levels || []).filter(l => {
      if (course !== 'All' && l.course_id?.toString() !== course) return false;
      if (program !== 'All' && l.program_id?.toString() !== program) return false;
      return true;
    });
  }, [academicOptions, course, program]);

  const availableBatches = useMemo(() => {
    return (academicOptions?.batches || []).filter(b => {
      if (level !== 'All' && b.level_id?.toString() !== level) return false;
      return true;
    });
  }, [academicOptions, level]);

  const uniqueAcademicYears = useMemo(() => {
    const map = new Map<string, { id: number; name: string }>();
    (academicOptions?.academicYears || []).forEach(ay => {
      if (!map.has(ay.name)) {
        map.set(ay.name, ay);
      }
    });
    return Array.from(map.values());
  }, [academicOptions]);

  // Active filters count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (academicYear !== 'All') count++;
    if (branch !== 'All' && !isBranchAdmin) count++;
    if (course !== 'All') count++;
    if (program !== 'All') count++;
    if (level !== 'All') count++;
    if (batch !== 'All') count++;
    if (feeStatus !== 'All') count++;
    if (search.trim() !== '') count++;
    return count;
  }, [academicYear, branch, course, program, level, batch, feeStatus, search, isBranchAdmin]);

  const resetAllFilters = () => {
    setSearch('');
    setBranch('All');
    setAcademicYear('All');
    setCourse('All');
    setProgram('All');
    setLevel('All');
    setBatch('All');
    setFeeStatus('All');
    setPage(1);
  };

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

  // ── Edit invoice form ──
  const [editingInvoice, setEditingInvoice] = useState<StudentLedgerInvoice | null>(null);
  const [editInvAmount, setEditInvAmount] = useState('');
  const [editInvMode, setEditInvMode] = useState('UPI');
  const [editInvTxnRef, setEditInvTxnRef] = useState('');
  const [editInvDescription, setEditInvDescription] = useState('');
  const [editInvRemarks, setEditInvRemarks] = useState('');
  const [editInvSubmitting, setEditInvSubmitting] = useState(false);
  const [editInvError, setEditInvError] = useState<string | null>(null);

  // ── Delete invoice confirmation ──
  const [showDeleteInvoiceModal, setShowDeleteInvoiceModal] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState<StudentLedgerInvoice | null>(null);
  const [deleteInvSubmitting, setDeleteInvSubmitting] = useState(false);

  // ── Misc ──
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const fetchRoster = async (p: number, setLoading = true) => {
    try {
      if (setLoading) setRosterLoading(true);
      setRosterError(null);
      const res = await getStudents({
        page: p,
        limit,
        search: search.trim() || undefined,
        branchId: isBranchAdmin ? undefined : (branch !== 'All' ? branch : undefined),
        academicYearId: academicYear !== 'All' ? academicYear : undefined,
        courseId: course !== 'All' ? course : undefined,
        programId: program !== 'All' ? program : undefined,
        levelId: level !== 'All' ? level : undefined,
        batchId: batch !== 'All' ? batch : undefined,
        status: 'All',
        feeStatus: feeStatus !== 'All' ? feeStatus : undefined
      });
      if (res.data) {
        setRoster(res.data);
        setRosterTotal(res.pagination?.total || res.data.length);
        if (res.summary) {
          setSummaryStats(res.summary);
        }
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
  }, [search, branch, academicYear, course, program, level, batch, feeStatus, isBranchAdmin]);

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
    setEditingInvoice(null);
    fetchRoster(page, false);
  };

  const backToCollect = () => {
    setView('collect');
    setViewInvoice(null);
    setEditingInvoice(null);
  };

  const openViewInvoice = (inv: StudentLedgerInvoice) => {
    setViewInvoice(inv);
    setView('view_invoice');
  };

  const openEditInvoice = (inv: StudentLedgerInvoice) => {
    setEditingInvoice(inv);
    setEditInvAmount(String(inv.amount || inv.paid_amount || ''));
    setEditInvMode(inv.payment_mode || 'UPI');
    setEditInvTxnRef(inv.transaction_reference || '');
    setEditInvDescription(inv.description || '');
    setEditInvRemarks(inv.remarks || '');
    setEditInvError(null);
    setView('edit_invoice');
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
      addToast(`Invoice ${result.invoice.invoice_number || (result.invoice as any).invoiceNumber} created for ${fmt(amountNum)}`, 'success');
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

  const submitEditInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    setEditInvError(null);
    const amountNum = Number(editInvAmount);
    if (!amountNum || amountNum <= 0) {
      setEditInvError('Enter an invoice amount greater than zero');
      return;
    }
    try {
      setEditInvSubmitting(true);
      await updateInvoice(editingInvoice.id, {
        amount: amountNum,
        payment_mode: editInvMode,
        transaction_reference: editInvTxnRef.trim() || undefined,
        description: editInvDescription.trim() || undefined,
        remarks: editInvRemarks.trim() || undefined
      });
      addToast(`Invoice ${editingInvoice.invoice_number} updated successfully`, 'success');
      if (selectedStudentId) {
        await loadLedger(selectedStudentId);
      }
      setView('collect');
      setEditingInvoice(null);
    } catch (err: any) {
      console.error('Invoice update failed:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to update invoice';
      setEditInvError(msg);
      addToast(msg, 'error');
    } finally {
      setEditInvSubmitting(false);
    }
  };

  const openDeleteInvoiceModal = (inv: StudentLedgerInvoice) => {
    setDeletingInvoice(inv);
    setShowDeleteInvoiceModal(true);
  };

  const confirmDeleteInvoice = async () => {
    if (!deletingInvoice) return;
    try {
      setDeleteInvSubmitting(true);
      await deleteInvoice(deletingInvoice.id);
      addToast(`Invoice ${deletingInvoice.invoice_number} deleted successfully`, 'success');
      setShowDeleteInvoiceModal(false);
      setDeletingInvoice(null);
      if (selectedStudentId) {
        await loadLedger(selectedStudentId);
      }
      if (view === 'view_invoice' || view === 'edit_invoice') {
        setView('collect');
      }
    } catch (err: any) {
      console.error('Invoice deletion failed:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete invoice';
      addToast(msg, 'error');
    } finally {
      setDeleteInvSubmitting(false);
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
      'Full Plan Fee': s.total_fees || 0,
      'Expected Due': s.expected_due_till_date || 0,
      'Paid Amount': s.fees_paid || 0,
      'Remaining Balance': s.fees_remaining !== undefined ? s.fees_remaining : (s.fees_outstanding || 0),
      'Overdue Amount': s.fees_overdue || 0,
      'Fee Status': s.fee_status || '',
      'Is Defaulter': s.is_defaulter ? 'Yes' : 'No'
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

  const totalPages = Math.ceil(rosterTotal / limit) || 1;

  // Fallback calculations if summaryStats is empty
  const summary = useMemo(() => ({
    expected: summaryStats.totalExpected || round2(roster.reduce((s, r) => s + (Number(r.total_fees) || 0), 0)),
    collected: summaryStats.totalCollected || round2(roster.reduce((s, r) => s + (Number(r.fees_paid) || 0), 0)),
    remaining: summaryStats.totalRemaining || round2(roster.reduce((s, r) => s + (Number(r.fees_remaining !== undefined ? r.fees_remaining : r.fees_outstanding) || 0), 0)),
    overdue: summaryStats.totalOverdue || round2(roster.reduce((s, r) => s + (Number(r.fees_overdue) || 0), 0)),
    defaulters: summaryStats.defaulterCount || roster.filter(r => (Number(r.fees_overdue) || 0) > 0).length
  }), [roster, summaryStats]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Student Fee Collections & Register</h2>
          <p className="text-base text-slate-500 mt-2">
            Track student fee plans, collected revenues, remaining balances, and overdue dues.
          </p>
        </div>
      </div>

      {view === 'register' ? (
        <>
          {/* 4 Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-slate-700 shadow-sm">
              <div className="p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Expected Fees</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{fmt(summary.expected)}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Contracted revenue for year</div>
              </div>
            </Card>
            <Card className="border-l-4 border-l-emerald-500 shadow-sm">
              <div className="p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">Total Collected Fees</div>
                <div className="text-2xl font-bold text-emerald-600 mt-1">{fmt(summary.collected)}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Fees received to date</div>
              </div>
            </Card>
            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <div className="p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-600">Total Remaining Balance</div>
                <div className="text-2xl font-bold text-blue-700 mt-1">{fmt(summary.remaining)}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Unpaid course plan balance</div>
              </div>
            </Card>
            <Card className="border-l-4 border-l-rose-500 shadow-sm">
              <div className="p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-rose-600">Total Overdue Amount</div>
                <div className="text-2xl font-bold text-rose-600 mt-1">{fmt(summary.overdue)}</div>
                <div className="text-[11px] text-rose-500 mt-0.5">{summary.defaulters} students with overdue dues</div>
              </div>
            </Card>
          </div>

          {/* Search, Filter, Sort Controls & Export CSV (Tenants Page Style) */}
          <div className="flex flex-col md:flex-row gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm items-end justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 flex-1 w-full items-end">
              <Input
                label="Search"
                placeholder="Search by Name, Roll No, Phone..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                wrapperClassName="sm:col-span-2"
              />
              <Select
                label="Batch"
                value={batch}
                onChange={(e) => { setBatch(e.target.value); setPage(1); }}
                options={[
                  { value: 'All', label: 'All Batches' },
                  ...availableBatches.map((b) => ({ value: b.id.toString(), label: b.name }))
                ]}
              />
              <Select
                label="Status"
                value={feeStatus}
                onChange={(e) => { setFeeStatus(e.target.value); setPage(1); }}
                options={COMPLIANCE_STATUS_OPTIONS}
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="secondary"
                onClick={() => setShowFilters(true)}
                className="flex items-center gap-1.5"
              >
                <SlidersHorizontal size={15} />
                More Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              <Button variant="secondary" onClick={resetAllFilters} className="text-slate-500 hover:text-slate-700">
                Clear
              </Button>
              <Button variant="secondary" onClick={handleExportCSV}>
                Export CSV
              </Button>
            </div>
          </div>

          {/* Right-Side Slide-Over Filter Drawer */}
          {showFilters && createPortal(
            <div className="fixed inset-0 z-[1000] flex justify-end">
              {/* Semi-transparent Backdrop with click-to-close */}
              <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
                onClick={() => setShowFilters(false)}
              />

              {/* Drawer Container */}
              <div className="relative w-full max-w-md bg-white h-full shadow-2xl z-10 flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={18} className="text-blue-600" />
                    <h3 className="font-bold text-base text-slate-900">Advanced Filters</h3>
                    {activeFilterCount > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                        {activeFilterCount} Active
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Body / Filter Inputs */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {/* Search Student */}
                  <Input
                    label="Search Student"
                    placeholder="Name / Code / Mobile..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  />

                  {/* Academic Year */}
                  <Select
                    label="Academic Year"
                    value={academicYear}
                    onChange={(e) => { setAcademicYear(e.target.value); setPage(1); }}
                    options={[
                      { value: 'All', label: 'All Academic Years' },
                      ...uniqueAcademicYears.map(ay => ({
                        value: ay.id.toString(),
                        label: `AY ${ay.name}`
                      }))
                    ]}
                  />

                  {/* Branch (if admin) */}
                  {!isBranchAdmin ? (
                    <Select
                      label="Branch"
                      value={branch}
                      onChange={(e) => {
                        setBranch(e.target.value);
                        setCourse('All');
                        setProgram('All');
                        setLevel('All');
                        setBatch('All');
                        setPage(1);
                      }}
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

                  {/* Course */}
                  <Select
                    label="Course"
                    value={course}
                    onChange={(e) => { setCourse(e.target.value); setProgram('All'); setLevel('All'); setBatch('All'); setPage(1); }}
                    options={[
                      { value: 'All', label: 'All Courses' },
                      ...availableCourses.map(c => ({ value: c.id.toString(), label: c.name }))
                    ]}
                  />

                  {/* Program */}
                  <Select
                    label="Program"
                    value={program}
                    onChange={(e) => { setProgram(e.target.value); setLevel('All'); setBatch('All'); setPage(1); }}
                    options={[
                      { value: 'All', label: 'All Programs' },
                      ...availablePrograms.map(p => ({ value: p.id.toString(), label: p.name }))
                    ]}
                  />

                  {/* Level / Class */}
                  <Select
                    label="Level / Class"
                    value={level}
                    onChange={(e) => { setLevel(e.target.value); setBatch('All'); setPage(1); }}
                    options={[
                      { value: 'All', label: 'All Levels' },
                      ...availableLevels.map(l => ({ value: l.id.toString(), label: l.name }))
                    ]}
                  />

                  {/* Batch */}
                  <Select
                    label="Batch"
                    value={batch}
                    onChange={(e) => { setBatch(e.target.value); setPage(1); }}
                    options={[
                      { value: 'All', label: 'All Batches' },
                      ...availableBatches.map(b => ({ value: b.id.toString(), label: b.name }))
                    ]}
                  />

                  {/* Fee Status */}
                  <Select
                    label="Compliance Status"
                    value={feeStatus}
                    onChange={(e) => { setFeeStatus(e.target.value); setPage(1); }}
                    options={COMPLIANCE_STATUS_OPTIONS}
                  />
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={activeFilterCount === 0}
                    onClick={resetAllFilters}
                    className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 flex items-center gap-1.5 font-semibold"
                  >
                    <RotateCcw size={13} /> Reset All
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowFilters(false)}
                    className="font-bold px-5"
                  >
                    Apply & Close
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Fee Register Card & Table */}
          <Card className="p-0 overflow-hidden border border-slate-200 shadow-sm">
            <CardHeader className="p-5 sm:p-6 pb-4 mb-0 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle>Platform Student Fee Registry</CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Showing {roster.length} of {rosterTotal} enrolled students
                </p>
              </div>
              {activeFilterCount > 0 && (
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                  {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
                </span>
              )}
            </CardHeader>
            <Table
              dense
              borderless
              minWidth="1050px"
              colWidths={['22%', '11%', '12%', '11%', '12%', '10%', '11%', '11%']}
              headers={[
                { label: 'Student & Batch', align: 'left' },
                { label: 'Net Fee', align: 'right' },
                { label: 'Expected Due', align: 'right' },
                { label: 'Paid Amount', align: 'right' },
                { label: 'Remaining', align: 'right' },
                { label: 'Overdue', align: 'right' },
                { label: 'Status', align: 'center' },
                { label: 'Action', align: 'center' }
              ]}
            >
              {rosterLoading && roster.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="flex items-center justify-center py-12 text-slate-400 text-sm font-medium">
                      <Loader2 size={20} className="animate-spin mr-2.5 text-blue-600" /> Loading fee register...
                    </div>
                  </td>
                </tr>
              ) : rosterError ? (
                <tr>
                  <td colSpan={8}>
                    <div className="py-12 text-center">
                      <div className="text-sm text-red-600 flex items-center justify-center gap-2 font-medium">
                        <AlertCircle size={17} /> {rosterError}
                      </div>
                      <Button size="sm" variant="secondary" className="mt-3 font-semibold text-sm" onClick={() => fetchRoster(page)}>Retry</Button>
                    </div>
                  </td>
                </tr>
              ) : roster.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="py-14 text-center text-slate-400 text-sm font-medium">No students match the current filters.</div>
                  </td>
                </tr>
              ) : (
                roster.map((s, idx) => {
                  const isOverdue = (Number(s.fees_overdue) || 0) > 0;
                  const remaining = s.fees_remaining !== undefined ? s.fees_remaining : (s.fees_outstanding || 0);
                  const st = statusBadge(s.fee_status, s.total_fees);
                  const flag = getCalculationFlag(s);

                  return (
                    <tr 
                      key={s.id || idx} 
                      onClick={() => openCollect(s)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      {/* 1. Student Name & Batch */}
                      <td className="px-3.5 py-2.5 text-left">
                        <div className="text-sm font-semibold text-slate-900 leading-snug truncate max-w-[220px]" title={s.full_name}>
                          {s.full_name}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[220px]" title={s.batch_name || 'No Batch Assigned'}>
                          {s.batch_name || 'No Batch'}
                        </div>
                      </td>

                      {/* 2. Net Fee */}
                      <td className="px-2.5 py-2.5 text-right text-xs sm:text-sm font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                        {fmt(s.total_fees || 0)}
                      </td>

                      {/* 3. Expected Due Till Today */}
                      <td className="px-2.5 py-2.5 text-right text-xs sm:text-sm font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                        {fmt(s.expected_due_till_date || 0)}
                      </td>

                      {/* 4. Paid Amount */}
                      <td className="px-2.5 py-2.5 text-right text-xs sm:text-sm font-bold text-emerald-700 tabular-nums whitespace-nowrap">
                        {fmt(s.fees_paid || 0)}
                      </td>

                      {/* 5. Remaining Balance */}
                      <td className="px-2.5 py-2.5 text-right text-xs sm:text-sm font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                        {fmt(remaining)}
                      </td>

                      {/* 6. Overdue */}
                      <td className="px-2.5 py-2.5 text-right text-xs sm:text-sm tabular-nums whitespace-nowrap">
                        {isOverdue ? (
                          <span className="inline-block text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-xs">
                            {fmt(s.fees_overdue || 0)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal text-xs sm:text-sm">₹0</span>
                        )}
                      </td>

                      {/* 7. Backend Status & Dynamic Calculation Flag */}
                      <td className="px-2.5 py-2.5 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${st.cls}`}>
                            {st.label}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${flag.badgeClass}`}>
                            {flag.flag === 'overdue' && <AlertCircle size={9} />}
                            {flag.label}
                          </span>
                        </div>
                      </td>

                      {/* 8. Action */}
                      <td className="px-2.5 py-2.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {isOverdue ? (
                          <Button
                            size="sm"
                            variant="primary"
                            className="font-semibold h-7 px-2.5 text-xs shadow-xs"
                            onClick={() => openCollect(s)}
                          >
                            Collect <ArrowRight size={12} className="ml-1" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold h-7 px-2.5 text-xs"
                            onClick={() => openCollect(s)}
                          >
                            View
                          </Button>
                        )}
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
      ) : view === 'collect' ? (
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
                {(() => {
                  const studentName = ledger.full_name || (ledger as any).student?.name || (ledger as any).name || 'Student';
                  const studentCode = ledger.student_code || (ledger as any).student?.studentCode || (ledger as any).studentCode || '';
                  const branchName = ledger.branch_name || (ledger as any).student?.branchName || '';
                  const batchName = ledger.batch_name || (ledger as any).student?.batchName || '';
                  const fa = ledger.feeAssignment;
                  const netAmount = fa ? (fa.net_amount !== undefined ? Number(fa.net_amount) : Number((fa as any).netAmount) || 0) : 0;
                  const paidAmount = fa ? (fa.paid_amount !== undefined ? Number(fa.paid_amount) : Number((fa as any).paidAmount) || 0) : 0;
                  const balanceAmount = fa ? (fa.balance_amount !== undefined ? Number(fa.balance_amount) : Number((fa as any).balanceAmount) || 0) : 0;
                  const concession = fa ? (fa.total_concession !== undefined ? Number(fa.total_concession) : Number((fa as any).totalConcession) || Number((fa as any).concession) || 0) : 0;
                  const downPayment = fa ? (fa.down_payment !== undefined ? Number(fa.down_payment) : Number((fa as any).downPayment) || 0) : 0;
                  const installmentCount = fa ? (fa.installment_count !== undefined ? Number(fa.installment_count) : Number((fa as any).installmentCount) || 1) : 1;
                  const installmentAmount = fa ? (fa.installment_amount !== undefined ? Number(fa.installment_amount) : Number((fa as any).installmentAmount) || 0) : 0;
                  const faStatus = fa ? (fa.status || '') : '';
                  const st = statusBadge(faStatus);
                  const percentCollected = netAmount > 0 ? Math.min(100, Math.round((paidAmount / netAmount) * 100)) : 0;
                  const isStudentOverdue = (ledger.fees_overdue !== undefined && Number(ledger.fees_overdue) > 0) || balanceAmount > 0;
                  const overdueAmount = ledger.fees_overdue !== undefined
                    ? Number(ledger.fees_overdue)
                    : (() => {
                        const now = new Date();
                        const startDate = new Date(fa?.created_at || (ledger as any)?.created_at || now);
                        let expected = downPayment;
                        for (let i = 1; i <= installmentCount; i++) {
                          const dueDate = new Date(startDate);
                          dueDate.setMonth(dueDate.getMonth() + i);
                          if (dueDate <= now) {
                            expected += installmentAmount;
                          }
                        }
                        expected = Math.min(netAmount, expected);
                        return Math.max(0, expected - paidAmount);
                      })();

                  return (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-blue-600/10 border border-blue-200 text-blue-700 font-display font-bold flex items-center justify-center text-base uppercase">
                            {studentName.slice(0, 2)}
                          </div>
                          <div>
                            <div className="text-lg font-bold text-slate-900">{studentName}</div>
                            <div className="text-sm text-slate-500 mt-0.5">
                              {studentCode && <span>{studentCode} · </span>}
                              {branchName && <span>{branchName}</span>}
                              {batchName && <span>{branchName ? ' · ' : ''}{batchName}</span>}
                            </div>
                          </div>
                        </div>
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider w-fit ${st.cls}`}>
                          {st.label}
                        </span>
                      </div>

                      {fa ? (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* 1. Total Amount */}
                            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Amount</div>
                              <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{fmt(netAmount)}</div>
                            </div>
                            {/* 2. Paid Till Now */}
                            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">Paid Till Now</div>
                              <div className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">{fmt(paidAmount)}</div>
                            </div>
                            {/* 3. Remaining Amount */}
                            <div className="rounded-xl bg-blue-50/60 border border-blue-200 p-4">
                              <div className="text-xs font-bold uppercase tracking-wider text-blue-700">Remaining Amount</div>
                              <div className="text-2xl font-bold text-blue-900 mt-1 tabular-nums">{fmt(balanceAmount)}</div>
                            </div>
                            {/* 4. Overdue Dues */}
                            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4">
                              <div className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center justify-between">
                                <span>Overdue Dues</span>
                                {overdueAmount > 0 && <AlertCircle size={14} className="text-rose-600" />}
                              </div>
                              <div className="text-2xl font-bold text-rose-700 mt-1 tabular-nums">{fmt(overdueAmount)}</div>
                            </div>
                          </div>

                          <div className="mt-4">
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all"
                                style={{ width: `${percentCollected}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-slate-400 mt-1">
                              <span>{percentCollected}% collected</span>
                              <span>{ledger.invoices.length} invoice{ledger.invoices.length === 1 ? '' : 's'}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
                            <div>
                              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Concession</div>
                              <div className="text-slate-800 font-semibold mt-0.5 tabular-nums">{fmt(concession)}</div>
                            </div>
                            <div>
                              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Down Payment</div>
                              <div className="text-slate-800 font-semibold mt-0.5 tabular-nums">{fmt(downPayment)}</div>
                            </div>
                            <div>
                              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Installment Plan</div>
                              <div className="text-slate-800 font-semibold mt-0.5 tabular-nums">{installmentCount} × {fmt(installmentAmount)}</div>
                            </div>
                            <div>
                              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Enrollment</div>
                              <div className="text-slate-800 font-semibold mt-0.5">{ledger.enrollment_id || (ledger as any).enrollmentId ? `#${ledger.enrollment_id || (ledger as any).enrollmentId}` : '—'}</div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                          <AlertCircle size={15} className="shrink-0 text-amber-600 mt-0.5" />
                          <span>No fee assignment found for this student.</span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </Card>

              {/* ── Invoices ── */}
              <Card className="p-0 overflow-hidden border border-slate-200 shadow-sm">
                <CardHeader className="p-4 sm:p-5 pb-3 mb-0 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold text-slate-900">Invoices</CardTitle>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                      {ledger.invoices.length}
                    </span>
                  </div>
                  <Button size="sm" variant="primary" className="flex items-center gap-1.5 font-bold h-8 px-3 text-sm shadow-xs" onClick={openInvoiceModal}>
                    <Plus size={14} /> New Invoice
                  </Button>
                </CardHeader>
                <Table
                  dense
                  borderless
                  minWidth="950px"
                  headers={[
                    { label: 'Invoice No', align: 'left' },
                    { label: 'Description', align: 'left' },
                    { label: 'Amount', align: 'right' },
                    { label: 'Paid Amount', align: 'right' },
                    { label: 'Balance Due', align: 'right' },
                    { label: 'Payment Date', align: 'center' },
                    { label: 'Mode', align: 'center' },
                    { label: 'Status', align: 'center' },
                    { label: 'Actions', align: 'right' }
                  ]}
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
                      const isInvOverdue = inv.balance_due > 0 && inv.due_date && new Date(inv.due_date) < new Date();
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-2.5 py-2 text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">{inv.invoice_number}</td>
                          <td className="px-2.5 py-2 text-left">
                            <div className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">{inv.description || (inv.installment_number === 0 ? 'Downpayment' : `Installment ${inv.installment_number}`)}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{fmtDate(inv.issue_date)} → {fmtDate(inv.due_date)}</div>
                          </td>
                          <td className="px-2 py-2 text-right text-xs sm:text-sm font-semibold text-slate-800 tabular-nums whitespace-nowrap">{fmt(inv.amount)}</td>
                          <td className="px-2 py-2 text-right text-xs sm:text-sm font-bold text-emerald-700 tabular-nums whitespace-nowrap">{fmt(inv.paid_amount)}</td>
                          <td className="px-2 py-2 text-right text-xs sm:text-sm tabular-nums whitespace-nowrap">
                            {inv.balance_due > 0 ? (
                              <span className="inline-block text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-xs">
                                {fmt(inv.balance_due)}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal text-xs sm:text-sm">₹0</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-center text-xs text-slate-600 whitespace-nowrap">{fmtDate(inv.payment_date)}</td>
                          <td className="px-2 py-2 text-center text-xs text-slate-600 whitespace-nowrap">{inv.payment_mode || '—'}</td>
                          <td className="px-2 py-2 text-center whitespace-nowrap">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${st.cls}`}>{st.label}</span>
                          </td>
                          <td className="px-2 py-2 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1">
                              <button
                                type="button"
                                title="View Details"
                                className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                                onClick={() => openViewInvoice(inv)}
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                type="button"
                                title="Edit Invoice"
                                className="p-1 rounded-md border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                onClick={() => openEditInvoice(inv)}
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                title="Delete Invoice"
                                className="p-1 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                onClick={() => openDeleteInvoiceModal(inv)}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
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
      ) : view === 'view_invoice' && viewInvoice ? (
        /* ── INVOICE FULL VIEW ── */
        <div className="space-y-6">
          {/* Navigation & Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <Button
              variant="outline"
              onClick={backToCollect}
              className="flex items-center gap-1.5 font-bold"
            >
              <ArrowLeft size={15} /> Back to Student Profile
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                onClick={() => openEditInvoice(viewInvoice)}
                className="flex items-center gap-1.5 font-bold"
              >
                <Pencil size={14} /> Edit Invoice
              </Button>
              <Button
                variant="secondary"
                onClick={() => openDeleteInvoiceModal(viewInvoice)}
                className="flex items-center gap-1.5 font-bold text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          </div>

          {/* Invoice Header Card */}
          <Card className="border border-slate-200 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold">
                  <FileText size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-2xl font-extrabold text-slate-900">{viewInvoice.invoice_number}</h3>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${statusBadge(viewInvoice.status).cls}`}>
                      {statusBadge(viewInvoice.status).label}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    {ledger?.full_name || (ledger as any)?.student?.name || 'Student'}
                    {(ledger?.student_code || (ledger as any)?.student?.studentCode) && ` · ${ledger?.student_code || (ledger as any)?.student?.studentCode}`}
                    {ledger?.branch_name && ` · ${ledger.branch_name}`}
                    {ledger?.batch_name && ` · ${ledger.batch_name}`}
                  </div>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Invoice Amount</div>
                <div className="text-3xl font-extrabold text-slate-900 mt-0.5 tabular-nums">{fmt(viewInvoice.amount)}</div>
              </div>
            </div>
          </Card>

          {/* Metric Highlights */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-slate-700 shadow-sm">
              <div className="p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Invoice Amount</div>
                <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{fmt(viewInvoice.amount)}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Total billed for this entry</div>
              </div>
            </Card>
            <Card className="border-l-4 border-l-emerald-500 shadow-sm">
              <div className="p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">Paid Amount</div>
                <div className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">{fmt(viewInvoice.paid_amount)}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Received to date</div>
              </div>
            </Card>
            <Card className="border-l-4 border-l-rose-500 shadow-sm">
              <div className="p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-rose-700">Balance Due</div>
                <div className="text-2xl font-bold text-rose-700 mt-1 tabular-nums">{fmt(viewInvoice.balance_due)}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{viewInvoice.balance_due > 0 ? 'Pending collection' : 'Fully settled'}</div>
              </div>
            </Card>
            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <div className="p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-700">Payment Mode</div>
                <div className="text-2xl font-bold text-blue-900 mt-1">{viewInvoice.payment_mode || '—'}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{viewInvoice.transaction_reference ? `Ref: ${viewInvoice.transaction_reference}` : 'No reference ID'}</div>
              </div>
            </Card>
          </div>

          {/* Details Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="p-5 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900">Invoice Information</CardTitle>
              </CardHeader>
              <div className="p-5 space-y-4 text-sm">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Description</span>
                  <span className="font-semibold text-slate-800">{viewInvoice.description || (viewInvoice.installment_number === 0 ? 'Downpayment' : `Installment ${viewInvoice.installment_number}`)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Installment Number</span>
                  <span className="font-semibold text-slate-800">{viewInvoice.installment_number === 0 ? 'Downpayment' : viewInvoice.installment_number}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Issue Date</span>
                  <span className="font-semibold text-slate-800">{fmtDate(viewInvoice.issue_date)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Due Date</span>
                  <span className="font-semibold text-slate-800">{fmtDate(viewInvoice.due_date)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Payment Date</span>
                  <span className="font-semibold text-slate-800">{fmtDate(viewInvoice.payment_date)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Transaction Reference</span>
                  <span className="font-mono text-slate-800 text-xs bg-slate-100 px-2 py-0.5 rounded">{viewInvoice.transaction_reference || '—'}</span>
                </div>
              </div>
            </Card>

            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="p-5 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900">Student & Remarks</CardTitle>
              </CardHeader>
              <div className="p-5 space-y-4 text-sm">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Student Name</span>
                  <span className="font-semibold text-slate-800">{ledger?.full_name || (ledger as any)?.student?.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Student Code</span>
                  <span className="font-semibold text-slate-800">{ledger?.student_code || (ledger as any)?.student?.studentCode || '—'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Branch</span>
                  <span className="font-semibold text-slate-800">{ledger?.branch_name || '—'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Batch</span>
                  <span className="font-semibold text-slate-800">{ledger?.batch_name || '—'}</span>
                </div>
                <div className="pt-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Remarks / Notes</div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
                    {viewInvoice.remarks || 'No internal remarks recorded for this invoice.'}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : view === 'edit_invoice' && editingInvoice ? (
        /* ── INVOICE EDIT FULL VIEW ── */
        <div className="space-y-6">
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={backToCollect}
              className="flex items-center gap-1.5 font-bold"
            >
              <ArrowLeft size={15} /> Back to Student Profile
            </Button>
          </div>

          {/* Header */}
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Edit Invoice — {editingInvoice.invoice_number}</h2>
            <p className="text-sm text-slate-500 mt-1">
              Update invoice collection details, payment mode, transaction reference, and notes.
            </p>
          </div>

          {/* Student Banner */}
          {ledger && (
            <Card className="border border-slate-200 shadow-sm p-4 bg-slate-50/70">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-200 text-blue-700 font-bold flex items-center justify-center text-sm uppercase">
                    {(ledger.full_name || 'ST').slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-base font-bold text-slate-900">{ledger.full_name}</div>
                    <div className="text-xs text-slate-500">{ledger.student_code} · {ledger.branch_name} · {ledger.batch_name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Total Net Fee: </span>
                    <span className="font-bold text-slate-800">{fmt(ledger.feeAssignment ? (ledger.feeAssignment.net_amount !== undefined ? Number(ledger.feeAssignment.net_amount) : Number((ledger.feeAssignment as any)?.netAmount) || 0) : 0)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Remaining Due: </span>
                    <span className="font-bold text-rose-600">{fmt(ledger.feeAssignment ? (ledger.feeAssignment.balance_amount !== undefined ? Number(ledger.feeAssignment.balance_amount) : Number((ledger.feeAssignment as any)?.balanceAmount) || 0) : 0)}</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Edit Form Card */}
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="p-5 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">Invoice Details & Adjustments</CardTitle>
            </CardHeader>
            <form onSubmit={submitEditInvoice} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Amount (₹)"
                  type="number"
                  min={0}
                  step={1}
                  value={editInvAmount}
                  onChange={(e) => setEditInvAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
                <Select
                  label="Payment Mode"
                  value={editInvMode}
                  onChange={(e) => setEditInvMode(e.target.value)}
                  options={MODES}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Transaction Reference (optional)"
                  value={editInvTxnRef}
                  onChange={(e) => setEditInvTxnRef(e.target.value)}
                  placeholder="UTR / Cheque no. / Ref ID"
                />
                <Input
                  label="Description (optional)"
                  value={editInvDescription}
                  onChange={(e) => setEditInvDescription(e.target.value)}
                  placeholder="e.g. Admission fee, Term 1 fee..."
                />
              </div>

              <Input
                label="Remarks (optional)"
                value={editInvRemarks}
                onChange={(e) => setEditInvRemarks(e.target.value)}
                placeholder="Internal notes for this invoice"
              />

              {editInvError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
                  <span>{editInvError}</span>
                </div>
              )}

              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-xs text-blue-800 flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-bold">Automatic Balance Recalculation</div>
                  <div className="mt-0.5 text-blue-700 leading-relaxed">
                    Changing this invoice amount from <span className="font-bold">{fmt(editingInvoice.amount)}</span> to <span className="font-bold">{fmt(Number(editInvAmount) || 0)}</span> will automatically recalculate the student's Total Paid and Balance Due.
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={backToCollect}
                  disabled={editInvSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={editInvSubmitting}
                  className="flex items-center gap-1.5 font-bold px-6"
                >
                  {editInvSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Pencil size={14} />}
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}

      {/* Delete Invoice Confirmation Modal */}
      <Modal
        isOpen={showDeleteInvoiceModal}
        onClose={() => {
          setShowDeleteInvoiceModal(false);
          setDeletingInvoice(null);
        }}
        title="Delete Invoice"
        size="sm"
      >
        <div className="space-y-4 text-sm text-slate-600">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-3">
            <AlertCircle size={18} className="shrink-0 text-rose-600 mt-0.5" />
            <div>
              <div className="font-bold text-rose-900 text-sm">Are you sure you want to delete this invoice?</div>
              <div className="mt-1">
                Deleting invoice <span className="font-bold">{deletingInvoice?.invoice_number}</span> ({fmt(deletingInvoice?.amount || 0)}) will deduct this amount from the student's recorded payments and restore their remaining balance.
              </div>
            </div>
          </div>

          {deletingInvoice && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Number:</span>
                <span className="font-semibold text-slate-800">{deletingInvoice.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold text-slate-900">{fmt(deletingInvoice.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-semibold text-slate-800">{deletingInvoice.payment_mode || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Issue / Due Date:</span>
                <span className="text-slate-700">{fmtDate(deletingInvoice.issue_date)} → {fmtDate(deletingInvoice.due_date)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowDeleteInvoiceModal(false);
                setDeletingInvoice(null);
              }}
              disabled={deleteInvSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={confirmDeleteInvoice}
              disabled={deleteInvSubmitting}
              className="flex items-center gap-1.5 font-bold"
            >
              {deleteInvSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={14} />}
              Delete Invoice
            </Button>
          </div>
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
                <div className="font-bold text-slate-900">{ledger.full_name || (ledger as any)?.student?.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{ledger.student_code || (ledger as any)?.student?.studentCode}</div>
              </div>
              <div className="text-right text-xs">
                <div className="text-slate-500">Remaining</div>
                <div className="font-bold text-red-500">{fmt(ledger.feeAssignment ? (ledger.feeAssignment.balance_amount !== undefined ? Number(ledger.feeAssignment.balance_amount) : Number((ledger.feeAssignment as any)?.balanceAmount) || 0) : 0)}</div>
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