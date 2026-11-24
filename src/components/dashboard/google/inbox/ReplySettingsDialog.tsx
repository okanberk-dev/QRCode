'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { APSwitch, AlertBanner, Modal, PulseSelect } from '@/components/ui';
import {
  DEFAULT_GOOGLE_REPLY_SETTINGS,
  MAX_BANNED_PHRASES,
  MAX_SIGNATURE_LENGTH,
  type GoogleReplySettings,
} from '@/lib/google-reply-settings';

/** Per-business Google reply settings (CLAUDE.md §54). */
export function ReplySettingsDialog({
  restaurantId,
  locale,
  canWrite,
  onClose,
  onSaved,
}: {
  restaurantId: string;
  locale: 'tr' | 'en';
  canWrite: boolean;
  onClose: () => void;
  onSaved: (settings: GoogleReplySettings) => void;
}) {
  const isTr = locale === 'tr';
  const [settings, setSettings] = useState<GoogleReplySettings | null>(null);
  const [banned, setBanned] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/restaurants/${restaurantId}/google/business/reply-settings`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const s: GoogleReplySettings = data?.settings ?? DEFAULT_GOOGLE_REPLY_SETTINGS;
        setSettings(s);
        setBanned(s.bannedPhrases.join('\n'));
      })
      .catch(() => {
        if (!cancelled) {
          setSettings(DEFAULT_GOOGLE_REPLY_SETTINGS);
          setError(isTr ? 'Ayarlar yüklenemedi; varsayılanlar gösteriliyor.' : 'Settings could not be loaded; showing defaults.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId, isTr]);

  const update = <K extends keyof GoogleReplySettings>(key: K, value: GoogleReplySettings[K]) => {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
    setDirty(true);
  };

  const save = async () => {
    if (!settings || saving) return;
    setSaving(true);
    setError(null);
    const payload: GoogleReplySettings = {
      ...settings,
      bannedPhrases: banned
        .split(/\n|,/)
        .map((p) => p.trim())
        .filter(Boolean)
        .slice(0, MAX_BANNED_PHRASES),
    };
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/google/business/reply-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.settings) {
        setError(isTr ? 'Ayarlar kaydedilemedi. Alanları kontrol edip tekrar dene.' : 'Settings could not be saved. Check the fields and try again.');
        return;
      }
      onSaved(data.settings);
      onClose();
    } catch {
      setError(isTr ? 'Bağlantı hatası. Tekrar dene.' : 'Connection error. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isTr ? 'Yanıt ayarları' : 'Reply settings'}
      onClose={onClose}
      size={560}
      closeGuard={() => dirty}
      closeConfirm={
        isTr
          ? undefined
          : { title: 'Discard changes?', body: 'Your changes will not be saved.', confirm: 'Discard', cancel: 'Keep editing' }
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="bz-btn min-h-11 sm:min-h-9">
            {isTr ? 'Vazgeç' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={!settings || saving || !canWrite}
            className="bz-btn-primary min-h-11 disabled:opacity-60 sm:min-h-9"
          >
            {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            {isTr ? 'Kaydet' : 'Save'}
          </button>
        </div>
      }
    >
      {!settings ? (
        <div className="flex items-center gap-2 py-6 text-[13px] text-[#737373]">
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          {isTr ? 'Yükleniyor…' : 'Loading…'}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[12.5px] leading-[1.6] text-[#525252]">
            {isTr
              ? 'AI taslakları bu ayarlarla yazılır ve her zaman yorumun dilinde olur (Rusça yoruma Rusça). Taslaklar sen göndermeden yayınlanmaz.'
              : "AI drafts follow these settings and always use the review's language (Russian review → Russian reply). Nothing is published until you send it."}
          </p>
          {error && <AlertBanner kind="warn">{error}</AlertBanner>}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-[#0A0A0A]">{isTr ? 'Ton' : 'Tone'}</span>
              <PulseSelect
                value={settings.tone}
                onChange={(v) => update('tone', v as GoogleReplySettings['tone'])}
                options={[
                  { value: 'warm', label: isTr ? 'Samimi' : 'Warm' },
                  { value: 'formal', label: isTr ? 'Resmi' : 'Formal' },
                ]}
                ariaLabel={isTr ? 'Ton' : 'Tone'}
                disabled={!canWrite}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-[#0A0A0A]">{isTr ? 'Uzunluk' : 'Length'}</span>
              <PulseSelect
                value={settings.length}
                onChange={(v) => update('length', v as GoogleReplySettings['length'])}
                options={[
                  { value: 'short', label: isTr ? 'Kısa' : 'Short' },
                  { value: 'medium', label: isTr ? 'Orta' : 'Medium' },
                  { value: 'long', label: isTr ? 'Uzun' : 'Long' },
                ]}
                ariaLabel={isTr ? 'Uzunluk' : 'Length'}
                disabled={!canWrite}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-[#0A0A0A]">{isTr ? 'Hitap (Türkçe)' : 'Address (Turkish)'}</span>
              <PulseSelect
                value={settings.addressForm}
                onChange={(v) => update('addressForm', v as GoogleReplySettings['addressForm'])}
                options={[
                  { value: 'siz', label: isTr ? 'Siz' : 'Siz (formal)' },
                  { value: 'sen', label: isTr ? 'Sen' : 'Sen (informal)' },
                ]}
                ariaLabel={isTr ? 'Hitap şekli' : 'Address form'}
                disabled={!canWrite}
              />
            </label>
          </div>

          <APSwitch
            checked={settings.useName}
            onChange={(v) => update('useName', v)}
            disabled={!canWrite}
            label={isTr ? 'Müşteriye adıyla hitap et' : 'Greet the customer by first name'}
            sublabel={isTr ? 'Google’da görünen ilk ad kullanılır, soyadı asla.' : 'Uses the first name shown on Google, never the surname.'}
          />

          <label className="block space-y-1">
            <span className="text-[12px] font-medium text-[#0A0A0A]">{isTr ? 'İmza' : 'Signature'}</span>
            <input
              className="bz-input text-[16px] sm:text-[13px]"
              value={settings.signature}
              maxLength={MAX_SIGNATURE_LENGTH}
              onChange={(e) => update('signature', e.target.value)}
              placeholder={isTr ? 'ör. L’Affogato ekibi' : 'e.g. The L’Affogato team'}
              disabled={!canWrite}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[12px] font-medium text-[#0A0A0A]">{isTr ? 'Yasaklı ifadeler' : 'Banned phrases'}</span>
            <textarea
              className="bz-input min-h-[88px] text-[16px] sm:text-[13px]"
              value={banned}
              onChange={(e) => {
                setBanned(e.target.value);
                setDirty(true);
              }}
              placeholder={isTr ? 'Her satıra bir ifade (ör. indirim, ücretsiz)' : 'One phrase per line (e.g. discount, free)'}
              disabled={!canWrite}
            />
            <span className="block text-[11.5px] text-[#737373]">
              {isTr
                ? `En çok ${MAX_BANNED_PHRASES} ifade. Bu ifadeleri içeren yanıt gönderilmez; AI da kullanmaz.`
                : `Up to ${MAX_BANNED_PHRASES} phrases. A reply containing them cannot be sent; the AI avoids them too.`}
            </span>
          </label>

          <p className="rounded-lg bg-[#FAFAFA] px-3 py-2 text-[12px] leading-[1.55] text-[#525252]">
            {isTr
              ? 'Kayıtlı şablonlarda {ad} ve {işletme} kullanabilirsin; şablon seçilince müşterinin adı ve işletme adı yerleşir, metni göndermeden önce düzenleyebilirsin.'
              : 'Saved templates can use {ad} (first name) and {işletme} (business name); they are filled in when you pick a template and you can edit before sending.'}
          </p>
        </div>
      )}
    </Modal>
  );
}
