import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { csrfProtection } from './csrf';
import { dbGet } from './db';
import { logger } from './logger';
import { registerAuthRoutes } from './auth';
import { registerAdminRoutes } from './routes/admin';
import { registerSettingsRoutes } from './routes/settings';
import { registerEmployeeRoutes } from './routes/employees';
import { registerShiftRoutes } from './routes/shifts';
import { registerShiftTypeRoutes } from './routes/shiftTypes';
import { registerShiftApplicationRoutes } from './routes/shiftApplications';
import { registerCinetixxRoutes } from './routes/cinetixx';

// Builds the express app without starting it — used both by the real server
// (api.ts) and by integration tests so they can run the full middleware
// stack against supertest.
export function buildApp(): Express {
  const app = express();

  const TRUST_PROXY = process.env.TRUST_PROXY ?? '1';
  app.set('trust proxy', TRUST_PROXY === 'false' ? false : Number.isNaN(Number(TRUST_PROXY)) ? TRUST_PROXY : Number(TRUST_PROXY));

  app.use(pinoHttp({
    logger,
    autoLogging: { ignore: (req) => req.url === '/api/health' },
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  }));
  app.use(express.json({ limit: '64kb' }));
  app.use(cookieParser());

  app.get('/api/health', async (_req, res) => {
    try {
      // Cheap round-trip to confirm the DB connection is alive. Doesn't
      // touch user data; just proves the process can still talk to sqlite.
      await dbGet('SELECT 1');
      res.json({ ok: true });
    } catch (err) {
      logger.error({ err }, 'Health check failed');
      res.status(503).json({ ok: false });
    }
  });

  app.use(csrfProtection);

  registerAuthRoutes(app);
  registerAdminRoutes(app);
  registerSettingsRoutes(app);
  registerEmployeeRoutes(app);
  registerShiftRoutes(app);
  registerShiftTypeRoutes(app);
  registerShiftApplicationRoutes(app);
  registerCinetixxRoutes(app);

  return app;
}
