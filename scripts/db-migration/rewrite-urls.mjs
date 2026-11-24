#!/usr/bin/env node
// Points saved Supabase Storage links at /files/ (CLAUDE.md §55):
//   <SUPABASE_URL>/storage/v1/object/public/<bucket>/x  →  <SITE_URL>/files/x
// in every text / json column of schema public. Dry run by default;
// --apply runs all updates in one transaction, then checks that no old link
// is left and that every new link has a stored_files row.
//   node scripts/db-migration/rewrite-urls.mjs [--db supabase] [--apply]
import { arg, flag, prismaFor, log } from './common.mjs';

const apply = flag('--apply');
const prisma = prismaFor(arg('--db', 'supabase'));
const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.buaze.com').replace(/\/$/, '');
const newPrefix = `${site}/files/`;
if (!base) throw new Error('SUPABASE_URL missing');
const q = (s) => `"${s.replace(/"/g, '""')}"`;

try {
  const buckets = (await prisma.$queryRawUnsafe(`select id from storage.buckets`).catch(() => [])).map((b) => b.id);
  if (process.env.SUPABASE_STORAGE_BUCKET && !buckets.includes(process.env.SUPABASE_STORAGE_BUCKET)) buckets.push(process.env.SUPABASE_STORAGE_BUCKET);
  const prefixes = buckets.flatMap((b) => [`${base}/storage/v1/object/public/${b}/`, `${base}/storage/v1/render/image/public/${b}/`]);
  const cols = await prisma.$queryRawUnsafe(
    `select table_name, column_name, data_type from information_schema.columns
      where table_schema = 'public' and data_type in ('text', 'character varying', 'json', 'jsonb')
      order by 1, 2`,
  );
  const hits = [];
  for (const c of cols) {
    for (const p of prefixes) {
      const [{ n }] = await prisma.$queryRawUnsafe(
        `select count(*)::int as n from public.${q(c.table_name)} where strpos(${q(c.column_name)}::text, $1) > 0`, p);
      if (n > 0) hits.push({ ...c, prefix: p, n });
    }
  }
  for (const h of hits) log(`${h.table_name}.${h.column_name} (${h.data_type}): ${h.n} row(s)`);
  log(`columns with Supabase Storage links: ${hits.length}, rows: ${hits.reduce((s, h) => s + h.n, 0)}`);
  if (!apply) { log('dry run (add --apply to rewrite)'); process.exit(0); }

  await prisma.$transaction(async (tx) => {
    for (const h of hits) {
      const col = q(h.column_name);
      const cast = h.data_type === 'jsonb' ? '::jsonb' : h.data_type === 'json' ? '::json' : '';
      const set = cast ? `replace(${col}::text, $1, $2)${cast}` : `replace(${col}, $1, $2)`;
      const n = await tx.$executeRawUnsafe(
        `update public.${q(h.table_name)} set ${col} = ${set} where strpos(${col}::text, $1) > 0`, h.prefix, newPrefix);
      log(`updated ${h.table_name}.${h.column_name}: ${n}`);
    }
  });

  // Check: nothing old left, every new link resolves to a stored file.
  let left = 0;
  const referenced = new Set();
  for (const c of cols) {
    for (const p of prefixes) {
      const [{ n }] = await prisma.$queryRawUnsafe(
        `select count(*)::int as n from public.${q(c.table_name)} where strpos(${q(c.column_name)}::text, $1) > 0`, p);
      left += n;
    }
    const rows = await prisma.$queryRawUnsafe(
      `select ${q(c.column_name)}::text as v from public.${q(c.table_name)} where strpos(${q(c.column_name)}::text, $1) > 0`, newPrefix);
    for (const r of rows) for (const m of r.v.matchAll(new RegExp(`${newPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([A-Za-z0-9_./-]+)`, 'g'))) referenced.add(m[1]);
  }
  const stored = new Set((await prisma.storedFile.findMany({ select: { path: true } })).map((s) => s.path));
  const missing = [...referenced].filter((p) => !stored.has(p));
  log(`old links left: ${left}; /files/ links: ${referenced.size}; without a stored file: ${missing.length}`);
  for (const m of missing) log(`MISSING FILE ${m}`);
  if (left || missing.length) process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
