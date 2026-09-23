const studentModel = require('../models/studentModel');

const resolveTenantId = (req) => {
    if (req.query && req.query.tenantId) return parseInt(req.query.tenantId);
    if (req.user && req.user.tenantId && req.user.tenantId !== 1) return req.user.tenantId;
    return 2; // Default customer tenant for SaaS admin view / demo
};

const getStudents = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', branchId, batchId, bundleId, courseId, programId, levelId, academicYearId, status, feeStatus } = req.query;
        const offset = (page - 1) * limit;

        const tenantId = resolveTenantId(req);
        const result = await studentModel.getStudents(tenantId, {
            search,
            branchId,
            batchId,
            bundleId,
            courseId,
            programId,
            levelId,
            academicYearId,
            status,
            feeStatus,
            limit: Number(limit),
            offset
        });

        res.json({
            status: 'success',
            summary: result.summary || {
                totalExpected: 0,
                totalCollected: 0,
                totalRemaining: 0,
                totalOverdue: 0,
                defaulterCount: 0
            },
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
        if (error.statusCode === 409 || (error.message && error.message.includes('already exists'))) {
            return res.status(409).json({ status: 'error', message: error.message });
        }
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

const uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ status: 'error', message: 'No file uploaded' });
        }
        const fileUrl = `/uploads/documents/${req.file.filename}`;
        res.status(201).json({
            status: 'success',
            message: 'File uploaded successfully',
            data: {
                fileName: req.file.originalname,
                storageKey: fileUrl,
                url: fileUrl,
                mimeType: req.file.mimetype,
                fileSize: (req.file.size / 1024 / 1024).toFixed(2) + ' MB'
            }
        });
    } catch (error) {
        console.error('Error uploading student document:', error);
        res.status(500).json({ status: 'error', message: 'Failed to upload document' });
    }
};

const getStudentDocuments = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = resolveTenantId(req);
        const documents = await studentModel.getStudentDocuments(tenantId, id);
        res.json({ status: 'success', data: documents });
    } catch (error) {
        console.error('Error fetching student documents:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch student documents' });
    }
};

const updateStudentDocumentStatus = async (req, res) => {
    try {
        const { id, docId } = req.params;
        const { status, rejectionReason } = req.body;
        const tenantId = resolveTenantId(req);
        const userId = req.user?.userId || 1;

        if (status === undefined || ![0, 1, 2].includes(Number(status))) {
            return res.status(400).json({ status: 'error', message: 'Invalid document status. Allowed values: 0 (pending), 1 (verified), 2 (rejected)' });
        }

        const documents = await studentModel.updateStudentDocumentStatus(
            tenantId,
            id,
            docId,
            status,
            rejectionReason || null,
            userId
        );

        res.json({
            status: 'success',
            message: `Document ${Number(status) === 1 ? 'verified' : Number(status) === 2 ? 'rejected' : 'updated'} successfully`,
            data: documents
        });
    } catch (error) {
        console.error('Error updating student document status:', error);
        res.status(500).json({ status: 'error', message: 'Failed to update document status' });
    }
};

module.exports = {
    getStudents,
    getStudentById,
    createStudent,
    updateStudent,
    deleteStudent,
    getAcademicOptions,
    uploadDocument,
    getStudentDocuments,
    updateStudentDocumentStatus
};
