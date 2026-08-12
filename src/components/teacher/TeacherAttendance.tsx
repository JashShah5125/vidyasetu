import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Table } from '../ui/Table';
import { Modal } from '../ui/Modal';
import { 
  Calendar as CalendarIcon, MapPin, Search, CheckCircle, 
  XCircle, Clock as ClockIcon, ChevronLeft, ChevronRight, AlertCircle, FileText 
} from 'lucide-react';
import { 
  TEACHER_ASSIGNED_BATCHES, 
  INITIAL_ATTENDANCE_HISTORY
} from '../../data/mockData';
import type { AttendanceSubmission } from '../../data/mockData';
import type { Lecture } from '../../features/scheduler/types/scheduler';

export const TeacherAttendance: React.FC = () => {
  const { currentUser, batches, branches, courses, students, addToast } = useApp();
  const { lectures } = useScheduler();
  
  // Date Navigation State
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const currentDateStr = currentDate.toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];
  const isFutureDate = currentDateStr > todayStr;

  // View State
  const [activeTab, setActiveTab] = useState<'lectures' | 'history' | 'summary' | 'low_attendance'>('lectures');
  
  // Register State
  const [activeLecture, setActiveLecture] = useState<Lecture | null>(null);
  const [attendanceState, setAttendanceState] = useState<Record<string, 'Present' | 'Absent' | 'Late'>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [registerSearch, setRegisterSearch] = useState('');
  const [viewHistoryRecord, setViewHistoryRecord] = useState<AttendanceSubmission | null>(null);

  // History Filter State
  const [historyRange, setHistoryRange] = useState('7days'); // '7days' | '30days'
  
  // Context Filter States
  const [filterYear, setFilterYear] = useState('All');
  const [filterBranch, setFilterBranch] = useState(currentUser?.role === 'branch-admin' ? currentUser.branch || 'All' : 'All');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterBatch, setFilterBatch] = useState('All');
  const [filterSubject, setFilterSubject] = useState('All');

  // Derived Filters
  const uniqueYears = Array.from(new Set(batches.map(b => b.academicYear).filter(Boolean))) as string[];
  const uniqueBranches = currentUser?.role === 'branch-admin' ? [currentUser.branch || ''] : branches.map(b => b.name);
  const uniqueCourses = courses.map(c => c.name);
  
  const dropdownBatches = batches.filter(b => {
    if (!TEACHER_ASSIGNED_BATCHES.includes(b.name)) return false;
    const batchBranch = b.branch || 'Mumbai West';
    return (filterBranch === 'All' || batchBranch === filterBranch) &&
           (filterCourse === 'All' || b.course === filterCourse) &&
           (filterYear === 'All' || b.academicYear === filterYear);
  });
  
  const activeBatches = filterBatch === 'All' ? dropdownBatches.map(b => b.name) : [filterBatch];
  const uniqueSubjects = Array.from(new Set(lectures.filter(l => activeBatches.includes(l.batchId)).map(l => l.subjectId)));

  // Filtered Lectures for current date
  const todaysLectures = lectures.filter(l => 
    l.date === currentDateStr && 
    activeBatches.includes(l.batchId) &&
    (filterSubject === 'All' || l.subjectId === filterSubject)
  );

  // Navigation handlers
  const handlePrevDay = () => setCurrentDate(new Date(currentDate.getTime() - 86400000));
  const handleNextDay = () => setCurrentDate(new Date(currentDate.getTime() + 86400000));
  const handleToday = () => setCurrentDate(new Date());

  const resetFilters = () => {
    setFilterYear('All');
    setFilterBranch(currentUser?.role === 'branch-admin' ? currentUser.branch || 'All' : 'All');
    setFilterCourse('All');
    setFilterBatch('All');
    setFilterSubject('All');
  };

  // ----------------------------------------------------
  // REGISTER LOGIC
  // ----------------------------------------------------
  const handleOpenRegister = (lecture: Lecture) => {
    if (isFutureDate) {
      addToast('Cannot mark attendance for future lectures.', 'error');
      return;
    }
    setActiveLecture(lecture);
    setAttendanceState({});
    setHasUnsavedChanges(false);
    setRegisterSearch('');
  };

  const activeLectureStudents = useMemo(() => {
    if (!activeLecture) return [];
    return students.filter(s => s.batch === activeLecture.batchId);
  }, [activeLecture, students]);

  const filteredRegisterStudents = useMemo(() => {
    if (!registerSearch) return activeLectureStudents;
    const lowerSearch = registerSearch.toLowerCase();
    return activeLectureStudents.filter(s => 
      s.name.toLowerCase().includes(lowerSearch) || 
      s.studentId.toLowerCase().includes(lowerSearch)
    );
  }, [activeLectureStudents, registerSearch]);

  const handleMarkSingle = (studentId: string, status: 'Present' | 'Absent' | 'Late') => {
    setAttendanceState(prev => ({ ...prev, [studentId]: status }));
    setHasUnsavedChanges(true);
  };

  const handleMarkAll = (status: 'Present' | 'Absent') => {
    const newState = { ...attendanceState };
    activeLectureStudents.forEach(s => { newState[s.id] = status; });
    setAttendanceState(newState);
    setHasUnsavedChanges(true);
  };

  const handleCancelRegister = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm("Attendance changes have not been submitted. Discard changes?")) return;
    }
    setActiveLecture(null);
  };

  const handleSubmitAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLecture) return;

    if (Object.keys(attendanceState).length < activeLectureStudents.length) {
      addToast(`${activeLectureStudents.length - Object.keys(attendanceState).length} students have not been marked.`, 'error');
      return;
    }

    addToast('Attendance submitted successfully.', 'success');
    setActiveLecture(null);
    setHasUnsavedChanges(false);
  };

  // View toggle logic
  if (activeLecture) {
    const presentCount = Object.values(attendanceState).filter(s => s === 'Present' || s === 'Late').length;
    const absentCount = Object.values(attendanceState).filter(s => s === 'Absent').length;
    const lateCount = Object.values(attendanceState).filter(s => s === 'Late').length;
    const pct = activeLectureStudents.length ? Math.round((presentCount / activeLectureStudents.length) * 100) : 0;

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 font-semibold mb-1 cursor-pointer hover:text-slate-800" onClick={handleCancelRegister}>
              <ChevronLeft size={16} /> Back to Lectures
            </div>
            <h2 className="text-2xl font-display font-bold text-slate-900">{activeLecture.batchId} Attendance</h2>
            <p className="text-sm text-slate-500 mt-1">{activeLecture.subjectId} • {activeLecture.topic} • {activeLecture.startTime}</p>
          </div>
          
          <div className="flex gap-4 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="text-center px-3 border-r border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</div>
              <div className="text-lg font-bold text-slate-800">{activeLectureStudents.length}</div>
            </div>
            <div className="text-center px-3 border-r border-slate-100">
              <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Present</div>
              <div className="text-lg font-bold text-emerald-600">{presentCount}</div>
            </div>
            <div className="text-center px-3 border-r border-slate-100">
              <div className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Absent</div>
              <div className="text-lg font-bold text-rose-600">{absentCount}</div>
            </div>
            <div className="text-center px-3">
              <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Att %</div>
              <div className="text-lg font-bold text-blue-700">{pct}%</div>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search students by name or ID..."
                value={registerSearch}
                onChange={(e) => setRegisterSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="secondary" onClick={() => handleMarkAll('Present')} className="flex-1 sm:flex-none">Mark All Present</Button>
              <Button variant="secondary" onClick={() => handleMarkAll('Absent')} className="flex-1 sm:flex-none text-rose-600 border-rose-200 hover:bg-rose-50">Mark All Absent</Button>
            </div>
          </div>

          <Table headers={['Student ID', 'Student Name', 'Batch', 'Status', 'Remark']}>
            {filteredRegisterStudents.length > 0 ? filteredRegisterStudents.map((student) => {
              const status = attendanceState[student.id];
              return (
                <tr key={student.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{student.studentId}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{student.name}</td>
                  <td className="px-6 py-4 font-semibold text-blue-700">{student.batch}</td>
                  <td className="px-6 py-4">
                    <div className="flex bg-slate-100 p-1 rounded-lg w-fit border border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => handleMarkSingle(student.id, 'Present')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                          status === 'Present' 
                            ? 'bg-emerald-500 text-white shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <CheckCircle size={14} /> Present
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMarkSingle(student.id, 'Late')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                          status === 'Late' 
                            ? 'bg-amber-500 text-white shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <ClockIcon size={14} /> Late
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMarkSingle(student.id, 'Absent')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                          status === 'Absent' 
                            ? 'bg-rose-500 text-white shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <XCircle size={14} /> Absent
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="text" 
                      placeholder="Add remark..." 
                      className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 focus:outline-none text-sm text-slate-600 py-1"
                    />
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  <Search className="mx-auto text-slate-300 mb-3" size={32} />
                  <div className="font-medium">No students match your search.</div>
                </td>
              </tr>
            )}
          </Table>

          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="text-sm font-semibold text-amber-600 flex items-center gap-2">
              {hasUnsavedChanges && <><AlertCircle size={16} /> Unsaved changes</>}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={handleCancelRegister}>Cancel</Button>
              <Button type="button" variant="primary" onClick={handleSubmitAttendance}>Submit Attendance</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">Lecture Attendance</h2>
        <p className="text-sm text-slate-500 mt-1">Record and review attendance for your assigned lectures and batches.</p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Scope & Filters
          </div>
          <Button variant="secondary" size="sm" onClick={resetFilters}>Reset Filters</Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
            label="Batch" value={filterBatch} onChange={(e) => setFilterBatch(e.target.value)}
            options={[{ value: 'All', label: 'All My Batches' }, ...dropdownBatches.map(b => ({ value: b.name, label: b.name }))]}
          />
        </div>
      </div>

      <div className="flex border-b border-slate-200 overflow-x-auto hide-scrollbar">
        {[
          { id: 'lectures', label: 'Lectures' },
          { id: 'history', label: 'Attendance History' },
          { id: 'summary', label: 'Batch Summary' },
          { id: 'low_attendance', label: 'Low Attendance' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-none px-6 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.id 
              ? 'border-blue-600 text-blue-700' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'lectures' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 p-1">
              <Button variant="secondary" className="px-2" onClick={handlePrevDay}><ChevronLeft size={16}/></Button>
              <div className="px-4 font-bold text-slate-700 text-sm">{currentDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              <Button variant="secondary" className="px-2" onClick={handleNextDay}><ChevronRight size={16}/></Button>
            </div>
            <div className="flex gap-2">
              <Select 
                label="" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}
                options={[{ value: 'All', label: 'All Subjects' }, ...uniqueSubjects.map(s => ({ value: s, label: s }))]}
              />
              <Button variant="secondary" onClick={handleToday}>Today</Button>
            </div>
          </div>

          <Table headers={['Time', 'Batch', 'Subject', 'Room', 'Students', 'Status', 'Action']}>
            {todaysLectures.length > 0 ? todaysLectures.map(lecture => {
              const batchInfo = batches.find(b => b.name === lecture.batchId);
              const studentCount = students.filter(s => s.batch === lecture.batchId).length;
              return (
                <tr key={lecture.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{lecture.startTime} – {lecture.endTime}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-blue-700">{lecture.batchId}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{batchInfo?.course} • {batchInfo?.level}</div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-700">{lecture.subjectId}</td>
                  <td className="px-6 py-4 text-slate-600">{lecture.roomId}</td>
                  <td className="px-6 py-4 text-slate-600">{studentCount}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border text-center ${
                      lecture.status === 'Scheduled' ? (isFutureDate ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-amber-50 text-amber-600 border-amber-100') : 
                      'bg-emerald-50 text-emerald-600 border-emerald-100'
                    }`}>
                      {lecture.status === 'Scheduled' ? (isFutureDate ? 'Upcoming' : 'Pending') : lecture.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Button 
                      variant={isFutureDate ? "secondary" : "primary"}
                      size="sm"
                      disabled={isFutureDate}
                      onClick={() => handleOpenRegister(lecture)}
                    >
                      {isFutureDate ? 'Upcoming' : 'Mark Attendance'}
                    </Button>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                  <CalendarIcon className="mx-auto text-slate-300 mb-3" size={32} />
                  <div className="font-medium">No lectures found for the selected date and filters.</div>
                </td>
              </tr>
            )}
          </Table>
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Select 
              label="" value={historyRange} onChange={(e) => setHistoryRange(e.target.value)}
              options={[{ value: '7days', label: 'Last 7 Days' }, { value: '30days', label: 'Last 30 Days' }]}
            />
          </div>
          <Table headers={['Date', 'Time', 'Batch', 'Subject', 'Present', 'Late', 'Absent', '%', 'Action']}>
            {INITIAL_ATTENDANCE_HISTORY.filter(h => activeBatches.includes(h.batchId)).length > 0 ? (
              INITIAL_ATTENDANCE_HISTORY.filter(h => activeBatches.includes(h.batchId)).map(h => (
                <tr key={h.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{h.date}</td>
                  <td className="px-6 py-4 text-slate-600">{h.time}</td>
                  <td className="px-6 py-4 font-bold text-blue-700">{h.batchId}</td>
                  <td className="px-6 py-4 text-slate-700">{h.subject}</td>
                  <td className="px-6 py-4 font-medium text-emerald-600">{h.present}</td>
                  <td className="px-6 py-4 font-medium text-amber-600">{h.late}</td>
                  <td className="px-6 py-4 font-medium text-rose-600">{h.absent}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{Math.round((h.present + h.late) / h.totalStudents * 100)}%</td>
                  <td className="px-6 py-4"><Button variant="secondary" size="sm" onClick={() => setViewHistoryRecord(h)}>View</Button></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                  <FileText className="mx-auto text-slate-300 mb-3" size={32} />
                  <div className="font-medium">No attendance records found.</div>
                </td>
              </tr>
            )}
          </Table>
        </div>
      )}

      {/* BATCH SUMMARY TAB */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          <Table headers={['Batch', 'Subject', 'Students', 'Avg Attendance %', 'Action']}>
            {INITIAL_ATTENDANCE_HISTORY.filter(h => activeBatches.includes(h.batchId)).length > 0 ? (
              Object.values(INITIAL_ATTENDANCE_HISTORY.filter(h => activeBatches.includes(h.batchId)).reduce((acc, h) => {
                const key = `${h.batchId}-${h.subject}`;
                if (!acc[key]) acc[key] = { batchId: h.batchId, subject: h.subject, total: 0, attended: 0, studentCount: h.totalStudents };
                acc[key].total += h.totalStudents;
                acc[key].attended += h.present + h.late;
                return acc;
              }, {} as Record<string, any>)).map((s, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold text-blue-700">{s.batchId}</td>
                  <td className="px-6 py-4 font-medium text-slate-700">{s.subject}</td>
                  <td className="px-6 py-4 text-slate-600">{s.studentCount}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{Math.round((s.attended / s.total) * 100)}%</td>
                  <td className="px-6 py-4"><Button variant="secondary" size="sm">View</Button></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  <AlertCircle className="mx-auto text-slate-300 mb-3" size={32} />
                  <div className="font-medium">No batch attendance data available.</div>
                </td>
              </tr>
            )}
          </Table>
        </div>
      )}

      {/* LOW ATTENDANCE TAB */}
      {activeTab === 'low_attendance' && (
        <div className="space-y-4">
          <Table headers={['Student ID', 'Student', 'Batch', 'Total Lectures', 'Present', 'Absent', 'Attendance %']}>
            {/* Mock computation for low attendance */}
            {(() => {
              const studentsStats: Record<string, any> = {};
              INITIAL_ATTENDANCE_HISTORY.forEach(h => {
                if (!activeBatches.includes(h.batchId)) return;
                h.records.forEach(r => {
                  if (!studentsStats[r.studentId]) {
                    const st = students.find(s => s.id === r.studentId);
                    if (!st) return;
                    studentsStats[r.studentId] = { id: st.studentId, name: st.name, batch: h.batchId, total: 0, present: 0, absent: 0 };
                  }
                  studentsStats[r.studentId].total++;
                  if (r.status === 'Present' || r.status === 'Late') studentsStats[r.studentId].present++;
                  if (r.status === 'Absent') studentsStats[r.studentId].absent++;
                });
              });
              
              const lowAtt = Object.values(studentsStats).filter(s => (s.present / s.total) < 0.75);
              return lowAtt.length > 0 ? lowAtt.map((s, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{s.id}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{s.name}</td>
                  <td className="px-6 py-4 font-semibold text-blue-700">{s.batch}</td>
                  <td className="px-6 py-4 text-slate-600">{s.total}</td>
                  <td className="px-6 py-4 text-emerald-600 font-medium">{s.present}</td>
                  <td className="px-6 py-4 text-rose-600 font-medium">{s.absent}</td>
                  <td className="px-6 py-4 font-bold text-rose-600">{Math.round((s.present / s.total) * 100)}%</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <CheckCircle className="mx-auto text-emerald-400 mb-3" size={32} />
                    <div className="font-medium">No students currently fall below the 75% threshold.</div>
                  </td>
                </tr>
              )
            })()}
          </Table>
        </div>
      )}

      {/* VIEW HISTORY MODAL */}
      <Modal isOpen={!!viewHistoryRecord} onClose={() => setViewHistoryRecord(null)} title="Attendance Details">
        {viewHistoryRecord && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</div>
                <div className="text-xl font-bold text-slate-800 mt-1">{viewHistoryRecord.totalStudents}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Present</div>
                <div className="text-xl font-bold text-emerald-600 mt-1">{viewHistoryRecord.present}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Absent</div>
                <div className="text-xl font-bold text-rose-600 mt-1">{viewHistoryRecord.absent}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Late</div>
                <div className="text-xl font-bold text-blue-700 mt-1">{viewHistoryRecord.late}</div>
              </div>
            </div>

            <Table headers={['Student ID', 'Name', 'Status', 'Remark']}>
              {viewHistoryRecord.records.map(record => {
                const student = students.find(s => s.id === record.studentId);
                return (
                  <tr key={record.studentId}>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{student?.studentId || record.studentId}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{student?.name || 'Unknown Student'}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border text-center ${
                        record.status === 'Present' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        record.status === 'Late' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        'bg-rose-50 text-rose-600 border-rose-100'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{record.remark || '—'}</td>
                  </tr>
                );
              })}
            </Table>
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setViewHistoryRecord(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
