import { Car, Star, ShieldCheck, TrendingUp, QrCode, Wrench, BarChart3 } from 'lucide-react';
import SolutionPageLayout from '@/components/marketing/SolutionPageLayout';
import { IllusAuto } from '@/components/marketing/solution-illustrations';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import type { Metadata } from 'next';

// Stage 83 §38.163 — ISR inherits `revalidate = 3600` (1h) from
// `[locale]/layout.tsx`. CLAUDE.md §38.163 — marketing pages now ship
// from the Vercel CDN edge for anonymous visitors.

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === 'tr'
    ? 'Oto Servis & Tamir İtibar Yönetimi'
    : 'Auto Service & Repair Reputation Management';
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
      canonical: `https://www.buaze.com/${locale}/solutions/auto-service`,
      languages: { tr: 'https://www.buaze.com/tr/solutions/auto-service', en: 'https://www.buaze.com/en/solutions/auto-service', 'x-default': 'https://www.buaze.com/tr/solutions/auto-service' },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      title,
      description,
      url: `https://www.buaze.com/${locale}/solutions/auto-service`,
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

export default async function AutoServiceSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const stats = [
    { num: '10', label: isTr ? 'YORUM PLATFORMU' : 'REVIEW PLATFORMS', context: isTr ? 'Google dahil' : 'Google included' },
    { num: isTr ? '14 gün' : '14 days', label: isTr ? 'ÜCRETSİZ DENEME' : 'FREE TRIAL', context: isTr ? 'Kredi kartı gerekmez' : 'No card required' },
    { num: 'QR', label: isTr ? 'TESLİM ANINDA' : 'AT HANDOVER', context: isTr ? 'Fiş veya anahtar kartında' : 'On the receipt or key tag' },
    { num: 'TR + EN', label: isTr ? 'İKİ DİL' : 'TWO LANGUAGES', context: isTr ? 'Türkçe ve İngilizce arayüz' : 'Turkish and English interface' },
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
      title: isTr ? 'Hızlı Servis Kurtarma' : 'Fast Service Recovery',
      desc: isTr ? 'Müşteri kamuya açık yorumun yanında işletmene özel geri bildirim de bırakırsa, anında haberdar olursun. Servis sorunlarını büyümeden çözersin — ama müşterinin Google\'a yazma hakkını engellemeyiz.' : 'When a customer also shares private feedback alongside the public review, you hear about it instantly — solve service issues before they grow, without ever blocking the customer\'s right to post on Google.',
      icon: <ShieldCheck size={20} className="text-[#64748b]" />,
    },
    {
      title: isTr ? 'Sadık Müşteri Kitlesi' : 'Loyal Customer Base',
      desc: isTr ? 'Geri bildirime hızlı dönen servis, müşteriyle güveni güçlendirir ve tekrar gelmesini kolaylaştırır.' : 'A service that follows up quickly on feedback builds trust and makes customers more likely to return.',
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
      howToSteps={isTr ? [
        { name: 'Servisi tanımla', text: 'Servis adı, kategori, adres ve bildirim e-postasını Buaze panelinde gir; Google yorum bağlantısını ekle.' },
        { name: 'Araç teslimi noktasında QR sun', text: 'Müşteri aracı teslim alırken fatura altına veya teslim formuna QR yerleştir; usta/servis danışmanı etiketi URL parametresinde taşı.' },
        { name: 'Usta ve danışmanları ekibe ekle', text: 'Servis sorumluları ve danışmanları Buaze ekibine davet et; düşük puanlar doğru ustanın inbox\'ına düşsün.' },
        { name: 'Pulse AI ile teknik yanıt yaz', text: 'Pulse AI taslakları markaya özel, kısa ve teknik tonda — operatör onaylar, gönderir; usta bazlı analitiklerden hangi vardiyanın sonucu güçlü oku.' },
      ] : [
        { name: 'Identify the service centre', text: 'Enter service-centre name, category, address and notification email in the Buaze panel; add the Google review link.' },
        { name: 'Offer the QR at vehicle hand-over', text: 'Place the QR on the invoice or hand-over form when the customer collects the vehicle; carry the technician/advisor tag in a URL parameter.' },
        { name: 'Invite technicians and advisors', text: 'Add technicians and service advisors to your Buaze team so low ratings reach the right inbox.' },
        { name: 'Reply in a technical tone via Pulse AI', text: 'Pulse AI drafts brand-specific, technical-tone replies — operator approves and sends; per-technician analytics show which shift performed best.' },
      ]}
      illustration={<IllusAuto />}
    />
  );
}
