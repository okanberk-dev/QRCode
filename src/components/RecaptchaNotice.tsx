'use client';

import Link from 'next/link';

type RecaptchaNoticeProps = {
  locale?: 'tr' | 'en' | string;
  className?: string;
  dark?: boolean;
};

export default function RecaptchaNotice({ locale = 'tr', className = '', dark = false }: RecaptchaNoticeProps) {
  const isTr = locale !== 'en';
  // Colours meet WCAG AA at this small size: #737373 on white ≈ 4.7:1,
  // white/70 on #0A0A0A ≈ 9:1.
  const textClass = dark ? 'text-white/70' : 'text-[#737373]';
  const linkClass = dark
    ? 'underline decoration-white/30 decoration-1 underline-offset-2 hover:text-white hover:decoration-white/60'
    : 'underline decoration-[#737373]/40 decoration-1 underline-offset-2 hover:text-[#0A0A0A] hover:decoration-[#737373]/70';

  return (
    <p className={`text-[11px] leading-snug ${textClass} ${className}`}>
      {isTr ? 'Bu site reCAPTCHA ile korunur. Google ' : 'This site is protected by reCAPTCHA and the Google '}
      <Link href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className={linkClass}>
        {isTr ? 'Gizlilik Politikası' : 'Privacy Policy'}
      </Link>
      {isTr ? ' ve ' : ' and '}
      <Link href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className={linkClass}>
        {isTr ? 'Hizmet Şartları' : 'Terms of Service'}
      </Link>
      {isTr ? ' geçerlidir.' : ' apply.'}
    </p>
  );
}
