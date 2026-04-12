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
      languages: {
        'tr': 'https://buaze.com/tr/contact',
        'en': 'https://buaze.com/en/contact',
      },
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

  const contactItems = [
    { icon: <Mail size={24} />, label: t.contact_email_label, value: t.contact_email, color: 'bg-[#FDBF1D]/10 text-[#FDBF1D] group-hover:bg-[#FDBF1D] group-hover:text-white' },
    { icon: <Phone size={24} />, label: t.contact_phone_label, value: t.contact_phone, color: 'bg-[#79C5D1]/10 text-[#79C5D1] group-hover:bg-[#79C5D1] group-hover:text-white' },
    { icon: <MapPin size={24} />, label: t.contact_address_label, value: t.contact_address, color: 'bg-gray-100 text-gray-400 group-hover:bg-[#111827] group-hover:text-white' },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Buaze',
    url: 'https://buaze.com',
    email: 'hello@buaze.com',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Bursa',
      addressCountry: 'TR',
    },
  };

  return (
    <div className="min-h-screen bg-white text-[#111827] font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <MarketingNavbar locale={locale} t={t} />

      <section className="pt-48 pb-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">

            <div className="space-y-12">
              <div className="space-y-4">
                <h1 className="text-5xl sm:text-7xl font-black tracking-tight">{t.contact_title}</h1>
                <p className="text-xl text-gray-500 font-bold">{t.contact_subtitle}</p>
              </div>

              <div className="space-y-8">
                {contactItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-6 group">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${item.color}`}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-xs uppercase font-black text-gray-400 tracking-widest">{item.label}</p>
                      <p className="text-lg font-black italic">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <ContactForm t={t} />
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
