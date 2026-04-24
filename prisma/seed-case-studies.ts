import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

type Seed = Omit<Prisma.CaseStudyUncheckedCreateInput, 'id' | 'publishedAt'>;

const STUDIES: Seed[] = [
  {
    slug: 'kadikoy-bistro',
    brand: 'Kadıköy Bistro',
    sector: 'Restoran & Kafe',
    sectorEn: 'Restaurant & Café',
    location: 'İstanbul',
    heroImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1800&q=85',
    heroTr: "Buaze ile Google ortalaması 4.2'den 4.8'e, ayda 184% daha fazla organik yorum.",
    heroEn: 'Buaze lifted Google rating from 4.2 to 4.8, with 184% more organic reviews per month.',
    subtitleTr: 'Masa QR + fatura QR + paket kutusu QR kombinasyonuyla her temas noktası kazanıma dönüştü.',
    subtitleEn: 'Every touchpoint — table QR, receipt QR, delivery box QR — became a review-collection moment.',
    stats: [
      { label: { tr: 'GOOGLE ORT.', en: 'GOOGLE AVG.' }, value: '4.2 → 4.8' },
      { label: { tr: 'YORUM / AY', en: 'REVIEWS / MO' }, value: '+184%' },
      { label: { tr: 'İLK YANIT', en: 'FIRST REPLY' }, value: '12 dk' },
      { label: { tr: 'KAPSAM', en: 'COVERAGE' }, value: '3 şube' },
    ],
    highlights: [
      {
        tr: "40 masalık mekanda her masaya özel QR + fatura altına platform seçim QR'ı. Müşteri seçim yapıyor: Google, Yemeksepeti, Getir, Trendyol GO.",
        en: 'Per-table QR in a 40-cover venue plus a platform-select QR on every receipt. Customers choose: Google, Yemeksepeti, Getir, Trendyol GO.',
      },
      {
        tr: 'AI Co-Pilot düşük puana 12 dakika içinde Türkçe taslak yanıt üretiyor — sahibi onayla gönderiyor, tüm işlem 30 saniye.',
        en: 'AI Co-Pilot drafts a Turkish reply to low ratings within 12 minutes — the owner approves and sends in 30 seconds.',
      },
      {
        tr: "Ayda 340 yeni yorum, 94'ü Google Maps'e akıyor. Organik görünürlük artışı = yeni rezervasyon akışı.",
        en: '340 new reviews a month, 94 routed to Google Maps. Organic visibility translates to reservation volume.',
      },
    ],
    quoteTr: "İlk ay içinde Google ortalamamız 4.2'den 4.8'e çıktı. Yemeksepeti sayfamızdaki 3,9, artık 4,6 — siparişlerde %22 büyüme gördük.",
    quoteEn: 'Within the first month our Google average jumped from 4.2 to 4.8. Our Yemeksepeti rating — used to sit at 3.9 — is now 4.6, with a 22% lift in orders.',
    personName: 'Emre Kaya',
    personRole: { tr: 'İşletme Sahibi', en: 'Founder' },
    isPublished: true,
  },
  {
    slug: 'hotel-nora',
    brand: 'Hotel Nora',
    sector: 'Otel',
    sectorEn: 'Hotel',
    location: 'Bodrum',
    heroImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1800&q=85',
    heroTr: "Check-out sonrası WhatsApp + oda kartı QR = 6 ayda Booking.com'da 3.9'dan 4.7'ye.",
    heroEn: 'Post-checkout WhatsApp + in-room key-card QR — Booking.com score climbed from 3.9 to 4.7 in six months.',
    subtitleTr: "Oda QR'ı, restoran masa QR'ı, spa resepsiyon QR'ı ve çıkışta özel check-out mesajı — dört farklı temas, tek panel.",
    subtitleEn: 'Room QR, restaurant QR, spa reception QR, and a branded checkout message — four touchpoints, one panel.',
    stats: [
      { label: { tr: 'BOOKING', en: 'BOOKING' }, value: '3.9 → 4.7' },
      { label: { tr: 'TRIPADVISOR', en: 'TRIPADVISOR' }, value: '4.1 → 4.9' },
      { label: { tr: 'YENİ YORUM / AY', en: 'NEW REVIEWS / MO' }, value: '284' },
      { label: { tr: 'ODA DOLULUK', en: 'OCCUPANCY' }, value: '+18%' },
    ],
    highlights: [
      {
        tr: 'Oda anahtar kartına basılı QR ile konuk kalış sırasında bile geri bildirim bırakabiliyor — olumsuzlar derhal resepsiyona düşüyor.',
        en: 'A printed QR on the room key card lets guests leave feedback during the stay — negatives hit reception immediately.',
      },
      {
        tr: "Check-out sonrası 2 saat içinde gönderilen WhatsApp mesajı, Tripadvisor ve Booking'e yönlendiren kişiselleştirilmiş link içeriyor.",
        en: 'A personalised WhatsApp link goes out within two hours of checkout, routing straight to the right platform (Tripadvisor or Booking).',
      },
      {
        tr: 'Spa + restoran + lobi için ayrı QR kampanyaları — departman bazlı analytics yönetim ekibine gerçek zamanlı rapor gönderiyor.',
        en: 'Separate QR campaigns for spa, restaurant and lobby — per-department analytics stream into the management dashboard.',
      },
    ],
    quoteTr: "Buaze'den sonra her hafta 40-50 yeni yorum alıyoruz. En değerlisi: şikayetleri konuk henüz otelden ayrılmadan görebiliyoruz.",
    quoteEn: 'Since Buaze we pick up 40–50 new reviews a week. The real gold: we see complaints before the guest has even checked out.',
    personName: 'Julia Martens',
    personRole: { tr: 'Genel Müdür', en: 'General Manager' },
    isPublished: true,
  },
  {
    slug: 'derma-klinik',
    brand: 'Derma+ Klinik',
    sector: 'Klinik & Sağlık',
    sectorEn: 'Clinic & Health',
    location: 'Ankara',
    heroImage: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1800&q=85',
    heroTr: 'KVKK uyumlu anket akışı + randevu sonrası otomatik mesaj = Google puanı 4.9, yeni hasta akışı %41 arttı.',
    heroEn: 'KVKK-compliant survey flow + automated post-appointment messages — Google rating 4.9, new-patient flow up 41%.',
    subtitleTr: 'Bekleme salonunda QR + randevu sonrası SMS + ay sonu takip anketi. Hastalar gönüllü olarak yıldız bırakıyor, sahte yorum riski sıfır.',
    subtitleEn: 'Waiting-room QR + post-visit SMS + end-of-month follow-up. Patients opt in to leave a star rating — zero risk of fake reviews.',
    stats: [
      { label: { tr: 'GOOGLE', en: 'GOOGLE' }, value: '4.9' },
      { label: { tr: 'YANIT ORANI', en: 'REPLY RATE' }, value: '%68' },
      { label: { tr: 'YENİ HASTA', en: 'NEW PATIENTS' }, value: '+41%' },
      { label: { tr: 'NPS', en: 'NPS' }, value: '74' },
    ],
    highlights: [
      {
        tr: 'Her işlem için ayrı QR kampanyası (dermatoloji, lazer, dolgu, botoks) — anketler işleme özel sorular içeriyor.',
        en: 'Per-treatment QR campaigns (dermatology, laser, filler, botox) — surveys carry treatment-specific questions.',
      },
      {
        tr: 'AI Co-Pilot hasta adını + işlem tipini + puanı alıp klinik tonuna uygun, aşırı tanıtıcı olmayan profesyonel yanıt yazıyor.',
        en: 'AI Co-Pilot pulls the patient name + treatment + rating and writes a professional, on-brand reply that stays within medical-advertising guidelines.',
      },
      {
        tr: 'KVKK paneli: hasta yalnız "paylaşıma izin veriyorum" tik\'i attıysa yorum Google\'a yönlendiriliyor.',
        en: 'KVKK panel: a review is only forwarded to Google when the patient has explicitly ticked "I consent to sharing."',
      },
    ],
    quoteTr: "Hastalarımız artık bizi Google'da görüyor. İşletme puanımız aylık olarak değil, canlı olarak yükseliyor — bu da yeni hasta akışını doğrudan etkiledi.",
    quoteEn: 'Patients see us on Google now. The score updates live, not monthly — and that directly affects the flow of new patients.',
    personName: 'Dr. Zeynep Aydın',
    personRole: { tr: 'Kurucu Hekim', en: 'Founding Physician' },
    isPublished: true,
  },
];

async function main() {
  for (const study of STUDIES) {
    await prisma.caseStudy.upsert({
      where: { slug: study.slug },
      create: study,
      update: study,
    });
    console.log(`✓ upserted ${study.slug}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
