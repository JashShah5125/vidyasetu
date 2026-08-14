import React, { useState, useMemo } from 'react';
import courseHierarchy from '../../../data/courseHierarchy.json';
import { useApp } from '../../../context/AppContext';
import { useScheduler } from '../context/SchedulerContext';
import { Modal } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { TimetableGrid } from './TimetableGrid';
import { Copy, PlusCircle, AlertCircle, Sparkles } from 'lucide-react';
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
  const { lectures } = useScheduler();

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
  const [creationMode, setCreationMode] = useState<'BLANK' | 'REPLICATE'>('BLANK');
  const [selectedSourceWeek, setSelectedSourceWeek] = useState<string>('');
  
  // Derived Options
  const availableBatches = useMemo(() => {
    return batches.filter(b => {
      if (branchId && b.branch !== branchId && b.branch !== (branches.find(br => br.code === branchId)?.name || '')) return false;
      return true;
    });
  }, [batches, branchId, branches]);

  const uniqueCourses = useMemo(() => courseHierarchy.map(c => c.courseName), []);
  const availablePrograms = useMemo(() => {
    const course = courseHierarchy.find(c => c.courseName === courseId);
    return course ? course.programs.map(p => p.programName) : [];
  }, [courseId]);
  const availableLevels = useMemo(() => {
    const course = courseHierarchy.find(c => c.courseName === courseId);
    const program = course?.programs.find(p => p.programName === programId);
    return program ? program.levels : [];
  }, [courseId, programId]);
  const availableBatchNames = useMemo(() => {
    const course = courseHierarchy.find(c => c.courseName === courseId);
    const program = course?.programs.find(p => p.programName === programId);
    const level = program?.levels.find(l => l.levelId === levelId);
    if (!level) return [];
    return level.batches.filter(batchName => availableBatches.some(b => b.name === batchName));
  }, [courseId, programId, levelId, availableBatches]);

  // Available weeks with schedule for this batch
  const availableWeeks = useMemo(() => {
    if (!batchId) return [];
    const batchLectures = lectures.filter(l => l.batchId === batchId && l.status !== 'CANCELLED' && l.date && l.date !== '0000-00-00');
    const weekMap = new Map<string, Lecture[]>();

    batchLectures.forEach(l => {
      const mon = getMondayOfWeek(l.date);
      if (!weekMap.has(mon)) {
        weekMap.set(mon, []);
      }
      weekMap.get(mon)!.push(l);
    });

    return Array.from(weekMap.entries()).map(([wStart, list]) => {
      const startD = parseLocalDate(wStart);
      const endD = new Date(startD);
      endD.setDate(endD.getDate() + 5);
      const label = `Week of ${startD.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${endD.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} (${list.length} activities)`;
      return {
        value: wStart,
        label,
        count: list.length,
        startDate: wStart
      };
    }).sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [lectures, batchId]);

  // Auto-select first source week when availableWeeks updates
  React.useEffect(() => {
    if (availableWeeks.length > 0 && !selectedSourceWeek) {
      setSelectedSourceWeek(availableWeeks[0].value);
    }
  }, [availableWeeks, selectedSourceWeek]);

  // Source lectures for live preview
  const sourceLectures = useMemo(() => {
    if (creationMode !== 'REPLICATE' || !selectedSourceWeek) return [];
    const start = parseLocalDate(selectedSourceWeek);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const startStr = formatLocalDate(start);
    const endStr = formatLocalDate(end);
    return lectures.filter(l => l.batchId === batchId && l.status !== 'CANCELLED' && l.date >= startStr && l.date <= endStr);
  }, [lectures, batchId, creationMode, selectedSourceWeek]);

  const handleNext = () => {
    if (step === 1 && (!branchId || !courseId || !programId || !levelId || !batchId)) return;
    setStep(s => s + 1);
  };

  const handleComplete = () => {
    let initialLectures: Lecture[] | undefined = undefined;

    if (creationMode === 'REPLICATE' && sourceLectures.length > 0 && weekStartDate) {
      const sourceStart = parseLocalDate(selectedSourceWeek);
      const targetStart = parseLocalDate(weekStartDate);

      initialLectures = sourceLectures.map(l => {
        const lectureDate = parseLocalDate(l.date);
        const dayOffset = Math.round((lectureDate.getTime() - sourceStart.getTime()) / (1000 * 60 * 60 * 24));
        
        const newDate = new Date(targetStart);
        newDate.setDate(newDate.getDate() + dayOffset);
        const dateStr = formatLocalDate(newDate);

        const tempId = `TEMP-${Math.floor(10000 + Math.random() * 90000)}`;

        return {
          ...l,
          id: tempId,
          date: dateStr,
          batchId: batchId,
          branchId: branchId || l.branchId,
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
    setCreationMode('BLANK');
    setSelectedSourceWeek('');
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
            <Select label="Branch" value={branchId} onChange={(e) => { setBranchId(e.target.value); setCourseId(''); setProgramId(''); setLevelId(''); setBatchId(''); }} options={[{value:'',label:'Select...'}, ...branches.map(b=>({value:b.code,label:b.name}))]} />
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
                <label className={`flex items-start p-3.5 border rounded-xl cursor-pointer transition-all ${creationMode === 'BLANK' ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input type="radio" name="creationMode" checked={creationMode === 'BLANK'} onChange={() => setCreationMode('BLANK')} className="mt-1" />
                  <div className="ml-3">
                    <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <PlusCircle className="w-4 h-4 text-emerald-600" /> Start Blank
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">Build a new schedule for this week from scratch.</div>
                  </div>
                </label>

                <label className={`flex items-start p-3.5 border rounded-xl cursor-pointer transition-all ${creationMode === 'REPLICATE' ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-200 hover:bg-slate-50'} ${availableWeeks.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input type="radio" name="creationMode" checked={creationMode === 'REPLICATE'} onChange={() => setCreationMode('REPLICATE')} disabled={availableWeeks.length === 0} className="mt-1" />
                  <div className="ml-3">
                    <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <Copy className="w-4 h-4 text-blue-600" /> Replicate Previous Week
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {availableWeeks.length > 0 ? `Clone from ${availableWeeks.length} available past weeks.` : 'No past weeks available to copy.'}
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Replicate Source Week Selector and Preview */}
            {creationMode === 'REPLICATE' && (
              <div className="space-y-4 pt-2 border-t border-slate-100 animate-fade-in">
                <div>
                  <Select
                    label="Select Source Week"
                    value={selectedSourceWeek}
                    onChange={(e) => setSelectedSourceWeek(e.target.value)}
                    options={availableWeeks.map(w => ({ value: w.value, label: w.label }))}
                  />
                </div>

                {sourceLectures.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span className="flex items-center gap-1 text-emerald-600">
                        <Sparkles className="w-3.5 h-3.5" /> Previewing {sourceLectures.length} activities to copy
                      </span>
                    </div>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-[220px] overflow-y-auto">
                      <TimetableGrid
                        lectures={sourceLectures}
                        viewMode="week"
                        onEditLecture={() => {}}
                        selectedWeekStart={selectedSourceWeek}
                        readOnly={true}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>No activities found in the selected source week.</span>
                  </div>
                )}
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


