import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Pagination } from '../components/ui/Pagination';
import { FeeConfigurator } from '../components/FeeConfigurator';
import {
  Plus, ArrowLeft, Users, PhoneCall, MessageSquare, DollarSign,
  ClipboardList, Layers, CheckCircle, Clock, XCircle, ChevronRight,
  Download, Search, UserCheck, FileText, Zap, X
} from 'lucide-react';
import { INITIAL_COURSES, INITIAL_BUNDLES_MAP, INITIAL_SUBJECTS_MAP } from '../data/mockData';
import { useFeeConfig } from '../context/FeeConfigContext';
import type { Lead, Student } from '../data/mockData';

interface LeadsAdmissionsProps {
  initialTab?: 'pipeline' | 'admission' | 'batch' | 'payment';
}

// ─── Status badge helper ────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    'New Enquiry':          'bg-blue-50 text-blue-700 border-blue-200',
    'Contacted':            'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Follow-up':            'bg-amber-50 text-amber-700 border-amber-200',
    'Demo Scheduled':       'bg-purple-50 text-purple-700 border-purple-200',
    'Interested':           'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Not Interested':       'bg-red-50 text-red-600 border-red-200',
    'Registration Pending': 'bg-orange-50 text-orange-700 border-orange-200',
    'Documents Submitted':  'bg-cyan-50 text-cyan-700 border-cyan-200',
    'Verification Pending': 'bg-violet-50 text-violet-700 border-violet-200',
    'Active Student':       'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  return (
    <span className={`inline-flex px-2.5 py-1 border rounded-md text-[10px] uppercase font-bold tracking-wide ${map[status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {status}
    </span>
  );
};

// ─── Phase progress bar ────────────────────────────────────────────────────
const phases = [
  { id: 'pipeline',    label: 'Lead Pipeline',          icon: Users },
  { id: 'admission',   label: 'Admission & Docs',        icon: ClipboardList },
  { id: 'batch',       label: 'Batch Allocation',        icon: Layers },
  { id: 'payment',     label: 'Payment & Activation',   icon: Zap },
] as const;

type TabId = typeof phases[number]['id'];

export const LeadsAdmissions: React.FC<LeadsAdmissionsProps> = ({ initialTab = 'pipeline' }) => {
  const { leads, students, courses, batches, branches, addLead, updateLead, addFollowup, convertLeadToStudent, approveStudentRegistration, currentUser } = useApp();
  const { plans, customBundles, subjectsData } = useFeeConfig();

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [successMsg, setSuccessMsg] = useState('');

  // Tab-to-route mapping for URL sync
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

  // ── shared search / filter ──
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterSource, setFilterSource] = useState('All');
  const [filterBranch, setFilterBranch] = useState(currentUser?.role === 'branch-admin' ? currentUser.branch || 'All' : 'All');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterProgram, setFilterProgram] = useState('All');

  // ── selected lead ──
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modalTab, setModalTab]         = useState<'profile' | 'course' | 'history' | 'fee'>('profile');
  const [leadFeeData, setLeadFeeData]   = useState<any>(null);

  // ── modal states ──
  const [showAddLead,    setShowAddLead]    = useState(false);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [showFollowup,   setShowFollowup]   = useState(false);
  const [showConvert,    setShowConvert]    = useState(false);
  const [showFeeModal,   setShowFeeModal]   = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // ── add lead form ──
  const [fName,    setFName]    = useState('');
  const [fMobile,  setFMobile]  = useState('');
  const [fCourse,  setFCourse]  = useState('JEE Prep');
  const [fProgram, setFProgram] = useState('');
  const [fLevel,   setFLevel]   = useState('');
  const [fSource,  setFSource]  = useState('Walk-in');
  const [fRemarks, setFRemarks] = useState('');
  const [fParent,  setFParent]  = useState('');
  const [fBranch,  setFBranch]  = useState('');
  const [fAssignedBranch, setFAssignedBranch] = useState('');
  const [fStatus,  setFStatus]  = useState('New Enquiry');
  const [fCounsellor, setFCounsellor] = useState('');
  const [fDemoScheduledOn, setFDemoScheduledOn] = useState('');

  // ── follow-up form ──
  const [fuType,    setFuType]    = useState('Call #1');
  const [fuOutcome, setFuOutcome] = useState('');
  const [fuNext,    setFuNext]    = useState('');
  const [fuDemo,    setFuDemo]    = useState(false);
  const [fuDemoDate, setFuDemoDate] = useState('');

  const [newInteractions, setNewInteractions] = useState<{type: string, status: string, remarks: string, date: string, nextDate: string}[]>([]);

  // ── fee / convert form ──
  const [feeBatch,    setFeeBatch]    = useState('');
  const [feeTotal,    setFeeTotal]    = useState(120000);
  const [feeDiscount, setFeeDiscount] = useState(0);
  const [feePaid,     setFeePaid]     = useState(40000);
  const [enrollType,  setEnrollType]  = useState('Standard');
  const [feeInstall,  setFeeInstall]  = useState('Full Payment');
  const [feeSelectedStandard, setFeeSelectedStandard] = useState('');
  const [feeMonths, setFeeMonths] = useState(12);
  const [feeInstallment, setFeeInstallment] = useState(0);
  const [feeSelectedBundle, setFeeSelectedBundle] = useState('');
  const [feeSelectedSubjects, setFeeSelectedSubjects] = useState<string[]>([]);

  // ── batch allocation form (for already-converted student) ──
  const [batchStudent,  setBatchStudent]  = useState<Student | null>(null);
  const [batchCourse,   setBatchCourse]   = useState('');
  const [batchProgram,  setBatchProgram]  = useState('');
  const [batchLevel,    setBatchLevel]    = useState('');
  const [batchSelected, setBatchSelected] = useState('');
  const [batchEnrollType, setBatchEnrollType] = useState('Standard');
  const [batchSubjects,  setBatchSubjects]  = useState<string[]>([]);

  const availableBatchLevels = useMemo(() => {
    if (!batchProgram) return [];
    if (batchProgram.includes('2 Year')) return [{value: 'year1', label: 'Year 1'}, {value: 'year2', label: 'Year 2'}];
    if (batchProgram.includes('1 Year')) return [{value: 'year1', label: 'Year 1'}];
    if (batchProgram.includes('8th')) return [{value: 'class8', label: 'Class 8'}];
    if (batchProgram.includes('9th')) return [{value: 'class9', label: 'Class 9'}];
    if (batchProgram.includes('10th')) return [{value: 'class10', label: 'Class 10'}];
    return [{value: 'year1', label: 'Year 1'}];
  }, [batchProgram]);

  useEffect(() => {
    if (availableBatchLevels.length > 0 && !availableBatchLevels.find(l => l.value === batchLevel)) {
      setBatchLevel(availableBatchLevels[0].value);
    }
  }, [availableBatchLevels, batchLevel]);

  useEffect(() => {
    const courseObj = INITIAL_COURSES.find(c => c.name === fCourse);
    if (!courseObj) return;

    const courseCode = courseObj.code;
    const mapKey = `${courseCode}-${fProgram}-${fLevel}`;

    if (enrollType === 'Standard') {
      const selected = plans.find(p => p.id === feeSelectedStandard);
      if (selected) {
        setFeeTotal(selected.totalFees);
        setFeePaid(selected.downPayment);
        setFeeMonths(selected.months);
        setFeeInstallment(selected.installment);
      } else {
        setFeeTotal(courseObj.fees || 0);
        setFeePaid(0);
        setFeeMonths(12);
        setFeeInstallment(0);
      }
    } else if (enrollType === 'Custom Combo') {
      const bundles = customBundles.filter(b => b.category === mapKey);
      const selected = bundles.find(b => b.id === feeSelectedBundle);
      setFeeTotal(selected ? selected.fee : 0);
    } else if (enrollType === 'Subject-wise') {
      const subjects = subjectsData.filter(s => s.category === mapKey);
      const total = subjects.filter(s => feeSelectedSubjects.includes(s.id)).reduce((acc: number, s: any) => acc + (s.fee || 0), 0);
      setFeeTotal(total);
    }
  }, [enrollType, fCourse, fProgram, fLevel, feeSelectedBundle, feeSelectedSubjects, feeSelectedStandard, plans, customBundles, subjectsData]);

  // Recalculate installment when manually editing fees or months
  useEffect(() => {
    if (['Standard', 'Custom Combo', 'Subject-wise'].includes(enrollType)) {
      const netFee = feeTotal - feeDiscount;
      const outstanding = netFee - feePaid;
      if (feeMonths > 0 && outstanding > 0) {
        setFeeInstallment(Math.round(outstanding / feeMonths));
      } else {
        setFeeInstallment(0);
      }
    }
  }, [feeTotal, feeDiscount, feePaid, feeMonths, enrollType]);

  // ── pagination ──
  const [page, setPage] = useState(1);
  const [stuPage, setStuPage] = useState(1);
  const PER_PAGE = 8;

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const resetLeadForm = () => {
    const initialBranch = currentUser?.role === 'branch-admin' ? currentUser.branch || '' : '';
    setFName('');
    setFMobile('');
    setFCourse('JEE Prep');
    setFProgram('');
    setFLevel('');
    setFBranch(initialBranch);
    setFAssignedBranch(initialBranch);
    setFSource('Walk-in');
    setFStatus('New Enquiry');
    setFRemarks('');
    setFParent('');
    setFDemoScheduledOn('');
    setNewInteractions([]);
    setModalTab('profile');
  };

  const handleOpenLeadDetail = (l: Lead) => {
    setSelectedLead(l);
    setFName(l.name);
    setFMobile(l.mobile);
    setFParent(l.parentMobile || '');
    setFDemoScheduledOn(l.demoScheduledOn || '');
    setFCourse(l.course);
    setFProgram(l.program || '');
    setFLevel(l.level || '');
    setFBranch(l.preferredBranch || '');
    setFAssignedBranch(l.branch || '');
    setFSource(l.source);
    setFStatus(l.status);
    setFCounsellor(l.counsellor || '');
    setFRemarks(l.remarks || '');
    setNewInteractions([{ type: 'Call', status: l.status, remarks: '', date: new Date().toISOString().split('T')[0], nextDate: '' }]);
    setModalTab('profile');
    setShowLeadDetail(true);
  };

  const handleAddInteractionField = () => {
    setNewInteractions([...newInteractions, { type: 'Call', status: fStatus, remarks: '', date: new Date().toISOString().split('T')[0], nextDate: '' }]);
  };



  // ── filter options ──
  const branchFilterOptions = useMemo(() => {
    if (currentUser?.role === 'branch-admin') {
      return [{ value: currentUser.branch || '', label: currentUser.branch || '' }];
    }
    return [
      { value: 'All', label: 'All Branches' },
      ...branches.map(b => ({ value: b.name, label: b.name }))
    ];
  }, [branches, currentUser]);

  const courseFilterOptions = useMemo(() => [
    { value: 'All', label: 'All Courses' },
    ...courses.map(c => ({ value: c.name, label: c.name }))
  ], [courses]);

  const programFilterOptions = useMemo(() => {
    const opts = new Set<string>();
    if (filterCourse !== 'All') {
      const c = courses.find(x => x.name === filterCourse);
      c?.programs?.forEach(p => opts.add(p));
    } else {
      courses.forEach(c => c.programs?.forEach(p => opts.add(p)));
    }
    return [
      { value: 'All', label: 'All Programs' },
      ...Array.from(opts).map(p => ({ value: p, label: p }))
    ];
  }, [courses, filterCourse]);

  // ── filtered leads ──
  const filteredLeads = useMemo(() =>
    leads
      .filter(l => {
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
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
    [leads, search, filterStatus, filterSource, filterBranch, filterCourse, filterProgram, courses]
  );

  const pipelineLeads  = filteredLeads.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages     = Math.ceil(filteredLeads.length / PER_PAGE);

  // ── filtered students ──
  const filteredStudents = useMemo(() =>
    students.filter(s => {
      const q = search.toLowerCase();
      const matchQ = s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q);
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
        if (!matchProgram) {
          const courseObj = courses.find(c => c.name === s.course);
          if (courseObj?.programs?.includes(filterProgram)) matchProgram = true;
        }
      }
      return matchQ && matchSt && matchBranch && matchCourse && matchProgram;
    }),
    [students, search, filterStatus, filterBranch, filterCourse, filterProgram, batches, courses]
  );
  const paginatedStudents = filteredStudents.slice((stuPage - 1) * PER_PAGE, stuPage * PER_PAGE);
  const stuTotalPages = Math.ceil(filteredStudents.length / PER_PAGE);

  // ── course program options ──
  const courseOptions = useMemo(() => courses.map(c => ({ value: c.name, label: c.name })), [courses]);
  const programOptions = useMemo(() => {
    const c = courses.find(x => x.name === batchCourse);
    return c?.programs?.map(p => ({ value: p, label: p })) ?? [];
  }, [batchCourse, courses]);
  const batchOptions = useMemo(() =>
    batches.filter(b => b.course === batchCourse && (!batchProgram || b.program === batchProgram)).map(b => ({ value: b.name, label: b.name })),
    [batches, batchCourse, batchProgram]
  );

  // ── CSV export ──
  const exportCSV = () => {
    if (filteredLeads.length === 0) return;
    const headers = ['Lead ID', 'Name', 'Mobile', 'Course', 'Source', 'Counsellor', 'Status', 'Next Follow-up', 'Remarks'];
    const rows = filteredLeads.map(l => [l.id, l.name, l.mobile, l.course, l.source, l.counsellor, l.status, l.nextFollowUp, l.remarks]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'leads_admissions.csv'; a.click();
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  VIEW: Lead Details
  // ─────────────────────────────────────────────────────────────────────────
  if (showLeadDetail && selectedLead) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => { setShowLeadDetail(false); setSelectedLead(null); resetLeadForm(); }} className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
            <ArrowLeft size={26} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">Lead Details: {selectedLead.name}</h2>
            <p className="text-sm text-slate-500">Edit enquiry details below.</p>
          </div>
        </div>
        <div className="w-full">
          <form onSubmit={e => {
            e.preventDefault();
            const validInteractions = newInteractions.filter(ni => ni.remarks.trim() !== '');
            const additionalFollowups = validInteractions.map(ni => ({
              id: Math.random().toString(36).substr(2, 9),
              date: new Date(ni.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
              type: ni.type,
              outcome: ni.remarks,
              nextDate: ni.nextDate ? new Date(ni.nextDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : ''
            }));
            const finalStatus = validInteractions.length > 0 ? validInteractions[validInteractions.length - 1].status : fStatus;

            // If the last valid interaction has a next date, update the lead's global nextFollowUp
            const finalNextFollowUp = validInteractions.length > 0 && validInteractions[validInteractions.length - 1].nextDate 
              ? validInteractions[validInteractions.length - 1].nextDate 
              : selectedLead.nextFollowUp;

            updateLead(selectedLead.id, {
              name: fName, mobile: fMobile, course: fCourse, program: fProgram, level: fLevel, preferredBranch: fBranch, branch: fAssignedBranch, source: fSource, counsellor: fCounsellor, status: finalStatus as Lead['status'], demoScheduledOn: fDemoScheduledOn, remarks: fRemarks, nextFollowUp: finalNextFollowUp,
              followups: [...(selectedLead.followups || []), ...additionalFollowups]
            });
            setShowLeadDetail(false);
            setSelectedLead(null);
            showSuccess('Lead updated successfully.');
          }} className="space-y-4">
            <div className="flex gap-4 border-b border-slate-200 mb-6">
              {['profile', 'course', 'history', 'fee'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setModalTab(t as any)}
                  className={`pb-3 font-semibold text-sm border-b-2 transition-colors ${modalTab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  {t === 'profile' ? 'Profile Details' : t === 'course' ? 'Course & Status' : t === 'history' ? 'Follow-up History' : 'Fee & Admission'}
                </button>
              ))}
            </div>

            {modalTab === 'profile' && (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Student & Contact Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Student Name" required value={fName} onChange={e => setFName(e.target.value)} />
                <Input label="Mobile Contact" required value={fMobile} onChange={e => setFMobile(e.target.value)} />
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

            {modalTab === 'course' && (
            <div className="space-y-4 animate-fade-in">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Course Interest & Discovery</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select label="Interested Course" value={fCourse} onChange={e => setFCourse(e.target.value)} options={courseOptions} />
                <Select label="Program" value={fProgram} onChange={e => setFProgram(e.target.value)} options={[{ value: '', label: 'Select Program' }, ...(courses.find(c => c.name === fCourse)?.programs?.map(p => ({ value: p, label: p })) || [])]} />
                <Select label="Level" value={fLevel} onChange={e => setFLevel(e.target.value)} options={[{ value: '', label: 'Select Level' }, { value: 'Beginner', label: 'Beginner' }, { value: 'Intermediate', label: 'Intermediate' }, { value: 'Advanced', label: 'Advanced' }]} />
                <Select label="Discovery Source" value={fSource} onChange={e => setFSource(e.target.value)} options={[
                  { value: 'Walk-in', label: 'Walk-in at Branch' },
                  { value: 'Phone Call', label: 'Phone Call' },
                  { value: 'Website', label: 'Website / Landing Page' },
                  { value: 'Social Media', label: 'Social Media' },
                  { value: 'WhatsApp', label: 'WhatsApp Enquiry' },
                  { value: 'Referral', label: 'Student Referral' },
                  { value: 'Flyer Campaign', label: 'Offline Campaign / Event' },
                  { value: 'Google Ads', label: 'Google Ads' },
                  { value: 'Staff Entry', label: 'Staff Manual Entry' },
                  { value: 'Bulk Import', label: 'Bulk Import' },
                ]} />
                <Select label="Stage Status" value={fStatus} onChange={e => setFStatus(e.target.value)} options={[
                  { value: 'New Enquiry', label: 'New Enquiry' },
                  { value: 'Contacted', label: 'Contacted' },
                  { value: 'Follow-up', label: 'Follow-up' },
                  { value: 'Demo Scheduled', label: 'Demo Scheduled' },
                  { value: 'Interested', label: 'Interested' },
                  { value: 'Not Interested', label: 'Not Interested' },
                ]} />
                <Select label="Assigned Counsellor" value={fCounsellor} onChange={e => setFCounsellor(e.target.value)} options={[
                  { value: '', label: 'Select Counsellor' },
                  { value: 'Priya Sen', label: 'Priya Sen' },
                  { value: 'Amit Verma', label: 'Amit Verma' },
                  { value: 'Sneha Kulkarni', label: 'Sneha Kulkarni' },
                  { value: 'Rahul Mehta', label: 'Rahul Mehta' },
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
                  <Input label="Demo Scheduled On (Status Change Date)" type="date" value={fDemoScheduledOn} onChange={e => setFDemoScheduledOn(e.target.value)} />
                </div>
              </div>
            )}
            </div>
            )}

            {modalTab === 'history' && (
            <div className="space-y-4 animate-fade-in">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Follow-up History</h4>
              
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Log New Interactions</h4>
                <Button type="button" variant="secondary" onClick={handleAddInteractionField} style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>+ Add Interaction</Button>
              </div>

              {newInteractions.map((ni, idx) => (
                <div key={idx} className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm space-y-3 relative">
                  {newInteractions.length > 1 && (
                    <button type="button" onClick={() => setNewInteractions(newInteractions.filter((_, i) => i !== idx))} className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors">
                      <X size={16} />
                    </button>
                  )}
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Interaction #{idx + 1}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <Input label="Date" type="date" value={ni.date} onChange={e => {
                      const copy = [...newInteractions]; copy[idx].date = e.target.value; setNewInteractions(copy);
                    }} />
                    <Select label="Type" value={ni.type} onChange={e => {
                      const copy = [...newInteractions]; copy[idx].type = e.target.value; setNewInteractions(copy);
                    }} options={[
                      { value: 'Call', label: 'Phone Call' },
                      { value: 'Walk-in', label: 'Walk-in Meet' },
                      { value: 'WhatsApp', label: 'WhatsApp' },
                      { value: 'Email', label: 'Email' },
                    ]} />
                    <Select label="Update Status To" value={ni.status} onChange={e => {
                      const copy = [...newInteractions]; copy[idx].status = e.target.value; setNewInteractions(copy);
                    }} options={[
                      { value: 'New Enquiry', label: 'New Enquiry' },
                      { value: 'Follow-up', label: 'Follow-up' },
                      { value: 'Demo Scheduled', label: 'Demo Scheduled' },
                      { value: 'Interested', label: 'Interested' },
                      { value: 'Not Interested', label: 'Not Interested' },
                    ]} />
                    <Input label="Next Follow-up" type="date" value={ni.nextDate} onChange={e => {
                      const copy = [...newInteractions]; copy[idx].nextDate = e.target.value; setNewInteractions(copy);
                    }} />
                  </div>
                  <textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all min-h-[50px]" placeholder="Meeting notes, remarks, or call outcome..." value={ni.remarks} onChange={e => {
                      const copy = [...newInteractions]; copy[idx].remarks = e.target.value; setNewInteractions(copy);
                  }} />
                  {ni.status === 'Demo Scheduled' && (
                    <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-3">
                      <h4 className="text-[10px] font-bold text-purple-700 uppercase tracking-wide">Demo Scheduling Details</h4>
                      <div className="grid grid-cols-1 gap-3">
                        <Input label="Demo Scheduled On" type="date" value={fDemoScheduledOn} onChange={e => setFDemoScheduledOn(e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {selectedLead.followups && selectedLead.followups.length > 0 ? (
                <div className="space-y-3">
                  {selectedLead.followups.map((fu, idx) => (
                    <div key={idx} className="flex gap-3 text-sm bg-white p-3 border border-slate-100 rounded-lg shadow-sm">
                      <div className="w-24 shrink-0 font-mono text-xs font-semibold text-slate-500 pt-0.5">{fu.date}</div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{fu.type}</span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">{(fu as any).counsellor || selectedLead.counsellor}</span>
                        </div>
                        <div className="text-slate-600 leading-snug">{fu.outcome}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500 italic py-2 text-center bg-white border border-slate-100 rounded-lg">No follow-ups recorded yet.</div>
              )}
            </div>
            </div>
            )}

            {modalTab === 'fee' && (
              <div className="space-y-6 animate-fade-in pb-8">
                <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm mb-6">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
                    <UserCheck className="w-5 h-5 text-blue-600" /> Pre-Registration Fee Discussion
                  </h4>
                  <p className="text-xs text-slate-500">Configure the fee structure with the parent. When finalized, convert this lead to a registered student. The configuration will carry over.</p>
                </div>
                
                <FeeConfigurator 
                  initialCourse={selectedLead.course}
                  initialProgram={selectedLead.program}
                  initialLevel={selectedLead.level}
                  onChange={(data) => setLeadFeeData(data)}
                />

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 mt-6">
                  <Button type="button" variant="secondary" onClick={() => {
                    alert('Fee configuration saved successfully.');
                    setShowLeadDetail(false);
                    setSelectedLead(null);
                  }} style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
                    Save Configuration
                  </Button>
                  <Button type="button" variant="primary" onClick={() => navigate(`/leads/${selectedLead.id}/convert`, { state: { prefilledFeeData: leadFeeData } })} style={{ backgroundColor: '#10b981', color: 'white', padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
                    Convert to Student <ChevronRight size={20} className="ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {modalTab !== 'fee' && (
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-6">
                <Button variant="secondary" onClick={() => { setShowLeadDetail(false); setSelectedLead(null); }} type="button">Cancel</Button>
                <Button variant="primary" style={{ backgroundColor: '#2563eb', color: 'white' }} type="submit">Save Changes</Button>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  MODAL: Add Lead
  // ─────────────────────────────────────────────────────────────────────────
  if (showAddLead) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowAddLead(false)} className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
            <ArrowLeft size={26} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">Log New Enquiry</h2>
            <p className="text-sm text-slate-500">Record a new lead / enquiry in the CRM pipeline.</p>
          </div>
        </div>
        <div className="w-full">
          <form onSubmit={e => {
            e.preventDefault();
            const validInteractions = newInteractions.filter(ni => ni.remarks.trim() !== '');
            const additionalFollowups = validInteractions.map(ni => ({
              id: Math.random().toString(36).substr(2, 9),
              date: new Date(ni.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
              type: ni.type,
              outcome: ni.remarks,
              nextDate: ni.nextDate ? new Date(ni.nextDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : ''
            }));
            const finalStatus = validInteractions.length > 0 ? validInteractions[validInteractions.length - 1].status : fStatus;

            addLead(fName, fMobile, fParent, fCourse, fProgram, fLevel, fSource, fRemarks, fAssignedBranch, fBranch, finalStatus, additionalFollowups, fDemoScheduledOn, fCounsellor);
            
            setFName(''); setFMobile(''); setFRemarks(''); setFParent(''); setFBranch(''); setFAssignedBranch(''); setFStatus('New Enquiry'); setFCounsellor(''); setFProgram(''); setFLevel(''); setFDemoScheduledOn(''); setNewInteractions([]);
            setShowAddLead(false);
            showSuccess('Enquiry logged successfully and assigned to counsellor.');
          }} className="space-y-4">
            <div className="flex gap-4 border-b border-slate-200 mb-6">
              {['profile', 'course', 'history', 'fee'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setModalTab(t as any)}
                  className={`pb-3 font-semibold text-sm border-b-2 transition-colors ${modalTab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  {t === 'profile' ? 'Profile Details' : t === 'course' ? 'Course & Status' : t === 'history' ? 'Follow-up History' : 'Fee & Admission'}
                </button>
              ))}
            </div>

            {modalTab === 'profile' && (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Student & Contact Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Student Name" required placeholder="e.g. Aarav Sharma" value={fName} onChange={e => setFName(e.target.value)} />
                <Input label="Mobile Contact" required placeholder="9876543210" value={fMobile} onChange={e => setFMobile(e.target.value)} />
              </div>
              <Input label="Parent / Guardian Mobile" placeholder="9876543211" value={fParent} onChange={e => setFParent(e.target.value)} />
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
                ]} disabled={currentUser?.role === 'branch-admin'} />
              </div>
            </div>
            </div>
            )}

            {modalTab === 'course' && (
            <div className="space-y-4 animate-fade-in">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Course Interest & Discovery</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select label="Interested Course" value={fCourse} onChange={e => setFCourse(e.target.value)} options={courseOptions} />
                <Select label="Program" value={fProgram} onChange={e => setFProgram(e.target.value)} options={[{ value: '', label: 'Select Program' }, ...(courses.find(c => c.name === fCourse)?.programs?.map(p => ({ value: p, label: p })) || [])]} />
                <Select label="Level" value={fLevel} onChange={e => setFLevel(e.target.value)} options={[{ value: '', label: 'Select Level' }, { value: 'Beginner', label: 'Beginner' }, { value: 'Intermediate', label: 'Intermediate' }, { value: 'Advanced', label: 'Advanced' }]} />
                <Select label="Discovery Source" value={fSource} onChange={e => setFSource(e.target.value)} options={[
                  { value: 'Walk-in', label: 'Walk-in at Branch' },
                  { value: 'Phone Call', label: 'Phone Call' },
                  { value: 'Website', label: 'Website / Landing Page' },
                  { value: 'Social Media', label: 'Social Media' },
                  { value: 'WhatsApp', label: 'WhatsApp Enquiry' },
                  { value: 'Referral', label: 'Student Referral' },
                  { value: 'Flyer Campaign', label: 'Offline Campaign / Event' },
                  { value: 'Google Ads', label: 'Google Ads' },
                  { value: 'Staff Entry', label: 'Staff Manual Entry' },
                  { value: 'Bulk Import', label: 'Bulk Import' },
                ]} />
                <Select label="Stage Status" value={fStatus} onChange={e => setFStatus(e.target.value)} options={[
                  { value: 'New Enquiry', label: 'New Enquiry' },
                  { value: 'Contacted', label: 'Contacted' },
                  { value: 'Follow-up', label: 'Follow-up' },
                  { value: 'Demo Scheduled', label: 'Demo Scheduled' },
                  { value: 'Interested', label: 'Interested' },
                  { value: 'Not Interested', label: 'Not Interested' },
                ]} />
                <Select label="Assigned Counsellor" value={fCounsellor} onChange={e => setFCounsellor(e.target.value)} options={[
                  { value: '', label: 'Select Counsellor' },
                  { value: 'Priya Sen', label: 'Priya Sen' },
                  { value: 'Amit Verma', label: 'Amit Verma' },
                  { value: 'Sneha Kulkarni', label: 'Sneha Kulkarni' },
                  { value: 'Rahul Mehta', label: 'Rahul Mehta' },
                ]} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Remarks</label>
                <textarea rows={3} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all min-h-[60px]" placeholder="Needs weekend slot, interested in demo..." value={fRemarks} onChange={e => setFRemarks(e.target.value)} />
              </div>
            </div>

            {fStatus === 'Demo Scheduled' && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-4">
                <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wide">Demo Scheduling Details</h4>
                <div className="grid grid-cols-1 gap-4">
                  <Input label="Demo Scheduled On (Status Change Date)" type="date" value={fDemoScheduledOn} onChange={e => setFDemoScheduledOn(e.target.value)} />
                </div>
              </div>
            )}
            </div>
            )}

            {modalTab === 'history' && (
            <div className="space-y-4 animate-fade-in">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Initial Interactions (Optional)</h4>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Log New Interactions</h4>
                <Button type="button" variant="secondary" onClick={handleAddInteractionField} style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>+ Add Interaction</Button>
              </div>

              {newInteractions.map((ni, idx) => (
                <div key={idx} className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm space-y-3 relative">
                  {newInteractions.length > 1 && (
                    <button type="button" onClick={() => setNewInteractions(newInteractions.filter((_, i) => i !== idx))} className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors">
                      <X size={16} />
                    </button>
                  )}
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Interaction #{idx + 1}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <Input label="Date" type="date" value={ni.date} onChange={e => {
                      const copy = [...newInteractions]; copy[idx].date = e.target.value; setNewInteractions(copy);
                    }} />
                    <Select label="Type" value={ni.type} onChange={e => {
                      const copy = [...newInteractions]; copy[idx].type = e.target.value; setNewInteractions(copy);
                    }} options={[
                      { value: 'Call', label: 'Phone Call' },
                      { value: 'Walk-in', label: 'Walk-in Meet' },
                      { value: 'WhatsApp', label: 'WhatsApp' },
                      { value: 'Email', label: 'Email' },
                    ]} />
                    <Select label="Update Status To" value={ni.status} onChange={e => {
                      const copy = [...newInteractions]; copy[idx].status = e.target.value; setNewInteractions(copy);
                    }} options={[
                      { value: 'New Enquiry', label: 'New Enquiry' },
                      { value: 'Follow-up', label: 'Follow-up' },
                      { value: 'Demo Scheduled', label: 'Demo Scheduled' },
                      { value: 'Interested', label: 'Interested' },
                      { value: 'Not Interested', label: 'Not Interested' },
                    ]} />
                    <Input label="Next Follow-up" type="date" value={ni.nextDate} onChange={e => {
                      const copy = [...newInteractions]; copy[idx].nextDate = e.target.value; setNewInteractions(copy);
                    }} />
                  </div>
                  <textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all min-h-[50px]" placeholder="Meeting notes, remarks, or call outcome..." value={ni.remarks} onChange={e => {
                      const copy = [...newInteractions]; copy[idx].remarks = e.target.value; setNewInteractions(copy);
                  }} />
                  {ni.status === 'Demo Scheduled' && (
                    <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-3">
                      <h4 className="text-[10px] font-bold text-purple-700 uppercase tracking-wide">Demo Scheduling Details</h4>
                      <div className="grid grid-cols-1 gap-3">
                        <Input label="Demo Scheduled On" type="date" value={fDemoScheduledOn} onChange={e => setFDemoScheduledOn(e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            </div>
            )}

            {modalTab === 'fee' && (
              <div className="space-y-6 animate-fade-in p-6 bg-slate-50 border border-slate-200 rounded-lg text-center flex flex-col items-center justify-center min-h-[250px]">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-2">
                  <UserCheck size={24} />
                </div>
                <h4 className="text-md font-bold text-slate-800">Save Enquiry First</h4>
                <p className="text-sm text-slate-500 max-w-sm">Please save this enquiry to the CRM pipeline before you can convert it into a registered student.</p>
              </div>
            )}

            {modalTab !== 'fee' && (
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <Button type="button" variant="ghost" onClick={() => setShowAddLead(false)}>Cancel</Button>
                <Button type="submit" variant="primary" style={{ backgroundColor: '#2563eb', color: 'white' }}>Save Enquiry</Button>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  MODAL: Log Follow-up / Counselling
  // ─────────────────────────────────────────────────────────────────────────
  if (showFollowup && selectedLead) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => { setShowFollowup(false); setSelectedLead(null); }} className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
            <ArrowLeft size={26} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">Log Counselling: {selectedLead.name}</h2>
            <p className="text-sm text-slate-500">Record counselling discussion, contact attempt, or callback outcome.</p>
          </div>
        </div>
        <div className="w-full">
          {/* Lead summary card */}
          <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap gap-4 text-sm">
            <div><span className="text-xs text-slate-400 font-semibold uppercase">Mobile</span><div className="font-mono font-bold text-slate-700 mt-0.5">{selectedLead.mobile}</div></div>
            <div><span className="text-xs text-slate-400 font-semibold uppercase">Course Interest</span><div className="font-semibold text-slate-700 mt-0.5">{selectedLead.course}</div></div>
            <div><span className="text-xs text-slate-400 font-semibold uppercase">Source</span><div className="font-semibold text-slate-700 mt-0.5">{selectedLead.source}</div></div>
            <div><span className="text-xs text-slate-400 font-semibold uppercase">Current Stage</span><div className="mt-0.5"><StatusBadge status={selectedLead.status} /></div></div>
          </div>
          <form onSubmit={e => {
            e.preventDefault();
            addFollowup(selectedLead.id, fuType, fuOutcome, fuNext);
            setFuOutcome(''); setFuNext(''); setFuDemo(false); setFuDemoDate('');
            setShowFollowup(false); setSelectedLead(null);
            showSuccess('Follow-up logged and next callback scheduled.');
          }} className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Contact Attempt</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Interaction Type" value={fuType} onChange={e => setFuType(e.target.value)} options={[
                  { value: 'Call #1', label: 'Call #1 — First Introduction' },
                  { value: 'Call #2', label: 'Call #2 — Demo / Structure Check' },
                  { value: 'Call #3', label: 'Call #3 — Fee Negotiation' },
                  { value: 'Walk-in', label: 'In-Office Counselling Session' },
                  { value: 'WhatsApp', label: 'WhatsApp Follow-up' },
                  { value: 'Email', label: 'Email Outreach' },
                ]} />
                <Input label="Next Follow-up Date" type="date" value={fuNext} onChange={e => setFuNext(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Counselling Discussion & Outcome <span className="text-red-500">*</span></label>
                <textarea required rows={4} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Explained course structure, batch timings, fee plan. Student interested in demo class. Parent agreed to attend Saturday session." value={fuOutcome} onChange={e => setFuOutcome(e.target.value)} />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Demo Class</h4>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={fuDemo} onChange={e => setFuDemo(e.target.checked)} className="w-4 h-4 text-blue-600 border-slate-300 rounded" />
                <span className="text-sm text-slate-700 font-medium">Schedule demo class for this student</span>
              </label>
              {fuDemo && (
                <Input label="Demo Date" type="date" value={fuDemoDate} onChange={e => setFuDemoDate(e.target.value)} />
              )}
            </div>
            {/* Previous follow-up history */}
            {selectedLead.followups.length > 0 && (
              <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-2">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Previous Follow-up History</h4>
                {selectedLead.followups.map((f, i) => (
                  <div key={i} className="flex gap-3 text-xs py-2 border-b border-slate-100 last:border-0">
                    <div className="text-slate-400 font-mono whitespace-nowrap">{f.date}</div>
                    <div className="font-semibold text-slate-600 whitespace-nowrap">{f.type}</div>
                    <div className="text-slate-500 flex-1">{f.outcome}</div>
                    {f.nextDate && <div className="text-blue-500 whitespace-nowrap">→ {f.nextDate}</div>}
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => { setShowFollowup(false); setSelectedLead(null); }}>Cancel</Button>
              <Button type="submit" variant="primary" style={{ backgroundColor: '#2563eb', color: 'white' }}>Log Outcome</Button>
            </div>
          </form>
        </div>
      </div>
    );
  }



  // ─────────────────────────────────────────────────────────────────────────
  //  MODAL: Batch Allocation for existing student
  // ─────────────────────────────────────────────────────────────────────────
  if (showBatchModal && batchStudent) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => { setShowBatchModal(false); setBatchStudent(null); }} className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
            <ArrowLeft size={26} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">Batch Allocation: {batchStudent.name}</h2>
            <p className="text-sm text-slate-500">Assign course, program, level, batch and enrollment type.</p>
          </div>
        </div>
        <div className="w-full space-y-4">
          {/* Academic Hierarchy */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Academic Hierarchy Selection</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Step 1 — Select Course"
                options={[{ value: '', label: 'Select a course...' }, ...courseOptions]}
                value={batchCourse}
                onChange={e => { setBatchCourse(e.target.value); setBatchProgram(''); setBatchLevel(''); setBatchSelected(''); }}
              />
              <Select
                label="Step 2 — Select Program"
                options={[{ value: '', label: 'Select a program...' }, ...programOptions]}
                value={batchProgram}
                onChange={e => { setBatchProgram(e.target.value); setBatchLevel(''); setBatchSelected(''); }}
                disabled={!batchCourse}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Step 3 — Select Academic Level"
                options={[
                  { value: '', label: 'Select a level...' },
                  ...availableBatchLevels
                ]}
                value={batchLevel}
                onChange={e => { setBatchLevel(e.target.value); setBatchSelected(''); }}
                disabled={!batchProgram}
              />
              <Select
                label="Step 4 — Select Batch"
                options={[{ value: '', label: 'Select a batch...' }, ...batchOptions]}
                value={batchSelected}
                onChange={e => setBatchSelected(e.target.value)}
                disabled={!batchLevel}
              />
            </div>
            {batchSelected && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                <strong>System note:</strong> Course, Program and Academic Level are automatically derived from the selected batch. Batch contains assigned teachers, timetable, classroom allocation, and capacity.
              </div>
            )}
          </div>
          {/* Enrollment type */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Enrollment Type</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {['Standard Enrollment', 'Custom Combo', 'Subject-wise'].map(et => (
                <label key={et} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${batchEnrollType === et ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                  <input type="radio" name="batchEnroll" value={et} checked={batchEnrollType === et} onChange={() => setBatchEnrollType(et)} className="text-blue-600" />
                  <div>
                    <div className="text-sm font-semibold text-slate-700">{et}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {et === 'Standard Enrollment' && 'Full subject set of batch'}
                      {et === 'Custom Combo' && 'Institute-defined combos'}
                      {et === 'Subject-wise' && 'Individual subject selection'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            {batchEnrollType === 'Subject-wise' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 space-y-1">
                <div className="font-bold">Subject-wise Enrollment Rules:</div>
                <div>• Minimum 3 subjects required</div>
                <div>• Mandatory base subjects (e.g., Maths is compulsory)</div>
                <div>• Compulsory core package must be taken first</div>
              </div>
            )}
            {batchEnrollType !== 'Standard Enrollment' && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-700">Subject Enrollment Map will enforce:</div>
                <div>• Timetable: student portal shows only enrolled subject sessions</div>
                <div>• Attendance roster: student appears only in enrolled subject lectures</div>
                <div>• Assignments & Exams: delivered only for enrolled subjects</div>
                <div>• Fee: calculated based on selected combo or subjects</div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => { setShowBatchModal(false); setBatchStudent(null); }}>Cancel</Button>
            <Button
              type="button"
              variant="primary"
              disabled={!batchSelected}
              style={{ backgroundColor: '#2563eb', color: 'white' }}
              onClick={() => {
                setShowBatchModal(false); setBatchStudent(null);
                showSuccess(`Batch "${batchSelected}" allocated to ${batchStudent.name}.`);
              }}
            >
              Confirm Batch Allocation
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  MAIN PAGE RENDER
  // ─────────────────────────────────────────────────────────────────────────

  // Stats for pipeline header
  const stats = {
    total:       leads.length,
    new:         leads.filter(l => l.status === 'New Enquiry').length,
    followup:    leads.filter(l => l.status === 'Follow-up').length,
    interested:  leads.filter(l => l.status === 'Interested').length,
    lost:        leads.filter(l => l.status === 'Not Interested').length,
    converted:   students.length,
    active:      students.filter(s => s.status === 'Active Student').length,
    pending:     students.filter(s => s.status !== 'Active Student').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── success toast ── */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-600" />
          {successMsg}
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Leads & Admissions</h2>
          <p className="text-sm text-slate-500 mt-1">Full pipeline from initial enquiry to active student — follow the flow below.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={exportCSV} className="flex items-center gap-1.5">
            <Download size={15} /> Export CSV
          </Button>
          <Button variant="primary" onClick={() => { resetLeadForm(); setShowAddLead(true); }} style={{ backgroundColor: '#2563eb', color: 'white' }} className="flex items-center gap-1.5">
            <Plus size={15} /> Log Enquiry
          </Button>
        </div>
      </div>

      {/* ── Flow phase tabs ── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto">
          {phases.map((p, idx) => {
            const Icon = p.icon;
            const isActive = activeTab === p.id;
            return (
              <button
                key={p.id}
                onClick={() => navigate(tabRouteMap[p.id])}
                className={`flex-1 min-w-[120px] flex flex-col items-center gap-1.5 px-4 py-3.5 text-center transition-all border-b-2 cursor-pointer relative
                  ${isActive
                    ? 'border-blue-600 bg-blue-50/70 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
              >
                {/* connector line */}
                {idx < phases.length - 1 && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 z-10 text-slate-300">
                    <ChevronRight size={14} />
                  </span>
                )}
                <Icon size={16} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                <span className="text-[11px] font-semibold leading-tight whitespace-nowrap">{p.label}</span>
                {/* phase number pill */}
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  Phase {idx + 1}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Search / Filter bar ── */}
      <div className="flex flex-col gap-4 bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div className="sm:col-span-2 relative flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Search</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder={activeTab === 'pipeline' ? 'Search leads by name, mobile or course...' : 'Search students by name or ID...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white"
              />
            </div>
          </div>
          {activeTab === 'pipeline' || activeTab === 'admission' ? (
            <>
              <Select label="Stage Status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} options={
                activeTab === 'pipeline' ? [
                  { value: 'All', label: 'All Stages' },
                  { value: 'New Enquiry', label: 'New Enquiry' },
                  { value: 'Contacted', label: 'Contacted' },
                  { value: 'Follow-up', label: 'Follow-up' },
                  { value: 'Demo Scheduled', label: 'Demo Scheduled' },
                  { value: 'Interested', label: 'Interested' },
                  { value: 'Not Interested', label: 'Not Interested' },
                ] : [
                  { value: 'All', label: 'All Stages' },
                  { value: 'Registration Pending', label: 'Registration Pending' },
                  { value: 'Documents Submitted', label: 'Documents Submitted' },
                  { value: 'Verification Pending', label: 'Verification Pending' }
                ]
              } />
              <Select label="Discovery Source" value={filterSource} onChange={e => setFilterSource(e.target.value)} options={[
                { value: 'All', label: 'All Sources' },
                { value: 'Walk-in', label: 'Walk-in' },
                { value: 'Phone Call', label: 'Phone Call' },
                { value: 'Website', label: 'Website' },
                { value: 'Social Media', label: 'Social Media' },
                { value: 'WhatsApp', label: 'WhatsApp' },
                { value: 'Referral', label: 'Referral' },
                { value: 'Google Ads', label: 'Google Ads' },
                { value: 'Flyer Campaign', label: 'Flyer Campaign' },
              ]} />
            </>
          ) : (
            <Select label="Status Filter" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} options={[
              { value: 'All', label: 'All Statuses' },
              { value: 'Registration Pending', label: 'Registration Pending' },
              { value: 'Documents Submitted', label: 'Documents Submitted' },
              { value: 'Verification Pending', label: 'Verification Pending' },
              { value: 'Active Student', label: 'Active Student' },
            ]} />
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <Select label="Branch" value={filterBranch} onChange={e => setFilterBranch(e.target.value)} options={branchFilterOptions} disabled={currentUser?.role === 'branch-admin'} />
          <Select label="Course" value={filterCourse} onChange={e => { setFilterCourse(e.target.value); setFilterProgram('All'); }} options={courseFilterOptions} />
          <Select label="Program" value={filterProgram} onChange={e => setFilterProgram(e.target.value)} options={programFilterOptions} />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
           PHASE 1 — LEAD PIPELINE
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Leads',   value: stats.total,      color: 'bg-slate-50 border-slate-200', text: 'text-slate-700' },
              { label: 'New Enquiries', value: stats.new,        color: 'bg-blue-50 border-blue-200',   text: 'text-blue-700' },
              { label: 'Follow-up',     value: stats.followup,   color: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
              { label: 'Interested',    value: stats.interested, color: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
            ].map(s => (
              <div key={s.label} className={`p-4 rounded-xl border ${s.color} text-center`}>
                <div className={`text-2xl font-bold ${s.text}`}>{s.value}</div>
                <div className="text-xs text-slate-500 font-semibold mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Active Lead Registrations</CardTitle>
              <span className="text-xs text-slate-400 font-medium">{filteredLeads.length} result{filteredLeads.length !== 1 ? 's' : ''}</span>
            </CardHeader>
            <Table headers={['Lead ID', 'Student Name', 'Mobile', 'Course Interest', 'Preferred Branch', 'Assigned Branch', 'Discovery Source', 'Assigned Counsellor', 'Stage Status', 'Last Follow-up', 'Next Follow-up']}>
              {pipelineLeads.map(l => (
                <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-[10px] font-bold text-slate-400">{l.id}</td>
                  <td className="px-6 py-4 font-semibold text-blue-600 hover:underline cursor-pointer" onClick={() => handleOpenLeadDetail(l)}>{l.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{l.mobile}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div>{l.course}</div>
                    {l.program && <div className="text-xs text-slate-400 mt-0.5">{l.program} {l.level ? `(${l.level})` : ''}</div>}
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-500">{l.preferredBranch || '-'}</td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-500">{l.branch || '-'}</td>
                  <td className="px-6 py-4"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-medium">{l.source}</span></td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-500">{l.counsellor}</td>
                  <td className="px-6 py-4"><StatusBadge status={l.status} /></td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{l.followups && l.followups.length > 0 ? l.followups[l.followups.length - 1].date : '-'}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{l.nextFollowUp}</td>
                </tr>
              ))}
            </Table>
            <Pagination currentPage={page} totalPages={totalPages} totalItems={filteredLeads.length} pageSize={PER_PAGE} onPageChange={setPage} />
          </Card>
        </div>
      )}





      {/* ═══════════════════════════════════════════════════════════════════
           PHASE 4 — ADMISSION & DOCUMENT VERIFICATION
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'admission' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Students',     value: stats.converted, color: 'bg-slate-50 border-slate-200', text: 'text-slate-700' },
              { label: 'Reg. Pending',       value: stats.pending,   color: 'bg-orange-50 border-orange-200', text: 'text-orange-700' },
              { label: 'Verification Queue', value: students.filter(s => s.status === 'Verification Pending').length, color: 'bg-violet-50 border-violet-200', text: 'text-violet-700' },
              { label: 'Active Students',    value: stats.active,    color: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
            ].map(s => (
              <div key={s.label} className={`p-4 rounded-xl border ${s.color} text-center`}>
                <div className={`text-2xl font-bold ${s.text}`}>{s.value}</div>
                <div className="text-xs text-slate-500 font-semibold mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Admission & Document Verification Pipeline</CardTitle>
              <span className="text-xs text-slate-400 font-medium">{filteredStudents.length} result{filteredStudents.length !== 1 ? 's' : ''}</span>
            </CardHeader>
            <Table headers={['Student ID', 'Student Name', 'Mobile', 'Course', 'Branch', 'Documents', 'Status', 'Actions']}>
              {paginatedStudents.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-[10px] text-slate-400">{s.studentId}</td>
                  <td className="px-6 py-4 font-semibold text-blue-600 hover:underline cursor-pointer" onClick={() => navigate(`/admission/${s.id || s.studentId}`)}>{s.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{s.mobile || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div>{s.course}</div>
                    {(s as any).program && <div className="text-xs text-slate-400 mt-0.5">{(s as any).program} {(s as any).level ? `(${(s as any).level})` : ''}</div>}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">{s.address?.city || s.branch || '-'}</td>
                  <td className="px-6 py-4 text-xs font-semibold">
                    {s.status === 'Active Student'
                      ? <span className="text-emerald-600 flex items-center gap-1"><CheckCircle size={12} /> Verified (4 files)</span>
                      : <span className="text-amber-600 flex items-center gap-1"><Clock size={12} /> Pending Review</span>
                    }
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={s.status} /></td>
                  <td className="px-6 py-4">
                    {s.status !== 'Active Student' ? (
                      <Button variant="primary" size="sm" style={{ backgroundColor: '#2563eb', color: 'white' }} onClick={() => navigate(`/admission/${s.id || s.studentId}`)}>
                        Review Docs <ChevronRight size={13} className="ml-1" />
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400 font-semibold flex items-center gap-1"><CheckCircle size={12} className="text-emerald-500" /> Approved</span>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
            <Pagination currentPage={stuPage} totalPages={stuTotalPages} totalItems={filteredStudents.length} pageSize={PER_PAGE} onPageChange={setStuPage} />
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
           PHASE 4 — BATCH ALLOCATION
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'batch' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
            <strong>Phase 4 — Batch Allocation:</strong> Assign each registered student to a Course — Program — Academic Level — Batch. Set enrollment type (Standard / Custom Combo / Subject-wise).
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Batch Allocation Queue</CardTitle>
              <span className="text-xs text-slate-400">Students awaiting batch assignment</span>
            </CardHeader>
            <Table headers={['Student ID', 'Student Name', 'Course', 'Branch', 'Admission Date', 'Current Batch', 'Status', 'Actions']}>
              {paginatedStudents.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-[10px] text-slate-400">{s.studentId}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800">{s.name}</td>
                  <td className="px-6 py-4 text-xs text-slate-600">{s.course}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{s.branch}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{s.admissionDate}</td>
                  <td className="px-6 py-4">
                    {s.batch ? (
                      <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">{s.batch}</span>
                    ) : (
                      <span className="text-xs text-amber-600 font-semibold flex items-center gap-1"><Clock size={12} /> Not Assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={s.status} /></td>
                  <td className="px-6 py-4">
                    <Button variant="secondary" size="sm" onClick={() => {
                      setBatchStudent(s);
                      setBatchCourse(''); setBatchProgram(''); setBatchLevel(''); setBatchSelected('');
                      setBatchEnrollType('Standard Enrollment'); setBatchSubjects([]);
                      setShowBatchModal(true);
                    }}>
                      <Layers size={13} className="mr-1" /> Allocate Batch
                    </Button>
                  </td>
                </tr>
              ))}
            </Table>
            <Pagination currentPage={stuPage} totalPages={stuTotalPages} totalItems={filteredStudents.length} pageSize={PER_PAGE} onPageChange={setStuPage} />
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
           PHASE 6 — PAYMENT & ACTIVATION
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'payment' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Students',  value: students.length,   color: 'bg-slate-50 border-slate-200', text: 'text-slate-700' },
              { label: 'Active Students', value: stats.active,       color: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
              { label: 'Fee Collected',   value: `₹${students.reduce((s, st) => s + st.feePlan.paid, 0).toLocaleString()}`, color: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
              { label: 'Outstanding',     value: `₹${students.reduce((s, st) => s + st.feePlan.pending, 0).toLocaleString()}`, color: 'bg-red-50 border-red-200', text: 'text-red-600' },
            ].map(s => (
              <div key={s.label} className={`p-4 rounded-xl border ${s.color} text-center`}>
                <div className={`text-2xl font-bold ${s.text}`}>{s.value}</div>
                <div className="text-xs text-slate-500 font-semibold mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Payment Ledger & Activation Status</CardTitle>
              <span className="text-xs text-slate-400">{students.length} student records</span>
            </CardHeader>
            <Table headers={['Student ID', 'Student Name', 'Course', 'Batch', 'Total Fee', 'Paid', 'Outstanding', 'Status', 'Receipt']}>
              {paginatedStudents.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-[10px] text-slate-400">{s.studentId}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800">{s.name}</td>
                  <td className="px-6 py-4 text-xs text-slate-600">{s.course}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{s.batch}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-700">₹{s.feePlan.total.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-bold text-emerald-600">₹{s.feePlan.paid.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-bold text-red-500">₹{s.feePlan.pending.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    {s.status === 'Active Student' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded-md uppercase">
                        <Zap size={10} className="fill-emerald-500 text-emerald-500" /> Active
                      </span>
                    ) : (
                      <StatusBadge status={s.status} />
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button className="flex items-center gap-1 text-xs font-semibold text-blue-500 hover:text-blue-700 transition-colors">
                      <FileText size={13} /> Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </Table>
            <Pagination currentPage={stuPage} totalPages={stuTotalPages} totalItems={students.length} pageSize={PER_PAGE} onPageChange={setStuPage} />
          </Card>
        </div>
      )}
    </div>
  );
};
