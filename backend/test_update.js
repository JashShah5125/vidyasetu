const pool = require('./src/config/db');
const tenantModel = require('./src/models/tenantModel');

async function testUpdate() {
    try {
        console.log("Starting test...");
        // Let's update tenant 2 with some basic data
        const data = {
            name: 'Updated Name',
            legal_name: 'Updated Name Pvt Ltd',
            slug: 'updated-name',
            adminEmail: 'admin@updated.com',
            mobile: '9876543210'
        };
        const success = await tenantModel.updateTenant(2, data);
        console.log("Update success:", success);
    } catch (e) {
        console.error("Error during update:", e);
    } finally {
        pool.end();
    }
}
testUpdate();
