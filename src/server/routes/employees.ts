import type { Express, Request, Response } from 'express';
import * as sqlite3 from 'sqlite3';
import * as bcrypt from 'bcryptjs';
import { BCRYPT_ROUNDS, db, dbRun } from '../db';
import { requireAuth, requireRole, Role } from '../auth';

const normalizeRole = (role: unknown): Role => (role === 'admin' ? 'admin' : role === 'manager' ? 'manager' : 'employee');

export function registerEmployeeRoutes(app: Express) {
  app.get('/api/employees', requireAuth, (_req: Request, res: Response) => {
    db.all('SELECT id, name, role, username FROM users', [], (err: Error | null, rows: any[]) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch employees' });
      res.json(rows);
    });
  });

  app.post('/api/employees', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
    const { name, role, username, password } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Name, username, and password are required' });
    }
    try {
      const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const roleValue = normalizeRole(role);
      const result = await dbRun(
        'INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)',
        [name, username, hashed, roleValue],
      );
      res.json({ id: result.lastID, name, username, role: roleValue });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to add user' });
    }
  });

  app.put('/api/employees/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
    const id = req.params.id;
    const { role, name, username, password } = req.body;
    const roleValue = normalizeRole(role);
    try {
      if (password) {
        const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
        await dbRun(
          'UPDATE users SET role = ?, name = ?, username = ?, password = ? WHERE id = ?',
          [roleValue, name, username, hashed, id],
        );
      } else {
        await dbRun(
          'UPDATE users SET role = ?, name = ?, username = ? WHERE id = ?',
          [roleValue, name, username, id],
        );
      }
      res.json({ id, role: roleValue, name, username });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to update user' });
    }
  });

  app.delete('/api/employees/:id', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
    const id = req.params.id;
    db.run('DELETE FROM users WHERE id = ?', [id], function (this: sqlite3.RunResult, err: Error | null) {
      if (err) return res.status(500).json({ error: 'Failed to delete user' });
      res.json({ id });
    });
  });
}
