import React, { useState, useMemo, useEffect } from 'react';
import courseHierarchy from '../../../data/courseHierarchy.json';
import { useApp } from '../../../context/AppContext';
import { useScheduler } from '../context/SchedulerContext';
import { timetableApi, type DefaultTimetableSlot } from '../../../services/timetableApi';
import { branchApi } from '../../../services/branchApi';
import { Modal } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { TimetableGrid } from './TimetableGrid';
import { PlusCircle, BookmarkCheck } from 'lucide-react';
import type { Lecture } from '../types/scheduler';

export interface CreateTimetableContext {
  branchId: string;
  courseId: string;
  programId: string;
  levelId: string;
  batchId: string;
  weekStartDate: string;
  initialLectures?: Lecture[];
}

interface CreateTimetableWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (context: CreateTimetableContext) => void;
  initialContext?: Partial<CreateTimetableContext>;
}

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

const getMondayOfWeek = (dateStr: string): string => {
  const d = parseLocalDate(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return formatLocalDate(d);
};

export const CreateTimetableWizard: React.FC<CreateTimetableWizardProps> = ({
  isOpen, onClose, onComplete, initialContext
}) => {
  const { currentUser, branches, batches } = useApp();
  const { lectures, options } = useScheduler();

  const [step, setStep] = useState(1);
  
  // Step 1 State
  const [branchId, setBranchId] = useState(initialContext?.branchId || currentUser?.branch || '');
  const [courseId, setCourseId] = useState(initialContext?.courseId || '');
  const [programId, setProgramId] = useState(initialContext?.programId || '');
  const [levelId, setLevelId] = useState(initialContext?.levelId || '');
  const [batchId, setBatchId] = useState(initialContext?.batchId || '');

  // Step 2 State
  const [weekStartDate, setWeekStartDate] = useState(
    initialContext?.weekStartDate ||
    new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 1)).toISOString().split('T')[0] // Monday of current week
  );
  const [creationMode, setCreationMode] = useState<'BLANK' | 'DEFAULT'>('DEFAULT');
  const [defaultSlots, setDefaultSlots] = useState<DefaultTimetableSlot[]>([]);
  
  // Load branch-assigned courses directly from branchApi
  const [branchAssignedCourses, setBranchAssignedCourses] = useState<any[]>([]);

  // Derived Options
  const selectedBranchObj = useMemo(() => {
    if (!options) return null;
    const branchList = options.branches || branches;
    return branchList.find(b => b.code === branchId || b.name === branchId || String(b.id) === branchId) || null;
  }, [options, branches, branchId]);

  useEffect(() => {
    const branchIdToFetch = selectedBranchObj?.id || (currentUser?.branch ? branches.find(b => b.name === currentUser.branch || b.code === currentUser.branch)?.id : null);
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
        console.error('Failed to fetch assigned courses for branch in CreateTimetableWizard:', err);
        setBranchAssignedCourses([]);
      });
  }, [selectedBranchObj?.id, currentUser?.branch, branches]);

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
    if (availableCourseList.length > 0) {
      return availableCourseList.map(c => c.name);
    }
    return courseHierarchy.map(c => c.courseName);
  }, [availableCourseList]);

  const selectedCourseObj = useMemo(() => {
    if (!courseId || !availableCourseList.length) return null;
    return availableCourseList.find(c => c.name === courseId || String(c.id) === String(courseId) || c.code === courseId) || null;
  }, [availableCourseList, courseId]);

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
    if (availableProgramList.length > 0) {
      return Array.from(new Set(availableProgramList.map((p: any) => p.name)));
    }
    const course = courseHierarchy.find(c => c.courseName === courseId);
    return course ? course.programs.map(p => p.programName) : [];
  }, [availableProgramList, courseId]);

  const selectedProgramObj = useMemo(() => {
    if (!programId || !availableProgramList.length) return null;
    return availableProgramList.find((p: any) => p.name === programId || String(p.id) === String(programId) || p.code === programId) || null;
  }, [availableProgramList, programId]);

  const availableLevelList = useMemo(() => {
    if (!options?.levels || !selectedProgramObj) return [];
    return options.levels.filter(l => Number(l.program_id) === Number(selectedProgramObj.id) || (selectedCourseObj && Number(l.course_id) === Number(selectedCourseObj.id)));
  }, [options, selectedProgramObj, selectedCourseObj]);

  const availableLevels = useMemo(() => {
    if (availableLevelList.length > 0) {
      return availableLevelList.map(l => ({ levelId: l.name, levelName: l.name, id: l.id }));
    }
    const course = courseHierarchy.find(c => c.courseName === courseId);
    const program = course?.programs.find(p => p.programName === programId);
    return program ? program.levels : [];
  }, [availableLevelList, courseId, programId]);

  const selectedLevelObj = useMemo(() => {
    if (!levelId || !availableLevelList.length) return null;
    return availableLevelList.find(l => l.name === levelId || String(l.id) === String(levelId) || l.code === levelId) || null;
  }, [availableLevelList, levelId]);

  const availableBatchList = useMemo(() => {
    if (!options?.batches || !selectedLevelObj) return [];
    return options.batches.filter(b => {
      const matchLevel = Number(b.level_id || (b as any).levelId) === Number(selectedLevelObj.id);
      const matchBranch = !selectedBranchObj || Number(b.branch_id || (b as any).branchId) === Number(selectedBranchObj.id);
      return matchLevel && matchBranch;
    });
  }, [options, selectedLevelObj, selectedBranchObj]);

  const availableBatchNames = useMemo(() => {
    if (availableBatchList.length > 0) {
      return availableBatchList.map(b => b.name);
    }
    const course = courseHierarchy.find(c => c.courseName === courseId);
    const program = course?.programs.find(p => p.programName === programId);
    const level = program?.levels.find(l => l.levelId === levelId);
    return level ? level.batches.map(b => b.name) : [];
  }, [availableBatchList, courseId, programId, levelId]);

  // Resolve numerical batchId
  const resolvedBatchId = useMemo(() => {
    if (!batchId) return '';
    const match = availableBatchList.find(b => String(b.id) === batchId || b.name === batchId || b.code === batchId)
      || options?.batches?.find(b => String(b.id) === batchId || b.name === batchId || b.code === batchId);
    return match?.id ? String(match.id) : batchId;
  }, [batchId, availableBatchList, options]);

  // Load default template from backend API
  useEffect(() => {
    if (!resolvedBatchId || !isOpen) {
      setDefaultSlots([]);
      return;
    }
    timetableApi.getDefaultTimetable(resolvedBatchId)
      .then(slots => setDefaultSlots(slots || []))
      .catch(err => {
        console.warn('Failed to load default timetable in wizard:', err);
        setDefaultSlots([]);
      });
  }, [resolvedBatchId, isOpen]);

  // Map default slots to Lecture format for preview
  const defaultBatchLectures = useMemo(() => {
    if (defaultSlots.length === 0) return [];
    return defaultSlots.map(slot => {
      const dayOffset = Math.max(0, Math.min(6, (slot.dayOfWeek || 1) - 1));
      const targetDate = new Date(2026, 0, 5 + dayOffset);
      const m = String(targetDate.getMonth() + 1).padStart(2, '0');
      const d = String(targetDate.getDate()).padStart(2, '0');
      const dateStr = `2026-${m}-${d}`;

      return {
        id: String(slot.id),
        batchId: batchId,
        branchId: branchId || '1',
        subjectId: String(slot.subjectId),
        subjectName: slot.subjectName,
        teacherId: String(slot.teacherId),
        teacherName: slot.teacherName,
        roomId: slot.roomId ? String(slot.roomId) : '',
        roomName: slot.roomName,
        roomNumber: slot.roomNumber,
        date: dateStr,
        startTime: slot.startTime,
        endTime: slot.endTime,
        lectureType: slot.lectureType || 'Regular',
        activityType: (slot.activityType || 'Lecture') as any,
        slotLabel: slot.slotLabel,
        publishStatus: 'PUBLISHED',
        status: 'SCHEDULED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as Lecture;
    });
  }, [defaultSlots, batchId, branchId]);

  const handleNext = () => {
    if (step === 1 && (!branchId || !courseId || !programId || !levelId || !batchId)) return;
    setStep(s => s + 1);
  };

  const handleComplete = () => {
    let initialLectures: Lecture[] | undefined = undefined;

    if (creationMode === 'DEFAULT' && defaultBatchLectures.length > 0 && weekStartDate) {
      const targetMon = parseLocalDate(weekStartDate);
      const templateMon = parseLocalDate('2026-01-05');

      initialLectures = defaultBatchLectures.map(l => {
        let dayOffset = 0;
        if (l.date) {
          const slotDate = parseLocalDate(l.date);
          dayOffset = Math.round((slotDate.getTime() - templateMon.getTime()) / (1000 * 60 * 60 * 24));
          if (isNaN(dayOffset) || dayOffset < 0 || dayOffset > 6) {
            dayOffset = (slotDate.getDay() === 0 ? 6 : slotDate.getDay() - 1);
          }
        }

        const newDate = new Date(targetMon);
        newDate.setDate(newDate.getDate() + dayOffset);
        const dateStr = formatLocalDate(newDate);

        return {
          ...l,
          id: `TEMP-${Math.floor(10000 + Math.random() * 90000)}`,
          date: dateStr,
          batchId: batchId,
          branchId: branchId || l.branchId || '1',
          publishStatus: 'DRAFT',
          status: 'SCHEDULED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      });
    }

    onComplete({
      branchId, courseId, programId, levelId, batchId,
      weekStartDate,
      initialLectures
    });
  };

  const resetForm = () => {
    setStep(1);
    setBranchId(currentUser?.branch || '');
    setCourseId('');
    setProgramId('');
    setLevelId('');
    setBatchId('');
    setCreationMode('DEFAULT');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Timetable" size="3xl">
      <div className="space-y-6">
        
        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-8 max-w-xs mx-auto relative">
          {[1, 2].map((s) => (
            <div key={s} className="flex flex-col items-center relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${step >= s ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300 text-slate-400'}`}>
                {s}
              </div>
              <div className={`text-xs font-semibold mt-2 ${step >= s ? 'text-slate-800' : 'text-slate-400'}`}>
                {s === 1 ? 'Context' : 'Week & Schedule'}
              </div>
            </div>
          ))}
          <div className="absolute left-[20%] right-[20%] h-0.5 bg-slate-200 z-0 top-4" />
        </div>

        {/* Step 1: Academic Context */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="font-semibold text-slate-800 mb-4 text-lg">Step 1: Select Academic Context</h4>
            <Select label="Branch" value={branchId} onChange={(e) => { setBranchId(e.target.value); setCourseId(''); setProgramId(''); setLevelId(''); setBatchId(''); }} options={[{value:'',label:'Select...'}, ...(options?.branches || branches).map(b=>({value:b.code || b.name,label:b.name}))]} />
            <Select label="Course" value={courseId} onChange={(e) => { setCourseId(e.target.value); setProgramId(''); setLevelId(''); setBatchId(''); }} options={[{value:'',label:'Select...'}, ...uniqueCourses.map(c=>({value:c as string,label:c as string}))]} disabled={!branchId} />
            <Select label="Program" value={programId} onChange={(e) => { setProgramId(e.target.value); setLevelId(''); setBatchId(''); }} options={[{value:'',label:'Select...'}, ...availablePrograms.map(p=>({value:p as string,label:p as string}))]} disabled={!courseId} />
            <Select label="Level" value={levelId} onChange={(e) => { setLevelId(e.target.value); setBatchId(''); }} options={[{value:'',label:'Select...'}, ...availableLevels.map(l=>({value:l.levelId,label:l.levelName}))]} disabled={!programId} />
            <Select label="Batch" value={batchId} onChange={(e) => setBatchId(e.target.value)} options={[{value:'',label:'Select...'}, ...availableBatchNames.map(b=>({value:b as string,label:b as string}))]} disabled={!levelId} />
          </div>
        )}

        {/* Step 2: Week Selection & Mode */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            <h4 className="font-semibold text-slate-800 text-lg">Step 2: Select Schedule Week & Method</h4>
            
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Selected Batch</span>
                <span className="font-bold text-blue-600 text-base">{batchId}</span>
              </div>
              <div className="w-48">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Week Starting Monday</label>
                <input
                  type="date"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium"
                  value={weekStartDate}
                  onChange={e => setWeekStartDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2.5">Creation Method</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`flex items-start p-3.5 border rounded-xl cursor-pointer transition-all ${creationMode === 'DEFAULT' ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-200 hover:bg-slate-50'} ${defaultBatchLectures.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input type="radio" name="creationMode" checked={creationMode === 'DEFAULT'} onChange={() => setCreationMode('DEFAULT')} disabled={defaultBatchLectures.length === 0} className="mt-1" />
                  <div className="ml-2.5">
                    <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <BookmarkCheck className="w-4 h-4 text-blue-600" /> Use Default Timetable
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {defaultBatchLectures.length > 0 ? `Load ${defaultBatchLectures.length} master slots from default template.` : 'No default timetable set.'}
                    </div>
                  </div>
                </label>

                <label className={`flex items-start p-3.5 border rounded-xl cursor-pointer transition-all ${creationMode === 'BLANK' ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input type="radio" name="creationMode" checked={creationMode === 'BLANK'} onChange={() => setCreationMode('BLANK')} className="mt-1" />
                  <div className="ml-2.5">
                    <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <PlusCircle className="w-4 h-4 text-emerald-600" /> Start Blank
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">Build schedule from scratch.</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Default Timetable Preview */}
            {creationMode === 'DEFAULT' && defaultBatchLectures.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100 animate-fade-in">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span className="flex items-center gap-1 text-blue-600">
                    <BookmarkCheck className="w-3.5 h-3.5" /> Previewing {defaultBatchLectures.length} default template slots
                  </span>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-[220px] overflow-y-auto">
                  <TimetableGrid
                    lectures={defaultBatchLectures}
                    viewMode="week"
                    onEditLecture={() => {}}
                    selectedWeekStart="2026-01-05"
                    readOnly={true}
                    hideDates={true}
                  />
                </div>
              </div>
            )}

          </div>
        )}
      </div>
      
      {/* Footer Nav */}
      <div className="flex justify-between mt-8 pt-4 border-t border-slate-100">
        {step > 1 ? (
          <Button variant="outline" onClick={() => setStep(s => s - 1)}>Back</Button>
        ) : (
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
        )}
        
        {step < 2 ? (
          <Button variant="primary" onClick={handleNext} disabled={step === 1 && (!branchId || !courseId || !programId || !levelId || !batchId)}>Next</Button>
        ) : (
          <Button variant="primary" onClick={handleComplete}>Open Editor</Button>
        )}
      </div>
    </Modal>
  );
};


