import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Quote, Star, TrendingUp } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';

export const dynamic = 'force-dynamic';

// NOTE: Mock case studies. Replace with a Prisma `CaseStudy` model
// (documented in `src/lib/scaffolding.ts`) when the CMS lands.
interface CaseStudy {
  slug: string;
  brand: string;
  sector: { tr: string; en: string };
  location: string;
  hero: { tr: string; en: string };
  subtitle: { tr: string; en: string };
  stats: { label: { tr: string; en: string }; value: string }[];
  highlights: { tr: string; en: string }[];
  quote: { tr: string; en: string };
  person: { name: string; role: { tr: string; en: string } };
}

const STUDIES: CaseStudy[] = [
  {
    slug: 'kadikoy-bistro',
    brand: 'Kadıköy Bistro',
    sector: { tr: 'Restoran & Kafe', en: 'Restaurant & Café' },
    location: 'İstanbul',
    hero: {
      tr: 'Buaze ile Google ortalaması 4.2\'den 4.8\'e, ayda 184% daha fazla organik yorum.',
      en: 'Buaze lifted Google rating from 4.2 to 4.8, with 184% more organic reviews per month.',
    },
    subtitle: {
      tr: 'Masa QR + fatura QR + paket kutusu QR kombinasyonuyla her temas noktası kazanıma dönüştü.',
      en: 'Every touchpoint — table QR, receipt QR, delivery box QR — became a review-collection moment.',
    },
    stats: [
      { label: { tr: 'GOOGLE ORT.', en: 'GOOGLE AVG.' }, value: '4.2 → 4.8' },
      { label: { tr: 'YORUM / AY', en: 'REVIEWS / MO' }, value: '+184%' },
      { label: { tr: 'İLK YANIT', en: 'FIRST REPLY' }, value: '12 dk' },
      { label: { tr: 'KAPSAM', en: 'COVERAGE' }, value: '3 şube' },
    ],
    highlights: [
      {
        tr: '40 masalık mekanda her masaya özel QR + fatura altına platform seçim QR\'ı. Müşteri seçim yapıyor: Google, Yemeksepeti, Getir, Trendyol GO.',
        en: 'Per-table QR in a 40-cover venue plus a platform-select QR on every receipt. Customers choose: Google, Yemeksepeti, Getir, Trendyol GO.',
      },
      {
        tr: 'AI Co-Pilot düşük puana 12 dakika içinde Türkçe taslak yanıt üretiyor — sahibi onayla gönderiyor, tüm işlem 30 saniye.',
        en: 'AI Co-Pilot drafts a Turkish reply to low ratings within 12 minutes — the owner approves and sends in 30 seconds.',
      },
      {
        tr: 'Ayda 340 yeni yorum, 94\'ü Google Maps\'e akıyor. Organik görünürlük artışı = yeni rezervasyon akışı.',
        en: '340 new reviews a month, 94 routed to Google Maps. Organic visibility translates to reservation volume.',
      },
    ],
    quote: {
      tr: 'İlk ay içinde Google ortalamamız 4.2\'den 4.8\'e çıktı. Yemeksepeti sayfamızdaki 3,9, artık 4,6 — siparişlerde %22 büyüme gördük.',
      en: 'Within the first month our Google average jumped from 4.2 to 4.8. Our Yemeksepeti rating — used to sit at 3.9 — is now 4.6, with a 22% lift in orders.',
    },
    person: { name: 'Emre Kaya', role: { tr: 'İşletme Sahibi', en: 'Founder' } },
  },
  {
    slug: 'hotel-nora',
    brand: 'Hotel Nora',
    sector: { tr: 'Otel', en: 'Hotel' },
    location: 'Bodrum',
    hero: {
      tr: 'Check-out sonrası WhatsApp + oda kartı QR = 6 ayda Booking.com\'da 3.9\'dan 4.7\'ye.',
      en: 'Post-checkout WhatsApp + in-room key-card QR — Booking.com score climbed from 3.9 to 4.7 in six months.',
    },
    subtitle: {
      tr: 'Oda QR\'ı, restoran masa QR\'ı, spa resepsiyon QR\'ı ve çıkışta özel check-out mesajı — dört farklı temas, tek panel.',
      en: 'Room QR, restaurant QR, spa reception QR, and a branded checkout message — four touchpoints, one panel.',
    },
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
        tr: 'Check-out sonrası 2 saat içinde gönderilen WhatsApp mesajı, Tripadvisor ve Booking\'e yönlendiren kişiselleştirilmiş link içeriyor.',
        en: 'A personalised WhatsApp link goes out within two hours of checkout, routing straight to the right platform (Tripadvisor or Booking).',
      },
      {
        tr: 'Spa + restoran + lobi için ayrı QR kampanyaları — departman bazlı analytics yönetim ekibine gerçek zamanlı rapor gönderiyor.',
        en: 'Separate QR campaigns for spa, restaurant and lobby — per-department analytics stream into the management dashboard.',
      },
    ],
    quote: {
      tr: 'Buaze\'den sonra her hafta 40-50 yeni yorum alıyoruz. En değerlisi: şikayetleri konuk henüz otelden ayrılmadan görebiliyoruz.',
      en: "Since Buaze we pick up 40–50 new reviews a week. The real gold: we see complaints before the guest has even checked out.",
    },
    person: { name: 'Julia Martens', role: { tr: 'Genel Müdür', en: 'General Manager' } },
  },
  {
    slug: 'derma-klinik',
    brand: 'Derma+ Klinik',
    sector: { tr: 'Klinik & Sağlık', en: 'Clinic & Health' },
    location: 'Ankara',
    hero: {
      tr: 'KVKK uyumlu anket akışı + randevu sonrası otomatik mesaj = Google puanı 4.9, yeni hasta akışı %41 arttı.',
      en: 'KVKK-compliant survey flow + automated post-appointment messages — Google rating 4.9, new-patient flow up 41%.',
    },
    subtitle: {
      tr: 'Bekleme salonunda QR + randevu sonrası SMS + ay sonu takip anketi. Hastalar gönüllü olarak yıldız bırakıyor, sahte yorum riski sıfır.',
      en: 'Waiting-room QR + post-visit SMS + end-of-month follow-up. Patients opt in to leave a star rating — zero risk of fake reviews.',
    },
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
    quote: {
      tr: 'Hastalarımız artık bizi Google\'da görüyor. İşletme puanımız aylık olarak değil, canlı olarak yükseliyor — bu da yeni hasta akışını doğrudan etkiledi.',
      en: 'Patients see us on Google now. The score updates live, not monthly — and that directly affects the flow of new patients.',
    },
    person: { name: 'Dr. Zeynep Aydın', role: { tr: 'Kurucu Hekim', en: 'Founding Physician' } },
  },
];

const VALID = ['tr', 'en'] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const study = STUDIES.find((s) => s.slug === slug);
  if (!study) return { title: 'Case study · Buaze' };
  const isTr = locale === 'tr';
  const title = `${study.brand} · ${isTr ? 'Buaze ile' : 'with Buaze'}`;
  return {
    title: `${title} | Buaze`,
    description: study.hero[isTr ? 'tr' : 'en'],
    alternates: {
      canonical: `https://buaze.com/${locale}/case-study/${slug}`,
      languages: {
        tr: `https://buaze.com/tr/case-study/${slug}`,
        en: `https://buaze.com/en/case-study/${slug}`,
      },
    },
  };
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!VALID.includes(locale as typeof VALID[number])) notFound();
  const study = STUDIES.find((s) => s.slug === slug);
  if (!study) notFound();

  const t = getTranslations(locale);
  const isTr = locale === 'tr';
  const base = `/${locale}`;

  const otherStudies = STUDIES.filter((s) => s.slug !== slug).slice(0, 2);

  return (
    <div className="min-h-screen bg-white pt-[64px]">
      <MarketingNavbar locale={locale} t={t} />

      {/* Breadcrumb */}
      <div className="border-b border-[#EDEDED] bg-[#FAFAFA] px-6 py-4 sm:px-10">
        <div className="mx-auto max-w-[1200px]">
          <Link
            href={`${base}/customer-stories`}
            className="inline-flex items-center gap-1.5 pulse-eyebrow text-[#737373] hover:text-[#0A0A0A]"
          >
            <ArrowLeft size={12} />
            {isTr ? 'TÜM VAKA ÇALIŞMALARI' : 'ALL CASE STUDIES'}
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="px-6 sm:px-10 py-16 sm:py-24">
        <div className="mx-auto max-w-[1000px]">
          <p className="pulse-eyebrow text-[#737373]">
            {study.sector[isTr ? 'tr' : 'en']} · {study.location}
          </p>
          <h1
            className="mt-3 text-[44px] sm:text-[56px] lg:text-[72px] font-medium leading-[0.98] tracking-[-0.035em] text-[#0A0A0A]"
            style={{ fontFamily: 'var(--font-space-grotesk)' }}
          >
            {study.brand}
          </h1>
          <p className="mt-6 max-w-[760px] text-[18px] leading-[1.55] text-[#0A0A0A] sm:text-[22px]">
            {study.hero[isTr ? 'tr' : 'en']}
          </p>
          <p className="mt-4 max-w-[720px] text-[15px] leading-[1.65] text-[#525252]">
            {study.subtitle[isTr ? 'tr' : 'en']}
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-[#EDEDED] bg-[#FAFAFA] px-6 py-10 sm:px-10 sm:py-14">
        <div className="mx-auto max-w-[1000px] grid grid-cols-2 gap-6 sm:grid-cols-4">
          {study.stats.map((stat) => (
            <div key={stat.label.en} className="border-t-2 border-[#0A0A0A] pt-3">
              <p className="pulse-eyebrow text-[#737373]">
                {stat.label[isTr ? 'tr' : 'en']}
              </p>
              <p
                className="mt-2 text-[28px] font-medium leading-none tracking-tight text-[#0A0A0A] sm:text-[34px]"
                style={{ fontFamily: 'var(--font-space-grotesk)' }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Highlights */}
      <section className="px-6 sm:px-10 py-16 sm:py-20">
        <div className="mx-auto max-w-[1000px]">
          <span className="pulse-eyebrow text-[#737373]">
            {isTr ? 'SÜRECİN ÖZETİ' : 'HOW IT PLAYED OUT'}
          </span>
          <div className="mt-6 space-y-4">
            {study.highlights.map((highlight, i) => (
              <div
                key={i}
                className="rounded-2xl border border-[#EDEDED] bg-white p-6 sm:p-7 grid grid-cols-[auto_1fr] gap-5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C6F24E] text-[14px] font-semibold text-[#0A0A0A]">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <p className="text-[15px] leading-[1.7] text-[#0A0A0A]">{highlight[isTr ? 'tr' : 'en']}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="bg-[#0A0A0A] px-6 sm:px-10 py-20 sm:py-24">
        <div className="mx-auto max-w-[900px]">
          <Quote size={32} className="text-[#C6F24E]" />
          <blockquote
            className="mt-6 text-[28px] font-medium leading-[1.35] tracking-tight text-white sm:text-[36px] lg:text-[44px]"
            style={{ fontFamily: 'var(--font-space-grotesk)' }}
          >
            "{study.quote[isTr ? 'tr' : 'en']}"
          </blockquote>
          <div className="mt-8 flex items-center gap-4">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[#C6F24E] text-[#0A0A0A] text-[18px] font-semibold"
              style={{ fontFamily: 'var(--font-space-grotesk)' }}
            >
              {study.person.name
                .split(' ')
                .map((part) => part.charAt(0))
                .slice(0, 2)
                .join('')}
            </span>
            <div>
              <p className="text-[15px] font-semibold text-white">{study.person.name}</p>
              <p className="text-[12px] text-white/60">
                {study.person.role[isTr ? 'tr' : 'en']} · {study.brand}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Related */}
      {otherStudies.length > 0 && (
        <section className="px-6 sm:px-10 py-16 sm:py-20">
          <div className="mx-auto max-w-[1200px]">
            <div className="flex items-end justify-between gap-4">
              <h2
                className="text-[28px] font-medium tracking-[-0.025em] text-[#0A0A0A] sm:text-[36px]"
                style={{ fontFamily: 'var(--font-space-grotesk)' }}
              >
                {isTr ? 'Başka sektörlerden' : 'From other sectors'}
              </h2>
              <Link
                href={`${base}/customer-stories`}
                className="pulse-eyebrow text-[#737373] hover:text-[#0A0A0A]"
              >
                {isTr ? 'TÜMÜ' : 'ALL'} →
              </Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {otherStudies.map((o) => (
                <Link
                  key={o.slug}
                  href={`${base}/case-study/${o.slug}`}
                  className="rounded-2xl border border-[#EDEDED] bg-white p-6 transition-colors hover:border-[#0A0A0A]"
                >
                  <p className="pulse-eyebrow text-[#737373]">
                    {o.sector[isTr ? 'tr' : 'en']} · {o.location}
                  </p>
                  <h3
                    className="mt-2 text-[22px] font-medium text-[#0A0A0A]"
                    style={{ fontFamily: 'var(--font-space-grotesk)' }}
                  >
                    {o.brand}
                  </h3>
                  <p className="mt-2 text-[14px] leading-[1.6] text-[#525252] line-clamp-3">
                    {o.hero[isTr ? 'tr' : 'en']}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-[13px] font-medium text-[#0A0A0A]">
                    <TrendingUp size={14} className="text-[#C6F24E]" />
                    <span>{o.stats[0].value}</span>
                    <span className="pulse-eyebrow text-[#737373] ml-2">
                      {o.stats[0].label[isTr ? 'tr' : 'en']}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
