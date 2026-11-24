#!/usr/bin/env node
// Decrypts every stored Google token with ENCRYPTION_KEY, in the same
// format as src/lib/google-token-crypto.ts (v1:iv:ct:tag, AES-256-GCM).
// Prints counts only. node scripts/db-migration/check-tokens.mjs --db new
import { createDecipheriv } from 'node:crypto';
import { arg, prismaFor, log } from './common.mjs';

const key = Buffer.from(process.env.ENCRYPTION_KEY || '', 'base64');
if (key.length !== 32) throw new Error('ENCRYPTION_KEY missing or not 32 bytes');
const prisma = prismaFor(arg('--db', 'new'));
const open = (blob) => {
  const [, iv, ct, tag] = blob.split(':');
  const d = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'), { authTagLength: 16 });
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(ct, 'base64')), d.final()]).toString('utf8');
};
try {
  const rows = await prisma.$queryRawUnsafe(`select access_token, refresh_token from google_integrations`);
  const c = { rows: rows.length, decrypted: 0, failed: 0, plain: 0, empty: 0 };
  for (const r of rows) {
    for (const t of [r.access_token, r.refresh_token]) {
      if (!t) { c.empty++; continue; }
      if (!t.startsWith('v1:')) { c.plain++; continue; }
      try { if (open(t).length > 0) c.decrypted++; else c.failed++; } catch { c.failed++; }
    }
  }
  log(`google_integrations ${c.rows} rows: decrypted ${c.decrypted}, failed ${c.failed}, plain ${c.plain}, empty ${c.empty}`);
  if (c.failed) process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
