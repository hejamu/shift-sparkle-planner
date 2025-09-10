import express, { Request, Response } from 'express';
import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';
// src/server/api.ts

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json());
// Use file-based SQLite DB for persistence
const dbPath = path.join(__dirname, 'shiftplanner.sqlite');
const db = new sqlite3.Database(dbPath);

// Endpoint to check if database file exists
app.get('/api/db-status', (req: Request, res: Response) => {
  fs.access(dbPath, fs.constants.F_OK, (err: NodeJS.ErrnoException | null) => {
    res.json({ exists: !err });
  });
});

// Endpoint to initialize the database
app.post('/api/init-db', (req: Request, res: Response) => {
  let errors: string[] = [];
  db.run(`CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL
  )`, (err: Error | null) => {
    if (err) {
      console.error('Error creating employees table:', err);
      errors.push('employees: ' + err.message);
    }
    db.run(`CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )`, (err: Error | null) => {
      if (err) {
        console.error('Error creating roles table:', err);
        errors.push('roles: ' + err.message);
      }
      db.run(`CREATE TABLE IF NOT EXISTS shift_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        duration INTEGER NOT NULL
      )`, (err: Error | null) => {
        if (err) {
          console.error('Error creating shift_types table:', err);
          errors.push('shift_types: ' + err.message);
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

// Create tables if not exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS shift_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    duration INTEGER NOT NULL,
    color TEXT NOT NULL DEFAULT '#60a5fa'
  )`);
});
// Get all shift types
app.get('/api/shift-types', (req: Request, res: Response) => {
  db.all('SELECT id, name, duration, color FROM shift_types', [], (err: Error | null, rows: any[]) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch shift types' });
    }
    res.json(rows);
  });
});

// Add a new shift type
app.post('/api/shift-types', (req: Request, res: Response) => {
  const { name, duration, color } = req.body;
  if (!name || !duration || duration <= 0) {
    return res.status(400).json({ error: 'Name and positive duration are required' });
  }
  const colorValue = color || '#60a5fa';
  db.run('INSERT INTO shift_types (name, duration, color) VALUES (?, ?, ?)', [name, duration, colorValue], function(this: sqlite3.RunResult, err: Error | null) {
    if (err) {
      return res.status(500).json({ error: 'Failed to add shift type' });
    }
    res.json({ id: this.lastID, name, duration, color: colorValue });
  });
});

// Update a shift type
app.put('/api/shift-types/:id', (req: Request, res: Response) => {
  const { name, duration, color } = req.body;
  const id = req.params.id;
  if (!name || !duration || duration <= 0) {
    return res.status(400).json({ error: 'Name and positive duration are required' });
  }
  const colorValue = color || '#60a5fa';
  db.run('UPDATE shift_types SET name = ?, duration = ?, color = ? WHERE id = ?', [name, duration, colorValue, id], function(this: sqlite3.RunResult, err: Error | null) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update shift type' });
    }
    res.json({ id, name, duration, color: colorValue });
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

app.get('/api/employees', (req: Request, res: Response) => {
  db.all('SELECT id, name, role FROM employees', [], (err: Error | null, rows: any[]) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch employees' });
    }
    res.json(rows);
  });
});

app.get('/api/roles', (req: Request, res: Response) => {
  db.all('SELECT name FROM roles', [], (err: Error | null, rows: { name: string }[]) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch roles' });
    }
    res.json(rows.map((r: { name: string }) => r.name));
  });
});

// Add new employee
app.post('/api/employees', (req: Request, res: Response) => {
  const { name, isManager } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const role = isManager ? 'manager' : 'employee';
  db.run('INSERT INTO employees (name, role) VALUES (?, ?)', [name, role], function(this: sqlite3.RunResult, err: Error | null) {
    if (err) {
      return res.status(500).json({ error: 'Failed to add employee' });
    }
    res.json({ id: this.lastID, name, role });
  });
});

// Update employee role
app.put('/api/employees/:id', (req: Request, res: Response) => {
  const { isManager } = req.body;
  const id = req.params.id;
  const role = isManager ? 'manager' : 'employee';
  db.run('UPDATE employees SET role = ? WHERE id = ?', [role, id], function(this: sqlite3.RunResult, err: Error | null) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update employee role' });
    }
    res.json({ id, role });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running on port ${PORT}`);
});
