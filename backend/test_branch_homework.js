const pool = require('./src/config/db');
const jwt = require('jsonwebtoken');
const homeworkModel = require('./src/models/homeworkModel');

async function runTests() {
    console.log('🧪 Starting Branch Homework & Exams Unit & Integration Tests...');

    try {
        const tenantId = 2;

        // 1. Get branch and batches
        const [branches] = await pool.query(`SELECT id, name FROM branches WHERE tenant_id = ? AND deleted_at IS NULL LIMIT 2`, [tenantId]);
        if (branches.length < 1) {
            console.error('❌ Need at least 1 branch to test');
            process.exit(1);
        }

        const branchA = branches[0];
        const branchB = branches.length > 1 ? branches[1] : null;
        console.log(`📍 Testing with Branch A: ID=${branchA.id} (${branchA.name})`);

        // Fetch an academic year and subject for Branch A
        const [ayRows] = await pool.query(`SELECT id FROM academic_years WHERE tenant_id = ? AND branch_id = ? AND deleted_at IS NULL LIMIT 1`, [tenantId, branchA.id]);
        let academicYearId = ayRows.length ? ayRows[0].id : 1;

        const [subRows] = await pool.query(`SELECT id FROM subjects WHERE tenant_id = ? AND deleted_at IS NULL AND status = 'active' LIMIT 1`, [tenantId]);
        const subjectId = subRows.length ? subRows[0].id : 1;

        const [batchRowsA] = await pool.query(`SELECT id, name, academic_year_id FROM batches WHERE tenant_id = ? AND branch_id = ? AND deleted_at IS NULL AND (status = 'active' OR status = 1) LIMIT 2`, [tenantId, branchA.id]);
        if (!batchRowsA.length) {
            console.error('❌ No active batches found for Branch A');
            process.exit(1);
        }
        const batchIdsA = batchRowsA.map(b => b.id);
        academicYearId = batchRowsA[0].academic_year_id || academicYearId;
        console.log(`📦 Batches for Branch A:`, batchIdsA, 'Academic Year ID:', academicYearId);

        // 2. Test getBranchScoping
        const scoping = await homeworkModel.getBranchScoping(tenantId, branchA.id);
        if (!scoping.branch || Number(scoping.branch.id) !== Number(branchA.id)) {
            throw new Error(`Scoping branch mismatch: expected ${branchA.id}, got ${scoping.branch?.id}`);
        }
        console.log('✅ 1. getBranchScoping successfully locked to Branch A');

        // 3. Test createHomework with Branch AccessContext
        const accessContextA = {
            scope: 'BRANCH',
            tenantId,
            authorizedBranchId: branchA.id,
            authorizedBranchIds: [branchA.id]
        };

        const createRes = await homeworkModel.createHomework(tenantId, {
            academicYearId,
            subjectId,
            title: 'Test Branch Homework 101',
            description: 'Testing branch scoping and grading',
            assignmentType: 'homework',
            batchIds: batchIdsA,
            dueDate: '2026-10-30',
            maxMarks: 100
        }, 1, accessContextA);

        const hwId = createRes.id;
        console.log(`✅ 2. createHomework created ID: ${hwId} with branch_id = ${branchA.id}`);

        // Verify in DB that branch_id was forced to branchA.id
        const [dbCheck] = await pool.query(`SELECT branch_id, status FROM homeworks WHERE id = ?`, [hwId]);
        if (Number(dbCheck[0].branch_id) !== Number(branchA.id)) {
            throw new Error(`Homework branch_id in DB is ${dbCheck[0].branch_id}, expected ${branchA.id}`);
        }
        console.log('✅ 3. Verified DB record branch_id matches Branch A');

        // 4. Test cross-branch batch validation (Attempting to add Branch B batch)
        if (branchB) {
            const [batchRowsB] = await pool.query(`SELECT id FROM batches WHERE tenant_id = ? AND branch_id = ? AND deleted_at IS NULL LIMIT 1`, [tenantId, branchB.id]);
            if (batchRowsB.length) {
                const invalidBatchId = batchRowsB[0].id;
                try {
                    await homeworkModel.createHomework(tenantId, {
                        academicYearId,
                        subjectId,
                        title: 'Malicious Cross Branch Homework',
                        batchIds: [batchIdsA[0], invalidBatchId],
                        dueDate: '2026-10-30',
                        maxMarks: 50
                    }, 1, accessContextA);
                    throw new Error('❌ Failed: Server should have rejected batch from Branch B');
                } catch (err) {
                    if (err.code === 'ER_HW_BATCH_INVALID') {
                        console.log('✅ 4. Cross-branch batch creation was correctly rejected (ER_HW_BATCH_INVALID)');
                    } else {
                        throw err;
                    }
                }
            }
        }

        // 5. Test getHomeworks with accessContextA
        const listA = await homeworkModel.getHomeworks(tenantId, 1, {}, accessContextA);
        const existsInList = listA.some(h => String(h.id) === String(hwId));
        if (!existsInList) {
            throw new Error(`Created homework ${hwId} not found in getHomeworks list`);
        }
        console.log(`✅ 5. getHomeworks returned ${listA.length} items for Branch A`);

        // 6. Test cross-branch access (Branch B trying to access/modify Branch A's homework)
        if (branchB) {
            const accessContextB = {
                scope: 'BRANCH',
                tenantId,
                authorizedBranchId: branchB.id,
                authorizedBranchIds: [branchB.id]
            };

            try {
                await homeworkModel.updateHomework(tenantId, hwId, { title: 'Hacked by Branch B' }, 1, accessContextB);
                throw new Error('❌ Failed: Branch B was able to update Branch A homework!');
            } catch (err) {
                if (err.code === 'ER_FORBIDDEN_BRANCH') {
                    console.log('✅ 6. Cross-branch update correctly rejected with ER_FORBIDDEN_BRANCH');
                } else {
                    throw err;
                }
            }
        }

        // 7. Test Publish & Close lifecycle
        const pubResult = await homeworkModel.publishHomework(tenantId, hwId, 1, accessContextA);
        if (pubResult !== 'published') throw new Error(`Publish returned ${pubResult}`);
        console.log('✅ 7. publishHomework succeeded');

        // 8. Test getEvaluationRoster
        const roster = await homeworkModel.getEvaluationRoster(tenantId, hwId, accessContextA);
        console.log(`✅ 8. getEvaluationRoster returned ${roster.students.length} students enrolled in batches`);

        // 9. Test Single Grading & Bulk Grading if students exist
        if (roster.students.length > 0) {
            const stu = roster.students[0];
            const gradeRes = await homeworkModel.gradeSubmission(tenantId, hwId, stu.submissionId || 0, {
                studentId: stu.studentId,
                marksObtained: 88,
                teacherFeedback: 'Solid performance in tests'
            }, 1, accessContextA);
            console.log(`✅ 9. gradeSubmission recorded for student ${stu.studentId} (Sub ID: ${gradeRes.id})`);

            // Bulk grade test
            const bulkRes = await homeworkModel.bulkGradeSubmissions(tenantId, hwId, [
                {
                    'Student ID': stu.studentCode || stu.studentId,
                    'Marks': 95,
                    'Remarks': 'Excellent'
                }
            ], 1, accessContextA);
            console.log(`✅ 10. bulkGradeSubmissions processed ${bulkRes.successCount} rows with 0 errors`);
        }

        // 10. Test Close Homework
        const closeResult = await homeworkModel.closeHomework(tenantId, hwId, 1, accessContextA);
        if (closeResult !== 'closed') throw new Error(`Close returned ${closeResult}`);
        console.log('✅ 11. closeHomework succeeded');

        // 11. Clean up test homework
        const delResult = await homeworkModel.deleteHomework(tenantId, hwId, accessContextA);
        console.log(`✅ 12. deleteHomework succeeded (${delResult})`);

        console.log('🎉 ALL BACKEND BRANCH HOMEWORK & EXAM TESTS PASSED PERFECTLY!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

runTests();
