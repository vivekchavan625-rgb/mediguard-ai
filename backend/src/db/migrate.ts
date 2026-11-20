import { initializeDb } from './index';

async function runMigrations() {
  console.log('🔄 Initializing database schema...');

  try {
    await initializeDb();
    console.log('✅ Database schema initialized successfully');
  } catch (error) {
    console.error('❌ Schema initialization failed:', error);
    process.exit(1);
  }
}

runMigrations();
