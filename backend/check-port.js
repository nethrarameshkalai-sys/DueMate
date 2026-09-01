#!/usr/bin/env node

const { execSync } = require("child_process");

console.log("Finding and stopping old node processes on port 5000...");

try {
    // Try to find the process using netstat (if available on Windows)
    const result = execSync("netstat -ano | find \":5000\"", { encoding: "utf-8" });
    console.log("Port 5000 is in use:");
    console.log(result);
} catch (e) {
    console.log("Could not find process on port 5000");
}

console.log("\nAttempting to start fresh server...");
console.log("Note: Make sure all old node processes are stopped first");
