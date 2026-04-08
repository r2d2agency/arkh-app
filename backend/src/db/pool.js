const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Set timezone to São Paulo for all connections
pool.on('connect', (client) => {
  client.query("SET timezone = 'America/Sao_Paulo'");
});

module.exports = pool;
