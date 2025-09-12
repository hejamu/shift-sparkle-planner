// ...existing code...
import express from 'express';
import type { Request, Response } from 'express';
import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { parseShowDate } from '../lib/cinetixxParser';
import { XMLParser } from 'fast-xml-parser';
// src/server/api.ts

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json());
// Use file-based SQLite DB for persistence
const dbPath = path.join('/data/shiftplanner.sqlite');
const db = new sqlite3.Database(dbPath);

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
  const requiredTables = ['users', 'shift_types', 'shifts', 'shift_applications'];
  dbChecked.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err: Error | null, rows: any[]) => {
    if (err) {
      return res.json({ valid: false, error: 'Database not accessible' });
    }
    const tableNames = rows.map(r => r.name);
    const missing = requiredTables.filter(t => !tableNames.includes(t));
    res.json({ valid: missing.length === 0, missing });
  });
});

// Endpoint to initialize the database
app.post('/api/init-db', (_req: Request, res: Response) => {
  let errors: string[] = [];
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('employee', 'manager', 'admin'))
    )`, (err: Error | null) => {
        if (err) {
          console.error('Error creating users table:', err);
          errors.push('users: ' + err.message);
        }
    db.run(`CREATE TABLE IF NOT EXISTS shift_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL
    )`, (err: Error | null) => {
      if (err) {
        console.error('Error creating shift_types table:', err);
        errors.push('shift_types: ' + err.message);
      }
      db.run(`CREATE TABLE IF NOT EXISTS shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee INTEGER NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        shift_type INTEGER NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee) REFERENCES users(id),
        FOREIGN KEY (shift_type) REFERENCES shift_types(id)
      )`, (err: Error | null) => {
        if (err) {
          console.error('Error creating shifts table:', err);
          errors.push('shifts: ' + err.message);
        }
  db.run(`CREATE TABLE IF NOT EXISTS shift_applications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          shift_id INTEGER NOT NULL,
          employee_id INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (shift_id) REFERENCES shifts(id),
          FOREIGN KEY (employee_id) REFERENCES users(id)
        )`, (err: Error | null) => {
          if (err) {
            console.error('Error creating shift_applications table:', err);
            errors.push('shift_applications: ' + err.message);
          }
           if (errors.length > 0) {
             res.status(500).json({ initialized: false, errors });
           } else {
             res.json({ initialized: true });
           }
        });
      });
    });
  });
});

// --- USER AUTH API ---

// Simple login endpoint (for demo, plaintext password)
app.post('/api/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }
  // Local admin fallback
  if (username === 'admin' && password === 'letmein123') {
    return res.json({ id: 0, username: 'admin', role: 'admin', local: true });
  }
  db.get('SELECT id, username, role FROM users WHERE username = ? AND password = ?', [username, password], (err: Error | null, user: any) => {
    if (err) {
      return res.status(500).json({ error: 'Login failed' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // For future: issue JWT or session token here
    res.json({ id: user.id, username: user.username, role: user.role });
  });
});
// End of API routes
  // --- END USER AUTH API ---
// --- SHIFT APPLICATIONS API ---

// Apply for a shift
app.post('/api/shift-applications', (req: Request, res: Response) => {
  const { shift_id, employee_id } = req.body;
  if (!shift_id || !employee_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  db.run(
    'INSERT INTO shift_applications (shift_id, employee_id) VALUES (?, ?)',
    [shift_id, employee_id],
    function(this: sqlite3.RunResult, err: Error | null) {
      if (err) {
        return res.status(500).json({ error: 'Failed to apply for shift' });
      }
      res.json({ id: this.lastID, shift_id, employee_id, status: 'pending' });
    }
  );
});

// List applications for a shift
app.get('/api/shift-applications', (req: Request, res: Response) => {
  const { shift_id } = req.query;
  let query = 'SELECT * FROM shift_applications';
  let params: any[] = [];
  if (shift_id) {
    query += ' WHERE shift_id = ?';
    params.push(shift_id);
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

// Add new employee
app.post('/api/employees', (req: Request, res: Response) => {
  const { name, role, username, password } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ error: 'Name, username, and password are required' });
  }
  const roleValue = role === 'manager' ? 'manager' : 'employee';
  db.run('INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)', [name, username, password, roleValue], function(this: sqlite3.RunResult, err: Error | null) {
    if (err) {
      return res.status(500).json({ error: 'Failed to add user' });
    }
    res.json({ id: this.lastID, name, username, role: roleValue });
  });
});

// Update employee role
app.put('/api/employees/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const { role, name, username, password } = req.body;
  const roleValue = role === 'manager' ? 'manager' : 'employee';
  db.run('UPDATE users SET role = ?, name = ?, username = ?, password = ? WHERE id = ?', [roleValue, name, username, password, id], function(this: sqlite3.RunResult, err: Error | null) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update user' });
    }
    res.json({ id, role: roleValue, name, username });
  });
});

// Delete employee
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
  if (!employee || !date || !start_time || !end_time || !shift_type) {
    return res.status(400).json({ error: 'Missing required fields (end_time required)' });
  }
  db.run(
    'INSERT INTO shifts (employee, date, start_time, end_time, shift_type, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [employee, date, start_time, end_time, shift_type, notes || null],
    function(this: sqlite3.RunResult, err: Error | null) {
      if (err) {
        return res.status(500).json({ error: 'Failed to add shift' });
      }
      res.json({ id: this.lastID, employee, date, start_time, end_time, shift_type, notes });
    }
  );
});

// Update a shift
app.put('/api/shifts/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const { employee, date, start_time, end_time, shift_type, notes } = req.body;
  db.run(
    'UPDATE shifts SET employee = ?, date = ?, start_time = ?, end_time = ?, shift_type = ?, notes = ? WHERE id = ?',
    [employee, date, start_time, end_time, shift_type, notes || null, id],
    function(this: sqlite3.RunResult, err: Error | null) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update shift' });
      }
      res.json({ id, employee, date, start_time, end_time, shift_type, notes });
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running on port ${PORT}`);
});
