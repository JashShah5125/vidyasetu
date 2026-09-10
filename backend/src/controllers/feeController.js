const feeModel = require('../models/feeModel');
const feeAccessService = require('../services/feeAccessService');

const resolveTenantId = (req) => {
    if (req.query && req.query.tenantId) return parseInt(req.query.tenantId);
    if (req.user && req.user.tenantId && req.user.tenantId !== 1) return req.user.tenantId;
    return 2;
};

const getFeePlans = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);
        const { page = 1, limit = 10, courseId, programId, search = '' } = req.query;
        const offset = (page - 1) * limit;

        const result = await feeModel.listProgramFeePlans(tenantId, {
            programId,
            courseId,
            search,
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
        console.error('Error fetching fee plans:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch fee plans' });
    }
};

const upsertProgramFeePlan = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);
        if (accessContext.scope === 'BRANCH') {
            return res.status(403).json({ status: 'error', message: 'Forbidden: Branch Admins cannot modify fee structures.' });
        }

        const { id } = req.params;
        const userId = req.user?.userId || 1;
        const { totalFee, downPayment, months } = req.body;

        if (totalFee === undefined || totalFee === null || totalFee === '') {
            return res.status(400).json({ status: 'error', message: 'Total program fees are required' });
        }
        if (downPayment === undefined || downPayment === null || downPayment === '') {
            return res.status(400).json({ status: 'error', message: 'Down payment is required' });
        }
        if (months === undefined || months === null || months === '') {
            return res.status(400).json({ status: 'error', message: 'Installment months are required' });
        }

        const result = await feeModel.upsertProgramFee(tenantId, id, {
            totalFee,
            downPayment,
            months
        }, userId);

        if (!result) {
            return res.status(404).json({ status: 'error', message: 'Program not found' });
        }

        res.json({ status: 'success', message: 'Fee configuration saved successfully', data: result });
    } catch (error) {
        console.error('Error saving fee plan:', error);
        res.status(500).json({ status: 'error', message: 'Failed to save fee configuration' });
    }
};

const clearProgramFeePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId || 1;

        const tenantId = resolveTenantId(req);
        const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);
        if (accessContext.scope === 'BRANCH') {
            return res.status(403).json({ status: 'error', message: 'Forbidden: Branch Admins cannot modify fee structures.' });
        }

        const success = await feeModel.clearProgramFee(tenantId, id, userId);
        if (!success) {
            return res.status(404).json({ status: 'error', message: 'Program not found' });
        }

        res.json({ status: 'success', message: 'Fee configuration removed successfully' });
    } catch (error) {
        console.error('Error clearing fee plan:', error);
        res.status(500).json({ status: 'error', message: 'Failed to remove fee configuration' });
    }
};

const getLevelSubjectFees = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { levelId } = req.params;
        const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);

        if (accessContext.scope === 'BRANCH') {
            if (!accessContext.authorizedBranchId) {
                return res.status(403).json({ status: 'error', message: 'Forbidden: No authorized branch assigned' });
            }
            const isLevelInBranch = await feeAccessService.verifyLevelInBranch(tenantId, levelId, accessContext.authorizedBranchId);
            if (!isLevelInBranch) {
                return res.status(403).json({ status: 'error', message: 'Forbidden: This academic level is not assigned to your branch.' });
            }
        }

        const data = await feeModel.getLevelSubjectFees(tenantId, levelId, accessContext);

        res.json({
            status: 'success',
            data,
            pagination: {
                total: data.length,
                page: 1,
                limit: data.length,
                totalPages: 1
            }
        });
    } catch (error) {
        console.error('Error fetching subject fees:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch subject fees' });
    }
};

const upsertSubjectFee = async (req, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const accessContext = await feeAccessService.resolveAccessContext(tenantId, req.user);
        if (accessContext.scope === 'BRANCH') {
            return res.status(403).json({ status: 'error', message: 'Forbidden: Branch Admins cannot modify subject fees.' });
        }

        const userId = req.user?.userId || 1;
        const { levelId, subjectId, feeAmount } = req.body;

        if (!levelId || !subjectId) {
            return res.status(400).json({ status: 'error', message: 'Missing required fields (levelId, subjectId)' });
        }

        const result = await feeModel.upsertSubjectFee(tenantId, {
            levelId,
            subjectId,
            feeAmount
        }, userId);

        if (!result) {
            return res.status(400).json({
                status: 'error',
                message: 'The subject is not mapped to this level or the level does not exist'
            });
        }

        res.json({ status: 'success', message: 'Subject fee saved successfully', data: result });
    } catch (error) {
        console.error('Error saving subject fee:', error);
        res.status(500).json({ status: 'error', message: 'Failed to save subject fee' });
    }
};

module.exports = {
    getFeePlans,
    upsertProgramFeePlan,
    clearProgramFeePlan,
    getLevelSubjectFees,
    upsertSubjectFee
};