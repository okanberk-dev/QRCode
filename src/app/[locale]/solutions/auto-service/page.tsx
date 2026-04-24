import { Car, Star, ShieldCheck, TrendingUp, QrCode, Users, Wrench, BarChart3 } from 'lucide-react';
import SolutionPageLayout from '@/components/marketing/SolutionPageLayout';
import { IllusAuto } from '@/components/marketing/solution-illustrations';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = getTranslations(locale);
  const title = locale === 'tr'
    ? 'Oto Servis & Tamir İtibar Yönetimi — Buaze'
    : 'Auto Service & Repair Reputation Management — Buaze';
  const description = locale === 'tr'
    ? 'Araç teslimi sonrası otomatik geri bildirim akışı. Oto servisinizin Google yorumlarını artırın ve müşteri dönüşünü sağlayın.'
    : 'Automatic feedback flow after vehicle delivery. Increase your auto service\'s Google reviews and ensure customer return.';
  return {
    title,
    description,
    keywords: locale === 'tr'
      ? ['oto servis itibar yönetimi', 'araba tamircisi google yorumları', 'oto tamir feedback', 'servis müşteri memnuniyeti']
      : ['auto service reputation management', 'mechanic google reviews', 'car repair feedback'],
    alternates: {
      canonical: `https://buaze.com/${locale}/solutions/auto-service`,
      languages: { tr: 'https://buaze.com/tr/solutions/auto-service', en: 'https://buaze.com/en/solutions/auto-service' },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/solutions/auto-service` },
  };
}

export default async function AutoServiceSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const stats = [
    { num: '%72', label: isTr ? 'GERİ DÖNÜŞ ORANI' : 'RETURN RATE', context: isTr ? 'Servis sonrası' : 'After service' },
    { num: '+%240', label: isTr ? 'GOOGLE YORUMU' : 'GOOGLE REVIEWS', context: isTr ? '3 ayda' : 'In 3 months' },
    { num: 'OTO', label: isTr ? 'TETİKLEME' : 'AUTO TRIGGER', context: isTr ? 'Araç tesliminde' : 'At vehicle delivery' },
    { num: '<3dk', label: isTr ? 'KURULUM' : 'SETUP', context: isTr ? 'Anında hazır' : 'Instantly ready' },
  ];

  const steps = [
    {
      icon: <QrCode size={24} />,
      title: isTr ? 'Araç Teslim Belgesi\'ne Ekle' : 'Add to Vehicle Delivery Receipt',
      desc: isTr
        ? 'Servis faturasına veya araç teslim fişine QR kodu ekleyin. Müşteri aracını alırken kolayca tarar.'
        : 'Add the QR code to the service invoice or vehicle delivery receipt. Customer scans easily when picking up the vehicle.',
    },
    {
      icon: <Wrench size={24} />,
      title: isTr ? 'Servis Bazlı Değerlendirme' : 'Service-Based Evaluation',
      desc: isTr
        ? 'Yağ değişimi, fren, kaporta — her servis türü için ayrı değerlendirme formu. Hangi servisin daha iyi skorlar aldığını görün.'
        : 'Oil change, brakes, bodywork — separate evaluation form for each service type. See which service scores better.',
    },
    {
      icon: <BarChart3 size={24} />,
      title: isTr ? 'Teknisyen Performansı' : 'Technician Performance',
      desc: isTr
        ? 'Her teknisyen için ayrı müşteri memnuniyet metrikleri. En iyi çalışanlarınızı tespit edin ve ödüllendirin.'
        : 'Separate customer satisfaction metrics for each technician. Identify your best employees and reward them.',
    },
  ];

  const benefits = [
    {
      title: isTr ? 'Araç Sahibi Güveni' : 'Vehicle Owner Trust',
      desc: isTr ? 'Araç sahipleri servis seçerken Google yorumlarına güvenir. Yüksek puan = tercih edilme.' : 'Vehicle owners trust Google reviews when choosing a service. High rating = being chosen.',
      icon: <Star size={20} className="text-[#C6F24E]" />,
    },
    {
      title: isTr ? 'Otomatik Servis Takibi' : 'Automatic Service Follow-up',
      desc: isTr ? 'Araç tesliminde otomatik tetiklenen geri bildirim akışı. Manuel süreç gerekmez.' : 'Automatically triggered feedback flow at vehicle delivery. No manual process needed.',
      icon: <Wrench size={20} className="text-[#64748b]" />,
    },
    {
      title: isTr ? 'Olumsuz Yorum Önleme' : 'Negative Review Prevention',
      desc: isTr ? 'Memnun olmayan müşteri önce size gelir. Büyümeden önce sorunu çözün.' : 'Unsatisfied customers come to you first. Solve the problem before it grows.',
      icon: <ShieldCheck size={20} className="text-[#64748b]" />,
    },
    {
      title: isTr ? 'Sadık Müşteri Kitlesi' : 'Loyal Customer Base',
      desc: isTr ? 'Geri bildirim sonrası takip eden servis, müşterinin tekrar tercihini %72 oranında artırır.' : 'A service that follows up after feedback increases customer return choice by 72%.',
      icon: <TrendingUp size={20} className="text-[#64748b]" />,
    },
  ];

  const faqs = [
    {
      q: isTr ? 'Her teknisyen için ayrı QR kodu yapabilir miyim?' : 'Can I create separate QR codes for each technician?',
      a: isTr ? 'Evet. Her teknisyen ve servis türü için ayrı QR kodu ve metrikler oluşturabilirsiniz. Bu sayede performansı bireysel düzeyde takip edebilirsiniz.' : 'Yes. You can create separate QR codes and metrics for each technician and service type. This allows you to track performance at an individual level.',
    },
    {
      q: isTr ? 'Araç teslim sürecine nasıl entegre edilir?' : 'How does it integrate into the vehicle delivery process?',
      a: isTr ? 'Entegrasyon gerekmez. QR kodu mevcut faturanıza veya teslim belgelerine eklemeniz yeterlidir. Müşteri istediği zaman tarayabilir.' : 'No integration needed. Just add the QR code to your existing invoice or delivery documents. The customer can scan whenever they want.',
    },
  ];

  return (
    <SolutionPageLayout
      locale={locale}
      t={t}
      industryKey="auto"
      icon={<Car size={14} />}
      industryBadge={isTr ? 'OTO SERVİS & TAMİR İÇİN' : 'FOR AUTO SERVICE & REPAIR'}
      h1Prefix={isTr ? 'Servisinizin' : 'Your Service'}
      h1Suffix={isTr ? 'Farkını Gösterin' : 'Makes a Difference'}
      description={isTr
        ? 'Araç teslimi sonrası otomatik geri bildirim akışı ile oto servisinizin itibarını güçlendirin. Daha fazla müşteri, daha fazla güven.'
        : "Strengthen your auto service's reputation with automatic feedback flow after vehicle delivery. More customers, more trust."}
      accentColor="#64748b"
      stats={stats}
      steps={steps}
      benefits={benefits}
      faqs={faqs}
      illustration={<IllusAuto />}
    />
  );
}
