import { execSync } from 'child_process';
import { Pool } from 'pg';
import { databaseConfig, DATABASE_URL } from './config';

async function resetDatabase() {
  // Connect to the default postgres database (not the app database)
  // because we can't drop a database we're connected to
  const pool = new Pool({
    host: databaseConfig.DATABASE_HOST,
    port: databaseConfig.DATABASE_PORT,
    database: 'postgres', // Connect to default database
    user: databaseConfig.DATABASE_USER,
    password: databaseConfig.DATABASE_PASSWORD,
  });

  try {
    console.log('Starting database reset...');

    // Drop the application database if it exists
    console.log(`Dropping database '${databaseConfig.DATABASE_NAME}' if exists...`);
    await pool.query(`DROP DATABASE IF EXISTS ${databaseConfig.DATABASE_NAME}`);

    // Create the application database
    console.log(`Creating database '${databaseConfig.DATABASE_NAME}'...`);
    await pool.query(`CREATE DATABASE ${databaseConfig.DATABASE_NAME}`);

    // Close the connection to the default database
    await pool.end();

    // Run migrations
    console.log('Running migrations...');
    execSync('npm run db:migrate', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL
      }
    });

    // Run seed
    console.log('Running seed...');
    execSync('npm run db:seed', { stdio: 'inherit' });

    console.log('\n✓ Database reset complete!');
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
}

// Run reset
resetDatabase().catch((error) => {
  console.error('Reset script failed:', error);
  process.exit(1);
});
