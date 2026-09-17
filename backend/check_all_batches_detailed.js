const pool = require('./src/config/db');

async function checkAllBatchesDetailed() {
  const tenantId = 2;

  const [batches] = await pool.query(`
    SELECT b.id, b.name, b.branch_id, b.academic_year_id, b.level_id, b.start_time, b.end_time, b.classroom_id, cl.name as room_name, br.name as branch_name
    FROM batches b
    JOIN branches br ON b.branch_id = br.id
    JOIN classrooms cl ON b.classroom_id = cl.id
    WHERE b.tenant_id = ? AND b.deleted_at IS NULL
    ORDER BY b.branch_id, b.id
  `, [tenantId]);

  const [levelSubjects] = await pool.query(`
    SELECT ls.level_id, s.id as subject_id, s.name as subject_name
    FROM level_subjects ls
    JOIN subjects s ON ls.subject_id = s.id
    WHERE ls.tenant_id = ?
  `, [tenantId]);

  const [teacherSubjects] = await pool.query(`
    SELECT ts.teacher_user_id, u.name as teacher_name, ts.subject_id, s.name as subject_name
    FROM teacher_subjects ts
    JOIN users u ON ts.teacher_user_id = u.id
    JOIN subjects s ON ts.subject_id = s.id
    WHERE ts.tenant_id = ?
  `, [tenantId]);

  const [teacherAllocations] = await pool.query(`
    SELECT ta.batch_id, ta.teacher_user_id, u.name as teacher_name
    FROM teacher_allocations ta
    JOIN users u ON ta.teacher_user_id = u.id
    WHERE ta.tenant_id = ? AND ta.deleted_at IS NULL
  `, [tenantId]);

  console.log('=== FULL ANALYSIS PER BATCH ===');
  for (const b of batches) {
    const validSubs = levelSubjects.filter(ls => ls.level_id === b.level_id);
    const allocTeachers = teacherAllocations.filter(ta => ta.batch_id === b.id);
    
    // Cross reference teacher subjects with valid level subjects
    const teacherMatches = [];
    for (const at of allocTeachers) {
      const taught = teacherSubjects.filter(ts => ts.teacher_user_id === at.teacher_user_id);
      for (const t of taught) {
        const isLevelSub = validSubs.some(vs => vs.subject_id === t.subject_id);
        teacherMatches.push({
          teacher_user_id: at.teacher_user_id,
          teacher_name: at.teacher_name,
          subject_id: t.subject_id,
          subject_name: t.subject_name,
          isLevelSub
        });
      }
    }

    console.log(`\n----------------------------------------`);
    console.log(`Batch ${b.id}: "${b.name}" | Branch: ${b.branch_name} (ID: ${b.branch_id}) | AcademicYear: ${b.academic_year_id}`);
    console.log(`Time: ${b.start_time} - ${b.end_time} | Classroom: ${b.room_name} (ID: ${b.classroom_id})`);
    console.log(`Valid Level Subjects:`, validSubs.map(s => `${s.subject_name} (${s.subject_id})`).join(', '));
    console.log(`Matching Teachers for Valid Subjects:`);
    const validMatches = teacherMatches.filter(m => m.isLevelSub);
    for (const m of validMatches) {
      console.log(`  -> Teacher: ${m.teacher_name} (UID: ${m.teacher_user_id}) for Subject: ${m.subject_name} (ID: ${m.subject_id})`);
    }
    if (validMatches.length === 0) {
      console.log(`  ⚠️ No direct teacher_allocations match level_subjects. Available branch teachers:`);
      // Find branch teachers who teach valid level subjects
      for (const vs of validSubs) {
        const branchTch = teacherSubjects.filter(ts => ts.subject_id === vs.subject_id);
        for (const bt of branchTch) {
          console.log(`     * Suggested Teacher: ${bt.teacher_name} (UID: ${bt.teacher_user_id}) for Subject: ${vs.subject_name} (ID: ${vs.subject_id})`);
        }
      }
    }
  }

  process.exit(0);
}

checkAllBatchesDetailed().catch(console.error);
