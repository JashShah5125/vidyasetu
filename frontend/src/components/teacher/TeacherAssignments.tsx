import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Table } from '../ui/Table';
import { Pagination } from '../ui/Pagination';
import { Modal } from '../ui/Modal';
import { BulkImportModal } from '../ui/BulkImportModal';
import {
  Plus,
  ArrowLeft,
  BookOpen,
  ClipboardList,
  ClipboardCheck,
  CheckCircle2,
  Edit3,
  Eye,
  FileText,
  Trash2,
  XCircle,
  Loader2,
  Upload,
  Download,
  Paperclip,
  Send,
  Check,
  X,
  Layers,
  Calendar,
  Award,
  Star,
  Search,
  Users,
  Clock,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import type { ExamItem } from '../../types';
import { assignmentApi } from '../../services/assignmentApi';
import type { HomeworkItem, HomeworkScoping, HomeworkSubmission, ScopingOption } from '../../services/assignmentApi';
import { subjectApi } from '../../services/subjectApi';

interface HomeworkFormState {
  id?: string;
  title: string;
  description: string;
  assignmentType: string;
  branchId: number;
  academicYearId: number;
  subjectId: number;
  batchIds: number[];
  dueDate: string;
  maxMarks: string;
  existingFiles: string[];
}

const EMPTY_HW_FORM: HomeworkFormState = {
  title: '',
  description: '',
  assignmentType: 'assignment',
  branchId: 0,
  academicYearId: 0,
  subjectId: 0,
  batchIds: [],
  dueDate: '',
  maxMarks: '',
  existingFiles: []
};

const TYPE_OPTIONS = [
  { value: 'assignment', label: 'Assignment' },
  { value: 'homework', label: 'Homework' },
  { value: 'exam', label: 'Exam' }
];

const getTypeBadgeColor = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'exam': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'homework': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'assignment':
    default: return 'bg-blue-50 text-blue-700 border-blue-200';
  }
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
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

const typeLabel = (value: string) => {
  const found = TYPE_OPTIONS.find(t => t.value === value);
  return found ? found.label : (value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Assignment');
};

export const TeacherAssignments: React.FC = () => {
  const {
    exams,
    setExams,
    currentUser,
    sendNotification,
    addToast,
    batches
  } = useApp();
  const isBranchAdmin = currentUser?.role === 'branch-admin' || (currentUser?.role as string) === 'branch_admin';

  const [activePrimaryTab, setActivePrimaryTab] = useState<'homework' | 'assignment' | 'exams'>('homework');
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'drafts'>('active');

  const [scoping, setScoping] = useState<HomeworkScoping | null>(null);

  const activeBranchId = scoping?.branch?.id?.toString() || (scoping?.branches && scoping.branches.length === 1 ? scoping.branches[0].id.toString() : currentUser?.branchId || '');
  const activeBranchName = scoping?.branch?.name || (scoping?.branches && scoping.branches.length === 1 ? scoping.branches[0].name : currentUser?.branch || 'Assigned Branch');

  const [homeworks, setHomeworks] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionBusy, setActionBusy] = useState<boolean>(false);

  const [filterType, setFilterType] = useState<string>('All');
  const [filterBranch, setFilterBranch] = useState<string>('All');
  const [filterBatch, setFilterBatch] = useState<string>('All');
  const [filterSubject, setFilterSubject] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  const [showHwForm, setShowHwForm] = useState<boolean>(false);
  const [hwForm, setHwForm] = useState<HomeworkFormState>(EMPTY_HW_FORM);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [showHwDetail, setShowHwDetail] = useState<HomeworkItem | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [gradeInputs, setGradeInputs] = useState<Record<string, { marks: string; feedback: string }>>({});
  const [gradingId, setGradingId] = useState<string | null>(null);

  // Evaluate roster
  interface RosterStudent {
    studentId: string;
    studentName: string;
    studentCode: string;
    batchId: string;
    batchName: string;
    submissionId: string | null;
    submissionStatus: string | null;
    responseText: string;
    files: string[];
    marksObtained: number | null;
    feedback: string;
    submittedAt: string | null;
    gradedAt: string | null;
  }
  const [showEvaluate, setShowEvaluate] = useState<HomeworkItem | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterStudents, setRosterStudents] = useState<RosterStudent[]>([]);
  const [evalInputs, setEvalInputs] = useState<Record<string, { marks: string; feedback: string }>>({});
  const [evalGradingId, setEvalGradingId] = useState<string | null>(null);
  const [evalSearch, setEvalSearch] = useState<string>('');
  const [evalBatchFilter, setEvalBatchFilter] = useState<string>('All');
  const [evalStatusFilter, setEvalStatusFilter] = useState<string>('All');
  const [selectedStudent, setSelectedStudent] = useState<RosterStudent | null>(null);
  const [evalCurrentPage, setEvalCurrentPage] = useState<number>(1);
  const evalItemsPerPage = 10;
  const [isEvalImportModalOpen, setIsEvalImportModalOpen] = useState<boolean>(false);

  const [showExamForm, setShowExamForm] = useState<boolean>(false);
  const [examForm, setExamForm] = useState<Partial<ExamItem>>({});
  const [showExamDetails, setShowExamDetails] = useState<ExamItem | null>(null);

  const loadScoping = useCallback(async () => {
    try {
      const data = await assignmentApi.getScoping();
      setScoping(data);
    } catch (err: any) {
      addToast(err.message || 'Failed to load your scope', 'error');
    }
  }, [addToast]);

  const loadHomeworks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await assignmentApi.getHomeworks();
      setHomeworks(data);
    } catch (err: any) {
      addToast(err.message || 'Failed to load homework', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadScoping();
    loadHomeworks();
  }, [loadScoping, loadHomeworks]);

  useEffect(() => {
    if (showHwForm || showExamForm) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [showHwForm, showExamForm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activePrimaryTab, activeSubTab, filterBranch, filterBatch, filterSubject, filterStatus, searchQuery]);

  const filteredHomeworks = useMemo(() => {
    return homeworks.filter(item => {
      if (activeSubTab === 'active' && item.status === 'Draft') return false;
      if (activeSubTab === 'drafts' && item.status !== 'Draft') return false;

      // Scoped by active primary tab:
      const itemType = (item.assignmentType || 'assignment').toLowerCase();
      if (activePrimaryTab === 'homework' && itemType !== 'homework') return false;
      if (activePrimaryTab === 'assignment' && itemType !== 'assignment') return false;
      if (activePrimaryTab === 'exams' && itemType !== 'exam') return false;

      if (filterType !== 'All' && item.assignmentType !== filterType) return false;
      if (filterBranch !== 'All' && !isBranchAdmin && item.branchName !== filterBranch) return false;
      if (filterBatch !== 'All' && !item.batchNames.includes(filterBatch)) return false;
      if (filterSubject !== 'All' && item.subjectName !== filterSubject) return false;
      if (filterStatus !== 'All' && item.status !== filterStatus) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchSubj = item.subjectName.toLowerCase().includes(q);
        const matchBatch = item.batchNames.some(n => n.toLowerCase().includes(q));
        if (!matchTitle && !matchSubj && !matchBatch) return false;
      }
      return true;
    });
  }, [homeworks, activePrimaryTab, activeSubTab, filterType, filterBranch, filterBatch, filterSubject, filterStatus, searchQuery, isBranchAdmin]);

  const currentData = filteredHomeworks;
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return currentData.slice(start, start + itemsPerPage);
  }, [currentData, currentPage, itemsPerPage]);

  const openCreateForm = (type?: string) => {
    const selectedType = type || (activePrimaryTab === 'homework' ? 'homework' : 'assignment');
    const bId = scoping?.branches?.[0] ? Number(scoping.branches[0].id) : (isBranchAdmin && activeBranchId ? Number(activeBranchId) : 0);
    const ayId = scoping?.academicYears?.[0] ? Number(scoping.academicYears[0].id) : 0;
    const sId = scoping?.subjects?.[0] ? Number(scoping.subjects[0].id) : 0;

    setHwForm({
      ...EMPTY_HW_FORM,
      assignmentType: selectedType,
      branchId: bId,
      academicYearId: ayId,
      subjectId: sId,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
    });
    setNewFiles([]);
    setShowHwForm(true);
  };

  const openEditForm = (item: HomeworkItem | null) => {
    if (!item) return;
    setHwForm({
      id: item.id,
      title: item.title,
      description: item.description,
      assignmentType: item.assignmentType,
      branchId: Number(item.branchId),
      academicYearId: Number(item.academicYearId),
      subjectId: Number(item.subjectId),
      batchIds: item.batchIds,
      dueDate: item.dueDate || new Date().toISOString().split('T')[0],
      maxMarks: item.maxMarks !== null && item.maxMarks !== undefined ? String(item.maxMarks) : '',
      existingFiles: item.files || []
    });
    setNewFiles([]);
    setShowHwForm(true);
  };

  // ─── Direct Assigned Batches for Teacher ───
  const assignedTeacherBatches = useMemo(() => {
    if (!scoping?.batches) return [];
    if (hwForm.branchId === 0) return scoping.batches;
    return scoping.batches.filter(b => !b.branchId || Number(b.branchId) === hwForm.branchId);
  }, [scoping?.batches, hwForm.branchId]);

  const batchNameById = useMemo(() => {
    const m = new Map<number, string>();
    (scoping?.batches || []).forEach(b => m.set(Number(b.id), b.name));
    (batches || []).forEach(b => {
      if (b.id) m.set(Number(b.id), b.name);
    });
    return m;
  }, [scoping?.batches, batches]);

  const subjectOptions = useMemo(() => {
    return scoping?.subjects || [];
  }, [scoping?.subjects]);

  const toggleTargetBatch = (batchId: number) => {
    const numId = Number(batchId);
    setHwForm(prev => {
      const exists = prev.batchIds.includes(numId);
      return {
        ...prev,
        batchIds: exists ? prev.batchIds.filter(x => x !== numId) : [...prev.batchIds, numId]
      };
    });
  };

  const selectAllAssignedBatches = () => {
    const allIds = assignedTeacherBatches.map(b => Number(b.id));
    setHwForm(prev => ({
      ...prev,
      batchIds: Array.from(new Set([...prev.batchIds, ...allIds]))
    }));
  };

  const deselectAllBatches = () => {
    setHwForm(prev => ({ ...prev, batchIds: [] }));
  };

  const changeBranch = (branchId: number) => {
    setHwForm(prev => ({ ...prev, branchId }));
  };

  const changeAcademicYear = (academicYearId: number) => {
    setHwForm(prev => ({ ...prev, academicYearId }));
  };

  const submitHomeworkForm = async (mode: 'draft' | 'publish') => {
    if (!hwForm.title.trim() || hwForm.batchIds.length === 0 || !hwForm.dueDate) {
      addToast('Title, at least one target batch, and due date are required.', 'error');
      return;
    }
    if (!hwForm.subjectId || !hwForm.branchId || !hwForm.academicYearId) {
      addToast('Please choose a subject, branch, and academic year.', 'error');
      return;
    }

    setActionBusy(true);
    try {
      const payload = {
        title: hwForm.title.trim(),
        description: hwForm.description,
        branchId: hwForm.branchId,
        academicYearId: hwForm.academicYearId,
        subjectId: hwForm.subjectId,
        assignmentType: hwForm.assignmentType,
        batchIds: hwForm.batchIds,
        dueDate: hwForm.dueDate,
        maxMarks: hwForm.maxMarks ? Number(hwForm.maxMarks) : null,
        existingFiles: hwForm.existingFiles
      };

      let id = hwForm.id;
      if (id) {
        await assignmentApi.updateHomework(id, payload, newFiles);
        addToast(`Homework "${payload.title}" updated.`, 'success');
      } else {
        const res = await assignmentApi.createHomework(payload, newFiles);
        id = res.id;
        addToast(`Homework "${payload.title}" saved as draft.`, 'success');
      }

      if (mode === 'publish' && id) {
        await assignmentApi.publishHomework(id);
        addToast(`Homework "${payload.title}" published!`, 'success');
        sendNotification({
          id: `N-${Date.now()}`,
          title: `Assignment: ${payload.title}`,
          message: `An assignment has been published. Due Date: ${hwForm.dueDate}`,
          category: 'Academic',
          sender: currentUser?.name || 'Teacher',
          senderRole: 'Teacher',
          createdAt: new Date().toISOString(),
          direction: 'Outgoing',
          status: 'Unread',
          recipients: [{ type: 'Batch', id: id, name: 'Assigned batches' }]
        });
        setActiveSubTab('active');
      }

      setShowHwForm(false);
      await loadHomeworks();
    } catch (err: any) {
      addToast(err.message || 'Failed to save homework.', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const handleCloseAssign = async (item: HomeworkItem) => {
    setActionBusy(true);
    try {
      await assignmentApi.closeHomework(item.id);
      addToast(`Assignment "${item.title}" closed successfully.`, 'info');
      setShowHwDetail(null);
      await loadHomeworks();
    } catch (err: any) {
      addToast(err.message || 'Failed to close assignment.', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const handleDeleteAssign = async (item: HomeworkItem) => {
    if (!window.confirm(`Delete assignment "${item.title}"? ${item.status === 'Published' ? 'Published assignments must be closed first.' : ''}`)) return;
    setActionBusy(true);
    try {
      await assignmentApi.deleteHomework(item.id);
      addToast(`Assignment "${item.title}" deleted successfully.`, 'success');
      setShowHwDetail(null);
      await loadHomeworks();
    } catch (err: any) {
      addToast(err.message || 'Failed to delete assignment.', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const openEvaluate = async (item: HomeworkItem) => {
    setShowEvaluate(item);
    setSelectedStudent(null);
    setEvalCurrentPage(1);
    setRosterStudents([]);
    setEvalInputs({});
    setEvalSearch('');
    setEvalBatchFilter('All');
    setEvalStatusFilter('All');
    setRosterLoading(true);
    try {
      const data = await assignmentApi.getEvaluationRoster(item.id);
      setRosterStudents(data.students);
      const initial: Record<string, { marks: string; feedback: string }> = {};
      data.students.forEach(s => {
        initial[s.studentId] = {
          marks: s.marksObtained !== null && s.marksObtained !== undefined ? String(s.marksObtained) : '',
          feedback: s.feedback || ''
        };
      });
      setEvalInputs(initial);
    } catch (err: any) {
      addToast(err.message || 'Failed to load evaluation roster.', 'error');
    } finally {
      setRosterLoading(false);
    }
  };

  const handleEvalGrade = async (student: RosterStudent) => {
    if (!showEvaluate) return;
    const input = evalInputs[student.studentId] || { marks: '', feedback: '' };
    if (!input.marks && input.marks !== '0') {
      addToast('Please enter marks before saving.', 'error');
      return;
    }
    const marksNum = Number(input.marks);
    if (isNaN(marksNum) || marksNum < 0) {
      addToast('Please enter a valid positive number for marks.', 'error');
      return;
    }
    if (showEvaluate.maxMarks && marksNum > showEvaluate.maxMarks) {
      addToast(`Marks cannot exceed max marks (${showEvaluate.maxMarks}).`, 'error');
      return;
    }
    setEvalGradingId(student.studentId);
    try {
      await assignmentApi.gradeSubmission(showEvaluate.id, student.submissionId || student.studentId, {
        marksObtained: marksNum,
        feedback: input.feedback,
        studentId: student.studentId
      });
      addToast(`Grade saved for ${student.studentName}.`, 'success');
      setRosterStudents(prev => prev.map(s =>
        s.studentId === student.studentId
          ? { ...s, submissionStatus: 'Graded', marksObtained: marksNum, feedback: input.feedback }
          : s
      ));
      setSelectedStudent(prev => prev && prev.studentId === student.studentId
        ? { ...prev, submissionStatus: 'Graded', marksObtained: marksNum, feedback: input.feedback }
        : prev
      );
      await loadHomeworks();
    } catch (err: any) {
      addToast(err.message || 'Failed to save grade.', 'error');
    } finally {
      setEvalGradingId(null);
    }
  };

  const handleExportEvaluationCSV = () => {
    if (rosterStudents.length === 0) {
      addToast('No student records available to export', 'error');
      return;
    }

    const dataToExport = rosterStudents.map(s => ({
      'Student Name': s.studentName,
      'Roll No / ID': s.studentCode || '',
      'Batch': s.batchName || '',
      'Status': s.submissionStatus || 'Not Submitted',
      'Submitted On': s.submittedAt ? s.submittedAt.slice(0, 16).replace('T', ' ') : '',
      'Marks Obtained': s.marksObtained !== null && s.marksObtained !== undefined ? s.marksObtained : '',
      'Max Marks': showEvaluate?.maxMarks ?? '',
      'Teacher Feedback': s.feedback || ''
    }));

    const headers = Object.keys(dataToExport[0]);
    const csvRows: string[] = [headers.join(',')];

    for (const row of dataToExport) {
      const values = headers.map(h => `"${(row[h as keyof typeof row] ?? '').toString().replace(/"/g, '""')}"`);
      csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = (showEvaluate?.title || 'evaluation').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `${safeTitle}_evaluation_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    addToast('Evaluation roster exported successfully', 'success');
  };

  const openDetail = async (item: HomeworkItem) => {
    setShowHwDetail(item);
    if (item.status !== 'Published' && item.status !== 'Closed') {
      setSubmissions([]);
      return;
    }
    setDetailLoading(true);
    setSubmissions([]);
    setGradeInputs({});
    try {
      const res = await assignmentApi.getSubmissions(item.id);
      setSubmissions(res.submissions);
      const initial: Record<string, { marks: string; feedback: string }> = {};
      res.submissions.forEach(s => {
        initial[s.id] = { marks: s.marksObtained !== null && s.marksObtained !== undefined ? String(s.marksObtained) : '', feedback: s.feedback || '' };
      });
      setGradeInputs(initial);
    } catch (err: any) {
      addToast(err.message || 'Failed to load submissions.', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleGrade = async (submission: HomeworkSubmission) => {
    const input = gradeInputs[submission.id];
    const marks = input ? Number(input.marks) : NaN;
    if (isNaN(marks) || !input || input.marks.trim() === '') {
      addToast('Enter marks before grading.', 'error');
      return;
    }
    setGradingId(submission.id);
    try {
      await assignmentApi.gradeSubmission(submission.homeworkId, submission.id, {
        marksObtained: marks,
        feedback: input.feedback || '',
        studentId: submission.studentId,
      });
      addToast(`Graded ${submission.studentName}.`, 'success');
      if (showHwDetail) await openDetail(showHwDetail);
    } catch (err: any) {
      addToast(err.message || 'Failed to grade submission.', 'error');
    } finally {
      setGradingId(null);
    }
  };

  // ─── Exam (mock) actions ──────────────────────────────────────────────────
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

  // ─── Full page: Assignment detail (view only) ───────────────────────────────
  if (showHwDetail) {
    const item = showHwDetail;
    return (
      <div className="-mx-4 md:-mx-8 -my-6 md:-my-8 min-h-screen bg-slate-50 animate-fade-in">
        {/* Top nav */}
        <div className="bg-white border-b border-slate-200 px-6 md:px-10 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowHwDetail(null)}
              className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-display font-bold text-slate-900">{item.title}</h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${getStatusBadgeColor(item.status)}`}>
                  {item.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{item.subjectName} · {item.batchNames.join(', ') || 'No batches'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {item.status === 'Draft' && (
              <Button variant="primary" style={{ backgroundColor: '#2563eb', color: 'white' }} className="cursor-pointer" onClick={() => { openEditForm(item); setShowHwDetail(null); }}>
                <Edit3 className="w-4 h-4 mr-1.5" /> Edit Assignment
              </Button>
            )}
            {item.status === 'Published' && (
              <Button variant="secondary" className="cursor-pointer" onClick={() => handleCloseAssign(item)} disabled={actionBusy}>
                <XCircle className="w-4 h-4 mr-1.5" /> Close Assignment
              </Button>
            )}
            {(item.status === 'Published' || item.status === 'Closed') && (
              <Button
                variant="primary"
                style={{ backgroundColor: '#7c3aed', color: 'white' }}
                className="cursor-pointer font-semibold"
                onClick={() => { setShowHwDetail(null); openEvaluate(item); }}
              >
                <ClipboardCheck className="w-4 h-4 mr-1.5" /> Evaluate
              </Button>
            )}
          </div>
        </div>

        {/* Detail body */}
        <div className="px-6 md:px-10 py-8 space-y-6">

          {/* ── Meta grid ── */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <BookOpen size={16} className="text-blue-600" />
              <h3 className="font-bold text-sm text-slate-700">Assignment Details</h3>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-5">
                <div>
                  <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Type</dt>
                  <dd>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${getTypeBadgeColor(item.assignmentType)}`}>
                      {typeLabel(item.assignmentType)}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Subject</dt>
                  <dd className="text-sm font-semibold text-slate-800">{item.subjectName || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Branch</dt>
                  <dd className="text-sm font-semibold text-slate-800">{item.branchName || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Academic Year</dt>
                  <dd className="text-sm font-semibold text-slate-800">{item.academicYearName || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Due Date</dt>
                  <dd className="text-sm font-semibold text-slate-800">{item.dueDate || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Max Marks</dt>
                  <dd className="text-sm font-semibold text-slate-800">{item.maxMarks ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Submissions</dt>
                  <dd className="text-sm font-semibold text-slate-800">{item.submittedCount} / {item.totalCount}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Status</dt>
                  <dd>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getStatusBadgeColor(item.status)}`}>
                      {item.status}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* ── Target Batches ── */}
          {item.batchNames.length > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <Layers size={16} className="text-blue-600" />
                <h3 className="font-bold text-sm text-slate-700">Target Batches</h3>
                <span className="ml-1 text-xs text-slate-400">({item.batchNames.length})</span>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-2.5">
                  {item.batchNames.map((name, i) => (
                    <span key={i} className="inline-flex items-center bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold rounded-lg px-3 py-1.5">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Instructions ── */}
          {item.description && (
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <FileText size={16} className="text-blue-600" />
                <h3 className="font-bold text-sm text-slate-700">Instructions / Description</h3>
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{item.description}</p>
              </div>
            </div>
          )}

          {/* ── Attachments ── */}
          {item.files.length > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <Paperclip size={16} className="text-blue-600" />
                <h3 className="font-bold text-sm text-slate-700">Attachments</h3>
                <span className="ml-1 text-xs text-slate-400">({item.files.length} file{item.files.length !== 1 ? 's' : ''})</span>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {item.files.map((f, i) => (
                    <a
                      key={i}
                      href={f}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl px-4 py-3 text-sm transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <Paperclip size={15} />
                      </div>
                      <span className="truncate text-slate-700 group-hover:text-blue-700 font-medium">{f.split('/').pop()}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between py-2">
            <Button variant="secondary" className="cursor-pointer" onClick={() => setShowHwDetail(null)}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to List
            </Button>
            {item.status === 'Draft' && (
              <Button variant="primary" style={{ backgroundColor: '#2563eb', color: 'white' }} className="cursor-pointer font-semibold px-5" onClick={() => { openEditForm(item); setShowHwDetail(null); }}>
                <Edit3 className="w-4 h-4 mr-1.5" /> Edit Assignment
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Full page: Individual Student Evaluation ──────────────────────────────
  if (showEvaluate && selectedStudent) {
    const item = showEvaluate;
    const student = selectedStudent;
    const isGraded = student.submissionStatus === 'Graded';
    const isSaving = evalGradingId === student.studentId;

    return (
      <div className="-mx-4 md:-mx-8 -my-6 md:-my-8 min-h-screen bg-slate-50 animate-fade-in">
        {/* Top nav */}
        <div className="bg-white border-b border-slate-200 px-6 md:px-10 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedStudent(null)}
              className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-display font-bold text-slate-900">{student.studentName}</h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${student.submissionStatus === 'Graded'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : student.submissionStatus === 'Submitted'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                  {student.submissionStatus || 'Not Submitted'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {item.title} · <span className="font-semibold text-blue-700">{student.batchName}</span> · Roll No / ID: <span className="font-mono font-medium text-slate-700">{student.studentCode || '—'}</span> · Max Marks: {item.maxMarks ?? '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="secondary" className="cursor-pointer" onClick={() => setSelectedStudent(null)}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Roster
            </Button>
            <Button
              variant="primary"
              style={{ backgroundColor: '#7c3aed', color: 'white' }}
              className="cursor-pointer font-semibold shadow-sm px-5"
              onClick={() => handleEvalGrade(student)}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1.5" /> {isGraded ? 'Update Grade' : 'Save Grade'}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Full-page Body */}
        <div className="px-6 md:px-10 py-8 space-y-6">

          {/* Student & Submission Info Header Banner */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-lg flex-shrink-0">
                {student.studentName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{student.studentName}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {student.studentCode && (
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      ID: {student.studentCode}
                    </span>
                  )}
                  {student.batchName && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      {student.batchName}
                    </span>
                  )}
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${isGraded
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : student.submissionStatus === 'Submitted'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                    {student.submissionStatus || 'Not Submitted'}
                  </span>
                </div>
              </div>
            </div>

            {student.submittedAt && (
              <div className="text-right md:border-l md:border-slate-100 md:pl-6">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Submitted On</span>
                <span className="text-sm font-semibold text-slate-700">
                  {student.submittedAt.slice(0, 16).replace('T', ' ')}
                </span>
              </div>
            )}
          </div>

          {/* Submission Details Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <FileText size={16} className="text-purple-600" />
              <h3 className="font-bold text-sm text-slate-700">Student Submitted Content</h3>
            </div>
            <div className="p-6 space-y-5">
              {student.responseText ? (
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block mb-2">Student Response / Solution Notes:</span>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                    {student.responseText}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-400 italic">
                  No text response or notes were submitted by the student.
                </div>
              )}

              {student.files && student.files.length > 0 ? (
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block mb-2">
                    Submitted Files & Attachments ({student.files.length}):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {student.files.map((fileUrl, idx) => (
                      <a
                        key={idx}
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 p-3.5 bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded-xl text-xs text-purple-700 font-semibold group transition-all"
                      >
                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                          <Paperclip size={15} />
                        </div>
                        <span className="truncate flex-1">{fileUrl.split('/').pop()}</span>
                        <ExternalLink size={14} className="text-slate-400 group-hover:text-purple-600 flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-400 italic flex items-center gap-2">
                  <Paperclip size={14} /> No attachment files uploaded for this assignment.
                </div>
              )}
            </div>
          </div>

          {/* Grading & Feedback Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award size={16} className="text-purple-600" />
                <h3 className="font-bold text-sm text-slate-700">Evaluation & Grading</h3>
              </div>
              {item.maxMarks !== null && item.maxMarks !== undefined && (
                <span className="text-xs text-slate-500 font-medium">
                  Maximum Marks: <strong className="text-slate-800">{item.maxMarks}</strong>
                </span>
              )}
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                    Marks Obtained <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max={item.maxMarks ?? 100}
                    value={evalInputs[student.studentId]?.marks ?? ''}
                    onChange={e => setEvalInputs(prev => ({
                      ...prev,
                      [student.studentId]: {
                        marks: e.target.value,
                        feedback: prev[student.studentId]?.feedback ?? ''
                      }
                    }))}
                    placeholder={`0 - ${item.maxMarks ?? 100}`}
                    className="font-bold text-base"
                  />
                  {item.maxMarks !== null && item.maxMarks !== undefined && (
                    <p className="text-[11px] text-slate-400 mt-1">Out of {item.maxMarks} marks</p>
                  )}
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                    Teacher Remarks & Feedback
                  </label>
                  <textarea
                    rows={3}
                    value={evalInputs[student.studentId]?.feedback ?? ''}
                    onChange={e => setEvalInputs(prev => ({
                      ...prev,
                      [student.studentId]: {
                        marks: prev[student.studentId]?.marks ?? '',
                        feedback: e.target.value
                      }
                    }))}
                    placeholder="Enter detailed feedback or remarks for the student..."
                    className="w-full p-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-white"
                  />
                </div>
              </div>

              {/* Action row inside card */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <Button variant="secondary" className="cursor-pointer" onClick={() => setSelectedStudent(null)}>
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Roster
                </Button>
                <Button
                  variant="primary"
                  style={{ backgroundColor: '#7c3aed', color: 'white' }}
                  className="cursor-pointer font-semibold shadow-sm px-6"
                  onClick={() => handleEvalGrade(student)}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Saving Grade...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1.5" /> {isGraded ? 'Update Grade' : 'Save Grade'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ─── Full page: Evaluate Roster & Submissions ───────────────────────────────
  if (showEvaluate) {
    const item = showEvaluate;
    const totalStudents = rosterStudents.length;
    const submittedCount = rosterStudents.filter(s => s.submissionStatus === 'Submitted' || s.submissionStatus === 'Graded').length;
    const gradedCount = rosterStudents.filter(s => s.submissionStatus === 'Graded').length;
    const pendingCount = rosterStudents.filter(s => s.submissionStatus !== 'Graded').length;

    const uniqueBatches = Array.from(new Set(rosterStudents.map(s => s.batchName).filter(Boolean)));

    const filteredRoster = rosterStudents.filter(s => {
      if (evalBatchFilter !== 'All' && s.batchName !== evalBatchFilter) return false;
      if (evalStatusFilter === 'Graded' && s.submissionStatus !== 'Graded') return false;
      if (evalStatusFilter === 'Submitted' && s.submissionStatus !== 'Submitted') return false;
      if (evalStatusFilter === 'Not Submitted' && (s.submissionStatus === 'Submitted' || s.submissionStatus === 'Graded')) return false;
      if (evalSearch.trim()) {
        const q = evalSearch.toLowerCase();
        const matchName = s.studentName.toLowerCase().includes(q);
        const matchCode = s.studentCode.toLowerCase().includes(q);
        const matchBatch = s.batchName.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchBatch) return false;
      }
      return true;
    });

    return (
      <div className="-mx-4 md:-mx-8 -my-6 md:-my-8 min-h-screen bg-slate-50 animate-fade-in">
        {/* Top nav */}
        <div className="bg-white border-b border-slate-200 px-6 md:px-10 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowEvaluate(null)}
              className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-display font-bold text-slate-900">Evaluate: {item.title}</h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${getStatusBadgeColor(item.status)}`}>
                  {item.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {item.subjectName} · {item.batchNames.join(', ') || 'No batches'} · Due: {item.dueDate || '—'} · Max Marks: {item.maxMarks ?? '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={() => setIsEvalImportModalOpen(true)}
              className="flex items-center gap-1.5 font-bold cursor-pointer"
            >
              <Upload size={14} /> Bulk Import
            </Button>
            <Button
              variant="secondary"
              onClick={handleExportEvaluationCSV}
              className="flex items-center gap-1.5 font-bold cursor-pointer"
            >
              <Download size={14} /> Export CSV
            </Button>
            <Button variant="secondary" className="cursor-pointer" onClick={() => setShowEvaluate(null)}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to List
            </Button>
          </div>
        </div>

        {/* Evaluation Body */}
        <div className="px-6 md:px-10 py-8 space-y-6">

          {/* ── Summary Stats ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Users size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Enrolled</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalStudents}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Submitted</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{submittedCount}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                <Award size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Graded</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{gradedCount}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Evaluation</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{pendingCount}</p>
              </div>
            </div>
          </div>

          {/* ── Search & Filter toolbar ── */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={evalSearch}
                onChange={e => setEvalSearch(e.target.value)}
                placeholder="Search students by name, roll no or student code..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-slate-50/50"
              />
            </div>
            {uniqueBatches.length > 1 && (
              <div className="w-full sm:w-48">
                <Select
                  value={evalBatchFilter}
                  onChange={e => setEvalBatchFilter(e.target.value)}
                  options={[{ value: 'All', label: 'All Batches' }, ...uniqueBatches.map(b => ({ value: b, label: b }))]}
                />
              </div>
            )}
            <div className="w-full sm:w-48">
              <Select
                value={evalStatusFilter}
                onChange={e => setEvalStatusFilter(e.target.value)}
                options={[
                  { value: 'All', label: 'All Statuses' },
                  { value: 'Graded', label: 'Graded' },
                  { value: 'Submitted', label: 'Submitted (Needs Grading)' },
                  { value: 'Not Submitted', label: 'Not Submitted' }
                ]}
              />
            </div>
          </div>

          {/* ── Students Table (Matching Tenants Table Design) ── */}
          <Card>
            <CardHeader>
              <CardTitle>Enrolled Students Roster ({filteredRoster.length})</CardTitle>
            </CardHeader>
            {rosterLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-3" />
                <p className="text-sm font-medium">Loading enrolled students roster...</p>
              </div>
            ) : filteredRoster.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <Users className="mx-auto text-slate-300 mb-3" size={36} />
                <div className="font-semibold text-slate-700">No students match your filter.</div>
                <p className="text-xs text-slate-400 mt-1">Try resetting the search or status filter.</p>
              </div>
            ) : (
              <Table
                dense
                headers={[
                  'Student Name',
                  'Roll No / ID',
                  'Batch',
                  'Status',
                  'Submitted On',
                  'Marks',
                  'Action'
                ]}
                colWidths={['26%', '13%', '14%', '13%', '14%', '10%', '10%']}
              >
                {filteredRoster.slice((evalCurrentPage - 1) * evalItemsPerPage, evalCurrentPage * evalItemsPerPage).map(student => {
                  const isGraded = student.submissionStatus === 'Graded';
                  const isSubmitted = student.submissionStatus === 'Submitted';

                  return (
                    <tr key={student.studentId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-3 font-semibold text-slate-900 text-sm">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {student.studentName.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="truncate">{student.studentName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {student.studentCode ? (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {student.studentCode}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded text-xs font-medium">
                          {student.batchName || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${isGraded
                          ? 'bg-emerald-50 text-emerald-600'
                          : isSubmitted
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-slate-100 text-slate-600'
                          }`}>
                          {isGraded && <CheckCircle2 size={11} />}
                          {student.submissionStatus || 'Not Submitted'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {student.submittedAt ? student.submittedAt.slice(0, 16).replace('T', ' ') : '—'}
                      </td>
                      <td className="px-3 py-3 text-sm whitespace-nowrap">
                        {student.marksObtained !== null && student.marksObtained !== undefined ? (
                          <span className="font-bold text-slate-900">
                            {student.marksObtained} <span className="text-xs text-slate-400 font-normal">/ {item.maxMarks ?? '—'}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Pending</span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedStudent(student)}
                          className="cursor-pointer hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 font-semibold text-xs py-1 px-3 inline-flex items-center"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1 text-purple-600" /> View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </Table>
            )}

            {filteredRoster.length > 0 && (
              <Pagination
                currentPage={evalCurrentPage}
                totalPages={Math.max(1, Math.ceil(filteredRoster.length / evalItemsPerPage))}
                totalItems={filteredRoster.length}
                pageSize={evalItemsPerPage}
                onPageChange={setEvalCurrentPage}
              />
            )}
          </Card>

          {/* Footer */}
          <div className="flex items-center justify-between py-2">
            <Button variant="secondary" className="cursor-pointer" onClick={() => setShowEvaluate(null)}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to List
            </Button>
          </div>

        </div>

        {/* ── Bulk Import Modal for Grades ── */}
        <BulkImportModal
          isOpen={isEvalImportModalOpen}
          onClose={() => setIsEvalImportModalOpen(false)}
          title={`Bulk Import Grades: ${item.title}`}
          description={`Upload a CSV file containing Student Roll No / ID, Marks Obtained (Max: ${item.maxMarks ?? '—'}), and optional Teacher Remarks.`}
          sampleHeaders={['Roll No / ID', 'Marks Obtained', 'Remarks']}
          sampleRows={[
            ['STU-2-1-915212', String(item.maxMarks ? Math.min(22, item.maxMarks) : 22), 'Well explained solution steps'],
            ['STU-2-1-890201', String(item.maxMarks ? Math.min(20, item.maxMarks) : 20), 'Good attempt, review question 3']
          ]}
          onImport={async (importedData) => {
            if (!importedData || importedData.length === 0) return;
            try {
              const result = await assignmentApi.bulkGradeHomework(item.id, importedData);
              if (result.successCount > 0) {
                addToast(`Successfully assigned marks to ${result.successCount} student(s)!`, 'success');
                // Reload evaluation roster
                const data = await assignmentApi.getEvaluationRoster(item.id);
                setRosterStudents(data.students);
                const initial: Record<string, { marks: string; feedback: string }> = {};
                data.students.forEach(s => {
                  initial[s.studentId] = {
                    marks: s.marksObtained !== null && s.marksObtained !== undefined ? String(s.marksObtained) : '',
                    feedback: s.feedback || ''
                  };
                });
                setEvalInputs(initial);
                await loadHomeworks();
              }
              if (result.errorCount > 0) {
                addToast(`${result.errorCount} row(s) had errors: ${result.errors.slice(0, 3).join(' | ')}`, 'warning');
              }
            } catch (err: any) {
              addToast(err.message || 'Failed to process bulk grading', 'error');
            }
          }}
        />

      </div>
    );
  }

  // ─── Full page: Homework create / edit ──────────────────────────────────────
  if (showHwForm) {
    const isEdit = Boolean(hwForm.id);
    return (
      <div className="-mx-4 md:-mx-8 -my-6 md:-my-8 min-h-screen bg-slate-50 animate-fade-in">
        {/* Top nav */}
        <div className="bg-white border-b border-slate-200 px-6 md:px-10 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowHwForm(false)}
              className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-display font-bold text-slate-900">
                  {isEdit ? `Edit Assignment: ${hwForm.title || 'Untitled'}` : 'Create New Assignment'}
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {isEdit ? 'Editing' : 'New'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEdit ? 'Update assignment details, batches, and due date.' : 'Configure homework or practice tasks for your allocated batches.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Button type="button" variant="secondary" onClick={() => setShowHwForm(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => submitHomeworkForm('draft')}
              disabled={actionBusy}
            >
              {actionBusy && !isEdit ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Check className="w-4 h-4 mr-1.5" />}
              Save Draft
            </Button>
            <Button
              type="button"
              variant="primary"
              style={{ backgroundColor: '#2563eb', color: 'white' }}
              className="cursor-pointer font-semibold shadow-sm px-5"
              onClick={() => submitHomeworkForm('publish')}
              disabled={actionBusy}
            >
              {actionBusy && isEdit ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />}
              {isEdit ? 'Save & Update' : 'Publish Assignment'}
            </Button>
          </div>
        </div>

        {/* Form body */}
        <div className="px-6 md:px-10 py-8 space-y-6">

          {/* ── Section 1: Basic Information ── */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <BookOpen size={16} className="text-blue-600" />
              <h3 className="font-bold text-sm text-slate-700">Basic Information</h3>
              <p className="text-xs text-slate-400 ml-2">— Title, type, subject, branch & academic year</p>
            </div>
            <div className="p-6 space-y-5">
              {/* Full-width title */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                  Assignment Title <span className="text-red-500">*</span>
                </label>
                <Input
                  value={hwForm.title}
                  onChange={e => setHwForm({ ...hwForm, title: e.target.value })}
                  placeholder="e.g. Definite Integration Problem Set #3"
                  className="w-full text-base font-medium"
                />
              </div>

              {/* Row: Type + Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Assignment Type</label>
                  <select
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    value={hwForm.assignmentType}
                    onChange={e => setHwForm({ ...hwForm, assignmentType: e.target.value })}
                  >
                    {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    value={hwForm.subjectId}
                    onChange={e => setHwForm({ ...hwForm, subjectId: Number(e.target.value) })}
                  >
                    <option value={0}>Select a subject...</option>
                    {subjectOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Row: Branch + Academic Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                    Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    value={hwForm.branchId}
                    onChange={e => changeBranch(Number(e.target.value))}
                  >
                    {(!scoping?.branches || scoping.branches.length === 0) && (
                      <option value={0}>No branches assigned</option>
                    )}
                    {(scoping?.branches || []).map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Academic Year</label>
                  <select
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    value={hwForm.academicYearId}
                    onChange={e => changeAcademicYear(Number(e.target.value))}
                  >
                    <option value={0}>Select academic year...</option>
                    {(scoping?.academicYears || []).map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 2: Target Batch Allocation ── */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-blue-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Target Batch Allocation</h3>
                  <p className="text-xs text-slate-500">Select from your allocated batches</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {assignedTeacherBatches.length > 1 && (
                  <button
                    type="button"
                    onClick={selectAllAssignedBatches}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    Select All ({assignedTeacherBatches.length})
                  </button>
                )}
                {hwForm.batchIds.length > 0 && (
                  <button
                    type="button"
                    onClick={deselectAllBatches}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    Deselect All
                  </button>
                )}
              </div>
            </div>
            <div className="p-6 space-y-4">
              {assignedTeacherBatches.length === 0 ? (
                <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                  <p className="text-sm font-medium text-slate-600">No allocated batches found for your profile in this branch.</p>
                  <p className="text-xs text-slate-400 mt-1">Please ensure you are allocated to batches in this branch.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {assignedTeacherBatches.map(b => {
                    const isSelected = hwForm.batchIds.includes(Number(b.id));
                    return (
                      <div
                        key={b.id}
                        onClick={() => toggleTargetBatch(Number(b.id))}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                          isSelected
                            ? 'bg-blue-50/70 border-blue-500 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-0.5 h-4 w-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 pointer-events-none"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-sm text-slate-900 truncate" title={b.name}>
                              {b.name}
                            </span>
                            {b.code && (
                              <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                                {b.code}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500 flex-wrap">
                            {(b as any).levelName && (
                              <span className="font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                {(b as any).levelName}
                              </span>
                            )}
                            {(b as any).academicYearName && (
                              <span className="font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                {(b as any).academicYearName}
                              </span>
                            )}
                            {(b as any).branchName && (
                              <span className="truncate text-slate-400">
                                {(b as any).branchName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Selected batches summary */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">
                  Allocated Batches: <span className="text-blue-600 font-extrabold">{hwForm.batchIds.length}</span> selected
                </span>
                {hwForm.batchIds.length === 0 && (
                  <span className="text-rose-600 font-semibold">At least one target batch is required *</span>
                )}
              </div>
            </div>
          </div>

          {/* ── Section 3: Submission Schedule & Scoring ── */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Calendar size={16} className="text-blue-600" />
              <h3 className="font-bold text-sm text-slate-700">Submission Schedule & Scoring</h3>
              <p className="text-xs text-slate-400 ml-2">— Deadline date and maximum marks</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                    Submission Due Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={hwForm.dueDate}
                    onChange={e => setHwForm({ ...hwForm, dueDate: e.target.value })}
                    className="w-full"
                  />
                  <span className="text-[11px] text-slate-400 block mt-1">Students must submit before end of this date.</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Max Marks / Score</label>
                  <Input
                    type="number"
                    value={hwForm.maxMarks}
                    onChange={e => setHwForm({ ...hwForm, maxMarks: e.target.value })}
                    placeholder="e.g. 50"
                    className="w-full"
                  />
                  <span className="text-[11px] text-slate-400 block mt-1">Leave blank if this assignment is not graded.</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 4: Instructions & Attachments ── */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <FileText size={16} className="text-blue-600" />
              <h3 className="font-bold text-sm text-slate-700">Instructions & Attachments</h3>
              <p className="text-xs text-slate-400 ml-2">— Task description and reference materials</p>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Instructions / Task Description</label>
                <textarea
                  rows={5}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all leading-relaxed"
                  value={hwForm.description}
                  onChange={e => setHwForm({ ...hwForm, description: e.target.value })}
                  placeholder="Enter assignment requirements, question numbers, textbook chapters, or submission guidelines..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Attachment Files</label>
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 rounded-xl py-8 px-4 text-sm text-slate-500 transition-all cursor-pointer bg-slate-50/50">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Upload size={20} />
                  </div>
                  <div className="text-center">
                    <span className="font-semibold text-blue-600">Click to upload files</span> or drag and drop
                    <p className="text-xs text-slate-400 mt-0.5">PDF, doc, xls, images, zip — up to 20 MB each</p>
                  </div>
                  <input type="file" multiple className="hidden" onChange={e => setNewFiles(Array.from(e.target.files || []))} />
                </label>

                {(hwForm.existingFiles.length > 0 || newFiles.length > 0) && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {hwForm.existingFiles.map((f, i) => (
                      <div key={`e-${i}`} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm">
                        <span className="flex items-center gap-2.5 text-slate-700 truncate font-medium">
                          <Paperclip size={15} className="text-slate-400 flex-shrink-0" />
                          <span className="truncate">{f.split('/').pop()}</span>
                        </span>
                        <button type="button" className="text-slate-400 hover:text-red-500 p-1 cursor-pointer" onClick={() => setHwForm(prev => ({ ...prev, existingFiles: prev.existingFiles.filter((_, idx) => idx !== i) }))}>
                          <XCircle size={17} />
                        </button>
                      </div>
                    ))}
                    {newFiles.map((f, i) => (
                      <div key={`n-${i}`} className="flex items-center justify-between bg-blue-50/60 border border-blue-200 rounded-xl px-3.5 py-2.5 text-sm">
                        <span className="flex items-center gap-2.5 text-blue-800 truncate font-medium">
                          <Paperclip size={15} className="text-blue-500 flex-shrink-0" />
                          <span className="truncate">{f.name}</span>
                          <span className="text-[11px] text-blue-500/80 font-normal">({(f.size / 1024).toFixed(1)} KB)</span>
                        </span>
                        <button type="button" className="text-blue-400 hover:text-red-500 p-1 cursor-pointer" onClick={() => setNewFiles(prev => prev.filter((_, idx) => idx !== i))}>
                          <XCircle size={17} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between py-2">
            <Button type="button" variant="secondary" onClick={() => setShowHwForm(false)} className="cursor-pointer">
              Cancel
            </Button>
            <div className="flex items-center gap-2.5">
              <Button type="button" variant="outline" className="cursor-pointer" onClick={() => submitHomeworkForm('draft')} disabled={actionBusy}>
                {actionBusy && !isEdit ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Check className="w-4 h-4 mr-1.5" />}
                Save Draft
              </Button>
              <Button
                type="button"
                variant="primary"
                style={{ backgroundColor: '#2563eb', color: 'white' }}
                className="cursor-pointer font-semibold shadow-sm px-6"
                onClick={() => submitHomeworkForm('publish')}
                disabled={actionBusy}
              >
                {actionBusy && isEdit ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />}
                {isEdit ? 'Save & Update Assignment' : 'Publish Assignment'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Full page: Exam create / edit (mock) ───────────────────────────────────
  if (showExamForm) {
    return (
      <div className="-mx-4 md:-mx-8 -my-6 md:-my-8 min-h-screen bg-slate-50 animate-fade-in">
        {/* Top nav bar */}
        <div className="bg-white border-b border-slate-200 px-6 md:px-10 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowExamForm(false)}
              className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
              title="Go back"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-display font-bold text-slate-900">
                  {examForm.id ? `Edit Test: ${examForm.name || 'Untitled'}` : 'Schedule Examination / Test'}
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                  {examForm.id ? 'Editing' : 'New Test'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {examForm.id ? 'Update examination details and evaluation parameters.' : 'Configure unit tests, mock exams, or chapter evaluations.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Button type="button" variant="secondary" onClick={() => setShowExamForm(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="button" variant="outline" onClick={handleSaveExamDraft} className="cursor-pointer">
              <Check className="w-4 h-4 mr-1.5" /> Save Draft
            </Button>
            <Button
              type="button"
              variant="primary"
              style={{ backgroundColor: '#2563eb', color: 'white' }}
              className="cursor-pointer font-semibold shadow-sm px-5"
              onClick={handleScheduleExam}
            >
              <Send className="w-4 h-4 mr-1.5" />
              {examForm.id ? 'Save & Update Exam' : 'Schedule Exam'}
            </Button>
          </div>
        </div>

        {/* Form body */}
        <div className="px-6 md:px-10 py-8 space-y-6">

          {/* Section 1: Basic Information */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <ClipboardList size={16} className="text-blue-600" />
              <h3 className="font-bold text-sm text-slate-700">Basic Information</h3>
              <p className="text-xs text-slate-400 ml-2">— Test name, type, subject, and target class</p>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                  Test Title <span className="text-red-500">*</span>
                </label>
                <Input
                  value={examForm.name || ''}
                  onChange={e => setExamForm({ ...examForm, name: e.target.value })}
                  placeholder="e.g. Unit Test 2 — Periodic Table & Chemical Bonding"
                  className="w-full text-base font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Test Type</label>
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
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Subject</label>
                  <Input
                    value={examForm.subject || ''}
                    onChange={e => setExamForm({ ...examForm, subject: e.target.value })}
                    placeholder="e.g. Chemistry"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                    Target Batch <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    value={examForm.batch || ''}
                    onChange={e => setExamForm({ ...examForm, batch: e.target.value })}
                  >
                    <option value="">Select a batch...</option>
                    {(scoping?.batches || []).map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Exam Schedule & Evaluation */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Award size={16} className="text-blue-600" />
              <h3 className="font-bold text-sm text-slate-700">Schedule & Evaluation</h3>
              <p className="text-xs text-slate-400 ml-2">— Exam date, total marks, and passing threshold</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                    Exam Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={examForm.examDate === 'Not Set' ? '' : (examForm.examDate || '')}
                    onChange={e => setExamForm({ ...examForm, examDate: e.target.value })}
                    className="w-full"
                  />
                  <span className="text-[11px] text-slate-400 block mt-1">The date students will sit the exam.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Total Marks</label>
                  <Input
                    type="number"
                    value={examForm.totalMarks || 100}
                    onChange={e => setExamForm({ ...examForm, totalMarks: parseInt(e.target.value) || 0 })}
                    className="w-full"
                  />
                  <span className="text-[11px] text-slate-400 block mt-1">Full marks achievable in this test.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Passing Threshold</label>
                  <Input
                    type="number"
                    value={examForm.passingMarks || 40}
                    onChange={e => setExamForm({ ...examForm, passingMarks: parseInt(e.target.value) || 0 })}
                    className="w-full"
                  />
                  <span className="text-[11px] text-slate-400 block mt-1">Minimum marks required to pass.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer action bar */}
          <div className="flex items-center justify-between py-2">
            <Button type="button" variant="secondary" onClick={() => setShowExamForm(false)} className="cursor-pointer">
              Cancel
            </Button>
            <div className="flex items-center gap-2.5">
              <Button type="button" variant="outline" onClick={handleSaveExamDraft} className="cursor-pointer">
                <Check className="w-4 h-4 mr-1.5" /> Save Draft
              </Button>
              <Button
                type="button"
                variant="primary"
                style={{ backgroundColor: '#2563eb', color: 'white' }}
                className="cursor-pointer font-semibold shadow-sm px-6"
                onClick={handleScheduleExam}
              >
                <Send className="w-4 h-4 mr-1.5" />
                {examForm.id ? 'Save & Update Exam' : 'Schedule Exam'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main list view ──────────────────────────────────────────────────────
  const handleResetFilters = () => {
    setFilterType('All');
    setFilterBranch(isBranchAdmin ? activeBranchName : 'All');
    setFilterBatch('All');
    setFilterSubject('All');
    setFilterStatus('All');
    setSearchQuery('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Homeworks and Exams</h2>
          <p className="text-sm text-slate-500 mt-1">Manage homework, assignments, practice sets, and classroom evaluations</p>
        </div>
        {activePrimaryTab === 'homework' && (
          <Button className="bg-blue-600 text-white cursor-pointer" onClick={() => openCreateForm('homework')}>
            <Plus className="w-4 h-4 mr-2" /> Create Homework
          </Button>
        )}
        {activePrimaryTab === 'assignment' && (
          <Button className="bg-blue-600 text-white cursor-pointer" onClick={() => openCreateForm('assignment')}>
            <Plus className="w-4 h-4 mr-2" /> Create Assignment
          </Button>
        )}
        {activePrimaryTab === 'exams' && (
          <Button className="bg-blue-600 text-white cursor-pointer" onClick={() => { setExamForm({}); setShowExamForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Schedule Test
          </Button>
        )}
      </div>

      {/* Primary Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => { setActivePrimaryTab('homework'); setActiveSubTab('active'); }}
          className={`flex-none px-6 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${activePrimaryTab === 'homework'
            ? 'border-blue-600 text-blue-700'
            : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
        >
          <BookOpen size={16} />
          Homeworks
        </button>
        <button
          onClick={() => { setActivePrimaryTab('assignment'); setActiveSubTab('active'); }}
          className={`flex-none px-6 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${activePrimaryTab === 'assignment'
            ? 'border-blue-600 text-blue-700'
            : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
        >
          <FileText size={16} />
          Assignments
        </button>
        <button
          onClick={() => { setActivePrimaryTab('exams'); setActiveSubTab('active'); }}
          className={`flex-none px-6 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${activePrimaryTab === 'exams'
            ? 'border-blue-600 text-blue-700'
            : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
        >
          <ClipboardList size={16} />
          Exams
        </button>
        <button
          onClick={() => setActiveSubTab('drafts')}
          className={`ml-auto flex-none px-6 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${activeSubTab === 'drafts'
            ? 'border-blue-600 text-blue-700'
            : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
        >
          Drafts ({
            activePrimaryTab === 'homework'
              ? homeworks.filter(a => a.status === 'Draft' && (a.assignmentType || '').toLowerCase() === 'homework').length
              : activePrimaryTab === 'assignment'
              ? homeworks.filter(a => a.status === 'Draft' && (a.assignmentType || '').toLowerCase() === 'assignment').length
              : homeworks.filter(a => a.status === 'Draft' && (a.assignmentType || '').toLowerCase() === 'exam').length
          })
        </button>
      </div>

      {/* Scope & Filters */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Scope &amp; Filters</div>
          <Button variant="secondary" size="sm" onClick={handleResetFilters}>Reset Filters</Button>
        </div>
        <Input
          label="Search"
          placeholder={
            activePrimaryTab === 'homework'
              ? 'Search homework by title...'
              : activePrimaryTab === 'assignment'
              ? 'Search assignments by title...'
              : 'Search exams by title...'
          }
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {!isBranchAdmin ? (
            <Select
              label="Branch"
              value={filterBranch}
              onChange={e => setFilterBranch(e.target.value)}
              options={[{ value: 'All', label: 'All Branches' }, ...(scoping?.branches || []).map(b => ({ value: b.name, label: b.name }))]}
            />
          ) : (
            <Select
              label="Branch"
              value={activeBranchName}
              disabled={true}
              options={[{ value: activeBranchName, label: activeBranchName }]}
            />
          )}
          <Select
            label="Batch"
            value={filterBatch}
            onChange={e => setFilterBatch(e.target.value)}
            options={[{ value: 'All', label: 'All Batches' }, ...(scoping?.batches || []).map(b => ({ value: b.name, label: b.name }))]}
          />
          <Select
            label="Subject"
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
            options={[{ value: 'All', label: 'All Subjects' }, ...(scoping?.subjects || []).map(s => ({ value: s.name, label: s.name }))]}
          />
          <Select
            label="Status"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            options={[{ value: 'All', label: 'All Statuses' }, ...(activeSubTab === 'drafts' ? (
              [{ value: 'Draft', label: 'Draft' }]
            ) : (
              [{ value: 'Published', label: 'Published' }, { value: 'Closed', label: 'Closed' }]
            ))]}
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
            <p className="text-sm">Loading data...</p>
          </div>
        ) : (
          <Table
            dense
            borderless
            minWidth="1020px"
            colWidths={
              activeSubTab === 'active'
                ? ['26%', '14%', '15%', '12%', '11%', '10%', '12%']
                : ['30%', '16%', '18%', '14%', '10%', '12%']
            }
            headers={[
              { label: activePrimaryTab === 'homework' ? 'Homework' : activePrimaryTab === 'assignment' ? 'Assignment' : 'Exam', align: 'left' },
              { label: 'Subject', align: 'left' },
              { label: 'Target Batch', align: 'left' },
              { label: activePrimaryTab === 'exams' ? 'Exam Date' : 'Due Date', align: 'left' },
              ...(activeSubTab === 'active' ? [{ label: 'Submissions', align: 'center' as const }] : []),
              { label: 'Status', align: 'center' as const },
              { label: 'Actions', align: 'right' as const }
            ]}
          >
            {(paginatedData as HomeworkItem[]).length === 0 ? (
              <tr>
                <td colSpan={activeSubTab === 'active' ? 8 : 7} className="px-6 py-12 text-center text-slate-500">
                  <FileText className="mx-auto text-slate-300 mb-3" size={32} />
                  <div className="font-medium">
                    No {activeSubTab === 'active'
                      ? (activePrimaryTab === 'homework' ? 'active homework' : activePrimaryTab === 'assignment' ? 'active assignments' : 'active exams')
                      : (activePrimaryTab === 'homework' ? 'homework drafts' : activePrimaryTab === 'assignment' ? 'assignment drafts' : 'exam drafts')
                    } found.
                  </div>
                </td>
              </tr>
            ) : (
              (paginatedData as HomeworkItem[]).map((assign) => (
                <tr key={assign.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 text-left">
                    <div className="font-semibold text-slate-900 text-sm truncate max-w-[240px]" title={assign.title}>
                      {assign.title}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase tracking-wider ${getTypeBadgeColor(assign.assignmentType)}`}>
                        {typeLabel(assign.assignmentType)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-left text-slate-700 font-medium text-xs truncate max-w-[140px]" title={assign.subjectName}>
                    {assign.subjectName}
                  </td>
                  <td className="px-4 py-3 text-left text-slate-600 text-xs truncate max-w-[160px]" title={assign.batchNames.join(', ')}>
                    {assign.batchNames.join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-left font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">
                    {assign.dueDate}
                  </td>
                  {activeSubTab === 'active' && (
                    <td className="px-4 py-3 text-center text-slate-600 whitespace-nowrap">
                      {assign.status === 'Draft' ? '—' : (
                        <span className={`font-bold font-mono text-xs ${assign.submittedCount > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {assign.submittedCount}
                        </span>
                      )} / {assign.totalCount > 0 ? assign.totalCount : '—'}
                    </td>
                  )}
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(assign.status)}`}>
                      {assign.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openDetail(assign)}
                        title="View Details"
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 hover:border-indigo-200 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {(assign.status === 'Published' || assign.status === 'Closed') && (
                        <button
                          type="button"
                          onClick={() => openEvaluate(assign)}
                          title="Evaluate Submissions"
                          className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg border border-slate-200 hover:border-purple-200 transition-colors cursor-pointer"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditForm(assign)}
                        title={activePrimaryTab === 'exams' ? 'Edit Exam' : activePrimaryTab === 'homework' ? 'Edit Homework' : 'Edit Assignment'}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 hover:border-blue-200 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {assign.status === 'Published' && (
                        <button
                          type="button"
                          onClick={() => handleCloseAssign(assign)}
                          title="Close"
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg border border-slate-200 hover:border-amber-200 transition-colors cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {assign.status !== 'Published' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAssign(assign)}
                          title="Delete"
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </Table>
        )}

        {currentData.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={currentData.length}
            pageSize={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Exam Details Modal */}
      {showExamDetails && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowExamDetails(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">{showExamDetails.name}</h3>
              <button onClick={() => setShowExamDetails(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <XCircle size={22} />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="font-medium">{showExamDetails.type}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Subject</span><span className="font-medium">{showExamDetails.subject}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Target Batch</span><span className="font-medium">{showExamDetails.batch}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Exam Date</span><span className="font-medium">{showExamDetails.examDate} {showExamDetails.startTime || ''}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Marks</span><span className="font-medium">{showExamDetails.totalMarks} (Pass: {showExamDetails.passingMarks})</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status</span><span className="font-medium">{showExamDetails.status}</span></div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              {showExamDetails.status === 'Scheduled' && (
                <Button variant="secondary" className="cursor-pointer" onClick={() => handleCancelExam(showExamDetails.id)}>
                  Cancel Exam
                </Button>
              )}
              <Button
                className="bg-blue-600 text-white cursor-pointer"
                onClick={() => { setExamForm({ ...showExamDetails }); setShowExamDetails(null); setShowExamForm(true); }}
              >
                Edit Exam
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};