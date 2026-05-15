// Stage 119 §38.199 — Customer campaign template seed catalog.
//
// 10 sectors × 3 categories × 2 locales = 60 rows. Stable `key` pattern:
// `${sector}.${category}.${locale}` (e.g. `food.reactivation.tr`).
// Shared between the seed runner (`scripts/seed-customer-campaign-templates.ts`)
// and the owner-side empty-state fallback (returned by GET endpoint when DB
// is empty — keeps the picker usable even on a fresh dev DB).
//
// Compliance discipline (CLAUDE.md §19.1.1 + §35.8 + §35.9):
// - No "filter / leak / X kat" review-gating wording.
// - No fictitious metrics ("4.9★ 2400 customer" guarantee claims).
// - Customer agency framing — every campaign is opt-in / preference-driven,
//   never paternalistic ("you must rate us 5★").
// - Cohort framing OK when sourced ("Buaze müşteri kohortu") but seeds avoid
//   absolute metric promises.

import type { SectorKey } from '@/lib/sector-platforms';

export type CampaignTemplateCategory = 'reactivation' | 'special-offer' | 'feedback-request';

export type CampaignTemplateSeed = {
  key: string;
  sector: SectorKey;
  locale: 'tr' | 'en';
  category: CampaignTemplateCategory;
  title: string;
  description: string;
  subject: string;
  body: string;
};

// Helper: build TR + EN pair for one sector × category.
function pair(
  sector: SectorKey,
  category: CampaignTemplateCategory,
  tr: { title: string; description: string; subject: string; body: string },
  en: { title: string; description: string; subject: string; body: string },
): CampaignTemplateSeed[] {
  return [
    {
      key: `${sector}.${category}.tr`,
      sector,
      locale: 'tr',
      category,
      ...tr,
    },
    {
      key: `${sector}.${category}.en`,
      sector,
      locale: 'en',
      category,
      ...en,
    },
  ];
}

export const CAMPAIGN_TEMPLATE_SEEDS: CampaignTemplateSeed[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // FOOD (restoran, kafe, bistro)
  // ─────────────────────────────────────────────────────────────────────────
  ...pair(
    'food',
    'reactivation',
    {
      title: 'Geri kazanma — uzaktaki müşteri',
      description: 'Son ziyaretinden 30+ gün geçen müşterilere hatırlatma.',
      subject: 'Sizi özledik — yeniden masamıza bekleriz',
      body: `Merhaba,

Son ziyaretinizden bu yana biraz zaman geçti. Mutfağımızda yenilikler var ve sizi tekrar ağırlamak isteriz.

Bu hafta için size özel bir küçük jest hazırladık: ana yemek siparişinizde tatlı bizden. Rezervasyon yapmak için telefonumuzdan bize ulaşabilir ya da web sitemizden masa seçebilirsiniz.

Görüşmek üzere,
Mutfak ekibi`,
    },
    {
      title: 'Reactivation — distant customer',
      description: 'Reminder for customers whose last visit was 30+ days ago.',
      subject: 'We miss you — a table is ready when you are',
      body: `Hi,

It's been a while since we last cooked for you. We have new dishes on the menu and would love to host you again.

A small gesture for this week: dessert on us when you order a main. Call us or reserve a table on our website — we'll keep a corner for you.

See you soon,
The kitchen team`,
    },
  ),
  ...pair(
    'food',
    'special-offer',
    {
      title: 'Özel teklif — sezonluk menü',
      description: 'Yeni sezon menüsü veya kampanya duyurusu.',
      subject: 'Yeni sezon menümüz hazır — ilk denemek isteyenlere küçük bir avantaj',
      body: `Merhaba,

Yeni sezon menümüzü açıyoruz: yerel üreticilerden taze malzemeler, şefin imza yemekleri, mevsime özel tatlılar.

İlk hafta boyunca bu menüden sipariş veren misafirlerimize seçtiğiniz içeceği ikram ediyoruz. Geçerlilik: 7 gün, rezervasyon önerilir.

Afiyet olsun,
Mutfak ekibi`,
    },
    {
      title: 'Special offer — seasonal menu',
      description: 'Launch announcement for a new seasonal menu or promo.',
      subject: 'Our new seasonal menu is live — a small welcome on us',
      body: `Hi,

Our new seasonal menu is here: local producers, chef's signature plates, season-only desserts.

For the first week, your drink is on us when you order from the new menu. Valid for 7 days; we recommend a reservation.

Bon appétit,
The kitchen team`,
    },
  ),
  ...pair(
    'food',
    'feedback-request',
    {
      title: 'Geri bildirim — son ziyaret değerlendirmesi',
      description: 'Son ziyaretten sonra deneyim sorma + opsiyonel Google yorumu.',
      subject: 'Son ziyaretiniz nasıldı? Birkaç saniye ayırır mısınız',
      body: `Merhaba,

Son ziyaretiniz için teşekkür ederiz. Deneyiminizi nasıl bulduğunuzu öğrenmek bizim için kıymetli — iyi gittiyse anlatın, daha iyi olabileceği bir yer varsa öğrenelim ki düzeltelim.

Geri bildiriminizi göndermek için QR kodumuzdan veya restoranın sayfasından ulaşabilirsiniz. Düşük puan verenlerle önce biz iletişime geçeriz; yüksek puan veren misafirlerimiz isterse Google'da paylaşır — tercih her zaman sizde.

Teşekkürler,
İşletme ekibi`,
    },
    {
      title: 'Feedback — last-visit review',
      description: 'Post-visit feedback ask + optional Google review.',
      subject: 'How was your last visit? A few seconds of your time',
      body: `Hi,

Thanks for visiting us recently. We'd love to hear how it went — tell us what you liked, and if anything could be better, let us know so we can fix it.

You can share through our QR code or the restaurant page. We follow up directly with anyone who rated us low; happy customers who want to can post on Google — the choice is yours.

Thanks,
The team`,
    },
  ),

  // ─────────────────────────────────────────────────────────────────────────
  // DELIVERY (paket servis, sanal mutfak)
  // ─────────────────────────────────────────────────────────────────────────
  ...pair(
    'delivery',
    'reactivation',
    {
      title: 'Geri kazanma — sipariş vermeyen müşteri',
      description: 'Son siparişten uzun süre geçen müşterilere paket servis daveti.',
      subject: 'Mutfağımız sizi bekliyor — yeni paket menülerimiz hazır',
      body: `Merhaba,

Bir süredir sipariş alamadık sizden. Bu arada paket menülerimizi güncelledik — daha hızlı teslim, daha sıkı paketleme, mevsim yemekleri.

Bu hafta için size özel kargo ücretsiz. Mobil uygulamadan veya web sitemizden sipariş verebilirsiniz.

İyi günler,
Sipariş ekibi`,
    },
    {
      title: 'Reactivation — lapsed delivery customer',
      description: 'Delivery invite for customers with no recent order.',
      subject: 'Your kitchen is ready — fresh delivery menus, lighter packaging',
      body: `Hi,

We haven't seen an order from you in a while. We've refreshed our delivery menu, tightened packaging, and added seasonal dishes.

Free delivery this week, just for you. Order through our app or website.

Talk soon,
The delivery team`,
    },
  ),
  ...pair(
    'delivery',
    'special-offer',
    {
      title: 'Özel teklif — paket kombosu',
      description: 'Paket sipariş kombo veya çoklu ürün indirimi.',
      subject: 'Hafta sonu paketi: 2 ana yemek + içecek, tek fiyat',
      body: `Merhaba,

Hafta sonuna özel paketimiz aktif: 2 ana yemek + 2 içecek, sabit fiyat. Eve veya ofise hızlı teslimat.

Geçerlilik: Cuma 12:00 → Pazar 22:00. Uygulamadan "Hafta Sonu Paketi"ni seçmeniz yeterli.

Afiyet olsun,
Mutfak ekibi`,
    },
    {
      title: 'Special offer — combo bundle',
      description: 'Combo deal or multi-item promo for delivery orders.',
      subject: 'Weekend bundle: 2 mains + drinks, one flat price',
      body: `Hi,

Our weekend bundle is live: 2 mains + 2 drinks at a flat price. Quick delivery to home or office.

Valid Fri noon → Sun 10pm. Just pick "Weekend Bundle" in the app.

Enjoy,
The kitchen team`,
    },
  ),
  ...pair(
    'delivery',
    'feedback-request',
    {
      title: 'Geri bildirim — son sipariş değerlendirmesi',
      description: 'Paket servis sonrası kalite ve teslimat geri bildirimi.',
      subject: 'Siparişiniz elinize ulaştı mı? Birkaç saniye',
      body: `Merhaba,

Son siparişiniz için teşekkür ederiz. Yemek sıcaklığı, paketleme, teslimat hızı — nasıl gittiğini öğrenmek isteriz.

QR kodumuzdan veya sipariş sayfasından kısa bir değerlendirme bırakabilirsiniz. Düşük puan verirseniz önce biz arar, eksiği gidermeye çalışırız.

Teşekkürler,
Sipariş ekibi`,
    },
    {
      title: 'Feedback — last order review',
      description: 'Post-delivery feedback about food quality and timing.',
      subject: 'Did your order arrive right? A few seconds of your time',
      body: `Hi,

Thanks for your recent order. Food temperature, packaging, delivery time — we'd love to know how it went.

You can leave a quick review via our QR code or order page. If you rate us low, we'll reach out first to make it right.

Thanks,
The delivery team`,
    },
  ),

  // ─────────────────────────────────────────────────────────────────────────
  // HOSPITALITY (otel, butik otel, pansiyon)
  // ─────────────────────────────────────────────────────────────────────────
  ...pair(
    'hospitality',
    'reactivation',
    {
      title: 'Geri kazanma — eski misafir daveti',
      description: 'Daha önce konaklayan misafirlere yeniden çağrı.',
      subject: 'Sizi yeniden ağırlamak isteriz — küçük bir misafir avantajı hazırladık',
      body: `Merhaba,

Bizimle konakladığınız günü hatırlıyoruz. Mevsim değişti, yeni rotalar ve odalarda küçük iyileştirmeler var.

Tekrar gelmek istediğinizde "Eski misafir" kodumuzu kullanarak %15 indirimden faydalanabilirsiniz. Rezervasyon doğrudan bizim sitemizden — daha esnek iptal koşulları orada geçerli.

Sizi yeniden ağırlamak için sabırsızlanıyoruz,
Resepsiyon`,
    },
    {
      title: 'Reactivation — returning-guest invite',
      description: 'Invite past guests back with a small perk.',
      subject: 'Your room is waiting — a returning-guest perk just for you',
      body: `Hi,

We still remember your stay with us. The season has shifted, new walking routes are nearby, and the rooms have been gently refreshed.

When you're ready to return, use our "Returning Guest" code for 15% off. Book directly through our site — flexible cancellation lives there.

We'd love to host you again,
The front desk`,
    },
  ),
  ...pair(
    'hospitality',
    'special-offer',
    {
      title: 'Özel teklif — sezon dışı kampanya',
      description: 'Düşük sezon veya hafta içi konaklama indirimi.',
      subject: 'Hafta içi sessizlik — %20 daha uygun konaklama',
      body: `Merhaba,

Hafta içi gelmek isteyenlere küçük bir avantajımız var: Pazartesi → Perşembe konaklamalarında %20 indirim, kahvaltı dahil.

Geçerlilik: bu ay sonuna kadar, müsaitlik dahilinde. Web sitemizden veya bizi arayarak rezervasyon yapabilirsiniz.

Görüşmek üzere,
Resepsiyon`,
    },
    {
      title: 'Special offer — off-peak stay',
      description: 'Discount for off-peak / weekday stays.',
      subject: 'Quiet weekdays, 20% lighter rate',
      body: `Hi,

For midweek travellers: Mon → Thu stays come with 20% off and breakfast included.

Valid through the end of this month, subject to availability. Book on our site or give us a ring.

See you soon,
The front desk`,
    },
  ),
  ...pair(
    'hospitality',
    'feedback-request',
    {
      title: 'Geri bildirim — konaklama sonrası',
      description: 'Check-out sonrası deneyim sorma + opsiyonel platform yorumu.',
      subject: 'Konaklamanız nasıldı? Birkaç dakikanızı rica ederiz',
      body: `Merhaba,

Bizi seçtiğiniz için teşekkür ederiz. Oda konforu, kahvaltı, ekibimiz — nasıl gittiğini öğrenmek istiyoruz.

Geri bildiriminizi QR kodumuzdan paylaşabilirsiniz. Düşük puan verenlerle önce biz iletişime geçeriz; deneyiminizi paylaşmak isteyenler Booking veya Tripadvisor'da yorum yazabilir — tercih sizin.

Teşekkürler,
İşletme ekibi`,
    },
    {
      title: 'Feedback — post-stay review',
      description: 'Post-checkout experience survey + optional platform review.',
      subject: 'How was your stay? A few minutes of your time',
      body: `Hi,

Thanks for choosing us. Room comfort, breakfast, our team — we'd love to know how it went.

Share your feedback via our QR code. We follow up directly with lower scores; guests who want to can leave a public review on Booking or Tripadvisor — your choice.

Thanks,
The team`,
    },
  ),

  // ─────────────────────────────────────────────────────────────────────────
  // CLINIC (klinik, diş hekimi, doktor, veteriner)
  // ─────────────────────────────────────────────────────────────────────────
  ...pair(
    'clinic',
    'reactivation',
    {
      title: 'Geri kazanma — kontrol hatırlatması',
      description: 'Son kontrolden uzun süre geçen hastalara hatırlatma.',
      subject: 'Rutin kontrol için zaman gelmiş olabilir',
      body: `Merhaba,

Son ziyaretinizden bu yana belirli bir süre geçti. Rutin kontrol takvimi açısından bakıldığında yeniden uğramanızın zamanı yaklaşmış olabilir.

Randevu için bize telefondan veya web sitemizden ulaşabilirsiniz. Aciliyetiniz varsa lütfen doğrudan arayın.

Sağlıklı günler,
Klinik ekibi`,
    },
    {
      title: 'Reactivation — check-up reminder',
      description: 'Reminder for patients overdue for a routine visit.',
      subject: 'Time for your routine check-up may have arrived',
      body: `Hi,

It's been a little while since your last visit. Looking at your routine schedule, a check-up may be due soon.

Book through our website or call us. If your case is urgent, please reach us directly by phone.

Stay well,
The clinic team`,
    },
  ),
  ...pair(
    'clinic',
    'special-offer',
    {
      title: 'Özel teklif — paket muayene',
      description: 'Paket muayene veya yıllık check-up duyurusu.',
      subject: 'Yıllık check-up paketimiz: tek randevu, kapsamlı kontrol',
      body: `Merhaba,

Yıllık check-up paketimiz açıldı: tek randevuda kapsamlı muayene + temel tetkikler + sonuç değerlendirme. Süreç ortalama 45 dakika.

Paket içeriği ve uygunluk için web sitemizden veya bizi arayarak ayrıntı alabilirsiniz.

Sağlıklı günler,
Klinik ekibi`,
    },
    {
      title: 'Special offer — bundled check-up',
      description: 'Annual check-up bundle or themed clinic package.',
      subject: 'Annual check-up bundle: one visit, full review',
      body: `Hi,

Our annual check-up bundle is open: comprehensive exam + core tests + result review in a single visit. Typical duration: 45 minutes.

For full contents and eligibility, see our website or give us a call.

Stay well,
The clinic team`,
    },
  ),
  ...pair(
    'clinic',
    'feedback-request',
    {
      title: 'Geri bildirim — muayene sonrası',
      description: 'Muayene sonrası ekip ve süreç geri bildirimi.',
      subject: 'Muayeneniz nasıl geçti? Kısa bir geri bildirim',
      body: `Merhaba,

Bizi tercih ettiğiniz için teşekkür ederiz. Randevu süreci, bekleme alanı, ekip iletişimi — nasıl gittiğini öğrenmek istiyoruz.

QR kodumuzdan birkaç saniyede paylaşabilirsiniz. Düşük puan verirseniz önce biz arar, süreci iyileştiririz. Yorum yazmak isteyen hastalarımız Google'da paylaşır — tercih sizin.

Sağlıklı günler,
Klinik ekibi`,
    },
    {
      title: 'Feedback — post-visit review',
      description: 'Post-appointment feedback on team and process.',
      subject: 'How was your visit? A quick share',
      body: `Hi,

Thank you for choosing us. Booking, wait area, team communication — we'd love to know how it went.

A few seconds through our QR code is enough. If you rate us low, we'll follow up first to improve. Patients who want to can post on Google — your choice.

Stay well,
The clinic team`,
    },
  ),

  // ─────────────────────────────────────────────────────────────────────────
  // LEGAL (hukuk bürosu, danışmanlık)
  // ─────────────────────────────────────────────────────────────────────────
  ...pair(
    'legal',
    'reactivation',
    {
      title: 'Yıllık güncelleme — eski müvekkil',
      description: 'Geçmiş müvekkillere düzenli iletişim mesajı.',
      subject: 'Yıllık hukuki güncelleme — özet ve değişen düzenlemeler',
      body: `Sayın müvekkilimiz,

Birlikte çalıştığımız konularla ilgili bu yılın özet güncellemesi aşağıda. Eğer durumunuzu etkileyebilecek yeni bir düzenleme varsa size özel notla geri döneceğiz.

Soru veya gelişen bir konu için her zaman ulaşabilirsiniz. Acil hallerde ofisi doğrudan arayabilirsiniz.

Saygılarımızla,
Hukuk büromuz`,
    },
    {
      title: 'Annual update — past client',
      description: 'Periodic check-in for previous clients.',
      subject: 'Annual legal update — summary and regulatory shifts',
      body: `Dear client,

A short annual summary of the matters we worked on together is below. If any new regulation could affect your case, we'll follow up directly with a tailored note.

For any question or new development, we're always reachable. Call the office directly for urgent matters.

Best regards,
The firm`,
    },
  ),
  ...pair(
    'legal',
    'special-offer',
    {
      title: 'Bilgilendirme — yeni hizmet alanı',
      description: 'Yeni uzmanlık veya ücretsiz ön görüşme duyurusu.',
      subject: 'Yeni hizmet alanımız hazır — ücretsiz ön değerlendirme',
      body: `Sayın müvekkilimiz,

Hukuk büromuz [hizmet alanı] konusunda hizmet vermeye başladı. İlgili konuda durumu olan ya da bilgi almak isteyen müvekkillerimize tek seferlik ücretsiz ön değerlendirme sunuyoruz.

Detaylar için web sitemizden randevu alabilir ya da ofisi arayabilirsiniz.

Saygılarımızla,
Hukuk büromuz`,
    },
    {
      title: 'New practice area — free initial consultation',
      description: 'Announcement of a new legal specialty or free initial review.',
      subject: 'Our new practice area is open — free initial assessment',
      body: `Dear client,

Our firm has expanded into [practice area]. For clients facing a matter in this field or considering one, we offer a single complimentary initial assessment.

Book through our website or call the office for details.

Best regards,
The firm`,
    },
  ),
  ...pair(
    'legal',
    'feedback-request',
    {
      title: 'Geri bildirim — danışmanlık sonrası',
      description: 'Dosya kapanışı sonrası süreç ve iletişim geri bildirimi.',
      subject: 'Birlikte yürüttüğümüz süreç hakkında kısa bir not alabilir miyiz',
      body: `Sayın müvekkilimiz,

Birlikte yürüttüğümüz dosya tamamlandı. Süreç boyunca iletişim, ekip yaklaşımı, sonuç açıklığı — geri bildiriminiz büromuzun kalitesi için kıymetli.

QR kodumuzdan kısa bir değerlendirme bırakabilirsiniz. Düşük puan verirseniz doğrudan ulaşır, eksik kalan noktayı netleştiririz.

Saygılarımızla,
Hukuk büromuz`,
    },
    {
      title: 'Feedback — post-engagement review',
      description: 'Post-matter review on process and communication.',
      subject: 'A short note about the matter we worked through',
      body: `Dear client,

The matter we worked through is now closed. Communication, team approach, clarity of outcome — your feedback shapes how we practise.

A short review through our QR code is enough. If you rate us low, we'll reach out directly to address it.

Best regards,
The firm`,
    },
  ),

  // ─────────────────────────────────────────────────────────────────────────
  // SPA (spa, güzellik merkezi, masaj)
  // ─────────────────────────────────────────────────────────────────────────
  ...pair(
    'spa',
    'reactivation',
    {
      title: 'Geri kazanma — geri dönüş daveti',
      description: 'Bir süredir gelmeyen müşterilere küçük teşvik.',
      subject: 'Kendinize zaman ayırmaya geri dönmenin tam zamanı',
      body: `Merhaba,

Son ziyaretinizden bu yana biraz zaman geçti. Yeniden gelmek istediğinizde sizin için küçük bir avantaj hazırladık: ilk masaj seansınızda %15 indirim, geçerlilik 14 gün.

Randevu için web sitemizden veya bizi arayarak ulaşabilirsiniz.

Görüşmek üzere,
Spa ekibi`,
    },
    {
      title: 'Reactivation — comeback invite',
      description: "Small perk for customers who haven't visited recently.",
      subject: 'Time to come back to yourself',
      body: `Hi,

It's been a while since your last visit. A small welcome back: 15% off your first massage session, valid for 14 days.

Book through our website or give us a call.

See you soon,
The spa team`,
    },
  ),
  ...pair(
    'spa',
    'special-offer',
    {
      title: 'Özel teklif — paket seans',
      description: 'Çoklu seans veya cilt bakımı paketi duyurusu.',
      subject: 'Beş seans paketi: tek seansla aynı esneklik, daha avantajlı',
      body: `Merhaba,

5 seanslık paket avantajımız aktif: aynı esnek randevu, daha uygun toplam fiyat. Süresi 6 ay, hediye olarak da kullanılabilir.

Detaylar ve rezervasyon için web sitemizden veya bizi arayarak ulaşabilirsiniz.

Görüşmek üzere,
Spa ekibi`,
    },
    {
      title: 'Special offer — session bundle',
      description: 'Multi-session bundle or skin-care package offer.',
      subject: 'Five-session bundle: same flexibility, better value',
      body: `Hi,

Our 5-session bundle is open: same flexible scheduling, better total price. Valid for 6 months, giftable.

Details and booking on our website, or call us.

See you soon,
The spa team`,
    },
  ),
  ...pair(
    'spa',
    'feedback-request',
    {
      title: 'Geri bildirim — seans sonrası',
      description: 'Seans sonrası terapist ve ortam değerlendirmesi.',
      subject: 'Seansınız nasıldı? Birkaç saniyenizi rica ederiz',
      body: `Merhaba,

Son seansınız için teşekkür ederiz. Terapist iletişimi, ortam sıcaklığı, randevu süreci — geri bildiriminiz spa kalitemizi şekillendiriyor.

QR kodumuzdan kısa bir not bırakabilirsiniz. Düşük puan verirseniz biz size ulaşır ve eksiği gideririz.

Görüşmek üzere,
Spa ekibi`,
    },
    {
      title: 'Feedback — post-session review',
      description: 'Post-session feedback on therapist and ambience.',
      subject: 'How was your session? A quick note',
      body: `Hi,

Thanks for your recent session. Therapist communication, room comfort, booking flow — your feedback shapes how we work.

A short note through our QR code is enough. If you rate us low, we'll reach out first to make it right.

See you soon,
The spa team`,
    },
  ),

  // ─────────────────────────────────────────────────────────────────────────
  // RETAIL (mağaza, butik)
  // ─────────────────────────────────────────────────────────────────────────
  ...pair(
    'retail',
    'reactivation',
    {
      title: 'Geri kazanma — uzak müşteri',
      description: 'Uzun süredir alışveriş yapmamış müşterileri çağırmak.',
      subject: 'Yeni sezonu sizinle açıyoruz — küçük bir hoşgeldin avantajı',
      body: `Merhaba,

Bir süredir mağazamıza uğramadınız. Yeni sezonu açıyoruz; vitrindeki ilk seçkiyi sizinle paylaşmak isteriz.

İlk alışverişinizde %10 indirim kodumuz: HOSGELDIN10. Hem mağaza hem online geçerli, son tarih: bu ay sonu.

Görüşmek üzere,
Mağaza ekibi`,
    },
    {
      title: 'Reactivation — lapsed shopper',
      description: 'Welcome back invite for customers absent for a while.',
      subject: 'New season is open — a small welcome on us',
      body: `Hi,

It's been a while since your last visit. We're opening the new season and would love to show you the first picks.

10% off your next purchase with code WELCOME10. Valid in-store and online, ends this month.

See you soon,
The store team`,
    },
  ),
  ...pair(
    'retail',
    'special-offer',
    {
      title: 'Özel teklif — sezon kampanyası',
      description: 'Sezon değişimi veya özel günler için kampanya duyurusu.',
      subject: 'Sezon değişiyor — seçkimizde %25 avantaj başlıyor',
      body: `Merhaba,

Yeni sezon ürünleri rafa girdi, geçen sezonu son şansta uğurluyoruz: seçili ürünlerde %25 avantaj.

Geçerlilik: bu hafta sonu dahil, stoklarla sınırlı. Mağazada ve online aynı kampanya.

Görüşmek üzere,
Mağaza ekibi`,
    },
    {
      title: 'Special offer — season clearance',
      description: 'Seasonal sale or themed promo announcement.',
      subject: 'New season is in — last-call 25% on selected pieces',
      body: `Hi,

New season pieces are out and last-season favourites get one last call: 25% off selected items.

Valid through this weekend, while stocks last. Same offer in-store and online.

See you soon,
The store team`,
    },
  ),
  ...pair(
    'retail',
    'feedback-request',
    {
      title: 'Geri bildirim — son alışveriş',
      description: 'Alışveriş sonrası ürün ve mağaza deneyimi geri bildirimi.',
      subject: 'Son alışverişiniz beklediğiniz gibi miydi',
      body: `Merhaba,

Son alışverişiniz için teşekkür ederiz. Ürün kalitesi, kasa süreci, ekibin yaklaşımı — geri bildiriminiz hizmetimizi şekillendiriyor.

QR kodumuzdan kısa bir not bırakabilirsiniz. Düşük puan verirseniz önce biz ulaşır, çözmeye çalışırız.

Görüşmek üzere,
Mağaza ekibi`,
    },
    {
      title: 'Feedback — post-purchase review',
      description: 'Post-shopping review on product and store experience.',
      subject: 'Was your last visit what you hoped',
      body: `Hi,

Thanks for shopping with us. Product quality, checkout flow, team approach — your feedback shapes our service.

A short note through our QR code is enough. If you rate us low, we'll reach out first to make it right.

See you soon,
The store team`,
    },
  ),

  // ─────────────────────────────────────────────────────────────────────────
  // FITNESS (spor salonu, stüdyo)
  // ─────────────────────────────────────────────────────────────────────────
  ...pair(
    'fitness',
    'reactivation',
    {
      title: 'Geri kazanma — antrenmana dönüş',
      description: 'Bir süredir gelmeyen üyelere yeniden çağrı.',
      subject: 'Antrenmana dönmek için iyi bir hafta — sizi bekliyoruz',
      body: `Merhaba,

Son antrenmanınızdan bu yana biraz zaman geçti. Programınıza dönmek için iyi bir hafta — yeni grup dersleri, güncel hocalar.

İlk haftanız için ücretsiz tanıtım dersi hediye. Web sitemizden ders seçebilir ya da resepsiyondan ayrıntı alabilirsiniz.

Görüşmek üzere,
Stüdyo ekibi`,
    },
    {
      title: 'Reactivation — back to training',
      description: 'Return invite for members who have lapsed.',
      subject: 'A good week to step back in — we kept your spot',
      body: `Hi,

It's been a little while since your last session. This is a good week to step back into your routine — new group classes, refreshed coaches.

A free intro class is on us for your first week back. Pick a class on our site or ask the front desk.

See you soon,
The studio team`,
    },
  ),
  ...pair(
    'fitness',
    'special-offer',
    {
      title: 'Özel teklif — paket üyelik',
      description: 'Sezonluk üyelik veya çoklu ders paketi duyurusu.',
      subject: 'Bu sezona özel: 10 ders paketi tek fiyat',
      body: `Merhaba,

Sezona özel 10 ders paketimiz aktif: aynı esnek randevu, daha avantajlı toplam fiyat. Süresi 4 ay.

Detay ve kayıt için resepsiyondan veya web sitemizden ulaşabilirsiniz.

Görüşmek üzere,
Stüdyo ekibi`,
    },
    {
      title: 'Special offer — class pack',
      description: 'Seasonal membership or multi-class pack promo.',
      subject: 'Seasonal pack: 10 classes, one flat price',
      body: `Hi,

Our seasonal 10-class pack is open: same flexible booking, better total. Valid for 4 months.

Front desk or our website for details and signup.

See you soon,
The studio team`,
    },
  ),
  ...pair(
    'fitness',
    'feedback-request',
    {
      title: 'Geri bildirim — antrenman sonrası',
      description: 'Ders veya kişisel antrenman sonrası geri bildirim.',
      subject: 'Son antrenmanınız nasıldı? Birkaç saniye',
      body: `Merhaba,

Son antrenmanınız için teşekkür ederiz. Eğitmen iletişimi, ekipman durumu, salon ortamı — geri bildiriminiz hizmetimizi şekillendiriyor.

QR kodumuzdan kısa bir not bırakabilirsiniz. Düşük puan verirseniz önce biz ulaşır.

Görüşmek üzere,
Stüdyo ekibi`,
    },
    {
      title: 'Feedback — post-training review',
      description: 'Post-class or PT feedback on coach and facility.',
      subject: 'How was your last session? A quick share',
      body: `Hi,

Thanks for training with us. Coach, equipment, atmosphere — your feedback shapes the studio.

A short note through our QR code is enough. If you rate us low, we'll reach out first.

See you soon,
The studio team`,
    },
  ),

  // ─────────────────────────────────────────────────────────────────────────
  // EDUCATION (dil okulu, etüt, özel ders)
  // ─────────────────────────────────────────────────────────────────────────
  ...pair(
    'education',
    'reactivation',
    {
      title: 'Geri kazanma — yeni dönem çağrısı',
      description: 'Önceki öğrencilere yeni dönem hatırlatması.',
      subject: 'Yeni dönem açılıyor — kaldığınız yerden devam',
      body: `Merhaba,

Yeni dönemimiz açılıyor. Daha önce bizimle çalıştığınız programa devam etmek isterseniz seçenekleri ve ücretsiz tanıtım dersini hatırlatmak istedik.

Detay için web sitemizden veya bizi arayarak ulaşabilirsiniz.

İyi günler,
Eğitim ekibi`,
    },
    {
      title: 'Reactivation — new term invite',
      description: 'New-term reminder for prior students.',
      subject: 'New term is open — pick up where you left off',
      body: `Hi,

Our new term is starting. If you want to continue the program we worked on, we'd love to walk you through options and offer a free intro class.

Reach us via our website or by phone for details.

Have a good day,
The academy team`,
    },
  ),
  ...pair(
    'education',
    'special-offer',
    {
      title: 'Özel teklif — kayıt avantajı',
      description: 'Erken kayıt veya çoklu kurs indirimi duyurusu.',
      subject: 'Erken kayıt avantajı — bu hafta sonuna kadar',
      body: `Merhaba,

Erken kayıt avantajımız aktif: yeni dönem kurslarına bu hafta sonuna kadar kayıt yaptıranlara %15 indirim. Ders programları ve kontenjan için web sitemizi inceleyebilirsiniz.

Sorularınız için bizi arayabilir veya yanıt verebilirsiniz.

İyi günler,
Eğitim ekibi`,
    },
    {
      title: 'Special offer — early enrolment',
      description: 'Early-bird discount or multi-course promo.',
      subject: 'Early enrolment — through this weekend',
      body: `Hi,

Our early enrolment window is open: 15% off new-term courses if you sign up before this weekend. Schedules and seats on our website.

For questions, reach out or reply to this message.

Have a good day,
The academy team`,
    },
  ),
  ...pair(
    'education',
    'feedback-request',
    {
      title: 'Geri bildirim — kurs sonrası',
      description: 'Kurs veya dönem sonu eğitmen ve içerik geri bildirimi.',
      subject: 'Dönemimiz nasıl geçti? Kısa bir geri bildirim',
      body: `Merhaba,

Dönemi birlikte tamamladık. Eğitmen iletişimi, müfredat akışı, materyal kalitesi — geri bildiriminiz dönemleri iyileştirmemize yardımcı.

QR kodumuzdan kısa bir not bırakabilirsiniz. Düşük puan verirseniz önce biz ulaşır.

Teşekkürler,
Eğitim ekibi`,
    },
    {
      title: 'Feedback — end-of-course review',
      description: 'End-of-term feedback on instructor and content.',
      subject: 'How did the term go? A quick share',
      body: `Hi,

We've wrapped the term together. Instructor, curriculum flow, materials — your feedback helps us shape future terms.

A short note via our QR code is enough. If you rate us low, we'll follow up first.

Thanks,
The academy team`,
    },
  ),

  // ─────────────────────────────────────────────────────────────────────────
  // OTHER (genel — diğer sektörler için generic)
  // ─────────────────────────────────────────────────────────────────────────
  ...pair(
    'other',
    'reactivation',
    {
      title: 'Geri kazanma — yeniden iletişim',
      description: 'Sektörden bağımsız genel geri kazanma şablonu.',
      subject: 'Sizi yeniden ağırlamak isteriz',
      body: `Merhaba,

Bir süredir görüşemedik. Yeniden ulaştığımızda hizmetimizdeki yeniliklerden de bahsedebiliriz.

Size uygun bir zaman olursa lütfen yanıt verin ya da bizi arayın.

Görüşmek üzere,
İşletme ekibi`,
    },
    {
      title: 'Reactivation — get back in touch',
      description: 'Generic reactivation template for any sector.',
      subject: 'We would love to welcome you back',
      body: `Hi,

It's been a while since we connected. When we talk next, we can share what's new on our end too.

If a time works for you, just reply or give us a call.

Talk soon,
The team`,
    },
  ),
  ...pair(
    'other',
    'special-offer',
    {
      title: 'Özel teklif — duyuru',
      description: 'Sektörden bağımsız özel teklif şablonu.',
      subject: 'Size özel bir teklifimiz var',
      body: `Merhaba,

Bu hafta için size özel bir teklifimiz var: [TEKLİF BURAYA — örn. %15 indirim, ücretsiz değerlendirme].

Detaylar için web sitemizden veya bize doğrudan ulaşarak bilgi alabilirsiniz.

İyi günler,
İşletme ekibi`,
    },
    {
      title: 'Special offer — announcement',
      description: 'Generic special-offer template for any sector.',
      subject: 'A short offer just for you',
      body: `Hi,

We have something for you this week: [OFFER HERE — e.g. 15% off, complimentary review].

For details, see our website or reach us directly.

Have a good day,
The team`,
    },
  ),
  ...pair(
    'other',
    'feedback-request',
    {
      title: 'Geri bildirim — genel',
      description: 'Sektörden bağımsız geri bildirim isteme şablonu.',
      subject: 'Deneyiminiz nasıldı? Birkaç saniye',
      body: `Merhaba,

Bizi tercih ettiğiniz için teşekkür ederiz. Deneyiminizin nasıl gittiğini öğrenmek isteriz — iyi gittiyse anlatın, daha iyi olabileceği bir yer varsa öğrenelim ki düzeltelim.

QR kodumuzdan birkaç saniyede paylaşabilirsiniz. Düşük puan verenlerle önce biz iletişime geçeriz.

Teşekkürler,
İşletme ekibi`,
    },
    {
      title: 'Feedback — general',
      description: 'Generic feedback-request template for any sector.',
      subject: 'How did it go? A few seconds of your time',
      body: `Hi,

Thanks for choosing us. We'd love to hear how it went — tell us what worked, and if anything could be better, let us know so we can fix it.

Share through our QR code in a few seconds. We follow up directly with anyone who rated us low.

Thanks,
The team`,
    },
  ),
];

// Category labels used in admin + owner UI. Single source for TR/EN parity.
export const CAMPAIGN_TEMPLATE_CATEGORY_LABELS: Record<
  CampaignTemplateCategory | 'custom',
  { tr: string; en: string }
> = {
  reactivation: { tr: 'Geri kazanma', en: 'Reactivation' },
  'special-offer': { tr: 'Özel teklif', en: 'Special offer' },
  'feedback-request': { tr: 'Geri bildirim', en: 'Feedback' },
  custom: { tr: 'Özel', en: 'Custom' },
};
