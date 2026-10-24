import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyUserTokenForLayout } from '@/lib/auth';
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
    title: locale === 'tr' ? 'Giriş Yap' : 'Log In',
    description: locale === 'tr'
      ? 'Buaze hesabınıza giriş yapın ve işletmenizin itibarını yönetmeye devam edin.'
      : 'Log in to your Buaze account and keep managing your business\'s reputation.',
    robots: { index: false, follow: false },
  };
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  // Auth check: Redirect to dashboard if already logged in.
  // §38.189 hotfix — must match dashboard layout's `verifyUserTokenForLayout`
  // (UserSession revoke + tier matrix). Bare `verifyJwt` here caused a redirect
  // loop: dashboard layout rejected revoked sessions → /auth/login → login
  // saw a signature-valid token → /dashboard → loop. Parity restored.
  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (token) {
    const payload = await verifyUserTokenForLayout(token);
    if (payload && typeof payload.userId === 'string') {
      redirect(`/${locale}/dashboard`);
    }
  }

  const t = getTranslations(locale);
  const { logoUrl } = await getSiteSettings();
  const isTr = locale === 'tr';

  const bottomStats = [
    { k: '10', l: isTr ? 'yorum platformu' : 'review platforms' },
    { k: 'TR + EN', l: isTr ? 'ürün dili' : 'product languages' },
    { k: '<5dk', l: isTr ? 'kurulum' : 'setup' },
  ];

  return (
    <div className="min-h-screen bg-white font-sans lg:grid lg:grid-cols-2">
      {/* LEFT — Form */}
      <div className="flex min-h-screen flex-col justify-between bg-white px-6 py-10 sm:px-10 sm:py-12 lg:px-16 lg:py-12">
        <Link href={`/${locale}`} className="inline-flex items-center gap-2 self-start group">
          <BuazeLogo size={32} imageUrl={logoUrl} />
          <span
            className="text-[20px] font-medium tracking-[-0.03em] text-[#0A0A0A]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            buaze<span className="text-[#C6F24E]">.</span>
          </span>
        </Link>

        <div className="mx-auto w-full max-w-[400px] py-10">
          <h1
            className="text-[32px] sm:text-[42px] font-medium leading-[1.02] tracking-[-0.03em] text-[#0A0A0A]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {isTr ? (
              <>Tekrar<br />hoş geldin.</>
            ) : (
              <>Welcome<br />back.</>
            )}
          </h1>
          <p className="mt-2.5 text-[14px] text-[#737373]">
            {isTr ? 'Panele giriş yap ve nabzını dinle.' : 'Sign in to your panel and feel the pulse.'}
          </p>

          <div className="mt-8">
            {/* Structural fallback — matches LoginForm geometry (gap-3.5 flex
                col: Google CTA + OR divider + 2 input groups + submit + reCAPTCHA
                line). Previously `h-80 animate-pulse` undersized the form by
                ~140px and caused a visible jump on hydration. */}
            <Suspense fallback={
              <div className="flex flex-col gap-3.5">
                <div className="bz-skeleton w-full h-12 rounded-[10px]" />
                <div className="flex items-center gap-2.5 my-1">
                  <div className="flex-1 h-px bg-[#EDEDED]" />
                  <span className="pulse-eyebrow text-[#A3A3A3]">{locale === 'tr' ? 'YA DA' : 'OR'}</span>
                  <div className="flex-1 h-px bg-[#EDEDED]" />
                </div>
                <div className="space-y-2">
                  <div className="bz-skeleton h-[10px] w-16 rounded-sm" />
                  <div className="bz-skeleton w-full h-12 rounded-[10px]" />
                </div>
                <div className="space-y-2">
                  <div className="bz-skeleton h-[10px] w-20 rounded-sm" />
                  <div className="bz-skeleton w-full h-12 rounded-[10px]" />
                </div>
                <div className="bz-skeleton w-full h-12 rounded-full mt-2" />
                <div className="bz-skeleton h-[11px] w-3/4 rounded mx-auto mt-1" />
              </div>
            }>
              <LoginForm locale={locale} t={t} />
            </Suspense>
          </div>
        </div>

        <p className="pulse-eyebrow text-[#A3A3A3]">© {new Date().getFullYear()} BUAZE</p>
      </div>

      {/* RIGHT — Dark hero */}
      <div className="relative hidden lg:flex flex-col justify-between bg-[#0A0A0A] text-white px-12 xl:px-14 py-12 overflow-hidden">
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]">
          <defs>
            <pattern id="loginGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#FFFFFF" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#loginGrid)" />
        </svg>

        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#C6F24E]/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#C6F24E]/5 blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none" />

        <div className="relative z-10 inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full bg-[#C6F24E]/15 border border-[#C6F24E]/30">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C6F24E] pulse-heartbeat" />
          <span className="pulse-eyebrow text-[#C6F24E]">
            {isTr ? '340K+ YORUM' : '340K+ REVIEWS'}
          </span>
        </div>

        <div className="relative z-10 max-w-[520px]">
          <blockquote
            className="text-[40px] xl:text-[52px] font-medium leading-[0.95] tracking-[-0.03em] text-white"
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
              <div className="text-[14px] font-semibold text-white">Emre Kaya</div>
              <div className="text-[12px] text-white/60 mt-0.5">
                {isTr ? 'Kadıköy Bistro · Kurucu' : 'Kadıköy Bistro · Founder'}
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-end gap-10">
          {bottomStats.map((s) => (
            <div key={s.l}>
              <div
                className="text-[30px] font-medium text-white leading-none tracking-[-0.02em]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {s.k}
              </div>
              <div className="pulse-eyebrow text-white/60 mt-2">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
