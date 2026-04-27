'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileEdit, Loader2, ArrowRight, BellRing } from 'lucide-react';
import { AlertBanner, Badge, PageHeader } from '@/components/ui';

interface GridCell {
  key: string;
  locale: string;
  seeded: boolean;
  id?: string;
  editable?: boolean;
  updatedAt?: string;
}

interface Response {
  data: GridCell[];
}

const TEMPLATE_LABELS: Record<string, string> = {
  welcome: 'Hoş geldin',
  newsletter: 'Aylık bülten',
  'trial-ending': 'Deneme bitiyor',
  'forgot-password': 'Şifre sıfırlama',
  'low-rating-alert': 'Düşük puan uyarısı',
  'new-review': 'Yeni 5★ yorum',
  'weekly-report': 'Haftalık rapor',
  'customer-reply': 'Müşteri yanıtı',
  'form-confirmation': 'Form onayı',
};

const LOCALE_LABELS: Record<string, string> = {
  tr: 'Türkçe',
  en: 'English',
};

export default function MailTemplatesIndexPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Response | null>(null);
  const [opsTesting, setOpsTesting] = useState(false);
  const [opsResult, setOpsResult] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/mail-templates');
        const body = await res.json();
        if (!alive) return;
        if (!res.ok) throw new Error(body.error || 'Yüklenemedi');
        setData(body);
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const onTestOpsAlert = async () => {
    setOpsTesting(true);
    setOpsResult(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/test-ops-alert', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) {
        if (body.error === 'rate_limited') {
          throw new Error(`Saatlik limit doldu (${body.retryAfter}s sonra dene).`);
        }
        throw new Error(body.error || 'Tetikleme başarısız');
      }
      setOpsResult('Ops alert tetiklendi. OPS_EMAIL / NOTIFICATION_EMAIL kutusunu kontrol et (60sn içinde gelmeli). Gelmezse server log\'da "[ops-alert]" satırlarına bak.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOpsTesting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow="MAIL İÇERİKLERİ"
        title="Mail içerikleri"
        description="9 mail template'inin içerik alanlarını burada düzenleyebilirsin. Boş bıraktığın alanlar otomatik kod-içi varsayılana düşer. Değişiklikler 1 dakika içinde tüm gönderimlere yansır."
        actions={
          <button
            type="button"
            onClick={onTestOpsAlert}
            disabled={opsTesting}
            className="bz-btn-ghost"
            title="Ops alert pipeline'ı test et — RESEND_API_KEY'e dokunmaz, sadece notifyOpsOfMailFailure'ı tetikler"
          >
            {opsTesting ? <Loader2 size={14} className="animate-spin" /> : <BellRing size={14} />}
            Ops alert testi
          </button>
        }
      />

      {error && <AlertBanner kind="danger">{error}</AlertBanner>}
      {opsResult && <AlertBanner kind="lime">{opsResult}</AlertBanner>}

      {loading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 size={22} className="animate-spin text-[#0A0A0A]" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.data ?? []).map((cell) => (
            <Link
              key={`${cell.key}-${cell.locale}`}
              href={`/admin/mail-templates/${cell.key}/${cell.locale}`}
              className="group bz-card p-5 hover:border-[#C6F24E] transition-colors block"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#0A0A0A] truncate">
                  {TEMPLATE_LABELS[cell.key] ?? cell.key}
                </p>
                <Badge kind="ghost">{cell.locale.toUpperCase()}</Badge>
              </div>
              <p className="mt-1 text-[12px] text-[#737373]">
                {LOCALE_LABELS[cell.locale] ?? cell.locale}
              </p>
              <div className="mt-4 flex items-center justify-between gap-2">
                {cell.seeded ? (
                  <span className="text-[11px] text-[#525252] truncate">
                    Son güncelleme:{' '}
                    {cell.updatedAt
                      ? new Date(cell.updatedAt).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </span>
                ) : (
                  <Badge kind="ghost">Kod varsayılanı</Badge>
                )}
                <ArrowRight
                  size={14}
                  className="shrink-0 text-[#A3A3A3] group-hover:text-[#0A0A0A] transition-colors"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
