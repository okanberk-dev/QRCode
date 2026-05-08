import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import NewsletterSignup from '@/components/marketing/NewsletterSignup';
import BlogReadingProgress from '@/components/marketing/BlogReadingProgress';
import BlogCopyLinkButton from '@/components/marketing/BlogCopyLinkButton';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';

// Stage 83 §38.163 — ISR inherits `revalidate = 3600` (1h) from
// `[locale]/layout.tsx`. CLAUDE.md §38.163 — marketing pages now ship
// from the Vercel CDN edge for anonymous visitors.

const TITLE_TR = 'Google yorum politikaları 2026: yeni kurallar ve 7 ipucu';
const TITLE_EN = 'Google review policies 2026: the new rules and 7 tips';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === 'tr';
  const title = isTr ? TITLE_TR : TITLE_EN;
  const description = isTr
    ? "Google 2026'da sahte yorum savaşını yoğunlaştırdı. İki algoritma güncellemesi işletmelerin puanını değiştirdi — ama organik akışı doğru kuran işletmeler için bu bir fırsat."
    : 'Google has intensified the fight against fake reviews in 2026. Two algorithm updates shifted business ratings — but for teams with an organic flow in place, this is an opportunity.';
  return {
    title: `${title} — Buaze Blog`,
    description,
    alternates: {
      canonical: `https://buaze.com/${locale}/blog/google-2026`,
      languages: {
        tr: 'https://buaze.com/tr/blog/google-2026',
        en: 'https://buaze.com/en/blog/google-2026',
      },
    },
    openGraph: {
      type: 'article',
      url: `https://buaze.com/${locale}/blog/google-2026`,
      title,
      description,
    },
  };
}

// Brand SVGs — lucide-react dropped Twitter/Linkedin/Whatsapp icons; inline
// glyph paths keep the share row dependency-free and recolour via currentColor.
const SHARE_ICONS = {
  twitter: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.11 2.06 2.06 0 0 1 0 4.11zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  ),
  whatsapp: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.966-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  ),
};

type Callout = { kind: 'fact' | 'warn'; label: string; text: string };
type Stat = { k: string; l: string };
type Section = {
  id: string;
  eyebrow: string;
  h: string;
  lead: string;
  p: string;
  callout?: Callout;
  list?: string[];
  stat?: Stat;
};

/**
 * 1:1 with the Pulse blog content redesign (claude/review-blog-design-ZQKW3).
 * Lime hero + 3-col body (TOC + reading progress + share / article with
 * dropcap + section variants + pull quote + takeaways + CTA + tags / author
 * + related + newsletter sidebar). Static route is matched ahead of the
 * dynamic /blog/[slug] route — keep this in sync with [slug]/page.tsx chrome.
 */
export default async function GoogleTwentyTwentySixPost({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';
  const base = `/${locale}`;

  const title = isTr ? TITLE_TR : TITLE_EN;
  const author = 'Emre Kaya';
  const role = isTr ? 'Buaze · Kurucu' : 'Buaze · Founder';
  const date = isTr ? '14 Nisan 2026' : 'April 14, 2026';
  const readTime = isTr ? '8 dk' : '8 min';

  const lead = isTr
    ? "Google 2026'da sahte yorum savaşını yoğunlaştırdı. İki sessiz güncelleme işletmelerin puanını derinden etkiledi — ama akışını doğru kuranlar için bu bir fırsat. Aşağıda son 90 günün verisinden çıkardığımız 4 net kural."
    : 'Google has sharpened its stance on fake reviews in 2026. Two quiet algorithm updates shifted business ratings — but for teams with the right setup, it opens a door. Four clear rules we extracted from the last 90 days of data.';

  const sections: Section[] = isTr
    ? [
        {
          id: 'neler-degisti',
          eyebrow: '01 · Bağlam',
          h: 'Neler değişti?',
          lead: "Google, 2026'nın ilk çeyreğinde sahte yorum filtresinin iki kademe sıkılaştırdığını duyurdu.",
          p: 'Algoritma artık "aynı cihazdan gelen birden fazla yorum" ve "coğrafi eşleşme olmayan yorumlar" için ek filtreleme uyguluyor. Sahte yorum satın alan işletmeler için bu yıkıcı; organik yorum toplayanlar için ise rakiplerinden önde başlamak anlamına geliyor.',
          callout: {
            kind: 'fact',
            label: 'Tek cümlede',
            text: 'Sahte yorumun maliyeti arttı, gerçek yorumun değeri katlandı.',
          },
        },
        {
          id: 'qr-akis',
          eyebrow: '02 · Taktik',
          h: 'QR tabanlı bir akış kurun.',
          lead: "Gerçek müşteriden gelen yorum, Google'ın sensörlerine \"doğal\" görünür.",
          p: 'QR ile yorum topladığınızda IP, cihaz ve konum eşleşmesi organiktir; algoritmik kuşku skoru düşüktür. Buaze bu eşleşmeyi platform genelinde izler ve risk eşiğini aşan yorumları işletmeye işaretle bildirir.',
          list: [
            'Her masaya, her personele özel kod',
            'Tara → puan → 20 saniyede yorum',
            "Memnun: Google'a; memnun değil: ekibe",
          ],
        },
        {
          id: 'zamanlama',
          eyebrow: '03 · Zamanlama',
          h: 'Davet zamanlaması her şeyi belirler.',
          lead: 'Ödeme anında veya hizmet bitiminden 1–4 saat sonra gönderilen davet en yüksek dönüşümü sağlıyor.',
          p: '24 saati geçince oran yarıya iniyor. 72 saatten sonra organik yanıtın değil, "rica edilmiş yanıtın" sınıfına giriyor; Google bunu farklı ağırlıklandırıyor.',
          stat: {
            k: '4×',
            l: 'İlk 4 saat içinde gelen yorum, 24 saati geçen yoruma kıyasla 4 kat daha fazla görüntüleniyor.',
          },
        },
        {
          id: 'tesvik',
          eyebrow: '04 · Risk',
          h: 'Teşvik yasağı sınırını öğrenin.',
          lead: '"Google\'da yorum bırakana indirim" → politika ihlali.',
          p: 'Google, yorum karşılığı sunulan herhangi bir maddi teşviki ihlal sayar. Yorum silinebilir, hesap işaretlenebilir, ileri vakalarda işletme listesi askıya alınır. Teşvik politikalarınızı asla platform yorum linki ile bağlamayın.',
          callout: {
            kind: 'warn',
            label: 'Dikkat',
            text: "Yorum karşılığı kahve, indirim, çekiliş — hepsi ihlaldir. Buaze'nin kural motoru kampanya kurarken bu sınırı otomatik denetler.",
          },
        },
      ]
    : [
        {
          id: 'whats-changed',
          eyebrow: '01 · Context',
          h: 'What changed?',
          lead: 'In Q1 2026, Google quietly tightened its fake-review filter by two notches.',
          p: 'The algorithm now applies extra filtering to "multiple reviews from the same device" and "reviews without a geographic match." Devastating for teams who buy fake reviews; for organic collectors it means starting ahead of the competition.',
          callout: {
            kind: 'fact',
            label: 'In one sentence',
            text: 'Fake reviews cost more, real reviews compound.',
          },
        },
        {
          id: 'qr-flow',
          eyebrow: '02 · Tactic',
          h: 'Build a QR-based flow.',
          lead: "Reviews from real customers look natural to Google's sensors.",
          p: 'When you collect through QR, the IP, device and location signals are already organic; the algorithmic suspicion score stays low. Buaze tracks these signals across platforms and flags reviews that cross a risk threshold.',
          list: [
            'A unique code for every table and staff member',
            'Scan → rate → review in 20 seconds',
            'Happy goes to Google; unhappy goes to your team',
          ],
        },
        {
          id: 'timing',
          eyebrow: '03 · Timing',
          h: 'Timing decides everything.',
          lead: 'Invites at checkout — or 1–4 hours after service — yield the highest conversion.',
          p: 'Past 24 hours the rate halves. After 72 hours it switches from organic to "solicited" — a class Google weighs differently.',
          stat: {
            k: '4×',
            l: 'Reviews in the first 4 hours get 4× more impressions than those past 24 hours.',
          },
        },
        {
          id: 'incentives',
          eyebrow: '04 · Risk',
          h: 'Mind the incentive line.',
          lead: '"Discount for a Google review" → policy violation.',
          p: 'Google treats any material incentive offered in exchange for a review as a violation. Reviews can be removed, accounts flagged, and in severe cases the listing suspended. Never tie an incentive to a platform review link.',
          callout: {
            kind: 'warn',
            label: 'Heads up',
            text: "Coffee, discount, raffle in exchange for a review — all violations. Buaze's rule engine checks this line automatically as you build campaigns.",
          },
        },
      ];

  const tocItems = sections.map((s) => ({ id: s.id, text: s.h }));

  const takeaways = isTr
    ? [
        'QR akışı = organik sinyal',
        'İlk 4 saat = altın saat',
        'Teşvik = politika ihlali',
        'Şeffaflık = uzun vadeli sermaye',
      ]
    : [
        'QR flow = organic signal',
        'First 4 hours = the golden window',
        'Incentives = a policy violation',
        'Transparency = compounding capital',
      ];

  const pullQuote = isTr
    ? 'Sahte yorum kısa vadeli bir görüntü, gerçek yorum uzun vadeli bir sermaye. Buaze\'nin yaptığı tek şey, ikisinin arasındaki farkı işletmenin lehine çevirmek.'
    : 'Fake reviews are a short-term performance, real reviews are long-term capital. All Buaze does is tilt the gap between them in the operator\'s favour.';

  const tags = isTr
    ? ['Google', 'Politika', 'Yorum yönetimi', 'QR', 'SEO', 'Strateji']
    : ['Google', 'Policy', 'Review management', 'QR', 'SEO', 'Strategy'];

  const postUrl = `https://buaze.com/${locale}/blog/google-2026`;
  const shareText = encodeURIComponent(title);
  const shareUrl = encodeURIComponent(postUrl);

  return (
    <div id="top" className="min-h-screen bg-white text-[#0A0A0A] lg:pt-[64px] selection:bg-[#C6F24E]/40">
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      {/* ─── Lime Hero ─── */}
      <section className="relative overflow-hidden bg-[#C6F24E] px-5 sm:px-10 pt-[60px] sm:pt-16 pb-[60px] sm:pb-24">
        <svg
          aria-hidden
          viewBox="0 0 300 200"
          className="pointer-events-none absolute bottom-0 right-6 sm:right-12 w-[260px] sm:w-[400px] opacity-[0.15]"
        >
          <path
            d="M0 150 L40 120 L80 140 L120 90 L160 100 L200 60 L240 80 L280 40 L300 30"
            fill="none"
            stroke="#0A0A0A"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="200" cy="60" r="12" fill="#0A0A0A" />
          <circle cx="280" cy="40" r="8" fill="#0A0A0A" />
        </svg>

        <div className="relative max-w-[1200px] mx-auto">
          <Link
            href={`${base}/blog`}
            className="pulse-eyebrow inline-flex items-center gap-2 text-[#0A0A0A]/70 hover:text-[#0A0A0A] mb-7 transition-colors"
          >
            <ArrowLeft size={14} strokeWidth={2} />
            {(isTr ? 'Tüm yazılar' : 'All posts').toUpperCase()}
          </Link>

          <div className="max-w-[820px]">
            <div
              className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0A0A0A]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {isTr ? 'STRATEJİ · 8 DK OKUMA' : 'STRATEGY · 8 MIN READ'}
            </div>
            <h1
              className="mt-3 sm:mt-4 text-[32px] sm:text-[48px] lg:text-[56px] font-medium leading-[1] tracking-[-0.03em] text-[#0A0A0A]"
            >
              {title}
            </h1>

            <div className="mt-6 sm:mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A0A0A] text-[13px] font-semibold text-[#C6F24E]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  EK
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-[#0A0A0A]">{author}</div>
                  <div className="text-[12px] text-[#0A0A0A]/70">{role}</div>
                </div>
              </div>
              <div className="text-[12px] text-[#0A0A0A]/70">{date}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3-col Content (TOC + Article + Meta) ─── */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-20">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 lg:grid-cols-[260px_minmax(0,1fr)_260px] lg:gap-14">
          {/* ── LEFT — TOC + Reading + Share (desktop only) ── */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 flex flex-col gap-5">
              <div>
                <div className="pulse-eyebrow text-[#737373]">
                  {isTr ? 'İçindekiler' : 'Contents'}
                </div>
                <nav className="mt-3.5 flex flex-col border-l border-[#EDEDED]">
                  {tocItems.map((item, index) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className={`relative -ml-px py-2.5 pl-4 text-[13px] leading-[1.4] transition-colors ${
                        index === 0
                          ? 'border-l-2 border-[#C6F24E] font-semibold text-[#0A0A0A]'
                          : 'border-l-2 border-transparent text-[#737373] hover:text-[#0A0A0A]'
                      }`}
                    >
                      <span
                        className="mr-2 text-[10px] tracking-[0.08em] text-[#A3A3A3]"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      {item.text}
                    </a>
                  ))}
                </nav>
              </div>

              <BlogReadingProgress readTime={readTime} locale={locale} />

              <div className="border-t border-[#EDEDED] pt-5">
                <div className="pulse-eyebrow text-[#737373]">
                  {isTr ? 'Paylaş' : 'Share'}
                </div>
                <div className="mt-3 flex gap-1.5">
                  <a
                    href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={isTr ? "X'te paylaş" : 'Share on X'}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#EDEDED] text-[#525252] transition-colors hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
                  >
                    {SHARE_ICONS.twitter}
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={isTr ? "LinkedIn'de paylaş" : 'Share on LinkedIn'}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#EDEDED] text-[#525252] transition-colors hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
                  >
                    {SHARE_ICONS.linkedin}
                  </a>
                  <a
                    href={`https://api.whatsapp.com/send?text=${shareText}%20${shareUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={isTr ? "WhatsApp'ta paylaş" : 'Share on WhatsApp'}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#EDEDED] text-[#525252] transition-colors hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
                  >
                    {SHARE_ICONS.whatsapp}
                  </a>
                  <BlogCopyLinkButton url={postUrl} locale={locale} />
                </div>
              </div>
            </div>
          </aside>

          {/* ── CENTER — Article ── */}
          <article id="article-body" className="lg:max-w-[680px]">
            <div className="pulse-blog-lead">{lead}</div>

            {sections.map((s) => (
              <section key={s.id} id={s.id} className="mb-14 scroll-mt-24">
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className="rounded-full bg-[#EAF9B8] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0A0A0A]"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {s.eyebrow}
                  </span>
                  <div className="h-px flex-1 bg-[#EDEDED]" />
                </div>

                <h2
                  className="mb-3.5 text-[28px] sm:text-[36px] font-medium leading-[1.1] tracking-[-0.025em] text-[#0A0A0A]"
                >
                  {s.h}
                </h2>

                <p className="mb-4 text-[18px] sm:text-[19px] leading-[1.55] text-[#0A0A0A]">
                  {s.lead}
                </p>

                <p className="text-[16px] leading-[1.75] text-[#525252]">{s.p}</p>

                {s.list && (
                  <ul className="mt-6 flex flex-col gap-2.5">
                    {s.list.map((it, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3.5 rounded-xl bg-[#FAFAFA] px-4 py-3.5 text-[15px] leading-[1.5] text-[#0A0A0A]"
                      >
                        <span
                          className="mt-0.5 inline-flex shrink-0 rounded-full bg-[#C6F24E] px-2 py-[2px] text-[11px] font-semibold tracking-[0.06em] text-[#0A0A0A]"
                          style={{ fontFamily: 'var(--font-mono)' }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        {it}
                      </li>
                    ))}
                  </ul>
                )}

                {s.stat && (
                  <div className="mt-7 grid grid-cols-[auto_1fr] items-center gap-7 rounded-2xl bg-[#0A0A0A] px-7 py-7 text-white sm:px-8">
                    <div
                      className="text-[72px] sm:text-[88px] font-medium leading-[0.85] tracking-[-0.04em] text-[#C6F24E]"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {s.stat.k}
                    </div>
                    <div className="text-[14px] sm:text-[15px] leading-[1.55] text-white/75">
                      {s.stat.l}
                    </div>
                  </div>
                )}

                {s.callout && (
                  <div
                    className={`mt-6 rounded-r-xl py-4 px-5 ${
                      s.callout.kind === 'warn'
                        ? 'border-l-[3px] border-[#0A0A0A] bg-[#FAFAFA]'
                        : 'border-l-[3px] border-[#C6F24E] bg-[#EAF9B8]'
                    }`}
                  >
                    <div className="pulse-eyebrow text-[#0A0A0A]">{s.callout.label}</div>
                    <div
                      className="mt-1.5 text-[16px] font-medium leading-[1.5] tracking-[-0.005em] text-[#0A0A0A]"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {s.callout.text}
                    </div>
                  </div>
                )}
              </section>
            ))}

            {/* Pull quote */}
            <div className="my-14 border-y border-[#0A0A0A] py-9">
              <blockquote
                className="text-[22px] sm:text-[28px] font-medium leading-[1.25] tracking-[-0.02em] text-[#0A0A0A]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <span className="mr-1.5 text-[#A8D62E]">&ldquo;</span>
                {pullQuote}
                <span className="ml-1 text-[#A8D62E]">&rdquo;</span>
              </blockquote>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A0A0A] text-[13px] font-semibold text-[#C6F24E]">
                  EK
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-[#0A0A0A]">{author}</div>
                  <div className="text-[12px] text-[#737373]">{role}</div>
                </div>
              </div>
            </div>

            {/* Takeaway grid */}
            <div className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-7 sm:p-8">
              <div className="pulse-eyebrow text-[#737373]">
                {isTr ? 'Özet · Yanına alacakların' : 'Takeaways · For your back pocket'}
              </div>
              <h3
                className="mt-3 text-[22px] sm:text-[24px] font-medium leading-[1.2] tracking-[-0.02em] text-[#0A0A0A]"
              >
                {isTr ? '4 kural, 1 sayfada.' : '4 rules, on one page.'}
              </h3>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {takeaways.map((it, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl border border-[#EDEDED] bg-white px-4 py-3.5 text-[14px] font-medium text-[#0A0A0A]"
                  >
                    <span
                      className="text-[10px] tracking-[0.1em] text-[#737373]"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {it}
                  </div>
                ))}
              </div>
            </div>

            {/* Dark CTA */}
            <div className="mt-10 grid grid-cols-1 gap-6 rounded-[18px] bg-[#0A0A0A] p-7 text-white sm:grid-cols-[1fr_auto] sm:items-center sm:gap-8 sm:p-9">
              <div>
                <div className="pulse-eyebrow text-[#C6F24E]">
                  {isTr ? 'Hemen başla' : 'Get started'}
                </div>
                <h3
                  className="mt-2.5 text-[24px] sm:text-[28px] font-medium leading-[1.15] tracking-[-0.02em]"
                >
                  {isTr
                    ? 'Google politikalarına uyumlu büyümeye hazır mısın?'
                    : 'Ready to grow the Google-compliant way?'}
                </h3>
                <p className="mt-2 text-[13px] text-white/65">
                  {isTr
                    ? '14 gün ücretsiz · kredi kartı gerekmez · 5 dakikada kurulum'
                    : '14 days free · no card required · 5-minute setup'}
                </p>
              </div>
              <Link
                href={`${base}/auth/register`}
                className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-[#C6F24E] px-6 py-3.5 text-[14px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#A8D62E] sm:self-auto"
              >
                {isTr ? 'Ücretsiz başla' : 'Start free'}
                <span aria-hidden>→</span>
              </Link>
            </div>

            {/* Tags */}
            <div className="mt-10 flex flex-wrap items-center gap-2">
              <span className="pulse-eyebrow text-[#737373] mr-1">
                {isTr ? 'Etiketler' : 'Tags'}
              </span>
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[#F2F2F2] px-3 py-1.5 text-[12px] tracking-[0.04em] text-[#525252]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </article>

          {/* ── RIGHT — Author + Newsletter ── */}
          <aside>
            <div className="lg:sticky lg:top-24 flex flex-col gap-5">
              <div className="rounded-[14px] border border-[#EDEDED] bg-white p-5">
                <div className="pulse-eyebrow text-[#737373]">
                  {isTr ? 'Yazar' : 'Author'}
                </div>
                <div className="mt-3.5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0A0A0A] text-[14px] font-semibold text-[#C6F24E]">
                    EK
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-[#0A0A0A]">{author}</div>
                    <div className="text-[12px] text-[#525252]">{role}</div>
                  </div>
                </div>
                <p className="mt-3 text-[12px] leading-[1.55] text-[#525252]">
                  {isTr
                    ? '7 yıl boyunca restoran ve perakende için itibar yönetimi danışmanlığı yaptı. Şimdi Buaze\'yi kuruyor.'
                    : 'Spent 7 years consulting on reputation management for restaurants and retail. Now building Buaze.'}
                </p>
              </div>

              <div className="rounded-[14px] bg-[#0A0A0A] p-5 text-white">
                <div className="pulse-eyebrow text-[#C6F24E]">
                  {isTr ? 'Bülten' : 'Newsletter'}
                </div>
                <div
                  className="mt-2 text-[18px] font-medium leading-[1.2] tracking-[-0.015em]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {isTr ? 'Haftada bir, sadece taktik.' : 'One email a week. Pure tactics.'}
                </div>
                <p className="mt-2 text-[12px] leading-[1.55] text-white/60">
                  {isTr
                    ? 'Spam yok, sadece test edilmiş öneriler.'
                    : 'No spam — only field-tested ideas.'}
                </p>
                <div className="mt-3.5">
                  <NewsletterSignup locale={locale} source="blog_inline" stacked />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
