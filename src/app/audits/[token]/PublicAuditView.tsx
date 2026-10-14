'use client';

// Denetim Merkezi — herkese açık doldurma sayfası (spec §3.8). Telefon önce.
//
// Akış: giriş (ad + tek onay + "Başla") → maddeler → teşekkür.
//   • Kontrol listesi (yes_no | scale | text | file, ≤ 15 madde): TÜM maddeler tek
//     sayfada, "Devam" dokunuşu yok. 6 maddelik Evet/Hayır listesi = onay, Başla,
//     6 cevap, Gönder = 9 dokunuş.
//   • Adım adım (single | multi içeren test ya da > 15 madde): bir soru bir ekran,
//     Geri / Devam; OTOMATİK ilerleme yok (yanlış dokunuş riski, WCAG 3.2.2).
//
// "Başla" / "Gönder" her zaman ekranın altına yapışık (sticky) çubuktadır; uzun
// açıklama ya da açılmış iletişim alanları onu aşağı itmez.
//
// Taslak (D4): cevaplar `sessionStorage`'a yazılır (fotoğraflar hariç) → sayfa yenilense
// de kaybolmaz. Canlı düzenleme: soru seti sunucuda değiştiyse cevaplar korunarak
// yeniden çekilir (spec "Stale question set").

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronDown, ClipboardCheck, Loader2 } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { readableOn } from '@/lib/audits/kind';
import { parseAuditErrorResponse, summarizeAuditError, isLikelyEmail } from '@/lib/audits/error-humanizer';
import PublicQuestionInput, {
  type PublicAnswerValue,
  type PublicQuestion,
} from '@/components/audits/PublicQuestionInput';
import PublicNoticeCard, { notOpenCopy, usedUpCopy } from './PublicNoticeCard';
import { clearDraft, getSessionStorage, loadDraft, saveDraft } from './publicAuditDraft';
import {
  buildAnswerRows,
  chooseFillMode,
  countAnswered,
  findMissingRequiredIds,
  isAnswerFilled,
  reconcileAnswers,
  safeAccent,
  totalPhotoBytes,
} from './publicAuditFlow';

interface FetchResponse {
  completed: boolean;
  usedUp?: boolean;
  reusable?: boolean;
  kind?: 'checklist' | 'quiz';
  assignment: {
    id: string;
    status: string;
    assigneeName: string | null;
    assigneeEmail: string | null;
    recurrence: string;
  };
  template: {
    id: string;
    title: string;
    description: string | null;
    locale: string;
  };
  restaurant: { id: string; name: string; primaryColor: string | null };
  questions: PublicQuestion[];
}

type Phase = 'loading' | 'ready' | 'closed' | 'used' | 'loadError';
type Step = 'intro' | 'fill' | 'done';

interface Props {
  token: string;
  locale: Locale;
}

const PRIMARY_BTN =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#1A1A1A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A0A0A] disabled:cursor-not-allowed disabled:opacity-60';
const GHOST_BTN =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#D4D4D4] bg-white px-5 text-[15px] font-semibold text-[#0A0A0A] transition-colors hover:border-[#0A0A0A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A0A0A] disabled:cursor-not-allowed disabled:opacity-50';

export default function PublicAuditView({ token, locale }: Props) {
  const isTr = locale === 'tr';
  const uid = useId();

  const [phase, setPhase] = useState<Phase>('loading');
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [data, setData] = useState<FetchResponse | null>(null);
  const [step, setStep] = useState<Step>('intro');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, PublicAnswerValue>>({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [contactOpen, setContactOpen] = useState(false);
  const [kvkkOk, setKvkkOk] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [introError, setIntroError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{ score: number | null; passed: boolean | null } | null>(null);
  const [invalidIds, setInvalidIds] = useState<string[]>([]);
  const [staleNotice, setStaleNotice] = useState<string | null>(null);
  const [stalePending, setStalePending] = useState(false);
  const [restored, setRestored] = useState(false);
  const [scrollToId, setScrollToId] = useState<string | null>(null);

  const submittingRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const consentRef = useRef<HTMLInputElement | null>(null);

  // ─── Yükle ────────────────────────────────────────────────────────────

  const applyData = useCallback(
    (json: FetchResponse, opts: { keepAnswers: boolean }) => {
      setData(json);
      if (json.usedUp) {
        setPhase('used');
        return;
      }
      setPhase('ready');
      const lang = json.template.locale === 'en' ? 'en' : 'tr';
      if (opts.keepAnswers) {
        // Soru seti değişti: eski cevaplardan hâlâ uyanlar kalır.
        setAnswers((prev) => reconcileAnswers(json.questions, prev, lang));
        return;
      }
      // Tek seferlik linkte sahibin yazdığı ad / e-posta ön-doldurulur (sürekli linkte
      // API zaten null döner — link adı katılımcıya ifşa edilmez).
      let prefName = '';
      if (!json.reusable && json.assignment.assigneeName) prefName = json.assignment.assigneeName;
      if (!json.reusable && json.assignment.assigneeEmail) {
        setEmail(json.assignment.assigneeEmail);
        setContactOpen(true);
      }
      // Test (single / multi): iletişim bilgisi sahibin adaya ulaşması için gerekli → açık başlar.
      if (json.kind === 'quiz') setContactOpen(true);

      const draft = loadDraft(getSessionStorage(), token);
      if (draft) {
        const kept = reconcileAnswers(json.questions, draft.answers, lang);
        setAnswers(kept);
        if (!prefName && draft.name) prefName = draft.name;
        if (Object.keys(kept).length > 0 || draft.name) setRestored(true);
      }
      if (prefName) setName(prefName);
    },
    [token],
  );

  const loadData = useCallback(
    async (opts: { keepAnswers: boolean }): Promise<boolean> => {
      try {
        const res = await fetch(`/api/audits/${token}`, { cache: 'no-store' });
        if (res.status === 404) {
          setPhase('closed');
          return false;
        }
        if (!res.ok) {
          const parsed = await parseAuditErrorResponse(res, locale);
          setLoadMessage(summarizeAuditError(parsed));
          setPhase('loadError');
          return false;
        }
        const json = (await res.json()) as FetchResponse;
        applyData(json, opts);
        return true;
      } catch {
        setLoadMessage(isTr ? 'Bağlantı hatası. İnternetini kontrol edip tekrar dene.' : 'Connection error. Check your connection and try again.');
        setPhase('loadError');
        return false;
      }
    },
    [token, locale, isTr, applyData],
  );

  useEffect(() => {
    void loadData({ keepAnswers: false });
    // yalnız ilk açılışta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Taslak ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'ready' || step === 'done') return;
    const timer = window.setTimeout(() => {
      saveDraft(getSessionStorage(), token, { answers, name });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [answers, name, phase, step, token]);

  // ─── Türetilmiş değerler ──────────────────────────────────────────────

  const questions = useMemo(() => data?.questions ?? [], [data]);
  const total = questions.length;
  const mode = useMemo(() => chooseFillMode(questions), [questions]);
  const accent = safeAccent(data?.restaurant.primaryColor);
  const ink = readableOn(accent);
  const answered = countAnswered(questions, answers);
  const photoBytes = totalPhotoBytes(questions, answers);
  const kind = data?.kind ?? 'checklist';

  // ─── Kaydırma / odak ──────────────────────────────────────────────────

  useEffect(() => {
    if (!scrollToId || step !== 'fill') return;
    const el = document.getElementById(`audit-item-${scrollToId}`);
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      const focusable = el.querySelector<HTMLElement>('input, textarea, button');
      focusable?.focus({ preventScroll: true });
    }
    setScrollToId(null);
  }, [scrollToId, step, questionIndex]);

  // Adım adım modda: soru değişince odak başlığa (ekran okuyucu yeni soruyu okur).
  useEffect(() => {
    if (step === 'fill' && mode === 'steps') headingRef.current?.focus({ preventScroll: true });
  }, [step, mode, questionIndex]);

  // ─── Cevap değişimi ───────────────────────────────────────────────────

  const setAnswer = useCallback((qid: string, value: PublicAnswerValue) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
    if (isAnswerFilled(value)) setInvalidIds((prev) => (prev.includes(qid) ? prev.filter((x) => x !== qid) : prev));
  }, []);

  // ─── Başla ────────────────────────────────────────────────────────────

  function handleStart() {
    setIntroError(null);
    if (!kvkkOk) {
      setConsentError(true);
      consentRef.current?.focus();
      return;
    }
    if (total === 0) {
      setIntroError(isTr ? 'Bu denetimde henüz madde yok.' : 'This audit has no items yet.');
      return;
    }
    if (email.trim() && !isLikelyEmail(email)) {
      setContactOpen(true);
      setIntroError(isTr ? 'E-posta geçerli görünmüyor.' : 'The email address does not look valid.');
      return;
    }
    setStep('fill');
    setQuestionIndex(0);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  }

  // ─── Gönder ───────────────────────────────────────────────────────────

  const goToFirstMissing = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const first = ids[0];
      if (mode === 'steps') {
        const idx = questions.findIndex((q) => q.id === first);
        if (idx >= 0) setQuestionIndex(idx);
      }
      setScrollToId(first);
    },
    [mode, questions],
  );

  const handleStaleSet = useCallback(async () => {
    const ok = await loadData({ keepAnswers: true });
    if (ok) setStalePending(true);
  }, [loadData]);

  // Soru seti yenilendiyse eksik maddeleri işaretle ve ilkine git.
  useEffect(() => {
    if (!stalePending || !data) return;
    setStalePending(false);
    const missing = findMissingRequiredIds(data.questions, answers);
    setInvalidIds(missing);
    setStaleNotice(
      missing.length > 0
        ? isTr
          ? 'Denetim güncellendi. Eksik maddeleri doldurup tekrar gönder.'
          : 'The audit was updated. Fill in the missing items and send again.'
        : isTr
          ? 'Denetim güncellendi. Cevaplarını kontrol edip tekrar gönder.'
          : 'The audit was updated. Check your answers and send again.',
    );
    goToFirstMissing(missing);
  }, [stalePending, data, answers, isTr, goToFirstMissing]);

  const handleSubmit = useCallback(async () => {
    if (!data || submittingRef.current) return;
    setSubmitError(null);
    setStaleNotice(null);

    const missing = findMissingRequiredIds(data.questions, answers);
    if (missing.length > 0) {
      setInvalidIds(missing);
      goToFirstMissing(missing);
      return;
    }
    setInvalidIds([]);

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/audits/${token}/submit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          answers: buildAnswerRows(data.questions, answers),
          respondentName: name.trim() || null,
          respondentEmail: email.trim() || null,
          respondentPhone: phone.trim() || null,
          hasKvkkConsent: true,
          // Dahili denetimde ticari ileti izni istenmez (spec D2).
          hasMarketingConsent: false,
        }),
      });
      if (!res.ok) {
        let code: string | null = null;
        let errorField: string | null = null;
        try {
          const body = (await res.clone().json()) as { code?: unknown; error?: unknown };
          code = typeof body.code === 'string' ? body.code : null;
          errorField = typeof body.error === 'string' ? body.error : null;
        } catch {
          /* gövde JSON değil */
        }
        if (res.status === 409 && errorField === 'already_completed') {
          clearDraft(getSessionStorage(), token);
          setPhase('used');
          return;
        }
        if (res.status === 404) {
          setPhase('closed');
          return;
        }
        if (res.status === 400 && (code === 'MISSING_REQUIRED' || code === 'INVALID_QUESTION_ID')) {
          await handleStaleSet();
          return;
        }
        setSubmitError(summarizeAuditError(await parseAuditErrorResponse(res, locale)));
        return;
      }
      const json = (await res.json()) as { score?: number | null; passed?: boolean | null };
      // Skor yalnız sunucu verdiyse görünür (test ve puanlanamayan formda null).
      setResult({
        score: typeof json.score === 'number' ? json.score : null,
        passed: typeof json.score === 'number' ? (json.passed ?? null) : null,
      });
      clearDraft(getSessionStorage(), token);
      setStep('done');
      if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
    } catch {
      setSubmitError(
        isTr
          ? 'Gönderilemedi. İnternetini kontrol edip tekrar dene. Cevapların korundu.'
          : 'Could not send. Check your connection and try again. Your answers are kept.',
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [data, answers, token, name, email, phone, locale, isTr, goToFirstMissing, handleStaleSet]);

  function handleFillAnother() {
    clearDraft(getSessionStorage(), token);
    setAnswers({});
    setName('');
    setEmail('');
    setPhone('');
    setContactOpen(kind === 'quiz');
    setKvkkOk(false);
    setConsentError(false);
    setInvalidIds([]);
    setStaleNotice(null);
    setSubmitError(null);
    setIntroError(null);
    setResult(null);
    setRestored(false);
    setQuestionIndex(0);
    setStep('intro');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  }

  // ─── Erken çıkışlar ───────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <main
        lang={locale}
        className="flex min-h-dvh items-center justify-center bg-[#0A0A0A] text-white"
        aria-busy="true"
      >
        <Loader2 size={28} className="animate-spin" aria-label={isTr ? 'Yükleniyor' : 'Loading'} />
      </main>
    );
  }
  if (phase === 'closed') {
    const copy = notOpenCopy(locale);
    return <PublicNoticeCard title={copy.title} body={copy.body} />;
  }
  if (phase === 'used') {
    const copy = usedUpCopy(locale);
    return <PublicNoticeCard title={copy.title} body={copy.body} />;
  }
  if (phase === 'loadError' || !data) {
    return (
      <PublicNoticeCard
        title={isTr ? 'Denetim yüklenemedi' : 'The audit could not be loaded'}
        body={loadMessage ?? (isTr ? 'Biraz sonra tekrar dene.' : 'Please try again in a moment.')}
        action={
          <button
            type="button"
            className={PRIMARY_BTN}
            onClick={() => {
              setPhase('loading');
              void loadData({ keepAnswers: false });
            }}
          >
            {isTr ? 'Tekrar dene' : 'Try again'}
          </button>
        }
      />
    );
  }

  // ─── Ana görünüm ──────────────────────────────────────────────────────

  const itemsLabel =
    kind === 'quiz'
      ? isTr
        ? `${total} soru`
        : `${total} question${total === 1 ? '' : 's'}`
      : isTr
        ? `${total} madde`
        : `${total} item${total === 1 ? '' : 's'}`;
  const canFillAnother = step === 'done' && Boolean(data.reusable) && kind === 'checklist';
  const currentQuestion = mode === 'steps' ? (questions[questionIndex] ?? null) : null;
  const isLastStep = questionIndex >= total - 1;
  const progress = total ? Math.round(((questionIndex + 1) / total) * 100) : 0;
  const stepFilled = currentQuestion ? isAnswerFilled(answers[currentQuestion.id]) : false;

  const footerShell =
    '-mx-4 rounded-t-3xl bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-[#0A0A0A] shadow-[0_-12px_32px_-12px_rgba(0,0,0,0.55)] sm:mx-0 sm:mt-3 sm:rounded-3xl sm:px-6 sm:pb-4 sm:shadow-[0_24px_64px_-20px_rgba(0,0,0,0.45)]';

  const submitErrorBlock = submitError && (
    <div
      role="alert"
      className="mb-3 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-[13px] leading-snug text-[#991B1B]"
    >
      <AlertTriangle size={14} strokeWidth={2.2} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">{submitError}</span>
      <button
        type="button"
        className="-my-1 shrink-0 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold underline underline-offset-2 hover:bg-[#FECACA]/40"
        onClick={() => void handleSubmit()}
        disabled={submitting}
      >
        {isTr ? 'Tekrar dene' : 'Try again'}
      </button>
    </div>
  );

  const submitLabel = submitting ? (
    <>
      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
      {isTr ? 'Gönderiliyor…' : 'Sending…'}
    </>
  ) : (
    <>
      <Check size={16} aria-hidden="true" />
      {isTr ? 'Gönder' : 'Send'}
    </>
  );

  return (
    <main lang={locale} className="bg-[#0A0A0A] text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col px-4 pt-5 sm:px-6 sm:pt-10">
        {/* Başlık: sıkı */}
        <header className="mb-4 flex items-center gap-3 sm:mb-6">
          <div
            aria-hidden="true"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: accent, color: ink }}
          >
            <ClipboardCheck size={18} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="pulse-eyebrow truncate text-white/60">{data.restaurant.name}</p>
            <h1 className="bz-h-tight-2 mt-0.5 break-words text-[19px] leading-tight sm:text-[24px]">
              {data.template.title}
            </h1>
          </div>
        </header>

        <div className="flex-1 sm:flex-none">
          {/* ─── Giriş ─── */}
          {step === 'intro' && (
            <section className="rounded-3xl bg-white p-5 text-[#0A0A0A] shadow-[0_24px_64px_-20px_rgba(0,0,0,0.45)] sm:p-7">
              {restored && (
                <p
                  role="status"
                  className="mb-4 flex items-start gap-2 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-[12.5px] leading-snug text-[#1E40AF]"
                >
                  <Check size={14} strokeWidth={2.4} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {isTr
                    ? 'Önceki cevapların geri yüklendi. Fotoğrafları yeniden eklemen gerekebilir.'
                    : 'Your earlier answers were restored. You may need to add photos again.'}
                </p>
              )}
              {data.template.description && <Description text={data.template.description} isTr={isTr} />}

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#EDEDED] bg-[#FAFAFA] px-3 py-1 text-[12px] text-[#525252]">
                  <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
                  {itemsLabel}
                </span>
              </div>

              <div className="mt-5">
                <label htmlFor={`${uid}-name`} className="mb-1.5 block text-[13px] font-semibold text-[#0A0A0A]">
                  {isTr ? 'Adın (isteğe bağlı)' : 'Your name (optional)'}
                </label>
                <input
                  id={`${uid}-name`}
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

              <div className="mt-2">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-[#0A0A0A] underline-offset-2 hover:underline"
                  aria-expanded={contactOpen}
                  aria-controls={`${uid}-contact`}
                  onClick={() => setContactOpen((v) => !v)}
                >
                  {isTr ? 'İletişim bilgisi ekle' : 'Add contact details'}
                  <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className={`transition-transform ${contactOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {contactOpen && (
                  <div id={`${uid}-contact`} className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`${uid}-email`} className="mb-1.5 block text-[13px] font-semibold text-[#0A0A0A]">
                        {isTr ? 'E-posta (isteğe bağlı)' : 'Email (optional)'}
                      </label>
                      <input
                        id={`${uid}-email`}
                        className="bz-input"
                        type="email"
                        inputMode="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ad@ornek.com"
                        autoComplete="email"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        enterKeyHint="next"
                      />
                    </div>
                    <div>
                      <label htmlFor={`${uid}-phone`} className="mb-1.5 block text-[13px] font-semibold text-[#0A0A0A]">
                        {isTr ? 'Telefon (isteğe bağlı)' : 'Phone (optional)'}
                      </label>
                      <input
                        id={`${uid}-phone`}
                        className="bz-input"
                        type="tel"
                        inputMode="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+90 …"
                        autoComplete="tel"
                        enterKeyHint="done"
                      />
                    </div>
                  </div>
                )}
              </div>

              {introError && (
                <p role="alert" className="mt-3 flex items-start gap-1.5 text-[13px] text-[#991B1B]">
                  <AlertTriangle size={14} strokeWidth={2.2} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {introError}
                </p>
              )}
            </section>
          )}

          {/* ─── Maddeler: kontrol listesi (tek sayfa) ─── */}
          {step === 'fill' && mode === 'checklist' && (
            <div className="space-y-3">
              {staleNotice && (
                <p
                  role="status"
                  className="flex items-start gap-2 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-[13px] leading-snug text-[#92400E]"
                >
                  <AlertTriangle size={14} strokeWidth={2.2} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {staleNotice}
                </p>
              )}
              {questions.map((q, i) => {
                const invalid = invalidIds.includes(q.id);
                const legendId = `${uid}-legend-${q.id}`;
                const helpId = q.helpText ? `${uid}-help-${q.id}` : undefined;
                const errId = invalid ? `${uid}-err-${q.id}` : undefined;
                return (
                  <div
                    key={q.id}
                    id={`audit-item-${q.id}`}
                    className={`scroll-mt-4 rounded-2xl bg-white p-4 text-[#0A0A0A] sm:p-5 ${
                      invalid ? 'ring-2 ring-[#DC2626]' : ''
                    }`}
                  >
                    <fieldset className="m-0 min-w-0 border-0 p-0">
                      <legend id={legendId} className="mb-3 w-full p-0 text-[15px] font-semibold leading-snug">
                        <span className="bz-mono mr-2 text-[11px] font-medium text-[#A3A3A3]" aria-hidden="true">
                          {i + 1}
                        </span>
                        {q.prompt}
                        {!q.isRequired && (
                          <span className="ml-2 align-middle text-[11px] font-medium text-[#737373]">
                            {isTr ? 'İsteğe bağlı' : 'Optional'}
                          </span>
                        )}
                      </legend>
                      {q.helpText && (
                        <p id={helpId} className="-mt-1.5 mb-3 text-[13px] leading-relaxed text-[#525252]">
                          {q.helpText}
                        </p>
                      )}
                      <PublicQuestionInput
                        question={q}
                        value={answers[q.id] ?? null}
                        onChange={(v) => setAnswer(q.id, v)}
                        accent={accent}
                        isTr={isTr}
                        variant="inline"
                        labelledBy={legendId}
                        describedBy={[helpId, errId].filter(Boolean).join(' ') || undefined}
                        photoBytesElsewhere={photoBytes - ownPhotoBytes(answers[q.id])}
                      />
                      {invalid && (
                        <p id={errId} role="alert" className="mt-2 text-[13px] font-semibold text-[#DC2626]">
                          {isTr ? 'Bu madde zorunlu' : 'This item is required'}
                        </p>
                      )}
                    </fieldset>
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── Maddeler: adım adım ─── */}
          {step === 'fill' && mode === 'steps' && currentQuestion && (
            <section className="rounded-3xl bg-white p-5 text-[#0A0A0A] shadow-[0_24px_64px_-20px_rgba(0,0,0,0.45)] sm:p-7">
              <div className="mb-2 flex items-center justify-between text-[12px]">
                <span className="pulse-eyebrow text-[#525252]">
                  {isTr ? `Soru ${questionIndex + 1} / ${total}` : `Question ${questionIndex + 1} / ${total}`}
                </span>
                <span className="bz-mono text-[#737373]">%{progress}</span>
              </div>
              <div
                className="mb-5 h-1.5 overflow-hidden rounded-full bg-[#EDEDED]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                aria-label={isTr ? 'İlerleme' : 'Progress'}
              >
                <div
                  className="h-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%`, background: accent }}
                />
              </div>

              {staleNotice && (
                <p
                  role="status"
                  className="mb-4 flex items-start gap-2 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[13px] leading-snug text-[#92400E]"
                >
                  <AlertTriangle size={14} strokeWidth={2.2} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {staleNotice}
                </p>
              )}

              <div id={`audit-item-${currentQuestion.id}`} className="scroll-mt-4">
                <h2
                  ref={headingRef}
                  tabIndex={-1}
                  id={`${uid}-q`}
                  className="bz-h-tight-2 text-[20px] leading-snug outline-none sm:text-[22px]"
                >
                  {currentQuestion.prompt}
                </h2>
                {currentQuestion.helpText && (
                  <p id={`${uid}-q-help`} className="mt-1.5 text-[13px] leading-relaxed text-[#525252]">
                    {currentQuestion.helpText}
                  </p>
                )}
                {!currentQuestion.isRequired && (
                  <span className="mt-2 inline-block rounded-full border border-[#EDEDED] bg-[#FAFAFA] px-2.5 py-0.5 text-[11px] text-[#737373]">
                    {isTr ? 'İsteğe bağlı' : 'Optional'}
                  </span>
                )}
                <div className="mt-5">
                  <PublicQuestionInput
                    key={currentQuestion.id}
                    question={currentQuestion}
                    value={answers[currentQuestion.id] ?? null}
                    onChange={(v) => setAnswer(currentQuestion.id, v)}
                    accent={accent}
                    isTr={isTr}
                    variant="step"
                    labelledBy={`${uid}-q`}
                    describedBy={currentQuestion.helpText ? `${uid}-q-help` : undefined}
                    photoBytesElsewhere={photoBytes - ownPhotoBytes(answers[currentQuestion.id])}
                  />
                </div>
                {invalidIds.includes(currentQuestion.id) && (
                  <p role="alert" className="mt-3 text-[13px] font-semibold text-[#DC2626]">
                    {isTr ? 'Bu madde zorunlu' : 'This item is required'}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* ─── Teşekkür ─── */}
          {step === 'done' && (
            <section className="rounded-3xl bg-white p-8 text-center text-[#0A0A0A] shadow-[0_24px_64px_-20px_rgba(0,0,0,0.45)] sm:p-10">
              <div
                aria-hidden="true"
                className="pulse-heartbeat mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full shadow-[0_8px_24px_-8px_rgba(0,0,0,0.25)]"
                style={{ background: accent, color: ink }}
              >
                <Check size={28} strokeWidth={2.5} />
              </div>
              <h2 className="bz-h-tight-2 text-[24px] sm:text-[28px]">{isTr ? 'Teşekkürler!' : 'Thank you!'}</h2>
              <p className="mx-auto mt-2 max-w-[360px] text-[14px] leading-relaxed text-[#525252]">
                {isTr ? 'Yanıtın işletmeye iletildi.' : 'Your answers were sent to the business.'}
              </p>
              {result && result.score !== null && (
                <div className="mt-6 inline-block min-w-[220px] rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-5">
                  <p className="pulse-eyebrow text-[#525252]">{isTr ? 'Puan' : 'Score'}</p>
                  <p className="bz-mono mt-1 text-[44px] font-medium leading-none tracking-tight">
                    {result.score}
                    <span className="text-[20px] text-[#A3A3A3]">/100</span>
                  </p>
                  {result.passed !== null && (
                    <div
                      className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium ${
                        result.passed ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEE2E2] text-[#991B1B]'
                      }`}
                    >
                      {result.passed
                        ? isTr
                          ? 'Geçti'
                          : 'Passed'
                        : isTr
                          ? 'Geçme puanının altında'
                          : 'Below the pass mark'}
                    </div>
                  )}
                </div>
              )}
              {canFillAnother && (
                <div className="mt-6">
                  <button type="button" className={GHOST_BTN} onClick={handleFillAnother}>
                    {isTr ? 'Bir tane daha doldur' : 'Fill another'}
                  </button>
                </div>
              )}
            </section>
          )}
        </div>

        {/* ─── Yapışık çubuk: Başla / Gönder / Geri-Devam ─── */}
        {step === 'intro' && (
          <div className="sticky bottom-0 z-20 sm:bottom-4">
            <div className={footerShell}>
              <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[13px] leading-relaxed">
                <input
                  ref={consentRef}
                  type="checkbox"
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[#0A0A0A]"
                  checked={kvkkOk}
                  onChange={(e) => {
                    setKvkkOk(e.target.checked);
                    if (e.target.checked) setConsentError(false);
                  }}
                  aria-describedby={consentError ? `${uid}-consent-err` : undefined}
                  aria-invalid={consentError || undefined}
                />
                <span>
                  {isTr ? 'Okudum, anladım — ' : 'I have read and understood the '}
                  <a
                    href={`/${isTr ? 'tr' : 'en'}/kvkk`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0A0A0A] underline hover:text-[#525252]"
                  >
                    {isTr ? 'KVKK Aydınlatma Metni' : 'KVKK Privacy Notice'}
                  </a>
                  {isTr ? ' ve ' : ' and '}
                  <a
                    href={`/${isTr ? 'tr' : 'en'}/acik-riza`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0A0A0A] underline hover:text-[#525252]"
                  >
                    {isTr ? 'Açık Rıza Metni' : 'Explicit Consent'}
                  </a>
                  {isTr
                    ? ' kapsamında yanıtlarımın işlenmesini kabul ediyorum.'
                    : ' for processing my responses.'}{' '}
                  <span className="text-[#DC2626]" aria-hidden="true">
                    *
                  </span>
                </span>
              </label>
              {consentError && (
                <p id={`${uid}-consent-err`} role="alert" className="mt-1 text-[12.5px] font-semibold text-[#DC2626]">
                  {isTr ? 'Başlamak için onay gerekli.' : 'Consent is required to start.'}
                </p>
              )}
              <button type="button" className={`${PRIMARY_BTN} mt-2 w-full`} onClick={handleStart}>
                {isTr ? 'Başla' : 'Start'} <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {step === 'fill' && mode === 'checklist' && (
          <div className="sticky bottom-0 z-20 sm:bottom-4">
            <div className={footerShell}>
              {submitErrorBlock}
              <div className="flex items-center gap-3">
                <p className="min-w-0 flex-1 text-[13px] leading-snug text-[#525252]" aria-live="polite">
                  <span className="bz-mono font-semibold text-[#0A0A0A]">
                    {answered}/{total}
                  </span>{' '}
                  {isTr ? 'yanıtlandı' : 'answered'}
                  {invalidIds.length > 0 && (
                    <span className="block font-semibold text-[#DC2626]">
                      {isTr ? `${invalidIds.length} zorunlu madde eksik` : `${invalidIds.length} required item${invalidIds.length === 1 ? '' : 's'} missing`}
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  className={`${PRIMARY_BTN} shrink-0`}
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                  aria-busy={submitting}
                >
                  {submitLabel}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'fill' && mode === 'steps' && currentQuestion && (
          <div className="sticky bottom-0 z-20 sm:bottom-4">
            <div className={footerShell}>
              {submitErrorBlock}
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  className={GHOST_BTN}
                  disabled={questionIndex === 0 || submitting}
                  onClick={() => setQuestionIndex((i) => Math.max(0, i - 1))}
                >
                  <ArrowLeft size={16} aria-hidden="true" /> {isTr ? 'Geri' : 'Back'}
                </button>
                {isLastStep ? (
                  <button
                    type="button"
                    className={PRIMARY_BTN}
                    onClick={() => void handleSubmit()}
                    disabled={submitting || (currentQuestion.isRequired && !stepFilled)}
                    aria-busy={submitting}
                  >
                    {submitLabel}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={PRIMARY_BTN}
                    disabled={submitting || (currentQuestion.isRequired && !stepFilled)}
                    onClick={() => setQuestionIndex((i) => Math.min(total - 1, i + 1))}
                  >
                    {isTr ? 'Devam' : 'Next'} <ArrowRight size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <p className="bz-mono py-6 text-center text-[11px] text-white/40">POWERED BY BUAZE</p>
      </div>
    </main>
  );
}

/** Bir cevabın fotoğraf (data URL) uzunluğu; fotoğraf değilse 0. */
function ownPhotoBytes(value: PublicAnswerValue | undefined): number {
  return typeof value === 'string' && value.startsWith('data:') ? value.length : 0;
}

// ─── Açıklama: 4 satıra kısaltılır ──────────────────────────────────────

function Description({ text, isTr }: { text: string; isTr: boolean }) {
  const [open, setOpen] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const ref = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const measure = () => setOverflowing(el.scrollHeight > el.clientHeight + 1);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [text, open]);

  return (
    <div>
      <p
        ref={ref}
        className={`whitespace-pre-line break-words text-[14px] leading-relaxed text-[#525252] ${open ? '' : 'line-clamp-4'}`}
      >
        {text}
      </p>
      {(overflowing || open) && (
        <button
          type="button"
          className="mt-1 inline-flex min-h-11 items-center text-[13px] font-semibold text-[#0A0A0A] underline underline-offset-2"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (isTr ? 'Daha az göster' : 'Show less') : isTr ? 'Devamını oku' : 'Read more'}
        </button>
      )}
    </div>
  );
}
