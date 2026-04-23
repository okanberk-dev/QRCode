'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Loader2, MapPin, QrCode, UserPlus, Users } from 'lucide-react';
import BuazeLogo from '@/components/marketing/BuazeLogo';
import type { Locale } from '@/lib/translations';

type StepId = 'profile' | 'placement' | 'platforms' | 'team';

interface Props {
  params: Promise<{ locale: Locale }>;
}

export default function OnboardingPage({ params }: Props) {
  const { locale } = use(params);
  const isTr = locale === 'tr';
  const router = useRouter();
  const [step, setStep] = useState<StepId>('profile');
  const [saving, setSaving] = useState(false);

  const steps: { id: StepId; label: { tr: string; en: string }; icon: React.ComponentType<{ size?: number }> }[] = [
    { id: 'profile', label: { tr: 'İşletme bilgileri', en: 'Business details' }, icon: MapPin },
    { id: 'placement', label: { tr: 'QR yerleştir', en: 'Place QR' }, icon: QrCode },
    { id: 'platforms', label: { tr: 'Platformlar', en: 'Platforms' }, icon: Users },
    { id: 'team', label: { tr: 'Takım davet', en: 'Invite team' }, icon: UserPlus },
  ];

  const currentIdx = steps.findIndex((s) => s.id === step);

  const goNext = async () => {
    setSaving(true);
    try {
      await fetch('/api/onboarding/state', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ step: currentIdx + 2 }),
      });
    } catch {
      /* ignore */
    }
    setSaving(false);
    if (currentIdx < steps.length - 1) setStep(steps[currentIdx + 1].id);
    else await finish();
  };

  const finish = async () => {
    setSaving(true);
    try {
      await fetch('/api/onboarding/complete', { method: 'POST' });
    } catch {
      /* ignore */
    }
    router.push(`/${locale}/dashboard`);
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-[#EDEDED]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <BuazeLogo size={28} />
            <span className="text-[17px] font-medium tracking-[-0.03em] text-[#0A0A0A]" style={{ fontFamily: 'var(--font-heading)' }}>
              buaze<span className="text-[#C6F24E]">.</span>
            </span>
          </Link>
          <button
            onClick={finish}
            className="text-[12px] font-medium text-[#737373] hover:text-[#0A0A0A]"
          >
            {isTr ? 'Sonra yaparım' : 'Skip for now'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <div className="mb-8 flex items-center gap-2 text-[11px]">
          {steps.map((s, i) => (
            <div key={s.id} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  i < currentIdx
                    ? 'bg-[#0A0A0A] text-white'
                    : i === currentIdx
                      ? 'bg-[#C6F24E] text-[#0A0A0A]'
                      : 'bg-[#F5F5F5] text-[#737373]'
                }`}
              >
                {i < currentIdx ? <Check size={12} /> : <span className="pulse-eyebrow">{String(i + 1).padStart(2, '0')}</span>}
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 flex-1 ${i < currentIdx ? 'bg-[#0A0A0A]' : 'bg-[#EDEDED]'}`} />
              )}
            </div>
          ))}
        </div>

        <p className="pulse-eyebrow text-[#737373]">
          {isTr ? 'ADIM' : 'STEP'} {currentIdx + 1} / {steps.length}
        </p>
        <h1
          className="mt-2 text-[34px] font-medium leading-tight tracking-tight text-[#0A0A0A] sm:text-[44px]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {step === 'profile' && (isTr ? 'İşletmeni tanıyalım.' : 'Tell us about your business.')}
          {step === 'placement' && (isTr ? 'QR’ı nereye koyacaksın?' : 'Where will the QR live?')}
          {step === 'platforms' && (isTr ? 'Hangi platformlar?' : 'Which platforms?')}
          {step === 'team' && (isTr ? 'Takımını davet et.' : 'Invite your team.')}
        </h1>

        <div className="mt-8 rounded-2xl border border-[#EDEDED] bg-white p-5 sm:p-8">
          {step === 'profile' && <ProfileStep isTr={isTr} />}
          {step === 'placement' && <PlacementStep isTr={isTr} />}
          {step === 'platforms' && <PlatformStep isTr={isTr} />}
          {step === 'team' && <TeamStep isTr={isTr} />}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => currentIdx > 0 && setStep(steps[currentIdx - 1].id)}
            disabled={currentIdx === 0}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#525252] hover:text-[#0A0A0A] disabled:opacity-40"
          >
            <ArrowLeft size={14} /> {isTr ? 'Geri' : 'Back'}
          </button>
          <button
            onClick={goNext}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#C6F24E] px-5 py-2.5 text-[13px] font-semibold text-[#0A0A0A] hover:bg-[#A8D62E] disabled:opacity-50"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            {currentIdx === steps.length - 1
              ? isTr
                ? 'Paneli aç'
                : 'Open panel'
              : isTr
                ? 'Devam'
                : 'Continue'}
            {!saving && currentIdx < steps.length - 1 && <ArrowRight size={13} />}
          </button>
        </div>
      </main>
    </div>
  );
}

function ProfileStep({ isTr }: { isTr: boolean }) {
  return (
    <div className="space-y-4">
      <FormRow
        label={isTr ? 'İşletme adı' : 'Business name'}
        input={<input placeholder="Kadıköy Bistro" className="w-full rounded-lg border border-[#EDEDED] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#0A0A0A]" />}
      />
      <FormRow
        label={isTr ? 'Kategori' : 'Category'}
        input={
          <select className="w-full rounded-lg border border-[#EDEDED] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#0A0A0A]">
            <option>{isTr ? 'Restoran' : 'Restaurant'}</option>
            <option>{isTr ? 'Kafe' : 'Cafe'}</option>
            <option>{isTr ? 'Otel' : 'Hotel'}</option>
            <option>{isTr ? 'Berber / Güzellik' : 'Salon / Beauty'}</option>
          </select>
        }
      />
      <FormRow
        label={isTr ? 'Konum' : 'Location'}
        input={<input placeholder="İstanbul, Türkiye" className="w-full rounded-lg border border-[#EDEDED] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#0A0A0A]" />}
      />
    </div>
  );
}

function PlacementStep({ isTr }: { isTr: boolean }) {
  const opts = [
    { id: 'table', tr: 'Masa QR', en: 'Table QR', desc: { tr: 'Her masaya tek QR', en: 'One QR per table' } },
    { id: 'receipt', tr: 'Fatura QR', en: 'Receipt QR', desc: { tr: 'Fatura / fişte', en: 'On bill / receipt' } },
    { id: 'door', tr: 'Kapı çıkış', en: 'Door exit', desc: { tr: 'Kapı çıkışında sticker', en: 'Sticker at exit' } },
    { id: 'pack', tr: 'Paket', en: 'Package', desc: { tr: 'Paket siparişte', en: 'On delivery pack' } },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {opts.map((o) => (
        <button
          key={o.id}
          className="rounded-xl border border-[#EDEDED] bg-white p-4 text-left hover:border-[#0A0A0A]"
        >
          <p className="text-[14px] font-semibold text-[#0A0A0A]">{o[isTr ? 'tr' : 'en']}</p>
          <p className="mt-1 text-[12px] text-[#737373]">{o.desc[isTr ? 'tr' : 'en']}</p>
        </button>
      ))}
    </div>
  );
}

function PlatformStep({ isTr }: { isTr: boolean }) {
  const platforms = [
    { id: 'google', label: 'Google' },
    { id: 'yemeksepeti', label: 'Yemeksepeti' },
    { id: 'getir', label: 'Getir' },
    { id: 'trendyol_go', label: 'Trendyol GO' },
  ];
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-[#525252]">
        {isTr
          ? 'Yüksek puanları hangi platforma yönlendirelim? İstediğin kadar seç.'
          : 'Which platforms should we route high ratings to? Pick as many as you like.'}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {platforms.map((p) => (
          <label
            key={p.id}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[13px] hover:border-[#0A0A0A]"
          >
            <input type="checkbox" defaultChecked={p.id === 'google'} className="h-4 w-4 rounded border-[#EDEDED]" />
            <span className="font-medium text-[#0A0A0A]">{p.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function TeamStep({ isTr }: { isTr: boolean }) {
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-[#525252]">
        {isTr
          ? 'Yorumlara yanıt verecek veya paneli kullanacak takım arkadaşlarının e-postalarını ekleyebilirsin. Sonra da davet edebilirsin.'
          : 'Add teammates who will reply to reviews or use the panel. You can also do this later.'}
      </p>
      <input placeholder="teammate@company.com" className="w-full rounded-lg border border-[#EDEDED] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#0A0A0A]" />
      <p className="text-[12px] text-[#737373]">
        {isTr ? 'Virgülle ayırarak birden fazla e-posta ekleyebilirsin.' : 'Separate multiple emails with commas.'}
      </p>
    </div>
  );
}

function FormRow({ label, input }: { label: string; input: React.ReactNode }) {
  return (
    <label className="block">
      <span className="pulse-eyebrow text-[#737373]">{label}</span>
      <div className="mt-1">{input}</div>
    </label>
  );
}
