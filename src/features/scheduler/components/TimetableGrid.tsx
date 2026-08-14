import React, { useMemo } from 'react';
import { Repeat, Plus } from 'lucide-react';
import type { Lecture } from '../types/scheduler';
import { timeToMinutes } from '../utils/schedulerUtils';
import teachersList from '../../../data/teachers.json';
import classroomsList from '../../../data/classrooms.json';

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

const getTeacherName = (id?: string) => {
  if (!id) return '';
  const teacher = teachersList.find(t => t.id === id);
  return teacher ? teacher.name : id;
};

const getRoomName = (id?: string) => {
  if (!id) return '';
  const room = classroomsList.find(r => r.id === id);
  return room ? room.name : id;
};

interface TimetableGridProps {
  lectures: Lecture[];
  viewMode: 'week' | 'day' | 'list';
  onEditLecture: (lecture: Lecture) => void;
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

export const TimetableGrid: React.FC<TimetableGridProps> = ({ lectures, viewMode, onEditLecture, selectedWeekStart, readOnly = false }) => {

  if (viewMode === 'list') {
    let filteredLectures = lectures;
    if (selectedWeekStart) {
      const start = parseLocalDate(selectedWeekStart);
      const end = parseLocalDate(selectedWeekStart);
      end.setDate(end.getDate() + 6);
      const startStr = formatLocalDate(start);
      const endStr = formatLocalDate(end);
      filteredLectures = lectures.filter(l => l.date >= startStr && l.date <= endStr);
    }

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
            {filteredLectures.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">No lectures found for the selected filters.</td>
              </tr>
            ) : (
              filteredLectures.sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)).map(l => (
                <tr key={l.id} className="hover:bg-blue-50/50 cursor-pointer transition-colors" onClick={() => onEditLecture(l)}>
                  <td className="p-3">
                    <div className="font-medium text-slate-900">{parseLocalDate(l.date).toLocaleDateString()}</div>
                    <div className="text-xs text-slate-500">{l.startTime} - {l.endTime}</div>
                  </td>
                  <td className="p-3 font-medium text-slate-800">{l.batchId}</td>
                  <td className="p-3">
                    <div className="font-medium text-blue-700">{l.subjectId}</div>
                    <div className="text-xs text-slate-500">{l.lectureType}</div>
                  </td>
                  <td className="p-3 text-slate-700">{getTeacherName(l.teacherId)}</td>
                  <td className="p-3 text-slate-600">{getRoomName(l.roomId) || 'Unassigned'}</td>
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
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden w-full">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 border-b border-slate-100 text-[11px] font-semibold text-slate-600 bg-slate-50/50">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Lecture</div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400"></span> Lab</div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400"></span> Activity</div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400"></span> Break</div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400"></span> Substitution</div>
        </div>

        {/* 6 Equal Days Grid - Fits full width with zero horizontal scrolling */}
        <div className="grid grid-cols-6 divide-x divide-slate-200 bg-slate-100/40 w-full">
          {DAYS.map((day, dayIndex) => {
            // Find lectures for this day
            const dayLectures = lectures.filter(l => {
              if (l.status === 'CANCELLED') return false;
              if (!selectedWeekStart) return false;
              const targetDate = parseLocalDate(selectedWeekStart);
              targetDate.setDate(targetDate.getDate() + dayIndex);
              const targetStr = formatLocalDate(targetDate);
              return l.date === targetStr;
            }).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

            return (
              <div key={day} className="min-w-0 flex flex-col bg-white">
                {/* Day Header */}
                <div className="p-2 border-b border-slate-200 bg-slate-50 text-center flex flex-col justify-center select-none">
                  <span className="font-bold text-slate-800 text-xs sm:text-sm truncate">{day}</span>
                  {selectedWeekStart && (
                    <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                      {(() => {
                        const d = parseLocalDate(selectedWeekStart);
                        d.setDate(d.getDate() + dayIndex);
                        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                      })()}
                    </span>
                  )}
                </div>

                {/* Lecture Cards Container */}
                <div className="p-1.5 sm:p-2 space-y-1.5 flex-1 min-h-[300px]">
                  {dayLectures.map(lecture => {
                    if (lecture.activityType === 'Break') {
                      return (
                        <div 
                          key={lecture.id}
                          onClick={() => !readOnly && onEditLecture(lecture)}
                          className={`p-2 bg-slate-100/70 border border-slate-200 rounded-lg text-center transition-colors ${!readOnly ? 'cursor-pointer hover:bg-slate-200/60' : ''}`}
                        >
                          <div className="text-[10px] font-bold text-slate-500 tracking-tight">{lecture.startTime} - {lecture.endTime}</div>
                          <div className="text-xs font-semibold text-slate-600 mt-0.5">Break</div>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={lecture.id}
                        onClick={() => !readOnly && onEditLecture(lecture)}
                        className={`p-2 sm:p-2.5 border rounded-lg transition-all relative ${!readOnly ? 'cursor-pointer hover:shadow-md hover:border-slate-300' : ''} ${getLectureColor(lecture.lectureType, lecture.isOverride)}`}
                      >
                        <div className="text-[10px] sm:text-[11px] font-bold text-slate-600 opacity-80 leading-tight mb-1">{lecture.startTime} - {lecture.endTime}</div>
                        <div className="font-bold text-slate-900 text-xs sm:text-sm leading-snug truncate" title={lecture.subjectId}>{lecture.subjectId}</div>
                        <div className="text-slate-600 text-[11px] truncate mt-0.5 leading-tight" title={getTeacherName(lecture.teacherId)}>{getTeacherName(lecture.teacherId)}</div>
                        <div className="text-slate-500 text-[10px] truncate leading-tight mt-0.5" title={getRoomName(lecture.roomId) || 'Room TBA'}>{getRoomName(lecture.roomId) || 'Room TBA'}</div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-500 bg-white/80 px-1.5 py-0.5 rounded border border-slate-200/60 leading-none">
                            {lecture.lectureType || 'Regular'}
                          </span>
                        </div>
                        {lecture.isOverride && (
                          <div className="absolute top-1.5 right-1.5 text-orange-500" title="Substitution">
                            <Repeat className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {!readOnly && (
                    <button
                      onClick={() => {
                        let targetDate = selectedWeekStart;
                        if (selectedWeekStart) {
                          const d = parseLocalDate(selectedWeekStart);
                          d.setDate(d.getDate() + dayIndex);
                          targetDate = formatLocalDate(d);
                        }
                        onEditLecture({ date: targetDate || formatLocalDate(new Date()) } as Lecture);
                      }}
                      className="w-full py-2 border border-dashed border-slate-200 rounded-lg text-slate-400 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1 text-xs font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Add</span>
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
    const today = selectedWeekStart ? parseLocalDate(selectedWeekStart) : new Date();
    const todayStr = formatLocalDate(today);
    const dayLectures = lectures.filter(l => l.date === todayStr && l.status !== 'CANCELLED')
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
                    <div className="text-sm text-slate-600 mt-1">{getTeacherName(lecture.teacherId)} • {getRoomName(lecture.roomId) || 'Room TBA'}</div>
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
