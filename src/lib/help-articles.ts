import type { Locale } from '@/lib/translations';

export interface StaticHelpArticle {
  id: string;
  slug: string;
  locale: Locale;
  category: string;
  title: string;
  excerpt: string;
  body: string;
  searchTags: string[];
  isPublished: true;
  order: number;
  updatedAt: Date;
}

type BodySection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

type BodyInput = {
  lead: string;
  sections: BodySection[];
  checklist: string[];
  faq: { q: string; a: string }[];
};

const UPDATED_AT = new Date('2026-04-26T09:00:00.000Z');

function renderBody(input: BodyInput) {
  const sections = input.sections
    .map((section) => {
      const paragraphs = (section.paragraphs ?? []).map((p) => `<p>${p}</p>`).join('');
      const items = section.items?.length
        ? `<ul>${section.items.map((item) => `<li>${item}</li>`).join('')}</ul>`
        : '';
      return `<h2>${section.title}</h2>${paragraphs}${items}`;
    })
    .join('');

  return [
    `<p>${input.lead}</p>`,
    sections,
    `<h2>Kontrol listesi / Checklist</h2><ul>${input.checklist.map((item) => `<li>${item}</li>`).join('')}</ul>`,
    `<h2>SSS / FAQ</h2>${input.faq.map((item) => `<h3>${item.q}</h3><p>${item.a}</p>`).join('')}`,
  ].join('');
}

function article(
  locale: Locale,
  category: string,
  order: number,
  slug: string,
  title: string,
  excerpt: string,
  tags: string[],
  body: BodyInput,
): StaticHelpArticle {
  return {
    id: `static-${locale}-${slug}`,
    slug,
    locale,
    category,
    title,
    excerpt,
    body: renderBody(body),
    searchTags: tags.map((tag) => tag.toLowerCase()),
    isPublished: true,
    order,
    updatedAt: UPDATED_AT,
  };
}

export const STATIC_HELP_ARTICLES: StaticHelpArticle[] = [
  article('tr', 'getting-started', 10, 'quick-start', 'Buaze hesabınızı 5 dakikada yayına alma', 'İlk hesabınızı oluşturun, işletmenizi tanımlayın ve QR geri bildirim akışını canlıya alın.', ['kurulum', 'başlangıç', 'hesap', 'qr'], {
    lead: 'Buaze kurulumu teknik ekip gerektirmeden tamamlanacak şekilde tasarlanmıştır. Amaç, müşterinin QR kodu okuttuğu andan işletme panelinde ölçülebilir geri bildirim görmeye başladığınız ana kadar olan yolu sade tutmaktır.',
    sections: [
      { title: '1. Hesap ve işletme bilgileri', paragraphs: ['Kayıt olduktan sonra işletme adı, kategori, adres, telefon ve bildirim e-postasını girin. Bu bilgiler hem panelde raporların doğru ayrışmasını sağlar hem de müşteri ekranında güven veren bir kimlik oluşturur.'] },
      { title: '2. Platform bağlantıları', paragraphs: ['Google yorum bağlantısı veya Place ID, Yemeksepeti, Getir ve Trendyol GO bağlantıları işletme profilinde tutulur. Yüksek puan veren müşteri uygun platforma yönlendirilir; düşük puan veren müşteri ise önce işletme içi çözüm formuna alınır.'] },
      { title: '3. İlk test', items: ['QR sayfasını telefondan açın.', '5 yıldız verip platform yönlendirmesini kontrol edin.', '2 veya 3 yıldız verip dahili formun açıldığını doğrulayın.', 'Panelde kaydın doğru restoran, masa ve platformla geldiğini kontrol edin.'] },
    ],
    checklist: ['İşletme adı ve slug doğru.', 'Bildirim e-postası aktif.', 'Google yorum linki veya Place ID girildi.', 'En az bir QR kod test edildi.', 'Panelde yeni geri bildirim göründü.'],
    faq: [
      { q: 'Kurulumdan sonra QR kodu değişir mi?', a: 'Restoran slug değeri değişmediği sürece genel QR bağlantısı sabit kalır. Masa veya platform parametreleri farklı QR varyasyonları üretmek için eklenebilir.' },
      { q: 'Tek hesapla birden fazla işletme yönetebilir miyim?', a: 'Evet. İşletmeler panelinden her lokasyonu ayrı restoran olarak ekleyebilir, raporları lokasyon bazında takip edebilirsiniz.' },
    ],
  }),
  article('en', 'getting-started', 10, 'quick-start', 'Launch your Buaze account in 5 minutes', 'Create your first account, set up your business and publish a working QR feedback flow.', ['setup', 'getting started', 'account', 'qr'], {
    lead: 'Buaze is designed so a business can go live without an engineering project. The goal is to move from sign-up to measurable customer feedback with the fewest possible steps.',
    sections: [
      { title: '1. Account and business profile', paragraphs: ['After signing up, add your business name, category, address, phone number and notification email. These details keep reporting clean and make the customer-facing flow feel trustworthy.'] },
      { title: '2. Review platform links', paragraphs: ['Store your Google review link or Place ID, plus Yemeksepeti, Getir and Trendyol GO URLs when relevant. High ratings can route to public platforms, while low ratings are captured privately for resolution first.'] },
      { title: '3. First test', items: ['Open the QR page on a phone.', 'Submit a 5-star rating and confirm the platform redirect.', 'Submit a 2 or 3-star rating and confirm the private form.', 'Check that the dashboard records restaurant, table and platform correctly.'] },
    ],
    checklist: ['Business name and slug are correct.', 'Notification email is active.', 'Google review link or Place ID is saved.', 'At least one QR code is tested.', 'A new feedback entry appears in the dashboard.'],
    faq: [
      { q: 'Will the QR code change after setup?', a: 'The main QR URL stays stable as long as the restaurant slug remains the same. Table and platform parameters can create additional QR variants.' },
      { q: 'Can one account manage multiple locations?', a: 'Yes. Add each location as a separate restaurant and track reporting by location.' },
    ],
  }),
  article('tr', 'getting-started', 20, 'first-restaurant-setup', 'İlk işletme profilini doğru yapılandırma', 'İşletme profilindeki alanların müşteri deneyimi, bildirimler ve raporlamayı nasıl etkilediğini öğrenin.', ['işletme', 'profil', 'restoran', 'bildirim'], {
    lead: 'İşletme profili sadece görünen bilgilerden ibaret değildir. Bu alanlar QR yönlendirmesini, düşük puan bildirimlerini, platform ayrıştırmasını ve menü sayfasının güven hissini doğrudan etkiler.',
    sections: [
      { title: 'Zorunlu alanlar', paragraphs: ['İşletme adı, slug ve aktiflik durumu geri bildirim akışının temelidir. Slug müşteri bağlantısında görünür; bu yüzden kısa, okunabilir ve marka ile uyumlu olmalıdır.'] },
      { title: 'Bildirim ve takip', paragraphs: ['Düşük puanlar için notification email alanı kritik önemdedir. Operasyon ekibinin kullandığı ortak bir adres seçmek, yanıt sürelerini kısaltır ve müşteri deneyimini toparlama şansını artırır.'] },
      { title: 'Renk ve marka hissi', paragraphs: ['Birincil renk, müşteri ekranında ve menüde kullanılabilir. Çok koyu veya düşük kontrastlı renklerden kaçının; QR ile gelen müşteri genellikle mobilde ve kısa sürede karar verir.'] },
    ],
    checklist: ['Slug kısa ve markaya uygun.', 'Telefon ve adres güncel.', 'Notification email ortak ekibe ait.', 'Google ve teslimat platform linkleri test edildi.', 'İşletme aktif durumda.'],
    faq: [
      { q: 'Slug değiştirmek SEO veya QR etkiler mi?', a: 'Evet. Eski QR kodlar eski slug ile çalışır. Slug değişikliği gerekiyorsa basılı materyaller ve paylaşılmış linkler de güncellenmelidir.' },
      { q: 'Bir işletmeyi geçici kapatabilir miyim?', a: 'Evet. Aktiflik durumunu kapatarak müşteri akışını geçici olarak durdurabilirsiniz.' },
    ],
  }),
  article('en', 'getting-started', 20, 'first-restaurant-setup', 'Configure your first business profile correctly', 'Learn how profile fields affect customer experience, notifications and reporting quality.', ['business', 'profile', 'restaurant', 'notifications'], {
    lead: 'Your business profile is more than a display card. It affects QR routing, low-rating notifications, platform attribution and the trust level of the customer-facing experience.',
    sections: [
      { title: 'Core fields', paragraphs: ['Business name, slug and active status are the foundation of the feedback flow. The slug appears in customer URLs, so keep it short, readable and aligned with the brand.'] },
      { title: 'Notifications and follow-up', paragraphs: ['The notification email is especially important for low ratings. Use a shared operational inbox so the right team can respond quickly.'] },
      { title: 'Color and brand feel', paragraphs: ['The primary color can appear in customer-facing pages and menu screens. Avoid low-contrast colors; QR visitors are usually on mobile and moving quickly.'] },
    ],
    checklist: ['Slug is short and brand-safe.', 'Phone and address are current.', 'Notification email goes to the right team.', 'Google and delivery links are tested.', 'The business is active.'],
    faq: [
      { q: 'Does changing the slug affect QR codes?', a: 'Yes. Printed QR codes and previously shared links point to the old slug, so update physical materials if you change it.' },
      { q: 'Can I temporarily disable a business?', a: 'Yes. Turning off active status pauses the public customer flow.' },
    ],
  }),

  article('tr', 'qr-codes', 10, 'qr-placement-guide', 'Masa, fiş, kapı ve paket için QR yerleşim rehberi', 'QR kodu doğru yerde göstermek tarama oranını ve kaliteli geri bildirim sayısını artırır.', ['qr', 'masa', 'fiş', 'paket', 'yerleşim'], {
    lead: 'QR kodun başarısı sadece tasarıma değil, müşterinin hangi anda onu gördüğüne bağlıdır. En iyi sonuç, müşteri deneyimi tazeyken ve aksiyon almak kolayken alınır.',
    sections: [
      { title: 'Masa QR kullanımı', paragraphs: ['Masa üzerindeki QR, servis devam ederken geri bildirim toplamaya yarar. Masa numarası parametresi kullanırsanız hangi masada sorun yaşandığını panelde ayırabilirsiniz.'] },
      { title: 'Fiş ve paket QR kullanımı', paragraphs: ['Fişteki QR ödeme sonrası memnuniyet ölçümü için uygundur. Paket QR ise teslimat deneyimini ölçer; platform parametresi eklemek hangi kanalın deneyim yarattığını gösterir.'] },
      { title: 'Tasarım ve okunabilirlik', items: ['QR çevresinde boş alan bırakın.', 'Minimum baskı boyutunu 2.5 cm altında tutmayın.', 'Kısa bir çağrı metni ekleyin: “Deneyiminizi 20 saniyede paylaşın”.', 'Lamine yüzeylerde parlama testini yapın.'] },
    ],
    checklist: ['Masa QR kodlarında table parametresi var.', 'Paket QR kodlarında kaynak veya platform ayrımı var.', 'Baskı testinde telefon QR kodu hızlı okuyor.', 'CTA metni kısa ve net.', 'QR hedefi canlı ortamı gösteriyor.'],
    faq: [
      { q: 'Aynı QR kodu her yerde kullanabilir miyim?', a: 'Kullanabilirsiniz, ancak masa, paket ve platform bazlı ölçüm istiyorsanız farklı parametreli QR kodlar daha iyi rapor verir.' },
      { q: 'QR kodun yanında logo kullanmalı mıyım?', a: 'Kullanabilirsiniz; ama QR alanının okunurluğunu bozmayın ve kontrastı koruyun.' },
    ],
  }),
  article('en', 'qr-codes', 10, 'qr-placement-guide', 'QR placement guide for tables, receipts, doors and packages', 'Place QR codes where customers are most likely to scan and leave useful feedback.', ['qr', 'table', 'receipt', 'package', 'placement'], {
    lead: 'QR performance depends not only on design, but on the moment customers see it. The strongest feedback usually comes while the experience is still fresh.',
    sections: [
      { title: 'Table QR codes', paragraphs: ['Table QRs collect feedback during the visit. Add a table parameter if you want the dashboard to show exactly where an issue happened.'] },
      { title: 'Receipt and package QR codes', paragraphs: ['Receipt QRs work well after payment. Package QRs measure delivery experience; adding platform parameters helps separate channels.'] },
      { title: 'Design and readability', items: ['Leave quiet space around the QR.', 'Avoid printing smaller than 2.5 cm.', 'Use a short call to action such as “Share your experience in 20 seconds”.', 'Test laminated surfaces for glare.'] },
    ],
    checklist: ['Table QRs include table parameters.', 'Package QRs include source or platform attribution.', 'A phone scans the printed QR quickly.', 'CTA copy is short and clear.', 'The QR points to production.'],
    faq: [
      { q: 'Can I use the same QR everywhere?', a: 'Yes, but separate parameters give better reporting for table, package and platform analysis.' },
      { q: 'Should I add a logo next to the QR?', a: 'Yes, as long as it does not reduce QR readability or contrast.' },
    ],
  }),
  article('tr', 'qr-codes', 20, 'qr-platform-table-links', 'Platform ve masa parametreleri nasıl kullanılır?', 'QR bağlantılarına table, platform ve source parametreleri ekleyerek raporları daha okunabilir hale getirin.', ['platform', 'table', 'source', 'analytics'], {
    lead: 'Parametreler, tek bir QR sisteminden farklı rapor kırılımları üretmenizi sağlar. Buaze; masa, platform ve kaynak bilgisini geri bildirim kaydına işleyerek operasyonel analiz yapmanızı kolaylaştırır.',
    sections: [
      { title: 'Temel URL yapısı', paragraphs: ['Genel format /r/restaurant-slug?table=12&platform=google şeklindedir. table fiziksel lokasyonu, platform ise yüksek puan sonrası yönlendirilecek yorum kanalını temsil eder.'] },
      { title: 'Platform değerleri', items: ['google: Google yorum bağlantısı', 'yemeksepeti: Yemeksepeti restoran sayfası', 'getir: Getir Yemek sayfası', 'trendyol_go: Trendyol GO sayfası'] },
      { title: 'Raporlama etkisi', paragraphs: ['Parametreler doğru kullanıldığında hangi masadan, hangi servis tipinden veya hangi teslimat kanalından daha çok olumlu ya da olumsuz sinyal geldiğini görebilirsiniz.'] },
    ],
    checklist: ['Parametre isimleri küçük harfle yazıldı.', 'Platform değerleri desteklenen listeyle uyumlu.', 'Masa kodları 20 karakterden kısa.', 'QR geçmişinde doğru platform görünüyor.', 'CSV exportta kaynak ayrımı okunuyor.'],
    faq: [
      { q: 'Platform parametresi yoksa ne olur?', a: 'Yüksek puan sonrası ilk uygun platform kullanılır veya kullanıcı teşekkür ekranında kalır. Raporlarda platform boş olabilir.' },
      { q: 'Masa yerine şube kullanabilir miyim?', a: 'Şube ayrı restoran olarak tanımlanmalı; table parametresi daha çok masa, alan veya kampanya kırılımı için uygundur.' },
    ],
  }),
  article('en', 'qr-codes', 20, 'qr-platform-table-links', 'How to use platform and table parameters', 'Add table, platform and source parameters to QR URLs for cleaner reporting.', ['platform', 'table', 'source', 'analytics'], {
    lead: 'Parameters let one QR system produce multiple reporting views. Buaze stores table, platform and source details on feedback records so teams can analyze operations more precisely.',
    sections: [
      { title: 'Basic URL structure', paragraphs: ['A typical URL looks like /r/restaurant-slug?table=12&platform=google. The table parameter identifies a physical spot, while platform controls the public review destination after a high rating.'] },
      { title: 'Supported platform values', items: ['google: Google review link', 'yemeksepeti: Yemeksepeti restaurant page', 'getir: Getir Food page', 'trendyol_go: Trendyol GO page'] },
      { title: 'Reporting impact', paragraphs: ['When parameters are used consistently, you can see which tables, service types or delivery channels generate the strongest positive or negative signals.'] },
    ],
    checklist: ['Parameter names are lowercase.', 'Platform values match the supported list.', 'Table identifiers are shorter than 20 characters.', 'QR history shows the correct platform.', 'CSV exports include source separation.'],
    faq: [
      { q: 'What if the platform parameter is missing?', a: 'Buaze uses the first available platform after a high rating, or shows a thank-you state. Platform reporting may stay empty.' },
      { q: 'Can I use table for branch names?', a: 'Branches should usually be separate restaurants; table is better for table, area or campaign-level attribution.' },
    ],
  }),

  article('tr', 'review-management', 10, 'handle-negative-feedback', 'Düşük puanları müşteri kaybetmeden yönetme', '1-3 yıldız geri bildirimlerde doğru yanıt, atama ve takip akışını kurun.', ['negatif yorum', 'düşük puan', 'yanıt', 'müşteri memnuniyeti'], {
    lead: 'Düşük puan, doğru ele alındığında yalnızca bir risk değil, müşteriyi geri kazanma fırsatıdır. Buaze’nin amacı olumsuz sinyali gizlemek değil, işletme içinde hızlı ve ölçülebilir bir çözüme dönüştürmektir.',
    sections: [
      { title: 'İlk 15 dakika', paragraphs: ['Yeni düşük puan geldiğinde önce yorumu etiketleyin: servis, yemek, teslimat, atmosfer veya fiyat algısı. Ardından sorumluyu atayın ve müşterinin iletişim izni varsa hızlı dönüş yapın.'] },
      { title: 'Yanıt dili', items: ['Savunmaya geçmeyin.', 'Deneyimi sahiplenin.', 'Somut bir çözüm adımı önerin.', 'Kişisel veriyi yorum cevabında paylaşmayın.', 'Müşteriyi tek cümleyle tekrar davet edin.'] },
      { title: 'Takip ölçümü', paragraphs: ['Haftalık raporda düşük puan nedenlerini takip edin. Aynı etiket tekrar ediyorsa tekil müşteri sorunundan çok operasyonel bir iyileştirme alanı olabilir.'] },
    ],
    checklist: ['Düşük puan bildirimi açık.', 'Sorumlu kişi atandı.', 'Yanıt taslağı kısa ve empatik.', 'Müşteriye dönüş yapıldı.', 'Benzer etiketler haftalık raporda incelendi.'],
    faq: [
      { q: 'Negatif geri bildirim Google’a gider mi?', a: 'Buaze düşük puanı önce dahili formda toplar. Google politikalarına uyum için kullanıcıyı yanıltan veya zorlayan bir akış oluşturulmamalıdır.' },
      { q: 'Her düşük puana cevap yazmalı mıyım?', a: 'Evet. Kısa bile olsa sahiplenen bir yanıt, tekrar eden müşteriler ve ekip içi öğrenme için değerlidir.' },
    ],
  }),
  article('en', 'review-management', 10, 'handle-negative-feedback', 'Manage low ratings without losing customers', 'Build a practical response, assignment and follow-up workflow for 1-3 star feedback.', ['negative feedback', 'low rating', 'reply', 'customer satisfaction'], {
    lead: 'A low rating is not only a risk; handled correctly, it is a recovery opportunity. Buaze is designed to turn negative signals into fast, measurable internal action.',
    sections: [
      { title: 'The first 15 minutes', paragraphs: ['When a low rating arrives, tag the issue first: service, food, delivery, atmosphere or price perception. Assign an owner and contact the customer if consent is available.'] },
      { title: 'Response tone', items: ['Do not become defensive.', 'Take ownership of the experience.', 'Offer a concrete next step.', 'Never expose personal data in public replies.', 'Invite the customer back in one clear sentence.'] },
      { title: 'Follow-up metrics', paragraphs: ['Review low-rating tags weekly. If the same tag keeps repeating, it may point to an operational issue rather than a one-off customer complaint.'] },
    ],
    checklist: ['Low-rating notifications are enabled.', 'An owner is assigned.', 'The response draft is short and empathetic.', 'The customer has been contacted.', 'Recurring tags are reviewed weekly.'],
    faq: [
      { q: 'Do negative submissions go to Google?', a: 'Buaze captures low ratings privately first. To stay compliant, never create misleading or coercive review flows.' },
      { q: 'Should every low rating receive a response?', a: 'Yes. Even a short ownership-based response helps customer recovery and internal learning.' },
    ],
  }),
  article('tr', 'review-management', 20, 'reply-workflow-ai', 'Buaze Pulse AI ile yanıt taslağı oluşturma', 'AI destekli yanıt önerilerini marka dilinize uygun, güvenli ve kısa cevaplara dönüştürün.', ['ai', 'yanıt önerisi', 'yorum cevabı', 'pulse'], {
    lead: 'Buaze Pulse AI, müşteri yorumuna göre hızlı bir yanıt taslağı üretir. En iyi sonuç için öneriyi doğrudan kopyalamak yerine işletmenizin dili, olayın detayı ve çözüm adımıyla birlikte son kez düzenleyin.',
    sections: [
      { title: 'Ne zaman kullanılır?', paragraphs: ['Yoğun saatlerde gelen çok sayıda yorumu ilk taslağa çevirmek için idealdir. Özellikle olumlu yorumlara teşekkür, düşük puanlara sahiplenme ve nötr yorumlara net bilgi verme süreçlerini hızlandırır.'] },
      { title: 'Düzenleme ilkeleri', items: ['Müşterinin söylediği problemi tekrar edin.', 'Varsayım yapmayın.', 'Çözüm için tek net aksiyon verin.', 'Kişisel veri yazmayın.', 'Cevabı 4-6 cümlede tutun.'] },
      { title: 'Marka tutarlılığı', paragraphs: ['Aynı restoranın yanıtları birbirinden kopuk görünmemelidir. Kibar, sade ve profesyonel bir ton seçin; aşırı kampanya dili veya savunmacı ifadelerden kaçının.'] },
    ],
    checklist: ['AI taslak insan tarafından okundu.', 'Somut çözüm adımı eklendi.', 'Kişisel veri temizlendi.', 'Ton marka diline uygun.', 'Yanıt gönderilmeden önce puan ve platform kontrol edildi.'],
    faq: [
      { q: 'AI yanıtı otomatik yayınlar mı?', a: 'Hayır. Taslak üretir; yayın veya gönderim öncesi işletme ekibinin kontrol etmesi önerilir.' },
      { q: 'Olumsuz yorumda kupon önermek doğru mu?', a: 'Her durumda değil. Önce sorunu anlayın, gerekirse özel kanaldan telafi adımı sunun.' },
    ],
  }),
  article('en', 'review-management', 20, 'reply-workflow-ai', 'Draft replies with Buaze Pulse AI', 'Turn AI-assisted suggestions into safe, concise and brand-appropriate review replies.', ['ai', 'reply suggestion', 'review response', 'pulse'], {
    lead: 'Buaze Pulse AI creates a first reply draft based on customer feedback. For best results, review the suggestion and add your brand tone, the specific context and the next action.',
    sections: [
      { title: 'When to use it', paragraphs: ['It is useful when many reviews arrive during busy hours. It speeds up thank-you replies, low-rating recovery messages and neutral informational responses.'] },
      { title: 'Editing principles', items: ['Repeat the customer’s actual issue.', 'Avoid assumptions.', 'Offer one clear next step.', 'Do not include personal data.', 'Keep the reply within 4-6 sentences.'] },
      { title: 'Brand consistency', paragraphs: ['Replies from the same business should feel connected. Choose a polite, direct and professional tone; avoid defensive wording or campaign-heavy language.'] },
    ],
    checklist: ['The AI draft was reviewed by a person.', 'A concrete next step was added.', 'Personal data was removed.', 'Tone matches the brand.', 'Rating and platform were checked before sending.'],
    faq: [
      { q: 'Does AI publish replies automatically?', a: 'No. It creates a draft; the business team should review before sending or publishing.' },
      { q: 'Should I offer coupons for negative feedback?', a: 'Not always. Understand the issue first, then offer recovery privately when appropriate.' },
    ],
  }),

  article('tr', 'integrations', 10, 'google-review-link', 'Google yorum bağlantısını doğru ekleme', 'Google Place ID veya doğrudan yorum linki ile yüksek puan yönlendirmesini güvenilir hale getirin.', ['google', 'place id', 'yorum linki', 'entegrasyon'], {
    lead: 'Google bağlantısı, yüksek puan veren müşterinin doğru işletme profiline gitmesini sağlar. Yanlış veya eski bağlantılar, iyi niyetli müşteriyi boşa düşürür ve yorum kazanma oranını azaltır.',
    sections: [
      { title: 'Place ID mi doğrudan URL mi?', paragraphs: ['Place ID kullanırsanız Buaze Google’ın write review formatında bağlantı oluşturur. Doğrudan URL kullanırsanız müşteriyi sizin verdiğiniz adrese yönlendirir. İki yöntem de çalışır; önemli olan test etmektir.'] },
      { title: 'Test adımları', items: ['QR akışında 5 yıldız seçin.', 'Yönlendirilen sayfanın doğru Google işletmesi olduğunu kontrol edin.', 'Mobil tarayıcı ve Google Maps uygulamasında deneyin.', 'Farklı şube profillerini karıştırmadığınızdan emin olun.'] },
      { title: 'Politika notu', paragraphs: ['Google yorum akışlarında müşteriyi yanıltan, yorum metni dayatan veya yalnızca olumlu yorumları seçici biçimde teşvik eden uygulamalardan kaçının. Buaze akışı geri bildirimi önce işletme deneyimini anlamak için kullanır.'] },
    ],
    checklist: ['Google sağlayıcısı etkin.', 'Place ID veya URL test edildi.', 'Şube profili doğru.', 'Yüksek puan yönlendirmesi çalışıyor.', 'Düşük puan dahili forma düşüyor.'],
    faq: [
      { q: 'Google Place ID nereden bulunur?', a: 'Google Place ID Finder veya işletme profilinizin yorum bağlantısı kullanılabilir. Emin değilseniz doğrudan çalışan yorum URL’sini ekleyin.' },
      { q: 'Birden fazla Google profili varsa ne yapmalıyım?', a: 'Her şubeyi ayrı restoran olarak tanımlayın ve ilgili Google linkini o restoran kaydına ekleyin.' },
    ],
  }),
  article('en', 'integrations', 10, 'google-review-link', 'Add your Google review link correctly', 'Use a Google Place ID or direct review URL so high-rating redirects land on the right profile.', ['google', 'place id', 'review link', 'integration'], {
    lead: 'Your Google link sends high-rating customers to the correct business profile. Broken or outdated links waste customer intent and reduce review conversion.',
    sections: [
      { title: 'Place ID or direct URL?', paragraphs: ['With a Place ID, Buaze generates the Google write-review URL. With a direct URL, Buaze redirects to the exact address you provide. Both work; testing is the important part.'] },
      { title: 'Testing steps', items: ['Select 5 stars in the QR flow.', 'Confirm the redirected page is the correct Google business.', 'Test both mobile browser and Google Maps app behavior.', 'Make sure branch profiles are not mixed.'] },
      { title: 'Policy note', paragraphs: ['Avoid misleading review flows, forced review text or selective pressure for positive reviews. Buaze uses feedback first to understand the customer experience.'] },
    ],
    checklist: ['Google provider is enabled.', 'Place ID or URL has been tested.', 'The branch profile is correct.', 'High-rating redirect works.', 'Low ratings stay in the private form.'],
    faq: [
      { q: 'Where do I find the Place ID?', a: 'You can use Google’s Place ID Finder or a working review URL from your business profile. If unsure, paste the direct review URL.' },
      { q: 'What if I have multiple Google profiles?', a: 'Create each branch as a separate restaurant and add the matching Google link to each one.' },
    ],
  }),
  article('tr', 'integrations', 20, 'delivery-platform-links', 'Yemeksepeti, Getir ve Trendyol GO linklerini yönetme', 'Teslimat platformlarından gelen yorum sinyallerini platform bazında ayrıştırın.', ['yemeksepeti', 'getir', 'trendyol', 'teslimat'], {
    lead: 'Teslimat deneyimi restoran içi deneyimden farklıdır. Platform linklerini ayrı tutmak, hangi kanalda memnuniyetin yükseldiğini veya sorunların arttığını görmenizi sağlar.',
    sections: [
      { title: 'Hangi link eklenmeli?', paragraphs: ['Müşterinin yorum bırakabileceği veya restoran sayfasını görebileceği halka açık platform URL’sini ekleyin. Kısaltılmış linkler yerine mümkünse kalıcı restoran sayfasını kullanın.'] },
      { title: 'Platform parametresi', paragraphs: ['QR URL’sinde platform=getir veya platform=trendyol_go gibi değerler kullanıldığında, yüksek puan yönlendirmesi o kanala yapılır ve raporda platform alanı dolar.'] },
      { title: 'Operasyonel okuma', items: ['Getir düşük puanları teslimat süresiyle ilişkilendirilebilir.', 'Yemeksepeti yorumları paketleme veya ürün doğruluğu için izlenebilir.', 'Trendyol GO ayrımı kampanya dönemlerinde performans takibi sağlar.'] },
    ],
    checklist: ['Her platform linki mobilde açılıyor.', 'Platform parametreleri doğru yazıldı.', 'QR geçmişinde platform kaydı var.', 'Dashboard dağılım grafiği kontrol edildi.', 'Yanlış veya eski linkler kaldırıldı.'],
    faq: [
      { q: 'Platform linki yoksa alanı boş bırakabilir miyim?', a: 'Evet. Boş platforma yönlendirme yapılmaz; diğer aktif platformlar kullanılabilir.' },
      { q: 'Teslimat QR kodunu pakete basmalı mıyım?', a: 'Evet. Paket içi veya fiş üstü QR, teslimat deneyimini restoran içinden ayırmak için en net yöntemdir.' },
    ],
  }),
  article('en', 'integrations', 20, 'delivery-platform-links', 'Manage Yemeksepeti, Getir and Trendyol GO links', 'Separate delivery feedback signals by platform and understand channel performance.', ['yemeksepeti', 'getir', 'trendyol', 'delivery'], {
    lead: 'Delivery experience is different from dine-in experience. Keeping platform links separate helps you see where satisfaction rises or problems repeat.',
    sections: [
      { title: 'Which link should I add?', paragraphs: ['Use the public platform URL where customers can view or review your restaurant. Prefer permanent restaurant pages over short links.'] },
      { title: 'Platform parameter', paragraphs: ['When a QR URL includes values like platform=getir or platform=trendyol_go, high-rating redirects use that destination and reporting stores the platform field.'] },
      { title: 'Operational reading', items: ['Getir low ratings may point to delivery time.', 'Yemeksepeti feedback can reveal packaging or order accuracy issues.', 'Trendyol GO separation helps during campaign-heavy periods.'] },
    ],
    checklist: ['Each platform link opens on mobile.', 'Platform parameters are spelled correctly.', 'QR history includes platform records.', 'Dashboard distribution was checked.', 'Old or broken links were removed.'],
    faq: [
      { q: 'Can I leave a platform empty?', a: 'Yes. Empty platforms are not used for redirects; other active platforms can still work.' },
      { q: 'Should delivery QR codes go on packaging?', a: 'Yes. Package or receipt QRs are the clearest way to separate delivery experience from dine-in.' },
    ],
  }),
];

const MORE_ARTICLES: StaticHelpArticle[] = [
  article('tr', 'team-roles', 10, 'invite-team-members', 'Ekip üyelerini davet etme ve lokasyon erişimi verme', 'Owner panelinden ekip arkadaşlarınızı davet edin ve hangi işletmeleri görebileceklerini sınırlayın.', ['ekip', 'davet', 'rol', 'lokasyon'], {
    lead: 'Ekip erişimi, her çalışanın sadece ihtiyaç duyduğu işletmeleri görmesini sağlar. Bu hem operasyonu hızlandırır hem de yanlış restoran üzerinde işlem yapılmasını önler.',
    sections: [
      { title: 'Davet akışı', paragraphs: ['Ekip sayfasından e-posta, isim ve rol seçerek davet oluşturun. Lokasyon alanı belirli restoranlarla sınırlandırılabilir; boş bırakıldığında geniş erişim vermeden önce rol politikanızı kontrol edin.'] },
      { title: 'Rol seçimi', items: ['Manager: operasyonel yönetim ve yorum takibi.', 'Staff: günlük takip ve sınırlı işlem.', 'Viewer: raporları izleme, değişiklik yapmama.', 'Owner: hesap sahibi, fatura ve ekip yönetimi.'] },
      { title: 'Güvenli kullanım', paragraphs: ['Ayrılan personelin erişimini hemen revoke edin. Düzenli olarak aktif ekip listesini ve son görülme bilgisini kontrol edin.'] },
    ],
    checklist: ['E-posta doğru yazıldı.', 'Rol iş sorumluluğuyla uyumlu.', 'Lokasyonlar sınırlandı.', 'Davet durumu kontrol edildi.', 'Ayrılan kişiler revoke edildi.'],
    faq: [
      { q: 'Bir kullanıcı birden fazla lokasyon görebilir mi?', a: 'Evet. locations alanına birden fazla restoran ID’si atanabilir.' },
      { q: 'Viewer yorum yanıtlayabilir mi?', a: 'Hayır. Viewer rolü rapor okuma ve takip için düşünülür.' },
    ],
  }),
  article('en', 'team-roles', 10, 'invite-team-members', 'Invite teammates and limit location access', 'Invite your team from the owner panel and control which businesses they can access.', ['team', 'invite', 'role', 'location'], {
    lead: 'Team access ensures each person sees only the locations they need. This speeds up operations and reduces accidental changes in the wrong business.',
    sections: [
      { title: 'Invite flow', paragraphs: ['Create an invite with email, name and role from the Team page. Location access can be limited to specific restaurants.'] },
      { title: 'Choosing a role', items: ['Manager: operational management and review follow-up.', 'Staff: daily monitoring with limited actions.', 'Viewer: reporting access without changes.', 'Owner: account, billing and team ownership.'] },
      { title: 'Safe usage', paragraphs: ['Revoke access immediately when someone leaves the team. Review active members and last seen data regularly.'] },
    ],
    checklist: ['Email address is correct.', 'Role matches responsibility.', 'Locations are limited.', 'Invite status was checked.', 'Former staff were revoked.'],
    faq: [
      { q: 'Can one user access multiple locations?', a: 'Yes. Multiple restaurant IDs can be assigned in the locations field.' },
      { q: 'Can a Viewer reply to reviews?', a: 'No. Viewer is intended for reading reports and monitoring.' },
    ],
  }),
  article('tr', 'team-roles', 20, 'role-permissions', 'Roller ve izinler nasıl planlanır?', 'Superadmin, manager, owner ve ekip rollerini karıştırmadan doğru yetki modelini kurun.', ['izinler', 'admin', 'manager', 'owner'], {
    lead: 'Buaze’de iki ayrı yetki alanı vardır: platform yöneticileri ve işletme ekibi. Bu ayrımı doğru kurmak, veri erişimi ve günlük operasyon için kritiktir.',
    sections: [
      { title: 'Platform yöneticileri', paragraphs: ['Superadmin tüm sisteme erişir. Manager ise genellikle belirli bir restorana veya operasyon alanına bağlıdır. Bu roller admin panelinde yönetilir.'] },
      { title: 'İşletme ekibi', paragraphs: ['Restaurant owner kendi hesabındaki işletmeleri yönetir. Owner panelindeki ekip üyeleri ise işletme içi görev dağılımı için kullanılır.'] },
      { title: 'En az yetki prensibi', items: ['Sadece ihtiyaç duyulan rolü verin.', 'Fatura erişimini sınırlı tutun.', 'Lokasyon erişimini mümkün olduğunca daraltın.', 'Düzenli erişim denetimi yapın.'] },
    ],
    checklist: ['Superadmin sayısı sınırlı.', 'Manager restoran kapsamı doğru.', 'Owner hesapları gerçek işletme sahiplerine ait.', 'Ekip rolleri periyodik gözden geçirildi.', 'Pasif kullanıcılar kaldırıldı.'],
    faq: [
      { q: 'Admin users ve team members aynı şey mi?', a: 'Hayır. AdminUser platform/operasyon erişimi, TeamMember ise işletme sahibinin kendi çalışma alanı ekibidir.' },
      { q: 'Bir personele fatura erişimi vermek zorunda mıyım?', a: 'Hayır. Günlük operasyon rolleri faturalandırma erişimi olmadan planlanabilir.' },
    ],
  }),
  article('en', 'team-roles', 20, 'role-permissions', 'Plan roles and permissions correctly', 'Separate superadmin, manager, owner and team roles without creating unnecessary access.', ['permissions', 'admin', 'manager', 'owner'], {
    lead: 'Buaze has two access layers: platform administrators and business teams. Keeping them separate is important for data access and daily operations.',
    sections: [
      { title: 'Platform administrators', paragraphs: ['Superadmins can access the whole system. Managers are typically scoped to a specific restaurant or operational area. These roles live in the admin panel.'] },
      { title: 'Business team', paragraphs: ['Restaurant owners manage the businesses in their account. Team members in the owner panel are used for internal task distribution.'] },
      { title: 'Least privilege', items: ['Grant only the needed role.', 'Limit billing access.', 'Keep location access narrow.', 'Review access regularly.'] },
    ],
    checklist: ['Superadmin count is limited.', 'Manager restaurant scope is correct.', 'Owner accounts belong to real business owners.', 'Team roles were reviewed.', 'Inactive users were removed.'],
    faq: [
      { q: 'Are admin users and team members the same?', a: 'No. AdminUser is platform/operations access; TeamMember belongs to an owner workspace.' },
      { q: 'Do staff need billing access?', a: 'No. Daily operations can be handled without billing permissions.' },
    ],
  }),
  article('tr', 'billing', 10, 'plans-trial-upgrade', 'Deneme süresi, plan yükseltme ve kullanım limitleri', 'Trial döneminden ücretli plana geçerken restoran, QR ve ekip ihtiyaçlarınızı değerlendirin.', ['faturalandırma', 'trial', 'plan', 'limit'], {
    lead: 'Plan seçimi sadece fiyat değil, operasyon hacmi meselesidir. Kaç lokasyon yöneteceğiniz, kaç QR kullanacağınız ve kaç kişinin panele erişeceği doğru planı belirler.',
    sections: [
      { title: 'Trial döneminde ne kontrol edilmeli?', paragraphs: ['İlk hafta QR tarama oranını, düşük puan dönüş hızını ve platform yönlendirmelerini test edin. Bu veriler plan yükseltme kararını daha sağlıklı yapar.'] },
      { title: 'Yükseltme zamanı', items: ['Birden fazla restoran ekleyecekseniz.', 'Düzenli rapor ve ekip erişimi gerekiyorsa.', 'QR kampanyalarını aktif kullanacaksanız.', 'Müşteri geri bildirimini operasyon KPI’ı yapacaksanız.'] },
      { title: 'Limitleri izleme', paragraphs: ['Panelde restoran sayısı, ekip ihtiyacı ve kullanım yoğunluğu arttıkça planı gözden geçirin. Gereksiz paket büyütmek yerine gerçek operasyon sinyaline bakın.'] },
    ],
    checklist: ['Trial bitiş tarihi biliniyor.', 'İlk QR testleri yapıldı.', 'Kullanıcı ve lokasyon ihtiyacı belirlendi.', 'Plan özellikleri karşılaştırıldı.', 'Fatura e-postası doğru.'],
    faq: [
      { q: 'Trial bitince veriler silinir mi?', a: 'Normal akışta veriler hemen silinmez; ancak panele devam etmek için plan yükseltmeniz gerekebilir.' },
      { q: 'Planı sonra değiştirebilir miyim?', a: 'Evet. Operasyon büyüdükçe planınızı yükseltebilir veya ihtiyaçlarınıza göre güncelleyebilirsiniz.' },
    ],
  }),
  article('en', 'billing', 10, 'plans-trial-upgrade', 'Trial, plan upgrades and usage limits', 'Evaluate location, QR and team needs before moving from trial to a paid plan.', ['billing', 'trial', 'plan', 'limit'], {
    lead: 'Choosing a plan is about operational volume, not only price. The right plan depends on locations, QR usage and team access needs.',
    sections: [
      { title: 'What to test during trial', paragraphs: ['In the first week, test QR scan rate, low-rating response time and platform redirects. These signals make upgrade decisions clearer.'] },
      { title: 'When to upgrade', items: ['You will add multiple restaurants.', 'You need regular reporting and team access.', 'You will actively run QR campaigns.', 'Customer feedback becomes an operations KPI.'] },
      { title: 'Monitoring limits', paragraphs: ['As restaurant count, team size and activity grow, review the plan. Prefer operational signals over upgrading too early.'] },
    ],
    checklist: ['Trial end date is known.', 'First QR tests are complete.', 'User and location needs are defined.', 'Plan features were compared.', 'Billing email is correct.'],
    faq: [
      { q: 'Are trial data deleted when trial ends?', a: 'Data is not immediately deleted in the normal flow, but you may need to upgrade to keep using the panel.' },
      { q: 'Can I change plans later?', a: 'Yes. You can upgrade or adjust your plan as operations grow.' },
    ],
  }),
  article('tr', 'billing', 20, 'invoices-cancelation', 'Faturalar, iptal ve hesap kapatma notları', 'Fatura geçmişini takip edin, iptal sürecini planlayın ve veri erişimini güvenli yönetin.', ['fatura', 'iptal', 'ödeme', 'hesap'], {
    lead: 'Faturalandırma süreçlerinde en önemli konu sürpriz yaşamamaktır. Fatura e-postası, plan yenileme tarihi ve iptal zamanı net olduğunda muhasebe ve operasyon aynı sayfada kalır.',
    sections: [
      { title: 'Fatura geçmişi', paragraphs: ['Faturalar panelde ödeme geçmişiyle birlikte izlenir. PDF veya ödeme referansı gerekiyorsa fatura detayında saklanan provider bilgisini kontrol edin.'] },
      { title: 'İptal öncesi', items: ['Aktif QR kampanyalarını durdurun.', 'Gerekli CSV raporlarını dışa aktarın.', 'Ekip erişimlerini gözden geçirin.', 'Müşteri bildirimlerini tamamlayın.'] },
      { title: 'Hesap kapatma', paragraphs: ['Hesap kapatmadan önce yasal saklama yükümlülükleri, KVKK talepleri ve işletme içi raporlama ihtiyaçları değerlendirilmelidir.'] },
    ],
    checklist: ['Fatura e-postası güncel.', 'Yenileme tarihi biliniyor.', 'Rapor exportları alındı.', 'QR materyalleri pasifleştirildi.', 'Ekip erişimi temizlendi.'],
    faq: [
      { q: 'İptal ettiğimde QR sayfaları kapanır mı?', a: 'Plan durumuna bağlı olarak panel ve public akışlar sınırlandırılabilir. Kritik QR materyallerini iptal öncesi planlayın.' },
      { q: 'Eski faturaları sonradan alabilir miyim?', a: 'Fatura geçmişi sistemde tutulduğu sürece geçmiş kayıtlar panelden veya destek üzerinden paylaşılabilir.' },
    ],
  }),
  article('en', 'billing', 20, 'invoices-cancelation', 'Invoices, cancellation and account closure notes', 'Track invoice history, plan cancellation and data access safely.', ['invoice', 'cancel', 'payment', 'account'], {
    lead: 'The main goal in billing is avoiding surprises. When billing email, renewal date and cancellation timing are clear, finance and operations stay aligned.',
    sections: [
      { title: 'Invoice history', paragraphs: ['Invoices are tracked in the panel with payment history. If you need a PDF or provider reference, check the invoice detail.'] },
      { title: 'Before cancelling', items: ['Pause active QR campaigns.', 'Export required CSV reports.', 'Review team access.', 'Finish customer follow-ups.'] },
      { title: 'Account closure', paragraphs: ['Before closing an account, consider legal retention duties, privacy requests and internal reporting needs.'] },
    ],
    checklist: ['Billing email is current.', 'Renewal date is known.', 'Reports were exported.', 'QR materials were disabled.', 'Team access was cleaned up.'],
    faq: [
      { q: 'Do QR pages stop after cancellation?', a: 'Depending on plan status, panel and public flows may be limited. Plan critical printed QR materials before cancelling.' },
      { q: 'Can I access old invoices later?', a: 'As long as invoice history is retained, past records can be shared through the panel or support.' },
    ],
  }),
  article('tr', 'api-webhook', 10, 'api-key-basics', 'API anahtarı oluşturma ve güvenli saklama', 'Geliştirici entegrasyonları için API anahtarlarını kapsam, saklama ve iptal prensipleriyle yönetin.', ['api', 'api key', 'geliştirici', 'token'], {
    lead: 'API anahtarları Buaze verilerine programatik erişim sağlar. Bu nedenle parola gibi düşünülmeli, yalnızca gerekli kapsamlarla oluşturulmalı ve düzenli olarak gözden geçirilmelidir.',
    sections: [
      { title: 'Anahtar kapsamı', paragraphs: ['Her entegrasyon için ayrı anahtar oluşturun. Böylece bir entegrasyonu iptal ederken tüm sistem erişimini kesmek zorunda kalmazsınız.'] },
      { title: 'Saklama', items: ['Anahtarı frontend koduna koymayın.', 'Sunucu ortam değişkenlerinde saklayın.', 'Loglara token yazmayın.', 'Paylaşım gerekiyorsa güvenli parola yöneticisi kullanın.'] },
      { title: 'İptal ve rotasyon', paragraphs: ['Kullanılmayan anahtarları revoke edin. Kritik entegrasyonlarda belirli aralıklarla yeni anahtar oluşturup eskisini kapatın.'] },
    ],
    checklist: ['Her entegrasyon için ayrı anahtar var.', 'Anahtar server-side env’de saklanıyor.', 'Scope minimumda.', 'Last used bilgisi takip ediliyor.', 'Kullanılmayan token revoke edildi.'],
    faq: [
      { q: 'API anahtarını tarayıcıda kullanabilir miyim?', a: 'Hayır. Public frontend kodunda API anahtarı kullanmak güvenli değildir.' },
      { q: 'Anahtar sızarsa ne yapmalıyım?', a: 'Hemen revoke edin, yeni anahtar üretin ve ilgili entegrasyonu güncelleyin.' },
    ],
  }),
  article('en', 'api-webhook', 10, 'api-key-basics', 'Create and store API keys safely', 'Manage developer API keys with clear scope, storage and revocation principles.', ['api', 'api key', 'developer', 'token'], {
    lead: 'API keys provide programmatic access to Buaze data. Treat them like passwords: keep scope minimal, store them securely and review them regularly.',
    sections: [
      { title: 'Key scope', paragraphs: ['Create a separate key for each integration. This lets you revoke one integration without disrupting everything else.'] },
      { title: 'Storage', items: ['Never put keys in frontend code.', 'Store keys in server-side environment variables.', 'Do not write tokens to logs.', 'Use a secure password manager for controlled sharing.'] },
      { title: 'Revocation and rotation', paragraphs: ['Revoke unused keys. For critical integrations, rotate keys periodically and disable the old one after deployment.'] },
    ],
    checklist: ['Each integration has its own key.', 'Key is stored in server-side env.', 'Scope is minimal.', 'Last used data is monitored.', 'Unused tokens were revoked.'],
    faq: [
      { q: 'Can I use an API key in the browser?', a: 'No. Public frontend code is not a safe place for API keys.' },
      { q: 'What if a key leaks?', a: 'Revoke it immediately, create a new key and update the integration.' },
    ],
  }),
  article('tr', 'api-webhook', 20, 'webhook-events', 'Webhook olaylarıyla geri bildirimleri dış sistemlere aktarma', 'Yeni yorum, düşük puan ve kampanya olaylarını CRM veya operasyon araçlarına taşımak için webhook yaklaşımı.', ['webhook', 'crm', 'event', 'entegrasyon'], {
    lead: 'Webhook yaklaşımı, Buaze’de oluşan olayları dış sistemlere otomatik taşımak için kullanılır. Böylece düşük puanlar CRM, destek masası veya ekip bildirim aracına düşebilir.',
    sections: [
      { title: 'Hangi olaylar gönderilmeli?', paragraphs: ['En pratik başlangıç düşük puan olayıdır. Ardından yeni feedback, yanıt oluşturma veya kampanya durumu gibi olaylar eklenebilir.'] },
      { title: 'Güvenli endpoint', items: ['HTTPS kullanın.', 'İmza doğrulaması planlayın.', 'Tekrarlı gönderime karşı idempotency kullanın.', 'Başarısız istekleri retry kuyruğuna alın.'] },
      { title: 'Operasyon örnekleri', paragraphs: ['1-3 yıldız geldiğinde Slack kanalına bildirim, CRM’de görev açma veya şube müdürüne e-posta tetikleme sık kullanılan senaryolardır.'] },
    ],
    checklist: ['Webhook URL HTTPS.', 'Event tipleri belirlendi.', 'Retry davranışı planlandı.', 'Payload örnekleri test edildi.', 'Düşük puan olayları doğru ekibe gidiyor.'],
    faq: [
      { q: 'Webhook endpoint yavaşsa ne olur?', a: 'İdeal mimaride istek hızlı kabul edilir ve işlem arka planda yapılır. Zaman aşımı riskini azaltmak için queue kullanın.' },
      { q: 'Aynı olay iki kez gelebilir mi?', a: 'Evet, retry mekanizmalarında mümkün olabilir. Event ID ile idempotent işlem tasarlayın.' },
    ],
  }),
  article('en', 'api-webhook', 20, 'webhook-events', 'Send feedback events to external systems with webhooks', 'Use webhook patterns to move new reviews, low ratings and campaign events into CRM or operations tools.', ['webhook', 'crm', 'event', 'integration'], {
    lead: 'Webhooks move Buaze events into external systems automatically. Low ratings can create CRM tasks, support tickets or team notifications.',
    sections: [
      { title: 'Which events should be sent?', paragraphs: ['A practical first event is low rating. Later, add new feedback, reply creation or campaign status events.'] },
      { title: 'Secure endpoint', items: ['Use HTTPS.', 'Plan signature verification.', 'Use idempotency for duplicate deliveries.', 'Retry failed requests through a queue.'] },
      { title: 'Operational examples', paragraphs: ['Common workflows include Slack notifications for 1-3 star feedback, CRM task creation or branch manager email alerts.'] },
    ],
    checklist: ['Webhook URL uses HTTPS.', 'Event types are defined.', 'Retry behavior is planned.', 'Payload examples were tested.', 'Low ratings reach the correct team.'],
    faq: [
      { q: 'What if the webhook endpoint is slow?', a: 'Accept the request quickly and process in the background. Use a queue to reduce timeout risk.' },
      { q: 'Can the same event arrive twice?', a: 'Yes, retries can cause duplicates. Design idempotent processing with event IDs.' },
    ],
  }),
  article('tr', 'security-kvkk', 10, 'kvkk-consent-data', 'KVKK onayı, müşteri verisi ve saklama yaklaşımı', 'QR geri bildirim akışında açık rıza, iletişim izni ve anonim kayıtları doğru yönetin.', ['kvkk', 'gdpr', 'rıza', 'müşteri verisi'], {
    lead: 'Geri bildirim toplarken amaç, müşteriden gereksiz veri almak değil, deneyimi iyileştirmek için yeterli ve hukuka uygun bilgiyi toplamaktır. Buaze akışı KVKK onayı, iletişim izni ve anonim geri bildirim ayrımını destekler.',
    sections: [
      { title: 'Hangi veri ne zaman alınır?', paragraphs: ['Düşük puanlarda müşteriye ulaşmak için ad, telefon veya e-posta istenebilir. Yüksek puan yönlendirme akışında genellikle kişisel veri toplamaya gerek yoktur.'] },
      { title: 'Açık rıza ve iletişim izni', items: ['KVKK onayı geri bildirim süreci için zorunlu olabilir.', 'Pazarlama izni ayrı ve isteğe bağlı tutulmalıdır.', 'İzin metni açık ve anlaşılır olmalıdır.', 'Müşteri dilediğinde iletişim iznini geri çekebilmelidir.'] },
      { title: 'Anonim kayıtlar', paragraphs: ['E-posta ve telefon bırakmayan müşteri geri bildirimi operasyonel analizde kullanılabilir; ancak müşteri listesinde kişisel kayıt gibi ele alınmamalıdır.'] },
    ],
    checklist: ['KVKK metni görünür.', 'Pazarlama izni ayrı checkbox.', 'Anonim kayıtlar müşteri listesine karışmıyor.', 'Düşük puan iletişim bilgisi kontrollü alınıyor.', 'Export yetkisi sınırlı.'],
    faq: [
      { q: 'Telefon veya e-posta zorunlu mu?', a: 'Düşük puan telafisi için en az bir iletişim kanalı istenebilir. Gereksiz veri toplamaktan kaçının.' },
      { q: 'Anonim yorumları silebilir miyim?', a: 'Operasyonel saklama politikanıza göre silebilir veya raporlarda anonim şekilde tutabilirsiniz.' },
    ],
  }),
  article('en', 'security-kvkk', 10, 'kvkk-consent-data', 'GDPR/KVKK consent, customer data and retention', 'Manage consent, marketing permission and anonymous feedback correctly in QR flows.', ['gdpr', 'kvkk', 'consent', 'customer data'], {
    lead: 'The goal of feedback collection is not to gather unnecessary personal data, but to collect enough lawful information to improve the experience. Buaze supports consent, marketing permission and anonymous feedback separation.',
    sections: [
      { title: 'Which data is collected when?', paragraphs: ['For low ratings, name, phone or email may be requested so the business can follow up. High-rating redirect flows usually do not need personal data.'] },
      { title: 'Consent and marketing permission', items: ['Privacy consent may be required for feedback processing.', 'Marketing permission should be separate and optional.', 'Consent text should be clear.', 'Customers should be able to withdraw marketing permission.'] },
      { title: 'Anonymous records', paragraphs: ['Feedback without email or phone can still be used for operational analysis, but should not be treated as an identified customer record.'] },
    ],
    checklist: ['Privacy notice is visible.', 'Marketing permission is a separate checkbox.', 'Anonymous records do not pollute customer lists.', 'Low-rating contact data is collected carefully.', 'Export access is limited.'],
    faq: [
      { q: 'Is phone or email mandatory?', a: 'For low-rating recovery, at least one contact channel can be requested. Avoid collecting unnecessary data.' },
      { q: 'Can anonymous reviews be deleted?', a: 'Depending on your retention policy, you can delete them or keep them anonymously for reporting.' },
    ],
  }),
  article('tr', 'security-kvkk', 20, 'security-best-practices', 'Panel güvenliği için en iyi uygulamalar', 'JWT, rol bazlı erişim, ekip temizliği ve export kontrolleriyle hesabınızı güvenli tutun.', ['güvenlik', 'jwt', 'rol', 'export'], {
    lead: 'Panel güvenliği yalnızca teknik altyapıdan ibaret değildir. Doğru rol dağılımı, düzenli erişim temizliği ve hassas export işlemlerinin kontrolü günlük güvenliğin temelidir.',
    sections: [
      { title: 'Rol bazlı erişim', paragraphs: ['Her API ve panel ekranı restoran kapsamına göre kontrol edilmelidir. Owner sadece kendi restoranlarını, manager ise atanmış restoranı görmelidir.'] },
      { title: 'Operasyon alışkanlıkları', items: ['Ortak parola kullanmayın.', 'Ayrılan çalışanların erişimini kapatın.', 'Export dosyalarını yerel cihazlarda uzun süre tutmayın.', 'Superadmin erişimini sınırlayın.'] },
      { title: 'Ortam değişkenleri', paragraphs: ['Production ortamında JWT_SECRET güçlü ve benzersiz olmalıdır. API anahtarları ve servis hesapları sadece server-side env olarak tutulmalıdır.'] },
    ],
    checklist: ['JWT_SECRET production’da set edildi.', 'Superadmin sayısı minimum.', 'Manager restoran scope’u doğru.', 'Export yetkileri sınırlı.', 'Eski ekip üyeleri kaldırıldı.'],
    faq: [
      { q: 'JWT fallback production’da kullanılmalı mı?', a: 'Hayır. Production ortamında mutlaka güçlü bir JWT_SECRET tanımlanmalıdır.' },
      { q: 'CSV export herkes tarafından alınabilir mi?', a: 'Hayır. Export işlemleri rol ve restoran kapsamına göre sınırlandırılmalıdır.' },
    ],
  }),
  article('en', 'security-kvkk', 20, 'security-best-practices', 'Security best practices for the dashboard', 'Keep the account safe with JWT hygiene, role-based access, team cleanup and export controls.', ['security', 'jwt', 'role', 'export'], {
    lead: 'Dashboard security is not only infrastructure. Correct role assignment, regular access cleanup and careful export controls are the foundation of daily security.',
    sections: [
      { title: 'Role-based access', paragraphs: ['Every API and panel screen should be scoped by restaurant access. Owners should see only their restaurants; managers should see their assigned restaurant.'] },
      { title: 'Operational habits', items: ['Do not share passwords.', 'Revoke access for former employees.', 'Do not keep export files on local devices longer than needed.', 'Limit superadmin access.'] },
      { title: 'Environment variables', paragraphs: ['In production, JWT_SECRET must be strong and unique. API keys and service accounts should stay server-side only.'] },
    ],
    checklist: ['JWT_SECRET is set in production.', 'Superadmin count is minimal.', 'Manager restaurant scope is correct.', 'Export permissions are limited.', 'Former team members were removed.'],
    faq: [
      { q: 'Should the JWT fallback be used in production?', a: 'No. Always set a strong JWT_SECRET in production.' },
      { q: 'Can everyone export CSV files?', a: 'No. Exports should be limited by role and restaurant scope.' },
    ],
  }),
];

STATIC_HELP_ARTICLES.push(...MORE_ARTICLES);

export function getStaticHelpArticles(locale: Locale, category?: string) {
  return STATIC_HELP_ARTICLES
    .filter((article) => article.locale === locale && (!category || article.category === category))
    .sort((a, b) => a.category.localeCompare(b.category) || a.order - b.order);
}

export function getStaticHelpArticle(locale: Locale, slug: string) {
  return STATIC_HELP_ARTICLES.find((article) => article.locale === locale && article.slug === slug) ?? null;
}

export function getStaticHelpCategoryCounts(locale: Locale) {
  const counts: Record<string, number> = {};
  for (const article of STATIC_HELP_ARTICLES) {
    if (article.locale !== locale) continue;
    counts[article.category] = (counts[article.category] ?? 0) + 1;
  }
  return counts;
}

export function getStaticPopularHelpArticles(locale: Locale, take = 5) {
  return getStaticHelpArticles(locale).slice(0, take);
}

export function searchStaticHelpArticles(locale: Locale, query: string, take = 30) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return getStaticHelpArticles(locale)
    .filter((article) => {
      const haystack = [
        article.title,
        article.excerpt,
        article.category,
        ...article.searchTags,
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    })
    .slice(0, take);
}
