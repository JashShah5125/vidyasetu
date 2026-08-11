import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import type { Student } from '../data/mockData';

export const Students: React.FC = () => {
  const { students: allStudents, addToast, currentUser } = useApp();
  const students = useMemo(() => {
    return currentUser?.role === 'branch-admin'
      ? allStudents.filter(s => s.branch === currentUser.branch)
      : allStudents;
  }, [allStudents, currentUser]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterBatch, setFilterBatch] = useState('All');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [profileTab, setProfileTab] = useState<'overview' | 'parents' | 'fees' | 'results'>('overview');

  // Unique lists for filtering options
  const uniqueCourses = Array.from(new Set(students.map(s => s.course)));
  const uniqueBatches = Array.from(new Set(students.map(s => s.batch)));

  const filteredAndSortedStudents = students
    .filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.studentId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCourse = filterCourse === 'All' || s.course === filterCourse;
      const matchBatch = filterBatch === 'All' || s.batch === filterBatch;
      return matchSearch && matchCourse && matchBatch;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleExportCSV = () => {
    const dataToExport = filteredAndSortedStudents.map(s => ({
      'Student ID': s.studentId,
      'Name': s.name,
      'Course': s.course,
      'Batch': s.batch,
      'Mobile': s.mobile,
      'Parent Contact': s.parentMobile,
      'Total Fees': s.feePlan.total,
      'Paid Fees': s.feePlan.paid,
      'Pending Fees': s.feePlan.pending
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
    link.setAttribute("download", "students_directory.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Student profile records exported to CSV successfully.');
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;
  const paginatedStudents = filteredAndSortedStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredAndSortedStudents.length / itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Student Profile Directory</h2>
          <p className="text-sm text-slate-500 mt-1">Review active student academic rosters, search details, and view payment ledgers.</p>
        </div>
        <Button variant="secondary" onClick={handleExportCSV}>
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm items-end">
        <Input label="Search" placeholder="Search students by name or ID..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          wrapperClassName="sm:col-span-2"
        />
        <Select
          label="Course"
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          options={[
            { value: 'All', label: 'All Courses' },
            ...uniqueCourses.map(c => ({ value: c || '', label: c || '' }))
          ]}
        />
        <Select
          label="Batch"
          value={filterBatch}
          onChange={(e) => setFilterBatch(e.target.value)}
          options={[
            { value: 'All', label: 'All Batches' },
            ...uniqueBatches.map(b => ({ value: b || '', label: b || '' }))
          ]}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enrolled Student Profiles</CardTitle>
        </CardHeader>
        <Table headers={['Student ID', 'Name', 'Course', 'Batch Name', 'Mobile', 'Pending Fees', 'Actions']}>
          {paginatedStudents.map((s, idx) => (
            <tr key={idx} className="hover:bg-slate-50">
              <td className="px-6 py-4 font-mono font-bold text-xs">{s.studentId}</td>
              <td className="px-6 py-4 font-semibold text-slate-800">{s.name}</td>
              <td className="px-6 py-4 text-xs">{s.course}</td>
              <td className="px-6 py-4">{s.batch}</td>
              <td className="px-6 py-4 font-mono text-xs">{s.mobile}</td>
              <td className="px-6 py-4 font-semibold text-red-500">Rs. {s.feePlan.pending}</td>
              <td className="px-6 py-4">
                <Button variant="secondary" size="sm" onClick={() => { setSelectedStudent(s); setProfileTab('overview'); }}>
                  View Profile
                </Button>
              </td>
            </tr>
          ))}
        </Table>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredAndSortedStudents.length}
          pageSize={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </Card>

      {/* Student Profile Dialog */}
      {selectedStudent && (
        <Modal 
          isOpen={!!selectedStudent} 
          onClose={() => setSelectedStudent(null)} 
          title={`Student Profile: ${selectedStudent.name}`}
        >
          <div className="space-y-6">
            {/* Tabs selectors inside profile */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setProfileTab('overview')}
                className={`flex-1 text-center py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
                  profileTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setProfileTab('parents')}
                className={`flex-1 text-center py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
                  profileTab === 'parents' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                }`}
              >
                Parent Contact
              </button>
              <button
                onClick={() => setProfileTab('fees')}
                className={`flex-1 text-center py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
                  profileTab === 'fees' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                }`}
              >
                Fee Ledger
              </button>
              <button
                onClick={() => setProfileTab('results')}
                className={`flex-1 text-center py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
                  profileTab === 'results' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                }`}
              >
                Grades
              </button>
            </div>

            {/* Profile Tab Contents */}
            {profileTab === 'overview' && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                    {selectedStudent.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 text-base">{selectedStudent.name}</h4>
                    <span className="text-xs text-slate-500 font-medium">ID: {selectedStudent.studentId}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 border border-slate-100 rounded-xl">
                  <div>
                    <span className="text-slate-400 text-xs font-semibold uppercase block">Course</span>
                    <strong className="text-slate-700">{selectedStudent.course}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs font-semibold uppercase block">Batch</span>
                    <strong className="text-slate-700">{selectedStudent.batch}</strong>
                  </div>
                  <div className="mt-2">
                    <span className="text-slate-400 text-xs font-semibold uppercase block">Branch</span>
                    <strong className="text-slate-700">{selectedStudent.branch}</strong>
                  </div>
                  <div className="mt-2">
                    <span className="text-slate-400 text-xs font-semibold uppercase block">Join Date</span>
                    <strong className="text-slate-700">{selectedStudent.admissionDate}</strong>
                  </div>
                </div>
              </div>
            )}

            {profileTab === 'parents' && (
              <div className="space-y-3 bg-slate-50 p-4 border border-slate-100 rounded-xl text-sm">
                <div>
                  <span className="text-slate-400 text-xs font-semibold uppercase block">Primary Mobile Contact</span>
                  <strong className="text-slate-700">{selectedStudent.mobile}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-semibold uppercase block">Linked Parent Mobile</span>
                  <strong className="text-slate-700">{selectedStudent.parentMobile}</strong>
                </div>
              </div>
            )}

            {profileTab === 'fees' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-slate-50 p-3 border border-slate-100 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total</span>
                    <div className="font-bold text-slate-700 mt-1">Rs. {selectedStudent.feePlan.total}</div>
                  </div>
                  <div className="bg-slate-50 p-3 border border-slate-100 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Paid</span>
                    <div className="font-bold text-emerald-600 mt-1">Rs. {selectedStudent.feePlan.paid}</div>
                  </div>
                  <div className="bg-slate-50 p-3 border border-slate-100 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Dues</span>
                    <div className="font-bold text-red-600 mt-1">Rs. {selectedStudent.feePlan.pending}</div>
                  </div>
                </div>
              </div>
            )}

            {profileTab === 'results' && (
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl space-y-2 text-sm text-slate-600">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span>Periodic Chem Test #3</span>
                  <strong className="text-slate-800">85/100 (Grade A)</strong>
                </div>
                <div className="flex justify-between">
                  <span>Mechanics Quiz #2</span>
                  <strong className="text-slate-800">92/100 (Grade A+)</strong>
                </div>
              </div>
            )}

          </div>
          <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
            <Button variant="secondary" onClick={() => setSelectedStudent(null)}>
              Close Profile
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
