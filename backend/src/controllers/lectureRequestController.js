const lectureRequestModel = require('../models/lectureRequestModel');
const conflictService = require('../services/conflictService');

const resolveTenantId = (req) => req.user && req.user.tenantId;

const listRequests = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { branchId, status, type, requesterId } = req.query;

        const requests = await lectureRequestModel.listRequests(tenantId, {
            branchId,
            status,
            requestType: type,
            requesterId
        });

        res.status(200).json({ status: 'success', data: requests });
    } catch (error) {
        console.error('Error listing lecture requests:', error);
        res.status(500).json({ status: 'error', message: 'Failed to list lecture requests' });
    }
};

const getStatusCounts = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { branchId, requesterId } = req.query;

        const counts = await lectureRequestModel.getStatusCounts(tenantId, { branchId, requesterId });

        res.status(200).json({ status: 'success', data: counts });
    } catch (error) {
        console.error('Error fetching request counts:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch request counts' });
    }
};

const getRequestById = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { id } = req.params;

        const request = await lectureRequestModel.getRequestById(tenantId, id);
        if (!request) {
            return res.status(404).json({ status: 'error', message: 'Request not found' });
        }

        // If request has a proposed date/time, check for conflicts
        let conflicts = [];
        if (request.requested_date && request.requested_start_time && request.requested_end_time) {
            conflicts = await conflictService.checkLectureConflicts(tenantId, {
                branchId: request.branch_id,
                batchId: request.batch_id,
                teacherUserId: request.requested_teacher_user_id,
                classroomId: request.requested_classroom_id,
                lectureDate: request.requested_date,
                startTime: request.requested_start_time,
                endTime: request.requested_end_time,
                lectureId: request.lecture_id
            });
        }

        res.status(200).json({ status: 'success', data: { ...request, conflicts } });
    } catch (error) {
        console.error('Error fetching lecture request:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch lecture request' });
    }
};

const createRequest = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const userId = req.user?.userId;
        const data = req.body;

        if (!data.branch_id && !data.branchId) {
            return res.status(400).json({ status: 'error', message: 'branch_id is required' });
        }
        if (!data.batch_id && !data.batchId) {
            return res.status(400).json({ status: 'error', message: 'batch_id is required' });
        }
        if (!data.subject_id && !data.subjectId) {
            return res.status(400).json({ status: 'error', message: 'subject_id is required' });
        }
        if (!data.request_type && !data.requestType) {
            return res.status(400).json({ status: 'error', message: 'request_type is required' });
        }

        const result = await lectureRequestModel.createRequest(tenantId, data, userId);
        res.status(201).json({ status: 'success', message: 'Request submitted successfully', data: result });
    } catch (error) {
        console.error('Error creating lecture request:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create lecture request' });
    }
};

const approveRequest = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const userId = req.user?.userId;
        const { id } = req.params;

        const result = await lectureRequestModel.updateStatus(tenantId, id, 'approved', userId);
        res.status(200).json({ status: 'success', message: 'Request approved successfully', data: result });
    } catch (error) {
        console.error('Error approving lecture request:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ status: 'error', message: error.message || 'Failed to approve lecture request' });
    }
};

const rejectRequest = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const userId = req.user?.userId;
        const { id } = req.params;
        const { decision_note } = req.body;

        const result = await lectureRequestModel.updateStatus(tenantId, id, 'rejected', userId, decision_note || null);
        res.status(200).json({ status: 'success', message: 'Request rejected', data: result });
    } catch (error) {
        console.error('Error rejecting lecture request:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ status: 'error', message: error.message || 'Failed to reject lecture request' });
    }
};

const applyRequest = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const userId = req.user?.userId;
        const { id } = req.params;

        const result = await lectureRequestModel.applyRequest(tenantId, id, userId);
        res.status(200).json({ status: 'success', message: 'Request applied to timetable successfully', data: result });
    } catch (error) {
        console.error('Error applying lecture request:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ status: 'error', message: error.message || 'Failed to apply lecture request' });
    }
};

module.exports = {
    listRequests,
    getStatusCounts,
    getRequestById,
    createRequest,
    approveRequest,
    rejectRequest,
    applyRequest
};
