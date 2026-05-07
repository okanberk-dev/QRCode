'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { copyToClipboard } from '@/lib/clipboard';

interface CopyUrlButtonProps {
  url: string;
  className?: string;
}

export default function CopyUrlButton({ url, className = "" }: CopyUrlButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`bz-btn-icon ${className}`}
      title="Bağlantıyı Kopyala"
      aria-label="Bağlantıyı Kopyala"
    >
      {copied ? <Check size={14} strokeWidth={2} className="text-[#A8D62E]" /> : <Copy size={14} strokeWidth={2} />}
    </button>
  );
}
