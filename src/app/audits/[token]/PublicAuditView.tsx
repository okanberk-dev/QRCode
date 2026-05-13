'use client';

// CLAUDE.md §42 Phase 3 — Public audit response client component.
//
// Pulse design (dark bg + lime accent), step-by-step:
//   intro (KVKK consent + opsiyonel name/email/phone) → soru-soru →
//   submit → thanks (skor + geçti/kaldı rozeti).
//
// Backend kontratı: GET /api/audits/[token] → assignment + template +
// questions (correctAnswer KASTEN EKSIK). POST submit → score response.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, Loader2, X } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import type {
  AuditQuestionType,
  AuditScoringMode,
  AuditSector,
} from '@/lib/audits/types';

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

function getOptions(q: Question): string[] {
  if (!Array.isArray(q.options)) return [];
  return (q.options as unknown[]).filter((x): x is string => typeof x === 'string');
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

  const handleSubmit = useCallback(async () => {
    if (!data) return;
    setSubmitError(null);
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

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-[640px] mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Brand header */}
        <header className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl text-[#0A0A0A] mb-3"
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
          <div className="bg-white text-[#0A0A0A] rounded-3xl p-6 sm:p-8 bz-fade-in">
            <p className="pulse-eyebrow text-[#525252]">{data.template.title}</p>
            {data.template.description && (
              <p className="text-[15px] text-[#525252] mt-2">{data.template.description}</p>
            )}
            <p className="text-[13px] text-[#737373] mt-3">
              {isTr
                ? `${totalQuestions} soru · yaklaşık ${Math.max(1, Math.ceil(totalQuestions / 4))} dakika`
                : `${totalQuestions} questions · ~${Math.max(1, Math.ceil(totalQuestions / 4))} min`}
            </p>

            <hr className="my-5 border-[#EDEDED]" />

            <div className="space-y-3">
              <h2 className="bz-h-tight text-[14px]">
                {isTr ? 'İletişim (opsiyonel)' : 'Contact (optional)'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="pulse-eyebrow text-[#525252] block mb-1">
                    {isTr ? 'Ad' : 'Name'}
                  </label>
                  <input
                    className="bz-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isTr ? 'Adın' : 'Your name'}
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="pulse-eyebrow text-[#525252] block mb-1">E-posta</label>
                  <input
                    className="bz-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ad@buaze.com"
                  />
                </div>
                <div>
                  <label className="pulse-eyebrow text-[#525252] block mb-1">
                    {isTr ? 'Telefon' : 'Phone'}
                  </label>
                  <input
                    className="bz-input"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+90 ..."
                  />
                </div>
              </div>
            </div>

            <hr className="my-5 border-[#EDEDED]" />

            <label className="flex items-start gap-2 text-[13px] cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={kvkkOk}
                onChange={(e) => setKvkkOk(e.target.checked)}
              />
              <span>
                {isTr ? (
                  <>
                    {data.restaurant.kvkkText ||
                      'Yanıtlarımın işletme tarafından iç değerlendirme amacıyla işlenmesini kabul ediyorum.'}{' '}
                    <span className="text-[#737373]">*</span>
                  </>
                ) : (
                  <>
                    {data.restaurant.kvkkText ||
                      'I consent to my responses being processed by the business for internal evaluation.'}{' '}
                    <span className="text-[#737373]">*</span>
                  </>
                )}
              </span>
            </label>
            <label className="flex items-start gap-2 text-[13px] cursor-pointer mt-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={marketingOk}
                onChange={(e) => setMarketingOk(e.target.checked)}
              />
              <span className="text-[#525252]">
                {isTr
                  ? 'İletişim için sonradan bana ulaşılabilir (opsiyonel).'
                  : 'You may contact me for follow-up (optional).'}
              </span>
            </label>

            {submitError && (
              <p className="text-[13px] text-[#DC2626] mt-3" role="alert">
                {submitError}
              </p>
            )}

            <button
              type="button"
              className="bz-btn-primary w-full mt-5 justify-center"
              onClick={handleStartQuestions}
            >
              {isTr ? 'Başla' : 'Start'} <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Step: questions */}
        {step === 'questions' && currentQuestion && (
          <div className="bg-white text-[#0A0A0A] rounded-3xl p-6 sm:p-8 bz-fade-in">
            {/* Progress */}
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="pulse-eyebrow text-[#525252]">
                {isTr ? `Soru ${questionIndex + 1} / ${totalQuestions}` : `${questionIndex + 1} / ${totalQuestions}`}
              </span>
              <span className="bz-mono text-[#737373]">%{progress}</span>
            </div>
            <div className="h-1.5 bg-[#EDEDED] rounded-full overflow-hidden mb-5">
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${progress}%`, background: accent }}
              />
            </div>

            <h2 className="bz-h-tight-2 text-[20px] sm:text-[22px]">{currentQuestion.prompt}</h2>
            {currentQuestion.helpText && (
              <p className="text-[13px] text-[#525252] mt-1.5">{currentQuestion.helpText}</p>
            )}
            {!currentQuestion.isRequired && (
              <p className="text-[11px] text-[#737373] mt-1">
                {isTr ? 'Bu soru opsiyonel' : 'This question is optional'}
              </p>
            )}

            <div className="mt-4">
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
              <p className="text-[13px] text-[#DC2626] mt-3" role="alert">
                {submitError}
              </p>
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
                  disabled={!canAdvance || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {isTr ? 'Gönder' : 'Submit'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step: done */}
        {step === 'done' && (
          <div className="bg-white text-[#0A0A0A] rounded-3xl p-8 text-center bz-fade-in">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full text-[#0A0A0A] mb-4"
              style={{ background: accent }}
            >
              <Check size={28} strokeWidth={2.5} />
            </div>
            <h2 className="bz-h-tight-2 text-[22px]">
              {isTr ? 'Teşekkürler!' : 'Thank you!'}
            </h2>
            <p className="text-[14px] text-[#525252] mt-2">
              {isTr
                ? 'Yanıtın alındı. İşletmeniz değerlendirmeyi görecek.'
                : 'Your response was received. The business will see this evaluation.'}
            </p>
            {result && (
              <div className="mt-5 border border-[#EDEDED] rounded-2xl p-4 inline-block min-w-[200px]">
                <p className="pulse-eyebrow text-[#525252]">
                  {isTr ? 'Toplam puan' : 'Total score'}
                </p>
                <p className="text-[36px] font-medium mt-1">
                  {result.score}
                  <span className="text-[#A3A3A3] text-[18px]">/100</span>
                </p>
                {result.passed != null && (
                  <p
                    className={`text-[13px] font-medium mt-1 ${result.passed ? 'text-[#166534]' : 'text-[#991B1B]'}`}
                  >
                    {result.passed
                      ? isTr
                        ? 'Geçti'
                        : 'Passed'
                      : isTr
                        ? 'Eşik aşılamadı'
                        : 'Below threshold'}
                  </p>
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
  const options = getOptions(question);

  if (question.type === 'single' || question.type === 'yes_no') {
    return (
      <div className="space-y-2">
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`w-full text-left rounded-xl border px-4 py-3 text-[14px] transition ${
                selected
                  ? 'border-[#0A0A0A] bg-[#FAFAFA]'
                  : 'border-[#EDEDED] hover:bg-[#FAFAFA]'
              }`}
            >
              <span
                className={`inline-block w-3 h-3 rounded-full border align-middle mr-3 ${
                  selected ? 'border-[#0A0A0A]' : 'border-[#A3A3A3]'
                }`}
                style={selected ? { background: accent, borderColor: '#0A0A0A' } : {}}
              />
              {opt}
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
        {options.map((opt) => {
          const selected = arr.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggleMulti(opt)}
              className={`w-full text-left rounded-xl border px-4 py-3 text-[14px] transition flex items-center gap-3 ${
                selected ? 'border-[#0A0A0A] bg-[#FAFAFA]' : 'border-[#EDEDED] hover:bg-[#FAFAFA]'
              }`}
            >
              <span
                className={`inline-flex items-center justify-center w-4 h-4 rounded border ${
                  selected ? 'border-[#0A0A0A]' : 'border-[#A3A3A3]'
                }`}
                style={selected ? { background: accent, borderColor: '#0A0A0A' } : {}}
              >
                {selected && <Check size={10} strokeWidth={3} />}
              </span>
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === 'scale') {
    const numVal = typeof value === 'number' ? value : null;
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = numVal === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`flex-1 rounded-xl border py-3 text-[16px] font-medium transition ${
                selected
                  ? 'border-[#0A0A0A]'
                  : 'border-[#EDEDED] text-[#525252] hover:bg-[#FAFAFA]'
              }`}
              style={selected ? { background: accent, color: '#0A0A0A' } : {}}
            >
              {n}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === 'text') {
    return (
      <textarea
        className="bz-input min-h-[120px]"
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        maxLength={2000}
        placeholder={isTr ? 'Yanıtın...' : 'Your answer...'}
      />
    );
  }

  // file — placeholder, soon
  return (
    <p className="text-[12px] text-[#737373] italic">
      {isTr ? 'Dosya yükleme yakında eklenecek.' : 'File upload coming soon.'}
    </p>
  );
}
