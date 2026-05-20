import type { Express, Request, Response } from 'express';
import * as sqlite3 from 'sqlite3';
import { db } from '../db';
import { requireAuth, requireRole } from '../auth';

const DEFAULT_COLOR = '#60a5fa';

export function registerShiftTypeRoutes(app: Express) {
  app.get('/api/shift-types', requireAuth, (_req: Request, res: Response) => {
    db.all('SELECT id, name, color FROM shift_types', [], (err: Error | null, rows: any[]) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch shift types' });
      res.json(rows);
    });
  });

  app.post('/api/shift-types', requireAuth, requireRole('manager', 'admin'), (req: Request, res: Response) => {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const colorValue = color || DEFAULT_COLOR;
    db.run(
      'INSERT INTO shift_types (name, color) VALUES (?, ?)',
      [name, colorValue],
      function (this: sqlite3.RunResult, err: Error | null) {
        if (err) return res.status(500).json({ error: 'Failed to add shift type' });
        res.json({ id: this.lastID, name, color: colorValue });
      },
    );
  });

  app.put('/api/shift-types/:id', requireAuth, requireRole('manager', 'admin'), (req: Request, res: Response) => {
    const { name, color } = req.body;
    const id = req.params.id;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const colorValue = color || DEFAULT_COLOR;
    db.run(
      'UPDATE shift_types SET name = ?, color = ? WHERE id = ?',
      [name, colorValue, id],
      function (this: sqlite3.RunResult, err: Error | null) {
        if (err) return res.status(500).json({ error: 'Failed to update shift type' });
        res.json({ id, name, color: colorValue });
      },
    );
  });

  app.delete('/api/shift-types/:id', requireAuth, requireRole('manager', 'admin'), (req: Request, res: Response) => {
    const id = req.params.id;
    db.run('DELETE FROM shift_types WHERE id = ?', [id], function (this: sqlite3.RunResult, err: Error | null) {
      if (err) return res.status(500).json({ error: 'Failed to delete shift type' });
      res.json({ id });
    });
  });
}
