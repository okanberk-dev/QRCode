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
    title: isTr ? 'Gizlilik Politikası - Buaze' : 'Privacy Policy - Buaze',
    description: isTr 
      ? 'Kişisel verilerinizin korunması ve güvenliğine dair gizlilik politikamız.'
      : 'Our privacy policy regarding the protection and security of your personal data.',
  };
}

export const dynamic = "force-dynamic";

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

      <main className="flex-1 max-w-[1000px] mx-auto w-full px-5 py-20 sm:py-32">
        <div className="bg-white p-10 sm:p-20 rounded-[48px] border-[4px] border-[#1f1e1d] shadow-[15px_20px_0_0_#FDBF1D] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FDBF1D]/5 rounded-full blur-[80px] translate-x-1/2 -translate-y-1/2" />
          
          <div className="mb-16 relative">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#111827] text-white rounded-xl mb-6 shadow-[4px_4px_0_0_#ea580c]">
               <ShieldCheck size={14} className="text-[#FDBF1D]" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">{isTr ? 'GİZLİLİK POLİTİKASI' : 'PRIVACY POLICY'}</span>
            </div>
            <h1 className="text-[36px] sm:text-[56px] font-black text-[#111827] tracking-tight leading-none mb-4 whitespace-pre-line">
              {isTr ? 'Veri ve Gizlilik\nPolitikamız' : 'Data and Privacy\nPolicy'}
            </h1>
            <p className="text-[13px] text-[#ada89f] font-black uppercase tracking-widest">
              {isTr ? 'Son güncelleme: 13 Nisan 2026' : 'Last updated: April 13, 2026'}
            </p>
          </div>
          
          <div className="prose prose-neutral max-w-none text-[#4a4742] space-y-12 text-[16px] sm:text-[18px] leading-relaxed font-medium">
             <div className="p-8 bg-[#F7F4F0] rounded-3xl border-2 border-[#1f1e1d] border-dashed">
               <p className="font-black text-[#111827] m-0">
                 {isTr 
                   ? 'Buaze olarak kişisel verilerinizin gizliliğini ve güvenliğini en büyük önceliğimiz olarak görüyoruz. Bu politika, hangi verileri neden topladığımızı ve onları nasıl koruduğumuzu açıklar.' 
                   : 'As Buaze, we consider the privacy and security of your personal data as our top priority. This policy explains what data we collect, why we collect it, and how we protect it.'}
               </p>
             </div>

              <section className="space-y-6">
                <h2 className="text-[#111827] text-[24px] sm:text-[28px] font-black tracking-tight">{isTr ? '1. Bilgi Toplama' : '1. Collection of Information'}</h2>
                <p>
                  {isTr 
                    ? 'Hesap açılışı, hizmet kullanımı veya bizimle iletişime geçtiğinizde; kimlik bilgileri, iletişim detayları, ödeme geçmişi ve kullanım verileri gibi bilgileri toplarız.'
                    : 'When you open an account, use our services, or contact us; we collect information such as identity information, contact details, payment history, and usage data.'}
                </p>
                <ul className="list-disc pl-6 space-y-3 marker:text-[#FDBF1D]">
                   <li>{isTr ? 'Kayıt sırasında sağladığınız doğrudan bilgiler' : 'Direct information provided during registration'}</li>
                   <li>{isTr ? 'Abonelik ve ödeme işlemleri verileri' : 'Subscription and payment transaction data'}</li>
                   <li>{isTr ? 'Platform etkileşim ve kullanım metrikleri' : 'Platform interaction and usage metrics'}</li>
                </ul>
              </section>

              <section className="space-y-6">
                <h2 className="text-[#111827] text-[24px] sm:text-[28px] font-black tracking-tight">{isTr ? '2. Veri Kullanımı ve Paylaşımı' : '2. Data Usage and Sharing'}</h2>
                <p>
                  {isTr
                    ? 'Verileriniz yalnızca hizmet kalitemizi artırmak, yasal yükümlülüklerimizi yerine getirmek ve size özel bir kullanıcı deneyimi sunmak amacıyla kullanılır. Üçüncü şahıslara satış yapılmaz.'
                    : 'Your data is used only to improve our service quality, fulfill our legal obligations, and provide you with a personalized user experience. No sales are made to third parties.'}
                </p>
              </section>

              <section className="space-y-6">
                <h2 className="text-[#111827] text-[24px] sm:text-[28px] font-black tracking-tight">{isTr ? '3. Güvenlik Önlemleri' : '3. Security Measures'}</h2>
                <p>
                  {isTr
                    ? 'Tüm verileriniz endüstri standardı SSL/TLS şifreleme ile korunur. Sunucularımızda güvenlik duvarları, yetkisiz erişim tespit sistemleri ve periyodik sızma testleri uygulanmaktadır.'
                    : 'All your data is protected with industry-standard SSL/TLS encryption. Firewalls, unauthorized access detection systems, and periodic penetration tests are applied on our servers.'}
                </p>
              </section>

              <section className="space-y-6">
                <h2 className="text-[#111827] text-[24px] sm:text-[28px] font-black tracking-tight">{isTr ? '4. Uluslararası Veri Aktarımı' : '4. International Data Transfer'}</h2>
                <p>
                  {isTr
                    ? 'Veri barındırma hizmetlerimiz global altyapılar (Vercel, Supabase vb.) üzerinde tutulabilir. Bu durumlarda da en yüksek koruma standartlarını garanti ediyoruz.'
                    : 'Our data hosting services may be held on global infrastructures (Vercel, Supabase, etc.). In these cases, we guarantee the highest protection standards.'}
                </p>
              </section>

               <div className="pt-16 border-t-2 border-[#F7F4F0] flex flex-col sm:flex-row items-center justify-between gap-8 relative z-10">
                 <div className="space-y-1">
                   <p className="text-[14px] font-black text-[#111827] uppercase tracking-widest leading-none">
                     {isTr ? 'DAHA FAZLA BİLGİ' : 'MORE INFORMATION'}
                   </p>
                   <p className="text-[14px] text-[#ada89f] font-bold">
                     {isTr ? 'privacy@buaze.com üzerinden sorabilirsiniz.' : 'You can ask via privacy@buaze.com'}
                   </p>
                 </div>
                 <a href="mailto:privacy@buaze.com" className="px-10 py-5 bg-[#111827] text-white rounded-2xl text-[15px] font-black shadow-[6px_8px_0_0_#FDBF1D] hover:bg-[#1f1e1d] transition-all active:translate-y-[6px] active:shadow-none uppercase tracking-widest">
                   privacy@buaze.com
                 </a>
               </div>
          </div>
        </div>
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
