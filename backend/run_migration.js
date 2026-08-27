const db = require('./src/config/db');

async function runMigration() {
  const connection = await db.getConnection();
  try {
    await connection.query("ALTER TABLE `plan_billing` MODIFY `billing_type` ENUM('Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'Lifetime') NOT NULL;");
    
    // Add index first so foreign key doesn't break when we drop primary key
    try {
      await connection.query("ALTER TABLE `plan_billing` ADD INDEX `idx_plan_id` (`plan_id`);");
    } catch(e) {
      if (e.code !== 'ER_DUP_KEYNAME') throw e;
    }

    try {
      await connection.query("ALTER TABLE `plan_billing` DROP PRIMARY KEY;");
      await connection.query("ALTER TABLE `plan_billing` ADD `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST;");
    } catch(e) {
      if (e.code !== 'ER_MULTIPLE_PRI_KEY') throw e; // ignore if already done
    }
    
    // Check if data already exists to avoid duplicates
    const [rows] = await connection.query("SELECT * FROM plan_billing WHERE plan_id = 2 AND billing_type IN ('Quarterly', 'Half-Yearly')");
    if (rows.length === 0) {
      await connection.query(`
        INSERT INTO \`plan_billing\` 
        (\`plan_id\`, \`billing_type\`, \`price\`, \`currency\`, \`trial_days\`, \`setup_fee\`, \`renewal_price\`, \`auto_renewal\`)
        VALUES 
        (2, 'Quarterly', 14000.00, 'INR', 0, 4999.00, 14000.00, 1),
        (2, 'Half-Yearly', 26000.00, 'INR', 0, 4999.00, 26000.00, 1)
      `);
      console.log('Migration successful: Inserted new billing options for Plan 2.');
    } else {
      console.log('Migration successful: Data already existed.');
    }
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    connection.release();
    process.exit();
  }
}

runMigration();
