const doubtService = require('../services/doubtService');

class StudentDoubtController {
    /**
     * GET /api/student/doubts/teachers
     * Returns eligible teachers with their assigned batches & subjects for the student.
     */
    async getEligibleTeachers(req, res) {
        try {
            const tenantId = req.user.tenantId || req.tenantId;
            const userId = req.user.userId || req.user.id;

            const data = await doubtService.getEligibleTeachersForStudent(tenantId, userId);
            return res.json({
                status: 'success',
                data
            });
        } catch (error) {
            console.error('[StudentDoubtController.getEligibleTeachers] error:', error);
            return res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message || 'Failed to fetch eligible teachers.'
            });
        }
    }

    /**
     * GET /api/student/doubts
     * List all doubts asked by the current student.
     */
    async getDoubts(req, res) {
        try {
            const tenantId = req.user.tenantId || req.tenantId;
            const userId = req.user.userId || req.user.id;

            const doubts = await doubtService.listStudentDoubts(tenantId, userId, req.query);
            return res.json({
                status: 'success',
                data: doubts
            });
        } catch (error) {
            console.error('[StudentDoubtController.getDoubts] error:', error);
            return res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message || 'Failed to list doubts.'
            });
        }
    }

    /**
     * POST /api/student/doubts
     * Create a new doubt thread (multipart supported).
     */
    async createDoubt(req, res) {
        try {
            const tenantId = req.user.tenantId || req.tenantId;
            const userId = req.user.userId || req.user.id;

            const doubt = await doubtService.createStudentDoubt(tenantId, userId, req.body, req.files);
            return res.status(201).json({
                status: 'success',
                message: 'Doubt submitted successfully.',
                data: doubt
            });
        } catch (error) {
            console.error('[StudentDoubtController.createDoubt] error:', error);
            return res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message || 'Failed to submit doubt.'
            });
        }
    }

    /**
     * GET /api/student/doubts/:id
     * Retrieve single doubt thread details with replies.
     */
    async getDoubtById(req, res) {
        try {
            const tenantId = req.user.tenantId || req.tenantId;
            const userId = req.user.userId || req.user.id;
            const { id } = req.params;

            const doubt = await doubtService.getStudentDoubtById(tenantId, userId, id);
            return res.json({
                status: 'success',
                data: doubt
            });
        } catch (error) {
            console.error('[StudentDoubtController.getDoubtById] error:', error);
            return res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message || 'Failed to fetch doubt thread.'
            });
        }
    }

    /**
     * POST /api/student/doubts/:id/replies
     * Add student reply (multipart supported).
     */
    async addReply(req, res) {
        try {
            const tenantId = req.user.tenantId || req.tenantId;
            const userId = req.user.userId || req.user.id;
            const { id } = req.params;

            const doubt = await doubtService.addStudentReply(tenantId, userId, id, req.body, req.files);
            return res.json({
                status: 'success',
                message: 'Reply sent.',
                data: doubt
            });
        } catch (error) {
            console.error('[StudentDoubtController.addReply] error:', error);
            return res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message || 'Failed to send reply.'
            });
        }
    }

    /**
     * PATCH /api/student/doubts/:id/status
     * Update doubt status.
     */
    async updateStatus(req, res) {
        try {
            const tenantId = req.user.tenantId || req.tenantId;
            const userId = req.user.userId || req.user.id;
            const { id } = req.params;
            const { status } = req.body;

            const doubt = await doubtService.updateStudentDoubtStatus(tenantId, userId, id, status);
            return res.json({
                status: 'success',
                message: 'Status updated.',
                data: doubt
            });
        } catch (error) {
            console.error('[StudentDoubtController.updateStatus] error:', error);
            return res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message || 'Failed to update status.'
            });
        }
    }
}

module.exports = new StudentDoubtController();
