import type { Metadata } from 'next';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import {
  IllusCompass,
  IllusInbox,
  IllusChart,
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
      title: isTr ? 'QR ile yakala' : 'Capture via QR',
      desc: isTr
        ? 'İşletmene özel QR\'ı masaya, yapışkana, menüye yapıştır. Müşteri tek tarama ile doğrudan akıllı akışa düşer.'
        : 'Stick your branded QR on tables, stickers, menus. One scan routes the customer into your smart flow.',
      Ill: IllusCompass,
      perks: isTr
        ? ['2 dakikada hazır', 'Özel tasarım', 'Toplu indir', 'Sayfa başı analiz']
        : ['Ready in 2 minutes', 'Custom design', 'Bulk download', 'Per-page analytics'],
    },
    {
      id: '02',
      title: isTr ? 'Tek panelde topla' : 'Collect in one panel',
      desc: isTr
        ? 'Google, Yemeksepeti, Getir, Trendyol ve dahili kanaldan gelen yorumlar aynı akışta birleşir. Düşük puanlar dahili forma, yüksek puanlar platforma gider.'
        : 'Google, Yemeksepeti, Getir, Trendyol and internal channel reviews merge into one feed. Low ratings route to your internal form; high ratings go public.',
      Ill: IllusInbox,
      perks: isTr
        ? ['Anlık bildirim', 'Otomatik etiketleme', 'Ekip atama', 'Mobil yönetim']
        : ['Live notifications', 'Auto-tagging', 'Team assignment', 'Mobile admin'],
    },
    {
      id: '03',
      title: isTr ? 'Büyümeyi ölç' : 'Measure growth',
      desc: isTr
        ? 'Puan, kanal, şube ve saat bazında trendleri oku. Hangi aksiyonun neyi değiştirdiğini net gör; ekibi veriyle yönet.'
        : 'Read trends by rating, channel, branch and hour. See exactly which action moved what; manage the team with data.',
      Ill: IllusChart,
      perks: isTr
        ? ['Gerçek zamanlı grafik', 'CSV dışa aktar', 'Şube karşılaştırma', 'SLA takibi']
        : ['Real-time charts', 'CSV export', 'Branch benchmarks', 'SLA tracking'],
    },
  ];

  const features = isTr
    ? [
        { t: 'Geri bildirim yönetimi', d: 'Müşteri deneyimini yapılandırılmış veriye çevirir, itibarınızı korur.' },
        { t: 'Gerçek zamanlı analiz', d: 'Eğilimleri canlı grafiklerle izleyin, zamanında aksiyon alın.' },
        { t: 'Işık hızında kurulum', d: 'Karmaşık entegrasyon yok. 5 dakikada yorum toplamaya başlarsınız.' },
      ]
    : [
        { t: 'Feedback management', d: 'Turns customer experience into structured data, keeps your reputation intact.' },
        { t: 'Real-time analytics', d: 'Monitor trends with live charts, act while it still matters.' },
        { t: 'Lightning setup', d: 'No complex integrations. You start collecting reviews in 5 minutes.' },
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
            {isTr ? 'Sistem nasıl çalışır' : 'How the system works'}
          </span>
          <h1 className="mt-5 text-[40px] sm:text-[64px] lg:text-[72px] font-medium leading-[0.98] tracking-[-0.035em] text-[#0A0A0A]">
            {isTr ? (
              <>
                Üç adım,{' '}
                <span className="inline-block bg-[#C6F24E] rounded-lg px-3 -skew-y-1">üç saniye</span>.
              </>
            ) : (
              <>
                Three steps,{' '}
                <span className="inline-block bg-[#C6F24E] rounded-lg px-3 -skew-y-1">three seconds</span>.
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

      {/* ─── Features ─── */}
      <section className="bg-[#0A0A0A] text-white px-6 sm:px-10 py-20 sm:py-28">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-12 max-w-[720px]">
            <span className="pulse-eyebrow text-[#C6F24E]">
              {isTr ? 'Motor içeride' : 'The engine inside'}
            </span>
            <h2 className="mt-4 text-[32px] sm:text-[48px] font-medium leading-[1.02] tracking-[-0.035em] text-white">
              {isTr ? 'Sade görünüyor. Arkasında yazılım.' : 'Looks simple. Backed by software.'}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.t}
                className="p-7 bg-white/5 rounded-2xl border border-white/10"
              >
                <div className="mb-5 w-10 h-10 rounded-full bg-[#C6F24E] flex items-center justify-center">
                  <span className="text-[#0A0A0A] text-[18px]">✦</span>
                </div>
                <h3 className="text-[20px] font-medium mb-3 text-white">{f.t}</h3>
                <p className="text-[14px] text-white/70 leading-[1.6]">{f.d}</p>
              </div>
            ))}
          </div>
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
