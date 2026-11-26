'use client';

// The way into a loyalty program (CLAUDE.md §60, §61), inside the
// business's customer panel. Signed-in Buaze customer → one tap, the card
// lands in "Kartlarım". Otherwise a short guest form (first + last name,
// phone; e-mail and birthday optional) and a sign-in link. Membership
// terms + privacy notice must be accepted; marketing is opt-in (§19.1).
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Nfc, ShieldCheck } from 'lucide-react';
import LoyaltyCardFace from '@/components/loyalty/LoyaltyCardFace';
import type { LoyaltyKind } from '@/lib/loyalty';
import { CARD_STORAGE_PREFIX, PUBLIC_COPY, type PublicLocale } from '../loyalty-public';

interface Props {
  locale: PublicLocale;
  slug: string;
  businessName: string;
  source: 'qr' | 'nfc' | 'link';
  ownCardPath: string | null;
  account: { firstName: string; lastName: string; phone: string | null; email: string } | null;
  program: {
    name: string;
    kind: LoyaltyKind;
    accentColor: string | null;
    welcomeBonus: number;
    birthdayReward: string | null;
    rewards: Array<{ title: string; cost: number }>;
  };
}

const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const FIELD =
  'rounded-xl border px-3.5 py-3 text-[16px] outline-none transition focus:ring-2 focus:ring-[color:var(--p-accent)] bg-[var(--p-surface)] border-[color:var(--p-border)] text-[color:var(--p-text)]';
const INPUT = `mt-1 w-full ${FIELD}`;

export default function JoinView({ locale, slug, businessName, source, ownCardPath, account, program }: Props) {
  const t = PUBLIC_COPY[locale];
  const router = useRouter();
  const q = locale === 'en' ? 'lang=en&' : '';
  const [saved, setSaved] = useState<string | null>(null);
  const [mode, setMode] = useState<'account' | 'guest'>(account ? 'account' : 'guest');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: account?.phone ?? '',
    email: '',
    day: '',
    month: '',
    consent: false,
    marketing: false,
    website: '',
  });
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

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const join = async (useAccount: boolean) => {
    if (!form.consent) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const month = Number.parseInt(form.month, 10);
    const day = Number.parseInt(form.day, 10);
    const bday = Number.isFinite(month) && Number.isFinite(day) ? { birthMonth: month, birthDay: day } : {};
    try {
      const res = await fetch(`/api/public/loyalty/${slug}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          useAccount
            ? { useAccount: true, phone: form.phone || null, ...bday, consent: true, marketingConsent: form.marketing, locale, source }
            : {
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                phone: form.phone,
                email: form.email.trim() || null,
                ...bday,
                consent: true,
                marketingConsent: form.marketing,
                locale,
                source,
                ...(form.website ? { website: form.website } : {}),
              },
        ),
      });
      const data = (await res.json().catch(() => null)) as { status?: string; cardPath?: string | null; emailSent?: boolean; code?: string } | null;
      if (res.ok && (data?.status === 'created' || data?.status === 'own') && data.cardPath) {
        try {
          window.localStorage.setItem(`${CARD_STORAGE_PREFIX}${slug}`, data.cardPath);
        } catch {
          /* storage blocked */
        }
        const qs = [locale === 'en' ? 'lang=en' : null, data.status === 'created' ? 'new=1' : null].filter(Boolean).join('&');
        router.push(`${data.cardPath}${qs ? `?${qs}` : ''}`);
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
  const legalQ = locale === 'en' ? '?lang=en' : '';
  const phoneOk = form.phone.replace(/\D/g, '').length >= 7;

  const consentBoxes = (
    <>
      <label className="flex items-start gap-2.5 text-[13px] leading-relaxed">
        <input type="checkbox" checked={form.consent} onChange={(e) => set('consent', e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#0A0A0A]" />
        <span>
          {t.consentAll}{' '}
          <a href={`/l/${slug}/kosullar${legalQ}`} target="_blank" rel="noopener" className="font-medium underline underline-offset-2">
            {t.termsLink}
          </a>
          {' · '}
          <a href={`/l/${slug}/aydinlatma${legalQ}`} target="_blank" rel="noopener" className="font-medium underline underline-offset-2">
            {t.privacyLink}
          </a>
        </span>
      </label>
      <label className="flex items-start gap-2.5 text-[13px] leading-relaxed">
        <input type="checkbox" checked={form.marketing} onChange={(e) => set('marketing', e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#0A0A0A]" />
        <span>{t.marketing}</span>
      </label>
    </>
  );

  const birthdayFields = program.birthdayReward && (
    <fieldset>
      <legend className="text-[13px] font-medium">{t.birthdayLabel}</legend>
      <div className="mt-1 flex gap-2">
        <select value={form.day} onChange={(e) => set('day', e.target.value)} className={`${FIELD} w-28 shrink-0 px-3`} aria-label={t.day}>
          <option value="">{t.day}</option>
          {Array.from({ length: 31 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
        <select value={form.month} onChange={(e) => set('month', e.target.value)} className={`${FIELD} min-w-0 flex-1 px-3`} aria-label={t.month}>
          <option value="">{t.month}</option>
          {months.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );

  const messages = (
    <>
      {error && (
        <p className="rounded-xl bg-[#FEF2F2] px-3 py-2.5 text-[13.5px] text-[#991B1B]" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-xl bg-[#F0FDF4] px-3 py-2.5 text-[13.5px] text-[#166534]" role="status">
          {notice}
        </p>
      )}
    </>
  );

  const primaryBtn =
    'flex min-h-[52px] w-full items-center justify-center rounded-2xl text-[16px] font-semibold transition hover:opacity-90 disabled:opacity-40 bg-[var(--p-accent)] text-[color:var(--p-on-accent)]';
  const panel = 'rounded-[22px] border p-4 space-y-3 bg-[var(--p-surface)] border-[color:var(--p-border)]';

  if (ownCardPath) {
    return (
      <div className={panel}>
        <p className="text-[15px] font-semibold">{t.ownCard}</p>
        <a href={`${ownCardPath}${legalQ}`} className={primaryBtn}>
          {t.openOwnCard} →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <LoyaltyCardFace
        businessName={businessName}
        programName={program.name}
        kind={program.kind}
        balance={program.welcomeBonus}
        rewards={program.rewards}
        accentColor={program.accentColor}
        locale={locale}
      />

      {source === 'nfc' && (
        <p className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--p-muted)' }}>
          <Nfc size={16} className="mt-0.5 shrink-0" aria-hidden /> {t.nfcHint}
        </p>
      )}

      {saved && (
        <a href={saved} className="flex items-center justify-between gap-3 rounded-2xl border border-[#A8D62E] bg-[#F6FCE4] px-4 py-3 text-[#0A0A0A]">
          <span className="text-[14px]">{t.savedOnDevice}</span>
          <span className="text-[14px] font-semibold">{t.openMyCard} →</span>
        </a>
      )}

      {account && mode === 'account' ? (
        <form
          className={panel}
          onSubmit={(e) => {
            e.preventDefault();
            void join(true);
          }}
        >
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0A0A0A] text-[17px] font-semibold text-[#C6F24E]">
              {account.firstName.charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold">
                {account.firstName} {account.lastName}
              </p>
              <p className="truncate text-[13px]" style={{ color: 'var(--p-muted)' }}>
                {account.email}
              </p>
            </div>
          </div>
          {!account.phone && (
            <label className="block">
              <span className="text-[13px] font-medium">{t.phone}</span>
              <input required type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={INPUT} inputMode="tel" autoComplete="tel" placeholder="05xx xxx xx xx" />
              <span className="mt-1 block text-[12px]" style={{ color: 'var(--p-muted)' }}>
                {t.phoneHint}
              </span>
            </label>
          )}
          <p className="flex items-start gap-2 text-[12.5px]" style={{ color: 'var(--p-muted)' }}>
            <ShieldCheck size={15} className="mt-0.5 shrink-0" aria-hidden /> {t.accountShares}
          </p>
          {consentBoxes}
          {messages}
          <button type="submit" disabled={busy || !form.consent || !phoneOk} className={primaryBtn}>
            {busy ? <Loader2 size={18} className="animate-spin" /> : t.accountJoin(account.firstName)}
          </button>
          <button type="button" onClick={() => setMode('guest')} className="w-full text-center text-[13px] underline underline-offset-2" style={{ color: 'var(--p-muted)' }}>
            {t.guestInstead}
          </button>
        </form>
      ) : (
        <>
          {!account && (
            <div className={panel}>
              <p className="text-[15px] font-semibold">{t.withAccountTitle}</p>
              <p className="text-[13px]" style={{ color: 'var(--p-muted)' }}>
                {t.withAccountLead}
              </p>
              <a href={`/hesap?${q}next=${encodeURIComponent(`/l/${slug}${source === 'nfc' ? '?source=nfc' : ''}`)}`} className={primaryBtn}>
                {t.signInGoogle}
              </a>
            </div>
          )}
          {!account && (
            <div className="flex items-center gap-3 text-[12px] uppercase tracking-[0.14em]" style={{ color: 'var(--p-muted)' }}>
              <span className="h-px flex-1" style={{ background: 'var(--p-border)' }} />
              {t.orGuest}
              <span className="h-px flex-1" style={{ background: 'var(--p-border)' }} />
            </div>
          )}
          <form
            className={panel}
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void join(false);
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[13px] font-medium">{t.firstName}</span>
                <input required value={form.firstName} maxLength={40} onChange={(e) => set('firstName', e.target.value)} className={INPUT} autoComplete="given-name" autoCapitalize="words" enterKeyHint="next" />
              </label>
              <label className="block">
                <span className="text-[13px] font-medium">{t.lastName}</span>
                <input required value={form.lastName} maxLength={40} onChange={(e) => set('lastName', e.target.value)} className={INPUT} autoComplete="family-name" autoCapitalize="words" enterKeyHint="next" />
              </label>
            </div>
            <label className="block">
              <span className="text-[13px] font-medium">{t.phone}</span>
              <input required type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={INPUT} inputMode="tel" autoComplete="tel" placeholder="05xx xxx xx xx" enterKeyHint="next" />
              <span className="mt-1 block text-[12px]" style={{ color: 'var(--p-muted)' }}>
                {t.phoneHint}
              </span>
            </label>
            <label className="block">
              <span className="text-[13px] font-medium">{t.email}</span>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={INPUT} inputMode="email" autoComplete="email" autoCapitalize="off" autoCorrect="off" spellCheck={false} enterKeyHint="next" />
              <span className="mt-1 block text-[12px]" style={{ color: 'var(--p-muted)' }}>
                {t.emailHint}
              </span>
            </label>
            {birthdayFields}
            {/* Honeypot: hidden from people, tempting for bots. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => set('website', e.target.value)}
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
              aria-hidden="true"
            />
            {consentBoxes}
            {messages}
            <button
              type="submit"
              disabled={busy || !form.consent || !form.firstName.trim() || !form.lastName.trim() || !phoneOk}
              className={primaryBtn}
            >
              {busy ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" /> {t.submitting}
                </>
              ) : (
                t.submit
              )}
            </button>
            {account && (
              <button type="button" onClick={() => setMode('account')} className="w-full text-center text-[13px] underline underline-offset-2" style={{ color: 'var(--p-muted)' }}>
                {t.useAccountInstead}
              </button>
            )}
          </form>
        </>
      )}
    </div>
  );
}
