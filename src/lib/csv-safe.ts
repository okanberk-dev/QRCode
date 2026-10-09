// CSV formula-injection guard (OWASP "CSV Injection").
//
// Why: feedback comments, customer names, survey answers etc. are written by
// end customers on public forms and land verbatim in owner/admin CSV exports.
// A cell like `=HYPERLINK("http://evil",…)` or `=cmd|' /C calc'!A0` executes
// when the owner opens the file in Excel / Sheets. Prefixing a single quote
// makes the spreadsheet treat the cell as text.

const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

/**
 * Neutralize a single string cell. Numeric strings ("-3", "+1.5", "-0.5")
 * are left alone — they come from numeric columns and are not formulas. A
 * lone "-" (common empty placeholder) is also kept as-is.
 */
export function neutralizeCsvFormula(s: string): string {
  if (!FORMULA_TRIGGER.test(s)) return s;
  if (s === '-') return s;
  if (s.trim() !== '' && Number.isFinite(Number(s))) return s;
  return `'${s}`;
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return neutralizeCsvFormula(value);
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
    // Real numbers are never formulas — never prefix them.
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  return neutralizeCsvFormula(JSON.stringify(value) ?? '');
}

/**
 * Always-quoted, formula-safe CSV cell: `"…"` with inner quotes doubled.
 * Same output as the previous local `esc` / `csvEscape` helpers for normal
 * values; only formula-leading strings change (gain a `'` prefix).
 */
export function csvCell(value: unknown): string {
  return `"${stringify(value).replace(/"/g, '""')}"`;
}
