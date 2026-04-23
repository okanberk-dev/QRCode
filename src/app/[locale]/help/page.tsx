import type { Metadata } from 'next';
import Link from 'next/link';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { notFound } from 'next/navigation';

const VALID_LOCALES = ['tr', 'en'] as const;

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === 'tr' ? 'Yardım Merkezi — Buaze' : 'Help Center — Buaze';
  const description =
    locale === 'tr'
      ? 'Buaze ile ilgili her soruya bir cevap. Kurulum, QR, yorum yönetimi, entegrasyonlar ve faturalandırma rehberleri.'
      : 'An answer for every Buaze question. Setup, QR, review management, integrations and billing guides.';
  return {
    metadataBase: new URL('https://buaze.com'),
    title,
    description,
    alternates: {
      canonical: `/${locale}/help`,
      languages: { tr: '/tr/help', en: '/en/help' },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/help` },
  };
}

export default async function HelpPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  if (!VALID_LOCALES.includes(locale as typeof VALID_LOCALES[number])) {
    notFound();
  }
  const t = getTranslations(locale);
  const base = `/${locale}`;
  const isTr = locale === 'tr';

  const categories = isTr
    ? [
        { k: 'Kurulum', d: 'İlk 5 dakikada Buaze\'i hazırla.', c: 12 },
        { k: 'QR kodu', d: 'Özelleştir, yazdır, konuma bağla.', c: 18 },
        { k: 'Yorum yönetimi', d: 'Atama, SLA, şablonlar, AI yanıt.', c: 24 },
        { k: 'Entegrasyonlar', d: 'Google, Yemeksepeti, Slack ve fazlası.', c: 16 },
        { k: 'Analitik', d: 'NPS, duygu, konum karşılaştırma.', c: 9 },
        { k: 'Faturalandırma', d: 'Plan, iade, vergi, senet belgesi.', c: 7 },
      ]
    : [
        { k: 'Setup', d: 'Get Buaze running in the first 5 minutes.', c: 12 },
        { k: 'QR codes', d: 'Customize, print and bind to a location.', c: 18 },
        { k: 'Review management', d: 'Assign, SLA, templates, AI replies.', c: 24 },
        { k: 'Integrations', d: 'Google, Yemeksepeti, Slack and more.', c: 16 },
        { k: 'Analytics', d: 'NPS, sentiment, location benchmarks.', c: 9 },
        { k: 'Billing', d: 'Plans, refunds, tax and invoices.', c: 7 },
      ];

  const quickLinks = isTr
    ? [
        'İlk QR\'ı nasıl basarım?',
        'Google hesabımı nasıl bağlarım?',
        'Masa numarası nasıl çalışır?',
        'Otomatik yanıt şablonu ekleme',
        'Takım üyesi ekleme',
        'Faturamı nereden indirebilirim?',
      ]
    : [
        'How do I print my first QR?',
        'How do I connect my Google account?',
        'How does table numbering work?',
        'Adding an auto-reply template',
        'Inviting a team member',
        'Where can I download my invoice?',
      ];

  return (
    <div className="min-h-screen overflow-x-clip bg-white text-[#0A0A0A] pt-[64px]">
      <MarketingNavbar locale={locale} t={t} />

      <section className="px-6 sm:px-10 pt-16 sm:pt-20 pb-10">
        <div className="max-w-[1000px] mx-auto text-center">
          <span className="pulse-eyebrow text-[#737373]">
            {isTr ? 'Yardım merkezi' : 'Help center'}
          </span>
          <h1 className="mt-4 text-[40px] sm:text-[56px] lg:text-[64px] font-medium leading-[0.95] tracking-[-0.035em]">
            {isTr ? 'Nasıl yardımcı olalım?' : 'How can we help?'}
          </h1>
          <div className="mt-8 max-w-[540px] mx-auto">
            <div className="bg-[#FAFAFA] border border-[#EDEDED] rounded-full px-5 py-4 flex items-center gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="11" cy="11" r="7" stroke="#737373" strokeWidth="2" />
                <path d="m20 20-3.5-3.5" stroke="#737373" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-[14px] text-[#737373]">
                {isTr ? 'Ara: "QR", "Google bağla", "plan değişikliği"...' : 'Search: "QR", "connect Google", "plan change"...'}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 sm:px-10 pb-20">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories.map((c) => (
              <div
                key={c.k}
                className="bg-white border border-[#EDEDED] rounded-2xl p-7 flex flex-col gap-3 hover:border-[#C6F24E] transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-[#EAF9B8] flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden>
                    <path
                      d="M4 16 L9 16 L11 10 L15 22 L17 14 L20 18 L28 18"
                      stroke="#0A0A0A"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3 className="text-[20px] font-semibold tracking-[-0.015em]">{c.k}</h3>
                <p className="text-[14px] text-[#525252] leading-[1.55] flex-1">{c.d}</p>
                <span className="pulse-eyebrow text-[#737373]">
                  {c.c} {isTr ? 'makale' : 'articles'}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-16">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'En çok aranan' : 'Most searched'}
            </span>
            <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
              {quickLinks.map((q) => (
                <li
                  key={q}
                  className="flex items-center justify-between gap-3 bg-[#FAFAFA] border border-[#EDEDED] rounded-xl px-5 py-4 text-[14px] font-medium hover:border-[#C6F24E] transition-colors"
                >
                  <span>{q}</span>
                  <span aria-hidden className="text-[#737373]">
                    →
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-[#0A0A0A] text-white px-6 sm:px-10 py-20">
        <div className="max-w-[900px] mx-auto text-center">
          <h2 className="text-[28px] sm:text-[40px] font-medium tracking-[-0.03em] leading-[1.05]">
            {isTr ? 'Aradığınızı bulamadınız mı?' : 'Didn\'t find what you needed?'}
          </h2>
          <p className="mt-4 text-[15px] text-white/70 max-w-[540px] mx-auto">
            {isTr
              ? 'Canlı destek ekibimiz ortalama 2 dakikada yanıt veriyor.'
              : 'Our live support team replies in an average of 2 minutes.'}
          </p>
          <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href={`${base}/contact`}
              className="inline-flex items-center justify-center gap-2 bg-[#C6F24E] text-[#0A0A0A] px-7 py-4 rounded-full text-[15px] font-medium hover:bg-[#A8D62E] transition-colors"
            >
              {isTr ? 'Destek ekibine yaz' : 'Message support'}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
