import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useScheduler } from '../../features/scheduler/context/SchedulerContext';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, HelpCircle, GraduationCap, ArrowLeft, Clock, MapPin, AlertCircle, FileText, CheckCircle } from 'lucide-react';
import { TEACHER_ASSIGNED_BATCHES, INITIAL_EXAMS, INITIAL_ASSIGNMENTS } from '../../data/mockData';
import teachersList from '../../data/teachers.json';
import classroomsList from '../../data/classrooms.json';
import courseHierarchy from '../../data/courseHierarchy.json';

const getTeacherName = (id?: string) => {
  if (!id) return '';
  const teacher = teachersList.find(t => t.id === id || t.name === id);
  return teacher ? teacher.name : id;
};

const getRoomName = (id?: string) => {
  if (!id) return '';
  const room = classroomsList.find(r => r.id === id || r.name === id);
  return room ? room.name : id;
};

export const TeacherDashboard: React.FC = () => {
  const { currentUser, doubts, sendDoubtReply, addToast, batches, branches, courses, students } = useApp();
  const { lectures, updateLecture } = useScheduler();
  const navigate = useNavigate();

  // Find logged-in teacher from teachers.json
  const currentTeacher = useMemo(() => {
    return teachersList.find(t =>
      t.id === currentUser?.id ||
      t.name === currentUser?.name ||
      (currentUser?.email && t.name.toLowerCase().includes(currentUser.email.split('@')[0]))
    ) || teachersList.find(t => t.id === 'EMP-002') || teachersList[0];
  }, [currentUser]);

  // Global Filters
  const [filterBranch, setFilterBranch] = useState(currentUser?.role === 'branch-admin' ? currentUser.branch || 'All' : 'All');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterProgram, setFilterProgram] = useState('All');
  const [filterLevel, setFilterLevel] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  const [filterBatch, setFilterBatch] = useState('All');

  const uniqueBranches = useMemo(() => currentUser?.role === 'branch-admin' ? [currentUser.branch || ''] : branches.map(b => b.name), [currentUser, branches]);
  const uniqueCourses = useMemo(() => courseHierarchy.map(c => c.courseName), []);

  const uniquePrograms = useMemo(() => {
    if (filterCourse === 'All') {
      return Array.from(new Set(courseHierarchy.flatMap(c => c.programs.map(p => p.programName))));
    }
    const c = courseHierarchy.find(x => x.courseName === filterCourse);
    return c ? c.programs.map(p => p.programName) : [];
  }, [filterCourse]);

  const uniqueLevels = useMemo(() => {
    if (filterCourse === 'All') {
      return Array.from(new Set(courseHierarchy.flatMap(c => c.programs.flatMap(p => p.levels.map(l => l.levelName)))));
    }
    const c = courseHierarchy.find(x => x.courseName === filterCourse);
    if (filterProgram === 'All') {
      return Array.from(new Set(c ? c.programs.flatMap(p => p.levels.map(l => l.levelName)) : []));
    }
    const p = c?.programs.find(x => x.programName === filterProgram);
    return p ? p.levels.map(l => l.levelName) : [];
  }, [filterCourse, filterProgram]);

  const uniqueYears = useMemo(() => Array.from(new Set(batches.map(b => b.academicYear).filter(Boolean))) as string[], [batches]);

  // Teacher's specific assigned batches from teachers.json
  const teacherAssignedBatches = useMemo(() => {
    if (currentTeacher?.batches && currentTeacher.batches.length > 0) {
      return currentTeacher.batches;
    }
    return TEACHER_ASSIGNED_BATCHES;
  }, [currentTeacher]);

  const dropdownBatches = useMemo(() => {
    return batches.filter(b => {
      if (teacherAssignedBatches.length > 0 && !teacherAssignedBatches.includes(b.name)) return false;
      const batchBranch = b.branch || 'Mumbai West';
      const matchBranch = filterBranch === 'All' || batchBranch === filterBranch || (branches.find(br => br.code === filterBranch)?.name === batchBranch);
      const matchCourse = filterCourse === 'All' || b.course === filterCourse;
      const matchProgram = filterProgram === 'All' || b.program === filterProgram;
      const matchLevel = filterLevel === 'All' || b.level === filterLevel;
      const matchYear = filterYear === 'All' || b.academicYear === filterYear;
      return matchBranch && matchCourse && matchProgram && matchLevel && matchYear;
    });
  }, [batches, teacherAssignedBatches, filterBranch, filterCourse, filterProgram, filterLevel, filterYear, branches]);

  React.useEffect(() => {
    if (filterBatch !== 'All') {
      const exists = dropdownBatches.some(b => b.name === filterBatch);
      if (!exists) setFilterBatch('All');
    }
  }, [filterBranch, filterCourse, filterProgram, filterLevel, filterYear]);

  const activeBatches = useMemo(() => {
    return filterBatch === 'All' ? dropdownBatches.map(b => b.name) : [filterBatch];
  }, [filterBatch, dropdownBatches]);

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

  // Filtered Lectures from db.json
  const filteredLectures = useMemo(() => {
    return lectures.filter(l => {
      if (l.status === 'CANCELLED') return false;
      const isTeacherMatch = !currentTeacher || l.teacherId === currentTeacher.id || l.teacherId === currentTeacher.name || teacherAssignedBatches.includes(l.batchId);
      if (!isTeacherMatch) return false;
      const matchBatch = activeBatches.includes(l.batchId);
      const matchLectureFilter = lectureFilter === 'All' || l.batchId === lectureFilter;
      return matchBatch && matchLectureFilter;
    });
  }, [lectures, currentTeacher, teacherAssignedBatches, activeBatches, lectureFilter]);

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
        <div className="lg:col-span-1 flex flex-col h-[680px]">
          <Card className="flex flex-col h-full flex-1 p-5 overflow-hidden">
            <CardHeader className="px-0 pt-0 pb-5 border-b border-slate-100 flex-shrink-0">
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
            <div className="space-y-4 flex-1 overflow-y-auto pr-1 mt-4">
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
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs font-semibold text-slate-500 shadow-sm select-none mt-4 flex-shrink-0">
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

        <div className="lg:col-span-1 flex flex-col h-[680px]">
          {/* Schedule Component */}
          <Card className="overflow-hidden h-full flex flex-col flex-1">
            <div className="border-b border-slate-100 bg-slate-50 p-5 flex-shrink-0">
               <h3 className="text-lg font-bold text-slate-900">Schedule</h3>
               <p className="text-sm text-slate-500">Your teaching schedule and academic activities</p>
            </div>
            <div className="flex border-b border-slate-100 overflow-x-auto hide-scrollbar bg-white flex-shrink-0">
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
            
            <div className="p-5 bg-white flex-1 overflow-y-auto pr-1.5 space-y-4">
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
                            <span className="flex items-center gap-1 text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded-md"><MapPin size={12}/> {getRoomName(lecture.roomId) || 'Room TBA'}</span>
                            {lecture.status === 'COMPLETED' ? (
                              <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md"><CheckCircle size={12}/> Attendance Marked</span>
                            ) : (
                              <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md"><Clock size={12}/> Attendance Pending</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border text-center ${
                            lecture.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              : 'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>
                            {lecture.status === 'COMPLETED' ? 'Completed' : 'Upcoming'}
                          </span>
                          {lecture.status === 'COMPLETED' ? (
                            <Button variant="secondary" size="sm" disabled className="w-full flex items-center justify-center gap-1 opacity-75 cursor-default">
                              <CheckCircle size={14} className="text-emerald-500"/> Marked
                            </Button>
                          ) : (
                            <Button 
                              variant="primary" 
                              size="sm" 
                              className="w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                const courseName = batches.find(b => b.name === lecture.batchId)?.course || '';
                                navigate('/attendance', { 
                                  state: { 
                                    activeLecture: lecture,
                                    branch: lecture.branchId || currentUser?.branch || 'Mumbai West', 
                                    course: courseName,
                                    batch: lecture.batchId,
                                    date: lecture.date 
                                  } 
                                });
                              }}
                            >
                              Mark Attendance
                            </Button>
                          )}
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

              {/* WEEKLY SCHEDULE TAB */}
              {scheduleTab === 'weekly' && (
                <div className="space-y-4">
                  {(() => {
                    const now = new Date();
                    const dayOfWeek = now.getDay();
                    const diffToMon = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                    const monday = new Date(now.setDate(diffToMon));
                    
                    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dName, idx) => {
                      const d = new Date(monday);
                      d.setDate(d.getDate() + idx);
                      const dateStr = d.toISOString().split('T')[0];
                      const dayLectures = filteredLectures.filter(l => l.date === dateStr).sort((a, b) => a.startTime.localeCompare(b.startTime));
                      return {
                        name: dName,
                        dateStr,
                        dateNum: d.getDate(),
                        lectures: dayLectures
                      };
                    });

                    const hasAnyLectures = days.some(d => d.lectures.length > 0);

                    if (!hasAnyLectures) {
                      return (
                        <div className="py-12 text-center flex flex-col items-center justify-center">
                          <Calendar className="text-slate-300 mb-3" size={32} />
                          <div className="text-slate-500 font-medium">No scheduled lectures for this week.</div>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {days.map(dayObj => (
                          <div key={dayObj.name} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                            <div className="bg-slate-100 px-3 py-1.5 flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-200">
                              <span className="uppercase tracking-wider">{dayObj.name}</span>
                              <span className="text-[11px] text-slate-500 font-medium">{dayObj.dateNum}</span>
                            </div>
                            <div className="p-2.5 space-y-1.5 min-h-[90px] bg-slate-50/50">
                              {dayObj.lectures.length > 0 ? (
                                dayObj.lectures.map((l) => (
                                  <div key={l.id} className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-blue-300 transition-colors cursor-pointer">
                                    <div className="text-xs font-bold text-slate-800">{l.startTime} - {l.endTime}</div>
                                    <div className="text-xs font-semibold text-blue-700 truncate">{l.subjectId}</div>
                                    <div className="text-[10px] text-slate-500 truncate flex items-center justify-between mt-0.5">
                                      <span>{l.batchId}</span>
                                      <span className="text-slate-400 flex items-center gap-0.5"><MapPin size={9} /> {getRoomName(l.roomId) || 'Room TBA'}</span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="h-full flex items-center justify-center text-[10px] text-slate-400 font-semibold py-4">
                                  No Lectures
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
