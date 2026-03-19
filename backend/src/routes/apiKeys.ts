import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { adminMiddleware } from '../middleware/auth.js';

export async function apiKeysRoutes(app: FastifyInstance) {
  // List all API keys (admin only)
  app.get('/api/api-keys', { preHandler: adminMiddleware }, async () => {
    const keys = await db.query.apiKeys.findMany();

    const keysWithUsers = await Promise.all(
      keys.map(async (key) => {
        const user = await db.query.users.findFirst({
          where: eq(schema.users.id, key.userId),
          columns: { email: true, displayName: true },
        });
        return {
          id: key.id,
          name: key.name,
          userId: key.userId,
          createdAt: key.createdAt,
          lastUsedAt: key.lastUsedAt,
          user,
        };
      })
    );

    return { apiKeys: keysWithUsers };
  });

  // Create API key for a user (admin only)
  app.post<{
    Body: { userId: string; name: string };
  }>('/api/api-keys', { preHandler: adminMiddleware }, async (request, reply) => {
    const { userId, name } = request.body;

    if (!userId || !name) {
      return reply.status(400).send({ error: 'userId and name are required' });
    }

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const rawToken = nanoid(48);
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const id = nanoid();

    await db.insert(schema.apiKeys).values({
      id,
      userId,
      tokenHash,
      name,
    });

    const apiKey = await db.query.apiKeys.findFirst({
      where: eq(schema.apiKeys.id, id),
    });

    return {
      apiKey: {
        id: apiKey!.id,
        name: apiKey!.name,
        userId: apiKey!.userId,
        createdAt: apiKey!.createdAt,
        lastUsedAt: apiKey!.lastUsedAt,
        user: { email: user.email, displayName: user.displayName },
      },
      token: rawToken,
    };
  });

  // Delete API key (admin only)
  app.delete<{
    Params: { id: string };
  }>('/api/api-keys/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params;

    const apiKey = await db.query.apiKeys.findFirst({
      where: eq(schema.apiKeys.id, id),
    });

    if (!apiKey) {
      return reply.status(404).send({ error: 'API key not found' });
    }

    await db.delete(schema.apiKeys).where(eq(schema.apiKeys.id, id));

    return { success: true };
  });
}
