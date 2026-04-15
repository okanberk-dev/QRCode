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
    title: locale === 'tr' ? 'Şifremi Unuttum — Buaze' : 'Forgot Password — Buaze',
    robots: { index: false, follow: false },
  };
}

export function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
}

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);

  return (
    <div className="min-h-screen bg-[#FCFBF7] flex flex-col font-sans">
      <MarketingNavbar locale={locale} t={t} />

      <main className="flex-1 flex items-center justify-center p-6 sm:p-10 pt-[80px]">
        <div className="w-full max-w-[440px]">
          <Link
            href={`/${locale}/auth/login`}
            className="inline-flex items-center gap-2 text-[12px] font-black uppercase tracking-widest text-[#6b6760] hover:text-[#111827] mb-5 transition-colors"
          >
            <ArrowLeft size={14} strokeWidth={3} />
            {locale === 'tr' ? 'Girişe Dön' : 'Back to Login'}
          </Link>

          <div className="bg-white rounded-2xl border border-[#e8e4de] p-8 sm:p-9 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)]">
            <div className="mb-7">
              <h1 className="text-[24px] font-extrabold text-[#1f1e1d] tracking-[-0.01em]">
                {locale === 'tr' ? 'Şifremi Unuttum' : 'Forgot Password'}
              </h1>
              <p className="text-[13px] text-[#6b6760] mt-1 leading-relaxed">
                {locale === 'tr'
                  ? 'E-posta adresinizi girin, size 6 haneli bir sıfırlama kodu gönderelim.'
                  : 'Enter your email and we will send you a 6-digit reset code.'}
              </p>
            </div>

            <ForgotPasswordForm locale={locale} />
          </div>

          <p className="text-center text-[13px] text-[#6b6760] mt-5">
            {locale === 'tr' ? 'Şifrenizi hatırladınız mı?' : 'Remember your password?'}{' '}
            <Link
              href={`/${locale}/auth/login`}
              className="font-semibold text-[#1f1e1d] hover:text-[#FDBF1D] transition-colors underline underline-offset-4 decoration-dotted decoration-[#ada89f] hover:decoration-[#FDBF1D]"
            >
              {locale === 'tr' ? 'Giriş yapın' : 'Log in'}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
