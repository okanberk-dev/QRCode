'use client';

// Stage 99 — Public survey UI (CLAUDE.md §42).
// Faithful port of the Claude Design "Buaze Anket" handoff
// (bundle a/nFAGytnqZwW98Ldy0d5Lig). Customer-facing mobile-first page
// reached via QR scan at /s/[slug].
//
// Three stages:
//   1. intro  — dark hero with lime ambient glow, brand pill + table eyebrow
//               (only when ?table= is present), eyebrow + minutes badge,
//               italic Space Grotesk h1, sub copy,
//               "NELER SORACAĞIZ" numbered list (first 4 + overflow),
//               lime CTA with deep shadow, KVKK disclaimer.
//   2. question — light card surface with TopBar (back + brand + masa) +
//                 progress bar (mono "n/N" + lime fill with glow), eyebrow pill,
//                 italic title, subtitle, the question itself, sticky FooterBar
//                 (lime CTA + optional "Bu soruyu atla").
//   3. (optional) contact — same TopBar + light card. AD + E-POSTA inline
//                  labelled fields, KVKK consent (required), marketing
//                  consent (optional, opt-in).
//   4. thanks — dark hero with confetti burst, lime success circle with
//               pulsing glow, italic h2, response no (mono, the last 6
//               characters of the REAL response id — never made up),
//               optional coupon card (dashed border + scalloped cutouts +
//               lime copy → "✓ KOPYALANDI"), "Menüye dön" button.
//      `already` variant (server answered 409: this device already
//      submitted) — calm copy, no confetti, no response no; the coupon still
//      shows.
//
// Accent colours go through resolveSurveyAccent (lib/survey-accent.ts): every
// fill + text pair is contrast-protected per surface (dark intro/thanks vs
// light question/contact), so an ink-coloured survey no longer paints an
// invisible CTA.
//
// Five question types are wired (rating/nps/short_text/long_text/
// multiple_choice). The design's emoji/chips/likert/slider/datetime/contact
// renderers are out of scope until the schema grows to support them.
//
// All KVKK + IDOR + rate limit + sessionId discipline preserved.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { getOrCreateSessionId } from '@/lib/analytics-session';
import { surveyResponseShortId } from '@/lib/surveys';
import {
  resolveSurveyAccent,
  type AccentPair,
  type ResolvedSurveyAccent,
} from '@/lib/survey-accent';

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
  // Stage B — restaurant.kvkkText dropped from public payload. Public
  // survey form now links to Buaze-managed /{locale}/kvkk (§19.1).
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
  // Stage B — kvkkText + collectMarketingConsent dropped. KVKK + marketing
  // consent now flow through Buaze-managed pages (/kvkk + /acik-riza).
  collectContact: boolean;
  couponCode: string | null;
  couponLabel: string | null;
  restaurantId: string;
  restaurant: Restaurant;
  questions: Question[];
}

interface AnswerValue {
  numberValue?: number;
  textValue?: string;
  optionValue?: string;
}

type Stage = 'intro' | 'question' | 'contact' | 'thanks';

const SHORT_TYPE_LABEL: Record<QuestionType, string> = {
  rating: 'Yıldız puanı',
  nps: 'Tavsiye skoru',
  short_text: 'Kısa cevap',
  long_text: 'Açık not',
  multiple_choice: 'Tek seçim',
};

// KVKK / Açık Rıza / Ticari İleti links sit INSIDE a ConsentRow whose
// background AND text colour flip with the checkbox (white/ink ↔ ink/white).
// A hard-coded #0A0A0A link was ink-on-ink (1:1, unreadable) on the checked
// row — i.e. by default, since KVKK ships pre-checked. `inherit` follows the
// row: white on #0A0A0A when checked, ink on white otherwise (19.8:1 both).
const LEGAL_LINK_STYLE: React.CSSProperties = {
  color: 'inherit',
  textDecoration: 'underline',
};

// Pull `?table=` once on mount so the brand eyebrow can show "MASA X".
// `null` when the link carries no (valid) table — callers then render no
// "MASA" text at all (hotels, clinics … have no tables; "MASA —" is noise).
function useTableNumber(): string | null {
  const [table, setTable] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const t = params.get('table');
    if (t && /^[A-Za-z0-9_-]{1,20}$/.test(t)) setTable(t);
    // Strip ?source=qr so a refresh doesn't replay the QR splash.
    if (params.has('source')) {
      params.delete('source');
      const query = params.toString();
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${query ? `?${query}` : ''}`,
      );
    }
  }, []);
  return table;
}

function isAnswered(q: Question, val: AnswerValue | undefined): boolean {
  if (!q.required) return true;
  if (!val) return false;
  switch (q.type) {
    case 'rating':
    case 'nps':
      return typeof val.numberValue === 'number';
    case 'multiple_choice':
      return !!val.optionValue;
    case 'short_text':
    case 'long_text':
      return !!val.textValue?.trim();
  }
}

export default function PublicSurveyView({ survey }: { survey: Survey }) {
  // Contrast-protected fill + text pairs for the dark (intro/thanks) and
  // light (question/contact) surfaces; lime stays lime (lib/survey-accent.ts).
  const palette = useMemo(
    () => resolveSurveyAccent(survey.accentColor || survey.restaurant.primaryColor),
    [survey.accentColor, survey.restaurant.primaryColor],
  );
  const brand = survey.restaurant.name;
  const table = useTableNumber();

  // Multi-step renderer kicks in when there are 2+ questions; single
  // surveys with a lone question still get the intro + footer chrome but
  // skip the progress strip.
  const isMulti = survey.type === 'multi_step' && survey.questions.length > 1;

  const [stage, setStage] = useState<Stage>('intro');
  const [stepIdx, setStepIdx] = useState(0);
  const [direction, setDirection] = useState<'fwd' | 'back'>('fwd');
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});

  // Contact form state — populated only when stage === 'contact'.
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [kvkk, setKvkk] = useState(true);
  const [marketing, setMarketing] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Real id of the saved response (201 body). Null until a save really
  // happened — the thank-you screen never shows a made-up reference.
  const [responseId, setResponseId] = useState<string | null>(null);
  // Server answered 409: this device already submitted. NOT a fresh save.
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  // Synchronous in-flight lock. `submitting` state only updates on the next
  // render, so a same-tick double tap would POST twice: 201 for the first,
  // 409 for our own duplicate — and the 409 would then turn a successful save
  // into the "already answered" screen.
  const submitLockRef = useRef(false);

  const currentQuestion = survey.questions[stepIdx];
  const currentValue = currentQuestion ? answers[currentQuestion.id] : undefined;
  const totalSteps = survey.questions.length;

  const setAnswer = useCallback((qid: string, patch: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [qid]: { ...prev[qid], ...patch } }));
  }, []);

  const goForward = useCallback(() => {
    setDirection('fwd');
    if (stepIdx + 1 < totalSteps) {
      setStepIdx(stepIdx + 1);
      return;
    }
    // Stage B — contact stage is ALWAYS reached now: it carries the
    // mandatory KVKK consent + optional marketing consent block tied to
    // Buaze-managed legal pages. Contact fields (e-mail / phone) are
    // hidden when `collectContact: false` but the consent block stays.
    setStage('contact');
  }, [stepIdx, totalSteps]);

  const goBack = useCallback(() => {
    setDirection('back');
    if (stage === 'contact') {
      setStage('question');
      return;
    }
    if (stepIdx > 0) {
      setStepIdx(stepIdx - 1);
      return;
    }
    setStage('intro');
  }, [stage, stepIdx]);

  const start = useCallback(() => {
    setStage('question');
    setStepIdx(0);
    setDirection('fwd');
  }, []);

  const doSubmit = useCallback(
    async ({ skipContactValidation = false }: { skipContactValidation?: boolean } = {}) => {
      if (submitLockRef.current) return;
      if (!skipContactValidation && !kvkk) {
        setErrorMsg('KVKK onayı gereklidir.');
        return;
      }
      submitLockRef.current = true;
      setSubmitting(true);
      setErrorMsg(null);
      const sessionId = getOrCreateSessionId();
      try {
        const res = await fetch(`/api/public/surveys/${survey.slug}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            email: survey.collectContact ? contactEmail.trim() || null : null,
            phone: survey.collectContact ? contactPhone.trim() || null : null,
            hasKvkkConsent: true,
            // Stage B — marketing consent always flows from the submitter
            // checkbox (Buaze-managed /acik-riza link).
            hasMarketingConsent: marketing,
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
          // (surveyId, sessionId) already stored — nothing was saved now.
          // Show the dedicated "already answered" state, not the normal
          // thank-you with a fabricated reference.
          setAlreadySubmitted(true);
          setSubmitted(true);
          setStage('thanks');
          return;
        }
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.message || 'submit_failed');
        }
        const saved = (await res.json().catch(() => null)) as { responseId?: unknown } | null;
        setResponseId(
          typeof saved?.responseId === 'string' && saved.responseId ? saved.responseId : null,
        );
        setAlreadySubmitted(false);
        setSubmitted(true);
        setStage('thanks');
      } catch (err) {
        setErrorMsg((err as Error).message || 'Bir hata oluştu.');
      } finally {
        submitLockRef.current = false;
        setSubmitting(false);
      }
    },
    [
      kvkk,
      marketing,
      contactEmail,
      contactPhone,
      survey.slug,
      survey.questions,
      survey.collectContact,
      answers,
    ],
  );

  // Auto-advance for single-question "rating" surveys at 4★+ — design
  // intent: a happy customer shouldn't need to tap "Devam et" again.
  // Stage B — contact stage is now always reached (mandatory consent gate)
  // so we always transition to it, never skip straight to submit.
  useEffect(() => {
    if (survey.type !== 'single' || survey.questions.length !== 1) return;
    if (stage !== 'question') return;
    const q = survey.questions[0];
    if (q.type !== 'rating') return;
    const v = answers[q.id]?.numberValue;
    if (typeof v === 'number' && v >= 4) {
      const t = setTimeout(() => setStage('contact'), 700);
      return () => clearTimeout(t);
    }
  }, [survey.type, survey.questions, stage, answers]);

  const canBack = stage === 'contact' || (stage === 'question' && stepIdx > 0);
  const canContinue = currentQuestion ? isAnswered(currentQuestion, currentValue) : false;

  // ─────────────────────────────────────────────────────────────
  // Stage renderers
  // ─────────────────────────────────────────────────────────────

  if (stage === 'intro') {
    return (
      <SurveyFrame mode="dark">
        <IntroScreen
          accent={palette.onDark}
          brand={brand}
          table={table}
          survey={survey}
          onStart={start}
        />
      </SurveyFrame>
    );
  }

  if (stage === 'thanks' || submitted) {
    return (
      <SurveyFrame mode="dark">
        <ThanksScreen
          accent={palette.onDark}
          brand={brand}
          survey={survey}
          variant={alreadySubmitted ? 'already' : 'done'}
          responseId={responseId}
        />
      </SurveyFrame>
    );
  }

  return (
    <SurveyFrame mode="light">
      <div className="flex flex-1 flex-col bg-white">
        <TopBar brand={brand} table={table} onBack={goBack} canBack={canBack} />
        {isMulti && stage === 'question' && (
          <ProgressBar current={stepIdx + 1} total={totalSteps} accent={palette.onLight.fill} />
        )}

        <div className="flex flex-1 flex-col overflow-auto">
          {stage === 'question' && currentQuestion && (
            <QuestionScreen
              key={`${currentQuestion.id}-${direction}`}
              q={currentQuestion}
              value={currentValue}
              onChange={(patch) => setAnswer(currentQuestion.id, patch)}
              palette={palette}
              direction={direction}
            />
          )}

          {stage === 'contact' && (
            <ContactScreen
              direction={direction}
              palette={palette}
              collectContact={survey.collectContact}
              name={contactName}
              setName={setContactName}
              email={contactEmail}
              setEmail={setContactEmail}
              phone={contactPhone}
              setPhone={setContactPhone}
              kvkk={kvkk}
              setKvkk={setKvkk}
              marketing={marketing}
              setMarketing={setMarketing}
              onSubmit={() => void doSubmit()}
              submitting={submitting}
              error={errorMsg}
            />
          )}
        </div>

        {stage === 'question' && (
          <FooterBar
            canContinue={canContinue}
            onContinue={goForward}
            onSkip={() => {
              if (currentQuestion) setAnswer(currentQuestion.id, {});
              goForward();
            }}
            accent={palette.onLight}
            optional={!currentQuestion?.required}
          />
        )}
      </div>
    </SurveyFrame>
  );
}

// ─────────────────────────────────────────────────────────────
// Frame: dark wrapper on desktop, full-bleed mobile, max-width 440
// ─────────────────────────────────────────────────────────────

function SurveyFrame({
  mode,
  children,
}: {
  mode: 'dark' | 'light';
  children: React.ReactNode;
}) {
  // Mobile (≤520px) — page bg = ink (#0A0A0A) so the frame is seamless
  // with the dark intro/thanks screens (no visible border).
  // Desktop (>520px) — page bg = #1a1a1a so the rounded 440px-wide card
  // floats over a slightly lighter charcoal stage.
  return (
    <main
      className="bz-survey-stage flex min-h-dvh items-center justify-center"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <div
        className="bz-survey-frame"
        style={{
          background: mode === 'dark' ? '#0A0A0A' : '#fff',
        }}
      >
        {children}
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────
// Intro screen — dark hero with lime ambient glow
// ─────────────────────────────────────────────────────────────

function IntroScreen({
  accent,
  brand,
  table,
  survey,
  onStart,
}: {
  /** Contrast-protected fill + text for the dark (#0A0A0A) surface. */
  accent: AccentPair;
  brand: string;
  table: string | null;
  survey: Survey;
  onStart: () => void;
}) {
  const dark = true; // design default
  const minutes = useMemo(() => {
    // Rough: 8-10s per question + 12s consent stage (always shown
    // post-Stage B for KVKK + marketing consent).
    const q = survey.questions.length;
    const seconds = q * 9 + 12;
    if (seconds < 30) return '~20 sn';
    if (seconds < 60) return '~45 sn';
    if (seconds < 90) return '~1 dk';
    return `~${Math.round(seconds / 60)} dk`;
  }, [survey.questions.length]);

  const previewSteps = survey.questions.slice(0, 4);
  const overflow = Math.max(0, survey.questions.length - 4);
  const eyebrow =
    survey.type === 'single'
      ? 'TEK SORU'
      : survey.questions.length <= 3
      ? 'KISA ANKET'
      : 'ANKET';

  return (
    <div
      className="anim-fade relative flex flex-1 flex-col overflow-hidden"
      style={{ background: '#0A0A0A', color: '#fff' }}
    >
      {/* Ambient lime glow */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -120,
          right: -100,
          width: 320,
          height: 320,
          borderRadius: 999,
          background: accent.fill,
          opacity: 0.18,
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: -100,
          left: -80,
          width: 240,
          height: 240,
          borderRadius: 999,
          background: accent.fill,
          opacity: 0.1,
          filter: 'blur(70px)',
          pointerEvents: 'none',
        }}
      />

      {/* Brand row */}
      <div
        className="relative"
        style={{
          padding:
            'calc(60px + env(safe-area-inset-top, 0px)) 22px 0',
        }}
      >
        <div className="mb-7 flex items-center justify-between">
          <div
            className="inline-flex items-center gap-2 rounded-full border"
            style={{
              padding: '5px 10px 5px 8px',
              borderColor: 'rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.06)',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: accent.fill,
                boxShadow: `0 0 10px ${accent.fill}`,
              }}
            />
            <span
              className="bz-survey-eyebrow"
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              {brand}
            </span>
          </div>
          {/* Only when the QR link carries ?table= — hotels, clinics … have
              no tables, and "MASA —" was meaningless noise. */}
          {table && (
            <span
              className="bz-survey-eyebrow"
              style={{ color: 'rgba(255,255,255,0.45)' }}
            >
              MASA {table}
            </span>
          )}
        </div>

        <div style={{ padding: '8px 0 12px' }}>
          <div
            className="bz-survey-eyebrow mb-3"
            style={{ color: accent.fill }}
          >
            {eyebrow} · {minutes}
          </div>
          <h1
            className="bz-survey-head"
            style={{
              margin: 0,
              fontSize: 38,
              color: dark ? '#fff' : '#0A0A0A',
            }}
          >
            {survey.title}
          </h1>
          {survey.description && (
            <p
              style={{
                marginTop: 14,
                marginBottom: 0,
                fontSize: 15,
                lineHeight: 1.5,
                color: 'rgba(255,255,255,0.6)',
                maxWidth: 340,
              }}
            >
              {survey.description}
            </p>
          )}
        </div>
      </div>

      {/* Preview list */}
      {previewSteps.length > 0 && (
        <div className="relative" style={{ padding: '24px 22px 0' }}>
          <div
            className="bz-survey-eyebrow mb-3"
            style={{ color: 'rgba(255,255,255,0.45)' }}
          >
            NELER SORACAĞIZ
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {previewSteps.map((q, i) => (
              <li
                key={q.id}
                className="mb-2.5 flex items-center gap-3 rounded-2xl border"
                style={{
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.04)',
                  borderColor: 'rgba(255,255,255,0.06)',
                }}
              >
                <span
                  className="flex shrink-0 items-center justify-center"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    background: accent.fill,
                    color: accent.text,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    fontWeight: 700,
                    lineHeight: 1,
                    letterSpacing: 0,
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{
                    fontSize: 13.5,
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  {q.text || SHORT_TYPE_LABEL[q.type]}
                </span>
              </li>
            ))}
            {overflow > 0 && (
              <li
                className="bz-survey-mono"
                style={{
                  padding: '8px 14px',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                +{overflow} kısa soru daha
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="flex-1" />

      <div
        className="relative"
        style={{
          padding: '20px 22px calc(44px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <button
          type="button"
          onClick={onStart}
          className="bz-survey-tap flex w-full items-center justify-center gap-2.5"
          style={{
            padding: '18px 20px',
            border: 'none',
            borderRadius: 16,
            background: accent.fill,
            color: accent.text,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: `0 12px 36px -10px ${accent.fill}, 0 4px 12px -4px rgba(0,0,0,0.18)`,
          }}
        >
          Başlayalım
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 12h14M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <p
          className="bz-survey-mono"
          style={{
            margin: '12px 0 0',
            textAlign: 'center',
            fontSize: 11,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.04em',
          }}
        >
          KVKK uyumlu · Yanıtların doğrudan işletmeye iletilir
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Top bar (back + brand + masa)
// ─────────────────────────────────────────────────────────────

function TopBar({
  brand,
  table,
  onBack,
  canBack,
}: {
  brand: string;
  table: string | null;
  onBack: () => void;
  canBack: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2.5"
      style={{
        padding: 'calc(28px + env(safe-area-inset-top, 0px)) 18px 4px',
      }}
    >
      <button
        type="button"
        onClick={onBack}
        disabled={!canBack}
        aria-label="Geri"
        className="bz-survey-tap flex shrink-0 items-center justify-center"
        style={{
          width: 40,
          height: 40,
          borderRadius: 999,
          border: '1px solid rgba(10,10,10,0.08)',
          background: '#fff',
          color: '#0A0A0A',
          cursor: canBack ? 'pointer' : 'default',
          opacity: canBack ? 1 : 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M15 18l-6-6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div
        className="flex-1 text-center"
        style={{ lineHeight: 1.1 }}
      >
        {/* .bz-survey-eyebrow is inline-block — without display:block the
            brand and the table text ran together on one line
            ("KADIKÖYMASA —"). Two stacked lines; the second exists only
            when the link carries ?table=. */}
        <div
          className="bz-survey-eyebrow"
          style={{ display: 'block', color: '#6B6B66' }}
        >
          {brand}
        </div>
        {table && (
          <div
            className="bz-survey-eyebrow"
            style={{ display: 'block', fontSize: 9, color: '#6B6B66', marginTop: 2 }}
          >
            MASA {table}
          </div>
        )}
      </div>
      <div style={{ width: 40, height: 40, flexShrink: 0 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Progress bar
// ─────────────────────────────────────────────────────────────

function ProgressBar({
  current,
  total,
  accent,
}: {
  current: number;
  total: number;
  accent: string;
}) {
  const pct = Math.max(0, Math.min(1, current / total)) * 100;
  return (
    <div style={{ padding: '8px 18px 18px' }}>
      <div className="flex items-center gap-2.5">
        <span
          className="bz-survey-eyebrow"
          style={{ color: '#6B6B66', fontSize: 9.5, minWidth: 30 }}
        >
          {current} / {total}
        </span>
        <div
          className="flex-1 overflow-hidden"
          style={{
            height: 3,
            borderRadius: 999,
            background: '#E5E3DC',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: accent,
              borderRadius: 999,
              boxShadow: `0 0 12px ${accent}80`,
              transition: 'width 380ms cubic-bezier(.22,.65,.32,1.1)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Question screen (light card)
// ─────────────────────────────────────────────────────────────

function QuestionScreen({
  q,
  value,
  onChange,
  palette,
  direction,
}: {
  q: Question;
  value: AnswerValue | undefined;
  onChange: (patch: AnswerValue) => void;
  palette: ResolvedSurveyAccent;
  direction: 'fwd' | 'back';
}) {
  const eyebrow = (q.text ? '' : SHORT_TYPE_LABEL[q.type] + ' · ') + 'SORU';
  return (
    <div
      className={direction === 'back' ? 'anim-slideL' : 'anim-slideR'}
      style={{
        padding: '6px 22px 22px',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
      }}
    >
      <div className="bz-survey-eyebrow mb-3" style={{ color: '#0A0A0A' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '4px 10px',
            background: palette.onLight.fill + '24',
            borderRadius: 999,
            color: '#0A0A0A',
            letterSpacing: '0.12em',
          }}
        >
          {eyebrow}
        </span>
      </div>
      <h2
        className="bz-survey-head"
        style={{ margin: 0, fontSize: 26, color: '#0A0A0A' }}
      >
        {q.text}
      </h2>
      <div style={{ marginTop: 28 }}>
        <QuestionInput q={q} value={value} onChange={onChange} palette={palette} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Footer bar (sticky bottom)
// ─────────────────────────────────────────────────────────────

function FooterBar({
  canContinue,
  onContinue,
  onSkip,
  accent,
  optional,
}: {
  canContinue: boolean;
  onContinue: () => void;
  onSkip: () => void;
  /** Contrast-protected fill + text for the light (#FFFFFF) surface. */
  accent: AccentPair;
  optional: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-2.5"
      style={{
        padding: '14px 22px calc(44px + env(safe-area-inset-bottom, 0px))',
        borderTop: '1px solid #ECEAE3',
        background: '#fff',
      }}
    >
      <button
        type="button"
        onClick={onContinue}
        disabled={!canContinue}
        className="bz-survey-tap flex w-full items-center justify-center gap-2"
        style={{
          padding: '16px 20px',
          border: 'none',
          borderRadius: 14,
          background: canContinue ? accent.fill : '#E5E3DC',
          color: canContinue ? accent.text : '#A3A29C',
          fontSize: 15.5,
          fontWeight: 600,
          cursor: canContinue ? 'pointer' : 'default',
          boxShadow: canContinue
            ? `0 10px 26px -10px ${accent.fill}, 0 4px 10px -4px rgba(0,0,0,0.14)`
            : 'none',
          transition: 'background 220ms, color 220ms, box-shadow 220ms',
        }}
      >
        Devam et
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 12h14M13 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {optional && (
        <button
          type="button"
          onClick={onSkip}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#6B6B66',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            padding: 6,
          }}
        >
          Bu soruyu atla →
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Contact screen
// ─────────────────────────────────────────────────────────────

function ContactScreen({
  direction,
  palette,
  collectContact,
  name,
  setName,
  email,
  setEmail,
  phone,
  setPhone,
  kvkk,
  setKvkk,
  marketing,
  setMarketing,
  onSubmit,
  submitting,
  error,
}: {
  direction: 'fwd' | 'back';
  palette: ResolvedSurveyAccent;
  collectContact: boolean;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  kvkk: boolean;
  setKvkk: (v: boolean) => void;
  marketing: boolean;
  setMarketing: (v: boolean) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const valid = kvkk && !submitting;
  // Real <label htmlFor> ↔ input ids for the three contact fields.
  const fieldId = useId();
  return (
    <div
      className={direction === 'back' ? 'anim-slideL' : 'anim-slideR'}
      style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
    >
      <div style={{ padding: '6px 22px 0' }}>
        <div className="bz-survey-eyebrow mb-3">
          <span
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              background: palette.onLight.fill + '24',
              borderRadius: 999,
              color: '#0A0A0A',
              letterSpacing: '0.12em',
            }}
          >
            SON ADIM · İLETİŞİM
          </span>
        </div>
        <h2
          className="bz-survey-head"
          style={{ margin: 0, fontSize: 26, color: '#0A0A0A' }}
        >
          {collectContact
            ? 'Sana özel kupon için iletişim bilgini bırak'
            : 'Yanıtını gönderiyoruz'}
        </h2>
        <p
          style={{
            margin: '10px 0 0',
            fontSize: 13.5,
            color: '#6B6B66',
            lineHeight: 1.45,
          }}
        >
          {collectContact
            ? 'Opsiyonel — kupon kodun ve önemli güncellemeler için.'
            : 'Onayını alıp anketi tamamlayalım.'}
        </p>

        <div
          style={{
            marginTop: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {collectContact && (
            <>
              <LabelledField label="AD" htmlFor={`${fieldId}-name`}>
                <input
                  id={`${fieldId}-name`}
                  className="bz-survey-field"
                  style={{ paddingLeft: 64 }}
                  placeholder="Adın"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  autoCapitalize="words"
                  enterKeyHint="next"
                />
              </LabelledField>
              <div className="relative">
                <LabelledField label="E-POSTA" labelWidth={80} htmlFor={`${fieldId}-email`}>
                  <input
                    id={`${fieldId}-email`}
                    className="bz-survey-field"
                    type="email"
                    style={{
                      paddingLeft: 92,
                      borderColor: '#0A0A0A',
                      borderWidth: 1.5,
                    }}
                    placeholder="ornek@mail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    inputMode="email"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    autoComplete="email"
                    enterKeyHint="next"
                  />
                </LabelledField>
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 14,
                    bottom: 14,
                    width: 3,
                    borderRadius: 999,
                    background: palette.onLight.fill,
                  }}
                />
              </div>
              <LabelledField label="TEL" labelWidth={48} htmlFor={`${fieldId}-phone`}>
                <input
                  id={`${fieldId}-phone`}
                  className="bz-survey-field"
                  type="tel"
                  style={{ paddingLeft: 64 }}
                  placeholder="+90 5xx xxx xx xx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  enterKeyHint="done"
                />
              </LabelledField>
            </>
          )}

          {/* Stage B — Buaze-managed legal links. KVKK + marketing consent
              flow through site-wide /tr/kvkk + /tr/acik-riza + /tr/ticari-ileti
              pages (the survey route is TR-only at the moment; if EN is added
              later, locale state should be hoisted here as /r/[slug] does). */}
          <ConsentRow
            checked={kvkk}
            onChange={setKvkk}
            accent={palette.onDark}
            label={
              <span>
                Okudum, anladım —{' '}
                <a
                  href="/tr/kvkk"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={LEGAL_LINK_STYLE}
                >
                  KVKK Aydınlatma Metni
                </a>{' '}
                ve{' '}
                <a
                  href="/tr/acik-riza"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={LEGAL_LINK_STYLE}
                >
                  Açık Rıza Metni
                </a>{' '}
                kapsamında verilerimin işlenmesine açık rıza veriyorum.
              </span>
            }
            required
          />
          <ConsentRow
            checked={marketing}
            onChange={setMarketing}
            accent={palette.onDark}
            label={
              <span>
                Kampanya ve duyurular için{' '}
                <a
                  href="/tr/ticari-ileti"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={LEGAL_LINK_STYLE}
                >
                  Ticari Elektronik İleti İzni
                </a>{' '}
                kapsamında iletişim onayı veriyorum{' '}
                {/* inherits the row colour (ink unchecked / white checked);
                    opacity keeps ≥ 4.5:1 in both states — a fixed grey
                    cannot (3.7:1 on the checked #0A0A0A row). */}
                <span style={{ opacity: 0.7 }}>(opsiyonel)</span>.
              </span>
            }
          />
        </div>

        {error && (
          <div
            role="alert"
            className="anim-fade"
            style={{
              marginTop: 14,
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid #F4B4B6',
              background: '#FDECEC',
              color: '#9C2227',
              fontSize: 12.5,
            }}
          >
            {error}
          </div>
        )}
      </div>

      <div className="flex-1" />

      <div
        className="flex flex-col gap-2.5"
        style={{
          padding: '14px 22px calc(22px + env(safe-area-inset-bottom, 0px))',
          borderTop: '1px solid #ECEAE3',
          background: '#fff',
        }}
      >
        <button
          type="button"
          onClick={onSubmit}
          disabled={!valid}
          className="bz-survey-tap flex w-full items-center justify-center gap-2"
          style={{
            padding: '16px 20px',
            border: 'none',
            borderRadius: 14,
            background: valid ? palette.onLight.fill : '#E5E3DC',
            color: valid ? palette.onLight.text : '#A3A29C',
            fontSize: 15.5,
            fontWeight: 600,
            cursor: valid ? 'pointer' : 'default',
            boxShadow: valid ? `0 10px 26px -10px ${palette.onLight.fill}` : 'none',
          }}
        >
          {submitting ? 'Gönderiliyor…' : 'Anketi gönder'}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 12l5 5L20 7"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

// The caption is a real <label htmlFor> (visually unchanged: it sits inside
// the input at the left). #6B6B66 on white = 5.36:1 (was #A3A29C, 2.56:1).
function LabelledField({
  label,
  labelWidth,
  htmlFor,
  children,
}: {
  label: string;
  labelWidth?: number;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <label
        htmlFor={htmlFor}
        className="bz-survey-eyebrow absolute"
        style={{
          left: 16,
          top: 16,
          color: '#6B6B66',
          width: labelWidth,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function ConsentRow({
  checked,
  onChange,
  accent,
  label,
  required,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  /** Fill + text for the CHECKED row, which is dark (#0A0A0A) — dark-surface pair. */
  accent: AccentPair;
  label: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      className="bz-survey-tap bz-survey-consent flex cursor-pointer items-start gap-3 rounded-2xl border"
      style={{
        padding: '12px 14px',
        borderColor: checked ? '#0A0A0A' : '#E5E3DC',
        background: checked ? '#0A0A0A' : '#fff',
        color: checked ? '#fff' : '#0A0A0A',
        position: 'relative',
      }}
    >
      {/* The real checkbox: visually hidden (sr-only) but FOCUSABLE, so
          keyboard users reach it and survey.css draws the focus ring on the
          whole row (.bz-survey-consent). Kept first in the DOM so Tab order
          is checkbox → legal links. */}
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-required={required}
      />
      <span
        aria-hidden
        className="flex shrink-0 items-center justify-center"
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          border: '1.5px solid ' + (checked ? accent.fill : '#D4D2CC'),
          background: checked ? accent.fill : '#fff',
          marginTop: 1,
        }}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12l5 5L20 7"
              stroke={accent.text}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span style={{ fontSize: 12.5, lineHeight: 1.45, paddingTop: 1 }}>
        {label}
        {required && (
          <span
            style={{ color: checked ? accent.fill : '#E5484D', marginLeft: 4 }}
            aria-hidden
          >
            *
          </span>
        )}
      </span>
    </label>
  );
}

// ─────────────────────────────────────────────────────────────
// Thanks screen — dark with confetti + coupon
// ─────────────────────────────────────────────────────────────

function ThanksScreen({
  accent,
  brand,
  survey,
  variant,
  responseId,
}: {
  /** Contrast-protected fill + text for the dark (#0A0A0A) surface. */
  accent: AccentPair;
  brand: string;
  survey: Survey;
  /** `done` = the answers were just saved; `already` = server said 409. */
  variant: 'done' | 'already';
  /** Real id of the response saved by THIS submit (null for `already`). */
  responseId: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const isAlready = variant === 'already';
  const couponCode = survey.couponCode || null;
  // The owner's own wording only. No invented offer: the old fallback
  // ("10% indirim · Sonraki ziyaretinde") promised a discount the business
  // never made. A bare code shows as just the code.
  const couponLabel = survey.couponLabel?.trim() || null;
  const thankYou = survey.thankYouMessage;
  // Real reference = last 6 chars of the saved response id (what the owner
  // can look up). Empty when nothing was saved → no reference line at all.
  const responseNo = !isAlready && responseId ? surveyResponseShortId(responseId) : '';

  const copy = (txt: string) => {
    try {
      void navigator.clipboard?.writeText(txt);
    } catch {
      // noop — clipboard might be unavailable on some iOS PWA contexts
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div
      className="anim-fade relative flex flex-1 flex-col overflow-hidden"
      style={{ background: '#0A0A0A', color: '#fff' }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 360,
          height: 360,
          borderRadius: 999,
          background: accent.fill,
          opacity: 0.18,
          filter: 'blur(90px)',
          pointerEvents: 'none',
        }}
      />

      {/* Confetti — a fresh save only, not the "already answered" state */}
      <div
        aria-hidden
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {!isAlready && Array.from({ length: 14 }).map((_, i) => {
          const angle = (Math.PI * 2 * i) / 14;
          const r = 80 + (i % 3) * 30;
          return (
            <span
              key={i}
              style={{
                position: 'absolute',
                top: '32%',
                left: '50%',
                width: 8,
                height: 8,
                borderRadius: i % 2 ? 999 : 2,
                background: i % 3 === 0 ? '#FFF' : accent.fill,
                ['--tx' as string]: `${Math.cos(angle) * r}px`,
                ['--ty' as string]: `${Math.sin(angle) * r}px`,
                animation: `bzConfettiPop 1100ms cubic-bezier(.2,.6,.3,1) ${i * 35}ms both`,
                opacity: 0.85,
              } as React.CSSProperties}
            />
          );
        })}
      </div>

      <div
        className="relative text-center"
        style={{
          padding: 'calc(60px + env(safe-area-inset-top, 0px)) 22px 0',
        }}
      >
        <div
          className="mx-auto flex items-center justify-center"
          style={{
            width: 88,
            height: 88,
            borderRadius: 999,
            marginBottom: 26,
            background: accent.fill,
            color: accent.text,
            animation:
              'bzSurveyPop 460ms cubic-bezier(.2,.65,.3,1.2) both, bzSurveyGlow 2.2s ease-out 460ms infinite',
            boxShadow: `0 16px 40px -12px ${accent.fill}`,
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 12l5 5L20 7"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div
          className="bz-survey-eyebrow mb-2.5"
          style={{ color: accent.fill }}
        >
          TEŞEKKÜRLER
        </div>
        <h2
          className="bz-survey-head"
          style={{
            margin: 0,
            fontSize: 30,
            color: '#fff',
          }}
        >
          {isAlready
            ? 'Daha önce yanıt vermişsin'
            : thankYou || 'Yanıtın bizi gerçekten mutlu etti.'}
        </h2>
        <p
          style={{
            margin: '14px auto 0',
            maxWidth: 320,
            fontSize: 14,
            lineHeight: 1.5,
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          {isAlready ? (
            'Bu cihazdan bu ankete zaten yanıt gönderildi. Teşekkürler!'
          ) : (
            <>
              {brand} ekibi mesajını birazdan görecek.
              {responseNo && (
                <>
                  {' '}
                  <span>
                    Yanıt no:{' '}
                    <span className="bz-survey-mono" style={{ color: '#fff' }}>
                      {responseNo}
                    </span>
                  </span>
                </>
              )}
            </>
          )}
        </p>
      </div>

      {couponCode && (
        <div className="relative" style={{ padding: '32px 22px 0' }}>
          <div
            className="relative overflow-hidden rounded-2xl border-dashed"
            style={{
              padding: '20px 18px 18px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px dashed rgba(255,255,255,0.18)',
            }}
          >
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: '50%',
                left: -10,
                width: 20,
                height: 20,
                borderRadius: 999,
                transform: 'translateY(-50%)',
                background: '#0A0A0A',
              }}
            />
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: '50%',
                right: -10,
                width: 20,
                height: 20,
                borderRadius: 999,
                transform: 'translateY(-50%)',
                background: '#0A0A0A',
              }}
            />
            <div
              className="bz-survey-eyebrow mb-2"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              {couponLabel ? 'SANA ÖZEL KUPON' : 'KUPONUN'}
            </div>
            <div className="flex items-center justify-between gap-3">
              {/* Owner's own wording only — no label, no invented offer text. */}
              {couponLabel && (
                <div
                  className="bz-survey-head"
                  style={{
                    fontSize: 24,
                    color: '#fff',
                  }}
                >
                  {couponLabel}
                </div>
              )}
              <button
                type="button"
                onClick={() => copy(couponCode)}
                className="bz-survey-tap inline-flex items-center justify-center gap-2"
                style={{
                  padding: '10px 14px',
                  minHeight: 44,
                  // Bare code: the button IS the card content — full width.
                  ...(couponLabel ? null : { width: '100%' }),
                  borderRadius: 12,
                  border: 'none',
                  cursor: 'pointer',
                  background: copied ? '#30A46C' : accent.fill,
                  color: copied ? '#fff' : accent.text,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  fontSize: 13,
                  letterSpacing: '0.06em',
                }}
                aria-label="Kupon kodunu kopyala"
              >
                {copied ? '✓ KOPYALANDI' : couponCode}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1" />

      <div
        className="relative flex flex-col gap-2"
        style={{
          padding: '16px 22px calc(44px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <p
          className="bz-survey-mono"
          style={{
            margin: '6px 0 0',
            textAlign: 'center',
            fontSize: 11,
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.04em',
          }}
        >
          BUAZE · QR FEEDBACK
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Question input — 5 supported types, design-faithful renderers
// ─────────────────────────────────────────────────────────────

function QuestionInput({
  q,
  value,
  onChange,
  palette,
}: {
  q: Question;
  value: AnswerValue | undefined;
  onChange: (patch: AnswerValue) => void;
  palette: ResolvedSurveyAccent;
}) {
  if (q.type === 'rating') {
    return <QStar value={value?.numberValue ?? null} onChange={(v) => onChange({ numberValue: v })} accent={palette.onLight.fill} />;
  }
  if (q.type === 'nps') {
    return <QNps value={value?.numberValue ?? null} onChange={(v) => onChange({ numberValue: v })} accent={palette.onLight.fill} />;
  }
  if (q.type === 'short_text') {
    return (
      <input
        className="bz-survey-field"
        type="text"
        value={value?.textValue || ''}
        onChange={(e) => onChange({ textValue: e.target.value.slice(0, 200) })}
        placeholder="Yazmaya başla…"
        maxLength={200}
        enterKeyHint="next"
        autoCapitalize="sentences"
      />
    );
  }
  if (q.type === 'long_text') {
    const max = 2000;
    return (
      <div>
        <textarea
          className="bz-survey-field"
          rows={5}
          value={value?.textValue || ''}
          onChange={(e) => onChange({ textValue: e.target.value.slice(0, max) })}
          placeholder="Yaşadığın deneyimi birkaç cümleyle anlat…"
          maxLength={max}
          style={{ resize: 'none', minHeight: 140 }}
          autoCapitalize="sentences"
        />
        <div
          className="bz-survey-eyebrow text-right"
          style={{ marginTop: 6, color: '#A3A29C' }}
        >
          {(value?.textValue || '').length} / {max}
        </div>
      </div>
    );
  }
  if (q.type === 'multiple_choice') {
    return (
      <QRadio
        options={q.options || []}
        value={value?.optionValue ?? null}
        onChange={(v) => onChange({ optionValue: v })}
        accent={palette.onDark}
      />
    );
  }
  return null;
}

function QStar({
  value,
  onChange,
  accent,
}: {
  value: number | null;
  onChange: (v: number) => void;
  accent: string;
}) {
  const [hover, setHover] = useState(0);
  const v = hover || value || 0;
  const labels = ['Çok kötüydü', 'İdare ederdi', 'Ortalama', 'Güzeldi', 'Mükemmel!'];
  return (
    <div>
      <div
        className="flex justify-between"
        style={{ gap: 4, padding: '20px 0 14px' }}
      >
        {[1, 2, 3, 4, 5].map((s) => {
          const active = s <= v;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${s} yıldız`}
              className="bz-survey-tap flex items-center justify-center"
              style={{
                width: 56,
                height: 56,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: 0,
                transform: active ? 'scale(1.06)' : 'scale(1)',
              }}
            >
              <svg width="48" height="48" viewBox="0 0 24 24">
                <path
                  d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3z"
                  fill={active ? accent : 'rgba(10,10,10,0.06)'}
                  stroke={active ? accent : 'rgba(10,10,10,0.12)'}
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          );
        })}
      </div>
      <div
        className="text-center"
        style={{ minHeight: 30 }}
        aria-live="polite"
      >
        {v > 0 ? (
          <span
            key={v}
            className="bz-survey-head anim-fade"
            style={{ fontSize: 18, color: '#0A0A0A' }}
          >
            {labels[v - 1]}
          </span>
        ) : (
          <span
            className="bz-survey-head"
            style={{ fontSize: 14, color: '#A3A29C' }}
          >
            ← seçim yap →
          </span>
        )}
      </div>
    </div>
  );
}

function QNps({
  value,
  onChange,
  accent,
}: {
  value: number | null;
  onChange: (v: number) => void;
  accent: string;
}) {
  const tone = (n: number) =>
    n <= 6 ? '#E5484D' : n <= 8 ? '#F5A524' : '#30A46C';
  return (
    <div>
      <div
        className="grid"
        style={{ gridTemplateColumns: 'repeat(11, 1fr)', gap: 3 }}
      >
        {Array.from({ length: 11 }, (_, n) => n).map((n) => {
          const active = value === n;
          const inRange = value !== null && n <= value;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-pressed={active}
              className="bz-survey-tap flex items-center justify-center"
              style={{
                aspectRatio: '1 / 1',
                border:
                  '1.5px solid ' +
                  (active ? '#0A0A0A' : inRange ? accent : '#E5E3DC'),
                background: active ? '#0A0A0A' : inRange ? accent + '33' : '#fff',
                color: active ? '#fff' : '#0A0A0A',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 13,
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                padding: 0,
                boxShadow: active ? '0 6px 20px -8px rgba(0,0,0,0.4)' : 'none',
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div
        className="flex justify-between"
        style={{
          marginTop: 10,
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.08em',
          color: '#A3A29C',
          textTransform: 'uppercase',
        }}
      >
        <span>Hiç önermem</span>
        <span>Kesinlikle</span>
      </div>
      {value !== null && (
        <div
          className="anim-fade flex items-center gap-2.5"
          style={{
            marginTop: 18,
            padding: '12px 14px',
            borderRadius: 14,
            background: tone(value) + '14',
            border: '1px solid ' + tone(value) + '40',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: tone(value),
              boxShadow: `0 0 10px ${tone(value)}`,
            }}
          />
          <span
            className="bz-survey-head"
            style={{ fontSize: 16, color: '#0A0A0A' }}
          >
            {value <= 6 ? 'Eleştirmen' : value <= 8 ? 'Tarafsız' : 'Destekçi'}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: '#6B6B66',
              letterSpacing: '0.06em',
              marginLeft: 'auto',
              textTransform: 'uppercase',
            }}
          >
            {value}/10
          </span>
        </div>
      )}
    </div>
  );
}

function QRadio({
  options,
  value,
  onChange,
  accent,
}: {
  options: string[];
  value: string | null;
  onChange: (v: string) => void;
  /** The selected option is painted dark (#0A0A0A), so its indicator uses the dark-surface pair. */
  accent: AccentPair;
}) {
  return (
    <div className="flex flex-col" style={{ gap: 10 }}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            aria-pressed={active}
            className="bz-survey-tap flex items-center"
            style={{
              gap: 14,
              padding: '14px 16px',
              border: '1.5px solid ' + (active ? '#0A0A0A' : '#E5E3DC'),
              background: active ? '#0A0A0A' : '#fff',
              color: active ? '#fff' : '#0A0A0A',
              borderRadius: 16,
              fontSize: 15,
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left',
              boxShadow: active ? '0 8px 22px -10px rgba(0,0,0,0.35)' : 'none',
            }}
          >
            <span style={{ flex: 1 }}>{opt}</span>
            <span
              className="flex shrink-0 items-center justify-center"
              style={{
                width: 22,
                height: 22,
                borderRadius: 999,
                border: '1.5px solid ' + (active ? accent.fill : '#D4D2CC'),
                background: active ? accent.fill : 'transparent',
              }}
              aria-hidden
            >
              {active && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12l5 5L20 7"
                    stroke={accent.text}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
