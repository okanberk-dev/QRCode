import { Sparkles, Star, QrCode, Lock, Heart, BarChart3 } from 'lucide-react';
import SolutionPageLayout from '@/components/marketing/SolutionPageLayout';
import { IllusAesthetic } from '@/components/marketing/solution-illustrations';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === 'tr'
    ? 'Estetik Klinik İtibar Yönetimi — Buaze'
    : 'Aesthetic Clinic Reputation Management — Buaze';
  const description = locale === 'tr'
    ? 'Hasta gizliliğini koruyarak estetik kliniğinizin itibarını güçlendirin. Hassas alanda güven inşa edin.'
    : 'Strengthen your aesthetic clinic\'s reputation while protecting patient privacy. Build trust in a sensitive field.';
  return {
    title,
    description,
    keywords: locale === 'tr'
      ? ['estetik klinik itibar', 'plastik cerrahi google yorumları', 'estetik hasta gizliliği', 'klinik feedback sistemi']
      : ['aesthetic clinic reputation', 'plastic surgery google reviews', 'patient privacy aesthetic'],
    alternates: {
      canonical: `https://buaze.com/${locale}/solutions/aesthetic`,
      languages: { tr: 'https://buaze.com/tr/solutions/aesthetic', en: 'https://buaze.com/en/solutions/aesthetic' },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/solutions/aesthetic` },
  };
}

export default async function AestheticSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const stats = [
    { num: 'KVKK', label: isTr ? 'UYUMLU GİZLİLİK' : 'COMPLIANT PRIVACY', context: isTr ? 'Hasta koruması' : 'Patient protection' },
    { num: '%96', label: isTr ? 'ÖZEL GERİ BİLDİRİM' : 'PRIVATE FEEDBACK', context: isTr ? 'Anonim sistem' : 'Anonymous system' },
    { num: '+%150', label: isTr ? 'GOOGLE YORUMU' : 'GOOGLE REVIEWS', context: isTr ? '3 ayda' : 'In 3 months' },
    { num: '%88', label: isTr ? 'GÜVENİLİRLİK' : 'CREDIBILITY', context: isTr ? 'Hasta anketi' : 'Patient survey' },
  ];

  const steps = [
    {
      icon: <QrCode size={24} />,
      title: isTr ? 'İşlem Sonrası QR Gönder' : 'Send QR After Procedure',
      desc: isTr
        ? 'İşlem tamamlandıktan belirli süre sonra (1 hafta, 1 ay) hastaya QR bağlantısı gönderin. İyileşme sürecini tamamladıktan sonra değerlendirme yapması sağlanır.'
        : 'Send the QR link to the patient a certain time after the procedure (1 week, 1 month). They evaluate after completing the recovery process.',
    },
    {
      icon: <Lock size={24} />,
      title: isTr ? 'Tam Gizlilik Güvencesi' : 'Full Privacy Guarantee',
      desc: isTr
        ? 'Hasta kimliği kesinlikle geri bildirimle ilişkilendirilmez. KVKK uyumlu, anonim ve şifreli veri işleme.'
        : 'Patient identity is never associated with feedback. KVKK compliant, anonymous and encrypted data processing.',
    },
    {
      icon: <BarChart3 size={24} />,
      title: isTr ? 'İşlem & Uzman Bazlı Analiz' : 'Procedure & Specialist Analysis',
      desc: isTr
        ? 'Her işlem türü (botoks, dolgu, rinoplasti) ve uzman için ayrı memnuniyet metrikleri takip edin.'
        : 'Track separate satisfaction metrics for each procedure type (botox, filler, rhinoplasty) and specialist.',
    },
  ];

  const benefits = [
    {
      title: isTr ? 'Hassas Alanda Güven İnşası' : 'Building Trust in Sensitive Field',
      desc: isTr ? 'Estetik kararlar büyük güven gerektirir. Gerçek hasta yorumları potansiyel hastanın korkusunu giderir.' : 'Aesthetic decisions require great trust. Real patient reviews eliminate potential patients\' fears.',
      icon: <Star size={20} className="text-[#C6F24E]" />,
    },
    {
      title: isTr ? 'Hasta Gizliliği' : 'Patient Privacy',
      desc: isTr ? 'KVKK uyumlu, tamamen anonim sistem. Hiçbir hasta bilgisi geri bildirimle eşleştirilmez.' : 'KVKK compliant, completely anonymous system. No patient information is matched with feedback.',
      icon: <Lock size={20} className="text-[#a855f7]" />,
    },
    {
      title: isTr ? 'İyileşme Süreci Takibi' : 'Recovery Process Tracking',
      desc: isTr ? 'İşlem sonrası farklı sürelerde değerlendirme alın (1 hafta, 1 ay, 3 ay). Uzun vadeli memnuniyeti ölçün.' : 'Receive evaluations at different intervals post-procedure (1 week, 1 month, 3 months). Measure long-term satisfaction.',
      icon: <Heart size={20} className="text-[#a855f7]" />,
    },
    {
      title: isTr ? 'Uzman Karşılaştırması' : 'Specialist Comparison',
      desc: isTr ? 'Her uzman için ayrı değerlendirme metrikleri. Klinik kalitesini sistematik olarak artırın.' : 'Separate evaluation metrics for each specialist. Systematically improve clinic quality.',
      icon: <BarChart3 size={20} className="text-[#a855f7]" />,
    },
  ];

  const faqs = [
    {
      q: isTr ? 'Estetik işlem yaptıran hastaların kimliği gizli kalacak mı?' : 'Will the identity of patients who have had aesthetic procedures remain confidential?',
      a: isTr ? 'Kesinlikle. Sistem tamamen anonimdir ve KVKK ile sağlık verisi güvenliği gerekliliklerini karşılar. Hastanın adı, işlem bilgisi veya kişisel verisi hiçbir şekilde geri bildirimle ilişkilendirilmez.' : 'Absolutely. The system is completely anonymous and meets KVKK and health data security requirements. Patient name, procedure information or personal data is never associated with feedback.',
    },
    {
      q: isTr ? 'İşlem sonrası ne zaman geri bildirim istenmeli?' : 'When should feedback be requested after a procedure?',
      a: isTr ? 'Bu işlem türüne göre değişir. Botoks ve dolgu için 2-4 hafta, cerrahi işlemler için 4-8 hafta beklemek idealdir. Buaze sistemi size uygun zamanlamayı ayarlama imkanı tanır.' : 'This varies by procedure type. 2-4 weeks for botox and fillers, 4-8 weeks for surgical procedures is ideal. The Buaze system allows you to set the right timing.',
    },
  ];

  return (
    <SolutionPageLayout
      locale={locale}
      t={t}
      industryKey="aes"
      icon={<Sparkles size={14} />}
      industryBadge={isTr ? 'ESTETİK KLİNİKLER İÇİN' : 'FOR AESTHETIC CLINICS'}
      h1Prefix={isTr ? 'Hassas Alanda' : 'Trusted Reputation in'}
      h1Suffix={isTr ? 'Güven' : 'Sensitive Field'}
      description={isTr
        ? 'Hasta gizliliğini koruyarak estetik kliniğinizin dijital itibarını güçlendirin. KVKK uyumlu Buaze ile fark yaratın.'
        : "Strengthen your aesthetic clinic's digital reputation while protecting patient privacy. Make a difference with KVKK-compliant Buaze."}
      accentColor="#a855f7"
      stats={stats}
      steps={steps}
      benefits={benefits}
      faqs={faqs}
      illustration={<IllusAesthetic />}
    />
  );
}
