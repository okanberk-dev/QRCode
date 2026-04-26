'use client';

import Link from 'next/link';

type RecaptchaNoticeProps = {
  locale?: 'tr' | 'en' | string;
  className?: string;
  dark?: boolean;
};

export default function RecaptchaNotice({ locale = 'tr', className = '', dark = false }: RecaptchaNoticeProps) {
  const isTr = locale !== 'en';
  const textClass = dark ? 'text-[#A3A3A3]' : 'text-[#737373]';
  const linkClass = dark
    ? 'text-white/90 underline decoration-white/30 underline-offset-4 hover:text-[#C6F24E]'
    : 'text-[#0A0A0A] underline decoration-[#0A0A0A]/25 underline-offset-4 hover:text-[#A8D62E]';

  return (
    <p className={`text-[10.5px] leading-relaxed ${textClass} ${className}`}>
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
