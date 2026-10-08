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

    /**
     * GET /api/teacher/schedule/history
     */
    async getHistory(req, res) {
        try {
            const tenantId = req.user.tenant_id || req.user.tenantId;
            const teacherUserId = req.user.userId || req.user.id;
            const { batchId, startDate, endDate, status } = req.query;

            const history = await teacherScheduleService.getHistory(tenantId, teacherUserId, {
                batchId,
                startDate,
                endDate,
                status
            });
            return res.status(200).json({
                status: 'success',
                data: history
            });
        } catch (error) {
            console.error('[TeacherScheduleController.getHistory] error:', error);
            return res.status(500).json({
                status: 'error',
                message: error.message || 'Failed to fetch attendance history.'
            });
        }
    }

    /**
     * GET /api/teacher/schedule/batch-summary
     */
    async getBatchSummary(req, res) {
        try {
            const tenantId = req.user.tenant_id || req.user.tenantId;
            const teacherUserId = req.user.userId || req.user.id;

            const summary = await teacherScheduleService.getBatchTurnoutSummary(tenantId, teacherUserId);
            return res.status(200).json({
                status: 'success',
                data: summary
            });
        } catch (error) {
            console.error('[TeacherScheduleController.getBatchSummary] error:', error);
            return res.status(500).json({
                status: 'error',
                message: error.message || 'Failed to fetch batch turnout summary.'
            });
        }
    }

    /**
     * GET /api/teacher/schedule/low-attendance
     */
    async getLowAttendance(req, res) {
        try {
            const tenantId = req.user.tenant_id || req.user.tenantId;
            const teacherUserId = req.user.userId || req.user.id;
            const { threshold } = req.query;

            const alerts = await teacherScheduleService.getLowAttendanceAlerts(tenantId, teacherUserId, threshold ? Number(threshold) : 75);
            return res.status(200).json({
                status: 'success',
                data: alerts
            });
        } catch (error) {
            console.error('[TeacherScheduleController.getLowAttendance] error:', error);
            return res.status(500).json({
                status: 'error',
                message: error.message || 'Failed to fetch low attendance alerts.'
            });
        }
    }

    /**
     * GET /api/teacher/schedule/availability
     */
    async getAvailability(req, res) {
        try {
            const tenantId = req.user.tenant_id || req.user.tenantId;
            const teacherUserId = req.user.userId || req.user.id;
            const availability = await teacherScheduleService.getTeacherAvailability(tenantId, teacherUserId);
            return res.status(200).json({ status: 'success', data: availability });
        } catch (error) {
            console.error('[TeacherScheduleController.getAvailability] error:', error);
            return res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch availability.' });
        }
    }

    /**
     * POST /api/teacher/schedule/availability/weekly
     */
    async saveWeeklyAvailability(req, res) {
        try {
            const tenantId = req.user.tenant_id || req.user.tenantId;
            const teacherUserId = req.user.userId || req.user.id;
            const { weeklySlots } = req.body;
            const updated = await teacherScheduleService.saveWeeklyAvailability(tenantId, teacherUserId, weeklySlots);
            return res.status(200).json({ status: 'success', message: 'Weekly availability updated successfully', data: updated });
        } catch (error) {
            console.error('[TeacherScheduleController.saveWeeklyAvailability] error:', error);
            return res.status(500).json({ status: 'error', message: error.message || 'Failed to save weekly availability.' });
        }
    }

    /**
     * POST /api/teacher/schedule/availability/exception
     */
    async addUnavailableException(req, res) {
        try {
            const tenantId = req.user.tenant_id || req.user.tenantId;
            const teacherUserId = req.user.userId || req.user.id;
            const exception = await teacherScheduleService.addUnavailableDateException(tenantId, teacherUserId, req.body);
            return res.status(201).json({ status: 'success', message: 'Unavailable date block added', data: exception });
        } catch (error) {
            console.error('[TeacherScheduleController.addUnavailableException] error:', error);
            return res.status(500).json({ status: 'error', message: error.message || 'Failed to add unavailable block.' });
        }
    }

    /**
     * DELETE /api/teacher/schedule/availability/:id
     */
    async deleteAvailabilitySlot(req, res) {
        try {
            const tenantId = req.user.tenant_id || req.user.tenantId;
            const teacherUserId = req.user.userId || req.user.id;
            const { id } = req.params;
            await teacherScheduleService.deleteAvailabilitySlot(tenantId, teacherUserId, id);
            return res.status(200).json({ status: 'success', message: 'Slot deleted successfully' });
        } catch (error) {
            console.error('[TeacherScheduleController.deleteAvailabilitySlot] error:', error);
            return res.status(500).json({ status: 'error', message: error.message || 'Failed to delete slot.' });
        }
    }

    /**
     * GET /api/teacher/schedule/leave-requests
     */
    async getLeaveRequests(req, res) {
        try {
            const tenantId = req.user.tenant_id || req.user.tenantId;
            const teacherUserId = req.user.userId || req.user.id;
            const leaves = await teacherScheduleService.getTeacherLeaveRequests(tenantId, teacherUserId);
            return res.status(200).json({ status: 'success', data: leaves });
        } catch (error) {
            console.error('[TeacherScheduleController.getLeaveRequests] error:', error);
            return res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch leave requests.' });
        }
    }

    /**
     * POST /api/teacher/schedule/leave-requests
     */
    async createLeaveRequest(req, res) {
        try {
            const tenantId = req.user.tenant_id || req.user.tenantId;
            const teacherUserId = req.user.userId || req.user.id;
            const result = await teacherScheduleService.createTeacherLeaveRequest(tenantId, teacherUserId, req.body);
            return res.status(201).json({ status: 'success', data: result, message: 'Leave request submitted successfully.' });
        } catch (error) {
            console.error('[TeacherScheduleController.createLeaveRequest] error:', error);
            return res.status(400).json({ status: 'error', message: error.message || 'Failed to submit leave request.' });
        }
    }

    /**
     * DELETE /api/teacher/schedule/leave-requests/:id
     */
    async cancelLeaveRequest(req, res) {
        try {
            const tenantId = req.user.tenant_id || req.user.tenantId;
            const teacherUserId = req.user.userId || req.user.id;
            const result = await teacherScheduleService.cancelTeacherLeaveRequest(tenantId, teacherUserId, req.params.id);
            return res.status(200).json({ status: 'success', data: result, message: 'Leave request cancelled successfully.' });
        } catch (error) {
            console.error('[TeacherScheduleController.cancelLeaveRequest] error:', error);
            return res.status(400).json({ status: 'error', message: error.message || 'Failed to cancel leave request.' });
        }
    }
}

module.exports = new TeacherScheduleController();
