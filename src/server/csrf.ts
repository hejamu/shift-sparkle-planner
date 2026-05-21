import type { NextFunction, Request, Response } from 'express';

// Origin-check CSRF defense. On unsafe HTTP methods we require an Origin or
// Referer header that matches either:
//   - The request's own Host (the common case, since frontend and API share
//     a host behind nginx), or
//   - One of the explicitly allowed origins in CSRF_ALLOWED_ORIGINS (comma-
//     separated). Use this when the frontend is on a different domain.
//
// Combined with sameSite=lax cookies, this blocks classic cross-site form
// submissions without requiring a CSRF token round-trip. Less robust than
// double-submit tokens for the rare same-site subdomain attack scenario,
// but the right tradeoff for a single-origin app like this.

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function allowedOrigins(): string[] {
  const raw = process.env.CSRF_ALLOWED_ORIGINS;
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function originHost(originOrReferer: string): string | null {
  try {
    return new URL(originOrReferer).host;
  } catch {
    return null;
  }
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.header('origin');
  const referer = req.header('referer');
  const candidate = origin || referer;

  if (!candidate) {
    return res.status(403).json({ error: 'Missing Origin/Referer' });
  }

  const candidateHost = originHost(candidate);
  if (!candidateHost) {
    return res.status(403).json({ error: 'Invalid Origin/Referer' });
  }

  if (candidateHost === req.headers.host) return next();
  if (allowedOrigins().some((o) => originHost(o) === candidateHost)) return next();

  return res.status(403).json({ error: 'Cross-origin request blocked' });
}
