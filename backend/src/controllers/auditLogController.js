const pool = require('../config/db');

/**
 * Controller for retrieving Audit Logs with multi-tenant and branch security scoping.
 */
class AuditLogController {
    /**
     * GET /api/admin/audit-logs
     * Query params:
     *   page: number (default 1)
     *   limit: number (default 20, max 100)
     *   tenantId: number (SaaS Admin only)
     *   branchId: number
     *   action: string
     *   entityType: string
     *   severity: string ('info' | 'warning' | 'critical')
     *   userId: number
     *   search: string (matches user name, email, action, endpoint)
     *   startDate: string (YYYY-MM-DD)
     *   endDate: string (YYYY-MM-DD)
     */
    static async getLogs(req, res) {
        try {
            const page = Math.max(1, parseInt(req.query.page, 10) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
            const offset = (page - 1) * limit;

            const {
                tenantId: filterTenantId,
                branchId: filterBranchId,
                action,
                entityType,
                severity,
                userId,
                search,
                startDate,
                endDate
            } = req.query;

            const isSaasAdmin = Boolean(req.user?.isSaasAdmin);
            const currentUserTenantId = req.user?.tenantId || req.user?.tenant_id;
            const currentUserId = req.user?.userId || req.user?.id;
            const isBranchAdmin = req.user?.userType === 'branch_admin' || req.user?.role === 'branch_admin' || req.user?.userType === 'branch-admin';

            const conditions = [];
            const params = [];

            // 1. Role-based scoping
            if (isSaasAdmin) {
                // SaaS admin can view across all tenants, optionally filter by tenantId
                if (filterTenantId) {
                    conditions.push('a.tenant_id = ?');
                    params.push(Number(filterTenantId));
                }
            } else if (isBranchAdmin) {
                // Branch admin scoped to own tenant and branches they have access to
                conditions.push('a.tenant_id = ?');
                params.push(currentUserTenantId);

                conditions.push(`(
                    a.branch_id IN (
                        SELECT branch_id FROM user_branch_access
                        WHERE user_id = ? AND revoked_at IS NULL
                    ) OR a.user_id = ?
                )`);
                params.push(currentUserId, currentUserId);
            } else {
                // Institute Admin (and other institute staff) scoped to their institute
                conditions.push('a.tenant_id = ?');
                params.push(currentUserTenantId);
            }

            // 2. Specific branch filter
            if (filterBranchId) {
                conditions.push('a.branch_id = ?');
                params.push(Number(filterBranchId));
            }

            // 3. Action filter
            if (action && action !== 'All') {
                conditions.push('a.action = ?');
                params.push(action);
            }

            // 4. Entity Type filter
            if (entityType && entityType !== 'All') {
                conditions.push('a.entity_type = ?');
                params.push(entityType);
            }

            // 5. Severity filter
            if (severity && severity !== 'All') {
                conditions.push('a.severity = ?');
                params.push(severity);
            }

            // 6. User ID filter
            if (userId) {
                conditions.push('a.user_id = ?');
                params.push(Number(userId));
            }

            // 7. Date range filter
            if (startDate) {
                conditions.push('a.created_at >= ?');
                params.push(`${startDate} 00:00:00`);
            }
            if (endDate) {
                conditions.push('a.created_at <= ?');
                params.push(`${endDate} 23:59:59`);
            }

            // 8. Search query (matches user name, email, endpoint, action)
            if (search && search.trim()) {
                const s = `%${search.trim()}%`;
                conditions.push('(u.name LIKE ? OR u.email LIKE ? OR a.action LIKE ? OR a.endpoint LIKE ?)');
                params.push(s, s, s, s);
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

            // Count total query
            const countSql = `
                SELECT COUNT(*) AS total
                FROM audit_logs a
                LEFT JOIN users u ON a.user_id = u.id
                ${whereClause}
            `;
            const [[{ total }]] = await pool.query(countSql, params);

            // Fetch records query
            const listSql = `
                SELECT
                    a.id,
                    a.tenant_id AS tenantId,
                    t.name AS tenantName,
                    a.branch_id AS branchId,
                    b.name AS branchName,
                    a.user_id AS userId,
                    u.name AS userName,
                    u.email AS userEmail,
                    u.user_type AS userRole,
                    a.action,
                    a.entity_type AS entityType,
                    a.entity_id AS entityId,
                    a.severity,
                    a.endpoint,
                    a.request_method AS requestMethod,
                    a.old_values AS oldValues,
                    a.new_values AS newValues,
                    a.ip_address AS ipAddress,
                    a.user_agent AS userAgent,
                    a.created_at AS createdAt
                FROM audit_logs a
                LEFT JOIN users u ON a.user_id = u.id
                LEFT JOIN tenants t ON a.tenant_id = t.id
                LEFT JOIN branches b ON a.branch_id = b.id
                ${whereClause}
                ORDER BY a.created_at DESC
                LIMIT ? OFFSET ?
            `;

            const [rows] = await pool.query(listSql, [...params, limit, offset]);

            res.status(200).json({
                status: 'success',
                data: {
                    items: rows.map(r => ({
                        ...r,
                        oldValues: typeof r.oldValues === 'string' ? JSON.parse(r.oldValues) : r.oldValues,
                        newValues: typeof r.newValues === 'string' ? JSON.parse(r.newValues) : r.newValues
                    })),
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            console.error('[AuditLogController.getLogs] Error:', error);
            res.status(500).json({ status: 'error', message: 'Failed to retrieve audit logs' });
        }
    }

    /**
     * GET /api/admin/audit-logs/meta
     * Returns distinct actions, entityTypes, and available tenants/branches for filter dropdowns.
     */
    static async getMeta(req, res) {
        try {
            const isSaasAdmin = Boolean(req.user?.isSaasAdmin);
            const currentUserTenantId = req.user?.tenantId || req.user?.tenant_id;

            let scopeWhere = '';
            const scopeParams = [];

            if (!isSaasAdmin) {
                scopeWhere = 'WHERE a.tenant_id = ?';
                scopeParams.push(currentUserTenantId);
            }

            const [actions] = await pool.query(
                `SELECT DISTINCT action FROM audit_logs a ${scopeWhere} ORDER BY action ASC`,
                scopeParams
            );
            const [entityTypes] = await pool.query(
                `SELECT DISTINCT entity_type AS entityType FROM audit_logs a ${scopeWhere} ORDER BY entity_type ASC`,
                scopeParams
            );

            let tenants = [];
            if (isSaasAdmin) {
                const [tenantRows] = await pool.query(
                    `SELECT id, name FROM tenants WHERE deleted_at IS NULL ORDER BY name ASC`
                );
                tenants = tenantRows;
            }

            let branches = [];
            if (!isSaasAdmin) {
                const [branchRows] = await pool.query(
                    `SELECT id, name FROM branches WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name ASC`,
                    [currentUserTenantId]
                );
                branches = branchRows;
            }

            res.status(200).json({
                status: 'success',
                data: {
                    actions: actions.map(r => r.action).filter(Boolean),
                    entityTypes: entityTypes.map(r => r.entityType).filter(Boolean),
                    severities: ['info', 'warning', 'critical'],
                    tenants,
                    branches
                }
            });
        } catch (error) {
            console.error('[AuditLogController.getMeta] Error:', error);
            res.status(500).json({ status: 'error', message: 'Failed to retrieve audit log metadata' });
        }
    }
}

module.exports = AuditLogController;
