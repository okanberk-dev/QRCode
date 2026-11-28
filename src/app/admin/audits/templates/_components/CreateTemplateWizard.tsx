'use client';

// CLAUDE.md §42 — Hazır şablon oluşturma sihirbazı (3 adım, superadmin).
//
//   1. Kimlik  — başlık + dil + sektör + kategori
//   2. Sorular — owner sihirbazındaki madde listesi (hızlı ekleme, sürükle,
//                "Detay"); boş bırakılabilir, sonra detay ekranından eklenir
//   3. Puanlama & özet — puanlama modu, geçme puanı, açıklama, özet, "Oluştur"
//
// Şablon taslak olarak oluşur; işletme kataloğuna yayın detay ekranından.
// Adım göstergesi owner sihirbazı ve menü kurulumu ile ortak (`WizardSteps`).

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  Gauge,
  Globe,
  ListChecks,
  Loader2,
  Percent,
  Save,
  Scale,
  SlidersHorizontal,
  Target,
} from 'lucide-react';
import { AlertBanner, Field, Modal, PulseSelect } from '@/components/ui';
import {
  WIZARD_BACK_CLASS,
  WIZARD_NEXT_CLASS,
  WizardChoice,
  WizardFooter,
  WizardSteps,
  WizardSummaryRow,
} from '@/components/ui/WizardSteps';
import {
  AUDIT_SCORING_MODES,
  AUDIT_SECTORS,
  type AuditScoringMode,
  type AuditSector,
} from '@/lib/audits/types';
import { deriveAuditKind } from '@/lib/audits/kind';
import {
  checkQuestionForSave,
  toCreateQuestions,
  type AuditBuilderQuestion,
} from '@/lib/audits/question-normalize';
import {
  parseAuditErrorResponse,
  summarizeAuditError,
} from '@/lib/audits/error-humanizer';
import AuditQuestionList from '@/components/audits/AuditQuestionList';
import { itemsCount, kindLabel, localizeYesNoQuestions } from '@/components/audits/audit-ui';

interface CategoryRef {
  id: string;
  slug: string;
  labelTr: string;
  labelEn: string;
  sector?: AuditSector;
}

interface CreateForm {
  title: string;
  locale: 'tr' | 'en';
  sector: AuditSector;
  categoryId: string;
  scoringMode: AuditScoringMode;
  passingScore: string;
  description: string;
}

const EMPTY_FORM: CreateForm = {
  title: '',
  locale: 'tr',
  sector: 'food',
  categoryId: '',
  scoringMode: 'percentage',
  passingScore: '',
  description: '',
};

const SECTOR_LABEL: Record<AuditSector, string> = {
  food: 'Yeme & İçme',
  hotel: 'Konaklama',
  retail: 'Perakende',
  health: 'Sağlık',
  beauty: 'Güzellik',
  other: 'Diğer',
};

const SCORING_LABEL: Record<AuditScoringMode, string> = {
  percentage: 'Yüzde',
  weighted: 'Ağırlıklı',
  pass_fail: 'Geçti / Kaldı',
};

const SCORING_HINT: Record<AuditScoringMode, string> = {
  percentage:
    'Puanlanan her soru eşit sayılır; sonuç 0-100 arası bir puandır. Çoğu kontrol listesi ve test için uygun.',
  weighted:
    'Her soru ağırlığı (1-10) kadar sayılır. Önemli adımları öne çıkarmak için.',
  pass_fail:
    'Hesap yüzde ile aynıdır; sonuç geçme puanına göre geçti ya da kaldı diye gösterilir. Aşağıya geçme puanı yaz.',
};

// Icon circle on each scoring choice (visual only).
const SCORING_ICON: Record<AuditScoringMode, React.ReactNode> = {
  percentage: <Percent size={17} strokeWidth={1.8} />,
  weighted: <Scale size={17} strokeWidth={1.8} />,
  pass_fail: <Gauge size={17} strokeWidth={1.8} />,
};

const STEPS = [
  { label: 'Temel bilgiler', short: 'Bilgiler' },
  { label: 'Sorular' },
  { label: 'Puanlama ve özet', short: 'Özet' },
] as const;

const QUICK_INPUT_ID = 'admin-template-quick';

type Step = 0 | 1 | 2;

interface Props {
  open: boolean;
  categories: CategoryRef[];
  onClose: () => void;
  onCreated: (notice: string) => void;
}

export default function CreateTemplateWizard({ open, categories, onClose, onCreated }: Props) {
  const [step, setStep] = useState<Step>(0);
  const [reached, setReached] = useState<Step>(0);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [questions, setQuestions] = useState<AuditBuilderQuestion[]>([]);
  const [showQuestionErrors, setShowQuestionErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Categories carry their own `sector`; seeded slugs ("hiring-quiz",
  // "operations-daily"…) have no sector prefix, so matching on the slug
  // left this dropdown permanently empty.
  const filteredCategories = useMemo(
    () => categories.filter((c) => c.sector === form.sector),
    [categories, form.sector],
  );

  const kind = deriveAuditKind(questions.map((q) => q.type));
  const questionErrors = useMemo(() => {
    const out: Record<string, string> = {};
    for (const q of questions) {
      const check = checkQuestionForSave(q, form.locale);
      if (check.ok) continue;
      out[q.clientKey] =
        check.field === 'prompt'
          ? 'Soru metnini yaz ya da soruyu sil.'
          : 'En az 2 seçenek yaz. "Detay"dan ekleyebilirsin.';
    }
    return out;
  }, [questions, form.locale]);
  const questionsValid = Object.keys(questionErrors).length === 0;
  const filledQuestions = questions.filter((q) => q.prompt.trim()).length;

  const canContinueIdentity = form.title.trim().length > 0;
  const passNum = Number(form.passingScore);
  const passValid =
    form.passingScore === '' || (Number.isFinite(passNum) && passNum >= 0 && passNum <= 100);
  const canContinueScoring = passValid;

  function reset() {
    setForm(EMPTY_FORM);
    setQuestions([]);
    setShowQuestionErrors(false);
    setStep(0);
    setReached(0);
    setError(null);
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  /** İleri: aradaki her adım geçerli olmalı; geri her zaman serbest. */
  function goTo(next: Step) {
    if (next > step) {
      if (step <= 0 && !canContinueIdentity) {
        setStep(0);
        setError('Devam etmek için şablon adını yaz.');
        return;
      }
      if (step <= 1 && next > 1 && !questionsValid) {
        setStep(1);
        setShowQuestionErrors(true);
        setError('Boş ya da eksik soruları tamamla veya sil.');
        return;
      }
    }
    setError(null);
    setStep(next);
    setReached((r) => (next > r ? next : r));
  }

  function changeLocale(next: 'tr' | 'en') {
    setForm((f) => ({ ...f, locale: next }));
    // Evet/Hayır seçenekleri ve doğru cevabı yeni dile geçer.
    setQuestions((prev) => localizeYesNoQuestions(prev, next));
  }

  async function handleCreate() {
    if (!canContinueIdentity) return goTo(0);
    if (!questionsValid) {
      setShowQuestionErrors(true);
      setStep(1);
      setError('Boş ya da eksik soruları tamamla veya sil.');
      return;
    }
    if (!canContinueScoring) {
      setError('Geçme puanına 0 ile 100 arasında bir sayı yaz ya da boş bırak.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        sector: form.sector,
        scoringMode: form.scoringMode,
        locale: form.locale,
      };
      if (form.categoryId) body.categoryId = form.categoryId;
      if (form.description.trim()) body.description = form.description.trim();
      if (form.passingScore !== '' && passValid) body.passingScore = passNum;
      if (questions.length > 0) body.questions = toCreateQuestions(questions, form.locale);

      const res = await fetch('/api/admin/audits/templates', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const parsed = await parseAuditErrorResponse(res, 'tr');
        setError(summarizeAuditError(parsed));
        return;
      }
      const count = questions.length;
      reset();
      onCreated(
        count > 0
          ? `Şablon ${count} soruyla taslak olarak oluşturuldu. İşletmeler görsün diye detay ekranından yayınla.`
          : 'Şablon taslak olarak oluşturuldu. Detay ekranından soru ekleyip yayınlayabilirsin.',
      );
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <Modal
      size={760}
      onClose={handleClose}
      title="Yeni hazır şablon"
      description="Taslak olarak oluşturulur; sen yayınlayana kadar işletmeler görmez."
      // Dışarı tıklama / ESC yazılanı sessizce silmesin.
      closeGuard={() => !submitting && (form.title.trim() !== '' || questions.length > 0)}
      closeConfirm={{
        title: 'Şablon oluşturulmadan kapatılsın mı?',
        body: 'Yazdığın ad ve sorular silinir; şablon oluşturulmaz.',
        confirm: 'Oluşturmadan kapat',
        cancel: 'Vazgeç',
      }}
    >
      <div className="space-y-5">
        <WizardSteps
          steps={STEPS}
          current={step}
          isComplete={(i) => i < reached}
          canSelect={(i) => i <= reached}
          onSelect={(i) => goTo(i as Step)}
          ariaLabel="Şablon adımları"
          locale="tr"
          surface="card"
        />

        {error && (
          <AlertBanner kind="danger" onDismiss={() => setError(null)}>
            {error}
          </AlertBanner>
        )}

        {/* Step 0 — Kimlik */}
        {step === 0 && (
          <div className="space-y-4">
            <StepIntro
              icon={<ClipboardCheck size={18} strokeWidth={2} />}
              title="Temel bilgiler"
              body="Ad, dil, sektör ve kategori şablonun hazır şablonlar listesinde nerede görüneceğini belirler. Hepsini sonradan değiştirebilirsin."
            />

            <Field label="Şablon adı" required hint="İşletmeler hazır şablonlar listesinde bu adı görür.">
              <input
                className="bz-input text-[16px] sm:text-[14px]"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    goTo(1);
                  }
                }}
                placeholder="Örn. Yeni garson temel bilgi testi"
                autoFocus
                enterKeyHint="next"
                maxLength={120}
              />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Dil" htmlFor="admin-template-locale">
                <PulseSelect
                  id="admin-template-locale"
                  className="w-full"
                  value={form.locale}
                  onChange={(v) => changeLocale(v === 'en' ? 'en' : 'tr')}
                  options={[
                    { value: 'tr', label: 'Türkçe' },
                    { value: 'en', label: 'English' },
                  ]}
                />
              </Field>
              <Field label="Sektör" htmlFor="admin-template-sector">
                <PulseSelect
                  id="admin-template-sector"
                  className="w-full"
                  value={form.sector}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, sector: v as AuditSector, categoryId: '' }))
                  }
                  options={AUDIT_SECTORS.map((s) => ({ value: s, label: SECTOR_LABEL[s] }))}
                />
              </Field>
            </div>

            <Field
              label="Kategori (isteğe bağlı)"
              htmlFor="admin-template-category"
              hint={
                filteredCategories.length === 0
                  ? 'Bu sektörde kategori yok. Şimdilik boş bırak; Kategoriler sayfasından ekleyip şablona sonra bağlayabilirsin.'
                  : 'Şablonu aynı sektördeki benzerleriyle gruplar. Örn. günlük kontrol, eğitim testi.'
              }
            >
              <PulseSelect
                id="admin-template-category"
                className="w-full"
                value={form.categoryId}
                onChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
                options={[
                  { value: '', label: 'Kategori yok' },
                  ...filteredCategories.map((c) => ({ value: c.id, label: c.labelTr })),
                ]}
              />
            </Field>
          </div>
        )}

        {/* Step 1 — Sorular */}
        {step === 1 && (
          <div className="space-y-4">
            <StepIntro
              icon={<ListChecks size={18} strokeWidth={2} />}
              title="Sorular"
              body='Soruyu yaz ve Enter’a bas; türünü kutunun altından seç. Seçenekleri, doğru cevabı ve ağırlığı "Detay"dan ayarla. Bu adımı boş geçip soruları sonra da ekleyebilirsin.'
            />
            <AuditQuestionList
              locale="tr"
              auditLocale={form.locale}
              kind={kind}
              startKind="checklist"
              questions={questions}
              onChange={setQuestions}
              errors={showQuestionErrors ? questionErrors : undefined}
              inputId={QUICK_INPUT_ID}
            />
          </div>
        )}

        {/* Step 2 — Puanlama & özet */}
        {step === 2 && (
          <div className="space-y-4">
            <StepIntro
              icon={<SlidersHorizontal size={18} strokeWidth={2} />}
              title="Puanlama ve özet"
              body="Puanın nasıl hesaplanacağını ve geçme puanını seç. Bir işletme şablonu kullandığında bu ayarlar denetimine aynen geçer."
            />

            <Field label="Puanlama biçimi">
              <div role="radiogroup" aria-label="Puanlama biçimi" className="grid grid-cols-1 gap-2">
                {AUDIT_SCORING_MODES.map((mode) => {
                  const active = form.scoringMode === mode;
                  return (
                    <WizardChoice
                      key={mode}
                      role="radio"
                      aria-checked={active}
                      selected={active}
                      tone="plain"
                      onClick={() => setForm((f) => ({ ...f, scoringMode: mode }))}
                      icon={SCORING_ICON[mode]}
                      title={SCORING_LABEL[mode]}
                      description={SCORING_HINT[mode]}
                    />
                  );
                })}
              </div>
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[200px_minmax(0,1fr)]">
              <Field
                label="Geçme puanı (0-100)"
                error={passValid ? null : '0 ile 100 arasında bir sayı yaz.'}
                hint="Boş bırakırsan geçti / kaldı gösterilmez, yalnız puan görünür."
              >
                <input
                  className="bz-input text-[16px] tabular-nums sm:text-[14px]"
                  type="text"
                  inputMode="numeric"
                  value={form.passingScore}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, passingScore: e.target.value.replace(/\D/g, '').slice(0, 3) }))
                  }
                  placeholder="Örn. 70"
                />
              </Field>
              <Field label="Açıklama (isteğe bağlı)" hint="İşletmeler şablonu seçerken bu metni görür.">
                <textarea
                  className="bz-input min-h-[92px] text-[16px] sm:text-[14px]"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  maxLength={400}
                  placeholder="Örn. Servis prosedürlerinin günlük kontrolü."
                />
              </Field>
            </div>

            {/* Özet — oluşturulacak şablonun dökümü */}
            <div className="space-y-2">
              <p className="text-[14px] font-medium text-pn-ink">Oluşturulacak şablon</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <WizardSummaryRow
                  tone="plain"
                  icon={<ClipboardCheck size={16} />}
                  label="Şablon adı"
                  value={form.title || 'Adsız şablon'}
                />
                <WizardSummaryRow
                  tone="plain"
                  icon={<Globe size={16} />}
                  label="Sektör ve dil"
                  value={`${SECTOR_LABEL[form.sector]} · ${form.locale === 'tr' ? 'Türkçe' : 'English'}${
                    form.categoryId
                      ? ` · ${filteredCategories.find((c) => c.id === form.categoryId)?.labelTr ?? ''}`
                      : ''
                  }`}
                />
                <WizardSummaryRow
                  tone="plain"
                  icon={<ListChecks size={16} />}
                  label="Sorular"
                  value={
                    filledQuestions > 0
                      ? `${kindLabel(kind, 'tr')} · ${itemsCount(filledQuestions, 'tr')}`
                      : 'Henüz soru yok'
                  }
                />
                <WizardSummaryRow
                  tone="plain"
                  icon={<Target size={16} />}
                  label="Puanlama"
                  value={`${SCORING_LABEL[form.scoringMode]} · ${
                    form.passingScore ? `geçme puanı ${form.passingScore}` : 'geçme puanı yok'
                  }`}
                />
              </div>
            </div>

            <p
              className={`rounded-[18px] px-4 py-3.5 text-[13px] leading-[1.55] ${
                filledQuestions > 0 ? 'bg-pn-accent-soft text-pn-ink' : 'bg-[#FFF6DB] text-[#7A4F00]'
              }`}
            >
              {filledQuestions > 0 ? (
                <>
                  <strong>Taslak olarak oluşturulur.</strong> Detay ekranından kontrol edip
                  &quot;Yayınla&quot; ile işletmelerin hazır şablonlar listesine açabilirsin.
                </>
              ) : (
                <>
                  <strong>Henüz soru yok.</strong> Şablon taslak olarak oluşturulur; yayınlamadan önce
                  detay ekranından en az 1 soru ekle.
                </>
              )}
            </p>
          </div>
        )}

        {/* Eylem çubuğu — pencerenin altında sabit */}
        <WizardFooter variant="modal">
          <button
            type="button"
            onClick={handleClose}
            className={`${WIZARD_BACK_CLASS} sm:mr-auto`}
            disabled={submitting}
          >
            Vazgeç
          </button>
          {step > 0 && (
            <button
              type="button"
              onClick={() => goTo((step - 1) as Step)}
              className={WIZARD_BACK_CLASS}
              disabled={submitting}
            >
              <ArrowLeft size={15} strokeWidth={2} />
              Geri
            </button>
          )}
          {step < 2 ? (
            <button
              type="button"
              onClick={() => goTo((step + 1) as Step)}
              className={`${WIZARD_NEXT_CLASS} max-sm:order-first max-sm:basis-full`}
            >
              {step === 1 && questions.length === 0 ? 'Sorusuz devam et' : 'Devam'}
              <ArrowRight size={15} strokeWidth={2} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              className={`${WIZARD_NEXT_CLASS} max-sm:order-first max-sm:basis-full`}
              disabled={submitting || !canContinueIdentity || !canContinueScoring}
              aria-busy={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Oluşturuluyor…
                </>
              ) : (
                <>
                  <Save size={15} strokeWidth={2} />
                  Taslağı oluştur
                </>
              )}
            </button>
          )}
        </WizardFooter>
      </div>
    </Modal>
  );
}

function StepIntro({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pn-accent text-white"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[20px] font-medium leading-[26px] tracking-[-0.015em] text-pn-ink">{title}</p>
        <p className="mt-1 text-[14px] leading-[1.5] text-[#737373]">{body}</p>
      </div>
    </div>
  );
}
