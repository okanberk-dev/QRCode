'use client';

// Denetim Merkezi — 3 adımlı sihirbaz (oluştur + düzenle).
//
//   1 · Başla    — sıfırdan "Kontrol listesi" / "Test" ya da tek tıkla hazır
//                  şablon; denetimin adı ve dili.
//   2 · Maddeler — hızlı ekleme satırı + sürüklenebilir madde listesi.
//   3 · Yayınla  — özet, açıklama, geçme puanı, ek ayarlar; "Taslak olarak
//                  kaydet" ya da "Yayınla ve linki al".
//
//   • "İleri" yalnız o adımın alanlarını kontrol eder; kaydet tüm adımları
//     kontrol eder ve ilk hatanın olduğu adıma döner.
//   • Oluştur: yayınlanırsa varsayılan sürekli link aynı istekte açılır →
//     `/audits/{id}?share=1`.
//   • Düzenle: adımlar serbestçe açılır, "Kaydet" her adımda görünür. Yayındaki
//     denetim linkleri kapatılmadan, madde id'leri değişmeden kaydedilir
//     (kalıcı id'ler + `expectedUpdatedAt`); yanıt almış maddelerin yapısı
//     kilitlidir. Kaydedince detaya `?saved=1` ile döner.
//   • Tür, puan modu, sektör sorulardan / işletmeden türetilir; "Daha fazla
//     ayar" altında düzeltilebilir.
//   • Adımlar gizlenir, kaldırılmaz: madde listesinin iç durumu (hızlı ekleme
//     metni, açık "Detay") adım değişince kaybolmaz.
//   • Kaydedilmemiş değişiklikte hem sekme kapatma hem uygulama içi gezinme
//     onay ister.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, ClipboardList, Link2, ListChecks, Loader2, Pencil, Save, Sparkles } from 'lucide-react';
import {
  AlertBanner,
  Badge,
  Field,
  PageHeader,
  PulseSelect,
  WizardSteps,
  useConfirmDialog,
} from '@/components/ui';
import { getTranslations, type Locale } from '@/lib/translations';
import {
  AUDIT_SCORING_MODES,
  AUDIT_SECTORS,
  type AuditLocale,
  type AuditScoringMode,
  type AuditSector,
} from '@/lib/audits/types';
import { auditSectorForBusiness, type AuditKind } from '@/lib/audits/kind';
import { parseAuditErrorResponse, type ParsedAuditError } from '@/lib/audits/error-humanizer';
import type { AuditBuilderQuestion } from '@/lib/audits/question-normalize';
import AuditQuestionList from './AuditQuestionList';
import Disclosure from './Disclosure';
import { useActiveBusinessSelection } from './useActiveBusinessSelection';
import { useUnsavedGuard } from './useUnsavedGuard';
import { itemsCount, itemsHeading, kindBadgeKind, kindLabel, localizeYesNoQuestions } from './audit-ui';
import {
  WIZARD_LAST_STEP,
  buildCreatePayload,
  buildEditPayload,
  buildInitialState,
  builderSnapshot,
  effectiveKind,
  firstErrorInStep,
  hasScorableQuestion,
  pickStarterTemplates,
  readPassingScore,
  resolveScoringMode,
  sanitizePassingInput,
  stepForTarget,
  validateBuilder,
  type BuilderCategoryOption,
  type BuilderEditSource,
  type BuilderFocusTarget,
  type BuilderForkSource,
  type BuilderMode,
  type BuilderRestaurantOption,
  type BuilderStarterTemplate,
  type WizardStepIndex,
} from './builder-state';

export interface AuditBuilderProps {
  mode: BuilderMode;
  locale: Locale;
  /** Oluştur: erişilebilen işletmeler. Düzenle: yalnız denetimin işletmesi. */
  restaurants: BuilderRestaurantOption[];
  /** Sunucunun çözdüğü işletme (URL `?restaurantId` ya da ilk işletme). */
  hydratedRestaurantId: string;
  categories: BuilderCategoryOption[];
  /** `?from=<hazır şablon>` ile açıldıysa kaynak. */
  fork?: BuilderForkSource | null;
  /** `?from=` verildi ama şablon artık yok / yayında değil. */
  forkMissing?: boolean;
  /** Düzenle modunda yüklenen denetim. */
  edit?: BuilderEditSource | null;
  /** İlk adımda önerilecek hazır şablonlar (yalnız sıfırdan oluştururken). */
  starterTemplates?: BuilderStarterTemplate[];
}

type SavingState = null | 'draft' | 'publish' | 'save';

const IDS = {
  title: 'audit-builder-title',
  quick: 'audit-builder-quick',
  passing: 'audit-builder-passing',
  locale: 'audit-builder-locale',
} as const;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export default function AuditBuilderClient({
  mode,
  locale,
  restaurants,
  hydratedRestaurantId,
  categories,
  fork = null,
  forkMissing = false,
  edit = null,
  starterTemplates = [],
}: AuditBuilderProps) {
  const isTr = locale === 'tr';
  const t = getTranslations(locale);
  const router = useRouter();
  const isEdit = mode === 'edit' && edit !== null;
  const baseId = useId();

  // İlk durum bir kez kurulur (sayfa rotaya göre yeniden mount olur).
  const [init] = useState(() => buildInitialState({ mode, fork, edit }));

  const [title, setTitle] = useState(init.title);
  const [description, setDescription] = useState(init.description);
  const [auditLocale, setAuditLocale] = useState<AuditLocale>(init.locale);
  const [questions, setQuestions] = useState<AuditBuilderQuestion[]>(init.questions);
  const [passingInput, setPassingInput] = useState(init.passingScoreInput);
  const [sectorOverride, setSectorOverride] = useState<AuditSector | null>(init.sectorOverride);
  const [scoringOverride, setScoringOverride] = useState<AuditScoringMode | null>(init.scoringOverride);
  const [categoryId, setCategoryId] = useState<string | null>(init.categoryId);
  const [startKind, setStartKind] = useState<AuditKind>(init.startKind);
  const [moreOpen, setMoreOpen] = useState(false);

  // Hazır şablondan kopyalanan ya da düzenlenen denetim maddelerle açılır.
  const [step, setStep] = useState<WizardStepIndex>(isEdit || fork ? 1 : 0);
  // En ileri gidilen adım (oluştururken adım çubuğunda geri dönülebilecek yer).
  const [reached, setReached] = useState<WizardStepIndex>(isEdit ? WIZARD_LAST_STEP : fork ? 1 : 0);
  // Hataları gösterilen adımlar (ilk "İleri" / kaydet denemesinden sonra canlı).
  const [checked, setChecked] = useState<ReadonlySet<WizardStepIndex>>(() => new Set());

  const [saving, setSaving] = useState<SavingState>(null);
  const [navigating, setNavigating] = useState(false);
  const [serverError, setServerError] = useState<ParsedAuditError | null>(null);
  const savingRef = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const stepHeadingRefs = useRef<Array<HTMLHeadingElement | null>>([]);
  const pendingFocus = useRef<BuilderFocusTarget | 'heading' | null>(null);
  const [confirmEl, askConfirm] = useConfirmDialog();

  // ─── İşletme ──────────────────────────────────────────────────────────
  // Oluştururken denetim kabuktaki (üst çubuk) seçili işletme için açılır.
  const business = useActiveBusinessSelection(restaurants, hydratedRestaurantId);
  const restaurantId = isEdit ? edit.restaurantId : (business.activeId ?? hydratedRestaurantId);
  const activeRestaurant = restaurants.find((r) => r.id === restaurantId) ?? restaurants[0] ?? null;

  // ─── Türetilmişler ────────────────────────────────────────────────────
  const kind = effectiveKind(questions, startKind);
  const sector: AuditSector = sectorOverride ?? auditSectorForBusiness(activeRestaurant?.category);
  const hasResponses = isEdit && edit.hasResponses;
  const scoringMode = resolveScoringMode({
    mode: isEdit ? 'edit' : 'create',
    questions,
    storedMode: isEdit ? edit.scoringMode : null,
    hasResponses,
    explicitMode: scoringOverride,
  });
  const hasScorable = hasScorableQuestion(questions, auditLocale);
  const passing = readPassingScore(passingInput);
  const answeredIds = useMemo(() => new Set(edit?.answeredQuestionIds ?? []), [edit]);
  const initialById = useMemo(
    () =>
      new Map(
        init.questions
          .filter((q) => q.persistedId)
          .map((q) => [q.persistedId as string, q] as const),
      ),
    [init],
  );

  const validation = useMemo(
    () =>
      validateBuilder({
        uiLocale: locale,
        kind,
        title,
        questions,
        auditLocale,
        passingScoreInput: passingInput,
        hasScorable,
        scoringMode,
      }),
    [locale, kind, title, questions, auditLocale, passingInput, hasScorable, scoringMode],
  );
  const titleError = checked.has(0) ? validation.titleError : null;
  const questionsError = checked.has(1) ? validation.questionsError : null;
  const questionErrors = checked.has(1) ? validation.questionErrors : undefined;
  const passingError = checked.has(2) ? validation.passingScoreError : null;

  // ─── Kaydedilmemiş değişiklik koruması ────────────────────────────────
  const initialSnapshot = useMemo(
    () =>
      builderSnapshot({
        title: init.title,
        description: init.description,
        auditLocale: init.locale,
        passingScoreInput: init.passingScoreInput,
        sectorOverride: init.sectorOverride,
        scoringOverride: init.scoringOverride,
        categoryId: init.categoryId,
        questions: init.questions,
      }),
    [init],
  );
  const dirty =
    builderSnapshot({
      title,
      description,
      auditLocale,
      passingScoreInput: passingInput,
      sectorOverride,
      scoringOverride,
      categoryId,
      questions,
    }) !== initialSnapshot;

  const base = `/${locale}/dashboard/audits`;
  const businessQuery = restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : '';
  const backHref = isEdit ? `${base}/${edit.id}` : `${base}${businessQuery}`;

  const askLeave = useCallback(
    (href: string) => {
      askConfirm({
        title: isTr ? 'Kaydedilmemiş değişiklikler var' : 'You have unsaved changes',
        body: isTr
          ? 'Sayfadan ayrılırsan yaptığın değişiklikler kaybolur.'
          : 'If you leave this page, your changes will be lost.',
        variant: 'danger',
        confirmLabel: isTr ? 'Ayrıl' : 'Leave',
        cancelLabel: isTr ? 'Burada kal' : 'Stay',
        onConfirm: () => {
          setNavigating(true);
          router.push(href);
        },
      });
    },
    [askConfirm, isTr, router],
  );
  useUnsavedGuard({ active: dirty && !navigating, onBlocked: askLeave });

  // ─── Odak / kaydırma ──────────────────────────────────────────────────
  const focusTarget = useCallback((target: BuilderFocusTarget) => {
    let el: HTMLElement | null = null;
    switch (target.kind) {
      case 'title':
        el = document.getElementById(IDS.title);
        break;
      case 'questions':
        el = document.getElementById(IDS.quick);
        break;
      case 'question': {
        const row = document.querySelector<HTMLElement>(`[data-q-key="${target.clientKey}"]`);
        el = row?.querySelector<HTMLElement>('textarea') ?? row;
        break;
      }
      case 'passingScore':
        el = document.getElementById(IDS.passing);
        break;
    }
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, []);

  // Adım değişince: istenen alana odak, yoksa adım başlığına (ekran okuyucu
  // yeni adımı duyar) ve sayfanın başına.
  useEffect(() => {
    const pending = pendingFocus.current;
    pendingFocus.current = null;
    if (!pending) return;
    if (pending === 'heading') {
      topRef.current?.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      stepHeadingRefs.current[step]?.focus({ preventScroll: true });
      return;
    }
    focusTarget(pending);
  }, [step, focusTarget]);

  // Sunucu hatası ekranın dışında kalmasın (eylem çubuğu sayfanın altında).
  useEffect(() => {
    if (!serverError) return;
    errorRef.current?.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [serverError]);

  // Masaüstünde sıfırdan oluşturmada başlığa odak (dokunmatikte klavye açılmasın).
  useEffect(() => {
    if (isEdit || fork) return;
    if (!window.matchMedia?.('(pointer: fine)').matches) return;
    document.getElementById(IDS.title)?.focus({ preventScroll: true });
  }, [isEdit, fork]);

  // ─── Adım geçişleri ───────────────────────────────────────────────────
  const markChecked = useCallback((steps: WizardStepIndex[]) => {
    setChecked((prev) => {
      const next = new Set(prev);
      steps.forEach((s) => next.add(s));
      return next;
    });
  }, []);

  /** Adıma git; aynı adımdaysa doğrudan odakla. */
  const showStep = useCallback(
    (target: WizardStepIndex, focus: BuilderFocusTarget | 'heading') => {
      setReached((r) => (target > r ? target : r));
      if (target === step) {
        if (focus === 'heading') stepHeadingRefs.current[step]?.focus({ preventScroll: true });
        else focusTarget(focus);
        return;
      }
      pendingFocus.current = focus;
      setStep(target);
    },
    [step, focusTarget],
  );

  /** İleri (ya da adım çubuğundan ileri atlama): aradaki her adım geçerli olmalı. */
  const goTo = useCallback(
    (target: WizardStepIndex) => {
      if (target <= step) {
        setServerError(null);
        showStep(target, 'heading');
        return;
      }
      for (let s = step; s < target; s++) {
        const err = firstErrorInStep(validation, s as WizardStepIndex);
        if (err) {
          markChecked([s as WizardStepIndex]);
          showStep(s as WizardStepIndex, err);
          return;
        }
      }
      setServerError(null);
      showStep(target, 'heading');
    },
    [step, validation, markChecked, showStep],
  );

  // ─── Değişiklik işleyicileri ──────────────────────────────────────────
  function changeAuditLocale(next: AuditLocale) {
    setAuditLocale(next);
    // Evet/Hayır maddelerinin sözcükleri ve uygun cevabı yeni dile geçer.
    setQuestions((prev) => localizeYesNoQuestions(prev, next));
  }

  function changeSector(next: AuditSector) {
    setSectorOverride(next);
    // Seçili kategori yeni sektöre uymuyorsa bırak (admin sınıflaması sektöre bağlı).
    const cat = categories.find((c) => c.id === categoryId);
    if (cat && cat.sector !== next && cat.sector !== 'other') setCategoryId(null);
  }

  // ─── Kaydet ───────────────────────────────────────────────────────────
  async function save(action: Exclude<SavingState, null>) {
    if (savingRef.current || !restaurantId) return;
    markChecked([0, 1, 2]);
    if (!validation.ok) {
      setServerError(null);
      if (validation.first) showStep(stepForTarget(validation.first), validation.first);
      return;
    }

    savingRef.current = true;
    setSaving(action);
    setServerError(null);
    let navigated = false;
    try {
      const meta = {
        title,
        description,
        auditLocale,
        sector,
        categoryId,
        scoringMode,
        passingScore: hasScorable ? passing.value : null,
      };
      const res = isEdit
        ? await fetch(`/api/restaurants/${restaurantId}/audits/templates/${edit.id}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(buildEditPayload(meta, questions, edit.updatedAt, initialById)),
          })
        : await fetch(`/api/restaurants/${restaurantId}/audits/templates`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(buildCreatePayload(meta, questions, action === 'publish')),
          });

      if (!res.ok) {
        setServerError(await parseAuditErrorResponse(res, locale));
        return;
      }

      const json = (await res.json().catch(() => ({}))) as { data?: { id?: string } };
      const id = isEdit ? edit.id : json.data?.id;
      if (!id) {
        setServerError({
          title: isTr ? 'Kaydedildi ama denetim açılamadı. Listeden bak.' : 'Saved, but the audit could not be opened. Check the list.',
          details: [],
          code: null,
        });
        return;
      }
      navigated = true;
      setNavigating(true);
      router.push(`${base}/${id}${isEdit ? '?saved=1' : action === 'publish' ? '?share=1' : ''}`);
    } catch {
      setServerError({
        title: isTr ? 'Bağlantı hatası' : 'Connection error',
        details: [],
        code: null,
      });
    } finally {
      // Yönlendirme sürerken düğmeler kapalı kalır (çift kayıt olmasın).
      if (!navigated) {
        savingRef.current = false;
        setSaving(null);
      }
    }
  }

  // ─── Görünüm ──────────────────────────────────────────────────────────
  const eyebrow = (activeRestaurant?.name ?? (isTr ? 'DENETİM MERKEZİ' : 'AUDIT CENTER')).toLocaleUpperCase(
    isTr ? 'tr-TR' : 'en-US',
  );
  const pageTitle = isEdit ? (isTr ? 'Denetimi düzenle' : 'Edit audit') : isTr ? 'Yeni denetim' : 'New audit';
  const pageDescription = isEdit
    ? isTr
      ? 'Adımlar arasında serbestçe gezin; istediğin anda kaydet.'
      : 'Move freely between the steps; save whenever you like.'
    : isTr
      ? 'Üç kısa adım: başla, maddeleri yaz, yayınla. Link ekibinle paylaşılmaya hazır olur.'
      : 'Three short steps: start, write the items, publish. The link is ready to share with your team.';

  const heading = itemsHeading(kind, locale);
  const sectorOptions = AUDIT_SECTORS.map((s) => ({
    value: s,
    label: t[`audits_sector_${s}` as 'audits_sector_food'],
  }));
  const scoringOptions = AUDIT_SCORING_MODES.map((m) => ({
    value: m,
    label: t[`audits_score_mode_${m}` as 'audits_score_mode_percentage'],
  }));
  const categoryOptions = [
    { value: '', label: isTr ? 'Kategori yok' : 'No category' },
    ...categories
      .filter((c) => c.sector === sector || c.sector === 'other')
      .map((c) => ({ value: c.id, label: isTr ? c.labelTr : c.labelEn })),
  ];
  const busy = saving !== null;
  const showKindPicker = !isEdit && !fork;
  const localeLocked = hasResponses;
  const suggestions = useMemo(
    () => (showKindPicker ? pickStarterTemplates(starterTemplates, sector, locale === 'en' ? 'en' : 'tr') : []),
    [showKindPicker, starterTemplates, sector, locale],
  );
  const templateHref = (id: string) =>
    `${base}/new?from=${encodeURIComponent(id)}${restaurantId ? `&restaurantId=${encodeURIComponent(restaurantId)}` : ''}`;
  const allTemplatesHref = `${base}?tab=ready${restaurantId ? `&restaurantId=${encodeURIComponent(restaurantId)}` : ''}`;

  const steps = [
    {
      label: isEdit ? (isTr ? 'Bilgiler' : 'Details') : isTr ? 'Başla' : 'Start',
    },
    { label: heading },
    {
      label: isEdit ? (isTr ? 'Ayarlar' : 'Settings') : isTr ? 'Yayınla' : 'Publish',
    },
  ];
  const stepComplete = (i: number) =>
    i < reached && firstErrorInStep(validation, i as WizardStepIndex) === null;

  const filledQuestions = questions.filter((q) => q.prompt.trim()).length;
  const languageLabel = auditLocale === 'en' ? 'English' : 'Türkçe';

  // Adım numarası üstteki adım göstergesinde; burada ikinci bir "Adım 1 / 3" etiketi yok.
  const stepHeading = (index: WizardStepIndex, text: string, sub: string) => (
    <div className="space-y-1">
      <h2
        ref={(el) => {
          stepHeadingRefs.current[index] = el;
        }}
        tabIndex={-1}
        className="bz-h-tight text-[20px] text-[#0A0A0A] outline-none sm:text-[22px]"
      >
        {text}
      </h2>
      <p className="text-[13px] leading-[1.55] text-[#525252]">{sub}</p>
    </div>
  );

  return (
    <div ref={topRef} className="mx-auto max-w-[920px] scroll-mt-24 space-y-5 px-4 py-6 sm:px-7 lg:py-8">
      <div>
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center gap-1 text-[13px] text-[#737373] hover:text-[#0A0A0A] sm:min-h-0 sm:text-[12px]"
        >
          <ArrowLeft size={13} aria-hidden="true" />{' '}
          {isEdit ? (isTr ? 'Denetime dön' : 'Back to audit') : isTr ? 'Denetim Merkezi' : 'Audit Center'}
        </Link>
      </div>

      <PageHeader eyebrow={eyebrow} title={pageTitle} description={pageDescription} />

      <WizardSteps
        steps={steps}
        current={step}
        isComplete={stepComplete}
        canSelect={(i) => isEdit || i <= reached}
        onSelect={(i) => goTo(i as WizardStepIndex)}
        ariaLabel={isTr ? 'Denetim adımları' : 'Audit steps'}
      />

      {forkMissing && (
        <AlertBanner kind="warn">
          {isTr
            ? 'Bu hazır şablon artık yok. Sıfırdan başlayabilirsin.'
            : 'This ready-made template no longer exists. You can start from scratch.'}
        </AlertBanner>
      )}

      {isEdit && edit.isPublished && (
        <AlertBanner kind="info">
          {isTr
            ? 'Bu denetim yayında. Değişiklikler linkleri kapatmadan hemen geçerli olur.'
            : 'This audit is live. Changes apply immediately without closing the links.'}
        </AlertBanner>
      )}

      {serverError && (
        <div ref={errorRef} className="scroll-mt-24">
          <AlertBanner kind="danger" onDismiss={() => setServerError(null)}>
            <div className="space-y-1">
              <p className="font-semibold">{serverError.title}</p>
              {serverError.details.length > 0 && (
                <ul className="list-disc space-y-0.5 pl-5 text-[12.5px]">
                  {serverError.details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
              {serverError.code === 'STALE_EDIT' && (
                <button
                  type="button"
                  className="bz-btn-ghost mt-1 min-h-11 sm:min-h-9"
                  onClick={() => window.location.reload()}
                >
                  {isTr ? 'Sayfayı yenile' : 'Refresh the page'}
                </button>
              )}
            </div>
          </AlertBanner>
        </div>
      )}

      {/* ── Adım 1 · Başla ─────────────────────────────────────────────── */}
      <section hidden={step !== 0} aria-labelledby={`${baseId}-s0`} className="space-y-4">
        <div id={`${baseId}-s0`}>
          {stepHeading(
            0,
            isEdit
              ? isTr
                ? 'Denetimin adı ve dili'
                : 'Name and language'
              : fork
                ? isTr
                  ? 'Şablonu kendine göre adlandır'
                  : 'Name your copy'
                : isTr
                  ? 'Nasıl başlamak istersin?'
                  : 'How do you want to start?',
            isEdit
              ? isTr
                ? 'Ekibin listede bu adı görür.'
                : 'Your team sees this name in the list.'
              : fork
                ? isTr
                  ? `"${fork.title}" hazır şablonundan kopyalandı. Maddeleri sonraki adımda değiştirebilirsin.`
                  : `Copied from the "${fork.title}" ready-made template. You can change the items in the next step.`
                : suggestions.length > 0
                  ? isTr
                    ? 'Sıfırdan bir tür seç ya da hazır bir şablonla saniyeler içinde başla.'
                    : 'Pick a type to start from scratch, or start in seconds with a ready-made template.'
                  : isTr
                    ? 'Kontrol listesi ya da test seç, adını yaz.'
                    : 'Pick a checklist or a test and give it a name.',
          )}
        </div>

        {/* Sıfırdan: tür + ad + dil tek kartta; hazır şablon ayrı kartta. */}
        <div className="bz-card space-y-4 p-4 sm:p-5">
          {showKindPicker && (
            <KindPicker locale={locale} value={startKind} onChange={setStartKind} name={`${baseId}-kind`} />
          )}
          <Field label={isTr ? 'Denetimin adı' : 'Audit name'} required htmlFor={IDS.title} error={titleError}>
            <input
              id={IDS.title}
              className="bz-input"
              value={title}
              maxLength={200}
              autoComplete="off"
              enterKeyHint="next"
              placeholder={isTr ? 'Örn. Mutfak açılış kontrolü' : 'e.g. Kitchen opening check'}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  goTo(1);
                }
              }}
            />
          </Field>

          <Field
            label={isTr ? 'Dil' : 'Language'}
            htmlFor={IDS.locale}
            hint={
              localeLocked
                ? isTr
                  ? 'Yanıt almış denetimin dili değişmez.'
                  : "The language can't change once the audit has responses."
                : isTr
                  ? 'Linki açanların göreceği dil. Evet/Hayır sözcükleri buna göre yazılır.'
                  : 'The language people see when they open the link. Yes/No words follow it.'
            }
          >
            <PulseSelect
              id={IDS.locale}
              className="w-full sm:max-w-[240px]"
              value={auditLocale}
              disabled={localeLocked}
              onChange={(v) => changeAuditLocale(v === 'en' ? 'en' : 'tr')}
              options={[
                { value: 'tr', label: 'Türkçe' },
                { value: 'en', label: 'English' },
              ]}
            />
          </Field>
        </div>

        {showKindPicker && suggestions.length > 0 && (
          <div className="bz-card p-4 sm:p-5">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[12px] font-semibold text-[#0A0A0A]">
                {isTr ? 'Ya da hazır şablonla başla' : 'Or start from a ready-made template'}
              </p>
              <Link
                href={allTemplatesHref}
                className="inline-flex min-h-11 items-center gap-1 text-[12px] font-medium text-[#525252] underline-offset-2 hover:text-[#0A0A0A] hover:underline sm:min-h-0"
              >
                {isTr ? 'Tüm hazır şablonlar' : 'All ready-made templates'}
                <ArrowRight size={12} aria-hidden="true" />
              </Link>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {suggestions.map((tpl) => (
                <li key={tpl.id}>
                  <Link
                    href={templateHref(tpl.id)}
                    className="group flex min-h-[60px] items-center gap-3 rounded-[10px] border border-[#EDEDED] bg-white p-3 transition-colors hover:border-[#0A0A0A] hover:bg-[#FAFAFA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6F24E]"
                  >
                    <span
                      aria-hidden="true"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF9B8] text-[#0A0A0A]"
                    >
                      <Sparkles size={15} strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-[#0A0A0A]">{tpl.title}</span>
                      <span className="mt-0.5 block text-[11.5px] text-[#737373]">
                        {kindLabel(tpl.kind, locale)} · {itemsCount(tpl.itemCount, locale)}
                      </span>
                    </span>
                    <ArrowRight
                      size={14}
                      aria-hidden="true"
                      className="shrink-0 text-[#A3A3A3] transition-transform group-hover:translate-x-0.5 group-hover:text-[#0A0A0A]"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ── Adım 2 · Maddeler ──────────────────────────────────────────── */}
      <section hidden={step !== 1} aria-labelledby={`${baseId}-s1`} className="space-y-3">
        <div id={`${baseId}-s1`} className="flex flex-wrap items-end justify-between gap-2">
          {stepHeading(
            1,
            kind === 'quiz'
              ? isTr
                ? 'Soruları ekle'
                : 'Add the questions'
              : isTr
                ? 'Maddeleri ekle'
                : 'Add the items',
            kind === 'quiz'
              ? isTr
                ? 'Soruyu yaz, Enter’a bas. Seçenekleri ve doğru cevabı "Detay"dan belirle.'
                : 'Type a question and press Enter. Set options and the right answer under "Details".'
              : isTr
                ? 'Her madde için bir cümle yaz, Enter’a bas. Sırayı sürükleyerek değiştirebilirsin.'
                : 'Write one sentence per item and press Enter. Drag to reorder.',
          )}
          <Badge kind={kindBadgeKind(kind)} dot={false}>
            {kindLabel(kind, locale)} · {itemsCount(filledQuestions, locale)}
          </Badge>
        </div>
        {questionsError && (
          <p className="text-[12.5px] font-medium text-[#B91C1C]" role="alert">
            {questionsError}
          </p>
        )}
        <AuditQuestionList
          key={showKindPicker ? startKind : 'fixed'}
          locale={locale}
          auditLocale={auditLocale}
          kind={kind}
          startKind={startKind}
          questions={questions}
          onChange={setQuestions}
          answeredIds={answeredIds}
          errors={questionErrors}
          inputId={IDS.quick}
        />
      </section>

      {/* ── Adım 3 · Yayınla / Ayarlar ─────────────────────────────────── */}
      <section hidden={step !== 2} aria-labelledby={`${baseId}-s2`} className="space-y-4">
        <div id={`${baseId}-s2`}>
          {stepHeading(
            2,
            isEdit ? (isTr ? 'Son ayarlar' : 'Final settings') : isTr ? 'Kontrol et ve yayınla' : 'Review and publish',
            isEdit
              ? isTr
                ? 'Açıklama, geçme puanı ve ek ayarlar.'
                : 'Description, pass mark and extra settings.'
              : isTr
                ? 'Yayınlayınca bir link oluşur; ekibin telefondan açıp doldurur. Taslak olarak saklayıp sonra da yayınlayabilirsin.'
                : 'Publishing creates a link your team opens on their phone. You can also save a draft and publish later.',
          )}
        </div>

        {/* Özet */}
        <div className="bz-card p-4 sm:p-5">
          <dl className="grid gap-3 sm:grid-cols-2">
            <SummaryRow
              label={isTr ? 'Ad' : 'Name'}
              value={title.trim() || (isTr ? '— (yazılmadı)' : '— (missing)')}
              icon={<ClipboardList size={14} aria-hidden="true" />}
              editLabel={isTr ? 'Adı düzenle' : 'Edit name'}
              onEdit={() => goTo(0)}
            />
            <SummaryRow
              label={heading}
              value={`${kindLabel(kind, locale)} · ${itemsCount(filledQuestions, locale)}`}
              icon={<ListChecks size={14} aria-hidden="true" />}
              editLabel={isTr ? 'Maddeleri düzenle' : 'Edit items'}
              onEdit={() => goTo(1)}
            />
            <SummaryRow
              label={isTr ? 'Dil' : 'Language'}
              value={languageLabel}
              editLabel={isTr ? 'Dili değiştir' : 'Change language'}
              onEdit={() => goTo(0)}
            />
            <SummaryRow
              label={isTr ? 'İşletme' : 'Business'}
              value={activeRestaurant?.name ?? '—'}
            />
          </dl>
        </div>

        <div className="bz-card space-y-4 p-4 sm:p-5">
          <Field
            label={isTr ? 'Açıklama (isteğe bağlı)' : 'Description (optional)'}
            hint={isTr ? 'Linki açan kişi bu açıklamayı en üstte görür.' : 'Whoever opens the link sees this at the top.'}
          >
            <textarea
              className="bz-input min-h-[84px]"
              value={description}
              maxLength={4000}
              placeholder={
                isTr ? 'Örn. Her sabah açılıştan önce doldurun.' : 'e.g. Fill in every morning before opening.'
              }
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          {hasScorable && (
            <Field
              label={isTr ? 'Geçme puanı (isteğe bağlı)' : 'Pass mark (optional)'}
              htmlFor={IDS.passing}
              error={passingError}
              hint={
                <>
                  {isTr
                    ? "Örn. 80 yazarsan 80 ve üzeri alanlar 'geçti' sayılır. Boş bırakırsan yalnız puan gösterilir."
                    : 'e.g. 80 means 80+ counts as passed. Leave empty to show only the score.'}
                  {hasResponses && (
                    <>
                      {' '}
                      {isTr ? 'Önceki yanıtların sonucu değişmez.' : "Results of earlier responses don't change."}
                    </>
                  )}
                </>
              }
            >
              <div className="flex items-center gap-2">
                <input
                  id={IDS.passing}
                  className="bz-input w-24"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  enterKeyHint="done"
                  value={passingInput}
                  placeholder="80"
                  onChange={(e) => setPassingInput(sanitizePassingInput(e.target.value))}
                />
                <span className="text-[13px] text-[#737373]">/ 100</span>
              </div>
            </Field>
          )}

          <div className="border-t border-[#EDEDED] pt-1">
            <Disclosure open={moreOpen} onToggle={() => setMoreOpen((v) => !v)} controls={`${baseId}-more`}>
              {isTr ? 'Daha fazla ayar' : 'More options'}
            </Disclosure>
            {moreOpen && (
              <div id={`${baseId}-more`} className="mt-2 grid gap-3 sm:grid-cols-2">
                <Field label={isTr ? 'Sektör' : 'Sector'} htmlFor={`${baseId}-sector`}>
                  <PulseSelect
                    id={`${baseId}-sector`}
                    className="w-full"
                    value={sector}
                    onChange={(v) => changeSector(v as AuditSector)}
                    options={sectorOptions}
                  />
                </Field>
                <Field
                  label={isTr ? 'Puan hesabı' : 'Score calculation'}
                  htmlFor={`${baseId}-mode`}
                  hint={
                    scoringMode === 'weighted'
                      ? isTr
                        ? "Her maddenin puandaki ağırlığı hesaba katılır (maddenin 'Detay'ında)."
                        : "Each item's weight in the score counts (in the item's 'Details')."
                      : scoringMode === 'pass_fail'
                        ? isTr
                          ? 'Geçme puanına ulaşanlar geçti sayılır. Geçme puanını yukarıya yaz.'
                          : 'Those who reach the pass mark count as passed. Enter it above.'
                        : isTr
                          ? 'Tüm maddeler eşit sayılır.'
                          : 'All items count equally.'
                  }
                >
                  <PulseSelect
                    id={`${baseId}-mode`}
                    className="w-full"
                    value={scoringMode}
                    onChange={(v) => setScoringOverride(v as AuditScoringMode)}
                    options={scoringOptions}
                  />
                </Field>
                <Field
                  label={isTr ? 'Kategori (isteğe bağlı)' : 'Category (optional)'}
                  htmlFor={`${baseId}-category`}
                  className="sm:col-span-2"
                >
                  <PulseSelect
                    id={`${baseId}-category`}
                    className="w-full sm:max-w-[360px]"
                    value={categoryId ?? ''}
                    onChange={(v) => setCategoryId(v || null)}
                    options={categoryOptions}
                  />
                </Field>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Sabit eylem çubuğu — mobilde yüzen alt gezinmenin ÜSTÜNDE (--dash-bottom-nav-h).
          Düz beyaz: yarı saydam yüzeyde arkadaki metin düğmelerin içinden görünüyordu. */}
      <div className="sticky bottom-[calc(var(--dash-bottom-nav-h,96px)+12px)] z-30 -mx-4 border-t border-[#EDEDED] bg-white px-4 py-3 sm:-mx-7 sm:px-7 lg:bottom-0">
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end">
          {step === 0 ? (
            <Link href={backHref} className="bz-btn-ghost hidden min-h-11 sm:mr-auto sm:inline-flex sm:min-h-9">
              {isTr ? 'Vazgeç' : 'Cancel'}
            </Link>
          ) : (
            <button
              type="button"
              className="bz-btn-ghost min-h-11 justify-center sm:mr-auto sm:min-h-9"
              onClick={() => goTo((step - 1) as WizardStepIndex)}
              disabled={busy}
            >
              <ArrowLeft size={14} aria-hidden="true" />
              {isTr ? 'Geri' : 'Back'}
            </button>
          )}

          {isEdit && (
            <button
              type="button"
              id="audit-builder-save"
              className={`${step === WIZARD_LAST_STEP ? 'bz-btn-primary' : 'bz-btn-ghost'} min-h-11 flex-1 justify-center sm:min-h-9 sm:flex-none`}
              onClick={() => void save('save')}
              disabled={busy}
            >
              {saving === 'save' ? (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <Save size={14} aria-hidden="true" />
              )}
              {saving === 'save' ? (isTr ? 'Kaydediliyor…' : 'Saving…') : isTr ? 'Kaydet' : 'Save'}
            </button>
          )}

          {step < WIZARD_LAST_STEP ? (
            <button
              type="button"
              id="audit-builder-next"
              className="bz-btn-primary min-h-11 flex-1 justify-center sm:min-h-9 sm:flex-none"
              onClick={() => goTo((step + 1) as WizardStepIndex)}
              disabled={busy}
            >
              {isTr ? 'İleri' : 'Next'}
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          ) : (
            !isEdit && (
              <>
                <button
                  type="button"
                  id="audit-builder-draft"
                  className="bz-btn-ghost min-h-11 flex-1 justify-center leading-tight sm:min-h-9 sm:flex-none"
                  onClick={() => void save('draft')}
                  disabled={busy}
                >
                  {saving === 'draft' && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                  {saving === 'draft'
                    ? isTr
                      ? 'Kaydediliyor…'
                      : 'Saving…'
                    : isTr
                      ? 'Taslak olarak kaydet'
                      : 'Save as draft'}
                </button>
                <button
                  type="button"
                  id="audit-builder-publish"
                  className="bz-btn-lime min-h-11 w-full justify-center leading-tight sm:min-h-9 sm:w-auto"
                  onClick={() => void save('publish')}
                  disabled={busy}
                >
                  {saving === 'publish' ? (
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Link2 size={14} aria-hidden="true" />
                  )}
                  {saving === 'publish'
                    ? isTr
                      ? 'Yayınlanıyor…'
                      : 'Publishing…'
                    : isTr
                      ? 'Yayınla ve linki al'
                      : 'Publish and get link'}
                </button>
              </>
            )
          )}
        </div>
      </div>

      {confirmEl}
    </div>
  );
}

// ─── Özet satırı ────────────────────────────────────────────────────────

function SummaryRow({
  label,
  value,
  icon,
  editLabel,
  onEdit,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  editLabel?: string;
  onEdit?: () => void;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 rounded-[10px] bg-[#FAFAFA] px-3 py-2.5">
      <div className="min-w-0">
        <dt className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#737373]">
          {icon}
          {label}
        </dt>
        <dd className="mt-0.5 break-words text-[13.5px] font-semibold text-[#0A0A0A]">{value}</dd>
      </div>
      {onEdit && editLabel && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={editLabel}
          title={editLabel}
          className="bz-btn-icon h-11 w-11 shrink-0 border border-[#EDEDED] bg-white sm:h-8 sm:w-8"
        >
          <Pencil size={13} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

// ─── "Ne tür bir denetim?" (yalnız sıfırdan oluşturmada) ────────────────

/**
 * İki büyük seçenek kartı. Yalnız başlangıç varsayılanlarını (hızlı ekleme çipi)
 * seçer, SAKLANMAZ: tür her zaman sorulardan türetilir. Yerel radyo girdileri
 * kullanılır (ok tuşları, `radiogroup`, ekran okuyucu durumu ücretsiz).
 */
function KindPicker({
  locale,
  value,
  onChange,
  name,
}: {
  locale: Locale;
  value: AuditKind;
  onChange: (kind: AuditKind) => void;
  name: string;
}) {
  const isTr = locale === 'tr';
  const legendId = `${name}-legend`;
  const options: Array<{ value: AuditKind; title: string; body: string; icon: React.ReactNode }> = [
    {
      value: 'checklist',
      title: isTr ? 'Kontrol listesi' : 'Checklist',
      body: isTr
        ? 'Evet/Hayır maddeleri. Açılış, kapanış, hijyen gibi günlük kontroller için.'
        : 'Yes/No items. For daily checks like opening, closing or hygiene.',
      icon: <ListChecks size={16} strokeWidth={2} />,
    },
    {
      value: 'quiz',
      title: 'Test',
      body: isTr
        ? 'Seçenekli, doğru cevaplı sorular. Puan hesaplanır; eğitim ve aday değerlendirme için.'
        : 'Multiple-choice questions with right answers. A score is calculated; for training and candidates.',
      icon: <Check size={16} strokeWidth={2.4} />,
    },
  ];
  return (
    <div>
      <p id={legendId} className="mb-2 text-[12px] font-semibold text-[#0A0A0A]">
        {isTr ? 'Sıfırdan başla' : 'Start from scratch'}
      </p>
      <div role="radiogroup" aria-labelledby={legendId} className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const selected = value === o.value;
          return (
            <label key={o.value} className="relative flex">
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={selected}
                onChange={() => onChange(o.value)}
                className="peer sr-only"
              />
              <span
                className={[
                  'flex w-full cursor-pointer items-start gap-3 rounded-[12px] border bg-white p-3.5 transition-colors',
                  'border-[#EDEDED] hover:bg-[#FAFAFA]',
                  'peer-checked:border-[#0A0A0A] peer-checked:bg-[#FAFAFA]',
                  'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#C6F24E]',
                ].join(' ')}
              >
                <span
                  aria-hidden="true"
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    selected ? 'bg-[#C6F24E] text-[#0A0A0A]' : 'bg-[#F5F5F5] text-[#525252]'
                  }`}
                >
                  {o.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-[#0A0A0A]">{o.title}</span>
                  <span className="mt-1 block text-[12px] leading-[1.5] text-[#737373]">{o.body}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={[
                    'relative mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 bg-white',
                    selected ? 'border-[#0A0A0A]' : 'border-[#D4D4D4]',
                  ].join(' ')}
                >
                  {selected && <span className="absolute inset-[2px] rounded-full bg-[#0A0A0A]" />}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
