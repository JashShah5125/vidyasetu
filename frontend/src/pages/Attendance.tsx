import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import {
  ArrowLeft, Download, Upload, Users, ArrowRight, CheckCircle2, AlertTriangle,
  Clock, GraduationCap, ChevronDown, ChevronUp, Search,
  BookOpen, XCircle, RefreshCw
} from 'lucide-react';
import { Pagination } from '../components/ui/Pagination';
import { useLocation, useNavigate } from 'react-router-dom';
import { BulkImportModal } from '../components/ui/BulkImportModal';
import { Modal } from '../components/ui/Modal';
import { attendanceApi } from '../services/attendanceApi';
import type { AttendanceLecture, AttendanceOptions, StaffAttendanceRow, StaffAttendanceSaveRecord } from '../services/attendanceApi';

const formatTime = (timeStr?: string | null): string => {
  if (!timeStr) return '--:--';
  const clean = timeStr.slice(0, 5);
  const [h, m] = clean.split(':').map(Number);
  if (isNaN(h)) return clean;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};

const calculateDuration = (startTime?: string | null, endTime?: string | null): string => {
  if (!startTime || !endTime) return '';
  const [sh, sm] = startTime.slice(0, 5).split(':').map(Number);
  const [eh, em] = endTime.slice(0, 5).split(':').map(Number);
  if (isNaN(sh) || isNaN(eh)) return '';
  const diffMins = (eh * 60 + em) - (sh * 60 + sm);
  if (diffMins <= 0) return '';
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
};

interface AttendanceProps {
  initialTab?: 'sheet' | 'timetable';
}

export const Attendance: React.FC<AttendanceProps> = ({ initialTab = 'sheet' }) => {
  const { students, currentUser, addToast } = useApp();
  const navigate = useNavigate();
  const [subTab, setSubTab] = useState<'sheet' | 'timetable'>(initialTab);
  const [savedType, setSavedType] = useState<'student' | 'staff' | 'teacher' | null>(null);
  
  const location = useLocation();
  const navState = location.state as { branch?: string; course?: string; batch?: string; date?: string; tab?: 'students' | 'staff' | 'teachers' } | null;

  const [attendanceType, setAttendanceType] = useState<'students' | 'staff' | 'teachers'>(navState?.tab || 'students');

  const [branch, setBranch] = useState(navState?.branch || (currentUser?.role === 'branch-admin' ? currentUser.branch || 'Mumbai West' : 'Mumbai West'));
  const [course, setCourse] = useState<string>('');
  const [program, setProgram] = useState<string>('');
  const [level, setLevel] = useState<string>('');
  const [batch, setBatch] = useState<string>('');
  const [attendanceOptions, setAttendanceOptions] = useState<AttendanceOptions | null>(null);
  const [staffDeptFilter, setStaffDeptFilter] = useState('All');
  const [date, setDate] = useState(navState?.date || new Date().toISOString().split('T')[0]);
  const [filterAttendanceStatus, setFilterAttendanceStatus] = useState('All');

  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);

  const [records, setRecords] = useState<{ [key: string]: 'Present' | 'Absent' | 'Late' }>({
    'S-201': 'Present',
    'S-202': 'Present',
    'S-203': 'Present',
    'S-204': 'Absent',
    'S-205': 'Present',
    'S-206': 'Late',
    'S-207': 'Present'
  });

  const [staffMarks, setStaffMarks] = useState<{ [staffId: number]: 0 | 1 | 2 }>({});
  const [staffRoster, setStaffRoster] = useState<StaffAttendanceRow[]>([]);
  const [loadingStaffRoster, setLoadingStaffRoster] = useState(false);
  const [savingStaff, setSavingStaff] = useState(false);
  const [staffAttendanceForDay, setStaffAttendanceForDay] = useState<StaffAttendanceRow[]>([]);

  const [teachersRoster, setTeachersRoster] = useState<StaffAttendanceRow[]>([]);
  const [loadingTeachersRoster, setLoadingTeachersRoster] = useState(false);
  const [teacherMarks, setTeacherMarks] = useState<{ [staffId: number]: 0 | 1 | 2 }>({});
  const [savingTeachers, setSavingTeachers] = useState(false);
  const [teacherAbsentConfirm, setTeacherAbsentConfirm] = useState<{ teacher: StaffAttendanceRow; lectureCount: number } | null>(null);
  const [teacherLecturesMap, setTeacherLecturesMap] = useState<{ [teacherUserId: number]: AttendanceLecture[] }>({});
  const [expandedTeacherId, setExpandedTeacherId] = useState<number | null>(null);
  const [teacherSearch, setTeacherSearch] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [dailyLectures, setDailyLectures] = useState<AttendanceLecture[]>([]);
  const [loadingDailyLectures, setLoadingDailyLectures] = useState(false);
  const itemsPerPage = 5;

  const [sheetLectures, setSheetLectures] = useState<AttendanceLecture[]>([]);
  const [loadingSheetLectures, setLoadingSheetLectures] = useState(false);

  const numeric = (v: string) => (v && /^\d+$/.test(v) ? v : undefined);
  const selectedBatchId = numeric(batch);

  const branchId = useMemo(() => {
    if (!attendanceOptions) return undefined;
    const b = attendanceOptions.branches.find(o => o.name === branch);
    return b ? b.id : undefined;
  }, [attendanceOptions, branch]);

  const selectedCourseId = course ? Number(course) : undefined;
  const selectedProgramId = program ? Number(program) : undefined;
  const selectedLevelId = level ? Number(level) : undefined;

  const programOptions = useMemo(() => {
    if (!attendanceOptions) return [];
    const list = selectedCourseId
      ? attendanceOptions.programs.filter(p => p.course_id === selectedCourseId)
      : attendanceOptions.programs;
    return Array.from(new Map(list.map(p => [p.id, p])).values());
  }, [attendanceOptions, selectedCourseId]);

  const levelOptions = useMemo(() => {
    if (!attendanceOptions) return [];
    return attendanceOptions.levels.filter(l =>
      (!selectedCourseId || l.course_id === selectedCourseId) &&
      (!selectedProgramId || l.program_id === selectedProgramId)
    );
  }, [attendanceOptions, selectedCourseId, selectedProgramId]);

  const batchOptions = useMemo(() => {
    if (!attendanceOptions) return [];
    return attendanceOptions.batches.filter(b =>
      (!branchId || b.branch_id === branchId) &&
      (!selectedLevelId || b.level_id === selectedLevelId)
    );
  }, [attendanceOptions, branchId, selectedLevelId]);

  const selectedCourseName = useMemo(() => {
    if (!attendanceOptions || !course) return '';
    return attendanceOptions.courses.find(c => c.id === selectedCourseId)?.name || '';
  }, [attendanceOptions, course, selectedCourseId]);

  const selectedBatchName = useMemo(() => {
    if (!attendanceOptions || !batch) return '';
    return attendanceOptions.batches.find(b => b.id === Number(batch))?.name || '';
  }, [attendanceOptions, batch]);

  const linkedBranchId = useMemo(() => {
    if (branchId) return branchId;
    if (!selectedBatchId || !attendanceOptions) return undefined;
    return attendanceOptions.batches.find(b => b.id === selectedBatchId)?.branch_id;
  }, [branchId, selectedBatchId, attendanceOptions]);

  const isTeacherMember = (m: StaffAttendanceRow) => {
    const empType = (m.employee_type || '').toLowerCase();
    const role = (m.role_name || '').toLowerCase();
    const desig = (m.designation || '').toLowerCase();
    const dept = (m.department || '').toLowerCase();
    return (
      empType === 'teaching' ||
      role.includes('teacher') ||
      role.includes('faculty') ||
      desig.includes('teacher') ||
      desig.includes('faculty') ||
      dept.includes('teaching') ||
      (m.lecture_ids && m.lecture_ids.length > 0)
    );
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchBranch = !branch || s.branch === branch;
      const matchCourse = !selectedCourseName || s.course === selectedCourseName;
      const matchBatch = !selectedBatchName || s.batch === selectedBatchName;
      
      const status = records[s.id];
      const matchStatus = filterAttendanceStatus === 'All' 
        ? true 
        : filterAttendanceStatus === 'Unmarked' 
          ? !status 
          : status === filterAttendanceStatus;

      return matchBranch && matchCourse && matchBatch && matchStatus;
    });
  }, [students, branch, selectedCourseName, selectedBatchName, records, filterAttendanceStatus]);

  const filterAttendanceStatusLabel = (value: 0 | 1 | 2 | null | undefined): string | undefined =>
    value === 0 ? 'Absent' : value === 1 ? 'Present' : value === 2 ? 'Late' : undefined;

  const filteredStaffRoster = useMemo(() => {
    return staffRoster.filter(m => {
      if (isTeacherMember(m)) return false;

      const matchDept = staffDeptFilter === 'All' || m.department === staffDeptFilter;

      const status = filterAttendanceStatusLabel(staffMarks[m.staff_id] ?? m.attendance_status);
      const matchStatus = filterAttendanceStatus === 'All'
        ? true
        : filterAttendanceStatus === 'Unmarked'
          ? !status
          : status === filterAttendanceStatus;
      return matchDept && matchStatus;
    });
  }, [staffRoster, staffMarks, filterAttendanceStatus, staffDeptFilter]);

  const staffStatusValue = (row: StaffAttendanceRow): 0 | 1 | 2 | null | undefined =>
    staffMarks[row.staff_id] ?? row.attendance_status;

  const teacherStatusValue = (row: StaffAttendanceRow): 0 | 1 | 2 | null | undefined =>
    teacherMarks[row.staff_id] ?? row.attendance_status;

  const filteredTeachersRoster = useMemo(() => {
    return teachersRoster.filter(t => {
      const name = (t.name || `${t.first_name || ''} ${t.last_name || ''}`).toLowerCase();
      const code = (t.employee_id || '').toLowerCase();
      const email = (t.email || '').toLowerCase();
      const dept = (t.department || '').toLowerCase();

      const matchSearch =
        !teacherSearch ||
        name.includes(teacherSearch.toLowerCase()) ||
        code.includes(teacherSearch.toLowerCase()) ||
        email.includes(teacherSearch.toLowerCase()) ||
        dept.includes(teacherSearch.toLowerCase());

      const status = filterAttendanceStatusLabel(teacherMarks[t.staff_id] ?? t.attendance_status);
      const matchStatus = filterAttendanceStatus === 'All'
        ? true
        : filterAttendanceStatus === 'Unmarked'
          ? !status
          : status === filterAttendanceStatus;

      return matchSearch && matchStatus;
    });
  }, [teachersRoster, teacherSearch, teacherMarks, filterAttendanceStatus]);

  const teacherPresentAt = (lecture: AttendanceLecture): boolean => {
    if (!lecture.teacher_user_id) return false;
    const row = staffAttendanceForDay.find(r => r.user_id === lecture.teacher_user_id);
    return !!row && row.lecture_ids.includes(lecture.id);
  };

  const activeList = attendanceType === 'students' 
    ? filteredStudents 
    : attendanceType === 'staff' 
      ? filteredStaffRoster 
      : filteredTeachersRoster;

  const totalPages = Math.ceil(activeList.length / itemsPerPage);
  const paginatedItems = activeList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExportCSV = () => {
    if (attendanceType === 'students') {
      const headers = ['Student ID', 'Student Name', 'Branch', 'Course', 'Batch', 'Date', 'Status'];
      const rows = activeList.map(person => {
        const p = person as any;
        const id = p.id || '';
        const status = records[id] || 'Not Marked';
        return [p.studentId || '', p.name || '', p.branch || '', p.course || '', p.batch || '', date, status];
      });

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `attendance_student_${date}_${filterAttendanceStatus.toLowerCase()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (attendanceType === 'staff') {
      const headers = ['Employee ID', 'Employee Name', 'Department', 'Role', 'Branch', 'Email', 'Date', 'Status'];
      const rows = filteredStaffRoster.map(person => {
        const staffRow = person as StaffAttendanceRow;
        const status = filterAttendanceStatusLabel(staffMarks[staffRow.staff_id] ?? staffRow.attendance_status) || 'Not Marked';
        return [staffRow.employee_id || 'N/A', staffRow.name || '', staffRow.department || 'General', staffRow.role_name || '', staffRow.primary_branch_name || '', staffRow.email || '', date, status];
      });

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `attendance_staff_${date}_${filterAttendanceStatus.toLowerCase()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = ['Teacher ID', 'Teacher Name', 'Department', 'Designation', 'Branch', 'Email', 'Assigned Lectures', 'Date', 'Status'];
      const rows = filteredTeachersRoster.map(t => {
        const status = filterAttendanceStatusLabel(teacherMarks[t.staff_id] ?? t.attendance_status) || 'Not Marked';
        const lecturesCount = teacherLecturesMap[t.user_id]?.length || 0;
        return [t.employee_id || 'N/A', t.name || '', t.department || 'Academic', t.designation || 'Teacher', t.primary_branch_name || '', t.email || '', lecturesCount, date, status];
      });

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `attendance_teacher_${date}_${filterAttendanceStatus.toLowerCase()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  useEffect(() => {
    setSubTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    let cancelled = false;
    attendanceApi.getOptions()
      .then((opts) => {
        if (cancelled) return;
        setAttendanceOptions(opts);
        if (navState?.course) {
          const c = opts.courses.find(o => o.name === navState.course);
          if (c) setCourse(String(c.id));
        }
        if (navState?.batch) {
          const b = opts.batches.find(o => o.name === navState.batch);
          if (b) setBatch(String(b.id));
        }
      })
      .catch(() => { if (!cancelled) addToast('Failed to load filter options.', 'error'); });
    return () => { cancelled = true; };
  }, [navState?.course, navState?.batch, addToast]);

  useEffect(() => {
    if (subTab !== 'timetable') return;
    let cancelled = false;
    setLoadingDailyLectures(true);
    attendanceApi.getDailyLectures({ branchId, batchId: selectedBatchId, date })
      .then((rows) => { if (!cancelled) setDailyLectures(rows); })
      .catch(() => { if (!cancelled) addToast('Failed to load daily lectures.', 'error'); })
      .finally(() => { if (!cancelled) setLoadingDailyLectures(false); });
    return () => { cancelled = true; };
  }, [subTab, date, branchId, selectedBatchId, addToast]);

  useEffect(() => {
    if (attendanceType !== 'students') return;
    if (!selectedBatchId) {
      setSheetLectures([]);
      return;
    }
    let cancelled = false;
    setLoadingSheetLectures(true);
    attendanceApi.getDailyLectures({ branchId, batchId: selectedBatchId, date })
      .then((rows) => { if (!cancelled) setSheetLectures(rows); })
      .catch(() => { if (!cancelled) addToast('Failed to load daily lectures.', 'error'); })
      .finally(() => { if (!cancelled) setLoadingSheetLectures(false); });
    return () => { cancelled = true; };
  }, [attendanceType, branchId, selectedBatchId, date, addToast]);

  useEffect(() => {
    if (attendanceType !== 'students' || !linkedBranchId || !selectedBatchId) {
      setStaffAttendanceForDay([]);
      return;
    }
    let cancelled = false;
    attendanceApi.getStaffAttendance({ branchId: linkedBranchId, date })
      .then((rows) => { if (!cancelled) setStaffAttendanceForDay(rows); })
      .catch(() => { if (!cancelled) setStaffAttendanceForDay([]); });
    return () => { cancelled = true; };
  }, [attendanceType, linkedBranchId, selectedBatchId, date]);

  useEffect(() => {
    if (attendanceType !== 'staff') return;
    let cancelled = false;
    setLoadingStaffRoster(true);
    attendanceApi.getStaffAttendance({ branchId: branchId || 'All', date, employeeType: 'Non-Teaching' })
      .then((rows) => { 
        if (!cancelled) { 
          const nonTeachers = rows.filter(r => !isTeacherMember(r));
          setStaffRoster(nonTeachers); 
          setCurrentPage(1); 
        } 
      })
      .catch(() => { if (!cancelled) addToast('Failed to load staff attendance.', 'error'); })
      .finally(() => { if (!cancelled) setLoadingStaffRoster(false); });
    return () => { cancelled = true; };
  }, [attendanceType, branchId, date, addToast]);

  useEffect(() => {
    if (attendanceType !== 'teachers') return;
    let cancelled = false;
    setLoadingTeachersRoster(true);

    Promise.all([
      attendanceApi.getStaffAttendance({ branchId: branchId || 'All', date, employeeType: 'Teaching' }),
      attendanceApi.getDailyLectures({ branchId: branchId || 'All', date })
    ])
      .then(([staffRows, lectureRows]) => {
        if (!cancelled) {
          const teachersOnly = staffRows.filter(r => isTeacherMember(r));
          setTeachersRoster(teachersOnly.length > 0 ? teachersOnly : staffRows);

          const map: { [teacherUserId: number]: AttendanceLecture[] } = {};
          lectureRows.forEach(l => {
            if (l.teacher_user_id) {
              if (!map[l.teacher_user_id]) map[l.teacher_user_id] = [];
              map[l.teacher_user_id].push(l);
            }
          });
          setTeacherLecturesMap(map);
          setCurrentPage(1);
        }
      })
      .catch(() => {
        if (!cancelled) addToast('Failed to load teacher attendance and lectures roster.', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoadingTeachersRoster(false);
      });

    return () => { cancelled = true; };
  }, [attendanceType, branchId, date, addToast]);

  const handleMarkStaff = (staffId: number, status: 0 | 1 | 2) => {
    setStaffMarks(prev => {
      const next = { ...prev };
      if (next[staffId] === status) delete next[staffId];
      else next[staffId] = status;
      return next;
    });
  };

  const handleSaveStaff = async () => {
    const recordsToSave: StaffAttendanceSaveRecord[] = staffRoster
      .map(r => ({ row: r, value: staffStatusValue(r) }))
      .filter(x => x.value === 0 || x.value === 1 || x.value === 2)
      .map(x => ({ staff_id: x.row.staff_id, status: x.value as 0 | 1 | 2 }));
    if (recordsToSave.length === 0) {
      addToast('No marks to save for this day.', 'error');
      return;
    }
    try {
      setSavingStaff(true);
      await attendanceApi.saveStaffAttendance(branchId || 'All', date, recordsToSave);
      const refreshed = await attendanceApi.getStaffAttendance({ branchId: branchId || 'All', date, employeeType: 'Non-Teaching' });
      setStaffRoster(refreshed.filter(r => !isTeacherMember(r)));
      setStaffMarks({});
      setSavedType('staff');
      setTimeout(() => setSavedType(null), 4000);
      addToast('Staff attendance saved.', 'success');
    } catch {
      addToast('Failed to save staff attendance.', 'error');
    } finally {
      setSavingStaff(false);
    }
  };

  const applyTeacherStatusChange = (staffId: number, status: 0 | 1 | 2) => {
    const teacher = teachersRoster.find(t => t.staff_id === staffId);
    const updatedLectureIds = status === 0 ? [] : (teacher?.lecture_ids || []);

    setTeacherMarks(prev => {
      const next = { ...prev };
      if (next[staffId] === status) delete next[staffId];
      else next[staffId] = status;
      return next;
    });
    setTeachersRoster(prev => prev.map(t => t.staff_id === staffId ? {
      ...t,
      attendance_status: status,
      lecture_ids: updatedLectureIds
    } : t));
  };

  const handleTeacherStatusChange = (staffId: number, status: 0 | 1 | 2) => {
    const teacher = teachersRoster.find(t => t.staff_id === staffId);
    if (!teacher) return;
    const currentStatus = teacherStatusValue(teacher);
    const lectureCount = (teacher.lecture_ids || []).length;

    // If teacher is currently marked Present or has marked lectures, prompt before marking absent
    if (status === 0 && (currentStatus === 1 || lectureCount > 0)) {
      setTeacherAbsentConfirm({ teacher, lectureCount });
      return;
    }

    applyTeacherStatusChange(staffId, status);
  };

  const handleMarkTeacher = handleTeacherStatusChange;

  const handleTeacherMarkAll = (status: 0 | 1) => {
    const updatedMarks: { [staffId: number]: 0 | 1 | 2 } = {};
    filteredTeachersRoster.forEach(t => {
      updatedMarks[t.staff_id] = status;
    });
    setTeacherMarks(prev => ({ ...prev, ...updatedMarks }));
    setTeachersRoster(prev => prev.map(t => {
      if (filteredTeachersRoster.some(ft => ft.staff_id === t.staff_id)) {
        return { ...t, attendance_status: status, lecture_ids: status === 0 ? [] : (t.lecture_ids || []) };
      }
      return t;
    }));
    addToast(status === 1 ? 'All teachers marked Present. Click "Save Daily Sheet" to persist.' : 'All teachers marked Absent. Click "Save Daily Sheet" to persist.', 'info');
  };

  const handleTeacherClearAll = () => {
    setTeacherMarks({});
    addToast('Teacher attendance marks cleared for this session.', 'info');
  };

  const handleSaveTeachers = async () => {
    const recordsToSave: StaffAttendanceSaveRecord[] = teachersRoster
      .map(r => ({ row: r, value: teacherStatusValue(r) }))
      .filter(x => x.value === 0 || x.value === 1 || x.value === 2)
      .map(x => ({ 
        staff_id: x.row.staff_id, 
        status: x.value as 0 | 1 | 2,
        lecture_ids: x.value === 0 ? [] : (x.row.lecture_ids || [])
      }));
    if (recordsToSave.length === 0) {
      addToast('No teacher marks to save for this day.', 'error');
      return;
    }
    try {
      setSavingTeachers(true);
      await attendanceApi.saveStaffAttendance(branchId || 'All', date, recordsToSave);
      const refreshed = await attendanceApi.getStaffAttendance({ branchId: branchId || 'All', date, employeeType: 'Teaching' });
      const teachersOnly = refreshed.filter(r => isTeacherMember(r));
      setTeachersRoster(teachersOnly.length > 0 ? teachersOnly : refreshed);
      setTeacherMarks({});
      setSavedType('teacher');
      setTimeout(() => setSavedType(null), 4000);
      addToast('Teacher attendance saved successfully.', 'success');
    } catch {
      addToast('Failed to save teacher attendance.', 'error');
    } finally {
      setSavingTeachers(false);
    }
  };

  // Toggle Teacher attendance specifically for a scheduled lecture (stored in staff_attendance.lecture_ids JSON column)
  const handleToggleTeacherLecture = async (teacherStaffId: number, teacherUserId: number, lecture: AttendanceLecture, present: boolean) => {
    // 1. Optimistically update local teachersRoster state
    setTeachersRoster(prev => prev.map(t => {
      if (t.staff_id !== teacherStaffId && t.user_id !== teacherUserId) return t;
      const ids = new Set(t.lecture_ids || []);
      if (present) {
        ids.add(lecture.id);
      } else {
        ids.delete(lecture.id);
      }
      const updatedIds = Array.from(ids);
      return {
        ...t,
        lecture_ids: updatedIds,
        attendance_status: updatedIds.length > 0 ? 1 : (present ? 1 : t.attendance_status)
      };
    }));

    // 2. Persist to backend
    try {
      await attendanceApi.saveStaffLectureAttendance(lecture.id, present);
      addToast(
        present 
          ? `Teacher marked Present for ${lecture.subject_name || 'lecture'} (recorded in lecture_ids JSON).` 
          : `Teacher marked Not Present for ${lecture.subject_name || 'lecture'}.`, 
        'success'
      );
    } catch {
      addToast('Failed to update teacher lecture attendance.', 'error');
      attendanceApi.getStaffAttendance({ branchId: branchId || 'All', date, employeeType: 'Teaching' })
        .then(rows => {
          const teachersOnly = rows.filter(r => isTeacherMember(r));
          setTeachersRoster(teachersOnly.length > 0 ? teachersOnly : rows);
        })
        .catch(() => {});
    }
  };

  const handleToggleTeacher = async (lecture: AttendanceLecture, present: boolean) => {
    const apply = (rows: StaffAttendanceRow[]) => rows.map(r => {
      if (r.user_id !== lecture.teacher_user_id) return r;
      const ids = new Set(r.lecture_ids);
      if (present) ids.add(lecture.id);
      else ids.delete(lecture.id);
      return { ...r, lecture_ids: [...ids], attendance_status: present || ids.size > 0 ? 1 : r.attendance_status };
    });
    setStaffAttendanceForDay(prev => apply(prev));
    try {
      await attendanceApi.saveStaffLectureAttendance(lecture.id, present);
      addToast(present ? 'Teacher marked present.' : 'Teacher marked not present.', 'success');
    } catch {
      addToast('Failed to update teacher attendance.', 'error');
      if (linkedBranchId) {
        attendanceApi.getStaffAttendance({ branchId: linkedBranchId, date })
          .then(setStaffAttendanceForDay)
          .catch(() => {});
      }
    }
  };

  const getAttendanceHistory = (personId: string) => {
    const logs = [];
    const baseDate = new Date();
    const statuses: ('Present' | 'Absent' | 'Late')[] = ['Present', 'Present', 'Present', 'Absent', 'Present', 'Late', 'Present'];
    
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(baseDate.getDate() - i);
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0) continue;
      
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

  const teacherStats = useMemo(() => {
    const total = filteredTeachersRoster.length;
    let present = 0;
    let absent = 0;
    let late = 0;
    let unmarked = 0;
    let totalLectures = 0;

    filteredTeachersRoster.forEach(t => {
      const val = teacherStatusValue(t);
      if (val === 1) present++;
      else if (val === 0) absent++;
      else if (val === 2) late++;
      else unmarked++;

      const lList = teacherLecturesMap[t.user_id] || [];
      totalLectures += lList.length;
    });

    return { total, present, absent, late, unmarked, marked: total - unmarked, totalLectures };
  }, [filteredTeachersRoster, teacherMarks, teacherLecturesMap]);

  const teacherDepartments = useMemo(() => {
    const set = new Set<string>();
    teachersRoster.forEach(t => {
      if (t.department) set.add(t.department);
    });
    return Array.from(set);
  }, [teachersRoster]);

  const staffDepartments = useMemo(() => {
    const set = new Set<string>();
    staffRoster.forEach(s => {
      if (!isTeacherMember(s) && s.department) set.add(s.department);
    });
    return Array.from(set);
  }, [staffRoster]);

  const handleExportHistoryCSV = () => {
    const historyLogs = getAttendanceHistory(selectedPerson.id || selectedPerson.email);
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

  if (selectedPerson) {
    const historyLogs = getAttendanceHistory(selectedPerson.id || selectedPerson.email);
    const totalDays = historyLogs.length;
    const presentDays = historyLogs.filter(l => l.status === 'Present').length;
    const lateDays = historyLogs.filter(l => l.status === 'Late').length;
    const absentDays = historyLogs.filter(l => l.status === 'Absent').length;
    const attendanceRate = totalDays > 0 ? Math.round(((presentDays + lateDays * 0.5) / totalDays) * 100) : 100;

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
          <Button variant="secondary" onClick={handleExportHistoryCSV} className="flex items-center gap-2 cursor-pointer">
            <Download size={16} /> Export CSV
          </Button>
        </div>

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
                  <div className="text-xl font-bold text-indigo-600 mt-0.5">{attendanceRate}%</div>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 px-4 py-2 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Present / Total</div>
                  <div className="text-xl font-bold text-slate-800 mt-0.5">{presentDays} / {totalDays}</div>
                </div>
              </div>
            </div>

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
          ✓ Daily {savedType === 'student' ? 'student' : savedType === 'teacher' ? 'teacher' : 'staff'} sheets successfully saved and synced to database logs.
        </div>
      )}
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">
          {subTab === 'sheet' ? 'Attendance registers' : 'Class Timetable Schedules'}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {subTab === 'sheet' 
            ? 'Select class rosters, mark daily student, staff and teacher attendance parameters, and export logs.'
            : 'Track weekly lecture sessions, classroom allotments, and teacher schedules.'}
        </p>
      </div>

      {subTab === 'sheet' ? (
        <>
          <div className="flex gap-2 border-b border-slate-200 pb-px overflow-x-auto whitespace-nowrap scrollbar-none">
            <button
              onClick={() => { setAttendanceType('students'); setCurrentPage(1); }}
              className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                attendanceType === 'students'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users size={16} /> Student Attendance
            </button>
            <button
              onClick={() => { setAttendanceType('staff'); setCurrentPage(1); }}
              className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                attendanceType === 'staff'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users size={16} /> Staff Attendance
            </button>
            <button
              onClick={() => { setAttendanceType('teachers'); setCurrentPage(1); }}
              className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                attendanceType === 'teachers'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <GraduationCap size={16} /> Teacher Attendance
            </button>
          </div>
          <div className={`grid grid-cols-1 ${
            attendanceType === 'students' 
              ? 'sm:grid-cols-2 lg:grid-cols-7' 
              : attendanceType === 'teachers' 
                ? 'sm:grid-cols-2 lg:grid-cols-4' 
                : 'sm:grid-cols-2 lg:grid-cols-4'
          } gap-4 bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm`}>
            <Select 
              label="Branch" 
              value={branch} 
              onChange={(e) => { setBranch(e.target.value); setBatch(''); }} 
              options={currentUser?.role === 'branch-admin' ? [
                { value: currentUser.branch || '', label: currentUser.branch || '' }
              ] : [
                { value: '', label: 'All Branches' },
                ...(attendanceOptions?.branches.map(b => ({ value: b.name, label: b.name })) || [])
              ]}
              disabled={currentUser?.role === 'branch-admin'}
            />

            {attendanceType === 'students' && (
              <>
                <Select 
                  label="Course" 
                  value={course} 
                  onChange={(e) => { setCourse(e.target.value); setProgram(''); setLevel(''); setBatch(''); }} 
                  options={[
                    { value: '', label: 'All Courses' },
                    ...(attendanceOptions?.courses.map(c => ({ value: String(c.id), label: c.name })) || [])
                  ]} 
                  disabled={!attendanceOptions}
                />
                <Select 
                  label="Program" 
                  value={program} 
                  onChange={(e) => { setProgram(e.target.value); setLevel(''); setBatch(''); }} 
                  options={[
                    { value: '', label: 'All Programs' },
                    ...programOptions.map(p => ({ value: String(p.id), label: p.name }))
                  ]} 
                  disabled={!attendanceOptions || !course}
                />
                <Select 
                  label="Level" 
                  value={level} 
                  onChange={(e) => { setLevel(e.target.value); setBatch(''); }} 
                  options={[
                    { value: '', label: 'All Levels' },
                    ...levelOptions.map(l => ({ value: String(l.id), label: l.name }))
                  ]} 
                  disabled={!attendanceOptions || !program}
                />
                <Select 
                  label="Batch" 
                  value={batch} 
                  onChange={(e) => setBatch(e.target.value)} 
                  options={[
                    { value: '', label: 'All Batches' },
                    ...batchOptions.map(b => ({ value: String(b.id), label: b.name }))
                  ]} 
                  disabled={!attendanceOptions || !level}
                />
              </>
            )}

            {attendanceType === 'staff' && (
              <Select 
                label="Staff Department" 
                value={staffDeptFilter} 
                onChange={(e) => setStaffDeptFilter(e.target.value)} 
                options={[
                  { value: 'All', label: 'All Non-Teaching Staff' },
                  ...staffDepartments.map(d => ({ value: d, label: d }))
                ]} 
              />
            )}

            {attendanceType === 'teachers' && (
              <Input
                label="Search Teacher"
                placeholder="Name, code, or department..."
                value={teacherSearch}
                onChange={(e) => { setTeacherSearch(e.target.value); setCurrentPage(1); }}
              />
            )}

            <Input 
              label="Date" 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
            />

            <Select 
              label="Attendance Status" 
              value={filterAttendanceStatus} 
              onChange={(e) => { setFilterAttendanceStatus(e.target.value); setCurrentPage(1); }} 
              options={[
                { value: 'All', label: 'All Statuses' },
                { value: 'Present', label: 'Present Only' },
                { value: 'Absent', label: 'Absent Only' },
                { value: 'Late', label: 'Late Only' },
                { value: 'Unmarked', label: 'Not Marked Only' }
              ]}
            />
          </div>

          {/* TAB 1: STUDENT ATTENDANCE */}
          {attendanceType === 'students' && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedBatchId ? `Daily Lectures — ${selectedBatchName || 'Selected Batch'}` : 'Student Attendance Sheet'}
                </CardTitle>
              </CardHeader>

              {selectedBatchId ? (
                loadingSheetLectures ? (
                  <div className="p-8 text-center text-sm text-slate-400 font-medium">
                    <div className="animate-spin inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                    <div className="mt-3">Loading lectures...</div>
                  </div>
                ) : sheetLectures.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-400 font-medium">
                    No lectures found for {selectedBatchName || 'this batch'} on {date}.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {sheetLectures.map((l) => {
                      const start = l.start_time?.slice(0, 5) || '--:--';
                      const end = l.end_time?.slice(0, 5) || '--:--';
                      const [sh, sm] = start.split(':').map(Number);
                      const displayStart = !isNaN(sh) ? `${((sh + 11) % 12) + 1}:${String(sm).padStart(2, '0')} ${sh >= 12 ? 'PM' : 'AM'}` : start;
                      const [eh, em] = end.split(':').map(Number);
                      const displayEnd = !isNaN(eh) ? `${((eh + 11) % 12) + 1}:${String(em).padStart(2, '0')} ${eh >= 12 ? 'PM' : 'AM'}` : end;
                      const durationMins = !isNaN(sh) && !isNaN(eh) ? ((eh * 60 + em) - (sh * 60 + sm)) : 0;
                      const taken = l.attendance_taken === 1 || l.status === 'completed';

                      return (
                        <div key={l.id} className="hover:bg-slate-50/60 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="w-24 font-display font-bold text-indigo-600 text-sm flex flex-col shrink-0">
                                {displayStart}
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                  {durationMins > 0 ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m` : `${displayEnd}`}
                                </span>
                              </div>
                              <div className="w-[1px] h-10 bg-slate-200 shrink-0 hidden sm:block"></div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-slate-900 text-sm">{l.subject_name || `Subject #${l.subject_id}`}</div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                  Batch: {l.batch_name} {l.classroom_name ? `| Classroom: ${l.classroom_name}` : ''} {l.teacher_name ? `| Teacher: ${l.teacher_name}` : ''}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 shrink-0">
                              {taken ? (
                                <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs">
                                  <CheckCircle2 size={13} className="text-emerald-600" /> TAKEN {l.marked_count !== undefined ? `(${l.marked_count} marked)` : ''}
                                </span>
                              ) : (
                                <span className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs">
                                  <Clock size={13} className="text-amber-600" /> NOT TAKEN
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => navigate(`/attendance/lecture/${l.id}`, {
                                  state: { lecture: l, date, branch, batch, course }
                                })}
                                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                              >
                                <Users size={14} /> View &amp; Mark Attendance <ArrowRight size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="p-8 text-center text-sm text-slate-400 font-medium">
                  Select a batch from the filters above (Course → Program → Level → Batch) to view that batch's lectures for {date}.
                </div>
              )}
            </Card>
          )}

          {/* TAB 2: STAFF ATTENDANCE */}
          {attendanceType === 'staff' && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Staff Attendance Sheet (Non-Teaching Staff)</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mark daily attendance for administrative, operations, counseling, and non-teaching staff.
                  </p>
                </div>
                {activeList.length > 0 && (
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-1.5 cursor-pointer font-bold">
                      <Upload size={13} /> Bulk Import
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleExportCSV} className="flex items-center gap-1.5 cursor-pointer">
                      <Download size={14} /> Export CSV
                    </Button>
                  </div>
                )}
              </CardHeader>

              {loadingStaffRoster ? (
                <div className="p-8 text-center text-sm text-slate-400 font-medium">
                  <div className="animate-spin inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                  <div className="mt-3">Loading staff attendance...</div>
                </div>
              ) : paginatedItems.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400 font-medium">
                  No staff records match the selected filters.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {paginatedItems.map((s: any, idx) => {
                    const staffRow = s as StaffAttendanceRow;
                    const statusValue = staffStatusValue(staffRow);
                    const statusLabel = filterAttendanceStatusLabel(statusValue);
                    return (
                      <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 py-4 hover:bg-slate-50/40 px-4 rounded-lg transition-colors">
                        <div
                          onClick={() => setSelectedPerson({ ...staffRow, role: staffRow.role_name, branch: staffRow.primary_branch_name })}
                          className="cursor-pointer flex-1 min-w-0"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-800">{staffRow.name}</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              statusLabel === 'Present' ? 'bg-emerald-50 text-emerald-700' :
                              statusLabel === 'Late' ? 'bg-amber-50 text-amber-700' :
                              statusLabel === 'Absent' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {statusLabel || 'Unmarked'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">
                            {`${staffRow.employee_id} | ${staffRow.role_name} | ${staffRow.primary_branch_name || 'No Branch'}`}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {staffRow.email}
                            {staffRow.employee_type === 'Teaching' && staffRow.lecture_ids.length > 0
                              ? ` | ${staffRow.lecture_ids.length} lecture(s)` : ''}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMarkStaff(staffRow.staff_id, 1)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                              statusValue === 1
                                ? 'bg-emerald-50 text-emerald-650 border-emerald-200 shadow-sm'
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkStaff(staffRow.staff_id, 0)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                              statusValue === 0
                                ? 'bg-red-50 text-red-600 border-red-200 shadow-sm'
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            Absent
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkStaff(staffRow.staff_id, 2)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                              statusValue === 2
                                ? 'bg-amber-50 text-amber-600 border-amber-200 shadow-sm'
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            Late
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={activeList.length}
                pageSize={itemsPerPage}
                onPageChange={setCurrentPage}
              />

              <div className="flex justify-end pt-4 border-t border-slate-100 mt-4 px-4 pb-4">
                <Button
                  variant="primary"
                  onClick={handleSaveStaff}
                  disabled={savingStaff}
                  className={savedType === 'staff' ? '!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !text-white' : ''}
                >
                  {savingStaff ? 'Saving…' : 'Save Daily Sheets'}
                </Button>
              </div>
            </Card>
          )}

          {attendanceType === 'teachers' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase">
                    <GraduationCap size={14} className="text-slate-400" /> Total Teachers
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1">{teacherStats.total}</div>
                </div>

                <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase">
                    <RefreshCw size={14} className="text-blue-500" /> Marked / Total
                  </div>
                  <div className="text-2xl font-extrabold text-blue-600 mt-1">
                    {teacherStats.marked} <span className="text-xs text-slate-400 font-bold">/ {teacherStats.total}</span>
                  </div>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-xl shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 uppercase">
                    <CheckCircle2 size={14} className="text-emerald-600" /> Present
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-700 mt-1">{teacherStats.present}</div>
                </div>

                <div className="bg-red-50/70 border border-red-200/80 p-3.5 rounded-xl shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-800 uppercase">
                    <XCircle size={14} className="text-red-600" /> Absent
                  </div>
                  <div className="text-2xl font-extrabold text-red-700 mt-1">{teacherStats.absent}</div>
                </div>

                <div className="bg-amber-50/70 border border-amber-200/80 p-3.5 rounded-xl shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 uppercase">
                    <Clock size={14} className="text-amber-600" /> Late
                  </div>
                  <div className="text-2xl font-extrabold text-amber-700 mt-1">{teacherStats.late}</div>
                </div>

                <div className="bg-indigo-50/70 border border-indigo-200/80 p-3.5 rounded-xl shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-800 uppercase">
                    <BookOpen size={14} className="text-indigo-600" /> Scheduled Lectures
                  </div>
                  <div className="text-2xl font-extrabold text-indigo-700 mt-1">{teacherStats.totalLectures}</div>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full">
                    <div>
                      <CardTitle>Teacher Attendance Register</CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Track daily faculty attendance and manage their scheduled lecture rosters for {date}.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleTeacherMarkAll(1)}
                          className="px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                        >
                          All Present
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTeacherMarkAll(0)}
                          className="px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        >
                          All Absent
                        </button>
                        <button
                          type="button"
                          onClick={handleTeacherClearAll}
                          className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                        >
                          Clear Marks
                        </button>
                      </div>

                      <Button variant="secondary" size="sm" onClick={handleExportCSV} className="flex items-center gap-1.5 cursor-pointer">
                        <Download size={14} /> Export CSV
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {loadingTeachersRoster ? (
                  <div className="p-12 text-center text-sm text-slate-400 font-medium">
                    <div className="animate-spin inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                    <div className="mt-3">Loading teachers roster and lecture schedules...</div>
                  </div>
                ) : filteredTeachersRoster.length === 0 ? (
                  <div className="py-16 text-center flex flex-col items-center justify-center">
                    <div className="bg-slate-100 p-3.5 rounded-full mb-2.5">
                      <GraduationCap size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">No teachers found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-0.5">
                      No teacher records match the selected branch, date, or search query.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {(paginatedItems as StaffAttendanceRow[]).map((teacher) => {
                      const statusValue = teacherStatusValue(teacher);
                      const statusLabel = filterAttendanceStatusLabel(statusValue);
                      const lectures = teacherLecturesMap[teacher.user_id] || [];
                      const isExpanded = expandedTeacherId === teacher.user_id;

                      return (
                        <div key={teacher.staff_id} className="transition-colors">
                          <div className={`p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                            isExpanded ? 'bg-indigo-50/20' : 'hover:bg-slate-50/50'
                          }`}>
                            <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center shrink-0 border border-indigo-200 shadow-2xs">
                                {teacher.name?.charAt(0) || 'T'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-900 text-sm">{teacher.name}</span>
                                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                    statusLabel === 'Present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    statusLabel === 'Late' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    statusLabel === 'Absent' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                                  }`}>
                                    {statusLabel || 'Unmarked'}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                                  <span className="font-mono font-semibold text-slate-600 uppercase">{teacher.employee_id}</span>
                                  <span>•</span>
                                  <span className="font-semibold text-slate-700">{teacher.department || 'Academic Department'}</span>
                                  <span>•</span>
                                  <span>{teacher.primary_branch_name || 'All Branches'}</span>
                                  {teacher.email && (
                                    <>
                                      <span className="hidden sm:inline">•</span>
                                      <span className="hidden sm:inline">{teacher.email}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap justify-end">
                              {/* Teacher overall status toggle buttons */}
                              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                                <button
                                  type="button"
                                  onClick={() => handleTeacherStatusChange(teacher.staff_id, 1)}
                                  className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                                    statusValue === 1
                                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                  }`}
                                >
                                  <CheckCircle2 size={13} /> Present
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTeacherStatusChange(teacher.staff_id, 0)}
                                  className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                                    statusValue === 0
                                      ? 'bg-red-600 text-white shadow-xs font-bold'
                                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                  }`}
                                >
                                  <XCircle size={13} /> Absent
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTeacherStatusChange(teacher.staff_id, 2)}
                                  className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                                    statusValue === 2
                                      ? 'bg-amber-600 text-white shadow-xs font-bold'
                                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                  }`}
                                >
                                  <Clock size={13} /> Late
                                </button>
                              </div>

                              {/* View Lectures Dropdown toggle button */}
                              <button
                                type="button"
                                onClick={() => setExpandedTeacherId(isExpanded ? null : teacher.user_id)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                                  isExpanded
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                    : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                                }`}
                              >
                                <BookOpen size={14} />
                                <span>View Lectures ({lectures.length})</span>
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            </div>
                          </div>

                          {/* Expanded Lectures Drawer */}
                          {isExpanded && (
                            <div className="p-4 bg-slate-50/80 border-t border-slate-200/80">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                  <BookOpen size={13} className="text-indigo-600" />
                                  Scheduled Lectures for {teacher.name} on {date}
                                </h4>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  {lectures.length} {lectures.length === 1 ? 'lecture' : 'lectures'} assigned
                                </span>
                              </div>

                              {lectures.length === 0 ? (
                                <div className="p-4 rounded-xl bg-white border border-slate-200 text-center text-xs text-slate-500">
                                  No scheduled lectures assigned to this teacher on {date}.
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {lectures.map((lec) => {
                                    const isTeacherPresent = (teacher.lecture_ids || []).includes(lec.id);
                                    return (
                                      <div
                                        key={lec.id}
                                        className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                                      >
                                        <div className="flex items-start sm:items-center gap-3">
                                          <div className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 text-center shrink-0">
                                            <div className="text-xs font-bold font-mono">
                                              {formatTime(lec.start_time)}
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-medium">
                                              {calculateDuration(lec.start_time, lec.end_time)}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <span className="font-bold text-slate-900 text-sm">{lec.subject_name}</span>
                                              <span className="text-xs font-mono text-slate-400">({lec.subject_code})</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 mt-0.5">
                                              <span>Batch: <strong className="text-slate-700">{lec.batch_name}</strong></span>
                                              {lec.classroom_name && (
                                                <>
                                                  <span>•</span>
                                                  <span>Room: {lec.classroom_name}</span>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-3 justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                                          {/* Teacher attendance for this specific lecture (stored in JSON column lecture_ids) */}
                                          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                                            <button
                                              type="button"
                                              onClick={() => handleToggleTeacherLecture(teacher.staff_id, teacher.user_id, lec, true)}
                                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                                                isTeacherPresent
                                                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                                                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                              }`}
                                              title="Mark teacher present for this lecture (adds to lecture_ids JSON)"
                                            >
                                              <CheckCircle2 size={12} /> Present
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleToggleTeacherLecture(teacher.staff_id, teacher.user_id, lec, false)}
                                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                                                !isTeacherPresent
                                                  ? 'bg-red-600 text-white shadow-xs font-bold'
                                                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                              }`}
                                              title="Mark teacher not present for this lecture (removes from lecture_ids JSON)"
                                            >
                                              <XCircle size={12} /> Not Present
                                            </button>
                                          </div>

                                          {/* Student lecture attendance status */}
                                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                            lec.attendance_taken
                                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                              : 'bg-amber-50 text-amber-700 border-amber-200'
                                          }`}>
                                            {lec.attendance_taken ? 'Students Marked' : 'Students Pending'}
                                          </span>

                                          {/* Navigate to Student Lecture Attendance */}
                                          <button
                                            type="button"
                                            onClick={() => navigate(`/attendance/lecture/${lec.id}?date=${date}`)}
                                            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                                          >
                                            <span>Mark Students</span>
                                            <ArrowRight size={13} />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredTeachersRoster.length}
                  pageSize={itemsPerPage}
                  onPageChange={setCurrentPage}
                />

                {/* Footer Save / Action */}
                <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    Faculty attendance modifications are saved upon clicking &quot;Save Daily Sheet&quot;. Per-lecture attendance updates in real-time.
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveTeachers}
                      disabled={savingTeachers}
                      className={savedType === 'teacher' ? '!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !text-white' : 'cursor-pointer font-semibold shadow-xs'}
                    >
                      {savingTeachers ? 'Saving...' : 'Save Daily Sheet'}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      ) : (
        /* Timetable Planner View (when subTab === 'timetable') */
        <Card className="overflow-hidden border-slate-200 shadow-xs">
          <CardHeader className="border-b border-slate-200/80 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-800">
                  Class Schedule &amp; Timetable Planner
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Overview of all scheduled lectures for {date} across branches.
                </p>
              </div>
            </div>
          </CardHeader>
          <div className="p-6">
            {loadingDailyLectures ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading schedule...</div>
            ) : dailyLectures.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No lectures scheduled for this date.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dailyLectures.map((lec) => (
                  <div key={lec.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                        {formatTime(lec.start_time)} - {formatTime(lec.end_time)}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        lec.attendance_taken ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {lec.attendance_taken ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{lec.subject_name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">{lec.subject_code} • {lec.batch_name}</p>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">
                        Teacher: <strong className="text-slate-800">{lec.teacher_name || 'Unassigned'}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate(`/attendance/lecture/${lec.id}?date=${date}`)}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        Open <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

            {/* Teacher Absent Warning Confirmation Modal */}
      <Modal
        isOpen={!!teacherAbsentConfirm}
        onClose={() => setTeacherAbsentConfirm(null)}
        title="Mark Teacher Absent for the Whole Day"
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setTeacherAbsentConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="!bg-red-600 hover:!bg-red-700 !text-white font-bold cursor-pointer"
              onClick={async () => {
                if (teacherAbsentConfirm) {
                  const staffId = teacherAbsentConfirm.teacher.staff_id;
                  setTeacherAbsentConfirm(null);
                  await applyTeacherStatusChange(staffId, 0);
                }
              }}
            >
              Mark Absent for the Whole Day
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-2xl shrink-0 border border-red-100">
            <AlertTriangle size={24} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-800">
              Are you sure you want to mark <span className="text-red-700 font-bold">{teacherAbsentConfirm?.teacher.name}</span> absent?
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              This faculty member is currently marked present for the day{teacherAbsentConfirm && teacherAbsentConfirm.lectureCount > 0 ? ` with ${teacherAbsentConfirm.lectureCount} assigned lecture(s)` : ''}.
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium leading-relaxed">
              ⚠️ Marking them absent for the day will also mark them absent for <strong>all lectures</strong> scheduled on <strong>{date}</strong>.
            </div>
          </div>
        </div>
      </Modal>

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title={`Bulk Import ${attendanceType === 'students' ? 'Student' : 'Staff'} Attendance`}
        description="Select a CSV spreadsheet to import attendance marks at once. Columns must match the template below exactly."
        sampleHeaders={attendanceType === 'students' ? ['StudentId', 'Status'] : ['Email', 'Status']}
        sampleRows={
          attendanceType === 'students'
            ? [
                ['S-201', 'Present'],
                ['S-204', 'Late'],
                ['S-206', 'Absent']
              ]
            : [
                ['priya.counsel@apexiit.com', 'Present'],
                ['arvind.chem@apexiit.com', 'Absent']
              ]
        }
        onImport={(importedRows) => {
          if (attendanceType === 'staff') {
            const updated: { [staffId: number]: 0 | 1 | 2 } = { ...staffMarks };
            importedRows.forEach((row) => {
              const key = (row['EmployeeId'] || row['Email'] || row['ID'] || '').toString().toLowerCase();
              const status = (row['Status'] || 'Present') as string;
              const statusNum: 0 | 1 | 2 = status.toLowerCase() === 'absent' ? 0 : status.toLowerCase() === 'late' ? 2 : 1;
              const hit = staffRoster.find(r =>
                r.email?.toLowerCase() === key || r.employee_id?.toLowerCase() === key
              );
              if (hit) updated[hit.staff_id] = statusNum;
            });
            setStaffMarks(updated);
            addToast('Staff attendance records updated.', 'success');
          } else {
            const updatedRecords = { ...records };
            importedRows.forEach((row) => {
              const id = (row['StudentId'] || row['ID'] || '') as string;
              const status = (row['Status'] || 'Present') as 'Present' | 'Absent' | 'Late';
              if (id) updatedRecords[id] = status;
            });
            setRecords(updatedRecords);
            addToast('Student attendance records updated.', 'success');
          }
        }}
      />
    </div>
  );
};
