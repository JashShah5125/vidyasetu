import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Pagination } from '../ui/Pagination';
import { Plus, ArrowLeft, BookOpen, ClipboardList, CheckCircle2, Edit3, Eye, FileText, Trash2, XCircle } from 'lucide-react';
import type { AssignmentItem, ExamItem } from '../../data/mockData';
import { TEACHER_ASSIGNED_BATCHES } from '../../data/mockData';

export const TeacherAssignments: React.FC = () => {
  const { 
    batches, 
    branches, 
    courses, 
    exams, 
    setExams,
    assignments,
    setAssignments,
    currentUser, 
    sendNotification 
  } = useApp();
  
  // Navigation Tabs state
  const [activePrimaryTab, setActivePrimaryTab] = useState<'homework' | 'exams'>('homework');
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'drafts'>('active');
  const [successMessage, setSuccessMessage] = useState('');

  // ----------------------------------------------------
  // COMMON OPTIONS
  // ----------------------------------------------------
  const uniqueBranches = currentUser?.role === 'branch-admin' ? [currentUser.branch || ''] : branches.map(b => b.name);
  const uniqueCourses = courses.map(c => c.name);
  const uniquePrograms = Array.from(new Set(batches.map(b => b.program).filter(Boolean))) as string[];
  const uniqueLevels = Array.from(new Set(batches.map(b => b.level).filter(Boolean))) as string[];
  
  const teacherBatches = batches.filter(b => TEACHER_ASSIGNED_BATCHES.includes(b.name));

  // ----------------------------------------------------
  // LIST FILTERS (Shared logic but kept separate for UI)
  // ----------------------------------------------------
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState(currentUser?.role === 'branch-admin' ? currentUser.branch || 'All' : 'All');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterProgram, setFilterProgram] = useState('All');
  const [filterLevel, setFilterLevel] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  const [filterBatch, setFilterBatch] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // ----------------------------------------------------
  // CREATION / EDITING STATES
  // ----------------------------------------------------
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [showExamForm, setShowExamForm] = useState(false);
  const [showAssignDetails, setShowAssignDetails] = useState<AssignmentItem | null>(null);
  const [showExamDetails, setShowExamDetails] = useState<ExamItem | null>(null);

  // Assignment Form State
  const [assignForm, setAssignForm] = useState<Partial<AssignmentItem>>({});
  
  // Exam Form State
  const [examForm, setExamForm] = useState<Partial<ExamItem>>({});

  // Reset pagination on tab change
  useMemo(() => setCurrentPage(1), [activePrimaryTab, activeSubTab]);

  // ----------------------------------------------------
  // FILTERING LOGIC
  // ----------------------------------------------------
  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      if (!TEACHER_ASSIGNED_BATCHES.includes(a.batch)) return false;
      if (activeSubTab === 'drafts' && a.status !== 'Draft') return false;
      if (activeSubTab === 'active' && a.status === 'Draft') return false;

      const matchSearch = a.title.toLowerCase().includes(search.toLowerCase());
      const matchedBatch = batches.find(b => b.name === a.batch);
      const batchBranch = matchedBatch?.branch || 'Mumbai West';
      
      const matchBranch = currentUser?.role === 'branch-admin' ? batchBranch === currentUser.branch : (filterBranch === 'All' || batchBranch === filterBranch);
      const matchCourse = filterCourse === 'All' || matchedBatch?.course === filterCourse;
      const matchProgram = filterProgram === 'All' || matchedBatch?.program === filterProgram;
      const matchLevel = filterLevel === 'All' || matchedBatch?.level === filterLevel;
      const matchYear = filterYear === 'All' || matchedBatch?.academicYear === filterYear;
      const matchBatch = filterBatch === 'All' || a.batch === filterBatch;
      const matchStatus = filterStatus === 'All' || a.status === filterStatus;
      
      return matchSearch && matchBranch && matchCourse && matchProgram && matchLevel && matchYear && matchBatch && matchStatus;
    }).sort((a, b) => a.title.localeCompare(b.title));
  }, [assignments, activeSubTab, search, filterBranch, filterCourse, filterProgram, filterLevel, filterYear, filterBatch, filterStatus, batches, currentUser]);

  const filteredExams = useMemo(() => {
    return exams.filter(e => {
      if (!TEACHER_ASSIGNED_BATCHES.includes(e.batch)) return false;
      if (activeSubTab === 'drafts' && e.status !== 'Draft') return false;
      if (activeSubTab === 'active' && e.status === 'Draft') return false;

      const matchSearch = e.name.toLowerCase().includes(search.toLowerCase());
      const matchedBatch = batches.find(b => b.name === e.batch);
      const batchBranch = matchedBatch?.branch || 'Mumbai West';
      
      const matchBranch = currentUser?.role === 'branch-admin' ? batchBranch === currentUser.branch : (filterBranch === 'All' || batchBranch === filterBranch);
      const matchCourse = filterCourse === 'All' || matchedBatch?.course === filterCourse;
      const matchProgram = filterProgram === 'All' || matchedBatch?.program === filterProgram;
      const matchLevel = filterLevel === 'All' || matchedBatch?.level === filterLevel;
      const matchYear = filterYear === 'All' || matchedBatch?.academicYear === filterYear;
      const matchBatch = filterBatch === 'All' || e.batch === filterBatch;
      const matchStatus = filterStatus === 'All' || e.status === filterStatus;
      
      return matchSearch && matchBranch && matchCourse && matchProgram && matchLevel && matchYear && matchBatch && matchStatus;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [exams, activeSubTab, search, filterBranch, filterCourse, filterProgram, filterLevel, filterYear, filterBatch, filterStatus, batches, currentUser]);

  const currentData = activePrimaryTab === 'homework' ? filteredAssignments : filteredExams;
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const paginatedData = currentData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ----------------------------------------------------
  // ACTIONS
  // ----------------------------------------------------
  const handleSaveAssignDraft = () => {
    if (!assignForm.title || !assignForm.batch) return alert('Title and Target Batch are required');
    const newId = assignForm.id || `A-${Date.now()}`;
    const newAssign: AssignmentItem = {
      ...(assignForm as AssignmentItem),
      type: assignForm.type || 'Homework',
      id: newId,
      status: 'Draft',
      assignedDate: '',
      dueDate: assignForm.dueDate || 'Not Set'
    };
    
    if (assignForm.id) {
      setAssignments(prev => prev.map(a => a.id === newId ? newAssign : a));
    } else {
      setAssignments(prev => [newAssign, ...prev]);
    }
    setShowAssignForm(false);
    setSuccessMessage('Assignment saved as draft.');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handlePublishAssign = () => {
    if (!assignForm.title || !assignForm.batch || !assignForm.dueDate) return alert('Please fill in all required fields to publish.');
    if (!window.confirm(`Publish Assignment? \n\nAssignment: ${assignForm.title}\nBatch: ${assignForm.batch}\nDue: ${assignForm.dueDate}\n\nStudents will receive this assignment.`)) return;
    
    const newId = assignForm.id || `A-${Date.now()}`;
    const newAssign: AssignmentItem = {
      ...(assignForm as AssignmentItem),
      type: assignForm.type || 'Homework',
      id: newId,
      status: 'Published',
      assignedDate: new Date().toISOString().split('T')[0]
    };
    
    if (assignForm.id) {
      setAssignments(prev => prev.map(a => a.id === newId ? newAssign : a));
    } else {
      setAssignments(prev => [newAssign, ...prev]);
    }
    sendNotification({
      id: `N-${Date.now()}`,
      title: `New Assignment: ${newAssign.title}`,
      message: `A new assignment has been published for ${newAssign.batch}. Due Date: ${newAssign.dueDate}`,
      category: 'Academic',
      sender: currentUser?.name || 'Teacher',
      senderRole: 'Teacher',
      createdAt: new Date().toISOString(),
      direction: 'Outgoing',
      status: 'Unread',
      recipients: [{ type: 'Batch', id: newAssign.batch, name: newAssign.batch }]
    });

    setShowAssignForm(false);
    setActiveSubTab('active');
    setSuccessMessage('Assignment published successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleCloseAssign = (id: string) => {
    if (!window.confirm('Close Assignment? Students will no longer be able to submit.')) return;
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, status: 'Closed' } : a));
    setShowAssignDetails(null);
  };

  const handleDeleteAssign = (id: string) => {
    if (!window.confirm('Delete Draft? This cannot be undone.')) return;
    setAssignments(prev => prev.filter(a => a.id !== id));
    setShowAssignDetails(null);
  };

  const handleSaveExamDraft = () => {
    if (!examForm.name || !examForm.batch) return alert('Test name and Target Batch are required');
    const newId = examForm.id || `EX-${Date.now()}`;
    const newExam: ExamItem = {
      ...(examForm as ExamItem),
      type: examForm.type || 'Unit Test',
      id: newId,
      status: 'Draft',
      examDate: examForm.examDate || 'Not Set',
      totalMarks: examForm.totalMarks || 100,
      passingMarks: examForm.passingMarks || 40,
      average: ''
    };
    
    if (examForm.id) {
      setExams(prev => prev.map(e => e.id === newId ? newExam : e));
    } else {
      setExams(prev => [newExam, ...prev]);
    }
    setShowExamForm(false);
    setSuccessMessage('Exam saved as draft.');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleScheduleExam = () => {
    if (!examForm.name || !examForm.batch || !examForm.examDate) return alert('Please fill in required fields to schedule exam.');
    if (!window.confirm(`Schedule Examination?\n\nTest: ${examForm.name}\nBatch: ${examForm.batch}\nDate: ${examForm.examDate}\nTotal Marks: ${examForm.totalMarks || 100}\n\nStudents will be scheduled for this evaluation.`)) return;
    
    const newId = examForm.id || `EX-${Date.now()}`;
    const newExam: ExamItem = {
      ...(examForm as ExamItem),
      type: examForm.type || 'Unit Test',
      id: newId,
      status: 'Scheduled',
      totalMarks: examForm.totalMarks || 100,
      passingMarks: examForm.passingMarks || 40,
      average: ''
    };
    
    if (examForm.id) {
      setExams(prev => prev.map(e => e.id === newId ? newExam : e));
    } else {
      setExams(prev => [newExam, ...prev]);
    }
    sendNotification({
      id: `N-${Date.now()}`,
      title: `Upcoming Exam: ${newExam.name}`,
      message: `An exam has been scheduled on ${newExam.examDate} for ${newExam.batch}.`,
      category: 'Examination',
      sender: currentUser?.name || 'Teacher',
      senderRole: 'Teacher',
      createdAt: new Date().toISOString(),
      direction: 'Outgoing',
      status: 'Unread',
      recipients: [{ type: 'Batch', id: newExam.batch, name: newExam.batch }]
    });

    setShowExamForm(false);
    setActiveSubTab('active');
    setSuccessMessage('Exam scheduled successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleCancelExam = (id: string) => {
    if (!window.confirm('Cancel Examination? Students will no longer see it as an upcoming test.')) return;
    setExams(prev => prev.map(e => e.id === id ? { ...e, status: 'Cancelled' } : e));
    setShowExamDetails(null);
  };

  const handleDeleteExam = (id: string) => {
    if (!window.confirm('Delete Draft? This cannot be undone.')) return;
    setExams(prev => prev.filter(e => e.id !== id));
    setShowExamDetails(null);
  };

  // ----------------------------------------------------
  // RENDERERS
  // ----------------------------------------------------

  const renderFilters = () => (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-wrap gap-4 items-end border">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs text-gray-500 mb-1">Search</label>
        <Input 
          placeholder={activePrimaryTab === 'homework' ? "Search assignments..." : "Search exams..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {currentUser?.role !== 'branch-admin' && (
        <div className="w-40">
          <label className="block text-xs text-gray-500 mb-1">Branch</label>
          <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none" value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
            <option value="All">All Branches</option>
            {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      )}
      <div className="w-40">
        <label className="block text-xs text-gray-500 mb-1">Course</label>
        <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none" value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
          <option value="All">All Courses</option>
          {uniqueCourses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="w-32">
        <label className="block text-xs text-gray-500 mb-1">Program</label>
        <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none" value={filterProgram} onChange={(e) => setFilterProgram(e.target.value)}>
          <option value="All">All Programs</option>
          {uniquePrograms.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="w-32">
        <label className="block text-xs text-gray-500 mb-1">Level</label>
        <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
          <option value="All">All Levels</option>
          {uniqueLevels.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <div className="w-32">
        <label className="block text-xs text-gray-500 mb-1">Batch</label>
        <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none" value={filterBatch} onChange={(e) => setFilterBatch(e.target.value)}>
          <option value="All">All Batches</option>
          {teacherBatches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
        </select>
      </div>
      <div className="w-40">
        <label className="block text-xs text-gray-500 mb-1">Status</label>
        <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="All">All Statuses</option>
          {activeSubTab === 'drafts' ? (
            <option value="Draft">Draft</option>
          ) : activePrimaryTab === 'homework' ? (
            <>
              <option value="Published">Published</option>
              <option value="Closed">Closed</option>
            </>
          ) : (
            <>
              <option value="Scheduled">Scheduled</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Marks Pending">Marks Pending</option>
              <option value="Marks Published">Marks Published</option>
              <option value="Cancelled">Cancelled</option>
            </>
          )}
        </select>
      </div>
    </div>
  );

  const renderAssignForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
          <h2 className="text-xl font-semibold text-gray-800">{assignForm.id ? 'Edit Assignment' : 'Create Assignment'}</h2>
          <Button variant="ghost" size="sm" onClick={() => setShowAssignForm(false)}><XCircle className="w-5 h-5 text-gray-500" /></Button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          <div>
            <h3 className="font-semibold text-sm text-blue-800 mb-3 uppercase tracking-wider">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Assignment Title <span className="text-red-500">*</span></label>
                <Input value={assignForm.title || ''} onChange={e => setAssignForm({...assignForm, title: e.target.value})} placeholder="e.g. Kinematics Problem Set" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Type</label>
                <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none" value={assignForm.type || 'Homework'} onChange={e => setAssignForm({...assignForm, type: e.target.value})}>
                  <option value="Homework">Homework</option>
                  <option value="Worksheet">Worksheet</option>
                  <option value="Practice set">Practice set</option>
                  <option value="Reading task">Reading task</option>
                  <option value="Revision work">Revision work</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Subject</label>
                <Input value={assignForm.subject || ''} onChange={e => setAssignForm({...assignForm, subject: e.target.value})} placeholder="e.g. Physics" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Instructions / Description</label>
                <textarea 
                  className="w-full border rounded-md p-2 h-24 text-sm"
                  value={assignForm.description || ''} 
                  onChange={e => setAssignForm({...assignForm, description: e.target.value})} 
                  placeholder="Enter detailed instructions here..."
                ></textarea>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm text-blue-800 mb-3 uppercase tracking-wider">Academic Target & Schedule</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Target Batch <span className="text-red-500">*</span></label>
                <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none" value={assignForm.batch || ''} onChange={e => setAssignForm({...assignForm, batch: e.target.value})}>
                  <option value="">Select a batch...</option>
                  {teacherBatches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Due Date</label>
                <Input type="date" value={assignForm.dueDate === 'Not Set' ? '' : (assignForm.dueDate || '')} onChange={e => setAssignForm({...assignForm, dueDate: e.target.value})} />
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 border-t bg-gray-50 flex justify-between rounded-b-lg">
          <Button variant="outline" onClick={() => setShowAssignForm(false)}>Cancel</Button>
          <div className="space-x-3">
            <Button variant="outline" onClick={handleSaveAssignDraft}>Save Draft</Button>
            <Button className="bg-blue-600 text-white" onClick={handlePublishAssign}>Publish Assignment</Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderExamForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
          <h2 className="text-xl font-semibold text-gray-800">{examForm.id ? 'Edit Test' : 'Schedule Test'}</h2>
          <Button variant="ghost" size="sm" onClick={() => setShowExamForm(false)}><XCircle className="w-5 h-5 text-gray-500" /></Button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          <div>
            <h3 className="font-semibold text-sm text-blue-800 mb-3 uppercase tracking-wider">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Test Title <span className="text-red-500">*</span></label>
                <Input value={examForm.name || ''} onChange={e => setExamForm({...examForm, name: e.target.value})} placeholder="e.g. Periodic Chemistry Evaluation" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Type</label>
                <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none" value={examForm.type || 'Unit Test'} onChange={e => setExamForm({...examForm, type: e.target.value})}>
                  <option value="Unit Test">Unit Test</option>
                  <option value="Chapter Test">Chapter Test</option>
                  <option value="Weekly Test">Weekly Test</option>
                  <option value="Mock Test">Mock Test</option>
                  <option value="Term Examination">Term Examination</option>
                  <option value="Internal Assessment">Internal Assessment</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Subject</label>
                <Input value={examForm.subject || ''} onChange={e => setExamForm({...examForm, subject: e.target.value})} placeholder="e.g. Chemistry" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm text-blue-800 mb-3 uppercase tracking-wider">Academic Mapping</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Target Batch <span className="text-red-500">*</span></label>
                <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none" value={examForm.batch || ''} onChange={e => setExamForm({...examForm, batch: e.target.value})}>
                  <option value="">Select a batch...</option>
                  {teacherBatches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm text-blue-800 mb-3 uppercase tracking-wider">Exam Schedule</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Exam Date</label>
                <Input type="date" value={examForm.examDate === 'Not Set' ? '' : (examForm.examDate || '')} onChange={e => setExamForm({...examForm, examDate: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Start Time</label>
                <Input type="time" value={examForm.startTime || ''} onChange={e => setExamForm({...examForm, startTime: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Duration</label>
                <Input value={examForm.duration || ''} onChange={e => setExamForm({...examForm, duration: e.target.value})} placeholder="e.g. 90 mins" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm text-blue-800 mb-3 uppercase tracking-wider">Evaluation</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Total Marks</label>
                <Input type="number" value={examForm.totalMarks || 100} onChange={e => setExamForm({...examForm, totalMarks: parseInt(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Passing Threshold</label>
                <Input type="number" value={examForm.passingMarks || 40} onChange={e => setExamForm({...examForm, passingMarks: parseInt(e.target.value)})} />
              </div>
            </div>
          </div>

        </div>
        <div className="p-4 border-t bg-gray-50 flex justify-between rounded-b-lg">
          <Button variant="outline" onClick={() => setShowExamForm(false)}>Cancel</Button>
          <div className="space-x-3">
            <Button variant="outline" onClick={handleSaveExamDraft}>Save Draft</Button>
            <Button className="bg-blue-600 text-white" onClick={handleScheduleExam}>Schedule Exam</Button>
          </div>
        </div>
      </div>
    </div>
  );

  const getStatusBadgeColor = (status: string) => {
    switch(status) {
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Published': 
      case 'Scheduled': return 'bg-blue-100 text-blue-800';
      case 'Closed': 
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      case 'Marks Published': return 'bg-purple-100 text-purple-800';
      case 'Marks Pending': return 'bg-orange-100 text-orange-800';
      case 'In Progress': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Assignment and Exams</h1>
          <p className="text-gray-600 mt-1">Manage homework, practice sets, and classroom evaluations</p>
        </div>
        <div>
          {activePrimaryTab === 'homework' ? (
            <Button className="bg-blue-600 text-white" onClick={() => {
              setAssignForm({});
              setShowAssignForm(true);
            }}>
              <Plus className="w-4 h-4 mr-2" /> Create Assignment
            </Button>
          ) : (
            <Button className="bg-blue-600 text-white" onClick={() => {
              setExamForm({});
              setShowExamForm(true);
            }}>
              <Plus className="w-4 h-4 mr-2" /> Schedule Test
            </Button>
          )}
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 text-green-800 rounded-lg flex items-center border border-green-200">
          <CheckCircle2 className="w-5 h-5 mr-3 text-green-500" />
          {successMessage}
        </div>
      )}

      {/* Primary Tabs */}
      <div className="flex space-x-1 border-b mb-6">
        <button
          className={`py-3 px-6 font-medium text-sm flex items-center border-b-2 transition-colors ${activePrimaryTab === 'homework' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          onClick={() => { setActivePrimaryTab('homework'); setActiveSubTab('active'); }}
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Homework & Assignments
        </button>
        <button
          className={`py-3 px-6 font-medium text-sm flex items-center border-b-2 transition-colors ${activePrimaryTab === 'exams' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          onClick={() => { setActivePrimaryTab('exams'); setActiveSubTab('active'); }}
        >
          <ClipboardList className="w-4 h-4 mr-2" />
          Exams & Assessments
        </button>
      </div>

      {/* Secondary Tabs */}
      <div className="flex space-x-4 mb-6">
        <button
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeSubTab === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          onClick={() => setActiveSubTab('active')}
        >
          {activePrimaryTab === 'homework' ? 'Active Assignments' : 'Scheduled / Active Exams'}
        </button>
        <button
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeSubTab === 'drafts' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          onClick={() => setActiveSubTab('drafts')}
        >
          Drafts
        </button>
      </div>

      {renderFilters()}

      <Card>
        <div className="overflow-x-auto min-h-[300px]">
          {activePrimaryTab === 'homework' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Assignment</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Subject</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Target Batch</th>
                  {activeSubTab === 'active' && <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Assigned</th>}
                  {activeSubTab === 'drafts' && <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Last Updated</th>}
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Due Date</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(paginatedData as AssignmentItem[]).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="w-10 h-10 text-gray-300 mb-3" />
                        <p>No {activeSubTab === 'active' ? 'active assignments' : 'assignment drafts'} found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  (paginatedData as AssignmentItem[]).map((assign) => (
                    <tr key={assign.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{assign.title}</div>
                        <div className="text-xs text-gray-500">{assign.type}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{assign.subject}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{assign.batch}</td>
                      {activeSubTab === 'active' && <td className="py-3 px-4 text-sm text-gray-600">{assign.assignedDate || '-'}</td>}
                      {activeSubTab === 'drafts' && <td className="py-3 px-4 text-sm text-gray-600">Today</td>}
                      <td className="py-3 px-4 text-sm text-gray-600">{assign.dueDate}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(assign.status)}`}>
                          {assign.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => setShowAssignDetails(assign)} title="View Details">
                            <Eye className="w-4 h-4 text-gray-500" />
                          </Button>
                          {(assign.status === 'Draft' || assign.status === 'Published') && (
                            <Button variant="ghost" size="sm" onClick={() => {
                              setAssignForm(assign);
                              setShowAssignForm(true);
                            }} title="Edit">
                              <Edit3 className="w-4 h-4 text-blue-500" />
                            </Button>
                          )}
                          {assign.status === 'Published' && (
                            <Button variant="ghost" size="sm" onClick={() => handleCloseAssign(assign.id)} title="Close Assignment">
                              <XCircle className="w-4 h-4 text-yellow-600" />
                            </Button>
                          )}
                          {assign.status === 'Draft' && (
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteAssign(assign.id)} title="Delete Draft">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Test Name</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Subject</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Target Batch</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Exam Date</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Marks</th>
                  {activeSubTab === 'active' && <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Average</th>}
                  {activeSubTab === 'drafts' && <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Last Updated</th>}
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(paginatedData as ExamItem[]).length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-500">
                       <div className="flex flex-col items-center justify-center">
                        <ClipboardList className="w-10 h-10 text-gray-300 mb-3" />
                        <p>No {activeSubTab === 'active' ? 'scheduled examinations' : 'examination drafts'} found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  (paginatedData as ExamItem[]).map((exam) => (
                    <tr key={exam.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{exam.name}</div>
                        <div className="text-xs text-gray-500">{exam.type}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{exam.subject}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{exam.batch}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {exam.examDate}
                        {exam.startTime && <div className="text-xs text-gray-400">{exam.startTime}</div>}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {exam.totalMarks} <span className="text-xs text-gray-400">(Pass: {exam.passingMarks})</span>
                      </td>
                      {activeSubTab === 'active' && (
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {exam.average || <span className="text-gray-400 italic">Not available</span>}
                        </td>
                      )}
                      {activeSubTab === 'drafts' && <td className="py-3 px-4 text-sm text-gray-600">Today</td>}
                      <td className="py-3 px-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(exam.status)}`}>
                          {exam.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => setShowExamDetails(exam)} title="View Details">
                            <Eye className="w-4 h-4 text-gray-500" />
                          </Button>
                          {(exam.status === 'Draft' || exam.status === 'Scheduled') && (
                            <Button variant="ghost" size="sm" onClick={() => {
                              setExamForm(exam);
                              setShowExamForm(true);
                            }} title="Edit">
                              <Edit3 className="w-4 h-4 text-blue-500" />
                            </Button>
                          )}
                          {exam.status === 'Scheduled' && (
                            <Button variant="ghost" size="sm" onClick={() => handleCancelExam(exam.id)} title="Cancel Exam">
                              <XCircle className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                          {exam.status === 'Draft' && (
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteExam(exam.id)} title="Delete Draft">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        {totalPages > 1 && (
          <div className="p-4 border-t">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </Card>

      {/* Side-Sheets for Details */}
      {showAssignDetails && (
        <div className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-2xl z-50 border-l flex flex-col transform transition-transform duration-300">
          <div className="flex items-center justify-between p-6 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              Assignment Details
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setShowAssignDetails(null)}><XCircle className="w-5 h-5 text-gray-500" /></Button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-6">
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadgeColor(showAssignDetails.status)}`}>
                {showAssignDetails.status}
              </span>
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-1">{showAssignDetails.title}</h3>
            <p className="text-sm text-gray-500 mb-6">{showAssignDetails.type} • {showAssignDetails.subject}</p>

            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Academic Mapping</h4>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-500 block">Target Batch</span><span className="font-medium text-gray-900">{showAssignDetails.batch}</span></div>
                    <div><span className="text-gray-500 block">Created By</span><span className="font-medium text-gray-900">{currentUser?.name}</span></div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Schedule</h4>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-500 block">Assigned On</span><span className="font-medium text-gray-900">{showAssignDetails.assignedDate || '-'}</span></div>
                    <div><span className="text-gray-500 block">Due Date</span><span className="font-medium text-gray-900">{showAssignDetails.dueDate}</span></div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Instructions</h4>
                <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border whitespace-pre-wrap">
                  {showAssignDetails.description || 'No detailed instructions provided.'}
                </p>
              </div>

              {showAssignDetails.attachmentName && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Attachments</h4>
                  <div className="flex items-center p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-700 text-sm">
                    <FileText className="w-4 h-4 mr-2" />
                    {showAssignDetails.attachmentName}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="p-4 border-t bg-gray-50 flex gap-3">
            {showAssignDetails.status === 'Draft' && (
              <>
                <Button className="flex-1 bg-blue-600 text-white" onClick={() => {
                  setAssignForm(showAssignDetails);
                  setShowAssignDetails(null);
                  setShowAssignForm(true);
                }}>Edit & Publish</Button>
              </>
            )}
            {showAssignDetails.status === 'Published' && (
              <Button className="flex-1 bg-yellow-500 text-white" onClick={() => {
                handleCloseAssign(showAssignDetails.id);
                setShowAssignDetails(null);
              }}>Close Assignment</Button>
            )}
            <Button variant="outline" className="flex-1" onClick={() => setShowAssignDetails(null)}>Close View</Button>
          </div>
        </div>
      )}

      {showExamDetails && (
        <div className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-2xl z-50 border-l flex flex-col transform transition-transform duration-300">
          <div className="flex items-center justify-between p-6 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <ClipboardList className="w-5 h-5 mr-2 text-blue-600" />
              Examination Details
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setShowExamDetails(null)}><XCircle className="w-5 h-5 text-gray-500" /></Button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-6">
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadgeColor(showExamDetails.status)}`}>
                {showExamDetails.status}
              </span>
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-1">{showExamDetails.name}</h3>
            <p className="text-sm text-gray-500 mb-6">{showExamDetails.type} • {showExamDetails.subject}</p>

            <div className="space-y-6">
              {showExamDetails.status === 'Marks Published' && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <div className="text-sm text-blue-700 font-semibold mb-1">Class Average</div>
                  <div className="text-2xl font-bold text-blue-900">{showExamDetails.average}</div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Academic Mapping</h4>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-500 block">Target Batch</span><span className="font-medium text-gray-900">{showExamDetails.batch}</span></div>
                    <div><span className="text-gray-500 block">Created By</span><span className="font-medium text-gray-900">{currentUser?.name}</span></div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Schedule</h4>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="col-span-2"><span className="text-gray-500 block">Exam Date</span><span className="font-medium text-gray-900">{showExamDetails.examDate}</span></div>
                    <div><span className="text-gray-500 block">Start Time</span><span className="font-medium text-gray-900">{showExamDetails.startTime || '-'}</span></div>
                    <div><span className="text-gray-500 block">Duration</span><span className="font-medium text-gray-900">{showExamDetails.duration || '-'}</span></div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Evaluation Rules</h4>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-500 block">Total Marks</span><span className="font-medium text-gray-900">{showExamDetails.totalMarks}</span></div>
                    <div><span className="text-gray-500 block">Passing Threshold</span><span className="font-medium text-gray-900">{showExamDetails.passingMarks}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 border-t bg-gray-50 flex gap-3">
            {showExamDetails.status === 'Draft' && (
              <Button className="flex-1 bg-blue-600 text-white" onClick={() => {
                setExamForm(showExamDetails);
                setShowExamDetails(null);
                setShowExamForm(true);
              }}>Edit & Schedule</Button>
            )}
            {showExamDetails.status === 'Scheduled' && (
              <Button className="flex-1 bg-red-500 text-white" onClick={() => handleCancelExam(showExamDetails.id)}>Cancel Exam</Button>
            )}
            {(showExamDetails.status === 'Completed' || showExamDetails.status === 'Marks Published') && (
              <Button className="flex-1 bg-green-600 text-white" onClick={() => {
                 window.location.href = '/teacher/grades'; 
              }}>View Results</Button>
            )}
            <Button variant="outline" className="flex-1" onClick={() => setShowExamDetails(null)}>Close View</Button>
          </div>
        </div>
      )}

    </div>
  );
};
