import type { Express, Request, Response } from 'express';
import * as fs from 'fs';
import { db, DB_PATH, initSchema, REQUIRED_TABLES } from '../db';
import { requireAuth, requireRole } from '../auth';

export function registerAdminRoutes(app: Express) {
  app.get('/api/db-exists', requireAuth, requireRole('admin'), (_req: Request, res: Response) => {
    fs.access(DB_PATH, fs.constants.F_OK, (err) => res.json({ exists: !err }));
  });

  app.get('/api/db-tables', requireAuth, requireRole('admin'), (_req: Request, res: Response) => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err: Error | null, rows: any[]) => {
      if (err) return res.json({ valid: false, error: 'Database not accessible' });
      const tableNames = rows.map(r => r.name);
      const missing = REQUIRED_TABLES.filter(t => !tableNames.includes(t));
      res.json({ valid: missing.length === 0, missing });
    });
  });

  app.post('/api/init-db', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
    try {
      await initSchema();
      res.json({ initialized: true });
    } catch (err) {
      req.log.error({ err }, 'POST /api/init-db failed');
      res.status(500).json({ initialized: false, error: 'Failed to initialize' });
    }
  });

  app.post('/api/drop-tables', requireAuth, requireRole('admin'), (_req: Request, res: Response) => {
    db.serialize(() => {
      for (const t of REQUIRED_TABLES) db.run(`DROP TABLE IF EXISTS ${t}`);
      res.json({ dropped: true });
    });
  });
}
