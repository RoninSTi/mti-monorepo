import { Pool } from 'pg';
import { databaseConfig } from './config';
import { encryptPassword, getEncryptionKey } from '../utils/encryption';

async function seed() {
  const pool = new Pool({
    host: databaseConfig.DATABASE_HOST,
    port: databaseConfig.DATABASE_PORT,
    database: databaseConfig.DATABASE_NAME,
    user: databaseConfig.DATABASE_USER,
    password: databaseConfig.DATABASE_PASSWORD,
  });

  try {
    console.log('Starting database seed...');

    // Encrypt seed password with AES-256-GCM
    // Requires ENCRYPTION_KEY environment variable to be set
    // Generate key with: openssl rand -base64 32
    const encryptionKey = getEncryptionKey();
    const encrypted = encryptPassword('admin123', encryptionKey);
    const encryptedPasswordJson = JSON.stringify(encrypted);

    // Use a transaction to ensure atomicity
    await pool.query('BEGIN');

    // Clear existing data (reverse FK order)
    console.log('Clearing existing data...');
    await pool.query('TRUNCATE TABLE gateways, factories, organizations CASCADE');

    // Seed organization
    console.log('Seeding organization...');
    const orgResult = await pool.query(
      `INSERT INTO organizations (name, metadata)
       VALUES ($1, $2)
       RETURNING id`,
      ['Acme Manufacturing', JSON.stringify({ industry: 'Manufacturing', founded: 1995 })]
    );
    const orgId = orgResult.rows[0].id;
    console.log('Seeded 1 organization');

    // Seed factories
    console.log('Seeding factories...');
    const factoryResults = await pool.query(
      `INSERT INTO factories (organization_id, name, location, timezone, metadata)
       VALUES
         ($1, $2, $3, $4, $5),
         ($1, $6, $7, $8, $9),
         ($1, $10, $11, $12, $13)
       RETURNING id, name`,
      [
        orgId,
        // Springfield Plant
        'Springfield Plant',
        'Building 3, Springfield, IL',
        'America/Chicago',
        JSON.stringify({ manager: 'John Smith', phone: '555-0101' }),
        // Detroit Assembly
        'Detroit Assembly',
        '1200 Industrial Pkwy, Detroit, MI',
        'America/Detroit',
        JSON.stringify({
          shifts: ['6am-2pm', '2pm-10pm', '10pm-6am'],
          capacity: 5000
        }),
        // Austin Facility
        'Austin Facility',
        '500 Tech Blvd, Austin, TX',
        'America/Chicago',
        JSON.stringify({ type: 'R&D' }),
      ]
    );
    const factories = factoryResults.rows;
    console.log('Seeded 3 factories');

    // Seed gateways (2 per factory)
    console.log('Seeding gateways...');

    await pool.query(
      `INSERT INTO gateways (
         factory_id, gateway_id, name, url, email, password_encrypted,
         model, firmware_version, last_seen_at, metadata
       )
       VALUES
         -- Springfield Plant gateways
         ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10),
         ($1, $11, $12, $13, $5, $6, $14, $15, NULL, $16),

         -- Detroit Assembly gateways
         ($17, $18, $19, $20, $5, $6, $7, $21, NOW() - INTERVAL '5 minutes', $22),
         ($17, $23, $24, $25, $5, $6, $14, $8, NOW() - INTERVAL '1 hour', $26),

         -- Austin Facility gateways
         ($27, $28, $29, $30, $5, $6, $7, $15, NOW() - INTERVAL '30 minutes', $31),
         ($27, $32, $33, $34, $5, $6, $14, $21, NULL, $35)`,
      [
        // Springfield Plant (factory_id = factories[0].id)
        factories[0].id,
        'GW-SPR-001',
        'North Wing Gateway',
        'ws://192.168.1.100:5000',
        'admin@example.com',
        encryptedPasswordJson,
        'CTC-GW-100',
        'v2.1.0',
        new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        JSON.stringify({ zone: 'North Wing', floor: 1 }),
        'GW-SPR-002',
        'South Wing Gateway',
        'ws://192.168.1.101:5000',
        'CTC-GW-200',
        'v2.2.1',
        JSON.stringify({ zone: 'South Wing', floor: 2 }),

        // Detroit Assembly (factory_id = factories[1].id)
        factories[1].id,
        'GW-DET-001',
        'Main Floor Gateway',
        'ws://192.168.2.100:5000',
        'v2.0.5',
        JSON.stringify({ area: 'Main Floor', line: 'A' }),
        'GW-DET-002',
        'Assembly Line Gateway',
        'ws://192.168.2.101:5000',
        JSON.stringify({ area: 'Assembly', line: 'B' }),

        // Austin Facility (factory_id = factories[2].id)
        factories[2].id,
        'GW-AUS-001',
        'Lab Gateway',
        'ws://192.168.3.100:5000',
        JSON.stringify({ room: 'Lab 5A' }),
        'GW-AUS-002',
        'Server Room Gateway',
        'ws://192.168.3.101:5000',
        JSON.stringify({ room: 'Server Room', rack: 'R1' }),
      ]
    );
    console.log('Seeded 6 gateways');

    await pool.query('COMMIT');
    console.log('Database seed complete!');
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run seed
seed().catch((error) => {
  console.error('Seed script failed:', error);
  process.exit(1);
});
