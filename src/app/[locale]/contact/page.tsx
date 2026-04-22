import type { Metadata } from 'next';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export const dynamic = 'force-dynamic';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import ContactForm from '@/components/marketing/ContactForm';
import { Mail, MapPin, ShieldCheck } from 'lucide-react';

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
      languages: { 'tr': 'https://buaze.com/tr/contact', 'en': 'https://buaze.com/en/contact' },
    },
  };
}

// Fully dynamic page

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Buaze',
    url: 'https://buaze.com',
    email: 'hello@buaze.com',
    address: { '@type': 'PostalAddress', addressLocality: 'Ataşehir, İstanbul', addressCountry: 'TR' },
  };

  const contactItems = [
    { icon: <Mail size={19} />, label: t.contact_email_label, value: t.contact_email },
    { icon: <MapPin size={19} />, label: t.contact_address_label, value: t.contact_address },
  ];

  return (
    <div className="min-h-screen bg-[#F5F4F1] text-[#0F2348] font-sans pt-[64px] selection:bg-[#FF9A14]/30">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />

      {/* ─── Header ─── */}
      <section className="pt-20 sm:pt-32 pb-10 sm:pb-14 px-5 sm:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FF9A14]/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="max-w-[1200px] mx-auto relative">
          <div className="max-w-[720px] space-y-6">
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-white border-2 border-[#0F2348] rounded-full shadow-[3px_3px_0_0_#0F2348] sm:shadow-[4px_4px_0_0_#0F2348]">
               <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em]">{locale === 'tr' ? 'BİZE ULAŞIN' : 'GET IN TOUCH'}</span>
            </div>
            <h1 className="text-[34px] sm:text-[72px] font-black leading-[1.1] sm:leading-[0.95] tracking-tight sm:tracking-[-0.04em] text-[#0F2348]">
              {t.contact_title}
            </h1>
            <p className="text-[17px] sm:text-[22px] text-[#243554] font-bold leading-relaxed max-w-[600px]">
              {t.contact_subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* ─── Main Content (3D Tactile) ─── */}
      <section className="pb-20 sm:pb-40 px-5 sm:px-8">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start">

          {/* Contact Info (3D Cards) */}
          <div className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 gap-6 sm:gap-8">
              {contactItems.map((item, i) => (
                <div key={i} className="flex items-center gap-5 sm:gap-6 p-6 sm:p-8 bg-white rounded-[24px] sm:rounded-[32px] border-[2.5px] sm:border-[3px] border-[#0F2348] shadow-[6px_8px_0_0_#0F2348] sm:shadow-[8px_10px_0_0_#0F2348] hover:shadow-[10px_12px_0_0_#0F2348] transition-all group">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#F5F4F1] border-2 border-[#0F2348] rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 transition-all text-[#0F2348] shadow-[3px_3px_0_0_#0F2348] sm:shadow-[4px_4px_0_0_#0F2348] group-hover:bg-[#FF9A14]">
                    <div className="scale-90 sm:scale-100">{item.icon}</div>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-[12px] font-black uppercase tracking-widest text-[#6B7B93] mb-1">{item.label}</p>
                    <p className="text-[16px] sm:text-[22px] font-black text-[#0F2348] tracking-tight leading-tight">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Premium Support Promise (3D) */}
            <div className="p-8 sm:p-14 bg-[#0F2348] rounded-[32px] sm:rounded-[40px] border-[3px] sm:border-[4px] border-[#0F2348] shadow-[10px_12px_0_0_#FF9A14] sm:shadow-[15px_20px_0_0_#FF9A14] text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF9A14]/10 rounded-full blur-[60px] translate-x-1/2 -translate-y-1/2" />
              
              <div className="flex items-center gap-4 mb-6 sm:mb-8 relative z-10">
                 <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#FF9A14] border-2 border-[#0F2348] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-[3px_3px_0_0_#000] sm:shadow-[4px_4px_0_0_#000]">
                    <ShieldCheck className="text-white w-6 h-6 sm:w-8 sm:h-8" strokeWidth={2.5} />
                 </div>
                 <h4 className="text-[22px] sm:text-[32px] font-black tracking-tight">{locale === 'tr' ? 'Hızlı Destek Sözü' : 'Support Promise'}</h4>
              </div>
              
              <p className="text-[15px] sm:text-[18px] text-[#6B7B93] leading-relaxed font-bold mb-8 sm:mb-10 relative z-10">
                {locale === 'tr'
                  ? 'İşletmenizin dijital itibarını her saniye koruyoruz. Destek ekibimiz tüm taleplere ortalama 2 saat içerisinde çözüm odaklı dönüş yapmaktadır.'
                  : 'We protect your digital reputation every second. Our support team provides solution-oriented responses within 2 hours on average.'}
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 relative z-10">
                 <div className="p-5 sm:p-6 bg-white/5 rounded-2xl sm:rounded-3xl border-2 border-white/10 hover:border-[#FF9A14]/50 transition-colors">
                    <p className="text-[10px] sm:text-[11px] font-black text-[#243554] uppercase tracking-[0.2em] mb-1 sm:mb-2">{locale === 'tr' ? 'ORTALAMA YANIT' : 'AVG RESPONSE'}</p>
                    <p className="text-[24px] sm:text-[28px] font-black text-[#FF9A14] leading-none">~120 DK</p>
                 </div>
                 <div className="p-5 sm:p-6 bg-white/5 rounded-2xl sm:rounded-3xl border-2 border-white/10 hover:border-[#FF9A14]/50 transition-colors">
                    <p className="text-[10px] sm:text-[11px] font-black text-[#243554] uppercase tracking-[0.2em] mb-1 sm:mb-2">{locale === 'tr' ? 'BAŞARI ORANI' : 'SUCCESS RATE'}</p>
                    <p className="text-[24px] sm:text-[28px] font-black text-[#FF9A14] leading-none">%99.4</p>
                 </div>
              </div>
            </div>
          </div>

          {/* Form (Wrapped in 3D Container) */}
          <div className="relative group lg:mt-0 order-first lg:order-last">
             <div className="absolute inset-0 bg-[#FF9A14] rounded-[32px] sm:rounded-[48px] translate-x-3 translate-y-3 sm:translate-x-4 sm:translate-y-4 -z-10 border-[2.5px] sm:border-[3px] border-[#0F2348]" />
             <div className="bg-white p-1 rounded-[32px] sm:rounded-[48px] border-[3px] sm:border-[4px] border-[#0F2348] overflow-hidden shadow-[8px_10px_30px_-15px_rgba(0,0,0,0.1)]">
                <ContactForm t={t} locale={locale} />
             </div>
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
