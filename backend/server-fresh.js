#!/usr/bin/env node

require("dotenv").config({ path: ".env" });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const db = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:5500").split(",");

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(helmet());
app.use(express.json({ limit: "10mb" }));

// Auth functions
const JWT_SECRET = process.env.JWT_SECRET || 'duemate_secret_key_change_in_production';
function generateToken(email) {
    return jwt.sign({ email, iat: Math.floor(Date.now() / 1000) }, JWT_SECRET, { expiresIn: '7d' });
}

// Test route
app.get("/", (req, res) => {
    res.json({ success: true, message: "DueMate Backend is Running (Fresh)!" });
});

// Login route - FRESH COPY
app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and password required." });
    }

    const sql = "SELECT * FROM users WHERE email = ? LIMIT 1";
    
    db.query(sql, [email], async (error, results) => {
        if (error) {
            return res.status(500).json({ success: false, message: "Database error." });
        }

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        const user = results[0];

        try {
            const passwordMatch = await bcrypt.compare(password, user.password);

            if (!passwordMatch) {
                return res.status(401).json({ success: false, message: "Invalid email or password." });
            }

            delete user.password;

            if (!user.theme || !["light", "dark", "system"].includes(user.theme)) {
                user.theme = "system";
            }

            // Generate JWT token
            const token = generateToken(user.email);

            console.log("✅ LOGIN FRESH: Token generated:", token.substring(0, 30) + "...");

            return res.status(200).json({
                success: true,
                message: "Login successful.",
                token: token,
                user: user
            });
        } catch (verifyError) {
            console.error("Password verification error:", verifyError.message);
            return res.status(500).json({ success: false, message: "Unable to verify password." });
        }
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 Fresh DueMate server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
    console.log("\n✋ Shutting down server...");
    server.close(() => {
        console.log("Server closed");
        process.exit(0);
    });
});
