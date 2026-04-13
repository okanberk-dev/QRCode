import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { getTranslations } from '@/lib/translations';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'KVKK Aydınlatma Metni | Buaze',
    description: '6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında aydınlatma metnimiz.',
  };
}

export default async function KvkkPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations(locale);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#FCFBF7] selection:bg-[#FDBF1D]/30">
      <MarketingNavbar locale={locale} t={t} />

      <main className="flex-1 pt-[120px] sm:pt-[150px] pb-16 sm:pb-24">
        <div className="max-w-[760px] mx-auto px-5 sm:px-8">
          <div className="mb-8">
            <h1 className="text-[36px] sm:text-[46px] font-extrabold text-[#1f1e1d] tracking-[-0.03em] leading-[1.1] mb-2">
              KVKK Aydınlatma Metni
            </h1>
            <p className="text-[14px] text-[#6b6760] font-medium">
              Son güncelleme: 13 Nisan 2026
            </p>
          </div>
          
          <div className="bg-white rounded-[24px] border-[2.5px] border-[#1f1e1d] p-8 sm:p-12 shadow-[6px_8px_0_0_#1f1e1d]">
            <article className="space-y-6 text-[#4a4742] leading-relaxed">
              <section className="space-y-3">
                <h2 className="text-[#1f1e1d] text-[22px] font-extrabold">1. Veri Sorumlusu</h2>
                <p>
                  6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, kişisel verileriniz veri sorumlusu olarak Buaze ("Şirket") tarafından aşağıda açıklanan amaçlar kapsamında işlenebilecektir.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-[#1f1e1d] text-[22px] font-extrabold">2. Kişisel Verilerin İşlenme Amacı</h2>
                <p>
                  Şirketimiz tarafından toplanan kişisel verileriniz, temel olarak itibar yönetimi yazılım hizmetlerimizin sunulması, faturalandırma ve ödeme işlemlerinin gerçekleştirilmesi ile güvenliğin sağlanması amaçlarıyla sınırlı kalarak işlenmektedir.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-[#1f1e1d] text-[22px] font-extrabold">3. Kişisel Verilerin Aktarılması</h2>
                <p>
                  Kişisel verileriniz, yasal mevzuat gereğince zorunlu olan kamu kurumlarıyla ve sistemin altyapısını sağlayan teknik servis sağlayıcılarımızla sadece amaçla bağlantılı ve ölçülü olarak paylaşılabilecektir.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-[#1f1e1d] text-[22px] font-extrabold">4. İlgili Kişinin Hakları</h2>
                <p>
                  KVKK'nın 11. maddesi uyarınca veri sahipleri; kişisel verilerinin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme, amacına uygun kullanılıp kullanılmadığını öğrenme ve eksik/yanlış verilerin düzeltilmesini talep etme hakkına sahiptir. Taleplerinizi yasal formlara uygun olarak iletişim kanalımızdan bize iletebilirsiniz.
                </p>
              </section>

            </article>
          </div>
        </div>
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
