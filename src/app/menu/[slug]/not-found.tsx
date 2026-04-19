import Link from 'next/link';
import { UtensilsCrossed, ArrowLeft } from 'lucide-react';

export default function MenuNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FCFBF7] px-6 py-16">
      <div className="mx-auto max-w-md rounded-[24px] border border-gray-100 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FDBF1D]">
          <UtensilsCrossed size={28} strokeWidth={2.75} className="text-[#111827]" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-[#111827]">Menü bulunamadı</h1>
        <p className="mt-2 text-sm font-bold text-[#6b6760]">
          Bu işletme henüz menüsünü paylaşmadı veya yayından kaldırdı. Lütfen daha sonra tekrar deneyin.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#111827] px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-sm transition-all hover:bg-gray-800 active:scale-95"
        >
          <ArrowLeft size={14} strokeWidth={3} />
          Buaze Ana Sayfa
        </Link>
      </div>
    </div>
  );
}
