import pg from 'pg';
import bcrypt from 'bcryptjs';
import { config } from '../config/config.js';
import { INITIAL_MOCK_REPORTS } from '../data/mock-data.js';

async function seedDatabase() {
  console.log('🌱 Starting CalleFix Database Seeder on isolated port 5488...');
  console.log(`📡 Connecting to: ${config.databaseUrl}`);

  const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    connectionTimeoutMillis: 5000,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL successfully!');

    // 1. Create Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        phone_number TEXT,
        role VARCHAR(32) NOT NULL DEFAULT 'User',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Create Reports Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id VARCHAR(64) PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(64) NOT NULL,
        address TEXT NOT NULL,
        neighborhood VARCHAR(64),
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'Submitted',
        priority VARCHAR(32) NOT NULL DEFAULT 'Medium',
        user_id VARCHAR(64) NOT NULL,
        user_full_name TEXT,
        user_email TEXT,
        image_url TEXT NOT NULL,
        attachments JSONB DEFAULT '[]'::jsonb,
        status_history JSONB DEFAULT '[]'::jsonb,
        duplicate_count INT DEFAULT 1,
        cluster_id VARCHAR(64),
        ai_confidence DOUBLE PRECISION,
        ai_detected_category VARCHAR(64),
        resolution_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ,
        submissions JSONB DEFAULT '[]'::jsonb
      );
    `);

    // 3. Seed Users
    const adminPass = bcrypt.hashSync('Admin123!', 10);
    const userPass = bcrypt.hashSync('Vecino123!', 10);

    const defaultUsers = [
      {
        id: 'USR-ADMIN-01',
        fullName: 'Marta Gómez (Técnica Municipal)',
        email: 'admin@callefix.malaga.es',
        passwordHash: adminPass,
        phoneNumber: '+34 951 92 60 10',
        role: 'Administrator',
      },
      {
        id: 'USR-VECINO-01',
        fullName: 'Carlos Moreno',
        email: 'vecino@malaga.es',
        passwordHash: userPass,
        phoneNumber: '+34 612 34 56 78',
        role: 'User',
      },
      {
        id: 'USR-VECINO-02',
        fullName: 'Elena Ramos',
        email: 'elena.ramos@ejemplo.es',
        passwordHash: userPass,
        phoneNumber: '+34 689 11 22 33',
        role: 'User',
      }
    ];

    for (const u of defaultUsers) {
      await client.query(
        `INSERT INTO users (id, full_name, email, password_hash, phone_number, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)
         ON CONFLICT (email) DO NOTHING`,
        [u.id, u.fullName, u.email, u.passwordHash, u.phoneNumber, u.role]
      );
    }
    console.log(`👤 Seeded ${defaultUsers.length} initial users into 'users' table.`);

    // 4. Seed Reports
    for (const r of INITIAL_MOCK_REPORTS) {
      await client.query(
        `INSERT INTO reports (id, title, description, category, address, neighborhood, latitude, longitude, status, priority, user_id, user_full_name, user_email, image_url, attachments, status_history, duplicate_count, cluster_id, ai_confidence, ai_detected_category, resolution_notes, created_at, updated_at, resolved_at, submissions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           priority = EXCLUDED.priority,
           duplicate_count = EXCLUDED.duplicate_count,
           updated_at = EXCLUDED.updated_at,
           status_history = EXCLUDED.status_history`,
        [
          r.id, r.title, r.description, r.category, r.address, r.neighborhood || '',
          r.latitude, r.longitude, r.status, r.priority, r.userId, r.userFullName || '',
          r.userEmail || '', r.imageUrl, JSON.stringify(r.attachments || []), JSON.stringify(r.statusHistory || []),
          r.duplicateCount, r.clusterId, r.aiConfidence || null, r.aiDetectedCategory || null,
          r.resolutionNotes || null, r.createdAt, r.updatedAt, r.resolvedAt || null, JSON.stringify(r.submissions || [])
        ]
      );
    }
    console.log(`📋 Seeded ${INITIAL_MOCK_REPORTS.length} realistic road incidents into 'reports' table.`);

    client.release();
    await pool.end();
    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeder execution error:', error);
    await pool.end();
  }
}

seedDatabase();
