import type { Metadata } from 'next';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export const metadata: Metadata = {
  title: 'Açık Rıza Metni — Buaze',
  robots: { index: false, follow: false },
};

export default async function ConsentPage({
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
          <h1 className="text-3xl sm:text-4xl font-black text-[#111827] mb-8">Kişisel Verilerin İşlenmesine İlişkin Açık Rıza Metni</h1>
          
          <div className="prose prose-gray max-w-none text-gray-600 space-y-6">
            <p>
              Buaze platformuna üye olurken / hizmet ve ürünlerden yararlanırken tarafıma sunulan Aydınlatma Metni'ni 
              okuduğumu, anladığımı ve Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında kişisel verilerimin işlenmesi ile ilgili 
              tüm süreçler hakkında bilgilendirildiğimi kabul ederim.
            </p>

            <p>
              Bu kapsamda; kimlik, iletişim, müşteri işlem, finansal ve pazarlama işlem verilerimin:
            </p>
            
            <ul className="list-disc pl-5 space-y-2">
              <li>Ürün ve hizmetlere bağlılık süreçlerinin yürütülmesi,</li>
              <li>Müşteri memnuniyetine yönelik süreçlerin planlanması ve icrası,</li>
              <li>Bana özel kişiselleştirilmiş tekliflerin, kampanyaların ve pazarlama faaliyetlerinin sunulması,</li>
              <li>Şirket'in sunduğu ürün ve hizmetlerin beğeni, kullanım alışkanlıklarım ve ihtiyaçlarıma göre özelleştirilerek önerilmesi</li>
            </ul>

            <p>
              amaçlarıyla Şirket ("Buaze") tarafından işlenmesine, bu verilerin sunucu/bulut sağlayıcısı olarak hizmet 
              alınan (sunucuları yurt dışında bulunabilen) teknoloji altyapı firmalarına aktarılmasına 
              <strong> hür irademle onay veriyorum</strong>.
            </p>

             <p className="text-sm mt-8 border-t border-gray-100 pt-8">
              Aydınlatma Metnine istinaden, dilediğiniz zaman "hello@buaze.com" adresi üzerinden bizimle iletişime geçerek, rızanızı geri çekme veya verilerinize erişme hakkına sahip olduğunuzu hatırlatırız.
            </p>
          </div>
        </div>
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
