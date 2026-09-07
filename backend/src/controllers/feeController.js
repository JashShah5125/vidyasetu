const feeModel = require('../models/feeModel');

const resolveTenantId = (req) => req.user && req.user.tenantId;

const getFeePlans = async (req, res) => {
    try {
        const { page = 1, limit = 10, courseId, programId, search = '' } = req.query;
        const offset = (page - 1) * limit;

        const result = await feeModel.listProgramFeePlans(resolveTenantId(req), {
            programId,
            courseId,
            search,
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
        console.error('Error fetching fee plans:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch fee plans' });
    }
};

const upsertProgramFeePlan = async (req, res) => {
    try {
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

        const result = await feeModel.upsertProgramFee(resolveTenantId(req), id, {
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

        const success = await feeModel.clearProgramFee(resolveTenantId(req), id, userId);
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
        const { levelId } = req.params;
        const data = await feeModel.getLevelSubjectFees(resolveTenantId(req), levelId);

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
        const userId = req.user?.userId || 1;
        const { levelId, subjectId, feeAmount } = req.body;

        if (!levelId || !subjectId) {
            return res.status(400).json({ status: 'error', message: 'Missing required fields (levelId, subjectId)' });
        }

        const result = await feeModel.upsertSubjectFee(resolveTenantId(req), {
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