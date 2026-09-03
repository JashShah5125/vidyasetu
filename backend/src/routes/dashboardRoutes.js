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
                SUM(status = 'draft') AS draft_tenants,
                SUM(status = 'expired' OR (end_date IS NOT NULL AND end_date < CURRENT_DATE AND status NOT IN ('suspended', 'draft'))) AS expired_tenants
            FROM tenants
            WHERE tenant_type != 'master' AND id != 1
        `);

        const [statusRows] = await db.query(`
            SELECT status, COUNT(*) AS count
            FROM tenants
            WHERE tenant_type != 'master' AND id != 1
            GROUP BY status
        `);

        const expiringLimit = req.query.expiring_limit === 'all' ? 1000 : (Number(req.query.expiring_limit) || 10);

        const [expiringTenants] = await db.query(`
            SELECT t.id, t.name, t.slug, t.status, t.end_date, t.start_date,
                   DATEDIFF(t.end_date, CURRENT_DATE) AS days_left,
                   sp.name AS plan_name, u.email AS admin_email, t.owner_name
            FROM tenants t
            LEFT JOIN subscription_plans sp ON t.plan_id = sp.id
            LEFT JOIN users u ON t.primary_admin_user_id = u.id
            WHERE t.tenant_type != 'master' AND t.id != 1
            ORDER BY
                CASE
                    WHEN t.end_date IS NULL THEN 3
                    WHEN t.end_date < CURRENT_DATE THEN 1
                    ELSE 2
                END,
                t.end_date ASC
            LIMIT ?
        `, [expiringLimit]);

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
            WHERE t.tenant_type != 'master' AND t.id != 1
            GROUP BY sp.name
            ORDER BY count DESC
        `);

        // MRR Proxy
        const [[mrrStats]] = await db.query(`
            SELECT SUM(subscription_final_price) as total_mrr
            FROM tenants
            WHERE tenant_type != 'master' AND id != 1 AND status = 'active'
        `);

        // MRR Trend
        const [allActive] = await db.query(`
            SELECT start_date, subscription_final_price
            FROM tenants
            WHERE tenant_type != 'master' AND id != 1 AND status = 'active'
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

        // User Metrics across all tenants
        const [[userStats]] = await db.query(`
            SELECT
                COUNT(*) AS total_users,
                SUM(CASE WHEN (status = 'active' OR status IS NULL) AND app_access_suspended != 1 THEN 1 ELSE 0 END) AS active_users,
                SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS inactive_users,
                SUM(CASE WHEN status = 'suspended' OR app_access_suspended = 1 THEN 1 ELSE 0 END) AS suspended_users,
                SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) AS expired_users,
                SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS new_users
            FROM users
            WHERE deleted_at IS NULL
        `);

        const [userRoleDistribution] = await db.query(`
            SELECT user_type, COUNT(*) AS count
            FROM users
            WHERE deleted_at IS NULL
            GROUP BY user_type
            ORDER BY count DESC
        `);

        const [recentlyRegisteredUsers] = await db.query(`
            SELECT u.id, u.name, u.email, u.user_type, u.status, u.created_at, t.name AS tenant_name
            FROM users u
            LEFT JOIN tenants t ON u.tenant_id = t.id
            WHERE u.deleted_at IS NULL
            ORDER BY u.created_at DESC
            LIMIT 5
        `);

        res.status(200).json({
            status: 'success',
            data: {
                total_tenants: Number(tenantStats.total_tenants) || 0,
                active_tenants: Number(tenantStats.active_tenants) || 0,
                suspended_tenants: Number(tenantStats.suspended_tenants) || 0,
                draft_tenants: Number(tenantStats.draft_tenants) || 0,
                expired_tenants: Number(tenantStats.expired_tenants) || 0,
                status_distribution: statusRows,
                recently_registered: expiringTenants,
                expiring_tenants: expiringTenants,
                // User Analytics
                user_metrics: {
                    total_users: Number(userStats.total_users) || 0,
                    active_users: Number(userStats.active_users) || 0,
                    inactive_users: Number(userStats.inactive_users) || 0,
                    suspended_users: Number(userStats.suspended_users) || 0,
                    expired_users: Number(userStats.expired_users) || 0,
                    new_users: Number(userStats.new_users) || 0,
                },
                user_role_distribution: userRoleDistribution,
                recently_registered_users: recentlyRegisteredUsers,
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
        const selectedYear = (req.query.year && req.query.year !== 'all') ? Number(req.query.year) : new Date().getFullYear();
        const selectedMonth = (req.query.month && req.query.month !== 'all') ? Number(req.query.month) : null;

        // Monthly paid revenue trend (group by month over all paid invoices)
        const [paidByMonth] = await db.query(`
            SELECT
                YEAR(COALESCE(i.payment_date, i.created_at)) AS yr,
                MONTH(COALESCE(i.payment_date, i.created_at)) AS mo,
                SUM(i.total_amount) AS rev
            FROM saas_invoices i
            WHERE i.status = 'paid'
            GROUP BY YEAR(COALESCE(i.payment_date, i.created_at)), MONTH(COALESCE(i.payment_date, i.created_at))
        `);

        let monthTotals = Array(12).fill(0);
        let baseTotal = 0;

        paidByMonth.forEach(row => {
            const yr = Number(row.yr);
            const mo = Number(row.mo) - 1; // 0-based
            const rev = Number(row.rev) || 0;
            if (yr < selectedYear) {
                baseTotal += rev;
            } else if (yr === selectedYear && mo >= 0 && mo < 12) {
                if (selectedMonth === null || (mo + 1) === selectedMonth) {
                    monthTotals[mo] += rev;
                }
            }
        });

        // Build a running cumulative trend for the selected year
        let runningTotal = baseTotal;
        const trend = monthTotals.map((added, index) => {
            runningTotal += added;
            const monthStr = new Date(selectedYear, index, 1).toLocaleString('en-US', { month: 'short' });
            const roundedTotal = Math.round(runningTotal);
            return {
                m: monthStr,
                val: '₹' + roundedTotal.toLocaleString('en-IN'),
                raw_val: roundedTotal,
                isCurrent: selectedYear === new Date().getFullYear() && index === new Date().getMonth()
            };
        });

        res.status(200).json({
            status: 'success',
            data: {
                revenue_trend: trend
            }
        });
    } catch (error) {
        console.error('Error fetching SaaS revenue stats:', error);
        res.status(500).json({ status: 'error', message: 'Failed to load revenue stats' });
    }
});

module.exports = router;
