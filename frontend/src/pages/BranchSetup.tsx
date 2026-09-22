import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table } from '../components/ui/Table';
import { Building2, Plus, Search, ArrowRight, Download, ChevronsUpDown, Upload, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Pagination } from '../components/ui/Pagination';
import { BulkImportModal } from '../components/ui/BulkImportModal';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { branchApi, toBranch } from '../services/branchApi';

export const BranchSetup: React.FC = () => {
  const { branches, courses, currentUser, setBranches, addToast } = useApp();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterProgram, setFilterProgram] = useState('All');
  const [filterCourse, setFilterCourse] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; code: string; name: string } | null>(null);

  const loadBranches = useCallback(async () => {
    try {
      const result = await branchApi.list({ limit: 1000 });
      setBranches((result.data || []).map((row: any) => toBranch(row)));
    } catch {
      addToast('Failed to load branches.');
    }
  }, [setBranches, addToast]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await branchApi.remove(deleteTarget.id || deleteTarget.code);
      setBranches(prev => prev.filter(b => (b.id || b.code) !== (deleteTarget.id || deleteTarget.code)));
      addToast(`Branch "${deleteTarget.name}" deleted successfully.`, 'success');
      setDeleteTarget(null);
    } catch {
      addToast('Failed to delete branch.', 'error');
    }
  };

  const statusOptions = [
    { value: 'All', label: 'All Statuses' },
    { value: 'Active', label: 'Active' },
    { value: 'Suspended', label: 'Suspended' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  const filtered = useMemo(() => {
    const list = branches.filter(b => {
      const isMyBranch = currentUser?.role === 'branch-admin' ? b.name === currentUser.branch : true;
      const matchSearch =
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.code.toLowerCase().includes(search.toLowerCase()) ||
        (b.admin || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'All' || b.status === filterStatus;
      const matchProgram = filterProgram === 'All' || (b.programs || []).includes(filterProgram);
      const matchCourse = filterCourse === 'All' || courses.find(c => c.name === filterCourse)?.branches?.includes(b.name);
      return isMyBranch && matchSearch && matchStatus && matchProgram && matchCourse;
    });
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [branches, courses, search, filterStatus, filterProgram, filterCourse, currentUser]);

  const uniquePrograms = useMemo(() => {
    const names = courses.flatMap(c => {
      if (Array.isArray(c.programDetails)) return c.programDetails.map((p: any) => typeof p === 'string' ? p : p?.name);
      if (Array.isArray(c.programs)) return c.programs.map((p: any) => typeof p === 'string' ? p : p?.name);
      return [];
    }).filter(Boolean);
    return Array.from(new Set(names));
  }, [courses]);
  const courseOptions = [{ value: 'All', label: 'All Courses' }, ...courses.map(c => ({ value: c.name, label: c.name }))];
  const programOptions = [{ value: 'All', label: 'All Programs' }, ...uniquePrograms.map(p => ({ value: p, label: p }))];

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Suspended': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Deleted': return 'bg-red-50 text-red-700 border-red-200';
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
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-1.5 font-bold">
            <Upload size={14} /> Bulk Import
          </Button>
          <Button variant="secondary" onClick={handleExportCSV} className="flex items-center gap-1.5">
            <Download size={15} /> Export CSV
          </Button>
          {currentUser?.role !== 'branch-admin' && (
            <Button
              variant="primary"
              onClick={() => navigate('/branches/new')}
              style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}
            >
              <Plus size={16} className="mr-2" /> Create New Branch
            </Button>
          )}
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
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Building2 size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No branches match your filters.</p>
          </div>
        ) : (
          <>
            <Table
              dense
              borderless
              minWidth="1020px"
              colWidths={['25%', '11%', '15%', '17%', '16%', '8%', '8%']}
              headers={[
                { label: 'Branch', align: 'left' },
                { label: 'Code', align: 'left' },
                { label: 'Admin', align: 'left' },
                { label: 'Contact', align: 'left' },
                { label: 'Courses', align: 'left' },
                { label: 'Status', align: 'center' },
                { label: 'Actions', align: 'right' }
              ]}
            >
              {paginated.map(branch => (
                <tr key={branch.id || branch.code} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 text-left">
                    <div className="font-semibold text-slate-900 text-sm truncate max-w-[220px]" title={branch.name}>{branch.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[220px]" title={branch.address || '—'}>{branch.address || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-left font-mono text-xs font-bold text-slate-600 uppercase whitespace-nowrap">{branch.code}</td>
                  <td className="px-4 py-3 text-left text-xs text-slate-700 font-medium truncate max-w-[140px]" title={branch.admin || 'Unassigned'}>
                    {branch.admin || 'Unassigned'}
                  </td>
                  <td className="px-4 py-3 text-left text-xs text-slate-600 truncate max-w-[160px]" title={branch.phone || branch.email || '—'}>
                    {branch.phone || branch.email || '—'}
                  </td>
                  <td className="px-4 py-3 text-left">
                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                      {(branch.courses || []).length > 0 ? (
                        (branch.courses || []).map((c, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[10px] font-semibold truncate max-w-[140px]">
                            {c}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusBadge(branch.status)}`}>
                      {branch.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => navigate(`/branches/${branch.id || branch.code}`)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-colors cursor-pointer"
                        title="View Branch"
                      >
                        <Eye size={15} />
                      </button>
                      {currentUser?.role !== 'branch-admin' && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ id: branch.id || '', code: branch.code, name: branch.name })}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
                          title="Delete Branch"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
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

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        itemType="branch"
        itemName={deleteTarget?.name}
        description="Deleting this branch will remove its center configurations and all associated classroom allocations."
      />

      <BulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Bulk Import Branches"
        description="Select a CSV spreadsheet to import multiple branch centers at once. Columns must match the template below exactly."
        sampleHeaders={['Name', 'Code', 'Admin', 'AdminEmail', 'AdminMobile', 'Capacity', 'Status']}
        sampleRows={[
          ['Mumbai South', 'MUM-SOUTH', 'Alok Mehta', 'alok@apexiit.com', '9812739401', '150', 'Active'],
          ['Nashik Center', 'NSK-MAIN', 'Sanjay Dube', 'sanjay@apexiit.com', '9320149582', '200', 'Active']
        ]}
        onImport={(importedRows) => {
          const newBranches = importedRows.map((row, rIdx) => {
            return {
              id: `BRN-${Math.floor(10000 + Math.random() * 90000)}-${rIdx}`,
              name: row['Name'] || 'Imported Branch',
              code: row['Code'] || `B-${Math.floor(100 + Math.random() * 900)}`,
              admin: row['Admin'] || 'Admin',
              adminEmail: row['AdminEmail'] || '',
              adminMobile: row['AdminMobile'] || '',
              capacity: parseInt(row['Capacity'], 10) || 100,
              status: (row['Status'] || 'Active') as any
            };
          });
          setBranches(prev => [...newBranches, ...prev]);
        }}
      />
    </div>
  );
};
