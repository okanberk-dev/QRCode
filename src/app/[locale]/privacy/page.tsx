import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { getTranslations } from '@/lib/translations';
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
    title: isTr ? 'Gizlilik Politikası | Buaze' : 'Privacy Policy | Buaze',
    description: isTr 
      ? 'Kişisel verilerinizin korunması ve güvenliğine dair gizlilik politikamız.'
      : 'Our privacy policy regarding the protection and security of your personal data.',
  };
}

export function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const isTr = locale === 'tr';
  const t = getTranslations(locale);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#FCFBF7] selection:bg-[#FDBF1D]/30">
      <MarketingNavbar locale={locale} t={t} />

      <main className="flex-1 max-w-[900px] mx-auto w-full px-5 py-20 sm:py-32">
        <div className="bg-white p-8 sm:p-16 rounded-[32px] border-[3px] border-[#1f1e1d] shadow-[12px_14px_0_0_#1f1e1d]">
          <div className="mb-10">
            <h1 className="text-[28px] sm:text-[42px] font-black text-[#1f1e1d] tracking-[-0.03em] leading-tight mb-2">
              {isTr ? 'Gizlilik' : 'Privacy'} <span className="text-[#ea580c]">{isTr ? 'Politikası' : 'Policy'}</span>
            </h1>
            <p className="text-[13px] text-[#ada89f] font-bold uppercase tracking-widest">
              {isTr ? 'Son güncelleme: 13 Nisan 2026' : 'Last updated: April 13, 2026'}
            </p>
          </div>
          
          <div className="prose prose-neutral max-w-none text-[#4a4742] space-y-10 text-[15px] sm:text-[16px] leading-relaxed">
             <p className="font-bold text-[18px] text-[#1f1e1d]">
               {isTr 
                 ? 'Buaze olarak ("biz", "şirket", "platform"), kişisel verilerinizin gizliliğini korumayı taahhüt ediyoruz.' 
                 : 'As Buaze ("we", "company", "platform"), we are committed to protecting the privacy of your personal data.'}
             </p>

              <section className="space-y-4">
                <h2 className="text-[#1f1e1d] text-[22px] font-black tracking-tight">{isTr ? '1. Topladığımız Veriler' : '1. Data We Collect'}</h2>
                <p>
                  {isTr 
                    ? 'Hesap oluşturduğunuzda adınız, e-posta adresiniz, fatura bilgileriniz ve şirket profilinizi (şube adresleri vb.) toplarız. Ayrıca, sistem kullanımı sırasında platform metrikleri kaydedilmektedir.'
                    : 'When you create an account, we collect your name, email address, billing information, and company profile (e.g., branch locations). We also record platform metrics during system usage.'}
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-[#1f1e1d] text-[22px] font-black tracking-tight">{isTr ? '2. Verileri Nasıl Kullanıyoruz' : '2. How We Use Data'}</h2>
                <ul className="list-none space-y-3">
                  {[
                    isTr ? 'Hizmetlerimizi sağlamak ve iyileştirmek için,' : 'To provide and improve our services,',
                    isTr ? 'Faturalandırma ve abonelik yönetimini sağlamak için,' : 'To manage billing and subscriptions,',
                    isTr ? 'Önemli güncellemeler ve güvenlik uyarıları göndermek için.' : 'To send important updates and security notices.'
                  ].map((li, i) => (
                    <li key={i} className="flex items-center gap-3">
                       <span className="w-5 h-5 rounded-full bg-[#1f1e1d] flex-shrink-0 flex items-center justify-center text-white text-[10px]">✓</span>
                       <span className="font-bold text-[#1f1e1d]">{li}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-[#1f1e1d] text-[22px] font-black tracking-tight">{isTr ? '3. Veri Güvenliği' : '3. Data Security'}</h2>
                <p>
                  {isTr
                    ? 'Verileriniz modern SSL şifreleme ile korunmaktadır. Sunucularımız yüksek güvenlik standartlarına sahip tesislerde barındırılmaktadır.'
                    : 'Your data is protected with modern SSL encryption. Our servers are hosted in high-security facilities.'}
                </p>
              </section>

               <div className="pt-10 border-t border-[#e8e4de] flex flex-col sm:flex-row items-center justify-between gap-6">
                 <p className="text-[13px] text-[#ada89f] font-medium">
                   {isTr ? 'Sorularınız için bizimle iletişime geçin.' : 'Contact us for any questions.'}
                 </p>
                 <a href="mailto:hello@buaze.com" className="px-6 py-3 bg-[#1f1e1d] text-white rounded-xl text-[14px] font-bold hover:bg-[#ea580c] transition-colors">
                   hello@buaze.com
                 </a>
               </div>
          </div>
        </div>
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
