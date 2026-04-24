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
    title: locale === 'tr' ? 'Şifreyi Sıfırla - Buaze' : 'Reset Password - Buaze',
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
          <Suspense fallback={<div className="h-52 animate-pulse bg-white rounded-lg" />}>
            <ResetPasswordForm locale={locale} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
