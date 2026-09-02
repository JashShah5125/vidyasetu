const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const createStaff = async (tenantId, staffData, creatorUserId) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Create User (if createLogin is true)
        let userId = null;
        if (staffData.createLogin && staffData.username && staffData.email) {
            const passwordHash = staffData.tempPassword 
                ? await bcrypt.hash(staffData.tempPassword, 10) 
                : await bcrypt.hash('defaultPassword123!', 10);
                
            const [userResult] = await connection.query(
                `INSERT INTO users (tenant_id, name, email, mobile, password_hash, user_type, must_change_password)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    tenantId, 
                    `${staffData.firstName} ${staffData.lastName}`.trim(),
                    staffData.email, 
                    staffData.mobile, 
                    passwordHash, 
                    'staff',
                    staffData.forcePasswordReset ? 1 : 0
                ]
            );
            userId = userResult.insertId;
        } else {
            // Need a dummy user record anyway since staff_profiles requires user_id
            const [userResult] = await connection.query(
                `INSERT INTO users (tenant_id, name, email, mobile, password_hash, user_type)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    tenantId, 
                    `${staffData.firstName} ${staffData.lastName}`.trim(),
                    staffData.email || `dummy_${Date.now()}@example.com`, 
                    staffData.mobile, 
                    'no_login', 
                    'staff'
                ]
            );
            userId = userResult.insertId;
        }

        // 2. Insert Staff Profile
        const [profileResult] = await connection.query(
            `INSERT INTO staff_profiles (
                tenant_id, branch_id, user_id, employee_id, contact_number, alternate_mobile,
                first_name, last_name, gender, dob, blood_group, marital_status,
                aadhaar_number, pan_number, personal_email, current_address, permanent_address,
                city, state, pincode, employee_type, designation, department, joining_date,
                employment_type, employment_status, reporting_manager, experience, qualification,
                salary_type, salary_amount, bank_account_number, bank_ifsc, bank_name,
                pf_applicable, pf_account_number, esic_applicable, esic_account_number,
                tds_applicable, professional_tax_applicable, emergency_contact_name,
                emergency_contact_number, max_lectures_per_day,
                max_lectures_per_week, biometric_mandatory, status, created_by, updated_by
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )`,
            [
                tenantId, staffData.primaryBranchId || 1, userId, staffData.employeeId, staffData.mobile, staffData.alternateMobile,
                staffData.firstName, staffData.lastName, staffData.gender, staffData.dob || null, staffData.bloodGroup, staffData.maritalStatus,
                staffData.aadhaar, staffData.pan, staffData.personalEmail, staffData.currentAddress, staffData.permanentAddress,
                staffData.city, staffData.state, staffData.pinCode, staffData.employeeType, staffData.designation, staffData.department, staffData.joiningDate || null,
                staffData.employmentType, staffData.employmentStatus, staffData.reportingManager, staffData.experience, staffData.qualification,
                staffData.salaryType, staffData.salaryType === 'Monthly' ? staffData.monthlySalary : (staffData.salaryType === 'Hourly' ? staffData.hourlyRate : staffData.contractAmount),
                staffData.accountNumber, staffData.ifsc, staffData.bankName,
                staffData.pfNumber ? 1 : 0, staffData.pfNumber, staffData.esicNumber ? 1 : 0, staffData.esicNumber,
                staffData.tdsApplicable ? 1 : 0, staffData.professionalTax ? 1 : 0, staffData.emergencyContact,
                staffData.emergencyMobile, staffData.maxLecturesPerDay || null,
                staffData.maxLecturesPerWeek || null, staffData.biometricMandatory ? 1 : 0, staffData.status || 'active', creatorUserId, creatorUserId
            ]
        );

        // 3. User Branch Access (Additional Branches)
        if (staffData.additionalBranchIds && staffData.additionalBranchIds.length > 0) {
            for (const branchId of staffData.additionalBranchIds) {
                await connection.query(
                    `INSERT IGNORE INTO user_branch_access (tenant_id, user_id, branch_id) VALUES (?, ?, ?)`,
                    [tenantId, userId, branchId]
                );
            }
        }

        // 4. Teacher Subjects
        if (staffData.subjectIds && staffData.subjectIds.length > 0) {
            for (const subjectId of staffData.subjectIds) {
                await connection.query(
                    `INSERT IGNORE INTO teacher_subjects (tenant_id, teacher_user_id, subject_id) VALUES (?, ?, ?)`,
                    [tenantId, userId, subjectId]
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
            b.name as primary_branch_name
        FROM staff_profiles sp
        JOIN users u ON sp.user_id = u.id
        LEFT JOIN branches b ON sp.branch_id = b.id
        WHERE sp.tenant_id = ? AND sp.deleted_at IS NULL
    `;
    const params = [tenantId];

    if (filters.search) {
        query += ` AND (sp.first_name LIKE ? OR sp.last_name LIKE ? OR sp.employee_id LIKE ? OR u.email LIKE ?)`;
        const searchStr = `%${filters.search}%`;
        params.push(searchStr, searchStr, searchStr, searchStr);
    }

    if (filters.branchId) {
        query += ` AND sp.branch_id = ?`;
        params.push(filters.branchId);
    }

    if (filters.employeeType) {
        query += ` AND sp.employee_type = ?`;
        params.push(filters.employeeType);
    }

    if (filters.department) {
        query += ` AND sp.department = ?`;
        params.push(filters.department);
    }

    query += ` ORDER BY sp.created_at DESC`;

    if (filters.limit) {
        query += ` LIMIT ?`;
        params.push(Number(filters.limit));
        
        if (filters.offset) {
            query += ` OFFSET ?`;
            params.push(Number(filters.offset));
        }
    }

    const [rows] = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM staff_profiles sp JOIN users u ON sp.user_id = u.id WHERE sp.tenant_id = ? AND sp.deleted_at IS NULL`;
    const countParams = [tenantId];
    
    if (filters.search) {
        countQuery += ` AND (sp.first_name LIKE ? OR sp.last_name LIKE ? OR sp.employee_id LIKE ? OR u.email LIKE ?)`;
        const searchStr = `%${filters.search}%`;
        countParams.push(searchStr, searchStr, searchStr, searchStr);
    }

    if (filters.branchId) {
        countQuery += ` AND sp.branch_id = ?`;
        countParams.push(filters.branchId);
    }

    const [countRows] = await pool.query(countQuery, countParams);

    return {
        data: rows,
        total: countRows[0].total
    };
};

const updateStaff = async (tenantId, staffId, staffData) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Update Staff Profile
        await connection.query(
            `UPDATE staff_profiles SET 
                branch_id = ?, contact_number = ?, alternate_mobile = ?,
                first_name = ?, last_name = ?, gender = ?, dob = ?, blood_group = ?, marital_status = ?,
                aadhaar_number = ?, pan_number = ?, personal_email = ?, current_address = ?, permanent_address = ?,
                city = ?, state = ?, pincode = ?, employee_type = ?, designation = ?, department = ?, joining_date = ?,
                employment_type = ?, employment_status = ?, reporting_manager = ?, experience = ?, qualification = ?,
                salary_type = ?, salary_amount = ?, bank_account_number = ?, bank_ifsc = ?, bank_name = ?,
                pf_applicable = ?, pf_account_number = ?, esic_applicable = ?, esic_account_number = ?,
                tds_applicable = ?, professional_tax_applicable = ?, emergency_contact_name = ?,
                emergency_contact_number = ?, max_lectures_per_day = ?,
                max_lectures_per_week = ?, biometric_mandatory = ?, status = ?
            WHERE id = ? AND tenant_id = ?`,
            [
                staffData.primaryBranchId || 1, staffData.mobile, staffData.alternateMobile,
                staffData.firstName, staffData.lastName, staffData.gender, staffData.dob || null, staffData.bloodGroup, staffData.maritalStatus,
                staffData.aadhaar, staffData.pan, staffData.personalEmail, staffData.currentAddress, staffData.permanentAddress,
                staffData.city, staffData.state, staffData.pinCode, staffData.employeeType, staffData.designation, staffData.department, staffData.joiningDate || null,
                staffData.employmentType, staffData.employmentStatus, staffData.reportingManager, staffData.experience, staffData.qualification,
                staffData.salaryType, staffData.salaryType === 'Monthly' ? staffData.monthlySalary : (staffData.salaryType === 'Hourly' ? staffData.hourlyRate : staffData.contractAmount),
                staffData.accountNumber, staffData.ifsc, staffData.bankName,
                staffData.pfNumber ? 1 : 0, staffData.pfNumber, staffData.esicNumber ? 1 : 0, staffData.esicNumber,
                staffData.tdsApplicable ? 1 : 0, staffData.professionalTax ? 1 : 0, staffData.emergencyContact,
                staffData.emergencyMobile, staffData.maxLecturesPerDay || null,
                staffData.maxLecturesPerWeek || null, staffData.biometricMandatory ? 1 : 0, staffData.status || 'active',
                staffId, tenantId
            ]
        );

        // Update user record if needed (like name and mobile)
        await connection.query(
            `UPDATE users u
             JOIN staff_profiles sp ON u.id = sp.user_id
             SET u.name = ?, u.mobile = ?
             WHERE sp.id = ? AND sp.tenant_id = ?`,
            [`${staffData.firstName} ${staffData.lastName}`.trim(), staffData.mobile, staffId, tenantId]
        );

        await connection.commit();
        return { success: true, profileId: staffId };
    } catch (error) {
        await connection.rollback();
        console.error('Error in updateStaff transaction:', error);
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    createStaff,
    getStaffList,
    updateStaff
};
