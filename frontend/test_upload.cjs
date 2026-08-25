const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function testUpload() {
    try {
        const dummyPath = path.join(__dirname, 'dummy.png');
        fs.writeFileSync(dummyPath, Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2DB40000000049454E44AE426082', 'hex'));

        const form = new FormData();
        form.append('name', 'Test Upload Tenant 2');
        form.append('slug', 'test-upload-' + Date.now());
        form.append('adminEmail', 'admin2@testupload.com');
        form.append('adminPassword', 'Password123!');
        form.append('logo', fs.createReadStream(dummyPath));

        const response = await axios.put('http://localhost:5000/api/admin/tenants/2', form, {
            headers: form.getHeaders()
        });
        console.log("Success:", response.data);
    } catch (e) {
        console.error("Error:", e.response ? e.response.data : e.message);
    }
}
testUpload();
