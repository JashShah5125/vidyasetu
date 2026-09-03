const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');

const listUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status = '', tenantId = '', userType = '' } = req.query;

        const users = await userModel.getUsersList({ page, limit, search, status, tenantId, userType });
        const total = await userModel.getUsersCount({ search, status, tenantId, userType });

        res.status(200).json({
            status: 'success',
            data: {
                users,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / limit) || 1
                }
            }
        });
    } catch (error) {
        console.error('Error listing users:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch users list' });
    }
};

const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await userModel.getUserFullDetails(id);
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }
        res.status(200).json({ status: 'success', data: user });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch user details' });
    }
};

const createUser = async (req, res) => {
    try {
        const { tenant_id, name, email, mobile, password, user_type, status, role_id } = req.body;

        if (!tenant_id || !name || !email || !password || !user_type) {
            return res.status(400).json({ status: 'error', message: 'Tenant, name, email, password, and user type are required' });
        }

        // Check email uniqueness within tenant
        const existing = await userModel.findUserByEmail(email, tenant_id);
        if (existing && existing.length > 0) {
            return res.status(409).json({ status: 'error', message: 'Email address is already in use for this tenant' });
        }

        const password_hash = await bcrypt.hash(password, 10);
        const created_by = req.user ? req.user.userId : null;

        const newUserId = await userModel.createUser({
            tenant_id,
            name,
            email,
            mobile,
            password_hash,
            user_type,
            status: status || 'active',
            role_id: role_id || null,
            created_by
        });

        res.status(201).json({
            status: 'success',
            message: 'User created successfully',
            data: { id: newUserId }
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create user' });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, mobile, user_type, status, app_access_suspended, role_id } = req.body;

        const user = await userModel.findUserById(id);
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        // Email conflict check
        if (email && email !== user.email) {
            const existing = await userModel.findUserByEmail(email, user.tenant_id);
            if (existing && existing.length > 0 && existing[0].id !== parseInt(id)) {
                return res.status(409).json({ status: 'error', message: 'Email is already used by another account in this tenant' });
            }
        }

        const updated_by = req.user ? req.user.userId : null;

        await userModel.updateUser(id, {
            name: name || user.name,
            email: email || user.email,
            mobile: mobile !== undefined ? mobile : user.mobile,
            user_type: user_type || user.user_type,
            status: status || user.status,
            app_access_suspended: app_access_suspended !== undefined ? app_access_suspended : user.app_access_suspended,
            role_id: role_id || null,
            updated_by
        });

        res.status(200).json({ status: 'success', message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ status: 'error', message: 'Failed to update user' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await userModel.deleteUser(id);
        if (!success) {
            return res.status(404).json({ status: 'error', message: 'User not found or already deleted' });
        }
        res.status(200).json({ status: 'success', message: 'User soft-deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ status: 'error', message: 'Failed to delete user' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const targetPassword = req.body.newPassword || req.body.password;

        if (!targetPassword || targetPassword.length < 6) {
            return res.status(400).json({ status: 'error', message: 'New password must be at least 6 characters long' });
        }

        const password_hash = await bcrypt.hash(targetPassword, 10);
        const success = await userModel.resetUserPassword(id, password_hash);

        if (!success) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        res.status(200).json({ status: 'success', message: 'User password reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ status: 'error', message: 'Failed to reset password' });
    }
};

const getRoles = async (req, res) => {
    try {
        const roles = await userModel.getAllRoles();
        res.status(200).json({ status: 'success', data: roles });
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch roles' });
    }
};

const getTenants = async (req, res) => {
    try {
        const tenants = await userModel.getAllTenants();
        res.status(200).json({ status: 'success', data: tenants });
    } catch (error) {
        console.error('Error fetching tenants:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch tenants' });
    }
};

const removeUserRole = async (req, res) => {
    try {
        const { id, roleId } = req.params;
        await userModel.removeUserRole(id, roleId);
        res.status(200).json({ status: 'success', message: 'Role revoked from user successfully' });
    } catch (error) {
        console.error('Error revoking user role:', error);
        res.status(500).json({ status: 'error', message: 'Failed to revoke role' });
    }
};

const assignUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role_id } = req.body;
        if (!role_id) {
            return res.status(400).json({ status: 'error', message: 'role_id is required' });
        }
        const assigned_by = req.user ? req.user.userId : null;
        await userModel.assignUserRole(id, role_id, assigned_by);
        res.status(200).json({ status: 'success', message: 'Role assigned to user successfully' });
    } catch (error) {
        console.error('Error assigning role:', error);
        res.status(500).json({ status: 'error', message: 'Failed to assign role' });
    }
};

const changeUserRole = async (req, res) => {
    try {
        const { id, roleId } = req.params;
        const { new_role_id } = req.body;
        if (!new_role_id) {
            return res.status(400).json({ status: 'error', message: 'new_role_id is required' });
        }
        const updated_by = req.user ? req.user.userId : null;
        await userModel.changeUserRole(id, roleId, new_role_id, updated_by);
        res.status(200).json({ status: 'success', message: 'User role updated successfully' });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ status: 'error', message: 'Failed to update user role' });
    }
};

const addPermissionOverride = async (req, res) => {
    try {
        const { id } = req.params;
        const { permission_id, override_type } = req.body;
        if (!permission_id || !['grant', 'revoke'].includes(override_type)) {
            return res.status(400).json({ status: 'error', message: 'Valid permission_id and override_type (grant or revoke) are required' });
        }
        const created_by = req.user ? req.user.userId : null;
        await userModel.addUserPermissionOverride({
            user_id: parseInt(id),
            permission_id: parseInt(permission_id),
            override_type,
            created_by
        });
        res.status(200).json({ status: 'success', message: 'User permission override saved successfully' });
    } catch (error) {
        console.error('Error adding permission override:', error);
        res.status(500).json({ status: 'error', message: 'Failed to save permission override' });
    }
};

const removePermissionOverride = async (req, res) => {
    try {
        const { id, overrideId } = req.params;
        await userModel.removeUserPermissionOverride(parseInt(id), parseInt(overrideId));
        res.status(200).json({ status: 'success', message: 'Permission override removed successfully' });
    } catch (error) {
        console.error('Error removing permission override:', error);
        res.status(500).json({ status: 'error', message: 'Failed to remove permission override' });
    }
};

module.exports = {
    listUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    resetPassword,
    getRoles,
    getTenants,
    removeUserRole,
    assignUserRole,
    changeUserRole,
    addPermissionOverride,
    removePermissionOverride
};
