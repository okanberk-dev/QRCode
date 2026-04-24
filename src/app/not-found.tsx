import Link from 'next/link';
import { ArrowLeft, Ghost } from 'lucide-react';
import BuazeLogo from '@/components/marketing/BuazeLogo';

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#FFFFFF] text-[#0A0A0A] font-sans p-6 overflow-hidden relative">
      {/* Background aesthetics */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#C6F24E] rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#C6F24E] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob animation-delay-2000" />
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{ backgroundImage: 'radial-gradient(circle, #0A0A0A 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
        />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto text-center">
        {/* Sleek 3D-like container */}
        <div className="bg-white rounded-3xl p-10 sm:p-12 border border-[#0A0A0A] shadow-md transform hover:-translate-y-2 transition-transform duration-500">
          
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 bg-[#0A0A0A] rounded-2xl flex items-center justify-center border-2 border-white shadow-sm transform rotate-[-3deg] hover:rotate-[3deg] transition-transform">
              <Ghost size={48} className="text-[#C6F24E]" strokeWidth={2} />
            </div>
          </div>
          
          <h1 className="text-[64px] font-semibold text-[#0A0A0A] leading-none mb-4 tracking-tighter">
            404
          </h1>
          
          <h2 className="text-[20px] font-semibold text-[#0A0A0A] mb-4 uppercase tracking-tight">
            Sayfa Bulunamadı
          </h2>
          
          <p className="text-[14px] text-[#1A1A1A] font-medium leading-relaxed mb-10">
            Aradığınız sayfa silinmiş, pasife alınmış veya hiç var olmamış olabilir. Kısacası buralarda yok!
          </p>

          <Link 
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full px-8 py-4 bg-[#C6F24E] text-[#0A0A0A] text-sm font-semibold rounded-xl border border-[#0A0A0A] shadow-sm hover:bg-[#C6F24E] transition-all active:translate-y-[4px] active:shadow-none uppercase tracking-widest"
          >
            <ArrowLeft size={18} strokeWidth={2} />
            Ana Sayfaya Dön
          </Link>
        </div>

        <Link href="/" className="mt-8 flex items-center justify-center gap-2.5 group">
          <BuazeLogo size={28} variant="default" />
          <span className="text-[#6B7280] font-semibold text-xs uppercase tracking-[0.2em] group-hover:text-[#0A0A0A] transition-colors">Buaze • Dijital İtibar</span>
        </Link>
      </div>
    </div>
  );
}
