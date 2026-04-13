import { ShieldCheck, Mail, Smartphone, Bell, Zap } from 'lucide-react';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Ticari İleti Onayı — Buaze' : 'Marketing Consent — Buaze',
    description: locale === 'tr' 
      ? 'Ticari elektronik ileti gönderimine ilişkin bilgilendirme ve onay metni.'
      : 'Information and consent text for sending commercial electronic messages.',
    robots: { index: false, follow: false },
  };
}

export function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
}

export default async function ConsentMarketingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#FCFBF7] selection:bg-[#FDBF1D]/30">
      <MarketingNavbar locale={locale} t={t} />

      <main className="flex-1 max-w-[1000px] mx-auto w-full px-5 py-20 sm:py-32">
        <div className="bg-white p-10 sm:p-20 rounded-[48px] border-[4px] border-[#1f1e1d] shadow-[15px_20px_0_0_#FDBF1D] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FDBF1D]/5 rounded-full blur-[80px] translate-x-1/2 -translate-y-1/2" />
          
          <div className="mb-16 relative">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#111827] text-white rounded-xl mb-6 shadow-[4px_4px_0_0_#ea580c]">
               <ShieldCheck size={14} className="text-[#FDBF1D]" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">{isTr ? 'İLETİŞİM ONAYI' : 'COMMUNICATION CONSENT'}</span>
            </div>
            <h1 className="text-[32px] sm:text-[52px] font-black text-[#111827] tracking-tight leading-[1.1] mb-4 whitespace-pre-line">
              {isTr ? 'Ticari İleti ve Elektronik\nİletişim Beyanı' : 'Commercial Message and\nElectronic Communication'}
            </h1>
            <p className="text-[13px] text-[#ada89f] font-black uppercase tracking-widest">
              {isTr ? 'Son güncelleme: 13 Nisan 2026' : 'Last updated: April 13, 2026'}
            </p>
          </div>
          
          <div className="prose prose-neutral max-w-none text-[#4a4742] space-y-12 text-[16px] sm:text-[18px] leading-relaxed font-medium">
             <div className="p-8 bg-[#F7F4F0] rounded-3xl border-2 border-[#1f1e1d] border-dashed">
               <p className="font-black text-[#111827] m-0">
                 {isTr 
                   ? '6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun uyarınca, sizlere daha iyi hizmet verebilmek için iletişim kanalları üzerinden bilgilendirme yapılmaktadır.' 
                   : 'In accordance with the Law No. 6563 on the Regulation of Electronic Commerce, info is provided via communication channels to provide you with better service.'}
               </p>
             </div>

              <section className="space-y-8">
                <p>
                  {isTr
                    ? 'Buaze tarafından sunulan ürün, hizmet, özel teklif, kampanya ve güncellemeler hakkında aşağıdaki kanallar aracılığıyla bilgilendirilmeyi kabul ediyorum:'
                    : 'I agree to be informed about the products, services, special offers, campaigns, and updates offered by Buaze through the following channels:'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   {[
                     { icon: <Mail size={20} />, label: isTr ? 'E-posta' : 'Email' },
                     { icon: <Smartphone size={20} />, label: isTr ? 'SMS ve Arama' : 'SMS and Calls' },
                     { icon: <Bell size={20} />, label: isTr ? 'Push Bildirimleri' : 'Push Notifications' },
                     { icon: <Zap size={20} />, label: isTr ? 'Anlık Mesajlaşma' : 'Instant Messaging' }
                   ].map((item, idx) => (
                     <div key={idx} className="flex items-center gap-4 p-5 bg-white border-2 border-[#1f1e1d] rounded-2xl shadow-[4px_4px_0_0_#FDBF1D]">
                        <div className="w-12 h-12 bg-[#F7F4F0] border-2 border-[#1f1e1d] rounded-xl flex items-center justify-center text-[#111827] shadow-[2px_2px_0_0_#ea580c]">
                           {item.icon}
                        </div>
                        <span className="text-[15px] font-black text-[#111827] uppercase tracking-tight">{item.label}</span>
                     </div>
                   ))}
                </div>
              </section>

              <section className="space-y-6">
                 <h2 className="text-[#111827] text-[24px] sm:text-[28px] font-black tracking-tight">{isTr ? 'Cayma Hakkı (Opt-out)' : 'Right of Withdrawal (Opt-out)'}</h2>
                 <p>
                   {isTr
                     ? 'Dilediğiniz zaman, hiçbir gerekçe göstermeksizin bu onayı geri çekebilirsiniz. Her iletimizde size abonelikten çıkma seçeneği sunulmaktadır.'
                     : 'You can withdraw this consent at any time without giving any reason. Every message we send offers you an unsubscribe option.'}
                 </p>
                 <div className="p-8 bg-[#111827] text-[#ada89f] rounded-[32px] border-4 border-[#1f1e1d] shadow-[8px_10px_0_0_#ea580c]">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                       <p className="text-[14px] font-bold text-white max-w-[400px]">
                         {isTr 
                           ? 'Abonelikten çıkma talebiniz bize ulaştıktan sonra 3 iş günü içinde tüm gönderimler durdurulur.' 
                           : 'All transmissions will be stopped within 3 business days after your unsubscribe request reaches us.'}
                       </p>
                       <a href="mailto:hello@buaze.com" className="px-8 py-4 bg-white text-[#111827] rounded-xl text-[14px] font-black shadow-[4px_4px_0_0_#ea580c] hover:bg-[#FDBF1D] transition-all active:translate-y-[4px] active:shadow-none whitespace-nowrap">
                         hello@buaze.com
                       </a>
                    </div>
                 </div>
              </section>
          </div>
        </div>
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
