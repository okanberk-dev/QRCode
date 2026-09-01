import { PawPrint, Star, ShieldCheck, TrendingUp, QrCode, Users, Heart } from 'lucide-react';
import SolutionPageLayout from '@/components/marketing/SolutionPageLayout';
import { IllusVet } from '@/components/marketing/solution-illustrations';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import type { Metadata } from 'next';

// Stage 83 §38.163 — ISR inherits `revalidate = 3600` (1h) from
// `[locale]/layout.tsx`. CLAUDE.md §38.163 — marketing pages now ship
// from the Vercel CDN edge for anonymous visitors.

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === 'tr'
    ? 'Veteriner Kliniği İtibar Yönetimi'
    : 'Veterinary Clinic Reputation Management';
  const description = locale === 'tr'
    ? 'Evcil hayvan sahiplerinin güvenini kazanın. Veteriner kliniğinizin Google yorumlarını artırın ve yeni hasta edinin.'
    : "Win the trust of pet owners. Increase your veterinary clinic's Google reviews and gain new patients.";
  return {
    title,
    description,
    keywords: locale === 'tr'
      ? ['veteriner itibar yönetimi', 'veteriner klinik google yorumları', 'evcil hayvan kliniği feedback']
      : ['veterinary reputation management', 'vet clinic google reviews', 'pet clinic feedback'],
    alternates: {
      canonical: `https://buaze.com/${locale}/solutions/veterinary`,
      languages: { tr: 'https://buaze.com/tr/solutions/veterinary', en: 'https://buaze.com/en/solutions/veterinary', 'x-default': 'https://buaze.com/tr/solutions/veterinary' },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      title,
      description,
      url: `https://buaze.com/${locale}/solutions/veterinary`,
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

export default async function VeterinarySolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const stats = [
    { num: '%88', label: isTr ? 'GERİ DÖNÜŞ ORANI' : 'RETURN RATE', context: isTr ? 'Tekrar ziyaret' : 'Repeat visits' },
    { num: '+%180', label: isTr ? 'GOOGLE YORUMU' : 'GOOGLE REVIEWS', context: isTr ? '90 günde' : 'In 90 days' },
    { num: '%95', label: isTr ? 'SAHİP MEMNUNİYETİ' : 'OWNER SATISFACTION', context: isTr ? 'Anket ortalaması' : 'Survey avg.' },
    { num: '<5dk', label: isTr ? 'KURULUM' : 'SETUP', context: isTr ? 'Hızlı başlangıç' : 'Quick start' },
  ];

  const steps = [
    {
      icon: <QrCode size={24} />,
      title: isTr ? 'Muayene Sonrası QR Göster' : 'Show QR After Examination',
      desc: isTr
        ? 'Evcil hayvan muayenesi sonrası sahibe QR kodu içeren kartvizit verin. Ödeme sonrası kolayca tarar.'
        : 'After the pet examination, give the owner a business card with the QR code. They scan easily after payment.',
    },
    {
      icon: <Heart size={24} />,
      title: isTr ? 'Evcil Hayvan Odaklı Form' : 'Pet-Focused Feedback Form',
      desc: isTr
        ? 'Hayvan ismi ve türüyle kişiselleştirilmiş geri bildirim formu. Sahipler duygusal bağla değerlendirme yapar.'
        : 'Personalized feedback form with pet name and species. Owners evaluate with emotional connection.',
    },
    {
      icon: <Users size={24} />,
      title: isTr ? 'Topluluk Oluştur' : 'Build Community',
      desc: isTr
        ? 'Her evcil hayvan sahibine kliniğin Google yorum bağlantısı sunulur. Ağızdan ağıza tavsiyeyi dijitale taşıyın — yıldıza göre dallandırma yok.'
        : "Every pet owner is offered the clinic's Google review link. Take word-of-mouth recommendations to the digital world — no rating-based gating.",
    },
  ];

  const benefits = [
    {
      title: isTr ? 'Evcil Hayvan Sahipleri Güven İster' : 'Pet Owners Want Trust',
      desc: isTr ? 'Hayvanlı ebeveynler kliniği seçerken yorumları dikkatle inceler. Bol olumlu yorum tercih sebebi olur.' : 'Pet parents carefully review ratings when choosing a clinic. Many positive reviews become a reason for choice.',
      icon: <Star size={20} className="text-[#C6F24E]" />,
    },
    {
      title: isTr ? 'Veteriner Hekim Puanları' : 'Vet Doctor Ratings',
      desc: isTr ? 'Her veteriner için ayrı değerlendirme metrikleri. Performansı ölçün, ekip gelişimini destekleyin.' : 'Separate evaluation metrics for each vet. Measure performance and support team development.',
      icon: <ShieldCheck size={20} className="text-[#84cc16]" />,
    },
    {
      title: isTr ? 'Organik Büyüme' : 'Organic Growth',
      desc: isTr ? 'Evcil hayvan sahipleri sıkı bir topluluktur. Bir klinikten memnun kalan tüm çevresine anlatır.' : 'Pet owners are a tight-knit community. A satisfied client tells everyone in their circle.',
      icon: <TrendingUp size={20} className="text-[#84cc16]" />,
    },
    {
      title: isTr ? 'Acil Durum Takibi' : 'Emergency Follow-up',
      desc: isTr ? 'Acil tedavi sonrası hayvan sahibine otomatik takip mesajı gönderin. Güveni pekiştirin.' : 'Send automatic follow-up messages to pet owners after emergency treatment. Reinforce trust.',
      icon: <Heart size={20} className="text-[#84cc16]" />,
    },
  ];

  const faqs = [
    {
      q: isTr ? 'Geri bildirim formu evcil hayvanın adıyla kişiselleştirilebilir mi?' : "Can the feedback form be personalized with the pet's name?",
      a: isTr ? 'Evet. QR bağlantısına evcil hayvan adı ve son ziyaret bilgisini ekleyerek kişiselleştirilmiş deneyim yaratabilirsiniz. Bu duygusal bağ tamamlama oranını artırır.' : "Yes. You can create a personalized experience by adding the pet's name and last visit info to the QR link. This emotional connection increases completion rate.",
    },
    {
      q: isTr ? 'Birden fazla veteriner için kullanabilir miyim?' : 'Can I use it for multiple vets?',
      a: isTr ? 'Evet. Her veteriner hekim için ayrı QR kodu ve performans metrikleri oluşturabilirsiniz. Tüm verileri merkezi panelden takip edebilirsiniz.' : 'Yes. You can create separate QR codes and performance metrics for each veterinarian. You can track all data from a central dashboard.',
    },
  ];

  return (
    <SolutionPageLayout
      locale={locale}
      t={t}
      industryKey="vet"
      icon={<PawPrint size={14} />}
      industryBadge={isTr ? 'VETERİNER KLİNİKLERİ İÇİN' : 'FOR VETERINARY CLINICS'}
      h1Prefix={isTr ? 'Evcil Dostların' : "Pet Owners Trust"}
      h1Suffix={isTr ? 'Güveni' : 'Your Clinic'}
      description={isTr
        ? 'Evcil hayvan sahiplerinin dijital güvenini kazanın. Veteriner kliniğinizin itibarını Buaze ile büyütün.'
        : "Win the digital trust of pet owners. Grow your veterinary clinic's reputation with Buaze."}
      accentColor="#84cc16"
      stats={stats}
      steps={steps}
      benefits={benefits}
      faqs={faqs}
      howToSteps={isTr ? [
        { name: 'Kliniği tanımla', text: 'Veteriner kliniği adı, kategori, adres ve bildirim e-postasını Buaze panelinde gir; Google yorum bağlantısını ekle.' },
        { name: 'Muayene sonrası QR sun', text: 'Resepsiyon tezgahında veya tedavi sonrası bilgilendirme noktasında QR yerleştir; veteriner etiketi için URL parametresi kullan.' },
        { name: 'Veteriner ve resepsiyonu ekibe ekle', text: 'Veterinerleri ve resepsiyonu Buaze ekibine davet et; düşük puanlar doğru veterinerin inbox\'ına düşsün.' },
        { name: 'Pulse AI ile empatik yanıt yaz', text: 'Pulse AI yanıtları evcil hayvan sahibine empatik tonda taslak üretir — veteriner onaylar, gönderir; veteriner bazlı analitiklerden örüntüleri oku.' },
      ] : [
        { name: 'Identify the clinic', text: 'Enter veterinary clinic name, category, address and notification email in the Buaze panel; add the Google review link.' },
        { name: 'Offer the QR post-visit', text: 'Place the QR at the reception desk or in a post-treatment information point; use a URL parameter for the veterinarian tag.' },
        { name: 'Invite veterinarians and reception', text: 'Add veterinarians and reception to your Buaze team so low ratings reach the right veterinarian.' },
        { name: 'Reply with empathy via Pulse AI', text: 'Pulse AI drafts replies in an empathetic tone for the pet owner — veterinarian approves and sends; per-vet analytics show patterns.' },
      ]}
      illustration={<IllusVet />}
    />
  );
}
