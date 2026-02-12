import { FastifyInstance } from 'fastify';
import { db, schema } from '../db/index.js';
import { eq, ne } from 'drizzle-orm';
import { adminMiddleware } from '../middleware/auth.js';

export async function usersRoutes(app: FastifyInstance) {
  // List all users (admin only)
  app.get('/api/users', { preHandler: adminMiddleware }, async () => {
    const users = await db.query.users.findMany({
      columns: {
        id: true,
        email: true,
        displayName: true,
        isAdmin: true,
        createdAt: true,
      },
    });

    // Get credential count for each user
    const usersWithCredentials = await Promise.all(
      users.map(async (user) => {
        const credentials = await db.query.credentials.findMany({
          where: eq(schema.credentials.userId, user.id),
        });
        return {
          ...user,
          credentialCount: credentials.length,
        };
      })
    );

    return { users: usersWithCredentials };
  });

  // Delete user (admin only)
  app.delete<{
    Params: { id: string };
  }>('/api/users/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params;

    // Prevent deleting yourself
    if (id === request.user!.id) {
      return reply.status(400).send({ error: 'Cannot delete yourself' });
    }

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, id),
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // Delete user (cascades to credentials, sessions)
    await db.delete(schema.users).where(eq(schema.users.id, id));

    return { success: true };
  });

  // Reset user's passkeys (admin only)
  app.post<{
    Params: { id: string };
  }>('/api/users/:id/reset', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params;

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, id),
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // Delete all credentials
    await db.delete(schema.credentials).where(eq(schema.credentials.userId, id));

    // Delete all sessions (force re-login)
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));

    return { success: true };
  });
}
