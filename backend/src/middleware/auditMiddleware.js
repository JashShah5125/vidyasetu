const pool = require('../config/db');
const AuditService = require('../services/auditService');

// Known table mappings for API resource segments
const KNOWN_TABLES = new Set([
    'students', 'batches', 'courses', 'programs', 'levels', 'subjects',
    'classrooms', 'branches', 'tenants', 'enquiries', 'staff_profiles',
    'users', 'fee_plans', 'fee_heads', 'concessions', 'receipts',
    'payment_transactions', 'admissions', 'student_enrollments',
    'homeworks', 'assignments', 'exams', 'doubts', 'lectures',
    'notifications', 'subscription_plans', 'saas_invoices', 'system_configurations'
]);

// Fields that should never be recorded in audit logs for security/cleanliness
const SENSITIVE_FIELDS = new Set([
    'password', 'password_hash', 'token', 'refreshToken', 'refresh_token',
    'otp', 'otp_code', 'secret', 'api_key', 'created_at', 'updated_at',
    'deleted_at'
]);

/**
 * Sanitizes object by removing passwords and sensitive keys.
 */
const sanitizePayload = (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    const clean = {};
    for (const [k, v] of Object.entries(obj)) {
        if (!SENSITIVE_FIELDS.has(k.toLowerCase())) {
            clean[k] = v;
        }
    }
    return clean;
};

/**
 * Parses URL path to derive entity_type and entity_id/code.
 * e.g., /api/admin/students/123 -> entityType: 'students', entityId: 123
 * e.g., /api/admin/courses/8TH-STD -> entityType: 'courses', entityCode: '8TH-STD'
 */
const parseEntityFromUrl = (url = '') => {
    const cleanPath = url.split('?')[0];
    const segments = cleanPath.split('/').filter(Boolean);

    let entityId = null;
    let entityCode = null;
    let entityType = null;

    // Filter out common prefix segments
    const prefixes = new Set(['api', 'v1', 'admin', 'branch', 'institute', 'teacher', 'student']);
    const meaningful = segments.filter(s => !prefixes.has(s));

    if (meaningful.length >= 2) {
        entityType = meaningful[0];
        const lastSeg = meaningful[meaningful.length - 1];
        if (/^\d+$/.test(lastSeg)) {
            entityId = parseInt(lastSeg, 10);
        } else {
            entityCode = decodeURIComponent(lastSeg);
        }
    } else if (meaningful.length === 1) {
        entityType = meaningful[0];
    } else {
        entityType = 'resource';
    }

    const normalizedTable = entityType ? entityType.replace(/-/g, '_') : 'resource';

    return {
        entityType: normalizedTable,
        entityId,
        entityCode
    };
};

/**
 * Maps HTTP method to default action verb.
 */
const methodToAction = (method) => {
    switch (method) {
        case 'POST': return 'CREATE';
        case 'PUT':
        case 'PATCH': return 'UPDATE';
        case 'DELETE': return 'DELETE';
        default: return 'ACTION';
    }
};

/**
 * Global audit middleware that:
 * 1. Takes pre-mutation snapshots on PUT/PATCH/DELETE for automatic before-and-after diffs.
 * 2. On response completion, writes full structured old_values and new_values to audit_logs.
 */
const auditMiddleware = async (req, res, next) => {
    const method = req.method ? req.method.toUpperCase() : '';
    const originalUrl = req.originalUrl || req.url || '';

    // Ignore non-mutating methods and excluded paths immediately
    if (
        !['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ||
        originalUrl.startsWith('/api/auth') ||
        originalUrl.startsWith('/health') ||
        originalUrl.startsWith('/uploads') ||
        originalUrl.includes('/audit-logs')
    ) {
        return next();
    }

    const { entityType, entityId, entityCode } = parseEntityFromUrl(originalUrl);

    // If PUT/PATCH/DELETE maps to a known DB table, capture BEFORE-snapshot by ID or CODE
    if (KNOWN_TABLES.has(entityType) && ['PUT', 'PATCH', 'DELETE'].includes(method)) {
        try {
            let sql = '';
            let param = null;
            if (entityId) {
                sql = `SELECT * FROM \`${entityType}\` WHERE id = ? LIMIT 1`;
                param = entityId;
            } else if (entityCode) {
                sql = `SELECT * FROM \`${entityType}\` WHERE code = ? LIMIT 1`;
                param = entityCode;
            }

            if (sql && param) {
                const [rows] = await pool.query(sql, [param]);
                if (rows && rows[0]) {
                    req._auditOldSnapshot = sanitizePayload(rows[0]);
                    req._resolvedEntityId = rows[0].id;
                }
            }
        } catch (_) {
            // Silently skip snapshot if table lookup fails
        }
    }

    // Intercept response completion to record final diff
    res.on('finish', () => {
        try {
            if (req.audit === false) return;
            if (res.statusCode >= 500 || res.statusCode === 404) return;

            const user = req.user;
            if (!user) return;

            const meta = req.auditMeta || {};
            const action = meta.action || methodToAction(method);
            const finalEntityType = meta.entityType || entityType;
            const finalEntityId = meta.entityId !== undefined ? meta.entityId : (req._resolvedEntityId || entityId);
            const severity = meta.severity || (method === 'DELETE' ? 'warning' : 'info');

            let oldValues = meta.oldValues !== undefined ? meta.oldValues : null;
            let newValues = meta.newValues !== undefined ? meta.newValues : null;

            // Helper to clean out noisy deep object trees (like programs array with levels & subjects)
            const simplifyPayload = (raw) => {
                if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
                const clean = {};
                for (const [k, v] of Object.entries(raw)) {
                    if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') {
                        // For nested collections, store count or summary rather than 100 lines of JSON
                        clean[k] = `[${v.length} item(s) configured]`;
                    } else {
                        clean[k] = v;
                    }
                }
                return clean;
            };

            if (method === 'POST') {
                // For CREATE: old is null, newValues is the payload
                if (!newValues && req.body) {
                    newValues = simplifyPayload(sanitizePayload(req.body));
                }
            } else if (method === 'DELETE') {
                // For DELETE: oldValues is the pre-delete snapshot, new is null
                if (!oldValues && req._auditOldSnapshot) {
                    oldValues = simplifyPayload(req._auditOldSnapshot);
                }
            } else if (method === 'PUT' || method === 'PATCH') {
                // For UPDATE / STATUS CHANGE: Compute precise field-by-field diff
                if (!oldValues && !newValues && req._auditOldSnapshot && req.body && typeof req.body === 'object') {
                    const diffOld = {};
                    const diffNew = {};
                    const body = sanitizePayload(req.body);

                    for (const [k, newVal] of Object.entries(body)) {
                        if (k in req._auditOldSnapshot) {
                            const oldVal = req._auditOldSnapshot[k];
                            // Boolean vs number handling (is_active: 1 vs true)
                            const isBooleanEquiv = (oldVal === 1 && newVal === true) || (oldVal === 0 && newVal === false);
                            const isDifferent = !isBooleanEquiv && oldVal != newVal && String(oldVal ?? '') !== String(newVal ?? '');
                            if (isDifferent) {
                                diffOld[k] = oldVal;
                                diffNew[k] = newVal;
                            }
                        } else if (!Array.isArray(newVal) || newVal.length === 0 || typeof newVal[0] !== 'object') {
                            diffNew[k] = newVal;
                        }
                    }

                    if (Object.keys(diffNew).length > 0) {
                        oldValues = simplifyPayload(diffOld);
                        newValues = simplifyPayload(diffNew);
                    } else {
                        newValues = simplifyPayload(body);
                    }
                } else if (!newValues && req.body) {
                    newValues = simplifyPayload(sanitizePayload(req.body));
                }
            }

            AuditService.logFromRequest(req, {
                action,
                entityType: finalEntityType,
                entityId: finalEntityId,
                severity,
                oldValues,
                newValues
            });
        } catch (err) {
            console.error('[auditMiddleware] Error recording audit trail:', err.message);
        }
    });

    next();
};

module.exports = auditMiddleware;
