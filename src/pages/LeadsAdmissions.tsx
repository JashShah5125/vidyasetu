import React, { useState, useMemo, useEffect } from 'react';
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
  Plus, ArrowLeft, Users, PhoneCall, DollarSign,
  ClipboardList, Layers, CheckCircle, Clock, ChevronRight,
  Download, Search, UserCheck, FileText, Zap, X
} from 'lucide-react';
import type { Lead, Student } from '../data/mockData';

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

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    'New Enquiry':          'bg-blue-50 text-blue-700 border-blue-200',
    'Contacted':            'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Follow-up':            'bg-amber-50 text-amber-700 border-amber-200',
    'Demo Scheduled':       'bg-purple-50 text-purple-700 border-purple-200',
    'Fee Discussion':       'bg-cyan-50 text-cyan-700 border-cyan-200',
    'Interested':           'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Not Interested':       'bg-red-50 text-red-600 border-red-200',
    'Converted':            'bg-slate-105 text-slate-600 border-slate-300',
    'Registration Pending': 'bg-orange-50 text-orange-700 border-orange-200',
    'Documents Submitted':  'bg-cyan-50 text-cyan-700 border-cyan-200',
    'Verification Pending': 'bg-violet-50 text-violet-700 border-violet-200',
    'Active Student':       'bg-emerald-100 text-emerald-800 border-emerald-300'
  };
  const classes = map[status] || 'bg-slate-50 text-slate-600 border-slate-200';
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider whitespace-nowrap inline-block ${classes}`}>
      {status}
    </span>
  );
};

export const LeadsAdmissions: React.FC<LeadsAdmissionsProps> = ({ initialTab = 'pipeline' }) => {
  const {
    leads, students, courses, batches, branches,
    addLead, updateLead, addFollowup,
    allocateBatch, recordPayment,
    addToast, currentUser
  } = useApp();

  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

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
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterSource, setFilterSource] = useState('All');
  const [filterBranch, setFilterBranch] = useState(currentUser?.role === 'branch-admin' ? currentUser.branch || 'All' : 'All');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterProgram, setFilterProgram] = useState('All');

  // Pagination State
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  // Clear filters on tab change
  useEffect(() => {
    setFilterStatus('All');
    setSearch('');
    setPage(1);
  }, [activeTab]);

  // Modals / Details state
  const [showAddLead, setShowAddLead] = useState(false);
  const [showFollowup, setShowFollowup] = useState(false);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [modalTab, setModalTab] = useState<'profile' | 'course' | 'history' | 'fee'>('profile');
  const [leadFeeData, setLeadFeeData] = useState<any>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Lead Details Form State
  const [fName, setFName] = useState('');
  const [fMobile, setFMobile] = useState('');
  const [fParent, setFParent] = useState('');
  const [fCourse, setFCourse] = useState('');
  const [fProgram, setFProgram] = useState('');
  const [fLevel, setFLevel] = useState('year1');
  const [fBranch, setFBranch] = useState('');
  const [fAssignedBranch, setFAssignedBranch] = useState('');
  const [fSource, setFSource] = useState('Walk-in');
  const [fStatus, setFStatus] = useState<Lead['status']>('New Enquiry');
  const [fCounsellor, setFCounsellor] = useState('');
  const [fRemarks, setFRemarks] = useState('');
  const [fDemoScheduledOn, setFDemoScheduledOn] = useState('');

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
    name: '', mobile: '', parentMobile: '', course: '', program: '', level: 'year1', source: 'Walk-in', remarks: '', branch: '', counsellor: ''
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
    const cName = batchForm.course || selectedStudent.course;
    const pName = batchForm.program || selectedStudent.program;
    const lName = batchForm.level || selectedStudent.level;

    const courseData = (courseHierarchy as any[]).find(
      c => c.courseName?.toLowerCase() === cName?.toLowerCase()
    );
    const progData = courseData?.programs?.find(
      (p: any) => p.programName?.toLowerCase() === pName?.toLowerCase()
    );
    const lvlData = progData?.levels?.find(
      (l: any) => (l.levelId?.toLowerCase() === lName?.toLowerCase() || l.levelName?.toLowerCase() === lName?.toLowerCase())
    );

    const hierarchyBatches: string[] = lvlData?.batches || [];

    const contextBatches = batches
      .filter(b => (!cName || b.course === cName))
      .map(b => b.name);

    const combined = Array.from(new Set([...hierarchyBatches, ...contextBatches]));
    return combined;
  }, [selectedStudent, batchForm.course, batchForm.program, batchForm.level, batches]);

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

  const handleOpenLeadDetail = (l: Lead, defaultTab: 'profile' | 'course' | 'history' | 'fee' = 'profile') => {
    setSelectedLead(l);
    setFName(l.name);
    setFMobile(l.mobile);
    setFParent(l.parentMobile || '');
    setFCourse(l.feeConfig?.course || l.course);
    setFProgram(l.feeConfig?.program || l.program || '');
    setFLevel(l.feeConfig?.level || l.level || 'year1');
    setFBranch(l.preferredBranch || l.branch || '');
    setFAssignedBranch(l.branch || '');
    setFSource(l.source);
    setFStatus(l.status);
    setFCounsellor(l.counsellor || '');
    setFRemarks(l.remarks || '');
    setFDemoScheduledOn(l.demoScheduledOn || '');
    setLeadFeeData(l.feeConfig || null);
    setModalTab(defaultTab);
    setShowLeadDetail(true);
    window.scrollTo({ top: 0, behavior: 'instant' });
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

  // Computed filter options
  const branchFilterOptions = useMemo(() => [
    { value: 'All', label: 'All Branches' },
    ...branches.map(b => ({ value: b.name, label: b.name }))
  ], [branches]);

  const courseFilterOptions = useMemo(() => [
    { value: 'All', label: 'All Courses' },
    ...courses.map(c => ({ value: c.name, label: c.name }))
  ], [courses]);

  const programFilterOptions = useMemo(() => {
    const defaultOpts = [{ value: 'All', label: 'All Programs' }];
    if (filterCourse === 'All') return defaultOpts;
    const courseObj = courses.find(c => c.name === filterCourse);
    return [
      ...defaultOpts,
      ...(courseObj?.programs?.map(p => ({ value: p, label: p })) || [])
    ];
  }, [courses, filterCourse]);

  // Filtered lists
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (l.status === 'Converted') return false;
      if (activeTab === 'fee' && l.status !== 'Fee Discussion') return false;
      const q = search.toLowerCase();
      const matchQ = l.name.toLowerCase().includes(q) || l.course.toLowerCase().includes(q) || l.mobile.includes(q);
      const matchSt = filterStatus === 'All' || l.status === filterStatus;
      const matchSrc = filterSource === 'All' || l.source === filterSource;
      const matchBranch = currentUser?.role === 'branch-admin'
        ? l.branch === currentUser.branch
        : (filterBranch === 'All' || l.branch === filterBranch);
      const matchCourse = filterCourse === 'All' || l.course === filterCourse;
      const courseObj = courses.find(c => c.name === l.course);
      const matchProgram = filterProgram === 'All' || (courseObj?.programs?.includes(filterProgram) ?? false);
      return matchQ && matchSt && matchSrc && matchBranch && matchCourse && matchProgram;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [leads, search, filterStatus, filterSource, filterBranch, filterCourse, filterProgram, courses, currentUser, activeTab]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const q = search.toLowerCase();
      const matchQ = s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q) || s.mobile.includes(q);
      const matchSt = filterStatus === 'All' || s.status === filterStatus;
      const matchBranch = currentUser?.role === 'branch-admin'
        ? s.branch === currentUser.branch
        : (filterBranch === 'All' || s.branch === filterBranch);
      const matchCourse = filterCourse === 'All' || s.course === filterCourse;
      let matchProgram = filterProgram === 'All';
      if (filterProgram !== 'All') {
        if (s.batch) {
          const b = batches.find(x => x.name === s.batch);
          if (b && b.program === filterProgram) matchProgram = true;
        }
        const courseObj = courses.find(c => c.name === s.course);
        if (courseObj?.programs?.includes(filterProgram)) matchProgram = true;
      }
      return matchQ && matchSt && matchBranch && matchCourse && matchProgram;
    });
  }, [students, search, filterStatus, filterBranch, filterCourse, filterProgram, batches, courses, currentUser]);

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
    const activeLeads = leads.filter(l => l.status !== 'Converted');
    return {
      totalLeads: activeLeads.length,
      newEnquiries: activeLeads.filter(l => l.status === 'New Enquiry').length,
      followUp: activeLeads.filter(l => l.status === 'Follow-up').length,
      interested: activeLeads.filter(l => l.status === 'Interested').length,
      totalStudents: students.length,
      verificationPending: students.filter(s => s.status === 'Verification Pending').length,
      activeStudents: students.filter(s => s.status === 'Active Student').length,
      feeCollected: students.reduce((sum, s) => sum + (s.feePlan?.paid || 0), 0),
      feeOutstanding: students.reduce((sum, s) => sum + (s.feePlan?.pending || 0), 0)
    };
  }, [leads, students]);

  // Save Handlers
  const handleAddLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.name || !leadForm.mobile || !leadForm.course) {
      addToast('Please fill Name, Mobile and Course', 'error');
      return;
    }
    addLead(
      leadForm.name,
      leadForm.mobile,
      leadForm.parentMobile,
      leadForm.course,
      leadForm.program,
      leadForm.level,
      leadForm.source,
      leadForm.remarks,
      leadForm.branch,
      leadForm.branch, // preferred
      leadForm.counsellor || 'System Admin'
    );
    addToast('New lead registered successfully!', 'success');
    setShowAddLead(false);
    setLeadForm({
      name: '', mobile: '', parentMobile: '', course: '', program: '', level: 'year1', source: 'Walk-in', remarks: '', branch: '', counsellor: ''
    });
  };

  const handleFollowupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !followupForm.outcome) return;
    addFollowup(selectedLead.id, followupForm.type, followupForm.outcome, followupForm.nextDate);
    addToast('Follow-up activity recorded.', 'success');
    setShowFollowup(false);
    setFollowupForm({ type: 'Call #1', outcome: '', nextDate: '' });
  };

  const handleAllocateBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !batchForm.batch) return;
    allocateBatch(selectedStudent.id, batchForm.batch, batchForm.course, batchForm.program, batchForm.level);
    addToast(`Batch ${batchForm.batch} successfully assigned to ${selectedStudent.name}`, 'success');
    setShowBatchModal(false);
    setBatchForm({ course: '', program: '', level: 'year1', batch: '', type: 'Standard Enrollment' });
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
  //  VIEW: Lead Details Panel (Matching Screenshot)
  // ─────────────────────────────────────────────────────────────────────────
  if (showLeadDetail && selectedLead) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => { setShowLeadDetail(false); setSelectedLead(null); }} className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">Lead Details: {selectedLead.name}</h2>
            <p className="text-sm text-slate-500">Edit enquiry details below.</p>
          </div>
        </div>

        <div className="w-full">
          <form onSubmit={e => {
            e.preventDefault();
            updateLead(selectedLead.id, {
              name: fName, mobile: fMobile, course: fCourse, program: fProgram, level: fLevel, preferredBranch: fBranch, branch: fAssignedBranch, source: fSource, counsellor: fCounsellor, status: fStatus, demoScheduledOn: fDemoScheduledOn, remarks: fRemarks
            });
            setShowLeadDetail(false);
            setSelectedLead(null);
            addToast('Lead updated successfully.', 'success');
          }} className="space-y-4">
            
            {/* Tabs Header */}
            <div className="flex gap-4 border-b border-slate-200 mb-6">
              {[
                { id: 'profile', label: 'Profile Details' },
                { id: 'course', label: 'Course & Status' },
                { id: 'history', label: 'Follow-up History' },
                { id: 'fee', label: 'Fee & Admission' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setModalTab(t.id as any)}
                  className={`pb-3 font-semibold text-sm border-b-2 transition-colors cursor-pointer ${
                    modalTab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB 1: Profile Details */}
            {modalTab === 'profile' && (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Student & Contact Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Student Name *" required value={fName} onChange={e => setFName(e.target.value)} />
                    <Input label="Mobile Contact *" required value={fMobile} onChange={e => setFMobile(e.target.value)} />
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Branch Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select label="Preferred Branch" value={fBranch} onChange={e => setFBranch(e.target.value)} options={[
                      { value: '', label: 'No Preference' },
                      ...branchFilterOptions.filter(o => o.value !== 'All')
                    ]} disabled={currentUser?.role === 'branch-admin'} />
                    <Select label="Assigned Branch" value={fAssignedBranch} onChange={e => setFAssignedBranch(e.target.value)} options={[
                      { value: '', label: 'Assign Later' },
                      ...branchFilterOptions.filter(o => o.value !== 'All')
                    ]} />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Course & Status */}
            {modalTab === 'course' && (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Course Interest & Discovery</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Select label="Interested Course" value={fCourse} onChange={e => { setFCourse(e.target.value); setFProgram(''); setFLevel('year1'); }} options={courseFilterOptions.filter(o => o.value !== 'All')} />
                    <Select label="Program" value={fProgram} onChange={e => { setFProgram(e.target.value); }} options={[{ value: '', label: 'Select Program' }, ...(courses.find(c => c.name === fCourse)?.programs?.map(p => ({ value: p, label: p })) || [])]} />
                    <Select label="Level" value={fLevel} onChange={e => setFLevel(e.target.value)} options={[
                      { value: '', label: 'Select Level' },
                      { value: 'year1', label: 'Year 1 / Class 11' },
                      { value: 'year2', label: 'Year 2 / Class 12' },
                      { value: 'class8', label: 'Class 8' },
                      { value: 'class9', label: 'Class 9' },
                      { value: 'class10', label: 'Class 10' }
                    ]} />
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
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Remarks</label>
                    <textarea className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all min-h-[60px]" value={fRemarks} onChange={e => setFRemarks(e.target.value)} />
                  </div>
                </div>

                {fStatus === 'Demo Scheduled' && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-4">
                    <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wide">Demo Scheduling Details</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <Input label="Demo Scheduled On" type="date" value={fDemoScheduledOn} onChange={e => setFDemoScheduledOn(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Follow-up History */}
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

            {/* TAB 4: Fee & Admission */}
            {modalTab === 'fee' && (
              <div className="space-y-6 animate-fade-in pb-8">
                <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm mb-6">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
                    <UserCheck className="w-5 h-5 text-blue-600" /> Pre-Registration Fee Discussion
                  </h4>
                  <p className="text-xs text-slate-500">Configure the fee structure with the parent. When finalized, convert this lead to a registered student. The configuration will carry over.</p>
                </div>
                
                <FeeConfigurator 
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
                    ...availableBatchesForStudent.map(bName => ({
                      value: bName,
                      label: `${bName} (${selectedStudent.course || ''} - ${selectedStudent.program || ''})`
                    }))
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
                  onClick={() => {
                    if (selectedStudent && batchForm.batch) {
                      allocateBatch(
                        selectedStudent.id,
                        batchForm.batch,
                        selectedStudent.course || batchForm.course,
                        selectedStudent.program || batchForm.program,
                        selectedStudent.level || batchForm.level
                      );
                      addToast(`Successfully allocated batch ${batchForm.batch} to ${selectedStudent.name}!`, 'success');
                      setShowBatchModal(false);
                      setSelectedStudent(null);
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
          <Button variant="secondary" onClick={handleExportCSV} className="flex items-center gap-1.5 cursor-pointer">
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
          }} className="flex items-center gap-1.5 cursor-pointer" style={{ backgroundColor: '#2563eb', color: 'white' }}>
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

      {/* Shared Filters Panel */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={activeTab === 'pipeline' ? 'Search leads by name or course...' : 'Search students by ID, name or mobile...'}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 bg-white"
            />
          </div>

          <div className="md:col-span-3">
            <Select
              label="Stage Status"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              options={
                activeTab === 'pipeline' ? [
                  { value: 'All', label: 'All Stages' },
                  { value: 'New Enquiry', label: 'New Enquiry' },
                  { value: 'Contacted', label: 'Contacted' },
                  { value: 'Follow-up', label: 'Follow-up' },
                  { value: 'Demo Scheduled', label: 'Demo Scheduled' },
                  { value: 'Fee Discussion', label: 'Fee Discussion' },
                  { value: 'Interested', label: 'Interested' },
                  { value: 'Not Interested', label: 'Not Interested' }
                ] : activeTab === 'fee' ? [
                  { value: 'All', label: 'All Stages' },
                  { value: 'Fee Discussion', label: 'Fee Discussion' }
                ] : activeTab === 'admission' ? [
                  { value: 'All', label: 'All Statuses' },
                  { value: 'Registration Pending', label: 'Registration Pending' },
                  { value: 'Documents Submitted', label: 'Documents Submitted' },
                  { value: 'Verification Pending', label: 'Verification Pending' }
                ] : [
                  { value: 'All', label: 'All Statuses' },
                  { value: 'Verification Pending', label: 'Verification Pending' },
                  { value: 'Active Student', label: 'Active Student' }
                ]
              }
            />
          </div>

          {activeTab === 'pipeline' && (
            <div className="md:col-span-3">
              <Select
                label="Discovery Source"
                value={filterSource}
                onChange={e => setFilterSource(e.target.value)}
                options={[
                  { value: 'All', label: 'All Sources' },
                  { value: 'Walk-in', label: 'Walk-in' },
                  { value: 'Phone Call', label: 'Phone Call' },
                  { value: 'Website', label: 'Website' },
                  { value: 'Social Media', label: 'Social Media' },
                  { value: 'WhatsApp', label: 'WhatsApp' },
                  { value: 'Referral', label: 'Referral' },
                  { value: 'Google Ads', label: 'Google Ads' }
                ]}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-3">
          <Select label="Branch" value={filterBranch} onChange={e => setFilterBranch(e.target.value)} options={branchFilterOptions} disabled={currentUser?.role === 'branch-admin'} />
          <Select label="Course" value={filterCourse} onChange={e => { setFilterCourse(e.target.value); setFilterProgram('All'); }} options={courseFilterOptions} />
          <Select label="Program" value={filterProgram} onChange={e => setFilterProgram(e.target.value)} options={programFilterOptions} />
        </div>
      </div>

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
            <Table headers={['Lead ID', 'Student Name', 'Mobile', 'Course Interest', 'Branch', 'Stage', 'Counsellor', 'Actions']}>
              {paginatedLeads.map(l => (
                <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-xs text-slate-400">{l.id}</td>
                  <td className="px-6 py-4 font-semibold text-blue-600 hover:underline cursor-pointer" onClick={() => handleOpenLeadDetail(l)}>{l.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{l.mobile}</td>
                  <td className="px-6 py-4 text-xs text-slate-700 font-medium">{l.course}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{l.branch}</td>
                  <td className="px-6 py-4"><StatusBadge status={l.status} /></td>
                  <td className="px-6 py-4 text-xs text-slate-500">{l.counsellor}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => handleOpenLeadDetail(l, 'history')} className="cursor-pointer">
                        <PhoneCall size={12} className="mr-1" /> Call Log
                      </Button>
                      <Button variant="primary" size="sm" onClick={() => navigate(`/leads/${l.id}/convert`)} className="cursor-pointer" style={{ backgroundColor: '#2563eb', color: 'white' }}>
                        Convert <ChevronRight size={12} className="ml-1" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-400">No active leads matching current filters.</td></tr>
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
            <Table headers={['Lead ID', 'Student Name', 'Mobile', 'Course Interest', 'Assigned Branch', 'Stage', 'Counsellor', 'Next Follow-up', 'Remarks']}>
              {paginatedLeads.map(l => (
                <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-xs text-slate-400">{l.id}</td>
                  <td className="px-6 py-4 font-semibold text-blue-600 hover:underline cursor-pointer" onClick={() => handleOpenLeadDetail(l, 'fee')}>{l.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{l.mobile}</td>
                  <td className="px-6 py-4 text-xs text-slate-700 font-medium">{l.course}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{l.branch}</td>
                  <td className="px-6 py-4"><StatusBadge status={l.status} /></td>
                  <td className="px-6 py-4 text-xs text-slate-500">{l.counsellor}</td>
                  <td className="px-6 py-4 font-mono text-xs text-amber-700">{l.nextFollowUp || '—'}</td>
                  <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate">{l.remarks}</td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr><td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-400">No leads currently in the Fee Discussion queue.</td></tr>
              )}
            </Table>
            <Pagination currentPage={page} totalPages={totalPages} totalItems={filteredLeads.length} pageSize={PER_PAGE} onPageChange={setPage} />
          </Card>
        </div>
      )}

      {/* TAB CONTENT 3: ADMISSION & DOCS */}
      {activeTab === 'admission' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Registered',     value: stats.totalStudents, color: 'bg-slate-50 border-slate-200', text: 'text-slate-700' },
              { label: 'Verification Queue', value: stats.verificationPending, color: 'bg-violet-50 border-violet-200', text: 'text-violet-700' },
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
            <Table headers={['Student ID', 'Student Name', 'Mobile', 'Course Interest', 'Documents Status', 'Verification Status', 'Actions']}>
              {paginatedStudents.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-xs text-slate-400">{s.studentId}</td>
                  <td className="px-6 py-4 font-semibold text-blue-600 hover:underline cursor-pointer" onClick={() => navigate(`/leads/${s.id || s.studentId}/convert`)}>{s.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{s.mobile || '—'}</td>
                  <td className="px-6 py-4 text-xs text-slate-600 font-medium">{s.course}</td>
                  <td className="px-6 py-4">
                    {s.status === 'Active Student' ? (
                      <span className="text-emerald-600 text-xs font-semibold flex items-center gap-1"><CheckCircle size={12} /> Verified</span>
                    ) : (
                      <span className="text-amber-600 text-xs font-semibold flex items-center gap-1"><Clock size={12} /> Pending Review</span>
                    )}
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={s.status} /></td>
                  <td className="px-6 py-4">
                    {s.status !== 'Active Student' ? (
                      <Button variant="primary" size="sm" onClick={() => navigate(`/admission/${s.id || s.studentId}`)} className="cursor-pointer text-xs" style={{ backgroundColor: '#2563eb', color: 'white' }}>
                        Review Docs <ChevronRight size={12} className="ml-1" />
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400 font-semibold flex items-center gap-1"><CheckCircle size={12} className="text-emerald-500" /> Approved</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">No student records matching current filters.</td></tr>
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
            <Table headers={['Student ID', 'Student Name', 'Course', 'Branch', 'Admission Date', 'Current Batch', 'Status', 'Actions']}>
              {paginatedStudents.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-xs text-slate-400">{s.studentId}</td>
                  <td className="px-6 py-4 font-semibold text-blue-600 hover:underline cursor-pointer" onClick={() => handleOpenBatchModal(s)}>
                    {s.name}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-700">{s.course}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{s.branch}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{s.admissionDate || '—'}</td>
                  <td className="px-6 py-4">
                    {s.batch ? (
                      <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">{s.batch}</span>
                    ) : (
                      <span className="text-xs text-amber-600 font-semibold flex items-center gap-1"><Clock size={12} /> Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={s.status} /></td>
                  <td className="px-6 py-4">
                    <Button variant="secondary" size="sm" onClick={() => handleOpenBatchModal(s)} className="cursor-pointer text-xs">
                      <Layers size={12} className="mr-1" /> Allocate Batch
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-400">No student records found matching current filters.</td></tr>
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
            <Table headers={['Student ID', 'Student Name', 'Course', 'Batch', 'Total Fee', 'Paid', 'Outstanding', 'Status', 'Actions']}>
              {paginatedStudents.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-xs text-slate-400">{s.studentId}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800">{s.name}</td>
                  <td className="px-6 py-4 text-xs text-slate-600">{s.course}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{s.batch || '—'}</td>
                  <td className="px-6 py-4 text-xs font-semibold text-slate-800">₹{(s.feePlan?.total || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-xs font-bold text-emerald-600">₹{(s.feePlan?.paid || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-xs font-bold text-red-500">₹{(s.feePlan?.pending || 0).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    {s.status === 'Active Student' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded-md uppercase tracking-wider select-none">
                        <Zap size={10} className="fill-emerald-500 text-emerald-500" /> Active
                      </span>
                    ) : (
                      <StatusBadge status={s.status} />
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => {
                        const receipt = recordPayment(s.id, s.feePlan?.pending || 0, 'Cash');
                        if (receipt) {
                          addToast(`Collected fee downpayment of ₹${receipt.amount.toLocaleString()}. Student ${s.name} status activated.`, 'success');
                        }
                      }}
                      disabled={(s.feePlan?.pending || 0) === 0}
                      className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded border transition-colors select-none ${
                        (s.feePlan?.pending || 0) > 0
                          ? 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200 cursor-pointer'
                          : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                      }`}
                    >
                      Record Payment
                    </button>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr><td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-400">No student records found matching current filters.</td></tr>
              )}
            </Table>
            <Pagination currentPage={page} totalPages={totalPages} totalItems={filteredStudents.length} pageSize={PER_PAGE} onPageChange={setPage} />
          </Card>
        </div>
      )}

    </div>
  );
};
