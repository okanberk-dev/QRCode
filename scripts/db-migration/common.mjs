// Shared bits for the Node migration scripts (CLAUDE.md §55). Never prints
// connection strings, tokens or keys.
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';

export const OPS_DIR = process.env.OPS_DIR || '/app/ops-data';

export function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
export const flag = (name) => process.argv.includes(name);

/** supabase | new | <ENV_NAME> → connection string (same rules as lib.sh). */
export function urlFor(name) {
  if (name === 'supabase') {
    const f = `${OPS_DIR}/rollback/supabase-direct-url`;
    if (existsSync(f)) return readFileSync(f, 'utf8').trim();
    name = 'DIRECT_URL';
  }
  if (name === 'new') name = 'NEW_DATABASE_URL';
  const v = process.env[name];
  if (!v) throw new Error(`env ${name} missing`);
  return v;
}

export function prismaFor(name) {
  return new PrismaClient({ datasourceUrl: urlFor(name) });
}

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

export function log(...parts) {
  console.log(new Date().toISOString().slice(11, 19), ...parts);
}

/** JSON.stringify that survives BigInt. */
export const json = (v) => JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? Number(x) : x));
