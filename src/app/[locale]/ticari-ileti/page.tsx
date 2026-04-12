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
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <MarketingNavbar locale={locale} t={t} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-32">
        <div className="bg-white p-10 sm:p-14 rounded-3xl shadow-sm border border-gray-100">
          <h1 className="text-3xl sm:text-4xl font-black text-[#111827] mb-8">Ticari İletişim ve Elektronik İleti Onayı</h1>
          
          <div className="prose prose-gray max-w-none text-gray-600 space-y-6">
            <p>
              6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun ve ilgili mevzuat uyarınca, <strong>Buaze Teknoloji</strong> tarafından sunulan ürün, hizmet, özel teklif, kampanya ve güncellemeler hakkında bilgilendirilmek amacıyla;
            </p>

            <p>
              Tarafıma e-posta, SMS (kısa mesaj), telefon, push bildirimi ve diğer anlık mesajlaşma kanalları aracılığıyla <strong>ticari elektronik ileti gönderilmesine onayım olduğunu beyan ve kabul ederim</strong>.
            </p>

            <h3 className="text-xl font-bold text-[#111827] mt-8">İleti Gönderiminin Reddedilmesi</h3>
            <p>
              Tarafınıza gönderilen e-postaların alt kısmında yer alan "Abonelikten Çık" (Unsubscribe) bağlantısına tıklayarak veya <a href="mailto:hello@buaze.com" className="text-blue-600 hover:underline">hello@buaze.com</a> adresine ret beyanınızı ileterek dilediğiniz zaman (hiçbir gerekçe göstermeksizin) bu onayınızı iptal edebilirsiniz. Ret bildiriminiz ulaştıktan sonra 3 iş günü içinde tarafınıza ticari ileti gönderimi durdurulacaktır.
            </p>
          </div>
        </div>
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
