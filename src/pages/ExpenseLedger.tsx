import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { getVouchers } from '../utils/expenseService';
import type { Voucher } from '../utils/expenseService';
import { Search, Download, Printer, Filter, Calendar, FileText, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Pagination } from '../components/ui/Pagination';

export const ExpenseLedger: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useApp();
  const [vouchers, setVouchers] = useState<Voucher[]>(() => getVouchers());

  useEffect(() => {
    setVouchers(getVouchers());
  }, [location.pathname]);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('All');
  const [paymentMethod, setPaymentMethod] = useState('All');
  const [status, setStatus] = useState('All');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const branchScopedVouchers = useMemo(() => {
    const userBranch = currentUser?.branch || 'Mumbai West';
    return vouchers.filter(v => !v.branch || v.branch === userBranch);
  }, [vouchers, currentUser]);

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

  const totalPages = Math.ceil(filteredVouchers.length / itemsPerPage);
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
      'Paid To / From',
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
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={handlePrint} style={{ gap: '6px' }}>
            <Printer size={15} /> Print Ledger
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
          <span className="text-xs font-mono font-bold text-slate-500 print:hidden">
            Showing {filteredVouchers.length === 0 ? 0 : `${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(currentPage * itemsPerPage, filteredVouchers.length)}`} of {filteredVouchers.length} vouchers
          </span>
        </CardHeader>

        <Table headers={['Date', 'Voucher ID', 'Category', 'Description', 'Paid To / From', 'Method', 'Debit (Outflow)', 'Credit (Inflow)', 'Status']}>
          {paginatedVouchers.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-6 py-12 text-center text-slate-400 font-medium">
                No matching voucher entries found in the ledger.
              </td>
            </tr>
          ) : (
            paginatedVouchers.map((v, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition border-b border-slate-100 last:border-0">
                <td className="px-6 py-4 text-xs font-semibold text-slate-600 font-mono whitespace-nowrap">{v.date}</td>
                <td className="px-6 py-4 text-xs font-bold text-blue-600 font-mono tracking-tight">{v.id}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wide bg-slate-100 text-slate-700 border border-slate-200">
                    {v.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-700 font-medium">{v.description}</td>
                <td className="px-6 py-4 text-xs font-semibold text-slate-600">{v.paidTo}</td>
                <td className="px-6 py-4 text-xs font-medium text-slate-500 font-mono">{v.paymentMethod}</td>
                <td className="px-6 py-4 text-sm font-bold text-red-600 font-mono">
                  {v.direction === 'Debit' ? `₹${v.amount.toLocaleString()}` : '—'}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-emerald-600 font-mono">
                  {v.direction === 'Credit' ? `₹${v.amount.toLocaleString()}` : '—'}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                    v.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                  }`}>
                    {v.status}
                  </span>
                </td>
              </tr>
            ))
          )}
        </Table>

        {filteredVouchers.length > itemsPerPage && (
          <div className="p-4 border-t border-slate-100 bg-white">
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredVouchers.length}
              pageSize={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

        <div className="bg-slate-100/50 px-6 py-4 flex justify-end gap-6 text-sm font-semibold border-t border-slate-200">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Total Outflow: <strong className="text-red-700 font-mono text-base md:text-lg">₹{totalDebit.toLocaleString()}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <span>Total Inflow: <strong className="text-emerald-700 font-mono text-base md:text-lg">₹{totalCredit.toLocaleString()}</strong></span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
