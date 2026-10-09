'use client';

// CLAUDE.md §42 Phase 2 — Audit question add/edit modal.
// Tip-spesifik conditional alanlar: options + correctAnswer şekli soru
// type'ına göre değişir.

import { useEffect, useId, useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { AlertBanner, APSwitch, Field, Modal, PulseSelect } from '@/components/ui';
import {
  AUDIT_QUESTION_TYPES,
  type AuditQuestionType,
} from '@/lib/audits/types';
import {
  AuditQuestionSchema,
  type AuditQuestionDraft,
} from '@/lib/audits/wizard-state';
import { humanizeAuditIssues } from '@/lib/audits/error-humanizer';
import { getTranslations, type Locale } from '@/lib/translations';

interface Props {
  locale: Locale;
  open: boolean;
  draft: AuditQuestionDraft | null;
  onClose: () => void;
  onSave: (q: AuditQuestionDraft) => void;
}

const QUESTION_TYPE_LABEL_TR: Record<AuditQuestionType, string> = {
  single: 'Tek seçim',
  multi: 'Çoklu seçim',
  scale: 'Ölçek (1-5)',
  text: 'Serbest metin',
  yes_no: 'Evet / Hayır',
  file: 'Fotoğraf',
};
const QUESTION_TYPE_LABEL_EN: Record<AuditQuestionType, string> = {
  single: 'Single choice',
  multi: 'Multi choice',
  scale: 'Scale (1-5)',
  text: 'Free text',
  yes_no: 'Yes / No',
  file: 'Photo',
};

function makeId(): string {
  return `q_${Math.random().toString(36).slice(2, 10)}`;
}

function defaultDraft(): AuditQuestionDraft {
  return {
    id: makeId(),
    type: 'single',
    prompt: '',
    helpText: '',
    options: ['Seçenek 1', 'Seçenek 2'],
    correctAnswer: null,
    weight: 1,
    isRequired: true,
    sortOrder: 0,
  };
}

export default function AuditQuestionEditor({ locale, open, draft, onClose, onSave }: Props) {
  const t = getTranslations(locale);
  const typeLabel = locale === 'tr' ? QUESTION_TYPE_LABEL_TR : QUESTION_TYPE_LABEL_EN;
  const [q, setQ] = useState<AuditQuestionDraft>(defaultDraft());
  const [error, setError] = useState<string | null>(null);
  const idBase = useId();

  useEffect(() => {
    if (open) {
      setQ(draft ?? defaultDraft());
      setError(null);
    }
  }, [open, draft]);

  const isYesNo = q.type === 'yes_no';
  const needsOptions = q.type === 'single' || q.type === 'multi' || q.type === 'yes_no';

  // yes_no auto-fixed options
  const effectiveOptions = useMemo(
    () => (isYesNo ? [locale === 'tr' ? 'Evet' : 'Yes', locale === 'tr' ? 'Hayır' : 'No'] : q.options ?? []),
    [isYesNo, q.options, locale],
  );

  function updateType(next: AuditQuestionType) {
    setQ((prev) => {
      const fresh: AuditQuestionDraft = { ...prev, type: next };
      if (next === 'yes_no') {
        fresh.options = [locale === 'tr' ? 'Evet' : 'Yes', locale === 'tr' ? 'Hayır' : 'No'];
        fresh.correctAnswer = null;
      } else if (next === 'single' || next === 'multi') {
        if (!Array.isArray(fresh.options) || fresh.options.length < 2) {
          fresh.options = ['Seçenek 1', 'Seçenek 2'];
        }
        fresh.correctAnswer = null;
      } else if (next === 'scale') {
        fresh.options = null;
        fresh.correctAnswer = typeof fresh.correctAnswer === 'number' ? fresh.correctAnswer : null;
      } else if (next === 'text') {
        fresh.options = null;
        fresh.correctAnswer = typeof fresh.correctAnswer === 'string' ? fresh.correctAnswer : null;
      } else if (next === 'file') {
        fresh.options = null;
        fresh.correctAnswer = null;
        // Photo questions are documentation, not scored — default to optional
        // ("owner isterse eklensin"); owner can still mark it required.
        fresh.isRequired = false;
      }
      return fresh;
    });
  }

  function updateOption(i: number, value: string) {
    setQ((prev) => {
      const next = [...(prev.options ?? [])];
      next[i] = value;
      return { ...prev, options: next };
    });
  }

  function addOption() {
    setQ((prev) => ({
      ...prev,
      options: [...(prev.options ?? []), `Seçenek ${(prev.options?.length ?? 0) + 1}`],
    }));
  }

  function removeOption(i: number) {
    setQ((prev) => {
      const next = (prev.options ?? []).filter((_, idx) => idx !== i);
      // Eğer correctAnswer string ise ve silinen seçenekse temizle.
      let correctAnswer = prev.correctAnswer;
      if (typeof correctAnswer === 'string' && correctAnswer === prev.options?.[i]) {
        correctAnswer = null;
      } else if (Array.isArray(correctAnswer)) {
        correctAnswer = correctAnswer.filter((c) => c !== prev.options?.[i]);
      }
      return { ...prev, options: next, correctAnswer };
    });
  }

  function toggleMultiCorrect(value: string) {
    setQ((prev) => {
      const current = Array.isArray(prev.correctAnswer) ? prev.correctAnswer : [];
      const has = current.includes(value);
      return { ...prev, correctAnswer: has ? current.filter((x) => x !== value) : [...current, value] };
    });
  }

  function handleSave() {
    setError(null);
    // Apply yes_no enforced options
    const candidate: AuditQuestionDraft = {
      ...q,
      options: isYesNo ? effectiveOptions : q.options ?? null,
    };
    const parsed = AuditQuestionSchema.safeParse(candidate);
    if (!parsed.success) {
      // Humanize Zod path/message — kullanıcı "options: ..." yerine
      // "Seçenekler — Bu soru tipi en az 2 seçenek gerektirir" görür.
      const friendly = humanizeAuditIssues(
        parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
        locale,
      );
      setError(
        friendly.join(' • ') ||
          (locale === 'tr' ? 'Doğrulama hatası' : 'Validation error'),
      );
      return;
    }
    onSave(candidate);
  }

  if (!open) return null;

  return (
    <Modal
      onClose={onClose}
      title={draft ? t.audits_question_edit : t.audits_question_add}
      size={640}
    >
      <div className="space-y-3">
        {error && <AlertBanner kind="danger">{error}</AlertBanner>}

        <Field label={t.audits_question_type_label} htmlFor={`${idBase}-type`}>
          <PulseSelect
            id={`${idBase}-type`}
            className="w-full"
            value={q.type}
            onChange={(v) => updateType(v as AuditQuestionType)}
            options={AUDIT_QUESTION_TYPES.map((tp) => ({ value: tp, label: typeLabel[tp] }))}
          />
        </Field>

        <Field label={t.audits_question_prompt} required htmlFor={`${idBase}-prompt`}>
          <textarea
            id={`${idBase}-prompt`}
            className="bz-input min-h-[64px]"
            value={q.prompt}
            onChange={(e) => setQ({ ...q, prompt: e.target.value })}
            maxLength={2000}
          />
        </Field>

        <Field label={t.audits_question_help} htmlFor={`${idBase}-help`}>
          <input
            id={`${idBase}-help`}
            className="bz-input"
            value={q.helpText ?? ''}
            onChange={(e) => setQ({ ...q, helpText: e.target.value })}
            maxLength={2000}
          />
        </Field>

        {needsOptions && !isYesNo && (
          <Field label={t.audits_question_options}>
            <div className="space-y-1.5">
              {(q.options ?? []).map((opt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    className="bz-input flex-1"
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Seçenek ${i + 1}`}
                  />
                  <button
                    type="button"
                    className="bz-btn-icon"
                    onClick={() => removeOption(i)}
                    disabled={(q.options ?? []).length <= 2}
                    aria-label={locale === 'tr' ? 'Seçeneği sil' : 'Remove option'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button type="button" className="bz-btn-ghost" onClick={addOption}>
                <Plus size={14} /> {locale === 'tr' ? 'Seçenek ekle' : 'Add option'}
              </button>
            </div>
          </Field>
        )}

        {needsOptions && (
          <Field label={t.audits_question_correct} hint={locale === 'tr' ? 'Boş bırakırsan otomatik puanlama yapılmaz' : 'Leave empty to skip auto-scoring'}>
            {q.type === 'multi' ? (
              <div className="space-y-1">
                {effectiveOptions.map((opt) => {
                  const arr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
                  const checked = arr.includes(opt);
                  return (
                    <label key={opt} className="flex items-center gap-2 text-[13px]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMultiCorrect(opt)}
                        className="h-4 w-4 accent-[#0A0A0A]"
                      />
                      {opt}
                    </label>
                  );
                })}
              </div>
            ) : (
              <PulseSelect
                className="w-full"
                value={typeof q.correctAnswer === 'string' ? q.correctAnswer : ''}
                onChange={(v) => setQ({ ...q, correctAnswer: v ? v : null })}
                options={[
                  { value: '', label: '—' },
                  ...effectiveOptions.map((opt) => ({ value: opt, label: opt })),
                ]}
              />
            )}
          </Field>
        )}

        {q.type === 'scale' && (
          <Field label={t.audits_question_correct} hint={locale === 'tr' ? '1-5 arası eşik puan; üstü 100 puan, altı 0' : 'Threshold 1-5; ≥ threshold = 100, else 0'}>
            <input
              className="bz-input"
              type="number"
              min={1}
              max={5}
              value={typeof q.correctAnswer === 'number' ? q.correctAnswer : ''}
              onChange={(e) =>
                setQ({
                  ...q,
                  correctAnswer: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </Field>
        )}

        {q.type === 'text' && (
          <Field
            label={t.audits_question_correct}
            hint={locale === 'tr' ? 'Doluysa case-insensitive tam eşleşme; boş = manuel inceleme' : 'Case-insensitive exact match; empty = manual review'}
          >
            <input
              className="bz-input"
              value={typeof q.correctAnswer === 'string' ? q.correctAnswer : ''}
              onChange={(e) =>
                setQ({ ...q, correctAnswer: e.target.value ? e.target.value : null })
              }
            />
          </Field>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t.audits_question_weight} hint={locale === 'tr' ? 'Ağırlıklı modda kullanılır (1-10)' : 'Used in weighted mode (1-10)'}>
            <input
              className="bz-input"
              type="number"
              inputMode="numeric"
              min={1}
              max={10}
              step={1}
              value={q.weight}
              onChange={(e) => {
                const n = Math.floor(Number(e.target.value));
                const clamped = Number.isFinite(n) ? Math.max(1, Math.min(10, n)) : 1;
                setQ({ ...q, weight: clamped });
              }}
            />
          </Field>
          <Field label={t.audits_question_required}>
            <APSwitch checked={q.isRequired} onChange={(v) => setQ({ ...q, isRequired: v })} />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="bz-btn-ghost" onClick={onClose}>
            {locale === 'tr' ? 'Vazgeç' : 'Cancel'}
          </button>
          <button type="button" className="bz-btn-primary" onClick={handleSave}>
            <Save size={14} /> {locale === 'tr' ? 'Kaydet' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export { makeId as makeQuestionId };
