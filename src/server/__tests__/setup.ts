import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Each test file gets its own temp DB so they can run in parallel without
// stepping on each other's state. The path is also picked up by db.ts.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shift-planner-test-'));
process.env.DB_PATH = path.join(tmpDir, 'test.sqlite');
process.env.SESSION_SECRET = 'test-session-secret-' + Math.random().toString(36).slice(2);
process.env.ADMIN_DEFAULT_PASSWORD = 'testpass';
process.env.LOG_LEVEL = 'silent';
process.env.NODE_ENV = 'test';
// supertest assigns a random port so req.headers.host won't match the test
// Origin; explicitly allow it.
process.env.CSRF_ALLOWED_ORIGINS = 'http://localhost:8080';
