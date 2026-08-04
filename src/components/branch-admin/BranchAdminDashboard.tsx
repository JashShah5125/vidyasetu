import React from 'react';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Table } from '../ui/Table';
import { GraduationCap, Users, BookOpen, ClipboardCheck } from 'lucide-react';

export const BranchAdminDashboard: React.FC = () => {
  const { currentUser, students, staff, batches } = useApp();

  const branchName = currentUser?.branch || 'Mumbai West';

  // Filter local branch data
  const localStudents = students.filter(s => s.branch === branchName);
  const localStaff = staff.filter(s => s.branch === branchName);
  const localBatches = batches.filter(b => b.room.includes('101') || b.room.includes('102') || b.teacher.includes('Kelkar'));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">
          Branch Hub: {branchName}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Branch dashboard for <strong className="font-semibold text-slate-800">{currentUser?.name}</strong>. Managing local batches and faculty resources.
        </p>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Local Students</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1">{localStudents.length}</div>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
              <GraduationCap size={22} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Branch Staff</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1">{localStaff.length}</div>
            </div>
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center border border-purple-100">
              <Users size={22} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Batches</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1">{localBatches.length}</div>
            </div>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
              <BookOpen size={22} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Local Check-ins</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1">96.2%</div>
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
              <CardTitle>Branch Faculty & Instructors</CardTitle>
            </CardHeader>
            <Table headers={['Faculty Name', 'Email Login', 'Assigned Role', 'Current Status']}>
              {localStaff.map((s, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-slate-800">{s.name}</td>
                  <td className="px-6 py-4 font-mono text-xs">{s.email}</td>
                  <td className="px-6 py-4 text-xs font-semibold text-blue-600 uppercase">{s.role}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                      s.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
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
              <CardTitle>Branch Batches & Classrooms</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              {localBatches.map((b, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{b.name}</div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">{b.timing}</div>
                    <div className="text-xs text-slate-500 mt-1">Instructor: {b.teacher}</div>
                  </div>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold uppercase">{b.room}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
