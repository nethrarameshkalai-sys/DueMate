const http = require('http');

const email = 'fresh-1788297816792@test.com';
const password = 'Test@12345';

const body = JSON.stringify({
  email: email,
  password: password
});

console.log('Testing login API response format...\n');

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
    console.log('Headers:', JSON.stringify(res.headers, null, 2));
    
    try {
      const parsed = JSON.parse(data);
      console.log('\nParsed Response:');
      console.log(JSON.stringify(parsed, null, 2));
      
      console.log('\nChecks:');
      console.log('- Has success?', !!parsed.success);
      console.log('- Has user?', !!parsed.user);
      console.log('- Has token?', !!parsed.token);
      console.log('- User has email?', parsed.user && !!parsed.user.email);
      console.log('- User has name?', parsed.user && !!parsed.user.name);
      
      if (!parsed.user) {
        console.log('\n⚠ WARNING: No user object returned!');
        console.log('Frontend expects: data.user.email, data.user.name, data.user.theme');
      }
    } catch (e) {
      console.log('Parse error:', e.message);
      console.log('Raw response:', data);
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
