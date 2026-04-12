'use client';

import { Star, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function MarketingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-white border-b border-gray-100 h-20">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-[#111827] rounded-lg flex items-center justify-center">
            <Star size={24} className="text-[#FDBF1D] fill-[#FDBF1D]" />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase italic">ReviewsFlow</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-10">
          <Link href="/#nasıl-çalışır" className="text-sm font-bold text-gray-500 hover:text-[#111827] transition-colors">Nasıl Çalışır?</Link>
          <Link href="/about" className="text-sm font-bold text-gray-500 hover:text-[#111827] transition-colors">Hakkımızda</Link>
          <Link href="/pricing" className="text-sm font-bold text-gray-500 hover:text-[#111827] transition-colors">Fiyatlandırma</Link>
          <Link href="/contact" className="text-sm font-bold text-gray-500 hover:text-[#111827] transition-colors">İletişim</Link>
        </div>

        <div className="flex items-center gap-4">
          <Link 
            href="/admin" 
            className="px-6 py-2.5 text-sm font-extrabold bg-[#79C5D1] hover:bg-[#68b4c0] text-white rounded-lg transition-all shadow-sm"
          >
            Giriş Yap
          </Link>
          <button 
            className="md:hidden p-2 text-gray-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 right-0 bg-white border-b border-gray-100 p-6 flex flex-col gap-6 z-[99]">
          <Link href="/#nasıl-çalışır" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-gray-700">Nasıl Çalışır?</Link>
          <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-gray-700">Hakkımızda</Link>
          <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-gray-700">Fiyatlandırma</Link>
          <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-gray-700">İletişim</Link>
        </div>
      )}
    </nav>
  );
}
