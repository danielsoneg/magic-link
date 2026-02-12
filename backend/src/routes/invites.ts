import { FastifyInstance } from 'fastify';
import { db, schema } from '../db/index.js';
import { eq, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { adminMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';

export async function invitesRoutes(app: FastifyInstance) {
  // List all invites (admin only)
  app.get('/api/invites', { preHandler: adminMiddleware }, async () => {
    const invites = await db.query.invites.findMany();

    // Get user info for created_by and used_by
    const invitesWithUsers = await Promise.all(
      invites.map(async (invite) => {
        const createdByUser = await db.query.users.findFirst({
          where: eq(schema.users.id, invite.createdBy),
          columns: { email: true, displayName: true },
        });

        let usedByUser = null;
        if (invite.usedBy) {
          usedByUser = await db.query.users.findFirst({
            where: eq(schema.users.id, invite.usedBy),
            columns: { email: true, displayName: true },
          });
        }

        return {
          ...invite,
          createdByUser,
          usedByUser,
        };
      })
    );

    return { invites: invitesWithUsers };
  });

  // Create invite (admin only)
  app.post('/api/invites', { preHandler: adminMiddleware }, async (request) => {
    const id = nanoid();
    const token = nanoid(32);

    await db.insert(schema.invites).values({
      id,
      token,
      createdBy: request.user!.id,
    });

    const invite = await db.query.invites.findFirst({
      where: eq(schema.invites.id, id),
    });

    return { invite };
  });

  // Delete invite (admin only)
  app.delete<{
    Params: { id: string };
  }>('/api/invites/:id', { preHandler: adminMiddleware }, async (request, reply) => {
    const { id } = request.params;

    const invite = await db.query.invites.findFirst({
      where: eq(schema.invites.id, id),
    });

    if (!invite) {
      return reply.status(404).send({ error: 'Invite not found' });
    }

    await db.delete(schema.invites).where(eq(schema.invites.id, id));

    return { success: true };
  });

  // Get invite info (public - used for invite page)
  app.get<{
    Params: { token: string };
  }>('/api/invites/:token', { preHandler: optionalAuthMiddleware }, async (request, reply) => {
    const { token } = request.params;

    const invite = await db.query.invites.findFirst({
      where: eq(schema.invites.token, token),
    });

    if (!invite) {
      return reply.status(404).send({ error: 'Invite not found' });
    }

    // Don't expose sensitive info, just validity
    return {
      valid: !invite.usedAt,
      used: !!invite.usedAt,
      alreadyLoggedIn: !!request.user,
    };
  });
}
