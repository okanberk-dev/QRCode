import { BedDouble, Star, ShieldCheck, TrendingUp, QrCode, Users, BarChart3, Zap, Wifi } from 'lucide-react';
import SolutionPageLayout from '@/components/marketing/SolutionPageLayout';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = getTranslations(locale);
  const title = locale === 'tr'
    ? 'Otel & Konaklama İtibar Yönetimi — Buaze'
    : 'Hotel & Hospitality Reputation Management — Buaze';
  const description = locale === 'tr'
    ? 'TripAdvisor ve Google\'da öne çıkın. Otel konuklarının gerçek zamanlı geri bildirimlerini tek panelden yönetin.'
    : 'Stand out on TripAdvisor and Google. Manage your hotel guests\' real-time feedback from a single panel.';
  return {
    title,
    description,
    keywords: locale === 'tr'
      ? ['otel itibar yönetimi', 'konaklama google yorumları', 'tripadvisor otel', 'misafir geri bildirimi']
      : ['hotel reputation management', 'hospitality google reviews', 'tripadvisor hotel', 'guest feedback'],
    alternates: {
      canonical: `https://buaze.com/${locale}/solutions/hotels`,
      languages: { tr: 'https://buaze.com/tr/solutions/hotels', en: 'https://buaze.com/en/solutions/hotels' },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/solutions/hotels` },
  };
}

export default async function HotelSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const stats = [
    { num: '%89', label: isTr ? 'TEKKERARİ REZ.' : 'REPEAT BOOKINGS', context: isTr ? 'Takip eden yıl' : 'Following year' },
    { num: '+4.7', label: isTr ? 'TRİPADVISOR SKORU' : 'TRIPADVISOR SCORE', context: isTr ? 'Ağ ortalaması' : 'Network avg.' },
    { num: '150+', label: isTr ? 'AKTİF OTEL' : 'ACTIVE HOTELS', context: isTr ? 'Buaze ağında' : 'On Buaze network' },
    { num: '%45', label: isTr ? 'MALİYET DÜŞÜŞÜ' : 'COST REDUCTION', context: isTr ? 'Yorum yönetiminde' : 'In review mgmt.' },
  ];

  const steps = [
    {
      icon: <QrCode size={24} />,
      title: isTr ? 'Odaya QR Yerleştir' : 'Place QR in Rooms',
      desc: isTr
        ? 'Oda kapılarına, resepsiyon masasına veya check-out fişine QR kodları yerleştirin. Misafirler check-out sırasında kolayca tarar.'
        : 'Place QR codes on room doors, reception desks, or checkout receipts. Guests scan easily during check-out.',
    },
    {
      icon: <Wifi size={24} />,
      title: isTr ? 'Check-Out\'ta Otomatik Tetikle' : 'Auto-Trigger at Check-Out',
      desc: isTr
        ? 'Check-out sürecine entegre edilmiş akıllı tetikleme sistemi, misafiri geri bildirim formuna yönlendirir.'
        : 'Smart triggering system integrated into check-out directs guests to the feedback form.',
    },
    {
      icon: <BarChart3 size={24} />,
      title: isTr ? 'Çok Lokasyon Yönet' : 'Multi-Property Management',
      desc: isTr
        ? 'Tüm şubelerinizin performansını tek panelden görün. Hangi lokasyonun daha iyi performans gösterdiğini analiz edin.'
        : 'See all your properties\' performance from one dashboard. Analyze which location performs better.',
    },
  ];

  const benefits = [
    {
      title: isTr ? 'TripAdvisor & Google Boost' : 'TripAdvisor & Google Boost',
      desc: isTr ? 'Yorum hacmi arttıkça TripAdvisor ve Google Haritalar\'da üst sıralara çıkın, organik doluluk oranını artırın.' : 'As review volume grows, rise in TripAdvisor and Google Maps rankings, increase organic occupancy.',
      icon: <TrendingUp size={20} className="text-[#3b82f6]" />,
    },
    {
      title: isTr ? 'Şikayet Tespiti' : 'Complaint Detection',
      desc: isTr ? 'Misafir şikayetleri kamuoyuna açık platformlara taşınmadan önce tespit edin ve çözüme kavuşturun.' : 'Detect guest complaints before they reach public platforms and resolve them.',
      icon: <ShieldCheck size={20} className="text-[#10b981]" />,
    },
    {
      title: isTr ? 'Misafir Sadakati' : 'Guest Loyalty',
      desc: isTr ? 'Geri bildirim alan misafir kendini özel hisseder. Tekrar rezervasyon oranı %89\'a kadar çıkar.' : 'Guests who receive feedback feel valued. Repeat booking rate increases up to 89%.',
      icon: <Star size={20} className="text-[#F4B400]" />,
    },
    {
      title: isTr ? 'Çok Şubeli Analitik' : 'Multi-Property Analytics',
      desc: isTr ? 'Hangi lokasyonun nasıl performans gösterdiğini karşılaştırın. Kaynak verimliliğini optimize edin.' : 'Compare how each location performs. Optimize resource efficiency.',
      icon: <Zap size={20} className="text-[#3b82f6]" />,
    },
  ];

  const faqs = [
    {
      q: isTr ? 'Birden fazla otel şubesi için kullanabilir miyim?' : 'Can I use it for multiple hotel properties?',
      a: isTr ? 'Evet, Büyüme ve Yıllık Pro planlarımız çoklu lokasyon desteği sunar. Her şube kendi QR kodu ve ayrı paneline sahip olurken tüm verileri merkezi dashboard\'dan görürsünüz.' : 'Yes, our Growth and Annual Pro plans offer multi-location support. Each property has its own QR code and separate panel while you see all data from a central dashboard.',
    },
    {
      q: isTr ? 'TripAdvisor entegrasyonu var mı?' : 'Is there TripAdvisor integration?',
      a: isTr ? 'Buaze entegrasyon gerektirmez. Memnun misafirler seçtikleri platforma (Google, TripAdvisor, Booking) yönlendirilir. Herhangi bir platform API\'sine gerek kalmaz.' : 'Buaze requires no integration. Happy guests are directed to their platform of choice (Google, TripAdvisor, Booking). No platform API required.',
    },
  ];

  return (
    <SolutionPageLayout
      locale={locale}
      t={t}
      industryKey="hot"
      icon={<BedDouble size={14} />}
      industryBadge={isTr ? 'OTEL & KONAKLAMA İÇİN' : 'FOR HOTELS & HOSPITALITY'}
      h1Prefix={t.sol_hot_h1.split(' ').slice(0, -1).join(' ')}
      h1Suffix={t.sol_hot_h1.split(' ').slice(-1)[0]}
      description={t.sol_hot_p}
      accentColor="#3b82f6"
      stats={stats}
      steps={steps}
      benefits={benefits}
      faqs={faqs}
    />
  );
}
