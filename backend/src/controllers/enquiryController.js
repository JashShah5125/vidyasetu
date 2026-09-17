const enquiryModel = require('../models/enquiryModel');
const studentAccessService = require('../services/studentAccessService');

const resolveTenantId = (req) => {
    if (req.query && req.query.tenantId) return parseInt(req.query.tenantId);
    if (req.user && req.user.tenantId && req.user.tenantId !== 1) return req.user.tenantId;
    return 2;
};

const getUserId = (req) => req.user?.userId || req.user?.id || 1;

/**
 * Static options (status/source codes + labels) so the frontend never hardcodes maps.
 */
const getEnquiryOptions = async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.json({
            status: 'success',
            data: {
                statuses: [
                    { code: 0, label: 'New Enquiry' },
                    { code: 1, label: 'Assigned' },
                    { code: 2, label: 'Contacted' },
                    { code: 3, label: 'Follow-up' },
                    { code: 4, label: 'Interested' },
                    { code: 5, label: 'Demo Scheduled' },
                    { code: 6, label: 'Fee Discussion' },
                    { code: 7, label: 'Converted' },
                    { code: -1, label: 'Not Interested' },
                    { code: -2, label: 'Cancelled' }
                ],
                sources: [
                    { code: 0, label: 'Walk-in' },
                    { code: 1, label: 'Phone Call' },
                    { code: 2, label: 'Website' },
                    { code: 3, label: 'Social Media' },
                    { code: 4, label: 'WhatsApp' },
                    { code: 5, label: 'Referral' },
                    { code: 6, label: 'Campaign/Event' },
                    { code: 7, label: 'Google Ads' },
                    { code: 8, label: 'Other' }
                ]
            }
        });
    } catch (error) {
        console.error('Error fetching enquiry options:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch enquiry options' });
    }
};

const getEnquiries = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status, source, branchId, courseId, programId, counsellorId } = req.query;
        const offset = (page - 1) * limit;
        const tenantId = resolveTenantId(req);

        const accessContext = await studentAccessService.resolveAccessContext(tenantId, req.user);

        if (req.query.branchId && req.query.branchId !== 'All' && accessContext.scope === 'BRANCH') {
            if (Number(req.query.branchId) !== Number(accessContext.authorizedBranchId)) {
                return res.status(403).json({
                    status: 'error',
                    message: 'Forbidden: You cannot query enquiries outside your authorized branch.'
                });
            }
        }

        const result = await enquiryModel.getEnquiries(tenantId, {
            search,
            status,
            source,
            branchId,
            courseId,
            programId,
            counsellorId,
            limit: Number(limit),
            offset
        }, accessContext);

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
        console.error('Error fetching enquiries:', error);
        res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message || 'Failed to fetch enquiries'
        });
    }
};

const getEnquiryById = async (req, res) => {
    try {
        const { id } = req.params;
        if (isNaN(Number(id))) {
            return res.status(400).json({ status: 'error', message: 'Invalid enquiry ID' });
        }
        const tenantId = resolveTenantId(req);

        const enquiry = await enquiryModel.getEnquiryById(tenantId, id);
        if (!enquiry) {
            return res.status(404).json({ status: 'error', message: 'Enquiry not found' });
        }
        res.json({ status: 'success', data: enquiry });
    } catch (error) {
        console.error('Error fetching enquiry details:', error);
        res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message || 'Failed to fetch enquiry details'
        });
    }
};

const createEnquiry = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const userId = getUserId(req);

        const newEnquiry = await enquiryModel.createEnquiry(tenantId, req.body, userId);
        res.status(201).json({
            status: 'success',
            message: 'Enquiry logged successfully',
            data: newEnquiry
        });
    } catch (error) {
        console.error('Error creating enquiry:', error);
        res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message || 'Failed to create enquiry'
        });
    }
};

const updateEnquiry = async (req, res) => {
    try {
        const { id } = req.params;
        if (isNaN(Number(id))) {
            return res.status(400).json({ status: 'error', message: 'Invalid enquiry ID' });
        }
        const tenantId = resolveTenantId(req);
        const userId = getUserId(req);

        const updatedEnquiry = await enquiryModel.updateEnquiry(tenantId, id, req.body, userId);
        if (!updatedEnquiry) {
            return res.status(404).json({ status: 'error', message: 'Enquiry not found' });
        }
        res.json({
            status: 'success',
            message: 'Enquiry updated successfully',
            data: updatedEnquiry
        });
    } catch (error) {
        console.error('Error updating enquiry:', error);
        res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message || 'Failed to update enquiry'
        });
    }
};

const getFollowups = async (req, res) => {
    try {
        const { id } = req.params;
        if (isNaN(Number(id))) {
            return res.status(400).json({ status: 'error', message: 'Invalid enquiry ID' });
        }
        const tenantId = resolveTenantId(req);

        const followups = await enquiryModel.getFollowups(tenantId, id);
        res.json({ status: 'success', data: followups });
    } catch (error) {
        console.error('Error fetching enquiry followups:', error);
        res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message || 'Failed to fetch enquiry followups'
        });
    }
};

const addFollowup = async (req, res) => {
    try {
        const { id } = req.params;
        if (isNaN(Number(id))) {
            return res.status(400).json({ status: 'error', message: 'Invalid enquiry ID' });
        }
        const tenantId = resolveTenantId(req);
        const userId = getUserId(req);

        const followup = await enquiryModel.addFollowup(tenantId, { enquiry_id: id, ...req.body }, userId);
        res.status(201).json({
            status: 'success',
            message: 'Follow-up logged successfully',
            data: followup
        });
    } catch (error) {
        console.error('Error logging follow-up:', error);
        res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message || 'Failed to log follow-up'
        });
    }
};

const convertEnquiryToStudent = async (req, res) => {
    try {
        const { id } = req.params;
        if (isNaN(Number(id))) {
            return res.status(400).json({ status: 'error', message: 'Invalid enquiry ID' });
        }
        const tenantId = resolveTenantId(req);
        const userId = getUserId(req);
        const accessContext = await studentAccessService.resolveAccessContext(tenantId, req.user);

        const result = await enquiryModel.convertToStudent(tenantId, id, req.body, userId, accessContext);
        res.status(201).json({
            status: 'success',
            message: 'Enquiry converted to student successfully',
            data: result
        });
    } catch (error) {
        console.error('Error converting enquiry to student:', error);
        res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message || 'Failed to convert enquiry to student'
        });
    }
};

module.exports = {
    getEnquiryOptions,
    getEnquiries,
    getEnquiryById,
    createEnquiry,
    updateEnquiry,
    getFollowups,
    addFollowup,
    convertEnquiryToStudent
};