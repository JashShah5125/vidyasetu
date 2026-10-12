const pool = require('../config/db');

async function setupParentPerms() {
    try {
        const perms = [
            { code: 'parent.profile.view', module: 'app_parent_profile', action: 'view', desc: 'View parent profile and linked children' },
            { code: 'parent.profile.update', module: 'app_parent_profile', action: 'update', desc: 'Update parent profile contact info' },
            { code: 'parent.profile.photo', module: 'app_parent_profile', action: 'photo', desc: 'Upload parent profile avatar image' },
            { code: 'parent.home.view', module: 'app_parent_home', action: 'view', desc: 'View parent family dashboard' },
            { code: 'parent.academic.view', module: 'app_parent_academic', action: 'view', desc: 'View child academic snapshot and timetable' },
            { code: 'parent.attendance.view', module: 'app_parent_attendance', action: 'view', desc: 'View child attendance summary and logs' },
            { code: 'parent.exam.view', module: 'app_parent_exam', action: 'view', desc: 'View child exam results and report cards' },
            { code: 'parent.homework.view', module: 'app_parent_homework', action: 'view', desc: 'View child homework and submissions' },
            { code: 'parent.fee.view', module: 'app_parent_fee', action: 'view', desc: 'View child fees and invoices' },
            { code: 'parent.fee.pay', module: 'app_parent_fee', action: 'pay', desc: 'Initiate online payment for child fees' },
            { code: 'parent.message.view', module: 'app_parent_message', action: 'view', desc: 'View parent message threads' },
            { code: 'parent.message.create', module: 'app_parent_message', action: 'create', desc: 'Send messages to teachers and school' },
            { code: 'parent.notification.view', module: 'app_parent_notification', action: 'view', desc: 'View parent notifications and updates' }
        ];

        for (const p of perms) {
            await pool.query(`
                INSERT INTO permissions (code, module, action, description)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE description = VALUES(description)
            `, [p.code, p.module, p.action, p.desc]);

            const [pRows] = await pool.query('SELECT id FROM permissions WHERE code = ?', [p.code]);
            if (pRows.length > 0) {
                const permId = pRows[0].id;
                await pool.query(`
                    INSERT IGNORE INTO role_permissions (role_id, permission_id)
                    VALUES (7, ?)
                `, [permId]);
            }
        }
        console.log('✅ Parent permissions inserted and bound to role_id=7 (Parent) successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error setting up parent permissions:', err);
        process.exit(1);
    }
}

setupParentPerms();
