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
    <button
      type="button"
      onClick={onClick}
      aria-label={isTr ? 'Bağlantıyı kopyala' : 'Copy link'}
      title={isTr ? 'Bağlantıyı kopyala' : 'Copy link'}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#EDEDED] text-[#525252] transition-colors hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
    >
      {copied ? <Check size={14} strokeWidth={2.5} className="text-[#A8D62E]" /> : <Link2 size={14} strokeWidth={2} />}
    </button>
  );
}
