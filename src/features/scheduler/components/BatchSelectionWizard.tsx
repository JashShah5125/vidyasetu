import React, { useState, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';

export interface BatchSelectionContext {
  branch: string;
  course: string;
  program: string;
  level: string;
  batch: string;
}

interface BatchSelectionWizardProps {
  onBatchSelected: (batchId: string, context: BatchSelectionContext) => void;
  initialBranch?: string; // Pre-selected for branch admins
}

export const BatchSelectionWizard: React.FC<BatchSelectionWizardProps> = ({ onBatchSelected, initialBranch }) => {
  const { branches, batches } = useApp();
  
  const [branch, setBranch] = useState(initialBranch || '');
  const [course, setCourse] = useState('');
  const [program, setProgram] = useState('');
  const [level, setLevel] = useState('');
  const [batch, setBatch] = useState('');

  // Derived options based on current selections
  // If no branch is selected, we could show all courses, but it's better to force top-down
  const availableBatches = useMemo(() => {
    return batches.filter(b => {
      if (branch && b.branch !== branch && b.branch !== (branches.find(br => br.code === branch)?.name || '')) return false;
      return true;
    });
  }, [batches, branch, branches]);

  const uniqueCourses = useMemo(() => Array.from(new Set(availableBatches.map(b => b.course).filter(Boolean))), [availableBatches]);
  
  const availablePrograms = useMemo(() => {
    if (!course) return [];
    return Array.from(new Set(availableBatches.filter(b => b.course === course).map(b => b.program).filter(Boolean)));
  }, [availableBatches, course]);

  const availableLevels = useMemo(() => {
    if (!program) return [];
    return Array.from(new Set(availableBatches.filter(b => b.course === course && b.program === program).map(b => b.level).filter(Boolean)));
  }, [availableBatches, course, program]);

  const availableBatchNames = useMemo(() => {
    if (!level) return [];
    return availableBatches
      .filter(b => b.course === course && b.program === program && b.level === level)
      .map(b => b.name);
  }, [availableBatches, course, program, level]);

  const handleBranchChange = (val: string) => {
    setBranch(val); setCourse(''); setProgram(''); setLevel(''); setBatch('');
  };
  const handleCourseChange = (val: string) => {
    setCourse(val); setProgram(''); setLevel(''); setBatch('');
  };
  const handleProgramChange = (val: string) => {
    setProgram(val); setLevel(''); setBatch('');
  };
  const handleLevelChange = (val: string) => {
    setLevel(val); setBatch('');
  };
  const handleBatchChange = (val: string) => {
    setBatch(val);
  };

  const handleProceed = () => {
    if (batch) {
      onBatchSelected(batch, { branch, course, program, level, batch });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden max-w-3xl mx-auto mt-8">
      <div className="bg-slate-800 px-6 py-4 text-white">
        <h2 className="text-xl font-bold">Select Academic Context</h2>
        <p className="text-sm text-slate-300 mt-1">Please select the batch you want to manage the timetable for.</p>
      </div>
      
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select 
            label="1. Branch"
            options={[{value: '', label: 'Select Branch...'}, ...branches.map(b => ({ value: b.code, label: b.name }))]}
            value={branch}
            onChange={(e) => handleBranchChange(e.target.value)}
            disabled={!!initialBranch} // Lock if pre-selected
          />
          
          <Select 
            label="2. Course"
            options={[{value: '', label: 'Select Course...'}, ...uniqueCourses.map(c => ({ value: c as string, label: c as string }))]}
            value={course}
            onChange={(e) => handleCourseChange(e.target.value)}
            disabled={!branch}
          />
          
          <Select 
            label="3. Program"
            options={[{value: '', label: 'Select Program...'}, ...availablePrograms.map(p => ({ value: p as string, label: p as string }))]}
            value={program}
            onChange={(e) => handleProgramChange(e.target.value)}
            disabled={!course}
          />
          
          <Select 
            label="4. Level"
            options={[{value: '', label: 'Select Level...'}, ...availableLevels.map(l => ({ value: l as string, label: l as string }))]}
            value={level}
            onChange={(e) => handleLevelChange(e.target.value)}
            disabled={!program}
          />
          
          <Select 
            label="5. Batch"
            options={[{value: '', label: 'Select Batch...'}, ...availableBatchNames.map(b => ({ value: b, label: b }))]}
            value={batch}
            onChange={(e) => handleBatchChange(e.target.value)}
            disabled={!level}
          />
        </div>
        
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <Button 
            variant="primary" 
            disabled={!batch}
            onClick={handleProceed}
          >
            Open Timetable &rarr;
          </Button>
        </div>
      </div>
    </div>
  );
};
