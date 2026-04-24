import type { Metadata } from 'next';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import RegisterForm from '@/components/auth/RegisterForm';
import Link from 'next/link';
import { Check } from 'lucide-react';
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

  const benefits = locale === 'tr'
    ? ['5 dakikada kurulum', 'Kredi kartı gerekmez', 'İstediğin zaman iptal et', 'Türkçe destek']
    : ['5-minute setup', 'No credit card required', 'Cancel anytime', 'Turkish support'];

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex flex-col font-sans">
      <MarketingNavbar locale={locale} t={t} />

      <main className="flex flex-1 flex-col pt-[64px] lg:min-h-[calc(100dvh-64px)] lg:grid lg:grid-cols-2">
        {/* LEFT Panel — Form (white) */}
        <div className="relative flex flex-1 items-center justify-center bg-white px-5 py-10 sm:px-8 sm:py-14 lg:px-16 lg:py-16">
          <div className="flex w-full max-w-md flex-col">
            <Link href={`/${locale}`} className="mb-10 inline-flex items-center gap-2.5 self-start group">
              <BuazeLogo size={36} imageUrl={logoUrl} />
              <span
                className="text-[20px] font-medium tracking-[-0.03em] text-[#0A0A0A]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                buaze<span className="text-[#C6F24E]">.</span>
              </span>
            </Link>

            <div className="mb-8 space-y-3">
              <h1
                className="text-[32px] sm:text-[38px] font-medium leading-none tracking-[-0.03em] text-[#0A0A0A]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {t.auth_register_title}
              </h1>
              <p className="text-[14px] text-[#737373]">
                {locale === 'tr' ? 'Kredi kartı gerekmez. 2 dakikada başla.' : 'No credit card. Start in 2 minutes.'}
              </p>
            </div>

            <RegisterForm locale={locale} t={t} />

            <p className="mt-6 text-center text-[13px] text-[#737373] lg:text-left">
              {locale === 'tr' ? 'Hesabın var mı?' : 'Already have an account?'}{' '}
              <Link href={`/${locale}/auth/login`} className="font-semibold text-[#0A0A0A] hover:text-[#A8D62E] transition-colors">
                {locale === 'tr' ? 'Giriş yap' : 'Sign in'}
              </Link>
            </p>
          </div>
        </div>

        {/* RIGHT Panel — Lime hero */}
        <div className="relative flex min-h-[420px] flex-col justify-between bg-[#C6F24E] px-5 py-12 sm:px-8 sm:py-14 lg:px-14 lg:py-16">
          <div className="inline-flex items-center gap-2 self-start">
            <BuazeLogo size={32} variant="on-lime" imageUrl={logoUrl} />
            <span
              className="text-[18px] font-medium tracking-[-0.03em] text-[#0A0A0A]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              buaze<span>.</span>
            </span>
          </div>

          <div className="max-w-lg">
            <span className="pulse-eyebrow mb-5 inline-block text-[#0A0A0A]">
              {locale === 'tr' ? '14 GÜN ÜCRETSİZ' : '14 DAYS FREE'}
            </span>
            <h2
              className="text-[44px] sm:text-[56px] lg:text-[68px] font-medium leading-[0.95] tracking-[-0.035em] text-[#0A0A0A]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {locale === 'tr' ? (
                <>
                  Nabzını
                  <br />
                  duymaya
                  <br />
                  başla.
                </>
              ) : (
                <>
                  Start listening
                  <br />
                  to your
                  <br />
                  pulse.
                </>
              )}
            </h2>

            <ul className="mt-8 space-y-2.5">
              {benefits.map((feat) => (
                <li key={feat} className="flex items-center gap-2.5 text-[14px] font-medium text-[#0A0A0A]">
                  <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#0A0A0A] text-[#C6F24E]">
                    <Check size={11} strokeWidth={3} />
                  </span>
                  {feat}
                </li>
              ))}
            </ul>
          </div>

          <p className="pulse-eyebrow text-[#0A0A0A]/60">© {new Date().getFullYear()} BUAZE</p>
        </div>
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
