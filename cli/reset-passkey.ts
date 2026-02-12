import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || './data/magic-link.db';

function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: node reset-passkey.js <email>');
    console.error('');
    console.error('This will delete all passkey credentials for the user,');
    console.error('requiring them to register a new passkey on next login.');
    process.exit(1);
  }

  const sqlite = new Database(DB_PATH);
  sqlite.pragma('foreign_keys = ON');

  // Find user
  const user = sqlite
    .prepare('SELECT id, email, display_name FROM users WHERE email = ?')
    .get(email.toLowerCase()) as { id: string; email: string; display_name: string } | undefined;

  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  console.log(`Found user: ${user.email} (${user.display_name || 'no display name'})`);

  // Count credentials
  const credentialCount = sqlite
    .prepare('SELECT COUNT(*) as count FROM credentials WHERE user_id = ?')
    .get(user.id) as { count: number };

  if (credentialCount.count === 0) {
    console.log('User has no registered passkeys.');
    process.exit(0);
  }

  console.log(`Deleting ${credentialCount.count} passkey credential(s)...`);

  // Delete credentials
  const result = sqlite
    .prepare('DELETE FROM credentials WHERE user_id = ?')
    .run(user.id);

  console.log(`Deleted ${result.changes} credential(s).`);

  // Also delete active sessions to force re-authentication
  const sessionResult = sqlite
    .prepare('DELETE FROM sessions WHERE user_id = ?')
    .run(user.id);

  console.log(`Deleted ${sessionResult.changes} session(s).`);
  console.log('');
  console.log('User will need to register a new passkey on next login.');
  console.log('They can use the admin invite flow or contact an admin for a new invite.');

  sqlite.close();
}

main();
