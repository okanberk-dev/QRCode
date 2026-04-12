'use client';

import { ArrowRight, QrCode, ShieldCheck, CheckCircle2, Star, Shield } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#111827] font-sans selection:bg-[#FDBF1D] selection:text-white">
      
      <MarketingNavbar />

      {/* Hero Section */}
      <section className="pt-48 pb-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 text-center lg:text-left">
            <h1 className="text-5xl sm:text-7xl font-black leading-[1.05] tracking-tight text-[#111827]">
              Dijital İtibarınızı <br />
              Zirveye Taşıyın
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
               Güven inşa edin, otomatik olarak daha fazla yorum toplayın ve hepsi bir arada itibar platformumuzla markanızı olumsuz geri bildirimlerden koruyun.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <a 
                href="mailto:okanberk16@gmail.com?subject=Hemen%20Başla"
                className="w-full sm:w-auto px-10 py-5 bg-[#FDBF1D] hover:bg-[#EAB308] text-[#111827] text-lg font-black rounded-lg transition-all shadow-xl shadow-yellow-500/20 active:scale-95 text-center"
              >
                Hemen Başla
              </a>
              <div className="flex -space-x-3">
                 {[1,2,3,4].map(i => (
                   <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                     +
                   </div>
                 ))}
                 <div className="pl-6 flex items-center gap-1">
                   <Star size={14} className="fill-[#FDBF1D] text-[#FDBF1D]" />
                   <span className="text-xs font-bold">4.9/5 Ortalama</span>
                 </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="bg-white rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden relative group">
               <img 
                 src="https://reviewsfunnel.com/_next/image?url=%2Fimages%2Fdashboard.png&w=1920&q=75" 
                 alt="Dashboard Mockup"
                 className="w-full transform group-hover:scale-[1.02] transition-transform duration-700"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent pointer-events-none" />
            </div>
            
            <div className="absolute -top-6 -right-6 bg-white p-4 rounded-2xl shadow-xl border border-gray-50 flex items-center gap-3 animate-bounce">
               <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                 <ShieldCheck size={20} />
               </div>
               <div>
                 <p className="text-[10px] uppercase font-black text-gray-400">Güvenlik</p>
                 <p className="text-xs font-bold">%100 Korumalı</p>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Review Sites Strip */}
      <section className="bg-[#F9FAFB] py-16 px-6 border-y border-gray-100 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-sm font-black text-gray-400 uppercase tracking-widest mb-10">Tüm platformlardaki yorumlarınızı tek bir merkezde topluyoruz:</p>
          <div className="flex flex-wrap justify-center gap-12 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            {['Google', 'Facebook', 'Trustpilot', 'Yelp', 'TripAdvisor', 'Zomato'].map(site => (
              <div key={site} className="flex items-center gap-2 font-black text-xl italic text-gray-400 hover:text-[#111827] transition-colors cursor-default">
                {site}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features - Zig Zag */}
      <section id="nasıl-çalışır" className="py-24 px-6 space-y-32">
        {/* Feature 1 */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="order-2 lg:order-1 relative">
             <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
                <div className="flex items-center gap-4 mb-6">
                   <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">1</div>
                   <h3 className="text-2xl font-black text-[#111827]">Widget'lar ile güven inşa edin</h3>
                </div>
                <div className="space-y-4">
                   <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Star size={12} className="fill-[#FDBF1D] text-[#FDBF1D]" />
                        <Star size={12} className="fill-[#FDBF1D] text-[#FDBF1D]" />
                        <Star size={12} className="fill-[#FDBF1D] text-[#FDBF1D]" />
                        <Star size={12} className="fill-[#FDBF1D] text-[#FDBF1D]" />
                        <Star size={12} className="fill-[#FDBF1D] text-[#FDBF1D]" />
                      </div>
                      <p className="text-sm font-bold text-gray-600">"Hizmet gerçekten harikaydı!" - Murat K.</p>
                   </div>
                </div>
             </div>
          </div>
          <div className="order-1 lg:order-2 space-y-6">
            <h2 className="text-4xl font-black text-[#111827]">Yorum widget'ları ve rozetleri <br /> ile güven oluşturun</h2>
            <p className="text-lg text-gray-500 leading-relaxed font-medium">
               En iyi yorumlarınızı sitenizin her yerinde sergileyin. Özel widget'larımız, yeni geri bildirim aldıkça otomatik olarak güncellenir.
            </p>
            <ul className="space-y-4 pt-4">
               {['Özelleştirilebilir temalar', 'Mobil uyumlu tasarım', 'Hafif ve hızlı script'].map(item => (
                 <li key={item} className="flex items-center gap-3 font-bold text-gray-700">
                   <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                     <CheckCircle2 size={14} />
                   </div>
                   {item}
                 </li>
               ))}
            </ul>
          </div>
        </div>

        {/* Feature 2 */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-6">
            <h2 className="text-4xl font-black text-[#111827]">Otomatik olarak yeni <br /> yorumlar toplayın</h2>
            <p className="text-lg text-gray-500 leading-relaxed font-medium">
               Yorum toplama sürecini otomatiğe bağlayın. E-posta, SMS veya masaüstü QR kodlarını kullanarak müşterilerinizden mükemmel anda geri bildirim isteyin.
            </p>
            <div className="p-6 bg-yellow-50 rounded-2xl border border-yellow-100">
               <p className="text-sm font-bold text-yellow-800 italic">"ReviewsFlow'u kullanmaya başladığımızdan beri Google puanımız sadece 2 ayda 3.8'den 4.7'ye çıktı!"</p>
               <span className="text-xs font-black text-yellow-600 mt-2 block">— Mamma's Burger</span>
            </div>
          </div>
          <div className="relative">
             <div className="aspect-square bg-[#FDBF1D]/10 rounded-full absolute -top-10 -right-10 w-64 h-64 -z-10 animate-pulse" />
             <div className="bg-white p-12 rounded-[40px] shadow-2xl border border-gray-100 flex items-center justify-center">
                <QrCode size={160} className="text-[#111827]" />
             </div>
          </div>
        </div>

        {/* Feature 3 */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="lg:order-2 space-y-6">
            <h2 className="text-4xl font-black text-[#111827]">İtibarınızı <br /> Güvence Altına Alın</h2>
            <p className="text-lg text-gray-500 leading-relaxed font-medium">
               Olumsuz yorumları henüz yayınlanmadan durdurun. Akıllı sistemimiz düşük puanlı geri bildirimleri tespit eder ve sorunu özel olarak çözebilmeniz için dahili bir forma yönlendirir.
            </p>
            <div className="flex items-center gap-4 py-4">
               <div className="p-4 bg-red-50 text-red-600 rounded-2xl">
                 <Shield size={32} />
               </div>
               <div>
                  <h4 className="font-black text-[#111827]">Kriz Yönetimi</h4>
                  <p className="text-sm text-gray-500 font-bold">Olumsuz yorumlar sisteminizde gizli kalır.</p>
               </div>
            </div>
          </div>
          <div className="lg:order-1 relative">
             <div className="bg-[#111827] p-8 rounded-3xl shadow-2xl space-y-6 text-white overflow-hidden relative">
                <div className="flex items-center gap-3">
                   {[1,2,3].map(i => <Star key={i} size={24} className="fill-red-500 text-red-500" />)}
                   {[4,5].map(i => <Star key={i} size={24} className="text-gray-600" />)}
                </div>
                <div className="space-y-3 opacity-80">
                   <div className="h-4 w-3/4 bg-gray-700 rounded-full" />
                   <div className="h-4 w-full bg-gray-700 rounded-full" />
                   <div className="h-4 w-1/2 bg-gray-700 rounded-full" />
                </div>
                <div className="pt-4">
                   <div className="bg-white text-[#111827] p-4 rounded-xl font-black text-center text-sm">
                      Yöneticiye Gönder
                   </div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/20 blur-[60px]" />
             </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 bg-[#F9FAFB]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-5xl font-black text-[#111827]">Basit ve Şeffaf Fiyatlandırma</h2>
            <p className="text-lg text-gray-500 font-bold italic underline decoration-[#FDBF1D] decoration-4 underline-offset-8">Tüm planları ücretsiz deneyin, kredi kartı gerekmez.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
             {/* Monthly */}
             <div className="bg-white p-10 rounded-[40px] shadow-sm border border-gray-100 hover:border-[#79C5D1] transition-all group">
                <h3 className="text-2xl font-black mb-2">Aylık Plan</h3>
                <p className="text-gray-500 font-bold text-sm mb-8">Henüz başlayan küçük işletmeler için mükemmel.</p>
                <div className="mb-10">
                   <span className="text-6xl font-black">₺500</span>
                   <span className="text-gray-400 font-bold tracking-tighter ml-2">/ aylık</span>
                </div>
                <ul className="space-y-5 mb-12">
                   {['Sınırsız QR Tarama', 'Dahili Geri Bildirim Sistemi', 'Yönetici Paneli', 'Mobil Optimize'].map(feat => (
                     <li key={feat} className="flex items-center gap-3 text-sm font-bold text-gray-600">
                        <CheckCircle2 size={18} className="text-[#79C5D1]" /> {feat}
                     </li>
                   ))}
                </ul>
                <a 
                  href="mailto:okanberk16@gmail.com?subject=Aylık%20Plan%20Başvurusu" 
                  className="block w-full text-center py-4 bg-[#111827] text-white font-black rounded-2xl hover:bg-black transition-all transform group-hover:scale-[1.02]"
                >
                   Aylık Seç
                </a>
             </div>

             {/* Yearly */}
             <div className="bg-white p-10 rounded-[40px] shadow-2xl border-4 border-[#FDBF1D] relative scale-105">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#FDBF1D] text-[#111827] px-6 py-2 rounded-full font-black text-xs uppercase italic tracking-widest shadow-lg whitespace-nowrap">
                   2 Ay Hediye
                </div>
                <h3 className="text-2xl font-black mb-2">Yıllık Plan</h3>
                <p className="text-gray-500 font-bold text-sm mb-8">Maliyetleri düşürün ve uzun vadeli büyümeye odaklanın.</p>
                <div className="mb-10">
                   <span className="text-6xl font-black">₺5.000</span>
                   <span className="text-gray-400 font-bold tracking-tighter ml-2">/ yıllık</span>
                </div>
                <ul className="space-y-5 mb-12">
                   {['Aylık Plandaki Her Şey', '2 AY ÜCRETSİZ', 'Öncelikli Destek', 'Google Yönlendirme Haritalama'].map(feat => (
                     <li key={feat} className="flex items-center gap-3 text-sm font-bold text-gray-600">
                        <CheckCircle2 size={18} className="text-[#FDBF1D]" /> {feat}
                     </li>
                   ))}
                </ul>
                <a 
                  href="mailto:okanberk16@gmail.com?subject=Yıllık%20Plan%20Başvurusu" 
                  className="block w-full text-center py-4 bg-[#FDBF1D] text-[#111827] font-black rounded-2xl hover:bg-[#EAB308] transition-all"
                >
                   Yıllık Seç
                </a>
             </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 text-center space-y-10">
         <h2 className="text-5xl font-black text-[#111827] max-w-2xl mx-auto leading-tight">
            14 Günlük Deneme İle <br /> ÜCRETSİZ Başlayın
         </h2>
         <a 
            href="mailto:okanberk16@gmail.com?subject=Ücretsiz%20Deneme%20Talebi" 
            className="inline-flex items-center gap-3 px-12 py-6 bg-[#79C5D1] hover:bg-[#68b4c0] text-white text-xl font-black rounded-2xl transition-all shadow-xl shadow-teal-500/20"
         >
            Ücretsiz Denemeyi Başlat <ArrowRight />
         </a>
         <div className="flex justify-center gap-6 pt-6 translate-y-4 grayscale opacity-40 select-none">
            <div className="font-extrabold italic text-2xl">KVKK Uyumlu</div>
            <div className="font-extrabold italic text-2xl">Güvenli Giriş</div>
         </div>
      </section>

      <MarketingFooter />

    </div>
  );
}
