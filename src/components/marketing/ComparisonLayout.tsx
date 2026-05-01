import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import type { Locale, Translations } from '@/lib/translations';
import Link from 'next/link';
import { ReactNode } from 'react';

interface ComparisonRow {
  label: string;
  buaze: ReactNode;
  competitor: ReactNode;
  isHeader?: boolean;
}

interface ComparisonLayoutProps {
  locale: Locale;
  t: Translations;
  vsName: string;
  heroTitle: string;
  heroDesc: string;
  rows: ComparisonRow[];
  argumentTitle: string;
  argumentDesc: string;
}

export default function ComparisonLayout({
  locale,
  t,
  vsName,
  heroTitle,
  heroDesc,
  rows,
  argumentTitle,
  argumentDesc,
}: ComparisonLayoutProps) {
  const base = `/${locale}`;
  const isTr = locale === 'tr';

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0A0A0A] lg:pt-[64px] selection:bg-[#C6F24E]/40">
      <MarketingNavbar locale={locale} t={t} />

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden px-6 sm:px-10 pt-16 sm:pt-24 pb-14 sm:pb-20">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.5]"
          width="100%"
          height="100%"
        >
          <defs>
            <pattern id="cmpGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#EDEDED" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cmpGrid)" />
        </svg>
        <div className="relative max-w-[900px] mx-auto text-center">
          <span className="pulse-eyebrow text-[#737373]">
            BUAZE {isTr ? 'KARŞILAŞTIRMA' : 'VS'} {vsName.toUpperCase()}
          </span>
          <h1 className="mt-5 text-[40px] sm:text-[60px] lg:text-[68px] font-medium leading-[1] tracking-[-0.035em] text-[#0A0A0A]">
            {heroTitle}
          </h1>
          <p className="mt-6 text-[17px] sm:text-[18px] text-[#525252] leading-[1.55] max-w-[640px] mx-auto">
            {heroDesc}
          </p>
        </div>
      </section>

      {/* ─── Comparison Table ─── */}
      <section className="px-6 sm:px-10 pb-20 sm:pb-28">
        <div className="max-w-[1100px] mx-auto">
          <div className="mb-10 sm:mb-12 text-center">
            <h2 className="text-[28px] sm:text-[40px] font-medium tracking-[-0.03em] text-[#0A0A0A] leading-[1.05]">
              {t.compare_title}
            </h2>
            <p className="mt-4 text-[16px] text-[#525252] max-w-[620px] mx-auto leading-relaxed">
              {t.compare_subtitle}
            </p>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-[#EDEDED] bg-white">
            <table className="w-full border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-[#EDEDED]">
                  <th className="p-5 pulse-eyebrow text-left text-[#737373]">{t.compare_feat_name}</th>
                  <th className="p-5 pulse-eyebrow text-center text-[#0A0A0A] bg-[#EAF9B8]">
                    {t.compare_buaze}
                  </th>
                  <th className="p-5 pulse-eyebrow text-center text-[#737373]">{vsName}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDEDED]">
                {rows.map((row, i) => (
                  <tr key={i} className={row.isHeader ? 'bg-[#FAFAFA]' : ''}>
                    <td
                      className={`p-5 ${
                        row.isHeader
                          ? 'pulse-eyebrow text-[#737373]'
                          : 'text-[14px] font-medium text-[#0A0A0A]'
                      }`}
                    >
                      {row.label}
                    </td>
                    <td className="p-5 text-center bg-[#EAF9B8]/30 text-[#0A0A0A] font-medium text-[14px]">
                      {row.buaze}
                    </td>
                    <td className="p-5 text-center text-[#525252] text-[14px]">{row.competitor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── Argument ─── */}
      <section className="bg-[#FAFAFA] border-y border-[#EDEDED] px-6 sm:px-10 py-20 sm:py-28">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Kritik fark' : 'The critical difference'}
            </span>
            <h2 className="mt-4 text-[32px] sm:text-[44px] font-medium leading-[1.05] tracking-[-0.03em] text-[#0A0A0A]">
              {argumentTitle}
            </h2>
            <div className="mt-5 text-[16px] text-[#525252] leading-[1.65] space-y-4">
              {argumentDesc.split('\n').map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <Link
              href={`${base}/auth/register`}
              className="inline-flex items-center justify-center gap-2 mt-7 bg-[#0A0A0A] text-white px-6 py-3.5 rounded-full text-[14px] font-medium hover:bg-[#1A1A1A] transition-colors"
            >
              {isTr ? 'Profesyonele geç' : 'Switch to professional'}
              <span aria-hidden>→</span>
            </Link>
          </div>

          <div className="bg-white rounded-3xl border border-[#EDEDED] p-7 sm:p-8">
            <div className="flex items-center gap-3 pb-5 border-b border-[#EDEDED] mb-5">
              <div className="w-10 h-10 rounded-full bg-[#C6F24E] flex items-center justify-center">
                <span className="text-[18px] text-[#0A0A0A]">✦</span>
              </div>
              <div>
                <div className="pulse-eyebrow text-[#737373]">BUAZE {isTr ? 'ETKİSİ' : 'IMPACT'}</div>
                <div className="text-[13px] font-medium text-[#0A0A0A] mt-0.5">
                  {isTr ? 'Gerçek zamanlı veri' : 'Real-time data'}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: isTr ? 'Geri bildirim hızı' : 'Feedback speed', value: '4dk' },
                { label: isTr ? 'Yorum dönüşümü' : 'Review conversion', value: '%68' },
                { label: isTr ? 'Müşteri kaybı' : 'Churn rate', value: '-%90' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center bg-[#FAFAFA] px-4 py-3 rounded-xl border border-[#EDEDED]"
                >
                  <span className="text-[14px] text-[#525252]">{item.label}</span>
                  <span
                    className="text-[18px] font-medium text-[#0A0A0A] tracking-[-0.02em]"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pain + Verdict ─── */}
      <section className="px-6 sm:px-10 py-20 sm:py-28">
        <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <div className="bg-white border border-[#EDEDED] rounded-3xl p-7 sm:p-8">
            <span className="pulse-eyebrow text-[#B91C1C]">
              {isTr ? 'Acı noktası' : 'The pain'}
            </span>
            <h3 className="mt-3 text-[22px] sm:text-[24px] font-medium text-[#0A0A0A] leading-tight tracking-[-0.02em]">
              {t.compare_pain_title}
            </h3>
            <p className="mt-4 text-[15px] text-[#525252] leading-[1.65]">
              {vsName === 'Spreadsheet' ? t.compare_pain_spreadsheet : t.compare_pain_static}
            </p>
          </div>
          <div className="bg-[#EAF9B8] border border-[#C6F24E] rounded-3xl p-7 sm:p-8">
            <span className="pulse-eyebrow text-[#0A0A0A]">
              {isTr ? 'Sonuç' : 'The verdict'}
            </span>
            <h3 className="mt-3 text-[22px] sm:text-[24px] font-medium text-[#0A0A0A] leading-tight tracking-[-0.02em]">
              {t.compare_verdict_title}
            </h3>
            <p className="mt-4 text-[15px] text-[#0A0A0A] leading-[1.65]">
              {t.compare_verdict_desc}
            </p>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="bg-[#0A0A0A] text-white px-6 sm:px-10 py-20 sm:py-28">
        <div className="max-w-[800px] mx-auto text-center">
          <h2 className="text-[36px] sm:text-[56px] font-medium leading-[1.02] tracking-[-0.04em] text-white">
            {isTr ? 'Daha fazla beklemeyin.' : "Don't wait any longer."}
          </h2>
          <p className="mt-5 text-[16px] sm:text-[17px] text-white/70 max-w-[560px] mx-auto">
            {isTr
              ? 'Onlarca işletme gibi siz de manuel süreçleri geride bırakın.'
              : 'Join dozens of businesses leaving manual processes behind.'}
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Link
              href={`${base}/auth/register`}
              className="inline-flex items-center justify-center gap-2 bg-[#C6F24E] text-[#0A0A0A] px-7 py-4 rounded-full text-[15px] font-medium hover:bg-[#A8D62E] transition-colors"
            >
              {isTr ? '14 gün ücretsiz dene' : 'Start 14-day free trial'}
              <span aria-hidden>→</span>
            </Link>
            <Link
              href={`${base}/contact`}
              className="inline-flex items-center justify-center gap-2 border border-white/20 text-white px-7 py-4 rounded-full text-[15px] font-medium hover:bg-white/10 transition-colors"
            >
              {isTr ? 'Satışla görüş' : 'Talk to sales'}
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
