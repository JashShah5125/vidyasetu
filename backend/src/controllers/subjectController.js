const subjectModel = require('../models/subjectModel');
const resolveTenantId = (req) => req.user && req.user.tenantId;

const getSubjects = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status, courseId, programId, levelId } = req.query;
        const offset = (page - 1) * limit;

        const result = await subjectModel.getSubjects(resolveTenantId(req), {
            search,
            status,
            courseId,
            programId,
            levelId,
            limit: Number(limit),
            offset
        });

        res.json({
            status: 'success',
            data: result.data,
            pagination: {
                total: result.total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(result.total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching subjects:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch subjects' });
    }
};

const getSubjectByCode = async (req, res) => {
    try {
        const { code } = req.params;
        const subject = await subjectModel.getSubjectByCode(resolveTenantId(req), code);
        
        if (!subject) {
            return res.status(404).json({ status: 'error', message: 'Subject not found' });
        }
        
        res.json({ status: 'success', data: subject });
    } catch (error) {
        console.error('Error fetching subject by code:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch subject' });
    }
};

const createSubject = async (req, res) => {
    try {
        const userId = req.user?.userId || 1; // Fallback to 1 if not set
        const result = await subjectModel.createSubject(resolveTenantId(req), req.body, userId);
        res.status(201).json({ status: 'success', data: result, message: 'Subject created successfully' });
    } catch (error) {
        console.error('Error creating subject:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ status: 'error', message: 'A subject with this code already exists' });
        }
        res.status(500).json({ status: 'error', message: 'Failed to create subject' });
    }
};

const updateSubject = async (req, res) => {
    try {
        const { code } = req.params;
        const userId = req.user?.userId || 1;
        
        const result = await subjectModel.updateSubject(resolveTenantId(req), code, req.body, userId);
        
        if (!result) {
            return res.status(404).json({ status: 'error', message: 'Subject not found' });
        }
        
        res.json({ status: 'success', message: 'Subject updated successfully' });
    } catch (error) {
        console.error('Error updating subject:', error);
        res.status(500).json({ status: 'error', message: 'Failed to update subject' });
    }
};

const deleteSubject = async (req, res) => {
    try {
        const { code } = req.params;
        const userId = req.user?.userId || 1;
        
        const success = await subjectModel.deleteSubject(resolveTenantId(req), code, userId);
        
        if (!success) {
            return res.status(404).json({ status: 'error', message: 'Subject not found' });
        }
        
        res.json({ status: 'success', message: 'Subject deleted successfully' });
    } catch (error) {
        console.error('Error deleting subject:', error);
        res.status(500).json({ status: 'error', message: 'Failed to delete subject' });
    }
};

module.exports = {
    getSubjects,
    getSubjectByCode,
    createSubject,
    updateSubject,
    deleteSubject
};
