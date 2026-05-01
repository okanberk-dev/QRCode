import type { Metadata } from 'next';
import { Check, X } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export const dynamic = 'force-dynamic';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import Link from 'next/link';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getTranslations(locale);
  return {
    title: t.pl_case_hero_title + ' | Buaze',
    description: t.pl_case_hero_desc,
    alternates: {
      canonical: `https://buaze.com/${locale}/case-study/pizza-locale`,
      languages: {
        tr: 'https://buaze.com/tr/case-study/pizza-locale',
        en: 'https://buaze.com/en/case-study/pizza-locale',
      },
    },
  };
}

export default async function PizzaLocaleCaseStudy({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const base = `/${locale}`;
  const isTr = locale === 'tr';

  const metrics = [
    {
      value: '+420%',
      label: t.pl_case_metric_growth_label,
      desc: isTr ? '90 gün sonunda geri bildirim artışı' : 'Feedback increase after 90 days',
    },
    {
      value: '4dk',
      label: t.pl_case_metric_speed_label,
      desc: isTr ? 'Operasyonel yanıt hızı' : 'Operational response speed',
    },
    {
      value: '12',
      label: t.pl_case_metric_locations_label,
      desc: isTr ? 'Aktif yönetilen şube' : 'Active managed branches',
    },
    {
      value: '4.8',
      label: 'Google Rating',
      desc: isTr ? 'Genel puan ortalaması' : 'Global rating average',
    },
  ];

  const sections = [
    {
      eyebrow: isTr ? 'MEYDAN OKUMA' : 'THE CHALLENGE',
      title: t.pl_case_challenge_title,
      body: [
        t.pl_case_challenge_desc,
        isTr
          ? 'Hamurundaki kaliteyi tüm şubelerinde standardize eden Pizza Locale, dijitaldeki "sessiz çoğunluğu" harekete geçirmek ve her lokasyondaki operasyonel detayı merkezi bir panelden izlemek istiyordu.'
          : 'Standardizing its quality across all branches, Pizza Locale wanted to activate the "silent majority" in the digital space and monitor operational details at every location from a centralized panel.',
      ],
    },
    {
      eyebrow: isTr ? 'ÇÖZÜM' : 'THE SOLUTION',
      title: t.pl_case_solution_title,
      body: [
        t.pl_case_solution_desc,
        isTr
          ? 'Dinamik QR altyapımız ile her şube için özelleştirilmiş, garson ve masayı bile takip edebilen bir yapı kuruldu. Geri bildirimler sadece Google\'a yönlendirilmekle kalmadı; şube yöneticilerine anlık Telegram ve e-posta bildirimleri olarak düştü.'
          : 'With our dynamic QR infrastructure, a structure customized for each branch was established, tracking waitstaff and tables. Feedback was not only directed to Google; it also fell to branch managers as instant Telegram and email notifications.',
      ],
    },
    {
      eyebrow: isTr ? 'SONUÇLAR' : 'THE RESULTS',
      title: t.pl_case_results_title,
      body: [
        t.pl_case_results_desc,
        isTr
          ? 'Yıllık bazda toplanan geri bildirim sayısı 5 katına çıkarken, Google Haritalar üzerindeki görünürlük %300 oranında arttı. En önemlisi, yönetim mutfak ve servis arasındaki dengeyi veriye dayalı olarak yönetmeye başladı.'
          : 'While the number of feedbacks collected annually increased fivefold, visibility on Google Maps increased by 300%. Most importantly, management began managing the balance between kitchen and service based on data.',
      ],
    },
  ];

  const before = isTr
    ? [
        'Masalarda işlevsiz, statik QR kodlar',
        "Negatif yorumların Google'a doğrudan sızması",
        'Mutfak–servis performansında veri eksikliği',
        'Haftalık 10–15 rastgele geri bildirim',
      ]
    : [
        'Static, dysfunctional QR codes on tables',
        'Negative reviews leaking directly to Google',
        'Lack of data in kitchen–service performance',
        '10–15 random feedbacks per week',
      ];

  const after = isTr
    ? [
        'Dinamik, şube-masa takipli akıllı QR',
        'Negatif geri bildirimin anında yönetime düşmesi',
        'Müdür panelinde şeffaf performans verisi',
        'Günlük 50+ doğrulanmış müşteri görüşü',
      ]
    : [
        'Dynamic, location-tracked smart QRs',
        'Instant routing of negative feedback',
        'Transparent performance data for managers',
        '50+ verified customer insights daily',
      ];

  const branches = [
    { name: isTr ? 'Çeşme' : 'Downtown', score: '4.9', width: '98%' },
    { name: isTr ? 'Alsancak' : 'Metropolitan', score: '4.8', width: '94%' },
    { name: isTr ? 'Bağdat Cad.' : 'Waterfront', score: '4.7', width: '88%' },
    { name: isTr ? 'Bursa' : 'Uptown', score: '4.9', width: '96%' },
  ];

  const roadmap = isTr
    ? [
        { step: '01', title: 'Pilot başlangıç', desc: 'İlk şubede dijital itibar test edildi, manuel süreçler terk edildi.' },
        { step: '02', title: 'Standardizasyon', desc: 'Geri bildirim akışı "açılış paketi" standardı hâline getirildi.' },
        { step: '03', title: 'Zincir yönetimi', desc: '12 lokasyondan gelen verilerle marka kalitesi zirveye taşındı.' },
      ]
    : [
        { step: '01', title: 'Pilot launch', desc: 'Digital reputation tested in the first branch, manual processes abandoned.' },
        { step: '02', title: 'Standardization', desc: 'Feedback flow became an "opening package" standard.' },
        { step: '03', title: 'Chain management', desc: 'Brand quality peaked with data from 12 locations.' },
      ];

  const canonicalUrl = `https://buaze.com/${locale}/case-study/pizza-locale`;
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: t.pl_case_hero_title,
    description: t.pl_case_hero_desc,
    author: { '@type': 'Organization', name: 'Buaze' },
    publisher: {
      '@type': 'Organization',
      name: 'Buaze',
      logo: { '@type': 'ImageObject', url: 'https://buaze.com/favicon.svg' },
    },
    mainEntityOfPage: canonicalUrl,
    inLanguage: isTr ? 'tr-TR' : 'en-US',
    about: ['Pizza Locale', 'Restaurant chain', 'Google review management', 'QR feedback system'],
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: isTr ? 'Ana Sayfa' : 'Home', item: `https://buaze.com/${locale}` },
      { '@type': 'ListItem', position: 2, name: isTr ? 'Vaka Çalışmaları' : 'Case Studies', item: `https://buaze.com/${locale}/case-study` },
      { '@type': 'ListItem', position: 3, name: 'Pizza Locale', item: canonicalUrl },
    ],
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0A0A0A] lg:pt-[64px] selection:bg-[#C6F24E]/40">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      {/* ─── Hero ─── */}
      <section className="relative bg-[#0A0A0A] text-white px-5 sm:px-10 pt-[60px] sm:pt-24 pb-20 sm:pb-32 overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#C6F24E]/10 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="max-w-[1000px] mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-[#C6F24E] text-[#0A0A0A] rounded-full pl-2 pr-4 py-1.5">
            <span className="w-2 h-2 rounded-full bg-[#0A0A0A] pulse-heartbeat" />
            <span className="pulse-eyebrow text-[#0A0A0A]">{t.pl_case_hero_badge}</span>
          </div>
          <h1 className="mt-6 text-[38px] sm:text-[56px] md:text-[48px] lg:text-[64px] font-medium leading-[0.95] tracking-[-0.035em] text-white sm:leading-[1.05]">
            {t.pl_case_hero_title}
          </h1>
          <p className="mt-6 text-[17px] sm:text-[19px] text-white/70 leading-[1.6] max-w-[680px] mx-auto">
            {t.pl_case_hero_desc}
          </p>
          <p className="pulse-eyebrow text-[#C6F24E] mt-6">
            {isTr ? 'İZMİR · İSTANBUL · ANKARA · BURSA' : 'LONDON · NEW YORK · BERLIN · PARIS'}
          </p>
        </div>
      </section>

      {/* ─── Metrics ─── */}
      <section className="relative -mt-14 px-5 sm:px-10">
        <div className="max-w-[1100px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-[#EDEDED] shadow-[0_8px_24px_rgba(10,10,10,0.06)]">
              <div
                className="text-[32px] sm:text-[40px] font-medium text-[#0A0A0A] leading-none tracking-[-0.03em]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {m.value}
              </div>
              <div className="pulse-eyebrow text-[#737373] mt-3">{m.label}</div>
              <div className="text-[12px] text-[#525252] mt-2 leading-snug">{m.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Story sections ─── */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-28">
        <div className="max-w-[840px] mx-auto space-y-16 sm:space-y-20">
          {sections.map((s, i) => (
            <div key={i}>
              <span className="pulse-eyebrow text-[#A8D62E]">{s.eyebrow}</span>
              <h2 className="mt-4 text-[26px] sm:text-[40px] font-medium tracking-[-0.03em] leading-[1.05] text-[#0A0A0A]">
                {s.title}
              </h2>
              <div className="mt-5 space-y-4 text-[16px] sm:text-[17px] text-[#525252] leading-[1.7]">
                {s.body.map((p, k) => (
                  <p key={k}>{p}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Before & After ─── */}
      <section className="bg-[#FAFAFA] border-y border-[#EDEDED] px-5 sm:px-10 py-[60px] sm:py-28">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-12 max-w-[640px] mx-auto">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Dönüşüm özeti' : 'Transformation summary'}
            </span>
            <h2 className="mt-4 text-[26px] sm:text-[44px] font-medium tracking-[-0.03em] leading-[1.05] text-[#0A0A0A]">
              {isTr ? 'Manuel süreçlerden profesyonel operasyona.' : 'From manual processes to professional ops.'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white p-7 sm:p-8 rounded-3xl border border-[#EDEDED]">
              <span className="pulse-eyebrow text-[#B91C1C]">
                {isTr ? 'BUAZE ÖNCESİ' : 'BEFORE BUAZE'}
              </span>
              <ul className="mt-5 space-y-3">
                {before.map((text, i) => (
                  <li key={i} className="flex items-start gap-3 text-[14px] text-[#525252]">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-[#FEF2F2] flex items-center justify-center shrink-0">
                      <X size={12} className="text-[#B91C1C]" strokeWidth={2.5} />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[#0A0A0A] p-7 sm:p-8 rounded-3xl text-white">
              <span className="pulse-eyebrow text-[#C6F24E]">
                {isTr ? 'BUAZE SONRASI' : 'AFTER BUAZE'}
              </span>
              <ul className="mt-5 space-y-3">
                {after.map((text, i) => (
                  <li key={i} className="flex items-start gap-3 text-[14px] text-white font-medium">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-[#C6F24E] flex items-center justify-center shrink-0">
                      <Check size={12} className="text-[#0A0A0A]" strokeWidth={3} />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Scaling + branch panel ─── */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-28">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-16 items-start">
          <div>
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Ölçeklendirme' : 'Scaling'}
            </span>
            <h2 className="mt-4 text-[26px] sm:text-[44px] font-medium tracking-[-0.03em] leading-[1.05] text-[#0A0A0A]">
              {isTr ? "1'den 12 şubeye büyüme rehberi." : '1 to 12 branches: the scaling blueprint.'}
            </h2>
            <div className="mt-5 space-y-4 text-[16px] text-[#525252] leading-[1.7]">
              <p>
                {isTr
                  ? "Pizza Locale, Buaze'yi sadece bir yorum toplama aracı olarak değil, bir kalite kontrol sistemi olarak kullandı. Her yeni açılan şubede Buaze entegrasyonu \"açılış paketi\"nin ayrılmaz parçası oldu."
                  : 'Pizza Locale used Buaze not just as a feedback tool, but as a quality control system. In every new branch opened, Buaze integration became an inseparable part of the "opening package."'}
              </p>
              <p>
                {isTr
                  ? 'Merkezi yönetim, tüm şubelerin haftalık memnuniyet skorlarını yan yana getirerek haftalık servis raporu üretti. Operasyonel zayıflıklar gün yüzüne çıktı, şubeler arası sağlıklı rekabet doğdu.'
                  : 'Central management generated a weekly service report by comparing the satisfaction scores of all branches. Operational weaknesses came to light, creating healthy competition between branches.'}
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#EDEDED] rounded-3xl p-7">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'ZİNCİR YÖNETİMİ' : 'CHAIN MANAGEMENT'}
            </span>
            <div className="mt-5 space-y-4">
              {branches.map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-[13px]">
                    <span className="font-medium text-[#0A0A0A]">{item.name}</span>
                    <span className="text-[#A8D62E] font-medium">{item.score} ★</span>
                  </div>
                  <div className="h-1.5 bg-[#EDEDED] rounded-full overflow-hidden">
                    <div className="h-full bg-[#C6F24E]" style={{ width: item.width }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Quote ─── */}
      <section className="bg-[#C6F24E] px-5 sm:px-10 py-[60px] sm:py-28">
        <div className="max-w-[900px] mx-auto text-center">
          <span
            aria-hidden
            className="text-[80px] leading-none text-[#0A0A0A]/20 font-medium"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            &quot;
          </span>
          <p className="mt-2 text-[20px] sm:text-[32px] lg:text-[36px] font-medium text-[#0A0A0A] leading-[1.25] tracking-[-0.02em] -mt-6 sm:leading-[1.2]">
            {isTr
              ? 'Buaze ile dijital itibarımızı yönetmek artık bir iş yükü değil; büyümemizi sağlayan bir yakıt. 12 şubede de aynı kaliteyi ölçebiliyoruz.'
              : 'Managing our digital reputation with Buaze is no longer a chore; it has become the fuel that drives our growth. We can measure the same quality across all 12 branches.'}
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="w-10 h-10 bg-[#0A0A0A] text-[#C6F24E] rounded-full flex items-center justify-center text-[14px] font-semibold">
              M
            </div>
            <div className="text-left">
              <div className="text-[14px] font-medium text-[#0A0A0A]">
                {isTr ? 'Bölge Sorumlusu' : 'Regional Manager'}
              </div>
              <div className="text-[12px] text-[#0A0A0A]/70">Pizza Locale</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Roadmap ─── */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-28">
        <div className="max-w-[1000px] mx-auto">
          <div className="text-center mb-12 max-w-[680px] mx-auto">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Yol haritası' : 'Roadmap'}
            </span>
            <h2 className="mt-4 text-[26px] sm:text-[44px] font-medium tracking-[-0.03em] leading-[1.05] text-[#0A0A0A]">
              {isTr ? "1'den 12'ye büyüme." : 'From 1 to 12 branches.'}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {roadmap.map((item) => (
              <div
                key={item.step}
                className="p-7 bg-[#FAFAFA] border border-[#EDEDED] rounded-2xl"
              >
                <span className="pulse-eyebrow text-[#A8D62E]">
                  {isTr ? 'ADIM' : 'STEP'} {item.step}
                </span>
                <h3 className="mt-3 text-[18px] font-medium text-[#0A0A0A]">{item.title}</h3>
                <p className="mt-2 text-[14px] text-[#525252] leading-[1.6]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="bg-[#0A0A0A] text-white px-5 sm:px-10 py-[60px] sm:py-28">
        <div className="max-w-[820px] mx-auto text-center">
          <h2 className="text-[28px] sm:text-[52px] font-medium leading-[1.04] tracking-[-0.035em] text-white">
            {isTr ? 'Kendi başarı hikâyenizi yazmaya başlayın.' : 'Start writing your own success story.'}
          </h2>
          <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Link
              href={`${base}/auth/register`}
              className="inline-flex items-center justify-center gap-2 bg-[#C6F24E] text-[#0A0A0A] px-7 py-4 rounded-full text-[15px] font-medium hover:bg-[#A8D62E] transition-colors"
            >
              {t.hero_cta}
              <span aria-hidden>→</span>
            </Link>
            <Link
              href={`${base}/contact`}
              className="inline-flex items-center justify-center gap-2 border border-white/20 text-white px-7 py-4 rounded-full text-[15px] font-medium hover:bg-white/10 transition-colors"
            >
              {isTr ? 'Satışla görüş' : 'Talk to sales'}
            </Link>
          </div>
        </div>
      </section>

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
