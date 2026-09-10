const pool = require('./src/config/db');
const branchAttendanceController = require('./src/controllers/branchAttendanceController');

let passed = 0;
let failed = 0;

const assert = (condition, message) => {
    if (condition) {
        console.log(`  ✅ PASS: ${message}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${message}`);
        failed++;
    }
};

const mockReq = (overrides = {}) => ({
    user: {
        userId: 101,
        id: 101,
        tenantId: 2,
        role: 'branch_admin',
        branchId: 1
    },
    query: {},
    params: {},
    body: {},
    ...overrides
});

const mockRes = () => {
    const res = {};
    res.statusCode = 200;
    res.body = null;
    res.status = function(code) {
        this.statusCode = code;
        return this;
    };
    res.json = function(data) {
        this.body = data;
        return this;
    };
    return res;
};

(async () => {
    console.log('🧪 Starting Branch Attendance Integration Test Suite...\n');

    try {
        // Find existing lectures, batches, and students for testing
        const [branch1Lectures] = await pool.query(
            `SELECT id, branch_id, batch_id, academic_year_id, attendance_taken, attendance_locked_at
             FROM lectures WHERE tenant_id = 2 AND branch_id = 1 AND is_default = 0 AND deleted_at IS NULL LIMIT 5`
        );
        const [branch2Lectures] = await pool.query(
            `SELECT id, branch_id, batch_id, academic_year_id 
             FROM lectures WHERE tenant_id = 2 AND branch_id = 2 AND is_default = 0 AND deleted_at IS NULL LIMIT 5`
        );
        const [branch1Batches] = await pool.query(
            `SELECT id, branch_id, name FROM batches WHERE tenant_id = 2 AND branch_id = 1 AND deleted_at IS NULL LIMIT 5`
        );
        const [branch2Batches] = await pool.query(
            `SELECT id, branch_id, name FROM batches WHERE tenant_id = 2 AND branch_id = 2 AND deleted_at IS NULL LIMIT 5`
        );

        console.log('1. Testing GET /api/branch/attendance/options');
        {
            const req = mockReq();
            const res = mockRes();
            await branchAttendanceController.getAttendanceOptions(req, res);
            assert(res.statusCode === 200, 'Returns 200 OK');
            assert(res.body.status === 'success', 'Response status is success');
            assert(res.body.data.branch.id === 1, 'Branch is fixed to Mumbai West (ID: 1)');
            assert(res.body.data.courses && res.body.data.courses.length > 0, 'Courses returned for Branch 1');
            const courseNames = res.body.data.courses.map(c => c.name);
            assert(!courseNames.includes('Class 10 Foundation'), 'Class 10 Foundation (Branch 2 only) is excluded');
            assert(courseNames.includes('8th Standard') || courseNames.includes('JEE Prep Course'), 'Branch 1 courses are included');
        }

        console.log('\n2. Testing GET /api/branch/attendance/lectures/daily');
        {
            const req = mockReq({ query: { date: '2026-09-10' } });
            const res = mockRes();
            await branchAttendanceController.getDailyLectures(req, res);
            assert(res.statusCode === 200, 'Returns 200 OK');
            assert(Array.isArray(res.body.data), 'Returns array of lectures');
            for (const lec of res.body.data) {
                assert(Number(lec.branch_id) === 1, `Lecture ID ${lec.id} belongs strictly to Branch 1`);
            }
        }

        console.log('\n3. Testing Cross-Branch Batch Filter on Daily Lectures');
        if (branch2Batches.length > 0) {
            const req = mockReq({ query: { batchId: branch2Batches[0].id, date: '2026-09-10' } });
            const res = mockRes();
            await branchAttendanceController.getDailyLectures(req, res);
            assert(res.statusCode === 403, 'Denied access (403) when filtering with Branch 2 batch');
        }

        console.log('\n4. Testing GET /api/branch/attendance/roster/:lectureId');
        if (branch1Lectures.length > 0) {
            const lectureId = branch1Lectures[0].id;
            const req = mockReq({ params: { lectureId } });
            const res = mockRes();
            await branchAttendanceController.getRoster(req, res);
            assert(res.statusCode === 200, 'Returns 200 OK for Branch 1 lecture roster');
            assert(Array.isArray(res.body.data), 'Roster is an array');
        }

        console.log('\n5. Testing Cross-Branch Roster Access');
        if (branch2Lectures.length > 0) {
            const lectureId = branch2Lectures[0].id;
            const req = mockReq({ params: { lectureId } });
            const res = mockRes();
            await branchAttendanceController.getRoster(req, res);
            assert(res.statusCode === 403, 'Denied access (403) when accessing Branch 2 lecture roster');
        }

        console.log('\n6. Testing POST /api/branch/attendance/save/:lectureId Draft & Student Validation');
        if (branch1Lectures.length > 0) {
            const targetLecture = branch1Lectures.find(l => !l.attendance_locked_at) || branch1Lectures[0];
            
            // Find enrolled student for this lecture's batch
            const [enrolledStudents] = await pool.query(
                `SELECT student_id FROM student_enrollments WHERE tenant_id = 2 AND batch_id = ? AND status = 'active' LIMIT 2`,
                [targetLecture.batch_id]
            );

            if (enrolledStudents.length > 0) {
                const req = mockReq({
                    params: { lectureId: targetLecture.id },
                    body: {
                        records: [
                            { student_id: enrolledStudents[0].student_id, status: 1, remarks: 'Test draft present' }
                        ]
                    }
                });
                const res = mockRes();
                await branchAttendanceController.saveAttendance(req, res);
                assert(res.statusCode === 200 || res.statusCode === 400, 'Draft save handled correctly');
            }

            // Test student ID not in batch
            const reqInvalidStudent = mockReq({
                params: { lectureId: targetLecture.id },
                body: {
                    records: [
                        { student_id: 999999, status: 1, remarks: 'Invalid student' }
                    ]
                }
            });
            const resInvalid = mockRes();
            await branchAttendanceController.saveAttendance(reqInvalidStudent, resInvalid);
            assert(resInvalid.statusCode === 403 || resInvalid.statusCode === 400, 'Rejected non-enrolled student ID (403/400)');
        }

        console.log('\n7. Testing GET /api/branch/attendance/staff');
        {
            const req = mockReq({ query: { date: '2026-09-10' } });
            const res = mockRes();
            await branchAttendanceController.getStaffAttendance(req, res);
            assert(res.statusCode === 200, 'Returns 200 OK');
            assert(Array.isArray(res.body.data), 'Staff roster is an array');
        }

        console.log('\n8. Testing GET /api/branch/attendance/report/batch/:batchId');
        if (branch1Batches.length > 0) {
            const req = mockReq({
                params: { batchId: branch1Batches[0].id },
                query: { startDate: '2026-09-01', endDate: '2026-09-30' }
            });
            const res = mockRes();
            await branchAttendanceController.getBatchReport(req, res);
            assert(res.statusCode === 200, 'Returns 200 OK for Branch 1 batch report');
            assert(Array.isArray(res.body.data), 'Batch report data is an array');
        }

        console.log('\n9. Testing Cross-Branch Batch Report Access');
        if (branch2Batches.length > 0) {
            const req = mockReq({
                params: { batchId: branch2Batches[0].id },
                query: { startDate: '2026-09-01', endDate: '2026-09-30' }
            });
            const res = mockRes();
            await branchAttendanceController.getBatchReport(req, res);
            assert(res.statusCode === 403, 'Denied access (403) for Branch 2 batch report');
        }

        console.log('\n10. Testing GET /api/branch/attendance/report/student/:studentId');
        const [branch1Student] = await pool.query(
            `SELECT se.student_id FROM student_enrollments se 
             JOIN batches b ON se.batch_id = b.id 
             WHERE se.tenant_id = 2 AND b.branch_id = 1 AND se.deleted_at IS NULL LIMIT 1`
        );
        const [branch2Student] = await pool.query(
            `SELECT se.student_id FROM student_enrollments se 
             JOIN batches b ON se.batch_id = b.id 
             WHERE se.tenant_id = 2 AND b.branch_id = 2 AND se.deleted_at IS NULL LIMIT 1`
        );

        if (branch1Student.length > 0) {
            const req = mockReq({
                params: { studentId: branch1Student[0].student_id },
                query: { startDate: '2026-09-01', endDate: '2026-09-30' }
            });
            const res = mockRes();
            await branchAttendanceController.getStudentReport(req, res);
            assert(res.statusCode === 200, 'Returns 200 OK for Branch 1 student report');
        }

        if (branch2Student.length > 0) {
            const req = mockReq({
                params: { studentId: branch2Student[0].student_id },
                query: { startDate: '2026-09-01', endDate: '2026-09-30' }
            });
            const res = mockRes();
            await branchAttendanceController.getStudentReport(req, res);
            assert(res.statusCode === 403, 'Denied access (403) for Branch 2 student report');
        }

    } catch (err) {
        console.error('Unexpected test error:', err);
        failed++;
    }

    console.log(`\n========================================`);
    console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);
    process.exit(failed > 0 ? 1 : 0);
})();
