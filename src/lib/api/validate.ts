import { NextResponse } from 'next/server';
import type { ZodSchema } from 'zod';

// ────────────────────────────────────────────────────────────────────────────
// Optional Zod validation helper for App Router route handlers.
//
// SCOPE — when to use this helper (CLAUDE.md §28 Backend Validation Strategy):
//
// ✅ USE for:
//   - NEW routes that accept complex bodies (multi-field, nested, conditional
//     fields, enum unions)
//   - HIGH-RISK surface area: Google Business Profile integration, billing /
//     subscription / invoice flows, campaign create/update, QR create/update,
//     onboarding multi-step state, admin role/permission updates,
//     webhook / API key creation, feedback submission, public forms that
//     accept complex user input
//   - Routes that are already being modified for a concrete feature or bug
//     fix and would benefit from typed validation
//
// ❌ DO NOT USE (manual validation is fine):
//   - Simple GET / list endpoints
//   - Health / status / cron health-check endpoints
//   - Tiny update / toggle endpoints with one or two fields
//   - Working endpoints that aren't being touched
//
// DO NOT bulk-migrate existing manual validation to this helper. Adoption is
// incremental — one route at a time, and only when there's a concrete reason
// (new feature, complex schema, repeated validation bug).
//
// ────────────────────────────────────────────────────────────────────────────

export type ValidationSuccess<T> = {
  ok: true;
  data: T;
};

export type ValidationFailure = {
  ok: false;
  response: NextResponse;
};

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Parse and validate a request body against a Zod schema.
 *
 * Usage:
 *
 * ```ts
 * import { z } from 'zod';
 * import { validateBody } from '@/lib/api/validate';
 *
 * const Body = z.object({
 *   name: z.string().min(1).max(120),
 *   platforms: z.array(z.string()).max(10),
 * });
 *
 * export async function POST(req: Request) {
 *   const body = await req.json().catch(() => null);
 *   const parsed = validateBody(Body, body);
 *   if (!parsed.ok) return parsed.response;
 *
 *   // parsed.data is fully typed: { name: string; platforms: string[] }
 *   // …business logic…
 * }
 * ```
 *
 * Error shape on failure (HTTP 400):
 * ```json
 * {
 *   "error": "validation_error",
 *   "message": "Request body failed validation.",
 *   "issues": [
 *     { "path": "platforms.0", "message": "String must contain at most 80 characters" }
 *   ]
 * }
 * ```
 *
 * The error contract is stable; client code can rely on `error === 'validation_error'`
 * to distinguish from auth (401), authz (403), or server (500) failures.
 */
export function validateBody<T>(schema: ZodSchema<T>, body: unknown): ValidationResult<T> {
  const result = schema.safeParse(body);

  if (result.success) {
    return { ok: true, data: result.data };
  }

  const issues = result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));

  return {
    ok: false,
    response: NextResponse.json(
      {
        error: 'validation_error',
        message: 'Request body failed validation.',
        issues,
      },
      { status: 400 },
    ),
  };
}
