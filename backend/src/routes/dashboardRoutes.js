const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth, requireSaasAdmin } = require('../middleware/authMiddleware');

router.use(requireAuth);

// ─────────────────────────────────────────────────────────────────────────────
// Helper utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve tenantId from the request, honouring SaaS-admin override.
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
 * Derive date-range from query params.
 * Defaults: from = first day of current month, to = today.
 */
const resolveDateRange = (query) => {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const to = query.to ? query.to : isoDate(today);
    let from = query.from;
    if (!from) {
        const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        from = isoDate(firstOfMonth);
    }
    return { from, to };
};

/**
 * Auto-derive granularity from date range span.
 * <= 7 days → 'day', <= 90 days → 'week', else → 'month'
 */
const resolveGranularity = (from, to) => {
    const diffMs = new Date(to) - new Date(from);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays <= 7) return 'day';
    if (diffDays <= 90) return 'week';
    return 'month';
};

/**
 * Format a date label depending on granularity.
 */
const formatLabel = (dateStr, granularity) => {
    const d = new Date(dateStr + 'T00:00:00');
    if (granularity === 'day') {
        return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
    }
    if (granularity === 'week') {
        return `W${pad(Math.ceil(d.getDate() / 7))} ${d.toLocaleDateString('en-IN', { month: 'short' })}`;
    }
    return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
};
const pad = (n) => String(n).padStart(2, '0');

/**
 * Generate a complete chronological date series for [fromDateStr, toDateStr].
 * Ensures that every day (e.g. Mon through Sun for a week) is represented.
 */
const generateDateSeries = (fromDateStr, toDateStr) => {
    const dates = [];
    const fromD = new Date(fromDateStr + 'T00:00:00');
    const toD = new Date(toDateStr + 'T00:00:00');
    const dayDiff = Math.round((toD - fromD) / (1000 * 60 * 60 * 24));
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const cur = new Date(fromD);
    while (cur <= toD) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        const weekday = weekdays[cur.getDay()];
        
        // For a weekly period (<= 7 days), use 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
        // For a monthly period, use '1', '2' or '15 Sep'
        const label = dayDiff <= 7 ? weekday : `${cur.getDate()} ${cur.toLocaleString('en-IN', { month: 'short' })}`;

        dates.push({
            dateStr,
            label,
            dayOfWeek: cur.getDay()
        });
        cur.setDate(cur.getDate() + 1);
    }
    return dates;
};

/**
 * Build branch filter SQL fragment for a column reference.
 */
const branchFilter = (column, branchId) =>
    branchId ? ` AND ${column} = ${Number(branchId)}` : '';

/**
 * Generate 12 months of admissions trend data (Jan to Dec).
 */
const mockAdmissionsTrend = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((month) => ({
        label: month,
        count: Math.floor(Math.random() * 25) + 15,
        isMock: true
    }));
};

/**
 * Hardcoded expense breakdown (real data hookup deferred).
 */
const mockExpenseBreakdown = (totalExpenses) => {
    const categories = [
        { category: 'Staff Salaries', pct: 52 },
        { category: 'Rent & Utilities', pct: 18 },
        { category: 'Marketing', pct: 10 },
        { category: 'Stationery & Supplies', pct: 8 },
        { category: 'Maintenance', pct: 7 },
        { category: 'Other', pct: 5 }
    ];
    return categories.map(c => ({
        ...c,
        amount: Math.round((totalExpenses * c.pct) / 100),
        isMock: true
    }));
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/dashboard/institute
// Single consolidated endpoint for Institute Admin executive dashboard.
// All queries run in parallel via Promise.all.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/institute', async (req, res) => {
    try {
        const tenantId = resolveTenant(req);
        const { from, to } = resolveDateRange(req.query);
        const granularity = resolveGranularity(from, to);

        // Branch admin is locked to their own branch
        let branchId = null;
        if (req.query.branchId && req.query.branchId !== 'all') {
            branchId = Number(req.query.branchId);
        }
        if (req.user?.role === 'branch-admin' && req.user?.primaryBranchId) {
            branchId = req.user.primaryBranchId;
        }

        const academicYearId = req.query.academicYearId && req.query.academicYearId !== 'all'
            ? Number(req.query.academicYearId) : null;
        const courseId = req.query.courseId && req.query.courseId !== 'all' ? Number(req.query.courseId) : null;
        const programId = req.query.programId && req.query.programId !== 'all' ? Number(req.query.programId) : null;
        const levelId = req.query.levelId && req.query.levelId !== 'all' ? Number(req.query.levelId) : null;
        const batchId = req.query.batchId && req.query.batchId !== 'all' ? Number(req.query.batchId) : null;

        // ── Fetch filter metadata ─────────────────────────────────────────
        const [
            [branchesRows],
            [academicYearsRows],
            [coursesRows],
            [programsRows],
            [levelsRows],
            [batchesRows]
        ] = await Promise.all([
            db.query(`SELECT id, name, code FROM branches WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name ASC`, [tenantId]),
            db.query(
                `SELECT MIN(id) AS id, name, status
                 FROM academic_years 
                 WHERE tenant_id = ? AND deleted_at IS NULL 
                 GROUP BY name, status 
                 ORDER BY MIN(start_date) DESC`,
                [tenantId]
            ),
            db.query(`SELECT id, name, code FROM courses WHERE tenant_id = ? AND deleted_at IS NULL AND is_active = 1 ORDER BY name ASC`, [tenantId]),
            db.query(`SELECT id, name, code, course_id FROM programs WHERE tenant_id = ? AND deleted_at IS NULL AND is_active = 1 ORDER BY name ASC`, [tenantId]),
            db.query(`SELECT id, name, code, program_id FROM levels WHERE tenant_id = ? AND deleted_at IS NULL AND is_active = 1 ORDER BY name ASC`, [tenantId]),
            db.query(`SELECT id, name, code, level_id, branch_id, academic_year_id FROM batches WHERE tenant_id = ? AND deleted_at IS NULL AND status = 'active' ORDER BY name ASC`, [tenantId])
        ]);

        // ── Academic filter SQL fragments ──────────────────────────────────
        let studentAcademicSql = '';
        if (batchId) {
            studentAcademicSql = ` AND EXISTS (SELECT 1 FROM student_enrollments se WHERE se.student_id = s.id AND se.batch_id = ${batchId} AND se.deleted_at IS NULL)`;
        } else if (levelId) {
            studentAcademicSql = ` AND EXISTS (SELECT 1 FROM student_enrollments se JOIN batches b ON b.id = se.batch_id WHERE se.student_id = s.id AND b.level_id = ${levelId} AND se.deleted_at IS NULL)`;
        } else if (programId) {
            studentAcademicSql = ` AND EXISTS (SELECT 1 FROM student_enrollments se JOIN batches b ON b.id = se.batch_id JOIN levels lvl ON lvl.id = b.level_id WHERE se.student_id = s.id AND lvl.program_id = ${programId} AND se.deleted_at IS NULL)`;
        } else if (courseId) {
            studentAcademicSql = ` AND EXISTS (SELECT 1 FROM student_enrollments se JOIN batches b ON b.id = se.batch_id JOIN levels lvl ON lvl.id = b.level_id JOIN programs prog ON prog.id = lvl.program_id WHERE se.student_id = s.id AND prog.course_id = ${courseId} AND se.deleted_at IS NULL)`;
        }

        const academicYearSql = academicYearId
            ? ` AND EXISTS (
                SELECT 1 FROM student_enrollments se_ay
                JOIN academic_years ay_filter ON ay_filter.id = se_ay.academic_year_id
                WHERE se_ay.student_id = s.id
                  AND (se_ay.academic_year_id = ${academicYearId} OR ay_filter.name = (SELECT name FROM academic_years WHERE id = ${academicYearId} LIMIT 1))
                  AND se_ay.deleted_at IS NULL
            )`
            : '';

        // ── KPI Queries (all parallel) ────────────────────────────────────
        const branchSql = branchId ? ` AND s.primary_branch_id = ${branchId}` : '';
        const staffBranchSql = branchId
            ? ` AND JSON_CONTAINS(COALESCE(sp.branch_ids, JSON_ARRAY()), CAST('${branchId}' AS JSON))`
            : '';

        const [
            // KPI 1: Active students
            [activeStudentRows],
            // KPI 2: Active staff
            [activeStaffRows],
            // KPI 3: Fee collection in period
            [feeCollectionRows],
            // KPI 3b: Fee collection in previous equivalent period (for % change)
            [feeCollectionPrevRows],
            // KPI 4: Pending fees
            [pendingFeeRows],
            // Attendance: Today's student attendance
            [studentAttendanceTodayRows],
            // Attendance: Student attendance trend (grouped by day/week/month)
            [studentAttendanceTrendRows],
            // Staff attendance: today
            [staffAttendanceTodayRows],
            // Staff attendance: trend
            [staffAttendanceTrendRows],
            // Students by branch
            [studentsByBranchRows],
            // Fee collection trend
            [feeCollectionTrendRows],
            // Fee status (donut)
            [feeStatusRows],
            // Branch collection
            [branchCollectionRows],
            // Branch performance (students + attendance)
            [branchPerfRows],
            // Income: fee collection in period (same as fee collection KPI)
            // Income: other income in period
            [otherIncomeRows],
            // Expense: sum of staff salaries
            [staffSalaryRows],
            // Expense: from income_expense_ledger
            [ledgerExpenseRows],
            // Attention: fee dues count
            [feeDuesRows],
            // Attention: attendance pending (lectures not marked)
            [attendancePendingRows],
            // Attention: open doubts
            [openDoubtsRows],
            // Attention: teacher homework tasks pending (draft)
            [teacherTasksRows],
            // Academic: upcoming exams
            [upcomingExamsRows],
            // Academic: pending assignments
            [pendingAssignmentsRows],
        ] = await Promise.all([
            // 1. Active students
            db.query(
                `SELECT COUNT(*) AS cnt FROM students s
                 WHERE s.tenant_id = ? AND s.deleted_at IS NULL
                   AND (s.status = 1 OR s.status = '1' OR s.status = 'active' OR s.status = 'Active Student')
                   ${branchSql}
                   ${studentAcademicSql}
                   ${academicYearSql}`,
                [tenantId]
            ),
            // 2. Active staff (with teaching/non-teaching breakdown)
            db.query(
                `SELECT
                   COUNT(*) AS total,
                   SUM(CASE WHEN LOWER(sp.employee_type) LIKE '%teach%' THEN 1 ELSE 0 END) AS teaching,
                   SUM(CASE WHEN LOWER(sp.employee_type) NOT LIKE '%teach%' THEN 1 ELSE 0 END) AS non_teaching
                 FROM staff_profiles sp
                 WHERE sp.tenant_id = ? AND sp.deleted_at IS NULL
                   AND (sp.status = 'active' OR sp.status = 'Active' OR sp.status = 1)
                   ${staffBranchSql}`,
                [tenantId]
            ),
            // 3. Fee collection in selected period (sum of paid invoices)
            db.query(
                `SELECT COALESCE(SUM(si.paid_amount), 0) AS amount
                 FROM student_invoices si
                 JOIN students s ON s.id = si.student_id
                 WHERE si.tenant_id = ?
                   AND si.status = 'paid'
                   AND DATE(COALESCE(si.payment_date, si.created_at)) BETWEEN ? AND ?
                   ${branchId ? `AND s.primary_branch_id = ${branchId}` : ''}
                   ${studentAcademicSql}
                   ${academicYearSql}`,
                [tenantId, from, to]
            ),
            // 3b. Previous equivalent period fee collection
            (() => {
                const span = new Date(to) - new Date(from);
                const prevTo = new Date(new Date(from) - 1);
                const prevFrom = new Date(prevTo - span);
                const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                return db.query(
                    `SELECT COALESCE(SUM(si.paid_amount), 0) AS amount
                     FROM student_invoices si
                     JOIN students s ON s.id = si.student_id
                     WHERE si.tenant_id = ?
                       AND si.status = 'paid'
                       AND DATE(COALESCE(si.payment_date, si.created_at)) BETWEEN ? AND ?
                       ${branchId ? `AND s.primary_branch_id = ${branchId}` : ''}
                       ${studentAcademicSql}
                       ${academicYearSql}`,
                    [tenantId, isoDate(prevFrom), isoDate(prevTo)]
                );
            })(),
            // 4. Pending & overdue fees (authoritative calculation via installment plans)
            db.query(
                `SELECT
                   sfa.id,
                   sfa.gross_amount,
                   sfa.total_concession,
                   sfa.net_amount,
                   sfa.down_payment,
                   sfa.installment_count,
                   sfa.installment_amount,
                   sfa.paid_amount,
                   sfa.balance_amount,
                   sfa.status,
                   COALESCE(se.enrolled_date, sfa.created_at, s.created_at) AS start_date
                 FROM student_fee_assignments sfa
                 JOIN student_enrollments se ON se.id = sfa.enrollment_id
                 JOIN students s ON s.id = se.student_id
                 WHERE sfa.tenant_id = ?
                   AND s.deleted_at IS NULL
                   ${branchId ? `AND s.primary_branch_id = ${branchId}` : ''}
                   ${studentAcademicSql}
                   ${academicYearSql}`,
                [tenantId]
            ),
            // 5. Student attendance today
            db.query(
                `SELECT
                   COUNT(DISTINCT ar.student_id) AS present,
                   SUM(CASE WHEN ar.status = 0 THEN 1 ELSE 0 END) AS absent,
                   COUNT(DISTINCT l.id) AS total_lectures
                 FROM lectures l
                 LEFT JOIN attendance_records ar ON ar.lecture_id = l.id AND ar.tenant_id = l.tenant_id
                 WHERE l.tenant_id = ? AND l.attendance_taken = 1
                   AND l.lecture_date = CURDATE() AND l.deleted_at IS NULL
                   ${branchId ? `AND l.branch_id = ${branchId}` : ''}`,
                [tenantId]
            ),
            // 6. Student attendance trend (by lecture date in period)
            db.query(
                `SELECT
                   DATE_FORMAT(l.lecture_date, '%Y-%m-%d') AS period,
                   COUNT(DISTINCT CASE WHEN ar.status IN (1, 2) THEN ar.student_id END) AS attended,
                   COUNT(DISTINCT CASE WHEN ar.status = 0 THEN ar.student_id END) AS absent,
                   COUNT(DISTINCT ar.student_id) AS total_records
                 FROM lectures l
                 LEFT JOIN attendance_records ar ON ar.lecture_id = l.id AND ar.tenant_id = l.tenant_id
                 WHERE l.tenant_id = ? AND l.attendance_taken = 1
                   AND l.lecture_date BETWEEN ? AND ?
                   AND l.deleted_at IS NULL
                   ${branchId ? `AND l.branch_id = ${branchId}` : ''}
                 GROUP BY period
                 ORDER BY period ASC`,
                [tenantId, from, to]
            ),
            // 7. Staff attendance today
            db.query(
                `SELECT
                   COUNT(CASE WHEN sa.status = 1 THEN 1 END) AS present,
                   COUNT(CASE WHEN sa.status = 0 THEN 1 END) AS absent,
                   COUNT(*) AS total
                 FROM staff_attendance sa
                 WHERE sa.tenant_id = ? AND sa.date = CURDATE()
                   ${branchId ? `AND sa.branch_id = ${branchId}` : ''}`,
                [tenantId]
            ),
            // 8. Staff attendance trend (by date in period)
            db.query(
                `SELECT
                   DATE_FORMAT(sa.date, '%Y-%m-%d') AS period,
                   COUNT(CASE WHEN sa.status = 1 THEN 1 END) AS present,
                   COUNT(CASE WHEN sa.status = 0 THEN 1 END) AS absent,
                   COUNT(*) AS total
                 FROM staff_attendance sa
                 WHERE sa.tenant_id = ? AND sa.date BETWEEN ? AND ?
                   ${branchId ? `AND sa.branch_id = ${branchId}` : ''}
                 GROUP BY period
                 ORDER BY period ASC`,
                [tenantId, from, to]
            ),
            // 9. Students by branch
            db.query(
                `SELECT b.id AS branch_id, b.name AS branch_name,
                   COUNT(s.id) AS student_count
                 FROM branches b
                 LEFT JOIN students s ON s.primary_branch_id = b.id
                   AND s.deleted_at IS NULL
                   AND (s.status = 1 OR s.status = '1' OR s.status = 'active' OR s.status = 'Active Student')
                 WHERE b.tenant_id = ? AND b.deleted_at IS NULL
                   ${branchId ? `AND b.id = ${branchId}` : ''}
                 GROUP BY b.id, b.name
                 ORDER BY student_count DESC`,
                [tenantId]
            ),
            // 10. Fee collection trend
            db.query(
                `SELECT
                   DATE_FORMAT(COALESCE(si.payment_date, si.created_at),
                     ${granularity === 'day' ? "'%Y-%m-%d'" : granularity === 'week' ? "'%x-W%v'" : "'%Y-%m'"}) AS period,
                   COALESCE(SUM(si.paid_amount), 0) AS amount
                 FROM student_invoices si
                 JOIN students s ON s.id = si.student_id
                 WHERE si.tenant_id = ?
                   AND si.status = 'paid'
                   AND DATE(COALESCE(si.payment_date, si.created_at)) BETWEEN ? AND ?
                   ${branchId ? `AND s.primary_branch_id = ${branchId}` : ''}
                   ${studentAcademicSql}
                   ${academicYearSql}
                 GROUP BY period
                 ORDER BY period ASC`,
                [tenantId, from, to]
            ),
            // 11. Fee status (donut): count of fee assignments by status
            db.query(
                `SELECT
                   CASE
                     WHEN sfa.status = 'paid' OR sfa.balance_amount = 0 THEN 'paid'
                     WHEN sfa.balance_amount < sfa.net_amount AND sfa.paid_amount > 0 THEN 'partial'
                     ELSE 'unpaid'
                   END AS fee_status,
                   COUNT(*) AS count,
                   COALESCE(SUM(sfa.net_amount), 0) AS total_amount,
                   COALESCE(SUM(sfa.paid_amount), 0) AS paid_amount
                 FROM student_fee_assignments sfa
                 JOIN student_enrollments se ON se.id = sfa.enrollment_id
                 JOIN students s ON s.id = se.student_id
                 WHERE sfa.tenant_id = ?
                   AND s.deleted_at IS NULL
                   ${branchId ? `AND s.primary_branch_id = ${branchId}` : ''}
                   ${studentAcademicSql}
                   ${academicYearSql}
                 GROUP BY fee_status`,
                [tenantId]
            ),
            // 12. Branch collection (fee paid per branch in period)
            db.query(
                `SELECT b.id AS branch_id, b.name AS branch_name,
                   COALESCE(SUM(si.paid_amount), 0) AS amount
                 FROM branches b
                 LEFT JOIN students s ON s.primary_branch_id = b.id AND s.deleted_at IS NULL
                 LEFT JOIN student_invoices si ON si.student_id = s.id
                   AND si.tenant_id = ? AND si.status = 'paid'
                   AND DATE(COALESCE(si.payment_date, si.created_at)) BETWEEN ? AND ?
                 WHERE b.tenant_id = ? AND b.deleted_at IS NULL
                   ${branchId ? `AND b.id = ${branchId}` : ''}
                   ${studentAcademicSql}
                   ${academicYearSql}
                 GROUP BY b.id, b.name
                 ORDER BY amount DESC`,
                [tenantId, from, to, tenantId]
            ),
            // 13. Branch performance (students + avg attendance %)
            db.query(
                `SELECT
                   b.id AS branch_id, b.name AS branch_name,
                   COUNT(DISTINCT s.id) AS students,
                   COALESCE(
                     ROUND(100 * COUNT(DISTINCT CASE WHEN ar.status IN (1,2) THEN ar.id END)
                       / NULLIF(COUNT(DISTINCT ar.id), 0), 1),
                   0) AS attendance_pct
                 FROM branches b
                 LEFT JOIN students s ON s.primary_branch_id = b.id AND s.deleted_at IS NULL
                   AND (s.status = 1 OR s.status = '1' OR s.status = 'active' OR s.status = 'Active Student')
                 LEFT JOIN student_enrollments se ON se.student_id = s.id AND se.status = 'active' AND se.deleted_at IS NULL
                 LEFT JOIN lectures l ON l.batch_id = se.batch_id AND l.branch_id = b.id
                   AND l.attendance_taken = 1 AND l.deleted_at IS NULL
                   AND l.lecture_date BETWEEN ? AND ?
                 LEFT JOIN attendance_records ar ON ar.lecture_id = l.id AND ar.student_id = s.id
                 WHERE b.tenant_id = ? AND b.deleted_at IS NULL
                   ${branchId ? `AND b.id = ${branchId}` : ''}
                 GROUP BY b.id, b.name
                 ORDER BY students DESC`,
                [from, to, tenantId]
            ),
            // 14. Other income in period
            db.query(
                `SELECT COALESCE(SUM(boi.amount), 0) AS amount
                 FROM branch_other_income boi
                 WHERE boi.tenant_id = ? AND boi.deleted_at IS NULL
                   AND boi.income_date BETWEEN ? AND ?
                   ${branchId ? `AND boi.branch_id = ${branchId}` : ''}`,
                [tenantId, from, to]
            ),
            // 15. Staff salary total (monthly estimate: sum of salary_amount for active staff)
            db.query(
                `SELECT COALESCE(SUM(sp.salary_amount), 0) AS total_monthly_salary
                 FROM staff_profiles sp
                 WHERE sp.tenant_id = ? AND sp.deleted_at IS NULL
                   AND (sp.status = 'active' OR sp.status = 'Active' OR sp.status = 1)
                   ${staffBranchSql}`,
                [tenantId]
            ),
            // 16. Ledger expenses in period (type = 'expense')
            db.query(
                `SELECT COALESCE(SUM(iel.amount), 0) AS amount
                 FROM income_expense_ledger iel
                 WHERE iel.tenant_id = ? AND iel.type = 'expense'
                   AND iel.transaction_date BETWEEN ? AND ?
                   ${branchId ? `AND iel.branch_id = ${branchId}` : ''}`,
                [tenantId, from, to]
            ),
            // 17. Fee dues count (students with outstanding balance > 0)
            db.query(
                `SELECT COUNT(*) AS cnt
                 FROM student_fee_assignments sfa
                 JOIN student_enrollments se ON se.id = sfa.enrollment_id
                 JOIN students s ON s.id = se.student_id
                 WHERE sfa.tenant_id = ? AND sfa.balance_amount > 0 AND s.deleted_at IS NULL
                   ${branchId ? `AND s.primary_branch_id = ${branchId}` : ''}`,
                [tenantId]
            ),
            // 18. Attendance pending (lectures in the past with attendance_taken = 0)
            db.query(
                `SELECT COUNT(*) AS cnt
                 FROM lectures l
                 WHERE l.tenant_id = ? AND l.deleted_at IS NULL
                   AND l.is_default = 0
                   AND l.attendance_taken = 0
                   AND l.lecture_date < CURDATE()
                   AND l.status NOT IN ('cancelled')
                   ${branchId ? `AND l.branch_id = ${branchId}` : ''}`,
                [tenantId]
            ),
            // 19. Open doubts
            db.query(
                `SELECT COUNT(*) AS cnt FROM student_doubts sd
                 WHERE sd.tenant_id = ? AND sd.status = 'open' AND sd.deleted_at IS NULL
                   ${branchId ? `AND sd.branch_id = ${branchId}` : ''}`,
                [tenantId]
            ),
            // 20. Teacher tasks pending (homeworks in draft)
            db.query(
                `SELECT COUNT(*) AS cnt FROM homeworks h
                 WHERE h.tenant_id = ? AND h.status = 'draft' AND h.deleted_at IS NULL
                   ${branchId ? `AND h.branch_id = ${branchId}` : ''}`,
                [tenantId]
            ),
            // 21. Upcoming exams (top 3 date-wise, assignment_type = 'exam', deleted_at IS NULL)
            db.query(
                `SELECT h.id, h.title, h.assignment_type, h.subject_id,
                        COALESCE(s.name, 'General') AS subject_name,
                        COALESCE(s.code, '') AS subject_code,
                        COALESCE(br.name, 'All Branches') AS branch_name,
                        h.due_date,
                        COALESCE(h.max_marks, 0) AS max_marks,
                        h.status
                 FROM homeworks h
                 LEFT JOIN subjects s ON s.id = h.subject_id
                 LEFT JOIN branches br ON br.id = h.branch_id
                 WHERE h.tenant_id = ?
                   AND h.assignment_type = 'exam'
                   AND h.deleted_at IS NULL
                   ${branchId ? `AND h.branch_id = ${branchId}` : ''}
                 ORDER BY h.due_date ASC
                 LIMIT 3`,
                [tenantId]
            ),
            // 22. Pending assignments (published homeworks not yet due)
            db.query(
                `SELECT COUNT(*) AS cnt FROM homeworks h
                 WHERE h.tenant_id = ? AND h.assignment_type IN ('homework', 'assignment')
                   AND h.status = 'published'
                   AND h.due_date >= NOW()
                   AND h.deleted_at IS NULL
                   ${branchId ? `AND h.branch_id = ${branchId}` : ''}`,
                [tenantId]
            ),
        ]);

        // ── Process KPI values ────────────────────────────────────────────
        const activeStudents = Number(activeStudentRows[0]?.cnt) || 0;
        const activeStaff = Number(activeStaffRows[0]?.total) || 0;
        const teachingStaff = Number(activeStaffRows[0]?.teaching) || 0;
        const nonTeachingStaff = Number(activeStaffRows[0]?.non_teaching) || 0;

        const feeCollectionCurrent = Number(feeCollectionRows[0]?.amount) || 0;
        const feeCollectionPrev = Number(feeCollectionPrevRows[0]?.amount) || 0;
        const feeCollectionChange = feeCollectionPrev > 0
            ? Math.round(((feeCollectionCurrent - feeCollectionPrev) / feeCollectionPrev) * 100)
            : 0;

        // ── Calculate Authoritative Overdue & Fee Status (Two-Table Model) ──
        const asOfDate = new Date(to || new Date());
        let totalOverdue = 0;
        let dueCount = 0;
        let paidCount = 0;
        let onScheduleCount = 0;
        let overdueCount = 0;
        let paidAmount = 0;
        let onScheduleAmount = 0;
        let overdueAmount = 0;

        for (const sfa of (pendingFeeRows || [])) {
            const gross = Number(sfa.gross_amount) || 0;
            const concession = Number(sfa.total_concession) || 0;
            const net = Math.max(0, gross - concession || Number(sfa.net_amount) || 0);
            const paid = Number(sfa.paid_amount) || 0;
            const remainingBalance = Math.max(0, net - paid);

            const downPayment = Number(sfa.down_payment) || 0;
            const installmentCount = Math.max(1, Number(sfa.installment_count) || 1);
            const installmentAmount = Number(sfa.installment_amount) || 0;
            const startDate = new Date(sfa.start_date || asOfDate);

            // Cumulative expected due as of evaluation date
            let expectedDueTillDate = downPayment;
            for (let i = 1; i <= installmentCount; i++) {
                const dueDate = new Date(startDate);
                dueDate.setMonth(dueDate.getMonth() + i);
                if (dueDate <= asOfDate) {
                    expectedDueTillDate += installmentAmount;
                }
            }
            expectedDueTillDate = Math.min(net, expectedDueTillDate);

            const overdue = Math.max(0, expectedDueTillDate - paid);

            if (overdue > 0) {
                totalOverdue += overdue;
                dueCount += 1;
            }

            if (remainingBalance <= 0 || sfa.status === 'paid') {
                paidCount++;
                paidAmount += paid;
            } else if (overdue > 0) {
                overdueCount++;
                overdueAmount += overdue;
            } else {
                onScheduleCount++;
                onScheduleAmount += remainingBalance;
            }
        }

        const pendingFeeAmount = totalOverdue;
        const pendingFeeDueCount = dueCount;

        // ── Date Series Generation & Attendance Trend Formatting ─────────
        const dateSeries = generateDateSeries(from, to);

        // ── Student attendance trend & period totals ──────────────────────
        const saTodayPresent = Number(studentAttendanceTodayRows[0]?.present) || 0;
        const saTodayAbsent = Number(studentAttendanceTodayRows[0]?.absent) || 0;
        const saTodayTotal = saTodayPresent + saTodayAbsent;
        const saTodayPct = saTodayTotal > 0 ? Math.round((saTodayPresent / saTodayTotal) * 100) : 0;

        const studentDateMap = new Map();
        (studentAttendanceTrendRows || []).forEach(r => {
            const attended = Number(r.attended) || 0;
            const absent = Number(r.absent) || 0;
            const total = Number(r.total_records) || (attended + absent);
            studentDateMap.set(r.period, { attended, absent, total });
        });

        let studentPeriodPresent = 0;
        let studentPeriodAbsent = 0;

        const studentAttendanceTrend = dateSeries.map(d => {
            const row = studentDateMap.get(d.dateStr);
            if (row && row.total > 0) {
                studentPeriodPresent += row.attended;
                studentPeriodAbsent += row.absent;
                const pct = Math.round((row.attended / row.total) * 100);
                return {
                    label: d.label,
                    pct,
                    present: row.attended,
                    absent: row.absent
                };
            }
            return {
                label: d.label,
                pct: 0,
                present: 0,
                absent: 0
            };
        });

        const studentPeriodTotal = studentPeriodPresent + studentPeriodAbsent;
        const studentSummaryPct = studentPeriodTotal > 0
            ? Math.round((studentPeriodPresent / studentPeriodTotal) * 100)
            : (saTodayTotal > 0 ? saTodayPct : 0);
        const studentSummaryPresent = studentPeriodTotal > 0 ? studentPeriodPresent : saTodayPresent;
        const studentSummaryAbsent = studentPeriodTotal > 0 ? studentPeriodAbsent : saTodayAbsent;

        // ── Staff attendance trend & period totals ────────────────────────
        const staffTodayPresent = Number(staffAttendanceTodayRows[0]?.present) || 0;
        const staffTodayAbsent = Number(staffAttendanceTodayRows[0]?.absent) || 0;
        const staffTodayTotal = Number(staffAttendanceTodayRows[0]?.total) || 0;
        const staffTodayPct = staffTodayTotal > 0
            ? Math.round((staffTodayPresent / staffTodayTotal) * 100)
            : 0;

        const staffDateMap = new Map();
        (staffAttendanceTrendRows || []).forEach(r => {
            const present = Number(r.present) || 0;
            const absent = Number(r.absent) || 0;
            const total = Number(r.total) || (present + absent);
            staffDateMap.set(r.period, { present, absent, total });
        });

        let staffPeriodPresent = 0;
        let staffPeriodAbsent = 0;

        const staffAttendanceTrend = dateSeries.map(d => {
            const row = staffDateMap.get(d.dateStr);
            if (row && row.total > 0) {
                staffPeriodPresent += row.present;
                staffPeriodAbsent += row.absent;
                const pct = Math.round((row.present / row.total) * 100);
                return {
                    label: d.label,
                    pct,
                    present: row.present,
                    absent: row.absent
                };
            }
            return {
                label: d.label,
                pct: 0,
                present: 0,
                absent: 0
            };
        });

        const staffPeriodTotal = staffPeriodPresent + staffPeriodAbsent;
        const staffSummaryPct = staffPeriodTotal > 0
            ? Math.round((staffPeriodPresent / staffPeriodTotal) * 100)
            : (staffTodayTotal > 0 ? staffTodayPct : 0);
        const staffSummaryPresent = staffPeriodTotal > 0 ? staffPeriodPresent : staffTodayPresent;
        const staffSummaryAbsent = staffPeriodTotal > 0 ? staffPeriodAbsent : staffTodayAbsent;

        // ── Fee status donut (Authoritative Two-Table Model) ───────────────
        const feeStatus = [
            { status: 'paid', label: 'Paid', count: paidCount, amount: paidAmount },
            { status: 'partial', label: 'On Schedule', count: onScheduleCount, amount: onScheduleAmount },
            { status: 'unpaid', label: 'Overdue', count: overdueCount, amount: overdueAmount }
        ];

        // ── Financial overview ────────────────────────────────────────────
        const otherIncome = Number(otherIncomeRows[0]?.amount) || 0;
        const totalIncome = feeCollectionCurrent + otherIncome;

        // Staff salary: prorate monthly salary for the date-range span
        const spanDays = Math.max(1, (new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24));
        const monthlySalary = Number(staffSalaryRows[0]?.total_monthly_salary) || 0;
        const proratedSalary = Math.round((monthlySalary / 30) * spanDays);

        const ledgerExpenses = Number(ledgerExpenseRows[0]?.amount) || 0;
        const totalExpenses = proratedSalary + ledgerExpenses;
        const netFinancial = totalIncome - totalExpenses;

        // ── Assemble response ─────────────────────────────────────────────
        res.status(200).json({
            status: 'success',
            data: {
                meta: {
                    from,
                    to,
                    granularity,
                    branchId,
                    academicYearId,
                    lastUpdated: new Date().toISOString()
                },
                filters: {
                    branches: branchesRows || [],
                    academicYears: academicYearsRows || [],
                    courses: coursesRows || [],
                    programs: programsRows || [],
                    levels: levelsRows || [],
                    batches: batchesRows || []
                },
                kpis: {
                    activeStudents: { value: activeStudents },
                    activeStaff: {
                        value: activeStaff,
                        teachingCount: teachingStaff,
                        nonTeachingCount: nonTeachingStaff
                    },
                    admissions: {
                        value: Math.floor(Math.random() * 80) + 40,
                        change: Math.floor(Math.random() * 20) - 5,
                        isMock: true
                    },
                    feeCollection: {
                        value: feeCollectionCurrent,
                        change: feeCollectionChange
                    },
                    pendingFees: {
                        value: pendingFeeAmount,
                        dueCount: pendingFeeDueCount
                    }
                },
                studentAttendance: {
                    today: {
                        pct: studentSummaryPct,
                        present: studentSummaryPresent,
                        absent: studentSummaryAbsent,
                        leave: 0
                    },
                    trend: studentAttendanceTrend
                },
                staffAttendance: {
                    today: {
                        pct: staffSummaryPct,
                        present: staffSummaryPresent,
                        absent: staffSummaryAbsent,
                        leave: 0
                    },
                    trend: staffAttendanceTrend
                },
                admissionsTrend: mockAdmissionsTrend(),
                studentsByBranch: (studentsByBranchRows || []).map(r => ({
                    branchId: r.branch_id,
                    branchName: r.branch_name,
                    count: Number(r.student_count) || 0
                })),
                feeCollectionTrend: (feeCollectionTrendRows || []).map(r => ({
                    label: r.period,
                    amount: Number(r.amount) || 0
                })),
                feeStatus,
                branchPerformance: (branchPerfRows || []).map(r => ({
                    branchId: r.branch_id,
                    branchName: r.branch_name,
                    students: Number(r.students) || 0,
                    admissions: Math.floor(Math.random() * 30) + 10, // mock
                    attendancePct: Number(r.attendance_pct) || 0
                })),
                branchCollection: (branchCollectionRows || []).map(r => ({
                    branchId: r.branch_id,
                    branchName: r.branch_name,
                    amount: Number(r.amount) || 0
                })),
                financialOverview: {
                    income: totalIncome,
                    feeIncome: feeCollectionCurrent,
                    otherIncome,
                    expenses: totalExpenses,
                    salaryExpenses: proratedSalary,
                    otherExpenses: ledgerExpenses,
                    net: netFinancial
                },
                expenseBreakdown: mockExpenseBreakdown(totalExpenses),
                attentionRequired: {
                    feeDues: pendingFeeDueCount,
                    lowAttendance: 0, // computationally expensive — show 0 until dedicated query
                    attendancePending: Number(attendancePendingRows[0]?.cnt) || 0,
                    resultsPending: 0, // exam results module not yet wired
                    openDoubts: Number(openDoubtsRows[0]?.cnt) || 0,
                    teacherTasksPending: Number(teacherTasksRows[0]?.cnt) || 0
                },
                academicActivity: {
                    upcomingExams: (upcomingExamsRows || []).length,
                    pendingAssignments: Number(pendingAssignmentsRows[0]?.cnt) || 0
                },
                upcomingExams: (upcomingExamsRows || []).map(r => ({
                    id: r.id,
                    title: r.title,
                    subjectName: r.subject_name,
                    subjectCode: r.subject_code,
                    branchName: r.branch_name,
                    dueDate: r.due_date,
                    maxMarks: Number(r.max_marks) || 0,
                    status: (r.status === 1 || r.status === '1' || String(r.status).toLowerCase() === 'published') ? 'Published' : (r.status === 2 || r.status === '2' || String(r.status).toLowerCase() === 'closed') ? 'Closed' : 'Draft'
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching institute dashboard data:', error);
        res.status(500).json({ status: 'error', message: 'Failed to load institute dashboard data' });
    }
});



/**
 * GET /api/admin/dashboard/institute-stats
 * Returns key metrics for Institute Admin dashboard KPI cards.
 */
router.get('/institute-stats', async (req, res) => {
    try {
        let tenantId = req.user?.tenantId;
        if (req.user?.isSaasAdmin && req.query.tenant_id) {
            tenantId = Number(req.query.tenant_id);
        }
        if (!tenantId || tenantId === 1) {
            tenantId = req.query.tenant_id ? Number(req.query.tenant_id) : 2;
        }

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
});

/**
 * GET /api/admin/dashboard/saas-stats
 * Returns key metrics for the SaaS Admin dashboard KPI cards.
 */
router.get('/saas-stats', requireSaasAdmin, async (req, res) => {
    try {
        const [[tenantStats]] = await db.query(`
            SELECT
                COUNT(*) AS total_tenants,
                SUM(status = 1) AS active_tenants,
                SUM(status = 0) AS suspended_tenants,
                SUM(status = 2) AS draft_tenants,
                SUM(end_date IS NOT NULL AND end_date < CURRENT_DATE AND status = 1) AS expired_tenants
            FROM tenants
            WHERE tenant_type != 'master' AND id != 1 AND status != 3
        `);

        const [statusRows] = await db.query(`
            SELECT status, COUNT(*) AS count
            FROM tenants
            WHERE tenant_type != 'master' AND id != 1 AND status != 3
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
            WHERE t.tenant_type != 'master' AND t.id != 1 AND t.status != 3
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
            WHERE t.tenant_type != 'master' AND t.id != 1 AND t.status != 3
            GROUP BY sp.name
            ORDER BY count DESC
        `);

        // MRR Proxy
        const [[mrrStats]] = await db.query(`
            SELECT SUM(subscription_final_price) as total_mrr
            FROM tenants
            WHERE tenant_type != 'master' AND id != 1 AND status = 1
        `);

        // MRR Trend
        const [allActive] = await db.query(`
            SELECT start_date, subscription_final_price
            FROM tenants
            WHERE tenant_type != 'master' AND id != 1 AND status = 1
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

        const timeRange = req.query.time_range || 'monthly';
        let intervalDays = 30;
        if (timeRange === 'daily') intervalDays = 1;
        else if (timeRange === 'weekly') intervalDays = 7;

        // User Metrics across all tenants
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
                mrr_trend: trendWithHeights,
                time_range: timeRange
            }
        });
    } catch (error) {
        console.error('Error fetching SaaS dashboard stats:', error);
        res.status(500).json({ status: 'error', message: 'Failed to load dashboard stats' });
    }
});

/**
 * GET /api/admin/dashboard/academic-years
 * Returns distinct academic years from database for dynamic year filters.
 */
router.get('/academic-years', async (req, res) => {
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
});

/**
 * GET /api/admin/dashboard/saas-revenue
 * Returns revenue KPIs + monthly revenue trend, sourced entirely from saas_invoices.
 * Trend = total_amount of paid invoices grouped by month of payment_date.
 */
router.get('/saas-revenue', requireSaasAdmin, async (req, res) => {
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
            WHERE i.status = 'paid' AND i.deleted_at IS NULL
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

