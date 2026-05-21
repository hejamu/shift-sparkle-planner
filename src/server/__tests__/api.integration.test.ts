// Sets DB_PATH and SESSION_SECRET BEFORE the server modules load below.
// Keep this as the first import.
import './setup';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { buildApp } from '../app';
import { initSchema, db } from '../db';

const ORIGIN = 'http://localhost:8080';
const app = buildApp();

beforeAll(async () => {
  await initSchema();
});

afterAll(async () => {
  await new Promise<void>((resolve) => db.close(() => resolve()));
  // Best-effort cleanup of the temp DB directory.
  const p = process.env.DB_PATH;
  if (p) fs.rmSync(path.dirname(p), { recursive: true, force: true });
});

// Tiny helper that carries the session cookie between calls.
const agentWithLogin = async (username: string, password: string) => {
  const agent = request.agent(app);
  const res = await agent
    .post('/api/login')
    .set('Origin', ORIGIN)
    .send({ username, password });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
};

describe('GET /api/health', () => {
  it('is reachable without auth', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('CSRF protection', () => {
  it('blocks state-changing requests with no Origin', async () => {
    const res = await request(app).post('/api/login').send({});
    expect(res.status).toBe(403);
  });

  it('blocks state-changing requests from a different origin', async () => {
    const res = await request(app)
      .post('/api/login')
      .set('Origin', 'http://evil.example.com')
      .send({ username: 'admin', password: 'testpass' });
    expect(res.status).toBe(403);
  });

  it('allows GET (safe method) without Origin', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });
});

describe('Auth', () => {
  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/login')
      .set('Origin', ORIGIN)
      .send({ username: 'admin', password: 'nope' });
    expect(res.status).toBe(401);
  });

  it('rejects unknown user', async () => {
    const res = await request(app)
      .post('/api/login')
      .set('Origin', ORIGIN)
      .send({ username: 'ghost', password: 'whatever' });
    expect(res.status).toBe(401);
  });

  it('issues a session cookie on success and /api/me returns the user', async () => {
    const agent = await agentWithLogin('admin', 'testpass');
    const me = await agent.get('/api/me');
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ username: 'admin', role: 'admin' });
  });

  it('rejects /api/me without a session cookie', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
  });

  it('clears the cookie on logout', async () => {
    const agent = await agentWithLogin('admin', 'testpass');
    const out = await agent.post('/api/logout').set('Origin', ORIGIN);
    expect(out.status).toBe(200);
    const me = await agent.get('/api/me');
    expect(me.status).toBe(401);
  });
});

describe('Role gating', () => {
  it('admin can create an employee', async () => {
    const agent = await agentWithLogin('admin', 'testpass');
    const res = await agent
      .post('/api/employees')
      .set('Origin', ORIGIN)
      .send({ name: 'Alice', username: 'alice', password: 'alice-pw', role: 'employee' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Alice', role: 'employee' });
  });

  it('employee cannot create another employee', async () => {
    const agent = await agentWithLogin('alice', 'alice-pw');
    const res = await agent
      .post('/api/employees')
      .set('Origin', ORIGIN)
      .send({ name: 'Bob', username: 'bob', password: 'bob-pw', role: 'employee' });
    expect(res.status).toBe(403);
  });

  it('employee cannot drop tables', async () => {
    const agent = await agentWithLogin('alice', 'alice-pw');
    const res = await agent.post('/api/drop-tables').set('Origin', ORIGIN);
    expect(res.status).toBe(403);
  });
});

describe('Shift CRUD happy path', () => {
  let shiftTypeId: number;
  let shiftId: number;

  it('admin creates a shift type', async () => {
    const agent = await agentWithLogin('admin', 'testpass');
    const res = await agent
      .post('/api/shift-types')
      .set('Origin', ORIGIN)
      .send({ name: 'Morning', color: '#ff0000' });
    expect(res.status).toBe(200);
    shiftTypeId = res.body.id;
    expect(typeof shiftTypeId).toBe('number');
  });

  it('admin creates a shift, lists it, then deletes it', async () => {
    const agent = await agentWithLogin('admin', 'testpass');
    const created = await agent
      .post('/api/shifts')
      .set('Origin', ORIGIN)
      .send({
        date: '2026-05-21',
        start_time: '09:00',
        end_time: '17:00',
        shift_type: shiftTypeId,
        notes: 'integration test shift',
      });
    expect(created.status).toBe(200);
    shiftId = created.body.id;

    const list = await agent.get('/api/shifts');
    expect(list.status).toBe(200);
    expect(list.body.some((s: any) => s.id === shiftId)).toBe(true);

    const del = await agent.delete(`/api/shifts/${shiftId}`).set('Origin', ORIGIN);
    expect(del.status).toBe(200);

    const after = await agent.get('/api/shifts');
    expect(after.body.some((s: any) => s.id === shiftId)).toBe(false);
  });
});
