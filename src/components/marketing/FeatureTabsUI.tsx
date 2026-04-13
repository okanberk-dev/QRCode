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
      id: 'leaderboards',
      label: locale === 'tr' ? 'Yorum Liderlik Tablosu' : 'Review Leaderboards',
      icon: <Trophy size={18} />,
      subtitle: locale === 'tr' ? 'PERFORMANSI TAKİP EDİN VE SONUÇLARI ÖDÜLLENDİRİN' : 'TRACK PERFORMANCE AND REWARD RESULTS',
      content: (
        <div className="relative w-full max-w-[800px] mx-auto overflow-hidden rounded-xl bg-gray-100 shadow-md aspect-video">
          <iframe
            src="https://www.youtube.com/embed/X0Wqu_nqs2U?rel=0&controls=1&autoplay=0&mute=0&start=0"
            className="absolute top-0 left-0 w-full h-full border-0"
            allow="autoplay; encrypted-media"
            allowFullScreen
            title="Leaderboards Video"
          />
        </div>
      ),
      p1: locale === 'tr'
        ? 'Hangi takım üyelerinin, şubelerin veya ürünlerin en çok yorum getirdiğini görmek için tablolar oluşturun.'
        : 'Build leaderboards to see which team members, locations, or products generate the most reviews.',
      p2: locale === 'tr'
        ? 'Teşvik, takdir veya sağlıklı rekabet için kullanın. Yorum toplamayı ekibinizin kazanmak isteyeceği bir oyuna çevirin.'
        : 'Use it for incentives, recognition, or healthy competition. Turn review collection into something your team want to win at.',
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
