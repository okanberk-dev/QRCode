import Link from 'next/link';
import { UtensilsCrossed, ArrowLeft } from 'lucide-react';

export default function MenuNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFFFFF] px-6 py-16">
      <div className="mx-auto max-w-md rounded-[24px] border border-[#EDEDED] bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#C6F24E]">
          <UtensilsCrossed size={28} strokeWidth={2} className="text-[#0A0A0A]" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">Menü bulunamadı</h1>
        <p className="mt-2 text-sm font-medium text-[#525252]">
          Bu işletme henüz menüsünü paylaşmadı veya yayından kaldırdı. Lütfen daha sonra tekrar deneyin.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#0A0A0A] px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white shadow-sm transition-all hover:bg-[#1A1A1A] active:scale-95"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Buaze Ana Sayfa
        </Link>
      </div>
    </div>
  );
}
