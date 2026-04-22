'use client';

import { useState } from 'react';
import { Sparkles, Trophy, Monitor, Star } from 'lucide-react';
import Image from 'next/image';
import type { Locale } from '@/lib/translations';

interface FeatureTabsUIProps {
  locale: Locale;
}

export default function FeatureTabsUI({ locale }: FeatureTabsUIProps) {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    {
      id: 'magic-links',
      label: locale === 'tr' ? 'Akıllı Linkler' : 'Magic Links',
      icon: <Sparkles size={18} />,
      subtitle: locale === 'tr' ? 'HERHANGİ BİR SİSTEMDEN ANINDA YORUM İSTEYİN' : 'REQUEST REVIEWS FROM ANY SYSTEM, INSTANTLY',
      content: (
        <Image
          src="https://cdn.prod.website-files.com/670d34b0d540e323cbcbb352/672c61461189d46513ffe0c4_Best-reviews.webp"
          alt={locale === 'tr' ? 'Akıllı linklerle yorum toplama ekranı önizlemesi' : 'Preview of collecting reviews with Magic Links'}
          width={700}
          height={430}
          sizes="(max-width: 768px) 80vw, (max-width: 1200px) 65vw, 700px"
          className="mx-auto max-w-[80%] md:max-w-[700px] h-auto object-contain drop-shadow-md"
        />
      ),
      p1: locale === 'tr'
        ? 'CRM veya rezervasyon sisteminiz zaten müşteri e-postalarını yönetiyor. Bırakın o işini yapsın.'
        : 'Your CRM or booking system already handles customer emails. Let it keep doing that.',
      p2: locale === 'tr'
        ? 'Akıllı Linkler hiçbir entegrasyon gerektirmediği için tüm platformlarla çalışır. Tek yapmanız gereken, var olan akışınıza bir link yapıştırmak.'
        : 'Magic Links work with any platform because there\'s no integration required. Just paste a URL into your existing workflows',
    },
    {
      id: 'smart-filters',
      label: locale === 'tr' ? 'Geri Bildirim Yönetimi' : 'Feedback Management',
      icon: <Trophy size={18} />,
      subtitle: locale === 'tr' ? 'MÜŞTERİ DENEYİMİNİ ANLIK OLARAK TAKİP EDİN' : 'TRACK CUSTOMER EXPERIENCE IN REAL-TIME',
      content: (
        <div className="mx-auto w-full max-w-[650px] bg-[#F8F6F1] rounded-2xl md:rounded-[32px] border border-[#1A2332] p-6 md:p-10 shadow-md space-y-6 md:space-y-8">
          {/* Positive Review Route */}
          <div className="bg-white rounded-xl border border-[#1A2332] p-5 shadow-md relative hover:-translate-y-1 transition-transform">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
              <div className="flex gap-1 text-[#F4B400]">
                {[1,2,3,4,5].map(i => <Star key={i} size={22} fill="currentColor" strokeWidth={0} />)}
              </div>
              <div className="bg-[#EFFFF3] text-[#16A34A] px-3.5 py-1.5 text-[11px] font-extrabold rounded-full border border-[#16A34A] uppercase tracking-wider inline-flex items-center w-fit shadow-sm">
                {locale === 'tr' ? '↗ Google Haritalar\'a Yönlendir' : '↗ Route to Google Maps'}
              </div>
            </div>
            <div className="space-y-2 opacity-50 pl-1">
              <div className="h-2.5 bg-[#E8ECF2] w-3/4 rounded-full" />
              <div className="h-2.5 bg-[#E8ECF2] w-1/2 rounded-full" />
            </div>
          </div>

          {/* Negative Review Route */}
          <div className="bg-[#FFF9F5] rounded-xl border border-[#F4B400] p-5 shadow-md relative hover:-translate-y-1 transition-transform">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
              <div className="flex gap-1">
                {[1,2].map(i => <Star key={i} size={22} fill="#F4B400" strokeWidth={0} />)}
                {[3,4,5].map(i => <Star key={i} size={22} fill="#FDEBD0" strokeWidth={0} />)}
              </div>
              <div className="bg-[#F4B400] text-[#1A2332] px-3.5 py-1.5 text-[11px] font-extrabold rounded-full shadow-sm uppercase tracking-wider inline-flex items-center w-fit">
                {locale === 'tr' ? '🔒 Özel Panele Al' : '🔒 Internal Dashboard'}
              </div>
            </div>
            <div className="space-y-2 opacity-40 pl-1">
              <div className="h-2.5 bg-[#F4B400] w-2/3 rounded-full opacity-30" />
              <div className="h-2.5 bg-[#F4B400] w-1/3 rounded-full opacity-30" />
            </div>
          </div>
        </div>
      ),
      p1: locale === 'tr'
        ? 'Müşteri geri bildirimlerini yapılandırılmış bir veri akışına dönüştürerek operasyonel mükemmellik sağlayın.'
        : 'Ensure operational excellence by converting customer feedback into a structured data stream.',
      p2: locale === 'tr'
        ? 'Geri bildirim operasyonlarınızı tek bir merkezden yöneterek marka itibarınızı profesyonelce koruyun.'
        : 'Protect your brand reputation professionally by managing your feedback operations from a single center.',
    },
    {
      id: 'widgets',
      label: locale === 'tr' ? 'Web Site Eklentileri' : 'Website widgets',
      icon: <Monitor size={18} />,
      subtitle: locale === 'tr' ? 'SOSYAL KANITLARINIZI SİTENİZDE SERGİLEYİN' : 'DISPLAY YOUR SOCIAL PROOF ON YOUR SITE',
      content: (
        <Image
          src="https://cdn.prod.website-files.com/670d34b0d540e323cbcbb352/672c0958413deb5af455a7ac_Widgets-hero.png"
          alt={locale === 'tr' ? 'Web sitesi eklentileri ile sosyal kanıt gösterimi' : 'Website widget preview showing social proof'}
          width={900}
          height={520}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 85vw, 900px"
          className="mx-auto w-full max-w-[900px] h-auto object-contain drop-shadow-md"
        />
      ),
      p1: locale === 'tr'
        ? 'Ziyaretçilerinizde güven oluşturmak için yorumlarınızı doğrudan sitenizde sergileyin.'
        : 'Showcase reviews directly on your website to build trust with visitors.',
      p2: locale === 'tr'
        ? 'Basit yerleştirme kodu • Tamamen özelleştirilebilir tasarım • Yeni yorumlar geldikçe otomatik güncellenir'
        : 'Simple embed code • Fully customizable design • Updates automatically as new reviews come in',
    },
  ];

  const currentData = tabs[activeTab];

  return (
    <div className="max-w-[1000px] mx-auto bg-white rounded-3xl border border-[#1A2332] shadow-md p-8 sm:p-12 transition-all flex flex-col items-center text-center">
      
      {/* Title */}
      <h2 className="text-[28px] sm:text-[36px] font-extrabold text-[#1A2332] tracking-[-0.02em] mb-3">
        {locale === 'tr' ? 'Mutlu müşterilerinizi daha fazla müşteriye dönüştürün' : 'Turn happy customers into more customers'}
      </h2>
      
      {/* Dynamic Subtitle */}
      <div className="text-[12px] font-bold text-[#6B7280] tracking-widest uppercase mb-10 transition-opacity duration-300">
        {currentData.subtitle}
      </div>

      {/* Dynamic Media Content */}
      <div className="w-full min-h-[260px] sm:min-h-[320px] md:min-h-[360px] flex items-center justify-center mb-10 transition-opacity duration-500">
        {currentData.content}
      </div>

      {/* Dynamic Texts */}
      <div className="max-w-[640px] mx-auto space-y-4 mb-14 min-h-[80px]">
        <p className="text-[15px] font-medium text-[#2A3444] leading-relaxed">
          {currentData.p1}
        </p>
        <p className="text-[15px] font-medium text-[#2A3444] leading-relaxed">
          {currentData.p2}
        </p>
      </div>

      {/* Tab Navigation Menu */}
      <div className="w-full border-t border-[#E8ECF2] pt-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
        {tabs.map((tab, idx) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(idx)}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-[14px] font-bold transition-all duration-300 ${
              activeTab === idx
                ? 'bg-white border-2 border-[#F4B400]/30 text-[#1A2332] shadow-[0_2px_12px_rgba(255,92,37,0.12)]' 
                : 'text-[#6B7280] hover:text-[#1A2332]'
               }`}
          >
            <div className={`${activeTab === idx ? 'text-[#F4B400]' : ''}`}>
              {tab.icon}
            </div>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
