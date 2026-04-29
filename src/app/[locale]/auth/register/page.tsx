import type { Metadata } from 'next';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import RegisterForm from '@/components/auth/RegisterForm';
import Link from 'next/link';
import { Check } from 'lucide-react';
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
    title: locale === 'tr' ? 'Ücretsiz Kayıt Ol - Buaze' : 'Sign Up for Free - Buaze',
    description: locale === 'tr'
      ? '14 gün boyunca Buaze\'yi ücretsiz deneyin. Kredi kartı gerekmez, anında başlayın.'
      : 'Try Buaze free for 14 days. No credit card required, start instantly.',
    robots: { index: false, follow: false },
  };
}

export default async function RegisterPage({
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
  const isTr = locale === 'tr';

  const benefits = isTr
    ? ['5 dakikada kurulum', 'Kredi kartı gerekmez', 'İstediğin zaman iptal et', 'Türkçe destek']
    : ['5-minute setup', 'No credit card required', 'Cancel anytime', 'Turkish support'];

  return (
    <div className="min-h-screen bg-white font-sans lg:grid lg:grid-cols-2">
      {/* LEFT — Lime hero */}
      <div className="relative flex min-h-[420px] lg:min-h-screen flex-col justify-between bg-[#C6F24E] px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-12">
        <Link href={`/${locale}`} className="inline-flex items-center gap-2 self-start group">
          <BuazeLogo size={32} variant="on-lime" imageUrl={logoUrl} />
          <span
            className="text-[20px] font-medium tracking-[-0.03em] text-[#0A0A0A]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            buaze<span>.</span>
          </span>
        </Link>

        <div className="py-8">
          <span className="pulse-eyebrow text-[#0A0A0A] inline-block">
            {isTr ? '14 GÜN ÜCRETSİZ' : '14 DAYS FREE'}
          </span>
          <h2
            className="mt-4 text-[36px] sm:text-[52px] lg:text-[64px] font-medium leading-[0.98] tracking-[-0.035em] text-[#0A0A0A]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {isTr ? (
              <>Nabzını<br />duymaya<br />başla.</>
            ) : (
              <>Start listening<br />to your<br />pulse.</>
            )}
          </h2>

          <ul className="mt-7 space-y-2.5">
            {benefits.map((feat) => (
              <li key={feat} className="flex items-center gap-2.5 text-[14px] font-medium text-[#0A0A0A]">
                <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#0A0A0A] text-[#C6F24E]">
                  <Check size={11} strokeWidth={3} />
                </span>
                {feat}
              </li>
            ))}
          </ul>
        </div>

        <p className="pulse-eyebrow text-[#0A0A0A]/70">© {new Date().getFullYear()} BUAZE</p>
      </div>

      {/* RIGHT — Form */}
      <div className="flex flex-col justify-center bg-white px-6 py-10 sm:px-10 sm:py-12 lg:px-16 lg:py-12">
        <div className="mx-auto w-full max-w-[400px]">
          <h1
            className="text-[36px] sm:text-[38px] font-medium leading-[1] tracking-[-0.03em] text-[#0A0A0A]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {isTr ? 'Hesap oluştur' : 'Create account'}
          </h1>
          <p className="mt-2.5 text-[14px] text-[#737373]">
            {isTr ? 'Kredi kartı gerekmez. 2 dakikada başla.' : 'No credit card. Start in 2 minutes.'}
          </p>

          <div className="mt-7">
            <RegisterForm locale={locale} t={t} />
          </div>
        </div>
      </div>
    </div>
  );
}
