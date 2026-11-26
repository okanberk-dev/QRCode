import Link from 'next/link';
import type { ReactElement } from 'react';
import type { Locale } from '@/lib/translations';
import { getCompanyFacts } from '@/lib/company-facts';
import { SOCIAL_PROFILES } from '@/lib/site';
import { RELATED_SOLUTIONS_LIST } from '@/lib/related-solutions';
import BuazeLogo from './BuazeLogo';
import NewsletterSignup from './NewsletterSignup';
import { RtIcon } from './ritim/icons';
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


/**
 * Site footer — "Ritim" design (CLAUDE.md §62): brand-gradient background
 * with a dot pattern, a white 48 px-radius card holding the site map, the
 * "how can we help" row, language / social / newsletter, footnotes and the
 * legal rail; under the card an "ask an AI assistant" row and a large white
 * wordmark. Company facts come from getCompanyFacts (same source as the
 * Organization JSON-LD). Server component, no request-time APIs (§35.12.3).
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
        { label: isTr ? 'Sadakat kartı' : 'Loyalty card', href: `${base}/features/loyalty` },
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
  const aiPrompt = encodeURIComponent(
    isTr
      ? 'Buaze (buaze.com) QR kodla müşteri geri bildirimi ve Google yorum yönetimi yazılımını işletmem için tarafsız şekilde değerlendir: artıları, eksileri ve alternatifleri.'
      : 'Give me an unbiased review of Buaze (buaze.com), the QR code customer feedback and Google review management software: pros, cons and alternatives.',
  );
  const aiLinks = [
    { label: 'ChatGPT', href: `https://chatgpt.com/?q=${aiPrompt}`, icon: RtIcon.chat },
    { label: 'Claude', href: `https://claude.ai/new?q=${aiPrompt}`, icon: RtIcon.sparkle },
    { label: 'Perplexity', href: `https://www.perplexity.ai/search?q=${aiPrompt}`, icon: RtIcon.search },
    { label: 'Google AI', href: `https://www.google.com/search?udm=50&q=${aiPrompt}`, icon: RtIcon.orbit },
  ];

  return (
    <footer id="site-footer" className="rt-site-footer">
      <div className="rt-footer-card">
        <nav aria-labelledby="footer-sitemap-title" className="rt-footer-top">
          <h2 id="footer-sitemap-title" className="sr-only">
            {isTr ? 'Site haritası' : 'Site map'}
          </h2>
          <div className="rt-footer-brand">
            <Link href={base} aria-label={isTr ? 'Buaze ana sayfa' : 'Buaze home'} className="rt-footer-mark">
              <BuazeLogo size={64} />
            </Link>
            <p>
              {isTr
                ? 'QR kodla müşteri geri bildirimi toplayın, yorum bağlantılarınızı tek yerden yönetin.'
                : 'Collect customer feedback with QR codes and manage your review links in one place.'}
            </p>
          </div>
          {columns.map((column) => (
            <div key={column.id} className="rt-footer-col">
              <h3>{column.title}</h3>
              {column.links.map((link) => (
                <Link key={link.href} href={link.href} prefetch={false}>
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="rt-footer-help">
          <h3>
            {isTr ? 'Nasıl yardımcı olabiliriz?' : 'How can we help?'}
            <br />
            {isTr ? 'Bize ulaşın.' : 'Get in touch.'}
          </h3>
          <div className="rt-btn-group">
            <a className="rt-btn rt-btn--outline rt-btn--sm" href={`mailto:${company.supportEmail}`}>
              {isTr ? 'Destek' : 'Support'}: {company.supportEmail}
            </a>
            <Link className="rt-btn rt-btn--outline rt-btn--sm" href={`${base}/contact`} prefetch={false}>
              {isTr ? 'İletişim formu' : 'Contact form'}
            </Link>
          </div>
        </div>

        <div className="rt-footer-meta">
          <LanguageLink locale={locale} icon={RtIcon.globe} className="rt-region" />
          <ul className="rt-socials" aria-label={isTr ? 'Sosyal medya hesapları' : 'Social media'}>
            {SOCIAL_PROFILES.map((profile) => (
              <li key={profile.id}>
                <a href={profile.url} target="_blank" rel="noopener noreferrer" aria-label={`${SOCIAL_NAMES[profile.id][isTr ? 'tr' : 'en']} ${newTab}`}>
                  {SOCIAL_ICONS[profile.id]}
                </a>
              </li>
            ))}
          </ul>
          <section aria-labelledby="footer-newsletter-title" className="rt-footer-news">
            <h2 id="footer-newsletter-title" className="rt-t-h5">
              {isTr ? 'Pulse bülteni' : 'The Pulse newsletter'}
            </h2>
            <p className="rt-t-sm rt-t-muted">
              {isTr ? 'Ayda bir e-posta: yorum yönetimi üzerine yeni yazılarımız.' : 'One e-mail a month: our latest articles on review management.'}
            </p>
            <NewsletterSignup locale={locale} source="footer" />
          </section>
        </div>

        <div className="rt-footnotes">
          <address className="rt-footer-address">
            {companyName} · {address}
            {company.registry ? (
              <>
                {' '}· MERSİS {company.registry.mersisNo} · {company.registry.taxOffice} {company.registry.taxNo}
              </>
            ) : null}
          </address>
          <p>
            {isTr
              ? 'Google ve diğer platform adları ve logoları sahiplerinin ticari markalarıdır. Buaze bu şirketlerle bağlantılı değildir ve onlar tarafından onaylanmamıştır.'
              : 'Google and other platform names and logos are trademarks of their owners. Buaze is not affiliated with or endorsed by these companies.'}
          </p>
          <p>
            {isTr
              ? '14 gün ücretsiz deneme yeni hesaplar içindir. Fiyatlara KDV dahil değildir.'
              : 'The 14-day free trial is for new accounts. Prices exclude VAT.'}
          </p>
        </div>

        <div className="rt-footer-legal">
          <span>
            © {year} {companyName}
          </span>
          <nav aria-label={isTr ? 'Yasal bilgiler' : 'Legal'}>
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} prefetch={false}>
                {link.label}
              </Link>
            ))}
            <CookiePreferencesButton label={isTr ? 'Çerez tercihleri' : 'Cookie preferences'} className="hover:text-[var(--rt-brand-700)]" />
          </nav>
        </div>
      </div>

      <div className="rt-footer-ai">
        <h2>{isTr ? 'Doğru seçim miyiz? Sorun bakalım.' : 'Are we the right fit? Ask around.'}</h2>
        <p>{isTr ? 'Bir yapay zekâ asistanından Buaze hakkında tarafsız bir görüş alın.' : 'Get an unbiased take on Buaze from an AI assistant.'}</p>
        <div className="rt-footer-ai__icons">
          {aiLinks.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer nofollow" aria-label={`${isTr ? `${l.label}'a sor` : `Ask ${l.label}`} ${newTab}`}>
              {l.icon}
            </a>
          ))}
        </div>
        <p className="rt-footer-wordmark rt-footer-wordmark-text" aria-hidden="true">
          buaze<i>.</i>
        </p>
      </div>
      <div className="rt-footer-bottom-space" />
    </footer>
  );
}
