const pool = require('./src/config/db');

async function migrateHomeworkStatus() {
    try {
        console.log('🔄 1. Normalizing existing status strings to integers...');
        await pool.query("UPDATE homeworks SET status = '0' WHERE LOWER(status) = 'draft' OR status = '0';");
        await pool.query("UPDATE homeworks SET status = '1' WHERE LOWER(status) = 'published' OR status = '1';");
        await pool.query("UPDATE homeworks SET status = '2' WHERE LOWER(status) = 'closed' OR status = '2';");
        
        console.log('🔄 2. Altering homeworks table to set status as TINYINT NOT NULL DEFAULT 0...');
        await pool.query("ALTER TABLE homeworks MODIFY COLUMN status TINYINT NOT NULL DEFAULT 0 COMMENT '0=draft, 1=published, 2=closed';");
        
        console.log('✅ 3. Validating new column schema:');
        const [cols] = await pool.query("SHOW FULL COLUMNS FROM homeworks LIKE 'status';");
        console.log(cols);

        console.log('📊 4. Current status distributions:');
        const [counts] = await pool.query("SELECT status, COUNT(*) as count FROM homeworks GROUP BY status;");
        console.log(counts);

        console.log('🎉 Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrateHomeworkStatus();
