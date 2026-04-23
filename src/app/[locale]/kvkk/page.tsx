import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { getTranslations } from '@/lib/translations';
import { ShieldCheck } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === 'tr';
  return {
    title: isTr ? 'KVKK Aydınlatma Metni - Buaze' : 'KVKK Clarification Text - Buaze',
    description: isTr 
      ? '6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında aydınlatma metnimiz.'
      : 'Our clarification text within the scope of the Personal Data Protection Law (KVKK).',
  };
}

export const dynamic = "force-dynamic";

export default async function KvkkPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#FFFFFF] selection:bg-[#C6F24E]/30">
      <MarketingNavbar locale={locale} t={t} />

      <main className="flex-1 max-w-[1000px] mx-auto w-full px-5 py-20 sm:py-32">
        <div className="bg-white p-10 sm:p-20 rounded-[48px] border border-[#0A0A0A] shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#C6F24E]/5 rounded-full blur-[80px] translate-x-1/2 -translate-y-1/2" />
          
          <div className="mb-16 relative">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#0A0A0A] text-white rounded-xl mb-6 shadow-md">
               <ShieldCheck size={14} className="text-[#C6F24E]" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">{isTr ? 'YASAL UYARI' : 'LEGAL NOTICE'}</span>
            </div>
            <h1 className="text-[36px] sm:text-[56px] font-extrabold text-[#0A0A0A] tracking-tight leading-none mb-4 whitespace-pre-line">
              {isTr ? 'KVKK\nAydınlatma Metni' : 'Personal Data\nProtection Policy (KVKK)'}
            </h1>
            <p className="text-[13px] text-[#6B7280] font-black uppercase tracking-widest">
              {isTr ? 'Son güncelleme: 13 Nisan 2026' : 'Last updated: April 13, 2026'}
            </p>
          </div>
          
          <div className="prose prose-neutral max-w-none text-[#4a4742] space-y-12 text-[16px] sm:text-[18px] leading-relaxed font-medium">
             <div className="p-8 bg-[#FFFFFF] rounded-3xl border-2 border-[#0A0A0A] border-dashed">
               <p className="font-black text-[#0A0A0A] m-0">
                 {isTr 
                   ? 'Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, veri sorumlusu sıfatıyla Buaze tarafından kişisel verilerinizin işlenmesine ilişkin detayları içerir.' 
                   : 'This text contains details regarding the processing of your personal data by Buaze as the data controller in accordance with the Law No. 6698 on the Protection of Personal Data ("KVKK").'}
               </p>
             </div>

              <section className="space-y-6">
                <h2 className="text-[#0A0A0A] text-[24px] sm:text-[28px] font-extrabold tracking-tight">{isTr ? '1. Veri Sorumlusu' : '1. Data Controller'}</h2>
                <p>
                  {isTr 
                    ? 'Buaze platformu, kullanıcılarının gizliliğine ve kişisel verilerinin korunmasına en üst düzeyde önem vermektedir. Veri sorumlusu olarak tüm süreçlerimizi KVKK standartlarına uygun şekilde yürütmekteyiz.'
                    : 'The Buaze platform attaches the highest importance to the privacy of its users and the protection of their personal data. As the data controller, we carry out all our processes in accordance with KVKK standards.'}
                </p>
              </section>

              <section className="space-y-6">
                <h2 className="text-[#0A0A0A] text-[24px] sm:text-[28px] font-extrabold tracking-tight">{isTr ? '2. Kişisel Verilerin İşlenme Amaçları' : '2. Purposes of Processing Personal Data'}</h2>
                <p>
                  {isTr
                    ? 'Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:'
                    : 'Your personal data is processed for the following purposes:'}
                </p>
                <ul className="list-disc pl-6 space-y-3 marker:text-[#C6F24E]">
                   <li>{isTr ? 'Hizmetlerimizin sunulması ve platformun iyileştirilmesi' : 'Provision of our services and improvement of the platform'}</li>
                   <li>{isTr ? 'Müşteri geri bildirim süreçlerinin yönetilmesi' : 'Management of customer feedback processes'}</li>
                   <li>{isTr ? 'Yasal yükümlülüklerin yerine getirilmesi' : 'Fulfillment of legal obligations'}</li>
                   <li>{isTr ? 'İletişim faaliyetlerinin yürütülmesi' : 'Execution of communication activities'}</li>
                </ul>
              </section>

              <section className="space-y-6">
                <h2 className="text-[#0A0A0A] text-[24px] sm:text-[28px] font-extrabold tracking-tight">{isTr ? '3. İşlenen Veri Kategorileri' : '3. Categories of Processed Data'}</h2>
                <p>
                  {isTr
                   ? 'Platform kullanımı sırasında işlenen veriler; kimlik bilgileri (isim-soyisim), iletişim bilgileri (e-posta, telefon), işlem güvenliği bilgileri ve müşteri işlem verilerini kapsamaktadır.'
                   : 'Data processed during platform use includes identity information (name-surname), contact information (e-mail, phone), transaction security information, and customer transaction data.'}
                </p>
              </section>

              <section className="space-y-6">
                <h2 className="text-[#0A0A0A] text-[24px] sm:text-[28px] font-extrabold tracking-tight">{isTr ? '4. İlgili Kişi Hakları' : '4. Rights of the Data Subject'}</h2>
                <p>
                  {isTr
                    ? 'KVKK’nın 11. maddesi uyarınca herkes veri sorumlusuna başvurarak kendisiyle ilgili;'
                    : 'In accordance with Article 11 of the KVKK, everyone may apply to the data controller to request regarding themselves;'}
                </p>
                <ul className="list-disc pl-6 space-y-3 marker:text-[#C6F24E]">
                   <li>{isTr ? 'Verilerin işlenip işlenmediğini öğrenme' : 'Learning whether the data is processed or not'}</li>
                   <li>{isTr ? 'Veriler işlenmişse bilgi talep etme' : 'Requesting information if data has been processed'}</li>
                   <li>{isTr ? 'İşleme amacına uygun kullanılıp kullanılmadığını öğrenme' : 'Learning whether it is used in accordance with the processing purpose'}</li>
                   <li>{isTr ? 'Eksik veya yanlış işlenmişse düzeltilmesini isteme' : 'Requesting correction if it is incomplete or incorrectly processed'}</li>
                </ul>
              </section>

               <div className="pt-16 border-t-2 border-[#FFFFFF] flex flex-col sm:flex-row items-center justify-between gap-8 relative z-10">
                 <div className="space-y-1">
                   <p className="text-[14px] font-black text-[#0A0A0A] uppercase tracking-widest leading-none">
                     {isTr ? 'VERİ TALEPLERİ İÇİN' : 'FOR DATA REQUESTS'}
                   </p>
                   <p className="text-[14px] text-[#6B7280] font-bold">
                     {isTr ? 'kvkk@buaze.com adresine yazın.' : 'Write to kvkk@buaze.com'}
                   </p>
                 </div>
                 <a href="mailto:kvkk@buaze.com" className="px-10 py-5 bg-[#0A0A0A] text-white rounded-2xl text-[15px] font-black shadow-md hover:bg-[#0A0A0A] transition-all active:translate-y-[6px] active:shadow-none uppercase tracking-widest">
                   kvkk@buaze.com
                 </a>
               </div>
          </div>
        </div>
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
