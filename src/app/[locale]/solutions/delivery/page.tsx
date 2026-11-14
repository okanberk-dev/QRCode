import type { Metadata } from 'next';
import { Filter, Link2, Mail, Sparkles } from 'lucide-react';
import SolutionPageLayout, { type SolutionPageContent } from '@/components/marketing/SolutionPageLayout';
import { buildSolutionMetadata } from '@/lib/solution-schema';
import type { Locale } from '@/lib/translations';
import { IllusDelivery } from '../_components/sector-illustrations';

// ISR: inherits `revalidate = 3600` from `[locale]/layout.tsx`. Reads only
// `params`, so the page stays static. Sector "delivery" drives the platform
// list (Google, Yemeksepeti, Getir, Trendyol GO) and the survey templates.

const SLUG = 'delivery';

const CONTENT: Record<Locale, SolutionPageContent> = {
  tr: {
    name: 'Paket servis',
    meta: {
      title: 'Paket servis için QR ile müşteri geri bildirimi',
      description:
        'Paket servis için poşet QR kodu: müşteri evde puan verir, eşiğin altında önce size yazabilir. Yemeksepeti, Getir, Trendyol GO ve Google bağlantıları tek yerde.',
    },
    eyebrow: 'Paket servis',
    h1: 'Paket servis için QR ile müşteri geri bildirimi ve yorum bağlantıları',
    lead:
      'Müşteri paketini açtığında poşetteki karttan QR kodu okutur ve siparişini puanlar. Eşik ve üzerindeki puanlarda seçtiğiniz platformun yorum sayfası açılır; eşiğin altında müşteri önce size yazabilir, herkese açık yorum bağlantısı aynı ekranda görünür.',
    flow: {
      title: 'Paket siparişte QR ile geri bildirim üç adımda',
      steps: [
        {
          title: 'Her platform için ayrı kart hazırlayın',
          body:
            'Panelde Yemeksepeti, Getir ve Trendyol GO için birer QR kod oluşturup her birini o platforma sabitleyin. Kodlara “YS”, “Getir”, “TGO” gibi etiketler verirseniz geri bildirimin hangi kanaldan geldiğini e-postada görürsünüz.',
        },
        {
          title: 'Müşteri evde puan verir',
          body:
            'Müşteri yemeğini yedikten sonra QR kodu okutur ve 1–5 yıldız verir. Belirlediğiniz eşik ve üzerindeki puanlarda (varsayılan 5 yıldız) kartın sabitlendiği platformun yorum sayfası açılır. Eşiğin altındaki puanlarda müşteri önce size özel geri bildirim yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür.',
        },
        {
          title: 'Sorunu aynı gün konuşun',
          body:
            '1–3 yıldızlık geri bildirimde kart etiketiyle birlikte anında e-posta alırsınız. Soğuk gelen yemek, eksik ürün ya da gecikme gibi şikâyetleri aynı gün mutfak ve kurye ekibinizle konuşabilirsiniz.',
        },
      ],
    },
    placements: {
      title: 'Paket siparişte QR kodu nereye koymalı',
      lead: 'Müşteri QR kodu, yemeğini yedikten sonra da görebileceği bir yerde bulmalı.',
      items: [
        {
          title: 'Poşetin içindeki kart',
          body:
            'Küçük bir teşekkür kartı en sık kullanılan yöntemdir. Kartı fişle birlikte poşete koyun; müşteri paketi açtığında görür ve yemekten sonra okutabilir.',
        },
        {
          title: 'Kap veya kutu etiketi',
          body:
            'Kapağa ya da kutuya yapıştırılan QR etiketi, kart poşette kaybolsa bile ambalajın üzerinde kalır. Ürünle birlikte masaya gelen tek şey çoğu zaman ambalajdır.',
        },
        {
          title: 'Sipariş fişi',
          body:
            'Fişe zımbalanan küçük bir QR etiketi, müşteri siparişini kontrol ederken gözüne çarpar. Eksik ürün şikâyetleri de çoğunlukla bu anda ortaya çıkar.',
        },
        {
          title: 'Gel-al tezgâhı',
          body:
            'Siparişini kendisi alan müşteriler için tezgâhta da bir QR kod bulunsun. Bu koda “Gel-al” gibi ayrı bir etiket verirseniz paket ve gel-al geri bildirimlerini birbirinden ayırırsınız.',
        },
      ],
      tip:
        'Siparişin hangi platformdan geldiğini mutfakta zaten biliyorsunuz. Platforma sabitlenmiş kartları paketleme alanında ayrı kutularda tutarsanız her poşete doğru kartı koymak kolaylaşır.',
    },
    uses: {
      title: 'Paket servis için panelde işinize yarayanlar',
      items: [
        {
          icon: Mail,
          title: 'Şikâyet anında e-postanızda',
          body:
            '1–3 yıldızlık geri bildirimde kart etiketi, puan ve müşterinin yorumu e-postanıza gelir. Akşam yoğunluğunda bile şikâyeti fark eder, müşteri e-posta bıraktıysa aynı gün yazılı yanıt verirsiniz.',
        },
        {
          icon: Filter,
          title: 'Platform kartlarını ayrı izleyin',
          body:
            'Geri bildirimler, QR kodun sabitlendiği platformla birlikte kaydedilir. Gelen kutusunda ve analitikte bir platform seçtiğinizde Getir kartından gelenleri Yemeksepeti kartından gelenlerden ayrı görürsünüz.',
        },
        {
          icon: Link2,
          title: 'Bozuk bağlantıya müşteri gitmez',
          body:
            'Yemeksepeti, Getir ve Trendyol GO bağlantılarınız her gün otomatik olarak test edilir. Son 24 saatte bozuk çıkan bağlantı QR akışında atlanır; çalışan başka bir platform bağlantınız varsa müşteri oraya yönlendirilir.',
        },
        {
          icon: Sparkles,
          title: 'Gecikme şikâyetine yanıt taslağı',
          body:
            'Pulse AI şikâyete 2–4 cümlelik bir yanıt taslağı yazar; özür dileyen tonu seçip taslağı kendi sözlerinizle düzenlersiniz. Siz onaylamadan hiçbir yanıt gönderilmez.',
        },
      ],
    },
    platforms: {
      title: 'Paket serviste öne çıkan yorum platformları',
      lead:
        'Sektör olarak “Paket Servis”i seçtiğinizde panel Google, Yemeksepeti, Getir ve Trendyol GO bağlantılarını gösterir. Bağlantıları bir kez eklersiniz; hangi QR kodun hangi platforma gideceğini siz seçersiniz.',
      note:
        'Buaze teslimat platformlarına bağlanmaz: siparişleri, kurye bilgisini ya da platformdaki puanınızı göremez. Bu platformlarda yorumu genellikle yalnızca o platformdan sipariş veren müşteri yazabildiği için kartı siparişin geldiği platforma sabitlemek en anlamlısıdır. Google’a sabitlenmiş bir kart ise siparişi nereden verirse versin her müşteri için çalışır.',
    },
    questions: {
      title: 'Paket müşterisine ne sormalı',
      lead:
        'Yıldız puanı genel memnuniyeti gösterir. Teslimat sorunlarını ayrıntılı öğrenmek istediğiniz dönemlerde poşete geri bildirim kartı yerine kısa bir anketin QR kodunu koyabilirsiniz.',
      items: [
        { text: 'Siparişiniz söz verilen sürede geldi mi?', type: 'multiple_choice' },
        { text: 'Yemeğiniz size sıcak ulaştı mı?', type: 'multiple_choice' },
        { text: 'Siparişinizde eksik veya yanlış ürün var mıydı?', type: 'multiple_choice' },
        { text: 'Ambalajı nasıl değerlendirirsiniz?', type: 'rating' },
        { text: 'Bir sonraki siparişinizi daha iyi hale getirmek için ne önerirsiniz?', type: 'long_text' },
      ],
      audits: [
        {
          title: 'Günlük mutfak açılış kontrol listesi',
          body: 'Siparişler gelmeye başlamadan önce mutfakta temizlik, ekipman ve hazırlık maddelerini işaretlemek için.',
        },
        {
          title: 'Haftalık derin temizlik denetimi',
          body: 'Mutfak ve paketleme alanının haftalık temizlik kontrolü; sonuç yüzde puan olarak görünür.',
        },
        {
          title: 'F&B yeni eleman temel quiz',
          body: 'Yeni başlayan mutfak ve paketleme personeline hijyen ve müşteri ilişkisinin temellerini sormak için.',
        },
      ],
    },
    faq: {
      title: 'Paket servis için sık sorulan sorular',
      items: [
        {
          q: 'Yemeksepeti, Getir veya Trendyol GO puanımı panelde görebilir miyim?',
          a: 'Hayır. Buaze teslimat platformlarına bağlanmaz; puanınızı, yorumlarınızı ya da siparişlerinizi çekmez. Panelde QR akışından gelen geri bildirimleri ve Google profilinizin özetini görürsünüz.',
        },
        {
          q: 'Tek bir kartla bütün platformlara yönlendirebilir miyim?',
          a: 'Bir QR kod müşteriyi tek bir platforma gönderir: koda sabitlediğiniz platforma ya da varsayılan platformunuza. Siparişleri birden çok uygulamadan alıyorsanız her platform için ayrı kart basın. Varsayılan platformu kullanan kartlarda hedefi panelden değiştirebilirsiniz; belirli bir platforma sabitlenmiş kartın hedefi ise kodun içindedir ve değiştirmek için yeni kart gerekir.',
        },
        {
          q: 'Kurye veya sipariş bazında rapor alabilir miyim?',
          a: 'Hayır. Form sipariş numarası ya da kurye bilgisi toplamaz. Kartlara verdiğiniz etiket, örneğin platform adı ya da şube, düşük puan e-postasında ve geri bildirim CSV dosyasında görünür.',
        },
        {
          q: 'Yorum yapan müşteriye indirim kodu verebilir miyim?',
          a: 'Hayır. Yorum karşılığında indirim, hediye veya ödül vermeyin; Google yorum karşılığı teşviki yasaklar ve Buaze böyle bir özellik sunmaz. Bir şikâyeti telafi etmek için yaptığınız teklif ise yorumdan bağımsız olmalıdır.',
        },
        {
          q: 'Düşük puan veren müşteri platformda yorum yazabilir mi?',
          a: 'Evet. Eşiğin altında puan veren müşteri önce size özel geri bildirim yazabilir; aynı ekranda kartın sabitlendiği platformun yorum bağlantısı görünür ve müşteri isterse oradan herkese açık yorum yazar. Buaze yorum silmez, gizlemez veya değiştirmez.',
        },
        {
          q: 'Müşterinin adresi veya telefonu Buaze’ye gelir mi?',
          a: 'Hayır. Buaze sipariş sisteminize bağlanmaz. Müşteri formda isterse adını ve e-posta adresini bırakır; e-posta bıraktıysa yanıtınızı e-postayla gönderebilirsiniz.',
        },
      ],
    },
    ctaTitle: 'Paket siparişlerinizde geri bildirim toplamaya başlayın',
  },
  en: {
    name: 'Delivery',
    meta: {
      title: 'QR customer feedback for food delivery',
      description:
        'Delivery bag QR cards: customers rate their order at home and can write to you first below your threshold. Yemeksepeti, Getir, Trendyol GO and Google links.',
    },
    eyebrow: 'Delivery',
    h1: 'QR codes for customer feedback and review links in food delivery',
    lead:
      'When customers open their order, they scan the QR code on the card in the bag and rate it. At or above your threshold, your chosen platform’s review page opens; below it, the customer can write to you first, and the public review link is shown on the same screen.',
    flow: {
      title: 'QR feedback for delivery orders in three steps',
      steps: [
        {
          title: 'Make a separate card for each platform',
          body:
            'In the panel, create one QR code each for Yemeksepeti, Getir and Trendyol GO and pin each code to that platform. If you label the codes “YS”, “Getir” and “TGO”, the e-mail tells you which channel the feedback came from.',
        },
        {
          title: 'The customer rates at home',
          body:
            'After eating, the customer scans the QR code and gives 1–5 stars. At or above the threshold you set (5 stars by default), the review page of the platform pinned to that card opens. Below it, the customer can first send you private feedback; the public review link is shown on the same screen.',
        },
        {
          title: 'Talk it through the same day',
          body:
            'Every 1–3★ piece of feedback sends you an instant e-mail with the card label. You can raise complaints such as cold food, missing items or late delivery with your kitchen and courier team the same day.',
        },
      ],
    },
    placements: {
      title: 'Where to put the QR code on delivery orders',
      lead: 'Customers should be able to find the QR code after they have eaten, too.',
      items: [
        {
          title: 'Card inside the bag',
          body:
            'A small thank-you card is the most common choice. Put it in the bag with the receipt; customers see it when they open the order and can scan it after the meal.',
        },
        {
          title: 'Lid or box label',
          body:
            'A QR sticker on the lid or box stays on the packaging even if the card gets lost in the bag. The packaging is often the only thing that reaches the table with the food.',
        },
        {
          title: 'Order receipt',
          body:
            'A small QR sticker stapled to the receipt catches the eye while customers check their order. Complaints about missing items usually come up at exactly that moment.',
        },
        {
          title: 'Collection counter',
          body:
            'Keep a QR code at the counter for customers who collect their own orders. Give it its own label, such as “Pickup”, to tell delivery and collection feedback apart.',
        },
      ],
      tip:
        'Your kitchen already knows which platform each order came from. If you keep the cards pinned to each platform in separate boxes in the packing area, putting the right card in every bag is easy.',
    },
    uses: {
      title: 'Panel features that help a delivery business',
      items: [
        {
          icon: Mail,
          title: 'Complaints reach your inbox at once',
          body:
            'For every 1–3★ piece of feedback, the card label, rating and the customer’s comment arrive by e-mail. Even during the evening rush you notice the complaint, and if the customer left an e-mail address you can reply in writing the same day.',
        },
        {
          icon: Filter,
          title: 'Track each platform’s cards separately',
          body:
            'Feedback is saved with the platform the QR code was pinned to. Pick a platform in the inbox or in analytics to see feedback from the Getir card separately from the Yemeksepeti card.',
        },
        {
          icon: Link2,
          title: 'No customer is sent to a broken link',
          body:
            'Your Yemeksepeti, Getir and Trendyol GO links are tested automatically every day. A link that failed in the last 24 hours is skipped in the QR flow; if you have another working platform link, the customer is sent there instead.',
        },
        {
          icon: Sparkles,
          title: 'Reply drafts for late-delivery complaints',
          body:
            'Pulse AI writes a 2–4 sentence reply draft for the complaint; you choose the apologetic tone and edit the draft in your own words. No reply is sent without your approval.',
        },
      ],
    },
    platforms: {
      title: 'Review platforms that matter for delivery',
      lead:
        'When you pick “Delivery” as your industry, the panel shows Google, Yemeksepeti, Getir and Trendyol GO links. You add the links once and decide which QR code goes to which platform.',
      note:
        'Buaze doesn’t connect to delivery platforms: it can’t see your orders, courier details or your rating there. On these platforms, usually only customers who ordered through them can write a review, so pinning the card to the platform the order came from makes the most sense. A card pinned to Google works for every customer, wherever they ordered.',
    },
    questions: {
      title: 'What to ask delivery customers',
      lead:
        'A star rating shows overall satisfaction. When you want detail on delivery problems for a while, put a short survey’s QR code in the bag instead of the feedback card.',
      items: [
        { text: 'Did your order arrive in the promised time?', type: 'multiple_choice' },
        { text: 'Was your food still hot when it arrived?', type: 'multiple_choice' },
        { text: 'Was anything missing or wrong in your order?', type: 'multiple_choice' },
        { text: 'How would you rate the packaging?', type: 'rating' },
        { text: 'What would make your next order better?', type: 'long_text' },
      ],
      audits: [
        {
          title: 'Daily kitchen opening checklist',
          body: 'For ticking off cleaning, equipment and preparation items in the kitchen before orders start coming in.',
        },
        {
          title: 'Weekly deep-clean inspection',
          body: 'A weekly cleaning check of the kitchen and packing area; the result shows as a percentage score.',
        },
        {
          title: 'F&B new starter basics quiz',
          body: 'Asks new kitchen and packing staff about the basics of hygiene and customer relations.',
        },
      ],
    },
    faq: {
      title: 'Delivery FAQ',
      items: [
        {
          q: 'Can I see my Yemeksepeti, Getir or Trendyol GO rating in the panel?',
          a: 'No. Buaze doesn’t connect to delivery platforms and doesn’t import your rating, reviews or orders. In the panel you see the feedback from your QR flow and a summary of your Google profile.',
        },
        {
          q: 'Can one card send customers to every platform?',
          a: 'A QR code sends the customer to one platform: the one pinned to the code, or your default platform. If you take orders from several apps, print a separate card for each platform. For cards that use the default platform, you can change the destination in the panel; a card pinned to a specific platform has its destination written into the code, so changing it needs a new card.',
        },
        {
          q: 'Can I get reports per courier or per order?',
          a: 'No. The form doesn’t collect order numbers or courier details. The label you give a card, such as the platform name or the branch, shows in the low-rating e-mail and the feedback CSV file.',
        },
        {
          q: 'Can I give a discount code to customers who leave a review?',
          a: 'No. Don’t offer discounts, gifts or rewards in exchange for reviews; Google prohibits incentives for reviews, and Buaze has no such feature. Anything you offer to make up for a complaint must not depend on a review.',
        },
        {
          q: 'Can a customer who gives a low rating still post on the platform?',
          a: 'Yes. A customer who rates below your threshold can first send you private feedback; the review link of the platform pinned to the card is shown on the same screen, and they can post a public review from there if they want. Buaze doesn’t delete, hide or edit reviews.',
        },
        {
          q: 'Does Buaze receive the customer’s address or phone number?',
          a: 'No. Buaze doesn’t connect to your ordering system. Customers can leave their name and e-mail address on the form if they want; if they leave an e-mail address, you can reply by e-mail.',
        },
      ],
    },
    ctaTitle: 'Start collecting feedback on your delivery orders',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return buildSolutionMetadata({ locale, slug: SLUG, ...CONTENT[locale].meta });
}

export default async function DeliverySolutionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return (
    <SolutionPageLayout
      locale={locale}
      slug={SLUG}
      sector="delivery"
      content={CONTENT[locale]}
      illustration={<IllusDelivery />}
    />
  );
}
