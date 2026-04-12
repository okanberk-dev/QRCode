'use client';

import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export default function CookiePage() {
  const lastUpdated = '12 Nisan 2026';

  return (
    <div className="min-h-screen bg-white text-[#111827] font-sans">
      <MarketingNavbar />

      <section className="pt-48 pb-24 px-6">
        <div className="max-w-3xl mx-auto space-y-10">
           <div className="space-y-4">
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight">Çerez Politikası</h1>
              <p className="text-sm font-black text-gray-400 uppercase tracking-widest italic tracking-tighter">Son Güncelleme: {lastUpdated}</p>
           </div>

           <div className="prose prose-slate max-w-none text-gray-600 font-medium leading-relaxed space-y-8">
              <p>Bu politika, ReviewsFlow web sitemizi ziyaret ettiğinizde sizi tanımak için çerezleri ve benzer teknolojileri nasıl kullandığımızı açıklar.</p>

              <section className="space-y-4">
                 <h2 className="text-2xl font-black text-[#111827]">Çerez nedir?</h2>
                 <p>Çerezler, bir web sitesini ziyaret ettiğinizde bilgisayarınıza veya mobil cihazınıza yerleştirilen küçük veri dosyalarıdır. Web sitelerinin daha verimli çalışmasını sağlamak için yaygın olarak kullanılırlar.</p>
              </section>

              <section className="space-y-4">
                 <h2 className="text-2xl font-black text-[#111827]">Çerezleri neden kullanıyoruz?</h2>
                 <p>Kimlik doğrulama ve hesap oturumunuzu korumak için temel çerezler kullanıyoruz. Ayrıca ziyaretçilerin sitemizle nasıl etkileşim kurduğunu anlamak için analitik çerezler kullanabiliriz.</p>
              </section>

              <section className="space-y-4">
                 <h2 className="text-2xl font-black text-[#111827]">Seçenekleriniz ve Kontrol</h2>
                 <p>Tarayıcı ayarlarınız üzerinden çerezleri kabul edebilir veya reddedebilirsiniz. Çerezleri reddetmeyi seçerseniz, admin paneli gibi bazı işlevlere erişiminiz kısıtlanabilir.</p>
              </section>
           </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
