import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Inbox, MessageSquare, ShieldCheck, Users } from 'lucide-react';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import { IllusInbox } from '@/components/marketing/PulseIllustrations';
import PlatformLogo from '@/components/marketing/PlatformLogo';
import { jsonLdString } from '@/lib/seo/json-ld';
import { getTranslations, type Locale } from '@/lib/translations';

export const dynamic = 'force-dynamic';

const VALID_LOCALES = ['tr', 'en'] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === 'tr'
      ? 'Yorum Yönetimi — Tüm platformlar tek gelen kutuda | Buaze'
      : 'Review Management — Every platform in one inbox | Buaze';
  const description =
    locale === 'tr'
      ? 'Google ve Google dışı yorum platformlarını tek panelden yönetin. Atama, SLA, yanıt akışı, platform yönlendirme ve güvenli Google uyumu.'
      : 'Manage Google and non-Google review platforms from one dashboard. Assignment, SLA, replies, routing, and Google-safe workflows.';
  return {
    metadataBase: new URL('https://buaze.com'),
    title,
    description,
    alternates: {
      canonical: `/${locale}/features/review-management`,
      languages: {
        tr: '/tr/features/review-management',
        en: '/en/features/review-management',
        'x-default': '/en/features/review-management',
      },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/features/review-management` },
  };
}

export default async function ReviewManagementPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  if (!VALID_LOCALES.includes(locale as typeof VALID_LOCALES[number])) notFound();

  const t = getTranslations(locale);
  const isTr = locale === 'tr';
  const base = `/${locale}`;
  const canonicalUrl = `https://buaze.com/${locale}/features/review-management`;

  const benefits = isTr
    ? [
        { icon: Inbox, title: 'Tek gelen kutusu', body: 'Google, Tripadvisor, Yemeksepeti, Getir ve diğer platform sinyalleri tek akışta toplanır.' },
        { icon: Users, title: 'Ekip atama', body: 'Yorumlar şube, sorumlu veya ekip üyesi bazında takip edilir; viewer rolleri write işlemlerinde korunur.' },
        { icon: MessageSquare, title: 'Yanıt akışı', body: 'Owner metni görür, düzenler ve onaylar. Otomatik public cevap yoktur; kontrol işletmede kalır.' },
        { icon: ShieldCheck, title: 'Google uyumu', body: 'Places link üretimi ile Business Profile yorum yönetimi ayrı tutulur; API gate kapalıysa hard-block döner.' },
      ]
    : [
        { icon: Inbox, title: 'Unified inbox', body: 'Google, Tripadvisor, Yemeksepeti, Getir and other review signals are collected in one stream.' },
        { icon: Users, title: 'Team assignment', body: 'Reviews can be tracked by branch, owner or teammate; viewer roles stay protected on write operations.' },
        { icon: MessageSquare, title: 'Reply workflow', body: 'Owners review, edit and approve the text. No automatic public reply is published without approval.' },
        { icon: ShieldCheck, title: 'Google-safe', body: 'Places link generation and Business Profile review management stay separated; disabled gates hard-block API use.' },
      ];

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: isTr ? 'Buaze Yorum Yönetimi' : 'Buaze Review Management',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    inLanguage: isTr ? 'tr-TR' : 'en-US',
    url: canonicalUrl,
    description: isTr
      ? 'Çoklu platform yorumlarını tek panelde yönetmek için Buaze ürün modülü.'
      : 'Buaze product module for managing multi-platform reviews in one dashboard.',
    publisher: { '@type': 'Organization', name: 'Buaze', url: 'https://buaze.com' },
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: isTr ? 'Ana Sayfa' : 'Home', item: `https://buaze.com/${locale}` },
      { '@type': 'ListItem', position: 2, name: isTr ? 'Özellikler' : 'Features', item: `https://buaze.com/${locale}/features` },
      { '@type': 'ListItem', position: 3, name: isTr ? 'Yorum Yönetimi' : 'Review Management', item: canonicalUrl },
    ],
  };

  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] lg:pt-[64px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbSchema) }} />
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">
        <section className="px-5 sm:px-10 pt-[60px] sm:pt-20 pb-14">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'YORUM YÖNETİMİ' : 'REVIEW MANAGEMENT'}
              </span>
              <h1 className="mt-4 max-w-[820px] text-[38px] font-medium leading-[0.96] tracking-[-0.035em] sm:text-[56px] lg:text-[70px]">
                {isTr ? 'Her platformdan gelen yorum, tek panelde.' : 'Every platform review, in one dashboard.'}
              </h1>
              <p className="mt-5 max-w-[620px] text-[16px] leading-[1.7] text-[#525252] sm:text-[18px]">
                {isTr
                  ? 'Buaze, müşteri yorumlarını dağınık sekmelerden çıkarır. Google yorum yönetimi, paket servis linkleri, ekip atama ve yanıt akışı aynı operasyon panelinde birleşir.'
                  : 'Buaze removes review work from scattered tabs. Google review management, delivery links, team ownership and reply workflows meet in one operating panel.'}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={`${base}/auth/register`} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 py-3 text-[15px] font-semibold text-white hover:bg-[#1A1A1A]">
                  {isTr ? 'Ücretsiz başla' : 'Start free'}
                  <ArrowRight size={16} />
                </Link>
                <Link href={`${base}/features/pulse-ai`} className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#0A0A0A] px-6 py-3 text-[15px] font-semibold text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white">
                  {isTr ? 'Pulse AI yanıtlarını gör' : 'See Pulse AI replies'}
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <span className="pulse-eyebrow text-[#737373]">
                  {isTr ? 'CANLI GELEN KUTUSU' : 'LIVE INBOX'}
                </span>
                <span className="rounded-full bg-[#C6F24E] px-3 py-1 text-[12px] font-semibold text-[#0A0A0A]">
                  4.8 / 5
                </span>
              </div>
              <div className="mt-6 grid gap-3">
                {([
                  ['google', isTr ? 'Yeni Google yorumu' : 'New Google review', '5★'],
                  ['tripadvisor', isTr ? 'Tripadvisor yanıt bekliyor' : 'Tripadvisor needs reply', '3★'],
                  ['yemeksepeti', isTr ? 'Paket servis geri bildirimi' : 'Delivery feedback', '2★'],
                ] as const).map(([id, label, score]) => (
                  <div key={id} className="flex items-center gap-3 rounded-xl border border-[#EDEDED] bg-white p-3">
                    <PlatformLogo id={id} size={34} rounded={8} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-[#0A0A0A]">{label}</p>
                      <p className="mt-0.5 text-[12px] text-[#737373]">{isTr ? 'Atama ve SLA hazır' : 'Assignment and SLA ready'}</p>
                    </div>
                    <span className="pulse-eyebrow text-[#A8D62E]">{score}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-center">
                <IllusInbox size={210} />
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#EDEDED] bg-[#FAFAFA] px-5 py-[60px] sm:px-10 sm:py-20">
          <div className="mx-auto max-w-[1200px]">
            <span className="pulse-eyebrow text-[#737373]">{isTr ? 'OPERASYON AKIŞI' : 'OPERATING FLOW'}</span>
            <h2 className="mt-3 max-w-[720px] text-[30px] font-medium leading-[1.04] tracking-[-0.03em] sm:text-[46px]">
              {isTr ? 'Olumsuz yorumu ilk sen gör, yanıtı ekipçe kapat.' : 'See the negative first, close the reply as a team.'}
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map(({ icon: Icon, title, body }) => (
                <article key={title} className="rounded-2xl border border-[#EDEDED] bg-white p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF9B8] text-[#0A0A0A]">
                    <Icon size={18} strokeWidth={2.2} />
                  </span>
                  <h3 className="mt-4 text-[18px] font-semibold leading-tight">{title}</h3>
                  <p className="mt-2 text-[13px] leading-[1.65] text-[#525252]">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#C6F24E] px-5 py-[60px] text-center sm:px-10 sm:py-24">
          <div className="mx-auto max-w-[860px]">
            <h2 className="text-[30px] font-medium leading-[1.05] tracking-[-0.03em] sm:text-[48px]">
              {isTr ? 'Yorum akışını bugün sadeleştir.' : 'Simplify your review flow today.'}
            </h2>
            <p className="mt-4 text-[15px] text-[#1A1A1A] sm:text-[17px]">
              {isTr ? '14 gün ücretsiz. Kredi kartı gerekmez.' : '14 days free. No credit card required.'}
            </p>
            <Link href={`${base}/auth/register`} className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-7 py-4 text-[15px] font-semibold text-white hover:bg-[#1A1A1A]">
              {isTr ? 'Hemen başla' : 'Get started'}
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
