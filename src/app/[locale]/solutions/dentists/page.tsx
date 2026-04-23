import { Stethoscope, Star, ShieldCheck, TrendingUp, QrCode, Users, BarChart3, Lock, Smile } from 'lucide-react';
import SolutionPageLayout from '@/components/marketing/SolutionPageLayout';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = getTranslations(locale);
  const title = locale === 'tr'
    ? 'Diş Kliniği İtibar Yönetimi — Buaze'
    : 'Dental Clinic Reputation Management — Buaze';
  const description = locale === 'tr'
    ? 'Hastalar tedavi sonrası deneyimlerini paylaşsın. Diş kliniğinizin Google yorumlarını artırın ve yeni hasta kazanın.'
    : 'Let patients share their post-treatment experience. Increase your dental clinic\'s Google reviews and gain new patients.';
  return {
    title,
    description,
    keywords: locale === 'tr'
      ? ['diş kliniği itibar', 'diş hekimi google yorumları', 'hasta memnuniyeti diş', 'diş polikliniği feedback']
      : ['dental clinic reputation', 'dentist google reviews', 'patient satisfaction dental'],
    alternates: {
      canonical: `https://buaze.com/${locale}/solutions/dentists`,
      languages: { tr: 'https://buaze.com/tr/solutions/dentists', en: 'https://buaze.com/en/solutions/dentists' },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/solutions/dentists` },
  };
}

export default async function DentistSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const stats = [
    { num: '%91', label: isTr ? 'TAVSİYE ORANI' : 'REFERRAL RATE', context: isTr ? 'Memnun hastalar' : 'Satisfied patients' },
    { num: '≤3dk', label: isTr ? 'YORUM ALMA SÜRESİ' : 'REVIEW TIME', context: isTr ? 'Tedavi sonrası' : 'Post-treatment' },
    { num: '+%120', label: isTr ? 'YENİ HASTA' : 'NEW PATIENTS', context: isTr ? 'Organik büyüme' : 'Organic growth' },
    { num: 'KVKK', label: isTr ? 'UYUMLU' : 'COMPLIANT', context: isTr ? 'Hasta gizliliği' : 'Patient privacy' },
  ];

  const steps = [
    {
      icon: <QrCode size={24} />,
      title: isTr ? 'Tedavi Sonrası QR Göster' : 'Show QR After Treatment',
      desc: isTr
        ? 'Ödeme kasasına veya çıkış bölümüne QR kodunu yerleştirin. Hasta randevu sonrası kolayca tarar.'
        : 'Place the QR code at the payment desk or exit area. Patients scan easily after their appointment.',
    },
    {
      icon: <Smile size={24} />,
      title: isTr ? 'Anında Geri Bildirim Al' : 'Get Instant Feedback',
      desc: isTr
        ? 'Hasta kliniği terk etmeden deneyimini paylaşır. Memnun hastalar Google\'a, memnuniyetsizler size yönlendirilir.'
        : 'Patients share their experience before leaving the clinic. Happy patients go to Google, dissatisfied ones come to you.',
    },
    {
      icon: <BarChart3 size={24} />,
      title: isTr ? 'Hekim Bazında Analiz Et' : 'Analyze by Dentist',
      desc: isTr
        ? 'Her diş hekimi için ayrı performans metrikleri görün. Hangi hekimin daha iyi değerlendirme aldığını takip edin.'
        : 'See separate performance metrics for each dentist. Track which dentist gets better reviews.',
    },
  ];

  const benefits = [
    {
      title: isTr ? 'Güven Oluşturur' : 'Builds Trust',
      desc: isTr ? 'Diş hekimi seçimi hassas bir karardır. Bol olumlu yorum potansiyel hastanın kararını 4x hızlandırır.' : 'Choosing a dentist is a sensitive decision. Many positive reviews speed up potential patients\' decision 4x.',
      icon: <Star size={20} className="text-[#C6F24E]" />,
    },
    {
      title: isTr ? 'Hasta Gizliliği' : 'Patient Privacy',
      desc: isTr ? 'KVKK uyumlu anonim sistem. Hasta kimliği hiçbir şekilde geri bildirimle ilişkilendirilmez.' : 'KVKK-compliant anonymous system. Patient identity is never associated with feedback.',
      icon: <Lock size={20} className="text-[#10b981]" />,
    },
    {
      title: isTr ? 'Organik Büyüme' : 'Organic Growth',
      desc: isTr ? 'Yorum hacmi arttıkça Google aramasında "diş kliniği yakınımda" için üst sıralara çıkıyorsunuz.' : 'As review volume grows, you rise to the top for "dentist near me" Google searches.',
      icon: <TrendingUp size={20} className="text-[#10b981]" />,
    },
    {
      title: isTr ? 'Tedavi Bazlı Analiz' : 'Treatment-Based Analysis',
      desc: isTr ? 'Dolgu, implant, kanal tedavisi — her tedavi türü için ayrı değerlendirme metrikleri takip edin.' : 'Filling, implant, root canal — track separate evaluation metrics for each treatment type.',
      icon: <BarChart3 size={20} className="text-[#10b981]" />,
    },
  ];

  const faqs = [
    {
      q: isTr ? 'Hasta adı ve bilgileri gizli kalıyor mu?' : 'Do patient names and information remain confidential?',
      a: isTr ? 'Evet, geri bildirim sistemi tamamen anonimdir. Hasta kimlik bilgisi hiçbir şekilde geri bildirimle ilişkilendirilmez ve KVKK gerekliliklerini karşılar.' : 'Yes, the feedback system is completely anonymous. Patient identity is never associated with feedback and meets GDPR requirements.',
    },
    {
      q: isTr ? 'Farklı hekimler için ayrı QR oluşturabilir miyim?' : 'Can I create separate QRs for different dentists?',
      a: isTr ? 'Evet. Her diş hekimi için ayrı QR kodu ve ayrı değerlendirme metrikleri oluşturabilirsiniz. Bu sayede her hekimin bireysel performansını takip edebilirsiniz.' : 'Yes. You can create separate QR codes and evaluation metrics for each dentist. This allows you to track each dentist\'s individual performance.',
    },
  ];

  return (
    <SolutionPageLayout
      locale={locale}
      t={t}
      industryKey="den"
      icon={<Stethoscope size={14} />}
      industryBadge={t.sol_den_badge}
      h1Prefix={t.sol_den_h1.split(' ').slice(0, -1).join(' ')}
      h1Suffix={t.sol_den_h1.split(' ').slice(-1)[0]}
      description={t.sol_den_p}
      accentColor="#10b981"
      stats={stats}
      steps={steps}
      benefits={benefits}
      faqs={faqs}
    />
  );
}
