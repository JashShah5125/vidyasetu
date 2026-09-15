const doubtService = require('../services/doubtService');

class TeacherDoubtController {
    /**
     * GET /api/teacher/doubts
     * List all doubts assigned to the authenticated teacher.
     */
    async getDoubts(req, res) {
        try {
            const tenantId = req.user.tenantId || req.tenantId;
            const teacherUserId = req.user.userId || req.user.id;

            const doubts = await doubtService.listTeacherDoubts(tenantId, teacherUserId, req.query);
            return res.json({
                status: 'success',
                data: doubts
            });
        } catch (error) {
            console.error('[TeacherDoubtController.getDoubts] error:', error);
            return res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message || 'Failed to list doubts.'
            });
        }
    }

    /**
     * GET /api/teacher/doubts/:id
     * Retrieve single doubt thread details with replies for teacher.
     */
    async getDoubtById(req, res) {
        try {
            const tenantId = req.user.tenantId || req.tenantId;
            const teacherUserId = req.user.userId || req.user.id;
            const { id } = req.params;

            const doubt = await doubtService.getTeacherDoubtById(tenantId, teacherUserId, id);
            return res.json({
                status: 'success',
                data: doubt
            });
        } catch (error) {
            console.error('[TeacherDoubtController.getDoubtById] error:', error);
            return res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message || 'Failed to fetch doubt thread.'
            });
        }
    }

    /**
     * POST /api/teacher/doubts/:id/replies
     * Add teacher reply (multipart supported, auto updates status to In Progress).
     */
    async addReply(req, res) {
        try {
            const tenantId = req.user.tenantId || req.tenantId;
            const teacherUserId = req.user.userId || req.user.id;
            const { id } = req.params;

            const doubt = await doubtService.addTeacherReply(tenantId, teacherUserId, id, req.body, req.files);
            return res.json({
                status: 'success',
                message: 'Reply sent.',
                data: doubt
            });
        } catch (error) {
            console.error('[TeacherDoubtController.addReply] error:', error);
            return res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message || 'Failed to send reply.'
            });
        }
    }

    /**
     * PATCH /api/teacher/doubts/:id/status
     * Update doubt status (e.g. resolve (2) or reopen (3)).
     */
    async updateStatus(req, res) {
        try {
            const tenantId = req.user.tenantId || req.tenantId;
            const teacherUserId = req.user.userId || req.user.id;
            const { id } = req.params;
            const { status } = req.body;

            const doubt = await doubtService.updateTeacherDoubtStatus(tenantId, teacherUserId, id, status);
            return res.json({
                status: 'success',
                message: 'Status updated.',
                data: doubt
            });
        } catch (error) {
            console.error('[TeacherDoubtController.updateStatus] error:', error);
            return res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message || 'Failed to update status.'
            });
        }
    }
}

module.exports = new TeacherDoubtController();
