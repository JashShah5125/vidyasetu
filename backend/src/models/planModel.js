const pool = require('../config/db');

const formatPlan = (row) => {
    if (!row) return null;

    return {
        id: row.id,
        name: row.name,
        code: row.code,
        description: row.description,
        status: row.status,
        display_order: row.display_order,
        notes: row.notes,
        visibleTo: row.visible_to ? (typeof row.visible_to === 'string' ? JSON.parse(row.visible_to) : row.visible_to) : ['All'],
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
        created_by: row.created_by,
        updated_by: row.updated_by,

        monthly_price: Number(row.monthly_price) || 0,
        quarterly_price: Number(row.quarterly_price) || 0,
        half_yearly_price: Number(row.half_yearly_price) || 0,
        yearly_price: Number(row.yearly_price) || 0,
        lifetime_price: Number(row.lifetime_price) || 0,
        currency: row.currency,
        trial_days: Number(row.trial_days) || 0,
        setup_fee: Number(row.setup_fee) || 0,
        auto_renewal: row.auto_renewal,

        max_branches: row.max_branches,
        max_staff_users: row.max_staff_users,
        max_students: row.max_students,
        max_parents: row.max_parents,
        max_teachers: row.max_teachers,
        max_storage: row.max_storage,
        max_file_size: row.max_file_size,
        max_sms_credits: row.max_sms_credits,
        max_whatsapp_msgs: row.max_whatsapp_msgs,

        features: {
            admissions: row.admissions,
            student_management: row.student_management,
            parent_portal: row.parent_portal,
            teacher_portal: row.teacher_portal,
            attendance: row.attendance,
            timetable: row.timetable,
            assignments: row.assignments,
            exams: row.exams,
            results: row.results,
            doubts: row.doubts,
            fees: row.fees,
            payroll: row.payroll,
            income: row.income,
            expenses: row.expenses,
            notifications: row.notifications,
            sms: row.sms,
            whatsapp: row.whatsapp,
            email: row.email,
            reports: row.reports,
            audit_logs: row.audit_logs,
            import_export: row.import_export,
            api_access: row.api_access
        },
        support: {
            email_support: row.email_support,
            chat_support: row.chat_support,
            phone_support: row.phone_support,
            dedicated_account_manager: row.dedicated_account_manager,
            onboarding_assistance: row.onboarding_assistance
        },
        branding: {
            white_label: row.white_label,
            custom_domain: row.custom_domain,
            custom_logo: row.custom_logo,
            custom_email_templates: row.custom_email_templates
        },
        integrations: {
            razorpay: row.razorpay,
            cashfree: row.cashfree,
            whatsapp_business: row.whatsapp_business,
            zoom: row.zoom,
            google_meet: row.google_meet,
            google_calendar: row.google_calendar,
            biometric_devices: row.biometric_devices
        }
    };
};

const getPlans = async (statuses = ['Active', 'Inactive']) => {
    let whereClause = '';
    let params = [];
    if (statuses && statuses.length > 0) {
        whereClause = 'WHERE sp.status IN (?)';
        params.push(statuses);
    }
    const query = `
        SELECT sp.*, 
               pf.admissions, pf.student_management, pf.parent_portal, pf.teacher_portal, pf.attendance, pf.timetable, pf.assignments, pf.exams, pf.results, pf.doubts, pf.fees, pf.payroll, pf.income, pf.expenses, pf.notifications, pf.sms, pf.whatsapp, pf.email, pf.reports, pf.audit_logs, pf.import_export, pf.api_access,
               pl.max_branches, pl.max_staff_users, pl.max_students, pl.max_parents, pl.max_teachers, pl.max_storage, pl.max_file_size, pl.max_sms_credits, pl.max_whatsapp_msgs,
               ps.email_support, ps.chat_support, ps.phone_support, ps.dedicated_account_manager, ps.onboarding_assistance,
               pb.white_label, pb.custom_domain, pb.custom_logo, pb.custom_email_templates,
               pi.razorpay, pi.cashfree, pi.whatsapp_business, pi.zoom, pi.google_meet, pi.google_calendar, pi.biometric_devices
        FROM subscription_plans sp
        LEFT JOIN plan_features pf ON sp.id = pf.plan_id
        LEFT JOIN plan_limits pl ON sp.id = pl.plan_id
        LEFT JOIN plan_support ps ON sp.id = ps.plan_id
        LEFT JOIN plan_branding pb ON sp.id = pb.plan_id
        LEFT JOIN plan_integrations pi ON sp.id = pi.plan_id
        ${whereClause} 
        ORDER BY sp.display_order ASC
    `;
    const [rows] = await pool.query(query, params);
    return rows.map(formatPlan);
};

const getPlanById = async (id) => {
    const query = `
        SELECT sp.*, 
               pf.admissions, pf.student_management, pf.parent_portal, pf.teacher_portal, pf.attendance, pf.timetable, pf.assignments, pf.exams, pf.results, pf.doubts, pf.fees, pf.payroll, pf.income, pf.expenses, pf.notifications, pf.sms, pf.whatsapp, pf.email, pf.reports, pf.audit_logs, pf.import_export, pf.api_access,
               pl.max_branches, pl.max_staff_users, pl.max_students, pl.max_parents, pl.max_teachers, pl.max_storage, pl.max_file_size, pl.max_sms_credits, pl.max_whatsapp_msgs,
               ps.email_support, ps.chat_support, ps.phone_support, ps.dedicated_account_manager, ps.onboarding_assistance,
               pb.white_label, pb.custom_domain, pb.custom_logo, pb.custom_email_templates,
               pi.razorpay, pi.cashfree, pi.whatsapp_business, pi.zoom, pi.google_meet, pi.google_calendar, pi.biometric_devices
        FROM subscription_plans sp
        LEFT JOIN plan_features pf ON sp.id = pf.plan_id
        LEFT JOIN plan_limits pl ON sp.id = pl.plan_id
        LEFT JOIN plan_support ps ON sp.id = ps.plan_id
        LEFT JOIN plan_branding pb ON sp.id = pb.plan_id
        LEFT JOIN plan_integrations pi ON sp.id = pi.plan_id
        WHERE sp.id = ?
    `;
    const [rows] = await pool.query(query, [id]);
    return formatPlan(rows[0]);
};

const checkExactDuplicate = async (planData) => {
    const billing = planData.billing || {};
    const rl = planData.resource_limits || {};
    const fa = planData.features || {};
    const s = planData.support || {};
    const br = planData.branding || {};
    const it = planData.integrations || {};

    const [rows] = await pool.query(`
        SELECT sp.id
        FROM subscription_plans sp
        LEFT JOIN plan_limits pl ON sp.id = pl.plan_id
        LEFT JOIN plan_features pf ON sp.id = pf.plan_id
        LEFT JOIN plan_support ps ON sp.id = ps.plan_id
        LEFT JOIN plan_branding pb ON sp.id = pb.plan_id
        LEFT JOIN plan_integrations pi ON sp.id = pi.plan_id
        WHERE sp.status != 'Deleted'
          AND sp.name = ? AND sp.code = ? AND sp.status = ?
          AND COALESCE(sp.description, '') = COALESCE(?, '')
          AND sp.monthly_price = ? AND sp.quarterly_price = ? AND sp.half_yearly_price = ?
          AND sp.yearly_price = ? AND sp.lifetime_price = ?
          AND sp.currency = ? AND sp.trial_days = ? AND sp.setup_fee = ? AND sp.auto_renewal = ?
          AND COALESCE(pl.max_branches, -1) = ?
          AND COALESCE(pl.max_staff_users, -1) = ? AND COALESCE(pl.max_students, -1) = ?
          AND COALESCE(pl.max_parents, -1) = ? AND COALESCE(pl.max_teachers, -1) = ?
          AND COALESCE(pl.max_storage, '-1') = ? AND COALESCE(pl.max_file_size, '-1') = ?
          AND COALESCE(pl.max_sms_credits, -1) = ? AND COALESCE(pl.max_whatsapp_msgs, -1) = ?
          AND COALESCE(pf.admissions, 0) = ? AND COALESCE(pf.student_management, 0) = ?
          AND COALESCE(pf.parent_portal, 0) = ? AND COALESCE(pf.teacher_portal, 0) = ?
          AND COALESCE(pf.attendance, 0) = ? AND COALESCE(pf.timetable, 0) = ?
          AND COALESCE(pf.assignments, 0) = ? AND COALESCE(pf.exams, 0) = ?
          AND COALESCE(pf.results, 0) = ? AND COALESCE(pf.doubts, 0) = ?
          AND COALESCE(pf.fees, 0) = ? AND COALESCE(pf.payroll, 0) = ?
          AND COALESCE(pf.income, 0) = ? AND COALESCE(pf.expenses, 0) = ?
          AND COALESCE(pf.notifications, 0) = ? AND COALESCE(pf.sms, 0) = ?
          AND COALESCE(pf.whatsapp, 0) = ? AND COALESCE(pf.email, 0) = ?
          AND COALESCE(pf.reports, 0) = ? AND COALESCE(pf.audit_logs, 0) = ?
          AND COALESCE(pf.import_export, 0) = ? AND COALESCE(pf.api_access, 0) = ?
          AND COALESCE(ps.email_support, 0) = ? AND COALESCE(ps.chat_support, 0) = ?
          AND COALESCE(ps.phone_support, 0) = ? AND COALESCE(ps.dedicated_account_manager, 0) = ?
          AND COALESCE(ps.onboarding_assistance, 0) = ?
          AND COALESCE(pb.white_label, 0) = ? AND COALESCE(pb.custom_domain, 0) = ?
          AND COALESCE(pb.custom_logo, 0) = ? AND COALESCE(pb.custom_email_templates, 0) = ?
          AND COALESCE(pi.razorpay, 0) = ? AND COALESCE(pi.cashfree, 0) = ?
          AND COALESCE(pi.whatsapp_business, 0) = ? AND COALESCE(pi.zoom, 0) = ?
          AND COALESCE(pi.google_meet, 0) = ? AND COALESCE(pi.google_calendar, 0) = ?
          AND COALESCE(pi.biometric_devices, 0) = ?
        LIMIT 1
    `, [
        planData.name, planData.code, planData.status || 'Active',
        planData.description || '',
        billing.monthly_price || 0, billing.quarterly_price || 0, billing.half_yearly_price || 0,
        billing.yearly_price || 0, billing.lifetime_price || 0,
        billing.currency || 'INR', billing.trial_days || 0, billing.setup_fee || 0, billing.auto_renewal || 0,
        rl.max_branches ?? -1,
        rl.max_staff_users ?? -1, rl.max_students ?? -1,
        rl.max_parents ?? -1, rl.max_teachers ?? -1,
        rl.max_storage || '-1', rl.max_file_size || '-1',
        rl.max_sms_credits ?? -1, rl.max_whatsapp_msgs ?? -1,
        fa.admissions || 0, fa.student_management || 0,
        fa.parent_portal || 0, fa.teacher_portal || 0,
        fa.attendance || 0, fa.timetable || 0,
        fa.assignments || 0, fa.exams || 0,
        fa.results || 0, fa.doubts || 0,
        fa.fees || 0, fa.payroll || 0,
        fa.income || 0, fa.expenses || 0,
        fa.notifications || 0, fa.sms || 0,
        fa.whatsapp || 0, fa.email || 0,
        fa.reports || 0, fa.audit_logs || 0,
        fa.import_export || 0, fa.api_access || 0,
        s.email_support || 0, s.chat_support || 0,
        s.phone_support || 0, s.dedicated_account_manager || 0,
        s.onboarding_assistance || 0,
        br.white_label || 0, br.custom_domain || 0,
        br.custom_logo || 0, br.custom_email_templates || 0,
        it.razorpay || 0, it.cashfree || 0,
        it.whatsapp_business || 0, it.zoom || 0,
        it.google_meet || 0, it.google_calendar || 0,
        it.biometric_devices || 0
    ]);

    return rows.length > 0 ? rows[0].id : null;
};

const createPlan = async (planData) => {
    // Check for exact duplicate before any DB writes
    const duplicateId = await checkExactDuplicate(planData);
    if (duplicateId) {
        const err = new Error('An identical plan already exists. Please modify at least one field before creating.');
        err.code = 'EXACT_DUPLICATE';
        throw err;
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const billing = planData.billing || {};

        const rl = planData.resource_limits || {};
        const fa = planData.features || {};
        const s = planData.support || {};
        const br = planData.branding || {};
        const it = planData.integrations || {};

        const visibleTo = planData.visibleTo || ['All'];

        const querySp = `
            INSERT INTO subscription_plans (
                name, code, description, status, display_order, notes,
                monthly_price, quarterly_price, half_yearly_price, yearly_price, lifetime_price,
                currency, trial_days, setup_fee, auto_renewal,
                visible_to
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const valuesSp = [
            planData.name, planData.code, planData.description, planData.status || 'Active', planData.display_order || 0, planData.notes,
            billing.monthly_price || 0, billing.quarterly_price || 0, billing.half_yearly_price || 0, billing.yearly_price || 0, billing.lifetime_price || 0,
            billing.currency || 'INR', billing.trial_days || 0, billing.setup_fee || 0.00, billing.auto_renewal || 0,
            JSON.stringify(visibleTo)
        ];

        const [resultSp] = await connection.query(querySp, valuesSp);
        const planId = resultSp.insertId;

        await connection.query(`
            INSERT INTO plan_features (plan_id, admissions, student_management, parent_portal, teacher_portal, attendance, timetable, assignments, exams, results, doubts, fees, payroll, income, expenses, notifications, sms, whatsapp, email, reports, audit_logs, import_export, api_access)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            planId, fa.admissions || 0, fa.student_management || 0, fa.parent_portal || 0, fa.teacher_portal || 0, fa.attendance || 0, fa.timetable || 0, fa.assignments || 0, fa.exams || 0, fa.results || 0, fa.doubts || 0, fa.fees || 0, fa.payroll || 0, fa.income || 0, fa.expenses || 0, fa.notifications || 0, fa.sms || 0, fa.whatsapp || 0, fa.email || 0, fa.reports || 0, fa.audit_logs || 0, fa.import_export || 0, fa.api_access || 0
        ]);

        await connection.query(`
            INSERT INTO plan_limits (plan_id, max_branches, max_staff_users, max_students, max_parents, max_teachers, max_storage, max_file_size, max_sms_credits, max_whatsapp_msgs)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            planId, rl.max_branches ?? -1, rl.max_staff_users ?? -1, rl.max_students ?? -1, rl.max_parents ?? -1, rl.max_teachers ?? -1, rl.max_storage || '-1', rl.max_file_size || '-1', rl.max_sms_credits ?? -1, rl.max_whatsapp_msgs ?? -1
        ]);

        await connection.query(`
            INSERT INTO plan_support (plan_id, email_support, chat_support, phone_support, dedicated_account_manager, onboarding_assistance)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            planId, s.email_support || 0, s.chat_support || 0, s.phone_support || 0, s.dedicated_account_manager || 0, s.onboarding_assistance || 0
        ]);

        await connection.query(`
            INSERT INTO plan_branding (plan_id, white_label, custom_domain, custom_logo, custom_email_templates)
            VALUES (?, ?, ?, ?, ?)
        `, [
            planId, br.white_label || 0, br.custom_domain || 0, br.custom_logo || 0, br.custom_email_templates || 0
        ]);

        await connection.query(`
            INSERT INTO plan_integrations (plan_id, razorpay, cashfree, whatsapp_business, zoom, google_meet, google_calendar, biometric_devices)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            planId, it.razorpay || 0, it.cashfree || 0, it.whatsapp_business || 0, it.zoom || 0, it.google_meet || 0, it.google_calendar || 0, it.biometric_devices || 0
        ]);

        await connection.commit();
        return planId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const updatePlan = async (id, planData) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const billing = planData.billing || {};

        const rl = planData.resource_limits || {};
        const fa = planData.features || {};
        const s = planData.support || {};
        const br = planData.branding || {};
        const it = planData.integrations || {};

        const visibleTo = planData.visibleTo || ['All'];

        const querySp = `
            UPDATE subscription_plans SET 
                name=?, code=?, description=?, status=?, display_order=?, notes=?,
                monthly_price=?, quarterly_price=?, half_yearly_price=?, yearly_price=?, lifetime_price=?,
                currency=?, trial_days=?, setup_fee=?, auto_renewal=?,
                visible_to=?, updated_at=CURRENT_TIMESTAMP
            WHERE id=?
        `;
        const valuesSp = [
            planData.name, planData.code, planData.description, planData.status || 'Active', planData.display_order || 0, planData.notes,
            billing.monthly_price || 0, billing.quarterly_price || 0, billing.half_yearly_price || 0, billing.yearly_price || 0, billing.lifetime_price || 0,
            billing.currency || 'INR', billing.trial_days || 0, billing.setup_fee || 0.00, billing.auto_renewal || 0,
            JSON.stringify(visibleTo),
            id
        ];
        await connection.query(querySp, valuesSp);

        await connection.query(`
            UPDATE plan_features SET 
                admissions=?, student_management=?, parent_portal=?, teacher_portal=?, attendance=?, timetable=?, assignments=?, exams=?, results=?, doubts=?, fees=?, payroll=?, income=?, expenses=?, notifications=?, sms=?, whatsapp=?, email=?, reports=?, audit_logs=?, import_export=?, api_access=?
            WHERE plan_id=?
        `, [
            fa.admissions || 0, fa.student_management || 0, fa.parent_portal || 0, fa.teacher_portal || 0, fa.attendance || 0, fa.timetable || 0, fa.assignments || 0, fa.exams || 0, fa.results || 0, fa.doubts || 0, fa.fees || 0, fa.payroll || 0, fa.income || 0, fa.expenses || 0, fa.notifications || 0, fa.sms || 0, fa.whatsapp || 0, fa.email || 0, fa.reports || 0, fa.audit_logs || 0, fa.import_export || 0, fa.api_access || 0,
            id
        ]);

        await connection.query(`
            UPDATE plan_limits SET 
                max_branches=?, max_staff_users=?, max_students=?, max_parents=?, max_teachers=?, max_storage=?, max_file_size=?, max_sms_credits=?, max_whatsapp_msgs=?
            WHERE plan_id=?
        `, [
            rl.max_branches ?? -1, rl.max_staff_users ?? -1, rl.max_students ?? -1, rl.max_parents ?? -1, rl.max_teachers ?? -1, rl.max_storage || '-1', rl.max_file_size || '-1', rl.max_sms_credits ?? -1, rl.max_whatsapp_msgs ?? -1,
            id
        ]);

        await connection.query(`
            UPDATE plan_support SET 
                email_support=?, chat_support=?, phone_support=?, dedicated_account_manager=?, onboarding_assistance=?
            WHERE plan_id=?
        `, [
            s.email_support || 0, s.chat_support || 0, s.phone_support || 0, s.dedicated_account_manager || 0, s.onboarding_assistance || 0,
            id
        ]);

        await connection.query(`
            UPDATE plan_branding SET 
                white_label=?, custom_domain=?, custom_logo=?, custom_email_templates=?
            WHERE plan_id=?
        `, [
            br.white_label || 0, br.custom_domain || 0, br.custom_logo || 0, br.custom_email_templates || 0,
            id
        ]);

        await connection.query(`
            UPDATE plan_integrations SET 
                razorpay=?, cashfree=?, whatsapp_business=?, zoom=?, google_meet=?, google_calendar=?, biometric_devices=?
            WHERE plan_id=?
        `, [
            it.razorpay || 0, it.cashfree || 0, it.whatsapp_business || 0, it.zoom || 0, it.google_meet || 0, it.google_calendar || 0, it.biometric_devices || 0,
            id
        ]);

        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const updatePlanStatus = async (id, isActive) => {
    const status = isActive ? 'Active' : 'Inactive';
    const query = `UPDATE subscription_plans SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    const [result] = await pool.query(query, [status, id]);
    return result.affectedRows > 0;
};

const deletePlan = async (id) => {
    const query = `UPDATE subscription_plans SET status = 'Deleted', deleted_at = CURRENT_TIMESTAMP WHERE id = ?`;
    const [result] = await pool.query(query, [id]);
    return result.affectedRows > 0;
};

const updatePlanVisibility = async (id, visibleTo) => {
    const query = `UPDATE subscription_plans SET visible_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    const [result] = await pool.query(query, [JSON.stringify(visibleTo), id]);
    return result.affectedRows > 0;
};

module.exports = {
    getPlans,
    getPlanById,
    createPlan,
    updatePlan,
    updatePlanStatus,
    deletePlan,
    updatePlanVisibility
};
