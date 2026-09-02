let db;
const mysql = require("mysql2");

// ============================================================
// DATABASE CONNECTION
// ============================================================
// Load environment variables
require("dotenv").config();

const dbConfig = {
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "duemate",
    port: Number(process.env.DB_PORT) || 3307,
    ...(process.env.DB_SSL === "true"
        ? {
            ssl: {
                rejectUnauthorized: false
            }
        }
        : {})
};

// Force MySQL for the DueMate application.
// SQLite was introduced as a regression and is intentionally not used here.
db = mysql.createConnection(dbConfig);

db.connect((err) => {
    if (err) {
        console.error("MySQL connection failed:", err.message);
        process.exit(1);
    }

    console.log("MySQL connected successfully!");
    initializeMySQLSchema(db);
});

// MySQL Schema initialization
function initializeMySQLSchema(db) {
    db.query(`
        CREATE TABLE IF NOT EXISTS \`users\` (
            id int NOT NULL AUTO_INCREMENT,
            name varchar(255) NOT NULL,
            college varchar(255) DEFAULT NULL,
            department varchar(255) DEFAULT NULL,
            course varchar(255) DEFAULT NULL,
            year varchar(10) DEFAULT NULL,
            email varchar(255) NOT NULL UNIQUE,
            mobile varchar(15) DEFAULT NULL UNIQUE,
            password varchar(255) NOT NULL,
            theme varchar(20) DEFAULT 'system',
            student_id varchar(100) DEFAULT NULL,
            semester varchar(50) DEFAULT NULL,
            reset_token varchar(255) DEFAULT NULL,
            reset_token_expiry datetime DEFAULT NULL,
            created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY email (email),
            KEY idx_users_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    db.query(`
        CREATE TABLE IF NOT EXISTS \`tasks\` (
            id varchar(100) NOT NULL,
            user_email varchar(255) NOT NULL,
            name varchar(255) NOT NULL,
            subject varchar(255) DEFAULT NULL,
            task_date date NOT NULL,
            priority varchar(20) DEFAULT 'medium',
            description text DEFAULT NULL,
            completed tinyint(1) DEFAULT 0,
            group_id varchar(100) DEFAULT NULL,
            created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_tasks_user_email (user_email),
            KEY idx_tasks_task_date (task_date),
            KEY idx_tasks_group_id (group_id),
            CONSTRAINT fk_tasks_group FOREIGN KEY (group_id) REFERENCES \`groups\` (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    db.query(`
        CREATE TABLE IF NOT EXISTS \`groups\` (
            id varchar(100) NOT NULL,
            owner_email varchar(255) NOT NULL,
            name varchar(255) NOT NULL,
            purpose text NOT NULL,
            minimum_members int NOT NULL DEFAULT 2,
            maximum_members int NOT NULL DEFAULT 5,
            join_code varchar(32) NOT NULL,
            created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY join_code (join_code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    db.query(`
        CREATE TABLE IF NOT EXISTS \`group_members\` (
            group_id varchar(100) NOT NULL,
            user_email varchar(255) NOT NULL,
            role varchar(20) NOT NULL DEFAULT 'member',
            joined_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (group_id, user_email),
            CONSTRAINT fk_group_members_group FOREIGN KEY (group_id) REFERENCES \`groups\` (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    db.query(`
        CREATE TABLE IF NOT EXISTS \`group_join_requests\` (
            id varchar(100) NOT NULL,
            group_id varchar(100) NOT NULL,
            user_email varchar(255) NOT NULL,
            status varchar(20) NOT NULL DEFAULT 'pending',
            created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id), UNIQUE KEY request_unique (group_id, user_email),
            CONSTRAINT fk_join_requests_group FOREIGN KEY (group_id) REFERENCES \`groups\` (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    db.query(`
        CREATE TABLE IF NOT EXISTS \`group_rules\` (
            group_id varchar(100) NOT NULL,
            rules text NOT NULL,
            updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (group_id),
            CONSTRAINT fk_group_rules_group FOREIGN KEY (group_id) REFERENCES \`groups\` (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    db.query(`
        CREATE TABLE IF NOT EXISTS \`group_challenges\` (
            id varchar(100) NOT NULL,
            group_id varchar(100) NOT NULL,
            created_by varchar(255) NOT NULL,
            title varchar(255) NOT NULL,
            description text NOT NULL,
            points int NOT NULL DEFAULT 0,
            start_date date NOT NULL,
            end_date date NOT NULL,
            created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            CONSTRAINT fk_group_challenges_group FOREIGN KEY (group_id) REFERENCES \`groups\` (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    db.query(`
        CREATE TABLE IF NOT EXISTS \`group_game_results\` (
            id varchar(100) NOT NULL,
            group_id varchar(100) NOT NULL,
            user_email varchar(255) NOT NULL,
            game_name varchar(100) NOT NULL,
            score int NOT NULL DEFAULT 0,
            points int NOT NULL DEFAULT 0,
            played_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            CONSTRAINT fk_game_results_group FOREIGN KEY (group_id) REFERENCES \`groups\` (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    db.query(`
        CREATE TABLE IF NOT EXISTS \`notifications\` (
            id varchar(100) NOT NULL,
            user_email varchar(255) NOT NULL,
            type varchar(50) NOT NULL,
            title varchar(255) NOT NULL,
            message text NOT NULL,
            related_id varchar(100) DEFAULT NULL,
            related_type varchar(50) DEFAULT NULL,
            read_status tinyint(1) DEFAULT 0,
            created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_notifications_user_email (user_email),
            KEY idx_notifications_read (read_status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    db.query(`
        CREATE TABLE IF NOT EXISTS \`subjects\` (
            id varchar(100) NOT NULL,
            user_email varchar(255) NOT NULL,
            name varchar(255) NOT NULL,
            code varchar(50) DEFAULT NULL,
            color varchar(20) DEFAULT '#5d9cff',
            description text DEFAULT NULL,
            created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_subjects_user_email (user_email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    db.query(`
        CREATE TABLE IF NOT EXISTS \`subject_notes\` (
            id varchar(100) NOT NULL,
            subject_id varchar(100) NOT NULL,
            user_email varchar(255) NOT NULL,
            title varchar(255) NOT NULL,
            content text DEFAULT NULL,
            note_type varchar(50) DEFAULT 'text',
            created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_notes_subject_id (subject_id),
            KEY idx_notes_user_email (user_email),
            CONSTRAINT fk_notes_subject FOREIGN KEY (subject_id) REFERENCES \`subjects\` (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    db.query(`
        CREATE TABLE IF NOT EXISTS \`subject_note_files\` (
            id varchar(100) NOT NULL,
            note_id varchar(100) NOT NULL,
            user_email varchar(255) NOT NULL,
            file_name varchar(255) NOT NULL,
            file_path varchar(500) NOT NULL,
            file_size int DEFAULT 0,
            file_type varchar(100) DEFAULT NULL,
            uploaded_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_files_note_id (note_id),
            KEY idx_files_user_email (user_email),
            CONSTRAINT fk_files_note FOREIGN KEY (note_id) REFERENCES \`subject_notes\` (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    db.query(`
        CREATE TABLE IF NOT EXISTS \`group_files\` (
            id varchar(100) NOT NULL,
            group_id varchar(100) NOT NULL,
            uploaded_by varchar(255) NOT NULL,
            file_name varchar(255) NOT NULL,
            file_path varchar(500) NOT NULL,
            file_size int DEFAULT 0,
            file_type varchar(100) DEFAULT NULL,
            uploaded_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_group_files_group_id (group_id),
            CONSTRAINT fk_group_files_group FOREIGN KEY (group_id) REFERENCES \`groups\` (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    db.query(`
        CREATE TABLE IF NOT EXISTS \`user_settings\` (
            id varchar(100) NOT NULL,
            user_email varchar(255) NOT NULL UNIQUE,
            theme varchar(50) DEFAULT 'light',
            language varchar(20) DEFAULT 'en',
            start_page varchar(50) DEFAULT 'dashboard',
            notification_sound tinyint(1) DEFAULT 1,
            notification_desktop tinyint(1) DEFAULT 1,
            notification_email tinyint(1) DEFAULT 0,
            task_notifications tinyint(1) DEFAULT 1,
            group_notifications tinyint(1) DEFAULT 1,
            created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY email (user_email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    db.query(`
        CREATE TABLE IF NOT EXISTS \`user_badges\` (
            id varchar(100) NOT NULL,
            user_email varchar(255) NOT NULL,
            badge_name varchar(100) NOT NULL,
            badge_type varchar(50) NOT NULL,
            earned_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_badges_user_email (user_email),
            UNIQUE KEY badge_unique (user_email, badge_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    db.query(`
        CREATE TABLE IF NOT EXISTS \`user_streaks\` (
            id varchar(100) NOT NULL,
            user_email varchar(255) NOT NULL,
            activity_type varchar(50) NOT NULL,
            current_streak int DEFAULT 0,
            best_streak int DEFAULT 0,
            last_activity_date date DEFAULT NULL,
            updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY streak_unique (user_email, activity_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
}

// SQLite Schema initialization
function initializeSQLiteSchema(db) {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        college TEXT,
        department TEXT,
        course TEXT,
        year TEXT,
        email TEXT NOT NULL UNIQUE,
        mobile TEXT UNIQUE,
        password TEXT NOT NULL,
        theme TEXT DEFAULT 'system',
        student_id TEXT,
        semester TEXT,
        reset_token TEXT,
        reset_token_expiry DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tasks table
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        user_email TEXT NOT NULL,
        name TEXT NOT NULL,
        subject TEXT,
        task_date DATE NOT NULL,
        priority TEXT DEFAULT 'medium',
        description TEXT,
        completed INTEGER DEFAULT 0,
        group_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Groups table  
    db.run(`CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        owner_email TEXT NOT NULL,
        name TEXT NOT NULL,
        purpose TEXT NOT NULL,
        minimum_members INTEGER DEFAULT 2,
        maximum_members INTEGER DEFAULT 5,
        join_code TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Group members table
    db.run(`CREATE TABLE IF NOT EXISTS group_members (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        user_email TEXT NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(group_id, user_email)
    )`);

    // Subjects table
    db.run(`CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        user_email TEXT NOT NULL,
        name TEXT NOT NULL,
        code TEXT,
        credits INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Subject notes table
    db.run(`CREATE TABLE IF NOT EXISTS subject_notes (
        id TEXT PRIMARY KEY,
        subject_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Subject note files table
    db.run(`CREATE TABLE IF NOT EXISTS subject_note_files (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        file_type TEXT,
        uploaded_by TEXT,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Group files table
    db.run(`CREATE TABLE IF NOT EXISTS group_files (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        file_type TEXT,
        uploaded_by TEXT,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Game scores table
    db.run(`CREATE TABLE IF NOT EXISTS game_scores (
        id TEXT PRIMARY KEY,
        user_email TEXT NOT NULL,
        game_name TEXT NOT NULL,
        score INTEGER NOT NULL,
        group_id TEXT,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Notifications table
    db.run(`CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_email TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // User settings table
    db.run(`CREATE TABLE IF NOT EXISTS user_settings (
        user_email TEXT PRIMARY KEY,
        theme TEXT DEFAULT 'dark',
        language TEXT DEFAULT 'en',
        start_page TEXT DEFAULT 'dashboard',
        compact_interface INTEGER DEFAULT 0,
        notification_prefs TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // User badges table
    db.run(`CREATE TABLE IF NOT EXISTS user_badges (
        id TEXT PRIMARY KEY,
        user_email TEXT NOT NULL,
        badge_name TEXT NOT NULL,
        badge_type TEXT NOT NULL,
        earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_email, badge_name)
    )`);

    // User streaks table
    db.run(`CREATE TABLE IF NOT EXISTS user_streaks (
        id TEXT PRIMARY KEY,
        user_email TEXT NOT NULL,
        activity_type TEXT NOT NULL,
        current_streak INTEGER DEFAULT 0,
        best_streak INTEGER DEFAULT 0,
        last_activity_date DATE,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_email, activity_type)
    )`);

    console.log("✓ SQLite tables initialized");
}

module.exports = db;