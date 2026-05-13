'use client';

// CLAUDE.md §42 Phase 4 — Owner audit response detail client.
// Soru-soru cevap görüntüleme + manuel skor override + reviewer note.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2, Save, X } from 'lucide-react';
import {
  AlertBanner,
  Badge,
  Field,
  PageHeader,
} from '@/components/ui';
import { getTranslations, type Locale } from '@/lib/translations';
import type { AuditQuestionType, AuditScoringMode } from '@/lib/audits/types';

interface QuestionRow {
  id: string;
  type: AuditQuestionType;
  prompt: string;
  helpText: string | null;
  options: unknown;
  correctAnswer: unknown;
  weight: number;
  isRequired: boolean;
  sortOrder: number;
}

interface AnswerRow {
  id: string;
  questionId: string;
  value: unknown;
  autoScore: number | null;
  manualScore: number | null;
}

interface ResponseDetail {
  id: string;
  templateId: string;
  assignmentId: string | null;
  restaurantId: string;
  respondentName: string | null;
  respondentEmail: string | null;
  respondentPhone: string | null;
  hasKvkkConsent: boolean;
  score: number | null;
  passed: boolean | null;
  startedAt: string;
  completedAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  template: {
    id: string;
    title: string;
    scoringMode: AuditScoringMode;
    passingScore: number | null;
    questions: QuestionRow[];
  };
  answers: AnswerRow[];
}

interface Props {
  locale: Locale;
  restaurantId: string;
  responseId: string;
  template: {
    id: string;
    title: string;
    scoringMode: AuditScoringMode;
    passingScore: number | null;
  };
}

function formatValue(value: unknown, _type: AuditQuestionType): string {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function matchesCorrect(value: unknown, correct: unknown, type: AuditQuestionType): boolean | null {
  if (correct === null || correct === undefined) return null;
  if (type === 'single' || type === 'yes_no' || type === 'text') {
    if (typeof correct !== 'string' || typeof value !== 'string') return false;
    return correct.trim().toLowerCase() === value.trim().toLowerCase();
  }
  if (type === 'multi') {
    if (!Array.isArray(correct) || !Array.isArray(value)) return false;
    const c = new Set(correct.map((x) => String(x).trim().toLowerCase()));
    const v = new Set(value.map((x) => String(x).trim().toLowerCase()));
    if (c.size !== v.size) return false;
    for (const x of c) if (!v.has(x)) return false;
    return true;
  }
  if (type === 'scale') {
    if (typeof correct !== 'number' || typeof value !== 'number') return null;
    return value >= correct;
  }
  return null;
}

export default function AuditResponseDetailClient({
  locale,
  restaurantId,
  responseId,
  template,
}: Props) {
  const t = getTranslations(locale);
  const [data, setData] = useState<ResponseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [reviewNote, setReviewNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/audits/responses/${responseId}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || (locale === 'tr' ? 'Yükleme başarısız' : 'Failed to load'));
        return;
      }
      const json = await res.json();
      setData(json.data as ResponseDetail);
      setReviewNote(json.data.reviewNote ?? '');
      // Seed overrides from existing manualScore
      const init: Record<string, string> = {};
      for (const a of (json.data as ResponseDetail).answers) {
        if (a.manualScore != null) init[a.questionId] = String(a.manualScore);
      }
      setOverrides(init);
    } catch {
      setError(locale === 'tr' ? 'Bağlantı hatası' : 'Connection error');
    } finally {
      setLoading(false);
    }
  }, [restaurantId, responseId, locale]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    if (!data) return;
    setSaving(true);
    setError(null);
    try {
      const overridePayload: Record<string, number | null> = {};
      for (const q of data.template.questions) {
        const raw = overrides[q.id];
        if (raw === undefined || raw === '') {
          overridePayload[q.id] = null;
        } else {
          const n = Number(raw);
          if (Number.isFinite(n)) overridePayload[q.id] = Math.max(0, Math.min(100, Math.round(n)));
        }
      }
      const res = await fetch(`/api/restaurants/${restaurantId}/audits/responses/${responseId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          overrides: overridePayload,
          reviewNote: reviewNote.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || (locale === 'tr' ? 'Kaydetme başarısız' : 'Save failed'));
        return;
      }
      setNotice(locale === 'tr' ? 'Skor yeniden hesaplandı.' : 'Score recomputed.');
      await load();
      setTimeout(() => setNotice(null), 3000);
    } catch {
      setError(locale === 'tr' ? 'Bağlantı hatası' : 'Connection error');
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) {
    return (
      <main className="mx-auto max-w-[900px] px-4 sm:px-7 py-6 lg:py-8">
        <Loader2 size={20} className="animate-spin" />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-[900px] px-4 sm:px-7 py-6 lg:py-8">
        <AlertBanner kind="danger">{error || 'Yanıt bulunamadı'}</AlertBanner>
      </main>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <div>
        <Link
          href={`/${locale}/dashboard/audits/${template.id}/results`}
          className="text-[12px] text-[#737373] hover:text-[#0A0A0A] inline-flex items-center gap-1"
        >
          <ArrowLeft size={12} /> {locale === 'tr' ? 'Sonuçlara dön' : 'Back to results'}
        </Link>
      </div>

      <PageHeader
        eyebrow={locale === 'tr' ? 'YANIT İNCELEMESİ' : 'RESPONSE REVIEW'}
        eyebrowColor="#C6F24E"
        title={data.respondentName || (locale === 'tr' ? 'Anonim katılımcı' : 'Anonymous respondent')}
        description={
          [
            data.respondentEmail,
            data.respondentPhone,
            data.completedAt
              ? new Date(data.completedAt).toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US')
              : null,
          ]
            .filter(Boolean)
            .join(' · ') || undefined
        }
      />

      {error && <AlertBanner kind="danger" onDismiss={() => setError(null)}>{error}</AlertBanner>}
      {notice && <AlertBanner kind="success" onDismiss={() => setNotice(null)}>{notice}</AlertBanner>}

      {/* Score summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="bz-card p-3">
          <div className="pulse-eyebrow text-[#525252]">{t.audits_total_score}</div>
          <div className="bz-h-tight text-[28px] mt-1">
            {data.score ?? '—'}
            {data.score != null && <span className="text-[#A3A3A3] text-[16px]">/100</span>}
          </div>
        </div>
        <div className="bz-card p-3">
          <div className="pulse-eyebrow text-[#525252]">
            {locale === 'tr' ? 'Sonuç' : 'Outcome'}
          </div>
          <div className="mt-1.5">
            {data.passed === true ? (
              <Badge kind="ok">{t.audits_passed}</Badge>
            ) : data.passed === false ? (
              <Badge kind="danger">{t.audits_failed}</Badge>
            ) : (
              <Badge kind="ghost">—</Badge>
            )}
            {data.template.passingScore != null && (
              <span className="text-[11px] text-[#737373] ml-2 bz-mono">
                ≥{data.template.passingScore}
              </span>
            )}
          </div>
        </div>
        <div className="bz-card p-3">
          <div className="pulse-eyebrow text-[#525252]">
            {locale === 'tr' ? 'İnceleme' : 'Review'}
          </div>
          <div className="text-[13px] mt-1.5">
            {data.reviewedAt
              ? new Date(data.reviewedAt).toLocaleDateString(
                  locale === 'tr' ? 'tr-TR' : 'en-US',
                )
              : locale === 'tr'
                ? 'Henüz yok'
                : 'Not yet'}
          </div>
        </div>
      </div>

      {/* Question by question */}
      <section className="space-y-2">
        <h2 className="bz-h-tight text-[16px]">
          {locale === 'tr' ? 'Soru bazlı cevaplar' : 'Answers by question'}
        </h2>
        <ol className="space-y-2">
          {data.template.questions.map((q, i) => {
            const answer = data.answers.find((a) => a.questionId === q.id);
            const givenValue = answer?.value ?? null;
            const auto = answer?.autoScore ?? null;
            const correct = matchesCorrect(givenValue, q.correctAnswer, q.type);
            return (
              <li key={q.id} className="bz-card p-3">
                <div className="flex items-start gap-2">
                  <Badge kind="ghost">{i + 1}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      <Badge kind="info">{q.type}</Badge>
                      {q.weight > 1 && <Badge kind="warn">×{q.weight}</Badge>}
                      {!q.isRequired && (
                        <Badge kind="ghost">{locale === 'tr' ? 'opsiyonel' : 'optional'}</Badge>
                      )}
                    </div>
                    <p className="text-[14px] text-[#0A0A0A]">{q.prompt}</p>
                    <div className="grid gap-1.5 grid-cols-1 sm:grid-cols-2 mt-2 text-[13px]">
                      <div>
                        <div className="pulse-eyebrow text-[#525252]">
                          {locale === 'tr' ? 'Cevap' : 'Answer'}
                        </div>
                        <div className="text-[#0A0A0A]">{formatValue(givenValue, q.type)}</div>
                      </div>
                      {q.correctAnswer != null && (
                        <div>
                          <div className="pulse-eyebrow text-[#525252]">
                            {locale === 'tr' ? 'Doğru' : 'Correct'}
                          </div>
                          <div className="text-[#525252]">{formatValue(q.correctAnswer, q.type)}</div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-[12px]">
                      {correct === true && (
                        <Badge kind="ok">
                          <Check size={10} /> {locale === 'tr' ? 'Doğru' : 'Correct'}
                        </Badge>
                      )}
                      {correct === false && (
                        <Badge kind="danger">
                          <X size={10} /> {locale === 'tr' ? 'Yanlış' : 'Wrong'}
                        </Badge>
                      )}
                      <span className="text-[#737373]">
                        {locale === 'tr' ? 'Otomatik' : 'Auto'}: <span className="bz-mono">{auto ?? '—'}</span>/100
                      </span>
                    </div>
                  </div>
                  <div className="w-24">
                    <label className="pulse-eyebrow text-[#525252] block mb-1 text-[10px]">
                      {locale === 'tr' ? 'Manuel' : 'Manual'}
                    </label>
                    <input
                      className="bz-input"
                      type="number"
                      min={0}
                      max={100}
                      value={overrides[q.id] ?? ''}
                      onChange={(e) =>
                        setOverrides({ ...overrides, [q.id]: e.target.value })
                      }
                      placeholder="—"
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Reviewer note + save */}
      <section className="bz-card p-4 space-y-3">
        <Field
          label={locale === 'tr' ? 'İnceleme notu' : 'Review note'}
          hint={
            locale === 'tr'
              ? 'Bu yanıta dair kendi notunu yaz — sadece sen ve ekibin görür.'
              : 'Your own note about this response — only you and your team see it.'
          }
        >
          <textarea
            className="bz-input min-h-[80px]"
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            maxLength={2000}
          />
        </Field>
        <div className="flex justify-end">
          <button
            type="button"
            className="bz-btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {locale === 'tr' ? 'Kaydet ve yeniden hesapla' : 'Save & recompute'}
          </button>
        </div>
      </section>
    </div>
  );
}
