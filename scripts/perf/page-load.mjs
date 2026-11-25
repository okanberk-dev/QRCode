#!/usr/bin/env node
// Panel speed check (CLAUDE.md §56). Runs inside the app container as a
// Coolify scheduled task; opens a short-lived owner session (deleted at the
// end, tokens never printed) and measures:
//   1. each panel API alone: p50 / p95 over --runs requests, plus the
//      Server-Timing breakdown (auth, db, ratelimit, google) when present;
//   2. the Google Reviews page as a browser loads it: the document, the
//      sidebar link prefetches and the page's own API calls in the same
//      order and parallelism the client uses.
//   node scripts/perf/page-load.mjs --base https://www.buaze.com --label before [--runs 20] [--bell-list]
// --base http://127.0.0.1:3000 skips the proxy and TLS.
import { writeFile, mkdir } from 'node:fs/promises';
import { OPS_DIR, arg, prismaFor, log } from '../db-migration/common.mjs';
import { openSessions } from '../db-migration/session.mjs';

const base = arg('--base', 'http://127.0.0.1:3000').replace(/\/$/, '');
const runs = Number(arg('--runs', '20'));
const label = arg('--label', 'perf');
const bellList = process.argv.includes('--bell-list');
const prisma = prismaFor(arg('--db', 'DIRECT_URL'));

const pct = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b);
  return Math.round(s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]);
};

async function hit(path, cookie, extra = {}) {
  const t0 = performance.now();
  const res = await fetch(base + path, {
    headers: { cookie, 'user-agent': 'buaze-perf-check', ...extra },
    redirect: 'manual',
  });
  await res.arrayBuffer();
  return {
    path,
    status: res.status,
    ms: performance.now() - t0,
    timing: res.headers.get('server-timing') ?? '',
    start: t0,
  };
}

/** "auth;dur=1.2, db;dur=3" → { auth: 1.2, db: 3 } */
function parseTiming(header) {
  const out = {};
  for (const part of header.split(',')) {
    const [name, ...params] = part.trim().split(';');
    const dur = params.find((p) => p.trim().startsWith('dur='));
    if (name && dur) out[name] = Number(dur.trim().slice(4));
  }
  return out;
}

const s = await openSessions(prisma);
const rid = s.restaurant?.id ?? 'none';
const cookie = s.ownerCookie;
const report = { label, base, runs, apis: [], pageLoad: [] };
try {
  const apis = [
    '/api/feedback?rating=low&limit=5&isRead=false',
    '/api/feedback/counts?only=lowUnread',
    '/api/feedback?page=1&limit=20',
    '/api/feedback/counts',
    `/api/restaurants/${rid}/google/business/status`,
    `/api/restaurants/${rid}/google/business/inbox?status=unreplied`,
    `/api/restaurants/${rid}/google/business/inbox?status=all`,
    `/api/restaurants/${rid}/google/business/inbox/stats`,
    `/api/restaurants/${rid}/google/places/profile`,
  ];
  for (const p of apis) {
    await hit(p, cookie); // warm-up
    const rows = [];
    for (let i = 0; i < runs; i++) rows.push(await hit(p, cookie));
    const parts = {};
    for (const r of rows) {
      for (const [k, v] of Object.entries(parseTiming(r.timing))) (parts[k] ??= []).push(v);
    }
    const row = {
      path: p.replace(rid, '<id>'),
      status: rows[0].status,
      p50: pct(rows.map((r) => r.ms), 50),
      p95: pct(rows.map((r) => r.ms), 95),
      serverTiming: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, pct(v, 50)])),
    };
    report.apis.push(row);
    log(`${label} api ${String(row.status).padEnd(3)} p50 ${String(row.p50).padStart(4)} p95 ${String(row.p95).padStart(4)}  ${row.path}  ${JSON.stringify(row.serverTiming)}`);
  }

  // Page load as the browser does it. Sidebar links are prefetched with
  // Next's RSC prefetch headers the moment the shell hydrates.
  const prefetchHeaders = { rsc: '1', 'next-router-prefetch': '1' };
  const sidebar = ['', '/feedbacks', '/google-reviews', '/analytics', '/customers', '/qr', '/menu',
    '/audits', '/surveys', '/platforms', '/restaurants', '/guide', '/account'];
  for (let round = 0; round < 3; round++) {
    const t0 = performance.now();
    const doc = await hit(`/tr/dashboard/google-reviews?restaurantId=${rid}`, cookie, { accept: 'text/html' });
    const at = (r) => ({ path: r.path.replace(rid, '<id>'), status: r.status, startMs: Math.round(r.start - t0), ms: Math.round(r.ms), timing: parseTiming(r.timing) });
    const events = [at(doc)];
    const prefetches = sidebar.map((p) => hit(`/tr/dashboard${p}?_rsc=perf${round}`, cookie, prefetchHeaders));
    const pageApis = (async () => {
      const first = await Promise.all([
        // Before §56 the bell also fetched its 5-row list on every page load.
        ...(bellList ? [hit('/api/feedback?rating=low&limit=5&isRead=false', cookie)] : []),
        hit('/api/feedback/counts?only=lowUnread', cookie),
        hit(`/api/restaurants/${rid}/google/business/status`, cookie),
      ]);
      const inbox = await hit(`/api/restaurants/${rid}/google/business/inbox?status=unreplied`, cookie);
      return [...first, inbox];
    })();
    const [pf, api] = await Promise.all([Promise.all(prefetches), pageApis]);
    events.push(...api.map(at));
    const total = Math.round(Math.max(...api.map((r) => r.start + r.ms)) - t0);
    const pfMax = Math.round(Math.max(...pf.map((r) => r.start + r.ms)) - t0);
    report.pageLoad.push({ round, totalMs: total, prefetchDoneMs: pfMax, events });
    log(`${label} page round ${round}: data ready ${total} ms (prefetches done ${pfMax} ms)`);
    for (const e of events) log(`   +${String(e.startMs).padStart(4)} ${String(e.ms).padStart(4)} ms ${e.status} ${e.path} ${JSON.stringify(e.timing)}`);
  }
} finally {
  await s.cleanup();
  await prisma.$disconnect();
}
await mkdir(`${OPS_DIR}/reports`, { recursive: true });
const file = `${OPS_DIR}/reports/perf-${label}-${new Date().toISOString().replace(/[:.]/g, '')}.json`;
await writeFile(file, JSON.stringify(report, null, 2));
log(`report ${file}`);
