'use client';

import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export default function PrivacyPage() {
  const lastUpdated = '12 Nisan 2026';

  return (
    <div className="min-h-screen bg-white text-[#111827] font-sans">
      <MarketingNavbar />

      <section className="pt-48 pb-24 px-6">
        <div className="max-w-3xl mx-auto space-y-10">
           <div className="space-y-4">
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight">Gizlilik Politikası</h1>
              <p className="text-sm font-black text-gray-400 uppercase tracking-widest italic tracking-tighter">Son Güncelleme: {lastUpdated}</p>
           </div>

           <div className="prose prose-slate max-w-none text-gray-600 font-medium leading-relaxed space-y-8">
              <section className="space-y-4">
                 <h2 className="text-2xl font-black text-[#111827]">1. Topladığımız Bilgiler</h2>
                 <p>Hizmetimizi kullandığınızda doğrudan sağladığınız bilgileri (ad, e-posta adresi ve işletme bilgileri) topluyoruz.</p>
              </section>

              <section className="space-y-4">
                 <h2 className="text-2xl font-black text-[#111827]">2. Bilgilerin Kullanımı</h2>
                 <p>Bilgilerinizi hizmetlerimizi sağlamak, yönetmek ve iyileştirmek; yorum taleplerini otomatikleştirmek ve geri bildirim sistemini yönetmek için kullanıyoruz.</p>
              </section>

              <section className="space-y-4">
                 <h2 className="text-2xl font-black text-[#111827]">3. Veri Güvenliği</h2>
                 <p>Verilerinizi kayıp, hırsızlık, kötüye kullanım ve yetkisiz erişime karşı korumak için endüstri standardı güvenlik protokollerini uyguluyoruz.</p>
              </section>

              <section className="space-y-4">
                 <h2 className="text-2xl font-black text-[#111827]">4. İletişim</h2>
                 <p>Bu Gizlilik Politikası hakkında sorularınız varsa okanberk16@gmail.com adresinden bizimle iletişime geçebilirsiniz.</p>
              </section>
           </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
