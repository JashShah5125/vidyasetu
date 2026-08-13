import React, { useState, useMemo } from 'react';
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

  const uniqueCourses = useMemo(() => Array.from(new Set(availableBatches.map(b => b.course).filter(Boolean))), [availableBatches]);
  const availablePrograms = useMemo(() => Array.from(new Set(availableBatches.filter(b => b.course === courseId).map(b => b.program).filter(Boolean))), [availableBatches, courseId]);
  const availableLevels = useMemo(() => Array.from(new Set(availableBatches.filter(b => b.course === courseId && b.program === programId).map(b => b.level).filter(Boolean))), [availableBatches, courseId, programId]);
  const availableBatchNames = useMemo(() => availableBatches.filter(b => b.course === courseId && b.program === programId && b.level === levelId).map(b => b.name), [availableBatches, courseId, programId, levelId]);

  // Check if default timetable exists for selected batch
  const defaultExists = useMemo(() => {
    if (!batchId) return false;
    return lectures.some(l => l.batchId === batchId && l.isOverride === false);
  }, [lectures, batchId]);

  const handleNext = () => {
    if (step === 1 && (!branchId || !courseId || !programId || !levelId || !batchId)) return;
    setStep(2);
  };

  const handleComplete = () => {
    onComplete({
      branchId, courseId, programId, levelId, batchId,
      scheduleScope,
      weekStartDate: scheduleScope === 'WEEK' ? weekStartDate : undefined,
      creationMode: defaultExists ? 'DEFAULT' : 'BLANK'
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
        <div className="flex items-center justify-between mb-8 relative">
          {[1, 2].map((s) => (
            <div key={s} className="flex flex-col items-center relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${step >= s ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300 text-slate-400'}`}>
                {s}
              </div>
              <div className={`text-xs font-semibold mt-2 ${step >= s ? 'text-slate-800' : 'text-slate-400'}`}>
                {s === 1 ? 'Context' : 'Scope'}
              </div>
            </div>
          ))}
          <div className="absolute left-4 right-4 h-0.5 bg-slate-200 z-0 top-4" />
        </div>

        {/* Step 1: Academic Context */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="font-semibold text-slate-800 mb-4 text-lg">Step 1: Select Academic Context</h4>
            <Select label="Branch" value={branchId} onChange={(e) => { setBranchId(e.target.value); setCourseId(''); setProgramId(''); setLevelId(''); setBatchId(''); }} options={[{value:'',label:'Select...'}, ...branches.map(b=>({value:b.code,label:b.name}))]} />
            <Select label="Course" value={courseId} onChange={(e) => { setCourseId(e.target.value); setProgramId(''); setLevelId(''); setBatchId(''); }} options={[{value:'',label:'Select...'}, ...uniqueCourses.map(c=>({value:c as string,label:c as string}))]} disabled={!branchId} />
            <Select label="Program" value={programId} onChange={(e) => { setProgramId(e.target.value); setLevelId(''); setBatchId(''); }} options={[{value:'',label:'Select...'}, ...availablePrograms.map(p=>({value:p as string,label:p as string}))]} disabled={!courseId} />
            <Select label="Level" value={levelId} onChange={(e) => { setLevelId(e.target.value); setBatchId(''); }} options={[{value:'',label:'Select...'}, ...availableLevels.map(l=>({value:l as string,label:l as string}))]} disabled={!programId} />
            <Select label="Batch" value={batchId} onChange={(e) => setBatchId(e.target.value)} options={[{value:'',label:'Select...'}, ...availableBatchNames.map(b=>({value:b as string,label:b as string}))]} disabled={!levelId} />
          </div>
        )}

        {/* Step 2: Schedule Scope */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
             <h4 className="font-semibold text-slate-800 mb-4 text-lg">Step 2: Select Schedule Scope</h4>
             <div className="space-y-4">
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
               
               {scheduleScope === 'WEEK' && (
                 <div className="p-4 bg-slate-50 border border-slate-250 rounded-xl space-y-2 animate-fade-in mt-2">
                   <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                     Select Week (Starting Monday)
                   </label>
                   <input 
                     type="date" 
                     className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" 
                     value={weekStartDate} 
                     onChange={e => setWeekStartDate(e.target.value)} 
                   />
                 </div>
               )}
             </div>
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
        
        {step === 1 ? (
          <Button variant="primary" onClick={handleNext} disabled={!branchId || !courseId || !programId || !levelId || !batchId}>Next</Button>
        ) : (
          <Button variant="primary" onClick={handleComplete}>Open Timetable</Button>
        )}
      </div>
    </Modal>
  );
};
