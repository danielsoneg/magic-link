import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { db, schema } from '../db/index.js';
import { eq, and, gt } from 'drizzle-orm';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      displayName: string | null;
      isAdmin: boolean;
    };
  }
}

async function authenticateByApiKey(request: FastifyRequest): Promise<boolean> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return false;

  const token = authHeader.slice(7);
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const apiKey = await db.query.apiKeys.findFirst({
    where: eq(schema.apiKeys.tokenHash, tokenHash),
  });

  if (!apiKey) return false;

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, apiKey.userId),
  });

  if (!user) return false;

  // Update last_used_at (synchronous with better-sqlite3)
  db.update(schema.apiKeys)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(schema.apiKeys.id, apiKey.id))
    .run();

  request.user = {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    isAdmin: user.isAdmin ?? false,
  };

  return true;
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const sessionId = request.cookies.session;

  if (!sessionId) {
    const authenticated = await authenticateByApiKey(request);
    if (authenticated) return;
    reply.status(401).send({ error: 'Not authenticated' });
    return;
  }

  const now = new Date().toISOString();
  const session = await db.query.sessions.findFirst({
    where: and(
      eq(schema.sessions.id, sessionId),
      gt(schema.sessions.expiresAt, now)
    ),
  });

  if (!session) {
    reply.clearCookie('session');
    reply.status(401).send({ error: 'Session expired' });
    return;
  }

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, session.userId),
  });

  if (!user) {
    reply.clearCookie('session');
    reply.status(401).send({ error: 'User not found' });
    return;
  }

  request.user = {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    isAdmin: user.isAdmin ?? false,
  };
}

export async function adminMiddleware(request: FastifyRequest, reply: FastifyReply) {
  await authMiddleware(request, reply);

  if (reply.sent) return;

  if (!request.user?.isAdmin) {
    reply.status(403).send({ error: 'Admin access required' });
    return;
  }
}

export async function optionalAuthMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  const sessionId = request.cookies.session;

  if (!sessionId) {
    await authenticateByApiKey(request);
    return;
  }

  const now = new Date().toISOString();
  const session = await db.query.sessions.findFirst({
    where: and(
      eq(schema.sessions.id, sessionId),
      gt(schema.sessions.expiresAt, now)
    ),
  });

  if (!session) {
    return;
  }

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, session.userId),
  });

  if (user) {
    request.user = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isAdmin: user.isAdmin ?? false,
    };
  }
}
