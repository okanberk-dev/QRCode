import * as Sentry from '@sentry/nextjs';
import { NextResponse, type NextRequest } from 'next/server';
import { cronSchedulerStatus, isVercelCronRequest } from './cron-guard-utils';

type CronHandler = (req: NextRequest) => Promise<Response>;

/**
 * Wrap a cron route handler so a failed run does not trigger Vercel's
 * "cron run failed" e-mail (see `cronSchedulerStatus`).
 *
 * - Thrown errors and 5xx responses are captured in Sentry (tag `cron`), and
 *   the scheduler gets 200 with `{ ok: false }` so it records the run as done.
 * - Only real Vercel cron invocations are rewritten. An admin "run now"
 *   trigger or a manual curl still sees the real status code for debugging.
 */
export function withCronGuard(path: string, handler: CronHandler): CronHandler {
  return async function guardedCron(req: NextRequest): Promise<Response> {
    if (!isVercelCronRequest(req.headers.get('user-agent'))) {
      return handler(req);
    }

    let response: Response;
    try {
      response = await handler(req);
    } catch (err) {
      Sentry.captureException(err, { tags: { cron: path, kind: 'cron-run-failed' } });
      console.error(`[cron] ${path} threw`, err instanceof Error ? err.message : err);
      return NextResponse.json({ ok: false, error: 'cron_failed' }, { status: 200 });
    }

    const status = cronSchedulerStatus(response.status);
    if (status === response.status) return response;

    Sentry.captureMessage(`Cron job returned ${response.status}: ${path}`, {
      level: 'error',
      tags: { cron: path, kind: 'cron-run-failed' },
      extra: { status: response.status },
      // One Sentry issue per cron, not one per run.
      fingerprint: ['cron-run-failed', path],
    });
    console.error(`[cron] ${path} returned ${response.status}`);
    const headers = new Headers(response.headers);
    headers.set('x-cron-handler-status', String(response.status));
    return new Response(response.body, { status, headers });
  };
}
