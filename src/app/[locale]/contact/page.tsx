import type { Metadata } from 'next';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import ContactForm from '@/components/marketing/ContactForm';
import { Mail, Phone, MapPin } from 'lucide-react';

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
    <div className="min-h-screen bg-[#FCFBF7] text-[#1f1e1d] font-sans pt-[64px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />

      {/* Header */}
      <section className="pt-16 sm:pt-20 pb-14 px-5 sm:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="max-w-[560px]">
            <p className="text-[13px] font-semibold text-[#FDBF1D] uppercase tracking-widest mb-4">
              {locale === 'tr' ? 'İletişim' : 'Contact'}
            </p>
            <h1 className="text-[36px] sm:text-[48px] font-extrabold leading-[1.1] tracking-[-0.02em] mb-4">
              {t.contact_title}
            </h1>
            <p className="text-[15px] text-[#6b6760] leading-relaxed">
              {t.contact_subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-16 sm:pb-24 px-5 sm:px-8">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">

          {/* Contact Info */}
          <div className="space-y-5">
            {contactItems.map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-5 bg-white rounded-xl border border-[#e8e4de] hover:border-[#FDBF1D]/30 transition-colors group">
                <div className="w-10 h-10 bg-[#F7F4F0] group-hover:bg-[#FDBF1D]/10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors text-[#6b6760] group-hover:text-[#1f1e1d]">
                  {item.icon}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ada89f] mb-0.5">{item.label}</p>
                  <p className="text-[15px] font-semibold text-[#1f1e1d]">{item.value}</p>
                </div>
              </div>
            ))}

            {/* Extra info */}
            <div className="p-6 bg-[#F7F4F0] rounded-xl border border-[#e8e4de]">
              <p className="text-[13px] text-[#6b6760] leading-relaxed">
                {locale === 'tr'
                  ? 'Genellikle 24 saat içinde yanıt veriyoruz. Demo talepleri için hemen iletişime geçebilirsiniz.'
                  : 'We usually respond within 24 hours. Feel free to reach out for demo requests immediately.'}
              </p>
            </div>
          </div>

          {/* Form */}
          <ContactForm t={t} />
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
