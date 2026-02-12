import crypto from 'crypto';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export const config = {
  // Required
  fastmail: {
    username: requireEnv('FASTMAIL_USERNAME'),
    appPassword: requireEnv('FASTMAIL_APP_PASSWORD'),
    domain: requireEnv('FASTMAIL_DOMAIN'),
  },
  adminEmail: requireEnv('ADMIN_EMAIL'),

  // Optional with defaults
  port: parseInt(optionalEnv('PORT', '3000'), 10),
  sessionSecret: optionalEnv('SESSION_SECRET', crypto.randomBytes(32).toString('hex')),
  pollIntervalMs: parseInt(optionalEnv('POLL_INTERVAL_MS', '30000'), 10),
  linkRetentionHours: parseInt(optionalEnv('LINK_RETENTION_HOURS', '24'), 10),

  // Passkey config
  rpId: optionalEnv('RP_ID', 'localhost'),
  rpName: optionalEnv('RP_NAME', 'Magic Link'),
  origin: optionalEnv('ORIGIN', 'http://localhost:3000'),

  // Database
  dbPath: optionalEnv('DB_PATH', './data/magic-link.db'),
};
