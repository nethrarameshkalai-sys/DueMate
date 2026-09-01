const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./data/duemate.db', (err) => {
  if (err) {
    console.error('Database error:', err);
    process.exit(1);
  }
});

// Check all 13 required tables exist
const requiredTables = [
  'users', 'tasks', 'subjects', 'subject_notes', 'subject_note_files',
  'groups', 'group_members', 'group_files', 'notifications',
  'user_settings', 'game_scores', 'user_badges', 'user_streaks'
];

console.log('=== DATABASE SCHEMA VERIFICATION ===\n');

db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", [], (err, tables) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }

  const tableNames = tables.map(t => t.name).filter(n => n !== 'sqlite_sequence');
  console.log('Tables Found:', tableNames.length);
  
  const missing = requiredTables.filter(t => !tableNames.includes(t));
  const extra = tableNames.filter(t => !requiredTables.includes(t));

  console.log('\n✓ All 13 Required Tables:');
  requiredTables.forEach(t => {
    const found = tableNames.includes(t);
    console.log(`  ${found ? '✓' : '✗'} ${t}`);
  });

  if (missing.length > 0) {
    console.log('\n✗ Missing Tables:', missing);
  }

  if (extra.length > 0) {
    console.log('\n⚠ Extra Tables:', extra);
  }

  // Check user schema
  console.log('\n=== USER TABLE SCHEMA ===');
  db.all("PRAGMA table_info(users)", [], (err, columns) => {
    if (err) {
      console.error('Error:', err);
    } else {
      columns.forEach(col => {
        console.log(`  - ${col.name} (${col.type})`);
      });
    }

    // Check task schema
    console.log('\n=== TASK TABLE SCHEMA ===');
    db.all("PRAGMA table_info(tasks)", [], (err, columns) => {
      if (err) {
        console.error('Error:', err);
      } else {
        columns.forEach(col => {
          console.log(`  - ${col.name} (${col.type})`);
        });
      }

      // Test data count
      console.log('\n=== DATA COUNT ===');
      Promise.all([
        new Promise((resolve) => {
          db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
            console.log(`  Users: ${row.count}`);
            resolve();
          });
        }),
        new Promise((resolve) => {
          db.get("SELECT COUNT(*) as count FROM tasks", (err, row) => {
            console.log(`  Tasks: ${row.count}`);
            resolve();
          });
        }),
        new Promise((resolve) => {
          db.get("SELECT COUNT(*) as count FROM subjects", (err, row) => {
            console.log(`  Subjects: ${row.count}`);
            resolve();
          });
        }),
        new Promise((resolve) => {
          db.get("SELECT COUNT(*) as count FROM groups", (err, row) => {
            console.log(`  Groups: ${row.count}`);
            resolve();
          });
        })
      ]).then(() => {
        db.close();
      });
    });
  });
});
