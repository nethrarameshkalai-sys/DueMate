#!/usr/bin/env node

/**
 * DueMate Complete Implementation Test & Verification
 * Tests all critical features and reports status
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const API_BASE = "http://localhost:5000";

class DueMateTests {
    constructor() {
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: []
        };
        const timestamp = Date.now();
        const randomNum = Math.floor(Math.random() * 10000);
        this.testUser = {
            email: `test${timestamp}@example.com`,
            password: "Test123456",
            name: "Test User",
            college: "Test College",
            department: "CS",
            course: "B.Tech",
            year: "2",
            mobile: `98765${String(randomNum).padStart(5, '0')}`
        };
        this.jwtToken = null;
    }

    request(method, path, body = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(API_BASE + path);
            const options = {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname + url.search,
                method: method,
                headers: {
                    "Content-Type": "application/json"
                }
            };

            if (this.jwtToken) {
                options.headers["Authorization"] = `Bearer ${this.jwtToken}`;
            }

            const req = http.request(options, (res) => {
                let data = "";
                res.on("data", (chunk) => {
                    data += chunk;
                });
                res.on("end", () => {
                    try {
                        resolve({
                            status: res.statusCode,
                            body: data ? JSON.parse(data) : null,
                            headers: res.headers
                        });
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            req.on("error", reject);
            if (body) req.write(JSON.stringify(body));
            req.end();
        });
    }

    async test(name, fn) {
        this.results.total++;
        process.stdout.write(`  ${name}... `);
        try {
            await fn();
            console.log("✓");
            this.results.passed++;
        } catch (error) {
            console.log("✗");
            this.results.failed++;
            this.results.errors.push({ test: name, error: error.message });
        }
    }

    async runTests() {
        console.log("\n📋 DueMate Complete Implementation Tests\n");

        // Test 1: Registration
        console.log("1️⃣  Authentication Tests");
        await this.test("User Registration", async () => {
            const res = await this.request("POST", "/api/auth/register", this.testUser);
            if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${res.body?.message}`);
            if (!res.body.success) throw new Error(res.body.message);
        });

        // Test 2: Login
        await this.test("User Login", async () => {
            const res = await this.request("POST", "/api/auth/login", {
                email: this.testUser.email,
                password: this.testUser.password
            });
            if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}: ${res.body?.message}`);
            if (!res.body.token) throw new Error("No token returned");
            this.jwtToken = res.body.token;
        });

        // Test 3: Protected Endpoint
        await this.test("Protected Endpoint (Get Profile)", async () => {
            const res = await this.request("GET", `/api/users/${this.testUser.email}`);
            if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}: ${res.body?.message}`);
            if (!res.body.success) throw new Error(res.body.message);
        });

        // Test 4: Tasks
        console.log("\n2️⃣  Tasks Tests");
        let taskId = null;
        await this.test("Create Task", async () => {
            const res = await this.request("POST", "/api/tasks", {
                name: "Test Task",
                subject: "Test Subject",
                task_date: "2025-12-31",
                priority: "high",
                description: "Test task description"
            });
            if (res.status !== 201 && res.status !== 200) throw new Error(`Expected 201/200, got ${res.status}: ${JSON.stringify(res.body)}`);
            if (!res.body || !res.body.success) throw new Error(res.body?.message || "Failed to create task");
            taskId = res.body.task?.id || res.body.id;
        });

        await this.test("Get Tasks", async () => {
            const res = await this.request("GET", "/api/tasks");
            if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
            if (!res.body.success) throw new Error(res.body.message);
            if (!Array.isArray(res.body.tasks)) throw new Error("Tasks is not an array");
        });

        // Test 5: Notifications
        console.log("\n3️⃣  Notifications Tests");
        await this.test("Get Notifications", async () => {
            const res = await this.request("GET", "/api/notifications");
            if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
            if (!res.body.success) throw new Error(res.body.message);
            if (!Array.isArray(res.body.notifications)) throw new Error("Notifications is not an array");
        });

        // Test 6: Settings
        console.log("\n4️⃣  Settings Tests");
        await this.test("Get Settings", async () => {
            const res = await this.request("GET", `/api/users/${this.testUser.email}/settings`);
            if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
            if (!res.body.success) throw new Error(res.body.message);
        });

        await this.test("Update Settings (Theme)", async () => {
            const res = await this.request("PUT", `/api/users/${this.testUser.email}/settings`, {
                theme: "dark"
            });
            if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
            if (!res.body.success) throw new Error(res.body.message);
        });

        // Test 7: Subjects
        console.log("\n5️⃣  Subjects Tests");
        let subjectId = null;
        await this.test("Create Subject", async () => {
            const res = await this.request("POST", "/api/subjects", {
                name: "Mathematics",
                code: "MA101",
                credits: 4
            });
            if (res.status !== 201 && res.status !== 200) throw new Error(`Expected 201/200, got ${res.status}`);
            if (!res.body.success) throw new Error(res.body.message);
            subjectId = res.body.subject?.id;
        });

        await this.test("Get Subjects", async () => {
            const res = await this.request("GET", "/api/subjects");
            if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
            if (!res.body.success) throw new Error(res.body.message);
            if (!Array.isArray(res.body.subjects)) throw new Error("Subjects is not an array");
        });

        // Test 8: Groups
        console.log("\n6️⃣  Groups Tests");
        let groupId = null;
        await this.test("Create Group", async () => {
            const res = await this.request("POST", "/api/groups", {
                name: "Study Group",
                purpose: "Mathematics Study",
                minimum_members: 2,
                maximum_members: 5
            });
            if (res.status !== 201 && res.status !== 200) throw new Error(`Expected 201/200, got ${res.status}`);
            if (!res.body.success) throw new Error(res.body.message);
            groupId = res.body.group?.id;
        });

        await this.test("Get Groups", async () => {
            const res = await this.request("GET", "/api/groups");
            if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
            if (!res.body.success) throw new Error(res.body.message);
            if (!Array.isArray(res.body.groups)) throw new Error("Groups is not an array");
        });

        // Test 9: Games
        console.log("\n7️⃣  Games Tests");
        await this.test("Submit Game Score", async () => {
            const res = await this.request("POST", "/api/games/sudoku/score", {
                score: 100,
                points: 50
            });
            if (res.status !== 201 && res.status !== 200) throw new Error(`Expected 201/200, got ${res.status}`);
            if (!res.body.success) throw new Error(res.body.message);
        });

        await this.test("Get Game Leaderboard", async () => {
            const res = await this.request("GET", "/api/games/sudoku/scores");
            if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
            if (!res.body.success) throw new Error(res.body.message);
            if (!Array.isArray(res.body.scores)) throw new Error("Scores is not an array");
        });

        // Print Summary
        console.log("\n" + "=".repeat(50));
        console.log("📊 TEST SUMMARY");
        console.log("=".repeat(50));
        console.log(`Total Tests:  ${this.results.total}`);
        console.log(`Passed:       ${this.results.passed} ✓`);
        console.log(`Failed:       ${this.results.failed} ✗`);
        console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);

        if (this.results.errors.length > 0) {
            console.log("\n❌ FAILURES:");
            this.results.errors.forEach(err => {
                console.log(`  - ${err.test}: ${err.error}`);
            });
        } else {
            console.log("\n✅ ALL TESTS PASSED!");
        }

        console.log("=".repeat(50) + "\n");

        // Check database
        console.log("📁 Checking Database...");
        const dbPath = path.join(__dirname, "data", "duemate.db");
        if (fs.existsSync(dbPath)) {
            const stats = fs.statSync(dbPath);
            console.log(`✓ SQLite Database exists`);
            console.log(`  Path: ${dbPath}`);
            console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB`);
        } else {
            console.log(`✗ SQLite Database not found at ${dbPath}`);
        }

        // Check frontend files
        console.log("\n📄 Frontend Files Check:");
        const frontendPath = path.join(__dirname, "../frontend");
        const requiredFiles = [
            "index.html",
            "dashboard.html",
            "tasks.html",
            "subjects.html",
            "notifications.html",
            "games.html",
            "app-shell.js"
        ];

        requiredFiles.forEach(file => {
            const fullPath = path.join(frontendPath, file);
            if (fs.existsSync(fullPath)) {
                const size = fs.statSync(fullPath).size;
                console.log(`✓ ${file} (${(size / 1024).toFixed(1)} KB)`);
            } else {
                console.log(`✗ ${file} - MISSING`);
            }
        });

        console.log("\n✅ Implementation Complete!\n");
        process.exit(this.results.failed > 0 ? 1 : 0);
    }
}

// Run tests
const tests = new DueMateTests();
tests.runTests().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
