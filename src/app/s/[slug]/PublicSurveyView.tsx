'use client';

// Stage 99 — Public survey UI (CLAUDE.md §42).
// Faithful port of the Claude Design "Buaze Anket" handoff
// (bundle a/nFAGytnqZwW98Ldy0d5Lig). Customer-facing mobile-first page
// reached via QR scan at /s/[slug].
//
// Three stages (purple + white design, CLAUDE.md §63 palette):
//   1. intro  — purple hero (#111110, white text), brand pill + table label
//               (only when ?table= is present), "type · minutes" line,
//               bold h1, sub copy, "Neler soracağız" numbered list (first 4
//               + overflow), pill CTA in the owner's accent (heroAccentPair),
//               privacy line.
//   2. question — white surface with TopBar (back + brand + masa) + progress
//                 bar ("n / N" + accent fill), optional chip, title, the
//                 question itself, sticky FooterBar (accent pill CTA +
//                 optional "Bu soruyu atla").
//   3. (optional) contact — same TopBar + white surface. Ad / E-posta /
//                  Telefon fields with labels above, KVKK consent (required),
//                  marketing consent (optional, opt-in, unchecked).
//   4. thanks — purple hero with confetti burst, accent success circle,
//               h2, response no (the last 6 characters of the REAL response
//               id — never made up), optional coupon card (dashed border +
//               scalloped cutouts + copy button).
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
// Flow polish (surveys UI phase):
//   - One-question surveys skip the intro (the first screen is the question).
//   - Rating / recommend-score / multiple-choice questions move on by
//     themselves ~380 ms after a POINTER or TOUCH selection (`event.detail > 0`).
//     Keyboard and screen-reader activation (`detail === 0`) never advance on
//     their own (WCAG 3.2.2) — they use "Devam et". Only the first time a
//     question is answered; going back and changing it does not advance.
//   - The recommend score is a 6-column grid of >= 44 px cells and never labels
//     the customer ("Eleştirmen" is internal jargon).
//   - `preview` renders THIS component inside the editor's phone frame with no
//     side effects: no network, no localStorage session id, no URL rewrite.
//
// All KVKK + IDOR + rate limit + sessionId discipline preserved.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { getOrCreateSessionId } from '@/lib/analytics-session';
import {
  CONTACT_EMAIL_MAX,
  CONTACT_PHONE_MAX,
  estimateSurveySeconds,
  formatSurveyDuration,
  isValidContactEmail,
  surveyResponseShortId,
} from '@/lib/surveys';
import {
  resolveSurveyAccent,
  type AccentPair,
  type ResolvedSurveyAccent,
} from '@/lib/survey-accent';
import { contrastRatio } from '@/lib/qr-colors';

// Buaze chrome for the public survey: purple hero (intro / thanks) + white
// question screens. The owner's accent (resolveSurveyAccent) still paints the
// CTAs, stars, progress and selected states — only Buaze's own surfaces,
// labels and neutrals use these.
const SURVEY_HERO = '#111110';
const SURVEY_HERO_DEEP = '#000000';
const SURVEY_TEXT = '#111110';
const SURVEY_TEXT_2 = '#737373';
const SURVEY_LINE = '#EBEBEB';
const SURVEY_CANVAS = '#F6F6F6';
const SURVEY_LAVENDER = '#F1FDF3';
const SURVEY_LAVENDER_LINE = '#CDEFD6';
const SURVEY_ERROR_TEXT = '#B42318';
const SURVEY_ERROR = '#D92D20';

/**
 * Fill + text for an accent painted on the purple hero. The accent stays
 * while it keeps >= 3:1 against the hero (non-text contrast); otherwise the
 * fill turns white with purple text (7.6:1). A kept accent is always much
 * lighter than the hero, so its text is whichever of ink/white reads better.
 */
function heroAccentPair(accent: string): AccentPair {
  if (contrastRatio(accent, SURVEY_HERO) < 3) {
    return { fill: '#FFFFFF', text: SURVEY_HERO };
  }
  const text =
    contrastRatio(SURVEY_TEXT, accent) >= contrastRatio('#FFFFFF', accent)
      ? SURVEY_TEXT
      : '#FFFFFF';
  return { fill: accent, text };
}

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

/** Survey shape this view renders (the public page and the editor preview both pass it). */
export type PublicSurveyData = Survey;
export type PublicSurveyStage = Stage;
/**
 * Preview mode. Present = render without side effects (see the file header).
 * `stage` / `stepIdx` let the editor jump to a screen; omitted = normal flow.
 */
export interface PublicSurveyPreview {
  stage?: Stage;
  stepIdx?: number;
}

/** Delay between a pointer selection and the next question; 0 turns auto-advance off. */
const AUTO_ADVANCE_MS = 380;

// The request never got an answer (offline, dropped): the connection is the
// likely cause, so this is the only place that says so.
const NETWORK_SUBMIT_ERROR = 'Gönderilemedi. Bağlantını kontrol edip tekrar dene.';
// The server answered but did not save (5xx, a rejected form we have no
// specific words for): blaming the connection would send the customer on a
// wild goose chase.
const REJECTED_SUBMIT_ERROR = 'Gönderilemedi. Biraz sonra tekrar dene.';
const EMAIL_ERROR = 'Geçerli bir e-posta adresi gir. Örnek: ad@ornek.com';
// Server messages that are written for the customer (Turkish, no jargon).
const CUSTOMER_FACING_ERRORS = new Set(['rate_limit', 'kvkk_required']);

class SubmitError extends Error {
  constructor(
    message: string,
    /** Set when the failure belongs to one form field, not the whole form. */
    readonly field?: 'email',
  ) {
    super(message);
  }
}

/** Does a 400 `validation_error` body name this field? (`issues[].path`) */
function issuesMention(issues: unknown, field: string): boolean {
  return (
    Array.isArray(issues) &&
    issues.some(
      (i) =>
        typeof i === 'object' &&
        i !== null &&
        typeof (i as { path?: unknown }).path === 'string' &&
        ((i as { path: string }).path === field ||
          (i as { path: string }).path.startsWith(`${field}.`)),
    )
  );
}

const SHORT_TYPE_LABEL: Record<QuestionType, string> = {
  rating: 'Yıldız puanı',
  nps: 'Tavsiye skoru',
  short_text: 'Kısa cevap',
  long_text: 'Açık not',
  multiple_choice: 'Tek seçim',
};

// KVKK / Açık Rıza / Ticari İleti links sit INSIDE a ConsentRow, which is
// white (unchecked) or lavender #F1FDF3 (checked). Purple reads on both
// (7.6:1 on white, 6.2:1 on lavender).
const LEGAL_LINK_STYLE: React.CSSProperties = {
  color: SURVEY_HERO,
  fontWeight: 500,
  textDecoration: 'underline',
  textUnderlineOffset: 2,
};

// Pull `?table=` once on mount so the brand eyebrow can show "MASA X".
// `null` when the link carries no (valid) table — callers then render no
// "MASA" text at all (hotels, clinics … have no tables; "MASA —" is noise).
function useTableNumber(enabled: boolean): string | null {
  const [table, setTable] = useState<string | null>(null);
  useEffect(() => {
    // Preview mode must not read or rewrite the dashboard's own URL.
    if (!enabled || typeof window === 'undefined') return;
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
  }, [enabled]);
  return table;
}

/** The customer actually gave a value for this question (required or not). */
function hasAnswerValue(q: Question, val: AnswerValue | undefined): boolean {
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

function isAnswered(q: Question, val: AnswerValue | undefined): boolean {
  return !q.required || hasAnswerValue(q, val);
}

export default function PublicSurveyView({
  survey,
  preview,
}: {
  survey: Survey;
  preview?: PublicSurveyPreview;
}) {
  const isPreview = preview !== undefined;
  // Contrast-protected fill + text pairs for the dark (intro/thanks) and
  // light (question/contact) surfaces (lib/survey-accent.ts); the purple
  // hero gets its own pair below.
  const palette = useMemo(
    () => resolveSurveyAccent(survey.accentColor || survey.restaurant.primaryColor),
    [survey.accentColor, survey.restaurant.primaryColor],
  );
  // Accent pair for the purple intro / thank-you hero.
  const heroAccent = useMemo(() => heroAccentPair(palette.accent), [palette.accent]);
  const brand = survey.restaurant.name;
  const table = useTableNumber(!isPreview);

  const totalSteps = survey.questions.length;
  // The survey "type" is derived from the question count on the server, so the
  // count is the source of truth here too (legacy rows keep a stale `type`).
  const isMulti = totalSteps > 1;
  // A single question needs no intro screen — the first thing the customer sees
  // is the question itself.
  const skipIntro = totalSteps === 1;

  const [stage, setStage] = useState<Stage>(preview?.stage ?? (skipIntro ? 'question' : 'intro'));
  const [stepIdx, setStepIdx] = useState(preview?.stepIdx ?? 0);
  const [direction, setDirection] = useState<'fwd' | 'back'>('fwd');
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});

  // The editor can steer the preview to a screen. Normal customers never pass it.
  const previewStage = preview?.stage;
  const previewStep = preview?.stepIdx;
  useEffect(() => {
    if (!isPreview) return;
    if (previewStage) setStage(previewStage);
    if (typeof previewStep === 'number') setStepIdx(Math.max(0, previewStep));
  }, [isPreview, previewStage, previewStep]);

  // Contact form state — populated only when stage === 'contact'.
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [kvkk, setKvkk] = useState(true);
  const [marketing, setMarketing] = useState(false);
  // Inline e-mail problem (shown under the field). `emailFocusSignal` bumps on
  // every rejected submit so the field takes focus again even if the message
  // did not change.
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailFocusSignal, setEmailFocusSignal] = useState(0);

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

  // The preview can be steered past the last question (or the editor can delete
  // questions under it) — never index outside the list.
  const activeIdx = Math.min(stepIdx, Math.max(totalSteps - 1, 0));
  const currentQuestion = survey.questions[activeIdx];
  const currentValue = currentQuestion ? answers[currentQuestion.id] : undefined;

  const setAnswer = useCallback((qid: string, patch: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [qid]: { ...prev[qid], ...patch } }));
  }, []);

  // ── Auto-advance ────────────────────────────────────────────────────────
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Questions the customer has already moved past. Going back to one of them
  // and changing the answer must NOT push them forward again.
  const advancedFromRef = useRef<Set<string>>(new Set());
  // Drives the (visually hidden) "moving on" announcement for screen readers.
  const [advancing, setAdvancing] = useState(false);

  const clearAutoTimer = useCallback(() => {
    if (autoTimerRef.current !== null) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    setAdvancing(false);
  }, []);
  useEffect(() => clearAutoTimer, [clearAutoTimer]);

  const goForward = useCallback(() => {
    clearAutoTimer();
    if (currentQuestion) advancedFromRef.current.add(currentQuestion.id);
    setDirection('fwd');
    if (activeIdx + 1 < totalSteps) {
      setStepIdx(activeIdx + 1);
      return;
    }
    // Stage B — contact stage is ALWAYS reached now: it carries the
    // mandatory KVKK consent + optional marketing consent block tied to
    // Buaze-managed legal pages. Contact fields (e-mail / phone) are
    // hidden when `collectContact: false` but the consent block stays.
    setStage('contact');
  }, [activeIdx, totalSteps, currentQuestion, clearAutoTimer]);

  // The timer fires a later render's goForward, not the one it was created in.
  const goForwardRef = useRef(goForward);
  useEffect(() => {
    goForwardRef.current = goForward;
  }, [goForward]);

  /**
   * Called by the rating / recommend-score / choice inputs. `viaPointer` is
   * `event.detail > 0` (mouse or touch); keyboard and screen-reader
   * activation report 0 and never advance on their own.
   */
  const handlePick = useCallback(
    (patch: AnswerValue, viaPointer: boolean) => {
      if (!currentQuestion) return;
      setAnswer(currentQuestion.id, patch);
      const firstTime = !advancedFromRef.current.has(currentQuestion.id);
      if (!viaPointer || !firstTime || AUTO_ADVANCE_MS <= 0) {
        // A keyboard change inside the window cancels a pending pointer advance.
        clearAutoTimer();
        return;
      }
      // A new selection restarts the countdown.
      if (autoTimerRef.current !== null) clearTimeout(autoTimerRef.current);
      setAdvancing(true);
      autoTimerRef.current = setTimeout(() => {
        autoTimerRef.current = null;
        setAdvancing(false);
        goForwardRef.current();
      }, AUTO_ADVANCE_MS);
    },
    [currentQuestion, setAnswer, clearAutoTimer],
  );

  const goBack = useCallback(() => {
    clearAutoTimer();
    setDirection('back');
    if (stage === 'contact') {
      setStage('question');
      return;
    }
    if (activeIdx > 0) {
      setStepIdx(activeIdx - 1);
      return;
    }
    setStage('intro');
  }, [stage, activeIdx, clearAutoTimer]);

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
      // The e-mail is optional, but a typo must be fixed here: the server
      // rejects it and a retry could never succeed. (Same rule as the server.)
      if (
        !skipContactValidation &&
        survey.collectContact &&
        contactEmail.trim() &&
        !isValidContactEmail(contactEmail)
      ) {
        setErrorMsg(null);
        setEmailError(EMAIL_ERROR);
        setEmailFocusSignal((n) => n + 1);
        return;
      }
      if (isPreview) {
        // The preview shows the thank-you screen but sends nothing, stores no
        // session id and has no response to reference.
        setResponseId(null);
        setAlreadySubmitted(false);
        setSubmitted(true);
        setStage('thanks');
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
          const j = (await res.json().catch(() => null)) as {
            error?: unknown;
            message?: unknown;
            issues?: unknown;
          } | null;
          // The server's e-mail check is the only form rule the customer can
          // fix; show it at the field, in plain words.
          if (j?.error === 'validation_error' && issuesMention(j.issues, 'email')) {
            throw new SubmitError(EMAIL_ERROR, 'email');
          }
          // Only messages written for customers are shown as-is; raw codes and
          // the English validation text never reach the screen.
          const customerFacing =
            typeof j?.error === 'string' &&
            CUSTOMER_FACING_ERRORS.has(j.error) &&
            typeof j.message === 'string' &&
            j.message.trim();
          throw new SubmitError(customerFacing ? (j!.message as string) : REJECTED_SUBMIT_ERROR);
        }
        const saved = (await res.json().catch(() => null)) as { responseId?: unknown } | null;
        setResponseId(
          typeof saved?.responseId === 'string' && saved.responseId ? saved.responseId : null,
        );
        setAlreadySubmitted(false);
        setSubmitted(true);
        setStage('thanks');
      } catch (err) {
        if (err instanceof SubmitError && err.field === 'email') {
          setErrorMsg(null);
          setEmailError(err.message);
          setEmailFocusSignal((n) => n + 1);
        } else {
          setErrorMsg(err instanceof SubmitError ? err.message : NETWORK_SUBMIT_ERROR);
        }
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
      isPreview,
      survey.slug,
      survey.questions,
      survey.collectContact,
      answers,
    ],
  );

  // Back is offered from the second question on and from the contact screen.
  const canBack = stage === 'contact' || (stage === 'question' && activeIdx > 0);
  // A survey whose questions are ALL optional could otherwise be sent with
  // nothing filled in. On the last question, with nothing answered anywhere,
  // "continue"/"skip" stay closed until the customer answers something (the
  // Back button still lets them answer an earlier question instead).
  const hasAnyAnswer = survey.questions.some((q) => hasAnswerValue(q, answers[q.id]));
  const needsOneAnswer = stage === 'question' && activeIdx + 1 >= totalSteps && !hasAnyAnswer;
  const canContinue =
    currentQuestion && !needsOneAnswer ? isAnswered(currentQuestion, currentValue) : false;

  // One-question surveys: the survey title sits above the question as a small
  // grey line — unless it only repeats the question.
  const questionTitleLine =
    skipIntro &&
    currentQuestion &&
    survey.title.trim() &&
    survey.title.trim() !== currentQuestion.text.trim()
      ? survey.title.trim()
      : null;

  // ─────────────────────────────────────────────────────────────
  // Stage renderers
  // ─────────────────────────────────────────────────────────────

  if (stage === 'intro') {
    return (
      <SurveyFrame mode="dark" preview={isPreview}>
        <IntroScreen
          accent={heroAccent}
          brand={brand}
          table={table}
          survey={survey}
          onStart={start}
          compact={isPreview}
        />
      </SurveyFrame>
    );
  }

  if (stage === 'thanks' || submitted) {
    return (
      <SurveyFrame mode="dark" preview={isPreview}>
        <ThanksScreen
          accent={heroAccent}
          brand={brand}
          survey={survey}
          variant={alreadySubmitted ? 'already' : 'done'}
          responseId={responseId}
          compact={isPreview}
        />
      </SurveyFrame>
    );
  }

  return (
    <SurveyFrame mode="light" preview={isPreview}>
      <div className="flex flex-1 flex-col bg-white">
        <TopBar
          brand={brand}
          table={table}
          onBack={goBack}
          canBack={canBack}
          compact={isPreview}
        />
        {isMulti && stage === 'question' && (
          <ProgressBar current={activeIdx + 1} total={totalSteps} accent={palette.onLight.fill} />
        )}

        <div className="flex flex-1 flex-col overflow-auto">
          {stage === 'question' && currentQuestion && (
            <QuestionScreen
              key={`${currentQuestion.id}-${direction}`}
              q={currentQuestion}
              value={currentValue}
              onChange={(patch) => setAnswer(currentQuestion.id, patch)}
              onPick={handlePick}
              palette={palette}
              direction={direction}
              titleLine={questionTitleLine}
              preview={isPreview}
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
              setEmail={(v) => {
                setContactEmail(v);
                // Editing the address clears its message; the next submit re-checks.
                if (emailError) setEmailError(null);
              }}
              emailError={emailError}
              emailFocusSignal={emailFocusSignal}
              phone={contactPhone}
              setPhone={setContactPhone}
              kvkk={kvkk}
              setKvkk={setKvkk}
              marketing={marketing}
              setMarketing={setMarketing}
              onSubmit={() => void doSubmit()}
              submitting={submitting}
              error={errorMsg}
              compact={isPreview}
            />
          )}
        </div>

        {/* Pointer selections move on by themselves; tell screen readers. */}
        <span className="sr-only" role="status" aria-live="polite">
          {advancing ? 'Sonraki soruya geçiliyor' : ''}
        </span>

        {stage === 'question' && (
          <FooterBar
            canContinue={canContinue}
            onContinue={goForward}
            onSkip={() => {
              if (currentQuestion) setAnswer(currentQuestion.id, {});
              goForward();
            }}
            accent={palette.onLight}
            optional={!currentQuestion?.required && !needsOneAnswer}
            hint={needsOneAnswer ? 'Göndermeden önce en az bir soruyu yanıtla.' : null}
            compact={isPreview}
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
  preview,
  children,
}: {
  mode: 'dark' | 'light';
  /** Editor / detail-page preview: fill the parent phone frame, no page chrome. */
  preview?: boolean;
  children: React.ReactNode;
}) {
  // Preview: the phone frame (360x640) belongs to the editor. The stage/frame
  // classes below size themselves from the VIEWPORT (min-height 780, margins,
  // 440 max-width) and would overflow it, so the preview uses a plain
  // media-query-free column instead (survey.css `.bz-survey-preview`).
  if (preview) {
    return (
      <div
        className="bz-survey-preview"
        style={{ background: mode === 'dark' ? SURVEY_HERO : '#fff' }}
      >
        {children}
      </div>
    );
  }
  // Mobile (≤520px) — the stage takes the screen's own colour (purple hero
  // or white) so overscroll never shows a seam. Desktop (>520px) — the
  // rounded 440px card sits on the #F6F6F6 canvas (survey.css).
  const surface = mode === 'dark' ? SURVEY_HERO : '#FFFFFF';
  return (
    <main
      className="bz-survey-stage flex min-h-dvh items-center justify-center"
      style={
        {
          fontFamily: 'var(--font-body)',
          '--bz-survey-stage-mobile': surface,
        } as React.CSSProperties
      }
    >
      <div className="bz-survey-frame" style={{ background: surface }}>
        {children}
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────
// Intro screen — purple hero
// ─────────────────────────────────────────────────────────────

function IntroScreen({
  accent,
  brand,
  table,
  survey,
  onStart,
  compact,
}: {
  /** Contrast-protected fill + text for the purple hero (heroAccentPair). */
  accent: AccentPair;
  brand: string;
  table: string | null;
  survey: Survey;
  onStart: () => void;
  /** Preview: no safe-area insets, tighter top/bottom padding. */
  compact?: boolean;
}) {
  const dark = true; // design default
  // The same function the editor and the template cards use, so the owner
  // never reads "~39 sn" while the customer reads "~45 sn".
  const minutes = formatSurveyDuration(estimateSurveySeconds(survey.questions.length), 'tr');

  const previewSteps = survey.questions.slice(0, 4);
  const overflow = Math.max(0, survey.questions.length - 4);
  const eyebrow =
    survey.questions.length === 1
      ? 'Tek soru'
      : survey.questions.length <= 3
      ? 'Kısa anket'
      : 'Anket';

  return (
    <div
      className="bz-survey-scroll bz-survey-on-hero anim-fade relative flex flex-1 flex-col overflow-hidden"
      style={{ background: SURVEY_HERO, color: '#fff' }}
    >
      {/* Soft light + depth — decorative */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -140,
          right: -120,
          width: 340,
          height: 340,
          borderRadius: 999,
          background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: -120,
          left: -100,
          width: 300,
          height: 300,
          borderRadius: 999,
          background: `radial-gradient(circle, ${SURVEY_HERO_DEEP} 0%, rgba(59,31,143,0) 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Brand row */}
      <div
        className="relative"
        style={{
          padding: compact ? '36px 22px 0' : 'calc(60px + env(safe-area-inset-top, 0px)) 22px 0',
        }}
      >
        <div className="mb-7 flex items-center justify-between gap-3">
          <div
            className="inline-flex min-w-0 items-center gap-2 rounded-full"
            style={{
              padding: '7px 14px 7px 8px',
              background: 'rgba(255,255,255,0.14)',
            }}
          >
            <span
              aria-hidden
              className="flex shrink-0 items-center justify-center"
              style={{
                width: 24,
                height: 24,
                borderRadius: 999,
                background: '#fff',
                color: SURVEY_HERO,
                fontSize: 12,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {brand.trim().charAt(0).toUpperCase()}
            </span>
            <span className="bz-survey-eyebrow min-w-0 truncate" style={{ color: '#fff' }}>
              {brand}
            </span>
          </div>
          {/* Only when the QR link carries ?table= — hotels, clinics … have
              no tables, and "Masa —" was meaningless noise. */}
          {table && (
            <span
              className="bz-survey-eyebrow shrink-0"
              style={{ color: 'rgba(255,255,255,0.85)' }}
            >
              Masa {table}
            </span>
          )}
        </div>

        <div style={{ padding: '8px 0 12px' }}>
          <div
            className="bz-survey-eyebrow mb-3"
            style={{ color: 'rgba(255,255,255,0.85)' }}
          >
            {eyebrow} · {minutes}
          </div>
          <h1
            className="bz-survey-head"
            style={{
              margin: 0,
              fontSize: 34,
              color: dark ? '#fff' : SURVEY_TEXT,
            }}
          >
            {survey.title.trim() || (compact ? 'Anket başlığı' : survey.title)}
          </h1>
          {survey.description && (
            <p
              style={{
                marginTop: 14,
                marginBottom: 0,
                fontSize: 15,
                lineHeight: 1.55,
                color: 'rgba(255,255,255,0.85)',
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
            style={{ color: 'rgba(255,255,255,0.85)' }}
          >
            Neler soracağız
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {previewSteps.map((q, i) => (
              <li
                key={q.id}
                className="mb-2 flex items-center gap-3 rounded-2xl"
                style={{
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.1)',
                }}
              >
                <span
                  className="flex shrink-0 items-center justify-center"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    background: accent.fill,
                    color: accent.text,
                    fontSize: 12,
                    fontWeight: 700,
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    lineHeight: 1.4,
                    color: '#fff',
                  }}
                >
                  {q.text.trim() || SHORT_TYPE_LABEL[q.type]}
                </span>
              </li>
            ))}
            {overflow > 0 && (
              <li
                className="bz-survey-mono"
                style={{
                  padding: '6px 14px',
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.85)',
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
          padding: compact
            ? '20px 22px 24px'
            : '20px 22px calc(44px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <button
          type="button"
          onClick={onStart}
          className="bz-survey-tap flex w-full items-center justify-center gap-2.5"
          style={{
            minHeight: 56,
            padding: '16px 20px',
            border: 'none',
            borderRadius: 999,
            background: accent.fill,
            color: accent.text,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
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
          style={{
            margin: '12px 0 0',
            textAlign: 'center',
            fontSize: 12.5,
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          Yanıtların yalnızca işletmeye iletilir
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
  compact,
}: {
  brand: string;
  table: string | null;
  onBack: () => void;
  canBack: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2.5"
      style={{
        padding: compact ? '18px 18px 4px' : 'calc(28px + env(safe-area-inset-top, 0px)) 18px 4px',
      }}
    >
      <button
        type="button"
        onClick={onBack}
        disabled={!canBack}
        aria-label="Geri"
        className="bz-survey-tap flex shrink-0 items-center justify-center"
        style={{
          width: 44,
          height: 44,
          borderRadius: 999,
          border: 'none',
          background: SURVEY_CANVAS,
          color: SURVEY_TEXT,
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
        className="min-w-0 flex-1 text-center"
        style={{ lineHeight: 1.2 }}
      >
        {/* .bz-survey-eyebrow is inline-block — without display:block the
            brand and the table text ran together on one line. Two stacked
            lines; the second exists only when the link carries ?table=. */}
        <div
          className="bz-survey-eyebrow truncate"
          style={{ display: 'block', fontSize: 14, color: SURVEY_TEXT }}
        >
          {brand}
        </div>
        {table && (
          <div
            style={{ fontSize: 12, color: SURVEY_TEXT_2, marginTop: 3 }}
          >
            Masa {table}
          </div>
        )}
      </div>
      <div style={{ width: 44, height: 44, flexShrink: 0 }} />
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
    <div style={{ padding: '10px 22px 18px' }}>
      <div className="flex items-center gap-3">
        <span
          style={{
            color: SURVEY_TEXT_2,
            fontSize: 13,
            fontWeight: 500,
            minWidth: 36,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {current} / {total}
        </span>
        <div
          className="flex-1 overflow-hidden"
          style={{
            height: 6,
            borderRadius: 999,
            background: SURVEY_LINE,
          }}
        >
          <div
            className="bz-survey-bar"
            style={{
              height: '100%',
              width: `${pct}%`,
              background: accent,
              borderRadius: 999,
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
  onPick,
  palette,
  direction,
  titleLine,
  preview,
}: {
  q: Question;
  value: AnswerValue | undefined;
  onChange: (patch: AnswerValue) => void;
  /** Selection inputs report whether the click came from a pointer (auto-advance). */
  onPick: (patch: AnswerValue, viaPointer: boolean) => void;
  palette: ResolvedSurveyAccent;
  direction: 'fwd' | 'back';
  /** One-question surveys: the survey title as a small grey line (null = none). */
  titleLine: string | null;
  preview?: boolean;
}) {
  const text = q.text.trim();
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
      {titleLine && (
        <p
          style={{
            margin: '0 0 10px',
            fontSize: 13,
            lineHeight: 1.35,
            color: SURVEY_TEXT_2,
            fontWeight: 500,
          }}
        >
          {titleLine}
        </p>
      )}
      {/* The old "SORU" tag carried no information. Only an optional question
          is marked, so the customer knows they may skip it. */}
      {!q.required && (
        <div className="mb-3">
          <span style={CHIP_STYLE}>İsteğe bağlı</span>
        </div>
      )}
      <h2
        className="bz-survey-head"
        style={{ margin: 0, fontSize: 26, color: SURVEY_TEXT }}
      >
        {text ? (
          q.text
        ) : preview ? (
          <span style={{ color: SURVEY_TEXT_2 }}>Sorunu buraya yaz…</span>
        ) : (
          q.text
        )}
      </h2>
      <div style={{ marginTop: 28 }}>
        <QuestionInput
          q={q}
          value={value}
          onChange={onChange}
          onPick={onPick}
          palette={palette}
        />
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
  hint,
  compact,
}: {
  canContinue: boolean;
  onContinue: () => void;
  onSkip: () => void;
  /** Contrast-protected fill + text for the light (#FFFFFF) surface. */
  accent: AccentPair;
  optional: boolean;
  /** Short reason the button is closed (nothing answered yet). */
  hint?: string | null;
  compact?: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-2.5"
      style={{
        padding: compact
          ? '14px 22px 22px'
          : '14px 22px calc(28px + env(safe-area-inset-bottom, 0px))',
        borderTop: `1px solid ${SURVEY_LINE}`,
        background: '#fff',
      }}
    >
      <button
        type="button"
        onClick={onContinue}
        disabled={!canContinue}
        className="bz-survey-tap flex w-full items-center justify-center gap-2"
        style={{
          minHeight: 54,
          padding: '15px 20px',
          border: 'none',
          borderRadius: 999,
          background: canContinue ? accent.fill : SURVEY_LINE,
          color: canContinue ? accent.text : SURVEY_TEXT_2,
          fontSize: 16,
          fontWeight: 600,
          cursor: canContinue ? 'pointer' : 'default',
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
      {hint && (
        <p
          role="status"
          aria-live="polite"
          style={{ margin: 0, textAlign: 'center', fontSize: 13, lineHeight: 1.45, color: SURVEY_TEXT_2 }}
        >
          {hint}
        </p>
      )}
      {optional && (
        <button
          type="button"
          onClick={onSkip}
          className="bz-survey-tap"
          style={{
            background: 'transparent',
            border: 'none',
            borderRadius: 999,
            color: SURVEY_TEXT_2,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            padding: 6,
            minHeight: 44,
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
  emailError,
  emailFocusSignal,
  phone,
  setPhone,
  kvkk,
  setKvkk,
  marketing,
  setMarketing,
  onSubmit,
  submitting,
  error,
  compact,
}: {
  direction: 'fwd' | 'back';
  palette: ResolvedSurveyAccent;
  collectContact: boolean;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  /** Plain-words problem with the e-mail, shown under the field. */
  emailError: string | null;
  /** Bumps on every rejected submit; the e-mail field takes focus again. */
  emailFocusSignal: number;
  phone: string;
  setPhone: (v: string) => void;
  kvkk: boolean;
  setKvkk: (v: boolean) => void;
  marketing: boolean;
  setMarketing: (v: boolean) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
  compact?: boolean;
}) {
  const valid = kvkk && !submitting;
  // Real <label htmlFor> ↔ input ids for the three contact fields.
  const fieldId = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const emailErrorId = `${fieldId}-email-error`;
  useEffect(() => {
    if (emailFocusSignal > 0) emailRef.current?.focus();
  }, [emailFocusSignal]);
  return (
    <div
      className={direction === 'back' ? 'anim-slideL' : 'anim-slideR'}
      style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
    >
      <div style={{ padding: '6px 22px 0' }}>
        <div className="mb-3">
          <span style={CHIP_STYLE}>
            {collectContact ? 'İletişim · İsteğe bağlı' : 'Onay'}
          </span>
        </div>
        {/* The coupon is not tied to leaving contact details, so the heading
            must not promise it. */}
        <h2
          className="bz-survey-head"
          style={{ margin: 0, fontSize: 26, color: SURVEY_TEXT }}
        >
          {collectContact ? 'Son adım' : 'Yanıtını gönderelim'}
        </h2>
        <p
          style={{
            margin: '10px 0 0',
            fontSize: 14,
            color: SURVEY_TEXT_2,
            lineHeight: 1.5,
          }}
        >
          {collectContact
            ? 'İstersen e-posta veya telefonunu bırak; ekibimiz gerekirse sana dönebilir. Doldurmak zorunda değilsin.'
            : 'Onayını verip anketi tamamlayalım.'}
        </p>

        <div
          style={{
            marginTop: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {collectContact && (
            <>
              <LabelledField label="Ad" htmlFor={`${fieldId}-name`}>
                <input
                  id={`${fieldId}-name`}
                  className="bz-survey-field"
                  placeholder="Adın"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  autoCapitalize="words"
                  enterKeyHint="next"
                />
              </LabelledField>
              <div>
                <LabelledField label="E-posta" htmlFor={`${fieldId}-email`}>
                  <input
                    id={`${fieldId}-email`}
                    ref={emailRef}
                    className="bz-survey-field"
                    type="email"
                    style={emailError ? { borderColor: SURVEY_ERROR } : undefined}
                    placeholder="ornek@mail.com"
                    value={email}
                    maxLength={CONTACT_EMAIL_MAX}
                    aria-invalid={emailError ? true : undefined}
                    aria-describedby={emailError ? emailErrorId : undefined}
                    onChange={(e) => setEmail(e.target.value)}
                    inputMode="email"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    autoComplete="email"
                    enterKeyHint="next"
                  />
                </LabelledField>
              </div>
              {emailError && (
                <p
                  id={emailErrorId}
                  role="alert"
                  className="anim-fade"
                  style={{ margin: '-4px 4px 0', fontSize: 13, lineHeight: 1.4, color: SURVEY_ERROR_TEXT }}
                >
                  {emailError}
                </p>
              )}
              <LabelledField label="Telefon" htmlFor={`${fieldId}-phone`}>
                <input
                  id={`${fieldId}-phone`}
                  className="bz-survey-field"
                  type="tel"
                  placeholder="+90 5xx xxx xx xx"
                  value={phone}
                  maxLength={CONTACT_PHONE_MAX}
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
                {/* inherits the row's ink; opacity keeps ≥ 4.5:1 on both
                    the white and the lavender (checked) row. */}
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
              padding: '12px 14px',
              borderRadius: 16,
              background: '#FEF3F2',
              color: SURVEY_ERROR_TEXT,
              fontSize: 13,
              lineHeight: 1.45,
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
          padding: compact
            ? '14px 22px 22px'
            : '14px 22px calc(22px + env(safe-area-inset-bottom, 0px))',
          borderTop: `1px solid ${SURVEY_LINE}`,
          background: '#fff',
        }}
      >
        <button
          type="button"
          onClick={onSubmit}
          disabled={!valid}
          className="bz-survey-tap flex w-full items-center justify-center gap-2"
          style={{
            minHeight: 54,
            padding: '15px 20px',
            border: 'none',
            borderRadius: 999,
            background: valid ? palette.onLight.fill : SURVEY_LINE,
            color: valid ? palette.onLight.text : SURVEY_TEXT_2,
            fontSize: 16,
            fontWeight: 600,
            cursor: valid ? 'pointer' : 'default',
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

// A real <label htmlFor> above its input (sentence case, ink on white).
function LabelledField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="bz-survey-eyebrow"
        style={{ display: 'block', marginBottom: 8, paddingInline: 4, color: SURVEY_TEXT }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

// Small Buaze label chip ("İsteğe bağlı", "Onay") — purple on lavender, 6.2:1.
const CHIP_STYLE: React.CSSProperties = {
  display: 'inline-block',
  padding: '5px 12px',
  borderRadius: 999,
  background: SURVEY_LAVENDER,
  color: SURVEY_HERO,
  fontSize: 12.5,
  fontWeight: 600,
  lineHeight: 1.3,
};

// Consent rows are Buaze's legal chrome, so they use Buaze purple, not the
// owner's accent: white row → lavender row when checked, purple tick box.
function ConsentRow({
  checked,
  onChange,
  label,
  required,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      className="bz-survey-tap bz-survey-consent flex cursor-pointer items-start gap-3 rounded-2xl border"
      style={{
        padding: '14px 16px',
        borderColor: checked ? SURVEY_LAVENDER_LINE : SURVEY_LINE,
        background: checked ? SURVEY_LAVENDER : '#fff',
        color: SURVEY_TEXT,
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
          borderRadius: 7,
          border: '1.5px solid ' + (checked ? SURVEY_HERO : '#C4C4C4'),
          background: checked ? SURVEY_HERO : '#fff',
          marginTop: 1,
          transition: 'background-color 200ms, border-color 200ms',
        }}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12l5 5L20 7"
              stroke="#fff"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span style={{ fontSize: 13, lineHeight: 1.5, paddingTop: 1 }}>
        {label}
        {required && (
          <span
            style={{ color: checked ? SURVEY_HERO : SURVEY_ERROR, marginLeft: 4 }}
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
// Thanks screen — purple hero with confetti + coupon
// ─────────────────────────────────────────────────────────────

function ThanksScreen({
  accent,
  brand,
  survey,
  variant,
  responseId,
  compact,
}: {
  /** Contrast-protected fill + text for the purple hero (heroAccentPair). */
  accent: AccentPair;
  brand: string;
  survey: Survey;
  /** `done` = the answers were just saved; `already` = server said 409. */
  variant: 'done' | 'already';
  /** Real id of the response saved by THIS submit (null for `already`). */
  responseId: string | null;
  compact?: boolean;
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
      className="bz-survey-scroll bz-survey-on-hero anim-fade relative flex flex-1 flex-col overflow-hidden"
      style={{ background: SURVEY_HERO, color: '#fff' }}
    >
      {/* Soft light behind the success mark — decorative */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '6%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 380,
          height: 380,
          borderRadius: 999,
          background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)',
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
                background: i % 3 === 0 ? '#FFF' : i % 3 === 1 ? accent.fill : SURVEY_LAVENDER_LINE,
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
          padding: compact ? '40px 22px 0' : 'calc(60px + env(safe-area-inset-top, 0px)) 22px 0',
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
          style={{ color: 'rgba(255,255,255,0.85)' }}
        >
          Teşekkürler
        </div>
        <h2
          className="bz-survey-head"
          style={{
            margin: 0,
            fontSize: 28,
            color: '#fff',
          }}
        >
          {isAlready
            ? 'Daha önce yanıt vermişsin'
            : thankYou || 'Yanıtın için teşekkürler.'}
        </h2>
        <p
          style={{
            margin: '14px auto 0',
            maxWidth: 320,
            fontSize: 14.5,
            lineHeight: 1.55,
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          {isAlready ? (
            'Bu cihazdan bu ankete zaten yanıt gönderildi. Teşekkürler!'
          ) : (
            <>
              Yanıtın {brand} ekibine iletildi.
              {responseNo && (
                <>
                  {' '}
                  <span>
                    Yanıt no:{' '}
                    <span className="bz-survey-mono" style={{ color: '#fff', fontWeight: 600 }}>
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
            className="relative overflow-hidden rounded-[24px] border-dashed"
            style={{
              padding: '20px 20px 18px',
              background: 'rgba(255,255,255,0.1)',
              border: '1.5px dashed rgba(255,255,255,0.35)',
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
                background: SURVEY_HERO,
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
                background: SURVEY_HERO,
              }}
            />
            <div
              className="bz-survey-eyebrow mb-2"
              style={{ color: 'rgba(255,255,255,0.85)' }}
            >
              {couponLabel ? 'Sana özel kupon' : 'Kuponun'}
            </div>
            <div className="flex items-center justify-between gap-3">
              {/* Owner's own wording only — no label, no invented offer text. */}
              {couponLabel && (
                <div
                  className="bz-survey-head"
                  style={{
                    fontSize: 22,
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
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  background: copied ? '#23863A' : accent.fill,
                  color: copied ? '#fff' : accent.text,
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: '0.06em',
                  fontVariantNumeric: 'tabular-nums',
                  flexShrink: 0,
                }}
                aria-label="Kupon kodunu kopyala"
              >
                {copied ? '✓ Kopyalandı' : couponCode}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1" />

      <div
        className="relative flex flex-col gap-2"
        style={{
          padding: compact
            ? '16px 22px 24px'
            : '16px 22px calc(44px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <p
          style={{
            margin: '6px 0 0',
            textAlign: 'center',
            fontSize: 12.5,
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          Buaze · QR feedback
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
  onPick,
  palette,
}: {
  q: Question;
  value: AnswerValue | undefined;
  onChange: (patch: AnswerValue) => void;
  onPick: (patch: AnswerValue, viaPointer: boolean) => void;
  palette: ResolvedSurveyAccent;
}) {
  if (q.type === 'rating') {
    return (
      <QStar
        value={value?.numberValue ?? null}
        onChange={(v, viaPointer) => onPick({ numberValue: v }, viaPointer)}
        accent={palette.onLight.fill}
      />
    );
  }
  if (q.type === 'nps') {
    return (
      <QNps
        value={value?.numberValue ?? null}
        onChange={(v, viaPointer) => onPick({ numberValue: v }, viaPointer)}
      />
    );
  }
  if (q.type === 'short_text') {
    return (
      <input
        className="bz-survey-field"
        type="text"
        value={value?.textValue || ''}
        onChange={(e) => onChange({ textValue: e.target.value.slice(0, 200) })}
        placeholder="Yazmaya başla…"
        aria-label={q.text.trim() || SHORT_TYPE_LABEL.short_text}
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
          aria-label={q.text.trim() || SHORT_TYPE_LABEL.long_text}
          maxLength={max}
          style={{ resize: 'none', minHeight: 140 }}
          autoCapitalize="sentences"
        />
        <div
          className="text-right"
          style={{
            marginTop: 6,
            paddingInline: 4,
            fontSize: 12,
            color: SURVEY_TEXT_2,
            fontVariantNumeric: 'tabular-nums',
          }}
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
        label={q.text.trim() || SHORT_TYPE_LABEL.multiple_choice}
        value={value?.optionValue ?? null}
        onChange={(v, viaPointer) => onPick({ optionValue: v }, viaPointer)}
        accent={palette.onLight}
      />
    );
  }
  return null;
}

/**
 * Arrow-key navigation for a radiogroup made of `role="radio"` buttons: arrows
 * (and Home / End) move focus and choose the option, like native radios. The
 * synthetic click has `detail === 0`, so it never auto-advances.
 */
function radioArrowKeys(e: React.KeyboardEvent<HTMLElement>) {
  const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown';
  const back = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
  if (!forward && !back && e.key !== 'Home' && e.key !== 'End') return;
  const radios = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]'));
  const from = radios.indexOf(document.activeElement as HTMLElement);
  if (from < 0 || radios.length === 0) return;
  e.preventDefault();
  const to =
    e.key === 'Home'
      ? 0
      : e.key === 'End'
        ? radios.length - 1
        : (from + (forward ? 1 : -1) + radios.length) % radios.length;
  radios[to].focus();
  radios[to].click();
}

function QStar({
  value,
  onChange,
  accent,
}: {
  value: number | null;
  onChange: (v: number, viaPointer: boolean) => void;
  accent: string;
}) {
  const [hover, setHover] = useState(0);
  const v = hover || value || 0;
  const labels = ['Çok kötüydü', 'İdare ederdi', 'Ortalama', 'Güzeldi', 'Mükemmel!'];
  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Yıldız puanı"
        onKeyDown={radioArrowKeys}
        className="flex justify-between rounded-[24px]"
        style={{ gap: 4, padding: '18px 8px 12px', background: SURVEY_CANVAS }}
      >
        {[1, 2, 3, 4, 5].map((s) => {
          const active = s <= v;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={value === s}
              // detail > 0 = mouse / touch; keyboard Enter/Space and screen
              // reader activation report 0 (they never auto-advance).
              onClick={(e) => onChange(s, e.detail > 0)}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${s} yıldız`}
              className="bz-survey-tap flex items-center justify-center"
              style={{
                flex: '1 1 0',
                minWidth: 44,
                height: 56,
                border: 'none',
                borderRadius: 999,
                background: 'transparent',
                cursor: 'pointer',
                padding: 0,
                transform: active ? 'scale(1.06)' : 'scale(1)',
              }}
            >
              <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden>
                <path
                  d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3z"
                  fill={active ? accent : '#D6D6D6'}
                  stroke={active ? accent : '#D6D6D6'}
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
        style={{ minHeight: 30, marginTop: 12 }}
        aria-live="polite"
      >
        {v > 0 ? (
          <span
            key={v}
            className="bz-survey-head anim-fade"
            style={{ fontSize: 17, color: SURVEY_TEXT }}
          >
            {labels[v - 1]}
          </span>
        ) : (
          <span style={{ fontSize: 14, color: SURVEY_TEXT_2 }}>
            ← seçim yap →
          </span>
        )}
      </div>
    </div>
  );
}

// Recommend score 0–10. Six columns (0–5 on the first row, 6–10 on the second,
// the last cell empty) so every cell is at least 44 px wide even at 320 px —
// eleven columns gave 29 px. The customer is never labelled ("Eleştirmen" etc.
// is the owner's jargon): the chosen cell is highlighted and "n / 10" is shown.
function QNps({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number, viaPointer: boolean) => void;
}) {
  return (
    <div>
      <div
        role="radiogroup"
        aria-label="0 ile 10 arası puan"
        onKeyDown={radioArrowKeys}
        className="bz-survey-nps"
      >
        {Array.from({ length: 11 }, (_, n) => n).map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={(e) => onChange(n, e.detail > 0)}
              className="bz-survey-tap bz-survey-nps-cell flex items-center justify-center"
              style={{
                border: 'none',
                background: active ? SURVEY_HERO : SURVEY_CANVAS,
                color: active ? '#fff' : SURVEY_TEXT,
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div
        className="flex items-center justify-between gap-3"
        style={{
          marginTop: 12,
          paddingInline: 2,
          fontSize: 12.5,
          color: SURVEY_TEXT_2,
        }}
      >
        <span>0 = Hiç önermem</span>
        <span>10 = Kesinlikle</span>
      </div>
      <div
        aria-live="polite"
        className="text-center"
        style={{
          marginTop: 14,
          minHeight: 22,
          fontSize: 15,
          fontWeight: 600,
          color: SURVEY_TEXT,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value !== null ? `${value} / 10` : ''}
      </div>
    </div>
  );
}

function QRadio({
  options,
  label,
  value,
  onChange,
  accent,
}: {
  options: string[];
  label: string;
  value: string | null;
  onChange: (v: string, viaPointer: boolean) => void;
  /** Light-surface pair: the selected option gets an accent border + tint and an accent tick. */
  accent: AccentPair;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={radioArrowKeys}
      className="flex flex-col"
      style={{ gap: 10 }}
    >
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={(e) => onChange(opt, e.detail > 0)}
            className="bz-survey-tap flex items-center"
            style={{
              gap: 14,
              padding: '14px 16px',
              minHeight: 56,
              border: '1.5px solid ' + (active ? accent.fill : 'transparent'),
              background: active ? accent.fill + '14' : SURVEY_CANVAS,
              color: SURVEY_TEXT,
              borderRadius: 18,
              fontSize: 15,
              fontWeight: active ? 600 : 500,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ flex: 1 }}>{opt}</span>
            <span
              className="flex shrink-0 items-center justify-center"
              style={{
                width: 22,
                height: 22,
                borderRadius: 999,
                border: '1.5px solid ' + (active ? accent.fill : '#C4C4C4'),
                background: active ? accent.fill : '#fff',
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
