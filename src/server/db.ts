import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';

export const DB_PATH = path.join('/data/shiftplanner.sqlite');
export const REQUIRED_TABLES = ['users', 'shift_types', 'shifts', 'shift_applications', 'settings'] as const;
export const BCRYPT_ROUNDS = 10;

export const db = new sqlite3.Database(DB_PATH);

export const dbRun = (sql: string, params: any[] = []): Promise<sqlite3.RunResult> =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (this: sqlite3.RunResult, err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

export const dbGet = <T = any>(sql: string, params: any[] = []): Promise<T | undefined> =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row as T)));
  });

export const dbAll = <T = any>(sql: string, params: any[] = []): Promise<T[]> =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows as T[])));
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

export async function initSchema(): Promise<void> {
  for (const sql of SCHEMA_STATEMENTS) await dbRun(sql);
  await dbRun(`INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_assign_limit', '1')`);
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
