const pool = require('../config/db');

/**
 * Fetch branch analytics: total platform count & per-tenant breakdown with plan limits
 */
const getBranchesAnalytics = async () => {
    // Total branches across all tenants
    const [[totalRow]] = await pool.query(`
        SELECT COUNT(*) AS total_branches
        FROM branches
        WHERE deleted_at IS NULL
    `);

    // Per-tenant branch count and plan limit
    const [byTenant] = await pool.query(`
        SELECT 
            t.id AS tenant_id,
            t.name AS tenant_name,
            t.status AS tenant_status,
            COUNT(b.id) AS branch_count,
            COALESCE(pl.max_branches, 5) AS max_branches
        FROM tenants t
        LEFT JOIN branches b ON t.id = b.tenant_id AND b.deleted_at IS NULL
        LEFT JOIN plan_limits pl ON t.plan_id = pl.plan_id
        WHERE t.tenant_type != 'master' AND t.id != 1 AND t.deleted_at IS NULL AND t.status != 3
        GROUP BY t.id, t.name, t.status, pl.max_branches
        ORDER BY branch_count DESC, t.name ASC
    `);

    return {
        totalBranches: Number(totalRow?.total_branches) || 0,
        byTenant
    };
};

/**
 * Fetch user analytics: total platform users & per-tenant breakdown with plan limits
 */
const getUsersAnalytics = async () => {
    // Total users & active users across all tenants
    const [[totalRow]] = await pool.query(`
        SELECT 
            COUNT(*) AS total_users,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_users
        FROM users
        WHERE deleted_at IS NULL
    `);

    // Per-tenant users count and plan limit
    const [byTenant] = await pool.query(`
        SELECT 
            t.id AS tenant_id,
            t.name AS tenant_name,
            t.status AS tenant_status,
            COUNT(u.id) AS total_users,
            SUM(CASE WHEN u.status = 'active' THEN 1 ELSE 0 END) AS active_users,
            COALESCE(pl.max_staff_users, 50) AS max_users
        FROM tenants t
        LEFT JOIN users u ON t.id = u.tenant_id AND u.deleted_at IS NULL
        LEFT JOIN plan_limits pl ON t.plan_id = pl.plan_id
        WHERE t.tenant_type != 'master' AND t.id != 1 AND t.deleted_at IS NULL AND t.status != 3
        GROUP BY t.id, t.name, t.status, pl.max_staff_users
        ORDER BY total_users DESC, t.name ASC
    `);

    return {
        totalUsers: Number(totalRow?.total_users) || 0,
        activeUsers: Number(totalRow?.active_users) || 0,
        byTenant
    };
};

/**
 * Fetch module usage metrics directly from audit_logs
 */
const getModuleUsageFromAuditLogs = async (timeRange = 'month', tenantId = null) => {
    // 1. Fetch all active tenants for the dropdown selector
    const [tenantsList] = await pool.query(`
        SELECT id, name
        FROM tenants
        WHERE deleted_at IS NULL AND id != 1 AND tenant_type != 'master'
        ORDER BY name ASC
    `);

    const totalTenants = tenantsList.length;

    // 2. Build query with optional time filter and optional tenantId filter
    let sql = `
        SELECT 
            al.entity_type,
            al.tenant_id,
            al.user_id,
            COUNT(*) AS event_count,
            MAX(al.created_at) AS last_activity
        FROM audit_logs al
        INNER JOIN tenants t ON al.tenant_id = t.id AND t.deleted_at IS NULL AND t.id != 1
        WHERE 1 = 1
    `;
    const params = [];

    // Time ranges: 'month' (30 days), 'year' (365 days), 'total' (all time)
    if (timeRange === 'month' || timeRange === '30' || timeRange === 30) {
        sql += ` AND al.created_at >= NOW() - INTERVAL 30 DAY `;
    } else if (timeRange === 'year' || timeRange === '365' || timeRange === 365) {
        sql += ` AND al.created_at >= NOW() - INTERVAL 365 DAY `;
    }
    // If timeRange === 'total' or 'all', no time filter applied -> All Time

    if (tenantId && tenantId !== 'all') {
        sql += ` AND al.tenant_id = ? `;
        params.push(Number(tenantId));
    }

    sql += ` GROUP BY al.entity_type, al.tenant_id, al.user_id `;

    const [rows] = await pool.query(sql, params);

    return {
        tenantsList,
        totalTenants,
        rows
    };
};

module.exports = {
    getBranchesAnalytics,
    getUsersAnalytics,
    getModuleUsageFromAuditLogs
};
