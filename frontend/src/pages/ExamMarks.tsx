import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Pagination } from '../components/ui/Pagination';
import {
  Check,
  ClipboardList,
  PenTool,
  Plus,
  ArrowLeft,
  Calendar,
  Clock,
  Award,
  Download,
  Trash2,
  Send,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import examApi from '../services/examApi';
import type { ExamRecord, ExamRosterStudent, ExamType } from '../services/examApi';

const EXAM_TYPES: ExamType[] = [
  'Daily Test',
  'Weekly Test',
  'Fortnightly Test',
  'Monthly Test',
  'Unit Test',
  'Chapter Test',
  'Mock Test',
  'Term Exam',
  'Final Exam',
  'Assignment',
  'Internal Assessment',
  'Other'
];

export const ExamMarks: React.FC = () => {
  const { branches, courses, batches, currentUser } = useApp();

  // Active Tab: 'registry' (Test Catalog) or 'grade' (Scoring Sheet)
  const [activeTab, setActiveTab] = useState<'registry' | 'grade'>('registry');

  // Exams State
  const [examList, setExamList] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Registry Filters & Search
  const [registrySearch, setRegistrySearch] = useState('');
  const [registryFilterBatch, setRegistryFilterBatch] = useState('All');
  const [registryFilterType, setRegistryFilterType] = useState('All');
  const [registrySortBy, setRegistrySortBy] = useState<'date' | 'name' | 'marks'>('date');
  const [registryPage, setRegistryPage] = useState(1);
  const itemsPerPage = 6;

  // Grade Screen selection state
  const [selectedBranch, setSelectedBranch] = useState(
    currentUser?.role === 'branch-admin' ? currentUser.branch || 'All' : 'All'
  );
  const [selectedCourse, setSelectedCourse] = useState('All');
  const [selectedProgram, setSelectedProgram] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedBatch, setSelectedBatch] = useState('All');
  const [selectedExamId, setSelectedExamId] = useState<string>('');

  // Active Roster & Local Marks State
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterStudents, setRosterStudents] = useState<ExamRosterStudent[]>([]);
  const [localMarks, setLocalMarks] = useState<{ [studentId: string]: string }>({});
  const [localAbsents, setLocalAbsents] = useState<{ [studentId: string]: boolean }>({});
  const [isSaved, setIsSaved] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);

  // Schedule Test Modal State
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [examName, setExamName] = useState('');
  const [examType, setExamType] = useState<ExamType>('Weekly Test');
  const [examBatch, setExamBatch] = useState('');
  const [examSubject, setExamSubject] = useState('');
  const [examDate, setExamDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [examStartTime, setExamStartTime] = useState('10:00');
  const [examDuration, setExamDuration] = useState('60 mins');
  const [examTotalMarks, setExamTotalMarks] = useState(100);
  const [examPassingMarks, setExamPassingMarks] = useState(40);
  const [examInstructions, setExamInstructions] = useState('');
  const [submittingExam, setSubmittingExam] = useState(false);

  // Load Exams from Backend
  const loadExams = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const data = await examApi.getExams();
      setExamList(data);
    } catch (err: any) {
      console.error('Failed to load exams:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to load examinations from server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  // Unique options for cascading filters
  const uniqueBranches = useMemo(() => {
    return currentUser?.role === 'branch-admin'
      ? [currentUser.branch || '']
      : branches.map(b => b.name);
  }, [branches, currentUser]);

  const uniqueCourses = useMemo(() => courses.map(c => c.name), [courses]);
  const uniquePrograms = useMemo(() => Array.from(new Set(batches.map(b => b.program).filter(Boolean))) as string[], [batches]);
  const uniqueLevels = useMemo(() => Array.from(new Set(batches.map(b => b.level).filter(Boolean))) as string[], [batches]);
  const uniqueYears = useMemo(() => Array.from(new Set(batches.map(b => b.academicYear).filter(Boolean))) as string[], [batches]);

  // Filter batches by selected hierarchy
  const availableBatches = useMemo(() => {
    return batches.filter(b => {
      const batchBranch = b.branch || 'Mumbai West';
      const matchBranch = selectedBranch === 'All' || batchBranch === selectedBranch;
      const matchCourse = selectedCourse === 'All' || b.course === selectedCourse;
      const matchProgram = selectedProgram === 'All' || b.program === selectedProgram;
      const matchLevel = selectedLevel === 'All' || b.level === selectedLevel;
      const matchYear = selectedYear === 'All' || b.academicYear === selectedYear;
      return matchBranch && matchCourse && matchProgram && matchLevel && matchYear;
    });
  }, [batches, selectedBranch, selectedCourse, selectedProgram, selectedLevel, selectedYear]);

  // Synchronize batch when filters update
  useEffect(() => {
    if (availableBatches.length > 0) {
      const isBatchAvailable = availableBatches.some(b => b.name === selectedBatch);
      if (!isBatchAvailable) {
        setSelectedBatch(availableBatches[0].name);
      }
    } else {
      setSelectedBatch('');
    }
  }, [availableBatches, selectedBatch]);

  // Filter exams available for the selected batch
  const availableExamsForBatch = useMemo(() => {
    if (!selectedBatch) return [];
    return examList.filter(e => e.batch === selectedBatch);
  }, [examList, selectedBatch]);

  // Synchronize active exam when batch changes
  useEffect(() => {
    if (availableExamsForBatch.length > 0) {
      const isCurrentExamValid = availableExamsForBatch.some(e => String(e.id) === String(selectedExamId));
      if (!isCurrentExamValid) {
        setSelectedExamId(String(availableExamsForBatch[0].id));
      }
    } else {
      setSelectedExamId('');
    }
  }, [availableExamsForBatch, selectedExamId]);

  // Active selected exam object
  const activeExam = useMemo(() => {
    return examList.find(e => String(e.id) === String(selectedExamId));
  }, [examList, selectedExamId]);

  // Load student roster whenever activeExam changes
  useEffect(() => {
    let isCancelled = false;
    if (!selectedExamId) {
      setRosterStudents([]);
      setLocalMarks({});
      setLocalAbsents({});
      return;
    }

    const fetchRoster = async () => {
      try {
        setRosterLoading(true);
        const res = await examApi.getExamRoster(selectedExamId);
        if (isCancelled) return;

        setRosterStudents(res.roster || []);
        const marksInit: { [studentId: string]: string } = {};
        const absentsInit: { [studentId: string]: boolean } = {};

        (res.roster || []).forEach(s => {
          marksInit[s.studentId] = s.marksObtained !== null && s.marksObtained !== undefined ? String(s.marksObtained) : '';
          absentsInit[s.studentId] = Boolean(s.isAbsent);
        });

        setLocalMarks(marksInit);
        setLocalAbsents(absentsInit);
        setIsSaved(false);
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Failed to load roster:', err);
          setErrorMessage('Could not load student roster for this examination');
        }
      } finally {
        if (!isCancelled) setRosterLoading(false);
      }
    };

    fetchRoster();
    return () => {
      isCancelled = true;
    };
  }, [selectedExamId]);

  // Mark changes handler with max-mark clamping
  const handleMarkChange = (studentId: string, value: string) => {
    setIsSaved(false);
    if (!activeExam) return;

    if (value !== '') {
      const num = Number(value);
      if (num > activeExam.totalMarks) {
        setLocalMarks(prev => ({ ...prev, [studentId]: String(activeExam.totalMarks) }));
        return;
      }
      if (num < 0) {
        setLocalMarks(prev => ({ ...prev, [studentId]: '0' }));
        return;
      }
    }
    setLocalMarks(prev => ({ ...prev, [studentId]: value }));
  };

  // Toggle absent status
  const handleToggleAbsent = (studentId: string) => {
    setIsSaved(false);
    setLocalAbsents(prev => {
      const next = !prev[studentId];
      if (next) {
        // Clear marks if marked absent
        setLocalMarks(m => ({ ...m, [studentId]: '' }));
      }
      return { ...prev, [studentId]: next };
    });
  };

  // Save Marks (Draft or Publish)
  const handleSaveMarks = async (publish = false) => {
    if (!activeExam || !selectedExamId) return;

    try {
      setSavingMarks(true);
      setErrorMessage('');

      const marksPayload = rosterStudents.map(s => {
        const val = localMarks[s.studentId];
        const isAbsent = Boolean(localAbsents[s.studentId]);
        return {
          studentId: s.rawStudentId || s.studentId,
          marksObtained: !isAbsent && val !== '' && val !== undefined ? Number(val) : null,
          isAbsent
        };
      });

      const res = await examApi.saveMarks(selectedExamId, marksPayload, publish);

      setIsSaved(true);
      setSuccessMessage(
        publish
          ? `Marks for "${activeExam.name}" published successfully! Results are now visible.`
          : `Evaluation sheet for "${activeExam.name}" saved as draft.`
      );

      // Refresh exams list to update class average and status
      await loadExams();

      setTimeout(() => setSuccessMessage(''), 4500);
    } catch (err: any) {
      console.error('Error saving marks:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to save examination marks');
    } finally {
      setSavingMarks(false);
    }
  };

  // Direct trigger from Test Registry to Grade screen
  const triggerGradeExam = (exam: ExamRecord) => {
    const matchedBatch = batches.find(b => b.name === exam.batch);
    if (matchedBatch) {
      setSelectedBranch(matchedBatch.branch || 'Mumbai West');
      setSelectedCourse(matchedBatch.course || 'All');
      setSelectedProgram(matchedBatch.program || 'All');
      setSelectedLevel(matchedBatch.level || 'All');
      setSelectedYear(matchedBatch.academicYear || 'All');
      setSelectedBatch(exam.batch || matchedBatch.name);
    } else if (exam.batch) {
      setSelectedBatch(exam.batch);
    }
    setSelectedExamId(String(exam.id));
    setActiveTab('grade');
  };

  // Delete Exam
  const handleDeleteExam = async (exam: ExamRecord) => {
    if (!window.confirm(`Are you sure you want to delete "${exam.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await examApi.deleteExam(exam.id);
      setSuccessMessage(`Exam "${exam.name}" deleted successfully.`);
      loadExams();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to delete examination');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!activeExam || rosterStudents.length === 0) return;

    const headersList = [
      'Student ID',
      'Student Code',
      'Student Name',
      'Attendance',
      'Marks Obtained',
      'Total Marks',
      'Passing Marks',
      'Percentage',
      'Grade',
      'Result Status',
      'Contact Mobile',
      'Parent Mobile',
      'Batch',
      'Course',
      'Branch'
    ];

    const rows = rosterStudents.map(s => {
      const isAbsent = Boolean(localAbsents[s.studentId]);
      const scoreStr = localMarks[s.studentId] || '';
      const scoreNum = !isAbsent && scoreStr !== '' ? Number(scoreStr) : null;
      let status = 'TBD';
      let pct = '';
      let grade = 'N/A';

      if (isAbsent) {
        status = 'Absent';
      } else if (scoreNum !== null) {
        status = scoreNum >= activeExam.passingMarks ? 'Passed' : 'Failed';
        pct = `${((scoreNum / activeExam.totalMarks) * 100).toFixed(1)}%`;
        if (scoreNum >= activeExam.totalMarks * 0.9) grade = 'A+';
        else if (scoreNum >= activeExam.totalMarks * 0.8) grade = 'A';
        else if (scoreNum >= activeExam.totalMarks * 0.7) grade = 'B+';
        else if (scoreNum >= activeExam.totalMarks * 0.6) grade = 'B';
        else if (scoreNum >= activeExam.totalMarks * 0.4) grade = 'D';
        else grade = 'F';
      }

      return [
        s.studentId,
        s.studentCode,
        s.name,
        isAbsent ? 'Absent' : 'Present',
        scoreNum !== null ? scoreNum : '',
        activeExam.totalMarks,
        activeExam.passingMarks,
        pct,
        grade,
        status,
        s.mobile || '',
        s.parentMobile || '',
        s.batch || activeExam.batch || '',
        s.course || activeExam.course || '',
        s.branch || activeExam.branch || ''
      ];
    });

    const csvContent = [
      headersList.join(','),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeExam.name.replace(/\s+/g, '_')}_Results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Schedule Exam Form Submit
  const handleExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examName.trim() || !examBatch) {
      setErrorMessage('Please fill in exam title and target batch.');
      return;
    }

    try {
      setSubmittingExam(true);
      setErrorMessage('');

      const matchedBatch = batches.find(b => b.name === examBatch);

      await examApi.createExam({
        name: examName.trim(),
        title: examName.trim(),
        type: examType,
        examType,
        batchName: examBatch,
        batchId: matchedBatch?.id,
        branchName: selectedBranch !== 'All' ? selectedBranch : matchedBatch?.branch,
        course: selectedCourse !== 'All' ? selectedCourse : matchedBatch?.course,
        subject: examSubject || 'General',
        examDate,
        startTime: examStartTime,
        duration: examDuration,
        totalMarks: examTotalMarks,
        passingMarks: examPassingMarks,
        instructions: examInstructions,
        status: 'Scheduled'
      });

      setShowAddExamModal(false);
      setSuccessMessage(`New test "${examName}" scheduled successfully!`);
      await loadExams();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      console.error('Error creating exam:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to schedule new test');
    } finally {
      setSubmittingExam(false);
    }
  };

  // Filter & sort exams for Test Registry
  const filteredAndSortedExams = useMemo(() => {
    return examList
      .filter(e => {
        const matchSearch = (e.name || '').toLowerCase().includes(registrySearch.toLowerCase()) ||
          (e.subject || '').toLowerCase().includes(registrySearch.toLowerCase());
        const matchBatch = registryFilterBatch === 'All' || e.batch === registryFilterBatch;
        const matchType = registryFilterType === 'All' || e.type === registryFilterType;

        const batchObj = batches.find(b => b.name === e.batch);
        const isMyBranch = currentUser?.role === 'branch-admin'
          ? (batchObj?.branch === currentUser.branch || e.branch === currentUser.branch)
          : true;

        return matchSearch && matchBatch && matchType && isMyBranch;
      })
      .sort((a, b) => {
        if (registrySortBy === 'name') return a.name.localeCompare(b.name);
        if (registrySortBy === 'marks') return b.totalMarks - a.totalMarks;
        // Default sort by examDate desc
        return (b.examDate || '').localeCompare(a.examDate || '');
      });
  }, [examList, registrySearch, registryFilterBatch, registryFilterType, registrySortBy, batches, currentUser]);

  const registryTotalPages = Math.ceil(filteredAndSortedExams.length / itemsPerPage) || 1;
  const paginatedExams = useMemo(() => {
    return filteredAndSortedExams.slice((registryPage - 1) * itemsPerPage, registryPage * itemsPerPage);
  }, [filteredAndSortedExams, registryPage, itemsPerPage]);

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Marks Published':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Check size={12} className="mr-1" /> Published
          </span>
        );
      case 'Marks Pending':
      case 'In Progress':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <PenTool size={12} className="mr-1" /> Marks Pending
          </span>
        );
      case 'Scheduled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Calendar size={12} className="mr-1" /> Scheduled
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status || 'Draft'}
          </span>
        );
    }
  };

  // Schedule Test Modal View
  if (showAddExamModal) {
    return (
      <div className="space-y-6 w-full animate-fade-in p-2 sm:p-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddExamModal(false)}
            className="flex items-center justify-center h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">Schedule Examination & Evaluation</h2>
            <p className="text-sm text-slate-500">Configure tests, assign target batches, subjects, and scoring rules.</p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleExamSubmit} className="space-y-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
              <ClipboardList size={18} className="text-indigo-600" /> Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Examination Title"
                required
                placeholder="e.g. Term 1 Physics Mechanics Evaluation"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
              />
              <Select
                label="Evaluation Type"
                value={examType}
                onChange={(e) => setExamType(e.target.value as ExamType)}
                options={EXAM_TYPES.map(t => ({ value: t, label: t }))}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Filter size={18} className="text-indigo-600" /> Academic & Batch Mapping
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Select
                label="Branch"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                options={[{ value: 'All', label: 'All Branches' }, ...uniqueBranches.map(b => ({ value: b, label: b }))]}
                disabled={currentUser?.role === 'branch-admin'}
              />
              <Select
                label="Course"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                options={[{ value: 'All', label: 'All Courses' }, ...uniqueCourses.map(c => ({ value: c, label: c }))]}
              />
              <Select
                label="Allocate Target Batch *"
                required
                value={examBatch}
                onChange={(e) => setExamBatch(e.target.value)}
                options={[
                  { value: '', label: 'Select Target Batch' },
                  ...availableBatches.map(b => ({ value: b.name, label: b.name }))
                ]}
              />
              <Input
                label="Subject Name"
                placeholder="e.g. Physics, Chemistry, Math"
                value={examSubject}
                onChange={(e) => setExamSubject(e.target.value)}
              />
              <Input
                label="Examination Date"
                type="date"
                required
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Start Time"
                  type="time"
                  value={examStartTime}
                  onChange={(e) => setExamStartTime(e.target.value)}
                />
                <Input
                  label="Duration"
                  placeholder="e.g. 90 mins"
                  value={examDuration}
                  onChange={(e) => setExamDuration(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Award size={18} className="text-indigo-600" /> Marks & Evaluation Criteria
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Maximum Total Marks"
                type="number"
                min={1}
                required
                value={examTotalMarks}
                onChange={(e) => setExamTotalMarks(Number(e.target.value))}
              />
              <Input
                label="Passing Threshold Marks"
                type="number"
                min={0}
                max={examTotalMarks}
                required
                value={examPassingMarks}
                onChange={(e) => setExamPassingMarks(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Instructions / Syllabus Notes (Optional)
              </label>
              <textarea
                rows={3}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 transition-all"
                placeholder="Specify chapters included, negative marking scheme, or exam venue instructions..."
                value={examInstructions}
                onChange={(e) => setExamInstructions(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setShowAddExamModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submittingExam || !examBatch || !examName}>
              {submittingExam ? 'Scheduling Test...' : 'Confirm & Schedule Test'}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full p-2 sm:p-6 animate-fade-in">
      {/* Toast Messages */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 shadow-sm flex items-center justify-between animate-fade-in">
          <span>✓ {successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-600 hover:text-emerald-900 text-xs">Dismiss</button>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-semibold text-red-700 shadow-sm flex items-center justify-between animate-fade-in">
          <span>⚠️ {errorMessage}</span>
          <button onClick={() => setErrorMessage('')} className="text-red-500 hover:text-red-800 text-xs">Dismiss</button>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight">
            Examinations & Marks Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Schedule periodic tests, grade student score rosters, and publish academic report cards.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadExams}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setExamName('');
              setExamSubject('');
              setExamInstructions('');
              if (availableBatches.length > 0) setExamBatch(availableBatches[0].name);
              setShowAddExamModal(true);
            }}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            <Plus size={16} /> Schedule New Test
          </Button>
        </div>
      </div>

      {/* Tab Navigators */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('registry')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'registry'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <ClipboardList size={17} /> Test Registry & Catalog
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs font-mono bg-slate-200 text-slate-700">
            {filteredAndSortedExams.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('grade')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'grade'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <PenTool size={17} /> Student Marks Entry
          {activeExam && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs font-mono bg-emerald-100 text-emerald-800">
              {activeExam.name.slice(0, 18)}...
            </span>
          )}
        </button>
      </div>

      {/* ─────────────────── TAB 1: TEST REGISTRY ─────────────────── */}
      {activeTab === 'registry' && (
        <div className="space-y-6 animate-fade-in">
          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm items-center">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search tests by title or subject..."
                value={registrySearch}
                onChange={(e) => {
                  setRegistrySearch(e.target.value);
                  setRegistryPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
              />
            </div>

            <Select
              value={registryFilterBatch}
              onChange={(e) => {
                setRegistryFilterBatch(e.target.value);
                setRegistryPage(1);
              }}
              options={[
                { value: 'All', label: 'All Batches' },
                ...Array.from(new Set(batches.map(b => b.name))).map(b => ({ value: b, label: b }))
              ]}
            />

            <Select
              value={registryFilterType}
              onChange={(e) => {
                setRegistryFilterType(e.target.value);
                setRegistryPage(1);
              }}
              options={[
                { value: 'All', label: 'All Test Types' },
                ...EXAM_TYPES.map(t => ({ value: t, label: t }))
              ]}
            />
          </div>

          {/* Test Cards / Table */}
          {loading ? (
            <div className="py-20 text-center text-slate-400 font-medium">
              <RefreshCw className="animate-spin inline-block mr-2" size={20} /> Loading examinations...
            </div>
          ) : filteredAndSortedExams.length === 0 ? (
            <Card>
              <div className="py-16 text-center text-slate-400">
                <span className="text-4xl block mb-2">📋</span>
                <p className="font-semibold text-slate-700">No examinations found.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Adjust filters or click &quot;Schedule New Test&quot; above to create one.
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedExams.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {exam.type || 'Exam'}
                      </span>
                      {renderStatusBadge(exam.status)}
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-slate-900 line-clamp-2" title={exam.name}>
                        {exam.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-medium">
                        <span>📚 {exam.subject || 'General'}</span>
                        <span>•</span>
                        <span>👥 {exam.batch || 'Batch'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block font-medium">Date & Time</span>
                        <span className="font-semibold text-slate-700">
                          {exam.examDate || 'TBD'} {exam.startTime ? `(${exam.startTime})` : ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Total / Pass Marks</span>
                        <span className="font-semibold text-slate-700">
                          {exam.totalMarks} / {exam.passingMarks}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Class Average</span>
                        <span className="font-bold text-indigo-700">
                          {exam.average || 'TBD'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Branch</span>
                        <span className="font-semibold text-slate-700 truncate block">
                          {exam.branch || 'Main'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-slate-100">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => triggerGradeExam(exam)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold"
                    >
                      <PenTool size={13} /> Enter Marks
                    </Button>
                    <button
                      onClick={() => handleDeleteExam(exam)}
                      title="Delete test"
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredAndSortedExams.length > itemsPerPage && (
            <div className="flex justify-end pt-4">
              <Pagination
                currentPage={registryPage}
                totalPages={registryTotalPages}
                totalItems={filteredAndSortedExams.length}
                pageSize={itemsPerPage}
                onPageChange={setRegistryPage}
              />
            </div>
          )}
        </div>
      )}

      {/* ─────────────────── TAB 2: GRADE / MARKS ENTRY ─────────────────── */}
      {activeTab === 'grade' && (
        <div className="space-y-6 animate-fade-in">
          {/* Cascading Filter Header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-white border border-slate-200 p-5 rounded-xl shadow-sm items-end animate-fade-in">
            <Select
              label="Branch"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              options={[{ value: 'All', label: 'All Branches' }, ...uniqueBranches.map(b => ({ value: b, label: b }))]}
              disabled={currentUser?.role === 'branch-admin'}
            />
            <Select
              label="Course"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              options={[{ value: 'All', label: 'All Courses' }, ...uniqueCourses.map(c => ({ value: c, label: c }))]}
            />
            <Select
              label="Target Batch *"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              options={availableBatches.map(b => ({ value: b.name, label: b.name }))}
              disabled={availableBatches.length === 0}
            />
            <Select
              label="Select Evaluation Exam *"
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              options={[
                { value: '', label: availableExamsForBatch.length ? 'Select Exam' : 'No tests in this batch' },
                ...availableExamsForBatch.map(e => ({ value: String(e.id), label: `${e.name} (${e.totalMarks} marks)` }))
              ]}
              disabled={availableExamsForBatch.length === 0}
            />
          </div>

          {/* Roster & Marks Sheet */}
          {activeExam ? (
            <Card>
              <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">Evaluation Sheet: {activeExam.name}</CardTitle>
                    {renderStatusBadge(activeExam.status)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 font-medium flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>Batch: <strong>{activeExam.batch}</strong></span>
                    <span>•</span>
                    <span>Subject: <strong>{activeExam.subject}</strong></span>
                    <span>•</span>
                    <span>Max Marks: <strong>{activeExam.totalMarks}</strong></span>
                    <span>•</span>
                    <span>Passing: <strong>{activeExam.passingMarks}</strong></span>
                    <span>•</span>
                    <span>Class Avg: <strong className="text-indigo-600">{activeExam.average || 'TBD'}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleExportCSV}
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-1 text-xs"
                    disabled={rosterStudents.length === 0}
                  >
                    <Download size={14} /> Export CSV
                  </Button>
                </div>
              </CardHeader>

              {rosterLoading ? (
                <div className="py-16 text-center text-slate-400 font-medium">
                  <RefreshCw className="animate-spin inline-block mr-2" size={18} />
                  Loading candidate roster for this examination...
                </div>
              ) : rosterStudents.length === 0 ? (
                <div className="py-14 text-center text-slate-400">
                  <p className="font-semibold text-slate-600">No active students enrolled in this batch.</p>
                  <p className="text-xs text-slate-400 mt-1">Enroll students into this batch to enter marks.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table headers={['Student ID', 'Student Name', 'Attendance Status', 'Marks Obtained', 'Percentage', 'Grade', 'Result Status']}>
                    {rosterStudents.map((s, idx) => {
                      const isAbsent = Boolean(localAbsents[s.studentId]);
                      const scoreStr = localMarks[s.studentId] || '';
                      const scoreNum = !isAbsent && scoreStr !== '' ? Number(scoreStr) : null;

                      let pctStr = '-';
                      let gradeStr = '-';
                      let badge = (
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-500">
                          TBD
                        </span>
                      );

                      if (isAbsent) {
                        badge = (
                          <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Absent
                          </span>
                        );
                      } else if (scoreNum !== null) {
                        const pctVal = ((scoreNum / activeExam.totalMarks) * 100).toFixed(1);
                        pctStr = `${pctVal}%`;

                        if (scoreNum >= activeExam.passingMarks) {
                          badge = (
                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                              Passed
                            </span>
                          );
                        } else {
                          badge = (
                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-500 border border-red-100">
                              Failed
                            </span>
                          );
                        }

                        if (scoreNum >= activeExam.totalMarks * 0.9) gradeStr = 'A+';
                        else if (scoreNum >= activeExam.totalMarks * 0.8) gradeStr = 'A';
                        else if (scoreNum >= activeExam.totalMarks * 0.7) gradeStr = 'B+';
                        else if (scoreNum >= activeExam.totalMarks * 0.6) gradeStr = 'B';
                        else if (scoreNum >= activeExam.totalMarks * 0.4) gradeStr = 'D';
                        else gradeStr = 'F';
                      }

                      return (
                        <tr key={s.studentId || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-xs text-slate-600">
                            {s.studentCode || s.studentId}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-800 block">{s.name}</span>
                            {s.mobile && <span className="text-xs text-slate-400">{s.mobile}</span>}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              onClick={() => handleToggleAbsent(s.studentId)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                                isAbsent
                                  ? 'bg-amber-500 text-white border-amber-600'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              }`}
                            >
                              {isAbsent ? 'Absent' : 'Present'}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                max={activeExam.totalMarks}
                                disabled={isAbsent}
                                value={scoreStr}
                                placeholder={isAbsent ? 'Absent' : '0.00'}
                                onChange={(e) => handleMarkChange(s.studentId, e.target.value)}
                                className={`w-28 border rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-1 transition-all ${
                                  isAbsent
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                                    : 'border-slate-300 text-slate-800 focus:border-indigo-500 focus:ring-indigo-200'
                                }`}
                              />
                              <span className="text-xs text-slate-400 font-semibold font-mono">
                                / {activeExam.totalMarks}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-sm font-semibold text-slate-700">
                            {pctStr}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-bold font-mono bg-slate-100 text-slate-700">
                              {gradeStr}
                            </span>
                          </td>
                          <td className="px-6 py-4">{badge}</td>
                        </tr>
                      );
                    })}
                  </Table>

                  {/* Actions Footer */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 border-t border-slate-200">
                    <span className="text-xs text-slate-500">
                      Roster: {rosterStudents.length} candidate(s) enrolled
                    </span>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleSaveMarks(false)}
                        disabled={savingMarks}
                        className="text-xs font-semibold"
                      >
                        {savingMarks ? 'Saving...' : 'Save Draft Marks'}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleSaveMarks(true)}
                        disabled={savingMarks}
                        className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm"
                      >
                        <Send size={14} /> Publish Marks & Results
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <div className="py-16 text-center text-slate-400 animate-fade-in">
                <span className="text-4xl block mb-3">📝</span>
                <p className="font-semibold text-slate-600">No batch evaluation test chosen.</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Please select a batch and an exam from the selectors above to load the student scoring roster.
                </p>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default ExamMarks;
