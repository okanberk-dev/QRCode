import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Calculator, ClipboardCheck, FileDown, Link2, ListChecks, TriangleAlert } from 'lucide-react';
import FeaturePageLayout, { type FeaturePageCopy, type FeatureSchemaInfo } from '@/components/marketing/FeaturePageLayout';
import { buildFeatureMetadata, isFeatureLocale, type FeatureLocale } from '@/lib/seo/feature-schema';
import { relatedFeatureLinks } from '../_components/feature-catalog';
import { AuditMock } from '../_components/mocks';

// /features/audit-center — Denetim Merkezi. Facts from src/lib/audits/types.ts
// (6 sectors, 3 scoring modes, 6 question types, TR/EN audits), score.ts
// (photos never scored, text scored by correct answer or by hand), misses.ts
// (items that fail most often), the 3-step builder wizard, the no-login
// public link (one-time or reusable) and the responses CSV export. Seed
// templates are Turkish only and their count lives in the DB, so no number
// is printed. No scheduled sending or reminders.

const SLUG = 'audit-center';

const META = {
  tr: {
    title: 'Denetim Merkezi: kontrol listeleri ve ekip testleri',
    description:
      'Hijyen, açılış ve vardiya devri kontrol listelerini ve işe alım testlerini hazırlayın. Ekibiniz giriş yapmadan doldurur, puan 3 yöntemden biriyle hesaplanır.',
  },
  en: {
    title: 'Audit Center: operational checklists and team tests',
    description:
      'Prepare hygiene, opening and shift-handover checklists and hiring tests. Your team fills them in without logging in and the score uses one of 3 methods.',
  },
} as const;

const SCHEMA: Record<FeatureLocale, FeatureSchemaInfo> = {
  tr: {
    name: 'Denetim Merkezi',
    serviceType: 'Dijital kontrol listesi ve personel testi',
    howToName: 'Dijital kontrol listesi nasıl hazırlanır',
  },
  en: {
    name: 'Audit Center',
    serviceType: 'Digital checklists and staff tests',
    howToName: 'How to create a digital checklist',
  },
};

function getCopy(locale: FeatureLocale): FeaturePageCopy {
  const base = `/${locale}`;
  if (locale === 'tr') {
    return {
      eyebrow: 'Denetim Merkezi',
      title: 'Dijital kontrol listeleri ve personel testleri',
      lead: 'Hijyen, açılış ve vardiya devri kontrol listelerini ve işe alım testlerini hazırlayın; ekibiniz giriş yapmadan telefondan doldurur, puanı ve en sık sorun çıkan maddeleri siz görürsünüz.',
      secondary: { href: `${base}/features/surveys`, label: 'Anketleri inceleyin' },
      mockCaption:
        'Örnek ekran: doldurulmuş bir mutfak açılış kontrol listesi; evet/hayır, 1–5 puan ve fotoğraf maddeleri ile geçti/kaldı sonucu.',
      definition: {
        eyebrow: 'Tanım',
        title: 'Denetim Merkezi nedir?',
        paragraphs: [
          'Denetim Merkezi, işletmenizin günlük kontrollerini ve ekip değerlendirmelerini kâğıt formlardan panele taşır. İki tür içerik hazırlarsınız: maddeleri tek tek işaretlenen kontrol listeleri (hijyen, açılış, vardiya devri gibi) ve doğru cevabı olan testler (işe alım, eğitim değerlendirmesi gibi).',
          'Her denetimin giriş gerektirmeyen bir bağlantısı olur; bağlantıyı tek seferlik ya da tekrar kullanılabilir olarak ayarlarsınız. Yanıtlar geldikçe puan otomatik hesaplanır, metin yanıtlarını gerekirse elle puanlarsınız.',
          'Hazır şablonlar yeme-içme, konaklama, perakende, sağlık, güzellik ve diğer işletmeler olmak üzere 6 sektör için hazırlanmıştır ve şu an Türkçedir. Kendi denetiminizi Türkçe ya da İngilizce olarak sıfırdan da oluşturabilirsiniz.',
        ],
        note: 'KVKK öz denetim şablonları iç kontrol içindir; hukuki uyum çalışmasının yerine geçmez.',
      },
      capabilities: {
        eyebrow: 'Neler var',
        title: 'Denetim Merkezi’nde neler var',
        items: [
          {
            icon: ClipboardCheck,
            title: 'Kontrol listeleri ve testler',
            body: 'Hijyen, açılış ve vardiya devri gibi kontrol listelerini; işe alım ve eğitim testlerini aynı yerden, üç adımlı bir sihirbazla hazırlayın.',
          },
          {
            icon: ListChecks,
            title: 'Altı soru tipi',
            body: 'Evet/hayır, 1–5 puan, tek seçim, çoklu seçim, kısa not ve fotoğraf. Fotoğraf maddesiyle ekibiniz yaptığı kontrolü görselle belgeler.',
          },
          {
            icon: Calculator,
            title: 'Üç puanlama yöntemi',
            body: 'Yüzde (puanlanan her madde eşit sayılır), ağırlıklı (maddelere verdiğiniz ağırlık hesaba katılır) ya da geçti/kaldı (belirlediğiniz geçme puanına göre).',
          },
          {
            icon: Link2,
            title: 'Giriş gerektirmeyen bağlantı',
            body: 'Denetimi bir bağlantıyla paylaşın; ekibiniz ya da aday hesap açmadan telefondan doldurur. Bağlantı tek seferlik ya da tekrar kullanılabilir olabilir.',
          },
          {
            icon: TriangleAlert,
            title: 'En sık sorun çıkan maddeler',
            body: 'Yanıtlar biriktikçe en sık yanlış cevaplanan ya da düşük puan alan maddeleri görün; eğitimi ve kontrolü oraya yoğunlaştırın.',
          },
          {
            icon: FileDown,
            title: 'Hazır şablonlar ve CSV',
            body: '6 sektör için hazırlanmış şablonlardan birini seçip düzenleyin; bir denetimin tüm yanıtlarını CSV olarak indirin.',
          },
        ],
      },
      steps: {
        eyebrow: 'Nasıl çalışır',
        title: 'Kâğıt formdan panele dört adım',
        items: [
          {
            title: 'Şablon seçin ya da sıfırdan başlayın',
            body: 'Kontrol listesi mi yoksa test mi hazırlayacağınızı seçin; işletmenizin sektörüne uygun hazır şablonlardan biriyle başlayabilirsiniz.',
          },
          {
            title: 'Maddeleri düzenleyin',
            body: 'Maddeleri ekleyip soru tipini seçin; testlerde doğru cevabı, ağırlıklı puanlamada her maddenin ağırlığını belirleyin.',
          },
          {
            title: 'Yayınlayın ve paylaşın',
            body: 'Puanlama yöntemini ve gerekiyorsa geçme puanını seçip yayınlayın, ardından bağlantıyı ekibinizle paylaşın.',
          },
          {
            title: 'Sonuçları inceleyin',
            body: 'Gelen yanıtları ve puanları panelde görün, en sık sorun çıkan maddeleri izleyin, sonuçları CSV olarak indirin.',
          },
        ],
      },
      facts: {
        eyebrow: 'Kısaca',
        title: 'Denetim Merkezi bir bakışta',
        items: [
          { value: '6', label: 'Soru tipi' },
          { value: '3', label: 'Puanlama yöntemi' },
          { value: '6', label: 'Hazır şablonların kapsadığı sektör' },
          { value: 'TR + EN', label: 'Denetim dili' },
        ],
      },
      sectors: {
        eyebrow: 'Sektörler',
        title: 'Sektörünüzde neyi denetleyebilirsiniz',
        lead: 'Kontrol listeleri her sektörde farklı bir günlük işi kapsar.',
        items: [
          { slug: 'restaurants', use: 'Mutfak açılışı, derin temizlik ve servis personeli değerlendirmesi.' },
          { slug: 'hotels', use: 'Kat hizmetleri, resepsiyon ve kahvaltı servisi kontrolleri.' },
          { slug: 'retail', use: 'Mağaza açılış turu, stok sayımı ve kasiyer adayı testi.' },
          { slug: 'healthcare', use: 'Sterilizasyon, hijyen ve hasta karşılama kontrolleri.' },
          { slug: 'beauty-salon', use: 'Salon hijyeni ve randevu kayıtlarının kontrolü.' },
        ],
      },
      faq: {
        eyebrow: 'Sık sorulan sorular',
        title: 'Denetim Merkezi hakkında sorular',
        items: [
          {
            q: 'Kontrol listesi ile test arasındaki fark ne?',
            a: 'Kontrol listesinde maddeler yapıldı ya da yapılmadı diye işaretlenir; hijyen, açılış veya vardiya devri için uygundur. Testte maddelerin doğru cevabı vardır ve yanıtlar bu cevaba göre puanlanır; işe alım ya da eğitim değerlendirmesi için uygundur.',
          },
          {
            q: 'Ekibimin hesap açması gerekiyor mu?',
            a: 'Hayır. Denetimi giriş gerektirmeyen bir bağlantıyla paylaşırsınız; ekip üyeniz ya da aday telefonundan doldurur. Tekrar kullanılabilir bağlantılarda dolduran kişinin adını yazması isteğe bağlıdır.',
          },
          {
            q: 'Puan nasıl hesaplanıyor?',
            a: 'Üç yöntemden birini seçersiniz: yüzde yönteminde puanlanan her madde eşit sayılır, ağırlıklı yöntemde maddelere verdiğiniz ağırlık hesaba katılır, geçti/kaldı yönteminde sonuç belirlediğiniz geçme puanıyla karşılaştırılır. Fotoğraf maddeleri puana katılmaz; metin yanıtlarını gerekirse elle puanlarsınız.',
          },
          {
            q: 'Hazır şablonlar hangi dilde?',
            a: 'Hazır şablonlar şu an Türkçedir. Kendi denetiminizi Türkçe ya da İngilizce olarak oluşturabilirsiniz; ekibiniz formu seçtiğiniz dilde görür.',
          },
          {
            q: 'Denetimler düzenli olarak hatırlatılıyor mu?',
            a: 'Hayır. Buaze denetim bağlantısını sizin yerinize göndermez ve hatırlatma yapmaz; bağlantıyı ekibinizle siz paylaşırsınız. Tekrar kullanılabilir bir bağlantıyla aynı kontrol listesini her gün ya da her hafta doldurabilirsiniz.',
          },
          {
            q: 'Sonuçları dışa aktarabilir miyim?',
            a: 'Evet. Bir denetimin tüm yanıtlarını CSV olarak indirebilir, dosyayı Excel’de veya Google E-Tablolar’da açabilirsiniz.',
          },
        ],
        more: { href: `${base}/faq`, label: 'Tüm soruları görün' },
      },
      related: {
        eyebrow: 'İlgili özellikler',
        title: 'Denetim Merkezi ile birlikte çalışır',
        items: relatedFeatureLinks(['surveys', 'menu', 'review-management'], locale),
      },
      ctaTitle: 'İlk kontrol listenizi hazırlayın',
    };
  }

  return {
    eyebrow: 'Audit Center',
    title: 'Digital checklists and staff tests',
    lead: 'Prepare hygiene, opening and shift-handover checklists and hiring tests; your team fills them in on a phone without logging in, and you see the score and the items that fail most often.',
    secondary: { href: `${base}/features/surveys`, label: 'Explore surveys' },
    mockCaption:
      'Sample screen: a completed kitchen opening checklist with yes/no, 1–5 rating and photo items, and a pass/fail result.',
    definition: {
      eyebrow: 'Definition',
      title: 'What is the Audit Center?',
      paragraphs: [
        'The Audit Center moves your daily checks and team assessments from paper forms into the panel. You prepare two kinds of content: checklists whose items are ticked off one by one (hygiene, opening or shift handover, for example) and tests whose items have a correct answer (hiring or training assessments, for example).',
        'Every audit has a link that needs no login, which you set as one-time or reusable. As answers come in, the score is calculated automatically; you can score text answers by hand when needed.',
        'The ready templates cover 6 sectors (food and beverage, hospitality, retail, health, beauty and other businesses) and are in Turkish for now. You can also build your own audit from scratch in Turkish or English.',
      ],
      note: 'The KVKK self-check templates are for internal checks; they do not replace legal compliance work.',
    },
    capabilities: {
      eyebrow: 'What you get',
      title: 'What is in the Audit Center',
      items: [
        {
          icon: ClipboardCheck,
          title: 'Checklists and tests',
          body: 'Prepare checklists such as hygiene, opening and shift handover, and hiring or training tests, in one place with a three-step wizard.',
        },
        {
          icon: ListChecks,
          title: 'Six question types',
          body: 'Yes/no, 1–5 rating, single choice, multiple choice, short note and photo. With a photo item, your team documents the check with a picture.',
        },
        {
          icon: Calculator,
          title: 'Three scoring methods',
          body: 'Percentage (every scored item counts equally), weighted (the weight you give each item counts) or pass/fail (against a pass mark you set).',
        },
        {
          icon: Link2,
          title: 'A link with no login',
          body: 'Share the audit with a link; a team member or candidate fills it in on a phone without creating an account. The link can be one-time or reusable.',
        },
        {
          icon: TriangleAlert,
          title: 'Items that fail most often',
          body: 'As answers build up, see which items are most often answered wrongly or rated low, and focus training and checks there.',
        },
        {
          icon: FileDown,
          title: 'Ready templates and CSV',
          body: 'Pick and edit a template prepared for one of 6 sectors, and export all the answers to an audit as CSV.',
        },
      ],
    },
    steps: {
      eyebrow: 'How it works',
      title: 'Four steps from paper form to panel',
      items: [
        {
          title: 'Pick a template or start from scratch',
          body: 'Choose whether to prepare a checklist or a test; you can start from a ready template that fits your sector.',
        },
        {
          title: 'Edit the items',
          body: 'Add items and pick a question type; set the correct answer for tests and each item’s weight for weighted scoring.',
        },
        {
          title: 'Publish and share',
          body: 'Choose the scoring method and, if needed, the pass mark, publish, then share the link with your team.',
        },
        {
          title: 'Review the results',
          body: 'See the answers and scores in the panel, follow the items that fail most often and export the results as CSV.',
        },
      ],
    },
    facts: {
      eyebrow: 'In short',
      title: 'Audit Center at a glance',
      items: [
        { value: '6', label: 'Question types' },
        { value: '3', label: 'Scoring methods' },
        { value: '6', label: 'Sectors covered by ready templates' },
        { value: 'TR + EN', label: 'Audit languages' },
      ],
    },
    sectors: {
      eyebrow: 'Industries',
      title: 'What you can audit in your industry',
      lead: 'Checklists cover a different daily job in each industry.',
      items: [
        { slug: 'restaurants', use: 'Kitchen opening, deep cleaning and service staff assessments.' },
        { slug: 'hotels', use: 'Housekeeping, reception and breakfast service checks.' },
        { slug: 'retail', use: 'Store opening walk-throughs, stock counts and cashier candidate tests.' },
        { slug: 'healthcare', use: 'Sterilisation, hygiene and patient welcome checks.' },
        { slug: 'beauty-salon', use: 'Salon hygiene and appointment record checks.' },
      ],
    },
    faq: {
      eyebrow: 'Frequently asked questions',
      title: 'Questions about the Audit Center',
      items: [
        {
          q: 'What is the difference between a checklist and a test?',
          a: 'In a checklist, items are marked as done or not done; it suits hygiene, opening or shift-handover checks. In a test, items have a correct answer and responses are scored against it; it suits hiring or training assessments.',
        },
        {
          q: 'Does my team need an account?',
          a: 'No. You share the audit with a link that needs no login, and a team member or candidate fills it in on their phone. On reusable links, entering the respondent’s name is optional.',
        },
        {
          q: 'How is the score calculated?',
          a: 'You choose one of three methods: with percentage every scored item counts equally, with weighted the weight you give each item counts, and with pass/fail the result is compared with the pass mark you set. Photo items are not scored; you can score text answers by hand when needed.',
        },
        {
          q: 'Which language are the ready templates in?',
          a: 'The ready templates are in Turkish for now. You can create your own audits in Turkish or English, and your team sees the form in the language you choose.',
        },
        {
          q: 'Does Buaze send reminders for audits?',
          a: 'No. Buaze does not send the audit link or reminders for you; you share the link with your team. With a reusable link, the same checklist can be filled in every day or every week.',
        },
        {
          q: 'Can I export the results?',
          a: 'Yes. You can export all the answers to an audit as CSV and open the file in Excel or Google Sheets.',
        },
      ],
      more: { href: `${base}/faq`, label: 'See all questions' },
    },
    related: {
      eyebrow: 'Related features',
      title: 'Works together with the Audit Center',
      items: relatedFeatureLinks(['surveys', 'menu', 'review-management'], locale),
    },
    ctaTitle: 'Create your first checklist',
  };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isFeatureLocale(locale)) return {};
  return buildFeatureMetadata({ locale, slug: SLUG, ...META[locale] });
}

export default async function AuditCenterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isFeatureLocale(locale)) notFound();
  return (
    <FeaturePageLayout
      locale={locale}
      slug={SLUG}
      copy={getCopy(locale)}
      mock={<AuditMock locale={locale} />}
      schema={SCHEMA[locale]}
    />
  );
}
