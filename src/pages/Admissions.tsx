import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Pagination } from '../components/ui/Pagination';

export const Admissions: React.FC = () => {
  const { students, approveStudentRegistration } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  const uniqueCourses = Array.from(new Set(students.map(s => s.course)));
  const uniqueStatuses = Array.from(new Set(students.map(s => s.status)));

  const filteredAndSortedStudents = students
    .filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.studentId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCourse = filterCourse === 'All' || s.course === filterCourse;
      const matchStatus = filterStatus === 'All' || s.status === filterStatus;
      return matchSearch && matchCourse && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'studentId') return a.studentId.localeCompare(b.studentId);
      if (sortBy === 'admissionDate') return a.admissionDate.localeCompare(b.admissionDate);
      return 0;
    });

  const handleExportCSV = () => {
    const dataToExport = filteredAndSortedStudents.map(s => ({
      'Student ID': s.studentId,
      'Name': s.name,
      'Course': s.course,
      'Branch': s.branch,
      'Admission Date': s.admissionDate,
      'Status': s.status
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
    link.setAttribute("download", "admissions_pipeline.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(filteredAndSortedStudents.length / itemsPerPage);
  const paginatedStudents = filteredAndSortedStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Student Admissions Directory</h2>
          <p className="text-sm text-slate-500 mt-1">Track documentation verification files, initial receipt ledger logs, and batch schedules enrollment.</p>
        </div>
        <Button variant="secondary" onClick={handleExportCSV}>Export CSV</Button>
      </div>

      {/* Search, Filter, Sort Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm items-end">
        <Input 
          placeholder="Search by ID, name..." 
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
            ...uniqueCourses.map(c => ({ value: c, label: c }))
          ]}
        />
        <Select
          label="Verification Status"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          options={[
            { value: 'All', label: 'All Statuses' },
            ...uniqueStatuses.map(st => ({ value: st, label: st }))
          ]}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verification Pipeline</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase select-none">Sort By</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 cursor-pointer shadow-sm font-semibold"
            >
              <option value="name">Student Name</option>
              <option value="studentId">Student ID</option>
              <option value="admissionDate">Admission Date</option>
            </select>
          </div>
        </CardHeader>
        <Table headers={['Student ID', 'Student Name', 'Allocated Course', 'Branch Location', 'Admission Date', 'Documents', 'Verification Status', 'Actions']}>
          {paginatedStudents.map((s, idx) => (
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
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredAndSortedStudents.length}
          pageSize={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </Card>
    </div>
  );
};
