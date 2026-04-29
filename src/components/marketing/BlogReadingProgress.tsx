'use client';

import { useEffect, useState } from 'react';

interface Props {
  readTime: string;
  locale: 'tr' | 'en';
}

export default function BlogReadingProgress({ readTime, locale }: Props) {
  const isTr = locale === 'tr';
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const article = document.getElementById('article-body');
    if (!article) return;

    let raf = 0;
    const compute = () => {
      const rect = article.getBoundingClientRect();
      const viewport = window.innerHeight;
      const total = rect.height - viewport;
      if (total <= 0) {
        setProgress(rect.bottom <= viewport ? 1 : 0);
        return;
      }
      const scrolled = -rect.top;
      const ratio = scrolled / total;
      setProgress(Math.max(0, Math.min(1, ratio)));
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const pct = Math.round(progress * 100);

  return (
    <div className="border-t border-[#EDEDED] pt-5">
      <div className="pulse-eyebrow text-[#737373]">
        {isTr ? 'Okuma' : 'Reading'}
      </div>
      <div
        className="mt-2 text-[22px] font-medium leading-none tracking-[-0.02em] text-[#0A0A0A]"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        {readTime}
      </div>
      <div
        className="mt-3 h-[3px] overflow-hidden rounded-full bg-[#EDEDED]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={isTr ? 'Okuma ilerlemesi' : 'Reading progress'}
      >
        <div
          className="h-full bg-[#0A0A0A] transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div
        className="mt-1.5 text-[10px] font-semibold tracking-[0.1em] text-[#737373]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        %{pct} {isTr ? 'OKUNDU' : 'READ'}
      </div>
    </div>
  );
}
