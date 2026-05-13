// CLAUDE.md §42 — Audit Center shared types + literals.
//
// Tek source-of-truth: schema'da string sakladığımız enum literal'ları
// burada normalize edilir. Helper/API/UI bu modülden import eder, drift
// engellenir (CLAUDE.md §40.3 paterni).

export const AUDIT_SECTORS = ['food', 'hotel', 'retail', 'health', 'beauty', 'other'] as const;
export type AuditSector = (typeof AUDIT_SECTORS)[number];

export const AUDIT_SCORING_MODES = ['percentage', 'weighted', 'pass_fail'] as const;
export type AuditScoringMode = (typeof AUDIT_SCORING_MODES)[number];

export const AUDIT_QUESTION_TYPES = [
  'single',
  'multi',
  'scale',
  'text',
  'yes_no',
  'file',
] as const;
export type AuditQuestionType = (typeof AUDIT_QUESTION_TYPES)[number];

export const AUDIT_ASSIGNEE_TYPES = ['team_member', 'candidate', 'self', 'link'] as const;
export type AuditAssigneeType = (typeof AUDIT_ASSIGNEE_TYPES)[number];

export const AUDIT_RECURRENCES = ['once', 'daily', 'weekly', 'monthly'] as const;
export type AuditRecurrence = (typeof AUDIT_RECURRENCES)[number];

export const AUDIT_ASSIGNMENT_STATUSES = [
  'pending',
  'sent',
  'in_progress',
  'completed',
  'overdue',
  'cancelled',
] as const;
export type AuditAssignmentStatus = (typeof AUDIT_ASSIGNMENT_STATUSES)[number];

export const AUDIT_LOCALES = ['tr', 'en'] as const;
export type AuditLocale = (typeof AUDIT_LOCALES)[number];

// Helper: bilinmeyen string güvenli normalize. Schema flexible (yeni
// option eklerken migration yerine literal'a entry yeter), runtime
// kötü değerleri varsayılana düşürür.
export function isAuditSector(value: unknown): value is AuditSector {
  return typeof value === 'string' && (AUDIT_SECTORS as readonly string[]).includes(value);
}

export function isAuditQuestionType(value: unknown): value is AuditQuestionType {
  return (
    typeof value === 'string' && (AUDIT_QUESTION_TYPES as readonly string[]).includes(value)
  );
}

export function isAuditScoringMode(value: unknown): value is AuditScoringMode {
  return (
    typeof value === 'string' && (AUDIT_SCORING_MODES as readonly string[]).includes(value)
  );
}
