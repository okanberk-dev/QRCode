'use client';

import { MapPin, Info } from 'lucide-react';

interface BusinessSummaryProps {
  name: string;
  address: string | null;
  category: string;
}

export default function BusinessSummary({ name, address, category }: BusinessSummaryProps) {
  return (
    <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
      {/* Business Micro-Info - Clean & Focused */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
           <div className="w-1 h-8 bg-blue-500 rounded-full" />
           <h2 className="text-2xl font-extrabold text-[#0A0A0A] tracking-tighter uppercase">{name}</h2>
        </div>
        
        <div className="flex flex-wrap gap-4 text-xs sm:text-sm text-[#6B7280] px-1 items-center">
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin size={16} className="text-[#6B7280] flex-shrink-0" />
            <span className="truncate">{address || 'Adres bilgisi mevcut değil'}</span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-green-600 font-bold uppercase tracking-tighter text-[10px]">Açık</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[#C9D0DB]">•</span>
            <span className="bg-[#EDEDED] px-2 py-0.5 rounded-md text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">{category}</span>
          </div>
        </div>
      </div>

      {/* Subtle Divider */}
      <div className="mt-8 border-b border-[#FFFFFF]" />
    </div>
  );
}
