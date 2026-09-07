const studentModel = require('../models/studentModel');

const resolveTenantId = (req) => {
    if (req.query && req.query.tenantId) return parseInt(req.query.tenantId);
    if (req.user && req.user.tenantId && req.user.tenantId !== 1) return req.user.tenantId;
    return 2; // Default customer tenant for SaaS admin view / demo
};

const getStudents = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', branchId, batchId, bundleId, status, feeStatus } = req.query;
        const offset = (page - 1) * limit;

        const tenantId = resolveTenantId(req);
        const result = await studentModel.getStudents(tenantId, {
            search,
            branchId,
            batchId,
            bundleId,
            status,
            feeStatus,
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
        console.error('Error fetching students roster:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch students roster' });
    }
};

const getStudentById = async (req, res) => {
    try {
        const { id } = req.params;
        if (isNaN(Number(id))) {
            return res.status(400).json({ status: 'error', message: 'Invalid student ID' });
        }
        const tenantId = resolveTenantId(req);

        const student = await studentModel.getStudentById(tenantId, id);
        if (!student) {
            return res.status(404).json({ status: 'error', message: 'Student not found' });
        }

        res.json({ status: 'success', data: student });
    } catch (error) {
        console.error('Error fetching student details:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch student details' });
    }
};

const createStudent = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const userId = req.user?.userId || 1;
        const { full_name, primary_branch_id } = req.body;

        if (!full_name || !primary_branch_id) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: full_name and primary_branch_id are mandatory'
            });
        }

        const newStudent = await studentModel.createStudent(tenantId, req.body, userId);
        res.status(201).json({
            status: 'success',
            message: 'Student registered successfully',
            data: newStudent
        });
    } catch (error) {
        console.error('Error creating student:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create student' });
    }
};

const updateStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = resolveTenantId(req);
        const userId = req.user?.userId || 1;

        const updatedStudent = await studentModel.updateStudent(tenantId, id, req.body, userId);
        if (!updatedStudent) {
            return res.status(404).json({ status: 'error', message: 'Student not found' });
        }

        res.json({
            status: 'success',
            message: 'Student updated successfully',
            data: updatedStudent
        });
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({ status: 'error', message: 'Failed to update student' });
    }
};

const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = resolveTenantId(req);
        const userId = req.user?.userId || 1;

        const success = await studentModel.deleteStudent(tenantId, id, userId);
        if (!success) {
            return res.status(404).json({ status: 'error', message: 'Student not found' });
        }

        res.json({ status: 'success', message: 'Student removed from roster successfully' });
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({ status: 'error', message: 'Failed to delete student' });
    }
};

const getAcademicOptions = async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        const tenantId = resolveTenantId(req);
        const options = await studentModel.getAcademicOptions(tenantId);
        res.json({ status: 'success', data: options });
    } catch (error) {
        console.error('Error fetching academic options:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch academic options', detail: error.sqlMessage || error.stack });
    }
};

module.exports = {
    getStudents,
    getStudentById,
    createStudent,
    updateStudent,
    deleteStudent,
    getAcademicOptions
};
