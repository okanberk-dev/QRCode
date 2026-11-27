'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, Mail, RefreshCw } from 'lucide-react';
import { AlertBanner } from '@/components/ui';
import type { Locale } from '@/lib/translations';

function CheckEmailInner({ locale }: { locale: Locale }) {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const isTr = locale === 'tr';

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onResend = async () => {
    if (!email || resending) return;
    setResending(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/resend-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
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
      // Show success then re-enable button after 60s.
      setTimeout(() => setResent(false), 60_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : isTr ? 'Hata' : 'Error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5D3EBC] text-white">
          <Mail size={18} />
        </div>
        <div className="min-w-0">
          <p className="pulse-eyebrow text-[#737373]">{isTr ? 'GÖNDERİLDİ' : 'SENT TO'}</p>
          <p
            className="mt-0.5 text-[13px] font-medium text-[#0A0A0A] truncate"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {email || (isTr ? 'mail kutunu kontrol et' : 'check your inbox')}
          </p>
        </div>
      </div>

      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      )}

      {resent ? (
        <div className="flex items-start gap-3 rounded-2xl border border-[#DCD3F6] bg-[#EFEAFB]/40 p-4">
          <CheckCircle2 size={18} className="shrink-0 text-[#0A0A0A] mt-0.5" />
          <p className="text-[13px] text-[#0A0A0A]">
            {isTr ? 'Yeni mail kutuna gönderildi.' : 'A new email has been sent.'}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={onResend}
          disabled={resending || !email}
          className="inline-flex w-full items-center justify-center gap-2 min-h-[44px] rounded-full border border-[#EDEDED] bg-white px-5 text-[13px] font-medium text-[#0A0A0A] hover:bg-[#FAFAFA] disabled:opacity-50 transition-colors"
        >
          {resending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {isTr ? 'Maili tekrar gönder' : 'Resend email'}
        </button>
      )}
    </div>
  );
}

export default function CheckEmailClient({ locale }: { locale: Locale }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2.5 text-[13px] text-[#525252]">
          <Loader2 size={16} className="animate-spin" />
          {locale === 'tr' ? 'Yükleniyor…' : 'Loading…'}
        </div>
      }
    >
      <CheckEmailInner locale={locale} />
    </Suspense>
  );
}
