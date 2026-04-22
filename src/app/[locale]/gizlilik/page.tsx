import type { Metadata } from 'next';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Gizlilik Politikası — Buaze' : 'Privacy Policy — Buaze',
  };
}

export const dynamic = "force-dynamic";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);

  return (
    <div className="min-h-screen bg-[#F5F4F1] text-[#0F2348] font-sans pt-[64px]">
      <MarketingNavbar locale={locale} t={t} />

      <main className="flex-1 max-w-[900px] mx-auto w-full px-5 py-20 sm:py-32">
        <div className="bg-white p-8 sm:p-16 rounded-[32px] border-[3px] border-[#0F2348] shadow-[12px_14px_0_0_#0F2348]">
          <h1 className="text-[28px] sm:text-[42px] font-black text-[#0F2348] leading-tight mb-10 tracking-[-0.03em]">
             {locale === 'tr' ? 'Gizlilik' : 'Privacy'} <span className="text-[#FF9A14]">{locale === 'tr' ? 'Politikası' : 'Policy'}</span>
          </h1>
          
          <div className="prose prose-neutral max-w-none text-[#4a4742] space-y-10 text-[15px] sm:text-[16px] leading-relaxed">
            <p className="font-bold text-[18px] text-[#0F2348]">
              {locale === 'tr' 
                ? 'Buaze olarak ("biz", "şirket", "platform"), kişisel verilerinizin gizliliğini korumayı taahhüt ediyoruz.' 
                : 'As Buaze ("we", "company", "platform"), we are committed to protecting the privacy of your personal data.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {[
                 {
                   t: locale === 'tr' ? '1. Topladığımız Bilgiler' : '1. Information We Collect',
                   d: locale === 'tr'
                     ? 'Platforma kayıt olduğunuzda, IP adresi, cihaz bilgileri, tarayıcı türü gibi kullanım verilerini ve iletişim bilgilerinizi toplamaktayız.'
                     : 'When you register, we collect usage data (IP, device info, browser type) and contact information.'
                 },
                 {
                   t: locale === 'tr' ? '2. Bilgilerin Kullanımı' : '2. Use of Information',
                   d: locale === 'tr'
                     ? 'Toplanan veriler yalnızca hizmetin verilmesi, platform güvenliğinin sağlanması ve performans analizleri için kullanılır.'
                     : 'Data is used exclusively for service delivery, platform security, and performance analytics.'
                 },
                 {
                   t: locale === 'tr' ? '3. Çerezler (Cookies)' : '3. Cookies',
                   d: locale === 'tr'
                     ? 'Hizmetlerimizi iyileştirmek için oturum ve güvenlik çerezleri kullanıyoruz. Tercihlerinizi hatırlamamıza yardımcı olurlar.'
                     : 'We use session and security cookies to improve our services and remember your preferences.'
                 },
                 {
                   t: locale === 'tr' ? '4. Üçüncü Taraflarla Paylaşım' : '4. Third-Party Sharing',
                   d: locale === 'tr'
                     ? 'Verilerinizi asla satmayız. Yalnızca meşru hizmet sağlayıcılarımızla gizlilik çerçevesinde paylaşım yapıyoruz.'
                     : 'We never sell your data. We only share with legitimate providers under confidentiality.'
                 }
               ].map((item, i) => (
                 <div key={i} className="p-6 bg-[#F5F4F1] rounded-2xl border-2 border-[#0F2348] hover:bg-white transition-colors">
                    <h3 className="text-[17px] font-black text-[#0F2348] mb-3">{item.t}</h3>
                    <p className="text-[14px] text-[#243554]">{item.d}</p>
                 </div>
               ))}
            </div>

            <div className="pt-10 border-t border-[#C9D0DB] flex flex-col sm:flex-row items-center justify-between gap-6">
              <p className="text-[13px] text-[#6B7B93] font-medium">
                {locale === 'tr' ? 'Güncelleme Tarihi: 13 Nisan 2024' : 'Last Updated: April 13, 2024'}
              </p>
              <a href="mailto:hello@buaze.com" className="px-6 py-3 bg-[#0F2348] text-white rounded-xl text-[14px] font-bold hover:bg-[#FF9A14] transition-colors">
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
