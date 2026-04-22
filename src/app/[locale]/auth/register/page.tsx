import type { Metadata } from 'next';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import RegisterForm from '@/components/auth/RegisterForm';
import Link from 'next/link';
import { CheckCircle2, Shield } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt } from '@/lib/auth';
import { getSiteSettings } from '@/lib/site-settings';

import BuazeLogo from '@/components/marketing/BuazeLogo';

export const dynamic = 'force-dynamic';

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


export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  // Auth check: Redirect to dashboard if already logged in
  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (token) {
    const payload = await verifyJwt(token);
    if (payload && typeof payload.userId === 'string') {
      redirect(`/${locale}/dashboard`);
    }
  }

  const t = getTranslations(locale);
  const { logoUrl } = await getSiteSettings();

  const trialFeatures = locale === 'tr'
    ? ['Sınırsız QR Tarama', 'Dahili Geri Bildirim Sistemi', 'Yönetici Paneli', 'Kredi kartı gerekmez']
    : ['Unlimited QR Scans', 'Internal Feedback System', 'Admin Dashboard', 'No credit card required'];

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col font-sans">
      <MarketingNavbar locale={locale} t={t} />

      <main className="flex-1 flex pt-[64px]">
        {/* Left Panel - Hidden on mobile */}
        <div className="hidden lg:flex w-[44%] bg-[#1A2332] text-white flex-col justify-center px-12 xl:px-16 py-16 relative overflow-hidden">
          <div className="relative z-10 max-w-lg">
            <Link href={`/${locale}`} className="inline-flex items-center gap-3 mb-10 group">
              <BuazeLogo size={48} variant="on-dark" imageUrl={logoUrl} />
              <span className="text-[24px] font-extrabold tracking-[-0.02em] text-white">
                buaze<span className="text-[#F4B400]">.</span>
              </span>
            </Link>
            <div className="inline-flex items-center gap-2 bg-[#F4B400]/10 border border-[#F4B400]/30 text-[#F4B400] px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
              ✦ {t.auth_trial_badge}
            </div>
            
            <h2 className="text-[36px] font-extrabold leading-[1.1] mb-6 tracking-tighter">
              {locale === 'tr'
                ? 'İtibarınızı büyütmeye bugün başlayın'
                : 'Start growing your reputation today'}
            </h2>
            <p className="text-[#E8ECF2] font-medium text-[16px] leading-relaxed mb-10">
              {locale === 'tr'
                ? '14 gün boyunca tüm özellikleri ücretsiz kullanın. Dilediğiniz zaman iptal edin.'
                : 'Use all features free for 14 days. Cancel anytime.'}
            </p>

            <ul className="space-y-3.5 bg-white/5 p-7 rounded-[24px] border border-white/10 backdrop-blur-sm">
              {trialFeatures.map(feat => (
                <li key={feat} className="flex items-center gap-3 font-bold text-white/90 text-sm">
                  <div className="w-6 h-6 rounded-lg bg-[#F4B400] flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={14} className="text-[#1A2332]" />
                  </div>
                  {feat}
                </li>
              ))}
            </ul>
            
            <div className="flex items-center gap-3 text-white/70 text-[11px] font-bold mt-12 bg-white/5 py-4 px-5 rounded-2xl border border-white/5 inline-flex">
              <Shield size={16} className="text-green-500" />
              {locale === 'tr' ? 'KVKK uyumlu & Endüstriyel Şifreleme' : 'GDPR compliant & Industry-standard Encryption'}
            </div>
          </div>

          {/* Decoration */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#F4B400]/10 blur-[130px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Right Panel - Form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative bg-[#F8F6F1]">
          <div className="w-full max-w-md relative z-10">
            <div className="bg-white rounded-[32px] shadow-md border border-[#E8ECF2] p-8 sm:p-10 mb-8">
              <div className="mb-8 space-y-3 text-center lg:text-left">
                <div className="inline-flex lg:hidden items-center gap-2 bg-[#F4B400]/10 text-[#F4B400] px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 border border-[#F4B400]/20">
                  ✦ {t.auth_trial_badge} - {t.auth_no_cc}
                </div>
                <h1 className="text-3xl font-extrabold text-[#1A2332] tracking-tighter">{t.auth_register_title}</h1>
                <p className="text-[#2A3444] font-bold text-sm">{t.auth_register_subtitle}</p>
              </div>

              <RegisterForm locale={locale} t={t} />
            </div>
            
            <p className="text-center text-sm font-medium text-[#6B7280]">
              {locale === 'tr' ? 'Zaten hesabınız var mı?' : "Already have an account?"}{' '}
              <Link href={`/${locale}/auth/login`} className="text-[#1A2332] font-black hover:text-[#F4B400] hover:underline transition-all">
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
