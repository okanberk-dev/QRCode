import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
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
    title: locale === 'tr' ? 'Giriş Yap - Buaze' : 'Log In - Buaze',
    description: locale === 'tr'
      ? 'Buaze hesabınıza giriş yapın ve restoranınızın itibarını yönetmeye devam edin.'
      : 'Log in to your Buaze account and continue managing your restaurant\'s reputation.',
    robots: { index: false, follow: false },
  };
}


export default async function LoginPage({
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
  const isTr = locale === 'tr';

  const bottomStats = [
    { k: '2.400+', l: isTr ? 'işletme' : 'businesses' },
    { k: '4.9/5', l: isTr ? 'müşteri puanı' : 'customer score' },
    { k: '28', l: isTr ? 'ülke' : 'countries' },
  ];

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex flex-col font-sans">
      <MarketingNavbar locale={locale} t={t} />

      <main className="flex min-h-[calc(100dvh-64px)] flex-1 pt-[64px]">
        {/* Left Panel */}
        <div className="hidden lg:flex w-[44%] bg-[#0A0A0A] text-white flex-col justify-between px-12 xl:px-16 py-16 relative overflow-hidden">
          {/* Grid overlay */}
          <svg aria-hidden className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.08]">
            <defs>
              <pattern id="loginGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#FFFFFF" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#loginGrid)" />
          </svg>

          <div className="relative z-10 flex items-start justify-between">
            <Link href={`/${locale}`} className="inline-flex items-center gap-3 group">
              <BuazeLogo size={36} variant="on-dark" imageUrl={logoUrl} />
              <span
                className="text-[20px] font-medium tracking-[-0.03em] text-white"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                buaze<span className="text-[#C6F24E]">.</span>
              </span>
            </Link>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#C6F24E]/15 border border-[#C6F24E]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C6F24E] pulse-heartbeat" />
              <span className="pulse-eyebrow text-[#C6F24E]">
                {isTr ? 'CANLI · 340K+ YORUM' : 'LIVE · 340K+ REVIEWS'}
              </span>
            </div>
          </div>

          <div className="relative z-10 max-w-[460px]">
            <blockquote
              className="text-[36px] xl:text-[44px] font-medium leading-[1.05] tracking-[-0.03em] text-white"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {isTr
                ? '"İlk ay içinde Google ortalamamız 4.2\'den 4.8\'e çıktı."'
                : '"Within the first month, our Google average climbed from 4.2 to 4.8."'}
            </blockquote>
            <div className="mt-6 flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-full bg-[#C6F24E] text-[#0A0A0A] flex items-center justify-center text-[14px] font-semibold"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                EK
              </div>
              <div>
                <div className="text-[14px] font-medium text-white">Emre Kaya</div>
                <div className="pulse-eyebrow text-white/60 mt-0.5">
                  {isTr ? 'Kadıköy Bistro · Kurucu' : 'Kadıköy Bistro · Founder'}
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-8">
              {bottomStats.map((s) => (
                <div key={s.l}>
                  <div
                    className="text-[26px] font-medium text-white leading-none tracking-[-0.02em]"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {s.k}
                  </div>
                  <div className="pulse-eyebrow text-white/60 mt-2">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2.5 text-white/70 text-[12px] font-medium">
              <Shield size={14} className="text-[#C6F24E] flex-shrink-0" />
              {isTr ? 'KVKK uyumlu · Endüstriyel şifreleme' : 'GDPR compliant · Industry-standard encryption'}
            </div>
          </div>

          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#C6F24E]/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#C6F24E]/5 blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none" />
        </div>

        {/* Right Panel - Form */}
        <div className="flex-1 flex flex-col items-center justify-center bg-[#FFFFFF] p-4 sm:p-8 lg:p-10">

          {/* Header/Logo for mobile */}
          <div className="flex lg:hidden justify-center mb-8">
            <Link href={`/${locale}`} className="flex items-center gap-3 group">
              <BuazeLogo size={36} variant="default" imageUrl={logoUrl} />
              <span
                className="text-[22px] font-medium tracking-[-0.03em] text-[#0A0A0A]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                buaze<span className="text-[#C6F24E]">.</span>
              </span>
            </Link>
          </div>

          <div className="w-full max-w-sm mx-auto">
            <div className="mb-5 rounded-3xl border border-[#EDEDED] bg-white p-6 shadow-[0_8px_24px_rgba(10,10,10,0.04)] sm:p-10">
              <div className="mb-8 text-center lg:text-left">
                <h1 className="text-[28px] text-[#0A0A0A] tracking-[-0.02em] leading-tight">{t.auth_login_title}</h1>
                <p className="text-[14px] text-[#525252] mt-2">{t.auth_login_subtitle}</p>
              </div>

              <Suspense fallback={<div className="h-52 animate-pulse bg-[#FFFFFF] rounded-lg" />}>
                <LoginForm locale={locale} t={t} />
              </Suspense>
            </div>

            <div className="text-center mt-8">
              <p className="text-[13px] text-[#525252]">
                {locale === 'tr' ? 'Hesabınız yok mu?' : "Don't have an account?"}
              </p>
              <Link
                href={`/${locale}/auth/register`}
                className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#0A0A0A] hover:text-[#A8D62E] mt-2 transition-colors"
              >
                {locale === 'tr' ? '14 gün ücretsiz dene' : 'Try free for 14 days'}
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
