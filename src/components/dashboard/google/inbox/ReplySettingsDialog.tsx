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
          setError(
            isTr
              ? 'Kayıtlı ayarların yüklenemedi; varsayılanlar gösteriliyor. Şimdi kaydedersen eski ayarlarının yerine bunlar geçer. Emin değilsen pencereyi kapatıp yeniden aç.'
              : 'Your saved settings could not be loaded; the defaults are shown. Saving now replaces your old settings with these. If unsure, close this window and open it again.',
          );
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
        setError(
          isTr
            ? 'Ayarlar kaydedilemedi. İmzayı ve yasaklı ifadeleri kontrol edip yeniden dene.'
            : 'The settings could not be saved. Check the signature and the banned phrases, then try again.',
        );
        return;
      }
      onSaved(data.settings);
      onClose();
    } catch {
      setError(
        isTr
          ? 'Bağlanılamadı. İnternet bağlantını kontrol edip yeniden dene.'
          : 'Could not connect. Check your internet connection and try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isTr ? 'Yanıt ayarları' : 'Reply settings'}
      description={
        isTr
          ? 'Bu işletmenin Google yanıt taslakları bu ayarlarla yazılır ve her zaman yorumun dilinde olur. Taslaklar sen göndermeden yayınlanmaz.'
          : "This business's Google reply drafts follow these settings and always use the review's language. Nothing is published until you send it."
      }
      onClose={onClose}
      size={560}
      closeGuard={() => dirty}
      closeConfirm={
        isTr
          ? { title: 'Kaydetmeden kapatılsın mı?', body: 'Yaptığın değişiklikler kaydedilmez.', confirm: 'Kaydetmeden kapat', cancel: 'Vazgeç' }
          : { title: 'Close without saving?', body: 'Your changes will not be saved.', confirm: 'Close without saving', cancel: 'Cancel' }
      }
      footer={
        canWrite ? (
          <>
            <button type="button" onClick={onClose} className="bz-btn min-h-11 sm:min-h-10">
              {isTr ? 'Vazgeç' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={!settings || saving}
              className="bz-btn-primary min-h-11 disabled:opacity-60 sm:min-h-10"
            >
              {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              {saving ? (isTr ? 'Kaydediliyor…' : 'Saving…') : isTr ? 'Ayarları kaydet' : 'Save settings'}
            </button>
          </>
        ) : (
          <button type="button" onClick={onClose} className="bz-btn min-h-11 sm:min-h-10">
            {isTr ? 'Kapat' : 'Close'}
          </button>
        )
      }
    >
      {!settings ? (
        <div className="flex items-center gap-2 py-6 text-[13px] text-[#737373]" role="status">
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          {isTr ? 'Ayarlar yükleniyor…' : 'Loading the settings…'}
        </div>
      ) : (
        <div className="space-y-4">
          {!canWrite && (
            <AlertBanner kind="info">
              {isTr
                ? 'Bu ayarları yalnız görüntüleyebilirsin. Değiştirmek için işletme sahibinden yetki iste.'
                : 'You can only view these settings. Ask the business owner for access to change them.'}
            </AlertBanner>
          )}
          {error && <AlertBanner kind="warn">{error}</AlertBanner>}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block space-y-1">
              <span className="text-[13px] font-medium text-[#737373]">{isTr ? 'Ton' : 'Tone'}</span>
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
              <span className="text-[13px] font-medium text-[#737373]">{isTr ? 'Uzunluk' : 'Length'}</span>
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
              <span className="text-[13px] font-medium text-[#737373]">{isTr ? 'Hitap (Türkçe yanıtlarda)' : 'Address form (Turkish replies)'}</span>
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
            <span className="text-[13px] font-medium text-[#737373]">{isTr ? 'İmza (isteğe bağlı)' : 'Signature (optional)'}</span>
            <input
              className="bz-input text-[16px] sm:text-[14px]"
              value={settings.signature}
              maxLength={MAX_SIGNATURE_LENGTH}
              onChange={(e) => update('signature', e.target.value)}
              placeholder={isTr ? 'ör. L’Affogato ekibi' : 'e.g. The L’Affogato team'}
              disabled={!canWrite}
            />
            <span className="block text-[12px] text-[#737373]">
              {isTr
                ? 'Her taslağın sonuna ayrı satırda eklenir. Boş bırakırsan imza eklenmez.'
                : 'Added on its own line at the end of every draft. Leave it empty for no signature.'}
            </span>
          </label>

          <label className="block space-y-1">
            <span className="text-[13px] font-medium text-[#737373]">{isTr ? 'Yasaklı ifadeler (isteğe bağlı)' : 'Banned phrases (optional)'}</span>
            <textarea
              className="bz-input min-h-[88px] text-[16px] sm:text-[14px]"
              value={banned}
              onChange={(e) => {
                setBanned(e.target.value);
                setDirty(true);
              }}
              placeholder={isTr ? 'Her satıra bir ifade (ör. indirim, ücretsiz)' : 'One phrase per line (e.g. discount, free)'}
              disabled={!canWrite}
            />
            <span className="block text-[12px] text-[#737373]">
              {isTr
                ? `En çok ${MAX_BANNED_PHRASES} ifade. Bu ifadeleri içeren yanıt gönderilemez; taslaklarda da kullanılmaz.`
                : `Up to ${MAX_BANNED_PHRASES} phrases. A reply containing one cannot be sent, and drafts avoid them too.`}
            </span>
          </label>

          <p className="rounded-[16px] bg-pn-accent-soft px-4 py-3 text-[13px] leading-[1.55] text-[#525252]">
            {isTr
              ? 'Kayıtlı şablonlarda {ad} ve {işletme} kullanabilirsin; şablon seçilince müşterinin adı ve işletme adı yerleşir, metni göndermeden önce düzenleyebilirsin.'
              : 'Saved templates can use {ad} (first name) and {işletme} (business name); they are filled in when you pick a template and you can edit before sending.'}
          </p>
        </div>
      )}
    </Modal>
  );
}
