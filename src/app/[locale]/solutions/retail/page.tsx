import { ShoppingBag, Star, ShieldCheck, TrendingUp, QrCode, Tag, Package, BarChart3 } from 'lucide-react';
import SolutionPageLayout from '@/components/marketing/SolutionPageLayout';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === 'tr'
      ? 'Perakende & Mağaza İtibar Yönetimi — Buaze'
      : 'Retail & Store Reputation Management — Buaze';
  const description =
    locale === 'tr'
      ? 'Kasa yanında, poşet içinde, e-fatura PDF\'inde tek QR. Çok mağazalı perakende için birleşik dijital itibar.'
      : 'One QR at the register, in the bag, on the e-receipt. Unified digital reputation for multi-store retail.';
  return {
    title,
    description,
    keywords:
      locale === 'tr'
        ? ['perakende itibar yönetimi', 'mağaza google yorumları', 'çok mağazalı itibar', 'kasa QR']
        : ['retail reputation management', 'store google reviews', 'multi-store reputation', 'register QR'],
    alternates: {
      canonical: `https://buaze.com/${locale}/solutions/retail`,
      languages: {
        tr: 'https://buaze.com/tr/solutions/retail',
        en: 'https://buaze.com/en/solutions/retail',
      },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/solutions/retail` },
  };
}

export default async function RetailSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const stats = [
    { num: '260+', label: isTr ? 'MAĞAZA' : 'STORES', context: isTr ? 'Tekil noktalar' : 'Individual stores' },
    { num: '+142%', label: isTr ? 'YORUM/AY' : 'REVIEWS/MO', context: isTr ? 'İlk 90 gün' : 'First 90 days' },
    { num: '%88', label: isTr ? 'MÜŞTERİ SADAKATİ' : 'CUSTOMER LOYALTY', context: isTr ? 'Tekrar ziyaret' : 'Return rate' },
    { num: 'TEK PANEL', label: isTr ? 'ÇOK MAĞAZA' : 'MULTI-STORE', context: isTr ? 'Konum bazlı' : 'Per location' },
  ];

  const steps = [
    {
      icon: <QrCode size={24} />,
      title: isTr ? 'Kasada & Poşette QR' : 'QR at Register & Bag',
      desc: isTr
        ? 'Her kasaya tek QR, poşet içine küçük kart, e-fatura PDF\'ine otomatik link — müşteri hangi temas noktasından bıraktı, netçe raporlanır.'
        : 'One QR per register, a small card inside the bag, an auto-link on e-receipts — every touchpoint reports separately.',
    },
    {
      icon: <Tag size={24} />,
      title: isTr ? 'Kategori & Ürün Bazlı Analiz' : 'Per-Category & Product Insight',
      desc: isTr
        ? 'Hangi reyonda, hangi üründen memnuniyet yüksek? Buaze analitiği kategori kırılımıyla gösterir, operasyon kararını objektif veriye dayandırır.'
        : 'Which aisle, which product drives satisfaction? Buaze analytics breaks it down per category, turning ops decisions into data-driven ones.',
    },
    {
      icon: <Package size={24} />,
      title: isTr ? 'Çok Mağaza, Tek Yönetim' : 'Multi-Store, One Cockpit',
      desc: isTr
        ? '3 mağaza, 30 mağaza — fark etmez. Her şube ayrı rapor alır, merkez tek panelde her şubeyi karşılaştırır.'
        : '3 stores or 30 — every branch reports separately while HQ sees the whole fleet in one dashboard.',
    },
  ];

  const benefits = [
    {
      title: isTr ? 'Kasa Hızı' : 'Register Speed',
      desc: isTr
        ? 'Müşteri QR\'ı okur, ödeme yaparken saniyede yorum bırakır. Kasa kuyruğunu yavaşlatmaz.'
        : 'Customers scan while paying and leave a review in seconds — no queue slowdown.',
      icon: <Star size={20} className="text-[#C6F24E]" />,
    },
    {
      title: isTr ? 'Kategori Sinyali' : 'Category Signal',
      desc: isTr
        ? 'Belirli bir reyon/ürün için yorum oranı düştüğünde Buaze uyarı gönderir — mağaza müdürü anında aksiyon alır.'
        : 'A drop in reviews for a specific aisle/product triggers an alert — store managers act instantly.',
      icon: <TrendingUp size={20} className="text-[#C6F24E]" />,
    },
    {
      title: isTr ? 'Omnichannel Hazırlığı' : 'Omnichannel-Ready',
      desc: isTr
        ? 'Aynı QR online siparişte de çalışır. Fiziksel + online sadık müşteri profili tek yerde birleşir.'
        : 'The same QR works on online orders too. Physical + online loyal-customer profiles merge in one place.',
      icon: <BarChart3 size={20} className="text-[#C6F24E]" />,
    },
    {
      title: isTr ? 'Franchise Uyum' : 'Franchise Compliance',
      desc: isTr
        ? 'Merkez brand guide\'ını uygular, her şube kendi mağaza adı + Google Place ID ile ayrı rapor verir.'
        : 'HQ enforces the brand guide; each branch still reports with its own store name + Google Place ID.',
      icon: <ShieldCheck size={20} className="text-[#C6F24E]" />,
    },
  ];

  const faqs = [
    {
      q: isTr ? 'Franchise modeline uygun mu?' : 'Does it fit a franchise model?',
      a: isTr
        ? 'Evet. Her franchise kendi mağaza adı + Google Place ID ile ayrı kimlikte çalışır; merkez tüm şubeleri tek panelden izleyip brand guide\'ı korur.'
        : 'Yes. Each franchise operates with its own store name + Google Place ID; HQ monitors all branches from one panel and enforces the brand guide.',
    },
    {
      q: isTr ? 'Online siparişte de aynı QR mı?' : 'Same QR on online orders?',
      a: isTr
        ? 'E-fatura PDF\'ine otomatik yerleştirilen link hem tek bir QR\'ın omnichannel eşleniği hem de doğrudan geri bildirim kanalıdır.'
        : 'The e-receipt PDF auto-embeds the same link — an omnichannel equivalent to one QR + a direct feedback channel.',
    },
  ];

  return (
    <SolutionPageLayout
      locale={locale}
      t={t}
      industryKey="ret"
      icon={<ShoppingBag size={14} />}
      industryBadge={isTr ? 'PERAKENDE & MAĞAZALAR İÇİN' : 'FOR RETAIL & STORES'}
      h1Prefix={isTr ? 'Kasadan' : 'From the register'}
      h1Suffix={isTr ? "Google'a." : 'to Google.'}
      description={
        isTr
          ? 'Kasa yanında, poşet içinde, e-fatura PDF\'inde tek QR. Çok mağaza — tek panel. Perakendenin tüm temas noktalarını birleşik itibar sinyaline çevir.'
          : "One QR at the register, in the bag, on the e-receipt. Multi-store, single panel. Turn every retail touchpoint into a unified reputation signal."
      }
      stats={stats}
      steps={steps}
      benefits={benefits}
      faqs={faqs}
    />
  );
}
