import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Pagination } from '../components/ui/Pagination';
import { Modal } from '../components/ui/Modal';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import type { Voucher } from '../utils/expenseService';
import { otherExpenseApi } from '../services/otherExpenseApi';
import { otherIncomeApi } from '../services/otherIncomeApi';
import { formatDate } from '../utils/dateFormatter';
import {
  FileText,
  CheckCircle2,
  Loader2,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  Printer,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  CreditCard,
  Check,
  Layers
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export interface LedgerVoucher extends Voucher {
  rawId?: number | string;
  sourceType?: 'expense' | 'income';
}

function numberToIndianWords(amount: number): string {
  if (!amount || isNaN(amount) || amount <= 0) return 'Zero Rupees Only';
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const num = Math.floor(amount);
  if (num === 0) return 'Zero Rupees Only';

  function convertGroup(n: number): string {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + 'Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
    } else if (n > 0) {
      str += a[n];
    }
    return str;
  }

  let result = '';
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;

  if (crore > 0) result += convertGroup(crore) + 'Crore ';
  if (lakh > 0) result += convertGroup(lakh) + 'Lakh ';
  if (thousand > 0) result += convertGroup(thousand) + 'Thousand ';
  if (remainder > 0) result += convertGroup(remainder);

  return result.trim() + ' Rupees Only';
}

export const ExpenseVoucher: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, branches, addToast } = useApp();
  const printRef = useRef<HTMLDivElement>(null);

  // Tabs state: 'register' = View Created Vouchers, 'create' = New Voucher Form
  const [activeTab, setActiveTab] = useState<'register' | 'create'>('register');

  // Vouchers List State
  const [vouchers, setVouchers] = useState<LedgerVoucher[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Voucher Slip Modal State
  const [selectedSlipVoucher, setSelectedSlipVoucher] = useState<LedgerVoucher | null>(null);

  // Delete Voucher Modal State
  const [deleteConfirmVoucher, setDeleteConfirmVoucher] = useState<LedgerVoucher | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Form states
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [voucherType, setVoucherType] = useState<Voucher['type']>('Expense');
  const [category, setCategory] = useState<Voucher['category']>('Electricity');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<Voucher['paymentMethod']>('Bank Transfer');
  const [paidTo, setPaidTo] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [status, setStatus] = useState<Voucher['status']>('Paid');

  // Search & Filter state for Voucher Register
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Resolve numerical branch ID for foreign keys
  const branchId = useMemo(() => {
    if (currentUser?.branchId) return Number(currentUser.branchId);
    if ((currentUser as any)?.branch_id) return Number((currentUser as any).branch_id);
    const matched = branches.find(b => b.name === currentUser?.branch);
    if (matched?.id) return Number(matched.id);
    return 1;
  }, [currentUser, branches]);

  // Load vouchers from database
  const loadVouchers = useCallback(async () => {
    setIsLoading(true);
    try {
      const branchIdParam = currentUser?.branchId || (currentUser as any)?.branch_id || (branches.find(b => b.name === currentUser?.branch)?.id) || undefined;
      const [expensesRes, incomesRes] = await Promise.allSettled([
        otherExpenseApi.getOtherExpenses({ limit: 250, branchId: branchIdParam }),
        otherIncomeApi.getOtherIncomes({ limit: 250, branchId: branchIdParam })
      ]);

      const items: LedgerVoucher[] = [];
      const methodMap: Record<string, Voucher['paymentMethod']> = {
        bank_transfer: 'Bank Transfer',
        upi: 'UPI',
        cash: 'Cash',
        cheque: 'Cheque'
      };

      if (expensesRes.status === 'fulfilled' && expensesRes.value?.records) {
        expensesRes.value.records.forEach((e) => {
          let typeVal: Voucher['type'] = 'Expense';
          const combinedText = `${e.title || ''} ${e.description || ''}`;
          if (combinedText.includes('[Payment]')) typeVal = 'Payment';
          else if (combinedText.includes('[Salary]')) typeVal = 'Salary';
          else if (combinedText.includes('[Purchase]')) typeVal = 'Purchase';

          items.push({
            id: e.expense_record_number || `OEX-${e.id}`,
            date: e.expense_date ? String(e.expense_date).slice(0, 10) : '',
            type: typeVal,
            category: (e.category || 'Other') as any,
            description: e.title || e.description || 'Expense Voucher',
            amount: Number(e.amount || 0),
            paymentMethod: methodMap[e.payment_mode] || 'Bank Transfer',
            paidTo: e.payee || 'Vendor / Staff',
            referenceNo: e.reference_number || `REF-${e.id}`,
            status: e.status === 2 ? 'Paid' : 'Pending',
            direction: 'Debit',
            branch: e.branch_name || currentUser?.branch || 'Main Branch',
            rawId: e.id,
            sourceType: 'expense'
          });
        });
      }

      if (incomesRes.status === 'fulfilled' && incomesRes.value?.records) {
        incomesRes.value.records.forEach((i) => {
          let typeVal: Voucher['type'] = 'Receipt';
          const combinedText = `${i.title || ''} ${i.description || ''}`;
          if (combinedText.includes('[Fee]')) typeVal = 'Fee';

          items.push({
            id: i.income_record_number || `OIN-${i.id}`,
            date: i.income_date ? String(i.income_date).slice(0, 10) : '',
            type: typeVal,
            category: 'Donations' as any,
            description: i.title || i.description || 'Receipt Voucher',
            amount: Number(i.amount || 0),
            paymentMethod: methodMap[i.payment_mode] || 'Bank Transfer',
            paidTo: 'Student / Payer',
            referenceNo: i.reference_number || `REF-${i.id}`,
            status: 'Paid',
            direction: 'Credit',
            branch: i.branch_name || currentUser?.branch || 'Main Branch',
            rawId: i.id,
            sourceType: 'income'
          });
        });
      }

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setVouchers(items);
    } catch (err) {
      console.error('Failed to load vouchers:', err);
      addToast('Failed to load created vouchers', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, branches, addToast]);

  useEffect(() => {
    loadVouchers();
  }, [loadVouchers]);

  // Handle voucher type change in form
  const handleVoucherTypeChange = (val: string) => {
    const vt = val as Voucher['type'];
    setVoucherType(vt);
    if (vt === 'Receipt' || vt === 'Fee') {
      setCategory('Donations');
    } else {
      setCategory('Electricity');
    }
  };

  // Submit new voucher
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !paidTo) {
      addToast('Please fill in Description, Amount, and Paid To / Received From.', 'error');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      addToast('Please enter a valid amount greater than ₹0.', 'error');
      return;
    }

    const isCredit = (voucherType === 'Receipt' || voucherType === 'Fee');

    const paymentModeMap: Record<string, string> = {
      'Bank Transfer': 'bank_transfer',
      'UPI': 'upi',
      'Cash': 'cash',
      'Cheque': 'cheque'
    };

    const statusNumMap: Record<string, number> = {
      'Paid': 2,
      'Pending': 0
    };

    try {
      setIsSubmitting(true);

      let createdVoucherSlip: LedgerVoucher;

      if (!isCredit) {
        const res = await otherExpenseApi.createOtherExpense({
          branchId,
          title: description.trim(),
          category,
          description: `[${voucherType}] ${description.trim()} | Paid to: ${paidTo.trim()}`,
          amount: parsedAmount,
          expenseDate: date,
          status: statusNumMap[status] ?? 2,
          paymentMode: paymentModeMap[paymentMethod] || 'bank_transfer',
          referenceNumber: referenceNo.trim() || undefined,
          payee: paidTo.trim() || undefined
        });

        createdVoucherSlip = {
          id: res?.expense_record_number || `OEX-${res?.id || 'NEW'}`,
          date,
          type: voucherType,
          category,
          description: description.trim(),
          amount: parsedAmount,
          paymentMethod,
          paidTo: paidTo.trim(),
          referenceNo: referenceNo.trim() || `REF-${Date.now().toString().slice(-6)}`,
          status,
          direction: 'Debit',
          branch: currentUser?.branch || 'Main Branch',
          rawId: res?.id,
          sourceType: 'expense'
        };
      } else {
        const res = await otherIncomeApi.createOtherIncome({
          branchId,
          title: description.trim(),
          description: `[${voucherType} - ${category}] Received from: ${paidTo.trim()} | Note: ${description.trim()}`,
          amount: parsedAmount,
          incomeDate: date,
          paymentMode: paymentModeMap[paymentMethod] || 'bank_transfer',
          referenceNumber: referenceNo.trim() || undefined
        });

        createdVoucherSlip = {
          id: res?.income_record_number || `OIN-${res?.id || 'NEW'}`,
          date,
          type: voucherType,
          category: 'Donations',
          description: description.trim(),
          amount: parsedAmount,
          paymentMethod,
          paidTo: paidTo.trim(),
          referenceNo: referenceNo.trim() || `REF-${Date.now().toString().slice(-6)}`,
          status: 'Paid',
          direction: 'Credit',
          branch: currentUser?.branch || 'Main Branch',
          rawId: res?.id,
          sourceType: 'income'
        };
      }

      setSuccessMsg(`Voucher ${createdVoucherSlip.id} recorded successfully!`);
      addToast(`Voucher ${createdVoucherSlip.id} created successfully!`, 'success');

      setDescription('');
      setAmount('');
      setPaidTo('');
      setReferenceNo('');
      setAttachment(null);

      await loadVouchers();
      setActiveTab('register');
      setSelectedSlipVoucher(createdVoucherSlip);
    } catch (err: any) {
      console.error('Failed to create voucher in database:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to save voucher';
      addToast(errMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete voucher handler
  const handleConfirmDelete = async () => {
    if (!deleteConfirmVoucher) return;
    const voucherToDelete = deleteConfirmVoucher;
    try {
      setIsDeleting(true);
      if (voucherToDelete.sourceType === 'expense' && voucherToDelete.rawId) {
        await otherExpenseApi.deleteOtherExpense(voucherToDelete.rawId, branchId);
      } else if (voucherToDelete.sourceType === 'income' && voucherToDelete.rawId) {
        await otherIncomeApi.deleteOtherIncome(voucherToDelete.rawId, branchId);
      }
      setVouchers(prev => prev.filter(v => v.id !== voucherToDelete.id));
      setDeleteConfirmVoucher(null);
      addToast(`Voucher ${voucherToDelete.id} deleted successfully`, 'success');
    } catch (err: any) {
      console.error('Failed to delete voucher:', err);
      addToast(err?.response?.data?.message || `Failed to delete voucher ${voucherToDelete.id}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered vouchers list
  const filteredVouchers = useMemo(() => {
    return vouchers.filter(v => {
      if (search) {
        const q = search.toLowerCase();
        const matches =
          v.id.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q) ||
          v.paidTo.toLowerCase().includes(q) ||
          v.referenceNo.toLowerCase().includes(q) ||
          v.category.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (typeFilter !== 'All' && v.type !== typeFilter) return false;
      if (categoryFilter !== 'All' && v.category !== categoryFilter) return false;
      if (statusFilter !== 'All' && v.status !== statusFilter) return false;
      if (paymentMethodFilter !== 'All' && v.paymentMethod !== paymentMethodFilter) return false;
      if (startDate && new Date(v.date) < new Date(startDate)) return false;
      if (endDate && new Date(v.date) > new Date(endDate)) return false;
      return true;
    });
  }, [vouchers, search, typeFilter, categoryFilter, statusFilter, paymentMethodFilter, startDate, endDate]);

  const totalPages = Math.ceil(filteredVouchers.length / itemsPerPage) || 1;
  const paginatedVouchers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredVouchers.slice(start, start + itemsPerPage);
  }, [filteredVouchers, currentPage]);

  const totalDebit = useMemo(() => {
    return filteredVouchers
      .filter(v => v.direction === 'Debit')
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [filteredVouchers]);

  const totalCredit = useMemo(() => {
    return filteredVouchers
      .filter(v => v.direction === 'Credit')
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [filteredVouchers]);

  const pendingCount = useMemo(() => {
    return filteredVouchers.filter(v => v.status === 'Pending').length;
  }, [filteredVouchers]);

  const categoryOptions = useMemo(() => {
    const set = new Set(vouchers.map(v => v.category));
    return ['All', ...Array.from(set)];
  }, [vouchers]);

  const handleExportCSV = () => {
    if (filteredVouchers.length === 0) {
      addToast('No vouchers to export', 'error');
      return;
    }
    const headers = ['Voucher No', 'Date', 'Type', 'Category', 'Payee/Payer', 'Narration', 'Mode', 'Reference No', 'Amount (₹)', 'Direction', 'Status', 'Branch'];
    const rows = filteredVouchers.map(v => [
      `"${v.id}"`,
      `"${v.date}"`,
      `"${v.type}"`,
      `"${v.category}"`,
      `"${v.paidTo.replace(/"/g, '""')}"`,
      `"${v.description.replace(/"/g, '""')}"`,
      `"${v.paymentMethod}"`,
      `"${v.referenceNo}"`,
      v.amount,
      `"${v.direction}"`,
      `"${v.status}"`,
      `"${v.branch || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Voucher_Register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Voucher register exported to CSV', 'success');
  };

  const handlePrintSlip = () => {
    window.print();
  };

  const renderTypeBadge = (type: Voucher['type']) => {
    const config: Record<string, { bg: string; text: string; dot: string }> = {
      Expense: { bg: 'bg-rose-50/80', text: 'text-rose-700', dot: 'bg-rose-500' },
      Payment: { bg: 'bg-blue-50/80', text: 'text-blue-700', dot: 'bg-blue-500' },
      Salary: { bg: 'bg-violet-50/80', text: 'text-violet-700', dot: 'bg-violet-500' },
      Purchase: { bg: 'bg-amber-50/80', text: 'text-amber-800', dot: 'bg-amber-500' },
      Receipt: { bg: 'bg-emerald-50/80', text: 'text-emerald-700', dot: 'bg-emerald-500' },
      Fee: { bg: 'bg-cyan-50/80', text: 'text-cyan-800', dot: 'bg-cyan-500' }
    };
    const c = config[type] || { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase ${c.bg} ${c.text} whitespace-nowrap`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        {type}
      </span>
    );
  };

  const hasActiveFilters = typeFilter !== 'All' || categoryFilter !== 'All' || statusFilter !== 'All' || paymentMethodFilter !== 'All' || startDate || endDate || search;

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('All');
    setCategoryFilter('All');
    setStatusFilter('All');
    setPaymentMethodFilter('All');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* 1. TOP HEADER & SWITCHER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-display">
              Accounting Vouchers
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 font-mono">
              {vouchers.length} Total
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Official ledger vouchers, cash payments, vendor bills & fee receipts.
          </p>
        </div>

        {/* Clean Single Action Group */}
        <div className="flex items-center gap-2.5 self-start md:self-center">
          <div className="inline-flex p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'register'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers size={13} className={activeTab === 'register' ? 'text-blue-600' : 'text-slate-400'} />
              <span>Voucher Register</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'create'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus size={13} />
              <span>Record Voucher</span>
            </button>
          </div>

          {activeTab === 'register' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleExportCSV}
              className="h-8 text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </Button>
          )}
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs font-medium text-emerald-900 animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-emerald-600 shrink-0" size={17} />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="text-emerald-700 hover:text-emerald-950 font-bold px-2 py-0.5 rounded text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: VOUCHER REGISTER                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'register' && (
        <div className="space-y-5">
          {/* Executive KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Total Recorded</span>
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
                  {filteredVouchers.length}
                </span>
                <span className="text-xs text-slate-400">vouchers</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">Current branch ledger records</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Total Outflow (Debit)</span>
                <span className="w-6 h-6 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
                  <ArrowDownLeft size={14} />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-rose-600 tracking-tight">
                  ₹{totalDebit.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-[11px] text-rose-500/80 font-medium mt-1 truncate">Expenses, Purchases & Salaries</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Total Inflow (Credit)</span>
                <span className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ArrowUpRight size={14} />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-emerald-600 tracking-tight">
                  ₹{totalCredit.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-[11px] text-emerald-600/80 font-medium mt-1 truncate">Receipts & Fee Collections</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Pending Clearance</span>
                <span className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
                  <CreditCard size={14} />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-amber-600 tracking-tight">
                  {pendingCount}
                </span>
                <span className="text-xs text-amber-700/80 font-medium">awaiting settlement</span>
              </div>
              <p className="text-[11px] text-amber-500/80 font-medium mt-1 truncate">Unpaid / accrued vouchers</p>
            </div>
          </div>

          {/* Streamlined Single-Row Toolbar */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search voucher number, payee name, memo narration..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50/70 border border-slate-200/80 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50/70 border border-slate-200/80 px-2.5 py-1 rounded-lg">
                  <span className="text-slate-400 font-medium text-[11px]">Type:</span>
                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="All">All Types</option>
                    <option value="Expense">Expense</option>
                    <option value="Payment">Payment</option>
                    <option value="Salary">Salary</option>
                    <option value="Purchase">Purchase</option>
                    <option value="Receipt">Receipt</option>
                    <option value="Fee">Fee</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50/70 border border-slate-200/80 px-2.5 py-1 rounded-lg">
                  <span className="text-slate-400 font-medium text-[11px]">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="All">All</option>
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                    showAdvancedFilters || (categoryFilter !== 'All' || paymentMethodFilter !== 'All' || startDate || endDate)
                      ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Filter size={12} />
                  <span>More Filters</span>
                  {(categoryFilter !== 'All' || paymentMethodFilter !== 'All' || startDate || endDate) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 ml-0.5" />
                  )}
                </button>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-xs text-slate-500 hover:text-rose-600 font-medium px-2 py-1 transition"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {showAdvancedFilters && (
              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => {
                      setCategoryFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:bg-white focus:outline-none"
                  >
                    {categoryOptions.map(cat => (
                      <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Payment Method</label>
                  <select
                    value={paymentMethodFilter}
                    onChange={(e) => {
                      setPaymentMethodFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:bg-white focus:outline-none"
                  >
                    <option value="All">All Methods</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-2xs overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse table-auto">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
                    <th className="py-3 px-3.5 w-[100px]">Date</th>
                    <th className="py-3 px-3.5 w-[140px]">Voucher No</th>
                    <th className="py-3 px-3 w-[95px]">Type</th>
                    <th className="py-3 px-3 w-[120px]">Category</th>
                    <th className="py-3 px-3.5 min-w-[200px]">Payee & Narration</th>
                    <th className="py-3 px-3 w-[105px]">Mode</th>
                    <th className="py-3 px-4 w-[130px] text-right">Amount (₹)</th>
                    <th className="py-3 px-3 w-[90px] text-center">Status</th>
                    <th className="py-3 px-3 w-[80px] text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="py-14 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 size={20} className="animate-spin text-blue-600" />
                          <span className="text-xs font-medium text-slate-600">Retrieving vouchers...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-14 text-center">
                        <div className="max-w-xs mx-auto text-center space-y-2.5">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                            <FileText size={18} />
                          </div>
                          <p className="text-xs font-semibold text-slate-800">No vouchers found</p>
                          <p className="text-[11px] text-slate-400">
                            {hasActiveFilters
                              ? 'No vouchers match your current filters. Try resetting search.'
                              : 'No accounting vouchers recorded yet.'}
                          </p>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => setActiveTab('create')}
                            className="mt-2 text-xs"
                          >
                            <Plus size={13} className="mr-1" />
                            Record First Voucher
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedVouchers.map((v) => (
                      <tr
                        key={v.id}
                        className="hover:bg-slate-50/70 transition-colors group cursor-default"
                      >
                        <td className="py-2.5 px-3.5 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {formatDate(v.date)}
                        </td>

                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedSlipVoucher(v)}
                            className="font-mono font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 group/btn text-xs tracking-tight"
                            title="Click to view official voucher slip"
                          >
                            <span>{v.id}</span>
                            <Eye size={12} className="opacity-0 group-hover/btn:opacity-100 text-blue-500 transition-opacity" />
                          </button>
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {renderTypeBadge(v.type)}
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                            {v.category}
                          </span>
                        </td>

                        <td className="py-2.5 px-3.5 max-w-[240px]">
                          <div className="font-semibold text-slate-800 truncate" title={v.paidTo}>
                            {v.paidTo}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5" title={v.description}>
                            {v.description}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap text-[11px] font-medium">
                          {v.paymentMethod}
                        </td>

                        <td className="py-2.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                          <span className={v.direction === 'Credit' ? 'text-emerald-600' : 'text-slate-900'}>
                            {v.direction === 'Credit' ? '+ ' : '- '}₹{v.amount.toLocaleString('en-IN')}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            v.status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${v.status === 'Paid' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            {v.status}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedSlipVoucher(v)}
                              title="View Voucher Slip"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmVoucher(v)}
                              title={`Delete ${v.id}`}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-100">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages || 1}
                totalItems={filteredVouchers.length}
                pageSize={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CREATE VOUCHER ENTRY FORM                                          */}
      {/* ========================================================================= */}
      {activeTab === 'create' && (
        <div className="max-w-3xl mx-auto animate-fade-in">
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">New Accounting Voucher Entry</h3>
                  <p className="text-[11px] text-slate-500">Record a payment voucher, purchase entry, or cash receipt</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2.5 py-1 rounded-md hover:bg-slate-100 transition"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  type="text"
                  label="Branch"
                  value={currentUser?.branch || 'Main Campus'}
                  disabled
                  className="bg-slate-100 border-slate-200 cursor-default font-semibold text-slate-500"
                />

                <Select
                  label="Voucher Type"
                  value={voucherType}
                  onChange={(e) => handleVoucherTypeChange(e.target.value)}
                  options={[
                    { value: 'Expense', label: 'Expense Voucher (Outflow)' },
                    { value: 'Payment', label: 'Payment Voucher (Outflow)' },
                    { value: 'Salary', label: 'Salary Voucher (Outflow)' },
                    { value: 'Purchase', label: 'Purchase Voucher (Outflow)' },
                    { value: 'Receipt', label: 'Receipt Voucher (Inflow)' },
                    { value: 'Fee', label: 'Fee Receipt (Inflow)' }
                  ]}
                />

                <Input
                  type="date"
                  label="Voucher Date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />

                <Select
                  label="Accounting Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Voucher['category'])}
                  options={
                    (voucherType === 'Receipt' || voucherType === 'Fee')
                      ? [
                        { value: 'Donations', label: 'Donations' },
                        { value: 'Fees', label: 'Student Fees' },
                        { value: 'Other', label: 'Other Income / Scrap' }
                      ]
                      : [
                        { value: 'Salaries', label: 'Salaries & Wages' },
                        { value: 'Electricity', label: 'Electricity Bills' },
                        { value: 'Maintenance', label: 'Maintenance & Repairs' },
                        { value: 'Stationery', label: 'Stationery & Printing' },
                        { value: 'Transport', label: 'Transport / Bus Fuel' },
                        { value: 'Hostel', label: 'Hostel Operations' },
                        { value: 'Other', label: 'Other Expenses' }
                      ]
                  }
                />

                <Input
                  type="number"
                  label="Transaction Amount (₹)"
                  placeholder="e.g. 15000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />

                <Input
                  type="text"
                  label={(voucherType === 'Receipt' || voucherType === 'Fee') ? "Received From" : "Paid To"}
                  placeholder={(voucherType === 'Receipt' || voucherType === 'Fee') ? "e.g. Student Account or Donor" : "e.g. Vendor or Staff Name"}
                  value={paidTo}
                  onChange={(e) => setPaidTo(e.target.value)}
                  required
                />

                <Select
                  label="Payment Method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as Voucher['paymentMethod'])}
                  options={[
                    { value: 'Bank Transfer', label: 'Bank Transfer' },
                    { value: 'UPI', label: 'UPI / GPay / PhonePe' },
                    { value: 'Cash', label: 'Cash Account' },
                    { value: 'Cheque', label: 'Cheque' }
                  ]}
                />

                <Input
                  type="text"
                  label="Reference / Instrument No."
                  placeholder="e.g. ELEC-0726 or UPI Ref ID"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                />

                <Select
                  label="Voucher Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Voucher['status'])}
                  options={[
                    { value: 'Paid', label: 'Cleared / Paid' },
                    { value: 'Pending', label: 'Accrued / Pending' }
                  ]}
                />

                <div className="md:col-span-2">
                  <Input
                    type="text"
                    label="Narration / Description"
                    placeholder="Provide short memo/details of the transaction..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div className="md:col-span-2 border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/60 flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-bold text-slate-700">Attachment Upload</span>
                    <span className="text-[11px] text-slate-400">Attach invoice, receipt slip or supporting bill (Optional)</span>
                  </div>
                  <label className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3.5 py-1.5 rounded-lg cursor-pointer transition shadow-2xs">
                    {attachment ? attachment.name : 'Upload Bill'}
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setAttachment(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSubmitting}
                  onClick={() => setActiveTab('register')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  className="flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Saving Voucher...</span>
                    </>
                  ) : (
                    <>
                      <FileText size={15} />
                      <span>Save & Print Slip</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VOUCHER SLIP PREVIEW MODAL (OFFICIAL A4 PAGE DOCUMENT)                    */}
      {/* ========================================================================= */}
      {selectedSlipVoucher && (
        <Modal
          isOpen={Boolean(selectedSlipVoucher)}
          onClose={() => setSelectedSlipVoucher(null)}
          title={`Official Accounting Voucher Document - ${selectedSlipVoucher.id}`}
          size="4xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>A4 Standard Accounting Format (210mm × 297mm)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedSlipVoucher(null)}
                >
                  Close Preview
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handlePrintSlip}
                  className="flex items-center gap-1.5 shadow-sm"
                >
                  <Printer size={14} />
                  <span>Print A4 Voucher</span>
                </Button>
              </div>
            </div>
          }
        >
          {/* Scrollable workspace with authentic centered A4 sheet */}
          <div className="bg-slate-100/90 -m-6 p-4 sm:p-8 flex justify-center items-center overflow-y-auto max-h-[80vh]">
            <div
              id="voucher-a4-document"
              ref={printRef}
              className="bg-white w-full max-w-[210mm] min-h-[297mm] shadow-2xl border border-slate-300 p-8 sm:p-12 flex flex-col justify-between text-slate-900 rounded-xs print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:max-w-none text-xs"
              style={{ minHeight: '270mm' }}
            >
              {/* TOP CONTENT WRAPPER */}
              <div className="space-y-5">
                {/* 1. OFFICIAL INSTITUTE LETTERHEAD WITH LOGO */}
                <div className="flex items-start justify-between gap-6 pb-4 border-b-2 border-slate-900">
                  {/* Left: Institute Logo & Branding */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                      <img
                        src="/logo_white_bg.png"
                        alt="Institute Logo"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-full h-full bg-blue-900 text-white flex flex-col items-center justify-center rounded-lg font-display">
                                <span class="text-xs font-black tracking-wider">ACI</span>
                                <span class="text-[8px] uppercase tracking-widest text-blue-200">ACADEMY</span>
                              </div>
                            `;
                          }
                        }}
                      />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black font-display text-slate-900 uppercase tracking-tight leading-tight">
                        {currentUser?.tenantName || 'ALLEN CAREER INSTITUTE'}
                      </h2>
                      <p className="text-[11px] font-bold text-blue-800 tracking-wide uppercase mt-0.5">
                        Premier Institute for JEE (Main+Adv) | NEET-UG | Foundation Courses
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        <span className="font-semibold text-slate-700">Campus:</span> {selectedSlipVoucher.branch || currentUser?.branch || 'Mumbai West Campus'} &bull; Accounts & Finance Department
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        GSTIN: 27AABCA1234F1Z8 &bull; PAN: AABCA1234F &bull; CIN: U80903MH2021PTC123456
                      </p>
                    </div>
                  </div>

                  {/* Right: Document Identification & Seal */}
                  <div className="text-right shrink-0">
                    <div className="inline-block bg-slate-900 text-white font-mono text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded">
                      {selectedSlipVoucher.direction === 'Debit' ? 'PAYMENT VOUCHER' : 'RECEIPT VOUCHER'}
                    </div>
                    <div className="mt-2 text-right">
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Voucher Serial No</span>
                      <span className="font-mono font-black text-sm text-blue-700 tracking-tight">
                        {selectedSlipVoucher.id}
                      </span>
                    </div>
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Check size={10} />
                        CLEARED & RECORDED
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. VOUCHER METADATA GRID */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs font-medium">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Date of Issue</span>
                    <span className="font-mono font-bold text-slate-900">{formatDate(selectedSlipVoucher.date)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Payment Mode</span>
                    <span className="font-semibold text-slate-900">{selectedSlipVoucher.paymentMethod}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Instrument / Ref No</span>
                    <span className="font-mono font-semibold text-slate-800">{selectedSlipVoucher.referenceNo || 'REF-N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Financial Year</span>
                    <span className="font-mono font-semibold text-slate-900">2026 - 2027</span>
                  </div>
                </div>

                {/* 3. DOUBLE-ENTRY ACCOUNTING PARTICULARS TABLE */}
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        <th className="py-2.5 px-3 w-12 text-center">Sr.</th>
                        <th className="py-2.5 px-3">Account Head & Particulars</th>
                        <th className="py-2.5 px-3 w-28 text-center">Account Head</th>
                        <th className="py-2.5 px-4 w-36 text-right">Debit (₹)</th>
                        <th className="py-2.5 px-4 w-36 text-right">Credit (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {/* Debit Line */}
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 text-center font-mono text-slate-400">01</td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 text-sm">
                            {selectedSlipVoucher.category} Expenses A/c
                          </div>
                          <div className="text-slate-600 mt-0.5">
                            <span className="font-semibold text-slate-500">Paid to:</span> <strong className="text-slate-800">{selectedSlipVoucher.paidTo}</strong>
                          </div>
                          <div className="text-[11px] text-slate-500 italic mt-0.5">
                            Narration: {selectedSlipVoucher.description}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-500">
                          {selectedSlipVoucher.category.toUpperCase().slice(0, 4)}-01
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {selectedSlipVoucher.direction === 'Debit' ? `₹${selectedSlipVoucher.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">
                          {selectedSlipVoucher.direction === 'Credit' ? `₹${selectedSlipVoucher.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                      </tr>

                      {/* Corresponding Contra / Bank Line */}
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 text-center font-mono text-slate-400">02</td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">
                            To {selectedSlipVoucher.paymentMethod} / Operating Clearing Account
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            Instrument Ref: {selectedSlipVoucher.referenceNo || 'N/A'} &bull; Cleared on {formatDate(selectedSlipVoucher.date)}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-500">
                          BANK-OPS-01
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">
                          {selectedSlipVoucher.direction === 'Credit' ? `₹${selectedSlipVoucher.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {selectedSlipVoucher.direction === 'Debit' ? `₹${selectedSlipVoucher.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                      </tr>

                      {/* Total Bar */}
                      <tr className="bg-slate-50/80 font-bold border-t-2 border-slate-900">
                        <td colSpan={3} className="py-2.5 px-3 text-right uppercase text-[11px] tracking-wider text-slate-700">
                          Total Amount (INR)
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-black text-slate-900">
                          ₹{selectedSlipVoucher.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-black text-slate-900">
                          ₹{selectedSlipVoucher.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 4. AMOUNT IN WORDS BOX */}
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg flex items-start gap-3">
                  <div className="text-[11px] font-black uppercase tracking-wider text-blue-900 shrink-0 pt-0.5">
                    Amount in Words:
                  </div>
                  <div className="font-serif italic font-bold text-sm text-blue-900 leading-snug">
                    {numberToIndianWords(selectedSlipVoucher.amount)}
                  </div>
                </div>

                {/* 5. NARRATION & AUDIT VERIFICATION */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-[11px]">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">Narration & Remarks:</span>
                  <p className="text-slate-700 leading-relaxed">
                    Passed for payment / receipt towards <strong>{selectedSlipVoucher.category}</strong>. Recorded under cost center <strong>{selectedSlipVoucher.branch || currentUser?.branch || 'Mumbai West'}</strong>. Paid to / received from <strong>{selectedSlipVoucher.paidTo}</strong> via {selectedSlipVoucher.paymentMethod} (Ref ID: {selectedSlipVoucher.referenceNo || 'N/A'}).
                  </p>
                </div>
              </div>

              {/* BOTTOM CONTENT WRAPPER: SIGNATORIES & LEGAL FOOTER */}
              <div className="mt-12 pt-6 border-t border-slate-300 space-y-8">
                {/* 4 Formal Signatory Columns */}
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="h-14 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                      <span className="text-xs font-bold text-slate-800">{currentUser?.name || 'Accountant'}</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mt-1 block">Prepared By</span>
                    <span className="text-[9px] text-slate-400 font-mono">Accounts Officer</span>
                  </div>

                  <div>
                    <div className="h-14 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                      <span className="text-xs font-serif italic text-slate-400">Verified & Audited</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mt-1 block">Checked By</span>
                    <span className="text-[9px] text-slate-400 font-mono">Internal Auditor</span>
                  </div>

                  <div>
                    <div className="h-14 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                      <div className="w-12 h-12 rounded-full border border-blue-200 bg-blue-50/50 flex items-center justify-center text-[9px] font-bold text-blue-800 uppercase tracking-tighter">
                        PASSED
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mt-1 block">Authorized Signatory</span>
                    <span className="text-[9px] text-slate-400 font-mono">Finance Director / Principal</span>
                  </div>

                  <div>
                    <div className="h-14 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                      <span className="text-xs font-serif italic text-slate-400">Payee Signature</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mt-1 block">Receiver's Signature</span>
                    <span className="text-[9px] text-slate-400 font-mono">{selectedSlipVoucher.paidTo}</span>
                  </div>
                </div>

                {/* Legal Security & A4 Page Footer */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400 font-mono">
                  <span>This is a computer generated accounting voucher document from Vidyasetu ERP.</span>
                  <span>Doc Hash: {selectedSlipVoucher.id}-{Date.now().toString().slice(-6)}</span>
                  <span>Page 1 of 1 (A4)</span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteConfirmVoucher)}
        onClose={() => !isDeleting && setDeleteConfirmVoucher(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Voucher"
        itemType="accounting voucher"
        itemName={deleteConfirmVoucher?.id}
        description="Deleting this voucher will permanently remove it from the accounting ledger. This action cannot be reversed."
        isLoading={isDeleting}
      />
    </div>
  );
};
