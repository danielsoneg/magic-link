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
      received_at TEXT DEFAULT CURRENT_TIMESTAMP
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
