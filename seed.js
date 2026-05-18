const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const hash = await bcrypt.hash('admin123', 12);
  
  const result = await pool.query(
    `INSERT INTO users (id, email, password_hash, role, is_active, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, true, NOW(), NOW())
     ON CONFLICT (email) DO NOTHING
     RETURNING id, email, role`,
    ['admin@mipl.com', hash, 'SUPER_ADMIN']
  );
  
  if (result.rows.length > 0) {
    console.log('Seeded admin user:', result.rows[0]);
  } else {
    console.log('Admin user already exists.');
  }
  
  await pool.end();
}

seed().catch(e => { console.error(e); process.exit(1); });
