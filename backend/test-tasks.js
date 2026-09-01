const http = require('http');

const userToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImZyZXNoLTE3ODgyOTc4MTY3OTJAdGVzdC5jb20iLCJleHAiOjE3MjgyMDEwMDAsImlhdCI6MTcyODExNDYwMH0.test'; // We'll test with mock
const testEmail = 'fresh-1788297816792@test.com';

async function testTasksAPI() {
  // First get valid token
  console.log('Testing Tasks CRUD...\n');

  // Login to get token
  const loginBody = JSON.stringify({
    email: testEmail,
    password: 'Test@12345'
  });

  return new Promise((resolve) => {
    const loginOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginBody.length
      }
    };

    const loginReq = http.request(loginOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const response = JSON.parse(data);
        const token = response.token;
        console.log('✓ Logged in, got token');

        // Now test POST /api/tasks (CREATE)
        const taskBody = JSON.stringify({
          name: 'Test Task',
          subject: 'Math',
          description: 'Test task for verification',
          task_date: '2026-09-10',
          priority: 'high'
        });

        const taskOptions = {
          hostname: 'localhost',
          port: 5000,
          path: '/api/tasks',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Content-Length': taskBody.length
          }
        };

        const taskReq = http.request(taskOptions, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              const taskResponse = JSON.parse(data);
              console.log('✓ Task CREATE:', res.statusCode, taskResponse.success ? 'SUCCESS' : 'FAILED');
              
              if (taskResponse.success || taskResponse.task) {
                // Test GET /api/tasks
                const getOptions = {
                  hostname: 'localhost',
                  port: 5000,
                  path: '/api/tasks',
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                };

                const getReq = http.request(getOptions, (res) => {
                  let data = '';
                  res.on('data', (chunk) => { data += chunk; });
                  res.on('end', () => {
                    try {
                      const getTasks = JSON.parse(data);
                      console.log('✓ Task READ:', res.statusCode, Array.isArray(getTasks) ? `Got ${getTasks.length} tasks` : getTasks.success ? 'SUCCESS' : 'FAILED');
                    } catch (e) {
                      console.log('✗ Task READ parsing error:', e.message);
                    }
                    resolve();
                  });
                });

                getReq.on('error', (e) => {
                  console.error('Error:', e.message);
                  resolve();
                });

                getReq.end();
              } else {
                resolve();
              }
            } catch (e) {
              console.log('✗ Task CREATE parsing error:', e.message);
              console.log('Response was:', data);
              resolve();
            }
          });
        });

        taskReq.on('error', (e) => {
          console.error('Error:', e.message);
          resolve();
        });

        taskReq.write(taskBody);
        taskReq.end();
      });
    });

    loginReq.on('error', (e) => {
      console.error('Error:', e.message);
      resolve();
    });

    loginReq.write(loginBody);
    loginReq.end();
  });
}

testTasksAPI().then(() => {
  process.exit(0);
});
