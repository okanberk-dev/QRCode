import { Utensils, Star, ShieldCheck, TrendingUp, QrCode, Users, BarChart3, Zap, MessageSquare } from 'lucide-react';
import SolutionPageLayout from '@/components/marketing/SolutionPageLayout';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = getTranslations(locale);
  const title = locale === 'tr'
    ? 'Restoran & Kafe İtibar Yönetimi — Buaze'
    : 'Restaurant & Cafe Reputation Management — Buaze';
  const description = locale === 'tr'
    ? 'Google yorumlarınızı artırın, olumsuz geri bildirimleri erkenden yakalayın. 500+ restoran Buaze ile itibarını güçlendiriyor.'
    : 'Boost your Google reviews and catch negative feedback early. 500+ restaurants grow their reputation with Buaze.';
  return {
    title,
    description,
    keywords: locale === 'tr'
      ? ['restoran itibar yönetimi', 'kafe google yorumları', 'yemek yeri geri bildirim', 'QR menü yorum']
      : ['restaurant reputation management', 'cafe google reviews', 'dining feedback QR'],
    alternates: {
      canonical: `https://buaze.com/${locale}/solutions/restaurants`,
      languages: { tr: 'https://buaze.com/tr/solutions/restaurants', en: 'https://buaze.com/en/solutions/restaurants' },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/solutions/restaurants` },
  };
}

export default async function RestaurantSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const stats = [
    { num: '+184%', label: isTr ? 'ORGANİK YORUM' : 'ORGANIC REVIEWS', context: isTr ? 'İlk 90 gün ort.' : 'First 90 days avg.' },
    { num: '4.8/5', label: isTr ? 'ORT. GOOGLE PUANI' : 'AVG. GOOGLE SCORE', context: isTr ? 'Buaze kullanıcıları' : 'Buaze users' },
    { num: '12dk', label: isTr ? 'ORT. YANIT SÜRESİ' : 'AVG. REPLY TIME', context: isTr ? 'Takım atama sonrası' : 'After team assignment' },
    { num: '<3dk', label: isTr ? 'QR KURULUM' : 'QR SETUP', context: isTr ? 'Masaya yerleştir' : 'Place on table' },
  ];

  const steps = [
    {
      icon: <QrCode size={24} />,
      title: isTr ? 'Masaya QR Kodu Koy' : 'Place QR on Tables',
      desc: isTr
        ? 'Markanıza özel tasarlanmış QR kodları masalara, menülere ve kasaya yerleştirin. Uygulama indirme gerekmez.'
        : 'Place custom-branded QR codes on tables, menus, and the counter. No app download needed.',
    },
    {
      icon: <MessageSquare size={24} />,
      title: isTr ? 'Müşteri Anında Değerlendirir' : 'Customer Reviews Instantly',
      desc: isTr
        ? 'Yemek bitiminde müşteri QR\'ı tarar, saniyeler içinde geri bildirim verir. Memnun müşteriler Google\'a yönlendirilir.'
        : 'After dining, customers scan the QR and give feedback in seconds. Happy customers are directed to Google.',
    },
    {
      icon: <BarChart3 size={24} />,
      title: isTr ? 'Panelde Anlık Görüntüle' : 'View in Dashboard',
      desc: isTr
        ? 'Tüm yorumları tek panelde görün, olumsuz geri bildirimleri büyümeden yakalayın, haftalık raporları alın.'
        : 'See all reviews in one dashboard, catch negative feedback before it grows, receive weekly reports.',
    },
  ];

  const benefits = [
    {
      title: isTr ? 'Google Sıralamada Yükselin' : 'Rise in Google Rankings',
      desc: isTr ? 'Yorum hacmi arttıkça Google Haritalar sıralamanız yükselir, yeni müşteri keşfi artar.' : 'As review volume grows, your Google Maps ranking rises and new customer discovery increases.',
      icon: <TrendingUp size={20} className="text-[#C6F24E]" />,
    },
    {
      title: isTr ? 'Kriz Yönetimi' : 'Crisis Management',
      desc: isTr ? 'Olumsuz yorum Google\'a gitmeden önce işletmeciye ulaşır. Hızlı aksiyon, itibar koruması.' : 'Negative reviews reach you before going to Google. Fast action, reputation protection.',
      icon: <ShieldCheck size={20} className="text-[#10b981]" />,
    },
    {
      title: isTr ? 'Müşteri Sadakati' : 'Customer Loyalty',
      desc: isTr ? 'Geri bildirim alan müşteri kendini özel hisseder. Tekrar ziyaret oranı %68\'e kadar çıkar.' : 'Customers who receive feedback feel valued. Return visit rate increases up to 68%.',
      icon: <Star size={20} className="text-[#C6F24E]" />,
    },
    {
      title: isTr ? 'Rakiplerden Öne Geçin' : 'Outperform Competitors',
      desc: isTr ? 'Daha fazla ve daha güncel yorum, Google algoritmalarında sizi öne çıkarır.' : 'More and more recent reviews put you ahead in Google algorithms.',
      icon: <Zap size={20} className="text-[#C6F24E]" />,
    },
  ];

  const faqs = [
    {
      q: isTr ? 'QR kodları nasıl çalışır?' : 'How do QR codes work?',
      a: isTr ? 'Müşteri telefonuyla QR\'ı tarar, özel bir geri bildirim formuna yönlendirilir. Uygulama indirmesi veya kayıt gerekmez. Memnun müşteriler otomatik olarak Google yorum sayfasına yönlendirilir.' : 'Customer scans the QR with their phone and is directed to a custom feedback form. No app download or registration needed. Happy customers are automatically directed to your Google review page.',
    },
    {
      q: isTr ? 'Olumsuz yorumlar nasıl engellenir?' : 'How are negative reviews prevented?',
      a: isTr ? 'Buaze akıllı filtreleme kullanır. 3 yıldız ve altı değerlendirmeler Google\'a yönlendirilmez, doğrudan işletme paneline iletilir. Böylece krizi büyümeden çözebilirsiniz.' : 'Buaze uses smart filtering. Ratings of 3 stars and below are not directed to Google but directly to the business dashboard. This way you can resolve the crisis before it grows.',
    },
    {
      q: isTr ? 'Kurulum ne kadar sürer?' : 'How long does setup take?',
      a: isTr ? 'Ortalama 3-5 dakika. Hesap oluşturun, QR kodunuzu indirin, yazdırın ve masaya koyun. Anında kullanıma hazır.' : 'Average 3-5 minutes. Create an account, download your QR code, print it, and place it on the table. Ready to use instantly.',
    },
  ];

  return (
    <SolutionPageLayout
      locale={locale}
      t={t}
      industryKey="res"
      icon={<Utensils size={14} />}
      industryBadge={isTr ? 'RESTORAN & KAFELER İÇİN' : 'FOR RESTAURANTS & CAFES'}
      h1Prefix={t.sol_res_h1.split(' ').slice(0, -1).join(' ')}
      h1Suffix={t.sol_res_h1.split(' ').slice(-1)[0]}
      description={t.sol_res_p}
      accentColor="#C6F24E"
      stats={stats}
      steps={steps}
      benefits={benefits}
      faqs={faqs}
    />
  );
}
