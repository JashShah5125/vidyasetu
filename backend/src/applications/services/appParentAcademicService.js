const appParentAcademicModel = require('../models/appParentAcademicModel');
const appScheduleModel = require('../models/appScheduleModel');
const appAttendanceModel = require('../models/appAttendanceModel');
const appExamModel = require('../models/appExamModel');
const appHomeworkModel = require('../models/appHomeworkModel');

// Local Date helper
const getLocalDateString = (d = new Date()) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const getDayName = (dateStr) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const d = new Date(dateStr + 'T00:00:00');
    return days[d.getDay()];
};

const parseJsonArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
};

class AppParentAcademicService {
    /**
     * Resolve child context
     */
    async getChildContext(tenantId, studentId) {
        const student = await appParentAcademicModel.getStudentBatchContext(tenantId, studentId);
        if (!student) {
            const err = new Error('Student record not found.');
            err.statusCode = 404;
            throw err;
        }
        return student;
    }

    // ==========================================
    // 1. TIMETABLE & SCHEDULE
    // ==========================================

    async getTodaySchedule(tenantId, studentId) {
        const student = await this.getChildContext(tenantId, studentId);
        if (!student.batch_id) {
            return {
                date: getLocalDateString(),
                dayOfWeek: getDayName(getLocalDateString()),
                batch: null,
                totalLectures: 0,
                lectures: []
            };
        }

        const todayStr = getLocalDateString();
        const dayOfWeek = getDayName(todayStr);

        let lectures = await appScheduleModel.getConcreteLecturesForDate(tenantId, student.batch_id, todayStr);
        if (lectures.length === 0) {
            lectures = await appScheduleModel.getDefaultTemplateLecturesForDay(tenantId, student.batch_id, dayOfWeek);
        }

        const formatted = lectures.map(l => {
            const isCancelled = l.status === 'cancelled' || l.lecture_type === 'cancelled';
            return {
                id: l.lecture_id,
                startTime: l.start_time ? String(l.start_time).slice(0, 5) : '',
                endTime: l.end_time ? String(l.end_time).slice(0, 5) : '',
                subject: {
                    id: l.subject_id,
                    name: l.subject_name || 'General Subject',
                    code: l.subject_code,
                    type: l.subject_type
                },
                teacher: {
                    id: l.teacher_user_id,
                    name: l.teacher_first_name ? `${l.teacher_first_name} ${l.teacher_last_name || ''}`.trim() : (l.teacher_user_name || 'Faculty'),
                    designation: l.teacher_designation,
                    photoUrl: l.teacher_photo_url
                },
                classroom: l.classroom_id ? {
                    id: l.classroom_id,
                    name: l.classroom_name,
                    roomNumber: l.classroom_room_number
                } : null,
                status: isCancelled ? 'cancelled' : (l.status || 'scheduled'),
                cancellationReason: l.cancellation_reason || null,
                topic: l.topic,
                slotLabel: l.slot_label
            };
        });

        return {
            date: todayStr,
            dayOfWeek,
            batch: {
                id: student.batch_id,
                name: student.batch_name,
                code: student.batch_code
            },
            totalLectures: formatted.length,
            lectures: formatted
        };
    }

    async getCalendarSchedule(tenantId, studentId, { from, to }) {
        const student = await this.getChildContext(tenantId, studentId);
        if (!student.batch_id) {
            return { range: { from, to }, days: [] };
        }

        const startDate = new Date(from || getLocalDateString());
        const endDate = new Date(to || from || getLocalDateString());

        const days = [];
        for (let dt = new Date(startDate); dt <= endDate; dt.setDate(dt.getDate() + 1)) {
            const dateStr = getLocalDateString(dt);
            const dayOfWeek = getDayName(dateStr);

            let lectures = await appScheduleModel.getConcreteLecturesForDate(tenantId, student.batch_id, dateStr);
            if (lectures.length === 0) {
                lectures = await appScheduleModel.getDefaultTemplateLecturesForDay(tenantId, student.batch_id, dayOfWeek);
            }

            const formatted = lectures.map(l => ({
                id: l.lecture_id,
                startTime: l.start_time ? String(l.start_time).slice(0, 5) : '',
                endTime: l.end_time ? String(l.end_time).slice(0, 5) : '',
                subject: {
                    id: l.subject_id,
                    name: l.subject_name || 'General Subject',
                    code: l.subject_code
                },
                teacher: {
                    name: l.teacher_first_name ? `${l.teacher_first_name} ${l.teacher_last_name || ''}`.trim() : (l.teacher_user_name || 'Faculty')
                },
                classroom: l.classroom_id ? {
                    name: l.classroom_name,
                    roomNumber: l.classroom_room_number
                } : null,
                status: (l.status === 'cancelled' || l.lecture_type === 'cancelled') ? 'cancelled' : (l.status || 'scheduled'),
                cancellationReason: l.cancellation_reason || null,
                topic: l.topic
            }));

            days.push({
                date: dateStr,
                dayOfWeek,
                totalLectures: formatted.length,
                lectures: formatted
            });
        }

        return {
            range: {
                from: getLocalDateString(startDate),
                to: getLocalDateString(endDate)
            },
            batch: {
                id: student.batch_id,
                name: student.batch_name
            },
            days
        };
    }

    // ==========================================
    // 2. ATTENDANCE TRACKER
    // ==========================================

    async getAttendanceSummary(tenantId, studentId) {
        const student = await this.getChildContext(tenantId, studentId);
        const stats = await appAttendanceModel.getAttendanceSummary(tenantId, studentId);

        const totalLectures = Number(stats.total_lectures) || 0;
        const presentCount = Number(stats.present_count) || 0;
        const absentCount = Number(stats.absent_count) || 0;
        const lateCount = Number(stats.late_count) || 0;
        const percentage = totalLectures > 0 ? Math.round((presentCount / totalLectures) * 1000) / 10 : 100.0;

        return {
            studentId,
            studentName: student.student_name,
            academicYear: student.academic_year_name || '2026-27',
            overallPercentage: percentage,
            requiredPercentage: 75.0,
            standingStatus: percentage >= 85 ? 'Good standing' : (percentage >= 75 ? 'On track' : 'Needs attention'),
            totalLectures,
            presentCount,
            absentCount,
            lateCount
        };
    }

    async getAttendanceHistory(tenantId, studentId, filters) {
        await this.getChildContext(tenantId, studentId);
        const records = await appAttendanceModel.getAttendanceHistory(tenantId, studentId, filters);

        // Group into days with day status
        const dayMap = new Map();
        for (const r of records) {
            const dateStr = r.lecture_date ? getLocalDateString(new Date(r.lecture_date)) : getLocalDateString();
            if (!dayMap.has(dateStr)) {
                dayMap.set(dateStr, {
                    date: dateStr,
                    dayOfWeek: getDayName(dateStr),
                    totalLectures: 0,
                    presentLectures: 0,
                    absentLectures: 0,
                    lectures: []
                });
            }
            const dayEntry = dayMap.get(dateStr);
            dayEntry.totalLectures += 1;
            if (r.attendance_status === 1) dayEntry.presentLectures += 1;
            else if (r.attendance_status === 0) dayEntry.absentLectures += 1;

            dayEntry.lectures.push({
                recordId: r.record_id,
                lectureId: r.lecture_id,
                subject: {
                    id: r.subject_id,
                    name: r.subject_name
                },
                time: r.start_time ? String(r.start_time).slice(0, 5) : '',
                status: r.attendance_status === 1 ? 'Present' : (r.attendance_status === 0 ? 'Absent' : 'Late'),
                statusCode: r.attendance_status,
                remarks: r.remarks
            });
        }

        const days = Array.from(dayMap.values()).map(d => {
            let dayStatus = 'Absent';
            if (d.presentLectures === d.totalLectures && d.totalLectures > 0) {
                dayStatus = 'Present';
            } else if (d.presentLectures > 0) {
                dayStatus = 'Partial';
            }
            return {
                ...d,
                dayStatus
            };
        });

        return {
            filtersApplied: filters,
            totalDays: days.length,
            days
        };
    }

    async getSubjectWiseAttendance(tenantId, studentId) {
        const student = await this.getChildContext(tenantId, studentId);
        if (!student.batch_id) {
            return { totalSubjects: 0, subjects: [] };
        }

        const subjects = await appAttendanceModel.getSubjectWiseAttendance(tenantId, studentId, student.batch_id);
        const subjectBreakdown = subjects.map(sub => {
            const total = Number(sub.total_lectures) || 0;
            const present = Number(sub.present_count) || 0;
            const pct = total > 0 ? Math.round((present / total) * 1000) / 10 : 100.0;

            return {
                subjectId: sub.subject_id,
                subjectName: sub.subject_name,
                subjectCode: sub.subject_code,
                subjectType: sub.subject_type,
                totalClasses: total,
                attendedClasses: present,
                absentClasses: Number(sub.absent_count) || 0,
                lateClasses: Number(sub.late_count) || 0,
                percentage: pct
            };
        });

        return {
            totalSubjects: subjectBreakdown.length,
            subjects: subjectBreakdown
        };
    }

    // ==========================================
    // 3. EXAMS & ASSESSMENTS
    // ==========================================

    async getUpcomingExams(tenantId, studentId) {
        const student = await this.getChildContext(tenantId, studentId);
        if (!student.batch_id) {
            return { totalUpcoming: 0, upcomingExams: [] };
        }

        const exams = await appExamModel.getUpcomingExams(tenantId, studentId, student.batch_id);
        return {
            totalUpcoming: exams.length,
            upcomingExams: exams.map(e => ({
                examId: e.exam_id,
                title: e.exam_title,
                syllabus: e.syllabus_and_instructions,
                examType: e.exam_type,
                maxMarks: Number(e.max_marks),
                passingMarks: Number(e.passing_marks),
                date: e.exam_date ? getLocalDateString(new Date(e.exam_date)) : '',
                startTime: e.start_time ? String(e.start_time).slice(0, 5) : '',
                endTime: e.end_time ? String(e.end_time).slice(0, 5) : '',
                status: e.exam_status,
                subject: {
                    id: e.subject_id,
                    name: e.subject_name,
                    code: e.subject_code,
                    type: e.subject_type
                },
                academicYear: e.academic_year_name
            }))
        };
    }

    async getExamResults(tenantId, studentId, { page = 1, limit = 20, subjectId = null, academicYearId = null }) {
        await this.getChildContext(tenantId, studentId);
        const { rows, total } = await appExamModel.getExamResults(tenantId, studentId, { page, limit, subjectId, academicYearId });

        const totalPages = Math.ceil(total / Number(limit)) || 1;

        return {
            data: rows.map(r => ({
                marksId: r.marks_id,
                examId: r.exam_id,
                title: r.exam_title,
                examType: r.exam_type,
                date: r.exam_date ? getLocalDateString(new Date(r.exam_date)) : '',
                subject: {
                    id: r.subject_id,
                    name: r.subject_name,
                    code: r.subject_code,
                    type: r.subject_type
                },
                maxMarks: Number(r.max_marks) || 0,
                passingMarks: Number(r.passing_marks) || 0,
                marksObtained: Number(r.marks_obtained) || 0,
                percentage: (Number(r.max_marks) > 0 && r.marks_obtained !== null) ? Math.round((Number(r.marks_obtained) / Number(r.max_marks)) * 1000) / 10 : 0,
                grade: r.grade || 'A',
                isAbsent: Boolean(r.is_absent),
                status: r.is_absent ? 'Absent' : (r.result_status || 'Graded'),
                teacherRemarks: r.teacher_remarks,
                evaluatedByName: r.evaluated_by_name,
                academicYearName: r.academic_year_name
            })),
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages,
                hasNext: Number(page) < totalPages,
                hasPrev: Number(page) > 1
            }
        };
    }

    async getExamResultDetails(tenantId, studentId, examId) {
        await this.getChildContext(tenantId, studentId);

        const exam = await appExamModel.getExamResultDetails(tenantId, studentId, examId);
        if (!exam) {
            const err = new Error('Exam result not found or results are not published yet.');
            err.statusCode = 404;
            throw err;
        }

        const marksObtained = Number(exam.marks_obtained) || 0;
        const maxMarks = Number(exam.max_marks) || 0;
        const scorePct = maxMarks > 0 ? Math.round((marksObtained / maxMarks) * 1000) / 10 : 0;

        return {
            marksId: exam.marks_id,
            examId: exam.exam_id,
            title: exam.exam_title,
            description: exam.exam_description,
            examType: exam.exam_type,
            date: exam.exam_date ? getLocalDateString(new Date(exam.exam_date)) : '',
            startTime: exam.start_time ? String(exam.start_time).slice(0, 5) : '',
            endTime: exam.end_time ? String(exam.end_time).slice(0, 5) : '',
            subject: {
                id: exam.subject_id,
                name: exam.subject_name,
                code: exam.subject_code,
                type: exam.subject_type
            },
            marksObtained: marksObtained,
            maxMarks: maxMarks,
            passingMarks: Number(exam.passing_marks) || 0,
            percentage: scorePct,
            grade: exam.grade || 'A',
            isAbsent: Boolean(exam.is_absent),
            status: exam.is_absent ? 'Absent' : (exam.result_status || 'Graded'),
            teacherRemarks: exam.teacher_remarks,
            evaluatedByName: exam.evaluated_by_name || (exam.teacher_first_name ? `${exam.teacher_first_name} ${exam.teacher_last_name || ''}`.trim() : null),
            academicYearName: exam.academic_year_name,
            examFiles: parseJsonArray(exam.exam_files)
        };
    }

    // ==========================================
    // 4. HOMEWORK & ASSIGNMENTS
    // ==========================================

    async getHomeworks(tenantId, studentId, filters) {
        const student = await this.getChildContext(tenantId, studentId);
        if (!student.batch_id) {
            return {
                data: [],
                pagination: { page: 1, limit: filters.limit || 20, total: 0, totalPages: 1, hasNext: false, hasPrev: false }
            };
        }

        const { total, rows } = await appHomeworkModel.getHomeworkList(tenantId, studentId, student.batch_id, filters);
        const totalPages = Math.ceil(total / Number(filters.limit || 20)) || 1;

        return {
            data: (rows || []).map(h => ({
                id: h.homework_id,
                title: h.title,
                description: h.description,
                assignmentType: h.assignment_type,
                subject: {
                    id: h.subject_id,
                    name: h.subject_name,
                    code: h.subject_code
                },
                dueDate: h.due_date ? getLocalDateString(new Date(h.due_date)) : '',
                maxMarks: Number(h.max_marks) || 0,
                status: h.computed_status,
                isSubmitted: Boolean(h.submission_id),
                submittedAt: h.submitted_at,
                evaluationStatus: h.submission_status,
                marksObtained: Number(h.marks_obtained) || 0,
                teacherName: h.teacher_first_name ? `${h.teacher_first_name} ${h.teacher_last_name || ''}`.trim() : h.teacher_name
            })),
            pagination: {
                page: Number(filters.page || 1),
                limit: Number(filters.limit || 20),
                total,
                totalPages,
                hasNext: Number(filters.page || 1) < totalPages,
                hasPrev: Number(filters.page || 1) > 1
            }
        };
    }

    async getHomeworkDetails(tenantId, studentId, homeworkId) {
        const student = await this.getChildContext(tenantId, studentId);
        const hw = await appHomeworkModel.getHomeworkById(tenantId, homeworkId, studentId, student.batch_id);

        if (!hw) {
            const err = new Error('Homework assignment not found.');
            err.statusCode = 404;
            throw err;
        }

        return {
            id: hw.homework_id,
            title: hw.title,
            description: hw.description,
            assignmentType: hw.assignment_type,
            subject: {
                id: hw.subject_id,
                name: hw.subject_name,
                code: hw.subject_code
            },
            dueDate: hw.due_date ? getLocalDateString(new Date(hw.due_date)) : '',
            maxMarks: Number(hw.max_marks) || 0,
            status: hw.computed_status,
            teacherAttachments: parseJsonArray(hw.teacher_attachments),
            teacher: {
                name: hw.teacher_first_name ? `${hw.teacher_first_name} ${hw.teacher_last_name || ''}`.trim() : hw.teacher_name,
                designation: hw.teacher_designation
            },
            submission: hw.submission_id ? {
                id: hw.submission_id,
                submittedAt: hw.submitted_at,
                status: hw.submission_status,
                marksObtained: Number(hw.marks_obtained) || 0,
                teacherFeedback: hw.teacher_feedback,
                gradedAt: hw.graded_at,
                graderName: hw.grader_name,
                responseText: hw.response_text,
                files: parseJsonArray(hw.student_attachments)
            } : null
        };
    }
}

module.exports = new AppParentAcademicService();
