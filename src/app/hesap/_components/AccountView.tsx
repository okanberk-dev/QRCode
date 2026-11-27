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
import {
  BTN_DANGER,
  BTN_DANGER_SOFT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_SMALL_PRIMARY,
  BTN_SMALL_SECONDARY,
  BTN_SOFT,
  CARD,
  CHECKBOX,
  INPUT,
  MUTED,
  NOTICE_OK,
  NOTICE_WARN,
  SUCCESS_TEXT,
  SelectBox,
} from './ui';

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
      <section className="relative overflow-hidden rounded-[24px] bg-[#000000] px-5 py-6 text-white sm:px-8 sm:py-9">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#111110] opacity-80 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-10 h-56 w-56 rounded-full bg-[#CDEFD6] opacity-20 blur-3xl" />
        <p className="relative text-[14px] font-medium text-white/75">{c.brand}</p>
        <h1 className="relative mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-[36px]">{c.hello(account.firstName)}</h1>
        <p className="relative mt-1 text-[14.5px] text-white/75">{c.memberSince(since)}</p>
        <div className="relative mt-5 flex flex-wrap gap-2 text-[13.5px]">
          <span className="inline-flex items-center rounded-full bg-white/15 px-3.5 py-1.5 font-medium tabular-nums">
            {cards.length} {locale === 'tr' ? 'kart' : cards.length === 1 ? 'card' : 'cards'}
          </span>
          {account.emailVerified && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 font-semibold text-[#000000]">
              <ShieldCheck size={15} aria-hidden="true" /> {locale === 'tr' ? 'E-posta onaylı' : 'E-mail confirmed'}
            </span>
          )}
        </div>
      </section>

      {verified === '1' && <Banner kind="ok" text={c.verifiedOk} />}
      {!account.emailVerified && <VerifyBanner locale={locale} failed={verified === '0'} />}

      <section id="kartlar" aria-labelledby="kartlar-baslik" className="scroll-mt-20">
        <div className="mb-3 flex items-end justify-between gap-3 px-1">
          <h2 id="kartlar-baslik" className="text-[22px] font-semibold tracking-[-0.01em]">
            {c.myCards}
          </h2>
        </div>
        {cards.length === 0 ? (
          <div className="rounded-[24px] bg-[#F6F6F6] px-6 py-8 text-center sm:bg-white">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F1FDF3] text-[#111110]">
              <Gift size={26} aria-hidden />
            </span>
            <p className="mt-3 text-[16px] font-semibold">{c.cardsEmpty}</p>
            <p className={`mx-auto mt-1 max-w-[380px] text-[14px] leading-relaxed ${MUTED}`}>{c.cardsEmptyLead}</p>
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

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-6">
        <ProfileSection locale={locale} account={account} onSaved={(a) => { setAccount(a); void reloadCards(); }} />
        <SecuritySection locale={locale} account={account} onChanged={setAccount} />
      </div>
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
    <article className="group rounded-[24px] bg-[#F6F6F6] p-3 transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:bg-white">
      <a href={card.cardPath} className="block rounded-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111110] focus-visible:ring-offset-2" aria-label={`${card.businessName} — ${c.openCard}`}>
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
        <div className="min-w-0 text-[13.5px] text-[#525252]">
          {!card.available ? (
            <span className="text-[#92400E]">{c.unavailable}</span>
          ) : ready ? (
            <span className="font-semibold text-[#111110]">{c.rewardReady}</span>
          ) : next ? (
            <span>{c.rewardLeft(next.remaining, unitLabel(kind, next.remaining, locale))}</span>
          ) : (
            <span>
              {card.visits} {c.visits}
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          <a href={card.portalPath} className={`${BTN_SMALL_SECONDARY} gap-1.5`}>
            <Store size={15} aria-hidden /> {c.visitPortal}
          </a>
          <a href={card.cardPath} className={`${BTN_SMALL_PRIMARY} gap-1 pr-3`}>
            {c.openCard} <ChevronRight size={15} aria-hidden />
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
  const [last4, setLast4] = useState('');
  const [needDigits, setNeedDigits] = useState(false);
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
      await customerApi('/api/customer/cards/link', { body: needDigits && last4.length === 4 ? { token: m[1], last4 } : { token: m[1] } });
      setDone(true);
      setValue('');
      setLast4('');
      setNeedDigits(false);
      onAdded();
    } catch (err) {
      const code = errorCode(err);
      if (code === 'CARD_VERIFY_REQUIRED' || code === 'WRONG_DIGITS') setNeedDigits(true);
      setError(accountError(c, code));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${BTN_SOFT} mt-4 gap-1.5`}>
        <Plus size={16} aria-hidden /> {c.addCard}
      </button>
    );
  }
  return (
    <form onSubmit={submit} className={`mt-4 space-y-3 ${CARD}`}>
      <p className="text-[16px] font-semibold">{c.addCard}</p>
      <p className={`text-[14px] leading-relaxed ${MUTED}`}>{c.addCardLead}</p>
      <input value={value} onChange={(e) => setValue(e.target.value)} className={`${INPUT} w-full`} placeholder={c.addCardPlaceholder} inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-label={c.addCard} />
      {needDigits && (
        <input
          value={last4}
          onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
          className={`${INPUT} w-36 text-center tabular-nums tracking-[0.3em]`}
          inputMode="numeric"
          autoComplete="off"
          placeholder="••••"
          aria-label={locale === 'tr' ? 'Telefonun son 4 hanesi' : 'Last 4 digits of the phone'}
        />
      )}
      {error && <ErrorLine text={error} />}
      {done && <p role="status" className={NOTICE_OK}>{c.addCardDone}</p>}
      <button type="submit" className={BTN_PRIMARY} disabled={busy || !value.trim() || (needDigits && last4.length !== 4)}>
        {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
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
    <section aria-labelledby="profil-baslik" className={CARD}>
      <h2 id="profil-baslik" className="text-[20px] font-semibold tracking-[-0.01em]">
        {c.profile}
      </h2>
      <p className={`mt-1 text-[14px] leading-relaxed ${MUTED}`}>{c.profileLead}</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Labeled label={c.firstName} id="pf-first">
            <input id="pf-first" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} className={`${INPUT} w-full`} autoComplete="given-name" maxLength={40} required />
          </Labeled>
          <Labeled label={c.lastName} id="pf-last">
            <input id="pf-last" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} className={`${INPUT} w-full`} autoComplete="family-name" maxLength={40} required />
          </Labeled>
        </div>
        <Labeled label={c.email} id="pf-email">
          <input id="pf-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={`${INPUT} w-full`} autoComplete="email" inputMode="email" autoCapitalize="off" spellCheck={false} required />
        </Labeled>
        {emailChanging && account.hasPassword && (
          <Labeled label={c.currentPassword} id="pf-current" hint={c.emailChangeNeedsPassword}>
            <input id="pf-current" type="password" value={form.currentPassword} onChange={(e) => set('currentPassword', e.target.value)} className={`${INPUT} w-full`} autoComplete="current-password" required />
          </Labeled>
        )}
        <Labeled label={c.phone} id="pf-phone" hint={c.phoneHint}>
          <input id="pf-phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={`${INPUT} w-full`} inputMode="tel" autoComplete="tel" placeholder="05xx xxx xx xx" />
        </Labeled>
        <Labeled label={c.birthday} id="pf-bday">
          <div className="flex gap-2">
            <input id="pf-bday" value={form.birthDay} onChange={(e) => set('birthDay', e.target.value.replace(/\D/g, '').slice(0, 2))} className={`${INPUT} w-20 text-center`} inputMode="numeric" placeholder={c.day} aria-label={c.day} />
            <SelectBox value={form.birthMonth} onChange={(e) => set('birthMonth', e.target.value)} className="min-w-0 flex-1" aria-label={c.month}>
              <option value="">{c.month}</option>
              {c.months.map((m, i) => (
                <option key={m} value={String(i + 1)}>
                  {m}
                </option>
              ))}
            </SelectBox>
          </div>
        </Labeled>
        <Labeled label={locale === 'tr' ? 'Dil' : 'Language'} id="pf-locale">
          <SelectBox id="pf-locale" value={form.locale} onChange={(e) => set('locale', e.target.value)}>
            <option value="tr">Türkçe</option>
            <option value="en">English</option>
          </SelectBox>
        </Labeled>
        <label className="flex cursor-pointer items-start gap-3 px-1 text-[13.5px] leading-snug text-[#404040]">
          <input type="checkbox" className={CHECKBOX} checked={form.marketing} onChange={(e) => set('marketing', e.target.checked)} />
          <span>{c.marketing}</span>
        </label>
        {error && <ErrorLine text={error} />}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="submit" className={BTN_PRIMARY} disabled={busy}>
            {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {c.save}
          </button>
          {saved && <span role="status" className={`text-[14px] font-medium ${SUCCESS_TEXT}`}>{c.saved}</span>}
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
    <section aria-labelledby="guvenlik-baslik" className={CARD}>
      <h2 id="guvenlik-baslik" className="text-[20px] font-semibold tracking-[-0.01em]">
        {c.security}
      </h2>
      <p className={`mt-1 text-[14px] leading-relaxed ${MUTED}`}>
        {c.signInMethods}:{' '}
        {[account.hasGoogle ? c.methodGoogle : null, account.hasPassword ? c.methodPassword : null].filter(Boolean).join(' · ')}
      </p>
      <form onSubmit={changePassword} className="mt-5 space-y-4">
        <p className="px-1 text-[15px] font-semibold">{account.hasPassword ? c.changePassword : c.setPassword}</p>
        {!account.hasPassword && <p className={`px-1 text-[14px] leading-relaxed ${MUTED}`}>{c.setPasswordLead}</p>}
        {account.hasPassword && (
          <Labeled label={c.currentPassword} id="sec-current">
            <input id="sec-current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className={`${INPUT} w-full`} autoComplete="current-password" required />
          </Labeled>
        )}
        <Labeled label={c.newPassword} id="sec-new" hint={c.passwordHint}>
          <input id="sec-new" type="password" value={next} onChange={(e) => setNext(e.target.value)} className={`${INPUT} w-full`} autoComplete="new-password" minLength={8} required />
        </Labeled>
        {error && <ErrorLine text={error} />}
        {done && <p role="status" className={NOTICE_OK}>{c.passwordChanged}</p>}
        <button type="submit" className={BTN_SECONDARY} disabled={busy !== null}>
          {busy === 'pw' && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {account.hasPassword ? c.changePassword : c.setPassword}
        </button>
      </form>
      <div className="mt-6 flex flex-wrap gap-2 border-t border-[#E3E3E3] pt-5 sm:border-[#EBEBEB]">
        <button type="button" className={BTN_PRIMARY} onClick={() => void logout(false)} disabled={busy !== null}>
          {busy === 'out' && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {c.logout}
        </button>
        <button type="button" className={BTN_SECONDARY} onClick={() => void logout(true)} disabled={busy !== null}>
          {busy === 'all' && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
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
    <section aria-labelledby="sil-baslik" className={CARD}>
      <h2 id="sil-baslik" className="text-[20px] font-semibold tracking-[-0.01em] text-[#B42318]">
        {c.danger}
      </h2>
      <p className={`mt-1 text-[14px] leading-relaxed ${MUTED}`}>{c.dangerLead}</p>
      {!open ? (
        <button type="button" className={`${BTN_DANGER_SOFT} mt-4`} onClick={() => setOpen(true)}>
          {c.deleteButton}
        </button>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="flex cursor-pointer items-start gap-3 px-1 text-[13.5px] leading-snug text-[#404040]">
            <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#D92D20]" checked={deleteCards} onChange={(e) => setDeleteCards(e.target.checked)} />
            <span>{c.deleteCardsToo}</span>
          </label>
          {hasPassword && (
            <Labeled label={c.currentPassword} id="del-pw">
              <input id="del-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${INPUT} w-full`} autoComplete="current-password" required />
            </Labeled>
          )}
          <Labeled label={c.deleteConfirmLabel} id="del-confirm">
            <input id="del-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={`${INPUT} w-full`} autoCapitalize="characters" autoComplete="off" />
          </Labeled>
          {error && <ErrorLine text={error} />}
          <button
            type="submit"
            disabled={busy || confirm.trim().toLocaleUpperCase(locale === 'tr' ? 'tr-TR' : 'en-GB') !== word}
            className={BTN_DANGER}
          >
            {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
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
    <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${NOTICE_WARN}`}>
      <span>{failed ? c.verifiedFail : c.verifyBanner}</span>
      {state === 'sent' ? (
        <span className="font-medium">{c.verifySent}</span>
      ) : (
        <button type="button" onClick={() => void resend()} disabled={state === 'busy'} className="inline-flex min-h-[40px] shrink-0 items-center self-start font-semibold underline underline-offset-2 sm:self-auto">
          {c.verifyResend}
        </button>
      )}
    </div>
  );
}

function Banner({ kind, text }: { kind: 'ok'; text: string }) {
  return (
    <p role="status" className={kind === 'ok' ? NOTICE_OK : ''}>
      {text}
    </p>
  );
}
