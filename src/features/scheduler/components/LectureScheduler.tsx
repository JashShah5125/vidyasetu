import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import { useScheduler } from '../context/SchedulerContext';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { Plus, Edit, ChevronLeft, ChevronRight, Calendar, User, MapPin, Copy, Sparkles, MessageSquare, BookmarkCheck } from 'lucide-react';
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
  const { lectures, rooms, syncLectures } = useScheduler();

  const [searchParams, setSearchParams] = useSearchParams();

  // Filters State (derived from URL Search Params)
  const initialBranch = currentUser?.role === 'branch-admin' ? currentUser.branch : '';
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

  return (
    <div className="space-y-6">

      {/* Editor View */}
      {editorContext ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-100px)]">
          {/* Editor Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Button variant="outline" size="sm" onClick={() => {
                  setEditorContext(null);
                  setResolvingRequest(null);
                }}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <h2 className="text-xl font-bold text-slate-800">
                  WEEKLY SCHEDULE
                </h2>
              </div>
              <div className="text-sm text-slate-500 flex items-center gap-2">
                <span className="font-semibold text-slate-700">{editorContext.courseId}</span> •
                <span>{editorContext.programId}</span> •
                <span>{editorContext.levelId}</span> •
                <span className="font-semibold text-blue-600">{editorContext.batchId}</span>
                <span className="mx-2">|</span>
                <span className="font-semibold text-emerald-600">
                  Week of {new Date(editorContext.weekStartDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setIsReplicateModalOpen(true)}>
                <Copy className="w-4 h-4 mr-1.5 text-blue-600" /> Replicate Previous Week
              </Button>
              <Button variant="outline" onClick={() => {
                setEditorContext(null);
                setResolvingRequest(null);
              }}>Cancel</Button>
              <Button variant="primary" onClick={async () => {
                await syncLectures(editorContext.batchId, localLectures, 'PUBLISHED');

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
              }}>Publish</Button>
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
                            d.setDate(d.getDate() + 5);
                            return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
                          })()}
                        </span>
                        <Button variant="ghost" size="sm" className="px-2 py-1 hover:bg-white" onClick={() => {
                          const d = parseLocalDate(selectedWeekStart); d.setDate(d.getDate() + 7); setSelectedWeekStart(formatLocalDate(d));
                        }}><ChevronRight className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                    onEditLecture={() => { }} // Disabled in view mode
                    selectedWeekStart={selectedWeekStart}
                    readOnly={true}
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
                          d.setDate(d.getDate() + 5);
                          return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
                        })()}
                      </span>
                      <Button variant="ghost" size="sm" className="px-2 py-1 hover:bg-white" onClick={() => {
                        const d = parseLocalDate(selectedWeekStart); d.setDate(d.getDate() + 7); setSelectedWeekStart(formatLocalDate(d));
                      }}><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                  </div>
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
                          d.setDate(d.getDate() + 5);
                          return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
                        })()}
                      </span>
                      <Button variant="ghost" size="sm" className="px-2 py-1 hover:bg-white" onClick={() => {
                        const d = parseLocalDate(selectedWeekStart); d.setDate(d.getDate() + 7); setSelectedWeekStart(formatLocalDate(d));
                      }}><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                  </div>
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
            }
          }}
          onDelete={(id) => {
            if (editorContext) {
              setLocalLectures(prev => prev.filter(l => l.id !== id));
            }
          }}
        />
      )}
    </div>
  );
};


