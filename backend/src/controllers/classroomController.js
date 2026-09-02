const classroomModel = require('../models/classroomModel');

const resolveTenantId = (req) => req.user && req.user.tenantId;

const getClassrooms = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', type = 'all', status = 'all', branch = 'all' } = req.query;
        const offset = (page - 1) * limit;

        const result = await classroomModel.getClassrooms(resolveTenantId(req), {
            search,
            type,
            status,
            branch,
            limit: Number(limit),
            offset
        });

        res.status(200).json({
            status: 'success',
            data: result.data,
            pagination: {
                total: result.total,
                page: Number(page),
                limit: Number(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching classrooms:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const getClassroom = async (req, res) => {
    try {
        const { id } = req.params;
        const classroom = await classroomModel.getClassroom(resolveTenantId(req), id);

        if (!classroom) {
            return res.status(404).json({ status: 'error', message: 'Classroom not found' });
        }

        res.status(200).json({ status: 'success', data: classroom });
    } catch (error) {
        console.error('Error fetching classroom details:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const createClassroom = async (req, res) => {
    try {
        const data = req.body;

        if (!data.name || !data.branchId) {
            return res.status(400).json({ status: 'error', message: 'Missing required fields (name, branchId)' });
        }

        const result = await classroomModel.createClassroom(resolveTenantId(req), data, req.user.userId);

        res.status(201).json({ status: 'success', message: 'Classroom created successfully', data: result });
    } catch (error) {
        console.error('Error creating classroom:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ status: 'error', message: 'A classroom with this name already exists in this branch' });
        }
        if (error.code === 'ER_BRANCH_NOT_FOUND') {
            return res.status(400).json({ status: 'error', message: error.message });
        }
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const updateClassroom = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        if (!data.name || !data.branchId) {
            return res.status(400).json({ status: 'error', message: 'Missing required fields (name, branchId)' });
        }

        const result = await classroomModel.updateClassroom(resolveTenantId(req), id, data, req.user.userId);

        if (!result) {
            return res.status(404).json({ status: 'error', message: 'Classroom not found' });
        }

        res.status(200).json({ status: 'success', message: 'Classroom updated successfully', data: result });
    } catch (error) {
        console.error('Error updating classroom:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ status: 'error', message: 'A classroom with this name already exists in this branch' });
        }
        if (error.code === 'ER_BRANCH_NOT_FOUND') {
            return res.status(400).json({ status: 'error', message: error.message });
        }
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const deleteClassroom = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await classroomModel.deleteClassroom(resolveTenantId(req), id, req.user.userId);

        if (!success) {
            return res.status(404).json({ status: 'error', message: 'Classroom not found' });
        }

        res.status(200).json({ status: 'success', message: 'Classroom deleted successfully' });
    } catch (error) {
        console.error('Error deleting classroom:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

module.exports = {
    getClassrooms,
    getClassroom,
    createClassroom,
    updateClassroom,
    deleteClassroom
};