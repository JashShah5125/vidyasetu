const teacherHomeworkService = require('../services/teacherHomeworkService');

class TeacherHomeworkController {
    async getScoping(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const teacherUserId = req.user.userId || req.user.id;
            const data = await teacherHomeworkService.getScoping(tenantId, teacherUserId);
            return res.json({ success: true, data });
        } catch (err) {
            console.error('[TeacherHomeworkController.getScoping]', err);
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || 'Failed to load teacher assessment scoping.'
            });
        }
    }

    async getHomeworks(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const teacherUserId = req.user.userId || req.user.id;
            const result = await teacherHomeworkService.getHomeworks(tenantId, teacherUserId, req.query);
            return res.json({
                success: true,
                data: result.data,
                pagination: result.pagination
            });
        } catch (err) {
            console.error('[TeacherHomeworkController.getHomeworks]', err);
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || 'Failed to load assessments.'
            });
        }
    }

    async getHomeworkById(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const teacherUserId = req.user.userId || req.user.id;
            const data = await teacherHomeworkService.getHomeworkById(tenantId, teacherUserId, req.params.id);
            return res.json({ success: true, data });
        } catch (err) {
            console.error('[TeacherHomeworkController.getHomeworkById]', err);
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || 'Failed to load assessment details.'
            });
        }
    }

    async createHomework(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const teacherUserId = req.user.userId || req.user.id;
            const uploadedFiles = req.files ? req.files.map(f => `/uploads/homeworks/${f.filename}`) : [];
            const data = await teacherHomeworkService.createHomework(tenantId, teacherUserId, req.body, uploadedFiles);
            return res.status(201).json({
                success: true,
                message: 'Assessment created successfully.',
                data
            });
        } catch (err) {
            console.error('[TeacherHomeworkController.createHomework]', err);
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || 'Failed to create assessment.'
            });
        }
    }

    async updateHomework(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const teacherUserId = req.user.userId || req.user.id;
            const uploadedFiles = req.files ? req.files.map(f => `/uploads/homeworks/${f.filename}`) : [];
            const data = await teacherHomeworkService.updateHomework(tenantId, teacherUserId, req.params.id, req.body, uploadedFiles);
            return res.json({
                success: true,
                message: 'Assessment updated successfully.',
                data
            });
        } catch (err) {
            console.error('[TeacherHomeworkController.updateHomework]', err);
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || 'Failed to update assessment.'
            });
        }
    }

    async deleteHomework(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const teacherUserId = req.user.userId || req.user.id;
            const result = await teacherHomeworkService.deleteHomework(tenantId, teacherUserId, req.params.id);
            return res.json(result);
        } catch (err) {
            console.error('[TeacherHomeworkController.deleteHomework]', err);
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || 'Failed to delete assessment.'
            });
        }
    }

    async publishHomework(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const teacherUserId = req.user.userId || req.user.id;
            const data = await teacherHomeworkService.publishHomework(tenantId, teacherUserId, req.params.id);
            return res.json({
                success: true,
                message: 'Assessment published to students successfully.',
                data
            });
        } catch (err) {
            console.error('[TeacherHomeworkController.publishHomework]', err);
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || 'Failed to publish assessment.'
            });
        }
    }

    async closeHomework(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const teacherUserId = req.user.userId || req.user.id;
            const data = await teacherHomeworkService.closeHomework(tenantId, teacherUserId, req.params.id);
            return res.json({
                success: true,
                message: 'Assessment closed successfully.',
                data
            });
        } catch (err) {
            console.error('[TeacherHomeworkController.closeHomework]', err);
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || 'Failed to close assessment.'
            });
        }
    }

    async getEvaluationRoster(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const teacherUserId = req.user.userId || req.user.id;
            const data = await teacherHomeworkService.getEvaluationRoster(tenantId, teacherUserId, req.params.id);
            return res.json({ success: true, data });
        } catch (err) {
            console.error('[TeacherHomeworkController.getEvaluationRoster]', err);
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || 'Failed to load evaluation roster.'
            });
        }
    }

    async getSubmissions(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const teacherUserId = req.user.userId || req.user.id;
            const data = await teacherHomeworkService.getSubmissions(tenantId, teacherUserId, req.params.id);
            return res.json({ success: true, data });
        } catch (err) {
            console.error('[TeacherHomeworkController.getSubmissions]', err);
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || 'Failed to load submissions.'
            });
        }
    }

    async bulkGrade(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const teacherUserId = req.user.userId || req.user.id;
            const data = await teacherHomeworkService.bulkGrade(tenantId, teacherUserId, req.params.id, req.body.grades);
            return res.json({
                success: true,
                message: 'Grades saved successfully.',
                data
            });
        } catch (err) {
            console.error('[TeacherHomeworkController.bulkGrade]', err);
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || 'Failed to save grades.'
            });
        }
    }

    async gradeSubmission(req, res) {
        try {
            const tenantId = req.user.tenantId;
            const teacherUserId = req.user.userId || req.user.id;
            const data = await teacherHomeworkService.gradeSubmission(
                tenantId,
                teacherUserId,
                req.params.id,
                req.params.submissionId,
                req.body
            );
            return res.json({
                success: true,
                message: 'Submission graded successfully.',
                data
            });
        } catch (err) {
            console.error('[TeacherHomeworkController.gradeSubmission]', err);
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || 'Failed to grade submission.'
            });
        }
    }
}

module.exports = new TeacherHomeworkController();
