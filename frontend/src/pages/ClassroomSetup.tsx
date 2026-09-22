import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { classroomApi, ROOM_TYPES, STATUS_OPTIONS } from '../services/classroomApi';
import type { Classroom, ClassroomType, ClassroomStatus } from '../services/classroomApi';
import { branchApi, toBranch } from '../services/branchApi';
import type { Branch } from '../types';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import {
  DoorOpen,
  Plus,
  Search,
  Download,
  Edit3,
  Trash2,
  Upload,
  Loader2,
  Building2,
  AlertTriangle,
  Layers,
  Users,
  CheckCircle2,
  Wrench
} from 'lucide-react';
import { BulkImportModal } from '../components/ui/BulkImportModal';

const statusBadgeClasses: Record<ClassroomStatus, string> = {
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Inactive: 'bg-slate-100 text-slate-500 border-slate-200',
  'Under Maintenance': 'bg-amber-50 text-amber-700 border-amber-200',
  Deleted: 'bg-red-50 text-red-700 border-red-200',
};

const typeBadgeClasses: Record<ClassroomType, string> = {
  Classroom: 'bg-blue-50 text-blue-700 border-blue-100',
  Lab: 'bg-purple-50 text-purple-700 border-purple-100',
  'Seminar Hall': 'bg-teal-50 text-teal-700 border-teal-100',
  'Computer Lab': 'bg-orange-50 text-orange-700 border-orange-100',
};

interface ClassroomFormData {
  branchId: string;
  name: string;
  roomNumber: string;
  capacity: string;
  type: ClassroomType;
  status: ClassroomStatus;
}

const emptyForm: ClassroomFormData = {
  branchId: '',
  name: '',
  roomNumber: '',
  capacity: '',
  type: 'Classroom',
  status: 'Active',
};

export const ClassroomSetup: React.FC = () => {
  const { branches: contextBranches, currentUser, addToast } = useApp();
  const [branches, setBranches] = useState<Branch[]>(contextBranches);

  // Load all accessible branches
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await branchApi.list({ limit: 1000 });
        if (!cancelled && res?.status === 'success') {
          setBranches((res.data || []).map((row: any) => toBranch(row)));
        }
      } catch {
        setBranches(contextBranches);
      }
    })();
    return () => { cancelled = true; };
  }, [contextBranches]);

  const isBranchAdmin = currentUser?.role === 'branch-admin' || currentUser?.role === 'branch_admin';

  const accessibleBranches = useMemo(() => {
    if (isBranchAdmin && currentUser?.branch) {
      const matched = branches.filter(b => b.name === currentUser.branch || b.code === currentUser.branch);
      return matched.length ? matched : branches;
    }
    return branches;
  }, [branches, currentUser, isBranchAdmin]);

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState<string>(() => {
    if (isBranchAdmin) {
      return accessibleBranches[0]?.id ? String(accessibleBranches[0].id) : 'All';
    }
    return 'All';
  });

  // Sync filterBranch when accessibleBranches load for branch admins
  useEffect(() => {
    if (isBranchAdmin && accessibleBranches.length > 0 && filterBranch === 'All') {
      setFilterBranch(String(accessibleBranches[0].id));
    }
  }, [isBranchAdmin, accessibleBranches, filterBranch]);

  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [form, setForm] = useState<ClassroomFormData>({ ...emptyForm });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Soft delete state
  const [deleteTarget, setDeleteTarget] = useState<Classroom | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Load classrooms from branch-scoped / tenant API
  const loadClassrooms = useCallback(async () => {
    setIsLoading(true);
    try {
      const activeBranch = filterBranch !== 'All' ? filterBranch : (isBranchAdmin ? accessibleBranches[0]?.id : undefined);
      const res = await classroomApi.list({
        branchId: activeBranch,
        limit: 1000
      });
      if (res?.status === 'success') {
        setClassrooms(res.data || []);
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to fetch classrooms', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [filterBranch, isBranchAdmin, accessibleBranches, addToast]);

  useEffect(() => {
    loadClassrooms();
  }, [loadClassrooms]);

  const branchFilterOptions = useMemo(() => {
    if (isBranchAdmin) {
      return accessibleBranches.map(b => ({ value: String(b.id), label: b.name }));
    }
    return [
      { value: 'All', label: 'All Branches' },
      ...branches.map(b => ({ value: String(b.id), label: b.name })),
    ];
  }, [accessibleBranches, branches, isBranchAdmin]);

  // Client-side filtering & sorting for instant search and pagination
  const filtered = useMemo(() => {
    return classrooms
      .filter(c => {
        const matchBranch =
          filterBranch === 'All' ||
          String(c.branchId) === String(filterBranch) ||
          c.branchName === filterBranch;
        const matchType = filterType === 'All' || c.type === filterType;
        const matchStatus = filterStatus === 'All' || c.status === filterStatus;
        const searchLower = search.toLowerCase().trim();
        const matchSearch =
          !searchLower ||
          c.name.toLowerCase().includes(searchLower) ||
          c.roomNumber.toLowerCase().includes(searchLower) ||
          c.branchName.toLowerCase().includes(searchLower);
        return matchBranch && matchType && matchStatus && matchSearch;
      })
      .sort((a, b) => a.branchName.localeCompare(b.branchName) || a.name.localeCompare(b.name));
  }, [classrooms, search, filterBranch, filterType, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Selected Branch Object for Form
  const currentBranchForForm = useMemo(() => {
    const targetBranchId = form.branchId || (filterBranch !== 'All' ? filterBranch : accessibleBranches[0]?.id);
    return branches.find(b => String(b.id) === String(targetBranchId)) || accessibleBranches[0] || branches[0];
  }, [form.branchId, filterBranch, accessibleBranches, branches]);

  // Form Handlers
  const handleOpenAdd = () => {
    const defaultBranchId = filterBranch !== 'All'
      ? filterBranch
      : (accessibleBranches[0]?.id ? String(accessibleBranches[0].id) : (branches[0]?.id ? String(branches[0].id) : ''));

    setForm({
      ...emptyForm,
      branchId: defaultBranchId,
    });
    setFormErrors({});
    setEditingClassroom(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (c: Classroom) => {
    setForm({
      branchId: c.branchId,
      name: c.name,
      roomNumber: c.roomNumber,
      capacity: String(c.capacity),
      type: c.type,
      status: c.status,
    });
    setFormErrors({});
    setEditingClassroom(c);
    setIsFormModalOpen(true);
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!form.branchId) {
      errs.branchId = 'Branch is required.';
    }
    if (!form.name.trim()) {
      errs.name = 'Classroom name is required.';
    } else if (form.name.trim().length > 100) {
      errs.name = 'Name cannot exceed 100 characters.';
    }

    if (form.roomNumber.trim().length > 50) {
      errs.roomNumber = 'Room number cannot exceed 50 characters.';
    }

    const cap = parseInt(form.capacity as string, 10);
    if (!form.capacity || isNaN(cap) || cap <= 0) {
      errs.capacity = 'Capacity must be a positive integer.';
    } else if (cap > 1000) {
      errs.capacity = 'Capacity cannot exceed 1000.';
    }

    return errs;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    setIsSubmitting(true);
    const branchId = form.branchId;

    try {
      if (editingClassroom) {
        const updatePayload = {
          name: form.name.trim(),
          roomNumber: form.roomNumber.trim() || undefined,
          capacity: parseInt(form.capacity, 10),
          type: form.type,
          status: form.status,
        };
        const res = await classroomApi.update(branchId, editingClassroom.id, updatePayload);
        addToast(res?.message || `Classroom "${form.name}" updated successfully.`, 'success');
      } else {
        const createPayload = {
          name: form.name.trim(),
          roomNumber: form.roomNumber.trim() || undefined,
          capacity: parseInt(form.capacity, 10),
          type: form.type,
          status: form.status,
        };
        const res = await classroomApi.create(branchId, createPayload);
        addToast(res?.message || `Classroom "${form.name}" added successfully.`, 'success');
      }

      setIsFormModalOpen(false);
      await loadClassrooms();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setFormErrors({ roomNumber: err.response?.data?.message || 'A classroom with this room number already exists in this branch.' });
      } else {
        addToast(err.response?.data?.message || 'Failed to save classroom', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Handlers
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await classroomApi.delete(deleteTarget.branchId, deleteTarget.id);
      addToast(res?.message || `Classroom "${deleteTarget.name}" deleted successfully.`, 'success');
      setDeleteTarget(null);
      await loadClassrooms();
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to delete classroom', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // CSV Export
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
    a.download = `classrooms_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const setF = (key: keyof ClassroomFormData, val: string) => {
    setForm(f => ({ ...f, [key]: val }));
    if (formErrors[key]) {
      setFormErrors(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }
  };

  return (
    <div className="space-y-6 w-full animate-fade-in pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 border border-blue-200 text-blue-600 rounded-xl">
              <DoorOpen size={22} />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-slate-900">Classroom Master</h2>
              <p className="text-sm text-slate-500">
                Manage physical classrooms, labs, and lecture halls for timetable scheduling.
              </p>
            </div>
          </div>
        </div>
        <Button variant="primary" onClick={handleOpenAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20">
          <Plus size={16} /> Add Classroom
        </Button>
      </div>

      {/* Summary metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Rooms</span>
            <Layers size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{filtered.length}</div>
          <div className="text-xs text-slate-400 mt-0.5">Across active scope</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Active Rooms</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">
            {filtered.filter(c => c.status === 'Active').length}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Ready for lectures</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Under Maintenance</span>
            <Wrench size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">
            {filtered.filter(c => c.status === 'Under Maintenance').length}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Temporarily unavailable</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Total Seat Capacity</span>
            <Users size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-blue-600 mt-1">
            {filtered.filter(c => c.status === 'Active').reduce((s, c) => s + c.capacity, 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Active seating capacity</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col xl:flex-row gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm items-end">
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Search</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition duration-150"
                placeholder="Search by name, room number..."
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>

          {!isBranchAdmin && (
            <Select
              label="Branch"
              value={filterBranch}
              onChange={e => { setFilterBranch(e.target.value); setCurrentPage(1); }}
              options={branchFilterOptions}
            />
          )}

          <Select
            label="Room Type"
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

        <div className="flex-shrink-0 flex items-center gap-2 w-full xl:w-auto justify-end">
          <Button variant="secondary" onClick={() => setIsImportModalOpen(true)} className="h-[38px] flex items-center gap-1 font-bold">
            <Upload size={14} /> Bulk Import
          </Button>
          <Button variant="secondary" onClick={handleExportCSV} className="h-[38px] flex items-center gap-1">
            <Download size={14} /> Export CSV
          </Button>
        </div>
      </div>

      {/* Classroom Registry Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DoorOpen size={18} className="text-slate-400" />
            <h3 className="font-bold text-slate-800 text-sm">
              Classroom Directory
              <span className="ml-2 text-xs font-normal text-slate-400">
                ({filtered.length} room{filtered.length !== 1 ? 's' : ''})
              </span>
            </h3>
          </div>
          {isBranchAdmin && accessibleBranches[0] && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600">
              <Building2 size={12} className="text-slate-400" />
              <span>{accessibleBranches[0].name}</span>
            </div>
          )}
        </div>

        <Table headers={['Room Name', ...(!isBranchAdmin ? ['Branch'] : []), 'Type', 'Capacity', 'Status', 'Actions']}>
          {isLoading ? (
            <tr>
              <td colSpan={isBranchAdmin ? 5 : 6} className="px-6 py-16">
                <div className="text-center flex flex-col items-center justify-center text-slate-400">
                  <Loader2 size={32} className="animate-spin mb-3 text-blue-500" />
                  <p className="text-sm font-semibold text-slate-600">Loading classrooms...</p>
                </div>
              </td>
            </tr>
          ) : paginated.length === 0 ? (
            <tr>
              <td colSpan={isBranchAdmin ? 5 : 6} className="px-6 py-16">
                <div className="text-center flex flex-col items-center justify-center">
                  <div className="bg-blue-50 p-4 rounded-full mb-4">
                    <DoorOpen size={40} className="text-blue-500" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">No classrooms found</h3>
                  <p className="text-slate-500 max-w-sm mb-6 text-sm">
                    {search || filterType !== 'All' || filterStatus !== 'All'
                      ? 'No classrooms match your current filters. Try resetting the filters.'
                      : 'Get started by creating your first classroom for scheduling.'}
                  </p>
                  <Button
                    variant="primary"
                    onClick={handleOpenAdd}
                    className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                  >
                    <Plus size={16} /> Add Classroom
                  </Button>
                </div>
              </td>
            </tr>
          ) : (
            paginated.map(c => (
              <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                {/* Room Name & Room Number */}
                <td className="px-5 py-3.5">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-sm">{c.name}</span>
                    <span className="text-xs text-slate-500 font-medium mt-0.5">
                      {c.roomNumber ? `Room: ${c.roomNumber}` : 'No room code'}
                    </span>
                  </div>
                </td>

                {/* Branch (if visible) */}
                {!isBranchAdmin && (
                  <td className="px-5 py-3.5 text-sm text-slate-600 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Building2 size={13} className="text-slate-400" />
                      <span>{c.branchName}</span>
                    </div>
                  </td>
                )}

                {/* Type */}
                <td className="px-5 py-3.5 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border ${typeBadgeClasses[c.type] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                    {c.type}
                  </span>
                </td>

                {/* Capacity */}
                <td className="px-5 py-3.5 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    <span>{c.capacity}</span>
                    <span className="text-xs text-slate-400 font-normal">seats</span>
                  </div>
                </td>

                {/* Status */}
                <td className="px-5 py-3.5 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusBadgeClasses[c.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {c.status}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-5 py-3.5 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(c)}
                      title="Edit Classroom"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(c)}
                      title="Delete Classroom"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
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

      {/* Create / Edit Classroom Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingClassroom ? 'Edit Classroom' : 'Add New Classroom'}
        size="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Branch Badge / Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Branch</label>
            {!editingClassroom && !isBranchAdmin ? (
              <Select
                value={form.branchId}
                onChange={e => setF('branchId', e.target.value)}
                options={branches.map(b => ({ value: String(b.id), label: b.name }))}
                error={formErrors.branchId}
              />
            ) : (
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800">
                <Building2 size={16} className="text-slate-500" />
                <span>{currentBranchForForm?.name || 'Assigned Branch'}</span>
                <span className="ml-auto text-xs font-normal text-slate-400">(Branch-owned master)</span>
              </div>
            )}
          </div>

          {/* Row 1: Room Name & Room Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Room Name *"
              id="cr-name"
              required
              placeholder="e.g. Physics Lab, Room 101"
              value={form.name}
              onChange={e => setF('name', e.target.value)}
              error={formErrors.name}
            />
            <Input
              label="Room Number / Code"
              id="cr-roomno"
              placeholder="e.g. 101, LAB-01, Hall-A"
              value={form.roomNumber}
              onChange={e => setF('roomNumber', e.target.value)}
              error={formErrors.roomNumber}
            />
          </div>

          {/* Row 2: Room Type & Seating Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Select
              label="Room Type *"
              id="cr-type"
              value={form.type}
              onChange={e => setF('type', e.target.value as ClassroomType)}
              options={ROOM_TYPES.map(t => ({ value: t, label: t }))}
              error={formErrors.type}
            />
            <Input
              label="Seating Capacity *"
              id="cr-capacity"
              required
              type="number"
              min={1}
              max={1000}
              placeholder="e.g. 60"
              value={form.capacity}
              onChange={e => setF('capacity', e.target.value)}
              error={formErrors.capacity}
            />
          </div>

          {/* Row 3: Status */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Classroom Status *</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Active', 'Inactive', 'Under Maintenance'] as ClassroomStatus[]).map(statusOpt => {
                const isSelected = form.status === statusOpt;
                return (
                  <button
                    key={statusOpt}
                    type="button"
                    onClick={() => setF('status', statusOpt)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                      isSelected
                        ? statusOpt === 'Active'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 ring-2 ring-emerald-100'
                          : statusOpt === 'Under Maintenance'
                          ? 'bg-amber-50 border-amber-300 text-amber-700 ring-2 ring-amber-100'
                          : 'bg-slate-100 border-slate-300 text-slate-700 ring-2 ring-slate-200'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {statusOpt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsFormModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {editingClassroom ? 'Save Changes' : 'Save Room'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Soft Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Classroom"
        size="md"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 text-sm">
              <AlertTriangle size={22} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-red-900 mb-0.5">Confirm Soft Delete</h4>
                <p className="text-xs text-red-800 leading-relaxed">
                  Are you sure you want to delete classroom <span className="font-bold">{deleteTarget.name}</span>
                  {deleteTarget.roomNumber ? ` (${deleteTarget.roomNumber})` : ''}? This action will remove it from active scheduling.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                variant="secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={14} />}
                Confirm Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Bulk Import Classrooms"
        description="Select a CSV spreadsheet to import multiple classrooms at once. Columns must match the template below exactly."
        sampleHeaders={['Name', 'RoomNumber', 'Capacity', 'Type', 'Status', 'BranchName']}
        sampleRows={[
          ['Room 201', '201', '60', 'Classroom', 'Active', 'Mumbai West'],
          ['Chemistry Lab B', 'L-02', '35', 'Lab', 'Active', 'Pune Camp']
        ]}
        onImport={(importedRows) => {
          const newRooms = importedRows.map((row, rIdx) => {
            const bName = row['BranchName'] || 'Mumbai West';
            const bId = branches.find(b => b.name === bName || b.code === bName)?.id || bName;
            return {
              id: `CR-IMP-${Math.floor(10000 + Math.random() * 90000)}-${rIdx}`,
              branchId: String(bId),
              branchName: bName,
              name: row['Name'] || 'Imported Room',
              roomNumber: row['RoomNumber'] || '101',
              capacity: parseInt(row['Capacity'], 10) || 50,
              type: (row['Type'] || 'Classroom') as ClassroomType,
              status: (row['Status'] || 'Active') as ClassroomStatus
            };
          });
          setClassrooms(prev => [...newRooms, ...prev]);
          addToast(`Imported ${newRooms.length} classroom(s) successfully.`, 'success');
        }}
      />
    </div>
  );
};
