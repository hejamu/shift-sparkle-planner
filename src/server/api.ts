import { buildApp } from './app';
import { db, initSchema } from './db';
import { logger } from './logger';

const PORT = Number(process.env.PORT) || 3001;
const SHUTDOWN_TIMEOUT_MS = 10_000;
const app = buildApp();

initSchema()
  .then(() => {
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info({ port: PORT }, 'API server running');
    });

    // Graceful shutdown: stop accepting new connections, let in-flight
    // requests finish, then close the DB. SIGTERM is what docker / kubelet
    // send; SIGINT is for Ctrl-C in dev.
    const shutdown = (signal: string) => {
      logger.info({ signal }, 'Shutdown signal received, draining…');
      const force = setTimeout(() => {
        logger.warn('Drain timeout exceeded, forcing exit');
        process.exit(1);
      }, SHUTDOWN_TIMEOUT_MS);
      force.unref();

      server.close((err) => {
        if (err) logger.error({ err }, 'Error closing HTTP server');
        db.close((dbErr) => {
          if (dbErr) logger.error({ err: dbErr }, 'Error closing database');
          else logger.info('Shutdown complete');
          process.exit(err || dbErr ? 1 : 0);
        });
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch((err) => {
    logger.fatal({ err }, 'Failed to initialize database, refusing to start');
    process.exit(1);
  });
