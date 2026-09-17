const pool = require('./src/config/db');

async function buildTimetablePlan() {
  const tenantId = 2;

  // 1. Fetch Batches
  const [batches] = await pool.query(`
    SELECT 
      b.id as batch_id,
      b.branch_id,
      br.name as branch_name,
      b.academic_year_id,
      b.level_id,
      l.name as level_name,
      b.name as batch_name,
      b.code as batch_code,
      b.start_time,
      b.end_time,
      b.classroom_id,
      cl.name as classroom_name,
      cl.room_number
    FROM batches b
    JOIN branches br ON b.branch_id = br.id
    LEFT JOIN levels l ON b.level_id = l.id
    LEFT JOIN classrooms cl ON b.classroom_id = cl.id
    WHERE b.tenant_id = ? AND b.deleted_at IS NULL
    ORDER BY b.branch_id, b.id
  `, [tenantId]);

  // 2. Fetch Level Subjects
  const [levelSubjects] = await pool.query(`
    SELECT ls.level_id, s.id as subject_id, s.name as subject_name, s.code as subject_code
    FROM level_subjects ls
    JOIN subjects s ON ls.subject_id = s.id
    WHERE ls.tenant_id = ?
  `, [tenantId]);

  // 3. Fetch Teacher Allocations & Subjects
  const [teacherAllocations] = await pool.query(`
    SELECT 
      ta.batch_id,
      ta.teacher_user_id,
      u.name as teacher_name,
      ts.subject_id,
      s.name as subject_name
    FROM teacher_allocations ta
    JOIN users u ON ta.teacher_user_id = u.id
    LEFT JOIN teacher_subjects ts ON ts.teacher_user_id = u.id AND ts.tenant_id = ?
    LEFT JOIN subjects s ON ts.subject_id = s.id
    WHERE ta.tenant_id = ? AND ta.deleted_at IS NULL
  `, [tenantId, tenantId]);

  console.log('Total Batches:', batches.length);
  console.log('Total Level Subjects:', levelSubjects.length);
  console.log('Total Teacher Allocations with Subjects:', teacherAllocations.length);

  // Group allocations by batch
  const batchAllocations = {};
  for (const b of batches) {
    batchAllocations[b.batch_id] = {
      batch: b,
      validSubjects: levelSubjects.filter(ls => ls.level_id === b.level_id),
      allocatedTeachers: teacherAllocations.filter(ta => ta.batch_id === b.batch_id)
    };
  }

  // Print a summary for each batch
  for (const b of batches) {
    const alloc = batchAllocations[b.batch_id];
    console.log(`\n========================================`);
    console.log(`Batch [ID: ${b.batch_id}] ${b.batch_name} (${b.branch_name})`);
    console.log(`Time: ${b.start_time} - ${b.end_time} | Classroom: ${b.classroom_name} (ID: ${b.classroom_id})`);
    console.log(`Level: ${b.level_name} (ID: ${b.level_id})`);
    console.log(`Valid Subjects (${alloc.validSubjects.length}):`, alloc.validSubjects.map(s => `${s.subject_name} (ID: ${s.subject_id})`).join(', '));
    console.log(`Allocated Teachers:`);
    for (const t of alloc.allocatedTeachers) {
      console.log(`  - ${t.teacher_name} (User ID: ${t.teacher_user_id}) -> Subject: ${t.subject_name} (ID: ${t.subject_id})`);
    }
  }

  process.exit(0);
}

buildTimetablePlan().catch(err => {
  console.error(err);
  process.exit(1);
});
