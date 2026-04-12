import type { Metadata } from 'next';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { Suspense } from 'react';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Giriş Yap — Buaze' : 'Log In — Buaze',
    description: locale === 'tr'
      ? 'Buaze hesabınıza giriş yapın ve restoranınızın itibarını yönetmeye devam edin.'
      : 'Log in to your Buaze account and continue managing your restaurant\'s reputation.',
    robots: { index: false, follow: false },
  };
}

export function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex">
      {/* Left Panel */}
      <div className="hidden lg:flex w-1/2 bg-[#111827] text-white flex-col justify-between p-16 relative overflow-hidden">
        <div className="relative z-10">
          <Link href={`/${locale}`} className="flex items-center gap-3 mb-20">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#FDBF1D]">
              <span className="text-[#111827] font-black text-xl leading-none">B</span>
            </div>
            <span className="text-2xl font-black tracking-tight">Buaze</span>
          </Link>

          <div className="space-y-8">
            <h2 className="text-4xl font-black leading-tight">
              {locale === 'tr'
                ? 'İtibarınız sizi bekliyor'
                : 'Your reputation is waiting for you'}
            </h2>
            <p className="text-gray-400 font-bold text-lg leading-relaxed">
              {locale === 'tr'
                ? 'Geri bildirimlerinizi izleyin, Google puanınızı takip edin ve işletmenizi büyütün.'
                : 'Monitor your feedback, track your Google rating, and grow your business.'}
            </p>

            {/* Decorative Stats */}
            <div className="grid grid-cols-2 gap-4 pt-8">
              {[
                { val: '1,284', label: locale === 'tr' ? 'Toplam Yorum' : 'Total Reviews' },
                { val: '4.8 ★', label: locale === 'tr' ? 'Ort. Puan' : 'Avg. Rating' },
                { val: '847', label: locale === 'tr' ? 'Google\'a Yönlendirme' : 'Google Redirects' },
                { val: '14', label: locale === 'tr' ? 'Aktif Restoran' : 'Active Restaurants' },
              ].map(stat => (
                <div key={stat.label} className="bg-white/5 rounded-2xl p-5 border border-white/10">
                  <div className="text-2xl font-black text-[#FDBF1D]">{stat.val}</div>
                  <div className="text-xs font-bold text-gray-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3 text-gray-500 text-xs font-bold">
          <Shield size={16} />
          {locale === 'tr' ? 'KVKK uyumlu & 256-bit şifreli' : 'GDPR compliant & 256-bit encrypted'}
        </div>

        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FDBF1D]/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#79C5D1]/5 blur-[80px] rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none" />
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <Link href={`/${locale}`} className="flex lg:hidden items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#111827]">
              <span className="text-[#FDBF1D] font-black text-lg leading-none">B</span>
            </div>
            <span className="text-xl font-black tracking-tight text-[#111827]">Buaze</span>
          </Link>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10">
            <div className="mb-8 space-y-2">
              <h1 className="text-3xl font-black text-[#111827]">{t.auth_login_title}</h1>
              <p className="text-gray-500 font-bold">{t.auth_login_subtitle}</p>
            </div>

            <Suspense fallback={<div className="h-64 animate-pulse bg-gray-50 rounded-xl" />}>
              <LoginForm locale={locale} t={t} />
            </Suspense>
          </div>

          <p className="text-center text-xs font-bold text-gray-400 mt-6">
            {locale === 'tr' ? 'Hesabınız yok mu?' : "Don't have an account?"}{' '}
            <Link href={`/${locale}/auth/register`} className="text-[#111827] font-black hover:text-[#FDBF1D]">
              {locale === 'tr' ? '14 gün ücretsiz dene →' : 'Try free for 14 days →'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
