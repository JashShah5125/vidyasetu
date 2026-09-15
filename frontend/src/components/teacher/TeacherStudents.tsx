import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Pagination } from '../ui/Pagination';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import {
  Loader2, Users, Phone, Mail, BookOpen, Layers, CheckCircle2,
  XCircle, Clock, ChevronLeft, Calendar, MapPin, User, ShieldCheck,
  AlertCircle, GraduationCap, FileText, ArrowLeft, Building, School,
  FileCheck, ClipboardList, Award, Download, ExternalLink, Eye, X,
  FileQuestion, AlertTriangle, SlidersHorizontal, ChevronDown, Check,
  RotateCcw
} from 'lucide-react';
import {
  teacherStudentApi,
  type TeacherStudentRosterItem,
  type TeacherStudentDetail,
  type StudentAssignmentItem,
  type StudentAssignmentSubmission
} from '../../services/teacherStudentApi';
import type { TeacherScheduleOptions } from '../../services/teacherScheduleApi';

const itemsPerPage = 10;

interface ColumnItem {
  key: string;
  label: string;
  visible: boolean;
  canToggle: boolean;
}

const DEFAULT_COLUMNS: ColumnItem[] = [
  { key: 'code', label: 'Student Code', visible: true, canToggle: false },
  { key: 'name', label: 'Student Name', visible: true, canToggle: false },
  { key: 'batch', label: 'Assigned Batch', visible: true, canToggle: true },
  { key: 'course', label: 'Course & Program', visible: true, canToggle: true },
  { key: 'level', label: 'Level', visible: true, canToggle: true },
  { key: 'guardian', label: 'Guardian Info', visible: true, canToggle: true },
  { key: 'attendance', label: 'Attendance', visible: true, canToggle: true },
  { key: 'status', label: 'Status', visible: true, canToggle: true },
  { key: 'action', label: 'Action', visible: true, canToggle: false },
];

const statusPill = (status: number | string) => {
  if (Number(status) === 1 || status === 'active') {
    return {
      label: 'Active',
      cls: 'inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200'
    };
  }
  if (Number(status) === 2 || status === 'deleted') {
    return {
      label: 'Deleted',
      cls: 'inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200'
    };
  }
  return {
    label: 'Inactive',
    cls: 'inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200'
  };
};

const assignmentTypeBadge = (type: string) => {
  const t = (type || '').toLowerCase();
  if (t === 'exam') {
    return {
      label: 'Exam',
      cls: 'bg-purple-50 text-purple-700 border-purple-200'
    };
  }
  if (t === 'homework') {
    return {
      label: 'Homework',
      cls: 'bg-amber-50 text-amber-700 border-amber-200'
    };
  }
  return {
    label: 'Assignment',
    cls: 'bg-blue-50 text-blue-700 border-blue-200'
  };
};

const initials = (name: string) =>
  name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const formatTime = (timeStr?: string | null): string => {
  if (!timeStr) return '--:--';
  const clean = timeStr.slice(0, 5);
  const [h, m] = clean.split(':').map(Number);
  if (isNaN(h)) return clean;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};

export const TeacherStudents: React.FC = () => {
  const { addToast } = useApp();

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<TeacherStudentRosterItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterBatch, setFilterBatch] = useState<string | number>('All');

  // Column Visibility Customization State
  const [columns, setColumns] = useState<ColumnItem[]>(DEFAULT_COLUMNS);
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  const [academicOptions, setAcademicOptions] = useState<TeacherScheduleOptions | null>(null);

  // Full Page Profile Navigation State
  const [selectedStudent, setSelectedStudent] = useState<TeacherStudentRosterItem | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<TeacherStudentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [profileTab, setProfileTab] = useState<'overview' | 'attendance' | 'assignments'>('overview');

  // Tab 3: Assignments & Exams State
  const [assignments, setAssignments] = useState<StudentAssignmentItem[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentFilterType, setAssignmentFilterType] = useState<string>('All');
  const [assignmentFilterStatus, setAssignmentFilterStatus] = useState<string>('All');

  // Full Page View 3: Single Submission Inspection State
  const [selectedSubmissionItem, setSelectedSubmissionItem] = useState<StudentAssignmentItem | null>(null);

  // Column visibility lookup map
  const visibleCols = useMemo(() => {
    const map: Record<string, boolean> = {};
    columns.forEach(c => {
      map[c.key] = c.visible;
    });
    return map;
  }, [columns]);

  const visibleCount = useMemo(() => columns.filter(c => c.visible).length, [columns]);

  const toggleColumn = (key: string) => {
    setColumns(prev =>
      prev.map(c => {
        if (c.key === key && c.canToggle) {
          return { ...c, visible: !c.visible };
        }
        return c;
      })
    );
  };

  const resetColumns = () => {
    setColumns(DEFAULT_COLUMNS);
  };

  // Load teacher-scoped filter options (strictly assigned batches only)
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const opts = await teacherStudentApi.getOptions();
        setAcademicOptions(opts);
      } catch (err: any) {
        console.error('Failed to load teacher student options:', err);
        addToast(err?.response?.data?.message || 'Failed to load filter options', 'error');
      }
    };
    fetchOptions();
  }, [addToast]);

  // Fetch teacher-scoped roster
  const fetchRoster = useCallback(async () => {
    try {
      setLoading(true);
      const res = await teacherStudentApi.getStudents({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        batchId: filterBatch,
        status: '1'
      });
      setStudents(res.data || []);
      setTotalItems(res.pagination?.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch teacher students:', err);
      addToast(err?.response?.data?.message || 'Failed to load your students from server', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterBatch, addToast]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  // Fetch detailed profile when a student is selected
  useEffect(() => {
    if (!selectedStudent) {
      setSelectedDetail(null);
      setAssignments([]);
      setSelectedSubmissionItem(null);
      return;
    }
    const fetchDetail = async () => {
      try {
        setLoadingDetail(true);
        const detail = await teacherStudentApi.getStudentById(selectedStudent.id);
        setSelectedDetail(detail);
      } catch (err: any) {
        console.error('Failed to fetch student profile:', err);
        addToast(err?.response?.data?.message || 'Failed to fetch student profile details', 'error');
        setSelectedStudent(null);
      } finally {
        setLoadingDetail(false);
      }
    };

    const fetchAssignments = async () => {
      try {
        setLoadingAssignments(true);
        const list = await teacherStudentApi.getStudentAssignments(selectedStudent.id);
        setAssignments(list || []);
      } catch (err: any) {
        console.error('Failed to fetch student assignments:', err);
      } finally {
        setLoadingAssignments(false);
      }
    };

    fetchDetail();
    fetchAssignments();
  }, [selectedStudent, addToast]);

  // Resolve Course / Program / Level from the student's enrolled batch
  const hierarchyResolver = useMemo(() => {
    const levelById = new Map((academicOptions?.levels || []).map(l => [Number(l.id), l]));
    const programById = new Map((academicOptions?.programs || []).map(p => [Number(p.id), p]));
    const courseById = new Map((academicOptions?.courses || []).map(c => [Number(c.id), c]));

    return (batchId?: number | null) => {
      if (!batchId) return { course: '—', program: '—', level: '—' };
      const batch = (academicOptions?.batches || []).find(b => Number(b.id) === Number(batchId));
      if (!batch) return { course: '—', program: '—', level: '—' };
      const level = levelById.get(Number(batch.level_id || (batch as any).levelId));
      const program = level ? programById.get(Number(level.program_id || (level as any).programId)) : undefined;
      const course = program ? courseById.get(Number(program.course_id || (program as any).courseId)) : undefined;
      return {
        course: course?.name || '—',
        program: program?.name || '—',
        level: level?.name || '—'
      };
    };
  }, [academicOptions]);

  const batchSelectOptions = useMemo(
    () => [
      { value: 'All', label: 'All Assigned Batches' },
      ...(academicOptions?.batches || []).map(b => ({ value: b.id.toString(), label: `${b.name}${b.code ? ` (${b.code})` : ''}` }))
    ],
    [academicOptions]
  );

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const handleBackToRoster = () => {
    setSelectedStudent(null);
    setSelectedDetail(null);
    setAssignments([]);
    setSelectedSubmissionItem(null);
    setProfileTab('overview');
  };

  // Filtered assignments for Tab 3
  const filteredAssignments = useMemo(() => {
    return assignments.filter(item => {
      if (assignmentFilterType !== 'All') {
        if ((item.assignmentType || '').toLowerCase() !== assignmentFilterType.toLowerCase()) {
          return false;
        }
      }
      if (assignmentFilterStatus !== 'All') {
        const sub = item.submission;
        if (assignmentFilterStatus === 'Graded') {
          if (!sub || sub.status !== 'Graded') return false;
        } else if (assignmentFilterStatus === 'Submitted') {
          if (!sub) return false;
        } else if (assignmentFilterStatus === 'Pending') {
          if (sub) return false;
        }
      }
      if (assignmentSearch.trim()) {
        const q = assignmentSearch.toLowerCase();
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchSubject = (item.subjectName || '').toLowerCase().includes(q);
        const matchBatch = (item.batchName || '').toLowerCase().includes(q);
        if (!matchTitle && !matchSubject && !matchBatch) return false;
      }
      return true;
    });
  }, [assignments, assignmentFilterType, assignmentFilterStatus, assignmentSearch]);

  // Tab 3 KPI computations
  const assignmentStats = useMemo(() => {
    const total = assignments.length;
    const submitted = assignments.filter(a => a.submission !== null).length;
    const graded = assignments.filter(a => a.submission?.status === 'Graded').length;
    const pending = total - submitted;
    return { total, submitted, graded, pending };
  }, [assignments]);

  // ===========================================================================
  // VIEW 3: FULL-PAGE SUBMISSION INSPECTION VIEW
  // ===========================================================================
  if (selectedStudent && selectedSubmissionItem) {
    const studentName = selectedDetail?.personal?.fullName || selectedDetail?.full_name || selectedStudent.fullName || selectedStudent.full_name;
    const studentCode = selectedDetail?.studentCode || selectedDetail?.student_code || selectedStudent.studentCode || selectedStudent.student_code;
    const typeMeta = assignmentTypeBadge(selectedSubmissionItem.assignmentType);
    const sub = selectedSubmissionItem.submission;

    return (
      <div className="space-y-6 pb-20 animate-fade-in max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 shadow-2xs">
              <FileCheck className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${typeMeta.cls}`}>
                  {typeMeta.label}
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {selectedSubmissionItem.title}
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                Submission dossier for <span className="font-bold text-slate-800">{studentName}</span> ({studentCode}) &bull; Subject: <span className="font-semibold text-slate-700">{selectedSubmissionItem.subjectName}</span> &bull; Batch: <span className="font-semibold text-blue-700">{selectedSubmissionItem.batchName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedSubmissionItem(null)}
              className="text-xs font-semibold text-slate-700 hover:text-blue-600 hover:border-blue-200 shadow-2xs"
            >
              <ChevronLeft size={14} className="mr-1" /> Back to Assessments
            </Button>
          </div>
        </div>

        {/* Main Layout: 2-Column Full Page Dossier */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Assessment Context & Specifications */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <BookOpen size={16} className="text-blue-600" />
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Assessment Overview
                </h3>
              </div>

              {/* Title & Subject */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Title &amp; Subject
                </span>
                <div className="font-bold text-slate-900 text-sm">{selectedSubmissionItem.title}</div>
                <div className="text-xs text-slate-600 mt-0.5">{selectedSubmissionItem.subjectName} {selectedSubmissionItem.subjectCode ? `(${selectedSubmissionItem.subjectCode})` : ''}</div>
              </div>

              {/* Due Date & Max Marks */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Due Date
                  </span>
                  <div className="font-bold text-slate-900 text-xs">
                    {selectedSubmissionItem.dueDate ? new Date(selectedSubmissionItem.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </div>
                </div>

                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Maximum Score
                  </span>
                  <div className="font-extrabold text-blue-700 text-xs font-mono">
                    {selectedSubmissionItem.maxMarks !== null && selectedSubmissionItem.maxMarks !== undefined ? `${selectedSubmissionItem.maxMarks} Points` : 'Not Graded'}
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Instructions &amp; Prompts
                </span>
                <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {selectedSubmissionItem.description || <span className="text-slate-400 italic">No instructions provided.</span>}
                </div>
              </div>

              {/* Question Reference Files */}
              {selectedSubmissionItem.files && selectedSubmissionItem.files.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Reference Materials ({selectedSubmissionItem.files.length})
                  </span>
                  <div className="space-y-1.5">
                    {selectedSubmissionItem.files.map((f, i) => {
                      const fname = f.split('/').pop() || `Attachment ${i + 1}`;
                      return (
                        <a
                          key={i}
                          href={f}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50/50 hover:border-blue-200 text-xs text-slate-700 font-medium transition-colors group"
                        >
                          <span className="truncate group-hover:text-blue-700">{fname}</span>
                          <ExternalLink size={12} className="text-slate-400 group-hover:text-blue-600 shrink-0 ml-1.5" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Student Submission Dossier & Grading */}
          <div className="lg:col-span-8 space-y-6">
            {sub ? (
              <>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <User size={18} className="text-blue-600" />
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                        Student Submission Status
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {sub.status === 'Graded' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={13} /> Graded
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <Clock size={13} /> Submitted (Awaiting Grade)
                        </span>
                      )}

                      {sub.isLate && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle size={12} /> Late Submission
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Submission Timestamp */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Turned In Timestamp
                      </span>
                      <div className="font-semibold text-slate-800">
                        {sub.submittedAt
                          ? new Date(sub.submittedAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </div>
                    </div>

                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Assigned Student
                      </span>
                      <div className="font-bold text-slate-900">{studentName}</div>
                      <div className="font-mono text-blue-700 text-[11px]">{studentCode}</div>
                    </div>
                  </div>

                  {/* Written Answer / Response Text */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                      Submitted Answer &amp; Notes
                    </span>
                    <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-5 text-sm text-slate-900 leading-relaxed whitespace-pre-wrap min-h-[120px]">
                      {sub.responseText || <span className="text-slate-400 italic">No written response text was submitted.</span>}
                    </div>
                  </div>

                  {/* Uploaded Files */}
                  {sub.files && sub.files.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        Attached Submission Documents ({sub.files.length})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {sub.files.map((fileUrl, idx) => {
                          const fileName = fileUrl.split('/').pop() || `Submission File ${idx + 1}`;
                          return (
                            <a
                              key={idx}
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-blue-50/50 hover:border-blue-200 transition-colors shadow-2xs group"
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <FileText size={18} className="text-blue-600 shrink-0" />
                                <span className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-700">
                                  {fileName}
                                </span>
                              </div>
                              <ExternalLink size={14} className="text-slate-400 group-hover:text-blue-600 shrink-0 ml-2" />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Evaluation & Grading Section */}
                <div className="bg-white rounded-2xl border border-emerald-200/80 shadow-sm p-6 space-y-4 bg-emerald-50/10">
                  <div className="flex items-center justify-between pb-3 border-emerald-100 border-b">
                    <div className="flex items-center gap-2">
                      <Award size={18} className="text-emerald-700" />
                      <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wider">
                        Teacher Evaluation &amp; Score
                      </h3>
                    </div>

                    {sub.marksObtained !== null && sub.marksObtained !== undefined && (
                      <span className="font-extrabold text-emerald-800 text-sm font-mono bg-emerald-100/80 px-3 py-1 rounded-lg border border-emerald-200">
                        Score: {sub.marksObtained} / {selectedSubmissionItem.maxMarks || 0} Marks
                      </span>
                    )}
                  </div>

                  {/* Feedback Box */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Teacher Feedback &amp; Remarks
                    </span>
                    <div className="text-xs sm:text-sm text-slate-800 bg-white border border-slate-200 rounded-xl p-4 leading-relaxed">
                      {sub.teacherFeedback || <span className="text-slate-400 italic">No feedback remarks entered yet.</span>}
                    </div>
                  </div>

                  {sub.gradedAt && (
                    <div className="text-[11px] text-slate-400 text-right font-medium">
                      Evaluated on: {new Date(sub.gradedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* No Submission Empty State */
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center space-y-4">
                <FileQuestion size={48} className="mx-auto text-slate-300" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">No Submission Found</h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1">
                    {selectedSubmissionItem.isOverdue
                      ? 'The deadline has passed and this student has not submitted any files or answers for this assessment.'
                      : 'The student has not submitted this assessment yet. Submissions will appear here once turned in.'}
                  </p>
                </div>
                {selectedSubmissionItem.isOverdue && (
                  <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    Status: Missing (Past Deadline)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // VIEW 2: FULL-PAGE STUDENT PROFILE & ATTENDANCE DETAILS & ASSIGNMENTS
  // ===========================================================================
  if (selectedStudent) {
    const detail = selectedDetail;
    const att = detail?.attendance;
    const history = detail?.attendanceHistory || [];

    return (
      <div className="space-y-6 pb-20 animate-fade-in max-w-7xl mx-auto">
        {/* 1. PAGE HEADER (Big & Bold Title) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 shadow-2xs">
              <GraduationCap className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Student Profile</h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">Academic curriculum, identity &amp; guardian contact dossier, attendance log, and academic assessments</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBackToRoster}
              className="text-xs font-semibold text-slate-700 hover:text-blue-600 hover:border-blue-200 shadow-2xs"
            >
              <ChevronLeft size={14} className="mr-1" /> Back to My Students
            </Button>
          </div>
        </div>

        {/* 2. TAB ROW (Matching Academic Schedule Style) */}
        <div className="flex items-center justify-between border-b border-slate-200 overflow-x-auto">
          <div className="flex space-x-1 sm:space-x-2">
            <button
              type="button"
              onClick={() => setProfileTab('overview')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors uppercase tracking-wider whitespace-nowrap ${
                profileTab === 'overview'
                  ? 'border-blue-600 text-blue-700 bg-blue-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <User className="w-4 h-4" /> STUDENT PROFILE &amp; DETAILS
            </button>
            <button
              type="button"
              onClick={() => setProfileTab('attendance')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors uppercase tracking-wider whitespace-nowrap ${
                profileTab === 'attendance'
                  ? 'border-blue-600 text-blue-700 bg-blue-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Calendar className="w-4 h-4" /> ATTENDANCE BREAKDOWN &amp; HISTORY
              {att && att.total !== undefined && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5 ${
                  profileTab === 'attendance' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {att.total}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setProfileTab('assignments')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors uppercase tracking-wider whitespace-nowrap ${
                profileTab === 'assignments'
                  ? 'border-blue-600 text-blue-700 bg-blue-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <ClipboardList className="w-4 h-4" /> ASSIGNMENTS &amp; EXAMS
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5 ${
                profileTab === 'assignments' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {assignments.length}
              </span>
            </button>
          </div>
        </div>

        {/* Loading Spinner */}
        {loadingDetail || !detail ? (
          <Card className="p-16 text-center border border-slate-200 bg-white rounded-2xl shadow-sm">
            <Loader2 size={32} className="mx-auto animate-spin text-blue-600 mb-3" />
            <div className="font-bold text-slate-800 text-base">Loading student profile...</div>
            <p className="text-xs text-slate-400 mt-1">Retrieving academic and profile information...</p>
          </Card>
        ) : (
          <>
            {/* TAB 1: THE UNIFIED DOSSIER LAYOUT */}
            {profileTab === 'overview' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col lg:flex-row">
                {/* 1. The Left-Hand "Quick Glance" Sidebar */}
                <div className="w-full lg:w-80 xl:w-84 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200/80 p-6 sm:p-8 bg-slate-50/40 space-y-6">
                  {/* Profile Anchor */}
                  <div className="space-y-4">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-800 text-white font-display font-extrabold text-2xl flex items-center justify-center shadow-md">
                      {initials(detail?.personal?.fullName || detail?.full_name || selectedStudent.fullName || selectedStudent.full_name || 'ST')}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                          {detail?.personal?.fullName || detail?.full_name || selectedStudent.fullName || selectedStudent.full_name}
                        </h2>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md text-xs border border-blue-100">
                          {detail?.studentCode || detail?.student_code || selectedStudent.studentCode || selectedStudent.student_code}
                        </span>
                        <span className={statusPill(detail?.status || selectedStudent.status).cls}>
                          {statusPill(detail?.status || selectedStudent.status).label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Contacts */}
                  <div className="pt-6 border-t border-slate-200/80 space-y-3.5">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Student Direct Contacts
                    </div>

                    {/* Student Mobile */}
                    <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                        <Phone size={12} className="text-slate-400" /> Student Mobile
                      </span>
                      {detail.personal?.mobile || detail.mobile ? (
                        <a
                          href={`tel:${detail.personal?.mobile || detail.mobile}`}
                          className="text-slate-900 font-bold hover:text-blue-600 font-mono text-sm block transition-colors"
                        >
                          {detail.personal?.mobile || detail.mobile}
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Not Provided</span>
                      )}
                    </div>

                    {/* Student Email */}
                    <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                        <Mail size={12} className="text-slate-400" /> Student Email
                      </span>
                      {detail.personal?.email || detail.email ? (
                        <a
                          href={`mailto:${detail.personal?.email || detail.email}`}
                          className="text-slate-800 font-medium hover:text-blue-600 text-xs truncate block transition-colors"
                          title={detail.personal?.email || detail.email}
                        >
                          {detail.personal?.email || detail.email}
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Not Provided</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. The Main Content Area */}
                <div className="flex-1 p-6 sm:p-8 space-y-7 bg-white">
                  {/* Section A: Academic & Curriculum */}
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-2">
                      <GraduationCap size={16} className="text-blue-600" />
                      <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Academic &amp; Enrollment Details
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Course
                        </span>
                        <div className="text-slate-900 font-bold text-sm">
                          {detail.academic?.course || detail.course_name || '—'}
                        </div>
                      </div>

                      <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Program
                        </span>
                        <div className="text-slate-900 font-bold text-sm">
                          {detail.academic?.program || detail.program_name || '—'}
                        </div>
                      </div>

                      <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Target Exam Goal
                        </span>
                        <div>
                          {detail.personal?.targetExam ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
                              {detail.personal.targetExam}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Not Specified</span>
                          )}
                        </div>
                      </div>

                      <div className="bg-blue-50/40 border border-blue-200/80 rounded-xl p-3.5">
                        <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block mb-1">
                          Enrolled Batch
                        </span>
                        <div className="text-blue-900 font-extrabold text-sm">
                          {detail.academic?.batch || detail.batch_name || '—'}
                        </div>
                      </div>

                      <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Level / Class Standard
                        </span>
                        <div className="text-slate-900 font-bold text-sm">
                          {detail.academic?.level || detail.level_name || '—'}
                        </div>
                      </div>

                      <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Academic Session
                        </span>
                        <div className="text-slate-900 font-bold text-sm">
                          {detail.academic?.academicYear || detail.academic_year_name || '—'}
                        </div>
                      </div>

                      {detail.personal?.schoolName && (
                        <div className="sm:col-span-2 lg:col-span-3 bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            School / College Institution
                          </span>
                          <div className="text-slate-800 font-semibold text-sm">
                            {detail.personal.schoolName}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Subtle Separator */}
                  <hr className="border-slate-100" />

                  {/* Section B: Personal Demographics */}
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-indigo-600" />
                      <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Personal Demographics
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                      <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Date of Birth
                        </span>
                        <span className="text-slate-900 font-bold text-sm block">
                          {detail.personal?.dob || detail.dob ? (
                            (() => {
                              const d = new Date(detail.personal?.dob || detail.dob!);
                              const formatted = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                              const age = Math.abs(new Date(Date.now() - d.getTime()).getUTCFullYear() - 1970);
                              return isNaN(age) ? formatted : `${formatted} (${age} yrs)`;
                            })()
                          ) : '—'}
                        </span>
                      </div>

                      <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Gender
                        </span>
                        <span className="text-slate-900 font-bold text-sm block capitalize">
                          {detail.personal?.gender || detail.gender || '—'}
                        </span>
                      </div>

                      <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Blood Group
                        </span>
                        <span className="text-slate-900 font-bold text-sm block">
                          {detail.personal?.bloodGroup || '—'}
                        </span>
                      </div>

                      <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Category
                        </span>
                        <span className="text-slate-900 font-bold text-sm block">
                          {detail.personal?.category || '—'}
                        </span>
                      </div>

                      <div className="col-span-2 sm:col-span-4 bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Residential Address
                        </span>
                        <span className="text-slate-800 font-semibold text-sm block">
                          {[detail.personal?.street, detail.personal?.city, detail.personal?.state, detail.personal?.pincode].filter(Boolean).join(', ') || 'Not Provided'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Subtle Separator */}
                  <hr className="border-slate-100" />

                  {/* Section C: Guardian Details */}
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-emerald-600" />
                      <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Guardian &amp; Parent Information
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Primary Guardian
                        </span>
                        <span className="text-slate-900 font-bold text-sm block">
                          {detail.guardian?.name || detail.guardian_name || '—'}
                        </span>
                      </div>

                      <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Relationship
                        </span>
                        <span className="text-slate-900 font-bold text-sm block">
                          {detail.guardian?.relation || detail.guardian_relation || 'Parent / Guardian'}
                        </span>
                      </div>

                      <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Contact Phone
                        </span>
                        {detail.guardian?.mobile || detail.guardian_mobile ? (
                          <a
                            href={`tel:${detail.guardian?.mobile || detail.guardian_mobile}`}
                            className="text-blue-600 font-bold font-mono text-sm hover:underline block"
                          >
                            {detail.guardian?.mobile || detail.guardian_mobile}
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Not Provided</span>
                        )}
                      </div>

                      {(detail.guardian?.email || detail.guardian_email) && (
                        <div className="sm:col-span-3 bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Guardian Email Address
                          </span>
                          <a
                            href={`mailto:${detail.guardian?.email || detail.guardian_email}`}
                            className="text-blue-600 font-semibold font-mono text-sm hover:underline block"
                          >
                            {detail.guardian?.email || detail.guardian_email}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ATTENDANCE HISTORY & LOGS */}
            {profileTab === 'attendance' && (
              <div className="space-y-6">
                {/* KPI Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Attendance Rate</span>
                    <span className="text-3xl font-extrabold text-blue-600 mt-1 block">
                      {att && att.pct !== null ? `${att.pct}%` : '0%'}
                    </span>
                    <span className="text-xs text-slate-400 mt-0.5 block">{att?.total || 0} Total Lectures</span>
                  </div>

                  <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm bg-emerald-50/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Present Count</span>
                    <span className="text-3xl font-extrabold text-emerald-600 mt-1 block">{att?.present || 0}</span>
                    <span className="text-xs text-emerald-600 mt-0.5 block">Attended on time</span>
                  </div>

                  <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-sm bg-amber-50/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Late Entries</span>
                    <span className="text-3xl font-extrabold text-amber-600 mt-1 block">{att?.late || 0}</span>
                    <span className="text-xs text-amber-600 mt-0.5 block">Attended with delay</span>
                  </div>

                  <div className="bg-white border border-rose-200 rounded-2xl p-5 shadow-sm bg-rose-50/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">Absent Days</span>
                    <span className="text-3xl font-extrabold text-rose-600 mt-1 block">{att?.absent || 0}</span>
                    <span className="text-xs text-rose-600 mt-0.5 block">Unexcused absences</span>
                  </div>
                </div>

                {/* Detailed Attendance Log Table */}
                <Card className="overflow-hidden border border-slate-200 rounded-2xl shadow-sm">
                  <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Lecture-wise Attendance Log</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Chronological record of all recorded attendance sessions for this student.</p>
                    </div>
                    <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                      {history.length} Records Logged
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                          <th className="px-6 py-3.5 whitespace-nowrap">Date &amp; Time</th>
                          <th className="px-6 py-3.5">Subject &amp; Code</th>
                          <th className="px-6 py-3.5">Batch</th>
                          <th className="px-6 py-3.5">Faculty</th>
                          <th className="px-6 py-3.5 text-center whitespace-nowrap">Status</th>
                          <th className="px-6 py-3.5">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {history.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                              <Calendar className="mx-auto text-slate-300 mb-3" size={32} />
                              <div className="font-bold text-slate-800 text-sm">No lecture attendance records logged yet</div>
                              <p className="text-xs text-slate-400 mt-1">Attendance logs will appear here once lectures are marked.</p>
                            </td>
                          </tr>
                        ) : (
                          history.map((h, i) => (
                            <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-6 py-3.5 whitespace-nowrap">
                                <div className="font-bold text-slate-900 text-xs">
                                  {h.lectureDate ? new Date(h.lectureDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
                                  <Clock size={11} /> {formatTime(h.startTime)} – {formatTime(h.endTime)}
                                </div>
                              </td>

                              <td className="px-6 py-3.5">
                                <div className="font-bold text-slate-800 text-xs">{h.subjectName}</div>
                                {h.subjectCode && <div className="text-[10px] text-slate-400 font-mono">{h.subjectCode}</div>}
                              </td>

                              <td className="px-6 py-3.5 font-semibold text-blue-700 text-xs">
                                {h.batchName}
                              </td>

                              <td className="px-6 py-3.5 text-slate-600 text-xs">
                                {h.teacherName || '—'}
                              </td>

                              <td className="px-6 py-3.5 text-center whitespace-nowrap">
                                {h.status === 1 ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 size={12} /> Present
                                  </span>
                                ) : h.status === 2 ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    <Clock size={12} /> Late
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    <XCircle size={12} /> Absent
                                  </span>
                                )}
                              </td>

                              <td className="px-6 py-3.5 text-slate-500 text-xs italic">
                                {h.remarks || '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {/* TAB 3: ASSIGNMENTS, HOMEWORKS & EXAMS */}
            {profileTab === 'assignments' && (
              <div className="space-y-6">
                {/* KPI Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Assigned</span>
                    <span className="text-3xl font-extrabold text-blue-600 mt-1 block">{assignmentStats.total}</span>
                    <span className="text-xs text-slate-400 mt-0.5 block">Assignments &amp; Exams</span>
                  </div>

                  <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm bg-emerald-50/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Submitted</span>
                    <span className="text-3xl font-extrabold text-emerald-600 mt-1 block">{assignmentStats.submitted}</span>
                    <span className="text-xs text-emerald-600 mt-0.5 block">Completed by student</span>
                  </div>

                  <div className="bg-white border border-indigo-200 rounded-2xl p-5 shadow-sm bg-indigo-50/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">Graded</span>
                    <span className="text-3xl font-extrabold text-indigo-600 mt-1 block">{assignmentStats.graded}</span>
                    <span className="text-xs text-indigo-600 mt-0.5 block">Evaluated with marks</span>
                  </div>

                  <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-sm bg-amber-50/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Pending / Missing</span>
                    <span className="text-3xl font-extrabold text-amber-600 mt-1 block">{assignmentStats.pending}</span>
                    <span className="text-xs text-amber-600 mt-0.5 block">Awaiting submission</span>
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm items-end">
                  <Input
                    label="Search Assessments"
                    placeholder="Search by title, subject, or batch..."
                    value={assignmentSearch}
                    onChange={e => setAssignmentSearch(e.target.value)}
                  />
                  <Select
                    label="Assessment Type"
                    value={assignmentFilterType}
                    onChange={e => setAssignmentFilterType(e.target.value)}
                    options={[
                      { value: 'All', label: 'All Assessment Types' },
                      { value: 'assignment', label: 'Assignments' },
                      { value: 'homework', label: 'Homeworks' },
                      { value: 'exam', label: 'Exams' }
                    ]}
                  />
                  <Select
                    label="Submission Status"
                    value={assignmentFilterStatus}
                    onChange={e => setAssignmentFilterStatus(e.target.value)}
                    options={[
                      { value: 'All', label: 'All Submission Statuses' },
                      { value: 'Graded', label: 'Graded' },
                      { value: 'Submitted', label: 'Submitted (Any)' },
                      { value: 'Pending', label: 'Pending / Missing' }
                    ]}
                  />
                </div>

                {/* Assignments & Exams Table */}
                <Card className="overflow-hidden border border-slate-200 rounded-2xl shadow-sm">
                  <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Batch Assignments, Homeworks &amp; Exams</h3>
                      <p className="text-xs text-slate-500 mt-0.5">List of all assessments published to this student's enrolled batch.</p>
                    </div>
                    <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                      {filteredAssignments.length} Items Found
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                          <th className="px-6 py-3.5">Type &amp; Assessment</th>
                          <th className="px-6 py-3.5">Subject &amp; Batch</th>
                          <th className="px-6 py-3.5 whitespace-nowrap">Due Date</th>
                          <th className="px-6 py-3.5 text-center">Max Marks</th>
                          <th className="px-6 py-3.5 text-center whitespace-nowrap">Submission Status</th>
                          <th className="px-6 py-3.5 text-center whitespace-nowrap">Score Obtained</th>
                          <th className="px-6 py-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {loadingAssignments ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                              <Loader2 size={26} className="mx-auto animate-spin text-blue-500 mb-3" />
                              Loading student assignments and exams...
                            </td>
                          </tr>
                        ) : filteredAssignments.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                              <ClipboardList className="mx-auto text-slate-300 mb-3" size={32} />
                              <div className="font-bold text-slate-800 text-sm">No assessments found</div>
                              <p className="text-xs text-slate-400 mt-1">No assignments or exams match your current filters.</p>
                            </td>
                          </tr>
                        ) : (
                          filteredAssignments.map((item) => {
                            const sub = item.submission;
                            const typeMeta = assignmentTypeBadge(item.assignmentType);

                            return (
                              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                                {/* Type & Title */}
                                <td className="px-6 py-3.5">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${typeMeta.cls}`}>
                                      {typeMeta.label}
                                    </span>
                                  </div>
                                  <div className="font-bold text-slate-900 text-xs">{item.title}</div>
                                </td>

                                {/* Subject & Batch */}
                                <td className="px-6 py-3.5">
                                  <div className="font-semibold text-slate-800 text-xs">{item.subjectName}</div>
                                  <div className="text-[11px] text-blue-700 font-medium">{item.batchName}</div>
                                </td>

                                {/* Due Date */}
                                <td className="px-6 py-3.5 whitespace-nowrap">
                                  <div className="font-medium text-slate-800 text-xs">
                                    {item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                  </div>
                                  {item.isOverdue && !sub && (
                                    <span className="text-[10px] font-bold text-rose-600 block mt-0.5">Overdue</span>
                                  )}
                                </td>

                                {/* Max Marks */}
                                <td className="px-6 py-3.5 text-center font-bold text-slate-700 text-xs">
                                  {item.maxMarks !== null && item.maxMarks !== undefined ? item.maxMarks : '—'}
                                </td>

                                {/* Submission Status */}
                                <td className="px-6 py-3.5 text-center whitespace-nowrap">
                                  {sub ? (
                                    sub.status === 'Graded' ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <CheckCircle2 size={12} /> Graded
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                        <Clock size={12} /> Submitted
                                      </span>
                                    )
                                  ) : item.isOverdue ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                      <XCircle size={12} /> Missing (Overdue)
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                      <Clock size={12} /> Pending
                                    </span>
                                  )}
                                </td>

                                {/* Score Obtained */}
                                <td className="px-6 py-3.5 text-center font-mono text-xs">
                                  {sub && sub.marksObtained !== null && sub.marksObtained !== undefined ? (
                                    <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                      {sub.marksObtained} / {item.maxMarks || 0}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>

                                {/* Action */}
                                <td className="px-6 py-3.5 text-right whitespace-nowrap">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setSelectedSubmissionItem(item)}
                                    className="text-xs font-semibold text-slate-700 hover:text-blue-600"
                                  >
                                    <Eye size={13} className="mr-1" /> View Submission
                                  </Button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ===========================================================================
  // VIEW 1: MY STUDENTS ROSTER LIST (Full Width & No Sideways Scrollbar)
  // ===========================================================================
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">My Students</h2>
          <p className="text-sm text-slate-500 mt-1">Students enrolled in your assigned batches with attendance status.</p>
        </div>
      </div>

      {/* Filter Bar with Column Customizer */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm">
        <div className="flex-1">
          <Input
            label="Search"
            placeholder="Search by name, student code, or phone..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="w-full sm:w-64 shrink-0">
          <Select
            label="Assigned Batch"
            value={filterBatch}
            onChange={e => {
              setFilterBatch(e.target.value);
              setCurrentPage(1);
            }}
            options={batchSelectOptions}
          />
        </div>

        {/* Column Customizer Dropdown */}
        <div className="relative shrink-0">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Display Columns
          </label>
          <button
            type="button"
            onClick={() => setShowColumnPicker(!showColumnPicker)}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors h-[40px] min-w-[130px]"
          >
            <span className="flex items-center gap-1.5">
              <SlidersHorizontal size={13} className="text-slate-500" />
              <span>Columns ({visibleCount})</span>
            </span>
            <ChevronDown size={13} className="text-slate-400" />
          </button>

          {showColumnPicker && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowColumnPicker(false)} />
              <div className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-xl border border-slate-200 shadow-xl p-3 z-30 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Visible Columns</span>
                  <button
                    type="button"
                    onClick={resetColumns}
                    className="text-[10px] text-blue-600 hover:underline font-bold flex items-center gap-1"
                  >
                    <RotateCcw size={10} /> Reset
                  </button>
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {columns.map(col => (
                    <label
                      key={col.key}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                        col.canToggle ? 'hover:bg-slate-50 text-slate-700' : 'text-slate-400 bg-slate-50/50 cursor-not-allowed'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={col.visible}
                        disabled={!col.canToggle}
                        onChange={() => toggleColumn(col.key)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                      />
                      <span className="font-medium text-xs">{col.label}</span>
                      {!col.canToggle && (
                        <span className="ml-auto text-[9px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                          Fixed
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Roster Table — Fits width cleanly without horizontal scrolling */}
      <Card className="p-0 overflow-hidden border border-slate-200 shadow-sm rounded-xl">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                {visibleCols.code && <th className="px-3.5 py-3 whitespace-nowrap">Student Code</th>}
                {visibleCols.name && <th className="px-3.5 py-3">Name</th>}
                {visibleCols.batch && <th className="px-3.5 py-3">Assigned Batch</th>}
                {visibleCols.course && <th className="px-3.5 py-3">Course &amp; Program</th>}
                {visibleCols.level && <th className="px-3.5 py-3 whitespace-nowrap">Level</th>}
                {visibleCols.guardian && <th className="px-3.5 py-3">Guardian Info</th>}
                {visibleCols.attendance && <th className="px-3.5 py-3 text-center whitespace-nowrap">Attendance</th>}
                {visibleCols.status && <th className="px-3.5 py-3 text-center whitespace-nowrap">Status</th>}
                {visibleCols.action && <th className="px-3.5 py-3 text-right whitespace-nowrap">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={visibleCount} className="px-4 py-16 text-center text-slate-400">
                    <Loader2 size={24} className="mx-auto animate-spin text-blue-500 mb-2" />
                    Loading your students...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={visibleCount} className="px-4 py-16 text-center text-slate-500">
                    <Users size={32} className="mx-auto text-slate-300 mb-3" />
                    <div className="font-bold text-slate-800 text-sm">No students found in your assigned batches</div>
                    <p className="text-xs text-slate-400 mt-1">Try changing your search term or batch filter.</p>
                  </td>
                </tr>
              ) : (
                students.map(s => {
                  const bId = s.batch?.id || s.batch_id;
                  const hier = hierarchyResolver(bId);
                  const batchName = s.batch?.name || s.batch_name || '—';
                  const courseName = s.course?.name || hier.course;
                  const programName = s.program?.name || hier.program;
                  const levelName = s.level?.name || hier.level;
                  const guardianName = s.guardian?.name || s.guardian_name || '—';
                  const guardianMobile = s.guardian?.mobile || s.guardian_mobile || '';
                  const attPct = s.attendance?.pct ?? s.attendance_pct;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. Student Code */}
                      {visibleCols.code && (
                        <td className="px-3.5 py-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                          {s.studentCode || s.student_code}
                        </td>
                      )}

                      {/* 2. Name */}
                      {visibleCols.name && (
                        <td className="px-3.5 py-3 font-bold text-slate-900">
                          {s.fullName || s.full_name}
                        </td>
                      )}

                      {/* 3. Batch */}
                      {visibleCols.batch && (
                        <td className="px-3.5 py-3 font-semibold text-blue-700">
                          {batchName}
                        </td>
                      )}

                      {/* 4. Course & Program */}
                      {visibleCols.course && (
                        <td className="px-3.5 py-3">
                          <div className="font-semibold text-slate-800">{courseName}</div>
                          {programName && programName !== '—' && (
                            <div className="text-[10px] text-slate-400">{programName}</div>
                          )}
                        </td>
                      )}

                      {/* 5. Level */}
                      {visibleCols.level && (
                        <td className="px-3.5 py-3 text-slate-600 whitespace-nowrap">
                          {levelName}
                        </td>
                      )}

                      {/* 6. Guardian Info */}
                      {visibleCols.guardian && (
                        <td className="px-3.5 py-3">
                          <div className="font-semibold text-slate-700">{guardianName}</div>
                          {guardianMobile && (
                            <div className="text-[10px] font-mono text-slate-400">{guardianMobile}</div>
                          )}
                        </td>
                      )}

                      {/* 7. Attendance */}
                      {visibleCols.attendance && (
                        <td className="px-3.5 py-3 text-center whitespace-nowrap">
                          {attPct === null || attPct === undefined || (s.attendance?.total === 0 && s.attendance_total === 0) ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {attPct}%
                            </span>
                          )}
                        </td>
                      )}

                      {/* 8. Status */}
                      {visibleCols.status && (
                        <td className="px-3.5 py-3 text-center whitespace-nowrap">
                          <span className={statusPill(s.status).cls}>{statusPill(s.status).label}</span>
                        </td>
                      )}

                      {/* 9. Action */}
                      {visibleCols.action && (
                        <td className="px-3.5 py-3 text-right whitespace-nowrap">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedStudent(s)}
                            className="text-xs px-2.5 py-1 font-semibold text-slate-700 hover:text-blue-600 hover:border-blue-200"
                          >
                            View Profile
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && students.length > 0 && (
          <div className="p-3.5 border-t border-slate-100 bg-slate-50/70">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </Card>
    </div>
  );
};