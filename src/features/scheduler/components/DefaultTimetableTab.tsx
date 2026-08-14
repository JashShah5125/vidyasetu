import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { useApp } from '../../../context/AppContext';
import { TimetableGrid } from './TimetableGrid';
import { LectureFormModal } from './LectureFormModal';
import type { Lecture } from '../types/scheduler';
import defaultTimetablesData from '../../../data/defaultTimetables.json';
import { Edit, ChevronLeft, BookmarkCheck, Save, Sparkles, Calendar } from 'lucide-react';

// Reference Monday date used for standard 6-day template grid (Mon–Sat)
const TEMPLATE_WEEK_START = '2026-01-05';

interface DefaultTimetableTabProps {
  currentBatch?: string;
  currentBranch?: string;
  course?: string;
  program?: string;
  level?: string;
  availableBatches?: string[];
  onSelectBatch?: (batchId: string) => void;
}

export const DefaultTimetableTab: React.FC<DefaultTimetableTabProps> = ({
  currentBatch = '',
  currentBranch = '',
  course = '',
  program = '',
  level = '',
  availableBatches = [],
  onSelectBatch
}) => {
  const { addToast } = useApp();

  // Active batch selection directly from global filter
  const selectedBatch = currentBatch;

  // Load master default timetables dictionary from localStorage or defaultTimetables.json
  const [defaultStore, setDefaultStore] = useState<Record<string, Lecture[]>>(() => {
    const saved = localStorage.getItem('vs_default_timetables');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed;
        }
      } catch {}
    }
    return (defaultTimetablesData as Record<string, Lecture[]>) || {};
  });

  // Saved default lectures for the selected batch
  const savedLectures = useMemo(() => {
    const data = defaultStore[selectedBatch];
    return Array.isArray(data) ? data : [];
  }, [defaultStore, selectedBatch]);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [localLectures, setLocalLectures] = useState<Lecture[]>([]);

  // Modal State for adding/editing lectures
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Lecture | undefined>(undefined);
  const [initialDate, setInitialDate] = useState<string | undefined>(undefined);

  // When entering edit mode, copy saved lectures to local working state
  const handleStartEdit = () => {
    setLocalLectures([...savedLectures]);
    setIsEditing(true);
  };

  // When clicking Save Default Timetable
  const handleSaveDefaultTimetable = () => {
    const updatedStore = {
      ...defaultStore,
      [selectedBatch]: localLectures.map(l => ({
        ...l,
        batchId: selectedBatch,
        branchId: currentBranch || l.branchId || 'MUM-WEST',
        publishStatus: 'PUBLISHED' as const,
        status: 'SCHEDULED' as const,
        updatedAt: new Date().toISOString()
      }))
    };

    setDefaultStore(updatedStore);
    localStorage.setItem('vs_default_timetables', JSON.stringify(updatedStore));
    setIsEditing(false);
    addToast(`Default timetable for "${selectedBatch}" saved successfully!`, 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* EDIT MODE (EXACT SAME FULL-SCREEN / CONTAINER TIMETABLE EDITOR VIEW) */}
      {isEditing ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-100px)]">
          {/* Editor Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50/90 gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="text-xs font-semibold shadow-2xs border-slate-200 px-2.5 py-1.5"
              >
                <ChevronLeft className="w-4 h-4 mr-0.5 text-slate-500" /> Back
              </Button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 tracking-tight whitespace-nowrap">
                    DEFAULT TIMETABLE (MASTER TEMPLATE)
                  </h2>
                  <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md text-xs tracking-tight">
                    {selectedBatch}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                  {course && <><span className="font-medium text-slate-700">{course}</span><span>•</span></>}
                  {program && <><span className="text-slate-600">{program}</span><span>•</span></>}
                  {level && <><span className="text-slate-600">{level}</span><span className="text-slate-300">|</span></>}
                  <span className="font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded text-[11px] flex items-center gap-1">
                    <Calendar size={11} className="text-emerald-600" /> Recurring Weekly Template
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="text-xs font-medium text-slate-600 px-3 py-1.5"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveDefaultTimetable}
                className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs px-3.5 py-1.5"
              >
                Save Default Timetable
              </Button>
            </div>
          </div>

          {/* Interactive Timetable Grid */}
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
                  setInitialDate(l.date || TEMPLATE_WEEK_START);
                }
                setIsFormOpen(true);
              }}
              selectedWeekStart={TEMPLATE_WEEK_START}
              readOnly={false}
              hideDates={true}
            />
          </div>
        </div>
      ) : (
        /* VIEW MODE (SAME BLANK/SAVED TIMETABLE GRID WITH EDIT BUTTON) */
        currentBatch ? (
          <div className="space-y-6">
            {/* Header Row with Batch Title and Edit Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                    <BookmarkCheck className="w-5 h-5 text-blue-600" />
                    Default Timetable ({currentBatch})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Standard recurring weekly schedule for this batch. Click "Edit" to configure and save default slots.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="primary" onClick={handleStartEdit}>
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </Button>
              </div>
            </div>

            {/* View Mode Grid: Displays Saved Lectures or Clean Blank Timetable Grid */}
            <TimetableGrid
              lectures={savedLectures}
              viewMode="week"
              onEditLecture={() => { }} // Disabled in view mode
              selectedWeekStart={TEMPLATE_WEEK_START}
              readOnly={true}
              hideDates={true}
            />
          </div>
        ) : (
          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-16 text-center">
            <Calendar className="mx-auto text-slate-300 mb-3" size={36} />
            <p className="text-slate-700 font-semibold">Please select a Batch to view its default timetable.</p>
            <p className="text-xs text-slate-400 mt-1">Use the dropdown filters above to select Course, Program, Level, and Batch.</p>
          </div>
        )
      )}

      {/* Shared LectureFormModal for Adding / Editing Slots */}
      {isFormOpen && (
        <LectureFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          branchId={currentBranch || 'MUM-WEST'}
          batchId={selectedBatch}
          existingLecture={editingLecture}
          initialDate={initialDate}
          isTemplate={true}
          onSave={(lectureData) => {
            if (lectureData.id) {
              setLocalLectures(prev =>
                prev.map(l => l.id === lectureData.id ? { ...l, ...lectureData } as Lecture : l)
              );
            } else {
              const tempId = `TEMP-${Math.floor(10000 + Math.random() * 90000)}`;
              setLocalLectures(prev => [...prev, { ...lectureData, id: tempId } as Lecture]);
            }
          }}
          onDelete={(id) => {
            setLocalLectures(prev => prev.filter(l => l.id !== id));
          }}
        />
      )}
    </div>
  );
};
