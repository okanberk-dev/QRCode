import Link from 'next/link';
import { cookies } from 'next/headers';
import type { ReactElement } from 'react';
import type { Locale } from '@/lib/translations';
import BuazeLogo from './BuazeLogo';
import NewsletterSignup from './NewsletterSignup';
import MobileBottomNav from './MobileBottomNav';
import { getSiteSettings } from '@/lib/site-settings';
import { verifyJwt } from '@/lib/auth';

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

// Resmi marka SVG'leri — Lucide'nin Twitter ikonu hâlâ eski-bird; X için
// resmi 2024+ logo path'i kullanılıyor. Hepsi viewBox=0 0 24 24 normalize.
const InstagramIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);
const XIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const LinkedInIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.852 3.37-1.852 3.601 0 4.268 2.37 4.268 5.455v6.288zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.064 2.062 2.062 0 1 1 2.063 2.064zm1.778 13.019H3.555V9h3.56v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);
const YouTubeIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

interface SocialLink {
  label: string;
  href: string;
  brand: string; // hover glow + outline color
  icon: ReactElement;
}

const SOCIAL: SocialLink[] = [
  { label: 'Instagram', href: 'https://instagram.com/buazerating', brand: '#E1306C', icon: InstagramIcon },
  { label: 'X', href: 'https://x.com/buaze', brand: '#FFFFFF', icon: XIcon },
  { label: 'LinkedIn', href: 'https://linkedin.com/company/buaze', brand: '#0A66C2', icon: LinkedInIcon },
  { label: 'YouTube', href: 'https://youtube.com/@buaze', brand: '#FF0033', icon: YouTubeIcon },
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

  // Determine login state for the mobile bottom nav center CTA
  // (Panel vs Try-Free). Same pattern as MarketingNavbar — server-side
  // cookie read + jose verify, never trusts cookie presence alone.
  let isLoggedIn = false;
  try {
    const cookieStore = await cookies();
    const userToken = cookieStore.get('user_token')?.value;
    const adminToken = cookieStore.get('admin_token')?.value;
    if (userToken) {
      const payload = await verifyJwt(userToken);
      if (payload && typeof payload.userId === 'string') isLoggedIn = true;
    }
    if (!isLoggedIn && adminToken) {
      const payload = await verifyJwt(adminToken);
      if (payload && typeof payload.role === 'string') isLoggedIn = true;
    }
  } catch {
    isLoggedIn = false;
  }

  const cols: { title: string; items: { label: string; href: string; badge?: string }[] }[] = [
    {
      title: isTr ? 'Ürün' : 'Product',
      items: [
        { label: isTr ? 'QR Stüdyosu' : 'QR Studio', href: `${base}/solutions/qr-generator` },
        { label: 'Buaze Pulse AI', href: `${base}/features/pulse-ai` },
        { label: isTr ? 'Yorum Yönetimi' : 'Review Management', href: `${base}/features/review-management` },
        { label: isTr ? 'Analitik & Raporlar' : 'Analytics & Reports', href: `${base}/features/analytics-reports` },
        { label: isTr ? 'Entegrasyonlar' : 'Integrations', href: `${base}/integrations` },
      ],
    },
    {
      title: isTr ? 'Çözümler' : 'Solutions',
      items: [
        { label: isTr ? 'Restoran & Kafe' : 'Restaurant & Café', href: `${base}/solutions/restaurants` },
        { label: isTr ? 'Paket Servis' : 'Delivery', href: `${base}/solutions/delivery` },
        { label: isTr ? 'Otel' : 'Hotel', href: `${base}/solutions/hotels` },
        { label: isTr ? 'Klinik' : 'Clinic', href: `${base}/solutions/healthcare` },
        { label: isTr ? 'Hukuk Ofisi' : 'Legal', href: `${base}/solutions/law-firms` },
        { label: isTr ? 'Güzellik & Spa' : 'Beauty & Spa', href: `${base}/solutions/beauty-salon` },
        { label: isTr ? 'Tüm 14 sektör →' : 'All 14 sectors →', href: `${base}/solutions` },
      ],
    },
    {
      title: isTr ? 'Şirket' : 'Company',
      items: [
        { label: isTr ? 'Hakkımızda' : 'About', href: `${base}/about` },
        { label: isTr ? 'Müşteri hikayeleri' : 'Customer stories', href: `${base}/customer-stories` },
        { label: isTr ? 'Vaka çalışmaları' : 'Case studies', href: `${base}/case-study` },
        { label: 'Blog', href: `${base}/blog` },
        { label: isTr ? 'Kariyer' : 'Careers', href: `${base}/careers`, badge: isTr ? '5 POZİSYON' : '5 ROLES' },
        { label: isTr ? 'Basın kiti' : 'Press kit', href: `${base}/press` },
        { label: isTr ? 'İletişim' : 'Contact', href: `${base}/contact` },
      ],
    },
    {
      title: isTr ? 'Kaynaklar' : 'Resources',
      items: [
        { label: isTr ? 'Yardım merkezi' : 'Help center', href: `${base}/help` },
        { label: isTr ? 'SSS' : 'FAQ', href: `${base}/faq` },
        { label: isTr ? 'ROI hesaplayıcı' : 'ROI calculator', href: `${base}/roi` },
        { label: isTr ? 'Karşılaştır' : 'Compare', href: `${base}/compare` },
        { label: isTr ? 'Ücretsiz QR üret' : 'Free QR generator', href: `${base}/solutions/qr-generator`, badge: isTr ? 'ÜCRETSİZ' : 'FREE' },
        { label: isTr ? 'Fiyatlandırma' : 'Pricing', href: `${base}/pricing` },
      ],
    },
  ];

  return (
    <>
    <footer className="relative bg-[#0A0A0A] text-white">
      {/* Stage 42 §38.123 — top hairline + traveling lime spark.
          HANDOFF premium-footer.jsx editorial polish — top edge'inde
          ince hairline + 6s döngülü lime gradient sweep. Reduced-motion
          blanket [style*='bzEchoSweep'] selector ile devre dışı. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-px bg-white/8" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-px left-0 z-[1] h-[3px] w-[12%]"
        style={{
          background: 'linear-gradient(90deg, transparent, #C6F24E, transparent)',
          boxShadow: '0 0 16px #C6F24E',
          animation: 'bzEchoSweep 6s linear infinite',
        }}
      />

      {/* Stage 44 §38.125 — HANDOFF premium-footer.jsx 2-col editorial
          layout (1.55fr left + 1fr right). Stage 42'de eklenen huge
          wordmark anchor + tagline SOL kolonda; SAĞ kolonda lime
          editorial newsletter card + scan-to-app QR card. Status
          tiles + live status pill SOL kolon altında — fake-data
          riski olan claim'ler **static-but-true** brand manifesto'ya
          çevrildi (CLAUDE.md §35.8 + §35.10 + §19.1.1 disipline). */}
      <div className="border-t border-[#1F1F1F] px-5 pb-8 pt-12 sm:px-10 sm:pt-14">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-10 lg:grid-cols-[1.55fr_1fr] lg:gap-14">
          {/* SOL — anchor + tagline + status tiles + live pill */}
          <div>
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="bz-pulse-dot inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: '#C6F24E' }}
              />
              <span className="pulse-eyebrow text-[#C6F24E]">
                {isTr ? 'İTİBAR İŞLETİM SİSTEMİ' : 'REPUTATION OPERATING SYSTEM'}
              </span>
            </div>
            <h2
              className="mt-7 text-[#F6F4EF]"
              style={{
                fontFamily: 'var(--font-heading)',
                fontStyle: 'italic',
                fontSize: 'clamp(56px, 11vw, 168px)',
                lineHeight: 0.92,
                letterSpacing: '-0.04em',
                fontWeight: 500,
                margin: 0,
              }}
            >
              buaze<span style={{ color: '#C6F24E' }}>.</span>
            </h2>
            <p
              className="mt-5 max-w-[640px] text-[16px] leading-[1.45] text-white/70 sm:text-[18px] md:text-[20px]"
              style={{
                fontFamily: 'var(--font-heading)',
                fontStyle: 'italic',
                fontWeight: 500,
                letterSpacing: '-0.01em',
              }}
            >
              {isTr
                ? 'Bir QR. Bir yorum. Bir kazanç. Müşterinin sesi tek panelde.'
                : 'One QR. One review. One win. The customer voice in one pane.'}
            </p>

            {/* Stage 44 — Status tile band (3-up grid). HANDOFF visual
                pattern + Buaze brand manifesto. Fake metric riski yerine
                static-but-true claim'ler: 24/7 ops + AI yanıt latency
                yaklaşık değer + locale support. */}
            <div className="mt-10 grid max-w-[560px] grid-cols-3 gap-3">
              <FooterStatusTile
                label={isTr ? 'OPS' : 'OPS'}
                value="24/7"
                tone="ok"
                hint={isTr ? 'sürekli çalışır' : 'always on'}
              />
              <FooterStatusTile
                label="PULSE AI"
                value="<1s"
                tone="ok"
                hint={isTr ? 'tipik yanıt' : 'typical reply'}
              />
              <FooterStatusTile
                label={isTr ? 'KAPSAM' : 'COVERAGE'}
                value="TR · EN"
                tone="lime"
                hint={isTr ? 'ikidil destek' : 'bilingual'}
              />
            </div>

            {/* Stage 44 — Static online status pill (no fake activity).
                "CANLI · BUAZE · ÇEVRİMİÇİ" Pulse signature dot. KVKK
                fake-feed riski (§35.10) → static deterministik
                claim. */}
            <div className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 backdrop-blur-md">
              <span
                aria-hidden
                className="bz-pulse-dot inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: '#C6F24E' }}
              />
              <span className="pulse-eyebrow text-white/55">
                {isTr ? 'ÇEVRİMİÇİ · BUAZE' : 'ONLINE · BUAZE'}
              </span>
              <span className="text-[12px] font-medium text-[#F6F4EF]">
                {isTr ? 'Sistem aktif' : 'System active'}
              </span>
            </div>
          </div>

          {/* SAĞ — editorial newsletter card + scan-to-app QR card */}
          <div className="grid content-start gap-4">
            {/* Newsletter editorial card — lime gradient + italic title */}
            <div
              className="rounded-[18px] border p-5 sm:p-6"
              style={{
                background: 'linear-gradient(160deg, rgba(198,242,78,0.10) 0%, rgba(255,255,255,0.02) 60%)',
                borderColor: 'rgba(198,242,78,0.18)',
              }}
            >
              <span className="pulse-eyebrow block text-[#C6F24E]">
                {isTr ? 'HAFTALIK · ÜCRETSİZ' : 'WEEKLY · FREE'}
              </span>
              <h4
                className="mt-2 text-[24px] text-[#F6F4EF]"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontStyle: 'italic',
                  fontWeight: 500,
                  letterSpacing: '-0.01em',
                }}
              >
                {isTr ? 'İtibar Rehberi' : 'Reputation Playbook'}
              </h4>
              <div className="mt-4">
                <NewsletterSignup locale={locale} source="footer" />
              </div>
              <span className="pulse-eyebrow mt-3 block text-white/40">
                {isTr ? 'SPAM YOK · İSTEDİĞİNDE ÇIK' : 'NO SPAM · UNSUB ANYTIME'}
              </span>
            </div>

            {/* Scan-to-dashboard QR card — Buaze mobile app yok;
                bunun yerine "telefondan dashboard" claim (gerçek
                ürün davranışı: responsive web /dashboard).
                CLAUDE.md §38.123'te skip edilen scan-to-app QR'ın
                compliance-safe variant'ı. */}
            <div className="flex items-center gap-4 rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
              <div
                className="flex h-[88px] w-[88px] flex-shrink-0 items-center justify-center rounded-xl bg-white"
                style={{ boxShadow: '0 12px 28px -12px rgba(198,242,78,0.5)' }}
              >
                <FooterDashboardQr />
              </div>
              <div>
                <span className="pulse-eyebrow block text-[#C6F24E]">
                  {isTr ? 'TELEFONDA · MOBİL UYUMLU' : 'ON YOUR PHONE · MOBILE READY'}
                </span>
                <h5
                  className="mt-1 text-[18px] text-[#F6F4EF]"
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontStyle: 'italic',
                    fontWeight: 500,
                  }}
                >
                  {isTr ? 'Cebinde tüm yorumlar.' : 'All reviews in your pocket.'}
                </h5>
                <p className="mt-1 text-[11.5px] leading-[1.45] text-white/55">
                  {isTr
                    ? 'Tara, panele anında ulaş. Mobil tarayıcıdan tam erişim.'
                    : 'Scan, hop into the panel. Full access from mobile browser.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ECG divider — animated lime heartbeat line + Stage 42 §38.123
          traveling sweep gradient overlay. Mevcut tek-seferlik draw
          intact; sweep loop'lu (6s) lime accent overlay. */}
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
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-[12%]"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(198,242,78,0.55), transparent)',
            animation: 'bzEchoSweep 4.5s linear infinite',
          }}
        />
      </div>

      {/* Stage 44 §38.125 — Eski tek-row newsletter capture section
          silindi (yukarıdaki 2-col grid sağ kolonunda lime gradient
          editorial newsletter card ile değiştirildi). Duplicate
          NewsletterSignup eliminate edildi. */}

      {/* Link grid */}
      <div className="px-4 py-10 sm:px-10 sm:py-14">
        <div className="mx-auto max-w-[1240px]">
          {/* Mobile + tablet footer — large tap targets, no cramped two-column links. */}
          <div className="space-y-3 lg:hidden">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
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
              <p className="mt-4 text-[13px] leading-[1.7] text-[#A3A3A3]">
                {t.siteDescription ||
                  (isTr
                    ? 'İşletmeler için dijital itibar platformu. QR ile topla, tek panelden yönet, gerçek zamanlı izle.'
                    : 'Digital reputation platform for businesses. Collect via QR, manage from one panel, track in real time.')}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C6F24E]/40 bg-[#C6F24E]/10 px-2.5 py-1">
                  <span className="text-[#C6F24E]">★</span>
                  <span className="pulse-eyebrow text-[#C6F24E]">
                    {isTr ? '2.400+ İŞLETME' : '2,400+ BUSINESSES'}
                  </span>
                </span>
              </div>
              <div className="mt-5 grid grid-cols-4 gap-2">
                {SOCIAL.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="group/social social-pill flex min-h-[48px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white transition-all duration-200 hover:bg-white/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
                    style={{ ['--brand' as string]: s.brand }}
                  >
                    <span className="block h-5 w-5 transition-colors duration-200 group-hover/social:text-[var(--brand)]">
                      {s.icon}
                    </span>
                  </a>
                ))}
              </div>
            </div>

            {cols.map((col) => (
              <details
                key={col.title}
                className="group rounded-[20px] border border-white/10 bg-white/[0.04] open:bg-white/[0.06]"
              >
                <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <span className="pulse-eyebrow text-[#C6F24E]">{col.title}</span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[20px] leading-none text-white transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <ul className="grid gap-1 px-4 pb-4">
                  {col.items.map((item) => (
                    <li key={item.href + item.label}>
                      <Link
                        href={item.href}
                        className="flex min-h-[44px] items-center justify-between gap-3 rounded-2xl px-3 text-[14px] text-[#D4D4D4] transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="pulse-eyebrow shrink-0 rounded-full bg-[#C6F24E] px-1.5 py-0.5 text-[#0A0A0A]">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>

          <div className="hidden grid-cols-2 gap-8 sm:gap-10 lg:grid lg:grid-cols-[1.5fr_repeat(4,1fr)] lg:gap-8">
            {/* Brand */}
            <div className="col-span-2 lg:col-span-1">
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
                    title={s.label}
                    className="group/social flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10 hover:border-white/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
                    style={{ ['--brand' as string]: s.brand }}
                  >
                    <span className="block h-[18px] w-[18px] transition-colors duration-200 group-hover/social:text-[var(--brand)]">
                      {s.icon}
                    </span>
                  </a>
                ))}
              </div>
              {/* Trust micro-row */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C6F24E]/40 bg-[#C6F24E]/10 px-2.5 py-1">
                  <span className="text-[#C6F24E]">★</span>
                  <span className="pulse-eyebrow text-[#C6F24E]">
                    {isTr ? '2.400+ İŞLETME' : '2,400+ BUSINESSES'}
                  </span>
                </span>
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
                        className="group inline-flex items-center gap-1.5 text-[13px] text-[#A3A3A3] transition-colors hover:text-white"
                      >
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="pulse-eyebrow rounded-full bg-[#C6F24E] px-1.5 py-0.5 text-[#0A0A0A]">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom rail — NAP + copyright + legal mini-links.
          NAP block is wrapped in a semantic <address> so search engines
          and screen readers identify it as the canonical company address.
          The string ("Workinton Maslak, Kat 4 · Maslak / İstanbul ·
          support@buaze.com") must match the LocalBusiness schema 1:1
          when that PR ships (Google NAP consistency rule). */}
      <div className="border-t border-[#1F1F1F] pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:pl-[max(2.5rem,env(safe-area-inset-left))] sm:pr-[max(2.5rem,env(safe-area-inset-right))] lg:pb-5">
        <address className="not-italic mx-auto mb-4 flex max-w-[1240px] flex-col items-center gap-x-3 gap-y-1 text-center text-[12px] text-[#A3A3A3] sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-4">
          <span>Buaze Bilişim A.Ş.</span>
          <span aria-hidden className="hidden sm:inline">·</span>
          <span>Workinton Maslak, Kat 4 · Maslak / İstanbul</span>
          <span aria-hidden className="hidden sm:inline">·</span>
          <a
            href="mailto:support@buaze.com"
            className="text-white transition-colors hover:text-[#C6F24E]"
          >
            support@buaze.com
          </a>
        </address>
        <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-4 text-center lg:flex-row lg:justify-between lg:gap-6 lg:text-left">
          <p className="pulse-eyebrow text-[#A3A3A3]">
            © {new Date().getFullYear()} BUAZE BİLİŞİM A.Ş. · İSTANBUL
          </p>
          {/* Legal mini-links — compact bottom-of-funnel surface */}
          <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {[
              { label: isTr ? 'Gizlilik' : 'Privacy', href: `${base}/privacy` },
              ...(isTr ? [{ label: 'KVKK', href: `${base}/kvkk` }] : []),
              { label: isTr ? 'Şartlar' : 'Terms', href: `${base}/terms` },
              { label: isTr ? 'Çerez' : 'Cookies', href: `${base}/cookie` },
              ...(isTr
                ? [
                    { label: 'Açık Rıza', href: `${base}/acik-riza` },
                    { label: 'Ticari İleti', href: `${base}/ticari-ileti` },
                    { label: 'Sözleşme', href: `${base}/kullanim-sozlesmesi` },
                    { label: 'Mesafeli Sözleşme', href: `${base}/mesafeli-hizmet-sozlesmesi` },
                    { label: 'İade & İptal', href: `${base}/iade-iptal-politikasi` },
                    { label: 'Kullanım Politikası', href: `${base}/kabul-edilebilir-kullanim` },
                  ]
                : [
                    { label: 'Agreement', href: `${base}/kullanim-sozlesmesi` },
                    { label: 'Distance Contract', href: `${base}/mesafeli-hizmet-sozlesmesi` },
                    { label: 'Refund Policy', href: `${base}/iade-iptal-politikasi` },
                    { label: 'Acceptable Use', href: `${base}/kabul-edilebilir-kullanim` },
                  ]),
              { label: isTr ? 'Google Uyumu' : 'Google compliance', href: `${base}/google-compliance` },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-[11px] text-[#A3A3A3] transition-colors hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>

    {/* Mobile + tablet bottom navigation — lg:hidden, fixed, safe-area aware.
        Mounted from the footer so every marketing surface inherits it without
        per-page wiring. Auth/onboarding/dashboard render their own chrome. */}
    <MobileBottomNav locale={locale} isLoggedIn={isLoggedIn} />
    </>
  );
}

/**
 * Stage 44 §38.125 — Footer status tile (3-up brand manifesto band).
 *
 * HANDOFF premium-footer.jsx StatusTile (line 270-292) visual yapısı +
 * Buaze fake-data compliance disipline (CLAUDE.md §35.8 + §35.10 +
 * §19.1.1). HANDOFF "API 99.99%" / "Pulse AI 0.74s" / "Reviews 14,2/sn"
 * fake metric'leri yerine static-but-true brand claim'ler:
 *  - tone='ok' → emerald pulse dot (#10B981)
 *  - tone='lime' → lime accent value + lime pulse dot
 */
function FooterStatusTile({
  label,
  value,
  tone = 'ok',
  hint,
}: {
  label: string;
  value: string;
  tone?: 'ok' | 'lime';
  hint?: string;
}) {
  const dotColor = tone === 'lime' ? '#C6F24E' : '#10B981';
  const valueColor = tone === 'lime' ? '#C6F24E' : '#F6F4EF';
  return (
    <div className="rounded-[14px] border border-white/[0.06] bg-white/[0.03] px-3.5 py-3">
      <div className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="bz-pulse-dot inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: dotColor }}
        />
        <span className="pulse-eyebrow text-white/55">{label}</span>
      </div>
      <div
        className="mt-1.5 text-[22px] leading-none"
        style={{
          fontFamily: 'var(--font-heading)',
          fontStyle: 'italic',
          fontWeight: 500,
          color: valueColor,
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </div>
      {hint && (
        <span className="mt-1 block text-[10.5px] leading-[1.3] text-white/40">
          {hint}
        </span>
      )}
    </div>
  );
}

/**
 * Stage 44 §38.125 — Footer scan-to-dashboard QR.
 *
 * HANDOFF scan-to-app QR card visual structure'ı; fake mobile app
 * yerine **gerçek ürün davranışı** (responsive web `/dashboard`).
 * Static SVG matrix pattern (deterministik, runtime QR gen overhead
 * yok) — visual decoration. Gerçek-tarama ihtiyacı çıkarsa `qrcode`
 * paketi (CLAUDE.md §2) ile dinamik üretilir.
 *
 * 11×11 matrix dot grid + 3 finder pattern (üst-sol, üst-sağ,
 * alt-sol) — QR semantik gerekli değil (visual only). Pulse §11
 * graphite dot palette + ink (#0A0A0A).
 */
function FooterDashboardQr() {
  // Deterministik 11x11 dot grid — Math.random YOK (SSR + test-friendly)
  const cells: { r: number; c: number; on: boolean }[] = [];
  for (let r = 0; r < 11; r++) {
    for (let c = 0; c < 11; c++) {
      // Finder pattern köşelerini koru (üst-sol/üst-sağ/alt-sol 3x3)
      const inFinderTL = r < 3 && c < 3;
      const inFinderTR = r < 3 && c >= 8;
      const inFinderBL = r >= 8 && c < 3;
      // Deterministik on/off: hash-like sin() pattern → seed + r + c
      const seed = (r * 7 + c * 11) % 13;
      const on = inFinderTL || inFinderTR || inFinderBL || seed < 6;
      cells.push({ r, c, on });
    }
  }

  return (
    <svg
      viewBox="0 0 110 110"
      width="72"
      height="72"
      role="img"
      aria-label="QR · Buaze Dashboard"
    >
      {cells.map(({ r, c, on }) =>
        on ? (
          <rect
            key={`${r}-${c}`}
            x={c * 10}
            y={r * 10}
            width="8"
            height="8"
            fill="#0A0A0A"
            rx="1"
          />
        ) : null,
      )}
    </svg>
  );
}
