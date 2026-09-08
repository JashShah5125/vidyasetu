const timetableModel = require('../models/timetableModel');
const conflictService = require('../services/conflictService');

const resolveTenantId = (req) => req.user && req.user.tenantId;

const getOptions = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { branchId, academicYearId } = req.query;
        const options = await timetableModel.getTimetableOptions(tenantId, branchId, academicYearId);
        res.status(200).json({ status: 'success', data: options });
    } catch (error) {
        console.error('Error fetching timetable options:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch timetable options' });
    }
};

const getDefaultTimetable = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { batchId } = req.params;
        const slots = await timetableModel.getDefaultTimetable(tenantId, batchId);
        res.status(200).json({ status: 'success', data: slots });
    } catch (error) {
        console.error('Error fetching default timetable:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch default timetable' });
    }
};

const saveDefaultTimetable = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { batchId } = req.params;
        const { slots, branchId, academicYearId } = req.body;

        if (!Array.isArray(slots)) {
            return res.status(400).json({ status: 'error', message: 'Invalid payload: slots array required' });
        }

        const result = await timetableModel.saveDefaultTimetable(
            tenantId,
            batchId,
            slots,
            branchId,
            academicYearId,
            req.user?.userId
        );

        res.status(200).json({ status: 'success', message: 'Default timetable saved successfully', data: result });
    } catch (error) {
        console.error('Error saving default timetable:', error);
        res.status(500).json({ status: 'error', message: 'Failed to save default timetable' });
    }
};

const cloneDefaultTimetable = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { sourceBatchId, targetBatchIds } = req.body;

        if (!sourceBatchId || !Array.isArray(targetBatchIds) || targetBatchIds.length === 0) {
            return res.status(400).json({ status: 'error', message: 'sourceBatchId and targetBatchIds array required' });
        }

        const result = await timetableModel.cloneDefaultTimetable(
            tenantId,
            sourceBatchId,
            targetBatchIds,
            req.user?.userId
        );

        res.status(200).json({ status: 'success', message: 'Default timetable copied successfully', data: result });
    } catch (error) {
        console.error('Error cloning default timetable:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to clone default timetable' });
    }
};

const getWeeklyLectures = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { batchId, teacherId, roomId, branchId, startDate, endDate } = req.query;

        const lectures = await timetableModel.getWeeklyLectures(tenantId, {
            batchId,
            teacherId,
            roomId,
            branchId,
            startDate,
            endDate
        });

        res.status(200).json({ status: 'success', data: lectures });
    } catch (error) {
        console.error('Error fetching weekly lectures:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch weekly lectures' });
    }
};

const applyDefaultTimetable = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { batchId, weekStartDate, overwriteExisting, skipHolidays } = req.body;

        if (!batchId || !weekStartDate) {
            return res.status(400).json({ status: 'error', message: 'batchId and weekStartDate required' });
        }

        const result = await timetableModel.applyDefaultTimetableToWeek(tenantId, {
            batchId,
            weekStartDate,
            overwriteExisting: !!overwriteExisting,
            skipHolidays: skipHolidays !== false,
            userId: req.user?.userId
        });

        res.status(200).json({ status: 'success', message: 'Default timetable applied to week successfully', data: result });
    } catch (error) {
        console.error('Error applying default timetable:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to apply default timetable' });
    }
};

const replicateWeek = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { batchId, sourceWeekStart, targetWeekStart, overwriteExisting } = req.body;

        if (!batchId || !sourceWeekStart || !targetWeekStart) {
            return res.status(400).json({ status: 'error', message: 'batchId, sourceWeekStart, and targetWeekStart required' });
        }

        const result = await timetableModel.replicateWeekLectures(tenantId, {
            batchId,
            sourceWeekStart,
            targetWeekStart,
            overwriteExisting: overwriteExisting !== false,
            userId: req.user?.userId
        });

        res.status(200).json({ status: 'success', message: 'Week schedule replicated successfully', data: result });
    } catch (error) {
        console.error('Error replicating week schedule:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to replicate week schedule' });
    }
};

const checkConflicts = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const params = req.body;

        const conflicts = await conflictService.checkLectureConflicts(tenantId, params);
        res.status(200).json({ status: 'success', data: conflicts });
    } catch (error) {
        console.error('Error checking conflicts:', error);
        res.status(500).json({ status: 'error', message: 'Failed to check conflicts' });
    }
};

const createLecture = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const data = req.body;

        const result = await timetableModel.createLecture(tenantId, data, req.user?.userId);
        res.status(201).json({ status: 'success', message: 'Lecture created successfully', data: result });
    } catch (error) {
        console.error('Error creating lecture:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create lecture' });
    }
};

const updateLecture = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { id } = req.params;
        const data = req.body;

        const result = await timetableModel.updateLecture(tenantId, id, data, req.user?.userId);
        res.status(200).json({ status: 'success', message: 'Lecture updated successfully', data: result });
    } catch (error) {
        console.error('Error updating lecture:', error);
        res.status(500).json({ status: 'error', message: 'Failed to update lecture' });
    }
};

const cancelLecture = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { id } = req.params;
        const { reason } = req.body;

        const result = await timetableModel.cancelLecture(tenantId, id, reason, req.user?.userId);
        res.status(200).json({ status: 'success', message: 'Lecture cancelled successfully', data: result });
    } catch (error) {
        console.error('Error cancelling lecture:', error);
        res.status(500).json({ status: 'error', message: 'Failed to cancel lecture' });
    }
};

const deleteLecture = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { id } = req.params;

        const result = await timetableModel.deleteLecture(tenantId, id, req.user?.userId);
        res.status(200).json({ status: 'success', message: 'Lecture deleted successfully', data: result });
    } catch (error) {
        console.error('Error deleting lecture:', error);
        res.status(500).json({ status: 'error', message: 'Failed to delete lecture' });
    }
};

module.exports = {
    getOptions,
    getDefaultTimetable,
    saveDefaultTimetable,
    cloneDefaultTimetable,
    getWeeklyLectures,
    applyDefaultTimetable,
    replicateWeek,
    checkConflicts,
    createLecture,
    updateLecture,
    cancelLecture,
    deleteLecture
};
