const mysql = require("mysql2");

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "spec@262745",
    database: "DueMate"
});

db.connect((err) => {

    if (err) {

        console.error(
            "MySQL connection failed:",
            err.message
        );

        return;
    }

    console.log(
        "MySQL connected successfully!"
    );

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
            created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_tasks_user_email (user_email),
            KEY idx_tasks_task_date (task_date)
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

});

module.exports = db;