import Link from 'next/link';
import type { Locale } from '@/lib/translations';
import BuazeLogo from './BuazeLogo';
import NewsletterSignup from './NewsletterSignup';
import { getSiteSettings } from '@/lib/site-settings';

interface MarketingFooterProps {
  locale: Locale;
  t: {
    footer_about: string;
    footer_contact: string;
    footer_terms: string;
    footer_privacy: string;
    footer_google_compliance: string;
    footer_cookie: string;
    footer_kvkk: string;
    footer_copyright: string;
    cta_badge1: string;
    cta_badge2: string;
    siteDescription?: string;
  };
}

const SOCIAL = [
  { label: 'X', href: 'https://x.com/buaze', bg: '#000' },
  { label: 'in', href: 'https://linkedin.com/company/buaze', bg: '#0A66C2' },
  { label: 'IG', href: 'https://instagram.com/buazerating', bg: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' },
  { label: 'YT', href: 'https://youtube.com/@buaze', bg: '#FF0000' },
];

/**
 * Premium footer — matches `.design/site/site-premium.jsx` line 200 (PremiumFooter):
 * ECG divider + newsletter capture + 4-col link grid + live "all systems
 * operational" dot on the bottom rail.
 */
export default async function MarketingFooter({ locale, t }: MarketingFooterProps) {
  const base = `/${locale}`;
  const s = await getSiteSettings();
  const isTr = locale === 'tr';

  const cols: { title: string; items: { label: string; href: string }[] }[] = [
    {
      title: isTr ? 'Ürün' : 'Product',
      items: [
        { label: isTr ? 'QR Stüdyosu' : 'QR Studio', href: `${base}/solutions/qr-generator` },
        { label: isTr ? 'Özellikler' : 'Features', href: `${base}/features` },
        { label: 'AI Co-Pilot', href: `${base}/features/ai-copilot` },
        { label: isTr ? 'Analitik & Raporlar' : 'Analytics & Reports', href: `${base}/features` },
        { label: isTr ? 'Entegrasyonlar' : 'Integrations', href: `${base}/integrations` },
        { label: isTr ? 'Fiyatlandırma' : 'Pricing', href: `${base}/pricing` },
      ],
    },
    {
      title: isTr ? 'Çözümler' : 'Solutions',
      items: [
        { label: isTr ? 'Restoran & Kafe' : 'Restaurant & Cafe', href: `${base}/solutions/restaurants` },
        { label: isTr ? 'Paket Servis' : 'Delivery', href: `${base}/solutions/delivery` },
        { label: isTr ? 'Otel' : 'Hotel', href: `${base}/solutions/hotel` },
        { label: isTr ? 'Klinik' : 'Clinic', href: `${base}/solutions/clinic` },
        { label: isTr ? 'Hukuk Ofisi' : 'Legal', href: `${base}/solutions/legal` },
        { label: isTr ? 'Güzellik & Spa' : 'Beauty & Spa', href: `${base}/solutions/spa` },
      ],
    },
    {
      title: isTr ? 'Şirket' : 'Company',
      items: [
        { label: isTr ? 'Hakkımızda' : 'About', href: `${base}/about` },
        { label: isTr ? 'Kariyer' : 'Careers', href: `${base}/careers` },
        { label: 'Blog', href: `${base}/blog` },
        { label: isTr ? 'Müşteri hikayeleri' : 'Customer stories', href: `${base}/customer-stories` },
        { label: isTr ? 'İletişim' : 'Contact', href: `${base}/contact` },
      ],
    },
    {
      title: isTr ? 'Destek' : 'Support',
      items: [
        { label: isTr ? 'Yardım merkezi' : 'Help center', href: `${base}/help` },
        { label: isTr ? 'SSS' : 'FAQ', href: `${base}/faq` },
        { label: isTr ? 'Gizlilik' : 'Privacy', href: `${base}/privacy` },
        ...(isTr ? [{ label: 'KVKK', href: `${base}/kvkk` }] : []),
        { label: isTr ? 'Şartlar' : 'Terms', href: `${base}/terms` },
        { label: isTr ? 'Google uyumu' : 'Google compliance', href: `${base}/google-compliance` },
      ],
    },
  ];

  return (
    <footer className="bg-[#0A0A0A] text-white">
      {/* ECG divider — animated lime heartbeat line */}
      <div className="relative h-14 overflow-hidden border-t border-[#1F1F1F]">
        <svg
          viewBox="0 0 1440 56"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <path
            d="M0 28 L200 28 L240 8 L280 48 L320 18 L360 38 L500 28 L700 28 L740 8 L780 48 L820 18 L860 38 L1000 28 L1200 28 L1240 8 L1280 48 L1320 18 L1360 38 L1440 28"
            fill="none"
            stroke="#C6F24E"
            strokeWidth="2"
            opacity="0.5"
            style={{ strokeDasharray: 2000, strokeDashoffset: 2000, animation: 'ecgDraw 3s ease-out forwards' }}
          />
        </svg>
      </div>

      {/* Newsletter capture */}
      <div className="border-b border-[#1F1F1F] px-5 py-10 sm:px-10 sm:py-12">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-6 md:grid-cols-2 md:gap-10">
          <div>
            <h3
              className="text-[26px] font-medium leading-tight tracking-tight sm:text-[32px] md:text-[36px]"
              style={{ fontFamily: 'var(--font-space-grotesk)' }}
            >
              {isTr ? 'Haftalık itibar rehberi. ' : 'Weekly reputation playbook. '}
              <span className="text-[#C6F24E]">{isTr ? 'Ücretsiz.' : 'Free.'}</span>
            </h3>
            <p className="mt-2 text-[13px] text-[#A3A3A3]">
              {isTr
                ? 'Google politikaları, QR ipuçları, vaka çalışmaları. Haftada bir, fazla değil.'
                : 'Google policies, QR tips, case studies. Once a week, never more.'}
            </p>
          </div>
          <NewsletterSignup locale={locale} />
        </div>
      </div>

      {/* Link grid */}
      <div className="px-5 py-12 sm:px-10 sm:py-14">
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-8 sm:gap-10 md:grid-cols-[1.6fr_repeat(4,1fr)] md:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href={base} className="inline-flex items-center gap-2 group">
              <BuazeLogo
                size={32}
                variant="on-dark"
                imageUrl={s.logoUrl}
                className="opacity-90 transition-opacity group-hover:opacity-100"
              />
              <span
                className="text-[18px] font-medium tracking-[-0.03em] text-white"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                buaze<span className="text-[#C6F24E]">.</span>
              </span>
            </Link>
            <p className="mt-4 max-w-[280px] text-[13px] leading-[1.7] text-[#A3A3A3]">
              {t.siteDescription ||
                (isTr
                  ? 'İşletmeler için dijital itibar platformu. QR ile topla, tek panelden yönet, gerçek zamanlı izle.'
                  : 'Digital reputation platform for businesses. Collect via QR, manage from one panel, track in real time.')}
            </p>
            <div className="mt-5 flex gap-2">
              {SOCIAL.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[11px] font-semibold text-white transition-transform hover:scale-110"
                  style={{ background: s.bg, fontFamily: 'var(--font-jetbrains-mono)' }}
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="pulse-eyebrow mb-4 text-[#C6F24E]">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.items.map((item) => (
                  <li key={item.href + item.label}>
                    <Link
                      href={item.href}
                      className="text-[13px] text-[#A3A3A3] transition-colors hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom rail */}
      <div className="border-t border-[#1F1F1F] px-5 py-5 sm:px-10">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:gap-4 sm:text-left">
          <p className="pulse-eyebrow text-[#525252]">
            © {new Date().getFullYear()} BUAZE BİLİŞİM A.Ş. · İSTANBUL · {t.footer_copyright}
          </p>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16A34A] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#16A34A]" />
            </span>
            <span className="text-[12px] text-[#737373]">
              {isTr ? 'Tüm sistemler çalışıyor' : 'All systems operational'}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
