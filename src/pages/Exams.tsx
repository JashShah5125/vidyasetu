import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Pagination } from '../components/ui/Pagination';
import { Plus, ArrowLeft } from 'lucide-react';

export interface ExamItem {
  name: string;
  batch: string;
  totalMarks: number;
  passingMarks: number;
  average: string;
  status: string;
}

export const Exams: React.FC = () => {
  const { batches } = useApp();
  const [exams, setExams] = useState<ExamItem[]>([
    { name: 'Periodic Chemistry Evaluation Test #3', batch: 'JEE-Morning-A', totalMarks: 100, passingMarks: 40, average: '88.5%', status: 'Marks Published' },
    { name: 'Physics Mechanics Weekly Quiz #2', batch: 'JEE-Evening-B', totalMarks: 50, passingMarks: 20, average: '79.2%', status: 'Marks Published' }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterBatch, setFilterBatch] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [showAddModal, setShowAddModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 2;

  const uniqueBatches = Array.from(new Set(exams.map(e => e.batch)));

  const filteredAndSortedExams = exams
    .filter(e => {
      const matchSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchBatch = filterBatch === 'All' || e.batch === filterBatch;
      return matchSearch && matchBatch;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'totalMarks') return b.totalMarks - a.totalMarks;
      return 0;
    });

  const handleExportCSV = () => {
    const dataToExport = filteredAndSortedExams.map(e => ({
      'Exam Name': e.name,
      'Batch': e.batch,
      'Total Marks': e.totalMarks,
      'Passing Marks': e.passingMarks,
      'Class Average': e.average,
      'Status': e.status
    }));
    
    if (dataToExport.length === 0) return;
    const csvRows = [];
    const headers = Object.keys(dataToExport[0]);
    csvRows.push(headers.join(','));
    
    for (const row of dataToExport) {
      const values = headers.map(header => {
        const val = row[header as keyof typeof row] || '';
        const escaped = ('' + val).replace(/"/g, '\\"');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "exams_list.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(filteredAndSortedExams.length / itemsPerPage);
  const paginatedExams = filteredAndSortedExams.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const [name, setName] = useState('');
  const [batch, setBatch] = useState(batches[0]?.name || 'JEE-Morning-A');
  const [totalMarks, setTotalMarks] = useState(100);
  const [passingMarks, setPassingMarks] = useState(40);

  const handleOpenAddModal = () => {
    if (batches.length > 0 && !batch) {
      setBatch(batches[0].name);
    }
    setShowAddModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setExams(prev => [...prev, {
      name,
      batch,
      totalMarks,
      passingMarks,
      average: 'TBD',
      status: 'Scheduled'
    }]);
    setName('');
    setShowAddModal(false);
    setSuccessMessage('New classroom evaluation test scheduled successfully!');
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
            <h2 className="text-2xl font-display font-bold text-slate-900">Schedule Classroom Test</h2>
            <p className="text-sm text-slate-500">Define offline evaluation tests, assign target batches, and record scores.</p>
          </div>
        </div>

        <div className="w-full">
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <Input label="Test Name Title" required placeholder="e.g. Periodic Chemistry Evaluation Test #4" value={name} onChange={(e) => setName(e.target.value)} />
            <Select 
              label="Allocate Target Batch" 
              value={batch} 
              onChange={(e) => setBatch(e.target.value)} 
              options={batches.map(b => ({ value: b.name, label: b.name }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Total Score Marks" type="number" value={totalMarks} onChange={(e) => setTotalMarks(Number(e.target.value))} />
              <Input label="Passing Threshold" type="number" value={passingMarks} onChange={(e) => setPassingMarks(Number(e.target.value))} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Schedule Test</Button>
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
          <h2 className="text-2xl font-display font-bold text-slate-900">Exams &amp; Grading Registers</h2>
          <p className="text-sm text-slate-500 mt-1">Schedule offline classroom exams, enter test marks sheets, and publish report cards.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExportCSV}>Export CSV</Button>
          <Button variant="primary" style={{ gap: '6px' }} onClick={handleOpenAddModal}>
            <Plus size={16} /> Schedule Test
          </Button>
        </div>
      </div>

      {/* Search, Filter, Sort Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm items-end">
        <Input 
          placeholder="Search exams by name..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          wrapperClassName="sm:col-span-2"
        />
        <Select
          label="Batch"
          value={filterBatch}
          onChange={(e) => setFilterBatch(e.target.value)}
          options={[
            { value: 'All', label: 'All Batches' },
            ...uniqueBatches.map(b => ({ value: b, label: b }))
          ]}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming & Completed Exams</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase select-none">Sort By</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 cursor-pointer shadow-sm font-semibold"
            >
              <option value="name">Exam Name</option>
              <option value="totalMarks">Total Marks (Highest first)</option>
            </select>
          </div>
        </CardHeader>
        <Table headers={['Test Name', 'Batch', 'Total Marks', 'Passing Threshold', 'Class average', 'Status']}>
          {paginatedExams.map((e, idx) => (
            <tr key={idx} className="hover:bg-slate-50">
              <td className="px-6 py-4 font-semibold text-slate-800">{e.name}</td>
              <td className="px-6 py-4">{e.batch}</td>
              <td className="px-6 py-4 font-mono text-xs">{e.totalMarks} Marks</td>
              <td className="px-6 py-4 font-mono text-xs">{e.passingMarks} Marks</td>
              <td className="px-6 py-4 font-mono text-xs text-blue-600">{e.average}</td>
              <td className="px-6 py-4">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                  e.status === 'Marks Published' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  {e.status}
                </span>
              </td>
            </tr>
          ))}
        </Table>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredAndSortedExams.length}
          pageSize={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </Card>
    </div>
  );
};
