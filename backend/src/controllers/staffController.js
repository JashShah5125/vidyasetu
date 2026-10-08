const staffModel = require('../models/staffModel');
const pool = require('../config/db');

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
        if (error.statusCode === 409 || (error.message && (error.message.includes('already exists') || error.message.includes('already in use')))) {
            return res.status(409).json({ message: error.message });
        }
        res.status(500).json({ message: 'Internal server error while creating staff.', error: error.message });
    }
};

const getStaffList = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || 2;
        const { page = 1, limit = 50, search, branchId, employeeType, department, role, status } = req.query;

        const filters = {
            search,
            branchId,
            employeeType,
            department,
            role,
            status,
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

const getStaffById = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || 2;
        const staffId = req.params.id;

        const staff = await staffModel.getStaffById(tenantId, staffId);
        if (!staff) {
            return res.status(404).json({ message: 'Staff member not found.' });
        }

        res.status(200).json({
            message: 'Staff member retrieved successfully.',
            data: staff
        });
    } catch (error) {
        console.error('Error fetching staff member:', error);
        res.status(500).json({ message: 'Internal server error while fetching staff member.', error: error.message });
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
        if (error.statusCode === 409 || (error.message && (error.message.includes('already exists') || error.message.includes('already in use')))) {
            return res.status(409).json({ message: error.message });
        }
        res.status(500).json({ message: 'Internal server error while updating staff.', error: error.message });
    }
};

const deleteStaff = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || 2;
        const staffId = req.params.id;

        const result = await staffModel.deleteStaff(tenantId, staffId);
        res.status(200).json({
            message: 'Staff member deleted successfully.',
            data: result
        });
    } catch (error) {
        console.error('Error deleting staff:', error);
        res.status(500).json({ message: 'Internal server error while deleting staff.', error: error.message });
    }
};

const getAdminLeaveRequests = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.user?.tenant_id || 2;
        const { branchId, status } = req.query;
        let query = `
            SELECT lr.id, lr.tenant_id, lr.branch_id, lr.staff_id,
                   DATE_FORMAT(lr.start_date, '%Y-%m-%d') AS start_date,
                   DATE_FORMAT(lr.end_date, '%Y-%m-%d') AS end_date,
                   lr.leave_type, lr.reason, lr.status, lr.created_at,
                   b.name AS branch_name,
                   CONCAT(sp.first_name, ' ', COALESCE(sp.last_name, '')) AS staff_name,
                   sp.employee_id, sp.designation, u.email AS staff_email
            FROM leave_requests lr
            JOIN staff_profiles sp ON lr.staff_id = sp.id
            LEFT JOIN users u ON sp.user_id = u.id
            LEFT JOIN branches b ON lr.branch_id = b.id
            WHERE lr.tenant_id = ? AND lr.deleted_at IS NULL
        `;
        const params = [tenantId];
        if (branchId && branchId !== 'All') {
            if (isNaN(Number(branchId))) {
                query += ' AND b.name = ?';
                params.push(branchId);
            } else {
                query += ' AND (lr.branch_id = ? OR b.id = ?)';
                params.push(Number(branchId), Number(branchId));
            }
        }
        if (status && status !== 'all') {
            query += ' AND lr.status = ?';
            params.push(status);
        }
        query += ' ORDER BY lr.created_at DESC';

        const [rows] = await pool.query(query, params);
        res.status(200).json({
            status: 'success',
            data: rows
        });
    } catch (error) {
        console.error('Error fetching admin leave requests:', error);
        res.status(500).json({ message: 'Failed to fetch leave requests.', error: error.message });
    }
};

const updateAdminLeaveStatus = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.user?.tenant_id || 2;
        const approverId = req.user?.userId || req.user?.id;
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !['approved', 'rejected', 'cancelled'].includes(status)) {
            return res.status(400).json({ message: 'Valid status (approved, rejected, cancelled) is required.' });
        }

        const [leaveRows] = await pool.query(
            `SELECT lr.id, lr.start_date, lr.end_date, lr.leave_type, lr.reason, sp.user_id
             FROM leave_requests lr
             JOIN staff_profiles sp ON lr.staff_id = sp.id
             WHERE lr.id = ? AND lr.tenant_id = ? AND lr.deleted_at IS NULL`,
            [Number(id), tenantId]
        );

        if (leaveRows.length === 0) {
            return res.status(404).json({ message: 'Leave request not found.' });
        }

        const leave = leaveRows[0];

        await pool.query(
            `UPDATE leave_requests SET status = ?, approved_by = ?, updated_at = NOW() WHERE id = ?`,
            [status, approverId, Number(id)]
        );

        if (status === 'rejected') {
            const sDate = new Date(leave.start_date).toISOString().split('T')[0];
            const eDate = new Date(leave.end_date).toISOString().split('T')[0];
            await pool.query(
                `DELETE FROM teacher_availability
                 WHERE tenant_id = ?
                   AND teacher_user_id = ?
                   AND specific_date >= ?
                   AND specific_date <= ?
                   AND reason LIKE ?`,
                [tenantId, leave.user_id, sDate, eDate, `%[Leave:%`]
            ).catch(e => console.warn('Availability cleanup note:', e.message));
        }

        res.status(200).json({
            status: 'success',
            message: `Leave request marked as ${status}.`
        });
    } catch (error) {
        console.error('Error updating leave status:', error);
        res.status(500).json({ message: 'Failed to update leave status.', error: error.message });
    }
};

module.exports = {
    createStaff,
    getStaffList,
    getStaffById,
    updateStaff,
    deleteStaff,
    getAdminLeaveRequests,
    updateAdminLeaveStatus
};
