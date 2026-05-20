import type { Express, Request, Response } from 'express';
import * as sqlite3 from 'sqlite3';
import { db } from '../db';
import { requireAuth, requireRole } from '../auth';
import { getWeekEnd, getWeekStart } from '../../lib/week';

type Shift = {
  id: number;
  employee: number | null;
  date: string;
  start_time: string;
  end_time: string;
  shift_type: number;
  notes: string | null;
};

type ShiftApplication = {
  id: number;
  shift_id: number;
  employee_id: number;
  status: 'pending' | 'approved' | 'rejected';
  auto_assigned: number;
  created_at: string;
};

const dbGetSync = <T>(sql: string, params: any[]): Promise<T | undefined> =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row as T | undefined)));
  });

const dbRunSync = (sql: string, params: any[]): Promise<sqlite3.RunResult> =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (this: sqlite3.RunResult, err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

export function registerShiftApplicationRoutes(app: Express) {
  app.post('/api/shift-applications', requireAuth, async (req: Request, res: Response) => {
    const { shift_id, employee_id } = req.body;
    if (!shift_id || !employee_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (req.user!.role === 'employee' && req.user!.id !== Number(employee_id)) {
      return res.status(403).json({ error: 'Cannot apply on behalf of another user' });
    }

    try {
      const shift = await dbGetSync<Shift>('SELECT * FROM shifts WHERE id = ?', [shift_id]);
      if (!shift) return res.status(404).json({ error: 'Shift not found' });

      if (shift.employee !== null && shift.employee !== employee_id) {
        return res.status(409).json({ error: 'This shift is already assigned to someone else' });
      }

      const existing = await dbGetSync<ShiftApplication>(
        'SELECT * FROM shift_applications WHERE shift_id = ? AND employee_id = ?',
        [shift_id, employee_id],
      );

      if (existing) {
        if (existing.status === 'pending') {
          return res.status(409).json({ error: 'You have already applied for this shift', existing });
        }
        if (existing.status === 'approved' && shift.employee === null) {
          await dbRunSync('DELETE FROM shift_applications WHERE id = ?', [existing.id]);
        } else if (existing.status === 'rejected' && shift.employee === null) {
          await dbRunSync('DELETE FROM shift_applications WHERE id = ?', [existing.id]);
        } else if (existing.status === 'approved' && shift.employee === employee_id) {
          return res.status(409).json({ error: 'You are already assigned to this shift', existing });
        } else if (existing.status === 'rejected' && shift.employee !== null) {
          return res.status(409).json({ error: 'This shift has been assigned to someone else' });
        }
      }

      const weekStart = getWeekStart(new Date(shift.date));
      const weekEnd = getWeekEnd(new Date(shift.date));
      const weekStartStr = weekStart.toISOString().slice(0, 10);
      const weekEndStr = weekEnd.toISOString().slice(0, 10);

      const limitRow = await dbGetSync<{ value: string }>(
        'SELECT value FROM settings WHERE key = ?',
        ['auto_assign_limit'],
      );
      const autoAssignLimit = limitRow ? parseInt(limitRow.value, 10) : 1;

      const countRow = await dbGetSync<{ count: number }>(
        `SELECT COUNT(*) as count FROM shift_applications sa
         JOIN shifts s ON sa.shift_id = s.id
         WHERE sa.employee_id = ?
         AND sa.auto_assigned = 1
         AND sa.status = 'approved'
         AND s.date >= ? AND s.date <= ?`,
        [employee_id, weekStartStr, weekEndStr],
      );
      const autoAssignedCount = countRow?.count ?? 0;

      const shouldAutoAssign = autoAssignedCount < autoAssignLimit && shift.employee === null;

      if (shouldAutoAssign) {
        const result = await dbRunSync(
          'INSERT INTO shift_applications (shift_id, employee_id, status, auto_assigned) VALUES (?, ?, ?, ?)',
          [shift_id, employee_id, 'approved', 1],
        );
        await dbRunSync('UPDATE shifts SET employee = ? WHERE id = ?', [employee_id, shift_id]);
        return res.json({
          id: result.lastID,
          shift_id,
          employee_id,
          status: 'approved',
          auto_assigned: true,
          message: 'Shift auto-assigned successfully',
        });
      }

      const result = await dbRunSync(
        'INSERT INTO shift_applications (shift_id, employee_id, status, auto_assigned) VALUES (?, ?, ?, ?)',
        [shift_id, employee_id, 'pending', 0],
      );
      res.json({
        id: result.lastID,
        shift_id,
        employee_id,
        status: 'pending',
        auto_assigned: false,
        message: 'Application submitted for approval',
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to process application' });
    }
  });

  app.get('/api/shift-applications', requireAuth, (req: Request, res: Response) => {
    const { shift_id, employee_id } = req.query;
    let query = 'SELECT * FROM shift_applications';
    const conditions: string[] = [];
    const params: any[] = [];

    if (shift_id) {
      conditions.push('shift_id = ?');
      params.push(shift_id);
    }
    if (req.user!.role === 'employee') {
      conditions.push('employee_id = ?');
      params.push(req.user!.id);
    } else if (employee_id) {
      conditions.push('employee_id = ?');
      params.push(employee_id);
    }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');

    db.all(query, params, (err: Error | null, rows: any[]) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch applications' });
      res.json(rows);
    });
  });

  app.put('/api/shift-applications/:id', requireAuth, requireRole('manager', 'admin'), (req: Request, res: Response) => {
    const id = req.params.id;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Missing status' });
    db.run(
      'UPDATE shift_applications SET status = ? WHERE id = ?',
      [status, id],
      function (this: sqlite3.RunResult, err: Error | null) {
        if (err) return res.status(500).json({ error: 'Failed to update application status' });
        res.json({ id, status });
      },
    );
  });
}
