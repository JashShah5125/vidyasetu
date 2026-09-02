const staffModel = require('../models/staffModel');

const createStaff = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || 2;
        const creatorUserId = req.user?.userId || 201;
        const staffData = req.body;

        if (!staffData.firstName || !staffData.lastName || !staffData.employeeType) {
            return res.status(400).json({ message: 'First Name, Last Name, and Employee Type are required.' });
        }

        const result = await staffModel.createStaff(tenantId, staffData, creatorUserId);
        
        res.status(201).json({
            message: 'Staff member created successfully.',
            data: {
                userId: result.userId,
                profileId: result.profileId
            }
        });
    } catch (error) {
        console.error('Error creating staff:', error);
        res.status(500).json({ message: 'Internal server error while creating staff.', error: error.message });
    }
};

const getStaffList = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || 2;
        const { page = 1, limit = 50, search, branchId, employeeType, department } = req.query;

        const filters = {
            search,
            branchId,
            employeeType,
            department,
            limit: parseInt(limit, 10),
            offset: (parseInt(page, 10) - 1) * parseInt(limit, 10)
        };

        const result = await staffModel.getStaffList(tenantId, filters);
        
        res.status(200).json({
            message: 'Staff list retrieved successfully.',
            data: result.data,
            pagination: {
                total: result.total,
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                totalPages: Math.ceil(result.total / parseInt(limit, 10))
            }
        });
    } catch (error) {
        console.error('Error fetching staff list:', error);
        res.status(500).json({ message: 'Internal server error while fetching staff list.', error: error.message });
    }
};

const updateStaff = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || 2;
        const staffId = req.params.id;
        const staffData = req.body;

        const result = await staffModel.updateStaff(tenantId, staffId, staffData);
        
        res.status(200).json({
            message: 'Staff member updated successfully.',
            data: result
        });
    } catch (error) {
        console.error('Error updating staff:', error);
        res.status(500).json({ message: 'Internal server error while updating staff.', error: error.message });
    }
};

module.exports = {
    createStaff,
    getStaffList,
    updateStaff
};
