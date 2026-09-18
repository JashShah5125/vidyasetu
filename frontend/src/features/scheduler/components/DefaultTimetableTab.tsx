import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '../../../components/ui/Button';
import { useApp } from '../../../context/AppContext';
import { useScheduler } from '../context/SchedulerContext';
import { TimetableGrid } from './TimetableGrid';
import { LectureFormModal } from './LectureFormModal';
import type { Lecture } from '../types/scheduler';
import { timetableApi } from '../../../services/timetableApi';
import { Edit, ChevronLeft, BookmarkCheck, Calendar, Loader2 } from 'lucide-react';

// Reference Monday date used for standard 6-day template grid (Mon–Sat)
const TEMPLATE_WEEK_START = '2026-01-05';

const dayToDateStr = (dayOfWeek: number): string => {
  const dayOffset = Math.max(0, Math.min(6, (dayOfWeek || 1) - 1));
  const d = new Date(2026, 0, 5 + dayOffset);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `2026-${m}-${day}`;
};

const dateStrToDayOfWeek = (dateStr: string): number => {
  if (!dateStr) return 1;
  const d = new Date(dateStr);
  const day = d.getDay();
  return day === 0 ? 7 : day; // 1=Mon .. 7=Sun
};

interface DefaultTimetableTabProps {
  currentBatch?: string;
  currentBranch?: string;
  course?: string;
  program?: string;
  level?: string;
  availableBatches?: string[];
  onSelectBatch?: (batchId: string) => void;
  onSaved?: () => void;
}

export const DefaultTimetableTab: React.FC<DefaultTimetableTabProps> = ({
  currentBatch = '',
  currentBranch = '',
  course = '',
  program = '',
  level = '',
  onSaved
}) => {
  const { addToast, branches, batches } = useApp();
  const { options } = useScheduler();

  // Resolve numerical batchId
  const resolvedBatch = useMemo(() => {
    if (!currentBatch) return null;
    const fromOptions = options?.batches?.find(b => String(b.id) === String(currentBatch) || b.name === currentBatch || b.code === currentBatch);
    if (fromOptions) return fromOptions;
    const fromContext = batches.find((b: any) => String(b.id || b.batchId) === String(currentBatch) || b.name === currentBatch || b.batchName === currentBatch);
    return fromContext || null;
  }, [currentBatch, options, batches]);

  const resolvedBatchId = (resolvedBatch as any)?.id || (resolvedBatch as any)?.batchId || currentBatch;

  // Saved default lectures from backend
  const [savedLectures, setSavedLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(false);

  // Load from API whenever resolvedBatchId changes
  const loadDefaultTimetable = useCallback(async () => {
    if (!resolvedBatchId) {
      setSavedLectures([]);
      return;
    }
    setLoading(true);
    try {
      const slots = await timetableApi.getDefaultTimetable(resolvedBatchId);
      const mappedLectures: Lecture[] = slots.map(slot => ({
        id: String(slot.id),
        batchId: String(resolvedBatchId),
        branchId: currentBranch || String((resolvedBatch as any)?.branch_id || '1'),
        subjectId: String(slot.subjectId),
        subjectName: slot.subjectName,
        teacherId: String(slot.teacherId),
        teacherName: slot.teacherName,
        roomId: slot.roomId ? String(slot.roomId) : '',
        roomName: slot.roomName,
        roomNumber: slot.roomNumber,
        date: dayToDateStr(slot.dayOfWeek),
        startTime: slot.startTime,
        endTime: slot.endTime,
        lectureType: slot.lectureType || 'Regular',
        activityType: (slot.activityType || 'Lecture') as any,
        slotLabel: slot.slotLabel,
        publishStatus: 'PUBLISHED',
        status: 'SCHEDULED'
      }));
      setSavedLectures(mappedLectures);
    } catch (err) {
      console.warn('Could not load default timetable from API:', err);
    } finally {
      setLoading(false);
    }
  }, [resolvedBatchId, currentBranch, resolvedBatch]);

  useEffect(() => {
    loadDefaultTimetable();
  }, [loadDefaultTimetable]);

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
  const handleSaveDefaultTimetable = async () => {
    if (!resolvedBatchId) return;

    const slots = localLectures.map(l => ({
      day_of_week: dateStrToDayOfWeek(l.date),
      start_time: l.startTime.length === 5 ? `${l.startTime}:00` : l.startTime,
      end_time: l.endTime.length === 5 ? `${l.endTime}:00` : l.endTime,
      subject_id: l.subjectId,
      teacher_user_id: l.teacherId,
      classroom_id: l.roomId || null,
      lecture_type: l.lectureType || 'Regular',
      activity_type: l.activityType || 'Lecture',
      slot_label: l.slotLabel || null
    }));

    try {
      const branchIdNum = (resolvedBatch as any)?.branch_id || (branches.find(b => b.code === currentBranch || b.name === currentBranch)?.id) || 1;
      await timetableApi.saveDefaultTimetable(resolvedBatchId, slots, branchIdNum, (resolvedBatch as any)?.academic_year_id || 1);
      
      setIsEditing(false);
      await loadDefaultTimetable();
      onSaved?.();
      addToast(`Default timetable for "${currentBatch}" saved successfully!`, 'success');
    } catch (err: any) {
      console.error('Failed to save default timetable to backend:', err);
      addToast(err?.response?.data?.message || 'Failed to save default timetable.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* EDIT MODE */}
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
                    {currentBatch}
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
        /* VIEW MODE */
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
                    Standard recurring weekly schedule for this batch. Click "Edit" to configure and save default slots to database.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="primary" onClick={handleStartEdit} disabled={loading}>
                  <Edit className="w-4 h-4 mr-2" /> Edit Template
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> Loading default timetable...
              </div>
            ) : (
              <TimetableGrid
                lectures={savedLectures}
                viewMode="week"
                onEditLecture={() => { }}
                selectedWeekStart={TEMPLATE_WEEK_START}
                readOnly={true}
                hideDates={true}
              />
            )}
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
          branchId={currentBranch || String((resolvedBatch as any)?.branch_id || '1')}
          batchId={String(resolvedBatchId)}
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
