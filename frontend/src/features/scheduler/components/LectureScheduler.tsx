import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import { useScheduler } from '../context/SchedulerContext';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { Plus, Edit, ChevronLeft, ChevronRight, Calendar, User, MapPin, Copy, Sparkles, MessageSquare, BookmarkCheck, Download } from 'lucide-react';
import teachersList from '../../../data/teachers.json';
import { TimetableGrid } from './TimetableGrid';
import { LectureFormModal } from './LectureFormModal';
import { CreateTimetableWizard } from './CreateTimetableWizard';
import { TeacherRequestsTab } from './TeacherRequestsTab';
import { DefaultTimetableTab } from './DefaultTimetableTab';
import type { CreateTimetableContext } from './CreateTimetableWizard';
import type { Lecture } from '../types/scheduler';
import { lectureRequestApi } from '../../../services/lectureRequestApi';
import { branchApi } from '../../../services/branchApi';

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
  const { lectures, rooms, options, fetchWeeklyLectures, syncLectures, addLectures, updateLecture, cancelLecture } = useScheduler();

  const [searchParams, setSearchParams] = useSearchParams();

  // Filters State (derived from URL Search Params)
  const isBranchAdmin = currentUser?.role === 'branch-admin' || currentUser?.role === 'branch_admin';
  const assignedBranch = options?.branch || (currentUser?.branch ? branches.find(b => b.name === currentUser.branch || b.code === currentUser.branch) : null);
  const initialBranch = assignedBranch ? (assignedBranch.code || assignedBranch.name) : '';
  const branch = isBranchAdmin ? (assignedBranch?.code || assignedBranch?.name || searchParams.get('branch') || '') : (searchParams.get('branch') || initialBranch || '');
  const course = searchParams.get('course') || '';
  const program = searchParams.get('program') || '';
  const level = searchParams.get('level') || '';
  const batch = searchParams.get('batch') || '';

  // Auto set branch in query params if branch admin
  useEffect(() => {
    if (isBranchAdmin && assignedBranch && searchParams.get('branch') !== (assignedBranch.code || assignedBranch.name)) {
      updateFilter('branch', assignedBranch.code || assignedBranch.name);
    }
  }, [isBranchAdmin, assignedBranch]);

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

  // Requests state via API
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const fetchPendingCount = async () => {
    try {
      const counts = await lectureRequestApi.getStatusCounts();
      setPendingRequestsCount(counts.pending || 0);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    fetchPendingCount();
  }, []);

  // Week navigation (View Mode)
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(
    new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 1)).toISOString().split('T')[0] // Monday of current week
  );

  // UI State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editorContext, setEditorContext] = useState<CreateTimetableContext | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Lecture | undefined>(undefined);
  const [initialDate, setInitialDate] = useState<string | undefined>(undefined);

  // Local state for week scheduling editor
  const [localLectures, setLocalLectures] = useState<Lecture[]>([]);

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

  // Load branch-assigned courses directly from branchApi
  const [branchAssignedCourses, setBranchAssignedCourses] = useState<any[]>([]);

  // Resolve selected Branch Object
  const selectedBranchObj = useMemo(() => {
    if (!options) return null;
    const branchList = options.branches || branches;
    return branchList.find(b => b.code === branch || b.name === branch || String(b.id) === branch) || null;
  }, [options, branches, branch]);

  useEffect(() => {
    const branchIdToFetch = selectedBranchObj?.id || assignedBranch?.id;
    if (!branchIdToFetch) {
      setBranchAssignedCourses([]);
      return;
    }
    branchApi.getCourses(branchIdToFetch, { assignment_status: 'assigned' })
      .then(res => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        setBranchAssignedCourses(Array.isArray(list) ? list : []);
      })
      .catch(err => {
        console.error('Failed to fetch assigned courses for branch in LectureScheduler:', err);
        setBranchAssignedCourses([]);
      });
  }, [selectedBranchObj?.id, assignedBranch?.id]);

  // Derived available courses (strictly assigned to branch when branch is selected)
  const availableCourseList = useMemo(() => {
    if (branchAssignedCourses && branchAssignedCourses.length > 0) {
      return branchAssignedCourses.map((c: any) => ({
        id: Number(c.id),
        name: c.name,
        code: c.code || '',
        assigned_programs: c.assigned_programs || c.programs || [],
        programs: c.programs || []
      }));
    }
    if (!options?.courses || options.courses.length === 0) return [];
    if (!selectedBranchObj) return options.courses;

    return options.courses;
  }, [branchAssignedCourses, options, selectedBranchObj]);

  const uniqueCourses = useMemo(() => {
    return availableCourseList.map(c => c.name);
  }, [availableCourseList]);

  // Resolve selected Course Object
  const selectedCourseObj = useMemo(() => {
    if (!course || !availableCourseList.length) return null;
    return availableCourseList.find(c => c.name === course || String(c.id) === String(course) || c.code === course) || null;
  }, [availableCourseList, course]);

  // Derived available programs strictly under selected Course
  const availableProgramList = useMemo(() => {
    if (!selectedCourseObj) return [];
    if (selectedCourseObj.assigned_programs && selectedCourseObj.assigned_programs.length > 0) {
      return selectedCourseObj.assigned_programs;
    }
    if (selectedCourseObj.programs && selectedCourseObj.programs.length > 0) {
      return selectedCourseObj.programs.filter((p: any) => p.is_assigned !== false && p.assigned !== false);
    }
    if (options?.programs) {
      return options.programs.filter(p => Number(p.course_id) === Number(selectedCourseObj.id));
    }
    return [];
  }, [selectedCourseObj, options]);

  const availablePrograms = useMemo(() => {
    return Array.from(new Set(availableProgramList.map((p: any) => p.name)));
  }, [availableProgramList]);

  // Resolve selected Program Object
  const selectedProgramObj = useMemo(() => {
    if (!program || !availableProgramList.length) return null;
    return availableProgramList.find((p: any) => p.name === program || String(p.id) === String(program) || p.code === program) || null;
  }, [availableProgramList, program]);

  // Derived available levels strictly under selected Program
  const availableLevelList = useMemo(() => {
    if (!options?.levels || !selectedProgramObj) return [];
    return options.levels.filter(l => Number(l.program_id) === Number(selectedProgramObj.id) || (selectedCourseObj && Number(l.course_id) === Number(selectedCourseObj.id)));
  }, [options, selectedProgramObj, selectedCourseObj]);

  const availableLevels = useMemo(() => {
    return availableLevelList.map(l => ({ levelId: l.name, levelName: l.name, id: l.id }));
  }, [availableLevelList]);

  // Resolve selected Level Object
  const selectedLevelObj = useMemo(() => {
    if (!level || !availableLevelList.length) return null;
    return availableLevelList.find(l => l.name === level || String(l.id) === String(level) || l.code === level) || null;
  }, [availableLevelList, level]);

  // Derived available batches strictly under selected Level (and selected Branch if set)
  const availableBatchList = useMemo(() => {
    if (!options?.batches || !selectedLevelObj) return [];
    return options.batches.filter(b => {
      const matchLevel = Number(b.level_id || (b as any).levelId) === Number(selectedLevelObj.id);
      const matchBranch = !selectedBranchObj || Number(b.branch_id || (b as any).branchId) === Number(selectedBranchObj.id);
      return matchLevel && matchBranch;
    });
  }, [options, selectedLevelObj, selectedBranchObj]);

  const availableBatchNames = useMemo(() => {
    return availableBatchList.map(b => b.name);
  }, [availableBatchList]);

  // Resolve selected Batch Object
  const resolvedBatchObj = useMemo(() => {
    if (!batch) return null;
    if (availableBatchList.length > 0) {
      const found = availableBatchList.find(b => String(b.id) === batch || b.name === batch || b.code === batch);
      if (found) return found;
    }
    return options?.batches?.find(b => String(b.id) === batch || b.name === batch || b.code === batch) || null;
  }, [batch, availableBatchList, options]);

  // Load weekly lectures from API whenever filters, activeTab, or selectedWeekStart change
  useEffect(() => {
    const endD = parseLocalDate(selectedWeekStart);
    endD.setDate(endD.getDate() + 6);
    const selectedWeekEnd = formatLocalDate(endD);

    const resolvedBatchId = resolvedBatchObj?.id || (batch && !isNaN(Number(batch)) ? Number(batch) : undefined);
    const resolvedBranchId = resolvedBatchObj?.branch_id || selectedBranchObj?.id || (branch ? (options?.branches?.find(b => b.code === branch || b.name === branch)?.id || branch) : undefined);

    if (activeTab === 'batch') {
      fetchWeeklyLectures({
        branchId: resolvedBranchId,
        batchId: resolvedBatchId,
        startDate: selectedWeekStart,
        endDate: selectedWeekEnd
      });
    } else if (activeTab === 'teacher') {
      fetchWeeklyLectures({
        branchId: resolvedBranchId,
        teacherId: selectedTeacher || undefined,
        startDate: selectedWeekStart,
        endDate: selectedWeekEnd
      });
    } else if (activeTab === 'room') {
      fetchWeeklyLectures({
        branchId: resolvedBranchId,
        roomId: selectedRoom || undefined,
        startDate: selectedWeekStart,
        endDate: selectedWeekEnd
      });
    }
  }, [activeTab, branch, batch, selectedTeacher, selectedRoom, selectedWeekStart, fetchWeeklyLectures, options, resolvedBatchObj, selectedBranchObj]);

  // Main View Batch Lectures
  const batchLectures = useMemo(() => {
    if (!batch) return [];
    const targetBatchId = resolvedBatchObj?.id;
    return lectures.filter(l => 
      String(l.batchId) === String(batch) || 
      (targetBatchId !== undefined && String(l.batchId) === String(targetBatchId)) ||
      (l.batchName && (l.batchName === batch || l.batchCode === batch))
    );
  }, [lectures, batch, resolvedBatchObj]);

  // Teacher / Room Views
  const allTeachers = useMemo(() => {
    if (options?.teachers && options.teachers.length > 0) {
      return options.teachers.map(t => ({
        id: String(t.id),
        name: t.full_name || t.name || `Teacher #${t.id}`
      }));
    }
    return teachersList.map(t => ({ id: t.id, name: t.name }));
  }, [options]);

  const resolveTeacherName = (id?: string | number) => {
    if (!id) return '';
    if (options?.teachers) {
      const found = options.teachers.find(t => String(t.id) === String(id) || t.name === id);
      if (found) return found.full_name || found.name;
    }
    const staticTeacher = teachersList.find(t => t.id === String(id) || t.name === String(id));
    if (staticTeacher) return staticTeacher.name;
    return `Teacher #${id}`;
  };

  const teacherLectures = useMemo(() => {
    if (!selectedTeacher) return lectures;
    return lectures.filter(l => String(l.teacherId) === String(selectedTeacher));
  }, [lectures, selectedTeacher]);

  const roomLectures = useMemo(() => {
    if (!selectedRoom) return lectures;
    return lectures.filter(l => String(l.roomId) === String(selectedRoom));
  }, [lectures, selectedRoom]);

  if (!currentUser) return null;

  const handleWizardComplete = (context: CreateTimetableContext) => {
    setIsWizardOpen(false);
    setEditorContext(context);
    if (context.initialLectures && context.initialLectures.length > 0) {
      setLocalLectures(context.initialLectures);
    }
  };

  // Apply master default timetable to the current editor week
  const handleUseDefaultTimetable = async () => {
    if (!editorContext) return;

    const resolvedBatchId = options?.batches?.find(b => String(b.id) === editorContext.batchId || b.name === editorContext.batchId || b.code === editorContext.batchId)?.id || editorContext.batchId;

    try {
      const { timetableApi } = await import('../../../services/timetableApi');
      const defaultSlots = await timetableApi.getDefaultTimetable(resolvedBatchId);
      
      if (!defaultSlots || defaultSlots.length === 0) {
        addToast(`No default timetable found for batch "${editorContext.batchId}". Please configure it in the Default Timetable tab first.`, 'warning');
        return;
      }

      // Calculate target dates for the target week
      const targetMon = parseLocalDate(editorContext.weekStartDate);

      const instantiatedLectures: Lecture[] = defaultSlots.map(slot => {
        const dayOffset = Math.max(0, Math.min(6, (slot.dayOfWeek || 1) - 1));
        const targetDate = new Date(targetMon);
        targetDate.setDate(targetDate.getDate() + dayOffset);
        const targetDateStr = formatLocalDate(targetDate);

        return {
          id: `TEMP-${Math.floor(10000 + Math.random() * 90000)}`,
          batchId: editorContext.batchId,
          branchId: editorContext.branchId || '1',
          subjectId: String(slot.subjectId),
          subjectName: slot.subjectName,
          teacherId: String(slot.teacherId),
          teacherName: slot.teacherName,
          roomId: slot.roomId ? String(slot.roomId) : '',
          roomName: slot.roomName,
          roomNumber: slot.roomNumber,
          date: targetDateStr,
          startTime: slot.startTime,
          endTime: slot.endTime,
          lectureType: slot.lectureType || 'Regular',
          activityType: (slot.activityType || 'Lecture') as any,
          slotLabel: slot.slotLabel,
          publishStatus: 'DRAFT',
          status: 'SCHEDULED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      });

      setLocalLectures(instantiatedLectures);
      addToast(`Default timetable loaded for week of ${new Date(editorContext.weekStartDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}. Click "Publish" to save.`, 'info');
    } catch (err) {
      console.error('Failed to load default timetable:', err);
      addToast('Failed to load default timetable from server.', 'error');
    }
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
                onClick={() => {
                  setEditorContext(null);
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
                  addToast('Weekly timetable published successfully.', 'success');
                  setEditorContext(null);
                }}
                className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs px-3.5 py-1.5"
              >
                Publish
              </Button>
            </div>
          </div>

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
                  <Select 
                    label="Branch" 
                    options={
                      isBranchAdmin && assignedBranch
                        ? [{ value: assignedBranch.code || assignedBranch.name, label: assignedBranch.name }]
                        : [{ value: '', label: 'Select...' }, ...(options?.branches || branches).map(b => ({ value: b.code || b.name, label: b.name }))]
                    } 
                    value={branch} 
                    onChange={(e) => updateFilter('branch', e.target.value, ['course', 'program', 'level', 'batch'])} 
                    disabled={isBranchAdmin} 
                  />
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
                    <Button variant="secondary" onClick={() => handleExportTimetable(teacherLectures, selectedWeekStart, resolveTeacherName(selectedTeacher))} className="cursor-pointer">
                      <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                  )}
                </div>

                {/* Dropdown Filter */}
                <div className="max-w-xs">
                   <Select label="Select Teacher" options={[{ value: '', label: 'Select Teacher...' }, ...allTeachers.map(t => ({ value: t.id, label: t.name }))]} value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} />
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
                currentBranch={branch}
                onRequestUpdated={fetchPendingCount}
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
                onSaved={() => {
                  const endD = parseLocalDate(selectedWeekStart);
                  endD.setDate(endD.getDate() + 6);
                  const selectedWeekEnd = formatLocalDate(endD);
                  const resolvedBatchObj = options?.batches?.find(b => String(b.id) === batch || b.name === batch || b.code === batch);
                  const resolvedBatchId = resolvedBatchObj?.id || (batch && !isNaN(Number(batch)) ? Number(batch) : undefined);
                  const resolvedBranchId = resolvedBatchObj?.branch_id || (branch ? (options?.branches?.find(b => b.code === branch || b.name === branch)?.id || branch) : undefined);
                  fetchWeeklyLectures({
                    branchId: resolvedBranchId,
                    batchId: resolvedBatchId,
                    startDate: selectedWeekStart,
                    endDate: selectedWeekEnd
                  });
                }}
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

      {isFormOpen && (
        <LectureFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          branchId={editorContext ? editorContext.branchId : branch}
          batchId={editorContext ? editorContext.batchId : batch}
          existingLecture={editingLecture}
          initialDate={initialDate}
          onSave={async (lectureData) => {
            if (editorContext) {
              if (lectureData.id) {
                setLocalLectures(prev => prev.map(l => l.id === lectureData.id ? { ...l, ...lectureData } as Lecture : l));
              } else {
                const tempId = `TEMP-${Math.floor(10000 + Math.random() * 90000)}`;
                setLocalLectures(prev => [...prev, { ...lectureData, id: tempId } as Lecture]);
              }
            } else {
              try {
                const actualBatchId = resolvedBatchObj?.id || (lectureData.batchId && !isNaN(Number(lectureData.batchId)) ? Number(lectureData.batchId) : lectureData.batchId) || batch;
                const actualBranchId = resolvedBatchObj?.branch_id || selectedBranchObj?.id || assignedBranch?.id || 1;
                const actualAcademicYearId = resolvedBatchObj?.academic_year_id || 1;

                if (lectureData.id) {
                  await updateLecture(lectureData.id, {
                    ...lectureData,
                    batchId: actualBatchId,
                    branchId: actualBranchId,
                    academicYearId: actualAcademicYearId
                  });
                  addToast('Lecture updated successfully.', 'success');
                } else {
                  await addLectures([{
                    ...lectureData,
                    batchId: actualBatchId,
                    branchId: actualBranchId,
                    academicYearId: actualAcademicYearId,
                    publishStatus: 'PUBLISHED',
                    status: 'SCHEDULED'
                  } as any]);
                  addToast('Lecture scheduled successfully.', 'success');
                }
                setIsFormOpen(false);
              } catch (err: any) {
                const msg = err?.response?.data?.message || err?.message || 'Failed to save lecture';
                addToast(msg, 'error');
              }
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


