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
  Wallet
} from 'lucide-react';
import { formatDate as fmtDate } from '../../utils/dateFormatter';
import {
  otherIncomeApi,
  type OtherIncomeRecord,
  type OtherIncomeSummary
} from '../../services/otherIncomeApi';
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
      addToast('Please enter an income title', 'error');
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
          // Update
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
          // Create
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
    } else {
      addToast('Exporting finance statement to CSV...', 'info');
    }
  };

  const IconComponent = viewInfo.icon;
  const totalOtherPages = Math.ceil(otherIncomeTotal / otherIncomeLimit) || 1;

  const isSalaryStructure = currentPath.includes('/payroll/structure') || currentPath.includes('/salary-structure');
  const isSalaryStatus = currentPath.includes('/payroll/monthly') || currentPath.includes('/expenses/salaries') || currentPath.includes('/payables/salaries') || currentPath.includes('/salary-status');

  if (isSalaryStructure) {
    return (
      <div className="space-y-6">
        {/* Sub-navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            onClick={() => navigate('/finance/payroll/structure')}
            className="px-4 py-2.5 text-sm font-bold text-blue-700 border-b-2 border-blue-600 bg-blue-50/50 rounded-t-lg transition-all"
          >
            1. Salary Structure (Master)
          </button>
          <button
            onClick={() => navigate('/finance/payroll/monthly')}
            className="px-4 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-900 rounded-t-lg transition-colors"
          >
            2. Monthly Salary Status (Operations)
          </button>
        </div>

        <StaffSalaryMasterView
          branchFilter={branchFilter}
          branchOptions={branchOptions}
          onBranchChange={setBranchFilter}
          onNavigateToStatus={() => navigate('/finance/payroll/monthly')}
        />
      </div>
    );
  }

  if (isSalaryStatus) {
    return (
      <div className="space-y-6">
        {/* Sub-navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            onClick={() => navigate('/finance/payroll/structure')}
            className="px-4 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-900 rounded-t-lg transition-colors"
          >
            1. Salary Structure (Master)
          </button>
          <button
            onClick={() => navigate('/finance/payroll/monthly')}
            className="px-4 py-2.5 text-sm font-bold text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50/50 rounded-t-lg transition-all"
          >
            2. Monthly Salary Status (Operations)
          </button>
        </div>

        <StaffSalaryStatusView
          branchFilter={branchFilter}
          branchOptions={branchOptions}
          onBranchChange={setBranchFilter}
          onNavigateToMaster={() => navigate('/finance/payroll/structure')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb & Navigation Bar ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            <span>Branch Finance</span>
            <span>·</span>
            <span className="text-blue-600">{viewInfo.module}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold">
              <IconComponent size={20} />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{viewInfo.title}</h2>
              <p className="text-sm text-slate-500 mt-0.5">{viewInfo.subtitle}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 font-bold"
          >
            <Download size={14} /> Export CSV
          </Button>
          <Button
            variant="primary"
            onClick={openAddModal}
            className="flex items-center gap-1.5 font-bold"
          >
            <Plus size={14} /> Record Income
          </Button>
        </div>
      </div>

      {/* ── 4 KPI Financial Metric Cards ── */}
      {isOtherIncome ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-slate-700 shadow-sm">
            <div className="p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Other Income</div>
              <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{fmt(otherIncomeSummary.totalAmount)}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Cumulative non-fee revenue</div>
            </div>
          </Card>
          <Card className="border-l-4 border-l-emerald-500 shadow-sm">
            <div className="p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">Today's Receipts</div>
              <div className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">{fmt(otherIncomeSummary.todayAmount)}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Received on {fmtDate(new Date())}</div>
            </div>
          </Card>
          <Card className="border-l-4 border-l-blue-500 shadow-sm">
            <div className="p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-700">This Month's Receipts</div>
              <div className="text-2xl font-bold text-blue-700 mt-1 tabular-nums">{fmt(otherIncomeSummary.thisMonthAmount)}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Current billing cycle</div>
            </div>
          </Card>
          <Card className="border-l-4 border-l-indigo-500 shadow-sm">
            <div className="p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-700">Total Records</div>
              <div className="text-2xl font-bold text-indigo-900 mt-1 tabular-nums">{otherIncomeSummary.totalCount}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Recorded non-fee transactions</div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-slate-700 shadow-sm">
            <div className="p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Billed / Allocated</div>
              <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{fmt(metrics.total)}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{metrics.count} total transaction entries</div>
            </div>
          </Card>
          <Card className="border-l-4 border-l-emerald-500 shadow-sm">
            <div className="p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">Settled & Paid</div>
              <div className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">{fmt(metrics.paid)}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Cleared through bank / UPI</div>
            </div>
          </Card>
          <Card className="border-l-4 border-l-rose-500 shadow-sm">
            <div className="p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-rose-700">Pending Due</div>
              <div className="text-2xl font-bold text-rose-700 mt-1 tabular-nums">{fmt(metrics.due)}</div>
              <div className="text-[11px] text-rose-500 mt-0.5">Outstanding queue for settlement</div>
            </div>
          </Card>
          <Card className="border-l-4 border-l-blue-500 shadow-sm">
            <div className="p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-700">Active Branch</div>
              <div className="text-xl font-bold text-blue-900 mt-1 truncate">{currentUser?.branch || 'Main Campus'}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">FY 2026-27 Active Ledger</div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Filters Bar ── */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm items-end justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 w-full items-end">
          <Input
            label="Search Records"
            placeholder={isOtherIncome ? "Search by Record #, Title, Reference, Description..." : "Search by title, payee, UTR..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            wrapperClassName={isOtherIncome && branchOptions.length > 1 ? "" : "sm:col-span-2"}
          />
          {isOtherIncome && branchOptions.length > 1 && (
            <Select
              label="Branch"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              options={branchOptions}
            />
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

      {/* ── Table ── */}
      <Card className="p-0 overflow-hidden border border-slate-200 shadow-sm">
        <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle>{viewInfo.title} Registry</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {isOtherIncome ? otherIncomes.length : filteredRecords.length} recorded items
            </p>
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
                    <div className="flex items-center justify-center py-12 text-slate-400 text-sm font-medium">
                      <Loader2 size={20} className="animate-spin mr-2.5 text-blue-600" /> Loading other income records...
                    </div>
                  </td>
                </tr>
              ) : otherIncomes.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="py-14 text-center text-slate-400 text-sm">
                      <Wallet size={28} className="mx-auto mb-2 text-slate-300" />
                      No other income records found matching the current search.
                    </div>
                  </td>
                </tr>
              ) : (
                otherIncomes.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-2.5 py-2 font-mono text-xs font-bold text-blue-700 whitespace-nowrap">
                      {rec.income_record_number}
                    </td>
                    <td className="px-2.5 py-2 text-left">
                      <div className="text-xs sm:text-sm font-bold text-slate-900">{rec.title}</div>
                      {rec.description && (
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[260px]">
                          {rec.description}
                        </div>
                      )}
                    </td>
                    <td className="px-2.5 py-2 text-left whitespace-nowrap">
                      <span className="inline-flex px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
                        {rec.branch_name || 'Main Campus'}
                      </span>
                    </td>
                    <td className="px-2.5 py-2 text-right font-bold text-emerald-700 tabular-nums whitespace-nowrap text-xs sm:text-sm">
                      {fmt(rec.amount)}
                    </td>
                    <td className="px-2.5 py-2 text-center text-xs text-slate-600 whitespace-nowrap">
                      {fmtDate(rec.income_date)}
                    </td>
                    <td className="px-2.5 py-2 text-center text-xs text-slate-700 capitalize whitespace-nowrap">
                      <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                        {(rec.payment_mode || 'bank_transfer').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-2.5 py-2 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title="View Details"
                          className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                          onClick={() => setViewingRecord(rec)}
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          type="button"
                          title="Edit Entry"
                          className="p-1 rounded-md border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          onClick={() => openEditModal(rec)}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          title="Delete Entry"
                          className="p-1 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
                  <div className="py-14 text-center text-slate-400 text-sm">
                    <FileText size={28} className="mx-auto mb-2 text-slate-300" />
                    No finance records match this filter.
                  </div>
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-2.5 py-2 font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                    {rec.id}
                    {rec.reference && <div className="text-[10px] text-slate-400 font-normal">{rec.reference}</div>}
                  </td>
                  <td className="px-2.5 py-2 text-left">
                    <div className="text-xs sm:text-sm font-semibold text-slate-900">{rec.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{rec.recipient || 'Branch Account'}</div>
                  </td>
                  <td className="px-2.5 py-2 text-left whitespace-nowrap">
                    <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                      {rec.category}
                    </span>
                  </td>
                  <td className="px-2.5 py-2 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap text-xs sm:text-sm">
                    {fmt(rec.amount)}
                  </td>
                  <td className="px-2.5 py-2 text-center text-xs text-slate-600 whitespace-nowrap">
                    {fmtDate(rec.date)}
                  </td>
                  <td className="px-2.5 py-2 text-center text-xs text-slate-600 whitespace-nowrap">
                    {rec.paymentMode || 'Bank Transfer'}
                  </td>
                  <td className="px-2.5 py-2 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
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
                  <td className="px-2.5 py-2 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-1">
                      <button
                        type="button"
                        title="View Details"
                        className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                        onClick={() => addToast(`Viewing details for ${rec.id}`, 'info')}
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        type="button"
                        title="Edit Entry"
                        className="p-1 rounded-md border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        onClick={() => addToast(`Editing ${rec.id}`, 'info')}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        title="Delete Entry"
                        className="p-1 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
        title={editingRecord ? `Edit ${editingRecord.income_record_number}` : `Record ${viewInfo.title} Entry`}
        size="md"
      >
        <form onSubmit={handleSaveRecord} className="space-y-4 text-sm text-slate-600">
          {isOtherIncome && branchOptions.filter(b => b.value !== 'All').length > 1 && (
            <Select
              label="Branch *"
              value={formBranchId}
              onChange={(e) => setFormBranchId(e.target.value)}
              options={branchOptions.filter(b => b.value !== 'All')}
              required
            />
          )}

          <Input
            label="Income Title / Purpose *"
            placeholder="e.g. Classroom Rental, Study Material Sale, Workshop Fee"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            required
          />

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
              label="Income Date *"
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

          <Input
            label="Description / Purpose Notes"
            placeholder="e.g. Rental of classroom 302 for external weekend workshop"
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
            <Button type="submit" variant="primary" className="font-bold" disabled={submittingForm}>
              {submittingForm ? <Loader2 size={15} className="animate-spin mr-1.5" /> : null}
              {editingRecord ? 'Update Record' : 'Save Income Record'}
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
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-2.5">
                <span className="text-xs font-bold uppercase text-slate-500">Record Number</span>
                <span className="font-mono font-bold text-sm text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                  {viewingRecord.income_record_number}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-slate-500">Income Title</span>
                <span className="font-bold text-slate-900">{viewingRecord.title}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-slate-500">Amount Received</span>
                <span className="font-bold text-base text-emerald-700">{fmt(viewingRecord.amount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-slate-500">Income Date</span>
                <span className="font-semibold text-slate-700">{fmtDate(viewingRecord.income_date)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-slate-500">Payment Mode</span>
                <span className="capitalize font-semibold text-slate-700">{(viewingRecord.payment_mode || '').replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-slate-500">Reference / UTR</span>
                <span className="font-mono font-semibold text-slate-700">{viewingRecord.reference_number || '—'}</span>
              </div>
              {viewingRecord.creator_name && (
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase text-slate-500">Recorded By</span>
                  <span className="text-slate-600">{viewingRecord.creator_name}</span>
                </div>
              )}
              {viewingRecord.description && (
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-xs font-bold uppercase text-slate-500 block mb-1">Description</span>
                  <p className="text-slate-700 text-xs leading-relaxed bg-white p-2.5 rounded border border-slate-200">
                    {viewingRecord.description}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setViewingRecord(null)}>
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
            <div className="flex items-center gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
              <AlertTriangle size={24} className="shrink-0 text-rose-600" />
              <p className="text-xs font-medium">
                Are you sure you want to delete other income record <strong className="font-bold">{deletingRecord.income_record_number}</strong> ({fmt(deletingRecord.amount)})?
              </p>
            </div>
            <p className="text-xs text-slate-500">
              This action will remove the entry from your active financial revenue totals.
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
    </div>
  );
};
