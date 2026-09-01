const http = require("http");

const testUser = {
    email: `test${Date.now()}@example.com`,
    password: "Test123456",
    name: "Test User",
    college: "Test College",
    department: "CS",
    course: "B.Tech",
    year: "2",
    mobile: `98765${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`
};

console.log("Test user:", testUser);

// Step 1: Register
console.log("\n1. Registering user...");
const registerData = JSON.stringify(testUser);

const registerOptions = {
    hostname: "localhost",
    port: 5000,
    path: "/api/auth/register",
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Content-Length": registerData.length
    }
};

const registerReq = http.request(registerOptions, (res) => {
    let data = "";
    res.on("data", (chunk) => {
        data += chunk;
    });
    res.on("end", () => {
        console.log("Status:", res.statusCode);
        const registerResponse = JSON.parse(data);
        console.log("Response:", JSON.stringify(registerResponse, null, 2));

        if (res.statusCode !== 201) {
            console.log("Registration failed!");
            process.exit(1);
        }

        // Step 2: Login
        console.log("\n2. Logging in...");
        const loginData = JSON.stringify({
            email: testUser.email,
            password: testUser.password
        });

        const loginOptions = {
            hostname: "localhost",
            port: 5000,
            path: "/api/auth/login",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": loginData.length
            }
        };

        const loginReq = http.request(loginOptions, (res) => {
            let loginRespData = "";
            res.on("data", (chunk) => {
                loginRespData += chunk;
            });
            res.on("end", () => {
                console.log("Status:", res.statusCode);
                const loginResponse = JSON.parse(loginRespData);
                console.log("Response:", JSON.stringify(loginResponse, null, 2));
                console.log("\nFull headers:", res.headers);

                if (loginResponse.token) {
                    console.log("\n✓ Token obtained!");
                    console.log("Token (first 50 chars):", loginResponse.token.substring(0, 50));

                    // Step 3: Test protected endpoint
                    console.log("\n3. Testing protected endpoint with token...");
                    testProtectedEndpoint(loginResponse.token);
                } else {
                    console.log("\n✗ No token in response!");
                }
            });
        });

        loginReq.write(loginData);
        loginReq.end();
    });
});

registerReq.write(registerData);
registerReq.end();

function testProtectedEndpoint(token) {
    const options = {
        hostname: "localhost",
        port: 5000,
        path: "/api/tasks",
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    };

    const req = http.request(options, (res) => {
        console.log("Status:", res.statusCode);
        console.log("Headers:", res.headers);
        
        let data = "";
        res.on("data", (chunk) => {
            data += chunk;
        });
        res.on("end", () => {
            console.log("Response (first 500 chars):", data.substring(0, 500));
            try {
                const json = JSON.parse(data);
                console.log("✓ JSON Response:", JSON.stringify(json, null, 2));
            } catch (e) {
                console.log("✗ Not JSON - appears to be HTML error");
            }
        });
    });

    req.end();
}
