'use client';

import { Star } from 'lucide-react';
import Link from 'next/link';

export default function MarketingFooter() {
  return (
    <footer className="bg-[#111827] py-20 px-6 text-white">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
         <div className="flex items-center gap-2 mb-12">
            <Star size={32} className="text-[#FDBF1D] fill-[#FDBF1D]" />
            <span className="text-2xl font-black uppercase italic tracking-tighter">ReviewsFlow</span>
         </div>
         
         <div className="flex gap-10 mb-12 flex-wrap justify-center font-bold text-sm">
            <Link href="/about" className="text-gray-400 hover:text-white transition-colors">Hakkımızda</Link>
            <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">İletişim</Link>
            <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Kullanım Şartları</Link>
            <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Gizlilik Politikası</Link>
            <Link href="/cookie" className="text-gray-400 hover:text-white transition-colors">Çerez Politikası</Link>
         </div>

         <div className="flex justify-center gap-6 pb-8 grayscale opacity-20 select-none">
            <div className="font-extrabold italic text-sm uppercase tracking-widest">KVKK Uyumlu</div>
            <div className="font-extrabold italic text-sm uppercase tracking-widest">Güvenli Altyapı</div>
         </div>

         <p className="text-gray-600 text-[10px] font-black pt-8 border-t border-gray-800 w-full text-center uppercase tracking-widest">
           © {new Date().getFullYear()} ReviewsFlow. Tüm Hakları Saklıdır.
         </p>
      </div>
    </footer>
  );
}
