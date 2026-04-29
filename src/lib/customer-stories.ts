import type { Locale } from '@/lib/translations';

export type CustomerStory = {
  slug: string;
  color: string;
  brand: string;
  sector: { tr: string; en: string };
  location: string;
  metric: string;
  metricLabel: { tr: string; en: string };
  quote: { tr: string; en: string };
  title: { tr: string; en: string };
  description: { tr: string; en: string };
  hero: { tr: string; en: string };
  image: string;
  stats: Array<{ value: string; label: { tr: string; en: string } }>;
  challenge: { tr: string; en: string };
  solution: { tr: string; en: string };
  outcome: { tr: string; en: string };
  steps: Array<{ title: { tr: string; en: string }; body: { tr: string; en: string } }>;
};

export const CUSTOMER_STORIES: CustomerStory[] = [
  {
    slug: 'ark-bistro',
    color: '#C6F24E',
    brand: 'Ark Bistro',
    sector: { tr: 'Restoran', en: 'Restaurant' },
    location: 'Kadıköy',
    metric: '+184%',
    metricLabel: { tr: 'yorum · 90 gün', en: 'reviews · 90 days' },
    quote: {
      tr: "Google puanımızı büyütürken her müşteriye aynı şeffaf yorum yolunu sunduk.",
      en: 'We grew our Google rating while giving every customer the same transparent review path.',
    },
    title: {
      tr: 'Ark Bistro, 90 günde organik Google yorumlarını nasıl büyüttü?',
      en: 'How Ark Bistro grew organic Google reviews in 90 days',
    },
    description: {
      tr: 'Kadıköy merkezli restoran senaryosu: QR ile gerçek deneyimlerden geri bildirim toplama, iç aksiyon yönetimi ve Google politikalarına uyumlu yorum büyümesi.',
      en: 'A Kadıköy restaurant scenario: collecting real feedback by QR, routing internal actions, and growing reviews in line with Google policy.',
    },
    hero: {
      tr: 'Ark Bistro, masa üstü QR akışını standartlaştırarak daha fazla gerçek müşteri deneyimini görünür hale getirdi. Memnun misafir Google yorum linkine ulaşırken, operasyonel notlar ekip panelinde aksiyona dönüştü.',
      en: 'Ark Bistro standardized table QR flows to make more genuine customer experiences visible. Satisfied guests could reach the Google review link while operational notes became team actions in the dashboard.',
    },
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1400&h=900',
    stats: [
      { value: '+184%', label: { tr: 'Organik yorum artışı', en: 'Organic review lift' } },
      { value: '4.2→4.8', label: { tr: 'Google puanı', en: 'Google rating' } },
      { value: '90 gün', label: { tr: 'Pilot süre', en: 'Pilot window' } },
    ],
    challenge: {
      tr: 'Restoran ekibi memnun müşterilerin yorum bırakmasını şansa bırakıyordu. Aynı zamanda servis notları WhatsApp konuşmalarında kayboluyor, hangi masa veya vardiyada sorun çıktığı ölçülemiyordu.',
      en: 'The team relied on chance for happy guests to leave reviews. Service notes were also buried in chat threads, making table and shift-level issues hard to measure.',
    },
    solution: {
      tr: 'Her masaya aynı QR akışı yerleştirildi. Akış, müşteriyi puanına göre manipüle etmeden geri bildirim topladı; Google yorum linki şeffaf biçimde sunuldu, detaylı operasyon notları panelde ekibe düştü.',
      en: 'The same QR flow was placed on every table. It collected feedback without manipulating guests by rating; the Google review link stayed visible, and detailed operational notes reached the team dashboard.',
    },
    outcome: {
      tr: 'Yorum isteme süreci kişiye bağlı olmaktan çıktı. Ekip, Google politikalarındaki gerçek deneyim ve teşviksiz yorum ilkelerine bağlı kalarak daha düzenli yorum akışı elde etti.',
      en: 'Review requests stopped depending on individual staff habits. The team built a steadier review flow while respecting Google’s principles around genuine, non-incentivized reviews.',
    },
    steps: [
      {
        title: { tr: 'Masa QR standardı', en: 'Table QR standard' },
        body: { tr: 'Her şube ve masa için aynı yönlendirme dili kullanıldı.', en: 'Every location and table used the same request language.' },
      },
      {
        title: { tr: 'Ekip aksiyonu', en: 'Team action' },
        body: { tr: 'Düşük puanlar gizlenmedi; ekibe çözüm görevi olarak taşındı.', en: 'Lower scores were not hidden; they became resolution tasks for the team.' },
      },
      {
        title: { tr: 'Politika güvenliği', en: 'Policy safety' },
        body: { tr: 'Teşvik, filtreleme veya seçici yorum isteme kullanılmadı.', en: 'No incentives, filtering, or selective review requests were used.' },
      },
    ],
  },
  {
    slug: 'hotel-nora',
    color: '#EAF9B8',
    brand: 'Hotel Nora',
    sector: { tr: 'Otel', en: 'Hotel' },
    location: 'Bodrum',
    metric: '4.9/5',
    metricLabel: { tr: 'konaklama memnuniyeti', en: 'guest satisfaction' },
    quote: {
      tr: 'Oda QR’ları, misafir deneyimini check-out sonrasına bırakmadan ölçmemizi sağladı.',
      en: 'Room QR codes helped us measure the guest experience before checkout became a distant memory.',
    },
    title: {
      tr: 'Hotel Nora oda QR akışıyla misafir geri bildirimini nasıl hızlandırdı?',
      en: 'How Hotel Nora accelerated guest feedback with room QR flows',
    },
    description: {
      tr: 'Otel ekipleri için Google ve rezervasyon platformlarıyla uyumlu, gerçek misafir deneyimine dayalı geri bildirim operasyonu.',
      en: 'A hotel feedback operation based on genuine guest experience and aligned with Google and booking platform expectations.',
    },
    hero: {
      tr: 'Hotel Nora, oda içi QR kartlarıyla misafirden konaklama sırasında sinyal aldı. Böylece ekip sorunları check-out öncesinde gördü; memnun misafirler de kamuya açık yorum kanallarına kolayca ulaşabildi.',
      en: 'Hotel Nora used in-room QR cards to capture guest signals during the stay. The team could see issues before checkout, while happy guests could easily reach public review channels.',
    },
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1400&h=900',
    stats: [
      { value: '4.9/5', label: { tr: 'Memnuniyet skoru', en: 'Satisfaction score' } },
      { value: '2.3x', label: { tr: 'Geri bildirim hacmi', en: 'Feedback volume' } },
      { value: '18 dk', label: { tr: 'İlk aksiyon süresi', en: 'First action time' } },
    ],
    challenge: {
      tr: 'Misafirler çoğu zaman deneyimini otelden ayrıldıktan sonra paylaşıyordu. Bu da temizlik, oda servisi veya resepsiyon notlarının geç fark edilmesine neden oluyordu.',
      en: 'Guests often shared their experience only after leaving. Housekeeping, room service, or front desk notes were discovered too late.',
    },
    solution: {
      tr: 'Oda kartlarına, resepsiyona ve check-out e-postalarına tek tip QR yerleştirildi. Her misafir aynı akışa davet edildi; olumlu veya olumsuz geri bildirim ayrımı yapılmadı.',
      en: 'A consistent QR was added to room cards, reception surfaces, and checkout emails. Every guest was invited into the same flow, without separating positive and negative feedback.',
    },
    outcome: {
      tr: 'Otel ekibi misafir çıkmadan önce aksiyon alabildi. Google tarafında ise yalnızca gerçek konaklama deneyimine dayanan, teşviksiz yorum isteme dili korundu.',
      en: 'The hotel team could act before guests left. On Google, the request language stayed focused on genuine stay experiences without incentives.',
    },
    steps: [
      {
        title: { tr: 'Oda içi temas', en: 'In-room touchpoint' },
        body: { tr: 'QR kartlar misafirin doğal temas noktalarına yerleştirildi.', en: 'QR cards were placed at natural guest touchpoints.' },
      },
      {
        title: { tr: 'Departman yönlendirme', en: 'Department routing' },
        body: { tr: 'Temizlik, resepsiyon ve servis notları ayrı etiketlendi.', en: 'Housekeeping, front desk, and service notes were tagged separately.' },
      },
      {
        title: { tr: 'Açık yorum yolu', en: 'Open review path' },
        body: { tr: 'Kamuya açık yorum kanalı her misafir için erişilebilir kaldı.', en: 'The public review path remained available to every guest.' },
      },
    ],
  },
  {
    slug: 'derma-plus',
    color: '#F5F5F5',
    brand: 'Derma+',
    sector: { tr: 'Klinik', en: 'Clinic' },
    location: 'Ankara',
    metric: '+62%',
    metricLabel: { tr: 'aylık randevu', en: 'monthly bookings' },
    quote: {
      tr: 'Hasta deneyimini görünür kıldık; yorum isteme dili ise sade ve tarafsız kaldı.',
      en: 'We made patient experience visible while keeping review requests simple and neutral.',
    },
    title: {
      tr: 'Derma+ hasta deneyimini ölçerken Google uyumunu nasıl korudu?',
      en: 'How Derma+ measured patient experience while protecting Google compliance',
    },
    description: {
      tr: 'Klinikler için hassas hasta deneyimini KVKK ve Google yorum politikalarıyla uyumlu şekilde toplama senaryosu.',
      en: 'A clinic scenario for collecting sensitive patient experience signals while staying aligned with privacy and Google review rules.',
    },
    hero: {
      tr: 'Derma+, işlem sonrası deneyim sinyalini tek panelde topladı. Ama yorum isteme tarafında teşvik, vaat veya seçici yönlendirme kullanmadan her hastaya aynı tarafsız akışı sundu.',
      en: 'Derma+ collected post-appointment experience signals in one dashboard. For review requests, it avoided incentives, promises, and selective routing by using the same neutral flow for every patient.',
    },
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1400&h=900',
    stats: [
      { value: '+62%', label: { tr: 'Randevu talebi', en: 'Booking requests' } },
      { value: '31%', label: { tr: 'Daha hızlı dönüş', en: 'Faster follow-up' } },
      { value: '0', label: { tr: 'Teşvikli yorum', en: 'Incentivized reviews' } },
    ],
    challenge: {
      tr: 'Klinikte memnuniyet ölçümü parçalıydı. Resepsiyon notları, WhatsApp mesajları ve Google yorumları birbirinden kopuk ilerliyordu.',
      en: 'Satisfaction measurement was fragmented. Front desk notes, messaging, and Google reviews lived in separate places.',
    },
    solution: {
      tr: 'İşlem sonrası QR ve SMS linkleriyle tarafsız geri bildirim istendi. Düşük puanlar yayın yolundan saklanmadı; ekip için öncelikli takip konusu olarak işaretlendi.',
      en: 'Neutral feedback was requested through post-appointment QR and SMS links. Low scores were not hidden from public paths; they were marked as priority follow-ups for the team.',
    },
    outcome: {
      tr: 'Klinik, hasta memnuniyetini daha erken ölçerken Google’ın gerçek deneyim ve teşviksiz yorum çizgisini koruyan bir süreç oluşturdu.',
      en: 'The clinic measured patient satisfaction earlier while maintaining a process aligned with Google’s genuine, non-incentivized review expectations.',
    },
    steps: [
      {
        title: { tr: 'Tarafsız davet', en: 'Neutral request' },
        body: { tr: 'Metinlerde puan yönlendiren ifade kullanılmadı.', en: 'Request copy avoided rating-steering language.' },
      },
      {
        title: { tr: 'KVKK hassasiyeti', en: 'Privacy sensitivity' },
        body: { tr: 'Kişisel sağlık detayı açık yorum metnine taşınmadı.', en: 'Personal health details were kept out of public review prompts.' },
      },
      {
        title: { tr: 'Takip disiplini', en: 'Follow-up discipline' },
        body: { tr: 'Geri dönüş gerektiren deneyimler görev haline geldi.', en: 'Experiences needing follow-up became team tasks.' },
      },
    ],
  },
  {
    slug: 'kahve-dukkan',
    color: '#F5F5F5',
    brand: 'Kahve Dükkan',
    sector: { tr: 'Kafe', en: 'Café' },
    location: 'Çeşme · 4 şube',
    metric: '3.8→4.7',
    metricLabel: { tr: 'Google', en: 'Google' },
    quote: {
      tr: 'Şubeleri aynı ekranda görünce servis kalitesini konuşmak çok daha somut hale geldi.',
      en: 'Seeing every branch on one screen made service quality much easier to discuss.',
    },
    title: {
      tr: 'Kahve Dükkan dört şubede yorum operasyonunu nasıl standartlaştırdı?',
      en: 'How Kahve Dükkan standardized review operations across four branches',
    },
    description: {
      tr: 'Çok şubeli kafeler için Google uyumlu QR geri bildirim, şube karşılaştırması ve ekip aksiyon yönetimi örneği.',
      en: 'A multi-branch café example for Google-compliant QR feedback, branch comparison, and team action management.',
    },
    hero: {
      tr: 'Kahve Dükkan, her şubeye aynı QR geri bildirim standardını verdi. Şube bazlı memnuniyet, Google yorum akışı ve servis notları tek panelde yan yana takip edildi.',
      en: 'Kahve Dükkan gave every branch the same QR feedback standard. Branch-level satisfaction, Google review flow, and service notes were tracked side by side.',
    },
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=1400&h=900',
    stats: [
      { value: '3.8→4.7', label: { tr: 'Google puanı', en: 'Google rating' } },
      { value: '4', label: { tr: 'Aktif şube', en: 'Active branches' } },
      { value: '52%', label: { tr: 'Daha hızlı yanıt', en: 'Faster replies' } },
    ],
    challenge: {
      tr: 'Her şube farklı şekilde yorum istiyor, bazı şubeler hiç istemiyordu. Merkez ekip hangi lokasyonda hangi deneyimin aksadığını geç fark ediyordu.',
      en: 'Every branch asked for reviews differently, and some did not ask at all. The central team discovered location-level issues too late.',
    },
    solution: {
      tr: 'Şube bazlı QR’lar kuruldu. Müşterilere aynı tarafsız davet gösterildi; ekip panelinde şube, saat ve konu kırılımları izlendi.',
      en: 'Branch-specific QRs were deployed. Customers saw the same neutral request, while the team tracked branch, time, and topic breakdowns.',
    },
    outcome: {
      tr: 'Merkez ekip iyi çalışan şube pratiklerini diğer lokasyonlara taşıdı. Yorum isteme süreci Google’ın seçici isteme yasağına takılmayacak şekilde standart kaldı.',
      en: 'The central team carried strong branch practices to other locations. Review requests stayed standardized to avoid selective solicitation concerns.',
    },
    steps: [
      {
        title: { tr: 'Şube QR’ları', en: 'Branch QRs' },
        body: { tr: 'Her lokasyon kendi performans kırılımını aldı.', en: 'Each location received its own performance breakdown.' },
      },
      {
        title: { tr: 'Ortak metin', en: 'Shared copy' },
        body: { tr: 'Yorum isteme dili tüm şubelerde aynı kaldı.', en: 'Review request copy stayed consistent across branches.' },
      },
      {
        title: { tr: 'Haftalık ritim', en: 'Weekly rhythm' },
        body: { tr: 'Şube müdürleri aynı raporla toplantıya girdi.', en: 'Branch managers entered meetings with the same report.' },
      },
    ],
  },
  {
    slug: 'law-and-co',
    color: '#F5F5F5',
    brand: 'Law&Co',
    sector: { tr: 'Hukuk ofisi', en: 'Legal' },
    location: 'İstanbul',
    metric: '+90',
    metricLabel: { tr: 'net yorum', en: 'net reviews' },
    quote: {
      tr: 'Danışma sonrası geri bildirim istemek düzenli bir operasyon haline geldi.',
      en: 'Asking for feedback after consultations became a regular operation.',
    },
    title: {
      tr: 'Law&Co danışma sonrası geri bildirim sürecini nasıl profesyonelleştirdi?',
      en: 'How Law&Co professionalized post-consultation feedback',
    },
    description: {
      tr: 'Profesyonel hizmetlerde Google yorumlarını tarafsız, teşviksiz ve gerçek deneyime dayalı şekilde isteme yaklaşımı.',
      en: 'A professional-services approach to requesting Google reviews neutrally, without incentives, and based on genuine client experience.',
    },
    hero: {
      tr: 'Law&Co, her danışma sonrası aynı geri bildirim davetini gönderdi. Süreç satış odaklı değil, hizmet kalitesini ölçen ve gerçek deneyimi belgeleyen bir yapıya dönüştü.',
      en: 'Law&Co sent the same feedback request after each consultation. The process became less sales-driven and more focused on measuring service quality and documenting genuine experience.',
    },
    image: 'https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&q=80&w=1400&h=900',
    stats: [
      { value: '+90', label: { tr: 'Net yeni yorum', en: 'Net new reviews' } },
      { value: '38%', label: { tr: 'Daha çok dönüş', en: 'More follow-ups' } },
      { value: '100%', label: { tr: 'Standart davet', en: 'Standard request' } },
    ],
    challenge: {
      tr: 'Danışma sonrası memnuniyet ölçümü avukatların kişisel alışkanlığına bağlıydı. Bu da bazı güçlü deneyimlerin hiç görünür olmamasına neden oluyordu.',
      en: 'Post-consultation satisfaction depended on each lawyer’s personal habit. Many strong experiences never became visible.',
    },
    solution: {
      tr: 'Her danışma sonrası otomatik, tarafsız ve teşviksiz bir geri bildirim daveti kuruldu. Google yorumu isteyen dil, yalnızca gerçek hizmet deneyimine odaklandı.',
      en: 'An automatic, neutral, non-incentivized feedback request was set after every consultation. Google review copy focused only on genuine service experience.',
    },
    outcome: {
      tr: 'Ofis, hizmet kalitesini ölçen düzenli bir veri akışı kazandı. Yorum isteme süreci pozitif müşteri seçmeye dayalı olmadan ölçeklendi.',
      en: 'The office gained a steady data flow for service quality. Review requests scaled without relying on selecting only positive clients.',
    },
    steps: [
      {
        title: { tr: 'Danışma sonrası tetik', en: 'Post-consultation trigger' },
        body: { tr: 'Görüşme tamamlandığında standart davet gönderildi.', en: 'A standard request was sent after each consultation.' },
      },
      {
        title: { tr: 'Profesyonel ton', en: 'Professional tone' },
        body: { tr: 'Yorum metni hukuki vaat veya yönlendirme içermedi.', en: 'The request avoided legal promises or steering language.' },
      },
      {
        title: { tr: 'Ekip görünürlüğü', en: 'Team visibility' },
        body: { tr: 'Tüm geri bildirimler tek ekip ekranında toplandı.', en: 'All feedback landed in one team view.' },
      },
    ],
  },
  {
    slug: 'spa-ren',
    color: '#F5F5F5',
    brand: 'Spa Ren',
    sector: { tr: 'Güzellik', en: 'Beauty' },
    location: 'Nişantaşı',
    metric: '4.95',
    metricLabel: { tr: 'ort. puan', en: 'avg. rating' },
    quote: {
      tr: 'Instagram, Google ve Foursquare yorumlarını artık ayrı ayrı takip etmiyoruz.',
      en: 'We no longer track Instagram, Google, and Foursquare feedback separately.',
    },
    title: {
      tr: 'Spa Ren çok kanallı itibar yönetimini nasıl tek panele taşıdı?',
      en: 'How Spa Ren brought multi-channel reputation into one dashboard',
    },
    description: {
      tr: 'Güzellik ve wellness işletmeleri için çok kanallı yorum takibi, Google uyumlu yorum isteme ve ekip aksiyon akışı.',
      en: 'Multi-channel review tracking, Google-compliant review requests, and team action flows for beauty and wellness businesses.',
    },
    hero: {
      tr: 'Spa Ren, randevu sonrası geri bildirimleri tek panelde topladı. Google, Instagram ve konum bazlı platformlardan gelen sinyaller ekip içinde aynı ritimle yönetildi.',
      en: 'Spa Ren collected post-appointment feedback in one dashboard. Signals from Google, Instagram, and location-based platforms were managed in the same team rhythm.',
    },
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=1400&h=900',
    stats: [
      { value: '4.95', label: { tr: 'Ortalama puan', en: 'Average rating' } },
      { value: '3', label: { tr: 'Kanal', en: 'Channels' } },
      { value: '27%', label: { tr: 'Daha fazla tekrar randevu', en: 'More repeat bookings' } },
    ],
    challenge: {
      tr: 'Randevu sonrası deneyim yorumları farklı kanallara dağılıyordu. Ekip hangi platformda neye yanıt verdiğini takip etmekte zorlanıyordu.',
      en: 'Post-appointment comments were scattered across channels. The team struggled to track which platform had been answered.',
    },
    solution: {
      tr: 'Randevu sonrası QR ve link akışı kuruldu. Google yorum daveti teşviksiz ve tarafsız kaldı; özel bakım notları ekip içinde takip edildi.',
      en: 'Post-appointment QR and link flows were set up. The Google review request stayed neutral and non-incentivized, while private service notes were tracked internally.',
    },
    outcome: {
      tr: 'Spa Ren, müşteri deneyimini platform platform bölmeden yönetti. Kamuya açık yorum isteme dili Google’ın gerçek deneyim ve tarafsızlık ilkelerine uygun kaldı.',
      en: 'Spa Ren managed customer experience without splitting work across platforms. Public review request language stayed aligned with Google’s genuine-experience and neutrality principles.',
    },
    steps: [
      {
        title: { tr: 'Randevu sonrası akış', en: 'Post-appointment flow' },
        body: { tr: 'Müşteri deneyimi unutulmadan ölçüldü.', en: 'Customer experience was captured while still fresh.' },
      },
      {
        title: { tr: 'Kanal birleştirme', en: 'Channel unification' },
        body: { tr: 'Google ve sosyal kanallar aynı panelde izlendi.', en: 'Google and social channels were tracked in one dashboard.' },
      },
      {
        title: { tr: 'Teşviksiz büyüme', en: 'Non-incentivized growth' },
        body: { tr: 'İndirim veya hediye karşılığı yorum istenmedi.', en: 'No discounts or gifts were offered in exchange for reviews.' },
      },
    ],
  },
];

export function getCustomerStory(slug: string) {
  return CUSTOMER_STORIES.find((story) => story.slug === slug) ?? null;
}

export function storyText<T extends Record<Locale, string>>(value: T, locale: Locale) {
  return value[locale];
}
