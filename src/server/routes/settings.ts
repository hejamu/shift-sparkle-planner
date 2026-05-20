import type { Express, Request, Response } from 'express';
import * as sqlite3 from 'sqlite3';
import { db } from '../db';
import { requireAuth, requireRole } from '../auth';

export function registerSettingsRoutes(app: Express) {
  app.get('/api/settings', requireAuth, (_req: Request, res: Response) => {
    db.all('SELECT key, value FROM settings', [], (err: Error | null, rows: any[]) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch settings' });
      const settings: Record<string, string> = {};
      for (const row of rows) settings[row.key] = row.value;
      res.json(settings);
    });
  });

  app.get('/api/settings/:key', requireAuth, (req: Request, res: Response) => {
    const { key } = req.params;
    db.get('SELECT value FROM settings WHERE key = ?', [key], (err: Error | null, row: any) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch setting' });
      if (!row) return res.status(404).json({ error: 'Setting not found' });
      res.json({ key, value: row.value });
    });
  });

  app.put('/api/settings/:key', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
    const { key } = req.params;
    const { value } = req.body;
    if (value === undefined) return res.status(400).json({ error: 'Value is required' });
    db.run(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, String(value)],
      function (this: sqlite3.RunResult, err: Error | null) {
        if (err) return res.status(500).json({ error: 'Failed to update setting' });
        res.json({ key, value: String(value) });
      },
    );
  });
}
