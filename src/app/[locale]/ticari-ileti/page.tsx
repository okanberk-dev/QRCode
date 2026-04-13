import type { Metadata } from 'next';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export const metadata: Metadata = {
  title: 'Ticari İleti Onayı — Buaze',
  robots: { index: false, follow: false },
};

export default async function ConsentMarketingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);

  return (
    <div className="min-h-screen bg-[#FCFBF7] text-[#1f1e1d] font-sans pt-[64px]">
      <MarketingNavbar locale={locale} t={t} />

      <main className="flex-1 max-w-[900px] mx-auto w-full px-5 py-20 sm:py-32">
        <div className="bg-white p-8 sm:p-16 rounded-[32px] border-[3px] border-[#1f1e1d] shadow-[12px_14px_0_0_#1f1e1d]">
          <h1 className="text-[28px] sm:text-[42px] font-black text-[#1f1e1d] leading-tight mb-10 tracking-[-0.03em]">
             Ticari İletişim ve <span className="text-[#ea580c]">Elektronik İleti Onayı</span>
          </h1>
          
          <div className="prose prose-neutral max-w-none text-[#4a4742] space-y-8 text-[15px] sm:text-[16px] leading-relaxed">
            <p className="font-medium">
              6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun ve ilgili mevzuat uyarınca, <strong className="text-[#1f1e1d]">Buaze Teknoloji</strong> tarafından sunulan ürün, hizmet, özel teklif, kampanya ve güncellemeler hakkında bilgilendirilmek amacıyla;
            </p>

            <div className="p-8 bg-[#fdfdfd] border-2 border-[#1f1e1d] rounded-2xl shadow-[4px_5px_0_0_#1f1e1d]">
              <p className="font-bold text-[#1f1e1d] leading-relaxed">
                Tarafıma e-posta, SMS (kısa mesaj), telefon, push bildirimi ve diğer anlık mesajlaşma kanalları aracılığıyla <span className="text-[#ea580c]">ticari elektronik ileti gönderilmesine onayım olduğunu beyan ve kabul ederim</span>.
              </p>
            </div>

            <h3 className="text-[22px] font-black text-[#1f1e1d] mt-12 mb-4 tracking-[-0.01em]">İleti Gönderiminin Reddedilmesi</h3>
            <p>
              Tarafınıza gönderilen e-postaların alt kısmında yer alan "Abonelikten Çık" (Unsubscribe) bağlantısına tıklayarak veya <a href="mailto:hello@buaze.com" className="text-[#ea580c] font-bold hover:underline">hello@buaze.com</a> adresine ret beyanınızı ileterek dilediğiniz zaman (hiçbir gerekçe göstermeksizin) bu onayınızı iptal edebilirsiniz. Ret bildiriminiz ulaştıktan sonra 3 iş günü içinde tarafınıza ticari ileti gönderimi durdurulacaktır.
            </p>
          </div>
        </div>
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
