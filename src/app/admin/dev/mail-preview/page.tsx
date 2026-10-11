'use client';

import { useState } from 'react';
import { Eye, Loader2, Send } from 'lucide-react';
import { AlertBanner, PageHeader } from '@/components/ui';

const TEMPLATES = [
  { key: 'forgot-password', label: 'Şifre sıfırlama', desc: 'Sıfırlama bağlantısı + 6 haneli kod + talep bilgileri' },
  { key: 'welcome', label: 'Hoş geldin', desc: '4 adımlı başlangıç rehberi + kaynaklar' },
  { key: 'form-confirmation', label: 'Form onayı', desc: 'İletişim / kariyer / ROI / bülten formları' },
  { key: 'low-rating-alert', label: 'Düşük puan uyarısı', desc: 'Restoran sahibine acil bildirim' },
  { key: 'new-review', label: '5★ yeni yorum', desc: 'Olumlu yorum bildirimi' },
  { key: 'weekly-report', label: 'Haftalık rapor', desc: 'Haftalık grafik + öne çıkan yorumlar' },
  { key: 'newsletter', label: 'Aylık bülten', desc: 'Öne çıkan yazı + yazı listesi' },
  { key: 'customer-reply', label: 'Müşteriye yanıt', desc: 'Düşük puanlı müşteriye kişisel cevap' },
  { key: 'trial-ending', label: 'Deneme bitiyor', desc: 'Plan kartları + ÖNERİLEN rozeti' },
  { key: 'contact-admin', label: 'İletişim formu (admin)', desc: 'Yeni iletişim talebi bildirimi' },
  { key: 'verify-email', label: 'E-posta onayı', desc: 'Davet sonrası zorunlu e-posta doğrulaması' },
  { key: 'roi-customer-report', label: 'ROI raporu (müşteri)', desc: '12 aylık projeksiyon + yapay zekâ analizi + iletişim bağlantısı' },
  { key: 'roi-admin-notification', label: 'ROI talebi (yönetici)', desc: 'Satış ekibine yeni ROI talebi bildirimi' },
] as const;

// /api/admin/dev/send-test answers with machine codes; the page used to print
// them verbatim ("send_failed", "rate_limited"…).
function sendErrorMessage(status: number, code: unknown): string {
  switch (code) {
    case 'rate_limited':
      return 'Çok fazla test e-postası gönderildi. Birkaç dakika sonra tekrar dene.';
    case 'no_recipient':
      return 'Hesabında kayıtlı bir e-posta adresi yok. Profilim sayfasından ekleyebilirsin.';
    case 'send_failed':
      return 'E-posta gönderilemedi. E-posta servisi bu ortamda yapılandırılmamış olabilir.';
    case 'invalid_template':
      return 'Bu şablon için test gönderimi desteklenmiyor.';
    default:
      if (status === 401 || status === 403) return 'Bu işlem için yetkin yok.';
      if (status === 404) return 'Test gönderimi bu ortamda kapalı.';
      return 'Gönderim başarısız oldu.';
  }
}

export default function MailPreviewIndex() {
  const [locale, setLocale] = useState<'tr' | 'en'>('tr');
  const [sending, setSending] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = (key: string) => `/api/dev/email-preview?template=${key}&locale=${locale}`;

  const sendTest = async (template: string) => {
    setSending(template);
    setInfo(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/dev/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template, locale }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(sendErrorMessage(res.status, body.error));
      const label = TEMPLATES.find((t) => t.key === template)?.label ?? template;
      setInfo(`“${label}” test e-postası ${body.to ?? 'kayıtlı adresine'} gönderildi.`);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Bağlantı hatası.');
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow="MAIL ÖNİZLEME"
        title="Mail önizleme"
        description="13 e-posta şablonu örnek verilerle oluşturulur. Yeni sekmede görüntüle ya da kendi e-posta adresine test gönder."
        actions={
          <div className="inline-flex rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-1 pulse-eyebrow">
            {(['tr', 'en'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                aria-pressed={locale === opt}
                onClick={() => setLocale(opt)}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  locale === opt ? 'bg-[#0A0A0A] text-white shadow-sm' : 'text-[#1A1A1A] hover:text-[#0A0A0A]'
                }`}
              >
                {opt === 'tr' ? 'Türkçe' : 'English'}
              </button>
            ))}
          </div>
        }
      />

      {error && <AlertBanner kind="danger">{error}</AlertBanner>}
      {info && <AlertBanner kind="lime">{info}</AlertBanner>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => (
          <div key={t.key} className="rounded-2xl border border-[#EDEDED] bg-white p-5 hover:border-[#C6F24E] transition-colors">
            <p className="text-sm font-semibold text-[#0A0A0A]">{t.label}</p>
            <p className="mt-1 text-[12px] text-[#737373] min-h-[32px]">{t.desc}</p>
            <p className="pulse-eyebrow mt-2 text-[#9CA3AF]">{t.key}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={previewUrl(t.key)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#EDEDED] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95"
              >
                <Eye size={12} /> Önizle
              </a>
              <button
                type="button"
                onClick={() => sendTest(t.key)}
                disabled={sending === t.key}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#C6F24E] px-3 py-1.5 text-[11px] font-semibold text-[#0A0A0A] hover:bg-[#A8D62E] active:scale-95 disabled:opacity-50"
              >
                {sending === t.key ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Test mail
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
