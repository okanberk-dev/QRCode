'use client';

import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export default function TermsPage() {
  const lastUpdated = '12 Nisan 2026';

  return (
    <div className="min-h-screen bg-white text-[#111827] font-sans">
      <MarketingNavbar />

      <section className="pt-48 pb-24 px-6">
        <div className="max-w-3xl mx-auto space-y-10">
           <div className="space-y-4">
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight">Kullanım Şartları</h1>
              <p className="text-sm font-black text-gray-400 uppercase tracking-widest italic tracking-tighter">Son Güncelleme: {lastUpdated}</p>
           </div>

           <div className="prose prose-slate max-w-none text-gray-600 font-medium leading-relaxed space-y-8">
              <section className="space-y-4">
                 <h2 className="text-2xl font-black text-[#111827]">1. Şartların Kabulü</h2>
                 <p>ReviewsFlow hizmetlerine erişerek veya kullanarak bu Kullanım Şartlarına bağlı kalmayı kabul etmiş olursunuz. Şartları kabul etmiyorsanız hizmetlerimizi kullanamazsınız.</p>
              </section>

              <section className="space-y-4">
                 <h2 className="text-2xl font-black text-[#111827]">2. Hizmet Kullanımı</h2>
                 <p>Hizmetimizi yalnızca yasal amaçlar doğrultusunda kullanmalısınız. Hesap giriş bilgilerinizin gizliliğini korumak sizin sorumluluğunuzdadır.</p>
              </section>

              <section className="space-y-4">
                 <h2 className="text-2xl font-black text-[#111827]">3. Ödemeler ve Abonelikler</h2>
                 <p>Abonelikler aylık veya yıllık bazda Türk Lirası (TRY) üzerinden faturalandırılır. Tüm ödemeler, 14 günlük deneme süresi haricinde, aksi belirtilmedikçe iade edilemez.</p>
              </section>

              <section className="space-y-4">
                 <h2 className="text-2xl font-black text-[#111827]">4. Hizmetin Durdurulması</h2>
                 <p>Bu şartları ihlal ettiğine inandığımız durumlarda, önceden bildirmeksizin hizmete erişiminizi askıya alma veya sonlandırma hakkımızı saklı tutarız.</p>
              </section>
           </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
