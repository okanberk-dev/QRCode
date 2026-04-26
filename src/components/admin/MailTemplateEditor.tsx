'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, Loader2, Mail, RotateCcw, Save } from 'lucide-react';
import Link from 'next/link';
import MailFieldInput, { type MailFieldDef } from './MailFieldInput';
import FormConfirmationEditor from './FormConfirmationEditor';
import { MAIL_PLACEHOLDERS } from '@/lib/email/placeholders';

// Schema-aware fields per template. Only string copy fields the admin
// should edit; structural arrays (steps, resources, quickActions, quotes)
// are hidden — they require typed editing UI which is Phase 3+ scope.
//
// Field flags:
//  - `multiline?: boolean` → render as <textarea>
//  - `locked?: boolean` → KVKK/security lock; UI shows disabled input
//    with 🔒 KVKK badge. Server-side enforcement is in `locked-fields.ts`,
//    so UI bypass via curl/devtools still gets dropped.
//  - `lockReason?: string` → user-facing tooltip explaining the lock
// Re-exported via the shared MailFieldInput component so other editors
// (e.g. FormConfirmationEditor) reuse the same field schema.
type FieldDef = MailFieldDef;
const FIELDS_BY_TEMPLATE: Record<string, FieldDef[]> = {
  welcome: [
    { key: 'eyebrow', label: 'Eyebrow', hint: 'Üst köşedeki küçük etiket — örn. "Hoş geldin · Sayı bir"' },
    { key: 'titleHi', label: 'Selamlama başlığı', hint: 'Hero başlığın 1. satırı — "Merhaba ${firstName}."', placeholders: MAIL_PLACEHOLDERS.welcome },
    { key: 'titleSub', label: 'Başlık alt satırı', hint: 'Hero başlığın 2. satırı — "Şimdi başlıyoruz."' },
    { key: 'intro', label: 'Giriş paragrafı', multiline: true, placeholders: MAIL_PLACEHOLDERS.welcome },
    { key: 'stepsEyebrow', label: 'Adımlar bölüm etiketi', hint: '"Kurulum · 4 adım"' },
    { key: 'nextLabel', label: 'Sıradaki rozet', hint: 'Aktif adımın yanındaki "Sıradaki" etiketi' },
    { key: 'cta', label: 'Birincil CTA buton metni' },
    { key: 'demoLink', label: 'İkincil link metni', hint: '"Demo videoyu izle (2 dk)"' },
    { key: 'resourcesEyebrow', label: 'Kaynaklar bölüm etiketi' },
  ],
  newsletter: [
    { key: 'titleA', label: 'Başlık 1. parça', hint: 'Hero başlığın ilk yarısı — "Sessiz misafiri"' },
    { key: 'titleAccent', label: 'Başlık vurgu kelimesi', hint: 'Lime arka planlı kelime — "duyabilmek"' },
    { key: 'titleEnd', label: 'Başlık 3. parça', hint: '"sanatı."' },
    { key: 'intro', label: 'Giriş paragrafı', multiline: true, placeholders: MAIL_PLACEHOLDERS.newsletter },
    { key: 'cta', label: 'Birincil CTA' },
    { key: 'featuredEyebrow', label: 'Kapak yazısı bölüm etiketi' },
    { key: 'listEyebrow', label: 'Yazılar listesi başlığı', hint: '"Bu sayıda"' },
    { key: 'statsTitle', label: 'İstatistik kart başlığı', hint: 'Stats geçirilmediğinde block gizlenir' },
    { key: 'futureLabel', label: 'Gelecek sayı etiketi', hint: '"Önümüzdeki sayıda"' },
    { key: 'futureBody', label: 'Gelecek sayı metni', multiline: true },
    { key: 'exploreCta', label: 'Tüm sayılar linki' },
  ],
  'trial-ending': [
    { key: 'eyebrow', label: 'Eyebrow', hint: '"Deneme · ${daysLeft} gün kaldı"', placeholders: MAIL_PLACEHOLDERS['trial-ending'] },
    { key: 'titleA', label: 'Başlık 1. satır', hint: '"14 gündür birlikteyiz."', placeholders: MAIL_PLACEHOLDERS['trial-ending'] },
    { key: 'titleB', label: 'Başlık 2. satır', hint: '"Devam edelim mi?"', placeholders: MAIL_PLACEHOLDERS['trial-ending'] },
    { key: 'usageEyebrow', label: 'Kullanım kart etiketi' },
    { key: 'plansEyebrow', label: 'Plan bölüm etiketi', hint: '"Plan seç · İlk ay %50"' },
    { key: 'starterTitle', label: 'Starter plan başlığı' },
    { key: 'starterBody', label: 'Starter plan açıklaması', multiline: true },
    { key: 'proTitle', label: 'Pro plan başlığı' },
    { key: 'proBody', label: 'Pro plan açıklaması', multiline: true },
    { key: 'proBadge', label: 'Pro rozet metni', hint: '"ÖNERİLEN"' },
    { key: 'cta', label: 'Birincil CTA' },
    { key: 'comparisonLink', label: 'Detay link metni' },
  ],
  'forgot-password': [
    { key: 'eyebrow', label: 'Eyebrow', hint: '"01 · Talep alındı"' },
    { key: 'title', label: 'Başlık 1. parça', hint: '"Şifreni"', placeholders: MAIL_PLACEHOLDERS['forgot-password'] },
    { key: 'titleAccent', label: 'Başlık vurgu', hint: '"sıfırlayalım" — lime altçizgili' },
    { key: 'intro', label: 'Giriş paragrafı', multiline: true, placeholders: MAIL_PLACEHOLDERS['forgot-password'] },
    { key: 'cardEyebrow', label: 'Token kart etiketi', hint: '"Tek kullanımlık link"' },
    { key: 'statusText', label: 'Durum pill metni', hint: '"Aktif · 30 dk geçerli"', locked: true, lockReason: 'Güvenlik: token süre uyarısı, değiştirmek phishing riski yaratır' },
    { key: 'cta', label: 'Birincil CTA buton metni' },
    { key: 'altCodeLabel', label: 'Alternatif kod açıklaması', hint: '"Uygulamada kullanmak için kod"' },
    { key: 'metaTime', label: 'Talep saati etiketi' },
    { key: 'metaIp', label: 'IP etiketi' },
    { key: 'metaDevice', label: 'Cihaz etiketi' },
    { key: 'metaAccount', label: 'Hesap etiketi' },
    { key: 'notYouTitle', label: '"Sen değil misin?" başlık', locked: true, lockReason: 'Güvenlik uyarısı — hesap sahibi değilsen ne yapmalı bilgisi' },
    { key: 'notYouBody', label: '"Sen değil misin?" gövde', multiline: true, locked: true, lockReason: 'Güvenlik uyarısı içeriği' },
    { key: 'notYouLink', label: 'Destek link metni', locked: true, lockReason: 'Şüpheli durum eskalasyon linki' },
  ],
  'low-rating-alert': [
    { key: 'eyebrowAlert', label: 'Üst alarm etiketi', hint: '"Anlık uyarı · Düşük puan"' },
    { key: 'eyebrowAction', label: 'Aksiyon urgency etiketi', hint: '"Aksiyon gerektiriyor · 1 saat içinde dön"' },
    { key: 'title', label: 'Başlık', hint: '"${rating} yıldız geldi."', placeholders: MAIL_PLACEHOLDERS['low-rating-alert'] },
    { key: 'titleSub', label: 'Başlık alt satır', hint: '"Önce dinleyelim."', placeholders: MAIL_PLACEHOLDERS['low-rating-alert'] },
    { key: 'aiEyebrow', label: 'AI Co-Pilot kart etiketi' },
    { key: 'toneLabel', label: 'AI tone default etiket', hint: 'aiTone param yokken görünür' },
    { key: 'aiEdit', label: '"Düzenle" buton metni' },
    { key: 'aiApprove', label: '"Onayla & Yanıtla" buton metni' },
    { key: 'quickEyebrow', label: 'Hızlı aksiyon başlığı' },
    { key: 'noComment', label: '"Yorum yok" hint metni' },
  ],
  'new-review': [
    { key: 'eyebrow', label: 'Status pill', hint: '"● Canlı · Az önce geldi"' },
    { key: 'title', label: 'Başlık', hint: '"${rating} yıldız."', placeholders: MAIL_PLACEHOLDERS['new-review'] },
    { key: 'titleSub', label: 'Başlık alt satır', hint: '"Hak ettin."', placeholders: MAIL_PLACEHOLDERS['new-review'] },
    { key: 'primaryCta', label: 'Birincil CTA', hint: '"Teşekkür yaz →"' },
    { key: 'secondaryCta', label: 'İkincil CTA', hint: '"Google\'da paylaş"' },
    { key: 'noComment', label: '"Yorum yok" hint' },
  ],
  'weekly-report': [
    // NOTE: `eyebrow` is intentionally not exposed here. Inline default uses
    // a `Hafta ${weekNum} · …` template literal — interpolation that admin
    // override would silently strip (DB stores plain strings). Render keeps
    // the literal default so the week number stays dynamic. If we ever want
    // operators to edit this, refactor render to compose `${weekPrefix}
    // ${weekNum} ${weekSuffix}` from separately-stored fields.
    { key: 'titleA', label: 'Hero 1. satır', hint: '"Sessiz başlayan hafta," (positive senaryo)', placeholders: MAIL_PLACEHOLDERS['weekly-report'] },
    { key: 'titleEnd', label: 'Hero 3. satır', hint: '"yorumla bitti."', placeholders: MAIL_PLACEHOLDERS['weekly-report'] },
    { key: 'statTotal', label: 'Yeni yorum etiketi' },
    { key: 'statAvg', label: 'Ortalama puan etiketi' },
    { key: 'statResp', label: 'Yanıt süresi etiketi', hint: 'Şu an gizli — backend response time tracking henüz yok' },
    { key: 'chartEyebrow', label: 'Grafik bölüm etiketi' },
    { key: 'chartTitle', label: 'Grafik başlığı' },
    { key: 'quotesEyebrow', label: 'Alıntılar bölüm etiketi' },
    { key: 'aspectFood', label: 'Yemek aspect etiketi' },
    { key: 'aspectService', label: 'Servis aspect etiketi' },
    { key: 'aspectAtm', label: 'Atmosfer aspect etiketi' },
    { key: 'cta', label: 'Birincil CTA' },
    { key: 'detailLabel', label: 'Detay kart başlığı' },
    { key: 'detailSub', label: 'Detay kart açıklaması', multiline: true },
  ],
  'customer-reply': [
    { key: 'headerEyebrow', label: 'Üst eyebrow', hint: '"Sana özel · Kişisel yanıt"' },
    { key: 'ownerLabel', label: 'İşletmeci rozeti', hint: '"İŞLETMECİ"' },
    { key: 'titleA', label: 'Başlık 1. parça', hint: '"${customerFirstName},"', placeholders: MAIL_PLACEHOLDERS['customer-reply'] },
    { key: 'titleSubA', label: 'Başlık 2. parça', hint: '"bizi"' },
    { key: 'titleSubItalic', label: 'Başlık italic kelime', hint: '"duyduğun için"' },
    { key: 'titleSubB', label: 'Başlık 4. parça', hint: '"teşekkürler"' },
    { key: 'actionsEyebrow', label: 'Aksiyonlar kart etiketi' },
    { key: 'couponEyebrow', label: 'Kupon kart etiketi' },
    { key: 'couponTitle', label: 'Kupon başlığı', multiline: true, placeholders: MAIL_PLACEHOLDERS['customer-reply'] },
    { key: 'couponDescDefault', label: 'Kupon açıklaması (default)', multiline: true },
    { key: 'couponLabelDefault', label: 'Kupon kod etiketi' },
    { key: 'daysSuffix', label: 'Gün sayısı suffix', hint: '"gün"' },
    { key: 'callEyebrow', label: 'Telefon kart etiketi' },
    { key: 'mapsEyebrow', label: 'Yol tarifi kart etiketi' },
    { key: 'sentLine', label: 'Footer Buaze disclosure 1', locked: true, lockReason: 'KVKK / GDPR: Buaze gönderim açıklaması — şeffaflık zorunluluğu' },
    { key: 'sentSuffix', label: 'Footer Buaze disclosure 2', locked: true, lockReason: 'KVKK / GDPR: Buaze gönderim açıklaması — şeffaflık zorunluluğu' },
  ],
};

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

interface Props {
  templateKey: string;
  locale: string;
}

export default function MailTemplateEditor({ templateKey, locale }: Props) {
  // form-confirmation has 4 nested formType variants — its own editor with
  // tab UI, separate state per variant, save round-trips all 4 in one PATCH.
  // Branching here keeps the flat editor (8 templates) untouched.
  if (templateKey === 'form-confirmation') {
    return <FormConfirmationEditor locale={locale} />;
  }
  return <FlatTemplateEditor templateKey={templateKey} locale={locale} />;
}

function FlatTemplateEditor({ templateKey, locale }: Props) {
  const router = useRouter();
  const fields = FIELDS_BY_TEMPLATE[templateKey] ?? [];
  const isEnglish = locale === 'en';

  const [content, setContent] = useState<Record<string, string>>({});
  const [seeded, setSeeded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/admin/mail-templates/${templateKey}/${locale}`);
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
        const dbContent = (body.template?.content as Record<string, string>) ?? {};
        const stringContent: Record<string, string> = {};
        for (const f of fields) {
          // Locked fields never round-trip through the form: the inline
          // default is always the source of truth, so leaving state empty
          // keeps the PATCH payload minimal (server strips anyway, but
          // sending nothing means slow networks see no flicker).
          if (f.locked) continue;
          stringContent[f.key] = typeof dbContent[f.key] === 'string' ? dbContent[f.key] : '';
        }
        setContent(stringContent);
        setSeeded(true);
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [templateKey, locale, fields]);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/admin/mail-templates/${templateKey}/${locale}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const body = await res.json();
      if (!res.ok) {
        if (body.error === 'invalid_placeholder' && body.field && Array.isArray(body.invalid)) {
          throw new Error(
            `"${body.field}" alanında geçersiz placeholder: ${body.invalid.map((p: string) => `\${${p}}`).join(', ')}. İzin verilenler: ${(body.allowed ?? []).map((p: string) => `\${${p}}`).join(', ') || '(yok)'}`,
          );
        }
        throw new Error(body.error || 'Kayıt başarısız');
      }
      setSeeded(true);
      setInfo('Kayıt başarılı — değişiklik 1 dakika içinde tüm gönderimlere yansır.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onRevert = async () => {
    if (!confirm('Tüm bu içeriği silip kod-içi varsayılana dönmek istediğine emin misin?')) return;
    setReverting(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/admin/mail-templates/${templateKey}/${locale}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Silme başarısız');
      }
      setContent(Object.fromEntries(fields.map((f) => [f.key, ''])));
      setSeeded(false);
      setInfo('Varsayılana döndürüldü. Sonraki mail kod-içi default ile gider.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReverting(false);
    }
  };

  const onPreview = () => {
    window.open(`/api/dev/email-preview?template=${templateKey}&locale=${locale}`, '_blank');
  };

  const onTestMail = async () => {
    setSendingTest(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch('/api/admin/dev/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: templateKey, locale }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Test mail gönderimi başarısız');
      setInfo(`Test mail gönderildi: ${body.to}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSendingTest(false);
    }
  };

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
        <p className="pulse-eyebrow text-[#737373]">MAIL İÇERİĞİ / {templateKey.toUpperCase()}</p>
        <h1 className="mt-1 flex items-center gap-3 text-[24px] sm:text-[28px] font-medium text-[#0A0A0A] tracking-[-0.025em]" style={{ fontFamily: 'var(--font-heading)' }}>
          <Mail size={20} strokeWidth={2} />
          {TEMPLATE_LABELS[templateKey] ?? templateKey} · {isEnglish ? 'English' : 'Türkçe'}
        </h1>
        <p className="mt-1.5 text-[13px] sm:text-[14px] text-[#525252]">
          Aşağıdaki alanlar mailde görünür. Boş bıraktıkların kod-içi varsayılan
          değer ile doldurulur. Değişikliklerin 1 dakika içinde tüm gönderimlerde aktif olur.
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
          <div className="space-y-4 rounded-2xl border border-[#EDEDED] bg-white p-5 sm:p-7">
            {fields.map((f) => (
              <MailFieldInput
                key={f.key}
                field={f}
                value={content[f.key] ?? ''}
                onChange={(next) => setContent((c) => ({ ...c, [f.key]: next }))}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EDEDED] bg-white p-4 sm:p-5">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onPreview}
                className="inline-flex items-center gap-2 rounded-xl border border-[#EDEDED] bg-white px-4 py-2.5 text-xs font-semibold text-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95"
              >
                <Eye size={14} /> Önizle
              </button>
              <button
                type="button"
                onClick={onTestMail}
                disabled={sendingTest}
                className="inline-flex items-center gap-2 rounded-xl border border-[#EDEDED] bg-white px-4 py-2.5 text-xs font-semibold text-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95 disabled:opacity-50"
              >
                {sendingTest ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                Test mail at
              </button>
              {seeded && (
                <button
                  type="button"
                  onClick={onRevert}
                  disabled={reverting}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-50 active:scale-95 disabled:opacity-50"
                >
                  {reverting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  Varsayılana dön
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#C6F24E] px-5 py-2.5 text-xs font-semibold text-[#0A0A0A] hover:bg-[#A8D62E] active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Kaydet
            </button>
          </div>
        </>
      )}
    </div>
  );
}
