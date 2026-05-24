'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertBanner } from '@/components/ui';

/**
 * CLAUDE.md §38 audit Fix #1 — OAuth callback `?google=*` flash banner.
 *
 * `/api/integrations/google/callback` 11 farklı status üretir
 * (connected, cancelled, state-*, error:*, token-*, missing-config,
 * unauthorized). Callback redirect target'a `?google=<status>` query
 * string ekler ama UI tarafında hiç işlenmiyordu — owner success/failure
 * feedback'ini görmüyordu.
 *
 * Bu component callback'in döndüğü 3 sayfaya mount edilir:
 *   - dashboard/account (default callback target)
 *   - dashboard/google-reviews (connect button returnTo)
 *   - dashboard/settings (Platform Bağlantıları returnTo)
 *
 * Mount sonrası `router.replace` ile query'den `google` paramını temizler —
 * sayfa refresh'inde tekrar flash basmaz, browser back kafa karıştırmaz.
 *
 * CLAUDE.md §7 — 11 status map inline tutuldu (sadece bir component'te
 * kullanılıyor, ortak modüle çıkarma 3+ yer şartını karşılamıyor).
 */

type StatusKind = 'success' | 'info' | 'warn' | 'danger';

interface StatusMessage {
  kind: StatusKind;
  tr: string;
  en: string;
}

const STATUS_MAP: Record<string, StatusMessage> = {
  connected: {
    kind: 'success',
    tr: 'Google hesabı başarıyla bağlandı.',
    en: 'Google account successfully connected.',
  },
  cancelled: {
    kind: 'info',
    tr: 'Google bağlama iptal edildi.',
    en: 'Google connection cancelled.',
  },
  'state-mismatch': {
    kind: 'danger',
    tr: 'OAuth oturumu hatası (çerez eşleşmedi). Sekmeyi yenileyip tekrar deneyin.',
    en: 'OAuth session error (cookie mismatch). Refresh the tab and try again.',
  },
  'state-invalid': {
    kind: 'danger',
    tr: 'OAuth durumu geçersiz. Sekmeyi yenileyip tekrar deneyin.',
    en: 'OAuth state invalid. Refresh the tab and try again.',
  },
  'state-missing': {
    kind: 'danger',
    tr: 'OAuth state parametresi eksik. Tekrar deneyin.',
    en: 'OAuth state parameter missing. Try again.',
  },
  'state-expired': {
    kind: 'warn',
    tr: 'Bağlama oturumu süresi doldu (12 dk). Tekrar deneyin.',
    en: 'Connection session expired (12 min). Try again.',
  },
  'state-actor-mismatch': {
    kind: 'danger',
    tr: 'Farklı hesap oturumu tespit edildi. Çıkış yapıp tekrar girip deneyin.',
    en: 'Different account session detected. Sign out and try again.',
  },
  'token-error': {
    kind: 'danger',
    tr: 'Google token alınamadı. GOOGLE_REDIRECT_URI Cloud Console ile eşleşmiyor olabilir; admin ile iletişime geçin.',
    en: 'Failed to get Google token. GOOGLE_REDIRECT_URI may not match Cloud Console; contact admin.',
  },
  'token-missing': {
    kind: 'danger',
    tr: 'Google token gelmedi. Tekrar deneyin.',
    en: 'Google token missing. Try again.',
  },
  'missing-config': {
    kind: 'danger',
    tr: 'Sunucu OAuth config eksik (GOOGLE_CLIENT_ID/SECRET). Admin ile iletişime geçin.',
    en: 'Server OAuth config missing (GOOGLE_CLIENT_ID/SECRET). Contact admin.',
  },
  unauthorized: {
    kind: 'warn',
    tr: 'Oturum açın ve tekrar deneyin.',
    en: 'Sign in and try again.',
  },
};

function resolveStatus(raw: string | null): StatusMessage | null {
  if (!raw) return null;
  // error:access_denied gibi prefix'leri ayır
  if (raw.startsWith('error:')) {
    const reason = raw.slice('error:'.length);
    if (reason === 'access_denied') {
      return {
        kind: 'warn',
        tr: 'Google\'da izin reddettiniz. Tekrar deneyebilirsiniz.',
        en: 'You denied permission on Google. You can try again.',
      };
    }
    return {
      kind: 'danger',
      tr: `Google bağlama hatası: ${reason}`,
      en: `Google connection error: ${reason}`,
    };
  }
  return STATUS_MAP[raw] ?? null;
}

interface GoogleConnectFlashBannerProps {
  locale: 'tr' | 'en';
}

export function GoogleConnectFlashBanner({ locale }: GoogleConnectFlashBannerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(false);

  const status = useMemo(() => resolveStatus(searchParams.get('google')), [searchParams]);

  useEffect(() => {
    // Mount sonrası query'den 'google' paramını temizle — refresh'te
    // tekrar flash basmaz, browser back kafa karıştırmaz.
    if (!status) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete('google');
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    // status değişirse (yeni callback) tekrar dismiss'i sıfırla
    setDismissed(false);
    // pathname + status değişimine bağlı; searchParams dep'i loop yaratır
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pathname]);

  if (!status || dismissed) return null;

  const message = locale === 'en' ? status.en : status.tr;

  return (
    <div className="mb-4">
      <AlertBanner kind={status.kind} onDismiss={() => setDismissed(true)}>
        {message}
      </AlertBanner>
    </div>
  );
}

export default GoogleConnectFlashBanner;
