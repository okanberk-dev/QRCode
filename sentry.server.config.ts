import * as Sentry from '@sentry/nextjs';
import { scrubSentryEvent, scrubSentryLog } from './src/lib/billing/redact';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // KVKK / GDPR: do not auto-send IP addresses, request bodies, or
    // user-identifiable headers. Capture them explicitly per-event when
    // needed and after legitimate-interest review.
    sendDefaultPii: false,
    // Session Replay is browser-only; the Node SDK ignores this option.
    // Setting it explicitly here keeps the server config in lock-step with
    // the client config (see instrumentation-client.ts) so a future SDK
    // bump cannot quietly enable a server replay path. CLAUDE.md §26.2
    // documents the canonical 0 / 1.0 (off / on-error) split.
    replaysSessionSampleRate: 0,
    tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
    // Local variables are read through the V8 inspector, which no in-app
    // wrapper (e.g. billing `Sensitive`) can hide, and a frame can hold a
    // revealed card token or key. Off in production; dev keeps them.
    includeLocalVariables: process.env.NODE_ENV !== 'production',
    // Logs bypass beforeSend: enableLogs stays on only together with the
    // mandatory beforeSendLog scrubber.
    enableLogs: true,
    beforeSendLog: scrubSentryLog,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    // Query strings, cookies, non-allow-listed headers, billing request
    // bodies and PAN/base64/key-shaped values never leave (billing/redact.ts).
    beforeSendTransaction(event) {
      return scrubSentryEvent(event);
    },
    // Stage A4 §38.96 — impersonation flow tag injection. Helper'lar
    // (writeAdminAuditLog + impersonate endpoint'leri) zaten manuel
    // `tags.kind='impersonation'` set ediyor; bu beforeSend onRequestError
    // path'inde otomatik fired-by-error event'leri tag'ler. Forensic ops
    // için: tag'li event filter dashboard'da impersonation süresince
    // çıkan tüm hataları görme imkanı verir.
    beforeSend(event) {
      event = scrubSentryEvent(event);
      // Mevcut event tag'lerine zarar verme — sadece impersonation context
      // varsa zenginleştir. Tag header'lar Vercel runtime'da
      // `globalThis.__buazeImpersonationContext` ile set edilirse etiketle
      // (helper opsiyonel, bu PR'da otomatik fire yok). Future scope.
      const ctx = (globalThis as { __buazeImpersonationContext?: { adminId: string; sessionId: string } }).__buazeImpersonationContext;
      if (ctx) {
        event.tags = {
          ...(event.tags ?? {}),
          impersonating: 'true',
          realAdminId: ctx.adminId,
        };
      }
      return event;
    },
  });
  // CLAUDE.md §38.8/§38.9 follow-up — cold-start init signal. PR #390 +
  // /api/sentry-test diagnostics could not prove which Sentry project the
  // server runtime initialised against (server captures returned valid
  // event ids but never landed in `buaze-ev/sentry-apricot-blanket`). This
  // line fires once per warm Lambda, captured by Vercel runtime logs as a
  // standalone `level=error` row, and prints a non-secret DSN fingerprint
  // (host + project id only — public key stripped). If the printed project
  // id matches the Sentry org we expect, the "DSN routes elsewhere"
  // hypothesis is ruled out and the next iteration narrows to transport
  // flush behaviour.
  console.error(`[sentry-init/server] dsn=${describeDsn(dsn)} env=${process.env.VERCEL_ENV || process.env.NODE_ENV || 'unset'}`);
} else {
  console.error('[sentry-init/server] dsn=unset — Sentry SDK not initialised on server runtime');
}

function describeDsn(raw: string): string {
  try {
    const url = new URL(raw);
    const projectId = url.pathname.replace(/^\//, '') || 'unknown';
    return `${url.host}/${projectId}`;
  } catch {
    return 'invalid';
  }
}
