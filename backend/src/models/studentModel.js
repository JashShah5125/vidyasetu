const pool = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * Normalizes student status to TINYINT:
 * 0 = inactive, 1 = active, 2 = deleted
 */
const normalizeStudentStatus = (status) => {
    if (status === undefined || status === null) return 1;
    if (typeof status === 'number') {
        return [0, 1, 2].includes(status) ? status : 1;
    }
    const s = String(status).trim().toLowerCase();
    if (s === '1' || s === 'active') return 1;
    if (s === '0' || s === 'inactive' || s === 'suspended' || s === 'registration_pending') return 0;
    if (s === '2' || s === 'deleted' || s === 'cancelled') return 2;
    return 1;
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
    } else if (branchId && branchId !== 'All') {
        whereClause += ` AND (s.primary_branch_id = ? OR se.branch_id = ?)`;
        params.push(branchId, branchId);
    }

    // Latest fee assignment per student (latest row per student_id via rn=1)
    const faJoin = `
        LEFT JOIN (
            SELECT student_id, tenant_id, gross_amount, total_concession, net_amount,
                   down_payment, installment_count, installment_amount,
                   paid_amount, balance_amount, status,
                   ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY id DESC) AS rn
            FROM student_fee_assignments
        ) fa ON fa.student_id = s.id AND fa.tenant_id = s.tenant_id AND fa.rn = 1
    `;

    if (search && search.trim() !== '') {
        const term = `%${search.trim()}%`;
        whereClause += ` AND (s.full_name LIKE ? OR s.student_code LIKE ? OR s.mobile LIKE ? OR s.email LIKE ?)`;
        params.push(term, term, term, term);
    }

    if (batchId && batchId !== 'All') {
        whereClause += ` AND se.batch_id = ?`;
        params.push(batchId);
    }

    if (status !== undefined && status !== 'All' && status !== '') {
        const numStatus = normalizeStudentStatus(status);
        whereClause += ` AND s.status = ?`;
        params.push(numStatus);
    }

    if (feeStatus && feeStatus !== 'All') {
        whereClause += ` AND fa.status = ?`;
        params.push(feeStatus);
    }

    const countQuery = `
        SELECT COUNT(DISTINCT s.id) as total 
        FROM students s
        LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.deleted_at IS NULL AND se.status = 'active'
        ${faJoin}
        ${whereClause}
    `;

    const [countRows] = await pool.query(countQuery, params);
    const total = countRows[0] ? countRows[0].total : 0;

    const selectQuery = `
        SELECT 
            s.id,
            s.tenant_id,
            s.user_id,
            s.primary_branch_id,
            b.name AS branch_name,
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
            fa.status AS fee_status
        FROM students s
        LEFT JOIN branches b ON s.primary_branch_id = b.id AND b.tenant_id = s.tenant_id
        LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.deleted_at IS NULL AND se.status = 'active'
        LEFT JOIN batches bat ON se.batch_id = bat.id AND bat.tenant_id = s.tenant_id
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

    return {
        total,
        data: rows
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
            }
        }

        // 5. Dynamic Partial Update on `student_fee_assignments` table
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

    // 2. Courses
    let courses = [];
    if (isBranchScope) {
        courses = await safeQuery('courses',
            `SELECT DISTINCT c.id, c.name 
             FROM courses c
             JOIN course_branches cb ON cb.course_id = c.id
             WHERE c.tenant_id = ? AND cb.branch_id = ? AND c.deleted_at IS NULL AND c.is_active = 1
             ORDER BY c.name ASC`,
            [tid, branchId]
        );
        // Fallback to all tenant courses if no explicit branch course mappings exist
        if (!courses.length) {
            courses = await safeQuery('courses_fallback',
                `SELECT id, name FROM courses WHERE tenant_id = ? AND deleted_at IS NULL AND is_active = 1 ORDER BY name ASC`,
                [tid]
            );
        }
    } else {
        courses = await safeQuery('courses',
            `SELECT id, name FROM courses WHERE tenant_id = ? AND deleted_at IS NULL AND is_active = 1 ORDER BY name ASC`,
            [tid]
        );
    }

    // 3. Programs
    let programs = [];
    if (isBranchScope) {
        programs = await safeQuery('programs',
            `SELECT DISTINCT p.id, p.course_id, p.name, p.code 
             FROM programs p
             JOIN branch_programs bp ON bp.program_id = p.id
             WHERE p.tenant_id = ? AND bp.branch_id = ? AND p.deleted_at IS NULL
             ORDER BY p.name ASC`,
            [tid, branchId]
        );
        // Fallback to programs under the available courses if no explicit branch program mappings exist
        if (!programs.length) {
            const courseIds = courses.map(c => c.id);
            if (courseIds.length > 0) {
                programs = await safeQuery('programs_fallback',
                    `SELECT id, course_id, name, code FROM programs WHERE tenant_id = ? AND course_id IN (?) AND deleted_at IS NULL ORDER BY name ASC`,
                    [tid, courseIds]
                );
            }
        }
    } else {
        programs = await safeQuery('programs',
            `SELECT id, course_id, name, code FROM programs WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name ASC`,
            [tid]
        );
    }

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

    // 8. Level Subjects
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
        levels,
        batches,
        bundles: parsedBundles,
        subjects,
        levelSubjects,
        academicYears
    };
};

module.exports = {
    getStudents,
    getStudentById,
    createStudent,
    updateStudent,
    deleteStudent,
    getAcademicOptions
};
