const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const studentModel = require('./studentModel');

/**
 * Enquiry status TINYINT codes:
 * 0=new, 1=assigned, 2=contacted, 3=follow_up, 4=interested,
 * 5=demo_scheduled, 6=fee_discussion, 7=converted, -1=lost, -2=cancelled
 */

const normalizeEnquiryStatus = (status) => {
    if (status === undefined || status === null) return 0;
    if (typeof status === 'number') return status;
    const s = String(status).trim().toLowerCase();
    const map = {
        'new': 0, 'assigned': 1, 'contacted': 2, 'follow_up': 3, 'followup': 3,
        'interested': 4, 'demo_scheduled': 5, 'fee_discussion': 6,
        'converted': 7, 'lost': -1, 'cancelled': -2
    };
    return map[s] !== undefined ? map[s] : 0;
};

const generateAdmissionNumber = async (tenantId) => {
    const [rows] = await pool.query(
        `SELECT COUNT(*) as count FROM admissions WHERE tenant_id = ?`,
        [tenantId]
    );
    const num = (rows[0].count + 1).toString().padStart(5, '0');
    return `ADM-${new Date().getFullYear()}-${num}`;
};

/**
 * Get enquiry list with filters + pagination, joins academic/counsellor/branch context.
 */
const getEnquiries = async (tenantId, filters = {}, accessContext = null) => {
    const {
        search = '',
        status,
        source,
        branchId,
        courseId,
        programId,
        counsellorId,
        limit = 10,
        offset = 0
    } = filters;

    let whereClause = ` WHERE e.tenant_id = ?`;
    if (status !== undefined && status !== '' && status !== 'All' && Number(status) === -1) {
        whereClause += ` AND (e.deleted_at IS NULL OR e.status = -1)`;
    } else {
        whereClause += ` AND e.deleted_at IS NULL`;
    }
    const params = [tenantId];

    if (accessContext && accessContext.scope === 'BRANCH') {
        whereClause += ` AND e.assigned_branch_id = ?`;
        params.push(accessContext.authorizedBranchId);
    }

    if (search) {
        whereClause += ` AND (e.student_name LIKE ? OR e.student_mobile LIKE ? OR e.parent_name LIKE ? OR e.parent_mobile LIKE ?)`;
        const term = `%${search}%`;
        params.push(term, term, term, term);
    }
    if (status !== undefined && status !== '' && status !== 'All') {
        whereClause += ` AND e.status = ?`;
        params.push(Number(status));
    }
    if (source !== undefined && source !== '' && source !== 'All') {
        whereClause += ` AND e.source = ?`;
        params.push(Number(source));
    }
    if (branchId && branchId !== 'All') {
        whereClause += ` AND e.assigned_branch_id = ?`;
        params.push(Number(branchId));
    }
    if (courseId) {
        whereClause += ` AND e.interested_course_id = ?`;
        params.push(Number(courseId));
    }
    if (programId) {
        whereClause += ` AND e.interested_program_id = ?`;
        params.push(Number(programId));
    }
    if (counsellorId) {
        whereClause += ` AND e.counsellor_id = ?`;
        params.push(Number(counsellorId));
    }

    const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM enquiries e ${whereClause}`,
        params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(`
        SELECT
            e.id, e.tenant_id, e.preferred_branch_id, e.assigned_branch_id, e.source,
            e.student_name, e.student_mobile, e.student_email,
            e.parent_name, e.parent_mobile, e.parent_email,
            e.interested_course_id, e.interested_program_id, e.package_type, e.package_details,
            e.interested_academic_year_id, e.interested_level_id,
            e.counsellor_id, e.status, e.lost_reason, e.demo_scheduled_at, e.next_followup_at,
            e.admission_confirmed_at, e.actual_price, e.concession_amount, e.final_price,
            e.down_payment, e.installment_months, e.installment_amount,
            e.counselling_notes, e.lost_at, e.converted_student_id, e.converted_at,
            e.remarks, e.created_at, e.updated_at, e.created_by, e.updated_by,
            c.name AS course_name, p.name AS program_name, l.name AS level_name,
            ay.name AS academic_year_name,
            pb.name AS preferred_branch_name, ab.name AS assigned_branch_name,
            u.name AS counsellor_name
        FROM enquiries e
        LEFT JOIN courses c ON c.id = e.interested_course_id AND c.tenant_id = e.tenant_id
        LEFT JOIN programs p ON p.id = e.interested_program_id AND p.tenant_id = e.tenant_id
        LEFT JOIN levels l ON l.id = e.interested_level_id AND l.tenant_id = e.tenant_id
        LEFT JOIN academic_years ay ON ay.id = e.interested_academic_year_id AND ay.tenant_id = e.tenant_id
        LEFT JOIN branches pb ON pb.id = e.preferred_branch_id AND pb.tenant_id = e.tenant_id
        LEFT JOIN branches ab ON ab.id = e.assigned_branch_id AND ab.tenant_id = e.tenant_id
        LEFT JOIN users u ON u.id = e.counsellor_id AND u.tenant_id = e.tenant_id
        ${whereClause}
        ORDER BY e.created_at DESC
        LIMIT ? OFFSET ?
    `, [...params, Number(limit), Number(offset)]);

    return { data: rows, total };
};

/**
 * Get single enquiry by id.
 */
const getEnquiryById = async (tenantId, id) => {
    const [rows] = await pool.query(`
        SELECT
            e.id, e.tenant_id, e.preferred_branch_id, e.assigned_branch_id, e.source,
            e.student_name, e.student_mobile, e.student_email,
            e.parent_name, e.parent_mobile, e.parent_email,
            e.interested_course_id, e.interested_program_id, e.package_type, e.package_details,
            e.interested_academic_year_id, e.interested_level_id,
            e.counsellor_id, e.status, e.lost_reason, e.demo_scheduled_at, e.next_followup_at,
            e.admission_confirmed_at, e.actual_price, e.concession_amount, e.final_price,
            e.down_payment, e.installment_months, e.installment_amount,
            e.counselling_notes, e.lost_at, e.converted_student_id, e.converted_at,
            e.remarks, e.created_at, e.updated_at, e.created_by, e.updated_by,
            c.name AS course_name, p.name AS program_name, l.name AS level_name,
            ay.name AS academic_year_name,
            pb.name AS preferred_branch_name, ab.name AS assigned_branch_name,
            u.name AS counsellor_name
        FROM enquiries e
        LEFT JOIN courses c ON c.id = e.interested_course_id AND c.tenant_id = e.tenant_id
        LEFT JOIN programs p ON p.id = e.interested_program_id AND p.tenant_id = e.tenant_id
        LEFT JOIN levels l ON l.id = e.interested_level_id AND l.tenant_id = e.tenant_id
        LEFT JOIN academic_years ay ON ay.id = e.interested_academic_year_id AND ay.tenant_id = e.tenant_id
        LEFT JOIN branches pb ON pb.id = e.preferred_branch_id AND pb.tenant_id = e.tenant_id
        LEFT JOIN branches ab ON ab.id = e.assigned_branch_id AND ab.tenant_id = e.tenant_id
        LEFT JOIN users u ON u.id = e.counsellor_id AND u.tenant_id = e.tenant_id
        WHERE e.tenant_id = ? AND e.id = ?
    `, [tenantId, Number(id)]);
    return rows[0] || null;
};

/**
 * Create a new enquiry. Always starts at status 0 (new), logs the initial status entry.
 */
const createEnquiry = async (tenantId, payload, createdBy = 1) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const status = normalizeEnquiryStatus(payload.status);

        const packageDetails = payload.package_details !== undefined && payload.package_details !== null
            ? (typeof payload.package_details === 'object' ? JSON.stringify(payload.package_details) : payload.package_details)
            : null;

        const [result] = await connection.query(`
            INSERT INTO enquiries (
                tenant_id, preferred_branch_id, assigned_branch_id, source,
                student_name, student_mobile, student_email,
                parent_name, parent_mobile, parent_email,
                interested_course_id, interested_program_id, package_type, package_details,
                interested_academic_year_id, interested_level_id,
                counsellor_id, status, remarks, next_followup_at,
                actual_price, concession_amount, final_price, down_payment, installment_months,
                counselling_notes, created_by, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            tenantId,
            payload.preferred_branch_id,
            payload.assigned_branch_id || payload.preferred_branch_id,
            payload.source !== undefined ? payload.source : 0,
            payload.student_name,
            payload.student_mobile,
            payload.student_email || null,
            payload.parent_name || null,
            payload.parent_mobile || null,
            payload.parent_email || null,
            payload.interested_course_id || null,
            payload.interested_program_id || null,
            payload.package_type !== undefined ? payload.package_type : null,
            packageDetails,
            payload.interested_academic_year_id || null,
            payload.interested_level_id || null,
            payload.counsellor_id || null,
            status,
            payload.remarks || null,
            payload.next_followup_at || null,
            payload.actual_price || null,
            payload.concession_amount || 0,
            payload.final_price || null,
            payload.down_payment || 0,
            payload.installment_months || 1,
            payload.counselling_notes || null,
            createdBy,
            createdBy
        ]);

        const enquiryId = result.insertId;

        await connection.commit();
        connection.release();
        return getEnquiryById(tenantId, enquiryId);
    } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
    }
};

/**
 * Valid updatable columns on enquiries (whitelist to prevent injection/misuse).
 */
const UPDATABLE_COLUMNS = [
    'preferred_branch_id', 'assigned_branch_id', 'source', 'student_name', 'student_mobile',
    'student_email', 'parent_name', 'parent_mobile', 'parent_email', 'interested_course_id',
    'interested_program_id', 'package_type', 'package_details', 'interested_academic_year_id',
    'interested_level_id', 'counsellor_id', 'status',
    'lost_reason', 'lost_at', 'deleted_at', 'demo_scheduled_at', 'next_followup_at', 'admission_confirmed_at',
    'actual_price', 'concession_amount', 'final_price', 'down_payment', 'installment_months',
    'counselling_notes', 'remarks'
];

/**
 * Update enquiry fields. Records a status log when status changes and sets lost_at and deleted_at on lost.
 * Supports counsellor/branch reassignment tracking via to_user_id/to_branch_id on the log.
 */
const updateEnquiry = async (tenantId, id, updates, updatedBy = 1) => {
    const existing = await getEnquiryById(tenantId, id);
    if (!existing) return null;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const sets = [];
        const params = [];

        for (const col of UPDATABLE_COLUMNS) {
            if (updates[col] !== undefined && updates[col] !== null) {
                sets.push(`${col} = ?`);
                if (col === 'package_details' && typeof updates[col] === 'object') {
                    params.push(JSON.stringify(updates[col]));
                } else {
                    params.push(updates[col]);
                }
            }
        }

        if (updates.status !== undefined && Number(updates.status) === -1) {
            sets.push(`lost_at = NOW()`);
            sets.push(`deleted_at = NOW()`);
        }

        if (sets.length === 0) return existing;

        sets.push(`updated_by = ?`);
        params.push(updatedBy);
        params.push(tenantId, Number(id));
        await connection.query(
            `UPDATE enquiries SET ${sets.join(', ')} WHERE tenant_id = ? AND id = ?`,
            params
        );

        await connection.commit();
        connection.release();
        return getEnquiryById(tenantId, id);
    } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
    }
};

/**
 * Log a follow-up interaction. Syncs the enquiry's next_followup_at when a later date is set.
 */
const addFollowup = async (tenantId, payload, createdBy = 1) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [enquiry] = await connection.query(
            `SELECT id, next_followup_at FROM enquiries WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL`,
            [tenantId, Number(payload.enquiry_id)]
        );
        if (!enquiry.length) {
            const err = new Error('Enquiry not found.');
            err.statusCode = 404;
            throw err;
        }

        const [result] = await connection.query(`
            INSERT INTO enquiry_followups (tenant_id, enquiry_id, notes, next_followup_date, created_by)
            VALUES (?, ?, ?, ?, ?)
        `, [
            tenantId,
            Number(payload.enquiry_id),
            payload.notes || null,
            payload.next_followup_date || null,
            createdBy
        ]);

        if (payload.next_followup_date) {
            const currentNext = enquiry[0].next_followup_at;
            if (!currentNext || new Date(payload.next_followup_date) > new Date(currentNext)) {
                await connection.query(
                    `UPDATE enquiries SET next_followup_at = ? WHERE tenant_id = ? AND id = ?`,
                    [payload.next_followup_date, tenantId, Number(payload.enquiry_id)]
                );
            }
        }

        await connection.commit();
        connection.release();
        return { id: result.insertId };
    } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
    }
};

/**
 * List follow-up history for an enquiry.
 */
const getFollowups = async (tenantId, enquiryId) => {
    const [rows] = await pool.query(`
        SELECT ef.id, ef.tenant_id, ef.enquiry_id, ef.notes, ef.next_followup_date, ef.created_at, ef.created_by,
               u.name AS created_by_name
        FROM enquiry_followups ef
        LEFT JOIN users u ON u.id = ef.created_by
        WHERE ef.tenant_id = ? AND ef.enquiry_id = ?
        ORDER BY ef.created_at DESC
    `, [tenantId, Number(enquiryId)]);
    return rows;
};

/**
 * Convert an enquiry into a full student registration in one transaction:
 * creates student + student user + guardian (reusing createStudent flow), inserts an
 * admissions row (status 0 = registration_pending) and marks the enquiry converted.
 */
const convertToStudent = async (tenantId, enquiryId, formData, userId = 1, accessContext = null) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [enqRows] = await connection.query(
            `SELECT * FROM enquiries WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL FOR UPDATE`,
            [tenantId, Number(enquiryId)]
        );
        if (!enqRows.length) {
            const err = new Error('Enquiry not found.');
            err.statusCode = 404;
            throw err;
        }
        const enquiry = enqRows[0];
        if (Number(enquiry.status) === 7) {
            const err = new Error('This enquiry has already been converted.');
            err.statusCode = 409;
            throw err;
        }

        // Build student payload: formData wins, enquiry fee/academic values as fallback.
        const studentCode = formData.student_code || null;
        const studentPayload = {
            primary_branch_id: enquiry.assigned_branch_id,
            student_code: studentCode,
            full_name: formData.full_name || enquiry.student_name,
            mobile: formData.mobile || enquiry.student_mobile,
            email: formData.email || enquiry.student_email,
            dob: formData.dob || null,
            gender: formData.gender || 'Unknown',
            street: formData.street || null,
            city: formData.city || null,
            state: formData.state || null,
            pincode: formData.pincode || null,
            category: formData.category || 'General',
            school_name: formData.school_name || null,
            current_class: formData.current_class || null,
            board_id: formData.board_id || null,
            target_exam: formData.target_exam || null,
            year_of_attempt: formData.year_of_attempt || null,
            status: formData.status !== undefined ? formData.status : (formData.documents && formData.documents.length > 0 ? 4 : 3),
            batch_id: formData.batch_id || null,
            academic_year_id: formData.academic_year_id || enquiry.interested_academic_year_id || null,
            bundle_id: formData.bundle_id || null,
            subject_selection_type: formData.subject_selection_type || 'bundle',
            guardian_name: formData.guardian_name || enquiry.parent_name,
            guardian_mobile: formData.guardian_mobile || enquiry.parent_mobile,
            guardian_email: formData.guardian_email || enquiry.parent_email,
            guardian_relation: formData.guardian_relation || 'Parent',
            guardian_occupation: formData.guardian_occupation || null,
            documents: formData.documents || [],
            // Fee values only forwarded when an enrollment will be created (batch + academic year present),
            // so student_fee_assignments.enrollment_id is never NULL.
            gross_amount: (formData.batch_id && formData.academic_year_id) ? (formData.gross_amount || enquiry.actual_price) : undefined
        };

        const student = await studentModel.createStudent(tenantId, studentPayload, userId, accessContext);

        const admissionNumber = await generateAdmissionNumber(tenantId);
        const [admissionRes] = await connection.query(`
            INSERT INTO admissions (
                tenant_id, branch_id, student_id, enquiry_id, admission_date,
                admission_number, academic_year_id, admission_mode, status,
                registration_completed_at, created_by, updated_by
            ) VALUES (?, ?, ?, ?, CURDATE(), ?, ?, ?, 0, NOW(), ?, ?)
        `, [
            tenantId,
            enquiry.assigned_branch_id,
            student.id || student.student_id,
            enquiry.id,
            admissionNumber,
            formData.academic_year_id || enquiry.interested_academic_year_id || null,
            formData.admission_mode || 'staff_assisted',
            userId,
            userId
        ]);

        const fromStatus = enquiry.status;
        await connection.query(`
            UPDATE enquiries
            SET status = 7, converted_student_id = ?, converted_at = NOW(), admission_confirmed_at = NOW(),
                updated_by = ?
            WHERE tenant_id = ? AND id = ?
        `, [student.id || student.student_id, userId, tenantId, Number(enquiryId)]);

        await connection.commit();
        connection.release();
        return {
            studentId: student.id || student.student_id,
            admissionId: admissionRes.insertId,
            admissionNumber,
            enquiryId: Number(enquiryId)
        };
    } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
    }
};

module.exports = {
    normalizeEnquiryStatus,
    getEnquiries,
    getEnquiryById,
    createEnquiry,
    updateEnquiry,
    addFollowup,
    getFollowups,
    convertToStudent
};