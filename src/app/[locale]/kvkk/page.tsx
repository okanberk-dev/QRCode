import type { Metadata } from 'next';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export const metadata: Metadata = {
  title: 'KVKK Aydınlatma Metni — Buaze',
  robots: { index: false, follow: false },
};

export default async function KVKKPage({
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
          <h1 className="text-3xl sm:text-4xl font-black text-[#111827] mb-8">Kişisel Verilerin Korunması ve İşlenmesi Aydınlatma Metni</h1>
          
          <div className="prose prose-gray max-w-none text-gray-600 space-y-6">
            <p className="font-medium">
              Veri Sorumlusu: <strong>Buaze Teknoloji ("Şirket" veya "Buaze")</strong> olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") ve ilgili alt mevzuat kapsamında kişisel verilerinizin işlenmesine ve korunmasına büyük önem veriyoruz.
            </p>

            <h3 className="text-xl font-bold text-[#111827] mt-8">1. İşlenen Kişisel Verileriniz</h3>
            <p>
              Hizmetlerimizi kullanımınıza bağlı olarak aşağıdaki kişisel verilerinizi işleyebilmekteyiz:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Kimlik ve İletişim Verileri:</strong> Adınız, soyadınız, e-posta adresiniz, telefon numaranız, firma adınız.</li>
              <li><strong>İşlem Güvenliği Verileri:</strong> IP adresi bilgileri, şifre ve parola bilgileri, sistem erişim logları, çerez kayıtları.</li>
              <li><strong>Müşteri İşlem Verileri:</strong> Abonelik paket bilgileriniz, fatura detayları, talep ve şikayet kayıtlarınız.</li>
            </ul>

            <h3 className="text-xl font-bold text-[#111827] mt-8">2. İşleme Amaçları ve Hukuki Sebepler</h3>
            <p>Kişisel verileriniz, aşağıda belirtilen amaçlarla ve KVKK'nın 5/2 maddesindeki ilgili hukuki sebeplere dayanılarak işlenmektedir:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Sözleşmenin kurulması veya ifası: Üyelik işlemlerinizin gerçekleştirilmesi, platform hizmetlerinin sunulması.</li>
              <li>Hukuki yükümlülüğümüzün yerine getirilmesi: Fatura düzenlenmesi, vergi kanunlarına ve elektronik ticaret mevzuatına uyum sağlanması.</li>
              <li>Meşru menfaatimiz: Platformun güvenliğinin sağlanması, hataların tespit edilmesi, sahteciliğin önlenmesi.</li>
            </ul>

            <h3 className="text-xl font-bold text-[#111827] mt-8">3. Kişisel Verilerin Aktarımı</h3>
            <p>
              Verileriniz, yukarıdaki amaçlarla sınırlı olarak; hizmet aldığımız sunucu ve bulut hizmeti sağlayıcılarına (yurtiçi/yurtdışı pazar standartlarında güvenlik sağlayan firmalara), yasal zorunluluklar gereği yetkili kamu kurumlarına aktarılabilmektedir.
            </p>

            <h3 className="text-xl font-bold text-[#111827] mt-8">4. Haklarınız</h3>
            <p>
              KVKK'nın 11. maddesi kapsamındaki haklarınızı (verinizin işlenip işlenmediğini öğrenme, yanlış ise düzeltilmesini isteme, silinmesini veya yok edilmesini talep etme vb.) kullanmak için <a href="mailto:hello@buaze.com" className="text-blue-600 hover:underline">hello@buaze.com</a> adresi üzerinden bizimle iletişime geçebilirsiniz.
            </p>
            <p className="text-sm mt-8 border-t border-gray-100 pt-8">
              Son Güncelleme: {new Date().toLocaleDateString('tr-TR')}
            </p>
          </div>
        </div>
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
