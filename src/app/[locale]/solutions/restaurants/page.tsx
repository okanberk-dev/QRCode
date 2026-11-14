import type { Metadata } from 'next';
import { BarChart3, Mail, Sparkles, UtensilsCrossed } from 'lucide-react';
import SolutionPageLayout, { type SolutionPageContent } from '@/components/marketing/SolutionPageLayout';
import { buildSolutionMetadata } from '@/lib/solution-schema';
import type { Locale } from '@/lib/translations';
import { IllusRestaurant } from '../_components/sector-illustrations';

// ISR: inherits `revalidate = 3600` from `[locale]/layout.tsx`. Reads only
// `params`, so the page stays static. Sector "food" drives the platform list
// (SECTOR_PLATFORMS) and the survey templates the layout shows.

const SLUG = 'restaurants';

const CONTENT: Record<Locale, SolutionPageContent> = {
  tr: {
    name: 'Restoranlar ve kafeler',
    meta: {
      title: 'Restoranlar için QR ile Google yorum toplama',
      description:
        'Restoran ve kafeler için masa QR kodu: misafir puan verir, eşiğin altında önce size yazabilir. 1–3 yıldızda masa etiketiyle size anında e-posta gelir.',
    },
    eyebrow: 'Restoranlar ve kafeler',
    h1: 'Restoran ve kafeler için QR ile misafir geri bildirimi ve Google yorumları',
    lead:
      'Misafir hesabı beklerken masadaki QR kodu okutur ve puan verir. Eşik ve üzerindeki puanlarda Google yorum sayfanız açılır; eşiğin altında misafir önce size yazabilir, herkese açık yorum bağlantısı da aynı ekranda görünür.',
    flow: {
      title: 'Restoranda QR ile geri bildirim nasıl işler',
      steps: [
        {
          title: 'Masalara etiketli QR koyun',
          body:
            'Panelde istediğiniz kadar QR kod oluşturun ve her masaya ya da bölüme kısa bir etiket verin (ör. A12, Teras-4, Bar). Kodu PNG olarak indirip masa kartına bastırırsınız.',
        },
        {
          title: 'Misafir puan verir',
          body:
            'Misafir QR kodu okutur ve 1–5 yıldız verir. Belirlediğiniz eşik ve üzerindeki puanlarda (varsayılan 5 yıldız) Google yorum sayfanız ya da QR koda sabitlediğiniz platform açılır. Eşiğin altındaki puanlarda misafir önce size özel geri bildirim yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür.',
        },
        {
          title: 'Servis bitmeden haberdar olun',
          body:
            '1–3 yıldızlık her geri bildirim için masa etiketiyle birlikte anında e-posta alırsınız. Misafir hâlâ restorandaysa sorunu masada çözebilir, e-posta adresini bıraktıysa sonradan yazılı yanıt gönderebilirsiniz.',
        },
      ],
    },
    placements: {
      title: 'Restoranda QR kodu nereye koymalı',
      lead: 'QR kod, misafirin yemeğini bitirdiği ve birkaç dakika beklediği anlara denk gelmeli.',
      items: [
        {
          title: 'Masa kartı veya peçetelik',
          body:
            'Masadaki küçük bir kart, kahve ya da tatlı beklenirken okutulur. Her masaya ayrı etiketli QR koyabilirsiniz; etiket, geri bildirimin hangi masadan geldiğini gösterir.',
        },
        {
          title: 'Hesap sümeni',
          body:
            'Hesap getirildiğinde sümenin içindeki QR kod, ödeme beklenirken puan vermeyi kolaylaştırır. Yemek deneyimini bütünüyle değerlendirmek için en doğal andır.',
        },
        {
          title: 'Tepsi bırakma noktası ve çıkış',
          body:
            'Tezgâhtan servis yapan kafe ve hızlı servis restoranlarında QR kodu tepsi bırakma noktasına ya da çıkış kapısına koyun; misafir yemeğini bitirdikten sonra görür.',
        },
        {
          title: 'Gel-al poşeti',
          body:
            'Paket ve gel-al siparişlerinde poşete eklenen küçük kart, misafirin yemeği yedikten sonra puan vermesini sağlar. Bu kartlara “Paket” gibi ayrı bir etiket verin.',
        },
      ],
      tip:
        'QR oluştururken “Masa numarası” alanına harf, rakam ve kısa çizgi yazabilirsiniz; boşluk ve Türkçe karakter kullanılmaz (ör. A12, Teras-4). Etiket düşük puan e-postasında ve geri bildirim CSV dosyasında görünür. Masa sayınız fazlaysa salon, teras ve bar için birer QR ile başlamak da yeterlidir.',
    },
    uses: {
      title: 'Restoran panelinde işinize yarayanlar',
      items: [
        {
          icon: Mail,
          title: 'Şikâyet masadan e-postanıza',
          body:
            '1–3 yıldızlık geri bildirim geldiğinde masa etiketi, puan ve yorum anında e-postanıza düşer; panelde de bildirim görünür. Uyarıların gideceği adresi işletme ayarlarından seçersiniz.',
        },
        {
          icon: UtensilsCrossed,
          title: 'QR Menü aynı panelde',
          body:
            'Sürükle-bırak menü oluşturucuyla kategori, fiyat, açıklama ve ürün görseli ekleyin; 7 tema, 12 rozet ve 12 alerjen etiketi hazır. Tükenen ürünü tek dokunuşla işaretlersiniz. Menünün kendi QR kodu ve görüntülenme analitiği vardır; menü sipariş almaz.',
        },
        {
          icon: Sparkles,
          title: 'Pulse AI yanıt taslağı',
          body:
            'Şikâyete 2–4 cümlelik bir yanıt taslağı alırsınız; sıcak, resmi veya özür dileyen tonu seçersiniz. Taslağı düzenler ve onaylarsınız; siz onaylamadan hiçbir yanıt gönderilmez.',
        },
        {
          icon: BarChart3,
          title: 'Yoğun saatleri görün',
          body:
            'Analitik ekranındaki gün ve saat haritası geri bildirimlerin hangi saatlerde yoğunlaştığını gösterir. Ortalama puanı, platformlara göre dağılımı ve puanlardan tahmin edilen NPS’i 7, 30 ya da 90 günlük dönemlerle izlersiniz.',
        },
      ],
    },
    platforms: {
      title: 'Restoranlarda öne çıkan yorum platformları',
      lead:
        'Sektör olarak “Restoran & Kafe”yi seçtiğinizde panel sekiz platformun bağlantısını gösterir. Masada oturan misafir için Google yorum sayfanız genellikle ilk tercihtir; turistlerin uğradığı restoranlarda Tripadvisor da önem taşır.',
      note:
        'QR akışında misafir tek bir platforma gönderilir: QR koda sabitlediğiniz platform ya da varsayılan platformunuz. Örneğin salondaki kodları Google’a, terastakileri Tripadvisor’a sabitleyebilirsiniz. Tripadvisor veya Yandex bağlantınızı eklerseniz, özel geri bildirim bırakan misafirin teşekkür ekranında bu platformlarda da paylaşma seçeneği görünür.',
    },
    questions: {
      title: 'Misafirlere ne sormalı',
      lead:
        'Yıldız puanı genel memnuniyeti özetler. Yemek, servis ve bekleme süresini ayrı ayrı öğrenmek için hazır “Masa servisi sonrası” şablonuyla bir anket başlatıp aynı şekilde QR kodla paylaşabilirsiniz.',
      items: [
        { text: 'Bugün hangi öğün için geldiniz?', type: 'multiple_choice' },
        { text: 'Servisin hızını nasıl değerlendirirsiniz?', type: 'rating' },
        { text: 'Fiyatlar aldığınız lezzet ve porsiyonla uyumlu muydu?', type: 'multiple_choice' },
        { text: 'Menüde görmek istediğiniz bir yemek var mı?', type: 'short_text' },
        { text: 'Restoranımızı bir arkadaşınıza önerme olasılığınız nedir?', type: 'nps' },
      ],
      audits: [
        {
          title: 'Günlük mutfak açılış kontrol listesi',
          body: 'Servisten önce mutfak ekibinin temizlik, ekipman ve gıda hazırlığı maddelerini her gün işaretlemesi için.',
        },
        {
          title: 'Haftalık derin temizlik denetimi',
          body: 'Şube müdürünün haftada bir doldurduğu, sonucu yüzde puan olarak gösteren temizlik denetimi.',
        },
        {
          title: 'Servis personeli senaryo testi',
          body: 'Garsonların itiraz, alerji sorusu ve yoğun saat gibi durumlarda nasıl davrandığını ölçen kısa test.',
        },
        {
          title: 'F&B yeni eleman temel quiz',
          body: 'Yeni başlayan servis elemanlarına hijyen ve misafir ilişkisinin temellerini sormak için.',
        },
      ],
    },
    faq: {
      title: 'Restoranlar için sık sorulan sorular',
      items: [
        {
          q: 'Masa bazında rapor alabilir miyim?',
          a: 'Hayır, analitik ekranları restoranın tamamını gösterir. Masa etiketi düşük puan e-postasında ve geri bildirim CSV dosyasında yer alır; dosyayı bir tabloda masaya göre sıralayabilirsiniz.',
        },
        {
          q: 'Yemeksepeti veya Getir yorumlarımı panelde görebilir miyim?',
          a: 'Hayır. Buaze bu platformlardan yorum çekmez; yalnızca yorum bağlantılarınızı saklar ve misafiri seçtiğiniz platformun yorum sayfasına gönderir. Panelde QR akışından gelen geri bildirimleri ve Google profilinizin özetini (puan, yorum sayısı ve Google’ın gösterdiği en fazla 5 yorum) görürsünüz.',
        },
        {
          q: 'Düşük puan veren misafir Google’da yorum yazabilir mi?',
          a: 'Evet. Eşiğin altında puan veren misafir önce size özel geri bildirim yazabilir; Google yorum bağlantısı aynı ekranda görünür ve misafir isterse oradan herkese açık yorum yazar. Buaze yorum silmez, gizlemez veya değiştirmez.',
        },
        {
          q: 'Yorum yapan misafire ikram verebilir miyim?',
          a: 'Yorum karşılığında ikram, indirim veya hediye vermeyin; Google yorum karşılığı teşviki yasaklar ve Buaze böyle bir özellik sunmaz. Anketlerde isteğe bağlı bir teşekkür kuponu gösterebilirsiniz; bu kupon herkese açık yorum yazmaya bağlanmamalıdır.',
        },
        {
          q: 'QR Menü kodu ile geri bildirim QR kodu aynı mı?',
          a: 'Hayır, iki ayrı QR koddur. Menü QR’ı menünüzü açar, geri bildirim QR’ı puan ekranını açar. İkisini aynı masa kartına yan yana basabilirsiniz.',
        },
        {
          q: 'Birden çok şubemiz var, nasıl yönetiriz?',
          a: 'Her şubeyi ayrı işletme olarak eklersiniz. İşletmeler tablosunda şubelerin son 30 günlük yorum sayısını, ortalama puanını, bekleyen düşük puanlarını ve bağlantı sağlığını yan yana görürsünüz. Şube müdürlerine yalnızca kendi şubelerine erişim verebilirsiniz.',
        },
        {
          q: 'Turist misafirler formu hangi dilde görür?',
          a: 'Form, misafirin telefon diline göre Türkçe veya İngilizce açılır; telefonu başka bir dile ayarlı olan misafir formu Türkçe görür. Pulse AI taslakları da Türkçe veya İngilizce hazırlanır.',
        },
      ],
    },
    ctaTitle: 'Restoranınızda misafir geri bildirimi toplamaya başlayın',
  },
  en: {
    name: 'Restaurants and cafés',
    meta: {
      title: 'Collect Google reviews for restaurants with QR',
      description:
        'Table QR codes for restaurants and cafés: guests rate their visit, and below your threshold they can write to you first. Every 1–3★ rating e-mails you.',
    },
    eyebrow: 'Restaurants and cafés',
    h1: 'QR codes for guest feedback and Google reviews at restaurants and cafés',
    lead:
      'While they wait for the bill, guests scan the QR code on the table and give a rating. At or above your threshold, your Google review page opens; below it, the guest can write to you first, and the public review link is shown on the same screen.',
    flow: {
      title: 'How QR feedback works in a restaurant',
      steps: [
        {
          title: 'Put labelled QR codes on your tables',
          body:
            'Create as many QR codes as you need in the panel and give each table or area a short label (for example A12, Terrace-4 or Bar). Download the code as a PNG and print it on a table card.',
        },
        {
          title: 'The guest gives a rating',
          body:
            'The guest scans the QR code and gives 1–5 stars. At or above the threshold you set (5 stars by default), your Google review page or the platform pinned to that QR code opens. Below it, the guest can first send you private feedback; the public review link is shown on the same screen.',
        },
        {
          title: 'Hear about it before service ends',
          body:
            'Every 1–3★ piece of feedback sends you an instant e-mail with the table label. If the guest is still there, you can sort it out at the table; if they left an e-mail address, you can reply in writing later.',
        },
      ],
    },
    placements: {
      title: 'Where to put the QR code in a restaurant',
      lead: 'The QR code should meet guests when they have finished eating and have a few minutes to wait.',
      items: [
        {
          title: 'Table card or napkin holder',
          body:
            'A small card on the table gets scanned while guests wait for coffee or dessert. You can put a separately labelled QR code on each table; the label shows which table the feedback came from.',
        },
        {
          title: 'Bill folder',
          body:
            'A QR code inside the bill folder makes it easy to rate the visit while waiting to pay. It is the most natural moment to look back on the whole meal.',
        },
        {
          title: 'Tray return and exit',
          body:
            'In counter-service cafés and quick-service restaurants, put the QR code at the tray return or by the exit, where guests see it after they have eaten.',
        },
        {
          title: 'Takeaway bag',
          body:
            'For takeaway and collection orders, a small card in the bag lets guests rate the food after they have eaten it. Give these cards their own label, such as “Takeaway”.',
        },
      ],
      tip:
        'When you create a QR code, the “Table number” field takes letters, numbers and hyphens, without spaces or accented letters (for example A12 or Terrace-4). The label appears in the low-rating e-mail and in the feedback CSV file. If you have many tables, one code each for the dining room, terrace and bar is a good start.',
    },
    uses: {
      title: 'Panel features that help a restaurant',
      items: [
        {
          icon: Mail,
          title: 'Complaints go straight to your inbox',
          body:
            'When a 1–3★ piece of feedback arrives, the table label, rating and comment land in your e-mail instantly, and a notification appears in the panel. You choose the alert address in your business settings.',
        },
        {
          icon: UtensilsCrossed,
          title: 'QR Menu in the same panel',
          body:
            'Add categories, prices, descriptions and product photos with the drag-and-drop menu builder; 7 themes, 12 badges and 12 allergen labels are ready to use. Mark an item as sold out with one tap. The menu has its own QR code and view analytics; it doesn’t take orders.',
        },
        {
          icon: Sparkles,
          title: 'Pulse AI reply drafts',
          body:
            'You get a 2–4 sentence reply draft for a complaint and choose a warm, formal or apologetic tone. You edit and approve the draft; no reply is sent without your approval.',
        },
        {
          icon: BarChart3,
          title: 'See your busy hours',
          body:
            'The day-and-hour map on the analytics screen shows when feedback comes in. You follow your average rating, the split across platforms and the NPS estimated from ratings over 7, 30 or 90 days.',
        },
      ],
    },
    platforms: {
      title: 'Review platforms that matter for restaurants',
      lead:
        'When you pick “Restaurant & Café” as your industry, the panel shows links for eight platforms. For guests at the table, your Google review page is usually the first choice; in restaurants that tourists visit, Tripadvisor matters too.',
      note:
        'In the QR flow the guest is sent to one platform: the one pinned to the QR code, or your default platform. For example, you can pin the dining-room codes to Google and the terrace codes to Tripadvisor. If you add your Tripadvisor or Yandex link, guests who leave private feedback also see the option to share on those platforms on the thank-you screen.',
    },
    questions: {
      title: 'What to ask your guests',
      lead:
        'A star rating sums up overall satisfaction. To learn about the food, service and waiting time separately, start a survey from the ready-made “After table service” template and share it the same way, with a QR code.',
      items: [
        { text: 'Which meal did you come for today?', type: 'multiple_choice' },
        { text: 'How would you rate the speed of service?', type: 'rating' },
        { text: 'Did the prices match the taste and portion size?', type: 'multiple_choice' },
        { text: 'Is there a dish you would like to see on the menu?', type: 'short_text' },
        { text: 'How likely are you to recommend our restaurant to a friend?', type: 'nps' },
      ],
      audits: [
        {
          title: 'Daily kitchen opening checklist',
          body: 'For the kitchen team to tick off cleaning, equipment and food preparation items every day before service.',
        },
        {
          title: 'Weekly deep-clean inspection',
          body: 'A cleaning inspection the branch manager fills in once a week, with the result shown as a percentage score.',
        },
        {
          title: 'Service staff scenario test',
          body: 'A short test of how waiting staff handle complaints, allergy questions and busy periods.',
        },
        {
          title: 'F&B new starter basics quiz',
          body: 'Asks new service staff about the basics of hygiene and guest relations.',
        },
      ],
    },
    faq: {
      title: 'Restaurant FAQ',
      items: [
        {
          q: 'Can I get reports per table?',
          a: 'No, the analytics screens cover the whole restaurant. The table label is included in the low-rating e-mail and the feedback CSV file, so you can sort the file by table in a spreadsheet.',
        },
        {
          q: 'Can I see my Yemeksepeti or Getir reviews in the panel?',
          a: 'No. Buaze doesn’t import reviews from these platforms; it only stores your review links and sends the guest to the review page of the platform you choose. In the panel you see the feedback from your QR flow and a summary of your Google profile (rating, review count and up to 5 reviews Google returns).',
        },
        {
          q: 'Can a guest who gives a low rating still post on Google?',
          a: 'Yes. A guest who rates below your threshold can first send you private feedback; the Google review link is shown on the same screen, and they can post a public review from there if they want. Buaze doesn’t delete, hide or edit reviews.',
        },
        {
          q: 'Can I offer guests something for leaving a review?',
          a: 'Don’t offer treats, discounts or gifts in exchange for reviews; Google prohibits incentives for reviews, and Buaze has no such feature. Surveys can show an optional thank-you coupon, but it must not be tied to posting a public review.',
        },
        {
          q: 'Is the QR Menu code the same as the feedback QR code?',
          a: 'No, they are two separate QR codes. The menu QR code opens your menu; the feedback QR code opens the rating screen. You can print both side by side on the same table card.',
        },
        {
          q: 'We have several branches. How do we manage them?',
          a: 'You add each branch as a separate business. The businesses table shows each branch’s last-30-day review count, average rating, pending low ratings and link health side by side. You can give branch managers access to their own branch only.',
        },
        {
          q: 'Which language do tourists see on the form?',
          a: 'The form opens in Turkish or English, based on the language of the guest’s phone; guests whose phone is set to another language see it in Turkish. Pulse AI drafts are written in Turkish or English too.',
        },
      ],
    },
    ctaTitle: 'Start collecting guest feedback at your restaurant',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return buildSolutionMetadata({ locale, slug: SLUG, ...CONTENT[locale].meta });
}

export default async function RestaurantsSolutionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return (
    <SolutionPageLayout
      locale={locale}
      slug={SLUG}
      sector="food"
      content={CONTENT[locale]}
      illustration={<IllusRestaurant />}
    />
  );
}
