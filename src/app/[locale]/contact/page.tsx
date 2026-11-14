import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Clock, Mail, MapPin } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import ContactForm, { type ContactFormCopy } from '@/components/marketing/ContactForm';
import { jsonLdString } from '@/lib/seo/json-ld';
import { SITE_URL } from '@/lib/site';
import { getCompanyFacts, ORGANIZATION_ID, SUPPORT_HOURS, WEBSITE_ID } from '@/lib/company-facts';
import { getTranslations, type Locale } from '@/lib/translations';

/**
 * /contact — one public mailbox (support@buaze.com), one support promise
 * (SUPPORT_HOURS) and the address from the admin legal variables via
 * getCompanyFacts() (NAP parity with the footer and the Organization
 * JSON-LD, CLAUDE.md §19.1.2 + §47). The form comes first on every screen
 * size. ISR: nothing here reads headers()/cookies()/searchParams.
 */

export const revalidate = 3600;

type Lang = 'tr' | 'en';

const META = {
  tr: {
    title: 'İletişim: destek ve plan sorularınız için bize yazın',
    description:
      'Buaze ekibine support@buaze.com adresinden veya bu sayfadaki formla ulaşın. Hafta içi 09:00–18:00 (TSİ), genellikle bir iş günü içinde yanıt veriyoruz.',
  },
  en: {
    title: 'Contact: write to us about support or plans',
    description:
      'Write to the Buaze team at support@buaze.com or use the form on this page. We work weekdays 09:00–18:00 Turkey time and usually reply within one business day.',
  },
} as const;

const COPY = {
  tr: {
    eyebrow: 'İletişim',
    h1: 'Buaze ekibiyle iletişime geçin',
    lead: 'Sorunuzu aşağıdaki formla ya da e-postayla iletebilirsiniz. Türkçe veya İngilizce yazabilirsiniz.',
    formTitle: 'Mesaj gönderin',
    formNote: 'Ad, e-posta ve mesaj alanları zorunludur.',
    directTitle: 'Doğrudan ulaşın',
    emailLabel: 'E-posta',
    emailNote: 'Destek, plan ve fatura, basın ve iş birliği talepleri için tek adresimiz.',
    hoursLabel: 'Çalışma saatleri',
    addressLabel: 'Adres',
    selfServeTitle: 'Yanıtı hemen arıyorsanız',
    links: [
      { path: '/faq', label: 'Sık sorulan sorular' },
      { path: '/help', label: 'Yardım merkezi' },
      { path: '/press', label: 'Basın kiti' },
    ],
    home: 'Ana sayfa',
  },
  en: {
    eyebrow: 'Contact',
    h1: 'Contact the Buaze team',
    lead: 'Send your question with the form below or by e-mail. You can write in Turkish or English.',
    formTitle: 'Send a message',
    formNote: 'Name, e-mail and message are required.',
    directTitle: 'Reach us directly',
    emailLabel: 'E-mail',
    emailNote: 'One address for support, plans and billing, press and partnership requests.',
    hoursLabel: 'Hours',
    addressLabel: 'Address',
    selfServeTitle: 'Looking for a quick answer?',
    links: [
      { path: '/faq', label: 'Frequently asked questions' },
      { path: '/help', label: 'Help center' },
      { path: '/press', label: 'Press kit' },
    ],
    home: 'Home',
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const lang: Lang = locale === 'en' ? 'en' : 'tr';
  const { title, description } = META[lang];
  const ogImage = lang === 'tr' ? '/images/open-graph-tr.png' : '/images/open-graph-en.png';
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/contact`,
      languages: { tr: '/tr/contact', en: '/en/contact', 'x-default': '/tr/contact' },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: lang === 'tr' ? 'tr_TR' : 'en_US',
      url: `${SITE_URL}/${lang}/contact`,
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const lang: Lang = locale === 'en' ? 'en' : 'tr';
  const t = getTranslations(lang);
  const copy = COPY[lang];
  const company = await getCompanyFacts();
  const pageUrl = `${SITE_URL}/${lang}/contact`;

  // Only the strings the client form needs (not the whole translations bundle).
  const formCopy: ContactFormCopy = {
    name: t.contact_form_name,
    email: t.contact_form_email,
    business: t.contact_form_business,
    phone: t.contact_form_phone,
    message: t.contact_form_message,
    submit: t.contact_form_submit,
    successTitle: t.contact_success_title,
    successDesc: t.contact_success_desc,
    successAgain: t.contact_success_again,
    emailPlaceholder: t.contact_email_placeholder,
    messagePlaceholder: t.contact_message_placeholder,
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ContactPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: copy.h1,
        description: META[lang].description,
        inLanguage: lang === 'tr' ? 'tr-TR' : 'en-US',
        isPartOf: { '@id': WEBSITE_ID },
        about: { '@id': ORGANIZATION_ID },
        mainEntity: { '@id': ORGANIZATION_ID },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: copy.home, item: `${SITE_URL}/${lang}` },
          { '@type': 'ListItem', position: 2, name: copy.eyebrow, item: pageUrl },
        ],
      },
    ],
  };

  const iconBox =
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#EAF9B8] text-[#0A0A0A]';

  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] lg:pt-[64px] selection:bg-[#C6F24E]/40">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <MarketingNavbar locale={lang} />
      <main id="main-content">
        {/* Hero */}
        <section aria-labelledby="contact-title" className="pt-[60px] pb-10 sm:pt-20 sm:pb-14">
          <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-10">
            <div className="max-w-[720px]">
              <p className="pulse-eyebrow text-[#737373]">{copy.eyebrow}</p>
              <h1
                id="contact-title"
                className="mt-4 text-balance text-[38px] leading-[1.02] tracking-[-0.035em] text-[#0A0A0A] sm:text-[56px] md:text-[52px] lg:text-[64px]"
              >
                {copy.h1}
              </h1>
              <p className="mt-5 max-w-[640px] text-pretty text-[16px] leading-[1.6] text-[#525252] sm:text-[18px]">
                {copy.lead}
              </p>
            </div>
          </div>
        </section>

        {/* Form first (DOM + mobile), contact details beside it on desktop */}
        <div className="bg-[#FAFAFA] py-[60px] sm:py-24">
          <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-start gap-6 px-5 sm:px-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-8">
            <section
              aria-labelledby="contact-form-title"
              className="rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8"
            >
              <h2 id="contact-form-title" className="text-[24px] leading-[1.15] text-[#0A0A0A] sm:text-[28px]">
                {copy.formTitle}
              </h2>
              <p className="mt-2 mb-6 text-[14px] leading-[1.6] text-[#737373]">{copy.formNote}</p>
              <ContactForm copy={formCopy} locale={lang} />
            </section>

            <div className="space-y-6">
              <section
                aria-labelledby="contact-direct-title"
                className="rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8"
              >
                <h2 id="contact-direct-title" className="text-[24px] leading-[1.15] text-[#0A0A0A] sm:text-[28px]">
                  {copy.directTitle}
                </h2>
                <dl className="mt-6 space-y-6">
                  <div className="flex gap-4">
                    <span aria-hidden="true" className={iconBox}>
                      <Mail size={18} strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                      <dt className="text-[13px] font-medium text-[#737373]">{copy.emailLabel}</dt>
                      <dd className="mt-1">
                        <a
                          href={`mailto:${company.supportEmail}`}
                          className="inline-flex min-h-[44px] items-center text-[17px] font-semibold text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-4 transition-colors hover:decoration-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
                        >
                          {company.supportEmail}
                        </a>
                        <p className="text-[14px] leading-[1.55] text-[#525252]">{copy.emailNote}</p>
                      </dd>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <span aria-hidden="true" className={iconBox}>
                      <Clock size={18} strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                      <dt className="text-[13px] font-medium text-[#737373]">{copy.hoursLabel}</dt>
                      <dd className="mt-1 text-[15px] leading-[1.6] text-[#0A0A0A]">{SUPPORT_HOURS[lang]}</dd>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <span aria-hidden="true" className={iconBox}>
                      <MapPin size={18} strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                      <dt className="text-[13px] font-medium text-[#737373]">{copy.addressLabel}</dt>
                      <dd className="mt-1 text-[15px] leading-[1.6] text-[#0A0A0A]">
                        <address className="not-italic">
                          {company.legalName ? (
                            <>
                              {company.legalName}
                              <br />
                            </>
                          ) : null}
                          {company.addressDisplay[lang]}
                        </address>
                      </dd>
                    </div>
                  </div>
                </dl>
              </section>

              <section
                aria-labelledby="contact-selfserve-title"
                className="rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8"
              >
                <h2 id="contact-selfserve-title" className="text-[20px] leading-[1.2] text-[#0A0A0A]">
                  {copy.selfServeTitle}
                </h2>
                <ul className="mt-3">
                  {copy.links.map((link) => (
                    <li key={link.path} className="border-b border-[#EDEDED] last:border-b-0">
                      <Link
                        href={`/${lang}${link.path}`}
                        className="group flex min-h-[48px] items-center justify-between gap-3 rounded-sm text-[15px] font-medium text-[#0A0A0A] transition-colors hover:text-[#525252] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
                      >
                        {link.label}
                        <ArrowRight
                          size={16}
                          aria-hidden="true"
                          className="shrink-0 transition-transform group-hover:translate-x-0.5"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </div>
      </main>
      <MarketingFooter locale={lang} />
    </div>
  );
}
