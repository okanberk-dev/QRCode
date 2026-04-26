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

  article('tr', 'getting-started', 30, 'dashboard-tour', 'Panele ilk girişte nereye bakmalısınız?', 'Buaze panelinin ana ekranlarını ve günlük operasyon akışını dakikalar içinde tanıyın.', ['panel', 'dashboard', 'tur', 'başlangıç'], {
    lead: 'Panele ilk girdiğinizde her şeyi aynı anda öğrenmenize gerek yok. Bu rehber günlük operasyon için en sık kullanılan ekranları ve hangi ekranın hangi soruyu cevapladığını gösterir.',
    sections: [
      { title: 'Üst düzey görünüm', paragraphs: ['Dashboard ana ekranı son 7 gün ve son 30 günü karşılaştıran özet kartlar, yıldız dağılımı, platform dağılımı ve trend grafiğiyle açılır. Hızlı bir ısınma için günde bir kez bu ekrana bakmak yeterlidir.'] },
      { title: 'Yorum gelen kutusu', paragraphs: ['Yorumlar sayfası gerçek operasyonun yapıldığı yerdir. Filtre çubuğu yıldız aralığı, platform, tarih ve etiket bazında daraltma yapar. Düşük puanlar üstte tutulduğu sürece ekip yanıt SLA’sını yakalar.'] },
      { title: 'Sık kullanılan kısayollar', items: ['Hızlı yanıt için Ctrl/Cmd+Enter ile gönderim.', 'Yıldız filtresi için 1-5 tuşları.', 'Filtre temizlemek için “Filtreleri sıfırla” butonu.', 'CSV export için liste başlığındaki indirme ikonu.', 'Yorum detayında yan panel açmak için satıra tıklama.'] },
    ],
    checklist: ['Dashboard kartları doğru tarih aralığını gösteriyor.', 'Yorumlar listesinde varsayılan sıralama tarih bazlı.', 'Düşük puan filtresi tek tıkla uygulanıyor.', 'Bildirim e-postası canlı testte düşüyor.', 'CSV export için yetki doğru kişide.'],
    faq: [
      { q: 'Panelde tarih aralığı kaydediliyor mu?', a: 'Hayır. Sayfa yenilendiğinde varsayılan aralığa döner. Sık kullandığınız bir aralık varsa link olarak yer imine ekleyin.' },
      { q: 'Birden fazla restoranı aynı anda görmek mümkün mü?', a: 'Evet. Lokasyon seçicisi “Tümü” seçildiğinde özet kartlar tüm yetkili restoranların toplamını gösterir.' },
    ],
  }),
  article('en', 'getting-started', 30, 'dashboard-tour', 'Where to look first when you open the dashboard', 'Get familiar with the main screens and the daily operations flow in just a few minutes.', ['panel', 'dashboard', 'tour', 'onboarding'], {
    lead: 'You do not need to learn everything at once. This guide shows the screens you will use daily and what question each screen answers best.',
    sections: [
      { title: 'High-level view', paragraphs: ['The main dashboard opens with summary cards comparing the last 7 and 30 days, plus a star distribution, platform distribution and trend chart. A daily glance here is enough for a quick warm-up.'] },
      { title: 'Reviews inbox', paragraphs: ['The Reviews page is where the real work happens. The filter bar narrows by stars, platform, date and tags. Keeping low ratings at the top helps the team meet response SLAs.'] },
      { title: 'Common shortcuts', items: ['Ctrl/Cmd+Enter to send a reply.', '1-5 keys to filter by star rating.', 'Clear all with the “Reset filters” button.', 'CSV export via the download icon in the list header.', 'Open the side panel by clicking a row.'] },
    ],
    checklist: ['Dashboard cards show the right date range.', 'Reviews default to date-based sorting.', 'Low-rating filter is one click away.', 'Notification email lands in a live test.', 'CSV export is granted to the right person.'],
    faq: [
      { q: 'Does the panel remember the date range?', a: 'No. It returns to default on refresh. Bookmark a URL with your preferred range if you use it often.' },
      { q: 'Can I view multiple restaurants at once?', a: 'Yes. Selecting “All” in the location switcher aggregates summary cards across every restaurant you can access.' },
    ],
  }),
  article('tr', 'getting-started', 40, 'slug-and-url', 'Slug ve QR URL’sini doğru seçme', 'Slug, müşterinin tarayıcı çubuğunda gördüğü ad ve QR’ın bağlandığı kalıcı kimliktir. Doğru seçim ileride iş kolaylaştırır.', ['slug', 'url', 'qr', 'seo'], {
    lead: 'Slug, restoran kaydının URL’deki kısa formudur. Hem tarayıcıda görünür hem de basılan QR’ların hedefini belirler. Yanlış slug ileride yeniden baskı veya yönlendirme zorunluluğu doğurur.',
    sections: [
      { title: 'İyi bir slug nasıl olur?', items: ['Kısa ve okunaklı (3-24 karakter).', 'Sadece harf, rakam ve tek tire.', 'Marka adıyla uyumlu, şehir veya şube eki gerekmedikçe sade.', 'Türkçe karakter yerine ascii karşılığı (kafe değil cafe).', 'Promosyon veya kampanya kelimeleri içermesin.'] },
      { title: 'Slug değişikliği maliyeti', paragraphs: ['Slug’u sonradan değiştirmek mümkündür ama eski slug’la basılmış QR’lar geçersiz hale gelir. Eğer marka değişikliği veya şube ayrımı yapılacaksa, eski slug’a 301 yönlendirme planlamak ve materyalleri kademeli yenilemek en az hasarı verir.'] },
      { title: 'Çoklu lokasyon stratejisi', paragraphs: ['Aynı markanın farklı şubeleri için marka-sehir veya marka-şube formatı yaygındır. Karışıklığı önlemek için tek tek özgün slug’lar tutmak, panel raporlarının okunabilirliğini artırır.'] },
    ],
    checklist: ['Slug tek kelimelik veya kısa.', 'Türkçe karakter yok.', 'Şube ayrımı tutarlı pattern’le yazıldı.', 'Slug aktif domainde test edildi.', 'Eski slug’la basılı materyal listesi varsa kayıtlı.'],
    faq: [
      { q: 'Slug büyük harf içerebilir mi?', a: 'Sistem genellikle küçük harfe çevirir. Tutarlılık için her zaman küçük harf kullanmak en güvenlisidir.' },
      { q: 'Slug değiştirirsem Google’a yönlendirme bozulur mu?', a: 'Hayır. Google bağlantısı slug’dan bağımsız ayrı bir alanda tutulur. Sadece müşterinin tarayıcıdan açtığı QR URL’si değişir.' },
    ],
  }),
  article('en', 'getting-started', 40, 'slug-and-url', 'Pick the right slug and QR URL', 'Your slug is the short identifier in the URL and the destination of every printed QR. Picking it well saves rework later.', ['slug', 'url', 'qr', 'seo'], {
    lead: 'A slug is the short URL identifier for your restaurant record. It appears in the browser bar and defines where every printed QR points. A poor choice forces reprints or redirects later.',
    sections: [
      { title: 'What makes a good slug', items: ['Short and readable (3-24 characters).', 'Only letters, numbers and a single dash.', 'Aligned with the brand, no city or branch suffix unless needed.', 'Use ASCII instead of accented characters.', 'Avoid promotion or campaign words.'] },
      { title: 'Cost of changing a slug', paragraphs: ['You can change the slug later, but every QR printed with the old slug becomes invalid. If a rebrand or branch split is coming, plan a 301 redirect on the old slug and replace materials gradually to limit damage.'] },
      { title: 'Multi-location strategy', paragraphs: ['For the same brand across cities, a brand-city or brand-branch pattern is common. Keeping each slug unique keeps panel reports easy to read.'] },
    ],
    checklist: ['Slug is short or single-word.', 'No accented characters.', 'Branch differentiation follows a consistent pattern.', 'Slug was tested on the live domain.', 'A list of printed materials with the old slug exists.'],
    faq: [
      { q: 'Can a slug contain uppercase letters?', a: 'The system usually normalizes to lowercase. Use lowercase consistently to be safe.' },
      { q: 'Will changing the slug break my Google redirect?', a: 'No. The Google link is stored separately. Only the customer-facing QR URL changes.' },
    ],
  }),
  article('tr', 'getting-started', 50, 'brand-colors-logo', 'Marka rengi ve logoyu doğru ayarlama', 'Müşteri ekranı, menü ve dahili form alanlarında görünen renk ve logo seçimleriyle markanızı tutarlı hissettirin.', ['marka', 'renk', 'logo', 'tasarım'], {
    lead: 'QR akışındaki müşteri çoğunlukla tek bir telefondan ve birkaç saniye içinde karar verir. Renk ve logo doğru kurulmadığında müşteri akışı yabancı, marka tutarsız hisseder. Doğru ayar bunun tam tersini yapar.',
    sections: [
      { title: 'Birincil renk', paragraphs: ['Birincil renk hem yıldız seçim ekranında hem de menü hero alanlarında kullanılır. Çok açık veya çok soluk renkler beyaz arka planla yeterli kontrast vermez. WCAG AA için en az 4.5:1 kontrast oranı hedefleyin.'] },
      { title: 'Logo formatı', items: ['Tercihen şeffaf arka plan (PNG veya WebP).', 'Kare veya yatay seçenek mevcut, ana ekranda kare daha iyi görünür.', 'Maksimum 1MB boyut, 1024px en uzun kenar yeterli.', 'İnce tire/font detayları küçültüldüğünde okunaklı kalsın.'] },
      { title: 'Marka tutarlılığı', paragraphs: ['Restoran kayıtlarında, menüde, e-posta bildirimlerinde ve QR sayfasında aynı renk ve logoyu kullanın. Müşteri farklı yerlerde aynı işletmeyle muhatap olduğunu hemen anlar.'] },
    ],
    checklist: ['Birincil renk WCAG AA kontrast geçti.', 'Logo şeffaf arka planla yüklendi.', 'Logo mobil görünümde net.', 'Aynı renk e-posta şablonunda da kullanılıyor.', 'Eski logoları yöneticiler hesaptan temizledi.'],
    faq: [
      { q: 'İki farklı şube için farklı renk kullanabilir miyim?', a: 'Her restoran kaydı kendi rengini ve logosunu tutar. Sadece dikkat edin, müşteri için marka aynı görünüyorsa renkler de yakın olmalı.' },
      { q: 'Koyu mod desteği var mı?', a: 'Müşteri menü ekranı sistem temasına göre adapte olabilir. Logonuz hem açık hem koyu zeminde okunaklı kalmalı.' },
    ],
  }),
  article('en', 'getting-started', 50, 'brand-colors-logo', 'Set up brand color and logo correctly', 'Make your brand feel consistent across the customer screen, menu and private feedback form.', ['brand', 'color', 'logo', 'design'], {
    lead: 'A QR customer usually decides within seconds on a single phone. If color and logo are wrong, the flow feels foreign and the brand inconsistent. Correct setup does the opposite.',
    sections: [
      { title: 'Primary color', paragraphs: ['The primary color appears on the rating screen and in menu hero areas. Very pale colors do not contrast well against white backgrounds. Aim for a 4.5:1 contrast ratio for WCAG AA.'] },
      { title: 'Logo format', items: ['Prefer transparent background (PNG or WebP).', 'Square or horizontal both supported; square reads better on the rating screen.', 'Up to 1MB and 1024px on the longest edge is enough.', 'Thin strokes or fonts should still be legible when scaled down.'] },
      { title: 'Brand consistency', paragraphs: ['Use the same color and logo across the restaurant record, the menu, email notifications and the QR page. Customers immediately recognize the brand across touchpoints.'] },
    ],
    checklist: ['Primary color passes WCAG AA contrast.', 'Logo uploaded with transparent background.', 'Logo is sharp on mobile.', 'Same color is used in email templates.', 'Old logos were removed from the account.'],
    faq: [
      { q: 'Can I use different colors for different branches?', a: 'Yes. Each restaurant record stores its own color and logo. If the brand is shared, keep colors close enough.' },
      { q: 'Is there dark mode support?', a: 'The customer-facing menu can adapt to system theme. Make sure your logo stays legible on both light and dark surfaces.' },
    ],
  }),

  article('tr', 'qr-codes', 30, 'bulk-qr-generation', 'Çok şubeli işletmeler için toplu QR üretimi', 'Onlarca masa veya birden fazla şube için QR kodu üretirken hata yapmadan ilerleme yöntemi.', ['toplu', 'qr', 'şube', 'baskı'], {
    lead: 'Tek bir restoranda 30 masa, üç şubede 90 masa demektir. Toplu üretim hem zaman kazandırır hem de elle kopyalama sırasında oluşan parametre hatalarını ortadan kaldırır.',
    sections: [
      { title: 'Üretim öncesi hazırlık', paragraphs: ['Önce masa numaralandırma planı netleşmelidir. Salon-bahçe gibi bölge ayrımları, masa numarasında bir prefix ile ayrılır (S1, S2, B1, B2). Bu yaklaşım panel raporlarında bölge analizini kolaylaştırır.'] },
      { title: 'QR varyasyon stratejisi', items: ['Her masa için ayrı QR (table=...).', 'Paket için tek QR (source=package).', 'Fiş için ayrı QR (source=receipt).', 'Kampanya QR’ları için utm-style ek parametre.', 'Şube ayrımı slug seviyesinde değil parametre seviyesinde.'] },
      { title: 'Baskı kalite kontrolü', paragraphs: ['Üretim sonrası 5-10 rastgele QR’ı bizzat tarayıp doğru sayfaya gittiğinden emin olun. Yüksek hacimli baskılarda örnekleme bütün partiyi yeniden basmaktan ucuzdur.'] },
    ],
    checklist: ['Masa numaralandırma şeması belgelenmiş.', 'Her QR örnekte taranarak doğrulandı.', 'Baskı boyutu en az 2.5 cm.', 'Şube bazlı klasör yapısı mevcut.', 'Yedek dijital kopyalar saklandı.'],
    faq: [
      { q: 'PDF olarak toplu indirme var mı?', a: 'Panel üzerinden QR’ları tek tek veya kategori bazlı indirebilirsiniz. Çok büyük partilerde basımcı ekibinizle ZIP arşivi paylaşmak pratik bir yöntemdir.' },
      { q: 'Eski şubenin QR kodlarını yeni şubede kullanabilir miyim?', a: 'Hayır. Slug ve table parametreleri farklı olduğu için raporlama karışır. Yeni şube için yeniden üretmek gerekir.' },
    ],
  }),
  article('en', 'qr-codes', 30, 'bulk-qr-generation', 'Bulk QR generation for multi-location operators', 'Generate QRs for dozens of tables or multiple locations without parameter mistakes.', ['bulk', 'qr', 'branch', 'print'], {
    lead: 'A single restaurant with 30 tables means 90 QRs across three branches. Bulk generation saves time and removes the copy-paste mistakes that creep in during manual work.',
    sections: [
      { title: 'Plan before you generate', paragraphs: ['First settle the table numbering scheme. Zones like dining room and patio can use a prefix in the table number (D1, D2, P1, P2). This makes zone analysis straightforward in panel reports.'] },
      { title: 'QR variant strategy', items: ['One QR per table (table=...).', 'A single QR for packages (source=package).', 'A separate QR for receipts (source=receipt).', 'UTM-style extra parameter for campaigns.', 'Differentiate branches at the parameter level, not the slug level.'] },
      { title: 'Print quality control', paragraphs: ['After production, scan 5-10 random QRs personally and verify each lands on the right page. Sampling is cheaper than reprinting an entire batch.'] },
    ],
    checklist: ['Numbering scheme is documented.', 'A sample of each QR was scanned.', 'Print size is at least 2.5 cm.', 'Branch-based folder structure exists.', 'Backup digital copies are stored.'],
    faq: [
      { q: 'Is bulk PDF download available?', a: 'You can export QRs individually or by category from the panel. For very large batches, share a ZIP archive with your print partner.' },
      { q: 'Can I reuse old branch QRs in a new branch?', a: 'No. Different slugs and table parameters break reporting. Regenerate for the new branch.' },
    ],
  }),
  article('tr', 'qr-codes', 40, 'campaign-qr-utm', 'Kampanya ve mevsim QR’ları nasıl planlanır?', 'Yeni menü tanıtımı, sezon kampanyası veya etkinlik için ayrı QR oluşturup ölçümlenebilir hale getirme.', ['kampanya', 'utm', 'sezon', 'ölçüm'], {
    lead: 'Bir kampanyanın başarısını ölçmek için onu izole etmek gerekir. Kampanya QR’ları, müşterinin hangi tutundurma materyaliyle geldiğini panel raporlarına yazar ve kampanya sonrası kararlarınızı veri tabanlı yapar.',
    sections: [
      { title: 'Kampanya QR yapısı', paragraphs: ['Kampanya QR’ları normal QR’lardan farklı olarak source veya campaign parametresi taşır. Örnek: /r/restaurant-slug?source=summer2026&platform=google. Böylece bu QR’dan gelen geri bildirimler raporlarda ayrışır.'] },
      { title: 'İletişim materyalleri', items: ['Sosyal medya post’unun altında.', 'Bahçe banner’ında.', 'Etkinlik standında.', 'Newsletter’da CTA olarak.', 'Kampanya menüsünün arka kapağında.'] },
      { title: 'Ölçüm sonrası karar', paragraphs: ['Kampanya bittiğinde QR’dan gelen yorum sayısını, ortalama puanı ve müşteri profilini değerlendirin. Düşük tarama oranı materyalin yer ve metni hakkında, düşük puan ise kampanya teklifinin kendisi hakkında bilgi verir.'] },
    ],
    checklist: ['Kampanya parametresi tutarlı.', 'Materyallerin her birinde aynı QR.', 'Kampanya başlangıç-bitiş tarihi belgelenmiş.', 'Rapor için filtre kaydedildi.', 'Kampanya sonrası retro yapıldı.'],
    faq: [
      { q: 'Aynı kampanya için iki farklı QR olabilir mi?', a: 'Evet, ama A/B testi yapmıyorsanız önerilmez. Tek parametre ölçümü daha sade tutar.' },
      { q: 'Kampanya bitince QR’ı silmeli miyim?', a: 'Silmek zorunda değilsiniz. Pasif bırakırsanız geçmiş raporlar hala geçerli kalır; ama aktif materyalden kaldırın.' },
    ],
  }),
  article('en', 'qr-codes', 40, 'campaign-qr-utm', 'Plan campaign and seasonal QR codes', 'Create dedicated QRs for menu launches, seasonal pushes or events so you can measure them.', ['campaign', 'utm', 'season', 'measurement'], {
    lead: 'To measure a campaign you need to isolate it. Campaign QR codes record which marketing material brought the customer in, so post-campaign decisions are data-driven instead of guess-driven.',
    sections: [
      { title: 'Campaign QR structure', paragraphs: ['Unlike standard QRs, campaign codes carry a source or campaign parameter. Example: /r/restaurant-slug?source=summer2026&platform=google. Feedback from this QR is then separated in reports.'] },
      { title: 'Where to place them', items: ['Below social media posts.', 'On a patio banner.', 'At an event booth.', 'As a CTA in a newsletter.', 'On the back cover of the campaign menu.'] },
      { title: 'Decisions after the campaign', paragraphs: ['When the campaign ends, evaluate scan count, average rating and customer profile from this QR. Low scan rate points to placement and copy; low rating points to the offer itself.'] },
    ],
    checklist: ['Campaign parameter is consistent.', 'All materials share the same QR.', 'Start and end dates are documented.', 'A saved report filter exists.', 'A post-campaign retro was held.'],
    faq: [
      { q: 'Can one campaign have two different QRs?', a: 'Yes, but unless you are running an A/B test, avoid it. A single parameter keeps measurement clean.' },
      { q: 'Should I delete the QR after the campaign?', a: 'No. Leaving it inactive preserves historical reports. Just remove it from active materials.' },
    ],
  }),
  article('tr', 'qr-codes', 50, 'qr-print-materials', 'Basılı QR materyallerini güncel tutma', 'Stickerlar, tabela, masa kartı ve menü baskılarınızın yıpranmasını ve yanlış sürüm kullanımını önleme.', ['baskı', 'sticker', 'menü', 'bakım'], {
    lead: 'QR’ın dijital tarafı sabit kalsa bile fiziksel materyal yıpranır, kayıp olur veya eski versiyon yanlışlıkla kullanılır. Basılı materyal yönetimi günlük operasyonun sessiz ama önemli bir parçasıdır.',
    sections: [
      { title: 'Yıpranma kontrolü', paragraphs: ['Sticker’lar parlak yüzeylerde 6-12 ay içinde okunmaz hale gelebilir. Açık alandaki banner’lar güneşte solar. Aylık görsel kontrol turu, müşterinin tarayamadığı QR’ı erken yakalar.'] },
      { title: 'Sürüm yönetimi', items: ['QR baskısının ön yüzüne sürüm kodu yazın (V1.2 gibi).', 'Yedek 5-10 sticker ofiste bulundurun.', 'Eski sürümleri yeni baskı geldiğinde imha edin.', 'Şube yöneticisine basit bir kontrol listesi verin.', 'Tedarikçi e-postasında baskı tarihi açıkça yazılı olsun.'] },
      { title: 'Yer değişikliği', paragraphs: ['Restoran taşındığında, dekorasyon yenilendiğinde veya menü baştan tasarlandığında QR materyalleri de yeniden değerlendirilmeli. Müşteri eski yerinde QR arıyorsa tarama oranı düşer.'] },
    ],
    checklist: ['Aylık görsel QR turu yapılıyor.', 'Sürüm kodu basılı materyalde okunaklı.', 'Yedek sticker stoğu var.', 'Eski sürüm imhası tamamlandı.', 'Dekorasyon değişikliğinde QR konumu güncellendi.'],
    faq: [
      { q: 'QR sticker’ları nereden bastırmalıyım?', a: 'UV korumalı laminasyonlu sticker dış mekan için, normal mat sticker iç mekan için yeterlidir. Tedarikçi seçiminde 6 ay test örneği isteyebilirsiniz.' },
      { q: 'Eski sürüm QR’ı zarar verir mi?', a: 'Slug değişmediyse hayır. Ama parametreler eskiyse rapor doğruluğu bozulur. Sürüm güncellemesi titizlikle yapılmalı.' },
    ],
  }),
  article('en', 'qr-codes', 50, 'qr-print-materials', 'Keep printed QR materials current', 'Stop wear, loss and outdated versions across stickers, signs, table cards and menu prints.', ['print', 'sticker', 'menu', 'maintenance'], {
    lead: 'Even if the digital side stays stable, physical materials wear out, get lost or end up showing an old version. Material management is a quiet but important part of daily operations.',
    sections: [
      { title: 'Wear monitoring', paragraphs: ['Stickers on glossy surfaces can fade within 6-12 months. Outdoor banners sun-bleach. A monthly visual check catches QRs customers can no longer scan.'] },
      { title: 'Version control', items: ['Print a version code on the front of each QR sticker (e.g. V1.2).', 'Keep 5-10 backup stickers on site.', 'Destroy old versions when new ones arrive.', 'Give branch managers a simple checklist.', 'Have suppliers print a clear print date.'] },
      { title: 'Location changes', paragraphs: ['When a restaurant moves, redecorates or relaunches the menu, QR materials should be re-evaluated. If customers look in the old place, scan rate falls.'] },
    ],
    checklist: ['Monthly visual QR walkthrough is in place.', 'Version code is legible on materials.', 'Backup sticker stock exists.', 'Old versions were destroyed.', 'QR positions were updated on remodel.'],
    faq: [
      { q: 'Where should I print QR stickers?', a: 'UV-laminated stickers work outdoors; standard matte stickers are fine indoors. Ask suppliers for a 6-month sample test before committing.' },
      { q: 'Are outdated QRs harmful?', a: 'If the slug is unchanged, no. But outdated parameters break reporting. Treat version updates carefully.' },
    ],
  }),

  article('tr', 'review-management', 30, 'tags-and-assignment', 'Etiketleme ve sorumlu atama disiplini', 'Yorumların etiketlerle ayrıştırılması ve doğru kişiye atanması, raporları okunabilir yapan en küçük adımdır.', ['etiket', 'atama', 'iş akışı', 'sorumlu'], {
    lead: 'Etiket ve atama tek başına basit görünür ama günlük operasyonun kalitesi büyük ölçüde bu iki adımdan gelir. Etiketsiz yorum aranamaz, atamasız yorum sahipsiz kalır.',
    sections: [
      { title: 'Etiket setini sade tutun', paragraphs: ['Çok fazla etiket karar vermeyi yavaşlatır. Servis, yemek, fiyat, atmosfer, teslimat ve sıcaklık gibi 6-8 ana etiket çoğu işletme için yeterlidir. İhtiyaç duyuldukça yeni etiket eklenir, kullanılmayanlar arşivlenir.'] },
      { title: 'Atama mantığı', items: ['Servis etiketi → vardiya yöneticisi.', 'Yemek etiketi → mutfak şefi veya sous şef.', 'Teslimat etiketi → operasyon sorumlusu.', 'Fiyat etiketi → işletme sahibi.', 'Atanmamış yorum kalmasın.'] },
      { title: 'Toplu işlem', paragraphs: ['Aynı etiketten birden fazla yorum gelirse panel filtresi sayesinde toplu cevap veya toplu atama yapılabilir. Bu özellikle bayram veya kampanya sonrası gelen yorum yığınlarını yönetilebilir kılar.'] },
    ],
    checklist: ['Etiket seti 8 başlık altında.', 'Her etikete varsayılan sorumlu tanımlı.', 'Atanmamış yorum oranı düşük.', 'Haftalık etiket dağılım raporu gözden geçirildi.', 'Kullanılmayan etiketler arşivlendi.'],
    faq: [
      { q: 'Bir yoruma birden fazla etiket eklenebilir mi?', a: 'Evet. Yorum hem servis hem teslimat etkisini içeriyorsa iki etiket de işaretlenir. Raporda her ikisinde de sayılır.' },
      { q: 'Yanlış atamayı geri alabilir miyim?', a: 'Evet. Atama değiştirilebilir; geçmiş kim tarafından atandı bilgisi audit log’ta tutulur.' },
    ],
  }),
  article('en', 'review-management', 30, 'tags-and-assignment', 'Discipline around tagging and ownership', 'Tagging and assigning reviews is the smallest step that makes reports actually readable.', ['tag', 'assignment', 'workflow', 'owner'], {
    lead: 'Tagging and assignment look simple in isolation, but the quality of daily operations depends on them. Untagged reviews cannot be searched; unassigned reviews end up nobody’s responsibility.',
    sections: [
      { title: 'Keep the tag set small', paragraphs: ['Too many tags slow decisions. Service, food, price, atmosphere, delivery and temperature — 6 to 8 core tags cover most operations. Add new ones only when needed and archive unused ones.'] },
      { title: 'Assignment logic', items: ['Service tag → shift manager.', 'Food tag → executive or sous chef.', 'Delivery tag → operations lead.', 'Price tag → owner.', 'No review should be left unassigned.'] },
      { title: 'Bulk action', paragraphs: ['When several reviews share a tag, the panel filter enables bulk replies or bulk assignment. This makes post-holiday or post-campaign waves manageable.'] },
    ],
    checklist: ['The tag set is at most 8 categories.', 'Each tag has a default owner.', 'Unassigned ratio stays low.', 'Weekly tag distribution review happened.', 'Unused tags were archived.'],
    faq: [
      { q: 'Can a review have multiple tags?', a: 'Yes. If a review involves both service and delivery, both tags are applied and counted in each report.' },
      { q: 'Can I undo a wrong assignment?', a: 'Yes. Assignments can be changed and the audit log records who reassigned it.' },
    ],
  }),
  article('tr', 'review-management', 40, 'review-search-and-filters', 'Yorumları aramak ve filtrelemek', 'Tarih, yıldız, platform, etiket ve metin araması ile geri bildirimleri saniyeler içinde anlamlı kümelere indirgeyin.', ['arama', 'filtre', 'analiz', 'okuma'], {
    lead: 'Yorum sayısı arttığında her yorumu okumak gerçekçi değildir. Doğru filtre kombinasyonu, tek bir yorumda saatler harcamak yerine yüzlerce yorumun temasını bir bakışta görmenizi sağlar.',
    sections: [
      { title: 'Sık kullanılan kombinasyonlar', items: ['Son 7 gün + 1-3 yıldız: aciliyet listesi.', 'Son 30 gün + tek platform: kanal performansı.', 'Tüm zaman + tek etiket: kronik problem teşhisi.', 'Tarih + masa: yerel servis sorunu izlemek için.', 'Tarih + “porsiyon” gibi kelime araması: ürün geri bildirimi.'] },
      { title: 'Yer imi ve link paylaşımı', paragraphs: ['Filtre URL’nizde tutulduğu için linki ekiple paylaşabilirsiniz. Bu, “şu yorumu gör” demekten çok daha hızlıdır ve aynı bağlamı garanti eder.'] },
      { title: 'Filtre temizlik alışkanlığı', paragraphs: ['Beklenmedik bir rakam gördüğünüzde önce aktif filtreleri kontrol edin. Çoğu “bu rakam yanlış” iddiası unutulmuş bir filtre yüzündendir.'] },
    ],
    checklist: ['Aktif filtreler her sayfa açılışında görünür.', 'Filtre temizleme butonu kullanılıyor.', 'Filtreli URL kaydı yapıldı.', 'Metin araması mantıklı kelime köküyle yapıldı.', 'Sonuç sayısı boş ise filtreler gözden geçirildi.'],
    faq: [
      { q: 'Aynı anda birden fazla etiketle filtre yapılabilir mi?', a: 'Evet. Birden fazla etiket seçildiğinde sonuç bu etiketlerin en az birini içeren yorumları gösterir.' },
      { q: 'Metin araması ne kadar akıllı?', a: 'Şu an basit substring eşleşmesi yapar. Türkçe ek ve çekimler için kelime kökünü kullanmak daha geniş sonuç verir.' },
    ],
  }),
  article('en', 'review-management', 40, 'review-search-and-filters', 'Search and filter reviews effectively', 'Use date, star, platform, tag and text filters to turn hundreds of reviews into meaningful clusters.', ['search', 'filter', 'analysis', 'reading'], {
    lead: 'When review volume grows, reading every single one is unrealistic. The right filter combinations let you see the theme of hundreds of reviews instead of getting lost in one.',
    sections: [
      { title: 'Useful combinations', items: ['Last 7 days + 1-3 stars: urgency list.', 'Last 30 days + single platform: channel performance.', 'All time + single tag: chronic issue diagnosis.', 'Date + table: local service issue tracking.', 'Date + word search like “portion”: product feedback.'] },
      { title: 'Bookmark and share', paragraphs: ['Filters are stored in the URL, so you can share a link with the team. This is faster than describing a context, and ensures the same view.'] },
      { title: 'Filter hygiene', paragraphs: ['When a number looks wrong, check active filters first. Most “this is wrong” claims trace back to a forgotten filter.'] },
    ],
    checklist: ['Active filters are visible on every page load.', 'Reset filters button is used.', 'Filtered URLs are bookmarked.', 'Text search uses meaningful word stems.', 'Empty results trigger a filter review.'],
    faq: [
      { q: 'Can I filter by multiple tags at once?', a: 'Yes. Multiple selected tags return reviews matching at least one tag.' },
      { q: 'How smart is text search?', a: 'Currently it matches substrings. For Turkish endings, search by the word stem for broader results.' },
    ],
  }),
  article('tr', 'review-management', 50, 'weekly-review-ritual', 'Haftalık yorum okuma ritüeli', 'Yorum gelen kutusunu sadece bir kez bakılan yer olmaktan çıkarıp ekibin haftalık karar mekanizmasına dönüştürme.', ['ritüel', 'haftalık', 'toplantı', 'iş süreci'], {
    lead: 'Yorumlar günlük olarak gelir ama kararlar haftalık alınır. Doğru bir haftalık ritüel, geri bildirimlerin tek tek değil bir bütün olarak yorumlanmasını sağlar ve operasyonel iyileştirme döngüsü kurar.',
    sections: [
      { title: '30 dakikalık format', items: ['10 dk: Geçen haftanın özet kartları ve trendler.', '10 dk: Etiket dağılımı ve tekrar eden konular.', '5 dk: En düşük puanlı 3 yorumun okuması.', '5 dk: Bu hafta yapılacak somut değişiklik.', 'Toplantı sonrası karar bir Notion veya benzeri belgede.'] },
      { title: 'Kim katılmalı?', paragraphs: ['İşletme sahibi, vardiya yöneticisi, mutfak temsilcisi ve mümkünse müşteri ilişkileri sorumlusu. Az sayıda kişi ama doğru pozisyonlar; karar verebilecek kadar yetki masada olsun.'] },
      { title: 'Aksiyon takibi', paragraphs: ['Geçen hafta verilen kararın bu hafta hayata geçirilip geçirilmediği kontrol edilmeden ritüel sürdürülürse zamanla anlamını kaybeder. İlk gündem maddesi her zaman geçen haftanın aksiyonları olmalı.'] },
    ],
    checklist: ['Haftalık toplantı takvimde.', 'Format 30 dakikayı geçmiyor.', 'Karar maddeleri yazılı kayıt altında.', 'Her aksiyonun bir sahibi var.', 'Geçen haftanın aksiyonu kapatıldı.'],
    faq: [
      { q: 'Trafik az olan haftalarda toplantı atlanır mı?', a: 'Hayır, ama 15 dakikaya inilebilir. Ritmin bozulması alışkanlığın bozulmasına yol açar.' },
      { q: 'Ekibe yorumları okutmalı mıyım?', a: 'Olumlu yorumların paylaşılması motivasyon, olumsuzların makul ve eğitici şekilde paylaşılması ise gelişim sağlar.' },
    ],
  }),
  article('en', 'review-management', 50, 'weekly-review-ritual', 'A weekly review reading ritual', 'Turn the reviews inbox from a glance-once page into a weekly decision rhythm for the team.', ['ritual', 'weekly', 'meeting', 'process'], {
    lead: 'Reviews arrive daily, but decisions are weekly. A good weekly ritual ensures feedback is interpreted as a whole, not one comment at a time, and creates a real improvement loop.',
    sections: [
      { title: '30-minute format', items: ['10 min: last week’s summary cards and trends.', '10 min: tag distribution and repeated themes.', '5 min: read the three lowest-rated reviews aloud.', '5 min: one concrete change for the coming week.', 'Decision logged in Notion or similar.'] },
      { title: 'Who should attend?', paragraphs: ['Owner, shift manager, kitchen representative and if possible a customer-relations lead. Few people but the right ones; enough authority to decide on the spot.'] },
      { title: 'Action follow-up', paragraphs: ['If last week’s decision is not checked this week, the ritual quickly loses meaning. The first agenda item is always the previous week’s action items.'] },
    ],
    checklist: ['Weekly meeting is on the calendar.', 'Format does not exceed 30 minutes.', 'Decisions are written down.', 'Each action has an owner.', 'Last week’s actions are closed.'],
    faq: [
      { q: 'Can the meeting be skipped on slow weeks?', a: 'No, but it can shrink to 15 minutes. Breaking the rhythm breaks the habit.' },
      { q: 'Should the team read reviews?', a: 'Sharing positive reviews motivates the team; sharing negatives respectfully and educationally drives improvement.' },
    ],
  }),

  article('tr', 'integrations', 30, 'tripadvisor-foursquare', 'Tripadvisor, Foursquare ve diğer profilleri ele alma', 'Buaze’in doğrudan desteklediği platformlar dışında kalan profilleri nasıl yönlendirme akışına dahil edersiniz?', ['tripadvisor', 'foursquare', 'profil', 'entegrasyon'], {
    lead: 'Buaze; Google, Yemeksepeti, Getir ve Trendyol GO ile çalışan birinci sınıf platform yönlendirmeleri sunar. Tripadvisor, Foursquare veya niş bir rezervasyon platformu için ise yan kanal yaklaşımı uygundur.',
    sections: [
      { title: 'Yan kanal nedir?', paragraphs: ['Yan kanal, müşterinin yüksek puan sonrası yönlendirildiği ek profil bağlantısıdır. İçeride platform parametresi olarak tanımlı olmadığından, kart üzerindeki link bileşeniyle kurulur. Akış: önce yıldız → uygun ana platforma yönlendirme veya teşekkür ekranı → hemen altında “Tripadvisor’da paylaşmak ister misiniz?” gibi ek davet.'] },
      { title: 'Yorum hacmi ve kalitesi', items: ['Tripadvisor turist trafiğinin yüksek olduğu lokasyonlarda kritik.', 'Foursquare niş bir alanda hedef kitle yakaladıysa anlamlı.', 'Sosyal medya profilleri yorum yerine takip kazanır.', 'Maps özetleri zaten Google profilinde toplanır.', 'Boş profil yerine eksik kalan ana profili tamamlayın.'] },
      { title: 'Karar matrisi', paragraphs: ['Eğer ek profilden ayda 5’ten az yorum geliyorsa müşteri akışını dağıtmak yerine ana profilde toplamak daha verimlidir. Hacim 20+ olduğunda yan kanal yatırımı kendini geri öder.'] },
    ],
    checklist: ['Hangi profillerin canlı olduğu listelendi.', 'Aylık yorum hacmi ölçüldü.', 'Yan kanal yalnızca anlamlı profile yönlendiriyor.', 'Akış müşteriyi yormayacak şekilde sade.', 'Profil bağlantıları çalışıyor (mobil + masaüstü).'],
    faq: [
      { q: 'Tripadvisor entegrasyonu doğrudan eklenecek mi?', a: 'Talep yoğunlaşırsa değerlendirilir. Şu anda yan kanal yaklaşımı çoğu işletme için yeterlidir.' },
      { q: 'Aynı yorumun iki platforma gitmesi sorun mu?', a: 'Hayır, ama müşteriyi tekrar tekrar yazmaya zorlamayın. Kısa bir teşvik yeterli.' },
    ],
  }),
  article('en', 'integrations', 30, 'tripadvisor-foursquare', 'Handle Tripadvisor, Foursquare and other profiles', 'How to bring profiles outside Buaze’s first-class platform list into your redirect flow.', ['tripadvisor', 'foursquare', 'profile', 'integration'], {
    lead: 'Buaze ships first-class platform redirects for Google, Yemeksepeti, Getir and Trendyol GO. For Tripadvisor, Foursquare or a niche reservation platform, a side-channel approach works well.',
    sections: [
      { title: 'What is a side channel?', paragraphs: ['A side channel is an extra profile link offered after a high rating. Since it is not a built-in platform parameter, you set it up via a link card on the screen. Flow: stars → main platform redirect or thank-you → a follow-up like “Would you also share on Tripadvisor?”'] },
      { title: 'Volume and quality', items: ['Tripadvisor matters most in tourist-heavy locations.', 'Foursquare is meaningful where a niche audience uses it.', 'Social profiles bring follows, not reviews.', 'Maps summaries already aggregate via your Google profile.', 'Improve the main profile before adding empty side channels.'] },
      { title: 'Decision matrix', paragraphs: ['If a profile receives fewer than 5 reviews per month, it is more efficient to focus the main profile. Beyond 20+, side-channel investment pays back.'] },
    ],
    checklist: ['Active profiles are listed.', 'Monthly review volume is measured.', 'Side channels point to meaningful profiles only.', 'The flow stays simple for the customer.', 'Profile links work on mobile and desktop.'],
    faq: [
      { q: 'Will Tripadvisor become a first-class integration?', a: 'It is on the table when demand consolidates. The side-channel approach is enough for most operators today.' },
      { q: 'Is it a problem if a review goes to two platforms?', a: 'No, but do not push the customer to write twice. A short prompt is enough.' },
    ],
  }),
  article('tr', 'integrations', 40, 'csv-export-bi', 'CSV ile dış BI veya tablolarınıza aktarım', 'Yorumları CSV olarak indirip Excel, Google Sheets veya BI aracında ileri analiz yapın.', ['csv', 'export', 'bi', 'analiz'], {
    lead: 'Çoğu işletme aylık veya haftalık olarak CSV export ihtiyacı duyar. Bu, Buaze panelinde olmayan özel pivotlar veya muhasebe ile birleştirme gerektiren senaryolarda en hızlı yoldur.',
    sections: [
      { title: 'Export içeriği', paragraphs: ['CSV; tarih, restoran, masa, platform, yıldız, yorum metni, etiket ve müşteri iletişim bilgisi gibi temel alanları içerir. KVKK uyumu için kişisel veriler yalnızca yetkili kullanıcı tarafından alınmalı ve dış cihazlarda gereksiz tutulmamalıdır.'] },
      { title: 'Excel ve Sheets ipuçları', items: ['UTF-8 BOM ile açın, Türkçe karakter sorunları azalır.', 'Yıldız sütununu sayı olarak biçimlendirin.', 'Tarih sütununu yyyy-mm-dd formatında saklayın.', 'Pivot için platform ve etiket sütunları yeterlidir.', 'Filtre satırı eklemek temizliği kolaylaştırır.'] },
      { title: 'BI aracına aktarım', paragraphs: ['Looker Studio, Power BI veya Metabase için manuel CSV yerine zamanla webhook üzerinden veriyi akıtmak daha sağlıklıdır. Manuel export başlangıç için doğru, ölçek için kalıcı çözüm değildir.'] },
    ],
    checklist: ['CSV indirici yetkisi sınırlı.', 'Dosya yerel cihazda gereksiz kalmıyor.', 'Tarih ve yıldız format hatası yok.', 'Aylık export takvime alındı.', 'BI hedefi netleştirildiyse webhook planı çıkarıldı.'],
    faq: [
      { q: 'Export edilen veride sınır var mı?', a: 'Çok büyük partiler için filtre uygulayarak parça parça indirin. Tek seferde milyonlarca satır indirmek pratik değildir.' },
      { q: 'CSV otomatik yapılabilir mi?', a: 'Şu an manuel veya zamanlanmış scriptlerle yapılır. Daha sürdürülebilir akış için webhook + dış sistem önerilir.' },
    ],
  }),
  article('en', 'integrations', 40, 'csv-export-bi', 'Export CSV for spreadsheets and BI tools', 'Download reviews as CSV and run further analysis in Excel, Google Sheets or a BI tool.', ['csv', 'export', 'bi', 'analysis'], {
    lead: 'Many teams need monthly or weekly CSV exports. It is the fastest option when you need pivots that the panel does not provide, or when you must merge data with finance.',
    sections: [
      { title: 'What the export contains', paragraphs: ['CSV includes date, restaurant, table, platform, stars, review text, tags and customer contact details. For privacy compliance, only authorized users should download personal data, and files should not linger on devices.'] },
      { title: 'Excel and Sheets tips', items: ['Open with UTF-8 BOM to keep accented characters intact.', 'Format the star column as a number.', 'Keep dates in yyyy-mm-dd format.', 'Platform and tag columns are enough for pivots.', 'Add a filter row to ease cleanup.'] },
      { title: 'BI ingestion', paragraphs: ['For Looker Studio, Power BI or Metabase, switching from manual CSV to webhook-based ingestion is healthier over time. CSV is a fine starting point but not a long-term answer at scale.'] },
    ],
    checklist: ['Export permission is restricted.', 'Files are removed from devices when no longer needed.', 'No date/star format issues.', 'Monthly export is on the calendar.', 'A webhook plan exists if BI is critical.'],
    faq: [
      { q: 'Is the export size limited?', a: 'For very large batches, filter and download in parts. Pulling millions of rows at once is impractical.' },
      { q: 'Can the export be automated?', a: 'Currently via manual or scheduled scripts. For sustainable flow, prefer webhooks plus your warehouse or BI.' },
    ],
  }),
  article('tr', 'integrations', 50, 'google-maps-link-vs-place-id', 'Google Maps linki, Place ID ve doğrudan yorum URL’si arasındaki fark', 'Hangi formatın hangi senaryoya uyduğunu görerek yüksek puan yönlendirmesini doğru kanala kilitleyin.', ['google', 'maps', 'place id', 'link'], {
    lead: 'Google bağlantısı tek bir tip değildir. Maps linki, Place ID ve doğrudan write-review URL’si farklı davranır. Doğru olanı seçmek müşterinin yorumunun gerçekten profile düşmesini sağlar.',
    sections: [
      { title: 'Üç format', items: ['Place ID: Buaze tarafında write-review URL’sini otomatik üretir.', 'Maps linki: müşteriyi profil sayfasına götürür, yorum yazma adımını müşteri seçer.', 'Doğrudan write-review URL: yorum yazma kutusunu hemen açar.', 'Maps mobile deep link: Google Maps uygulaması açılır, web yerine.', 'Kısa link: zaman içinde bozulabilir, tercih etmeyin.'] },
      { title: 'Hangisi ne zaman?', paragraphs: ['Müşteriyi olabildiğince az tıkla yorum yazma ekranına götürmek istiyorsanız Place ID veya doğrudan write-review URL’si en uygunudur. Müşteriyi önce profil ve fotoğraflarla buluşturmak istiyorsanız Maps linki uygundur. Çoğu işletme için “en kısa yol” yaklaşımı doğru çalışır.'] },
      { title: 'Mobil davranış', paragraphs: ['Mobil tarayıcı + Google Maps uygulaması yüklü cihazlarda link Maps app’e yönlendirebilir. Bu beklenen bir davranıştır ve genellikle tarama oranını artırır. Test sırasında hem app yüklü hem app yüklü olmayan cihazda denemek faydalıdır.'] },
    ],
    checklist: ['Format bilinçli seçildi.', 'Mobil + masaüstü test edildi.', 'Tek profil, tek link.', 'Eski kısa linkler kaldırıldı.', 'Çoklu lokasyonda her şube ayrı ayarlandı.'],
    faq: [
      { q: 'Bir profilim yok, ne yapmalıyım?', a: 'Önce Google İşletme Profilini (Google Business Profile) oluşturun ve doğrulayın. Profil olmadan yorum yönlendirmesi çalışmaz.' },
      { q: 'Profil askıya alındıysa ne olur?', a: 'Müşteri bir hata sayfası görür. Profil yeniden aktif olana kadar Buaze’deki link’i pasifleştirin.' },
    ],
  }),
  article('en', 'integrations', 50, 'google-maps-link-vs-place-id', 'Google Maps link, Place ID or direct review URL', 'See which format fits which scenario so high-rating redirects always reach the right channel.', ['google', 'maps', 'place id', 'link'], {
    lead: 'A Google link is not a single thing. Maps link, Place ID and direct write-review URLs behave differently. Picking the right one ensures the customer actually lands on a review form.',
    sections: [
      { title: 'Three formats', items: ['Place ID: Buaze builds the write-review URL automatically.', 'Maps link: lands the customer on the profile; they choose to review.', 'Direct write-review URL: opens the review composer immediately.', 'Maps mobile deep link: opens the Google Maps app instead of web.', 'Shortened link: can break over time; avoid.'] },
      { title: 'Which when?', paragraphs: ['To minimize taps before review, prefer Place ID or the direct write-review URL. To show the profile and photos first, the Maps link is appropriate. The “shortest path” works for most operators.'] },
      { title: 'Mobile behavior', paragraphs: ['On mobile devices with Google Maps installed, the link can deep-link into the app. This is expected and generally increases scan-to-review conversion. Test on a device with and without the app to be safe.'] },
    ],
    checklist: ['Format chosen deliberately.', 'Mobile and desktop tested.', 'One profile, one link.', 'Old shortened links removed.', 'Each branch configured separately.'],
    faq: [
      { q: 'I do not have a Google profile yet.', a: 'Create and verify a Google Business Profile first. Without a verified profile, the redirect cannot work.' },
      { q: 'What if the profile is suspended?', a: 'The customer sees an error page. Disable the link in Buaze until the profile is restored.' },
    ],
  }),

  article('tr', 'team-roles', 30, 'multi-location-management', 'Çok şubeli işletmelerde ekip yönetimi', 'Birden fazla lokasyonu yönetirken kim hangi restoran verisini görmeli, kim sadece kendi şubesine odaklanmalı?', ['çoklu lokasyon', 'şube', 'ekip', 'erişim'], {
    lead: 'Tek şube ile üç şube arasındaki fark, üç katı yorum sayısı değil; karar verme sürecinin tamamen değişmesidir. Doğru ekip yapısı bu farkı sahiplenir, yanlış yapı da her şubeyi yavaş hale getirir.',
    sections: [
      { title: 'Şube müdürü modeli', paragraphs: ['Her şubenin bir manager rolü vardır ve sadece kendi restoran ID’sini görür. Düşük puan bildirimleri o şubeye düşer, raporlar şube bazında ayrılır. Genel müdür ise tüm restoranları toplu görüntüleyebilir.'] },
      { title: 'Yetki dağılım örneği', items: ['Genel müdür: owner rolü, tüm restoranlar.', 'Şube müdürü: manager rolü, tek restoran.', 'Bölge müdürü: manager rolü, 3-5 restoran.', 'Vardiya yöneticisi: staff rolü, tek restoran.', 'Müşteri ilişkileri: viewer rolü, tüm restoranlar.'] },
      { title: 'Karşılaştırmalı raporlar', paragraphs: ['Çok şubeli yapıda en kıymetli rapor şubeler arası karşılaştırmadır. Aynı dönemdeki ortalama yıldız, düşük puan oranı ve etiket dağılımı şube performansını sayısal hale getirir; ekibe net hedef konulmasını sağlar.'] },
    ],
    checklist: ['Her şubenin atanmış müdürü var.', 'Bölge müdürü kapsamı yazılı.', 'Karşılaştırmalı haftalık rapor mevcut.', 'Şubeler arası benchmark hedefler set edildi.', 'Şube kapanışında erişim güncel.'],
    faq: [
      { q: 'Bir şube açılırken kimi davet etmeliyim?', a: 'Önce şube müdürü manager rolüyle eklenmeli, ardından vardiya yöneticileri staff rolüyle. Erken davet edilen ekip kurulum aşamasında geri bildirimle gelir.' },
      { q: 'Bölge yapısı değiştiğinde nasıl güncellenir?', a: 'Manager rolünün restoran kapsamı düzenlenebilir; bölge müdürü için locations alanına yeni restoranlar eklenip kaldırılır.' },
    ],
  }),
  article('en', 'team-roles', 30, 'multi-location-management', 'Team management for multi-location operators', 'When you run multiple locations, decide who sees which restaurant and who focuses only on their branch.', ['multi-location', 'branch', 'team', 'access'], {
    lead: 'Going from one branch to three is not three times the reviews; it changes the decision-making process. The right team structure embraces that, the wrong one slows every branch down.',
    sections: [
      { title: 'Branch manager model', paragraphs: ['Each branch has a manager role scoped to that single restaurant ID. Low-rating notifications go to the right branch; reports stay separated. The general manager has access to all restaurants for an aggregate view.'] },
      { title: 'Example permission split', items: ['General manager: owner role, all restaurants.', 'Branch manager: manager role, single restaurant.', 'Regional manager: manager role, 3-5 restaurants.', 'Shift manager: staff role, single restaurant.', 'Customer relations: viewer role, all restaurants.'] },
      { title: 'Comparative reporting', paragraphs: ['The most valuable report at scale is branch-by-branch comparison. Average stars, low-rating ratio and tag distribution within the same window turn branch performance into numbers, enabling clear team targets.'] },
    ],
    checklist: ['Every branch has a named manager.', 'Regional manager scope is written down.', 'A weekly comparative report exists.', 'Branch benchmark targets are set.', 'Access is current at branch closures.'],
    faq: [
      { q: 'Who should I invite when launching a branch?', a: 'Add the branch manager first with the manager role, then shift managers as staff. Early invites generate setup-stage feedback.' },
      { q: 'How do I update when regions change?', a: 'Manager scope can be edited; for regional managers, update the locations field with the new set of restaurants.' },
    ],
  }),
  article('tr', 'team-roles', 40, 'access-review-monthly', 'Aylık erişim gözden geçirme', 'Ekibe kim hala erişiyor, kim erişmemeli? Aylık 15 dakikalık denetim süreci güvenliği canlı tutar.', ['erişim denetim', 'audit', 'güvenlik', 'rutin'], {
    lead: 'Erişim listesi zamanla şişer. Yeni gelen herkes davet edilir ama ayrılan herkes hatırlanmaz. Aylık 15 dakikalık disiplinli kontrol bu sessiz birikimi temizler.',
    sections: [
      { title: 'Kontrol noktaları', items: ['Son 30 günde giriş yapmamış kullanıcı.', 'Owner panelinde rolü değişen kullanıcı.', 'Aktif olmayan davet linkleri.', 'Şube kapanışı sonrası kalan erişim.', 'Eski telefon numarası ile bağlanmış kullanıcı.'] },
      { title: 'Karar matrisi', paragraphs: ['Son 30 günde giriş yok ve görev devam ediyor: kontrol et. Son 90 günde giriş yok: rolü daralt veya kaldır. Çıkış yapmış personel: hemen revoke. Bu basit kural, çoğu küçük ekip için yeterli güvenlik sağlar.'] },
      { title: 'Belgeleme', paragraphs: ['Aylık denetimin sonucu küçük bir Notion belgesinde tutulduğunda KVKK denetiminde kanıt değeri taşır ve bir sonraki ay başlangıç noktası verir.'] },
    ],
    checklist: ['Son giriş tarihi gözden geçirildi.', 'Pasif kullanıcılar revoke edildi.', 'Ayrılan personel listesi karşılaştırıldı.', 'Bekleyen davetler temizlendi.', 'Denetim notu dosyalandı.'],
    faq: [
      { q: 'Pasif kullanıcıyı silmek yerine pasifleştirebilir miyim?', a: 'Evet. İşten ayrılma kesin değilse veya geri dönüş ihtimali varsa rolü daraltıp pasif tutmak makul bir orta yoldur.' },
      { q: 'Audit log nereye düşer?', a: 'Önemli erişim değişiklikleri sistem audit log’unda kaydedilir; bu kayıtlar denetimde paylaşılabilir.' },
    ],
  }),
  article('en', 'team-roles', 40, 'access-review-monthly', 'Monthly access review', 'Who still has access, and who should not? A 15-minute monthly review keeps security alive.', ['access review', 'audit', 'security', 'routine'], {
    lead: 'Access lists drift up over time. Everyone new gets invited, but not everyone who leaves is remembered. A disciplined 15-minute monthly review clears this silent accumulation.',
    sections: [
      { title: 'Checkpoints', items: ['Users without a login in the last 30 days.', 'Users whose role changed in the owner panel.', 'Inactive invite links.', 'Lingering access after a branch closure.', 'Users tied to outdated phone numbers.'] },
      { title: 'Decision matrix', paragraphs: ['No login for 30 days but the role is still needed: check in. No login for 90 days: tighten or remove. Departed staff: revoke immediately. This simple rule is enough security for most small teams.'] },
      { title: 'Documentation', paragraphs: ['Logging the result of the monthly review in a short Notion doc gives compliance a paper trail and gives next month a starting point.'] },
    ],
    checklist: ['Last login dates were checked.', 'Inactive users were revoked.', 'A list of departed staff was matched.', 'Pending invites were cleaned up.', 'Audit notes were filed.'],
    faq: [
      { q: 'Can I disable instead of delete?', a: 'Yes. If departure is uncertain or rejoining is likely, scoping down the role and disabling is a reasonable middle ground.' },
      { q: 'Where do audit logs live?', a: 'Critical access changes are written to the system audit log and can be shared during a compliance review.' },
    ],
  }),
  article('tr', 'team-roles', 50, 'team-onboarding-checklist', 'Yeni ekip üyesi ilk hafta kontrol listesi', 'Yeni katılan operasyon arkadaşının paneli verimli kullanmaya başlaması için 5 günlük adım planı.', ['onboarding', 'eğitim', 'yeni ekip', 'pratik'], {
    lead: 'Yeni ekip üyesi davet edildiği an verimli olmaz. İlk hafta planlı yapılırsa yorum okuma, yanıt yazma ve filtre kullanımı doğal alışkanlıklara dönüşür; planlı yapılmazsa panel tek seferlik tıklamaya kalır.',
    sections: [
      { title: '5 günlük plan', items: ['Gün 1: Hesap, rol ve mobil tarayıcı testi.', 'Gün 2: Yorum okuma ve filtreler.', 'Gün 3: Yanıt yazma, AI taslak kullanımı.', 'Gün 4: Etiketleme ve atama akışı.', 'Gün 5: Haftalık toplantıya katılım, kendi sorumluluğunu sahiplenme.'] },
      { title: 'Mentörlük', paragraphs: ['İlk hafta için bir mentor atayın. Mentor günde 5 dakika kontrol etse bile yeni ekip üyesinin sorularına hızlı cevap vermesi öğrenmeyi hızlandırır.'] },
      { title: 'Ölçüm', paragraphs: ['İlk hafta sonunda yeni üyenin yazdığı yanıt sayısı, kullandığı filtre sayısı ve aldığı atama sayısı küçük göstergelerdir. Hedef bir performans ölçümü değil, alışkanlık oluştuğunu doğrulamaktır.'] },
    ],
    checklist: ['Hesap ve rol doğru.', 'Mobil + masaüstü test edildi.', 'En az 3 yanıt deneyimi yapıldı.', 'Mentor günlük check-in yaptı.', 'İlk haftalık toplantıya katıldı.'],
    faq: [
      { q: 'Yarı zamanlı çalışan için süre kısaltmalı mıyım?', a: 'Hayır, ama günlük adımları haftalara yayabilirsiniz. Önemli olan sıralı ilerleme.' },
      { q: 'Onboarding belgesi nereye konmalı?', a: 'İşletme içi şirket wiki’si en uygun yer. Kişiye özel link gönderip ilk hafta açtığını gözlemleyin.' },
    ],
  }),
  article('en', 'team-roles', 50, 'team-onboarding-checklist', 'A first-week onboarding checklist for new teammates', 'A 5-day plan that turns a freshly invited teammate into a productive panel user.', ['onboarding', 'training', 'new hire', 'practice'], {
    lead: 'A new teammate is not productive on day one. With a planned first week, reading reviews, writing replies and using filters become natural habits. Without a plan, the panel turns into a one-time click.',
    sections: [
      { title: '5-day plan', items: ['Day 1: account, role and mobile browser test.', 'Day 2: reading reviews and filters.', 'Day 3: writing replies, using AI drafts.', 'Day 4: tagging and assignment flow.', 'Day 5: weekly meeting attendance and ownership.'] },
      { title: 'Mentorship', paragraphs: ['Assign a mentor for the first week. Even five minutes a day from a mentor accelerates learning by answering questions on the spot.'] },
      { title: 'Measurement', paragraphs: ['Replies written, filters used and assignments handled in the first week are small but useful signals. The aim is not performance evaluation but confirming the habit took hold.'] },
    ],
    checklist: ['Account and role are correct.', 'Mobile and desktop tested.', 'At least three replies practiced.', 'Mentor checked in daily.', 'First weekly meeting attended.'],
    faq: [
      { q: 'Should I shorten this for part-time staff?', a: 'No, but you can spread daily steps across weeks. The order matters more than the speed.' },
      { q: 'Where should the onboarding doc live?', a: 'In your company wiki. Share a personal link and confirm the new hire opened it during week one.' },
    ],
  }),

  article('tr', 'billing', 30, 'usage-thresholds-alerts', 'Kullanım eşikleri ve faturalama uyarıları', 'Plan limitlerine yaklaşırken sürpriz faturayla karşılaşmamak için izlenmesi gereken sinyaller.', ['kullanım', 'eşik', 'limit', 'uyarı'], {
    lead: 'Faturada sürpriz olmamasının yolu kullanımı sezgiyle değil sayısal olarak izlemektir. Doğru eşikler tanımlandığında ekip, plan yükseltme veya optimizasyon kararını zamanında alır.',
    sections: [
      { title: 'İzlenmesi gereken metrikler', items: ['Aylık aktif yorum sayısı.', 'AI Co-Pilot taslak sayısı.', 'API çağrı hacmi.', 'Aktif restoran ve ekip üye sayısı.', 'Webhook teslim adedi.'] },
      { title: 'Eşik mantığı', paragraphs: ['Plan limitinin yüzde 70’i aşıldığında ekibe haber verecek hafif bir uyarı (renk veya rozet), yüzde 90’da ise eyleme zorlayan bir bildirim mantıklıdır. Bu sayede ay sonuna birkaç gün kala plan yükseltme kararı sakince alınır.'] },
      { title: 'Kullanımı düşürme', paragraphs: ['Bazı durumlarda yükseltme yerine optimizasyon yeterlidir: pasif restoranları arşivleyin, kullanılmayan webhook’ları kapatın, gereksiz API çağrılarını cache’leyin.'] },
    ],
    checklist: ['Eşik politikası yazılı.', 'Yüzde 70 ve 90 hatırlatması aktif.', 'Pasif restoranlar arşivlendi.', 'API çağrı hacmi izleniyor.', 'Yükseltme kararı 5 gün önceden alınıyor.'],
    faq: [
      { q: 'Eşik aşıldığında otomatik yükseltme yapılır mı?', a: 'Hayır. Plan değişiklikleri her zaman manuel onayla gerçekleşir. Bu, sürpriz fatura riskini ortadan kaldırır.' },
      { q: 'Eşik bildirimini sadece yöneticiye yönlendirebilir miyim?', a: 'Evet. Bildirim e-postası ekip üyelerine değil yalnızca yetkili kişiye gidecek şekilde ayarlanmalıdır.' },
    ],
  }),
  article('en', 'billing', 30, 'usage-thresholds-alerts', 'Usage thresholds and billing alerts', 'Track the right signals so you never get surprised by an end-of-month bill.', ['usage', 'threshold', 'limit', 'alert'], {
    lead: 'Avoiding billing surprises is a numerical exercise, not a gut feel. With clear thresholds, the team makes upgrade or optimization decisions on time.',
    sections: [
      { title: 'Metrics worth tracking', items: ['Monthly active reviews.', 'AI Co-Pilot draft count.', 'API call volume.', 'Active restaurants and team members.', 'Webhook delivery count.'] },
      { title: 'Threshold logic', paragraphs: ['At 70% of plan limit, a soft signal (color or badge) is enough. At 90%, an action-forcing notification helps. This pattern lets the team make plan changes calmly a few days before month end.'] },
      { title: 'Reducing usage', paragraphs: ['Sometimes optimization is enough instead of upgrading: archive inactive restaurants, disable unused webhooks, cache unnecessary API calls.'] },
    ],
    checklist: ['Threshold policy is written down.', '70% and 90% reminders are active.', 'Inactive restaurants archived.', 'API call volume tracked.', 'Upgrade decisions made 5 days early.'],
    faq: [
      { q: 'Does the system upgrade automatically when a threshold is crossed?', a: 'No. Plan changes always require manual confirmation. This eliminates surprise charges.' },
      { q: 'Can I send threshold notifications to the manager only?', a: 'Yes. Notification emails should go to authorized people, not the whole team.' },
    ],
  }),
  article('tr', 'billing', 40, 'invoice-vat-and-titles', 'Fatura unvanı, KDV ve şirket bilgisi düzenleme', 'Faturada doğru şirket unvanı, vergi numarası ve KDV oranını set ederek muhasebe sürtünmesini ortadan kaldırın.', ['fatura', 'kdv', 'unvan', 'vergi'], {
    lead: 'Yanlış faturada sürpriz değil, geri çağırma süreci ve muhasebe kapatma gecikmesi yatar. Bu sebeple ilk faturadan önce şirket bilgilerinin doğru olduğundan emin olmak en iyi yatırımdır.',
    sections: [
      { title: 'Tutulması gereken alanlar', items: ['Şirket unvanı (ticari sicile göre).', 'Vergi dairesi ve vergi numarası.', 'Adres (vergi dairesi ile uyumlu).', 'Yetkili kişi ve e-posta.', 'Fatura iletişim adresi (genel adresten farklıysa).'] },
      { title: 'KDV ve oran', paragraphs: ['SaaS faturalandırması Türkiye’de genellikle yüzde 20 KDV oranıyla işlenir. İşletmenizin yurt dışı kaynaklı bir hizmet aldığı senaryolarda muhasebenizle KDV reverse-charge mekanizmasını gözden geçirin.'] },
      { title: 'Geriye dönük düzeltme', paragraphs: ['Yanlış basılmış faturanın geriye dönük düzeltilmesi mümkündür ama zaman alır. Önce yeni dönem için doğru bilgilerin set edildiğinden emin olup destek ekibine geçmiş kayıtların düzeltilmesini bildirebilirsiniz.'] },
    ],
    checklist: ['Şirket unvanı ticari sicille birebir.', 'Vergi dairesi/numarası kontrol edildi.', 'Yetkili kişi ve fatura e-postası set.', 'KDV oranı muhasebeyle uyumlu.', 'İlk fatura sonrası muhasebe kontrolü yapıldı.'],
    faq: [
      { q: 'Şahıs şirketi olarak faturalandırılabilir miyim?', a: 'Evet. Sadece vergi numarası yerine TC kimlik bilgisi muhasebe ile koordine edilerek girilmelidir.' },
      { q: 'Yurt dışı kart ile öderken KDV nasıl uygulanır?', a: 'Ödeme aracının fatura çıkarma akışı KDV’yi otomatik hesaplar; özel durumlar için muhasebenizle çalışmak en güvenli yoldur.' },
    ],
  }),
  article('en', 'billing', 40, 'invoice-vat-and-titles', 'Invoice title, VAT and company details', 'Set the correct company title, tax ID and VAT rate so finance does not have to chase corrections later.', ['invoice', 'vat', 'title', 'tax'], {
    lead: 'A wrong invoice is not just a surprise; it delays month-end close and triggers reissue requests. Verifying details before the first invoice is the highest-leverage step.',
    sections: [
      { title: 'Fields to keep accurate', items: ['Company title (per commercial registry).', 'Tax office and tax ID.', 'Address consistent with the tax office record.', 'Authorized contact and email.', 'Billing address if different from main.'] },
      { title: 'VAT and rates', paragraphs: ['SaaS billing in Turkey is generally subject to 20% VAT. For cross-border services, review the reverse-charge mechanism with your accountant.'] },
      { title: 'Retroactive corrections', paragraphs: ['Reissuing past invoices is possible but takes time. First confirm the new period is correct, then ask support to correct historical records.'] },
    ],
    checklist: ['Title matches commercial registry exactly.', 'Tax office and ID confirmed.', 'Authorized contact and email set.', 'VAT rate aligned with finance.', 'First invoice was reviewed by finance.'],
    faq: [
      { q: 'Can I bill as a sole proprietor?', a: 'Yes. Coordinate with finance whether to provide tax ID or national ID for invoicing.' },
      { q: 'How is VAT handled with foreign cards?', a: 'The payment provider handles VAT automatically. For edge cases, run it past your accountant.' },
    ],
  }),
  article('tr', 'billing', 50, 'annual-vs-monthly-plans', 'Aylık plan mı yıllık plan mı?', 'Yıllık ödeme indirimi cazip ama her senaryoda doğru değildir. Hangi durumda aylık, hangi durumda yıllık seçmek mantıklı?', ['yıllık', 'aylık', 'plan', 'karar'], {
    lead: 'Plan döngüsü seçimi yalnızca fiyat değil, esneklik kararıdır. Yıllık ödeme genelde indirim sunar; aylık ödeme ise iş modeli henüz oturmamış işletmelere esneklik sağlar.',
    sections: [
      { title: 'Yıllık plan kimin için?', items: ['Yorum hacmi istikrarlı.', 'Birden fazla şubede aktif kullanım.', 'Ekip rolleri yerleşmiş.', 'Pulse AI taslakları rutine girmiş.', 'Yıl içinde kapanış riski düşük.'] },
      { title: 'Aylık plan kimin için?', paragraphs: ['Yeni açılan işletme, kampanya bazlı kısa süreli kullanım planı ya da yatırım kararı henüz oturmamış senaryolar için aylık plan daha makuldür. Birkaç ay sonra istikrar görüldüğünde yıllık plana geçilebilir.'] },
      { title: 'Geçiş ve iade', paragraphs: ['Aylıktan yıllığa geçiş genellikle hızlıdır ve indirim hemen başlar. Yıllık plandan aylığa dönmek mümkün ama orantılı iade kuralları sözleşmede belirlenir; geçişten önce destek ekibiyle teyit etmek doğru olur.'] },
    ],
    checklist: ['Karar yorum hacmi ile uyumlu.', 'Esneklik ihtiyacı netleştirildi.', 'Yenileme tarihi takvimde.', 'Geçiş şartları okundu.', 'Muhasebe akış uyumlu.'],
    faq: [
      { q: 'Yıllık plana geçince hemen tüm yıl ödeniyor mu?', a: 'Evet, çoğu durumda yıllık ödeme tek seferde yapılır. Bu yüzden indirim oranı anlamlıdır.' },
      { q: 'Yıllık planı bitmeden iptal edersem ne olur?', a: 'Sözleşme şartları belirleyicidir. Genelde kullanılan dönem hariç orantılı iade veya kredi sunulur.' },
    ],
  }),
  article('en', 'billing', 50, 'annual-vs-monthly-plans', 'Annual or monthly plan?', 'Annual discounts are tempting but not always right. When to choose monthly, when to commit annually.', ['annual', 'monthly', 'plan', 'decision'], {
    lead: 'Choosing the billing cycle is a flexibility decision, not just a price one. Annual usually gives a discount; monthly gives flexibility while the model is still settling.',
    sections: [
      { title: 'Annual fits when', items: ['Review volume is steady.', 'Multiple branches are actively using the panel.', 'Team roles are stable.', 'Pulse AI drafts are part of the routine.', 'Closure risk during the year is low.'] },
      { title: 'Monthly fits when', paragraphs: ['New launches, short campaign usage or scenarios where the investment thesis is still being validated. After a few stable months, you can move to annual.'] },
      { title: 'Switching and refunds', paragraphs: ['Monthly to annual is usually fast and the discount kicks in immediately. Returning from annual to monthly is possible but pro-rata refund rules are defined in the contract; check with support before changing.'] },
    ],
    checklist: ['Decision matches review volume.', 'Flexibility need is clear.', 'Renewal date is on the calendar.', 'Switch terms are read.', 'Finance flow aligned.'],
    faq: [
      { q: 'Is annual paid all at once?', a: 'Yes, in most cases. That is why the discount is meaningful.' },
      { q: 'What if I cancel an annual plan early?', a: 'Contract terms apply. Usually pro-rata refund or credit is offered for the unused period.' },
    ],
  }),

  article('tr', 'api-webhook', 30, 'rate-limit-strategy', 'Rate limit ile dostluk', '429 hatası almamak için istek hızını planlama, retry-backoff kurma ve toplu işlemleri parçalama.', ['rate limit', 'backoff', 'retry', 'api'], {
    lead: 'Rate limit, sistemi koruyan bir mekanizmadır; düşman değildir. Doğru kullanılırsa hem entegrasyonunuz daha güvenilir olur hem de Buaze tarafında genel performans korunur.',
    sections: [
      { title: 'Tipik limitler', paragraphs: ['Çoğu endpoint dakika başına orta seviye bir istek tavanına sahiptir. AI Co-Pilot gibi maliyetli endpoint’lerde tavan daha düşüktür ve workspace owner seviyesinde keylenir, böylece bir ekip üyesi quota’yı tek başına tüketemez.'] },
      { title: 'Sağlıklı istek deseni', items: ['Ardışık istekler arasında 100-300 ms boşluk.', 'Toplu görevleri 50’şerli batch’lere bölün.', 'Cache kullanın: aynı veriyi 5 dakikada tekrar istemeyin.', 'Backoff: 429 alındığında 2-4-8 sn beklemeyle retry.', 'Retry sayacı 3’ü geçmesin, sonra alarm yakın.'] },
      { title: 'Operasyonel izleme', paragraphs: ['Entegrasyon tarafında 429 oranını dashboard’a yazın. Yüksek orana ulaşırsa bu, performans sorunu değil tasarım sorunudur ve istek mimarisi gözden geçirilmelidir.'] },
    ],
    checklist: ['429 oranı dashboardda izleniyor.', 'Backoff stratejisi kodlandı.', 'Toplu işlem batch boyutu belirlendi.', 'Cache TTL set edildi.', 'Alarm 3+ retry sonrası tetikleniyor.'],
    faq: [
      { q: '429 alırsam veri kaybolur mu?', a: 'Hayır. Doğru kurulmuş retry mekanizması isteği yeniden gönderir. Veri kaybı tasarım hatasıdır, limitin kendisi sebep değildir.' },
      { q: 'Limit yükseltilebilir mi?', a: 'Belirli iş senaryoları için destek ekibiyle değerlendirilebilir. Önce mevcut deseni optimize etmek önerilir.' },
    ],
  }),
  article('en', 'api-webhook', 30, 'rate-limit-strategy', 'Make peace with rate limits', 'Plan request pacing, retry-backoff and batch sizes so 429 stops being a problem.', ['rate limit', 'backoff', 'retry', 'api'], {
    lead: 'Rate limits protect the system; they are not the enemy. Used correctly, your integration becomes more reliable and overall Buaze performance stays healthy.',
    sections: [
      { title: 'Typical limits', paragraphs: ['Most endpoints have a moderate per-minute ceiling. Costly endpoints like AI Co-Pilot have a lower ceiling, keyed at workspace owner level so a single team member cannot exhaust the quota alone.'] },
      { title: 'Healthy request pattern', items: ['Add 100-300 ms between sequential requests.', 'Split bulk jobs into batches of 50.', 'Cache: do not re-request the same data within 5 minutes.', 'Backoff: on 429, wait 2-4-8 seconds before retry.', 'Stop after 3 retries and raise an alarm.'] },
      { title: 'Operational monitoring', paragraphs: ['Track 429 ratio on your integration dashboard. A high ratio is a design issue, not a performance one; revisit your request architecture.'] },
    ],
    checklist: ['429 ratio is tracked.', 'Backoff strategy is implemented.', 'Batch size is defined.', 'Cache TTL is set.', 'Alarm fires after 3+ retries.'],
    faq: [
      { q: 'Will I lose data on 429?', a: 'No. A correct retry mechanism re-sends the request. Data loss is a design flaw, not a consequence of the limit.' },
      { q: 'Can the limit be raised?', a: 'For specific business scenarios, talk to support. First optimize the request pattern.' },
    ],
  }),
  article('tr', 'api-webhook', 40, 'webhook-payload-anatomy', 'Webhook payload anatomisi', 'Buaze webhook teslimatlarını okumak, doğrulamak ve dış sistemde işlemek için temel alanlar.', ['payload', 'webhook', 'json', 'event'], {
    lead: 'Webhook entegrasyonunun başarılı olması ham JSON gönderimine değil, payload’un doğru anlaşılmasına bağlıdır. Standart alanları bilmek sürpriz olasılığını azaltır.',
    sections: [
      { title: 'Standart alanlar', items: ['eventId: idempotency için benzersiz id.', 'eventType: feedback.created, feedback.lowRating gibi.', 'occurredAt: ISO 8601 UTC zaman damgası.', 'restaurantId: olayın ait olduğu restoran.', 'data: olay özelinde dolan içerik bloğu.'] },
      { title: 'İdempotency uygulaması', paragraphs: ['Aynı eventId’nin işlemi tekrarlanmamalıdır. Dış sistemde bir tablo veya cache ile son işlenen eventId kümesini tutun. Çok büyük hacimlerde TTL bazlı cache yeterlidir.'] },
      { title: 'Yanıt kuralları', paragraphs: ['Webhook endpoint’iniz 200 OK ile 5 saniyeden önce yanıt vermelidir. Ağır iş yapıyorsanız önce yanıt verin, ardından arka planda kuyruğa alıp işleyin. Aksi halde sistem retry tetikler ve duplicate işleme riski artar.'] },
    ],
    checklist: ['eventId tablosu var.', 'occurredAt UTC olarak işleniyor.', 'Endpoint 5 sn altında 200 OK döner.', 'Bilinmeyen eventType graceful handle ediliyor.', 'Yanıt kodları izleniyor.'],
    faq: [
      { q: 'Olmayan bir alanı işlersem hata olur mu?', a: 'Yeni alanlar zamanla eklenebilir. Bilinmeyen alanları yok saymak, ileride uyumlu kalmanın en iyi yoludur.' },
      { q: 'Sıralama garanti mi?', a: 'Hayır. Genelde sıralı gelir ama ağ koşulları sıraya etki eder. occurredAt alanına dayanarak işleme tarihini tutun.' },
    ],
  }),
  article('en', 'api-webhook', 40, 'webhook-payload-anatomy', 'Anatomy of a webhook payload', 'Read, verify and process Buaze webhook deliveries with the right field expectations.', ['payload', 'webhook', 'json', 'event'], {
    lead: 'A successful webhook integration depends not on raw JSON delivery but on understanding the payload. Knowing the standard fields removes surprises.',
    sections: [
      { title: 'Standard fields', items: ['eventId: unique id for idempotency.', 'eventType: e.g. feedback.created, feedback.lowRating.', 'occurredAt: ISO 8601 UTC timestamp.', 'restaurantId: scope of the event.', 'data: event-specific payload block.'] },
      { title: 'Idempotency in practice', paragraphs: ['Never reprocess the same eventId. Keep a recent eventId set in a table or cache. At very high volume, a TTL-based cache is enough.'] },
      { title: 'Response rules', paragraphs: ['Your endpoint must return 200 OK in under 5 seconds. For heavy work, accept first and process via a background queue. Otherwise the system retries and duplicate processing risk grows.'] },
    ],
    checklist: ['eventId table exists.', 'occurredAt processed as UTC.', 'Endpoint replies 200 within 5 seconds.', 'Unknown eventType handled gracefully.', 'Response codes are monitored.'],
    faq: [
      { q: 'What if I process a missing field?', a: 'Fields can be added over time. Ignoring unknown fields is the safest forward-compatibility pattern.' },
      { q: 'Is order guaranteed?', a: 'No. It is usually sequential, but network conditions affect order. Track processing time using occurredAt.' },
    ],
  }),
  article('tr', 'api-webhook', 50, 'sandbox-and-staging', 'Sandbox ve staging ile entegrasyon test rejimi', 'Üretime çıkmadan önce API ve webhook akışlarını izole bir ortamda doğrulama yöntemi.', ['sandbox', 'staging', 'test', 'qa'], {
    lead: 'Üretim trafiğine canlı entegrasyon testi yapmak hem riskli hem de sıkıcıdır. Doğru test rejimi, ekibin entegrasyon değişikliklerinde gece yarısı uyandırılmamasını sağlar.',
    sections: [
      { title: 'Üç katmanlı yaklaşım', items: ['Local: birim testler ve mock istemci.', 'Staging: gerçek API ile izole test verisi.', 'Production: yalnız iş gözden geçirmesi sonrası.', 'Smoke test: her deploy sonrası 5 senaryo.', 'Regression: sürüm öncesi tam set.'] },
      { title: 'Veri izolasyonu', paragraphs: ['Staging’de gerçek müşteri verisi olmamalı. Synthetic veri seti veya anonimleştirilmiş örnek kullanın. Aksi halde KVKK uyumu zorlaşır ve operasyon raporları gürültülenir.'] },
      { title: 'Yayın anahtarı', paragraphs: ['Üretim API anahtarı staging’de kullanılmamalı. Her ortam kendi anahtarına sahip olmalı; sızdırma riski sınırlanır, log’larda hangi ortamın işlem yaptığı hızlı tespit edilir.'] },
    ],
    checklist: ['Her ortam kendi API anahtarıyla.', 'Staging’de gerçek müşteri verisi yok.', 'Smoke test scripti deploy hattına bağlandı.', 'Regression seti dokümante.', 'Test başarısız ise deploy bloklanıyor.'],
    faq: [
      { q: 'Sandbox tarafında müşteri yoksa webhook nasıl çalışır?', a: 'Synthetic feedback üretip event tetikleyebilirsiniz. Çoğu ekip seed script ile bu akışı otomatik kuruyor.' },
      { q: 'Staging’den production’a veri taşınabilir mi?', a: 'Tam tersi yön (production → staging) anonimleştirilerek mümkündür ve daha sağlıklıdır. Staging’den production’a veri kopyalamayın.' },
    ],
  }),
  article('en', 'api-webhook', 50, 'sandbox-and-staging', 'Sandbox and staging for safer integrations', 'Verify API and webhook flows in an isolated environment before they reach production.', ['sandbox', 'staging', 'test', 'qa'], {
    lead: 'Testing integrations against live production traffic is risky and exhausting. A proper test regime keeps the team from being woken up at 3 AM after an integration change.',
    sections: [
      { title: 'Three-layer approach', items: ['Local: unit tests and mock client.', 'Staging: real API with isolated data.', 'Production: only after a business review.', 'Smoke test: 5 scenarios after every deploy.', 'Regression: full set before a release.'] },
      { title: 'Data isolation', paragraphs: ['Staging should not contain real customer data. Use a synthetic dataset or anonymized samples. Otherwise privacy compliance gets harder and operational reports become noisy.'] },
      { title: 'Environment keys', paragraphs: ['Never use a production API key in staging. Each environment should have its own. Leak risk is bounded, and logs make it easy to identify the source environment.'] },
    ],
    checklist: ['Each environment uses its own API key.', 'No real customer data in staging.', 'Smoke test script wired into the deploy pipeline.', 'Regression set is documented.', 'Failing tests block deploy.'],
    faq: [
      { q: 'How do I test webhooks if there are no customers in sandbox?', a: 'Generate synthetic feedback and trigger events. Most teams automate this via seed scripts.' },
      { q: 'Can I copy data from staging to production?', a: 'Reverse direction (production → staging) is possible and healthier when anonymized. Do not copy from staging to production.' },
    ],
  }),

  article('tr', 'security-kvkk', 30, 'export-and-pii', 'Export, PII ve dış cihaz hijyeni', 'CSV indirmeleri ve müşteri verisi içeren raporları güvenli paylaşmak için pratik bir hijyen rehberi.', ['export', 'pii', 'kvkk', 'paylaşım'], {
    lead: 'Müşteri verisi panel içinde sıkı erişim kontrolüyle korunur. Dosya export edildiği an bu koruma kaybolur ve sorumluluk dosyayı indiren kişiye geçer. Bu sebeple export hijyeni günlük güvenliğin görünmez ama kritik bir parçasıdır.',
    sections: [
      { title: 'Export kararı', paragraphs: ['Her CSV export ihtiyacının önce panelde mevcut bir filtre ile karşılanıp karşılanmadığı kontrol edilmelidir. İhtiyaç gerçekse, export sebebini ve kimin paylaşacağını yazılı kayda almak ileride denetim için kolaylık sağlar.'] },
      { title: 'Paylaşım kanalı', items: ['Şifresiz e-posta yerine güvenli depolama linki.', 'Linke süre sınırı koyun (24-48 saat).', 'İndiren kişi listelenebilir bir yerde tutulsun.', 'Asla genel bir Slack kanalına yüklemeyin.', 'Müşteri verisi cihazda 30 günden uzun durmasın.'] },
      { title: 'Cihaz hijyeni', paragraphs: ['Dosya iş bittikten sonra silinmelidir. Çöp kutusunu boşaltmayı, otomatik bulut sync’ini kontrol etmeyi ve mobil cihazlardan kopyaları temizlemeyi unutmayın.'] },
    ],
    checklist: ['Export sebebi yazılı.', 'Paylaşım güvenli kanaldan.', 'Linkin süresi sınırlı.', 'İş bitince dosya silindi.', 'Aylık erişim denetimine eklendi.'],
    faq: [
      { q: 'Müşteriye kendi yorumunu nasıl gösteririm?', a: 'Müşteri kendi verisi için talep iletebilir; bu talepler manuel ve KVKK uyumlu süreçle yanıtlanmalıdır.' },
      { q: 'Export sayısını kısıtlayabilir miyim?', a: 'Rol bazlı erişim ve aylık denetim ile pratikte kısıtlanır. Ek olarak ekiple net bir export politikası belirlemek faydalıdır.' },
    ],
  }),
  article('en', 'security-kvkk', 30, 'export-and-pii', 'Exports, PII and device hygiene', 'A practical hygiene guide for safely sharing CSVs and reports that contain customer data.', ['export', 'pii', 'gdpr', 'sharing'], {
    lead: 'Customer data is protected by strict access control inside the panel. The moment a file is exported, that protection ends and responsibility shifts to the person who downloaded it. Export hygiene is invisible but critical.',
    sections: [
      { title: 'Deciding to export', paragraphs: ['Before any CSV export, check if a panel filter already meets the need. If a real export is needed, log the reason and the recipient — it pays back during audit.'] },
      { title: 'Sharing channel', items: ['Use a secure storage link, never plain email.', 'Add a 24-48 hour expiration to the link.', 'Track who downloaded it.', 'Never post in a general Slack channel.', 'Do not keep customer data on the device beyond 30 days.'] },
      { title: 'Device hygiene', paragraphs: ['Delete the file when the work is done. Empty trash, check automatic cloud sync, and remove copies from mobile devices.'] },
    ],
    checklist: ['Export reason is logged.', 'Sharing uses a secure channel.', 'Link has an expiration.', 'File deleted after use.', 'Added to monthly access review.'],
    faq: [
      { q: 'How do I show a customer their own data?', a: 'Customers can request their data; respond manually with a privacy-compliant process.' },
      { q: 'Can I cap the number of exports?', a: 'Effectively yes through role-based access and monthly review. A clear export policy with the team helps.' },
    ],
  }),
  article('tr', 'security-kvkk', 40, 'incident-response-basics', 'Olay yanıtı (incident response) temel akışı', 'Olası bir veri sızıntısı veya yetkisiz erişim şüphesinde ilk 24 saatte yapılması gerekenler.', ['incident', 'sızıntı', 'kvkk', 'yanıt'], {
    lead: 'Olayın kendisinden çok, olaya nasıl yanıt verildiği itibara şekil verir. Acele edip yanlış adım atmak ile sakince doğru sırayı izlemek arasında, ekiplerin önceden hazırladığı yalın bir plan vardır.',
    sections: [
      { title: 'İlk 4 saat', items: ['Şüpheyi belgeleyin (ne, ne zaman, kim fark etti).', 'Etkilenen sistem ve hesapları izole edin.', 'Şüpheli anahtarları derhal revoke edin.', 'Yetkili kişilere haber verin.', 'Zaman çizelgesi tutmaya başlayın.'] },
      { title: 'İlk 24 saat', paragraphs: ['Erişim log’ları, audit kayıtları ve son giriş bilgileri toplanmalıdır. Etki kapsamı belirlenirken aceleci genelleme yerine somut delillerle ilerleyin. KVKK çerçevesinde bildirim yükümlülüğü doğacaksa zaman çizelgesi belirleyici olur.'] },
      { title: 'İletişim', paragraphs: ['İç iletişim önce kurulur, sonra dış iletişim. Müşteri bildirimleri net, dürüst ve aksiyon odaklı olmalıdır. Spekülasyon yerine doğrulanmış bilgi paylaşın; ileride çelişkili açıklama yapmaktan kaçının.'] },
    ],
    checklist: ['Belgelenmiş zaman çizelgesi var.', 'Şüpheli anahtarlar revoke edildi.', 'Etki kapsamı netleşti.', 'Yetkililere bildirim yapıldı.', 'Müşteri iletişim taslağı hazır.'],
    faq: [
      { q: 'Bildirim yapmazsam ne olur?', a: 'KVKK çerçevesinde bildirim yükümlülüğü vardır ve yapılmaması idari yaptırımlara yol açabilir. Kararı hukuk danışmanınızla birlikte vermek doğru olur.' },
      { q: 'Olay sonrası rutinde ne değişmeli?', a: 'Geriye dönük analiz (post-mortem) ile aynı sebebin tekrar olmaması için kontrol noktası eklenir. Bu öğrenme döngüsü güveni geri kazandırır.' },
    ],
  }),
  article('en', 'security-kvkk', 40, 'incident-response-basics', 'Incident response basics', 'What to do in the first 24 hours of a suspected data leak or unauthorized access.', ['incident', 'leak', 'gdpr', 'response'], {
    lead: 'Reputation is shaped less by incidents and more by how teams respond. The difference between a rushed misstep and a calm correct sequence is a simple plan prepared in advance.',
    sections: [
      { title: 'First 4 hours', items: ['Document the suspicion (what, when, who noticed).', 'Isolate affected systems and accounts.', 'Revoke any suspicious keys immediately.', 'Notify accountable people.', 'Start a timeline log.'] },
      { title: 'First 24 hours', paragraphs: ['Gather access logs, audit records and last login info. Resist generalization; rely on concrete evidence to define scope. If GDPR/KVKK notification rules apply, the timeline becomes critical.'] },
      { title: 'Communication', paragraphs: ['Internal communication first, then external. Customer messages should be clear, honest and action-oriented. Share verified information instead of speculation; avoid contradicting yourself later.'] },
    ],
    checklist: ['Documented timeline exists.', 'Suspicious keys revoked.', 'Scope is defined.', 'Authorities notified as required.', 'Customer message draft is ready.'],
    faq: [
      { q: 'What if I do not notify?', a: 'GDPR/KVKK frameworks impose notification duties; failing to comply can lead to penalties. Decide with legal counsel.' },
      { q: 'What changes after the incident?', a: 'A post-mortem identifies the root cause and adds checkpoints. This learning loop is what restores trust.' },
    ],
  }),
  article('tr', 'security-kvkk', 50, 'data-retention-anonymization', 'Veri saklama süreleri ve anonimleştirme', 'Hangi veri ne kadar tutulmalı, hangi alan otomatik anonimleştirilmeli? KVKK uyumlu retention politikası örnekleri.', ['retention', 'anonimleştirme', 'kvkk', 'saklama'], {
    lead: 'Veriyi sonsuza kadar tutmak ne yasal ne de etik açıdan doğrudur. KVKK uyumu için saklama sürelerini önceden tanımlamak ve teknik olarak otomatik temizliği kurmak en sağlıklı yoldur.',
    sections: [
      { title: 'Buaze’in mevcut yaklaşımı', items: ['Müşteri IP adresi: 90 gün sonra otomatik anonimleştirilir.', 'Yorum verisi: müşteri talebi olmadıkça saklanır (işletme ilişkisi).', 'Audit log: 2 yıl.', 'Mail meta verisi: gönderim takibi için sınırlı tutulur.', 'Anonim yorumlar müşteri listesinde yer almaz.'] },
      { title: 'Politikanızı yazılı tutun', paragraphs: ['Hangi alanın ne kadar tutulduğu, hangi şartla anonimleştirildiği yazılı bir belge halinde olmalıdır. Bu, hem iç ekibe rehber olur hem de denetimde sorulara hızlı cevap verir.'] },
      { title: 'Müşteri talebi', paragraphs: ['Müşteri kendi verisinin silinmesini, kopyasının verilmesini veya işlem amacının değiştirilmesini talep edebilir. Bu talepler manuel olarak ele alınır; ancak yanıt zamanlamasının net bir prosedürü olmalıdır.'] },
    ],
    checklist: ['Yazılı retention politikası mevcut.', 'IP anonimleştirme cron’u canlı.', 'Audit log saklama süresi belgelenmiş.', 'Müşteri talep süreci tanımlı.', 'Yıllık politika gözden geçirildi.'],
    faq: [
      { q: 'Tüm veriyi silmek mümkün mü?', a: 'Evet, ancak finansal kayıtlar gibi yasal saklama süreleri olan kayıtlar için istisnalar olabilir. Hukuk danışmanınızla net çerçeveyi belirleyin.' },
      { q: 'Anonim yorumlar pazarlamada kullanılabilir mi?', a: 'Anonim olduğu sürece operasyonel analizde kullanılabilir; ancak müşteri kimliği geri çıkarılabilecek kombinasyonlar oluşturulmamalıdır.' },
    ],
  }),
  article('en', 'security-kvkk', 50, 'data-retention-anonymization', 'Data retention and anonymization', 'How long to keep what, and which fields to anonymize automatically. Examples of GDPR/KVKK-compliant retention.', ['retention', 'anonymization', 'gdpr', 'storage'], {
    lead: 'Keeping data forever is neither legal nor ethical. For compliance, define retention windows in advance and automate cleanup technically.',
    sections: [
      { title: 'Buaze’s current stance', items: ['Customer IP: anonymized automatically after 90 days.', 'Review data: retained unless the customer requests deletion (business relationship).', 'Audit log: 2 years.', 'Email metadata: kept minimally for delivery tracking.', 'Anonymous reviews never appear in the customer list.'] },
      { title: 'Write down your policy', paragraphs: ['Document which field is kept how long and under what condition it is anonymized. It guides the internal team and accelerates audit responses.'] },
      { title: 'Customer requests', paragraphs: ['A customer can request data deletion, a copy or a change in processing purpose. These are handled manually, but the response timeline must follow a clear procedure.'] },
    ],
    checklist: ['Written retention policy exists.', 'IP anonymization cron is live.', 'Audit log retention is documented.', 'Customer request process is defined.', 'Annual policy review happened.'],
    faq: [
      { q: 'Can everything be deleted?', a: 'Yes, with exceptions like financial records that have legal retention. Confirm scope with legal counsel.' },
      { q: 'Can anonymous reviews be used in marketing?', a: 'They can support operational analysis as long as the customer cannot be re-identified through combinations.' },
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
