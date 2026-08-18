import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Pagination } from '../components/ui/Pagination';
import {
  Plus, ArrowLeft, Users, PhoneCall, DollarSign,
  ClipboardList, Layers, CheckCircle, Clock, ChevronRight,
  Download, Search, FileText, Zap, X
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
    addLead, updateLead, addFollowup, convertLeadToStudent,
    approveStudentRegistration, allocateBatch, recordPayment,
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

  // Modals state
  const [showAddLead, setShowAddLead] = useState(false);
  const [showFollowup, setShowFollowup] = useState(false);
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Add Lead Form State
  const [leadForm, setLeadForm] = useState({
    name: '', mobile: '', parentMobile: '', course: '', program: '', level: 'year1', source: 'Walk-in', remarks: '', branch: '', counsellor: ''
  });

  // Follow-up Form State
  const [followupForm, setFollowupForm] = useState({
    type: 'Call #1', outcome: '', nextDate: ''
  });

  // Batch Allocation Form State
  const [batchForm, setBatchForm] = useState({
    course: '', program: '', level: 'year1', batch: '', type: 'Standard Enrollment'
  });

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
  }, [leads, search, filterStatus, filterSource, filterBranch, filterCourse, filterProgram, courses, currentUser]);

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

  // ─── Full-Screen Panels instead of Pop-up Modals ──────────────────────────────
  if (showAddLead) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowAddLead(false)} className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-display font-bold text-slate-900">Log New Enquiry</h2>
            <p className="text-xs text-slate-500 mt-0.5">Add a new prospective student enquiry to the lead pipeline.</p>
          </div>
        </div>

        <Card>
          <form onSubmit={handleAddLeadSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Student Name *" value={leadForm.name} onChange={e => setLeadForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Enter full name" />
              <Input label="Mobile Number *" value={leadForm.mobile} onChange={e => setLeadForm(prev => ({ ...prev, mobile: e.target.value }))} placeholder="Enter 10-digit number" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Parent Mobile" value={leadForm.parentMobile} onChange={e => setLeadForm(prev => ({ ...prev, parentMobile: e.target.value }))} placeholder="Optional" />
              <Select
                label="Select Branch *"
                value={leadForm.branch}
                onChange={e => setLeadForm(prev => ({ ...prev, branch: e.target.value }))}
                options={branches.map(b => ({ value: b.name, label: b.name }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Course Interest *"
                value={leadForm.course}
                onChange={e => setLeadForm(prev => ({ ...prev, course: e.target.value, program: '', level: 'year1' }))}
                options={courses.map(c => ({ value: c.name, label: c.name }))}
              />
              <Select
                label="Assign Counsellor"
                value={leadForm.counsellor}
                onChange={e => setLeadForm(prev => ({ ...prev, counsellor: e.target.value }))}
                options={[{ value: 'Priya Sen', label: 'Priya Sen' }, { value: 'Amit Verma', label: 'Amit Verma' }]}
              />
            </div>
            <Input label="Discovery Source" value={leadForm.source} onChange={e => setLeadForm(prev => ({ ...prev, source: e.target.value }))} placeholder="e.g. Google Ads, Referral" />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Remarks / Follow-up notes</label>
              <textarea
                value={leadForm.remarks}
                onChange={e => setLeadForm(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder="Parent requested fees details..."
                className="w-full min-h-[100px] p-3 border border-slate-200 rounded-lg text-sm bg-white font-sans outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setShowAddLead(false)} className="cursor-pointer">Cancel</Button>
              <Button type="submit" variant="primary" className="cursor-pointer" style={{ backgroundColor: '#2563eb', color: 'white' }}>Log Enquiry</Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  if (showFollowup && selectedLead) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowFollowup(false)} className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-display font-bold text-slate-900">Log Follow-up Call: {selectedLead.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Record call discussion outcomes and schedule the next follow-up action date.</p>
          </div>
        </div>

        <Card>
          <form onSubmit={handleFollowupSubmit} className="p-6 space-y-4">
            <Select
              label="Follow-up Type"
              value={followupForm.type}
              onChange={e => setFollowupForm(prev => ({ ...prev, type: e.target.value }))}
              options={[
                { value: 'Call #1', label: 'Call #1' },
                { value: 'Call #2', label: 'Call #2' },
                { value: 'WhatsApp Ping', label: 'WhatsApp Ping' },
                { value: 'Walk-in Counselling', label: 'Walk-in Counselling' }
              ]}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Call Outcome / Discussion Details *</label>
              <textarea
                required
                value={followupForm.outcome}
                onChange={e => setFollowupForm(prev => ({ ...prev, outcome: e.target.value }))}
                placeholder="Lead expressed interest in demo lecture..."
                className="w-full min-h-[120px] p-3 border border-slate-200 rounded-lg text-sm bg-white font-sans outline-none focus:border-blue-500"
              />
            </div>
            <Input
              label="Schedule Next Action Date"
              type="date"
              value={followupForm.nextDate}
              onChange={e => setFollowupForm(prev => ({ ...prev, nextDate: e.target.value }))}
            />
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setShowFollowup(false)} className="cursor-pointer">Cancel</Button>
              <Button type="submit" variant="primary" className="cursor-pointer" style={{ backgroundColor: '#2563eb', color: 'white' }}>Save Log</Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  if (showBatchModal && selectedStudent) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowBatchModal(false)} className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-display font-bold text-slate-900">Batch Allocation: {selectedStudent.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Assign Course, Program, Academic Level and Target Batch details.</p>
          </div>
        </div>

        <Card>
          <form onSubmit={handleAllocateBatchSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Select Course *"
                value={batchForm.course}
                onChange={e => setBatchForm(prev => ({ ...prev, course: e.target.value, program: '', level: 'year1', batch: '' }))}
                options={courses.map(c => ({ value: c.name, label: c.name }))}
              />
              <Select
                label="Select Program *"
                value={batchForm.program}
                onChange={e => setBatchForm(prev => ({ ...prev, program: e.target.value, batch: '' }))}
                options={(courses.find(c => c.name === batchForm.course)?.programs || []).map(p => ({ value: p, label: p }))}
                disabled={!batchForm.course}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Academic Level *"
                value={batchForm.level}
                onChange={e => setBatchForm(prev => ({ ...prev, level: e.target.value, batch: '' }))}
                options={[
                  { value: 'year1', label: 'Year 1 / Class 11' },
                  { value: 'year2', label: 'Year 2 / Class 12' },
                  { value: 'class8', label: 'Class 8' },
                  { value: 'class9', label: 'Class 9' },
                  { value: 'class10', label: 'Class 10' }
                ]}
                disabled={!batchForm.program}
              />
              <Select
                label="Select Target Batch *"
                value={batchForm.batch}
                onChange={e => setBatchForm(prev => ({ ...prev, batch: e.target.value }))}
                options={batches
                  .filter(b => b.course === batchForm.course && (!batchForm.program || b.program === batchForm.program))
                  .map(b => ({ value: b.name, label: b.name }))
                }
                disabled={!batchForm.level}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setShowBatchModal(false)} className="cursor-pointer">Cancel</Button>
              <Button type="submit" variant="primary" className="cursor-pointer" disabled={!batchForm.batch} style={{ backgroundColor: '#2563eb', color: 'white' }}>Confirm Batch</Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  if (showLeadDetails && selectedLead) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowLeadDetails(false)} className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-display font-bold text-slate-900">Lead Profile: {selectedLead.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">ID: {selectedLead.id} • Counsellor: {selectedLead.counsellor}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
            <div className="p-6 space-y-4 text-sm">
              <div><span className="text-xs text-slate-400 font-bold block mb-1">Mobile</span><strong className="text-slate-700 font-mono">{selectedLead.mobile}</strong></div>
              <div><span className="text-xs text-slate-400 font-bold block mb-1">Branch</span><strong className="text-slate-700">{selectedLead.branch}</strong></div>
              <div><span className="text-xs text-slate-400 font-bold block mb-1">Course Interest</span><strong className="text-blue-700 font-semibold">{selectedLead.course}</strong></div>
              <div><span className="text-xs text-slate-400 font-bold block mb-1">Source</span><strong className="text-slate-700">{selectedLead.source}</strong></div>
              <div><span className="text-xs text-slate-400 font-bold block mb-1">Next Follow-up</span><strong className="text-amber-700 font-mono">{selectedLead.nextFollowUp}</strong></div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs mt-4">
                <span className="text-slate-500 uppercase font-bold block mb-1">Remarks</span>
                <p className="text-slate-700 leading-relaxed font-medium">{selectedLead.remarks || 'No notes added yet.'}</p>
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Interactions Timeline</CardTitle></CardHeader>
            <div className="p-6">
              <div className="border-l-2 border-slate-200 pl-6 space-y-6 ml-2">
                {selectedLead.followups && selectedLead.followups.map((fu, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[29px] top-1.5 h-3.5 w-3.5 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
                    <div className="text-xs text-slate-400 font-bold uppercase">{fu.date} • {fu.type}</div>
                    <div className="text-sm text-slate-700 font-semibold mt-1">{fu.outcome}</div>
                    {fu.nextDate && <div className="text-[10px] text-amber-600 font-bold mt-1">Next Call Action: {fu.nextDate}</div>}
                  </div>
                ))}
                {(!selectedLead.followups || selectedLead.followups.length === 0) && (
                  <div className="text-slate-400 text-sm py-4 font-semibold">No follow-up calls logged yet.</div>
                )}
              </div>
            </div>
          </Card>
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
                  { value: 'Interested', label: 'Interested' },
                  { value: 'Not Interested', label: 'Not Interested' }
                ] : activeTab === 'fee' ? [
                  { value: 'All', label: 'All Stages' },
                  { value: 'Contacted', label: 'Contacted' },
                  { value: 'Follow-up', label: 'Follow-up' },
                  { value: 'Demo Scheduled', label: 'Demo Scheduled' },
                  { value: 'Interested', label: 'Interested' }
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
                  <td className="px-6 py-4 font-semibold text-blue-600 hover:underline cursor-pointer" onClick={() => { setSelectedLead(l); setShowLeadDetails(true); }}>{l.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{l.mobile}</td>
                  <td className="px-6 py-4 text-xs text-slate-700 font-medium">{l.course}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{l.branch}</td>
                  <td className="px-6 py-4"><StatusBadge status={l.status} /></td>
                  <td className="px-6 py-4 text-xs text-slate-500">{l.counsellor}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => { setSelectedLead(l); setShowFollowup(true); }} className="cursor-pointer">
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
            <span><strong>Phase 2 — Fee Discussion:</strong> Track and manage fees negotiations for active leads. Click Discuss Fee to initiate the conversion pricing wizard.</span>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Fee Discussion Queue</CardTitle>
            </CardHeader>
            <Table headers={['Lead ID', 'Student Name', 'Mobile', 'Course', 'Assigned Branch', 'Stage', 'Counsellor', 'Remarks', 'Actions']}>
              {paginatedLeads
                .filter(l => ['Follow-up', 'Interested', 'Demo Scheduled', 'Contacted'].includes(l.status))
                .map(l => (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-xs text-slate-400">{l.id}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{l.name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{l.mobile}</td>
                    <td className="px-6 py-4 text-xs text-slate-700 font-medium">{l.course}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{l.branch}</td>
                    <td className="px-6 py-4"><StatusBadge status={l.status} /></td>
                    <td className="px-6 py-4 text-xs text-slate-500">{l.counsellor}</td>
                    <td className="px-6 py-4 text-xs text-slate-500 truncate max-w-[150px]">{l.remarks}</td>
                    <td className="px-6 py-4">
                      <Button variant="primary" size="sm" onClick={() => navigate(`/leads/${l.id}/convert`, { state: { startStep: 2 } })} className="cursor-pointer text-xs font-semibold" style={{ backgroundColor: '#2563eb', color: 'white' }}>
                        <DollarSign size={12} className="mr-1" /> Discuss Fee
                      </Button>
                    </td>
                  </tr>
                ))}
              {filteredLeads.filter(l => ['Follow-up', 'Interested', 'Demo Scheduled', 'Contacted'].includes(l.status)).length === 0 && (
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
                  <td className="px-6 py-4 font-semibold text-slate-800">{s.name}</td>
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
                  <td className="px-6 py-4 font-semibold text-slate-800">{s.name}</td>
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
                    <Button variant="secondary" size="sm" onClick={() => {
                      setSelectedStudent(s);
                      setBatchForm({
                        course: s.course || '',
                        program: s.program || '',
                        level: s.level || 'year1',
                        batch: s.batch || '',
                        type: 'Standard Enrollment'
                      });
                      setShowBatchModal(true);
                    }} className="cursor-pointer text-xs">
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
