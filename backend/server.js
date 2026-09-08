// ============================================================
// DUE MATE BACKEND SERVER
// ============================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const Joi = require("joi");

const db = require("./config/db");
const { generateToken, verifyToken, verifyTokenOptional } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// MIDDLEWARE
// ============================================================

// Configure CORS for local development and production
const allowedOrigins = [
    ...(process.env.ALLOWED_ORIGINS || "")
        .split(",")
        .map(origin => origin.trim())
        .filter(Boolean),

    "http://localhost:3000",
    "http://localhost:5500",
    "http://localhost:8080",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5500",
    "http://127.0.0.1:8080"
];

app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            console.error("CORS blocked origin:", origin);
            return callback(new Error("CORS not allowed"));
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"]
    })
);

// Add Helmet for security headers
app.use(helmet());

// Rate limiting middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later."
});

const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // limit each IP to 5 login attempts per minute
    message: "Too many login attempts, please try again after a minute."
});

app.use("/api/", limiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ============================================================
// HELPER FUNCTIONS
// ============================================================

// Function to create a notification
function createNotification(userEmail, type, title, message, relatedId = null, relatedType = null) {
    const notificationId = crypto.randomBytes(8).toString("hex");
    const sql = `
        INSERT INTO notifications (id, user_email, type, title, message, related_id, related_type, read_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `;
    
    db.query(
        sql,
        [notificationId, userEmail, type, title, message, relatedId, relatedType],
        (error) => {
            if (error) {
                console.error("Create notification error:", error.message);
            }
        }
    );
}

// Function to check task reminders and create notifications
function checkTaskReminders() {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    // Get overdue tasks
    const overdueSQL = `
        SELECT user_email, id, name
        FROM tasks
        WHERE task_date < ? AND completed = 0
        GROUP BY user_email, id
    `;

    db.query(overdueSQL, [today], (error, overdueTasks) => {
        if (!error && overdueTasks && overdueTasks.length > 0) {
            overdueTasks.forEach(task => {
                createNotification(
                    task.user_email,
                    'overdue',
                    'Overdue Task',
                    `Task "${task.name}" is overdue!`,
                    task.id,
                    'task'
                );
            });
        }
    });

    // Get due today tasks
    const todaySQL = `
        SELECT user_email, id, name
        FROM tasks
        WHERE task_date = ? AND completed = 0
        GROUP BY user_email, id
    `;

    db.query(todaySQL, [today], (error, todayTasks) => {
        if (!error && todayTasks && todayTasks.length > 0) {
            todayTasks.forEach(task => {
                createNotification(
                    task.user_email,
                    'due_today',
                    'Task Due Today',
                    `Task "${task.name}" is due today!`,
                    task.id,
                    'task'
                );
            });
        }
    });

    // Get due tomorrow tasks
    const tomorrowSQL = `
        SELECT user_email, id, name
        FROM tasks
        WHERE task_date = ? AND completed = 0
        GROUP BY user_email, id
    `;

    db.query(tomorrowSQL, [tomorrow], (error, tomorrowTasks) => {
        if (!error && tomorrowTasks && tomorrowTasks.length > 0) {
            tomorrowTasks.forEach(task => {
                createNotification(
                    task.user_email,
                    'due_tomorrow',
                    'Task Due Tomorrow',
                    `Task "${task.name}" is due tomorrow!`,
                    task.id,
                    'task'
                );
            });
        }
    });
}

// Run task reminder check every hour
setInterval(checkTaskReminders, 3600000);

// ============================================================
// BASIC ERROR HANDLER FOR INVALID JSON
// ============================================================

app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        return res.status(400).json({
            success: false,
            message: "Invalid JSON data."
        });
    }

    next(err);
});

// ============================================================
// TEST ROUTE
// ============================================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "DueMate Backend is Running!"
    });
});

app.get("/test-token", (req, res) => {
    res.json({
        success: true,
        message: "Test response with token",
        token: "test-jwt-token-1234567890"
    });
});

// ============================================================
// REGISTER
// POST /api/auth/register
// ============================================================

const registrationCollegeDepartments = {
    "Government College of Technology (GCT), Coimbatore": ["Civil Engineering", "Mechanical Engineering", "Electrical and Electronics Engineering", "Electronics and Communication Engineering", "Electronics and Instrumentation Engineering", "Production Engineering", "Computer Science and Engineering", "Information Technology", "Industrial Biotechnology", "Computer Science and Engineering (Artificial Intelligence and Machine Learning)", "Artificial Intelligence and Machine Learning"],
    "Government College of Engineering, Salem": ["Civil Engineering", "Computer Science and Engineering", "Electrical and Electronics Engineering", "Electronics and Communication Engineering", "Mechanical Engineering", "Metallurgical Engineering"],
    "Government College of Engineering, Tirunelveli": ["Civil Engineering", "Mechanical Engineering", "Electrical and Electronics Engineering", "Electronics and Communication Engineering", "Computer Science and Engineering", "Electronics and Instrumentation Engineering", "Industrial Biotechnology"],
    "Government College of Engineering, Erode": ["Civil Engineering", "Mechanical Engineering", "Automobile Engineering", "Computer Science and Engineering", "Computer Science and Engineering (Data Science)", "Electronics and Communication Engineering", "Electrical and Electronics Engineering", "Information Technology"],
    "Government College of Engineering, Bargur": ["Electronics and Communication Engineering", "Electrical and Electronics Engineering", "Computer Science and Engineering", "Mechanical Engineering", "Cyber Security"],
    "Government College of Engineering, Srirangam": ["Civil Engineering", "Mechanical Engineering", "Computer Science and Engineering", "Electrical and Electronics Engineering", "Electronics and Communication Engineering", "Mechatronics Engineering"],
    "Government College of Engineering, Thanjavur": ["Civil Engineering", "Mechanical Engineering", "Electrical and Electronics Engineering", "Electronics and Communication Engineering", "Computer Science and Engineering", "Robotics and Automation Engineering"]
};

app.post("/api/auth/register", async (req, res) => {
    const {
        name,
        college,
        department,
        course,
        year,
        email,
        mobile,
        password,
        confirmPassword,
        theme,
        role = "student"
    } = req.body;

    // --------------------------------------------------------
    // REQUIRED FIELDS
    // --------------------------------------------------------

    const requestedRole = String(role).trim().toLowerCase();
    if (!['student', 'staff', 'teacher'].includes(requestedRole)) {
        return res.status(400).json({ success: false, message: "Role must be student or staff." });
    }
    const cleanRole = requestedRole === "staff" ? "teacher" : requestedRole;

    if (
        !name ||
        !college ||
        !department ||
        !email ||
        !password
    ) {
        return res.status(400).json({
            success: false,
            message: "All required registration fields are needed."
        });
    }

    // --------------------------------------------------------
    // CLEAN DATA
    // --------------------------------------------------------

    const cleanName = String(name).trim();
    const cleanCollege = String(college).trim();
    const cleanDepartment = String(department).trim();
    const cleanCourse = String(course || "").trim() || null;
    const cleanYear = String(year || "").trim() || null;
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanMobile = String(mobile || "").trim() || String(7000000000 + crypto.randomInt(2999999999));

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (cleanName.length < 2) {
        return res.status(400).json({
            success: false,
            message: "Please enter a valid full name."
        });
    }

    if (cleanCollege.length < 2) {
        return res.status(400).json({
            success: false,
            message: "Please enter your college name."
        });
    }

    if (cleanDepartment.length < 2) {
        return res.status(400).json({
            success: false,
            message: "Please enter your department."
        });
    }

    if (!Object.prototype.hasOwnProperty.call(registrationCollegeDepartments, cleanCollege)) {
        return res.status(400).json({ success: false, message: "Invalid college." });
    }

    if (!registrationCollegeDepartments[cleanCollege].includes(cleanDepartment)) {
        return res.status(400).json({ success: false, message: "Invalid college and department combination." });
    }

    if (cleanRole === "student" && !["1", "2", "3", "4", "5"].includes(cleanYear)) {
        return res.status(400).json({
            success: false,
            message: "Please select a valid year."
        });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(cleanEmail)) {
        return res.status(400).json({
            success: false,
            message: "Please enter a valid email address."
        });
    }

    if (cleanMobile && !/^\d{10}$/.test(cleanMobile)) {
        return res.status(400).json({
            success: false,
            message: "Please enter a valid 10-digit mobile number."
        });
    }

    if (String(password).length < 8) {
        return res.status(400).json({
            success: false,
            message: "Password must contain at least 8 characters."
        });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: "Password and confirm password must match." });
    }

    // --------------------------------------------------------
    // THEME
    // --------------------------------------------------------

    const selectedTheme = ["light", "dark", "system"].includes(theme)
        ? theme
        : "system";

    // --------------------------------------------------------
    // CHECK EMAIL
    // --------------------------------------------------------

    const emailCheckSql = `
        SELECT id
        FROM users
        WHERE email = ?
        LIMIT 1
    `;

    db.query(
        emailCheckSql,
        [cleanEmail],
        async (emailError, emailResults) => {
            if (emailError) {
                console.error(
                    "Email check error:",
                    emailError.message
                );

                return res.status(500).json({
                    success: false,
                    message: "Unable to create account right now."
                });
            }

            if (emailResults.length > 0) {
                return res.status(409).json({
                    success: false,
                        message: "An account with this email already exists."
                });
            }

            // ------------------------------------------------
            // CHECK MOBILE
            // ------------------------------------------------

            const mobileCheckSql = `
                SELECT id
                FROM users
                WHERE mobile = ?
                LIMIT 1
            `;

            db.query(
                mobileCheckSql,
                [cleanMobile],
                async (mobileError, mobileResults) => {
                    if (mobileError) {
                        console.error(
                            "Mobile check error:",
                            mobileError.message
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                "Unable to create account right now."
                        });
                    }

                    if (mobileResults.length > 0) {
                        return res.status(409).json({
                            success: false,
                            message:
                                "An account with this mobile number already exists."
                        });
                    }

                    try {
                        // ------------------------------------
                        // HASH PASSWORD
                        // ------------------------------------

                        const hashedPassword =
                            await bcrypt.hash(password, 10);

                        // ------------------------------------
                        // INSERT USER
                        // ------------------------------------

                        const insertSql = `
                            INSERT INTO users
                            (
                                name,
                                college,
                                department,
                                course,
                                year,
                                email,
                                mobile,
                                password,
                                theme,
                                role
                            )
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `;

                        db.query(
                            insertSql,
                            [
                                cleanName,
                                cleanCollege,
                                cleanDepartment,
                                cleanCourse,
                                cleanYear,
                                cleanEmail,
                                cleanMobile,
                                hashedPassword,
                                selectedTheme,
                                cleanRole
                            ],
                            (insertError, result) => {
                                if (insertError) {
                                    console.error(
                                        "Registration database error:",
                                        insertError.message
                                    );

                                    return res.status(500).json({
                                        success: false,
                                        message:
                                            "Unable to create account right now."
                                    });
                                }

                                return res.status(201).json({
                                    success: true,
                                    message:
                                        "Account created successfully.",
                                    user: {
                                        id: result.insertId,
                                        name: cleanName,
                                        college: cleanCollege,
                                        department: cleanDepartment,
                                        course: cleanCourse,
                                        year: cleanYear,
                                        email: cleanEmail,
                                        theme: selectedTheme,
                                        role: cleanRole,
                                        login_id: null
                                    }
                                });
                            }
                        );
                    } catch (hashError) {
                        console.error(
                            "Password hashing error:",
                            hashError.message
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                "Unable to create account right now."
                        });
                    }
                }
            );
        }
    );
});

// ============================================================
// LOGIN
// POST /api/auth/login
// NORMAL LOGIN = EMAIL + PASSWORD
// ============================================================

app.post("/api/auth/login", (req, res) => {
    const { email, password, role } = req.body;
    const identifier = String(email || "").trim().toLowerCase();
    const requestedRole = String(role || "").trim().toLowerCase();
    const accountRole = requestedRole === "staff" ? "teacher" : requestedRole;

    if (!identifier || !password || !["student", "staff", "teacher"].includes(requestedRole)) {
        return res.status(400).json({
            success: false,
            message: "Email, role and password are required."
        });
    }

    const sql = `
        SELECT
            id,
            name,
            college,
            department,
            course,
            year,
            email,
            role,
            password,
            theme
        FROM users
        WHERE email = ? AND role = ?
        LIMIT 1
    `;

    db.query(
        sql,
        [identifier, accountRole],
        async (error, results) => {
            if (error) {
                console.error(
                    "Login database error:",
                    error.message
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to process login right now."
                });
            }

            if (results.length === 0) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid email or password."
                });
            }

            const user = results[0];

            try {
                const passwordMatch = await bcrypt.compare(
                    password,
                    user.password
                );

                if (!passwordMatch) {
                    return res.status(401).json({
                        success: false,
                        message:
                            "Invalid email or password."
                    });
                }

                // Never send password to frontend.
                delete user.password;

                // Make sure theme always has a valid value.
                if (
                    !user.theme ||
                    !["light", "dark", "system"].includes(user.theme)
                ) {
                    user.theme = "system";
                }

                // Generate JWT token
                const token = generateToken(user.email);

                console.log("🔐 Login DEBUG: Token generated:", token ? "YES" : "NO", "Token length:", token ? token.length : 0);

                return res.status(200).json({
                    success: true,
                    message: "Login successful.",
                    token: token,
                    user: user
                });
            } catch (verifyError) {
                console.error(
                    "Password verification error:",
                    verifyError.message
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to verify password."
                });
            }
        }
    );
});

// ============================================================
// GET PROFILE
// GET /api/user/profile
// ============================================================

app.get("/api/user/profile", verifyToken, (req, res) => {
    const email = req.user.email;

    const sql = `
        SELECT
            id,
            name,
            college,
            department,
            course,
            year,
            email,
            theme,
            student_id,
            semester
        FROM users
        WHERE email = ?
        LIMIT 1
    `;

    db.query(
        sql,
        [email],
        (error, results) => {
            if (error) {
                console.error(
                    "Get profile database error:",
                    error.message
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to load profile right now."
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "User account not found."
                });
            }

            const user = results[0];

            if (
                !user.theme ||
                !["light", "dark", "system"].includes(user.theme)
            ) {
                user.theme = "system";
            }

            return res.status(200).json({
                success: true,
                message:
                    "Profile loaded successfully.",
                user: user
            });
        }
    );
});

// ============================================================
// UPDATE PROFILE
// PUT /api/user/profile
// ============================================================

app.put("/api/user/profile", verifyToken, (req, res) => {
    const authenticatedEmail = req.user.email;
    const {
        email,
        name,
        mobile,
        college,
        department,
        course,
        year
    } = req.body;

    if (!name) {
        return res.status(400).json({
            success: false,
            message:
                "Full name is required."
        });
    }

    const cleanName = String(name).trim();
    const cleanMobile = mobile ? String(mobile).trim() : "";
    const cleanCollege = college ? String(college).trim() : "";
    const cleanDepartment =
        department ? String(department).trim() : "";
    const cleanCourse = course ? String(course).trim() : "";
    const cleanYear = year ? String(year).trim() : "";

    if (cleanName.length < 2) {
        return res.status(400).json({
            success: false,
            message:
                "Please enter a valid full name."
        });
    }

    if (
        cleanMobile &&
        !/^\d{10}$/.test(cleanMobile)
    ) {
        return res.status(400).json({
            success: false,
            message:
                "Please enter a valid 10-digit mobile number."
        });
    }

    if (
        cleanYear &&
        !["1", "2", "3", "4"].includes(cleanYear)
    ) {
        return res.status(400).json({
            success: false,
            message:
                "Please select a valid year."
        });
    }

    const sql = `
        UPDATE users
        SET
            name = ?,
            mobile = ?,
            college = ?,
            department = ?,
            course = ?,
            year = ?
        WHERE email = ?
        LIMIT 1
    `;

    db.query(
        sql,
        [
            cleanName,
            cleanMobile,
            cleanCollege,
            cleanDepartment,
            cleanCourse,
            cleanYear,
            authenticatedEmail
        ],
        (error, result) => {
            if (error) {
                console.error(
                    "Profile update database error:",
                    error.message
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to save profile right now."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "User account not found."
                });
            }

            return res.status(200).json({
                success: true,
                message:
                    "Profile updated successfully.",
                user: {
                    name: cleanName,
                    college: cleanCollege,
                    department: cleanDepartment,
                    course: cleanCourse,
                    year: cleanYear,
                    email: authenticatedEmail,
                    mobile: cleanMobile
                }
            });
        }
    );
});

// ============================================================
// UPDATE THEME
// POST /api/user/theme
// ============================================================

app.post("/api/user/theme", verifyToken, (req, res) => {
    const email = req.user.email;
    const {
        theme
    } = req.body;

    if (!theme) {
        return res.status(400).json({
            success: false,
            message:
                "Theme is required."
        });
    }

    const allowedThemes = [
        "light",
        "dark",
        "system"
    ];

    if (!allowedThemes.includes(theme)) {
        return res.status(400).json({
            success: false,
            message:
                "Invalid theme selected."
        });
    }

    const sql = `
        UPDATE users
        SET theme = ?
        WHERE email = ?
        LIMIT 1
    `;

    db.query(
        sql,
        [
            theme,
            email
        ],
        (error, result) => {
            if (error) {
                console.error(
                    "Theme update database error:",
                    error.message
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to save theme right now."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "User account not found."
                });
            }

            return res.status(200).json({
                success: true,
                message:
                    "Theme saved successfully.",
                theme: theme
            });
        }
    );
});

// ============================================================
// CHANGE PASSWORD
// POST /api/user/change-password
// ============================================================

app.post(
    "/api/user/change-password",
    verifyToken,
    async (req, res) => {
        const email = req.user.email;
        const {
            currentPassword,
            newPassword
        } = req.body;

        if (
            !currentPassword ||
            !newPassword
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Current password and new password are required."
            });
        }

        if (String(newPassword).length < 8) {
            return res.status(400).json({
                success: false,
                message:
                    "New password must contain at least 8 characters."
            });
        }

        const findUserSql = `
            SELECT
                id,
                password
            FROM users
            WHERE email = ?
            LIMIT 1
        `;

        db.query(
            findUserSql,
            [email],
            async (error, results) => {
                if (error) {
                    console.error(
                        "Change password database error:",
                        error.message
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to change password right now."
                    });
                }

                if (results.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message:
                            "User account not found."
                    });
                }

                const user = results[0];

                try {
                    const passwordMatch =
                        await bcrypt.compare(
                            currentPassword,
                            user.password
                        );

                    if (!passwordMatch) {
                        return res.status(401).json({
                            success: false,
                            message:
                                "Current password is incorrect."
                        });
                    }

                    const hashedPassword =
                        await bcrypt.hash(
                            newPassword,
                            10
                        );

                    const updateSql = `
                        UPDATE users
                        SET password = ?
                        WHERE id = ?
                        LIMIT 1
                    `;

                    db.query(
                        updateSql,
                        [
                            hashedPassword,
                            user.id
                        ],
                        (updateError, result) => {
                            if (updateError) {
                                console.error(
                                    "Password update error:",
                                    updateError.message
                                );

                                return res.status(500).json({
                                    success: false,
                                    message:
                                        "Unable to change password right now."
                                });
                            }

                            if (result.affectedRows === 0) {
                                return res.status(404).json({
                                    success: false,
                                    message:
                                        "User account not found."
                                });
                            }

                            return res.status(200).json({
                                success: true,
                                message:
                                    "Password changed successfully."
                            });
                        }
                    );
                } catch (passwordError) {
                    console.error(
                        "Password processing error:",
                        passwordError.message
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to change password right now."
                    });
                }
            }
        );
    }
);

// ============================================================
// FORGOT PASSWORD
// DEVELOPMENT RESET-LINK FLOW
// POST /api/auth/forgot-password
// ============================================================

app.post(
    "/api/auth/forgot-password",
    (req, res) => {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message:
                    "Email address is required."
            });
        }

        const cleanEmail = String(email).trim().toLowerCase();

        const sql = `
            SELECT
                id,
                name,
                email
            FROM users
            WHERE email = ?
            LIMIT 1
        `;

        db.query(
            sql,
            [cleanEmail],
            (error, results) => {
                if (error) {
                    console.error(
                        "Forgot password database error:",
                        error.message
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to process your request right now."
                    });
                }

                if (results.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message:
                            "No account was found with this email address."
                    });
                }

                const user = results[0];

                const resetToken =
                    crypto.randomBytes(32).toString("hex");

                const expiry =
                    new Date(
                        Date.now() + 15 * 60 * 1000
                    );

                const updateSql = `
                    UPDATE users
                    SET
                        reset_token = ?,
                        reset_token_expiry = ?
                    WHERE id = ?
                    LIMIT 1
                `;

                db.query(
                    updateSql,
                    [
                        resetToken,
                        expiry,
                        user.id
                    ],
                    (updateError) => {
                        if (updateError) {
                            console.error(
                                "Reset token database error:",
                                updateError.message
                            );

                            return res.status(500).json({
                                success: false,
                                message:
                                    "Unable to create password reset request."
                            });
                        }

                        // ------------------------------------
                        // PASSWORD RESET LINK
                        // ------------------------------------

                        const frontendURL = process.env.FRONTEND_URL || "http://localhost:5500";
                        const resetLink =
                            `${frontendURL}/forgot-password.html?token=${encodeURIComponent(resetToken)}`;

                        console.log(
                            "Password reset link:",
                            resetLink
                        );

                        return res.status(200).json({
                            success: true,
                            message:
                                "Password reset link generated successfully.",
                            resetLink: resetLink
                        });
                    }
                );
            }
        );
    }
);

// ============================================================
// RESET PASSWORD
// POST /api/auth/reset-password
// ============================================================

app.post(
    "/api/auth/reset-password",
    async (req, res) => {
        const {
            token,
            newPassword
        } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message:
                    "Reset token and new password are required."
            });
        }

        if (String(newPassword).length < 8) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must contain at least 8 characters."
            });
        }

        const sql = `
            SELECT
                id,
                email,
                reset_token_expiry
            FROM users
            WHERE reset_token = ?
            LIMIT 1
        `;

        db.query(
            sql,
            [token],
            async (error, results) => {
                if (error) {
                    console.error(
                        "Reset password database error:",
                        error.message
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to reset password right now."
                    });
                }

                if (results.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Invalid or expired password reset link."
                    });
                }

                const user = results[0];

                // --------------------------------------------
                // CHECK TOKEN EXPIRY
                // --------------------------------------------

                if (
                    !user.reset_token_expiry ||
                    new Date(user.reset_token_expiry).getTime() <
                        Date.now()
                ) {
                    const clearSql = `
                        UPDATE users
                        SET
                            reset_token = NULL,
                            reset_token_expiry = NULL
                        WHERE id = ?
                        LIMIT 1
                    `;

                    db.query(
                        clearSql,
                        [user.id],
                        (clearError) => {
                            if (clearError) {
                                console.error(
                                    "Clear expired token error:",
                                    clearError.message
                                );
                            }
                        }
                    );

                    return res.status(400).json({
                        success: false,
                        message:
                            "This password reset link has expired. Please request a new one."
                    });
                }

                try {
                    // ----------------------------------------
                    // HASH NEW PASSWORD
                    // ----------------------------------------

                    const hashedPassword =
                        await bcrypt.hash(
                            newPassword,
                            10
                        );

                    // ----------------------------------------
                    // UPDATE PASSWORD
                    // ----------------------------------------

                    const updateSql = `
                        UPDATE users
                        SET
                            password = ?,
                            reset_token = NULL,
                            reset_token_expiry = NULL
                        WHERE id = ?
                        LIMIT 1
                    `;

                    db.query(
                        updateSql,
                        [
                            hashedPassword,
                            user.id
                        ],
                        (updateError, result) => {
                            if (updateError) {
                                console.error(
                                    "Password update error:",
                                    updateError.message
                                );

                                return res.status(500).json({
                                    success: false,
                                    message:
                                        "Unable to update password right now."
                                });
                            }

                            if (result.affectedRows === 0) {
                                return res.status(404).json({
                                    success: false,
                                    message:
                                        "User account not found."
                                });
                            }

                            return res.status(200).json({
                                success: true,
                                message:
                                    "Password reset successfully. You can now login with your new password."
                            });
                        }
                    );
                } catch (hashError) {
                    console.error(
                        "Password hashing error:",
                        hashError.message
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Unable to reset password right now."
                    });
                }
            }
        );
    }
);

// ============================================================
// GROUPS
// ============================================================

app.get("/api/groups/by-code", verifyToken, (req, res) => {
    const joinCode = String(req.query.join_code || "").trim().toUpperCase();
    if (!joinCode) return res.status(400).json({ success: false, message: "Join code is required." });
    db.query("SELECT id, name, purpose, maximum_members FROM `groups` WHERE join_code = ? LIMIT 1", [joinCode], (error, groups) => {
        if (error) return res.status(500).json({ success: false, message: "Unable to find group right now." });
        if (!groups.length) return res.status(404).json({ success: false, message: "This group link is invalid." });
        res.json({ success: true, group: groups[0] });
    });
});

app.get("/api/groups", verifyToken, (req, res) => {
    const userEmail = req.user.email;

    const sql = `
        SELECT g.id, g.owner_email, g.name, g.purpose,
               g.minimum_members, g.maximum_members, g.join_code,
               COUNT(m2.user_email) AS member_count,
               m.role
        FROM \`groups\` g
        INNER JOIN group_members m ON m.group_id = g.id AND m.user_email = ?
        LEFT JOIN group_members m2 ON m2.group_id = g.id
        GROUP BY g.id, g.owner_email, g.name, g.purpose,
                 g.minimum_members, g.maximum_members, g.join_code, m.role
        ORDER BY g.created_at DESC
    `;

    db.query(sql, [userEmail], (error, groups) => {
        if (error) {
            console.error("Get groups database error:", error.message);
            return res.status(500).json({ success: false, message: "Unable to load groups right now." });
        }
        return res.json({ success: true, groups });
    });
});

app.post("/api/groups", verifyToken, (req, res) => {
    const ownerEmail = req.user.email;
    const name = String(req.body.name || "").trim();
    const purpose = String(req.body.purpose || "").trim();
    const minimumMembers = Number(req.body.minimum_members);
    const maximumMembers = Number(req.body.maximum_members);

    if (!name || !purpose || !Number.isInteger(minimumMembers) || !Number.isInteger(maximumMembers) || minimumMembers < 1 || maximumMembers < minimumMembers) {
        return res.status(400).json({ success: false, message: "Valid group details are required." });
    }

    const groupId = crypto.randomUUID();
    const joinCode = crypto.randomBytes(5).toString("hex").toUpperCase();
    const insertGroup = `INSERT INTO \`groups\` (id, owner_email, name, purpose, minimum_members, maximum_members, join_code) VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.query(insertGroup, [groupId, ownerEmail, name, purpose, minimumMembers, maximumMembers, joinCode], (error) => {
        if (error) {
            console.error("Create group database error:", error.message);
            return res.status(500).json({ success: false, message: "Unable to create group right now." });
        }

        db.query("INSERT INTO group_members (group_id, user_email, role) VALUES (?, ?, 'owner')", [groupId, ownerEmail], (memberError) => {
            if (memberError) {
                console.error("Create group membership error:", memberError.message);
                return res.status(500).json({ success: false, message: "Group was created, but membership could not be saved." });
            }
            return res.status(201).json({ success: true, group: { id: groupId, owner_email: ownerEmail, name, purpose, minimum_members: minimumMembers, maximum_members: maximumMembers, join_code: joinCode, member_count: 1, role: "owner" } });
        });
    });
});

app.put("/api/groups/:id", verifyToken, (req, res) => {
    const groupId = String(req.params.id || "").trim();
    const ownerEmail = req.user.email;
    const name = String(req.body.name || "").trim();
    const purpose = String(req.body.purpose || "").trim();
    const minimumMembers = Number(req.body.minimum_members);
    const maximumMembers = Number(req.body.maximum_members);

    if (!groupId || !name || !purpose || maximumMembers < minimumMembers) {
        return res.status(400).json({ success: false, message: "Valid group details are required." });
    }

    const sql = `UPDATE \`groups\` SET name = ?, purpose = ?, minimum_members = ?, maximum_members = ? WHERE id = ? AND owner_email = ?`;
    db.query(sql, [name, purpose, minimumMembers, maximumMembers, groupId, ownerEmail], (error, result) => {
        if (error) {
            console.error("Update group database error:", error.message);
            return res.status(500).json({ success: false, message: "Unable to update group right now." });
        }
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Group not found or not owned by you." });
        return res.json({ success: true, message: "Group updated successfully." });
    });
});

app.post("/api/groups/join", verifyToken, (req, res) => {
    const userEmail = req.user.email;
    const joinCode = String(req.body.join_code || "").trim().toUpperCase();

    if (!joinCode) return res.status(400).json({ success: false, message: "Join code is required." });

    db.query("SELECT id, name, maximum_members FROM `groups` WHERE join_code = ? LIMIT 1", [joinCode], (error, groups) => {
        if (error) return res.status(500).json({ success: false, message: "Unable to find group right now." });
        if (!groups.length) return res.status(404).json({ success: false, message: "This group link is invalid." });

        const group = groups[0];
        db.query("SELECT COUNT(*) AS member_count FROM group_members WHERE group_id = ?", [group.id], (countError, counts) => {
            if (countError) return res.status(500).json({ success: false, message: "Unable to check group capacity." });
            if (Number(counts[0].member_count) >= group.maximum_members) return res.status(409).json({ success: false, message: "This group is full." });

            db.query("INSERT IGNORE INTO group_members (group_id, user_email, role) VALUES (?, ?, 'member')", [group.id, userEmail], (joinError, result) => {
                if (joinError) return res.status(500).json({ success: false, message: "Unable to join group right now." });
                return res.status(result.affectedRows ? 201 : 200).json({ success: true, message: result.affectedRows ? "You joined the group." : "You are already a member of this group." });
            });
        });
    });
});

app.post("/api/groups/:id/join-request", verifyToken, (req, res) => {
    const groupId = String(req.params.id || "").trim();
    const userEmail = req.user.email;
    if (!groupId) return res.status(400).json({ success: false, message: "Group is required." });

    db.query("SELECT maximum_members FROM `groups` WHERE id = ? LIMIT 1", [groupId], (error, groups) => {
        if (error) return res.status(500).json({ success: false, message: "Unable to find group." });
        if (!groups.length) return res.status(404).json({ success: false, message: "Group not found." });
        db.query("SELECT COUNT(*) AS member_count FROM group_members WHERE group_id = ?", [groupId], (countError, counts) => {
            if (countError) return res.status(500).json({ success: false, message: "Unable to check group capacity." });
            if (Number(counts[0].member_count) >= groups[0].maximum_members) return res.status(409).json({ success: false, message: "This group is full." });
            const requestId = crypto.randomUUID();
            db.query("INSERT INTO group_join_requests (id, group_id, user_email) VALUES (?, ?, ?)", [requestId, groupId, userEmail], (requestError) => {
                if (requestError && requestError.code === "ER_DUP_ENTRY") return res.status(409).json({ success: false, message: "Join request already submitted." });
                if (requestError) return res.status(500).json({ success: false, message: "Unable to submit join request." });
                return res.status(201).json({ success: true, message: "Join request submitted." });
            });
        });
    });
});

app.get("/api/groups/my-requests", verifyToken, (req, res) => {
    const userEmail = req.user.email;
    const sql = `SELECT r.id, r.group_id, r.status, r.created_at, g.name AS group_name FROM group_join_requests r INNER JOIN \`groups\` g ON g.id = r.group_id WHERE r.user_email = ? ORDER BY r.created_at DESC`;
    db.query(sql, [userEmail], (error, requests) => {
        if (error) return res.status(500).json({ success: false, message: "Unable to load your requests." });
        return res.json({ success: true, requests });
    });
});

app.get("/api/groups/requests", verifyToken, (req, res) => {
    const ownerEmail = req.user.email;
    const sql = `SELECT r.id, r.group_id, r.user_email, r.created_at, g.name AS group_name FROM group_join_requests r INNER JOIN \`groups\` g ON g.id = r.group_id WHERE g.owner_email = ? AND r.status = 'pending' ORDER BY r.created_at DESC`;
    db.query(sql, [ownerEmail], (error, requests) => {
        if (error) return res.status(500).json({ success: false, message: "Unable to load join requests." });
        return res.json({ success: true, requests });
    });
});

app.patch("/api/groups/requests/:id", verifyToken, (req, res) => {
    const requestId = String(req.params.id || "").trim();
    const ownerEmail = req.user.email;
    const action = req.body.action === "approve" ? "approve" : "reject";
    const sql = `SELECT r.group_id, r.user_email, g.maximum_members FROM group_join_requests r INNER JOIN \`groups\` g ON g.id = r.group_id WHERE r.id = ? AND g.owner_email = ? AND r.status = 'pending' LIMIT 1`;
    db.query(sql, [requestId, ownerEmail], (error, requests) => {
        if (error) return res.status(500).json({ success: false, message: "Unable to process request." });
        if (!requests.length) return res.status(404).json({ success: false, message: "Request not found or permission denied." });
        const request = requests[0];
        if (action === "approve") {
            db.query("SELECT COUNT(*) AS member_count FROM group_members WHERE group_id = ?", [request.group_id], (countError, counts) => {
                if (countError) return res.status(500).json({ success: false, message: "Unable to check group capacity." });
                if (Number(counts[0].member_count) >= request.maximum_members) return res.status(409).json({ success: false, message: "This group is full." });
                db.query("INSERT IGNORE INTO group_members (group_id, user_email, role) VALUES (?, ?, 'member')", [request.group_id, request.user_email], (joinError) => {
                    if (joinError) return res.status(500).json({ success: false, message: "Unable to approve request." });
                    db.query("UPDATE group_join_requests SET status = 'approved' WHERE id = ?", [requestId], () => res.json({ success: true, message: "Member approved." }));
                });
            });
            return;
        }
        db.query("UPDATE group_join_requests SET status = 'rejected' WHERE id = ?", [requestId], () => res.json({ success: true, message: "Request rejected." }));
    });
});

app.get("/api/groups/:id/workspace", verifyToken, (req, res) => {
    const groupId = String(req.params.id || "").trim();
    const userEmail = req.user.email;
    const accessSql = `SELECT g.*, m.role FROM \`groups\` g INNER JOIN group_members m ON m.group_id = g.id AND m.user_email = ? WHERE g.id = ? LIMIT 1`;
    db.query(accessSql, [userEmail, groupId], (error, groups) => {
        if (error) return res.status(500).json({ success: false, message: "Unable to load group workspace." });
        if (!groups.length) return res.status(403).json({ success: false, message: "Group access required." });
        const group = groups[0];
        const queries = [
            ["members", "SELECT u.name, u.email, m.role, m.joined_at FROM group_members m LEFT JOIN users u ON u.email = m.user_email WHERE m.group_id = ? ORDER BY m.role DESC, m.joined_at ASC"],
            ["rules", "SELECT rules FROM group_rules WHERE group_id = ? LIMIT 1"],
            ["challenges", "SELECT id, title, description, points, start_date, end_date FROM group_challenges WHERE group_id = ? AND end_date >= CURRENT_DATE ORDER BY end_date ASC"],
            ["leaderboard", "SELECT r.user_email, COALESCE(u.name, r.user_email) AS name, SUM(r.points) AS points, COUNT(*) AS games_played FROM group_game_results r LEFT JOIN users u ON u.email = r.user_email WHERE r.group_id = ? GROUP BY r.user_email, u.name ORDER BY points DESC, r.user_email ASC"]
        ];
        let result = { group, members: [], rules: "", challenges: [], leaderboard: [] };
        let pending = queries.length;
        queries.forEach(([key, sql]) => db.query(sql, [groupId], (queryError, rows) => {
            if (!queryError) result[key] = key === "rules" ? (rows[0] ? rows[0].rules : "") : rows;
            pending -= 1;
            if (!pending) res.json({ success: true, workspace: result });
        }));
    });
});

app.put("/api/groups/:id/rules", verifyToken, (req, res) => {
    const groupId = String(req.params.id || "").trim();
    const ownerEmail = req.user.email;
    const rules = String(req.body.rules || "").trim();
    const sql = `INSERT INTO group_rules (group_id, rules) SELECT ?, ? FROM DUAL WHERE EXISTS (SELECT 1 FROM \`groups\` WHERE id = ? AND owner_email = ?) ON DUPLICATE KEY UPDATE rules = VALUES(rules)`;
    db.query(sql, [groupId, rules, groupId, ownerEmail], (error, result) => {
        if (error) return res.status(500).json({ success: false, message: "Unable to save group rules." });
        if (!result.affectedRows) return res.status(403).json({ success: false, message: "Admin access required." });
        res.json({ success: true, message: "Group rules saved." });
    });
});

app.post("/api/groups/:id/challenges", verifyToken, (req, res) => {
    const groupId = String(req.params.id || "").trim();
    const creator = req.user.email;
    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim();
    const points = Math.max(0, Math.min(10000, Number(req.body.points) || 0));
    const startDate = req.body.start_date;
    const endDate = req.body.end_date;
    const sql = `INSERT INTO group_challenges (id, group_id, created_by, title, description, points, start_date, end_date) SELECT ?, ?, ?, ?, ?, ?, ?, ? FROM DUAL WHERE EXISTS (SELECT 1 FROM \`groups\` WHERE id = ? AND owner_email = ?)`;
    db.query(sql, [crypto.randomUUID(), groupId, creator, title, description, points, startDate, endDate, groupId, creator], (error, result) => {
        if (error) return res.status(500).json({ success: false, message: "Unable to create challenge." });
        if (!result.affectedRows) return res.status(403).json({ success: false, message: "Admin access required." });
        res.status(201).json({ success: true, message: "Challenge created." });
    });
});

app.post("/api/groups/:id/game-results", verifyToken, (req, res) => {
    const groupId = String(req.params.id || "").trim();
    const userEmail = req.user.email;
    const gameName = String(req.body.game_name || "").trim().slice(0, 100);
    const score = Math.max(0, Math.min(100000, Number(req.body.score) || 0));
    const points = Math.min(100, Math.floor(score / 10));
    const accessSql = "SELECT 1 FROM group_members WHERE group_id = ? AND user_email = ? LIMIT 1";
    db.query(accessSql, [groupId, userEmail], (accessError, access) => {
        if (accessError) return res.status(500).json({ success: false, message: "Unable to save game result." });
        if (!access.length) return res.status(403).json({ success: false, message: "Group membership required." });
        db.query("INSERT INTO group_game_results (id, group_id, user_email, game_name, score, points) VALUES (?, ?, ?, ?, ?, ?)", [crypto.randomUUID(), groupId, userEmail, gameName || "Study game", score, points], (error) => {
            if (error) return res.status(500).json({ success: false, message: "Unable to save game result." });
            res.status(201).json({ success: true, points });
        });
    });
});

app.delete("/api/groups/:id/members/:memberEmail", verifyToken, (req, res) => {
    const groupId = String(req.params.id || "").trim();
    const requester = req.user.email;
    const memberEmail = String(req.params.memberEmail || "").trim().toLowerCase();
    const sql = `SELECT role FROM group_members WHERE group_id = ? AND user_email = ? LIMIT 1`;
    db.query(sql, [groupId, requester], (error, rows) => {
        if (error) return res.status(500).json({ success: false, message: "Unable to update membership." });
        if (!rows.length) return res.status(403).json({ success: false, message: "Group membership required." });
        if (requester === memberEmail && rows[0].role === "owner") return res.status(409).json({ success: false, message: "Transfer ownership or delete the group before leaving." });
        if (requester !== memberEmail && rows[0].role !== "owner") return res.status(403).json({ success: false, message: "Admin access required." });
        db.query("DELETE FROM group_members WHERE group_id = ? AND user_email = ?", [groupId, memberEmail], (deleteError, result) => {
            if (deleteError) return res.status(500).json({ success: false, message: "Unable to update membership." });
            if (!result.affectedRows) return res.status(404).json({ success: false, message: "Member not found." });
            return res.json({ success: true, message: requester === memberEmail ? "You left the group." : "Member removed." });
        });
    });
});

app.delete("/api/groups/:id", verifyToken, (req, res) => {
    const groupId = String(req.params.id || "").trim();
    const userEmail = req.user.email;

    db.query("DELETE FROM `groups` WHERE id = ? AND owner_email = ?", [groupId, userEmail], (error, result) => {
        if (error) return res.status(500).json({ success: false, message: "Unable to delete group right now." });
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Only the group owner can delete this group." });
        return res.json({ success: true, message: "Group deleted successfully." });
    });
});

// ============================================================
// GROUP TASKS ENDPOINTS
// ============================================================

// POST /api/groups/:groupId/tasks - Add task to group
app.post("/api/groups/:groupId/tasks", verifyToken, (req, res) => {
    const groupId = String(req.params.groupId || "").trim();
    const userEmail = req.user.email;
    const { name, subject, date, priority, description } = req.body;

    if (!name || !String(name).trim()) {
        return res.status(400).json({ success: false, message: "Task name is required." });
    }

    if (!date) {
        return res.status(400).json({ success: false, message: "Task date is required." });
    }

    // Verify user is group member
    const memberCheckSQL = `SELECT 1 FROM group_members WHERE group_id = ? AND user_email = ? LIMIT 1`;
    db.query(memberCheckSQL, [groupId, userEmail], (error, results) => {
        if (error || results.length === 0) {
            return res.status(403).json({ success: false, message: "Access denied. You must be a group member." });
        }

        const taskId = crypto.randomUUID();
        const cleanName = String(name).trim();
        const cleanSubject = subject ? String(subject).trim() : null;
        const cleanDescription = description ? String(description).trim() : null;
        const cleanPriority = ["low", "medium", "high"].includes(priority) ? priority : "medium";

        const sql = `
            INSERT INTO tasks (id, user_email, name, subject, task_date, priority, description, group_id, completed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
        `;

        db.query(sql, [taskId, userEmail, cleanName, cleanSubject, date, cleanPriority, cleanDescription, groupId], (error) => {
            if (error) {
                console.error("Add group task error:", error.message);
                return res.status(500).json({ success: false, message: "Unable to add task to group." });
            }

            return res.status(201).json({
                success: true,
                message: "Task added to group successfully.",
                task: { id: taskId, name: cleanName, date, priority: cleanPriority, groupId }
            });
        });
    });
});

// GET /api/groups/:groupId/tasks - Get all tasks for a group
app.get("/api/groups/:groupId/tasks", verifyToken, (req, res) => {
    const groupId = String(req.params.groupId || "").trim();
    const userEmail = req.user.email;

    // Verify user is group member
    const memberCheckSQL = `SELECT 1 FROM group_members WHERE group_id = ? AND user_email = ? LIMIT 1`;
    db.query(memberCheckSQL, [groupId, userEmail], (error, results) => {
        if (error || results.length === 0) {
            return res.status(403).json({ success: false, message: "Access denied." });
        }

        const sql = `
            SELECT id, user_email, name, subject, task_date, priority, description, completed, created_at
            FROM tasks
            WHERE group_id = ?
            ORDER BY task_date ASC
        `;

        db.query(sql, [groupId], (error, tasks) => {
            if (error) {
                console.error("Get group tasks error:", error.message);
                return res.status(500).json({ success: false, message: "Unable to fetch group tasks." });
            }

            return res.json({ success: true, tasks: tasks || [] });
        });
    });
});

// ============================================================
// TASKS
// NO TIME FIELD
// ============================================================

// ============================================================
// GET ALL TASKS
// GET /api/tasks
// ============================================================

app.get("/api/tasks", verifyToken, (req, res) => {
    const userEmail = req.user.email;

   const sql = `
    SELECT
        id,
        user_email,
        name,
        subject,
        task_date,
        priority,
        description,
        completed,
        created_at
    FROM tasks
    WHERE user_email = ?
    ORDER BY
        task_date ASC,
        id DESC
`;

    db.query(
        sql,
        [userEmail],
        (error, results) => {
            if (error) {
                console.error(
                    "Get tasks database error:",
                    error.message
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to load tasks right now."
                });
            }

            return res.status(200).json({
                success: true,
                message:
                    "Tasks loaded successfully.",
                tasks: (results || []).map(task => ({
    ...task,
    group_id: task.group_id ?? null,
    group_name: task.group_name ?? null,
    updated_at: task.updated_at ?? task.created_at ?? null
}))
            });
        }
    );
});

// ============================================================
// ADD TASK
// POST /api/tasks
// ============================================================

app.post("/api/tasks", verifyToken, (req, res) => {
    const {
        name,
        subject,
        date,
        priority,
        description,
        completed
    } = req.body;

    const user_email = req.user.email;

    if (!name || !String(name).trim()) {
        return res.status(400).json({
            success: false,
            message:
                "Task name is required."
        });
    }

    if (!date) {
        return res.status(400).json({
            success: false,
            message:
                "Task date is required."
        });
    }

    const cleanName =
        String(name).trim();

    const cleanSubject =
        subject
            ? String(subject).trim()
            : null;

    const cleanDescription =
        description
            ? String(description).trim()
            : null;

    const cleanPriority =
        ["low", "medium", "high"].includes(priority)
            ? priority
            : "medium";

    const taskId =
        crypto.randomUUID();

    const sql = `
        INSERT INTO tasks
        (
            id,
            user_email,
            name,
            subject,
            task_date,
            priority,
            description,
            completed
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `;

    db.query(
        sql,
        [
            taskId,
            user_email,
            cleanName,
            cleanSubject,
            date,
            cleanPriority,
            cleanDescription
        ],
        (error) => {
            if (error) {
                console.error(
                    "Add task database error:",
                    error.message
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to add task right now."
                });
            }

            const getTaskSql = `
                SELECT
                    id,
                    user_email,
                    name,
                    subject,
                    task_date,
                    priority,
                    description,
                    completed,
                    created_at,
                    updated_at
                FROM tasks
                WHERE id = ?
                  AND user_email = ?
                LIMIT 1
            `;

            db.query(
                getTaskSql,
                [
                    taskId,
                    cleanEmail
                ],
                (getError, results) => {
                    if (getError) {
                        console.error(
                            "Get created task error:",
                            getError.message
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                "Task was created, but could not be loaded."
                        });
                    }

                    return res.status(201).json({
                        success: true,
                        message:
                            "Task added successfully.",
                        task: results[0]
                    });
                }
            );
        }
    );
});

// ============================================================
// UPDATE TASK
// PUT /api/tasks/:id
// ============================================================

app.put("/api/tasks/:id", verifyToken, (req, res) => {
    const taskId =
        String(req.params.id).trim();

    const {
        name,
        subject,
        date,
        priority,
        description,
        completed
    } = req.body;

    const user_email = req.user.email;

    if (!taskId) {
        return res.status(400).json({
            success: false,
            message:
                "Invalid task ID."
        });
    }

    if (!name || !String(name).trim()) {
        return res.status(400).json({
            success: false,
            message:
                "Task name is required."
        });
    }

    if (!date) {
        return res.status(400).json({
            success: false,
            message:
                "Task date is required."
        });
    }

    const cleanName =
        String(name).trim();

    const cleanSubject =
        subject
            ? String(subject).trim()
            : null;

    const cleanDescription =
        description
            ? String(description).trim()
            : null;

    const cleanPriority =
        ["low", "medium", "high"].includes(priority)
            ? priority
            : "medium";

    const sql = `
        UPDATE tasks
        SET
            name = ?,
            subject = ?,
            task_date = ?,
            priority = ?,
            description = ?,
            completed = COALESCE(?, completed)
        WHERE id = ?
          AND user_email = ?
        LIMIT 1
    `;

    db.query(
        sql,
        [
            cleanName,
            cleanSubject,
            date,
            cleanPriority,
            cleanDescription,
            completed === undefined
                ? null
                : Number(completed) === 1
                    ? 1
                    : 0,
            taskId,
            user_email
        ],
        (error, result) => {
            if (error) {
                console.error(
                    "Update task database error:",
                    error.message
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to update task right now."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Task not found."
                });
            }

            const getTaskSql = `
                SELECT
                    id,
                    user_email,
                    name,
                    subject,
                    task_date,
                    priority,
                    description,
                    completed,
                    created_at,
                    updated_at
                FROM tasks
                WHERE id = ?
                  AND user_email = ?
                LIMIT 1
            `;

            db.query(
                getTaskSql,
                [
                    taskId,
                    user_email
                ],
                (getError, results) => {
                    if (getError) {
                        console.error(
                            "Get updated task error:",
                            getError.message
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                "Task updated, but could not be loaded."
                        });
                    }

                    return res.status(200).json({
                        success: true,
                        message:
                            "Task updated successfully.",
                        task: results[0]
                    });
                }
            );
        }
    );
});

// ============================================================
// TOGGLE TASK
// PATCH /api/tasks/:id/toggle
// ============================================================

app.patch("/api/tasks/:id/toggle", verifyToken, (req, res) => {
    const taskId =
        String(req.params.id).trim();

    const userEmail = req.user.email;

    if (!taskId) {
        return res.status(400).json({
            success: false,
            message:
                "Invalid task ID."
        });
    }

    const findSql = `
        SELECT
            id,
            completed
        FROM tasks
        WHERE id = ?
          AND user_email = ?
        LIMIT 1
    `;

    db.query(
        findSql,
        [
            taskId,
            userEmail
        ],
        (error, results) => {
            if (error) {
                console.error(
                    "Find task toggle error:",
                    error.message
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to update task status."
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Task not found."
                });
            }

            const newCompleted =
                results[0].completed ? 0 : 1;

            const updateSql = `
                UPDATE tasks
                SET completed = ?
                WHERE id = ?
                  AND user_email = ?
                LIMIT 1
            `;

            db.query(
                updateSql,
                [
                    newCompleted,
                    taskId,
                    userEmail
                ],
                (updateError, updateResult) => {
                    if (updateError) {
                        console.error(
                            "Toggle task database error:",
                            updateError.message
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                "Unable to update task status."
                        });
                    }

                    if (updateResult.affectedRows === 0) {
                        return res.status(404).json({
                            success: false,
                            message:
                                "Task not found."
                        });
                    }

                    return res.status(200).json({
                        success: true,
                        message:
                            "Task status updated successfully.",
                        completed:
                            newCompleted
                    });
                }
            );
        }
    );
});

// ============================================================
// DELETE TASK
// DELETE /api/tasks/:id
// ============================================================

app.delete("/api/tasks/:id", verifyToken, (req, res) => {
    const taskId =
        String(req.params.id).trim();

    const userEmail = req.user.email;

    if (!taskId) {
        return res.status(400).json({
            success: false,
            message:
                "Invalid task ID."
        });
    }

    const sql = `
        DELETE FROM tasks
        WHERE id = ?
          AND user_email = ?
        LIMIT 1
    `;

    db.query(
        sql,
        [
            taskId,
            userEmail
        ],
        (error, result) => {
            if (error) {
                console.error(
                    "Delete task database error:",
                    error.message
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to delete task right now."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Task not found."
                });
            }

            return res.status(200).json({
                success: true,
                message:
                    "Task deleted successfully."
            });
        }
    );
});

// ============================================================
// NOTIFICATIONS ENDPOINTS
// ============================================================

// GET /api/notifications - Get all notifications for user
app.get("/api/notifications", verifyToken, (req, res) => {
    const userEmail = req.user.email;

    const sql = `
        SELECT id, type, title, message, related_id, related_type, read_status, created_at
        FROM notifications
        WHERE user_email = ?
        ORDER BY created_at DESC
        LIMIT 50
    `;

    db.query(sql, [userEmail], (error, results) => {
        if (error) {
            console.error("Get notifications error:", error.message);
            return res.status(500).json({
                success: false,
                message: "Unable to fetch notifications."
            });
        }

        return res.status(200).json({
            success: true,
            notifications: results || []
        });
    });
});

// PATCH /api/notifications/:id/read - Mark notification as read
app.patch("/api/notifications/:id/read", verifyToken, (req, res) => {
    const notificationId = String(req.params.id).trim();
    const userEmail = req.user.email;

    const sql = `
        UPDATE notifications
        SET read_status = 1
        WHERE id = ? AND user_email = ?
        LIMIT 1
    `;

    db.query(sql, [notificationId, userEmail], (error, result) => {
        if (error) {
            console.error("Mark notification read error:", error.message);
            return res.status(500).json({
                success: false,
                message: "Unable to mark notification as read."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Notification marked as read."
        });
    });
});

// DELETE /api/notifications/:id - Delete notification
app.delete("/api/notifications/:id", verifyToken, (req, res) => {
    const notificationId = String(req.params.id).trim();
    const userEmail = req.user.email;

    const sql = `
        DELETE FROM notifications
        WHERE id = ? AND user_email = ?
        LIMIT 1
    `;

    db.query(sql, [notificationId, userEmail], (error, result) => {
        if (error) {
            console.error("Delete notification error:", error.message);
            return res.status(500).json({
                success: false,
                message: "Unable to delete notification."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Notification deleted successfully."
        });
    });
});

// ============================================================
// SUBJECTS ENDPOINTS
// ============================================================

// GET /api/subjects - Get all subjects for user
app.get("/api/subjects", verifyToken, (req, res) => {
    const userEmail = req.user.email;

    const sql = `
        SELECT id, name, code, color, description, created_at
        FROM subjects
        WHERE user_email = ?
        ORDER BY created_at DESC
    `;

    db.query(sql, [userEmail], (error, results) => {
        if (error) {
            console.error("Get subjects error:", error.message);
            return res.status(500).json({
                success: false,
                message: "Unable to fetch subjects."
            });
        }

        return res.status(200).json({
            success: true,
            subjects: results || []
        });
    });
});

// POST /api/subjects - Create new subject
app.post("/api/subjects", verifyToken, (req, res) => {
    const userEmail = req.user.email;
    const { name, code, color, description } = req.body;

    if (!name || name.trim() === "") {
        return res.status(400).json({
            success: false,
            message: "Subject name is required."
        });
    }

    const subjectId = crypto.randomBytes(8).toString("hex");
    const cleanName = String(name).trim().substring(0, 255);
    const cleanCode = code ? String(code).trim().substring(0, 50) : null;
    const cleanColor = color ? String(color).trim().substring(0, 20) : "#5d9cff";
    const cleanDescription = description ? String(description).trim() : null;

    const sql = `
        INSERT INTO subjects (id, user_email, name, code, color, description)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [subjectId, userEmail, cleanName, cleanCode, cleanColor, cleanDescription],
        (error, result) => {
            if (error) {
                console.error("Create subject error:", error.message);
                return res.status(500).json({
                    success: false,
                    message: "Unable to create subject."
                });
            }

            return res.status(201).json({
                success: true,
                message: "Subject created successfully.",
                subject: {
                    id: subjectId,
                    name: cleanName,
                    code: cleanCode,
                    color: cleanColor,
                    description: cleanDescription
                }
            });
        }
    );
});

// PUT /api/subjects/:id - Update subject
app.put("/api/subjects/:id", verifyToken, (req, res) => {
    const subjectId = String(req.params.id).trim();
    const userEmail = req.user.email;
    const { name, code, color, description } = req.body;

    if (!name || name.trim() === "") {
        return res.status(400).json({
            success: false,
            message: "Subject name is required."
        });
    }

    const cleanName = String(name).trim().substring(0, 255);
    const cleanCode = code ? String(code).trim().substring(0, 50) : null;
    const cleanColor = color ? String(color).trim().substring(0, 20) : "#5d9cff";
    const cleanDescription = description ? String(description).trim() : null;

    const sql = `
        UPDATE subjects
        SET name = ?, code = ?, color = ?, description = ?
        WHERE id = ? AND user_email = ?
        LIMIT 1
    `;

    db.query(
        sql,
        [cleanName, cleanCode, cleanColor, cleanDescription, subjectId, userEmail],
        (error, result) => {
            if (error) {
                console.error("Update subject error:", error.message);
                return res.status(500).json({
                    success: false,
                    message: "Unable to update subject."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Subject not found."
                });
            }

            return res.status(200).json({
                success: true,
                message: "Subject updated successfully."
            });
        }
    );
});

// DELETE /api/subjects/:id - Delete subject
app.delete("/api/subjects/:id", verifyToken, (req, res) => {
    const subjectId = String(req.params.id).trim();
    const userEmail = req.user.email;

    const sql = `
        DELETE FROM subjects
        WHERE id = ? AND user_email = ?
        LIMIT 1
    `;

    db.query(sql, [subjectId, userEmail], (error, result) => {
        if (error) {
            console.error("Delete subject error:", error.message);
            return res.status(500).json({
                success: false,
                message: "Unable to delete subject."
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Subject not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Subject deleted successfully."
        });
    });
});

// ============================================================
// SUBJECT NOTES ENDPOINTS
// ============================================================

// GET /api/subjects/:subjectId/notes - Get all notes for subject
app.get("/api/subjects/:subjectId/notes", verifyToken, (req, res) => {
    const subjectId = String(req.params.subjectId).trim();
    const userEmail = req.user.email;

    const sql = `
        SELECT n.id, n.title, n.content, n.note_type, n.created_at, n.updated_at
        FROM subject_notes n
        WHERE n.subject_id = ? AND n.user_email = ?
        ORDER BY n.created_at DESC
    `;

    db.query(sql, [subjectId, userEmail], (error, results) => {
        if (error) {
            console.error("Get notes error:", error.message);
            return res.status(500).json({
                success: false,
                message: "Unable to fetch notes."
            });
        }

        return res.status(200).json({
            success: true,
            notes: results || []
        });
    });
});

// POST /api/subjects/:subjectId/notes - Create new note
app.post("/api/subjects/:subjectId/notes", verifyToken, (req, res) => {
    const subjectId = String(req.params.subjectId).trim();
    const userEmail = req.user.email;
    const { title, content, note_type } = req.body;

    if (!title || title.trim() === "") {
        return res.status(400).json({
            success: false,
            message: "Note title is required."
        });
    }

    const noteId = crypto.randomBytes(8).toString("hex");
    const cleanTitle = String(title).trim().substring(0, 255);
    const cleanContent = content ? String(content).trim() : "";
    const noteType = note_type ? String(note_type).trim() : "text";

    const sql = `
        INSERT INTO subject_notes (id, subject_id, user_email, title, content, note_type)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [noteId, subjectId, userEmail, cleanTitle, cleanContent, noteType],
        (error, result) => {
            if (error) {
                console.error("Create note error:", error.message);
                return res.status(500).json({
                    success: false,
                    message: "Unable to create note."
                });
            }

            return res.status(201).json({
                success: true,
                message: "Note created successfully.",
                note: {
                    id: noteId,
                    title: cleanTitle,
                    content: cleanContent,
                    note_type: noteType
                }
            });
        }
    );
});

// PUT /api/subjects/notes/:noteId - Update note
app.put("/api/subjects/notes/:noteId", verifyToken, (req, res) => {
    const noteId = String(req.params.noteId).trim();
    const userEmail = req.user.email;
    const { title, content } = req.body;

    if (!title || title.trim() === "") {
        return res.status(400).json({
            success: false,
            message: "Note title is required."
        });
    }

    const cleanTitle = String(title).trim().substring(0, 255);
    const cleanContent = content ? String(content).trim() : "";

    const sql = `
        UPDATE subject_notes
        SET title = ?, content = ?
        WHERE id = ? AND user_email = ?
        LIMIT 1
    `;

    db.query(
        sql,
        [cleanTitle, cleanContent, noteId, userEmail],
        (error, result) => {
            if (error) {
                console.error("Update note error:", error.message);
                return res.status(500).json({
                    success: false,
                    message: "Unable to update note."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Note not found."
                });
            }

            return res.status(200).json({
                success: true,
                message: "Note updated successfully."
            });
        }
    );
});

// DELETE /api/subjects/notes/:noteId - Delete note
app.delete("/api/subjects/notes/:noteId", verifyToken, (req, res) => {
    const noteId = String(req.params.noteId).trim();
    const userEmail = req.user.email;

    const sql = `
        DELETE FROM subject_notes
        WHERE id = ? AND user_email = ?
        LIMIT 1
    `;

    db.query(sql, [noteId, userEmail], (error, result) => {
        if (error) {
            console.error("Delete note error:", error.message);
            return res.status(500).json({
                success: false,
                message: "Unable to delete note."
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Note not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Note deleted successfully."
        });
    });
});

// ============================================================
// SETTINGS ENDPOINTS
// ============================================================

// GET /api/settings - Get user settings
app.get("/api/settings", verifyToken, (req, res) => {
    const userEmail = req.user.email;

    const sql = `
        SELECT theme, language, start_page, notification_sound, notification_desktop, notification_email, task_notifications, group_notifications
        FROM user_settings
        WHERE user_email = ?
        LIMIT 1
    `;

    db.query(sql, [userEmail], (error, results) => {
        if (error) {
            console.error("Get settings error:", error.message);
            return res.status(500).json({
                success: false,
                message: "Unable to fetch settings."
            });
        }

        if (results.length === 0) {
            // Create default settings if not exists
            const insertSql = `
                INSERT INTO user_settings (id, user_email, theme, language, start_page)
                VALUES (?, ?, 'light', 'en', 'dashboard')
            `;
            db.query(insertSql, [crypto.randomBytes(8).toString("hex"), userEmail], () => {
                return res.status(200).json({
                    success: true,
                    settings: {
                        theme: 'light',
                        language: 'en',
                        start_page: 'dashboard',
                        notification_sound: 1,
                        notification_desktop: 1,
                        notification_email: 0,
                        task_notifications: 1,
                        group_notifications: 1
                    }
                });
            });
        } else {
            return res.status(200).json({
                success: true,
                settings: results[0]
            });
        }
    });
});

// PUT /api/settings - Update user settings
app.put("/api/settings", verifyToken, (req, res) => {
    const userEmail = req.user.email;
    const { theme, language, start_page, notification_sound, notification_desktop, notification_email, task_notifications, group_notifications } = req.body;

    const cleanTheme = theme ? String(theme).trim().substring(0, 50) : 'light';
    const cleanLanguage = language ? String(language).trim().substring(0, 20) : 'en';
    const cleanStartPage = start_page ? String(start_page).trim().substring(0, 50) : 'dashboard';

    const sql = `
        UPDATE user_settings
        SET theme = ?, language = ?, start_page = ?, notification_sound = ?, notification_desktop = ?, notification_email = ?, task_notifications = ?, group_notifications = ?
        WHERE user_email = ?
    `;

    db.query(
        sql,
        [
            cleanTheme,
            cleanLanguage,
            cleanStartPage,
            notification_sound ? 1 : 0,
            notification_desktop ? 1 : 0,
            notification_email ? 1 : 0,
            task_notifications ? 1 : 0,
            group_notifications ? 1 : 0,
            userEmail
        ],
        (error, result) => {
            if (error) {
                console.error("Update settings error:", error.message);
                return res.status(500).json({
                    success: false,
                    message: "Unable to update settings."
                });
            }

            return res.status(200).json({
                success: true,
                message: "Settings updated successfully."
            });
        }
    );
});

// ============================================================
// GROUP FILES ENDPOINTS
// ============================================================

// GET /api/groups/:groupId/files - Get all files for group
app.get("/api/groups/:groupId/files", verifyToken, (req, res) => {
    const groupId = String(req.params.groupId).trim();
    const userEmail = req.user.email;

    // Verify user is group member
    const memberCheckSQL = `
        SELECT 1 FROM group_members
        WHERE group_id = ? AND user_email = ?
        LIMIT 1
    `;

    db.query(memberCheckSQL, [groupId, userEmail], (error, results) => {
        if (error || results.length === 0) {
            return res.status(403).json({
                success: false,
                message: "Access denied."
            });
        }

        const fileSQL = `
            SELECT id, file_name, file_size, file_type, uploaded_by, uploaded_at
            FROM group_files
            WHERE group_id = ?
            ORDER BY uploaded_at DESC
        `;

        db.query(fileSQL, [groupId], (error, files) => {
            if (error) {
                console.error("Get group files error:", error.message);
                return res.status(500).json({
                    success: false,
                    message: "Unable to fetch files."
                });
            }

            return res.status(200).json({
                success: true,
                files: files || []
            });
        });
    });
});

// GROUP NOTES: members can create, view, edit, and delete shared notes.
app.get("/api/groups/:groupId/notes", verifyToken, (req, res) => {
    const groupId = String(req.params.groupId).trim();
    const email = req.user.email;
    const sql = `SELECT n.id, n.title, n.content, n.user_email, n.created_at, n.updated_at, COALESCE(u.name, n.user_email) AS author_name
                 FROM group_notes n LEFT JOIN users u ON u.email = n.user_email
                 WHERE n.group_id = ? AND EXISTS (SELECT 1 FROM group_members m WHERE m.group_id = n.group_id AND m.user_email = ?)
                 ORDER BY n.updated_at DESC`;
    db.query(sql, [groupId, email], (error, notes) => {
        if (error) return res.status(500).json({ success: false, message: "Unable to load group notes." });
        res.json({ success: true, notes });
    });
});

app.post("/api/groups/:groupId/notes", verifyToken, (req, res) => {
    const groupId = String(req.params.groupId).trim();
    const title = String(req.body.title || "").trim();
    const content = String(req.body.content || "").trim();
    if (!title || !content) return res.status(400).json({ success: false, message: "Note title and content are required." });
    const sql = `INSERT INTO group_notes (id, group_id, user_email, title, content)
                 SELECT ?, ?, ?, ?, ? FROM DUAL WHERE EXISTS (SELECT 1 FROM group_members WHERE group_id = ? AND user_email = ?)`;
    db.query(sql, [crypto.randomUUID(), groupId, req.user.email, title, content, groupId, req.user.email], (error, result) => {
        if (error) return res.status(500).json({ success: false, message: "Unable to save group note." });
        if (!result.affectedRows) return res.status(403).json({ success: false, message: "Group membership required." });
        res.status(201).json({ success: true, message: "Group note saved." });
    });
});

app.put("/api/groups/:groupId/notes/:noteId", verifyToken, (req, res) => {
    const title = String(req.body.title || "").trim();
    const content = String(req.body.content || "").trim();
    if (!title || !content) return res.status(400).json({ success: false, message: "Note title and content are required." });
    db.query("UPDATE group_notes SET title = ?, content = ? WHERE id = ? AND group_id = ? AND user_email = ?", [title, content, req.params.noteId, req.params.groupId, req.user.email], (error, result) => {
        if (error) return res.status(500).json({ success: false, message: "Unable to update group note." });
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Note not found or not owned by you." });
        res.json({ success: true, message: "Group note updated." });
    });
});

app.delete("/api/groups/:groupId/notes/:noteId", verifyToken, (req, res) => {
    db.query("DELETE FROM group_notes WHERE id = ? AND group_id = ? AND user_email = ?", [req.params.noteId, req.params.groupId, req.user.email], (error, result) => {
        if (error) return res.status(500).json({ success: false, message: "Unable to delete group note." });
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Note not found or not owned by you." });
        res.json({ success: true, message: "Group note deleted." });
    });
});

// DELETE /api/groups/:groupId/files/:fileId - Delete group file
app.delete("/api/groups/:groupId/files/:fileId", verifyToken, (req, res) => {
    const groupId = String(req.params.groupId).trim();
    const fileId = String(req.params.fileId).trim();
    const userEmail = req.user.email;

    // Verify user is group member
    const memberCheckSQL = `
        SELECT 1 FROM group_members
        WHERE group_id = ? AND user_email = ?
        LIMIT 1
    `;

    db.query(memberCheckSQL, [groupId, userEmail], (error, results) => {
        if (error || results.length === 0) {
            return res.status(403).json({
                success: false,
                message: "Access denied."
            });
        }

        const deleteSQL = `
            DELETE FROM group_files
            WHERE id = ? AND group_id = ?
            LIMIT 1
        `;

        db.query(deleteSQL, [fileId, groupId], (error, result) => {
            if (error) {
                console.error("Delete group file error:", error.message);
                return res.status(500).json({
                    success: false,
                    message: "Unable to delete file."
                });
            }

            return res.status(200).json({
                success: true,
                message: "File deleted successfully."
            });
        });
    });
});

// ============================================================
// FILE UPLOAD ENDPOINTS
// ============================================================

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = crypto.randomBytes(8).toString("hex") + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
    fileFilter: (req, file, cb) => {
        // Allowed file types for subjects
        const allowedMimes = ["application/pdf", "image/jpeg", "image/png", "text/plain", "application/msword"];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("File type not allowed"));
        }
    }
});

const assignmentUpload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        cb(null, file.mimetype === "application/pdf");
    }
});

const submissionUpload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/plain",
            "text/csv",
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp"
        ];
        cb(null, allowedMimes.includes(file.mimetype));
    }
});

function requireRole(requiredRole) {
    return (req, res, next) => {
        db.query("SELECT role FROM users WHERE email = ? LIMIT 1", [req.user.email], (error, results) => {
            if (error || results.length === 0 || results[0].role !== requiredRole) {
                return res.status(403).json({ success: false, message: `Only ${requiredRole}s can perform this action.` });
            }
            next();
        });
    };
}

function removeUploadedFile(file) {
    if (file && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
}

// Assignment workflow: teachers publish PDFs, students submit PDFs, teachers review them.
app.post("/api/assignments", verifyToken, requireRole("teacher"), assignmentUpload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: "A PDF assignment file is required." });
    const title = String(req.body.title || "").trim();
    const subject = String(req.body.subject || "").trim();
    const description = String(req.body.description || "").trim();
    const targetYear = String(req.body.targetYear || "").trim();
    const dueDate = String(req.body.dueDate || "").trim();
    const dueTime = String(req.body.dueTime || "").trim();
    if (!title || !subject || !description || !targetYear || !dueDate || !dueTime) {
        removeUploadedFile(req.file);
        return res.status(400).json({ success: false, message: "Subject, title, instructions, target year, due date, and due time are required." });
    }

    db.query("SELECT college, department FROM users WHERE email = ? AND role = 'teacher' LIMIT 1", [req.user.email], (profileError, profiles) => {
        if (profileError || profiles.length === 0) {
            removeUploadedFile(req.file);
            return res.status(403).json({ success: false, message: "Staff profile not found." });
        }
        const assignment = {
        id: crypto.randomBytes(12).toString("hex"),
        teacherEmail: req.user.email,
        title,
        subject,
        description,
        dueDate,
        fileName: req.file.originalname,
        filePath: path.basename(req.file.path),
        fileSize: req.file.size,
        college: profiles[0].college,
        department: profiles[0].department
        };
        db.query(`INSERT INTO assignments
        (id, teacher_email, title, subject, description, due_date, due_time, target_year, college, department, file_name, file_path, file_size, file_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [assignment.id, assignment.teacherEmail, assignment.title, assignment.subject, assignment.description,
            assignment.dueDate, dueTime, targetYear,
            assignment.college, assignment.department, assignment.fileName, assignment.filePath, assignment.fileSize, "application/pdf"],
        (error) => {
            if (error) {
                removeUploadedFile(req.file);
                return res.status(500).json({ success: false, message: "Unable to publish assignment." });
            }
            db.query(`SELECT email FROM users WHERE role = 'student' AND college = ? AND department = ?
                AND year = ?`, [assignment.college, assignment.department, targetYear], (studentError, students) => {
                if (!studentError) students.forEach((student) => createNotification(student.email, "assignment", "New assignment", `${assignment.title} is available.`, assignment.id, "assignment"));
            });
            res.status(201).json({ success: true, assignment });
        });
    });
});

app.get("/api/assignments", verifyToken, (req, res) => {
    db.query("SELECT role FROM users WHERE email = ? LIMIT 1", [req.user.email], (roleError, roleResults) => {
        if (roleError || roleResults.length === 0) return res.status(403).json({ success: false, message: "User account not found." });
        const isTeacher = roleResults[0].role === "teacher";
        const sql = isTeacher
            ? `SELECT a.*, COUNT(s.id) AS submission_count,
                CASE WHEN COUNT(s.id) = 0 AND a.due_date < CURRENT_DATE THEN 'overdue'
                WHEN COUNT(s.id) = 0 THEN 'pending'
                WHEN SUM(s.status IN ('verified', 'completed')) = COUNT(s.id) THEN 'completed'
                ELSE 'submitted' END AS assignment_status
                FROM assignments a LEFT JOIN assignment_submissions s ON s.assignment_id = a.id
                JOIN users staff ON staff.email = ? AND staff.role = 'teacher'
                WHERE a.teacher_email = ? AND a.college = staff.college AND a.department = staff.department
                GROUP BY a.id ORDER BY a.created_at DESC`
            : `SELECT a.*, staff_teacher.name AS teacher_name, s.id AS submission_id, s.file_name AS submission_file_name,
                s.status AS submission_status, s.feedback AS submission_feedback, s.submitted_at, s.viewed_at,
                CASE WHEN s.status = 'needs_correction' THEN 'needs_correction'
                WHEN s.status IN ('verified', 'completed') THEN s.status
                WHEN s.viewed_at IS NOT NULL THEN 'viewed'
                WHEN s.id IS NOT NULL THEN 'submitted'
                WHEN a.due_date < CURRENT_DATE THEN 'overdue'
                ELSE 'pending' END AS assignment_status
                FROM assignments a JOIN users u ON u.email = ?
                LEFT JOIN users staff_teacher ON staff_teacher.email = a.teacher_email AND staff_teacher.role = 'teacher'
                LEFT JOIN assignment_submissions s ON s.assignment_id = a.id AND s.student_email = u.email
                WHERE (a.college IS NULL OR a.college = u.college)
                AND (a.department IS NULL OR a.department = u.department)
                AND a.target_year = u.year
                ORDER BY a.created_at DESC`;
            const parameters = isTeacher ? [req.user.email, req.user.email] : [req.user.email];
            db.query(sql, parameters, (error, assignments) => {
            if (error) return res.status(500).json({ success: false, message: "Unable to load assignments." });
            res.json({ success: true, role: isTeacher ? "teacher" : "student", assignments });
        });
    });
});

function staffOnly(req, res, next) {
    requireRole("teacher")(req, res, next);
}

app.get("/api/staff/context", verifyToken, staffOnly, (req, res) => {
    db.query(`SELECT id, name, email, college, department, role FROM users WHERE email = ? AND role = 'teacher' LIMIT 1`, [req.user.email], (error, results) => {
        if (error || results.length === 0) return res.status(404).json({ success: false, message: "Staff profile not found." });
        res.json({ success: true, staff: results[0] });
    });
});

app.get("/api/staff/students", verifyToken, staffOnly, (req, res) => {
    db.query(`SELECT staff.college, staff.department FROM users staff WHERE staff.email = ? AND staff.role = 'teacher' LIMIT 1`, [req.user.email], (profileError, profiles) => {
        if (profileError || profiles.length === 0) return res.status(404).json({ success: false, message: "Staff profile not found." });
        db.query(`SELECT id, name, email, college, department, year FROM users
            WHERE role = 'student' AND college = ? AND department = ? ORDER BY CAST(year AS UNSIGNED), name`,
            [profiles[0].college, profiles[0].department], (error, students) => {
            if (error) return res.status(500).json({ success: false, message: "Unable to load students." });
            res.json({ success: true, students });
        });
    });
});

app.get("/api/staff/dashboard", verifyToken, staffOnly, (req, res) => {
    const assignmentCount = `SELECT COUNT(*) AS count FROM assignments WHERE teacher_email = ?`;
    const submissionCounts = `SELECT
        SUM(s.status = 'submitted') AS submitted,
        SUM(s.status = 'submitted' OR s.status = 'needs_revision') AS pending,
        SUM(s.status = 'completed' OR s.status = 'verified') AS completed
        FROM assignment_submissions s JOIN assignments a ON a.id = s.assignment_id WHERE a.teacher_email = ?`;
    const activity = `SELECT s.id, s.student_email, s.status, s.submitted_at, a.title
        FROM assignment_submissions s JOIN assignments a ON a.id = s.assignment_id
        WHERE a.teacher_email = ? ORDER BY s.submitted_at DESC LIMIT 10`;
    db.query(assignmentCount, [req.user.email], (firstError, assignments) => {
        if (firstError) return res.status(500).json({ success: false, message: "Unable to load Staff dashboard." });
        db.query(submissionCounts, [req.user.email], (secondError, counts) => {
            if (secondError) return res.status(500).json({ success: false, message: "Unable to load Staff dashboard." });
            db.query(activity, [req.user.email], (thirdError, recent) => {
                if (thirdError) return res.status(500).json({ success: false, message: "Unable to load Staff activity." });
                const row = counts[0] || {};
                res.json({ success: true, stats: {
                    totalAssignments: Number(assignments[0].count || 0),
                    pendingSubmissions: Number(row.pending || 0),
                    submitted: Number(row.submitted || 0),
                    awaitingVerification: Number(row.pending || 0),
                    completed: Number(row.completed || 0)
                }, recent });
            });
        });
    });
});

app.get("/api/staff/verifications", verifyToken, staffOnly, (req, res) => {
    db.query(`SELECT s.id, s.assignment_id, s.student_email, u.name AS student_name, u.year,
        a.title, s.status, s.submitted_at, s.reviewed_at, s.viewed_at, s.file_name, s.feedback
        FROM assignment_submissions s JOIN assignments a ON a.id = s.assignment_id
        JOIN users u ON u.email = s.student_email
        WHERE a.teacher_email = ? ORDER BY s.submitted_at DESC`, [req.user.email], (error, submissions) => {
        if (error) return res.status(500).json({ success: false, message: "Unable to load verifications." });
        res.json({ success: true, submissions });
    });
});

app.patch("/api/staff/verifications/:id", verifyToken, staffOnly, (req, res) => {
    const status = String(req.body.status || "").trim().toLowerCase();
    if (!["verified", "completed", "needs_correction"].includes(status)) return res.status(400).json({ success: false, message: "Invalid verification status." });
    db.query(`UPDATE assignment_submissions s JOIN assignments a ON a.id = s.assignment_id
        SET s.status = ?, s.feedback = ?, s.reviewed_at = CURRENT_TIMESTAMP
        WHERE s.id = ? AND a.teacher_email = ?`, [status, String(req.body.feedback || "").trim() || null, req.params.id, req.user.email], (error, result) => {
        if (error) return res.status(500).json({ success: false, message: "Unable to update verification." });
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Submission not found." });
        db.query(`SELECT s.student_email, a.title FROM assignment_submissions s JOIN assignments a ON a.id = s.assignment_id WHERE s.id = ? LIMIT 1`, [req.params.id], (lookupError, rows) => {
            if (!lookupError && rows.length) {
                const message = status === "needs_correction" ? `Correction requested for ${rows[0].title}.` : `Your submission for ${rows[0].title} was ${status}.`;
                createNotification(rows[0].student_email, status === "needs_correction" ? "correction_required" : "verification", "Assignment update", message, req.params.id, "submission");
            }
            res.json({ success: true, message: "Verification updated." });
        });
    });
});

app.patch("/api/staff/verifications/:id/viewed", verifyToken, staffOnly, (req, res) => {
    db.query(`UPDATE assignment_submissions s JOIN assignments a ON a.id = s.assignment_id
        SET s.viewed_at = CURRENT_TIMESTAMP WHERE s.id = ? AND a.teacher_email = ?`, [req.params.id, req.user.email], (error, result) => {
        if (error) return res.status(500).json({ success: false, message: "Unable to mark submission viewed." });
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Submission not found." });
        db.query(`SELECT s.student_email, a.title FROM assignment_submissions s JOIN assignments a ON a.id = s.assignment_id WHERE s.id = ? LIMIT 1`, [req.params.id], (lookupError, rows) => {
            if (!lookupError && rows.length) createNotification(rows[0].student_email, "submission_viewed", "Submission viewed", `Your submission for ${rows[0].title} was viewed by Staff.`, req.params.id, "submission");
            res.json({ success: true });
        });
    });
});

app.patch("/api/assignments/:id", verifyToken, requireRole("teacher"), (req, res) => {
    const fields = {
        title: String(req.body.title || "").trim(),
        subject: String(req.body.subject || "").trim() || null,
        description: String(req.body.description || "").trim(),
        dueDate: String(req.body.dueDate || "").trim() || null,
        dueTime: String(req.body.dueTime || "").trim() || null,
        targetYear: String(req.body.targetYear || "").trim() || null
    };
    if (!fields.title || !fields.subject || !fields.description || !fields.targetYear || !fields.dueDate || !fields.dueTime) return res.status(400).json({ success: false, message: "Subject, title, instructions, target year, due date, and due time are required." });
    db.query(`UPDATE assignments a JOIN users staff ON staff.email = ? AND staff.role = 'teacher'
        SET a.title = ?, a.subject = ?, a.description = ?, a.due_date = ?, a.due_time = ?, a.target_year = ?
        WHERE a.id = ? AND a.teacher_email = ? AND a.college = staff.college AND a.department = staff.department`, [req.user.email, fields.title, fields.subject, fields.description, fields.dueDate, fields.dueTime, fields.targetYear, req.params.id, req.user.email], (error, result) => {
        if (error) return res.status(500).json({ success: false, message: "Unable to update assignment." });
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Assignment not found." });
        res.json({ success: true, message: "Assignment updated." });
    });
});

app.delete("/api/assignments/:id", verifyToken, requireRole("teacher"), (req, res) => {
    db.query(`DELETE a FROM assignments a JOIN users staff ON staff.email = ? AND staff.role = 'teacher'
        WHERE a.id = ? AND a.teacher_email = ? AND a.college = staff.college AND a.department = staff.department`, [req.user.email, req.params.id, req.user.email], (error, result) => {
        if (error) return res.status(500).json({ success: false, message: "Unable to delete assignment." });
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Assignment not found." });
        res.json({ success: true, message: "Assignment deleted." });
    });
});

app.get("/api/assignments/:id/file", verifyToken, (req, res) => {
    db.query(`SELECT a.file_path FROM assignments a WHERE a.id = ?
        AND (EXISTS (SELECT 1 FROM users staff WHERE staff.email = ? AND staff.role = 'teacher'
            AND a.teacher_email = staff.email AND a.college = staff.college AND a.department = staff.department)
        OR EXISTS (SELECT 1 FROM users u WHERE u.email = ? AND u.role = 'student'
            AND a.college = u.college AND a.department = u.department AND a.target_year = u.year)) LIMIT 1`,
        [req.params.id, req.user.email, req.user.email], (error, results) => {
            if (error || results.length === 0) return res.status(404).json({ success: false, message: "Assignment file not found." });
            res.sendFile(path.resolve(uploadDir, results[0].file_path));
        });
});

app.post("/api/assignments/:id/submissions", verifyToken, requireRole("student"), submissionUpload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: "A supported assignment document or image is required." });
    const submissionId = crypto.randomBytes(12).toString("hex");
    db.query(`SELECT a.id, a.teacher_email, a.title FROM assignments a
        JOIN users student ON student.email = ? AND student.role = 'student'
        WHERE a.id = ? AND a.college = student.college AND a.department = student.department AND a.target_year = student.year LIMIT 1`, [req.user.email, req.params.id], (checkError, assignments) => {
        if (checkError || assignments.length === 0) {
            removeUploadedFile(req.file);
            return res.status(404).json({ success: false, message: "Assignment not found." });
        }
        db.query(`INSERT INTO assignment_submissions
            (id, assignment_id, student_email, file_name, file_path, file_size, file_type, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted')
            ON DUPLICATE KEY UPDATE file_name = VALUES(file_name), file_path = VALUES(file_path), file_size = VALUES(file_size), status = 'submitted', feedback = NULL, reviewed_at = NULL, submitted_at = CURRENT_TIMESTAMP`,
            [submissionId, req.params.id, req.user.email, req.file.originalname, path.basename(req.file.path), req.file.size, req.file.mimetype],
            (error) => {
                if (error) {
                    removeUploadedFile(req.file);
                    return res.status(500).json({ success: false, message: "Unable to submit assignment." });
                }
                createNotification(
                    assignments[0].teacher_email,
                    "assignment_submission",
                    "Assignment submitted",
                    `${req.user.email} submitted ${assignments[0].title} for verification.`,
                    req.params.id,
                    "assignment"
                );
                res.status(201).json({ success: true, message: "Assignment submitted for review." });
            });
    });
});

app.get("/api/assignments/:id/submissions", verifyToken, requireRole("teacher"), (req, res) => {
    db.query(`SELECT s.*, a.title FROM assignment_submissions s JOIN assignments a ON a.id = s.assignment_id
        JOIN users staff ON staff.email = ? AND staff.role = 'teacher'
        WHERE s.assignment_id = ? AND a.teacher_email = ? AND a.college = staff.college AND a.department = staff.department ORDER BY s.submitted_at DESC`, [req.user.email, req.params.id, req.user.email], (error, submissions) => {
        if (error) return res.status(500).json({ success: false, message: "Unable to load submissions." });
        res.json({ success: true, submissions });
    });
});

app.get("/api/assignments/submissions/:id/file", verifyToken, (req, res) => {
    db.query(`SELECT s.file_path FROM assignment_submissions s JOIN assignments a ON a.id = s.assignment_id
        WHERE s.id = ? AND (EXISTS (SELECT 1 FROM users staff WHERE staff.email = ? AND staff.role = 'teacher'
            AND a.teacher_email = staff.email AND a.college = staff.college AND a.department = staff.department)
            OR s.student_email = ?) LIMIT 1`, [req.params.id, req.user.email, req.user.email], (error, results) => {
        if (error || results.length === 0) return res.status(404).json({ success: false, message: "Submission file not found." });
        res.sendFile(path.resolve(uploadDir, results[0].file_path));
    });
});

app.patch("/api/assignments/:assignmentId/submissions/:submissionId", verifyToken, requireRole("teacher"), (req, res) => {
    const status = String(req.body.status || "").trim().toLowerCase();
    if (!["submitted", "reviewed", "completed", "needs_revision"].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid submission status." });
    }
    db.query(`UPDATE assignment_submissions s JOIN assignments a ON a.id = s.assignment_id
        JOIN users staff ON staff.email = ? AND staff.role = 'teacher'
        SET s.status = ?, s.feedback = ?, s.reviewed_at = CURRENT_TIMESTAMP
        WHERE s.id = ? AND s.assignment_id = ? AND a.teacher_email = ? AND a.college = staff.college AND a.department = staff.department`,
        [req.user.email, status, String(req.body.feedback || "").trim() || null, req.params.submissionId, req.params.assignmentId, req.user.email], (error, result) => {
        if (error) return res.status(500).json({ success: false, message: "Unable to update review status." });
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Submission not found." });
        res.json({ success: true, message: "Submission review updated." });
    });
});

// POST /api/subjects/:subjectId/notes/:noteId/upload - Upload file to subject note
app.post("/api/subjects/:subjectId/notes/:noteId/upload", verifyToken, upload.single("file"), (req, res) => {
    const userEmail = req.user.email;
    const subjectId = String(req.params.subjectId).trim();
    const noteId = String(req.params.noteId).trim();

    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "No file uploaded."
        });
    }

    // Verify user owns the subject
    const verifySQL = `
        SELECT id FROM subjects
        WHERE id = ? AND user_email = ?
        LIMIT 1
    `;

    db.query(verifySQL, [subjectId, userEmail], (error, results) => {
        if (error || results.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.status(403).json({
                success: false,
                message: "Access denied."
            });
        }

        const fileId = crypto.randomBytes(8).toString("hex");
        const fileSQL = `
            INSERT INTO subject_note_files
            (id, note_id, file_name, file_path, file_size, file_type, uploaded_at, uploaded_by)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
        `;

        db.query(
            fileSQL,
            [fileId, noteId, req.file.originalname, req.file.filename, req.file.size, req.file.mimetype, userEmail],
            (error, result) => {
                if (error) {
                    fs.unlinkSync(req.file.path);
                    console.error("Upload file database error:", error.message);
                    return res.status(500).json({
                        success: false,
                        message: "Unable to save file metadata."
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: "File uploaded successfully.",
                    file: {
                        id: fileId,
                        name: req.file.originalname,
                        size: req.file.size,
                        uploadedAt: new Date()
                    }
                });
            }
        );
    });
});

// GET /api/subjects/notes/:noteId/files - Get files for a note
app.get("/api/subjects/notes/:noteId/files", verifyToken, (req, res) => {
    const userEmail = req.user.email;
    const noteId = String(req.params.noteId).trim();

    const fileSQL = `
        SELECT f.id, f.file_name, f.file_size, f.file_type, f.uploaded_at
        FROM subject_note_files f
        JOIN subject_notes n ON f.note_id = n.id
        JOIN subjects s ON n.subject_id = s.id
        WHERE n.id = ? AND s.user_email = ?
        ORDER BY f.uploaded_at DESC
    `;

    db.query(fileSQL, [noteId, userEmail], (error, files) => {
        if (error) {
            console.error("Get note files error:", error.message);
            return res.status(500).json({
                success: false,
                message: "Unable to fetch files."
            });
        }

        return res.status(200).json({
            success: true,
            files: files || []
        });
    });
});

// DELETE /api/subjects/notes/:noteId/files/:fileId - Delete file from note
app.delete("/api/subjects/notes/:noteId/files/:fileId", verifyToken, (req, res) => {
    const userEmail = req.user.email;
    const noteId = String(req.params.noteId).trim();
    const fileId = String(req.params.fileId).trim();

    // Verify user owns the subject
    const verifySQL = `
        SELECT f.file_path FROM subject_note_files f
        JOIN subject_notes n ON f.note_id = n.id
        JOIN subjects s ON n.subject_id = s.id
        WHERE f.id = ? AND n.id = ? AND s.user_email = ?
        LIMIT 1
    `;

    db.query(verifySQL, [fileId, noteId, userEmail], (error, results) => {
        if (error || results.length === 0) {
            return res.status(403).json({
                success: false,
                message: "Access denied."
            });
        }

        const filePath = path.join(uploadDir, results[0].file_path);
        
        const deleteSQL = `
            DELETE FROM subject_note_files
            WHERE id = ? AND note_id = ?
            LIMIT 1
        `;

        db.query(deleteSQL, [fileId, noteId], (error, result) => {
            if (error) {
                console.error("Delete file database error:", error.message);
                return res.status(500).json({
                    success: false,
                    message: "Unable to delete file."
                });
            }

            // Delete physical file
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            return res.status(200).json({
                success: true,
                message: "File deleted successfully."
            });
        });
    });
});

// POST /api/groups/:groupId/files/upload - Upload file to group
app.post("/api/groups/:groupId/files/upload", verifyToken, upload.single("file"), (req, res) => {
    const userEmail = req.user.email;
    const groupId = String(req.params.groupId).trim();

    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "No file uploaded."
        });
    }

    // Verify user is group member
    const memberCheckSQL = `
        SELECT 1 FROM group_members
        WHERE group_id = ? AND user_email = ?
        LIMIT 1
    `;

    db.query(memberCheckSQL, [groupId, userEmail], (error, results) => {
        if (error || results.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.status(403).json({
                success: false,
                message: "Access denied."
            });
        }

        const fileId = crypto.randomBytes(8).toString("hex");
        const fileSQL = `
            INSERT INTO group_files
            (id, group_id, file_name, file_path, file_size, file_type, uploaded_by, uploaded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `;

        db.query(
            fileSQL,
            [fileId, groupId, req.file.originalname, req.file.filename, req.file.size, req.file.mimetype, userEmail],
            (error, result) => {
                if (error) {
                    fs.unlinkSync(req.file.path);
                    console.error("Upload group file database error:", error.message);
                    return res.status(500).json({
                        success: false,
                        message: "Unable to save file metadata."
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: "File uploaded successfully.",
                    file: {
                        id: fileId,
                        name: req.file.originalname,
                        size: req.file.size,
                        uploadedAt: new Date()
                    }
                });
            }
        );
    });
});

// GET /api/groups/:groupId/files/:fileId/download - Download group file
app.get("/api/groups/:groupId/files/:fileId/download", verifyToken, (req, res) => {
    const userEmail = req.user.email;
    const groupId = String(req.params.groupId).trim();
    const fileId = String(req.params.fileId).trim();

    // Verify user is group member
    const memberCheckSQL = `
        SELECT 1 FROM group_members
        WHERE group_id = ? AND user_email = ?
        LIMIT 1
    `;

    db.query(memberCheckSQL, [groupId, userEmail], (error, results) => {
        if (error || results.length === 0) {
            return res.status(403).json({
                success: false,
                message: "Access denied."
            });
        }

        const fileSQL = `
            SELECT file_path, file_name FROM group_files
            WHERE id = ? AND group_id = ?
            LIMIT 1
        `;

        db.query(fileSQL, [fileId, groupId], (error, results) => {
            if (error || results.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "File not found."
                });
            }

            const filePath = path.join(uploadDir, results[0].file_path);
            
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({
                    success: false,
                    message: "File not found on disk."
                });
            }

            res.download(filePath, results[0].file_name);
        });
    });
});

// ============================================================
// GAMES ENDPOINTS
// ============================================================

// POST /api/games/:gameName/score - Submit game score
app.post("/api/games/:gameName/score", verifyToken, (req, res) => {
    const gameName = String(req.params.gameName).trim();
    const userEmail = req.user.email;
    const { score, points, groupId } = req.body;

    if (!score && score !== 0) {
        return res.status(400).json({
            success: false,
            message: "Score is required."
        });
    }

    const cleanScore = Number(score) || 0;
    const cleanPoints = Number(points) || 0;

    // If group game
    if (groupId) {
        const cleanGroupId = String(groupId).trim();
        
        // Verify user is group member
        const memberCheckSQL = `
            SELECT 1 FROM group_members
            WHERE group_id = ? AND user_email = ?
            LIMIT 1
        `;

        db.query(memberCheckSQL, [cleanGroupId, userEmail], (error, results) => {
            if (error || results.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied."
                });
            }

            const gameResultId = crypto.randomBytes(8).toString("hex");
            const insertSQL = `
                INSERT INTO group_game_results (id, group_id, user_email, game_name, score, points)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            db.query(
                insertSQL,
                [gameResultId, cleanGroupId, userEmail, gameName, cleanScore, cleanPoints],
                (error, result) => {
                    if (error) {
                        console.error("Insert game result error:", error.message);
                        return res.status(500).json({
                            success: false,
                            message: "Unable to save game score."
                        });
                    }

                    // Create notification for group
                    const groupSQL = `SELECT name FROM groups WHERE id = ?`;
                    db.query(groupSQL, [cleanGroupId], (error, groupResults) => {
                        if (!error && groupResults.length > 0) {
                            const groupName = groupResults[0].name;
                            createNotification(
                                userEmail,
                                'game_score',
                                'Game Score Recorded',
                                `You scored ${cleanScore} points in ${gameName} (${cleanPoints} group points)`,
                                gameResultId,
                                'game'
                            );
                        }
                    });

                    return res.status(201).json({
                        success: true,
                        message: "Game score saved successfully.",
                        gameResult: {
                            id: gameResultId,
                            score: cleanScore,
                            points: cleanPoints
                        }
                    });
                }
            );
        });
    } else {
        // Personal game score - just respond with success
        return res.status(201).json({
            success: true,
            message: "Game score recorded.",
            score: cleanScore
        });
    }
});

// GET /api/games/:gameName/scores - Get game scores
app.get("/api/games/:gameName/scores", verifyToken, (req, res) => {
    const gameName = String(req.params.gameName).trim();
    const userEmail = req.user.email;
    const { groupId } = req.query;

    if (groupId) {
        const cleanGroupId = String(groupId).trim();
        
        // Verify user is group member
        const memberCheckSQL = `
            SELECT 1 FROM group_members
            WHERE group_id = ? AND user_email = ?
            LIMIT 1
        `;

        db.query(memberCheckSQL, [cleanGroupId, userEmail], (error, results) => {
            if (error || results.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied."
                });
            }

            const scoreSQL = `
                SELECT id, user_email, score, points, played_at
                FROM group_game_results
                WHERE group_id = ? AND game_name = ?
                ORDER BY score DESC
                LIMIT 10
            `;

            db.query(scoreSQL, [cleanGroupId, gameName], (error, scores) => {
                if (error) {
                    console.error("Get game scores error:", error.message);
                    return res.status(500).json({
                        success: false,
                        message: "Unable to fetch scores."
                    });
                }

                return res.status(200).json({
                    success: true,
                    scores: scores || []
                });
            });
        });
    } else {
        // Return empty for personal games (not stored in DB)
        return res.status(200).json({
            success: true,
            scores: []
        });
    }
});

// ============================================================
// BADGES & STREAKS ENDPOINTS
// ============================================================

// GET /api/user/badges - Get user badges
app.get("/api/user/badges", verifyToken, (req, res) => {
    const userEmail = req.user.email;

    const sql = `
        SELECT badge_name, badge_type, earned_at
        FROM user_badges
        WHERE user_email = ?
        ORDER BY earned_at DESC
    `;

    db.query(sql, [userEmail], (error, results) => {
        if (error) {
            console.error("Get badges error:", error.message);
            return res.status(500).json({
                success: false,
                message: "Unable to fetch badges."
            });
        }

        return res.status(200).json({
            success: true,
            badges: results || []
        });
    });
});

// POST /api/user/badges - Award badge to user
app.post("/api/user/badges", verifyToken, (req, res) => {
    const userEmail = req.user.email;
    const { badgeName, badgeType } = req.body;

    if (!badgeName || !badgeType) {
        return res.status(400).json({
            success: false,
            message: "Badge name and type are required."
        });
    }

    const badgeId = crypto.randomBytes(8).toString("hex");
    const cleanBadgeName = String(badgeName).trim().substring(0, 100);
    const cleanBadgeType = String(badgeType).trim().substring(0, 50);

    const sql = `
        INSERT INTO user_badges (id, user_email, badge_name, badge_type)
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [badgeId, userEmail, cleanBadgeName, cleanBadgeType],
        (error, result) => {
            if (error) {
                console.error("Award badge error:", error.message);
                return res.status(500).json({
                    success: false,
                    message: "Unable to award badge."
                });
            }

            createNotification(
                userEmail,
                'badge',
                'Badge Earned!',
                `You earned the "${cleanBadgeName}" badge!`,
                badgeId,
                'badge'
            );

            return res.status(201).json({
                success: true,
                message: "Badge awarded successfully."
            });
        }
    );
});

// GET /api/user/streaks - Get user streaks
app.get("/api/user/streaks", verifyToken, (req, res) => {
    const userEmail = req.user.email;

    const sql = `
        SELECT activity_type, current_streak, best_streak, last_activity_date
        FROM user_streaks
        WHERE user_email = ?
    `;

    db.query(sql, [userEmail], (error, results) => {
        if (error) {
            console.error("Get streaks error:", error.message);
            return res.status(500).json({
                success: false,
                message: "Unable to fetch streaks."
            });
        }

        return res.status(200).json({
            success: true,
            streaks: results || []
        });
    });
});

// PATCH /api/user/streaks/:activityType - Update streak
app.patch("/api/user/streaks/:activityType", verifyToken, (req, res) => {
    const userEmail = req.user.email;
    const activityType = String(req.params.activityType).trim();

    const today = new Date().toISOString().split('T')[0];

    // Check if streak exists
    const checkSQL = `
        SELECT id, current_streak, last_activity_date
        FROM user_streaks
        WHERE user_email = ? AND activity_type = ?
        LIMIT 1
    `;

    db.query(checkSQL, [userEmail, activityType], (error, results) => {
        if (error) {
            console.error("Check streak error:", error.message);
            return res.status(500).json({
                success: false,
                message: "Unable to update streak."
            });
        }

        if (results.length === 0) {
            // Create new streak
            const streakId = crypto.randomBytes(8).toString("hex");
            const insertSQL = `
                INSERT INTO user_streaks (id, user_email, activity_type, current_streak, best_streak, last_activity_date)
                VALUES (?, ?, ?, 1, 1, ?)
            `;

            db.query(insertSQL, [streakId, userEmail, activityType, today], (error) => {
                if (error) {
                    console.error("Create streak error:", error.message);
                    return res.status(500).json({
                        success: false,
                        message: "Unable to create streak."
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: "Streak created.",
                    streak: {
                        activity_type: activityType,
                        current_streak: 1,
                        best_streak: 1
                    }
                });
            });
        } else {
            const streak = results[0];
            const lastDate = streak.last_activity_date ? new Date(streak.last_activity_date).toISOString().split('T')[0] : null;
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

            let newStreak = streak.current_streak;
            let newBest = streak.current_streak;

            // If last activity was yesterday or today, increment streak
            if (lastDate === today) {
                // Already updated today
                newStreak = streak.current_streak;
            } else if (lastDate === yesterday) {
                // Continue streak
                newStreak = streak.current_streak + 1;
                newBest = Math.max(newStreak, streak.best_streak || 0);
            } else {
                // Streak broken, restart
                newStreak = 1;
            }

            const updateSQL = `
                UPDATE user_streaks
                SET current_streak = ?, best_streak = ?, last_activity_date = ?
                WHERE user_email = ? AND activity_type = ?
            `;

            db.query(updateSQL, [newStreak, newBest, today, userEmail, activityType], (error) => {
                if (error) {
                    console.error("Update streak error:", error.message);
                    return res.status(500).json({
                        success: false,
                        message: "Unable to update streak."
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: "Streak updated.",
                    streak: {
                        activity_type: activityType,
                        current_streak: newStreak,
                        best_streak: newBest
                    }
                });
            });
        }
    });
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
    console.error(
        "Unhandled server error:",
        err
    );

    res.status(500).json({
        success: false,
        message:
            "An unexpected server error occurred."
    });
});

// ============================================================
// START SERVER (LOCAL DEVELOPMENT ONLY)
// ============================================================

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(
            `DueMate server running on http://localhost:${PORT}`
        );

        console.log(
            "Waiting for frontend requests..."
        );
    });
}

module.exports = app;