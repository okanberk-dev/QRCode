'use client';

// Denetim Merkezi — yanıt incelemesi (spec §3.7).
//
// Sunucudan gelir (tek başına dönen yükleniyor simgesi yok). Madde madde cevap,
// uygun/sorunlu rozeti ve inceleme notu ana ekrandadır. 0-100 "manuel puan"
// girişleri bir uzman aracıdır: kapalı bir bölümün içinde durur.
//
// KRİTİK (spec §6.6): yalnız not kaydedilince `overrides` GÖNDERİLMEZ → sunucu
// puanı yeniden hesaplamaz. Puan yalnız elle düzeltilen maddeler değiştirilince
// (ve yalnız değişenler gönderilerek) güncellenir.

import { useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2, Save, X } from 'lucide-react';
import { AlertBanner, Badge, PageHeader } from '@/components/ui';
import type { Locale } from '@/lib/translations';
import type { AuditResponseDetail } from '@/lib/audits/queries';
import { formatFullDateTimeInTimeZone } from '@/lib/timezone';
import { humanQuestionType } from '@/lib/audits/kind';
import { countIssues, isEmptyAnswerValue, isIssueAnswer } from '@/lib/audits/misses';
import { hasUsableCorrectAnswer } from '@/lib/audits/score';
import type { AuditQuestionType } from '@/lib/audits/types';
import { parseAuditErrorResponse, summarizeAuditError } from '@/lib/audits/error-humanizer';
import { expectedAnswerLabel, formatResponseStamp } from './audit-ui';
import Disclosure from './Disclosure';

interface Props {
  locale: Locale;
  detail: AuditResponseDetail;
  /** Salt-okunur (viewer) ekip üyeleri not / puan kaydedemez. */
  canWrite: boolean;
}

/** PATCH yanıtı: `{ data: { score, scorePercentage, passed, reviewedAt, reviewNote } }`. */
interface PatchResult {
  score: number | null;
  passed: boolean | null;
  reviewedAt: string | null;
}

function formatValue(value: unknown, type: AuditQuestionType): string {
  if (isEmptyAnswerValue(value)) return '';
  if (Array.isArray(value)) return value.map((v) => String(v)).join(', ');
  if (type === 'scale' && typeof value === 'number') return `${value} / 5`;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function formatExpected(correct: unknown): string {
  if (Array.isArray(correct)) return correct.map((v) => String(v)).join(', ');
  if (typeof correct === 'string') return correct;
  return '';
}

export default function AuditResponseDetailClient({ locale, detail, canWrite }: Props) {
  const isTr = locale === 'tr';
  const ui = isTr ? 'tr' : 'en';
  const idBase = useId();
  const { template, answers } = detail;
  const base = `/${locale}/dashboard/audits`;
  const apiUrl = `/api/restaurants/${detail.restaurantId}/audits/responses/${detail.id}`;

  const [score, setScore] = useState<number | null>(detail.score);
  const [passed, setPassed] = useState<boolean | null>(detail.passed);
  const [reviewedAt, setReviewedAt] = useState<string | null>(detail.reviewedAt);

  const savedNoteRef = useRef(detail.reviewNote ?? '');
  const [note, setNote] = useState(detail.reviewNote ?? '');
  const [savingNote, setSavingNote] = useState(false);

  // Elle düzeltme: soru id → girilen metin; "kayıtlı" değerler ayrı tutulur ki yalnız
  // DEĞİŞENLER gönderilsin.
  const [manual, setManual] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const a of answers) if (a.manualScore !== null) init[a.questionId] = String(a.manualScore);
    return init;
  });
  const [savedManual, setSavedManual] = useState<Record<string, string>>(manual);
  const [manualOpen, setManualOpen] = useState(false);
  const [savingScore, setSavingScore] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const answerByQid = useMemo(() => new Map(answers.map((a) => [a.questionId, a])), [answers]);
  const hasPassMark = template.passingScore !== null;
  const issueCount = useMemo(
    () =>
      countIssues(
        template.questions.map((q) => ({ id: q.id, type: q.type, correctAnswer: q.correctAnswer })),
        answers.map((a) => ({ questionId: a.questionId, value: a.value })),
      ),
    [template.questions, answers],
  );

  const changedOverrides = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const q of template.questions) {
      if (!answerByQid.has(q.id)) continue;
      const now = (manual[q.id] ?? '').trim();
      const before = (savedManual[q.id] ?? '').trim();
      if (now === before) continue;
      if (now === '') {
        out[q.id] = null;
        continue;
      }
      const n = Number(now);
      if (Number.isFinite(n)) out[q.id] = Math.max(0, Math.min(100, Math.round(n)));
    }
    return out;
  }, [manual, savedManual, template.questions, answerByQid]);
  const changedCount = Object.keys(changedOverrides).length;

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice((cur) => (cur === message ? null : cur)), 3500);
  }

  async function patch(body: Record<string, unknown>): Promise<PatchResult | null> {
    setError(null);
    try {
      const res = await fetch(apiUrl, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError(summarizeAuditError(await parseAuditErrorResponse(res, locale)));
        return null;
      }
      const json = (await res.json()) as { data: PatchResult };
      return json.data;
    } catch {
      setError(isTr ? 'Bağlantı hatası' : 'Connection error');
      return null;
    }
  }

  async function saveNote() {
    if (!canWrite || savingNote) return;
    setSavingNote(true);
    // `overrides` YOK → puan değişmez.
    const result = await patch({ reviewNote: note.trim() || null });
    setSavingNote(false);
    if (!result) return;
    savedNoteRef.current = note.trim();
    setNote(note.trim());
    setReviewedAt(result.reviewedAt);
    flash(isTr ? 'Not kaydedildi.' : 'Note saved.');
  }

  async function saveScore() {
    if (!canWrite || savingScore || changedCount === 0) return;
    setSavingScore(true);
    const result = await patch({ overrides: changedOverrides });
    setSavingScore(false);
    if (!result) return;
    setScore(result.score);
    setPassed(result.passed);
    setReviewedAt(result.reviewedAt);
    setSavedManual({ ...manual });
    flash(isTr ? 'Puan güncellendi.' : 'Score updated.');
  }

  const noteDirty = note.trim() !== savedNoteRef.current.trim();
  const passLabel = isTr ? 'Geçti' : 'Passed';
  const failLabel = isTr ? 'Kaldı' : 'Failed';

  const metaParts = [
    detail.respondentEmail,
    detail.respondentPhone,
    detail.completedAt ? formatFullDateTimeInTimeZone(detail.completedAt, ui) : null,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-[920px] space-y-4 px-4 py-6 sm:px-7 lg:py-8">
      <div>
        <Link
          href={`${base}/${template.id}/results`}
          className="inline-flex min-h-9 items-center gap-1 text-[12px] text-[#737373] hover:text-[#0A0A0A]"
        >
          <ArrowLeft size={12} aria-hidden="true" /> {isTr ? 'Sonuçlara dön' : 'Back to results'}
        </Link>
      </div>

      <PageHeader
        eyebrow={isTr ? 'YANIT İNCELEMESİ' : 'RESPONSE REVIEW'}
        title={detail.respondentName || (isTr ? 'Anonim' : 'Anonymous')}
        description={metaParts.length > 0 ? metaParts.join(' · ') : undefined}
      />

      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      )}
      {notice && (
        <AlertBanner kind="success" onDismiss={() => setNotice(null)}>
          {notice}
        </AlertBanner>
      )}

      {/* Özet */}
      <div className={`grid gap-3 ${hasPassMark ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
        <div className={`bz-card p-3 ${hasPassMark ? 'col-span-2 sm:col-span-1' : ''}`}>
          <div className="pulse-eyebrow text-[#525252]">{isTr ? 'Puan' : 'Score'}</div>
          {score !== null ? (
            <div className="bz-h-tight mt-1 text-[28px]">
              {score}
              <span className="text-[16px] text-[#A3A3A3]">/100</span>
            </div>
          ) : (
            <div className="mt-2 text-[15px] font-medium text-[#525252]">
              {isTr ? 'Puanlanmıyor' : 'Not scored'}
            </div>
          )}
          {issueCount > 0 && (
            <div className="mt-1 text-[12px] text-[#991B1B]">
              {isTr ? `${issueCount} madde sorunlu` : `${issueCount} item${issueCount === 1 ? '' : 's'} flagged`}
            </div>
          )}
        </div>
        {hasPassMark && (
          <div className="bz-card p-3">
            <div className="pulse-eyebrow text-[#525252]">{isTr ? 'Sonuç' : 'Outcome'}</div>
            <div className="mt-2">
              {passed === true ? (
                <Badge kind="ok">{passLabel}</Badge>
              ) : passed === false ? (
                <Badge kind="danger">{failLabel}</Badge>
              ) : (
                <span className="text-[#A3A3A3]">—</span>
              )}
              <span className="bz-mono ml-2 text-[11px] text-[#737373]">≥{template.passingScore}</span>
            </div>
          </div>
        )}
        <div className="bz-card p-3">
          <div className="pulse-eyebrow text-[#525252]">{isTr ? 'İnceleme' : 'Review'}</div>
          <div className="mt-2 text-[13px] text-[#0A0A0A]">
            {reviewedAt
              ? formatResponseStamp(reviewedAt, ui)
              : isTr
                ? 'Henüz yok'
                : 'Not yet'}
          </div>
        </div>
      </div>

      {/* Madde madde */}
      <section className="space-y-2" aria-labelledby={`${idBase}-answers`}>
        <h2 id={`${idBase}-answers`} className="bz-h-tight text-[16px]">
          {isTr ? 'Cevaplar' : 'Answers'}
        </h2>
        <ol className="space-y-2">
          {template.questions.map((q, i) => {
            const answer = answerByQid.get(q.id);
            const value = answer?.value ?? null;
            const empty = isEmptyAnswerValue(value);
            const verdict = answer ? isIssueAnswer({ id: q.id, type: q.type, correctAnswer: q.correctAnswer }, value) : null;
            const isChoiceType = q.type === 'single' || q.type === 'multi' || q.type === 'text';
            const photo =
              q.type === 'file' && typeof value === 'string' && value.startsWith('data:image/') ? value : null;
            const showExpected = q.type !== 'scale' && hasUsableCorrectAnswer({ type: q.type, correctAnswer: q.correctAnswer });
            const verdictBadge =
              verdict === null ? null : verdict ? (
                <Badge kind="danger" dot={false} className="shrink-0">
                  <X size={10} aria-hidden="true" />
                  {isChoiceType ? (isTr ? 'Yanlış' : 'Wrong') : isTr ? 'Sorunlu' : 'Needs attention'}
                </Badge>
              ) : (
                <Badge kind="ok" dot={false} className="shrink-0">
                  <Check size={10} aria-hidden="true" />
                  {isChoiceType ? (isTr ? 'Doğru' : 'Correct') : isTr ? 'Uygun' : 'OK'}
                </Badge>
              );
            return (
              <li key={q.id} className="bz-card p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="bz-mono mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-[#F5F5F5] px-1.5 text-[11px] text-[#525252]"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 break-words text-[14px] font-medium leading-snug text-[#0A0A0A]">
                        <span className="sr-only">{`${i + 1}. `}</span>
                        {q.prompt}
                      </p>
                      {verdictBadge}
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#737373]">
                      {humanQuestionType(q.type, ui)}
                      {!q.isRequired && ` · ${isTr ? 'Zorunlu değil' : 'Optional'}`}
                    </p>

                    <div className="mt-2 flex flex-wrap items-start gap-x-6 gap-y-2 text-[13px]">
                      <div className="min-w-0">
                        <div className="pulse-eyebrow text-[#525252]">{isTr ? 'Cevap' : 'Answer'}</div>
                        {!answer ? (
                          <div className="italic text-[#A3A3A3]">
                            {isTr ? 'Madde sonradan eklendi' : 'Item added later'}
                          </div>
                        ) : photo ? (
                          <a href={photo} target="_blank" rel="noopener noreferrer" className="inline-block">
                            <img
                              src={photo}
                              alt={isTr ? 'Yüklenen fotoğraf (büyütmek için aç)' : 'Uploaded photo (open to enlarge)'}
                              loading="lazy"
                              decoding="async"
                              className="mt-1 max-h-[200px] w-auto rounded-lg border border-[#EDEDED] object-contain"
                            />
                          </a>
                        ) : empty ? (
                          <div className="italic text-[#A3A3A3]">
                            {q.type === 'file'
                              ? isTr
                                ? 'Fotoğraf eklenmedi'
                                : 'No photo added'
                              : isTr
                                ? 'Boş bırakıldı'
                                : 'Left blank'}
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap break-words text-[#0A0A0A]">
                            {formatValue(value, q.type)}
                          </div>
                        )}
                      </div>
                      {showExpected && (
                        <div className="min-w-0">
                          <div className="pulse-eyebrow text-[#525252]">
                            {expectedAnswerLabel(template.kind, ui)}
                          </div>
                          <div className="break-words text-[#525252]">{formatExpected(q.correctAnswer)}</div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* İnceleme notu */}
      {canWrite ? (
        <section className="bz-card space-y-3 p-4 sm:p-5">
          <div>
            <label htmlFor={`${idBase}-note`} className="block text-[13px] font-semibold text-[#0A0A0A]">
              {isTr
                ? 'Bu yanıt için notun (yalnızca sen ve ekibin görür)'
                : 'Your note on this response (only you and your team can see it)'}
            </label>
            <textarea
              id={`${idBase}-note`}
              className="bz-input mt-2 min-h-[88px]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11.5px] text-[#737373]">
              {isTr ? 'Notu kaydetmek puanı değiştirmez.' : 'Saving a note does not change the score.'}
            </p>
            <button
              type="button"
              className="bz-btn-primary min-h-11 shrink-0 sm:min-h-0"
              onClick={saveNote}
              disabled={savingNote || !noteDirty}
            >
              {savingNote ? (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <Save size={14} aria-hidden="true" />
              )}
              {isTr ? 'Kaydet' : 'Save'}
            </button>
          </div>
        </section>
      ) : (
        savedNoteRef.current.trim() && (
          <section className="bz-card p-4 sm:p-5">
            <div className="text-[13px] font-semibold text-[#0A0A0A]">
              {isTr ? 'İnceleme notu' : 'Review note'}
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-[14px] text-[#0A0A0A]">
              {savedNoteRef.current}
            </p>
          </section>
        )
      )}

      {/* Puanı elle düzelt (uzman aracı: kapalı) */}
      {canWrite && answers.length > 0 && (
        <section className="bz-card px-4 py-1 sm:px-5">
          <Disclosure
            open={manualOpen}
            onToggle={() => setManualOpen((v) => !v)}
            controls={`${idBase}-manual`}
          >
            {isTr ? 'Puanı elle düzelt' : 'Adjust score manually'}
          </Disclosure>
          {manualOpen && (
            <div id={`${idBase}-manual`} className="space-y-3 pb-4 pt-2">
              <p className="text-[12.5px] leading-relaxed text-[#525252]">
                {isTr
                  ? 'Bir maddeye 0-100 arası kendi puanını yazabilirsin. Boş bırakırsan otomatik puan kullanılır. Kaydedince toplam puan yeniden hesaplanır.'
                  : 'Write your own 0-100 score for an item. Leave it empty to use the automatic score. The total score is recalculated when you save.'}
              </p>
              <ul className="divide-y divide-[#EDEDED]">
                {template.questions.map((q, i) => {
                  const answer = answerByQid.get(q.id);
                  if (!answer) return null;
                  const inputId = `${idBase}-m-${q.id}`;
                  return (
                    <li key={q.id} className="flex items-center gap-3 py-2.5">
                      <label htmlFor={inputId} className="min-w-0 flex-1 text-[13px] text-[#0A0A0A]">
                        <span className="bz-mono mr-1.5 text-[11px] text-[#737373]">{i + 1}.</span>
                        <span className="break-words">{q.prompt}</span>
                        <span className="mt-0.5 block text-[11px] text-[#737373]">
                          {isTr ? 'Otomatik' : 'Automatic'}:{' '}
                          <span className="bz-mono">{answer.autoScore !== null ? answer.autoScore : '—'}</span>
                        </span>
                      </label>
                      <input
                        id={inputId}
                        className="bz-input w-20 shrink-0 text-center"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={100}
                        value={manual[q.id] ?? ''}
                        onChange={(e) => setManual((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        placeholder="—"
                      />
                    </li>
                  );
                })}
              </ul>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="bz-btn-primary min-h-11 sm:min-h-0"
                  onClick={saveScore}
                  disabled={savingScore || changedCount === 0}
                >
                  {savingScore ? (
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Save size={14} aria-hidden="true" />
                  )}
                  {isTr ? 'Puanı kaydet' : 'Save score'}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
