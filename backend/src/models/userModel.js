const pool = require('../config/db');

const findUserByEmail = async (email, tenantId = null) => {
    if (tenantId) {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND tenant_id = ?', [email, tenantId]);
        return rows;
    }
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows;
};

const findUserById = async (userId) => {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    return rows[0];
};

const getUserFullDetails = async (userId) => {
    const [userRows] = await pool.query(
        `SELECT u.id, u.tenant_id, u.name, u.email, u.mobile, u.user_type, u.status, u.app_access_suspended, u.must_change_password, u.last_login_at, u.created_at, u.updated_at,
                t.name AS tenant_name, t.slug AS tenant_slug
         FROM users u
         LEFT JOIN tenants t ON u.tenant_id = t.id
         WHERE u.id = ? AND u.deleted_at IS NULL`,
        [userId]
    );

    if (!userRows || userRows.length === 0) return null;
    const user = userRows[0];

    // Fetch assigned roles
    const [roles] = await pool.query(
        `SELECT r.id, r.name, r.code, r.description, r.is_system, ur.assigned_at
         FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id = ? AND ur.revoked_at IS NULL AND r.deleted_at IS NULL`,
        [userId]
    );

    // Fetch permissions grouped per role
    const [rolePermissions] = await pool.query(
        `SELECT r.id AS role_id, r.name AS role_name, r.code AS role_code, p.id AS permission_id, p.module, p.action, p.code AS permission_code, p.description
         FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         JOIN role_permissions rp ON r.id = rp.role_id
         JOIN permissions p ON rp.permission_id = p.id
         WHERE ur.user_id = ? AND ur.revoked_at IS NULL AND p.deleted_at IS NULL
         ORDER BY r.name ASC, p.module ASC`,
        [userId]
    );

    // Group permissions by role
    const roleWiseMap = {};
    for (const rp of rolePermissions) {
        if (!roleWiseMap[rp.role_code]) {
            roleWiseMap[rp.role_code] = {
                role_id: rp.role_id,
                role_name: rp.role_name,
                role_code: rp.role_code,
                permissions: []
            };
        }
        roleWiseMap[rp.role_code].permissions.push({
            id: rp.permission_id,
            module: rp.module,
            action: rp.action,
            code: rp.permission_code,
            description: rp.description
        });
    }

    user.assigned_roles = roles;
    user.role_wise_permissions = Object.values(roleWiseMap);

    // Fetch user-specific permission overrides
    const [overrides] = await pool.query(
        `SELECT op.id, op.permission_id, op.override_type, op.created_at,
                p.module, p.action, p.code AS permission_code, p.description
         FROM overridden_permissions op
         JOIN permissions p ON op.permission_id = p.id
         WHERE op.user_id = ? AND p.deleted_at IS NULL
         ORDER BY p.module ASC, p.code ASC`,
        [userId]
    );

    const baseRolePermIds = new Set(rolePermissions.map(rp => rp.permission_id));
    user.overridden_permissions = overrides.map(o => ({
        ...o,
        base_role_status: baseRolePermIds.has(o.permission_id) ? 'Granted' : 'Not Granted',
        effective_status: o.override_type === 'grant' ? 'Granted' : 'Denied'
    }));

    // ================= ROLE-WISE DATA RESOLUTION ENGINE =================
    // Extract set of role codes possessed by this user
    const roleCodes = new Set((user.assigned_roles || []).map(r => r.code.toLowerCase()));
    
    // Fallback if no roles explicitly assigned yet in user_roles table
    if (roleCodes.size === 0 && user.user_type) {
        const uType = user.user_type.toLowerCase();
        if (uType.includes('student')) roleCodes.add('student');
        else if (uType.includes('teach') || uType.includes('facult')) roleCodes.add('teacher');
        else if (uType.includes('parent') || uType.includes('guard')) roleCodes.add('parent');
        else if (uType.includes('counsel')) roleCodes.add('counsellor');
        else if (uType.includes('finan')) roleCodes.add('finance');
        else if (uType.includes('branch')) roleCodes.add('branch_admin');
        else if (uType.includes('inst') || uType.includes('saas') || uType.includes('admin')) roleCodes.add('inst_admin');
    }

    user.role_data = {};

    // 1. Branch Access Matrix (Applicable to all users)
    try {
        const [branchAccess] = await pool.query(
            `SELECT b.id, b.name, b.code, b.address_line1 AS address, b.city, b.state, uba.is_primary, uba.granted_at, uba.granted_at AS created_at
             FROM user_branch_access uba
             JOIN branches b ON uba.branch_id = b.id
             WHERE uba.user_id = ? AND uba.revoked_at IS NULL AND b.deleted_at IS NULL`,
            [userId]
        );
        user.branch_access = branchAccess;
    } catch (e) {
        user.branch_access = [];
    }

    // 2. ROLE: STUDENT
    if (roleCodes.has('student')) {
        try {
            const [studentRows] = await pool.query(
                `SELECT s.id, s.student_code, s.full_name, s.dob, s.gender, s.mobile, s.email,
                        s.street, s.city, s.state, s.pincode, s.category, s.school_name, s.current_class,
                        s.target_exam, s.year_of_attempt, s.blood_group, s.status, s.primary_branch_id, s.created_at,
                        b.name AS primary_branch_name, b.code AS primary_branch_code
                 FROM students s
                 LEFT JOIN branches b ON s.primary_branch_id = b.id
                 WHERE (s.user_id = ? OR (s.email = ? AND s.tenant_id = ?) OR (s.mobile = ? AND s.tenant_id = ?)) AND s.deleted_at IS NULL
                 LIMIT 1`,
                [userId, user.email, user.tenant_id, user.mobile, user.tenant_id]
            );

            if (studentRows.length > 0) {
                const student = studentRows[0];

                // Enrolled Batches
                const [enrollments] = await pool.query(
                    `SELECT se.id AS enrollment_id, se.enrolled_date, se.status AS enrollment_status, se.batch_id,
                            b.name AS batch_name, b.code AS batch_code,
                            l.name AS level_name
                     FROM student_enrollments se
                     JOIN batches b ON se.batch_id = b.id
                     LEFT JOIN levels l ON b.level_id = l.id
                     WHERE se.student_id = ? AND se.deleted_at IS NULL`,
                    [student.id]
                );
                student.enrollments = enrollments;

                // Guardians
                const [guardians] = await pool.query(
                    `SELECT g.id, g.full_name, g.relation, g.mobile, g.email, g.occupation, sg.is_primary
                     FROM student_guardians sg
                     JOIN guardians g ON sg.guardian_id = g.id
                     WHERE sg.student_id = ? AND g.deleted_at IS NULL`,
                    [student.id]
                );
                student.guardians = guardians;

                // Invoices & Billing Overview
                try {
                    const [invoices] = await pool.query(
                        `SELECT si.id, si.invoice_number, si.amount AS total_amount, si.paid_amount, si.balance_due AS balance_amount, si.status, si.due_date, si.created_at
                         FROM student_invoices si
                         WHERE si.student_id = ?
                         ORDER BY si.created_at DESC
                         LIMIT 5`,
                        [student.id]
                    );
                    student.invoices = invoices;
                } catch (invErr) {
                    student.invoices = [];
                }

                // Attendance Summary
                try {
                    const [attSummary] = await pool.query(
                        `SELECT 
                           COUNT(*) AS total_days,
                           SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS present_days,
                           SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) AS absent_days,
                           SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS late_days
                         FROM attendance_records
                         WHERE student_id = ?`,
                        [student.id]
                    );
                    student.attendance_summary = attSummary[0] || { total_days: 0, present_days: 0, absent_days: 0, late_days: 0 };
                } catch (attErr) {
                    student.attendance_summary = { total_days: 0, present_days: 0, absent_days: 0, late_days: 0 };
                }

                // Recent Exam Tests
                try {
                    const [examResults] = await pool.query(
                        `SELECT em.id, em.marks_obtained, em.grade, em.is_absent,
                                e.name AS exam_name, e.total_marks, e.exam_date
                         FROM exam_marks em
                         JOIN exams e ON em.exam_id = e.id
                         JOIN student_enrollments se ON em.enrollment_id = se.id
                         WHERE se.student_id = ? AND e.deleted_at IS NULL
                         ORDER BY e.exam_date DESC
                         LIMIT 5`,
                        [student.id]
                    );
                    student.exam_results = examResults;
                } catch (exErr) {
                    student.exam_results = [];
                }

                // Doubts Stats
                try {
                    const [doubtStats] = await pool.query(
                        `SELECT 
                           COUNT(*) AS total_doubts,
                           SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS resolved_doubts
                         FROM student_doubts
                         WHERE student_id = ? AND deleted_at IS NULL`,
                        [student.id]
                    );
                    student.doubt_stats = doubtStats[0] || { total_doubts: 0, resolved_doubts: 0 };
                } catch (dErr) {
                    student.doubt_stats = { total_doubts: 0, resolved_doubts: 0 };
                }

                user.student_profile = student;
                user.role_data.student = student;
            }
        } catch (e) {
            console.error('Error fetching role:student data:', e);
        }
    }

    // 3. ROLE: TEACHER / FACULTY
    if (roleCodes.has('teacher')) {
        try {
            const [staffRows] = await pool.query(
                `SELECT sp.id, sp.employee_id, sp.first_name, sp.last_name, sp.contact_number, sp.alternate_mobile,
                        sp.personal_email, sp.gender, sp.dob, sp.employee_type, sp.designation, sp.department, sp.joining_date,
                        sp.employment_type, sp.employment_status, sp.qualification, sp.experience,
                        sp.salary_type, sp.salary_amount, sp.address, sp.city, sp.state, sp.pincode,
                        sp.max_lectures_per_day, sp.max_lectures_per_week, sp.working_days, sp.status, sp.created_at
                 FROM staff_profiles sp
                 WHERE (sp.user_id = ? OR (sp.personal_email = ? AND sp.tenant_id = ?) OR (sp.contact_number = ? AND sp.tenant_id = ?)) AND sp.deleted_at IS NULL
                 LIMIT 1`,
                [userId, user.email, user.tenant_id, user.mobile, user.tenant_id]
            );

            const teacherData = staffRows.length > 0 ? staffRows[0] : {};

            // 1. Teacher Batch Allocations
            try {
                const [teacherAllocations] = await pool.query(
                    `SELECT ta.id, ta.batch_id, b.name AS batch_name, b.code AS batch_code,
                            l.name AS level_name, br.name AS branch_name
                     FROM teacher_allocations ta
                     JOIN batches b ON ta.batch_id = b.id
                     LEFT JOIN levels l ON b.level_id = l.id
                     LEFT JOIN branches br ON ta.branch_id = br.id
                     WHERE ta.teacher_user_id = ? AND ta.deleted_at IS NULL AND b.deleted_at IS NULL`,
                    [userId]
                );
                teacherData.allocations = teacherAllocations;
                user.teacher_allocations = teacherAllocations;
            } catch (allocErr) {
                teacherData.allocations = [];
            }

            // 2. Teacher Specialized Subjects
            try {
                const [subjects] = await pool.query(
                    `SELECT ts.id, ts.subject_id, s.name AS subject_name, s.code AS subject_code
                     FROM teacher_subjects ts
                     JOIN subjects s ON ts.subject_id = s.id
                     WHERE ts.teacher_user_id = ?`,
                    [userId]
                );
                teacherData.subjects = subjects;
            } catch (subErr) {
                teacherData.subjects = [];
            }

            // 3. Lectures Statistics & Recent/Upcoming Lectures List
            try {
                const [lectureStats] = await pool.query(
                    `SELECT 
                       COUNT(*) AS total_assigned_lectures,
                       SUM(CASE WHEN status = 'completed' OR attendance_taken = 1 OR (lecture_date < CURDATE() AND status != 'cancelled') THEN 1 ELSE 0 END) AS conducted_lectures,
                       SUM(CASE WHEN (lecture_date >= CURDATE() AND (status IS NULL OR status = 'scheduled' OR status = 'active')) THEN 1 ELSE 0 END) AS upcoming_lectures,
                       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_lectures
                     FROM lectures
                     WHERE teacher_user_id = ? AND deleted_at IS NULL`,
                    [userId]
                );
                teacherData.lecture_stats = lectureStats[0] || { total_assigned_lectures: 0, conducted_lectures: 0, upcoming_lectures: 0, cancelled_lectures: 0 };

                const [recentLectures] = await pool.query(
                    `SELECT l.id, l.lecture_date, l.start_time, l.end_time, l.topic, l.status, l.attendance_taken,
                            b.name AS batch_name, b.code AS batch_code, s.name AS subject_name
                     FROM lectures l
                     LEFT JOIN batches b ON l.batch_id = b.id
                     LEFT JOIN subjects s ON l.subject_id = s.id
                     WHERE l.teacher_user_id = ? AND l.deleted_at IS NULL
                     ORDER BY l.lecture_date DESC, l.start_time DESC
                     LIMIT 5`,
                    [userId]
                );
                teacherData.recent_lectures = recentLectures;
            } catch (lecErr) {
                teacherData.lecture_stats = { total_assigned_lectures: 0, conducted_lectures: 0, upcoming_lectures: 0, cancelled_lectures: 0 };
                teacherData.recent_lectures = [];
            }

            // 4. Homeworks & Assignments Created
            try {
                const [hwStats] = await pool.query(
                    `SELECT COUNT(*) AS total_homeworks
                     FROM homeworks
                     WHERE created_by = ? AND deleted_at IS NULL`,
                    [userId]
                );
                teacherData.homework_stats = hwStats[0] || { total_homeworks: 0 };

                const [recentHomeworks] = await pool.query(
                    `SELECT h.id, h.title, h.assignment_type, h.due_date, h.max_marks, h.status,
                            s.name AS subject_name
                     FROM homeworks h
                     LEFT JOIN subjects s ON h.subject_id = s.id
                     WHERE h.created_by = ? AND h.deleted_at IS NULL
                     ORDER BY h.created_at DESC
                     LIMIT 5`,
                    [userId]
                );
                teacherData.recent_homeworks = recentHomeworks;
            } catch (hwErr) {
                teacherData.homework_stats = { total_homeworks: 0 };
                teacherData.recent_homeworks = [];
            }

            // 5. Doubts Answered / Resolved
            try {
                const [doubtStats] = await pool.query(
                    `SELECT COUNT(DISTINCT doubt_id) AS doubts_answered
                     FROM student_doubt_replies
                     WHERE sender_user_id = ?`,
                    [userId]
                );
                teacherData.doubts_answered = doubtStats[0]?.doubts_answered || 0;
            } catch (doubtErr) {
                teacherData.doubts_answered = 0;
            }

            // 6. Staff Attendance Summary & Leaves & Salary History
            if (teacherData.id) {
                try {
                    const [staffAtt] = await pool.query(
                        `SELECT 
                           COUNT(*) AS total_marked_days,
                           SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS present_days,
                           SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) AS absent_days
                         FROM staff_attendance
                         WHERE staff_id = ?`,
                        [teacherData.id]
                    );
                    const att = staffAtt[0] || { total_marked_days: 0, present_days: 0, absent_days: 0 };
                    const rate = att.total_marked_days > 0 ? Math.round(((att.present_days || 0) / att.total_marked_days) * 100) : 0;
                    teacherData.attendance_summary = { ...att, attendance_rate: rate };
                } catch (sAttErr) {
                    teacherData.attendance_summary = { total_marked_days: 0, present_days: 0, absent_days: 0, attendance_rate: 0 };
                }

                try {
                    const [leaveRows] = await pool.query(
                        `SELECT COUNT(*) AS total_leaves,
                                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_leaves,
                                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_leaves
                         FROM leave_requests
                         WHERE staff_id = ? AND deleted_at IS NULL`,
                        [teacherData.id]
                    );
                    teacherData.leave_summary = leaveRows[0] || { total_leaves: 0, approved_leaves: 0, pending_leaves: 0 };
                } catch (leaveErr) {
                    teacherData.leave_summary = { total_leaves: 0, approved_leaves: 0, pending_leaves: 0 };
                }

                try {
                    const [salRows] = await pool.query(
                        `SELECT id, salary_month, salary_year, amount, paid_date, payment_mode, reference
                         FROM staff_salary_payments
                         WHERE staff_id = ? AND deleted_at IS NULL
                         ORDER BY salary_year DESC, salary_month DESC
                         LIMIT 5`,
                        [teacherData.id]
                    );
                    teacherData.salary_history = salRows;
                } catch (salErr) {
                    teacherData.salary_history = [];
                }
            } else {
                teacherData.attendance_summary = { total_marked_days: 0, present_days: 0, absent_days: 0, attendance_rate: 0 };
                teacherData.leave_summary = { total_leaves: 0, approved_leaves: 0, pending_leaves: 0 };
                teacherData.salary_history = [];
            }

            user.staff_profile = staffRows.length > 0 ? staffRows[0] : null;
            user.role_data.teacher = teacherData;
        } catch (e) {
            console.error('Error fetching role:teacher data:', e);
        }
    }

    // 4. ROLE: PARENT / GUARDIAN
    if (roleCodes.has('parent')) {
        try {
            const [guardianRows] = await pool.query(
                `SELECT g.id, g.full_name, g.relation, g.mobile, g.email, g.occupation, g.created_at
                 FROM guardians g
                 WHERE (g.user_id = ? OR (g.email = ? AND g.tenant_id = ?) OR (g.mobile = ? AND g.tenant_id = ?)) AND g.deleted_at IS NULL
                 LIMIT 1`,
                [userId, user.email, user.tenant_id, user.mobile, user.tenant_id]
            );

            if (guardianRows.length > 0) {
                const guardian = guardianRows[0];

                // Linked Student Wards with Invoices Summary
                const [wards] = await pool.query(
                    `SELECT s.id, s.student_code, s.full_name, s.current_class, s.status, s.gender, s.school_name,
                            b.name AS branch_name, b.code AS branch_code,
                            (SELECT COALESCE(SUM(balance_due), 0) FROM student_invoices WHERE student_id = s.id AND status != 'paid') AS total_balance_due
                     FROM student_guardians sg
                     JOIN students s ON sg.student_id = s.id
                     LEFT JOIN branches b ON s.primary_branch_id = b.id
                     WHERE sg.guardian_id = ? AND s.deleted_at IS NULL`,
                    [guardian.id]
                );
                guardian.linked_wards = wards;

                user.guardian_profile = guardian;
                user.role_data.parent = guardian;
            }
        } catch (e) {
            console.error('Error fetching role:parent data:', e);
        }
    }

    // 5. ROLE: COUNSELLOR
    if (roleCodes.has('counsellor')) {
        try {
            const [staffRows] = await pool.query(
                `SELECT sp.id, sp.employee_id, sp.first_name, sp.last_name, sp.contact_number, sp.alternate_mobile,
                        sp.personal_email, sp.gender, sp.dob, sp.employee_type, sp.designation, sp.department, sp.joining_date,
                        sp.employment_type, sp.employment_status, sp.qualification, sp.experience,
                        sp.salary_type, sp.salary_amount, sp.salary_effective_from, sp.bank_name, sp.bank_account_number, sp.bank_ifsc,
                        sp.tds_applicable, sp.professional_tax_applicable, sp.address, sp.city, sp.state, sp.pincode,
                        sp.working_days, sp.biometric_mandatory, sp.status, sp.created_at, sp.updated_at
                 FROM staff_profiles sp
                 WHERE (sp.user_id = ? OR (sp.personal_email = ? AND sp.tenant_id = ?) OR (sp.contact_number = ? AND sp.tenant_id = ?)) AND sp.deleted_at IS NULL
                 LIMIT 1`,
                [userId, user.email, user.tenant_id, user.mobile, user.tenant_id]
            );

            if (staffRows.length > 0) {
                user.staff_profile = staffRows[0];
                user.role_data.counsellor = staffRows[0];
            } else {
                user.role_data.counsellor = null;
            }
        } catch (e) {
            console.error('Error fetching role:counsellor data:', e);
        }
    }

    // 6. ROLE: FINANCE
    if (roleCodes.has('finance')) {
        try {
            const [staffRows] = await pool.query(
                `SELECT sp.id, sp.employee_id, sp.first_name, sp.last_name, sp.contact_number, sp.alternate_mobile,
                        sp.personal_email, sp.gender, sp.dob, sp.employee_type, sp.designation, sp.department, sp.joining_date,
                        sp.employment_type, sp.employment_status, sp.qualification, sp.experience,
                        sp.salary_type, sp.salary_amount, sp.salary_effective_from, sp.bank_name, sp.bank_account_number, sp.bank_ifsc,
                        sp.tds_applicable, sp.professional_tax_applicable, sp.address, sp.city, sp.state, sp.pincode,
                        sp.working_days, sp.biometric_mandatory, sp.status, sp.created_at, sp.updated_at
                 FROM staff_profiles sp
                 WHERE (sp.user_id = ? OR (sp.personal_email = ? AND sp.tenant_id = ?) OR (sp.contact_number = ? AND sp.tenant_id = ?)) AND sp.deleted_at IS NULL
                 LIMIT 1`,
                [userId, user.email, user.tenant_id, user.mobile, user.tenant_id]
            );

            if (staffRows.length > 0) {
                user.staff_profile = staffRows[0];
                user.role_data.finance = staffRows[0];
            } else {
                user.role_data.finance = null;
            }
        } catch (e) {
            console.error('Error fetching role:finance data:', e);
        }
    }

    // 7. ROLE: BRANCH ADMIN
    if (roleCodes.has('branch_admin')) {
        try {
            const [staffRows] = await pool.query(
                `SELECT sp.id, sp.employee_id, sp.first_name, sp.last_name, sp.contact_number, sp.alternate_mobile,
                        sp.personal_email, sp.gender, sp.dob, sp.employee_type, sp.designation, sp.department, sp.joining_date,
                        sp.employment_type, sp.employment_status, sp.qualification, sp.experience,
                        sp.salary_type, sp.salary_amount, sp.salary_effective_from, sp.bank_name, sp.bank_account_number, sp.bank_ifsc,
                        sp.tds_applicable, sp.professional_tax_applicable, sp.address, sp.city, sp.state, sp.pincode,
                        sp.working_days, sp.biometric_mandatory, sp.status, sp.created_at, sp.updated_at
                 FROM staff_profiles sp
                 WHERE (sp.user_id = ? OR (sp.personal_email = ? AND sp.tenant_id = ?) OR (sp.contact_number = ? AND sp.tenant_id = ?)) AND sp.deleted_at IS NULL
                 LIMIT 1`,
                [userId, user.email, user.tenant_id, user.mobile, user.tenant_id]
            );

            const branchAdminData = staffRows.length > 0 ? { ...staffRows[0] } : {};

            const [branches] = await pool.query(
                `SELECT b.id, b.name, b.code, b.city, b.state, b.phone, b.email, b.operating_hours, b.capacity, uba.is_primary, uba.granted_at,
                        (SELECT COUNT(*) FROM students WHERE primary_branch_id = b.id AND deleted_at IS NULL) AS total_students,
                        (SELECT COUNT(*) FROM batches WHERE branch_id = b.id AND deleted_at IS NULL) AS total_batches,
                        (SELECT COUNT(*) FROM classrooms WHERE branch_id = b.id AND deleted_at IS NULL) AS total_classrooms,
                        (SELECT COUNT(*) FROM staff_profiles WHERE JSON_CONTAINS(branch_ids, CAST(b.id AS JSON)) AND deleted_at IS NULL) AS total_staff,
                        (SELECT COUNT(*) FROM student_invoices WHERE branch_id = b.id AND deleted_at IS NULL) AS total_invoices,
                        (SELECT COALESCE(SUM(paid_amount), 0) FROM student_invoices WHERE branch_id = b.id AND deleted_at IS NULL) AS total_revenue_collected
                 FROM user_branch_access uba
                 JOIN branches b ON uba.branch_id = b.id
                 WHERE uba.user_id = ? AND uba.revoked_at IS NULL AND b.deleted_at IS NULL`,
                [userId]
            );
            branchAdminData.managed_branches = branches;

            if (staffRows.length > 0) {
                user.staff_profile = staffRows[0];
            }
            user.role_data.branch_admin = branchAdminData;
        } catch (e) {
            console.error('Error fetching role:branch_admin data:', e);
        }
    }

    // 8. ROLE: INST_ADMIN / SAAS_ADMIN / WORKSPACE
    if (roleCodes.has('inst_admin') || roleCodes.has('saas_admin') || roleCodes.has('workspace_admin') || roleCodes.has('tenant_admin') || roleCodes.has('admin') || user.user_type === 'saas-admin' || user.user_type === 'tenant-admin') {
        try {
            if (user.tenant_id) {
                const [tenantMetrics] = await pool.query(
                    `SELECT t.id, t.name, t.slug, t.status, t.owner_name, t.primary_email, t.created_at,
                            (SELECT COUNT(*) FROM branches WHERE tenant_id = t.id AND deleted_at IS NULL) AS total_branches,
                            (SELECT COUNT(*) FROM students WHERE tenant_id = t.id AND deleted_at IS NULL) AS total_students,
                            (SELECT COUNT(*) FROM staff_profiles WHERE tenant_id = t.id AND deleted_at IS NULL) AS total_staff,
                            (SELECT COUNT(*) FROM batches WHERE tenant_id = t.id AND deleted_at IS NULL) AS total_batches
                     FROM tenants t
                     WHERE t.id = ?`,
                    [user.tenant_id]
                );
                if (tenantMetrics.length > 0) {
                    user.tenant_summary = tenantMetrics[0];
                    user.role_data.workspace_admin = tenantMetrics[0];
                }
            }
        } catch (e) {
            console.error('Error fetching tenant summary:', e);
        }
    }

    // 9. Recent Sessions & Activity Trail
    try {
        const [sessions] = await pool.query(
            `SELECT id, ip_address, user_agent, expires_at, revoked_at, created_at
             FROM user_sessions
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT 10`,
            [userId]
        );
        user.recent_sessions = sessions;
    } catch (e) {
        user.recent_sessions = [];
    }

    return user;
};

const getUserRoleCodes = async (userId) => {
    const [rows] = await pool.query(
        `SELECT DISTINCT r.code
         FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id = ? AND r.is_active = 1 AND r.deleted_at IS NULL`,
        [userId]
    );
    return rows.map(row => row.code);
};

const getUserPermissions = async (userId) => {
    // Check if user is SaaS Super Admin
    try {
        const [userRows] = await pool.query(
            'SELECT id, tenant_id, user_type FROM users WHERE id = ?',
            [userId]
        );
        if (userRows.length > 0) {
            const u = userRows[0];
            if (u.tenant_id === 1 || u.user_type === 'saas_admin' || u.user_type === 'saas-admin') {
                const [allPerms] = await pool.query('SELECT code FROM permissions WHERE deleted_at IS NULL');
                return allPerms.map(p => p.code);
            }
        }
    } catch (e) {
        console.error('Error checking SaaS Admin in getUserPermissions:', e);
    }

    // Flat RBAC: effective permissions = union of the user's role permissions
    // plus explicit 'grant' overrides, minus explicit 'revoke' overrides.
    const [rows] = await pool.query(
        `SELECT DISTINCT p.code
         FROM user_roles ur
         JOIN role_permissions rp ON ur.role_id = rp.role_id
         JOIN permissions p ON rp.permission_id = p.id
         WHERE ur.user_id = ?
         UNION
         SELECT DISTINCT p.code
         FROM overridden_permissions op
         JOIN permissions p ON op.permission_id = p.id
         WHERE op.user_id = ? AND op.override_type = 'grant'`,
        [userId, userId]
    );
    const permissionCodes = rows.map(row => row.code);

    const [revokedRows] = await pool.query(
        `SELECT p.code
         FROM overridden_permissions op
         JOIN permissions p ON op.permission_id = p.id
         WHERE op.user_id = ? AND op.override_type = 'revoke'`,
        [userId]
    );
    const revoked = new Set(revokedRows.map(row => row.code));

    return permissionCodes.filter(code => !revoked.has(code));
};

const updatePassword = async (userId, passwordHash) => {
    const [result] = await pool.query(
        'UPDATE users SET password_hash = ?, must_change_password = 0, password_generated_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [passwordHash, userId]
    );
    return result.affectedRows > 0;
};

const updateUserProfile = async (userId, { name, email }) => {
    if (email) {
        const [existing] = await pool.query(
            'SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ? AND deleted_at IS NULL',
            [email.trim(), userId]
        );
        if (existing && existing.length > 0) {
            const err = new Error('This email address is already in use by another account.');
            err.statusCode = 409;
            throw err;
        }
    }

    const [result] = await pool.query(
        'UPDATE users SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, email ? email.trim() : email, userId]
    );
    return result.affectedRows > 0;
};

const getUsersList = async ({ page = 1, limit = 10, search = '', status = '', tenantId = '', userType = '', roleId = '' }) => {
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];

    let whereClause = 'WHERE u.deleted_at IS NULL';

    if (search) {
        whereClause += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    if (status) {
        whereClause += ' AND u.status = ?';
        params.push(status);
    }

    if (tenantId) {
        whereClause += ' AND u.tenant_id = ?';
        params.push(tenantId);
    }

    if (userType) {
        whereClause += ' AND u.user_type = ?';
        params.push(userType);
    }

    if (roleId) {
        whereClause += ' AND EXISTS (SELECT 1 FROM user_roles ur2 LEFT JOIN roles r2 ON ur2.role_id = r2.id WHERE ur2.user_id = u.id AND ur2.revoked_at IS NULL AND (ur2.role_id = ? OR r2.code = ? OR r2.name = ?))';
        params.push(roleId, roleId, roleId);
    }

    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(
        `SELECT 
            u.id, 
            u.tenant_id, 
            u.name, 
            u.email, 
            u.mobile, 
            u.user_type, 
            u.status, 
            u.app_access_suspended, 
            u.must_change_password, 
            u.last_login_at, 
            u.created_at,
            t.name AS tenant_name,
            t.slug AS tenant_slug,
            (SELECT r.id FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = u.id AND ur.revoked_at IS NULL ORDER BY ur.id ASC LIMIT 1) AS role_id,
            (SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = u.id AND ur.revoked_at IS NULL ORDER BY ur.id ASC LIMIT 1) AS role_name,
            (SELECT r.code FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = u.id AND ur.revoked_at IS NULL ORDER BY ur.id ASC LIMIT 1) AS role_code
        FROM users u
        LEFT JOIN tenants t ON u.tenant_id = t.id
        ${whereClause}
        ORDER BY u.id DESC
        LIMIT ? OFFSET ?`,
        params
    );

    return rows;
};

const getUsersCount = async ({ search = '', status = '', tenantId = '', userType = '', roleId = '' }) => {
    const params = [];
    let whereClause = 'WHERE u.deleted_at IS NULL';

    if (search) {
        whereClause += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    if (status) {
        whereClause += ' AND u.status = ?';
        params.push(status);
    }

    if (tenantId) {
        whereClause += ' AND u.tenant_id = ?';
        params.push(tenantId);
    }

    if (userType) {
        whereClause += ' AND u.user_type = ?';
        params.push(userType);
    }

    if (roleId) {
        whereClause += ' AND EXISTS (SELECT 1 FROM user_roles ur2 LEFT JOIN roles r2 ON ur2.role_id = r2.id WHERE ur2.user_id = u.id AND ur2.revoked_at IS NULL AND (ur2.role_id = ? OR r2.code = ? OR r2.name = ?))';
        params.push(roleId, roleId, roleId);
    }

    const [rows] = await pool.query(
        `SELECT COUNT(DISTINCT u.id) AS total FROM users u ${whereClause}`,
        params
    );

    return rows[0].total;
};

const createUser = async ({ tenant_id, name, email, mobile, password_hash, user_type, status = 'active', role_id, created_by }) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        if (email) {
            const [existing] = await connection.query(
                'SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND deleted_at IS NULL',
                [email.trim()]
            );
            if (existing && existing.length > 0) {
                const err = new Error('An account with this email address already exists.');
                err.statusCode = 409;
                throw err;
            }
        }

        const [result] = await connection.query(
            `INSERT INTO users (tenant_id, name, email, mobile, password_hash, user_type, status, must_change_password, password_generated_at, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, ?)`,
            [tenant_id, name, email ? email.trim() : email, mobile || null, password_hash, user_type, status, created_by || null]
        );

        const newUserId = result.insertId;

        if (role_id) {
            await connection.query(
                `INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)`,
                [newUserId, role_id, created_by || null]
            );
        }

        await connection.commit();
        return newUserId;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

const assignUserRole = async (userId, roleId, assignedBy) => {
    const [existing] = await pool.query(
        'SELECT * FROM user_roles WHERE user_id = ? AND role_id = ? AND revoked_at IS NULL',
        [userId, roleId]
    );
    if (existing && existing.length > 0) {
        return true;
    }
    await pool.query(
        'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)',
        [userId, roleId, assignedBy || null]
    );
    return true;
};

const updateUser = async (id, { name, email, mobile, user_type, status, app_access_suspended, role_id, updated_by }) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        if (email) {
            const [existing] = await connection.query(
                'SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ? AND deleted_at IS NULL',
                [email.trim(), id]
            );
            if (existing && existing.length > 0) {
                const err = new Error('This email address is already in use by another account.');
                err.statusCode = 409;
                throw err;
            }
        }

        await connection.query(
            `UPDATE users 
             SET name = ?, email = ?, mobile = ?, user_type = ?, status = ?, app_access_suspended = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND deleted_at IS NULL`,
            [name, email ? email.trim() : email, mobile || null, user_type, status, app_access_suspended ? 1 : 0, updated_by || null, id]
        );

        if (role_id) {
            // Assign role if not already assigned (supports multi-role per user)
            const [existing] = await connection.query(
                'SELECT * FROM user_roles WHERE user_id = ? AND role_id = ? AND revoked_at IS NULL',
                [id, role_id]
            );
            if (!existing || existing.length === 0) {
                await connection.query(
                    `INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)`,
                    [id, role_id, updated_by || null]
                );
            }
        }

        await connection.commit();
        return true;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

const deleteUser = async (id) => {
    const [result] = await pool.query(
        `UPDATE users SET deleted_at = CURRENT_TIMESTAMP, status = 'deleted' WHERE id = ? AND deleted_at IS NULL`,
        [id]
    );
    return result.affectedRows > 0;
};

const resetUserPassword = async (id, passwordHash) => {
    const [result] = await pool.query(
        `UPDATE users SET password_hash = ?, must_change_password = 1, password_generated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`,
        [passwordHash, id]
    );
    return result.affectedRows > 0;
};

const getAllRoles = async () => {
    const [rows] = await pool.query('SELECT id, name, code, description FROM roles WHERE is_active = 1 AND deleted_at IS NULL ORDER BY name ASC');
    return rows;
};

const getAllTenants = async () => {
    const [rows] = await pool.query('SELECT id, name, slug, status FROM tenants WHERE deleted_at IS NULL ORDER BY name ASC');
    return rows;
};

const removeUserRole = async (userId, roleId) => {
    const [result] = await pool.query(
        'DELETE FROM user_roles WHERE user_id = ? AND role_id = ?',
        [userId, roleId]
    );
    return result.affectedRows > 0;
};

const changeUserRole = async (userId, oldRoleId, newRoleId, updatedBy) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query(
            'DELETE FROM user_roles WHERE user_id = ? AND role_id = ?',
            [userId, oldRoleId]
        );
        const [existing] = await connection.query(
            'SELECT * FROM user_roles WHERE user_id = ? AND role_id = ? AND revoked_at IS NULL',
            [userId, newRoleId]
        );
        if (!existing || existing.length === 0) {
            await connection.query(
                'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)',
                [userId, newRoleId, updatedBy || null]
            );
        }
        await connection.commit();
        return true;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

const addUserPermissionOverride = async ({ user_id, permission_id, override_type, created_by }) => {
    const [result] = await pool.query(
        `INSERT INTO overridden_permissions (user_id, permission_id, override_type, created_by)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE override_type = VALUES(override_type), updated_at = CURRENT_TIMESTAMP`,
        [user_id, permission_id, override_type, created_by || null]
    );
    return result;
};

const removeUserPermissionOverride = async (userId, overrideId) => {
    const [result] = await pool.query(
        `DELETE FROM overridden_permissions WHERE id = ? AND user_id = ?`,
        [overrideId, userId]
    );
    return result.affectedRows > 0;
};

const getUserInheritedPermissions = async (userId, { page = 1, limit = 10, search = '', roleId = '' } = {}) => {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE ur.user_id = ? AND ur.revoked_at IS NULL AND r.is_active = 1 AND r.deleted_at IS NULL AND p.deleted_at IS NULL';
    const params = [userId];

    if (roleId) {
        whereClause += ' AND r.id = ?';
        params.push(roleId);
    }

    if (search && search.trim()) {
        whereClause += ' AND (p.code LIKE ? OR p.module LIKE ? OR p.action LIKE ? OR p.description LIKE ? OR r.name LIKE ?)';
        const searchTerm = `%${search.trim()}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Total count of matching inherited permissions
    const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         JOIN role_permissions rp ON r.id = rp.role_id
         JOIN permissions p ON rp.permission_id = p.id
         ${whereClause}`,
        params
    );
    const total = countRows[0]?.total || 0;

    // Paginated list of permissions
    const queryParams = [...params, limitNum, offset];
    const [rows] = await pool.query(
        `SELECT r.id AS role_id, r.name AS role_name, r.code AS role_code,
                p.id AS permission_id, p.module, p.action, p.code AS permission_code, p.description
         FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         JOIN role_permissions rp ON r.id = rp.role_id
         JOIN permissions p ON rp.permission_id = p.id
         ${whereClause}
         ORDER BY r.name ASC, p.module ASC, p.code ASC
         LIMIT ? OFFSET ?`,
        queryParams
    );

    // Grouping for hierarchical view
    const roleWiseMap = {};
    for (const rp of rows) {
        if (!roleWiseMap[rp.role_code]) {
            roleWiseMap[rp.role_code] = {
                role_id: rp.role_id,
                role_name: rp.role_name,
                role_code: rp.role_code,
                permissions: []
            };
        }
        roleWiseMap[rp.role_code].permissions.push({
            id: rp.permission_id,
            module: rp.module,
            action: rp.action,
            code: rp.permission_code,
            description: rp.description
        });
    }

    return {
        permissions: rows,
        grouped: Object.values(roleWiseMap),
        pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum) || 1
        }
    };
};

module.exports = {
    findUserByEmail,
    findUserById,
    getUserFullDetails,
    getUserRoleCodes,
    getUserPermissions,
    getUserInheritedPermissions,
    updatePassword,
    updateUserProfile,
    getUsersList,
    getUsersCount,
    createUser,
    updateUser,
    deleteUser,
    resetUserPassword,
    removeUserRole,
    changeUserRole,
    assignUserRole,
    addUserPermissionOverride,
    removeUserPermissionOverride,
    getAllRoles,
    getAllTenants
};
