'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Eye, History, Loader2, Mail, RotateCcw, Save } from 'lucide-react';
import Link from 'next/link';
import MailFieldInput, { type MailFieldDef } from './MailFieldInput';
import FormConfirmationEditor from './FormConfirmationEditor';
import MailRevisionHistory from './MailRevisionHistory';
import { useConfirmDialog } from '@/components/ui';
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
    { key: 'aiEyebrow', label: 'Pulse AI kart etiketi' },
    { key: 'toneLabel', label: 'AI tone default etiket', hint: 'aiTone param yokken görünür' },
    { key: 'aiEdit', label: '"Düzenle" buton metni' },
    { key: 'aiApprove', label: '"Onayla & Yanıtla" buton metni' },
    { key: 'quickEyebrow', label: 'Hızlı aksiyon başlığı' },
    { key: 'noComment', label: '"Yorum yok" hint metni' },
  ],
  'new-review': [
    { key: 'eyebrow', label: 'Status pill', hint: '"● Az önce geldi"' },
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
    // Phase 8c+ (CLAUDE.md §38.22) — segment dağılımı kartı override alanları.
    // Segment chip etiketleri (VIP/Düzenli/Yeni/Risk) kasten override edilebilir
    // bırakıldı (lokalizasyon: bazı sektörlerde "Düzenli" yerine "Sadık" tercih
    // edilebilir). Backend `segmentCounts` undefined ise card otomatik gizlenir.
    { key: 'segmentEyebrow', label: 'Segment kartı etiketi', hint: '"Müşteri segmentleri"' },
    { key: 'segmentTitle', label: 'Segment kartı başlığı', hint: '"Bu hafta kim yorum bıraktı?"' },
    { key: 'segmentVip', label: 'VIP chip etiketi' },
    { key: 'segmentLoyal', label: 'Düzenli chip etiketi' },
    { key: 'segmentNew', label: 'Yeni chip etiketi' },
    { key: 'segmentRisk', label: 'Risk chip etiketi' },
    // §38.48 — 5. segment chip (CLAUDE.md §38.47 churned segment parity)
    { key: 'segmentChurned', label: 'Kayıp chip etiketi', hint: '"Kayıp" / "Churned" — 90+ gün dönmemiş misafir' },
    { key: 'segmentHint', label: 'Segment açıklama satırı', multiline: true, hint: 'Kart altındaki ufak hint metni' },
  ],
  'verify-email': [
    { key: 'eyebrow', label: 'Eyebrow', hint: '"E-POSTA ONAYI"' },
    { key: 'title', label: 'Başlık 1. satır', hint: '"Hesabını birkaç"' },
    { key: 'titleAccent', label: 'Başlık vurgu', hint: '"saniyede aç" — lime renkli' },
    { key: 'intro', label: 'Giriş paragrafı', multiline: true, placeholders: MAIL_PLACEHOLDERS['verify-email'] },
    { key: 'cardEyebrow', label: 'Token kart etiketi', hint: '"Tek kullanımlık link"' },
    { key: 'statusText', label: 'Durum pill metni', hint: '"Aktif · 24 saat geçerli"', locked: true, lockReason: 'Güvenlik: token süre uyarısı, değiştirmek phishing riski yaratır' },
    { key: 'cta', label: 'Birincil CTA buton metni' },
    { key: 'notYouTitle', label: '"Sen değil misin?" başlık', locked: true, lockReason: 'Güvenlik uyarısı — hesap sahibi değilsen ne yapmalı bilgisi' },
    { key: 'notYouBody', label: '"Sen değil misin?" gövde', multiline: true, locked: true, lockReason: 'Güvenlik uyarısı içeriği' },
  ],
  'roi-customer-report': [
    { key: 'subjectTemplate', label: 'Mail başlığı (subject)', hint: '"${restaurantName} için 12 aylık ROI raporun hazır"', placeholders: MAIL_PLACEHOLDERS['roi-customer-report'] },
    { key: 'preheaderPrefix', label: 'Inbox preview öneki', hint: 'AI summary öncesi sabit metin — "Yıllık net kazanç + ROI..."' },
    { key: 'heroEyebrow', label: 'Üst etiket', hint: '"BUAZE ROI RAPORU · 12 AY"' },
    { key: 'heroIntroPdf', label: 'Hero giriş paragrafı (PDF varken)', multiline: true, placeholders: MAIL_PLACEHOLDERS['roi-customer-report'] },
    { key: 'heroIntroNoPdf', label: 'Hero giriş paragrafı (PDF yokken)', multiline: true, placeholders: MAIL_PLACEHOLDERS['roi-customer-report'] },
    { key: 'netGainEyebrow', label: 'Net kazanç kart etiketi', hint: '"YILLIK NET KAZANÇ"' },
    { key: 'ctaEyebrow', label: 'CTA kart etiketi', hint: '"SIRADAKİ ADIM"' },
    { key: 'ctaTitle', label: 'CTA başlığı', hint: '"30 dk canlı kurulum + soru-cevap"' },
    { key: 'ctaBody', label: 'CTA gövde', multiline: true, placeholders: MAIL_PLACEHOLDERS['roi-customer-report'] },
    { key: 'ctaPrimary', label: 'Birincil CTA buton metni', hint: '"Demo daveti gönder"' },
    { key: 'ctaSecondary', label: 'Mailto CTA buton metni', hint: '"✉ Bize doğrudan yaz · hello@buaze.com"' },
    { key: 'ctaPlanLink', label: 'Plan link prefix', hint: '"Ya da planları gör"' },
    { key: 'riskFree1', label: 'Risk-free chip 1', hint: '"30 gün ücretsiz"' },
    { key: 'riskFree2', label: 'Risk-free chip 2', hint: '"Kredi kartı yok"' },
    { key: 'riskFree3', label: 'Risk-free chip 3', hint: '"İstediğin an iptal"' },
    { key: 'calibrationFooter', label: 'Kalibrasyon disclaimer', multiline: true, hint: 'BrightLocal + Buaze cohort kaynak metni' },
  ],
  'roi-admin-notification': [
    { key: 'subjectTemplate', label: 'Mail başlığı (subject)', hint: '"[Lead] ${restaurantName} · ${netGain}/yıl"', placeholders: MAIL_PLACEHOLDERS['roi-admin-notification'] },
    { key: 'preheaderPrefix', label: 'Inbox preview öneki', hint: '"${restaurantName} ROI hesabı yaptı: ${netGain}/yıl."', placeholders: MAIL_PLACEHOLDERS['roi-admin-notification'] },
    { key: 'alertEyebrow', label: 'Alert bar etiketi', hint: '"YENİ ROI LEAD\'İ"' },
    { key: 'statusPill', label: 'Aciliyet pill', hint: '"24 saat içinde dön"' },
    { key: 'netGainEyebrow', label: 'Net kazanç kart etiketi', hint: '"YILLIK NET KAZANÇ"' },
    { key: 'scenarioH2', label: 'Senaryo bölüm başlığı', hint: '"Senaryosu"' },
    { key: 'quickEyebrow', label: 'Hızlı aksiyon etiketi', hint: '"HIZLI AKSİYON"' },
    { key: 'replyLabel', label: 'Yanıt yaz buton', hint: '"Yanıt yaz"' },
    { key: 'replySub', label: 'Yanıt buton sub', hint: '"E-posta gönder"' },
    { key: 'callLabel', label: 'Telefon buton', hint: '"Telefonla ara"' },
    { key: 'callSubYes', label: 'Telefon sub (numara var)', hint: '"Numarayı çevir"' },
    { key: 'callSubNo', label: 'Telefon sub (numara yok)', hint: '"Numara yok"' },
    { key: 'panelLabel', label: 'Panel buton', hint: '"Lead panel"' },
    { key: 'panelSub', label: 'Panel buton sub', hint: '"Tüm lead\'ler"' },
    { key: 'footerDisclosure', label: 'Footer disclaimer', multiline: true, hint: 'Otomatik gönderim açıklaması' },
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
  // ── Wave B lifecycle emails (CLAUDE.md §21.34) ──
  // Audit Fix (CLAUDE.md §38.10): SUPPORTED_MAIL_KEYS 4 lifecycle entry
  // taşıyor ama editor field map'e eklenmemişti → admin edit page'de
  // FIELDS_BY_TEMPLATE[key] ?? [] boş array fallback'e düşüyor, form 0
  // field render ediyordu ("içerikleri gözükmüyor" şikayetinin kök nedeni).
  'qr-not-downloaded': [
    { key: 'eyebrow', label: 'Eyebrow', hint: '"KURULUM HATIRLATMASI"' },
    { key: 'title', label: 'Başlık', placeholders: MAIL_PLACEHOLDERS['qr-not-downloaded'] },
    { key: 'intro', label: 'Giriş paragrafı', multiline: true, placeholders: MAIL_PLACEHOLDERS['qr-not-downloaded'] },
    { key: 'why', label: 'Neden önemli paragrafı', multiline: true, hint: 'QR yerleşiminin yorum sayısına etkisi açıklaması' },
    { key: 'cta', label: 'Birincil CTA buton metni' },
    { key: 'footnote', label: 'Footer dipnot', multiline: true, hint: 'Tek-sefer hatırlatma + checklist disclaimer' },
  ],
  'first-feedback-tips': [
    { key: 'eyebrow', label: 'Eyebrow', hint: '"İLK YORUM REHBERİ"' },
    { key: 'title', label: 'Başlık', placeholders: MAIL_PLACEHOLDERS['first-feedback-tips'] },
    { key: 'intro', label: 'Giriş paragrafı', multiline: true, placeholders: MAIL_PLACEHOLDERS['first-feedback-tips'] },
    { key: 'tip1Title', label: 'İpucu 1 başlık', hint: '"1. Görünürlük: doğru yer"' },
    { key: 'tip1Body', label: 'İpucu 1 gövde', multiline: true },
    { key: 'tip2Title', label: 'İpucu 2 başlık', hint: '"2. Personel: doğal davet"' },
    { key: 'tip2Body', label: 'İpucu 2 gövde', multiline: true },
    { key: 'tip3Title', label: 'İpucu 3 başlık', hint: '"3. Görsel mesaj: net çağrı"' },
    { key: 'tip3Body', label: 'İpucu 3 gövde', multiline: true },
    { key: 'cta', label: 'Birincil CTA buton metni' },
    { key: 'footnote', label: 'Footer dipnot', multiline: true },
  ],
  'upgrade-suggestion': [
    { key: 'eyebrow', label: 'Eyebrow', hint: '"PLAN ÖNERİSİ"' },
    { key: 'title', label: 'Başlık', placeholders: MAIL_PLACEHOLDERS['upgrade-suggestion'] },
    { key: 'intro', label: 'Giriş paragrafı', multiline: true, placeholders: MAIL_PLACEHOLDERS['upgrade-suggestion'] },
    { key: 'feature1', label: 'Özellik 1', multiline: true, hint: '"Pulse AI ile yorumlara saniyeler içinde profesyonel yanıt taslağı"' },
    { key: 'feature2', label: 'Özellik 2', multiline: true },
    { key: 'feature3', label: 'Özellik 3', multiline: true },
    { key: 'feature4', label: 'Özellik 4', multiline: true },
    { key: 'cta', label: 'Birincil CTA buton metni' },
    { key: 'footnote', label: 'Footer dipnot', multiline: true, hint: 'Ayda bir gönderim disclaimer' },
  ],
  'inactive-reactivation': [
    { key: 'eyebrow', label: 'Eyebrow', hint: '"TEKRAR HOŞ GELDİNİZ"' },
    { key: 'title', label: 'Başlık', placeholders: MAIL_PLACEHOLDERS['inactive-reactivation'] },
    { key: 'intro', label: 'Giriş paragrafı', multiline: true },
    { key: 'suggestion', label: 'Öneri paragrafı', multiline: true, hint: '3 hızlı kontrol noktası listesi' },
    { key: 'cta', label: 'Birincil CTA buton metni' },
    { key: 'footnote', label: 'Footer dipnot', multiline: true },
  ],
  // §38.48 Wave 2 — Customer mass email campaign chrome (subject + body owner-authored,
  // editor sadece üst-seviye chrome alanlarını override eder).
  'customer-campaign': [
    { key: 'eyebrow', label: 'Eyebrow', hint: '"Restoranından mesaj"' },
    { key: 'unsubscribeLabel', label: '"Listeden ayrıl" link metni' },
    { key: 'sentLine', label: 'Footer "Buaze ile gönderildi" prefix' },
    { key: 'sentSuffix', label: 'Footer suffix', hint: 'TR: "üzerinden iletildi." / EN: ""' },
  ],
  // Stage 29 §38.105 — campaign moderation owner notifications.
  'owner-campaign-approved': [
    { key: 'eyebrow', label: 'Eyebrow' },
    { key: 'title', label: 'Başlık' },
    {
      key: 'intro',
      label: 'Giriş paragrafı',
      multiline: true,
      hint: '${ownerName} ve ${restaurantName} placeholder\'ları kullanılabilir',
      placeholders: ['ownerName', 'restaurantName'],
    },
    { key: 'statsLabel', label: 'Stats başlık' },
    { key: 'sentRow', label: '"Gönderilen" satırı' },
    { key: 'failedRow', label: '"Başarısız" satırı' },
    { key: 'ctaLabel', label: 'CTA buton metni' },
    { key: 'footerHint', label: 'Footer ipucu', multiline: true },
  ],
  'owner-campaign-rejected': [
    { key: 'eyebrow', label: 'Eyebrow' },
    { key: 'title', label: 'Başlık' },
    {
      key: 'intro',
      label: 'Giriş paragrafı',
      multiline: true,
      hint: '${ownerName} ve ${restaurantName} placeholder\'ları kullanılabilir',
      placeholders: ['ownerName', 'restaurantName'],
    },
    { key: 'noteLabel', label: '"Gerekçe" başlığı' },
    { key: 'nextStepsTitle', label: 'Sonraki adımlar başlığı' },
    { key: 'nextStepsBody', label: 'Sonraki adımlar açıklama', multiline: true },
    { key: 'ctaLabel', label: 'CTA buton metni' },
    { key: 'footerHint', label: 'Footer ipucu', multiline: true },
  ],
  // Wave B1 (CLAUDE.md §38.B) — password-changed security alert. KVKK
  // lock'lu 4 alan (statusText/notYouTitle/notYouBody/notYouLink) admin
  // editor'da disabled görünür (locked-fields.ts).
  'password-changed': [
    { key: 'eyebrow', label: 'Eyebrow', hint: '"Güvenlik · Bildirim"' },
    { key: 'title', label: 'Başlık 1. parça', hint: '"Şifren"' },
    { key: 'titleAccent', label: 'Başlık vurgu kelimesi', hint: '"güncellendi"' },
    {
      key: 'intro',
      label: 'Giriş paragrafı',
      multiline: true,
      hint: '${firstName} placeholder kullanılabilir',
      placeholders: MAIL_PLACEHOLDERS['password-changed'],
    },
    { key: 'cardEyebrow', label: 'Detay kart etiketi', hint: '"Değişiklik detayı"' },
    { key: 'statusText', label: 'Status metni', hint: '"Başarılı · Şifre güncel"' },
    { key: 'metaTime', label: 'Meta — saat etiketi' },
    { key: 'metaIp', label: 'Meta — IP etiketi' },
    { key: 'metaDevice', label: 'Meta — cihaz etiketi' },
    { key: 'metaAccount', label: 'Meta — hesap etiketi' },
    { key: 'notYouTitle', label: '"Sen değil misin?" başlık' },
    { key: 'notYouBody', label: '"Sen değil misin?" açıklama', multiline: true },
    { key: 'notYouLink', label: 'Şifre sıfırlama link metni' },
  ],
  // Wave B2 (CLAUDE.md §38.B) — team-member-joined owner notification.
  'team-member-joined': [
    { key: 'eyebrow', label: 'Eyebrow', hint: '"Ekip · Yeni üye"' },
    { key: 'title', label: 'Başlık 1. parça', hint: '"Ekibin"' },
    { key: 'titleAccent', label: 'Başlık vurgu', hint: '"genişledi"' },
    {
      key: 'intro',
      label: 'Giriş paragrafı',
      multiline: true,
      placeholders: MAIL_PLACEHOLDERS['team-member-joined'],
    },
    { key: 'cardEyebrow', label: 'Detay kart etiketi' },
    { key: 'nameLabel', label: 'İsim etiketi' },
    { key: 'roleLabelKey', label: 'Rol etiketi' },
    { key: 'locationsLabel', label: 'Erişim etiketi' },
    { key: 'cta', label: 'CTA buton metni' },
    { key: 'note', label: 'Footer not metni', multiline: true },
  ],
  // Wave B3 (CLAUDE.md §38.B) — team-member-removed audit notification.
  'team-member-removed': [
    { key: 'eyebrow', label: 'Eyebrow', hint: '"Ekip · Üye çıkarıldı"' },
    { key: 'title', label: 'Başlık 1. parça' },
    { key: 'titleAccent', label: 'Başlık vurgu' },
    {
      key: 'intro',
      label: 'Giriş paragrafı',
      multiline: true,
      placeholders: MAIL_PLACEHOLDERS['team-member-removed'],
    },
    { key: 'cardEyebrow', label: 'Audit kayıt etiketi' },
    { key: 'nameLabel', label: 'İsim etiketi' },
    { key: 'emailLabel', label: 'E-posta etiketi' },
    { key: 'roleLabelKey', label: 'Rol etiketi' },
    { key: 'actionLabel', label: 'Aksiyon etiketi' },
    { key: 'actionValue', label: 'Aksiyon değer metni' },
    { key: 'cta', label: 'CTA buton metni' },
    { key: 'note', label: 'Footer not metni', multiline: true },
  ],
  // Wave B5 (CLAUDE.md §38.B) — first feedback celebration.
  'first-feedback-celebration': [
    { key: 'eyebrow', label: 'Eyebrow', hint: '"Aktivasyon · İlk yorum"' },
    { key: 'title', label: 'Başlık 1. parça', hint: '"İlk yorumun"' },
    { key: 'titleAccent', label: 'Başlık vurgu', hint: '"geldi"' },
    {
      key: 'intro',
      label: 'Giriş paragrafı',
      multiline: true,
      placeholders: MAIL_PLACEHOLDERS['first-feedback-celebration'],
    },
    { key: 'quoteEyebrow', label: 'Yorum kart etiketi' },
    { key: 'noComment', label: 'Yorum yoksa metin' },
    { key: 'cta', label: 'CTA buton metni' },
    { key: 'tipPositive', label: 'Pozitif puan ipucu (4-5)', multiline: true },
    { key: 'tipLow', label: 'Düşük puan ipucu (1-3)', multiline: true },
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
  'verify-email': 'E-posta onayı',
  'roi-customer-report': 'ROI raporu (müşteri)',
  'roi-admin-notification': 'ROI lead (admin)',
  'qr-not-downloaded': 'QR indirilmedi',
  'first-feedback-tips': 'İlk yorum rehberi',
  'upgrade-suggestion': 'Plan yükseltme önerisi',
  'inactive-reactivation': 'Tekrar canlandırma',
  'customer-campaign': 'Müşteri kampanyası',
  'owner-campaign-approved': 'Kampanya onaylandı (owner)',
  'owner-campaign-rejected': 'Kampanya reddedildi (owner)',
  // Wave B (CLAUDE.md §38.B)
  'password-changed': 'Şifre değişti (güvenlik)',
  'team-member-joined': 'Yeni ekip üyesi',
  'team-member-removed': 'Ekip üyesi çıkarıldı',
  'first-feedback-celebration': 'İlk yorum kutlaması',
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
  // §38.49 — useMemo to keep `fields` reference stable across renders;
  // useEffect deps below depend on it (otherwise re-fires every render).
  const fields = useMemo(
    () => FIELDS_BY_TEMPLATE[templateKey] ?? [],
    [templateKey],
  );
  const isEnglish = locale === 'en';

  const [content, setContent] = useState<Record<string, string>>({});
  // savedContent: en son DB'ye yazılmış (veya yüklenmiş) snapshot. Dirty
  // detection için karşılaştırma referansı. `content !== savedContent`
  // → "Taslak (kaydedilmedi)" badge görünür.
  const [savedContent, setSavedContent] = useState<Record<string, string>>({});
  const [seeded, setSeeded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [confirmDialog, askConfirm] = useConfirmDialog();

  // Dirty check: content vs savedContent stringify (shallow flat object,
  // <30 string keys; cheap). Field add/remove olmadığı için key sayısı
  // sabit, JSON compare deterministik.
  const isDirty = JSON.stringify(content) !== JSON.stringify(savedContent);

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
        setSavedContent(stringContent);
        setSeeded(true);
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // `reloadKey` re-fetches after revert; `fields` is stable per template.
  }, [templateKey, locale, fields, reloadKey]);

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
      // Save sonrası dirty state'i temizle — savedContent'i mevcut content
      // ile senkronize et. Aksi halde "Taslak" badge save'den sonra da kalır.
      setSavedContent(content);
      setInfo('Kayıt başarılı — değişiklik 1 dakika içinde tüm gönderimlere yansır.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onRevert = () => {
    askConfirm({
      title: 'Varsayılan içeriğe dön',
      body: 'Tüm bu içeriği silip kod-içi varsayılana dönmek istediğine emin misin? Mevcut özelleştirmeler kaybolur (geçmiş kayıtlardan geri getirebilirsin).',
      confirmLabel: 'Sıfırla',
      cancelLabel: 'Vazgeç',
      variant: 'danger',
      onConfirm: async () => {
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
      },
    });
  };

  const onPreview = () => {
    window.open(`/api/dev/email-preview?template=${templateKey}&locale=${locale}`, '_blank');
  };

  const onTestMail = async () => {
    setSendingTest(true);
    setError(null);
    setInfo(null);
    try {
      // Audit Fix A: dirty editor → draft içeriği test edilebilsin (DB'ye
      // yazmadan). Server setMailCopyDraft + try/finally ile geçici
      // override uygular.
      const res = await fetch('/api/admin/dev/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: templateKey,
          locale,
          ...(isDirty ? { draftContent: content } : {}),
        }),
      });
      // Defensive parse: empty-body 500 can slip through on platform
      // edge cases. Fall back to status-derived message.
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = body.detail || body.error || `Sunucu hatası (HTTP ${res.status})`;
        const hint = body.hint ? ` — ${body.hint}` : '';
        throw new Error(`Test mail gönderimi başarısız: ${msg}${hint}`);
      }
      const draftHint = isDirty ? ' (taslak içerik)' : '';
      setInfo(`Test mail gönderildi: ${body.to}${draftHint}`);
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
        {/* CLAUDE.md §38.164 (Stage 84): inline fontFamily redundancy kaldırıldı. */}
        <h1 className="mt-1 flex flex-wrap items-center gap-3 text-[24px] sm:text-[28px] font-medium text-[#0A0A0A] tracking-[-0.025em]">
          <Mail size={20} strokeWidth={2} />
          <span>{TEMPLATE_LABELS[templateKey] ?? templateKey} · {isEnglish ? 'English' : 'Türkçe'}</span>
          {isDirty && !loading && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[11px] font-medium text-[#92400E] border border-[#FDE68A]"
              style={{ fontFamily: 'var(--font-sans)' }}
              title="Kaydedilmemiş değişiklikler var"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#D97706]" />
              Taslak
            </span>
          )}
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

          {/* Mobile-first action toolbar.
              - Save button stacks above on small screens (full-width, primary action)
              - Secondary actions wrap as 2-col grid on mobile (44px touch targets)
              - Desktop: row layout, save right-aligned */}
          <div className="flex flex-col gap-3 rounded-2xl border border-[#EDEDED] bg-white p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:p-5">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={onPreview}
                className="bz-btn bz-btn-sm"
              >
                <Eye size={14} /> Önizle
              </button>
              <button
                type="button"
                onClick={onTestMail}
                disabled={sendingTest}
                className="bz-btn bz-btn-sm disabled:opacity-50"
              >
                {sendingTest ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                Test mail at
              </button>
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="bz-btn text-xs"
              >
                <History size={14} /> Geçmiş
              </button>
              {seeded && (
                <button
                  type="button"
                  onClick={onRevert}
                  disabled={reverting}
                  className="bz-btn-danger text-xs disabled:opacity-50"
                >
                  {reverting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  Varsayılana dön
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onSave}
              disabled={saving || !isDirty}
              title={!isDirty ? 'Değiştirecek bir şey yok' : 'Kaydedilmemiş değişiklikleri kaydet'}
              className="bz-btn-lime w-full disabled:opacity-50 sm:w-auto"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Kaydet
            </button>
          </div>
        </>
      )}

      <MailRevisionHistory
        templateKey={templateKey}
        locale={locale}
        open={historyOpen}
        hasUnsavedDraft={isDirty}
        onClose={() => setHistoryOpen(false)}
        onReverted={() => {
          // Revert applied DB-side; re-fetch the editor's content so the
          // form reflects the reverted state without a hard reload.
          setReloadKey((k) => k + 1);
          setInfo('Geri dönüş başarılı — içerik yenilendi.');
        }}
      />
      {confirmDialog}
    </div>
  );
}
