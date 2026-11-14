import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Inbox, Mail, MapPin, Reply, ShieldCheck, Users } from 'lucide-react';
import FeaturePageLayout, { type FeaturePageCopy, type FeatureSchemaInfo } from '@/components/marketing/FeaturePageLayout';
import { buildFeatureMetadata, isFeatureLocale, type FeatureLocale } from '@/lib/seo/feature-schema';
import { relatedFeatureLinks } from '../_components/feature-catalog';
import { InboxMock } from '../_components/mocks';

// /features/review-management — the QR feedback inbox, e-mail alerts and
// replies, plus the Google profile overview. Every claim is checked against
// the product (marketing spec §2 D1, §3): no imported third-party reviews,
// no assignment/tags/SLA/archive in the owner inbox, Google replies only
// "when Google access is approved".

const SLUG = 'review-management';

const META = {
  tr: {
    title: 'Yorum yönetimi: QR geri bildirim ve Google profili',
    description:
      'QR kodla gelen geri bildirimleri tek gelen kutusunda okuyun, 1–3 yıldızda anında e-posta alın ve yanıtınızı panelden yazın. 14 gün ücretsiz deneyin.',
  },
  en: {
    title: 'Review management: QR feedback and Google profile',
    description:
      'Read the feedback from your QR codes in one inbox, get an instant e-mail for 1–3★ ratings and write your replies in the panel. Try it free for 14 days.',
  },
} as const;

const SCHEMA: Record<FeatureLocale, FeatureSchemaInfo> = {
  tr: {
    name: 'Yorum yönetimi',
    serviceType: 'QR ile müşteri geri bildirimi yönetimi',
    howToName: 'QR geri bildirimi nasıl toplanır ve yanıtlanır',
  },
  en: {
    name: 'Review management',
    serviceType: 'QR customer feedback management',
    howToName: 'How to collect and answer QR feedback',
  },
};

function getCopy(locale: FeatureLocale): FeaturePageCopy {
  const base = `/${locale}`;
  if (locale === 'tr') {
    return {
      eyebrow: 'Yorum yönetimi',
      title: 'QR geri bildirimlerinizi tek gelen kutusunda yönetin',
      lead: 'Müşterilerinizin QR kodla bıraktığı puan ve yorumlar tek gelen kutusuna düşer; 1–3 yıldızlık geri bildirimde anında e-posta alır, yanıtınızı panelden yazarsınız.',
      secondary: { href: `${base}/how-it-works`, label: 'Nasıl çalıştığını görün' },
      mockCaption:
        'Örnek ekran: gelen kutusunda üç QR geri bildirimi; puanlar, yorumlar ve yanıt durumları görünüyor.',
      definition: {
        eyebrow: 'Tanım',
        title: 'Buaze’de yorum yönetimi nedir?',
        paragraphs: [
          'Yorum yönetimi, müşterilerinizin görüşlerini toplama, okuma ve yanıtlama işidir. Buaze’de bu iş QR kodunuzla başlar: müşteri kodu okutur, puan verir ve isterse yorum yazar; her geri bildirim panelinizdeki gelen kutusuna düşer.',
          'Belirlediğiniz eşik ve üzerindeki puanlarda (varsayılan 5 yıldız) seçtiğiniz platformun yorum sayfası açılır. Eşiğin altındaki puanlarda müşteri önce size özel geri bildirim yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür.',
          'Google işletme profilinizi adıyla arayıp seçtiğinizde, Google Yorumları sayfasında Google puanınızı, yorum sayınızı ve Google’ın paylaştığı en fazla 5 yorumu da görürsünüz.',
        ],
        note: 'Buaze; Yemeksepeti, Tripadvisor veya diğer platformlardaki yorumları panele aktarmaz, bu platformlar için yalnızca yorum sayfasının bağlantısını yönetirsiniz. Google yorumlarına panelden yanıt vermek Google’ın erişim onayına bağlıdır ve şu an genel kullanıma açık değildir.',
      },
      capabilities: {
        eyebrow: 'Neler var',
        title: 'Gelen kutusunda neler yapabilirsiniz',
        lead: 'Geri bildirimleri ayırmak, takip etmek ve yanıtlamak için gereken araçlar tek ekranda.',
        items: [
          {
            icon: Inbox,
            title: 'Tek gelen kutusu',
            body: 'QR akışından gelen her geri bildirim tek listede. Tarihe, puana ve platforma göre filtreleyin; okunmamış, düşük puanlı, yanıtlanmış ve beklemedeki kayıtları sekmelerle ayırın, listeyi CSV olarak indirin.',
          },
          {
            icon: Mail,
            title: 'Anında e-posta uyarısı',
            body: '1–3 yıldızlık her yeni geri bildirimde size anında e-posta gelir; panelde de bildirim görürsünüz. Uyarı e-postasını ayarlardan kapatabilirsiniz.',
          },
          {
            icon: Reply,
            title: 'E-postayla yanıt',
            body: '1–3 yıldızlık geri bildirimlere panelden yanıt yazarsınız; isterseniz Pulse AI taslağını düzenleyerek kullanırsınız. Müşteri e-posta bıraktıysa yanıt ona e-postayla gider, bırakmadıysa panelde kayıt olarak kalır.',
          },
          {
            icon: ShieldCheck,
            title: 'Gönderim öncesi kontrol',
            body: 'Her yanıtta içeriğinden sorumlu olduğunuzu onaylarsınız. Küfür, hakaret, tehdit, kişisel veri, yorum karşılığında ödül sözü ya da işletmenize ait olmayan bağlantı içeren yanıtlar gönderilmez.',
          },
          {
            icon: MapPin,
            title: 'Google profil özeti',
            body: 'Google işletme profilinizi adıyla arayıp seçin; puanınız, yorum sayınız, Google’ın paylaştığı en fazla 5 yorum ve 6 maddelik profil kontrol listesi panelde görünür. Google hesabıyla giriş gerekmez.',
          },
          {
            icon: Users,
            title: 'Müşteri listesi',
            body: 'İletişim bilgisi bırakan müşteriler müşteri listenize eklenir. Ziyaret sayısını ve ortalama puanı görür, müşterileri yeni, düzenli, VIP, risk ve kayıp segmentlerine göre ayırırsınız.',
          },
        ],
      },
      steps: {
        eyebrow: 'Nasıl çalışır',
        title: 'QR kodundan yanıta dört adım',
        items: [
          {
            title: 'QR kodunuzu oluşturun',
            body: 'Panelde işletmeniz için QR kod oluşturun, isterseniz masa veya oda etiketi ekleyin. Kodu PNG olarak indirin ya da PDF olarak yazdırın.',
          },
          {
            title: 'Müşteri puan verir',
            body: 'Eşik ve üzerindeki puanlarda (varsayılan 5 yıldız) seçtiğiniz platformun yorum sayfası açılır. Altındaki puanlarda müşteri önce size yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür.',
          },
          {
            title: 'Geri bildirim size ulaşır',
            body: 'Geri bildirim gelen kutunuza düşer. Puan 1–3 yıldızsa size anında e-posta gelir.',
          },
          {
            title: 'Yanıtlayın',
            body: 'Yanıtı kendiniz yazın ya da Pulse AI taslağını düzenleyin. Müşteri e-posta bıraktıysa yanıtınız ona e-postayla gider.',
          },
        ],
      },
      facts: {
        eyebrow: 'Kısaca',
        title: 'Yorum yönetimi rakamlarla',
        items: [
          { value: '10', label: 'Bağlantısını yönetebileceğiniz yorum platformu' },
          { value: '4★ / 5★', label: 'Yönlendirme eşiği; varsayılan 5 yıldız' },
          { value: '1–3★', label: 'Anında e-posta uyarısı gönderen puanlar' },
          { value: 'TR + EN', label: 'Müşteri formu, panel ve e-postalar' },
        ],
      },
      sectors: {
        eyebrow: 'Sektörler',
        title: 'Sektörünüzde nasıl kullanılır',
        lead: 'QR kodun yeri ve öne çıkan yorum platformları sektöre göre değişir.',
        items: [
          { slug: 'restaurants', use: 'Masada ve adisyonda QR; Google, Tripadvisor ve paket servis platformları.' },
          { slug: 'delivery', use: 'Paketin içinde QR; Google, Yemeksepeti, Getir ve Trendyol GO.' },
          { slug: 'hotels', use: 'Resepsiyonda ve odada QR; Google, Booking.com, Tripadvisor ve Airbnb.' },
          { slug: 'healthcare', use: 'Kayıt masasında ve bekleme alanında QR; Google ve Yandex.' },
          { slug: 'beauty-salon', use: 'Kasada ve ayna önünde QR; Google ve Yandex.' },
          { slug: 'retail', use: 'Kasada, fişte ve poşette QR; Google ve Yandex.' },
        ],
      },
      faq: {
        eyebrow: 'Sık sorulan sorular',
        title: 'Yorum yönetimi hakkında sorular',
        items: [
          {
            q: 'Buaze diğer platformlardaki yorumları gelen kutusuna getirir mi?',
            a: 'Hayır. Gelen kutusunda QR akışınızdan gelen geri bildirimler yer alır. Google, Yemeksepeti veya Tripadvisor gibi platformlar için Buaze yorum sayfasının bağlantısını tutar ve müşteriyi oraya yönlendirir; bu platformlardaki yorumları içe aktarmaz. Google işletme profilinizin puanını ve Google’ın paylaştığı en fazla 5 yorumu ayrıca Google Yorumları sayfasında görürsünüz.',
          },
          {
            q: 'Düşük puan veren müşteri herkese açık yorum yazabilir mi?',
            a: 'Evet. Eşiğinizin altındaki puanlarda müşteri önce size özel geri bildirim yazabilir; seçtiğiniz platformun herkese açık yorum bağlantısı aynı ekranda görünür. Eşik varsayılan olarak 5 yıldızdır, isterseniz 4 yıldıza indirebilirsiniz. Buaze yorum silmez, gizlemez veya değiştirmez.',
          },
          {
            q: 'Hangi yorum platformlarını kullanabilirim?',
            a: 'Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Booking.com, Airbnb, Yandex, Yelp ve Foursquare. Bu 10 platformun yorum sayfası bağlantısını panelde saklarsınız; bağlantılar her gün otomatik olarak kontrol edilir.',
          },
          {
            q: 'Google yorumlarına Buaze üzerinden yanıt verebilir miyim?',
            a: 'Google yorumlarına panelden yanıt vermek, Google İşletme Profili bağlantısı ve Google’ın erişim onayı gerektirir; bu özellik şu an genel kullanıma açık değildir. Google puanınızı, yorum sayınızı ve Google’ın paylaştığı en fazla 5 yorumu ise Google hesabıyla giriş yapmadan görebilirsiniz.',
          },
          {
            q: 'Yanıtım müşteriye nasıl ulaşır?',
            a: 'Müşteri formda e-posta adresini bıraktıysa yanıtınız ona e-postayla gönderilir. E-posta bırakılmadıysa yanıt panelde kayıt olarak saklanır. Göndermeden önce her yanıtta içerikten sorumlu olduğunuzu onaylarsınız; küfür, tehdit veya kişisel veri gibi riskli ifadeler içeren yanıtlar gönderilmez.',
          },
          {
            q: 'Birden fazla işletmem varsa ne olur?',
            a: 'Tek hesapta birden çok işletmeyi yönetebilirsiniz. Panelde işletme seçiciyle aralarında geçersiniz; işletmeler tablosunda her birinin son 30 gündeki yorum sayısını, puanını ve bekleyen düşük puanlarını yan yana görürsünüz.',
          },
        ],
        more: { href: `${base}/faq`, label: 'Tüm soruları görün' },
      },
      related: {
        eyebrow: 'İlgili özellikler',
        title: 'Yorum yönetimiyle birlikte çalışır',
        items: relatedFeatureLinks(['pulse-ai', 'analytics-reports', 'platform-links'], locale),
      },
      ctaTitle: 'QR geri bildirim akışınızı kurun',
    };
  }

  return {
    eyebrow: 'Review management',
    title: 'Manage your QR feedback in one inbox',
    lead: 'Ratings and comments your customers leave through your QR codes land in one inbox; you get an instant e-mail for 1–3★ feedback and write your reply in the panel.',
    secondary: { href: `${base}/how-it-works`, label: 'See how it works' },
    mockCaption: 'Sample screen: three QR feedback entries in the inbox, with their ratings, comments and reply status.',
    definition: {
      eyebrow: 'Definition',
      title: 'What is review management in Buaze?',
      paragraphs: [
        'Review management means collecting, reading and answering what your customers tell you. In Buaze it starts with your QR code: the customer scans it, gives a rating and can leave a comment, and every piece of feedback lands in the inbox in your panel.',
        'At or above the threshold you set (5 stars by default), your chosen platform’s review page opens. Below it, the customer can first send you private feedback; the public review link is shown on the same screen.',
        'Once you search for your Google Business Profile by name and pick it, the Google Reviews page also shows your Google rating, your review count and up to 5 reviews that Google shares.',
      ],
      note: 'Buaze does not import reviews from Yemeksepeti, Tripadvisor or any other platform; for those platforms you only manage the link to the review page. Replying to Google reviews from the panel depends on Google’s access approval and is not generally available yet.',
    },
    capabilities: {
      eyebrow: 'What you get',
      title: 'What you can do in the inbox',
      lead: 'The tools to sort, follow up and answer feedback, on one screen.',
      items: [
        {
          icon: Inbox,
          title: 'One inbox',
          body: 'Every piece of feedback from your QR flow in one list. Filter by date, rating and platform, use tabs to separate unread, low-rated, replied and pending items, and export the list as CSV.',
        },
        {
          icon: Mail,
          title: 'Instant e-mail alerts',
          body: 'Every new 1–3★ piece of feedback sends you an instant e-mail and shows up as a notification in the panel. You can switch the alert e-mail off in settings.',
        },
        {
          icon: Reply,
          title: 'Reply by e-mail',
          body: 'You answer 1–3★ feedback from the panel, writing the reply yourself or editing a Pulse AI draft. If the customer left an e-mail address, the reply goes to them by e-mail; if not, it stays in the panel as a record.',
        },
        {
          icon: ShieldCheck,
          title: 'A check before sending',
          body: 'For every reply you confirm that you are responsible for its content. Replies containing profanity, insults, threats, personal data, a reward in exchange for a review or links that are not your business’s own are not sent.',
        },
        {
          icon: MapPin,
          title: 'Google profile overview',
          body: 'Search for your Google Business Profile by name and pick it; your rating, review count, up to 5 reviews Google shares and a 6-item profile checklist appear in the panel. No Google sign-in needed.',
        },
        {
          icon: Users,
          title: 'Customer list',
          body: 'Customers who leave contact details are added to your customer list. You see their visit count and average rating and group them into new, loyal, VIP, at-risk and churned segments.',
        },
      ],
    },
    steps: {
      eyebrow: 'How it works',
      title: 'Four steps from QR code to reply',
      items: [
        {
          title: 'Create your QR code',
          body: 'Create a QR code for your business in the panel and add a table or room label if you like. Download it as PNG or print it as PDF.',
        },
        {
          title: 'The customer gives a rating',
          body: 'At or above your threshold (5 stars by default), your chosen platform’s review page opens. Below it, the customer can write to you first; the public review link is shown on the same screen.',
        },
        {
          title: 'The feedback reaches you',
          body: 'The feedback lands in your inbox. If the rating is 1–3★, you get an instant e-mail.',
        },
        {
          title: 'Reply',
          body: 'Write the reply yourself or edit the Pulse AI draft. If the customer left an e-mail address, your reply goes to them by e-mail.',
        },
      ],
    },
    facts: {
      eyebrow: 'At a glance',
      title: 'Review management in numbers',
      items: [
        { value: '10', label: 'Review platforms you can link to' },
        { value: '4★ / 5★', label: 'Redirect threshold; 5 stars by default' },
        { value: '1–3★', label: 'Ratings that trigger an instant e-mail' },
        { value: 'TR + EN', label: 'Customer form, panel and e-mails' },
      ],
    },
    sectors: {
      eyebrow: 'Industries',
      title: 'How it fits your industry',
      lead: 'Where the QR code goes, and which review platforms matter, depends on your industry.',
      items: [
        { slug: 'restaurants', use: 'QR on tables and bills; Google, Tripadvisor and delivery platforms.' },
        { slug: 'delivery', use: 'QR in the order bag; Google, Yemeksepeti, Getir and Trendyol GO.' },
        { slug: 'hotels', use: 'QR at reception and in rooms; Google, Booking.com, Tripadvisor and Airbnb.' },
        { slug: 'healthcare', use: 'QR at the front desk and in the waiting area; Google and Yandex.' },
        { slug: 'beauty-salon', use: 'QR at the till and by the mirror; Google and Yandex.' },
        { slug: 'retail', use: 'QR at the till, on receipts and on bags; Google and Yandex.' },
      ],
    },
    faq: {
      eyebrow: 'Frequently asked questions',
      title: 'Questions about review management',
      items: [
        {
          q: 'Does Buaze bring reviews from other platforms into the inbox?',
          a: 'No. The inbox holds the feedback that comes through your QR flow. For platforms such as Google, Yemeksepeti or Tripadvisor, Buaze keeps the link to the review page and sends the customer there; it does not import the reviews posted on them. Your Google Business Profile rating and up to 5 reviews Google shares are shown separately on the Google Reviews page.',
        },
        {
          q: 'Can a customer who gives a low rating still post a public review?',
          a: 'Yes. Below your threshold, the customer can first send you private feedback, and your chosen platform’s public review link is shown on the same screen. The threshold is 5 stars by default; you can lower it to 4 stars. Buaze does not delete, hide or change reviews.',
        },
        {
          q: 'Which review platforms can I use?',
          a: 'Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Booking.com, Airbnb, Yandex, Yelp and Foursquare. You store the review-page link for each of these 10 platforms in the panel, and the links are checked automatically every day.',
        },
        {
          q: 'Can I reply to Google reviews through Buaze?',
          a: 'Replying to Google reviews from the panel requires a Google Business Profile connection and Google’s access approval; this feature is not generally available yet. You can, however, see your Google rating, review count and up to 5 reviews Google shares without signing in to Google.',
        },
        {
          q: 'How does my reply reach the customer?',
          a: 'If the customer left an e-mail address on the form, your reply is sent to them by e-mail. If not, the reply is kept in the panel as a record. Before sending, you confirm for each reply that you are responsible for its content, and replies with risky content such as profanity, threats or personal data are not sent.',
        },
        {
          q: 'What if I have more than one business?',
          a: 'You can manage several businesses from one account. Switch between them with the business switcher in the panel; the businesses table shows each one’s review count, rating and pending low ratings for the last 30 days side by side.',
        },
      ],
      more: { href: `${base}/faq`, label: 'See all questions' },
    },
    related: {
      eyebrow: 'Related features',
      title: 'Works together with review management',
      items: relatedFeatureLinks(['pulse-ai', 'analytics-reports', 'platform-links'], locale),
    },
    ctaTitle: 'Set up your QR feedback flow',
  };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isFeatureLocale(locale)) return {};
  return buildFeatureMetadata({ locale, slug: SLUG, ...META[locale] });
}

export default async function ReviewManagementPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isFeatureLocale(locale)) notFound();
  return (
    <FeaturePageLayout
      locale={locale}
      slug={SLUG}
      copy={getCopy(locale)}
      mock={<InboxMock locale={locale} />}
      schema={SCHEMA[locale]}
    />
  );
}
