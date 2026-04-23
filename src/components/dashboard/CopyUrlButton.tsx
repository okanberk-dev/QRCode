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
      className={`inline-flex items-center justify-center p-1.5 rounded-lg border border-[#FFFFFF] bg-white text-[#6B7280] hover:text-[#C6F24E] hover:border-[#C6F24E] hover:bg-[#C6F24E]/5 transition-all active:scale-95 ${className}`}
      title="Bağlantıyı Kopyala"
    >
      {copied ? <Check size={14} strokeWidth={2} className="text-emerald-500" /> : <Copy size={14} strokeWidth={2} />}
    </button>
  );
}
