import Link from 'next/link';

interface Props {
  locale: 'tr' | 'en';
  className?: string;
}

/**
 * Homepage hero "How it works" button — routes to the dedicated
 * `/how-it-works` page (dark 4-step timeline), not an anchor on the
 * homepage itself.
 */
export default function WatchDemoButton({ locale, className }: Props) {
  const isTr = locale === 'tr';
  const href = `/${locale}/how-it-works`;

  return (
    <Link
      href={href}
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
    </Link>
  );
}
