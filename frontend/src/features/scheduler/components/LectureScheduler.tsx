import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import { useScheduler } from '../context/SchedulerContext';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { Plus, Edit, ChevronLeft, ChevronRight, Calendar, User, MapPin, Copy, Sparkles, MessageSquare, BookmarkCheck, Download } from 'lucide-react';
import courseHierarchy from '../../../data/courseHierarchy.json';
import teachersList from '../../../data/teachers.json';
import { TimetableGrid } from './TimetableGrid';
import { LectureFormModal } from './LectureFormModal';
import { CreateTimetableWizard } from './CreateTimetableWizard';
import { ReplicateWeekModal } from './ReplicateWeekModal';
import { TeacherRequestsTab } from './TeacherRequestsTab';
import { DefaultTimetableTab } from './DefaultTimetableTab';
import type { CreateTimetableContext } from './CreateTimetableWizard';
import type { Lecture } from '../types/scheduler';
import type { ScheduleChange } from '../../../data/mockData';
import scheduleRequestsData from '../../../data/scheduleRequests.json';

const getTeacherName = (id?: string) => {
  if (!id) return '';
  const teacher = teachersList.find(t => t.id === id);
  return teacher ? teacher.name : id;
};

const parseLocalDate = (dateStr: string): Date => {
  if (dateStr.includes('T')) {
    dateStr = dateStr.split('T')[0];
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts.map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
};

const formatLocalDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const LectureScheduler = () => {
  const { currentUser, branches, batches, addToast } = useApp();
  const { lectures, rooms, syncLectures, addLectures, updateLecture, cancelLecture } = useScheduler();

  const [searchParams, setSearchParams] = useSearchParams();

  // Filters State (derived from URL Search Params)
  const initialBranchName = currentUser?.role === 'branch-admin' ? currentUser.branch : '';
  const initialBranch = initialBranchName 
    ? (branches.find(b => b.name === initialBranchName || b.code === initialBranchName)?.code || '') 
    : '';
  const branch = searchParams.get('branch') || initialBranch || '';
  const course = searchParams.get('course') || '';
  const program = searchParams.get('program') || '';
  const level = searchParams.get('level') || '';
  const batch = searchParams.get('batch') || '';

  const updateFilter = (key: string, value: string, resetKeys: string[] = []) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      resetKeys.forEach(k => next.delete(k));
      return next;
    }, { replace: true });
  };

  // Tabs State
  const [activeTab, setActiveTab] = useState<'batch' | 'teacher' | 'room' | 'requests' | 'default'>('batch');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<string>('');

  // Requests state for badge count
  const [requestsList, setRequestsList] = useState<ScheduleChange[]>(() => {
    const saved = localStorage.getItem('vs_schedule_requests');
    return saved ? JSON.parse(saved) : (scheduleRequestsData as ScheduleChange[]);
  });

  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem('vs_schedule_requests');
      if (saved) setRequestsList(JSON.parse(saved));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const pendingRequestsCount = useMemo(() => {
    return requestsList.filter(r => r.status === 'Pending Approval').length;
  }, [requestsList]);

  // Request currently being resolved in the editor
  const [resolvingRequest, setResolvingRequest] = useState<ScheduleChange | null>(null);

  // Week navigation (View Mode)
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(
    new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 1)).toISOString().split('T')[0] // Monday of current week
  );

  // UI State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isReplicateModalOpen, setIsReplicateModalOpen] = useState(false);
  const [editorContext, setEditorContext] = useState<CreateTimetableContext | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Lecture | undefined>(undefined);
  const [initialDate, setInitialDate] = useState<string | undefined>(undefined);

  // Local state for week scheduling editor
  const [localLectures, setLocalLectures] = useState<Lecture[]>([]);

  // Solve request action handler
  const handleSolveRequest = (req: ScheduleChange) => {
    // 1. Find metadata for this batch from courseHierarchy
    let courseName = course;
    let programName = program;
    let levelName = level;

    for (const c of courseHierarchy) {
      for (const p of c.programs) {
        for (const l of p.levels) {
          if (l.batches.includes(req.batchId)) {
            courseName = c.courseName;
            programName = p.programName;
            levelName = l.levelId;
            break;
          }
        }
      }
    }

    // 2. Determine target lecture date and calculate week start date (Monday)
    const lectureDateStr = req.date || (req.dateTime ? req.dateTime.split(' ')[0] : new Date().toISOString().split('T')[0]);
    const targetDate = parseLocalDate(lectureDateStr);
    const dayOfWeek = targetDate.getDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
    const mondayDate = new Date(targetDate);
    mondayDate.setDate(mondayDate.getDate() + diffToMonday);
    const weekStartStr = formatLocalDate(mondayDate);

    // 3. Find matching target lecture
    let targetLecture = lectures.find(l => req.lectureId && l.id === req.lectureId);
    if (!targetLecture) {
      targetLecture = lectures.find(l => l.batchId === req.batchId && l.date === lectureDateStr && l.subjectId === req.subject);
    }
    if (!targetLecture) {
      targetLecture = lectures.find(l => l.batchId === req.batchId && l.date === lectureDateStr);
    }

    // 4. Set editor context
    const targetBranch = req.branchId || branch || (branches.find(b => b.name === req.branchName)?.code || '');
    setEditorContext({
      branchId: targetBranch,
      courseId: courseName,
      programId: programName,
      levelId: levelName,
      batchId: req.batchId,
      weekStartDate: weekStartStr
    });

    // 5. Track resolving request
    setResolvingRequest(req);

    // 6. Open LectureFormModal
    if (targetLecture) {
      setEditingLecture(targetLecture);
      setInitialDate(undefined);
    } else {
      setEditingLecture(undefined);
      setInitialDate(lectureDateStr);
    }
    setIsFormOpen(true);
  };

  useEffect(() => {
    if (editorContext) {
      if (editorContext.initialLectures && editorContext.initialLectures.length > 0) {
        setLocalLectures(editorContext.initialLectures);
      } else {
        const initialLectures = lectures.filter(l => l.batchId === editorContext.batchId);
        setLocalLectures(initialLectures);
      }
    } else {
      setLocalLectures([]);
    }
  }, [editorContext, lectures]);

  // Derived options
  const availableBatches = useMemo(() => {
    return batches.filter(b => {
      if (branch && b.branch !== branch && b.branch !== (branches.find(br => br.code === branch)?.name || '')) return false;
      return true;
    });
  }, [batches, branch, branches]);

  const uniqueCourses = useMemo(() => courseHierarchy.map(c => c.courseName), []);
  const availablePrograms = useMemo(() => {
    const c = courseHierarchy.find(x => x.courseName === course);
    return c ? c.programs.map(p => p.programName) : [];
  }, [course]);
  const availableLevels = useMemo(() => {
    const c = courseHierarchy.find(x => x.courseName === course);
    const p = c?.programs.find(x => x.programName === program);
    return p ? p.levels : [];
  }, [course, program]);
  const availableBatchNames = useMemo(() => {
    const c = courseHierarchy.find(x => x.courseName === course);
    const p = c?.programs.find(x => x.programName === program);
    const l = p?.levels.find(x => x.levelId === level);
    if (!l) return [];
    return l.batches.filter(batchName => availableBatches.some(b => b.name === batchName));
  }, [course, program, level, availableBatches]);

  // Main View Batch Lectures
  const batchLectures = useMemo(() => {
    return lectures.filter(l => l.batchId === batch);
  }, [lectures, batch]);

  // Teacher / Room Views
  const allTeachers = useMemo(() => Array.from(new Set(lectures.map(l => l.teacherId).filter(Boolean))), [lectures]);
  const teacherLectures = useMemo(() => lectures.filter(l => l.teacherId === selectedTeacher), [lectures, selectedTeacher]);
  const roomLectures = useMemo(() => lectures.filter(l => l.roomId === selectedRoom), [lectures, selectedRoom]);

  if (!currentUser) return null;

  const handleWizardComplete = (context: CreateTimetableContext) => {
    setIsWizardOpen(false);
    setEditorContext(context);
    if (context.initialLectures && context.initialLectures.length > 0) {
      setLocalLectures(context.initialLectures);
    }
  };

  // Apply master default timetable to the current editor week
  const handleUseDefaultTimetable = () => {
    if (!editorContext) return;

    const saved = localStorage.getItem('vs_default_timetables');
    let defaultStore: Record<string, Lecture[]> = {};
    if (saved) {
      try {
        defaultStore = JSON.parse(saved);
      } catch {}
    }

    const batchDefaultLectures = defaultStore[editorContext.batchId];
    if (!batchDefaultLectures || !Array.isArray(batchDefaultLectures) || batchDefaultLectures.length === 0) {
      addToast(`No default timetable found for batch "${editorContext.batchId}". Please configure it in the Default Timetable tab first.`, 'warning');
      return;
    }

    // Calculate target dates for the target week
    const targetMon = parseLocalDate(editorContext.weekStartDate);
    const templateMon = parseLocalDate('2026-01-05');

    const instantiatedLectures: Lecture[] = batchDefaultLectures.map(l => {
      let dayOffset = 0;
      if (l.date) {
        const slotDate = parseLocalDate(l.date);
        dayOffset = Math.round((slotDate.getTime() - templateMon.getTime()) / (1000 * 60 * 60 * 24));
        if (isNaN(dayOffset) || dayOffset < 0 || dayOffset > 6) {
          dayOffset = (slotDate.getDay() === 0 ? 6 : slotDate.getDay() - 1);
        }
      }

      const targetDate = new Date(targetMon);
      targetDate.setDate(targetDate.getDate() + dayOffset);
      const targetDateStr = formatLocalDate(targetDate);

      return {
        ...l,
        id: `TEMP-${Math.floor(10000 + Math.random() * 90000)}`,
        batchId: editorContext.batchId,
        branchId: editorContext.branchId || l.branchId || 'MUM-WEST',
        date: targetDateStr,
        publishStatus: 'DRAFT',
        status: 'SCHEDULED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });

    setLocalLectures(instantiatedLectures);
    addToast(`Default timetable loaded for week of ${new Date(editorContext.weekStartDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}. Click "Publish" to save.`, 'info');
  };

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleExportTimetable = (lecturesForExport: typeof batchLectures, weekStart: string, label: string) => {
    // Filter lectures to only the selected week
    const start = parseLocalDate(weekStart);
    const end = parseLocalDate(weekStart);
    end.setDate(end.getDate() + 6);
    const startStr = formatLocalDate(start);
    const endStr = formatLocalDate(end);

    const weekLectures = lecturesForExport
      .filter(l => l.date >= startStr && l.date <= endStr && l.status !== 'CANCELLED')
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));

    if (weekLectures.length === 0) {
      addToast('No lectures found for this week to export.', 'warning');
      return;
    }

    const headers = ['Day', 'Date', 'Start Time', 'End Time', 'Subject', 'Teacher', 'Room', 'Type', 'Status'];
    const rows = weekLectures.map(l => {
      const d = parseLocalDate(l.date);
      const dayName = DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1];
      return [
        dayName,
        l.date,
        l.startTime,
        l.endTime,
        l.subjectId,
        getTeacherName(l.teacherId),
        l.roomId || 'Unassigned',
        l.lectureType || 'Regular',
        l.publishStatus || 'Published'
      ];
    });

    const weekLabel = `${start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}_to_${end.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;
    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `timetable_${label.replace(/\s+/g, '_')}_${weekLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Timetable exported successfully!', 'success');
  };

  return (
    <div className="space-y-6">

      {/* Editor View */}
      {editorContext ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-100px)]">
          {/* Editor Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50/90 gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditorContext(null);
                  setResolvingRequest(null);
                }}
                className="text-xs font-semibold shadow-2xs border-slate-200 px-2.5 py-1.5"
              >
                <ChevronLeft className="w-4 h-4 mr-0.5 text-slate-500" /> Back
              </Button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 tracking-tight whitespace-nowrap">
                    WEEKLY SCHEDULE
                  </h2>
                  <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md text-xs tracking-tight">
                    {editorContext.batchId}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                  {editorContext.courseId && <><span className="font-medium text-slate-700">{editorContext.courseId}</span><span>•</span></>}
                  {editorContext.programId && <><span className="text-slate-600">{editorContext.programId}</span><span>•</span></>}
                  {editorContext.levelId && <><span className="text-slate-600">{editorContext.levelId}</span><span className="text-slate-300">|</span></>}
                  <span className="font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded text-[11px] flex items-center gap-1">
                    <Calendar size={11} className="text-emerald-600" />
                    Week of {new Date(editorContext.weekStartDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Top Right Action Buttons Group */}
            <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleUseDefaultTimetable}
                className="text-xs font-semibold hover:text-blue-600 hover:border-blue-300 px-3 py-1.5"
              >
                <BookmarkCheck className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> Use Default
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsReplicateModalOpen(true)}
                className="text-xs font-semibold hover:text-blue-600 hover:border-blue-300 px-3 py-1.5"
              >
                <Copy className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> Replicate Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditorContext(null);
                  setResolvingRequest(null);
                }}
                className="text-xs font-medium text-slate-600 px-3 py-1.5"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  await syncLectures(editorContext.batchId, localLectures, 'PUBLISHED', editorContext.weekStartDate);

                  if (resolvingRequest) {
                    const saved = localStorage.getItem('vs_schedule_requests');
                    const allRequests: ScheduleChange[] = saved ? JSON.parse(saved) : (scheduleRequestsData as ScheduleChange[]);
                    const updated = allRequests.map(r => {
                      if (r.id === resolvingRequest.id) {
                        return {
                          ...r,
                          status: 'Approved' as const,
                          updatedAt: new Date().toISOString()
                        };
                      }
                      return r;
                    });
                    localStorage.setItem('vs_schedule_requests', JSON.stringify(updated));
                    setRequestsList(updated);
                    addToast(`Schedule published and Request ${resolvingRequest.id} marked as Approved.`, 'success');
                    setResolvingRequest(null);
                  } else {
                    addToast('Weekly timetable published successfully.', 'success');
                  }
                  setEditorContext(null);
                }}
                className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs px-3.5 py-1.5"
              >
                Publish
              </Button>
            </div>
          </div>

          {/* Banner when solving a teacher request */}
          {resolvingRequest && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 flex items-center justify-between shadow-inner">
              <span className="flex items-center gap-2">
                <Sparkles size={15} className="text-amber-600 flex-shrink-0" />
                <span>
                  <strong>Solving Request ({resolvingRequest.id}):</strong> {resolvingRequest.teacherName || 'Faculty'} requested{' '}
                  <span className="font-semibold uppercase">{resolvingRequest.type.replace('_', ' ')}</span>:{' '}
                  <span className="line-through text-amber-700">{resolvingRequest.previousValue}</span> &rarr;{' '}
                  <strong className="text-amber-950">{resolvingRequest.newValue || 'Updated slot'}</strong>.
                </span>
              </span>
              <span className="text-[11px] text-amber-800 font-semibold bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200">
                Click "Publish" when done to approve request
              </span>
            </div>
          )}

          <div className="flex-1 overflow-auto p-4 bg-slate-50/50">
            <TimetableGrid
              lectures={localLectures}
              viewMode="week"
              onEditLecture={(l) => {
                if (l.id) {
                  setEditingLecture(l);
                  setInitialDate(undefined);
                } else {
                  setEditingLecture(undefined);
                  setInitialDate(l.date);
                }
                setIsFormOpen(true);
              }}
              selectedWeekStart={editorContext.weekStartDate}
            />
          </div>
        </div>
      ) : (
        /* Main View */
        <>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex flex-col gap-6">
              {/* Header Row: Title & Button */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col">
                  <h2 className="text-2xl font-bold text-slate-900">Timetable</h2>
                  <p className="text-sm text-slate-500">Academic timetable management</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Button variant="primary" onClick={() => setIsWizardOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Add New Timetable
                  </Button>
                </div>
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap md:flex-nowrap items-end gap-4 w-full">
                <div className="flex-1 min-w-[140px]">
                  <Select label="Branch" options={[{ value: '', label: 'Select...' }, ...branches.map(b => ({ value: b.code, label: b.name }))]} value={branch} onChange={(e) => updateFilter('branch', e.target.value, ['course', 'program', 'level', 'batch'])} disabled={!!initialBranch} />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <Select label="Course" options={[{ value: '', label: 'Select...' }, ...uniqueCourses.map(c => ({ value: c as string, label: c as string }))]} value={course} onChange={(e) => updateFilter('course', e.target.value, ['program', 'level', 'batch'])} disabled={!branch} />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <Select label="Program" options={[{ value: '', label: 'Select...' }, ...availablePrograms.map(p => ({ value: p as string, label: p as string }))]} value={program} onChange={(e) => updateFilter('program', e.target.value, ['level', 'batch'])} disabled={!course} />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <Select label="Level" options={[{ value: '', label: 'Select...' }, ...availableLevels.map(l => ({ value: l.levelId, label: l.levelName }))]} value={level} onChange={(e) => updateFilter('level', e.target.value, ['batch'])} disabled={!program} />
                </div>
                <div className="flex-1 min-w-[160px]">
                  <Select label="Batch" options={[{ value: '', label: 'Select Batch...' }, ...availableBatchNames.map(b => ({ value: b, label: b }))]} value={batch} onChange={(e) => updateFilter('batch', e.target.value)} disabled={!level} />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 animate-fade-in">
            {/* Tabs */}
            <div className="flex flex-wrap space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
              <button onClick={() => setActiveTab('batch')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'batch' ? 'bg-white text-slate-800 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}>
                <Calendar className="w-4 h-4" /> Batch Weekly
              </button>
              <button onClick={() => setActiveTab('teacher')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'teacher' ? 'bg-white text-slate-800 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}>
                <User className="w-4 h-4" /> Teacher View
              </button>
              <button onClick={() => setActiveTab('room')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'room' ? 'bg-white text-slate-800 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}>
                <MapPin className="w-4 h-4" /> Room View
              </button>
              <button onClick={() => setActiveTab('requests')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'requests' ? 'bg-white text-slate-800 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}>
                <MessageSquare className="w-4 h-4" />
                <span>Teacher Requests</span>
                {pendingRequestsCount > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full ml-0.5">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
              <button onClick={() => setActiveTab('default')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'default' ? 'bg-white text-slate-800 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}>
                <BookmarkCheck className="w-4 h-4" />
                <span>Default Timetable</span>
              </button>
            </div>

            {/* TAB 1: BATCH WEEKLY */}
            {activeTab === 'batch' && (
              batch ? (
                <>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div className="flex items-center gap-4">
                      <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wide">Current Week Schedule</h3>
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1">
                        <Button variant="ghost" size="sm" className="px-2 py-1 hover:bg-white" onClick={() => {
                          const d = parseLocalDate(selectedWeekStart); d.setDate(d.getDate() - 7); setSelectedWeekStart(formatLocalDate(d));
                        }}><ChevronLeft className="w-4 h-4" /></Button>
                        <span className="text-sm font-semibold text-slate-700 min-w-[120px] text-center">
                          {parseLocalDate(selectedWeekStart).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – {(() => {
                            const d = parseLocalDate(selectedWeekStart);
                            d.setDate(d.getDate() + 6);
                            return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
                          })()}
                        </span>
                        <Button variant="ghost" size="sm" className="px-2 py-1 hover:bg-white" onClick={() => {
                          const d = parseLocalDate(selectedWeekStart); d.setDate(d.getDate() + 7); setSelectedWeekStart(formatLocalDate(d));
                        }}><ChevronRight className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" onClick={() => handleExportTimetable(batchLectures, selectedWeekStart, batch || 'batch')} className="cursor-pointer">
                        <Download className="w-4 h-4 mr-2" /> Export
                      </Button>
                      <Button variant="primary" onClick={() => {
                        setEditorContext({
                          branchId: branch, courseId: course, programId: program, levelId: level, batchId: batch,
                          weekStartDate: selectedWeekStart
                        });
                      }}>
                        <Edit className="w-4 h-4 mr-2" /> Edit
                      </Button>
                    </div>
                  </div>

                  <TimetableGrid
                    lectures={batchLectures}
                    viewMode="week"
                    onEditLecture={(l) => {
                      if (l.id) {
                        setEditingLecture(l);
                        setInitialDate(undefined);
                      } else {
                        setEditingLecture(undefined);
                        setInitialDate(l.date);
                      }
                      setIsFormOpen(true);
                    }}
                    selectedWeekStart={selectedWeekStart}
                    readOnly={false}
                  />
                </>
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-16 text-center">
                  <Calendar className="mx-auto text-slate-300 mb-3" size={36} />
                  <p className="text-slate-700 font-semibold">Please select a Batch to view its timetable.</p>
                  <p className="text-xs text-slate-400 mt-1">Use the dropdown filters above to select Course, Program, Level, and Batch.</p>
                </div>
              )
            )}

            {/* TAB 2: TEACHER VIEW */}
            {activeTab === 'teacher' && (
              <div className="space-y-6">
                {/* Week Navigator */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wide">Teacher Weekly Schedule</h3>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1">
                      <Button variant="ghost" size="sm" className="px-2 py-1 hover:bg-white" onClick={() => {
                        const d = parseLocalDate(selectedWeekStart); d.setDate(d.getDate() - 7); setSelectedWeekStart(formatLocalDate(d));
                      }}><ChevronLeft className="w-4 h-4" /></Button>
                      <span className="text-sm font-semibold text-slate-700 min-w-[120px] text-center">
                        {parseLocalDate(selectedWeekStart).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – {(() => {
                          const d = parseLocalDate(selectedWeekStart);
                          d.setDate(d.getDate() + 6);
                          return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
                        })()}
                      </span>
                      <Button variant="ghost" size="sm" className="px-2 py-1 hover:bg-white" onClick={() => {
                        const d = parseLocalDate(selectedWeekStart); d.setDate(d.getDate() + 7); setSelectedWeekStart(formatLocalDate(d));
                      }}><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  {selectedTeacher && (
                    <Button variant="secondary" onClick={() => handleExportTimetable(teacherLectures, selectedWeekStart, getTeacherName(selectedTeacher))} className="cursor-pointer">
                      <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                  )}
                </div>

                {/* Dropdown Filter */}
                <div className="max-w-xs">
                   <Select label="Select Teacher" options={[{ value: '', label: 'Select Teacher...' }, ...allTeachers.map(t => ({ value: t as string, label: getTeacherName(t as string) }))]} value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} />
                </div>
                  {selectedTeacher ? (
                      <TimetableGrid
                        lectures={teacherLectures}
                        viewMode="week"
                        onEditLecture={() => { }} 
                        selectedWeekStart={selectedWeekStart}
                        readOnly={true}
                      />
                 ) : (
                   <div className="p-10 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed">Select a teacher to view their schedule.</div>
                 )}
              </div>
            )}

            {/* TAB 3: ROOM VIEW */}
            {activeTab === 'room' && (
              <div className="space-y-6">
                {/* Week Navigator */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wide">Room Weekly Schedule</h3>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1">
                      <Button variant="ghost" size="sm" className="px-2 py-1 hover:bg-white" onClick={() => {
                        const d = parseLocalDate(selectedWeekStart); d.setDate(d.getDate() - 7); setSelectedWeekStart(formatLocalDate(d));
                      }}><ChevronLeft className="w-4 h-4" /></Button>
                      <span className="text-sm font-semibold text-slate-700 min-w-[120px] text-center">
                        {parseLocalDate(selectedWeekStart).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – {(() => {
                          const d = parseLocalDate(selectedWeekStart);
                          d.setDate(d.getDate() + 6);
                          return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
                        })()}
                      </span>
                      <Button variant="ghost" size="sm" className="px-2 py-1 hover:bg-white" onClick={() => {
                        const d = parseLocalDate(selectedWeekStart); d.setDate(d.getDate() + 7); setSelectedWeekStart(formatLocalDate(d));
                      }}><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  {selectedRoom && (
                    <Button variant="secondary" onClick={() => handleExportTimetable(roomLectures, selectedWeekStart, selectedRoom)} className="cursor-pointer">
                      <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                  )}
                </div>

                {/* Dropdown Filter */}
                <div className="max-w-xs">
                   <Select label="Select Room" options={[{ value: '', label: 'Select Room...' }, ...rooms.map(r => ({ value: r.id, label: r.name }))]} value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)} />
                </div>
                  {selectedRoom ? (
                      <TimetableGrid
                        lectures={roomLectures}
                        viewMode="week"
                        onEditLecture={() => { }} 
                        selectedWeekStart={selectedWeekStart}
                        readOnly={true}
                      />
                 ) : (
                   <div className="p-10 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed">Select a room to view its schedule.</div>
                 )}
              </div>
            )}

            {/* TAB 4: TEACHER REQUESTS */}
            {activeTab === 'requests' && (
              <TeacherRequestsTab
                onSolveRequest={handleSolveRequest}
                currentBatch={batch}
                currentBranch={branch}
              />
            )}

            {/* TAB 5: DEFAULT TIMETABLE */}
            {activeTab === 'default' && (
              <DefaultTimetableTab
                currentBatch={batch}
                currentBranch={branch}
                course={course}
                program={program}
                level={level}
                availableBatches={availableBatchNames}
                onSelectBatch={(b) => updateFilter('batch', b)}
              />
            )}

          </div>
        </>
      )}

      {/* Shared Modals */}
      <CreateTimetableWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onComplete={handleWizardComplete}
        initialContext={{ branchId: branch, courseId: course, programId: program, levelId: level, batchId: batch, weekStartDate: selectedWeekStart }}
      />

      <ReplicateWeekModal
        isOpen={isReplicateModalOpen}
        onClose={() => setIsReplicateModalOpen(false)}
        batchId={editorContext ? editorContext.batchId : batch}
        branchId={editorContext ? editorContext.branchId : branch}
        targetWeekStart={editorContext ? editorContext.weekStartDate : selectedWeekStart}
        onReplicate={(replicatedLectures) => {
          const targetBatch = editorContext ? editorContext.batchId : batch;
          const targetBranch = editorContext ? editorContext.branchId : branch;
          const targetWeek = editorContext ? editorContext.weekStartDate : selectedWeekStart;
          
          setEditorContext({
            branchId: targetBranch,
            courseId: course,
            programId: program,
            levelId: level,
            batchId: targetBatch,
            weekStartDate: targetWeek,
            initialLectures: replicatedLectures
          });
          setLocalLectures(replicatedLectures);
        }}
      />

      {isFormOpen && (
        <LectureFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          branchId={editorContext ? editorContext.branchId : branch}
          batchId={editorContext ? editorContext.batchId : batch}
          existingLecture={editingLecture}
          initialDate={initialDate}
          onSave={(lectureData) => {
            if (editorContext) {
              if (lectureData.id) {
                setLocalLectures(prev => prev.map(l => l.id === lectureData.id ? { ...l, ...lectureData } as Lecture : l));
              } else {
                const tempId = `TEMP-${Math.floor(10000 + Math.random() * 90000)}`;
                setLocalLectures(prev => [...prev, { ...lectureData, id: tempId } as Lecture]);
              }
            } else {
              if (lectureData.id) {
                updateLecture(lectureData.id, lectureData);
                addToast('Lecture updated successfully.', 'success');
              } else {
                addLectures([{
                  ...lectureData,
                  batchId: batch,
                  branchId: branch || 'MUM-WEST',
                  publishStatus: 'PUBLISHED',
                  status: 'SCHEDULED'
                } as any]);
                addToast('Lecture scheduled successfully.', 'success');
              }
              setIsFormOpen(false);
            }
          }}
          onDelete={(id) => {
            if (editorContext) {
              setLocalLectures(prev => prev.filter(l => l.id !== id));
            } else {
              cancelLecture(id);
              addToast('Lecture slot cancelled and removed.', 'info');
              setIsFormOpen(false);
            }
          }}
        />
      )}
    </div>
  );
};


