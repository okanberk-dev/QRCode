'use client';

// Denetim Merkezi — tek sayfa builder (spec §3.4 oluştur + §3.5 düzenle).
//
// Eski 5 adımlı sihirbaz ile ayrı düzenleme ekranının yerine tek bileşen:
// Bilgiler → Maddeler → (isteğe bağlı) Geçme puanı → sabit eylem çubuğu.
//
//   • Oluştur: "Taslak olarak kaydet" ya da "Yayınla ve linki al" (yayında
//     varsayılan sürekli link aynı istekte açılır → `/audits/{id}?share=1`).
//   • Düzenle: yayındaki denetim linkleri kapatılmadan, madde id'leri
//     değişmeden kaydedilir (kalıcı id'ler + `expectedUpdatedAt`); yanıt almış
//     maddelerin yapısı kilitlidir. Kaydedince detaya `?saved=1` ile döner.
//   • Tür (kontrol listesi / test), puan modu, sektör sahibe sorulmaz: sorulardan
//     / işletmeden türetilir; "Daha fazla ayar" altında düzeltilebilir.
//   • Kaydedilmemiş değişiklikte hem sekme kapatma hem uygulama içi gezinme
//     onay ister.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Link2, Loader2, Save } from 'lucide-react';
import { AlertBanner, Badge, Field, PageHeader, PulseSelect, useConfirmDialog } from '@/components/ui';
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
import { itemsHeading, kindBadgeKind, kindLabel, localizeYesNoQuestions } from './audit-ui';
import {
  buildCreatePayload,
  buildEditPayload,
  buildInitialState,
  builderSnapshot,
  effectiveKind,
  hasScorableQuestion,
  readPassingScore,
  resolveScoringMode,
  sanitizePassingInput,
  validateBuilder,
  type BuilderCategoryOption,
  type BuilderEditSource,
  type BuilderFocusTarget,
  type BuilderForkSource,
  type BuilderMode,
  type BuilderRestaurantOption,
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

  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState<SavingState>(null);
  const [navigating, setNavigating] = useState(false);
  const [serverError, setServerError] = useState<ParsedAuditError | null>(null);
  const savingRef = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
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
  // Hatalar yalnız ilk başarısız denemeden sonra görünür; sonra canlı güncellenir.
  const titleError = attempted ? validation.titleError : null;
  const questionsError = attempted ? validation.questionsError : null;
  const passingError = attempted ? validation.passingScoreError : null;
  const questionErrors = attempted ? validation.questionErrors : undefined;

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
    setAttempted(true);
    if (!validation.ok) {
      setServerError(null);
      if (validation.first) focusTarget(validation.first);
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
      ? 'Başlığı, maddeleri ve geçme puanını güncelle.'
      : 'Update the title, items and pass mark.'
    : fork
      ? isTr
        ? `"${fork.title}" hazır şablonundan kopyalandı. İstediğini değiştir, sonra yayınla.`
        : `Copied from the "${fork.title}" ready-made template. Change anything, then publish.`
      : isTr
        ? 'Maddeleri yaz, yayınla; linki ekibinle paylaş.'
        : 'Write the items, publish, and share the link with your team.';

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

  return (
    <div className="mx-auto max-w-[920px] space-y-5 px-4 py-6 sm:px-7 lg:py-8">
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

      {/* 1 · Bilgiler */}
      <section className="bz-card space-y-4 p-4 sm:p-5" aria-labelledby={`${baseId}-info-h`}>
        <h2 id={`${baseId}-info-h`} className="bz-h-tight text-[16px]">
          {isTr ? 'Bilgiler' : 'Details'}
        </h2>

        {showKindPicker && (
          <KindPicker
            locale={locale}
            value={startKind}
            onChange={setStartKind}
            name={`${baseId}-kind`}
          />
        )}

        <Field
          label={isTr ? 'Başlık' : 'Title'}
          required
          htmlFor={IDS.title}
          error={titleError}
        >
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
                document.getElementById(IDS.quick)?.focus();
              }
            }}
          />
        </Field>

        <Field
          label={isTr ? 'Açıklama (isteğe bağlı)' : 'Description (optional)'}
          hint={isTr ? 'Linki açan kişi bu açıklamayı görür.' : 'Whoever opens the link sees this text.'}
        >
          <textarea
            className="bz-input min-h-[84px]"
            value={description}
            maxLength={4000}
            onChange={(e) => setDescription(e.target.value)}
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
                ? 'Linki açanların göreceği dil.'
                : 'The language people see when they open the link.'
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

        <div className="border-t border-[#EDEDED] pt-1">
          <Disclosure
            open={moreOpen}
            onToggle={() => setMoreOpen((v) => !v)}
            controls={`${baseId}-more`}
          >
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
                        ? 'Geçme puanına ulaşanlar geçti sayılır. Geçme puanını aşağıya yaz.'
                        : 'Those who reach the pass mark count as passed. Enter it below.'
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
      </section>

      {/* 2 · Maddeler / Sorular */}
      <section aria-labelledby={`${baseId}-items-h`} className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id={`${baseId}-items-h`} className="bz-h-tight text-[16px]">
            {heading}
          </h2>
          <Badge kind={kindBadgeKind(kind)} dot={false}>
            {kindLabel(kind, locale)}
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

      {/* 3 · Geçme puanı (yalnız puanlanabilir madde varsa) */}
      {hasScorable && (
        <section className="bz-card p-4 sm:p-5" aria-labelledby={`${baseId}-pass-h`}>
          <h2 id={`${baseId}-pass-h`} className="bz-h-tight text-[16px]">
            {isTr ? 'Geçme puanı (isteğe bağlı)' : 'Pass mark (optional)'}
          </h2>
          <div className="mt-3">
            <Field
              label={isTr ? 'Geçme puanı' : 'Pass mark'}
              htmlFor={IDS.passing}
              error={passingError}
              hint={
                <>
                  {isTr
                    ? "Örn. 80 yazarsan 80 ve üzeri alanlar 'geçti' sayılır."
                    : 'e.g. 80 means 80+ counts as passed.'}
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
          </div>
        </section>
      )}

      {/* Sabit eylem çubuğu — mobilde yüzen alt gezinmenin ÜSTÜNDE (--dash-bottom-nav-h). */}
      <div className="sticky bottom-[calc(var(--dash-bottom-nav-h,96px)+12px)] z-30 -mx-4 border-t border-[#EDEDED] bg-white/95 px-4 py-3 backdrop-blur sm:-mx-7 sm:px-7 lg:bottom-0">
        <div className="flex items-center gap-2 sm:justify-end">
          <Link
            href={backHref}
            className="bz-btn-ghost hidden min-h-11 sm:inline-flex sm:min-h-9 sm:mr-auto"
          >
            {isTr ? 'Vazgeç' : 'Cancel'}
          </Link>
          {isEdit ? (
            <button
              type="button"
              id="audit-builder-save"
              className="bz-btn-primary min-h-11 flex-1 justify-center sm:min-h-9 sm:flex-none"
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
          ) : (
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
                className="bz-btn-primary min-h-11 flex-1 justify-center leading-tight sm:min-h-9 sm:flex-none"
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
          )}
        </div>
      </div>

      {confirmEl}
    </div>
  );
}

// ─── "Ne tür bir denetim?" (yalnız sıfırdan oluşturmada) ────────────────

/**
 * İki büyük seçenek kartı. Yalnız başlangıç varsayılanlarını (hızlı ekleme çipi)
 * seçer, SAKLANMAZ: tür her zaman sorulardan türetilir. `RadioCard` düğme olduğu
 * için grup semantiği yoktu; burada yerel radyo girdileri kullanılır (ok tuşları,
 * `radiogroup`, ekran okuyucu durumu ücretsiz) ve görünüm `RadioCard` ile aynı.
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
  const options: Array<{ value: AuditKind; title: string; body: string }> = [
    {
      value: 'checklist',
      title: isTr ? 'Kontrol listesi' : 'Checklist',
      body: isTr ? 'Evet/Hayır maddeleri. Ekibin her gün doldurur.' : 'Yes/No items. Your team fills it in every day.',
    },
    {
      value: 'quiz',
      title: 'Test',
      body: isTr
        ? 'Seçenekli, doğru cevaplı sorular. Puan hesaplanır; adaylar için uygun.'
        : 'Multiple-choice questions with correct answers. A score is calculated; good for candidates.',
    },
  ];
  return (
    <div>
      <p id={legendId} className="mb-1.5 text-[12px] font-semibold text-[#0A0A0A]">
        {isTr ? 'Ne tür bir denetim?' : 'What kind of audit?'}
      </p>
      <div role="radiogroup" aria-labelledby={legendId} className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <label key={o.value} className="relative flex">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            <span
              className={[
                'flex w-full cursor-pointer items-start gap-2.5 rounded-[10px] border bg-white p-3.5 transition-colors',
                'border-[#EDEDED] hover:bg-[#FAFAFA]',
                'peer-checked:border-[#0A0A0A] peer-checked:bg-[#FAFAFA]',
                'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#C6F24E]',
              ].join(' ')}
            >
              <span
                aria-hidden="true"
                className={[
                  'relative mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 bg-white',
                  value === o.value ? 'border-[#0A0A0A]' : 'border-[#D4D4D4]',
                ].join(' ')}
              >
                {value === o.value && <span className="absolute inset-[2px] rounded-full bg-[#0A0A0A]" />}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-[#0A0A0A]">{o.title}</span>
                <span className="mt-1 block text-[12px] leading-[1.5] text-[#737373]">{o.body}</span>
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
