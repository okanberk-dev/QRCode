'use client';

import { useState, use, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Loader2,
  MapPin,
  QrCode,
  Sparkles,
  Store,
  Users,
} from 'lucide-react';
import BuazeLogo from '@/components/marketing/BuazeLogo';
import type { Locale } from '@/lib/translations';
import { AlertBanner, PlatformChip, type PlatformId } from '@/components/ui';
import { SECTORS, getSectorById } from '@/lib/sectors';
import { getSectorPlatforms } from '@/lib/sector-platforms';

type StepId = 'profile' | 'sector' | 'location' | 'platforms' | 'qr';

interface Props {
  params: Promise<{ locale: Locale }>;
}

interface OnboardingState {
  bizName: string;
  contactName: string;
  phone: string;
  sector: string;
  locationName: string;
  city: string;
  platforms: string[];
  qrTemplate: 'lime' | 'dark' | 'white' | 'minimal';
}

const INITIAL: OnboardingState = {
  bizName: '',
  contactName: '',
  phone: '',
  sector: '',
  locationName: '',
  city: '',
  platforms: ['google'],
  qrTemplate: 'lime',
};

export default function OnboardingPage({ params }: Props) {
  const { locale } = use(params);
  const isTr = locale === 'tr';
  const router = useRouter();
  const [step, setStep] = useState<StepId>('profile');
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<OnboardingState>(INITIAL);

  const steps: { id: StepId; label: { tr: string; en: string }; icon: React.ComponentType<{ size?: number }> }[] = [
    { id: 'profile', label: { tr: 'İşletme', en: 'Business' }, icon: Store },
    { id: 'sector', label: { tr: 'Sektör', en: 'Sector' }, icon: Compass },
    { id: 'location', label: { tr: 'Konum', en: 'Location' }, icon: MapPin },
    { id: 'platforms', label: { tr: 'Platformlar', en: 'Platforms' }, icon: Users },
    { id: 'qr', label: { tr: 'İlk QR', en: 'First QR' }, icon: QrCode },
  ];

  const currentIdx = steps.findIndex((s) => s.id === step);
  const isLast = currentIdx === steps.length - 1;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [stateRes, restaurantsRes, profileRes] = await Promise.all([
          fetch('/api/onboarding/state'),
          fetch('/api/restaurants'),
          fetch('/api/user/profile'),
        ]);

        if (cancelled) return;

        const next: OnboardingState = { ...INITIAL };

        if (profileRes.ok) {
          const profile = await profileRes.json();
          if (typeof profile?.name === 'string') next.contactName = profile.name;
        }

        if (restaurantsRes.ok) {
          const restaurantsPayload = await restaurantsRes.json();
          const restaurants = Array.isArray(restaurantsPayload)
            ? restaurantsPayload
            : Array.isArray(restaurantsPayload?.data)
              ? restaurantsPayload.data
              : [];
          const first = restaurants[0] ?? null;
          if (first) {
            if (typeof first.name === 'string') next.bizName = first.name;
            if (typeof first.phone === 'string') next.phone = first.phone;
            if (typeof first.category === 'string') next.sector = first.category.toLowerCase();
            if (typeof first.address === 'string') {
              next.locationName = first.name ?? '';
              next.city = first.address;
            }
          }
        }

        if (stateRes.ok) {
          const saved = await stateRes.json();
          const savedData = saved?.data && typeof saved.data === 'object' ? saved.data : null;
          if (savedData) Object.assign(next, savedData);
          if (typeof saved?.step === 'number') {
            const savedIdx = Math.min(Math.max(saved.step - 1, 0), steps.length - 1);
            setStep(steps[savedIdx].id);
          }
        }

        setData(next);
      } catch {
        // Keep the empty wizard usable even if prefill endpoints fail.
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // `steps` is a module-level const array — stable across renders. Mount-only
    // prefill load (empty deps intentional).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = <K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const goNext = async () => {
    setSaving(true);
    try {
      await fetch('/api/onboarding/state', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ step: currentIdx + 2, data }),
      });
    } catch {
      /* ignore */
    }
    setSaving(false);
    if (currentIdx < steps.length - 1) setStep(steps[currentIdx + 1].id);
  };

  // "Tamamla" — user finished the wizard. Backend creates a restaurant only
  // if bizName is filled (see /api/onboarding/complete).
  const finish = async () => {
    setSaving(true);
    try {
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch {
      /* ignore */
    }
    router.push(`/${locale}/dashboard`);
  };

  // "Sonra tamamla" — user skipped the wizard. ONLY persist progress state;
  // do NOT create a restaurant (even if partial data was typed in).
  const skipLater = async () => {
    setSaving(true);
    try {
      await fetch('/api/onboarding/state', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ step: currentIdx + 1, data }),
      });
    } catch {
      /* ignore */
    }
    router.push(`/${locale}/dashboard`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA]">
      <header className="sticky top-0 z-20 border-b border-[#EDEDED] bg-white px-4 py-4 sm:px-10">
        <div className="mx-auto flex w-full max-w-[1040px] items-center justify-between">
          <Link href={`/${locale}`} className="flex items-center gap-2.5">
            <BuazeLogo size={32} />
            <span
              className="text-[18px] font-medium tracking-[-0.03em] text-[#0A0A0A]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              buaze<span className="text-[#C6F24E]">.</span>
            </span>
          </Link>
          <button
            onClick={skipLater}
            disabled={saving}
            className="text-[13px] font-semibold text-[#0A0A0A] transition-opacity hover:opacity-70 disabled:opacity-50"
          >
            {isTr ? 'Sonra tamamla' : 'Finish later'}
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="mx-auto w-full max-w-[1040px] flex-1 px-4 py-8 sm:px-10 sm:py-12">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="pulse-eyebrow text-[#737373]">
                {isTr ? 'ADIM' : 'STEP'} {currentIdx + 1} / {steps.length}
              </p>
              <h1
                className="mt-2 text-[32px] font-medium leading-[1.08] tracking-[-0.035em] text-[#0A0A0A] sm:text-[44px]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {step === 'profile' && (isTr ? 'İşletmenizi tanıyalım.' : "Tell us about your business.")}
                {step === 'sector' && (isTr ? 'Hangi sektördesiniz?' : 'Which sector?')}
                {step === 'location' && (isTr ? 'İlk konumunuzu ekleyin.' : 'Add your first location.')}
                {step === 'platforms' && (isTr ? 'Hangi platformlar?' : 'Which platforms?')}
                {step === 'qr' && (isTr ? 'İlk QR kodunuz.' : 'Your first QR code.')}
              </h1>
              <p className="mt-2 max-w-[560px] text-[14px] text-[#737373]">
                {step === 'profile' && (isTr
                  ? 'Bu bilgiler QR kartlarında ve müşteri ekranında görünecek.'
                  : 'These details will appear on your QR cards and customer-facing screens.')}
                {step === 'sector' && (isTr
                  ? 'Sektörünüze göre akış ve entegrasyon önerilerini özelleştiriyoruz.'
                  : 'We tailor the flow and integration suggestions based on your sector.')}
                {step === 'location' && (isTr
                  ? 'Her konum için ayrı QR kodları, ayrı analitik. Sonra şube ekleyebilirsiniz.'
                  : 'Separate QRs and analytics per location. Add more branches later.')}
                {step === 'platforms' && (isTr
                  ? 'Müşterilerinize bu platformlardaki herkese açık yorum bağlantılarını sunarız. Her müşteri istediği yere yorum yazma hakkını korur; düşük puan veren müşteriler önce ekibinizle özel paylaşım yapmayı tercih edebilir.'
                  : 'We surface the public review links you have selected to your customers. Every customer keeps the choice to post anywhere; customers giving low ratings can choose to share privately with your team first.')}
                {step === 'qr' && (isTr
                  ? 'Tasarımı seçin, indirin ve masanıza yapıştırın. Kurulum tamamlandı.'
                  : 'Pick a design, download, stick to your table. Setup complete.')}
              </p>
            </div>
          </div>

            <div className="mb-6 flex items-start">
              {steps.map((s, i) => {
                const done = i < currentIdx;
                const active = i === currentIdx;
                return (
                  <div key={s.id} className="flex min-w-0 flex-1 items-start">
                    <div className="flex min-w-0 flex-col items-center gap-2">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-semibold transition-all ${
                          done
                            ? 'bg-[#C6F24E] text-[#0A0A0A]'
                            : active
                              ? 'bg-[#0A0A0A] text-[#C6F24E] ring-[6px] ring-[#C6F24E]/25'
                              : 'border-2 border-[#EDEDED] bg-[#F5F5F5] text-[#A3A3A3]'
                        }`}
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        {done ? <Check size={16} strokeWidth={2.5} /> : i + 1}
                      </div>
                      <span className={`pulse-eyebrow hidden whitespace-nowrap sm:inline ${active ? 'text-[#0A0A0A]' : done ? 'text-[#16A34A]' : 'text-[#A3A3A3]'}`}>
                        {s.label[isTr ? 'tr' : 'en']}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`mt-[18px] h-0.5 flex-1 ${done ? 'bg-[#C6F24E]' : 'bg-[#EDEDED]'}`} />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="rounded-3xl border border-[#EDEDED] bg-white p-5 shadow-[0_8px_24px_rgba(10,10,10,0.04)] sm:p-8">
              {step === 'profile' && <ProfileStep isTr={isTr} data={data} update={update} />}
              {step === 'sector' && <SectorStep isTr={isTr} data={data} update={update} />}
              {step === 'location' && <LocationStep isTr={isTr} data={data} update={update} />}
              {step === 'platforms' && <PlatformStep isTr={isTr} data={data} update={update} />}
              {step === 'qr' && <QrStep isTr={isTr} data={data} update={update} />}
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                onClick={() => currentIdx > 0 && setStep(steps[currentIdx - 1].id)}
                disabled={currentIdx === 0}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E5E5] px-5 py-2.5 text-[13px] font-medium text-[#525252] transition-colors hover:border-[#0A0A0A] hover:text-[#0A0A0A] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft size={14} /> {isTr ? 'Geri' : 'Back'}
              </button>
            {isLast ? (
              <FinishButton isTr={isTr} onFinish={finish} saving={saving} />
            ) : (
              <button
                onClick={goNext}
                disabled={saving}
                className="pulse-btn-dark inline-flex items-center gap-1.5 rounded-full disabled:opacity-50"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                {isTr ? 'Devam' : 'Continue'}
                {!saving && <ArrowRight size={13} />}
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

// ─── Step 1: Profile ─────────────────────────────────────────
function ProfileStep({
  isTr,
  data,
  update,
}: {
  isTr: boolean;
  data: OnboardingState;
  update: <K extends keyof OnboardingState>(k: K, v: OnboardingState[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-[#525252]">
        {isTr
          ? 'Bu bilgiler QR kartlarında ve müşteri ekranında görünecek.'
          : 'Used on QR cards and on the customer-facing screens.'}
      </p>
      <FormRow label={isTr ? 'İşletme adı' : 'Business name'}>
        <input
          value={data.bizName}
          onChange={(e) => update('bizName', e.target.value)}
          placeholder={isTr ? 'örn. Ark Bistro' : 'e.g. Ark Bistro'}
          className={inputCls}
        />
      </FormRow>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormRow label={isTr ? 'İletişim kişisi' : 'Contact name'}>
          <input
            value={data.contactName}
            onChange={(e) => update('contactName', e.target.value)}
            placeholder="Emre Kaya"
            className={inputCls}
          />
        </FormRow>
        <FormRow label={isTr ? 'Telefon' : 'Phone'}>
          <input
            value={data.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="+90 5XX XXX XX XX"
            className={inputCls}
          />
        </FormRow>
      </div>
    </div>
  );
}

// ─── Step 2: Sector ──────────────────────────────────────────
function SectorStep({
  isTr,
  data,
  update,
}: {
  isTr: boolean;
  data: OnboardingState;
  update: <K extends keyof OnboardingState>(k: K, v: OnboardingState[K]) => void;
}) {
  const allowedPlatforms = getSectorPlatforms(getSectorById(data.sector)?.label);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {SECTORS.map((s) => {
          const selected = data.sector === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => update('sector', s.id)}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                selected
                  ? 'border-[#0A0A0A] bg-[#EAF9B8]'
                  : 'border-[#EDEDED] bg-white hover:border-[#0A0A0A]'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p
                  className="text-[15px] font-semibold text-[#0A0A0A]"
                  style={{ fontFamily: 'var(--font-space-grotesk)' }}
                >
                  {s.display[isTr ? 'tr' : 'en']}
                </p>
                <p className="mt-0.5 text-[12px] text-[#737373]">{s.sub[isTr ? 'tr' : 'en']}</p>
              </div>
              {selected && (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0A0A0A] text-[#C6F24E]">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div aria-live="polite">
        <span className="pulse-eyebrow block text-[#737373]">
          {isTr ? 'Bu sektörde görünecek' : 'Visible in this sector'}
        </span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {Array.from(allowedPlatforms).map((platform) => (
            <PlatformChip key={platform} id={platform} size={20} withLabel />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Location ────────────────────────────────────────
function LocationStep({
  isTr,
  data,
  update,
}: {
  isTr: boolean;
  data: OnboardingState;
  update: <K extends keyof OnboardingState>(k: K, v: OnboardingState[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-[#525252]">
        {isTr
          ? 'Her konum için ayrı QR ve analitik. Şube eklemek sonra Ayarlar → Konumlar menüsünden.'
          : 'Each location gets its own QR and analytics. Add more later in Settings → Locations.'}
      </p>
      <FormRow label={isTr ? 'Konum adı' : 'Location name'}>
        <input
          value={data.locationName}
          onChange={(e) => update('locationName', e.target.value)}
          placeholder={isTr ? 'örn. Kadıköy Şubesi' : 'e.g. Kadıköy branch'}
          className={inputCls}
        />
      </FormRow>
      <FormRow label={isTr ? 'Şehir' : 'City'}>
        <input
          value={data.city}
          onChange={(e) => update('city', e.target.value)}
          placeholder={isTr ? 'İstanbul' : 'Istanbul'}
          className={inputCls}
        />
      </FormRow>
      <AlertBanner kind="lime" icon={<MapPin size={14} className="mt-0.5 shrink-0" />}>
        {isTr
          ? 'Birden fazla şubeniz varsa endişelenmeyin — ilk kurulum sonrası kolayca ekleyebilirsiniz.'
          : 'Got more than one branch? No stress — add them after the first setup in one click.'}
      </AlertBanner>
    </div>
  );
}

// ─── Step 4: Platforms ───────────────────────────────────────
function PlatformStep({
  isTr,
  data,
  update,
}: {
  isTr: boolean;
  data: OnboardingState;
  update: <K extends keyof OnboardingState>(k: K, v: OnboardingState[K]) => void;
}) {
  // Onboarding platform seçimi (Step 11). `chip` kanonik PlatformId — UI'da
  // <PlatformChip> ile marka kutucuğu render eder. `group` segmentation:
  // review (Google/Tripadvisor/Yelp), delivery (YS/Getir/Trendyol),
  // hospitality (Airbnb otel + konaklama).
  const PLATFORM_OPTIONS = [
    { id: 'google', chip: 'google', label: 'Google', group: 'review' as const },
    { id: 'tripadvisor', chip: 'tripadvisor', label: 'Tripadvisor', group: 'review' as const },
    { id: 'yelp', chip: 'yelp', label: 'Yelp', group: 'review' as const },
    { id: 'yandex', chip: 'yandex', label: 'Yandex', group: 'review' as const },
    { id: 'yemeksepeti', chip: 'yemeksepeti', label: 'Yemeksepeti', group: 'delivery' as const },
    { id: 'getir', chip: 'getir', label: 'Getir', group: 'delivery' as const },
    { id: 'trendyol_go', chip: 'trendyol', label: 'Trendyol GO', group: 'delivery' as const },
    { id: 'booking', chip: 'booking', label: 'Booking', group: 'hospitality' as const },
    { id: 'airbnb', chip: 'airbnb', label: 'Airbnb', group: 'hospitality' as const },
  ];

  const toggle = (id: string) => {
    update('platforms', data.platforms.includes(id)
      ? data.platforms.filter((p) => p !== id)
      : [...data.platforms, id]);
  };

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-[#525252]">
        {isTr
          ? 'Yüksek puanları hangi platforma yönlendirelim? İstediğin kadar seçebilirsin.'
          : 'Which platforms should we route high ratings to? Pick as many as you like.'}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {PLATFORM_OPTIONS.map((p) => {
          const on = data.platforms.includes(p.id);
          const groupLabel = p.group === 'review'
            ? isTr ? 'YORUM' : 'REVIEWS'
            : p.group === 'delivery'
              ? isTr ? 'PAKET' : 'DELIVERY'
              : isTr ? 'KONAKLAMA' : 'HOSPITALITY';
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                on
                  ? 'border-[#0A0A0A] bg-[#EAF9B8]'
                  : 'border-[#EDEDED] bg-white hover:border-[#0A0A0A]'
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <PlatformChip id={p.chip as PlatformId} size={32} />
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[#0A0A0A] truncate">{p.label}</p>
                  <p className="pulse-eyebrow text-[#737373]">{groupLabel}</p>
                </div>
              </div>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  on ? 'border-[#0A0A0A] bg-[#0A0A0A] text-[#C6F24E]' : 'border-[#EDEDED] bg-white'
                }`}
              >
                {on && <Check size={11} strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 5: QR (preview + template) ─────────────────────────
function QrStep({
  isTr,
  data,
  update,
}: {
  isTr: boolean;
  data: OnboardingState;
  update: <K extends keyof OnboardingState>(k: K, v: OnboardingState[K]) => void;
}) {
  const templates = [
    { id: 'lime' as const, bg: '#C6F24E', fg: '#0A0A0A', label: 'Lime', bordered: false },
    { id: 'dark' as const, bg: '#0A0A0A', fg: '#FFFFFF', label: isTr ? 'Koyu' : 'Dark', bordered: false },
    { id: 'white' as const, bg: '#FFFFFF', fg: '#0A0A0A', label: isTr ? 'Beyaz' : 'White', bordered: true },
    { id: 'minimal' as const, bg: '#F5F5F5', fg: '#0A0A0A', label: 'Minimal', bordered: true },
  ];
  const t = templates.find((x) => x.id === data.qrTemplate) ?? templates[0];

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <FormRow label={isTr ? 'Şablon' : 'Template'}>
          <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {templates.map((tp) => {
              const on = data.qrTemplate === tp.id;
              return (
                <button
                  key={tp.id}
                  type="button"
                  onClick={() => update('qrTemplate', tp.id)}
                  className={`aspect-[3/4] rounded-lg text-[10px] font-medium transition-all ${
                    on ? 'scale-105 ring-2 ring-[#0A0A0A]' : tp.bordered ? 'border border-[#EDEDED]' : ''
                  }`}
                  style={{ background: tp.bg, color: tp.fg }}
                >
                  {tp.label}
                </button>
              );
            })}
          </div>
        </FormRow>
        <p className="mt-4 text-[12px] text-[#525252]">
          {isTr
            ? 'Tasarımı seç, PDF + PNG + SVG olarak indir. Masaya yapıştır — kurulum biter.'
            : "Pick a design, download PDF + PNG + SVG, stick it to the table, you're done."}
        </p>
      </div>
      <div
        className="flex aspect-[3/4] flex-col justify-between rounded-2xl p-5 sm:p-6"
        style={{
          background: t.bg,
          color: t.fg,
          border: t.bordered ? '1px solid #EDEDED' : 'none',
          boxShadow: '0 24px 56px -20px rgba(0,0,0,0.18)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <p
            className="text-[17px] font-semibold leading-tight"
            style={{ fontFamily: 'var(--font-space-grotesk)' }}
          >
            {data.bizName || (isTr ? 'İşletme Adı' : 'Your business')}
          </p>
          <span className="pulse-eyebrow opacity-70">
            {isTr ? 'MASA' : 'TABLE'} · 01
          </span>
        </div>
        <div className="mx-auto my-3 flex aspect-square w-28 items-center justify-center rounded-xl bg-white p-2 sm:w-32">
          <QrCode size={72} strokeWidth={1.5} className="text-[#0A0A0A]" />
        </div>
        <div className="text-center">
          <p
            className="text-[15px] font-semibold"
            style={{ fontFamily: 'var(--font-space-grotesk)' }}
          >
            {isTr ? 'Deneyiminizi paylaşın' : 'Share your experience'}
          </p>
          <p className="pulse-eyebrow mt-1 opacity-70">
            buaze.co/r/{(data.bizName || 'your-biz').toLowerCase().replace(/\s+/g, '-').slice(0, 18)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Finish button (with confetti burst) ─────────────────────
function FinishButton({ isTr, onFinish, saving }: { isTr: boolean; onFinish: () => void; saving: boolean }) {
  const [popping, setPopping] = useState(false);

  const onClick = () => {
    if (saving || popping) return;
    setPopping(true);
    setTimeout(onFinish, 1100);
  };

  return (
    <>
      {popping && <ConfettiBurst />}
      <button
        onClick={onClick}
        disabled={saving || popping}
        className="inline-flex items-center gap-1.5 rounded-full bg-[#0A0A0A] px-6 py-3 text-[14px] font-semibold text-white hover:bg-[#1A1A1A] disabled:opacity-60"
      >
        {(saving || popping) ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {isTr ? 'Yayınla & paneli aç' : 'Publish & open panel'}
      </button>
    </>
  );
}

// ─── Lightweight confetti burst — DOM-only, no deps ──────────
type ConfettiParticle = {
  i: number;
  angle: number;
  distance: number;
  delay: number;
  size: number;
  rot: number;
};

function ConfettiBurst() {
  // Compute random parameters once on mount; re-renders (e.g. from React
  // strict mode's double invoke) must not re-randomise them or the animation
  // restarts with different physics mid-flight.
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);
  useEffect(() => {
    setParticles(
      Array.from({ length: 40 }, (_, i) => ({
        i,
        angle: (i / 40) * 360 + Math.random() * 20 - 10,
        distance: 180 + Math.random() * 220,
        delay: Math.random() * 80,
        size: 6 + Math.random() * 6,
        rot: Math.random() * 720 - 360,
      })),
    );
  }, []);

  const colors = ['#C6F24E', '#0A0A0A', '#A8D62E', '#EAF9B8', '#FFFFFF'];
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map((p) => {
        const color = colors[p.i % colors.length];
        return (
          <span
            key={p.i}
            className="absolute left-1/2 top-1/2"
            style={{
              width: p.size,
              height: p.size * 0.4,
              background: color,
              transform: 'translate(-50%, -50%)',
              borderRadius: 2,
              animation: `confettiFly 1000ms cubic-bezier(0.2, 0.8, 0.2, 1) ${p.delay}ms forwards`,
              ['--cf-x' as string]: `${Math.cos((p.angle * Math.PI) / 180) * p.distance}px`,
              ['--cf-y' as string]: `${Math.sin((p.angle * Math.PI) / 180) * p.distance}px`,
              ['--cf-rot' as string]: `${p.rot}deg`,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Shared bits ─────────────────────────────────────────────
const inputCls = 'bz-input';

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="pulse-eyebrow text-[#737373]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
