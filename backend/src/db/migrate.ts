import Database from 'better-sqlite3';
import { config } from '../config.js';
import fs from 'fs';
import path from 'path';

export function runMigrations() {
  // Ensure data directory exists
  const dbDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const sqlite = new Database(config.dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  // Create tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT,
      is_admin INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS credentials (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      credential_id TEXT UNIQUE NOT NULL,
      public_key TEXT NOT NULL,
      counter INTEGER DEFAULT 0,
      transports TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      display_name TEXT,
      icon_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS magic_links (
      id TEXT PRIMARY KEY,
      service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      link_url TEXT NOT NULL,
      subject TEXT,
      received_at TEXT DEFAULT CURRENT_TIMESTAMP,
      used_at TEXT,
      used_by TEXT REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS invites (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      used_at TEXT,
      used_by TEXT REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS challenges (
      id TEXT PRIMARY KEY,
      challenge TEXT NOT NULL,
      type TEXT NOT NULL,
      user_id TEXT,
      invite_token TEXT,
      expires_at TEXT NOT NULL
    );
  `);

  // Add service_url column to services (for existing databases)
  const serviceColumns = sqlite.pragma('table_info(services)') as { name: string }[];
  const serviceColumnNames = serviceColumns.map(c => c.name);
  if (!serviceColumnNames.includes('service_url')) {
    sqlite.exec(`ALTER TABLE services ADD COLUMN service_url TEXT`);
  }

  // Add used_at and used_by columns to magic_links (for existing databases)
  const columns = sqlite.pragma('table_info(magic_links)') as { name: string }[];
  const columnNames = columns.map(c => c.name);
  if (!columnNames.includes('used_at')) {
    sqlite.exec(`ALTER TABLE magic_links ADD COLUMN used_at TEXT`);
    sqlite.exec(`ALTER TABLE magic_links ADD COLUMN used_by TEXT REFERENCES users(id)`);
  }

  // Fix rows where Drizzle inserted the literal string 'CURRENT_TIMESTAMP'
  sqlite.exec(`
    UPDATE users SET created_at = datetime('now') WHERE created_at = 'CURRENT_TIMESTAMP';
    UPDATE credentials SET created_at = datetime('now') WHERE created_at = 'CURRENT_TIMESTAMP';
    UPDATE services SET created_at = datetime('now') WHERE created_at = 'CURRENT_TIMESTAMP';
    UPDATE magic_links SET received_at = datetime('now') WHERE received_at = 'CURRENT_TIMESTAMP';
    UPDATE invites SET created_at = datetime('now') WHERE created_at = 'CURRENT_TIMESTAMP';
    UPDATE sessions SET created_at = datetime('now') WHERE created_at = 'CURRENT_TIMESTAMP';
  `);

  // Create indexes for better query performance
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);
    CREATE INDEX IF NOT EXISTS idx_magic_links_service_id ON magic_links(service_id);
    CREATE INDEX IF NOT EXISTS idx_magic_links_received_at ON magic_links(received_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_challenges_expires_at ON challenges(expires_at);
  `);

  sqlite.close();
  console.log('Database migrations completed');
}
