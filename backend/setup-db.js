const mysql = require("mysql2/promise");
require("dotenv").config();

async function setupDatabase() {
    console.log("Attempting database setup...\n");

    // Define connection options
    const options = [
        {
            host: "localhost",
            user: "root",
            password: "",
            port: 3306,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        },
        {
            host: "127.0.0.1",
            user: "root",
            password: "",
            port: 3306,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        }
    ];

    let pool = null;

    for (const opt of options) {
        try {
            console.log(`Trying: ${opt.user}@${opt.host}:${opt.port}`);
            pool = mysql.createPool(opt);
            const conn = await pool.getConnection();
            console.log("✓ Connected!\n");
            conn.release();
            break;
        } catch (err) {
            console.log(`✗ ${err.code}: ${err.message}\n`);
            if (pool) await pool.end();
            pool = null;
        }
    }

    if (!pool) {
        console.error("❌ FATAL: Cannot connect to MySQL");
        console.error("\nTroubleshooting:");
        console.error("1. Verify MySQL is running: Get-Service MySQL80");
        console.error("2. Try with explicit password in .env:");
        console.error("   DB_PASSWORD=<your-password>");
        console.error("3. Or reset MySQL root password");
        process.exit(1);
    }

    try {
        // Create database
        const dbName = process.env.DB_NAME || "DueMate";
        const conn = await pool.getConnection();
        
        await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        console.log(`✓ Database '${dbName}' created/exists`);

        // Switch to database
        await conn.execute(`USE \`${dbName}\``);
        console.log(`✓ Using database '${dbName}'`);

        // Check existing tables
        const [tables] = await conn.execute(`
            SELECT COUNT(*) as count FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ?
        `, [dbName]);

        console.log(`✓ Found ${tables[0].count} existing tables\n`);

        conn.release();

        // Now we need to update the .env to ensure correct credentials
        if (process.env.DB_PASSWORD === "") {
            console.log("✓ Setup complete! Using empty password (no auth)");
            console.log("✓ You can now start: npm start");
        }

        await pool.end();
        process.exit(0);

    } catch (err) {
        console.error("Setup error:", err.message);
        if (pool) await pool.end();
        process.exit(1);
    }
}

setupDatabase();
