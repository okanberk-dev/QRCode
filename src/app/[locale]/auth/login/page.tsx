import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';
import { Shield, Star } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt } from '@/lib/auth';

import BuazeLogo from '@/components/marketing/BuazeLogo';

export const dynamic = 'force-dynamic';

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


export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  
  // Auth check: Redirect to dashboard if already logged in
  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (token) {
    const payload = await verifyJwt(token);
    if (payload && typeof payload.userId === 'string') {
      redirect(`/${locale}/dashboard`);
    }
  }

  const t = getTranslations(locale);

  const stats = [
    { val: '1,284', label: locale === 'tr' ? 'İşlenen Geri Bildirim' : 'Processed Feedback' },
    { val: '4.8', label: locale === 'tr' ? 'İtibar Gücü' : 'Reputation Score' },
    { val: '847', label: locale === 'tr' ? 'Digital Yayılım' : 'Digital Reach' },
    { val: '14', label: locale === 'tr' ? 'Aktif Portföy' : 'Active Portfolio' },
  ];

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col font-sans">
      <MarketingNavbar locale={locale} t={t} />

      <main className="flex-1 flex pt-[64px]">
        {/* Left Panel */}
        <div className="hidden lg:flex w-[44%] bg-[#1A2332] text-white flex-col justify-center px-12 xl:px-16 py-16 relative overflow-hidden">
          <div className="relative z-10 max-w-[400px]">
            <Link href={`/${locale}`} className="inline-flex items-center gap-3 mb-10 group">
              <BuazeLogo size={48} variant="on-dark" />
              <span className="text-[24px] font-extrabold tracking-[-0.02em] text-white">
                buaze<span className="text-[#F4B400]">.</span>
              </span>
            </Link>
            <h2 className="text-[32px] font-extrabold leading-[1.15] tracking-[-0.03em] mb-4">
              {locale === 'tr' ? 'İtibarınız sizi bekliyor' : 'Your reputation is waiting'}
            </h2>
            <p className="text-[14px] text-[#E8ECF2] leading-relaxed mb-10 font-medium">
              {locale === 'tr'
                ? 'Geri bildirim operasyonlarınızı anlık takip edin, marka itibarınızı profesyonelce yönetin ve güvenle büyüyün.'
                : 'Monitor your feedback operations in real-time, manage your brand reputation professionally, and grow with confidence.'}
            </p>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 mb-10">
              {stats.map(stat => (
                <div key={stat.label} className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm">
                  <div className="text-[24px] font-black text-[#F4B400] flex items-center gap-1.5">
                    {stat.val}
                    {(stat.label.includes('Puan') || stat.label.includes('Rating') || stat.label.includes('Score') || stat.label.includes('Gücü')) ? (
                      <Star size={16} className="fill-[#F4B400] text-[#F4B400]" />
                    ) : null}
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.1em] text-white/70 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2.5 text-white/75 text-[12px] font-bold bg-white/5 py-4 px-5 rounded-2xl border border-white/5">
              <Shield size={16} className="text-green-500 flex-shrink-0" />
              {locale === 'tr' ? 'KVKK uyumlu · Endüstriyel şifreleme' : 'GDPR compliant · Industry-standard encryption'}
            </div>
          </div>

          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F4B400]/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#F4B400]/5 blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none" />
        </div>

        {/* Right Panel - Form */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 bg-[#F8F6F1]">
          
          {/* Header/Logo for mobile */}
          <div className="flex lg:hidden justify-center mb-8">
            <Link href="/" className="flex items-center gap-3 group">
              <BuazeLogo size={36} variant="default" />
              <span className="text-2xl font-black tracking-tighter text-[#1A2332]">buaze<span className="text-[#F4B400]">.</span></span>
            </Link>
          </div>

          <div className="w-full max-w-sm mx-auto">
            <div className="bg-white rounded-[28px] border border-[#E8ECF2] p-8 sm:p-10 mb-5 shadow-md">
              <div className="mb-8 text-center lg:text-left">
                <h1 className="text-[28px] font-extrabold text-[#1A2332] tracking-tight leading-tight">{t.auth_login_title}</h1>
                <p className="text-[13px] font-bold text-[#2A3444] mt-2">{t.auth_login_subtitle}</p>
              </div>

              <Suspense fallback={<div className="h-52 animate-pulse bg-[#F8F6F1] rounded-lg" />}>
                <LoginForm locale={locale} t={t} />
              </Suspense>
            </div>

            <div className="text-center mt-8">
              <p className="text-[13px] font-black text-[#2A3444]">
                {locale === 'tr' ? 'Hesabınız yok mu?' : "Don't have an account?"}
              </p>
              <Link
                href={`/${locale}/auth/register`}
                 className="inline-flex items-center gap-2 text-[14px] font-black text-[#F4B400] hover:text-[#1A2332] mt-2 transition-colors border-b-2 border-transparent hover:border-[#1A2332]/30 pb-1"
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
