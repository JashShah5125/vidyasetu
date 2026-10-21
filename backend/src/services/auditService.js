const pool = require('../config/db');

/**
 * Service to write audit trail records.
 * Fire-and-forget: Errors are trapped and logged so failures never break client requests.
 */
class AuditService {
    /**
     * Insert a single audit log entry into audit_logs.
     */
    static async log({
        tenantId = null,
        branchId = null,
        userId = null,
        action,
        entityType,
        entityId = null,
        severity = 'info',
        endpoint = null,
        method = null,
        oldValues = null,
        newValues = null,
        ipAddress = null,
        userAgent = null
    }) {
        if (!action || !entityType) {
            return;
        }

        try {
            const query = `
                INSERT INTO audit_logs (
                    tenant_id,
                    branch_id,
                    user_id,
                    action,
                    entity_type,
                    entity_id,
                    severity,
                    endpoint,
                    request_method,
                    old_values,
                    new_values,
                    ip_address,
                    user_agent,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `;

            const params = [
                tenantId ? Number(tenantId) : null,
                branchId ? Number(branchId) : null,
                userId ? Number(userId) : null,
                String(action).toUpperCase().slice(0, 100),
                String(entityType).toLowerCase().slice(0, 100),
                entityId !== null && entityId !== undefined && !isNaN(Number(entityId)) ? Number(entityId) : null,
                ['info', 'warning', 'critical'].includes(severity) ? severity : 'info',
                endpoint ? String(endpoint).slice(0, 255) : null,
                method ? String(method).slice(0, 10) : null,
                oldValues ? JSON.stringify(oldValues) : null,
                newValues ? JSON.stringify(newValues) : null,
                ipAddress ? String(ipAddress).slice(0, 45) : null,
                userAgent ? String(userAgent).slice(0, 1000) : null
            ];

            await pool.query(query, params);
        } catch (err) {
            // Fail silently so auditing never crashes core operations
            console.error('[AuditService.log] Failed to write audit log:', err.message);
        }
    }

    /**
     * Convenience wrapper using Express req object
     */
    static async logFromRequest(req, {
        action,
        entityType,
        entityId = null,
        severity = 'info',
        oldValues = null,
        newValues = null,
        tenantId = null,
        branchId = null,
        userId = null
    }) {
        try {
            const effectiveTenantId = tenantId || req.user?.tenantId || req.user?.tenant_id || null;
            const effectiveUserId = userId || req.user?.userId || req.user?.id || null;
            const effectiveBranchId = branchId || req.user?.branchId || req.headers['x-branch-id'] || null;

            const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
            const userAgent = req.headers['user-agent'] || null;
            const endpoint = req.originalUrl || req.url;
            const method = req.method;

            return await this.log({
                tenantId: effectiveTenantId,
                branchId: effectiveBranchId,
                userId: effectiveUserId,
                action,
                entityType,
                entityId,
                severity,
                endpoint,
                method,
                oldValues,
                newValues,
                ipAddress,
                userAgent
            });
        } catch (err) {
            console.error('[AuditService.logFromRequest] Error:', err.message);
        }
    }
}

module.exports = AuditService;
