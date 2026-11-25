import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BarChart3, ImageIcon, LayoutGrid, Palette, QrCode, Tags } from 'lucide-react';
import FeaturePageLayout, { type FeaturePageCopy, type FeatureSchemaInfo } from '@/components/marketing/FeaturePageLayout';
import { buildFeatureMetadata, isFeatureLocale, type FeatureLocale } from '@/lib/seo/feature-schema';
import { relatedFeatureLinks } from '../_components/feature-catalog';
import { MenuMock } from '../_components/mocks';

// /features/menu — QR menu. Facts from src/lib/validations.ts (7 themes,
// 12 badges, 12 allergens), the menu builder (drag-and-drop with touch and
// keyboard, setup wizard, sold-out switch on the row, hide in the row menu),
// /api/restaurants/[id]/menu/qr (PNG/SVG) and menu analytics (views,
// category taps, item views/taps, traffic source, low-interest flags).
// View-only menu: no ordering or payment, no automatic translation.

const SLUG = 'menu';

const META = {
  tr: {
    title: 'QR Menü: dijital menü oluşturma ve menü analitiği',
    description:
      'Sürükle-bırak düzenleyici, 7 tema, ürün görselleri, 12 rozet ve 12 alerjen etiketiyle dijital menünüzü kurun; menü QR kodunu PNG veya SVG olarak indirin.',
  },
  en: {
    title: 'QR Menu: digital menu builder with menu analytics',
    description:
      'Build your digital menu with a drag-and-drop editor, 7 themes, product photos, 12 badges and 12 allergen labels, then download its QR code as PNG or SVG.',
  },
} as const;

const SCHEMA: Record<FeatureLocale, FeatureSchemaInfo> = {
  tr: {
    name: 'QR Menü',
    serviceType: 'QR menü ve dijital menü yönetimi',
    howToName: 'QR menü nasıl oluşturulur',
  },
  en: {
    name: 'QR Menu',
    serviceType: 'QR menu and digital menu management',
    howToName: 'How to create a QR menu',
  },
};

function getCopy(locale: FeatureLocale): FeaturePageCopy {
  const base = `/${locale}`;
  if (locale === 'tr') {
    return {
      eyebrow: 'QR Menü',
      title: 'QR menünüzü oluşturun, tek karekodla paylaşın',
      lead: 'Sürükle-bırak düzenleyici, yedi tema ve ürün görselleriyle dijital menünüzü kurun; menüye özel QR kodunu basın, hangi ürünlerin ilgi gördüğünü menü analitiğinde izleyin.',
      secondary: { href: `${base}/solutions/qr-generator`, label: 'Ücretsiz QR kod oluşturun' },
      mockCaption:
        'Örnek ekran: müşterinin telefonda gördüğü menü; kategoriler, fiyatlar, rozetler, alerjenler ve tükendi işareti.',
      definition: {
        eyebrow: 'Tanım',
        title: 'QR menü nedir?',
        paragraphs: [
          'QR menü, basılı menünün yerine geçen ve müşterinin masadaki karekodu telefon kamerasıyla okutarak açtığı dijital menüdür. Uygulama indirmek gerekmez; kod, tarayıcıda bir web sayfası açar.',
          'Fiyat değiştiğinde ya da bir ürün bittiğinde menüyü panelden güncellersiniz. QR kod menünüzün adresini açtığı için yeniden baskı gerekmez.',
          'Buaze’de menü, geri bildirim akışınızla aynı hesapta çalışır: menünün kaç kez açıldığını, hangi kategorilere bakıldığını ve hangi ürünlerin görülüp tıklanmadığını ayrı ayrı görürsünüz.',
        ],
        note: 'Ürün adları ve açıklamalar yazdığınız dilde görünür; Buaze menüyü otomatik olarak çevirmez.',
      },
      capabilities: {
        eyebrow: 'Neler var',
        title: 'Menü düzenleyicide neler var',
        items: [
          {
            icon: LayoutGrid,
            title: 'Sürükle-bırak düzenleyici',
            body: 'Kategori ve ürün sırasını sürükleyerek değiştirin; dokunmatik ekranda ve klavyede de çalışır. Biten ürünü satırdaki anahtarla tek dokunuşta tükendi olarak işaretleyin.',
          },
          {
            icon: Palette,
            title: '7 hazır tema',
            body: 'Klasik, Modern, Şık, Gastronomi, Minimal, Bistro ve Pulse temalarından birini seçin; vurgu renginizi ve logonuzu ekleyin.',
          },
          {
            icon: ImageIcon,
            title: 'Ürün görselleri',
            body: 'Fotoğraf yükleyin; görsel tarayıcınızda sıkıştırılıp WebP biçimine çevrilir, böylece menü telefonda daha hafif yüklenir.',
          },
          {
            icon: Tags,
            title: 'Rozetler ve alerjenler',
            body: 'Ürünlere Popüler, Yeni, Vegan veya Acı gibi 12 rozetten uygun olanları; gluten, süt veya yer fıstığı gibi 12 alerjen etiketinden ilgili olanları ekleyin.',
          },
          {
            icon: QrCode,
            title: 'Menüye özel QR kodu',
            body: 'Menünüz için ayrı bir QR kod oluşturup PNG veya SVG olarak indirin. Bu koddan gelen ziyaretler menü analitiğinde ayrı bir kaynak olarak sayılır.',
          },
          {
            icon: BarChart3,
            title: 'Menü analitiği',
            body: 'Menü görüntülenmeleri, kategori tıklamaları, ürün görüntülenme ve tıklamaları ayrı ölçülür; çok görülüp az tıklanan ürünler işaretlenir.',
          },
        ],
      },
      steps: {
        eyebrow: 'Nasıl çalışır',
        title: 'QR menü nasıl oluşturulur',
        items: [
          {
            title: 'Kategorileri ve ürünleri girin',
            body: 'Boş bir menüde kurulum sihirbazı işletme türünüze uygun kategoriler önerir; ürün listenizi yapıştırarak toplu ekleyebilirsiniz. Fiyat, açıklama ve görselleri sonra tamamlarsınız.',
          },
          {
            title: 'Temanızı seçin',
            body: 'Yedi temadan işletmenize uyanı seçin, vurgu renginizi ve logonuzu ekleyin.',
          },
          {
            title: 'Yayınlayın ve QR kodu indirin',
            body: 'Menüyü yayına alın; menüye özel QR kodu PNG veya SVG olarak indirip masaya, tezgâha ya da vitrine koyun.',
          },
          {
            title: 'Analitiği izleyin',
            body: 'Hangi kategorinin açıldığını, hangi ürünün görülüp tıklanmadığını menü analitiğinde görün ve menüyü buna göre düzenleyin.',
          },
        ],
      },
      facts: {
        eyebrow: 'Kısaca',
        title: 'QR Menü bir bakışta',
        items: [
          { value: '7', label: 'Hazır menü teması' },
          { value: '12', label: 'Ürün rozeti' },
          { value: '12', label: 'Alerjen etiketi' },
          { value: 'PNG + SVG', label: 'Menü QR kodu biçimleri' },
        ],
      },
      sectors: {
        eyebrow: 'Sektörler',
        title: 'Hangi işletmeler için uygun',
        lead: 'Menü düzenleyici her türlü ürün ve fiyat listesi için kullanılabilir.',
        items: [
          { slug: 'restaurants', use: 'Masadaki QR kodla açılan yemek ve içecek menüsü.' },
          { slug: 'hotels', use: 'Oda servisi ve otel restoranı menüsü.' },
          { slug: 'beauty-salon', use: 'Hizmet ve fiyat listesi.' },
          { slug: 'retail', use: 'Ürün ve fiyat listesi.' },
        ],
      },
      faq: {
        eyebrow: 'Sık sorulan sorular',
        title: 'QR menü hakkında sorular',
        items: [
          {
            q: 'Dijital menü ile QR menü aynı şey mi?',
            a: 'Pratikte evet. Dijital menü menünün elektronik hâlini, QR menü ise müşterinin ona karekod okutarak ulaşmasını anlatır. Buaze’de menü hem doğrudan bağlantıyla hem QR kodla açılır.',
          },
          {
            q: 'Menüyü güncellersem QR kodu yeniden basmam gerekir mi?',
            a: 'Hayır. QR kod menünüzün adresini açar, içeriğini değil. Ürün, fiyat, görsel veya tema değiştirdiğinizde aynı kod güncel menüyü göstermeye devam eder.',
          },
          {
            q: 'Menüde alerjen bilgisi gösterebilir miyim?',
            a: 'Evet. Her ürüne gluten, süt, yumurta, yer fıstığı veya susam gibi 12 alerjen etiketinden ilgili olanları ekleyebilirsiniz. Alerjenler ürün kartında kelimeyle yazılır, tam liste ürün ayrıntısında görünür.',
          },
          {
            q: 'Müşteriler menüden sipariş verebilir mi?',
            a: 'Hayır. Buaze QR menüsü görüntüleme içindir; sipariş, ödeme veya garson çağırma özelliği yoktur.',
          },
          {
            q: 'Menümün ne kadar görüntülendiğini görebilir miyim?',
            a: 'Evet. Menü analitiği menü görüntülenmelerini, kategori tıklamalarını, ürün görüntülenme ve tıklamalarını ayrı ayrı gösterir; ziyaretin QR koddan mı yoksa doğrudan bağlantıdan mı geldiğini de görürsünüz. Çok görülüp az tıklanan ürünler ayrıca işaretlenir.',
          },
          {
            q: 'Menü QR kodu ile geri bildirim QR kodu aynı kod mu?',
            a: 'Hayır, ikisi ayrı kodlardır ve aynı hesapta çalışır. Menü QR kodu menünüzü, geri bildirim QR kodu puan ve yorum formunu açar; ikisini ayrı ayrı basabilirsiniz.',
          },
        ],
        more: { href: `${base}/faq`, label: 'Tüm soruları görün' },
      },
      related: {
        eyebrow: 'İlgili özellikler',
        title: 'QR Menü ile birlikte çalışır',
        items: relatedFeatureLinks(['review-management', 'surveys', 'audit-center'], locale),
      },
      ctaTitle: 'Menünüzü QR koda taşıyın',
    };
  }

  return {
    eyebrow: 'QR Menu',
    title: 'Create your QR menu and share it with one code',
    lead: 'Build your digital menu with a drag-and-drop editor, seven themes and product photos; print its own QR code and see which items get attention in menu analytics.',
    secondary: { href: `${base}/solutions/qr-generator`, label: 'Make a free QR code' },
    mockCaption:
      'Sample screen: the menu a customer sees on their phone, with categories, prices, badges, allergens and an out-of-stock label.',
    definition: {
      eyebrow: 'Definition',
      title: 'What is a QR menu?',
      paragraphs: [
        'A QR menu is a digital menu that replaces the printed one: the customer scans the code at the table with their phone camera and the menu opens. No app is needed; the code opens a web page in the browser.',
        'When a price changes or an item runs out, you update the menu from the panel. Because the QR code opens your menu’s address, there is nothing to reprint.',
        'In Buaze the menu runs in the same account as your feedback flow: you see how often the menu is opened, which categories people look at and which items are seen but never tapped.',
      ],
      note: 'Item names and descriptions appear in the language you write them in; Buaze does not translate the menu automatically.',
    },
    capabilities: {
      eyebrow: 'What you get',
      title: 'What is in the menu editor',
      items: [
        {
          icon: LayoutGrid,
          title: 'Drag-and-drop editor',
          body: 'Reorder categories and items by dragging; it works on touch screens and with the keyboard too. Mark an item out of stock with one tap on the switch in its row.',
        },
        {
          icon: Palette,
          title: '7 ready themes',
          body: 'Choose from the Classic, Modern, Elegant, Gastronomy, Minimal, Bistro and Pulse themes, then add your accent colour and logo.',
        },
        {
          icon: ImageIcon,
          title: 'Product photos',
          body: 'Upload a photo and it is compressed in your browser and converted to WebP, so the menu loads lighter on a phone.',
        },
        {
          icon: Tags,
          title: 'Badges and allergens',
          body: 'Add any of 12 badges such as Popular, New, Vegan or Spicy, and the relevant labels from 12 allergens such as gluten, milk or peanut.',
        },
        {
          icon: QrCode,
          title: 'A QR code for the menu',
          body: 'Create a separate QR code for your menu and download it as PNG or SVG. Visits from this code count as their own source in menu analytics.',
        },
        {
          icon: BarChart3,
          title: 'Menu analytics',
          body: 'Menu views, category taps, item views and item taps are measured separately, and items that are seen often but rarely tapped are flagged.',
        },
      ],
    },
    steps: {
      eyebrow: 'How it works',
      title: 'How to create a QR menu',
      items: [
        {
          title: 'Add categories and items',
          body: 'For an empty menu, the setup wizard suggests categories for your type of business, and you can paste your item list to add it in one go. Fill in prices, descriptions and photos afterwards.',
        },
        {
          title: 'Pick a theme',
          body: 'Choose the one of seven themes that suits your business, then add your accent colour and logo.',
        },
        {
          title: 'Publish and download the QR code',
          body: 'Publish the menu, download its QR code as PNG or SVG and put it on tables, the counter or the window.',
        },
        {
          title: 'Follow the analytics',
          body: 'See which categories get opened and which items are seen but not tapped in menu analytics, then adjust the menu.',
        },
      ],
    },
    facts: {
      eyebrow: 'In short',
      title: 'QR Menu at a glance',
      items: [
        { value: '7', label: 'Ready menu themes' },
        { value: '12', label: 'Item badges' },
        { value: '12', label: 'Allergen labels' },
        { value: 'PNG + SVG', label: 'Menu QR code formats' },
      ],
    },
    sectors: {
      eyebrow: 'Industries',
      title: 'Which businesses it suits',
      lead: 'The menu editor works for any list of products and prices.',
      items: [
        { slug: 'restaurants', use: 'A food and drinks menu that opens from the table QR code.' },
        { slug: 'hotels', use: 'Room service and hotel restaurant menus.' },
        { slug: 'beauty-salon', use: 'A list of services and prices.' },
        { slug: 'retail', use: 'A list of products and prices.' },
      ],
    },
    faq: {
      eyebrow: 'Frequently asked questions',
      title: 'Questions about the QR menu',
      items: [
        {
          q: 'Is a digital menu the same as a QR menu?',
          a: 'In practice, yes. “Digital menu” describes the electronic version of the menu; “QR menu” describes how the customer reaches it, by scanning a code. In Buaze the menu opens both from a direct link and from a QR code.',
        },
        {
          q: 'Do I need to reprint the QR code when I update the menu?',
          a: 'No. The QR code opens your menu’s address, not its contents. When you change items, prices, photos or the theme, the same code keeps showing the current menu.',
        },
        {
          q: 'Can I show allergen information on the menu?',
          a: 'Yes. You can add the relevant labels from 12 allergens, such as gluten, milk, egg, peanut or sesame, to each item. Allergens are written out in words on the item card, and the full list appears in the item details.',
        },
        {
          q: 'Can customers order from the menu?',
          a: 'No. The Buaze QR menu is for viewing only; it has no ordering, payment or call-the-waiter feature.',
        },
        {
          q: 'Can I see how often my menu is viewed?',
          a: 'Yes. Menu analytics shows menu views, category taps, item views and item taps separately, and tells you whether a visit came from the QR code or a direct link. Items that are seen often but rarely tapped are flagged too.',
        },
        {
          q: 'Is the menu QR code the same as the feedback QR code?',
          a: 'No. They are two separate codes that work in the same account. The menu QR code opens your menu and the feedback QR code opens the rating and comment form; you can print them separately.',
        },
      ],
      more: { href: `${base}/faq`, label: 'See all questions' },
    },
    related: {
      eyebrow: 'Related features',
      title: 'Works together with QR Menu',
      items: relatedFeatureLinks(['review-management', 'surveys', 'audit-center'], locale),
    },
    ctaTitle: 'Move your menu to a QR code',
  };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isFeatureLocale(locale)) return {};
  return buildFeatureMetadata({ locale, slug: SLUG, ...META[locale] });
}

export default async function FeatureMenuPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isFeatureLocale(locale)) notFound();
  return (
    <FeaturePageLayout
      locale={locale}
      slug={SLUG}
      copy={getCopy(locale)}
      mock={<MenuMock locale={locale} />}
      schema={SCHEMA[locale]}
    />
  );
}
