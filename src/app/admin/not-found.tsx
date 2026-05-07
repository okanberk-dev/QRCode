import Link from 'next/link';
import { Home, SearchX } from 'lucide-react';

// §38.75 — Admin paneli için spesifik 404 page (admin/error.tsx paterni reuse).
// Root /not-found.tsx'e fallback yerine admin marka diliyle (lime-soft icon
// container + "Dashboard'a dön" CTA). Apple-premium 404 UX.

export default function AdminNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] font-sans px-6 py-12">
      <div className="w-full max-w-[460px] bg-white border border-[#EDEDED] rounded-[20px] p-8 sm:p-10 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF9B8] text-[#0A0A0A]">
          <SearchX size={24} strokeWidth={2} />
        </div>
        <h1 className="text-[26px] font-medium leading-[1.1] tracking-[-0.025em] text-[#0A0A0A]">
          Sayfa bulunamadı.
        </h1>
        <p className="mt-3 text-[14px] text-[#737373] leading-relaxed">
          Aradığın admin sayfası mevcut değil veya silinmiş olabilir. Dashboard&apos;a dönüp menüden devam edebilirsin.
        </p>

        <div className="mt-7 flex flex-col gap-2.5">
          <Link
            href="/admin/dashboard"
            className="bz-btn-primary w-full"
          >
            <Home size={16} strokeWidth={2} />
            Dashboard&apos;a dön
          </Link>
        </div>
      </div>
    </div>
  );
}
