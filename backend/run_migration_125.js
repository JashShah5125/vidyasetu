const db = require('./src/config/db');

async function runMigration125() {
  const connection = await db.getConnection();
  try {
    console.log('🚀 Running Migration 125: Unified Lectures & Default Timetable...');

    // 1. Ensure columns exist and lecture_date is NULLABLE
    await connection.query("ALTER TABLE `lectures` MODIFY `lecture_date` DATE NULL;");
    console.log('✅ Modified lecture_date to be NULLABLE (for default template slots).');

    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lectures'
    `);
    const existingCols = columns.map(c => c.COLUMN_NAME);

    // 2. Add is_default
    if (!existingCols.includes('is_default')) {
      await connection.query(`
        ALTER TABLE \`lectures\` 
        ADD COLUMN \`is_default\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = Master Default Template Slot, 0 = Concrete Calendar Lecture' 
        AFTER \`batch_id\`;
      `);
      console.log('✅ Added column: is_default');
    }

    // 3. Add parent_template_id
    if (!existingCols.includes('parent_template_id')) {
      await connection.query(`
        ALTER TABLE \`lectures\` 
        ADD COLUMN \`parent_template_id\` INT DEFAULT NULL COMMENT 'References lectures(id) of default template' 
        AFTER \`is_default\`;
      `);
      console.log('✅ Added column: parent_template_id');
    }

    // 4. Add day_of_week
    if (!existingCols.includes('day_of_week')) {
      await connection.query(`
        ALTER TABLE \`lectures\` 
        ADD COLUMN \`day_of_week\` TINYINT DEFAULT NULL COMMENT '1=Mon .. 7=Sun' 
        AFTER \`parent_template_id\`;
      `);
      console.log('✅ Added column: day_of_week');
    }

    // 5. Add slot_label
    if (!existingCols.includes('slot_label')) {
      await connection.query(`
        ALTER TABLE \`lectures\` 
        ADD COLUMN \`slot_label\` VARCHAR(100) DEFAULT NULL COMMENT 'e.g. Period 1, Slot A' 
        AFTER \`activity_type\`;
      `);
      console.log('✅ Added column: slot_label');
    }

    // 6. Add is_modified_from_default
    if (!existingCols.includes('is_modified_from_default')) {
      await connection.query(`
        ALTER TABLE \`lectures\` 
        ADD COLUMN \`is_modified_from_default\` TINYINT(1) NOT NULL DEFAULT 0 
        AFTER \`status\`;
      `);
      console.log('✅ Added column: is_modified_from_default');
    }

    // 7. Add cancellation_reason
    if (!existingCols.includes('cancellation_reason')) {
      await connection.query(`
        ALTER TABLE \`lectures\` 
        ADD COLUMN \`cancellation_reason\` TEXT DEFAULT NULL 
        AFTER \`is_modified_from_default\`;
      `);
      console.log('✅ Added column: cancellation_reason');
    }

    // 8. Add is_active
    if (!existingCols.includes('is_active')) {
      await connection.query(`
        ALTER TABLE \`lectures\` 
        ADD COLUMN \`is_active\` TINYINT(1) NOT NULL DEFAULT 1 
        AFTER \`cancellation_reason\`;
      `);
      console.log('✅ Added column: is_active');
    }

    // 9. Add helpful compound indexes
    const [indexes] = await connection.query(`
      SELECT INDEX_NAME 
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lectures'
    `);
    const existingIndexes = indexes.map(i => i.INDEX_NAME);

    const indexesToAdd = [
      { name: 'idx_lec_tenant_default', sql: 'ALTER TABLE `lectures` ADD INDEX `idx_lec_tenant_default` (`tenant_id`, `is_default`);' },
      { name: 'idx_lec_batch_default_day', sql: 'ALTER TABLE `lectures` ADD INDEX `idx_lec_batch_default_day` (`batch_id`, `is_default`, `day_of_week`);' },
      { name: 'idx_lec_batch_actual_date', sql: 'ALTER TABLE `lectures` ADD INDEX `idx_lec_batch_actual_date` (`batch_id`, `is_default`, `lecture_date`);' },
      { name: 'idx_lec_teacher_actual_date', sql: 'ALTER TABLE `lectures` ADD INDEX `idx_lec_teacher_actual_date` (`teacher_user_id`, `is_default`, `lecture_date`);' },
      { name: 'idx_lec_classroom_actual_date', sql: 'ALTER TABLE `lectures` ADD INDEX `idx_lec_classroom_actual_date` (`classroom_id`, `is_default`, `lecture_date`);' },
      { name: 'idx_lec_parent_ref', sql: 'ALTER TABLE `lectures` ADD INDEX `idx_lec_parent_ref` (`parent_template_id`);' }
    ];

    for (const idx of indexesToAdd) {
      if (!existingIndexes.includes(idx.name)) {
        try {
          await connection.query(idx.sql);
          console.log(`✅ Added index: ${idx.name}`);
        } catch (e) {
          console.warn(`Index ${idx.name} notice:`, e.message);
        }
      }
    }

    // 10. Print final schema of lectures table
    const [describe] = await connection.query("DESCRIBE lectures");
    console.log('\n📋 Final `lectures` table structure:');
    describe.forEach(row => console.log(`  - ${row.Field.padEnd(26)} ${row.Type.padEnd(16)} Null: ${row.Null} Default: ${row.Default}`));

    console.log('\n🎉 Migration 125 completed successfully!');
  } catch (err) {
    console.error('❌ Migration 125 failed:', err);
  } finally {
    connection.release();
    process.exit(0);
  }
}

runMigration125();
