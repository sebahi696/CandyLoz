// Daftar Fatoora bridge — a small HTTPS-able service that holds each EGS unit's private key and CSID
// and talks to ZATCA for the browser app (browsers can't call ZATCA directly: CORS + key custody).
//   DAFTAR_KEY=change-me PORT=8787 node server/bridge.mjs
// Endpoints (JSON, header X-Daftar-Key required):
//   GET  /health
//   POST /onboard  { tenant, deviceId, env, otp, serial, seller, branchName, branchCode, location, industry }
//   POST /submit   { tenant, deviceId, doc }
//   GET  /devices?tenant=…
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { onboard, submit } from './lib/onboard.mjs';

const PORT = +process.env.PORT || 8787;
const KEY = process.env.DAFTAR_KEY || '';
const ORIGINS = (process.env.DAFTAR_ORIGINS || 'https://sebahi696.github.io,http://localhost:8080,http://127.0.0.1:8080').split(',');
const DATA = process.env.DAFTAR_DATA || path.join(path.dirname(new URL(import.meta.url).pathname), 'data');
fs.mkdirSync(DATA, { recursive: true, mode: 0o700 });

const safe = (s) => String(s || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 60);
const credPath = (tenant, deviceId) => path.join(DATA, `${safe(tenant)}__${safe(deviceId)}.json`);
const readCred = (t, d) => { try { return JSON.parse(fs.readFileSync(credPath(t, d), 'utf8')); } catch (e) { return null; } };
const writeCred = (t, d, c) => fs.writeFileSync(credPath(t, d), JSON.stringify(c), { mode: 0o600 });

function send(res, code, body, origin) {
  const h = { 'Content-Type': 'application/json; charset=utf-8', 'Vary': 'Origin' };
  if (origin && ORIGINS.includes(origin)) Object.assign(h, { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Content-Type, X-Daftar-Key', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' });
  res.writeHead(code, h); res.end(JSON.stringify(body));
}
const readBody = (req) => new Promise((ok, bad) => { let b = ''; req.on('data', c => { b += c; if (b.length > 2e6) { bad(new Error('too_large')); req.destroy(); } }); req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch (e) { bad(e); } }); });

http.createServer(async (req, res) => {
  const origin = req.headers.origin; const url = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') return send(res, 204, {}, origin);
  if (url.pathname === '/health') return send(res, 200, { ok: true, service: 'daftar-fatoora-bridge', time: new Date().toISOString() }, origin);
  if (!KEY || req.headers['x-daftar-key'] !== KEY) return send(res, 401, { error: 'unauthorized' }, origin);
  try {
    if (req.method === 'GET' && url.pathname === '/devices') {
      const t = safe(url.searchParams.get('tenant'));
      const list = fs.readdirSync(DATA).filter(f => f.startsWith(t + '__')).map(f => { const c = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); return { deviceId: f.split('__')[1].replace('.json', ''), env: c.env, expires: c.expires, onboardedAt: c.onboardedAt }; });
      return send(res, 200, { devices: list }, origin);
    }
    const body = await readBody(req);
    if (req.method === 'POST' && url.pathname === '/onboard') {
      const r = await onboard(body);
      if (r.ok) writeCred(body.tenant, body.deviceId, { ...r.credentials, onboardedAt: new Date().toISOString() });
      return send(res, r.ok ? 200 : 422, { ok: r.ok, steps: r.steps, env: body.env, expires: r.credentials && r.credentials.expires }, origin);
    }
    if (req.method === 'POST' && url.pathname === '/submit') {
      const cred = readCred(body.tenant, body.deviceId); if (!cred) return send(res, 409, { error: 'device_not_onboarded' }, origin);
      return send(res, 200, await submit(body.doc, cred), origin);
    }
    return send(res, 404, { error: 'not_found' }, origin);
  } catch (e) { console.error(e); return send(res, 500, { error: String(e.message || e) }, origin); }
}).listen(PORT, () => console.log(`Daftar Fatoora bridge on :${PORT} (data: ${DATA})`));
