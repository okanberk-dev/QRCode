// Wave B lifecycle email inline defaults — module-level export'ler
// (CLAUDE.md §38.43). Önceden render fn'lerinde local `inlineDefault =
// isTr ? {...} : {...}` blok'unda tutuluyordu; admin mail templates
// editor'a inline default göstermek (DB content boşken) gerektiği için
// dış scope'a taşındı.
//
// Drift guarantee: render fn'leri (qr-not-downloaded.ts, vb.) bu dosyadan
// import eder + admin API GET endpoint'i `LIFECYCLE_INLINE_DEFAULTS` map'i
// üzerinden fallback için aynı obj'ye referans verir → admin'in editor'da
// gördüğü default ile gerçek mail render'ında kullanılan default tek
// source-of-truth.

import type { MailLocale } from '../copy-loader';

export const QR_NOT_DOWNLOADED_DEFAULTS: Record<MailLocale, Record<string, string>> = {
  tr: {
    eyebrow: 'KURULUM HATIRLATMASI',
    title: 'Merhaba ${firstName}, QR kodunuz sizi bekliyor',
    intro:
      '${restaurantName} için kurulum başlattınız ama henüz QR kodunuzu indirmediniz. QR kartınız olmadan müşterileriniz size yorum bırakamaz.',
    why: 'Masaya / kasaya / fişe yerleştirilmiş bir QR kartı, ortalama olarak yorum sayısını anlamlı şekilde artırır. Tek bir indirme yeterli — sonrası baskı + yerleştirme.',
    cta: 'QR kodunuzu indirin',
    footnote:
      'Bu hatırlatma sadece bir kez gönderilir. Kurulumunuzu tamamlamak istiyorsanız panele giriş yaparak kontrol listesine bakabilirsiniz.',
  },
  en: {
    eyebrow: 'SETUP REMINDER',
    title: "Hi ${firstName}, your QR is waiting",
    intro:
      "You started setup for ${restaurantName} but haven't downloaded your QR yet. Without a QR card, your customers can't leave reviews.",
    why: 'A QR placed on a table / counter / receipt meaningfully increases review volume. One download — then print + place.',
    cta: 'Download your QR',
    footnote:
      'This reminder is sent only once. Sign in to the dashboard anytime to check your activation checklist.',
  },
};

export const FIRST_FEEDBACK_TIPS_DEFAULTS: Record<MailLocale, Record<string, string>> = {
  tr: {
    eyebrow: 'İLK YORUM REHBERİ',
    title: 'Merhaba ${firstName}, ilk yorum yolda',
    intro:
      'QR kodunuzu hazırladınız — şimdi onu görünür ve davetkâr hale getirme zamanı. ${restaurantName} için hızlıca uygulayabileceğiniz 3 pratik öneri:',
    tip1Title: '1. Görünürlük: doğru yer',
    tip1Body:
      'QR kartını masada / kasada / paket fişinin altında müşterinin gözüne ilk takılan noktaya yerleştirin. Menü altında görünmez kalan QR çalışmaz.',
    tip2Title: '2. Personel: doğal davet',
    tip2Body:
      'Garson / kasiyer "memnun kaldıysanız QR\'ı taratın" tarzı tek cümlelik doğal bir hatırlatma yapsa, tarama oranı belirgin şekilde artar. Zorlama değil, doğal akış.',
    tip3Title: '3. Görsel mesaj: net çağrı',
    tip3Body:
      'QR kartının üstüne "Deneyiminizi paylaşın" / "Yorumunuz bizim için değerli" gibi tek satır net çağrı yazın. Müşteri ne yapacağını bilirse harekete geçer.',
    cta: 'Panele dönün',
    footnote: 'Bu öneri serisi sadece bir kez gönderilir. İlk yorumunuz geldiğinde panel size bildirir.',
  },
  en: {
    eyebrow: 'FIRST REVIEW GUIDE',
    title: 'Hi ${firstName}, your first review is close',
    intro:
      'Your QR is ready — now make it visible and inviting. Three practical tips you can apply for ${restaurantName} today:',
    tip1Title: '1. Visibility: right placement',
    tip1Body:
      'Place the QR on the table / counter / takeaway receipt where the customer notices it first. A QR hidden under the menu does nothing.',
    tip2Title: '2. Staff: natural invitation',
    tip2Body:
      'If a server / cashier mentions "scan the QR if you enjoyed it" as a single natural sentence, scan rate noticeably increases. No pressure, just flow.',
    tip3Title: '3. Visual message: clear call',
    tip3Body:
      'Put a one-line clear prompt on the QR card: "Share your experience" / "Your review matters". Customers act when they know what to do.',
    cta: 'Go to dashboard',
    footnote:
      'These tips are sent only once. Your panel will notify you when the first review arrives.',
  },
};

export const UPGRADE_SUGGESTION_DEFAULTS: Record<MailLocale, Record<string, string>> = {
  tr: {
    eyebrow: 'PLAN ÖNERİSİ',
    title: 'Merhaba ${firstName}, ${restaurantName} büyüyor',
    intro:
      '${restaurantName} için ${feedbackCount} yorum topladınız. Bu hacimde yorumu manuel takip etmek yorucu olabilir — Buaze Pro size birkaç önemli alan açıyor:',
    feature1: 'Pulse AI ile yorumlara saniyeler içinde profesyonel yanıt taslağı',
    feature2: 'Otomatik düşük puan uyarıları + e-posta bildirimi',
    feature3: 'Detaylı analitik: platform dağılımı, saat-bazlı trend, sentiment teması',
    feature4: 'Birden fazla şube + ekip rolleri',
    cta: 'Planları görüntüle',
    footnote: 'Bu öneri sadece ayda bir gönderilir. Mevcut planınızda kalmak isterseniz hiçbir şey yapmanıza gerek yok.',
  },
  en: {
    eyebrow: 'PLAN SUGGESTION',
    title: 'Hi ${firstName}, ${restaurantName} is growing',
    intro:
      "You've collected ${feedbackCount} reviews for ${restaurantName}. At this volume, manual tracking gets tiring — Buaze Pro opens up several useful areas:",
    feature1: 'Pulse AI drafts professional reply suggestions in seconds',
    feature2: 'Automatic low-rating alerts + email notifications',
    feature3: 'Detailed analytics: platform breakdown, hourly trend, sentiment themes',
    feature4: 'Multiple locations + team roles',
    cta: 'View plans',
    footnote:
      'This suggestion is sent only once a month. If you prefer your current plan, no action needed.',
  },
};

// Lookup map — admin API GET endpoint'i bunu kullanarak DB content boş veya
// row yoksa inline default'ı fallback olarak döner. SUPPORTED_MAIL_KEYS'teki
// 3 lifecycle key ile birebir eşleşmeli.
export const LIFECYCLE_INLINE_DEFAULTS: Record<
  string,
  Record<MailLocale, Record<string, string>>
> = {
  'qr-not-downloaded': QR_NOT_DOWNLOADED_DEFAULTS,
  'first-feedback-tips': FIRST_FEEDBACK_TIPS_DEFAULTS,
  'upgrade-suggestion': UPGRADE_SUGGESTION_DEFAULTS,
};
