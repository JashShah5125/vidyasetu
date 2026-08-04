import React from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';

export const Admissions: React.FC = () => {
  const { students, approveStudentRegistration } = useApp();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">Student Admissions Directory</h2>
        <p className="text-sm text-slate-500 mt-1">Track documentation verification files, initial receipt ledger logs, and batch schedules enrollment.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verification Pipeline</CardTitle>
        </CardHeader>
        <Table headers={['Student ID', 'Student Name', 'Allocated Course', 'Branch Location', 'Admission Date', 'Documents', 'Verification Status', 'Actions']}>
          {students.map((s, idx) => (
            <tr key={idx} className="hover:bg-slate-50">
              <td className="px-6 py-4 font-mono font-bold text-xs">{s.studentId}</td>
              <td className="px-6 py-4 font-semibold text-slate-800">{s.name}</td>
              <td className="px-6 py-4 text-xs">{s.course}</td>
              <td className="px-6 py-4">{s.branch}</td>
              <td className="px-6 py-4 font-mono text-xs">{s.admissionDate}</td>
              <td className="px-6 py-4 text-xs font-semibold text-blue-600">
                {s.status === 'Active Student' ? 'Verified (4 Files)' : 'Pending Review'}
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                  s.status === 'Active Student' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  {s.status}
                </span>
              </td>
              <td className="px-6 py-4">
                {s.status !== 'Active Student' ? (
                  <Button variant="primary" size="sm" onClick={() => approveStudentRegistration(s.id)}>
                    Verify & Approve
                  </Button>
                ) : (
                  <span className="text-xs text-slate-400 font-semibold">Approved</span>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
};
