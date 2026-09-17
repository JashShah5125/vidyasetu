const pool = require('./src/config/db');

async function seedClassroomsAndAssignBatches() {
  console.log('🚀 Starting Classrooms Seeding & Batch Allocation...');

  try {
    const tenantId = 2; // Allen Career Institute

    // ── 1. Define Classrooms to Seed ──
    const mumbaiRooms = [
      { name: 'Room 102', room_number: '102', capacity: 60, type: 'classroom' },
      { name: 'Room 103', room_number: '103', capacity: 60, type: 'classroom' },
      { name: 'Room 104', room_number: '104', capacity: 55, type: 'classroom' },
      { name: 'Room 105', room_number: '105', capacity: 55, type: 'classroom' },
      { name: 'Room 106', room_number: '106', capacity: 50, type: 'classroom' },
      { name: 'Room 107', room_number: '107', capacity: 45, type: 'classroom' },
      { name: 'Room 108', room_number: '108', capacity: 45, type: 'classroom' },
      { name: 'Room 109', room_number: '109', capacity: 40, type: 'classroom' },
      { name: 'Room 110', room_number: '110', capacity: 40, type: 'classroom' },
      { name: 'Chemistry Lab', room_number: 'L-02', capacity: 35, type: 'lab' },
      { name: 'Computer Lab 1', room_number: 'CL-01', capacity: 40, type: 'computer_lab' },
      { name: 'Auditorium Hall A', room_number: 'SH-01', capacity: 120, type: 'seminar_hall' }
    ];

    const puneRooms = [
      { name: 'Room 202', room_number: '202', capacity: 55, type: 'classroom' },
      { name: 'Room 203', room_number: '203', capacity: 55, type: 'classroom' },
      { name: 'Room 204', room_number: '204', capacity: 50, type: 'classroom' },
      { name: 'Room 205', room_number: '205', capacity: 45, type: 'classroom' },
      { name: 'Room 206', room_number: '206', capacity: 45, type: 'classroom' },
      { name: 'Room 207', room_number: '207', capacity: 40, type: 'classroom' },
      { name: 'Physics Lab', room_number: 'L-01', capacity: 35, type: 'lab' },
      { name: 'Computer Lab 2', room_number: 'CL-02', capacity: 35, type: 'computer_lab' },
      { name: 'Seminar Hall B', room_number: 'SH-02', capacity: 100, type: 'seminar_hall' }
    ];

    // ── 2. Insert Mumbai West Classrooms ──
    for (const r of mumbaiRooms) {
      await pool.query(`
        INSERT INTO classrooms (tenant_id, branch_id, name, room_number, capacity, type, status, created_by, updated_by, created_at, updated_at)
        SELECT ?, 1, ?, ?, ?, ?, 'active', 1, 1, NOW(), NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM classrooms WHERE tenant_id = ? AND branch_id = 1 AND room_number = ? AND deleted_at IS NULL
        )
      `, [tenantId, r.name, r.room_number, r.capacity, r.type, tenantId, r.room_number]);
    }

    // ── 3. Insert Pune Camp Classrooms ──
    for (const r of puneRooms) {
      await pool.query(`
        INSERT INTO classrooms (tenant_id, branch_id, name, room_number, capacity, type, status, created_by, updated_by, created_at, updated_at)
        SELECT ?, 2, ?, ?, ?, ?, 'active', 1, 1, NOW(), NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM classrooms WHERE tenant_id = ? AND branch_id = 2 AND room_number = ? AND deleted_at IS NULL
        )
      `, [tenantId, r.name, r.room_number, r.capacity, r.type, tenantId, r.room_number]);
    }

    console.log('✅ Classrooms inserted.');

    // ── 4. Assign Each Batch to a Dedicated Classroom ──
    const [allMumbaiClassrooms] = await pool.query(`
      SELECT id, name, room_number, capacity FROM classrooms WHERE tenant_id = ? AND branch_id = 1 AND deleted_at IS NULL ORDER BY id
    `, [tenantId]);

    const [allMumbaiBatches] = await pool.query(`
      SELECT id, name, code FROM batches WHERE tenant_id = ? AND branch_id = 1 AND deleted_at IS NULL ORDER BY id
    `, [tenantId]);

    for (let i = 0; i < allMumbaiBatches.length; i++) {
      const batch = allMumbaiBatches[i];
      const classroom = allMumbaiClassrooms[i % allMumbaiClassrooms.length];
      await pool.query(`UPDATE batches SET classroom_id = ? WHERE id = ?`, [classroom.id, batch.id]);
    }

    const [allPuneClassrooms] = await pool.query(`
      SELECT id, name, room_number, capacity FROM classrooms WHERE tenant_id = ? AND branch_id = 2 AND deleted_at IS NULL ORDER BY id
    `, [tenantId]);

    const [allPuneBatches] = await pool.query(`
      SELECT id, name, code FROM batches WHERE tenant_id = ? AND branch_id = 2 AND deleted_at IS NULL ORDER BY id
    `, [tenantId]);

    for (let i = 0; i < allPuneBatches.length; i++) {
      const batch = allPuneBatches[i];
      const classroom = allPuneClassrooms[i % allPuneClassrooms.length];
      await pool.query(`UPDATE batches SET classroom_id = ? WHERE id = ?`, [classroom.id, batch.id]);
    }

    console.log('✅ Batches assigned to dedicated classrooms.');

    // ── 5. Verification ──
    const [summary] = await pool.query(`
      SELECT 
        br.name as branch_name,
        COUNT(cl.id) as total_classrooms,
        SUM(CASE WHEN cl.type = 'classroom' THEN 1 ELSE 0 END) as lecture_rooms,
        SUM(CASE WHEN cl.type = 'lab' THEN 1 ELSE 0 END) as science_labs,
        SUM(CASE WHEN cl.type = 'computer_lab' THEN 1 ELSE 0 END) as computer_labs,
        SUM(CASE WHEN cl.type = 'seminar_hall' THEN 1 ELSE 0 END) as seminar_halls,
        SUM(cl.capacity) as total_seating_capacity
      FROM branches br
      JOIN classrooms cl ON cl.branch_id = br.id AND cl.deleted_at IS NULL
      WHERE br.tenant_id = ?
      GROUP BY br.id, br.name
    `, [tenantId]);

    console.log('\n=== CLASSROOMS SUMMARY PER BRANCH ===');
    console.table(summary);

    const [batchRoomMap] = await pool.query(`
      SELECT 
        b.id as batch_id,
        br.name as branch_name,
        b.name as batch_name,
        b.code as batch_code,
        cl.name as assigned_classroom,
        cl.room_number,
        cl.type as room_type,
        cl.capacity as room_capacity,
        b.capacity as batch_capacity
      FROM batches b
      JOIN branches br ON b.branch_id = br.id
      JOIN classrooms cl ON b.classroom_id = cl.id
      WHERE b.tenant_id = ? AND b.deleted_at IS NULL
      ORDER BY b.branch_id, b.id
    `, [tenantId]);

    console.log('\n=== BATCH-TO-CLASSROOM ALLOCATION ===');
    console.table(batchRoomMap);

  } catch (err) {
    console.error('❌ Error during classroom seeding:', err);
  } finally {
    process.exit(0);
  }
}

seedClassroomsAndAssignBatches();
