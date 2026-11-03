const examModel = require('../models/examModel');
const studentAccessService = require('../services/studentAccessService');

const resolveTenantId = (req) => {
    if (req.user && req.user.tenantId && req.user.tenantId !== 1) return req.user.tenantId;
    if (req.query && req.query.tenantId) return parseInt(req.query.tenantId, 10);
    return (req.user && req.user.tenantId) || 2;
};

const resolveUserId = (req) => req.user && (req.user.userId || req.user.id);

const buildAccessContext = (req) => {
    if (!req.user) return null;
    if (req.user.role === 'branch-admin') {
        const branchId = req.user.branchId || (req.user.branch && req.user.branch.id);
        return {
            scope: 'BRANCH',
            authorizedBranchId: branchId ? Number(branchId) : null
        };
    }
    if (req.user.role === 'teacher') {
        return {
            scope: 'TEACHER',
            assignedBatchIds: Array.isArray(req.user.assignedBatches) ? req.user.assignedBatches : []
        };
    }
    return null;
};

const examController = {
    /**
     * List all examinations with filters & search
     */
    async listExams(req, res) {
        try {
            const tenantId = resolveTenantId(req);
            const accessContext = buildAccessContext(req);
            const exams = await examModel.getExams(tenantId, req.query, accessContext);
            res.status(200).json({
                status: 'success',
                data: exams,
                count: exams.length
            });
        } catch (error) {
            console.error('Error listing exams:', error);
            res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch examinations' });
        }
    },

    /**
     * Get single exam details
     */
    async getExam(req, res) {
        try {
            const tenantId = resolveTenantId(req);
            const accessContext = buildAccessContext(req);
            const exam = await examModel.getExamById(tenantId, req.params.id, accessContext);
            if (!exam) {
                return res.status(404).json({ status: 'error', message: 'Exam not found' });
            }
            res.status(200).json({ status: 'success', data: exam });
        } catch (error) {
            console.error('Error fetching exam:', error);
            res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch exam' });
        }
    },

    /**
     * Create a new Exam
     */
    async createExam(req, res) {
        try {
            const tenantId = resolveTenantId(req);
            const userId = resolveUserId(req);

            const payload = req.body;
            // If branch-admin, enforce branchId
            if (req.user && req.user.role === 'branch-admin' && req.user.branchId) {
                payload.branchId = req.user.branchId;
            }

            const newExam = await examModel.createExam(tenantId, payload, userId);
            res.status(201).json({
                status: 'success',
                message: 'Exam scheduled successfully',
                data: newExam
            });
        } catch (error) {
            console.error('Error creating exam:', error);
            res.status(400).json({ status: 'error', message: error.message || 'Failed to create exam' });
        }
    },

    /**
     * Update an exam
     */
    async updateExam(req, res) {
        try {
            const tenantId = resolveTenantId(req);
            const userId = resolveUserId(req);
            const updated = await examModel.updateExam(tenantId, req.params.id, req.body, userId);
            res.status(200).json({
                status: 'success',
                message: 'Exam updated successfully',
                data: updated
            });
        } catch (error) {
            console.error('Error updating exam:', error);
            res.status(400).json({ status: 'error', message: error.message || 'Failed to update exam' });
        }
    },

    /**
     * Delete an exam
     */
    async deleteExam(req, res) {
        try {
            const tenantId = resolveTenantId(req);
            const userId = resolveUserId(req);
            const success = await examModel.deleteExam(tenantId, req.params.id, userId);
            if (!success) {
                return res.status(404).json({ status: 'error', message: 'Exam not found or already deleted' });
            }
            res.status(200).json({ status: 'success', message: 'Exam deleted successfully' });
        } catch (error) {
            console.error('Error deleting exam:', error);
            res.status(500).json({ status: 'error', message: error.message || 'Failed to delete exam' });
        }
    },

    /**
     * Get candidate roster for grading an exam
     */
    async getExamRoster(req, res) {
        try {
            const tenantId = resolveTenantId(req);
            const accessContext = buildAccessContext(req);
            const rosterData = await examModel.getExamRoster(tenantId, req.params.id, accessContext);
            res.status(200).json({
                status: 'success',
                data: rosterData
            });
        } catch (error) {
            console.error('Error fetching exam roster:', error);
            res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch exam roster' });
        }
    },

    /**
     * Save student marks (draft or publish)
     */
    async saveMarks(req, res) {
        try {
            const tenantId = resolveTenantId(req);
            const userId = resolveUserId(req);
            const { marks, studentMarks, publish = false, changeReason } = req.body;

            const payload = marks || studentMarks;
            if (!payload) {
                return res.status(400).json({ status: 'error', message: 'Marks payload is required' });
            }

            const result = await examModel.saveExamMarks(
                tenantId,
                req.params.id,
                payload,
                { publish: Boolean(publish), changeReason },
                userId
            );

            res.status(200).json({
                status: 'success',
                message: publish ? 'Exam marks published successfully' : 'Exam marks saved successfully',
                data: result
            });
        } catch (error) {
            console.error('Error saving exam marks:', error);
            res.status(400).json({ status: 'error', message: error.message || 'Failed to save marks' });
        }
    },

    /**
     * Direct publish results
     */
    async publishResults(req, res) {
        try {
            const tenantId = resolveTenantId(req);
            const userId = resolveUserId(req);
            const exam = await examModel.publishResults(tenantId, req.params.id, userId);
            res.status(200).json({
                status: 'success',
                message: 'Exam results published successfully',
                data: exam
            });
        } catch (error) {
            console.error('Error publishing results:', error);
            res.status(500).json({ status: 'error', message: error.message || 'Failed to publish results' });
        }
    },

    /**
     * Student report card
     */
    async getStudentReportCard(req, res) {
        try {
            const tenantId = resolveTenantId(req);
            const report = await examModel.getStudentReportCard(tenantId, req.params.studentId);
            res.status(200).json({ status: 'success', data: report });
        } catch (error) {
            console.error('Error generating report card:', error);
            res.status(500).json({ status: 'error', message: error.message || 'Failed to get report card' });
        }
    }
};

module.exports = examController;

