const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const createStaff = async (tenantId, staffData, creatorUserId) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const email = staffData.email || null;

        // 1. Create User (Email is default login ID, password auto-generated, must change on first login)
        let userId = null;
        const tempPassword = staffData.tempPassword || `Staff@${Math.floor(1000 + Math.random() * 9000)}`;
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        const [userResult] = await connection.query(
            `INSERT INTO users (tenant_id, name, email, mobile, password_hash, user_type, must_change_password)
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [
                tenantId, 
                `${staffData.firstName} ${staffData.lastName}`.trim(),
                email || `dummy_${Date.now()}@example.com`, 
                staffData.mobile || '', 
                passwordHash, 
                'staff'
            ]
        );
        userId = userResult.insertId;

        // 2. Insert Staff Profile
        const branchIds = Array.isArray(staffData.branchIds) && staffData.branchIds.length > 0
            ? staffData.branchIds.map(Number).filter(Boolean)
            : (staffData.branch_ids ? (Array.isArray(staffData.branch_ids) ? staffData.branch_ids.map(Number).filter(Boolean) : JSON.parse(staffData.branch_ids)) : [Number(staffData.primaryBranchId) || 1]);
        const branchIdsJson = JSON.stringify(branchIds.length > 0 ? branchIds : [1]);

        const workingDays = Array.isArray(staffData.workingDays)
            ? staffData.workingDays
            : (Array.isArray(staffData.working_days) ? staffData.working_days : (typeof staffData.working_days === 'string' ? JSON.parse(staffData.working_days) : null));
        const workingDaysJson = workingDays ? JSON.stringify(workingDays) : null;

        const [profileResult] = await connection.query(
            `INSERT INTO staff_profiles (
                tenant_id, branch_ids, user_id, employee_id, contact_number, alternate_mobile,
                first_name, last_name, gender, dob,
                aadhaar_number, pan_number, personal_email, address,
                city, state, pincode, employee_type, designation, department, joining_date,
                employment_type, employment_status, experience, qualification,
                salary_type, salary_amount, bank_account_number, bank_ifsc, bank_name,
                tds_applicable, professional_tax_applicable, max_lectures_per_day,
                max_lectures_per_week, working_days, biometric_mandatory, status, created_by, updated_by
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )`,
            [
                tenantId, branchIdsJson, userId, staffData.employeeId, staffData.mobile || null, staffData.alternateMobile || null,
                staffData.firstName, staffData.lastName, staffData.gender || null, staffData.dob || null,
                staffData.aadhaar || null, staffData.pan || null, email, staffData.address || null,
                staffData.city || null, staffData.state || null, staffData.pinCode || null, staffData.employeeType || 'Teaching', staffData.designation || null, staffData.department || null, staffData.joiningDate || null,
                staffData.employmentType || 'full_time', staffData.employmentStatus || 'active', staffData.experience || null, staffData.qualification || null,
                staffData.salaryType || 'Monthly', staffData.salaryType === 'Monthly' ? (staffData.monthlySalary || null) : (staffData.salaryType === 'Hourly' ? (staffData.hourlyRate || null) : (staffData.contractAmount || null)),
                staffData.accountNumber || null, staffData.ifsc || null, staffData.bankName || null,
                staffData.tdsApplicable ? 1 : 0, staffData.professionalTax ? 1 : 0,
                staffData.maxLecturesPerDay || null, staffData.maxLecturesPerWeek || null,
                workingDaysJson, staffData.biometricMandatory ? 1 : 0, staffData.status || 'active', creatorUserId, creatorUserId
            ]
        );

        // 3. User Branch Access (All mapped branches)
        for (const bId of branchIds) {
            await connection.query(
                `INSERT IGNORE INTO user_branch_access (tenant_id, user_id, branch_id) VALUES (?, ?, ?)`,
                [tenantId, userId, bId]
            );
        }

        // 4. Teacher Subjects
        let subjectIds = [];
        if (Array.isArray(staffData.subjectIds) && staffData.subjectIds.length > 0) {
            subjectIds = staffData.subjectIds.map(Number).filter(Boolean);
        } else if (Array.isArray(staffData.subjects) && staffData.subjects.length > 0) {
            const numIds = staffData.subjects.map(Number).filter(Boolean);
            const names = staffData.subjects.filter(s => typeof s === 'string' && isNaN(Number(s)));
            if (names.length > 0) {
                const [subRows] = await connection.query(
                    `SELECT id FROM subjects WHERE tenant_id = ? AND (name IN (?) OR code IN (?))`,
                    [tenantId, names, names]
                );
                subjectIds = Array.from(new Set([...numIds, ...subRows.map(r => r.id)]));
            } else {
                subjectIds = numIds;
            }
        }

        if (subjectIds.length > 0 && userId) {
            for (const subjectId of subjectIds) {
                await connection.query(
                    `INSERT IGNORE INTO teacher_subjects (tenant_id, teacher_user_id, subject_id) VALUES (?, ?, ?)`,
                    [tenantId, userId, subjectId]
                );
            }
        }

        // 5. User Roles (Assign roles in user_roles table)
        let roleIdsToAssign = [];
        if (Array.isArray(staffData.roleIds) && staffData.roleIds.length > 0) {
            roleIdsToAssign = staffData.roleIds.map(Number).filter(Boolean);
        } else {
            const rolesToAssign = staffData.roles && staffData.roles.length > 0
                ? staffData.roles
                : (staffData.role ? [staffData.role] : (staffData.employeeType === 'Teaching' ? ['Teacher'] : []));
            
            if (rolesToAssign.length > 0) {
                const roleCodes = rolesToAssign.map(r => r.toLowerCase().replace(/[\s-]+/g, '_'));
                const [roleRows] = await connection.query(
                    `SELECT id FROM roles WHERE name IN (?) OR code IN (?)`,
                    [rolesToAssign, roleCodes]
                );
                roleIdsToAssign = roleRows.map(r => r.id);
            }
        }

        // Ensure teacher role is assigned if employeeType is Teaching and no role matched
        if (roleIdsToAssign.length === 0 && staffData.employeeType === 'Teaching') {
            const [tRows] = await connection.query(`SELECT id FROM roles WHERE code = 'teacher' OR name = 'Teacher' LIMIT 1`);
            if (tRows.length > 0) roleIdsToAssign.push(tRows[0].id);
        }

        if (roleIdsToAssign.length > 0 && userId) {
            for (const rId of roleIdsToAssign) {
                await connection.query(
                    `INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)`,
                    [userId, rId]
                );
            }
        }

        // 6. Teacher Batch Allocations (teacher_allocations)
        const batchIds = Array.isArray(staffData.batchIds) && staffData.batchIds.length > 0
            ? staffData.batchIds.map(Number).filter(Boolean)
            : (Array.isArray(staffData.allocatedBatchIds) ? staffData.allocatedBatchIds.map(Number).filter(Boolean) : []);
        
        if (batchIds.length > 0 && userId) {
            const [batchRows] = await connection.query(
                `SELECT id, branch_id, academic_year_id FROM batches WHERE id IN (?) AND tenant_id = ?`,
                [batchIds, tenantId]
            );
            for (const bRow of batchRows) {
                await connection.query(
                    `INSERT IGNORE INTO teacher_allocations (tenant_id, branch_id, academic_year_id, batch_id, teacher_user_id, created_by, updated_by)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [tenantId, bRow.branch_id, bRow.academic_year_id, bRow.id, userId, creatorUserId, creatorUserId]
                );
            }
        }

        await connection.commit();
        return { success: true, userId, profileId: profileResult.insertId };
    } catch (error) {
        await connection.rollback();
        console.error('Error in createStaff transaction:', error);
        throw error;
    } finally {
        connection.release();
    }
};

const getStaffList = async (tenantId, filters = {}) => {
    let query = `
        SELECT 
            sp.*,
            u.email,
            b.name as primary_branch_name,
            COALESCE(GROUP_CONCAT(DISTINCT r.name SEPARATOR ', '), IF(sp.employee_type = 'Teaching', 'Teacher', sp.designation)) as role_name,
            COALESCE(GROUP_CONCAT(DISTINCT r.code SEPARATOR ', '), LOWER(sp.employee_type)) as role_code,
            COALESCE(GROUP_CONCAT(DISTINCT s.name ORDER BY s.name SEPARATOR ', '), '') as subjects_taught,
            COALESCE(GROUP_CONCAT(DISTINCT ts.subject_id ORDER BY ts.subject_id SEPARATOR ','), '') as subject_ids_str
        FROM staff_profiles sp
        JOIN users u ON sp.user_id = u.id
        LEFT JOIN branches b ON b.id = JSON_UNQUOTE(JSON_EXTRACT(sp.branch_ids, '$[0]'))
        LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.revoked_at IS NULL
        LEFT JOIN roles r ON ur.role_id = r.id
        LEFT JOIN teacher_subjects ts ON ts.teacher_user_id = u.id AND ts.tenant_id = sp.tenant_id
        LEFT JOIN subjects s ON ts.subject_id = s.id AND s.deleted_at IS NULL
        WHERE sp.tenant_id = ? AND sp.deleted_at IS NULL
    `;
    const params = [tenantId];

    if (filters.search) {
        query += ` AND (sp.first_name LIKE ? OR sp.last_name LIKE ? OR sp.employee_id LIKE ? OR u.email LIKE ?)`;
        const searchStr = `%${filters.search}%`;
        params.push(searchStr, searchStr, searchStr, searchStr);
    }

    if (filters.branchId && filters.branchId !== 'All') {
        query += ` AND (JSON_CONTAINS(COALESCE(sp.branch_ids, JSON_ARRAY()), CAST(? AS JSON)) OR b.name = ?)`;
        params.push(filters.branchId, filters.branchId);
    }

    if (filters.employeeType && filters.employeeType !== 'All') {
        query += ` AND sp.employee_type = ?`;
        params.push(filters.employeeType);
    }

    if (filters.department && filters.department !== 'All') {
        query += ` AND sp.department = ?`;
        params.push(filters.department);
    }

    if (filters.role && filters.role !== 'All') {
        query += ` AND (
            r.name = ? 
            OR r.code = ? 
            OR sp.employee_type = ? 
            OR sp.designation LIKE ?
            OR (? = 'Teacher' AND sp.employee_type = 'Teaching')
            OR (? = 'Teaching' AND sp.employee_type = 'Teaching')
            OR (? = 'Non-Teaching' AND sp.employee_type = 'Non-Teaching')
        )`;
        const roleParam = filters.role;
        const roleCode = filters.role.toLowerCase().replace(/[\s-]+/g, '_');
        params.push(roleParam, roleCode, roleParam, `%${roleParam}%`, roleParam, roleParam, roleParam);
    }

    query += ` GROUP BY sp.id, u.email, b.name ORDER BY sp.created_at DESC`;

    if (filters.limit) {
        query += ` LIMIT ?`;
        params.push(Number(filters.limit));
        
        if (filters.offset) {
            query += ` OFFSET ?`;
            params.push(Number(filters.offset));
        }
    }

    const [rows] = await pool.query(query, params);
    
    // Process rows to attach subject_ids, subjects, working_days, and branch compatibility
    const processedRows = rows.map(r => {
        const parsedBranchIds = Array.isArray(r.branch_ids) 
            ? r.branch_ids 
            : (typeof r.branch_ids === 'string' ? JSON.parse(r.branch_ids) : (r.branch_ids ? [r.branch_ids] : []));
        const parsedWorkingDays = Array.isArray(r.working_days)
            ? r.working_days
            : (typeof r.working_days === 'string' ? JSON.parse(r.working_days) : (r.working_days ? [r.working_days] : []));
        return {
            ...r,
            branch_ids: parsedBranchIds,
            branch_id: parsedBranchIds[0] || null,
            primary_branch_id: parsedBranchIds[0] || null,
            subject_ids: r.subject_ids_str ? r.subject_ids_str.split(',').map(Number) : [],
            subjects: r.subjects_taught ? r.subjects_taught.split(', ') : [],
            working_days: parsedWorkingDays
        };
    });

    // Get total count for pagination
    let countQuery = `
        SELECT COUNT(DISTINCT sp.id) as total 
        FROM staff_profiles sp 
        JOIN users u ON sp.user_id = u.id 
        LEFT JOIN branches b ON b.id = JSON_UNQUOTE(JSON_EXTRACT(sp.branch_ids, '$[0]'))
        LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.revoked_at IS NULL
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE sp.tenant_id = ? AND sp.deleted_at IS NULL
    `;
    const countParams = [tenantId];
    
    if (filters.search) {
        countQuery += ` AND (sp.first_name LIKE ? OR sp.last_name LIKE ? OR sp.employee_id LIKE ? OR u.email LIKE ?)`;
        const searchStr = `%${filters.search}%`;
        countParams.push(searchStr, searchStr, searchStr, searchStr);
    }

    if (filters.branchId && filters.branchId !== 'All') {
        countQuery += ` AND (JSON_CONTAINS(COALESCE(sp.branch_ids, JSON_ARRAY()), CAST(? AS JSON)) OR b.name = ?)`;
        countParams.push(filters.branchId, filters.branchId);
    }

    if (filters.employeeType && filters.employeeType !== 'All') {
        countQuery += ` AND sp.employee_type = ?`;
        countParams.push(filters.employeeType);
    }

    if (filters.department && filters.department !== 'All') {
        countQuery += ` AND sp.department = ?`;
        countParams.push(filters.department);
    }

    if (filters.role && filters.role !== 'All') {
        countQuery += ` AND (
            r.name = ? 
            OR r.code = ? 
            OR sp.employee_type = ? 
            OR sp.designation LIKE ?
            OR (? = 'Teacher' AND sp.employee_type = 'Teaching')
            OR (? = 'Teaching' AND sp.employee_type = 'Teaching')
            OR (? = 'Non-Teaching' AND sp.employee_type = 'Non-Teaching')
        )`;
        const roleParam = filters.role;
        const roleCode = filters.role.toLowerCase().replace(/[\s-]+/g, '_');
        countParams.push(roleParam, roleCode, roleParam, `%${roleParam}%`, roleParam, roleParam, roleParam);
    }

    const [countRows] = await pool.query(countQuery, countParams);

    return {
        data: processedRows,
        total: countRows[0].total
    };
};

const updateStaff = async (tenantId, staffId, staffData) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const branchIds = Array.isArray(staffData.branchIds) && staffData.branchIds.length > 0
            ? staffData.branchIds.map(Number).filter(Boolean)
            : (staffData.branch_ids ? (Array.isArray(staffData.branch_ids) ? staffData.branch_ids.map(Number).filter(Boolean) : JSON.parse(staffData.branch_ids)) : (staffData.primaryBranchId ? [Number(staffData.primaryBranchId)] : [1]));
        const branchIdsJson = JSON.stringify(branchIds.length > 0 ? branchIds : [1]);
        const email = staffData.email || null;

        const workingDays = Array.isArray(staffData.workingDays)
            ? staffData.workingDays
            : (Array.isArray(staffData.working_days) ? staffData.working_days : (typeof staffData.working_days === 'string' ? JSON.parse(staffData.working_days) : null));
        const workingDaysJson = workingDays ? JSON.stringify(workingDays) : null;

        // 1. Update Staff Profile
        await connection.query(
            `UPDATE staff_profiles SET 
                branch_ids = ?, contact_number = ?, alternate_mobile = ?,
                first_name = ?, last_name = ?, gender = ?, dob = ?,
                aadhaar_number = ?, pan_number = ?, personal_email = ?, address = ?,
                city = ?, state = ?, pincode = ?, employee_type = ?, designation = ?, department = ?, joining_date = ?,
                employment_type = ?, employment_status = ?, experience = ?, qualification = ?,
                salary_type = ?, salary_amount = ?, bank_account_number = ?, bank_ifsc = ?, bank_name = ?,
                tds_applicable = ?, professional_tax_applicable = ?,
                max_lectures_per_day = ?, max_lectures_per_week = ?,
                working_days = ?, biometric_mandatory = ?, status = ?
            WHERE id = ? AND tenant_id = ?`,
            [
                branchIdsJson, staffData.mobile || null, staffData.alternateMobile || null,
                staffData.firstName, staffData.lastName, staffData.gender || null, staffData.dob || null,
                staffData.aadhaar || null, staffData.pan || null, email, staffData.address || null,
                staffData.city || null, staffData.state || null, staffData.pinCode || null, staffData.employeeType || 'Teaching', staffData.designation || null, staffData.department || null, staffData.joiningDate || null,
                staffData.employmentType || 'full_time', staffData.employmentStatus || 'active', staffData.experience || null, staffData.qualification || null,
                staffData.salaryType || 'Monthly', staffData.salaryType === 'Monthly' ? (staffData.monthlySalary || null) : (staffData.salaryType === 'Hourly' ? (staffData.hourlyRate || null) : (staffData.contractAmount || null)),
                staffData.accountNumber || null, staffData.ifsc || null, staffData.bankName || null,
                staffData.tdsApplicable ? 1 : 0, staffData.professionalTax ? 1 : 0,
                staffData.maxLecturesPerDay || null, staffData.maxLecturesPerWeek || null,
                workingDaysJson, staffData.biometricMandatory ? 1 : 0, staffData.status || 'active',
                staffId, tenantId
            ]
        );

        // Update user record (name, mobile, email)
        await connection.query(
            `UPDATE users u
             JOIN staff_profiles sp ON u.id = sp.user_id
             SET u.name = ?, 
                 u.mobile = COALESCE(NULLIF(?, ''), u.mobile), 
                 u.email = COALESCE(NULLIF(?, ''), u.email)
             WHERE sp.id = ? AND sp.tenant_id = ?`,
            [`${staffData.firstName} ${staffData.lastName}`.trim(), staffData.mobile || null, email || null, staffId, tenantId]
        );

        const [profileRows] = await connection.query(
            `SELECT user_id FROM staff_profiles WHERE id = ? AND tenant_id = ?`,
            [staffId, tenantId]
        );
        const userId = profileRows[0]?.user_id;

        // Sync branch access in user_branch_access
        if (userId && branchIds.length > 0) {
            await connection.query(`DELETE FROM user_branch_access WHERE tenant_id = ? AND user_id = ?`, [tenantId, userId]);
            for (const bId of branchIds) {
                await connection.query(
                    `INSERT IGNORE INTO user_branch_access (tenant_id, user_id, branch_id) VALUES (?, ?, ?)`,
                    [tenantId, userId, bId]
                );
            }
        }

        // Sync Teacher Subjects
        if (userId) {
            let subjectIds = [];
            if (Array.isArray(staffData.subjectIds) && staffData.subjectIds.length > 0) {
                subjectIds = staffData.subjectIds.map(Number).filter(Boolean);
            } else if (Array.isArray(staffData.subjects) && staffData.subjects.length > 0) {
                const numIds = staffData.subjects.map(Number).filter(Boolean);
                const names = staffData.subjects.filter(s => typeof s === 'string' && isNaN(Number(s)));
                if (names.length > 0) {
                    const [subRows] = await connection.query(
                        `SELECT id FROM subjects WHERE tenant_id = ? AND (name IN (?) OR code IN (?))`,
                        [tenantId, names, names]
                    );
                    subjectIds = Array.from(new Set([...numIds, ...subRows.map(r => r.id)]));
                } else {
                    subjectIds = numIds;
                }
            }

            await connection.query(`DELETE FROM teacher_subjects WHERE tenant_id = ? AND teacher_user_id = ?`, [tenantId, userId]);
            if (subjectIds.length > 0) {
                for (const subjectId of subjectIds) {
                    await connection.query(
                        `INSERT IGNORE INTO teacher_subjects (tenant_id, teacher_user_id, subject_id) VALUES (?, ?, ?)`,
                        [tenantId, userId, subjectId]
                    );
                }
            }
        }

        // Sync User Roles
        if (userId) {
            let roleIdsToAssign = [];
            if (Array.isArray(staffData.roleIds) && staffData.roleIds.length > 0) {
                roleIdsToAssign = staffData.roleIds.map(Number).filter(Boolean);
            } else if (staffData.roles !== undefined || staffData.role !== undefined) {
                const rolesToAssign = staffData.roles && staffData.roles.length > 0
                    ? staffData.roles
                    : (staffData.role ? [staffData.role] : []);

                if (rolesToAssign.length > 0) {
                    const roleCodes = rolesToAssign.map(r => r.toLowerCase().replace(/[\s-]+/g, '_'));
                    const [roleRows] = await connection.query(
                        `SELECT id FROM roles WHERE name IN (?) OR code IN (?)`,
                        [rolesToAssign, roleCodes]
                    );
                    roleIdsToAssign = roleRows.map(r => r.id);
                }
            }

            if (roleIdsToAssign.length > 0) {
                await connection.query(`DELETE FROM user_roles WHERE user_id = ?`, [userId]);
                for (const rId of roleIdsToAssign) {
                    await connection.query(
                        `INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)`,
                        [userId, rId]
                    );
                }
            }
        }

        // Sync Teacher Batch Allocations (teacher_allocations)
        if (userId && (staffData.batchIds !== undefined || staffData.allocatedBatchIds !== undefined)) {
            const batchIds = Array.isArray(staffData.batchIds)
                ? staffData.batchIds.map(Number).filter(Boolean)
                : (Array.isArray(staffData.allocatedBatchIds) ? staffData.allocatedBatchIds.map(Number).filter(Boolean) : []);

            await connection.query(
                `DELETE FROM teacher_allocations WHERE tenant_id = ? AND teacher_user_id = ?`,
                [tenantId, userId]
            );

            if (batchIds.length > 0) {
                const [batchRows] = await connection.query(
                    `SELECT id, branch_id, academic_year_id FROM batches WHERE id IN (?) AND tenant_id = ?`,
                    [batchIds, tenantId]
                );
                for (const bRow of batchRows) {
                    await connection.query(
                        `INSERT IGNORE INTO teacher_allocations (tenant_id, branch_id, academic_year_id, batch_id, teacher_user_id, created_by, updated_by)
                         VALUES (?, ?, ?, ?, ?, NULL, NULL)`,
                        [tenantId, bRow.branch_id, bRow.academic_year_id, bRow.id, userId]
                    );
                }
            }
        }

        await connection.commit();
        return { success: true };
    } catch (error) {
        await connection.rollback();
        console.error('Error in updateStaff transaction:', error);
        throw error;
    } finally {
        connection.release();
    }
};

const getStaffById = async (tenantId, staffId) => {
    const [rows] = await pool.query(
        `SELECT 
            sp.*,
            u.email,
            u.name as user_name,
            b.name as primary_branch_name,
            COALESCE(GROUP_CONCAT(DISTINCT r.name SEPARATOR ', '), IF(sp.employee_type = 'Teaching', 'Teacher', sp.designation)) as role_name,
            COALESCE(GROUP_CONCAT(DISTINCT r.code SEPARATOR ', '), LOWER(sp.employee_type)) as role_code,
            COALESCE(GROUP_CONCAT(DISTINCT s.name ORDER BY s.name SEPARATOR ', '), '') as subjects_taught,
            COALESCE(GROUP_CONCAT(DISTINCT ts.subject_id ORDER BY ts.subject_id SEPARATOR ','), '') as subject_ids_str
        FROM staff_profiles sp
        JOIN users u ON sp.user_id = u.id
        LEFT JOIN branches b ON b.id = JSON_UNQUOTE(JSON_EXTRACT(sp.branch_ids, '$[0]'))
        LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.revoked_at IS NULL
        LEFT JOIN roles r ON ur.role_id = r.id
        LEFT JOIN teacher_subjects ts ON ts.teacher_user_id = u.id AND ts.tenant_id = sp.tenant_id
        LEFT JOIN subjects s ON ts.subject_id = s.id AND s.deleted_at IS NULL
        WHERE sp.id = ? AND sp.tenant_id = ? AND sp.deleted_at IS NULL
        GROUP BY sp.id, u.email, u.name, b.name`,
        [staffId, tenantId]
    );

    if (!rows || rows.length === 0) {
        return null;
    }

    const staff = rows[0];
    const parsedBranchIds = Array.isArray(staff.branch_ids) 
        ? staff.branch_ids 
        : (typeof staff.branch_ids === 'string' ? JSON.parse(staff.branch_ids) : (staff.branch_ids ? [staff.branch_ids] : []));
    const parsedWorkingDays = Array.isArray(staff.working_days)
        ? staff.working_days
        : (typeof staff.working_days === 'string' ? JSON.parse(staff.working_days) : (staff.working_days ? [staff.working_days] : []));
    staff.branch_ids = parsedBranchIds;
    staff.branch_id = parsedBranchIds[0] || null;
    staff.primary_branch_id = parsedBranchIds[0] || null;
    staff.working_days = parsedWorkingDays;
    staff.subject_ids = staff.subject_ids_str ? staff.subject_ids_str.split(',').map(Number) : [];
    staff.subjects = staff.subjects_taught ? staff.subjects_taught.split(', ') : [];

    // Fetch allocated batches
    const [allocationRows] = await pool.query(
        `SELECT ta.batch_id, b.name as batch_name, b.code as batch_code, b.branch_id, br.name as branch_name,
                l.name as level_name, p.name as program_name, c.name as course_name
         FROM teacher_allocations ta
         JOIN batches b ON ta.batch_id = b.id
         LEFT JOIN branches br ON b.branch_id = br.id
         LEFT JOIN levels l ON b.level_id = l.id
         LEFT JOIN programs p ON l.program_id = p.id
         LEFT JOIN courses c ON l.course_id = c.id
         WHERE ta.tenant_id = ? AND ta.teacher_user_id = ? AND ta.deleted_at IS NULL`,
        [tenantId, staff.user_id]
    );
    staff.allocated_batch_ids = allocationRows.map(r => Number(r.batch_id));
    staff.allocated_batches = allocationRows;

    return staff;
};

const deleteStaff = async (tenantId, staffId) => {
    const [result] = await pool.query(
        `UPDATE staff_profiles SET deleted_at = CURRENT_TIMESTAMP, status = 'inactive' WHERE id = ? AND tenant_id = ?`,
        [staffId, tenantId]
    );
    return { success: result.affectedRows > 0 };
};

module.exports = {
    createStaff,
    getStaffList,
    getStaffById,
    updateStaff,
    deleteStaff
};
