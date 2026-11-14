import Link from 'next/link';
import type { ReactElement } from 'react';
import { Globe } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { getCompanyFacts } from '@/lib/company-facts';
import { SOCIAL_PROFILES } from '@/lib/site';
import { RELATED_SOLUTIONS_LIST } from '@/lib/related-solutions';
import FooterPulseHorizon from './three/FooterPulseHorizon';
import BuazeLogo from './BuazeLogo';
import NewsletterSignup from './NewsletterSignup';
import MobileBottomNav from './MobileBottomNav';
import CookiePreferencesButton from './footer/CookiePreferencesButton';
import LanguageLink from './footer/LanguageLink';

interface MarketingFooterProps {
  locale: Locale;
  /** Unused. Optional so the existing callers that pass `t` still compile. */
  t?: unknown;
}

interface FooterLink {
  label: string;
  href: string;
}

type SocialId = (typeof SOCIAL_PROFILES)[number]['id'];

const SOCIAL_ICONS: Record<SocialId, ReactElement> = {
  instagram: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.852 3.37-1.852 3.601 0 4.268 2.37 4.268 5.455v6.288zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.064 2.062 2.062 0 1 1 2.063 2.064zm1.778 13.019H3.555V9h3.56v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
};

const SOCIAL_NAMES: Record<SocialId, { tr: string; en: string }> = {
  instagram: { tr: 'Buaze Instagram hesabı', en: 'Buaze on Instagram' },
  x: { tr: 'Buaze X hesabı', en: 'Buaze on X' },
  linkedin: { tr: 'Buaze LinkedIn sayfası', en: 'Buaze on LinkedIn' },
  youtube: { tr: 'Buaze YouTube kanalı', en: 'Buaze on YouTube' },
};

/** Sectors linked from the footer; "Tüm sektörler" covers the rest. */
const FOOTER_SECTORS = ['restaurants', 'delivery', 'hotels', 'healthcare', 'beauty-salon', 'retail'];

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]';

/**
 * Site footer — one composition on graphite (#0A0A0A):
 *  1. Pulse horizon band (decorative three.js field, SVG fallback in the
 *     HTML) with the logo lockup in its dark top area.
 *  2. Brand + newsletter row: what Buaze does, two verifiable facts, social
 *     profiles; the monthly Pulse newsletter with an opt-in consent box.
 *  3. Site map: four columns in one <nav> (h3 titles under a hidden h2),
 *     two columns on phones.
 *  4. Bottom rail: company facts in <address> (getCompanyFacts — same source
 *     as the Organization JSON-LD), legal links, cookie preferences, a
 *     crawlable language link and the copyright line.
 *
 * Server component with no request-time APIs, so every marketing page stays
 * statically generated. Interactive parts are small client leaves. Also
 * mounts MobileBottomNav; the bottom padding below `lg` is the clearance for
 * that floating bar (it adds no spacer of its own).
 */
export default async function MarketingFooter({ locale }: MarketingFooterProps) {
  const isTr = locale === 'tr';
  const base = `/${locale}`;
  const company = await getCompanyFacts();
  const companyName = company.legalName ?? company.brandName;
  const address = isTr ? company.addressDisplay.tr : company.addressDisplay.en;
  const year = new Date().getFullYear();

  const sectorLinks: FooterLink[] = FOOTER_SECTORS.flatMap((slug) => {
    const entry = RELATED_SOLUTIONS_LIST.find((s) => s.slug === slug);
    return entry ? [{ label: isTr ? entry.tr : entry.en, href: `${base}/solutions/${slug}` }] : [];
  });

  const columns: { id: string; title: string; links: FooterLink[] }[] = [
    {
      id: 'product',
      title: isTr ? 'Ürün' : 'Product',
      links: [
        { label: isTr ? 'Tüm özellikler' : 'All features', href: `${base}/features` },
        { label: isTr ? 'Yorum yönetimi' : 'Review management', href: `${base}/features/review-management` },
        { label: 'Pulse AI', href: `${base}/features/pulse-ai` },
        { label: isTr ? 'QR Menü' : 'QR Menu', href: `${base}/features/menu` },
        { label: isTr ? 'Anketler' : 'Surveys', href: `${base}/features/surveys` },
        { label: isTr ? 'Denetim Merkezi' : 'Audit Center', href: `${base}/features/audit-center` },
        { label: isTr ? 'Analitik ve raporlar' : 'Analytics and reports', href: `${base}/features/analytics-reports` },
        { label: isTr ? 'Platform bağlantıları' : 'Platform links', href: `${base}/integrations` },
        { label: isTr ? 'Fiyatlandırma' : 'Pricing', href: `${base}/pricing` },
      ],
    },
    {
      id: 'solutions',
      title: isTr ? 'Çözümler' : 'Solutions',
      links: [...sectorLinks, { label: isTr ? 'Tüm sektörler' : 'All sectors', href: `${base}/solutions` }],
    },
    {
      id: 'resources',
      title: isTr ? 'Kaynaklar' : 'Resources',
      links: [
        { label: isTr ? 'Ücretsiz QR kod oluşturucu' : 'Free QR code generator', href: `${base}/solutions/qr-generator` },
        { label: isTr ? 'ROI hesaplayıcı' : 'ROI calculator', href: `${base}/roi` },
        { label: isTr ? 'Karşılaştırma' : 'Comparisons', href: `${base}/compare` },
        { label: isTr ? 'Nasıl çalışır' : 'How it works', href: `${base}/how-it-works` },
        { label: 'Blog', href: `${base}/blog` },
        { label: isTr ? 'Yardım merkezi' : 'Help center', href: `${base}/help` },
        { label: isTr ? 'SSS' : 'FAQ', href: `${base}/faq` },
      ],
    },
    {
      id: 'company',
      title: isTr ? 'Şirket ve güven' : 'Company and trust',
      links: [
        { label: isTr ? 'Hakkımızda' : 'About us', href: `${base}/about` },
        { label: isTr ? 'Google yorum kuralları' : 'Google review guidelines', href: `${base}/google-compliance` },
        { label: isTr ? 'Basın kiti' : 'Press kit', href: `${base}/press` },
        { label: isTr ? 'Kariyer' : 'Careers', href: `${base}/careers` },
        { label: isTr ? 'İletişim' : 'Contact', href: `${base}/contact` },
      ],
    },
  ];

  const legalLinks: FooterLink[] = isTr
    ? [
        { label: 'KVKK aydınlatma metni', href: '/tr/kvkk' },
        { label: 'Açık rıza metni', href: '/tr/acik-riza' },
        { label: 'Gizlilik politikası', href: '/tr/gizlilik' },
        { label: 'Çerez politikası', href: '/tr/cookie' },
        { label: 'Kullanım şartları', href: '/tr/terms' },
        { label: 'Mesafeli hizmet sözleşmesi', href: '/tr/mesafeli-hizmet-sozlesmesi' },
        { label: 'İade ve iptal politikası', href: '/tr/iade-iptal-politikasi' },
      ]
    : [
        { label: 'Privacy policy', href: '/en/privacy' },
        { label: 'KVKK notice', href: '/en/kvkk' },
        { label: 'Cookie policy', href: '/en/cookie' },
        { label: 'Terms of service', href: '/en/terms' },
        { label: 'Refund policy', href: '/en/iade-iptal-politikasi' },
      ];

  const newTab = isTr ? '(yeni sekmede açılır)' : '(opens in a new tab)';

  return (
    <>
      <footer id="site-footer" className="relative bg-[#0A0A0A] text-white">
        <FooterPulseHorizon locale={locale} className="h-[180px] sm:h-[220px] lg:h-[260px]">
          {/* Logo lockup in the dark sky above the field (top third is
              scrimmed and holds no points), so it stays fully legible. The
              top padding keeps it clear of the SVG fallback's heartbeat
              peaks at every width (they rise to ~60px on phones and
              ~70px on desktop). */}
          <div className="mx-auto w-full max-w-[1200px] px-5 pt-4 sm:px-10 sm:pt-6 lg:pt-8">
            <Link
              href={base}
              aria-label={isTr ? 'Buaze ana sayfa' : 'Buaze home'}
              className={`inline-flex items-center gap-3 rounded-xl ${FOCUS_RING}`}
            >
              <span aria-hidden="true" className="inline-flex">
                <BuazeLogo size={36} variant="on-dark" />
              </span>
              <span className="bz-h-tight text-[30px] leading-none tracking-[-0.04em] text-white sm:text-[34px]">
                buaze<span className="text-[#C6F24E]">.</span>
              </span>
            </Link>
          </div>
        </FooterPulseHorizon>

        <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-10">
          {/* 2 — Brand + newsletter */}
          <div className="grid gap-10 pb-14 pt-2 sm:pb-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16">
            <div>
              <p className="bz-h-tight max-w-[560px] text-[22px] leading-[1.3] text-white sm:text-[26px]">
                {isTr
                  ? 'QR kodla müşteri geri bildirimi toplayın, yorum bağlantılarınızı tek yerden yönetin'
                  : 'Collect customer feedback with QR codes and manage your review links in one place'}
              </p>
              <p className="mt-4 max-w-[520px] text-[15px] leading-[1.65] text-white/70">
                {isTr
                  ? 'Her müşteri herkese açık yorum bağlantısını görür; belirlediğiniz eşiğin altındaki puanlarda önce size yazabilir.'
                  : 'Every customer sees the public review link; below the threshold you set, they can write to you first.'}
              </p>
              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
                {[isTr ? '10 yorum platformu' : '10 review platforms', isTr ? '14 gün ücretsiz deneme' : '14-day free trial'].map(
                  (fact) => (
                    <li key={fact} className="inline-flex items-center gap-2 text-[14px] font-medium text-white">
                      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#C6F24E]" />
                      {fact}
                    </li>
                  ),
                )}
              </ul>
              <ul className="mt-8 flex flex-wrap gap-2" aria-label={isTr ? 'Sosyal medya hesapları' : 'Social media'}>
                {SOCIAL_PROFILES.map((profile) => (
                  <li key={profile.id}>
                    <a
                      href={profile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${SOCIAL_NAMES[profile.id][isTr ? 'tr' : 'en']} ${newTab}`}
                      className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white/80 transition-colors hover:border-white/40 hover:text-white ${FOCUS_RING}`}
                    >
                      <span className="block h-[18px] w-[18px]">{SOCIAL_ICONS[profile.id]}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <section
              aria-labelledby="footer-newsletter-title"
              className="rounded-[20px] border border-white/10 bg-white/[0.03] p-6 sm:p-8"
            >
              <p className="pulse-eyebrow text-[#C6F24E]">{isTr ? 'Ayda bir e-posta' : 'One e-mail a month'}</p>
              <h2
                id="footer-newsletter-title"
                className="mt-3 text-[24px] font-medium leading-[1.2] tracking-[-0.02em] text-white"
              >
                {isTr ? 'Pulse bülteni' : 'The Pulse newsletter'}
              </h2>
              <p className="mt-2 max-w-[440px] text-[15px] leading-[1.6] text-white/70">
                {isTr
                  ? 'Yorum yönetimi üzerine yeni yazılarımızdan bir seçki.'
                  : 'A selection of our latest articles on review management.'}
              </p>
              <div className="mt-6">
                <NewsletterSignup locale={locale} source="footer" />
              </div>
            </section>
          </div>

          {/* 3 — Site map */}
          <nav aria-labelledby="footer-sitemap-title" className="border-t border-white/10 py-12 sm:py-14">
            <h2 id="footer-sitemap-title" className="sr-only">
              {isTr ? 'Site haritası' : 'Site map'}
            </h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:gap-x-10 md:grid-cols-4 md:gap-x-8 lg:gap-x-10">
              {columns.map((column) => (
                <div key={column.id} className="min-w-0">
                  <h3 className="pulse-eyebrow mb-3 text-[#C6F24E] lg:mb-4">{column.title}</h3>
                  <ul>
                    {column.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          prefetch={false}
                          className={`-mx-1.5 inline-flex min-h-[44px] items-center rounded px-1.5 py-1 text-[15px] leading-[1.35] text-white/75 transition-colors hover:text-white md:text-[14px] lg:min-h-[34px] ${FOCUS_RING}`}
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </nav>

          {/* 4 — Bottom rail. Below `lg` the padding clears the floating
              MobileBottomNav; on desktop it keeps the last row clear of the
              contact button in the bottom-right corner. */}
          <div className="border-t border-white/10 pb-[calc(104px+env(safe-area-inset-bottom,0px))] pt-8 lg:pb-24">
            <address className="text-[14px] not-italic leading-[1.65] text-white/70">
              <span className="block font-medium text-white sm:inline">{companyName}</span>
              <span aria-hidden="true" className="mx-2.5 hidden text-white/35 sm:inline">
                ·
              </span>
              <span className="block sm:inline">{address}</span>
              <span aria-hidden="true" className="mx-2.5 hidden text-white/35 sm:inline">
                ·
              </span>
              <a
                href={`mailto:${company.supportEmail}`}
                className={`-mx-1 inline-flex min-h-[32px] items-center rounded px-1 text-white underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-[#C6F24E] ${FOCUS_RING}`}
              >
                {company.supportEmail}
              </a>
            </address>

            <nav aria-label={isTr ? 'Yasal bilgiler' : 'Legal'} className="mt-5">
              <ul className="flex flex-wrap gap-x-5 gap-y-1">
                {legalLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      prefetch={false}
                      className={`-mx-1.5 inline-flex min-h-[32px] items-center rounded px-1.5 text-[13px] text-white/70 transition-colors hover:text-white ${FOCUS_RING}`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <CookiePreferencesButton
                    label={isTr ? 'Çerez tercihleri' : 'Cookie preferences'}
                    className={`-mx-1.5 inline-flex min-h-[32px] items-center rounded px-1.5 text-[13px] text-white/70 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white ${FOCUS_RING}`}
                  />
                </li>
              </ul>
            </nav>

            <div className="mt-6 flex flex-col items-start gap-3 lg:flex-row-reverse lg:items-center lg:justify-between">
              <LanguageLink
                locale={locale}
                icon={<Globe size={15} aria-hidden="true" />}
                className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border border-white/15 px-4 text-[13px] font-medium text-white/85 transition-colors hover:border-white/40 hover:text-white ${FOCUS_RING}`}
              />
              <p className="text-[13px] text-white/70">
                © {year} {companyName}
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating bottom navigation for phones/tablets (lg:hidden), mounted
          here so every page with the footer gets it. */}
      <MobileBottomNav locale={locale} />
    </>
  );
}
