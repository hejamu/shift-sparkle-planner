import type { Express, Request, Response } from 'express';
import * as sqlite3 from 'sqlite3';
import { db } from '../db';
import { requireAuth, requireRole } from '../auth';

const normalizeEmployee = (raw: unknown): number | null => {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw === 'string') {
    if (raw.toLowerCase() === 'unassigned' || raw.trim() === '') return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export function registerShiftRoutes(app: Express) {
  app.get('/api/shifts', requireAuth, (_req: Request, res: Response) => {
    db.all('SELECT * FROM shifts', [], (err: Error | null, rows: any[]) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch shifts' });
      res.json(rows);
    });
  });

  app.post('/api/shifts', requireAuth, requireRole('manager', 'admin'), (req: Request, res: Response) => {
    const { employee, date, start_time, end_time, shift_type, notes } = req.body;
    if (!date || !start_time || !end_time || !shift_type) {
      return res.status(400).json({ error: 'Missing required fields (date, start_time, end_time, shift_type)' });
    }
    const employeeValue = normalizeEmployee(employee);
    db.run(
      'INSERT INTO shifts (employee, date, start_time, end_time, shift_type, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [employeeValue, date, start_time, end_time, shift_type, notes || null],
      function (this: sqlite3.RunResult, err: Error | null) {
        if (err) return res.status(500).json({ error: 'Failed to add shift' });
        res.json({ id: this.lastID, employee: employeeValue, date, start_time, end_time, shift_type, notes });
      },
    );
  });

  app.put('/api/shifts/:id', requireAuth, requireRole('manager', 'admin'), (req: Request, res: Response) => {
    const id = req.params.id;
    const { employee, date, start_time, end_time, shift_type, notes } = req.body;
    const employeeValue = normalizeEmployee(employee);
    db.run(
      'UPDATE shifts SET employee = ?, date = ?, start_time = ?, end_time = ?, shift_type = ?, notes = ? WHERE id = ?',
      [employeeValue, date, start_time, end_time, shift_type, notes ?? null, id],
      function (this: sqlite3.RunResult, err: Error | null) {
        if (err) return res.status(500).json({ error: 'Failed to update shift' });
        res.json({ id, employee: employeeValue, date, start_time, end_time, shift_type, notes });
      },
    );
  });

  app.delete('/api/shifts/:id', requireAuth, requireRole('manager', 'admin'), (req: Request, res: Response) => {
    const id = req.params.id;
    db.run('DELETE FROM shifts WHERE id = ?', [id], function (this: sqlite3.RunResult, err: Error | null) {
      if (err) return res.status(500).json({ error: 'Failed to delete shift' });
      res.json({ id });
    });
  });
}
