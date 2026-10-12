const appScheduleModel = require('../models/appScheduleModel');

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Convert JS getDay() (0=Sun, 1=Mon ... 6=Sat) to system dayOfWeek (1=Mon ... 7=Sun)
const toSystemDayOfWeek = (jsDay) => {
    return jsDay === 0 ? 7 : jsDay;
};

// Format Date object to YYYY-MM-DD
const formatDateStr = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

class AppScheduleService {
    /**
     * Map raw lecture database row into clean client format
     */
    formatLectureItem(raw, targetDateStr = null) {
        const teacherName = [raw.teacher_first_name, raw.teacher_last_name].filter(Boolean).join(' ') || raw.teacher_user_name || 'Faculty Member';
        
        return {
            lectureId: raw.lecture_id,
            date: raw.lecture_date ? formatDateStr(new Date(raw.lecture_date)) : targetDateStr,
            dayOfWeek: raw.day_of_week,
            dayName: raw.day_of_week >= 1 && raw.day_of_week <= 7 ? DAY_NAMES[raw.day_of_week - 1] : null,
            startTime: raw.start_time ? raw.start_time.slice(0, 5) : null,
            endTime: raw.end_time ? raw.end_time.slice(0, 5) : null,
            slotLabel: raw.slot_label || null,
            lectureType: raw.lecture_type || 'Regular',
            activityType: raw.activity_type || 'Lecture',
            status: raw.status || 'scheduled',
            isModified: Boolean(raw.is_modified_from_default),
            cancellationReason: raw.cancellation_reason || null,
            topic: raw.topic || null,
            subject: {
                subjectId: raw.subject_id,
                subjectName: raw.subject_name,
                subjectCode: raw.subject_code,
                subjectType: raw.subject_type || 'Core'
            },
            teacher: {
                teacherId: raw.teacher_user_id,
                fullName: teacherName,
                designation: raw.teacher_designation || 'Faculty',
                profilePhotoUrl: raw.teacher_photo_url || null
            },
            classroom: raw.classroom_id ? {
                classroomId: raw.classroom_id,
                name: raw.classroom_name,
                roomNumber: raw.classroom_room_number
            } : null
        };
    }

    /**
     * Helper to resolve lectures for a single date (Concrete vs Default Template)
     */
    async resolveLecturesForDate(tenantId, batchId, dateObj) {
        const dateStr = formatDateStr(dateObj);
        const dayOfWeek = toSystemDayOfWeek(dateObj.getDay());

        // 1. Check if concrete calendar lectures are scheduled for this date
        let rows = await appScheduleModel.getConcreteLecturesForDate(tenantId, batchId, dateStr);

        // 2. If no concrete entries, fallback to default master timetable template
        if (!rows || rows.length === 0) {
            rows = await appScheduleModel.getDefaultTemplateLecturesForDay(tenantId, batchId, dayOfWeek);
        }

        return rows.map(r => this.formatLectureItem(r, dateStr));
    }

    /**
     * Get Today's Lecture Schedule
     */
    async getTodaySchedule(tenantId, userId) {
        const batchContext = await appScheduleModel.getStudentBatchContext(tenantId, userId);
        if (!batchContext) {
            const err = new Error('No active enrolled batch found for this student account.');
            err.statusCode = 404;
            throw err;
        }

        const now = new Date();
        const dateStr = formatDateStr(now);
        const dayOfWeek = toSystemDayOfWeek(now.getDay());
        const dayName = DAY_NAMES[dayOfWeek - 1];

        const lectures = await this.resolveLecturesForDate(tenantId, batchContext.batch_id, now);

        return {
            date: dateStr,
            dayOfWeek,
            dayName,
            batch: {
                batchId: batchContext.batch_id,
                batchName: batchContext.batch_name,
                batchCode: batchContext.batch_code
            },
            totalLectures: lectures.length,
            lectures
        };
    }

    /**
     * Get Calendar / Weekly Schedule with date range filter (?from=YYYY-MM-DD&to=YYYY-MM-DD)
     */
    async getCalendarSchedule(tenantId, userId, { from, to }) {
        const batchContext = await appScheduleModel.getStudentBatchContext(tenantId, userId);
        if (!batchContext) {
            const err = new Error('No active enrolled batch found for this student account.');
            err.statusCode = 404;
            throw err;
        }

        // Default to current week (Monday to Sunday) if range not provided
        let startDate = from ? new Date(from) : new Date();
        let endDate = to ? new Date(to) : new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            const err = new Error('Invalid date range format. Please use YYYY-MM-DD.');
            err.statusCode = 400;
            throw err;
        }

        if (endDate < startDate) {
            const temp = startDate;
            startDate = endDate;
            endDate = temp;
        }

        // Limit range to max 31 days to prevent heavy queries
        const dayDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        if (dayDiff > 31) {
            endDate = new Date(startDate.getTime() + 31 * 24 * 60 * 60 * 1000);
        }

        const days = [];
        const current = new Date(startDate);

        while (current <= endDate) {
            const dateStr = formatDateStr(current);
            const dayOfWeek = toSystemDayOfWeek(current.getDay());
            const dayName = DAY_NAMES[dayOfWeek - 1];

            const lectures = await this.resolveLecturesForDate(tenantId, batchContext.batch_id, current);

            days.push({
                date: dateStr,
                dayOfWeek,
                dayName,
                totalLectures: lectures.length,
                lectures
            });

            current.setDate(current.getDate() + 1);
        }

        return {
            range: {
                from: formatDateStr(startDate),
                to: formatDateStr(endDate),
                totalDays: days.length
            },
            batch: {
                batchId: batchContext.batch_id,
                batchName: batchContext.batch_name,
                batchCode: batchContext.batch_code
            },
            days
        };
    }

    /**
     * Get Details of a Specific Lecture Session
     */
    async getLectureDetails(tenantId, userId, lectureId) {
        const batchContext = await appScheduleModel.getStudentBatchContext(tenantId, userId);
        if (!batchContext) {
            const err = new Error('No active enrolled batch found for this student account.');
            err.statusCode = 404;
            throw err;
        }

        const lecture = await appScheduleModel.getLectureById(tenantId, batchContext.batch_id, lectureId);
        if (!lecture) {
            const err = new Error('Lecture session not found for your enrolled batch.');
            err.statusCode = 404;
            throw err;
        }

        const formatted = this.formatLectureItem(lecture);
        formatted.subject.description = lecture.subject_description || null;
        formatted.teacher.qualification = lecture.teacher_qualification || null;
        formatted.teacher.email = lecture.teacher_email || null;
        formatted.classroom = lecture.classroom_id ? {
            classroomId: lecture.classroom_id,
            name: lecture.classroom_name,
            roomNumber: lecture.classroom_room_number,
            type: lecture.classroom_type || 'Lecture Hall'
        } : null;

        return formatted;
    }
}

module.exports = new AppScheduleService();
