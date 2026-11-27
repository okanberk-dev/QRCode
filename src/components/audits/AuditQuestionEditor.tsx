'use client';

// CLAUDE.md §42 Phase 2 — Audit question add/edit modal.
// Tip-spesifik conditional alanlar: options + correctAnswer şekli soru
// type'ına göre değişir.
//
// Owner builder (AuditBuilderClient) ve admin şablon editörü bu modalı paylaşır.
// Mevcut 5 prop (`locale / open / draft / onClose / onSave`) DEĞİŞMEZ; owner
// builder'a özel davranış yalnız İSTEĞE BAĞLI üç prop ile açılır (admin bunları
// vermez, bugünkü davranışı korur):
//   • auditLocale — denetimin dili (Evet/Hayır ↔ Yes/No). Varsayılan: `locale`.
//   • kind        — 'checklist' | 'quiz': "Uygun cevap" / "Doğru cevap" etiketi.
//   • locked      — yanıt almış madde: tür / seçenekler / doğru cevap / ağırlık
//                   kapalı (metin, açıklama, zorunluluk açık).

import { useId, useMemo, useRef, useState } from 'react';
import { Lock, Plus, Save, Trash2 } from 'lucide-react';
import { AlertBanner, APSwitch, Field, Modal, PulseSelect } from '@/components/ui';
import { AUDIT_QUESTION_TYPES, type AuditQuestionType } from '@/lib/audits/types';
import { AuditQuestionSchema, type AuditQuestionDraft } from '@/lib/audits/wizard-state';
import { humanizeAuditIssues } from '@/lib/audits/error-humanizer';
import { checkQuestionForSave } from '@/lib/audits/question-normalize';
import { getYesNoDefaultOptions } from '@/lib/audits/options';
import type { AuditKind } from '@/lib/audits/kind';
import { getTranslations, type Locale } from '@/lib/translations';
import { expectedAnswerLabel } from './audit-ui';

interface Props {
  locale: Locale;
  open: boolean;
  draft: AuditQuestionDraft | null;
  onClose: () => void;
  onSave: (q: AuditQuestionDraft) => void;
  /** Denetimin dili; verilmezse arayüz dili (admin bugünkü davranış). */
  auditLocale?: 'tr' | 'en';
  /** Verilirse doğru-cevap alanının etiketi türe göre ("Uygun" / "Doğru"). */
  kind?: AuditKind;
  /** Yanıt almış madde: yapı alanları (tür, seçenek, doğru cevap, ağırlık) kilitli. */
  locked?: boolean;
}

const QUESTION_TYPE_LABEL_TR: Record<AuditQuestionType, string> = {
  single: 'Tek seçim',
  multi: 'Çoklu seçim',
  scale: '1-5 puan',
  text: 'Not (serbest metin)',
  yes_no: 'Evet / Hayır',
  file: 'Fotoğraf',
};
const QUESTION_TYPE_LABEL_EN: Record<AuditQuestionType, string> = {
  single: 'Single choice',
  multi: 'Multiple choice',
  scale: '1-5 rating',
  text: 'Note (free text)',
  yes_no: 'Yes / No',
  file: 'Photo',
};

function makeId(): string {
  return `q_${Math.random().toString(36).slice(2, 10)}`;
}

/** Yeni soru: seçenekli, boş seçenekler (placeholder değer olarak KAYDEDİLMEZ). */
function defaultDraft(): AuditQuestionDraft {
  return {
    id: makeId(),
    type: 'single',
    prompt: '',
    helpText: '',
    options: ['', ''],
    correctAnswer: null,
    weight: 1,
    isRequired: true,
    sortOrder: 0,
  };
}

/**
 * Kapalıyken hiçbir şey render etmez; açıldığında gövde SIFIRDAN mount olur.
 * Böylece her açılışta taslak state'i `draft` prop'undan başlar (efektle
 * sıfırlama / bayat odak bayrağı yok) ve ilk odak alanı doğru hesaplanır.
 */
export default function AuditQuestionEditor(props: Props) {
  if (!props.open) return null;
  return <AuditQuestionEditorBody {...props} />;
}

function AuditQuestionEditorBody({
  locale,
  draft,
  onClose,
  onSave,
  auditLocale,
  kind,
  locked = false,
}: Props) {
  const t = getTranslations(locale);
  const isTr = locale === 'tr';
  const loc: 'tr' | 'en' = auditLocale ?? (locale === 'en' ? 'en' : 'tr');
  const typeLabel = isTr ? QUESTION_TYPE_LABEL_TR : QUESTION_TYPE_LABEL_EN;
  const [q, setQ] = useState<AuditQuestionDraft>(() => draft ?? defaultDraft());
  const [error, setError] = useState<string | null>(null);
  // Açılışta odaklanacak alan: metin boşsa metin; metin dolu + seçenekler boşsa
  // ilk seçenek ("Seçenekli" hızlı eklemesi). Mount'ta bir kez hesaplanır.
  const focusOptionsFirst = useRef(
    Boolean(draft) &&
      (draft?.prompt ?? '').trim().length > 0 &&
      (draft?.type === 'single' || draft?.type === 'multi') &&
      (draft?.options ?? []).every((o) => !o.trim()),
  );
  const idBase = useId();

  const isYesNo = q.type === 'yes_no';
  const needsOptions = q.type === 'single' || q.type === 'multi' || q.type === 'yes_no';
  const correctLabel = kind ? expectedAnswerLabel(kind, locale) : t.audits_question_correct;

  // yes_no auto-fixed options (denetimin dilinde)
  const effectiveOptions = useMemo(
    () => (isYesNo ? getYesNoDefaultOptions(loc) : (q.options ?? []).filter((o) => o.trim().length > 0)),
    [isYesNo, q.options, loc],
  );

  function updateType(next: AuditQuestionType) {
    setQ((prev) => {
      const fresh: AuditQuestionDraft = { ...prev, type: next };
      if (next === 'yes_no') {
        const opts = getYesNoDefaultOptions(loc);
        fresh.options = opts;
        // Kontrol listesi anlamı: ilk seçenek ("Evet") uygun cevap.
        fresh.correctAnswer = opts[0];
      } else if (next === 'single' || next === 'multi') {
        const wasChoice = prev.type === 'single' || prev.type === 'multi';
        fresh.options = wasChoice && Array.isArray(prev.options) ? prev.options : ['', ''];
        fresh.correctAnswer = null;
      } else if (next === 'scale') {
        fresh.options = null;
        fresh.correctAnswer = typeof prev.correctAnswer === 'number' ? prev.correctAnswer : null;
      } else if (next === 'text') {
        fresh.options = null;
        fresh.correctAnswer = typeof prev.correctAnswer === 'string' ? prev.correctAnswer : null;
      } else if (next === 'file') {
        fresh.options = null;
        fresh.correctAnswer = null;
        // Fotoğraf belgeleme amaçlıdır, puanlanmaz — varsayılan isteğe bağlı
        // ("owner isterse eklensin"); owner yine zorunlu yapabilir.
        fresh.isRequired = false;
      }
      return fresh;
    });
  }

  function updateOption(i: number, value: string) {
    setQ((prev) => {
      const next = [...(prev.options ?? [])];
      const old = next[i];
      next[i] = value;
      // Doğru cevap bu seçeneği işaret ediyorsa yeni metne taşı.
      let correctAnswer = prev.correctAnswer;
      if (typeof correctAnswer === 'string' && old && correctAnswer === old) {
        correctAnswer = value.trim() ? value : null;
      } else if (Array.isArray(correctAnswer) && old) {
        correctAnswer = correctAnswer.map((c) => (c === old ? value : c)).filter((c) => c.trim());
      }
      return { ...prev, options: next, correctAnswer };
    });
  }

  function addOption() {
    setQ((prev) => ({ ...prev, options: [...(prev.options ?? []), ''] }));
  }

  function removeOption(i: number) {
    setQ((prev) => {
      const removed = prev.options?.[i];
      const next = (prev.options ?? []).filter((_, idx) => idx !== i);
      // Eğer correctAnswer silinen seçenekse temizle.
      let correctAnswer = prev.correctAnswer;
      if (typeof correctAnswer === 'string' && correctAnswer === removed) {
        correctAnswer = null;
      } else if (Array.isArray(correctAnswer)) {
        correctAnswer = correctAnswer.filter((c) => c !== removed);
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
    // Boş seçenekler Zod'dan ÖNCE atılır (`options` şeması `min(1)`); ≥ 2 dolu
    // seçenek yoksa arkadaş canlısı hata. Normalize edilmiş soru id taşımaz, bu
    // yüzden `persistedId` / `clientKey` gibi ek alanlar şemayı (strict) bozmaz.
    const check = checkQuestionForSave(q, loc);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    const parsed = AuditQuestionSchema.safeParse(check.question);
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
      setError(friendly.join(' • ') || (isTr ? 'Doğrulama hatası' : 'Validation error'));
      return;
    }
    // Çağıranın alanları (id, persistedId, …) korunur; temizlenen alanlar üstüne yazılır.
    onSave({ ...q, ...check.question });
  }

  const lockedHint = isTr
    ? 'Bu maddeye yanıt verilmiş. Metni değiştirebilirsin; seçenekleri veya doğru cevabı değiştirmek için denetimi kopyala.'
    : 'This item already has answers. You can edit its text; to change its options or correct answer, copy the audit.';

  const promptLabel =
    kind === 'checklist'
      ? isTr
        ? 'Madde metni'
        : 'Item text'
      : isTr
        ? 'Soru metni'
        : 'Question text';

  return (
    <Modal
      onClose={onClose}
      title={draft ? t.audits_question_edit : t.audits_question_add}
      size={640}
    >
      <div className="space-y-3">
        {error && <AlertBanner kind="danger">{error}</AlertBanner>}
        {locked && (
          <AlertBanner kind="info" icon={<Lock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />}>
            {lockedHint}
          </AlertBanner>
        )}

        <Field label={isTr ? 'Tür' : 'Type'} htmlFor={`${idBase}-type`}>
          <PulseSelect
            id={`${idBase}-type`}
            className="w-full"
            value={q.type}
            disabled={locked}
            onChange={(v) => updateType(v as AuditQuestionType)}
            options={AUDIT_QUESTION_TYPES.map((tp) => ({ value: tp, label: typeLabel[tp] }))}
          />
        </Field>

        <Field label={promptLabel} required htmlFor={`${idBase}-prompt`}>
          <textarea
            id={`${idBase}-prompt`}
            className="bz-input min-h-[64px]"
            value={q.prompt}
            onChange={(e) => setQ({ ...q, prompt: e.target.value })}
            maxLength={2000}
            autoFocus={!focusOptionsFirst.current}
          />
        </Field>

        <Field label={isTr ? 'Açıklama (isteğe bağlı)' : 'Description (optional)'} htmlFor={`${idBase}-help`}>
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
                    disabled={locked}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={isTr ? `Seçenek ${i + 1}` : `Option ${i + 1}`}
                    aria-label={isTr ? `Seçenek ${i + 1}` : `Option ${i + 1}`}
                    autoFocus={focusOptionsFirst.current && i === 0}
                    enterKeyHint="next"
                  />
                  <button
                    type="button"
                    className="bz-btn-icon h-11 w-11 sm:h-8 sm:w-8"
                    onClick={() => removeOption(i)}
                    disabled={locked || (q.options ?? []).length <= 2}
                    aria-label={isTr ? 'Seçeneği sil' : 'Remove option'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button type="button" className="bz-btn-ghost" onClick={addOption} disabled={locked}>
                <Plus size={14} /> {isTr ? 'Seçenek ekle' : 'Add option'}
              </button>
            </div>
          </Field>
        )}

        {needsOptions && (
          <Field
            label={correctLabel}
            hint={isTr ? 'Boş bırakırsan bu soru puana katılmaz.' : "Leave empty and this question isn't scored."}
          >
            {q.type === 'multi' ? (
              <div className="space-y-1">
                {effectiveOptions.length === 0 && (
                  <p className="text-[12px] text-[#737373]">
                    {isTr ? 'Önce seçenekleri yaz.' : 'Write the options first.'}
                  </p>
                )}
                {effectiveOptions.map((opt) => {
                  const arr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
                  const checked = arr.includes(opt);
                  return (
                    <label key={opt} className="flex min-h-[44px] items-center gap-2 text-[13px] sm:min-h-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={locked}
                        onChange={() => toggleMultiCorrect(opt)}
                        className="h-4 w-4 accent-pn-ink"
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
                disabled={locked}
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
          <Field
            label={isTr ? 'En düşük uygun puan' : 'Lowest acceptable rating'}
            hint={
              isTr
                ? 'Bu puan ve üstü uygun sayılır, altı sorunlu. Boş bırakırsan 1-5 puan, 20-100 puana çevrilir.'
                : 'This rating and above is fine, below counts as a problem. Leave empty and 1-5 maps to 20-100.'
            }
          >
            <input
              className="bz-input"
              type="number"
              inputMode="numeric"
              min={1}
              max={5}
              disabled={locked}
              value={typeof q.correctAnswer === 'number' ? q.correctAnswer : ''}
              onChange={(e) =>
                setQ({
                  ...q,
                  correctAnswer: e.target.value
                    ? Math.max(1, Math.min(5, Math.round(Number(e.target.value))))
                    : null,
                })
              }
            />
          </Field>
        )}

        {q.type === 'text' && (
          <Field
            label={correctLabel}
            hint={
              isTr
                ? 'Yazarsan cevap tam bunu içermeli (büyük/küçük harf fark etmez). Boş bırakırsan bu soru puana katılmaz.'
                : "If set, the answer must match exactly (case doesn't matter). Leave empty and this question isn't scored."
            }
          >
            <input
              className="bz-input"
              disabled={locked}
              value={typeof q.correctAnswer === 'string' ? q.correctAnswer : ''}
              onChange={(e) => setQ({ ...q, correctAnswer: e.target.value ? e.target.value : null })}
            />
          </Field>
        )}

        <Field label={t.audits_question_required}>
          <APSwitch
            checked={q.isRequired}
            onChange={(v) => setQ({ ...q, isRequired: v })}
            ariaLabel={t.audits_question_required}
          />
        </Field>

        <details className="group rounded-[20px] border border-pn-line bg-pn-canvas px-3">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between text-[13px] font-medium text-pn-ink sm:min-h-[36px] [&::-webkit-details-marker]:hidden">
            {isTr ? 'Daha fazla ayar' : 'More options'}
            <span aria-hidden="true" className="text-[#737373] transition-transform group-open:rotate-180">
              ▾
            </span>
          </summary>
          <div className="pb-3">
            <Field
              label={isTr ? 'Puandaki ağırlığı (1-10)' : 'Weight in score (1-10)'}
              hint={
                isTr
                  ? '1 = normal. Daha yüksek yazarsan bu madde toplam puanda daha çok sayılır.'
                  : '1 = normal. A higher number makes this item count more in the total score.'
              }
            >
              <input
                className="bz-input"
                type="number"
                inputMode="numeric"
                min={1}
                max={10}
                step={1}
                disabled={locked}
                value={q.weight}
                onChange={(e) => {
                  const n = Math.floor(Number(e.target.value));
                  const clamped = Number.isFinite(n) ? Math.max(1, Math.min(10, n)) : 1;
                  setQ({ ...q, weight: clamped });
                }}
              />
            </Field>
          </div>
        </details>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="bz-btn-ghost" onClick={onClose}>
            {isTr ? 'Vazgeç' : 'Cancel'}
          </button>
          <button type="button" className="bz-btn-primary" onClick={handleSave}>
            <Save size={14} /> {isTr ? 'Kaydet' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export { makeId as makeQuestionId };
