const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./data/duemate.db', (err) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
});

// Check all users
db.all('SELECT id, email, name, password FROM users ORDER BY id DESC LIMIT 10', [], (err, rows) => {
  if (err) {
    console.error('Error querying users:', err);
    process.exit(1);
  }

  console.log('All Users:');
  console.log('=============');
  if (rows && rows.length > 0) {
    rows.forEach(row => {
      console.log(`ID: ${row.id}, Email: ${row.email}, Name: ${row.name}, Has Password: ${row.password ? 'YES' : 'NO'}`);
    });
  } else {
    console.log('No users found');
  }

  // Check tables
  db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", [], (err, tables) => {
    console.log('\nDatabase Tables:');
    console.log('================');
    if (tables) {
      tables.forEach(t => console.log(`- ${t.name}`));
    }
    
    db.close();
  });
});
