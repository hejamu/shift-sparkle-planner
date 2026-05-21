import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import { logger } from './logger';

// Override via DB_PATH env var (used by tests to point at a temp file).
export const DB_PATH = process.env.DB_PATH || path.join('/data/shiftplanner.sqlite');
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

// Multi-statement exec for schema changes.
const dbExec = (sql: string): Promise<void> =>
  new Promise((resolve, reject) => {
    db.exec(sql, (err) => (err ? reject(err) : resolve()));
  });

// --- Migrations ---
// Append a new entry to MIGRATIONS for every schema change. Each migration is
// applied exactly once and recorded in schema_migrations. Each `sql` block is
// run inside a transaction together with the schema_migrations insert, so a
// failure rolls back cleanly.

type Migration = { name: string; sql: string };

const MIGRATIONS: Migration[] = [
  {
    name: '0001_initial',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('employee', 'manager', 'admin'))
      );
      CREATE TABLE IF NOT EXISTS shift_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS shifts (
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
      );
      CREATE TABLE IF NOT EXISTS shift_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shift_id INTEGER NOT NULL,
        employee_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        auto_assigned INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shift_id) REFERENCES shifts(id),
        FOREIGN KEY (employee_id) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_assign_limit', '1');
    `,
  },
];

export async function runMigrations(): Promise<void> {
  await dbRun(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  const applied = new Set(
    (await dbAll<{ name: string }>(`SELECT name FROM schema_migrations`)).map((r) => r.name),
  );

  // Bootstrap path for DBs that pre-date the migration system: if the `users`
  // table already exists and no migrations are recorded, mark 0001 as applied
  // so we don't try to re-run table creation that's already there.
  const hasUsers = await dbGet<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='users'`,
  );
  if (hasUsers && applied.size === 0) {
    await dbRun(`INSERT INTO schema_migrations (name) VALUES (?)`, ['0001_initial']);
    applied.add('0001_initial');
    logger.info('Bootstrapped existing database: recorded migration 0001_initial as applied.');
  }

  for (const m of MIGRATIONS) {
    if (applied.has(m.name)) continue;
    logger.info({ migration: m.name }, 'Applying migration');
    const escapedName = m.name.replace(/'/g, "''");
    const wrapped = `BEGIN;\n${m.sql}\nINSERT INTO schema_migrations(name) VALUES('${escapedName}');\nCOMMIT;`;
    try {
      await dbExec(wrapped);
    } catch (err) {
      await dbExec('ROLLBACK').catch(() => undefined);
      throw new Error(`Migration ${m.name} failed: ${(err as Error).message}`);
    }
    logger.info({ migration: m.name }, 'Migration applied');
  }
}

export async function initSchema(): Promise<void> {
  await runMigrations();

  // Seed an admin user if no admin exists. Idempotent; not part of the
  // migration sequence because the password depends on a runtime env var
  // and async bcrypt.
  const existingAdmin = await dbGet<{ id: number }>(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
  if (!existingAdmin) {
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'changeme';
    if (defaultPassword === 'changeme') {
      logger.warn('Seeding admin/admin with default password "changeme". Set ADMIN_DEFAULT_PASSWORD to override and rotate it immediately.');
    }
    const hashed = await bcrypt.hash(defaultPassword, BCRYPT_ROUNDS);
    await dbRun(
      `INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, 'admin')`,
      ['admin', hashed, 'Administrator'],
    );
  }
}
