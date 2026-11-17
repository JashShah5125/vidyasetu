const attendanceModel = require('../models/attendanceModel');

const resolveTenantId = (req) => req.user && req.user.tenantId;
const resolveUserId = (req) => req.user && (req.user.userId || req.user.id);

const handleError = (res, error, fallbackMessage) => {
    console.error(fallbackMessage, error);
    if (error && error.statusCode) {
        return res.status(error.statusCode).json({
            status: 'error',
            message: error.message,
            code: error.code,
            details: error.details
        });
    }
    return res.status(500).json({ status: 'error', message: error.message || fallbackMessage });
};

const getLectures = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const userId = resolveUserId(req);
        const date = req.query.date || new Date().toISOString().slice(0, 10);
        const data = await attendanceModel.getStudentLectures(tenantId, userId, date);
        res.status(200).json({ status: 'success', data });
    } catch (error) {
        handleError(res, error, 'Failed to fetch student lectures');
    }
};

const checkIn = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const userId = resolveUserId(req);
        const { lectureId } = req.params;
        const { code, location } = req.body || {};

        const result = await attendanceModel.studentCheckIn(tenantId, userId, lectureId, {
            code,
            location: location || null
        });

        res.status(200).json({
            status: 'success',
            message: 'Geo-verified attendance check-in recorded successfully',
            data: result
        });
    } catch (error) {
        handleError(res, error, 'Failed to complete student check-in');
    }
};

module.exports = {
    getLectures,
    checkIn
};

