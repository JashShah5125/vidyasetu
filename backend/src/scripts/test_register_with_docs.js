const http = require('http');

const boundary = '----TestBoundary' + Date.now();

function createPart(name, value) {
  return Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
  );
}

function createFilePart(name, filename, contentType, buffer) {
  const header = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`
  );
  const footer = Buffer.from('\r\n');
  return Buffer.concat([header, buffer, footer]);
}

const parts = [
  createPart('instituteName', 'Horizon Coaching Hub'),
  createPart('state', 'Maharashtra'),
  createPart('city', 'Mumbai'),
  createPart('pincode', '400001'),
  createPart('contactPerson', 'Suresh Raina'),
  createPart('email', 'suresh@horizon.edu.in'),
  createPart('mobile', '9820098200'),
  createPart('remarks', 'Testing full document upload integration'),
  createFilePart('reg_doc', 'reg_cert.pdf', 'application/pdf', Buffer.from('%PDF-1.4 sample reg doc')),
  createFilePart('pan_doc', 'pan_card.jpg', 'image/jpeg', Buffer.from('sample pan bytes')),
  createFilePart('admin_id_doc', 'aadhaar.pdf', 'application/pdf', Buffer.from('%PDF-1.4 sample aadhaar')),
  Buffer.from(`--${boundary}--\r\n`)
];

const payload = Buffer.concat(parts);

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/public/leads',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': payload.length
  }
}, res => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    console.log('Registration Status:', res.statusCode);
    console.log('Response Body:', b);
    process.exit(0);
  });
});

req.on('error', err => {
  console.error('Request error:', err);
  process.exit(1);
});

req.write(payload);
req.end();
