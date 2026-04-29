'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { AlertBanner } from '@/components/ui';
import type { Locale } from '@/lib/translations';

type Status = 'loading' | 'success' | 'expired' | 'invalid' | 'already' | 'server_error';

function VerifyEmailInner({ locale }: { locale: Locale }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const isTr = locale === 'tr';

  const [status, setStatus] = useState<Status>('loading');
  const [recipient, setRecipient] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const verify = async () => {
      if (!token) {
        if (!cancelled) setStatus('invalid');
        return;
      }
      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (res.ok && data.ok) {
          if (data.alreadyVerified) {
            setStatus('already');
            return;
          }
          setStatus('success');
          // Brief celebratory pause then auto-redirect to dashboard.
          setTimeout(() => {
            router.push(data.redirectTo || `/${locale}/dashboard`);
            router.refresh();
          }, 1200);
          return;
        }

        if (data.error === 'expired') {
          setRecipient(data.email ?? null);
          setStatus('expired');
          return;
        }
        if (data.error === 'invalid_token') {
          setStatus('invalid');
          return;
        }
        setStatus('server_error');
      } catch {
        if (!cancelled) setStatus('server_error');
      }
    };
    void verify();
    return () => {
      cancelled = true;
    };
  }, [token, locale, router]);

  const onResend = async () => {
    if (!recipient) return;
    setResending(true);
    setResendError(null);
    try {
      const res = await fetch('/api/auth/resend-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recipient, locale }),
      });
      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        const seconds = data.retryAfter ?? 60;
        throw new Error(
          isTr
            ? `Çok hızlı denedin — ${seconds} saniye bekle.`
            : `Too fast — wait ${seconds}s.`,
        );
      }
      if (!res.ok) {
        throw new Error(isTr ? 'Mail gönderilemedi.' : 'Could not send email.');
      }
      setResent(true);
    } catch (err) {
      setResendError(err instanceof Error ? err.message : isTr ? 'Hata' : 'Error');
    } finally {
      setResending(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2.5 text-[13px] text-[#525252]">
        <Loader2 size={16} className="animate-spin" />
        {isTr ? 'Bağlantı doğrulanıyor…' : 'Validating link…'}
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-[#EAF9B8] bg-[#EAF9B8]/40 p-4">
          <CheckCircle2 size={20} className="shrink-0 text-[#0A0A0A] mt-0.5" />
          <div>
            <p className="text-[14px] font-medium text-[#0A0A0A]">
              {isTr ? 'E-postan onaylandı.' : 'Email verified.'}
            </p>
            <p className="mt-1 text-[13px] text-[#525252]">
              {isTr ? 'Panele yönlendiriliyorsun…' : 'Redirecting to your panel…'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'already') {
    return (
      <div className="space-y-4">
        <AlertBanner kind="info">
          {isTr
            ? 'Bu hesap zaten onaylanmış. Giriş yapabilirsin.'
            : 'This account is already verified. You can sign in.'}
        </AlertBanner>
        <Link
          href={`/${locale}/auth/login`}
          className="inline-flex w-full items-center justify-center min-h-[44px] rounded-full bg-[#0A0A0A] px-5 text-[14px] font-medium text-white hover:bg-[#1A1A1A] transition-colors"
        >
          {isTr ? 'Giriş yap' : 'Sign in'}
        </Link>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="space-y-4">
        <AlertBanner kind="warn">
          {isTr
            ? 'Bağlantının süresi doldu. Yenisini gönderelim.'
            : 'The link has expired. Let\'s send a new one.'}
        </AlertBanner>
        {resent ? (
          <AlertBanner kind="success">
            {isTr ? 'Yeni mail kutuna gönderildi.' : 'A new email has been sent.'}
          </AlertBanner>
        ) : (
          <>
            {resendError && <AlertBanner kind="danger">{resendError}</AlertBanner>}
            <button
              type="button"
              onClick={onResend}
              disabled={resending || !recipient}
              className="inline-flex w-full items-center justify-center gap-2 min-h-[44px] rounded-full bg-[#C6F24E] px-5 text-[14px] font-medium text-[#0A0A0A] hover:bg-[#A8D62E] disabled:opacity-50 transition-colors"
            >
              {resending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {isTr ? 'Yeni mail gönder' : 'Send a new email'}
            </button>
          </>
        )}
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4">
          <XCircle size={20} className="shrink-0 text-[#991B1B] mt-0.5" />
          <div>
            <p className="text-[14px] font-medium text-[#991B1B]">
              {isTr ? 'Bağlantı geçersiz.' : 'Invalid link.'}
            </p>
            <p className="mt-1 text-[13px] text-[#7F1D1D]">
              {isTr
                ? 'Linki kopyalarken bir parça eksik kalmış olabilir. Mailden tam olarak tekrar tıkla.'
                : 'A part of the link may be missing. Click again from the email.'}
            </p>
          </div>
        </div>
        <Link
          href={`/${locale}/auth/login`}
          className="inline-flex w-full items-center justify-center min-h-[44px] rounded-full border border-[#EDEDED] bg-white px-5 text-[14px] font-medium text-[#0A0A0A] hover:bg-[#FAFAFA] transition-colors"
        >
          {isTr ? 'Giriş sayfası' : 'Sign in page'}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AlertBanner kind="danger">
        {isTr
          ? 'Sunucuda bir sorun oluştu. Birkaç dakika sonra tekrar dene.'
          : 'Something went wrong on the server. Try again in a few minutes.'}
      </AlertBanner>
      <Link
        href={`/${locale}/auth/login`}
        className="inline-flex w-full items-center justify-center min-h-[44px] rounded-full border border-[#EDEDED] bg-white px-5 text-[14px] font-medium text-[#0A0A0A] hover:bg-[#FAFAFA] transition-colors"
      >
        {isTr ? 'Giriş sayfası' : 'Sign in page'}
      </Link>
    </div>
  );
}

export default function VerifyEmailClient({ locale }: { locale: Locale }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2.5 text-[13px] text-[#525252]">
          <Loader2 size={16} className="animate-spin" />
          {locale === 'tr' ? 'Yükleniyor…' : 'Loading…'}
        </div>
      }
    >
      <VerifyEmailInner locale={locale} />
    </Suspense>
  );
}
