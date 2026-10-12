const appAttendanceModel = require('../models/appAttendanceModel');

const STATUS_LABELS = {
    0: 'absent',
    1: 'present',
    2: 'late'
};

const formatDateStr = (d) => {
    if (!d) return null;
    const dateObj = new Date(d);
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

class AppAttendanceService {
    /**
     * Get Overall Attendance Summary Stats
     */
    async getSummary(tenantId, userId) {
        const studentContext = await appAttendanceModel.getStudentContext(tenantId, userId);
        if (!studentContext) {
            const err = new Error('No active student enrollment found for this account.');
            err.statusCode = 404;
            throw err;
        }

        const stats = await appAttendanceModel.getAttendanceSummary(tenantId, studentContext.student_id);

        const total = Number(stats.total_lectures) || 0;
        const present = Number(stats.present_count) || 0;
        const absent = Number(stats.absent_count) || 0;
        const late = Number(stats.late_count) || 0;

        const effectivePresent = present + late;
        const percentage = total > 0 ? Number(((effectivePresent / total) * 100).toFixed(1)) : 0.0;

        return {
            student: {
                studentId: studentContext.student_id,
                studentCode: studentContext.student_code,
                studentName: studentContext.student_name
            },
            batch: {
                batchId: studentContext.batch_id,
                batchName: studentContext.batch_name,
                batchCode: studentContext.batch_code
            },
            overview: {
                totalLectures: total,
                presentCount: present,
                absentCount: absent,
                lateCount: late,
                attendancePercentage: percentage,
                statusBadge: percentage >= 75 ? 'Good' : (percentage >= 60 ? 'Average' : 'Low')
            }
        };
    }

    /**
     * Get Date-wise Attendance History Log
     */
    async getHistory(tenantId, userId, filters = {}) {
        const studentContext = await appAttendanceModel.getStudentContext(tenantId, userId);
        if (!studentContext) {
            const err = new Error('No active student enrollment found for this account.');
            err.statusCode = 404;
            throw err;
        }

        const rows = await appAttendanceModel.getAttendanceHistory(tenantId, studentContext.student_id, filters);

        const history = rows.map(r => {
            const teacherName = [r.teacher_first_name, r.teacher_last_name].filter(Boolean).join(' ') || r.teacher_user_name || 'Faculty';
            const statusNumber = Number(r.attendance_status);

            return {
                recordId: r.record_id,
                lectureId: r.lecture_id,
                date: formatDateStr(r.lecture_date),
                timings: r.start_time && r.end_time ? `${r.start_time.slice(0, 5)} - ${r.end_time.slice(0, 5)}` : null,
                slotLabel: r.slot_label || null,
                topic: r.topic || null,
                status: STATUS_LABELS[statusNumber] || 'unmarked',
                statusCode: statusNumber,
                remarks: r.remarks || null,
                subject: {
                    subjectId: r.subject_id,
                    subjectName: r.subject_name,
                    subjectCode: r.subject_code,
                    subjectType: r.subject_type || 'Core'
                },
                teacher: {
                    teacherId: r.teacher_user_id,
                    fullName: teacherName,
                    designation: r.teacher_designation || 'Faculty'
                }
            };
        });

        // Group by Day for day-wise calendar view
        const dayMap = new Map();
        history.forEach(item => {
            const dateKey = item.date;
            if (!dayMap.has(dateKey)) {
                const dateObj = new Date(dateKey);
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                dayMap.set(dateKey, {
                    date: dateKey,
                    dayOfWeek: dayNames[dateObj.getDay()] || '',
                    totalLectures: 0,
                    presentCount: 0,
                    absentCount: 0,
                    lateCount: 0,
                    dayStatus: 'absent',
                    lectures: []
                });
            }

            const dayGroup = dayMap.get(dateKey);
            dayGroup.totalLectures += 1;
            if (item.statusCode === 1) dayGroup.presentCount += 1;
            else if (item.statusCode === 0) dayGroup.absentCount += 1;
            else if (item.statusCode === 2) dayGroup.lateCount += 1;

            dayGroup.lectures.push(item);
        });

        // Compute overall day status
        const days = Array.from(dayMap.values()).map(d => {
            if (d.absentCount === 0 && d.presentCount > 0) {
                d.dayStatus = 'full_present';
            } else if (d.presentCount > 0 || d.lateCount > 0) {
                d.dayStatus = 'partial_present';
            } else {
                d.dayStatus = 'absent';
            }
            return d;
        });

        return {
            studentId: studentContext.student_id,
            totalRecords: history.length,
            totalDays: days.length,
            days,
            history
        };
    }

    /**
     * Get Subject-wise Attendance Breakdown
     */
    async getSubjectWise(tenantId, userId) {
        const studentContext = await appAttendanceModel.getStudentContext(tenantId, userId);
        if (!studentContext) {
            const err = new Error('No active student enrollment found for this account.');
            err.statusCode = 404;
            throw err;
        }

        const rows = await appAttendanceModel.getSubjectWiseAttendance(
            tenantId, 
            studentContext.student_id, 
            studentContext.batch_id
        );

        const subjects = rows.map(r => {
            const total = Number(r.total_lectures) || 0;
            const present = Number(r.present_count) || 0;
            const absent = Number(r.absent_count) || 0;
            const late = Number(r.late_count) || 0;
            const effectivePresent = present + late;
            const percentage = total > 0 ? Number(((effectivePresent / total) * 100).toFixed(1)) : 0.0;

            return {
                subjectId: r.subject_id,
                subjectName: r.subject_name,
                subjectCode: r.subject_code,
                subjectType: r.subject_type || 'Core',
                totalLectures: total,
                presentCount: present,
                absentCount: absent,
                lateCount: late,
                attendancePercentage: percentage
            };
        });

        return {
            studentId: studentContext.student_id,
            batchId: studentContext.batch_id,
            batchName: studentContext.batch_name,
            totalSubjects: subjects.length,
            subjects
        };
    }
}

module.exports = new AppAttendanceService();
