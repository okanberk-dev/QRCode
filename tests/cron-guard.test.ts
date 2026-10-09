import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { cronSchedulerStatus, isVercelCronRequest } from '../src/lib/cron-guard-utils';

test('isVercelCronRequest only matches the Vercel scheduler user agent', () => {
  assert.equal(isVercelCronRequest('vercel-cron/1.0'), true);
  assert.equal(isVercelCronRequest('Mozilla/5.0'), false);
  assert.equal(isVercelCronRequest(null), false);
  assert.equal(isVercelCronRequest(undefined), false);
});

test('cronSchedulerStatus downgrades 5xx and keeps 2xx/4xx', () => {
  assert.equal(cronSchedulerStatus(200), 200);
  assert.equal(cronSchedulerStatus(207), 207);
  assert.equal(cronSchedulerStatus(401), 401);
  assert.equal(cronSchedulerStatus(500), 200);
  assert.equal(cronSchedulerStatus(503), 200);
});

test('every vercel.json cron route is wrapped with withCronGuard', () => {
  const config = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8')) as {
    crons: { path: string }[];
  };
  const cronDirs = readdirSync(join(process.cwd(), 'src/app/api/cron'));
  for (const { path } of config.crons) {
    const name = path.replace('/api/cron/', '');
    assert.ok(cronDirs.includes(name), `missing route for ${path}`);
    const source = readFileSync(join(process.cwd(), 'src/app/api/cron', name, 'route.ts'), 'utf8');
    assert.ok(
      source.includes(`export const GET = withCronGuard('${path}', handleCron);`),
      `${path} is not wrapped with withCronGuard`,
    );
  }
});
