import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { 
  Calendar as CalendarIcon, MapPin, Clock, ArrowLeft, ArrowRight,
  BookOpen, AlertCircle, FileText, CheckCircle, ChevronLeft, ChevronRight
} from 'lucide-react';

import { TEACHER_ASSIGNED_BATCHES, INITIAL_SCHEDULE_CHANGES, INITIAL_EXAMS, INITIAL_ASSIGNMENTS } from '../../data/mockData';
import { useScheduler } from '../../features/scheduler/context/SchedulerContext';
import type { Lecture } from '../../features/scheduler/types/scheduler';

export const TeacherSchedule: React.FC = () => {
  const { currentUser, batches, branches, courses } = useApp();
  const { lectures } = useScheduler();
  const navigate = useNavigate();

  // View State
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'upcoming' | 'events' | 'changes'>('today');
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  
  // Date Navigation State
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Filter States
  const [filterYear, setFilterYear] = useState('All');
  const [filterBranch, setFilterBranch] = useState(currentUser?.role === 'branch-admin' ? currentUser.branch || 'All' : 'All');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterProgram, setFilterProgram] = useState('All');
  const [filterLevel, setFilterLevel] = useState('All');
  const [filterBatch, setFilterBatch] = useState('All');
  const [filterSubject, setFilterSubject] = useState('All');

  // Derived Filter Options
  const uniqueYears = Array.from(new Set(batches.map(b => b.academicYear).filter(Boolean))) as string[];
  const uniqueBranches = currentUser?.role === 'branch-admin' ? [currentUser.branch || ''] : branches.map(b => b.name);
  const uniqueCourses = courses.map(c => c.name);
  const uniquePrograms = Array.from(new Set(batches.map(b => b.program).filter(Boolean))) as string[];
  const uniqueLevels = Array.from(new Set(batches.map(b => b.level).filter(Boolean))) as string[];
  
  // Teacher's specific batches
  const dropdownBatches = batches.filter(b => {
    if (!TEACHER_ASSIGNED_BATCHES.includes(b.name)) return false;
    const batchBranch = b.branch || 'Mumbai West';
    const matchBranch = filterBranch === 'All' || batchBranch === filterBranch;
    const matchCourse = filterCourse === 'All' || b.course === filterCourse;
    const matchProgram = filterProgram === 'All' || b.program === filterProgram;
    const matchLevel = filterLevel === 'All' || b.level === filterLevel;
    const matchYear = filterYear === 'All' || b.academicYear === filterYear;
    return matchBranch && matchCourse && matchProgram && matchLevel && matchYear;
  });

  const activeBatches = filterBatch === 'All' ? dropdownBatches.map(b => b.name) : [filterBatch];

  const uniqueSubjects = Array.from(new Set(lectures.filter(l => activeBatches.includes(l.batchId)).map(l => l.subjectId).filter(Boolean))) as string[];

  // Filtered Data
  const filteredLectures = lectures.filter(l => {
    return activeBatches.includes(l.batchId) && (filterSubject === 'All' || l.subjectId === filterSubject);
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const currentDateStr = currentDate.toISOString().split('T')[0];

  const handleNextDay = () => setCurrentDate(new Date(currentDate.getTime() + 86400000));
  const handlePrevDay = () => setCurrentDate(new Date(currentDate.getTime() - 86400000));
  
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    return new Date(d.setDate(diff));
  };
  const weekStart = getWeekStart(currentDate);

  const getDayString = (offset: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0];
  };

  // ----------------------------------------------------
  // HELPERS
  // ----------------------------------------------------
  const calculateDuration = (start: string, end: string) => {
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
    return mins / 60;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Academic Schedule</h2>
          <p className="text-sm text-slate-500 mt-1">View your assigned lectures, classes, academic activities and schedule changes.</p>
        </div>
        <Button variant="secondary" onClick={() => setCurrentDate(new Date())}>
          <CalendarIcon size={16} className="mr-2" />
          Today
        </Button>
      </div>

      {/* CONTEXT FILTERS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
          Schedule Context
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
          <Select 
            label="Academic Year" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}
            options={[{ value: 'All', label: 'All Years' }, ...uniqueYears.map(y => ({ value: y, label: y }))]}
          />
          <Select 
            label="Branch" value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}
            options={[{ value: 'All', label: 'All Branches' }, ...uniqueBranches.map(b => ({ value: b, label: b }))]}
          />
          <Select 
            label="Course" value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}
            options={[{ value: 'All', label: 'All Courses' }, ...uniqueCourses.map(c => ({ value: c, label: c }))]}
          />
          <Select 
            label="Program" value={filterProgram} onChange={(e) => setFilterProgram(e.target.value)}
            options={[{ value: 'All', label: 'All Programs' }, ...uniquePrograms.map(p => ({ value: p, label: p }))]}
          />
          <Select 
            label="Level" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}
            options={[{ value: 'All', label: 'All Levels' }, ...uniqueLevels.map(l => ({ value: l, label: l }))]}
          />
          <Select 
            label="My Batches" value={filterBatch} onChange={(e) => setFilterBatch(e.target.value)}
            options={[{ value: 'All', label: 'All My Batches' }, ...dropdownBatches.map(b => ({ value: b.name, label: b.name }))]}
          />
          <Select 
            label="My Subjects" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}
            options={[{ value: 'All', label: 'All My Subjects' }, ...uniqueSubjects.map(s => ({ value: s, label: s }))]}
          />
        </div>
      </div>

      {/* SCHEDULE WORKSPACE */}
      <Card className="overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto hide-scrollbar bg-slate-50">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'Week' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'events', label: 'Academic Events' },
            { id: 'changes', label: 'Changes' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-none px-6 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.id 
                ? 'border-blue-600 text-blue-700 bg-white' 
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 bg-white min-h-[500px]">
          {/* TODAY TAB */}
          {activeTab === 'today' && (
            <div className="space-y-4">
              {filteredLectures.filter(l => l.date === todayStr).length > 0 ? (
                filteredLectures.filter(l => l.date === todayStr).map(lecture => (
                  <div key={lecture.id} onClick={() => setSelectedLecture(lecture)} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-blue-300 transition-colors cursor-pointer">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{lecture.startTime} – {lecture.endTime}</div>
                      <div className="text-base font-semibold text-blue-700 mt-1">{lecture.subjectId}</div>
                      <div className="text-sm text-slate-600 mt-0.5">{lecture.batchId} • {lecture.lectureType}</div>
                      <div className="flex items-center gap-3 mt-2 text-xs font-semibold">
                        <span className="flex items-center gap-1 text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded-md"><MapPin size={12}/> {lecture.roomId}</span>
                        {lecture.status === 'SCHEDULED' && <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md"><CheckCircle size={12}/> Attendance Pending</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border text-center ${
                        lecture.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {lecture.status}
                      </span>
                      <Button variant="primary" size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); navigate('/attendance'); }}>
                        Mark Attendance
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <CalendarIcon className="text-slate-300 mb-3" size={32} />
                  <div className="text-slate-500 font-medium">No lectures scheduled for today.</div>
                </div>
              )}
            </div>
          )}

          {/* UPCOMING TAB */}
          {activeTab === 'upcoming' && (
            <div className="space-y-6">
              {filteredLectures.filter(l => l.date > todayStr).length > 0 ? (
                Object.entries(
                  filteredLectures
                    .filter(l => l.date > todayStr)
                    .reduce((acc, l) => {
                      if (!acc[l.date]) acc[l.date] = [];
                      acc[l.date].push(l);
                      return acc;
                    }, {} as Record<string, typeof filteredLectures>)
                ).sort(([a], [b]) => a.localeCompare(b)).map(([dateStr, dayLectures]) => {
                  const dateObj = new Date(dateStr);
                  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
                  const dayNum = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'long' }).toUpperCase();
                  return (
                    <div key={dateStr} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="text-xs font-bold text-slate-500 tracking-wider">
                          {dayName} — {dayNum}
                        </div>
                        <div className="h-px bg-slate-200 flex-1"></div>
                      </div>
                      <div className="space-y-3">
                        {dayLectures.map(lecture => (
                          <div key={lecture.id} onClick={() => setSelectedLecture(lecture)} className="p-4 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-blue-300 transition-colors cursor-pointer">
                            <div>
                              <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                <Clock size={14} className="text-slate-400"/> {lecture.startTime} – {lecture.endTime}
                              </div>
                              <div className="text-sm font-bold text-blue-700 mt-1">{lecture.subjectId}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{lecture.batchId} • {lecture.roomId}</div>
                            </div>
                            <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedLecture(lecture); }}>
                              Details
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <CalendarIcon className="text-slate-300 mb-3" size={32} />
                  <div className="text-slate-500 font-medium">No upcoming lectures in the next 7 days.</div>
                </div>
              )}
            </div>
          )}

          {/* WEEK TAB */}
          {activeTab === 'week' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => setCurrentDate(new Date(currentDate.getTime() - 7 * 86400000))} className="p-2"><ChevronLeft size={16}/></Button>
                  <Button variant="secondary" onClick={() => setCurrentDate(new Date(currentDate.getTime() + 7 * 86400000))} className="p-2"><ChevronRight size={16}/></Button>
                  <Button variant="secondary" onClick={() => setCurrentDate(new Date())} className="text-xs">Current Week</Button>
                </div>
                <div className="text-sm font-bold text-slate-800">
                  Week: {weekStart.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })} - {new Date(weekStart.getTime() + 5 * 86400000).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>

              {/* Week Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                {(() => {
                  const weekLectures = filteredLectures.filter(l => l.date >= getDayString(0) && l.date <= getDayString(6));
                  const hours = weekLectures.reduce((acc, l) => acc + calculateDuration(l.startTime, l.endTime), 0);
                  const subjectsCount = new Set(weekLectures.map(l => l.subjectId)).size;
                  const batchesCount = new Set(weekLectures.map(l => l.batchId)).size;
                  return (
                    <>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Lectures</div>
                        <div className="text-xl font-bold text-slate-800 mt-1">{weekLectures.length}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Teaching Hours</div>
                        <div className="text-xl font-bold text-slate-800 mt-1">{hours.toFixed(1)} hrs</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Batches</div>
                        <div className="text-xl font-bold text-slate-800 mt-1">{batchesCount}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subjects</div>
                        <div className="text-xl font-bold text-slate-800 mt-1">{subjectsCount}</div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* CSS Grid Timetable */}
              <div className="overflow-x-auto">
                <div className="min-w-[800px] border border-slate-200 rounded-xl overflow-hidden flex">
                  {[0, 1, 2, 3, 4, 5].map((offset) => {
                    const dayDateStr = getDayString(offset);
                    const dayLectures = filteredLectures.filter(l => l.date === dayDateStr);
                    const isToday = dayDateStr === todayStr;
                    return (
                      <div key={offset} className={`flex-1 border-r last:border-r-0 border-slate-200 ${isToday ? 'bg-blue-50/30' : 'bg-slate-50/30'}`}>
                        <div className={`p-3 text-center border-b border-slate-200 ${isToday ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'}`}>
                          <div className="text-xs font-bold uppercase tracking-widest">
                            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][offset]}
                          </div>
                          <div className="text-[10px] font-semibold mt-0.5 opacity-80">
                            {new Date(dayDateStr).getDate()}
                          </div>
                        </div>
                        <div className="p-2 space-y-2 min-h-[300px]">
                          {dayLectures.length > 0 ? dayLectures.map(lecture => (
                            <div key={lecture.id} onClick={() => setSelectedLecture(lecture)} className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-blue-400 cursor-pointer group">
                              <div className="text-xs font-bold text-slate-800">{lecture.startTime} - {lecture.endTime}</div>
                              <div className="text-xs font-semibold text-blue-700 mt-1 truncate">{lecture.subjectId}</div>
                              <div className="text-[10px] font-semibold text-slate-500 mt-1 truncate">{lecture.batchId}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5 truncate flex items-center gap-1"><MapPin size={10}/> {lecture.roomId}</div>
                            </div>
                          )) : (
                            <div className="h-full w-full flex items-center justify-center pt-8 text-[10px] text-slate-300 font-bold uppercase">
                              No Classes
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ACADEMIC EVENTS TAB */}
          {activeTab === 'events' && (
            <div className="space-y-4">
              {(() => {
                const events = [
                  ...INITIAL_EXAMS.filter(e => activeBatches.includes(e.batch)).map(e => ({ type: 'EXAM', title: e.name, batch: e.batch, date: '12 Aug 2026', time: '10:00 AM – 12:00 PM', location: 'Room 101' })),
                  ...INITIAL_ASSIGNMENTS.filter(a => activeBatches.includes(a.batchId)).map(a => ({ type: 'ASSIGNMENT DEADLINE', title: a.title, batch: a.batchId, date: '13 Aug 2026', time: '11:59 PM', location: 'Online Submission' }))
                ];
                return events.length > 0 ? (
                  events.map((ev, i) => (
                    <div key={i} className="p-4 bg-white border border-slate-200 hover:border-blue-300 rounded-xl flex flex-col sm:flex-row justify-between gap-4 cursor-pointer transition-colors">
                      <div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${ev.type === 'EXAM' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                          {ev.type}
                        </span>
                        <div className="text-base font-bold text-slate-900 mt-2">{ev.title}</div>
                        <div className="text-sm font-semibold text-slate-600 mt-1">{ev.batch}</div>
                      </div>
                      <div className="flex flex-col gap-1 text-sm text-slate-600 min-w-[200px]">
                        <span className="flex items-center gap-2"><CalendarIcon size={14}/> {ev.date}</span>
                        <span className="flex items-center gap-2"><Clock size={14}/> {ev.time}</span>
                        <span className="flex items-center gap-2"><MapPin size={14}/> {ev.location}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center flex flex-col items-center justify-center">
                    <FileText className="text-slate-300 mb-3" size={32} />
                    <div className="text-slate-500 font-medium">No upcoming academic events.</div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* CHANGES TAB */}
          {activeTab === 'changes' && (
            <div className="space-y-4">
              {INITIAL_SCHEDULE_CHANGES.filter(c => activeBatches.includes(c.batchId)).length > 0 ? (
                INITIAL_SCHEDULE_CHANGES.filter(c => activeBatches.includes(c.batchId)).map(change => (
                  <div key={change.id} className="p-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl flex flex-col gap-3 transition-colors cursor-pointer">
                    <div className="flex justify-between items-start">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${
                        change.type === 'ROOM_CHANGE' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                        change.type === 'CANCELLED' ? 'bg-red-50 text-red-600 border-red-100' : 
                        'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        {change.type.replace('_', ' ')}
                      </span>
                      <span className={`text-xs font-bold ${change.status === 'Upcoming' ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {change.status}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-700">{change.subject}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{change.batchId}</div>
                      
                      <div className="text-xs font-semibold text-slate-500 mt-2">{change.dateTime}</div>
                      
                      <div className="mt-3 flex items-center gap-3 text-sm font-semibold bg-slate-50 p-2 rounded-lg border border-slate-100 w-fit">
                        <span className="text-slate-600 line-through decoration-slate-400">{change.previousValue}</span>
                        {change.newValue && (
                          <>
                            <ArrowRight size={14} className="text-slate-400" />
                            <span className="text-slate-900">{change.newValue}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <AlertCircle className="text-slate-300 mb-3" size={32} />
                  <div className="text-slate-500 font-medium">No recent schedule changes.</div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* LECTURE DETAILS MODAL */}
      <Modal isOpen={!!selectedLecture} onClose={() => setSelectedLecture(null)} title="Lecture Details">
        {selectedLecture && (
          <div className="space-y-6">
            <div>
              <div className="text-xl font-bold text-slate-900">{selectedLecture.subjectId}</div>
              <div className="text-sm text-slate-500 mt-1">Type: {selectedLecture.lectureType || 'Not specified'}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase">Date & Time</div>
                <div className="text-sm font-semibold text-slate-800 mt-1">
                  {new Date(selectedLecture.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}<br/>
                  {selectedLecture.startTime} - {selectedLecture.endTime}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase">Location</div>
                <div className="text-sm font-semibold text-slate-800 mt-1">{selectedLecture.roomId}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase">Academic Context</div>
              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Batch</span>
                  <span className="font-bold text-blue-800">{selectedLecture.batchId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className="font-bold text-blue-800">{selectedLecture.status}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <Button variant="primary" className="flex-1" onClick={() => navigate('/attendance')}>
                Mark Attendance
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => setSelectedLecture(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};
