const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function testUpload() {
    try {
        // Create a dummy image
        const dummyPath = path.join(__dirname, 'dummy.png');
        fs.writeFileSync(dummyPath, Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2DB40000000049454E44AE426082', 'hex'));

        const form = new FormData();
        form.append('name', 'Test Upload Tenant');
        form.append('slug', 'test-upload-' + Date.now());
        form.append('adminEmail', 'admin@testupload.com');
        form.append('logo', fs.createReadStream(dummyPath));

        console.log("Sending request...");
        const response = await axios.post('http://localhost:5000/api/admin/tenants', form, {
            headers: {
                ...form.getHeaders()
                // wait, it requires saas admin auth. we don't have token here. 
            }
        });
        console.log("Success:", response.data);
    } catch (e) {
        console.error("Error:", e.response ? e.response.data : e.message);
    }
}
testUpload();
