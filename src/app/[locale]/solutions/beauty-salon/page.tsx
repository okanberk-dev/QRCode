import { Scissors, Star, TrendingUp, QrCode, Users, Heart, Sparkles, BarChart3 } from 'lucide-react';
import SolutionPageLayout from '@/components/marketing/SolutionPageLayout';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = getTranslations(locale);
  const title = locale === 'tr'
    ? 'Güzellik Salonu & Kuaför İtibar Yönetimi — Buaze'
    : 'Beauty Salon & Hair Salon Reputation Management — Buaze';
  const description = locale === 'tr'
    ? 'Güzellik salonunuzu öne çıkarın. Müşterilerinizin yorumlarını Google\'da artırın ve sadık müşteri kitlesi oluşturun.'
    : 'Make your beauty salon stand out. Increase your customers\' Google reviews and build a loyal customer base.';
  return {
    title,
    description,
    keywords: locale === 'tr'
      ? ['güzellik salonu itibar', 'kuaför google yorumları', 'salon müşteri memnuniyeti', 'berber feedback']
      : ['beauty salon reputation', 'hair salon google reviews', 'salon customer satisfaction'],
    alternates: {
      canonical: `https://buaze.com/${locale}/solutions/beauty-salon`,
      languages: { tr: 'https://buaze.com/tr/solutions/beauty-salon', en: 'https://buaze.com/en/solutions/beauty-salon' },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/solutions/beauty-salon` },
  };
}

export default async function BeautySalonSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const stats = [
    { num: '%85', label: isTr ? 'MÜŞTERİ DÖNÜŞÜ' : 'CUSTOMER RETURN', context: isTr ? 'Takip sonrası' : 'After follow-up' },
    { num: '+%200', label: isTr ? 'GOOGLE YORUMU' : 'GOOGLE REVIEWS', context: isTr ? '3 ayda' : 'In 3 months' },
    { num: '%73', label: isTr ? 'TAVSİYE ORANI' : 'REFERRAL RATE', context: isTr ? 'Aktif müşteri' : 'Active customers' },
    { num: '<4dk', label: isTr ? 'KURULUM' : 'SETUP', context: isTr ? 'Hazır şablonlar' : 'Ready templates' },
  ];

  const steps = [
    {
      icon: <QrCode size={24} />,
      title: isTr ? 'Aynaya veya Kasaya Yapıştır' : 'Place on Mirror or Counter',
      desc: isTr
        ? 'Şık tasarımlı QR kodu aynaya, kasaya veya kartvizite yerleştirin. Müşteri hizmet alırken kolayca fark eder.'
        : 'Place the stylishly designed QR code on the mirror, counter, or business card. Customers easily notice it while receiving service.',
    },
    {
      icon: <Sparkles size={24} />,
      title: isTr ? 'Servis Sonrası Yönlendir' : 'Direct After Service',
      desc: isTr
        ? 'Servis tamamlanınca müşterinize QR\'ı gösterin. Birkaç saniyede deneyimini paylaşır, memnunlarsa Google\'a gönderilir.'
        : 'After service is complete, show the QR to your customer. They share their experience in seconds and happy ones are sent to Google.',
    },
    {
      icon: <Heart size={24} />,
      title: isTr ? 'Sadık Müşteri Kitlesi Oluştur' : 'Build Loyal Customer Base',
      desc: isTr
        ? 'Geri bildirim veren müşteri salonunuza bağlılık hisseder. Tekrar randevu oranı %85\'e kadar çıkar.'
        : 'Customers who give feedback feel connected to your salon. Repeat appointment rate increases up to 85%.',
    },
  ];

  const benefits = [
    {
      title: isTr ? 'Stilist Bazlı Performans' : 'Stylist-Based Performance',
      desc: isTr ? 'Her stilist için ayrı metrikler. Hangi çalışanın en iyi değerlendirme aldığını görün, ödüllendirin.' : 'Separate metrics for each stylist. See which employee gets the best reviews and reward them.',
      icon: <Star size={20} className="text-[#F4B400]" />,
    },
    {
      title: isTr ? 'Müşteri Sadakati' : 'Customer Loyalty',
      desc: isTr ? 'Geri bildirim alan müşteri salonunuza daha bağlı hisseder. Yıllık müşteri kaybı %40 azalır.' : 'Customers who receive feedback feel more connected to your salon. Annual customer loss decreases by 40%.',
      icon: <Heart size={20} className="text-[#ec4899]" />,
    },
    {
      title: isTr ? 'Google\'da Öne Çık' : 'Stand Out on Google',
      desc: isTr ? '"Yakınımdaki kuaför" aramasında üst sıralara çıkın. Daha fazla yorum daha fazla müşteri demek.' : 'Rise to the top for "hair salon near me" searches. More reviews means more customers.',
      icon: <TrendingUp size={20} className="text-[#ec4899]" />,
    },
    {
      title: isTr ? 'Rakiplerden Farklılaşma' : 'Differentiation from Competitors',
      desc: isTr ? 'Profesyonel geri bildirim sistemi sizi sektörde öne çıkarır. Yeni müşteriler güvenle tercih eder.' : 'A professional feedback system distinguishes you in the industry. New customers choose with confidence.',
      icon: <Sparkles size={20} className="text-[#ec4899]" />,
    },
  ];

  const faqs = [
    {
      q: isTr ? 'Her stilist için ayrı QR kodu yapabilir miyim?' : 'Can I create separate QR codes for each stylist?',
      a: isTr ? 'Evet. Her stilist için ayrı QR kodu oluşturabilirsiniz. Bu sayede hangi stilistin nasıl değerlendirildiğini ayrı ayrı takip edebilir, en başarılı çalışanlarınızı tespit edebilirsiniz.' : 'Yes. You can create separate QR codes for each stylist. This allows you to track how each stylist is evaluated separately and identify your most successful employees.',
    },
    {
      q: isTr ? 'Randevu sistemiyle entegre olabilir mi?' : 'Can it integrate with an appointment system?',
      a: isTr ? 'Buaze herhangi bir entegrasyon gerektirmez. QR kodu aracılığıyla çalıştığı için mevcut randevu sisteminizin yanında bağımsız olarak kullanılabilir.' : 'Buaze requires no integration. Since it works through QR codes, it can be used independently alongside your existing appointment system.',
    },
  ];

  return (
    <SolutionPageLayout
      locale={locale}
      t={t}
      industryKey="bsa"
      icon={<Scissors size={14} />}
      industryBadge={isTr ? 'GÜZELLİK SALONU İÇİN' : 'FOR BEAUTY SALONS'}
      h1Prefix={isTr ? 'Salonu Farkı Yaratan' : 'The Salon That Makes'}
      h1Suffix={isTr ? 'İtibar' : 'A Difference'}
      description={isTr
        ? 'Müşteri memnuniyetini online görünürlüğe dönüştürün. Güzellik salonunuzun dijital itibarını Buaze ile profesyonelleştirin.'
        : "Turn customer satisfaction into online visibility. Professionalize your beauty salon's digital reputation with Buaze."}
      accentColor="#ec4899"
      stats={stats}
      steps={steps}
      benefits={benefits}
      faqs={faqs}
    />
  );
}
