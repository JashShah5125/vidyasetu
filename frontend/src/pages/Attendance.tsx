import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { ArrowLeft, Download } from 'lucide-react';
import { Pagination } from '../components/ui/Pagination';
import { useLocation } from 'react-router-dom';

interface AttendanceProps {
  initialTab?: 'sheet' | 'timetable';
}

export const Attendance: React.FC<AttendanceProps> = ({ initialTab = 'sheet' }) => {
  const { students, staff, updateAttendance, currentUser } = useApp();
  const [subTab, setSubTab] = useState<'sheet' | 'timetable'>(initialTab);
  const [savedType, setSavedType] = useState<'student' | 'staff' | null>(null);
  
  const location = useLocation();
  const navState = location.state as { branch?: string; course?: string; batch?: string; date?: string } | null;

  // Attendance Category Tab
  const [attendanceType, setAttendanceType] = useState<'students' | 'staff'>('students');

  // Filters
  const [branch, setBranch] = useState(navState?.branch || (currentUser?.role === 'branch-admin' ? currentUser.branch || 'Mumbai West' : 'Mumbai West'));
  const [course, setCourse] = useState(navState?.course || '');
  const [batch, setBatch] = useState(navState?.batch || '');
  const [staffFilterRole, setStaffFilterRole] = useState('All');
  const [date, setDate] = useState(navState?.date || new Date().toISOString().split('T')[0]);
  const [filterAttendanceStatus, setFilterAttendanceStatus] = useState('All');

  // Selected person for history view
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);

  // Attendance Records States
  const [records, setRecords] = useState<{ [key: string]: 'Present' | 'Absent' | 'Late' }>({
    'S-201': 'Present',
    'S-202': 'Present',
    'S-203': 'Present',
    'S-204': 'Absent',
    'S-205': 'Present',
    'S-206': 'Late',
    'S-207': 'Present'
  });
  const [staffRecords, setStaffRecords] = useState<{ [key: string]: 'Present' | 'Absent' | 'Late' }>({
    'priya.counsel@apexiit.com': 'Present',
    'arvind.chem@apexiit.com': 'Present',
    'nitin.bills@apexiit.com': 'Present'
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Derived unique course and batch names
  const uniqueCourses = useMemo(() => Array.from(new Set(students.map(s => s.course).filter(Boolean) as string[])), [students]);
  // Filter batches by selected course
  const uniqueBatches = useMemo(() => {
    return Array.from(new Set(
      students
        .filter(s => !course || s.course === course)
        .map(s => s.batch)
        .filter(Boolean) as string[]
    ));
  }, [students, course]);

  // Filtered Lists
  const filteredStudents = students.filter(s => {
    const matchBranch = !branch || s.branch === branch;
    const matchCourse = !course || s.course === course;
    const matchBatch = !batch || s.batch === batch;
    
    const status = records[s.id];
    const matchStatus = filterAttendanceStatus === 'All' 
      ? true 
      : filterAttendanceStatus === 'Unmarked' 
        ? !status 
        : status === filterAttendanceStatus;

    return matchBranch && matchCourse && matchBatch && matchStatus;
  });

  const filteredStaff = staff.filter(m => {
    const matchBranch = !branch || m.branch === branch;
    const matchRole = staffFilterRole === 'All' || m.role === staffFilterRole;
    
    const status = staffRecords[m.email];
    const matchStatus = filterAttendanceStatus === 'All' 
      ? true 
      : filterAttendanceStatus === 'Unmarked' 
        ? !status 
        : status === filterAttendanceStatus;

    return matchBranch && matchRole && matchStatus;
  });

  const activeList = attendanceType === 'students' ? filteredStudents : filteredStaff;
  const totalPages = Math.ceil(activeList.length / itemsPerPage);
  const paginatedItems = activeList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExportCSV = () => {
    const isStudent = attendanceType === 'students';
    const headers = isStudent 
      ? ['Student ID', 'Student Name', 'Branch', 'Course', 'Batch', 'Date', 'Status']
      : ['Employee ID', 'Employee Name', 'Role', 'Branch', 'Email', 'Date', 'Status'];

    const rows = activeList.map(person => {
      const p = person as any;
      if (isStudent) {
        const id = p.id || '';
        const status = records[id] || 'Not Marked';
        return [p.studentId || '', p.name || '', p.branch || '', p.course || '', p.batch || '', date, status];
      } else {
        const emailKey = p.email || '';
        const status = staffRecords[emailKey] || 'Not Marked';
        return [p.employeeId || 'N/A', p.name || '', p.role || '', p.branch || '', p.email || '', date, status];
      }
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_${attendanceType}_${date}_${filterAttendanceStatus.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  React.useEffect(() => {
    setSubTab(initialTab);
  }, [initialTab]);

  const handleMark = (id: string, status: 'Present' | 'Absent' | 'Late') => {
    if (attendanceType === 'students') {
      setRecords(prev => ({ ...prev, [id]: status }));
      updateAttendance(id, status);
    } else {
      setStaffRecords(prev => ({ ...prev, [id]: status }));
    }
  };

  const handleSave = () => {
    setSavedType(attendanceType === 'students' ? 'student' : 'staff');
    setTimeout(() => setSavedType(null), 4000);
  };

  const getAttendanceHistory = (personId: string) => {
    const logs = [];
    const baseDate = new Date();
    const statuses: ('Present' | 'Absent' | 'Late')[] = ['Present', 'Present', 'Present', 'Absent', 'Present', 'Late', 'Present'];
    
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(baseDate.getDate() - i);
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0) continue; // Skip Sundays
      
      const dateStr = d.toISOString().split('T')[0];
      const hash = (personId.charCodeAt(0) || 0) + (personId.charCodeAt(personId.length - 1) || 0) + i;
      const status = statuses[hash % statuses.length];
      
      let remark = 'Regular Session Check-in';
      if (status === 'Absent') {
        const absentRemarks = ['Unexcused Absence', 'Absent - No Leave Record', 'No-show / Absent'];
        remark = absentRemarks[hash % absentRemarks.length];
      } else if (status === 'Late') {
        const lateRemarks = ['Late Check-in (10m delay)', 'Late Check-in (15m delay)', 'Arrived after lecture start'];
        remark = lateRemarks[hash % lateRemarks.length];
      } else {
        const presentRemarks = ['Regular Session Check-in', 'On-time Check-in', 'Classroom Attendance Marked'];
        remark = presentRemarks[hash % presentRemarks.length];
      }
      
      logs.push({ date: dateStr, status, remark });
    }
    return logs;
  };

  // Render History View
  if (selectedPerson) {
    const historyLogs = getAttendanceHistory(selectedPerson.id || selectedPerson.email);
    const totalDays = historyLogs.length;
    const presentDays = historyLogs.filter(l => l.status === 'Present').length;
    const lateDays = historyLogs.filter(l => l.status === 'Late').length;
    const absentDays = historyLogs.filter(l => l.status === 'Absent').length;
    const attendanceRate = totalDays > 0 ? Math.round(((presentDays + lateDays * 0.5) / totalDays) * 100) : 100;

    const handleExportCSV = () => {
      const headers = ['Date', 'Status', 'Remark'];
      const rows = historyLogs.map(l => [l.date, l.status, l.remark || '']);
      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `attendance_history_${selectedPerson.name.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSelectedPerson(null)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-2xl font-display font-bold text-slate-900">Attendance History Report</h2>
              <p className="text-sm text-slate-500 mt-1">
                Roster profile details and historical timesheets for {selectedPerson.name}.
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={handleExportCSV} className="flex items-center gap-2 cursor-pointer">
            <Download size={16} /> Export CSV
          </Button>
        </div>

        {/* Profile Card */}
        <Card>
          <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="text-xl font-bold text-slate-800">{selectedPerson.name}</div>
                <div className="text-sm text-slate-500 font-mono mt-1">
                  {selectedPerson.studentId ? `Student ID: ${selectedPerson.studentId} | Batch: ${selectedPerson.batch}` : `Role: ${selectedPerson.role} | Email: ${selectedPerson.email}`}
                </div>
                <div className="text-xs text-slate-450 mt-1">Branch: {selectedPerson.branch}</div>
              </div>
              <div className="flex gap-4">
                <div className="bg-slate-50 border border-slate-200/80 px-4 py-2 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Attendance Rate</div>
                  <div className="text-xl font-bold text-blue-600 mt-0.5">{attendanceRate}%</div>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 px-4 py-2 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Present / Total</div>
                  <div className="text-xl font-bold text-slate-800 mt-0.5">{presentDays} / {totalDays}</div>
                </div>
              </div>
            </div>

            {/* Metrics Breakdowns */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg text-center">
                <div className="text-xs font-bold text-emerald-700">Present</div>
                <div className="text-lg font-bold text-emerald-800 mt-0.5">{presentDays} Days</div>
              </div>
              <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg text-center">
                <div className="text-xs font-bold text-amber-700">Late</div>
                <div className="text-lg font-bold text-amber-800 mt-0.5">{lateDays} Days</div>
              </div>
              <div className="bg-red-50 border border-red-100 p-3 rounded-lg text-center">
                <div className="text-xs font-bold text-red-700">Absent</div>
                <div className="text-lg font-bold text-red-800 mt-0.5">{absentDays} Days</div>
              </div>
            </div>

            {/* History Table */}
            <div className="border-t border-slate-100 pt-6 mt-6">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Historical Timesheet Log</h3>
              <div className="overflow-hidden border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-sm text-slate-600">
                    {historyLogs.map((log, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3 font-mono text-xs whitespace-nowrap">{log.date}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                            log.status === 'Present' ? 'bg-emerald-50 text-emerald-700' :
                            log.status === 'Late' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {savedType && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm">
          ✓ Daily {savedType === 'student' ? 'student' : 'teacher & staff'} sheets successfully saved and synced to report logs.
        </div>
      )}
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">
          {subTab === 'sheet' ? 'Attendance registers' : 'Class Timetable Schedules'}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {subTab === 'sheet' 
            ? 'Select class rosters, mark daily student attendance parameters, and export logs.'
            : 'Track weekly lecture sessions, classroom allotments, and teacher schedules.'}
        </p>
      </div>

      {subTab === 'sheet' ? (
        <>
          {/* Sub Navigation Category Tabs */}
          <div className="flex gap-2 border-b border-slate-200 pb-px">
            <button
              onClick={() => { setAttendanceType('students'); setCurrentPage(1); }}
              className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                attendanceType === 'students'
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Student Roster
            </button>
            <button
              onClick={() => { setAttendanceType('staff'); setCurrentPage(1); }}
              className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                attendanceType === 'staff'
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Teacher &amp; Staff Roster
            </button>
          </div>

          {/* Selectors grid */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${attendanceType === 'students' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4 bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm`}>
            <Select 
              label="Branch" 
              value={branch} 
              onChange={(e) => setBranch(e.target.value)} 
              options={currentUser?.role === 'branch-admin' ? [
                { value: currentUser.branch || '', label: currentUser.branch || '' }
              ] : [
                { value: 'Mumbai West', label: 'Mumbai West' },
                { value: 'Pune Camp', label: 'Pune Camp' }
              ]}
              disabled={currentUser?.role === 'branch-admin'}
            />

            {attendanceType === 'students' ? (
              <>
                <Select 
                  label="Course" 
                  value={course} 
                  onChange={(e) => { setCourse(e.target.value); setBatch(''); }} 
                  options={[
                    { value: '', label: 'Select Course' },
                    ...uniqueCourses.map((c: string) => ({ value: c, label: c }))
                  ]} 
                />
                <Select 
                  label="Batch" 
                  value={batch} 
                  onChange={(e) => setBatch(e.target.value)} 
                  options={[
                    { value: '', label: 'Select Batch' },
                    ...uniqueBatches.map((b: string) => ({ value: b, label: b }))
                  ]} 
                />
              </>
            ) : (
              <Select 
                label="Role Category" 
                value={staffFilterRole} 
                onChange={(e) => setStaffFilterRole(e.target.value)} 
                options={[
                  { value: 'All', label: 'All Staff Roles' },
                  { value: 'Teacher', label: 'Teacher / Faculty' },
                  { value: 'Counsellor', label: 'Counsellor' },
                  { value: 'Finance', label: 'Finance' },
                  { value: 'Admin', label: 'Admin Executive' }
                ]} 
              />
            )}

            <Input 
              label="Lecture Date" 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
            />

            <Select 
              label="Attendance Status" 
              value={filterAttendanceStatus} 
              onChange={(e) => setFilterAttendanceStatus(e.target.value)} 
              options={[
                { value: 'All', label: 'All Statuses' },
                { value: 'Present', label: 'Present Only' },
                { value: 'Absent', label: 'Absent Only' },
                { value: 'Late', label: 'Late Only' },
                { value: 'Unmarked', label: 'Not Marked Only' }
              ]}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {attendanceType === 'students' ? 'Student Attendance Sheet' : 'Teacher & Staff Attendance Sheet'}
              </CardTitle>
              {activeList.length > 0 && (
                <Button variant="secondary" size="sm" onClick={handleExportCSV} className="flex items-center gap-1.5 cursor-pointer">
                  <Download size={14} /> Export CSV
                </Button>
              )}
            </CardHeader>
            <div className="divide-y divide-slate-100">
              {activeList.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400 font-medium">
                  No records match the selected filters.
                </div>
              ) : (
                paginatedItems.map((s: any, idx) => {
                  const id = attendanceType === 'students' ? s.id : s.email;
                  const currentRecord = attendanceType === 'students' ? records[id] : staffRecords[id];
                  
                  return (
                    <div key={idx} className="flex justify-between items-center py-4 hover:bg-slate-50/40 px-2 rounded-lg transition-colors">
                      <div 
                        onClick={() => setSelectedPerson(s)}
                        className="cursor-pointer flex-1 min-w-0"
                      >
                        <div className="font-semibold text-slate-800">
                          {s.name}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {attendanceType === 'students' 
                            ? `${s.studentId} | ${s.batch}` 
                            : `${s.role} | ${s.branch} | ${s.email}`
                          }
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                           type="button"
                           onClick={() => handleMark(id, 'Present')}
                           className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                             currentRecord === 'Present'
                               ? 'bg-emerald-50 text-emerald-650 border-emerald-200 shadow-sm'
                               : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                           }`}
                        >
                          Present
                        </button>
                        <button
                           type="button"
                           onClick={() => handleMark(id, 'Absent')}
                           className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                             currentRecord === 'Absent'
                               ? 'bg-red-50 text-red-600 border-red-200 shadow-sm'
                               : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                           }`}
                        >
                          Absent
                        </button>
                        <button
                           type="button"
                           onClick={() => handleMark(id, 'Late')}
                           className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                             currentRecord === 'Late'
                               ? 'bg-amber-50 text-amber-600 border-amber-200 shadow-sm'
                               : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                           }`}
                        >
                          Late
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={activeList.length}
              pageSize={itemsPerPage}
              onPageChange={setCurrentPage}
            />
            
            <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
              <Button 
                variant="primary" 
                onClick={handleSave}
                className={(attendanceType === 'students' ? savedType === 'student' : savedType === 'staff') ? '!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !text-white' : ''}
              >
                {(attendanceType === 'students' ? savedType === 'student' : savedType === 'staff') ? '✓ Saved' : 'Save Daily Sheets'}
              </Button>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Daily Lecture &amp; Timetable Planner</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-slate-50 border border-slate-200/60 rounded-xl gap-4">
              <div className="w-24 font-display font-bold text-blue-600 text-sm flex flex-col">
                09:00 AM
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">1.5 Hours</span>
              </div>
              <div className="w-[1px] h-10 bg-slate-200"></div>
              <div className="flex-1">
                <div className="font-semibold text-slate-800 text-sm">Organic Chemistry Mechanisms</div>
                <div className="text-xs text-slate-500 mt-0.5">Batch: JEE-Morning-A | Classroom: Room 101 | Teacher: Prof. Arvind Kelkar</div>
              </div>
            </div>

            <div className="flex items-center p-4 bg-slate-50 border border-slate-200/60 rounded-xl gap-4">
              <div className="w-24 font-display font-bold text-blue-600 text-sm flex flex-col">
                11:00 AM
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">1.5 Hours</span>
              </div>
              <div className="w-[1px] h-10 bg-slate-200"></div>
              <div className="flex-1">
                <div className="font-semibold text-slate-800 text-sm">Electromagnetism Fundamentals</div>
                <div className="text-xs text-slate-500 mt-0.5">Batch: NEET-Regular-B | Classroom: Room 102 | Teacher: Prof. Arvind Kelkar</div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
