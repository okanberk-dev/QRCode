import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CalendarRange, FileDown, Gauge, Grid3x3, PieChart, Sparkles } from 'lucide-react';
import FeaturePageLayout, { type FeaturePageCopy, type FeatureSchemaInfo } from '@/components/marketing/FeaturePageLayout';
import { buildFeatureMetadata, isFeatureLocale, type FeatureLocale } from '@/lib/seo/feature-schema';
import { relatedFeatureLinks } from '../_components/feature-catalog';
import { AnalyticsMock } from '../_components/mocks';

// /features/analytics-reports — the owner analytics page. Facts from
// src/app/[locale]/dashboard/analytics/page.tsx: periods 7/30/90 days,
// 12 months or custom; 5 KPIs (total reviews, average rating with target,
// average reply time, NPS estimated from ratings, return rate); day/hour
// distribution and heatmap; channel and rating-based satisfaction split;
// optional AI topics; CSV export. Weekly summary e-mail every Monday.
// No conversion KPI, no "all time", no API (marketing spec §3).

const SLUG = 'analytics-reports';

const META = {
  tr: {
    title: 'Analitik ve raporlar: geri bildirim ve puan takibi',
    description:
      'Son 7, 30 veya 90 gün, 12 ay ya da özel aralık için yorum sayısını, ortalama puanı, yanıt süresini ve tahmini NPS’i izleyin; raporu CSV olarak indirin.',
  },
  en: {
    title: 'Analytics and reports: feedback and rating trends',
    description:
      'Track review count, average rating, reply time and estimated NPS for the last 7, 30 or 90 days, 12 months or a custom range, and export the report as CSV.',
  },
} as const;

const SCHEMA: Record<FeatureLocale, FeatureSchemaInfo> = {
  tr: {
    name: 'Analitik ve raporlar',
    serviceType: 'Müşteri geri bildirimi analitiği',
    howToName: 'Geri bildirim raporu nasıl okunur',
  },
  en: {
    name: 'Analytics and reports',
    serviceType: 'Customer feedback analytics',
    howToName: 'How to read the feedback report',
  },
};

function getCopy(locale: FeatureLocale): FeaturePageCopy {
  const base = `/${locale}`;
  if (locale === 'tr') {
    return {
      eyebrow: 'Analitik ve raporlar',
      title: 'Geri bildirimlerinizi tek raporda izleyin',
      lead: 'Seçtiğiniz dönemin yorum sayısını, ortalama puanını, yanıt süresini ve puanlardan tahmini NPS’ini görün; raporu CSV olarak indirin, her pazartesi haftalık özet alın.',
      secondary: { href: `${base}/features/review-management`, label: 'Yorum yönetimini inceleyin' },
      mockCaption:
        'Örnek ekran: 30 günlük dönemde toplam yorum, ortalama puan ve tahmini NPS kartları ile gün ve saate göre yorum yoğunluğu.',
      definition: {
        eyebrow: 'Tanım',
        title: 'Geri bildirim analitiği nedir?',
        paragraphs: [
          'Geri bildirim analitiği, müşterilerinizin bıraktığı puan ve yorumları zaman içinde okunabilir rakamlara çevirir. Buaze’de rapor, seçtiğiniz işletmenin QR akışından gelen geri bildirimlerle hazırlanır; dönemi son 7, 30 veya 90 gün, son 12 ay ya da kendi belirlediğiniz bir tarih aralığı olarak seçersiniz.',
          'Analitikteki NPS bir anket sonucu değil, puanlardan yapılan bir tahmindir: 5 yıldız destekçi, 4 yıldız pasif, 1–3 yıldız eleştiren sayılır. Müşteriye 0–10 ölçeğinde gerçek bir tavsiye sorusu sormak isterseniz Anketler’i kullanabilirsiniz.',
          'Tekrar gelme oranı yalnızca iletişim bilgisi bırakan ve KVKK onayı veren müşterilerden hesaplanır.',
        ],
        note: 'Öne çıkan konular ve haftalık özetteki değerlendirme için yorum metinleri yapay zekâ sağlayıcımız OpenAI’a gönderilir. Diğer göstergeler yapay zekâ kullanılmadan hesaplanır.',
        noteLink: { href: `${base}/veri-isleyici-sozlesmesi`, label: 'Alt işleyicileri görün' },
      },
      capabilities: {
        eyebrow: 'Neler var',
        title: 'Raporda neler var',
        items: [
          {
            icon: Gauge,
            title: 'Beş temel gösterge',
            body: 'Toplam yorum, ortalama puan, ortalama yanıt süresi, puanlardan tahmini NPS ve tekrar gelme oranı. Toplam yorum bir önceki dönemle karşılaştırılır, ortalama puanın yanında belirlediğiniz hedef puan görünür.',
          },
          {
            icon: CalendarRange,
            title: 'Esnek dönemler',
            body: 'Son 7, 30 veya 90 günü, son 12 ayı ya da özel bir tarih aralığını seçin; tüm rapor seçtiğiniz döneme göre yeniden hesaplanır.',
          },
          {
            icon: Grid3x3,
            title: 'Gün ve saat yoğunluğu',
            body: 'Geri bildirimlerin hangi gün ve saatlerde yoğunlaştığını dağılım grafiklerinde ve gün × saat ısı haritasında görün.',
          },
          {
            icon: PieChart,
            title: 'Kanal ve memnuniyet dağılımı',
            body: 'Yüksek puan veren müşterilerin hangi platformun yorum sayfasına yönlendirildiğini ve memnuniyetin puanlara göre nasıl dağıldığını görün.',
          },
          {
            icon: Sparkles,
            title: 'Öne çıkan konular',
            body: 'Pulse AI, yorum metinlerinden müşterilerin en çok övdüğü ve şikâyet ettiği konuları çıkarır, bunlara göre bir öneri kartı hazırlar.',
          },
          {
            icon: FileDown,
            title: 'CSV ve haftalık özet',
            body: 'Raporu seçtiğiniz dönem ve platforma göre CSV olarak indirin. Her pazartesi yorum sayısını, ortalama puanı ve puan dağılımını içeren haftalık özet e-postası gelir.',
          },
        ],
      },
      steps: {
        eyebrow: 'Nasıl çalışır',
        title: 'Raporu dört adımda okuyun',
        items: [
          {
            title: 'İşletmeyi ve dönemi seçin',
            body: 'Panelde işletmenizi seçin; son 7, 30 ya da 90 günü, son 12 ayı veya özel bir aralığı belirleyin.',
          },
          {
            title: 'Göstergelere bakın',
            body: 'Yorum sayısını, ortalama puanı, yanıt süresini, tahmini NPS’i ve tekrar gelme oranını bir arada görün.',
          },
          {
            title: 'Yoğun saatleri bulun',
            body: 'Gün ve saat dağılımında geri bildirimlerin ne zaman yoğunlaştığını görün.',
          },
          {
            title: 'Paylaşın',
            body: 'Raporu CSV olarak indirip ekibinizle paylaşın; haftalık özet her pazartesi e-postanıza gelir.',
          },
        ],
      },
      facts: {
        eyebrow: 'Kısaca',
        title: 'Analitik bir bakışta',
        items: [
          { value: '5', label: 'Temel gösterge' },
          { value: '12 ay', label: 'En uzun hazır dönem; 7, 30, 90 gün ve özel aralık da var' },
          { value: 'Pazartesi', label: 'Haftalık özet e-postası' },
          { value: 'CSV', label: 'Rapor dışa aktarma biçimi' },
        ],
      },
      sectors: {
        eyebrow: 'Sektörler',
        title: 'Sektörünüzde neye bakmalısınız',
        lead: 'Aynı rapor, her sektörde farklı bir soruya yanıt verir.',
        items: [
          { slug: 'restaurants', use: 'Öğle ve akşam saatlerinde gelen geri bildirimleri ısı haritasında görün.' },
          { slug: 'hotels', use: 'Son 12 ay görünümüyle sezonlar arasındaki farkı izleyin.' },
          { slug: 'healthcare', use: 'Yanıt süresiyle hastalara ne kadar hızlı döndüğünüzü izleyin.' },
          { slug: 'retail', use: 'Hafta içi ve hafta sonu yoğunluğunu gün dağılımında karşılaştırın.' },
        ],
      },
      faq: {
        eyebrow: 'Sık sorulan sorular',
        title: 'Analitik hakkında sorular',
        items: [
          {
            q: 'Hangi dönemleri seçebilirim?',
            a: 'Son 7, 30 veya 90 gün, son 12 ay ya da başlangıç ve bitiş tarihini kendiniz belirlediğiniz özel bir aralık. Toplam yorum sayısı, aynı uzunluktaki bir önceki dönemle karşılaştırılır.',
          },
          {
            q: 'NPS nasıl hesaplanıyor?',
            a: 'Analitikteki NPS yıldız puanlarından tahmin edilir: 5 yıldız destekçi, 4 yıldız pasif, 1–3 yıldız eleştiren sayılır ve destekçi oranından eleştiren oranı çıkarılır. Müşteriye 0–10 tavsiye sorusu sormak isterseniz Anketler’deki tavsiye sorusunu kullanabilirsiniz.',
          },
          {
            q: 'Diğer platformlardaki yorumlar rapora dahil mi?',
            a: 'Hayır. Rapor, QR akışınızdan gelen geri bildirimlere dayanır. Kanal dağılımı, yüksek puan veren müşterilerin hangi platformun yorum sayfasına yönlendirildiğini gösterir; o platformlardaki yorumları saymaz.',
          },
          {
            q: 'Haftalık özet e-postasında neler var?',
            a: 'Her pazartesi gelen özette geçen haftanın yorum sayısı, ortalama puanı ve puan dağılımı yer alır. Yapay zekâ özelliği açıksa kısa bir değerlendirme ve tek bir öneri de eklenir. Özeti ayarlardan kapatabilirsiniz.',
          },
          {
            q: 'Raporu dışa aktarabilir miyim?',
            a: 'Evet. Rapor, seçtiğiniz dönem ve platforma göre CSV olarak indirilir; dosyayı Excel’de veya Google E-Tablolar’da açabilirsiniz.',
          },
          {
            q: 'Birden fazla işletmeyi karşılaştırabilir miyim?',
            a: 'İşletmeler tablosunda her işletmenin son 30 gündeki yorum sayısını, puanını, bekleyen düşük puanlarını ve bağlantı durumunu yan yana görürsünüz. Analitik raporu ise panelde seçtiğiniz işletme için hazırlanır.',
          },
        ],
        more: { href: `${base}/faq`, label: 'Tüm soruları görün' },
      },
      related: {
        eyebrow: 'İlgili özellikler',
        title: 'Analitikle birlikte çalışır',
        items: relatedFeatureLinks(['review-management', 'pulse-ai', 'surveys'], locale),
      },
      ctaTitle: 'Geri bildirimlerinizi ölçmeye başlayın',
    };
  }

  return {
    eyebrow: 'Analytics and reports',
    title: 'Track your feedback in one report',
    lead: 'See review count, average rating, reply time and an NPS estimated from ratings for the period you pick; export the report as CSV and get a weekly summary every Monday.',
    secondary: { href: `${base}/features/review-management`, label: 'Explore review management' },
    mockCaption:
      'Sample screen: total reviews, average rating and estimated NPS cards for a 30-day period, with review activity by day and hour.',
    definition: {
      eyebrow: 'Definition',
      title: 'What is feedback analytics?',
      paragraphs: [
        'Feedback analytics turns the ratings and comments your customers leave into figures you can read over time. In Buaze the report is built from the feedback that comes through the QR flow of the business you select; you pick the last 7, 30 or 90 days, the last 12 months or a date range of your own.',
        'The NPS in analytics is not a survey result but an estimate from ratings: 5 stars count as promoters, 4 stars as passives and 1–3 stars as detractors. To ask customers a real 0–10 recommend question, use Surveys.',
        'The return rate is calculated only from customers who left contact details and gave KVKK consent.',
      ],
      note: 'For recurring topics and the assessment in the weekly summary, comment text is sent to our AI provider, OpenAI. The other metrics are calculated without AI.',
      noteLink: { href: `${base}/veri-isleyici-sozlesmesi`, label: 'See our sub-processors' },
    },
    capabilities: {
      eyebrow: 'What you get',
      title: 'What the report shows',
      items: [
        {
          icon: Gauge,
          title: 'Five core metrics',
          body: 'Total reviews, average rating, average reply time, NPS estimated from ratings and return rate. Total reviews are compared with the previous period, and the average rating is shown next to the target rating you set.',
        },
        {
          icon: CalendarRange,
          title: 'Flexible periods',
          body: 'Pick the last 7, 30 or 90 days, the last 12 months or a custom date range; the whole report is recalculated for that period.',
        },
        {
          icon: Grid3x3,
          title: 'Day and hour patterns',
          body: 'See which days and hours feedback clusters in, with distribution charts and a day × hour heatmap.',
        },
        {
          icon: PieChart,
          title: 'Channel and satisfaction split',
          body: 'See which platform’s review page your high-rating customers were sent to, and how satisfaction splits across ratings.',
        },
        {
          icon: Sparkles,
          title: 'Recurring topics',
          body: 'Pulse AI picks out the topics customers praise and complain about most from the comments and prepares a recommendation card from them.',
        },
        {
          icon: FileDown,
          title: 'CSV and weekly summary',
          body: 'Export the report as CSV for the period and platform you select. Every Monday a weekly summary e-mail arrives with your review count, average rating and rating distribution.',
        },
      ],
    },
    steps: {
      eyebrow: 'How it works',
      title: 'Read the report in four steps',
      items: [
        {
          title: 'Pick the business and period',
          body: 'Select your business in the panel and choose the last 7, 30 or 90 days, the last 12 months or a custom range.',
        },
        {
          title: 'Check the metrics',
          body: 'See review count, average rating, reply time, estimated NPS and return rate together.',
        },
        {
          title: 'Find the busy hours',
          body: 'Use the day and hour distribution to see when feedback clusters.',
        },
        {
          title: 'Share it',
          body: 'Export the report as CSV and share it with your team; the weekly summary arrives in your inbox every Monday.',
        },
      ],
    },
    facts: {
      eyebrow: 'In short',
      title: 'Analytics at a glance',
      items: [
        { value: '5', label: 'Core metrics' },
        { value: '12 months', label: 'Longest preset; 7, 30 and 90 days and a custom range too' },
        { value: 'Monday', label: 'Weekly summary e-mail' },
        { value: 'CSV', label: 'Report export format' },
      ],
    },
    sectors: {
      eyebrow: 'Industries',
      title: 'What to look at in your industry',
      lead: 'The same report answers a different question in each industry.',
      items: [
        { slug: 'restaurants', use: 'See feedback around lunch and dinner on the heatmap.' },
        { slug: 'hotels', use: 'Use the 12-month view to compare seasons.' },
        { slug: 'healthcare', use: 'Track reply time to see how quickly you get back to patients.' },
        { slug: 'retail', use: 'Compare weekday and weekend activity in the day distribution.' },
      ],
    },
    faq: {
      eyebrow: 'Frequently asked questions',
      title: 'Questions about analytics',
      items: [
        {
          q: 'Which periods can I choose?',
          a: 'The last 7, 30 or 90 days, the last 12 months, or a custom range where you set the start and end dates. Total reviews are compared with the previous period of the same length.',
        },
        {
          q: 'How is NPS calculated?',
          a: 'The NPS in analytics is estimated from star ratings: 5 stars count as promoters, 4 stars as passives and 1–3 stars as detractors, and the share of detractors is subtracted from the share of promoters. To ask customers a 0–10 recommend question, use the recommend question in Surveys.',
        },
        {
          q: 'Are reviews from other platforms included in the report?',
          a: 'No. The report is based on the feedback that comes through your QR flow. The channel split shows which platform’s review page your high-rating customers were sent to; it does not count the reviews on those platforms.',
        },
        {
          q: 'What is in the weekly summary e-mail?',
          a: 'The summary that arrives every Monday shows last week’s review count, average rating and rating distribution. If the AI feature is on, it also adds a short assessment and one recommendation. You can switch the summary off in settings.',
        },
        {
          q: 'Can I export the report?',
          a: 'Yes. The report downloads as CSV for the period and platform you select, and you can open the file in Excel or Google Sheets.',
        },
        {
          q: 'Can I compare several businesses?',
          a: 'The businesses table shows each business’s review count, rating, pending low ratings and link status for the last 30 days side by side. The analytics report itself covers the business you select in the panel.',
        },
      ],
      more: { href: `${base}/faq`, label: 'See all questions' },
    },
    related: {
      eyebrow: 'Related features',
      title: 'Works together with analytics',
      items: relatedFeatureLinks(['review-management', 'pulse-ai', 'surveys'], locale),
    },
    ctaTitle: 'Start measuring your feedback',
  };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isFeatureLocale(locale)) return {};
  return buildFeatureMetadata({ locale, slug: SLUG, ...META[locale] });
}

export default async function AnalyticsReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isFeatureLocale(locale)) notFound();
  return (
    <FeaturePageLayout
      locale={locale}
      slug={SLUG}
      copy={getCopy(locale)}
      mock={<AnalyticsMock locale={locale} />}
      schema={SCHEMA[locale]}
    />
  );
}
