import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { batchApi, BATCH_STATUS_OPTIONS, formatBatchTiming } from '../services/batchApi';
import type { Batch, BatchStatus, AcademicYear, BatchStudent } from '../services/batchApi';
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
import { Card } from '../components/ui/Card';
import { getStudentById } from '../services/studentApi';
import type { StudentDetail } from '../services/studentApi';
import {
  Layers, Plus, Search, Download, ArrowLeft, Edit3, Trash2,
  Upload, Loader2, AlertTriangle, ShieldAlert, CheckCircle2,
  Power, Users, MapPin, ChevronRight, BookOpen, Clock, Building,
  Filter, X, ChevronDown, RotateCcw, Eye, GraduationCap, Mail,
  Phone, UserCheck, Calendar, DollarSign, Check, FileSpreadsheet,
  IndianRupee, CreditCard, CheckCircle, FileText, AlertCircle
} from 'lucide-react';

const statusColors: Record<BatchStatus, string> = {
  Active: 'bg-[#ecfdf5] text-[#065f46] border-[#86efac]',
  Inactive: 'bg-[#f1f5f9] text-[#334155] border-[#cbd5e1]',
  Deleted: 'bg-red-50 text-red-700 border-red-200',
};

const getStatusBadgeStyle = (statusStr?: string) => {
  const s = String(statusStr || 'Active').toLowerCase();
  if (s === 'active' || s === '1') {
    return 'bg-[#ecfdf5] text-[#065f46] border-[#86efac]';
  }
  if (s === 'inactive' || s === '0') {
    return 'bg-[#f1f5f9] text-[#334155] border-[#cbd5e1]';
  }
  return 'bg-red-50 text-red-700 border-red-200';
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
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

  const setF = <K extends keyof BatchForm>(key: K, value: BatchForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // View Batch Details & Students Modal State
  const [viewingBatch, setViewingBatch] = useState<Batch | null>(null);
  const [viewingBatchStudents, setViewingBatchStudents] = useState<BatchStudent[]>([]);
  const [isLoadingBatchStudents, setIsLoadingBatchStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [viewTab, setViewTab] = useState<'students' | 'overview'>('students');

  // Student Profile Detail View State (Image 2 Full Profile)
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentDetail | null>(null);
  const [loadingStudentDetail, setLoadingStudentDetail] = useState(false);
  const [studentProfileTab, setStudentProfileTab] = useState<'overview' | 'academic' | 'parents' | 'fees' | 'documents'>('overview');

  // Safety Deletion Modal
  const [deleteTargetBatch, setDeleteTargetBatch] = useState<Batch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isBranchAdmin = currentUser?.role === 'branch-admin' || (currentUser?.role as string) === 'branch_admin';

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

  const filteredBatchStudents = useMemo(() => {
    if (!studentSearch.trim()) return viewingBatchStudents;
    const q = studentSearch.toLowerCase().trim();
    return viewingBatchStudents.filter(s =>
      (s.fullName || '').toLowerCase().includes(q) ||
      (s.studentCode || '').toLowerCase().includes(q) ||
      (s.rollNo || '').toLowerCase().includes(q) ||
      (s.mobile || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.guardianName || '').toLowerCase().includes(q)
    );
  }, [viewingBatchStudents, studentSearch]);

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

  // High-level batch telemetry metrics for executive KPI overview
  const metrics = useMemo(() => {
    const totalCount = total;
    const activeCount = batches.filter(b => b.status === 'Active').length;
    const totalEnrolled = batches.reduce((sum, b) => sum + (b.currentStrength || 0), 0);
    const totalCapacity = batches.reduce((sum, b) => sum + (typeof b.capacity === 'number' ? b.capacity : 0), 0);
    const utilizationRate = totalCapacity > 0 ? Math.min(100, Math.round((totalEnrolled / totalCapacity) * 100)) : 0;

    return {
      totalCount,
      activeCount,
      totalEnrolled,
      totalCapacity,
      utilizationRate,
    };
  }, [batches, total]);

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

  const handleOpenView = async (batch: Batch) => {
    setViewingBatch(batch);
    setViewTab('students');
    setStudentSearch('');
    setSelectedStudentDetail(null);
    setIsLoadingBatchStudents(true);
    try {
      const res = await batchApi.getStudents(batch.id);
      setViewingBatchStudents(res?.data || []);
    } catch (err: any) {
      console.error('Failed to load batch students:', err);
      setViewingBatchStudents([]);
    } finally {
      setIsLoadingBatchStudents(false);
    }
  };

  const handleViewStudentProfile = async (studentId: string | number) => {
    setLoadingStudentDetail(true);
    setStudentProfileTab('overview');
    try {
      const res = await getStudentById(Number(studentId));
      if (res?.data) {
        setSelectedStudentDetail(res.data);
      } else {
        addToast('Student details not found', 'error');
      }
    } catch (err: any) {
      addToast(err?.response?.data?.message || 'Failed to load student profile', 'error');
    } finally {
      setLoadingStudentDetail(false);
    }
  };

  const handleExportBatchStudentsCSV = () => {
    if (!viewingBatch || viewingBatchStudents.length === 0) return;
    const rows = viewingBatchStudents.map((s, idx) => ({
      'Roll No': s.rollNo || idx + 1,
      'Student Code': s.studentCode,
      'Student Name': s.fullName,
      'Email': s.email,
      'Mobile': s.mobile,
      'Gender': s.gender,
      'Parent / Guardian': s.guardianName,
      'Parent Mobile': s.guardianMobile,
      'Enrollment Status': s.enrollmentStatus,
      'Enrolled Date': s.enrolledAt,
      'Fee Status': s.feeStatus
    }));
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => `"${String(r[h as keyof typeof r] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `${viewingBatch.name.replace(/\s+/g, '_')}_Students.csv`;
    a.click();
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

  // ── Full Page View Batch Details & Enrolled Students ────────────────────────
  if (viewingBatch) {
    if (loadingStudentDetail) {
      return (
        <div className="flex flex-col items-center justify-center p-24 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-500 animate-fade-in">
          <Loader2 size={36} className="animate-spin text-blue-600 mb-3" />
          <span className="text-sm font-bold text-slate-700">Loading Student Profile...</span>
        </div>
      );
    }

    if (selectedStudentDetail) {
      return (
        <div className="space-y-6 w-full animate-fade-in">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedStudentDetail(null)}
              className="flex items-center justify-center h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
              title="Back to Batch Students"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <h2 className="text-2xl font-display font-bold text-slate-900">
                Student Profile: {selectedStudentDetail.full_name}
              </h2>
              <p className="text-sm text-slate-500">
                Student Code: <span className="font-mono font-bold text-slate-700">{selectedStudentDetail.student_code}</span> &bull; Branch: <span className="font-bold text-slate-700">{selectedStudentDetail.branch_name || viewingBatch.branchName || 'Main Branch'}</span>
              </p>
            </div>
          </div>

          <div className="space-y-6 flex flex-col bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
            <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
              {[
                { id: 'overview', label: '1. Personal Details' },
                { id: 'academic', label: '2. Batch & Subject Bundle' },
                { id: 'parents', label: '3. Parent / Guardian' },
                { id: 'fees', label: '4. Fee Plan & Invoices' },
                { id: 'documents', label: '5. Documents' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStudentProfileTab(tab.id as any)}
                  className={`py-3 px-4 font-bold text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    studentProfileTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="py-2">
              {/* TAB 1: Overview / Personal Details */}
              {studentProfileTab === 'overview' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-5 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl">
                    <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md shrink-0">
                      {(selectedStudentDetail.full_name || 'S').split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="font-display font-extrabold text-slate-900 text-lg">{selectedStudentDetail.full_name}</h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs font-medium text-slate-500">
                        <span className="flex items-center gap-1.5">
                          Status:
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${getStatusBadgeStyle(String(selectedStudentDetail.status))}`}>
                            {Number(selectedStudentDetail.status) === 1 || String(selectedStudentDetail.status).toLowerCase() === 'active' ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </span>
                        <span>&bull;</span>
                        <span>Category: <strong className="text-slate-700">{selectedStudentDetail.category || 'General'}</strong></span>
                        <span>&bull;</span>
                        <span>Enrolled Date: <strong className="text-slate-700">{selectedStudentDetail.enrolled_date ? formatDate(selectedStudentDetail.enrolled_date) : 'Active'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-5 border border-slate-200/80 shadow-sm">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                        Personal Details
                      </h3>
                      <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                        <div>
                          <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Date of Birth</span>
                          <strong className="text-slate-700">{selectedStudentDetail.dob ? formatDate(selectedStudentDetail.dob) : 'N/A'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Gender</span>
                          <strong className="text-slate-700">{selectedStudentDetail.gender || 'Male'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Mobile Contact</span>
                          <strong className="text-slate-700 font-mono">{selectedStudentDetail.mobile || 'N/A'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Email Address</span>
                          <strong className="text-slate-700 font-mono text-xs">{selectedStudentDetail.email || 'N/A'}</strong>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-5 border border-slate-200/80 shadow-sm">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                        School & Entrance Profile
                      </h3>
                      <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                        <div className="col-span-2">
                          <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">School Name</span>
                          <strong className="text-slate-700">{selectedStudentDetail.school_name || 'N/A'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Current Class</span>
                          <strong className="text-slate-700">{selectedStudentDetail.current_class || 'Class 11'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Target Exam</span>
                          <strong className="text-slate-700">{selectedStudentDetail.target_exam || 'JEE Prep'}</strong>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {/* TAB 2: Academic Linkage */}
              {studentProfileTab === 'academic' && (
                <div className="space-y-6">
                  <Card className="p-5 border border-slate-200/80 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                      Enrolled Batch & Academic Session
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Enrolled Batch</span>
                        <strong className="text-blue-700 font-mono text-base">{selectedStudentDetail.batch_name || viewingBatch.name}</strong>
                        {(selectedStudentDetail.batch_code || viewingBatch.code) && (
                          <span className="text-xs text-slate-500 font-mono block mt-0.5">Code: {selectedStudentDetail.batch_code || viewingBatch.code}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Academic Session Year</span>
                        <strong className="text-slate-700">{selectedStudentDetail.academic_year_name || viewingBatch.academicYearName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Registered Branch</span>
                        <strong className="text-slate-700">{selectedStudentDetail.branch_name || viewingBatch.branchName}</strong>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5 border border-slate-200/80 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <Layers size={16} className="text-blue-600" />
                      Mapped Curriculum & Enrolled Subjects
                    </h3>
                    
                    {selectedStudentDetail.subject_selection_type === 'custom' ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                              Custom Subject Enrollment
                            </span>
                            <h4 className="font-bold text-indigo-950 text-base mt-1">Individual Subjects Selection</h4>
                            <p className="text-xs text-slate-600 mt-0.5">Student has opted for customized subject combination.</p>
                          </div>
                          <span className="text-sm font-bold text-indigo-700 font-mono bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-xs">
                            {selectedStudentDetail.subjectsList?.length || 0} Subjects
                          </span>
                        </div>

                        {selectedStudentDetail.subjectsList && selectedStudentDetail.subjectsList.length > 0 ? (
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Enrolled Subjects:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {selectedStudentDetail.subjectsList.map((sub, idx) => (
                                <div key={idx} className="p-3 bg-white border border-indigo-100 rounded-xl flex items-center gap-2.5 shadow-xs">
                                  <BookOpen size={16} className="text-indigo-600 shrink-0" />
                                  <div>
                                    <div className="font-semibold text-slate-800 text-xs">{sub.name}</div>
                                    <div className="text-[10px] font-mono text-slate-400">{sub.code}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic">No custom subject list found</div>
                        )}
                      </div>
                    ) : selectedStudentDetail.subjectBundle ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                              Predefined Bundle
                            </span>
                          </div>
                          <h4 className="font-bold text-blue-900 text-base mt-1">{selectedStudentDetail.subjectBundle.name}</h4>
                          <p className="text-xs text-slate-600 mt-1">{selectedStudentDetail.subjectBundle.description || 'Core Level Bundle'}</p>
                        </div>

                        {selectedStudentDetail.subjectsList && selectedStudentDetail.subjectsList.length > 0 ? (
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Individual Subjects Included:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {selectedStudentDetail.subjectsList.map((sub, idx) => (
                                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
                                  <BookOpen size={16} className="text-blue-600 shrink-0" />
                                  <div>
                                    <div className="font-semibold text-slate-800 text-xs">{sub.name}</div>
                                    <div className="text-[10px] font-mono text-slate-400">{sub.code}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic">No subject list attached</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500 italic p-4 bg-slate-50 rounded-xl border border-slate-100">
                        No active subject bundle or custom subjects mapped to this student.
                      </div>
                    )}
                  </Card>
                </div>
              )}

              {/* TAB 3: Parent Info */}
              {studentProfileTab === 'parents' && (
                <Card className="p-5 border border-slate-200/80 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                    Parent / Guardian Contact Info
                  </h3>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                    <div>
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Parent Full Name</span>
                      <strong className="text-slate-800">{selectedStudentDetail.guardian_name || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Relation</span>
                      <strong className="text-slate-700">{selectedStudentDetail.guardian_relation || 'Parent'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Parent Mobile</span>
                      <strong className="text-slate-700 font-mono">{selectedStudentDetail.guardian_mobile || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Parent Email ID</span>
                      <strong className="text-slate-700 font-mono text-xs">{selectedStudentDetail.guardian_email || 'N/A'}</strong>
                    </div>
                  </div>
                </Card>
              )}

              {/* TAB 4: Fee Plan & Invoices */}
              {studentProfileTab === 'fees' && (
                <div className="space-y-6">
                  {selectedStudentDetail.feeAssignment ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4 border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Net Fee</span>
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                              <IndianRupee size={18} />
                            </div>
                          </div>
                          <div className="text-xl font-extrabold text-slate-900 mt-2">
                            ₹{Number(selectedStudentDetail.feeAssignment.net_amount || 0).toLocaleString('en-IN')}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            Gross: ₹{Number(selectedStudentDetail.feeAssignment.gross_amount || 0).toLocaleString('en-IN')}
                            {Number(selectedStudentDetail.feeAssignment.total_concession ?? selectedStudentDetail.feeAssignment.discount_amount ?? 0) > 0 && (
                              <span className="text-emerald-600 font-semibold ml-1">
                                (-₹{Number(selectedStudentDetail.feeAssignment.total_concession ?? selectedStudentDetail.feeAssignment.discount_amount ?? 0).toLocaleString('en-IN')})
                              </span>
                            )}
                          </div>
                        </Card>

                        <Card className="p-4 border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Downpayment</span>
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                              <CreditCard size={18} />
                            </div>
                          </div>
                          <div className="text-xl font-extrabold text-slate-900 mt-2">
                            ₹{Number(selectedStudentDetail.feeAssignment.down_payment ?? selectedStudentDetail.feeAssignment.downpayment_amount ?? 0).toLocaleString('en-IN')}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">Initial Admission Amount</div>
                        </Card>

                        <Card className="p-4 border border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 to-white shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Paid Till Date</span>
                            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                              <CheckCircle size={18} />
                            </div>
                          </div>
                          <div className="text-xl font-extrabold text-emerald-700 mt-2">
                            ₹{Number(selectedStudentDetail.feeAssignment.paid_amount || 0).toLocaleString('en-IN')}
                          </div>
                          <div className="text-[11px] text-emerald-600 font-medium mt-1">
                            {Math.round((Number(selectedStudentDetail.feeAssignment.paid_amount || 0) / (Number(selectedStudentDetail.feeAssignment.net_amount) || 1)) * 100)}% Cleared
                          </div>
                        </Card>

                        <Card className="p-4 border border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-white shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Outstanding Dues</span>
                            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                              <Clock size={18} />
                            </div>
                          </div>
                          <div className="text-xl font-extrabold text-amber-700 mt-2">
                            ₹{Number(selectedStudentDetail.feeAssignment.balance_amount ?? selectedStudentDetail.feeAssignment.balance_due ?? 0).toLocaleString('en-IN')}
                          </div>
                          <div className="text-[11px] text-amber-600 font-medium mt-1">
                            {Number(selectedStudentDetail.feeAssignment.balance_amount ?? selectedStudentDetail.feeAssignment.balance_due ?? 0) === 0 ? 'Fully Settled' : 'Pending Installments'}
                          </div>
                        </Card>
                      </div>

                      <Card className="p-5 border border-slate-200/80 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <FileText size={16} className="text-blue-600" />
                            Agreed Master Fee Contract Plan
                          </span>
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase ${
                            selectedStudentDetail.feeAssignment.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : selectedStudentDetail.feeAssignment.status === 'partially_paid'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            Status: {(selectedStudentDetail.feeAssignment.status || 'pending').replace('_', ' ')}
                          </span>
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
                          <div>
                            <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Gross Course Fee</span>
                            <strong className="text-slate-800">₹{Number(selectedStudentDetail.feeAssignment.gross_amount || 0).toLocaleString('en-IN')}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Discount Concession</span>
                            <strong className="text-emerald-600">₹{Number(selectedStudentDetail.feeAssignment.total_concession ?? selectedStudentDetail.feeAssignment.discount_amount ?? 0).toLocaleString('en-IN')}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Installment Plan</span>
                            <strong className="text-slate-800">
                              {selectedStudentDetail.feeAssignment.installment_count || 1} x ₹{Number(selectedStudentDetail.feeAssignment.installment_amount || 0).toLocaleString('en-IN')}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Contract Created Date</span>
                            <strong className="text-slate-700">
                              {selectedStudentDetail.feeAssignment.created_at ? formatDate(selectedStudentDetail.feeAssignment.created_at) : 'N/A'}
                            </strong>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-5 border border-slate-200/80 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Calendar size={16} className="text-blue-600" />
                            Invoice & Installment History ({selectedStudentDetail.invoicesList?.length || 0} Invoices)
                          </span>
                        </h3>

                        {selectedStudentDetail.invoicesList && selectedStudentDetail.invoicesList.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                                  <th className="px-3 py-2.5">Invoice #</th>
                                  <th className="px-3 py-2.5">Installment</th>
                                  <th className="px-3 py-2.5">Due Date</th>
                                  <th className="px-3 py-2.5">Billed Amount</th>
                                  <th className="px-3 py-2.5">Paid Amount</th>
                                  <th className="px-3 py-2.5">Balance Due</th>
                                  <th className="px-3 py-2.5">Payment Info</th>
                                  <th className="px-3 py-2.5">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {selectedStudentDetail.invoicesList.map((inv) => (
                                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-3 py-2 font-mono font-bold text-xs text-blue-700">
                                      {inv.invoice_number}
                                    </td>
                                    <td className="px-3 py-2 text-xs font-semibold text-slate-700">
                                      {inv.installment_number === 0 ? 'Downpayment' : `Installment #${inv.installment_number}`}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-slate-600">
                                      {inv.due_date ? formatDate(inv.due_date) : '-'}
                                    </td>
                                    <td className="px-3 py-2 text-xs font-bold text-slate-800">
                                      ₹{Number(inv.amount ?? inv.billed_amount ?? 0).toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-3 py-2 text-xs font-bold text-emerald-600">
                                      ₹{Number(inv.paid_amount || 0).toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-3 py-2 text-xs font-bold text-amber-600">
                                      ₹{Number(inv.balance_due || 0).toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-slate-500">
                                      {inv.payment_mode ? (
                                        <div>
                                          <span className="font-semibold text-slate-700">{inv.payment_mode}</span>
                                          {inv.payment_date && (
                                            <div className="text-[10px] text-slate-400">{formatDate(inv.payment_date)}</div>
                                          )}
                                          {(inv.transaction_reference || inv.transaction_ref) && (
                                            <div className="text-[10px] font-mono text-slate-400">{inv.transaction_reference || inv.transaction_ref}</div>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 italic">Not paid</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-xs">
                                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                                        inv.status === 'paid'
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : inv.status === 'partially_paid'
                                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                                      }`}>
                                        {inv.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-500 italic p-4 bg-slate-50 rounded-xl text-center">
                            No invoices generated for this student contract yet.
                          </div>
                        )}
                      </Card>
                    </>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                      <AlertCircle size={32} className="mx-auto text-slate-400 mb-2" />
                      <h4 className="font-bold text-slate-700 text-base">No Active Fee Plan Assigned</h4>
                      <p className="text-xs text-slate-500 mt-1">This student has not been assigned a custom fee contract or installment plan yet.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: Documents */}
              {studentProfileTab === 'documents' && (
                <Card className="p-5 border border-slate-200/80 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                    Admission Proof Documents
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                          <th className="px-4 py-3">Document Category</th>
                          <th className="px-4 py-3">Filename</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-800">Govt ID (Aadhaar / National ID)</td>
                          <td className="px-4 py-3 font-mono text-slate-600">student_id_proof.pdf</td>
                          <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 font-bold">Verified</span></td>
                          <td className="px-4 py-3 text-right"><Button variant="secondary" size="sm">Download</Button></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 mt-6">
              <Button type="button" variant="secondary" onClick={() => setSelectedStudentDetail(null)}>
                Close Profile
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 w-full animate-fade-in">
        {/* Top Header & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setViewingBatch(null)}
              className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
              title="Back to Batches"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 tracking-tight">
                  {viewingBatch.name}
                </h2>
                <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/70 px-2.5 py-0.5 rounded-lg shadow-2xs">
                  {viewingBatch.code || 'NO-CODE'}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  viewingBatch.status === 'Active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${viewingBatch.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  {viewingBatch.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-1.5">
                <strong className="text-slate-700 font-semibold">{viewingBatch.courseName}</strong>
                {viewingBatch.programName && <span>• {viewingBatch.programName}</span>}
                {viewingBatch.levelName && <span>• {viewingBatch.levelName}</span>}
                <span className="text-slate-300">|</span>
                <span className="text-slate-400">Branch:</span>
                <strong className="text-slate-700 font-semibold">{viewingBatch.branchName || 'Main'}</strong>
                <span className="text-slate-300">|</span>
                <span className="text-slate-400">Academic Year:</span>
                <strong className="text-slate-700 font-semibold">{viewingBatch.academicYearName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const b = viewingBatch;
                setViewingBatch(null);
                openEdit(b);
              }}
              className="text-xs font-bold gap-1.5 h-10 px-3.5 rounded-xl border border-slate-200 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
            >
              <Edit3 size={14} className="text-slate-500" /> Edit Batch
            </Button>
            <Button
              type="button"
              onClick={handleExportBatchStudentsCSV}
              disabled={viewingBatchStudents.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5 h-10 px-4 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Download size={14} /> Export Students CSV
            </Button>
          </div>
        </div>

        {/* Top Metric Cards - Double Bezel Architecture */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-1 rounded-2xl bg-gradient-to-b from-blue-50/80 via-slate-50/50 to-white border border-blue-100/80 shadow-2xs hover:shadow-xs transition-all duration-300">
            <div className="p-4 rounded-[calc(1rem-2px)] bg-white/90 backdrop-blur-sm h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Enrolled Students</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center ring-1 ring-blue-500/10">
                  <Users size={15} />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-black text-slate-900 font-display tracking-tight">{viewingBatchStudents.length}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {viewingBatch.capacity ? `${Math.round((viewingBatchStudents.length / viewingBatch.capacity) * 100)}% of intake filled` : 'Active learners'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-1 rounded-2xl bg-gradient-to-b from-amber-50/80 via-slate-50/50 to-white border border-amber-100/80 shadow-2xs hover:shadow-xs transition-all duration-300">
            <div className="p-4 rounded-[calc(1rem-2px)] bg-white/90 backdrop-blur-sm h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Total Capacity</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center ring-1 ring-amber-500/10">
                  <Layers size={15} />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-black text-slate-900 font-display tracking-tight">{viewingBatch.capacity ?? 'Unlimited'}</p>
                <p className="text-xs text-slate-400 mt-0.5">Max batch desk quota</p>
              </div>
            </div>
          </div>

          <div className="p-1 rounded-2xl bg-gradient-to-b from-emerald-50/80 via-slate-50/50 to-white border border-emerald-100/80 shadow-2xs hover:shadow-xs transition-all duration-300">
            <div className="p-4 rounded-[calc(1rem-2px)] bg-white/90 backdrop-blur-sm h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Available Seats</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center ring-1 ring-emerald-500/10">
                  <UserCheck size={15} />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-black text-emerald-600 font-display tracking-tight">
                  {viewingBatch.capacity ? Math.max(0, viewingBatch.capacity - viewingBatchStudents.length) : '∞'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Seats currently vacant</p>
              </div>
            </div>
          </div>

          <div className="p-1 rounded-2xl bg-gradient-to-b from-purple-50/80 via-slate-50/50 to-white border border-purple-100/80 shadow-2xs hover:shadow-xs transition-all duration-300">
            <div className="p-4 rounded-[calc(1rem-2px)] bg-white/90 backdrop-blur-sm h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Assigned Room</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center ring-1 ring-purple-500/10">
                  <Building size={15} />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-lg font-bold text-slate-900 truncate">{viewingBatch.classroomName || 'No Classroom'}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{formatBatchTiming(viewingBatch) || 'Timing unassigned'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selection - Double Bezel Pill Container */}
        <div className="p-1 rounded-2xl bg-slate-100/80 border border-slate-200/80 inline-flex items-center gap-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewTab('students')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
              viewTab === 'students'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Users size={14} className={viewTab === 'students' ? 'text-blue-600' : 'text-slate-400'} />
            <span>Enrolled Students</span>
            <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
              viewTab === 'students' ? 'bg-blue-50 text-blue-700' : 'bg-slate-200/70 text-slate-600'
            }`}>
              {viewingBatchStudents.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setViewTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
              viewTab === 'overview'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <BookOpen size={14} className={viewTab === 'overview' ? 'text-blue-600' : 'text-slate-400'} />
            <span>Batch Overview &amp; Schedule</span>
          </button>
        </div>

        {/* TAB 1: ENROLLED STUDENTS FULL VIEW - Double Bezel Table */}
        {viewTab === 'students' && (
          <div className="p-1 rounded-2xl bg-slate-100/70 border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="bg-white rounded-[calc(1rem-2px)] overflow-hidden">
              {/* Integrated Toolbar */}
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/50 to-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center ring-1 ring-blue-500/10 shrink-0">
                    <Users size={15} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                      Enrolled Students Roster
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
                        {filteredBatchStudents.length} of {viewingBatchStudents.length} enrolled
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by name, roll, phone, email..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 focus:bg-white transition-all shadow-2xs"
                  />
                  {studentSearch && (
                    <button
                      type="button"
                      onClick={() => setStudentSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer transition-colors"
                      title="Clear search"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Students Table */}
              {isLoadingBatchStudents ? (
                <div className="flex flex-col items-center justify-center p-16 text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3">
                    <Loader2 size={24} className="animate-spin text-blue-600" />
                  </div>
                  <span className="text-sm font-bold text-slate-700">Loading enrolled students...</span>
                  <span className="text-xs text-slate-400 mt-0.5">Fetching academic records and enrollment status</span>
                </div>
              ) : filteredBatchStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 text-center text-slate-400 max-w-md mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50/80 border border-blue-100 text-blue-600 flex items-center justify-center mb-3.5 shadow-2xs">
                    <GraduationCap size={28} />
                  </div>
                  <p className="text-base font-extrabold text-slate-900 font-display">
                    {studentSearch ? 'No matching students found' : 'No students enrolled in this batch yet'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed">
                    {studentSearch
                      ? 'Try adjusting your search keywords or clear the filter to view all enrolled students.'
                      : 'Students registered and allocated to this batch will automatically populate here.'}
                  </p>
                  {studentSearch && (
                    <Button variant="secondary" onClick={() => setStudentSearch('')} className="text-xs font-bold gap-1.5 mt-4">
                      <RotateCcw size={12} /> Clear Student Filter
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[980px]">
                    <thead className="bg-slate-50/70 border-b border-slate-100">
                      <tr className="text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                        <th className="px-4 py-3.5 w-16">Roll No</th>
                        <th className="px-4 py-3.5 min-w-[210px]">Student Profile</th>
                        <th className="px-4 py-3.5 min-w-[170px]">Contact Details</th>
                        <th className="px-4 py-3.5 min-w-[170px]">Parent / Guardian</th>
                        <th className="px-4 py-3.5 min-w-[110px]">Enrolled Date</th>
                        <th className="px-4 py-3.5 min-w-[110px]">Fee Status</th>
                        <th className="px-4 py-3.5 min-w-[100px]">Status</th>
                        <th className="px-4 py-3.5 min-w-[90px] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredBatchStudents.map((s, idx) => {
                        const rollDisplay = s.rollNo && !s.rollNo.startsWith('STU-')
                          ? s.rollNo
                          : `#${String(idx + 1).padStart(2, '0')}`;
                        const initials = (s.fullName || 'S')
                          .split(' ')
                          .slice(0, 2)
                          .map(w => w[0])
                          .join('')
                          .toUpperCase();

                        return (
                          <tr key={s.id || idx} className="hover:bg-slate-50/80 transition-colors">
                            {/* Roll No */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100/90 px-2 py-1 rounded-md border border-slate-200/70">
                                {rollDisplay}
                              </span>
                            </td>

                            {/* Student Profile */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-violet-500/10 border border-blue-500/20 text-blue-700 font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => handleViewStudentProfile(s.id)}
                                    className="font-bold text-slate-900 text-sm leading-tight hover:text-blue-600 transition-colors cursor-pointer text-left block truncate max-w-[190px]"
                                    title="View student profile"
                                  >
                                    {s.fullName}
                                  </button>
                                  <span className="font-mono text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 inline-block mt-0.5 whitespace-nowrap">
                                    {s.studentCode || '—'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Contact Details */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                                <Phone size={12} className="text-slate-400 shrink-0" />
                                <span>{s.mobile || '—'}</span>
                              </div>
                              {s.email && (
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 truncate max-w-[180px]">
                                  <Mail size={11} className="text-slate-400 shrink-0" />
                                  <span className="truncate">{s.email}</span>
                                </div>
                              )}
                            </td>

                            {/* Parent / Guardian */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="text-xs font-semibold text-slate-800 leading-snug">
                                {s.guardianName || '—'}
                              </div>
                              {s.guardianMobile && (
                                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-mono">
                                  {s.guardianRelation && (
                                    <span className="text-slate-400 font-sans">({s.guardianRelation})</span>
                                  )}
                                  <span>{s.guardianMobile}</span>
                                </div>
                              )}
                            </td>

                            {/* Enrolled Date */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-medium">
                                <Calendar size={12} className="text-slate-400 shrink-0" />
                                {formatDate(s.enrolledAt)}
                              </span>
                            </td>

                            {/* Fee Status */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                  s.feeStatus?.toLowerCase() === 'paid'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                                    : s.feeStatus?.toLowerCase() === 'partial' || s.feeStatus?.toLowerCase() === 'partially_paid'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200/80'
                                    : 'bg-rose-50 text-rose-700 border-rose-200/80'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  s.feeStatus?.toLowerCase() === 'paid'
                                    ? 'bg-emerald-500'
                                    : s.feeStatus?.toLowerCase() === 'partial' || s.feeStatus?.toLowerCase() === 'partially_paid'
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`} />
                                {s.feeStatus || 'Pending'}
                              </span>
                            </td>

                            {/* Enrollment Status */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                (s.enrollmentStatus || s.status || '').toLowerCase() === 'active' || (s.enrollmentStatus || s.status) === '1'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  (s.enrollmentStatus || s.status || '').toLowerCase() === 'active' || (s.enrollmentStatus || s.status) === '1'
                                    ? 'bg-emerald-500 animate-pulse'
                                    : 'bg-slate-400'
                                }`} />
                                {s.enrollmentStatus || s.status || 'ACTIVE'}
                              </span>
                            </td>

                            {/* Action */}
                            <td className="px-4 py-3.5 whitespace-nowrap text-right">
                              <button
                                type="button"
                                onClick={() => handleViewStudentProfile(s.id)}
                                title="View Student Profile"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 bg-blue-50/80 hover:bg-blue-100/80 transition-all border border-blue-200/70 hover:border-blue-300 shadow-2xs cursor-pointer active:scale-95"
                              >
                                <Eye size={13} />
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BATCH OVERVIEW & ACADEMIC SCHEDULE FULL VIEW */}
        {viewTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                <BookOpen size={16} className="text-blue-600" /> Academic Context & Curriculum
              </h4>
              <div className="divide-y divide-slate-100 text-xs space-y-0.5">
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500 font-medium">Batch Name:</span>
                  <span className="font-bold text-slate-900">{viewingBatch.name}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500 font-medium">Batch Code:</span>
                  <span className="font-mono font-bold text-slate-900">{viewingBatch.code || '—'}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500 font-medium">Course:</span>
                  <span className="font-bold text-slate-900">{viewingBatch.courseName || '—'}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500 font-medium">Program / Track:</span>
                  <span className="font-bold text-slate-900">{viewingBatch.programName || '—'}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500 font-medium">Level / Standard:</span>
                  <span className="font-bold text-slate-900">{viewingBatch.levelName || '—'}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500 font-medium">Academic Year:</span>
                  <span className="font-bold text-slate-900">{viewingBatch.academicYearName || '—'}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500 font-medium">Campus / Branch:</span>
                  <span className="font-bold text-slate-900">{viewingBatch.branchName || 'Main Campus'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Clock size={16} className="text-amber-600" /> Operational & Room Details
              </h4>
              <div className="divide-y divide-slate-100 text-xs space-y-0.5">
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500 font-medium">Batch Schedule Timing:</span>
                  <span className="font-bold text-slate-900">{formatBatchTiming(viewingBatch)}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500 font-medium">Start Time:</span>
                  <span className="font-mono text-slate-800">{viewingBatch.startTime || 'Not set'}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500 font-medium">End Time:</span>
                  <span className="font-mono text-slate-800">{viewingBatch.endTime || 'Not set'}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500 font-medium">Assigned Classroom:</span>
                  <span className="font-bold text-slate-900">{viewingBatch.classroomName || 'No Classroom Allocated'}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500 font-medium">Max Capacity:</span>
                  <span className="font-bold text-slate-900">{viewingBatch.capacity ?? 'Unlimited'}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500 font-medium">Operational Status:</span>
                  <span className={`inline-flex px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${statusColors[viewingBatch.status]}`}>
                    {viewingBatch.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Create / Edit Modal ──────────────────────────────────────────────────
  if (showModal) {
    return (
      <div className="space-y-6 w-full animate-fade-in max-w-4xl mx-auto">
        <div className="flex items-center gap-3 pb-1 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider mb-1">
              <Layers size={10} /> Batch Configuration
            </div>
            <h2 className="text-2xl font-display font-extrabold text-slate-900 tracking-tight">
              {editingId ? 'Edit Batch' : 'Create New Batch'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Configure batch operational parameters, assigned curriculum hierarchy, academic year, and classroom.
            </p>
          </div>
        </div>

        <div className="p-1 rounded-2xl bg-slate-100/70 border border-slate-200/80 shadow-2xs">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-[calc(1rem-2px)] p-6 space-y-6"
          >
            {/* Section 1: Branch & Academic Context */}
            <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-200/60 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-blue-600 text-white text-[11px] font-black flex items-center justify-center shadow-2xs">
                  1
                </span>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Campus &amp; Academic Year
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Operating Branch <span className="text-red-500">*</span>
                  </label>
                  {isBranchAdmin ? (
                    <div className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold shadow-2xs">
                      <MapPin size={15} className="text-blue-600 shrink-0" />
                      <span>{accessibleBranches[0]?.name || currentUser?.branch || 'Assigned Branch'}</span>
                      <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200/50">Locked</span>
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

            {/* Section 2: Curriculum Hierarchy Alignment */}
            <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-200/60 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-blue-600 text-white text-[11px] font-black flex items-center justify-center shadow-2xs">
                    2
                  </span>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Curriculum Alignment
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Course → Program → Level</span>
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

            {/* Section 3: Batch Identity & Logistics */}
            <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-200/60 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-blue-600 text-white text-[11px] font-black flex items-center justify-center shadow-2xs">
                  3
                </span>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Logistics &amp; Scheduling
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowModal(false)}
                className="text-xs font-semibold h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
              >
                Cancel
              </Button>
              <button
                type="submit"
                disabled={isFormSubmitting}
                className="flex items-center justify-center gap-2 h-10 min-w-[140px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isFormSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Saving...
                  </>
                ) : editingId ? (
                  'Save Changes'
                ) : (
                  'Create Batch'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── List / Directory View ───────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-1">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 text-[10px] font-bold uppercase tracking-wider mb-1.5">
            <Layers size={11} className="text-blue-600" /> Academic Program Operations
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 tracking-tight">
            Batches
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            Configure batches across programs, allocate lecture schedules, assign classrooms, and track intake enrollment.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 font-bold text-xs h-10 px-3.5 rounded-xl border border-slate-200 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
          >
            <Upload size={14} className="text-slate-500" /> Bulk Import
          </Button>
          <Button
            variant="secondary"
            onClick={handleExportCSV}
            className="flex items-center gap-2 font-bold text-xs h-10 px-3.5 rounded-xl border border-slate-200 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
          >
            <Download size={14} className="text-slate-500" /> Export CSV
          </Button>
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-2.5 h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all duration-200 active:scale-95 cursor-pointer ring-2 ring-blue-500/20"
          >
            <span className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center">
              <Plus size={13} className="text-white" />
            </span>
            <span>Create New Batch</span>
          </button>
        </div>
      </div>

      {/* Summary Telemetry Metrics - Double-Bezel Hardware Architecture */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Batches */}
        <div className="p-1 rounded-2xl bg-gradient-to-b from-indigo-50/80 via-slate-50/50 to-white border border-indigo-100/80 shadow-2xs hover:shadow-xs transition-all duration-300">
          <div className="p-4 rounded-[calc(1rem-2px)] bg-white/90 backdrop-blur-sm h-full flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Total Batches</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center ring-1 ring-indigo-500/10">
                <Layers size={15} />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-black text-slate-900 font-display tracking-tight">{metrics.totalCount}</p>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span><strong className="text-slate-700 font-semibold">{metrics.activeCount}</strong> active in view</span>
              </div>
            </div>
          </div>
        </div>

        {/* Student Enrollment */}
        <div className="p-1 rounded-2xl bg-gradient-to-b from-emerald-50/80 via-slate-50/50 to-white border border-emerald-100/80 shadow-2xs hover:shadow-xs transition-all duration-300">
          <div className="p-4 rounded-[calc(1rem-2px)] bg-white/90 backdrop-blur-sm h-full flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Student Enrollment</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center ring-1 ring-emerald-500/10">
                <Users size={15} />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-black text-slate-900 font-display tracking-tight">{metrics.totalEnrolled}</p>
              <p className="text-xs text-slate-400 mt-1">Learners assigned across batches</p>
            </div>
          </div>
        </div>

        {/* Classroom Intake */}
        <div className="p-1 rounded-2xl bg-gradient-to-b from-amber-50/80 via-slate-50/50 to-white border border-amber-100/80 shadow-2xs hover:shadow-xs transition-all duration-300">
          <div className="p-4 rounded-[calc(1rem-2px)] bg-white/90 backdrop-blur-sm h-full flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Classroom Intake</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center ring-1 ring-amber-500/10">
                <Building size={15} />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-black text-slate-900 font-display tracking-tight">
                {metrics.totalCapacity > 0 ? metrics.totalCapacity : 'Flexible'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Configured maximum desk quota</p>
            </div>
          </div>
        </div>

        {/* Seat Utilization */}
        <div className="p-1 rounded-2xl bg-gradient-to-b from-sky-50/80 via-slate-50/50 to-white border border-sky-100/80 shadow-2xs hover:shadow-xs transition-all duration-300">
          <div className="p-4 rounded-[calc(1rem-2px)] bg-white/90 backdrop-blur-sm h-full flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Seat Utilization</span>
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center ring-1 ring-sky-500/10">
                <UserCheck size={15} />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-black text-slate-900 font-display tracking-tight">{metrics.utilizationRate}%</p>
                <span className="text-xs text-slate-400 font-medium">intake filled</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    metrics.utilizationRate >= 90 ? 'bg-rose-500' : metrics.utilizationRate >= 75 ? 'bg-amber-500' : 'bg-sky-500'
                  }`}
                  style={{ width: `${Math.min(100, metrics.utilizationRate)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Directory Filter Bar - Double Bezel Container */}
      <div className="space-y-3">
        {/* Main Shell */}
        <div className="p-1 rounded-2xl bg-slate-100/70 border border-slate-200/80 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-white p-2.5 rounded-[calc(1rem-2px)]">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                className="w-full bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition duration-150"
                placeholder="Search by batch name, code, track, or level..."
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setCurrentPage(1); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer transition-colors"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Quick Filter Selects */}
            <div className="flex flex-wrap items-center gap-2">
              {!isBranchAdmin && (
                <div className="w-36">
                  <select
                    value={filterBranch}
                    onChange={e => { setFilterBranch(e.target.value); setCurrentPage(1); }}
                    className="w-full h-9 text-xs font-semibold bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 text-slate-800 rounded-xl px-2.5 pr-6 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all truncate"
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
                  className="w-full h-9 text-xs font-semibold bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 text-slate-800 rounded-xl px-2.5 pr-6 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all truncate"
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
                  className="w-full h-9 text-xs font-semibold bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 text-slate-800 rounded-xl px-2.5 pr-6 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all truncate"
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
                className={`flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs active:scale-95 ${
                  isFilterExpanded || activeFilters.some(f => ['Program', 'Level', 'Year'].includes(f.label))
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs hover:bg-slate-800'
                    : 'bg-slate-50 hover:bg-white border-slate-200/80 text-slate-700 hover:border-slate-300'
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
        </div>

        {/* Detailed Filters Panel (when expanded) */}
        {isFilterExpanded && (
          <div className="p-1 rounded-2xl bg-slate-100/70 border border-slate-200/80 shadow-2xs animate-fade-in">
            <div className="bg-white rounded-[calc(1rem-2px)] p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Filter size={13} className="text-blue-600" /> Advanced Batch Filters
                </span>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer transition-colors"
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
                    className="w-full h-8 text-xs font-semibold bg-slate-50 hover:bg-white border border-slate-200 text-slate-800 rounded-xl px-2.5 disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
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
                    className="w-full h-8 text-xs font-semibold bg-slate-50 hover:bg-white border border-slate-200 text-slate-800 rounded-xl px-2.5 disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
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
                    className="w-full h-8 text-xs font-semibold bg-slate-50 hover:bg-white border border-slate-200 text-slate-800 rounded-xl px-2.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  >
                    {yearFilterOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
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
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-slate-800 border border-slate-200 shadow-2xs transition-colors"
              >
                <span className="text-slate-400 font-normal">{af.label}:</span>
                <span className="text-slate-700 font-bold">{af.value}</span>
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
              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer ml-1 transition-all"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Directory Table - Double Bezel Framing */}
      <div className="p-1 rounded-2xl bg-slate-100/70 border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="bg-white rounded-[calc(1rem-2px)] overflow-hidden">
          {/* Table Header Bar */}
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gradient-to-r from-slate-50/50 to-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center ring-1 ring-blue-500/10">
                <Layers size={16} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                  All Active Batches
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
                    {total} {total === 1 ? 'batch' : 'batches'}
                  </span>
                </h3>
              </div>
            </div>
            {debouncedSearch && (
              <span className="text-xs text-slate-400">
                Filtered by &quot;<strong className="text-slate-700">{debouncedSearch}</strong>&quot;
              </span>
            )}
          </div>

          <Table 
            borderless={true}
            minWidth="1200px"
            colWidths={['22%', '20%', '17%', '11%', '12%', '6%', '12%']}
            headers={[
              { label: 'Batch & Code', minWidth: '210px' },
              { label: 'Curriculum Track', minWidth: '180px' },
              { label: 'Room & Schedule', minWidth: '150px' },
              { label: 'Academic Year', minWidth: '110px' },
              { label: 'Intake & Fill', minWidth: '120px' },
              { label: 'Status', minWidth: '85px' },
              { label: 'Actions', minWidth: '135px', align: 'right' }
            ]}
          >
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-20">
                  <div className="text-center flex flex-col items-center justify-center text-slate-400">
                    <div className="relative mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                        <Loader2 size={24} className="animate-spin text-blue-600" />
                      </div>
                    </div>
                    <p className="text-sm font-bold text-slate-700">Loading batch directory...</p>
                    <p className="text-xs text-slate-400 mt-1">Retrieving schedules, capacity, and student allocations</p>
                  </div>
                </td>
              </tr>
            ) : batches.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-20">
                  <div className="text-center flex flex-col items-center justify-center max-w-md mx-auto">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50/80 border border-blue-100 text-blue-600 flex items-center justify-center mb-4 shadow-sm">
                      <Layers size={28} />
                    </div>
                    <h3 className="text-lg font-display font-extrabold text-slate-900 mb-1">No batches found</h3>
                    <p className="text-slate-500 text-xs sm:text-sm leading-relaxed mb-6">
                      {debouncedSearch || filterCourse !== 'All' || filterStatus !== 'All' || filterProgram !== 'All' || filterLevel !== 'All'
                        ? 'No batches match your current search or filter configuration. Try resetting filters to view all batches.'
                        : 'No batches have been set up yet. Create your first batch to start scheduling lectures and enrolling students.'}
                    </p>
                    {debouncedSearch || filterCourse !== 'All' || filterStatus !== 'All' ? (
                      <Button variant="secondary" onClick={clearAllFilters} className="text-xs font-bold gap-1.5">
                        <RotateCcw size={13} /> Reset Filter Settings
                      </Button>
                    ) : (
                      <Button variant="primary" onClick={openAdd} className="text-xs font-bold gap-1.5 shadow-sm">
                        <Plus size={14} /> Create First Batch
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              batches.map(b => {
                const cap = b.capacity;
                const strength = b.currentStrength || 0;
                const pct = cap && cap > 0 ? Math.round((strength / cap) * 100) : 0;
                const batchInitials = b.name
                  ? b.name
                      .split(' ')
                      .slice(0, 2)
                      .map(w => w[0])
                      .join('')
                      .toUpperCase()
                  : 'BT';

                return (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Batch Name & Code */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-violet-500/10 border border-blue-500/20 text-blue-700 font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                          {batchInitials}
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => handleOpenView(b)}
                            className="font-bold text-slate-900 text-sm leading-snug hover:text-blue-600 transition-colors cursor-pointer text-left block truncate max-w-[210px]"
                            title="View batch details & student roster"
                          >
                            {b.name}
                          </button>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
                              {b.code || 'NO-CODE'}
                            </span>
                            {b.branchName && (
                              <span className="text-[11px] text-slate-400 flex items-center gap-0.5 truncate max-w-[120px]">
                                <MapPin size={10} className="shrink-0 text-slate-400" />
                                {b.branchName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Academic Track */}
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800 text-sm leading-snug">
                        {b.programName || b.courseName}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <span className="truncate max-w-[130px]">{b.courseName}</span>
                        {b.levelName && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-600 font-medium truncate max-w-[90px]">{b.levelName}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Room & Schedule */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                        <Building size={13} className="text-blue-600 shrink-0" />
                        <span className="truncate max-w-[140px]">{b.classroomName || 'No room set'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1 font-mono">
                        <Clock size={12} className="text-slate-400 shrink-0" />
                        <span>{formatBatchTiming(b) || 'Timing unassigned'}</span>
                      </div>
                    </td>

                    {/* Academic Year */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100/80 text-slate-700 border border-slate-200/60">
                        <Calendar size={11} className="text-slate-400" />
                        {b.academicYearName || '—'}
                      </span>
                    </td>

                    {/* Intake & Fill */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-900 text-sm tabular-nums">{strength}</span>
                        <span className="text-slate-400 text-xs font-medium">/ {cap !== null && cap !== undefined ? cap : '∞'}</span>
                        {cap && cap > 0 ? (
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            pct >= 90 ? 'bg-rose-50 text-rose-700' : pct >= 75 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {pct}%
                          </span>
                        ) : null}
                      </div>
                      {cap && cap > 0 ? (
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              pct >= 90 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 mt-0.5">Flexible capacity</div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                        b.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                          : b.status === 'Inactive'
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          b.status === 'Active' ? 'bg-emerald-500 animate-pulse' : b.status === 'Inactive' ? 'bg-slate-400' : 'bg-rose-500'
                        }`} />
                        {b.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5 shrink-0 min-w-[115px]">
                        <button
                          type="button"
                          onClick={() => handleOpenView(b)}
                          title="View Batch Roster & Analytics"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50/80 hover:border-blue-200 border border-slate-200/60 bg-white transition-all duration-150 cursor-pointer active:scale-95 shadow-2xs"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(b)}
                          title="Edit Batch Parameters"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50/80 hover:border-amber-200 border border-slate-200/60 bg-white transition-all duration-150 cursor-pointer active:scale-95 shadow-2xs"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(b)}
                          title="Delete Batch"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50/80 hover:border-rose-200 border border-slate-200/60 bg-white transition-all duration-150 cursor-pointer active:scale-95 shadow-2xs"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </Table>

          <div className="p-3 border-t border-slate-100 bg-slate-50/40">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={p => setCurrentPage(p)}
              onPageSizeChange={s => { setPageSize(s); setCurrentPage(1); }}
            />
          </div>
        </div>
      </div>

      {/* Soft Delete Modal */}
      <Modal
        isOpen={Boolean(deleteTargetBatch)}
        onClose={() => setDeleteTargetBatch(null)}
        title="Delete Batch"
      >
        {deleteTargetBatch && (
          <div className="space-y-5 py-1">
            <div className="flex items-start gap-3.5 p-4 bg-rose-50/70 border border-rose-200/80 rounded-2xl text-rose-950">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 ring-1 ring-rose-500/20">
                <AlertTriangle size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-rose-950 text-sm">Confirm Batch Deletion</h4>
                <p className="text-xs text-rose-800 leading-relaxed">
                  Are you sure you want to delete <span className="font-bold text-rose-950">{deleteTargetBatch.name}</span> ({deleteTargetBatch.code || 'No code assigned'})? The status will be updated to deleted and it will be removed from directory allocations.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-1">
              <Button
                variant="secondary"
                onClick={() => setDeleteTargetBatch(null)}
                disabled={isDeleting}
                className="text-xs font-semibold h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={14} />}
                <span>Confirm Delete</span>
              </button>
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