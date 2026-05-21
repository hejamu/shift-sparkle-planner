import express from 'express';
import cookieParser from 'cookie-parser';
import { initSchema } from './db';
import { csrfProtection } from './csrf';
import { registerAuthRoutes } from './auth';
import { registerAdminRoutes } from './routes/admin';
import { registerSettingsRoutes } from './routes/settings';
import { registerEmployeeRoutes } from './routes/employees';
import { registerShiftRoutes } from './routes/shifts';
import { registerShiftTypeRoutes } from './routes/shiftTypes';
import { registerShiftApplicationRoutes } from './routes/shiftApplications';
import { registerCinetixxRoutes } from './routes/cinetixx';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Behind nginx / a TLS-terminating reverse proxy. Trust the first hop so
// req.protocol reflects X-Forwarded-Proto (used by rate-limit IP detection
// and any future cookie/redirect decisions). Set TRUST_PROXY=0 to disable
// in environments where the API is reached directly.
const TRUST_PROXY = process.env.TRUST_PROXY ?? '1';
app.set('trust proxy', TRUST_PROXY === 'false' ? false : Number.isNaN(Number(TRUST_PROXY)) ? TRUST_PROXY : Number(TRUST_PROXY));

app.use(express.json({ limit: '64kb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// CSRF gate sits after the body parser (which doesn't read on safe methods
// anyway) and before any state-changing routes. /api/health is reachable
// above it because GET is exempt.
app.use(csrfProtection);

registerAuthRoutes(app);
registerAdminRoutes(app);
registerSettingsRoutes(app);
registerEmployeeRoutes(app);
registerShiftRoutes(app);
registerShiftTypeRoutes(app);
registerShiftApplicationRoutes(app);
registerCinetixxRoutes(app);

initSchema()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`API server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database, refusing to start:', err);
    process.exit(1);
  });
