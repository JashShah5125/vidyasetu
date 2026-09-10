const teacherScheduleService = require('../services/teacherScheduleService');

/**
 * Teacher Schedule Controller
 * Handles teacher-facing academic schedule HTTP endpoints.
 */
class TeacherScheduleController {
    /**
     * GET /api/teacher/schedule/options
     */
    async getOptions(req, res) {
        try {
            const tenantId = req.user.tenant_id || req.user.tenantId;
            const teacherUserId = req.user.userId || req.user.id;

            const options = await teacherScheduleService.getTeacherOptions(tenantId, teacherUserId);
            return res.status(200).json({
                status: 'success',
                data: options
            });
        } catch (error) {
            console.error('[TeacherScheduleController.getOptions] error:', error);
            return res.status(500).json({
                status: 'error',
                message: error.message || 'Failed to fetch teacher schedule options.'
            });
        }
    }

    /**
     * GET /api/teacher/schedule/today
     */
    async getToday(req, res) {
        try {
            const tenantId = req.user.tenant_id || req.user.tenantId;
            const teacherUserId = req.user.userId || req.user.id;
            const { date, batchId, branchId } = req.query;

            const schedule = await teacherScheduleService.getTodaySchedule(tenantId, teacherUserId, date, { batchId, branchId });
            return res.status(200).json({
                status: 'success',
                data: schedule
            });
        } catch (error) {
            console.error('[TeacherScheduleController.getToday] error:', error);
            return res.status(500).json({
                status: 'error',
                message: error.message || 'Failed to fetch today schedule.'
            });
        }
    }

    /**
     * GET /api/teacher/schedule/week
     */
    async getWeek(req, res) {
        try {
            const tenantId = req.user.tenant_id || req.user.tenantId;
            const teacherUserId = req.user.userId || req.user.id;
            const { startDate, endDate, weekStart, batchId, branchId, courseId, levelId } = req.query;

            let start = startDate || weekStart;
            let end = endDate;

            if (!start) {
                const now = new Date();
                const day = now.getDay();
                const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
                const monday = new Date(now.setDate(diff));
                start = monday.toISOString().split('T')[0];
            }

            if (!end) {
                const monDate = new Date(start);
                monDate.setDate(monDate.getDate() + 6);
                end = monDate.toISOString().split('T')[0];
            }

            const schedule = await teacherScheduleService.getWeekSchedule(tenantId, teacherUserId, start, end, {
                batchId,
                branchId,
                courseId,
                levelId
            });

            return res.status(200).json({
                status: 'success',
                data: schedule
            });
        } catch (error) {
            console.error('[TeacherScheduleController.getWeek] error:', error);
            return res.status(500).json({
                status: 'error',
                message: error.message || 'Failed to fetch weekly schedule.'
            });
        }
    }

    /**
     * GET /api/teacher/schedule/upcoming
     */
    async getUpcoming(req, res) {
        try {
            const tenantId = req.user.tenant_id || req.user.tenantId;
            const teacherUserId = req.user.userId || req.user.id;
            const { from, days, batchId, branchId } = req.query;

            const upcoming = await teacherScheduleService.getUpcomingSchedule(tenantId, teacherUserId, from, days || 14, {
                batchId,
                branchId
            });

            return res.status(200).json({
                status: 'success',
                data: upcoming
            });
        } catch (error) {
            console.error('[TeacherScheduleController.getUpcoming] error:', error);
            return res.status(500).json({
                status: 'error',
                message: error.message || 'Failed to fetch upcoming schedule.'
            });
        }
    }

    /**
     * GET /api/teacher/schedule/academic-events
     */
    async getAcademicEvents(req, res) {
        try {
            const tenantId = req.user.tenant_id || req.user.tenantId;
            const { branchId, academicYearId } = req.query;

            const events = await teacherScheduleService.getAcademicEvents(tenantId, branchId, academicYearId);
            return res.status(200).json({
                status: 'success',
                data: events
            });
        } catch (error) {
            console.error('[TeacherScheduleController.getAcademicEvents] error:', error);
            return res.status(500).json({
                status: 'error',
                message: error.message || 'Failed to fetch academic events.'
            });
        }
    }

    /**
     * GET /api/teacher/schedule/changes
     */
    async getChanges(req, res) {
        try {
            const tenantId = req.user.tenant_id || req.user.tenantId;
            const teacherUserId = req.user.userId || req.user.id;

            const changes = await teacherScheduleService.getScheduleChanges(tenantId, teacherUserId);
            return res.status(200).json({
                status: 'success',
                data: changes
            });
        } catch (error) {
            console.error('[TeacherScheduleController.getChanges] error:', error);
            return res.status(500).json({
                status: 'error',
                message: error.message || 'Failed to fetch schedule changes.'
            });
        }
    }
}

module.exports = new TeacherScheduleController();
