'use client';

// Stage 98 — Public survey UI (CLAUDE.md §42).
// Pulse design language (graphite + lime + pure white), mobile-first.
// Single + multi-step both supported in one component (switch on type
// when rendering step indicator + nav buttons). KVKK consent paterni
// /r/[slug] with — submit gate, optional contact + marketing opt-in.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Send,
  Star,
} from 'lucide-react';
import { getOrCreateSessionId } from '@/lib/analytics-session';

type QuestionType = 'rating' | 'nps' | 'short_text' | 'long_text' | 'multiple_choice';

interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options: string[] | null;
  required: boolean;
  sortOrder: number;
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
  kvkkText: string | null;
  isActive: boolean;
}

interface Survey {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: 'single' | 'multi_step';
  isPublished: boolean;
  isActive: boolean;
  accentColor: string | null;
  thankYouMessage: string | null;
  kvkkText: string | null;
  collectMarketingConsent: boolean;
  collectContact: boolean;
  restaurantId: string;
  restaurant: Restaurant;
  questions: Question[];
}

interface AnswerValue {
  numberValue?: number;
  textValue?: string;
  optionValue?: string;
}

export default function PublicSurveyView({ survey }: { survey: Survey }) {
  const accent = survey.accentColor || survey.restaurant.primaryColor || '#C6F24E';
  const isMulti = survey.type === 'multi_step' && survey.questions.length > 1;

  // Last "step" is the contact / consent + submit screen.
  // For single-question survey we still show consent (separately or
  // inline on the same screen, see render below).
  const questionCount = survey.questions.length;
  const totalSteps = isMulti ? questionCount + 1 : 1; // +1 for consent
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [kvkk, setKvkk] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Strip `?source=qr` param after first render (so refresh doesn't replay).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.has('source')) {
      params.delete('source');
      const newQuery = params.toString();
      const url = `${window.location.pathname}${newQuery ? `?${newQuery}` : ''}`;
      window.history.replaceState({}, '', url);
    }
  }, []);

  const updateAnswer = useCallback((qid: string, patch: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [qid]: { ...prev[qid], ...patch } }));
  }, []);

  const currentQuestion: Question | null =
    isMulti && step < questionCount ? survey.questions[step] : null;
  const onConsentStep = isMulti ? step === questionCount : !isMulti;

  const validateAnswer = (q: Question, a: AnswerValue | undefined): boolean => {
    if (!q.required) return true;
    if (!a) return false;
    if (q.type === 'rating') return typeof a.numberValue === 'number';
    if (q.type === 'nps') return typeof a.numberValue === 'number';
    if (q.type === 'multiple_choice') return !!a.optionValue;
    return !!a.textValue?.trim();
  };

  const canProceed = useMemo(() => {
    if (currentQuestion) return validateAnswer(currentQuestion, answers[currentQuestion.id]);
    return kvkk;
  }, [currentQuestion, answers, kvkk]);

  const allRequiredAnswered = useMemo(() => {
    return survey.questions.every((q) => validateAnswer(q, answers[q.id]));
  }, [survey.questions, answers]);

  const handleSubmit = useCallback(async () => {
    if (!kvkk) {
      setErrorMsg('KVKK onayı gereklidir.');
      return;
    }
    if (!allRequiredAnswered) {
      setErrorMsg('Zorunlu soruları yanıtlayın.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    const sessionId = getOrCreateSessionId();
    try {
      const res = await fetch(`/api/public/surveys/${survey.slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          email: survey.collectContact ? email.trim() || null : null,
          phone: survey.collectContact ? phone.trim() || null : null,
          hasKvkkConsent: true,
          hasMarketingConsent: survey.collectMarketingConsent ? marketing : false,
          answers: survey.questions.map((q) => {
            const a = answers[q.id] || {};
            return {
              questionId: q.id,
              textValue: a.textValue,
              numberValue: a.numberValue,
              optionValue: a.optionValue,
            };
          }),
        }),
      });
      if (res.status === 409) {
        // Already submitted — surface friendly message.
        setErrorMsg('Bu anketi zaten yanıtladınız. Teşekkür ederiz!');
        setSubmitted(true);
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.message || 'submit_failed');
      }
      setSubmitted(true);
    } catch (err) {
      setErrorMsg((err as Error).message || 'Bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  }, [
    kvkk,
    allRequiredAnswered,
    email,
    phone,
    marketing,
    answers,
    survey.slug,
    survey.questions,
    survey.collectContact,
    survey.collectMarketingConsent,
  ]);

  const initial = survey.restaurant.name.charAt(0).toUpperCase();

  // ── Thank-you screen ────────────────────────────────────────────────
  if (submitted) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white">
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-10">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: accent }}
          >
            <CheckCircle2 size={32} color="#0A0A0A" />
          </div>
          <h1 className="mt-5 text-center text-2xl font-medium" style={{ letterSpacing: '-0.02em' }}>
            Teşekkür ederiz!
          </h1>
          <p className="mt-3 text-center text-sm text-white/70">
            {survey.thankYouMessage ||
              'Görüşlerinizi paylaştığınız için teşekkür ederiz. Geri bildiriminiz bizim için değerli.'}
          </p>
          <p className="mt-6 text-[10px] uppercase tracking-[0.18em] text-white/40">
            Buaze · Pulse
          </p>
        </div>
      </main>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#0A0A0A] py-8 sm:py-14">
      <div className="mx-auto max-w-[560px] px-4">
        {/* Brand header */}
        <header className="mb-5 flex items-center gap-3 text-white">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 text-base font-bold"
            aria-hidden="true"
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold tracking-tight">
              {survey.restaurant.name}
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">
              {survey.type === 'single' ? 'Anket' : 'Adım adım anket'}
            </div>
          </div>
        </header>

        {/* Card */}
        <section className="overflow-hidden rounded-3xl bg-white shadow-lg">
          {/* Accent header strip */}
          <div className="h-1 w-full" style={{ backgroundColor: accent }} />

          <div className="p-5 sm:p-8">
            {/* Step indicator */}
            {isMulti && (
              <div className="mb-5 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.18em] text-[#737373]">
                  Adım {Math.min(step + 1, totalSteps)} / {totalSteps}
                </span>
                <div className="ml-3 h-1 flex-1 overflow-hidden rounded-full bg-[#F5F5F5]">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${((Math.min(step, totalSteps - 1) + 1) / totalSteps) * 100}%`,
                      backgroundColor: accent,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Title — visible only on first step (or for single-question) */}
            {(step === 0 || !isMulti) && (
              <>
                <h1
                  className="text-[22px] font-medium leading-tight text-[#0A0A0A] sm:text-[26px]"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  {survey.title}
                </h1>
                {survey.description && (
                  <p className="mt-2 text-sm text-[#525252]">{survey.description}</p>
                )}
              </>
            )}

            {/* Question content (for multi-step) */}
            {isMulti && currentQuestion && (
              <div className={step === 0 ? 'mt-6' : ''}>
                <p className="text-sm font-medium text-[#0A0A0A]">
                  {currentQuestion.text}
                  {currentQuestion.required && (
                    <span className="ml-1 text-[#DC2626]" aria-hidden>
                      *
                    </span>
                  )}
                </p>
                <div className="mt-4">
                  <QuestionInput
                    question={currentQuestion}
                    value={answers[currentQuestion.id]}
                    onChange={(patch) => updateAnswer(currentQuestion.id, patch)}
                    accent={accent}
                  />
                </div>
              </div>
            )}

            {/* For single-survey: render the only question inline */}
            {!isMulti && survey.questions.length > 0 && (
              <div className="mt-6">
                {survey.questions.map((q) => (
                  <div key={q.id}>
                    <p className="text-sm font-medium text-[#0A0A0A]">
                      {q.text}
                      {q.required && (
                        <span className="ml-1 text-[#DC2626]" aria-hidden>
                          *
                        </span>
                      )}
                    </p>
                    <div className="mt-4">
                      <QuestionInput
                        question={q}
                        value={answers[q.id]}
                        onChange={(patch) => updateAnswer(q.id, patch)}
                        accent={accent}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Consent / contact screen */}
            {onConsentStep && (
              <div className={isMulti ? 'mt-2' : 'mt-6 border-t border-[#EDEDED] pt-6'}>
                {survey.collectContact && (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#525252]">
                        E-posta (opsiyonel)
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="ornek@buaze.com"
                        className="w-full rounded-xl border border-[#EDEDED] bg-white px-3 py-2.5 text-sm text-[#0A0A0A] focus:border-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#C6F24E]/40"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#525252]">
                        Telefon (opsiyonel)
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="+90 5XX"
                        className="w-full rounded-xl border border-[#EDEDED] bg-white px-3 py-2.5 text-sm text-[#0A0A0A] focus:border-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#C6F24E]/40"
                      />
                    </div>
                  </div>
                )}

                <div
                  className={
                    survey.collectContact
                      ? 'mt-4 space-y-2 border-t border-[#EDEDED] pt-4'
                      : 'space-y-2'
                  }
                >
                  <label className="flex items-start gap-2 text-xs leading-relaxed text-[#525252]">
                    <input
                      type="checkbox"
                      checked={kvkk}
                      onChange={(e) => setKvkk(e.target.checked)}
                      aria-required="true"
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#A3A3A3] accent-[#0A0A0A]"
                    />
                    <span>
                      KVKK Aydınlatma Metni&apos;ni okudum ve kabul ediyorum.
                      {survey.kvkkText && (
                        <span className="ml-2 text-[10px] text-[#737373]">
                          ({survey.restaurant.name})
                        </span>
                      )}
                    </span>
                  </label>
                  {survey.collectMarketingConsent && (
                    <label className="flex items-start gap-2 text-xs leading-relaxed text-[#525252]">
                      <input
                        type="checkbox"
                        checked={marketing}
                        onChange={(e) => setMarketing(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#A3A3A3] accent-[#0A0A0A]"
                      />
                      <span>Kampanya ve duyurulardan haberdar olmak istiyorum (opsiyonel).</span>
                    </label>
                  )}
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="mt-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-xs text-[#991B1B]">
                {errorMsg}
              </div>
            )}

            {/* Navigation */}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              {isMulti && step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  className="inline-flex items-center justify-center gap-1 rounded-full border border-[#EDEDED] bg-white px-4 py-2.5 text-xs font-medium text-[#525252] hover:border-[#A3A3A3]"
                  disabled={submitting}
                >
                  <ArrowLeft size={14} />
                  Geri
                </button>
              )}
              {!isMulti || step < totalSteps - 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (canProceed) setStep((s) => s + 1);
                  }}
                  disabled={!canProceed || (!isMulti && submitting)}
                  className="ml-auto inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-semibold transition disabled:opacity-50"
                  style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF' }}
                >
                  {isMulti ? 'Devam' : 'Devam'}
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !canProceed || !allRequiredAnswered}
                  className="ml-auto inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-semibold transition disabled:opacity-50"
                  style={{ backgroundColor: accent, color: '#0A0A0A' }}
                >
                  {submitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  Gönder
                </button>
              )}
            </div>
          </div>
        </section>

        <footer className="mt-5 text-center text-[10px] uppercase tracking-[0.18em] text-white/40">
          Powered by Buaze
        </footer>
      </div>
    </main>
  );
}

// ─── Question input renderer ─────────────────────────────────────────

function QuestionInput({
  question,
  value,
  onChange,
  accent,
}: {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (patch: AnswerValue) => void;
  accent: string;
}) {
  if (question.type === 'rating') {
    const current = value?.numberValue ?? 0;
    return (
      <div className="flex flex-wrap items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n <= current;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ numberValue: n })}
              aria-label={`${n} yıldız`}
              className="rounded-md p-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
              style={{ backgroundColor: active ? accent : '#FAFAFA' }}
            >
              <Star size={24} fill={active ? '#0A0A0A' : 'transparent'} color="#0A0A0A" />
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === 'nps') {
    const current = value?.numberValue;
    return (
      <div>
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">
          {Array.from({ length: 11 }, (_, i) => i).map((n) => {
            const active = n === current;
            return (
              <button
                key={n}
                type="button"
                onClick={() => onChange({ numberValue: n })}
                aria-label={`${n}`}
                className="rounded-md border py-2 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
                style={{
                  backgroundColor: active ? accent : '#FFFFFF',
                  borderColor: active ? '#0A0A0A' : '#EDEDED',
                  color: '#0A0A0A',
                }}
              >
                {n}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-[#737373]">
          <span>Tavsiye etmem</span>
          <span>Kesinlikle tavsiye ederim</span>
        </div>
      </div>
    );
  }

  if (question.type === 'short_text') {
    return (
      <input
        type="text"
        value={value?.textValue || ''}
        onChange={(e) => onChange({ textValue: e.target.value.slice(0, 200) })}
        maxLength={200}
        className="w-full rounded-xl border border-[#EDEDED] bg-white px-3 py-2.5 text-sm text-[#0A0A0A] focus:border-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#C6F24E]/40"
        placeholder="Cevabınızı yazın…"
      />
    );
  }

  if (question.type === 'long_text') {
    return (
      <textarea
        value={value?.textValue || ''}
        onChange={(e) => onChange({ textValue: e.target.value.slice(0, 2000) })}
        maxLength={2000}
        rows={4}
        className="w-full rounded-xl border border-[#EDEDED] bg-white px-3 py-2.5 text-sm text-[#0A0A0A] focus:border-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#C6F24E]/40"
        placeholder="Detaylı geri bildiriminiz…"
      />
    );
  }

  if (question.type === 'multiple_choice') {
    const opts = question.options || [];
    return (
      <ul className="space-y-2">
        {opts.map((o) => {
          const active = value?.optionValue === o;
          return (
            <li key={o}>
              <button
                type="button"
                onClick={() => onChange({ optionValue: o })}
                className="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
                style={{
                  backgroundColor: active ? accent : '#FFFFFF',
                  borderColor: active ? '#0A0A0A' : '#EDEDED',
                  color: '#0A0A0A',
                }}
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                  style={{
                    borderColor: active ? '#0A0A0A' : '#A3A3A3',
                    backgroundColor: active ? '#0A0A0A' : 'transparent',
                  }}
                  aria-hidden
                >
                  {active && (
                    <span className="h-2 w-2 rounded-full bg-white" />
                  )}
                </span>
                <span className="flex-1">{o}</span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return null;
}
