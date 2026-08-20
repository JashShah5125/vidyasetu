import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Pagination } from '../ui/Pagination';
import { 
  Plus, 
  ArrowLeft, 
  BookOpen, 
  ClipboardList, 
  CheckCircle2, 
  Edit3, 
  Eye, 
  FileText, 
  Trash2, 
  XCircle,
  Search
} from 'lucide-react';
import type { AssignmentItem, ExamItem } from '../../data/mockData';
import { TEACHER_ASSIGNED_BATCHES } from '../../data/mockData';
import teachersList from '../../data/teachers.json';
import courseHierarchy from '../../data/courseHierarchy.json';

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
    sendNotification,
    addToast
  } = useApp();

  // Find logged-in teacher from teachers.json
  const currentTeacher = useMemo(() => {
    return teachersList.find(t =>
      t.id === currentUser?.id ||
      t.name === currentUser?.name ||
      (currentUser?.email && t.name.toLowerCase().includes(currentUser.email.split('@')[0]))
    ) || teachersList.find(t => t.id === 'EMP-002') || teachersList[0];
  }, [currentUser]);

  const teacherAssignedBatches = useMemo(() => {
    if (currentTeacher?.batches && currentTeacher.batches.length > 0) {
      return currentTeacher.batches;
    }
    return TEACHER_ASSIGNED_BATCHES;
  }, [currentTeacher]);
  
  // Navigation Tabs state
  const [activePrimaryTab, setActivePrimaryTab] = useState<'homework' | 'exams'>('homework');
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'drafts'>('active');

  // Hierarchy Filters State
  const [filterBranch, setFilterBranch] = useState<string>('All');
  const [filterCourse, setFilterCourse] = useState<string>('All');
  const [filterProgram, setFilterProgram] = useState<string>('All');
  const [filterLevel, setFilterLevel] = useState<string>('All');
  const [filterAcademicYear, setFilterAcademicYear] = useState<string>('All');
  const [filterBatch, setFilterBatch] = useState<string>('All');
  const [filterSubject, setFilterSubject] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Forms / Modals / Full-Page View state
  const [showAssignForm, setShowAssignForm] = useState<boolean>(false);
  const [showExamForm, setShowExamForm] = useState<boolean>(false);
  const [assignForm, setAssignForm] = useState<Partial<AssignmentItem>>({});
  const [examForm, setExamForm] = useState<Partial<ExamItem>>({});
  
  // Side Drawers for Details
  const [showAssignDetails, setShowAssignDetails] = useState<AssignmentItem | null>(null);
  const [showExamDetails, setShowExamDetails] = useState<ExamItem | null>(null);

  // Scroll to top when entering full-page view
  useEffect(() => {
    if (showAssignForm || showExamForm) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [showAssignForm, showExamForm]);

  // Dynamic hierarchy options derived from courseHierarchy.json
  const availableCourses = useMemo(() => {
    return (courseHierarchy as any).courses || [];
  }, []);

  const availablePrograms = useMemo(() => {
    if (filterCourse === 'All') return [];
    const found = availableCourses.find((c: any) => c.name === filterCourse);
    return found ? found.programs : [];
  }, [filterCourse, availableCourses]);

  const availableLevels = useMemo(() => {
    if (filterProgram === 'All') return [];
    const found = availablePrograms.find((p: any) => p.name === filterProgram);
    return found ? found.levels : [];
  }, [filterProgram, availablePrograms]);

  const availableAcademicYears = useMemo(() => {
    if (filterLevel === 'All') return [];
    const found = availableLevels.find((l: any) => l.name === filterLevel);
    return found ? found.academicYears : [];
  }, [filterLevel, availableLevels]);

  const teacherBatches = useMemo(() => {
    return batches.filter(b => teacherAssignedBatches.includes(b.name));
  }, [batches, teacherAssignedBatches]);

  const filteredBatches = useMemo(() => {
    return teacherBatches.filter(b => {
      if (filterBranch !== 'All' && b.branch !== filterBranch) return false;
      if (filterCourse !== 'All' && b.course !== filterCourse) return false;
      if (filterProgram !== 'All' && b.program !== filterProgram) return false;
      if (filterLevel !== 'All' && b.level !== filterLevel) return false;
      if (filterAcademicYear !== 'All' && b.academicYear !== filterAcademicYear) return false;
      return true;
    });
  }, [teacherBatches, filterBranch, filterCourse, filterProgram, filterLevel, filterAcademicYear]);

  // Reset dependent filters
  const handleCourseChange = (val: string) => {
    setFilterCourse(val);
    setFilterProgram('All');
    setFilterLevel('All');
    setFilterAcademicYear('All');
    setFilterBatch('All');
  };

  const handleProgramChange = (val: string) => {
    setFilterProgram(val);
    setFilterLevel('All');
    setFilterAcademicYear('All');
    setFilterBatch('All');
  };

  const handleLevelChange = (val: string) => {
    setFilterLevel(val);
    setFilterAcademicYear('All');
    setFilterBatch('All');
  };

  const handleAcademicYearChange = (val: string) => {
    setFilterAcademicYear(val);
    setFilterBatch('All');
  };

  // Filtered Homework / Assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter(item => {
      const isTeacherBatch = teacherAssignedBatches.includes(item.batch);
      if (!isTeacherBatch) return false;

      if (activeSubTab === 'active' && item.status === 'Draft') return false;
      if (activeSubTab === 'drafts' && item.status !== 'Draft') return false;

      const batchObj = batches.find(b => b.name === item.batch);
      if (filterBranch !== 'All' && batchObj?.branch !== filterBranch) return false;
      if (filterCourse !== 'All' && batchObj?.course !== filterCourse) return false;
      if (filterProgram !== 'All' && batchObj?.program !== filterProgram) return false;
      if (filterLevel !== 'All' && batchObj?.level !== filterLevel) return false;
      if (filterAcademicYear !== 'All' && batchObj?.academicYear !== filterAcademicYear) return false;
      if (filterBatch !== 'All' && item.batch !== filterBatch) return false;

      if (filterSubject !== 'All' && item.subject !== filterSubject) return false;
      if (filterStatus !== 'All' && item.status !== filterStatus) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchSubj = item.subject.toLowerCase().includes(query);
        const matchBatch = item.batch.toLowerCase().includes(query);
        if (!matchTitle && !matchSubj && !matchBatch) return false;
      }

      return true;
    });
  }, [assignments, teacherAssignedBatches, activeSubTab, batches, filterBranch, filterCourse, filterProgram, filterLevel, filterAcademicYear, filterBatch, filterSubject, filterStatus, searchQuery]);

  // Filtered Exams / Assessments
  const filteredExams = useMemo(() => {
    return exams.filter(item => {
      const isTeacherBatch = teacherAssignedBatches.includes(item.batch);
      if (!isTeacherBatch) return false;

      if (activeSubTab === 'active' && item.status === 'Draft') return false;
      if (activeSubTab === 'drafts' && item.status !== 'Draft') return false;

      const batchObj = batches.find(b => b.name === item.batch);
      if (filterBranch !== 'All' && batchObj?.branch !== filterBranch) return false;
      if (filterCourse !== 'All' && batchObj?.course !== filterCourse) return false;
      if (filterProgram !== 'All' && batchObj?.program !== filterProgram) return false;
      if (filterLevel !== 'All' && batchObj?.level !== filterLevel) return false;
      if (filterAcademicYear !== 'All' && batchObj?.academicYear !== filterAcademicYear) return false;
      if (filterBatch !== 'All' && item.batch !== filterBatch) return false;

      if (filterSubject !== 'All' && item.subject !== filterSubject) return false;
      if (filterStatus !== 'All' && item.status !== filterStatus) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(query);
        const matchSubj = item.subject.toLowerCase().includes(query);
        const matchBatch = item.batch.toLowerCase().includes(query);
        if (!matchName && !matchSubj && !matchBatch) return false;
      }

      return true;
    });
  }, [exams, teacherAssignedBatches, activeSubTab, batches, filterBranch, filterCourse, filterProgram, filterLevel, filterAcademicYear, filterBatch, filterSubject, filterStatus, searchQuery]);

  const currentData = activePrimaryTab === 'homework' ? filteredAssignments : filteredExams;
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return currentData.slice(start, start + itemsPerPage);
  }, [currentData, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activePrimaryTab, activeSubTab, filterBranch, filterCourse, filterProgram, filterLevel, filterAcademicYear, filterBatch, filterSubject, filterStatus, searchQuery]);

  // ----------------------------------------------------
  // ACTIONS (WITH TOAST NOTIFICATIONS)
  // ----------------------------------------------------
  const handleSaveAssignDraft = () => {
    if (!assignForm.title || !assignForm.batch) {
      addToast('Title and Target Batch are required to save draft.', 'error');
      return;
    }
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
      addToast(`Assignment "${newAssign.title}" updated in drafts.`, 'success');
    } else {
      setAssignments(prev => [newAssign, ...prev]);
      addToast(`Assignment "${newAssign.title}" saved as draft.`, 'success');
    }
    setShowAssignForm(false);
  };

  const handlePublishAssign = () => {
    if (!assignForm.title || !assignForm.batch || !assignForm.dueDate) {
      addToast('Please fill in Assignment Title, Target Batch, and Due Date.', 'error');
      return;
    }
    
    const isEditing = Boolean(assignForm.id);
    const newId = assignForm.id || `A-${Date.now()}`;
    const newAssign: AssignmentItem = {
      ...(assignForm as AssignmentItem),
      type: assignForm.type || 'Homework',
      id: newId,
      status: 'Published',
      assignedDate: assignForm.assignedDate || new Date().toISOString().split('T')[0]
    };
    
    if (isEditing) {
      setAssignments(prev => prev.map(a => a.id === newId ? newAssign : a));
      addToast(`Assignment "${newAssign.title}" updated successfully!`, 'success');
    } else {
      setAssignments(prev => [newAssign, ...prev]);
      addToast(`Assignment "${newAssign.title}" published to ${newAssign.batch}!`, 'success');
    }

    sendNotification({
      id: `N-${Date.now()}`,
      title: `Assignment: ${newAssign.title}`,
      message: `An assignment has been published for ${newAssign.batch}. Due Date: ${newAssign.dueDate}`,
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
  };

  const handleCloseAssign = (id: string) => {
    const item = assignments.find(a => a.id === id);
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, status: 'Closed' } : a));
    setShowAssignDetails(null);
    addToast(`Assignment "${item?.title || ''}" closed successfully.`, 'info');
  };

  const handleDeleteAssign = (id: string) => {
    const item = assignments.find(a => a.id === id);
    setAssignments(prev => prev.filter(a => a.id !== id));
    setShowAssignDetails(null);
    addToast(`Assignment "${item?.title || ''}" deleted successfully.`, 'success');
  };

  const handleSaveExamDraft = () => {
    if (!examForm.name || !examForm.batch) {
      addToast('Test title and Target Batch are required.', 'error');
      return;
    }
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
      addToast(`Exam "${newExam.name}" updated in drafts.`, 'success');
    } else {
      setExams(prev => [newExam, ...prev]);
      addToast(`Exam "${newExam.name}" saved as draft.`, 'success');
    }
    setShowExamForm(false);
  };

  const handleScheduleExam = () => {
    if (!examForm.name || !examForm.batch || !examForm.examDate) {
      addToast('Please fill in Test Name, Target Batch, and Exam Date.', 'error');
      return;
    }
    
    const isEditing = Boolean(examForm.id);
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
    
    if (isEditing) {
      setExams(prev => prev.map(e => e.id === newId ? newExam : e));
      addToast(`Exam "${newExam.name}" updated successfully!`, 'success');
    } else {
      setExams(prev => [newExam, ...prev]);
      addToast(`Exam "${newExam.name}" scheduled for ${newExam.batch}!`, 'success');
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
  };

  const handleCancelExam = (id: string) => {
    const item = exams.find(e => e.id === id);
    setExams(prev => prev.map(e => e.id === id ? { ...e, status: 'Cancelled' } : e));
    setShowExamDetails(null);
    addToast(`Exam "${item?.name || ''}" cancelled.`, 'info');
  };

  const handleDeleteExam = (id: string) => {
    const item = exams.find(e => e.id === id);
    setExams(prev => prev.filter(e => e.id !== id));
    setShowExamDetails(null);
    addToast(`Exam draft "${item?.name || ''}" deleted.`, 'success');
  };

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

  // ----------------------------------------------------
  // FULL PAGE VIEW: ASSIGNMENT CREATE / EDIT
  // ----------------------------------------------------
  if (showAssignForm) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
        {/* Header with Back button */}
        <div className="flex items-center gap-4 border-b border-slate-200 pb-5">
          <button
            onClick={() => setShowAssignForm(false)}
            className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">
              {assignForm.id ? `Edit Assignment: ${assignForm.title}` : 'Create New Assignment'}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {assignForm.id
                ? 'Update assignment curriculum, instructions, target batch, and submission due date.'
                : 'Configure homework, practice worksheets, or revision tasks for your batches.'}
            </p>
          </div>
        </div>

        {/* Full-Page Form Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="font-semibold text-sm text-blue-800 mb-4 uppercase tracking-wider flex items-center gap-2">
              <BookOpen size={16} className="text-blue-600" /> Basic Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Assignment Title <span className="text-red-500">*</span>
                </label>
                <Input
                  value={assignForm.title || ''}
                  onChange={e => setAssignForm({ ...assignForm, title: e.target.value })}
                  placeholder="e.g. Kinematics Problem Set #4"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Assignment Type</label>
                <select
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  value={assignForm.type || 'Homework'}
                  onChange={e => setAssignForm({ ...assignForm, type: e.target.value })}
                >
                  <option value="Homework">Homework</option>
                  <option value="Worksheet">Worksheet</option>
                  <option value="Practice set">Practice set</option>
                  <option value="Reading task">Reading task</option>
                  <option value="Revision work">Revision work</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Subject</label>
                <Input
                  value={assignForm.subject || ''}
                  onChange={e => setAssignForm({ ...assignForm, subject: e.target.value })}
                  placeholder="e.g. Physics"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Instructions / Description</label>
                <textarea
                  rows={4}
                  className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  value={assignForm.description || ''}
                  onChange={e => setAssignForm({ ...assignForm, description: e.target.value })}
                  placeholder="Enter detailed instructions, problem numbers, or reference book chapters..."
                />
              </div>
            </div>
          </div>

          {/* Academic Target & Schedule */}
          <div className="pt-6 border-t border-slate-100">
            <h3 className="font-semibold text-sm text-blue-800 mb-4 uppercase tracking-wider flex items-center gap-2">
              <ClipboardList size={16} className="text-blue-600" /> Target Batch & Schedule
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Target Batch <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  value={assignForm.batch || ''}
                  onChange={e => setAssignForm({ ...assignForm, batch: e.target.value })}
                >
                  <option value="">Select a batch...</option>
                  {teacherBatches.map(b => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={assignForm.dueDate === 'Not Set' ? '' : (assignForm.dueDate || '')}
                  onChange={e => setAssignForm({ ...assignForm, dueDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAssignForm(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveAssignDraft}
                className="cursor-pointer"
              >
                Save Draft
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handlePublishAssign}
                style={{ backgroundColor: '#2563eb', color: 'white' }}
                className="cursor-pointer font-semibold shadow-sm px-6"
              >
                {assignForm.id ? 'Save & Update Assignment' : 'Publish Assignment'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // FULL PAGE VIEW: EXAM CREATE / EDIT
  // ----------------------------------------------------
  if (showExamForm) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
        {/* Header with Back button */}
        <div className="flex items-center gap-4 border-b border-slate-200 pb-5">
          <button
            onClick={() => setShowExamForm(false)}
            className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">
              {examForm.id ? `Edit Test: ${examForm.name}` : 'Schedule Examination / Test'}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {examForm.id
                ? 'Update examination schedule, target batch, marks, and evaluation parameters.'
                : 'Configure unit tests, mock exams, or chapter evaluations for your students.'}
            </p>
          </div>
        </div>

        {/* Full-Page Form Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="font-semibold text-sm text-blue-800 mb-4 uppercase tracking-wider flex items-center gap-2">
              <ClipboardList size={16} className="text-blue-600" /> Basic Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Test Title <span className="text-red-500">*</span>
                </label>
                <Input
                  value={examForm.name || ''}
                  onChange={e => setExamForm({ ...examForm, name: e.target.value })}
                  placeholder="e.g. Periodic Chemistry Evaluation #2"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Test Type</label>
                <select
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  value={examForm.type || 'Unit Test'}
                  onChange={e => setExamForm({ ...examForm, type: e.target.value })}
                >
                  <option value="Unit Test">Unit Test</option>
                  <option value="Chapter Test">Chapter Test</option>
                  <option value="Weekly Test">Weekly Test</option>
                  <option value="Mock Test">Mock Test</option>
                  <option value="Term Examination">Term Examination</option>
                  <option value="Internal Assessment">Internal Assessment</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Subject</label>
                <Input
                  value={examForm.subject || ''}
                  onChange={e => setExamForm({ ...examForm, subject: e.target.value })}
                  placeholder="e.g. Chemistry"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Target Batch <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  value={examForm.batch || ''}
                  onChange={e => setExamForm({ ...examForm, batch: e.target.value })}
                >
                  <option value="">Select a batch...</option>
                  {teacherBatches.map(b => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Schedule & Timing */}
          <div className="pt-6 border-t border-slate-100">
            <h3 className="font-semibold text-sm text-blue-800 mb-4 uppercase tracking-wider flex items-center gap-2">
              <BookOpen size={16} className="text-blue-600" /> Exam Schedule & Timing
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Exam Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={examForm.examDate === 'Not Set' ? '' : (examForm.examDate || '')}
                  onChange={e => setExamForm({ ...examForm, examDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Start Time</label>
                <Input
                  type="time"
                  value={examForm.startTime || ''}
                  onChange={e => setExamForm({ ...examForm, startTime: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Duration</label>
                <Input
                  value={examForm.duration || ''}
                  onChange={e => setExamForm({ ...examForm, duration: e.target.value })}
                  placeholder="e.g. 90 mins"
                />
              </div>
            </div>
          </div>

          {/* Evaluation Rules */}
          <div className="pt-6 border-t border-slate-100">
            <h3 className="font-semibold text-sm text-blue-800 mb-4 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 size={16} className="text-blue-600" /> Evaluation & Marks
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Total Marks</label>
                <Input
                  type="number"
                  value={examForm.totalMarks || 100}
                  onChange={e => setExamForm({ ...examForm, totalMarks: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Passing Threshold</label>
                <Input
                  type="number"
                  value={examForm.passingMarks || 40}
                  onChange={e => setExamForm({ ...examForm, passingMarks: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowExamForm(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveExamDraft}
                className="cursor-pointer"
              >
                Save Draft
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleScheduleExam}
                style={{ backgroundColor: '#2563eb', color: 'white' }}
                className="cursor-pointer font-semibold shadow-sm px-6"
              >
                {examForm.id ? 'Save & Update Exam' : 'Schedule Exam'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Assignment and Exams</h1>
          <p className="text-gray-600 mt-1">Manage homework, practice sets, and classroom evaluations</p>
        </div>
        <div>
          {activePrimaryTab === 'homework' ? (
            <Button className="bg-blue-600 text-white cursor-pointer" onClick={() => {
              setAssignForm({});
              setShowAssignForm(true);
            }}>
              <Plus className="w-4 h-4 mr-2" /> Create Assignment
            </Button>
          ) : (
            <Button className="bg-blue-600 text-white cursor-pointer" onClick={() => {
              setExamForm({});
              setShowExamForm(true);
            }}>
              <Plus className="w-4 h-4 mr-2" /> Schedule Test
            </Button>
          )}
        </div>
      </div>

      {/* Primary Tabs */}
      <div className="flex space-x-1 border-b mb-6">
        <button
          className={`py-3 px-6 font-medium text-sm flex items-center border-b-2 transition-colors cursor-pointer ${activePrimaryTab === 'homework' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          onClick={() => { setActivePrimaryTab('homework'); setActiveSubTab('active'); }}
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Homework & Assignments
        </button>
        <button
          className={`py-3 px-6 font-medium text-sm flex items-center border-b-2 transition-colors cursor-pointer ${activePrimaryTab === 'exams' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          onClick={() => { setActivePrimaryTab('exams'); setActiveSubTab('active'); }}
        >
          <ClipboardList className="w-4 h-4 mr-2" />
          Exams & Assessments
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex space-x-4 mb-6">
        <button
          className={`px-4 py-2 text-sm font-medium rounded-md cursor-pointer ${activeSubTab === 'active' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveSubTab('active')}
        >
          {activePrimaryTab === 'homework' ? 'Active Homework' : 'Scheduled & Completed'} ({activePrimaryTab === 'homework' ? filteredAssignments.length : filteredExams.length})
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-md cursor-pointer ${activeSubTab === 'drafts' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveSubTab('drafts')}
        >
          Drafts ({activePrimaryTab === 'homework' ? assignments.filter(a => a.status === 'Draft' && teacherAssignedBatches.includes(a.batch)).length : exams.filter(e => e.status === 'Draft' && teacherAssignedBatches.includes(e.batch)).length})
        </button>
      </div>

      {/* Filters Bar */}
      <Card className="mb-6 bg-slate-50 border border-slate-200">
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Branch */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Branch</label>
              <select className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none" value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
                <option value="All">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
            </div>

            {/* Course */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Course</label>
              <select className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none" value={filterCourse} onChange={(e) => handleCourseChange(e.target.value)}>
                <option value="All">All Courses</option>
                {availableCourses.map((c: any) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            {/* Program */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Program</label>
              <select className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none" value={filterProgram} onChange={(e) => handleProgramChange(e.target.value)}>
                <option value="All">All Programs</option>
                {availablePrograms.map((p: any) => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            </div>

            {/* Level */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Level</label>
              <select className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none" value={filterLevel} onChange={(e) => handleLevelChange(e.target.value)}>
                <option value="All">All Levels</option>
                {availableLevels.map((l: any) => <option key={l.name} value={l.name}>{l.name}</option>)}
              </select>
            </div>

            {/* Academic Year */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Academic Year</label>
              <select className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none" value={filterAcademicYear} onChange={(e) => handleAcademicYearChange(e.target.value)}>
                <option value="All">All Years</option>
                {availableAcademicYears.map((y: any) => <option key={y.name} value={y.name}>{y.name}</option>)}
              </select>
            </div>

            {/* Batch */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Batch</label>
              <select className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none" value={filterBatch} onChange={(e) => setFilterBatch(e.target.value)}>
                <option value="All">All Batches</option>
                {filteredBatches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-200">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <Input
                className="pl-9 bg-white"
                placeholder={activePrimaryTab === 'homework' ? "Search assignments..." : "Search tests..."}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Subject */}
            <div>
              <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
                <option value="All">All Subjects</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Biology">Biology</option>
              </select>
            </div>

            {/* Status */}
            <div>
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
        </div>
      </Card>

      {/* Main Table */}
      <Card className="overflow-hidden">
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
                          <Button variant="ghost" size="sm" onClick={() => setShowAssignDetails(assign)} title="View Details" className="cursor-pointer hover:bg-slate-100">
                            <Eye className="w-4 h-4 text-gray-500" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => {
                            setAssignForm({ ...assign });
                            setShowAssignForm(true);
                          }} title="Edit Assignment" className="cursor-pointer hover:bg-blue-50">
                            <Edit3 className="w-4 h-4 text-blue-600" />
                          </Button>
                          {assign.status === 'Published' && (
                            <Button variant="ghost" size="sm" onClick={() => handleCloseAssign(assign.id)} title="Close Assignment" className="cursor-pointer hover:bg-amber-50">
                              <XCircle className="w-4 h-4 text-amber-600" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteAssign(assign.id)} title="Delete Assignment" className="cursor-pointer hover:bg-red-50">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
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
                          <Button variant="ghost" size="sm" onClick={() => setShowExamDetails(exam)} title="View Details" className="cursor-pointer hover:bg-slate-100">
                            <Eye className="w-4 h-4 text-gray-500" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => {
                            setExamForm({ ...exam });
                            setShowExamForm(true);
                          }} title="Edit Exam" className="cursor-pointer hover:bg-blue-50">
                            <Edit3 className="w-4 h-4 text-blue-600" />
                          </Button>
                          {exam.status === 'Scheduled' && (
                            <Button variant="ghost" size="sm" onClick={() => handleCancelExam(exam.id)} title="Cancel Exam" className="cursor-pointer hover:bg-amber-50">
                              <XCircle className="w-4 h-4 text-amber-600" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteExam(exam.id)} title="Delete Exam" className="cursor-pointer hover:bg-red-50">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
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
              totalItems={currentData.length}
              pageSize={itemsPerPage}
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
              <Button className="flex-1 bg-red-500 text-white" onClick={() => {
                  handleCancelExam(showExamDetails.id);
                  addToast('Exam cancelled', 'info');
                  setShowExamDetails(null);
              }}>Cancel Exam</Button>
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
