#!/usr/bin/env node

const http = require("http");

const API_BASE = "http://localhost:5000";
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

console.log("Testing full auth flow with debug output...\n");

function request(method, path, body) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, API_BASE);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: method,
            headers: {
                "Content-Type": "application/json"
            }
        };

        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => { data += chunk; });
            res.on("end", () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });

        req.on("error", reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function test() {
    try {
        // Register
        console.log("1️⃣  REGISTER");
        let res = await request("POST", "/api/auth/register", testUser);
        console.log(`   Status: ${res.status}`);
        console.log(`   Response: ${res.body.substring(0, 200)}`);
        let registerData = JSON.parse(res.body);
        if (!registerData.success) throw new Error("Registration failed");

        // Login
        console.log("\n2️⃣  LOGIN");
        res = await request("POST", "/api/auth/login", {
            email: testUser.email,
            password: testUser.password
        });
        console.log(`   Status: ${res.status}`);
        console.log(`   Headers: ${JSON.stringify(res.headers, null, 2).substring(0, 300)}`);
        console.log(`   Response (raw): ${res.body}`);
        let loginData = JSON.parse(res.body);
        console.log(`   Response (parsed): ${JSON.stringify(loginData, null, 2)}`);
        console.log(`   Token field exists: ${"token" in loginData}`);
        console.log(`   Token value: ${loginData.token ? loginData.token.substring(0, 50) + "..." : "MISSING"}`);

    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

test();
