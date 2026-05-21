import type { Express, NextFunction, Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { db } from './db';
import { logger } from './logger';

export type Role = 'employee' | 'manager' | 'admin';
export type SessionUser = { id: number; username: string; role: Role };

declare module 'express-serve-static-core' {
  interface Request {
    user?: SessionUser;
  }
}

const SESSION_COOKIE = 'session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 1 week

function requireSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    logger.fatal('SESSION_SECRET environment variable is required');
    process.exit(1);
  }
  return secret;
}

const SESSION_SECRET = requireSecret();

export function issueSession(res: Response, user: SessionUser) {
  const token = jwt.sign(user, SESSION_SECRET, { expiresIn: SESSION_TTL_SECONDS });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, SESSION_SECRET) as SessionUser & { iat: number; exp: number };
    req.user = { id: decoded.id, username: decoded.username, role: decoded.role };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid session' });
  }
};

export const requireRole = (...roles: Role[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  next();
};

// Limit credential-stuffing: 10 login attempts per IP per 15 minutes.
// Successful logins don't count against the limit.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' },
});

export function registerAuthRoutes(app: Express) {
  app.post('/api/login', loginLimiter, (req: Request, res: Response) => {
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
}
