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
    ? ['5 dakikada kurulum', 'Kredi kartı gerekmez', 'İstediğin zaman iptal et']
    : ['5-minute setup', 'No credit card required', 'Cancel anytime'];

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex flex-col font-sans">
      <MarketingNavbar locale={locale} t={t} />

      <main className="flex min-h-[calc(100dvh-64px)] flex-1 pt-[64px]">
        {/* Left Panel - Hidden on mobile */}
        <div className="hidden lg:flex w-[44%] bg-[#0A0A0A] text-white flex-col justify-center px-12 xl:px-16 py-16 relative overflow-hidden">
          <div className="relative z-10 max-w-lg">
            <Link href={`/${locale}`} className="inline-flex items-center gap-3 mb-10 group">
              <BuazeLogo size={48} variant="on-dark" imageUrl={logoUrl} />
              <span
                className="text-[22px] font-medium tracking-[-0.03em] text-white"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                buaze<span className="text-[#C6F24E]">.</span>
              </span>
            </Link>
            <div className="inline-flex items-center gap-2 bg-[#EAF9B8] border border-[#C6F24E] text-[#0A0A0A] px-4 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A] pulse-heartbeat" />
              <span className="pulse-eyebrow text-[#0A0A0A]">{t.auth_trial_badge}</span>
            </div>

            <h2 className="text-[48px] xl:text-[60px] leading-[0.95] mb-6 tracking-[-0.035em] text-white">
              {locale === 'tr' ? (
                <>
                  Nabzını
                  <br />
                  duymaya
                  <br />
                  <span className="text-[#C6F24E]">başla.</span>
                </>
              ) : (
                <>
                  Start listening
                  <br />
                  to your
                  <br />
                  <span className="text-[#C6F24E]">pulse.</span>
                </>
              )}
            </h2>
            <p className="text-white/70 text-[16px] leading-[1.6] mb-10">
              {locale === 'tr'
                ? '14 gün boyunca tüm özellikleri ücretsiz kullanın. Dilediğiniz zaman iptal edin.'
                : 'Use all features free for 14 days. Cancel anytime.'}
            </p>

            <ul className="space-y-3.5 bg-white/5 p-7 rounded-2xl border border-white/10">
              {trialFeatures.map(feat => (
                <li key={feat} className="flex items-center gap-3 font-medium text-white/90 text-sm">
                  <div className="w-6 h-6 rounded-full bg-[#C6F24E] flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={14} className="text-[#0A0A0A]" />
                  </div>
                  {feat}
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-3 text-white/70 text-[12px] font-medium mt-12 bg-white/5 py-4 px-5 rounded-2xl border border-white/10 inline-flex">
              <Shield size={16} className="text-[#C6F24E]" />
              {locale === 'tr' ? 'KVKK uyumlu & Endüstriyel Şifreleme' : 'GDPR compliant & Industry-standard Encryption'}
            </div>
          </div>

          {/* Decoration */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#C6F24E]/10 blur-[130px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Right Panel - Form */}
        <div className="relative flex flex-1 items-center justify-center bg-[#FFFFFF] p-4 sm:p-6 lg:p-12">
          <div className="w-full max-w-md relative z-10">
            <div className="mb-8 rounded-3xl border border-[#EDEDED] bg-white p-6 shadow-[0_8px_24px_rgba(10,10,10,0.04)] sm:p-10">
              <div className="mb-8 space-y-3 text-center lg:text-left">
                <div className="inline-flex lg:hidden items-center gap-2 bg-[#EAF9B8] text-[#0A0A0A] px-3 py-1.5 rounded-full mb-2 border border-[#C6F24E]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A] pulse-heartbeat" />
                  <span className="pulse-eyebrow">{t.auth_trial_badge} · {t.auth_no_cc}</span>
                </div>
                <h1 className="text-[32px] text-[#0A0A0A] tracking-[-0.025em] leading-tight">{t.auth_register_title}</h1>
                <p className="text-[#525252] text-[14px]">{t.auth_register_subtitle}</p>
              </div>

              <RegisterForm locale={locale} t={t} />
            </div>

            <p className="text-center text-sm text-[#525252]">
              {locale === 'tr' ? 'Zaten hesabınız var mı?' : "Already have an account?"}{' '}
              <Link href={`/${locale}/auth/login`} className="text-[#0A0A0A] font-medium hover:text-[#A8D62E] transition-colors">
                {locale === 'tr' ? 'Giriş yapın →' : 'Log in here →'}
              </Link>
            </p>
          </div>
        </div>
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
