// ============================================================
// DUE MATE BACKEND SERVER
// ============================================================

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const db = require("./config/db");

const app = express();
const PORT = 5000;

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
    cors({
        origin: true,
        credentials: true
    })
);

app.use(express.json());

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

// ============================================================
// REGISTER
// POST /api/auth/register
// ============================================================

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
        theme
    } = req.body;

    // --------------------------------------------------------
    // REQUIRED FIELDS
    // --------------------------------------------------------

    if (
        !name ||
        !college ||
        !department ||
        !course ||
        !year ||
        !email ||
        !mobile ||
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
    const cleanCourse = String(course).trim();
    const cleanYear = String(year).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanMobile = String(mobile).trim();

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

    if (cleanCourse.length < 2) {
        return res.status(400).json({
            success: false,
            message: "Please enter your course."
        });
    }

    if (!["1", "2", "3", "4"].includes(cleanYear)) {
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

    if (!/^\d{10}$/.test(cleanMobile)) {
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
                                theme
                            )
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                                selectedTheme
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
                                        mobile: cleanMobile,
                                        theme: selectedTheme
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
    const {
        email,
        password
    } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and password are required."
        });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const sql = `
        SELECT
            id,
            name,
            college,
            department,
            course,
            year,
            email,
            mobile,
            password,
            theme
        FROM users
        WHERE email = ?
        LIMIT 1
    `;

    db.query(
        sql,
        [cleanEmail],
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

                return res.status(200).json({
                    success: true,
                    message: "Login successful.",
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
// GET /api/user/profile?email=example@gmail.com
// ============================================================

app.get("/api/user/profile", (req, res) => {
    const email = req.query.email;

    if (!email) {
        return res.status(400).json({
            success: false,
            message: "Email is required."
        });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const sql = `
        SELECT
            id,
            name,
            college,
            department,
            course,
            year,
            email,
            mobile,
            theme,
            student_id,
            semester
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

app.put("/api/user/profile", (req, res) => {
    const {
        email,
        name,
        mobile,
        college,
        department,
        course,
        year
    } = req.body;

    if (!email || !name) {
        return res.status(400).json({
            success: false,
            message:
                "Email and full name are required."
        });
    }

    const cleanEmail = String(email).trim().toLowerCase();
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
            cleanEmail
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
                    email: cleanEmail,
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

app.post("/api/user/theme", (req, res) => {
    const {
        email,
        theme
    } = req.body;

    if (!email || !theme) {
        return res.status(400).json({
            success: false,
            message:
                "Email and theme are required."
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

    const cleanEmail = String(email).trim().toLowerCase();

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
            cleanEmail
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
    async (req, res) => {
        const {
            email,
            currentPassword,
            newPassword
        } = req.body;

        if (
            !email ||
            !currentPassword ||
            !newPassword
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Email, current password and new password are required."
            });
        }

        if (String(newPassword).length < 8) {
            return res.status(400).json({
                success: false,
                message:
                    "New password must contain at least 8 characters."
            });
        }

        const cleanEmail = String(email).trim().toLowerCase();

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
            [cleanEmail],
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
                        // DEVELOPMENT RESET LINK
                        // ------------------------------------

                        const resetLink =
                            `http://127.0.0.1:5500/forgot-password.html?token=${encodeURIComponent(resetToken)}`;

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

app.get("/api/groups", (req, res) => {
    const userEmail = String(req.query.user_email || "").trim().toLowerCase();

    if (!userEmail) {
        return res.status(400).json({ success: false, message: "User email is required." });
    }

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

app.post("/api/groups", (req, res) => {
    const ownerEmail = String(req.body.user_email || "").trim().toLowerCase();
    const name = String(req.body.name || "").trim();
    const purpose = String(req.body.purpose || "").trim();
    const minimumMembers = Number(req.body.minimum_members);
    const maximumMembers = Number(req.body.maximum_members);

    if (!ownerEmail || !name || !purpose || !Number.isInteger(minimumMembers) || !Number.isInteger(maximumMembers) || minimumMembers < 1 || maximumMembers < minimumMembers) {
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

app.put("/api/groups/:id", (req, res) => {
    const groupId = String(req.params.id || "").trim();
    const ownerEmail = String(req.body.user_email || "").trim().toLowerCase();
    const name = String(req.body.name || "").trim();
    const purpose = String(req.body.purpose || "").trim();
    const minimumMembers = Number(req.body.minimum_members);
    const maximumMembers = Number(req.body.maximum_members);

    if (!groupId || !ownerEmail || !name || !purpose || maximumMembers < minimumMembers) {
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

app.post("/api/groups/join", (req, res) => {
    const userEmail = String(req.body.user_email || "").trim().toLowerCase();
    const joinCode = String(req.body.join_code || "").trim().toUpperCase();

    if (!userEmail || !joinCode) return res.status(400).json({ success: false, message: "Join code and user email are required." });

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

app.post("/api/groups/:id/join-request", (req, res) => {
    const groupId = String(req.params.id || "").trim();
    const userEmail = String(req.body.user_email || "").trim().toLowerCase();
    if (!groupId || !userEmail) return res.status(400).json({ success: false, message: "User email and group are required." });

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

app.get("/api/groups/requests", (req, res) => {
    const ownerEmail = String(req.query.user_email || "").trim().toLowerCase();
    const sql = `SELECT r.id, r.group_id, r.user_email, r.created_at, g.name AS group_name FROM group_join_requests r INNER JOIN \`groups\` g ON g.id = r.group_id WHERE g.owner_email = ? AND r.status = 'pending' ORDER BY r.created_at DESC`;
    db.query(sql, [ownerEmail], (error, requests) => {
        if (error) return res.status(500).json({ success: false, message: "Unable to load join requests." });
        return res.json({ success: true, requests });
    });
});

app.patch("/api/groups/requests/:id", (req, res) => {
    const requestId = String(req.params.id || "").trim();
    const ownerEmail = String(req.body.user_email || "").trim().toLowerCase();
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

app.get("/api/groups/:id/workspace", (req, res) => {
    const groupId = String(req.params.id || "").trim();
    const userEmail = String(req.query.user_email || "").trim().toLowerCase();
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

app.put("/api/groups/:id/rules", (req, res) => {
    const groupId = String(req.params.id || "").trim();
    const ownerEmail = String(req.body.user_email || "").trim().toLowerCase();
    const rules = String(req.body.rules || "").trim();
    const sql = `INSERT INTO group_rules (group_id, rules) SELECT ?, ? FROM DUAL WHERE EXISTS (SELECT 1 FROM \`groups\` WHERE id = ? AND owner_email = ?) ON DUPLICATE KEY UPDATE rules = VALUES(rules)`;
    db.query(sql, [groupId, rules, groupId, ownerEmail], (error, result) => {
        if (error) return res.status(500).json({ success: false, message: "Unable to save group rules." });
        if (!result.affectedRows) return res.status(403).json({ success: false, message: "Admin access required." });
        res.json({ success: true, message: "Group rules saved." });
    });
});

app.post("/api/groups/:id/challenges", (req, res) => {
    const groupId = String(req.params.id || "").trim();
    const creator = String(req.body.user_email || "").trim().toLowerCase();
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

app.post("/api/groups/:id/game-results", (req, res) => {
    const groupId = String(req.params.id || "").trim();
    const userEmail = String(req.body.user_email || "").trim().toLowerCase();
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

app.delete("/api/groups/:id/members/:memberEmail", (req, res) => {
    const groupId = String(req.params.id || "").trim();
    const requester = String(req.body.user_email || "").trim().toLowerCase();
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

app.delete("/api/groups/:id", (req, res) => {
    const groupId = String(req.params.id || "").trim();
    const userEmail = String(req.body.user_email || "").trim().toLowerCase();

    db.query("DELETE FROM `groups` WHERE id = ? AND owner_email = ?", [groupId, userEmail], (error, result) => {
        if (error) return res.status(500).json({ success: false, message: "Unable to delete group right now." });
        if (!result.affectedRows) return res.status(404).json({ success: false, message: "Only the group owner can delete this group." });
        return res.json({ success: true, message: "Group deleted successfully." });
    });
});

// ============================================================
// TASKS
// NO TIME FIELD
// ============================================================

// ============================================================
// GET ALL TASKS
// GET /api/tasks?user_email=example@gmail.com
// ============================================================

app.get("/api/tasks", (req, res) => {
    const userEmail = req.query.user_email;

    if (!userEmail) {
        return res.status(400).json({
            success: false,
            message:
                "User email is required."
        });
    }

    const cleanEmail =
        String(userEmail).trim().toLowerCase();

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
            created_at,
            updated_at
        FROM tasks
        WHERE user_email = ?
        ORDER BY
            task_date ASC,
            id DESC
    `;

    db.query(
        sql,
        [cleanEmail],
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
                tasks: results
            });
        }
    );
});

// ============================================================
// ADD TASK
// POST /api/tasks
// ============================================================

app.post("/api/tasks", (req, res) => {
    const {
        user_email,
        name,
        subject,
        date,
        priority,
        description,
        completed
    } = req.body;

    if (!user_email) {
        return res.status(400).json({
            success: false,
            message:
                "User email is required."
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

    const cleanEmail =
        String(user_email).trim().toLowerCase();

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
            cleanEmail,
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

app.put("/api/tasks/:id", (req, res) => {
    const taskId =
        String(req.params.id).trim();

    const {
        user_email,
        name,
        subject,
        date,
        priority,
        description,
        completed
    } = req.body;

    if (!taskId) {
        return res.status(400).json({
            success: false,
            message:
                "Invalid task ID."
        });
    }

    if (!user_email) {
        return res.status(400).json({
            success: false,
            message:
                "User email is required."
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

    const cleanEmail =
        String(user_email).trim().toLowerCase();

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
            cleanEmail
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
                    cleanEmail
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

app.patch("/api/tasks/:id/toggle", (req, res) => {
    const taskId =
        String(req.params.id).trim();

    const userEmail =
        req.body.user_email;

    if (!taskId) {
        return res.status(400).json({
            success: false,
            message:
                "Invalid task ID."
        });
    }

    if (!userEmail) {
        return res.status(400).json({
            success: false,
            message:
                "User email is required."
        });
    }

    const cleanEmail =
        String(userEmail).trim().toLowerCase();

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
            cleanEmail
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
                    cleanEmail
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
// DELETE /api/tasks/:id?user_email=example@gmail.com
// ============================================================

app.delete("/api/tasks/:id", (req, res) => {
    const taskId =
        String(req.params.id).trim();

    const userEmail =
        req.query.user_email ||
        req.body.user_email;

    if (!taskId) {
        return res.status(400).json({
            success: false,
            message:
                "Invalid task ID."
        });
    }

    if (!userEmail) {
        return res.status(400).json({
            success: false,
            message:
                "User email is required."
        });
    }

    const cleanEmail =
        String(userEmail).trim().toLowerCase();

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
            cleanEmail
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
// START SERVER
// ============================================================

app.listen(PORT, () => {
    console.log(
        `DueMate server running on http://localhost:${PORT}`
    );

    console.log(
        "Waiting for frontend requests..."
    );
});