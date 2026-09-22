import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { batchApi, BATCH_STATUS_OPTIONS, formatBatchTiming } from '../services/batchApi';
import type { Batch, BatchStatus, AcademicYear } from '../services/batchApi';
import { classroomApi } from '../services/classroomApi';
import { branchApi, toBranch } from '../services/branchApi';
import { courseApi } from '../services/courseApi';
import type { CourseApiProgram } from '../services/courseApi';
import type { Branch } from '../types';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { BulkImportModal } from '../components/ui/BulkImportModal';
import {
  Layers, Plus, Search, Download, ArrowLeft, Edit3, Trash2,
  Upload, Loader2, AlertTriangle, ShieldAlert, CheckCircle2,
  Power, Users, MapPin, ChevronRight, BookOpen, Clock, Building,
  Filter, X, ChevronDown, RotateCcw
} from 'lucide-react';

const statusColors: Record<BatchStatus, string> = {
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Inactive: 'bg-slate-100 text-slate-500 border-slate-200',
  Deleted: 'bg-red-50 text-red-700 border-red-200',
};

interface CourseOption {
  id: string;
  code: string;
  name: string;
}

interface ClassroomOpt {
  id: string;
  name: string;
  branchId: string;
}

interface BatchForm {
  name: string;
  code: string;
  branchId: string;
  academicYearId: string;
  courseCode: string;
  programId: string;
  levelId: string;
  capacity: string;
  startTime: string;
  endTime: string;
  classroomId: string;
  status: BatchStatus;
}

const emptyForm: BatchForm = {
  name: '',
  code: '',
  branchId: '',
  academicYearId: '',
  courseCode: '',
  programId: '',
  levelId: '',
  capacity: '',
  startTime: '',
  endTime: '',
  classroomId: '',
  status: 'Active',
};

export const BatchSetup: React.FC = () => {
  const { currentUser, addToast } = useApp();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOpt[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  // Branch assigned courses & programs cache
  const [branchAssignedCourses, setBranchAssignedCourses] = useState<any[]>([]);
  const [filterCoursePrograms, setFilterCoursePrograms] = useState<CourseApiProgram[]>([]);
  const [formCoursePrograms, setFormCoursePrograms] = useState<CourseApiProgram[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterProgram, setFilterProgram] = useState('All');
  const [filterLevel, setFilterLevel] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Modal states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BatchForm>({ ...emptyForm });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Safety Deletion Modal
  const [deleteTargetBatch, setDeleteTargetBatch] = useState<Batch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isBranchAdmin = currentUser?.role === 'branch-admin' || currentUser?.role === 'branch_admin';

  const accessibleBranches = useMemo(() => {
    if (isBranchAdmin) {
      if (currentUser?.branch) {
        const matched = branches.filter(b => b.name === currentUser.branch || b.id === currentUser.branch);
        if (matched.length) return matched;
      }
      return branches.slice(0, 1);
    }
    return branches;
  }, [branches, currentUser, isBranchAdmin]);

  const activeBranchId = useMemo(() => {
    if (isBranchAdmin) {
      return accessibleBranches[0]?.id ?? '';
    }
    return filterBranch !== 'All' ? filterBranch : accessibleBranches[0]?.id ?? '';
  }, [accessibleBranches, isBranchAdmin, filterBranch]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setCurrentPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const buildQuery = useCallback((page: number, limit: number) => {
    const params: Record<string, any> = { page, limit };
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (isBranchAdmin) {
      if (activeBranchId) params.branch = activeBranchId;
    } else {
      if (filterBranch !== 'All') params.branch = filterBranch;
    }
    if (filterCourse !== 'All') params.course = filterCourse;
    if (filterProgram !== 'All') params.program = filterProgram;
    if (filterLevel !== 'All') params.level = filterLevel;
    if (filterYear !== 'All') params.academicYear = filterYear;
    if (filterStatus !== 'All') params.status = filterStatus;
    return params;
  }, [debouncedSearch, filterBranch, filterCourse, filterProgram, filterLevel, filterYear, filterStatus, isBranchAdmin, activeBranchId]);

  const loadBatches = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await batchApi.list(buildQuery(currentPage, pageSize));
      if (res?.status === 'success') {
        setBatches((res.data || []) as Batch[]);
        const serverTotal = res.pagination?.total ?? 0;
        setTotal(serverTotal);
        if (serverTotal > 0 && res.data?.length === 0 && currentPage > 1) {
          setCurrentPage(1);
        }
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to fetch batches', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [buildQuery, currentPage, pageSize, addToast]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  // Initial load of master metadata
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [bRes, cRes, yRes, crRes] = await Promise.all([
          branchApi.list({ limit: 1000 }),
          courseApi.list({ limit: 500 }),
          batchApi.academicYears(),
          classroomApi.list({ limit: 500 }),
        ]);
        if (cancelled) return;
        if (bRes?.status === 'success') {
          const parsedBranches = (bRes.data || []).map((r: any) => toBranch(r));
          setBranches(parsedBranches);
        }
        if (cRes?.status === 'success') {
          setCourses((cRes.data || []).map((r: any) => ({
            id: String(r.id ?? ''),
            code: r.code || '',
            name: r.name || '',
          })));
        }
        if (yRes?.status === 'success') setAcademicYears((yRes.data || []) as AcademicYear[]);
        if (crRes?.status === 'success') {
          setClassrooms((crRes.data || []).map((r: any) => ({
            id: String(r.id),
            name: r.name,
            branchId: r.branchId ?? String(r.branch_id ?? ''),
          })));
        }
      } catch (err: any) {
        addToast(err.response?.data?.message || 'Failed to load master metadata', 'error');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [addToast]);

  // Load branch-assigned offerings whenever active branch changes
  const loadBranchAssignedCourses = useCallback(async (targetBranchId: string) => {
    if (!targetBranchId) {
      setBranchAssignedCourses([]);
      return;
    }
    try {
      const res = await branchApi.getCourses(targetBranchId, { assignment_status: 'assigned' });
      if (res?.status === 'success') {
        setBranchAssignedCourses(res.data || []);
      }
    } catch {
      setBranchAssignedCourses([]);
    }
  }, []);

  useEffect(() => {
    if (activeBranchId) {
      loadBranchAssignedCourses(activeBranchId);
    }
  }, [activeBranchId, loadBranchAssignedCourses]);

  const fetchCoursePrograms = async (code: string): Promise<CourseApiProgram[]> => {
    if (!code) return [];
    try {
      const res = await courseApi.getByCode(code);
      return res?.data?.programs || [];
    } catch {
      return [];
    }
  };

  const branchFilterOptions = useMemo(() => {
    if (isBranchAdmin) {
      return accessibleBranches.map(b => ({ value: b.id ?? b.name, label: b.name }));
    }
    return [
      { value: 'All', label: 'All Branches' },
      ...accessibleBranches.map(b => ({ value: b.id ?? b.name, label: b.name })),
    ];
  }, [accessibleBranches, isBranchAdmin]);

  const courseFilterOptions = useMemo(() => {
    if (isBranchAdmin && branchAssignedCourses.length > 0) {
      return [
        { value: 'All', label: 'All Assigned Courses' },
        ...branchAssignedCourses.map(c => ({ value: String(c.id), label: c.name })),
      ];
    }
    return [
      { value: 'All', label: 'All Courses' },
      ...courses.map(c => ({ value: c.id, label: c.name })),
    ];
  }, [courses, branchAssignedCourses, isBranchAdmin]);

  const programFilterOptions = useMemo(() => [
    { value: 'All', label: 'All Programs' },
    ...filterCoursePrograms.map(p => ({ value: String(p.id), label: p.name || '' })),
  ], [filterCoursePrograms]);

  const levelFilterOptions = useMemo(() => {
    const program = filterCoursePrograms.find(p => String(p.id) === filterProgram);
    const levels = program?.levels || [];
    return [
      { value: 'All', label: 'All Levels' },
      ...levels.map(l => ({ value: String(l.id), label: l.name || '' })),
    ];
  }, [filterCoursePrograms, filterProgram]);

  const yearFilterOptions = useMemo(() => {
    const filteredYears = activeBranchId
      ? academicYears.filter(y => y.branchId === activeBranchId || !y.branchId)
      : academicYears;
    return [
      { value: 'All', label: 'All Academic Years' },
      ...filteredYears.map(y => ({ value: y.id, label: y.name })),
    ];
  }, [academicYears, activeBranchId]);

  const activeFilters = useMemo(() => {
    const list: { label: string; value: string; clear: () => void }[] = [];
    if (!isBranchAdmin && filterBranch !== 'All') {
      const br = branchFilterOptions.find(b => b.value === filterBranch);
      list.push({ label: 'Branch', value: br?.label || filterBranch, clear: () => { setFilterBranch('All'); setCurrentPage(1); } });
    }
    if (filterCourse !== 'All') {
      const c = courseFilterOptions.find(item => item.value === filterCourse);
      list.push({ label: 'Course', value: c?.label || filterCourse, clear: () => { handleFilterCourseChange('All'); setCurrentPage(1); } });
    }
    if (filterProgram !== 'All') {
      const p = programFilterOptions.find(item => item.value === filterProgram);
      list.push({ label: 'Program', value: p?.label || filterProgram, clear: () => { setFilterProgram('All'); setFilterLevel('All'); setCurrentPage(1); } });
    }
    if (filterLevel !== 'All') {
      const l = levelFilterOptions.find(item => item.value === filterLevel);
      list.push({ label: 'Level', value: l?.label || filterLevel, clear: () => { setFilterLevel('All'); setCurrentPage(1); } });
    }
    if (filterYear !== 'All') {
      const y = yearFilterOptions.find(item => item.value === filterYear);
      list.push({ label: 'Year', value: y?.label || filterYear, clear: () => { setFilterYear('All'); setCurrentPage(1); } });
    }
    if (filterStatus !== 'All') {
      list.push({ label: 'Status', value: filterStatus, clear: () => { setFilterStatus('All'); setCurrentPage(1); } });
    }
    if (search.trim()) {
      list.push({ label: 'Search', value: search, clear: () => { setSearch(''); setCurrentPage(1); } });
    }
    return list;
  }, [filterBranch, filterCourse, filterProgram, filterLevel, filterYear, filterStatus, search, branchFilterOptions, courseFilterOptions, programFilterOptions, levelFilterOptions, yearFilterOptions, isBranchAdmin]);

  const clearAllFilters = () => {
    setSearch('');
    if (!isBranchAdmin) setFilterBranch('All');
    handleFilterCourseChange('All');
    setFilterYear('All');
    setFilterStatus('All');
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Form options strictly scoped to the selected form branch
  const formBranchCourses = useMemo(() => {
    if (branchAssignedCourses.length > 0) {
      return branchAssignedCourses.map(c => ({ value: c.code, label: `${c.name} (${c.code})` }));
    }
    return courses.map(c => ({ value: c.code, label: `${c.name} (${c.code})` }));
  }, [branchAssignedCourses, courses]);

  const formProgramOptions = useMemo(() =>
    formCoursePrograms.map(p => ({ value: String(p.id), label: p.name || '' })),
    [formCoursePrograms]);

  const formLevelOptions = useMemo(() => {
    const program = formCoursePrograms.find(p => String(p.id) === form.programId);
    return (program?.levels || []).map(l => ({ value: String(l.id), label: l.name || '' }));
  }, [formCoursePrograms, form.programId]);

  const formYearOptions = useMemo(() => {
    const years = academicYears.filter(y => y.branchId === form.branchId || !y.branchId);
    return years.map(y => ({ value: y.id, label: y.name }));
  }, [academicYears, form.branchId]);

  const formRoomOptions = useMemo(() =>
    classrooms.filter(r => r.branchId === form.branchId).map(r => ({ value: r.id, label: r.name })),
    [classrooms, form.branchId]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Batch name is required.';
    if (!form.branchId) errs.branchId = 'Branch is required.';
    if (!form.academicYearId) errs.academicYearId = 'Academic year is required.';
    if (!form.courseCode) errs.courseCode = 'Course is required.';
    if (!form.programId) errs.programId = 'Program is required.';
    if (!form.levelId) errs.levelId = 'Level is required.';
    if (form.capacity) {
      const cap = parseInt(form.capacity, 10);
      if (isNaN(cap) || cap < 0) errs.capacity = 'Enter a valid capacity (>= 0).';
    }
    return errs;
  };

  const openAdd = async () => {
    const branchId = accessibleBranches[0]?.id ?? '';
    if (branchId) {
      await loadBranchAssignedCourses(branchId);
    }
    const years = academicYears.filter(y => y.branchId === branchId || !y.branchId);
    const firstYear = years[0];

    // Pick first assigned course
    let firstCourseCode = '';
    let programs: CourseApiProgram[] = [];
    if (branchAssignedCourses.length > 0) {
      firstCourseCode = branchAssignedCourses[0].code;
      programs = await fetchCoursePrograms(firstCourseCode);
    } else if (courses.length > 0) {
      firstCourseCode = courses[0].code;
      programs = await fetchCoursePrograms(firstCourseCode);
    }

    const firstProg = programs[0];
    const firstLevel = firstProg?.levels?.[0];

    setForm({
      ...emptyForm,
      branchId,
      academicYearId: firstYear?.id ?? '',
      courseCode: firstCourseCode,
      programId: firstProg ? String(firstProg.id) : '',
      levelId: firstLevel ? String(firstLevel.id) : '',
    });
    setFormCoursePrograms(programs);
    setFormErrors({});
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = async (b: Batch) => {
    if (b.branchId) {
      await loadBranchAssignedCourses(b.branchId);
    }
    const course = courses.find(c => c.id === b.courseId);
    const courseCode = course?.code ?? '';

    setForm({
      name: b.name,
      code: b.code,
      branchId: b.branchId,
      academicYearId: b.academicYearId,
      courseCode,
      programId: b.programId,
      levelId: b.levelId,
      capacity: b.capacity === null ? '' : String(b.capacity),
      startTime: b.startTime,
      endTime: b.endTime,
      classroomId: b.classroomId,
      status: b.status === 'Deleted' ? 'Active' : b.status,
    });
    setFormCoursePrograms([]);
    setFormErrors({});
    setEditingId(b.id);
    setShowModal(true);

    if (courseCode) {
      const programs = await fetchCoursePrograms(courseCode);
      setFormCoursePrograms(programs);
    }
  };

  const handleToggleStatus = async (batch: Batch) => {
    const nextStatus: BatchStatus = batch.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await batchApi.setStatus(batch.id, nextStatus);
      addToast(`Batch "${batch.name}" status updated to ${nextStatus}.`, 'success');
      loadBatches();
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to update batch status', 'error');
    }
  };

  const handleOpenDelete = (batch: Batch) => {
    setDeleteTargetBatch(batch);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetBatch) return;
    setIsDeleting(true);
    try {
      const res = await batchApi.delete(deleteTargetBatch.id);
      addToast(res?.message || `Batch "${deleteTargetBatch.name}" deleted successfully.`, 'success');
      setDeleteTargetBatch(null);
      loadBatches();
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to delete batch', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeactivateFromModal = async () => {
    if (!deleteTargetBatch) return;
    setIsDeleting(true);
    try {
      await batchApi.setStatus(deleteTargetBatch.id, 'Inactive');
      addToast(`Batch "${deleteTargetBatch.name}" safely deactivated. Student records preserved.`, 'success');
      setDeleteTargetBatch(null);
      loadBatches();
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to deactivate batch', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      branchId: form.branchId,
      academicYearId: form.academicYearId,
      levelId: form.levelId,
      capacity: form.capacity ? parseInt(form.capacity, 10) : undefined,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
      classroomId: form.classroomId || undefined,
      status: form.status,
    };

    setIsFormSubmitting(true);
    try {
      const res = editingId
        ? await batchApi.update(editingId, payload)
        : await batchApi.create(payload);
      addToast(res?.message || `Batch "${payload.name}" ${editingId ? 'updated' : 'created'} successfully.`, 'success');
      setShowModal(false);
      loadBatches();
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to save batch', 'error');
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handleFilterCourseChange = async (courseId: string) => {
    setFilterCourse(courseId);
    setFilterProgram('All');
    setFilterLevel('All');
    if (courseId === 'All') { setFilterCoursePrograms([]); return; }
    const course = courses.find(c => c.id === courseId);
    const programs = course ? await fetchCoursePrograms(course.code) : [];
    setFilterCoursePrograms(programs);
  };

  const handleExportCSV = async () => {
    let rowsData: Batch[];
    try {
      const res = await batchApi.list(buildQuery(1, 1000));
      rowsData = (res?.data || []) as Batch[];
    } catch {
      rowsData = batches;
    }
    if (rowsData.length === 0) return;
    const rows = rowsData.map(b => ({
      'Batch Name': b.name,
      'Code': b.code,
      'Branch': b.branchName,
      'Course': b.courseName,
      'Program': b.programName,
      'Level': b.levelName,
      'Academic Year': b.academicYearName,
      'Timing': formatBatchTiming(b),
      'Room': b.classroomName,
      Capacity: b.capacity ?? '',
      'Current Strength': b.currentStrength,
      Status: b.status,
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
    a.download = 'batches.csv';
    a.click();
  };

  const setF = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  // ── Create / Edit Modal ──────────────────────────────────────────────────
  if (showModal) {
    return (
      <div className="space-y-6 w-full animate-fade-in max-w-4xl mx-auto">
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
              {editingId ? 'Edit Batch' : 'Create New Batch'}
            </h2>
            <p className="text-sm text-slate-500">
              Configure batch operational parameters, assigned curriculum hierarchy, academic year, and classroom.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6"
        >
          {/* Section 1: Branch & Academic Context */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">1. Branch & Academic Period</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Operating Branch <span className="text-red-500">*</span>
                </label>
                {isBranchAdmin ? (
                  <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm font-semibold">
                    <MapPin size={16} className="text-blue-600 shrink-0" />
                    <span>{accessibleBranches[0]?.name || currentUser?.branch || 'Assigned Branch'}</span>
                    <span className="ml-auto text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">Locked</span>
                  </div>
                ) : (
                  <Select
                    value={form.branchId}
                    onChange={async e => {
                      const branchId = e.target.value;
                      const years = academicYears.filter(y => y.branchId === branchId || !y.branchId);
                      setForm(f => ({ ...f, branchId, academicYearId: years[0]?.id ?? '', classroomId: '' }));
                      await loadBranchAssignedCourses(branchId);
                    }}
                    options={accessibleBranches.map(b => ({ value: b.id ?? b.name, label: b.name }))}
                    error={formErrors.branchId}
                  />
                )}
              </div>

              <Select
                label="Academic Year"
                required
                id="bt-year"
                value={form.academicYearId}
                onChange={e => setF('academicYearId', e.target.value)}
                options={formYearOptions}
                error={formErrors.academicYearId}
              />
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Section 2: Curriculum Hierarchy Alignment */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                2. Curriculum Hierarchy Alignment
              </h4>
              <span className="text-xs text-slate-400 font-medium">Course → Program → Level</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Master Course"
                required
                id="bt-course"
                value={form.courseCode}
                onChange={async e => {
                  const code = e.target.value;
                  setForm(f => ({ ...f, courseCode: code, programId: '', levelId: '' }));
                  const programs = await fetchCoursePrograms(code);
                  setFormCoursePrograms(programs);
                }}
                options={formBranchCourses}
                error={formErrors.courseCode}
              />

              <Select
                label="Program / Track"
                required
                id="bt-program"
                value={form.programId}
                onChange={e => setForm(f => ({ ...f, programId: e.target.value, levelId: '' }))}
                options={formProgramOptions}
                disabled={!form.courseCode}
                error={formErrors.programId}
              />

              <Select
                label="Academic Level"
                required
                id="bt-level"
                value={form.levelId}
                onChange={e => setF('levelId', e.target.value)}
                options={formLevelOptions}
                disabled={!form.programId}
                error={formErrors.levelId}
              />
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Section 3: Batch Identity & Logistics */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">3. Batch Logistics & Identity</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <Input
                label="Batch Name"
                id="bt-name"
                required
                placeholder="e.g. Class 11 Morning Foundation - A"
                value={form.name}
                onChange={e => setF('name', e.target.value)}
                error={formErrors.name}
              />
              <Input
                label="Batch Code"
                id="bt-code"
                placeholder="e.g. BAT-2026-001 (auto-generated if blank)"
                value={form.code}
                onChange={e => setF('code', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <Input
                type="time"
                label="Lecture Start Time"
                id="bt-start"
                value={form.startTime}
                onChange={e => setF('startTime', e.target.value)}
              />
              <Input
                type="time"
                label="Lecture End Time"
                id="bt-end"
                value={form.endTime}
                onChange={e => setF('endTime', e.target.value)}
              />
              <Input
                label="Student Capacity"
                id="bt-capacity"
                type="number"
                min={0}
                placeholder="e.g. 60"
                value={form.capacity}
                onChange={e => setF('capacity', e.target.value)}
                error={formErrors.capacity}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Default Classroom / Room"
                id="bt-room"
                value={form.classroomId}
                onChange={e => setF('classroomId', e.target.value)}
                options={[{ value: '', label: 'No room assigned' }, ...formRoomOptions]}
              />
              <Select
                label="Operational Status"
                id="bt-status"
                value={form.status}
                onChange={e => setF('status', e.target.value as BatchStatus)}
                options={BATCH_STATUS_OPTIONS.map(s => ({ value: s, label: s }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isFormSubmitting} className="min-w-[140px]">
              {isFormSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Saving...
                </span>
              ) : editingId ? (
                'Save Changes'
              ) : (
                'Create Batch'
              )}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // ── List / Directory View ───────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Batches</h2>
          <p className="text-sm text-slate-500 mt-1">
            Configure and manage batches across programs and levels.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-1.5 font-bold">
            <Upload size={14} /> Bulk Import
          </Button>
          <Button variant="secondary" onClick={handleExportCSV} className="flex items-center gap-1.5">
            <Download size={15} /> Export CSV
          </Button>
          <Button variant="primary" onClick={openAdd} style={{ gap: '6px' }}>
            <Plus size={16} /> Create New Batch
          </Button>
        </div>
      </div>

      {/* Directory Filter Bar */}
      <div className="space-y-3">
        {/* Main Concise Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              className="w-full bg-slate-50 hover:bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition duration-150"
              placeholder="Search by batch name, code, course, or level..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); setCurrentPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Quick Selects */}
          <div className="flex flex-wrap items-center gap-2">
            {!isBranchAdmin && (
              <div className="w-36">
                <select
                  value={filterBranch}
                  onChange={e => { setFilterBranch(e.target.value); setCurrentPage(1); }}
                  className="w-full h-9 text-xs font-semibold bg-slate-50 hover:bg-white border border-slate-200 text-slate-800 rounded-xl px-2.5 pr-6 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all truncate"
                >
                  {branchFilterOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="w-40">
              <select
                value={filterCourse}
                onChange={e => { handleFilterCourseChange(e.target.value); setCurrentPage(1); }}
                className="w-full h-9 text-xs font-semibold bg-slate-50 hover:bg-white border border-slate-200 text-slate-800 rounded-xl px-2.5 pr-6 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all truncate"
              >
                {courseFilterOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="w-32">
              <select
                value={filterStatus}
                onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                className="w-full h-9 text-xs font-semibold bg-slate-50 hover:bg-white border border-slate-200 text-slate-800 rounded-xl px-2.5 pr-6 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all truncate"
              >
                <option value="All">All Statuses</option>
                {BATCH_STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Expand / Detailed Filters Button */}
            <button
              type="button"
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className={`flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
                isFilterExpanded || activeFilters.some(f => ['Program', 'Level', 'Year'].includes(f.label))
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Filter size={13} className={isFilterExpanded || activeFilters.some(f => ['Program', 'Level', 'Year'].includes(f.label)) ? 'text-white' : 'text-slate-500'} />
              <span>More Filters</span>
              {activeFilters.filter(f => ['Program', 'Level', 'Year'].includes(f.label)).length > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-extrabold flex items-center justify-center ml-0.5">
                  {activeFilters.filter(f => ['Program', 'Level', 'Year'].includes(f.label)).length}
                </span>
              )}
              <ChevronDown size={12} className={`transition-transform duration-200 ${isFilterExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Detailed Filters Panel (when expanded) */}
        {isFilterExpanded && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm animate-fade-in space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Filter size={13} className="text-blue-600" /> Advanced Batch Filters
              </span>
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw size={12} /> Reset All Filters
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Academic Program</label>
                <select
                  value={filterProgram}
                  onChange={e => { setFilterProgram(e.target.value); setFilterLevel('All'); setCurrentPage(1); }}
                  disabled={filterCourse === 'All'}
                  className="w-full h-8 text-xs font-semibold bg-slate-50 hover:bg-white border border-slate-200 text-slate-800 rounded-xl px-2.5 disabled:opacity-50 cursor-pointer"
                >
                  {programFilterOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Academic Level</label>
                <select
                  value={filterLevel}
                  onChange={e => { setFilterLevel(e.target.value); setCurrentPage(1); }}
                  disabled={filterProgram === 'All'}
                  className="w-full h-8 text-xs font-semibold bg-slate-50 hover:bg-white border border-slate-200 text-slate-800 rounded-xl px-2.5 disabled:opacity-50 cursor-pointer"
                >
                  {levelFilterOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Academic Year</label>
                <select
                  value={filterYear}
                  onChange={e => { setFilterYear(e.target.value); setCurrentPage(1); }}
                  className="w-full h-8 text-xs font-semibold bg-slate-50 hover:bg-white border border-slate-200 text-slate-800 rounded-xl px-2.5 cursor-pointer"
                >
                  {yearFilterOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Active Filter Chips Strip */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 px-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Active:</span>
            {activeFilters.map(af => (
              <span
                key={af.label}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200/70 text-slate-800 border border-slate-200 transition-colors"
              >
                <span className="text-slate-400 font-normal">{af.label}:</span> {af.value}
                <button
                  type="button"
                  onClick={af.clear}
                  className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md p-0.5 transition-colors cursor-pointer ml-0.5"
                  title={`Remove ${af.label} filter`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer ml-1 transition-all"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Directory Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <Layers size={18} className="text-blue-600" />
          <h3 className="font-bold text-slate-800 text-sm">
            All Batches
            <span className="ml-2 text-xs font-normal text-slate-400">
              ({total} result{total !== 1 ? 's' : ''})
            </span>
          </h3>
        </div>

        <Table 
          minWidth="1050px"
          colWidths={['20%', '24%', '16%', '9%', '9%', '9%', '13%']}
          headers={[
            { label: 'Batch Name', minWidth: '160px' },
            { label: 'Academic Track', minWidth: '180px' },
            { label: 'Academic Year', minWidth: '120px' },
            { label: 'Students', minWidth: '80px' },
            { label: 'Capacity', minWidth: '80px' },
            { label: 'Status', minWidth: '80px' },
            { label: 'Actions', minWidth: '120px', align: 'right' }
          ]}
        >
          {isLoading ? (
            <tr>
              <td colSpan={7} className="px-6 py-16">
                <div className="text-center flex flex-col items-center justify-center text-slate-400">
                  <Loader2 size={32} className="animate-spin mb-3 text-blue-600" />
                  <p className="text-sm font-semibold text-slate-600">Loading batches...</p>
                </div>
              </td>
            </tr>
          ) : batches.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-16">
                <div className="text-center flex flex-col items-center justify-center">
                  <div className="bg-blue-50 p-4 rounded-full mb-4">
                    <Layers size={40} className="text-blue-500" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">No batches found</h3>
                  <p className="text-slate-500 max-w-sm mb-6 text-sm">
                    {debouncedSearch || filterCourse !== 'All' || filterStatus !== 'All'
                      ? 'No batches match your current filter settings. Try clearing filters.'
                      : 'Get started by creating your first batch.'}
                  </p>
                  <Button variant="primary" onClick={openAdd} style={{ backgroundColor: '#2563eb', color: 'white' }}>
                    <Plus size={16} className="mr-2" /> Create New Batch
                  </Button>
                </div>
              </td>
            </tr>
          ) : (
            batches.map(b => {
              const cap = b.capacity;
              const strength = b.currentStrength || 0;

              return (
                <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Batch Name & Code */}
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-slate-900 text-sm leading-snug">{b.name}</div>
                    <div className="font-mono text-xs text-slate-500 mt-0.5">{b.code || '—'}</div>
                  </td>

                  {/* Academic Track: Program on top, Course • Level as subtext */}
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-800 text-sm leading-snug">
                      {b.programName || b.courseName}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {b.courseName}{b.levelName ? ` • ${b.levelName}` : ''}
                    </div>
                  </td>

                  {/* Academic Year */}
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className="text-sm font-medium text-slate-700">
                      {b.academicYearName || '—'}
                    </span>
                  </td>

                  {/* Students */}
                  <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-slate-800">
                    {strength}
                  </td>

                  {/* Capacity */}
                  <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-600">
                    {cap !== null && cap !== undefined ? cap : '—'}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${statusColors[b.status]}`}>
                      {b.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(b)}
                        title="Edit Batch"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDelete(b)}
                        title="Delete Batch"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </Table>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={p => setCurrentPage(p)}
          onPageSizeChange={s => { setPageSize(s); setCurrentPage(1); }}
        />
      </div>

      {/* Soft Delete Modal */}
      <Modal
        isOpen={Boolean(deleteTargetBatch)}
        onClose={() => setDeleteTargetBatch(null)}
        title="Delete Batch"
      >
        {deleteTargetBatch && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 text-sm">
              <AlertTriangle size={22} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-red-900 mb-0.5">Confirm Soft Delete</h4>
                <p className="text-xs text-red-800 leading-relaxed">
                  Are you sure you want to delete batch <span className="font-bold">{deleteTargetBatch.name}</span> ({deleteTargetBatch.code || 'No code'})? Its status will be changed to deleted and it will be removed from the directory.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button variant="secondary" onClick={() => setDeleteTargetBatch(null)} disabled={isDeleting}>
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
        title="Bulk Import Batches"
        description="Select a CSV spreadsheet to import multiple batches at once. Columns must match the template below exactly."
        sampleHeaders={['Name', 'Branch', 'Course', 'Program', 'Level', 'AcademicYear']}
        sampleRows={[
          ['JEE-Morning-B', 'Mumbai West', 'JEE Prep Course', '2 Year', 'Class XI', '2026-27'],
          ['NEET-Regular-C', 'Pune Camp', 'NEET Batch Premium', '1 Year', 'Class XII', '2026-27'],
        ]}
        onImport={(importedRows) => {
          const newBatches = importedRows.map((row, rIdx) => ({
            id: `IMP-${Math.floor(10000 + Math.random() * 90000)}-${rIdx}`,
            name: row['Name'] || 'Imported Batch',
            courseName: row['Course'] || '',
            programName: row['Program'] || '',
            levelName: row['Level'] || '',
            academicYearName: row['AcademicYear'] || '',
            branchName: row['Branch'] || branches[0]?.name || '',
            status: 'Active' as BatchStatus,
            code: '',
            currentStrength: 0,
            capacity: null,
            startTime: '09:00',
            endTime: '12:00',
            courseId: '',
            programId: '',
            levelId: '',
            branchId: branches.find(b => b.name === row['Branch'])?.id || '',
            academicYearId: '',
            classroomId: '',
            classroomName: '',
          }));
          setBatches(prev => [...newBatches, ...prev]);
        }}
      />
    </div>
  );
};