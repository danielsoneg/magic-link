import { FastifyInstance } from 'fastify';
import { db, schema } from '../db/index.js';
import { eq, desc } from 'drizzle-orm';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

export async function servicesRoutes(app: FastifyInstance) {
  // List all services
  app.get('/api/services', { preHandler: authMiddleware }, async () => {
    const services = await db.query.services.findMany({
      orderBy: [desc(schema.services.createdAt)],
    });

    // Get latest link for each service
    const servicesWithLinks = await Promise.all(
      services.map(async (service) => {
        const latestLink = await db.query.magicLinks.findFirst({
          where: eq(schema.magicLinks.serviceId, service.id),
          orderBy: [desc(schema.magicLinks.receivedAt)],
        });

        const linkCount = await db
          .select({ count: schema.magicLinks.id })
          .from(schema.magicLinks)
          .where(eq(schema.magicLinks.serviceId, service.id));

        return {
          ...service,
          latestLink: latestLink?.receivedAt || null,
          linkCount: linkCount.length,
        };
      })
    );

    return { services: servicesWithLinks };
  });

  // Get service with recent links
  app.get<{
    Params: { slug: string };
  }>('/api/services/:slug', { preHandler: authMiddleware }, async (request, reply) => {
    const { slug } = request.params;

    const service = await db.query.services.findFirst({
      where: eq(schema.services.slug, slug),
    });

    if (!service) {
      return reply.status(404).send({ error: 'Service not found' });
    }

    const links = await db.query.magicLinks.findMany({
      where: eq(schema.magicLinks.serviceId, service.id),
      orderBy: [desc(schema.magicLinks.receivedAt)],
      limit: 20,
    });

    return { service, links };
  });

  // Update service (admin only)
  app.patch<{
    Params: { slug: string };
    Body: { displayName?: string; iconUrl?: string; serviceUrl?: string };
  }>('/api/services/:slug', { preHandler: adminMiddleware }, async (request, reply) => {
    const { slug } = request.params;
    const { displayName, iconUrl, serviceUrl } = request.body;

    const service = await db.query.services.findFirst({
      where: eq(schema.services.slug, slug),
    });

    if (!service) {
      return reply.status(404).send({ error: 'Service not found' });
    }

    const updates: Partial<typeof schema.services.$inferInsert> = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (iconUrl !== undefined) updates.iconUrl = iconUrl;
    if (serviceUrl !== undefined) updates.serviceUrl = serviceUrl;

    if (Object.keys(updates).length > 0) {
      await db
        .update(schema.services)
        .set(updates)
        .where(eq(schema.services.id, service.id));
    }

    const updated = await db.query.services.findFirst({
      where: eq(schema.services.id, service.id),
    });

    return { service: updated };
  });

  // Delete service (admin only)
  app.delete<{
    Params: { slug: string };
  }>('/api/services/:slug', { preHandler: adminMiddleware }, async (request, reply) => {
    const { slug } = request.params;

    const service = await db.query.services.findFirst({
      where: eq(schema.services.slug, slug),
    });

    if (!service) {
      return reply.status(404).send({ error: 'Service not found' });
    }

    await db.delete(schema.services).where(eq(schema.services.id, service.id));

    return { success: true };
  });
}
