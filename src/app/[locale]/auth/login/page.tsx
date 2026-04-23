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
import { getSiteSettings } from '@/lib/site-settings';

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
  const { logoUrl } = await getSiteSettings();

  const stats = [
    { val: '1,284', label: locale === 'tr' ? 'İşlenen Geri Bildirim' : 'Processed Feedback' },
    { val: '4.8', label: locale === 'tr' ? 'İtibar Gücü' : 'Reputation Score' },
    { val: '847', label: locale === 'tr' ? 'Digital Yayılım' : 'Digital Reach' },
    { val: '14', label: locale === 'tr' ? 'Aktif Portföy' : 'Active Portfolio' },
  ];

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex flex-col font-sans">
      <MarketingNavbar locale={locale} t={t} />

      <main className="flex-1 flex pt-[64px]">
        {/* Left Panel */}
        <div className="hidden lg:flex w-[44%] bg-[#0A0A0A] text-white flex-col justify-center px-12 xl:px-16 py-16 relative overflow-hidden">
          <div className="relative z-10 max-w-[400px]">
            <Link href={`/${locale}`} className="inline-flex items-center gap-3 mb-10 group">
              <BuazeLogo size={48} variant="on-dark" imageUrl={logoUrl} />
              <span
                className="text-[22px] font-medium tracking-[-0.03em] text-white"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                buaze<span className="text-[#C6F24E]">.</span>
              </span>
            </Link>
            <h2 className="text-[36px] leading-[1.05] tracking-[-0.03em] mb-5 text-white">
              {locale === 'tr' ? 'İtibarınız sizi bekliyor.' : 'Your reputation is waiting.'}
            </h2>
            <p className="text-[15px] text-white/70 leading-[1.6] mb-10">
              {locale === 'tr'
                ? 'Geri bildirim operasyonlarınızı anlık takip edin, marka itibarınızı profesyonelce yönetin ve güvenle büyüyün.'
                : 'Monitor your feedback operations in real-time, manage your brand reputation professionally, and grow with confidence.'}
            </p>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 mb-10">
              {stats.map(stat => (
                <div key={stat.label} className="bg-white/5 rounded-2xl p-5 border border-white/10">
                  <div
                    className="text-[26px] font-medium text-[#C6F24E] flex items-center gap-1.5 tracking-[-0.02em]"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {stat.val}
                    {(stat.label.includes('Puan') || stat.label.includes('Rating') || stat.label.includes('Score') || stat.label.includes('Gücü')) ? (
                      <Star size={16} className="fill-[#C6F24E] text-[#C6F24E]" />
                    ) : null}
                  </div>
                  <div className="pulse-eyebrow text-white/60 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2.5 text-white/70 text-[12px] font-medium bg-white/5 py-4 px-5 rounded-2xl border border-white/10">
              <Shield size={16} className="text-[#C6F24E] flex-shrink-0" />
              {locale === 'tr' ? 'KVKK uyumlu · Endüstriyel şifreleme' : 'GDPR compliant · Industry-standard encryption'}
            </div>
          </div>

          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#C6F24E]/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#C6F24E]/5 blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none" />
        </div>

        {/* Right Panel - Form */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 bg-[#FFFFFF]">

          {/* Header/Logo for mobile */}
          <div className="flex lg:hidden justify-center mb-8">
            <Link href="/" className="flex items-center gap-3 group">
              <BuazeLogo size={36} variant="default" imageUrl={logoUrl} />
              <span
                className="text-[22px] font-medium tracking-[-0.03em] text-[#0A0A0A]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                buaze<span className="text-[#C6F24E]">.</span>
              </span>
            </Link>
          </div>

          <div className="w-full max-w-sm mx-auto">
            <div className="bg-white rounded-3xl border border-[#EDEDED] p-8 sm:p-10 mb-5 shadow-[0_8px_24px_rgba(10,10,10,0.04)]">
              <div className="mb-8 text-center lg:text-left">
                <h1 className="text-[28px] text-[#0A0A0A] tracking-[-0.02em] leading-tight">{t.auth_login_title}</h1>
                <p className="text-[14px] text-[#525252] mt-2">{t.auth_login_subtitle}</p>
              </div>

              <Suspense fallback={<div className="h-52 animate-pulse bg-[#FFFFFF] rounded-lg" />}>
                <LoginForm locale={locale} t={t} />
              </Suspense>
            </div>

            <div className="text-center mt-8">
              <p className="text-[13px] text-[#525252]">
                {locale === 'tr' ? 'Hesabınız yok mu?' : "Don't have an account?"}
              </p>
              <Link
                href={`/${locale}/auth/register`}
                className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#0A0A0A] hover:text-[#A8D62E] mt-2 transition-colors"
              >
                {locale === 'tr' ? '14 gün ücretsiz dene' : 'Try free for 14 days'}
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
