import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Table } from '../ui/Table';
import { DollarSign, Percent, AlertCircle, FileText } from 'lucide-react';

export const FinanceDashboard: React.FC = () => {
  const { currentUser, students } = useApp();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  // Compute fee stats
  const totalTarget = students.reduce((acc, s) => acc + s.feePlan.total, 0);
  const totalCollected = students.reduce((acc, s) => acc + s.feePlan.paid, 0);
  const totalOutstanding = students.reduce((acc, s) => acc + s.feePlan.pending, 0);
  const defaulterStudents = students.filter(s => s.feePlan.pending > 0);

  const paginatedStudents = students.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(students.length / itemsPerPage);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">
          Finance &amp; Collections Ledger Desk
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
              {paginatedStudents.map((s, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono font-bold text-xs">{s.studentId}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800">{s.name}</td>
                  <td className="px-6 py-4 font-semibold text-emerald-600">Rs. {s.feePlan.paid}</td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-500">Rs. {s.feePlan.total}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                      s.feePlan.pending === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {s.feePlan.pending === 0 ? 'Fully Paid' : 'Pending Installment'}
                    </span>
                  </td>
                </tr>
              ))}
            </Table>
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 border-t border-slate-200 p-4 text-xs font-semibold text-slate-500 shadow-sm select-none">
                <div>
                  Showing <span className="text-slate-800 font-bold">{Math.min((currentPage - 1) * itemsPerPage + 1, students.length)}</span> to <span className="text-slate-800 font-bold">{Math.min(currentPage * itemsPerPage, students.length)}</span> of <span className="text-slate-855 font-bold">{students.length}</span> records
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentPage(i + 1)}
                      className={`px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                        currentPage === i + 1
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
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
