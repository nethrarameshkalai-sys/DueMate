/*
   Test Script for JWT Authentication
   
   This script tests the complete JWT authentication flow:
   1. Register a user
   2. Login and receive JWT token
   3. Use JWT token to access protected endpoints
   4. Verify 401 response when token is missing
*/

const API_BASE = "http://localhost:5000";

// Test email and password
const testEmail = "jwt-test@example.com";
const testPassword = "TestPassword123!";

async function test() {
    console.log("\n=== JWT Authentication Test ===\n");

    try {
        // 1. Register
        console.log("1. Testing Registration...");
        let response = await fetch(`${API_BASE}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: testEmail,
                password: testPassword,
                name: "JWT Test User",
                mobile: "9999999999"
            })
        });

        let data = await response.json();
        if (response.ok) {
            console.log("   ✓ Registration successful");
        } else {
            console.log("   " + (data.message || "Registration failed"));
        }

        // 2. Login
        console.log("\n2. Testing Login...");
        response = await fetch(`${API_BASE}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: testEmail,
                password: testPassword
            })
        });

        data = await response.json();
        if (!response.ok) {
            console.log("   ✗ Login failed:", data.message);
            return;
        }

        if (!data.token) {
            console.log("   ✗ No JWT token returned!");
            return;
        }

        console.log("   ✓ Login successful");
        console.log("   ✓ JWT Token received:", data.token.substring(0, 30) + "...");

        const token = data.token;

        // 3. Access protected endpoint WITH token
        console.log("\n3. Testing Protected Endpoint (WITH Token)...");
        response = await fetch(`${API_BASE}/api/user/profile`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        data = await response.json();
        if (response.ok && data.success) {
            console.log("   ✓ Successfully accessed protected endpoint");
            console.log("   ✓ User profile retrieved:", data.user.email);
        } else {
            console.log("   ✗ Failed to access protected endpoint:", data.message);
        }

        // 4. Access protected endpoint WITHOUT token
        console.log("\n4. Testing Protected Endpoint (WITHOUT Token)...");
        response = await fetch(`${API_BASE}/api/user/profile`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (response.status === 401) {
            console.log("   ✓ Correctly rejected request without token (401)");
        } else {
            console.log("   ✗ Should have returned 401, got:", response.status);
        }

        // 5. Access protected endpoint with INVALID token
        console.log("\n5. Testing Protected Endpoint (WITH Invalid Token)...");
        response = await fetch(`${API_BASE}/api/user/profile`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer invalid.token.here"
            }
        });

        if (response.status === 401) {
            console.log("   ✓ Correctly rejected invalid token (401)");
        } else {
            console.log("   ✗ Should have returned 401 for invalid token, got:", response.status);
        }

        console.log("\n=== JWT Authentication Tests Complete ===\n");

    } catch (error) {
        console.error("Test Error:", error.message);
        console.log("\nMake sure:");
        console.log("  1. Backend server is running: node server.js");
        console.log("  2. Database is accessible");
    }
}

// Run tests
test();
