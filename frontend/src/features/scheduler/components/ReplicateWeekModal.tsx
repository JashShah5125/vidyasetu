import React, { useState, useMemo } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Copy, Calendar, ArrowRight, AlertCircle, Sparkles, CheckCircle } from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { TimetableGrid } from './TimetableGrid';
import type { Lecture } from '../types/scheduler';

interface ReplicateWeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  branchId: string;
  targetWeekStart: string;
  onReplicate: (replicatedLectures: Lecture[]) => Promise<void> | void;
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

export const ReplicateWeekModal: React.FC<ReplicateWeekModalProps> = ({
  isOpen,
  onClose,
  batchId,
  branchId,
  targetWeekStart,
  onReplicate
}) => {
  const { lectures } = useScheduler();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group existing lectures for this batch by week start
  const availableWeeks = useMemo(() => {
    const batchLectures = lectures.filter(l => l.batchId === batchId && l.status !== 'CANCELLED' && l.date && l.date !== '0000-00-00');
    const weekMap = new Map<string, Lecture[]>();

    batchLectures.forEach(l => {
      const mon = getMondayOfWeek(l.date);
      if (!weekMap.has(mon)) {
        weekMap.set(mon, []);
      }
      weekMap.get(mon)!.push(l);
    });

    const weeks = Array.from(weekMap.entries()).map(([weekStart, list]) => {
      const startD = parseLocalDate(weekStart);
      const endD = new Date(startD);
      endD.setDate(endD.getDate() + 6);
      const label = `Week of ${startD.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${endD.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} (${list.length} activities)`;
      return {
        value: weekStart,
        label,
        count: list.length,
        startDate: weekStart,
        isSameAsTarget: weekStart === targetWeekStart
      };
    });

    // Sort descending by date (most recent first)
    return weeks.sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [lectures, batchId, targetWeekStart]);

  // Default source week: pick the most recent week that is not target week, or the first available
  const defaultSource = useMemo(() => {
    const otherWeeks = availableWeeks.filter(w => w.startDate !== targetWeekStart);
    return otherWeeks.length > 0 ? otherWeeks[0].value : (availableWeeks[0]?.value || '');
  }, [availableWeeks, targetWeekStart]);

  const [selectedSourceWeek, setSelectedSourceWeek] = useState<string>(defaultSource);
  const [customDate, setCustomDate] = useState<string>('');

  // Update selectedSourceWeek when defaultSource changes
  React.useEffect(() => {
    if (defaultSource) {
      setSelectedSourceWeek(defaultSource);
    }
  }, [defaultSource, isOpen]);

  const activeSourceWeek = selectedSourceWeek === 'custom' ? getMondayOfWeek(customDate || targetWeekStart) : selectedSourceWeek;

  // Source lectures to preview
  const sourceLectures = useMemo(() => {
    if (!activeSourceWeek) return [];
    const start = parseLocalDate(activeSourceWeek);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const startStr = formatLocalDate(start);
    const endStr = formatLocalDate(end);

    return lectures.filter(l => l.batchId === batchId && l.status !== 'CANCELLED' && l.date >= startStr && l.date <= endStr);
  }, [lectures, batchId, activeSourceWeek]);

  // Target week formatted text
  const targetWeekFormatted = useMemo(() => {
    if (!targetWeekStart) return '';
    const startD = parseLocalDate(targetWeekStart);
    const endD = new Date(startD);
    endD.setDate(endD.getDate() + 6);
    return `${startD.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${endD.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [targetWeekStart]);

  const handleReplicate = async () => {
    if (sourceLectures.length === 0 || !targetWeekStart) return;
    setIsSubmitting(true);

    try {
      const sourceStart = parseLocalDate(activeSourceWeek);
      const targetStart = parseLocalDate(targetWeekStart);

      const replicated: Lecture[] = sourceLectures.map(l => {
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

      await onReplicate(replicated);
      onClose();
    } catch (err) {
      console.error('Error replicating timetable:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Replicate Previous Week Timetable"
      size="4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            {sourceLectures.length > 0 ? (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                {sourceLectures.length} activities will be loaded into editor for {targetWeekFormatted}
              </span>
            ) : (
              <span className="text-amber-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Please select a week that has scheduled activities
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleReplicate}
              disabled={sourceLectures.length === 0 || isSubmitting}
            >
              <Copy className="w-4 h-4 mr-2" />
              Replicate
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">

        {/* Target Week Summary Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Target Week</div>
              <div className="text-base font-bold text-slate-900">{targetWeekFormatted}</div>
              <div className="text-xs text-slate-500">Batch: <span className="font-semibold text-slate-700">{batchId}</span></div>
            </div>
          </div>
          <div className="bg-white/80 border border-blue-100 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-800">
            Replicating into this week
          </div>
        </div>

        {/* Source Week Selector */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-bold text-slate-800">
              Select Source Week to Replicate:
            </label>
            <span className="text-xs text-slate-500">
              Choose an existing week to clone its entire schedule
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <Select
                label="Available Weeks with Schedule"
                value={selectedSourceWeek}
                onChange={(e) => setSelectedSourceWeek(e.target.value)}
                options={[
                  ...(availableWeeks.length === 0 ? [{ value: '', label: 'No scheduled weeks available' }] : []),
                  ...availableWeeks.map(w => ({
                    value: w.value,
                    label: `${w.label}${w.isSameAsTarget ? ' (Current)' : ''}`
                  })),
                  { value: 'custom', label: 'Pick Another Date...' }
                ]}
              />
            </div>

            {selectedSourceWeek === 'custom' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Select Any Date in Week</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Timetable Live Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Copy className="w-4 h-4 text-blue-600" />
              Source Week Timetable Preview
            </h4>
            {sourceLectures.length > 0 && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                {sourceLectures.length} activities found
              </span>
            )}
          </div>

          {sourceLectures.length > 0 ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-[380px] overflow-y-auto">
              <TimetableGrid
                lectures={sourceLectures}
                viewMode="week"
                onEditLecture={() => {}}
                selectedWeekStart={activeSourceWeek}
                readOnly={true}
              />
            </div>
          ) : (
            <div className="bg-amber-50 border border-dashed border-amber-300 rounded-xl p-12 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-amber-900 font-bold text-sm">No Timetable Scheduled in Selected Week</p>
              <p className="text-amber-700 text-xs max-w-md mx-auto">
                The selected source week does not contain any published activities for batch {batchId}. Please select another week from the dropdown above.
              </p>
            </div>
          )}
        </div>

      </div>
    </Modal>
  );
};
