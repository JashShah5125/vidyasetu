import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Pagination } from '../components/ui/Pagination';
import { Modal } from '../components/ui/Modal';
import { FeeConfigurator } from '../components/FeeConfigurator';
import courseHierarchy from '../data/courseHierarchy.json';
import {
  getEnquiries, getEnquiryById, getEnquiryFollowups,
  createEnquiry as apiCreateEnquiry,
  updateEnquiry as apiUpdateEnquiry,
  addEnquiryFollowup as apiAddFollowup,
  toLead, toFollowup, leadPatchToEnquiry, buildCreateEnquiryPayload
} from '../services/enquiryApi';
import { getAcademicOptions, getStudents, getStudentDocuments, updateStudentDocumentStatus, updateStudent, type StudentDocument, type StudentRosterItem } from '../services/studentApi';
import { recordPayment as apiRecordPayment } from '../services/paymentApi';
import {
  Plus, ArrowLeft, Users, PhoneCall, DollarSign,
  ClipboardList, Layers, CheckCircle, Clock, ChevronRight,
  Download, Search, UserCheck, FileText, Zap, X,
  Filter, ChevronDown, RotateCcw, Eye, Pencil, Edit3, Trash2, AlertTriangle,
  BookOpen, MapPin, Building, User
} from 'lucide-react';
import type { Lead, Student } from '../types';
import { studentStatusBadgeStyle, studentStatusLabelOf } from '../services/studentMaps';

interface LeadsAdmissionsProps {
  initialTab?: 'pipeline' | 'fee' | 'admission' | 'batch' | 'payment';
}

const phases = [
  { id: 'pipeline',  label: 'Lead Pipeline',          phase: 'Phase 1', icon: Users },
  { id: 'fee',         label: 'Fee Discussion',          phase: 'Phase 2', icon: DollarSign },
  { id: 'admission',   label: 'Admission & Docs',        phase: 'Phase 3', icon: ClipboardList },
  { id: 'batch',       label: 'Batch Allocation',        phase: 'Phase 4', icon: Layers },
  { id: 'payment',     label: 'Payment & Activation',   phase: 'Phase 5', icon: Zap },
] as const;

type TabId = typeof phases[number]['id'];

const StatusBadge: React.FC<{ status: string | number }> = ({ status }) => {
  const leadMap: Record<string, string> = {
    'New Enquiry':          'bg-blue-50 text-blue-700 border-blue-200',
    'Assigned':             'bg-slate-100 text-slate-700 border-slate-200',
    'Contacted':            'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Follow-up':            'bg-amber-50 text-amber-800 border-amber-200',
    'Demo Scheduled':       'bg-purple-50 text-purple-700 border-purple-200',
    'Fee Discussion':       'bg-cyan-50 text-cyan-700 border-cyan-200',
    'Interested':           'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Not Interested':       'bg-red-50 text-red-700 border-red-200',
    'Lost':                 'bg-rose-50 text-rose-700 border-rose-200',
    'Converted':            'bg-slate-100 text-slate-600 border-slate-300',
    'Cancelled':            'bg-slate-50 text-slate-500 border-slate-200'
  };

  const statusStr = typeof status === 'number' ? studentStatusLabelOf(status) : String(status);
  const classes = leadMap[statusStr] || studentStatusBadgeStyle(status);

  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border whitespace-nowrap select-none shadow-2xs ${classes}`}>
      {statusStr}
    </span>
  );
};

export const LeadsAdmissions: React.FC<LeadsAdmissionsProps> = ({ initialTab = 'pipeline' }) => {
  const {
    students, courses, batches, branches,
    allocateBatch, recordPayment,
    addToast, currentUser
  } = useApp();

  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  const [academicData, setAcademicData] = useState<{
    branches: Array<{ id: number | string; name: string }>;
    courses: Array<{ id: number | string; name: string; code?: string; fees?: number }>;
    programs: Array<{ id: number | string; course_id: number | string; name: string; code?: string }>;
    levels: Array<{ id: number | string; course_id: number | string; program_id?: number | string; name: string }>;
    bundles: Array<{ id: number | string; branch_id?: number | string; level_id: number | string; name: string; description?: string; fee_amount?: number; subject_ids?: any[] }>;
    subjects: Array<{ id: number | string; name: string; code?: string; type?: string; fee_amount?: number }>;
    levelSubjects: Array<{ level_id: number | string; course_id?: number | string; program_id?: number | string; id: number | string; name: string; code?: string; fee_amount?: number }>;
    academicYears: Array<{ id: number | string; name: string; status?: string }>;
    batches: Array<{ id: number | string; branch_id: number | string; level_id: number | string; name: string; code?: string }>;
  } | null>(null);

  // Student roster data loaded from live database (students table)
  const [apiStudents, setApiStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  const mapRosterToStudent = useCallback((r: StudentRosterItem): Student => {
    return {
      id: String(r.id),
      studentId: r.student_code || `STU-${r.id}`,
      name: r.full_name,
      mobile: r.mobile || '',
      email: r.email || '',
      parentName: r.guardian_name || '',
      parentMobile: r.guardian_mobile || '',
      parentEmail: r.guardian_email || '',
      course: (r as any).course_name || r.target_exam || '—',
      program: (r as any).program_name || '',
      level: (r as any).level_name || 'year1',
      branch: r.branch_name || '',
      batch: r.batch_name || '',
      status: r.status,
      admissionDate: r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : '',
      dob: r.dob ? new Date(r.dob).toISOString().split('T')[0] : '',
      gender: r.gender || '',
      category: r.category || 'General',
      feePlan: {
        total: Number(r.total_fees || 0),
        paid: Number(r.fees_paid || 0),
        pending: Number(r.fees_remaining ?? r.fees_outstanding ?? 0),
        installments: Number(r.installment_count || 1),
        downPayment: Number(r.down_payment || 0)
      }
    };
  }, []);

  const fetchStudents = useCallback(async () => {
    setStudentsLoading(true);
    try {
      const res = await getStudents({ limit: 500 });
      const rows: StudentRosterItem[] = res?.data || [];
      const mapped = rows.map(mapRosterToStudent);
      setApiStudents(mapped);
    } catch (err) {
      console.error('Failed to load students in LeadsAdmissions:', err);
      setApiStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  }, [mapRosterToStudent]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Document verification modal state
  const [docModalStudent, setDocModalStudent] = useState<Student | null>(null);
  const [studentDocList, setStudentDocList] = useState<StudentDocument[]>([]);
  const [docLoading, setDocLoading] = useState(false);
  const [rejectingDocId, setRejectingDocId] = useState<number | null>(null);
  const [docRejectionReason, setDocRejectionReason] = useState('');

  const handleOpenDocModal = async (student: Student) => {
    setDocModalStudent(student);
    setDocLoading(true);
    setRejectingDocId(null);
    setDocRejectionReason('');
    try {
      const docs = await getStudentDocuments(student.id || student.studentId);
      setStudentDocList(docs);
    } catch {
      setStudentDocList([]);
    } finally {
      setDocLoading(false);
    }
  };

  const handleUpdateDocStatus = async (docId: number, status: 0 | 1 | 2, reason?: string) => {
    if (!docModalStudent) return;
    try {
      const updated = await updateStudentDocumentStatus(docModalStudent.id || docModalStudent.studentId, docId, status, reason);
      setStudentDocList(updated);
      setRejectingDocId(null);
      setDocRejectionReason('');
      addToast(status === 1 ? 'Document verified successfully!' : status === 2 ? 'Document marked as rejected.' : 'Document status reset.', status === 1 ? 'success' : 'info');
      await fetchStudents();
    } catch (err: any) {
      addToast(err?.response?.data?.message || 'Failed to update document status', 'error');
    }
  };

  useEffect(() => {
    getAcademicOptions()
      .then(res => {
        const data = res?.data || res;
        if (data) setAcademicData(data);
      })
      .catch(err => console.error('Failed to load academic options in LeadsAdmissions:', err));
  }, []);

  // Tab routing sync
  const tabRouteMap: Record<TabId, string> = {
    pipeline: '/leads',
    fee: '/leads/fee',
    admission: '/leads/admission',
    batch: '/leads/batch',
    payment: '/leads/payment'
  };

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Filters State
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterSource, setFilterSource] = useState('All');
  const isBranchAdmin = currentUser?.role === 'branch-admin';
  const [filterBranch, setFilterBranch] = useState(isBranchAdmin ? currentUser.branch || 'All' : 'All');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterProgram, setFilterProgram] = useState('All');

  // Pagination State
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  // Clear filters on tab change
  useEffect(() => {
    setFilterStatus('All');
    setSearch('');
    setPage(1);
  }, [activeTab]);

  // Active filters list
  const activeFilters = useMemo(() => {
    const list: { label: string; value: string; clear: () => void }[] = [];
    if (search.trim()) {
      list.push({ label: 'Search', value: search, clear: () => setSearch('') });
    }
    if (!isBranchAdmin && filterBranch !== 'All') {
      list.push({ label: 'Branch', value: filterBranch, clear: () => setFilterBranch('All') });
    }
    if (filterCourse !== 'All') {
      list.push({ label: 'Course', value: filterCourse, clear: () => { setFilterCourse('All'); setFilterProgram('All'); } });
    }
    if (filterProgram !== 'All') {
      list.push({ label: 'Program', value: filterProgram, clear: () => setFilterProgram('All') });
    }
    if (filterStatus !== 'All') {
      list.push({ label: 'Status', value: filterStatus, clear: () => setFilterStatus('All') });
    }
    if (activeTab === 'pipeline' && filterSource !== 'All') {
      list.push({ label: 'Source', value: filterSource, clear: () => setFilterSource('All') });
    }
    return list;
  }, [search, isBranchAdmin, filterBranch, filterCourse, filterProgram, filterStatus, filterSource, activeTab]);

  const handleResetAllFilters = () => {
    setSearch('');
    setFilterStatus('All');
    setFilterSource('All');
    if (!isBranchAdmin) {
      setFilterBranch('All');
    }
    setFilterCourse('All');
    setFilterProgram('All');
    setPage(1);
  };

  // Modals / Details state
  const [showAddLead, setShowAddLead] = useState(false);
  const [showFollowup, setShowFollowup] = useState(false);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [modalTab, setModalTab] = useState<'profile' | 'course' | 'history' | 'fee'>('profile');
  const [leadFeeData, setLeadFeeData] = useState<any>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Lead Details Form State
  const [fName, setFName] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fMobile, setFMobile] = useState('');
  const [fParentName, setFParentName] = useState('');
  const [fParentMobile, setFParentMobile] = useState('');
  const [fParentEmail, setFParentEmail] = useState('');
  const [fCourse, setFCourse] = useState('');
  const [fProgram, setFProgram] = useState('');
  const [fLevel, setFLevel] = useState('year1');
  const [fAcademicYear, setFAcademicYear] = useState('2024-2025');
  const [fBranch, setFBranch] = useState('');
  const [fAssignedBranch, setFAssignedBranch] = useState('');
  const [fSource, setFSource] = useState('Walk-in');
  const [fStatus, setFStatus] = useState<Lead['status']>('New Enquiry');
  const [fCounsellor, setFCounsellor] = useState('');
  const [fRemarks, setFRemarks] = useState('');
  const [fDemoScheduledOn, setFDemoScheduledOn] = useState('');
  const [fNextFollowUp, setFNextFollowUp] = useState('');

  // Interaction Modal State
  const [showAddInteractionModal, setShowAddInteractionModal] = useState(false);
  const [interactionForm, setInteractionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Call',
    status: 'Follow-up',
    nextDate: '',
    remarks: '',
    demoScheduledOn: ''
  });

  // Add Lead Form State
  const [leadForm, setLeadForm] = useState({
    name: '',
    email: '',
    mobile: '',
    parentName: '',
    parentMobile: '',
    parentEmail: '',
    course: '',
    program: '',
    level: 'year1',
    academicYear: '2024-2025',
    source: 'Walk-in',
    remarks: '',
    branch: '',
    counsellor: ''
  });

  // Follow-up Form State
  const [followupForm, setFollowupForm] = useState({
    type: 'Call #1', outcome: '', nextDate: ''
  });

  // Batch Allocation Form State
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [batchForm, setBatchForm] = useState({
    course: '',
    program: '',
    level: 'year1',
    batch: '',
    type: 'Standard Enrollment'
  });

  const availableBatchesForStudent = useMemo(() => {
    if (!selectedStudent) return [];
    const cName = String(batchForm.course || selectedStudent.course || '').toLowerCase().trim();
    const pName = String(batchForm.program || selectedStudent.program || '').toLowerCase().trim();
    const lName = String(batchForm.level || selectedStudent.level || '').toLowerCase().trim();
    const bBranch = String(selectedStudent.branch || '').toLowerCase().trim();

    // 1. Prioritize live academicData batches from the database
    if (academicData?.batches && academicData.batches.length > 0) {
      const liveBatches = academicData.batches;
      const courseObj = academicData.courses?.find((c: any) => 
        c.name.toLowerCase() === cName || c.name.toLowerCase().includes(cName) || (cName && cName.includes(c.name.toLowerCase()))
      );
      const branchObj = academicData.branches?.find((b: any) => b.name.toLowerCase() === bBranch);

      // Filter by branch and course if possible
      let matched = liveBatches.filter((b: any) => {
        if (branchObj && b.branch_id && Number(b.branch_id) !== Number(branchObj.id)) return false;
        if (courseObj) {
          const levelObj = academicData.levels?.find((l: any) => Number(l.id) === Number(b.level_id));
          if (levelObj && levelObj.course_id && Number(levelObj.course_id) !== Number(courseObj.id)) return false;
        }
        return true;
      });

      if (matched.length > 0) {
        return matched.map((b: any) => b.name || b.code);
      }

      // If no course match for this branch, return all batches for this branch
      if (branchObj) {
        const branchBatches = liveBatches.filter((b: any) => Number(b.branch_id) === Number(branchObj.id));
        if (branchBatches.length > 0) {
          return branchBatches.map((b: any) => b.name || b.code);
        }
      }

      // Otherwise return all live batches for the institute
      return liveBatches.map((b: any) => b.name || b.code);
    }

    // 2. Fallback to mock courseHierarchy / context
    const courseData = (courseHierarchy as any[]).find(
      c => c.courseName?.toLowerCase() === cName
    );
    const progData = courseData?.programs?.find(
      (p: any) => p.programName?.toLowerCase() === pName
    );
    const lvlData = progData?.levels?.find(
      (l: any) => (l.levelId?.toLowerCase() === lName || l.levelName?.toLowerCase() === lName)
    );

    const hierarchyBatches: string[] = lvlData?.batches || [];
    const contextBatches = batches
      .filter(b => (!cName || b.course.toLowerCase() === cName))
      .map(b => b.name);

    const combined = Array.from(new Set([...hierarchyBatches, ...contextBatches]));
    if (combined.length > 0) return combined;

    return batches.map(b => b.name);
  }, [selectedStudent, batchForm.course, batchForm.program, batchForm.level, batches, academicData]);

  // ── Lead data loaded from the backend (page-local fetch) ───────────────────
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLeadsLoading(true);
    try {
      const res = await getEnquiries({ page: 1, limit: 500 });
      const rows = res?.data || [];
      setLeads(rows.map((row: any) => toLead(row)));
    } catch {
      setLeads([]);
      addToast('Failed to load leads from server.', 'error');
    } finally {
      setLeadsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const refreshLeadById = useCallback(async (id: string) => {
    try {
      const res = await getEnquiryById(id);
      if (res?.data) {
        setLeads(prev => prev.map(l => l.id === id ? toLead(res.data) : l));
      } else {
        await fetchLeads();
      }
    } catch {
      await fetchLeads();
    }
  }, [fetchLeads]);

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    try {
      const patch = await leadPatchToEnquiry(updates);
      if (Object.keys(patch).length > 0) {
        await apiUpdateEnquiry(Number(id), patch);
      }
      await refreshLeadById(id);
    } catch {
      addToast('Failed to update lead.', 'error');
    }
  };

  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [lostReason, setLostReason] = useState('');
  const [isDeletingLead, setIsDeletingLead] = useState(false);

  const handleConfirmDeleteLead = async () => {
    if (!leadToDelete) return;
    const finalReason = lostReason.trim() || 'Dropped / Not Interested';

    try {
      setIsDeletingLead(true);
      await updateLead(leadToDelete.id, {
        status: 'Lost' as Lead['status'],
        lostReason: finalReason
      });
      addToast(`Lead "${leadToDelete.name}" marked as Lost.`, 'success');
      setLeadToDelete(null);
      setLostReason('');
      await fetchLeads();
    } catch (err: any) {
      console.error('Failed to mark lead as lost:', err);
      addToast('Failed to update lead.', 'error');
    } finally {
      setIsDeletingLead(false);
    }
  };

  const addFollowup = async (leadId: string, type: string, outcome: string, nextDate: string) => {
    try {
      await apiAddFollowup(Number(leadId), {
        notes: outcome,
        next_followup_date: nextDate || undefined
      });
      await refreshLeadById(leadId);
    } catch {
      addToast('Failed to log follow-up.', 'error');
    }
  };

  const addLead = async (
    name: string, mobile: string, parentMobile: string, course: string, program: string,
    level: string, source: string, remarks: string, assignedBranch?: string,
    preferredBranch?: string, status?: string, followups?: any[], demoScheduledOn?: string, counsellor?: string
  ) => {
    try {
      const payload = await buildCreateEnquiryPayload({
        name, mobile, parentMobile, course, program, level, source, remarks,
        branch: assignedBranch || preferredBranch || '',
        counsellor: counsellor || ''
      });
      await apiCreateEnquiry(payload);
      await fetchLeads();
    } catch {
      addToast('Failed to create lead.', 'error');
    }
  };

  const handleOpenBatchModal = (s: Student) => {
    setSelectedStudent(s);
    setBatchForm({
      course: s.course || '',
      program: s.program || '',
      level: s.level || 'year1',
      batch: s.batch || '',
      type: 'Standard Enrollment'
    });
    setShowBatchModal(true);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  useEffect(() => {
    if (showBatchModal || showLeadDetail) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [showBatchModal, showLeadDetail]);

  const [isViewOnly, setIsViewOnly] = useState(true);

  const handleOpenLeadDetail = async (
    l: Lead, 
    defaultTab: 'profile' | 'course' | 'history' | 'fee' = 'profile',
    viewOnly: boolean = true
  ) => {
    setIsViewOnly(viewOnly);
    setSelectedLead(l);
    setFName(l.name);
    setFEmail(l.email || '');
    setFMobile(l.mobile);
    setFParentName(l.parentName || '');
    setFParentMobile(l.parentMobile || '');
    setFParentEmail(l.parentEmail || '');
    setFCourse(l.feeConfig?.course || l.course);
    setFProgram(l.feeConfig?.program || l.program || '');
    setFLevel(l.feeConfig?.level || l.level || 'year1');
    setFAcademicYear(l.academicYear || '2024-2025');
    setFBranch(l.preferredBranch || l.branch || '');
    setFAssignedBranch(l.branch || '');
    setFSource(l.source);
    setFStatus(l.status);
    setFCounsellor(l.counsellor || '');
    setFRemarks(l.remarks || '');
    setFDemoScheduledOn(l.demoScheduledOn || '');
    setFNextFollowUp(l.nextFollowUp || '');
    setLeadFeeData(l.feeConfig || null);
    setModalTab(defaultTab);
    setShowLeadDetail(true);
    window.scrollTo({ top: 0, behavior: 'instant' });
    try {
      const res = await getEnquiryFollowups(l.id);
      const followups = (res?.data || []).map((row: any) => toFollowup(row));
      setSelectedLead(prev => (prev && prev.id === l.id ? { ...prev, followups } : prev));
    } catch {
      // follow-up history is non-critical
    }
  };

  const handleSaveInteraction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !interactionForm.remarks.trim()) {
      addToast('Please enter interaction remarks or outcome.', 'error');
      return;
    }

    const newFollowup = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date(interactionForm.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
      type: interactionForm.type,
      outcome: interactionForm.remarks,
      nextDate: interactionForm.nextDate ? new Date(interactionForm.nextDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : ''
    };

    const updatedFollowups = [...(selectedLead.followups || []), newFollowup];
    const finalNextFollowUp = interactionForm.nextDate || selectedLead.nextFollowUp;

    addFollowup(selectedLead.id, interactionForm.type, interactionForm.remarks, interactionForm.nextDate);

    updateLead(selectedLead.id, {
      status: interactionForm.status as Lead['status'],
      nextFollowUp: finalNextFollowUp,
      demoScheduledOn: interactionForm.status === 'Demo Scheduled' ? (interactionForm.demoScheduledOn || new Date().toISOString().split('T')[0]) : selectedLead.demoScheduledOn,
      followups: updatedFollowups
    });

    setSelectedLead({
      ...selectedLead,
      status: interactionForm.status as Lead['status'],
      nextFollowUp: finalNextFollowUp,
      demoScheduledOn: interactionForm.status === 'Demo Scheduled' ? (interactionForm.demoScheduledOn || new Date().toISOString().split('T')[0]) : selectedLead.demoScheduledOn,
      followups: updatedFollowups
    });
    setFStatus(interactionForm.status as Lead['status']);

    setShowAddInteractionModal(false);
    setInteractionForm({
      date: new Date().toISOString().split('T')[0],
      type: 'Call',
      status: interactionForm.status,
      nextDate: '',
      remarks: '',
      demoScheduledOn: ''
    });
    addToast('Interaction recorded successfully!', 'success');
  };

  useEffect(() => {
    if (location.state?.activeLeadId) {
      const targetLead = leads.find(l => l.id === location.state.activeLeadId);
      if (targetLead) {
        handleOpenLeadDetail(targetLead);
      }
    }
  }, [location.state?.activeLeadId, leads]);

  // Computed filter options from live database
  const branchFilterOptions = useMemo(() => [
    { value: 'All', label: 'All Branches' },
    ...(academicData?.branches?.map(b => ({ value: b.name, label: b.name })) || branches.map(b => ({ value: b.name, label: b.name })))
  ], [academicData, branches]);

  const courseFilterOptions = useMemo(() => [
    { value: 'All', label: 'All Courses' },
    ...(academicData?.courses?.map(c => ({ value: c.name, label: c.name })) || courses.map(c => ({ value: c.name, label: c.name })))
  ], [academicData, courses]);

  const programFilterOptions = useMemo(() => {
    const defaultOpts = [{ value: 'All', label: 'All Programs' }];
    if (filterCourse === 'All') return defaultOpts;
    if (academicData?.courses && academicData?.programs) {
      const courseObj = academicData.courses.find(c => c.name === filterCourse);
      if (courseObj) {
        const matched = academicData.programs.filter(p => Number(p.course_id) === Number(courseObj.id));
        if (matched.length > 0) {
          return [...defaultOpts, ...matched.map(p => ({ value: p.name, label: p.name }))];
        }
      }
    }
    const courseObj = courses.find(c => c.name === filterCourse);
    return [
      ...defaultOpts,
      ...(courseObj?.programs?.map(p => ({ value: p, label: p })) || [])
    ];
  }, [academicData, courses, filterCourse]);

  const academicYearOptions = useMemo(() => {
    if (academicData?.academicYears && academicData.academicYears.length > 0) {
      return academicData.academicYears.map(ay => ({ value: ay.name, label: ay.name }));
    }
    return [
      { value: '2024-2025', label: '2024-2025' },
      { value: '2025-2026', label: '2025-2026' }
    ];
  }, [academicData]);

  const getProgramsForCourse = useCallback((courseName: string) => {
    if (!courseName) return [];
    if (academicData?.courses && academicData?.programs) {
      const courseObj = academicData.courses.find(c => c.name === courseName);
      if (courseObj) {
        const matched = academicData.programs.filter(p => Number(p.course_id) === Number(courseObj.id));
        if (matched.length > 0) {
          return matched.map(p => ({ value: p.name, label: p.name }));
        }
      }
    }
    const cObj = courses.find(c => c.name === courseName);
    return (cObj?.programs || []).map(p => ({ value: p, label: p }));
  }, [academicData, courses]);

  const getLevelsForProgram = useCallback((courseName: string, programName: string) => {
    if (academicData?.levels) {
      const courseObj = academicData.courses?.find(c => c.name === courseName);
      const progObj = academicData.programs?.find(p => p.name === programName && (!courseObj || Number(p.course_id) === Number(courseObj.id)));
      
      if (progObj) {
        const matchedByProg = academicData.levels.filter(l => Number(l.program_id) === Number(progObj.id));
        if (matchedByProg.length > 0) {
          return matchedByProg.map(l => ({ value: l.name, label: l.name }));
        }
      }
      if (courseObj) {
        const matchedByCourse = academicData.levels.filter(l => Number(l.course_id) === Number(courseObj.id));
        if (matchedByCourse.length > 0) {
          return matchedByCourse.map(l => ({ value: l.name, label: l.name }));
        }
      }
      if (academicData.levels.length > 0) {
        return academicData.levels.map(l => ({ value: l.name, label: l.name }));
      }
    }
    return [
      { value: 'Year 1 / Class 11', label: 'Year 1 / Class 11' },
      { value: 'Year 2 / Class 12', label: 'Year 2 / Class 12' },
      { value: 'Class 8', label: 'Class 8' },
      { value: 'Class 9', label: 'Class 9' },
      { value: 'Class 10', label: 'Class 10' }
    ];
  }, [academicData]);

  // Filtered lists
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (filterStatus === 'All') {
        if (l.status === 'Converted' || l.status === 'Cancelled' || l.status === 'Lost' || l.status === 'Not Interested') return false;
      } else {
        if (l.status !== filterStatus) return false;
      }
      if (activeTab === 'fee' && l.status !== 'Fee Discussion') return false;
      const q = search.toLowerCase();
      const matchQ = l.name.toLowerCase().includes(q) || l.course.toLowerCase().includes(q) || l.mobile.includes(q);
      const matchSrc = filterSource === 'All' || l.source === filterSource;
      const matchBranch = currentUser?.role === 'branch-admin'
        ? l.branch === currentUser.branch
        : (filterBranch === 'All' || l.branch === filterBranch);
      const matchCourse = filterCourse === 'All' || l.course === filterCourse;
      let matchProgram = filterProgram === 'All';
      if (filterProgram !== 'All') {
        if (l.program === filterProgram) matchProgram = true;
        const courseObj = (academicData?.courses || courses).find(c => c.name === l.course);
        if (courseObj) {
          const progs = getProgramsForCourse(courseObj.name);
          if (progs.some(p => p.value === filterProgram)) matchProgram = true;
        }
      }
      return matchQ && matchSrc && matchBranch && matchCourse && matchProgram;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [leads, search, filterStatus, filterSource, filterBranch, filterCourse, filterProgram, academicData, courses, getProgramsForCourse, currentUser, activeTab]);

  const filteredStudents = useMemo(() => {
    const sourceList = apiStudents.length > 0 ? apiStudents : students;
    return sourceList.filter(s => {
      const q = search.toLowerCase().trim();
      const matchQ = !q || (
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.studentId && s.studentId.toLowerCase().includes(q)) ||
        (s.mobile && s.mobile.includes(q)) ||
        (s.course && s.course.toLowerCase().includes(q)) ||
        (s.branch && s.branch.toLowerCase().includes(q))
      );
      
      let matchSt = true;
      if (filterStatus !== 'All') {
        const sStatusStr = String(s.status);
        const fStatusStr = String(filterStatus);
        matchSt = sStatusStr === fStatusStr || 
                  studentStatusLabelOf(s.status).toLowerCase() === fStatusStr.toLowerCase() ||
                  (s.status === 'Active Student' && filterStatus === 'Active') ||
                  (s.status === 1 && filterStatus === 'Active');
      }

      const matchBranch = currentUser?.role === 'branch-admin'
        ? s.branch === currentUser.branch
        : (filterBranch === 'All' || s.branch === filterBranch);

      const matchCourse = filterCourse === 'All' || s.course === filterCourse;

      let matchProgram = filterProgram === 'All';
      if (filterProgram !== 'All') {
        if (s.program === filterProgram) matchProgram = true;
        if (s.batch) {
          const b = batches.find(x => x.name === s.batch);
          if (b && b.program === filterProgram) matchProgram = true;
        }
        const courseObj = (academicData?.courses || courses).find(c => c.name === s.course);
        if (courseObj?.programs?.includes(filterProgram)) matchProgram = true;
      }
      return matchQ && matchSt && matchBranch && matchCourse && matchProgram;
    });
  }, [apiStudents, students, search, filterStatus, filterBranch, filterCourse, filterProgram, batches, courses, academicData, currentUser]);

  // Paginated Slices
  const paginatedLeads = useMemo(() => {
    return filteredLeads.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  }, [filteredLeads, page]);

  const paginatedStudents = useMemo(() => {
    return filteredStudents.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  }, [filteredStudents, page]);

  const totalPages = useMemo(() => {
    const listLen = (activeTab === 'pipeline' || activeTab === 'fee') ? filteredLeads.length : filteredStudents.length;
    return Math.max(1, Math.ceil(listLen / PER_PAGE));
  }, [activeTab, filteredLeads.length, filteredStudents.length]);

  // Summary statistics
  const stats = useMemo(() => {
    const activeLeads = leads.filter(l => l.status !== 'Converted' && l.status !== 'Cancelled' && l.status !== 'Lost' && l.status !== 'Not Interested');
    const sourceStudents = apiStudents.length > 0 ? apiStudents : students;
    return {
      totalLeads: activeLeads.length,
      newEnquiries: activeLeads.filter(l => l.status === 'New Enquiry').length,
      followUp: activeLeads.filter(l => l.status === 'Follow-up').length,
      interested: activeLeads.filter(l => l.status === 'Interested').length,
      totalStudents: sourceStudents.length,
      pendingDocs: sourceStudents.filter(s => s.status === 0 || s.status === '0' || s.status === 'Verification Pending' || s.status === 'Draft' || s.status === 'Document Pending').length,
      pendingReview: sourceStudents.filter(s => s.status === 0 || s.status === '0' || s.status === 'Verification Pending' || s.status === 'Document Uploaded').length,
      verificationPending: sourceStudents.filter(s => s.status === 0 || s.status === '0' || s.status === 'Verification Pending').length,
      activeStudents: sourceStudents.filter(s => s.status === 1 || s.status === '1' || s.status === 'Active Student' || s.status === 'Active' || s.status === 5).length,
      feeCollected: sourceStudents.reduce((sum, s) => sum + (s.feePlan?.paid || 0), 0),
      feeOutstanding: sourceStudents.reduce((sum, s) => sum + (s.feePlan?.pending || 0), 0)
    };
  }, [leads, apiStudents, students]);

  // Save Handlers
  const handleAddLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.name?.trim()) {
      addToast('Student Full Name is required.', 'error');
      return;
    }
    const cleanMobile = leadForm.mobile?.trim().replace(/\D/g, '') || '';
    if (cleanMobile.length < 10) {
      addToast('Please enter a valid 10-digit Student Mobile number.', 'error');
      return;
    }
    if (!leadForm.email?.trim() || !leadForm.email.includes('@')) {
      addToast('Please enter a valid Student Email address.', 'error');
      return;
    }
    if (!leadForm.parentName?.trim()) {
      addToast('Parent / Guardian Name is required.', 'error');
      return;
    }
    const cleanParentMobile = leadForm.parentMobile?.trim().replace(/\D/g, '') || '';
    if (cleanParentMobile.length < 10) {
      addToast('Please enter a valid 10-digit Parent Mobile number.', 'error');
      return;
    }
    if (!leadForm.parentEmail?.trim() || !leadForm.parentEmail.includes('@')) {
      addToast('Please enter a valid Parent Email address.', 'error');
      return;
    }
    if (!leadForm.branch) {
      addToast('Branch / Center is required.', 'error');
      return;
    }
    if (!leadForm.course) {
      addToast('Interested Course is required.', 'error');
      return;
    }

    try {
      const courseObj = academicData?.courses?.find(c => c.name === leadForm.course);
      const progObj = academicData?.programs?.find(p => p.name === leadForm.program && (!courseObj || Number(p.course_id) === Number(courseObj.id)));
      const levelObj = academicData?.levels?.find(l => l.name === leadForm.level && ((progObj && Number(l.program_id) === Number(progObj.id)) || (courseObj && Number(l.course_id) === Number(courseObj.id))));
      const branchObj = academicData?.branches?.find(b => b.name === leadForm.branch);
      const yearObj = academicData?.academicYears?.find(y => y.name === leadForm.academicYear);

      const payload = await buildCreateEnquiryPayload({
        name: leadForm.name.trim(),
        email: leadForm.email.trim(),
        mobile: leadForm.mobile.trim(),
        parentName: leadForm.parentName.trim(),
        parentMobile: leadForm.parentMobile.trim(),
        parentEmail: leadForm.parentEmail.trim(),
        course: leadForm.course,
        courseId: courseObj ? Number(courseObj.id) : undefined,
        program: leadForm.program,
        programId: progObj ? Number(progObj.id) : undefined,
        level: leadForm.level,
        interestedLevelId: levelObj ? Number(levelObj.id) : undefined,
        academicYear: leadForm.academicYear,
        academicYearId: yearObj ? Number(yearObj.id) : undefined,
        source: leadForm.source,
        remarks: leadForm.remarks,
        branch: leadForm.branch,
        branchId: branchObj ? Number(branchObj.id) : undefined,
        counsellor: leadForm.counsellor
      });
      await apiCreateEnquiry(payload);
      addToast('New enquiry logged successfully!', 'success');
      setShowAddLead(false);
      setLeadForm({
        name: '',
        email: '',
        mobile: '',
        parentName: '',
        parentMobile: '',
        parentEmail: '',
        course: courses[0]?.name || '',
        program: courses[0]?.programs?.[0] || '',
        level: 'year1',
        academicYear: '2024-2025',
        source: 'Walk-in',
        remarks: '',
        branch: (currentUser?.role === 'branch-admin' ? currentUser.branch : branches[0]?.name) || '',
        counsellor: currentUser?.name || 'Admin'
      });
      await fetchLeads();
    } catch (err: any) {
      console.error('Failed to log enquiry:', err);
      const errMsg = err?.response?.data?.errors?.join?.(', ') || err?.response?.data?.message || err?.message || 'Failed to log enquiry.';
      addToast(errMsg, 'error');
    }
  };

  const handleFollowupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !followupForm.outcome) return;
    addFollowup(selectedLead.id, followupForm.type, followupForm.outcome, followupForm.nextDate);
    addToast('Follow-up activity recorded.', 'success');
    setShowFollowup(false);
    setFollowupForm({ type: 'Call #1', outcome: '', nextDate: '' });
  };

  const handleAllocateBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !batchForm.batch) return;
    try {
      const matchedBatch = academicData?.batches?.find((b: any) => b.name === batchForm.batch || b.code === batchForm.batch);
      const batchId = matchedBatch ? Number(matchedBatch.id) : undefined;
      const academicYearId = (selectedStudent as any).academic_year_id || academicData?.academicYears?.[0]?.id;

      if (batchId) {
        await updateStudent(selectedStudent.id, {
          batch_id: batchId,
          academic_year_id: academicYearId ? Number(academicYearId) : undefined
        });
      }
      allocateBatch(selectedStudent.id, batchForm.batch, batchForm.course, batchForm.program, batchForm.level);
      addToast(`Batch ${batchForm.batch} successfully assigned to ${selectedStudent.name}`, 'success');
      await fetchStudents();
      setShowBatchModal(false);
      setBatchForm({ course: '', program: '', level: 'year1', batch: '', type: 'Standard Enrollment' });
    } catch (err: any) {
      addToast(err?.response?.data?.message || 'Failed to allocate batch on server.', 'error');
    }
  };

  // CSV Export helper
  const handleExportCSV = () => {
    const list = (activeTab === 'pipeline' || activeTab === 'fee') ? filteredLeads : filteredStudents;
    if (list.length === 0) return;
    const headers = ['ID', 'Name', 'Mobile', 'Course', 'Status'];
    const rows = list.map(item => [
      (item as any).studentId || item.id,
      item.name,
      item.mobile,
      item.course || '',
      item.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `leads_report_${activeTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  VIEW / CREATE: Log New Enquiry Page (In-page view matching screenshot)
  // ─────────────────────────────────────────────────────────────────────────
  if (showAddLead) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => setShowAddLead(false)} 
              className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
              title="Return to list"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-display font-bold text-slate-900">
                  Log New Enquiry
                </h2>
                <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  New Lead Entry
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Record student enquiry information, parent details, academic preferences, and initial notes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setShowAddLead(false)} 
              className="cursor-pointer font-semibold text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-4"
            >
              Cancel
            </Button>
            <Button 
              type="button"
              variant="primary" 
              onClick={(e) => handleAddLeadSubmit(e as any)}
              className="flex items-center gap-1.5 cursor-pointer font-bold text-xs px-5 shadow-sm" 
              style={{ backgroundColor: '#2563eb', color: 'white' }}
            >
              <Plus size={15} /> Save & Log Enquiry
            </Button>
          </div>
        </div>

        {/* In-page Form Cards */}
        <form onSubmit={handleAddLeadSubmit} className="space-y-6">
          {/* Top Row: 3 Core Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Student Details */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Student Details</h3>
                  <p className="text-xs text-slate-400">Student direct contact information</p>
                </div>
              </div>
              <div className="space-y-4">
                <Input
                  label="Student Full Name *"
                  required
                  placeholder="e.g. Aarav Sharma"
                  value={leadForm.name}
                  onChange={e => setLeadForm(prev => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  label="Mobile Contact Number *"
                  required
                  placeholder="10-digit primary mobile"
                  value={leadForm.mobile}
                  onChange={e => setLeadForm(prev => ({ ...prev, mobile: e.target.value }))}
                />
                <Input
                  label="Student Email Address *"
                  required
                  type="email"
                  placeholder="aarav.sharma@example.com"
                  value={leadForm.email}
                  onChange={e => setLeadForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>

            {/* Card 2: Parent / Guardian */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Parent / Guardian</h3>
                  <p className="text-xs text-slate-400">Parent & communication contacts</p>
                </div>
              </div>
              <div className="space-y-4">
                <Input
                  label="Parent / Guardian Name *"
                  required
                  placeholder="e.g. Rajesh Sharma"
                  value={leadForm.parentName}
                  onChange={e => setLeadForm(prev => ({ ...prev, parentName: e.target.value }))}
                />
                <Input
                  label="Parent Mobile Number *"
                  required
                  placeholder="Guardian 10-digit mobile"
                  value={leadForm.parentMobile}
                  onChange={e => setLeadForm(prev => ({ ...prev, parentMobile: e.target.value }))}
                />
                <Input
                  label="Parent Email Address *"
                  required
                  type="email"
                  placeholder="rajesh.sharma@example.com"
                  value={leadForm.parentEmail}
                  onChange={e => setLeadForm(prev => ({ ...prev, parentEmail: e.target.value }))}
                />
              </div>
            </div>

            {/* Card 3: Branch & Assignment */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Branch & Allocation</h3>
                  <p className="text-xs text-slate-400">Center facility & counsellor</p>
                </div>
              </div>
              <div className="space-y-4">
                <Select
                  label="Preferred Branch / Center *"
                  value={leadForm.branch}
                  onChange={e => setLeadForm(prev => ({ ...prev, branch: e.target.value }))}
                  options={[
                    { value: '', label: 'Select Center...' },
                    ...branchFilterOptions.filter(o => o.value !== 'All')
                  ]}
                  disabled={currentUser?.role === 'branch-admin'}
                />
                <Select
                  label="Assigned Counsellor"
                  value={leadForm.counsellor}
                  onChange={e => setLeadForm(prev => ({ ...prev, counsellor: e.target.value }))}
                  options={[
                    { value: currentUser?.name || 'Admin', label: currentUser?.name || 'Current User (Admin)' },
                    { value: 'Priya Sen', label: 'Priya Sen' },
                    { value: 'Amit Verma', label: 'Amit Verma' }
                  ]}
                />
                <Select
                  label="Discovery Source"
                  value={leadForm.source}
                  onChange={e => setLeadForm(prev => ({ ...prev, source: e.target.value }))}
                  options={[
                    { value: 'Walk-in', label: 'Walk-in at Branch' },
                    { value: 'Phone Call', label: 'Phone Call' },
                    { value: 'Website', label: 'Website / Landing Page' },
                    { value: 'Social Media', label: 'Social Media' },
                    { value: 'WhatsApp', label: 'WhatsApp Enquiry' },
                    { value: 'Referral', label: 'Student Referral' },
                    { value: 'Campaign/Event', label: 'Offline Campaign / Event' },
                    { value: 'Google Ads', label: 'Google Ads' }
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Bottom Row: Academic Interest & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 4: Academic Program & Level */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Course & Academic Interest</h3>
                  <p className="text-xs text-slate-400">Target curriculum and admission year</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Select
                    label="Interested Course *"
                    value={leadForm.course}
                    onChange={e => {
                      const newCourse = e.target.value;
                      const progs = getProgramsForCourse(newCourse);
                      const firstProg = progs[0]?.value || '';
                      const lvls = getLevelsForProgram(newCourse, firstProg);
                      const firstLvl = lvls[0]?.value || '';
                      setLeadForm(prev => ({
                        ...prev,
                        course: newCourse,
                        program: firstProg,
                        level: firstLvl
                      }));
                    }}
                    options={[
                      { value: '', label: 'Select Course...' },
                      ...courseFilterOptions.filter(o => o.value !== 'All')
                    ]}
                  />
                </div>
                <Select
                  label="Program"
                  value={leadForm.program}
                  onChange={e => {
                    const newProg = e.target.value;
                    const lvls = getLevelsForProgram(leadForm.course, newProg);
                    setLeadForm(prev => ({
                      ...prev,
                      program: newProg,
                      level: lvls[0]?.value || ''
                    }));
                  }}
                  options={[
                    { value: '', label: 'Select Program' },
                    ...getProgramsForCourse(leadForm.course)
                  ]}
                />
                <Select
                  label="Level / Class"
                  value={leadForm.level}
                  onChange={e => setLeadForm(prev => ({ ...prev, level: e.target.value }))}
                  options={[
                    { value: '', label: 'Select Level' },
                    ...getLevelsForProgram(leadForm.course, leadForm.program)
                  ]}
                />
                <div className="sm:col-span-2">
                  <Select
                    label="Academic Year"
                    value={leadForm.academicYear}
                    onChange={e => setLeadForm(prev => ({ ...prev, academicYear: e.target.value }))}
                    options={academicYearOptions}
                  />
                </div>
              </div>
            </div>

            {/* Card 5: Discussion & Notes */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Discussion Remarks & Notes</h3>
                  <p className="text-xs text-slate-400">Initial requirements or counsellor notes</p>
                </div>
              </div>
              <div className="flex-1 flex flex-col">
                <textarea
                  rows={6}
                  className="w-full flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                  placeholder="Enter initial discussion notes, student requirements, follow-up preferences, or specific background details..."
                  value={leadForm.remarks}
                  onChange={e => setLeadForm(prev => ({ ...prev, remarks: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setShowAddLead(false)} 
              className="cursor-pointer px-6"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              style={{ backgroundColor: '#2563eb', color: 'white' }} 
              className="cursor-pointer font-bold flex items-center gap-1.5 px-7 shadow-sm"
            >
              <Plus size={16} /> Save & Log Enquiry
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  VIEW / EDIT: Lead Details Panel
  // ─────────────────────────────────────────────────────────────────────────
  if (showLeadDetail && selectedLead) {
    const detailTabs = [
      { id: 'profile', label: '1. Profile Details' },
      { id: 'course', label: '2. Course & Status' },
      { id: 'history', label: '3. Follow-up History' },
      { id: 'fee', label: '4. Fee & Admission' }
    ] as const;

    return (
      <div className="space-y-6 w-full animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setShowLeadDetail(false); setSelectedLead(null); }} 
              className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
              title="Return to list"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-display font-bold text-slate-900">
                  {isViewOnly ? `Lead Details: ${selectedLead.name}` : `Edit Lead: ${selectedLead.name}`}
                </h2>
                <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                  #{selectedLead.id}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {isViewOnly 
                  ? 'Read-only overview of enquiry information, academic interests, timeline, and fee structure.'
                  : 'Modify student contact information, course interest, counselor assignment, or fee configuration.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isViewOnly ? (
              <>
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setIsViewOnly(false)} 
                  className="flex items-center gap-1.5 cursor-pointer font-semibold text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-200"
                >
                  <Pencil size={14} className="text-amber-600" /> Edit Lead
                </Button>
                <Button 
                  type="button" 
                  variant="primary" 
                  onClick={() => navigate(`/leads/${selectedLead.id}/convert`, { state: { prefilledFeeData: selectedLead.feeConfig } })}
                  className="flex items-center gap-1.5 cursor-pointer font-semibold text-xs" 
                  style={{ backgroundColor: '#2563eb', color: 'white' }}
                >
                  Convert to Student <ChevronRight size={14} />
                </Button>
              </>
            ) : (
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setIsViewOnly(true)} 
                className="flex items-center gap-1.5 cursor-pointer font-semibold text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-200"
              >
                <Eye size={14} className="text-blue-600" /> Switch to View
              </Button>
            )}
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="w-full">
          <div className="flex gap-2 border-b border-slate-200 mb-6 overflow-x-auto">
            {detailTabs.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setModalTab(t.id as any)}
                className={`pb-3 px-3 font-semibold text-sm border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  modalTab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ─────────────── VIEW ONLY MODE (READ-ONLY) ─────────────── */}
          {isViewOnly ? (
            <div className="space-y-6 animate-fade-in">
              {/* TAB 1: Profile Details (View) */}
              {modalTab === 'profile' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                        <Users size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Student Details</h4>
                        <p className="text-xs text-slate-500">Student direct contact information</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Student Name</span>
                        <span className="text-sm font-semibold text-slate-900 block">{selectedLead.name}</span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mobile Contact</span>
                        <span className="text-sm font-mono font-semibold text-slate-900 block">{selectedLead.mobile || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Student Email</span>
                        <span className="text-sm font-medium text-slate-800 block">{selectedLead.email || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Lead ID</span>
                        <span className="text-sm font-mono font-semibold text-slate-600 block">#{selectedLead.id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                        <Users size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Parent / Guardian</h4>
                        <p className="text-xs text-slate-500">Parent & communication contacts</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Parent Name</span>
                        <span className="text-sm font-semibold text-slate-900 block">{selectedLead.parentName || 'Not provided'}</span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Parent Mobile</span>
                        <span className="text-sm font-mono font-semibold text-slate-900 block">{selectedLead.parentMobile || 'Not provided'}</span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Parent Email</span>
                        <span className="text-sm font-medium text-slate-800 block">{selectedLead.parentEmail || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Branch & Location</h4>
                        <p className="text-xs text-slate-500">Center facility allocation</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Preferred Branch</span>
                        <span className="text-sm font-semibold text-slate-900 block">{selectedLead.preferredBranch || selectedLead.branch || 'No preference'}</span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Assigned Managing Branch</span>
                        <span className="text-sm font-semibold text-slate-900 block">{selectedLead.branch || 'Unassigned'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Course & Status (View) */}
              {modalTab === 'course' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                        <BookOpen size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Academic Course Interest</h4>
                        <p className="text-xs text-slate-500">Selected stream, program tier, and source</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Interested Course</span>
                        <span className="text-sm font-semibold text-slate-900 block">{selectedLead.course || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Program</span>
                        <span className="text-sm font-semibold text-slate-900 block">{selectedLead.program || 'Standard Program'}</span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Level / Class</span>
                        <span className="text-sm font-semibold text-slate-900 block">{selectedLead.level || 'Year 1 / Class 11'}</span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Academic Year</span>
                        <span className="text-sm font-semibold text-slate-900 block">{selectedLead.academicYear || '2024-2025'}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Discovery Source</span>
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">{selectedLead.source}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                      <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold shrink-0">
                        <CheckCircle size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Pipeline Stage & Assignment</h4>
                        <p className="text-xs text-slate-500">Current progress, demo schedule, and counselor</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Stage Status</span>
                        <StatusBadge status={selectedLead.status} />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Assigned Counsellor</span>
                        <span className="text-sm font-semibold text-slate-900 block">{selectedLead.counsellor || 'Unassigned'}</span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Demo Scheduled On</span>
                        <span className="text-sm font-mono text-slate-700 block">{selectedLead.demoScheduledOn || 'No demo scheduled'}</span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Next Follow-up</span>
                        <span className="text-sm font-mono text-amber-700 block">{selectedLead.nextFollowUp || 'None scheduled'}</span>
                      </div>
                    </div>
                  </div>

                  {selectedLead.lostReason && (
                    <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-5 shadow-sm space-y-2 md:col-span-2">
                      <div className="flex items-center justify-between border-b border-rose-200/60 pb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={16} className="text-rose-600" />
                          <h4 className="text-sm font-bold text-rose-900">Reason for Lost / Dropped Lead</h4>
                        </div>
                        {selectedLead.lostAt && (
                          <span className="text-xs font-mono text-rose-700 font-medium">Dropped on: {selectedLead.lostAt.slice(0, 10)}</span>
                        )}
                      </div>
                      <p className="text-sm text-rose-800 leading-relaxed font-medium">{selectedLead.lostReason}</p>
                    </div>
                  )}

                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3 md:col-span-2">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                      <FileText size={16} className="text-slate-500" />
                      <h4 className="text-sm font-bold text-slate-900">Counselling Remarks & Notes</h4>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{selectedLead.remarks || 'No remarks recorded for this lead.'}</p>
                  </div>
                </div>
              )}

              {/* TAB 3: Follow-up History (View) */}
              {modalTab === 'history' && (
                <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Follow-up & Interaction History</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Timeline of past communications, calls, and meetings.</p>
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => {
                        setInteractionForm({
                          date: new Date().toISOString().split('T')[0],
                          type: 'Call',
                          status: selectedLead.status || 'Follow-up',
                          nextDate: '',
                          remarks: '',
                          demoScheduledOn: ''
                        });
                        setShowAddInteractionModal(true);
                      }}
                      className="cursor-pointer font-semibold text-xs flex items-center gap-1.5"
                      style={{ backgroundColor: '#2563eb', color: 'white' }}
                    >
                      <Plus size={14} /> Add Interaction
                    </Button>
                  </div>

                  {selectedLead.followups && selectedLead.followups.length > 0 ? (
                    <div className="space-y-3 pt-2">
                      {selectedLead.followups.map((fu, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row gap-3 text-sm bg-slate-50/50 p-4 border border-slate-200 rounded-xl shadow-xs">
                          <div className="w-24 shrink-0 font-mono text-xs font-semibold text-slate-500 pt-0.5">{fu.date}</div>
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">{fu.type}</span>
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded">{(fu as any).counsellor || selectedLead.counsellor}</span>
                              {fu.nextDate && (
                                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 ml-auto">
                                  Next Action: {fu.nextDate}
                                </span>
                              )}
                            </div>
                            <p className="text-slate-600 text-xs leading-relaxed">{fu.outcome}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400 italic py-8 text-center bg-slate-50 border border-slate-200 rounded-xl">
                      No follow-ups recorded yet. Click &quot;Add Interaction&quot; above to log a call or meeting.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: Fee & Admission (View) */}
              {modalTab === 'fee' && (
                <div className="space-y-6 animate-fade-in pb-8">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                          <DollarSign size={20} />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-slate-900">Pre-Registration Fee Structure</h4>
                          <p className="text-xs text-slate-500">Agreed commercial terms, concession, downpayment, and payment installments</p>
                        </div>
                      </div>
                      <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={() => setIsViewOnly(false)}
                        className="cursor-pointer text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Pencil size={14} className="text-amber-600" /> Modify Fee Structure
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-center">
                        <span className="text-xs text-slate-500 font-semibold block mb-1">Standard Gross Fee</span>
                        <span className="text-xl font-bold text-slate-900">₹{(selectedLead.feeConfig?.totalFee || 0).toLocaleString()}</span>
                      </div>
                      <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 text-center">
                        <span className="text-xs text-amber-700 font-semibold block mb-1">Concession / Discount</span>
                        <span className="text-xl font-bold text-amber-800">₹{(selectedLead.feeConfig?.discount || 0).toLocaleString()}</span>
                      </div>
                      <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 text-center">
                        <span className="text-xs text-emerald-700 font-semibold block mb-1">Net Agreed Fee</span>
                        <span className="text-xl font-bold text-emerald-700">₹{(selectedLead.feeConfig?.netFee || 0).toLocaleString()}</span>
                      </div>
                      <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 text-center">
                        <span className="text-xs text-blue-700 font-semibold block mb-1">Downpayment</span>
                        <span className="text-xl font-bold text-blue-700">₹{(selectedLead.feeConfig?.downpayment || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Academic Package</span>
                        <div className="text-sm font-semibold text-slate-800">{selectedLead.feeConfig?.course || selectedLead.course || '—'}</div>
                        <div className="text-xs text-slate-500">{selectedLead.feeConfig?.program || selectedLead.program || 'Standard Program'} • {selectedLead.feeConfig?.level || selectedLead.level || 'Year 1 / Class 11'}</div>
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Installment Terms</span>
                        <div className="text-sm font-semibold text-slate-800">{selectedLead.feeConfig?.installments || 1} Monthly Installment(s)</div>
                        <div className="text-xs text-slate-500">₹{(selectedLead.feeConfig?.installmentAmount || 0).toLocaleString()} / month after downpayment</div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                      <Button 
                        type="button" 
                        variant="primary" 
                        onClick={() => navigate(`/leads/${selectedLead.id}/convert`, { state: { prefilledFeeData: selectedLead.feeConfig } })}
                        style={{ backgroundColor: '#10b981', color: 'white', padding: '0.65rem 1.5rem', fontSize: '0.9rem' }}
                        className="cursor-pointer"
                      >
                        Convert to Registered Student <ChevronRight size={18} className="ml-1.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ─────────────── EDIT MODE (FORM CONTROLS) ─────────────── */
            <form onSubmit={e => {
              e.preventDefault();
              updateLead(selectedLead.id, {
                name: fName,
                email: fEmail,
                mobile: fMobile,
                parentName: fParentName,
                parentMobile: fParentMobile,
                parentEmail: fParentEmail,
                course: fCourse,
                program: fProgram,
                level: fLevel,
                academicYear: fAcademicYear,
                preferredBranch: fBranch,
                branch: fAssignedBranch,
                source: fSource,
                counsellor: fCounsellor,
                status: fStatus,
                demoScheduledOn: fDemoScheduledOn,
                nextFollowUp: fNextFollowUp,
                remarks: fRemarks
              });
              setShowLeadDetail(false);
              setSelectedLead(null);
              addToast('Lead updated successfully.', 'success');
            }} className="space-y-4">
              {/* TAB 1: Profile Details (Edit) */}
              {modalTab === 'profile' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Student Contact Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Input label="Student Name *" required value={fName} onChange={e => setFName(e.target.value)} />
                      <Input label="Mobile Contact *" required value={fMobile} onChange={e => setFMobile(e.target.value)} />
                      <Input label="Student Email" type="email" placeholder="student@example.com" value={fEmail} onChange={e => setFEmail(e.target.value)} />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Parent / Guardian Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Input label="Parent / Guardian Name" placeholder="e.g. Rajesh Sharma" value={fParentName} onChange={e => setFParentName(e.target.value)} />
                      <Input label="Parent Mobile Number" placeholder="Guardian contact mobile" value={fParentMobile} onChange={e => setFParentMobile(e.target.value)} />
                      <Input label="Parent Email Address" type="email" placeholder="parent@example.com" value={fParentEmail} onChange={e => setFParentEmail(e.target.value)} />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Branch Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Select label="Preferred Branch" value={fBranch} onChange={e => setFBranch(e.target.value)} options={[
                        { value: '', label: 'No Preference' },
                        ...branchFilterOptions.filter(o => o.value !== 'All')
                      ]} disabled={currentUser?.role === 'branch-admin'} />
                      <Select label="Assigned Managing Branch" value={fAssignedBranch} onChange={e => setFAssignedBranch(e.target.value)} options={[
                        { value: '', label: 'Assign Later' },
                        ...branchFilterOptions.filter(o => o.value !== 'All')
                      ]} />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Course & Status (Edit) */}
              {modalTab === 'course' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Course Interest & Academic Year</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <Select 
                        label="Interested Course *" 
                        value={fCourse} 
                        onChange={e => { 
                          const newC = e.target.value;
                          setFCourse(newC); 
                          const progs = getProgramsForCourse(newC);
                          const firstProg = progs[0]?.value || '';
                          setFProgram(firstProg); 
                          const lvls = getLevelsForProgram(newC, firstProg);
                          setFLevel(lvls[0]?.value || ''); 
                        }} 
                        options={courseFilterOptions.filter(o => o.value !== 'All')} 
                      />
                      <Select 
                        label="Program" 
                        value={fProgram} 
                        onChange={e => { 
                          const newP = e.target.value;
                          setFProgram(newP); 
                          const lvls = getLevelsForProgram(fCourse, newP);
                          setFLevel(lvls[0]?.value || '');
                        }} 
                        options={[{ value: '', label: 'Select Program' }, ...getProgramsForCourse(fCourse)]} 
                      />
                      <Select 
                        label="Level / Class" 
                        value={fLevel} 
                        onChange={e => setFLevel(e.target.value)} 
                        options={[{ value: '', label: 'Select Level' }, ...getLevelsForProgram(fCourse, fProgram)]} 
                      />
                      <Select 
                        label="Academic Year" 
                        value={fAcademicYear} 
                        onChange={e => setFAcademicYear(e.target.value)} 
                        options={academicYearOptions} 
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
                      <Select label="Discovery Source" value={fSource} onChange={e => setFSource(e.target.value)} options={[
                        { value: 'Walk-in', label: 'Walk-in at Branch' },
                        { value: 'Phone Call', label: 'Phone Call' },
                        { value: 'Website', label: 'Website / Landing Page' },
                        { value: 'Social Media', label: 'Social Media' },
                        { value: 'WhatsApp', label: 'WhatsApp Enquiry' },
                        { value: 'Referral', label: 'Student Referral' },
                        { value: 'Flyer Campaign', label: 'Offline Campaign / Event' },
                        { value: 'Google Ads', label: 'Google Ads' }
                      ]} />
                      <Select label="Stage Status" value={fStatus} onChange={e => setFStatus(e.target.value as any)} options={[
                        { value: 'New Enquiry', label: 'New Enquiry' },
                        { value: 'Contacted', label: 'Contacted' },
                        { value: 'Follow-up', label: 'Follow-up' },
                        { value: 'Demo Scheduled', label: 'Demo Scheduled' },
                        { value: 'Fee Discussion', label: 'Fee Discussion' },
                        { value: 'Interested', label: 'Interested' },
                        { value: 'Not Interested', label: 'Not Interested' }
                      ]} />
                      <Select label="Assigned Counsellor" value={fCounsellor} onChange={e => setFCounsellor(e.target.value)} options={[
                        { value: '', label: 'Select Counsellor' },
                        { value: 'Priya Sen', label: 'Priya Sen' },
                        { value: 'Amit Verma', label: 'Amit Verma' }
                      ]} />
                      <Input label="Next Follow-up Date" type="date" value={fNextFollowUp} onChange={e => setFNextFollowUp(e.target.value)} />
                    </div>

                    {fStatus === 'Demo Scheduled' && (
                      <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-2 mt-3">
                        <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wide">Demo Scheduling Details</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Input label="Demo Scheduled On" type="date" value={fDemoScheduledOn} onChange={e => setFDemoScheduledOn(e.target.value)} />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5 pt-2">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Discussion Remarks / Notes</label>
                      <textarea className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all min-h-[60px]" value={fRemarks} onChange={e => setFRemarks(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Follow-up History (Edit) */}
              {modalTab === 'history' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Follow-up & Interaction History</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Timeline of past communications, calls, and meetings.</p>
                      </div>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => {
                          setInteractionForm({
                            date: new Date().toISOString().split('T')[0],
                            type: 'Call',
                            status: selectedLead.status || 'Follow-up',
                            nextDate: '',
                            remarks: '',
                            demoScheduledOn: ''
                          });
                          setShowAddInteractionModal(true);
                        }}
                        className="cursor-pointer font-semibold text-xs flex items-center gap-1.5"
                        style={{ backgroundColor: '#2563eb', color: 'white' }}
                      >
                        <Plus size={14} /> Add Interaction
                      </Button>
                    </div>

                    {selectedLead.followups && selectedLead.followups.length > 0 ? (
                      <div className="space-y-3 pt-2">
                        {selectedLead.followups.map((fu, idx) => (
                          <div key={idx} className="flex flex-col sm:flex-row gap-3 text-sm bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
                            <div className="w-24 shrink-0 font-mono text-xs font-semibold text-slate-500 pt-0.5">{fu.date}</div>
                            <div className="flex-1 space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800">{fu.type}</span>
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">{(fu as any).counsellor || selectedLead.counsellor}</span>
                                {fu.nextDate && (
                                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 ml-auto">
                                    Next Action: {fu.nextDate}
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-600 text-xs leading-relaxed">{fu.outcome}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-400 italic py-8 text-center bg-white border border-slate-200 rounded-xl">
                        No follow-ups recorded yet. Click &quot;Add Interaction&quot; above to log a call or meeting.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: Fee & Admission (Edit) */}
              {modalTab === 'fee' && (
                <div className="space-y-6 animate-fade-in pb-8">
                  <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm mb-6">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
                      <UserCheck className="w-5 h-5 text-blue-600" /> Pre-Registration Fee Discussion
                    </h4>
                    <p className="text-xs text-slate-500">Configure the fee structure with the parent. When finalized, convert this lead to a registered student. The configuration will carry over.</p>
                  </div>
                  
                  <FeeConfigurator 
                    academicData={academicData}
                    initialCourse={selectedLead.feeConfig?.course || selectedLead.course}
                    initialProgram={selectedLead.feeConfig?.program || selectedLead.program}
                    initialLevel={selectedLead.feeConfig?.level || selectedLead.level}
                    initialState={selectedLead.feeConfig}
                    onChange={(data) => setLeadFeeData(data)}
                  />

                  <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 mt-6">
                    <Button type="button" variant="secondary" onClick={() => {
                      if (selectedLead && leadFeeData) {
                        updateLead(selectedLead.id, {
                          feeConfig: leadFeeData,
                          status: 'Fee Discussion',
                          course: leadFeeData.course || selectedLead.course,
                          program: leadFeeData.program || selectedLead.program,
                          level: leadFeeData.level || selectedLead.level
                        });
                        setSelectedLead({
                          ...selectedLead,
                          feeConfig: leadFeeData,
                          status: 'Fee Discussion',
                          course: leadFeeData.course || selectedLead.course,
                          program: leadFeeData.program || selectedLead.program,
                          level: leadFeeData.level || selectedLead.level
                        });
                        setFStatus('Fee Discussion');
                      }
                      addToast('Fee configuration saved & lead moved to Fee Discussion.', 'success');
                      setShowLeadDetail(false);
                      setSelectedLead(null);
                    }} style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }} className="cursor-pointer">
                      Save Configuration
                    </Button>
                    <Button type="button" variant="primary" onClick={() => navigate(`/leads/${selectedLead.id}/convert`, { state: { prefilledFeeData: leadFeeData } })} style={{ backgroundColor: '#10b981', color: 'white', padding: '0.75rem 1.5rem', fontSize: '1rem' }} className="cursor-pointer">
                      Convert to Student <ChevronRight size={20} className="ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {modalTab !== 'fee' && (
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-6">
                  <Button variant="secondary" onClick={() => { setShowLeadDetail(false); setSelectedLead(null); }} type="button" className="cursor-pointer">Cancel</Button>
                  <Button variant="primary" style={{ backgroundColor: '#2563eb', color: 'white' }} type="submit" className="cursor-pointer">Save Changes</Button>
                </div>
              )}
            </form>
          )}
        </div>

        {/* LOG INTERACTION MODAL POPUP */}
        <Modal
          isOpen={showAddInteractionModal}
          onClose={() => setShowAddInteractionModal(false)}
          title={`Log Interaction: ${selectedLead.name}`}
          size="lg"
        >
          <form onSubmit={handleSaveInteraction} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Interaction Date *"
                type="date"
                required
                value={interactionForm.date}
                onChange={e => setInteractionForm(prev => ({ ...prev, date: e.target.value }))}
              />
              <Select
                label="Interaction Type *"
                value={interactionForm.type}
                onChange={e => setInteractionForm(prev => ({ ...prev, type: e.target.value }))}
                options={[
                  { value: 'Call', label: 'Phone Call' },
                  { value: 'Walk-in', label: 'Walk-in Meet' },
                  { value: 'WhatsApp', label: 'WhatsApp' },
                  { value: 'Email', label: 'Email' }
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Update Lead Status To *"
                value={interactionForm.status}
                onChange={e => setInteractionForm(prev => ({ ...prev, status: e.target.value }))}
                options={[
                  { value: 'New Enquiry', label: 'New Enquiry' },
                  { value: 'Contacted', label: 'Contacted' },
                  { value: 'Follow-up', label: 'Follow-up' },
                  { value: 'Demo Scheduled', label: 'Demo Scheduled' },
                  { value: 'Fee Discussion', label: 'Fee Discussion' },
                  { value: 'Interested', label: 'Interested' },
                  { value: 'Not Interested', label: 'Not Interested' }
                ]}
              />
              <Input
                label="Next Follow-up Date"
                type="date"
                value={interactionForm.nextDate}
                onChange={e => setInteractionForm(prev => ({ ...prev, nextDate: e.target.value }))}
              />
            </div>

            {interactionForm.status === 'Demo Scheduled' && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <Input
                  label="Demo Scheduled On"
                  type="date"
                  value={interactionForm.demoScheduledOn}
                  onChange={e => setInteractionForm(prev => ({ ...prev, demoScheduledOn: e.target.value }))}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Discussion Outcome / Remarks *</label>
              <textarea
                required
                rows={3}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="Discussed curriculum, parent requested discount, demo confirmed..."
                value={interactionForm.remarks}
                onChange={e => setInteractionForm(prev => ({ ...prev, remarks: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button type="button" variant="secondary" onClick={() => setShowAddInteractionModal(false)} className="cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" variant="primary" style={{ backgroundColor: '#2563eb', color: 'white' }} className="cursor-pointer">
                Save Interaction
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  VIEW: Allocate Batch Full-Screen View (Matching Lead Details)
  // ─────────────────────────────────────────────────────────────────────────
  if (showBatchModal && selectedStudent) {
    return (
      <div className="space-y-6 animate-fade-in pb-12">
        {/* Header with Back button */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setShowBatchModal(false); setSelectedStudent(null); }}
            className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-display font-bold text-slate-900">
                Batch Allocation: {selectedStudent.name}
              </h2>
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md">
                {selectedStudent.studentId}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Select and assign a batch from the course hierarchy. Timetable schedules and classroom seatings will synchronize automatically.
            </p>
          </div>
        </div>

        {/* 2-Column Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: Student Profile, Academics & Fee Summary (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Student Profile Card */}
            <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Users size={15} className="text-blue-600" /> Student Profile & Contact Details
                </span>
                <span className="text-xs text-slate-500 font-medium">Branch: <strong className="text-slate-800">{selectedStudent.branch || 'Main Campus'}</strong></span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Full Name</span>
                  <span className="text-slate-900 font-bold text-sm mt-0.5 block">{selectedStudent.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Mobile Contact</span>
                  <span className="font-mono text-slate-800 font-semibold mt-0.5 block">{selectedStudent.mobile || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Admission Date</span>
                  <span className="text-slate-800 font-semibold mt-0.5 block">{selectedStudent.admissionDate || '2026-08-10'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Gender / Category</span>
                  <span className="text-slate-800 font-semibold mt-0.5 block">{selectedStudent.gender || 'Male'} ({selectedStudent.category || 'General'})</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Date of Birth</span>
                  <span className="font-mono text-slate-800 font-semibold mt-0.5 block">{selectedStudent.dob || '2010-05-14'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Admission Status</span>
                  <div className="mt-0.5"><StatusBadge status={selectedStudent.status} /></div>
                </div>
              </div>
            </div>

            {/* 2. Academic Curriculum Card */}
            <div className="p-5 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-4 shadow-sm">
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide block pb-2 border-b border-indigo-100 flex items-center gap-1.5">
                <ClipboardList size={15} className="text-indigo-600" /> Academic Stream & Curriculum
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-indigo-600/80 block font-medium">Enrolled Course</span>
                  <span className="text-indigo-950 font-bold text-sm mt-0.5 block">{selectedStudent.course || '—'}</span>
                </div>
                <div>
                  <span className="text-indigo-600/80 block font-medium">Program Duration</span>
                  <span className="text-indigo-950 font-bold text-sm mt-0.5 block">{selectedStudent.program || '—'}</span>
                </div>
                <div>
                  <span className="text-indigo-600/80 block font-medium">Academic Level</span>
                  <span className="text-indigo-950 font-bold text-sm mt-0.5 block uppercase">{selectedStudent.level || selectedStudent.currentClass || '—'}</span>
                </div>
              </div>
            </div>

            {/* 3. Fee & Enrollment Summary Card */}
            <div className="p-5 bg-emerald-50/60 border border-emerald-100 rounded-2xl space-y-4 shadow-sm">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide block pb-2 border-b border-emerald-100 flex items-center gap-1.5">
                <DollarSign size={15} className="text-emerald-600" /> Fee Structure & Payment Ledger
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-emerald-700/80 block font-medium">Enrollment Type</span>
                  <span className="text-slate-900 font-bold mt-0.5 block">{batchForm.type}</span>
                </div>
                <div>
                  <span className="text-emerald-700/80 block font-medium">Total Course Fee</span>
                  <span className="text-slate-900 font-bold text-sm mt-0.5 block">₹{(selectedStudent.feePlan?.total || 120000).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-emerald-700/80 block font-medium">Amount Paid</span>
                  <span className="text-emerald-700 font-bold text-sm mt-0.5 block">₹{(selectedStudent.feePlan?.paid || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-emerald-700/80 block font-medium">Outstanding Balance</span>
                  <span className="text-red-600 font-bold text-sm mt-0.5 block">₹{(selectedStudent.feePlan?.pending || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Batch Allocation & Timetable Integration (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="p-6 bg-white border-2 border-blue-200 rounded-2xl space-y-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <label className="text-sm font-bold text-blue-900 uppercase tracking-wide flex items-center gap-2">
                  <Layers size={16} className="text-blue-600" /> Select Batch from Hierarchy *
                </label>
              </div>

              {selectedStudent.batch ? (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-blue-700 font-medium">Currently Assigned:</span>
                  <span className="font-mono font-bold text-blue-900 bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-xs text-sm">
                    {selectedStudent.batch}
                  </span>
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                  <Clock size={15} className="text-amber-600 shrink-0" />
                  <span>No batch currently allocated. Please select a matching batch below.</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Available Batches for {selectedStudent.course}</label>
                <Select
                  label=""
                  value={batchForm.batch}
                  onChange={e => setBatchForm(prev => ({ ...prev, batch: e.target.value }))}
                  options={[
                    { value: '', label: 'Choose a Batch from Course Hierarchy...' },
                    ...availableBatchesForStudent.map(bName => {
                      const matchedB = academicData?.batches?.find((b: any) => b.name === bName || b.code === bName);
                      const levelObj = matchedB ? academicData?.levels?.find((l: any) => Number(l.id) === Number(matchedB.level_id)) : null;
                      const courseObj = levelObj ? academicData?.courses?.find((c: any) => Number(c.id) === Number(levelObj.course_id)) : null;
                      const branchObj = matchedB ? academicData?.branches?.find((br: any) => Number(br.id) === Number(matchedB.branch_id)) : null;
                      const extra = [courseObj?.name, branchObj?.name].filter(Boolean).join(' • ');
                      return {
                        value: bName,
                        label: extra ? `${bName} (${extra})` : bName
                      };
                    })
                  ]}
                />
              </div>

              {batchForm.batch && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
                  <div className="font-bold text-slate-800">Allocation Summary:</div>
                  <div className="flex justify-between text-slate-600">
                    <span>Allocated Batch:</span>
                    <strong className="text-blue-700 font-mono text-sm">{batchForm.batch}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Classroom Allocation:</span>
                    <span className="text-emerald-700 font-medium">Synchronized with Timetable</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Faculty Attendance Roster:</span>
                    <span className="text-emerald-700 font-medium">Active</span>
                  </div>
                </div>
              )}

              <div className="text-xs text-slate-500 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
                Allocating a batch will automatically assign lecture schedules, classroom seatings, and activate the student in faculty rosters.
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setShowBatchModal(false); setSelectedStudent(null); }}
                  style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={!batchForm.batch}
                  onClick={async () => {
                    if (selectedStudent && batchForm.batch) {
                      try {
                        const matchedBatch = academicData?.batches?.find((b: any) => b.name === batchForm.batch || b.code === batchForm.batch);
                        const batchId = matchedBatch ? Number(matchedBatch.id) : undefined;
                        const academicYearId = (selectedStudent as any).academic_year_id || academicData?.academicYears?.[0]?.id;

                        if (batchId) {
                          await updateStudent(selectedStudent.id, {
                            batch_id: batchId,
                            academic_year_id: academicYearId ? Number(academicYearId) : undefined
                          });
                        }

                        allocateBatch(
                          selectedStudent.id,
                          batchForm.batch,
                          selectedStudent.course || batchForm.course,
                          selectedStudent.program || batchForm.program,
                          selectedStudent.level || batchForm.level
                        );
                        addToast(`Successfully allocated batch ${batchForm.batch} to ${selectedStudent.name}!`, 'success');
                        await fetchStudents();
                        setShowBatchModal(false);
                        setSelectedStudent(null);
                      } catch (err: any) {
                        addToast(err?.response?.data?.message || 'Failed to allocate batch on server.', 'error');
                      }
                    }
                  }}
                  style={{ backgroundColor: '#2563eb', color: 'white', padding: '0.75rem 1.75rem', fontSize: '0.95rem' }}
                  className="cursor-pointer font-semibold shadow-sm"
                >
                  Confirm Batch Allocation
                </Button>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Leads & Admissions</h2>
          <p className="text-sm text-slate-500 mt-1">Full pipeline lifecycle from initial enquiry to fee activation.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className={`group flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border shadow-2xs active:scale-95 ${
              isFilterExpanded || activeFilters.length > 0
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Filter size={13} className={`transition-transform duration-200 group-hover:scale-110 ${isFilterExpanded || activeFilters.length > 0 ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'}`} />
            <span>Filters</span>
            {activeFilters.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-slate-900 text-[10px] font-extrabold flex items-center justify-center ml-0.5 shadow-2xs">
                {activeFilters.length}
              </span>
            )}
            <ChevronDown
              size={12}
              className={`transition-transform duration-200 ${isFilterExpanded ? 'rotate-180 text-white' : 'text-slate-400 group-hover:text-slate-600'}`}
            />
          </button>

          <Button variant="secondary" onClick={handleExportCSV} className="flex items-center gap-1.5 cursor-pointer h-9 px-3.5 text-xs font-bold">
            <Download size={14} /> Export CSV
          </Button>
          <Button variant="primary" onClick={() => {
            setLeadForm({
              name: '', mobile: '', parentMobile: '',
              course: courses[0]?.name || '',
              program: courses[0]?.programs?.[0] || '',
              level: 'year1', source: 'Walk-in', remarks: '',
              branch: branches[0]?.name || '',
              counsellor: currentUser?.name || 'Admin'
            });
            setShowAddLead(true);
          }} className="flex items-center gap-1.5 cursor-pointer h-9 px-3.5 text-xs font-bold" style={{ backgroundColor: '#2563eb', color: 'white' }}>
            <Plus size={14} /> Log Enquiry
          </Button>
        </div>
      </div>

      {/* Tabs Timeline Stepper */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto">
          {phases.map((p, idx) => {
            const Icon = p.icon;
            const isActive = activeTab === p.id;
            return (
              <button
                key={p.id}
                onClick={() => navigate(tabRouteMap[p.id])}
                className={`flex-1 min-w-[150px] flex flex-col items-center gap-1.5 px-4 py-4 text-center transition-all border-b-2 cursor-pointer relative ${
                  isActive ? 'border-blue-600 bg-blue-50/60 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {idx < phases.length - 1 && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-200 hidden md:block">
                    <ChevronRight size={14} />
                  </span>
                )}
                <Icon size={16} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                <span className="text-[11px] font-bold leading-tight">{p.label}</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}>{p.phase}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Active Filters Tag Strip (when collapsed) ──────────────────────────── */}
      {!isFilterExpanded && activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 animate-fade-in">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Active Filters:</span>
          {activeFilters.map(af => (
            <span
              key={af.label}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200/70 text-slate-800 border border-slate-200 transition-colors"
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
            onClick={handleResetAllFilters}
            className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer ml-1 transition-all"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Expandable Filter Panel (opens directly in a clean single-line layout) ── */}
      {isFilterExpanded && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm animate-fade-in space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                <Filter size={12} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block leading-tight">Filter Leads & Pipeline Records</span>
                <span className="text-[10px] text-slate-400 block">Filter by student name/contact, branch, course, program, status and source</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {activeFilters.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
                >
                  <RotateCcw size={11} />
                  Reset all
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsFilterExpanded(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close filter panel"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Form Controls Single-Line Grid */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${activeTab === 'pipeline' ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-2.5 items-end`}>
            {/* Search */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                <input
                  type="text"
                  value={search}
                  onChange={e => {
                    const sanitized = e.target.value.replace(/[^a-zA-Z0-9\s]/g, '');
                    setSearch(sanitized);
                    setPage(1);
                  }}
                  placeholder={activeTab === 'pipeline' ? 'Search leads...' : 'Search students...'}
                  className="w-full h-8 pl-8 pr-2.5 text-xs font-semibold bg-slate-50 hover:bg-white border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 focus:bg-white transition-all shadow-xs placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Branch */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Branch
              </label>
              <div className="relative">
                <select
                  value={filterBranch}
                  onChange={e => setFilterBranch(e.target.value)}
                  disabled={isBranchAdmin}
                  className="w-full h-8 text-xs font-semibold bg-slate-50 hover:bg-white border border-slate-200 text-slate-800 rounded-xl px-2.5 pr-7 appearance-none cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 focus:bg-white transition-all shadow-xs disabled:opacity-60"
                >
                  {branchFilterOptions.map(b => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">▼</span>
              </div>
            </div>

            {/* Course */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Course
              </label>
              <div className="relative">
                <select
                  value={filterCourse}
                  onChange={e => { setFilterCourse(e.target.value); setFilterProgram('All'); }}
                  className="w-full h-8 text-xs font-semibold bg-slate-50 hover:bg-white border border-slate-200 text-slate-800 rounded-xl px-2.5 pr-7 appearance-none cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 focus:bg-white transition-all shadow-xs"
                >
                  {courseFilterOptions.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">▼</span>
              </div>
            </div>

            {/* Program */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Program
              </label>
              <div className="relative">
                <select
                  value={filterProgram}
                  onChange={e => setFilterProgram(e.target.value)}
                  className="w-full h-8 text-xs font-semibold bg-slate-50 hover:bg-white border border-slate-200 text-slate-800 rounded-xl px-2.5 pr-7 appearance-none cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 focus:bg-white transition-all shadow-xs"
                >
                  {programFilterOptions.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">▼</span>
              </div>
            </div>

            {/* Stage Status */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Stage Status
              </label>
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full h-8 text-xs font-semibold bg-slate-50 hover:bg-white border border-slate-200 text-slate-800 rounded-xl px-2.5 pr-7 appearance-none cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 focus:bg-white transition-all shadow-xs"
                >
                  {activeTab === 'pipeline' ? (
                    <>
                      <option value="All">All Stages</option>
                      <option value="New Enquiry">New Enquiry</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Follow-up">Follow-up</option>
                      <option value="Demo Scheduled">Demo Scheduled</option>
                      <option value="Fee Discussion">Fee Discussion</option>
                      <option value="Interested">Interested</option>
                      <option value="Not Interested">Not Interested</option>
                      <option value="Lost">Lost / Dropped</option>
                      <option value="Cancelled">Cancelled</option>
                    </>
                  ) : activeTab === 'fee' ? (
                    <>
                      <option value="All">All Stages</option>
                      <option value="Fee Discussion">Fee Discussion</option>
                    </>
                  ) : activeTab === 'admission' ? (
                    <>
                      <option value="All">All Statuses</option>
                      <option value="Registration Pending">Registration Pending</option>
                      <option value="Documents Submitted">Documents Submitted</option>
                      <option value="Verification Pending">Verification Pending</option>
                    </>
                  ) : (
                    <>
                      <option value="All">All Statuses</option>
                      <option value="Verification Pending">Verification Pending</option>
                      <option value="Active Student">Active Student</option>
                    </>
                  )}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">▼</span>
              </div>
            </div>

            {/* Discovery Source (shown on pipeline tab) */}
            {activeTab === 'pipeline' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Discovery Source
                </label>
                <div className="relative">
                  <select
                    value={filterSource}
                    onChange={e => setFilterSource(e.target.value)}
                    className="w-full h-8 text-xs font-semibold bg-slate-50 hover:bg-white border border-slate-200 text-slate-800 rounded-xl px-2.5 pr-7 appearance-none cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 focus:bg-white transition-all shadow-xs"
                  >
                    <option value="All">All Sources</option>
                    <option value="Walk-in">Walk-in</option>
                    <option value="Phone Call">Phone Call</option>
                    <option value="Website">Website</option>
                    <option value="Social Media">Social Media</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Referral">Referral</option>
                    <option value="Flyer Campaign">Offline Campaign</option>
                    <option value="Google Ads">Google Ads</option>
                  </select>
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">▼</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 1: LEAD PIPELINE */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Leads',   value: stats.totalLeads,   color: 'bg-slate-50 border-slate-200', text: 'text-slate-700' },
              { label: 'New Enquiries', value: stats.newEnquiries, color: 'bg-blue-50 border-blue-200',   text: 'text-blue-700' },
              { label: 'Follow-up',     value: stats.followUp,     color: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
              { label: 'Interested',    value: stats.interested,    color: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
            ].map(s => (
              <div key={s.label} className={`p-4 rounded-xl border ${s.color} text-center shadow-sm`}>
                <div className={`text-2xl font-bold ${s.text}`}>{s.value}</div>
                <div className="text-xs text-slate-500 font-semibold mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Active Lead Registrations</CardTitle>
            </CardHeader>
            <Table 
              dense 
              minWidth="1100px"
              headers={['ID', 'Student Name', 'Mobile / Contact', 'Course Interest', 'Branch', 'Stage', 'Counsellor', { label: 'Actions', align: 'center' }]}
            >
              {paginatedLeads.map(l => (
                <tr 
                  key={l.id} 
                  onClick={() => handleOpenLeadDetail(l, 'profile', true)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-semibold text-slate-900 text-sm whitespace-nowrap">{l.id}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900 text-sm whitespace-nowrap">{l.name}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <div className="text-slate-800 font-medium">{l.mobile || '—'}</div>
                    {l.parentMobile && (
                      <div className="text-xs text-slate-500 mt-0.5">Parent: {l.parentMobile}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded text-xs font-semibold">
                      {l.course || '—'}
                    </span>
                    {l.program && (
                      <div className="text-xs text-slate-500 mt-0.5">{l.program}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{l.branch || 'N/A'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={l.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{l.counsellor || 'Unassigned'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleOpenLeadDetail(l, 'profile', false)}
                        title="Edit Lead"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer shrink-0"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenLeadDetail(l, 'history', true)}
                        title="Call Log / Follow-ups"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer shrink-0"
                      >
                        <PhoneCall size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeadToDelete(l)}
                        title="Delete Lead"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">
                    {leadsLoading ? 'Loading leads...' : 'No active leads matching current filters.'}
                  </td>
                </tr>
              )}
            </Table>
            <Pagination currentPage={page} totalPages={totalPages} totalItems={filteredLeads.length} pageSize={PER_PAGE} onPageChange={setPage} />
          </Card>
        </div>
      )}

      {/* TAB CONTENT 2: FEE DISCUSSION */}
      {activeTab === 'fee' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 flex items-center gap-2">
            <Clock size={14} className="text-blue-500" />
            <span><strong>Phase 2 — Fee Discussion:</strong> Track and manage fees negotiations for active leads.</span>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Fee Discussion Queue</CardTitle>
            </CardHeader>
            <Table 
              dense 
              minWidth="1200px"
              headers={['ID', 'Student Name', 'Mobile / Contact', 'Course Interest', 'Branch', 'Stage', 'Counsellor', 'Next Follow-up', { label: 'Actions', align: 'center' }]}
            >
              {paginatedLeads.map(l => (
                <tr 
                  key={l.id} 
                  onClick={() => handleOpenLeadDetail(l, 'fee', true)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-semibold text-slate-900 text-sm whitespace-nowrap">{l.id}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900 text-sm whitespace-nowrap">{l.name}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <div className="text-slate-800 font-medium">{l.mobile || '—'}</div>
                    {l.parentMobile && (
                      <div className="text-xs text-slate-500 mt-0.5">Parent: {l.parentMobile}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded text-xs font-semibold">
                      {l.course || '—'}
                    </span>
                    {l.program && (
                      <div className="text-xs text-slate-500 mt-0.5">{l.program}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700 text-sm whitespace-nowrap">{l.branch || 'N/A'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={l.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{l.counsellor || 'Unassigned'}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <span className="font-mono text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      {l.nextFollowUp || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleOpenLeadDetail(l, 'fee', false)}
                        title="Configure Fee Plan"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer shrink-0"
                      >
                        <DollarSign size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenLeadDetail(l, 'history', true)}
                        title="Call Log / Follow-ups"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer shrink-0"
                      >
                        <PhoneCall size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeadToDelete(l)}
                        title="Delete Lead"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-400">
                    {leadsLoading ? 'Loading leads...' : 'No leads currently in fee discussion phase.'}
                  </td>
                </tr>
              )}
            </Table>
            <Pagination currentPage={page} totalPages={totalPages} totalItems={filteredLeads.length} pageSize={PER_PAGE} onPageChange={setPage} />
          </Card>
        </div>
      )}

      {/* TAB CONTENT 3: ADMISSION CONFIRMATION */}
      {activeTab === 'admission' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Enquiries',    value: stats.totalLeads,      color: 'bg-slate-50 border-slate-200', text: 'text-slate-700' },
              { label: 'Pending Docs',       value: stats.pendingDocs,     color: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
              { label: 'Pending Verification', value: stats.pendingReview, color: 'bg-blue-50 border-blue-200',  text: 'text-blue-700' },
              { label: 'Active Students',    value: stats.activeStudents, color: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
            ].map(s => (
              <div key={s.label} className={`p-4 rounded-xl border ${s.color} text-center shadow-sm`}>
                <div className={`text-2xl font-bold ${s.text}`}>{s.value}</div>
                <div className="text-xs text-slate-500 font-semibold mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Admission & Verification Queue</CardTitle>
            </CardHeader>
            <Table 
              dense
              minWidth="1120px"
              colWidths={['160px', '180px', '130px', '140px', '170px', '170px', '140px']}
              headers={['Student ID', 'Student Name', 'Mobile', 'Course Interest', 'Documents Status', 'Verification Status', { label: 'Actions', align: 'center' }]}
            >
              {paginatedStudents.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3.5 py-3 font-mono font-bold text-xs text-slate-500 whitespace-nowrap">{s.studentId}</td>
                  <td className="px-3.5 py-3 font-semibold text-blue-600 hover:underline cursor-pointer whitespace-nowrap" onClick={() => handleOpenDocModal(s)}>{s.name}</td>
                  <td className="px-3.5 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">{s.mobile || '—'}</td>
                  <td className="px-3.5 py-3 text-xs text-slate-700 font-medium whitespace-nowrap">{s.course}</td>
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    {s.status === 'Active Student' || s.status === 'Documents Verified' || s.status === 1 || s.status === 5 ? (
                      <span className="text-emerald-600 text-xs font-semibold inline-flex items-center gap-1.5"><CheckCircle size={12} /> Verified</span>
                    ) : (
                      <span className="text-amber-600 text-xs font-semibold inline-flex items-center gap-1.5"><Clock size={12} /> Verification Pending</span>
                    )}
                  </td>
                  <td className="px-3.5 py-3 whitespace-nowrap"><StatusBadge status={s.status} /></td>
                  <td className="px-3.5 py-3 whitespace-nowrap text-center">
                    <Button variant="primary" size="sm" onClick={() => handleOpenDocModal(s)} className="cursor-pointer text-xs font-semibold inline-flex items-center gap-1" style={{ backgroundColor: '#2563eb', color: 'white' }}>
                      Review Docs <ChevronRight size={12} className="ml-1" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">{studentsLoading ? 'Loading student records from server...' : 'No student records matching current filters.'}</td></tr>
              )}
            </Table>
            <Pagination currentPage={page} totalPages={totalPages} totalItems={filteredStudents.length} pageSize={PER_PAGE} onPageChange={setPage} />
          </Card>
        </div>
      )}

      {/* TAB CONTENT 4: BATCH ALLOCATION */}
      {activeTab === 'batch' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Allocation Queue</CardTitle>
            </CardHeader>
            <Table
              dense
              minWidth="1180px"
              colWidths={['140px', '160px', '120px', '130px', '130px', '150px', '160px', '170px']}
              headers={['Student ID', 'Student Name', 'Course', 'Branch', 'Admission Date', 'Current Batch', 'Status', { label: 'Actions', align: 'center', minWidth: '160px' }]}
            >
              {paginatedStudents.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3.5 py-3 font-mono font-bold text-xs text-slate-500 whitespace-nowrap">{s.studentId}</td>
                  <td className="px-3.5 py-3 font-semibold text-blue-600 hover:underline cursor-pointer whitespace-nowrap" onClick={() => handleOpenBatchModal(s)}>
                    {s.name}
                  </td>
                  <td className="px-3.5 py-3 text-xs text-slate-700 whitespace-nowrap font-medium">{s.course || '—'}</td>
                  <td className="px-3.5 py-3 text-xs text-slate-600 whitespace-nowrap">{s.branch || '—'}</td>
                  <td className="px-3.5 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{s.admissionDate || '—'}</td>
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    {s.batch ? (
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md inline-flex items-center gap-1">
                        {s.batch}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-700 font-semibold inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        <Clock size={12} /> Unassigned
                      </span>
                    )}
                  </td>
                  <td className="px-3.5 py-3 whitespace-nowrap"><StatusBadge status={s.status} /></td>
                  <td className="px-3.5 py-3 whitespace-nowrap text-center">
                    <Button variant="secondary" size="sm" onClick={() => handleOpenBatchModal(s)} className="cursor-pointer text-xs font-semibold inline-flex items-center gap-1.5 px-3 py-1.5 whitespace-nowrap">
                      <Layers size={13} /> Allocate Batch
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-400">{studentsLoading ? 'Loading student records from server...' : 'No student records matching current filters.'}</td></tr>
              )}
            </Table>
            <Pagination currentPage={page} totalPages={totalPages} totalItems={filteredStudents.length} pageSize={PER_PAGE} onPageChange={setPage} />
          </Card>
        </div>
      )}

      {/* TAB CONTENT 5: PAYMENT & ACTIVATION */}
      {activeTab === 'payment' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Registered',  value: stats.totalStudents,   color: 'bg-slate-50 border-slate-200', text: 'text-slate-700' },
              { label: 'Active Students', value: stats.activeStudents,       color: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
              { label: 'Fee Collected',   value: `₹${stats.feeCollected.toLocaleString()}`, color: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
              { label: 'Outstanding',     value: `₹${stats.feeOutstanding.toLocaleString()}`, color: 'bg-red-50 border-red-200', text: 'text-red-600' },
            ].map(s => (
              <div key={s.label} className={`p-4 rounded-xl border ${s.color} text-center shadow-sm`}>
                <div className={`text-2xl font-bold ${s.text}`}>{s.value}</div>
                <div className="text-xs text-slate-500 font-semibold mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Fee Activation & Status Ledger</CardTitle>
            </CardHeader>
            <Table
              dense
              minWidth="1220px"
              colWidths={['140px', '160px', '120px', '150px', '100px', '100px', '110px', '150px', '160px']}
              headers={['Student ID', 'Student Name', 'Course', 'Batch', 'Total Fee', 'Paid', 'Outstanding', 'Status', { label: 'Actions', align: 'center', minWidth: '150px' }]}
            >
              {paginatedStudents.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3.5 py-3 font-mono font-bold text-xs text-slate-500 whitespace-nowrap">{s.studentId}</td>
                  <td className="px-3.5 py-3 font-semibold text-slate-900 whitespace-nowrap">{s.name}</td>
                  <td className="px-3.5 py-3 text-xs text-slate-700 whitespace-nowrap font-medium">{s.course || '—'}</td>
                  <td className="px-3.5 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">{s.batch || '—'}</td>
                  <td className="px-3.5 py-3 text-xs font-semibold text-slate-800 whitespace-nowrap">₹{(s.feePlan?.total || 0).toLocaleString()}</td>
                  <td className="px-3.5 py-3 text-xs font-bold text-emerald-600 whitespace-nowrap">₹{(s.feePlan?.paid || 0).toLocaleString()}</td>
                  <td className="px-3.5 py-3 text-xs font-bold text-red-500 whitespace-nowrap">₹{(s.feePlan?.pending || 0).toLocaleString()}</td>
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    {s.status === 'Active Student' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded-md uppercase tracking-wider select-none">
                        <Zap size={10} className="fill-emerald-500 text-emerald-500" /> Active
                      </span>
                    ) : (
                      <StatusBadge status={s.status} />
                    )}
                  </td>
                  <td className="px-3.5 py-3 whitespace-nowrap text-center">
                    <button
                      onClick={async () => {
                        const pendingAmount = s.feePlan?.pending || 0;
                        if (pendingAmount <= 0) return;
                        try {
                          await apiRecordPayment({
                            student_id: Number(s.id),
                            amount: pendingAmount,
                            payment_mode: 'Cash',
                            remarks: 'Admissions Down Payment & Activation'
                          });
                          recordPayment(s.id, pendingAmount, 'Cash');
                          addToast(`Collected fee downpayment of ₹${pendingAmount.toLocaleString()}. Student ${s.name} status activated.`, 'success');
                          await fetchStudents();
                        } catch (err: any) {
                          recordPayment(s.id, pendingAmount, 'Cash');
                          addToast(`Recorded fee payment of ₹${pendingAmount.toLocaleString()} for ${s.name}.`, 'success');
                          await fetchStudents();
                        }
                      }}
                      disabled={(s.feePlan?.pending || 0) === 0}
                      className={`inline-flex items-center justify-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-colors select-none whitespace-nowrap ${
                        (s.feePlan?.pending || 0) > 0
                          ? 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200 cursor-pointer shadow-xs'
                          : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                      }`}
                    >
                      Record Payment
                    </button>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr><td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-400">{studentsLoading ? 'Loading student records from server...' : 'No student records matching current filters.'}</td></tr>
              )}
            </Table>
            <Pagination currentPage={page} totalPages={totalPages} totalItems={filteredStudents.length} pageSize={PER_PAGE} onPageChange={setPage} />
          </Card>
        </div>
      )}

      {/* Delete / Mark Lead as Lost Confirmation Modal */}
      {leadToDelete && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={() => !isDeletingLead && setLeadToDelete(null)}
        >
          <div 
            className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={22} className="text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Mark Lead as Lost / Drop Lead</h3>
                <p className="text-xs text-slate-500">Record reason and move lead to Lost status with timestamp</p>
              </div>
            </div>

            {/* Lead Summary Info */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Student Name:</span>
                <span className="font-bold text-slate-900">{leadToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Contact:</span>
                <span className="font-mono text-slate-800">{leadToDelete.mobile || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Course Interest:</span>
                <span className="font-semibold text-slate-800">{leadToDelete.course || '—'}</span>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reason for Dropping / Marking Lost *
                </label>
                <textarea
                  rows={3}
                  value={lostReason}
                  onChange={e => setLostReason(e.target.value)}
                  placeholder="Enter reason for dropping this lead (e.g. Joined competitor, fee constraint, relocated, unreachable)..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm text-slate-800 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all placeholder:text-slate-400"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => {
                  setLeadToDelete(null);
                  setLostReason('');
                }}
                disabled={isDeletingLead}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleConfirmDeleteLead}
                disabled={isDeletingLead}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2"
              >
                <Trash2 size={15} />
                {isDeletingLead ? 'Updating...' : 'Confirm & Mark as Lost'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}



      {/* Document Review & Verification Modal */}
      {docModalStudent && (
        <Modal
          isOpen={!!docModalStudent}
          onClose={() => setDocModalStudent(null)}
          title={`Review & Verify Documents — ${docModalStudent.name}`}
          size="lg"
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
              <div><strong>Student:</strong> {docModalStudent.name} ({docModalStudent.studentId})</div>
              <div><strong>Course:</strong> {docModalStudent.course || '—'}</div>
              <div><strong>Status:</strong> <StatusBadge status={docModalStudent.status} /></div>
            </div>

            {docLoading ? (
              <div className="py-8 text-center text-slate-400 text-sm">Loading student documents...</div>
            ) : studentDocList.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm border border-dashed rounded-xl p-6">
                <FileText className="mx-auto text-slate-300 mb-2" size={32} />
                <p>No documents uploaded yet for this student.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {studentDocList.map(doc => (
                  <div key={doc.id} className="p-4 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-all space-y-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-xl shrink-0 ${doc.status === 1 ? 'bg-emerald-50 text-emerald-600' : doc.status === 2 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                          <FileText size={20} />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                            {doc.document_type_name}
                            {doc.is_required ? (
                              <span className="text-[10px] uppercase font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded">Required</span>
                            ) : null}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">{doc.file_name}</div>
                          {doc.verified_at && (
                            <div className="text-[11px] text-slate-400 mt-1">
                              Verified {new Date(doc.verified_at).toLocaleDateString()} {doc.verified_by_name ? `by ${doc.verified_by_name}` : ''}
                            </div>
                          )}
                          {doc.rejection_reason && (
                            <div className="text-xs text-rose-600 mt-1 font-medium bg-rose-50 p-1.5 rounded border border-rose-200">
                              Reason: {doc.rejection_reason}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                          doc.status === 1 ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                          doc.status === 2 ? 'bg-rose-50 text-rose-700 border-rose-300' :
                          'bg-amber-50 text-amber-700 border-amber-300'
                        }`}>
                          {doc.status === 1 ? 'Verified' : doc.status === 2 ? 'Rejected' : 'Pending Verification'}
                        </span>
                      </div>
                    </div>

                    {rejectingDocId === doc.id ? (
                      <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Enter rejection reason (e.g. illegible photocopy)..."
                          value={docRejectionReason}
                          onChange={e => setDocRejectionReason(e.target.value)}
                          className="flex-1 text-xs border border-slate-200 rounded px-2.5 py-1.5 outline-none focus:border-rose-500"
                        />
                        <Button size="sm" variant="danger" onClick={() => handleUpdateDocStatus(doc.id, 2, docRejectionReason)} className="text-xs">
                          Confirm Reject
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setRejectingDocId(null)} className="text-xs">
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        {doc.status !== 1 && (
                          <Button size="sm" variant="primary" style={{ backgroundColor: '#10b981', color: 'white' }} onClick={() => handleUpdateDocStatus(doc.id, 1)} className="text-xs flex items-center gap-1">
                            <CheckCircle size={14} /> Approve & Verify
                          </Button>
                        )}
                        {doc.status !== 2 && (
                          <Button size="sm" variant="secondary" onClick={() => { setRejectingDocId(doc.id); setDocRejectionReason(''); }} className="text-xs text-rose-600 hover:bg-rose-50">
                            Reject
                          </Button>
                        )}
                        {doc.status !== 0 && (
                          <Button size="sm" variant="secondary" onClick={() => handleUpdateDocStatus(doc.id, 0)} className="text-xs text-slate-500">
                            Reset to Pending
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setDocModalStudent(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
