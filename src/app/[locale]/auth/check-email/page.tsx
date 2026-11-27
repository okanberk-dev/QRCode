import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import Link from 'next/link';
import BuazeLogo from '@/components/marketing/BuazeLogo';
import { getSiteSettings } from '@/lib/site-settings';
import CheckEmailClient from '@/components/auth/CheckEmailClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'E-posta Onayı Bekliyor' : 'Verify Your Email',
    robots: { index: false, follow: false },
  };
}

export const dynamic = 'force-dynamic';

export default async function CheckEmailPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const { logoUrl } = await getSiteSettings();
  const isTr = locale === 'tr';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] font-sans p-6 sm:p-8">
      <div className="w-full max-w-[460px] bg-white border border-[#EDEDED] rounded-[20px] p-8 sm:p-10 shadow-[0_8px_24px_rgba(10,10,10,0.04)]">
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
          {isTr ? 'MAIL KUTUNU AÇ' : 'CHECK YOUR INBOX'}
        </p>
        <h1
          className="mt-2 mb-3 text-[26px] font-medium tracking-[-0.025em] text-[#0A0A0A]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {isTr ? 'Sana bir onay maili gönderdik.' : 'We sent you a verification email.'}
        </h1>
        <p className="text-[14px] text-[#525252] leading-relaxed">
          {isTr
            ? 'Mail kutundaki linke tıkla, hesabın anında aktive olsun. Bağlantı 24 saat geçerli.'
            : 'Click the link in your inbox to activate your account. The link is valid for 24 hours.'}
        </p>

        <div className="mt-6">
          <CheckEmailClient locale={locale} />
        </div>

        <p className="mt-7 text-[12px] text-[#737373] leading-relaxed">
          {isTr
            ? 'Mail spam klasörüne düşmüş olabilir. Hâlâ bulamadıysan birkaç dakika bekle ve tekrar gönder butonunu kullan.'
            : 'The email may have landed in spam. If you still can\'t find it, wait a few minutes and use the resend button.'}
        </p>

        <div className="mt-7 pt-5 border-t border-[#EDEDED] text-[13px] text-[#525252]">
          <Link href={`/${locale}/auth/login`} className="font-semibold text-[#0A0A0A] hover:text-[#5D3EBC] transition-colors">
            {isTr ? '← Giriş sayfasına dön' : '← Back to sign in'}
          </Link>
        </div>
      </div>
    </div>
  );
}
