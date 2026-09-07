import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { createStudent, getAcademicOptions } from '../../services/studentApi';
import type { CreateStudentPayload } from '../../services/studentApi';
import { 
  ArrowLeft, User, Shield, GraduationCap, IndianRupee, MapPin, 
  CheckCircle, Loader2, RefreshCw, Package, CheckSquare, BookOpen, 
  FileText, Check, AlertCircle 
} from 'lucide-react';

type TabId = 'personal' | 'guardian' | 'academic' | 'fees';

interface AcademicData {
  branches: Array<{ id: number; name: string }>;
  courses: Array<{ id: number; name: string }>;
  programs: Array<{ id: number; course_id: number; name: string; code?: string }>;
  levels: Array<{ id: number; course_id?: number; program_id?: number; name: string }>;
  batches: Array<{ id: number; branch_id: number; level_id: number; name: string; code: string }>;
  bundles: Array<{ id: number; branch_id: number; level_id: number; name: string; description: string; fee_amount?: number; subject_ids?: number[] }>;
  subjects?: Array<{ id: number; name: string; code: string; type?: string }>;
  levelSubjects?: Array<{ level_id: number; id: number; name: string; code: string; fee_amount?: number }>;
  academicYears: Array<{ id: number; name: string; status: string }>;
}

interface AddStudentFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  academicOptions: AcademicData | null; // from parent, used as initial data
  addToast: (msg: string, type?: 'success' | 'error') => void;
}

const EMPTY_FORM: CreateStudentPayload = {
  primary_branch_id: 0,
  full_name: '',
  mobile: '',
  email: '',
  dob: '',
  gender: 'Male',
  blood_group: 'B+',
  street: '',
  city: '',
  state: 'Maharashtra',
  pincode: '',
  category: 'General',
  school_name: '',
  current_class: 'Class 11',
  target_exam: 'JEE (Main/Adv)',
  year_of_attempt: '2028',
  batch_id: 0,
  bundle_id: 0,
  subject_selection_type: 'bundle',
  custom_subject_ids: [],
  academic_year_id: 0,
  guardian_name: '',
  guardian_mobile: '',
  guardian_relation: 'Father',
  guardian_email: '',
  gross_amount: '',
  discount_amount: '',
  downpayment_amount: '',
  installment_count: 1,
  status: 'active'
};

export const AddStudentForm: React.FC<AddStudentFormProps> = ({
  onCancel,
  onSuccess,
  academicOptions: parentOptions,
  addToast
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('personal');

  // Self-contained academic data loading (doesn't rely solely on parent)
  const [academicData, setAcademicData] = useState<AcademicData | null>(parentOptions);
  const [loadingOptions, setLoadingOptions] = useState(!parentOptions);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  // Sequential cascading selection state
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>('');
  const [selectedProgramId, setSelectedProgramId] = useState<number | ''>('');
  const [selectedLevelId, setSelectedLevelId] = useState<number | ''>('');

  const [formData, setFormData] = useState<CreateStudentPayload>(EMPTY_FORM);

  // Load academic options directly inside this form (self-sufficient)
  const loadOptions = async () => {
    try {
      setLoadingOptions(true);
      setOptionsError(null);
      const res = await getAcademicOptions();
      // getAcademicOptions returns response.data which is { status, data: { branches, courses, ... } }
      const payload = res?.data ?? res;
      if (payload && payload.branches) {
        setAcademicData(payload);
      } else {
        setOptionsError('Could not parse academic options from server');
        console.error('[AddStudentForm] Unexpected options shape:', res);
      }
    } catch (err: any) {
      setOptionsError(err?.message || 'Failed to load form options');
      console.error('[AddStudentForm] Failed to load academic options:', err);
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    // Always reload fresh data to ensure programs are current
    loadOptions();
  }, []);

  // ─── Cascading Filters ────────────────────────────────────────────────────

  /** Programs filtered by selected course */
  const filteredPrograms = useMemo(() => {
    if (!academicData?.programs || !selectedCourseId) return [];
    const courseIdNum = Number(selectedCourseId);
    const result = academicData.programs.filter(p => Number(p.course_id) === courseIdNum);
    console.log('[AddStudentForm] filteredPrograms:', { selectedCourseId: courseIdNum, total: academicData.programs.length, matched: result.length, result });
    return result;
  }, [academicData?.programs, selectedCourseId]);

  /** Levels filtered by selected program (or course if no program) */
  const filteredLevels = useMemo(() => {
    if (!academicData?.levels || !selectedCourseId) return [];
    if (selectedProgramId) {
      const byProg = academicData.levels.filter(l => Number(l.program_id) === Number(selectedProgramId));
      if (byProg.length > 0) return byProg;
    }
    return academicData.levels.filter(l => Number(l.course_id) === Number(selectedCourseId));
  }, [academicData?.levels, selectedCourseId, selectedProgramId]);

  /** Batches filtered by selected branch + level */
  const filteredBatches = useMemo(() => {
    if (!academicData?.batches || !selectedLevelId || !formData.primary_branch_id) return [];
    return academicData.batches.filter(b =>
      Number(b.branch_id) === Number(formData.primary_branch_id) &&
      Number(b.level_id) === Number(selectedLevelId)
    );
  }, [academicData?.batches, formData.primary_branch_id, selectedLevelId]);

  /** Bundles filtered by selected level (all bundles for that level) */
  const filteredBundles = useMemo(() => {
    if (!academicData?.bundles || !selectedLevelId) return [];
    return academicData.bundles.filter(b => Number(b.level_id) === Number(selectedLevelId));
  }, [academicData?.bundles, selectedLevelId]);

  /** Map of subject ID to subject object for lookup */
  const subjectMap = useMemo(() => {
    const map = new Map<number, { id: number; name: string; code: string; fee_amount?: number }>();
    (academicData?.subjects || []).forEach(s => map.set(Number(s.id), { id: s.id, name: s.name, code: s.code }));
    (academicData?.levelSubjects || []).forEach(s => map.set(Number(s.id), s));
    return map;
  }, [academicData?.subjects, academicData?.levelSubjects]);

  /** Individual subjects filtered by selected level */
  const filteredLevelSubjects = useMemo(() => {
    if (!selectedLevelId) return [];
    const directMatches = (academicData?.levelSubjects || []).filter(s => Number(s.level_id) === Number(selectedLevelId));
    if (directMatches.length > 0) return directMatches;

    // Fallback: If level_subjects is not yet mapped in level_subjects table, extract unique subjects from bundles of this level
    const levelBundles = (academicData?.bundles || []).filter(b => Number(b.level_id) === Number(selectedLevelId));
    const uniqueSubIds = Array.from(new Set(levelBundles.flatMap(b => Array.isArray(b.subject_ids) ? b.subject_ids : [])));
    if (uniqueSubIds.length > 0) {
      return uniqueSubIds
        .map(id => subjectMap.get(Number(id)))
        .filter((s): s is { id: number; name: string; code: string; fee_amount?: number } => Boolean(s))
        .map(s => ({ ...s, level_id: Number(selectedLevelId), fee_amount: s.fee_amount || 0 }));
    }

    // Secondary fallback: All active subjects for this tenant
    return (academicData?.subjects || []).map(s => ({
      level_id: Number(selectedLevelId),
      id: s.id,
      name: s.name,
      code: s.code,
      fee_amount: 0
    }));
  }, [academicData?.levelSubjects, academicData?.bundles, academicData?.subjects, selectedLevelId, subjectMap]);

  /** Auto-linked subject bundle (first bundle for selected level — used as default preview) */
  const autoBundle = useMemo(() => {
    if (!academicData?.bundles || !formData.bundle_id) return null;
    return academicData.bundles.find(b => Number(b.id) === Number(formData.bundle_id)) ?? null;
  }, [academicData?.bundles, formData.bundle_id]);

  /** Enrolled custom subjects objects */
  const selectedCustomSubjects = useMemo(() => {
    const selectedIds = formData.custom_subject_ids || [];
    return filteredLevelSubjects.filter(s => selectedIds.includes(s.id));
  }, [formData.custom_subject_ids, filteredLevelSubjects]);

  /** Auto-calculated curriculum fee based on chosen bundle OR sum of chosen custom subjects */
  const calculatedCurriculumFee = useMemo(() => {
    if (formData.subject_selection_type === 'custom') {
      return selectedCustomSubjects.reduce((sum, s) => sum + (Number(s.fee_amount) || 0), 0);
    } else {
      if (autoBundle && autoBundle.fee_amount && Number(autoBundle.fee_amount) > 0) {
        return Number(autoBundle.fee_amount);
      }
      return 0;
    }
  }, [formData.subject_selection_type, selectedCustomSubjects, autoBundle]);

  // ─── Fee Calculations ─────────────────────────────────────────────────────

  const netFee = useMemo(() => Math.max(0, (Number(formData.gross_amount) || 0) - (Number(formData.discount_amount) || 0)), [formData.gross_amount, formData.discount_amount]);
  const monthlyInstallment = useMemo(() => {
    const remaining = Math.max(0, netFee - (Number(formData.downpayment_amount) || 0));
    return Math.round(remaining / Math.max(1, Number(formData.installment_count) || 1));
  }, [netFee, formData.downpayment_amount, formData.installment_count]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const set = (field: keyof CreateStudentPayload, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleBranchChange = (val: string) => {
    setFormData(prev => ({ ...prev, primary_branch_id: val ? Number(val) : 0, batch_id: 0 }));
  };

  const handleCourseChange = (val: string) => {
    setSelectedCourseId(val ? Number(val) : '');
    setSelectedProgramId('');
    setSelectedLevelId('');
    setFormData(prev => ({ ...prev, batch_id: 0, bundle_id: 0, custom_subject_ids: [] }));
  };

  const handleProgramChange = (val: string) => {
    setSelectedProgramId(val ? Number(val) : '');
    setSelectedLevelId('');
    setFormData(prev => ({ ...prev, batch_id: 0, bundle_id: 0, custom_subject_ids: [] }));
  };

  const handleLevelChange = (val: string) => {
    const levelIdNum = val ? Number(val) : '';
    setSelectedLevelId(levelIdNum);
    setFormData(prev => ({ ...prev, batch_id: 0, bundle_id: 0, custom_subject_ids: [] }));
  };

  const handleSelectBundle = (bundle: { id: number; fee_amount?: number }) => {
    setFormData(prev => ({
      ...prev,
      bundle_id: bundle.id,
      gross_amount: bundle.fee_amount && Number(bundle.fee_amount) > 0 ? Number(bundle.fee_amount) : prev.gross_amount
    }));
  };

  const handleCustomSubjectToggle = (subjectId: number) => {
    setFormData(prev => {
      const current = prev.custom_subject_ids || [];
      const updated = current.includes(subjectId)
        ? current.filter(id => id !== subjectId)
        : [...current, subjectId];
      
      // Calculate total fees for selected custom subjects
      const customSum = filteredLevelSubjects
        .filter(s => updated.includes(s.id))
        .reduce((sum, s) => sum + (Number(s.fee_amount) || 0), 0);

      return {
        ...prev,
        custom_subject_ids: updated,
        gross_amount: customSum > 0 ? customSum : prev.gross_amount
      };
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!formData.full_name.trim()) { addToast('Student Full Name is required', 'error'); setActiveTab('personal'); return; }
    if (!formData.primary_branch_id) { addToast('Please select an Institute Branch (Tab 3)', 'error'); setActiveTab('academic'); return; }
    if (!formData.academic_year_id) { addToast('Please select an Academic Year (Tab 3)', 'error'); setActiveTab('academic'); return; }
    if (!selectedCourseId) { addToast('Please select a Course (Tab 3)', 'error'); setActiveTab('academic'); return; }
    if (!selectedLevelId) { addToast('Please select a Level (Tab 3)', 'error'); setActiveTab('academic'); return; }
    if (!formData.batch_id) { addToast('Please select a Batch (Tab 3)', 'error'); setActiveTab('academic'); return; }

    try {
      setSubmitting(true);
      const sanitizedPayload: CreateStudentPayload = {
        ...formData,
        gross_amount: Number(formData.gross_amount) || 0,
        discount_amount: Number(formData.discount_amount) || 0,
        downpayment_amount: Number(formData.downpayment_amount) || 0,
        installment_count: Math.max(1, Number(formData.installment_count) || 1),
      };
      await createStudent(sanitizedPayload);
      addToast('Student registered successfully with fee contract!', 'success');
      onSuccess();
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to register student', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render Helpers ───────────────────────────────────────────────────────

  const tabs: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
    { id: 'personal', label: '1. Personal & Residence', icon: User },
    { id: 'guardian', label: '2. Parent Details', icon: Shield },
    { id: 'academic', label: '3. Course & Batch', icon: GraduationCap },
    { id: 'fees', label: '4. Fee Setup', icon: IndianRupee },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 w-full animate-fade-in">

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onCancel}
            className="flex items-center justify-center h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer shrink-0">
            <ArrowLeft size={22} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">Register Active Student</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete all 4 steps: Personal → Parent → Course/Batch → Fee Contract
            </p>
          </div>
        </div>
        <div className="flex gap-2.5 shrink-0">
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>Back to Roster</Button>
          <Button variant="primary" onClick={() => handleSubmit()}
            disabled={submitting || !formData.full_name.trim()}
            className="flex items-center gap-2 font-bold px-5"
            style={{ backgroundColor: '#10b981', color: 'white' }}>
            <CheckCircle size={18} />
            {submitting ? 'Registering...' : 'Register Student'}
          </Button>
        </div>
      </div>

      {/* Main Form */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-1.5 rounded-xl gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow border border-slate-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                }`}>
                <Icon size={15} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: Personal & Residence ── */}
        {activeTab === 'personal' && (
          <div className="space-y-6 animate-fade-in">
            <Card className="p-5 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Basic Identity</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                <Input label="Student Full Name *" placeholder="e.g. Aarav Sharma" value={formData.full_name} onChange={e => set('full_name', e.target.value)} />
                <Input label="Mobile Number" placeholder="e.g. 9876543210" value={formData.mobile} onChange={e => set('mobile', e.target.value)} />
                <Input label="Email Address" placeholder="e.g. aarav@gmail.com" value={formData.email} onChange={e => set('email', e.target.value)} />
                <Input label="Date of Birth" type="date" value={formData.dob} onChange={e => set('dob', e.target.value)} />
                <Select label="Gender" value={formData.gender} onChange={e => set('gender', e.target.value)} options={[
                  { value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }
                ]} />
                <Select label="Blood Group" value={formData.blood_group} onChange={e => set('blood_group', e.target.value)} options={[
                  { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' }, { value: 'B+', label: 'B+' },
                  { value: 'B-', label: 'B-' }, { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' },
                  { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' }
                ]} />
                <Select label="Category" value={formData.category} onChange={e => set('category', e.target.value)} options={[
                  { value: 'General', label: 'General' }, { value: 'OBC', label: 'OBC' },
                  { value: 'SC', label: 'SC' }, { value: 'ST', label: 'ST' }, { value: 'EWS', label: 'EWS' }
                ]} />
              </div>
            </Card>

            <Card className="p-5 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <MapPin size={14} className="text-blue-500" /> Residential Address
              </h3>
              <Input label="Street / Flat / Colony" placeholder="e.g. Flat 304, Green Acres, MG Road" value={formData.street} onChange={e => set('street', e.target.value)} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <Input label="City" placeholder="e.g. Pune" value={formData.city} onChange={e => set('city', e.target.value)} />
                <Input label="State" placeholder="e.g. Maharashtra" value={formData.state} onChange={e => set('state', e.target.value)} />
                <Input label="Pincode" placeholder="e.g. 411001" value={formData.pincode} onChange={e => set('pincode', e.target.value)} />
              </div>
            </Card>

            <Card className="p-5 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Prior Schooling & Target Exam</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <Input label="Prior School / College" placeholder="e.g. St. Xavier's High School" value={formData.school_name} onChange={e => set('school_name', e.target.value)} />
                <Select label="Current Class / Standard" value={formData.current_class} onChange={e => set('current_class', e.target.value)} options={[
                  { value: 'Class 8', label: 'Class 8' }, { value: 'Class 9', label: 'Class 9' },
                  { value: 'Class 10', label: 'Class 10' }, { value: 'Class 11', label: 'Class 11' },
                  { value: 'Class 12', label: 'Class 12' }, { value: 'Dropper', label: 'Dropper / Repeater' }
                ]} />
                <Input label="Target Entrance Exam" placeholder="e.g. JEE (Main/Adv) / NEET" value={formData.target_exam} onChange={e => set('target_exam', e.target.value)} />
              </div>
            </Card>

            <div className="flex justify-end pt-2">
              <Button type="button" variant="primary" onClick={() => setActiveTab('guardian')}>Next: Parent Details &rarr;</Button>
            </div>
          </div>
        )}

        {/* ── TAB 2: Guardian Details ── */}
        {activeTab === 'guardian' && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
              <strong>Parent Portal Account:</strong> Parent credentials are automatically generated and linked to a dedicated parent portal account for live attendance, test scores, and fee reminders.
            </div>
            <Card className="p-5 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Parent / Guardian Contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                <Input label="Guardian Full Name *" placeholder="e.g. Rajesh Sharma" value={formData.guardian_name} onChange={e => set('guardian_name', e.target.value)} />
                <Input label="Guardian Mobile *" placeholder="e.g. 9876500001" value={formData.guardian_mobile} onChange={e => set('guardian_mobile', e.target.value)} />
                <Select label="Relation to Student" value={formData.guardian_relation} onChange={e => set('guardian_relation', e.target.value)} options={[
                  { value: 'Father', label: 'Father' }, { value: 'Mother', label: 'Mother' }, { value: 'Guardian', label: 'Guardian' }
                ]} />
                <Input label="Guardian Email" placeholder="e.g. parent@example.com" value={formData.guardian_email} onChange={e => set('guardian_email', e.target.value)} />
                <Input label="Guardian Occupation" placeholder="e.g. Business / Govt Service" value={formData.guardian_occupation} onChange={e => set('guardian_occupation', e.target.value)} />
              </div>
            </Card>
            <div className="flex justify-between pt-2">
              <Button type="button" variant="secondary" onClick={() => setActiveTab('personal')}>&larr; Back</Button>
              <Button type="button" variant="primary" onClick={() => setActiveTab('academic')}>Next: Course &amp; Batch &rarr;</Button>
            </div>
          </div>
        )}

        {/* ── TAB 3: Course, Program, Level & Batch ── */}
        {activeTab === 'academic' && (
          <div className="space-y-6 animate-fade-in">

            {/* Loading State */}
            {loadingOptions && (
              <div className="flex items-center justify-center gap-3 py-10 text-slate-500">
                <Loader2 size={22} className="animate-spin text-blue-500" />
                <span className="text-sm font-medium">Loading academic options...</span>
              </div>
            )}

            {/* Error State */}
            {!loadingOptions && optionsError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-red-600" />
                  <span>{optionsError}</span>
                </div>
                <button onClick={loadOptions} className="flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:text-red-900 cursor-pointer">
                  <RefreshCw size={13} /> Retry
                </button>
              </div>
            )}

            {/* Loaded State */}
            {!loadingOptions && academicData && (
              <>
                <Card className="p-5 border border-slate-200 shadow-sm space-y-5">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                    Academic Hierarchy: Branch → Year → Course → Program → Level → Batch
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">

                    {/* Step 1: Branch */}
                    <div className="space-y-1">
                      <Select
                        label="① Institute Branch *"
                        value={formData.primary_branch_id ? String(formData.primary_branch_id) : ''}
                        onChange={e => handleBranchChange(e.target.value)}
                        options={[
                          { value: '', label: '-- Select Branch --' },
                          ...(academicData.branches || []).map(b => ({ value: String(b.id), label: b.name }))
                        ]}
                      />
                      <p className="text-[10px] text-slate-400">Select the institute branch</p>
                    </div>

                    {/* Step 2: Academic Year */}
                    <div className="space-y-1">
                      <Select
                        label="② Academic Year *"
                        value={formData.academic_year_id ? String(formData.academic_year_id) : ''}
                        disabled={!formData.primary_branch_id}
                        onChange={e => set('academic_year_id', e.target.value ? Number(e.target.value) : 0)}
                        options={[
                          { value: '', label: formData.primary_branch_id ? '-- Select Academic Year --' : '← Select Branch First' },
                          ...(academicData.academicYears || []).map(ay => ({ value: String(ay.id), label: `${ay.name} (${ay.status})` }))
                        ]}
                      />
                      <p className="text-[10px] text-slate-400">Select the admission year</p>
                    </div>

                    {/* Step 3: Course */}
                    <div className="space-y-1">
                      <Select
                        label="③ Course *"
                        value={selectedCourseId ? String(selectedCourseId) : ''}
                        disabled={!formData.academic_year_id}
                        onChange={e => handleCourseChange(e.target.value)}
                        options={[
                          { value: '', label: formData.academic_year_id ? '-- Select Course --' : '← Select Year First' },
                          ...(academicData.courses || []).map(c => ({ value: String(c.id), label: c.name }))
                        ]}
                      />
                      <p className="text-[10px] text-slate-400">
                        {academicData.courses?.length || 0} course{academicData.courses?.length !== 1 ? 's' : ''} available
                      </p>
                    </div>

                    {/* Step 4: Program */}
                    <div className="space-y-1">
                      <Select
                        label="④ Program"
                        value={selectedProgramId ? String(selectedProgramId) : ''}
                        disabled={!selectedCourseId}
                        onChange={e => handleProgramChange(e.target.value)}
                        options={[
                          {
                            value: '',
                            label: !selectedCourseId
                              ? '← Select Course First'
                              : filteredPrograms.length > 0
                                ? '-- Select Program --'
                                : 'No programs (use default)'
                          },
                          ...filteredPrograms.map(p => ({
                            value: String(p.id),
                            label: p.code ? `${p.name} [${p.code}]` : p.name
                          }))
                        ]}
                      />
                      <p className="text-[10px] text-slate-400">
                        {selectedCourseId
                          ? `${filteredPrograms.length} program${filteredPrograms.length !== 1 ? 's' : ''} for this course`
                          : 'Select course to see programs'}
                      </p>
                    </div>

                    {/* Step 5: Level */}
                    <div className="space-y-1">
                      <Select
                        label="⑤ Level / Standard *"
                        value={selectedLevelId ? String(selectedLevelId) : ''}
                        disabled={!selectedCourseId}
                        onChange={e => handleLevelChange(e.target.value)}
                        options={[
                          {
                            value: '',
                            label: !selectedCourseId
                              ? '← Select Course First'
                              : filteredLevels.length > 0
                                ? '-- Select Level --'
                                : 'No levels for this selection'
                          },
                          ...filteredLevels.map(l => ({ value: String(l.id), label: l.name }))
                        ]}
                      />
                      <p className="text-[10px] text-slate-400">
                        {selectedCourseId
                          ? `${filteredLevels.length} level${filteredLevels.length !== 1 ? 's' : ''} available`
                          : 'Select course first'}
                      </p>
                    </div>

                    {/* Step 6: Batch */}
                    <div className="space-y-1">
                      <Select
                        label="⑥ Assigned Batch *"
                        value={formData.batch_id ? String(formData.batch_id) : ''}
                        disabled={!selectedLevelId || !formData.primary_branch_id}
                        onChange={e => set('batch_id', e.target.value ? Number(e.target.value) : 0)}
                        options={[
                          {
                            value: '',
                            label: !selectedLevelId
                              ? '← Select Level First'
                              : filteredBatches.length > 0
                                ? '-- Select Batch --'
                                : 'No batches for this branch+level'
                          },
                          ...filteredBatches.map(b => ({ value: String(b.id), label: `${b.name} [${b.code}]` }))
                        ]}
                      />
                      <p className="text-[10px] text-slate-400">
                        {selectedLevelId && formData.primary_branch_id
                          ? `${filteredBatches.length} batch${filteredBatches.length !== 1 ? 'es' : ''} in this branch`
                          : 'Select level first'}
                      </p>
                    </div>

                    {/* Step 7: Subject Selection Type Dropdown */}
                    <div className="space-y-1">
                      <Select
                        label="⑦ Subject Selection Type *"
                        value={formData.subject_selection_type || 'bundle'}
                        disabled={!selectedLevelId}
                        onChange={e => {
                          const val = e.target.value as 'bundle' | 'custom';
                          if (val === 'bundle') {
                            const defaultBundle = filteredBundles[0];
                            setFormData(prev => ({
                              ...prev,
                              subject_selection_type: 'bundle',
                              custom_subject_ids: [],
                              bundle_id: defaultBundle ? defaultBundle.id : prev.bundle_id,
                              gross_amount: defaultBundle?.fee_amount && Number(defaultBundle.fee_amount) > 0
                                ? Number(defaultBundle.fee_amount)
                                : prev.gross_amount
                            }));
                          } else {
                            setFormData(prev => {
                              const customSum = filteredLevelSubjects
                                .filter(s => (prev.custom_subject_ids || []).includes(s.id))
                                .reduce((sum, s) => sum + (Number(s.fee_amount) || 0), 0);
                              return {
                                ...prev,
                                subject_selection_type: 'custom',
                                bundle_id: 0,
                                gross_amount: customSum > 0 ? customSum : prev.gross_amount
                              };
                            });
                          }
                        }}
                        options={[
                          { value: 'bundle', label: 'Predefined Bundle' },
                          { value: 'custom', label: 'Custom Subjects' }
                        ]}
                      />
                      <p className="text-[10px] text-slate-400">Package bundle or custom subjects</p>
                    </div>
                  </div>

                  {/* Subject Details & Tabular Picker Section */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    {!selectedLevelId ? (
                      <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 italic text-center">
                        Select a Level above to configure subject curriculum
                      </div>
                    ) : formData.subject_selection_type === 'custom' ? (
                      /* Custom Subjects Tabular View */
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Available Level Subjects *</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">Check all individual subjects this student will enroll in for this level.</p>
                          </div>
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                            {(formData.custom_subject_ids || []).length} Selected
                          </span>
                        </div>

                        {filteredLevelSubjects.length === 0 ? (
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                            <AlertCircle size={15} className="shrink-0 text-amber-600" />
                            <span>No individual subjects mapped to this level. Please configure level subjects in Subject Setup.</span>
                          </div>
                        ) : (
                          <div className="overflow-hidden border border-slate-200 rounded-xl shadow-xs">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                                <tr>
                                  <th className="py-2.5 px-3 w-12 text-center">Select</th>
                                  <th className="py-2.5 px-3">Subject Name</th>
                                  <th className="py-2.5 px-3 font-mono">Code</th>
                                  <th className="py-2.5 px-3 text-right">Individual Subject Fee</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredLevelSubjects.map(sub => {
                                  const isChecked = (formData.custom_subject_ids || []).includes(sub.id);
                                  return (
                                    <tr
                                      key={sub.id}
                                      onClick={() => handleCustomSubjectToggle(sub.id)}
                                      className={`transition-colors cursor-pointer ${
                                        isChecked ? 'bg-indigo-50/70 hover:bg-indigo-50' : 'hover:bg-slate-50/80'
                                      }`}
                                    >
                                      <td className="py-3 px-3 text-center">
                                        <div className={`w-4 h-4 rounded border mx-auto flex items-center justify-center ${
                                          isChecked ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white'
                                        }`}>
                                          {isChecked && <Check size={11} strokeWidth={3} />}
                                        </div>
                                      </td>
                                      <td className="py-3 px-3">
                                        <span className={`font-semibold text-xs ${isChecked ? 'text-indigo-950' : 'text-slate-800'}`}>
                                          {sub.name}
                                        </span>
                                      </td>
                                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                                        {sub.code}
                                      </td>
                                      <td className="py-3 px-3 text-right">
                                        <strong className={`text-xs ${isChecked ? 'text-indigo-900 font-bold' : 'text-slate-700'}`}>
                                          {sub.fee_amount && Number(sub.fee_amount) > 0
                                            ? `₹${Number(sub.fee_amount).toLocaleString('en-IN')}`
                                            : '—'}
                                        </strong>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot className="bg-slate-50/80 border-t border-slate-200 font-semibold text-xs">
                                <tr>
                                  <td colSpan={3} className="py-2.5 px-3 text-slate-600">
                                    Total for {(formData.custom_subject_ids || []).length} selected subject(s)
                                  </td>
                                  <td className="py-2.5 px-3 text-right text-indigo-950 font-bold">
                                    ₹{calculatedCurriculumFee.toLocaleString('en-IN')}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Predefined Bundles Tabular View */
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Available Subject Bundles *</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">Select the bundle this student will study for this level.</p>
                          </div>
                          {formData.bundle_id ? (
                            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                              Bundle Selected
                            </span>
                          ) : null}
                        </div>

                        {filteredBundles.length === 0 ? (
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                            <AlertCircle size={15} className="shrink-0 text-amber-600" />
                            <span>No subject bundles configured for this level. Please switch to Custom Subjects or configure bundles in Subject Setup.</span>
                          </div>
                        ) : (
                          <div className="overflow-hidden border border-slate-200 rounded-xl shadow-xs">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                                <tr>
                                  <th className="py-2.5 px-3 w-12 text-center">Select</th>
                                  <th className="py-2.5 px-3">Bundle Name &amp; Details</th>
                                  <th className="py-2.5 px-3">Included Subjects</th>
                                  <th className="py-2.5 px-3 text-right">Bundle Fee</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredBundles.map(bundle => {
                                  const isSelected = Number(formData.bundle_id) === bundle.id;
                                  const bundleSubIds = Array.isArray(bundle.subject_ids) ? bundle.subject_ids : [];
                                  const subNames = bundleSubIds
                                    .map(id => subjectMap.get(Number(id))?.name)
                                    .filter(Boolean);

                                  return (
                                    <tr
                                      key={bundle.id}
                                      onClick={() => handleSelectBundle(bundle)}
                                      className={`transition-colors cursor-pointer ${
                                        isSelected ? 'bg-blue-50/70 hover:bg-blue-50' : 'hover:bg-slate-50/80'
                                      }`}
                                    >
                                      <td className="py-3 px-3 text-center">
                                        <div className={`w-4 h-4 rounded border mx-auto flex items-center justify-center ${
                                          isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
                                        }`}>
                                          {isSelected && <Check size={11} strokeWidth={3} />}
                                        </div>
                                      </td>
                                      <td className="py-3 px-3">
                                        <div className={`font-bold text-xs ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                                          {bundle.name}
                                        </div>
                                        {bundle.description && (
                                          <div className="text-[11px] text-slate-500 mt-0.5">{bundle.description}</div>
                                        )}
                                      </td>
                                      <td className="py-3 px-3">
                                        {subNames.length > 0 ? (
                                          <div className="flex flex-wrap gap-1">
                                            {subNames.map((name, i) => (
                                              <span
                                                key={i}
                                                className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                                                  isSelected
                                                    ? 'bg-blue-100/80 text-blue-800 border-blue-200'
                                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                                }`}
                                              >
                                                {name}
                                              </span>
                                            ))}
                                          </div>
                                        ) : (
                                          <span className="text-[11px] text-slate-400 italic">All Level Subjects</span>
                                        )}
                                      </td>
                                      <td className="py-3 px-3 text-right">
                                        <strong className={`text-xs ${isSelected ? 'text-blue-900 font-bold' : 'text-slate-700'}`}>
                                          {bundle.fee_amount && Number(bundle.fee_amount) > 0
                                            ? `₹${Number(bundle.fee_amount).toLocaleString('en-IN')}`
                                            : '—'}
                                        </strong>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>

                {/* Debug panel (only in development) */}
                {import.meta.env.MODE === 'development' && (
                  <details className="text-[10px] font-mono text-slate-500 border border-dashed border-slate-200 rounded-lg p-3">
                    <summary className="cursor-pointer font-bold text-slate-400">Debug Info (dev only)</summary>
                    <div className="mt-2 space-y-0.5">
                      <div>Data loaded: courses={academicData.courses?.length}, programs={academicData.programs?.length}, levels={academicData.levels?.length}, batches={academicData.batches?.length}</div>
                      <div>Selected: branch={formData.primary_branch_id || '—'} | year={formData.academic_year_id || '—'} | course={selectedCourseId || '—'} | program={selectedProgramId || '—'} | level={selectedLevelId || '—'} | batch={formData.batch_id || '—'}</div>
                      <div>Filtered: programs={filteredPrograms.length} [{filteredPrograms.map(p=>p.name).join(', ')}] | levels={filteredLevels.length} | batches={filteredBatches.length}</div>
                    </div>
                  </details>
                )}
              </>
            )}

            <div className="flex justify-between pt-2">
              <Button type="button" variant="secondary" onClick={() => setActiveTab('guardian')}>&larr; Back</Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  if (calculatedCurriculumFee > 0 && (!formData.gross_amount || formData.gross_amount === 95000)) {
                    set('gross_amount', calculatedCurriculumFee);
                  }
                  setActiveTab('fees');
                }}
              >
                Next: Fee Setup &rarr;
              </Button>
            </div>
          </div>
        )}

        {/* ── TAB 4: Fee Contract ── */}
        {activeTab === 'fees' && (
          <div className="space-y-6 animate-fade-in">
            {/* Curriculum Fee Breakdown Card */}
            <Card className="p-5 border border-blue-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/40 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-blue-700" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Curriculum &amp; Fee Source Breakdown
                  </h3>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  formData.subject_selection_type === 'custom'
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {formData.subject_selection_type === 'custom' ? 'Custom Subjects' : 'Predefined Bundle'}
                </span>
              </div>

              {formData.subject_selection_type === 'custom' ? (
                <div className="space-y-2 text-xs">
                  {selectedCustomSubjects.length === 0 ? (
                    <p className="text-slate-400 italic">No custom subjects selected in Tab 3.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                      {selectedCustomSubjects.map(sub => (
                        <div key={sub.id} className="p-2.5 bg-white border border-indigo-100 rounded-lg flex items-center justify-between shadow-2xs">
                          <div>
                            <span className="font-semibold text-slate-800 block text-xs">{sub.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{sub.code}</span>
                          </div>
                          <span className="font-bold text-indigo-700 text-xs">
                            ₹{Number(sub.fee_amount || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-indigo-100 flex items-center justify-between">
                    <span className="text-slate-600 font-medium">
                      Sum of Selected Subjects ({selectedCustomSubjects.length} subjects):
                    </span>
                    <strong className="text-indigo-900 text-sm">
                      ₹{calculatedCurriculumFee.toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-3 bg-white border border-blue-100 rounded-xl shadow-2xs">
                    <div>
                      <span className="font-bold text-slate-900 text-sm block">
                        {autoBundle ? autoBundle.name : 'No Bundle Selected'}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        {autoBundle?.description || 'Pre-configured standard package'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Bundle Fee</span>
                      <strong className="text-blue-900 text-base">
                        ₹{Number(autoBundle?.fee_amount || 0).toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Sync Gross Fee button if mismatch */}
              {calculatedCurriculumFee > 0 && formData.gross_amount !== calculatedCurriculumFee && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-900">
                  <span>Gross fee (₹{Number(formData.gross_amount || 0).toLocaleString('en-IN')}) differs from calculated curriculum fee (₹{calculatedCurriculumFee.toLocaleString('en-IN')}).</span>
                  <button
                    type="button"
                    onClick={() => set('gross_amount', calculatedCurriculumFee)}
                    className="shrink-0 text-[11px] font-bold text-amber-800 underline hover:text-amber-950 cursor-pointer"
                  >
                    Sync to Calculated Fee
                  </button>
                </div>
              )}
            </Card>

            <Card className="p-5 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center justify-between">
                <span>Fee &amp; Installment Configuration</span>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full">Auto-Ledger</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                <Input
                  label="Gross Course Fee (₹)"
                  type="number"
                  min="0"
                  placeholder="e.g. 50000"
                  value={formData.gross_amount ?? ''}
                  onKeyDown={e => { if (e.key === '-' || e.key === 'e' || e.key === '+') e.preventDefault(); }}
                  onChange={e => {
                    const raw = e.target.value;
                    if (raw === '') {
                      set('gross_amount', '');
                    } else {
                      const val = Math.max(0, parseFloat(raw));
                      set('gross_amount', isNaN(val) ? '' : val);
                    }
                  }}
                />
                <Input
                  label="Discount / Concession (₹)"
                  type="number"
                  min="0"
                  placeholder="e.g. 5000"
                  value={formData.discount_amount ?? ''}
                  onKeyDown={e => { if (e.key === '-' || e.key === 'e' || e.key === '+') e.preventDefault(); }}
                  onChange={e => {
                    const raw = e.target.value;
                    if (raw === '') {
                      set('discount_amount', '');
                    } else {
                      const val = Math.max(0, parseFloat(raw));
                      set('discount_amount', isNaN(val) ? '' : val);
                    }
                  }}
                />
                <Input
                  label="Downpayment Collected (₹)"
                  type="number"
                  min="0"
                  placeholder="e.g. 10000"
                  value={formData.downpayment_amount ?? ''}
                  onKeyDown={e => { if (e.key === '-' || e.key === 'e' || e.key === '+') e.preventDefault(); }}
                  onChange={e => {
                    const raw = e.target.value;
                    if (raw === '') {
                      set('downpayment_amount', '');
                    } else {
                      const val = Math.max(0, parseFloat(raw));
                      set('downpayment_amount', isNaN(val) ? '' : val);
                    }
                  }}
                />
                <Select
                  label="No. of Installments"
                  value={String(formData.installment_count || '1')}
                  onChange={e => set('installment_count', Math.max(1, Number(e.target.value) || 1))}
                  options={[
                    { value: '1', label: '1 — Lump Sum' },
                    { value: '2', label: '2 Monthly' },
                    { value: '3', label: '3 Monthly' },
                    { value: '4', label: '4 Monthly' },
                    { value: '6', label: '6 Monthly' },
                    { value: '8', label: '8 Monthly' },
                    { value: '10', label: '10 Monthly' },
                    { value: '12', label: '12 Monthly' },
                  ]}
                />
              </div>

              {/* Fee Summary KPIs */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold uppercase block">Net Fee</span>
                  <strong className="text-slate-900 text-base">₹{netFee.toLocaleString('en-IN')}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold uppercase block">Downpayment</span>
                  <strong className="text-emerald-600 text-base">₹{(Number(formData.downpayment_amount) || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold uppercase block">Monthly EMI</span>
                  <strong className="text-blue-700 text-base">₹{monthlyInstallment.toLocaleString('en-IN')}/mo</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold uppercase block">Tenure</span>
                  <strong className="text-slate-700 text-base">{formData.installment_count} months</strong>
                </div>
              </div>
            </Card>

            <div className="flex justify-between pt-2">
              <Button type="button" variant="secondary" onClick={() => setActiveTab('academic')}>&larr; Back</Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => handleSubmit()}
                disabled={submitting || !formData.full_name.trim()}
                className="flex items-center gap-2 font-bold px-6"
                style={{ backgroundColor: '#10b981', color: 'white' }}>
                <CheckCircle size={18} />
                {submitting ? 'Registering...' : 'Complete & Register Student'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
