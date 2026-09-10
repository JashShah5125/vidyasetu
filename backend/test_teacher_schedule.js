const jwt = require('jsonwebtoken');
const pool = require('./src/config/db');

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'vidyasetu_super_secret_jwt_key_2026';

function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function apiRequest(endpoint, method = 'GET', token = null, body = null) {
    const headers = {
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = { method, headers };
    if (body) {
        options.body = JSON.stringify(body);
    }

    const res = await fetch(`${BASE_URL}${endpoint}`, options);
    let data;
    try {
        data = await res.json();
    } catch {
        data = null;
    }
    return { status: res.status, body: data };
}

async function runTests() {
    console.log('🧪 Starting Teacher Academic Schedule Backend Tests...\n');
    let passed = 0;
    let failed = 0;

    const assert = (condition, testName) => {
        if (condition) {
            console.log(`  ✅ PASS: ${testName}`);
            passed++;
        } else {
            console.error(`  ❌ FAIL: ${testName}`);
            failed++;
        }
    };

    try {
        // Find an active teacher in Tenant 2
        const [teachers] = await pool.query(`
            SELECT u.id, u.tenant_id, u.name, u.email
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id AND ur.revoked_at IS NULL
            JOIN roles r ON ur.role_id = r.id
            WHERE u.tenant_id = 2 AND r.code IN ('teacher', 'faculty') AND u.deleted_at IS NULL
            LIMIT 2
        `);

        if (teachers.length === 0) {
            console.log('⚠️ No teachers found in database for Tenant 2');
            process.exit(1);
        }

        const teacher1 = teachers[0];
        console.log(`Testing with Teacher: ${teacher1.name} (ID: ${teacher1.id}, Tenant: ${teacher1.tenant_id})`);

        const teacherToken = generateToken({
            id: teacher1.id,
            userId: teacher1.id,
            tenant_id: teacher1.tenant_id,
            tenantId: teacher1.tenant_id,
            role: 'teacher',
            email: teacher1.email
        });

        // ── 1. GET /api/teacher/schedule/options ──
        console.log('\n--- 1. Testing GET /api/teacher/schedule/options ---');
        const optRes = await apiRequest('/api/teacher/schedule/options', 'GET', teacherToken);

        assert(optRes.status === 200, 'Returns 200 OK for teacher options');
        assert(optRes.body.status === 'success', 'Response status is success');
        assert(Array.isArray(optRes.body.data.branches), 'Branches array returned');
        assert(Array.isArray(optRes.body.data.batches), 'Batches array returned');
        assert(Array.isArray(optRes.body.data.courses), 'Courses array returned');
        assert(Array.isArray(optRes.body.data.levels), 'Levels array returned');

        // ── 2. GET /api/teacher/schedule/today ──
        console.log('\n--- 2. Testing GET /api/teacher/schedule/today ---');
        const todayRes = await apiRequest('/api/teacher/schedule/today?date=2026-09-10', 'GET', teacherToken);

        assert(todayRes.status === 200, 'Returns 200 OK for today schedule');
        assert(todayRes.body.status === 'success', 'Response status is success');
        assert(todayRes.body.data.date === '2026-09-10', 'Correct date returned');
        assert(Array.isArray(todayRes.body.data.lectures), 'Lectures array returned');
        if (todayRes.body.data.lectures.length > 0) {
            const firstL = todayRes.body.data.lectures[0];
            assert(firstL.subject && firstL.subject.name, 'Lecture has subject object');
            assert(firstL.batch && firstL.batch.name, 'Lecture has batch object');
            assert(firstL.attendance && typeof firstL.attendance.taken === 'boolean', 'Lecture has attendance status object');
        }

        // ── 3. GET /api/teacher/schedule/week ──
        console.log('\n--- 3. Testing GET /api/teacher/schedule/week ---');
        const weekRes = await apiRequest('/api/teacher/schedule/week?startDate=2026-09-07&endDate=2026-09-13', 'GET', teacherToken);

        assert(weekRes.status === 200, 'Returns 200 OK for week schedule');
        assert(weekRes.body.status === 'success', 'Response status is success');
        assert(weekRes.body.data.startDate === '2026-09-07', 'Correct start date returned');
        assert(weekRes.body.data.endDate === '2026-09-13', 'Correct end date returned');
        assert(Array.isArray(weekRes.body.data.lectures), 'Weekly lectures array returned');

        // ── 4. GET /api/teacher/schedule/upcoming ──
        console.log('\n--- 4. Testing GET /api/teacher/schedule/upcoming ---');
        const upRes = await apiRequest('/api/teacher/schedule/upcoming?from=2026-09-10&days=14', 'GET', teacherToken);

        assert(upRes.status === 200, 'Returns 200 OK for upcoming schedule');
        assert(Array.isArray(upRes.body.data.lectures), 'Upcoming lectures array returned');

        // ── 5. GET /api/teacher/schedule/academic-events ──
        console.log('\n--- 5. Testing GET /api/teacher/schedule/academic-events ---');
        const evtRes = await apiRequest('/api/teacher/schedule/academic-events', 'GET', teacherToken);

        assert(evtRes.status === 200, 'Returns 200 OK for academic events');
        assert(Array.isArray(evtRes.body.data), 'Events array returned');

        // ── 6. GET /api/teacher/schedule/changes ──
        console.log('\n--- 6. Testing GET /api/teacher/schedule/changes ---');
        const chgRes = await apiRequest('/api/teacher/schedule/changes', 'GET', teacherToken);

        assert(chgRes.status === 200, 'Returns 200 OK for schedule changes');
        assert(Array.isArray(chgRes.body.data), 'Changes array returned');

        // ── 7. Security: Unauthorized Check ──
        console.log('\n--- 7. Security: Unauthorized Check ---');
        const unauthRes = await apiRequest('/api/teacher/schedule/today', 'GET');

        assert(unauthRes.status === 401, 'Rejects unauthenticated request with 401');

        console.log(`\n📊 Test Summary: ${passed} Passed, ${failed} Failed\n`);
        await pool.end();
        process.exit(failed > 0 ? 1 : 0);
    } catch (err) {
        console.error('❌ Test execution error:', err);
        await pool.end();
        process.exit(1);
    }
}

runTests();
