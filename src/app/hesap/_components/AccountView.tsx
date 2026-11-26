'use client';

// Signed-in Buaze customer (CLAUDE.md §61): "Kartlarım", add a card held by
// link, profile, password / sign-in methods, sign out, delete account.
import { useState } from 'react';
import { ChevronRight, Gift, Loader2, Plus, ShieldCheck, Store } from 'lucide-react';
import { LoyaltyCardFace } from '@/components/loyalty/LoyaltyCardFace';
import { nextReward, unitLabel, activeRewards } from '@/lib/loyalty';
import type { CustomerDto } from '@/lib/customer-auth';
import type { CustomerCard } from '@/lib/customer-account';
import { ACCOUNT_COPY, accountError, customerApi, errorCode, type AccountLocale } from '../account-copy';
import { ErrorLine, Labeled } from './AuthView';

export default function AccountView({
  locale,
  account: initialAccount,
  cards: initialCards,
  verified,
}: {
  locale: AccountLocale;
  account: CustomerDto;
  cards: CustomerCard[];
  verified: '1' | '0' | null;
}) {
  const c = ACCOUNT_COPY[locale];
  const [account, setAccount] = useState(initialAccount);
  const [cards, setCards] = useState(initialCards);

  const reloadCards = async () => {
    try {
      const { data } = await customerApi<{ cards: CustomerCard[] }>('/api/customer/cards');
      setCards(data.cards);
    } catch {
      /* keep the list */
    }
  };

  const since = new Date(account.createdAt).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Istanbul',
  });

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[28px] bg-[#0A0A0A] px-5 py-6 text-white sm:px-8 sm:py-8">
        <div aria-hidden className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-[#C6F24E] opacity-20 blur-3xl" />
        <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-white/60">{c.brand}</p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.02em] sm:text-[34px]">{c.hello(account.firstName)}</h1>
        <p className="mt-1 text-[14px] text-white/65">{c.memberSince(since)}</p>
        <div className="mt-5 flex flex-wrap gap-2 text-[13px]">
          <span className="rounded-full bg-white/10 px-3 py-1.5">
            {cards.length} {locale === 'tr' ? 'kart' : cards.length === 1 ? 'card' : 'cards'}
          </span>
          {account.emailVerified && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#C6F24E] px-3 py-1.5 font-medium text-[#0A0A0A]">
              <ShieldCheck size={14} /> {locale === 'tr' ? 'E-posta onaylı' : 'E-mail confirmed'}
            </span>
          )}
        </div>
      </section>

      {verified === '1' && <Banner kind="ok" text={c.verifiedOk} />}
      {!account.emailVerified && <VerifyBanner locale={locale} failed={verified === '0'} />}

      <section id="kartlar" aria-labelledby="kartlar-baslik" className="scroll-mt-20">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 id="kartlar-baslik" className="text-[20px] font-semibold tracking-[-0.01em]">
            {c.myCards}
          </h2>
        </div>
        {cards.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[#D4D4D4] bg-white p-6 text-center">
            <Gift className="mx-auto text-[#A3A3A3]" size={28} aria-hidden />
            <p className="mt-2 text-[15px] font-medium">{c.cardsEmpty}</p>
            <p className="mx-auto mt-1 max-w-[380px] text-[13.5px] text-[#737373]">{c.cardsEmptyLead}</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {cards.map((card) => (
              <li key={card.id}>
                <CardTile card={card} locale={locale} />
              </li>
            ))}
          </ul>
        )}
        <AddCard locale={locale} onAdded={reloadCards} />
      </section>

      <ProfileSection locale={locale} account={account} onSaved={(a) => { setAccount(a); void reloadCards(); }} />
      <SecuritySection locale={locale} account={account} onChanged={setAccount} />
      <DangerSection locale={locale} hasPassword={account.hasPassword} />
    </div>
  );
}

function CardTile({ card, locale }: { card: CustomerCard; locale: AccountLocale }) {
  const c = ACCOUNT_COPY[locale];
  const kind = card.program.kind;
  const next = nextReward(card.balance, card.program.rewards);
  const ready = activeRewards(card.program.rewards).some((r) => r.cost <= card.balance);
  return (
    <article className="group rounded-[24px] border border-[#EDEDED] bg-white p-3 shadow-[0_10px_30px_-24px_rgba(10,10,10,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(10,10,10,0.4)]">
      <a href={card.cardPath} className="block rounded-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8D62E]" aria-label={`${card.businessName} — ${c.openCard}`}>
        <LoyaltyCardFace
          businessName={card.businessName}
          programName={card.program.name}
          kind={kind}
          balance={card.balance}
          rewards={card.program.rewards}
          accentColor={card.program.accentColor}
          code={card.code}
          locale={locale}
        />
      </a>
      <div className="flex flex-wrap items-center justify-between gap-2 px-1.5 pb-1 pt-3">
        <div className="min-w-0 text-[13px] text-[#525252]">
          {!card.available ? (
            <span className="text-[#92400E]">{c.unavailable}</span>
          ) : ready ? (
            <span className="font-semibold text-[#3F6212]">{c.rewardReady}</span>
          ) : next ? (
            <span>{c.rewardLeft(next.remaining, unitLabel(kind, next.remaining, locale))}</span>
          ) : (
            <span>
              {card.visits} {c.visits}
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          <a href={card.portalPath} className="inline-flex h-9 items-center gap-1 rounded-full border border-[#EDEDED] px-3 text-[13px] font-medium hover:border-[#0A0A0A]">
            <Store size={14} aria-hidden /> {c.visitPortal}
          </a>
          <a href={card.cardPath} className="inline-flex h-9 items-center gap-0.5 rounded-full bg-[#0A0A0A] px-3.5 text-[13px] font-medium text-white hover:bg-[#1A1A1A]">
            {c.openCard} <ChevronRight size={14} aria-hidden />
          </a>
        </div>
      </div>
    </article>
  );
}

function AddCard({ locale, onAdded }: { locale: AccountLocale; onAdded: () => void }) {
  const c = ACCOUNT_COPY[locale];
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const m = /\/k\/([A-Za-z0-9_-]{24,64})/.exec(value) ?? /^([A-Za-z0-9_-]{24,64})$/.exec(value.trim());
    if (!m) {
      setError(c.errors.CARD_NOT_FOUND);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await customerApi('/api/customer/cards/link', { body: { token: m[1] } });
      setDone(true);
      setValue('');
      onAdded();
    } catch (err) {
      setError(accountError(c, errorCode(err)));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[#525252] underline-offset-2 hover:text-[#0A0A0A] hover:underline">
        <Plus size={15} aria-hidden /> {c.addCard}
      </button>
    );
  }
  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-[22px] border border-[#EDEDED] bg-white p-4">
      <p className="text-[14px] font-semibold">{c.addCard}</p>
      <p className="text-[13px] text-[#737373]">{c.addCardLead}</p>
      <input value={value} onChange={(e) => setValue(e.target.value)} className="bz-input w-full" placeholder={c.addCardPlaceholder} inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-label={c.addCard} />
      {error && <ErrorLine text={error} />}
      {done && <p className="text-[13px] font-medium text-[#3F6212]">{c.addCardDone}</p>}
      <button type="submit" className="bz-btn-primary" disabled={busy || !value.trim()}>
        {busy && <Loader2 size={14} className="mr-1.5 inline animate-spin" />}
        {c.addCardSubmit}
      </button>
    </form>
  );
}

function ProfileSection({ locale, account, onSaved }: { locale: AccountLocale; account: CustomerDto; onSaved: (a: CustomerDto) => void }) {
  const c = ACCOUNT_COPY[locale];
  const [form, setForm] = useState({
    firstName: account.firstName,
    lastName: account.lastName,
    email: account.email,
    phone: account.phone ?? '',
    birthDay: account.birthDay ? String(account.birthDay) : '',
    birthMonth: account.birthMonth ? String(account.birthMonth) : '',
    marketing: account.marketingConsent,
    locale: account.locale,
    currentPassword: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const emailChanging = form.email.trim().toLowerCase() !== account.email;

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setSaved(false);
    setForm((s) => ({ ...s, [key]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const m = Number.parseInt(form.birthMonth, 10);
    const d = Number.parseInt(form.birthDay, 10);
    const hasBday = Number.isFinite(m) && Number.isFinite(d);
    try {
      const { data } = await customerApi<{ account: CustomerDto }>('/api/customer/me', {
        method: 'PATCH',
        body: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          birthMonth: hasBday ? m : null,
          birthDay: hasBday ? d : null,
          marketingConsent: form.marketing,
          locale: form.locale === 'en' ? 'en' : 'tr',
          ...(emailChanging && account.hasPassword ? { currentPassword: form.currentPassword } : {}),
        },
      });
      onSaved(data.account);
      setForm((s) => ({ ...s, currentPassword: '' }));
      setSaved(true);
      if ((data.account.locale === 'en' ? 'en' : 'tr') !== locale) window.location.reload();
    } catch (err) {
      setError(accountError(c, errorCode(err)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="profil-baslik" className="rounded-[24px] border border-[#EDEDED] bg-white p-5 sm:p-6">
      <h2 id="profil-baslik" className="text-[18px] font-semibold">
        {c.profile}
      </h2>
      <p className="mt-1 text-[13px] text-[#737373]">{c.profileLead}</p>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Labeled label={c.firstName} id="pf-first">
            <input id="pf-first" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} className="bz-input w-full" autoComplete="given-name" maxLength={40} required />
          </Labeled>
          <Labeled label={c.lastName} id="pf-last">
            <input id="pf-last" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} className="bz-input w-full" autoComplete="family-name" maxLength={40} required />
          </Labeled>
        </div>
        <Labeled label={c.email} id="pf-email">
          <input id="pf-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="bz-input w-full" autoComplete="email" inputMode="email" autoCapitalize="off" spellCheck={false} required />
        </Labeled>
        {emailChanging && account.hasPassword && (
          <Labeled label={c.currentPassword} id="pf-current" hint={c.emailChangeNeedsPassword}>
            <input id="pf-current" type="password" value={form.currentPassword} onChange={(e) => set('currentPassword', e.target.value)} className="bz-input w-full" autoComplete="current-password" required />
          </Labeled>
        )}
        <Labeled label={c.phone} id="pf-phone" hint={c.phoneHint}>
          <input id="pf-phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} className="bz-input w-full" inputMode="tel" autoComplete="tel" placeholder="05xx xxx xx xx" />
        </Labeled>
        <Labeled label={c.birthday} id="pf-bday">
          <div className="flex gap-2">
            <input id="pf-bday" value={form.birthDay} onChange={(e) => set('birthDay', e.target.value.replace(/\D/g, '').slice(0, 2))} className="bz-input w-20" inputMode="numeric" placeholder={c.day} aria-label={c.day} />
            <select value={form.birthMonth} onChange={(e) => set('birthMonth', e.target.value)} className="bz-input min-w-0 flex-1" aria-label={c.month}>
              <option value="">{c.month}</option>
              {c.months.map((m, i) => (
                <option key={m} value={String(i + 1)}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </Labeled>
        <Labeled label={locale === 'tr' ? 'Dil' : 'Language'} id="pf-locale">
          <select id="pf-locale" value={form.locale} onChange={(e) => set('locale', e.target.value)} className="bz-input w-full">
            <option value="tr">Türkçe</option>
            <option value="en">English</option>
          </select>
        </Labeled>
        <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-[#404040]">
          <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[#0A0A0A]" checked={form.marketing} onChange={(e) => set('marketing', e.target.checked)} />
          <span>{c.marketing}</span>
        </label>
        {error && <ErrorLine text={error} />}
        <div className="flex items-center gap-3">
          <button type="submit" className="bz-btn-primary" disabled={busy}>
            {busy && <Loader2 size={14} className="mr-1.5 inline animate-spin" />}
            {c.save}
          </button>
          {saved && <span className="text-[13px] font-medium text-[#3F6212]">{c.saved}</span>}
        </div>
      </form>
    </section>
  );
}

function SecuritySection({ locale, account, onChanged }: { locale: AccountLocale; account: CustomerDto; onChanged: (a: CustomerDto) => void }) {
  const c = ACCOUNT_COPY[locale];
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState<null | 'pw' | 'out' | 'all'>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('pw');
    setError(null);
    try {
      await customerApi('/api/customer/me/password', {
        body: { ...(account.hasPassword ? { currentPassword: current } : {}), newPassword: next },
      });
      setDone(true);
      setCurrent('');
      setNext('');
      onChanged({ ...account, hasPassword: true });
    } catch (err) {
      setError(accountError(c, errorCode(err)));
    } finally {
      setBusy(null);
    }
  };

  const logout = async (all: boolean) => {
    setBusy(all ? 'all' : 'out');
    await customerApi('/api/customer/auth/logout', { body: { all } }).catch(() => undefined);
    window.location.assign('/hesap');
  };

  return (
    <section aria-labelledby="guvenlik-baslik" className="rounded-[24px] border border-[#EDEDED] bg-white p-5 sm:p-6">
      <h2 id="guvenlik-baslik" className="text-[18px] font-semibold">
        {c.security}
      </h2>
      <p className="mt-1 text-[13px] text-[#737373]">
        {c.signInMethods}:{' '}
        {[account.hasGoogle ? c.methodGoogle : null, account.hasPassword ? c.methodPassword : null].filter(Boolean).join(' · ')}
      </p>
      <form onSubmit={changePassword} className="mt-4 space-y-3">
        <p className="text-[14px] font-medium">{account.hasPassword ? c.changePassword : c.setPassword}</p>
        {!account.hasPassword && <p className="text-[13px] text-[#737373]">{c.setPasswordLead}</p>}
        {account.hasPassword && (
          <Labeled label={c.currentPassword} id="sec-current">
            <input id="sec-current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="bz-input w-full" autoComplete="current-password" required />
          </Labeled>
        )}
        <Labeled label={c.newPassword} id="sec-new" hint={c.passwordHint}>
          <input id="sec-new" type="password" value={next} onChange={(e) => setNext(e.target.value)} className="bz-input w-full" autoComplete="new-password" minLength={8} required />
        </Labeled>
        {error && <ErrorLine text={error} />}
        {done && <p className="text-[13px] font-medium text-[#3F6212]">{c.passwordChanged}</p>}
        <button type="submit" className="bz-btn-ghost" disabled={busy !== null}>
          {busy === 'pw' && <Loader2 size={14} className="mr-1.5 inline animate-spin" />}
          {account.hasPassword ? c.changePassword : c.setPassword}
        </button>
      </form>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-[#EDEDED] pt-4">
        <button type="button" className="bz-btn-primary" onClick={() => void logout(false)} disabled={busy !== null}>
          {busy === 'out' && <Loader2 size={14} className="mr-1.5 inline animate-spin" />}
          {c.logout}
        </button>
        <button type="button" className="bz-btn-ghost" onClick={() => void logout(true)} disabled={busy !== null}>
          {busy === 'all' && <Loader2 size={14} className="mr-1.5 inline animate-spin" />}
          {c.logoutAll}
        </button>
      </div>
    </section>
  );
}

function DangerSection({ locale, hasPassword }: { locale: AccountLocale; hasPassword: boolean }) {
  const c = ACCOUNT_COPY[locale];
  const [open, setOpen] = useState(false);
  const [deleteCards, setDeleteCards] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const word = locale === 'tr' ? 'SİL' : 'DELETE';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await customerApi('/api/customer/me', {
        method: 'DELETE',
        body: { deleteCards, confirm: locale === 'tr' ? 'SIL' : 'DELETE', ...(hasPassword ? { currentPassword: password } : {}) },
      });
      window.location.assign('/hesap?deleted=1');
    } catch (err) {
      setError(accountError(c, errorCode(err)));
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="sil-baslik" className="rounded-[24px] border border-[#FECACA] bg-white p-5 sm:p-6">
      <h2 id="sil-baslik" className="text-[18px] font-semibold text-[#B91C1C]">
        {c.danger}
      </h2>
      <p className="mt-1 text-[13px] text-[#737373]">{c.dangerLead}</p>
      {!open ? (
        <button type="button" className="mt-4 rounded-full border border-[#FECACA] px-4 py-2 text-[13.5px] font-medium text-[#B91C1C] hover:bg-[#FEF2F2]" onClick={() => setOpen(true)}>
          {c.deleteButton}
        </button>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-[#404040]">
            <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[#B91C1C]" checked={deleteCards} onChange={(e) => setDeleteCards(e.target.checked)} />
            <span>{c.deleteCardsToo}</span>
          </label>
          {hasPassword && (
            <Labeled label={c.currentPassword} id="del-pw">
              <input id="del-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bz-input w-full" autoComplete="current-password" required />
            </Labeled>
          )}
          <Labeled label={c.deleteConfirmLabel} id="del-confirm">
            <input id="del-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="bz-input w-full" autoCapitalize="characters" autoComplete="off" />
          </Labeled>
          {error && <ErrorLine text={error} />}
          <button
            type="submit"
            disabled={busy || confirm.trim().toLocaleUpperCase(locale === 'tr' ? 'tr-TR' : 'en-GB') !== word}
            className="rounded-full bg-[#B91C1C] px-4 py-2 text-[13.5px] font-semibold text-white disabled:opacity-40"
          >
            {busy && <Loader2 size={14} className="mr-1.5 inline animate-spin" />}
            {c.deleteButton}
          </button>
        </form>
      )}
    </section>
  );
}

function VerifyBanner({ locale, failed }: { locale: AccountLocale; failed: boolean }) {
  const c = ACCOUNT_COPY[locale];
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle');
  const resend = async () => {
    setState('busy');
    try {
      await customerApi('/api/customer/auth/resend-verify', { body: {} });
      setState('sent');
    } catch {
      setState('error');
    }
  };
  return (
    <div className="flex flex-col gap-2 rounded-[20px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-[13.5px] text-[#92400E] sm:flex-row sm:items-center sm:justify-between">
      <span>{failed ? c.verifiedFail : c.verifyBanner}</span>
      {state === 'sent' ? (
        <span className="font-medium">{c.verifySent}</span>
      ) : (
        <button type="button" onClick={() => void resend()} disabled={state === 'busy'} className="shrink-0 font-semibold underline underline-offset-2">
          {c.verifyResend}
        </button>
      )}
    </div>
  );
}

function Banner({ kind, text }: { kind: 'ok'; text: string }) {
  return (
    <p role="status" className={kind === 'ok' ? 'rounded-[20px] border border-[#D9F99D] bg-[#F7FEE7] px-4 py-3 text-[13.5px] font-medium text-[#3F6212]' : ''}>
      {text}
    </p>
  );
}
