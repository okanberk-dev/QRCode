import { Dumbbell, Star, TrendingUp, QrCode, Users, BarChart3, Timer } from 'lucide-react';
import SolutionPageLayout from '@/components/marketing/SolutionPageLayout';
import { IllusGym } from '@/components/marketing/solution-illustrations';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import type { Metadata } from 'next';

// Stage 83 §38.163 — ISR inherits `revalidate = 3600` (1h) from
// `[locale]/layout.tsx`. CLAUDE.md §38.163 — marketing pages now ship
// from the Vercel CDN edge for anonymous visitors.

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === 'tr'
    ? 'Spor Salonu & Fitness Merkezi İtibar Yönetimi'
    : 'Gym & Fitness Center Reputation Management';
  const description = locale === 'tr'
    ? 'Üye memnuniyetini ölçün, üye kaybını azaltın. Spor salonunuzun Google yorumlarını artırın ve yeni üye kazanın.'
    : 'Measure member satisfaction, reduce member churn. Increase your gym\'s Google reviews and gain new members.';
  return {
    title,
    description,
    keywords: locale === 'tr'
      ? ['spor salonu itibar', 'fitness merkezi google yorumları', 'üye memnuniyeti', 'gym feedback sistemi']
      : ['gym reputation management', 'fitness center google reviews', 'member satisfaction', 'gym feedback system'],
    alternates: {
      canonical: `https://www.buaze.com/${locale}/solutions/gym`,
      languages: { tr: 'https://www.buaze.com/tr/solutions/gym', en: 'https://www.buaze.com/en/solutions/gym', 'x-default': 'https://www.buaze.com/tr/solutions/gym' },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      title,
      description,
      url: `https://www.buaze.com/${locale}/solutions/gym`,
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

export default async function GymSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const stats = [
    { num: '10', label: isTr ? 'YORUM PLATFORMU' : 'REVIEW PLATFORMS', context: isTr ? 'Google dahil' : 'Google included' },
    { num: isTr ? 'Anlık' : 'Instant', label: isTr ? 'DÜŞÜK PUAN UYARISI' : 'LOW-RATING ALERT', context: isTr ? 'E-posta ile' : 'By e-mail' },
    { num: isTr ? '3 ton' : '3 tones', label: isTr ? 'PULSE AI TASLAĞI' : 'PULSE AI DRAFTS', context: isTr ? 'Siz onaylar, gönderirsiniz' : 'You approve and send' },
    { num: isTr ? '14 gün' : '14 days', label: isTr ? 'ÜCRETSİZ DENEME' : 'FREE TRIAL', context: isTr ? 'Kredi kartı gerekmez' : 'No card required' },
  ];

  const steps = [
    {
      icon: <QrCode size={24} />,
      title: isTr ? 'Giriş / Çıkış Noktasına Yerleştir' : 'Place at Entry / Exit Point',
      desc: isTr
        ? 'Turnike, resepsiyon veya soyunma odası girişine QR kodu koyun. Üyeler antrenman sonrası kolayca tarar.'
        : 'Place QR code at turnstile, reception or changing room entrance. Members scan easily after workout.',
    },
    {
      icon: <Timer size={24} />,
      title: isTr ? 'Aylık Check-in Hatırlatıcısı' : 'Monthly Check-in Reminder',
      desc: isTr
        ? 'Düzenli üyelerinize aylık geri bildirim hatırlatması gönderin. Üye memnuniyetini sürekli ölçün.'
        : 'Send monthly feedback reminders to regular members. Continuously measure member satisfaction.',
    },
    {
      icon: <BarChart3 size={24} />,
      title: isTr ? 'Üye Kaybını Önle' : 'Prevent Member Churn',
      desc: isTr
        ? 'Memnuniyetsiz üyeyi erken fark edin. Düşük puan uyarısı sayesinde ekibiniz aynı gün iletişime geçebilir.'
        : 'Spot unhappy members early. The low-rating alert lets your team reach out the same day.',
    },
  ];

  const benefits = [
    {
      title: isTr ? 'Üye Bağlılığı' : 'Member Loyalty',
      desc: isTr ? 'Geri bildirim alan üye salonunuza bağlılık hisseder. Yıllık üyelik yenileme oranı artar.' : 'Members who receive feedback feel connected to your gym. Annual membership renewal rate increases.',
      icon: <Star size={20} className="text-[#C6F24E]" />,
    },
    {
      title: isTr ? 'Antrenör Performansı' : 'Trainer Performance',
      desc: isTr ? 'Her antrenör için ayrı metrikler. Hangi antrenörün üyelerden daha iyi değerlendirme aldığını görün.' : 'Separate metrics for each trainer. See which trainer gets better reviews from members.',
      icon: <Users size={20} className="text-[#C6F24E]" />,
    },
    {
      title: isTr ? 'Ekipman Takibi' : 'Equipment Tracking',
      desc: isTr ? 'Üyeler hangi ekipman sorunlarını bildiriyor? Geri bildirimlerle bakım önceliklerini belirleyin.' : 'Which equipment issues are members reporting? Determine maintenance priorities with feedback.',
      icon: <Dumbbell size={20} className="text-[#C6F24E]" />,
    },
    {
      title: isTr ? 'Google\'da Büyü' : 'Grow on Google',
      desc: isTr ? 'Düzenli yeni yorumlar, "yakınımdaki spor salonu" aramalarında Google profilinizin güncel görünmesine yardımcı olur.' : 'A steady flow of new reviews helps your Google profile look current in "gym near me" searches.',
      icon: <TrendingUp size={20} className="text-[#C6F24E]" />,
    },
  ];

  const faqs = [
    {
      q: isTr ? 'Üye kaybı nasıl azaltılıyor?' : 'How is member churn reduced?',
      a: isTr ? 'Buaze, düşük memnuniyet skorları veren üyeleri sistematik olarak tespit eder. Bu üyelere özel iletişim kurarak sorunlarını çözmek için erken müdahale imkanı sağlar. Üyelerin memnuniyeti artınca devam etme eğilimi de artar.' : 'Buaze systematically identifies members who give low satisfaction scores. It provides an early intervention opportunity to resolve their issues with personalized communication. As member satisfaction increases, so does their tendency to stay.',
    },
    {
      q: isTr ? 'Çoklu şube için kullanabilir miyim?' : 'Can I use it for multiple branches?',
      a: isTr ? 'Evet, birden fazla spor salonu şubesi için tek panelden yönetim yapabilirsiniz. Her şube kendi QR kodlarına ve ayrı metriklerine sahip olur.' : 'Yes, you can manage multiple gym branches from a single dashboard. Each branch has its own QR codes and separate metrics.',
    },
  ];

  return (
    <SolutionPageLayout
      locale={locale}
      t={t}
      industryKey="gym"
      icon={<Dumbbell size={14} />}
      industryBadge={t.sol_gym_badge}
      h1Prefix={t.sol_gym_h1.split(' ').slice(0, -1).join(' ')}
      h1Suffix={t.sol_gym_h1.split(' ').slice(-1)[0]}
      description={t.sol_gym_p}
      accentColor="#C6F24E"
      stats={stats}
      steps={steps}
      benefits={benefits}
      faqs={faqs}
      howToSteps={isTr ? [
        { name: 'Salonu tanımla', text: 'Salon adı, kategori, adres ve bildirim e-postasını Buaze panelinde gir; Google ve sosyal medya yorum bağlantılarını ekle.' },
        { name: 'Locker / çıkış noktasına QR yerleştir', text: 'Soyunma odası, kapı çıkış standı veya antrenman sonrası bilgilendirme noktasına QR ekle; antrenör etiketi için URL parametresi kullan.' },
        { name: 'Antrenörleri ekibe ekle', text: 'Personal trainer\'ları ve operasyon sorumlularını Buaze ekibine davet et; düşük puanlar doğru antrenörün inbox\'ına düşsün.' },
        { name: 'Pulse AI ile motivasyonel yanıt yaz', text: 'Pulse AI yanıtları sıcak ve motivasyonel tonda taslak üretir — antrenör onaylar, gönderir; antrenör bazlı analitiklerden örüntüleri oku.' },
      ] : [
        { name: 'Identify the gym', text: 'Enter gym name, category, address and notification email in the Buaze panel; add Google and social-media review links.' },
        { name: 'Place the QR at the locker / exit point', text: 'Place the QR in the locker room, on an exit-door stand or in a post-workout information point; use a URL parameter for the trainer tag.' },
        { name: 'Invite trainers', text: 'Add personal trainers and operations leads to your Buaze team so low ratings reach the right trainer.' },
        { name: 'Reply in a motivational tone via Pulse AI', text: 'Pulse AI drafts replies in a warm, motivational tone — trainer approves and sends; per-trainer analytics show patterns.' },
      ]}
      illustration={<IllusGym />}
    />
  );
}
