-- Map all permissions to the SaaS Admin role (role_id=1)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions
WHERE code LIKE 'tenant.%'
   OR code LIKE 'plan.%'
   OR code LIKE 'subscription.%'
   OR code LIKE 'module.%'
   OR code LIKE 'feature_flag.%'
   OR code LIKE 'approval.%'
   OR code LIKE 'support.%'
   OR code LIKE 'communication.%'
   OR code LIKE 'billing.%'
   OR code LIKE 'analytics.%'
   OR code LIKE 'report.%'
   OR code LIKE 'audit_log.%'
   OR code LIKE 'system_config.%'
   OR code LIKE 'role.%'
   OR code LIKE 'user.%';
