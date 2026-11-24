#!/usr/bin/env node
// Server response times for public pages, the owner panel and the admin
// panel (CLAUDE.md §55). Measures from inside the container, so the numbers
// are server time (no internet, no TLS).
//   node scripts/db-migration/measure.mjs --base http://127.0.0.1:3000 --db supabase --label before [--runs 5]
// --db is the database the server at --base uses (for the session row).
import { writeFile } from 'node:fs/promises';
import { OPS_DIR, arg, prismaFor, log } from './common.mjs';
import { openSessions } from './session.mjs';

const base = arg('--base', 'http://127.0.0.1:3000').replace(/\/$/, '');
const runs = Number(arg('--runs', '5'));
const label = arg('--label', 'measure');
const prisma = prismaFor(arg('--db', 'new'));

async function hit(url, cookie) {
  const t0 = performance.now();
  const res = await fetch(url, {
    headers: { ...(cookie ? { cookie } : {}), accept: 'text/html,application/json;q=0.9', 'user-agent': 'buaze-db-migration-check' },
    redirect: 'manual',
  });
  const ttfb = performance.now() - t0;
  await res.arrayBuffer();
  return { status: res.status, ttfb, total: performance.now() - t0 };
}
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

const s = await openSessions(prisma);
const rid = s.restaurant?.id ?? 'none';
const slug = s.restaurant?.slug ?? 'none';
const groups = [
  ['public', null, ['/api/health?db=1', '/tr', '/tr/pricing', `/r/${slug}`, `/menu/${slug}`]],
  ['owner', s.ownerCookie, [
    '/tr/dashboard', '/tr/dashboard/feedbacks', `/tr/dashboard/google-reviews?restaurantId=${rid}`,
    '/tr/dashboard/analytics', '/tr/dashboard/customers', '/tr/dashboard/qr', '/tr/dashboard/restaurants',
    '/api/feedback?page=1&limit=20', '/api/feedback/counts',
    `/api/restaurants/${rid}/google/business/inbox?status=unreplied`, `/api/restaurants/${rid}/google/business/inbox/stats`,
  ]],
  ['admin', s.adminCookie, ['/admin/dashboard', '/admin/restaurants', '/admin/members', '/admin/reviews', '/admin/analytics']],
];
const results = [];
try {
  for (const [group, cookie, paths] of groups) {
    if (group !== 'public' && !cookie) continue;
    for (const p of paths) {
      let r = [];
      try {
        await hit(base + p, cookie); // warm-up
        for (let i = 0; i < runs; i++) r.push(await hit(base + p, cookie));
      } catch (e) {
        log(`${label} ${group} FAILED ${p}: ${e.message}`);
        process.exitCode = 1;
        continue;
      }
      const row = {
        group, path: p.replace(rid, '<id>').replace(slug, '<slug>'), status: r[0].status,
        ttfbMs: Math.round(median(r.map((x) => x.ttfb))), totalMs: Math.round(median(r.map((x) => x.total))),
      };
      results.push(row);
      log(`${label} ${row.group.padEnd(6)} ${String(row.status).padEnd(3)} ttfb ${String(row.ttfbMs).padStart(5)} ms  total ${String(row.totalMs).padStart(5)} ms  ${row.path}`);
    }
  }
} finally {
  await s.cleanup();
  await prisma.$disconnect();
}
const file = `${OPS_DIR}/reports/measure-${label}-${new Date().toISOString().replace(/[:.]/g, '')}.json`;
await writeFile(file, JSON.stringify({ label, base, runs, results }, null, 2));
log(`report ${file}`);
