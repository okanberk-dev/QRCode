import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import { getTranslations } from '@/lib/translations';

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
  const t = getTranslations(locale);

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex flex-col font-sans">
      <MarketingNavbar locale={locale} t={t} />

      <main className="flex-1 flex items-center justify-center p-6 sm:p-10 pt-[80px]">
        <div className="w-full max-w-[440px]">
          <Link
            href={`/${locale}/auth/login`}
            className="pulse-eyebrow inline-flex items-center gap-2 text-[#737373] hover:text-[#0A0A0A] mb-5 transition-colors"
          >
            <ArrowLeft size={14} strokeWidth={2} />
            {locale === 'tr' ? 'GİRİŞE DÖN' : 'BACK TO LOGIN'}
          </Link>

          <div className="bg-white rounded-3xl border border-[#EDEDED] p-8 sm:p-9 shadow-[0_8px_24px_rgba(10,10,10,0.04)]">
            <div className="mb-7">
              <h1 className="text-[26px] text-[#0A0A0A] tracking-[-0.02em] leading-tight">
                {locale === 'tr' ? 'Şifremi Unuttum' : 'Forgot Password'}
              </h1>
              <p className="text-[14px] text-[#525252] mt-2 leading-relaxed">
                {locale === 'tr'
                  ? 'E-posta adresinizi girin, size 6 haneli bir sıfırlama kodu gönderelim.'
                  : 'Enter your email and we will send you a 6-digit reset code.'}
              </p>
            </div>

            <ForgotPasswordForm locale={locale} />
          </div>

          <p className="text-center text-[13px] text-[#525252] mt-5">
            {locale === 'tr' ? 'Şifrenizi hatırladınız mı?' : 'Remember your password?'}{' '}
            <Link
              href={`/${locale}/auth/login`}
              className="font-medium text-[#0A0A0A] hover:text-[#A8D62E] transition-colors"
            >
              {locale === 'tr' ? 'Giriş yapın' : 'Log in'}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
