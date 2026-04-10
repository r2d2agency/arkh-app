const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  options: process.env.PGOPTIONS || '-c timezone=America/Sao_Paulo',
});

module.exports = pool;
