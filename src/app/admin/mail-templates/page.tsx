'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileEdit, Loader2, ArrowRight, BellRing } from 'lucide-react';

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
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 md:p-8">
      <div className="rounded-2xl border border-[#EDEDED] bg-white p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="pulse-eyebrow text-[#737373]">PANEL / MAIL İÇERİKLERİ</p>
            <h1
              className="mt-1 flex items-center gap-3 text-[26px] sm:text-[32px] font-medium text-[#0A0A0A] tracking-[-0.025em]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <FileEdit size={22} strokeWidth={2} />
              Mail İçerikleri
            </h1>
            <p className="mt-1.5 text-[13px] sm:text-[14px] text-[#525252] max-w-[640px]">
              9 mail template'inin içerik alanlarını burada düzenleyebilirsin.
              Boş bıraktığın alanlar otomatik kod-içi varsayılana düşer.
              Değişiklikler 1 dakika içinde tüm gönderimlere yansır.
            </p>
          </div>
          <button
            type="button"
            onClick={onTestOpsAlert}
            disabled={opsTesting}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#EDEDED] bg-white px-4 py-2.5 text-xs font-semibold text-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95 disabled:opacity-50"
            title="Ops alert pipeline'ı test et — RESEND_API_KEY'e dokunmaz, sadece notifyOpsOfMailFailure'ı tetikler"
          >
            {opsTesting ? <Loader2 size={14} className="animate-spin" /> : <BellRing size={14} />}
            Ops alert testi
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">{error}</div>
      )}
      {opsResult && (
        <div className="rounded-2xl border border-[#C6F24E] bg-[#EAF9B8] p-4 text-xs font-semibold text-[#0A0A0A]">{opsResult}</div>
      )}

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
              className="group rounded-2xl border border-[#EDEDED] bg-white p-5 hover:border-[#C6F24E] hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#0A0A0A]">{TEMPLATE_LABELS[cell.key] ?? cell.key}</p>
                <span className="pulse-eyebrow rounded-full bg-[#FAFAFA] px-2 py-0.5 text-[#525252]">{cell.locale.toUpperCase()}</span>
              </div>
              <p className="mt-1 text-[12px] text-[#737373]">{LOCALE_LABELS[cell.locale] ?? cell.locale}</p>
              <div className="mt-4 flex items-center justify-between">
                {cell.seeded ? (
                  <span className="text-[11px] text-[#525252]">
                    Son güncelleme: {cell.updatedAt ? new Date(cell.updatedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                ) : (
                  <span className="pulse-eyebrow text-[#9CA3AF]">Henüz oluşturulmadı (kod varsayılanı)</span>
                )}
                <ArrowRight size={14} className="text-[#9CA3AF] group-hover:text-[#0A0A0A] transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
