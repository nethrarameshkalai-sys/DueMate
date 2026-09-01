const http = require('http');

const timestamp = Date.now();
const email = `fresh-${timestamp}@test.com`;
const mobile = String(98765000000 + (timestamp % 100000)).substring(0, 10);

const body = JSON.stringify({
  name: 'Fresh Test User',
  college: 'Test University',
  department: 'Computer Science',
  course: 'B.Tech',
  year: '1',
  email: email,
  mobile: mobile,
  password: 'Test@12345',
  theme: 'system'
});

console.log('Registering:', email);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': body.length
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Response:', data);
    }
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
  process.exit(1);
});

req.write(body);
req.end();
