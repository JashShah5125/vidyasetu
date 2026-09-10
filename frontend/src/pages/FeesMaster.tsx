import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { BulkImportModal } from '../components/ui/BulkImportModal';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { Save, Calculator, Plus, ArrowLeft, Edit2, ShieldAlert, Download, Upload, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useFeeConfig, type ProgramFeePlan } from '../context/FeeConfigContext';
import { courseApi } from '../services/courseApi';
import { branchApi } from '../services/branchApi';
import { feeApi, type LevelSubjectFee } from '../services/feeApi';
import { bundleApi } from '../services/bundleApi';

interface CourseOption {
  id: string;
  name: string;
  code: string;
  programs: Array<{ id: string; name: string }>;
}

interface ProgramWithLevels {
  id: string;
  name: string;
  levels?: Array<{ id: string; name: string }>;
}

export const FeesMaster: React.FC = () => {
  const { addToast, currentUser, branches } = useApp();
  const isBranchAdmin = currentUser?.role === 'branch-admin';
  const isReadOnly = isBranchAdmin;
  const [activeMainTab, setActiveMainTab] = useState<'full-course' | 'custom-bundles' | 'subject-wise'>('full-course');
  const [view, setView] = useState<'list' | 'form'>('list');
  const { plans, customBundles, isLoadingFees, refreshFees } = useFeeConfig();

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [deletePlanTarget, setDeletePlanTarget] = useState<ProgramFeePlan | null>(null);

  useEffect(() => {
    refreshFees();
  }, [isBranchAdmin, currentUser?.branch, refreshFees]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (isBranchAdmin) {
          const authorizedBranchObj = (branches || []).find((b: any) =>
            b.name === currentUser?.branch || String(b.id) === String(currentUser?.branch)
          );
          const authorizedBranchId = authorizedBranchObj ? (authorizedBranchObj.id || 1) : (currentUser?.branch || 1);
          const res = await branchApi.getCourses(authorizedBranchId, { assignment_status: 'assigned' });
          if (!mounted) return;
          const mapped = (res.data || []).map((c: any) => ({
            id: String(c.id),
            name: c.name,
            code: c.code,
            programs: (c.assigned_programs && c.assigned_programs.length > 0
              ? c.assigned_programs
              : (c.programs || []).filter((p: any) => p.is_assigned !== false && p.assigned !== false)
            ).map((p: any) => ({
              id: String(p.id),
              name: p.name
            }))
          }));
          setCourses(mapped);
        } else {
          const res = await courseApi.list({ limit: 200 });
          if (!mounted) return;
          const mapped = (res.data || []).map((c: any) => ({
            id: String(c.id),
            name: c.name,
            code: c.code,
            programs: (c.programs || []).map((p: any) => ({ id: String(p.id), name: p.name }))
          }));
          setCourses(mapped);
        }
      } catch (err) {
        if (mounted) addToast('Failed to load courses', 'error');
      } finally {
        if (mounted) setIsLoadingCourses(false);
      }
    })();
    return () => { mounted = false; };
  }, [isBranchAdmin, branches, currentUser]);

  const [successMsg, setSuccessMsg] = useState('');

  // ─── Full Course (Program-wise) Fees State ────────────────────────────────
  const [selectedCourseCode, setSelectedCourseCode] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [totalFees, setTotalFees] = useState<number | ''>('');
  const [downPayment, setDownPayment] = useState<number | ''>('');
  const [months, setMonths] = useState<number | ''>('');
  const [editingPlan, setEditingPlan] = useState<ProgramFeePlan | null>(null);

  const selectedCourse = useMemo(
    () => courses.find(c => c.code === selectedCourseCode),
    [courses, selectedCourseCode]
  );

  const availablePrograms = useMemo(
    () => selectedCourse?.programs || [],
    [selectedCourse]
  );

  const handleCourseChange = (val: string) => {
    setSelectedCourseCode(val);
    setSelectedProgramId('');
  };

  const balance = (Number(totalFees) || 0) - (Number(downPayment) || 0);
  const monthlyInstallment = (Number(months) || 0) > 0 ? balance / (Number(months) as number) : 0;

  const handleEditPlan = (plan: ProgramFeePlan) => {
    setEditingPlan(plan);
    setSelectedCourseCode(plan.course_code);
    setSelectedProgramId(plan.id);
    setTotalFees(plan.totalFees || 0);
    setDownPayment(plan.downPayment || 0);
    setMonths(plan.months || 0);
    setView('form');
  };

  const resetPlanForm = () => {
    setEditingPlan(null);
    setSelectedCourseCode('');
    setSelectedProgramId('');
    setTotalFees('');
    setDownPayment('');
    setMonths('');
  };

  const handleSave = async () => {
    if (!selectedCourseCode || !selectedProgramId || totalFees === '' || downPayment === '' || months === '') {
      addToast("Please fill in all fields before saving.", "error");
      return;
    }

    try {
      await feeApi.upsertProgramFeePlan(selectedProgramId, {
        totalFee: Number(totalFees),
        downPayment: Number(downPayment),
        months: Number(months)
      });
      await refreshFees();
      setSuccessMsg(editingPlan ? 'Fee Configuration Updated Successfully!' : 'Fee Configuration Saved Successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
      resetPlanForm();
      setView('list');
    } catch (err) {
      addToast('Failed to save fee configuration', 'error');
    }
  };

  const handleConfirmDeletePlan = async () => {
    if (!deletePlanTarget) return;
    try {
      await feeApi.deleteProgramFeePlan(deletePlanTarget.id);
      await refreshFees();
      addToast(`Fee configuration for "${deletePlanTarget.name}" removed successfully.`, 'success');
      setDeletePlanTarget(null);
    } catch (err) {
      addToast('Failed to remove fee configuration', 'error');
    }
  };

  // ─── Bundle-wise Fees State ────────────────────────────────────────────────
  const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<any>(null);
  const [bundleForm, setBundleForm] = useState({ fee: '' });

  const handleOpenBundleModal = (bundle?: any) => {
    if (bundle) {
      setEditingBundle(bundle);
      setBundleForm({ fee: bundle.fee?.toString() || '0' });
    } else {
      setEditingBundle(null);
      setBundleForm({ fee: '' });
    }
    setIsBundleModalOpen(true);
  };

  const handleSaveBundle = async () => {
    if (!editingBundle || !bundleForm.fee) {
      addToast("Please enter a fee amount.", "error");
      return;
    }
    try {
      await bundleApi.update(editingBundle.id, { feeAmount: Number(bundleForm.fee) });
      await refreshFees();
      setIsBundleModalOpen(false);
      setSuccessMsg('Bundle fee updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      addToast('Failed to update bundle fee', 'error');
    }
  };

  // ─── Subject-wise Fees State ───────────────────────────────────────────────
  const [subjectFilterCourse, setSubjectFilterCourse] = useState('');
  const [subjectFilterProgram, setSubjectFilterProgram] = useState('');
  const [subjectFilterLevel, setSubjectFilterLevel] = useState('');

  const [subjectPrograms, setSubjectPrograms] = useState<ProgramWithLevels[]>([]);
  const [subjectLevels, setSubjectLevels] = useState<Array<{ id: string; name: string }>>([]);
  const [subjectFees, setSubjectFees] = useState<LevelSubjectFee[]>([]);
  const [isLoadingSubjectFees, setIsLoadingSubjectFees] = useState(false);

  const handleSubjectCourseChange = async (courseCode: string) => {
    setSubjectFilterCourse(courseCode);
    setSubjectFilterProgram('');
    setSubjectFilterLevel('');
    setSubjectLevels([]);
    setSubjectFees([]);
    if (!courseCode) {
      setSubjectPrograms([]);
      return;
    }
    try {
      const res = await courseApi.getByCode(courseCode);
      const courseData = res.data || res;
      let programsList = courseData.programs || [];
      if (isBranchAdmin) {
        const matchingCourse = courses.find(c => c.code === courseCode);
        const assignedProgramIds = new Set((matchingCourse?.programs || []).map(p => String(p.id)));
        programsList = programsList.filter((p: any) => assignedProgramIds.has(String(p.id)));
      }
      const programs = programsList.map((p: any) => ({
        id: String(p.id),
        name: p.name,
        levels: (p.levels || []).map((l: any) => ({ id: String(l.id), name: l.name }))
      }));
      setSubjectPrograms(programs);
    } catch (err) {
      addToast('Failed to load course programs', 'error');
      setSubjectPrograms([]);
    }
  };

  const handleSubjectProgramChange = (programId: string) => {
    setSubjectFilterProgram(programId);
    setSubjectFilterLevel('');
    setSubjectFees([]);
    const program = subjectPrograms.find(p => p.id === programId);
    setSubjectLevels(program?.levels || []);
  };

  const loadSubjectFees = async (levelId: string) => {
    setIsLoadingSubjectFees(true);
    try {
      const res = await feeApi.listLevelSubjectFees(levelId);
      setSubjectFees(res.data || []);
    } catch (err) {
      addToast('Failed to load subject fees', 'error');
      setSubjectFees([]);
    } finally {
      setIsLoadingSubjectFees(false);
    }
  };

  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<LevelSubjectFee | null>(null);
  const [subjectForm, setSubjectForm] = useState({ fee: '' });

  const handleOpenSubjectModal = (subject: LevelSubjectFee) => {
    setEditingSubject(subject);
    setSubjectForm({ fee: subject.fee?.toString() || '0' });
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = async () => {
    if (!editingSubject || !subjectForm.fee) {
      addToast("Please enter a fee amount.", "error");
      return;
    }
    try {
      await feeApi.upsertSubjectFee({
        levelId: subjectFilterLevel,
        subjectId: editingSubject.id,
        feeAmount: Number(subjectForm.fee)
      });
      await loadSubjectFees(subjectFilterLevel);
      setIsSubjectModalOpen(false);
      setSuccessMsg('Subject fee updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      addToast('Failed to update subject fee', 'error');
    }
  };

  // ─── Pagination & Export State ──────────────────────────────────────────────
  const ITEMS_PER_PAGE = 5;
  const [fullCoursePage, setFullCoursePage] = useState(1);
  const [bundlesPage, setBundlesPage] = useState(1);
  const [subjectsPage, setSubjectsPage] = useState(1);

  useEffect(() => {
    setSubjectsPage(1);
  }, [subjectFilterCourse, subjectFilterProgram, subjectFilterLevel]);

  const displayedPlans = useMemo(() => {
    if (!isBranchAdmin) return plans;
    const assignedProgramIds = new Set<string>();
    courses.forEach(c => {
      (c.programs || []).forEach((p: any) => {
        assignedProgramIds.add(String(p.id));
      });
    });
    return plans.filter(p => assignedProgramIds.has(String(p.id)));
  }, [plans, isBranchAdmin, courses]);

  const paginatedPlans = useMemo(() => {
    const startIndex = (fullCoursePage - 1) * ITEMS_PER_PAGE;
    return displayedPlans.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [displayedPlans, fullCoursePage]);

  const displayedBundles = useMemo(() => {
    if (!isBranchAdmin) return customBundles;
    const assignedCourseNames = new Set(courses.map(c => c.name));
    const assignedProgramNames = new Set<string>();
    courses.forEach(c => {
      (c.programs || []).forEach((p: any) => {
        assignedProgramNames.add(p.name);
      });
    });
    return customBundles.filter(b => {
      if (b.courseName && !assignedCourseNames.has(b.courseName)) return false;
      if (b.programDetails && !assignedProgramNames.has(b.programDetails)) return false;
      return true;
    });
  }, [customBundles, isBranchAdmin, courses]);

  const paginatedBundles = useMemo(() => {
    const startIndex = (bundlesPage - 1) * ITEMS_PER_PAGE;
    return displayedBundles.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [displayedBundles, bundlesPage]);

  const paginatedSubjects = useMemo(() => {
    const startIndex = (subjectsPage - 1) * ITEMS_PER_PAGE;
    return subjectFees.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [subjectFees, subjectsPage]);

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = '';

    if (activeMainTab === 'full-course') {
      headers = ['Course', 'Program', 'Total Fees (INR)', 'Down Payment (INR)', 'Months', 'Installment (INR/mo)'];
      rows = displayedPlans.map(p => [
        p.course_name,
        p.name,
        p.totalFees,
        p.downPayment,
        p.months,
        p.installment
      ]);
      filename = 'program_wise_fees.csv';
    } else if (activeMainTab === 'custom-bundles') {
      headers = ['Bundle Name', 'Branch', 'Level', 'Fee Amount (INR)'];
      rows = displayedBundles.map(b => [
        b.name,
        b.branchName || '-',
        b.levelDetails || '-',
        b.fee
      ]);
      filename = 'bundle_wise_fees.csv';
    } else if (activeMainTab === 'subject-wise') {
      if (subjectFees.length === 0) {
        addToast('No subject-wise details available to export. Please select a level first.', 'info');
        return;
      }
      headers = ['Subject Name', 'Subject Code', 'Type', 'Fee Amount (INR)'];
      rows = subjectFees.map(s => [s.name, s.code, s.type, s.fee]);
      filename = `subject_wise_fees_level_${subjectFilterLevel}.csv`;
    }

    if (rows.length === 0) return;

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in">
      {isReadOnly && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm font-semibold text-blue-800 shadow-sm flex items-center gap-2">
          <ShieldAlert size={16} className="text-blue-600" /> Read-Only View: Displaying fee structures and bundles assigned to your branch.
        </div>
      )}
      <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Fees Master</h2>
              <p className="text-sm text-slate-500 mt-1">
                {isBranchAdmin
                  ? 'View program-wise, bundle-wise and subject-wise fee structures assigned to your branch.'
                  : 'Configure program-wise, bundle-wise and subject-wise fee structures.'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {view === 'list' && (activeMainTab !== 'subject-wise' || subjectFees.length > 0) && (
                <div className="flex gap-2">
                  {activeMainTab === 'full-course' && !isReadOnly && (
                    <Button variant="secondary" onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-1.5 font-bold">
                      <Upload size={14} /> Bulk Import
                    </Button>
                  )}
                  <Button variant="secondary" onClick={handleExportCSV} className="flex items-center gap-2 cursor-pointer">
                    <Download size={16} /> Export CSV
                  </Button>
                </div>
              )}
              {activeMainTab === 'full-course' && view === 'list' && !isReadOnly && (
                <Button variant="primary" onClick={() => { resetPlanForm(); setView('form'); }} className="flex items-center gap-2 cursor-pointer" style={{ backgroundColor: '#2563eb', color: 'white' }}>
                  <Plus size={16} /> Configure New Plan
                </Button>
              )}
              {activeMainTab === 'full-course' && view === 'form' && (
                <Button variant="secondary" onClick={() => setView('list')} className="flex items-center gap-2 cursor-pointer">
                  <ArrowLeft size={16} /> Back to List
                </Button>
              )}
            </div>
          </div>

          <div className="border-b border-slate-200">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveMainTab('full-course')}
                className={`pb-4 text-sm font-semibold border-b-2 transition-colors ${activeMainTab === 'full-course' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                Full Course Fees
              </button>
              <button
                onClick={() => setActiveMainTab('custom-bundles')}
                className={`pb-4 text-sm font-semibold border-b-2 transition-colors ${activeMainTab === 'custom-bundles' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                Bundle-wise Fees
              </button>
              <button
                onClick={() => setActiveMainTab('subject-wise')}
                className={`pb-4 text-sm font-semibold border-b-2 transition-colors ${activeMainTab === 'subject-wise' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                Subject-wise Fees
              </button>
            </div>
          </div>

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              {successMsg}
              <button onClick={() => setSuccessMsg('')} className="hover:text-emerald-900">&times;</button>
            </div>
          )}

          {activeMainTab === 'full-course' && (
            <>
              {view === 'list' && (
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Course</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Program</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Total Fees</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Down Payment</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Installments</th>
                          {!isReadOnly && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {isLoadingFees || isLoadingCourses ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">Loading fee structures...</td>
                          </tr>
                        ) : paginatedPlans.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">No programs configured yet.</td>
                          </tr>
                        ) : (
                          paginatedPlans.map((plan) => (
                            <tr key={plan.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-semibold text-slate-800">{plan.course_name || '-'}</td>
                              <td className="px-6 py-4 text-slate-600">{plan.name}</td>
                              <td className="px-6 py-4 text-right font-semibold text-slate-800">₹{plan.totalFees.toLocaleString()}</td>
                              <td className="px-6 py-4 text-right text-emerald-600 font-medium">₹{plan.downPayment.toLocaleString()}</td>
                              <td className="px-6 py-4 text-right">
                                <div className="font-semibold text-blue-600">{plan.months} months</div>
                                <div className="text-xs text-slate-500">@ ₹{plan.installment.toLocaleString(undefined, { maximumFractionDigits: 2 })}/mo</div>
                              </td>
                              {!isReadOnly && (
                                <td className="px-6 py-4 text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" size="sm" onClick={() => handleEditPlan(plan)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200">
                                      <Edit2 size={14} />
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setDeletePlanTarget(plan)} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                                      <Trash2 size={14} />
                                    </Button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {displayedPlans.length > ITEMS_PER_PAGE && (
                    <Pagination
                      currentPage={fullCoursePage}
                      totalPages={Math.ceil(displayedPlans.length / ITEMS_PER_PAGE)}
                      totalItems={displayedPlans.length}
                      pageSize={ITEMS_PER_PAGE}
                      onPageChange={setFullCoursePage}
                    />
                  )}
                </Card>
              )}

              {view === 'form' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg font-bold text-slate-800">1. Program Selection</CardTitle>
                      </CardHeader>
                      <div className="p-6 pt-0 space-y-4">
                        <Select
                          label="Select Course"
                          value={selectedCourseCode}
                          onChange={(e) => handleCourseChange(e.target.value)}
                          options={[
                            { value: '', label: 'Choose a course...' },
                            ...courses.map(c => ({ value: c.code, label: `${c.name} (${c.code})` }))
                          ]}
                          disabled={isLoadingCourses}
                        />

                        <Select
                          label="Select Program"
                          value={selectedProgramId}
                          onChange={(e) => setSelectedProgramId(e.target.value)}
                          disabled={!selectedCourseCode}
                          options={[
                            { value: '', label: 'Choose a program...' },
                            ...availablePrograms.map(p => ({ value: p.id, label: p.name }))
                          ]}
                        />
                      </div>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg font-bold text-slate-800">2. Fee Configuration</CardTitle>
                      </CardHeader>
                      <div className="p-6 pt-0 space-y-4">
                        <Input
                          label="Total Program Fees (₹)"
                          type="number"
                          placeholder="e.g. 150000"
                          value={totalFees}
                          onChange={(e) => setTotalFees(e.target.value ? Number(e.target.value) : '')}
                        />
                        <Input
                          label="Down Payment / Initial Deposit (₹)"
                          type="number"
                          placeholder="e.g. 30000"
                          value={downPayment}
                          onChange={(e) => setDownPayment(e.target.value ? Number(e.target.value) : '')}
                        />
                        <Input
                          label="Installment Duration (Months)"
                          type="number"
                          placeholder="e.g. 10"
                          value={months}
                          onChange={(e) => setMonths(e.target.value ? Number(e.target.value) : '')}
                        />
                      </div>
                    </Card>
                  </div>

                  <div className="space-y-6">
                    <Card className="bg-slate-50 border-blue-100">
                      <CardHeader>
                        <CardTitle className="text-lg font-bold text-blue-800 flex items-center gap-2">
                          <Calculator size={20} />
                          Installment Projection
                        </CardTitle>
                      </CardHeader>
                      <div className="p-6 pt-0 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white p-4 rounded-lg border border-slate-200">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Remaining Balance</div>
                            <div className="text-xl font-bold text-slate-800">
                              ₹{balance > 0 ? balance.toLocaleString() : 0}
                            </div>
                          </div>
                          <div className="bg-white p-4 rounded-lg border border-slate-200">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Duration</div>
                            <div className="text-xl font-bold text-slate-800">
                              {months || 0} Months
                            </div>
                          </div>
                        </div>

                        <div className="bg-blue-600 text-white p-6 rounded-xl shadow-inner text-center">
                          <div className="text-blue-100 font-semibold uppercase tracking-wide mb-2 text-sm">Monthly Installment</div>
                          <div className="text-4xl font-bold">
                            ₹{monthlyInstallment > 0 ? monthlyInstallment.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 0}
                          </div>
                          <div className="text-blue-200 text-xs mt-2 font-medium">per month</div>
                        </div>

                        <div className="pt-4 border-t border-slate-200 flex justify-end">
                          <Button variant="primary" onClick={handleSave} className="flex items-center gap-2 w-full justify-center">
                            <Save size={16} /> Save Configuration
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </>
          )}

          {activeMainTab === 'custom-bundles' && (
            <Card>
              <div className="p-4 border-b border-slate-100 text-sm text-slate-500 flex items-center gap-2">
                {isBranchAdmin
                  ? 'Viewing custom subject bundles assigned to your branch.'
                  : 'Bundles are created and managed in Subject Setup. Use this tab to set the fee for each bundle.'}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Bundle Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Course</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Program</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Level</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Fee Amount (₹)</th>
                      {!isReadOnly && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {isLoadingFees ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">Loading bundles...</td>
                      </tr>
                    ) : paginatedBundles.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">No bundles found for this branch.</td>
                      </tr>
                    ) : (
                      paginatedBundles.map((bundle, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-800">{bundle.name}</td>
                          <td className="px-6 py-4 text-slate-600">{bundle.courseName || '-'}</td>
                          <td className="px-6 py-4 text-slate-500">{bundle.programDetails || '-'}</td>
                          <td className="px-6 py-4 text-slate-500">{bundle.levelDetails || '-'}</td>
                          <td className="px-6 py-4 text-right font-semibold text-emerald-600">
                            ₹{bundle.fee?.toLocaleString() || 0}
                          </td>
                          {!isReadOnly && (
                            <td className="px-6 py-4 text-right">
                              <Button variant="outline" size="sm" onClick={() => handleOpenBundleModal(bundle)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200">
                                <Edit2 size={14} />
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {displayedBundles.length > ITEMS_PER_PAGE && (
                <Pagination
                  currentPage={bundlesPage}
                  totalPages={Math.ceil(displayedBundles.length / ITEMS_PER_PAGE)}
                  totalItems={displayedBundles.length}
                  pageSize={ITEMS_PER_PAGE}
                  onPageChange={setBundlesPage}
                />
              )}
            </Card>
          )}

          {activeMainTab === 'subject-wise' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <Card>
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Select
                    label="Filter by Course"
                    value={subjectFilterCourse}
                    onChange={(e) => handleSubjectCourseChange(e.target.value)}
                    options={[
                      { value: '', label: 'All Courses...' },
                      ...courses.map(c => ({ value: c.code, label: c.name }))
                    ]}
                    disabled={isLoadingCourses}
                  />
                  <Select
                    label="Filter by Program"
                    value={subjectFilterProgram}
                    onChange={(e) => handleSubjectProgramChange(e.target.value)}
                    disabled={!subjectFilterCourse}
                    options={[
                      { value: '', label: 'All Programs...' },
                      ...subjectPrograms.map(p => ({ value: p.id, label: p.name }))
                    ]}
                  />
                  <Select
                    label="Filter by Level"
                    value={subjectFilterLevel}
                    onChange={(e) => {
                      const levelId = e.target.value;
                      setSubjectFilterLevel(levelId);
                      if (levelId) loadSubjectFees(levelId);
                      else setSubjectFees([]);
                    }}
                    disabled={!subjectFilterProgram}
                    options={[
                      { value: '', label: 'All Levels...' },
                      ...subjectLevels.map(l => ({ value: l.id, label: l.name }))
                    ]}
                  />
                </div>
              </Card>

              {subjectFilterCourse && subjectFilterProgram && subjectFilterLevel && (
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Subject Name</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Subject Code</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Type</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Fee Amount (₹)</th>
                          {!isReadOnly && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {isLoadingSubjectFees ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">Loading subject fees...</td>
                          </tr>
                        ) : paginatedSubjects.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">No subjects configured for this level.</td>
                          </tr>
                        ) : (
                          paginatedSubjects.map((subject, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-semibold text-slate-800">{subject.name}</td>
                              <td className="px-6 py-4 text-slate-500 font-mono text-xs">{subject.code}</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${(subject.type || '').toLowerCase() === 'core' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'}`}>
                                  {subject.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right font-semibold text-emerald-600">
                                ₹{subject.fee?.toLocaleString() || 0}
                              </td>
                              {!isReadOnly && (
                                <td className="px-6 py-4 text-right">
                                  <Button variant="outline" size="sm" onClick={() => handleOpenSubjectModal(subject)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200">
                                    <Edit2 size={14} />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {subjectFees.length > ITEMS_PER_PAGE && (
                    <Pagination
                      currentPage={subjectsPage}
                      totalPages={Math.ceil(subjectFees.length / ITEMS_PER_PAGE)}
                      totalItems={subjectFees.length}
                      pageSize={ITEMS_PER_PAGE}
                      onPageChange={setSubjectsPage}
                    />
                  )}
                </Card>
              )}

              {(!subjectFilterCourse || !subjectFilterProgram || !subjectFilterLevel) && (
                <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-xl border-dashed">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
                    <Calculator className="text-slate-400" size={24} />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-1">Select filters to view subjects</h3>
                  <p className="text-slate-500 text-sm max-w-md mx-auto">Please select a Course, Program, and Level from the filters above to view and manage subject-wise fees.</p>
                </div>
              )}
            </div>
          )}

          {/* Edit Bundle Fee Modal */}
          <Modal isOpen={isBundleModalOpen} title="Edit Bundle Fee" onClose={() => setIsBundleModalOpen(false)}>
            <div className="space-y-4 pt-2">
              {editingBundle && (
                <>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
                    <div className="text-sm text-slate-500 mb-1">Bundle</div>
                    <div className="font-semibold text-slate-900">{editingBundle.name}</div>
                    {editingBundle.levelDetails && (
                      <div className="text-xs text-slate-400 mt-1">{editingBundle.courseName} · {editingBundle.programDetails} · {editingBundle.levelDetails}</div>
                    )}
                  </div>

                  <Input
                    label="Fee Amount (₹)"
                    type="number"
                    placeholder="e.g. 110000"
                    value={bundleForm.fee}
                    onChange={(e) => setBundleForm({ ...bundleForm, fee: e.target.value })}
                  />

                  <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                    <Button variant="secondary" onClick={() => setIsBundleModalOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleSaveBundle}>Save Bundle Fee</Button>
                  </div>
                </>
              )}
            </div>
          </Modal>

          {/* Edit Subject Fee Modal */}
          <Modal isOpen={isSubjectModalOpen} title="Edit Subject Fee" onClose={() => setIsSubjectModalOpen(false)}>
            <div className="space-y-4 pt-2">
              {editingSubject && (
                <>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
                    <div className="text-sm text-slate-500 mb-1">Subject</div>
                    <div className="font-semibold text-slate-900">{editingSubject.name} <span className="font-mono text-xs text-slate-400 ml-2">({editingSubject.code})</span></div>
                  </div>

                  <Input
                    label="Fee Amount (₹)"
                    type="number"
                    placeholder="e.g. 25000"
                    value={subjectForm.fee}
                    onChange={(e) => setSubjectForm({ ...subjectForm, fee: e.target.value })}
                  />

                  <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                    <Button variant="secondary" onClick={() => setIsSubjectModalOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleSaveSubject}>Save Subject Fee</Button>
                  </div>
                </>
              )}
            </div>
          </Modal>
        </div>

      <BulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Bulk Import Program Fee Plans"
        description="Select a CSV spreadsheet to import multiple Program Fee Plans at once. Columns must match the template below exactly."
        sampleHeaders={['Course', 'Program', 'TotalFees', 'DownPayment', 'Installments']}
        sampleRows={[
          ['JEE Prep Course', '2 Year', '150000', '30000', '12'],
          ['NEET Batch Premium', '1 Year Crash Course', '80000', '15000', '6']
        ]}
        onImport={async (importedRows) => {
          let imported = 0;
          for (const [idx, row] of importedRows.entries()) {
            const courseName = (row['Course'] || '').trim();
            const programName = (row['Program'] || '').trim();
            const course = courses.find(c => c.name === courseName || c.code === courseName);
            if (!course) {
              addToast(`Row ${idx + 1}: Course "${courseName}" not found. Skipped.`, 'error');
              continue;
            }
            const program = course.programs.find((p: any) => p.name === programName);
            if (!program) {
              addToast(`Row ${idx + 1}: Program "${programName}" not found in "${course.name}". Skipped.`, 'error');
              continue;
            }
            const total = parseInt(row['TotalFees'], 10) || 120000;
            const down = parseInt(row['DownPayment'], 10) || 20000;
            const mos = parseInt(row['Installments'] || row['Months'], 10) || 10;
            try {
              await feeApi.upsertProgramFeePlan(program.id, {
                totalFee: total,
                downPayment: down,
                months: mos
              });
              imported++;
            } catch (err) {
              addToast(`Row ${idx + 1}: Failed to import "${courseName} / ${programName}".`, 'error');
            }
          }
          if (imported > 0) {
            await refreshFees();
            addToast(`${imported} program fee plan(s) imported.`, 'success');
          }
        }}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(deletePlanTarget)}
        onClose={() => setDeletePlanTarget(null)}
        onConfirm={handleConfirmDeletePlan}
        itemType="fee plan configuration"
        itemName={deletePlanTarget?.name}
        description="Removing this fee plan will affect fee calculation presets for future admissions in this program."
      />
    </div>
  );
};