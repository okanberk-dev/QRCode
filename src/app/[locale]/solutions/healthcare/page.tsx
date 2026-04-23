import { HeartPulse, Star, ShieldCheck, TrendingUp, QrCode, Users, BarChart3, Lock } from 'lucide-react';
import SolutionPageLayout from '@/components/marketing/SolutionPageLayout';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = getTranslations(locale);
  const title = locale === 'tr'
    ? 'Klinik & Sağlık Merkezi İtibar Yönetimi — Buaze'
    : 'Clinic & Healthcare Reputation Management — Buaze';
  const description = locale === 'tr'
    ? 'KVKK uyumlu hasta geri bildirim sistemi. Klinik itibarınızı güçlendirin, yeni hasta edinimini artırın.'
    : 'GDPR-compliant patient feedback system. Strengthen your clinic reputation and increase new patient acquisition.';
  return {
    title,
    description,
    keywords: locale === 'tr'
      ? ['klinik itibar yönetimi', 'hasta geri bildirimi', 'sağlık merkezi google yorumları', 'KVKK uyumlu feedback']
      : ['clinic reputation management', 'patient feedback', 'healthcare google reviews', 'GDPR compliant feedback'],
    alternates: {
      canonical: `https://buaze.com/${locale}/solutions/healthcare`,
      languages: { tr: 'https://buaze.com/tr/solutions/healthcare', en: 'https://buaze.com/en/solutions/healthcare' },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/solutions/healthcare` },
  };
}

export default async function HealthcareSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const stats = [
    { num: '%94', label: isTr ? 'HASTA MEMNUNİYETİ' : 'PATIENT SATISFACTION', context: isTr ? 'Anket ortalaması' : 'Survey average' },
    { num: '+%78', label: isTr ? 'YENİ HASTA EDİNİMİ' : 'NEW PATIENT ACQ.', context: isTr ? 'Organik arama' : 'Organic search' },
    { num: 'KVKK', label: isTr ? 'UYUMLU SİSTEM' : 'COMPLIANT SYSTEM', context: isTr ? 'Veri güvenliği' : 'Data security' },
    { num: '<5dk', label: isTr ? 'KURULUM SÜRESİ' : 'SETUP TIME', context: isTr ? 'Hızlı entegrasyon' : 'Fast integration' },
  ];

  const steps = [
    {
      icon: <QrCode size={24} />,
      title: isTr ? 'Bekleme Odasına Yerleştir' : 'Place in Waiting Room',
      desc: isTr
        ? 'QR kodu bekleme odası, muayene odası çıkışı veya randevu hatırlatma mesajlarına ekleyin.'
        : 'Add the QR code to the waiting room, examination room exit, or appointment reminder messages.',
    },
    {
      icon: <Lock size={24} />,
      title: isTr ? 'KVKK Uyumlu Veri Toplama' : 'GDPR-Compliant Data Collection',
      desc: isTr
        ? 'Hasta kimliği korunur. Geri bildirimler şifreli ve anonim olarak işlenir, veriler TR sunucularda saklanır.'
        : 'Patient identity is protected. Feedback is processed in an encrypted and anonymous manner, data stored on TR servers.',
    },
    {
      icon: <BarChart3 size={24} />,
      title: isTr ? 'Klinik Kalitesini Artır' : 'Improve Clinic Quality',
      desc: isTr
        ? 'Departman bazlı analizler, doktor performans raporları ve iyileştirme önerileri ile klinik kalitesini sürekli artırın.'
        : 'Continuously improve clinic quality with department-based analytics, doctor performance reports and improvement suggestions.',
    },
  ];

  const benefits = [
    {
      title: isTr ? 'KVKK & GDPR Uyumluluk' : 'KVKK & GDPR Compliance',
      desc: isTr ? 'Hasta gizliliği yasal zorunluluk. Buaze sistemleri başından itibaren KVKK\'ya uygun tasarlanmıştır.' : 'Patient privacy is a legal requirement. Buaze systems are designed for KVKK compliance from the ground up.',
      icon: <Lock size={20} className="text-[#10b981]" />,
    },
    {
      title: isTr ? 'Google\'da Öne Çık' : 'Stand Out on Google',
      desc: isTr ? 'Sağlık araması yapan potansiyel hastalar önce Google\'a bakar. Yüksek yorum hacmi sizi üst sıralara taşır.' : 'Potential patients searching for healthcare look at Google first. High review volume moves you to the top.',
      icon: <TrendingUp size={20} className="text-[#10b981]" />,
    },
    {
      title: isTr ? 'Hasta Güveni' : 'Patient Trust',
      desc: isTr ? 'Onlarca olumlu yorum, yeni hastaların klinikt tercih etme olasılığını 3 kat artırır.' : 'Dozens of positive reviews triple the likelihood of new patients choosing your clinic.',
      icon: <Star size={20} className="text-[#C6F24E]" />,
    },
    {
      title: isTr ? 'Departman Analitik' : 'Department Analytics',
      desc: isTr ? 'Her departman ve doktor için ayrı raporlar. Hangi birimde iyileştirme gerektiğini görün.' : 'Separate reports for each department and doctor. See which unit needs improvement.',
      icon: <BarChart3 size={20} className="text-[#10b981]" />,
    },
  ];

  const faqs = [
    {
      q: isTr ? 'Hasta verileri güvende mi?' : 'Is patient data safe?',
      a: isTr ? 'Kesinlikle. Buaze sistemleri KVKK\'ya uygun olarak tasarlanmıştır. Tüm geri bildirimler şifreli ve anonim işlenir. Hasta kimliği hiçbir şekilde geri bildirim sistemine bağlanmaz.' : 'Absolutely. Buaze systems are designed in compliance with KVKK/GDPR. All feedback is processed in encrypted and anonymous form. Patient identity is never linked to the feedback system.',
    },
    {
      q: isTr ? 'Farklı departmanlar için ayrı QR kodları oluşturabilir miyim?' : 'Can I create separate QR codes for different departments?',
      a: isTr ? 'Evet. Her departman (ortopedi, pediatri, kadın hastalıkları vb.) için ayrı QR kod oluşturabilirsiniz. Bu sayede departman bazında değerlendirme alabilirsiniz.' : 'Yes. You can create separate QR codes for each department (orthopedics, pediatrics, gynecology, etc.). This allows you to get department-based reviews.',
    },
  ];

  return (
    <SolutionPageLayout
      locale={locale}
      t={t}
      industryKey="hea"
      icon={<HeartPulse size={14} />}
      industryBadge={isTr ? 'KLİNİK & SAĞLIK İÇİN' : 'FOR CLINICS & HEALTHCARE'}
      h1Prefix={t.sol_hea_h1.split(' ').slice(0, -1).join(' ')}
      h1Suffix={t.sol_hea_h1.split(' ').slice(-1)[0]}
      description={t.sol_hea_p}
      accentColor="#10b981"
      stats={stats}
      steps={steps}
      benefits={benefits}
      faqs={faqs}
    />
  );
}
