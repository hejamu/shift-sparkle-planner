// src/server/api.ts

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
// Use file-based SQLite DB for persistence
const dbPath = path.join(__dirname, 'shiftplanner.sqlite');
const db = new sqlite3.Database(dbPath);

const fs = require('fs');

// Endpoint to check if database file exists
app.get('/api/db-status', (req, res) => {
  fs.access(dbPath, fs.constants.F_OK, (err) => {
    res.json({ exists: !err });
  });
});

// Endpoint to initialize the database
app.post('/api/init-db', (req, res) => {
  let errors = [];
  db.run(`CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL
  )`, (err) => {
    if (err) {
      console.error('Error creating employees table:', err);
      errors.push('employees: ' + err.message);
    }
    db.run(`CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )`, (err) => {
      if (err) {
        console.error('Error creating roles table:', err);
        errors.push('roles: ' + err.message);
      }
      db.run(`CREATE TABLE IF NOT EXISTS shift_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        duration INTEGER NOT NULL
      )`, (err) => {
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
    duration INTEGER NOT NULL
  )`);
});
// Get all shift types
app.get('/api/shift-types', (req, res) => {
  db.all('SELECT id, name, duration FROM shift_types', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch shift types' });
    }
    res.json(rows);
  });
});

// Add a new shift type
app.post('/api/shift-types', (req, res) => {
  const { name, duration } = req.body;
  if (!name || !duration || duration <= 0) {
    return res.status(400).json({ error: 'Name and positive duration are required' });
  }
  db.run('INSERT INTO shift_types (name, duration) VALUES (?, ?)', [name, duration], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to add shift type' });
    }
    res.json({ id: this.lastID, name, duration });
  });
});

// Update a shift type
app.put('/api/shift-types/:id', (req, res) => {
  const { name, duration } = req.body;
  const id = req.params.id;
  if (!name || !duration || duration <= 0) {
    return res.status(400).json({ error: 'Name and positive duration are required' });
  }
  db.run('UPDATE shift_types SET name = ?, duration = ? WHERE id = ?', [name, duration, id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update shift type' });
    }
    res.json({ id, name, duration });
  });
});

// Delete a shift type
app.delete('/api/shift-types/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM shift_types WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete shift type' });
    }
    res.json({ id });
  });
});

app.get('/api/employees', (req, res) => {
  db.all('SELECT id, name, role FROM employees', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch employees' });
    }
    res.json(rows);
  });
});

app.get('/api/roles', (req, res) => {
  db.all('SELECT name FROM roles', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch roles' });
    }
    res.json(rows.map(r => r.name));
  });
});

// Add new employee
app.post('/api/employees', (req, res) => {
  const { name, isManager } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const role = isManager ? 'manager' : 'employee';
  db.run('INSERT INTO employees (name, role) VALUES (?, ?)', [name, role], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to add employee' });
    }
    res.json({ id: this.lastID, name, role });
  });
});

// Update employee role
app.put('/api/employees/:id', (req, res) => {
  const { isManager } = req.body;
  const id = req.params.id;
  const role = isManager ? 'manager' : 'employee';
  db.run('UPDATE employees SET role = ? WHERE id = ?', [role, id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update employee role' });
    }
    res.json({ id, role });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running on port ${PORT}`);
});
