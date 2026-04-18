'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface RoiResultCardProps {
  title: string;
  value: string;
  msg: string;
  icon: LucideIcon;
  accentColor?: string;
  badge?: string;
}

const RoiResultCard: React.FC<RoiResultCardProps> = ({
  title,
  value,
  msg,
  icon: Icon,
  accentColor = '#FDBF1D',
  badge,
}) => {
  return (
    <div className="bg-white p-6 rounded-[32px] border-[3px] border-[#1f1e1d] shadow-[6px_8px_0_0_#1f1e1d] flex flex-col items-start gap-4 transition-transform hover:-translate-y-1">
      <div className="flex justify-between items-start w-full">
        <div 
          className="p-3 rounded-2xl border-2 border-[#1f1e1d]" 
          style={{ backgroundColor: accentColor }}
        >
          <Icon size={24} className="text-[#1f1e1d]" strokeWidth={2.5} />
        </div>
        {badge && (
          <span className="bg-[#1f1e1d] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
            {badge}
          </span>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-[12px] font-black text-[#6b6760] uppercase tracking-[0.15em]">
          {title}
        </h3>
        <p className="text-[28px] sm:text-[32px] font-black text-[#1f1e1d] leading-none tracking-tighter">
          {value}
        </p>
      </div>

      <p className="text-[14px] text-[#6b6760] font-bold leading-relaxed">
        {msg}
      </p>
    </div>
  );
};

export default RoiResultCard;
