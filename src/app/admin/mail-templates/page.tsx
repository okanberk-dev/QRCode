'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowRight, BellRing } from 'lucide-react';
import { AlertBanner, Badge, PageHeader } from '@/components/ui';
import { SkCardGrid } from '@/components/ui/skeletons/PageSkeleton';
import { MAIL_TEMPLATE_LABELS } from '@/components/admin/mailTemplateLabels';
import { formatStampInTimeZone } from '@/lib/timezone';

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
      setOpsResult('Test uyarısı gönderildi. Operasyon e-posta kutusunu kontrol et — 1 dakika içinde gelmeli.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOpsTesting(false);
    }
  };

  // One card per template × locale; count distinct templates from the data
  // instead of a hardcoded number that drifted (it said 16 with 28 live).
  const templateCount = new Set((data?.data ?? []).map((c) => c.key)).size;

  return (
    <div className="mx-auto max-w-[1280px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow="MAIL İÇERİKLERİ"
        title="Mail içerikleri"
        description={`${templateCount > 0 ? `${templateCount} mail şablonunun` : 'Mail şablonlarının'} içerik alanlarını burada düzenleyebilirsin. Boş bıraktığın alanlar varsayılan metne döner. Değişiklikler 1 dakika içinde tüm gönderimlere yansır.`}
        actions={
          <button
            type="button"
            onClick={onTestOpsAlert}
            disabled={opsTesting}
            className="bz-btn-ghost"
            title="Mail gönderimi başarısız olduğunda operasyon ekibine giden uyarıyı test et"
          >
            {opsTesting ? <Loader2 size={14} className="animate-spin" /> : <BellRing size={14} />}
            Uyarı mailini test et
          </button>
        }
      />

      {error && <AlertBanner kind="danger">{error}</AlertBanner>}
      {opsResult && <AlertBanner kind="lime">{opsResult}</AlertBanner>}

      {loading ? (
        // Same card grid skeleton as loading.tsx (§40.10) — no spinner.
        <SkCardGrid count={9} cols={3} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.data ?? []).map((cell) => (
            <Link
              key={`${cell.key}-${cell.locale}`}
              href={`/admin/mail-templates/${cell.key}/${cell.locale}`}
              className="group bz-card p-5 hover:border-pn-accent transition-colors block"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-pn-ink truncate">
                  {MAIL_TEMPLATE_LABELS[cell.key] ?? cell.key}
                </p>
                <Badge kind="ghost">{cell.locale.toUpperCase()}</Badge>
              </div>
              <p className="mt-1 text-[12px] text-[#737373]">
                {LOCALE_LABELS[cell.locale] ?? cell.locale}
              </p>
              <div className="mt-4 flex items-center justify-between gap-2">
                {cell.seeded ? (
                  <span className="text-[12px] text-[#525252] truncate">
                    Son güncelleme:{' '}
                    {cell.updatedAt ? formatStampInTimeZone(cell.updatedAt, 'tr') : '—'}
                  </span>
                ) : (
                  <Badge kind="ghost">Kod varsayılanı</Badge>
                )}
                <ArrowRight
                  size={14}
                  className="shrink-0 text-[#A3A3A3] group-hover:text-pn-ink transition-colors"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
