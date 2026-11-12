const pool = require('../backend/src/config/db');

(async () => {
    try {
        const [students] = await pool.query('SELECT COUNT(*) as c FROM students WHERE deleted_at IS NULL');
        const [studentUsers] = await pool.query("SELECT COUNT(*) as c FROM users WHERE user_type = 'student'");
        const [parentUsers] = await pool.query("SELECT COUNT(*) as c FROM users WHERE user_type = 'parent'");
        const [studentRoles] = await pool.query('SELECT COUNT(*) as c FROM user_roles WHERE role_id = 8');
        const [parentRoles] = await pool.query('SELECT COUNT(*) as c FROM user_roles WHERE role_id = 7');
        const [batchStrengths] = await pool.query("SELECT id, name, current_strength FROM batches WHERE status = 'active'");

        console.log('TOTAL ENROLLED STUDENTS IN DB:', students[0].c);
        console.log('STUDENT USER ACCOUNTS CREATED:', studentUsers[0].c);
        console.log('PARENT USER ACCOUNTS CREATED:', parentUsers[0].c);
        console.log('STUDENT ROLES (ROLE ID 8) ASSIGNED:', studentRoles[0].c);
        console.log('PARENT ROLES (ROLE ID 7) ASSIGNED:', parentRoles[0].c);
        console.log('\n--- CURRENT BATCH STRENGTHS (MIN 10 PER BATCH) ---');
        console.table(batchStrengths);

        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
})();
