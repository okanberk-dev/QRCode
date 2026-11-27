'use client';

// Denetim Merkezi — küçük aç/kapa başlığı (Diğer linkler, Arşivlenenler, Yeni link
// oluştur). Yerel <details> yerine kontrollü düğme: açık durum üst bileşende
// tutulur (bir işlemden sonra programatik açılabilsin) ve 44px dokunma hedefi.

import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

export default function Disclosure({
  open,
  onToggle,
  controls,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  /** Açılan bölgenin id'si (`aria-controls`). */
  controls: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      className="flex min-h-11 w-full items-center justify-between gap-2 rounded-[20px] px-1 text-left text-[13px] font-medium text-pn-ink hover:text-[#525252] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pn-accent sm:min-h-9"
    >
      <span className="flex items-center gap-2">{children}</span>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className={`shrink-0 text-[#737373] transition-transform ${open ? 'rotate-180' : ''}`}
      />
    </button>
  );
}
