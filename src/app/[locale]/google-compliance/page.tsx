import { ExternalLink } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  return {
    title: `${t.google_compliance_page_title} | Buaze`,
    description: t.google_compliance_home_desc,
  };
}

export default async function GoogleCompliancePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const points = [
    { title: t.google_compliance_point1_title, desc: t.google_compliance_point1_desc },
    { title: t.google_compliance_point2_title, desc: t.google_compliance_point2_desc },
    { title: t.google_compliance_point3_title, desc: t.google_compliance_point3_desc },
  ];

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0A0A0A] lg:pt-[64px] selection:bg-[#C6F24E]/40">
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden px-5 sm:px-10 pt-[60px] sm:pt-20 pb-[60px] sm:pb-20 border-b border-[#EDEDED]">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.5]"
          width="100%"
          height="100%"
        >
          <defs>
            <pattern id="gcGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#EDEDED" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#gcGrid)" />
        </svg>
        <div className="relative max-w-[820px] mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#EAF9B8] border border-[#C6F24E] rounded-full px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] pulse-heartbeat" />
            <span className="pulse-eyebrow text-[#0A0A0A]">{t.google_compliance_badge}</span>
          </div>
          <h1 className="mt-5 text-[38px] sm:text-[52px] font-medium leading-[0.95] tracking-[-0.03em] text-[#0A0A0A]">
            {t.google_compliance_page_title}
          </h1>
          <p className="mt-5 text-[15px] sm:text-[18px] text-[#525252] leading-[1.6] max-w-[640px] mx-auto">
            {t.google_compliance_page_subtitle}
          </p>
        </div>
      </section>

      {/* ─── Points ─── */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-20">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {points.map((point, i) => (
            <div key={i} className="bz-card p-6 sm:p-7">
              <span className="pulse-eyebrow text-[#A8D62E]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-3 text-[19px] font-medium text-[#0A0A0A] tracking-[-0.01em] leading-tight">
                {point.title}
              </h3>
              <p className="mt-3 text-[14px] text-[#525252] leading-[1.65]">{point.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Policy card ─── */}
      <section className="px-5 sm:px-10 pb-[60px] sm:pb-24">
        <div className="max-w-[1000px] mx-auto bg-[#0A0A0A] text-white rounded-3xl p-6 sm:p-12 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-[360px] h-[360px] bg-[#C6F24E]/12 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative max-w-[620px]">
            <span className="pulse-eyebrow text-[#C6F24E]">
              {isTr ? 'POLİTİKA BİLGİSİ' : 'POLICY INFORMATION'}
            </span>
            <h2 className="mt-4 text-[24px] sm:text-[36px] font-medium text-white tracking-[-0.02em] leading-[1.1]">
              {t.google_compliance_policy_title}
            </h2>
            <p className="mt-4 text-[15px] sm:text-[16px] text-white/70 leading-[1.7]">
              {t.google_compliance_policy_desc}
            </p>
            <Link
              href="https://support.google.com/contributionpolicy/answer/7400114?hl=en"
              target="_blank"
              className="inline-flex items-center gap-2 mt-7 bg-[#C6F24E] text-[#0A0A0A] px-6 py-3.5 rounded-full text-[14px] font-medium hover:bg-[#A8D62E] transition-colors"
            >
              {t.google_compliance_link_text}
              <ExternalLink size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Closing quote ─── */}
      <section className="bg-[#FAFAFA] border-t border-[#EDEDED] px-5 sm:px-10 py-[60px] sm:py-20">
        <div className="max-w-[720px] mx-auto text-center">
          <div className="flex justify-center gap-1 text-[#C6F24E] text-[18px]">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i}>★</span>
            ))}
          </div>
          <p className="mt-6 text-[17px] sm:text-[20px] text-[#0A0A0A] leading-[1.5] font-medium tracking-[-0.01em]">
            {isTr
              ? '"İşletmenizin başarısı, müşterilerinizle kurduğunuz gerçek ve güvene dayalı bağdadır. Buaze olarak bu bağı teknolojiyle korumayı taahhüt ediyoruz."'
              : '"Your business success lies in the genuine, trust-based bond you build with your customers. As Buaze, we commit to protecting this bond through technology."'}
          </p>
        </div>
      </section>

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
