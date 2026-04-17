import type { Metadata } from 'next';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';
import { Shield, Star } from 'lucide-react';
import { Suspense } from 'react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';

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

  const stats = [
    { val: '1,284', label: locale === 'tr' ? 'Toplam Yorum' : 'Total Reviews' },
    { val: '4.8', label: locale === 'tr' ? 'Ort. Puan' : 'Avg. Rating' },
    { val: '847', label: locale === 'tr' ? 'Google Yönlendirme' : 'Google Redirects' },
    { val: '14', label: locale === 'tr' ? 'Aktif Restoran' : 'Active Restaurants' },
  ];

  return (
    <div className="min-h-screen bg-[#FCFBF7] flex flex-col font-sans">
      <MarketingNavbar locale={locale} t={t} />

      <main className="flex-1 flex pt-[64px]">
        {/* Left Panel */}
        <div className="hidden lg:flex w-[44%] bg-[#1f1e1d] text-white flex-col justify-center px-12 xl:px-16 py-16 relative overflow-hidden">
          <div className="relative z-10 max-w-[400px]">
            <h2 className="text-[32px] font-extrabold leading-[1.15] tracking-[-0.02em] mb-4">
              {locale === 'tr' ? 'İtibarınız sizi bekliyor' : 'Your reputation is waiting'}
            </h2>
            <p className="text-[14px] text-[#6b6760] leading-relaxed mb-10">
              {locale === 'tr'
                ? 'Geri bildirimlerinizi izleyin, Google puanınızı takip edin ve işletmenizi güvenle büyütün.'
                : 'Monitor your feedback, track your Google rating, and grow your business with confidence.'}
            </p>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 mb-10">
              {stats.map(stat => (
                <div key={stat.label} className="bg-[#2e2a25] rounded-xl p-4 border border-[#3d3a36]">
                  <div className="text-[22px] font-extrabold text-[#FDBF1D] flex items-center gap-1">
                    {stat.val}
                    {stat.label.includes('Puan') || stat.label.includes('Rating') ? (
                      <Star size={14} className="fill-[#FDBF1D] text-[#FDBF1D]" />
                    ) : null}
                  </div>
                  <div className="text-[11px] font-medium text-[#6b6760] mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2.5 text-[#6b6760] text-[12px] font-medium bg-white/5 py-3 px-4 rounded-lg">
              <Shield size={14} className="text-green-500 flex-shrink-0" />
              {locale === 'tr' ? 'KVKK uyumlu · Endüstriyel şifreleme' : 'GDPR compliant · Industry-standard encryption'}
            </div>
          </div>

          <div className="absolute top-0 right-0 w-72 h-72 bg-[#FDBF1D]/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#FDBF1D]/5 blur-[80px] rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none" />
        </div>

        {/* Right Panel - Form */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 bg-[#FCFBF7]">
          
          {/* Header/Logo for mobile */}
          <div className="flex lg:hidden justify-center mb-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-[#111827] border-2 border-[#1f1e1d] shadow-[0_4px_0_0_#1f1e1d] group-hover:translate-y-0.5 group-hover:shadow-[0_2px_0_0_#1f1e1d] transition-all">
                <span className="text-[#FDBF1D] font-black text-xl leading-none">B</span>
              </div>
              <span className="text-2xl font-black tracking-tight text-[#111827]">Buaze</span>
            </Link>
          </div>

          <div className="w-full max-w-sm mx-auto">
            <div className="bg-white rounded-[32px] border-[3px] border-[#1f1e1d] p-8 sm:p-10 mb-5 shadow-[12px_14px_0_0_#1f1e1d]">
              <div className="mb-8 text-center lg:text-left">
                <h1 className="text-[28px] font-black text-[#1f1e1d] tracking-tight leading-tight">{t.auth_login_title}</h1>
                <p className="text-[13px] font-bold text-[#6b6760] mt-2">{t.auth_login_subtitle}</p>
              </div>

              <Suspense fallback={<div className="h-52 animate-pulse bg-[#F7F4F0] rounded-lg" />}>
                <LoginForm locale={locale} t={t} />
              </Suspense>
            </div>

            <div className="text-center mt-8">
              <p className="text-[13px] font-black text-[#6b6760]">
                {locale === 'tr' ? 'Hesabınız yok mu?' : "Don't have an account?"}
              </p>
              <Link
                href={`/${locale}/auth/register`}
                 className="inline-flex items-center gap-2 text-[14px] font-black text-[#ea580c] hover:text-[#111827] mt-2 transition-colors border-b-2 border-transparent hover:border-[#111827]/30 pb-1"
               >
                 {locale === 'tr' ? '14 gün ücretsiz dene →' : 'Try free for 14 days →'}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
