'use client';

// Surveys — the single-page editor (create + edit; replaces the 5-step wizard).
//
// Create: phase A "pick a starting point" (templates) → phase B "edit + live
// preview". `?template=<id>` goes straight to phase B. Edit: phase B only, with
// the stored survey.
//
// Lossless editing (CLAUDE.md data rule: answers must never vanish by accident):
//   - stored questions keep their id and are updated IN PLACE on save;
//   - only questions the owner deleted here are sent in `removedQuestionIds`
//     (the server refuses every other removal with 409);
//   - answered questions keep their type, answered choice options are locked,
//     deleting an answered question asks first and names the answer count;
//   - a 409 "changed somewhere else" asks for a reload instead of overwriting.
//
// The module switch (`surveysEnabled`) is explained BEFORE the owner fills
// anything: create shows only the notice; edit shows it on top and hides the
// buttons that publish.
//
// Business: create targets the business picked in the shell's switcher (the
// only business picker — `useActiveBusinessSelection` follows it); the page
// shows that business as read-only text.
//
// Layout: two columns from `lg` (form | sticky phone preview), one column below
// with a "Preview" button that opens the same phone in a modal. The action bar
// is sticky above the floating bottom nav on phones.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Loader2,
  Plus,
  Save,
  Send,
  Smartphone,
} from 'lucide-react';
import {
  AlertBanner,
  APSwitch,
  Field,
  Modal,
  PageHeader,
  useConfirmDialog,
} from '@/components/ui';
import { useActiveBusinessSelection } from '@/components/audits/useActiveBusinessSelection';
import { detectSector } from '@/lib/sector-platforms';
import { SECTORS } from '@/lib/sectors';
import {
  estimateSurveySeconds,
  formatSurveyDuration,
  MAX_QUESTIONS_PER_SURVEY,
  TITLE_MAX,
  DESCRIPTION_MAX,
  THANK_YOU_MAX,
} from '@/lib/surveys';
import {
  SURVEY_TEMPLATE_THANK_YOU,
  getSurveyTemplate,
  instantiateTemplate,
} from '@/lib/survey-templates';
import { normaliseHex } from '@/lib/qr-colors';
import QuestionCard, { QUESTION_TYPE_ICONS, type QuestionCardHandle } from './QuestionCard';
import SurveyPhonePreview from './SurveyPhonePreview';
import SurveyTemplatePicker, { type TemplatePick } from './SurveyTemplatePicker';
import { useUnsavedGuard } from './useUnsavedGuard';
import {
  QUESTION_TYPE_LABELS,
  QUESTION_TYPE_MENU_ORDER,
  accentChoices,
  blankEditorQuestion,
  blankForm,
  buildCreateBody,
  buildPatchBody,
  describeSaveError,
  duplicateEditorQuestion,
  editorSnapshot,
  formFromStored,
  formFromTemplate,
  insertDuplicate,
  isPresetAccent,
  moveQuestion,
  rebaseAfterSave,
  removeQuestionFromForm,
  validateEditor,
  type EditorForm,
  type EditorLocale,
  type EditorQuestion,
  type FocusTarget,
  type SaveErrorInfo,
  type StoredEditorSurvey,
} from './survey-editor-state';

export interface EditorRestaurant {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
  category: string | null;
  /** Admin master switch (feature-access). */
  surveysEnabled: boolean;
}

export interface SurveyEditorProps {
  mode: 'create' | 'edit';
  locale: EditorLocale;
  /** Create: every business the owner may use. Edit: just the survey's business. */
  restaurants: EditorRestaurant[];
  /** Create: the business the server resolved (URL `?restaurantId` or the first). */
  initialRestaurantId: string;
  /** Create: `?template=` value ('blank' or a template id), already validated. */
  initialTemplate?: string | null;
  /** Edit: the stored survey with answer counts and used options. */
  survey?: StoredEditorSurvey | null;
}

type Phase = 'pick' | 'edit';
type SubmitAction = 'draft' | 'publish' | 'save' | 'saveAndPublish';

const MODULE_OFF_MESSAGE = {
  tr: 'Anket modülü bu işletme için Buaze yönetimi tarafından kapatıldı. Yeni anket oluşturamaz veya yayınlayamazsın.',
  en: 'The Surveys module is turned off by Buaze for this business. You can\'t create or publish surveys.',
} as const;

/** Deterministic ids for the first render, so server and browser build the same state. */
function sequentialIds(prefix: string): () => string {
  let n = 0;
  return () => {
    n += 1;
    return `${prefix}_${n}`;
  };
}

function initialFormFor(
  mode: 'create' | 'edit',
  locale: EditorLocale,
  template: string | null | undefined,
  survey: StoredEditorSurvey | null | undefined,
  brandColor: string,
): EditorForm {
  const makeId = sequentialIds('q_init');
  const makeKey = sequentialIds('o_init');
  if (mode === 'edit' && survey) return formFromStored(survey, brandColor, makeId, makeKey);
  if (template && template !== 'blank') {
    const t = getSurveyTemplate(template);
    if (t) return formFromTemplate(instantiateTemplate(t, locale, makeId), makeKey);
  }
  return blankForm(makeId, makeKey);
}

// The live phone only fits beside the form when the screen is wide AND tall
// enough to keep it clear of the sticky action bar; on a short screen (a
// landscape tablet, a small laptop) the "Preview" button opens it in a modal.
// Keep this query in sync with the `[@media(...)]` classes below.
const TALL_DESKTOP_QUERY = '(min-width: 1024px) and (min-height: 740px)';

function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(TALL_DESKTOP_QUERY);
    const sync = () => setDesktop(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  return desktop;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function setTemplateParam(value: string | null) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set('template', value);
  else url.searchParams.delete('template');
  // replaceState (not router.replace): the page is force-dynamic and a router
  // call would run the server component again.
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

export default function SurveyEditorClient({
  mode,
  locale,
  restaurants,
  initialRestaurantId,
  initialTemplate = null,
  survey = null,
}: SurveyEditorProps) {
  const isTr = locale === 'tr';
  const isEdit = mode === 'edit' && survey !== null;
  const router = useRouter();
  const uid = useId();
  const ids = {
    title: `${uid}-title`,
    description: `${uid}-description`,
    thanks: `${uid}-thanks`,
    couponCode: `${uid}-coupon-code`,
    couponLabel: `${uid}-coupon-label`,
    settings: `${uid}-settings`,
    addLabel: `${uid}-add-label`,
  };

  // ── Business ────────────────────────────────────────────────────────────
  const business = useActiveBusinessSelection(restaurants, initialRestaurantId);
  const restaurant: EditorRestaurant | null = isEdit
    ? (restaurants.find((r) => r.id === initialRestaurantId) ?? restaurants[0] ?? null)
    : (restaurants.find((r) => r.id === business.activeId) ??
        restaurants.find((r) => r.id === initialRestaurantId) ??
        restaurants[0] ??
        null);
  const moduleOff = restaurant ? restaurant.surveysEnabled === false : false;
  const sector = detectSector(restaurant?.category);
  const sectorLabel = SECTORS.find((s) => s.sectorKey === sector)?.display[locale] ?? '';
  const brandColor = restaurant?.primaryColor ?? '#C6F24E';

  // ── Form ────────────────────────────────────────────────────────────────
  const [initialForm, setInitialForm] = useState<EditorForm>(() =>
    initialFormFor(mode, locale, initialTemplate, survey, brandColor),
  );
  const [form, setForm] = useState<EditorForm>(initialForm);
  const [phase, setPhase] = useState<Phase>(() => {
    if (isEdit) return 'edit';
    return initialTemplate && (initialTemplate === 'blank' || getSurveyTemplate(initialTemplate))
      ? 'edit'
      : 'pick';
  });
  const [descriptionOpen, setDescriptionOpen] = useState(() => form.description.trim() !== '');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const isDesktop = useIsDesktop();

  const [attempted, setAttempted] = useState(false);
  const [lastAction, setLastAction] = useState<SubmitAction>('draft');
  const [submitting, setSubmitting] = useState<SubmitAction | null>(null);
  const [serverError, setServerError] = useState<SaveErrorInfo | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const inFlightRef = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, QuestionCardHandle>());
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const [confirmEl, askConfirm] = useConfirmDialog();

  const patch = useCallback((partial: Partial<EditorForm>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────
  const baselineSnapshot = useMemo(() => editorSnapshot(initialForm), [initialForm]);
  const dirty = phase === 'edit' && editorSnapshot(form) !== baselineSnapshot;
  const { dialog: guardDialog, releaseGuard } = useUnsavedGuard(dirty, locale);

  const validation = useMemo(
    () =>
      validateEditor(form, {
        locale,
        initialCoupon: isEdit
          ? { code: initialForm.couponCode, label: initialForm.couponLabel }
          : undefined,
      }),
    [form, locale, isEdit, initialForm.couponCode, initialForm.couponLabel],
  );

  const questionCount = form.questions.length;
  const maxReached = questionCount >= MAX_QUESTIONS_PER_SURVEY;
  const duration = formatSurveyDuration(estimateSurveySeconds(questionCount), locale);
  const responseCount = survey?.responseCount ?? 0;
  const isPublished = survey?.isPublished ?? false;
  const listHref = `/${locale}/dashboard/surveys${
    !isEdit && restaurant ? `?restaurantId=${encodeURIComponent(restaurant.id)}` : ''
  }`;
  const detailHref = isEdit && survey ? `/${locale}/dashboard/surveys/${survey.id}` : listHref;
  const busy = submitting !== null;

  // ── Focus helpers ───────────────────────────────────────────────────────
  const focusTarget = useCallback(
    (target: FocusTarget) => {
      const reveal = (el: HTMLElement | null) => {
        if (!el) return;
        el.focus();
        el.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      };
      switch (target.kind) {
        case 'title':
          reveal(document.getElementById(ids.title));
          break;
        case 'questions':
          reveal(document.getElementById(`${uid}-add-first`));
          break;
        case 'question':
          cardRefs.current.get(target.localId)?.focusText();
          break;
        case 'option':
          cardRefs.current.get(target.localId)?.focusOption(target.index);
          break;
        case 'coupon':
          setSettingsOpen(true);
          window.requestAnimationFrame(() => reveal(document.getElementById(ids.couponLabel)));
          break;
      }
    },
    [ids.title, ids.couponLabel, uid],
  );

  // A question that was just added gets the cursor.
  useEffect(() => {
    if (!pendingFocusId) return;
    cardRefs.current.get(pendingFocusId)?.focusText();
    setPendingFocusId(null);
  }, [pendingFocusId, form.questions]);

  // The server message must not stay below the fold.
  useEffect(() => {
    if (!serverError) return;
    errorRef.current?.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [serverError]);

  // Desktop, fresh survey: start typing the title right away (never on touch
  // devices — it would pop the keyboard open).
  useEffect(() => {
    if (isEdit || phase !== 'edit') return;
    if (!window.matchMedia?.('(pointer: fine)').matches) return;
    document.getElementById(ids.title)?.focus({ preventScroll: true });
    // Only when the editor first appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Question operations ─────────────────────────────────────────────────
  const updateQuestion = useCallback((localId: string, next: EditorQuestion) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.localId === localId ? next : q)),
    }));
  }, []);

  function addQuestion(type: EditorQuestion['type']) {
    if (form.questions.length >= MAX_QUESTIONS_PER_SURVEY) return;
    const q = blankEditorQuestion(type);
    setForm((prev) => ({ ...prev, questions: [...prev.questions, q] }));
    setPendingFocusId(q.localId);
    setAnnouncement(isTr ? 'Soru eklendi' : 'Question added');
  }

  function move(index: number, direction: -1 | 1) {
    setForm((prev) => ({ ...prev, questions: moveQuestion(prev.questions, index, direction) }));
    setAnnouncement(
      isTr
        ? `Soru ${index + 1}, ${direction === -1 ? 'yukarı' : 'aşağı'} taşındı`
        : `Question ${index + 1} moved ${direction === -1 ? 'up' : 'down'}`,
    );
  }

  function duplicate(index: number) {
    if (form.questions.length >= MAX_QUESTIONS_PER_SURVEY) return;
    const source = form.questions[index];
    if (!source) return;
    const copy = duplicateEditorQuestion(source);
    setForm((prev) => ({ ...prev, questions: insertDuplicate(prev.questions, index, copy) }));
    setPendingFocusId(copy.localId);
    setAnnouncement(isTr ? 'Soru çoğaltıldı' : 'Question duplicated');
  }

  function requestDelete(q: EditorQuestion) {
    if (form.questions.length <= 1) return;
    const remove = () => {
      setForm((prev) => removeQuestionFromForm(prev, q.localId));
      setAnnouncement(isTr ? 'Soru silindi' : 'Question deleted');
    };
    if (q.id && q.answerCount > 0) {
      askConfirm({
        title: isTr ? 'Bu soru silinsin mi?' : 'Delete this question?',
        body: isTr
          ? `Bu sorunun ${q.answerCount} yanıtı da silinecek. Bu işlem geri alınamaz.`
          : `This question's ${q.answerCount} responses will be deleted too. This can't be undone.`,
        variant: 'danger',
        confirmLabel: isTr ? 'Sil' : 'Delete',
        cancelLabel: isTr ? 'Vazgeç' : 'Cancel',
        onConfirm: remove,
      });
      return;
    }
    remove();
  }

  // ── Template flow (create) ──────────────────────────────────────────────
  function pickTemplate(pick: TemplatePick) {
    const template = pick === 'blank' ? undefined : getSurveyTemplate(pick);
    const next = template
      ? formFromTemplate(instantiateTemplate(template, locale))
      : blankForm();
    setInitialForm(next);
    setForm(next);
    setDescriptionOpen(false);
    setSettingsOpen(false);
    setAttempted(false);
    setServerError(null);
    setPhase('edit');
    setTemplateParam(pick);
    window.requestAnimationFrame(() => {
      document.getElementById(`${uid}-top`)?.scrollIntoView({ block: 'start', behavior: 'auto' });
    });
  }

  function backToTemplates() {
    const go = () => {
      setPhase('pick');
      setAttempted(false);
      setServerError(null);
      setTemplateParam(null);
      window.requestAnimationFrame(() => {
        document.getElementById(`${uid}-top`)?.scrollIntoView({ block: 'start', behavior: 'auto' });
      });
    };
    if (!dirty) {
      go();
      return;
    }
    askConfirm({
      title: isTr ? 'Şablon değişsin mi?' : 'Change the template?',
      body: isTr
        ? 'Şu ana kadar yaptığın değişiklikler kaybolacak.'
        : "The changes you've made so far will be lost.",
      variant: 'danger',
      confirmLabel: isTr ? 'Şablonu değiştir' : 'Change template',
      cancelLabel: isTr ? 'Vazgeç' : 'Cancel',
      onConfirm: go,
    });
  }

  // ── Save ────────────────────────────────────────────────────────────────
  async function submit(action: SubmitAction) {
    if (inFlightRef.current || !restaurant) return;
    setLastAction(action);
    setAttempted(true);
    if (!validation.ok) {
      setServerError(null);
      if (validation.first) focusTarget(validation.first);
      return;
    }

    inFlightRef.current = true;
    setSubmitting(action);
    setServerError(null);
    let leaving = false;
    const connectionError: SaveErrorInfo = {
      kind: 'generic',
      message: isTr
        ? 'Bağlantı hatası. İnternetini kontrol edip tekrar dene.'
        : 'Connection error. Check your internet and try again.',
    };
    try {
      if (!isEdit) {
        const res = await fetch('/api/surveys', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(buildCreateBody(form, restaurant.id, action === 'publish')),
        });
        const json = (await res.json().catch(() => null)) as {
          survey?: { id?: string };
          error?: unknown;
          message?: unknown;
        } | null;
        if (!res.ok) {
          setServerError(describeSaveError(res.status, json, locale));
          return;
        }
        const id = json?.survey?.id;
        if (!id) {
          setServerError(describeSaveError(500, null, locale));
          return;
        }
        leaving = true;
        releaseGuard();
        router.push(`/${locale}/dashboard/surveys/${id}?tab=share&new=1`);
        return;
      }

      // Edit: save in place, then (draft only) publish.
      const surveyId = survey!.id;
      const res = await fetch(`/api/surveys/${surveyId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(buildPatchBody(form, initialForm)),
      });
      const json = (await res.json().catch(() => null)) as {
        survey?: { questions?: Array<{ id: string }> };
        error?: unknown;
        message?: unknown;
        question?: unknown;
      } | null;
      if (!res.ok) {
        setServerError(describeSaveError(res.status, json, locale));
        return;
      }

      if (action === 'saveAndPublish') {
        const pub = await fetch(`/api/surveys/${surveyId}/publish`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ publish: true }),
        });
        if (!pub.ok) {
          // Saved, but not live. Stay here with the stored ids adopted, so a
          // retry matches the saved questions instead of looking stale.
          const savedIds = (json?.survey?.questions ?? []).map((q) => q.id);
          const rebased = rebaseAfterSave(form, savedIds);
          setForm(rebased);
          setInitialForm(rebased);
          const info = describeSaveError(pub.status, await pub.json().catch(() => null), locale);
          setServerError({
            kind: info.kind,
            message: `${
              isTr
                ? 'Değişiklikler kaydedildi ama anket yayınlanamadı.'
                : 'Your changes were saved, but the survey could not be published.'
            } ${info.message}`,
          });
          return;
        }
      }

      leaving = true;
      releaseGuard();
      router.push(
        action === 'saveAndPublish'
          ? `/${locale}/dashboard/surveys/${surveyId}?tab=share&new=1`
          : `/${locale}/dashboard/surveys/${surveyId}?saved=1`,
      );
    } catch {
      setServerError(connectionError);
    } finally {
      // While the redirect runs the buttons stay disabled (no double submit).
      if (!leaving) {
        inFlightRef.current = false;
        setSubmitting(null);
      }
    }
  }

  // ── Render helpers ──────────────────────────────────────────────────────
  const eyebrow = isEdit
    ? isTr
      ? 'ANKETİ DÜZENLE'
      : 'EDIT SURVEY'
    : isTr
      ? 'YENİ ANKET'
      : 'NEW SURVEY';
  const pageTitle = isEdit
    ? (survey?.title ?? '')
    : phase === 'pick'
      ? isTr
        ? 'Nasıl başlamak istersin?'
        : 'How do you want to start?'
      : isTr
        ? 'Anketini kur'
        : 'Build your survey';
  const pageDescription =
    phase === 'pick'
      ? isTr
        ? 'Bir şablon seç; sorular ve teşekkür mesajı hazır gelir, hepsini düzenleyebilirsin.'
        : 'Pick a template — questions and the thank-you message come ready, and you can edit everything.'
      : isTr
        ? 'Soruları düzenle; önizleme müşterinin göreceği ekranı gösterir.'
        : 'Edit the questions; the preview shows what customers will see.';

  const previewBusiness = restaurant
    ? { id: restaurant.id, name: restaurant.name, slug: restaurant.slug, primaryColor: restaurant.primaryColor }
    : null;

  const multiBusiness = !isEdit && restaurants.length > 1;
  // Read-only target business. Create: the shell's business switcher changes
  // it (no second picker on the page); edit: the survey's own business.
  const businessHint = multiBusiness
    ? isTr
      ? 'Değiştirmek için menüden başka bir işletme seç.'
      : 'To change it, pick another business in the menu.'
    : null;

  const missingMessage =
    attempted && !validation.ok
      ? isTr
        ? `${lastAction === 'publish' || lastAction === 'saveAndPublish' ? 'Yayınlamadan' : 'Kaydetmeden'} önce ${validation.count} eksik var`
        : `${validation.count} ${validation.count === 1 ? 'thing' : 'things'} to fix before ${lastAction === 'publish' || lastAction === 'saveAndPublish' ? 'publishing' : 'saving'}`
      : null;

  const canPublish = !moduleOff;
  const showSaveAndPublish = isEdit && !isPublished && canPublish;

  // ── No business at all (should not happen: the page redirects) ──────────
  if (!restaurant) return null;

  // ── Create + module off: only the notice ────────────────────────────────
  if (!isEdit && moduleOff) {
    return (
      <div data-survey-editor="" className="relative mx-auto w-full max-w-[1280px] space-y-5 px-4 py-6 sm:px-7 lg:py-8">
        <div id={`${uid}-top`} className="flex min-h-11 items-center">
          <Link
            href={listHref}
            className="inline-flex min-h-11 items-center gap-1 text-[13px] text-[#525252] hover:text-pn-ink"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            {isTr ? 'Anketler' : 'Surveys'}
          </Link>
        </div>
        <PageHeader
          eyebrow={eyebrow}
          title={isTr ? 'Yeni anket' : 'New survey'}
          description={<BusinessLine locale={locale} name={restaurant.name} hint={businessHint} />}
        />
        <AlertBanner kind="warn">{MODULE_OFF_MESSAGE[locale]}</AlertBanner>
        <Link href={listHref} className="bz-btn-primary inline-flex min-h-11 items-center justify-center">
          {isTr ? 'Anketlere dön' : 'Back to surveys'}
        </Link>
      </div>
    );
  }

  const stickyBar = (
    <div className="sticky bottom-[calc(var(--dash-bottom-nav-h,96px)+12px)] z-30 -mx-4 border-t border-pn-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-7 sm:px-7 lg:bottom-0">
      {missingMessage && (
        <p
          role="status"
          aria-live="polite"
          className="mb-2 text-[13px] font-medium text-[#B91C1C] sm:text-right"
        >
          {missingMessage}
        </p>
      )}
      <div className="flex items-center gap-2 sm:justify-end">
        <Link
          href={detailHref}
          className="bz-btn-ghost hidden min-h-11 sm:mr-auto sm:inline-flex"
        >
          {isEdit ? (isTr ? 'Vazgeç' : 'Discard') : isTr ? 'İptal' : 'Cancel'}
        </Link>

        <button
          type="button"
          className="bz-btn-ghost min-h-11 min-w-11 justify-center [@media(min-width:1024px)_and_(min-height:740px)]:hidden"
          aria-label={isTr ? 'Önizle' : 'Preview'}
          onClick={() => setPreviewOpen(true)}
        >
          <Smartphone size={16} aria-hidden="true" />
          <span className="hidden sm:inline">{isTr ? 'Önizle' : 'Preview'}</span>
        </button>

        {isEdit ? (
          <>
            <button
              type="button"
              id={`${uid}-save`}
              className={`${showSaveAndPublish ? 'bz-btn-ghost' : 'bz-btn-primary'} min-h-11 flex-1 justify-center whitespace-normal px-3 leading-tight sm:flex-none sm:whitespace-nowrap sm:px-4`}
              disabled={busy}
              onClick={() => void submit('save')}
            >
              {submitting === 'save' ? (
                <Loader2 size={15} className="animate-spin" aria-hidden="true" />
              ) : (
                <Save size={15} aria-hidden="true" />
              )}
              {submitting === 'save'
                ? isTr
                  ? 'Kaydediliyor…'
                  : 'Saving…'
                : isPublished
                  ? isTr
                    ? 'Değişiklikleri kaydet'
                    : 'Save changes'
                  : isTr
                    ? 'Kaydet'
                    : 'Save'}
            </button>
            {showSaveAndPublish && (
              <button
                type="button"
                id={`${uid}-save-publish`}
                className="bz-btn-primary min-h-11 flex-1 justify-center whitespace-normal px-3 leading-tight sm:flex-none sm:whitespace-nowrap sm:px-4"
                disabled={busy}
                onClick={() => void submit('saveAndPublish')}
              >
                {submitting === 'saveAndPublish' ? (
                  <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Send size={15} aria-hidden="true" />
                )}
                {submitting === 'saveAndPublish'
                  ? isTr
                    ? 'Yayınlanıyor…'
                    : 'Publishing…'
                  : isTr
                    ? 'Kaydet ve yayınla'
                    : 'Save & publish'}
              </button>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              id={`${uid}-draft`}
              className="bz-btn-ghost min-h-11 flex-1 justify-center whitespace-normal px-3 leading-tight sm:flex-none sm:whitespace-nowrap sm:px-4"
              disabled={busy}
              onClick={() => void submit('draft')}
            >
              {submitting === 'draft' && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
              {submitting === 'draft'
                ? isTr
                  ? 'Kaydediliyor…'
                  : 'Saving…'
                : isTr
                  ? 'Taslak olarak kaydet'
                  : 'Save as draft'}
            </button>
            <button
              type="button"
              id={`${uid}-publish`}
              className="bz-btn-primary min-h-11 flex-1 justify-center whitespace-normal px-3 leading-tight sm:flex-none sm:whitespace-nowrap sm:px-4"
              disabled={busy}
              onClick={() => void submit('publish')}
            >
              {submitting === 'publish' ? (
                <Loader2 size={15} className="animate-spin" aria-hidden="true" />
              ) : (
                <Send size={15} aria-hidden="true" />
              )}
              {submitting === 'publish'
                ? isTr
                  ? 'Yayınlanıyor…'
                  : 'Publishing…'
                : isTr
                  ? 'Yayınla ve paylaş'
                  : 'Publish & share'}
            </button>
          </>
        )}
      </div>
    </div>
  );

  // `relative` on the wrapper: `sr-only` helpers and the switch internals are
  // absolutely positioned, and without a positioned ancestor inside the panel's
  // scroll column they belong to the (overflow-hidden) shell. That makes the
  // whole shell programmatically scrollable, and a focus() on a new question then
  // slides the sidebar and topbar up by ~200 px.
  return (
    <div data-survey-editor="" className="relative mx-auto w-full max-w-[1280px] space-y-5 px-4 py-6 sm:px-7 lg:py-8">
      <div id={`${uid}-top`} className="flex min-h-11 scroll-mt-24 items-center justify-between gap-3">
        <Link
          href={listHref}
          className="inline-flex min-h-11 items-center gap-1 text-[13px] text-[#525252] hover:text-pn-ink"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          {isTr ? 'Anketler' : 'Surveys'}
        </Link>
        {!isEdit && phase === 'edit' && (
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-full px-3 text-[13px] font-medium text-[#525252] underline-offset-2 hover:text-pn-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-1"
            onClick={backToTemplates}
          >
            {isTr ? 'Şablonu değiştir' : 'Change template'}
          </button>
        )}
      </div>

      <PageHeader
        eyebrow={eyebrow}
        title={pageTitle}
        description={
          <>
            {pageDescription}
            <BusinessLine locale={locale} name={restaurant.name} hint={businessHint} />
          </>
        }
      />

      {isEdit && moduleOff && <AlertBanner kind="warn">{MODULE_OFF_MESSAGE[locale]}</AlertBanner>}

      {isEdit && isPublished && (
        <AlertBanner kind="lime">
          {isTr
            ? 'Bu anket yayında. Kaydettiğin değişiklikler müşterilere hemen yansır.'
            : 'This survey is live. Changes you save reach customers immediately.'}
          {responseCount > 0 &&
            (isTr
              ? ` Bu ankette ${responseCount} yanıt var; yanıtı olan soruların tipi değiştirilemez.`
              : ` This survey has ${responseCount} responses; the type of answered questions can't change.`)}
        </AlertBanner>
      )}
      {isEdit && !isPublished && responseCount > 0 && (
        <AlertBanner kind="info">
          {isTr
            ? `Bu ankette ${responseCount} yanıt var; yanıtı olan soruların tipi değiştirilemez.`
            : `This survey has ${responseCount} responses; the type of answered questions can't change.`}
        </AlertBanner>
      )}

      {serverError && (
        <div ref={errorRef} className="scroll-mt-24">
          <AlertBanner kind={serverError.kind === 'stale' ? 'warn' : 'danger'} onDismiss={() => setServerError(null)}>
            <span className="block">{serverError.message}</span>
            {serverError.kind === 'stale' && (
              <button
                type="button"
                className="bz-btn-ghost mt-2 min-h-11"
                onClick={() => {
                  releaseGuard();
                  window.location.reload();
                }}
              >
                {isTr ? 'Sayfayı yenile' : 'Reload'}
              </button>
            )}
          </AlertBanner>
        </div>
      )}

      {phase === 'pick' ? (
        <>
          <SurveyTemplatePicker
            locale={locale}
            sector={sector}
            sectorLabel={sectorLabel}
            onPick={pickTemplate}
          />
        </>
      ) : (
        <>
          <div className="[@media(min-width:1024px)_and_(min-height:740px)]:grid [@media(min-width:1024px)_and_(min-height:740px)]:grid-cols-[minmax(0,1fr)_380px] [@media(min-width:1024px)_and_(min-height:740px)]:items-start [@media(min-width:1024px)_and_(min-height:740px)]:gap-6">
            <div className="min-w-0 space-y-5">
              {/* 1 · Title */}
              <section className="bz-card space-y-4 p-4 sm:p-5" aria-label={isTr ? 'Anket başlığı' : 'Survey title'}>
                <Field
                  label={isTr ? 'Anket başlığı' : 'Survey title'}
                  required
                  htmlFor={ids.title}
                  hint={
                    isTr
                      ? 'Müşterinin ilk göreceği başlık. Kısa ve net olsun.'
                      : 'The first thing customers see. Keep it short and clear.'
                  }
                  error={attempted ? validation.titleError : null}
                >
                  <input
                    id={ids.title}
                    className="bz-input min-h-11 scroll-mt-24 scroll-mb-[calc(var(--dash-bottom-nav-h,0px)+120px)]"
                    value={form.title}
                    maxLength={TITLE_MAX}
                    autoComplete="off"
                    enterKeyHint="next"
                    placeholder={isTr ? 'Örn. Müşteri memnuniyet anketi' : 'e.g. Customer satisfaction survey'}
                    onChange={(e) => patch({ title: e.target.value })}
                  />
                  {form.title.length >= 100 && (
                    <span aria-hidden="true" className="mt-1 block text-right text-[12px] tabular-nums text-[#737373]">
                      {form.title.length}/{TITLE_MAX}
                    </span>
                  )}
                </Field>

                {descriptionOpen ? (
                  <Field
                    label={isTr ? 'Açıklama (isteğe bağlı)' : 'Description (optional)'}
                    htmlFor={ids.description}
                  >
                    <textarea
                      id={ids.description}
                      className="bz-input min-h-[84px]"
                      value={form.description}
                      maxLength={DESCRIPTION_MAX}
                      onChange={(e) => patch({ description: e.target.value })}
                    />
                  </Field>
                ) : (
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 -ml-3 text-[13px] font-medium text-pn-ink hover:bg-pn-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-1"
                    onClick={() => {
                      setDescriptionOpen(true);
                      window.requestAnimationFrame(() => document.getElementById(ids.description)?.focus());
                    }}
                  >
                    <Plus size={15} aria-hidden="true" />
                    {isTr ? 'Açıklama ekle' : 'Add a description'}
                  </button>
                )}
              </section>

              {/* 2 · Questions */}
              <section aria-labelledby={`${uid}-questions-h`} className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <h2 id={`${uid}-questions-h`} className="bz-h-tight text-[16px]">
                    {isTr ? 'Sorular' : 'Questions'}
                  </h2>
                  <p className="text-[13px] text-[#525252]" data-testid="survey-summary">
                    {isTr
                      ? `${questionCount} soru · tahmini ${duration}`
                      : `${questionCount} ${questionCount === 1 ? 'question' : 'questions'} · about ${duration.replace('~', '')}`}
                  </p>
                </div>
                <p className="text-[12px] text-[#737373]">
                  {isTr
                    ? '3–5 soru en iyisidir; uzun anketler yarım bırakılır.'
                    : '3–5 questions work best; long surveys get abandoned.'}
                </p>
                {attempted && validation.questionsError && (
                  <p role="alert" className="text-[13px] font-medium text-[#B91C1C]">
                    {validation.questionsError}
                  </p>
                )}

                <ol className="space-y-3">
                  {form.questions.map((q, index) => (
                    <QuestionCard
                      key={q.localId}
                      ref={(handle) => {
                        if (handle) cardRefs.current.set(q.localId, handle);
                        else cardRefs.current.delete(q.localId);
                      }}
                      locale={locale}
                      question={q}
                      index={index}
                      total={questionCount}
                      errors={attempted ? validation.questionErrors[q.localId] : undefined}
                      maxReached={maxReached}
                      onChange={(next) => updateQuestion(q.localId, next)}
                      onMove={(direction) => move(index, direction)}
                      onDuplicate={() => duplicate(index)}
                      onDelete={() => requestDelete(q)}
                    />
                  ))}
                </ol>

                <div className="bz-card-soft space-y-2 p-4">
                  <p id={ids.addLabel} className="text-[12px] font-medium text-pn-ink">
                    {isTr ? 'Soru ekle' : 'Add a question'}
                    {maxReached && (
                      <span className="ml-2 font-normal text-[#737373]">
                        {isTr
                          ? `(en fazla ${MAX_QUESTIONS_PER_SURVEY} soru)`
                          : `(up to ${MAX_QUESTIONS_PER_SURVEY} questions)`}
                      </span>
                    )}
                  </p>
                  <div role="group" aria-labelledby={ids.addLabel} className="flex flex-wrap gap-2">
                    {QUESTION_TYPE_MENU_ORDER.map((type, i) => {
                      const Icon = QUESTION_TYPE_ICONS[type];
                      return (
                        <button
                          key={type}
                          id={i === 0 ? `${uid}-add-first` : undefined}
                          type="button"
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-pn-line bg-white px-3.5 text-[13px] font-medium text-pn-ink transition-colors hover:border-pn-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-pn-line"
                          disabled={maxReached}
                          onClick={() => addQuestion(type)}
                        >
                          <Icon size={15} aria-hidden="true" />
                          {QUESTION_TYPE_LABELS[type][locale]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <p className="sr-only" aria-live="polite" role="status">
                  {announcement}
                </p>

                {sector === 'clinic' && (
                  <AlertBanner kind="info">
                    {isTr
                      ? "Sorularda teşhis, tedavi gibi sağlık verisi istemeyin (KVKK'da özel nitelikli veri)."
                      : "Don't ask for health data such as diagnosis or treatment in questions (special-category data under KVKK)."}
                  </AlertBanner>
                )}
              </section>

              {/* 3 · Appearance and settings */}
              <section className="bz-card overflow-hidden">
                <button
                  type="button"
                  className="flex min-h-[64px] w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pn-accent sm:px-5"
                  aria-expanded={settingsOpen}
                  aria-controls={ids.settings}
                  onClick={() => setSettingsOpen((v) => !v)}
                >
                  <span className="min-w-0">
                    <span className="bz-h-tight block text-[16px]">
                      {isTr ? 'Görünüm ve ayarlar' : 'Appearance and settings'}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-[#737373]">
                      {isTr
                        ? 'Renk, teşekkür mesajı, iletişim bilgisi, kupon'
                        : 'Colour, thank-you message, contact details, coupon'}
                    </span>
                  </span>
                  <ChevronDown
                    size={18}
                    aria-hidden="true"
                    className={`shrink-0 text-[#737373] transition-transform ${settingsOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {settingsOpen && (
                  <div id={ids.settings} className="space-y-5 border-t border-pn-line p-4 sm:p-5">
                    <AccentPicker
                      locale={locale}
                      value={form.accentColor}
                      brandColor={brandColor}
                      onChange={(hex) => patch({ accentColor: hex })}
                    />

                    <Field
                      label={isTr ? 'Teşekkür mesajı' : 'Thank-you message'}
                      htmlFor={ids.thanks}
                    >
                      <textarea
                        id={ids.thanks}
                        className="bz-input min-h-[84px]"
                        value={form.thankYouMessage}
                        maxLength={THANK_YOU_MAX}
                        placeholder={SURVEY_TEMPLATE_THANK_YOU[locale]}
                        onChange={(e) => patch({ thankYouMessage: e.target.value })}
                      />
                    </Field>

                    <APSwitch
                      className="min-h-[44px] w-full"
                      size="md"
                      checked={form.collectContact}
                      onChange={(next) => patch({ collectContact: next })}
                      label={isTr ? 'İletişim bilgisi iste' : 'Ask for contact details'}
                      sublabel={
                        isTr
                          ? 'Müşteri isterse e-posta ve telefonunu bırakabilir (zorunlu değil). KVKK metinleri Buaze tarafından otomatik gösterilir.'
                          : 'Customers may leave an email and phone if they want (optional). KVKK notices are shown automatically by Buaze.'
                      }
                    />

                    <fieldset className="space-y-3 rounded-[20px] border border-pn-line p-4">
                      <legend className="px-1 text-[12px] font-medium text-pn-ink">
                        {isTr ? 'Teşekkür kuponu (isteğe bağlı)' : 'Thank-you coupon (optional)'}
                      </legend>
                      <p className="text-[12px] leading-[1.45] text-[#737373]">
                        {isTr
                          ? 'Kod, teşekkür ekranında kopyalanabilir kart olarak görünür. Koşulları açıklamaya yaz (örn. geçerlilik).'
                          : 'The code appears as a copyable card on the thank-you screen. Put the terms in the description (e.g. validity).'}
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label={isTr ? 'Kupon kodu' : 'Coupon code'} htmlFor={ids.couponCode}>
                          <input
                            id={ids.couponCode}
                            className="bz-input min-h-11"
                            value={form.couponCode}
                            maxLength={40}
                            autoComplete="off"
                            autoCapitalize="characters"
                            placeholder="TESEKKUR10"
                            onChange={(e) => patch({ couponCode: e.target.value })}
                          />
                        </Field>
                        <Field
                          label={isTr ? 'Açıklama' : 'Description'}
                          htmlFor={ids.couponLabel}
                          error={attempted ? validation.couponError : null}
                        >
                          <input
                            id={ids.couponLabel}
                            className="bz-input min-h-11"
                            value={form.couponLabel}
                            maxLength={120}
                            autoComplete="off"
                            placeholder={isTr ? 'Bir sonraki ziyarette %10 indirim' : '10% off your next visit'}
                            onChange={(e) => patch({ couponLabel: e.target.value })}
                          />
                        </Field>
                      </div>
                    </fieldset>
                  </div>
                )}
              </section>
            </div>

            {/* Desktop: live phone preview, sticky below the topbar */}
            <aside
              className="hidden self-start [@media(min-width:1024px)_and_(min-height:740px)]:sticky [@media(min-width:1024px)_and_(min-height:740px)]:top-[88px] [@media(min-width:1024px)_and_(min-height:740px)]:block"
              aria-label={isTr ? 'Müşterinin göreceği ekran' : 'What customers will see'}
            >
              <p className="mb-2 text-center text-[12px] font-medium text-[#525252]">
                {isTr ? 'Müşterinin göreceği ekran' : 'What customers will see'}
              </p>
              {isDesktop && previewBusiness && (
                <SurveyPhonePreview locale={locale} form={form} business={previewBusiness} />
              )}
            </aside>
          </div>

          {stickyBar}
        </>
      )}

      {/* Phone preview in a modal below lg */}
      {previewOpen && previewBusiness && !isDesktop && (
        <Modal
          onClose={() => setPreviewOpen(false)}
          size={420}
          title={isTr ? 'Müşterinin göreceği ekran' : 'What customers will see'}
        >
          <SurveyPhonePreview locale={locale} form={form} business={previewBusiness} />
        </Modal>
      )}

      {guardDialog}
      {confirmEl}
    </div>
  );
}

// ── Business (read-only) ────────────────────────────────────────────────────

function BusinessLine({
  locale,
  name,
  hint,
}: {
  locale: EditorLocale;
  name: string;
  /** Multi-business create: where to change the business. */
  hint: string | null;
}) {
  return (
    <span className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-[13px] leading-[1.5] text-[#525252]">
      <span>
        {locale === 'tr' ? 'İşletme: ' : 'Business: '}
        <strong className="font-medium text-pn-ink">{name}</strong>
      </span>
      {/* Own flex item: moves to the next line as one piece on narrow screens. */}
      {hint && <span className="text-[#737373]">{hint}</span>}
    </span>
  );
}

// ── Accent colour ───────────────────────────────────────────────────────────

function AccentPicker({
  locale,
  value,
  brandColor,
  onChange,
}: {
  locale: EditorLocale;
  value: string;
  brandColor: string;
  onChange: (hex: string) => void;
}) {
  const isTr = locale === 'tr';
  const groupId = useId();
  const { swatches, brand } = accentChoices(brandColor);
  const current = normaliseHex(value) ?? value.toUpperCase();
  const custom = !isPresetAccent(value, brandColor);

  const ring =
    'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-ink focus-visible:ring-offset-1';

  return (
    <div>
      <p id={groupId} className="mb-1.5 text-[12px] font-medium text-pn-ink">
        {isTr ? 'Vurgu rengi' : 'Accent colour'}
      </p>
      <div role="radiogroup" aria-labelledby={groupId} className="flex flex-wrap items-center gap-x-0.5 gap-y-1">
        {swatches.map((s) => {
          const selected = current === s.hex;
          return (
            <button
              key={s.hex}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={isTr ? s.tr : s.en}
              title={isTr ? s.tr : s.en}
              className={ring}
              onClick={() => onChange(s.hex)}
            >
              <span
                aria-hidden="true"
                className={`flex h-7 w-7 items-center justify-center rounded-full border border-black/10 ${selected ? 'ring-2 ring-pn-ink ring-offset-2' : ''}`}
                style={{ background: s.hex }}
              >
                {selected && <Check size={14} className="text-pn-ink mix-blend-multiply" strokeWidth={3} />}
              </span>
            </button>
          );
        })}

        {brand && (
          <button
            type="button"
            role="radio"
            aria-checked={current === brand}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-ink focus-visible:ring-offset-1 ${current === brand ? 'border-pn-ink bg-pn-canvas' : 'border-pn-line bg-white hover:border-pn-ink'}`}
            onClick={() => onChange(brand)}
          >
            <span aria-hidden="true" className="h-5 w-5 rounded-full border border-black/10" style={{ background: brand }} />
            {isTr ? 'Marka rengim' : 'My brand colour'}
          </button>
        )}

        <label
          className={`relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-[13px] font-medium focus-within:ring-2 focus-within:ring-pn-ink focus-within:ring-offset-1 ${custom ? 'border-pn-ink bg-pn-canvas' : 'border-pn-line bg-white hover:border-pn-ink'}`}
        >
          <span
            aria-hidden="true"
            className="h-5 w-5 rounded-full border border-black/10"
            style={{ background: custom ? current : 'conic-gradient(#EF4444,#F59E0B,#10B981,#0EA5E9,#A855F7,#EF4444)' }}
          />
          {isTr ? 'Özel' : 'Custom'}
          <input
            type="color"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            value={normaliseHex(value)?.toLowerCase() ?? '#c6f24e'}
            aria-label={isTr ? 'Özel renk seç' : 'Pick a custom colour'}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
          />
        </label>
      </div>
    </div>
  );
}
