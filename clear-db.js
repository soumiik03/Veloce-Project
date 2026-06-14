const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function clear() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    console.log('Database cleared.');
  } catch(e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
clear();
