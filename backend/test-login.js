const http = require('http');

const email = 'fresh-1788297816792@test.com';
const password = 'Test@12345';

const body = JSON.stringify({
  email: email,
  password: password
});

console.log('Testing login with:', email);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
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
      console.log('Response:');
      console.log(JSON.stringify(parsed, null, 2));
      if (parsed.token) {
        console.log('\n✅ JWT Token returned successfully!');
        console.log('Token length:', parsed.token.length);
        console.log('Token prefix:', parsed.token.substring(0, 20) + '...');
      }
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
