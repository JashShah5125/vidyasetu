const appParentAcademicService = require('../services/appParentAcademicService');

class AppParentAcademicController {
    // 1. Timetable
    async getTodaySchedule(req, res) {
        try {
            const studentId = req.params.studentId;
            const result = await appParentAcademicService.getTodaySchedule(req.user.tenantId, studentId);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
    }

    async getCalendarSchedule(req, res) {
        try {
            const studentId = req.params.studentId;
            const result = await appParentAcademicService.getCalendarSchedule(req.user.tenantId, studentId, req.query);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
    }

    // 2. Attendance
    async getAttendanceSummary(req, res) {
        try {
            const studentId = req.params.studentId;
            const result = await appParentAcademicService.getAttendanceSummary(req.user.tenantId, studentId);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
    }

    async getAttendanceHistory(req, res) {
        try {
            const studentId = req.params.studentId;
            const result = await appParentAcademicService.getAttendanceHistory(req.user.tenantId, studentId, req.query);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
    }

    async getSubjectWiseAttendance(req, res) {
        try {
            const studentId = req.params.studentId;
            const result = await appParentAcademicService.getSubjectWiseAttendance(req.user.tenantId, studentId);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
    }

    // 3. Exams
    async getUpcomingExams(req, res) {
        try {
            const studentId = req.params.studentId;
            const result = await appParentAcademicService.getUpcomingExams(req.user.tenantId, studentId);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
    }

    async getExamResults(req, res) {
        try {
            const studentId = req.params.studentId;
            const result = await appParentAcademicService.getExamResults(req.user.tenantId, studentId, req.query);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
    }

    async getExamResultDetails(req, res) {
        try {
            const studentId = req.params.studentId;
            const examId = req.params.examId;
            const result = await appParentAcademicService.getExamResultDetails(req.user.tenantId, studentId, examId);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
    }

    // 4. Homework
    async getHomeworks(req, res) {
        try {
            const studentId = req.params.studentId;
            const result = await appParentAcademicService.getHomeworks(req.user.tenantId, studentId, req.query);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
    }

    async getHomeworkDetails(req, res) {
        try {
            const studentId = req.params.studentId;
            const homeworkId = req.params.id;
            const result = await appParentAcademicService.getHomeworkDetails(req.user.tenantId, studentId, homeworkId);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            return res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new AppParentAcademicController();
