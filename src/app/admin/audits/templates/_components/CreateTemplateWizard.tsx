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
import { ArrowLeft, ArrowRight, ClipboardCheck, ListChecks, Loader2, Save, SlidersHorizontal, Sparkles } from 'lucide-react';
import { AlertBanner, Field, Modal, PulseSelect, WizardSteps } from '@/components/ui';
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
    'Toplam puan / max puan × 100. Çoğu kalite kontrol / kalibrasyon denetimi için uygun.',
  weighted:
    'Soru başına ağırlık (1-10) ile çarpılır. Kritik adımları öne çıkarmak için iyi seçim.',
  pass_fail:
    'Tek geçme eşiği. Doğru yanıt veren her soru tam puan, yanlış 0. Hızlı temel kontrol.',
};

const STEPS = [
  { label: 'Kimlik' },
  { label: 'Sorular' },
  { label: 'Puanlama & özet', short: 'Özet' },
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
          ? 'Soru metni boş olamaz.'
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
        setError('Başlık zorunlu.');
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
      setError('Geçme puanı 0-100 aralığında olmalı veya boş bırakılmalı.');
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
          ? `Şablon ${count} soruyla taslak olarak oluşturuldu. Detay ekranından yayınlayabilirsin.`
          : 'Şablon oluşturuldu (taslak). Sorular eklendikten sonra yayınlayabilirsin.',
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
      // Dışarı tıklama / ESC yazılanı sessizce silmesin.
      closeGuard={() => !submitting && (form.title.trim() !== '' || questions.length > 0)}
    >
      <div className="space-y-5">
        <WizardSteps
          steps={STEPS}
          current={step}
          isComplete={(i) => i < reached}
          canSelect={(i) => i <= reached}
          onSelect={(i) => goTo(i as Step)}
          ariaLabel="Şablon adımları"
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
              title="Şablon kimliği"
              body="Sektör, dil ve kategori şablonun işletme kataloğunda nasıl gruplandırılacağını belirler. Hepsi sonradan düzenlenebilir."
            />

            <Field label="Başlık" required hint="İşletme sahibi şablon listesinde bu metni görür">
              <input
                className="bz-input"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    goTo(1);
                  }
                }}
                placeholder="Örn. F&B yeni eleman temel quiz"
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
              label="Kategori (opsiyonel)"
              htmlFor="admin-template-category"
              hint={
                filteredCategories.length === 0
                  ? 'Bu sektör için kategori yok. Kategoriler sayfasından ekleyebilirsin.'
                  : 'Aynı sektör içinde alt-konu gruplaması (örn. "günlük checklist" / "eğitim quiz").'
              }
            >
              <PulseSelect
                id="admin-template-category"
                className="w-full"
                value={form.categoryId}
                onChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
                options={[
                  { value: '', label: '— Yok —' },
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
              body='Soruyu yaz, Enter’a bas. Türü çipten seç; seçenekleri, doğru cevabı ve ağırlığı "Detay"dan ayarla. İstersen boş bırakıp sonra detay ekranından ekleyebilirsin.'
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
              body="Skor hesaplama biçimi ve geçme eşiği. Şablon yayına açıldığında işletmeye kopyalanan denetimlere aynen geçer."
            />

            <Field label="Puanlama modu">
              <div role="radiogroup" aria-label="Puanlama modu" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {AUDIT_SCORING_MODES.map((mode) => {
                  const active = form.scoringMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setForm((f) => ({ ...f, scoringMode: mode }))}
                      className={`flex items-start gap-3 rounded-[24px] border p-3.5 text-left transition-all ${
                        active
                          ? 'border-pn-accent bg-pn-accent-soft'
                          : 'border-pn-line bg-white hover:border-pn-ink/40'
                      }`}
                    >
                      <span
                        className={`mt-0.5 h-3 w-3 shrink-0 rounded-full ${
                          active ? 'bg-pn-accent ring-2 ring-pn-accent-soft' : 'bg-[#E5E5E5]'
                        }`}
                      />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium text-pn-ink">
                          {SCORING_LABEL[mode]}
                        </span>
                        <span className="mt-1 block text-[12px] leading-[1.45] text-[#737373]">
                          {SCORING_HINT[mode]}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[200px_minmax(0,1fr)]">
              <Field
                label="Geçme puanı (0-100)"
                error={passValid ? null : '0 ile 100 arasında olmalı.'}
                hint="Boşsa yalnız skor görünür."
              >
                <input
                  className="bz-input"
                  type="text"
                  inputMode="numeric"
                  value={form.passingScore}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, passingScore: e.target.value.replace(/\D/g, '').slice(0, 3) }))
                  }
                  placeholder="örn. 70"
                />
              </Field>
              <Field label="Açıklama (opsiyonel)" hint="İşletme sahibi şablon seçim ekranında görür.">
                <textarea
                  className="bz-input min-h-[80px]"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  maxLength={400}
                  placeholder="Örn. Servis prosedürlerinin günlük kontrolü."
                />
              </Field>
            </div>

            <div className="rounded-[24px] bg-[#3B1F8F] p-5 text-white">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-medium text-white/75">ŞABLON ÖZETİ</span>
                <Sparkles size={15} className="text-white" />
              </div>
              <p className="mt-3 break-words text-[18px] font-medium leading-tight">
                {form.title || 'Başlıksız şablon'}
              </p>
              <p className="mt-1 text-[12px] text-white/55">
                {SECTOR_LABEL[form.sector]} · {form.locale === 'tr' ? 'Türkçe' : 'English'}
                {form.categoryId
                  ? ` · ${filteredCategories.find((c) => c.id === form.categoryId)?.labelTr ?? ''}`
                  : ''}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3 rounded-[24px] bg-white/8 p-3">
                <div>
                  <span className="text-[13px] font-medium text-white/55">Sorular</span>
                  <p className="mt-1 text-[13px] font-medium text-white">
                    {filledQuestions > 0 ? `${kindLabel(kind, 'tr')} · ${itemsCount(filledQuestions, 'tr')}` : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[13px] font-medium text-white/55">Mod</span>
                  <p className="mt-1 text-[13px] font-medium text-white">{SCORING_LABEL[form.scoringMode]}</p>
                </div>
                <div>
                  <span className="text-[13px] font-medium text-white/55">Geçme</span>
                  <p className="mt-1 text-[13px] font-medium text-white">
                    {form.passingScore ? `≥ ${form.passingScore}` : '—'}
                  </p>
                </div>
              </div>
            </div>

            <p
              className={`rounded-[24px] border p-3.5 text-[13px] leading-[1.55] ${
                filledQuestions > 0
                  ? 'border-pn-line bg-pn-canvas text-[#525252]'
                  : 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]'
              }`}
            >
              {filledQuestions > 0 ? (
                <>
                  <strong>Taslak olarak oluşturulur.</strong> Detay ekranından kontrol edip
                  &quot;Yayınla&quot; ile işletme sahiplerinin kataloğuna açabilirsin.
                </>
              ) : (
                <>
                  <strong>Henüz soru yok.</strong> Şablon taslak oluşur; yayınlamadan önce detay
                  ekranından en az 1 soru ekle.
                </>
              )}
            </p>
          </div>
        )}

        {/* Sticky bottom action bar */}
        <div className="sticky bottom-0 -mx-6 flex flex-col gap-2 border-t border-pn-line bg-white/95 px-6 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleClose}
            className="bz-btn-ghost order-2 sm:order-1"
            disabled={submitting}
          >
            Vazgeç
          </button>
          <div className="order-1 flex gap-2 sm:order-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => goTo((step - 1) as Step)}
                className="bz-btn-ghost flex-1 sm:flex-none"
                disabled={submitting}
              >
                <ArrowLeft size={14} strokeWidth={2} />
                Geri
              </button>
            )}
            {step < 2 ? (
              <button
                type="button"
                onClick={() => goTo((step + 1) as Step)}
                className="bz-btn-primary flex-1 sm:flex-none"
              >
                {step === 1 && questions.length === 0 ? 'Sorusuz devam et' : 'Devam'}
                <ArrowRight size={14} strokeWidth={2} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreate}
                className="bz-btn-primary flex-1 disabled:opacity-60 sm:flex-none"
                disabled={submitting || !canContinueIdentity || !canContinueScoring}
                aria-busy={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Oluşturuluyor…
                  </>
                ) : (
                  <>
                    <Save size={14} strokeWidth={2} />
                    Taslak olarak oluştur
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function StepIntro({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-[24px] border border-pn-line bg-pn-canvas p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[20px] bg-pn-accent text-white">
          {icon}
        </div>
        <div>
          <p className="text-[15px] font-medium text-pn-ink">{title}</p>
          <p className="mt-1 text-[13px] leading-[1.55] text-[#525252]">{body}</p>
        </div>
      </div>
    </div>
  );
}
