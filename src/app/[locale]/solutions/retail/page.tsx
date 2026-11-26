import type { Metadata } from 'next';
import { BellRing, Building2, Gift, Link2, Mail } from 'lucide-react';
import SolutionPageLayout, { type SolutionPageContent } from '@/components/marketing/SolutionPageLayout';
import { buildSolutionMetadata } from '@/lib/solution-schema';
import type { Locale } from '@/lib/translations';
import { IllusRetail } from '../_components/sector-illustrations';

// ISR: inherits `revalidate = 3600` from `[locale]/layout.tsx`. Reads only
// `params`, so the page stays static. Sector "retail" drives the platform
// list (Google, Yandex) and the "Store experience" survey template.

const SLUG = 'retail';

const CONTENT: Record<Locale, SolutionPageContent> = {
  tr: {
    name: 'Perakende mağazalar',
    meta: {
      title: 'Perakende mağazalar için QR ile müşteri yorumları',
      description:
        'Mağazanız için QR kod: müşteri alışverişten sonra puan verir, eşiğin altında önce size yazabilir. Kasa etiketli QR, mağaza karşılaştırması, Google bağlantıları.',
    },
    eyebrow: 'Perakende mağazalar',
    h1: 'Perakende mağazalar için QR ile müşteri geri bildirimi ve Google yorumları',
    lead:
      'Müşteri alışverişini bitirdiğinde kasadaki ya da deneme kabinindeki QR kodu okutur ve mağazayı puanlar. Eşik ve üzerindeki puanlarda Google yorum sayfanız açılır; eşiğin altında müşteri önce size yazabilir, herkese açık yorum bağlantısı aynı ekranda görünür.',
    flow: {
      title: 'Mağazada QR ile geri bildirim akışı',
      steps: [
        {
          title: 'Kasalar ve alanlar için QR hazırlayın',
          body:
            'Her kasa ya da alan için ayrı QR oluşturup etiket verebilirsiniz (ör. Kasa-1, Kabin, Kat2). Etiket düşük puan e-postasında ve geri bildirim CSV dosyasında görünür.',
        },
        {
          title: 'Müşteri puan verir',
          body:
            'Müşteri QR kodu okutur ve 1–5 yıldız verir. Belirlediğiniz eşik ve üzerindeki puanlarda (varsayılan 5 yıldız) Google yorum sayfanız açılır. Eşiğin altındaki puanlarda müşteri önce size özel geri bildirim yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür.',
        },
        {
          title: 'Mağaza müdürü haberdar olur',
          body:
            '1–3 yıldızlık geri bildirimde anında e-posta gelir; her mağazanın uyarı adresini o mağazanın müdürüne yönlendirebilirsiniz. Müşteri e-posta adresini bıraktıysa yanıtınızı panelden yazılı gönderirsiniz.',
        },
      ],
    },
    placements: {
      title: 'Mağazada QR kodu nereye koymalı',
      lead: 'Müşteri deneyimi en net, ödeme yaparken ve ürünü denerken değerlendirir.',
      items: [
        {
          title: 'Kasa ve ödeme noktası',
          body:
            'Kasadaki küçük bir stant, ödeme beklenirken okutulur. Birden çok kasanız varsa her kasaya ayrı etiketli QR koyabilirsiniz.',
        },
        {
          title: 'Poşet ve fiş',
          body:
            'Poşete ya da paketin içine koyacağınız küçük bir kart, müşterinin evde de değerlendirme yapmasını sağlar. Fişe QR basmak kasa sisteminizin desteğine bağlıdır; Buaze kasa sistemlerine bağlanmaz.',
        },
        {
          title: 'Deneme kabini',
          body:
            'Kabin aynasının yanındaki QR kod; beden, kabin temizliği ve personel ilgisi gibi konularda geri bildirim almanın doğal yeridir.',
        },
        {
          title: 'İade ve değişim noktası',
          body:
            'İade masasındaki QR kod, sorun yaşayan müşterinin size doğrudan yazmasını kolaylaştırır. Müşteri isterse yine herkese açık yorum bağlantısını kullanır.',
        },
      ],
      tip:
        'Etiketleri kasa veya alan adına göre verin; kasiyer adı kullanmayın. Ekip değiştiğinde QR kodları yeniden bastırmanız gerekmez.',
    },
    uses: {
      title: 'Mağaza panelinde işinize yarayanlar',
      items: [
        {
          icon: Building2,
          title: 'Mağazaları tek tabloda karşılaştırın',
          body:
            'Her mağazayı ayrı işletme olarak ekleyip İşletmeler tablosunda son 30 günün geri bildirim sayısını, ortalama puanını, bekleyen düşük puanları ve bağlantı sorunlarını görürsünüz.',
        },
        {
          icon: Mail,
          title: 'Her mağaza kendi uyarısını alsın',
          body:
            'Düşük puan uyarılarının gideceği adresi her mağaza için ayrı ayarlayabilirsiniz. Ekip üyelerine yalnız çalıştıkları mağazalara erişim verirsiniz.',
        },
        {
          icon: BellRing,
          title: 'Haftalık özet ve düşüş uyarısı',
          body:
            'Geri bildirim gelen haftalarda her pazartesi geçen haftanın özetini e-postayla alırsınız. Son 7 günün ortalama puanı, ondan önceki üç haftanın ortalamasından en az 0,5 yıldız düşükse (her iki dönemde en az 5 geri bildirimle) ayrıca uyarı e-postası gelir.',
        },
        {
          icon: Link2,
          title: 'Bağlantıları tüm mağazalarda yönetin',
          body:
            'Instagram, Facebook ve WhatsApp bağlantınızı bir kez girip diğer mağazalara uygularsınız. Platform bağlantıları sayfasındaki “Tüm işletmeler” görünümü, hangi mağazada yorum bağlantısının eksik ya da sorunlu olduğunu gösterir.',
        },
        {
          icon: Gift,
          title: 'Düzenli müşteriye sadakat kartı',
          body:
            'Fırın ve mağazalar için uygulamasız damga kartı (örneğin 10 alışverişe 1 ürün). Müşteri kasadaki QR ile katılır, siz kartını telefonla okutup damga eklersiniz; şubelerinizde tek kart geçerlidir. Kart yalnız alışverişle dolar, yorumla bağlantısı yoktur.',
        },
      ],
    },
    platforms: {
      title: 'Mağazalar için öne çıkan yorum platformları',
      lead:
        'Sektör olarak “Perakende”yi seçtiğinizde panel Google ve Yandex yorum bağlantılarını gösterir. Mağazanızı haritada arayan müşteri, yorumlarınızı Google İşletme Profilinizde görür.',
      note:
        'Her mağazanın kendi Google İşletme Profili varsa her mağaza için kendi yorum bağlantısını girin; bir mağazanın bağlantısını diğerlerinde kullanmayın. Yandex bağlantınızı eklerseniz, özel geri bildirim bırakan müşterinin teşekkür ekranında “Yandex Haritalarda paylaş” seçeneği görünür.',
    },
    questions: {
      title: 'Müşterilere ne sormalı',
      lead:
        'Hazır “Mağaza deneyimi” şablonu genel memnuniyeti, aranan ürünün kolayca bulunup bulunmadığını ve personelin ilgisini sorar; bulunamayan ürün için bir not alanı da vardır. Kendi sorularınızı ekleyerek kasa bekleme süresini de öğrenebilirsiniz.',
      items: [
        { text: 'Aradığınız ürünü bulmanız ne kadar sürdü?', type: 'multiple_choice' },
        { text: 'Kasada ne kadar beklediniz?', type: 'multiple_choice' },
        { text: 'Mağazanın düzenini ve temizliğini nasıl değerlendirirsiniz?', type: 'rating' },
        { text: 'Bulamadığınız bir ürün oldu mu? Hangisi?', type: 'short_text' },
        { text: 'Mağazamızı bir arkadaşınıza önerme olasılığınız nedir?', type: 'nps' },
      ],
      audits: [
        {
          title: 'Mağaza açılış öncesi tur kontrolü',
          body: 'Açılıştan önce vitrin, kasa hazırlığı, raf düzeni ve acil çıkışları kontrol etmek için.',
        },
        {
          title: 'Haftalık stok sayım kontrol listesi',
          body: 'Yüksek değerli ürünlerin sayımı ve sistem stoğuyla çıkan farkların takibi için.',
        },
        {
          title: 'Perakende kasiyer adayı quiz',
          body: 'Kasiyer adaylarına iade kuralları, nakit güvenliği ve vardiya kapanışı üzerine sorular.',
        },
        {
          title: 'Müşteri itirazı senaryo değerlendirme',
          body: 'Saha personeli için iade, ürün kusuru ve fiyat itirazı senaryoları.',
        },
      ],
    },
    faq: {
      title: 'Perakende mağazalar için sık sorulan sorular',
      items: [
        {
          q: 'Kasa sistemimize veya stok yazılımımıza bağlanıyor mu?',
          a: 'Hayır. Buaze kasa (POS), ERP veya stok yazılımlarına bağlanmaz ve müşterilere SMS göndermez. Müşteri QR kodu mağazada, poşetteki karttan ya da kasa sisteminiz destekliyorsa fişten okutur.',
        },
        {
          q: 'Kasiyer veya vardiya bazında rapor alabilir miyim?',
          a: 'Hayır, kasiyer veya vardiya bazında rapor yoktur. Kasa etiketi düşük puan e-postasında ve CSV dosyasında görünür. Mağazaları ayrı işletme olarak eklerseniz her mağazanın analitiğini ayrı görürsünüz.',
        },
        {
          q: 'Yorum yapan müşteriye indirim kuponu verebilir miyim?',
          a: 'Yorum karşılığında indirim, kupon veya hediye vermeyin; Google yorum karşılığı teşviki yasaklar ve Buaze böyle bir özellik sunmaz. Anketlerde isteğe bağlı bir teşekkür kuponu gösterebilirsiniz; bu kupon herkese açık yorum yazmaya bağlanmamalıdır.',
        },
        {
          q: 'Memnun kalmayan müşteri Google’da yorum yazabilir mi?',
          a: 'Evet. Eşiğin altında puan veren müşteri önce size özel geri bildirim yazabilir; Google yorum bağlantısı aynı ekranda görünür ve müşteri isterse oradan herkese açık yorum yazar. Buaze yorum silmez, gizlemez veya değiştirmez.',
        },
        {
          q: 'Müşterinin telefon numarasını toplayabilir miyim?',
          a: 'QR geri bildirim formu telefon numarası sormaz; e-posta adresi isteğe bağlıdır. Anketlerde iletişim bilgisi toplamayı açarsanız müşteri isterse e-posta adresini ve telefonunu bırakır.',
        },
        {
          q: 'Online mağazamız için de kullanabilir miyim?',
          a: 'Evet. Bağlantıyı kopyalayıp sipariş onay e-postanıza ya da paketin içine koyacağınız karta ekleyebilirsiniz. Buaze e-ticaret altyapınıza bağlanmaz ve siparişleri görmez.',
        },
      ],
    },
    ctaTitle: 'Mağazanızda müşteri geri bildirimi toplamaya başlayın',
  },
  en: {
    name: 'Retail stores',
    meta: {
      title: 'QR customer feedback and reviews for retail stores',
      description:
        'QR codes for retail stores: shoppers rate their visit and can write to you first below your threshold. Till-labelled codes, store comparison and Google links.',
    },
    eyebrow: 'Retail stores',
    h1: 'QR customer feedback and Google reviews for retail stores',
    lead:
      'When they finish shopping, customers scan the QR code at the checkout or in the fitting room and rate the store. At or above your threshold, your Google review page opens; below it, the customer can write to you first, and the public review link is shown on the same screen.',
    flow: {
      title: 'How QR feedback works in a store',
      steps: [
        {
          title: 'Prepare QR codes for checkouts and areas',
          body:
            'Create a separate QR code for each checkout or area and give it a label (for example Till-1, FittingRoom or Floor2). The label shows in the low-rating e-mail and the feedback CSV file.',
        },
        {
          title: 'The customer gives a rating',
          body:
            'The customer scans the QR code and gives 1–5 stars. At or above the threshold you set (5 stars by default), your Google review page opens. Below it, the customer can first send you private feedback; the public review link is shown on the same screen.',
        },
        {
          title: 'The store manager hears about it',
          body:
            'Every 1–3★ piece of feedback sends an instant e-mail, and you can route each store’s alerts to that store’s manager. If the customer left an e-mail address, you reply in writing from the panel.',
        },
      ],
    },
    placements: {
      title: 'Where to put the QR code in a store',
      lead: 'Customers judge the experience most clearly while paying and while trying things on.',
      items: [
        {
          title: 'Checkout and payment point',
          body:
            'A small stand at the till gets scanned while the payment goes through. If you have several tills, give each its own labelled code.',
        },
        {
          title: 'Bag and receipt',
          body:
            'A small card in the bag or the parcel lets customers rate the visit at home. Printing a QR code on the receipt depends on your till system; Buaze doesn’t connect to till systems.',
        },
        {
          title: 'Fitting room',
          body:
            'A QR code next to the fitting-room mirror is the natural place for feedback on sizes, cleanliness and staff care.',
        },
        {
          title: 'Returns and exchanges desk',
          body:
            'A QR code at the returns desk makes it easy for customers who had a problem to write to you directly. They can still use the public review link if they want.',
        },
      ],
      tip:
        'Label codes by till or area, not by cashier name. When your team changes, you don’t need to reprint the QR codes.',
    },
    uses: {
      title: 'Panel features that help a store',
      items: [
        {
          icon: Building2,
          title: 'Compare stores in one table',
          body:
            'Add each store as its own business and see the last 30 days’ feedback count, average rating, pending low ratings and link problems in the businesses table.',
        },
        {
          icon: Mail,
          title: 'Each store gets its own alerts',
          body:
            'Set a separate address for low-rating alerts for each store. You can give team members access only to the stores they work in.',
        },
        {
          icon: BellRing,
          title: 'Weekly summary and drop alert',
          body:
            'In weeks with feedback, you receive a summary of the past week by e-mail every Monday. If the last 7 days’ average rating is at least 0.5 stars below the average of the three weeks before (with at least 5 pieces of feedback in each period), you also get an alert e-mail.',
        },
        {
          icon: Link2,
          title: 'Manage links across all stores',
          body:
            'Enter your Instagram, Facebook and WhatsApp links once and apply them to your other stores. The “All businesses” view on the Platform links page shows which store has a missing or broken review link.',
        },
        {
          icon: Gift,
          title: 'A loyalty card for regulars',
          body:
            'An app-free stamp card for bakeries and shops (for example every 11th item free). Customers join with the QR at the counter and you scan their card with your phone to add a stamp; one card works across your branches. The card fills with purchases only and is not linked to reviews.',
        },
      ],
    },
    platforms: {
      title: 'Review platforms that matter for stores',
      lead:
        'When you pick “Retail” as your industry, the panel shows Google and Yandex review links. Customers who look for your store on the map see your reviews on your Google Business Profile.',
      note:
        'If each store has its own Google Business Profile, enter each store’s own review link; don’t reuse one store’s link for the others. If you add your Yandex link, customers who leave private feedback also see a “Share on Yandex Maps” option on the thank-you screen.',
    },
    questions: {
      title: 'What to ask your customers',
      lead:
        'The ready-made “Store experience” template asks about overall satisfaction, whether customers easily found what they were looking for and how attentive the staff were, with a note field for products they couldn’t find. Add your own questions to learn about checkout waiting times too.',
      items: [
        { text: 'How long did it take to find the product you wanted?', type: 'multiple_choice' },
        { text: 'How long did you wait at the checkout?', type: 'multiple_choice' },
        { text: 'How would you rate the layout and cleanliness of the store?', type: 'rating' },
        { text: 'Was there a product you couldn’t find? Which one?', type: 'short_text' },
        { text: 'How likely are you to recommend our store to a friend?', type: 'nps' },
      ],
      audits: [
        {
          title: 'Pre-opening store walkthrough',
          body: 'To check the window display, till readiness, shelf order and emergency exits before opening.',
        },
        {
          title: 'Weekly stock count checklist',
          body: 'To count high-value products and follow up on differences from system stock.',
        },
        {
          title: 'Retail cashier candidate quiz',
          body: 'Questions for cashier candidates on return rules, cash security and closing a shift.',
        },
        {
          title: 'Customer objection scenario review',
          body: 'Return, faulty product and price objection scenarios for shop-floor staff.',
        },
      ],
    },
    faq: {
      title: 'Retail store FAQ',
      items: [
        {
          q: 'Does it connect to our till or stock software?',
          a: 'No. Buaze doesn’t connect to till (POS), ERP or stock software and doesn’t send customers text messages. Customers scan the QR code in the store, from a card in their bag, or from the receipt if your till system can print it.',
        },
        {
          q: 'Can I get reports per cashier or shift?',
          a: 'No, there are no per-cashier or per-shift reports. The till label shows in the low-rating e-mail and the CSV file. If you add each store as its own business, you see analytics for each store separately.',
        },
        {
          q: 'Can I give a discount coupon to customers who leave a review?',
          a: 'Don’t offer discounts, coupons or gifts in exchange for reviews; Google prohibits incentives for reviews, and Buaze has no such feature. Surveys can show an optional thank-you coupon, but it must not be tied to posting a public review.',
        },
        {
          q: 'Can a customer who gives a low rating still post on Google?',
          a: 'Yes. A customer who rates below your threshold can first send you private feedback; the Google review link is shown on the same screen, and they can post a public review from there if they want. Buaze doesn’t delete, hide or edit reviews.',
        },
        {
          q: 'Can I collect customers’ phone numbers?',
          a: 'The QR feedback form doesn’t ask for a phone number, and the e-mail address is optional. If you turn on contact details in a survey, customers can leave their e-mail address and phone number if they want.',
        },
        {
          q: 'Can I use it for our online shop too?',
          a: 'Yes. Copy the link and add it to your order confirmation e-mail or to a card you put in the parcel. Buaze doesn’t connect to your e-commerce platform and doesn’t see orders.',
        },
      ],
    },
    ctaTitle: 'Start collecting customer feedback in your store',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return buildSolutionMetadata({ locale, slug: SLUG, ...CONTENT[locale].meta });
}

export default async function RetailSolutionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return (
    <SolutionPageLayout
      locale={locale}
      slug={SLUG}
      sector="retail"
      content={CONTENT[locale]}
      illustration={<IllusRetail />}
    />
  );
}
