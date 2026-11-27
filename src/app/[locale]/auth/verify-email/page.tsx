import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import Link from 'next/link';
import BuazeLogo from '@/components/marketing/BuazeLogo';
import { getSiteSettings } from '@/lib/site-settings';
import VerifyEmailClient from '@/components/auth/VerifyEmailClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'E-posta Onayı' : 'Email Verification',
    robots: { index: false, follow: false },
  };
}

export const dynamic = 'force-dynamic';

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const { logoUrl } = await getSiteSettings();
  const isTr = locale === 'tr';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] font-sans p-6 sm:p-8">
      <div className="w-full max-w-[420px] bg-white border border-[#EDEDED] rounded-[20px] p-8 sm:p-10 shadow-[0_8px_24px_rgba(10,10,10,0.04)]">
        <Link href={`/${locale}`} className="inline-flex items-center gap-2 mb-7 group">
          <BuazeLogo size={28} imageUrl={logoUrl} />
          <span
            className="text-[18px] font-medium tracking-[-0.03em] text-[#0A0A0A]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            buaze<span className="text-[#5D3EBC]">.</span>
          </span>
        </Link>

        <p className="pulse-eyebrow text-[#737373]">
          {isTr ? 'E-POSTA ONAYI' : 'EMAIL VERIFICATION'}
        </p>
        <h1
          className="mt-2 mb-6 text-[26px] font-medium tracking-[-0.025em] text-[#0A0A0A]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {isTr ? 'Hesabını aktive ediyoruz…' : 'Verifying your account…'}
        </h1>

        <VerifyEmailClient locale={locale} />
      </div>
    </div>
  );
}
