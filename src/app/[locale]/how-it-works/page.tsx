import type { Metadata } from 'next';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import {
  IllusCompass,
  IllusInbox,
  IllusChart,
  IllusShield,
} from '@/components/marketing/PulseIllustrations';
import Link from 'next/link';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === 'tr';
  const title = isTr ? 'Nasıl Çalışır? — Buaze QR İtibar Yönetimi' : 'How It Works — Buaze QR Reputation Management';
  const description = isTr
    ? 'Buaze ile dijital itibarınızı 3 basit adımda yönetmeye başlayın: QR kod oluştur, müşteri geri bildirimi topla, panelde takip et.'
    : 'Start managing your digital reputation in 3 simple steps with Buaze: create a QR code, collect customer feedback, track in your dashboard.';
  return {
    title: { absolute: title },
    description,
    keywords: isTr
      ? ['QR kod itibar yönetimi nasıl çalışır', 'müşteri geri bildirim sistemi kurulum', 'google yorum toplama sistemi', 'dijital itibar adımları']
      : ['QR reputation management how it works', 'customer feedback system setup', 'Google review collection system', 'digital reputation steps'],
    alternates: {
      canonical: `https://buaze.com/${locale}/how-it-works`,
      languages: { tr: 'https://buaze.com/tr/how-it-works', en: 'https://buaze.com/en/how-it-works', 'x-default': 'https://buaze.com/en/how-it-works' },
    },
    openGraph: {
      title,
      description,
      url: `https://buaze.com/${locale}/how-it-works`,
    },
  };
}

export const dynamic = 'force-dynamic';

export default async function HowItWorksPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const base = `/${locale}`;
  const isTr = locale === 'tr';

  const steps = [
    {
      id: '01',
      title: isTr ? 'QR kodunu yerleştir' : 'Place the QR code',
      desc: isTr
        ? 'Sihirbazla 3 dakikada özel markan ile QR kart tasarla. Masaya, faturaya ya da kapıya yapıştır. Her konum ve personel için farklı kod oluştur.'
        : 'Design a branded QR card with the wizard in 3 minutes. Stick it on the table, receipt or door. Create a distinct code per location and staff member.',
      Ill: IllusCompass,
      perks: isTr
        ? ['2 dakikada hazır', 'Özel tasarım', 'Toplu indir', 'Sayfa başı analiz']
        : ['Ready in 2 minutes', 'Custom design', 'Bulk download', 'Per-page analytics'],
    },
    {
      id: '02',
      title: isTr ? 'Müşteri yorum bırakır' : 'Customer leaves a review',
      desc: isTr
        ? 'Müşteri kodu tarar, bir formda 1-5 puan ve kısa bir not bırakır. Memnunsa Google\'a yönlenir, değilse ekibine iletilir — kriz büyümeden çözülür.'
        : 'The customer scans the code and leaves a 1-5 rating and a short note. Happy ones go to Google; unhappy ones reach your team — a crisis solved before it grows.',
      Ill: IllusInbox,
      perks: isTr
        ? ['Anlık bildirim', 'Akıllı yönlendirme', 'Google uyumlu akış', 'Özel feedback formu']
        : ['Live notifications', 'Smart routing', 'Google-compliant flow', 'Private feedback form'],
    },
    {
      id: '03',
      title: isTr ? 'Panelden yönet' : 'Manage from the panel',
      desc: isTr
        ? 'Tüm yorumları tek panelde topla. AI etiketleme, olumsuzları otomatik atar. Yanıt şablonları ile saniyeler içinde cevap ver.'
        : 'Collect every review in one panel. AI tags route negatives automatically. Reply in seconds with response templates.',
      Ill: IllusShield,
      perks: isTr
        ? ['Otomatik etiketleme', 'Ekip atama', 'AI yanıt şablonu', 'Mobil yönetim']
        : ['Auto-tagging', 'Team assignment', 'AI reply templates', 'Mobile admin'],
    },
    {
      id: '04',
      title: isTr ? 'Canlı analizle izle' : 'Track with live analytics',
      desc: isTr
        ? 'NPS skorun, Google puan değişimin, personel performansın — hepsi canlı dashboard\'da. Haftalık rapor e-postana düşer.'
        : 'Your NPS, Google score shift, staff performance — all in a live dashboard. The weekly digest lands in your inbox.',
      Ill: IllusChart,
      perks: isTr
        ? ['Gerçek zamanlı grafik', 'CSV dışa aktar', 'Şube karşılaştırma', 'SLA takibi']
        : ['Real-time charts', 'CSV export', 'Branch benchmarks', 'SLA tracking'],
    },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'HowTo',
        name: isTr ? 'Buaze ile Dijital İtibarınızı Nasıl Yönetirsiniz?' : 'How to Manage Your Digital Reputation with Buaze',
        description: isTr
          ? 'QR kod oluşturun, müşteri geri bildirimi toplayın ve panelde takip edin.'
          : 'Create a QR code, collect customer feedback, and track in your dashboard.',
        totalTime: 'PT5M',
        step: steps.map((s, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: s.title,
          text: s.desc,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: isTr ? 'Ana Sayfa' : 'Home', item: `https://buaze.com/${locale}` },
          { '@type': 'ListItem', position: 2, name: isTr ? 'Nasıl Çalışır?' : 'How It Works', item: `https://buaze.com/${locale}/how-it-works` },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0A0A0A] pt-[64px] selection:bg-[#C6F24E]/40">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden px-6 sm:px-10 pt-16 sm:pt-24 pb-16 sm:pb-20">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.5]"
          width="100%"
          height="100%"
        >
          <defs>
            <pattern id="hiwGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#EDEDED" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hiwGrid)" />
        </svg>
        <div className="relative max-w-[900px] mx-auto text-center">
          <span className="pulse-eyebrow text-[#737373]">
            {isTr ? 'Nasıl çalışır' : 'How it works'}
          </span>
          <h1 className="mt-5 text-[40px] sm:text-[64px] lg:text-[72px] font-medium leading-[0.98] tracking-[-0.035em] text-[#0A0A0A]">
            {isTr ? (
              <>
                5 dakikada kurulum.
                <br />
                Ömür boyu <span className="inline-block bg-[#C6F24E] rounded-lg px-3 -skew-y-1">ritim</span>.
              </>
            ) : (
              <>
                5-minute setup.
                <br />
                Lifetime <span className="inline-block bg-[#C6F24E] rounded-lg px-3 -skew-y-1">rhythm</span>.
              </>
            )}
          </h1>
          <p className="mt-6 text-[17px] sm:text-[18px] text-[#525252] leading-[1.55] max-w-[560px] mx-auto">
            {isTr
              ? 'Karmaşık yazılımı ve müşteri psikolojisini sade bir akışa indirdik. Kurulum beş dakika, sonuç ömür boyu.'
              : 'We reduced complex software and customer psychology into a simple flow. Five-minute setup, lifetime return.'}
          </p>
        </div>
      </section>

      {/* ─── Detailed Steps ─── */}
      <section className="px-6 sm:px-10 pb-24 sm:pb-32">
        <div className="max-w-[1100px] mx-auto space-y-24 sm:space-y-32">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`flex flex-col ${i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12 lg:gap-20`}
            >
              <div className="w-full lg:flex-1 space-y-5 text-center lg:text-left">
                <span className="pulse-eyebrow text-[#A8D62E]">
                  {isTr ? 'ADIM' : 'STEP'} {step.id}
                </span>
                <h2 className="text-[32px] sm:text-[44px] font-medium leading-[1.05] tracking-[-0.03em] text-[#0A0A0A]">
                  {step.title}
                </h2>
                <p className="text-[16px] sm:text-[17px] text-[#525252] leading-[1.6] max-w-[480px] mx-auto lg:mx-0">
                  {step.desc}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[480px] mx-auto lg:mx-0 pt-2">
                  {step.perks.map((p) => (
                    <div key={p} className="flex items-center gap-2.5 text-[14px] text-[#0A0A0A]">
                      <span className="w-4 h-4 rounded-full bg-[#C6F24E] flex items-center justify-center text-[#0A0A0A] text-[10px] font-bold shrink-0">
                        ✓
                      </span>
                      {p}
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full lg:flex-1 flex justify-center">
                <div className="bg-[#FAFAFA] border border-[#EDEDED] rounded-3xl p-10 sm:p-14 flex items-center justify-center aspect-square max-w-[380px] w-full">
                  <step.Ill size={240} className="w-full h-auto max-w-[260px]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="bg-[#C6F24E] px-6 sm:px-10 py-20 sm:py-28">
        <div className="max-w-[900px] mx-auto text-center">
          <h2 className="text-[36px] sm:text-[56px] font-medium leading-[1.02] tracking-[-0.04em] text-[#0A0A0A]">
            {isTr ? 'Başarı hikâyeni bugün başlat.' : 'Start writing your success story today.'}
          </h2>
          <p className="mt-5 text-[16px] sm:text-[17px] text-[#1A1A1A] max-w-[520px] mx-auto">
            {isTr ? 'Kurulum 2 dakika. Kart bilgisi istemiyoruz. İlk 14 gün ücretsiz.' : '2-minute setup. No card required. First 14 days free.'}
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Link
              href={`${base}/auth/register`}
              className="inline-flex items-center justify-center gap-2 bg-[#0A0A0A] text-white px-7 py-4 rounded-full text-[15px] font-medium hover:bg-[#1A1A1A] transition-colors"
            >
              {isTr ? 'Hemen başla' : 'Get started'}
              <span aria-hidden>→</span>
            </Link>
            <Link
              href={`${base}/pricing`}
              className="inline-flex items-center justify-center gap-2 border-2 border-[#0A0A0A] text-[#0A0A0A] px-7 py-4 rounded-full text-[15px] font-medium hover:bg-[#0A0A0A] hover:text-white transition-colors"
            >
              {isTr ? 'Planları incele' : 'Browse plans'}
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
