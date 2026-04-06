require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function init() {
  try {
    const sqlDir = path.join(__dirname, '..', '..', 'sql');
    const files = fs.readdirSync(sqlDir).filter(f => f.endsWith('.sql')).sort();
    
    for (const file of files) {
      console.log(`Running ${file}...`);
      const sql = fs.readFileSync(path.join(sqlDir, file), 'utf8');
      await pool.query(sql);
      console.log(`✅ ${file} done`);
    }
    
    console.log('✅ Database initialized');
    process.exit(0);
  } catch (err) {
    console.error('❌ DB init error:', err.message);
    process.exit(1);
  }
}

init();
