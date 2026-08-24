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
        
        billing_type: row.billing_type,
        price: row.price,
        currency: row.currency,
        trial_days: row.trial_days,
        setup_fee: row.setup_fee,
        renewal_price: row.renewal_price,
        auto_renewal: row.auto_renewal,
        
        max_instances: row.max_instances,
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
        SELECT 
            sp.*,
            pb.billing_type, pb.price, pb.currency, pb.trial_days, pb.setup_fee, pb.renewal_price, pb.auto_renewal,
            prl.max_instances, prl.max_branches, prl.max_staff_users, prl.max_students, prl.max_parents, prl.max_teachers, prl.max_storage, prl.max_file_size, prl.max_sms_credits, prl.max_whatsapp_msgs,
            pfa.admissions, pfa.student_management, pfa.parent_portal, pfa.teacher_portal, pfa.attendance, pfa.timetable, pfa.assignments, pfa.exams, pfa.results, pfa.doubts, pfa.fees, pfa.payroll, pfa.income, pfa.expenses, pfa.notifications, pfa.sms, pfa.whatsapp, pfa.email, pfa.reports, pfa.audit_logs, pfa.import_export, pfa.api_access,
            ps.email_support, ps.chat_support, ps.phone_support, ps.dedicated_account_manager, ps.onboarding_assistance,
            pbr.white_label, pbr.custom_domain, pbr.custom_logo, pbr.custom_email_templates,
            pi.razorpay, pi.cashfree, pi.whatsapp_business, pi.zoom, pi.google_meet, pi.google_calendar, pi.biometric_devices,
            (SELECT JSON_ARRAYAGG(tenant_id) FROM plan_visibility pv WHERE pv.plan_id = sp.id) as visible_to
        FROM subscription_plans sp
        LEFT JOIN plan_billing pb ON sp.id = pb.plan_id
        LEFT JOIN plan_resource_limits prl ON sp.id = prl.plan_id
        LEFT JOIN plan_feature_access pfa ON sp.id = pfa.plan_id
        LEFT JOIN plan_support ps ON sp.id = ps.plan_id
        LEFT JOIN plan_branding pbr ON sp.id = pbr.plan_id
        LEFT JOIN plan_integrations pi ON sp.id = pi.plan_id
        ${whereClause}
        ORDER BY sp.display_order ASC
    `;
    const [rows] = await pool.query(query, params);
    return rows.map(formatPlan);
};

const getPlanById = async (id) => {
    const query = `
        SELECT 
            sp.*,
            pb.billing_type, pb.price, pb.currency, pb.trial_days, pb.setup_fee, pb.renewal_price, pb.auto_renewal,
            prl.max_instances, prl.max_branches, prl.max_staff_users, prl.max_students, prl.max_parents, prl.max_teachers, prl.max_storage, prl.max_file_size, prl.max_sms_credits, prl.max_whatsapp_msgs,
            pfa.admissions, pfa.student_management, pfa.parent_portal, pfa.teacher_portal, pfa.attendance, pfa.timetable, pfa.assignments, pfa.exams, pfa.results, pfa.doubts, pfa.fees, pfa.payroll, pfa.income, pfa.expenses, pfa.notifications, pfa.sms, pfa.whatsapp, pfa.email, pfa.reports, pfa.audit_logs, pfa.import_export, pfa.api_access,
            ps.email_support, ps.chat_support, ps.phone_support, ps.dedicated_account_manager, ps.onboarding_assistance,
            pbr.white_label, pbr.custom_domain, pbr.custom_logo, pbr.custom_email_templates,
            pi.razorpay, pi.cashfree, pi.whatsapp_business, pi.zoom, pi.google_meet, pi.google_calendar, pi.biometric_devices,
            (SELECT JSON_ARRAYAGG(tenant_id) FROM plan_visibility pv WHERE pv.plan_id = sp.id) as visible_to
        FROM subscription_plans sp
        LEFT JOIN plan_billing pb ON sp.id = pb.plan_id
        LEFT JOIN plan_resource_limits prl ON sp.id = prl.plan_id
        LEFT JOIN plan_feature_access pfa ON sp.id = pfa.plan_id
        LEFT JOIN plan_support ps ON sp.id = ps.plan_id
        LEFT JOIN plan_branding pbr ON sp.id = pbr.plan_id
        LEFT JOIN plan_integrations pi ON sp.id = pi.plan_id
        WHERE sp.id = ?
    `;
    const [rows] = await pool.query(query, [id]);
    return formatPlan(rows[0]);
};

const createPlan = async (planData) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Insert into subscription_plans
        const [planResult] = await connection.query(`
            INSERT INTO subscription_plans (name, code, description, status, display_order, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            planData.name,
            planData.code,
            planData.description,
            planData.status || 'Active',
            planData.display_order || 0,
            planData.notes
        ]);
        const planId = planResult.insertId;

        // 2. Insert into plan_billing
        const b = planData.billing || {};
        await connection.query(`
            INSERT INTO plan_billing (plan_id, billing_type, price, currency, trial_days, setup_fee, renewal_price, auto_renewal)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            planId,
            b.billing_type || 'Monthly',
            b.price || 0.00,
            b.currency || 'INR',
            b.trial_days || 0,
            b.setup_fee || 0.00,
            b.renewal_price || 0.00,
            b.auto_renewal || 0
        ]);

        // 3. Insert into plan_resource_limits
        const rl = planData.resource_limits || {};
        await connection.query(`
            INSERT INTO plan_resource_limits (plan_id, max_instances, max_branches, max_staff_users, max_students, max_parents, max_teachers, max_storage, max_file_size, max_sms_credits, max_whatsapp_msgs)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            planId,
            rl.max_instances !== undefined ? rl.max_instances : -1,
            rl.max_branches !== undefined ? rl.max_branches : -1,
            rl.max_staff_users !== undefined ? rl.max_staff_users : -1,
            rl.max_students !== undefined ? rl.max_students : -1,
            rl.max_parents !== undefined ? rl.max_parents : -1,
            rl.max_teachers !== undefined ? rl.max_teachers : -1,
            rl.max_storage || '-1',
            rl.max_file_size || '-1',
            rl.max_sms_credits !== undefined ? rl.max_sms_credits : -1,
            rl.max_whatsapp_msgs !== undefined ? rl.max_whatsapp_msgs : -1
        ]);

        // 4. Insert into plan_feature_access
        const fa = planData.features || {};
        await connection.query(`
            INSERT INTO plan_feature_access (plan_id, admissions, student_management, parent_portal, teacher_portal, attendance, timetable, assignments, exams, results, doubts, fees, payroll, income, expenses, notifications, sms, whatsapp, email, reports, audit_logs, import_export, api_access)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            planId,
            fa.admissions || 0,
            fa.student_management || 0,
            fa.parent_portal || 0,
            fa.teacher_portal || 0,
            fa.attendance || 0,
            fa.timetable || 0,
            fa.assignments || 0,
            fa.exams || 0,
            fa.results || 0,
            fa.doubts || 0,
            fa.fees || 0,
            fa.payroll || 0,
            fa.income || 0,
            fa.expenses || 0,
            fa.notifications || 0,
            fa.sms || 0,
            fa.whatsapp || 0,
            fa.email || 0,
            fa.reports || 0,
            fa.audit_logs || 0,
            fa.import_export || 0,
            fa.api_access || 0
        ]);

        // 5. Insert into plan_support
        const s = planData.support || {};
        await connection.query(`
            INSERT INTO plan_support (plan_id, email_support, chat_support, phone_support, dedicated_account_manager, onboarding_assistance)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            planId,
            s.email_support || 0,
            s.chat_support || 0,
            s.phone_support || 0,
            s.dedicated_account_manager || 0,
            s.onboarding_assistance || 0
        ]);

        // 6. Insert into plan_branding
        const br = planData.branding || {};
        await connection.query(`
            INSERT INTO plan_branding (plan_id, white_label, custom_domain, custom_logo, custom_email_templates)
            VALUES (?, ?, ?, ?, ?)
        `, [
            planId,
            br.white_label || 0,
            br.custom_domain || 0,
            br.custom_logo || 0,
            br.custom_email_templates || 0
        ]);

        // 7. Insert into plan_integrations
        const it = planData.integrations || {};
        await connection.query(`
            INSERT INTO plan_integrations (plan_id, razorpay, cashfree, whatsapp_business, zoom, google_meet, google_calendar, biometric_devices)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            planId,
            it.razorpay || 0,
            it.cashfree || 0,
            it.whatsapp_business || 0,
            it.zoom || 0,
            it.google_meet || 0,
            it.google_calendar || 0,
            it.biometric_devices || 0
        ]);

        // 8. Insert into plan_visibility
        const visibleTo = planData.visibleTo || ['All'];
        if (visibleTo.length > 0) {
            const visibilityValues = visibleTo.map(tenantId => [planId, tenantId]);
            await connection.query(`
                INSERT INTO plan_visibility (plan_id, tenant_id)
                VALUES ?
            `, [visibilityValues]);
        }

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

        // 1. Update subscription_plans
        await connection.query(`
            UPDATE subscription_plans
            SET name = ?, code = ?, description = ?, status = ?, display_order = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            planData.name,
            planData.code,
            planData.description,
            planData.status || 'Active',
            planData.display_order || 0,
            planData.notes,
            id
        ]);

        // 2. Update plan_billing
        const b = planData.billing || {};
        await connection.query(`
            UPDATE plan_billing
            SET billing_type = ?, price = ?, currency = ?, trial_days = ?, setup_fee = ?, renewal_price = ?, auto_renewal = ?
            WHERE plan_id = ?
        `, [
            b.billing_type || 'Monthly',
            b.price || 0.00,
            b.currency || 'INR',
            b.trial_days || 0,
            b.setup_fee || 0.00,
            b.renewal_price || 0.00,
            b.auto_renewal || 0,
            id
        ]);

        // 3. Update plan_resource_limits
        const rl = planData.resource_limits || {};
        await connection.query(`
            UPDATE plan_resource_limits
            SET max_instances = ?, max_branches = ?, max_staff_users = ?, max_students = ?, max_parents = ?, max_teachers = ?, max_storage = ?, max_file_size = ?, max_sms_credits = ?, max_whatsapp_msgs = ?
            WHERE plan_id = ?
        `, [
            rl.max_instances !== undefined ? rl.max_instances : -1,
            rl.max_branches !== undefined ? rl.max_branches : -1,
            rl.max_staff_users !== undefined ? rl.max_staff_users : -1,
            rl.max_students !== undefined ? rl.max_students : -1,
            rl.max_parents !== undefined ? rl.max_parents : -1,
            rl.max_teachers !== undefined ? rl.max_teachers : -1,
            rl.max_storage || '-1',
            rl.max_file_size || '-1',
            rl.max_sms_credits !== undefined ? rl.max_sms_credits : -1,
            rl.max_whatsapp_msgs !== undefined ? rl.max_whatsapp_msgs : -1,
            id
        ]);

        // 4. Update plan_feature_access
        const fa = planData.features || {};
        await connection.query(`
            UPDATE plan_feature_access
            SET admissions = ?, student_management = ?, parent_portal = ?, teacher_portal = ?, attendance = ?, timetable = ?, assignments = ?, exams = ?, results = ?, doubts = ?, fees = ?, payroll = ?, income = ?, expenses = ?, notifications = ?, sms = ?, whatsapp = ?, email = ?, reports = ?, audit_logs = ?, import_export = ?, api_access = ?
            WHERE plan_id = ?
        `, [
            fa.admissions || 0,
            fa.student_management || 0,
            fa.parent_portal || 0,
            fa.teacher_portal || 0,
            fa.attendance || 0,
            fa.timetable || 0,
            fa.assignments || 0,
            fa.exams || 0,
            fa.results || 0,
            fa.doubts || 0,
            fa.fees || 0,
            fa.payroll || 0,
            fa.income || 0,
            fa.expenses || 0,
            fa.notifications || 0,
            fa.sms || 0,
            fa.whatsapp || 0,
            fa.email || 0,
            fa.reports || 0,
            fa.audit_logs || 0,
            fa.import_export || 0,
            fa.api_access || 0,
            id
        ]);

        // 5. Update plan_support
        const s = planData.support || {};
        await connection.query(`
            UPDATE plan_support
            SET email_support = ?, chat_support = ?, phone_support = ?, dedicated_account_manager = ?, onboarding_assistance = ?
            WHERE plan_id = ?
        `, [
            s.email_support || 0,
            s.chat_support || 0,
            s.phone_support || 0,
            s.dedicated_account_manager || 0,
            s.onboarding_assistance || 0,
            id
        ]);

        // 6. Update plan_branding
        const br = planData.branding || {};
        await connection.query(`
            UPDATE plan_branding
            SET white_label = ?, custom_domain = ?, custom_logo = ?, custom_email_templates = ?
            WHERE plan_id = ?
        `, [
            br.white_label || 0,
            br.custom_domain || 0,
            br.custom_logo || 0,
            br.custom_email_templates || 0,
            id
        ]);

        // 7. Update plan_integrations
        const it = planData.integrations || {};
        await connection.query(`
            UPDATE plan_integrations
            SET razorpay = ?, cashfree = ?, whatsapp_business = ?, zoom = ?, google_meet = ?, google_calendar = ?, biometric_devices = ?
            WHERE plan_id = ?
        `, [
            it.razorpay || 0,
            it.cashfree || 0,
            it.whatsapp_business || 0,
            it.zoom || 0,
            it.google_meet || 0,
            it.google_calendar || 0,
            it.biometric_devices || 0,
            id
        ]);

        // 8. Update plan_visibility (delete existing, insert new)
        const visibleTo = planData.visibleTo || ['All'];
        await connection.query('DELETE FROM plan_visibility WHERE plan_id = ?', [id]);
        if (visibleTo.length > 0) {
            const visibilityValues = visibleTo.map(tenantId => [id, tenantId]);
            await connection.query(`
                INSERT INTO plan_visibility (plan_id, tenant_id)
                VALUES ?
            `, [visibilityValues]);
        }

        await connection.commit();
        return id;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const updatePlanStatus = async (id, is_active) => {
    const statusVal = is_active === 1 || is_active === true ? 'Active' : 'Inactive';
    const query = `
        UPDATE subscription_plans
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    const [result] = await pool.query(query, [statusVal, id]);
    return result.affectedRows > 0;
};

const deletePlan = async (id) => {
    const query = `
        UPDATE subscription_plans
        SET status = 'Deleted', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    const [result] = await pool.query(query, [id]);
    return result.affectedRows > 0;
};

const updatePlanVisibility = async (id, visibleTo) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query('DELETE FROM plan_visibility WHERE plan_id = ?', [id]);
        if (visibleTo && visibleTo.length > 0) {
            const visibilityValues = visibleTo.map(tenantId => [id, tenantId]);
            await connection.query(`
                INSERT INTO plan_visibility (plan_id, tenant_id)
                VALUES ?
            `, [visibilityValues]);
        }

        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    getPlans,
    getPlanById,
    createPlan,
    updatePlan,
    updatePlanStatus,
    updatePlanVisibility,
    deletePlan
};
