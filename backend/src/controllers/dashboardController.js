const db = require('../config/db');
const branchModel = require('../models/branchModel');
const dashboardService = require('../services/dashboardService');

/**
 * Resolve tenantId from request context, respecting SaaS admin impersonation
 */
const resolveTenant = (req) => {
    let tenantId = req.user?.tenantId;
    if (req.user?.isSaasAdmin && req.query.tenant_id) {
        tenantId = Number(req.query.tenant_id);
    }
    if (!tenantId || tenantId === 1) {
        tenantId = req.query.tenant_id ? Number(req.query.tenant_id) : 2;
    }
    return tenantId;
};

/**
 * GET /api/admin/dashboard/institute
 * Executive dashboard for Institute Admin (can optionally filter by branch)
 */
const getInstituteDashboard = async (req, res) => {
    try {
        const tenantId = resolveTenant(req);

        let branchId = null;
        if (req.query.branchId && req.query.branchId !== 'all') {
            branchId = Number(req.query.branchId);
        }
        if (req.user?.role === 'branch-admin' && req.user?.primaryBranchId) {
            branchId = req.user.primaryBranchId;
        }

        const data = await dashboardService.getDashboard({
            tenantId,
            branchId,
            filters: req.query
        });

        res.status(200).json({ status: 'success', data });
    } catch (error) {
        console.error('Error fetching institute dashboard:', error);
        res.status(500).json({ status: 'error', message: 'Failed to load institute dashboard data' });
    }
};

/**
 * GET /api/admin/dashboard/branch (or /api/branch/dashboard)
 * Branch-scoped executive dashboard for Branch Admin (branchId resolved strictly from user context)
 */
const getBranchDashboard = async (req, res) => {
    try {
        const tenantId = resolveTenant(req);

        // Resolve branchId securely from user credentials/assignments
        let branchId = req.user?.primaryBranchId || req.user?.branchId || req.user?.primary_branch_id || req.user?.branch;

        if (!branchId) {
            const userBranchIds = await branchModel.getUserBranchIds(tenantId, req.user?.userId || req.user?.id);
            if (userBranchIds && userBranchIds.length > 0) {
                branchId = userBranchIds[0];
            }
        }

        if (!branchId) {
            return res.status(403).json({
                status: 'error',
                message: 'Branch is not assigned to this user'
            });
        }

        const data = await dashboardService.getDashboard({
            tenantId,
            branchId: Number(branchId),
            filters: req.query
        });

        res.status(200).json({ status: 'success', data });
    } catch (error) {
        console.error('Error fetching branch dashboard:', error);
        res.status(500).json({ status: 'error', message: 'Failed to load branch dashboard data' });
    }
};

/**
 * GET /api/admin/dashboard/institute-stats
 */
const getInstituteStats = async (req, res) => {
    try {
        const tenantId = resolveTenant(req);
        const branchId = req.query.branch_id && req.query.branch_id !== 'all' ? Number(req.query.branch_id) : null;

        // 1. Student stats
        let studentQuery = `
            SELECT
                COUNT(*) AS total_students,
                SUM(CASE WHEN status = 1 OR status = '1' OR status = 'active' OR status = 'Active Student' THEN 1 ELSE 0 END) AS active_students,
                SUM(CASE WHEN status = 0 OR status = '0' OR status = 'inactive' THEN 1 ELSE 0 END) AS inactive_students
            FROM students
            WHERE tenant_id = ? AND deleted_at IS NULL
        `;
        const studentParams = [tenantId];
        if (branchId) {
            studentQuery += ` AND primary_branch_id = ?`;
            studentParams.push(branchId);
        }
        const [[studentStats]] = await db.query(studentQuery, studentParams);

        // 2. Staff stats
        let staffQuery = `
            SELECT
                COUNT(*) AS total_staff,
                SUM(CASE WHEN status = 'active' OR status = 'Active' OR status = 1 OR status = '1' THEN 1 ELSE 0 END) AS active_staff,
                SUM(CASE WHEN LOWER(employee_type) LIKE '%teach%' THEN 1 ELSE 0 END) AS teaching_staff,
                SUM(CASE WHEN LOWER(employee_type) NOT LIKE '%teach%' THEN 1 ELSE 0 END) AS non_teaching_staff
            FROM staff_profiles
            WHERE tenant_id = ? AND deleted_at IS NULL
        `;
        const staffParams = [tenantId];
        if (branchId) {
            staffQuery += ` AND JSON_CONTAINS(branch_ids, CAST(? AS CHAR))`;
            staffParams.push(branchId);
        }
        const [[staffStats]] = await db.query(staffQuery, staffParams);

        // 3. Branch stats
        let branchQuery = `
            SELECT
                COUNT(*) AS total_branches,
                SUM(CASE WHEN status = 'active' OR status = 'Active' OR status = 1 OR status = '1' THEN 1 ELSE 0 END) AS active_branches
            FROM branches
            WHERE tenant_id = ? AND deleted_at IS NULL
        `;
        const branchParams = [tenantId];
        if (branchId) {
            branchQuery += ` AND id = ?`;
            branchParams.push(branchId);
        }
        const [[branchStats]] = await db.query(branchQuery, branchParams);

        // 4. Course stats
        const [[courseStats]] = await db.query(`
            SELECT
                COUNT(*) AS total_courses,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_courses
            FROM courses
            WHERE tenant_id = ? AND deleted_at IS NULL
        `, [tenantId]);

        // 5. Branches summary list
        const [branchesSummary] = await db.query(`
            SELECT 
                b.id, b.name, b.code, b.city, b.capacity, b.status,
                (SELECT COUNT(*) FROM students s WHERE s.primary_branch_id = b.id AND s.deleted_at IS NULL) as student_count
            FROM branches b
            WHERE b.tenant_id = ? AND b.deleted_at IS NULL
            ORDER BY b.name ASC
        `, [tenantId]);

        res.status(200).json({
            status: 'success',
            data: {
                total_students: Number(studentStats?.total_students) || 0,
                active_students: Number(studentStats?.active_students) || 0,
                inactive_students: Number(studentStats?.inactive_students) || 0,
                total_staff: Number(staffStats?.total_staff) || 0,
                active_staff: Number(staffStats?.active_staff) || 0,
                teaching_staff: Number(staffStats?.teaching_staff) || 0,
                non_teaching_staff: Number(staffStats?.non_teaching_staff) || 0,
                total_branches: Number(branchStats?.total_branches) || 0,
                active_branches: Number(branchStats?.active_branches) || 0,
                total_courses: Number(courseStats?.total_courses) || 0,
                active_courses: Number(courseStats?.active_courses) || 0,
                branches_summary: branchesSummary || []
            }
        });
    } catch (error) {
        console.error('Error fetching institute dashboard stats:', error);
        res.status(500).json({ status: 'error', message: 'Failed to load institute dashboard stats' });
    }
};

/**
 * GET /api/admin/dashboard/saas-stats
 */
const getSaasStats = async (req, res) => {
    try {
        const timeRange = req.query.preset || req.query.time_range || 'monthly';
        let intervalDays = 30;
        if (timeRange === 'daily' || timeRange === 'day') intervalDays = 1;
        else if (timeRange === 'weekly' || timeRange === 'week') intervalDays = 7;
        else if (timeRange === 'all') intervalDays = 36500;

        const [[tenantStats]] = await db.query(`
            SELECT
                COUNT(*) AS total_tenants,
                SUM(status = 1) AS active_tenants,
                SUM(status = 0) AS suspended_tenants,
                SUM(status = 2) AS draft_tenants,
                SUM(end_date IS NOT NULL AND end_date < CURRENT_DATE AND status = 1) AS expired_tenants,
                SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) THEN 1 ELSE 0 END) AS new_tenants
            FROM tenants
            WHERE tenant_type != 'master' AND id != 1 AND status != 3
        `, [intervalDays]);

        const [statusRows] = await db.query(`
            SELECT status, COUNT(*) AS count
            FROM tenants
            WHERE tenant_type != 'master' AND id != 1 AND status != 3
            GROUP BY status
        `);

        const expiringLimit = req.query.expiring_limit === 'all' ? 1000 : (Number(req.query.expiring_limit) || 10);

        const [[expiringCountRow]] = await db.query(`
            SELECT COUNT(*) AS count
            FROM tenants
            WHERE tenant_type != 'master' AND id != 1 AND status != 3
              AND (
                (end_date IS NOT NULL AND DATEDIFF(end_date, CURRENT_DATE) <= 30)
                OR status IN (0, 2)
              )
        `);
        const expiringRenewalsCount = Number(expiringCountRow?.count) || 0;

        const [expiringTenants] = await db.query(`
            SELECT t.id, t.name, t.slug, t.status, t.end_date, t.start_date,
                   DATEDIFF(t.end_date, CURRENT_DATE) AS days_left,
                   sp.name AS plan_name, u.email AS admin_email, t.owner_name
            FROM tenants t
            LEFT JOIN subscription_plans sp ON t.plan_id = sp.id
            LEFT JOIN users u ON t.primary_admin_user_id = u.id
            WHERE t.tenant_type != 'master' AND t.id != 1 AND t.status != 3
            ORDER BY
                CASE
                    WHEN t.end_date IS NOT NULL AND DATEDIFF(t.end_date, CURRENT_DATE) < 0 THEN 1
                    WHEN t.end_date IS NOT NULL AND DATEDIFF(t.end_date, CURRENT_DATE) <= 30 THEN 2
                    WHEN t.status IN (0, 2) THEN 3
                    WHEN t.end_date IS NOT NULL THEN 4
                    ELSE 5
                END,
                t.end_date ASC
            LIMIT ?
        `, [expiringLimit]);

        const [[approvalStats]] = await db.query(`
            SELECT COUNT(*) AS pending_approvals
            FROM approval_requests
            WHERE status = 'pending'
        `);

        const [[planStats]] = await db.query(`
            SELECT COUNT(*) AS total_plans
            FROM subscription_plans
            WHERE status = 'active'
        `);

        const [planAdoption] = await db.query(`
            SELECT sp.name as plan, COUNT(t.id) as count
            FROM tenants t
            JOIN subscription_plans sp ON t.plan_id = sp.id
            WHERE t.tenant_type != 'master' AND t.id != 1 AND t.status != 3
            GROUP BY sp.name
            ORDER BY count DESC
        `);

        const [[mrrStats]] = await db.query(`
            SELECT SUM(subscription_final_price) as total_mrr
            FROM tenants
            WHERE tenant_type != 'master' AND id != 1 AND status = 1
        `);

        const [allActive] = await db.query(`
            SELECT start_date, subscription_final_price
            FROM tenants
            WHERE tenant_type != 'master' AND id != 1 AND status = 1
        `);

        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
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
            const isFuture = index > currentMonth;
            if (isFuture) {
                const monthStr = new Date(currentYear, index, 1).toLocaleString('en-US', { month: 'short' });
                return {
                    m: monthStr,
                    val: '₹0',
                    raw_val: 0,
                    isCurrent: false,
                    isFuture: true
                };
            }
            runningTotal += added;
            const monthStr = new Date(currentYear, index, 1).toLocaleString('en-US', { month: 'short' });
            return {
                m: monthStr,
                val: '₹' + (runningTotal / 100000).toFixed(2) + 'L',
                raw_val: runningTotal,
                isCurrent: index === currentMonth,
                isFuture: false
            };
        });
        
        const maxMrr = Math.max(...trend.map(t => t.raw_val)) || 1;
        const trendWithHeights = trend.map(t => ({
            ...t,
            h: Math.round((t.raw_val / maxMrr) * 85) + '%'
        }));

        const [[userStats]] = await db.query(`
            SELECT
                COUNT(*) AS total_users,
                SUM(CASE WHEN (status = 'active' OR status IS NULL) AND app_access_suspended != 1 THEN 1 ELSE 0 END) AS active_users,
                SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS inactive_users,
                SUM(CASE WHEN status = 'suspended' OR app_access_suspended = 1 THEN 1 ELSE 0 END) AS suspended_users,
                SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) AS expired_users,
                SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) THEN 1 ELSE 0 END) AS new_users
            FROM users
            WHERE deleted_at IS NULL
        `, [intervalDays]);

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
                expiring_renewals_count: expiringRenewalsCount,
                new_tenants: Number(tenantStats.new_tenants) || 0,
                status_distribution: statusRows,
                recently_registered: expiringTenants,
                expiring_tenants: expiringTenants,
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
                mrr_trend: trendWithHeights,
                time_range: timeRange,
                interval_days: intervalDays
            }
        });
    } catch (error) {
        console.error('Error fetching SaaS dashboard stats:', error);
        res.status(500).json({ status: 'error', message: 'Failed to load dashboard stats' });
    }
};

/**
 * GET /api/admin/dashboard/academic-years
 */
const getAcademicYears = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT DISTINCT name, YEAR(start_date) as start_year, YEAR(end_date) as end_year
            FROM academic_years
            WHERE deleted_at IS NULL
            ORDER BY start_year DESC
        `);

        const years = rows.map((r, idx) => ({
            id: idx + 1,
            name: r.name,
            start_year: Number(r.start_year),
            end_year: Number(r.end_year),
            value: String(r.start_year || r.name)
        }));

        res.status(200).json({
            status: 'success',
            data: years
        });
    } catch (error) {
        console.error('Error fetching academic years:', error);
        res.status(500).json({ status: 'error', message: 'Failed to load academic years' });
    }
};

const getMySQLYearWeek = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}${String(weekNo).padStart(2, '0')}`;
};

/**
 * GET /api/admin/dashboard/saas-revenue
 */
const getSaasRevenue = async (req, res) => {
    try {
        const timeRange = req.query.preset || req.query.time_range || 'monthly';
        const selectedYear = (req.query.year && req.query.year !== 'all') ? Number(req.query.year) : new Date().getFullYear();
        const selectedMonth = (req.query.month && req.query.month !== 'all') ? Number(req.query.month) : null;

        // 1. Daily breakdown: Past 7 days
        if (timeRange === 'daily' || timeRange === 'day') {
            const [rows] = await db.query(`
                SELECT
                    DATE(COALESCE(i.payment_date, i.billing_period_start, DATE(i.created_at))) AS day_date,
                    SUM(i.total_amount) AS rev
                FROM saas_invoices i
                WHERE i.status = 'paid' AND i.deleted_at IS NULL
                  AND DATE(COALESCE(i.payment_date, i.billing_period_start, DATE(i.created_at))) >= DATE_SUB(CURRENT_DATE, INTERVAL 6 DAY)
                GROUP BY DATE(COALESCE(i.payment_date, i.billing_period_start, DATE(i.created_at)))
            `);
            const revByDate = {};
            rows.forEach(r => {
                if (r.day_date) {
                    const d = new Date(r.day_date);
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    const dStr = `${y}-${m}-${day}`;
                    revByDate[dStr] = Number(r.rev) || 0;
                }
            });

            const trend = [];
            const today = new Date();
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(today.getDate() - i);
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const dStr = `${y}-${m}-${day}`;
                const dayName = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
                const rev = Math.round(revByDate[dStr] || 0);
                trend.push({
                    m: dayName,
                    val: '₹' + rev.toLocaleString('en-IN'),
                    raw_val: rev,
                    isCurrent: i === 0,
                    isFuture: false
                });
            }
            return res.status(200).json({ status: 'success', data: { revenue_trend: trend } });
        }

        // 2. Weekly breakdown: Past 8 weeks
        if (timeRange === 'weekly' || timeRange === 'week') {
            const [rows] = await db.query(`
                SELECT
                    YEARWEEK(COALESCE(i.payment_date, i.billing_period_start, DATE(i.created_at)), 1) AS yw,
                    MIN(DATE(COALESCE(i.payment_date, i.billing_period_start, DATE(i.created_at)))) AS week_start,
                    SUM(i.total_amount) AS rev
                FROM saas_invoices i
                WHERE i.status = 'paid' AND i.deleted_at IS NULL
                  AND DATE(COALESCE(i.payment_date, i.billing_period_start, DATE(i.created_at))) >= DATE_SUB(CURRENT_DATE, INTERVAL 7 WEEK)
                GROUP BY YEARWEEK(COALESCE(i.payment_date, i.billing_period_start, DATE(i.created_at)), 1)
            `);
            const revByWeek = {};
            rows.forEach(r => {
                revByWeek[String(r.yw)] = Number(r.rev) || 0;
            });

            const trend = [];
            const today = new Date();
            for (let i = 7; i >= 0; i--) {
                const d = new Date();
                d.setDate(today.getDate() - (i * 7));
                const weekLabel = `Wk ${8 - i} (${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`;
                const yw = getMySQLYearWeek(d);
                const rev = Math.round(revByWeek[yw] || 0);
                trend.push({
                    m: weekLabel,
                    val: '₹' + rev.toLocaleString('en-IN'),
                    raw_val: rev,
                    isCurrent: i === 0,
                    isFuture: false
                });
            }
            return res.status(200).json({ status: 'success', data: { revenue_trend: trend } });
        }

        // 3. Monthly breakdown (Default or selected year/month)
        const [paidByMonth] = await db.query(`
            SELECT
                YEAR(COALESCE(i.payment_date, i.created_at)) AS yr,
                MONTH(COALESCE(i.payment_date, i.created_at)) AS mo,
                SUM(i.total_amount) AS rev
            FROM saas_invoices i
            WHERE i.status = 'paid' AND i.deleted_at IS NULL
            GROUP BY YEAR(COALESCE(i.payment_date, i.created_at)), MONTH(COALESCE(i.payment_date, i.created_at))
        `);

        let monthTotals = Array(12).fill(0);
        let baseTotal = 0;

        paidByMonth.forEach(row => {
            const yr = Number(row.yr);
            const mo = Number(row.mo) - 1;
            const rev = Number(row.rev) || 0;
            if (yr < selectedYear) {
                baseTotal += rev;
            } else if (yr === selectedYear && mo >= 0 && mo < 12) {
                monthTotals[mo] += rev;
            }
        });

        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        let runningTotal = baseTotal;
        const trend = monthTotals.map((added, index) => {
            const monthStr = new Date(selectedYear, index, 1).toLocaleString('en-US', { month: 'short' });

            // 1. Specific single month selected -> Show value ONLY on that month
            if (selectedMonth !== null) {
                const isSelected = (index + 1) === selectedMonth;
                const isFuture = selectedYear > currentYear || (selectedYear === currentYear && index > currentMonth);
                const val = (!isFuture && isSelected) ? Math.round(added) : 0;
                return {
                    m: monthStr,
                    val: '₹' + val.toLocaleString('en-IN'),
                    raw_val: val,
                    isCurrent: selectedYear === currentYear && index === currentMonth,
                    isFuture: isFuture || !isSelected
                };
            }

            // 2. All months selected -> Cumulative growth up to current month
            const isFuture = selectedYear > currentYear || (selectedYear === currentYear && index > currentMonth);
            if (isFuture) {
                return {
                    m: monthStr,
                    val: '₹0',
                    raw_val: 0,
                    isCurrent: false,
                    isFuture: true
                };
            }
            runningTotal += added;
            const roundedTotal = Math.round(runningTotal);
            return {
                m: monthStr,
                val: '₹' + roundedTotal.toLocaleString('en-IN'),
                raw_val: roundedTotal,
                isCurrent: selectedYear === currentYear && index === currentMonth,
                isFuture: false
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
};

module.exports = {
    getInstituteDashboard,
    getBranchDashboard,
    getInstituteStats,
    getSaasStats,
    getAcademicYears,
    getSaasRevenue
};
