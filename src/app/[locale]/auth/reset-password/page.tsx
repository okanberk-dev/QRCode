import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import Link from 'next/link';
import BuazeLogo from '@/components/marketing/BuazeLogo';
import { getSiteSettings } from '@/lib/site-settings';
import { Suspense } from 'react';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Şifreyi Sıfırla' : 'Reset Password',
    robots: { index: false, follow: false },
  };
}

export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const { logoUrl } = await getSiteSettings();
  const isTr = locale === 'tr';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] font-sans p-6 sm:p-8">
      <div className="w-full max-w-[420px] bg-white border border-[#EDEDED] rounded-[20px] p-8 sm:p-10 shadow-[0_8px_24px_rgba(10,10,10,0.04)]">
        <Link href={`/${locale}`} className="inline-flex items-center gap-2 mb-7 group">
          <BuazeLogo size={28} imageUrl={logoUrl} />
          <span
            className="text-[18px] font-medium tracking-[-0.03em] text-[#0A0A0A]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            buaze<span className="text-[#C6F24E]">.</span>
          </span>
        </Link>

        <h1
          className="text-[32px] font-medium leading-[1.1] tracking-[-0.025em] text-[#0A0A0A]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {isTr ? (
            <>Yeni şifre<br />belirle.</>
          ) : (
            <>Set a new<br />password.</>
          )}
        </h1>
        <p className="mt-2.5 text-[13px] text-[#737373] leading-relaxed">
          {isTr
            ? 'E-postanıza gönderilen 6 haneli kodu ve yeni şifrenizi girin.'
            : 'Enter the 6-digit code from your email and your new password.'}
        </p>

        <div className="mt-7">
          {/* Structural fallback — matches ResetPasswordForm geometry
              (space-y-5 form with: 6-digit code label+56px input, password
              label+44px input, 48px submit button, reCAPTCHA notice).
              Previously `h-52 animate-pulse` (208px) undersized the form by
              ~100px and caused a visible jump on hydration. */}
          <Suspense fallback={
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="bz-skeleton h-[10px] w-24 rounded-sm ml-1" />
                <div className="bz-skeleton w-full h-14 rounded-xl" />
              </div>
              <div className="space-y-2">
                <div className="bz-skeleton h-[10px] w-20 rounded-sm ml-1" />
                <div className="bz-skeleton w-full h-11 rounded-xl" />
              </div>
              <div className="bz-skeleton w-full h-12 rounded-full" />
              <div className="bz-skeleton h-[11px] w-3/4 rounded mx-auto mt-1" />
            </div>
          }>
            <ResetPasswordForm locale={locale} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
