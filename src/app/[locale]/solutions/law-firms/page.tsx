import { Scale, Star, ShieldCheck, TrendingUp, QrCode, Users, Lock, BarChart3 } from 'lucide-react';
import SolutionPageLayout from '@/components/marketing/SolutionPageLayout';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = getTranslations(locale);
  const title = locale === 'tr'
    ? 'Avukatlık Bürosu İtibar Yönetimi — Buaze'
    : 'Law Firm Reputation Management — Buaze';
  const description = locale === 'tr'
    ? 'KVKK & GDPR uyumlu, müvekkil gizliliğini koruyan hukuk bürosu itibar sistemi. Güvenilir bir hukuk markası oluşturun.'
    : 'KVKK & GDPR compliant law firm reputation system that protects client confidentiality. Build a trusted legal brand.';
  return {
    title,
    description,
    keywords: locale === 'tr'
      ? ['avukatlık bürosu itibar', 'hukuk bürosu google yorumları', 'müvekkil memnuniyeti', 'KVKK uyumlu hukuk feedback']
      : ['law firm reputation management', 'attorney google reviews', 'client satisfaction legal'],
    alternates: {
      canonical: `https://buaze.com/${locale}/solutions/law-firms`,
      languages: { tr: 'https://buaze.com/tr/solutions/law-firms', en: 'https://buaze.com/en/solutions/law-firms' },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/solutions/law-firms` },
  };
}

export default async function LawFirmsSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const stats = [
    { num: 'KVKK', label: isTr ? '& GDPR UYUMLU' : '& GDPR COMPLIANT', context: isTr ? 'Gizlilik güvencesi' : 'Privacy guarantee' },
    { num: '%67', label: isTr ? 'DAHA FAZLA REFERANS' : 'MORE REFERRALS', context: isTr ? 'Memnun müvekkil' : 'Satisfied clients' },
    { num: '%91', label: isTr ? 'GİZLİ FEEDBACK' : 'CONFIDENTIAL', context: isTr ? 'Anonim sistem' : 'Anonymous system' },
    { num: '<5dk', label: isTr ? 'KURULUM' : 'SETUP', context: isTr ? 'Hızlı başlangıç' : 'Quick start' },
  ];

  const steps = [
    {
      icon: <QrCode size={24} />,
      title: isTr ? 'Dava Sonrası Geri Bildirim Al' : 'Get Feedback After Case',
      desc: isTr
        ? 'Dava kapandıktan sonra müvekkile QR kodu gönderin. Gizli ve anonim olarak deneyimini paylaşır.'
        : 'Send the QR code to the client after the case is closed. They share their experience privately and anonymously.',
    },
    {
      icon: <Lock size={24} />,
      title: isTr ? 'Gizlilik Korumalı Sistem' : 'Privacy-Protected System',
      desc: isTr
        ? 'Müvekkil bilgileri hiçbir şekilde geri bildirimle ilişkilendirilmez. KVKK ve GDPR uyumlu altyapı.'
        : 'Client information is never associated with feedback. KVKK and GDPR compliant infrastructure.',
    },
    {
      icon: <BarChart3 size={24} />,
      title: isTr ? 'Büro İtibarını İzle' : 'Monitor Firm Reputation',
      desc: isTr
        ? 'Google yorumlarınızı artırın, avukat bazında performans raporları alın, müvekkil memnuniyetini ölçün.'
        : 'Increase your Google reviews, get attorney-based performance reports, measure client satisfaction.',
    },
  ];

  const benefits = [
    {
      title: isTr ? 'Müvekkil Gizliliği' : 'Client Confidentiality',
      desc: isTr ? 'Hukuki etik kuralları gizliliği zorunlu kılar. Sistemimiz başından itibaren tam gizlilik prensibiyle tasarlandı.' : 'Legal ethics require confidentiality. Our system was designed from the ground up with full privacy principles.',
      icon: <Lock size={20} className="text-[#6366f1]" />,
    },
    {
      title: isTr ? 'Güven Oluşturur' : 'Builds Trust',
      desc: isTr ? 'Potansiyel müvekkiller bir hukuk bürosunu araştırırken Google yorumlarına bakar. Olumlu yorumlar karar verdirir.' : 'Potential clients look at Google reviews when researching a law firm. Positive reviews drive decision-making.',
      icon: <Star size={20} className="text-[#F4B400]" />,
    },
    {
      title: isTr ? 'Referans Zinciri' : 'Referral Chain',
      desc: isTr ? 'Memnun müvekkil tavsiyesi, hukuk sektöründe büyümenin temelidir. Dijital referans sistemini güçlendirin.' : 'Satisfied client referrals are the foundation of growth in the legal sector. Strengthen your digital referral system.',
      icon: <Users size={20} className="text-[#6366f1]" />,
    },
    {
      title: isTr ? 'Avukat Performans Analizi' : 'Attorney Performance Analysis',
      desc: isTr ? 'Her avukat için ayrı müvekkil memnuniyet metrikleri. Büro kalitesini sistematik olarak artırın.' : 'Separate client satisfaction metrics for each attorney. Systematically improve firm quality.',
      icon: <BarChart3 size={20} className="text-[#6366f1]" />,
    },
  ];

  const faqs = [
    {
      q: isTr ? 'Müvekkil bilgileri gizli kalacak mı?' : 'Will client information remain confidential?',
      a: isTr ? 'Kesinlikle. Buaze geri bildirim sistemi tamamen anonimdir. Müvekkil adı, dava bilgisi veya kimlik bilgisi hiçbir şekilde geri bildirimle ilişkilendirilmez. KVKK ve meslek sırrı gerekliliklerini karşılar.' : 'Absolutely. The Buaze feedback system is completely anonymous. Client name, case information or identity information is never associated with feedback. Meets KVKK and attorney-client privilege requirements.',
    },
    {
      q: isTr ? 'Olumsuz yorumlar Google\'a gider mi?' : 'Do negative reviews go to Google?',
      a: isTr ? 'Hayır. Düşük memnuniyet skorları Google\'a yönlendirilmez, doğrudan büro yönetimine iletilir. Kamuoyuna açık yorumlarınız her zaman kontrollü kalır.' : 'No. Low satisfaction scores are not directed to Google but directly to firm management. Your public reviews are always controlled.',
    },
  ];

  return (
    <SolutionPageLayout
      locale={locale}
      t={t}
      industryKey="law"
      icon={<Scale size={14} />}
      industryBadge={isTr ? 'HUKUK BÜROLARI İÇİN' : 'FOR LAW FIRMS'}
      h1Prefix={isTr ? 'Hukukta' : 'Trusted Legal'}
      h1Suffix={isTr ? 'Güven Yönetimi' : 'Reputation'}
      description={isTr
        ? 'Müvekkil gizliliğini koruyarak dijital itibarınızı güçlendirin. KVKK uyumlu Buaze ile hukuk büronuzun görünürlüğünü artırın.'
        : 'Strengthen your digital reputation while protecting client confidentiality. Increase your law firm\'s visibility with KVKK-compliant Buaze.'}
      accentColor="#6366f1"
      stats={stats}
      steps={steps}
      benefits={benefits}
      faqs={faqs}
    />
  );
}
