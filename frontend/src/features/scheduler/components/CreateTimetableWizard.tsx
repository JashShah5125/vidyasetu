import React, { useState, useMemo } from 'react';
import courseHierarchy from '../../../data/courseHierarchy.json';
import { useApp } from '../../../context/AppContext';
import { Modal } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { useScheduler } from '../context/SchedulerContext';

export interface CreateTimetableContext {
  branchId: string;
  courseId: string;
  programId: string;
  levelId: string;
  batchId: string;
  scheduleScope: 'DEFAULT' | 'WEEK';
  weekStartDate?: string;
  creationMode: 'BLANK' | 'DEFAULT' | 'COPY_WEEK';
  copyFromWeekStartDate?: string;
}

interface CreateTimetableWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (context: CreateTimetableContext) => void;
  initialContext?: Partial<CreateTimetableContext>;
}

export const CreateTimetableWizard: React.FC<CreateTimetableWizardProps> = ({
  isOpen, onClose, onComplete, initialContext
}) => {
  const { currentUser, branches, batches } = useApp();
  const { lectures } = useScheduler(); // to check if default exists

  const [step, setStep] = useState(1);
  
  // Step 1 State
  const [branchId, setBranchId] = useState(initialContext?.branchId || currentUser?.branch || '');
  const [courseId, setCourseId] = useState(initialContext?.courseId || '');
  const [programId, setProgramId] = useState(initialContext?.programId || '');
  const [levelId, setLevelId] = useState(initialContext?.levelId || '');
  const [batchId, setBatchId] = useState(initialContext?.batchId || '');

  // Step 2 State
  const [scheduleScope, setScheduleScope] = useState<'DEFAULT' | 'WEEK'>('DEFAULT');

  // Step 3 State
  const [weekStartDate, setWeekStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 1)).toISOString().split('T')[0] // Monday of current week
  );
  const [creationMode, setCreationMode] = useState<'BLANK' | 'DEFAULT' | 'COPY_WEEK'>('BLANK');
  
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

  // Check if default timetable exists for selected batch
  const defaultExists = useMemo(() => {
    if (!batchId) return false;
    return lectures.some(l => l.batchId === batchId && l.isOverride === false);
  }, [lectures, batchId]);

  const handleNext = () => {
    if (step === 1 && (!branchId || !courseId || !programId || !levelId || !batchId)) return;
    if (step === 2 && !scheduleScope) return;
    setStep(s => s + 1);
  };

  const handleComplete = () => {
    onComplete({
      branchId, courseId, programId, levelId, batchId,
      scheduleScope,
      weekStartDate: scheduleScope === 'WEEK' ? weekStartDate : undefined,
      creationMode
    });
  };

  const resetForm = () => {
    setStep(1);
    setBranchId(currentUser?.branch || '');
    setCourseId('');
    setProgramId('');
    setLevelId('');
    setBatchId('');
    setScheduleScope('DEFAULT');
    setCreationMode('BLANK');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Timetable" size="lg">
      <div className="space-y-6">
        
        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-col items-center relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${step >= s ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300 text-slate-400'}`}>
                {s}
              </div>
              <div className={`text-xs font-semibold mt-2 ${step >= s ? 'text-slate-800' : 'text-slate-400'}`}>
                {s === 1 ? 'Context' : s === 2 ? 'Scope' : 'Creation'}
              </div>
            </div>
          ))}
          <div className="absolute left-[10%] right-[10%] h-0.5 bg-slate-200 z-0 top-4" />
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

        {/* Step 2: Schedule Scope */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
             <h4 className="font-semibold text-slate-800 mb-4 text-lg">Step 2: Select Schedule Scope</h4>
             <div className="space-y-3">
               <label className={`flex items-start p-4 border rounded-xl cursor-pointer transition-colors ${scheduleScope === 'DEFAULT' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                 <input type="radio" name="scope" value="DEFAULT" checked={scheduleScope === 'DEFAULT'} onChange={() => setScheduleScope('DEFAULT')} className="mt-1" />
                 <div className="ml-3">
                   <div className="font-semibold text-slate-800">Default Weekly Timetable</div>
                   <div className="text-sm text-slate-500">The recurring weekly pattern for this batch.</div>
                 </div>
               </label>
               <label className={`flex items-start p-4 border rounded-xl cursor-pointer transition-colors ${scheduleScope === 'WEEK' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                 <input type="radio" name="scope" value="WEEK" checked={scheduleScope === 'WEEK'} onChange={() => setScheduleScope('WEEK')} className="mt-1" />
                 <div className="ml-3">
                   <div className="font-semibold text-slate-800">Schedule for a Specific Week</div>
                   <div className="text-sm text-slate-500">Actual schedule instances for a particular date range.</div>
                 </div>
               </label>
             </div>
          </div>
        )}

        {/* Step 3: Creation Method */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
             <h4 className="font-semibold text-slate-800 mb-4 text-lg">Step 3: Creation Method</h4>
             
             {scheduleScope === 'DEFAULT' ? (
                defaultExists ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                    <p className="text-amber-800 font-semibold mb-2">A default timetable already exists for this batch.</p>
                    <p className="text-sm text-amber-700 mb-6">You cannot create a second default timetable. You can edit the existing one instead.</p>
                    <Button variant="primary" onClick={() => { setCreationMode('DEFAULT'); handleComplete(); }}>Edit Existing Default</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-slate-600 mb-4 font-medium">How do you want to start?</p>
                    <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors border-emerald-500 bg-emerald-50`}>
                      <input type="radio" checked readOnly className="mt-0.5" />
                      <div className="ml-3 font-semibold text-slate-800">Start Blank</div>
                    </label>
                  </div>
                )
             ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Select Week (Starting Monday)</label>
                    <input type="date" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={weekStartDate} onChange={e => setWeekStartDate(e.target.value)} />
                  </div>
                  <div>
                    <p className="text-slate-600 mb-4 font-medium">How do you want to start?</p>
                    <div className="space-y-3">
                      <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${creationMode === 'BLANK' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <input type="radio" checked={creationMode === 'BLANK'} onChange={() => setCreationMode('BLANK')} className="mt-0.5" />
                        <div className="ml-3 font-semibold text-slate-800">Start Blank Timetable</div>
                      </label>
                      <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${creationMode === 'DEFAULT' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'} ${!defaultExists ? 'opacity-50 pointer-events-none' : ''}`}>
                        <input type="radio" checked={creationMode === 'DEFAULT'} onChange={() => setCreationMode('DEFAULT')} disabled={!defaultExists} className="mt-0.5" />
                        <div className="ml-3">
                          <div className="font-semibold text-slate-800">Use Default Timetable</div>
                          {!defaultExists && <div className="text-xs text-slate-500">No default timetable exists for this batch.</div>}
                        </div>
                      </label>
                    </div>
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
        
        {step < 3 ? (
          <Button variant="primary" onClick={handleNext} disabled={step === 1 && (!branchId || !courseId || !programId || !levelId || !batchId)}>Next</Button>
        ) : (
          !(scheduleScope === 'DEFAULT' && defaultExists) && (
            <Button variant="primary" onClick={handleComplete}>Open Editor</Button>
          )
        )}
      </div>
    </Modal>
  );
};
