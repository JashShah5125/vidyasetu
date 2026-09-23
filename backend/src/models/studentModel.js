const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const STUDENT_STATUS = {
    INACTIVE: 0,
    ACTIVE: 1,
    DELETED: 2,
    REGISTRATION_PENDING: 3,
    DOCUMENTS_SUBMITTED: 4,
    DOCUMENTS_VERIFIED: 5,
    PENDING_BATCH: 6,
    BATCH_ALLOCATED: 7,
    PAYMENT_PENDING: 8,
    ON_HOLD: 9,
    PASSED_OUT: 10
};

const DOCUMENT_STATUS = {
    PENDING: 0,
    VERIFIED: 1,
    REJECTED: 2
};

/**
 * Normalizes student status to TINYINT:
 * 0 = inactive, 1 = active, 2 = deleted, 3 = reg_pending, 4 = docs_submitted,
 * 5 = docs_verified, 6 = pending_batch, 7 = batch_allocated, 8 = payment_pending,
 * 9 = on_hold, 10 = passed_out
 */
const normalizeStudentStatus = (status) => {
    if (status === undefined || status === null) return 3;
    if (typeof status === 'number') {
        return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(status) ? status : 3;
    }
    const s = String(status).trim().toLowerCase();
    if (s === '1' || s === 'active' || s === 'active student') return 1;
    if (s === '0' || s === 'inactive' || s === 'suspended') return 0;
    if (s === '2' || s === 'deleted' || s === 'cancelled') return 2;
    if (s === '3' || s === 'registration_pending' || s === 'reg_pending' || s === 'draft' || s === 'pending') return 3;
    if (s === '4' || s === 'documents_submitted' || s === 'docs_submitted' || s === 'pending review') return 4;
    if (s === '5' || s === 'documents_verified' || s === 'docs_verified' || s === 'approved') return 5;
    if (s === '6' || s === 'pending_batch' || s === 'pending batch allocation' || s === 'unassigned') return 6;
    if (s === '7' || s === 'batch_allocated' || s === 'allocated') return 7;
    if (s === '8' || s === 'payment_pending' || s === 'awaiting payment') return 8;
    if (s === '9' || s === 'on_hold' || s === 'rejected') return 9;
    if (s === '10' || s === 'passed_out' || s === 'alumni' || s === 'graduated') return 10;
    return 3;
};

/**
 * Get student roster list with optional filters, pagination, and branch-scoped authorization.
 */
const getStudents = async (tenantId, filters = {}, accessContext = null) => {
    const {
        search = '',
        branchId,
        batchId,
        bundleId,
        courseId,
        programId,
        levelId,
        academicYearId,
        status,
        feeStatus,
        limit = 10,
        offset = 0
    } = filters;

    let whereClause = ` WHERE s.tenant_id = ? AND s.deleted_at IS NULL`;
    const params = [tenantId];

    // Branch authorization scope check
    if (accessContext && accessContext.scope === 'BRANCH') {
        const authBranchId = accessContext.authorizedBranchId;
        whereClause += ` AND se.branch_id = ? AND se.status = 'active' AND se.deleted_at IS NULL`;
        params.push(authBranchId);
    } else if (accessContext && accessContext.scope === 'TEACHER') {
        // Teacher sees only students enrolled in their allocated batches
        if (accessContext.assignedBatchIds && accessContext.assignedBatchIds.length > 0) {
            whereClause += ` AND se.batch_id IN (?) AND se.status = 'active' AND se.deleted_at IS NULL`;
            params.push(accessContext.assignedBatchIds);
        } else {
            whereClause += ` AND 1 = 0`;
        }
    } else if (branchId && branchId !== 'All') {
        whereClause += ` AND (s.primary_branch_id = ? OR se.branch_id = ?)`;
        params.push(branchId, branchId);
    }

    if (academicYearId && academicYearId !== 'All') {
        whereClause += ` AND se.academic_year_id = ?`;
        params.push(Number(academicYearId));
    }

    if (batchId && batchId !== 'All') {
        whereClause += ` AND se.batch_id = ?`;
        params.push(Number(batchId));
    }

    if (levelId && levelId !== 'All') {
        whereClause += ` AND bat.level_id = ?`;
        params.push(Number(levelId));
    }

    if (programId && programId !== 'All') {
        whereClause += ` AND l.program_id = ?`;
        params.push(Number(programId));
    }

    if (courseId && courseId !== 'All') {
        whereClause += ` AND (l.course_id = ? OR p.course_id = ?)`;
        params.push(Number(courseId), Number(courseId));
    }

    if (bundleId && bundleId !== 'All') {
        whereClause += ` AND se.bundle_id = ?`;
        params.push(Number(bundleId));
    }

    // Latest fee assignment per student (latest row per student_id via rn=1)
    const faJoin = `
        LEFT JOIN (
            SELECT student_id, tenant_id, gross_amount, total_concession, net_amount,
                   down_payment, installment_count, installment_amount,
                   paid_amount, balance_amount, status, created_at,
                   ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY id DESC) AS rn
            FROM student_fee_assignments
        ) fa ON fa.student_id = s.id AND fa.tenant_id = s.tenant_id AND fa.rn = 1
    `;

    const academicJoins = `
        LEFT JOIN batches bat ON se.batch_id = bat.id AND bat.tenant_id = s.tenant_id
        LEFT JOIN levels l ON bat.level_id = l.id AND l.tenant_id = s.tenant_id
        LEFT JOIN programs p ON (l.program_id = p.id OR (l.program_id IS NULL AND l.course_id = p.course_id)) AND p.tenant_id = s.tenant_id
        LEFT JOIN courses c ON (l.course_id = c.id OR p.course_id = c.id) AND c.tenant_id = s.tenant_id
    `;

    if (search && search.trim() !== '') {
        const term = `%${search.trim()}%`;
        whereClause += ` AND (s.full_name LIKE ? OR s.student_code LIKE ? OR s.mobile LIKE ? OR s.email LIKE ?)`;
        params.push(term, term, term, term);
    }

    if (status !== undefined && status !== 'All' && status !== '') {
        const numStatus = normalizeStudentStatus(status);
        whereClause += ` AND s.status = ?`;
        params.push(numStatus);
    }

    if (feeStatus && feeStatus !== 'All') {
        const lowerFeeStatus = feeStatus.toLowerCase().trim();
        if (lowerFeeStatus === 'paid') {
            whereClause += ` AND (fa.status = 'paid' OR (fa.net_amount > 0 AND (fa.net_amount - fa.paid_amount) <= 0) OR fa.balance_amount = 0)`;
        } else if (lowerFeeStatus === 'overdue') {
            whereClause += ` AND (fa.status = 'overdue' OR (fa.balance_amount > 0 AND fa.down_payment > fa.paid_amount))`;
        } else if (lowerFeeStatus === 'on_schedule') {
            whereClause += ` AND ((fa.status = 'pending' OR fa.status = 'partially_paid' OR fa.status = 'partial') AND (fa.balance_amount > 0 OR fa.balance_amount IS NULL) AND (fa.down_payment <= fa.paid_amount))`;
        } else if (lowerFeeStatus === 'unpaid') {
            whereClause += ` AND (fa.status = 'unpaid' OR fa.status = 'pending' OR fa.paid_amount = 0 OR fa.paid_amount IS NULL)`;
        } else if (lowerFeeStatus === 'partial' || lowerFeeStatus === 'partially_paid') {
            whereClause += ` AND (fa.status = 'partial' OR fa.status = 'partially_paid' OR (fa.paid_amount > 0 AND fa.balance_amount > 0))`;
        } else {
            whereClause += ` AND fa.status = ?`;
            params.push(feeStatus);
        }
    }

    const countQuery = `
        SELECT COUNT(DISTINCT s.id) as total 
        FROM students s
        LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.deleted_at IS NULL AND se.status = 'active'
        ${academicJoins}
        ${faJoin}
        ${whereClause}
    `;

    const [countRows] = await pool.query(countQuery, params);
    const total = countRows[0] ? countRows[0].total : 0;

    // Calculate aggregate financial summary across the entire filtered population
    const summaryDataQuery = `
        SELECT 
            fa.net_amount,
            fa.paid_amount,
            fa.balance_amount,
            fa.down_payment,
            fa.installment_count,
            fa.installment_amount,
            COALESCE(se.enrolled_date, fa.created_at, s.created_at) AS start_date
        FROM students s
        LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.deleted_at IS NULL AND se.status = 'active'
        ${academicJoins}
        ${faJoin}
        ${whereClause}
    `;

    const [summaryRows] = await pool.query(summaryDataQuery, params);
    const now = new Date();
    let totalExpected = 0;
    let totalCollected = 0;
    let totalRemaining = 0;
    let totalOverdue = 0;
    let defaulterCount = 0;

    for (const r of summaryRows) {
        const net = Number(r.net_amount) || 0;
        const paid = Number(r.paid_amount) || 0;
        const balance = Number(r.balance_amount) !== undefined && r.balance_amount !== null ? Number(r.balance_amount) : Math.max(0, net - paid);
        const down = Number(r.down_payment) || 0;
        const instCount = Math.max(1, Number(r.installment_count) || 1);
        const instAmount = Number(r.installment_amount) || 0;
        const startDate = new Date(r.start_date || now);

        totalExpected += net;
        totalCollected += paid;
        totalRemaining += balance;

        let expectedDue = down;
        for (let i = 1; i <= instCount; i++) {
            const dueDate = new Date(startDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            if (dueDate <= now) {
                expectedDue += instAmount;
            }
        }
        expectedDue = Math.min(net, expectedDue);
        const overdue = Math.max(0, expectedDue - paid);
        if (overdue > 0) {
            totalOverdue += overdue;
            defaulterCount += 1;
        }
    }

    const selectQuery = `
        SELECT 
            s.id,
            s.tenant_id,
            s.user_id,
            s.primary_branch_id,
            b.name AS branch_name,
            c.name AS course_name,
            p.name AS program_name,
            l.name AS level_name,
            s.student_code,
            s.full_name,
            s.dob,
            s.gender,
            s.mobile,
            s.email,
            s.street,
            s.city,
            s.state,
            s.pincode,
            s.category,
            s.school_name,
            s.current_class,
            s.target_exam,
            s.year_of_attempt,
            s.blood_group,
            s.profile_photo_url,
            s.status,
            s.created_at,
            s.updated_at,
            se.id AS enrollment_id,
            se.batch_id,
            bat.name AS batch_name,
            bat.code AS batch_code,
            se.academic_year_id,
            ay.name AS academic_year_name,
            se.enrolled_date,
            g.id AS guardian_id,
            g.user_id AS guardian_user_id,
            g.full_name AS guardian_name,
            g.mobile AS guardian_mobile,
            g.relation AS guardian_relation,
            g.email AS guardian_email,
            fa.gross_amount AS total_fees_gross,
            fa.total_concession AS total_concession,
            fa.net_amount AS total_fees,
            fa.down_payment AS down_payment,
            fa.installment_count AS installment_count,
            fa.installment_amount AS installment_amount,
            fa.paid_amount AS fees_paid,
            fa.balance_amount AS fees_outstanding,
            fa.status AS fee_status,
            fa.created_at AS fee_created_at
        FROM students s
        LEFT JOIN branches b ON s.primary_branch_id = b.id AND b.tenant_id = s.tenant_id
        LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.deleted_at IS NULL AND se.status = 'active'
        ${academicJoins}
        LEFT JOIN academic_years ay ON se.academic_year_id = ay.id AND ay.tenant_id = s.tenant_id
        LEFT JOIN student_guardians sg ON s.id = sg.student_id AND sg.tenant_id = s.tenant_id AND sg.is_primary = 1
        LEFT JOIN guardians g ON sg.guardian_id = g.id AND g.tenant_id = s.tenant_id
        ${faJoin}
        ${whereClause}
        ORDER BY s.id DESC 
        LIMIT ? OFFSET ?
    `;

    const selectParams = [...params, Number(limit), Number(offset)];
    const [rows] = await pool.query(selectQuery, selectParams);

    const formattedData = rows.map(row => {
        const net = Number(row.total_fees) || 0;
        const paid = Number(row.fees_paid) || 0;
        const balance = Number(row.fees_outstanding) !== undefined && row.fees_outstanding !== null ? Number(row.fees_outstanding) : Math.max(0, net - paid);
        const down = Number(row.down_payment) || 0;
        const instCount = Math.max(1, Number(row.installment_count) || 1);
        const instAmount = Number(row.installment_amount) || 0;
        const startDate = new Date(row.enrolled_date || row.fee_created_at || row.created_at || now);

        let expectedDue = down;
        for (let i = 1; i <= instCount; i++) {
            const dueDate = new Date(startDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            if (dueDate <= now) {
                expectedDue += instAmount;
            }
        }
        expectedDue = Math.min(net, expectedDue);
        const overdue = Math.max(0, expectedDue - paid);

        return {
            ...row,
            course_name: row.course_name || row.target_exam || '—',
            program_name: row.program_name || '—',
            level_name: row.level_name || '—',
            total_fees: net,
            fees_paid: paid,
            fees_remaining: balance,
            expected_due_till_date: Math.round(expectedDue),
            fees_overdue: Math.round(overdue),
            is_defaulter: overdue > 0,
            fee_status: row.fee_status || (balance <= 0 ? 'paid' : (paid > 0 ? 'partial' : 'unpaid'))
        };
    });

    return {
        total,
        summary: {
            totalExpected: Math.round(totalExpected),
            totalCollected: Math.round(totalCollected),
            totalRemaining: Math.round(totalRemaining),
            totalOverdue: Math.round(totalOverdue),
            defaulterCount
        },
        data: formattedData
    };
};

/**
 * Get detailed student profile by ID with optional branch scope check.
 */
const getStudentById = async (tenantId, id, accessContext = null) => {
    let whereBranchClause = '';
    const queryParams = [tenantId, id];

    if (accessContext && accessContext.scope === 'BRANCH') {
        whereBranchClause = ` AND se.branch_id = ? AND se.status = 'active'`;
        queryParams.push(accessContext.authorizedBranchId);
    } else if (accessContext && accessContext.scope === 'TEACHER') {
        if (accessContext.assignedBatchIds && accessContext.assignedBatchIds.length > 0) {
            whereBranchClause = ` AND se.batch_id IN (?) AND se.status = 'active'`;
            queryParams.push(accessContext.assignedBatchIds);
        } else {
            whereBranchClause = ` AND 1 = 0`;
        }
    }

    const query = `
        SELECT 
            s.*,
            b.name AS branch_name,
            se.id AS enrollment_id,
            se.branch_id AS enrollment_branch_id,
            se.batch_id,
            bat.name AS batch_name,
            bat.code AS batch_code,
            se.bundle_id,
            se.subject_selection_type,
            se.custom_subject_ids,
            se.academic_year_id,
            ay.name AS academic_year_name,
            se.enrolled_date,
            se.status AS enrollment_status,
            g.id AS guardian_id,
            g.user_id AS guardian_user_id,
            g.full_name AS guardian_name,
            g.mobile AS guardian_mobile,
            g.email AS guardian_email,
            g.relation AS guardian_relation,
            g.occupation AS guardian_occupation
        FROM students s
        LEFT JOIN branches b ON s.primary_branch_id = b.id AND b.tenant_id = s.tenant_id
        LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.deleted_at IS NULL AND se.status = 'active'
        LEFT JOIN batches bat ON se.batch_id = bat.id AND bat.tenant_id = s.tenant_id
        LEFT JOIN academic_years ay ON se.academic_year_id = ay.id AND ay.tenant_id = s.tenant_id
        LEFT JOIN student_guardians sg ON s.id = sg.student_id AND sg.tenant_id = s.tenant_id AND sg.is_primary = 1
        LEFT JOIN guardians g ON sg.guardian_id = g.id AND g.tenant_id = s.tenant_id
        WHERE s.tenant_id = ? AND s.id = ? AND s.deleted_at IS NULL
        ${whereBranchClause}
    `;

    const [rows] = await pool.query(query, queryParams);
    if (rows.length === 0) return null;

    const student = rows[0];

    // Fetch enrolled subjects based on bundle or custom selection
    let subjectBundle = null;
    let subjectsList = [];

    if (student.subject_selection_type === 'custom' && student.custom_subject_ids) {
        let customIds = [];
        try {
            customIds = typeof student.custom_subject_ids === 'string' ? JSON.parse(student.custom_subject_ids) : student.custom_subject_ids;
        } catch (e) {
            customIds = [];
        }
        if (Array.isArray(customIds) && customIds.length > 0) {
            const [subs] = await pool.query(
                `SELECT id, name, code FROM subjects WHERE id IN (?) AND tenant_id = ?`,
                [customIds, tenantId]
            );
            subjectsList = subs;
        }
    } else if (student.bundle_id) {
        const [bundles] = await pool.query(
            `SELECT id, name, description, subject_ids, fee_amount FROM subject_bundles WHERE id = ? AND tenant_id = ? AND is_active = 1 LIMIT 1`,
            [student.bundle_id, tenantId]
        );
        if (bundles.length > 0) {
            subjectBundle = bundles[0];
            let subIds = [];
            try {
                subIds = typeof subjectBundle.subject_ids === 'string' ? JSON.parse(subjectBundle.subject_ids) : subjectBundle.subject_ids;
            } catch (e) {
                subIds = [];
            }
            if (Array.isArray(subIds) && subIds.length > 0) {
                const [subs] = await pool.query(
                    `SELECT id, name, code FROM subjects WHERE id IN (?) AND tenant_id = ?`,
                    [subIds, tenantId]
                );
                subjectsList = subs;
            }
        }
    } else if (student.batch_id) {
        // Fallback to level bundle if no explicit bundle_id set
        const [batchRows] = await pool.query(
            `SELECT level_id FROM batches WHERE id = ? AND tenant_id = ?`,
            [student.batch_id, tenantId]
        );
        if (batchRows.length > 0 && batchRows[0].level_id) {
            const [bundles] = await pool.query(
                `SELECT id, name, description, subject_ids, fee_amount FROM subject_bundles WHERE level_id = ? AND tenant_id = ? AND is_active = 1 LIMIT 1`,
                [batchRows[0].level_id, tenantId]
            );
            if (bundles.length > 0) {
                subjectBundle = bundles[0];
                let subIds = [];
                try {
                    subIds = typeof subjectBundle.subject_ids === 'string' ? JSON.parse(subjectBundle.subject_ids) : subjectBundle.subject_ids;
                } catch (e) {
                    subIds = [];
                }
                if (Array.isArray(subIds) && subIds.length > 0) {
                    const [subs] = await pool.query(
                        `SELECT id, name, code FROM subjects WHERE id IN (?) AND tenant_id = ?`,
                        [subIds, tenantId]
                    );
                    subjectsList = subs;
                }
            }
        }
    }

    // Fetch master fee assignment and invoices list
    let feeAssignment = null;
    let invoicesList = [];

    const [feeRows] = await pool.query(
        `SELECT *, 
            total_concession AS discount_amount, 
            down_payment AS downpayment_amount, 
            balance_amount AS balance_due 
         FROM student_fee_assignments WHERE student_id = ? AND tenant_id = ?`,
        [id, tenantId]
    );
    if (feeRows.length > 0) {
        feeAssignment = feeRows[0];
        const [invRows] = await pool.query(
            `SELECT *, 
                amount AS billed_amount, 
                transaction_reference AS transaction_ref 
             FROM student_invoices WHERE student_id = ? AND tenant_id = ? ORDER BY installment_number ASC`,
            [id, tenantId]
        );
        invoicesList = invRows;
    }

    return {
        ...student,
        subjectBundle,
        subjectsList,
        feeAssignment,
        invoicesList
    };
};

/**
 * Generate next student_code for a tenant branch.
 */
const generateStudentCode = async (tenantId) => {
    const [rows] = await pool.query(
        `SELECT COUNT(*) as count FROM students WHERE tenant_id = ?`,
        [tenantId]
    );
    const num = (rows[0].count + 1).toString().padStart(4, '0');
    return `STU-${new Date().getFullYear()}-${num}`;
};

/**
 * Create a new student with user account, guardian user account, and enrollment linkage.
 */
const createStudent = async (tenantId, studentData, createdBy = 1, accessContext = null) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Enforce branch scope if executing as Branch Admin
        let effectiveBranchId = studentData.primary_branch_id;
        if (accessContext && accessContext.scope === 'BRANCH') {
            effectiveBranchId = accessContext.authorizedBranchId;
        }

        if (!effectiveBranchId) {
            throw new Error('Branch ID is required for student registration.');
        }

        // Validate that the assigned batch belongs to the effective branch
        if (studentData.batch_id) {
            const [batchRows] = await connection.query(
                `SELECT id, branch_id FROM batches WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
                [studentData.batch_id, tenantId]
            );
            if (!batchRows.length) {
                const err = new Error('Batch not found for this institute.');
                err.statusCode = 404;
                throw err;
            }
            if (Number(batchRows[0].branch_id) !== Number(effectiveBranchId)) {
                const err = new Error(`Selected batch (ID: ${studentData.batch_id}) does not belong to authorized branch (ID: ${effectiveBranchId}).`);
                err.statusCode = 403;
                throw err;
            }
        }

        const studentCode = studentData.student_code || await generateStudentCode(tenantId);

        // 1. Create Student User Account in `users` table
        const studentEmail = studentData.email || `${studentCode.toLowerCase()}@student.vidyasetu.com`;
        const studentPasswordHash = await bcrypt.hash('student123', 10);

        let studentUserId = null;
        // Check if user already exists
        const [existingStudentUsers] = await connection.query(
            `SELECT id FROM users WHERE email = ? AND tenant_id = ?`,
            [studentEmail, tenantId]
        );

        if (existingStudentUsers.length > 0) {
            studentUserId = existingStudentUsers[0].id;
        } else {
            const [userRes] = await connection.query(`
                INSERT INTO users (
                    tenant_id, name, email, mobile, password_hash, user_type, status
                ) VALUES (?, ?, ?, ?, ?, 'student', 'active')
            `, [
                tenantId,
                studentData.full_name,
                studentEmail,
                studentData.mobile || null,
                studentPasswordHash
            ]);

            studentUserId = userRes.insertId;

            // Assign Student Role (role_id = 8)
            await connection.query(`
                INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by)
                VALUES (?, 8, ?)
            `, [studentUserId, createdBy]);
        }

        const studentStatus = normalizeStudentStatus(studentData.status);

        // 2. Insert into students table
        const [studentResult] = await connection.query(`
            INSERT INTO students (
                tenant_id, user_id, primary_branch_id, student_code, full_name, dob, gender, mobile, email,
                street, city, state, pincode, category, school_name, current_class,
                target_exam, year_of_attempt, blood_group, status, created_by, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            tenantId,
            studentUserId,
            effectiveBranchId,
            studentCode,
            studentData.full_name,
            studentData.dob || null,
            studentData.gender || null,
            studentData.mobile || null,
            studentEmail,
            studentData.street || null,
            studentData.city || null,
            studentData.state || null,
            studentData.pincode || null,
            studentData.category || 'General',
            studentData.school_name || null,
            studentData.current_class || null,
            studentData.target_exam || null,
            studentData.year_of_attempt || null,
            studentData.blood_group || null,
            studentStatus,
            createdBy,
            createdBy
        ]);

        const studentId = studentResult.insertId;

        // 3. Create Guardian User Account & Guardian record if provided
        if (studentData.guardian_name && studentData.guardian_mobile) {
            const guardianEmail = studentData.guardian_email || `parent.${studentData.guardian_mobile}@parent.vidyasetu.com`;
            const parentPasswordHash = await bcrypt.hash('parent123', 10);

            let guardianUserId = null;
            const [existingParentUsers] = await connection.query(
                `SELECT id FROM users WHERE email = ? AND tenant_id = ?`,
                [guardianEmail, tenantId]
            );

            if (existingParentUsers.length > 0) {
                guardianUserId = existingParentUsers[0].id;
            } else {
                const [parentUserRes] = await connection.query(`
                    INSERT INTO users (
                        tenant_id, name, email, mobile, password_hash, user_type, status
                    ) VALUES (?, ?, ?, ?, ?, 'parent', 'active')
                `, [
                    tenantId,
                    studentData.guardian_name,
                    guardianEmail,
                    studentData.guardian_mobile,
                    parentPasswordHash
                ]);

                guardianUserId = parentUserRes.insertId;

                // Assign Parent Role (role_id = 7)
                await connection.query(`
                    INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by)
                    VALUES (?, 7, ?)
                `, [guardianUserId, createdBy]);
            }

            const [guardianResult] = await connection.query(`
                INSERT INTO guardians (
                    tenant_id, user_id, full_name, relation, mobile, email, occupation, created_by, updated_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                tenantId,
                guardianUserId,
                studentData.guardian_name,
                studentData.guardian_relation || 'Parent',
                studentData.guardian_mobile,
                guardianEmail,
                studentData.guardian_occupation || null,
                createdBy,
                createdBy
            ]);

            const guardianId = guardianResult.insertId;

            await connection.query(`
                INSERT INTO student_guardians (
                    tenant_id, student_id, guardian_id, is_primary
                ) VALUES (?, ?, ?, 1)
            `, [tenantId, studentId, guardianId]);
        }

        // 4. Create Enrollment row if batch_id is provided
        let enrollmentId = null;
        if (studentData.batch_id && studentData.academic_year_id) {
            const selectionType = studentData.subject_selection_type === 'custom' ? 'custom' : 'bundle';
            const bundleId = selectionType === 'bundle' && studentData.bundle_id ? Number(studentData.bundle_id) : null;
            const customSubjectIds = selectionType === 'custom' && Array.isArray(studentData.custom_subject_ids)
                ? JSON.stringify(studentData.custom_subject_ids.map(Number))
                : (selectionType === 'custom' && typeof studentData.custom_subject_ids === 'string' ? studentData.custom_subject_ids : null);

            const [enrollmentRes] = await connection.query(`
                INSERT INTO student_enrollments (
                    tenant_id, branch_id, student_id, batch_id, bundle_id, subject_selection_type, custom_subject_ids, academic_year_id, enrolled_date, status, created_by, updated_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'active', ?, ?)
            `, [
                tenantId,
                effectiveBranchId,
                studentId,
                studentData.batch_id,
                bundleId,
                selectionType,
                customSubjectIds,
                studentData.academic_year_id,
                createdBy,
                createdBy
            ]);

            enrollmentId = enrollmentRes.insertId;

            // Increment batch current_strength
            await connection.query(`
                UPDATE batches SET current_strength = current_strength + 1 WHERE id = ? AND tenant_id = ?
            `, [studentData.batch_id, tenantId]);
        }

        // 5. Create Fee Assignment & Invoices if fee parameters are provided
        if (studentData.gross_amount && Number(studentData.gross_amount) > 0) {
            const grossAmount = Number(studentData.gross_amount);
            const discountAmount = Number(studentData.discount_amount || 0);
            const netAmount = Math.max(0, grossAmount - discountAmount);
            const downpaymentAmount = Number(studentData.downpayment_amount || 0);
            const installmentCount = Math.max(1, Number(studentData.installment_count || 1));
            const remainingForInstallments = Math.max(0, netAmount - downpaymentAmount);
            const installmentAmount = Math.round(remainingForInstallments / installmentCount);
            const paidAmount = downpaymentAmount;
            const balanceAmount = Math.max(0, netAmount - paidAmount);
            const status = balanceAmount === 0 ? 'paid' : (paidAmount > 0 ? 'partially_paid' : 'pending');

            const [feeRes] = await connection.query(`
                INSERT INTO student_fee_assignments (
                    tenant_id, branch_id, student_id, enrollment_id, gross_amount, total_concession, net_amount,
                    down_payment, installment_count, installment_amount,
                    paid_amount, balance_amount, status, created_by, updated_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                tenantId,
                effectiveBranchId,
                studentId,
                enrollmentId,
                grossAmount,
                discountAmount,
                netAmount,
                downpaymentAmount,
                installmentCount,
                installmentAmount,
                paidAmount,
                balanceAmount,
                status,
                createdBy,
                createdBy
            ]);

            const feeAssignmentId = feeRes.insertId;

            // Generate Downpayment Invoice (Installment #0) if downpayment > 0
            if (downpaymentAmount > 0) {
                const invNum = `INV-${tenantId}-${studentId}-DP`;
                await connection.query(`
                    INSERT INTO student_invoices (
                        tenant_id, branch_id, student_id, enrollment_id, fee_assignment_id, invoice_number, installment_number,
                        description, issue_date, due_date, amount, paid_amount, balance_due,
                        status, payment_date, payment_mode, transaction_reference, created_by, updated_by
                    ) VALUES (?, ?, ?, ?, ?, ?, 0, 'Admission Downpayment', CURDATE(), CURDATE(), ?, ?, 0, 'paid', NOW(), 'UPI', ?, ?, ?)
                `, [
                    tenantId,
                    effectiveBranchId,
                    studentId,
                    enrollmentId,
                    feeAssignmentId,
                    invNum,
                    downpaymentAmount,
                    downpaymentAmount,
                    `TXN-DP-${Date.now().toString().slice(-6)}`,
                    createdBy,
                    createdBy
                ]);
            }

            // Generate Monthly Installment Invoices (#1 to #N)
            for (let i = 1; i <= installmentCount; i++) {
                const invNum = `INV-${tenantId}-${studentId}-INST${i}`;
                await connection.query(`
                    INSERT INTO student_invoices (
                        tenant_id, branch_id, student_id, enrollment_id, fee_assignment_id, invoice_number, installment_number,
                        description, issue_date, due_date, amount, paid_amount, balance_due,
                        status, created_by, updated_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? MONTH), ?, 0, ?, 'unpaid', ?, ?)
                `, [
                    tenantId,
                    effectiveBranchId,
                    studentId,
                    enrollmentId,
                    feeAssignmentId,
                    invNum,
                    i,
                    `Monthly Installment ${i} of ${installmentCount}`,
                    i,
                    installmentAmount,
                    installmentAmount,
                    createdBy,
                    createdBy
                ]);
            }
        }

        // 4. Save uploaded registration documents
        if (studentData.documents && Array.isArray(studentData.documents) && studentData.documents.length > 0) {
            await saveStudentDocuments(tenantId, studentId, studentData.documents, createdBy, connection);
        }

        await connection.commit();
        connection.release();

        return getStudentById(tenantId, studentId, accessContext);
    } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
    }
};

/**
 * Update existing student profile, user account, and academic linkages.
 * Performs dynamic partial updates (PATCH/PUT) touching ONLY the tables
 * whose fields are explicitly provided in updateData.
 */
const updateStudent = async (tenantId, id, updateData, updatedBy = 1, accessContext = null) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Branch scope check: verify student has active enrollment in authorized branch
        if (accessContext && accessContext.scope === 'BRANCH') {
            const [enrollCheck] = await connection.query(
                `SELECT se.id FROM student_enrollments se
                 JOIN students s ON s.id = se.student_id AND s.deleted_at IS NULL
                 WHERE s.tenant_id = ? AND s.id = ? AND se.branch_id = ? AND se.status = 'active' AND se.deleted_at IS NULL`,
                [tenantId, id, accessContext.authorizedBranchId]
            );
            if (!enrollCheck.length) {
                await connection.rollback();
                connection.release();
                return null;
            }
        }

        // 1. Dynamic Partial Update on `students` table
        const studentFieldsMap = {
            full_name: 'full_name',
            dob: 'dob',
            gender: 'gender',
            mobile: 'mobile',
            email: 'email',
            street: 'street',
            city: 'city',
            state: 'state',
            pincode: 'pincode',
            category: 'category',
            school_name: 'school_name',
            current_class: 'current_class',
            target_exam: 'target_exam',
            year_of_attempt: 'year_of_attempt',
            blood_group: 'blood_group'
        };

        if (accessContext?.scope !== 'BRANCH' && updateData.primary_branch_id !== undefined) {
            studentFieldsMap.primary_branch_id = 'primary_branch_id';
        }

        const studentSets = [];
        const studentVals = [];

        for (const [key, col] of Object.entries(studentFieldsMap)) {
            if (updateData[key] !== undefined) {
                studentSets.push(`${col} = ?`);
                studentVals.push(updateData[key] || null);
            }
        }

        if (updateData.status !== undefined) {
            studentSets.push(`status = ?`);
            studentVals.push(normalizeStudentStatus(updateData.status));
        }

        if (studentSets.length > 0) {
            studentSets.push(`updated_by = ?`, `updated_at = NOW()`);
            studentVals.push(updatedBy, id, tenantId);

            await connection.query(`
                UPDATE students SET ${studentSets.join(', ')}
                WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
            `, studentVals);
        }

        // 2. Dynamic Partial Update on `users` table
        if (updateData.full_name !== undefined || updateData.mobile !== undefined) {
            const [studentRows] = await connection.query(
                `SELECT user_id FROM students WHERE id = ? AND tenant_id = ?`,
                [id, tenantId]
            );
            if (studentRows.length > 0 && studentRows[0].user_id) {
                const userSets = [];
                const userVals = [];
                if (updateData.full_name !== undefined) {
                    userSets.push(`name = ?`);
                    userVals.push(updateData.full_name);
                }
                if (updateData.mobile !== undefined) {
                    userSets.push(`mobile = ?`);
                    userVals.push(updateData.mobile || null);
                }
                if (userSets.length > 0) {
                    userVals.push(studentRows[0].user_id, tenantId);
                    await connection.query(`
                        UPDATE users SET ${userSets.join(', ')}
                        WHERE id = ? AND tenant_id = ?
                    `, userVals);
                }
            }
        }

        // 3. Dynamic Partial Update on `guardians` table
        const guardianFields = ['guardian_name', 'guardian_mobile', 'guardian_email', 'guardian_relation', 'guardian_occupation'];
        const hasGuardianUpdates = guardianFields.some(f => updateData[f] !== undefined);

        if (hasGuardianUpdates) {
            const [sgRows] = await connection.query(
                `SELECT guardian_id FROM student_guardians WHERE student_id = ? AND tenant_id = ? AND is_primary = 1`,
                [id, tenantId]
            );
            if (sgRows.length > 0) {
                const gSets = [];
                const gVals = [];
                if (updateData.guardian_name !== undefined) { gSets.push(`full_name = ?`); gVals.push(updateData.guardian_name); }
                if (updateData.guardian_mobile !== undefined) { gSets.push(`mobile = ?`); gVals.push(updateData.guardian_mobile); }
                if (updateData.guardian_email !== undefined) { gSets.push(`email = ?`); gVals.push(updateData.guardian_email || null); }
                if (updateData.guardian_relation !== undefined) { gSets.push(`relation = ?`); gVals.push(updateData.guardian_relation || null); }
                if (updateData.guardian_occupation !== undefined) { gSets.push(`occupation = ?`); gVals.push(updateData.guardian_occupation || null); }

                if (gSets.length > 0) {
                    gSets.push(`updated_by = ?`, `updated_at = NOW()`);
                    gVals.push(updatedBy, sgRows[0].guardian_id, tenantId);
                    await connection.query(`
                        UPDATE guardians SET ${gSets.join(', ')}
                        WHERE id = ? AND tenant_id = ?
                    `, gVals);
                }
            }
        }

        // 4. Dynamic Partial Update on `student_enrollments` table
        const enrollmentFields = ['batch_id', 'bundle_id', 'subject_selection_type', 'custom_subject_ids', 'academic_year_id'];
        const hasEnrollmentUpdates = enrollmentFields.some(f => updateData[f] !== undefined);

        let effectiveEnrollmentId = null;
        if (hasEnrollmentUpdates) {
            const [existingEnrollments] = await connection.query(
                `SELECT id, batch_id FROM student_enrollments WHERE student_id = ? AND tenant_id = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 1`,
                [id, tenantId]
            );

            const selectionType = updateData.subject_selection_type === 'custom' ? 'custom' : (updateData.subject_selection_type === 'bundle' ? 'bundle' : undefined);
            const bundleId = updateData.bundle_id !== undefined ? (updateData.bundle_id ? Number(updateData.bundle_id) : null) : undefined;
            const customSubjectIds = updateData.custom_subject_ids !== undefined
                ? (Array.isArray(updateData.custom_subject_ids) ? JSON.stringify(updateData.custom_subject_ids.map(Number)) : updateData.custom_subject_ids)
                : undefined;

            if (existingEnrollments.length > 0) {
                effectiveEnrollmentId = existingEnrollments[0].id;
                const oldBatchId = existingEnrollments[0].batch_id;
                const newBatchId = updateData.batch_id !== undefined ? Number(updateData.batch_id) : oldBatchId;

                const eSets = [];
                const eVals = [];
                if (updateData.batch_id !== undefined) { eSets.push(`batch_id = ?`); eVals.push(updateData.batch_id); }
                if (bundleId !== undefined) { eSets.push(`bundle_id = ?`); eVals.push(bundleId); }
                if (selectionType !== undefined) { eSets.push(`subject_selection_type = ?`); eVals.push(selectionType); }
                if (customSubjectIds !== undefined) { eSets.push(`custom_subject_ids = ?`); eVals.push(customSubjectIds); }
                if (updateData.academic_year_id !== undefined) { eSets.push(`academic_year_id = ?`); eVals.push(updateData.academic_year_id); }

                if (eSets.length > 0) {
                    eSets.push(`updated_by = ?`, `updated_at = NOW()`);
                    eVals.push(updatedBy, effectiveEnrollmentId, tenantId);
                    await connection.query(`UPDATE student_enrollments SET ${eSets.join(', ')} WHERE id = ? AND tenant_id = ?`, eVals);
                }

                if (updateData.batch_id !== undefined && oldBatchId && Number(oldBatchId) !== Number(newBatchId)) {
                    await connection.query(`UPDATE batches SET current_strength = GREATEST(0, current_strength - 1) WHERE id = ? AND tenant_id = ?`, [oldBatchId, tenantId]);
                    await connection.query(`UPDATE batches SET current_strength = current_strength + 1 WHERE id = ? AND tenant_id = ?`, [newBatchId, tenantId]);
                }
            } else if (updateData.batch_id && updateData.academic_year_id) {
                const [stBranch] = await connection.query(`SELECT primary_branch_id FROM students WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
                const effectiveBranchId = (accessContext && accessContext.authorizedBranchId) || (stBranch[0]?.primary_branch_id) || 1;
                const [enrollmentRes] = await connection.query(`
                    INSERT INTO student_enrollments (
                        tenant_id, branch_id, student_id, batch_id, bundle_id, subject_selection_type, custom_subject_ids, academic_year_id, enrolled_date, status, created_by, updated_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'active', ?, ?)
                `, [
                    tenantId,
                    effectiveBranchId,
                    id,
                    updateData.batch_id,
                    bundleId || null,
                    selectionType || 'bundle',
                    customSubjectIds || null,
                    updateData.academic_year_id,
                    updatedBy,
                    updatedBy
                ]);
                effectiveEnrollmentId = enrollmentRes.insertId;
                await connection.query(`UPDATE batches SET current_strength = current_strength + 1 WHERE id = ? AND tenant_id = ?`, [updateData.batch_id, tenantId]);

                // Ensure a fee assignment exists for this student
                const [checkFee] = await connection.query(
                    `SELECT id FROM student_fee_assignments WHERE student_id = ? AND tenant_id = ?`,
                    [id, tenantId]
                );
                if (!checkFee.length) {
                    const [enqFee] = await connection.query(
                        `SELECT enq.actual_price, enq.concession_amount, enq.final_price, enq.down_payment, enq.installment_months, enq.installment_amount
                         FROM admissions adm
                         JOIN enquiries enq ON adm.enquiry_id = enq.id
                         WHERE adm.student_id = ? AND adm.tenant_id = ? LIMIT 1`,
                        [id, tenantId]
                    );
                    const enq = enqFee[0] || {};
                    const gross = Number(enq.actual_price || enq.final_price || 120000);
                    const disc = Number(enq.concession_amount || 0);
                    const net = Math.max(0, gross - disc);
                    const down = Number(enq.down_payment || 10000);
                    const instCount = Math.max(1, Number(enq.installment_months || 3));
                    const instAmount = Number(enq.installment_amount || Math.round((net - down) / instCount));

                    await connection.query(`
                        INSERT INTO student_fee_assignments (
                            tenant_id, branch_id, student_id, enrollment_id, fee_source_type, fee_source_id,
                            gross_amount, total_concession, net_amount, down_payment, installment_count, installment_amount,
                            paid_amount, balance_amount, status, created_by, updated_by
                        ) VALUES (?, ?, ?, ?, 'bundle', NULL, ?, ?, ?, ?, ?, ?, 0, ?, 'pending', ?, ?)
                    `, [
                        tenantId, effectiveBranchId, id, effectiveEnrollmentId,
                        gross, disc, net, down, instCount, instAmount,
                        net, updatedBy, updatedBy
                    ]);
                }
            }
        }

        // 5. Dynamic Partial Update on \`student_fee_assignments\` table
        const feeFields = ['gross_amount', 'discount_amount', 'total_concession', 'downpayment_amount', 'down_payment', 'installment_count', 'installment_amount'];
        const hasFeeUpdates = feeFields.some(f => updateData[f] !== undefined);

        if (hasFeeUpdates) {
            const [existingFee] = await connection.query(
                `SELECT * FROM student_fee_assignments WHERE student_id = ? AND tenant_id = ? ORDER BY id DESC LIMIT 1`,
                [id, tenantId]
            );

            if (existingFee.length > 0) {
                const cur = existingFee[0];
                const grossAmount = updateData.gross_amount !== undefined ? Number(updateData.gross_amount) : Number(cur.gross_amount || 0);
                const discountAmount = updateData.discount_amount !== undefined
                    ? Number(updateData.discount_amount)
                    : (updateData.total_concession !== undefined ? Number(updateData.total_concession) : Number(cur.total_concession || 0));
                const netAmount = Math.max(0, grossAmount - discountAmount);
                const downpaymentAmount = updateData.downpayment_amount !== undefined
                    ? Number(updateData.downpayment_amount)
                    : (updateData.down_payment !== undefined ? Number(updateData.down_payment) : Number(cur.down_payment || 0));
                const installmentCount = updateData.installment_count !== undefined
                    ? Math.max(1, Number(updateData.installment_count))
                    : Math.max(1, Number(cur.installment_count || 1));
                const remainingForInstallments = Math.max(0, netAmount - downpaymentAmount);
                const installmentAmount = Math.round((remainingForInstallments / installmentCount) * 100) / 100;
                const paidAmount = Number(cur.paid_amount || 0);
                const balanceAmount = Math.max(0, netAmount - paidAmount);
                const feeStatus = balanceAmount === 0 ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid');

                await connection.query(`
                    UPDATE student_fee_assignments SET
                        enrollment_id = COALESCE(?, enrollment_id),
                        gross_amount = ?,
                        total_concession = ?,
                        net_amount = ?,
                        down_payment = ?,
                        installment_count = ?,
                        installment_amount = ?,
                        balance_amount = ?,
                        status = ?,
                        updated_by = ?,
                        updated_at = NOW()
                    WHERE id = ? AND tenant_id = ?
                `, [
                    effectiveEnrollmentId,
                    grossAmount,
                    discountAmount,
                    netAmount,
                    downpaymentAmount,
                    installmentCount,
                    installmentAmount,
                    balanceAmount,
                    feeStatus,
                    updatedBy,
                    cur.id,
                    tenantId
                ]);
            } else if (updateData.gross_amount !== undefined && Number(updateData.gross_amount) > 0) {
                const grossAmount = Number(updateData.gross_amount);
                const discountAmount = Number(updateData.discount_amount || updateData.total_concession || 0);
                const netAmount = Math.max(0, grossAmount - discountAmount);
                const downpaymentAmount = Number(updateData.downpayment_amount || updateData.down_payment || 0);
                const installmentCount = Math.max(1, Number(updateData.installment_count || 1));
                const remainingForInstallments = Math.max(0, netAmount - downpaymentAmount);
                const installmentAmount = Math.round((remainingForInstallments / installmentCount) * 100) / 100;
                const paidAmount = downpaymentAmount;
                const balanceAmount = Math.max(0, netAmount - paidAmount);
                const feeStatus = balanceAmount === 0 ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid');
                const [stBranch] = await connection.query(`SELECT primary_branch_id FROM students WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
                const effectiveBranchId = (accessContext && accessContext.authorizedBranchId) || (stBranch[0]?.primary_branch_id) || 1;

                const [feeRes] = await connection.query(`
                    INSERT INTO student_fee_assignments (
                        tenant_id, branch_id, student_id, enrollment_id, gross_amount, total_concession, net_amount,
                        down_payment, installment_count, installment_amount,
                        paid_amount, balance_amount, status, created_by, updated_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    tenantId,
                    effectiveBranchId,
                    id,
                    effectiveEnrollmentId,
                    grossAmount,
                    discountAmount,
                    netAmount,
                    downpaymentAmount,
                    installmentCount,
                    installmentAmount,
                    paidAmount,
                    balanceAmount,
                    feeStatus,
                    updatedBy,
                    updatedBy
                ]);

                const feeAssignmentId = feeRes.insertId;

                if (downpaymentAmount > 0) {
                    const invNum = `INV-${tenantId}-${id}-DP`;
                    await connection.query(`
                        INSERT INTO student_invoices (
                            tenant_id, branch_id, student_id, enrollment_id, fee_assignment_id, invoice_number, installment_number,
                            description, issue_date, due_date, amount, paid_amount, balance_due,
                            status, payment_date, payment_mode, transaction_reference, created_by, updated_by
                        ) VALUES (?, ?, ?, ?, ?, ?, 0, 'Admission Downpayment', CURDATE(), CURDATE(), ?, ?, 0, 'paid', NOW(), 'UPI', ?, ?, ?)
                    `, [
                        tenantId,
                        effectiveBranchId,
                        id,
                        effectiveEnrollmentId,
                        feeAssignmentId,
                        invNum,
                        downpaymentAmount,
                        downpaymentAmount,
                        `TXN-DP-${Date.now().toString().slice(-6)}`,
                        updatedBy,
                        updatedBy
                    ]);
                }

                for (let i = 1; i <= installmentCount; i++) {
                    const invNum = `INV-${tenantId}-${id}-INST${i}`;
                    await connection.query(`
                        INSERT INTO student_invoices (
                            tenant_id, branch_id, student_id, enrollment_id, fee_assignment_id, invoice_number, installment_number,
                            description, issue_date, due_date, amount, paid_amount, balance_due,
                            status, created_by, updated_by
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? MONTH), ?, 0, ?, 'unpaid', ?, ?)
                    `, [
                        tenantId,
                        effectiveBranchId,
                        id,
                        effectiveEnrollmentId,
                        feeAssignmentId,
                        invNum,
                        i,
                        `Monthly Installment ${i} of ${installmentCount}`,
                        i,
                        installmentAmount,
                        installmentAmount,
                        updatedBy,
                        updatedBy
                    ]);
                }
            }
        }

        await connection.commit();
        connection.release();

        return getStudentById(tenantId, id, accessContext);
    } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
    }
};

/**
 * Soft delete student with branch scope check.
 */
const deleteStudent = async (tenantId, id, updatedBy = 1, accessContext = null) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Branch scope check
        if (accessContext && accessContext.scope === 'BRANCH') {
            const [enrollCheck] = await connection.query(
                `SELECT se.id FROM student_enrollments se
                 JOIN students s ON s.id = se.student_id AND s.deleted_at IS NULL
                 WHERE s.tenant_id = ? AND s.id = ? AND se.branch_id = ? AND se.status = 'active' AND se.deleted_at IS NULL`,
                [tenantId, id, accessContext.authorizedBranchId]
            );
            if (!enrollCheck.length) {
                await connection.rollback();
                connection.release();
                return false;
            }
        }

        // Get student active enrollments to decrement batch strength
        const [enrollments] = await connection.query(
            `SELECT batch_id FROM student_enrollments WHERE student_id = ? AND tenant_id = ? AND status = 'active' AND deleted_at IS NULL`,
            [id, tenantId]
        );

        for (const e of enrollments) {
            await connection.query(
                `UPDATE batches SET current_strength = GREATEST(0, current_strength - 1) WHERE id = ? AND tenant_id = ?`,
                [e.batch_id, tenantId]
            );
        }

        // Deactivate linked user account if exists
        const [studentRows] = await connection.query(
            `SELECT user_id FROM students WHERE id = ? AND tenant_id = ?`,
            [id, tenantId]
        );
        if (studentRows.length > 0 && studentRows[0].user_id) {
            await connection.query(
                `UPDATE users SET status = 'inactive', deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND tenant_id = ?`,
                [studentRows[0].user_id, tenantId]
            );
        }

        await connection.query(
            `UPDATE student_enrollments SET deleted_at = NOW(), status = 'cancelled', updated_by = ?, updated_at = NOW() WHERE student_id = ? AND tenant_id = ? AND deleted_at IS NULL`,
            [updatedBy, id, tenantId]
        );

        const [result] = await connection.query(
            `UPDATE students SET deleted_at = NOW(), status = 2, updated_by = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
            [updatedBy, id, tenantId]
        );

        await connection.commit();
        connection.release();

        return result.affectedRows > 0;
    } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
    }
};

/**
 * Get dropdown academic options (branches, courses, programs, levels, batches, subject_bundles, academic_years).
 * If accessContext is provided with scope 'BRANCH', options are filtered specifically to that branch.
 */
const getAcademicOptions = async (tenantId, accessContext = null) => {
    const tid = Number(tenantId);
    const isBranchScope = accessContext && accessContext.scope === 'BRANCH' && accessContext.authorizedBranchId;
    const branchId = isBranchScope ? Number(accessContext.authorizedBranchId) : null;

    const safeQuery = async (label, sql, params) => {
        try {
            const [rows] = await pool.query(sql, params);
            return rows;
        } catch (err) {
            console.error(`[getAcademicOptions] ${label} error:`, err.message);
            return [];
        }
    };

    // 1. Branches
    let branches = [];
    let branch = null;
    if (isBranchScope) {
        branches = await safeQuery('branches',
            `SELECT id, name FROM branches WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL`,
            [tid, branchId]
        );
        branch = branches[0] || { id: branchId, name: 'Assigned Branch' };
    } else {
        branches = await safeQuery('branches',
            `SELECT id, name FROM branches WHERE tenant_id = ? AND deleted_at IS NULL AND status = 'active' ORDER BY name ASC`,
            [tid]
        );
    }

    // 2. Courses (Assigned to branch if in branch scope, otherwise all active courses)
    let courses = [];
    if (isBranchScope) {
        courses = await safeQuery('courses',
            `SELECT DISTINCT c.id, c.name, c.code 
             FROM courses c
             JOIN course_branches cb ON cb.course_id = c.id
             WHERE c.tenant_id = ? AND cb.branch_id = ? AND c.deleted_at IS NULL AND c.is_active = 1
             ORDER BY c.name ASC`,
            [tid, branchId]
        );
    } else {
        courses = await safeQuery('courses',
            `SELECT id, name, code FROM courses WHERE tenant_id = ? AND deleted_at IS NULL AND is_active = 1 ORDER BY name ASC`,
            [tid]
        );
    }

    // 3. Programs (Assigned to branch if in branch scope, otherwise all active programs)
    let programs = [];
    if (isBranchScope) {
        programs = await safeQuery('programs',
            `SELECT DISTINCT p.id, p.course_id, p.name, p.code 
             FROM programs p
             JOIN branch_programs bp ON bp.program_id = p.id
             WHERE p.tenant_id = ? AND bp.branch_id = ? AND p.deleted_at IS NULL AND p.is_active = 1
             ORDER BY p.name ASC`,
            [tid, branchId]
        );
    } else {
        programs = await safeQuery('programs',
            `SELECT id, course_id, name, code FROM programs WHERE tenant_id = ? AND deleted_at IS NULL AND is_active = 1 ORDER BY name ASC`,
            [tid]
        );
    }

    // 3b. Course & Program branch assignment mappings for frontend filtering
    const courseBranches = await safeQuery('courseBranches',
        `SELECT DISTINCT cb.course_id, cb.branch_id 
         FROM course_branches cb
         JOIN courses c ON c.id = cb.course_id AND c.deleted_at IS NULL AND c.is_active = 1
         WHERE c.tenant_id = ?`,
        [tid]
    );

    const branchPrograms = await safeQuery('branchPrograms',
        `SELECT DISTINCT bp.program_id, bp.course_id, bp.branch_id 
         FROM branch_programs bp
         JOIN programs p ON p.id = bp.program_id AND p.deleted_at IS NULL AND p.is_active = 1
         WHERE bp.tenant_id = ?`,
        [tid]
    );

    // 4. Levels
    let levels = [];
    if (isBranchScope) {
        const courseIds = courses.map(c => c.id);
        const programIds = programs.map(p => p.id);
        if (courseIds.length > 0 || programIds.length > 0) {
            levels = await safeQuery('levels',
                `SELECT id, course_id, program_id, name FROM levels 
                 WHERE tenant_id = ? AND deleted_at IS NULL 
                   AND (course_id IN (?) OR program_id IN (?))
                 ORDER BY name ASC`,
                [tid, courseIds.length ? courseIds : [-1], programIds.length ? programIds : [-1]]
            );
        }
    } else {
        levels = await safeQuery('levels',
            `SELECT id, course_id, program_id, name FROM levels WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name ASC`,
            [tid]
        );
    }

    // 5. Batches
    let batches = [];
    if (isBranchScope) {
        batches = await safeQuery('batches',
            `SELECT id, branch_id, level_id, name, code FROM batches 
             WHERE tenant_id = ? AND branch_id = ? AND deleted_at IS NULL AND (status = 1 OR status = '1' OR status = 'active') 
             ORDER BY name ASC`,
            [tid, branchId]
        );
    } else {
        batches = await safeQuery('batches',
            `SELECT id, branch_id, level_id, name, code FROM batches WHERE tenant_id = ? AND deleted_at IS NULL AND (status = 1 OR status = '1' OR status = 'active') ORDER BY name ASC`,
            [tid]
        );
    }

    // 6. Subject Bundles
    let bundles = [];
    if (isBranchScope) {
        bundles = await safeQuery('bundles',
            `SELECT id, branch_id, level_id, name, description, fee_amount, subject_ids FROM subject_bundles 
             WHERE tenant_id = ? AND (branch_id = ? OR branch_id IS NULL) AND deleted_at IS NULL AND is_active = 1 
             ORDER BY name ASC`,
            [tid, branchId]
        );
    } else {
        bundles = await safeQuery('bundles',
            `SELECT id, branch_id, level_id, name, description, fee_amount, subject_ids FROM subject_bundles WHERE tenant_id = ? AND deleted_at IS NULL AND is_active = 1 ORDER BY name ASC`,
            [tid]
        );
    }

    // 7. Subjects
    const subjects = await safeQuery('subjects',
        `SELECT id, name, code, type FROM subjects WHERE tenant_id = ? AND deleted_at IS NULL AND status = 'active' ORDER BY name ASC`,
        [tid]
    );

    // 8. Level Subjects with fees
    const levelSubjects = await safeQuery('levelSubjects',
        `SELECT 
            ls.level_id, 
            l.course_id,
            l.program_id,
            s.id, 
            s.name, 
            s.code, 
            s.type,
            COALESCE(sf.fee_amount, 0) AS fee_amount
         FROM level_subjects ls
         JOIN subjects s ON s.id = ls.subject_id AND s.deleted_at IS NULL
         JOIN levels l ON l.id = ls.level_id AND l.deleted_at IS NULL
         LEFT JOIN subject_fees sf ON sf.level_id = ls.level_id AND sf.subject_id = ls.subject_id AND sf.deleted_at IS NULL
         WHERE ls.tenant_id = ?
         ORDER BY s.name ASC`,
        [tid]
    );

    // 9. Academic Years
    const academicYears = await safeQuery('academicYears',
        `SELECT id, name, status FROM academic_years WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY start_date DESC`,
        [tid]
    );

    const parsedBundles = (bundles || []).map(b => {
        let sIds = [];
        try {
            sIds = typeof b.subject_ids === 'string' ? JSON.parse(b.subject_ids) : (b.subject_ids || []);
        } catch (e) {
            sIds = [];
        }
        return {
            ...b,
            subject_ids: Array.isArray(sIds) ? sIds : []
        };
    });

    return {
        ...(branch ? { branch } : {}),
        branches,
        courses,
        programs,
        courseBranches,
        branchPrograms,
        levels,
        batches,
        bundles: parsedBundles,
        subjects,
        levelSubjects,
        academicYears
    };
};

const saveStudentDocuments = async (tenantId, studentId, documents = [], createdBy = 1, connection = null) => {
    if (!documents || !documents.length) return [];
    const conn = connection || await pool.getConnection();
    const shouldRelease = !connection;

    try {
        const [docTypes] = await conn.query(`SELECT id, name, code FROM document_types WHERE deleted_at IS NULL`);
        const typeMapByName = {};
        const typeMapByCode = {};
        docTypes.forEach(t => {
            typeMapByName[String(t.name).toLowerCase()] = t.id;
            typeMapByCode[String(t.code).toLowerCase()] = t.id;
        });

        const defaultTypeId = docTypes[0]?.id || 1;

        for (const doc of documents) {
            const rawType = String(doc.type || doc.document_type || doc.name || '').toLowerCase();
            let matchedTypeId = doc.document_type_id || typeMapByName[rawType] || typeMapByCode[rawType];
            if (!matchedTypeId) {
                if (rawType.includes('photo')) matchedTypeId = typeMapByCode['student_photo'] || 1;
                else if (rawType.includes('aadhar') || rawType.includes('aadhaar') || rawType.includes('id proof')) matchedTypeId = typeMapByCode['aadhaar_card'] || 2;
                else if (rawType.includes('mark') || rawType.includes('sheet')) matchedTypeId = typeMapByCode['previous_marksheet'] || 3;
                else if (rawType.includes('transfer') || rawType.includes('tc')) matchedTypeId = typeMapByCode['transfer_certificate'] || 4;
                else matchedTypeId = typeMapByCode['other'] || defaultTypeId;
            }

            const fileName = doc.fileName || doc.file_name || doc.name || 'document.pdf';
            const storageKey = doc.storage_key || doc.path || doc.url || `/uploads/documents/${studentId}-${Date.now()}-${fileName}`;
            const mimeType = doc.mime_type || (fileName.endsWith('.png') ? 'image/png' : fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') ? 'image/jpeg' : 'application/pdf');
            const docStatus = doc.status !== undefined ? Number(doc.status) : DOCUMENT_STATUS.PENDING;

            await conn.query(`
                INSERT INTO student_documents (
                    tenant_id, student_id, document_type_id, storage_key, file_name, mime_type, status, created_by, updated_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                tenantId,
                studentId,
                matchedTypeId,
                storageKey,
                fileName,
                mimeType,
                docStatus,
                createdBy,
                createdBy
            ]);
        }
    } finally {
        if (shouldRelease) conn.release();
    }
};

const getStudentDocuments = async (tenantId, studentId) => {
    const [rows] = await pool.query(`
        SELECT 
            sd.id,
            sd.tenant_id,
            sd.student_id,
            sd.document_type_id,
            dt.name AS document_type_name,
            dt.code AS document_type_code,
            dt.is_required,
            sd.storage_key,
            sd.file_name,
            sd.mime_type,
            sd.status,
            sd.verified_by,
            u.name AS verified_by_name,
            sd.verified_at,
            sd.rejection_reason,
            sd.created_at,
            sd.updated_at
        FROM student_documents sd
        JOIN document_types dt ON sd.document_type_id = dt.id
        LEFT JOIN users u ON sd.verified_by = u.id
        WHERE sd.tenant_id = ? AND sd.student_id = ? AND sd.deleted_at IS NULL
        ORDER BY dt.is_required DESC, sd.id ASC
    `, [tenantId, Number(studentId)]);

    return rows.map(r => ({
        ...r,
        statusLabel: r.status === 1 ? 'Verified' : r.status === 2 ? 'Rejected' : 'Verification Pending'
    }));
};

const updateStudentDocumentStatus = async (tenantId, studentId, documentId, status, rejectionReason = null, verifiedBy = 1) => {
    const numStatus = Number(status);
    await pool.query(`
        UPDATE student_documents
        SET status = ?, verified_by = ?, verified_at = NOW(), rejection_reason = ?, updated_by = ?
        WHERE tenant_id = ? AND student_id = ? AND id = ?
    `, [
        numStatus,
        verifiedBy,
        numStatus === 2 ? rejectionReason : null,
        verifiedBy,
        tenantId,
        Number(studentId),
        Number(documentId)
    ]);

    // Check if all required documents for this student are now verified
    const [counts] = await pool.query(`
        SELECT 
            COUNT(DISTINCT dt.id) as total_required,
            SUM(CASE WHEN sd.status = 1 THEN 1 ELSE 0 END) as verified_count
        FROM student_documents sd
        JOIN document_types dt ON sd.document_type_id = dt.id
        WHERE sd.tenant_id = ? AND sd.student_id = ? AND sd.deleted_at IS NULL AND dt.is_required = 1
    `, [tenantId, Number(studentId)]);

    if (counts[0] && counts[0].total_required > 0 && Number(counts[0].verified_count) >= Number(counts[0].total_required)) {
        // Automatically mark student as Documents Verified (status = 5)
        await pool.query(`
            UPDATE students
            SET status = 5, updated_by = ?
            WHERE tenant_id = ? AND id = ? AND status IN (3, 4)
        `, [verifiedBy, tenantId, Number(studentId)]);
    }

    return getStudentDocuments(tenantId, studentId);
};

module.exports = {
    STUDENT_STATUS,
    DOCUMENT_STATUS,
    normalizeStudentStatus,
    getStudents,
    getStudentById,
    createStudent,
    updateStudent,
    deleteStudent,
    getAcademicOptions,
    saveStudentDocuments,
    getStudentDocuments,
    updateStudentDocumentStatus
};
