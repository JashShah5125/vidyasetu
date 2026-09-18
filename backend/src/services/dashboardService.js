const db = require('../config/db');

/**
 * Helper utilities for dashboard date series and formatting
 */
const pad = (n) => String(n).padStart(2, '0');

const resolveDateRange = (query = {}) => {
    const today = new Date();
    const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const to = query.to ? query.to : isoDate(today);
    let from = query.from;
    if (!from) {
        const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        from = isoDate(firstOfMonth);
    }
    return { from, to };
};

const resolveGranularity = (from, to) => {
    const diffMs = new Date(to) - new Date(from);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays <= 7) return 'day';
    if (diffDays <= 90) return 'week';
    return 'month';
};

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

/**
 * Generic unified dashboard service
 * Serves both Institute Admin (branchId = null or selected) and Branch Admin (branchId = fixed).
 */
const getDashboard = async ({ tenantId, branchId = null, filters = {} }) => {
    const { from, to } = resolveDateRange(filters);
    const granularity = resolveGranularity(from, to);

    const academicYearId = filters.academicYearId && filters.academicYearId !== 'all'
        ? Number(filters.academicYearId) : null;
    const courseId = filters.courseId && filters.courseId !== 'all' ? Number(filters.courseId) : null;
    const programId = filters.programId && filters.programId !== 'all' ? Number(filters.programId) : null;
    const levelId = filters.levelId && filters.levelId !== 'all' ? Number(filters.levelId) : null;
    const batchId = filters.batchId && filters.batchId !== 'all' ? Number(filters.batchId) : null;

    // ── Fetch filter metadata ─────────────────────────────────────────
    const [
        [branchesRows],
        [academicYearsRows],
        [coursesRows],
        [programsRows],
        [levelsRows],
        [batchesRows]
    ] = await Promise.all([
        branchId
            ? db.query(`SELECT id, name, code FROM branches WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL ORDER BY name ASC`, [tenantId, branchId])
            : db.query(`SELECT id, name, code FROM branches WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name ASC`, [tenantId]),
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
        branchId
            ? db.query(`SELECT id, name, code, level_id, branch_id, academic_year_id FROM batches WHERE tenant_id = ? AND branch_id = ? AND deleted_at IS NULL AND status = 'active' ORDER BY name ASC`, [tenantId, branchId])
            : db.query(`SELECT id, name, code, level_id, branch_id, academic_year_id FROM batches WHERE tenant_id = ? AND deleted_at IS NULL AND status = 'active' ORDER BY name ASC`, [tenantId])
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

    // ── Scope fragments ───────────────────────────────────────────────
    const branchSql = branchId ? ` AND s.primary_branch_id = ${Number(branchId)}` : '';
    const staffBranchSql = branchId
        ? ` AND JSON_CONTAINS(COALESCE(sp.branch_ids, JSON_ARRAY()), CAST('${Number(branchId)}' AS JSON))`
        : '';

    // ── Date calculations for previous period comparisons ─────────────
    const span = new Date(to) - new Date(from);
    const prevTo = new Date(new Date(from) - 1);
    const prevFrom = new Date(prevTo - span);
    const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    // ── 26 Parallel SQL Queries ───────────────────────────────────────
    const [
        [activeStudentRows],
        [activeStaffRows],
        [admissionsRows],
        [admissionsPrevRows],
        [admissionsTrendRows],
        [feeCollectionRows],
        [feeCollectionPrevRows],
        [pendingFeeRows],
        [studentAttendanceTodayRows],
        [studentAttendanceTrendRows],
        [staffAttendanceTodayRows],
        [staffAttendanceTrendRows],
        [studentsByBranchRows],
        [feeCollectionTrendRows],
        [feeStatusRows],
        [branchCollectionRows],
        [branchPerfRows],
        [otherIncomeRows],
        [staffSalaryRows],
        [ledgerExpenseRows],
        [feeDuesRows],
        [attendancePendingRows],
        [openDoubtsRows],
        [teacherTasksRows],
        [upcomingExamsRows],
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
        // 2. Active staff
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
        // 3. Real Admissions in selected period
        db.query(
            `SELECT COUNT(*) AS cnt FROM students s
             WHERE s.tenant_id = ? AND s.deleted_at IS NULL
               AND DATE(s.created_at) BETWEEN ? AND ?
               ${branchSql}
               ${studentAcademicSql}
               ${academicYearSql}`,
            [tenantId, from, to]
        ),
        // 3b. Real Admissions in previous equivalent period
        db.query(
            `SELECT COUNT(*) AS cnt FROM students s
             WHERE s.tenant_id = ? AND s.deleted_at IS NULL
               AND DATE(s.created_at) BETWEEN ? AND ?
               ${branchSql}
               ${studentAcademicSql}
               ${academicYearSql}`,
            [tenantId, isoDate(prevFrom), isoDate(prevTo)]
        ),
        // 3c. Real Admissions monthly trend for the selected year
        db.query(
            `SELECT
               DATE_FORMAT(s.created_at, '%b') AS label,
               MONTH(s.created_at) AS mo,
               COUNT(*) AS count
             FROM students s
             WHERE s.tenant_id = ? AND s.deleted_at IS NULL
               AND YEAR(s.created_at) = YEAR(?)
               ${branchSql}
               ${studentAcademicSql}
               ${academicYearSql}
             GROUP BY mo, label
             ORDER BY mo ASC`,
            [tenantId, to]
        ),
        // 4. Fee collection in period
        db.query(
            `SELECT COALESCE(SUM(si.paid_amount), 0) AS amount
             FROM student_invoices si
             JOIN students s ON s.id = si.student_id
             WHERE si.tenant_id = ?
               AND si.status = 'paid'
               AND DATE(COALESCE(si.payment_date, si.created_at)) BETWEEN ? AND ?
               ${branchId ? `AND s.primary_branch_id = ${Number(branchId)}` : ''}
               ${studentAcademicSql}
               ${academicYearSql}`,
            [tenantId, from, to]
        ),
        // 4b. Previous equivalent period fee collection
        db.query(
            `SELECT COALESCE(SUM(si.paid_amount), 0) AS amount
             FROM student_invoices si
             JOIN students s ON s.id = si.student_id
             WHERE si.tenant_id = ?
               AND si.status = 'paid'
               AND DATE(COALESCE(si.payment_date, si.created_at)) BETWEEN ? AND ?
               ${branchId ? `AND s.primary_branch_id = ${Number(branchId)}` : ''}
               ${studentAcademicSql}
               ${academicYearSql}`,
            [tenantId, isoDate(prevFrom), isoDate(prevTo)]
        ),
        // 5. Pending & overdue fees (Two-Table Model)
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
               ${branchId ? `AND s.primary_branch_id = ${Number(branchId)}` : ''}
               ${studentAcademicSql}
               ${academicYearSql}`,
            [tenantId]
        ),
        // 6. Student attendance today
        db.query(
            `SELECT
               COUNT(DISTINCT ar.student_id) AS present,
               SUM(CASE WHEN ar.status = 0 THEN 1 ELSE 0 END) AS absent,
               COUNT(DISTINCT l.id) AS total_lectures
             FROM lectures l
             LEFT JOIN attendance_records ar ON ar.lecture_id = l.id AND ar.tenant_id = l.tenant_id
             WHERE l.tenant_id = ? AND l.attendance_taken = 1
               AND l.lecture_date = CURDATE() AND l.deleted_at IS NULL
               ${branchId ? `AND l.branch_id = ${Number(branchId)}` : ''}`,
            [tenantId]
        ),
        // 7. Student attendance trend
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
               ${branchId ? `AND l.branch_id = ${Number(branchId)}` : ''}
             GROUP BY period
             ORDER BY period ASC`,
            [tenantId, from, to]
        ),
        // 8. Staff attendance today
        db.query(
            `SELECT
               COUNT(CASE WHEN sa.status = 1 THEN 1 END) AS present,
               COUNT(CASE WHEN sa.status = 0 THEN 1 END) AS absent,
               COUNT(*) AS total
             FROM staff_attendance sa
             WHERE sa.tenant_id = ? AND sa.date = CURDATE()
               ${branchId ? `AND sa.branch_id = ${Number(branchId)}` : ''}`,
            [tenantId]
        ),
        // 9. Staff attendance trend
        db.query(
            `SELECT
               DATE_FORMAT(sa.date, '%Y-%m-%d') AS period,
               COUNT(CASE WHEN sa.status = 1 THEN 1 END) AS present,
               COUNT(CASE WHEN sa.status = 0 THEN 1 END) AS absent,
               COUNT(*) AS total
             FROM staff_attendance sa
             WHERE sa.tenant_id = ? AND sa.date BETWEEN ? AND ?
               ${branchId ? `AND sa.branch_id = ${Number(branchId)}` : ''}
             GROUP BY period
             ORDER BY period ASC`,
            [tenantId, from, to]
        ),
        // 10. Students by branch
        db.query(
            `SELECT b.id AS branch_id, b.name AS branch_name,
               COUNT(s.id) AS student_count
             FROM branches b
             LEFT JOIN students s ON s.primary_branch_id = b.id
               AND s.deleted_at IS NULL
               AND (s.status = 1 OR s.status = '1' OR s.status = 'active' OR s.status = 'Active Student')
             WHERE b.tenant_id = ? AND b.deleted_at IS NULL
               ${branchId ? `AND b.id = ${Number(branchId)}` : ''}
             GROUP BY b.id, b.name
             ORDER BY student_count DESC`,
            [tenantId]
        ),
        // 11. Fee collection trend
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
               ${branchId ? `AND s.primary_branch_id = ${Number(branchId)}` : ''}
               ${studentAcademicSql}
               ${academicYearSql}
             GROUP BY period
             ORDER BY period ASC`,
            [tenantId, from, to]
        ),
        // 12. Fee status
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
               ${branchId ? `AND s.primary_branch_id = ${Number(branchId)}` : ''}
               ${studentAcademicSql}
               ${academicYearSql}
             GROUP BY fee_status`,
            [tenantId]
        ),
        // 13. Branch collection
        db.query(
            `SELECT b.id AS branch_id, b.name AS branch_name,
               COALESCE(SUM(si.paid_amount), 0) AS amount
             FROM branches b
             LEFT JOIN students s ON s.primary_branch_id = b.id AND s.deleted_at IS NULL
             LEFT JOIN student_invoices si ON si.student_id = s.id
               AND si.tenant_id = ? AND si.status = 'paid'
               AND DATE(COALESCE(si.payment_date, si.created_at)) BETWEEN ? AND ?
             WHERE b.tenant_id = ? AND b.deleted_at IS NULL
               ${branchId ? `AND b.id = ${Number(branchId)}` : ''}
               ${studentAcademicSql}
               ${academicYearSql}
             GROUP BY b.id, b.name
             ORDER BY amount DESC`,
            [tenantId, from, to, tenantId]
        ),
        // 14. Branch performance (with real admissions per branch in period)
        db.query(
            `SELECT
               b.id AS branch_id, b.name AS branch_name,
               COUNT(DISTINCT s.id) AS students,
               COUNT(DISTINCT CASE WHEN DATE(s.created_at) BETWEEN ? AND ? THEN s.id END) AS admissions,
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
               ${branchId ? `AND b.id = ${Number(branchId)}` : ''}
             GROUP BY b.id, b.name
             ORDER BY students DESC`,
            [from, to, from, to, tenantId]
        ),
        // 15. Other income in period
        db.query(
            `SELECT COALESCE(SUM(boi.amount), 0) AS amount
             FROM branch_other_income boi
             WHERE boi.tenant_id = ? AND boi.deleted_at IS NULL
               AND boi.income_date BETWEEN ? AND ?
               ${branchId ? `AND boi.branch_id = ${Number(branchId)}` : ''}`,
            [tenantId, from, to]
        ),
        // 16. Staff salary total
        db.query(
            `SELECT COALESCE(SUM(sp.salary_amount), 0) AS total_monthly_salary
             FROM staff_profiles sp
             WHERE sp.tenant_id = ? AND sp.deleted_at IS NULL
               AND (sp.status = 'active' OR sp.status = 'Active' OR sp.status = 1)
               ${staffBranchSql}`,
            [tenantId]
        ),
        // 17. Ledger expenses
        db.query(
            `SELECT COALESCE(SUM(iel.amount), 0) AS amount
             FROM income_expense_ledger iel
             WHERE iel.tenant_id = ? AND iel.type = 'expense'
               AND iel.transaction_date BETWEEN ? AND ?
               ${branchId ? `AND iel.branch_id = ${Number(branchId)}` : ''}`,
            [tenantId, from, to]
        ),
        // 18. Fee dues count
        db.query(
            `SELECT COUNT(*) AS cnt
             FROM student_fee_assignments sfa
             JOIN student_enrollments se ON se.id = sfa.enrollment_id
             JOIN students s ON s.id = se.student_id
             WHERE sfa.tenant_id = ? AND sfa.balance_amount > 0 AND s.deleted_at IS NULL
               ${branchId ? `AND s.primary_branch_id = ${Number(branchId)}` : ''}`,
            [tenantId]
        ),
        // 19. Attendance pending
        db.query(
            `SELECT COUNT(*) AS cnt
             FROM lectures l
             WHERE l.tenant_id = ? AND l.deleted_at IS NULL
               AND l.is_default = 0
               AND l.attendance_taken = 0
               AND l.lecture_date < CURDATE()
               AND l.status NOT IN ('cancelled')
               ${branchId ? `AND l.branch_id = ${Number(branchId)}` : ''}`,
            [tenantId]
        ),
        // 20. Open doubts
        db.query(
            `SELECT COUNT(*) AS cnt FROM student_doubts sd
             WHERE sd.tenant_id = ? AND sd.status = 'open' AND sd.deleted_at IS NULL
               ${branchId ? `AND sd.branch_id = ${Number(branchId)}` : ''}`,
            [tenantId]
        ),
        // 21. Teacher tasks pending
        db.query(
            `SELECT COUNT(*) AS cnt FROM homeworks h
             WHERE h.tenant_id = ? AND h.status = 'draft' AND h.deleted_at IS NULL
               ${branchId ? `AND h.branch_id = ${Number(branchId)}` : ''}`,
            [tenantId]
        ),
        // 22. Upcoming exams
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
               ${branchId ? `AND h.branch_id = ${Number(branchId)}` : ''}
             ORDER BY h.due_date ASC
             LIMIT 3`,
            [tenantId]
        ),
        // 23. Pending assignments
        db.query(
            `SELECT COUNT(*) AS cnt FROM homeworks h
             WHERE h.tenant_id = ? AND h.assignment_type IN ('homework', 'assignment')
               AND h.status = 'published'
               AND h.due_date >= NOW()
               AND h.deleted_at IS NULL
               ${branchId ? `AND h.branch_id = ${Number(branchId)}` : ''}`,
            [tenantId]
        ),
    ]);

    // ── Process KPI values ────────────────────────────────────────────
    const activeStudents = Number(activeStudentRows[0]?.cnt) || 0;
    const activeStaff = Number(activeStaffRows[0]?.total) || 0;
    const teachingStaff = Number(activeStaffRows[0]?.teaching) || 0;
    const nonTeachingStaff = Number(activeStaffRows[0]?.non_teaching) || 0;

    // ── Real Admissions KPI & Trend Processing ────────────────────────
    const admissionsCurrent = Number(admissionsRows[0]?.cnt) || 0;
    const admissionsPrev = Number(admissionsPrevRows[0]?.cnt) || 0;
    const admissionsChange = admissionsPrev > 0
        ? Math.round(((admissionsCurrent - admissionsPrev) / admissionsPrev) * 100)
        : 0;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const admissionsTrendMap = new Map();
    (admissionsTrendRows || []).forEach(r => {
        admissionsTrendMap.set(r.label, Number(r.count) || 0);
    });
    const admissionsTrend = months.map(m => ({
        label: m,
        count: admissionsTrendMap.get(m) || 0
    }));

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

    // ── Fee status donut (Two-Table Model) ─────────────────────────────
    const feeStatus = [
        { status: 'paid', label: 'Paid', count: paidCount, amount: paidAmount },
        { status: 'partial', label: 'On Schedule', count: onScheduleCount, amount: onScheduleAmount },
        { status: 'unpaid', label: 'Overdue', count: overdueCount, amount: overdueAmount }
    ];

    // ── Financial overview ────────────────────────────────────────────
    const otherIncome = Number(otherIncomeRows[0]?.amount) || 0;
    const totalIncome = feeCollectionCurrent + otherIncome;

    const spanDays = Math.max(1, (new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24));
    const monthlySalary = Number(staffSalaryRows[0]?.total_monthly_salary) || 0;
    const proratedSalary = Math.round((monthlySalary / 30) * spanDays);

    const ledgerExpenses = Number(ledgerExpenseRows[0]?.amount) || 0;
    const totalExpenses = proratedSalary + ledgerExpenses;
    const netFinancial = totalIncome - totalExpenses;

    return {
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
                value: admissionsCurrent,
                change: admissionsChange
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
        admissionsTrend,
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
            admissions: Number(r.admissions) || 0,
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
            lowAttendance: 0,
            attendancePending: Number(attendancePendingRows[0]?.cnt) || 0,
            resultsPending: 0,
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
    };
};

module.exports = {
    getDashboard,
    resolveTenant: (req) => {
        let tenantId = req.user?.tenantId;
        if (req.user?.isSaasAdmin && req.query.tenant_id) {
            tenantId = Number(req.query.tenant_id);
        }
        if (!tenantId || tenantId === 1) {
            tenantId = req.query.tenant_id ? Number(req.query.tenant_id) : 2;
        }
        return tenantId;
    }
};
