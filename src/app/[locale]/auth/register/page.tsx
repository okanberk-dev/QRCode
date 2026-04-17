import type { Metadata } from 'next';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import RegisterForm from '@/components/auth/RegisterForm';
import Link from 'next/link';
import { CheckCircle2, Shield } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Ücretsiz Kayıt Ol - Buaze' : 'Sign Up for Free - Buaze',
    description: locale === 'tr'
      ? '14 gün boyunca Buaze\'yi ücretsiz deneyin. Kredi kartı gerekmez, anında başlayın.'
      : 'Try Buaze free for 14 days. No credit card required, start instantly.',
    robots: { index: false, follow: false },
  };
}

export function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
}

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);

  const trialFeatures = locale === 'tr'
    ? ['Sınırsız QR Tarama', 'Dahili Geri Bildirim Sistemi', 'Yönetici Paneli', 'Kredi kartı gerekmez']
    : ['Unlimited QR Scans', 'Internal Feedback System', 'Admin Dashboard', 'No credit card required'];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <MarketingNavbar locale={locale} t={t} />

      <main className="flex-1 flex pt-[72px]">
        {/* Left Panel - Hidden on mobile */}
        <div className="hidden lg:flex w-[45%] bg-[#111827] text-white flex-col justify-center p-16 relative overflow-hidden">
          <div className="relative z-10 max-w-lg">
            <div className="inline-flex items-center gap-2 bg-[#FDBF1D]/10 border border-[#FDBF1D]/30 text-[#FDBF1D] px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-6">
              ✦ {t.auth_trial_badge}
            </div>
            
            <h2 className="text-4xl font-black leading-tight mb-6">
              {locale === 'tr'
                ? 'İtibarınızı büyütmeye bugün başlayın'
                : 'Start growing your reputation today'}
            </h2>
            <p className="text-gray-400 font-medium text-lg leading-relaxed mb-8">
              {locale === 'tr'
                ? '14 gün boyunca tüm özellikleri ücretsiz kullanın. Dilediğiniz zaman iptal edin.'
                : 'Use all features free for 14 days. Cancel anytime.'}
            </p>

            <ul className="space-y-4 bg-[#1f2937] p-6 rounded-2xl border border-gray-800">
              {trialFeatures.map(feat => (
                <li key={feat} className="flex items-center gap-3 font-bold text-gray-300">
                  <div className="w-6 h-6 rounded-full bg-[#111827] flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={14} className="text-[#FDBF1D]" />
                  </div>
                  {feat}
                </li>
              ))}
            </ul>
            
            <div className="flex items-center gap-3 text-gray-500 text-xs font-bold mt-12 bg-white/5 py-3 px-4 rounded-xl inline-flex">
              <Shield size={16} className="text-green-500" />
              {locale === 'tr' ? 'KVKK uyumlu & Endüstriyel Şifreleme' : 'GDPR compliant & Industry-standard Encryption'}
            </div>
          </div>

          {/* Decoration */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#FDBF1D]/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Right Panel - Form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
          <div className="w-full max-w-md relative z-10">
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 sm:p-10 mb-6">
              <div className="mb-8 space-y-3 text-center lg:text-left">
                <div className="inline-flex lg:hidden items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-2">
                  ✦ {t.auth_trial_badge} - {t.auth_no_cc}
                </div>
                <h1 className="text-3xl font-black text-[#111827]">{t.auth_register_title}</h1>
                <p className="text-gray-500 font-medium">{t.auth_register_subtitle}</p>
              </div>

              <RegisterForm locale={locale} t={t} />
            </div>
            
            <p className="text-center text-sm font-medium text-gray-500">
              {locale === 'tr' ? 'Zaten hesabınız var mı?' : "Already have an account?"}{' '}
              <Link href={`/${locale}/auth/login`} className="text-[#111827] font-black hover:text-[#FDBF1D] hover:underline transition-all">
                {locale === 'tr' ? 'Giriş yapın →' : 'Log in here →'}
              </Link>
            </p>
          </div>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-3xl max-h-3xl bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none" />
        </div>
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
