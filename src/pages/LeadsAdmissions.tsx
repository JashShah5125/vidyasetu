import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Pagination } from '../components/ui/Pagination';
import {
  Plus, ArrowLeft, Users, PhoneCall, MessageSquare, DollarSign,
  ClipboardList, Layers, CheckCircle, Clock, XCircle, ChevronRight,
  Download, Search, UserCheck, FileText, Zap
} from 'lucide-react';
import type { Lead, Student } from '../data/mockData';

interface LeadsAdmissionsProps {
  initialTab?: 'pipeline' | 'counselling' | 'fee' | 'admission' | 'batch' | 'payment';
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
  { id: 'counselling', label: 'Counselling & Follow-up', icon: PhoneCall },
  { id: 'fee',         label: 'Fee Discussion',          icon: DollarSign },
  { id: 'admission',   label: 'Admission & Docs',        icon: ClipboardList },
  { id: 'batch',       label: 'Batch Allocation',        icon: Layers },
  { id: 'payment',     label: 'Payment & Activation',   icon: Zap },
] as const;

type TabId = typeof phases[number]['id'];

export const LeadsAdmissions: React.FC<LeadsAdmissionsProps> = ({ initialTab = 'pipeline' }) => {
  const { leads, students, courses, batches, branches, addLead, addFollowup, convertLeadToStudent, approveStudentRegistration } = useApp();

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [successMsg, setSuccessMsg] = useState('');

  // ── shared search / filter ──
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterSource, setFilterSource] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterProgram, setFilterProgram] = useState('All');

  // ── selected lead ──
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // ── modal states ──
  const [showAddLead,    setShowAddLead]    = useState(false);
  const [showFollowup,   setShowFollowup]   = useState(false);
  const [showConvert,    setShowConvert]    = useState(false);
  const [showFeeModal,   setShowFeeModal]   = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // ── add lead form ──
  const [fName,    setFName]    = useState('');
  const [fMobile,  setFMobile]  = useState('');
  const [fCourse,  setFCourse]  = useState('JEE Prep');
  const [fSource,  setFSource]  = useState('Walk-in');
  const [fRemarks, setFRemarks] = useState('');
  const [fParent,  setFParent]  = useState('');
  const [fBranch,  setFBranch]  = useState('');

  // ── follow-up form ──
  const [fuType,    setFuType]    = useState('Call #1');
  const [fuOutcome, setFuOutcome] = useState('');
  const [fuNext,    setFuNext]    = useState('');
  const [fuDemo,    setFuDemo]    = useState(false);
  const [fuDemoDate, setFuDemoDate] = useState('');

  // ── fee / convert form ──
  const [feeBatch,    setFeeBatch]    = useState('');
  const [feeTotal,    setFeeTotal]    = useState(120000);
  const [feeDiscount, setFeeDiscount] = useState(0);
  const [feePaid,     setFeePaid]     = useState(40000);
  const [enrollType,  setEnrollType]  = useState('Standard');
  const [feeInstall,  setFeeInstall]  = useState('Full Payment');

  // ── batch allocation form (for already-converted student) ──
  const [batchStudent,  setBatchStudent]  = useState<Student | null>(null);
  const [batchCourse,   setBatchCourse]   = useState('');
  const [batchProgram,  setBatchProgram]  = useState('');
  const [batchLevel,    setBatchLevel]    = useState('');
  const [batchSelected, setBatchSelected] = useState('');
  const [batchEnrollType, setBatchEnrollType] = useState('Standard');
  const [batchSubjects,  setBatchSubjects]  = useState<string[]>([]);

  // ── pagination ──
  const [page, setPage] = useState(1);
  const [stuPage, setStuPage] = useState(1);
  const PER_PAGE = 8;

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // ── filter options ──
  const branchFilterOptions = useMemo(() => [
    { value: 'All', label: 'All Branches' },
    ...branches.map(b => ({ value: b.name, label: b.name }))
  ], [branches]);

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
        const matchBranch = filterBranch === 'All' || l.branch === filterBranch;
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
      const matchBranch = filterBranch === 'All' || s.branch === filterBranch;
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
            addLead(fName, fMobile, fCourse, fSource, fRemarks);
            setFName(''); setFMobile(''); setFRemarks(''); setFParent('');
            setShowAddLead(false);
            showSuccess('Enquiry logged successfully and assigned to counsellor.');
          }} className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Student & Contact Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Student Name" required placeholder="e.g. Aarav Sharma" value={fName} onChange={e => setFName(e.target.value)} />
                <Input label="Mobile Contact" required placeholder="9876543210" value={fMobile} onChange={e => setFMobile(e.target.value)} />
              </div>
              <Input label="Parent / Guardian Mobile" placeholder="9876543211" value={fParent} onChange={e => setFParent(e.target.value)} />
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Course Interest & Discovery</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Interested Course" value={fCourse} onChange={e => setFCourse(e.target.value)} options={[
                  { value: 'JEE Prep', label: 'JEE Prep Course' },
                  { value: 'NEET Batch', label: 'NEET Batch Premium' },
                  { value: 'Class 10 Foundation', label: 'Class 10 Foundation' },
                  { value: '8th Standard', label: '8th Standard' },
                ]} />
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
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Initial Remarks</label>
                <textarea rows={3} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Needs weekend slot, interested in demo..." value={fRemarks} onChange={e => setFRemarks(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setShowAddLead(false)}>Cancel</Button>
              <Button type="submit" variant="primary" style={{ backgroundColor: '#2563eb', color: 'white' }}>Save Enquiry</Button>
            </div>
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
  //  MODAL: Fee Discussion & Convert
  // ─────────────────────────────────────────────────────────────────────────
  if ((showFeeModal || showConvert) && selectedLead) {
    const netFee = feeTotal - feeDiscount;
    const outstanding = netFee - feePaid;
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => { setShowFeeModal(false); setShowConvert(false); setSelectedLead(null); }} className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
            <ArrowLeft size={26} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">Fee Discussion & Finalize Admission</h2>
            <p className="text-sm text-slate-500">Student: <strong>{selectedLead.name}</strong> — Course: {selectedLead.course}</p>
          </div>
        </div>
        <div className="w-full">
          <form onSubmit={e => {
            e.preventDefault();
            convertLeadToStudent(selectedLead.id, selectedLead.course, feeBatch || 'TBD', feeTotal, feeDiscount, feePaid);
            setShowFeeModal(false); setShowConvert(false); setSelectedLead(null);
            showSuccess(`Admission confirmed for ${selectedLead.name}! Student profile and receipt ledger created.`);
          }} className="space-y-4">
            {/* Enrollment Type */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Enrollment Type</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {['Standard', 'Custom Combo', 'Subject-wise'].map(et => (
                  <label key={et} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${enrollType === et ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                    <input type="radio" name="enrollType" value={et} checked={enrollType === et} onChange={() => setEnrollType(et)} className="text-blue-600" />
                    <span className="text-sm font-semibold text-slate-700">{et}</span>
                  </label>
                ))}
              </div>
            </div>
            {/* Batch allocation */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Batch & Course Confirmation</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Confirmed Course" value={selectedLead.course} readOnly />
                <Select label="Allocate Batch" value={feeBatch} onChange={e => setFeeBatch(e.target.value)} options={[
                  { value: '', label: 'Select a batch...' },
                  ...batches.filter(b => b.course.toLowerCase().includes(selectedLead.course.toLowerCase().split(' ')[0].toLowerCase()) || true).map(b => ({ value: b.name, label: `${b.name} (${b.timing})` }))
                ]} />
              </div>
            </div>
            {/* Fee structure */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Fee Structure</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="Base Course Fee (₹)" type="number" value={feeTotal} onChange={e => setFeeTotal(Number(e.target.value))} />
                <Input label="Discount / Scholarship (₹)" type="number" value={feeDiscount} onChange={e => setFeeDiscount(Number(e.target.value))} />
                <Input label="Initial Deposit (₹)" type="number" value={feePaid} onChange={e => setFeePaid(Number(e.target.value))} />
              </div>
              <Select label="Payment / Installment Plan" value={feeInstall} onChange={e => setFeeInstall(e.target.value)} options={[
                { value: 'Full Payment', label: 'Full Payment (Single Installment)' },
                { value: '2 Installments', label: '2 Equal Installments' },
                { value: '3 Installments', label: '3 Quarterly Installments' },
                { value: 'Monthly EMI', label: 'Monthly EMI Plan' },
              ]} />
              {/* Fee summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-center">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase mb-1">Discounted Fee</div>
                  <div className="text-lg font-bold text-slate-800">₹{netFee.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-center">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase mb-1">Initial Deposit</div>
                  <div className="text-lg font-bold text-emerald-600">₹{feePaid.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-center">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase mb-1">Outstanding</div>
                  <div className={`text-lg font-bold ${outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>₹{outstanding.toLocaleString()}</div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => { setShowFeeModal(false); setShowConvert(false); setSelectedLead(null); }}>Cancel</Button>
              <Button type="submit" variant="primary" style={{ backgroundColor: '#2563eb', color: 'white' }}>Confirm Admission & Create Student Profile</Button>
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
                  ...(batchProgram.includes('2 Year') ? [{ value: 'year1', label: 'Year 1' }, { value: 'year2', label: 'Year 2' }] :
                     batchProgram.includes('8th') ? [{ value: 'class8', label: 'Class 8' }] :
                     batchProgram ? [{ value: 'year1', label: 'Year 1' }] : [])
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
          <Button variant="primary" onClick={() => setShowAddLead(true)} style={{ backgroundColor: '#2563eb', color: 'white' }} className="flex items-center gap-1.5">
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
                onClick={() => setActiveTab(p.id)}
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
                placeholder={activeTab === 'pipeline' || activeTab === 'counselling' || activeTab === 'fee' ? 'Search leads by name, mobile or course...' : 'Search students by name or ID...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white"
              />
            </div>
          </div>
          {activeTab === 'pipeline' || activeTab === 'counselling' || activeTab === 'fee' ? (
            <>
              <Select label="Stage Status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} options={[
                { value: 'All', label: 'All Stages' },
                { value: 'New Enquiry', label: 'New Enquiry' },
                { value: 'Contacted', label: 'Contacted' },
                { value: 'Follow-up', label: 'Follow-up' },
                { value: 'Demo Scheduled', label: 'Demo Scheduled' },
                { value: 'Interested', label: 'Interested' },
                { value: 'Not Interested', label: 'Not Interested' },
              ]} />
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
          <Select label="Branch" value={filterBranch} onChange={e => setFilterBranch(e.target.value)} options={branchFilterOptions} />
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
            <Table headers={['Lead ID', 'Student Name', 'Mobile', 'Course Interest', 'Discovery Source', 'Assigned Counsellor', 'Stage Status', 'Next Follow-up', 'Actions']}>
              {pipelineLeads.map(l => (
                <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-[10px] font-bold text-slate-400">{l.id}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800">{l.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{l.mobile}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{l.course}</td>
                  <td className="px-6 py-4"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-medium">{l.source}</span></td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-500">{l.counsellor}</td>
                  <td className="px-6 py-4"><StatusBadge status={l.status} /></td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{l.nextFollowUp}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="secondary" size="sm" onClick={() => { setSelectedLead(l); setShowFollowup(true); }}>
                        Log Call
                      </Button>
                      {l.status !== 'Not Interested' && l.status !== 'Interested' && (
                        <Button variant="primary" size="sm" style={{ backgroundColor: '#2563eb', color: 'white' }} onClick={() => { setSelectedLead(l); setFeeTotal(120000); setFeeDiscount(0); setFeePaid(40000); setFeeBatch(''); setShowConvert(true); }}>
                          Convert
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
            <Pagination currentPage={page} totalPages={totalPages} totalItems={filteredLeads.length} pageSize={PER_PAGE} onPageChange={setPage} />
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
           PHASE 2 — COUNSELLING & FOLLOW-UP
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'counselling' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Awaiting Contact',   value: leads.filter(l => l.status === 'New Enquiry').length,      color: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
              { label: 'Follow-up Pending',  value: leads.filter(l => l.status === 'Follow-up').length,        color: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
              { label: 'Demo Scheduled',     value: leads.filter(l => l.status === 'Demo Scheduled').length,   color: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
              { label: 'Ready to Proceed',   value: leads.filter(l => l.status === 'Interested').length,       color: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
            ].map(s => (
              <div key={s.label} className={`p-4 rounded-xl border ${s.color} text-center`}>
                <div className={`text-2xl font-bold ${s.text}`}>{s.value}</div>
                <div className="text-xs text-slate-500 font-semibold mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Counselling & Follow-up Queue</CardTitle>
              <span className="text-xs text-slate-400 font-medium">{filteredLeads.length} leads</span>
            </CardHeader>
            <Table headers={['Student Name', 'Mobile', 'Course', 'Counsellor', 'Stage', 'Follow-ups Logged', 'Next Date', 'Last Remark', 'Actions']}>
              {pipelineLeads.map(l => (
                <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{l.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{l.mobile}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{l.course}</td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-500">{l.counsellor}</td>
                  <td className="px-6 py-4"><StatusBadge status={l.status} /></td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-bold ${l.followups.length > 0 ? 'text-blue-600' : 'text-slate-300'}`}>{l.followups.length}</span>
                    {l.followups.length > 0 && <span className="text-xs text-slate-400 ml-1">calls</span>}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{l.nextFollowUp}</td>
                  <td className="px-6 py-4 text-xs text-slate-500 max-w-[160px] truncate">{l.remarks}</td>
                  <td className="px-6 py-4">
                    <Button variant="secondary" size="sm" onClick={() => { setSelectedLead(l); setShowFollowup(true); }}>
                      <PhoneCall size={13} className="mr-1" /> Log Call
                    </Button>
                  </td>
                </tr>
              ))}
            </Table>
            <Pagination currentPage={page} totalPages={totalPages} totalItems={filteredLeads.length} pageSize={PER_PAGE} onPageChange={setPage} />
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
           PHASE 3 — FEE DISCUSSION
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'fee' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <strong>Phase 3 — Fee Discussion:</strong> Show leads that are in <em>Follow-up</em> or <em>Interested</em> stage and need fee finalisation before conversion.
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Fee Discussion Queue</CardTitle>
              <span className="text-xs text-slate-400">Leads ready for fee negotiation</span>
            </CardHeader>
            <Table headers={['Student Name', 'Mobile', 'Course', 'Stage', 'Counsellor', 'Remarks', 'Actions']}>
              {pipelineLeads.filter(l => ['Follow-up', 'Interested', 'Demo Scheduled', 'Contacted'].includes(l.status)).map(l => (
                <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{l.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{l.mobile}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{l.course}</td>
                  <td className="px-6 py-4"><StatusBadge status={l.status} /></td>
                  <td className="px-6 py-4 text-xs text-slate-500">{l.counsellor}</td>
                  <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate">{l.remarks}</td>
                  <td className="px-6 py-4">
                    <Button variant="primary" size="sm" style={{ backgroundColor: '#2563eb', color: 'white' }} onClick={() => { setSelectedLead(l); setFeeTotal(120000); setFeeDiscount(0); setFeePaid(40000); setFeeBatch(''); setShowFeeModal(true); }}>
                      <DollarSign size={13} className="mr-1" /> Discuss Fee
                    </Button>
                  </td>
                </tr>
              ))}
              {pipelineLeads.filter(l => ['Follow-up', 'Interested', 'Demo Scheduled', 'Contacted'].includes(l.status)).length === 0 && (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">No leads in fee discussion stage. Move leads forward from the Lead Pipeline tab.</td></tr>
              )}
            </Table>
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
              <span className="text-xs text-slate-400">{filteredStudents.length} students</span>
            </CardHeader>
            <Table headers={['Student ID', 'Student Name', 'Course', 'Batch', 'Branch', 'Admission Date', 'Fee Paid', 'Documents', 'Status', 'Actions']}>
              {paginatedStudents.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-[10px] text-slate-400">{s.studentId}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800">{s.name}</td>
                  <td className="px-6 py-4 text-xs text-slate-600">{s.course}</td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-500">{s.batch}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{s.branch}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{s.admissionDate}</td>
                  <td className="px-6 py-4">
                    <div className="text-xs">
                      <span className="text-emerald-600 font-bold">₹{s.feePlan.paid.toLocaleString()}</span>
                      <span className="text-slate-400"> / ₹{s.feePlan.total.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold">
                    {s.status === 'Active Student'
                      ? <span className="text-emerald-600 flex items-center gap-1"><CheckCircle size={12} /> Verified (4 files)</span>
                      : <span className="text-amber-600 flex items-center gap-1"><Clock size={12} /> Pending Review</span>
                    }
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={s.status} /></td>
                  <td className="px-6 py-4">
                    {s.status !== 'Active Student' ? (
                      <Button variant="primary" size="sm" style={{ backgroundColor: '#2563eb', color: 'white' }} onClick={() => { approveStudentRegistration(s.id); showSuccess(`Admission verified & approved for ${s.name}`); }}>
                        <UserCheck size={13} className="mr-1" /> Verify & Approve
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
           PHASE 5 — BATCH ALLOCATION
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'batch' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
            <strong>Phase 5 — Batch Allocation:</strong> Assign each registered student to a Course → Program → Academic Level → Batch. Set enrollment type (Standard / Custom Combo / Subject-wise).
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
