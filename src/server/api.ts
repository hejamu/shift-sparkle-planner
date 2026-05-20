import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { parseShowDate } from '../lib/cinetixxParser';
import { getWeekEnd, getWeekStart } from '../lib/week';
import { XMLParser } from 'fast-xml-parser';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const SESSION_COOKIE = 'session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 1 week
const BCRYPT_ROUNDS = 10;
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  console.error('SESSION_SECRET environment variable is required');
  process.exit(1);
}

app.use(express.json());
app.use(cookieParser());
const dbPath = path.join('/data/shiftplanner.sqlite');
const db = new sqlite3.Database(dbPath);

type Role = 'employee' | 'manager' | 'admin';
type SessionUser = { id: number; username: string; role: Role };

const dbRun = (sql: string, params: any[] = []): Promise<sqlite3.RunResult> =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (this: sqlite3.RunResult, err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
const dbGet = <T = any>(sql: string, params: any[] = []): Promise<T | undefined> =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row as T)));
  });
const dbAll = <T = any>(sql: string, params: any[] = []): Promise<T[]> =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows as T[])));
  });

declare module 'express-serve-static-core' {
  interface Request {
    user?: SessionUser;
  }
}

const issueSession = (res: Response, user: SessionUser) => {
  const token = jwt.sign(user, SESSION_SECRET as string, { expiresIn: SESSION_TTL_SECONDS });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
};

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, SESSION_SECRET as string) as SessionUser & { iat: number; exp: number };
    req.user = { id: decoded.id, username: decoded.username, role: decoded.role };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid session' });
  }
};

const requireRole = (...roles: Role[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  next();
};

// Endpoint to check if database file exists
// Check if database file exists
app.get('/api/db-exists', (_req: Request, res: Response) => {
  const dbPathChecked = path.join('/data', 'shiftplanner.sqlite');
  fs.access(dbPathChecked, fs.constants.F_OK, (err: NodeJS.ErrnoException | null) => {
    res.json({ exists: !err });
  });
});


// Check if required tables exist in the database
app.get('/api/db-tables', (_req: Request, res: Response) => {
  const dbPathChecked = path.join('/data', 'shiftplanner.sqlite');
  const dbChecked = new sqlite3.Database(dbPathChecked);
  const requiredTables = ['users', 'shift_types', 'shifts', 'shift_applications', 'settings'];
  dbChecked.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err: Error | null, rows: any[]) => {
    if (err) {
      return res.json({ valid: false, error: 'Database not accessible' });
    }
    const tableNames = rows.map(r => r.name);
    const missing = requiredTables.filter(t => !tableNames.includes(t));
    res.json({ valid: missing.length === 0, missing });
  });
});

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('employee', 'manager', 'admin'))
  )`,
  `CREATE TABLE IF NOT EXISTS shift_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee INTEGER,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    shift_type INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee) REFERENCES users(id),
    FOREIGN KEY (shift_type) REFERENCES shift_types(id)
  )`,
  `CREATE TABLE IF NOT EXISTS shift_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shift_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    auto_assigned INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shift_id) REFERENCES shifts(id),
    FOREIGN KEY (employee_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
];

async function initSchema(): Promise<void> {
  for (const sql of SCHEMA_STATEMENTS) await dbRun(sql);
  await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_assign_limit', '1')`);
  // Seed an admin user if no admin exists yet — first boot only.
  const existingAdmin = await dbGet<{ id: number }>(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
  if (!existingAdmin) {
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'changeme';
    if (defaultPassword === 'changeme') {
      console.warn('Seeding admin/admin with default password "changeme". Set ADMIN_DEFAULT_PASSWORD to override and rotate it immediately.');
    }
    const hashed = await bcrypt.hash(defaultPassword, BCRYPT_ROUNDS);
    await dbRun(
      `INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, 'admin')`,
      ['admin', hashed, 'Administrator'],
    );
  }
}

app.post('/api/init-db', requireAuth, requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    await initSchema();
    res.json({ initialized: true });
  } catch (err: any) {
    res.status(500).json({ initialized: false, error: err?.message || 'Failed to initialize' });
  }
});

// --- USER AUTH API ---

app.post('/api/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }
  db.get(
    'SELECT id, username, password, role FROM users WHERE username = ?',
    [username],
    async (err: Error | null, row: any) => {
      if (err) return res.status(500).json({ error: 'Login failed' });
      if (!row) return res.status(401).json({ error: 'Invalid credentials' });
      const ok = await bcrypt.compare(password, row.password);
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
      const user: SessionUser = { id: row.id, username: row.username, role: row.role };
      issueSession(res, user);
      res.json(user);
    },
  );
});

app.post('/api/logout', (_req: Request, res: Response) => {
  res.clearCookie(SESSION_COOKIE);
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req: Request, res: Response) => {
  res.json(req.user);
});

// --- SETTINGS API ---

// Get all settings
app.get('/api/settings', (_req: Request, res: Response) => {
  db.all('SELECT key, value FROM settings', [], (err: Error | null, rows: any[]) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }
    // Convert to object
    const settings: Record<string, string> = {};
    rows.forEach((row) => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  });
});

// Get a specific setting
app.get('/api/settings/:key', (req: Request, res: Response) => {
  const { key } = req.params;
  db.get('SELECT value FROM settings WHERE key = ?', [key], (err: Error | null, row: any) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch setting' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    res.json({ key, value: row.value });
  });
});

// Update a setting
app.put('/api/settings/:key', (req: Request, res: Response) => {
  const { key } = req.params;
  const { value } = req.body;
  if (value === undefined) {
    return res.status(400).json({ error: 'Value is required' });
  }
  db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)], function(this: sqlite3.RunResult, err: Error | null) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update setting' });
    }
    res.json({ key, value: String(value) });
  });
});

// --- SHIFT APPLICATIONS API ---

// Apply for a shift
app.post('/api/shift-applications', async (req: Request, res: Response) => {
  const { shift_id, employee_id } = req.body;
  if (!shift_id || !employee_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Get the shift first
    const shift: any = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM shifts WHERE id = ?', [shift_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    // Check if shift is already assigned to someone else
    if (shift.employee !== null && shift.employee !== employee_id) {
      return res.status(409).json({ error: 'This shift is already assigned to someone else' });
    }

    // Check if employee already applied for this shift
    const existingApplication: any = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM shift_applications WHERE shift_id = ? AND employee_id = ?', [shift_id, employee_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Handle existing applications
    if (existingApplication) {
      // If pending, block duplicate application
      if (existingApplication.status === 'pending') {
        return res.status(409).json({ error: 'You have already applied for this shift', existing: existingApplication });
      }
      
      // If previously approved but shift is now unassigned (manager reset), allow reapply by deleting old application
      if (existingApplication.status === 'approved' && shift.employee === null) {
        await new Promise<void>((resolve, reject) => {
          db.run('DELETE FROM shift_applications WHERE id = ?', [existingApplication.id], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        // Continue to create new application
      }
      // If rejected and shift is still open, allow reapply by deleting old application
      else if (existingApplication.status === 'rejected' && shift.employee === null) {
        await new Promise<void>((resolve, reject) => {
          db.run('DELETE FROM shift_applications WHERE id = ?', [existingApplication.id], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        // Continue to create new application
      }
      // Already assigned to this employee
      else if (existingApplication.status === 'approved' && shift.employee === employee_id) {
        return res.status(409).json({ error: 'You are already assigned to this shift', existing: existingApplication });
      }
      // Rejected but shift assigned to someone else
      else if (existingApplication.status === 'rejected' && shift.employee !== null) {
        return res.status(409).json({ error: 'This shift has been assigned to someone else' });
      }
    }

    const shiftDate = new Date(shift.date);
    const weekStart = getWeekStart(shiftDate);
    const weekEnd = getWeekEnd(shiftDate);

    const weekStartStr = weekStart.toISOString().slice(0, 10);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);

    // Get auto-assign limit from settings
    const limitSetting: any = await new Promise((resolve, reject) => {
      db.get('SELECT value FROM settings WHERE key = ?', ['auto_assign_limit'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    const autoAssignLimit = limitSetting ? parseInt(limitSetting.value, 10) : 1;

    // Count how many auto-assigned shifts this employee has this week
    const autoAssignedCount: number = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count FROM shift_applications sa
         JOIN shifts s ON sa.shift_id = s.id
         WHERE sa.employee_id = ?
         AND sa.auto_assigned = 1
         AND sa.status = 'approved'
         AND s.date >= ? AND s.date <= ?`,
        [employee_id, weekStartStr, weekEndStr],
        (err, row: any) => {
          if (err) reject(err);
          else resolve(row?.count || 0);
        }
      );
    });

    // Determine if this should be auto-assigned
    const shouldAutoAssign = autoAssignedCount < autoAssignLimit && shift.employee === null;

    if (shouldAutoAssign) {
      // Auto-assign: create approved application and assign shift
      db.run(
        'INSERT INTO shift_applications (shift_id, employee_id, status, auto_assigned) VALUES (?, ?, ?, ?)',
        [shift_id, employee_id, 'approved', 1],
        function(this: sqlite3.RunResult, err: Error | null) {
          if (err) {
            return res.status(500).json({ error: 'Failed to apply for shift' });
          }
          const applicationId = this.lastID;

          // Update the shift to assign the employee
          db.run(
            'UPDATE shifts SET employee = ? WHERE id = ?',
            [employee_id, shift_id],
            (updateErr: Error | null) => {
              if (updateErr) {
                return res.status(500).json({ error: 'Failed to assign shift' });
              }
              res.json({
                id: applicationId,
                shift_id,
                employee_id,
                status: 'approved',
                auto_assigned: true,
                message: 'Shift auto-assigned successfully'
              });
            }
          );
        }
      );
    } else {
      // Regular application: needs approval
      db.run(
        'INSERT INTO shift_applications (shift_id, employee_id, status, auto_assigned) VALUES (?, ?, ?, ?)',
        [shift_id, employee_id, 'pending', 0],
        function(this: sqlite3.RunResult, err: Error | null) {
          if (err) {
            return res.status(500).json({ error: 'Failed to apply for shift' });
          }
          res.json({
            id: this.lastID,
            shift_id,
            employee_id,
            status: 'pending',
            auto_assigned: false,
            message: 'Application submitted for approval'
          });
        }
      );
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to process application' });
  }
});

// List applications for a shift or employee
app.get('/api/shift-applications', (req: Request, res: Response) => {
  const { shift_id, employee_id } = req.query;
  let query = 'SELECT * FROM shift_applications';
  let conditions: string[] = [];
  let params: any[] = [];
  
  if (shift_id) {
    conditions.push('shift_id = ?');
    params.push(shift_id);
  }
  if (employee_id) {
    conditions.push('employee_id = ?');
    params.push(employee_id);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  db.all(query, params, (err: Error | null, rows: any[]) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch applications' });
    }
    res.json(rows);
  });
});

// Update application status
app.put('/api/shift-applications/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Missing status' });
  }
  db.run('UPDATE shift_applications SET status = ? WHERE id = ?', [status, id], function(this: sqlite3.RunResult, err: Error | null) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update application status' });
    }
    res.json({ id, status });
  });
});

// Get all shift types
app.get('/api/shift-types', (_req: Request, res: Response) => {
  db.all('SELECT id, name, color FROM shift_types', [], (err: Error | null, rows: any[]) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch shift types' });
    }
    res.json(rows);
  });
});

// Add a new shift type
app.post('/api/shift-types', (req: Request, res: Response) => {
  const { name, color } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const colorValue = color || '#60a5fa';
  db.run('INSERT INTO shift_types (name, color) VALUES (?, ?)', [name, colorValue], function(this: sqlite3.RunResult, err: Error | null) {
    if (err) {
      return res.status(500).json({ error: 'Failed to add shift type' });
    }
    res.json({ id: this.lastID, name, color: colorValue });
  });
});

// Update a shift type
app.put('/api/shift-types/:id', (req: Request, res: Response) => {
  const { name, color } = req.body;
  const id = req.params.id;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const colorValue = color || '#60a5fa';
  db.run('UPDATE shift_types SET name = ?, color = ? WHERE id = ?', [name, colorValue, id], function(this: sqlite3.RunResult, err: Error | null) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update shift type' });
    }
    res.json({ id, name, color: colorValue });
  });
});

// Delete a shift type
app.delete('/api/shift-types/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  db.run('DELETE FROM shift_types WHERE id = ?', [id], function(this: sqlite3.RunResult, err: Error | null) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete shift type' });
    }
    res.json({ id });
  });
});

app.get('/api/employees', (_req: Request, res: Response) => {
  db.all('SELECT id, name, role, username FROM users', [], (err: Error | null, rows: any[]) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch employees' });
    }
    res.json(rows);
  });
});

// Proxy endpoint to fetch Cinetixx show info and return parsed SHOW_BEGINNING datetimes
app.get('/api/proxy/cinetixx-shows', async (_req: Request, res: Response) => {
  const apiUrl = 'https://api.cinetixx.de/Services/CinetixxService.asmx/GetShowInfo?mandatorID=2208234164&auditid=2209573052';
  try {
    // Use global fetch (Node 18+). If not available, the server environment should polyfill.
    const r = await fetch(apiUrl);
    if (!r.ok) return res.status(502).json({ error: 'Upstream request failed' });
    const text = await r.text();

    // Use a lightweight XML parser to extract <Show> elements.
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const parsed = parser.parse(text);
    // The structure depends on the upstream XML. Try to locate Show elements anywhere under parsed.
    // We'll walk the parsed object to find all Show nodes.
    // Collect shows into a map keyed by id where possible to avoid duplicates
    const showsMap = new Map<string, any>();

    const pushShow = (s: any) => {
      if (!s || typeof s !== 'object') return;
      const id = s['@_id'] || (s['@_attributes'] && s['@_attributes'].id) || s.id || null;
      const begin = s.SHOW_BEGINNING || s.show_beginning || (s['SHOW_BEGINNING'] && s['SHOW_BEGINNING']['#text']) || null;
      const end = s.SHOW_END || s.show_end || (s['SHOW_END'] && s['SHOW_END']['#text']) || null;
      const key = id ? String(id) : JSON.stringify({ begin: begin || null, end: end || null });
      if (!showsMap.has(key)) showsMap.set(key, s);
    };

    const walk = (node: any) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (node.Show) {
        const arr = Array.isArray(node.Show) ? node.Show : [node.Show];
        arr.forEach((s: any) => pushShow(s));
      }
      // If the node itself appears to be a Show (attributes present), treat it as one
      if (node['@_id'] || (node['@_attributes'] && node['@_attributes'].id)) {
        pushShow(node);
      }
      Object.values(node).forEach(v => walk(v));
    };
    walk(parsed);

    // Extract enabled shows and their begin/end times from deduplicated map
    const result: { id: string; start: string | null; end: string | null }[] = [];
  for (const s of showsMap.values()) {
      const attrsId = s['@_id'] || (s['@_attributes'] && s['@_attributes'].id) || s.id || null;
      const status = s['@_status'] || (s['@_attributes'] && s['@_attributes'].status) || s.status || null;
      if (!status || String(status) !== 'SHOW_ENABLED') continue;

      // The SHOW_BEGINNING and SHOW_END may be child tags; try multiple keys
      let beginRaw: any = null;
      let endRaw: any = null;
      if (s.SHOW_BEGINNING) beginRaw = s.SHOW_BEGINNING;
      if (s.SHOW_END) endRaw = s.SHOW_END;
      if (!beginRaw && s.show_beginning) beginRaw = s.show_beginning;
      if (!endRaw && s.show_end) endRaw = s.show_end;
      if (beginRaw && typeof beginRaw === 'object') beginRaw = (beginRaw['#text'] || beginRaw['@_text'] || '') as string;
      if (endRaw && typeof endRaw === 'object') endRaw = (endRaw['#text'] || endRaw['@_text'] || '') as string;

      const startDate = parseShowDate(beginRaw);
      const endDate = parseShowDate(endRaw);
      // Only include shows that have a valid start date
      const startIso = startDate ? startDate.toISOString() : null;
      const endIso = endDate ? endDate.toISOString() : null;
      if (startIso) {
        result.push({ id: String(attrsId || ''), start: startIso, end: endIso });
      }
    }

    // Final dedupe by id+start to avoid duplicates from parser variations
    const uniqueMap = new Map<string, { id: string; start: string | null; end: string | null }>();
    for (const r of result) {
      const key = `${r.id}|${r.start}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, r);
    }
    const uniqueResult = Array.from(uniqueMap.values());

    res.json({ shows: uniqueResult });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to proxy' });
  }
});

const normalizeRole = (role: unknown): Role => (role === 'admin' ? 'admin' : role === 'manager' ? 'manager' : 'employee');

app.post('/api/employees', async (req: Request, res: Response) => {
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

app.put('/api/employees/:id', async (req: Request, res: Response) => {
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

app.delete('/api/employees/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  db.run('DELETE FROM users WHERE id = ?', [id], function(this: sqlite3.RunResult, err: Error | null) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete user' });
    }
    res.json({ id });
  });
});


// Endpoint to drop all tables
app.post('/api/drop-tables', (_req: Request, res: Response) => {
  const dbPathChecked = path.join('/data', 'shiftplanner.sqlite');
  const dbChecked = new sqlite3.Database(dbPathChecked);
  dbChecked.serialize(() => {
    dbChecked.run('DROP TABLE IF EXISTS users');
    dbChecked.run('DROP TABLE IF EXISTS shift_types');
    dbChecked.run('DROP TABLE IF EXISTS shifts');
    dbChecked.run('DROP TABLE IF EXISTS shift_applications');
    res.json({ dropped: true });
  });
});

// --- SHIFTS API ENDPOINTS ---

// Get all shifts
app.get('/api/shifts', (_req: Request, res: Response) => {
  db.all('SELECT * FROM shifts', [], (err: Error | null, rows: any[]) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch shifts' });
    }
    res.json(rows);
  });
});

// Add a new shift
app.post('/api/shifts', (req: Request, res: Response) => {
  const { employee, date, start_time, end_time, shift_type, notes } = req.body;
  if (!date || !start_time || !end_time || !shift_type) {
    return res.status(400).json({ error: 'Missing required fields (date, start_time, end_time, shift_type)' });
  }
  // Normalize employee: allow null/unassigned
  let employeeValue: number | null = null;
  if (employee !== undefined && employee !== null) {
    if (typeof employee === 'string') {
      if (employee.toLowerCase() !== 'unassigned' && employee.trim() !== '') {
        const parsed = Number(employee);
        employeeValue = Number.isFinite(parsed) ? parsed : null;
      } else {
        employeeValue = null;
      }
    } else if (typeof employee === 'number') {
      employeeValue = employee;
    }
  }
  db.run(
    'INSERT INTO shifts (employee, date, start_time, end_time, shift_type, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [employeeValue, date, start_time, end_time, shift_type, notes || null],
    function(this: sqlite3.RunResult, err: Error | null) {
      if (err) {
        return res.status(500).json({ error: 'Failed to add shift' });
      }
      res.json({ id: this.lastID, employee: employeeValue, date, start_time, end_time, shift_type, notes });
    }
  );
});

// Update a shift
app.put('/api/shifts/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const { employee, date, start_time, end_time, shift_type, notes } = req.body;
  // Normalize employee: allow null/unassigned
  let employeeValue: number | null = null;
  if (employee !== undefined && employee !== null) {
    if (typeof employee === 'string') {
      if (employee.toLowerCase() !== 'unassigned' && employee.trim() !== '') {
        const parsed = Number(employee);
        employeeValue = Number.isFinite(parsed) ? parsed : null;
      } else {
        employeeValue = null;
      }
    } else if (typeof employee === 'number') {
      employeeValue = employee;
    }
  }
  db.run(
    'UPDATE shifts SET employee = ?, date = ?, start_time = ?, end_time = ?, shift_type = ?, notes = ? WHERE id = ?',
    [employeeValue, date, start_time, end_time, shift_type, (notes ?? null), id],
    function(this: sqlite3.RunResult, err: Error | null) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update shift' });
      }
      res.json({ id, employee: employeeValue, date, start_time, end_time, shift_type, notes });
    }
  );
});

// Delete a shift
app.delete('/api/shifts/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  db.run('DELETE FROM shifts WHERE id = ?', [id], function(this: sqlite3.RunResult, err: Error | null) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete shift' });
    }
    res.json({ id });
  });
});

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
