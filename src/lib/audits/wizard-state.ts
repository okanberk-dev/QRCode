// CLAUDE.md §42 — Audit wizard state + Zod schemas (Phase 2).
//
// Bu modül owner audit oluşturma wizard'ının "tek source-of-truth" tipini
// ve API submit payload'ı için Zod schema'larını dışa açar. Backend ve UI
// aynı tipi tüketir — drift engellenir (CLAUDE.md §40.5 + §28).

import { z } from 'zod';
import {
  AUDIT_ASSIGNEE_TYPES,
  AUDIT_LOCALES,
  AUDIT_QUESTION_TYPES,
  AUDIT_RECURRENCES,
  AUDIT_SCORING_MODES,
  AUDIT_SECTORS,
  type AuditAssigneeType,
  type AuditLocale,
  type AuditQuestionType,
  type AuditRecurrence,
  type AuditScoringMode,
  type AuditSector,
} from './types';

// ─── Question editor draft ──────────────────────────────────────────────

export interface AuditQuestionDraft {
  // Stable client id — DnD reorder + edit modal için. Submit zamanı backend
  // yeniden id üretir, draft id yok sayılır.
  id: string;
  type: AuditQuestionType;
  prompt: string;
  helpText?: string | null;
  options?: string[] | null;
  correctAnswer?: string | string[] | number | null;
  weight: number;
  isRequired: boolean;
  sortOrder: number;
}

// Zod — UI'da kontrol + API submit'te tekrar doğrulanır.
export const AuditQuestionSchema = z
  .object({
    id: z.string().min(1).optional(),
    type: z.enum(AUDIT_QUESTION_TYPES),
    prompt: z.string().min(1).max(2000),
    helpText: z.string().max(2000).nullable().optional(),
    options: z.array(z.string().min(1).max(200)).max(20).nullable().optional(),
    correctAnswer: z.unknown().nullable().optional(),
    weight: z.number().int().min(1).max(10).default(1),
    isRequired: z.boolean().default(true),
    sortOrder: z.number().int().min(0).max(99999).default(0),
  })
  .strict()
  // Tip-spesifik tutarlılık: single/multi/yes_no için options gerekir;
  // scale/text/file için options anlamsız.
  .refine(
    (q) => {
      const needsOptions = q.type === 'single' || q.type === 'multi' || q.type === 'yes_no';
      if (!needsOptions) return true;
      return Array.isArray(q.options) && q.options.length >= 2;
    },
    {
      message: 'Bu soru tipi en az 2 seçenek gerektirir',
      path: ['options'],
    },
  );

// ─── Wizard step shapes ─────────────────────────────────────────────────

export const Step1Schema = z
  .object({
    restaurantId: z.string().min(1, 'Restoran seçilmedi'),
    title: z.string().min(1).max(200),
    description: z.string().max(4000).nullable().optional(),
    sector: z.enum(AUDIT_SECTORS),
    categoryId: z.string().min(1).nullable().optional(),
    locale: z.enum(AUDIT_LOCALES).default('tr'),
  })
  .strict();

export const Step2BaseSchema = z
  .object({
    scoringMode: z.enum(AUDIT_SCORING_MODES),
    passingScore: z.number().int().min(0).max(100).nullable().optional(),
  })
  .strict();

export const Step2Schema = Step2BaseSchema.refine(
  (v) => v.scoringMode !== 'pass_fail' || (v.passingScore != null && v.passingScore > 0),
  { message: 'Geçti/Kaldı modu için geçme puanı zorunlu', path: ['passingScore'] },
);

export const Step3Schema = z
  .object({
    questions: z.array(AuditQuestionSchema).min(1, 'En az 1 soru ekleyin').max(100),
  })
  .strict();

// Step 4 assignment opsiyonel — owner "atla" diyebilir. Tip 'none' state'i
// "şimdilik atama yok" anlamına gelir.
export const AssignmentDraftSchema = z
  .object({
    enabled: z.boolean().default(false),
    assigneeType: z.enum(AUDIT_ASSIGNEE_TYPES).nullable().optional(),
    assigneeTeamMemberId: z.string().nullable().optional(),
    assigneeName: z.string().max(200).nullable().optional(),
    assigneeEmail: z.string().email().nullable().optional().or(z.literal('')),
    assigneePhone: z.string().max(40).nullable().optional(),
    dueAt: z.string().nullable().optional(), // ISO date string from <input type=date>
    recurrence: z.enum(AUDIT_RECURRENCES).default('once'),
    internalNote: z.string().max(2000).nullable().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (!v.enabled) return; // skip ediliyor — alan zorunluluğu yok
    if (!v.assigneeType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['assigneeType'],
        message: 'Atama tipi seçilmedi',
      });
      return;
    }
    if (v.assigneeType === 'team_member' && !v.assigneeTeamMemberId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['assigneeTeamMemberId'],
        message: 'Ekip üyesi seçilmedi',
      });
    }
    if (v.assigneeType === 'candidate') {
      const hasContact = Boolean(v.assigneeEmail) || Boolean(v.assigneePhone);
      if (!hasContact) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['assigneeEmail'],
          message: 'Aday için en az e-posta veya telefon gerekli',
        });
      }
    }
  });

// ─── Full submit payload (POST /api/restaurants/[id]/audits/templates) ─

export const AuditTemplateSubmitSchema = z
  .object({
    title: Step1Schema.shape.title,
    description: Step1Schema.shape.description,
    sector: Step1Schema.shape.sector,
    categoryId: Step1Schema.shape.categoryId,
    locale: Step1Schema.shape.locale,
    scoringMode: Step2BaseSchema.shape.scoringMode,
    passingScore: Step2BaseSchema.shape.passingScore,
    questions: Step3Schema.shape.questions,
    publish: z.boolean().default(false),
    assignment: AssignmentDraftSchema.optional(),
  })
  .strict();

export type AuditTemplateSubmitInput = z.infer<typeof AuditTemplateSubmitSchema>;

// PATCH endpoint kullanıcı tüm wizard'ı tekrar gönderir — backend full
// replace yapar (Phase 1 admin paterniyle aynı). Sadece publish/assignment
// alanları opsiyonel.
export const AuditTemplatePatchSchema = AuditTemplateSubmitSchema.partial().strict();

// ─── UI wizard state ───────────────────────────────────────────────────

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export interface AuditWizardState {
  // Step 1
  restaurantId: string;
  title: string;
  description: string;
  sector: AuditSector;
  categoryId: string | null;
  locale: AuditLocale;
  // Step 2
  scoringMode: AuditScoringMode;
  passingScore: number | null;
  // Step 3
  questions: AuditQuestionDraft[];
  // Step 4
  assignmentEnabled: boolean;
  assigneeType: AuditAssigneeType | null;
  assigneeTeamMemberId: string | null;
  assigneeName: string;
  assigneeEmail: string;
  assigneePhone: string;
  dueAt: string; // 'YYYY-MM-DD' or ''
  recurrence: AuditRecurrence;
  internalNote: string;
}

export function createInitialWizardState(restaurantId: string): AuditWizardState {
  return {
    restaurantId,
    title: '',
    description: '',
    sector: 'food',
    categoryId: null,
    locale: 'tr',
    scoringMode: 'percentage',
    passingScore: null,
    questions: [],
    assignmentEnabled: false,
    assigneeType: null,
    assigneeTeamMemberId: null,
    assigneeName: '',
    assigneeEmail: '',
    assigneePhone: '',
    dueAt: '',
    recurrence: 'once',
    internalNote: '',
  };
}

// Wizard state → API submit payload mapper. UI client kullanır.
export function toSubmitPayload(state: AuditWizardState, publish: boolean): AuditTemplateSubmitInput {
  const payload: AuditTemplateSubmitInput = {
    title: state.title.trim(),
    description: state.description.trim() || null,
    sector: state.sector,
    categoryId: state.categoryId,
    locale: state.locale,
    scoringMode: state.scoringMode,
    passingScore: state.passingScore,
    questions: state.questions.map((q, i) => ({
      type: q.type,
      prompt: q.prompt.trim(),
      helpText: q.helpText?.trim() || null,
      options: q.options ?? null,
      correctAnswer: q.correctAnswer ?? null,
      weight: q.weight,
      isRequired: q.isRequired,
      sortOrder: (i + 1) * 10,
    })),
    publish,
  };

  if (state.assignmentEnabled && state.assigneeType) {
    payload.assignment = {
      enabled: true,
      assigneeType: state.assigneeType,
      assigneeTeamMemberId: state.assigneeTeamMemberId,
      assigneeName: state.assigneeName.trim() || null,
      assigneeEmail: state.assigneeEmail.trim() || null,
      assigneePhone: state.assigneePhone.trim() || null,
      dueAt: state.dueAt || null,
      recurrence: state.recurrence,
      internalNote: state.internalNote.trim() || null,
    };
  }

  return payload;
}
