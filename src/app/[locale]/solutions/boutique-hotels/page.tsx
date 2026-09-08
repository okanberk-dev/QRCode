import { Bed, Star, ShieldCheck, TrendingUp, QrCode, Heart, BarChart3 } from 'lucide-react';
import SolutionPageLayout from '@/components/marketing/SolutionPageLayout';
import { IllusBoutique } from '@/components/marketing/solution-illustrations';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import type { Metadata } from 'next';

// Stage 83 §38.163 — ISR inherits `revalidate = 3600` (1h) from
// `[locale]/layout.tsx`. CLAUDE.md §38.163 — marketing pages now ship
// from the Vercel CDN edge for anonymous visitors.

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === 'tr'
    ? 'Butik Otel İtibar Yönetimi'
    : 'Boutique Hotel Reputation Management';
  const description = locale === 'tr'
    ? 'Kişisel konaklama deneyimini dijital itibara dönüştürün. TripAdvisor ve Google\'da öne çıkın, misafir dönüşünü artırın.'
    : 'Turn personalized hospitality experience into digital reputation. Stand out on TripAdvisor and Google, increase guest return.';
  return {
    title,
    description,
    keywords: locale === 'tr'
      ? ['butik otel itibar', 'butik otel google yorumları', 'misafir memnuniyeti otel', 'küçük otel feedback']
      : ['boutique hotel reputation', 'boutique hotel google reviews', 'guest satisfaction small hotel'],
    alternates: {
      canonical: `https://www.buaze.com/${locale}/solutions/boutique-hotels`,
      languages: { tr: 'https://www.buaze.com/tr/solutions/boutique-hotels', en: 'https://www.buaze.com/en/solutions/boutique-hotels', 'x-default': 'https://www.buaze.com/tr/solutions/boutique-hotels' },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      title,
      description,
      url: `https://www.buaze.com/${locale}/solutions/boutique-hotels`,
      images: [{ url: locale === 'tr' ? '/images/open-graph-tr.png' : '/images/open-graph-en.png', width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [locale === 'tr' ? '/images/open-graph-tr.png' : '/images/open-graph-en.png'],
    },
  };
}

export default async function BoutiqueHotelsSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const stats = [
    { num: '+%120', label: isTr ? 'TRİPADVISOR YORUMU' : 'TRIPADVISOR REVIEWS', context: isTr ? '90 günde' : 'In 90 days' },
    { num: '%93', label: isTr ? 'MİSAFİR MEMNUNİYETİ' : 'GUEST SATISFACTION', context: isTr ? 'Kişisel deneyim' : 'Personal experience' },
    { num: '%82', label: isTr ? 'TEKKERARİ REZ.' : 'REPEAT BOOKINGS', context: isTr ? 'Sadık misafirler' : 'Loyal guests' },
    { num: '<4dk', label: isTr ? 'KURULUM' : 'SETUP', context: isTr ? 'Hızlı başlangıç' : 'Quick start' },
  ];

  const steps = [
    {
      icon: <QrCode size={24} />,
      title: isTr ? 'Odaya Kişiselleştirilmiş QR Koy' : 'Place Personalized QR in Room',
      desc: isTr
        ? 'Her oda için kişiselleştirilmiş QR kodu ve karşılama notu. Misafir adıyla kişiselleştirilmiş geri bildirim formu.'
        : 'Personalized QR code and welcome note for each room. Feedback form personalized with guest name.',
    },
    {
      icon: <Heart size={24} />,
      title: isTr ? 'Konaklamanın Ortasında Bile Al' : 'Get Feedback Even Mid-Stay',
      desc: isTr
        ? 'Check-out beklemek zorunda değilsiniz. Konaklama süresinde orta nokta geri bildirimi alın, sorunları anında çözün.'
        : 'No need to wait for check-out. Get mid-stay feedback and resolve issues instantly.',
    },
    {
      icon: <BarChart3 size={24} />,
      title: isTr ? 'Misafir Hikayesi Oluştur' : 'Create Guest Story',
      desc: isTr
        ? 'Check-out sonrası her misafire TripAdvisor, Google ve Booking yorum bağlantılarını sunun. Hangi platformda paylaşacağına misafir karar verir; siz sadece kolaylığı sağlarsınız.'
        : 'After check-out, offer every guest the TripAdvisor, Google and Booking review links. The guest chooses where to share — you just remove the friction.',
    },
  ];

  const benefits = [
    {
      title: isTr ? 'Kişisel Dokunuş' : 'Personal Touch',
      desc: isTr ? 'Butik otelin en büyük avantajı kişisel hizmet. Geri bildirim sisteminiz de bu kişiselliği yansıtmalı.' : 'The biggest advantage of a boutique hotel is personal service. Your feedback system should also reflect this personalization.',
      icon: <Heart size={20} className="text-[#d97706]" />,
    },
    {
      title: isTr ? 'TripAdvisor Sıralaması' : 'TripAdvisor Ranking',
      desc: isTr ? 'Düzenli ve güncel yorumlar TripAdvisor algoritmasını besler. Bölgenizde üst sıralara çıkın.' : 'Regular and recent reviews feed the TripAdvisor algorithm. Rise to the top in your region.',
      icon: <TrendingUp size={20} className="text-[#d97706]" />,
    },
    {
      title: isTr ? 'Erken Şikayet Çözümü' : 'Early Complaint Resolution',
      desc: isTr ? 'Konaklama süresinde alınan geri bildirim, check-out\'ta kaybetme riskini ortadan kaldırır.' : 'Feedback received during stay eliminates the risk of losing guests at check-out.',
      icon: <ShieldCheck size={20} className="text-[#d97706]" />,
    },
    {
      title: isTr ? 'Sadık Misafir Kitlesi' : 'Loyal Guest Base',
      desc: isTr ? 'Kişisel ilgi gören misafir tekrar aynı oteli tercih eder. Sadakat programını dijital geri bildirimle destekleyin.' : 'Guests who receive personal attention return to the same hotel. Support your loyalty program with digital feedback.',
      icon: <Star size={20} className="text-[#C6F24E]" />,
    },
  ];

  const faqs = [
    {
      q: isTr ? 'Check-out öncesi geri bildirim alabilir miyim?' : 'Can I get feedback before check-out?',
      a: isTr ? 'Evet. Buaze mid-stay (konaklama ortası) geri bildirim özelliği sunar. Konaklama 3. günü veya belirlediğiniz bir günde misafire otomatik geri bildirim talebi gönderilir. Sorunları çıkmadan önce çözebilirsiniz.' : 'Yes. Buaze offers mid-stay feedback feature. An automatic feedback request is sent to the guest on the 3rd day of stay or a day you specify. You can resolve issues before they arise.',
    },
    {
      q: isTr ? 'TripAdvisor\'a yönlendirme yapabilir miyim?' : 'Can I direct guests to TripAdvisor?',
      a: isTr ? 'Evet. Her misafir geri bildirim akışında Google, TripAdvisor veya Booking yorum bağlantılarını görebilir. Hangi platformların gösterileceğini siz seçersiniz; misafir hangisinde yorum yazacağına kendisi karar verir.' : 'Yes. Every guest can see Google, TripAdvisor and Booking review links in the feedback flow. You choose which platforms to surface; the guest decides where to post.',
    },
  ];

  return (
    <SolutionPageLayout
      locale={locale}
      t={t}
      industryKey="bho"
      icon={<Bed size={14} />}
      industryBadge={isTr ? 'BUTİK OTELLER İÇİN' : 'FOR BOUTIQUE HOTELS'}
      h1Prefix={isTr ? 'Kişisel Deneyimi' : 'Turn Personal'}
      h1Suffix={isTr ? 'İtibara Dönüştür' : 'Experience to Reputation'}
      description={isTr
        ? 'Misafir memnuniyetini TripAdvisor ve Google\'a yansıtın. Butik otelinizin özgün hikayesini dijital itibarla destekleyin.'
        : "Reflect guest satisfaction to TripAdvisor and Google. Support your boutique hotel's unique story with digital reputation."}
      accentColor="#d97706"
      stats={stats}
      steps={steps}
      benefits={benefits}
      faqs={faqs}
      howToSteps={isTr ? [
        { name: 'Butik oteli tanımla', text: 'Tesis adı, kategori ve bildirim e-postasını Buaze panelinde gir; Booking, Tripadvisor, Airbnb ve Google yorum bağlantılarını ekle.' },
        { name: 'Oda ve karşılama QR\'larını yerleştir', text: 'Her oda için oda numaralı QR + karşılama deskinde genel QR + kahvaltı/teras noktalarında ek temas noktaları kur.' },
        { name: 'Resepsiyonu ekibe ekle', text: 'Resepsiyon, kat hizmetleri ve F&B sorumlularını Buaze ekibine davet et; oda/temas noktası bazlı düşük puanlar doğru ekibe düşsün.' },
        { name: 'Pulse AI ile çok-dilli sıcak yanıt yaz', text: 'Misafir hangi dilde yazarsa Pulse AI o dilde sıcak tonda yanıt taslağı üretir — resepsiyon onaylar, gönderir.' },
      ] : [
        { name: 'Identify the boutique property', text: 'Enter property name, category and notification email in the Buaze panel; add Booking, Tripadvisor, Airbnb and Google review links.' },
        { name: 'Place room and welcome-desk QRs', text: 'Use a room-numbered QR per room + a general QR at the welcome desk + extra touchpoints at breakfast/terrace if relevant.' },
        { name: 'Invite reception and operations', text: 'Add reception, housekeeping and F&B leads to your Buaze team so room/touchpoint low ratings reach the right person.' },
        { name: 'Reply warmly in any language via Pulse AI', text: 'Pulse AI drafts replies in the guest\'s language with a warm tone — reception approves and sends.' },
      ]}
      illustration={<IllusBoutique />}
    />
  );
}
