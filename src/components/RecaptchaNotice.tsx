'use client';

import Link from 'next/link';

type RecaptchaNoticeProps = {
  locale?: 'tr' | 'en' | string;
  className?: string;
  dark?: boolean;
};

export default function RecaptchaNotice({ locale = 'tr', className = '', dark = false }: RecaptchaNoticeProps) {
  const isTr = locale !== 'en';
  const textClass = dark ? 'text-white/45' : 'text-[#A3A3A3]';
  const linkClass = dark
    ? 'underline decoration-white/15 decoration-1 underline-offset-2 hover:text-white/75 hover:decoration-white/35'
    : 'underline decoration-[#A3A3A3]/40 decoration-1 underline-offset-2 hover:text-[#525252] hover:decoration-[#A3A3A3]/70';

  return (
    <p className={`text-[10px] leading-snug ${textClass} ${className}`}>
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
