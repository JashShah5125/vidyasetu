const pool = require('../config/db');

const subscriptionCols = `
    t.subscription_discount, t.subscription_final_price, t.subscription_tax, t.subscription_invoice_number,
    t.override_max_branches, t.override_max_staff_users, t.override_max_students, t.override_max_parents,
    t.override_max_teachers, t.override_max_storage, t.override_max_file_size, t.override_max_sms_credits, t.override_max_whatsapp_msgs
`;

const getSubscriptions = async (limit = 10, offset = 0, search = '', status = '') => {
    let query = `
        SELECT t.id, t.id as tenant_id, t.name as tenant_name, t.plan_id, t.subscription_status as status,
               t.billing_cycle, t.start_date, t.end_date, t.renewal_date, t.created_at, t.updated_at,
               sp.name as plan_name,
               (CASE WHEN pb.billing_type = 'Monthly' THEN pb.price ELSE pb.price / 12 END) as price_monthly,
               (CASE WHEN pb.billing_type = 'Yearly' THEN pb.price ELSE pb.price * 12 END) as price_annual,
               ${subscriptionCols}
        FROM tenants t
        JOIN subscription_plans sp ON t.plan_id = sp.id
        LEFT JOIN plan_billing pb ON sp.id = pb.plan_id
        WHERE t.tenant_type = 'customer'
    `;
    const params = [];

    if (search) {
        query += ` AND (t.name LIKE ?)`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern);
    }

    if (status && status !== 'All') {
        query += ` AND t.subscription_status = ?`;
        params.push(status.toLowerCase());
    }

    query += ` ORDER BY t.created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(query, params);

    let countQuery = `
        SELECT COUNT(*) as total 
        FROM tenants t
        WHERE t.tenant_type = 'customer'
    `;
    const countParams = [];

    if (search) {
        countQuery += ` AND (t.name LIKE ?)`;
        countParams.push(`%${search}%`);
    }
    
    if (status && status !== 'All') {
        countQuery += ` AND t.subscription_status = ?`;
        countParams.push(status.toLowerCase());
    }

    const [countRows] = await pool.query(countQuery, countParams);

    return {
        data: rows,
        total: countRows[0].total
    };
};

const getSubscriptionById = async (id) => {
    const query = `
        SELECT t.id, t.id as tenant_id, t.name as tenant_name, t.plan_id, t.subscription_status as status,
               t.billing_cycle, t.start_date, t.end_date, t.renewal_date, t.created_at, t.updated_at,
               sp.name as plan_name,
               ${subscriptionCols}
        FROM tenants t
        JOIN subscription_plans sp ON t.plan_id = sp.id
        WHERE t.id = ?
    `;
    const [rows] = await pool.query(query, [id]);
    return rows[0];
};

const updateSubscriptionPlan = async (id, planId) => {
    const query = `
        UPDATE tenants
        SET plan_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    const [result] = await pool.query(query, [planId, id]);
    return result.affectedRows > 0;
};

const updateSubscriptionFull = async (id, data) => {
    const query = `
        UPDATE tenants
        SET 
            plan_id = ?, 
            billing_cycle = ?, 
            start_date = ?, 
            end_date = ?, 
            subscription_status = ?,
            subscription_discount = ?,
            subscription_final_price = ?,
            subscription_tax = ?,
            subscription_invoice_number = ?,
            override_max_branches = ?,
            override_max_staff_users = ?,
            override_max_students = ?,
            override_max_parents = ?,
            override_max_teachers = ?,
            override_max_storage = ?,
            override_max_file_size = ?,
            override_max_sms_credits = ?,
            override_max_whatsapp_msgs = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    const params = [
        data.planId,
        data.billingCycle,
        data.startDate || null,
        data.expiryDate || null,
        data.status.toLowerCase(),
        data.discount !== undefined ? data.discount : null,
        data.finalPrice !== undefined ? data.finalPrice : null,
        data.tax !== undefined ? data.tax : null,
        data.invoiceNumber || null,
        data.overrides?.maxBranches !== undefined ? data.overrides.maxBranches : null,
        data.overrides?.maxStaffUsers !== undefined ? data.overrides.maxStaffUsers : null,
        data.overrides?.maxStudents !== undefined ? data.overrides.maxStudents : null,
        data.overrides?.maxParents !== undefined ? data.overrides.maxParents : null,
        data.overrides?.maxTeachers !== undefined ? data.overrides.maxTeachers : null,
        data.overrides?.maxStorage || null,
        data.overrides?.maxFileSize || null,
        data.overrides?.maxSmsCredits !== undefined ? data.overrides.maxSmsCredits : null,
        data.overrides?.maxWhatsappMsgs !== undefined ? data.overrides.maxWhatsappMsgs : null,
        id
    ];
    
    const [result] = await pool.query(query, params);
    return result.affectedRows > 0;
};

module.exports = {
    getSubscriptions,
    getSubscriptionById,
    updateSubscriptionPlan,
    updateSubscriptionFull
};
