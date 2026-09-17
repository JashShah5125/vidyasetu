const fs = require('fs');
const pool = require('./src/config/db');

async function generateTimetableSQL() {
  const tenantId = 2;

  // 1. Fetch batches
  const [batches] = await pool.query(`
    SELECT 
      b.id, b.name, b.code, b.branch_id, br.name as branch_name,
      b.academic_year_id, b.level_id, l.name as level_name,
      b.start_time, b.end_time, b.classroom_id, cl.name as room_name, cl.room_number
    FROM batches b
    JOIN branches br ON b.branch_id = br.id
    JOIN classrooms cl ON b.classroom_id = cl.id
    LEFT JOIN levels l ON b.level_id = l.id
    WHERE b.tenant_id = ? AND b.deleted_at IS NULL
    ORDER BY b.branch_id, b.id
  `, [tenantId]);

  // 2. Fetch level subjects
  const [levelSubjects] = await pool.query(`
    SELECT ls.level_id, s.id as subject_id, s.name as subject_name, s.code as subject_code
    FROM level_subjects ls
    JOIN subjects s ON ls.subject_id = s.id
    WHERE ls.tenant_id = ?
  `, [tenantId]);

  // 3. Fetch teacher subjects
  const [teacherSubjects] = await pool.query(`
    SELECT ts.teacher_user_id, u.name as teacher_name, ts.subject_id, s.name as subject_name
    FROM teacher_subjects ts
    JOIN users u ON ts.teacher_user_id = u.id
    JOIN subjects s ON ts.subject_id = s.id
    WHERE ts.tenant_id = ? AND u.deleted_at IS NULL
  `, [tenantId]);

  // 4. Fetch teacher allocations (explicit batch mappings)
  const [teacherAllocations] = await pool.query(`
    SELECT ta.batch_id, ta.teacher_user_id, u.name as teacher_name
    FROM teacher_allocations ta
    JOIN users u ON ta.teacher_user_id = u.id
    WHERE ta.tenant_id = ? AND ta.deleted_at IS NULL
  `, [tenantId]);

  // Global schedule store
  const globalTeacherBookings = [];

  function hasTeacherConflict(teacherId, day, start, end) {
    return globalTeacherBookings.some(b => 
      b.teacher_user_id === teacherId &&
      b.day_of_week === day &&
      (start < b.end_time && end > b.start_time)
    );
  }

  // Pre-define non-colliding time slots per batch in each branch
  // Mumbai West (Branch 1): 11 Batches
  // Pune Camp (Branch 2): 8 Batches
  const batchTimeSlots = {
    // Branch 1 - Mumbai West
    1:  { s1Start: '07:00:00', s1End: '08:25:00', s2Start: '08:35:00', s2End: '10:00:00' }, // JEE-XI-M
    2:  { s1Start: '14:00:00', s1End: '15:25:00', s2Start: '15:35:00', s2End: '17:00:00' }, // JEE-XII-DR
    6:  { s1Start: '17:15:00', s1End: '18:40:00', s2Start: '18:50:00', s2End: '20:15:00' }, // JEE-XI-E
    7:  { s1Start: '10:15:00', s1End: '11:40:00', s2Start: '11:50:00', s2End: '13:15:00' }, // JEE-XI-25
    8:  { s1Start: '07:00:00', s1End: '08:25:00', s2Start: '08:35:00', s2End: '10:00:00' }, // JEE-XII-M
    9:  { s1Start: '10:15:00', s1End: '11:40:00', s2Start: '11:50:00', s2End: '13:15:00' }, // JEE-XII-25
    10: { s1Start: '17:15:00', s1End: '18:40:00', s2Start: '18:50:00', s2End: '20:15:00' }, // JEE-DR-E
    16: { s1Start: '07:00:00', s1End: '08:25:00', s2Start: '08:35:00', s2End: '10:00:00' }, // 8-ICSE-M
    17: { s1Start: '10:15:00', s1End: '11:40:00', s2Start: '11:50:00', s2End: '13:15:00' }, // 8-ICSE-25
    18: { s1Start: '07:00:00', s1End: '08:25:00', s2Start: '08:35:00', s2End: '10:00:00' }, // 8-CBSE-M
    19: { s1Start: '10:15:00', s1End: '11:40:00', s2Start: '11:50:00', s2End: '13:15:00' }, // 8-CBSE-25

    // Branch 2 - Pune Camp
    3:  { s1Start: '07:00:00', s1End: '08:25:00', s2Start: '08:35:00', s2End: '10:00:00' }, // NEET-XII-M
    4:  { s1Start: '14:00:00', s1End: '15:25:00', s2Start: '15:35:00', s2End: '17:00:00' }, // NEET-REP
    5:  { s1Start: '07:00:00', s1End: '08:25:00', s2Start: '08:35:00', s2End: '10:00:00' }, // FOUND-VIII
    11: { s1Start: '17:15:00', s1End: '18:40:00', s2Start: '18:50:00', s2End: '20:15:00' }, // NEET-XII-E
    12: { s1Start: '10:15:00', s1End: '11:40:00', s2Start: '11:50:00', s2End: '13:15:00' }, // NEET-REP-25
    13: { s1Start: '17:15:00', s1End: '18:40:00', s2Start: '18:50:00', s2End: '20:15:00' }, // FND-VIII-E
    14: { s1Start: '07:00:00', s1End: '08:25:00', s2Start: '08:35:00', s2End: '10:00:00' }, // FND-IX-M
    15: { s1Start: '10:15:00', s1End: '11:40:00', s2Start: '11:50:00', s2End: '13:15:00' }, // FND-IX-25
  };

  const batchSchedules = [];

  for (const b of batches) {
    const validSubs = levelSubjects.filter(ls => ls.level_id === b.level_id);
    const allocTeachers = teacherAllocations.filter(ta => ta.batch_id === b.id);

    // Find all valid (Teacher, Subject) pairs
    const eligiblePairs = [];

    // 1. First priority: directly allocated teachers for this batch with valid subjects
    for (const at of allocTeachers) {
      const taught = teacherSubjects.filter(ts => ts.teacher_user_id === at.teacher_user_id);
      for (const t of taught) {
        if (validSubs.some(vs => vs.subject_id === t.subject_id)) {
          eligiblePairs.push({
            teacher_user_id: at.teacher_user_id,
            teacher_name: at.teacher_name,
            subject_id: t.subject_id,
            subject_name: t.subject_name
          });
        }
      }
    }

    // 2. Second priority: any institute teacher teaching valid subjects for this batch's level
    for (const vs of validSubs) {
      const taught = teacherSubjects.filter(ts => ts.subject_id === vs.subject_id);
      for (const t of taught) {
        if (!eligiblePairs.some(p => p.teacher_user_id === t.teacher_user_id && p.subject_id === vs.subject_id)) {
          eligiblePairs.push({
            teacher_user_id: t.teacher_user_id,
            teacher_name: t.teacher_name,
            subject_id: vs.subject_id,
            subject_name: vs.subject_name
          });
        }
      }
    }

    // If still empty (no level subjects mapped), fallback to any faculty
    if (eligiblePairs.length === 0) {
      for (const ts of teacherSubjects) {
        if (!eligiblePairs.some(p => p.teacher_user_id === ts.teacher_user_id && p.subject_id === ts.subject_id)) {
          eligiblePairs.push({
            teacher_user_id: ts.teacher_user_id,
            teacher_name: ts.teacher_name,
            subject_id: ts.subject_id,
            subject_name: ts.subject_name
          });
        }
      }
    }

    const times = batchTimeSlots[b.id] || { s1Start: '07:30:00', s1End: '09:00:00', s2Start: '09:15:00', s2End: '10:45:00' };
    const batchSlots = [];

    // Schedule Monday to Saturday (Day 1 to 6)
    for (let day = 1; day <= 6; day++) {
      // Find conflict-free teacher for Slot 1
      let chosen1 = null;
      for (let i = 0; i < eligiblePairs.length; i++) {
        const candidate = eligiblePairs[(day * 2 + i) % eligiblePairs.length];
        if (!hasTeacherConflict(candidate.teacher_user_id, day, times.s1Start, times.s1End)) {
          chosen1 = candidate;
          break;
        }
      }

      if (!chosen1) {
        // Find ANY qualified candidate with no conflict
        for (const candidate of eligiblePairs) {
          if (!hasTeacherConflict(candidate.teacher_user_id, day, times.s1Start, times.s1End)) {
            chosen1 = candidate;
            break;
          }
        }
      }

      if (!chosen1) {
        throw new Error(`Conflict for Batch ${b.id} (${b.name}) on Day ${day} Slot 1`);
      }

      globalTeacherBookings.push({
        teacher_user_id: chosen1.teacher_user_id,
        day_of_week: day,
        start_time: times.s1Start,
        end_time: times.s1End,
        batch_id: b.id
      });

      batchSlots.push({
        day_of_week: day,
        start_time: times.s1Start,
        end_time: times.s1End,
        subject_id: chosen1.subject_id,
        teacher_user_id: chosen1.teacher_user_id,
        teacher_name: chosen1.teacher_name,
        subject_name: chosen1.subject_name,
        slot_label: 'Slot 1'
      });

      // Find conflict-free teacher for Slot 2
      let chosen2 = null;
      for (let i = 0; i < eligiblePairs.length; i++) {
        const candidate = eligiblePairs[(day * 2 + 1 + i) % eligiblePairs.length];
        if (!hasTeacherConflict(candidate.teacher_user_id, day, times.s2Start, times.s2End)) {
          chosen2 = candidate;
          break;
        }
      }

      if (!chosen2) {
        for (const candidate of eligiblePairs) {
          if (!hasTeacherConflict(candidate.teacher_user_id, day, times.s2Start, times.s2End)) {
            chosen2 = candidate;
            break;
          }
        }
      }

      if (!chosen2) {
        throw new Error(`Conflict for Batch ${b.id} (${b.name}) on Day ${day} Slot 2`);
      }

      globalTeacherBookings.push({
        teacher_user_id: chosen2.teacher_user_id,
        day_of_week: day,
        start_time: times.s2Start,
        end_time: times.s2End,
        batch_id: b.id
      });

      batchSlots.push({
        day_of_week: day,
        start_time: times.s2Start,
        end_time: times.s2End,
        subject_id: chosen2.subject_id,
        teacher_user_id: chosen2.teacher_user_id,
        teacher_name: chosen2.teacher_name,
        subject_name: chosen2.subject_name,
        slot_label: 'Slot 2'
      });
    }

    batchSchedules.push({
      batch: b,
      slots: batchSlots
    });
  }

  // Generate clean SQL statements batch by batch
  const sqlLines = [];
  sqlLines.push('-- ==============================================================================');
  sqlLines.push('-- Vidyasetu Default Timetable SQL Seed Queries');
  sqlLines.push('-- Generated for Allen Career Institute (Tenant ID: 2)');
  sqlLines.push('-- Total Batches: 19 (Mumbai West: 11 Batches, Pune Camp: 8 Batches)');
  sqlLines.push('-- Schedule: Monday to Saturday (Day 1 to 6), 2 Slots/Day (12 Slots/Week per Batch)');
  sqlLines.push('-- Zero Sunday Slots (Day 0), Strict Default Classroom & Teacher Non-Collision');
  sqlLines.push('-- ==============================================================================\n');

  for (const bs of batchSchedules) {
    const b = bs.batch;
    sqlLines.push(`-- ==============================================================================`);
    sqlLines.push(`-- BATCH ${b.id}: "${b.name}" (${b.code})`);
    sqlLines.push(`-- Branch: ${b.branch_name} (ID: ${b.branch_id}) | Level: ${b.level_name || 'N/A'} (ID: ${b.level_id})`);
    sqlLines.push(`-- Assigned Default Classroom: ${b.room_name} (${b.room_number}) (Classroom ID: ${b.classroom_id})`);
    sqlLines.push(`-- Slot Schedule: Monday to Saturday (12 Slots/Week)`);
    sqlLines.push(`-- ==============================================================================`);
    sqlLines.push(`DELETE FROM lectures WHERE tenant_id = ${tenantId} AND batch_id = ${b.id} AND is_default = 1;\n`);

    sqlLines.push(`INSERT INTO lectures (`);
    sqlLines.push(`    tenant_id, branch_id, academic_year_id, batch_id,`);
    sqlLines.push(`    is_default, parent_template_id, day_of_week, lecture_date,`);
    sqlLines.push(`    start_time, end_time, subject_id, teacher_user_id, classroom_id,`);
    sqlLines.push(`    lecture_type, activity_type, slot_label, status, is_active,`);
    sqlLines.push(`    created_at, updated_at`);
    sqlLines.push(`) VALUES `);

    const valueRows = bs.slots.map((s, idx) => {
      const isLast = idx === bs.slots.length - 1;
      return `    (${tenantId}, ${b.branch_id}, ${b.academic_year_id}, ${b.id}, 1, NULL, ${s.day_of_week}, NULL, '${s.start_time}', '${s.end_time}', ${s.subject_id}, ${s.teacher_user_id}, ${b.classroom_id}, 'Regular', 'Lecture', '${s.slot_label}', 'scheduled', 1, NOW(), NOW())${isLast ? ';' : ','} -- Day ${s.day_of_week} | ${s.subject_name} | Teacher: ${s.teacher_name} (${s.teacher_user_id})`;
    });

    sqlLines.push(valueRows.join('\n'));
    sqlLines.push('\n');
  }

  const finalSQL = sqlLines.join('\n');
  fs.writeFileSync('c:/Users/vnt/Desktop/vidyasetu_full/vidyasetu/docs/default_timetable_queries.sql', finalSQL);
  console.log('✅ Successfully generated conflict-free SQL timetable script!');
  console.log(`Total Batches: ${batchSchedules.length} | Total Default Slots: ${globalTeacherBookings.length}`);
  process.exit(0);
}

generateTimetableSQL().catch(err => {
  console.error('Error generating timetable SQL:', err);
  process.exit(1);
});
