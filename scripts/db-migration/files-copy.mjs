#!/usr/bin/env node
// Copies every Supabase Storage object into stored_files (CLAUDE.md §55) and
// keeps a copy under $OPS_DIR/storage/<bucket>/<name>.
//   node scripts/db-migration/files-copy.mjs [--db supabase] [--apply]
// Without --apply: downloads and checks only. Prints counts, sizes, hashes.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { OPS_DIR, arg, flag, prismaFor, sha256, log } from './common.mjs';

const TYPES = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon' };
const apply = flag('--apply');
const db = arg('--db', 'supabase');
const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!base || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing');

const prisma = prismaFor(db);
try {
  const objects = await prisma.$queryRawUnsafe(
    `select bucket_id, name, coalesce((metadata->>'size')::bigint, -1)::bigint as size,
            coalesce(metadata->>'mimetype', '') as mimetype
       from storage.objects
      where name not like '%.emptyFolderPlaceholder'
      order by bucket_id, name`,
  );
  let bytes = 0;
  let problems = 0;
  const copied = [];
  for (const o of objects) {
    const res = await fetch(`${base}/storage/v1/object/${encodeURIComponent(o.bucket_id)}/${o.name.split('/').map(encodeURIComponent).join('/')}`, {
      headers: { Authorization: `Bearer ${key}`, apikey: key },
    });
    if (!res.ok) { problems++; log(`DOWNLOAD FAILED ${o.bucket_id}/${o.name} → ${res.status}`); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    const expected = Number(o.size);
    if (expected >= 0 && expected !== buf.length) { problems++; log(`SIZE MISMATCH ${o.name}: meta ${expected} got ${buf.length}`); continue; }
    const hash = sha256(buf);
    const dest = path.join(OPS_DIR, 'storage', o.bucket_id, o.name);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, buf);
    const contentType = o.mimetype || TYPES[path.extname(o.name).toLowerCase()] || 'application/octet-stream';
    bytes += buf.length;
    copied.push({ path: o.name, size: buf.length, hash, contentType, buf });
    log(`ok ${o.bucket_id}/${o.name} ${buf.length} bytes ${contentType} sha256 ${hash.slice(0, 12)}…`);
  }
  log(`storage objects ${objects.length}, downloaded ${copied.length}, bytes ${bytes}, problems ${problems}`);
  if (problems) process.exitCode = 1;

  if (apply && !problems) {
    for (const f of copied) {
      await prisma.storedFile.upsert({
        where: { path: f.path },
        create: { path: f.path, contentType: f.contentType, size: f.size, sha256: f.hash, data: new Uint8Array(f.buf) },
        update: { contentType: f.contentType, size: f.size, sha256: f.hash, data: new Uint8Array(f.buf) },
      });
    }
    // Read back from the database and compare byte for byte.
    const stored = await prisma.storedFile.findMany({ where: { path: { in: copied.map((f) => f.path) } } });
    const byPath = new Map(stored.map((s) => [s.path, s]));
    let bad = 0;
    for (const f of copied) {
      const s = byPath.get(f.path);
      if (!s || s.size !== f.size || sha256(Buffer.from(s.data)) !== f.hash || s.sha256 !== f.hash) { bad++; log(`DB MISMATCH ${f.path}`); }
    }
    const total = stored.reduce((n, s) => n + s.size, 0);
    log(`stored_files: ${stored.length}/${copied.length} rows, ${total} bytes, mismatches ${bad}`);
    if (bad) process.exitCode = 1;
  } else if (!apply) {
    log('dry run (add --apply to write stored_files)');
  }
} finally {
  await prisma.$disconnect();
}
