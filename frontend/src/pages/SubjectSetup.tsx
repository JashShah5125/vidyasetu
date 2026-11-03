import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Toggle } from '../components/ui/Toggle';
import {
  BookOpen, Package, Plus, Loader2, Layers, Trash2, Pencil,
  RotateCcw, Download, ArrowRight, Edit3, Eye
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Pagination } from '../components/ui/Pagination';
import { subjectApi } from '../services/subjectApi';
import type { Subject } from '../services/subjectApi';
import { bundleApi } from '../services/bundleApi';
import type { SubjectBundle } from '../services/bundleApi';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { courseApi } from '../services/courseApi';

export const SubjectSetup: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, branches = [], addToast } = useApp();
  const isBranchAdmin = currentUser?.role === 'branch-admin';
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteSubjectTarget, setDeleteSubjectTarget] = useState<Subject | null>(null);
  const [isDeletingSubject, setIsDeletingSubject] = useState(false);
  const [deleteBundleTarget, setDeleteBundleTarget] = useState<SubjectBundle | null>(null);
  
  // Courses Data
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseData, setSelectedCourseData] = useState<any>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCourseCode, setSelectedCourseCode] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Tabs: Subjects pool vs Subject Bundles
  const [activeTab, setActiveTab] = useState<'subjects' | 'bundles'>('subjects');

  // Subject Bundles state
  const [bundles, setBundles] = useState<SubjectBundle[]>([]);
  const [isBundlesLoading, setIsBundlesLoading] = useState(false);
  const [bundleCurrentPage, setBundleCurrentPage] = useState(1);
  const [bundlePageSize, setBundlePageSize] = useState(10);
  const [bundleTotal, setBundleTotal] = useState(0);
  const [bundleTotalPages, setBundleTotalPages] = useState(1);
  const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
  const [isBundleSaving, setIsBundleSaving] = useState(false);
  const [editingBundle, setEditingBundle] = useState<SubjectBundle | null>(null);

  // Dedicated creation & edit state inside the bundle modal
  const [modalCourseCode, setModalCourseCode] = useState('');
  const [modalCourseData, setModalCourseData] = useState<any>(null);
  const [modalProgramId, setModalProgramId] = useState('');
  const [modalLevelId, setModalLevelId] = useState('');
  const [modalBranchId, setModalBranchId] = useState('');
  const [bundleForm, setBundleForm] = useState({
    name: '',
    description: '',
    feeAmount: '' as string | number,
    is_active: true,
    subjectIds: [] as string[]
  });

  // 1. Fetch Master List of Courses on Mount
  useEffect(() => {
    courseApi.list({ limit: 1000 }).then(res => {
      if (res?.status === 'success' && res.data) {
        setCourses(res.data);
      }
    }).catch(() => {});
  }, []);

  // 2. Fetch Course Details when a Course is selected to populate Programs/Levels
  useEffect(() => {
    if (selectedCourseCode) {
      courseApi.getByCode(selectedCourseCode).then(res => {
        if (res?.status === 'success' && res.data) {
          setSelectedCourseData(res.data);
        }
      }).catch(() => {});
    } else {
      setSelectedCourseData(null);
      setSelectedProgramId('');
      setSelectedLevelId('');
    }
  }, [selectedCourseCode]);

  // Derived options for dropdowns
  const selectedCourseId = useMemo(() => {
    return courses.find(c => c.code === selectedCourseCode)?.id?.toString() || '';
  }, [courses, selectedCourseCode]);

  const programOptions = useMemo(() => {
    if (!selectedCourseData?.programs) return [{ value: '', label: 'All Programs' }];
    return [
      { value: '', label: 'All Programs' },
      ...selectedCourseData.programs.map((p: any) => ({ value: String(p.id), label: p.name }))
    ];
  }, [selectedCourseData]);

  const levelOptions = useMemo(() => {
    if (!selectedCourseData?.programs || !selectedProgramId) return [{ value: '', label: 'All Levels' }];
    const prog = selectedCourseData.programs.find((p: any) => String(p.id) === selectedProgramId);
    if (!prog?.levels) return [{ value: '', label: 'All Levels' }];
    return [
      { value: '', label: 'All Levels' },
      ...prog.levels.map((l: any) => ({ value: String(l.id), label: l.name }))
    ];
  }, [selectedCourseData, selectedProgramId]);

  // Selected level object + its mapped subjects (candidate pool for bundles)
  const selectedLevel = useMemo(() => {
    if (!selectedCourseData?.programs || !selectedProgramId || !selectedLevelId) return null;
    const prog = selectedCourseData.programs.find((p: any) => String(p.id) === selectedProgramId);
    return prog?.levels?.find((l: any) => String(l.id) === selectedLevelId) || null;
  }, [selectedCourseData, selectedProgramId, selectedLevelId]);

  const levelSubjects: any[] = selectedLevel?.subjects || [];
  const courseBranchId = selectedCourseData?.branches?.[0];

  // Derived options for modal selections
  const modalPrograms = useMemo(() => {
    return modalCourseData?.programs || [];
  }, [modalCourseData]);

  const modalLevels = useMemo(() => {
    if (!modalProgramId) return [];
    const prog = modalPrograms.find((p: any) => String(p.id) === modalProgramId);
    return prog?.levels || [];
  }, [modalPrograms, modalProgramId]);

  const modalLevelSubjects = useMemo(() => {
    if (!modalLevelId) return [];
    const lvl = modalLevels.find((l: any) => String(l.id) === modalLevelId);
    return lvl?.subjects || [];
  }, [modalLevels, modalLevelId]);

  const handleModalCourseChange = async (code: string) => {
    setModalCourseCode(code);
    setModalProgramId('');
    setModalLevelId('');
    setBundleForm(prev => ({ ...prev, subjectIds: [] }));
    if (!code) {
      setModalCourseData(null);
      setModalBranchId('');
      return;
    }
    try {
      const res = await courseApi.getByCode(code);
      if (res?.status === 'success' && res.data) {
        setModalCourseData(res.data);
        const branch = res.data.branches?.[0] || branches[0]?.id || '';
        setModalBranchId(String(branch));
        if (res.data.programs?.length > 0) {
          const firstProg = res.data.programs[0];
          setModalProgramId(String(firstProg.id));
          if (firstProg.levels?.length > 0) {
            setModalLevelId(String(firstProg.levels[0].id));
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleModalProgramChange = (progId: string) => {
    setModalProgramId(progId);
    setModalLevelId('');
    setBundleForm(prev => ({ ...prev, subjectIds: [] }));
    const prog = modalPrograms.find((p: any) => String(p.id) === progId);
    if (prog?.levels?.length > 0) {
      setModalLevelId(String(prog.levels[0].id));
    }
  };

  // 3. Fetch Subjects based on filters
  const fetchSubjects = async () => {
    try {
      setIsLoading(true);
      const res = await subjectApi.list({ 
        status: filterStatus,
        courseId: selectedCourseId,
        programId: selectedProgramId,
        levelId: selectedLevelId
      });
      if (res?.status === 'success') {
        setSubjects(res.data || []);
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to fetch subjects', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [filterStatus, selectedCourseId, selectedProgramId, selectedLevelId]);

  // Handle Delete Subject
  const handleConfirmDeleteSubject = async () => {
    if (!deleteSubjectTarget) return;
    try {
      setIsDeletingSubject(true);
      const res = await subjectApi.delete(deleteSubjectTarget.code);
      if (res?.status === 'success') {
        addToast(res.message || `Subject "${deleteSubjectTarget.name}" deleted successfully`, 'success');
        setDeleteSubjectTarget(null);
        fetchSubjects();
      } else {
        addToast(res?.message || 'Failed to delete subject', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to delete subject', 'error');
    } finally {
      setIsDeletingSubject(false);
    }
  };

  // 4. Fetch Bundles (optionally filtered by level)
  const fetchBundles = async (levelOverride?: string, page: number = bundleCurrentPage, pageSizeArg: number = bundlePageSize) => {
    try {
      setIsBundlesLoading(true);
      const res = await bundleApi.list({
        levelId: levelOverride !== undefined ? levelOverride : (selectedLevelId || undefined),
        status: filterStatus === 'all' ? undefined : filterStatus,
        search: search.trim() || undefined,
        page,
        limit: pageSizeArg
      });
      if (res?.status === 'success') {
        setBundles(res.data || []);
        setBundleTotal(res.pagination?.total ?? 0);
        setBundleTotalPages(res.pagination?.totalPages ?? 1);
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to fetch subject bundles', 'error');
    } finally {
      setIsBundlesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'bundles') {
      fetchBundles();
    }
  }, [activeTab, selectedLevelId, filterStatus, search, bundleCurrentPage, bundlePageSize]);

  // Frontend Text Search (subjects)
  const filtered = useMemo(() => {
    const list = subjects.filter(s => {
      const matchSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.code.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [subjects, search]);

  const filteredBundles = useMemo(() => {
    return bundles.filter(b => {
      const matchSearch =
        !search ||
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        (b.description || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' ? b.is_active !== false : b.is_active === false);
      return matchSearch && matchStatus;
    });
  }, [bundles, search, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleClearFilters = () => {
    setSelectedCourseCode('');
    setSelectedProgramId('');
    setSelectedLevelId('');
    setFilterStatus('all');
    setSearch('');
    setCurrentPage(1);
    setBundleCurrentPage(1);
    fetchBundles('', 1);
  };

  const handleExportCSV = () => {
    if (activeTab === 'subjects') {
      if (filtered.length === 0) return;
      const rows = filtered.map(s => ({
        'Subject Name': s.name,
        'Code': s.code,
        'Type': s.type || 'Theory',
        'Fee': s.fee_amount || s.base_fee || 0,
        'Status': s.status
      }));
      const headers = Object.keys(rows[0]);
      const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h as keyof typeof r]).replace(/"/g, '""')}"`).join(','))].join('\n');
      const a = document.createElement('a');
      a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      a.download = 'subjects.csv';
      a.click();
    } else {
      if (bundles.length === 0) return;
      const rows = bundles.map(b => ({
        'Bundle Name': b.name,
        'Level': b.level_name || b.level_id || '-',
        'Branch': b.branch_name || b.branch_id || '-',
        'Subjects': (b.subjects || []).map(s => s.name).join('; '),
        'Status': b.is_active !== false ? 'Active' : 'Inactive'
      }));
      const headers = Object.keys(rows[0]);
      const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h as keyof typeof r]).replace(/"/g, '""')}"`).join(','))].join('\n');
      const a = document.createElement('a');
      a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      a.download = 'subject_bundles.csv';
      a.click();
    }
  };

  // ─── Bundle handlers ───────────────────────────────────────────────────────
  const openCreateBundle = () => {
    setEditingBundle(null);
    setBundleForm({
      name: '',
      description: '',
      feeAmount: '',
      is_active: true,
      subjectIds: []
    });

    const initCode = selectedCourseCode || (courses[0]?.code ?? '');
    setModalCourseCode(initCode);
    setModalProgramId(selectedProgramId || '');
    setModalLevelId(selectedLevelId || '');

    if (initCode) {
      courseApi.getByCode(initCode).then(res => {
        if (res?.status === 'success' && res.data) {
          setModalCourseData(res.data);
          const branch = res.data.branches?.[0] || branches[0]?.id || '';
          setModalBranchId(String(branch));
          if (!selectedProgramId && res.data.programs?.length > 0) {
            const firstProg = res.data.programs[0];
            setModalProgramId(String(firstProg.id));
            if (!selectedLevelId && firstProg.levels?.length > 0) {
              setModalLevelId(String(firstProg.levels[0].id));
            }
          }
        }
      }).catch(() => {});
    }

    setIsBundleModalOpen(true);
  };

  const openEditBundle = async (bundle: SubjectBundle) => {
    setEditingBundle(bundle);
    setBundleForm({
      name: bundle.name,
      description: bundle.description || '',
      feeAmount: bundle.fee_amount !== null && bundle.fee_amount !== undefined ? bundle.fee_amount : '',
      is_active: bundle.is_active !== false,
      subjectIds: (bundle.subjects || []).map(s => String(s.id))
    });
    setModalLevelId(String(bundle.level_id));
    setModalBranchId(String(bundle.branch_id || ''));

    if (bundle.course_id) {
      const course = courses.find(c => String(c.id) === String(bundle.course_id));
      if (course) {
        setModalCourseCode(course.code);
        try {
          const res = await courseApi.getByCode(course.code);
          if (res?.status === 'success' && res.data) {
            setModalCourseData(res.data);
            if (bundle.program_id) {
              setModalProgramId(String(bundle.program_id));
            }
          }
        } catch {}
      }
    }
    setIsBundleModalOpen(true);
  };

  const toggleBundleSubject = (subjectId: string) => {
    setBundleForm(prev => ({
      ...prev,
      subjectIds: prev.subjectIds.includes(subjectId)
        ? prev.subjectIds.filter(id => id !== subjectId)
        : [...prev.subjectIds, subjectId]
    }));
  };

  const handleSaveBundle = async () => {
    if (!bundleForm.name.trim()) {
      addToast('Bundle name is required.', 'error');
      return;
    }
    if (!modalLevelId) {
      addToast('Please select a course, program, and academic level for this bundle.', 'error');
      return;
    }
    const resolvedBranch = modalBranchId || modalCourseData?.branches?.[0] || branches[0]?.id;
    if (!resolvedBranch) {
      addToast('Please select or assign a branch for this bundle.', 'error');
      return;
    }
    if (bundleForm.subjectIds.length === 0) {
      addToast('Please select at least one subject for the bundle.', 'error');
      return;
    }

    const payload = {
      levelId: modalLevelId,
      branchId: resolvedBranch,
      name: bundleForm.name.trim(),
      description: bundleForm.description.trim(),
      is_active: bundleForm.is_active,
      subjectIds: bundleForm.subjectIds,
      feeAmount: bundleForm.feeAmount !== '' ? Number(bundleForm.feeAmount) : null
    };

    try {
      setIsBundleSaving(true);
      if (editingBundle) {
        await bundleApi.update(editingBundle.id, payload);
        addToast('Subject bundle updated successfully', 'success');
      } else {
        await bundleApi.create(payload);
        addToast('Subject bundle created successfully', 'success');
      }
      setIsBundleModalOpen(false);
      fetchBundles();
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to save subject bundle', 'error');
    } finally {
      setIsBundleSaving(false);
    }
  };

  const handleConfirmDeleteBundle = async () => {
    if (!deleteBundleTarget) return;
    try {
      await bundleApi.delete(deleteBundleTarget.id);
      addToast(`Subject bundle "${deleteBundleTarget.name}" deleted successfully.`, 'success');
      setDeleteBundleTarget(null);
      fetchBundles();
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to delete subject bundle', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <BookOpen size={32} className="text-indigo-600" />
            Subjects
          </h2>
          <p className="text-base text-slate-500 mt-2">
            Configure master subjects, syllabus types, curriculum mappings, and subject bundles.
          </p>
        </div>

        {!isBranchAdmin && (
          <div className="flex items-center gap-2">
            {activeTab === 'subjects' ? (
              <Button
                variant="primary"
                onClick={() => navigate('/subjects/new')}
                className="px-5 py-2.5 text-sm shadow-sm gap-2"
              >
                <Plus size={18} /> Add New Subject
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={openCreateBundle}
                className="px-5 py-2.5 text-sm shadow-sm gap-2"
              >
                <Plus size={18} /> Create Bundle
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none gap-2">
        <button
          onClick={() => setActiveTab('subjects')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer select-none ${
            activeTab === 'subjects'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen size={16} /> Master Subjects
        </button>
        <button
          onClick={() => setActiveTab('bundles')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer select-none ${
            activeTab === 'bundles'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package size={16} /> Subject Bundles
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm items-end justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 flex-1 w-full items-end">
          <Input
            label="Search"
            placeholder={activeTab === 'bundles' ? 'Search by bundle name...' : 'Search by subject name or code...'}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); setBundleCurrentPage(1); }}
            wrapperClassName="sm:col-span-2"
          />

          <Select
            label="Course"
            options={[
              { value: '', label: 'All Courses' },
              ...courses.map(c => ({ value: c.code, label: c.name }))
            ]}
            value={selectedCourseCode}
            onChange={e => {
              setSelectedCourseCode(e.target.value);
              setSelectedProgramId('');
              setSelectedLevelId('');
              setCurrentPage(1);
              setBundleCurrentPage(1);
              fetchBundles('', 1);
            }}
          />

          <Select
            label="Program"
            options={programOptions}
            value={selectedProgramId}
            onChange={e => {
              setSelectedProgramId(e.target.value);
              setSelectedLevelId('');
              setCurrentPage(1);
              setBundleCurrentPage(1);
              fetchBundles('', 1);
            }}
            disabled={!selectedCourseCode}
          />

          <Select
            label="Level"
            options={levelOptions}
            value={selectedLevelId}
            onChange={e => {
              setSelectedLevelId(e.target.value);
              setCurrentPage(1);
              setBundleCurrentPage(1);
              fetchBundles(e.target.value, 1);
            }}
            disabled={!selectedProgramId}
          />

          <Select
            label="Status"
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
          />
        </div>

        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" onClick={handleClearFilters} className="text-slate-500 hover:text-slate-700 flex items-center gap-1.5">
            <RotateCcw size={14} /> Clear
          </Button>
          <Button variant="secondary" onClick={handleExportCSV} className="flex items-center gap-1.5">
            <Download size={14} /> Export CSV
          </Button>
        </div>
      </div>

      {/* Main Content Card */}
      {activeTab === 'subjects' ? (
        <Card className="shadow-sm border border-slate-200 overflow-hidden">
          <CardHeader>
            <CardTitle>Master Subjects Directory</CardTitle>
          </CardHeader>

          {isLoading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center">
              <Loader2 size={36} className="text-blue-500 animate-spin mb-3" />
              <h3 className="text-sm font-bold text-slate-700">Loading subjects directory...</h3>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center">
              <div className="bg-blue-50 p-4 rounded-full mb-3">
                <BookOpen size={36} className="text-blue-500" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">No subjects found</h3>
              <p className="text-xs text-slate-500 max-w-sm mb-5">
                {isBranchAdmin ? 'No academic subjects match your filters.' : 'Get started by creating your first subject, or adjust your filters.'}
              </p>
              {!isBranchAdmin && (
                <Button
                  variant="primary"
                  onClick={() => navigate('/subjects/new')}
                  className="px-4 py-2 text-sm font-bold"
                >
                  <Plus size={16} className="mr-1.5" /> Add New Subject
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table headers={['Subject Name', 'Subject Code', 'Type', 'Fee', 'Status', 'Actions']} dense>
                {paginated.map(subject => (
                  <tr key={subject.code} className="hover:bg-slate-50 transition-all duration-200">
                    <td className="px-3 py-3.5 font-bold text-slate-900 text-sm whitespace-nowrap min-w-[200px]">
                      {subject.name}
                    </td>
                    <td className="px-3 py-3.5 font-mono font-bold text-blue-600 text-xs whitespace-nowrap uppercase">
                      {subject.code}
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[10px] font-bold uppercase">
                        {subject.type || 'Theory'}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap font-mono font-bold text-slate-800 text-xs">
                      {subject.fee_amount || subject.base_fee ? (
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                          ₹{Number(subject.fee_amount || subject.base_fee).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal italic">₹0 / By Level</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      {subject.status === 'active' || (subject as any).is_active !== false ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/subjects/${subject.code}`)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title={isBranchAdmin ? 'View Details' : 'Manage Subject'}
                        >
                          <Eye size={16} />
                        </button>
                        {!isBranchAdmin && (
                          <button
                            type="button"
                            onClick={() => setDeleteSubjectTarget(subject)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete Subject"
                          >
                            <Trash2 size={16} />
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
        </Card>
      ) : (
        <Card className="shadow-sm border border-slate-200 overflow-hidden">
          <CardHeader>
            <CardTitle>Subject Bundles Directory</CardTitle>
          </CardHeader>

          {isBundlesLoading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center">
              <Loader2 size={36} className="text-blue-500 animate-spin mb-3" />
              <h3 className="text-sm font-bold text-slate-700">Loading subject bundles...</h3>
            </div>
          ) : filteredBundles.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center">
              <div className="bg-blue-50 p-4 rounded-full mb-3">
                <Package size={36} className="text-blue-500" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">No bundles found</h3>
              <p className="text-xs text-slate-500 max-w-sm mb-5">
                {isBranchAdmin ? 'No subject bundles configured for this level.' : 'Create a bundle of subjects that students can opt into together.'}
              </p>
              {!isBranchAdmin && (
                <Button
                  variant="primary"
                  onClick={openCreateBundle}
                  className="px-4 py-2 text-sm font-bold"
                >
                  <Plus size={16} className="mr-1.5" /> Create Bundle
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table headers={['Bundle Name', 'Level', 'Branch', 'Bundle Fee', 'Mapped Subjects', 'Status', 'Actions']} dense>
                {filteredBundles.map(bundle => (
                  <tr key={bundle.id} className="hover:bg-slate-50 transition-all duration-200">
                    <td className="px-3 py-3.5 font-bold text-slate-900 text-sm whitespace-nowrap min-w-[180px]">
                      <div>{bundle.name}</div>
                      {bundle.description ? (
                        <p className="text-xs font-normal text-slate-500 mt-0.5 max-w-[260px] truncate">{bundle.description}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                      {bundle.level_name || bundle.level_id || '-'}
                    </td>
                    <td className="px-3 py-3.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                      {bundle.branch_name || bundle.branch_id || '-'}
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap font-bold text-slate-800 text-xs">
                      {bundle.fee_amount ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                          ₹{Number(bundle.fee_amount).toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal italic">Included</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      {(bundle.subjects || []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {bundle.subjects!.map(s => (
                            <span
                              key={s.id}
                              className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[10px] font-bold uppercase whitespace-nowrap"
                            >
                              {s.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No subjects</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      {bundle.is_active !== false ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      {isBranchAdmin ? (
                        <span className="text-xs text-slate-400 italic">View Only</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditBundle(bundle)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Edit Bundle"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteBundleTarget(bundle)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete Bundle"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
              <Pagination
                currentPage={bundleCurrentPage}
                totalPages={bundleTotalPages}
                totalItems={bundleTotal}
                pageSize={bundlePageSize}
                onPageChange={setBundleCurrentPage}
                onPageSizeChange={size => { setBundlePageSize(size); setBundleCurrentPage(1); }}
              />
            </>
          )}
        </Card>
      )}

      {/* Create / Edit Bundle Modal */}
      <Modal
        isOpen={isBundleModalOpen}
        onClose={() => setIsBundleModalOpen(false)}
        title={editingBundle ? 'Edit Subject Bundle' : 'Create Subject Bundle'}
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsBundleModalOpen(false)} className="text-sm font-semibold">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveBundle}
              disabled={isBundleSaving}
              className="text-sm font-semibold"
            >
              {isBundleSaving ? 'Saving...' : editingBundle ? 'Save Changes' : 'Create Bundle'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Academic Placement Row */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wide">
              <Layers size={15} className="text-indigo-600" /> Academic Placement
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select
                label="Course *"
                options={[
                  { value: '', label: 'Select Course' },
                  ...courses.map(c => ({ value: c.code, label: c.name }))
                ]}
                value={modalCourseCode}
                onChange={e => handleModalCourseChange(e.target.value)}
              />
              <Select
                label="Program *"
                options={[
                  { value: '', label: 'Select Program' },
                  ...modalPrograms.map((p: any) => ({ value: String(p.id), label: p.name }))
                ]}
                value={modalProgramId}
                onChange={e => handleModalProgramChange(e.target.value)}
                disabled={!modalCourseCode}
              />
              <Select
                label="Academic Level *"
                options={[
                  { value: '', label: 'Select Level' },
                  ...modalLevels.map((l: any) => ({ value: String(l.id), label: l.name }))
                ]}
                value={modalLevelId}
                onChange={e => {
                  setModalLevelId(e.target.value);
                  setBundleForm(prev => ({ ...prev, subjectIds: [] }));
                }}
                disabled={!modalProgramId}
              />
            </div>
            {branches.length > 1 && (
              <div className="pt-2 border-t border-slate-200/60">
                <Select
                  label="Branch Offering *"
                  options={branches.map((b: any) => ({ value: String(b.id), label: b.name }))}
                  value={modalBranchId}
                  onChange={e => setModalBranchId(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Bundle Info Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Bundle Name *"
              value={bundleForm.name}
              placeholder="e.g. PCM, PCB, Group 1 Specialization"
              onChange={e => setBundleForm(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <Input
              label="Bundle Fee (₹)"
              type="number"
              min="0"
              step="100"
              value={bundleForm.feeAmount}
              placeholder="e.g. 35000 (optional standalone price)"
              onChange={e => setBundleForm(prev => ({ ...prev, feeAmount: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="md:col-span-2">
              <Input
                label="Description"
                value={bundleForm.description}
                placeholder="Brief description (e.g. Physics, Chemistry and Math bundle with mock tests)"
                onChange={e => setBundleForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center md:justify-center pt-2 md:pt-4">
              <Toggle
                checked={bundleForm.is_active}
                onChange={checked => setBundleForm(prev => ({ ...prev, is_active: checked }))}
                label={bundleForm.is_active ? 'Bundle Active' : 'Bundle Inactive'}
              />
            </div>
          </div>

          {/* Subjects Selection */}
          <div>
            {(() => {
              const candidateSubjects = modalLevelSubjects.length > 0 ? modalLevelSubjects : subjects;
              return (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Select Bundle Subjects ({candidateSubjects.length})
                    </span>
                    {bundleForm.subjectIds.length > 0 && (
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                        {bundleForm.subjectIds.length} subjects selected
                      </span>
                    )}
                  </div>

                  {!modalLevelId ? (
                    <div className="p-6 text-center text-xs font-semibold text-slate-400 italic bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                      Please select an Academic Level above to view and map bundle subjects.
                    </div>
                  ) : candidateSubjects.length === 0 ? (
                    <div className="p-6 text-center text-xs font-semibold text-slate-400 italic bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                      No subjects available. Please add master subjects or map them to this level first.
                    </div>
                  ) : (
                    <>
                      {modalLevelSubjects.length === 0 && (
                        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg mb-2">
                          Note: Showing master subjects pool. Selected subjects will be mapped to this academic level automatically.
                        </p>
                      )}
                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white shadow-inner">
                        {candidateSubjects.map((subject: any) => {
                          const checked = bundleForm.subjectIds.includes(String(subject.id));
                          return (
                            <button
                              key={subject.id}
                              type="button"
                              onClick={() => toggleBundleSubject(String(subject.id))}
                              className={`w-full p-3 flex items-center justify-between hover:bg-slate-50 transition text-left cursor-pointer ${
                                checked ? 'bg-indigo-50/70' : ''
                              }`}
                            >
                              <div>
                                <div className={`font-bold text-sm ${checked ? 'text-indigo-900' : 'text-slate-900'}`}>
                                  {subject.name}
                                </div>
                                <div className="font-mono text-[10px] font-bold text-slate-400 uppercase">
                                  Code: {subject.code}
                                </div>
                              </div>
                              <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                                checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                              }`}>
                                {checked && (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </Modal>

      <ConfirmDeleteModal
        isOpen={Boolean(deleteSubjectTarget)}
        onClose={() => !isDeletingSubject && setDeleteSubjectTarget(null)}
        onConfirm={handleConfirmDeleteSubject}
        itemType="subject"
        itemName={deleteSubjectTarget?.name}
        description="Deleting this subject will remove it from the master catalog. This action cannot be undone."
        isLoading={isDeletingSubject}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(deleteBundleTarget)}
        onClose={() => setDeleteBundleTarget(null)}
        onConfirm={handleConfirmDeleteBundle}
        itemType="subject bundle"
        itemName={deleteBundleTarget?.name}
        description="Deleting this subject bundle will remove this predefined grouping from future batch assignments."
      />
    </div>
  );
};