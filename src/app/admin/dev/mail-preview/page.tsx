'use client';

import { useState } from 'react';
import { Eye, Loader2, Mail, Send } from 'lucide-react';

const TEMPLATES = [
  { key: 'forgot-password', label: 'Şifre sıfırlama', desc: 'Token + 6-haneli kod + meta bilgi' },
  { key: 'welcome', label: 'Hoş geldin', desc: '4 adımlı onboarding + kaynaklar' },
  { key: 'form-confirmation', label: 'Form onayı', desc: 'Contact / career / roi / newsletter' },
  { key: 'low-rating-alert', label: 'Düşük puan uyarısı', desc: 'Restoran sahibine acil bildirim' },
  { key: 'new-review', label: '5★ yeni yorum', desc: 'Pozitif lime gradient kart' },
  { key: 'weekly-report', label: 'Haftalık rapor', desc: 'Bar chart + quote gallery' },
  { key: 'newsletter', label: 'Aylık bülten', desc: 'Featured article + post listesi' },
  { key: 'customer-reply', label: 'Müşteriye yanıt', desc: 'Düşük puanlı müşteriye kişisel cevap' },
  { key: 'trial-ending', label: 'Deneme bitiyor', desc: 'Plan kartları + ÖNERİLEN badge' },
] as const;

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
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Gönderim başarısız');
      setInfo(`${template} kendi adresine gönderildi (${body.to})`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 md:p-8">
      <div className="rounded-2xl border border-[#EDEDED] bg-white p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="pulse-eyebrow text-[#737373]">PANEL / DEV / MAIL PREVIEW</p>
            <h1
              className="mt-1 flex items-center gap-3 text-[26px] sm:text-[32px] font-medium text-[#0A0A0A] tracking-[-0.025em]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              <Mail size={22} strokeWidth={2} />
              Mail Önizleme
            </h1>
            <p className="mt-1.5 text-[13px] sm:text-[14px] text-[#525252] max-w-[600px]">
              9 Pulse mail template'i seed verilerle render edilir. Browser'da yeni tab'da görüntüle ya da kendi e-posta adresine test gönder.
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-1 pulse-eyebrow">
            {(['tr', 'en'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setLocale(opt)}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  locale === opt ? 'bg-[#0A0A0A] text-white shadow-sm' : 'text-[#1A1A1A] hover:text-[#0A0A0A]'
                }`}
              >
                {opt === 'tr' ? 'Türkçe' : 'English'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">{error}</div>
      )}
      {info && (
        <div className="rounded-2xl border border-[#C6F24E] bg-[#EAF9B8] p-4 text-xs font-semibold text-[#0A0A0A]">{info}</div>
      )}

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
