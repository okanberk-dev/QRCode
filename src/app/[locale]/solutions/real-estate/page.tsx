import { Home, Star, TrendingUp, QrCode, Users, Building2, BarChart3 } from 'lucide-react';
import SolutionPageLayout from '@/components/marketing/SolutionPageLayout';
import { IllusRealEstate } from '@/components/marketing/solution-illustrations';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import type { Metadata } from 'next';

// Stage 83 §38.163 — ISR inherits `revalidate = 3600` (1h) from
// `[locale]/layout.tsx`. CLAUDE.md §38.163 — marketing pages now ship
// from the Vercel CDN edge for anonymous visitors.

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === 'tr'
    ? 'Gayrimenkul & Emlak Ofisi İtibar Yönetimi'
    : 'Real Estate Agency Reputation Management';
  const description = locale === 'tr'
    ? 'Danışman bazlı QR kodlar ve müşteri geri bildirimleriyle gayrimenkul ofisinizin güvenilirliğini artırın.'
    : 'Increase your real estate agency\'s credibility with consultant-based QR codes and client feedback.';
  return {
    title,
    description,
    keywords: locale === 'tr'
      ? ['gayrimenkul itibar yönetimi', 'emlak ofisi google yorumları', 'danışman müşteri memnuniyeti', 'emlakçı feedback']
      : ['real estate reputation management', 'realtor google reviews', 'agent client satisfaction'],
    alternates: {
      canonical: `https://www.buaze.com/${locale}/solutions/real-estate`,
      languages: { tr: 'https://www.buaze.com/tr/solutions/real-estate', en: 'https://www.buaze.com/en/solutions/real-estate', 'x-default': 'https://www.buaze.com/tr/solutions/real-estate' },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      title,
      description,
      url: `https://www.buaze.com/${locale}/solutions/real-estate`,
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

export default async function RealEstateSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const stats = [
    { num: '10', label: isTr ? 'YORUM PLATFORMU' : 'REVIEW PLATFORMS', context: isTr ? 'Google dahil' : 'Google included' },
    { num: isTr ? '14 gün' : '14 days', label: isTr ? 'ÜCRETSİZ DENEME' : 'FREE TRIAL', context: isTr ? 'Kredi kartı gerekmez' : 'No card required' },
    { num: 'Portföy', label: isTr ? 'BAZLI QR KOD' : 'BASED QR CODE', context: isTr ? 'Her mülk için' : 'For each property' },
    { num: 'TR + EN', label: isTr ? 'İKİ DİL' : 'TWO LANGUAGES', context: isTr ? 'Yabancı alıcılar için' : 'For international buyers' },
  ];

  const steps = [
    {
      icon: <QrCode size={24} />,
      title: isTr ? 'Danışman & Mülk Bazlı QR' : 'Agent & Property QR',
      desc: isTr
        ? 'Her danışman ve portföy için ayrı QR kodu oluşturun. Müşteriler işlem sonrası kolayca değerlendirme yapar.'
        : 'Create separate QR codes for each agent and portfolio. Clients easily review after the transaction.',
    },
    {
      icon: <Building2 size={24} />,
      title: isTr ? 'Satış / Kiralama Sonrası Tetikle' : 'Trigger After Sale / Rental',
      desc: isTr
        ? 'Tapu devri veya kira sözleşmesi sonrası otomatik geri bildirim akışı başlatın. Müşteri anında değerlendirir.'
        : 'Initiate automatic feedback flow after title transfer or lease agreement. Client reviews instantly.',
    },
    {
      icon: <BarChart3 size={24} />,
      title: isTr ? 'Danışman Performansını Ölç' : 'Measure Agent Performance',
      desc: isTr
        ? 'Her danışmanın müşteri memnuniyet skoru, Google yorum sayısı ve referans oranını karşılaştırın.'
        : 'Compare each agent\'s client satisfaction score, Google review count and referral rate.',
    },
  ];

  const benefits = [
    {
      title: isTr ? 'Satın Alma Kararını Hızlandırır' : 'Accelerates Purchase Decision',
      desc: isTr ? 'Gayrimenkul yüksek güven gerektiren bir sektördür. Bol olumlu yorum müşterinin karar sürecini kısaltır.' : 'Real estate is a sector requiring high trust. Many positive reviews shorten the client decision process.',
      icon: <TrendingUp size={20} className="text-[#f97316]" />,
    },
    {
      title: isTr ? 'Danışman Rekabeti' : 'Agent Competition',
      desc: isTr ? 'Her danışman kendi itibarını geliştirmek için motive olur. Ofis genelinde kalite artar.' : 'Each agent is motivated to improve their own reputation. Overall office quality increases.',
      icon: <Star size={20} className="text-[#C6F24E]" />,
    },
    {
      title: isTr ? 'Mülk Bazlı İtibar' : 'Property-Based Reputation',
      desc: isTr ? 'Her proje veya mülk için ayrı QR kod. Hangi portföyün daha iyi değerlendirme aldığını görün.' : 'Separate QR code for each project or property. See which portfolio gets better reviews.',
      icon: <Building2 size={20} className="text-[#f97316]" />,
    },
    {
      title: isTr ? 'Referans Zinciri' : 'Referral Chain',
      desc: isTr ? 'Memnun alıcı/kiracı çevresine tavsiye eder. Gayrimenkulde referans, en değerli müşteri kaynağıdır.' : 'Satisfied buyer/tenant recommends to their circle. In real estate, referrals are the most valuable client source.',
      icon: <Users size={20} className="text-[#f97316]" />,
    },
  ];

  const faqs = [
    {
      q: isTr ? 'Her danışman için ayrı QR kodu yapabilir miyim?' : 'Can I create separate QR codes for each agent?',
      a: isTr ? 'Evet. Her danışman için ayrı QR kodu ve performans metrikleri oluşturabilirsiniz. Hangi danışmanın daha iyi değerlendirme aldığını karşılaştırabilirsiniz.' : 'Yes. You can create separate QR codes and performance metrics for each agent. You can compare which agent gets better reviews.',
    },
    {
      q: isTr ? 'Müşteri satıştan ne kadar sonra değerlendirme yapabilir?' : 'How long after a sale can a client leave a review?',
      a: isTr ? 'Geri bildirim akışı satış/kiralama sonrası istediğiniz zaman diliminde tetiklenebilir. 1 hafta, 1 ay veya taşınma sonrası gibi özel zamanlamalar ayarlayabilirsiniz.' : 'The feedback flow can be triggered at any time frame you choose after sale/rental. You can set custom timings like 1 week, 1 month, or after moving in.',
    },
  ];

  return (
    <SolutionPageLayout
      locale={locale}
      t={t}
      industryKey="re"
      icon={<Home size={14} />}
      industryBadge={isTr ? 'GAYRİMENKUL İÇİN' : 'FOR REAL ESTATE'}
      h1Prefix={isTr ? 'Emlak Sektöründe' : 'Real Estate'}
      h1Suffix={isTr ? 'Güven Markası' : 'Trust Brand'}
      description={isTr
        ? 'Danışman bazlı QR sistemle müşteri güvenini dijitale taşıyın. Gayrimenkul ofisinizin itibarını Buaze ile güçlendirin.'
        : 'Move client trust to digital with agent-based QR system. Strengthen your real estate office\'s reputation with Buaze.'}
      accentColor="#f97316"
      stats={stats}
      steps={steps}
      benefits={benefits}
      faqs={faqs}
      howToSteps={isTr ? [
        { name: 'Emlak ofisini tanımla', text: 'Ofis adı, kategori, adres ve bildirim e-postasını Buaze panelinde gir; Google yorum bağlantısını ekle.' },
        { name: 'Satış / kira sonrası QR gönder', text: 'Tapu devir günü veya kira sözleşmesi imzasında müşteriye QR bağlantısını ulaştır; danışman etiketi için URL parametresi kullan.' },
        { name: 'Danışmanları ekibe ekle', text: 'Emlak danışmanlarını ve ofis müdürünü Buaze ekibine davet et; düşük puanlar doğru danışmanın inbox\'ına düşsün.' },
        { name: 'Pulse AI ile profesyonel yanıt yaz', text: 'Pulse AI yanıtları resmi tonda taslak üretir — danışman onaylar, gönderir; danışman bazlı analitiklerden örüntüleri oku.' },
      ] : [
        { name: 'Identify the agency', text: 'Enter agency name, category, address and notification email in the Buaze panel; add the Google review link.' },
        { name: 'Send the QR after sale / lease', text: 'Deliver the QR link to the customer on title-transfer day or at lease signing; use a URL parameter for the agent tag.' },
        { name: 'Invite agents', text: 'Add real-estate agents and the office manager to your Buaze team so low ratings reach the right agent.' },
        { name: 'Reply professionally via Pulse AI', text: 'Pulse AI drafts replies in a formal tone — agent approves and sends; per-agent analytics show patterns.' },
      ]}
      illustration={<IllusRealEstate />}
    />
  );
}
