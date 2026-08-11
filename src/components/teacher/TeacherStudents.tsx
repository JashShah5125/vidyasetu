import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { Table } from '../ui/Table';
import { Button } from '../ui/Button';
import { Pagination } from '../ui/Pagination';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import type { Student } from '../../data/mockData';
import { 
  TEACHER_ASSIGNED_BATCHES, 
  INITIAL_ATTENDANCE_HISTORY, 
  INITIAL_ASSIGNMENTS, 
  EXAM_RESULTS, 
  INITIAL_LECTURES 
} from '../../data/mockData';
import { Clock as ClockIcon, Calendar as CalendarIcon, FileText, Award, ArrowLeft } from 'lucide-react';

export const TeacherStudents: React.FC = () => {
  const { students: allStudents, batches } = useApp();
  
  const students = useMemo(() => {
    return allStudents.filter(s => TEACHER_ASSIGNED_BATCHES.includes(s.batch));
  }, [allStudents]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterProgram, setFilterProgram] = useState('All');
  const [filterLevel, setFilterLevel] = useState('All');
  const [filterBatch, setFilterBatch] = useState('All');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [profileTab, setProfileTab] = useState<'overview' | 'attendance' | 'assignments' | 'exams' | 'schedule' | 'basic'>('overview');

  const teacherBatchesInfo = useMemo(() => {
    return batches.filter(b => TEACHER_ASSIGNED_BATCHES.includes(b.name));
  }, [batches]);

  const uniqueCourses = Array.from(new Set(teacherBatchesInfo.map(b => b.course)));
  const uniquePrograms = Array.from(new Set(teacherBatchesInfo.filter(b => filterCourse === 'All' || b.course === filterCourse).map(b => b.program)));
  const uniqueLevels = Array.from(new Set(teacherBatchesInfo.filter(b => (filterCourse === 'All' || b.course === filterCourse) && (filterProgram === 'All' || b.program === filterProgram)).map(b => b.level)));
  const availableBatches = teacherBatchesInfo.filter(b => {
      const matchC = filterCourse === 'All' || b.course === filterCourse;
      const matchP = filterProgram === 'All' || b.program === filterProgram;
      const matchL = filterLevel === 'All' || b.level === filterLevel;
      return matchC && matchP && matchL;
  });
  const uniqueBatches = Array.from(new Set(availableBatches.map(b => b.name)));
  
  const allowedBatchesSet = new Set(uniqueBatches);

  const filteredAndSortedStudents = students
    .filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.studentId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchBatch = filterBatch === 'All' ? allowedBatchesSet.has(s.batch) : s.batch === filterBatch;
      return matchSearch && matchBatch;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const paginatedStudents = filteredAndSortedStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredAndSortedStudents.length / itemsPerPage);

  // Derivations for Profile
  const selectedBatchInfo = batches.find(b => b.name === selectedStudent?.batch);
  
  // Attendance calculations
  const studentAttendance = useMemo(() => {
    if (!selectedStudent) return [];
    const records: any[] = [];
    INITIAL_ATTENDANCE_HISTORY.forEach(sub => {
      const studentRec = sub.records.find(r => r.studentId === selectedStudent.studentId || r.studentId === selectedStudent.id);
      if (studentRec) {
        records.push({
          date: sub.date,
          subject: sub.subject,
          batch: sub.batchId,
          topic: sub.lectureId,
          status: studentRec.status,
          remark: studentRec.remark
        });
      }
    });
    return records;
  }, [selectedStudent]);

  const attendanceStats = useMemo(() => {
    if (studentAttendance.length === 0) return { total: 0, present: 0, late: 0, absent: 0, pct: 0 };
    const total = studentAttendance.length;
    let present = 0, late = 0, absent = 0;
    studentAttendance.forEach(r => {
      if (r.status === 'Present') present++;
      if (r.status === 'Late') late++;
      if (r.status === 'Absent') absent++;
    });
    return { total, present, late, absent, pct: Math.round(((present + late) / total) * 100) };
  }, [studentAttendance]);

  if (selectedStudent) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
          <Button variant="secondary" onClick={() => setSelectedStudent(null)} className="gap-2">
            <ArrowLeft size={16} />
            Back to Students
          </Button>
          <div className="text-sm font-semibold text-slate-500">
            Viewing Profile: <span className="text-slate-800">{selectedStudent.name}</span>
          </div>
        </div>
        
        <Card className="p-8">
          {/* PROFILE HEADER */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 pb-6 border-b border-slate-100">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-display font-bold text-4xl shadow-md">
              {selectedStudent.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-blue-600 mb-1 uppercase tracking-wider">Student Profile</div>
              <h3 className="text-3xl font-display font-bold text-slate-900">{selectedStudent.name}</h3>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-600">
                <div className="flex items-center gap-1.5"><span className="text-slate-400">ID:</span> <span className="font-mono font-bold text-slate-700">{selectedStudent.studentId}</span></div>
                <div className="flex items-center gap-1.5"><span className="text-slate-400">Batch:</span> <span className="font-semibold text-slate-700">{selectedStudent.batch}</span></div>
                <div className="flex items-center gap-1.5"><span className="text-slate-400">Course:</span> <span className="font-medium text-slate-700">{selectedStudent.course}</span></div>
                {selectedBatchInfo?.academicYear && <div className="flex items-center gap-1.5"><span className="text-slate-400">Year:</span> <span className="font-medium text-slate-700">{selectedBatchInfo.academicYear}</span></div>}
              </div>
            </div>
          </div>

          {/* TABS NAVIGATION */}
          <div className="flex border-b border-slate-200 overflow-x-auto hide-scrollbar mt-6">
            {[
              { id: 'overview', label: 'Academic Overview' },
              { id: 'attendance', label: 'Attendance' },
              { id: 'assignments', label: 'Assignments' },
              { id: 'exams', label: 'Exams & Results' },
              { id: 'schedule', label: 'Schedule' },
              { id: 'basic', label: 'Basic Information' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setProfileTab(tab.id as any)}
                className={`flex-none px-5 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
                  profileTab === tab.id 
                  ? 'border-blue-600 text-blue-700' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB CONTENTS */}
          <div className="min-h-[400px] mt-8">
            
            {/* TAB 1: OVERVIEW */}
            {profileTab === 'overview' && (
              <div className="space-y-8 animate-fade-in">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attendance</div>
                    <div className="text-2xl font-bold text-slate-800 mt-1">{attendanceStats.pct || 88}%</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assignments</div>
                    <div className="text-2xl font-bold text-slate-800 mt-1">18 <span className="text-sm text-slate-400 font-medium">/ 20</span></div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Work</div>
                    <div className="text-2xl font-bold text-amber-600 mt-1">2</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg Score</div>
                    <div className="text-2xl font-bold text-blue-600 mt-1">83.5%</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Exams</div>
                    <div className="text-2xl font-bold text-slate-800 mt-1">8 <span className="text-sm text-slate-400 font-medium">/ 9</span></div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Current Enrollment</h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <Table headers={['Course', 'Program', 'Level', 'Batch', 'Academic Year']}>
                      <tr>
                        <td className="px-6 py-4 font-semibold text-slate-800">{selectedStudent.course}</td>
                        <td className="px-6 py-4 text-slate-600">{selectedBatchInfo?.program || '—'}</td>
                        <td className="px-6 py-4 text-slate-600">{selectedBatchInfo?.level || '—'}</td>
                        <td className="px-6 py-4 font-bold text-blue-700">{selectedStudent.batch}</td>
                        <td className="px-6 py-4 text-slate-600">{selectedBatchInfo?.academicYear || '—'}</td>
                      </tr>
                    </Table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ATTENDANCE */}
            {profileTab === 'attendance' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex-1 text-center border-r border-slate-200 last:border-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Lectures</div>
                    <div className="text-xl font-bold text-slate-800 mt-1">{attendanceStats.total}</div>
                  </div>
                  <div className="flex-1 text-center border-r border-slate-200 last:border-0">
                    <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Present</div>
                    <div className="text-xl font-bold text-emerald-600 mt-1">{attendanceStats.present}</div>
                  </div>
                  <div className="flex-1 text-center border-r border-slate-200 last:border-0">
                    <div className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Late</div>
                    <div className="text-xl font-bold text-amber-600 mt-1">{attendanceStats.late}</div>
                  </div>
                  <div className="flex-1 text-center border-r border-slate-200 last:border-0">
                    <div className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Absent</div>
                    <div className="text-xl font-bold text-rose-600 mt-1">{attendanceStats.absent}</div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Attendance %</div>
                    <div className="text-xl font-bold text-blue-700 mt-1">{attendanceStats.pct}%</div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <Table headers={['Date', 'Subject', 'Batch', 'Status', 'Remark']}>
                    {studentAttendance.length > 0 ? studentAttendance.map((rec, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-900">{rec.date}</td>
                        <td className="px-6 py-4 font-semibold text-slate-700">{rec.subject}</td>
                        <td className="px-6 py-4 text-slate-600">{rec.batch}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border text-center ${
                            rec.status === 'Present' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            rec.status === 'Late' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            'bg-rose-50 text-rose-600 border-rose-100'
                          }`}>
                            {rec.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{rec.remark || '—'}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                          <CalendarIcon className="mx-auto text-slate-300 mb-3" size={32} />
                          <div className="font-medium">No attendance records found.</div>
                        </td>
                      </tr>
                    )}
                  </Table>
                </div>
              </div>
            )}

            {/* TAB 3: ASSIGNMENTS */}
            {profileTab === 'assignments' && (
              <div className="space-y-4 animate-fade-in border border-slate-200 rounded-xl overflow-hidden">
                <Table headers={['Assignment', 'Subject', 'Assigned On', 'Due Date', 'Status', 'Marks', 'Action']}>
                  {INITIAL_ASSIGNMENTS.filter(a => a.batchId === selectedStudent.batch).length > 0 ? 
                    INITIAL_ASSIGNMENTS.filter(a => a.batchId === selectedStudent.batch).map(a => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-semibold text-slate-900">{a.title}</td>
                        <td className="px-6 py-4 text-slate-600">{a.subject}</td>
                        <td className="px-6 py-4 text-slate-600">01 Aug 2026</td>
                        <td className="px-6 py-4 text-slate-600">{a.dueDate}</td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border bg-emerald-50 text-emerald-600 border-emerald-100">
                            Submitted
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900">18/20</td>
                        <td className="px-6 py-4"><Button variant="secondary" size="sm">View</Button></td>
                      </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        <FileText className="mx-auto text-slate-300 mb-3" size={32} />
                        <div className="font-medium">No assignments found for this student.</div>
                      </td>
                    </tr>
                  )}
                </Table>
              </div>
            )}

            {/* TAB 4: EXAMS & RESULTS */}
            {profileTab === 'exams' && (
              <div className="space-y-4 animate-fade-in border border-slate-200 rounded-xl overflow-hidden">
                <Table headers={['Exam', 'Subject', 'Date', 'Marks', 'Max Marks', '%', 'Grade', 'Action']}>
                  {EXAM_RESULTS.filter(e => e.studentId === selectedStudent.studentId || e.studentId === selectedStudent.id).length > 0 ? 
                    EXAM_RESULTS.filter(e => e.studentId === selectedStudent.studentId || e.studentId === selectedStudent.id).map(e => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-semibold text-slate-900">{e.examName}</td>
                        <td className="px-6 py-4 text-slate-600">{e.subject}</td>
                        <td className="px-6 py-4 text-slate-600">{e.date}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">{e.marks}</td>
                        <td className="px-6 py-4 text-slate-600">{e.maxMarks}</td>
                        <td className="px-6 py-4 font-bold text-blue-700">{Math.round((e.marks/e.maxMarks)*100)}%</td>
                        <td className="px-6 py-4 font-bold text-slate-800">{e.grade}</td>
                        <td className="px-6 py-4"><Button variant="secondary" size="sm">View Result</Button></td>
                      </tr>
                  )) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                        <Award className="mx-auto text-slate-300 mb-3" size={32} />
                        <div className="font-medium">No examination records available.</div>
                      </td>
                    </tr>
                  )}
                </Table>
              </div>
            )}

            {/* TAB 5: SCHEDULE */}
            {profileTab === 'schedule' && (
              <div className="space-y-4 animate-fade-in border border-slate-200 rounded-xl overflow-hidden">
                <Table headers={['Date', 'Time', 'Subject', 'Batch', 'Room', 'Type']}>
                  {INITIAL_LECTURES.filter(l => l.batchId === selectedStudent.batch).length > 0 ? 
                    INITIAL_LECTURES.filter(l => l.batchId === selectedStudent.batch).map(l => (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-900">{l.date}</td>
                        <td className="px-6 py-4 text-slate-600">{l.startTime} – {l.endTime}</td>
                        <td className="px-6 py-4 font-semibold text-slate-700">{l.subject}</td>
                        <td className="px-6 py-4 font-bold text-blue-700">{l.batchId}</td>
                        <td className="px-6 py-4 text-slate-600">{l.room}</td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border bg-slate-100 text-slate-600 border-slate-200">
                            Lecture
                          </span>
                        </td>
                      </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        <ClockIcon className="mx-auto text-slate-300 mb-3" size={32} />
                        <div className="font-medium">No scheduled lectures found.</div>
                      </td>
                    </tr>
                  )}
                </Table>
              </div>
            )}

            {/* TAB 6: BASIC INFORMATION */}
            {profileTab === 'basic' && (
              <div className="max-w-2xl animate-fade-in space-y-6">
                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <th className="px-6 py-4 font-semibold text-slate-600 bg-slate-100/50 w-1/3">Student Name</th>
                        <td className="px-6 py-4 font-medium text-slate-900">{selectedStudent.name}</td>
                      </tr>
                      <tr>
                        <th className="px-6 py-4 font-semibold text-slate-600 bg-slate-100/50">Student ID</th>
                        <td className="px-6 py-4 font-mono text-slate-700">{selectedStudent.studentId}</td>
                      </tr>
                      <tr>
                        <th className="px-6 py-4 font-semibold text-slate-600 bg-slate-100/50">Course</th>
                        <td className="px-6 py-4 text-slate-700">{selectedStudent.course}</td>
                      </tr>
                      <tr>
                        <th className="px-6 py-4 font-semibold text-slate-600 bg-slate-100/50">Program</th>
                        <td className="px-6 py-4 text-slate-700">{selectedBatchInfo?.program || '—'}</td>
                      </tr>
                      <tr>
                        <th className="px-6 py-4 font-semibold text-slate-600 bg-slate-100/50">Level</th>
                        <td className="px-6 py-4 text-slate-700">{selectedBatchInfo?.level || '—'}</td>
                      </tr>
                      <tr>
                        <th className="px-6 py-4 font-semibold text-slate-600 bg-slate-100/50">Batch</th>
                        <td className="px-6 py-4 font-semibold text-blue-700">{selectedStudent.batch}</td>
                      </tr>
                      <tr>
                        <th className="px-6 py-4 font-semibold text-slate-600 bg-slate-100/50">Academic Year</th>
                        <td className="px-6 py-4 text-slate-700">{selectedBatchInfo?.academicYear || '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">My Students</h2>
          <p className="text-sm text-slate-500 mt-1">Review academic profiles for students in your assigned batches.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm items-end">
        <Input label="Search" placeholder="Search students by name or ID..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
        <Select
          label="Course"
          value={filterCourse}
          onChange={(e) => {
            setFilterCourse(e.target.value);
            setFilterProgram('All');
            setFilterLevel('All');
            setFilterBatch('All');
          }}
          options={[
            { value: 'All', label: 'All Courses' },
            ...uniqueCourses.map(c => ({ value: c, label: c }))
          ]}
        />
        <Select
          label="Program"
          value={filterProgram}
          onChange={(e) => {
            setFilterProgram(e.target.value);
            setFilterLevel('All');
            setFilterBatch('All');
          }}
          options={[
            { value: 'All', label: 'All Programs' },
            ...uniquePrograms.map(p => ({ value: p, label: p }))
          ]}
        />
        <Select
          label="Level"
          value={filterLevel}
          onChange={(e) => {
            setFilterLevel(e.target.value);
            setFilterBatch('All');
          }}
          options={[
            { value: 'All', label: 'All Levels' },
            ...uniqueLevels.map(l => ({ value: l, label: l }))
          ]}
        />
        <Select
          label="Batch"
          value={filterBatch}
          onChange={(e) => setFilterBatch(e.target.value)}
          options={[
            { value: 'All', label: 'All Batches' },
            ...uniqueBatches.map(b => ({ value: b, label: b }))
          ]}
        />
      </div>

      <Card>
        <Table headers={['Student ID', 'Name', 'Course', 'Program', 'Level', 'Batch', 'Attendance', 'Action']}>
          {paginatedStudents.length > 0 ? paginatedStudents.map((s, idx) => {
            const bInfo = batches.find(b => b.name === s.batch);
            return (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-mono font-bold text-xs text-slate-500">{s.studentId}</td>
                <td className="px-6 py-4 font-bold text-slate-800">{s.name}</td>
                <td className="px-6 py-4 font-medium text-slate-700">{s.course}</td>
                <td className="px-6 py-4 text-slate-600">{bInfo?.program || '—'}</td>
                <td className="px-6 py-4 text-slate-600">{bInfo?.level || '—'}</td>
                <td className="px-6 py-4 font-semibold text-blue-700">{s.batch}</td>
                <td className="px-6 py-4 font-bold text-emerald-600">88%</td>
                <td className="px-6 py-4">
                  <Button variant="secondary" size="sm" onClick={() => { setSelectedStudent(s); setProfileTab('overview'); }}>
                    View Profile
                  </Button>
                </td>
              </tr>
            );
          }) : (
            <tr>
              <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                No students found matching your filters.
              </td>
            </tr>
          )}
        </Table>
        {filteredAndSortedStudents.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAndSortedStudents.length}
              pageSize={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </Card>
    </div>
  );
};
