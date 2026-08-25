const mysql = require('mysql2/promise');

async function main() {
    try {
        const c = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'Vnt@2018',
            database: 'vidyasetu'
        });
        const [rows] = await c.query("SHOW TABLES LIKE '%tenant%'");
        console.log(rows);
        const [rows2] = await c.query("SHOW TABLES LIKE '%sub%'");
        console.log(rows2);
        
        // get tenant_subscriptions schema
        try {
            const [cols] = await c.query("DESCRIBE tenant_subscriptions");
            console.log("\ntenant_subscriptions columns:");
            console.table(cols);
        } catch (e) {
            console.log("tenant_subscriptions table doesn't exist");
        }
        
        c.end();
    } catch (err) {
        console.error(err);
    }
}
main();
