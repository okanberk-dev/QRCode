'use client';

// Loyalty join form (CLAUDE.md §60). Mobile first; KVKK consent required,
// marketing opt-in unchecked by default (§19.1). After joining the card link
// is remembered on this device and the card opens.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Cake, Crown, Gift, Loader2 } from 'lucide-react';
import LoyaltyCardFace from '@/components/loyalty/LoyaltyCardFace';
import type { LoyaltyKind, LoyaltyTier } from '@/lib/loyalty';
import { CARD_STORAGE_PREFIX, PUBLIC_COPY, type PublicLocale } from '../loyalty-public';

interface Props {
  locale: PublicLocale;
  slug: string;
  businessName: string;
  program: {
    name: string;
    kind: LoyaltyKind;
    accentColor: string | null;
    welcomeBonus: number;
    birthdayReward: string | null;
    terms: string | null;
    earnLine: string;
    rewardLines: string[];
    rewards: Array<{ title: string; cost: number }>;
    tiers: LoyaltyTier[];
  };
}

const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function JoinView({ locale, slug, businessName, program }: Props) {
  const t = PUBLIC_COPY[locale];
  const router = useRouter();
  const [saved, setSaved] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', day: '', month: '', consent: false, marketing: false, website: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      setSaved(window.localStorage.getItem(`${CARD_STORAGE_PREFIX}${slug}`));
    } catch {
      setSaved(null);
    }
  }, [locale, slug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.consent) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const month = Number.parseInt(form.month, 10);
    const day = Number.parseInt(form.day, 10);
    try {
      const res = await fetch(`/api/public/loyalty/${slug}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone,
          email: form.email.trim() || null,
          ...(Number.isFinite(month) && Number.isFinite(day) ? { birthMonth: month, birthDay: day } : {}),
          consent: true,
          marketingConsent: form.marketing,
          locale,
          ...(form.website ? { website: form.website } : {}),
        }),
      });
      const data = (await res.json().catch(() => null)) as { status?: string; cardPath?: string | null; emailSent?: boolean; code?: string } | null;
      if (res.ok && data?.status === 'created' && data.cardPath) {
        try {
          window.localStorage.setItem(`${CARD_STORAGE_PREFIX}${slug}`, data.cardPath);
        } catch {
          /* storage blocked */
        }
        router.push(`${data.cardPath}${locale === 'en' ? '?lang=en&new=1' : '?new=1'}`);
        return;
      }
      if (res.ok && data?.status === 'exists') {
        setNotice(data.emailSent ? t.existsMailed : t.exists);
        return;
      }
      setError(t.errors[data?.code ?? ''] ?? t.errors.DEFAULT);
    } catch {
      setError(t.errors.DEFAULT);
    } finally {
      setBusy(false);
    }
  };

  const months = locale === 'tr' ? MONTHS_TR : MONTHS_EN;

  return (
    <main className="min-h-dvh bg-[#FAFAFA] px-4 pb-12 pt-6">
      <div className="mx-auto w-full max-w-[440px]">
        <p className="text-center text-[12px] font-semibold uppercase tracking-[0.16em] text-[#737373]">{businessName}</p>
        <h1 className="mt-2 text-center text-[26px] font-semibold leading-tight text-[#0A0A0A]">{t.joinTitle}</h1>
        <p className="mt-1.5 text-center text-[14px] text-[#525252]">{t.joinLead}</p>

        <div className="mt-5">
          <LoyaltyCardFace
            businessName={businessName}
            programName={program.name}
            kind={program.kind}
            balance={program.welcomeBonus}
            rewards={program.rewards}
            accentColor={program.accentColor}
            locale={locale}
          />
        </div>

        {saved && (
          <a href={saved} className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[#A8D62E] bg-[#F6FCE4] px-4 py-3">
            <span className="text-[14px] text-[#262626]">{t.savedOnDevice}</span>
            <span className="text-[14px] font-semibold text-[#0A0A0A]">{t.openMyCard} →</span>
          </a>
        )}

        <section className="mt-5 rounded-2xl border border-[#EDEDED] bg-white p-4">
          <h2 className="text-[15px] font-semibold text-[#0A0A0A]">{t.howItWorks}</h2>
          <p className="mt-1.5 text-[14px] text-[#262626]">{program.earnLine}</p>
          <ul className="mt-3 space-y-2">
            {program.rewardLines.map((line) => (
              <li key={line} className="flex items-start gap-2 text-[14px] text-[#0A0A0A]">
                <Gift size={16} className="mt-0.5 shrink-0 text-[#65A30D]" aria-hidden="true" /> {line}
              </li>
            ))}
            {program.birthdayReward && (
              <li className="flex items-start gap-2 text-[14px] text-[#0A0A0A]">
                <Cake size={16} className="mt-0.5 shrink-0 text-[#DB2777]" aria-hidden="true" /> {t.birthday}: {program.birthdayReward}
              </li>
            )}
            {program.tiers.map((tier) => (
              <li key={tier.name} className="flex items-start gap-2 text-[14px] text-[#0A0A0A]">
                <Crown size={16} className="mt-0.5 shrink-0 text-[#CA8A04]" aria-hidden="true" />
                {tier.name}: {locale === 'tr' ? `${tier.minVisits}. ziyaretten sonra` : `from visit ${tier.minVisits}`}
                {tier.perk ? ` — ${tier.perk}` : ''}
              </li>
            ))}
          </ul>
        </section>

        <form onSubmit={submit} className="mt-5 space-y-3 rounded-2xl border border-[#EDEDED] bg-white p-4" noValidate>
          <label className="block">
            <span className="text-[13px] font-medium text-[#262626]">{t.name}</span>
            <input
              required
              value={form.name}
              maxLength={60}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-[#E5E5E5] px-3.5 py-3 text-[16px] outline-none focus:border-[#0A0A0A]"
              autoComplete="given-name"
              autoCapitalize="words"
              enterKeyHint="next"
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-medium text-[#262626]">{t.phone}</span>
            <input
              required
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-[#E5E5E5] px-3.5 py-3 text-[16px] outline-none focus:border-[#0A0A0A]"
              inputMode="tel"
              autoComplete="tel"
              placeholder="05xx xxx xx xx"
              enterKeyHint="next"
            />
            <span className="mt-1 block text-[12px] text-[#737373]">{t.phoneHint}</span>
          </label>
          <label className="block">
            <span className="text-[13px] font-medium text-[#262626]">{t.email}</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-[#E5E5E5] px-3.5 py-3 text-[16px] outline-none focus:border-[#0A0A0A]"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
            />
            <span className="mt-1 block text-[12px] text-[#737373]">{t.emailHint}</span>
          </label>
          {program.birthdayReward && (
            <fieldset>
              <legend className="text-[13px] font-medium text-[#262626]">{t.birthdayLabel}</legend>
              <div className="mt-1 flex gap-2">
                <select
                  value={form.day}
                  onChange={(e) => setForm((f) => ({ ...f, day: e.target.value }))}
                  className="w-24 rounded-xl border border-[#E5E5E5] bg-white px-3 py-3 text-[16px]"
                  aria-label={t.day}
                >
                  <option value="">{t.day}</option>
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
                <select
                  value={form.month}
                  onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))}
                  className="min-w-0 flex-1 rounded-xl border border-[#E5E5E5] bg-white px-3 py-3 text-[16px]"
                  aria-label={t.month}
                >
                  <option value="">{t.month}</option>
                  {months.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </fieldset>
          )}
          {/* Honeypot: hidden from people, tempting for bots. */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            className="absolute -left-[9999px] h-0 w-0 opacity-0"
            aria-hidden="true"
          />
          <label className="flex items-start gap-2.5 pt-1 text-[13px] leading-relaxed text-[#262626]">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(e) => setForm((f) => ({ ...f, consent: e.target.checked }))}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#0A0A0A]"
            />
            <span>
              {t.consent(businessName)}{' '}
              <a href={locale === 'tr' ? '/tr/kvkk' : '/en/privacy'} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2">
                {t.notice}
              </a>
            </span>
          </label>
          <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[#262626]">
            <input
              type="checkbox"
              checked={form.marketing}
              onChange={(e) => setForm((f) => ({ ...f, marketing: e.target.checked }))}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#0A0A0A]"
            />
            <span>{t.marketing}</span>
          </label>

          {error && <p className="rounded-xl bg-[#FEF2F2] px-3 py-2.5 text-[13.5px] text-[#991B1B]" role="alert">{error}</p>}
          {notice && <p className="rounded-xl bg-[#F0FDF4] px-3 py-2.5 text-[13.5px] text-[#166534]" role="status">{notice}</p>}

          <button
            type="submit"
            disabled={busy || !form.consent || !form.name.trim() || form.phone.replace(/\D/g, '').length < 7}
            className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[#0A0A0A] text-[16px] font-semibold text-white transition-colors hover:bg-[#1A1A1A] disabled:opacity-40"
          >
            {busy ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" /> {t.submitting}
              </>
            ) : (
              t.submit
            )}
          </button>
        </form>

        {program.terms && (
          <section className="mt-4 rounded-2xl border border-[#EDEDED] bg-white p-4">
            <h2 className="text-[13px] font-semibold text-[#0A0A0A]">{t.terms}</h2>
            <p className="mt-1 whitespace-pre-line text-[13px] text-[#525252]">{program.terms}</p>
          </section>
        )}

        <p className="mt-5 text-center text-[12px] text-[#737373]">{t.noReviewNote}</p>
        <p className="mt-1 text-center text-[12px] text-[#A3A3A3]">{t.controller(businessName)}</p>
      </div>
    </main>
  );
}
