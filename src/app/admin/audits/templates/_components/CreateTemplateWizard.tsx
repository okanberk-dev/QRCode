'use client';

// CLAUDE.md §42 — Audit template creation wizard (3-step).
//
// Adımlar:
//   1. Kimlik — title (required) + locale + sector + category
//   2. Puanlama — scoringMode + passingScore + description (özet)
//   3. Önizleme — özet + "Oluştur" CTA
//
// CreateBusinessWizard (`/dashboard/restaurants` Modal) paterniyle uyumlu;
// step counter + Pulse styling + sticky bottom action bar. Sorular bu
// adımda eklenmez (taslak oluşur, detail page'inde soru CRUD).

import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, Loader2, Save, SlidersHorizontal, Sparkles } from 'lucide-react';
import { AlertBanner, Field, Modal } from '@/components/ui';
import {
  AUDIT_SCORING_MODES,
  AUDIT_SECTORS,
  type AuditScoringMode,
  type AuditSector,
} from '@/lib/audits/types';
import {
  parseAuditErrorResponse,
  summarizeAuditError,
} from '@/lib/audits/error-humanizer';

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
  { tr: 'Kimlik', en: 'Identity', icon: ClipboardCheck },
  { tr: 'Puanlama', en: 'Scoring', icon: SlidersHorizontal },
  { tr: 'Önizleme', en: 'Review', icon: Sparkles },
] as const;

type Step = 0 | 1 | 2;

interface Props {
  open: boolean;
  categories: CategoryRef[];
  onClose: () => void;
  onCreated: (notice: string) => void;
}

export default function CreateTemplateWizard({ open, categories, onClose, onCreated }: Props) {
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Categories carry their own `sector`; seeded slugs ("hiring-quiz",
  // "operations-daily"…) have no sector prefix, so matching on the slug
  // left this dropdown permanently empty.
  const filteredCategories = useMemo(
    () => categories.filter((c) => c.sector === form.sector),
    [categories, form.sector],
  );

  const canContinueIdentity = form.title.trim().length > 0;
  const passNum = Number(form.passingScore);
  const passValid =
    form.passingScore === '' || (Number.isFinite(passNum) && passNum >= 0 && passNum <= 100);
  const canContinueScoring = passValid;

  function reset() {
    setForm(EMPTY_FORM);
    setStep(0);
    setError(null);
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  function continueTo(next: Step) {
    if (next === 1 && !canContinueIdentity) {
      setError('Başlık zorunlu.');
      return;
    }
    if (next === 2 && !canContinueScoring) {
      setError('Geçme puanı 0-100 aralığında olmalı veya boş bırakılmalı.');
      return;
    }
    setError(null);
    setStep(next);
  }

  async function handleCreate() {
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
      reset();
      onCreated('Şablon oluşturuldu (taslak). Sorular eklendikten sonra yayınlayabilirsin.');
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <Modal size={680} onClose={handleClose} title="Yeni hazır şablon">
      <div className="space-y-5">
        {/* Step indicator — CreateBusinessWizard paterni */}
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#F5F5F5] p-1.5">
          {STEPS.map((s, idx) => {
            const active = idx === step;
            const complete = idx < step;
            const Icon = s.icon;
            return (
              <button
                key={s.tr}
                type="button"
                disabled={idx > step && !canContinueIdentity}
                onClick={() => {
                  if (idx <= step) {
                    setError(null);
                    setStep(idx as Step);
                  }
                }}
                className={`flex min-h-[44px] min-w-0 items-center justify-center gap-1.5 rounded-xl px-1.5 text-[11px] font-semibold transition-all sm:gap-2 sm:px-2 sm:text-[12px] ${
                  active
                    ? 'bg-white text-[#0A0A0A] shadow-sm'
                    : complete
                      ? 'text-[#0A0A0A]'
                      : 'text-[#737373]'
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                    active || complete ? 'bg-[#C6F24E] text-[#0A0A0A]' : 'bg-white text-[#737373]'
                  }`}
                >
                  {complete ? <Check size={12} strokeWidth={2.4} /> : <Icon size={12} />}
                </span>
                <span className="truncate">{s.tr}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <AlertBanner kind="danger" onDismiss={() => setError(null)}>
            {error}
          </AlertBanner>
        )}

        {/* Step 0 — Kimlik */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C6F24E] text-[#0A0A0A]">
                  <ClipboardCheck size={18} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[#0A0A0A]">Şablon kimliği</p>
                  <p className="mt-1 text-[12.5px] leading-[1.55] text-[#525252]">
                    Sektör, dil ve kategori şablonun işletme kataloğunda nasıl gruplandırılacağını
                    belirler. Hepsi sonradan düzenlenebilir.
                  </p>
                </div>
              </div>
            </div>

            <Field label="Başlık" required hint="İşletme sahibi şablon listesinde bu metni görür">
              <input
                className="bz-input"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Örn. F&B yeni eleman temel quiz"
                autoFocus
                maxLength={120}
              />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Dil">
                <select
                  className="bz-input"
                  value={form.locale}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, locale: e.target.value as 'tr' | 'en' }))
                  }
                >
                  <option value="tr">Türkçe</option>
                  <option value="en">English</option>
                </select>
              </Field>
              <Field label="Sektör">
                <select
                  className="bz-input"
                  value={form.sector}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sector: e.target.value as AuditSector,
                      categoryId: '',
                    }))
                  }
                >
                  {AUDIT_SECTORS.map((s) => (
                    <option key={s} value={s}>
                      {SECTOR_LABEL[s]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field
              label="Kategori (opsiyonel)"
              hint={
                filteredCategories.length === 0
                  ? 'Bu sektör için kategori yok. Kategoriler sayfasından ekleyebilirsin.'
                  : 'Aynı sektör içinde alt-konu gruplaması (örn. "günlük checklist" / "eğitim quiz").'
              }
            >
              <select
                className="bz-input"
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              >
                <option value="">— Yok —</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.labelTr}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {/* Step 1 — Puanlama */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#EAF9B8] bg-[#F7FAEF] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C6F24E] text-[#0A0A0A]">
                  <SlidersHorizontal size={18} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[#0A0A0A]">Puanlama mantığı</p>
                  <p className="mt-1 text-[12.5px] leading-[1.55] text-[#525252]">
                    Skor hesaplama biçimi ve geçme eşiği. Sorular eklendikten sonra şablonu yayına
                    açtığında otomatik uygulanır.
                  </p>
                </div>
              </div>
            </div>

            <Field label="Puanlama modu">
              <div className="grid grid-cols-1 gap-2">
                {AUDIT_SCORING_MODES.map((mode) => {
                  const active = form.scoringMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, scoringMode: mode }))}
                      className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                        active
                          ? 'border-[#C6F24E] bg-[#F7FAEF] shadow-[0_10px_30px_-24px_rgba(10,10,10,0.35)]'
                          : 'border-[#EDEDED] bg-white hover:border-[#C6F24E]/70'
                      }`}
                    >
                      <span
                        className={`mt-0.5 h-3 w-3 shrink-0 rounded-full ${
                          active ? 'bg-[#C6F24E]' : 'bg-[#E5E5E5]'
                        }`}
                      />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-[#0A0A0A]">
                          {SCORING_LABEL[mode]}
                        </span>
                        <span className="mt-1 block text-[11.5px] leading-[1.45] text-[#737373]">
                          {SCORING_HINT[mode]}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field
              label="Geçme puanı (opsiyonel, 0-100)"
              hint="Boş bırakılırsa sadece skor görünür, geçti/kaldı rozeti çıkmaz."
            >
              <input
                className="bz-input"
                type="number"
                min={0}
                max={100}
                value={form.passingScore}
                onChange={(e) => setForm((f) => ({ ...f, passingScore: e.target.value }))}
                placeholder="örn. 70"
              />
            </Field>

            <Field
              label="Açıklama (opsiyonel)"
              hint="İşletme sahibi şablon seçim ekranında özet metin olarak görür."
            >
              <textarea
                className="bz-input min-h-[80px]"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                maxLength={400}
                placeholder="Örn. Servis prosedürlerinin günlük kontrolü."
              />
            </Field>
          </div>
        )}

        {/* Step 2 — Önizleme */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#EDEDED] bg-[#0A0A0A] p-5 text-white">
              <div className="flex items-center justify-between gap-3">
                <span className="pulse-eyebrow text-white/60">ŞABLON ÖZETİ</span>
                <Sparkles size={15} className="text-[#C6F24E]" />
              </div>
              <p className="mt-3 break-words text-[18px] font-semibold leading-tight">
                {form.title || 'Başlıksız şablon'}
              </p>
              <p className="mt-1 text-[12px] text-white/55">
                {SECTOR_LABEL[form.sector]} · {form.locale === 'tr' ? 'Türkçe' : 'English'}
                {form.categoryId
                  ? ` · ${filteredCategories.find((c) => c.id === form.categoryId)?.labelTr ?? ''}`
                  : ''}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-white/8 p-3">
                <div>
                  <span className="pulse-eyebrow text-white/55">Mod</span>
                  <p className="mt-1 text-[13px] font-medium text-white">
                    {SCORING_LABEL[form.scoringMode]}
                  </p>
                </div>
                <div>
                  <span className="pulse-eyebrow text-white/55">Geçme</span>
                  <p className="mt-1 text-[13px] font-medium text-white">
                    {form.passingScore ? `≥ ${form.passingScore}` : '—'}
                  </p>
                </div>
              </div>
              {form.description && (
                <p className="mt-3 text-[12px] leading-[1.55] text-white/70">
                  {form.description}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-3.5 text-[12.5px] leading-[1.55] text-[#92400E]">
              <p>
                <strong>Bu şablon taslak olarak oluşturulur.</strong> Yayınlamadan önce detay
                ekranından en az 1 soru ekle. Sonra &quot;Yayınla&quot; butonuyla işletme sahiplerinin kataloğuna açılır.
              </p>
            </div>
          </div>
        )}

        {/* Sticky bottom action bar */}
        <div className="sticky bottom-0 -mx-6 flex flex-col gap-2 border-t border-[#EDEDED] bg-white/95 px-6 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
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
                onClick={() => setStep((s) => (Math.max(0, s - 1) as Step))}
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
                onClick={() => continueTo((step + 1) as Step)}
                className="bz-btn-primary flex-1 disabled:opacity-50 sm:flex-none"
                disabled={(step === 0 && !canContinueIdentity) || (step === 1 && !canContinueScoring)}
              >
                Devam
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
                    Oluştur
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
