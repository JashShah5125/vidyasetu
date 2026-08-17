import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Pagination } from '../components/ui/Pagination';
import { DoorOpen, Plus, Search, Download, ArrowLeft, Edit2, Trash2 } from 'lucide-react';

export interface Classroom {
  id: string;
  branchId: string;
  branchName: string;
  name: string;
  roomNumber: string;
  capacity: number;
  type: 'Classroom' | 'Lab' | 'Seminar Hall' | 'Computer Lab';
  status: 'Active' | 'Inactive' | 'Under Maintenance';
}

const ROOM_TYPES = ['Classroom', 'Lab', 'Seminar Hall', 'Computer Lab'] as const;
const STATUS_OPTIONS = ['Active', 'Inactive', 'Under Maintenance'] as const;

const statusColors: Record<Classroom['status'], string> = {
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Inactive: 'bg-slate-100 text-slate-500 border-slate-200',
  'Under Maintenance': 'bg-amber-50 text-amber-700 border-amber-200',
};

const typeColors: Record<Classroom['type'], string> = {
  Classroom: 'bg-blue-50 text-blue-700',
  Lab: 'bg-purple-50 text-purple-700',
  'Seminar Hall': 'bg-teal-50 text-teal-700',
  'Computer Lab': 'bg-orange-50 text-orange-700',
};

const emptyForm = {
  branchId: '',
  name: '',
  roomNumber: '',
  capacity: '',
  type: 'Classroom' as Classroom['type'],
  status: 'Active' as Classroom['status'],
};

export const ClassroomSetup: React.FC = () => {
  const { branches, currentUser } = useApp();

  const accessibleBranches = useMemo(() => {
    if (currentUser?.role === 'branch-admin') {
      return branches.filter(b => b.name === currentUser.branch);
    }
    return branches;
  }, [branches, currentUser]);

  const [classrooms, setClassrooms] = useState<Classroom[]>(() => {
    const initial: Classroom[] = [];
    branches.forEach(b => {
      initial.push(
        {
          id: `CR-${b.id ?? b.code}-001`,
          branchId: b.id ?? b.name,
          branchName: b.name,
          name: 'Room 101',
          roomNumber: '101',
          capacity: 60,
          type: 'Classroom',
          status: 'Active',
        },
        {
          id: `CR-${b.id ?? b.code}-002`,
          branchId: b.id ?? b.name,
          branchName: b.name,
          name: 'Physics Lab',
          roomNumber: 'L-01',
          capacity: 30,
          type: 'Lab',
          status: 'Active',
        }
      );
    });
    return initial;
  });

  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState(
    currentUser?.role === 'branch-admin'
      ? (accessibleBranches[0]?.id ?? accessibleBranches[0]?.name ?? 'All')
      : 'All'
  );
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');

  const branchFilterOptions = useMemo(() => {
    if (currentUser?.role === 'branch-admin') {
      return accessibleBranches.map(b => ({ value: b.id ?? b.name, label: b.name }));
    }
    return [
      { value: 'All', label: 'All Branches' },
      ...accessibleBranches.map(b => ({ value: b.id ?? b.name, label: b.name })),
    ];
  }, [accessibleBranches, currentUser]);

  const branchFormOptions = useMemo(() =>
    accessibleBranches.map(b => ({ value: b.id ?? b.name, label: b.name })),
    [accessibleBranches]
  );

  const filtered = useMemo(() => {
    return classrooms
      .filter(c => {
        const matchBranch =
          currentUser?.role === 'branch-admin'
            ? c.branchName === currentUser.branch
            : filterBranch === 'All' || c.branchId === filterBranch;
        const matchType = filterType === 'All' || c.type === filterType;
        const matchStatus = filterStatus === 'All' || c.status === filterStatus;
        const matchSearch =
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.roomNumber.toLowerCase().includes(search.toLowerCase());
        return matchBranch && matchType && matchStatus && matchSearch;
      })
      .sort((a, b) => a.branchName.localeCompare(b.branchName) || a.name.localeCompare(b.name));
  }, [classrooms, search, filterBranch, filterType, filterStatus, currentUser]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.branchId) errs.branchId = 'Branch is required.';
    if (!form.name.trim()) errs.name = 'Classroom name is required.';
    if (!form.roomNumber.trim()) errs.roomNumber = 'Room number is required.';
    const cap = parseInt(form.capacity as string);
    if (!form.capacity || isNaN(cap) || cap <= 0) errs.capacity = 'Enter a valid capacity (> 0).';
    return errs;
  };

  const isDuplicate = () =>
    classrooms.some(
      c =>
        c.branchId === form.branchId &&
        c.roomNumber.trim().toLowerCase() === form.roomNumber.trim().toLowerCase() &&
        c.id !== editingId
    );

  const handleOpenAdd = () => {
    setForm({ ...emptyForm, branchId: branchFormOptions[0]?.value ?? '' });
    setFormErrors({});
    setEditingId(null);
    setShowModal(true);
  };

  const handleOpenEdit = (c: Classroom) => {
    setForm({
      branchId: c.branchId,
      name: c.name,
      roomNumber: c.roomNumber,
      capacity: c.capacity.toString(),
      type: c.type,
      status: c.status,
    });
    setFormErrors({});
    setEditingId(c.id);
    setShowModal(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Delete classroom "${name}"? This cannot be undone.`)) return;
    setClassrooms(prev => prev.filter(c => c.id !== id));
    flash(`Classroom "${name}" deleted.`);
  };

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    if (isDuplicate()) {
      setFormErrors({ roomNumber: 'A classroom with this room number already exists in this branch.' });
      return;
    }
    const branchName = accessibleBranches.find(b => (b.id ?? b.name) === form.branchId)?.name ?? form.branchId;

    if (editingId) {
      setClassrooms(prev =>
        prev.map(c =>
          c.id === editingId
            ? {
                ...c,
                branchId: form.branchId,
                branchName,
                name: form.name.trim(),
                roomNumber: form.roomNumber.trim(),
                capacity: parseInt(form.capacity as string),
                type: form.type,
                status: form.status,
              }
            : c
        )
      );
      flash(`Classroom "${form.name.trim()}" updated.`);
    } else {
      setClassrooms(prev => [
        ...prev,
        {
          id: `CR-${form.branchId}-${Date.now()}`,
          branchId: form.branchId,
          branchName,
          name: form.name.trim(),
          roomNumber: form.roomNumber.trim(),
          capacity: parseInt(form.capacity as string),
          type: form.type,
          status: form.status,
        },
      ]);
      flash(`Classroom "${form.name.trim()}" added to ${branchName}.`);
    }
    setShowModal(false);
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const rows = filtered.map(c => ({
      Branch: c.branchName,
      'Room Name': c.name,
      'Room Number': c.roomNumber,
      Capacity: c.capacity,
      Type: c.type,
      Status: c.status,
    }));
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map(r =>
        headers.map(h => `"${String(r[h as keyof typeof r]).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'classrooms.csv';
    a.click();
  };

  const setF = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  // ── Modal ──────────────────────────────────────────────────────────────────
  if (showModal) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">
              {editingId ? 'Edit Classroom' : 'Add Classroom'}
            </h2>
            <p className="text-sm text-slate-500">Fill in the classroom details below.</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5"
        >
          <Select
            label="Branch"
            required
            id="cr-branch"
            value={form.branchId}
            onChange={e => setF('branchId', e.target.value)}
            options={branchFormOptions}
            error={formErrors.branchId}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Classroom Name"
              id="cr-name"
              required
              placeholder="e.g. Room 101, Physics Lab"
              value={form.name}
              onChange={e => setF('name', e.target.value)}
              error={formErrors.name}
            />
            <Input
              label="Room Number / Code"
              id="cr-roomno"
              required
              placeholder="e.g. 101, L-01, Hall-A"
              value={form.roomNumber}
              onChange={e => setF('roomNumber', e.target.value)}
              error={formErrors.roomNumber}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Seating Capacity"
              id="cr-capacity"
              required
              type="number"
              min={1}
              placeholder="e.g. 60"
              value={form.capacity}
              onChange={e => setF('capacity', e.target.value)}
              error={formErrors.capacity}
            />
            <Select
              label="Room Type"
              id="cr-type"
              value={form.type}
              onChange={e => setF('type', e.target.value)}
              options={ROOM_TYPES.map(t => ({ value: t, label: t }))}
            />
          </div>

          <Select
            label="Status"
            id="cr-status"
            value={form.status}
            onChange={e => setF('status', e.target.value)}
            options={STATUS_OPTIONS.map(s => ({ value: s, label: s }))}
          />

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingId ? 'Save Changes' : 'Add Classroom'}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // ── List ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm">
          ✓ {successMsg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Classroom Master</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage physical classrooms, labs, and halls available for scheduling.
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenAdd} style={{ gap: '6px' }}>
          <Plus size={16} /> Add Classroom
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col xl:flex-row gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm items-end">
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Search</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition duration-150"
                placeholder="Search by name or room number..."
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>

          <Select
            label="Branch"
            value={filterBranch}
            onChange={e => { setFilterBranch(e.target.value); setCurrentPage(1); }}
            options={branchFilterOptions}
            disabled={currentUser?.role === 'branch-admin'}
          />

          <Select
            label="Type"
            value={filterType}
            onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }}
            options={[{ value: 'All', label: 'All Types' }, ...ROOM_TYPES.map(t => ({ value: t, label: t }))]}
          />

          <Select
            label="Status"
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            options={[{ value: 'All', label: 'All Statuses' }, ...STATUS_OPTIONS.map(s => ({ value: s, label: s }))]}
          />
        </div>
        <div className="flex-shrink-0">
          <Button variant="secondary" onClick={handleExportCSV} style={{ gap: '6px' }} className="h-[38px]">
            <Download size={14} /> Export CSV
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Rooms', value: filtered.length, color: 'text-slate-900' },
          { label: 'Active Rooms', value: filtered.filter(c => c.status === 'Active').length, color: 'text-emerald-600' },
          { label: 'Under Maintenance', value: filtered.filter(c => c.status === 'Under Maintenance').length, color: 'text-amber-600' },
          {
            label: 'Total Seat Capacity',
            value: filtered.filter(c => c.status === 'Active').reduce((s, c) => s + c.capacity, 0).toLocaleString(),
            color: 'text-blue-600',
          },
        ].map(card => (
          <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{card.label}</div>
            <div className={`text-2xl font-extrabold mt-1 ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <DoorOpen size={18} className="text-slate-400" />
          <h3 className="font-bold text-slate-800 text-sm">
            Classroom Registry
            <span className="ml-2 text-xs font-normal text-slate-400">
              ({filtered.length} room{filtered.length !== 1 ? 's' : ''})
            </span>
          </h3>
        </div>

        <Table headers={['Room Name', 'Room No.', 'Branch', 'Type', 'Capacity', 'Status', 'Actions']}>
          {paginated.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                No classrooms found. Click "Add Classroom" to get started.
              </td>
            </tr>
          ) : (
            paginated.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-4">
                  <div className="font-semibold text-slate-800 text-sm">{c.name}</div>
                </td>
                <td className="px-5 py-4">
                  <span className="font-mono text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {c.roomNumber}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-slate-600 font-medium">{c.branchName}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold ${typeColors[c.type]}`}>
                    {c.type}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-700">{c.capacity}</span>
                    <span className="text-xs text-slate-400">seats</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${statusColors[c.status]}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1.5 border border-slate-200 text-blue-600 bg-blue-50/50 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1.5 border border-red-100 text-red-600 bg-red-50/50 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </Table>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={p => setCurrentPage(p)}
          onPageSizeChange={s => { setPageSize(s); setCurrentPage(1); }}
        />
      </div>
    </div>
  );
};
