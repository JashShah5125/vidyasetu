import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Toggle } from '../components/ui/Toggle';
import { BookOpen, Package, Plus, Search, Loader2, Layers, Trash2, Pencil } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Pagination } from '../components/ui/Pagination';
import { subjectApi } from '../services/subjectApi';
import type { Subject } from '../services/subjectApi';
import { bundleApi } from '../services/bundleApi';
import type { SubjectBundle } from '../services/bundleApi';
import { courseApi } from '../services/courseApi';

export const SubjectSetup: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useApp();
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
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
  const [bundleForm, setBundleForm] = useState({
    name: '',
    description: '',
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

  // Bundle search + pagination are handled server-side via bundleApi.list.
  const filteredBundles = bundles;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // ─── Bundle handlers ───────────────────────────────────────────────────────
  const openCreateBundle = () => {
    if (!selectedLevelId) {
      addToast('Please select a level first.', 'error');
      return;
    }
    setEditingBundle(null);
    setBundleForm({ name: '', description: '', is_active: true, subjectIds: [] });
    setIsBundleModalOpen(true);
  };

  const openEditBundle = (bundle: SubjectBundle) => {
    setEditingBundle(bundle);
    setBundleForm({
      name: bundle.name,
      description: bundle.description || '',
      is_active: bundle.is_active !== false,
      subjectIds: (bundle.subjects || []).map(s => String(s.id))
    });
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
    if (!courseBranchId) {
      addToast('Please assign at least one branch to this course before creating a bundle.', 'error');
      return;
    }
    if (bundleForm.subjectIds.length === 0) {
      addToast('Please select at least one subject for the bundle.', 'error');
      return;
    }

    const payload = {
      levelId: selectedLevelId,
      branchId: courseBranchId,
      name: bundleForm.name.trim(),
      description: bundleForm.description.trim(),
      is_active: bundleForm.is_active,
      subjectIds: bundleForm.subjectIds
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

  const handleDeleteBundle = async (bundle: SubjectBundle) => {
    if (!window.confirm(`Are you sure you want to delete the bundle "${bundle.name}"?`)) return;
    try {
      await bundleApi.delete(bundle.id);
      addToast('Subject bundle deleted successfully', 'success');
      fetchBundles();
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to delete subject bundle', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Master Subject Pool</h2>
          <p className="text-sm text-slate-500 mt-1">Manage the global catalog of subjects and filter by hierarchies</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'subjects' ? (
            <Button
              variant="primary"
              onClick={() => navigate('/subjects/new')}
              style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}
            >
              <Plus size={16} className="mr-2" /> Add New Subject
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={openCreateBundle}
              style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}
            >
              <Plus size={16} className="mr-2" /> Create Bundle
            </Button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => setActiveTab('subjects')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer select-none ${
            activeTab === 'subjects'
              ? 'border-blue-600 text-blue-600 bg-blue-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen size={16} /> Subjects
        </button>
        <button
          onClick={() => setActiveTab('bundles')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer select-none ${
            activeTab === 'bundles'
              ? 'border-blue-600 text-blue-600 bg-blue-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package size={16} /> Subject Bundles
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Filters</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedCourseCode('');
              setSelectedProgramId('');
              setSelectedLevelId('');
              setFilterStatus('all');
              setSearch('');
              setCurrentPage(1);
              setBundleCurrentPage(1);
              fetchBundles('', 1);
            }}
          >
            Clear Filters
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            }}
            disabled={!selectedProgramId}
          />
          <Select
            label="Status"
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
          />
        </div>
        
        <div className="relative flex flex-col gap-1.5 w-full">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            {activeTab === 'bundles' ? 'Search bundles' : 'Search subjects'}
          </label>
          <div className="relative w-full">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder={activeTab === 'bundles' ? 'Search by bundle name...' : 'Search by subject name or code...'}
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'subjects' ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-blue-600" />
              <h3 className="font-bold text-slate-800">Subjects</h3>
              <span className="ml-2 text-xs text-slate-400 font-medium">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center bg-slate-50 border-t border-slate-100">
              <Loader2 size={40} className="text-blue-400 animate-spin mb-4" />
              <h3 className="text-lg font-bold text-slate-800 mb-1">Loading subjects...</h3>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center bg-slate-50 border-t border-slate-100">
              <div className="bg-blue-50 p-4 rounded-full mb-4">
                <BookOpen size={40} className="text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">No subjects found</h3>
              <p className="text-slate-500 max-w-sm mb-6">No subjects match the selected filters.</p>
            </div>
          ) : (
            <>
              <Table headers={['Subject', 'Code', 'Type', 'Status', 'Actions']}>
                {paginated.map(subject => (
                  <tr key={subject.code} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{subject.name}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500 uppercase">{subject.code}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 capitalize">{subject.type}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${subject.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                        {subject.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => navigate(`/subjects/${subject.code}`)}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Edit
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
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-blue-600" />
              <h3 className="font-bold text-slate-800">
                Subject Bundles {selectedLevel ? `for ${selectedLevel.name}` : ''}
              </h3>
              <span className="ml-2 text-xs text-slate-400 font-medium">{bundleTotal} result{bundleTotal !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {isBundlesLoading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center bg-slate-50 border-t border-slate-100">
              <Loader2 size={40} className="text-blue-400 animate-spin mb-4" />
              <h3 className="text-lg font-bold text-slate-800 mb-1">Loading bundles...</h3>
            </div>
          ) : filteredBundles.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center bg-slate-50 border-t border-slate-100">
              <div className="bg-blue-50 p-4 rounded-full mb-4">
                <Package size={40} className="text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">No bundles yet</h3>
              <p className="text-slate-500 max-w-sm mb-6">Create a bundle of subjects that students can opt into together.</p>
              <Button
                variant="primary"
                onClick={openCreateBundle}
                style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}
              >
                <Plus size={16} className="mr-2" /> Create First Bundle
              </Button>
            </div>
          ) : (
            <>
              <Table headers={['Bundle', 'Level', 'Branch', 'Subjects', 'Status', 'Actions']}>
                {filteredBundles.map(bundle => (
                  <tr key={bundle.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 text-sm">{bundle.name}</div>
                      {bundle.description ? (
                        <p className="text-xs text-slate-500 mt-0.5 max-w-[260px]">{bundle.description}</p>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {bundle.level_name || bundle.level_id || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {bundle.branch_name || bundle.branch_id || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {(bundle.subjects || []).length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-w-[340px]">
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
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize whitespace-nowrap ${
                        bundle.is_active !== false
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {bundle.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={() => openEditBundle(bundle)}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                        >
                          <Pencil size={14} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteBundle(bundle)}
                          className="text-sm font-semibold text-red-600 hover:text-red-800 transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
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
        </div>
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
              style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}
            >
              {isBundleSaving ? 'Saving...' : editingBundle ? 'Save Changes' : 'Create Bundle'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              <Layers size={14} className="text-blue-600" /> Level
            </div>
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700">
              {selectedLevel?.name || 'No level selected'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Bundle Name *"
              value={bundleForm.name}
              placeholder="e.g. PCM, PCB, Science Combo"
              onChange={e => setBundleForm(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <div className="flex items-end pb-1">
              <Toggle
                checked={bundleForm.is_active}
                onChange={checked => setBundleForm(prev => ({ ...prev, is_active: checked }))}
                label={bundleForm.is_active ? 'Bundle Active' : 'Bundle Inactive'}
              />
            </div>
          </div>

          <Input
            label="Description"
            value={bundleForm.description}
            placeholder="Optional description (e.g. Physics, Chemistry and Mathematics combined)"
            onChange={e => setBundleForm(prev => ({ ...prev, description: e.target.value }))}
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Select Subjects from this Level ({levelSubjects.length})
              </span>
              {bundleForm.subjectIds.length > 0 && (
                <span className="text-xs font-semibold text-blue-600">{bundleForm.subjectIds.length} selected</span>
              )}
            </div>

            {levelSubjects.length === 0 ? (
              <div className="p-6 text-center text-xs font-semibold text-slate-400 italic bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                No subjects are mapped to this level yet. Map subjects to the level before creating a bundle.
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white">
                {levelSubjects.map((subject: any) => {
                  const checked = bundleForm.subjectIds.includes(String(subject.id));
                  return (
                    <button
                      key={subject.id}
                      type="button"
                      onClick={() => toggleBundleSubject(String(subject.id))}
                      className={`w-full p-3 flex items-center justify-between hover:bg-slate-50 transition text-left ${
                        checked ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <div>
                        <div className={`font-bold text-sm ${checked ? 'text-blue-800' : 'text-slate-900'}`}>{subject.name}</div>
                        <div className="font-mono text-[10px] font-bold text-slate-400 uppercase">Code: {subject.code}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                        checked ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
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
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};