import type { Metadata } from 'next';
import Link from 'next/link';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { notFound } from 'next/navigation';

const VALID_LOCALES = ['tr', 'en'] as const;

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === 'tr'
      ? 'Başarı Hikayeleri — Buaze'
      : 'Customer Stories — Buaze';
  const description =
    locale === 'tr'
      ? '2.400\'den fazla işletme Buaze ile nabzını dinliyor. Restoran, otel, klinik, kafe ve daha fazlasından gerçek sonuçlar.'
      : 'Over 2,400 businesses listen to their pulse with Buaze. Real outcomes from restaurants, hotels, clinics, cafés and more.';
  return {
    metadataBase: new URL('https://buaze.com'),
    title,
    description,
    alternates: {
      canonical: `/${locale}/customer-stories`,
      languages: { tr: '/tr/customer-stories', en: '/en/customer-stories' },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/customer-stories` },
  };
}

export default async function CustomerStoriesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  if (!VALID_LOCALES.includes(locale as typeof VALID_LOCALES[number])) {
    notFound();
  }
  const t = getTranslations(locale);
  const base = `/${locale}`;
  const isTr = locale === 'tr';

  // Real venue photos (Unsplash CC0) per story — gives the customer-stories
  // grid actual texture instead of the previous flat colored stat block.
  const photos = {
    bistro: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1100&q=80',
    hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1100&q=80',
    clinic: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1100&q=80',
    cafe: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1100&q=80',
    legal: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1100&q=80',
    spa: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1100&q=80',
  };

  const stories = isTr
    ? [
        {
          img: photos.bistro,
          b: 'Ark Bistro',
          s: 'Restoran · Kadıköy',
          m: '+184%',
          ml: 'yorum · 90 gün',
          q: 'Google puanımız 4.2\'den 4.8\'e çıktı.',
        },
        {
          img: photos.hotel,
          b: 'Hotel Nora',
          s: 'Otel · Bodrum',
          m: '4.9/5',
          ml: 'Booking',
          q: 'Oda QR\'ları ile her misafir Booking\'e yönleniyor.',
        },
        {
          img: photos.clinic,
          b: 'Derma+',
          s: 'Klinik · Ankara',
          m: '+62%',
          ml: 'aylık randevu',
          q: 'Düşük puanlar halka açık platforma gitmiyor artık.',
        },
        {
          img: photos.cafe,
          b: 'Kahve Dükkan',
          s: 'Kafe · Çeşme · 4 şube',
          m: '3.8 → 4.7',
          ml: 'Google',
          q: 'Tüm şubelerin performansını tek panelde görüyorum.',
        },
        {
          img: photos.legal,
          b: 'Law&Co',
          s: 'Hukuk ofisi · İstanbul',
          m: '+90',
          ml: 'net yorum',
          q: 'Danışma sonrası her müvekkilden yorum alıyoruz.',
        },
        {
          img: photos.spa,
          b: 'Spa Ren',
          s: 'Güzellik · Nişantaşı',
          m: '4.95',
          ml: 'ort. puan',
          q: 'Instagram + Google + Foursquare üçgeninde zirve.',
        },
      ]
    : [
        {
          img: photos.bistro,
          b: 'Ark Bistro',
          s: 'Restaurant · Kadıköy',
          m: '+184%',
          ml: 'reviews · 90 days',
          q: 'Our Google rating climbed from 4.2 to 4.8.',
        },
        {
          img: photos.hotel,
          b: 'Hotel Nora',
          s: 'Hotel · Bodrum',
          m: '4.9/5',
          ml: 'Booking',
          q: 'Room QR codes route every guest to Booking.',
        },
        {
          img: photos.clinic,
          b: 'Derma+',
          s: 'Clinic · Ankara',
          m: '+62%',
          ml: 'monthly bookings',
          q: 'Low scores no longer end up on public platforms.',
        },
        {
          img: photos.cafe,
          b: 'Kahve Dükkan',
          s: 'Café · Çeşme · 4 branches',
          m: '3.8 → 4.7',
          ml: 'Google',
          q: 'I see the performance of every branch on one dashboard.',
        },
        {
          img: photos.legal,
          b: 'Law&Co',
          s: 'Legal · Istanbul',
          m: '+90',
          ml: 'net reviews',
          q: 'Every consultation ends with a review request.',
        },
        {
          img: photos.spa,
          b: 'Spa Ren',
          s: 'Beauty · Nişantaşı',
          m: '4.95',
          ml: 'avg. rating',
          q: 'Top of the Instagram + Google + Foursquare triangle.',
        },
      ];

  return (
    <div className="min-h-screen overflow-x-clip bg-white text-[#0A0A0A] pt-[64px]">
      <MarketingNavbar locale={locale} t={t} />

      <section className="px-6 sm:px-10 pt-16 sm:pt-20 pb-10">
        <div className="max-w-[1200px] mx-auto">
          <span className="pulse-eyebrow text-[#737373]">
            {isTr ? 'Başarı hikayeleri' : 'Customer stories'}
          </span>
          <h1 className="mt-4 text-[40px] sm:text-[56px] lg:text-[72px] font-medium leading-[0.95] tracking-[-0.035em]">
            {isTr ? 'Rakam konuşur.' : 'Numbers do the talking.'}
          </h1>
          <p className="mt-5 text-[16px] text-[#525252] max-w-[560px] leading-[1.6]">
            {isTr
              ? '2.400\'den fazla işletme Buaze ile nabzını dinliyor. İşte bir kısmı.'
              : 'More than 2,400 businesses are listening to their pulse with Buaze. Here are a few.'}
          </p>
        </div>
      </section>

      <section className="px-6 sm:px-10 pb-20">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {stories.map((st) => (
            <div
              key={st.b}
              className="pulse-card-hover overflow-hidden rounded-2xl border border-[#EDEDED] bg-white flex flex-col"
            >
              {/* Photo header — real venue image with dark-to-transparent
                  gradient + stat block bottom-left for a magazine feel. */}
              <div className="relative aspect-[16/9] bg-[#F5F5F5] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={st.img}
                  alt={st.b}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-5 text-white">
                  <p
                    className="text-[34px] sm:text-[40px] font-medium leading-none tracking-[-0.03em]"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {st.m}
                  </p>
                  <p className="pulse-eyebrow mt-1 text-[#C6F24E]">{st.ml}</p>
                </div>
              </div>
              <div className="p-6 flex flex-col gap-3 flex-1">
                <div>
                  <div className="text-[18px] font-semibold">{st.b}</div>
                  <div className="pulse-eyebrow text-[#737373] mt-1">{st.s}</div>
                </div>
                <p className="text-[14px] text-[#525252] leading-[1.55] flex-1">
                  &ldquo;{st.q}&rdquo;
                </p>
                <Link
                  href={`${base}/contact`}
                  className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0A0A0A] hover:text-[#A8D62E] transition-colors"
                >
                  {isTr ? 'Benzer sonuçlar al' : 'Get similar results'}
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#0A0A0A] text-white px-6 sm:px-10 py-20 sm:py-24">
        <div className="max-w-[900px] mx-auto text-center">
          <h2 className="text-[32px] sm:text-[48px] font-medium leading-[1.02] tracking-[-0.035em]">
            {isTr
              ? 'Bir sonraki başarı hikayesi sizinki olsun.'
              : 'Let the next story be yours.'}
          </h2>
          <p className="mt-4 text-[16px] text-white/70 max-w-[560px] mx-auto">
            {isTr
              ? '14 gün ücretsiz · Kredi kartı istemiyoruz · Hızlı kurulum'
              : '14-day free trial · No credit card · Fast setup'}
          </p>
          <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href={`${base}/auth/register`}
              className="inline-flex items-center justify-center gap-2 bg-[#C6F24E] text-[#0A0A0A] px-7 py-4 rounded-full text-[15px] font-medium hover:bg-[#A8D62E] transition-colors"
            >
              {isTr ? 'Ücretsiz başla' : 'Start free'}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
