import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Table } from '../ui/Table';
import { Button } from '../ui/Button';
import { getVouchers } from '../../utils/expenseService';
import type { Voucher } from '../../utils/expenseService';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Clock,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  FileText
} from 'lucide-react';

export const FinanceDashboard: React.FC = () => {
  const { currentUser, students } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [vouchers, setVouchers] = useState<Voucher[]>(() => getVouchers());

  useEffect(() => {
    setVouchers(getVouchers());
  }, [location.pathname]);

  // ── Branch Scoping for Finance Staff ──
  const branchScopedStudents = useMemo(() => {
    const userBranch = currentUser?.branch || 'Mumbai West';
    return students.filter(s => s.branch === userBranch);
  }, [students, currentUser]);

  const branchScopedVouchers = useMemo(() => {
    const userBranch = currentUser?.branch || 'Mumbai West';
    return vouchers.filter(v => !v.branch || v.branch === userBranch);
  }, [vouchers, currentUser]);

  // ── Calculate fee income ──
  const totalFeesCollected = useMemo(() => {
    return branchScopedStudents.reduce((acc, s) => acc + s.feePlan.paid, 0);
  }, [branchScopedStudents]);

  // ── Calculate voucher totals ──
  const totalDebitExpenses = useMemo(() => {
    return branchScopedVouchers
      .filter(v => v.direction === 'Debit')
      .reduce((acc, v) => acc + v.amount, 0);
  }, [branchScopedVouchers]);

  const totalCreditIncome = useMemo(() => {
    return branchScopedVouchers
      .filter(v => v.direction === 'Credit')
      .reduce((acc, v) => acc + v.amount, 0);
  }, [branchScopedVouchers]);

  const totalIncome = totalFeesCollected + totalCreditIncome;

  const currentBalance = totalIncome - totalDebitExpenses;

  // This Month's Expenses (Aug 2026)
  const thisMonthExpenses = useMemo(() => {
    return branchScopedVouchers
      .filter(v => v.direction === 'Debit' && v.date.startsWith('2026-08'))
      .reduce((acc, v) => acc + v.amount, 0);
  }, [branchScopedVouchers]);

  // Pending Payments
  const pendingPayments = useMemo(() => {
    return branchScopedVouchers
      .filter(v => v.direction === 'Debit' && v.status === 'Pending')
      .reduce((acc, v) => acc + v.amount, 0);
  }, [branchScopedVouchers]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {
      'Salaries': 0,
      'Electricity': 0,
      'Maintenance': 0,
      'Stationery': 0,
      'Transport': 0,
      'Other': 0
    };

    branchScopedVouchers.forEach(v => {
      if (v.direction === 'Debit') {
        const cat = v.category in breakdown ? v.category : 'Other';
        breakdown[cat] += v.amount;
      }
    });

    return Object.entries(breakdown)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [branchScopedVouchers]);

  // Monthly expense trend
  const monthlyExpenses = useMemo(() => {
    const months = [
      { name: 'May', amount: 35000 },
      { name: 'Jun', amount: 48000 },
      { name: 'Jul', amount: 42000 },
      { name: 'Aug', amount: thisMonthExpenses }
    ];
    return months;
  }, [thisMonthExpenses]);

  // Recent payments
  const recentVouchers = useMemo(() => {
    return branchScopedVouchers.slice(-4).reverse();
  }, [branchScopedVouchers]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">
            Accounting &amp; Expense Dashboard
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Welcome, <strong className="font-semibold text-slate-800">{currentUser?.name}</strong> ({currentUser?.branch || 'Mumbai West'} Branch). Managing branch cash flow, ledger books, and tally vouchers.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => navigate('/expense-ledger')}>
            View Ledger
          </Button>
          <Button size="sm" variant="primary" onClick={() => navigate('/expense-voucher')}>
            + Create Voucher
          </Button>
        </div>
      </div>

      {/* KPI Tally Cards Block */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Expenses</div>
            <div className="text-xl font-display font-extrabold text-slate-900 mt-1">₹{totalDebitExpenses.toLocaleString()}</div>
            <span className="text-[10px] text-slate-400 font-semibold block mt-1">Cumulative Outflows</span>
          </div>
          <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center border border-rose-100">
            <TrendingDown size={20} />
          </div>
        </Card>

        <Card className="p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">This Month's</div>
            <div className="text-xl font-display font-extrabold text-slate-900 mt-1">₹{thisMonthExpenses.toLocaleString()}</div>
            <span className="text-[10px] text-slate-400 font-semibold block mt-1">August Bill Cycle</span>
          </div>
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100">
            <TrendingDown size={20} />
          </div>
        </Card>

        <Card className="p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Payments</div>
            <div className="text-xl font-display font-extrabold text-slate-900 mt-1">₹{pendingPayments.toLocaleString()}</div>
            <span className="text-[10px] text-slate-400 font-semibold block mt-1">Accrued / Unpaid</span>
          </div>
          <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center border border-red-100">
            <Clock size={20} />
          </div>
        </Card>

        <Card className="p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Income</div>
            <div className="text-xl font-display font-extrabold text-slate-900 mt-1">₹{totalIncome.toLocaleString()}</div>
            <span className="text-[10px] text-slate-400 font-semibold block mt-1">Fees + Receipts</span>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
            <TrendingUp size={20} />
          </div>
        </Card>

        <Card className="p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Balance</div>
            <div className="text-xl font-display font-extrabold text-slate-900 mt-1">₹{currentBalance.toLocaleString()}</div>
            <span className="text-[10px] text-slate-400 font-semibold block mt-1">Inflow - Outflow</span>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
            <Wallet size={20} />
          </div>
        </Card>
      </div>

      {/* Grid of chart and list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Bar Chart Card */}
        <Card className="lg:col-span-2 flex flex-col justify-between border border-slate-200 rounded-2xl shadow-sm p-5">
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
              Monthly Expenses Trend
            </h3>
            {/* Visual HTML chart */}
            <div className="h-64 flex items-end justify-around gap-4 border-b border-slate-200 pb-2 mt-6 mb-6">
              {monthlyExpenses.map((m, idx) => {
                const maxVal = Math.max(...monthlyExpenses.map(x => x.amount)) || 1;
                const pct = (m.amount / maxVal) * 100;
                return (
                  <div key={idx} className="h-[80%] flex flex-col justify-end items-center group relative w-full">
                    {/* Bar */}
                    <div
                      style={{ height: `${pct}%` }}
                      className="bg-gradient-to-t from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 w-12 rounded-t-lg transition-all duration-500 shadow-sm animate-height-grow relative"
                    >
                      {/* Always Visible Value Label */}
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-700 font-mono whitespace-nowrap">
                        ₹{m.amount.toLocaleString()}
                      </span>
                    </div>
                    {/* Label */}
                    <span className="absolute -bottom-6 text-xs font-semibold text-slate-500">{m.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <span className="text-[11px] text-slate-400 block mt-3 font-semibold text-center">
            * August reflects live vouchers recorded inside the ledger
          </span>
        </Card>

        {/* Categories Breakdown */}
        <Card className="border border-slate-200 rounded-2xl shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
            Expense Category Breakdown
          </h3>
          <div className="space-y-4 mt-6">
            {categoryBreakdown.map((c, idx) => {
              const maxVal = Math.max(...categoryBreakdown.map(x => x.amount)) || 1;
              const pct = (c.amount / maxVal) * 100;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600">{c.name}</span>
                    <span className="text-slate-900 font-mono">₹{c.amount.toLocaleString()}</span>
                  </div>
                  {/* Progress bar container */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
                    <div
                      style={{ width: `${pct}%` }}
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Recent Ledger Entries */}
      <Card className="border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-150 py-3 px-5 flex justify-between items-center">
          <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            Recent Ledger Voucher Logs
          </CardTitle>
          <Button size="sm" variant="secondary" onClick={() => navigate('/expense-ledger')}>
            Open Full Ledger
          </Button>
        </CardHeader>
        
        <Table headers={['Voucher', 'Date', 'Category', 'Description', 'Method', 'Debit (Outflow)', 'Credit (Inflow)', 'Status']}>
          {recentVouchers.map((v, idx) => (
            <tr key={idx} className="hover:bg-slate-50/50 border-b border-slate-100 last:border-0">
              <td className="px-6 py-3 font-mono font-bold text-xs text-blue-600">{v.id}</td>
              <td className="px-6 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{v.date}</td>
              <td className="px-6 py-3">
                <span className="inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide bg-slate-100 text-slate-700 border border-slate-200">
                  {v.category}
                </span>
              </td>
              <td className="px-6 py-3 text-xs font-semibold text-slate-700">{v.description}</td>
              <td className="px-6 py-3 text-[11px] text-slate-500 font-medium font-mono">{v.paymentMethod}</td>
              <td className="px-6 py-3 text-xs font-bold text-red-600 font-mono">
                {v.direction === 'Debit' ? `₹${v.amount.toLocaleString()}` : '—'}
              </td>
              <td className="px-6 py-3 text-xs font-bold text-emerald-600 font-mono">
                {v.direction === 'Credit' ? `₹${v.amount.toLocaleString()}` : '—'}
              </td>
              <td className="px-6 py-3">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  v.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                }`}>
                  {v.status}
                </span>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
};
