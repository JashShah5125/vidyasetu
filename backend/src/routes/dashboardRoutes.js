const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth, requireSaasAdmin } = require('../middleware/authMiddleware');

router.use(requireAuth);
router.use(requireSaasAdmin);

/**
 * GET /api/admin/dashboard/saas-stats
 * Returns key metrics for the SaaS Admin dashboard KPI cards.
 */
router.get('/saas-stats', async (req, res) => {
    try {
        const [[tenantStats]] = await db.query(`
            SELECT
                COUNT(*) AS total_tenants,
                SUM(status = 'active') AS active_tenants,
                SUM(status = 'suspended') AS suspended_tenants,
                SUM(status = 'draft') AS draft_tenants
            FROM tenants
            WHERE tenant_type != 'master'
        `);

        const [[approvalStats]] = await db.query(`
            SELECT COUNT(*) AS pending_approvals
            FROM approval_requests
            WHERE status = 'pending'
        `);

        // Plan Analytics
        const [[planStats]] = await db.query(`
            SELECT COUNT(*) AS total_plans
            FROM subscription_plans
            WHERE status = 'active'
        `);

        const [planAdoption] = await db.query(`
            SELECT sp.name as plan, COUNT(t.id) as count
            FROM tenants t
            JOIN subscription_plans sp ON t.plan_id = sp.id
            WHERE t.tenant_type != 'master'
            GROUP BY sp.name
            ORDER BY count DESC
        `);

        // MRR Proxy
        const [[mrrStats]] = await db.query(`
            SELECT SUM(subscription_final_price) as total_mrr
            FROM tenants
            WHERE tenant_type != 'master' AND status = 'active'
        `);

        res.status(200).json({
            status: 'success',
            data: {
                total_tenants: Number(tenantStats.total_tenants) || 0,
                active_tenants: Number(tenantStats.active_tenants) || 0,
                suspended_tenants: Number(tenantStats.suspended_tenants) || 0,
                draft_tenants: Number(tenantStats.draft_tenants) || 0,
                pending_approvals: Number(approvalStats.pending_approvals) || 0,
                total_plans: Number(planStats.total_plans) || 0,
                total_mrr: Number(mrrStats.total_mrr) || 0,
                plan_distribution: planAdoption
            }
        });
    } catch (error) {
        console.error('Error fetching SaaS dashboard stats:', error);
        res.status(500).json({ status: 'error', message: 'Failed to load dashboard stats' });
    }
});

module.exports = router;
