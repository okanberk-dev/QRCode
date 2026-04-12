'use client';

import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { Target, Eye, ShieldCheck, Heart, Users, Zap } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-[#111827] font-sans">
      <MarketingNavbar />

      {/* Hero Section */}
      <section className="pt-48 pb-24 px-6 bg-[#F9FAFB]">
        <div className="max-w-4xl mx-auto text-center space-y-8">
           <h1 className="text-5xl sm:text-7xl font-black tracking-tight">
             Misyonumuz <br />
             <span className="text-[#79C5D1]">Güven İnşa Etmek</span>
           </h1>
           <p className="text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto font-medium">
             İşletmelerin gerçek değerlerini ortaya çıkarmalarına yardımcı oluyor, müşteri sesini yükseltiyor ve dijital dünyada itibarlarını koruyoruz.
           </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
           <div className="bg-white p-12 rounded-[40px] border border-gray-100 shadow-xl shadow-gray-500/5 space-y-6">
              <div className="w-16 h-16 bg-[#FDBF1D]/10 text-[#FDBF1D] rounded-2xl flex items-center justify-center">
                 <Target size={32} />
              </div>
              <h2 className="text-3xl font-black">Misyonumuz</h2>
              <p className="text-gray-500 leading-relaxed font-bold">
                İşletme sahiplerine, dürüst geri bildirimleri büyümeye dönüştürecek araçlar sunmak. Her müşteri etkileşiminin bir gelişim fırsatı olduğuna ve her olumlu kelimenin duyulması gerektiğine inanıyoruz.
              </p>
           </div>

           <div className="bg-white p-12 rounded-[40px] border border-gray-100 shadow-xl shadow-gray-500/5 space-y-6">
              <div className="w-16 h-16 bg-[#79C5D1]/10 text-[#79C5D1] rounded-2xl flex items-center justify-center">
                 <Eye size={32} />
              </div>
              <h2 className="text-3xl font-black">Vizyonumuz</h2>
              <p className="text-gray-500 leading-relaxed font-bold">
                Çevrimiçi itibarın adil ve şeffaf bir şekilde yönetildiği bir dünya. Restoranlar ve küçük işletmeler için itibar yönetimi teknolojisinde standartları belirleyen lider olmak için çalışıyoruz.
              </p>
           </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 px-6 bg-[#111827] text-white overflow-hidden relative">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
             <h2 className="text-4xl font-black mb-4">Bizi Biz Yapan Değerler</h2>
             <p className="text-gray-400 font-bold">Dürüstlük, yenilikçilik ve müşteri başarısı üzerine inşa edildi.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
             {[
               { icon: <ShieldCheck />, title: 'Dürüstlük', desc: 'Gerçek insanlardan gerçek yorumlar.' },
               { icon: <Zap />, title: 'İnovasyon', desc: 'En yeni QR ve filtreleme teknolojisi.' },
               { icon: <Heart />, title: 'Tutku', desc: 'Yerel işletmelerin büyümesini seviyoruz.' },
               { icon: <Users />, title: 'Destek', desc: 'İnsan odaklı müşteri hizmetleri.' }
             ].map((value, i) => (
               <div key={i} className="space-y-4 p-8 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="text-[#FDBF1D]">{value.icon}</div>
                  <h4 className="text-xl font-black">{value.title}</h4>
                  <p className="text-gray-400 text-sm font-bold">{value.desc}</p>
               </div>
             ))}
          </div>
        </div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#79C5D1]/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
      </section>

      <MarketingFooter />
    </div>
  );
}
