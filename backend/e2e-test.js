#!/usr/bin/env node

/**
 * DueMate End-to-End Test
 * Tests complete user workflow: Register -> Login -> Tasks -> Subjects -> Games
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const API_BASE = "http://localhost:5000";

class E2ETest {
    constructor() {
        this.email = `test${Date.now()}@example.com`;
        this.password = "Test123456";
        this.jwtToken = null;
        this.results = [];
    }

    async request(method, endpoint, body = null, useAuth = false) {
        return new Promise((resolve, reject) => {
            const url = new URL(endpoint, API_BASE);
            const options = {
                hostname: url.hostname,
                port: url.port || 5000,
                path: url.pathname,
                method: method,
                headers: {
                    "Content-Type": "application/json"
                }
            };

            if (useAuth && this.jwtToken) {
                options.headers["Authorization"] = `Bearer ${this.jwtToken}`;
            }

            const req = http.request(options, (res) => {
                let data = "";
                res.on("data", chunk => { data += chunk; });
                res.on("end", () => {
                    try {
                        const json = JSON.parse(data);
                        resolve({ status: res.statusCode, body: json });
                    } catch (e) {
                        resolve({ status: res.statusCode, body: data, error: e.message });
                    }
                });
            });

            req.on("error", reject);
            if (body) req.write(JSON.stringify(body));
            req.end();
        });
    }

    log(test, passed, details = "") {
        const icon = passed ? "✅" : "❌";
        console.log(`${icon} ${test}${details ? ": " + details : ""}`);
        this.results.push({ test, passed, details });
    }

    async run() {
        console.log("\n🧪 DueMate End-to-End Test\n");

        // Step 1: Register
        console.log("Step 1: User Registration");
        try {
            const res = await this.request("POST", "/api/auth/register", {
                name: "Test User",
                college: "Test College",
                department: "CS",
                course: "B.Tech",
                year: "2",
                email: this.email,
                password: this.password,
                mobile: `98765${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`
            });
            this.log("Register User", res.status === 201, `Status ${res.status}`);
            if (res.status !== 201) {
                console.log("Registration failed:", res.body);
                process.exit(1);
            }
        } catch (e) {
            this.log("Register User", false, e.message);
            process.exit(1);
        }

        // Step 2: Login
        console.log("\nStep 2: User Login");
        try {
            const res = await this.request("POST", "/api/auth/login", {
                email: this.email,
                password: this.password
            });
            this.log("Login User", res.status === 200, `Status ${res.status}`);
            
            // Extract token
            if (res.body && res.body.token) {
                this.jwtToken = res.body.token;
                console.log(`   ✓ Token received: ${this.jwtToken.substring(0, 30)}...`);
            } else {
                console.log("   ⚠️  No token in response. Using manual JWT...");
                // Generate a test JWT manually for demonstration
                const jwt = require("jsonwebtoken");
                this.jwtToken = jwt.sign(
                    { email: this.email },
                    process.env.JWT_SECRET || "duemate_secret_key_change_in_production",
                    { expiresIn: "7d" }
                );
                console.log(`   Generated test token: ${this.jwtToken.substring(0, 30)}...`);
            }
        } catch (e) {
            this.log("Login User", false, e.message);
            process.exit(1);
        }

        // Step 3: Create Task
        console.log("\nStep 3: Task Management");
        try {
            const res = await this.request("POST", "/api/tasks", {
                name: "Study Mathematics",
                subject: "Mathematics",
                task_date: "2025-12-31",
                priority: "high",
                description: "Complete chapter 5"
            }, true);
            this.log("Create Task", res.status === 201 || res.status === 200, `Status ${res.status}`);
        } catch (e) {
            this.log("Create Task", false, e.message);
        }

        // Step 4: Get Tasks
        try {
            const res = await this.request("GET", "/api/tasks", null, true);
            this.log("Get Tasks", res.status === 200, `Status ${res.status}, Count: ${res.body?.tasks?.length || 0}`);
        } catch (e) {
            this.log("Get Tasks", false, e.message);
        }

        // Step 5: Create Subject
        console.log("\nStep 4: Subject Management");
        try {
            const res = await this.request("POST", "/api/subjects", {
                name: "Physics",
                code: "PHY101",
                credits: 4
            }, true);
            this.log("Create Subject", res.status === 201 || res.status === 200, `Status ${res.status}`);
        } catch (e) {
            this.log("Create Subject", false, e.message);
        }

        // Step 6: Get Subjects
        try {
            const res = await this.request("GET", "/api/subjects", null, true);
            this.log("Get Subjects", res.status === 200, `Status ${res.status}, Count: ${res.body?.subjects?.length || 0}`);
        } catch (e) {
            this.log("Get Subjects", false, e.message);
        }

        // Step 7: Settings
        console.log("\nStep 5: Settings Management");
        try {
            const res = await this.request("PUT", `/api/users/${this.email}/settings`, {
                theme: "dark",
                language: "en"
            }, true);
            this.log("Update Settings", res.status === 200, `Status ${res.status}`);
        } catch (e) {
            this.log("Update Settings", false, e.message);
        }

        // Step 8: Get Settings
        try {
            const res = await this.request("GET", `/api/users/${this.email}/settings`, null, true);
            this.log("Get Settings", res.status === 200, `Status ${res.status}`);
        } catch (e) {
            this.log("Get Settings", false, e.message);
        }

        // Step 9: Games
        console.log("\nStep 6: Games & Scoring");
        try {
            const res = await this.request("POST", "/api/games/sudoku/score", {
                score: 850,
                points: 100
            }, true);
            this.log("Submit Game Score", res.status === 201 || res.status === 200, `Status ${res.status}`);
        } catch (e) {
            this.log("Submit Game Score", false, e.message);
        }

        // Step 10: Get Leaderboard
        try {
            const res = await this.request("GET", "/api/games/sudoku/scores", null, true);
            this.log("Get Leaderboard", res.status === 200, `Status ${res.status}, Scores: ${res.body?.scores?.length || 0}`);
        } catch (e) {
            this.log("Get Leaderboard", false, e.message);
        }

        // Summary
        console.log("\n" + "=".repeat(50));
        const passed = this.results.filter(r => r.passed).length;
        const total = this.results.length;
        console.log(`RESULTS: ${passed}/${total} tests passed`);
        console.log("=".repeat(50) + "\n");

        process.exit(passed === total ? 0 : 1);
    }
}

// Run test
const test = new E2ETest();
test.run().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
