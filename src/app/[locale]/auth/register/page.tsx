import type { Metadata } from 'next';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import RegisterForm from '@/components/auth/RegisterForm';
import Link from 'next/link';
import { CheckCircle2, Shield } from 'lucide-react';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Ücretsiz Kayıt Ol — Buaze' : 'Sign Up for Free — Buaze',
    description: locale === 'tr'
      ? '14 gün boyunca Buaze\'yi ücretsiz deneyin. Kredi kartı gerekmez, anında başlayın.'
      : 'Try Buaze free for 14 days. No credit card required, start instantly.',
    robots: { index: false, follow: false },
  };
}

export function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
}

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);

  const trialFeatures = locale === 'tr'
    ? ['Sınırsız QR Tarama', 'Dahili Geri Bildirim Sistemi', 'Yönetici Paneli', 'Kredi kartı gerekmez']
    : ['Unlimited QR Scans', 'Internal Feedback System', 'Admin Dashboard', 'No credit card required'];

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
            <div className="inline-flex items-center gap-2 bg-[#FDBF1D]/10 border border-[#FDBF1D]/30 text-[#FDBF1D] px-4 py-2 rounded-full text-sm font-black">
              ✦ {t.auth_trial_badge}
            </div>
            <h2 className="text-4xl font-black leading-tight">
              {locale === 'tr'
                ? 'İtibarınızı büyütmeye bugün başlayın'
                : 'Start growing your reputation today'}
            </h2>
            <p className="text-gray-400 font-bold text-lg leading-relaxed">
              {locale === 'tr'
                ? '14 gün boyunca tüm özellikleri ücretsiz kullanın. Dilediğiniz zaman iptal edin.'
                : 'Use all features free for 14 days. Cancel anytime.'}
            </p>

            <ul className="space-y-4 pt-4">
              {trialFeatures.map(feat => (
                <li key={feat} className="flex items-center gap-3 font-bold text-gray-300">
                  <CheckCircle2 size={18} className="text-[#FDBF1D] flex-shrink-0" />
                  {feat}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3 text-gray-500 text-xs font-bold">
          <Shield size={16} />
          {locale === 'tr' ? 'KVKK uyumlu & 256-bit şifreli' : 'GDPR compliant & 256-bit encrypted'}
        </div>

        {/* Decoration */}
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
              <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-black">
                ✦ {t.auth_trial_badge} · {t.auth_no_cc}
              </div>
              <h1 className="text-3xl font-black text-[#111827]">{t.auth_register_title}</h1>
              <p className="text-gray-500 font-bold">{t.auth_register_subtitle}</p>
            </div>

            <RegisterForm locale={locale} t={t} />
          </div>
        </div>
      </div>
    </div>
  );
}
