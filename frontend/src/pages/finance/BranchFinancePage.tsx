import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building2,
  Users,
  Zap,
  BookOpen,
  Wrench,
  Megaphone,
  Truck,
  Phone,
  FileText,
  Briefcase,
  Layers,
  Calendar,
  Clock,
  AlertTriangle,
  AlertCircle,
  BarChart3,
  PieChart,
  ArrowRightLeft,
  Settings,
  Tag,
  CreditCard,
  Plus,
  Search,
  Download,
  Filter,
  CheckCircle2,
  Trash2,
  Eye,
  Pencil,
  Loader2,
  Wallet,
  RotateCcw,
  Receipt,
  RefreshCw,
  Printer,
  Sparkles
} from 'lucide-react';
import { formatDate as fmtDate } from '../../utils/dateFormatter';
import {
  otherIncomeApi,
  type OtherIncomeRecord,
  type OtherIncomeSummary
} from '../../services/otherIncomeApi';
import {
  otherExpenseApi,
  type OtherExpenseRecord,
  type OtherExpenseSummary,
  STATUS_MAP,
  EXPENSE_CATEGORIES
} from '../../services/otherExpenseApi';
import { getAcademicOptions } from '../../services/studentApi';
import { StaffSalaryMasterView } from '../../components/finance/StaffSalaryMasterView';
import { StaffSalaryStatusView } from '../../components/finance/StaffSalaryStatusView';

const fmt = (n: number) => '₹' + (Number(n) || 0).toLocaleString('en-IN');

interface FinanceRecord {
  id: string;
  title: string;
  category: string;
  subCategory?: string;
  amount: number;
  paidAmount?: number;
  dueAmount?: number;
  date: string;
  dueDate?: string;
  paymentMode?: string;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Partially Paid' | 'Approved' | 'Draft';
  reference?: string;
  recipient?: string;
  notes?: string;
}

export const BranchFinancePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { section, subSection } = useParams<{ section?: string; subSection?: string }>();
  const { currentUser, addToast } = useApp();

  const currentPath = location.pathname;
  const isOtherIncome = currentPath.includes('/income/other');
  const isOtherExpense = currentPath.includes('/expenses/other');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [branchOptions, setBranchOptions] = useState<{ value: string; label: string }[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Other Income specific state
  const [otherIncomes, setOtherIncomes] = useState<OtherIncomeRecord[]>([]);
  const [otherIncomeLoading, setOtherIncomeLoading] = useState(false);
  const [otherIncomeSummary, setOtherIncomeSummary] = useState<OtherIncomeSummary>({
    totalCount: 0,
    totalAmount: 0,
    todayAmount: 0,
    thisMonthAmount: 0
  });
  const [otherIncomePage, setOtherIncomePage] = useState(1);
  const [otherIncomeTotal, setOtherIncomeTotal] = useState(0);
  const otherIncomeLimit = 10;

  // Other Expense specific state
  const [otherExpenses, setOtherExpenses] = useState<OtherExpenseRecord[]>([]);
  const [otherExpenseLoading, setOtherExpenseLoading] = useState(false);
  const [otherExpenseSummary, setOtherExpenseSummary] = useState<OtherExpenseSummary>({
    totalCount: 0,
    totalAmount: 0,
    todayAmount: 0,
    thisMonthAmount: 0,
    pendingAmount: 0,
    paidAmount: 0
  });
  const [otherExpensePage, setOtherExpensePage] = useState(1);
  const [otherExpenseTotal, setOtherExpenseTotal] = useState(0);
  const otherExpenseLimit = 10;
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [expenseStatusFilter, setExpenseStatusFilter] = useState('All');

  // Delete Modal for Other Expense
  const [deletingExpenseRecord, setDeletingExpenseRecord] = useState<OtherExpenseRecord | null>(null);

  // Modals for Other Income View/Edit/Delete
  const [viewingRecord, setViewingRecord] = useState<OtherIncomeRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<OtherIncomeRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<OtherIncomeRecord | null>(null);
  const [submittingForm, setSubmittingForm] = useState(false);

  // Form State
  const [formBranchId, setFormBranchId] = useState<string>('');
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formRecipient, setFormRecipient] = useState('');
  const [formPaymentMode, setFormPaymentMode] = useState('bank_transfer');
  const [formReference, setFormReference] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formCategory, setFormCategory] = useState('Other Expenses');
  const [formPayee, setFormPayee] = useState('');
  const [formStatus, setFormStatus] = useState<number>(0);

  // Load Branch dropdown options
  useEffect(() => {
    const loadAcademic = async () => {
      try {
        const opts = await getAcademicOptions();
        if (opts?.branches && Array.isArray(opts.branches)) {
          const bOpts = opts.branches.map((b: any) => ({
            value: String(b.id),
            label: b.name
          }));
          
          const userBranchId = currentUser?.branchId ? String(currentUser.branchId) : null;
          
          setBranchOptions([{ value: 'All', label: 'All Branches' }, ...bOpts]);

          if (userBranchId) {
            setBranchFilter(userBranchId);
            setFormBranchId(userBranchId);
          } else if (bOpts.length > 0) {
            setFormBranchId(String(bOpts[0].value));
          }
        }
      } catch (e) {
        console.warn('Failed to load academic branch options', e);
      }
    };
    loadAcademic();
  }, [currentUser]);

  // Fetch other income records from backend
  const fetchOtherIncomes = useCallback(async (pg = otherIncomePage) => {
    if (!isOtherIncome) return;
    try {
      setOtherIncomeLoading(true);
      const res = await otherIncomeApi.getOtherIncomes({
        search: searchTerm,
        branchId: branchFilter !== 'All' ? branchFilter : undefined,
        paymentMode: statusFilter !== 'All' ? statusFilter : undefined,
        page: pg,
        limit: otherIncomeLimit
      });
      setOtherIncomes(res.records || []);
      setOtherIncomeTotal(res.total || 0);
      if (res.summary) {
        setOtherIncomeSummary(res.summary);
      }
    } catch (err: any) {
      console.error('Failed to fetch other income:', err);
      addToast(err?.response?.data?.message || 'Failed to load other income records', 'error');
    } finally {
      setOtherIncomeLoading(false);
    }
  }, [isOtherIncome, otherIncomePage, searchTerm, branchFilter, statusFilter, addToast]);

  useEffect(() => {
    if (isOtherIncome) {
      fetchOtherIncomes(1);
      setOtherIncomePage(1);
    }
  }, [isOtherIncome, searchTerm, branchFilter, statusFilter]);

  // Fetch other expense records from backend
  const fetchOtherExpenses = useCallback(async (pg = otherExpensePage) => {
    if (!isOtherExpense) return;
    try {
      setOtherExpenseLoading(true);
      const res = await otherExpenseApi.getOtherExpenses({
        search: searchTerm,
        branchId: branchFilter !== 'All' ? branchFilter : undefined,
        paymentMode: statusFilter !== 'All' ? statusFilter : undefined,
        category: categoryFilter !== 'All' ? categoryFilter : undefined,
        status: expenseStatusFilter !== 'All' ? expenseStatusFilter : undefined,
        page: pg,
        limit: otherExpenseLimit
      });
      setOtherExpenses(res.records || []);
      setOtherExpenseTotal(res.total || 0);
      if (res.summary) {
        setOtherExpenseSummary(res.summary);
      }
    } catch (err: any) {
      console.error('Failed to fetch other expenses:', err);
      addToast(err?.response?.data?.message || 'Failed to load other expense records', 'error');
    } finally {
      setOtherExpenseLoading(false);
    }
  }, [isOtherExpense, otherExpensePage, searchTerm, branchFilter, statusFilter, categoryFilter, expenseStatusFilter, addToast]);

  useEffect(() => {
    if (isOtherExpense) {
      fetchOtherExpenses(1);
      setOtherExpensePage(1);
    }
  }, [isOtherExpense, searchTerm, branchFilter, statusFilter, categoryFilter, expenseStatusFilter]);

  // Determine active view from URL
  const viewInfo = useMemo(() => {
    // ── INCOME ──
    if (currentPath.includes('/income/other')) {
      return {
        module: 'Income',
        title: 'Other Income',
        subtitle: 'Track non-fee branch revenue including classroom rentals, study materials, workshops, and grants.',
        icon: DollarSign,
        color: 'emerald',
        defaultCategory: 'Other Income'
      };
    }

    // ── EXPENSES ──
    if (currentPath.includes('/expenses/salaries')) {
      return {
        module: 'Expenses',
        title: 'Staff Salaries',
        subtitle: 'Monthly disbursement logs, teacher remuneration, and administrative payroll expenses.',
        icon: Users,
        color: 'blue',
        defaultCategory: 'Staff Salaries'
      };
    }
    if (currentPath.includes('/expenses/rent')) {
      return {
        module: 'Expenses',
        title: 'Campus & Facility Rent',
        subtitle: 'Premises lease payments, branch rental agreements, and security deposits.',
        icon: Building2,
        color: 'indigo',
        defaultCategory: 'Rent'
      };
    }
    if (currentPath.includes('/expenses/utilities')) {
      return {
        module: 'Expenses',
        title: 'Electricity & Utilities',
        subtitle: 'Power grid bills, water supply, air conditioning, and municipal charges.',
        icon: Zap,
        color: 'amber',
        defaultCategory: 'Electricity / Utilities'
      };
    }
    if (currentPath.includes('/expenses/stationery')) {
      return {
        module: 'Expenses',
        title: 'Stationery & Printing',
        subtitle: 'Workbooks, examination papers, office supplies, and classroom consumables.',
        icon: BookOpen,
        color: 'purple',
        defaultCategory: 'Stationery'
      };
    }
    if (currentPath.includes('/expenses/maintenance')) {
      return {
        module: 'Expenses',
        title: 'Repairs & Maintenance',
        subtitle: 'Facility servicing, equipment repairs, janitorial, and electrical upkeep.',
        icon: Wrench,
        color: 'slate',
        defaultCategory: 'Maintenance'
      };
    }
    if (currentPath.includes('/expenses/marketing')) {
      return {
        module: 'Expenses',
        title: 'Marketing & Advertising',
        subtitle: 'Digital campaigns, hoardings, brochures, seminar branding, and promotional outreach.',
        icon: Megaphone,
        color: 'rose',
        defaultCategory: 'Marketing'
      };
    }
    if (currentPath.includes('/expenses/transport')) {
      return {
        module: 'Expenses',
        title: 'Student & Staff Transport',
        subtitle: 'Fleet fuel, bus leases, driver compensations, and route maintenance vouchers.',
        icon: Truck,
        color: 'emerald',
        defaultCategory: 'Transport'
      };
    }
    if (currentPath.includes('/expenses/internet-phone')) {
      return {
        module: 'Expenses',
        title: 'Internet & Phone Lines',
        subtitle: 'Broadband optical fiber, telephony, telecom bills, and SMS gateway top-ups.',
        icon: Phone,
        color: 'cyan',
        defaultCategory: 'Internet / Phone'
      };
    }
    if (currentPath.includes('/expenses/other')) {
      return {
        module: 'Expenses',
        title: 'Other Expenses',
        subtitle: 'Miscellaneous operational expenses, petty cash vouchers, and emergency overheads.',
        icon: FileText,
        color: 'slate',
        defaultCategory: 'Other Expenses'
      };
    }

    // ── STAFF PAYROLL ──
    if (currentPath.includes('/payroll/structure')) {
      return {
        module: 'Staff Payroll',
        title: 'Salary Structure',
        subtitle: 'Base salary bands, performance allowances, HRA, PF, and tax deduction configurations.',
        icon: Layers,
        color: 'blue',
        defaultCategory: 'Salary Structure'
      };
    }
    if (currentPath.includes('/payroll/monthly')) {
      return {
        module: 'Staff Payroll',
        title: 'Monthly Payroll',
        subtitle: 'Active payroll run for current month, salary processing, and payment status.',
        icon: Calendar,
        color: 'emerald',
        defaultCategory: 'Monthly Payroll'
      };
    }

    // ── PAYABLES ──
    if (currentPath.includes('/payables/salaries')) {
      return {
        module: 'Payables',
        title: 'Pending Salaries',
        subtitle: 'Queued staff salaries, pending bonus approvals, and holdback disbursements.',
        icon: Users,
        color: 'amber',
        defaultCategory: 'Pending Salaries'
      };
    }
    if (currentPath.includes('/payables/vendors')) {
      return {
        module: 'Payables',
        title: 'Vendor Bills',
        subtitle: 'Outstanding supplier invoices, facility equipment contractors, and supply orders.',
        icon: FileText,
        color: 'rose',
        defaultCategory: 'Vendor Bills'
      };
    }
    if (currentPath.includes('/payables/other')) {
      return {
        module: 'Payables',
        title: 'Other Outstanding',
        subtitle: 'Refund claims, security deposits due for return, and pending reimbursements.',
        icon: AlertCircle,
        color: 'rose',
        defaultCategory: 'Other Outstanding'
      };
    }

    // ── REPORTS ──
    if (currentPath.includes('/reports/income')) {
      return {
        module: 'Reports',
        title: 'Income Report',
        subtitle: 'Detailed revenue statements, collection trends, and fee category distribution.',
        icon: TrendingUp,
        color: 'emerald',
        defaultCategory: 'Income Report'
      };
    }
    if (currentPath.includes('/reports/expense')) {
      return {
        module: 'Reports',
        title: 'Expense Report',
        subtitle: 'Cost centre breakdowns, monthly burn rates, and vendor settlement logs.',
        icon: TrendingDown,
        color: 'rose',
        defaultCategory: 'Expense Report'
      };
    }
    if (currentPath.includes('/reports/fee-outstanding')) {
      return {
        module: 'Reports',
        title: 'Fee Outstanding Report',
        subtitle: 'Student fee aging report, defaulter breakdown, and overdue collection targets.',
        icon: AlertTriangle,
        color: 'rose',
        defaultCategory: 'Fee Outstanding'
      };
    }
    if (currentPath.includes('/reports/profit-loss')) {
      return {
        module: 'Reports',
        title: 'Profit & Loss Statement',
        subtitle: 'Net operational margins, revenue vs operating expenses balance ledger.',
        icon: BarChart3,
        color: 'blue',
        defaultCategory: 'Profit / Loss'
      };
    }
    if (currentPath.includes('/reports/cash-flow')) {
      return {
        module: 'Reports',
        title: 'Cash Flow Statements',
        subtitle: 'Real-time liquidity, daily cash inflows and outflows reconciliation.',
        icon: PieChart,
        color: 'emerald',
        defaultCategory: 'Cash Flow'
      };
    }

    // ── FINANCE SETTINGS ──
    if (currentPath.includes('/settings/expense-categories')) {
      return {
        module: 'Finance Settings',
        title: 'Expense Categories',
        subtitle: 'Manage custom chart of accounts, expense codes, and cost centres.',
        icon: Tag,
        color: 'indigo',
        defaultCategory: 'Expense Categories'
      };
    }
    if (currentPath.includes('/settings/payment-modes')) {
      return {
        module: 'Finance Settings',
        title: 'Payment Modes & Gateways',
        subtitle: 'Configure branch bank accounts, UPI IDs, POS terminals, and cash registers.',
        icon: CreditCard,
        color: 'slate',
        defaultCategory: 'Payment Modes'
      };
    }

    return {
      module: 'Finance Overview',
      title: 'Branch Finance Ledger',
      subtitle: 'Financial ledger and accounting management.',
      icon: DollarSign,
      color: 'blue',
      defaultCategory: 'General'
    };
  }, [currentPath]);

  // Standard static records for demo expense views
  const [records, setRecords] = useState<FinanceRecord[]>([
    {
      id: 'FIN-2026-081',
      title: 'Classroom & Auditorium Rental',
      category: 'Other Income',
      amount: 45000,
      paidAmount: 45000,
      dueAmount: 0,
      date: '2026-09-12',
      paymentMode: 'Bank Transfer',
      status: 'Paid',
      reference: 'TXN891245',
      recipient: 'EduCorp Seminars',
      notes: 'Weekend workshop booking'
    },
    {
      id: 'FIN-2026-082',
      title: 'Study Material & Revision Guides',
      category: 'Other Income',
      amount: 28500,
      paidAmount: 28500,
      dueAmount: 0,
      date: '2026-09-10',
      paymentMode: 'UPI',
      status: 'Paid',
      reference: 'UPI/984251/SETU',
      recipient: 'Direct Student Sales'
    },
    {
      id: 'FIN-2026-083',
      title: 'Corporate CSR Sponsorship Grant',
      category: 'Other Income',
      amount: 150000,
      paidAmount: 150000,
      dueAmount: 0,
      date: '2026-09-05',
      paymentMode: 'Bank Transfer',
      status: 'Paid',
      reference: 'NEFT-CSR-782190',
      recipient: 'Tata Trust CSR Grant'
    }
  ]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.recipient && r.recipient.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.reference && r.reference.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === 'All' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [records, searchTerm, statusFilter]);

  const metrics = useMemo(() => {
    const total = records.reduce((s, r) => s + r.amount, 0);
    const paid = records.reduce((s, r) => s + (r.paidAmount || 0), 0);
    const due = records.reduce((s, r) => s + (r.dueAmount || 0), 0);
    return { total, paid, due, count: records.length };
  }, [records]);

  // Open Create Modal
  const openAddModal = () => {
    setFormBranchId(branchOptions.find(b => b.value !== 'All')?.value || '1');
    setFormTitle('');
    setFormAmount('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormRecipient('');
    setFormPaymentMode('bank_transfer');
    setFormReference('');
    setFormNotes('');
    setFormCategory('Other Expenses');
    setFormPayee('');
    setFormStatus(0);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal for Other Income
  const openEditModal = (rec: OtherIncomeRecord) => {
    setEditingRecord(rec);
    setFormBranchId(String(rec.branch_id || '1'));
    setFormTitle(rec.title);
    setFormAmount(String(rec.amount));
    setFormDate(rec.income_date);
    setFormPaymentMode(rec.payment_mode || 'bank_transfer');
    setFormReference(rec.reference_number || '');
    setFormNotes(rec.description || '');
  };

  // Handle Create / Submit
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(formAmount);
    if (!formTitle.trim()) {
      addToast(isOtherExpense ? 'Please enter an expense title' : 'Please enter an income title', 'error');
      return;
    }
    if (!amt || amt <= 0) {
      addToast('Please enter a valid amount greater than zero', 'error');
      return;
    }

    try {
      setSubmittingForm(true);
      if (isOtherIncome) {
        if (editingRecord) {
          const updated = await otherIncomeApi.updateOtherIncome(editingRecord.id, {
            branchId: formBranchId ? Number(formBranchId) : undefined,
            title: formTitle.trim(),
            amount: amt,
            incomeDate: formDate,
            paymentMode: formPaymentMode,
            referenceNumber: formReference.trim() || undefined,
            description: formNotes.trim() || undefined
          });
          addToast(`Income record ${updated.income_record_number} updated successfully`, 'success');
          setEditingRecord(null);
        } else {
          const chosenBranch = formBranchId || currentUser?.branch_id || (currentUser?.branch as any)?.id || 1;
          const created = await otherIncomeApi.createOtherIncome({
            branchId: Number(chosenBranch),
            title: formTitle.trim(),
            amount: amt,
            incomeDate: formDate,
            paymentMode: formPaymentMode,
            referenceNumber: formReference.trim() || undefined,
            description: formNotes.trim() || undefined
          });
          addToast(`Income record ${created.income_record_number} recorded for ${fmt(amt)}`, 'success');
          setIsAddModalOpen(false);
        }
        await fetchOtherIncomes(otherIncomePage);
      } else if (isOtherExpense) {
        const chosenBranch = formBranchId || currentUser?.branch_id || (currentUser?.branch as any)?.id || 1;
        const created = await otherExpenseApi.createOtherExpense({
          branchId: Number(chosenBranch),
          title: formTitle.trim(),
          amount: amt,
          expenseDate: formDate,
          category: formCategory,
          status: formStatus,
          paymentMode: formPaymentMode,
          referenceNumber: formReference.trim() || undefined,
          description: formNotes.trim() || undefined,
          payee: formPayee.trim() || undefined
        });
        addToast(`Expense record ${created.expense_record_number} recorded for ${fmt(amt)}`, 'success');
        setIsAddModalOpen(false);
        await fetchOtherExpenses(otherExpensePage);
      } else {
        // Mock expense/section handler
        const newRecord: FinanceRecord = {
          id: `FIN-2026-${Math.floor(100 + Math.random() * 900)}`,
          title: formTitle.trim(),
          category: viewInfo.defaultCategory,
          amount: amt,
          paidAmount: amt,
          dueAmount: 0,
          date: formDate,
          paymentMode: formPaymentMode,
          status: 'Paid',
          reference: formReference.trim() || `REF-${Date.now().toString().slice(-6)}`,
          recipient: formRecipient.trim() || 'Branch Payee',
          notes: formNotes.trim() || undefined
        };
        setRecords(prev => [newRecord, ...prev]);
        addToast(`${viewInfo.title} entry recorded for ${fmt(amt)}`, 'success');
        setIsAddModalOpen(false);
      }
    } catch (err: any) {
      console.error('Save failed:', err);
      addToast(err?.response?.data?.message || err?.message || 'Failed to save record', 'error');
    } finally {
      setSubmittingForm(false);
    }
  };

  // Handle Delete Confirmation
  const confirmDeleteRecord = async () => {
    if (!deletingRecord) return;
    try {
      setSubmittingForm(true);
      await otherIncomeApi.deleteOtherIncome(deletingRecord.id);
      addToast(`Income record ${deletingRecord.income_record_number} deleted successfully`, 'success');
      setDeletingRecord(null);
      await fetchOtherIncomes(otherIncomePage);
    } catch (err: any) {
      console.error('Delete failed:', err);
      addToast(err?.response?.data?.message || 'Failed to delete record', 'error');
    } finally {
      setSubmittingForm(false);
    }
  };

  // Handle Expense Delete Confirmation
  const confirmDeleteExpenseRecord = async () => {
    if (!deletingExpenseRecord) return;
    try {
      setSubmittingForm(true);
      await otherExpenseApi.deleteOtherExpense(deletingExpenseRecord.id);
      addToast(`Expense record ${deletingExpenseRecord.expense_record_number} deleted successfully`, 'success');
      setDeletingExpenseRecord(null);
      await fetchOtherExpenses(otherExpensePage);
    } catch (err: any) {
      console.error('Delete failed:', err);
      addToast(err?.response?.data?.message || 'Failed to delete expense record', 'error');
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleExportCSV = () => {
    if (isOtherIncome) {
      if (otherIncomes.length === 0) {
        addToast('No other income records to export', 'error');
        return;
      }
      const dataToExport = otherIncomes.map(r => ({
        'Record Number': r.income_record_number,
        'Title': r.title,
        'Amount (INR)': r.amount,
        'Date': fmtDate(r.income_date),
        'Payment Mode': (r.payment_mode || '').replace(/_/g, ' ').toUpperCase(),
        'Reference #': r.reference_number || '—',
        'Description': r.description || '',
        'Branch': r.branch_name || ''
      }));
      const headers = Object.keys(dataToExport[0]);
      const csvRows = [headers.join(',')];
      for (const row of dataToExport) {
        const vals = headers.map(h => `"${('' + (row as any)[h]).replace(/"/g, '\\"')}"`);
        csvRows.push(vals.join(','));
      }
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `other_income_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('Other income statement exported to CSV', 'success');
    } else if (isOtherExpense) {
      if (otherExpenses.length === 0) {
        addToast('No other expense records to export', 'error');
        return;
      }
      const dataToExport = otherExpenses.map(r => ({
        'Record Number': r.expense_record_number,
        'Title': r.title,
        'Category': r.category,
        'Amount (INR)': r.amount,
        'Date': fmtDate(r.expense_date),
        'Status': STATUS_MAP[r.status]?.label || 'Pending',
        'Payment Mode': (r.payment_mode || '').replace(/_/g, ' ').toUpperCase(),
        'Payee': r.payee || '—',
        'Reference #': r.reference_number || '—',
        'Description': r.description || '',
        'Branch': r.branch_name || ''
      }));
      const headers = Object.keys(dataToExport[0]);
      const csvRows = [headers.join(',')];
      for (const row of dataToExport) {
        const vals = headers.map(h => `"${('' + (row as any)[h]).replace(/"/g, '\\"')}"`);
        csvRows.push(vals.join(','));
      }
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `other_expenses_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('Other expense statement exported to CSV', 'success');
    } else {
      addToast('Exporting finance statement to CSV...', 'info');
    }
  };

  const IconComponent = viewInfo.icon;
  const totalOtherPages = Math.ceil(otherIncomeTotal / otherIncomeLimit) || 1;
  const totalOtherExpensePages = Math.ceil(otherExpenseTotal / otherExpenseLimit) || 1;

  const otherIncomePageSum = useMemo(() => {
    return otherIncomes.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }, [otherIncomes]);

  const otherExpensePageSum = useMemo(() => {
    return otherExpenses.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }, [otherExpenses]);

  const hasActiveFilters = Boolean(
    searchTerm ||
    (branchFilter !== 'All' && branchOptions.length > 1) ||
    statusFilter !== 'All' ||
    (isOtherExpense && (categoryFilter !== 'All' || expenseStatusFilter !== 'All'))
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setBranchFilter('All');
    setStatusFilter('All');
    setCategoryFilter('All');
    setExpenseStatusFilter('All');
  };

  const handleRefresh = () => {
    if (isOtherIncome) {
      fetchOtherIncomes(otherIncomePage);
    } else if (isOtherExpense) {
      fetchOtherExpenses(otherExpensePage);
    }
  };

  const renderPaymentModeBadge = (mode?: string) => {
    const m = (mode || 'bank_transfer').toLowerCase().trim();
    if (m === 'upi') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200/80 text-[11px] font-bold">
          <CreditCard size={11} className="text-violet-500" />
          UPI / GPay
        </span>
      );
    }
    if (m === 'cash') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-bold">
          <Wallet size={11} className="text-emerald-500" />
          Cash
        </span>
      );
    }
    if (m === 'cheque') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 text-[11px] font-bold">
          <FileText size={11} className="text-amber-500" />
          Cheque
        </span>
      );
    }
    if (m === 'card') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200/80 text-[11px] font-bold">
          <CreditCard size={11} className="text-sky-500" />
          Card
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 text-[11px] font-bold">
        <ArrowRightLeft size={11} className="text-blue-500" />
        Bank Transfer
      </span>
    );
  };

  const [isSalaryDetailActive, setIsSalaryDetailActive] = useState<boolean>(false);

  const isSalaryStructure = currentPath.includes('/payroll/structure') || currentPath.includes('/salary-structure');
  const isSalaryStatus = currentPath.includes('/payroll/monthly') || currentPath.includes('/expenses/salaries') || currentPath.includes('/salary-status');
  const handleSalaryDetailViewChange = useCallback((isActive: boolean) => {
    setIsSalaryDetailActive(isActive);
    window.scrollTo({ top: 0, behavior: 'instant' });
    const mainContainer = document.getElementById('main-scroll-container');
    if (mainContainer) {
      mainContainer.scrollTop = 0;
    }
  }, []);

  if (isSalaryStructure || isSalaryStatus) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* ── Page Title Header & Tabs (Hidden when viewing history or editing salary) ── */}
        {!isSalaryDetailActive && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/80">
                    <Users size={12} className="text-indigo-600 shrink-0" />
                    Payroll Operations • Staff Compensation
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 tracking-tight">Staff Salaries & Payroll</h2>
                <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                  Master compensation structure, monthly disbursement logs, and branch payroll operations
                </p>
              </div>

              {branchOptions.length > 2 && (
                <div className="w-full sm:w-64">
                  <Select
                    label=""
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    options={branchOptions}
                  />
                </div>
              )}
            </div>

            {/* Sub-Navigation Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 w-fit">
              <button
                type="button"
                onClick={() => navigate('/finance/payroll/structure')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isSalaryStructure
                    ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Briefcase size={14} className={isSalaryStructure ? 'text-indigo-600' : 'text-slate-400'} />
                Salary Structure (Master)
              </button>
              <button
                type="button"
                onClick={() => navigate('/finance/expenses/salaries')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isSalaryStatus
                    ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Calendar size={14} className={isSalaryStatus ? 'text-indigo-600' : 'text-slate-400'} />
                Monthly Salary Operations
              </button>
            </div>
          </div>
        )}

        {isSalaryStructure ? (
          <StaffSalaryMasterView
            branchFilter={branchFilter}
            branchOptions={branchOptions}
            onBranchChange={setBranchFilter}
            onNavigateToStatus={() => navigate('/finance/expenses/salaries')}
            onDetailViewChange={handleSalaryDetailViewChange}
          />
        ) : (
          <StaffSalaryStatusView
            branchFilter={branchFilter}
            branchOptions={branchOptions}
            onBranchChange={setBranchFilter}
            onNavigateToMaster={() => navigate('/finance/payroll/structure')}
            onDetailViewChange={handleSalaryDetailViewChange}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
              isOtherIncome
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200/80'
                : isOtherExpense
                ? 'text-rose-700 bg-rose-50 border-rose-200/80'
                : 'text-indigo-700 bg-indigo-50 border-indigo-200/80'
            }`}>
              {isOtherIncome ? (
                <TrendingUp size={12} className="text-emerald-600 shrink-0" />
              ) : isOtherExpense ? (
                <TrendingDown size={12} className="text-rose-600 shrink-0" />
              ) : (
                <IconComponent size={12} className="text-indigo-600 shrink-0" />
              )}
              {isOtherIncome ? 'Income Registry • Non-Fee Revenue' : isOtherExpense ? 'Expense Operations • Branch Cash Outflows' : `${viewInfo.module} • Branch Operations`}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 tracking-tight">{viewInfo.title}</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">{viewInfo.subtitle}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleRefresh}
            disabled={isOtherIncome ? otherIncomeLoading : otherExpenseLoading}
            className="flex items-center gap-1.5 font-bold shadow-2xs"
          >
            <RefreshCw size={14} className={otherIncomeLoading || otherExpenseLoading ? 'animate-spin' : ''} /> Refresh
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 font-bold shadow-2xs"
          >
            <Download size={14} /> Export CSV
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={isOtherExpense ? () => navigate('/finance/expenses/other/new') : openAddModal}
            className="flex items-center gap-1.5 font-bold shadow-xs"
          >
            <Plus size={15} /> {isOtherExpense ? 'Record Expense' : 'Record Income'}
          </Button>
        </div>
      </div>

      {/* ── 4 KPI Financial Metric Cards ── */}
      {isOtherIncome ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Other Income */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-slate-300 hover:shadow-sm transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Other Income
              </span>
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200/80 shadow-2xs group-hover:scale-105 transition-transform">
                <Wallet size={16} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 mt-2 tracking-tight">
              {fmt(otherIncomeSummary.totalAmount)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100/90">
              <span>Cumulative non-fee revenue</span>
              <span className="font-semibold text-slate-600 font-mono">All-time</span>
            </div>
          </div>

          {/* Card 2: Today's Receipts */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-emerald-300 hover:shadow-sm transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Today's Receipts
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/80 shadow-2xs group-hover:scale-105 transition-transform">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 mt-2 tracking-tight">
              {fmt(otherIncomeSummary.todayAmount)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100/90">
              <span>Received on {fmtDate(new Date())}</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            </div>
          </div>

          {/* Card 3: This Month's Receipts */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-blue-300 hover:shadow-sm transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                This Month's Receipts
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/80 shadow-2xs group-hover:scale-105 transition-transform">
                <Calendar size={16} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-blue-700 mt-2 tracking-tight">
              {fmt(otherIncomeSummary.thisMonthAmount)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100/90">
              <span>Current billing cycle</span>
              <span className="font-semibold text-blue-600 font-mono">Active Cycle</span>
            </div>
          </div>

          {/* Card 4: Total Records */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-indigo-300 hover:shadow-sm transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                Total Records
              </span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/80 shadow-2xs group-hover:scale-105 transition-transform">
                <Receipt size={16} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-indigo-900 mt-2 tracking-tight">
              {otherIncomeSummary.totalCount}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100/90">
              <span>Recorded non-fee entries</span>
              <span className="font-semibold text-indigo-600 font-mono">{otherIncomeTotal} total</span>
            </div>
          </div>
        </div>
      ) : isOtherExpense ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Expenses */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-slate-300 hover:shadow-sm transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Expenses
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100/80 shadow-2xs">
                <Wallet size={16} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 mt-2 tracking-tight">
              {fmt(otherExpenseSummary.totalAmount)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100/90">
              <span>{otherExpenseSummary.totalCount} total entries</span>
              <span className="font-semibold text-rose-600 font-mono">Outflow</span>
            </div>
          </div>

          {/* Card 2: Pending Approval */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-amber-300 hover:shadow-sm transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                Pending Approval
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100/80 shadow-2xs">
                <Clock size={16} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-700 mt-2 tracking-tight">
              {fmt(otherExpenseSummary.pendingAmount)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100/90">
              <span>Awaiting payment approval</span>
              <span className="font-semibold text-amber-600 font-mono">In Review</span>
            </div>
          </div>

          {/* Card 3: Paid Expenses */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-emerald-300 hover:shadow-sm transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Settled / Paid
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/80 shadow-2xs">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-700 mt-2 tracking-tight">
              {fmt(otherExpenseSummary.paidAmount)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100/90">
              <span>Settled this financial period</span>
              <span className="font-semibold text-emerald-600 font-mono">Completed</span>
            </div>
          </div>

          {/* Card 4: This Month */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-blue-300 hover:shadow-sm transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                This Month
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/80 shadow-2xs">
                <Calendar size={16} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-blue-700 mt-2 tracking-tight">
              {fmt(otherExpenseSummary.thisMonthAmount)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100/90">
              <span>Current billing cycle</span>
              <span className="font-semibold text-blue-600 font-mono">Active Cycle</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-slate-300 hover:shadow-sm transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Billed / Allocated
              </span>
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200/80 shadow-2xs">
                <Wallet size={16} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 mt-2 tracking-tight">
              {fmt(metrics.total)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100/90">
              <span>{metrics.count} transaction entries</span>
              <span className="font-semibold text-slate-600 font-mono">Gross</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-emerald-300 hover:shadow-sm transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Settled & Paid
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/80 shadow-2xs">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-700 mt-2 tracking-tight">
              {fmt(metrics.paid)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100/90">
              <span>Cleared through bank / UPI</span>
              <span className="font-semibold text-emerald-600 font-mono">Settled</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-rose-300 hover:shadow-sm transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                Pending Due
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100/80 shadow-2xs">
                <AlertCircle size={16} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-rose-700 mt-2 tracking-tight">
              {fmt(metrics.due)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100/90">
              <span>Outstanding queue</span>
              <span className="font-semibold text-rose-600 font-mono">Due</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-blue-300 hover:shadow-sm transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                Active Branch
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/80 shadow-2xs">
                <Building2 size={16} />
              </div>
            </div>
            <div className="text-xl font-bold text-slate-900 mt-2 truncate">
              {currentUser?.branch || 'Main Campus'}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100/90">
              <span>FY 2026-27 Active Ledger</span>
              <span className="font-semibold text-blue-600 font-mono">Branch</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Filters Bar ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Filter size={14} className="text-slate-400" />
            <span>Registry Filter Controls</span>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw size={12} /> Reset Filters
            </button>
          )}
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${isOtherExpense ? 'lg:grid-cols-5' : branchOptions.length > 1 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4 items-end`}>
          <div className={!isOtherExpense && branchOptions.length <= 1 ? "sm:col-span-1" : ""}>
            <Input
              label="Search Records"
              placeholder={isOtherIncome ? "Search by Record #, Title, Ref..." : isOtherExpense ? "Search by Record #, Title, Payee..." : "Search by title, payee, UTR..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {(isOtherIncome || isOtherExpense) && branchOptions.length > 1 && (
            <Select
              label="Branch"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              options={branchOptions}
            />
          )}

          {isOtherExpense && (
            <>
              <Select
                label="Category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={[
                  { value: 'All', label: 'All Categories' },
                  ...EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }))
                ]}
              />
              <Select
                label="Status"
                value={expenseStatusFilter}
                onChange={(e) => setExpenseStatusFilter(e.target.value)}
                options={[
                  { value: 'All', label: 'All Statuses' },
                  { value: '0', label: 'Pending' },
                  { value: '1', label: 'Approved' },
                  { value: '2', label: 'Paid' },
                  { value: '3', label: 'Rejected' }
                ]}
              />
            </>
          )}

          <Select
            label="Payment Mode"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'All', label: 'All Modes' },
              { value: 'bank_transfer', label: 'Bank Transfer' },
              { value: 'upi', label: 'UPI / GPay' },
              { value: 'cash', label: 'Cash' },
              { value: 'cheque', label: 'Cheque' },
              { value: 'card', label: 'Card' }
            ]}
          />
        </div>
      </div>

      {/* ── Table Card ── */}
      <Card className="p-0 overflow-hidden border border-slate-200/90 rounded-2xl shadow-xs bg-white">
        <CardHeader className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${
              isOtherIncome
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100/80'
                : isOtherExpense
                ? 'bg-rose-50 text-rose-600 border-rose-100/80'
                : 'bg-indigo-50 text-indigo-600 border-indigo-100/80'
            }`}>
              {isOtherIncome ? <DollarSign size={17} /> : isOtherExpense ? <TrendingDown size={17} /> : <FileText size={17} />}
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 leading-snug">{viewInfo.title} Registry</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing {isOtherIncome ? otherIncomes.length : isOtherExpense ? otherExpenses.length : filteredRecords.length} recorded items
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOtherIncome && otherIncomes.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200/80 text-xs font-semibold text-slate-600 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400">Page Total:</span>
                <span className="font-mono font-bold text-emerald-600">+{fmt(otherIncomePageSum)}</span>
              </span>
            )}
            {isOtherExpense && otherExpenses.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200/80 text-xs font-semibold text-slate-600 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400">Page Total:</span>
                <span className="font-mono font-bold text-rose-600">-{fmt(otherExpensePageSum)}</span>
              </span>
            )}
          </div>
        </CardHeader>

        {isOtherIncome ? (
          <>
            <Table
              dense
              borderless
              headers={[
                { label: 'Record #', align: 'left' },
                { label: 'Title & Description', align: 'left' },
                { label: 'Branch', align: 'left' },
                { label: 'Amount', align: 'right' },
                { label: 'Date', align: 'center' },
                { label: 'Payment Mode', align: 'center' },
                { label: 'Actions', align: 'right' }
              ]}
            >
              {otherIncomeLoading ? (
                <tr>
                  <td colSpan={7}>
                    <div className="flex items-center justify-center py-14 text-slate-400 text-sm font-medium">
                      <Loader2 size={22} className="animate-spin mr-2.5 text-blue-600" /> Loading other income records...
                    </div>
                  </td>
                </tr>
              ) : otherIncomes.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="py-16 text-center text-slate-400 text-sm">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                        <Wallet size={24} />
                      </div>
                      <p className="font-semibold text-slate-600">No other income records found</p>
                      <p className="text-xs text-slate-400 mt-1">Try resetting search filters or record a new income transaction.</p>
                      {hasActiveFilters && (
                        <Button size="sm" variant="secondary" onClick={handleResetFilters} className="mt-4 font-semibold">
                          Reset Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                otherIncomes.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="px-3.5 py-3 font-mono text-xs font-bold text-blue-700 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/80 border border-blue-200/70 text-blue-700 shadow-2xs">
                        <Receipt size={12} className="text-blue-500 shrink-0" />
                        {rec.income_record_number}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                          {rec.title}
                        </span>
                        {rec.reference_number && (
                          <span className="font-mono text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 shrink-0" title={`Ref: ${rec.reference_number}`}>
                            #{rec.reference_number}
                          </span>
                        )}
                      </div>
                      {rec.description && (
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-sm sm:max-w-md" title={rec.description}>
                          {rec.description}
                        </div>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-left whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100/80 text-slate-700 text-xs font-semibold border border-slate-200/70">
                        <Building2 size={12} className="text-slate-400 shrink-0" />
                        {rec.branch_name || 'Main Campus'}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-right whitespace-nowrap">
                      <span className="font-black font-mono text-xs sm:text-sm text-emerald-600 tabular-nums">
                        +{fmt(rec.amount)}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-slate-600 font-mono text-xs">
                        <Calendar size={12} className="text-slate-400 shrink-0" />
                        {fmtDate(rec.income_date)}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-center whitespace-nowrap">
                      {renderPaymentModeBadge(rec.payment_mode)}
                    </td>
                    <td className="px-3.5 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          title="View Details"
                          className="p-1.5 rounded-lg border border-slate-200/80 text-slate-500 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
                          onClick={() => setViewingRecord(rec)}
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          type="button"
                          title="Edit Entry"
                          className="p-1.5 rounded-lg border border-blue-200/80 text-blue-600 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer shadow-2xs"
                          onClick={() => openEditModal(rec)}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          title="Delete Entry"
                          className="p-1.5 rounded-lg border border-rose-200/80 text-rose-600 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-300 transition-all cursor-pointer shadow-2xs"
                          onClick={() => setDeletingRecord(rec)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </Table>

            {/* Total Inflow Summary Bar */}
            {otherIncomes.length > 0 && (
              <div className="bg-slate-50/80 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold border-t border-slate-200/80">
                <span className="text-slate-500">
                  Showing page <strong className="text-slate-700">{otherIncomePage}</strong> of <strong className="text-slate-700">{totalOtherPages}</strong> ({otherIncomeTotal} total records)
                </span>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                    <span className="text-slate-600">
                      Page Inflow: <strong className="text-emerald-700 font-mono text-sm">+{fmt(otherIncomePageSum)}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-600">
                      Registry Cumulative: <strong className="text-slate-900 font-mono text-sm">{fmt(otherIncomeSummary.totalAmount)}</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 bg-white border-t border-slate-100">
              <Pagination
                currentPage={otherIncomePage}
                totalPages={totalOtherPages}
                totalItems={otherIncomeTotal}
                pageSize={otherIncomeLimit}
                onPageChange={(p) => {
                  setOtherIncomePage(p);
                  fetchOtherIncomes(p);
                }}
              />
            </div>
          </>
        ) : isOtherExpense ? (
          <>
            <Table
              dense
              borderless
              headers={[
                { label: 'Record #', align: 'left' },
                { label: 'Title & Description', align: 'left' },
                { label: 'Category', align: 'left' },
                { label: 'Payee', align: 'left' },
                { label: 'Amount', align: 'right' },
                { label: 'Date', align: 'center' },
                { label: 'Status', align: 'center' },
                { label: 'Payment Mode', align: 'center' },
                { label: 'Actions', align: 'right' }
              ]}
            >
              {otherExpenseLoading ? (
                <tr>
                  <td colSpan={9}>
                    <div className="flex items-center justify-center py-14 text-slate-400 text-sm font-medium">
                      <Loader2 size={22} className="animate-spin mr-2.5 text-blue-600" /> Loading other expense records...
                    </div>
                  </td>
                </tr>
              ) : otherExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="py-16 text-center text-slate-400 text-sm">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                        <Wallet size={24} />
                      </div>
                      <p className="font-semibold text-slate-600">No other expense records found</p>
                      <p className="text-xs text-slate-400 mt-1">Try resetting search filters or record a new expense.</p>
                      {hasActiveFilters && (
                        <Button size="sm" variant="secondary" onClick={handleResetFilters} className="mt-4 font-semibold">
                          Reset Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                otherExpenses.map((rec) => {
                  const statusInfo = STATUS_MAP[rec.status] || STATUS_MAP[0];
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="px-3.5 py-3 font-mono text-xs font-bold text-blue-700 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/80 border border-blue-200/70 text-blue-700 shadow-2xs">
                          <Receipt size={12} className="text-blue-500 shrink-0" />
                          {rec.expense_record_number}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                            {rec.title}
                          </span>
                          {rec.reference_number && (
                            <span className="font-mono text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 shrink-0">
                              #{rec.reference_number}
                            </span>
                          )}
                        </div>
                        {rec.description && (
                          <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-sm sm:max-w-md" title={rec.description}>
                            {rec.description}
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-left whitespace-nowrap">
                        <span className="inline-flex px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200/70">
                          {rec.category}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-left text-xs font-medium text-slate-700 whitespace-nowrap">
                        {rec.payee || '—'}
                      </td>
                      <td className="px-3.5 py-3 text-right whitespace-nowrap">
                        <span className="font-black font-mono text-xs sm:text-sm text-rose-600 tabular-nums">
                          -{fmt(rec.amount)}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-slate-600 font-mono text-xs">
                          <Calendar size={12} className="text-slate-400 shrink-0" />
                          {fmtDate(rec.expense_date)}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          statusInfo.color === 'emerald' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          statusInfo.color === 'blue' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          statusInfo.color === 'amber' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-center whitespace-nowrap">
                        {renderPaymentModeBadge(rec.payment_mode)}
                      </td>
                      <td className="px-3.5 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title="View Details"
                            className="p-1.5 rounded-lg border border-slate-200/80 text-slate-500 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
                            onClick={() => navigate(`/finance/expenses/other/${rec.id}`)}
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            title="Edit Entry"
                            className="p-1.5 rounded-lg border border-blue-200/80 text-blue-600 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer shadow-2xs"
                            onClick={() => navigate(`/finance/expenses/other/${rec.id}?edit=true`)}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            title="Delete Entry"
                            className="p-1.5 rounded-lg border border-rose-200/80 text-rose-600 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-300 transition-all cursor-pointer shadow-2xs"
                            onClick={() => setDeletingExpenseRecord(rec)}
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

            {/* Total Outflow Summary Bar */}
            {otherExpenses.length > 0 && (
              <div className="bg-slate-50/80 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold border-t border-slate-200/80">
                <span className="text-slate-500">
                  Showing page <strong className="text-slate-700">{otherExpensePage}</strong> of <strong className="text-slate-700">{totalOtherExpensePages}</strong> ({otherExpenseTotal} total records)
                </span>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
                    <span className="text-slate-600">
                      Page Outflow: <strong className="text-rose-700 font-mono text-sm">-{fmt(otherExpensePageSum)}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-600">
                      Total Expenses: <strong className="text-slate-900 font-mono text-sm">{fmt(otherExpenseSummary.totalAmount)}</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 bg-white border-t border-slate-100">
              <Pagination
                currentPage={otherExpensePage}
                totalPages={totalOtherExpensePages}
                totalItems={otherExpenseTotal}
                pageSize={otherExpenseLimit}
                onPageChange={(p) => {
                  setOtherExpensePage(p);
                  fetchOtherExpenses(p);
                }}
              />
            </div>
          </>
        ) : (
          <Table
            dense
            borderless
            headers={[
              { label: 'Reference / ID', align: 'left' },
              { label: 'Description & Payee', align: 'left' },
              { label: 'Category', align: 'left' },
              { label: 'Amount', align: 'right' },
              { label: 'Date', align: 'center' },
              { label: 'Mode', align: 'center' },
              { label: 'Status', align: 'center' },
              { label: 'Actions', align: 'right' }
            ]}
          >
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="py-16 text-center text-slate-400 text-sm">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                      <FileText size={24} />
                    </div>
                    <p className="font-semibold text-slate-600">No finance records match this filter</p>
                    <p className="text-xs text-slate-400 mt-1">Adjust search parameters or clear filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors group">
                  <td className="px-3.5 py-3 font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-800 shadow-2xs">
                      {rec.id}
                    </span>
                    {rec.reference && <div className="text-[10px] text-slate-400 font-normal mt-0.5">{rec.reference}</div>}
                  </td>
                  <td className="px-3.5 py-3 text-left">
                    <div className="text-xs sm:text-sm font-semibold text-slate-900">{rec.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{rec.recipient || 'Branch Account'}</div>
                  </td>
                  <td className="px-3.5 py-3 text-left whitespace-nowrap">
                    <span className="inline-flex px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200/60">
                      {rec.category}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap text-xs sm:text-sm">
                    {fmt(rec.amount)}
                  </td>
                  <td className="px-3.5 py-3 text-center text-xs text-slate-600 whitespace-nowrap">
                    {fmtDate(rec.date)}
                  </td>
                  <td className="px-3.5 py-3 text-center text-xs text-slate-600 whitespace-nowrap">
                    {renderPaymentModeBadge(rec.paymentMode)}
                  </td>
                  <td className="px-3.5 py-3 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        rec.status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : rec.status === 'Pending'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {rec.status}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        title="View Details"
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
                        onClick={() => addToast(`Viewing details for ${rec.id}`, 'info')}
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        type="button"
                        title="Edit Entry"
                        className="p-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer shadow-2xs"
                        onClick={() => addToast(`Editing ${rec.id}`, 'info')}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        title="Delete Entry"
                        className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shadow-2xs"
                        onClick={() => {
                          setRecords(prev => prev.filter(r => r.id !== rec.id));
                          addToast(`Entry ${rec.id} removed`, 'success');
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </Table>
        )}
      </Card>

      {/* ── Record / Edit Modal ── */}
      <Modal
        isOpen={isAddModalOpen || !!editingRecord}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingRecord(null);
        }}
        title={editingRecord ? `Edit Record • ${editingRecord.income_record_number}` : `Record ${viewInfo.title} Entry`}
        size="md"
      >
        <form onSubmit={handleSaveRecord} className="space-y-4 text-sm text-slate-600">
          {(isOtherIncome || isOtherExpense) && branchOptions.filter(b => b.value !== 'All').length > 1 && (
            <Select
              label="Branch *"
              value={formBranchId}
              onChange={(e) => setFormBranchId(e.target.value)}
              options={branchOptions.filter(b => b.value !== 'All')}
              required
            />
          )}

          <Input
            label={isOtherExpense ? "Expense Title / Purpose *" : "Income Title / Purpose *"}
            placeholder={isOtherExpense ? "e.g. Office Supplies, Petty Cash, Maintenance" : "e.g. Classroom Rental, Study Material Sale, Workshop Fee"}
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            required
          />

          {isOtherExpense && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Category *"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                options={EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }))}
              />
              <Select
                label="Status *"
                value={String(formStatus)}
                onChange={(e) => setFormStatus(Number(e.target.value))}
                options={[
                  { value: '0', label: 'Pending' },
                  { value: '1', label: 'Approved' },
                  { value: '2', label: 'Paid' },
                  { value: '3', label: 'Rejected' }
                ]}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Amount (₹) *"
              type="number"
              min={1}
              placeholder="0.00"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              required
            />
            <Input
              label={isOtherExpense ? "Expense Date *" : "Income Date *"}
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Payment Mode *"
              value={formPaymentMode}
              onChange={(e) => setFormPaymentMode(e.target.value)}
              options={[
                { value: 'bank_transfer', label: 'Bank Transfer (NEFT/RTGS)' },
                { value: 'upi', label: 'UPI / GPay' },
                { value: 'cash', label: 'Cash' },
                { value: 'cheque', label: 'Cheque' },
                { value: 'card', label: 'Debit / Credit Card' }
              ]}
            />
            <Input
              label="Transaction Reference / UTR"
              placeholder="e.g. TXN123456 or Cheque #"
              value={formReference}
              onChange={(e) => setFormReference(e.target.value)}
            />
          </div>

          {isOtherExpense && (
            <Input
              label="Payee / Vendor"
              placeholder="e.g. ABC Traders, Stationery World"
              value={formPayee}
              onChange={(e) => setFormPayee(e.target.value)}
            />
          )}

          <Input
            label="Description / Purpose Notes"
            placeholder={isOtherExpense ? "e.g. Purchase of printer cartridges for main office" : "e.g. Rental of classroom 302 for external weekend workshop"}
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingRecord(null);
              }}
              disabled={submittingForm}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="font-bold shadow-xs" disabled={submittingForm}>
              {submittingForm ? <Loader2 size={15} className="animate-spin mr-1.5" /> : null}
              {editingRecord ? 'Update Record' : isOtherExpense ? 'Save Expense Record' : 'Save Income Record'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── View Details Modal ── */}
      {viewingRecord && (
        <Modal
          isOpen={true}
          onClose={() => setViewingRecord(null)}
          title={`Other Income Record: ${viewingRecord.income_record_number}`}
          size="md"
        >
          <div className="space-y-4 text-sm">
            {/* Elegant Receipt Card */}
            <div className="bg-gradient-to-b from-slate-50 to-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                    <Receipt size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Record Number</span>
                    <span className="font-mono font-bold text-sm text-blue-700">
                      {viewingRecord.income_record_number}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Amount Received</span>
                  <span className="font-black font-mono text-xl text-emerald-600">
                    +{fmt(viewingRecord.amount)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Income Title</span>
                  <span className="font-bold text-slate-900 text-sm">{viewingRecord.title}</span>
                </div>
                <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Income Date</span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                    <Calendar size={13} className="text-slate-400" />
                    {fmtDate(viewingRecord.income_date)}
                  </span>
                </div>
                <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Payment Mode</span>
                  <div className="mt-1">
                    {renderPaymentModeBadge(viewingRecord.payment_mode)}
                  </div>
                </div>
                <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Reference / UTR</span>
                  <span className="font-mono font-semibold text-slate-700 mt-0.5 block truncate">
                    {viewingRecord.reference_number || '—'}
                  </span>
                </div>
                <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Branch</span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                    <Building2 size={13} className="text-slate-400" />
                    {viewingRecord.branch_name || 'Main Campus'}
                  </span>
                </div>
                <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Recorded By</span>
                  <span className="font-semibold text-slate-700 mt-0.5 block truncate">
                    {viewingRecord.creator_name || 'Finance Staff'}
                  </span>
                </div>
              </div>

              {viewingRecord.description && (
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Description / Notes</span>
                  <p className="text-slate-700 text-xs leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200/80">
                    {viewingRecord.description}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 font-bold"
              >
                <Printer size={14} /> Print Receipt
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setViewingRecord(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deletingRecord && (
        <Modal
          isOpen={true}
          onClose={() => setDeletingRecord(null)}
          title="Confirm Record Deletion"
          size="sm"
        >
          <div className="space-y-4 text-sm text-slate-600">
            <div className="flex items-center gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800">
              <AlertTriangle size={24} className="shrink-0 text-rose-600" />
              <p className="text-xs font-medium">
                Are you sure you want to delete other income record <strong className="font-bold">{deletingRecord.income_record_number}</strong> ({fmt(deletingRecord.amount)})?
              </p>
            </div>
            <p className="text-xs text-slate-500">
              This action will remove the entry from your active financial revenue totals permanently.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setDeletingRecord(null)} disabled={submittingForm}>
                Cancel
              </Button>
              <Button variant="primary" className="bg-rose-600 hover:bg-rose-700 font-bold" onClick={confirmDeleteRecord} disabled={submittingForm}>
                {submittingForm ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                Confirm Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Other Expense Delete Confirmation Modal ── */}
      {deletingExpenseRecord && (
        <Modal
          isOpen={true}
          onClose={() => setDeletingExpenseRecord(null)}
          title="Confirm Expense Deletion"
          size="sm"
        >
          <div className="space-y-4 text-sm text-slate-600">
            <div className="flex items-center gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800">
              <AlertTriangle size={24} className="shrink-0 text-rose-600" />
              <p className="text-xs font-medium">
                Are you sure you want to delete expense record <strong className="font-bold">{deletingExpenseRecord.expense_record_number}</strong> ({fmt(deletingExpenseRecord.amount)})?
              </p>
            </div>
            <p className="text-xs text-slate-500">
              This action will remove the entry from your active expense totals.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setDeletingExpenseRecord(null)} disabled={submittingForm}>
                Cancel
              </Button>
              <Button variant="primary" className="bg-rose-600 hover:bg-rose-700 font-bold" onClick={confirmDeleteExpenseRecord} disabled={submittingForm}>
                {submittingForm ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                Confirm Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
