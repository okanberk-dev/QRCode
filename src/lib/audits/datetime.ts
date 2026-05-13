// CLAUDE.md §42 — Audit dueAt parse helper. 3 callsite (templates POST,
// assignments POST, assignments PATCH) kullanır.
//
// `<input type="date">` `value` boş string olabilir veya invalid ISO
// alabilir; `new Date('')` ve `new Date('garbage')` → Invalid Date →
// Prisma reject (P2000). Bu helper tek noktadan guard yapar, route'lar
// `parsed.ok ? parsed.date : 400 INVALID_DUE_AT` desenini kullanır.

export type AuditDueAtParse =
  | { ok: true; date: Date | null }
  | { ok: false };

/**
 * Parse `dueAt` body field for audit templates/assignments.
 *
 * - `null` / `undefined` / `''` → `{ ok: true, date: null }` (unset)
 * - Valid ISO date string → `{ ok: true, date: Date }`
 * - Garbage string → `{ ok: false }` (caller 400 döner)
 */
export function parseAuditDueAt(value: string | null | undefined): AuditDueAtParse {
  if (value === null || value === undefined || value === '') {
    return { ok: true, date: null };
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { ok: false };
  return { ok: true, date: d };
}
