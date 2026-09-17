const pool = require('./src/config/db');

async function analyzeMappings() {
  const tenantId = 2;

  // 1. Batches with Level and Assigned Classroom
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
  console.log('=== BATCHES & CLASSROOMS ===');
  console.table(batches);

  // 2. Level Subjects (Subjects for each level)
  const [levelSubjects] = await pool.query(`
    SELECT 
      ls.level_id,
      l.name as level_name,
      s.id as subject_id,
      s.name as subject_name,
      s.code as subject_code
    FROM level_subjects ls
    JOIN levels l ON ls.level_id = l.id
    JOIN subjects s ON ls.subject_id = s.id
    WHERE ls.tenant_id = ?
    ORDER BY ls.level_id, s.id
  `, [tenantId]);
  console.log('\n=== LEVEL SUBJECTS MAPPING ===');
  console.table(levelSubjects);

  // 3. Teachers (user_id, staff_id, name, branch_ids)
  const [teachers] = await pool.query(`
    SELECT 
      u.id as user_id,
      sp.id as staff_id,
      sp.employee_id,
      u.name as teacher_name,
      sp.employee_type,
      sp.designation,
      sp.branch_ids
    FROM users u
    JOIN staff_profiles sp ON u.id = sp.user_id
    WHERE u.tenant_id = ? AND u.status = 'active' AND sp.deleted_at IS NULL AND sp.employee_type = 'Teaching'
    ORDER BY u.id
  `, [tenantId]);
  console.log('\n=== TEACHING FACULTY LIST ===');
  console.table(teachers);

  // 4. Teacher Subjects
  const [ts] = await pool.query(`
    SELECT ts.teacher_user_id, u.name as teacher_name, s.id as subject_id, s.name as subject_name, s.code as subject_code
    FROM teacher_subjects ts
    JOIN users u ON ts.teacher_user_id = u.id
    JOIN subjects s ON ts.subject_id = s.id
    WHERE ts.tenant_id = ?
    ORDER BY ts.teacher_user_id, s.id
  `, [tenantId]);
  console.log('\n=== TEACHER SUBJECTS MAPPING ===');
  console.table(ts);

  // 5. Teacher Allocations
  const [ta] = await pool.query(`
    SELECT ta.batch_id, b.name as batch_name, ta.teacher_user_id, u.name as teacher_name
    FROM teacher_allocations ta
    JOIN batches b ON ta.batch_id = b.id
    JOIN users u ON ta.teacher_user_id = u.id
    WHERE ta.tenant_id = ? AND ta.deleted_at IS NULL
    ORDER BY ta.batch_id
  `, [tenantId]);
  console.log('\n=== TEACHER ALLOCATIONS MAPPING ===');
  console.table(ta);

  // 6. Existing Default Lectures
  const [existingLectures] = await pool.query(`
    SELECT 
      l.id, l.batch_id, b.name as batch_name, l.day_of_week, 
      l.start_time, l.end_time, l.subject_id, s.name as subject_name,
      l.teacher_user_id, u.name as teacher_name, l.classroom_id, cl.name as room_name
    FROM lectures l
    JOIN batches b ON l.batch_id = b.id
    LEFT JOIN subjects s ON l.subject_id = s.id
    LEFT JOIN users u ON l.teacher_user_id = u.id
    LEFT JOIN classrooms cl ON l.classroom_id = cl.id
    WHERE l.tenant_id = ? AND l.is_default = 1 AND l.deleted_at IS NULL
    ORDER BY l.batch_id, l.day_of_week, l.start_time
  `, [tenantId]);
  console.log('\n=== EXISTING DEFAULT LECTURES (' + existingLectures.length + ' rows) ===');
  console.table(existingLectures);

  process.exit(0);
}

analyzeMappings().catch(err => {
  console.error(err);
  process.exit(1);
});
