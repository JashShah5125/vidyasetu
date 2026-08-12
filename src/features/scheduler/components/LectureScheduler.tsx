import React, { useState, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { useScheduler } from '../context/SchedulerContext';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { TimetableGrid } from './TimetableGrid';
import { LectureFormModal } from './LectureFormModal';
import { CreateTimetableWizard } from './CreateTimetableWizard';
import type { CreateTimetableContext } from './CreateTimetableWizard';
import type { Lecture } from '../types/scheduler';

export const LectureScheduler = () => {
  const { currentUser, branches, batches } = useApp();
  const { lectures, addLectures } = useScheduler();

  // Filters State (View Mode)
  const initialBranch = currentUser?.role === 'branch-admin' ? currentUser.branch : '';
  const [branch, setBranch] = useState(initialBranch || '');
  const [course, setCourse] = useState('');
  const [program, setProgram] = useState('');
  const [level, setLevel] = useState('');
  const [batch, setBatch] = useState('');
  
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

  // Derived options
  const availableBatches = useMemo(() => {
    return batches.filter(b => {
      if (branch && b.branch !== branch && b.branch !== (branches.find(br => br.code === branch)?.name || '')) return false;
      return true;
    });
  }, [batches, branch, branches]);

  const uniqueCourses = useMemo(() => Array.from(new Set(availableBatches.map(b => b.course).filter(Boolean))), [availableBatches]);
  const availablePrograms = useMemo(() => Array.from(new Set(availableBatches.filter(b => b.course === course).map(b => b.program).filter(Boolean))), [availableBatches, course]);
  const availableLevels = useMemo(() => Array.from(new Set(availableBatches.filter(b => b.course === course && b.program === program).map(b => b.level).filter(Boolean))), [availableBatches, course, program]);
  const availableBatchNames = useMemo(() => availableBatches.filter(b => b.course === course && b.program === program && b.level === level).map(b => b.name), [availableBatches, course, program, level]);

  // Main View Batch Lectures
  const batchLectures = useMemo(() => {
    return lectures.filter(l => l.batchId === batch);
  }, [lectures, batch]);
  
  const defaultExists = useMemo(() => {
    return batchLectures.some(l => l.isOverride === false);
  }, [batchLectures]);

  // Editor View Batch Lectures
  const editorLectures = useMemo(() => {
    if (!editorContext) return [];
    return lectures.filter(l => l.batchId === editorContext.batchId);
  }, [lectures, editorContext]);

  if (!currentUser) return null;

  const handleWizardComplete = (context: CreateTimetableContext) => {
    setIsWizardOpen(false);
    setEditorContext(context);
    
    // Check if we need to copy a default timetable into this week (creationMode = 'DEFAULT')
    if (context.scheduleScope === 'WEEK' && context.creationMode === 'DEFAULT' && context.weekStartDate) {
      // In a real app, this would duplicate default records into specific week overrides.
      // For this demo, we'll just let the UI rely on the fallback rendering in TimetableGrid
      // or we can explicitly copy them:
      const defaultsToCopy = lectures.filter(l => l.batchId === context.batchId && l.isOverride === false);
      const newLectures = defaultsToCopy.map(l => {
        // Calculate the specific date for this day of the week
        const d = new Date(context.weekStartDate!);
        const currentDayIndex = new Date(l.date).getDay();
        const targetDayIndex = currentDayIndex === 0 ? 6 : currentDayIndex - 1; // map Sunday(0) to 6, Mon(1) to 0 etc
        d.setDate(d.getDate() + targetDayIndex);
        
        return {
          ...l,
          id: undefined, // new id
          date: d.toISOString().split('T')[0],
          isOverride: true
        };
      });
      // addLectures(newLectures);
      // We will skip actual database insertion here to avoid cluttering the mock data, 
      // but the Grid will visually merge them for now.
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
                <Button variant="outline" size="sm" onClick={() => setEditorContext(null)}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <h2 className="text-xl font-bold text-slate-800">
                  {editorContext.scheduleScope === 'DEFAULT' ? 'DEFAULT WEEKLY TIMETABLE' : 'WEEKLY SCHEDULE'}
                </h2>
              </div>
              <div className="text-sm text-slate-500 flex items-center gap-2">
                <span className="font-semibold text-slate-700">{editorContext.courseId}</span> • 
                <span>{editorContext.programId}</span> • 
                <span>{editorContext.levelId}</span> • 
                <span className="font-semibold text-blue-600">{editorContext.batchId}</span>
                {editorContext.scheduleScope === 'WEEK' && (
                  <>
                    <span className="mx-2">|</span>
                    <span className="font-semibold text-emerald-600">
                      Week of {new Date(editorContext.weekStartDate!).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline">Save Draft</Button>
              <Button variant="primary">Publish</Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-4 bg-slate-50/50">
            <TimetableGrid 
              lectures={editorLectures}
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
              isDefaultMode={editorContext.scheduleScope === 'DEFAULT'}
              selectedWeekStart={editorContext.weekStartDate}
            />
          </div>
        </div>
      ) : (
        /* Main View */
        <>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex-1 w-full space-y-4">
                <div className="flex flex-col">
                  <h2 className="text-2xl font-bold text-slate-900">Timetable</h2>
                  <p className="text-sm text-slate-500">Academic timetable management</p>
                </div>
                
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="w-40"><Select label="Branch" options={[{value: '', label: 'Select...'}, ...branches.map(b => ({ value: b.code, label: b.name }))]} value={branch} onChange={(e) => { setBranch(e.target.value); setCourse(''); setProgram(''); setLevel(''); setBatch(''); }} disabled={!!initialBranch} /></div>
                  <div className="w-40"><Select label="Course" options={[{value: '', label: 'Select...'}, ...uniqueCourses.map(c => ({ value: c as string, label: c as string }))]} value={course} onChange={(e) => { setCourse(e.target.value); setProgram(''); setLevel(''); setBatch(''); }} disabled={!branch} /></div>
                  <div className="w-40"><Select label="Program" options={[{value: '', label: 'Select...'}, ...availablePrograms.map(p => ({ value: p as string, label: p as string }))]} value={program} onChange={(e) => { setProgram(e.target.value); setLevel(''); setBatch(''); }} disabled={!course} /></div>
                  <div className="w-40"><Select label="Level" options={[{value: '', label: 'Select...'}, ...availableLevels.map(l => ({ value: l as string, label: l as string }))]} value={level} onChange={(e) => { setLevel(e.target.value); setBatch(''); }} disabled={!program} /></div>
                  <div className="w-48"><Select label="Batch" options={[{value: '', label: 'Select Batch...'}, ...availableBatchNames.map(b => ({ value: b, label: b }))]} value={batch} onChange={(e) => setBatch(e.target.value)} disabled={!level} /></div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Button variant="primary" onClick={() => setIsWizardOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Add New Timetable
                </Button>
              </div>
            </div>
          </div>

          {batch ? (
            <div className="space-y-6 animate-fade-in">
              
              {/* Default Timetable Status */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">Default Timetable</h3>
                  {defaultExists ? (
                    <div className="text-sm text-slate-500 mt-1">Status: <span className="font-semibold text-emerald-600">Published</span> • Last updated: 05 Aug 2026</div>
                  ) : (
                    <div className="text-sm text-slate-500 mt-1">Status: <span className="font-semibold text-slate-400">Not Configured</span></div>
                  )}
                </div>
                <Button variant="outline" onClick={() => {
                  setEditorContext({
                    branchId: branch, courseId: course, programId: program, levelId: level, batchId: batch,
                    scheduleScope: 'DEFAULT', creationMode: 'DEFAULT'
                  });
                }}>
                  {defaultExists ? 'Edit Default' : 'Create Default'}
                </Button>
              </div>

              {/* Current Week Header */}
              <div className="flex items-center justify-between mt-8 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wide">Current Week Schedule</h3>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1">
                    <Button variant="ghost" size="sm" className="px-2 py-1 hover:bg-white" onClick={() => {
                      const d = new Date(selectedWeekStart); d.setDate(d.getDate() - 7); setSelectedWeekStart(d.toISOString().split('T')[0]);
                    }}><ChevronLeft className="w-4 h-4" /></Button>
                    <span className="text-sm font-semibold text-slate-700 min-w-[120px] text-center">
                      {new Date(selectedWeekStart).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – {new Date(new Date(selectedWeekStart).setDate(new Date(selectedWeekStart).getDate() + 5)).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <Button variant="ghost" size="sm" className="px-2 py-1 hover:bg-white" onClick={() => {
                      const d = new Date(selectedWeekStart); d.setDate(d.getDate() + 7); setSelectedWeekStart(d.toISOString().split('T')[0]);
                    }}><ChevronRight className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    setEditorContext({
                      branchId: branch, courseId: course, programId: program, levelId: level, batchId: batch,
                      scheduleScope: 'WEEK', creationMode: 'DEFAULT', weekStartDate: selectedWeekStart
                    });
                  }}>Edit This Week</Button>
                  <div className="h-6 w-px bg-slate-300 mx-1"></div>
                  <span className="text-sm font-semibold text-slate-700 mr-2">View:</span>
                  <button className="px-4 py-1.5 rounded-md text-sm font-semibold bg-emerald-600 text-white shadow-sm">Weekly</button>
                  <button className="px-4 py-1.5 rounded-md text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50">Daily</button>
                </div>
              </div>

              {/* Grid (Read Only in Main View) */}
              <TimetableGrid 
                lectures={batchLectures}
                viewMode="week"
                onEditLecture={() => {}} // Disabled in view mode
                isDefaultMode={false}
                selectedWeekStart={selectedWeekStart}
                readOnly={true}
              />
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-16 text-center">
              <p className="text-slate-500 font-medium">Please select a Batch to view its timetable.</p>
            </div>
          )}
        </>
      )}

      {/* Shared Modals */}
      <CreateTimetableWizard 
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onComplete={handleWizardComplete}
        initialContext={{ branchId: branch, courseId: course, programId: program, levelId: level, batchId: batch }}
      />

      {editorContext && (
        <LectureFormModal 
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          branchId={editorContext.branchId}
          batchId={editorContext.batchId}
          existingLecture={editingLecture}
          initialDate={initialDate}
          isDefaultMode={editorContext.scheduleScope === 'DEFAULT'}
        />
      )}
    </div>
  );
};
