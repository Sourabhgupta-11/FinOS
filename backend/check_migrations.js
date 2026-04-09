const db = require('./src/db/index.js');
db.all('SELECT * FROM schema_migrations ORDER BY executed_at DESC LIMIT 5;', [], (err, rows) => {
  if(err) { console.error('Error:', err.message); }
  else { console.log(JSON.stringify(rows, null, 2)); }
  process.exit(0);
});
