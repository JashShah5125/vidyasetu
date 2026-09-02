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

        // MRR Trend
        const [allActive] = await db.query(`
            SELECT start_date, subscription_final_price
            FROM tenants
            WHERE tenant_type != 'master' AND status = 'active'
        `);

        const currentYear = new Date().getFullYear();
        let mrr_trend = Array(12).fill(0);
        let base_mrr = 0;
        
        allActive.forEach(t => {
            const date = new Date(t.start_date || t.created_at);
            const price = Number(t.subscription_final_price) || 0;
            if (date.getFullYear() < currentYear) {
                base_mrr += price;
            } else if (date.getFullYear() === currentYear) {
                mrr_trend[date.getMonth()] += price;
            }
        });

        let runningTotal = base_mrr;
        const trend = mrr_trend.map((added, index) => {
            runningTotal += added;
            const monthStr = new Date(currentYear, index, 1).toLocaleString('en-US', { month: 'short' });
            return {
                m: monthStr,
                val: '₹' + (runningTotal / 100000).toFixed(2) + 'L',
                raw_val: runningTotal,
                isCurrent: index === new Date().getMonth()
            };
        });
        
        // Calculate percentages for height (max 100%)
        const maxMrr = Math.max(...trend.map(t => t.raw_val)) || 1;
        const trendWithHeights = trend.map(t => ({
            ...t,
            h: Math.round((t.raw_val / maxMrr) * 85) + '%' // Max height 85% to fit tooltip
        }));

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
                plan_distribution: planAdoption,
                mrr_trend: trendWithHeights
            }
        });
    } catch (error) {
        console.error('Error fetching SaaS dashboard stats:', error);
        res.status(500).json({ status: 'error', message: 'Failed to load dashboard stats' });
    }
});

/**
 * GET /api/admin/dashboard/saas-revenue
 * Returns revenue KPIs + monthly revenue trend, sourced entirely from saas_invoices.
 * Trend = total_amount of paid invoices grouped by month of payment_date.
 */
router.get('/saas-revenue', async (req, res) => {
    try {
        // Monthly paid revenue trend (group by month over all paid invoices)
        const [paidByMonth] = await db.query(`
            SELECT
                YEAR(i.payment_date) AS yr,
                MONTH(i.payment_date) AS mo,
                SUM(i.total_amount) AS rev
            FROM saas_invoices i
            WHERE i.status = 'paid' AND i.payment_date IS NOT NULL
            GROUP BY YEAR(i.payment_date), MONTH(i.payment_date)
        `);

        const currentYear = new Date().getFullYear();
        let monthTotals = Array(12).fill(0);
        let baseTotal = 0;

        paidByMonth.forEach(row => {
            const yr = Number(row.yr);
            const mo = Number(row.mo) - 1; // 0-based
            const rev = Number(row.rev) || 0;
            if (yr < currentYear) {
                baseTotal += rev;
            } else if (yr === currentYear && mo >= 0 && mo < 12) {
                monthTotals[mo] += rev;
            }
        });

        // Build a running cumulative trend for the current year
        let runningTotal = baseTotal;
        const trend = monthTotals.map((added, index) => {
            runningTotal += added;
            const monthStr = new Date(currentYear, index, 1).toLocaleString('en-US', { month: 'short' });
            const roundedTotal = Math.round(runningTotal);
            return {
                m: monthStr,
                val: '₹' + roundedTotal.toLocaleString('en-IN'),
                raw_val: roundedTotal,
                isCurrent: index === new Date().getMonth()
            };
        });

        // raw_val is already a plain Number from Math.round — no strings, no formatting

        // KPI aggregates from the same table
        const [[summary]] = await db.query(`
            SELECT
                SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) AS total_revenue,
                SUM(CASE WHEN status IN ('unpaid', 'overdue') THEN total_amount ELSE 0 END) AS outstanding,
                SUM(CASE WHEN status = 'paid' THEN subtotal ELSE 0 END) AS net_revenue
            FROM saas_invoices
        `);

        res.status(200).json({
            status: 'success',
            data: {
                total_revenue: Number(summary.total_revenue) || 0,
                net_revenue: Number(summary.net_revenue) || 0,
                outstanding: Number(summary.outstanding) || 0,
                revenue_trend: trend
            }
        });
    } catch (error) {
        console.error('Error fetching SaaS revenue stats:', error);
        res.status(500).json({ status: 'error', message: 'Failed to load revenue stats' });
    }
});

module.exports = router;
