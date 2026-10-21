const http = require('http');
const crypto = require('crypto');
const pool = require('../config/db');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTest() {
  const testEmail = 'seema@allen.com';

  console.log('--- Step 1: Request OTP ---');
  const sendRes = await post('/api/auth/forgot-password/send-otp', { email: testEmail });
  console.log('Send OTP status:', sendRes.status, sendRes.body.message);

  const testOtp = '123456';
  const testHash = crypto.createHash('sha256').update(testOtp).digest('hex');
  await pool.query(
    "UPDATE otp_codes SET code_hash = ? WHERE purpose = 'password_reset' AND used_at IS NULL ORDER BY id DESC LIMIT 1",
    [testHash]
  );

  console.log('--- Step 2: Verify OTP ---');
  const verifyRes = await post('/api/auth/forgot-password/verify-otp', { email: testEmail, otp: testOtp });
  console.log('Verify OTP status:', verifyRes.status, verifyRes.body.message);

  const resetToken = verifyRes.body.data.resetToken;
  console.log('Received Reset Token:', resetToken.substring(0, 16) + '...');

  console.log('--- Step 3: Reset Password ---');
  const newPass = 'TestResetPassword@123';
  const resetRes = await post('/api/auth/forgot-password/reset', {
    email: testEmail,
    resetToken,
    newPassword: newPass
  });
  console.log('Reset Password status:', resetRes.status, resetRes.body.message);

  console.log('--- Step 4: Login with New Password ---');
  const loginRes = await post('/api/auth/login', { email: testEmail, password: newPass });
  console.log('Login status:', loginRes.status, 'Logged in as:', loginRes.body?.data?.user?.name);

  console.log('--- Step 5: Check email_verified in DB ---');
  const [userRows] = await pool.query('SELECT email, email_verified, email_verified_at FROM users WHERE email = ?', [testEmail]);
  console.log('User status in DB:', userRows[0]);

  process.exit(0);
}

runTest().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
