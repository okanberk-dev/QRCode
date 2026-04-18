import { Star, QrCode, ShieldCheck, TrendingUp, ArrowRight, Zap, Users } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import type { Locale, Translations } from '@/lib/translations';
import Link from 'next/link';
import { ReactNode } from 'react';

interface SolutionPageLayoutProps {
  locale: Locale;
  t: Translations;
  industryKey: string; // e.g., 'res', 'hot', 'hea', 'den', etc.
  icon: ReactNode;
  industryBadge: string;
  h1Prefix: string;
  h1Suffix: string;
  description: string;
  stats?: { num: string; label: string }[];
  steps?: { title: string; desc: string; icon: ReactNode }[];
  benefits?: { title: string; desc: string; icon: ReactNode }[];
}

export default function SolutionPageLayout({
  locale,
  t,
  icon,
  industryBadge,
  h1Prefix,
  h1Suffix,
  description,
  stats,
  steps,
  benefits,
}: SolutionPageLayoutProps) {
  const base = `/${locale}`;

  // Default steps if not provided
  const displaySteps = steps || [
    {
      icon: <QrCode size={24} />,
      title: locale === 'tr' ? 'QR Kodunuzu Yerleştirin' : 'Place Your QR Code',
      desc: locale === 'tr' 
        ? 'Stratejik noktalara markanıza özel tasarlanmış QR kodları yerleştirin.' 
        : 'Place custom-branded QR codes at strategic spots.',
    },
    {
      icon: <Users size={24} />,
      title: locale === 'tr' ? 'Müşteri Kolayca Tarar' : 'Customers Scan Easily',
      desc: locale === 'tr'
        ? 'Müşteriniz saniyeler içinde tarar, uygulama indirmesine gerek kalmaz.'
        : 'Customers scan in seconds — no app download needed.',
    },
      {
        icon: <TrendingUp size={24} />,
        title: locale === 'tr' ? 'Görünürlüğünüz Artar' : 'Your Visibility Increases',
        desc: locale === 'tr'
          ? 'Geri bildirim akışını profesyonelce yönetin.'
          : 'Manage your feedback flow professionally.',
      },
  ];

  // Default benefits
  const displayBenefits = benefits || [
    {
      title: locale === 'tr' ? 'Dijital İtibar Artışı' : 'Digital Reputation Growth',
      desc: locale === 'tr' ? 'Organik ve güvenli itibar artışı sağlayın.' : 'Achieve organic and secure reputation growth.',
      icon: <Star size={20} className="text-[#FDBF1D]" />,
    },
    {
      title: locale === 'tr' ? 'Profesyonel Geri Bildirim Ops.' : 'Professional Feedback Ops.',
      desc: locale === 'tr' ? 'Krizleri büyümeden operasyonel olarak çözün.' : 'Resolve crises operationally before they grow.',
      icon: <ShieldCheck size={20} className="text-[#10b981]" />,
    },
    {
      title: locale === 'tr' ? 'Müşteri Sadakati' : 'Customer Loyalty',
      desc: locale === 'tr' ? 'Geri bildirimlerle hizmet kalitenizi artırın.' : 'Improve service quality with feedback.',
      icon: <TrendingUp size={20} className="text-[#ea580c]" />,
    },
    {
      title: locale === 'tr' ? 'Dijital Görünürlük' : 'Digital Visibility',
      desc: locale === 'tr' ? 'Sıralamalarda rakiplerinizin önüne geçin.' : 'Stand out from competitors in rankings.',
      icon: <Zap size={20} className="text-[#FDBF1D]" />,
    },
  ];

  // Default stats
  const displayStats = stats || [
    { num: '1000+', label: locale === 'tr' ? 'AKTİF KULLANICI' : 'ACTIVE USERS' },
    { num: '4.8', label: locale === 'tr' ? 'ORT. SKOR' : 'AVG. SCORE' },
    { num: '%95', label: locale === 'tr' ? 'MEMNUNİYET' : 'SATISFACTION' },
    { num: '<5dk', label: locale === 'tr' ? 'KURULUM' : 'SETUP' },
  ];

  return (
    <div className="min-h-screen bg-[#FCFBF7] text-[#1f1e1d] font-sans pt-[64px] selection:bg-[#FDBF1D]/30">
      <MarketingNavbar locale={locale} t={t} />

      {/* Hero */}
      <section className="pt-20 sm:pt-32 pb-16 px-5 sm:px-8 bg-[#F7F4F0] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#ea580c]/5 rounded-full blur-[150px] translate-x-1/3 -translate-y-1/3" />
        <div className="max-w-[1200px] mx-auto relative content-left">
          <div className="max-w-[720px] space-y-6">
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-white border-2 border-[#1f1e1d] rounded-full shadow-[4px_4px_0_0_#1f1e1d]">
              {icon}
              <span className="text-[11px] font-black uppercase tracking-widest">{industryBadge}</span>
            </div>
            <h1 className="text-[44px] sm:text-[72px] font-black leading-[0.95] tracking-[-0.04em] text-[#1f1e1d]">
              {h1Prefix} <span className="text-[#ea580c]">{h1Suffix}</span>
            </h1>
            <p className="text-[17px] sm:text-[20px] text-[#6b6760] font-bold leading-relaxed max-w-[600px]">
              {description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href={`${base}/auth/register`}
                className="px-8 py-4 bg-[#FDBF1D] text-[#1f1e1d] text-[15px] font-extrabold rounded-lg border-2 border-[#1f1e1d] shadow-[0_4px_0_0_#1f1e1d] hover:bg-[#EAB308] active:translate-y-1 active:shadow-none transition-all text-center flex items-center justify-center gap-2"
              >
                {locale === 'tr' ? '14 Gün Ücretsiz Deneyin' : 'Start 14-Day Free Trial'} <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20 sm:py-32 px-5 sm:px-8 bg-white border-y border-[#e8e4de]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <p className="text-[12px] font-black uppercase tracking-widest text-[#FDBF1D] mb-4">
              {locale === 'tr' ? 'SÜREÇ' : 'PROCESS'}
            </p>
            <h2 className="text-[32px] sm:text-[42px] font-extrabold text-[#1f1e1d] tracking-[-0.03em] leading-tight">
              {locale === 'tr' ? 'Nasıl Çalışır?' : 'How It Works'}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {displaySteps.map((step, i) => (
              <div key={i} className="group relative bg-[#FCFBF7] p-8 rounded-2xl border-[2.5px] border-[#1f1e1d] shadow-[4px_6px_0_0_#1f1e1d] hover:-translate-y-2 transition-transform duration-300">
                <div className="absolute -top-5 -right-5 w-14 h-14 bg-[#FDBF1D] rounded-full border-2 border-[#1f1e1d] shadow-[2px_3px_0_0_#1f1e1d] flex items-center justify-center text-[18px] font-black text-[#1f1e1d] z-10">
                  {`0${i + 1}`}
                </div>
                <div className="w-12 h-12 bg-white rounded-xl border-2 border-[#1f1e1d] flex items-center justify-center mb-6 text-[#1f1e1d]">
                  {step.icon}
                </div>
                <h3 className="text-[20px] font-extrabold text-[#1f1e1d] mb-4">{step.title}</h3>
                <p className="text-[14px] text-[#6b6760] leading-relaxed font-medium">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 sm:py-32 px-5 sm:px-8 bg-[#1f1e1d] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FDBF1D]/5 rounded-full blur-[150px]" />
        <div className="max-w-[1200px] mx-auto relative z-10">
          <div className="mb-16 space-y-4 text-center">
            <p className="text-[12px] font-black text-[#FDBF1D] uppercase tracking-widest">
              {locale === 'tr' ? 'AVANTAJLAR' : 'BENEFITS'}
            </p>
            <h2 className="text-[32px] sm:text-[48px] font-black text-white tracking-[-0.03em] leading-tight">
              {locale === 'tr' ? 'Neden Buaze?' : 'Why Buaze?'}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {displayBenefits.map((b, i) => (
              <div key={i} className="group flex gap-5 bg-white/5 border border-white/10 p-6 sm:p-8 rounded-2xl hover:bg-white/10 transition-all hover:-translate-y-1">
                <div className="flex-shrink-0 w-12 h-12 bg-white/5 rounded-xl border border-white/20 flex items-center justify-center">
                  {b.icon}
                </div>
                <div className="space-y-1">
                  <h4 className="text-[17px] font-extrabold text-white">{b.title}</h4>
                  <p className="text-[13px] text-[#ada89f]">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-16 px-5 sm:px-8 bg-[#FDBF1D] border-y-[3px] border-[#1f1e1d]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {displayStats.map((stat, i) => (
            <div key={i}>
              <div className="text-[36px] sm:text-[48px] font-black text-[#1f1e1d] tracking-tighter leading-none">{stat.num}</div>
              <div className="text-[10px] font-black text-[#1f1e1d]/60 uppercase tracking-widest mt-2">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-32 px-5 sm:px-8 bg-[#FCFBF7]">
        <div className="max-w-[800px] mx-auto text-center space-y-8">
          <h2 className="text-[32px] sm:text-[48px] font-black text-[#1f1e1d] tracking-[-0.03em] leading-tight">
             {locale === 'tr' ? 'İşletmenizi Bugün Büyütün' : 'Grow Your Business Today'}
          </h2>
          <Link
            href={`${base}/auth/register`}
            className="inline-flex items-center gap-2 px-10 py-5 bg-[#1f1e1d] text-white text-[16px] font-extrabold rounded-2xl border-[3px] border-[#1f1e1d] shadow-[0_6px_0_0_#000] hover:bg-[#111] active:translate-y-[6px] active:shadow-none transition-all"
          >
            {locale === 'tr' ? 'Hemen Başlayın' : 'Get Started Now'} <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
