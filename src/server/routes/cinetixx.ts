import type { Express, Request, Response } from 'express';
import { XMLParser } from 'fast-xml-parser';
import { parseShowDate } from '../../lib/cinetixxParser';
import { requireAuth, requireRole } from '../auth';

const CINETIXX_URL = 'https://api.cinetixx.de/Services/CinetixxService.asmx/GetShowInfo?mandatorID=2208234164&auditid=2209573052';

export function registerCinetixxRoutes(app: Express) {
  app.get('/api/proxy/cinetixx-shows', requireAuth, requireRole('manager', 'admin'), async (req: Request, res: Response) => {
    try {
      const r = await fetch(CINETIXX_URL);
      if (!r.ok) return res.status(502).json({ error: 'Upstream request failed' });
      const text = await r.text();

      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
      const parsed = parser.parse(text);
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
        if (node['@_id'] || (node['@_attributes'] && node['@_attributes'].id)) {
          pushShow(node);
        }
        Object.values(node).forEach(v => walk(v));
      };
      walk(parsed);

      const result: { id: string; start: string | null; end: string | null }[] = [];
      for (const s of showsMap.values()) {
        const attrsId = s['@_id'] || (s['@_attributes'] && s['@_attributes'].id) || s.id || null;
        const status = s['@_status'] || (s['@_attributes'] && s['@_attributes'].status) || s.status || null;
        if (!status || String(status) !== 'SHOW_ENABLED') continue;

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
        const startIso = startDate ? startDate.toISOString() : null;
        const endIso = endDate ? endDate.toISOString() : null;
        if (startIso) result.push({ id: String(attrsId || ''), start: startIso, end: endIso });
      }

      const uniqueMap = new Map<string, { id: string; start: string | null; end: string | null }>();
      for (const r of result) {
        const key = `${r.id}|${r.start}`;
        if (!uniqueMap.has(key)) uniqueMap.set(key, r);
      }
      res.json({ shows: Array.from(uniqueMap.values()) });
    } catch (err) {
      req.log.error({ err }, 'GET /api/proxy/cinetixx-shows failed');
      res.status(502).json({ error: 'Upstream request failed' });
    }
  });
}
