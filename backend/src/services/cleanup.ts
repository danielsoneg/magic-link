import { db, schema } from '../db/index.js';
import { lt } from 'drizzle-orm';
import { config } from '../config.js';

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

async function runCleanup(): Promise<void> {
  try {
    const now = new Date();

    // Delete old magic links
    const linkCutoff = new Date(
      now.getTime() - config.linkRetentionHours * 60 * 60 * 1000
    ).toISOString();

    const deletedLinks = await db
      .delete(schema.magicLinks)
      .where(lt(schema.magicLinks.receivedAt, linkCutoff));

    // Delete expired challenges
    const deletedChallenges = await db
      .delete(schema.challenges)
      .where(lt(schema.challenges.expiresAt, now.toISOString()));

    // Delete expired sessions
    const deletedSessions = await db
      .delete(schema.sessions)
      .where(lt(schema.sessions.expiresAt, now.toISOString()));

    console.log(
      `Cleanup completed: links=${deletedLinks.changes || 0}, ` +
        `challenges=${deletedChallenges.changes || 0}, ` +
        `sessions=${deletedSessions.changes || 0}`
    );
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

export function startCleanupJob(): void {
  console.log('Starting cleanup job (interval: 1 hour)');

  // Run initial cleanup
  runCleanup();

  // Run every hour
  cleanupInterval = setInterval(runCleanup, 60 * 60 * 1000);
}

export function stopCleanupJob(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
