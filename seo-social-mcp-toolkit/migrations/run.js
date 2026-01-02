import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const DATABASE_URL = process.env.DATABASE_URL || 'postgres://seo_toolkit:seo_toolkit_pass@localhost:5432/seo_toolkit';

  console.log('🔄 Running database migrations...');
  console.log('📦 Database:', DATABASE_URL.replace(/:[^:]*@/, ':****@'));

  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '001_init.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Executing migration: 001_init.sql');

    // Execute migration
    await pool.query(migrationSQL);

    console.log('✅ Migrations completed successfully');

    // Verify tables
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\n📊 Database tables:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
