import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import { getTranslations } from '@/lib/translations';
import { Suspense } from 'react';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Şifreyi Sıfırla — Buaze' : 'Reset Password — Buaze',
    robots: { index: false, follow: false },
  };
}

export function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
}

export default async function ResetPasswordPage({
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
                {locale === 'tr' ? 'Şifreyi Sıfırla' : 'Reset Password'}
              </h1>
              <p className="text-[13px] text-[#6b6760] mt-1 leading-relaxed">
                {locale === 'tr'
                  ? 'E-postanıza gönderilen 6 haneli kodu ve yeni şifrenizi girin.'
                  : 'Enter the 6-digit code from your email and your new password.'}
              </p>
            </div>

            <Suspense fallback={<div className="h-52 animate-pulse bg-[#F7F4F0] rounded-lg" />}>
              <ResetPasswordForm locale={locale} />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
