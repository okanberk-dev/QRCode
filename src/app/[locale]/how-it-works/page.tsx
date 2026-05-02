import type { Metadata } from 'next';
import { getTranslations } from '@/lib/translations';
import { jsonLdString } from '@/lib/seo/json-ld';
import type { Locale } from '@/lib/translations';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import {
  IllusCompass,
  IllusInbox,
  IllusChart,
  IllusShield,
} from '@/components/marketing/PulseIllustrations';

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
        ? 'Müşteri QR\'ı tarar, doğrudan Google yorum bağlantısını görür. İsterse aynı akışta sana özel geri bildirim de bırakır; yıldıza göre kapı kapatmıyoruz.'
        : 'The customer scans the QR and sees the public Google review link first. They can optionally also leave private feedback for your team in the same flow — no rating-based gating.',
      Ill: IllusInbox,
      perks: isTr
        ? ['Anlık bildirim', 'Tek tıkla Google bağlantısı', 'Şeffaf yorum akışı', 'Opsiyonel özel geri bildirim']
        : ['Live notifications', 'One-tap Google link', 'Transparent review flow', 'Optional private feedback'],
    },
    {
      id: '03',
      title: isTr ? 'Panelden yönet' : 'Manage from the panel',
      desc: isTr
        ? 'Tüm yorumları tek panelde topla. Buaze Pulse AI olumsuzları otomatik etiketler. Yanıt şablonları ile saniyeler içinde cevap ver.'
        : 'Collect every review in one panel. Buaze Pulse AI tags negatives automatically. Reply in seconds with response templates.',
      Ill: IllusShield,
      perks: isTr
        ? ['Otomatik etiketleme', 'Ekip atama', 'Pulse AI yanıt şablonu', 'Mobil yönetim']
        : ['Auto-tagging', 'Team assignment', 'Pulse AI reply templates', 'Mobile admin'],
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
    <div className="min-h-screen bg-[#FFFFFF] text-[#0A0A0A] lg:pt-[64px] selection:bg-[#C6F24E]/40">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden px-5 sm:px-10 pt-[60px] sm:pt-24 pb-[60px] sm:pb-20">
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
          <h1 className="mt-5 text-[38px] sm:text-[64px] md:text-[52px] lg:text-[72px] font-medium leading-[0.95] tracking-[-0.035em] text-[#0A0A0A]">
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
          <p className="mt-6 text-[15px] sm:text-[18px] text-[#525252] leading-[1.6] max-w-[560px] mx-auto">
            {isTr
              ? 'Karmaşık yazılımı ve müşteri psikolojisini sade bir akışa indirdik. Kurulum beş dakika, sonuç ömür boyu.'
              : 'We reduced complex software and customer psychology into a simple flow. Five-minute setup, lifetime return.'}
          </p>
        </div>
      </section>

      {/* ─── Timeline · design: center line + numbered circle, alternating sides ─── */}
      <section className="px-5 sm:px-10 pb-[60px] sm:pb-24">
        <div className="relative max-w-[1100px] mx-auto">
          {/* Vertical center line — desktop only */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 bottom-0 w-[2px] bg-[#EDEDED] -translate-x-1/2 hidden lg:block"
          />

          <div className="space-y-16 lg:space-y-20">
            {steps.map((step, i) => {
              const sideLeft = i % 2 === 0; // even index: text left, illus right
              return (
                <div
                  key={step.id}
                  className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-8 lg:gap-10"
                >
                  {/* Content column (text side on desktop) */}
                  <div
                    className={`w-full lg:w-auto text-center space-y-4 ${
                      sideLeft
                        ? 'lg:order-1 lg:text-right lg:pr-4'
                        : 'lg:order-3 lg:text-left lg:pl-4'
                    }`}
                  >
                    <span className="pulse-eyebrow text-[#A8D62E]">
                      {isTr ? 'ADIM' : 'STEP'} {step.id}
                    </span>
                    <h2
                      className="text-[26px] sm:text-[36px] font-medium leading-[1.05] tracking-[-0.025em] text-[#0A0A0A]"
                    >
                      {step.title}
                    </h2>
                    <p
                      className={`text-[15px] sm:text-[16px] text-[#525252] leading-[1.6] max-w-[420px] ${
                        sideLeft ? 'mx-auto lg:ml-auto lg:mr-0' : 'mx-auto lg:mr-auto lg:ml-0'
                      }`}
                    >
                      {step.desc}
                    </p>
                    <ul
                      className={`flex flex-wrap gap-x-4 gap-y-1.5 max-w-[420px] ${
                        sideLeft ? 'mx-auto lg:ml-auto lg:mr-0 lg:justify-end' : 'mx-auto lg:mr-auto lg:ml-0'
                      }`}
                    >
                      {step.perks.map((p) => (
                        <li key={p} className="flex items-center gap-1.5 text-[13px] text-[#525252]">
                          <span className="h-3.5 w-3.5 rounded-full bg-[#C6F24E] text-[#0A0A0A] flex items-center justify-center text-[9px] font-bold shrink-0">
                            ✓
                          </span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Center numbered circle (desktop) / inline pill (mobile) */}
                  <div className="flex justify-center lg:order-2 relative">
                    <div
                      className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#C6F24E] text-[#0A0A0A] text-[16px] font-semibold"
                      style={{
                        fontFamily: 'var(--font-heading)',
                        boxShadow: '0 0 0 4px #FFFFFF, 0 0 0 6px #0A0A0A',
                      }}
                    >
                      {step.id}
                    </div>
                  </div>

                  {/* Illus column (other side on desktop) */}
                  <div
                    className={`w-full lg:w-auto flex justify-center ${
                      sideLeft ? 'lg:order-3' : 'lg:order-1'
                    }`}
                  >
                    <div className="bz-card-soft p-8 sm:p-10 flex items-center justify-center aspect-square max-w-[300px] w-full">
                      <step.Ill size={200} className="w-full h-auto max-w-[220px]" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
