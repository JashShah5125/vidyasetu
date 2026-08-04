import React from 'react';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Table } from '../ui/Table';
import { GraduationCap, Users, BookOpen, ClipboardCheck } from 'lucide-react';

export const InstAdminDashboard: React.FC = () => {
  const { currentUser, students, leads, auditLogs } = useApp();

  if (!currentUser) return null;

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
              {students.map((s, idx) => (
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
