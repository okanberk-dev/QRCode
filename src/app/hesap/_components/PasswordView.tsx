'use client';

// Forgot password / set a new password from the link (CLAUDE.md §61).
import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { ACCOUNT_COPY, accountError, customerApi, errorCode, type AccountLocale } from '../account-copy';
import { ErrorLine, Labeled } from './AuthView';

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
    <section className="rounded-[28px] border border-[#EDEDED] bg-white p-5 shadow-[0_20px_60px_-30px_rgba(10,10,10,0.25)] sm:p-7">
      <h1 className="text-[24px] font-semibold tracking-[-0.02em]">{token ? c.resetTitle : c.forgotTitle}</h1>
      {!token && <p className="mt-1.5 text-[14px] text-[#525252]">{c.forgotLead}</p>}
      {done ? (
        <p role="status" className="mt-5 rounded-xl border border-[#D9F99D] bg-[#F7FEE7] px-3 py-2.5 text-[13.5px] text-[#3F6212]">
          {token ? c.resetDone : c.forgotSent}
        </p>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4">
          {token ? (
            <Labeled label={c.newPassword} id="pw-new" hint={c.passwordHint}>
              <input id="pw-new" type="password" value={value} onChange={(e) => setValue(e.target.value)} className="bz-input w-full" autoComplete="new-password" minLength={8} required />
            </Labeled>
          ) : (
            <Labeled label={c.email} id="pw-email">
              <input id="pw-email" type="email" value={value} onChange={(e) => setValue(e.target.value)} className="bz-input w-full" autoComplete="email" inputMode="email" autoCapitalize="off" spellCheck={false} required />
            </Labeled>
          )}
          {error && <ErrorLine text={error} />}
          <button type="submit" className="bz-btn-primary h-12 w-full justify-center" disabled={busy}>
            {busy && <Loader2 size={15} className="mr-1.5 inline animate-spin" />}
            {token ? c.resetSave : c.forgotSend}
          </button>
        </form>
      )}
      <p className="mt-5 text-[13.5px]">
        <Link href="/hesap" className="font-medium underline underline-offset-2">
          {c.back}
        </Link>
      </p>
    </section>
  );
}
