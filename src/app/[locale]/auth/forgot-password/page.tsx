import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import Link from 'next/link';
import BuazeLogo from '@/components/marketing/BuazeLogo';
import { getSiteSettings } from '@/lib/site-settings';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Şifremi Unuttum - Buaze' : 'Forgot Password - Buaze',
    robots: { index: false, follow: false },
  };
}

export const dynamic = 'force-dynamic';

export default async function ForgotPasswordPage({
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
            <>Şifrenizi<br />sıfırlayın.</>
          ) : (
            <>Reset<br />your password.</>
          )}
        </h1>
        <p className="mt-2.5 text-[13px] text-[#737373] leading-relaxed">
          {isTr
            ? 'E-posta adresinizi girin, sıfırlama bağlantısı gönderelim.'
            : 'Enter your email and we will send you a reset link.'}
        </p>

        <div className="mt-7">
          <ForgotPasswordForm locale={locale} />
        </div>
      </div>
    </div>
  );
}
