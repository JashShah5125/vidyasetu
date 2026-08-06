import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table } from '../components/ui/Table';
import { Building2, Plus, Search, ArrowRight, Download, ChevronsUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Pagination } from '../components/ui/Pagination';

export const BranchSetup: React.FC = () => {
  const { branches, courses } = useApp();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterProgram, setFilterProgram] = useState('All');
  const [filterCourse, setFilterCourse] = useState('All');
  const [sortBy, setSortBy] = useState('name-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const sortOptions = [
    { value: 'name-asc', label: 'Name (A → Z)' },
    { value: 'name-desc', label: 'Name (Z → A)' },
    { value: 'code-asc', label: 'Code (A → Z)' },
    { value: 'status', label: 'Status' },
    { value: 'capacity-desc', label: 'Capacity (High → Low)' },
    { value: 'capacity-asc', label: 'Capacity (Low → High)' },
  ];

  const statusOptions = [
    { value: 'All', label: 'All Statuses' },
    { value: 'Active', label: 'Active' },
    { value: 'Suspended', label: 'Suspended' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  const filtered = useMemo(() => {
    const list = branches.filter(b => {
      const matchSearch =
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.code.toLowerCase().includes(search.toLowerCase()) ||
        (b.admin || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'All' || b.status === filterStatus;
      const matchProgram = filterProgram === 'All' || (b.programs || []).includes(filterProgram);
      const matchCourse = filterCourse === 'All' || courses.find(c => c.name === filterCourse)?.branches?.includes(b.name);
      return matchSearch && matchStatus && matchProgram && matchCourse;
    });
    return [...list].sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'code-asc') return a.code.localeCompare(b.code);
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      if (sortBy === 'capacity-desc') return (b.capacity || 0) - (a.capacity || 0);
      if (sortBy === 'capacity-asc') return (a.capacity || 0) - (b.capacity || 0);
      return 0;
    });
  }, [branches, courses, search, filterStatus, filterProgram, filterCourse, sortBy]);

  const uniquePrograms = useMemo(() => Array.from(new Set(courses.flatMap(c => c.programs || []))), [courses]);
  const courseOptions = [{ value: 'All', label: 'All Courses' }, ...courses.map(c => ({ value: c.name, label: c.name }))];
  const programOptions = [{ value: 'All', label: 'All Programs' }, ...uniquePrograms.map(p => ({ value: p, label: p }))];

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Suspended': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const rows = filtered.map(b => ({
      'Branch Name': b.name,
      'Code': b.code,
      'Admin': b.admin || '',
      'Address': b.address || '',
      'Phone': b.phone || '',
      'Email': b.email || '',
      'Programs': (b.programs || []).join('; '),
      'Status': b.status
    }));
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h as keyof typeof r]).replace(/"/g, '""')}"`).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'branches.csv';
    a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Branch Management</h2>
          <p className="text-sm text-slate-500 mt-1">Manage and configure all physical centers and branches for your institute.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleExportCSV} className="flex items-center gap-1.5">
            <Download size={15} /> Export CSV
          </Button>
          <Button
          variant="primary"
          onClick={() => navigate('/branches/new')}
          style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}
        >
          <Plus size={16} className="mr-2" /> Create New Branch
        </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm items-end">
        <div className="sm:col-span-2 flex flex-col gap-1.5 w-full">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Search</label>
          <div className="relative w-full">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by branch name, code, admin..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white"
            />
          </div>
        </div>
        <Select
          label="Status"
          options={statusOptions}
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
        />
        <Select
          label="Course"
          options={courseOptions}
          value={filterCourse}
          onChange={e => { setFilterCourse(e.target.value); setCurrentPage(1); }}
        />
        <Select
          label="Program"
          options={programOptions}
          value={filterProgram}
          onChange={e => { setFilterProgram(e.target.value); setCurrentPage(1); }}
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-blue-600" />
            <h3 className="font-bold text-slate-800">All Branches</h3>
            <span className="ml-2 text-xs text-slate-400 font-medium">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase select-none">Sort By</span>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 cursor-pointer shadow-sm font-semibold"
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Building2 size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No branches match your filters.</p>
          </div>
        ) : (
          <>
            <Table headers={['Branch', 'Code', 'Admin', 'Contact', 'Programs', 'Status', 'Actions']}>
              {paginated.map(branch => (
                <tr key={branch.id || branch.code} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{branch.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{branch.address || '—'}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500 uppercase">{branch.code}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{branch.admin || 'Unassigned'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{branch.phone || branch.email || '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(branch.programs || []).map((p, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[10px] font-semibold">{p}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${statusBadge(branch.status)}`}>
                      {branch.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => navigate(`/branches/${branch.id || branch.code}`)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Manage <ArrowRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </Table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }}
            />
          </>
        )}
      </div>
    </div>
  );
};
