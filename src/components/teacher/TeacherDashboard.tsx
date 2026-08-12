import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useScheduler } from '../../features/scheduler/context/SchedulerContext';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { BookOpen, Calendar, HelpCircle, GraduationCap, ArrowLeft, Clock, MapPin, AlertCircle, FileText, CheckCircle } from 'lucide-react';
import { TEACHER_ASSIGNED_BATCHES, INITIAL_EXAMS, INITIAL_ASSIGNMENTS, INITIAL_SCHEDULE_CHANGES } from '../../data/mockData';

export const TeacherDashboard: React.FC = () => {
  const { currentUser, doubts, sendDoubtReply, addToast, batches, branches, courses, students } = useApp();
  const { lectures } = useScheduler();

  // Global Filters
  const [filterBranch, setFilterBranch] = useState(currentUser?.role === 'branch-admin' ? currentUser.branch || 'All' : 'All');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterProgram, setFilterProgram] = useState('All');
  const [filterLevel, setFilterLevel] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  const [filterBatch, setFilterBatch] = useState('All');

  const uniqueBranches = currentUser?.role === 'branch-admin' ? [currentUser.branch || ''] : branches.map(b => b.name);
  const uniqueCourses = courses.map(c => c.name);
  const uniquePrograms = Array.from(new Set(batches.map(b => b.program).filter(Boolean))) as string[];
  const uniqueLevels = Array.from(new Set(batches.map(b => b.level).filter(Boolean))) as string[];
  const uniqueYears = Array.from(new Set(batches.map(b => b.academicYear).filter(Boolean))) as string[];

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

  React.useEffect(() => {
    if (filterBatch !== 'All') {
      const exists = dropdownBatches.some(b => b.name === filterBatch);
      if (!exists) setFilterBatch('All');
    }
  }, [filterBranch, filterCourse, filterProgram, filterLevel, filterYear]);

  const activeBatches = filterBatch === 'All' ? dropdownBatches.map(b => b.name) : [filterBatch];

  const unresolvedDoubts = doubts.filter(d => {
    if (d.status !== 'Pending') return false;
    const student = students.find(s => s.name === d.studentName);
    const studentBatch = student?.batch || '';
    return activeBatches.includes(studentBatch) || studentBatch === '';
  });

  // Modal and response states
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [activeDoubtId, setActiveDoubtId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');

  // Tab State
  const [scheduleTab, setScheduleTab] = useState<'today' | 'upcoming' | 'weekly' | 'events' | 'changes'>('today');

  // Dashboard Filters
  const [doubtFilter, setDoubtFilter] = useState<'All' | 'Pending' | 'Resolved'>('All');
  const [lectureFilter, setLectureFilter] = useState('All');

  const filteredDoubts = doubts.filter(d => {
    const student = students.find(s => s.name === d.studentName);
    const studentBatch = student?.batch || '';
    const matchBatch = activeBatches.includes(studentBatch) || studentBatch === '';
    const matchStatus = doubtFilter === 'All' || d.status === doubtFilter;
    return matchBatch && matchStatus;
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 2;
  const paginatedDoubts = filteredDoubts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredDoubts.length / itemsPerPage);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [doubtFilter]);

  const filteredLectures = lectures.filter(l => {
    const matchBatch = activeBatches.includes(l.batchId);
    const matchLectureFilter = lectureFilter === 'All' || l.batchId === lectureFilter;
    const isPublished = l.publishStatus === 'PUBLISHED' && l.status !== 'CANCELLED';
    return matchBatch && matchLectureFilter && isPublished;
  });

  const handleQuickAnswer = (id: string) => {
    setActiveDoubtId(id);
    setResponseText('');
    setShowAnswerModal(true);
  };

  const handleAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeDoubtId && responseText.trim()) {
      sendDoubtReply(activeDoubtId, responseText);
      setShowAnswerModal(false);
      setActiveDoubtId(null);
      setResponseText('');
      addToast('Academic response submitted successfully!');
    }
  };

  if (showAnswerModal) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAnswerModal(false)}
            className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={26} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">Compose Academic Response</h2>
            <p className="text-sm text-slate-500">Provide an explanation or reply details to the student doubt question.</p>
          </div>
        </div>

        <div className="w-full">
          <form onSubmit={handleAnswerSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Teacher Answer text</label>
              <textarea 
                required 
                rows={5}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 font-medium"
                placeholder="Type your explanation or response details here..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setShowAnswerModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Submit Response</Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">
          Faculty Academic Portal
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Welcome back, <strong className="font-semibold text-slate-800">{currentUser?.name}</strong>. Answer student questions and review schedule timelines.
        </p>
      </div>

      {/* Global Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
        <Select 
          label="Branch" 
          value={filterBranch} 
          onChange={(e) => setFilterBranch(e.target.value)} 
          options={[{ value: 'All', label: 'All Branches' }, ...uniqueBranches.map(b => ({ value: b, label: b }))]}
        />
        <Select 
          label="Course" 
          value={filterCourse} 
          onChange={(e) => setFilterCourse(e.target.value)} 
          options={[{ value: 'All', label: 'All Courses' }, ...uniqueCourses.map(c => ({ value: c, label: c }))]}
        />
        <Select 
          label="Program" 
          value={filterProgram} 
          onChange={(e) => setFilterProgram(e.target.value)} 
          options={[{ value: 'All', label: 'All Programs' }, ...uniquePrograms.map(p => ({ value: p, label: p }))]}
        />
        <Select 
          label="Level" 
          value={filterLevel} 
          onChange={(e) => setFilterLevel(e.target.value)} 
          options={[{ value: 'All', label: 'All Levels' }, ...uniqueLevels.map(l => ({ value: l, label: l }))]}
        />
        <Select 
          label="Academic Year" 
          value={filterYear} 
          onChange={(e) => setFilterYear(e.target.value)} 
          options={[{ value: 'All', label: 'All Years' }, ...uniqueYears.map(y => ({ value: y, label: y }))]}
        />
        <Select 
          label="Target Batch" 
          value={filterBatch} 
          onChange={(e) => setFilterBatch(e.target.value)} 
          options={[{ value: 'All', label: 'All Batches' }, ...dropdownBatches.map(b => ({ value: b.name, label: b.name }))]}
        />
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Batches</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1">{activeBatches.length}</div>
            </div>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
              <BookOpen size={22} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Lectures Today</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1">{filteredLectures.length}</div>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
              <Calendar size={22} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pending Doubts</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1">{unresolvedDoubts.length}</div>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100">
              <HelpCircle size={22} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Class Average Score</div>
              <div className="text-3xl font-display font-bold text-slate-900 mt-1">83.8%</div>
            </div>
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center border border-purple-100">
              <GraduationCap size={22} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center w-full">
                <CardTitle>Academic doubts forum Q&amp;A</CardTitle>
                <div className="w-40">
                  <Select
                    value={doubtFilter}
                    onChange={(e) => setDoubtFilter(e.target.value as any)}
                    options={[
                      { value: 'All', label: 'All Status' },
                      { value: 'Pending', label: 'Pending' },
                      { value: 'Resolved', label: 'Resolved' }
                    ]}
                  />
                </div>
              </div>
            </CardHeader>
            <div className="space-y-4">
              {paginatedDoubts.map((d, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                    <span>STUDENT: {d.studentName} ({d.subject})</span>
                    <span className={`px-2 py-0.5 rounded border ${
                      d.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {d.status}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-800">Q: "{d.messages[0]?.text}"</div>
                  
                  {d.messages.slice(1).map((r, rIdx) => (
                    <div key={rIdx} className="pl-4 border-l-2 border-slate-300 py-1 space-y-1">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">{r.sender} • {r.time}</div>
                      <p className="text-xs text-slate-600 font-semibold leading-relaxed">"{r.text}"</p>
                    </div>
                  ))}

                  {d.status !== 'Resolved' && (
                    <div className="flex justify-end pt-1">
                      <Button variant="secondary" size="sm" onClick={() => handleQuickAnswer(d.id)}>
                        Answer Question
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs font-semibold text-slate-500 shadow-sm select-none mt-4">
                <div>
                  Showing <span className="text-slate-800 font-bold">{Math.min((currentPage - 1) * itemsPerPage + 1, doubts.length)}</span> to <span className="text-slate-800 font-bold">{Math.min(currentPage * itemsPerPage, doubts.length)}</span> of <span className="text-slate-855 font-bold">{doubts.length}</span> doubts
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentPage(i + 1)}
                      className={`px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                        currentPage === i + 1
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-1">
          {/* Schedule Component */}
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 p-5">
               <h3 className="text-lg font-bold text-slate-900">Schedule</h3>
               <p className="text-sm text-slate-500">Your teaching schedule and academic activities</p>
            </div>
            <div className="flex border-b border-slate-100 overflow-x-auto hide-scrollbar bg-white">
              <button 
                onClick={() => setScheduleTab('today')}
                className={`flex-none px-5 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${scheduleTab === 'today' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                Today
              </button>
              <button 
                onClick={() => setScheduleTab('weekly')}
                className={`flex-none px-5 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${scheduleTab === 'weekly' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                Weekly Schedule
              </button>
            </div>
            
            <div className="p-5 bg-white min-h-[300px]">
              {/* TODAY TAB */}
              {scheduleTab === 'today' && (
                <div className="space-y-4">
                  {filteredLectures.filter(l => l.date === new Date().toISOString().split('T')[0]).length > 0 ? (
                    filteredLectures.filter(l => l.date === new Date().toISOString().split('T')[0]).map(lecture => (
                      <div key={lecture.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-blue-200 transition-colors cursor-pointer">
                        <div>
                          <div className="text-sm font-bold text-slate-900">{lecture.startTime} – {lecture.endTime}</div>
                          <div className="text-base font-semibold text-blue-700 mt-1">{lecture.subjectId}</div>
                          <div className="text-sm text-slate-600 mt-0.5">{lecture.batchId}</div>
                          <div className="flex items-center gap-3 mt-2 text-xs font-semibold">
                            <span className="flex items-center gap-1 text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded-md"><MapPin size={12}/> {lecture.roomId}</span>
                            <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md"><Clock size={12}/> Attendance Pending</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-100 text-center">
                            Upcoming
                          </span>
                          <Button variant="primary" size="sm" className="w-full">Mark Attendance</Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center flex flex-col items-center justify-center">
                      <Calendar className="text-slate-300 mb-3" size={32} />
                      <div className="text-slate-500 font-medium">No lectures scheduled for today.</div>
                    </div>
                  )}
                </div>
              )}

              {/* UPCOMING TAB */}
              {scheduleTab === 'upcoming' && (
                <div className="space-y-6">
                  {filteredLectures.filter(l => l.date > new Date().toISOString().split('T')[0]).length > 0 ? (
                    Object.entries(
                      filteredLectures
                        .filter(l => l.date > new Date().toISOString().split('T')[0])
                        .reduce((acc, l) => {
                          if (!acc[l.date]) acc[l.date] = [];
                          acc[l.date].push(l);
                          return acc;
                        }, {} as Record<string, typeof filteredLectures>)
                    ).sort(([a], [b]) => a.localeCompare(b)).map(([dateStr, dayLectures]) => {
                      const dateObj = new Date(dateStr);
                      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                      const dayNum = dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }).toUpperCase();
                      return (
                        <div key={dateStr} className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="text-xs font-bold text-slate-500 tracking-wider w-24">
                              {dayName} — {dayNum}
                            </div>
                            <div className="h-px bg-slate-200 flex-1"></div>
                            <div className="text-xs font-semibold text-slate-400">{dayLectures.length} lectures</div>
                          </div>
                          <div className="space-y-3 pl-0 sm:pl-28">
                            {dayLectures.map(lecture => (
                              <div key={lecture.id} className="p-3 bg-white border border-slate-200 rounded-lg flex justify-between items-center hover:border-blue-300 transition-colors cursor-pointer">
                                <div>
                                  <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                    <Clock size={14} className="text-slate-400"/> {lecture.startTime} – {lecture.endTime}
                                  </div>
                                  <div className="text-sm font-bold text-blue-700 mt-1">{lecture.subjectId}</div>
                                  <div className="text-xs text-slate-500 mt-0.5">{lecture.batchId} • {lecture.roomId}</div>
                                </div>
                                <Button variant="secondary" size="sm">Details</Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="py-12 text-center flex flex-col items-center justify-center">
                      <Calendar className="text-slate-300 mb-3" size={32} />
                      <div className="text-slate-500 font-medium">No upcoming lectures in the next 7 days.</div>
                    </div>
                  )}
                </div>
              )}

              {/* WEEKLY SCHEDULE TAB */}
              {scheduleTab === 'weekly' && (
                <div className="space-y-4">
                  {filteredLectures.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="border border-slate-200 rounded-xl overflow-hidden">
                          <div className="bg-slate-100 p-2 text-center text-xs font-bold text-slate-700 uppercase tracking-widest border-b border-slate-200">
                            {day}
                          </div>
                          <div className="p-3 space-y-2 min-h-[100px] bg-slate-50/50">
                            {/* Rendering a mock weekly view based on existing lectures spread out roughly */}
                            {filteredLectures.slice(0, Math.floor(Math.random() * 3) + 1).map((l, i) => (
                              <div key={i} className="p-2 bg-white border border-slate-200 rounded-md shadow-sm hover:border-blue-400 cursor-pointer">
                                <div className="text-xs font-bold text-slate-800">{l.startTime}</div>
                                <div className="text-xs font-semibold text-blue-700 truncate">{l.subjectId}</div>
                                <div className="text-[10px] text-slate-500 truncate">{l.batchId}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center flex flex-col items-center justify-center">
                      <Calendar className="text-slate-300 mb-3" size={32} />
                      <div className="text-slate-500 font-medium">No scheduled lectures for this week.</div>
                    </div>
                  )}
                </div>
              )}

              {/* ACADEMIC EVENTS TAB */}
              {scheduleTab === 'events' && (
                <div className="space-y-4">
                  {(() => {
                    const events = [
                      ...INITIAL_EXAMS.filter(e => activeBatches.includes(e.batch)).map(e => ({ type: 'EXAM', title: e.name, batch: e.batch, date: '12 Aug', time: '10:00 AM – 12:00 PM', location: 'Room 101' })),
                      ...INITIAL_ASSIGNMENTS.filter(a => activeBatches.includes(a.batchId)).map(a => ({ type: 'ASSIGNMENT DEADLINE', title: a.title, batch: a.batchId, date: '13 Aug', time: '11:59 PM', location: 'Online' }))
                    ];
                    return events.length > 0 ? (
                      events.map((ev, i) => (
                        <div key={i} className="p-4 bg-white border border-slate-200 hover:border-blue-300 rounded-xl flex flex-col sm:flex-row justify-between gap-4 cursor-pointer">
                          <div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${ev.type === 'EXAM' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                              {ev.type}
                            </span>
                            <div className="text-base font-bold text-slate-900 mt-2">{ev.title}</div>
                            <div className="text-sm font-semibold text-slate-600 mt-1">{ev.batch}</div>
                          </div>
                          <div className="flex flex-col gap-1 text-sm text-slate-600">
                            <span className="flex items-center gap-2"><Calendar size={14}/> {ev.date}</span>
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
              {scheduleTab === 'changes' && (
                <div className="space-y-4">
                  {INITIAL_SCHEDULE_CHANGES.filter(c => activeBatches.includes(c.batchId)).length > 0 ? (
                    INITIAL_SCHEDULE_CHANGES.filter(c => activeBatches.includes(c.batchId)).map(change => (
                      <div key={change.id} className="p-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl flex flex-col gap-3 cursor-pointer">
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
                          <div className="text-sm font-bold text-slate-800">{change.subject} — {change.batchId}</div>
                          <div className="text-xs font-semibold text-slate-500 mt-1">{change.dateTime}</div>
                          <div className="mt-3 flex items-center gap-3 text-sm font-semibold bg-slate-50 p-2 rounded-lg border border-slate-100 w-fit">
                            <span className="text-slate-600 line-through decoration-slate-400">{change.previousValue}</span>
                            {change.newValue && (
                              <>
                                <ArrowLeft size={14} className="text-slate-400 rotate-180" />
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
        </div>
      </div>
    </div>
  );
};
