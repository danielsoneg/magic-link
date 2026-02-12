import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';

import { config } from './config.js';
import { runMigrations } from './db/migrate.js';
import { authRoutes } from './routes/auth.js';
import { servicesRoutes } from './routes/services.js';
import { linksRoutes } from './routes/links.js';
import { usersRoutes } from './routes/users.js';
import { invitesRoutes } from './routes/invites.js';
import { startEmailPoller, stopEmailPoller } from './services/email.js';
import { startCleanupJob, stopCleanupJob } from './services/cleanup.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  // Run migrations
  runMigrations();

  // Create Fastify instance
  const app = Fastify({
    logger: true,
  });

  // Register plugins
  await app.register(cookie, {
    secret: config.sessionSecret,
  });

  await app.register(cors, {
    origin: config.origin,
    credentials: true,
  });

  // Register API routes
  await app.register(authRoutes);
  await app.register(servicesRoutes);
  await app.register(linksRoutes);
  await app.register(usersRoutes);
  await app.register(invitesRoutes);

  // Serve static files in production
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  await app.register(staticPlugin, {
    root: frontendDist,
    prefix: '/',
  });

  // SPA fallback - serve index.html for non-API routes
  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith('/api/')) {
      return reply.status(404).send({ error: 'Not found' });
    }
    return reply.sendFile('index.html');
  });

  // Start services
  startEmailPoller();
  startCleanupJob();

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    stopEmailPoller();
    stopCleanupJob();
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Start server
  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`Server running on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
