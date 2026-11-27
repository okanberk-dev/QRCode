'use client';

import { useState } from 'react';
import { Check, Copy, Loader2, MailCheck } from 'lucide-react';
import { AlertBanner, Modal } from '@/components/ui';

interface MemberCreateModalProps {
  onClose: () => void;
  onCreated: (successMessage: string) => void;
}

interface InviteResult {
  email: string;
  url: string;
  mailSent: boolean;
}

const ERROR_LABELS: Record<string, string> = {
  invalid_email: 'Geçerli bir email adresi girin.',
  invalid_name: 'İsim 200 karakteri aşamaz.',
  email_taken: 'Bu email adresi zaten kayıtlı.',
  forbidden: 'Yetkisiz erişim.',
};

export default function MemberCreateModal({ onClose, onCreated }: MemberCreateModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [plan, setPlan] = useState<'trial' | 'monthly' | 'yearly' | 'free'>('trial');
  const [locale, setLocale] = useState<'tr' | 'en'>('tr');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim(), plan, locale }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(ERROR_LABELS[data.error] || data.error || 'Oluşturma başarısız.');
      } else {
        setInvite({
          email: data.user.email,
          url: data.invite?.url || '',
          mailSent: !!data.invite?.mailSent,
        });
        onCreated(
          data.invite?.mailSent
            ? `Davet maili gönderildi: ${data.user.email}`
            : `İşletme sahibi oluşturuldu: ${data.user.email}`,
        );
      }
    } catch {
      setError('Bağlantı hatası.');
    } finally {
      setSaving(false);
    }
  };

  const copyInvite = async () => {
    if (!invite?.url) return;
    try {
      await navigator.clipboard.writeText(invite.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available — fall back to selectable input below
    }
  };

  return (
    <Modal
      size={480}
      onClose={onClose}
      // Guard accidental close while filling the invite form; once the invite
      // is created (result shown) closing is safe (CLAUDE.md §23.3).
      closeGuard={() => invite === null && (email.trim() !== '' || name.trim() !== '')}
      title={
        <div>
          <p className="text-[13px] font-medium text-[#737373]">YENİ KAYIT</p>
          <h2 className="mt-1 text-[20px] font-medium tracking-[-0.015em] text-pn-ink">
            Yeni işletme sahibi
          </h2>
          <p className="mt-1 text-[12px] text-[#525252]">
            Email + isim doldur; sistem davet maili gönderir.
          </p>
        </div>
      }
    >
      {invite ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-[24px] border border-pn-accent-soft bg-pn-accent-soft/40 p-4">
            <MailCheck size={18} className="text-pn-ink mt-0.5 shrink-0" strokeWidth={2} />
            <div className="text-[13px] text-pn-ink">
              <p className="font-medium">
                {invite.mailSent ? 'Davet maili gönderildi' : 'Hesap oluşturuldu'}
              </p>
              <p className="mt-1 text-[#525252]">
                {invite.mailSent
                  ? `${invite.email} adresine 30 dk geçerli bir şifre belirleme linki gitti.`
                  : `${invite.email} adresine mail gönderilemedi (env eksik olabilir). Aşağıdaki linki manuel ilet.`}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-[#737373]">Davet linki</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={invite.url}
                readOnly
                onFocus={(e) => e.target.select()}
                className="bz-input flex-1 text-[12px]"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
              <button
                type="button"
                onClick={copyInvite}
                className="bz-btn-ghost shrink-0"
                title="Kopyala"
              >
                {copied ? (
                  <Check size={14} className="text-pn-accent-ink" strokeWidth={2} />
                ) : (
                  <Copy size={14} strokeWidth={2} />
                )}
                {copied ? 'Kopyalandı' : 'Kopyala'}
              </button>
            </div>
            <p className="text-[12px] text-[#A3A3A3] leading-[1.55]">
              Link 30 dakika geçerli. Süre dolarsa detay sayfasından yenisini gönderebilirsin.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="bz-btn-primary w-full"
          >
            Tamam
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <AlertBanner kind="danger" onDismiss={() => setError(null)}>
              {error}
            </AlertBanner>
          )}

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-[#737373]">Email *</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@isletme.com"
              maxLength={256}
              className="bz-input w-full"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-[#737373]">İsim</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ahmet Yılmaz"
              maxLength={200}
              className="bz-input w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[#737373]">Plan</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as typeof plan)}
                className="bz-input w-full"
              >
                <option value="trial">Deneme (14 gün)</option>
                <option value="monthly">Aylık</option>
                <option value="yearly">Yıllık</option>
                <option value="free">Ücretsiz</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[#737373]">Panel dili</label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as 'tr' | 'en')}
                className="bz-input w-full"
              >
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div className="flex items-start gap-1.5 text-[12px] text-[#737373] leading-[1.55]">
            <MailCheck size={12} className="mt-0.5 shrink-0" strokeWidth={2} />
            <span>
              Sistem random şifre üretir ve email&apos;e davet linki gönderir. Kullanıcı linkle kendi şifresini belirler. Link 30 dakika geçerli.
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="bz-btn-ghost flex-1"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !email.trim()}
              className="bz-btn-primary flex-1 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Check size={16} strokeWidth={2} />
              )}
              Oluştur ve davet gönder
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
