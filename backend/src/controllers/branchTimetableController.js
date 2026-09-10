const timetableModel = require('../models/timetableModel');
const conflictService = require('../services/conflictService');
const timetableAccessService = require('../services/timetableAccessService');

const resolveTenantId = (req) => {
    if (req.query && req.query.tenantId) return parseInt(req.query.tenantId);
    if (req.user && req.user.tenantId && req.user.tenantId !== 1) return req.user.tenantId;
    return 2;
};

const resolveUserId = (req) => req.user && (req.user.userId || req.user.id);

const handleError = (res, error, fallbackMessage) => {
    console.error(fallbackMessage, error);
    if (error && error.statusCode) {
        return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
};

/**
 * 1. GET /api/branch/timetable/options
 * Returns metadata and dropdown options strictly scoped to the authenticated branch
 */
const getOptions = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await timetableAccessService.resolveAccessContext(tenantId, req.user);

        if (accessContext.scope === 'BRANCH' && !accessContext.authorizedBranchId) {
            return res.status(403).json({
                status: 'error',
                message: 'Forbidden: No authorized branch associated with your account.'
            });
        }

        const branchId = accessContext.authorizedBranchId || (req.query.branchId ? parseInt(req.query.branchId) : 1);
        const { academicYearId } = req.query;

        const options = await timetableModel.getBranchTimetableOptions(tenantId, branchId, academicYearId);
        res.status(200).json({ status: 'success', data: options });
    } catch (error) {
        handleError(res, error, 'Error fetching branch timetable options:');
    }
};

/**
 * 2. GET /api/branch/timetable/default/:batchId
 * Fetch default timetable slots for a batch belonging to the authorized branch
 */
const getDefaultTimetable = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await timetableAccessService.resolveAccessContext(tenantId, req.user);
        const { batchId } = req.params;

        if (accessContext.authorizedBranchId) {
            await timetableAccessService.validateBatchInBranch(tenantId, accessContext.authorizedBranchId, batchId);
        }

        const slots = await timetableModel.getDefaultTimetable(tenantId, batchId, accessContext.authorizedBranchId);
        res.status(200).json({ status: 'success', data: slots });
    } catch (error) {
        handleError(res, error, 'Error fetching branch default timetable:');
    }
};

/**
 * 3. POST /api/branch/timetable/default/:batchId
 * Save or replace default timetable slots for a batch in the authorized branch
 */
const saveDefaultTimetable = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const userId = resolveUserId(req);
        const accessContext = await timetableAccessService.resolveAccessContext(tenantId, req.user);
        const { batchId } = req.params;
        const { slots, academicYearId } = req.body;

        if (!Array.isArray(slots)) {
            return res.status(400).json({ status: 'error', message: 'Invalid payload: slots array required' });
        }

        const branchId = accessContext.authorizedBranchId || req.body.branchId || 1;

        // Validate batch belongs to branch
        if (accessContext.authorizedBranchId) {
            await timetableAccessService.validateBatchInBranch(tenantId, branchId, batchId);
        }

        // Validate each slot's teacher, classroom, and subject
        for (const slot of slots) {
            const slotTeacherId = slot.teacher_user_id || slot.teacherId || slot.teacherUserId;
            const slotRoomId = slot.classroom_id || slot.roomId || slot.classroomId;
            const slotSubjectId = slot.subject_id || slot.subjectId;

            if (slotTeacherId && accessContext.authorizedBranchId) {
                await timetableAccessService.validateTeacherInBranch(tenantId, branchId, slotTeacherId);
            }
            if (slotRoomId && accessContext.authorizedBranchId) {
                await timetableAccessService.validateClassroomInBranch(tenantId, branchId, slotRoomId);
            }
            if (slotSubjectId) {
                await timetableAccessService.validateSubjectInBranch(tenantId, branchId, slotSubjectId);
            }
        }

        const result = await timetableModel.saveDefaultTimetable(
            tenantId,
            batchId,
            slots,
            branchId,
            academicYearId,
            userId
        );

        res.status(200).json({ status: 'success', message: 'Default timetable saved successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error saving branch default timetable:');
    }
};

/**
 * 4. POST /api/branch/timetable/default/clone
 * Clone default timetable from source batch to target batches within the authorized branch
 */
const cloneDefaultTimetable = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const userId = resolveUserId(req);
        const accessContext = await timetableAccessService.resolveAccessContext(tenantId, req.user);
        const { sourceBatchId, targetBatchIds } = req.body;

        if (!sourceBatchId || !Array.isArray(targetBatchIds) || targetBatchIds.length === 0) {
            return res.status(400).json({ status: 'error', message: 'sourceBatchId and targetBatchIds array required' });
        }

        const branchId = accessContext.authorizedBranchId;
        if (branchId) {
            // Verify source batch belongs to authorized branch
            await timetableAccessService.validateBatchInBranch(tenantId, branchId, sourceBatchId);
            // Verify all target batches belong to authorized branch
            await timetableAccessService.validateBatchesInBranch(tenantId, branchId, targetBatchIds);
        }

        const result = await timetableModel.cloneDefaultTimetable(
            tenantId,
            sourceBatchId,
            targetBatchIds,
            userId,
            branchId
        );

        res.status(200).json({ status: 'success', message: 'Default timetable copied successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error cloning branch default timetable:');
    }
};

/**
 * 5. GET /api/branch/timetable/weekly
 * Get weekly concrete lectures strictly filtered by the authorized branch
 */
const getWeeklyLectures = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await timetableAccessService.resolveAccessContext(tenantId, req.user);
        const { batchId, teacherId, roomId, classroomId, startDate, endDate, status } = req.query;

        const branchId = accessContext.authorizedBranchId || (req.query.branchId ? parseInt(req.query.branchId) : null);

        // If specific batch requested, validate it belongs to branch
        if (batchId && batchId !== 'All' && accessContext.authorizedBranchId) {
            await timetableAccessService.validateBatchInBranch(tenantId, accessContext.authorizedBranchId, batchId);
        }

        const lectures = await timetableModel.getWeeklyLectures(tenantId, {
            batchId,
            teacherId,
            roomId: roomId || classroomId,
            classroomId: classroomId || roomId,
            branchId,
            startDate,
            endDate,
            status
        });

        res.status(200).json({ status: 'success', data: lectures });
    } catch (error) {
        handleError(res, error, 'Error fetching branch weekly lectures:');
    }
};

/**
 * 6. POST /api/branch/timetable/weekly/apply-default
 * Apply default timetable slots to a specific week for a batch in the authorized branch
 */
const applyDefaultTimetable = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const userId = resolveUserId(req);
        const accessContext = await timetableAccessService.resolveAccessContext(tenantId, req.user);
        const { batchId, weekStartDate, overwriteExisting, skipHolidays } = req.body;

        if (!batchId || !weekStartDate) {
            return res.status(400).json({ status: 'error', message: 'batchId and weekStartDate required' });
        }

        const branchId = accessContext.authorizedBranchId;
        if (branchId) {
            await timetableAccessService.validateBatchInBranch(tenantId, branchId, batchId);
        }

        const result = await timetableModel.applyDefaultTimetableToWeek(tenantId, {
            batchId,
            branchId,
            weekStartDate,
            overwriteExisting: !!overwriteExisting,
            skipHolidays: skipHolidays !== false,
            userId
        });

        res.status(200).json({ status: 'success', message: 'Default timetable applied to week successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error applying branch default timetable:');
    }
};

/**
 * 7. POST /api/branch/timetable/weekly/replicate
 * Replicate a week's schedule to another week for a batch in the authorized branch
 */
const replicateWeek = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const userId = resolveUserId(req);
        const accessContext = await timetableAccessService.resolveAccessContext(tenantId, req.user);
        const { batchId, sourceWeekStart, targetWeekStart, overwriteExisting } = req.body;

        if (!batchId || !sourceWeekStart || !targetWeekStart) {
            return res.status(400).json({ status: 'error', message: 'batchId, sourceWeekStart, and targetWeekStart required' });
        }

        const branchId = accessContext.authorizedBranchId;
        if (branchId) {
            await timetableAccessService.validateBatchInBranch(tenantId, branchId, batchId);
        }

        const result = await timetableModel.replicateWeekLectures(tenantId, {
            batchId,
            branchId,
            sourceWeekStart,
            targetWeekStart,
            overwriteExisting: overwriteExisting !== false,
            userId
        });

        res.status(200).json({ status: 'success', message: 'Week schedule replicated successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error replicating branch week schedule:');
    }
};

/**
 * 8. POST /api/branch/timetable/validate-conflicts
 * Validate conflicts for a proposed lecture using the shared ConflictService
 */
const checkConflicts = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await timetableAccessService.resolveAccessContext(tenantId, req.user);
        const params = req.body;

        const effectiveBranchId = accessContext.authorizedBranchId || params.branchId;

        const conflicts = await conflictService.checkLectureConflicts(tenantId, {
            ...params,
            branchId: effectiveBranchId
        });

        res.status(200).json({ status: 'success', data: conflicts });
    } catch (error) {
        handleError(res, error, 'Error checking branch conflicts:');
    }
};

/**
 * 9. POST /api/branch/timetable/lectures
 * Create an individual calendar lecture within the authorized branch
 */
const createLecture = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const userId = resolveUserId(req);
        const accessContext = await timetableAccessService.resolveAccessContext(tenantId, req.user);
        const data = req.body;

        const branchId = accessContext.authorizedBranchId || data.branchId || data.branch_id || 1;

        // 1. Validate batch belongs to branch
        if (data.batchId || data.batch_id) {
            await timetableAccessService.validateBatchInBranch(tenantId, branchId, data.batchId || data.batch_id);
        }

        // 2. Validate classroom belongs to branch
        const roomId = data.classroomId || data.classroom_id || data.roomId;
        if (roomId && accessContext.authorizedBranchId) {
            await timetableAccessService.validateClassroomInBranch(tenantId, branchId, roomId);
        }

        // 3. Validate teacher is authorized for branch
        const teacherId = data.teacherUserId || data.teacher_user_id || data.teacherId;
        if (teacherId && accessContext.authorizedBranchId) {
            await timetableAccessService.validateTeacherInBranch(tenantId, branchId, teacherId);
        }

        // 4. Validate subject exists
        const subjectId = data.subjectId || data.subject_id;
        if (subjectId) {
            await timetableAccessService.validateSubjectInBranch(tenantId, branchId, subjectId);
        }

        // Force branch_id from access context
        const lectureData = {
            ...data,
            branch_id: branchId,
            branchId: branchId
        };

        const result = await timetableModel.createLecture(tenantId, lectureData, userId);
        res.status(201).json({ status: 'success', message: 'Lecture created successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error creating branch lecture:');
    }
};

/**
 * 10. PUT /api/branch/timetable/lectures/:id
 * Update an existing lecture in the authorized branch
 */
const updateLecture = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const userId = resolveUserId(req);
        const accessContext = await timetableAccessService.resolveAccessContext(tenantId, req.user);
        const { id } = req.params;
        const data = req.body;

        const branchId = accessContext.authorizedBranchId;

        // 1. Validate lecture exists and belongs to current branch
        const existingLecture = await timetableAccessService.validateLectureInBranch(tenantId, branchId, id);

        const targetBranchId = branchId || existingLecture.branch_id;

        // 2. Validate new batch if provided
        const newBatchId = data.batchId || data.batch_id;
        if (newBatchId && accessContext.authorizedBranchId) {
            await timetableAccessService.validateBatchInBranch(tenantId, targetBranchId, newBatchId);
        }

        // 3. Validate new classroom if provided
        const newRoomId = data.classroomId || data.classroom_id || data.roomId;
        if (newRoomId && accessContext.authorizedBranchId) {
            await timetableAccessService.validateClassroomInBranch(tenantId, targetBranchId, newRoomId);
        }

        // 4. Validate new teacher if provided
        const newTeacherId = data.teacherUserId || data.teacher_user_id || data.teacherId;
        if (newTeacherId && accessContext.authorizedBranchId) {
            await timetableAccessService.validateTeacherInBranch(tenantId, targetBranchId, newTeacherId);
        }

        // 5. Validate new subject if provided
        const newSubjectId = data.subjectId || data.subject_id;
        if (newSubjectId) {
            await timetableAccessService.validateSubjectInBranch(tenantId, targetBranchId, newSubjectId);
        }

        const lectureData = {
            ...data,
            branch_id: targetBranchId,
            branchId: targetBranchId,
            is_modified_from_default: 1
        };

        const result = await timetableModel.updateLecture(tenantId, id, lectureData, userId, branchId);
        res.status(200).json({ status: 'success', message: 'Lecture updated successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error updating branch lecture:');
    }
};

/**
 * 11. POST /api/branch/timetable/lectures/:id/cancel
 * Cancel a lecture in the authorized branch
 */
const cancelLecture = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const userId = resolveUserId(req);
        const accessContext = await timetableAccessService.resolveAccessContext(tenantId, req.user);
        const { id } = req.params;
        const { reason, cancellationReason } = req.body;

        const branchId = accessContext.authorizedBranchId;

        // Validate lecture exists and belongs to current branch
        await timetableAccessService.validateLectureInBranch(tenantId, branchId, id);

        const result = await timetableModel.cancelLecture(
            tenantId,
            id,
            reason || cancellationReason,
            userId,
            branchId
        );

        res.status(200).json({ status: 'success', message: 'Lecture cancelled successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error cancelling branch lecture:');
    }
};

/**
 * 12. DELETE /api/branch/timetable/lectures/:id
 * Soft delete a lecture in the authorized branch
 */
const deleteLecture = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const userId = resolveUserId(req);
        const accessContext = await timetableAccessService.resolveAccessContext(tenantId, req.user);
        const { id } = req.params;

        const branchId = accessContext.authorizedBranchId;

        // Validate lecture exists and belongs to current branch
        await timetableAccessService.validateLectureInBranch(tenantId, branchId, id);

        const result = await timetableModel.deleteLecture(tenantId, id, userId, branchId);
        res.status(200).json({ status: 'success', message: 'Lecture deleted successfully', data: result });
    } catch (error) {
        handleError(res, error, 'Error deleting branch lecture:');
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
