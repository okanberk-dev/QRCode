'use client';

import { useState } from 'react';
import { Check, Copy, Loader2, MailCheck } from 'lucide-react';
import { AlertBanner, Field, Modal } from '@/components/ui';

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
  invalid_email: 'Geçerli bir e-posta adresi yaz (ör. ad@isletme.com).',
  invalid_name: 'Ad soyad en çok 200 karakter olabilir.',
  email_taken: 'Bu e-posta adresiyle bir hesap zaten var. Listede arayıp o hesabı aç.',
  forbidden: 'İşletme sahibi ekleme yetkin yok.',
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
        setError(ERROR_LABELS[data.error] || data.error || 'Hesap oluşturulamadı. Biraz sonra yeniden dene.');
      } else {
        setInvite({
          email: data.user.email,
          url: data.invite?.url || '',
          mailSent: !!data.invite?.mailSent,
        });
        onCreated(
          data.invite?.mailSent
            ? `Davet e-postası gönderildi: ${data.user.email}`
            : `İşletme sahibi oluşturuldu: ${data.user.email}`,
        );
      }
    } catch {
      setError('Bağlantı kurulamadı. İnternetini kontrol edip yeniden dene.');
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
      closeConfirm={{
        title: 'Davet gönderilmeden kapatılsın mı?',
        body: 'Yazdığın bilgiler silinir, hesap oluşturulmaz.',
        confirm: 'Pencereyi kapat',
        cancel: 'Vazgeç',
      }}
      title={
        invite
          ? invite.mailSent
            ? 'Davet gönderildi'
            : 'Hesap oluşturuldu'
          : 'İşletme sahibi davet et'
      }
      description={
        invite
          ? undefined
          : 'Hesabı sen açarsın; kişi e-postasına gelen bağlantıyla kendi şifresini belirler. Bağlantı 30 dakika geçerlidir.'
      }
    >
      {invite ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-[20px] bg-pn-accent-soft p-4">
            <MailCheck size={18} className="mt-0.5 shrink-0 text-pn-ink" strokeWidth={2} aria-hidden="true" />
            <p className="min-w-0 break-words text-[13px] leading-[1.5] text-[#525252]">
              {invite.mailSent ? (
                <>
                  <strong className="font-medium text-pn-ink">{invite.email}</strong> adresine şifre
                  belirleme bağlantısı gitti. Kişi bağlantıya tıklayıp şifresini belirleyince panele girebilir.
                </>
              ) : (
                <>
                  Hesap açıldı ama <strong className="font-medium text-pn-ink">{invite.email}</strong>{' '}
                  adresine e-posta gönderilemedi. Aşağıdaki bağlantıyı kopyalayıp kişiye kendin ilet.
                </>
              )}
            </p>
          </div>

          <div>
            <label
              htmlFor="member-invite-url"
              className="mb-2 block text-[14px] font-medium leading-[1.3] text-pn-ink"
            >
              Davet bağlantısı
            </label>
            <div className="flex items-center gap-2">
              <input
                id="member-invite-url"
                type="text"
                value={invite.url}
                readOnly
                onFocus={(e) => e.target.select()}
                aria-describedby="member-invite-url-hint"
                className="bz-input min-w-0 flex-1 text-[12px]"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
              <button type="button" onClick={copyInvite} className="bz-btn-ghost shrink-0">
                {copied ? (
                  <Check size={14} className="text-pn-accent-ink" strokeWidth={2} />
                ) : (
                  <Copy size={14} strokeWidth={2} />
                )}
                {copied ? 'Kopyalandı' : 'Kopyala'}
              </button>
            </div>
            <p id="member-invite-url-hint" className="mt-2 text-[13px] leading-[1.45] text-[#737373]">
              Bağlantı 30 dakika geçerli. Süresi dolarsa hesabın detay sayfasından yenisini gönderebilirsin.
            </p>
          </div>

          <button type="button" onClick={onClose} className="bz-btn-primary w-full">
            Kapat
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <AlertBanner kind="danger" onDismiss={() => setError(null)}>
              {error}
            </AlertBanner>
          )}

          <Field label="E-posta" required>
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
          </Field>

          <Field label="Ad soyad" hint="Boş bırakabilirsin; kişi sonra kendi ekler.">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ahmet Yılmaz"
              maxLength={200}
              className="bz-input w-full"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
            <Field label="Plan">
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
            </Field>
            <Field label="Panel dili">
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as 'tr' | 'en')}
                className="bz-input w-full"
              >
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
              </select>
            </Field>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="bz-btn-ghost flex-1">
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
                <MailCheck size={16} strokeWidth={2} />
              )}
              {saving ? 'Gönderiliyor…' : 'Daveti gönder'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
