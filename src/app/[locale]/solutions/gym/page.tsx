import { Dumbbell, Star, ShieldCheck, TrendingUp, QrCode, Users, BarChart3, Zap, Timer } from 'lucide-react';
import SolutionPageLayout from '@/components/marketing/SolutionPageLayout';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = getTranslations(locale);
  const title = locale === 'tr'
    ? 'Spor Salonu & Fitness Merkezi İtibar Yönetimi — Buaze'
    : 'Gym & Fitness Center Reputation Management — Buaze';
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
      canonical: `https://buaze.com/${locale}/solutions/gym`,
      languages: { tr: 'https://buaze.com/tr/solutions/gym', en: 'https://buaze.com/en/solutions/gym' },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/solutions/gym` },
  };
}

export default async function GymSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const stats = [
    { num: '%78', label: isTr ? 'ÜYE TUTMA ORANI' : 'MEMBER RETENTION', context: isTr ? 'Yıllık ortalama' : 'Yearly average' },
    { num: '+%156', label: isTr ? 'YENİ ÜYE EDİNİMİ' : 'NEW MEMBER ACQU.', context: isTr ? 'Organik yorum' : 'Organic reviews' },
    { num: '%62', label: isTr ? 'AZ TERK' : 'LESS CHURN', context: isTr ? 'Feedback takibi' : 'Feedback tracking' },
    { num: '<3dk', label: isTr ? 'KURULUM' : 'SETUP', context: isTr ? 'Anında hazır' : 'Instantly ready' },
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
        ? 'Memnuniyetsiz üyeyi erken tespit edin. Proaktif iletişimle üye kaybını %62\'ye kadar azaltın.'
        : 'Identify dissatisfied members early. Reduce member churn by up to 62% with proactive communication.',
    },
  ];

  const benefits = [
    {
      title: isTr ? 'Üye Bağlılığı' : 'Member Loyalty',
      desc: isTr ? 'Geri bildirim alan üye salonunuza bağlılık hisseder. Yıllık üyelik yenileme oranı artar.' : 'Members who receive feedback feel connected to your gym. Annual membership renewal rate increases.',
      icon: <Star size={20} className="text-[#F4B400]" />,
    },
    {
      title: isTr ? 'Antrenör Performansı' : 'Trainer Performance',
      desc: isTr ? 'Her antrenör için ayrı metrikler. Hangi antrenörün üyelerden daha iyi değerlendirme aldığını görün.' : 'Separate metrics for each trainer. See which trainer gets better reviews from members.',
      icon: <Users size={20} className="text-[#F4B400]" />,
    },
    {
      title: isTr ? 'Ekipman Takibi' : 'Equipment Tracking',
      desc: isTr ? 'Üyeler hangi ekipman sorunlarını bildiriyor? Geri bildirimlerle bakım önceliklerini belirleyin.' : 'Which equipment issues are members reporting? Determine maintenance priorities with feedback.',
      icon: <Dumbbell size={20} className="text-[#F4B400]" />,
    },
    {
      title: isTr ? 'Google\'da Büyü' : 'Grow on Google',
      desc: isTr ? '"Yakınımdaki spor salonu" aramasında üst sıralara çıkın. Daha fazla yorum = daha fazla üye.' : 'Rise to the top for "gym near me" searches. More reviews = more members.',
      icon: <TrendingUp size={20} className="text-[#F4B400]" />,
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
      accentColor="#F4B400"
      stats={stats}
      steps={steps}
      benefits={benefits}
      faqs={faqs}
    />
  );
}
