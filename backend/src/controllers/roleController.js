const roleModel = require('../models/roleModel');

const listRoles = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status = '' } = req.query;

        const roles = await roleModel.getRolesList({ page, limit, search, status });
        const total = await roleModel.getRolesCount({ search, status });

        res.status(200).json({
            status: 'success',
            data: {
                roles,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / limit) || 1
                }
            }
        });
    } catch (error) {
        console.error('Error listing roles:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch roles list' });
    }
};

const getAllPermissions = async (req, res) => {
    try {
        const permissionsData = await roleModel.getAllPermissionsGrouped();
        res.status(200).json({
            status: 'success',
            data: permissionsData
        });
    } catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch permissions list' });
    }
};

const getRoleDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const role = await roleModel.getRoleById(id);

        if (!role) {
            return res.status(404).json({ status: 'error', message: 'Role not found' });
        }

        res.status(200).json({
            status: 'success',
            data: role
        });
    } catch (error) {
        console.error('Error fetching role details:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch role details' });
    }
};

const createRole = async (req, res) => {
    try {
        const { name, code, description, is_active, permission_ids } = req.body;

        if (!name || !code) {
            return res.status(400).json({ status: 'error', message: 'Role name and role code are required' });
        }

        // Sanitize code to snake_case format e.g. custom_counsellor
        const formattedCode = code.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');

        const existing = await roleModel.findRoleByCode(formattedCode);
        if (existing) {
            return res.status(409).json({ status: 'error', message: `Role code '${formattedCode}' already exists` });
        }

        const created_by = req.user ? req.user.userId : null;

        const roleId = await roleModel.createRole({
            name,
            code: formattedCode,
            description,
            is_active: is_active !== undefined ? is_active : 1,
            permission_ids: Array.isArray(permission_ids) ? permission_ids : [],
            created_by
        });

        res.status(201).json({
            status: 'success',
            message: 'Custom role created successfully',
            data: { id: roleId, code: formattedCode }
        });
    } catch (error) {
        console.error('Error creating role:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create role' });
    }
};

const updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, is_active, permission_ids } = req.body;

        const existing = await roleModel.getRoleById(id);
        if (!existing) {
            return res.status(404).json({ status: 'error', message: 'Role not found' });
        }

        const updated_by = req.user ? req.user.userId : null;

        await roleModel.updateRole(id, {
            name: name || existing.name,
            description: description !== undefined ? description : existing.description,
            is_active: is_active !== undefined ? is_active : existing.is_active,
            permission_ids: Array.isArray(permission_ids) ? permission_ids : existing.permission_ids,
            updated_by
        });

        res.status(200).json({
            status: 'success',
            message: 'Role and permissions matrix updated successfully'
        });
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({ status: 'error', message: 'Failed to update role' });
    }
};

const deleteRole = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await roleModel.deleteRole(id);

        if (!result.success) {
            if (result.reason === 'SYSTEM_ROLE_PROTECTED') {
                return res.status(403).json({
                    status: 'error',
                    message: 'Forbidden. Built-in system roles cannot be deleted.'
                });
            }
            return res.status(404).json({ status: 'error', message: 'Role not found or already deleted' });
        }

        res.status(200).json({
            status: 'success',
            message: 'Role soft-deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting role:', error);
        res.status(500).json({ status: 'error', message: 'Failed to delete role' });
    }
};

module.exports = {
    listRoles,
    getAllPermissions,
    getRoleDetails,
    createRole,
    updateRole,
    deleteRole
};
