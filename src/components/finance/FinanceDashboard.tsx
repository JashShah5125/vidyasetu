import React from 'react';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Table } from '../ui/Table';
import { DollarSign, Percent, AlertCircle, FileText } from 'lucide-react';

export const FinanceDashboard: React.FC = () => {
  const { currentUser, students } = useApp();

  // Compute fee stats
  const totalTarget = students.reduce((acc, s) => acc + s.feePlan.total, 0);
  const totalCollected = students.reduce((acc, s) => acc + s.feePlan.paid, 0);
  const totalOutstanding = students.reduce((acc, s) => acc + s.feePlan.pending, 0);
  const defaulterStudents = students.filter(s => s.feePlan.pending > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">
          Finance & Collections Ledger Desk
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Welcome back, <strong className="font-semibold text-slate-800">{currentUser?.name}</strong>. Record client payments and track billing balances.
        </p>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fees Collected</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1 whitespace-nowrap">Rs. {totalCollected}</div>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
              <DollarSign size={22} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Outstanding Dues</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1 whitespace-nowrap">Rs. {totalOutstanding}</div>
            </div>
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center border border-red-100">
              <AlertCircle size={22} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Billing Defaulters</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1">{defaulterStudents.length} Students</div>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100">
              <FileText size={22} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Collection Rate</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1">
                {((totalCollected / totalTarget) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
              <Percent size={22} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Billing Payments</CardTitle>
            </CardHeader>
            <Table headers={['Student ID', 'Student Name', 'Paid Amount', 'Billing Plan Out of', 'Payment Status']}>
              {students.map((s, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono font-bold text-xs">{s.studentId}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800">{s.name}</td>
                  <td className="px-6 py-4 font-semibold text-emerald-600">Rs. {s.feePlan.paid}</td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-500">Rs. {s.feePlan.total}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                      s.feePlan.pending === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {s.feePlan.pending === 0 ? 'Fully Paid' : 'Pending Installment'}
                    </span>
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Dues Collection Roster</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              {defaulterStudents.map((s, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{s.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">ID: {s.studentId} • Batch: {s.batch}</div>
                  </div>
                  <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                    Rs. {s.feePlan.pending}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
