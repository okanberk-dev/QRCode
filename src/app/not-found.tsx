import Link from 'next/link';
import { ArrowLeft, Ghost } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#FCFBF7] text-[#1f1e1d] font-sans p-6 overflow-hidden relative">
      {/* Background aesthetics */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FDBF1D] rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#ea580c] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob animation-delay-2000" />
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{ backgroundImage: 'radial-gradient(circle, #1f1e1d 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
        />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto text-center">
        {/* Sleek 3D-like container */}
        <div className="bg-white rounded-[32px] p-10 sm:p-12 border-[3px] border-[#1f1e1d] shadow-[16px_20px_0_0_rgba(31,30,29,1)] transform hover:-translate-y-2 transition-transform duration-500">
          
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 bg-[#1f1e1d] rounded-[24px] flex items-center justify-center border-2 border-white shadow-[0_8px_0_0_#FDBF1D] transform rotate-[-3deg] hover:rotate-[3deg] transition-transform">
              <Ghost size={48} className="text-[#FDBF1D]" strokeWidth={2} />
            </div>
          </div>
          
          <h1 className="text-[64px] font-black text-[#1f1e1d] leading-none mb-4 tracking-tighter">
            404
          </h1>
          
          <h2 className="text-[20px] font-extrabold text-[#1f1e1d] mb-4 uppercase tracking-tight">
            Sayfa Bulunamadı
          </h2>
          
          <p className="text-[14px] text-[#6b6760] font-medium leading-relaxed mb-10">
            Aradığınız sayfa silinmiş, pasife alınmış veya hiç var olmamış olabilir. Kısacası buralarda yok!
          </p>

          <Link 
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full px-8 py-4 bg-[#FDBF1D] text-[#1f1e1d] text-sm font-extrabold rounded-xl border-[2px] border-[#1f1e1d] shadow-[0_4px_0_0_#1f1e1d] hover:bg-[#EAB308] transition-all active:translate-y-[4px] active:shadow-none uppercase tracking-widest"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
            Ana Sayfaya Dön
          </Link>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#111827]">
            <span className="text-[#FDBF1D] font-black text-sm">B</span>
          </div>
          <span className="text-[#ada89f] font-bold text-xs uppercase tracking-[0.2em]">Buaze • Dijital İtibar</span>
        </div>
      </div>
    </div>
  );
}
