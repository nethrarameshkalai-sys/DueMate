const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, "../data");
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "duemate.db");
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("SQLite connection failed:", err.message);
        process.exit(1);
    } else {
        console.log("SQLite connected successfully at", dbPath);
    }
});

// Enable foreign keys
db.run("PRAGMA foreign_keys = ON");

// Wrapper to make SQLite API compatible with mysql2 callback style
db.queryPromise = function(sql, params = []) {
    return new Promise((resolve, reject) => {
        if (sql.trim().toUpperCase().startsWith("SELECT")) {
            this.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        } else if (sql.trim().toUpperCase().startsWith("INSERT")) {
            this.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ insertId: this.lastID, affectedRows: this.changes });
            });
        } else if (sql.trim().toUpperCase().startsWith("UPDATE")) {
            this.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ affectedRows: this.changes });
            });
        } else if (sql.trim().toUpperCase().startsWith("DELETE")) {
            this.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ affectedRows: this.changes });
            });
        } else {
            this.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ affectedRows: this.changes });
            });
        }
    });
};

// Also provide callback-style query for compatibility
db.query = function(sql, params, callback) {
    if (typeof params === "function") {
        callback = params;
        params = [];
    }

    if (sql.trim().toUpperCase().startsWith("SELECT")) {
        this.all(sql, params, (err, rows) => {
            callback(err, rows || []);
        });
    } else {
        this.run(sql, params, function(err) {
            if (callback) {
                callback(err, {
                    insertId: this.lastID,
                    affectedRows: this.changes
                });
            }
        });
    }
};

module.exports = db;
