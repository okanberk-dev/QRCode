'use client';

import { useState } from 'react';
import { Sparkles, Trophy, Monitor } from 'lucide-react';
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
        <img
          src="https://cdn.prod.website-files.com/670d34b0d540e323cbcbb352/672c61461189d46513ffe0c4_Best-reviews.webp"
          alt="Magic Links"
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
      label: locale === 'tr' ? 'Akıllı Filtreleme' : 'Smart Filtering',
      icon: <Trophy size={18} />,
      subtitle: locale === 'tr' ? 'OLUMSUZ YORUMLARI YAYINLANMADAN YAKALAYIN' : 'CATCH NEGATIVE REVIEWS BEFORE THEY GO PUBLIC',
      content: (
        <img
          src="https://cdn.prod.website-files.com/670d34b0d540e323cbcbb352/688c976c4d1530a985069a0f_sentiment-analysis.png"
          alt="Smart Filters"
          className="mx-auto w-full max-w-[800px] h-auto object-contain drop-shadow-md"
        />
      ),
      p1: locale === 'tr'
        ? 'Düşük puan veren müşterilerinizi otomatik olarak şikayet formuna yönlendirin ve sorunları özel olarak çözün.'
        : 'Automatically route customers who give low ratings to a private feedback form and resolve issues privately.',
      p2: locale === 'tr'
        ? 'Gerçek şikayetleri dinleyin, dijital itibarınızı ve Google Haritalar puanınızı güvene alın.'
        : 'Listen to genuine complaints, protect your digital reputation and secure your Google Maps score.',
    },
    {
      id: 'widgets',
      label: locale === 'tr' ? 'Web Site Eklentileri' : 'Website widgets',
      icon: <Monitor size={18} />,
      subtitle: locale === 'tr' ? 'SOSYAL KANITLARINIZI SİTENİZDE SERGİLEYİN' : 'DISPLAY YOUR SOCIAL PROOF ON YOUR SITE',
      content: (
        <img
          src="https://cdn.prod.website-files.com/670d34b0d540e323cbcbb352/672c0958413deb5af455a7ac_Widgets-hero.png"
          alt="Website Widgets"
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
    <div className="max-w-[1000px] mx-auto bg-white rounded-3xl border-[2px] border-[#1f1e1d] shadow-[4px_6px_0_0_#1f1e1d] p-8 sm:p-12 transition-all flex flex-col items-center text-center">
      
      {/* Title */}
      <h2 className="text-[28px] sm:text-[36px] font-extrabold text-[#1f1e1d] tracking-[-0.02em] mb-3">
        {locale === 'tr' ? 'Mutlu müşterilerinizi daha fazla müşteriye dönüştürün' : 'Turn happy customers into more customers'}
      </h2>
      
      {/* Dynamic Subtitle */}
      <div className="text-[12px] font-bold text-[#ada89f] tracking-widest uppercase mb-10 transition-opacity duration-300">
        {currentData.subtitle}
      </div>

      {/* Dynamic Media Content */}
      <div className="w-full min-h-[300px] flex items-center justify-center mb-10 transition-opacity duration-500">
        {currentData.content}
      </div>

      {/* Dynamic Texts */}
      <div className="max-w-[640px] mx-auto space-y-4 mb-14 min-h-[80px]">
        <p className="text-[15px] font-medium text-[#6b6760] leading-relaxed">
          {currentData.p1}
        </p>
        <p className="text-[15px] font-medium text-[#6b6760] leading-relaxed">
          {currentData.p2}
        </p>
      </div>

      {/* Tab Navigation Menu */}
      <div className="w-full border-t border-[#e8e4de] pt-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
        {tabs.map((tab, idx) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(idx)}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-[14px] font-bold transition-all duration-300 ${
              activeTab === idx
                ? 'bg-white border-2 border-[#ff5c25]/30 text-[#1f1e1d] shadow-[0_2px_12px_rgba(255,92,37,0.12)]' 
                : 'text-[#ada89f] hover:text-[#1f1e1d]'
               }`}
          >
            <div className={`${activeTab === idx ? 'text-[#ff5c25]' : ''}`}>
              {tab.icon}
            </div>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
