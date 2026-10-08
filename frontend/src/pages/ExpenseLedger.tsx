import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import type { Voucher } from '../utils/expenseService';
import { otherExpenseApi } from '../services/otherExpenseApi';
import { otherIncomeApi } from '../services/otherIncomeApi';
import { Search, Download, Filter, Calendar, FileText, ArrowUpRight, ArrowDownLeft, Upload, RefreshCw, Loader2, Trash2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Pagination } from '../components/ui/Pagination';
import { BulkImportModal } from '../components/ui/BulkImportModal';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { formatDate } from '../utils/dateFormatter';

export interface LedgerVoucher extends Voucher {
  rawId?: number | string;
  sourceType?: 'expense' | 'income';
}

export const ExpenseLedger: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, branches, addToast } = useApp();
  const [vouchers, setVouchers] = useState<LedgerVoucher[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [deleteConfirmVoucher, setDeleteConfirmVoucher] = useState<LedgerVoucher | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Fetch strictly from MySQL database (both expenses & other income)
  const loadLedger = useCallback(async () => {
    setIsLoading(true);
    try {
      const branchId = currentUser?.branchId || (currentUser as any)?.branch_id || (branches.find(b => b.name === currentUser?.branch)?.id) || undefined;
      const [expensesRes, incomesRes] = await Promise.allSettled([
        otherExpenseApi.getOtherExpenses({ limit: 200, branchId }),
        otherIncomeApi.getOtherIncomes({ limit: 200, branchId })
      ]);

      const items: LedgerVoucher[] = [];

      if (expensesRes.status === 'fulfilled' && expensesRes.value?.records) {
        expensesRes.value.records.forEach((e) => {
          const methodMap: Record<string, string> = {
            bank_transfer: 'Bank Transfer',
            upi: 'UPI',
            cash: 'Cash',
            cheque: 'Cheque'
          };
          items.push({
            id: e.expense_record_number || `OEX-${e.id}`,
            date: e.expense_date ? String(e.expense_date).slice(0, 10) : '',
            type: 'Expense',
            category: (e.category || 'Maintenance') as any,
            description: e.title || e.description || 'Expense Entry',
            amount: Number(e.amount || 0),
            paymentMethod: (methodMap[e.payment_mode] || 'Bank Transfer') as any,
            paidTo: e.payee || 'Vendor / Staff',
            referenceNo: e.reference_number || `REF-${e.id}`,
            status: e.status === 2 ? 'Paid' : 'Pending',
            direction: 'Debit',
            branch: e.branch_name || currentUser?.branch || 'Mumbai West',
            rawId: e.id,
            sourceType: 'expense'
          });
        });
      }

      if (incomesRes.status === 'fulfilled' && incomesRes.value?.records) {
        incomesRes.value.records.forEach((i) => {
          const methodMap: Record<string, string> = {
            bank_transfer: 'Bank Transfer',
            upi: 'UPI',
            cash: 'Cash',
            cheque: 'Cheque'
          };
          items.push({
            id: i.income_record_number || `OIN-${i.id}`,
            date: i.income_date ? String(i.income_date).slice(0, 10) : '',
            type: 'Receipt',
            category: 'Donations' as any,
            description: i.title || i.description || 'Income Receipt',
            amount: Number(i.amount || 0),
            paymentMethod: (methodMap[i.payment_mode] || 'Bank Transfer') as any,
            paidTo: 'Student / Donor',
            referenceNo: i.reference_number || `REF-${i.id}`,
            status: 'Paid',
            direction: 'Credit',
            branch: i.branch_name || currentUser?.branch || 'Mumbai West',
            rawId: i.id,
            sourceType: 'income'
          });
        });
      }

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setVouchers(items);
    } catch (err) {
      console.error('Failed to load ledger vouchers from MySQL database:', err);
      addToast('Failed to load vouchers from MySQL database', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, branches, addToast]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger, location.pathname]);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('All');
  const [paymentMethod, setPaymentMethod] = useState('All');
  const [status, setStatus] = useState('All');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const branchScopedVouchers = useMemo(() => {
    return vouchers;
  }, [vouchers]);

  // Filter categories
  const categories = useMemo(() => {
    const list = new Set(branchScopedVouchers.map(v => v.category));
    return ['All', ...Array.from(list)];
  }, [branchScopedVouchers]);

  // Filter methods
  const paymentMethods = ['All', 'Bank Transfer', 'UPI', 'Cash', 'Cheque'];

  // Filtered Vouchers
  const filteredVouchers = useMemo(() => {
    return branchScopedVouchers.filter(v => {
      // General text search
      if (search) {
        const query = search.toLowerCase();
        const matchesSearch =
          v.id.toLowerCase().includes(query) ||
          v.description.toLowerCase().includes(query) ||
          v.paidTo.toLowerCase().includes(query) ||
          v.referenceNo.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Date Range filter
      if (startDate && v.date < startDate) return false;
      if (endDate && v.date > endDate) return false;

      // Dropdown filters
      if (category !== 'All' && v.category !== category) return false;
      if (paymentMethod !== 'All' && v.paymentMethod !== paymentMethod) return false;
      if (status !== 'All' && v.status !== status) return false;

      return true;
    });
  }, [branchScopedVouchers, search, startDate, endDate, category, paymentMethod, status]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, startDate, endDate, category, paymentMethod, status]);

  const totalPages = Math.ceil(filteredVouchers.length / itemsPerPage) || 1;
  const paginatedVouchers = useMemo(() => {
    return filteredVouchers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredVouchers, currentPage]);

  // Compute total sum of debits (outflows) and credits (inflows) in filtered list
  const totalDebit = useMemo(() => {
    return filteredVouchers
      .filter(v => v.direction === 'Debit')
      .reduce((acc, v) => acc + v.amount, 0);
  }, [filteredVouchers]);

  const totalCredit = useMemo(() => {
    return filteredVouchers
      .filter(v => v.direction === 'Credit')
      .reduce((acc, v) => acc + v.amount, 0);
  }, [filteredVouchers]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = [
      'Voucher ID',
      'Date',
      'Type',
      'Category',
      'Description',
      'Amount',
      'Direction',
      'Paid To ',
      'Payment Method',
      'Ref No',
      'Status'
    ];

    const rows = filteredVouchers.map(v => [
      v.id,
      v.date,
      v.type,
      v.category,
      v.description,
      v.amount,
      v.direction,
      v.paidTo,
      v.paymentMethod,
      v.referenceNo,
      v.status
    ]);

    // Calculate totals
    const totalDebitVal = filteredVouchers
      .filter(v => v.direction === 'Debit')
      .reduce((acc, v) => acc + v.amount, 0);

    const totalCreditVal = filteredVouchers
      .filter(v => v.direction === 'Credit')
      .reduce((acc, v) => acc + v.amount, 0);

    // Net = Credit - Debit
    const net = totalCreditVal - totalDebitVal;

    // Add summary rows
    const summaryRows = [
      [],
      ['SUMMARY'],
      ['Total Debit', totalDebitVal],
      ['Total Credit', totalCreditVal],
      ['Net', net]
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(','),
        ...rows.map(row =>
          row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
        ),
        ...summaryRows.map(row =>
          row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
        )
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");

    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `VidyaSetu_Ledger_Export_${new Date().toISOString().split('T')[0]}.csv`
    );

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmVoucher) return;
    setIsDeleting(true);
    const voucherToDelete = deleteConfirmVoucher;
    try {
      const branchId = currentUser?.branchId || (currentUser as any)?.branch_id || (branches.find(b => b.name === currentUser?.branch)?.id) || undefined;
      
      if (voucherToDelete.sourceType === 'expense' && voucherToDelete.rawId) {
        await otherExpenseApi.deleteOtherExpense(voucherToDelete.rawId, branchId);
      } else if (voucherToDelete.sourceType === 'income' && voucherToDelete.rawId) {
        await otherIncomeApi.deleteOtherIncome(voucherToDelete.rawId, branchId);
      } else {
        if (voucherToDelete.id.startsWith('OEX-') || voucherToDelete.direction === 'Debit') {
          const numericId = voucherToDelete.rawId || voucherToDelete.id.replace('OEX-', '');
          await otherExpenseApi.deleteOtherExpense(numericId, branchId);
        } else {
          const numericId = voucherToDelete.rawId || voucherToDelete.id.replace('OIN-', '');
          await otherIncomeApi.deleteOtherIncome(numericId, branchId);
        }
      }

      setVouchers(prev => prev.filter(v => v.id !== voucherToDelete.id));
      setDeleteConfirmVoucher(null);
      addToast(`Ledger record ${voucherToDelete.id} deleted successfully`, 'success');
      loadLedger();
    } catch (err: any) {
      console.error('Failed to delete ledger voucher:', err);
      addToast(err?.response?.data?.message || `Failed to delete ledger record ${voucherToDelete.id}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in print:p-0">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">
            Accounting General Ledger
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Browse and filter debit and credit vouchers. Export registers to spreadsheets.
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <Button size="sm" variant="secondary" onClick={loadLedger} style={{ gap: '6px' }} disabled={isLoading}>
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-1 font-bold">
            <Upload size={14} /> Bulk Import
          </Button>
          <Button size="sm" variant="secondary" onClick={handleExportCSV} style={{ gap: '6px' }}>
            <Download size={15} /> Export CSV
          </Button>
          <Button size="sm" variant="primary" onClick={() => navigate('/expense-voucher')} style={{ gap: '6px' }}>
            + Add Voucher
          </Button>
        </div>
      </div>

      {/* Filter panel card */}
      <Card className="p-4 border border-slate-200/80 rounded-2xl shadow-sm space-y-4 print:hidden">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-100">
          <Filter size={14} className="text-slate-400" />
          <span>Ledger Filter Controls</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
          <div className="sm:col-span-2">
            <Input
              type="text"
              label="General Search"
              placeholder="Search voucher no, name, desc..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Input
            type="date"
            label="Start Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <Input
            type="date"
            label="End Date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />

          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={categories.map(c => ({ value: c, label: c === 'All' ? 'All Categories' : c }))}
          />

          <Select
            label="Payment Method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            options={paymentMethods.map(m => ({ value: m, label: m === 'All' ? 'All Methods' : m }))}
          />

          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: 'All', label: 'All Statuses' },
              { value: 'Paid', label: 'Paid' },
              { value: 'Pending', label: 'Pending' }
            ]}
          />
        </div>
      </Card>

      {/* Ledger Records Table Card */}
      <Card className="border border-slate-200 rounded-2xl shadow-xl overflow-hidden print:border-none print:shadow-none">
        <CardHeader className="bg-slate-50 border-b border-slate-200/60 py-4 px-6 flex justify-between items-center print:bg-white print:border-none">
          <CardTitle className="text-base font-semibold text-slate-800 print:text-xl print:font-bold">
            General Ledger Registry Logs
          </CardTitle>
        </CardHeader>

        <Table
          dense
          borderless
          minWidth="1420px"
          colWidths={['115px', '150px', '130px', '260px', '180px', '130px', '140px', '140px', '95px', '80px']}
          headers={[
            { label: 'Date', align: 'left', minWidth: '115px' },
            { label: 'Voucher ID', align: 'left', minWidth: '150px' },
            { label: 'Category', align: 'left', minWidth: '130px' },
            { label: 'Description', align: 'left', minWidth: '260px' },
            { label: 'Paid To', align: 'left', minWidth: '180px' },
            { label: 'Method', align: 'left', minWidth: '130px' },
            { label: 'Debit (Outflow)', align: 'right', minWidth: '140px', className: 'pr-4 pl-2' },
            { label: 'Credit (Inflow)', align: 'right', minWidth: '140px', className: 'pr-4 pl-2' },
            { label: 'Status', align: 'center', minWidth: '95px', className: 'px-3' },
            { label: 'Action', align: 'center', minWidth: '80px' }
          ]}
        >
          {isLoading ? (
            <tr>
              <td colSpan={10} className="px-4 py-16 text-center text-slate-500 font-medium">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Loader2 size={24} className="animate-spin text-blue-600" />
                  <span className="text-xs font-semibold text-slate-600">Retrieving ledger vouchers from MySQL database...</span>
                </div>
              </td>
            </tr>
          ) : paginatedVouchers.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-4 py-12 text-center text-slate-400 font-medium">
                No matching voucher entries found in the ledger.
              </td>
            </tr>
          ) : (
            paginatedVouchers.map((v, idx) => (
              <tr key={v.id || idx} className="hover:bg-slate-50/80 transition border-b border-slate-100 last:border-0">
                <td className="px-3 py-2.5 text-xs font-semibold text-slate-600 font-mono whitespace-nowrap">{formatDate(v.date)}</td>
                <td className="px-3 py-2.5 text-xs font-bold text-blue-600 font-mono tracking-tight whitespace-nowrap">{v.id}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                    {v.category}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-700 font-medium whitespace-normal break-words" title={v.description}>
                  {v.description}
                </td>
                <td className="px-3 py-2.5 text-xs font-semibold text-slate-600 whitespace-normal break-words" title={v.paidTo}>
                  {v.paidTo}
                </td>
                <td className="px-3 py-2.5 text-xs font-medium text-slate-500 font-mono whitespace-nowrap">{v.paymentMethod}</td>
                <td className="px-4 py-2.5 text-xs font-bold text-red-600 font-mono text-right whitespace-nowrap">
                  {v.direction === 'Debit' ? `₹${v.amount.toLocaleString('en-IN')}` : '—'}
                </td>
                <td className="px-4 py-2.5 text-xs font-bold text-emerald-600 font-mono text-right whitespace-nowrap">
                  {v.direction === 'Credit' ? `₹${v.amount.toLocaleString('en-IN')}` : '—'}
                </td>
                <td className="px-3 py-2.5 text-center whitespace-nowrap">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                    v.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                  }`}>
                    {v.status}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmVoucher(v)}
                    title={`Delete ${v.id}`}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition border border-transparent hover:border-rose-200 inline-flex items-center justify-center group"
                  >
                    <Trash2 size={15} className="group-hover:scale-110 transition-transform text-slate-400 group-hover:text-rose-600" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </Table>

        {/* Total Outflow & Inflow Summary Bar */}
        <div className="bg-slate-50/80 px-6 py-2.5 flex justify-end gap-6 text-xs font-semibold border-t border-slate-100">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
              <span className="text-slate-600">Total Outflow: <strong className="text-red-700 font-mono text-sm">₹{totalDebit.toLocaleString('en-IN')}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
              <span className="text-slate-600">Total Inflow: <strong className="text-emerald-700 font-mono text-sm">₹{totalCredit.toLocaleString('en-IN')}</strong></span>
            </div>
          </div>
        </div>

        {/* Standard Institute Admin Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages || 1}
          totalItems={filteredVouchers.length}
          pageSize={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </Card>

      <BulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Bulk Import Ledger Vouchers"
        description="Select a CSV spreadsheet to import multiple ledger vouchers directly into the MySQL database. Columns must match the template below exactly."
        sampleHeaders={['Date', 'Type', 'Category', 'Description', 'Amount', 'PaymentMethod', 'PaidTo', 'ReferenceNo', 'Status', 'Direction', 'Branch']}
        sampleRows={[
          ['2026-08-15', 'Expense', 'Electricity', 'AirCon service bill', '4500', 'UPI', 'CoolAir Corp', 'UPI-98124', 'Paid', 'Debit', 'Mumbai West'],
          ['2026-08-16', 'Receipt', 'Fees', 'Lumpsum enrollment fees cash', '25000', 'Cash', 'Kunal Sen', 'CASH-991', 'Paid', 'Credit', 'Pune Camp']
        ]}
        onImport={async (importedRows) => {
          try {
            const branchId = Number(currentUser?.branchId || (currentUser as any)?.branch_id || (branches.find(b => b.name === currentUser?.branch)?.id) || 1);
            const paymentModeMap: Record<string, string> = {
              'Bank Transfer': 'bank_transfer',
              'UPI': 'upi',
              'Cash': 'cash',
              'Cheque': 'cheque'
            };

            for (const row of importedRows) {
              const isCredit = (row['Direction'] === 'Credit' || row['Type'] === 'Receipt' || row['Type'] === 'Fee');
              const amt = parseFloat(row['Amount']) || 0;
              const dt = row['Date'] || new Date().toISOString().split('T')[0];
              const mode = paymentModeMap[row['PaymentMethod']] || 'bank_transfer';
              const refNo = row['ReferenceNo'] || undefined;

              if (isCredit) {
                await otherIncomeApi.createOtherIncome({
                  branchId,
                  title: row['Description'] || 'Bulk imported income',
                  description: row['Description'] || 'Bulk imported income',
                  amount: amt,
                  incomeDate: dt,
                  paymentMode: mode,
                  referenceNumber: refNo
                });
              } else {
                await otherExpenseApi.createOtherExpense({
                  branchId,
                  title: row['Description'] || 'Bulk imported expense',
                  description: row['Description'] || 'Bulk imported expense',
                  category: row['Category'] || 'Other Expenses',
                  amount: amt,
                  expenseDate: dt,
                  status: row['Status'] === 'Paid' ? 2 : 0,
                  paymentMode: mode,
                  referenceNumber: refNo,
                  payee: row['PaidTo'] || 'Vendor'
                });
              }
            }
            addToast('Bulk vouchers imported directly to MySQL database!', 'success');
            loadLedger();
          } catch (err: any) {
            console.error('Bulk import error:', err);
            addToast('Encountered an issue importing some vouchers to MySQL database', 'error');
            loadLedger();
          }
        }}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(deleteConfirmVoucher)}
        onClose={() => !isDeleting && setDeleteConfirmVoucher(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Ledger Record"
        itemType="ledger record"
        itemName={deleteConfirmVoucher?.id}
        description="Deleting this ledger record will remove it from the accounting general ledger. This action cannot be undone."
        isLoading={isDeleting}
      />
    </div>
  );
};
