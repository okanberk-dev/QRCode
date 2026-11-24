#!/usr/bin/env node
// Live feed end to end (CLAUDE.md §55): opens /api/realtime/activity as the
// owner, posts a review through /api/feedback and waits for the event.
// WRITES one feedback row and one reply: run it only against the rehearsal copy.
//   node scripts/db-migration/live-feed-check.mjs --base http://127.0.0.1:3001 --db new
import { arg, prismaFor, log } from './common.mjs';
import { openSessions } from './session.mjs';

const base = arg('--base', 'http://127.0.0.1:3001').replace(/\/$/, '');
const prisma = prismaFor(arg('--db', 'new'));
const s = await openSessions(prisma);
const controller = new AbortController();
try {
  if (!s.restaurant) throw new Error('owner has no business');
  const res = await fetch(`${base}/api/realtime/activity?restaurantIds=${s.restaurant.id}`, {
    headers: { cookie: s.ownerCookie, accept: 'text/event-stream' }, signal: controller.signal,
  });
  log(`stream status ${res.status} ${res.headers.get('content-type')}`);
  if (res.status !== 200 || !res.body) throw new Error('stream did not open');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const read = async (until, ms) => {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
      const chunk = await Promise.race([reader.read(), new Promise((r) => setTimeout(() => r({ timeout: true }), deadline - Date.now()))]);
      if (chunk.timeout || chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      const hit = until(buffer);
      if (hit) return hit;
    }
    return null;
  };
  if (!(await read((b) => b.includes(': connected'), 5000))) throw new Error('no connected comment');
  const t0 = Date.now();
  const post = await fetch(`${base}/api/feedback`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.77' },
    body: JSON.stringify({ rating: 5, comment: 'Taşıma provası canlı akış kontrolü', restaurantSlug: s.restaurant.slug, hasKvkkConsent: true, locale: 'tr' }),
  });
  const body = await post.json().catch(() => ({}));
  log(`feedback POST ${post.status}`);
  if (!post.ok) throw new Error(`feedback POST failed ${post.status} ${JSON.stringify(body).slice(0, 200)}`);
  const ev = await read((b) => (b.includes('event: feedback') ? b : null), 10000);
  if (!ev) throw new Error('no live event within 10 s');
  log(`LIVE FEED OK: event received ${Date.now() - t0} ms after the POST`);
  // Reply flow on the same test review (internal note: the rehearsal copy
  // runs without the mail key, so nothing is e-mailed).
  const id = JSON.parse(ev.split('event: feedback')[1].split('data: ')[1].split('\n')[0]).id;
  const reply = await fetch(`${base}/api/feedback/${id}/reply`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: s.ownerCookie },
    body: JSON.stringify({ body: 'Geri bildiriminiz için teşekkür ederiz.', channel: 'internal', confirmResponsibility: true, locale: 'tr' }),
  });
  const saved = await prisma.feedbackReply.count({ where: { feedbackId: id } });
  log(`reply POST ${reply.status}, replies stored ${saved}`);
  if (!reply.ok || saved < 1) throw new Error('reply flow failed');
  log('REPLY FLOW OK');
} catch (e) {
  log(`LIVE FEED FAILED: ${e.message}`);
  process.exitCode = 1;
} finally {
  controller.abort();
  await s.cleanup();
  await prisma.$disconnect();
}
