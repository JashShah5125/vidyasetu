import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Table } from '../ui/Table';
import { GraduationCap, Users, BookOpen, ClipboardCheck } from 'lucide-react';

export const InstAdminDashboard: React.FC = () => {
  const { currentUser, students, leads, auditLogs } = useApp();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  if (!currentUser) return null;

  const paginatedStudents = students.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(students.length / itemsPerPage);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">
          Welcome back, {currentUser.name}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Daily overview for <strong className="font-semibold text-slate-800">{currentUser.tenantName}</strong> (Role: Institute Owner).
        </p>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Students</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1">{students.length}</div>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
              <GraduationCap size={22} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Enquiries</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1">{leads.length}</div>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100">
              <Users size={22} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Batches</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1">3</div>
            </div>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
              <BookOpen size={22} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Attendance Today</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1">94.8%</div>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
              <ClipboardCheck size={22} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Student Registrations</CardTitle>
            </CardHeader>
            <Table headers={['Student ID', 'Name', 'Course', 'Branch', 'Admission Date', 'Status']}>
              {paginatedStudents.map((s, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono font-bold text-xs">{s.studentId}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800">{s.name}</td>
                  <td className="px-6 py-4">{s.course}</td>
                  <td className="px-6 py-4">{s.branch}</td>
                  <td className="px-6 py-4 font-mono text-xs">{s.admissionDate}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                      s.status === 'Active Student' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </Table>
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 border-t border-slate-200 p-4 text-xs font-semibold text-slate-500 shadow-sm select-none">
                <div>
                  Showing <span className="text-slate-800 font-bold">{Math.min((currentPage - 1) * itemsPerPage + 1, students.length)}</span> to <span className="text-slate-800 font-bold">{Math.min(currentPage * itemsPerPage, students.length)}</span> of <span className="text-slate-855 font-bold">{students.length}</span> students
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
              <CardTitle>Recent Actions Log</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              {auditLogs.slice(0, 5).map((log, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                    <span>{log.action}</span>
                    <span className="font-mono">{log.timestamp}</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-800">{log.actor}</div>
                  <p className="text-[11px] text-slate-500 leading-normal">{log.details}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
