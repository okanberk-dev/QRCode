import type { Metadata } from 'next';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export const dynamic = 'force-dynamic';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import ContactForm from '@/components/marketing/ContactForm';
import { Mail, MapPin, Briefcase, Megaphone } from 'lucide-react';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'İletişim — Buaze' : 'Contact — Buaze',
    description: locale === 'tr'
      ? 'Buaze ekibiyle iletişime geçin. Sorularınızı, demo taleplerinizi veya destek isteklerinizi iletin.'
      : 'Get in touch with the Buaze team. Send your questions, demo requests, or support inquiries.',
    alternates: {
      canonical: `https://buaze.com/${locale}/contact`,
      languages: { tr: 'https://buaze.com/tr/contact', en: 'https://buaze.com/en/contact' },
    },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Buaze',
    url: 'https://buaze.com',
    email: 'hello@buaze.com',
    address: { '@type': 'PostalAddress', addressLocality: 'Ataşehir, İstanbul', addressCountry: 'TR' },
  };

  const contactItems = isTr
    ? [
        { icon: <Briefcase size={18} />, label: 'SATIŞ', value: 'satis@buaze.com', sub: 'Demo ve fiyatlandırma' },
        { icon: <Mail size={18} />, label: 'DESTEK', value: 'destek@buaze.com', sub: '7/24 yanıt' },
        { icon: <Megaphone size={18} />, label: 'BASIN', value: 'basin@buaze.com', sub: 'Medya ve işbirliği' },
        { icon: <MapPin size={18} />, label: 'ADRES', value: 'Maslak, İstanbul', sub: 'Workinton Maslak, Kat 4' },
      ]
    : [
        { icon: <Briefcase size={18} />, label: 'SALES', value: 'sales@buaze.com', sub: 'Demo and pricing' },
        { icon: <Mail size={18} />, label: 'SUPPORT', value: 'support@buaze.com', sub: '24/7 reply' },
        { icon: <Megaphone size={18} />, label: 'PRESS', value: 'press@buaze.com', sub: 'Media and partnerships' },
        { icon: <MapPin size={18} />, label: 'ADDRESS', value: 'Maslak, Istanbul', sub: 'Workinton Maslak, Floor 4' },
      ];

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0A0A0A] pt-[64px] selection:bg-[#C6F24E]/40">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden px-5 sm:px-10 pt-[60px] sm:pt-24 pb-10 sm:pb-14">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.5]"
          width="100%"
          height="100%"
        >
          <defs>
            <pattern id="contactGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#EDEDED" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#contactGrid)" />
        </svg>
        <div className="relative max-w-[1200px] mx-auto">
          <div className="max-w-[720px]">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'İletişim' : 'Contact'}
            </span>
            <h1 className="mt-5 text-[38px] sm:text-[60px] lg:text-[68px] font-medium leading-[0.95] sm:leading-[0.98] tracking-[-0.035em] text-[#0A0A0A]">
              {isTr ? 'Konuşalım.' : "Let's talk."}
            </h1>
            <p className="mt-5 text-[17px] sm:text-[18px] text-[#525252] leading-[1.55] max-w-[560px]">
              {isTr
                ? 'Sorularınız, demo istekleri, ortaklık — hangisi olursa olsun, ortalama 2 saat içinde yanıt veriyoruz.'
                : 'Questions, demo requests, partnerships — whatever it is, we reply within 2 hours on average.'}
            </p>
          </div>
        </div>
      </section>

      {/* ─── Main ─── */}
      <section className="px-5 sm:px-10 pb-[60px] sm:pb-28">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left: contact info + support */}
          <div className="space-y-5">
            {contactItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-5 p-6 bg-white rounded-2xl border border-[#EDEDED]"
              >
                <div className="w-11 h-11 bg-[#EAF9B8] rounded-lg flex items-center justify-center shrink-0 text-[#0A0A0A]">
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <p className="pulse-eyebrow text-[#737373] mb-1">{item.label}</p>
                  <p className="text-[16px] sm:text-[18px] font-semibold text-[#0A0A0A] tracking-[-0.01em] truncate">
                    {item.value}
                  </p>
                  <p className="text-[12px] text-[#737373] mt-0.5">{item.sub}</p>
                </div>
              </div>
            ))}

            {/* Support promise */}
            <div className="bg-[#0A0A0A] rounded-3xl p-8 sm:p-10 text-white relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-[#C6F24E]/10 rounded-full blur-[80px] pointer-events-none" />
              <div className="relative">
                <span className="pulse-eyebrow text-[#C6F24E]">
                  {isTr ? 'Destek sözü' : 'Support promise'}
                </span>
                <h3 className="mt-4 text-[24px] sm:text-[30px] font-medium text-white tracking-[-0.02em] leading-tight">
                  {isTr ? 'Hızlı yanıt, odaklı çözüm.' : 'Fast reply, focused resolution.'}
                </h3>
                <p className="mt-4 text-[14px] sm:text-[15px] text-white/70 leading-[1.6]">
                  {isTr
                    ? 'İşletmenizin dijital itibarını her saniye koruyoruz. Destek ekibimiz taleplere ortalama 2 saat içinde dönüyor.'
                    : 'We protect your digital reputation every second. Our support team replies within 2 hours on average.'}
                </p>

                <div className="grid grid-cols-2 gap-3 mt-7">
                  <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                    <p className="pulse-eyebrow text-white/60 mb-2">
                      {isTr ? 'ORT. YANIT' : 'AVG REPLY'}
                    </p>
                    <p
                      className="text-[26px] font-medium text-[#C6F24E] leading-none tracking-[-0.02em]"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      ~120 dk
                    </p>
                  </div>
                  <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                    <p className="pulse-eyebrow text-white/60 mb-2">
                      {isTr ? 'BAŞARI' : 'SUCCESS'}
                    </p>
                    <p
                      className="text-[26px] font-medium text-[#C6F24E] leading-none tracking-[-0.02em]"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      %99.4
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div className="bg-white rounded-3xl border border-[#EDEDED] shadow-[0_8px_24px_rgba(10,10,10,0.04)] p-2 overflow-hidden">
            <ContactForm t={t} locale={locale} />
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
