import { FastifyInstance } from 'fastify';
import { db, schema } from '../db/index.js';
import { eq, desc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';

export async function linksRoutes(app: FastifyInstance) {
  // Get all recent magic links across all services
  app.get('/api/links', { preHandler: authMiddleware }, async () => {
    const links = await db.query.magicLinks.findMany({
      orderBy: [desc(schema.magicLinks.receivedAt)],
      limit: 50,
      with: {
        // Note: Drizzle doesn't have automatic relations here
        // We'll join manually
      },
    });

    // Get service info for each link
    const linksWithService = await Promise.all(
      links.map(async (link) => {
        const service = await db.query.services.findFirst({
          where: eq(schema.services.id, link.serviceId),
        });
        return {
          ...link,
          service: service || null,
        };
      })
    );

    return { links: linksWithService };
  });

  // Get a specific magic link
  app.get<{
    Params: { id: string };
  }>('/api/links/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params;

    const link = await db.query.magicLinks.findFirst({
      where: eq(schema.magicLinks.id, id),
    });

    if (!link) {
      return reply.status(404).send({ error: 'Link not found' });
    }

    const service = await db.query.services.findFirst({
      where: eq(schema.services.id, link.serviceId),
    });

    return { link: { ...link, service } };
  });
}
