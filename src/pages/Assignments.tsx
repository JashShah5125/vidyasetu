import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Plus, ArrowLeft } from 'lucide-react';

export interface AssignmentItem {
  title: string;
  batch: string;
  subject: string;
  dueDate: string;
  status: string;
}

export const Assignments: React.FC = () => {
  const { batches } = useApp();
  const [assignments, setAssignments] = useState<AssignmentItem[]>([
    { title: 'Electrophilic Addition Quiz Problems', batch: 'JEE-Morning-A', subject: 'Chemistry', dueDate: '2026-07-25', status: 'Active' },
    { title: 'Rotational Dynamics Exercise sheet', batch: 'JEE-Evening-B', subject: 'Physics', dueDate: '2026-07-28', status: 'Active' }
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 2;
  const totalPages = Math.ceil(assignments.length / itemsPerPage);
  const paginatedAssignments = assignments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const [title, setTitle] = useState('');
  const [batch, setBatch] = useState(batches[0]?.name || 'JEE-Morning-A');
  const [subject, setSubject] = useState('Chemistry');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);

  const handleOpenAddModal = () => {
    if (batches.length > 0 && !batch) {
      setBatch(batches[0].name);
    }
    setShowAddModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setAssignments(prev => [...prev, {
      title,
      batch,
      subject,
      dueDate,
      status: 'Active'
    }]);
    setTitle('');
    setShowAddModal(false);
    setSuccessMessage('New homework assignment published and assigned to batch!');
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  if (showAddModal) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(false)}
            className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={26} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">Create Homework Assignment</h2>
            <p className="text-sm text-slate-500">Publish coursework or quiz tasks for active student batches.</p>
          </div>
        </div>

        <div className="w-full">
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <Input label="Assignment Title" required placeholder="e.g. Electrophilic Addition Quiz Problems" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Select 
                label="Allocate to Batch" 
                value={batch} 
                onChange={(e) => setBatch(e.target.value)} 
                options={batches.map(b => ({ value: b.name, label: b.name }))}
              />
              <Select 
                label="Subject Area" 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
                options={[
                  { value: 'Chemistry', label: 'Chemistry' },
                  { value: 'Physics', label: 'Physics' },
                  { value: 'Mathematics', label: 'Mathematics' },
                  { value: 'Biology', label: 'Biology' }
                ]}
              />
            </div>
            <Input label="Submission Deadline" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Publish Assignment</Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm">
          ✓ {successMessage}
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Assignments &amp; Study Materials</h2>
          <p className="text-sm text-slate-500 mt-1">Distribute homework files, assign batch deadlines, and review student uploads.</p>
        </div>
        <Button variant="primary" style={{ gap: '6px' }} onClick={handleOpenAddModal}>
          <Plus size={16} /> Create Assignment
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Class Assignments Ledger</CardTitle>
        </CardHeader>
        <Table headers={['Assignment Title', 'Allotted Batch', 'Subject Name', 'Due Deadline', 'Status']}>
          {paginatedAssignments.map((a, idx) => (
            <tr key={idx} className="hover:bg-slate-50">
              <td className="px-6 py-4 font-semibold text-slate-800">{a.title}</td>
              <td className="px-6 py-4">{a.batch}</td>
              <td className="px-6 py-4">{a.subject}</td>
              <td className="px-6 py-4 font-mono text-xs">{a.dueDate}</td>
              <td className="px-6 py-4">
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600">
                  {a.status}
                </span>
              </td>
            </tr>
          ))}
        </Table>
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 border-t border-slate-200 p-4 text-xs font-semibold text-slate-500 shadow-sm select-none">
            <div>
              Showing <span className="text-slate-800 font-bold">{Math.min((currentPage - 1) * itemsPerPage + 1, assignments.length)}</span> to <span className="text-slate-800 font-bold">{Math.min(currentPage * itemsPerPage, assignments.length)}</span> of <span className="text-slate-855 font-bold">{assignments.length}</span> assignments
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
  );
};
