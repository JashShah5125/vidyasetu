const pool = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * Get student roster list with optional filters and pagination.
 */
const getStudents = async (tenantId, filters = {}) => {
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

    if (branchId && branchId !== 'All') {
        whereClause += ` AND s.primary_branch_id = ?`;
        params.push(branchId);
    }

    if (batchId && batchId !== 'All') {
        whereClause += ` AND se.batch_id = ?`;
        params.push(batchId);
    }

    if (status && status !== 'All') {
        whereClause += ` AND s.status = ?`;
        params.push(status);
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
 * Get detailed student profile by ID.
 */
const getStudentById = async (tenantId, id) => {
    const query = `
        SELECT 
            s.*,
            b.name AS branch_name,
            se.id AS enrollment_id,
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
    `;

    const [rows] = await pool.query(query, [tenantId, id]);
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
const createStudent = async (tenantId, studentData, createdBy = 1) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

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
            studentData.primary_branch_id,
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
            studentData.status || 'active',
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
        if (studentData.batch_id && studentData.academic_year_id) {
            const selectionType = studentData.subject_selection_type === 'custom' ? 'custom' : 'bundle';
            const bundleId = selectionType === 'bundle' && studentData.bundle_id ? Number(studentData.bundle_id) : null;
            const customSubjectIds = selectionType === 'custom' && Array.isArray(studentData.custom_subject_ids)
                ? JSON.stringify(studentData.custom_subject_ids.map(Number))
                : (selectionType === 'custom' && typeof studentData.custom_subject_ids === 'string' ? studentData.custom_subject_ids : null);

            await connection.query(`
                INSERT INTO student_enrollments (
                    tenant_id, branch_id, student_id, batch_id, bundle_id, subject_selection_type, custom_subject_ids, academic_year_id, enrolled_date, status, created_by, updated_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'active', ?, ?)
            `, [
                tenantId,
                studentData.primary_branch_id,
                studentId,
                studentData.batch_id,
                bundleId,
                selectionType,
                customSubjectIds,
                studentData.academic_year_id,
                createdBy,
                createdBy
            ]);

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
            const balanceDue = Math.max(0, netAmount - paidAmount);
            const status = balanceDue === 0 ? 'paid' : (paidAmount > 0 ? 'partially_paid' : 'pending');

            const [feeRes] = await connection.query(`
                INSERT INTO student_fee_assignments (
                    tenant_id, student_id, gross_amount, discount_amount, net_amount,
                    downpayment_amount, installment_count, installment_amount,
                    paid_amount, balance_due, status, created_by, updated_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                tenantId,
                studentId,
                grossAmount,
                discountAmount,
                netAmount,
                downpaymentAmount,
                installmentCount,
                installmentAmount,
                paidAmount,
                balanceDue,
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
                        tenant_id, student_id, fee_assignment_id, invoice_number, installment_number,
                        description, issue_date, due_date, billed_amount, paid_amount, balance_due,
                        status, payment_date, payment_mode, transaction_ref, created_by, updated_by
                    ) VALUES (?, ?, ?, ?, 0, 'Admission Downpayment', CURDATE(), CURDATE(), ?, ?, 0, 'paid', NOW(), 'UPI', ?, ?, ?)
                `, [
                    tenantId,
                    studentId,
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
                        tenant_id, student_id, fee_assignment_id, invoice_number, installment_number,
                        description, issue_date, due_date, billed_amount, paid_amount, balance_due,
                        status, created_by, updated_by
                    ) VALUES (?, ?, ?, ?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? MONTH), ?, 0, ?, 'unpaid', ?, ?)
                `, [
                    tenantId,
                    studentId,
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

        return getStudentById(tenantId, studentId);
    } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
    }
};

/**
 * Update existing student profile, user account, and academic linkages.
 */
const updateStudent = async (tenantId, id, updateData, updatedBy = 1) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Update students table
        await connection.query(`
            UPDATE students SET
                primary_branch_id = COALESCE(?, primary_branch_id),
                full_name = COALESCE(?, full_name),
                dob = COALESCE(?, dob),
                gender = COALESCE(?, gender),
                mobile = COALESCE(?, mobile),
                email = COALESCE(?, email),
                street = COALESCE(?, street),
                city = COALESCE(?, city),
                state = COALESCE(?, state),
                pincode = COALESCE(?, pincode),
                category = COALESCE(?, category),
                school_name = COALESCE(?, school_name),
                current_class = COALESCE(?, current_class),
                target_exam = COALESCE(?, target_exam),
                year_of_attempt = COALESCE(?, year_of_attempt),
                status = COALESCE(?, status),
                updated_by = ?,
                updated_at = NOW()
            WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
        `, [
            updateData.primary_branch_id,
            updateData.full_name,
            updateData.dob,
            updateData.gender,
            updateData.mobile,
            updateData.email,
            updateData.street,
            updateData.city,
            updateData.state,
            updateData.pincode,
            updateData.category,
            updateData.school_name,
            updateData.current_class,
            updateData.target_exam,
            updateData.year_of_attempt,
            updateData.status,
            updatedBy,
            id,
            tenantId
        ]);

        // 2. Also update users table name & mobile if user_id linked
        const [studentRows] = await connection.query(
            `SELECT user_id FROM students WHERE id = ? AND tenant_id = ?`,
            [id, tenantId]
        );
        if (studentRows.length > 0 && studentRows[0].user_id) {
            await connection.query(`
                UPDATE users SET
                    name = COALESCE(?, name),
                    mobile = COALESCE(?, mobile)
                WHERE id = ? AND tenant_id = ?
            `, [updateData.full_name, updateData.mobile, studentRows[0].user_id, tenantId]);
        }

        // 3. Update guardian if provided
        if (updateData.guardian_name) {
            const [sgRows] = await connection.query(
                `SELECT guardian_id FROM student_guardians WHERE student_id = ? AND tenant_id = ? AND is_primary = 1`,
                [id, tenantId]
            );
            if (sgRows.length > 0) {
                await connection.query(`
                    UPDATE guardians SET
                        full_name = COALESCE(?, full_name),
                        mobile = COALESCE(?, mobile),
                        email = COALESCE(?, email),
                        relation = COALESCE(?, relation),
                        updated_by = ?
                    WHERE id = ? AND tenant_id = ?
                `, [
                    updateData.guardian_name,
                    updateData.guardian_mobile,
                    updateData.guardian_email,
                    updateData.guardian_relation,
                    updatedBy,
                    sgRows[0].guardian_id,
                    tenantId
                ]);
            }
        }

        await connection.commit();
        connection.release();

        return getStudentById(tenantId, id);
    } catch (error) {
        await connection.rollback();
        connection.rollback();
        throw error;
    }
};

/**
 * Soft delete student.
 */
const deleteStudent = async (tenantId, id, updatedBy = 1) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

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

        await connection.query(
            `UPDATE student_enrollments SET deleted_at = NOW(), status = 'cancelled', updated_by = ? WHERE student_id = ? AND tenant_id = ?`,
            [updatedBy, id, tenantId]
        );

        const [result] = await connection.query(
            `UPDATE students SET deleted_at = NOW(), updated_by = ? WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
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
 */
const getAcademicOptions = async (tenantId) => {
    const tid = Number(tenantId);
    console.log('[getAcademicOptions] tenantId =', tid, '| type =', typeof tid);

    const safeQuery = async (label, sql, params) => {
        try {
            const [rows] = await pool.query(sql, params);
            console.log(`[getAcademicOptions] ${label}: ${rows.length} rows`);
            return rows;
        } catch (err) {
            console.error(`[getAcademicOptions] ${label} FAILED:`, err.message);
            return [];
        }
    };

    const branches = await safeQuery('branches',
        `SELECT id, name FROM branches WHERE tenant_id = ? AND deleted_at IS NULL AND status = 'active' ORDER BY name ASC`,
        [tid]
    );

    const courses = await safeQuery('courses',
        `SELECT id, name FROM courses WHERE tenant_id = ? AND deleted_at IS NULL AND is_active = 1 ORDER BY name ASC`,
        [tid]
    );

    const programs = await safeQuery('programs',
        `SELECT id, course_id, name, code FROM programs WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name ASC`,
        [tid]
    );

    const levels = await safeQuery('levels',
        `SELECT id, course_id, program_id, name FROM levels WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name ASC`,
        [tid]
    );

    const batches = await safeQuery('batches',
        `SELECT id, branch_id, level_id, name, code FROM batches WHERE tenant_id = ? AND deleted_at IS NULL AND status = 'active' ORDER BY name ASC`,
        [tid]
    );

    const bundles = await safeQuery('bundles',
        `SELECT id, branch_id, level_id, name, description, fee_amount, subject_ids FROM subject_bundles WHERE tenant_id = ? AND deleted_at IS NULL AND is_active = 1 ORDER BY name ASC`,
        [tid]
    );

    const subjects = await safeQuery('subjects',
        `SELECT id, name, code, type FROM subjects WHERE tenant_id = ? AND deleted_at IS NULL AND status = 'active' ORDER BY name ASC`,
        [tid]
    );

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

