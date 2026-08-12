import React, { useState, useMemo } from 'react';
import { useScheduler } from '../context/SchedulerContext';
import { Button } from '../../../components/ui/Button';
import { TimetableGrid } from './TimetableGrid';
import { LectureFormModal } from './LectureFormModal';
import { ArrowLeft, Edit, Calendar, Settings } from 'lucide-react';
import type { BatchSelectionContext } from './BatchSelectionWizard';
import type { Lecture } from '../types/scheduler';

interface BatchTimetableManagerProps {
  context: BatchSelectionContext;
  onBack: () => void;
}

export const BatchTimetableManager: React.FC<BatchTimetableManagerProps> = ({ context, onBack }) => {
  const { lectures, defaultTimetables } = useScheduler();
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [isEditingDefault, setIsEditingDefault] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Lecture | undefined>(undefined);

  // We need to fetch the lectures for this batch.
  // In a real implementation, 'lectures' would be generated from the DefaultTimetable + overrides for the selected week.
  // For now, we'll just filter existing mock lectures by batchId.
  const batchLectures = useMemo(() => {
    return lectures.filter(l => l.batchId === context.batch);
  }, [lectures, context.batch]);

  const defaultTimetable = useMemo(() => {
    return defaultTimetables.find(dt => dt.batchId === context.batch);
  }, [defaultTimetables, context.batch]);

  // Convert DefaultTimetable patterns to mock "Lectures" just to display in the TimetableGrid while editing default
  const defaultTimetableLectures: Lecture[] = useMemo(() => {
    if (!defaultTimetable) return [];
    return defaultTimetable.patterns.map((p, idx) => {
      // Map dayOfWeek to a dummy date (e.g. 2026-08-10 is a Monday)
      const baseDate = new Date('2026-08-09T00:00:00Z'); // Sunday
      baseDate.setDate(baseDate.getDate() + p.dayOfWeek);
      const dateStr = baseDate.toISOString().split('T')[0];

      return {
        id: `DEFAULT-${idx}`,
        branchId: defaultTimetable.branchId,
        academicYearId: defaultTimetable.academicYearId,
        batchId: defaultTimetable.batchId,
        subjectId: p.subjectId,
        teacherId: p.teacherId,
        roomId: p.roomId,
        date: dateStr,
        startTime: p.startTime,
        endTime: p.endTime,
        lectureType: p.lectureType,
        publishStatus: defaultTimetable.status,
        status: 'SCHEDULED',
        createdAt: defaultTimetable.createdAt,
        updatedAt: defaultTimetable.updatedAt,
      } as Lecture;
    });
  }, [defaultTimetable]);

  const displayLectures = isEditingDefault ? defaultTimetableLectures : batchLectures;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Context */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <button onClick={onBack} className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <ArrowLeft size={14} /> Back
            </button>
            <span>•</span>
            <span>{context.branch}</span>
            <span>•</span>
            <span>{context.course}</span>
            <span>•</span>
            <span>{context.program}</span>
            <span>•</span>
            <span>{context.level}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">{context.batch} Timetable</h2>
        </div>

        <div className="flex items-center gap-3">
          {!isEditingDefault ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditingDefault(true)}>
              <Settings className="w-4 h-4 mr-2" /> Edit Default Timetable
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={() => setIsEditingDefault(false)}>
              <Calendar className="w-4 h-4 mr-2" /> View Weekly Schedule
            </Button>
          )}
        </div>
      </div>

      {/* Main View Area */}
      {isEditingDefault ? (
        <div className="bg-amber-50 rounded-xl border border-amber-200 shadow-sm p-6">
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-amber-900">Editing Default Timetable</h3>
              <p className="text-sm text-amber-700">Changes here apply to all future weeks.</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => { setEditingLecture(undefined); setIsFormOpen(true); }}>
              + Add Slot
            </Button>
          </div>
          
          <TimetableGrid 
            lectures={displayLectures}
            viewMode="week"
            onEditLecture={(l) => { setEditingLecture(l); setIsFormOpen(true); }}
            isDefaultMode={true}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button 
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                onClick={() => setViewMode('week')}
              >
                Weekly
              </button>
              <button 
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'day' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                onClick={() => setViewMode('day')}
              >
                Daily
              </button>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-semibold text-slate-700">Week: 10 Aug – 15 Aug 2026</span>
              <Button variant="primary" size="sm" onClick={() => { setEditingLecture(undefined); setIsFormOpen(true); }}>
                + Add Override
              </Button>
            </div>
          </div>
          
          <TimetableGrid 
            lectures={displayLectures}
            viewMode={viewMode}
            onEditLecture={(l) => { setEditingLecture(l); setIsFormOpen(true); }}
          />
        </div>
      )}

      <LectureFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        branchId={context.branch} // Not truly used since context handles it now, but good for room lookup
        batchId={context.batch}
        existingLecture={editingLecture}
        isDefaultMode={isEditingDefault}
      />
    </div>
  );
};
