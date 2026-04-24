'use client';

import { usePathname, useRouter } from 'next/navigation';

interface Props {
  locale: 'tr' | 'en';
  className?: string;
}

export default function WatchDemoButton({
  locale,
  className,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const isTr = locale === 'tr';
  const targetHash = '#how-it-works';
  const homePath = `/${locale}`;

  const handleClick = () => {
    if (pathname === homePath) {
      const section = document.getElementById('how-it-works');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }

    router.push(`${homePath}${targetHash}`);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        className ??
        'inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#E5E5E5] bg-[#FAFAFA] px-6 py-4 text-[15px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#F5F5F5] sm:w-auto'
      }
    >
      <span aria-hidden className="pulse-icon-badge text-[11px]">
        →
      </span>
      {isTr ? 'Nasıl çalışır' : 'How it works'}
      <span className="font-mono text-[10px] text-[#737373]">
        {isTr ? '3 adım' : '3 steps'}
      </span>
    </button>
  );
}
