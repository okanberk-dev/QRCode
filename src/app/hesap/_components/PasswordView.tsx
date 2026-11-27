'use client';

// Forgot password / set a new password from the link (CLAUDE.md §61).
import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { ACCOUNT_COPY, accountError, customerApi, errorCode, type AccountLocale } from '../account-copy';
import { ErrorLine, Labeled } from './AuthView';
import { BTN_PRIMARY, CARD, INPUT, LINK, MUTED, NOTICE_OK } from './ui';

export default function PasswordView({ locale, token }: { locale: AccountLocale; token: string | null }) {
  const c = ACCOUNT_COPY[locale];
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (token) {
        await customerApi('/api/customer/auth/reset', { body: { token, password: value } });
        setDone(true);
        window.setTimeout(() => window.location.assign('/hesap'), 1200);
      } else {
        await customerApi('/api/customer/auth/forgot', { body: { email: value } });
        setDone(true);
      }
    } catch (err) {
      setError(accountError(c, errorCode(err)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={CARD}>
      <h1 className="text-[24px] font-semibold tracking-[-0.02em]">{token ? c.resetTitle : c.forgotTitle}</h1>
      {!token && <p className={`mt-1.5 text-[14.5px] leading-relaxed ${MUTED}`}>{c.forgotLead}</p>}
      {done ? (
        <p role="status" className={`mt-5 ${NOTICE_OK}`}>
          {token ? c.resetDone : c.forgotSent}
        </p>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4">
          {token ? (
            <Labeled label={c.newPassword} id="pw-new" hint={c.passwordHint}>
              <input id="pw-new" type="password" value={value} onChange={(e) => setValue(e.target.value)} className={`${INPUT} w-full`} autoComplete="new-password" minLength={8} required />
            </Labeled>
          ) : (
            <Labeled label={c.email} id="pw-email">
              <input id="pw-email" type="email" value={value} onChange={(e) => setValue(e.target.value)} className={`${INPUT} w-full`} autoComplete="email" inputMode="email" autoCapitalize="off" spellCheck={false} required />
            </Labeled>
          )}
          {error && <ErrorLine text={error} />}
          <button type="submit" className={`${BTN_PRIMARY} w-full`} disabled={busy}>
            {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {token ? c.resetSave : c.forgotSend}
          </button>
        </form>
      )}
      <p className="mt-6 text-[14px]">
        <Link href="/hesap" className={LINK}>
          {c.back}
        </Link>
      </p>
    </section>
  );
}
