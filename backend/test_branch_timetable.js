require('dotenv').config();
const pool = require('./src/config/db');
const { generateToken } = require('./src/utils/jwt');
const BASE_URL = 'http://localhost:5000';

function createToken(payload) {
    return generateToken(payload);
}

async function runTests() {
    console.log('🧪 Starting Branch Timetable & Lecture Scheduling Backend Tests...\n');
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

    try {
        // Find tenant and branches
        const [branches] = await pool.query(
            `SELECT id, tenant_id, name FROM branches WHERE deleted_at IS NULL ORDER BY id ASC LIMIT 2`
        );

        if (branches.length < 2) {
            throw new Error('At least 2 branches are required in DB to run cross-branch validation tests.');
        }

        const branch1 = branches[0];
        const branch2 = branches[1];
        const tenantId = branch1.tenant_id;

        console.log(`Using Tenant ID: ${tenantId}, Branch 1: ID ${branch1.id} (${branch1.name}), Branch 2: ID ${branch2.id} (${branch2.name})`);

        // Find or create a user for branch 1 admin
        const [users1] = await pool.query(
            `SELECT u.id, u.email FROM users u 
             JOIN staff_profiles sp ON u.id = sp.user_id 
             WHERE u.tenant_id = ? AND u.deleted_at IS NULL LIMIT 1`,
            [tenantId]
        );

        const branch1AdminUser = users1[0] || { id: 9999, email: 'branch1admin@test.com' };

        // Ensure user has branch1 access in user_branch_access
        await pool.query(
            `INSERT IGNORE INTO user_branch_access (tenant_id, user_id, branch_id, is_primary) VALUES (?, ?, ?, 1)`,
            [tenantId, branch1AdminUser.id, branch1.id]
        );

        const branch1Token = createToken({
            userId: branch1AdminUser.id,
            id: branch1AdminUser.id,
            tenantId: tenantId,
            branchId: branch1.id,
            role: 'branch-admin'
        });

        // Batches for branch 1 and branch 2
        const [batches1] = await pool.query(
            `SELECT id, name, academic_year_id FROM batches WHERE tenant_id = ? AND branch_id = ? AND deleted_at IS NULL LIMIT 3`,
            [tenantId, branch1.id]
        );
        const [batches2] = await pool.query(
            `SELECT id, name, academic_year_id FROM batches WHERE tenant_id = ? AND branch_id = ? AND deleted_at IS NULL LIMIT 1`,
            [tenantId, branch2.id]
        );

        if (batches1.length === 0 || batches2.length === 0) {
            throw new Error('Batches needed for both branches to run isolation tests.');
        }

        let branch1Batch = batches1[0];
        let branch1Batch2 = batches1[1];
        if (!branch1Batch2) {
            const [newBatch] = await pool.query(
                `INSERT INTO batches (tenant_id, branch_id, level_id, academic_year_id, name, code, status) 
                 VALUES (?, ?, 1, ?, 'Test Clone Batch 2', 'TCB2', 'active')`,
                [tenantId, branch1.id, branch1Batch.academic_year_id || 1]
            );
            branch1Batch2 = { id: newBatch.insertId, name: 'Test Clone Batch 2', academic_year_id: branch1Batch.academic_year_id || 1 };
        }
        const branch2Batch = batches2[0];

        // Classrooms for branch 1 and branch 2
        const [rooms1] = await pool.query(
            `SELECT id, name FROM classrooms WHERE tenant_id = ? AND branch_id = ? AND deleted_at IS NULL LIMIT 1`,
            [tenantId, branch1.id]
        );
        const [rooms2] = await pool.query(
            `SELECT id, name FROM classrooms WHERE tenant_id = ? AND branch_id = ? AND deleted_at IS NULL LIMIT 1`,
            [tenantId, branch2.id]
        );

        const branch1Room = rooms1[0] || null;
        const branch2Room = rooms2[0] || null;

        // Active subject
        const [subjects] = await pool.query(
            `SELECT id, name FROM subjects WHERE tenant_id = ? AND deleted_at IS NULL LIMIT 1`,
            [tenantId]
        );
        const subject = subjects[0];

        console.log('\n--- 1. Testing GET /api/branch/timetable/options ---');
        const optRes = await fetch(`${BASE_URL}/api/branch/timetable/options`, {
            headers: { 'Authorization': `Bearer ${branch1Token}` }
        });
        const optData = await optRes.json();

        assert(optRes.status === 200, 'Returns 200 OK for options');
        assert(optData.status === 'success', 'Status is success');
        assert(Number(optData.data.branch.id) === Number(branch1.id), `Branch context is strictly locked to Branch 1 (ID: ${branch1.id})`);
        assert(Array.isArray(optData.data.batches), 'Batches array returned');
        const allBatchesInBranch1 = optData.data.batches.every(b => Number(b.branch_id) === Number(branch1.id));
        assert(allBatchesInBranch1, 'All returned batches belong strictly to Branch 1');
        const allRoomsInBranch1 = optData.data.classrooms.every(r => Number(r.branch_id) === Number(branch1.id));
        assert(allRoomsInBranch1, 'All returned classrooms belong strictly to Branch 1');

        console.log('\n--- 2. Testing Default Timetable Save & Fetch ---');
        const defaultSlotsPayload = [
            {
                dayOfWeek: 1,
                startTime: '09:00:00',
                endTime: '10:30:00',
                subjectId: subject.id,
                teacherUserId: branch1AdminUser.id,
                classroomId: branch1Room ? branch1Room.id : null,
                lectureType: 'Regular',
                activityType: 'Lecture'
            },
            {
                dayOfWeek: 2,
                startTime: '10:45:00',
                endTime: '12:15:00',
                subjectId: subject.id,
                teacherUserId: branch1AdminUser.id,
                classroomId: branch1Room ? branch1Room.id : null,
                lectureType: 'Regular',
                activityType: 'Lecture'
            }
        ];

        // Save default slots for Branch 1 batch
        const saveDefRes = await fetch(`${BASE_URL}/api/branch/timetable/default/${branch1Batch.id}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${branch1Token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ slots: defaultSlotsPayload, academicYearId: branch1Batch.academic_year_id })
        });
        const saveDefData = await saveDefRes.json();

        assert(saveDefRes.status === 200, 'Save default timetable returns 200 OK');
        assert(saveDefData.status === 'success', 'Save default timetable returned status success');

        // Fetch default slots for Branch 1 batch
        const getDefRes = await fetch(`${BASE_URL}/api/branch/timetable/default/${branch1Batch.id}`, {
            headers: { 'Authorization': `Bearer ${branch1Token}` }
        });
        const getDefData = await getDefRes.json();

        assert(getDefRes.status === 200, 'Get default timetable returns 200 OK');
        assert(Array.isArray(getDefData.data) && getDefData.data.length === 2, 'Fetched 2 saved default slots');

        // Cross-branch check: Branch 1 Admin attempting to access Branch 2 batch default timetable
        const crossDefRes = await fetch(`${BASE_URL}/api/branch/timetable/default/${branch2Batch.id}`, {
            headers: { 'Authorization': `Bearer ${branch1Token}` }
        });

        assert(crossDefRes.status === 403 || crossDefRes.status === 404, 'Rejected cross-branch batch default timetable access with 403/404');

        console.log('\n--- 3. Testing Default Timetable Clone ---');
        // Valid clone within same branch
        if (branch1Batch.id !== branch1Batch2.id) {
            const cloneRes = await fetch(`${BASE_URL}/api/branch/timetable/default/clone`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${branch1Token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sourceBatchId: branch1Batch.id, targetBatchIds: [branch1Batch2.id] })
            });
            const cloneData = await cloneRes.json();
            if (cloneRes.status !== 200) console.log('Clone valid failed:', cloneRes.status, cloneData);
            assert(cloneRes.status === 200, 'Clone default timetable within own branch returns 200 OK');
        }

        // Invalid cross-branch clone
        const crossCloneRes = await fetch(`${BASE_URL}/api/branch/timetable/default/clone`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${branch1Token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sourceBatchId: branch1Batch.id, targetBatchIds: [branch2Batch.id] })
        });
        const crossCloneData = await crossCloneRes.json();
        if (crossCloneRes.status !== 403) console.log('Cross clone failed to reject 403:', crossCloneRes.status, crossCloneData);

        assert(crossCloneRes.status === 403, 'Forbidden 403 when trying to clone default timetable to another branch batch');

        console.log('\n--- 4. Testing Weekly Timetable Generation & Filtering ---');
        const testWeekStart = '2026-09-14'; // Monday
        const applyRes = await fetch(`${BASE_URL}/api/branch/timetable/weekly/apply-default`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${branch1Token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                batchId: branch1Batch.id,
                weekStartDate: testWeekStart,
                overwriteExisting: true,
                skipHolidays: true
            })
        });
        const applyData = await applyRes.json();

        assert(applyRes.status === 200, 'Apply default timetable to week returns 200 OK');
        assert(applyData.data.generatedCount > 0, `Generated ${applyData.data.generatedCount} calendar lectures`);

        // Fetch weekly lectures
        const weekRes = await fetch(`${BASE_URL}/api/branch/timetable/weekly?startDate=2026-09-14&endDate=2026-09-20`, {
            headers: { 'Authorization': `Bearer ${branch1Token}` }
        });
        const weekData = await weekRes.json();

        assert(weekRes.status === 200, 'Get weekly lectures returns 200 OK');
        assert(Array.isArray(weekData.data), 'Weekly lectures array returned');
        const allWeeklyInBranch1 = weekData.data.every(l => Number(l.branch_id) === Number(branch1.id));
        assert(allWeeklyInBranch1, 'All weekly calendar lectures belong strictly to Branch 1');

        console.log('\n--- 5. Testing Validate Conflicts ---');
        const conflictRes = await fetch(`${BASE_URL}/api/branch/timetable/validate-conflicts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${branch1Token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                batchId: branch1Batch.id,
                teacherUserId: branch1AdminUser.id,
                lectureDate: '2026-09-14',
                startTime: '09:00:00',
                endTime: '10:30:00'
            })
        });
        const conflictData = await conflictRes.json();

        assert(conflictRes.status === 200, 'Validate conflicts returns 200 OK');
        assert(Array.isArray(conflictData.data), 'Conflicts array returned');
        const hasClash = conflictData.data.some(c => c.type === 'batch_clash' || c.type === 'teacher_clash');
        assert(hasClash, 'Correctly detected batch or teacher overlap conflict for existing scheduled slot');

        console.log('\n--- 6. Testing Individual Lecture CRUD & Branch Boundaries ---');
        // Create lecture
        const createLecRes = await fetch(`${BASE_URL}/api/branch/timetable/lectures`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${branch1Token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                batchId: branch1Batch.id,
                academicYearId: branch1Batch.academic_year_id,
                lectureDate: '2026-09-18',
                startTime: '14:00:00',
                endTime: '15:30:00',
                subjectId: subject.id,
                teacherUserId: branch1AdminUser.id,
                classroomId: branch1Room ? branch1Room.id : null,
                lectureType: 'Revision',
                activityType: 'Lecture',
                topic: 'Branch Test Topic'
            })
        });
        const createLecData = await createLecRes.json();

        assert(createLecRes.status === 201, 'Create ad-hoc lecture returns 201 Created');
        const createdLectureId = createLecData.data.id;
        assert(createdLectureId > 0, `Created lecture ID: ${createdLectureId}`);

        // Cross-branch creation rejection (trying to create in branch 2 classroom)
        if (branch2Room) {
            const crossCreateRes = await fetch(`${BASE_URL}/api/branch/timetable/lectures`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${branch1Token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    batchId: branch1Batch.id,
                    lectureDate: '2026-09-18',
                    startTime: '16:00:00',
                    endTime: '17:00:00',
                    subjectId: subject.id,
                    classroomId: branch2Room.id
                })
            });
            assert(crossCreateRes.status === 403, 'Forbidden 403 when attempting to assign another branch classroom');
        }

        // Update lecture
        const updateLecRes = await fetch(`${BASE_URL}/api/branch/timetable/lectures/${createdLectureId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${branch1Token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                topic: 'Updated Thermodynamics Review',
                startTime: '14:15:00',
                endTime: '15:45:00'
            })
        });

        assert(updateLecRes.status === 200, 'Update lecture returns 200 OK');

        // Cancel lecture
        const cancelLecRes = await fetch(`${BASE_URL}/api/branch/timetable/lectures/${createdLectureId}/cancel`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${branch1Token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason: 'Faculty emergency leave' })
        });

        assert(cancelLecRes.status === 200, 'Cancel lecture returns 200 OK');

        // Verify cancelled status in DB
        const [cancelledRows] = await pool.query(
            `SELECT status, cancellation_reason FROM lectures WHERE id = ?`,
            [createdLectureId]
        );
        assert(cancelledRows[0].status === 'cancelled', 'Lecture status updated to cancelled');
        assert(cancelledRows[0].cancellation_reason === 'Faculty emergency leave', 'Cancellation reason recorded');

        // Delete lecture (Soft delete)
        const deleteLecRes = await fetch(`${BASE_URL}/api/branch/timetable/lectures/${createdLectureId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${branch1Token}` }
        });

        assert(deleteLecRes.status === 200, 'Delete lecture returns 200 OK');

        const [deletedRows] = await pool.query(
            `SELECT deleted_at FROM lectures WHERE id = ?`,
            [createdLectureId]
        );
        assert(deletedRows[0].deleted_at !== null, 'Lecture is soft deleted with deleted_at timestamp');

        console.log(`\n📊 Test Summary: ${passed} Passed, ${failed} Failed`);
    } catch (err) {
        console.error('❌ Test execution error:', err);
        failed++;
    } finally {
        await pool.end();
        process.exit(failed > 0 ? 1 : 0);
    }
}

runTests();
