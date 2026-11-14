import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BarChart3, Gift, LayoutTemplate, ListChecks, QrCode, Smartphone } from 'lucide-react';
import FeaturePageLayout, { type FeaturePageCopy, type FeatureSchemaInfo } from '@/components/marketing/FeaturePageLayout';
import { buildFeatureMetadata, isFeatureLocale, type FeatureLocale } from '@/lib/seo/feature-schema';
import { relatedFeatureLinks } from '../_components/feature-catalog';
import { SurveyMock } from '../_components/mocks';

// /features/surveys — QR surveys. Facts from src/lib/surveys.ts (5 question
// types, up to 30 questions, 2–6 options for multiple choice; the layout is
// derived, never chosen: one question per screen, step by step —
// deriveSurveyType), src/lib/survey-templates.ts (8 TR/EN templates),
// /api/surveys/[id]/{qr,export,analytics} (PNG/SVG, CSV, per-question
// results with NPS) and PublicSurveyView (KVKK consent required, marketing
// consent unticked, contact fields optional, form chrome Turkish today).
// No CSAT type, no SMS/WhatsApp/e-mail sending, no automatic triggers.

const SLUG = 'surveys';

const META = {
  tr: {
    title: 'Anketler: QR ile müşteri memnuniyeti ve NPS anketi',
    description:
      'Yıldız, 0–10 tavsiye, metin ve çoktan seçmeli sorularla kısa anketler hazırlayın; 8 hazır şablondan başlayın, anketi QR kod ya da bağlantıyla paylaşın.',
  },
  en: {
    title: 'Surveys: QR customer satisfaction and NPS surveys',
    description:
      'Create short surveys with star, 0–10 recommend, text and multiple-choice questions; start from one of 8 templates and share them by QR code or link.',
  },
} as const;

const SCHEMA: Record<FeatureLocale, FeatureSchemaInfo> = {
  tr: {
    name: 'Anketler',
    serviceType: 'QR kodlu müşteri anketi',
    howToName: 'QR anketi nasıl hazırlanır',
  },
  en: {
    name: 'Surveys',
    serviceType: 'QR code customer surveys',
    howToName: 'How to create a QR survey',
  },
};

function getCopy(locale: FeatureLocale): FeaturePageCopy {
  const base = `/${locale}`;
  if (locale === 'tr') {
    return {
      eyebrow: 'Anketler',
      title: 'QR kodlu müşteri memnuniyeti anketleri',
      lead: 'Birkaç soruluk anketinizi hazırlayın, QR kod ya da bağlantıyla paylaşın; yanıtları panelde okuyun ve CSV olarak indirin.',
      secondary: { href: `${base}/features/review-management`, label: 'Yorum yönetimini inceleyin' },
      mockCaption:
        'Örnek ekran: dört soruluk bir anket; yıldız, 0–10 tavsiye, çoktan seçmeli ve uzun metin soruları ile QR kod ve bağlantı paylaşımı.',
      definition: {
        eyebrow: 'Tanım',
        title: 'QR anketi nedir?',
        paragraphs: [
          'QR anketi, müşterinin telefonuyla bir karekodu okutarak açtığı kısa bir soru formudur. Uygulama indirmek ya da hesap açmak gerekmez; anket tarayıcıda açılır.',
          'Anket yorum akışından farklıdır: yanıtlar herkese açık bir platformda yayımlanmaz, yalnızca size ulaşır. Bu yüzden ziyaretin ayrıntılarını, örneğin servisin hızını ya da işletmenizi tavsiye edip etmeyeceğini sormak için uygundur.',
          'Tavsiye sorusu 0–10 ölçeğindedir ve yanıtlardan NPS hesaplanır. Müşteri soruları telefonunda tek tek, adım adım yanıtlar.',
        ],
      },
      capabilities: {
        eyebrow: 'Neler var',
        title: 'Anketlerde neler var',
        items: [
          {
            icon: ListChecks,
            title: 'Beş soru tipi',
            body: 'Yıldız (1–5), 0–10 tavsiye, kısa metin, uzun metin ve çoktan seçmeli (tek yanıt). Bir ankete en fazla 30 soru ekleyebilir, her soruyu zorunlu ya da isteğe bağlı yapabilirsiniz.',
          },
          {
            icon: LayoutTemplate,
            title: '8 hazır şablon',
            body: 'Genel memnuniyet, tek soruluk tavsiye ve hızlı puan şablonlarının yanında masa servisi, konaklama, randevu, hizmet ve mağaza deneyimi şablonları. Her şablonu düzenleyebilirsiniz.',
          },
          {
            icon: QrCode,
            title: 'QR kod ve bağlantı',
            body: 'Her anketin kendi bağlantısı ve QR kodu olur. QR kodu PNG veya SVG olarak indirin, bağlantıyı web sitenizde ya da mesajlarınızda paylaşın.',
          },
          {
            icon: Gift,
            title: 'İsteğe bağlı teşekkür kuponu',
            body: 'Anketi tamamlayan müşteriye teşekkür ekranında bir kupon kodu gösterebilirsiniz. Kupon yalnızca anketi tamamlayana gösterilir; herkese açık bir yorum karşılığında verilmez.',
          },
          {
            icon: Smartphone,
            title: 'Telefona uygun, adım adım',
            body: 'Her soru telefonda kendi ekranında açılır ve ilerleme çubuğu kaç soru kaldığını gösterir. Yıldız, tavsiye ve çoktan seçmeli sorularda müşteri seçimini yapınca sonraki soruya geçilir.',
          },
          {
            icon: BarChart3,
            title: 'Sonuçlar ve CSV',
            body: 'Yanıtları soru soru panelde inceleyin: yıldız ortalamasını, tavsiye sorusundan NPS’i ve seçeneklerin dağılımını görün, tüm yanıtları CSV olarak indirin.',
          },
        ],
      },
      steps: {
        eyebrow: 'Nasıl çalışır',
        title: 'Anketinizi dört adımda yayınlayın',
        items: [
          {
            title: 'Şablon seçin ya da boş başlayın',
            body: '8 hazır şablondan birini seçin veya boş bir ankete kendi sorularınızı ekleyin.',
          },
          {
            title: 'Soruları düzenleyin',
            body: 'Soru tiplerini seçin, zorunlu soruları işaretleyin; isterseniz iletişim bilgisi alanını ve teşekkür kuponunu açın.',
          },
          {
            title: 'Yayınlayın ve paylaşın',
            body: 'Anketi yayınlayın; QR kodu PNG veya SVG olarak indirin ya da bağlantıyı paylaşın.',
          },
          {
            title: 'Sonuçları okuyun',
            body: 'Yanıtlar geldikçe panelde soru bazında sonuçları ve NPS’i görün, istediğinizde CSV olarak indirin.',
          },
        ],
      },
      facts: {
        eyebrow: 'Kısaca',
        title: 'Anketler bir bakışta',
        items: [
          { value: '5', label: 'Soru tipi' },
          { value: '30', label: 'Anket başına en fazla soru' },
          { value: '8', label: 'Hazır şablon' },
          { value: '0–10', label: 'Tavsiye sorusunun ölçeği' },
        ],
      },
      sectors: {
        eyebrow: 'Sektörler',
        title: 'Sektörünüze uygun şablonlar',
        lead: 'Hazır şablonların bir kısmı belirli işletme türleri için yazılmıştır.',
        items: [
          { slug: 'restaurants', use: 'Masa servisi sonrası şablonu: yemek, servis ve bekleme süresi.' },
          { slug: 'hotels', use: 'Konaklama sonrası şablonu: oda temizliği, personelin ilgisi ve tavsiye.' },
          { slug: 'healthcare', use: 'Randevu sonrası şablonu; sağlık bilgisi sormaz.' },
          { slug: 'beauty-salon', use: 'Hizmet sonrası şablonu: hizmet kalitesi ve yeniden tercih.' },
          { slug: 'retail', use: 'Mağaza deneyimi şablonu: ürün bulma kolaylığı ve personelin ilgisi.' },
        ],
      },
      faq: {
        eyebrow: 'Sık sorulan sorular',
        title: 'Anketler hakkında sorular',
        items: [
          {
            q: 'Anketlerin Google yorumlarından farkı ne?',
            a: 'Google yorumu herkese açıktır. Anket yanıtları ise herkese açık bir platformda yayımlanmaz, yalnızca size ulaşır. Bu sayede müşteriye işinize özel, ayrıntılı sorular sorabilirsiniz.',
          },
          {
            q: 'Hangi soru tiplerini kullanabilirim?',
            a: 'Yıldız (1–5), 0–10 tavsiye, kısa metin, uzun metin ve çoktan seçmeli. Çoktan seçmeli sorularda müşteri 2 ile 6 arasında seçenekten birini işaretler.',
          },
          {
            q: 'Anketi QR kod olmadan paylaşabilir miyim?',
            a: 'Evet. Her anketin bir paylaşım bağlantısı vardır; bağlantıyı web sitenize, e-postalarınıza veya mesajlarınıza ekleyebilirsiniz. Buaze anketi sizin yerinize SMS, WhatsApp ya da e-postayla göndermez.',
          },
          {
            q: 'Teşekkür kuponu nasıl çalışır?',
            a: 'Anket ayarlarına bir kupon kodu ve kısa bir açıklama girerseniz, anketi tamamlayan müşteri teşekkür ekranında bu kodu görür. Kod sabittir ve Buaze tarafından doğrulanmaz; kampanyanın koşullarını siz belirlersiniz. Kupon herkese açık bir yorum karşılığında verilmez.',
          },
          {
            q: 'Müşteri verilerini nasıl koruyorsunuz?',
            a: 'Müşteri anketi göndermeden önce KVKK aydınlatma metnini onaylar; pazarlama izni ayrı bir kutudur ve varsayılan olarak işaretsizdir. İletişim bilgisi sormak isteğe bağlıdır; kapatırsanız form e-posta ya da telefon istemez. IP adresleri 90 gün sonra anonimleştirilir.',
          },
          {
            q: 'Anket hangi dilde açılır?',
            a: 'Sorular yazdığınız dilde görünür; hazır şablonların Türkçe ve İngilizce sürümleri vardır. Anket formundaki düğmeler ve onay metinleri ise şu an Türkçedir.',
          },
        ],
        more: { href: `${base}/faq`, label: 'Tüm soruları görün' },
      },
      related: {
        eyebrow: 'İlgili özellikler',
        title: 'Anketlerle birlikte çalışır',
        items: relatedFeatureLinks(['review-management', 'analytics-reports', 'audit-center'], locale),
      },
      ctaTitle: 'İlk anketinizi hazırlayın',
    };
  }

  return {
    eyebrow: 'Surveys',
    title: 'QR code customer satisfaction surveys',
    lead: 'Build a survey of a few questions, share it by QR code or link, then read the answers in the panel or export them as CSV.',
    secondary: { href: `${base}/features/review-management`, label: 'Explore review management' },
    mockCaption:
      'Sample screen: a four-question survey with star, 0–10 recommend, multiple-choice and long-text questions, plus QR code and link sharing.',
    definition: {
      eyebrow: 'Definition',
      title: 'What is a QR survey?',
      paragraphs: [
        'A QR survey is a short form of questions that the customer opens by scanning a code with their phone. No app or account is needed; the survey opens in the browser.',
        'A survey is different from the review flow: answers are not published on any public platform and reach only you. That makes it the right place to ask about the details of a visit, such as how fast the service was or whether they would recommend you.',
        'The recommend question uses a 0–10 scale, and NPS is calculated from the answers. The customer answers the questions one at a time, step by step, on their phone.',
      ],
    },
    capabilities: {
      eyebrow: 'What you get',
      title: 'What surveys include',
      items: [
        {
          icon: ListChecks,
          title: 'Five question types',
          body: 'Star (1–5), 0–10 recommend, short text, long text and multiple choice (one answer). Add up to 30 questions per survey and make each one required or optional.',
        },
        {
          icon: LayoutTemplate,
          title: '8 ready templates',
          body: 'General satisfaction, a one-question recommend score and a quick star rating, plus templates for table service, hotel stays, appointments, services and the in-store experience. Every template can be edited.',
        },
        {
          icon: QrCode,
          title: 'QR code and link',
          body: 'Every survey has its own link and QR code. Download the QR code as PNG or SVG and share the link on your website or in your messages.',
        },
        {
          icon: Gift,
          title: 'Optional thank-you coupon',
          body: 'You can show a coupon code on the thank-you screen to customers who complete the survey. It is only shown to people who complete the survey, never given in exchange for a public review.',
        },
        {
          icon: Smartphone,
          title: 'Made for phones, step by step',
          body: 'Each question opens on its own screen on the phone, and a progress bar shows how many are left. For star, recommend and multiple-choice questions, the survey moves on once the customer picks an answer.',
        },
        {
          icon: BarChart3,
          title: 'Results and CSV',
          body: 'Review the answers question by question in the panel: the star average, NPS from the recommend question and how the options split. Export every answer as CSV.',
        },
      ],
    },
    steps: {
      eyebrow: 'How it works',
      title: 'Publish your survey in four steps',
      items: [
        {
          title: 'Pick a template or start blank',
          body: 'Choose one of the 8 templates or add your own questions to a blank survey.',
        },
        {
          title: 'Edit the questions',
          body: 'Choose the question types and mark the required ones; turn on the contact field and the thank-you coupon if you want them.',
        },
        {
          title: 'Publish and share',
          body: 'Publish the survey, then download the QR code as PNG or SVG or share the link.',
        },
        {
          title: 'Read the results',
          body: 'As answers come in, see the results per question and the NPS in the panel, and export them as CSV whenever you like.',
        },
      ],
    },
    facts: {
      eyebrow: 'In short',
      title: 'Surveys at a glance',
      items: [
        { value: '5', label: 'Question types' },
        { value: '30', label: 'Questions per survey, at most' },
        { value: '8', label: 'Ready templates' },
        { value: '0–10', label: 'Scale of the recommend question' },
      ],
    },
    sectors: {
      eyebrow: 'Industries',
      title: 'Templates for your industry',
      lead: 'Some of the ready templates are written for particular kinds of business.',
      items: [
        { slug: 'restaurants', use: 'After-table-service template: food, service and waiting time.' },
        { slug: 'hotels', use: 'After-the-stay template: room cleanliness, staff care and recommending you.' },
        { slug: 'healthcare', use: 'After-the-appointment template; it asks no health questions.' },
        { slug: 'beauty-salon', use: 'After-the-service template: service quality and coming back.' },
        { slug: 'retail', use: 'In-store template: finding products and staff help.' },
      ],
    },
    faq: {
      eyebrow: 'Frequently asked questions',
      title: 'Questions about surveys',
      items: [
        {
          q: 'How are surveys different from Google reviews?',
          a: 'A Google review is public. Survey answers are not published on any public platform and reach only you, so you can ask your customers detailed questions that are specific to your business.',
        },
        {
          q: 'Which question types can I use?',
          a: 'Star (1–5), 0–10 recommend, short text, long text and multiple choice. In a multiple-choice question the customer picks one of 2 to 6 options.',
        },
        {
          q: 'Can I share a survey without a QR code?',
          a: 'Yes. Every survey has a share link that you can add to your website, e-mails or messages. Buaze does not send the survey for you by SMS, WhatsApp or e-mail.',
        },
        {
          q: 'How does the thank-you coupon work?',
          a: 'If you enter a coupon code and a short description in the survey settings, customers who complete the survey see the code on the thank-you screen. The code is fixed and Buaze does not validate it; you set the terms of the offer. The coupon is never given in exchange for a public review.',
        },
        {
          q: 'How do you protect customer data?',
          a: 'Before sending the survey, the customer accepts the KVKK privacy notice; marketing consent is a separate box that is unticked by default. Asking for contact details is optional; if you turn it off, the form does not ask for an e-mail address or phone number. IP addresses are anonymised after 90 days.',
        },
        {
          q: 'Which language does the survey open in?',
          a: 'The questions appear in the language you write them in, and the ready templates come in Turkish and English. The buttons and consent text on the survey form are in Turkish for now.',
        },
      ],
      more: { href: `${base}/faq`, label: 'See all questions' },
    },
    related: {
      eyebrow: 'Related features',
      title: 'Works together with surveys',
      items: relatedFeatureLinks(['review-management', 'analytics-reports', 'audit-center'], locale),
    },
    ctaTitle: 'Create your first survey',
  };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isFeatureLocale(locale)) return {};
  return buildFeatureMetadata({ locale, slug: SLUG, ...META[locale] });
}

export default async function SurveysPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isFeatureLocale(locale)) notFound();
  return (
    <FeaturePageLayout
      locale={locale}
      slug={SLUG}
      copy={getCopy(locale)}
      mock={<SurveyMock locale={locale} />}
      schema={SCHEMA[locale]}
    />
  );
}
