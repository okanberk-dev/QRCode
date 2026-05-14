'use client';

// CLAUDE.md §42 Phase 3 — Public audit response client component.
//
// Pulse design (dark bg + lime accent), step-by-step:
//   intro (KVKK consent + opsiyonel name/email/phone) → soru-soru →
//   submit → thanks (skor + geçti/kaldı rozeti).
//
// Backend kontratı: GET /api/audits/[token] → assignment + template +
// questions (correctAnswer KASTEN EKSIK). POST submit → score response.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ClipboardCheck, Loader2, X } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import type {
  AuditQuestionType,
  AuditScoringMode,
  AuditSector,
} from '@/lib/audits/types';
import { normalizeQuestionOptions } from '@/lib/audits/options';

interface Question {
  id: string;
  type: AuditQuestionType;
  prompt: string;
  helpText: string | null;
  options: unknown;
  weight: number;
  isRequired: boolean;
  sortOrder: number;
}

interface TemplateMeta {
  id: string;
  title: string;
  description: string | null;
  sector: AuditSector;
  scoringMode: AuditScoringMode;
  passingScore: number | null;
  locale: string;
}

interface RestaurantMeta {
  id: string;
  name: string;
  primaryColor: string | null;
  kvkkText: string | null;
}

interface AssignmentMeta {
  id: string;
  status: string;
  assigneeType: string;
  assigneeName: string | null;
  assigneeEmail: string | null;
  dueAt: string | null;
  recurrence: string;
}

interface FetchResponse {
  completed: boolean;
  assignment: AssignmentMeta;
  template: TemplateMeta;
  restaurant: RestaurantMeta;
  questions: Question[];
}

type AnswerValue = string | string[] | number | null;

interface Props {
  token: string;
  locale: Locale;
}

function getOptions(q: Question, locale: 'tr' | 'en'): string[] {
  // Frontend safety net — backend public GET zaten normalize ediyor
  // (src/app/api/audits/[token]/route.ts) ama legacy/preview deploylarda
  // çift güvence için aynı helper'ı burada da çağırıyoruz. yes_no için
  // her zaman 2 seçenek garanti eder.
  const normalized = normalizeQuestionOptions(q.type, q.options, locale);
  return normalized ?? [];
}

export default function PublicAuditView({ token, locale }: Props) {
  const isTr = locale === 'tr';
  const [data, setData] = useState<FetchResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<'intro' | 'questions' | 'done'>('intro');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [kvkkOk, setKvkkOk] = useState(false);
  const [marketingOk, setMarketingOk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{ score: number; passed: boolean | null } | null>(null);
  // §42 — submit error visible olunca scroll-into-view (long form sonu için)
  const errorRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (submitError && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [submitError]);

  // Load template + questions
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/audits/${token}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(res.status === 404 ? (isTr ? 'Bu denetime ulaşılamıyor.' : 'Audit not available.') : isTr ? 'Yükleme hatası' : 'Load error');
          return;
        }
        const json = (await res.json()) as FetchResponse;
        if (cancelled) return;
        setData(json);
        // Atama pre-fill name/email
        if (json.assignment.assigneeName) setName(json.assignment.assigneeName);
        if (json.assignment.assigneeEmail) setEmail(json.assignment.assigneeEmail);
        // Tamamlanmışsa direkt thanks ekranına
        if (json.completed) {
          setStep('done');
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(isTr ? 'Bağlantı hatası' : 'Connection error');
      });
    return () => {
      cancelled = true;
    };
  }, [token, isTr]);

  const totalQuestions = data?.questions.length ?? 0;
  const currentQuestion = data?.questions[questionIndex] ?? null;
  const progress = totalQuestions ? Math.round(((questionIndex + 1) / totalQuestions) * 100) : 0;

  function setAnswer(qid: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  function toggleMultiAnswer(qid: string, opt: string) {
    setAnswers((prev) => {
      const cur = Array.isArray(prev[qid]) ? (prev[qid] as string[]) : [];
      const next = cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt];
      return { ...prev, [qid]: next };
    });
  }

  const canAdvance = useMemo(() => {
    if (!currentQuestion) return false;
    if (!currentQuestion.isRequired) return true;
    const v = answers[currentQuestion.id];
    if (v === undefined || v === null) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'number') return Number.isFinite(v);
    return true;
  }, [currentQuestion, answers]);

  const handleStartQuestions = useCallback(() => {
    if (!kvkkOk) {
      setSubmitError(isTr ? 'KVKK onayı zorunlu' : 'KVKK consent is required');
      return;
    }
    setSubmitError(null);
    if (totalQuestions === 0) {
      // Edge case — yayında ama soru yok (admin draft delete edip yayınlamamış olmalı)
      setSubmitError(isTr ? 'Soru yok' : 'No questions');
      return;
    }
    setStep('questions');
    setQuestionIndex(0);
  }, [kvkkOk, totalQuestions, isTr]);

  // §42 bug-prevention: submit'ten ÖNCE tüm required soruları kontrol et.
  // Mevcut canAdvance yalnız o anki soruya bakıyordu — kullanıcı önceki
  // bir required soruyu boş bıraktıysa son sorudaki "Gönder" backend
  // `MISSING_REQUIRED` reddederdi, "son soruda devam etmiyor" hissi.
  // Burada hangi soruda eksik olduğunu söyleyip otomatik o soruya geri
  // götürüyoruz (UX: bilgilendirici, sessiz değil).
  function findFirstMissingRequired(): number | null {
    if (!data) return null;
    for (let i = 0; i < data.questions.length; i += 1) {
      const q = data.questions[i];
      if (!q.isRequired) continue;
      const v = answers[q.id];
      if (v === undefined || v === null) return i;
      if (typeof v === 'string' && v.trim().length === 0) return i;
      if (Array.isArray(v) && v.length === 0) return i;
    }
    return null;
  }

  const handleSubmit = useCallback(async () => {
    if (!data) return;
    setSubmitError(null);

    // Pre-flight client check — backend mirror'ı (`MISSING_REQUIRED`).
    const missingIdx = findFirstMissingRequired();
    if (missingIdx !== null) {
      setQuestionIndex(missingIdx);
      setSubmitError(
        isTr
          ? `Bu soru zorunlu — yanıtı doldurup tekrar dene.`
          : `This question is required — fill it in and try again.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        answers: data.questions.map((q) => ({
          questionId: q.id,
          value: answers[q.id] ?? null,
        })),
        respondentName: name.trim() || null,
        respondentEmail: email.trim() || null,
        respondentPhone: phone.trim() || null,
        hasKvkkConsent: true,
        hasMarketingConsent: marketingOk,
      };
      const res = await fetch(`/api/audits/${token}/submit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setSubmitError(isTr ? 'Bu denetim zaten tamamlandı.' : 'This audit was already completed.');
          setStep('done');
        } else {
          setSubmitError(j.error || j.message || (isTr ? 'Gönderim başarısız' : 'Submit failed'));
        }
        return;
      }
      const json = await res.json();
      setResult({ score: json.score, passed: json.passed });
      setStep('done');
    } catch {
      setSubmitError(isTr ? 'Bağlantı hatası' : 'Connection error');
    } finally {
      setSubmitting(false);
    }
    // findFirstMissingRequired closure'da kalır — answers/data değiştiğinde
    // useCallback yeniden oluşturulur, böylece güncel state ile çalışır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, answers, name, email, phone, marketingOk, token, isTr]);

  // Loading / error
  if (loadError) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <X size={32} className="mx-auto mb-3 text-[#FECACA]" />
          <h1 className="bz-h-tight-2 text-[24px] mb-2">{isTr ? 'Erişim yok' : 'No access'}</h1>
          <p className="text-[14px] text-white/60">{loadError}</p>
        </div>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <Loader2 size={28} className="animate-spin" />
      </main>
    );
  }

  const accent = data.restaurant.primaryColor || '#C6F24E';

  const estimatedMinutes = Math.max(1, Math.ceil(totalQuestions / 4));

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-[640px] mx-auto px-4 sm:px-6 py-8 sm:py-14">
        {/* Brand header */}
        <header className="text-center mb-6 sm:mb-8">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl text-[#0A0A0A] mb-3 shadow-[0_4px_24px_-8px_rgba(198,242,78,0.45)]"
            style={{ background: accent }}
          >
            <ClipboardCheck size={20} strokeWidth={2.5} />
          </div>
          <div className="pulse-eyebrow text-white/50">
            {isTr ? 'DENETİM MERKEZİ' : 'AUDIT CENTER'}
          </div>
          <h1 className="bz-h-tight-2 text-[24px] sm:text-[32px] mt-1 break-words">
            {data.restaurant.name}
          </h1>
        </header>

        {/* Step: intro */}
        {step === 'intro' && (
          <div className="bg-white text-[#0A0A0A] rounded-3xl p-6 sm:p-8 bz-fade-in shadow-[0_24px_64px_-20px_rgba(0,0,0,0.45)]">
            <p className="pulse-eyebrow text-[#525252]">
              {isTr ? 'BU DENETİM' : 'THIS AUDIT'}
            </p>
            <h2 className="bz-h-tight-2 text-[22px] sm:text-[26px] mt-1 leading-tight">
              {data.template.title}
            </h2>
            {data.template.description && (
              <p className="text-[14px] sm:text-[15px] text-[#525252] mt-2 leading-relaxed">
                {data.template.description}
              </p>
            )}

            {/* Meta chips — soru sayısı + süre */}
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FAFAFA] border border-[#EDEDED] px-3 py-1 text-[12px] text-[#525252]">
                <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-[#0A0A0A]" />
                {totalQuestions} {isTr ? 'soru' : 'questions'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FAFAFA] border border-[#EDEDED] px-3 py-1 text-[12px] text-[#525252]">
                <span
                  aria-hidden
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: accent }}
                />
                ~{estimatedMinutes} {isTr ? 'dk' : 'min'}
              </span>
            </div>

            <hr className="my-5 sm:my-6 border-[#EDEDED]" />

            {/* Contact (optional) — collapsed eyebrow + grid */}
            <div className="space-y-3">
              <div>
                <p className="pulse-eyebrow text-[#525252]">
                  {isTr ? 'İLETİŞİM' : 'CONTACT'}
                </p>
                <p className="text-[12px] text-[#737373] mt-1">
                  {isTr
                    ? 'Opsiyonel — işletme cevabını görebilmek için.'
                    : 'Optional — so the business can follow up.'}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="audit-name" className="pulse-eyebrow text-[#525252] block mb-1">
                    {isTr ? 'Ad' : 'Name'}
                  </label>
                  <input
                    id="audit-name"
                    className="bz-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isTr ? 'Adın' : 'Your name'}
                    maxLength={200}
                    autoComplete="name"
                    autoCapitalize="words"
                    enterKeyHint="next"
                  />
                </div>
                <div>
                  <label htmlFor="audit-email" className="pulse-eyebrow text-[#525252] block mb-1">
                    {isTr ? 'E-posta' : 'Email'}
                  </label>
                  <input
                    id="audit-email"
                    className="bz-input"
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ad@buaze.com"
                    autoComplete="email"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="next"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="audit-phone" className="pulse-eyebrow text-[#525252] block mb-1">
                    {isTr ? 'Telefon' : 'Phone'}
                  </label>
                  <input
                    id="audit-phone"
                    className="bz-input"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+90 ..."
                    autoComplete="tel"
                    enterKeyHint="done"
                  />
                </div>
              </div>
            </div>

            <hr className="my-5 sm:my-6 border-[#EDEDED]" />

            {/* Consent block — tek kart içinde 2 checkbox, accent border solda */}
            <div className="rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-3 sm:p-4 space-y-3">
              <label className="flex items-start gap-2.5 text-[13px] cursor-pointer leading-relaxed">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-[#0A0A0A] shrink-0"
                  checked={kvkkOk}
                  onChange={(e) => setKvkkOk(e.target.checked)}
                />
                <span>
                  {data.restaurant.kvkkText ||
                    (isTr
                      ? 'Yanıtlarımın işletme tarafından iç değerlendirme amacıyla işlenmesini kabul ediyorum.'
                      : 'I consent to my responses being processed by the business for internal evaluation.')}{' '}
                  <span className="text-[#DC2626]" aria-hidden>
                    *
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2.5 text-[13px] cursor-pointer leading-relaxed">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-[#0A0A0A] shrink-0"
                  checked={marketingOk}
                  onChange={(e) => setMarketingOk(e.target.checked)}
                />
                <span className="text-[#525252]">
                  {isTr
                    ? 'İletişim için sonradan bana ulaşılabilir (opsiyonel).'
                    : 'You may contact me for follow-up (optional).'}
                </span>
              </label>
            </div>

            {submitError && (
              <div
                ref={errorRef}
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-[13px] leading-snug text-[#991B1B]"
              >
                <AlertTriangle size={14} strokeWidth={2.2} className="mt-0.5 shrink-0" />
                <span className="flex-1">{submitError}</span>
                <button
                  type="button"
                  aria-label={isTr ? 'Kapat' : 'Dismiss'}
                  className="-mr-1 -mt-1 ml-2 rounded p-1 text-[#991B1B]/70 transition hover:bg-[#FECACA]/40 hover:text-[#991B1B]"
                  onClick={() => setSubmitError(null)}
                >
                  <X size={12} />
                </button>
              </div>
            )}

            <button
              type="button"
              className="bz-btn-primary w-full mt-5 justify-center text-[14px] py-2.5"
              onClick={handleStartQuestions}
              disabled={!kvkkOk}
              aria-disabled={!kvkkOk}
            >
              {isTr ? 'Başla' : 'Start'} <ArrowRight size={14} />
            </button>
            {!kvkkOk && (
              <p className="text-[11px] text-[#737373] text-center mt-2">
                {isTr ? 'Başlamak için onay gerekli.' : 'Consent is required to start.'}
              </p>
            )}
          </div>
        )}

        {/* Step: questions */}
        {step === 'questions' && currentQuestion && (
          <div className="bg-white text-[#0A0A0A] rounded-3xl p-6 sm:p-8 bz-fade-in shadow-[0_24px_64px_-20px_rgba(0,0,0,0.45)]">
            {/* Progress */}
            <div className="flex items-center justify-between text-[11px] mb-2">
              <span className="pulse-eyebrow text-[#525252]">
                {isTr ? `Soru ${questionIndex + 1} / ${totalQuestions}` : `${questionIndex + 1} / ${totalQuestions}`}
              </span>
              <span className="bz-mono text-[#737373]">%{progress}</span>
            </div>
            <div
              className="h-1.5 bg-[#EDEDED] rounded-full overflow-hidden mb-6"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label={isTr ? 'Denetim ilerleme' : 'Audit progress'}
            >
              <div
                className="h-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%`, background: accent }}
              />
            </div>

            <h2 className="bz-h-tight-2 text-[20px] sm:text-[22px] leading-snug">
              {currentQuestion.prompt}
            </h2>
            {currentQuestion.helpText && (
              <p className="text-[13px] text-[#525252] mt-1.5 leading-relaxed">
                {currentQuestion.helpText}
              </p>
            )}
            {!currentQuestion.isRequired && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FAFAFA] border border-[#EDEDED] px-2 py-0.5 text-[10px] text-[#737373] mt-2 pulse-eyebrow">
                {isTr ? 'OPSİYONEL' : 'OPTIONAL'}
              </span>
            )}

            <div className="mt-5">
              <QuestionInput
                question={currentQuestion}
                value={answers[currentQuestion.id] ?? null}
                onChange={(v) => setAnswer(currentQuestion.id, v)}
                onToggleMulti={(opt) => toggleMultiAnswer(currentQuestion.id, opt)}
                accent={accent}
                isTr={isTr}
              />
            </div>

            {submitError && (
              <div
                ref={errorRef}
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-[13px] leading-snug text-[#991B1B]"
              >
                <AlertTriangle size={14} strokeWidth={2.2} className="mt-0.5 shrink-0" />
                <span className="flex-1">{submitError}</span>
                <button
                  type="button"
                  aria-label={isTr ? 'Kapat' : 'Dismiss'}
                  className="-mr-1 -mt-1 ml-2 rounded p-1 text-[#991B1B]/70 transition hover:bg-[#FECACA]/40 hover:text-[#991B1B]"
                  onClick={() => setSubmitError(null)}
                >
                  <X size={12} />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between mt-6 gap-2">
              <button
                type="button"
                className="bz-btn-ghost"
                disabled={questionIndex === 0 || submitting}
                onClick={() => setQuestionIndex((i) => Math.max(0, i - 1))}
              >
                <ArrowLeft size={14} /> {isTr ? 'Geri' : 'Back'}
              </button>
              {questionIndex < totalQuestions - 1 ? (
                <button
                  type="button"
                  className="bz-btn-primary"
                  disabled={!canAdvance || submitting}
                  onClick={() => setQuestionIndex((i) => i + 1)}
                >
                  {isTr ? 'Devam' : 'Continue'} <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  className="bz-btn-primary"
                  disabled={submitting || !canAdvance}
                  onClick={handleSubmit}
                  aria-busy={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      {isTr ? 'Gönderiliyor…' : 'Submitting…'}
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      {isTr ? 'Gönder' : 'Submit'}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step: done */}
        {step === 'done' && (
          <div className="bg-white text-[#0A0A0A] rounded-3xl p-8 sm:p-10 text-center bz-fade-in shadow-[0_24px_64px_-20px_rgba(0,0,0,0.45)]">
            <div
              className="pulse-heartbeat inline-flex items-center justify-center w-16 h-16 rounded-full text-[#0A0A0A] mb-4 shadow-[0_8px_24px_-8px_rgba(198,242,78,0.6)]"
              style={{ background: accent }}
            >
              <Check size={28} strokeWidth={2.5} />
            </div>
            <h2 className="bz-h-tight-2 text-[24px] sm:text-[28px]">
              {isTr ? 'Teşekkürler!' : 'Thank you!'}
            </h2>
            <p className="text-[14px] text-[#525252] mt-2 max-w-[360px] mx-auto leading-relaxed">
              {isTr
                ? 'Yanıtın alındı. İşletme değerlendirmeyi panelinde görecek.'
                : 'Your response was received. The business will see this evaluation in their panel.'}
            </p>
            {result && (
              <div className="mt-6 inline-block min-w-[240px] rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-5">
                <p className="pulse-eyebrow text-[#525252]">
                  {isTr ? 'Toplam puan' : 'Total score'}
                </p>
                <p className="bz-mono text-[44px] font-medium mt-1 leading-none tracking-tight">
                  {result.score}
                  <span className="text-[#A3A3A3] text-[20px]">/100</span>
                </p>
                {result.passed != null && (
                  <div
                    className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${
                      result.passed
                        ? 'bg-[#DCFCE7] text-[#166534]'
                        : 'bg-[#FEE2E2] text-[#991B1B]'
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                        result.passed ? 'bg-[#166534]' : 'bg-[#991B1B]'
                      }`}
                    />
                    {result.passed
                      ? isTr
                        ? 'Geçti'
                        : 'Passed'
                      : isTr
                        ? 'Eşik aşılamadı'
                        : 'Below threshold'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <p className="text-center text-[11px] text-white/40 bz-mono mt-8">
          POWERED BY BUAZE
        </p>
      </div>
    </main>
  );
}

interface QuestionInputProps {
  question: Question;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
  onToggleMulti: (opt: string) => void;
  accent: string;
  isTr: boolean;
}

function QuestionInput({ question, value, onChange, onToggleMulti, accent, isTr }: QuestionInputProps) {
  const options = getOptions(question, isTr ? 'tr' : 'en');

  // Empty options defensive fallback — backend + frontend normalize hala
  // boş array dönerse (admin yanlış konfigürasyon), kullanıcıya açıklayıcı
  // mesaj göster, sessiz kalma.
  if (
    (question.type === 'single' || question.type === 'yes_no' || question.type === 'multi') &&
    options.length === 0
  ) {
    return (
      <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3 text-[12px] text-[#92400E] flex items-start gap-2">
        <AlertTriangle size={14} strokeWidth={2.2} className="mt-0.5 shrink-0" />
        <span>
          {isTr
            ? 'Bu soruda seçenek tanımlanmamış. İşletme yöneticisi ayarları kontrol etmeli.'
            : 'No options configured for this question. The business should review settings.'}
        </span>
      </div>
    );
  }

  if (question.type === 'single' || question.type === 'yes_no') {
    return (
      <div className="space-y-2" role="radiogroup" aria-label={isTr ? 'Seçenekler' : 'Options'}>
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt)}
              className={`group w-full text-left rounded-xl border px-4 py-3 text-[14px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 flex items-center gap-3 ${
                selected
                  ? 'border-[#0A0A0A] bg-[#FAFAFA] shadow-[inset_3px_0_0_0_#C6F24E]'
                  : 'border-[#EDEDED] hover:border-[#A3A3A3] hover:bg-[#FAFAFA]'
              }`}
            >
              <span
                className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 transition ${
                  selected ? 'border-[#0A0A0A]' : 'border-[#D4D4D4] group-hover:border-[#0A0A0A]'
                }`}
              >
                {selected && (
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ background: accent }}
                  />
                )}
              </span>
              <span className="flex-1">{opt}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === 'multi') {
    const arr = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-2">
        <p className="text-[11px] text-[#737373] mb-1">
          {isTr ? 'Birden fazla seçebilirsin' : 'Select multiple'}
        </p>
        {options.map((opt) => {
          const selected = arr.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              role="checkbox"
              aria-checked={selected}
              onClick={() => onToggleMulti(opt)}
              className={`group w-full text-left rounded-xl border px-4 py-3 text-[14px] transition flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 ${
                selected
                  ? 'border-[#0A0A0A] bg-[#FAFAFA] shadow-[inset_3px_0_0_0_#C6F24E]'
                  : 'border-[#EDEDED] hover:border-[#A3A3A3] hover:bg-[#FAFAFA]'
              }`}
            >
              <span
                className={`inline-flex items-center justify-center w-5 h-5 rounded-md border-2 shrink-0 transition ${
                  selected ? 'border-[#0A0A0A]' : 'border-[#D4D4D4] group-hover:border-[#0A0A0A]'
                }`}
                style={selected ? { background: accent, borderColor: '#0A0A0A' } : {}}
              >
                {selected && <Check size={12} strokeWidth={3} />}
              </span>
              <span className="flex-1">{opt}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === 'scale') {
    const numVal = typeof value === 'number' ? value : null;
    const scaleLabels = isTr
      ? ['Çok kötü', 'Kötü', 'Orta', 'İyi', 'Mükemmel']
      : ['Very poor', 'Poor', 'Average', 'Good', 'Excellent'];
    return (
      <div className="space-y-3">
        <div className="flex gap-2" role="radiogroup" aria-label={isTr ? 'Puan' : 'Rating'}>
          {[1, 2, 3, 4, 5].map((n) => {
            const selected = numVal === n;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${n} — ${scaleLabels[n - 1]}`}
                onClick={() => onChange(n)}
                className={`flex-1 rounded-xl border py-3 text-[16px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 ${
                  selected
                    ? 'border-[#0A0A0A]'
                    : 'border-[#EDEDED] text-[#525252] hover:border-[#A3A3A3] hover:bg-[#FAFAFA]'
                }`}
                style={selected ? { background: accent, color: '#0A0A0A' } : {}}
              >
                {n}
              </button>
            );
          })}
        </div>
        {numVal !== null && (
          <p className="text-[12px] text-[#525252] text-center bz-fade-in">
            {scaleLabels[numVal - 1]}
          </p>
        )}
      </div>
    );
  }

  if (question.type === 'text') {
    const textVal = typeof value === 'string' ? value : '';
    return (
      <div>
        <textarea
          className="bz-input min-h-[120px]"
          value={textVal}
          onChange={(e) => onChange(e.target.value)}
          maxLength={2000}
          placeholder={isTr ? 'Yanıtın...' : 'Your answer...'}
          spellCheck
        />
        <p className="text-[11px] text-[#A3A3A3] mt-1 text-right bz-mono">
          {textVal.length} / 2000
        </p>
      </div>
    );
  }

  // file — placeholder, soon
  return (
    <p className="text-[12px] text-[#737373] italic">
      {isTr ? 'Dosya yükleme yakında eklenecek.' : 'File upload coming soon.'}
    </p>
  );
}
