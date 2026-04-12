import type { Metadata } from 'next';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası — Buaze',
};

export default async function PrivacyPage({
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
          <h1 className="text-3xl sm:text-4xl font-black text-[#111827] mb-8">
            {locale === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy'}
          </h1>
          
          <div className="prose prose-gray max-w-none text-gray-600 space-y-6">
            <p className="font-medium text-lg text-gray-900 border-b border-gray-100 pb-6">
              {locale === 'tr' 
                ? 'Buaze olarak ("biz", "şirket", "platform"), kişisel verilerinizin gizliliğini korumayı taahhüt ediyoruz.' 
                : 'As Buaze ("we", "company", "platform"), we are committed to protecting the privacy of your personal data.'}
            </p>

            <h3 className="text-xl font-bold text-[#111827] mt-8">
              {locale === 'tr' ? '1. Topladığımız Bilgiler' : '1. Information We Collect'}
            </h3>
            <p>
              {locale === 'tr'
                ? 'Platforma kayıt olduğunuzda, destek taleplerinde bulunduğunuzda veya hizmetlerimizi kullandığınızda IP adresi, cihaz bilgileri, tarayıcı türü gibi kullanım verilerini ve iletişim bilgilerinizi otomatik sistemlerle toplamaktayız.'
                : 'When you register to the platform, request support, or use our services, we collect your usage data (IP address, device info, browser type) and contact information automatically.'}
            </p>

            <h3 className="text-xl font-bold text-[#111827] mt-8">
              {locale === 'tr' ? '2. Bilgilerin Kullanımı' : '2. Use of Information'}
            </h3>
            <p>
              {locale === 'tr'
                ? 'Toplanan veriler yalnızca hizmetin verilmesi, platform güvenliğinin sağlanması, performans analizleri ve gerektiğinde yasal yükümlülüklerin yerine getirilmesi amacıyla kullanılır.'
                : 'The collected data is used exclusively to provide the service, ensure platform security, perform analytics, and fulfill legal obligations as necessary.'}
            </p>

            <h3 className="text-xl font-bold text-[#111827] mt-8">
              {locale === 'tr' ? '3. Çerezler (Cookies)' : '3. Cookies'}
            </h3>
            <p>
              {locale === 'tr'
                ? 'Web sitemiz oturum yönetimi, güvenlik ve tercihlerin hatırlanması amacıyla zorunlu çerezler kullanır. Pazarlama ve analiz çerezleri ise yalnızca açık rıza vermeniz halinde kullanılır.'
                : 'Our website uses essential cookies for session management, security, and remembering preferences. Marketing and analytics cookies are only used with your explicit consent.'}
            </p>

            <h3 className="text-xl font-bold text-[#111827] mt-8">
              {locale === 'tr' ? '4. Üçüncü Taraflarla Paylaşım' : '4. Third-Party Sharing'}
            </h3>
            <p>
              {locale === 'tr'
                ? 'Verilerinizi hiçbir şekilde reklam şirketlerine satmıyoruz veya izinsiz paylaşmıyoruz. Veriler yalnızca meşru hizmet sağlayıcılarımızla (bulut barındırma, ödeme altyapıları vb.) gizlilik anlaşmaları çerçevesinde ve gerektiği kadar paylaşılmaktadır.'
                : 'We never sell or share your data with advertising networks without consent. Data is only shared with legitimate service providers (cloud hosting, payment gateways) under strict confidentiality agreements.'}
            </p>

            <p className="text-sm mt-8 border-t border-gray-100 pt-8">
              {locale === 'tr' ? 'İletişim: ' : 'Contact: '} <a href="mailto:hello@buaze.com" className="text-blue-600 hover:underline">hello@buaze.com</a>
            </p>
          </div>
        </div>
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
