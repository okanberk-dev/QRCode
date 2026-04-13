import type { Metadata } from 'next';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import ContactForm from '@/components/marketing/ContactForm';
import { Mail, Phone, MapPin, ShieldCheck } from 'lucide-react';

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

export function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
}

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
    address: { '@type': 'PostalAddress', addressLocality: 'Bursa', addressCountry: 'TR' },
  };

  const contactItems = [
    { icon: <Mail size={19} />, label: t.contact_email_label, value: t.contact_email },
    { icon: <Phone size={19} />, label: t.contact_phone_label, value: t.contact_phone },
    { icon: <MapPin size={19} />, label: t.contact_address_label, value: t.contact_address },
  ];

  return (
    <div className="min-h-screen bg-[#FCFBF7] text-[#1f1e1d] font-sans pt-[64px] selection:bg-[#FDBF1D]/30">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />

      {/* ─── Header ─── */}
      <section className="pt-20 sm:pt-32 pb-14 px-5 sm:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FDBF1D]/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="max-w-[1200px] mx-auto relative">
          <div className="max-w-[720px] space-y-6">
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-white border-2 border-[#1f1e1d] rounded-full shadow-[4px_4px_0_0_#1f1e1d]">
               <span className="text-[11px] font-black uppercase tracking-[0.2em]">{locale === 'tr' ? 'BİZE ULAŞIN' : 'GET IN TOUCH'}</span>
            </div>
            <h1 className="text-[48px] sm:text-[72px] font-black leading-[0.95] tracking-[-0.04em] text-[#111827]">
              {t.contact_title}
            </h1>
            <p className="text-[18px] sm:text-[22px] text-[#6b6760] font-bold leading-relaxed max-w-[600px]">
              {t.contact_subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* ─── Main Content (3D Tactile) ─── */}
      <section className="pb-24 sm:pb-40 px-5 sm:px-8">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start">

          {/* Contact Info (3D Cards) */}
          <div className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 gap-6 sm:gap-8">
              {contactItems.map((item, i) => (
                <div key={i} className="flex items-center gap-6 p-8 bg-white rounded-[32px] border-[3px] border-[#1f1e1d] shadow-[8px_10px_0_0_#1f1e1d] hover:shadow-[12px_14px_0_0_#1f1e1d] transition-all group">
                  <div className="w-16 h-16 bg-[#F7F4F0] border-[2px] border-[#1f1e1d] rounded-2xl flex items-center justify-center flex-shrink-0 transition-all text-[#111827] shadow-[4px_4px_0_0_#1f1e1d] group-hover:bg-[#FDBF1D]">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-[12px] font-black uppercase tracking-widest text-[#ada89f] mb-1">{item.label}</p>
                    <p className="text-[18px] sm:text-[22px] font-black text-[#111827] tracking-tight">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Premium Support Promise (3D) */}
            <div className="p-10 sm:p-14 bg-[#111827] rounded-[40px] border-[4px] border-[#1f1e1d] shadow-[15px_20px_0_0_#ea580c] text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#ea580c]/10 rounded-full blur-[60px] translate-x-1/2 -translate-y-1/2" />
              
              <div className="flex items-center gap-4 mb-8 relative z-10">
                 <div className="w-14 h-14 bg-[#ea580c] border-2 border-[#1f1e1d] rounded-2xl flex items-center justify-center shadow-[4px_4px_0_0_#000]">
                    <ShieldCheck className="text-white" size={32} strokeWidth={2.5} />
                 </div>
                 <h4 className="text-[24px] sm:text-[32px] font-black tracking-tight">{locale === 'tr' ? 'Hızlı Destek Sözü' : 'Support Promise'}</h4>
              </div>
              
              <p className="text-[16px] sm:text-[18px] text-[#ada89f] leading-relaxed font-bold mb-10 relative z-10">
                {locale === 'tr'
                  ? 'İşletmenizin dijital itibarını her saniye koruyoruz. Destek ekibimiz tüm taleplere ortalama 2 saat içerisinde çözüm odaklı dönüş yapmaktadır.'
                  : 'We protect your digital reputation every second. Our support team provides solution-oriented responses within 2 hours on average.'}
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
                 <div className="p-6 bg-white/5 rounded-3xl border-2 border-white/10 hover:border-[#ea580c]/50 transition-colors">
                    <p className="text-[11px] font-black text-[#6b6760] uppercase tracking-[0.2em] mb-2">{locale === 'tr' ? 'ORTALAMA YANIT' : 'AVG RESPONSE'}</p>
                    <p className="text-[28px] font-black text-[#ea580c] leading-none">~120 DK</p>
                 </div>
                 <div className="p-6 bg-white/5 rounded-3xl border-2 border-white/10 hover:border-[#ea580c]/50 transition-colors">
                    <p className="text-[11px] font-black text-[#6b6760] uppercase tracking-[0.2em] mb-2">{locale === 'tr' ? 'BAŞARI ORANI' : 'SUCCESS RATE'}</p>
                    <p className="text-[28px] font-black text-[#FDBF1D] leading-none">%99.4</p>
                 </div>
              </div>
            </div>
          </div>

          {/* Form (Wrapped in 3D Container) */}
          <div className="relative group lg:mt-0">
             <div className="absolute inset-0 bg-[#FDBF1D] rounded-[48px] translate-x-4 translate-y-4 -z-10 border-[3px] border-[#1f1e1d]" />
             <div className="bg-white p-1 pb-1 rounded-[48px] border-[4px] border-[#1f1e1d] overflow-hidden shadow-[12px_14px_40px_-15px_rgba(0,0,0,0.1)]">
                <ContactForm t={t} />
             </div>
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
