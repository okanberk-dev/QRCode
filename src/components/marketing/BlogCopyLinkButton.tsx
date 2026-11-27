'use client';

import { useState } from 'react';
import { Link2, Check } from 'lucide-react';
import { copyToClipboard } from '@/lib/clipboard';

interface Props {
  url: string;
  locale: 'tr' | 'en';
}

export default function BlogCopyLinkButton({ url, locale }: Props) {
  const isTr = locale === 'tr';
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    const ok = await copyToClipboard(url);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-label={isTr ? 'Bağlantıyı kopyala' : 'Copy link'}
        title={isTr ? 'Bağlantıyı kopyala' : 'Copy link'}
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#EDEDED] text-[#525252] transition-colors hover:border-[#0A0A0A] hover:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
      >
        {copied ? (
          <Check size={14} strokeWidth={2.5} className="text-[#0A0A0A]" aria-hidden="true" />
        ) : (
          <Link2 size={14} strokeWidth={2} aria-hidden="true" />
        )}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? (isTr ? 'Bağlantı kopyalandı' : 'Link copied') : ''}
      </span>
    </>
  );
}
