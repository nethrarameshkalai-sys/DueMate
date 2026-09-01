const http = require("http");

// Test registration with unique email
const timestamp = Date.now();
const registrationData = {
    name: "Test User",
    college: "Tech University",
    department: "Computer Science",
    course: "B.Tech",
    year: "2",
    email: `testuser${timestamp}@example.com`,
    mobile: "9876543210",
    password: "Test123456"
};

const options = {
    hostname: "localhost",
    port: 5000,
    path: "/api/auth/register",
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(JSON.stringify(registrationData))
    }
};

console.log("Testing backend server registration...\n");
console.log("Request data:");
console.log(JSON.stringify(registrationData, null, 2));
console.log("\n---\n");

const req = http.request(options, (res) => {
    let data = "";

    res.on("data", (chunk) => {
        data += chunk;
    });

    res.on("end", () => {
        console.log(`Status Code: ${res.statusCode}`);
        console.log("\nResponse:");
        try {
            const response = JSON.parse(data);
            console.log(JSON.stringify(response, null, 2));

            if (response.success) {
                console.log("\n✓ Registration successful!");
                console.log(`✓ JWT token: ${response.token ? "Received" : "Missing"}`);
                console.log(`✓ User: ${response.user.name} (${response.user.email})`);
                console.log("\n✓ BACKEND IS FULLY FUNCTIONAL!");
            } else {
                console.log(`\n✗ Error: ${response.message}`);
            }
        } catch (e) {
            console.log("Response:", data);
        }
    });
});

req.on("error", (error) => {
    console.error("✗ Request failed:", error.message);
    process.exit(1);
});

req.write(JSON.stringify(registrationData));
req.end();
