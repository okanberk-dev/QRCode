'use client';

// Stage 98 — Survey wizard (CLAUDE.md §42).
// 5-step flow: 1) Type, 2) Title+description, 3) Questions (DnD),
// 4) Appearance (accent + KVKK + thank-you), 5) Preview + publish.
// State lives in this component; submit POSTs /api/surveys.

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  GripVertical,
  Loader2,
  Plus,
  Sparkles,
  Star,
  Trash2,
  Type,
  AlignLeft,
  ListChecks,
  Gauge,
} from 'lucide-react';
import { getTranslations, type Locale } from '@/lib/translations';
import { AlertBanner, Badge, Field, PageHeader } from '@/components/ui';
import {
  OPTIONS_MAX,
  OPTIONS_MIN,
  QUESTION_TEXT_MAX,
  SURVEY_QUESTION_TYPES,
  type SurveyQuestionType,
  type SurveyType,
} from '@/lib/surveys';

interface Restaurant {
  id: string;
  name: string;
  primaryColor: string;
}

interface QuestionDraft {
  // local-only id used for DnD identity; server assigns real id
  localId: string;
  text: string;
  type: SurveyQuestionType;
  options: string[];
  required: boolean;
}

interface Props {
  locale: Locale;
  restaurants: Restaurant[];
  initialRestaurantId: string;
}

const ACCENT_SWATCHES = [
  '#C6F24E', // Pulse lime
  '#0A0A0A',
  '#1A73E8',
  '#F97316',
  '#EF4444',
  '#10B981',
  '#A855F7',
  '#0EA5E9',
];

const QUESTION_TYPE_ICONS: Record<SurveyQuestionType, React.ComponentType<{ size?: number }>> = {
  rating: Star,
  nps: Gauge,
  short_text: Type,
  long_text: AlignLeft,
  multiple_choice: ListChecks,
};

function makeLocalId(): string {
  return `q_${Math.random().toString(36).slice(2, 10)}`;
}

function defaultQuestion(type: SurveyQuestionType, locale: Locale): QuestionDraft {
  const isTr = locale === 'tr';
  const placeholderByType: Record<SurveyQuestionType, string> = {
    rating: isTr ? 'Genel memnuniyetinizi 1-5 arası puanlayın' : 'Rate your overall experience 1-5',
    nps: isTr ? 'Bizi bir arkadaşınıza tavsiye eder misiniz? (0-10)' : 'How likely are you to recommend us? (0-10)',
    short_text: isTr ? 'Bir kelime ile yaşadığınızı özetleyin' : 'Sum up your experience in one phrase',
    long_text: isTr ? 'Detaylı geri bildiriminizi paylaşır mısınız?' : 'Share your detailed feedback',
    multiple_choice: isTr ? 'Hangi seçenek size en uygun?' : 'Which option fits best?',
  };
  return {
    localId: makeLocalId(),
    text: placeholderByType[type],
    type,
    options: type === 'multiple_choice'
      ? (isTr ? ['Mükemmel', 'İyi', 'Geliştirilebilir'] : ['Excellent', 'Good', 'Could improve'])
      : [],
    required: true,
  };
}

export default function SurveyWizardClient({
  locale,
  restaurants,
  initialRestaurantId,
}: Props) {
  const t = getTranslations(locale);
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [restaurantId, setRestaurantId] = useState(initialRestaurantId);
  const [type, setType] = useState<SurveyType>('multi_step');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    defaultQuestion('rating', locale),
  ]);
  const [accentColor, setAccentColor] = useState<string>('#C6F24E');
  const [thankYouMessage, setThankYouMessage] = useState('');
  const [kvkkText, setKvkkText] = useState('');
  const [collectContact, setCollectContact] = useState(true);
  const [collectMarketingConsent, setCollectMarketingConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When the user picks 'single' type, force exactly one question.
  const onSelectType = useCallback(
    (newType: SurveyType) => {
      setType(newType);
      if (newType === 'single') {
        setQuestions((qs) =>
          qs.length === 0 ? [defaultQuestion('rating', locale)] : [qs[0]],
        );
      }
    },
    [locale],
  );

  const addQuestion = useCallback(
    (qType: SurveyQuestionType) => {
      setQuestions((qs) => [...qs, defaultQuestion(qType, locale)]);
    },
    [locale],
  );

  const removeQuestion = useCallback((localId: string) => {
    setQuestions((qs) => qs.filter((q) => q.localId !== localId));
  }, []);

  const updateQuestion = useCallback(
    (localId: string, patch: Partial<QuestionDraft>) => {
      setQuestions((qs) => qs.map((q) => (q.localId === localId ? { ...q, ...patch } : q)));
    },
    [],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIdx = questions.findIndex((q) => q.localId === active.id);
      const newIdx = questions.findIndex((q) => q.localId === over.id);
      if (oldIdx < 0 || newIdx < 0) return;
      setQuestions(arrayMove(questions, oldIdx, newIdx));
    },
    [questions],
  );

  const stepValid = useMemo(() => {
    if (step === 1) return !!type;
    if (step === 2) return title.trim().length > 0;
    if (step === 3) {
      if (type === 'single' && questions.length !== 1) return false;
      if (questions.length === 0) return false;
      return questions.every((q) => {
        if (!q.text.trim()) return false;
        if (q.type === 'multiple_choice') {
          const filled = q.options.map((o) => o.trim()).filter(Boolean);
          if (filled.length < OPTIONS_MIN || filled.length > OPTIONS_MAX) return false;
        }
        return true;
      });
    }
    if (step === 4) return !!accentColor;
    return true;
  }, [step, type, title, questions, accentColor]);

  const submit = useCallback(
    async (publish: boolean) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch('/api/surveys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            restaurantId,
            type,
            title: title.trim(),
            description: description.trim() || null,
            accentColor,
            thankYouMessage: thankYouMessage.trim() || null,
            kvkkText: kvkkText.trim() || null,
            collectMarketingConsent,
            collectContact,
            isPublished: publish,
            questions: questions.map((q) => ({
              text: q.text.trim(),
              type: q.type,
              required: q.required,
              options:
                q.type === 'multiple_choice'
                  ? q.options.map((o) => o.trim()).filter(Boolean)
                  : undefined,
            })),
          }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.message || json?.error || 'create_failed');
        }
        const json = await res.json();
        router.push(`/${locale}/dashboard/surveys/${json.survey.id}`);
      } catch (err) {
        setError(
          (err as Error).message ||
            (locale === 'tr'
              ? 'Anket oluşturulamadı. Tekrar deneyin.'
              : 'Could not create survey. Try again.'),
        );
        setSaving(false);
      }
    },
    [
      restaurantId,
      type,
      title,
      description,
      accentColor,
      thankYouMessage,
      kvkkText,
      collectMarketingConsent,
      collectContact,
      questions,
      router,
      locale,
    ],
  );

  const steps: { id: 1 | 2 | 3 | 4 | 5; label: string }[] = [
    { id: 1, label: t.survey_wizard_step1 },
    { id: 2, label: t.survey_wizard_step2 },
    { id: 3, label: t.survey_wizard_step3 },
    { id: 4, label: t.survey_wizard_step4 },
    { id: 5, label: t.survey_wizard_step5 },
  ];

  return (
    <div className="mx-auto max-w-[920px] px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow={locale === 'tr' ? 'CRM · ANKET WIZARD' : 'CRM · SURVEY WIZARD'}
        title={t.survey_wizard_title}
        description={
          locale === 'tr'
            ? 'Adımları takip ederek QR ile dağıtacağınız anketi hazırlayın.'
            : 'Follow the steps to prepare a survey you can distribute via QR.'
        }
      />

      {/* Step indicator */}
      <ol className="mt-6 flex flex-wrap items-center gap-2 text-xs">
        {steps.map((s) => {
          const completed = step > s.id;
          const active = step === s.id;
          return (
            <li
              key={s.id}
              className={[
                'flex items-center gap-2 rounded-full border px-3 py-1.5',
                active
                  ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                  : completed
                  ? 'border-[#A8D62E] bg-[#EAF9B8] text-[#0A0A0A]'
                  : 'border-[#EDEDED] bg-white text-[#737373]',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold',
                  active
                    ? 'bg-[#C6F24E] text-[#0A0A0A]'
                    : completed
                    ? 'bg-[#0A0A0A] text-white'
                    : 'bg-[#EDEDED] text-[#737373]',
                ].join(' ')}
              >
                {completed ? <CheckCircle2 size={12} /> : s.id}
              </span>
              <span>{s.label}</span>
            </li>
          );
        })}
      </ol>

      <section className="bz-card mt-6 p-5 sm:p-8">
        {error && (
          <div className="mb-5">
            <AlertBanner kind="danger" onDismiss={() => setError(null)}>
              {error}
            </AlertBanner>
          </div>
        )}

        {step === 1 && (
          <Step1Type
            locale={locale}
            type={type}
            onChange={onSelectType}
            restaurants={restaurants}
            restaurantId={restaurantId}
            setRestaurantId={setRestaurantId}
          />
        )}

        {step === 2 && (
          <Step2Title
            locale={locale}
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            t={t}
          />
        )}

        {step === 3 && (
          <Step3Questions
            locale={locale}
            type={type}
            questions={questions}
            sensors={sensors}
            onDragEnd={onDragEnd}
            addQuestion={addQuestion}
            removeQuestion={removeQuestion}
            updateQuestion={updateQuestion}
            t={t}
          />
        )}

        {step === 4 && (
          <Step4Appearance
            locale={locale}
            accentColor={accentColor}
            setAccentColor={setAccentColor}
            thankYouMessage={thankYouMessage}
            setThankYouMessage={setThankYouMessage}
            kvkkText={kvkkText}
            setKvkkText={setKvkkText}
            collectContact={collectContact}
            setCollectContact={setCollectContact}
            collectMarketingConsent={collectMarketingConsent}
            setCollectMarketingConsent={setCollectMarketingConsent}
            t={t}
          />
        )}

        {step === 5 && (
          <Step5Preview
            locale={locale}
            type={type}
            title={title}
            description={description}
            questions={questions}
            accentColor={accentColor}
            thankYouMessage={thankYouMessage}
            t={t}
          />
        )}

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4 | 5) : 1))}
                className="bz-btn-ghost inline-flex items-center gap-2 text-sm"
                disabled={saving}
              >
                <ArrowLeft size={14} />
                {t.survey_wizard_prev}
              </button>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {step < 5 && (
              <button
                type="button"
                onClick={() =>
                  stepValid && setStep((s) => (s < 5 ? ((s + 1) as 1 | 2 | 3 | 4 | 5) : 5))
                }
                disabled={!stepValid || saving}
                className="bz-btn-primary inline-flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {t.survey_wizard_next}
                <ArrowRight size={14} />
              </button>
            )}
            {step === 5 && (
              <>
                <button
                  type="button"
                  onClick={() => submit(false)}
                  disabled={saving}
                  className="bz-btn-ghost inline-flex items-center justify-center gap-2 text-sm"
                >
                  {saving && <Loader2 className="animate-spin" size={14} />}
                  {t.survey_wizard_save_draft}
                </button>
                <button
                  type="button"
                  onClick={() => submit(true)}
                  disabled={saving}
                  className="bz-btn-primary inline-flex items-center justify-center gap-2 text-sm"
                >
                  {saving && <Loader2 className="animate-spin" size={14} />}
                  <Sparkles size={14} />
                  {t.survey_wizard_publish}
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Step 1 — type + restaurant ───────────────────────────────────────────

function Step1Type({
  locale,
  type,
  onChange,
  restaurants,
  restaurantId,
  setRestaurantId,
}: {
  locale: Locale;
  type: SurveyType;
  onChange: (t: SurveyType) => void;
  restaurants: Restaurant[];
  restaurantId: string;
  setRestaurantId: (id: string) => void;
}) {
  const t = getTranslations(locale);
  return (
    <div>
      <h2 className="bz-h-tight text-lg">
        {locale === 'tr' ? 'Anket tipini seçin' : 'Choose a survey type'}
      </h2>
      <p className="mt-1 text-sm text-[#525252]">
        {locale === 'tr'
          ? 'İki tip sunuyoruz: hızlı tek soru veya derin aşamalı anket.'
          : 'Two options: quick single-question or deeper step-by-step.'}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {(['single', 'multi_step'] as const).map((value) => {
          const active = type === value;
          return (
            <button
              type="button"
              key={value}
              onClick={() => onChange(value)}
              className={[
                'group flex flex-col gap-3 rounded-2xl border-2 p-5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]',
                active
                  ? 'border-[#0A0A0A] bg-[#EAF9B8]/40'
                  : 'border-[#EDEDED] bg-white hover:border-[#A3A3A3]',
              ].join(' ')}
            >
              <div className="flex items-center gap-2">
                <Badge kind={active ? 'lime' : 'ghost'}>
                  {value === 'single' ? t.surveys_type_single : t.surveys_type_multi}
                </Badge>
              </div>
              <div className="bz-h-tight text-base">
                {value === 'single'
                  ? locale === 'tr'
                    ? 'Tek soruluk hızlı anket'
                    : 'Quick single-question survey'
                  : locale === 'tr'
                  ? 'Aşamalı detaylı anket'
                  : 'Multi-step detailed survey'}
              </div>
              <p className="text-sm text-[#525252]">
                {value === 'single' ? t.survey_type_single_desc : t.survey_type_multi_desc}
              </p>
            </button>
          );
        })}
      </div>

      {restaurants.length > 1 && (
        <div className="mt-6">
          <Field
            label={locale === 'tr' ? 'İşletme' : 'Business'}
            hint={
              locale === 'tr'
                ? 'Anket bu işletmenin müşterilerine yönelik olacak.'
                : 'This survey will target this business\'s customers.'
            }
          >
            <select
              value={restaurantId}
              onChange={(e) => setRestaurantId(e.target.value)}
              className="bz-input"
            >
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
    </div>
  );
}

// ─── Step 2 — title + description ────────────────────────────────────────

function Step2Title({
  locale,
  title,
  setTitle,
  description,
  setDescription,
  t,
}: {
  locale: Locale;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  t: ReturnType<typeof getTranslations>;
}) {
  return (
    <div>
      <h2 className="bz-h-tight text-lg">
        {locale === 'tr' ? 'Anket başlığı' : 'Survey title'}
      </h2>
      <p className="mt-1 text-sm text-[#525252]">
        {locale === 'tr'
          ? 'Müşterinin gördüğü ilk metin. Net ve kısa olsun.'
          : 'The first text the customer sees. Keep it clear and short.'}
      </p>
      <div className="mt-5 space-y-4">
        <Field
          label={t.survey_form_title_label}
          required
          hint={`${title.length} / 140`}
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 140))}
            placeholder={t.survey_form_title_placeholder}
            className="bz-input"
            maxLength={140}
          />
        </Field>
        <Field label={t.survey_form_description_label} hint={`${description.length} / 1000`}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
            placeholder={t.survey_form_description_placeholder}
            className="bz-input min-h-[120px]"
            maxLength={1000}
          />
        </Field>
      </div>
    </div>
  );
}

// ─── Step 3 — questions (DnD) ────────────────────────────────────────────

function Step3Questions({
  locale,
  type,
  questions,
  sensors,
  onDragEnd,
  addQuestion,
  removeQuestion,
  updateQuestion,
  t,
}: {
  locale: Locale;
  type: SurveyType;
  questions: QuestionDraft[];
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (e: DragEndEvent) => void;
  addQuestion: (q: SurveyQuestionType) => void;
  removeQuestion: (id: string) => void;
  updateQuestion: (id: string, patch: Partial<QuestionDraft>) => void;
  t: ReturnType<typeof getTranslations>;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const canAdd = type === 'multi_step' || questions.length === 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="bz-h-tight text-lg">{t.survey_questions_title}</h2>
          <p className="mt-1 text-sm text-[#525252]">
            {type === 'single'
              ? locale === 'tr'
                ? 'Tek soruluk anket için 1 soru yeterli.'
                : 'Single-question surveys need one question.'
              : locale === 'tr'
              ? 'Soruları sürükleyerek sıralayabilirsiniz.'
              : 'Drag to reorder.'}
          </p>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="mt-5 rounded-2xl border-2 border-dashed border-[#EDEDED] p-8 text-center">
          <p className="text-sm text-[#525252]">{t.survey_questions_empty}</p>
        </div>
      ) : (
        <div className="mt-5">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={questions.map((q) => q.localId)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-3">
                {questions.map((q, idx) => (
                  <SortableQuestionRow
                    key={q.localId}
                    index={idx}
                    question={q}
                    locale={locale}
                    onRemove={() => removeQuestion(q.localId)}
                    onUpdate={(patch) => updateQuestion(q.localId, patch)}
                    canRemove={questions.length > 1 || type === 'multi_step'}
                    t={t}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {canAdd && (
        <div className="mt-5 relative">
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="bz-btn-ghost inline-flex items-center gap-2 text-sm"
          >
            <Plus size={14} />
            {t.survey_question_add}
            <ChevronDown size={14} />
          </button>
          {pickerOpen && (
            <div className="absolute z-20 mt-2 w-64 rounded-xl border border-[#EDEDED] bg-white p-1 shadow-lg">
              {SURVEY_QUESTION_TYPES.map((qType) => {
                const Icon = QUESTION_TYPE_ICONS[qType];
                const label =
                  qType === 'rating'
                    ? t.survey_question_type_rating
                    : qType === 'nps'
                    ? t.survey_question_type_nps
                    : qType === 'short_text'
                    ? t.survey_question_type_short_text
                    : qType === 'long_text'
                    ? t.survey_question_type_long_text
                    : t.survey_question_type_multiple_choice;
                return (
                  <button
                    key={qType}
                    type="button"
                    onClick={() => {
                      addQuestion(qType);
                      setPickerOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[#FAFAFA]"
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SortableQuestionRow({
  question,
  index,
  locale,
  onRemove,
  onUpdate,
  canRemove,
  t,
}: {
  question: QuestionDraft;
  index: number;
  locale: Locale;
  onRemove: () => void;
  onUpdate: (patch: Partial<QuestionDraft>) => void;
  canRemove: boolean;
  t: ReturnType<typeof getTranslations>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.localId,
  });
  const Icon = QUESTION_TYPE_ICONS[question.type];
  const typeLabel =
    question.type === 'rating'
      ? t.survey_question_type_rating
      : question.type === 'nps'
      ? t.survey_question_type_nps
      : question.type === 'short_text'
      ? t.survey_question_type_short_text
      : question.type === 'long_text'
      ? t.survey_question_type_long_text
      : t.survey_question_type_multiple_choice;

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
      }}
      className="rounded-2xl border border-[#EDEDED] bg-white p-4"
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={locale === 'tr' ? 'Soruyu sürükle' : 'Reorder question'}
          className="mt-1 cursor-grab rounded-md p-1 text-[#A3A3A3] hover:bg-[#FAFAFA] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </button>
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Badge kind="ghost">
              <span className="inline-flex items-center gap-1">
                <Icon size={11} /> {typeLabel}
              </span>
            </Badge>
            <span className="text-xs text-[#737373]">#{index + 1}</span>
          </div>
          <input
            type="text"
            value={question.text}
            onChange={(e) =>
              onUpdate({ text: e.target.value.slice(0, QUESTION_TEXT_MAX) })
            }
            placeholder={t.survey_question_text_label}
            className="bz-input"
            maxLength={QUESTION_TEXT_MAX}
          />

          {question.type === 'multiple_choice' && (
            <MultiChoiceEditor
              options={question.options}
              onChange={(options) => onUpdate({ options })}
              locale={locale}
              t={t}
            />
          )}

          <label className="flex items-center gap-2 text-xs text-[#525252]">
            <input
              type="checkbox"
              checked={question.required}
              onChange={(e) => onUpdate({ required: e.target.checked })}
              className="h-4 w-4 rounded border-[#EDEDED]"
            />
            {t.survey_question_required_label}
          </label>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={locale === 'tr' ? 'Soruyu sil' : 'Remove question'}
            className="mt-1 rounded-md p-1 text-[#737373] hover:bg-[#FEE2E2] hover:text-[#991B1B]"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </li>
  );
}

function MultiChoiceEditor({
  options,
  onChange,
  locale,
  t,
}: {
  options: string[];
  onChange: (opts: string[]) => void;
  locale: Locale;
  t: ReturnType<typeof getTranslations>;
}) {
  const canAdd = options.length < OPTIONS_MAX;
  const filledCount = options.map((o) => o.trim()).filter(Boolean).length;
  return (
    <div className="rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-[#525252]">
          {t.survey_question_options_label}
        </span>
        <span className="text-[10px] text-[#737373]">
          {filledCount} / {OPTIONS_MAX}
        </span>
      </div>
      <ul className="space-y-2">
        {options.map((opt, idx) => (
          <li key={idx} className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] text-[#737373]">
              {String.fromCharCode(65 + idx)}
            </span>
            <input
              type="text"
              value={opt}
              onChange={(e) => {
                const next = [...options];
                next[idx] = e.target.value.slice(0, 80);
                onChange(next);
              }}
              placeholder={t.survey_question_option_placeholder}
              className="bz-input flex-1"
              maxLength={80}
            />
            {options.length > OPTIONS_MIN && (
              <button
                type="button"
                onClick={() => onChange(options.filter((_, i) => i !== idx))}
                aria-label={locale === 'tr' ? 'Seçeneği sil' : 'Remove option'}
                className="rounded-md p-1 text-[#737373] hover:bg-[#FEE2E2] hover:text-[#991B1B]"
              >
                <Trash2 size={12} />
              </button>
            )}
          </li>
        ))}
      </ul>
      {canAdd && (
        <button
          type="button"
          onClick={() => onChange([...options, ''])}
          className="mt-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#0A0A0A] hover:bg-white"
        >
          <Plus size={12} />
          {t.survey_question_option_add}
        </button>
      )}
      {filledCount < OPTIONS_MIN && (
        <p className="mt-2 text-[10px] text-[#991B1B]">{t.survey_question_options_min}</p>
      )}
    </div>
  );
}

// ─── Step 4 — appearance ─────────────────────────────────────────────────

function Step4Appearance({
  locale,
  accentColor,
  setAccentColor,
  thankYouMessage,
  setThankYouMessage,
  kvkkText,
  setKvkkText,
  collectContact,
  setCollectContact,
  collectMarketingConsent,
  setCollectMarketingConsent,
  t,
}: {
  locale: Locale;
  accentColor: string;
  setAccentColor: (v: string) => void;
  thankYouMessage: string;
  setThankYouMessage: (v: string) => void;
  kvkkText: string;
  setKvkkText: (v: string) => void;
  collectContact: boolean;
  setCollectContact: (v: boolean) => void;
  collectMarketingConsent: boolean;
  setCollectMarketingConsent: (v: boolean) => void;
  t: ReturnType<typeof getTranslations>;
}) {
  return (
    <div>
      <h2 className="bz-h-tight text-lg">
        {locale === 'tr' ? 'Görünüm & ayarlar' : 'Appearance & settings'}
      </h2>
      <p className="mt-1 text-sm text-[#525252]">
        {locale === 'tr'
          ? 'Anket sayfanızın rengini ve müşteri akışını ayarlayın.'
          : 'Tune the colour and customer flow.'}
      </p>

      <div className="mt-5 space-y-5">
        <div>
          <span className="block text-xs font-medium text-[#525252]">
            {t.survey_form_accent_label}
          </span>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {ACCENT_SWATCHES.map((c) => {
              const active = c.toLowerCase() === accentColor.toLowerCase();
              return (
                <button
                  type="button"
                  key={c}
                  onClick={() => setAccentColor(c)}
                  className={[
                    'h-8 w-8 rounded-full border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]',
                    active ? 'border-[#0A0A0A]' : 'border-transparent',
                  ].join(' ')}
                  style={{ backgroundColor: c }}
                  aria-label={`accent ${c}`}
                />
              );
            })}
            <label className="inline-flex items-center gap-2 rounded-full border border-[#EDEDED] px-2 py-1 text-xs">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-5 w-7 cursor-pointer border-none bg-transparent p-0"
              />
              <span className="text-[#525252]">
                {locale === 'tr' ? 'Özel' : 'Custom'}
              </span>
            </label>
          </div>
        </div>

        <Field
          label={t.survey_form_thank_you_label}
          hint={`${thankYouMessage.length} / 600`}
        >
          <textarea
            value={thankYouMessage}
            onChange={(e) => setThankYouMessage(e.target.value.slice(0, 600))}
            placeholder={t.survey_form_thank_you_placeholder}
            className="bz-input min-h-[100px]"
            maxLength={600}
          />
        </Field>

        <Field label={t.survey_form_kvkk_label} hint={`${kvkkText.length} / 4000`}>
          <textarea
            value={kvkkText}
            onChange={(e) => setKvkkText(e.target.value.slice(0, 4000))}
            placeholder={t.survey_form_kvkk_placeholder}
            className="bz-input min-h-[100px]"
            maxLength={4000}
          />
        </Field>

        <div className="space-y-2 rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-4">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={collectContact}
              onChange={(e) => setCollectContact(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[#EDEDED]"
            />
            <span>{t.survey_form_collect_contact}</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={collectMarketingConsent}
              onChange={(e) => setCollectMarketingConsent(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[#EDEDED]"
            />
            <span>{t.survey_form_collect_marketing}</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// ─── Step 5 — preview ────────────────────────────────────────────────────

function Step5Preview({
  locale,
  type,
  title,
  description,
  questions,
  accentColor,
  thankYouMessage,
  t,
}: {
  locale: Locale;
  type: SurveyType;
  title: string;
  description: string;
  questions: QuestionDraft[];
  accentColor: string;
  thankYouMessage: string;
  t: ReturnType<typeof getTranslations>;
}) {
  return (
    <div>
      <h2 className="bz-h-tight text-lg">{t.survey_preview_title}</h2>
      <p className="mt-1 text-sm text-[#525252]">
        {locale === 'tr'
          ? 'Müşteriniz QR kodu okuttuğunda göreceği ekran.'
          : 'What your customers will see after scanning the QR.'}
      </p>

      <div className="mt-5 overflow-hidden rounded-3xl border border-[#EDEDED] bg-[#FAFAFA] p-4 sm:p-6">
        <div className="rounded-2xl bg-white p-5 sm:p-7 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <Badge kind="lime">
              {type === 'single' ? t.surveys_type_single : t.surveys_type_multi}
            </Badge>
            <span
              className="inline-block h-2 w-12 rounded-full"
              style={{ backgroundColor: accentColor }}
            />
          </div>
          <h3 className="bz-h-tight text-xl">{title || '…'}</h3>
          {description && (
            <p className="mt-2 text-sm text-[#525252]">{description}</p>
          )}
          <ul className="mt-5 space-y-4">
            {questions.map((q, idx) => (
              <li key={q.localId} className="rounded-xl border border-[#EDEDED] p-4">
                <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-[#737373]">
                  <span>{t.survey_public_step}</span>
                  <span>{idx + 1}</span>
                  <span>{t.survey_public_of}</span>
                  <span>{questions.length}</span>
                  {q.required && <Badge kind="warn">*</Badge>}
                </div>
                <p className="text-sm font-medium text-[#0A0A0A]">{q.text}</p>
                <div className="mt-3 text-xs text-[#737373]">
                  {q.type === 'rating' && (
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} size={18} className="text-[#A3A3A3]" />
                      ))}
                    </div>
                  )}
                  {q.type === 'nps' && (
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                        <span
                          key={n}
                          className="inline-block h-6 w-6 rounded-md border border-[#EDEDED] text-center text-[10px] leading-6"
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  )}
                  {q.type === 'short_text' && (
                    <div className="h-9 rounded-md border border-[#EDEDED] bg-[#FAFAFA]" />
                  )}
                  {q.type === 'long_text' && (
                    <div className="h-20 rounded-md border border-[#EDEDED] bg-[#FAFAFA]" />
                  )}
                  {q.type === 'multiple_choice' && (
                    <ul className="space-y-1.5">
                      {q.options
                        .map((o) => o.trim())
                        .filter(Boolean)
                        .map((o, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-2 rounded-md border border-[#EDEDED] bg-white px-3 py-1.5"
                          >
                            <span className="h-3 w-3 rounded-full border border-[#A3A3A3]" />
                            <span className="text-[12px] text-[#0A0A0A]">{o}</span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-5 rounded-xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-3 text-xs text-[#525252]">
            <strong>{t.survey_public_thank_you}</strong>{' '}
            {thankYouMessage || t.survey_public_thank_you_default}
          </div>
        </div>
      </div>
    </div>
  );
}
