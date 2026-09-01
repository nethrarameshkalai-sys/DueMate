const mysql = require("mysql2");
require("dotenv").config();

// Try to connect with different auth methods
async function setupDatabase() {
    const credentials = [
        {
            host: process.env.DB_HOST || "localhost",
            user: process.env.DB_USER || "root",
            password: process.env.DB_PASSWORD || "",
            port: Number(process.env.DB_PORT) || 3306,
            authPlugins: { mysql_native_password: () => () => process.env.DB_PASSWORD || "" }
        },
        {
            host: process.env.DB_HOST || "localhost",
            user: "root",
            password: "",
            port: Number(process.env.DB_PORT) || 3306
        },
        {
            host: process.env.DB_HOST || "localhost",
            user: "root",
            password: "root",
            port: Number(process.env.DB_PORT) || 3306
        }
    ];

    let connection = null;

    // Try each credential set
    for (let cred of credentials) {
        try {
            console.log(`Attempting connection as ${cred.user}@${cred.host}...`);
            
            connection = mysql.createConnection(cred);
            
            await new Promise((resolve, reject) => {
                connection.connect((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });

            console.log("✓ Connection successful!");
            break;
        } catch (err) {
            console.log(`✗ Failed: ${err.message.split('\n')[0]}`);
            if (connection) connection.end();
            connection = null;
        }
    }

    if (!connection) {
        console.error("\n❌ Could not connect to MySQL with any credentials.");
        console.error("Please ensure MySQL is running and update .env with correct credentials.");
        process.exit(1);
    }

    // Create database
    const dbName = process.env.DB_NAME || "DueMate";
    return new Promise((resolve, reject) => {
        connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``, (err) => {
            if (err) {
                console.error("Failed to create database:", err.message);
                connection.end();
                reject(err);
            } else {
                console.log(`✓ Database '${dbName}' ready!`);

                // Load the main DB module which will create tables
                try {
                    require("./config/db.js");
                    console.log("✓ Database initialization complete!");
                    connection.end();
                    resolve();
                } catch (err) {
                    console.error("Failed to initialize database schema:", err.message);
                    connection.end();
                    reject(err);
                }
            }
        });
    });
}

setupDatabase()
    .then(() => {
        console.log("\n✓ Ready to start server with: npm start");
    })
    .catch((err) => {
        console.error("\n❌ Setup failed:", err.message);
        process.exit(1);
    });

