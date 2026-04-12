import type { Metadata } from 'next';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { Suspense } from 'react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';

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
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <MarketingNavbar locale={locale} t={t} />

      <main className="flex-1 flex pt-[72px]">
        {/* Left Panel - Hidden on mobile */}
        <div className="hidden lg:flex w-[45%] bg-[#111827] text-white flex-col justify-center p-16 relative overflow-hidden">
          <div className="relative z-10 max-w-lg">
            <h2 className="text-4xl font-black leading-tight mb-6">
              {locale === 'tr'
                ? 'İtibarınız sizi bekliyor'
                : 'Your reputation is waiting'}
            </h2>
            <p className="text-gray-400 font-medium text-lg leading-relaxed mb-12">
              {locale === 'tr'
                ? 'Geri bildirimlerinizi izleyin, Google puanınızı takip edin ve işletmenizi güvenle büyütün.'
                : 'Monitor your feedback, track your Google rating, and grow your business with confidence.'}
            </p>

            <div className="grid grid-cols-2 gap-4">
              {[
                { val: '1,284', label: locale === 'tr' ? 'Toplam Yorum' : 'Total Reviews' },
                { val: '4.8 ★', label: locale === 'tr' ? 'Ort. Puan' : 'Avg. Rating' },
                { val: '847', label: locale === 'tr' ? 'Google\'a Yönlendirme' : 'Google Redirects' },
                { val: '14', label: locale === 'tr' ? 'Aktif Restoran' : 'Active Restaurants' },
              ].map(stat => (
                <div key={stat.label} className="bg-[#1f2937] rounded-2xl p-5 border border-gray-800">
                  <div className="text-2xl font-black text-[#FDBF1D]">{stat.val}</div>
                  <div className="text-xs font-bold text-gray-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
            
            <div className="flex items-center gap-3 text-gray-500 text-xs font-bold mt-12 bg-white/5 py-3 px-4 rounded-xl inline-flex">
              <Shield size={16} className="text-green-500" />
              {locale === 'tr' ? 'KVKK uyumlu & Endüstriyel Şifreleme' : 'GDPR compliant & Industry-standard Encryption'}
            </div>
          </div>
          
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#FDBF1D]/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Right Panel - Form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
          <div className="w-full max-w-md relative z-10">
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 sm:p-10 mb-6">
              <div className="mb-8 space-y-2 text-center lg:text-left">
                <h1 className="text-3xl font-black text-[#111827]">{t.auth_login_title}</h1>
                <p className="text-gray-500 font-medium">{t.auth_login_subtitle}</p>
              </div>

              <Suspense fallback={<div className="h-64 animate-pulse bg-gray-50 rounded-xl" />}>
                <LoginForm locale={locale} t={t} />
              </Suspense>
            </div>

            <p className="text-center text-sm font-medium text-gray-500">
              {locale === 'tr' ? 'Hesabınız yok mu?' : "Don't have an account?"}{' '}
              <Link href={`/${locale}/auth/register`} className="text-[#111827] font-black hover:text-[#FDBF1D] hover:underline transition-all">
                {locale === 'tr' ? '14 gün ücretsiz dene →' : 'Try free for 14 days →'}
              </Link>
            </p>
          </div>
          
          {/* Subtle background decoration for form side */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-3xl max-h-3xl bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none" />
        </div>
      </main>
      
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
