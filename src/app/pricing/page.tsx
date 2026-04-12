'use client';

import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Ücretsiz deneme süreci nasıl işliyor?',
      a: '14 gün boyunca tüm platform özelliklerini kredi kartı gerektirmeden test edebilirsiniz. Deneme süresi sonunda ücretli bir plana geçebilir veya hesabınızın dondurulmasını bekleyebilirsiniz.'
    },
    {
      q: 'Plandan plana geçiş yapabilir miyim?',
      a: 'Kesinlikle. 2 aylık indirim avantajından yararlanmak için dilediğiniz zaman Aylık plandan Yıllık plana geçebilirsiniz. Alt paketlere geçişler fatura dönemi sonunda gerçekleşir.'
    },
    {
      q: 'Verilerim güvende mi?',
      a: 'Evet. Tüm veriler için endüstri standardı şifreleme ve güvenli kimlik doğrulama protokolleri kullanıyoruz. Müşteri geri bildirimleriniz en yüksek gizlilik standartlarıyla işlenir.'
    },
    {
      q: 'Kurulumda yardımcı oluyor musunuz?',
      a: 'Evet, ekibimiz QR kodlarınızı yapılandırmanıza, şubelerinizi kurmanıza ve Google Place ID bağlantılarını doğru şekilde yapmanıza yardımcı olmaya hazırdır. Destek birimimize ulaşmanız yeterli.'
    }
  ];

  return (
    <div className="min-h-screen bg-white text-[#111827] font-sans">
      <MarketingNavbar />

      <section className="pt-48 pb-24 px-6 bg-[#F9FAFB]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-4">
             <h1 className="text-5xl sm:text-7xl font-black tracking-tight">Net Fiyatlandırma</h1>
             <p className="text-xl text-gray-500 font-bold max-w-2xl mx-auto leading-relaxed">
               İşletmenize en uygun planı seçin. Gizli ücretler, karmaşık limitler yok.
             </p>
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
                   {['Sınırsız QR Tarama', 'Dahili Geri Bildirim Sistemi', 'Yönetici Paneli', 'Mobil Optimize Tasarım'].map(feat => (
                     <li key={feat} className="flex items-center gap-3 text-sm font-bold text-gray-600">
                        <CheckCircle2 size={18} className="text-[#79C5D1]" /> {feat}
                     </li>
                   ))}
                </ul>
                <a 
                  href="mailto:okanberk16@gmail.com?subject=Aylık%20Plan%20Bilgi" 
                  className="block w-full text-center py-4 bg-[#111827] text-white font-black rounded-2xl hover:bg-black transition-all transform group-hover:scale-[1.02]"
                >
                  Ayık Planı Seç
                </a>
             </div>

             {/* Yearly */}
             <div className="bg-white p-10 rounded-[40px] shadow-2xl border-4 border-[#FDBF1D] relative scale-105">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#FDBF1D] text-[#111827] px-6 py-2 rounded-full font-black text-xs uppercase italic tracking-widest shadow-lg whitespace-nowrap">
                   2 Ay Ücretsiz
                </div>
                <h3 className="text-2xl font-black mb-2">Yıllık Plan</h3>
                <p className="text-gray-500 font-bold text-sm mb-8">Maliyetlerden tasarruf edin ve büyümeye odaklanın.</p>
                <div className="mb-10">
                   <span className="text-6xl font-black">₺5.000</span>
                   <span className="text-gray-400 font-bold tracking-tighter ml-2">/ yıllık</span>
                </div>
                <ul className="space-y-5 mb-12">
                   {['Aylık Plandaki Her Şey', '2 AY ÜCRETSİZ', 'Öncelikli Teknik Destek', 'Google Yönlendirme Haritalama'].map(feat => (
                     <li key={feat} className="flex items-center gap-3 text-sm font-bold text-gray-600">
                        <CheckCircle2 size={18} className="text-[#FDBF1D]" /> {feat}
                     </li>
                   ))}
                </ul>
                <a 
                  href="mailto:okanberk16@gmail.com?subject=Yıllık%20Plan%20Bilgi" 
                  className="block w-full text-center py-4 bg-[#FDBF1D] text-[#111827] font-black rounded-2xl hover:bg-[#EAB308] transition-all"
                >
                   Yıllık Planı Seç
                </a>
             </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-6 max-w-3xl mx-auto font-medium">
         <div className="text-center mb-16 space-y-2">
            <h2 className="text-4xl font-black mb-4">Sıkça Sorulan Sorular</h2>
            <p className="text-gray-400 font-bold">Hizmet hakkında bilmeniz gereken her şey.</p>
         </div>

         <div className="space-y-4">
            {faqs.map((faq, index) => (
               <div key={index} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  <button 
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full px-8 py-6 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                  >
                     <span className="text-lg font-black text-[#111827]">{faq.q}</span>
                     {openFaq === index ? <ChevronUp size={20} className="text-[#79C5D1]" /> : <ChevronDown size={20} className="text-gray-400" />}
                  </button>
                  {openFaq === index && (
                     <div className="px-8 pb-8 text-gray-500 font-bold underline-offset-4 leading-relaxed animate-fade-in">
                        {faq.a}
                     </div>
                  )}
               </div>
            ))}
         </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
