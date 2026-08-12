import React, { useMemo } from 'react';
import { Repeat, Plus } from 'lucide-react';
import type { Lecture } from '../types/scheduler';
import { timeToMinutes } from '../utils/schedulerUtils';

interface TimetableGridProps {
  lectures: Lecture[];
  viewMode: 'week' | 'day' | 'list';
  onEditLecture: (lecture: Lecture) => void;
  isDefaultMode?: boolean;
  selectedWeekStart?: string; // For adding new lectures with correct date
  readOnly?: boolean;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const getLectureColor = (type?: string, isOverride?: boolean) => {
  if (isOverride) return 'bg-orange-100 border-orange-200'; // Substitution / Override
  switch (type) {
    case 'Regular': return 'bg-emerald-50 border-emerald-100'; // Greenish
    case 'Lab': return 'bg-blue-50 border-blue-100'; // Blueish
    case 'Activity': return 'bg-purple-50 border-purple-100'; // Purpleish
    case 'Tutorial': return 'bg-yellow-50 border-yellow-100'; // Yellowish
    default: return 'bg-pink-50 border-pink-100'; // Pinkish
  }
};

export const TimetableGrid: React.FC<TimetableGridProps> = ({ lectures, viewMode, onEditLecture, isDefaultMode, selectedWeekStart, readOnly = false }) => {

  if (viewMode === 'list') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse bg-white">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-3 text-sm font-semibold text-slate-600">Date/Time</th>
              <th className="p-3 text-sm font-semibold text-slate-600">Batch</th>
              <th className="p-3 text-sm font-semibold text-slate-600">Subject</th>
              <th className="p-3 text-sm font-semibold text-slate-600">Teacher</th>
              <th className="p-3 text-sm font-semibold text-slate-600">Room</th>
              <th className="p-3 text-sm font-semibold text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lectures.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">No lectures found for the selected filters.</td>
              </tr>
            ) : (
              lectures.sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)).map(l => (
                <tr key={l.id} className="hover:bg-blue-50/50 cursor-pointer transition-colors" onClick={() => onEditLecture(l)}>
                  <td className="p-3">
                    <div className="font-medium text-slate-900">{new Date(l.date).toLocaleDateString()}</div>
                    <div className="text-xs text-slate-500">{l.startTime} - {l.endTime}</div>
                  </td>
                  <td className="p-3 font-medium text-slate-800">{l.batchId}</td>
                  <td className="p-3">
                    <div className="font-medium text-blue-700">{l.subjectId}</div>
                    <div className="text-xs text-slate-500">{l.lectureType}</div>
                  </td>
                  <td className="p-3 text-slate-700">{l.teacherId}</td>
                  <td className="p-3 text-slate-600">{l.roomId || 'Unassigned'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      l.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                      l.publishStatus === 'DRAFT' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {l.status === 'CANCELLED' ? 'Cancelled' : l.publishStatus === 'DRAFT' ? 'Draft' : 'Published'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  // Week View: Time/Day columns
  if (viewMode === 'week') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Legend */}
        <div className="flex items-center gap-6 px-6 py-4 border-b border-slate-100 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Lecture</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span> Lab</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span> Activity</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> Break</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span> Substitution</div>
        </div>

        <div className="flex bg-slate-50 min-h-[600px] overflow-x-auto">
          {DAYS.map((day, dayIndex) => {
            // Find lectures for this day
            const dayLectures = lectures.filter(l => {
              if (l.status === 'CANCELLED') return false;
              const d = new Date(l.date);
              const jsDay = d.getDay();
              const mapDay = jsDay === 0 ? 'Sunday' : DAYS[jsDay - 1];
              return mapDay === day;
            }).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

            return (
              <div key={day} className="flex-1 min-w-[200px] border-r border-slate-200 flex flex-col bg-white">
                <div className="p-4 border-b border-slate-200 bg-slate-50 text-center flex flex-col justify-center">
                  <span className="font-semibold text-slate-700">{day}</span>
                  {!isDefaultMode && selectedWeekStart && (
                    <span className="text-xs text-slate-500 font-medium mt-0.5">
                      {(() => {
                        const d = new Date(selectedWeekStart);
                        d.setDate(d.getDate() + dayIndex);
                        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                      })()}
                    </span>
                  )}
                </div>
                <div className="p-3 space-y-3 flex-1">
                  {dayLectures.map(lecture => {
                    if (lecture.activityType === 'Break') {
                      return (
                        <div 
                          key={lecture.id}
                          onClick={() => !readOnly && onEditLecture(lecture)}
                          className={`p-3 bg-slate-50 border border-slate-200 rounded-lg text-center transition-colors ${!readOnly ? 'cursor-pointer hover:bg-slate-100' : ''}`}
                        >
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{lecture.startTime} - {lecture.endTime}</div>
                          <div className="text-sm font-semibold text-slate-600 mt-1">Break</div>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={lecture.id}
                        onClick={() => !readOnly && onEditLecture(lecture)}
                        className={`p-3 border rounded-lg transition-shadow relative ${!readOnly ? 'cursor-pointer hover:shadow-md' : ''} ${getLectureColor(lecture.lectureType, lecture.isOverride)}`}
                      >
                        <div className="text-xs font-bold text-slate-700 opacity-70 mb-1">{lecture.startTime} - {lecture.endTime}</div>
                        <div className="font-bold text-slate-800 text-sm">{lecture.subjectId}</div>
                        <div className="text-slate-600 text-xs mt-1">{lecture.teacherId}</div>
                        <div className="text-slate-500 text-[11px] mt-1">{lecture.roomId || 'Room TBA'}</div>
                        {lecture.isOverride && (
                          <div className="absolute top-2 right-2 text-orange-500" title="Substitution">
                            <Repeat className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {!readOnly && (
                    <button 
                      onClick={() => {
                        let targetDate = selectedWeekStart;
                        if (!isDefaultMode && selectedWeekStart) {
                          const d = new Date(selectedWeekStart);
                          d.setDate(d.getDate() + dayIndex);
                          targetDate = d.toISOString().split('T')[0];
                        } else if (isDefaultMode) {
                          // In default mode, we just need ANY date that falls on this day of the week.
                          // Let's use a known Monday (e.g. 2024-01-01) and add dayIndex.
                          const d = new Date('2024-01-01T12:00:00Z');
                          d.setDate(d.getDate() + dayIndex);
                          targetDate = d.toISOString().split('T')[0];
                        }
                        
                        onEditLecture({ date: targetDate || new Date().toISOString() } as Lecture);
                      }}
                      className="w-full py-3 mt-2 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                    >
                      <Plus className="w-4 h-4" /> Add Activity
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Day View
  if (viewMode === 'day') {
    const today = selectedWeekStart ? new Date(selectedWeekStart) : new Date();
    const dayLectures = lectures.filter(l => l.date === today.toISOString().split('T')[0] && l.status !== 'CANCELLED')
                                .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
                                
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-6">{today.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>
        <div className="space-y-4">
          {dayLectures.length === 0 && <p className="text-slate-500 text-center py-10">No activities scheduled for this day.</p>}
          {dayLectures.map(lecture => (
            <div key={lecture.id} className="flex gap-6 items-start">
              <div className="w-32 pt-2 text-right">
                <div className="font-bold text-slate-800">{lecture.startTime}</div>
                <div className="text-sm text-slate-500">{lecture.endTime}</div>
              </div>
              <div className={`flex-1 p-4 rounded-xl border ${lecture.activityType === 'Break' ? 'bg-slate-50 border-slate-200' : getLectureColor(lecture.lectureType, lecture.isOverride)}`}>
                {lecture.activityType === 'Break' ? (
                  <div className="font-semibold text-slate-600">Break</div>
                ) : (
                  <>
                    <div className="font-bold text-slate-800">{lecture.subjectId}</div>
                    <div className="text-sm text-slate-600 mt-1">{lecture.teacherId} • {lecture.roomId || 'Room TBA'}</div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};
