'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Eye, History, Loader2, Mail, RotateCcw, Save } from 'lucide-react';
import Link from 'next/link';
import MailFieldInput, { type MailFieldDef } from './MailFieldInput';
import MailRevisionHistory from './MailRevisionHistory';
import { MAIL_PLACEHOLDERS } from '@/lib/email/placeholders';

type FormType = 'contact' | 'career' | 'roi' | 'newsletter';

const VARIANTS: Array<{ key: FormType; label: string }> = [
  { key: 'contact', label: 'İletişim' },
  { key: 'career', label: 'Kariyer' },
  { key: 'roi', label: 'ROI' },
  { key: 'newsletter', label: 'Bülten' },
];

// Same field schema across all 4 variants. Only string copy fields the
// admin should touch; structural arrays (`timeline`) and ticket prefix
// stay in code.
const VARIANT_FIELDS: MailFieldDef[] = [
  { key: 'subject', label: 'Mail subject', placeholders: MAIL_PLACEHOLDERS['form-confirmation'] },
  { key: 'preheader', label: 'Inbox preview', hint: 'Mail listesinde subject altında görünür', placeholders: MAIL_PLACEHOLDERS['form-confirmation'] },
  { key: 'eyebrow', label: 'Eyebrow', hint: 'Üst köşedeki etiket — örn. "İletişim · Onay"' },
  { key: 'titleA', label: 'Başlık 1. parça', hint: '"Aldık"', placeholders: MAIL_PLACEHOLDERS['form-confirmation'] },
  { key: 'titleB', label: 'Başlık 2. parça', hint: '"Sıradayız."' },
  { key: 'intro', label: 'Giriş paragrafı', multiline: true, placeholders: MAIL_PLACEHOLDERS['form-confirmation'] },
  { key: 'formEyebrow', label: 'Form özet kart etiketi' },
  { key: 'timelineEyebrow', label: 'Timeline bölüm etiketi' },
  { key: 'sideEyebrowA', label: 'Sol kart etiketi (A)' },
  { key: 'sideBodyA', label: 'Sol kart metni (A)', multiline: true },
  { key: 'sideCtaA', label: 'Sol kart link (A)' },
  { key: 'sideEyebrowB', label: 'Sağ kart etiketi (B)' },
  { key: 'sideBodyB', label: 'Sağ kart metni (B)', multiline: true },
  { key: 'sideCtaB', label: 'Sağ kart link (B)' },
];

interface Props {
  locale: string;
}

type NestedContent = Record<FormType, Record<string, string>>;

const emptyNested = (): NestedContent => ({
  contact: {},
  career: {},
  roi: {},
  newsletter: {},
});

export default function FormConfirmationEditor({ locale }: Props) {
  const [activeVariant, setActiveVariant] = useState<FormType>('contact');
  const [nested, setNested] = useState<NestedContent>(emptyNested);
  const [seeded, setSeeded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/admin/mail-templates/form-confirmation/${locale}`);
        if (res.status === 404) {
          if (alive) {
            setSeeded(false);
            setLoading(false);
          }
          return;
        }
        const body = await res.json();
        if (!alive) return;
        if (!res.ok) throw new Error(body.error || 'Yüklenemedi');

        // Content shape: { contact: {...}, career: {...}, roi: {...}, newsletter: {...} }
        const dbContent = (body.template?.content as Partial<NestedContent>) ?? {};
        const next = emptyNested();
        for (const variant of VARIANTS) {
          const vContent = dbContent[variant.key] ?? {};
          for (const f of VARIANT_FIELDS) {
            next[variant.key][f.key] = typeof vContent[f.key] === 'string' ? vContent[f.key] : '';
          }
        }
        setNested(next);
        setSeeded(true);
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [locale, reloadKey]);

  const updateField = (variant: FormType, key: string, value: string) => {
    setNested((prev) => ({
      ...prev,
      [variant]: { ...prev[variant], [key]: value },
    }));
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/admin/mail-templates/form-confirmation/${locale}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: nested }),
      });
      const body = await res.json();
      if (!res.ok) {
        if (body.error === 'invalid_placeholder' && body.field && Array.isArray(body.invalid)) {
          throw new Error(
            `"${body.field}" alanında geçersiz placeholder: ${body.invalid.map((p: string) => `\${${p}}`).join(', ')}. İzin verilenler: ${(body.allowed ?? []).map((p: string) => `\${${p}}`).join(', ') || '(yok)'}`,
          );
        }
        if (body.error === 'invalid_field_length' && body.field) {
          if (body.reason === 'too_long') {
            throw new Error(`"${body.field}" alanı çok uzun: ${body.actual} karakter (max ${body.max}).`);
          }
          if (body.reason === 'too_short') {
            throw new Error(`"${body.field}" alanı çok kısa: ${body.actual} karakter (min ${body.min}).`);
          }
        }
        throw new Error(body.error || 'Kayıt başarısız');
      }
      setSeeded(true);
      setInfo('Tüm 4 variant kaydedildi — değişiklik 1 dakika içinde tüm gönderimlere yansır.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onRevert = async () => {
    if (!confirm('Tüm 4 variant\'ı silip kod-içi varsayılana dönmek istediğine emin misin?')) return;
    setReverting(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/admin/mail-templates/form-confirmation/${locale}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Silme başarısız');
      }
      setNested(emptyNested());
      setSeeded(false);
      setInfo('Varsayılana döndürüldü. Sonraki mailler kod-içi default ile gider.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReverting(false);
    }
  };

  const onPreview = () => {
    window.open(`/api/dev/email-preview?template=form-confirmation&locale=${locale}&variant=${activeVariant}`, '_blank');
  };

  const onTestMail = async () => {
    setSendingTest(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch('/api/admin/dev/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: 'form-confirmation', locale, variant: activeVariant }),
      });
      // Defensive parse — see MailTemplateEditor for rationale.
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = body.detail || body.error || `Sunucu hatası (HTTP ${res.status})`;
        const hint = body.hint ? ` — ${body.hint}` : '';
        throw new Error(`Test mail gönderimi başarısız: ${msg}${hint}`);
      }
      setInfo(`Test mail gönderildi (${activeVariant}): ${body.to}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSendingTest(false);
    }
  };

  const isEnglish = locale === 'en';

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 md:p-8">
      <div className="flex items-center justify-between">
        <Link href="/admin/mail-templates" className="inline-flex items-center gap-2 text-xs font-semibold text-[#525252] hover:text-[#0A0A0A]">
          <ArrowLeft size={14} />
          Mail İçeriklerine dön
        </Link>
        <span className="pulse-eyebrow rounded-full bg-[#FAFAFA] px-3 py-1 text-[#525252]">{locale.toUpperCase()}</span>
      </div>

      <div className="rounded-2xl border border-[#EDEDED] bg-white p-5 sm:p-7">
        <p className="pulse-eyebrow text-[#737373]">MAIL İÇERİĞİ / FORM-CONFIRMATION</p>
        <h1 className="mt-1 flex items-center gap-3 text-[24px] sm:text-[28px] font-medium text-[#0A0A0A] tracking-[-0.025em]" style={{ fontFamily: 'var(--font-heading)' }}>
          <Mail size={20} strokeWidth={2} />
          Form onayı · {isEnglish ? 'English' : 'Türkçe'}
        </h1>
        <p className="mt-1.5 text-[13px] sm:text-[14px] text-[#525252]">
          4 form tipi (İletişim · Kariyer · ROI · Bülten) için ayrı içerik. Sekmeler arasında geçiş yap, her birinin alanlarını düzenle, sonra &quot;Kaydet&quot; tüm 4 variant&apos;ı tek seferde DB&apos;ye yazar.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">{error}</div>
      )}
      {info && (
        <div className="rounded-2xl border border-[#C6F24E] bg-[#EAF9B8] p-4 text-xs font-semibold text-[#0A0A0A]">{info}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 size={22} className="animate-spin text-[#0A0A0A]" />
        </div>
      ) : (
        <>
          {/* Variant tabs — horizontally scrollable on mobile when 4
              tabs would otherwise crowd into too-narrow buttons. Snap
              behaviour keeps them aligned even mid-scroll. */}
          <div className="rounded-2xl border border-[#EDEDED] bg-white p-2">
            <div className="flex gap-1 overflow-x-auto snap-x snap-mandatory sm:flex-wrap sm:overflow-x-visible">
              {VARIANTS.map((v) => {
                const active = v.key === activeVariant;
                return (
                  <button
                    key={v.key}
                    onClick={() => setActiveVariant(v.key)}
                    className={`min-h-[44px] shrink-0 snap-start rounded-xl px-4 py-2 text-[13px] font-semibold transition-colors sm:flex-1 sm:shrink ${
                      active
                        ? 'bg-[#0A0A0A] text-white'
                        : 'bg-transparent text-[#525252] hover:bg-[#FAFAFA]'
                    }`}
                  >
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active variant fields */}
          <div className="space-y-4 rounded-2xl border border-[#EDEDED] bg-white p-5 sm:p-7">
            {VARIANT_FIELDS.map((f) => (
              <MailFieldInput
                key={`${activeVariant}:${f.key}`}
                field={f}
                value={nested[activeVariant]?.[f.key] ?? ''}
                onChange={(next) => updateField(activeVariant, f.key, next)}
              />
            ))}
          </div>

          {/* Actions — same mobile pattern as flat editor:
              - Save full-width on mobile
              - Secondary buttons 2-col grid (44px touch targets)
              - Desktop: row layout */}
          <div className="flex flex-col gap-3 rounded-2xl border border-[#EDEDED] bg-white p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:p-5">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={onPreview}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#EDEDED] bg-white px-4 py-2.5 text-xs font-semibold text-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95"
              >
                <Eye size={14} /> Önizle ({VARIANTS.find((v) => v.key === activeVariant)?.label})
              </button>
              <button
                type="button"
                onClick={onTestMail}
                disabled={sendingTest}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#EDEDED] bg-white px-4 py-2.5 text-xs font-semibold text-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95 disabled:opacity-50"
              >
                {sendingTest ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                Test mail at
              </button>
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#EDEDED] bg-white px-4 py-2.5 text-xs font-semibold text-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95"
              >
                <History size={14} /> Geçmiş
              </button>
              {seeded && (
                <button
                  type="button"
                  onClick={onRevert}
                  disabled={reverting}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-50 active:scale-95 disabled:opacity-50"
                >
                  {reverting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  <span className="truncate">Tüm variant&apos;ları sıfırla</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#C6F24E] px-5 py-3 text-sm font-semibold text-[#0A0A0A] hover:bg-[#A8D62E] active:scale-95 disabled:opacity-50 sm:w-auto sm:text-xs"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Kaydet (4 variant)
            </button>
          </div>
        </>
      )}

      <MailRevisionHistory
        templateKey="form-confirmation"
        locale={locale}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onReverted={() => {
          setReloadKey((k) => k + 1);
          setInfo('Geri dönüş başarılı — içerik yenilendi.');
        }}
      />
    </div>
  );
}
