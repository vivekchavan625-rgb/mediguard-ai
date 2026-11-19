import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './index';

async function runMigrations() {
  console.log('🔄 Running database migrations...');

  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigrations().catch(() => process.exit(1));