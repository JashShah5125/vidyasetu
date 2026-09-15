const teacherStudentService = require('../services/teacherStudentService');

const resolveTenantAndTeacher = (req) => {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const teacherUserId = req.user?.userId || req.user?.id;
    return { tenantId, teacherUserId };
};

/**
 * Teacher My Students Controller
 * Handles read-only teacher-scoped student roster endpoints.
 */
class TeacherStudentController {
    /**
     * GET /api/teacher/students/options
     */
    async getOptions(req, res) {
        try {
            const { tenantId, teacherUserId } = resolveTenantAndTeacher(req);

            const options = await teacherStudentService.getTeacherOptions(tenantId, teacherUserId);
            return res.status(200).json({
                status: 'success',
                data: options
            });
        } catch (error) {
            console.error('[TeacherStudentController.getOptions] error:', error);
            return res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message || 'Failed to fetch teacher student options.'
            });
        }
    }

    /**
     * GET /api/teacher/students
     */
    async getStudents(req, res) {
        try {
            const { tenantId, teacherUserId } = resolveTenantAndTeacher(req);
            const { page = 1, limit = 10, search = '', batchId, status, feeStatus } = req.query;

            const result = await teacherStudentService.getStudents(tenantId, teacherUserId, {
                search,
                batchId,
                status,
                feeStatus,
                limit,
                page
            });

            return res.status(200).json({
                status: 'success',
                data: result.data,
                pagination: {
                    total: result.total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(result.total / Number(limit))
                }
            });
        } catch (error) {
            console.error('[TeacherStudentController.getStudents] error:', error);
            return res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message || 'Failed to fetch your students.'
            });
        }
    }

    /**
     * GET /api/teacher/students/:id
     */
    async getStudentById(req, res) {
        try {
            const { tenantId, teacherUserId } = resolveTenantAndTeacher(req);
            const { id } = req.params;

            if (isNaN(Number(id))) {
                return res.status(400).json({ status: 'error', message: 'Invalid student ID' });
            }

            const student = await teacherStudentService.getStudentById(tenantId, teacherUserId, id);
            return res.status(200).json({
                status: 'success',
                data: student
            });
        } catch (error) {
            console.error('[TeacherStudentController.getStudentById] error:', error);
            return res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message || 'Failed to fetch student profile.'
            });
        }
    }

    /**
     * GET /api/teacher/students/:id/assignments
     */
    async getStudentAssignments(req, res) {
        try {
            const { tenantId, teacherUserId } = resolveTenantAndTeacher(req);
            const { id } = req.params;

            if (isNaN(Number(id))) {
                return res.status(400).json({ status: 'error', message: 'Invalid student ID' });
            }

            const assignments = await teacherStudentService.getStudentAssignments(tenantId, teacherUserId, id);
            return res.status(200).json({
                status: 'success',
                data: assignments
            });
        } catch (error) {
            console.error('[TeacherStudentController.getStudentAssignments] error:', error);
            return res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message || 'Failed to fetch student assignments and submissions.'
            });
        }
    }
}

module.exports = new TeacherStudentController();