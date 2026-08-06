import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Pagination } from '../components/ui/Pagination';
import { Plus, ArrowLeft } from 'lucide-react';

export interface AssignmentItem {
  title: string;
  batch: string;
  subject: string;
  dueDate: string;
  status: string;
  attachmentName?: string;
}

export const Assignments: React.FC = () => {
  const { batches, branches, courses } = useApp();
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

  // Selections for batch allocation hierarchy
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedCourse, setSelectedCourse] = useState('All');
  const [selectedProgram, setSelectedProgram] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);

  const uniqueBranches = branches.map(b => b.name);
  const uniqueCourses = courses.map(c => c.name);
  const uniquePrograms = Array.from(new Set(batches.map(b => b.program).filter(Boolean))) as string[];
  const uniqueLevels = Array.from(new Set(batches.map(b => b.level).filter(Boolean))) as string[];
  const uniqueYears = Array.from(new Set(batches.map(b => b.academicYear).filter(Boolean))) as string[];

  const availableBatches = batches.filter(b => {
    const batchBranch = b.branch || 'Mumbai West';
    const matchBranch = selectedBranch === 'All' || batchBranch === selectedBranch;
    const matchCourse = selectedCourse === 'All' || b.course === selectedCourse;
    const matchProgram = selectedProgram === 'All' || b.program === selectedProgram;
    const matchLevel = selectedLevel === 'All' || b.level === selectedLevel;
    const matchYear = selectedYear === 'All' || b.academicYear === selectedYear;
    return matchBranch && matchCourse && matchProgram && matchLevel && matchYear;
  });

  React.useEffect(() => {
    if (availableBatches.length > 0) {
      const isStillAvailable = availableBatches.some(b => b.name === batch);
      if (!isStillAvailable) {
        setBatch(availableBatches[0].name);
      }
    } else {
      setBatch('');
    }
  }, [selectedBranch, selectedCourse, selectedProgram, selectedLevel, selectedYear]);

  const handleOpenAddModal = () => {
    setSelectedBranch('All');
    setSelectedCourse('All');
    setSelectedProgram('All');
    setSelectedLevel('All');
    setSelectedYear('All');
    setAssignmentFile(null);
    if (batches.length > 0) {
      setBatch(batches[0].name);
    }
    setShowAddModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !batch) return;
    setAssignments(prev => [...prev, {
      title,
      batch,
      subject,
      dueDate,
      status: 'Active',
      attachmentName: assignmentFile?.name
    }]);
    setTitle('');
    setAssignmentFile(null);
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Select 
                label="Branch" 
                value={selectedBranch} 
                onChange={(e) => setSelectedBranch(e.target.value)} 
                options={[{ value: 'All', label: 'All Branches' }, ...uniqueBranches.map(b => ({ value: b, label: b }))]}
              />
              <Select 
                label="Course" 
                value={selectedCourse} 
                onChange={(e) => setSelectedCourse(e.target.value)} 
                options={[{ value: 'All', label: 'All Courses' }, ...uniqueCourses.map(c => ({ value: c, label: c }))]}
              />
              <Select 
                label="Program" 
                value={selectedProgram} 
                onChange={(e) => setSelectedProgram(e.target.value)} 
                options={[{ value: 'All', label: 'All Programs' }, ...uniquePrograms.map(p => ({ value: p, label: p }))]}
              />
              <Select 
                label="Level" 
                value={selectedLevel} 
                onChange={(e) => setSelectedLevel(e.target.value)} 
                options={[{ value: 'All', label: 'All Levels' }, ...uniqueLevels.map(l => ({ value: l, label: l }))]}
              />
              <Select 
                label="Academic Year" 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)} 
                options={[{ value: 'All', label: 'All Years' }, ...uniqueYears.map(y => ({ value: y, label: y }))]}
              />
              <Select 
                label="Allocate to Batch" 
                required
                value={batch} 
                onChange={(e) => setBatch(e.target.value)} 
                options={availableBatches.map(b => ({ value: b.name, label: b.name }))}
                disabled={availableBatches.length === 0}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Input label="Submission Deadline" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block font-display">Assignment Details Document (PDF)</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm font-semibold transition-all">
                  <span>Choose PDF File</span>
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setAssignmentFile(file);
                    }}
                  />
                </label>
                {assignmentFile ? (
                  <span className="text-xs text-emerald-650 font-medium font-mono">
                    ✓ {assignmentFile.name}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">No file chosen</span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={!batch}>Publish Assignment</Button>
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
              <td className="px-6 py-4">
                <div className="font-semibold text-slate-800">{a.title}</div>
                {a.attachmentName && (
                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-emerald-650 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-medium font-mono">
                    📄 {a.attachmentName}
                  </span>
                )}
              </td>
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
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={assignments.length}
          pageSize={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </Card>
    </div>
  );
};
