import type { Metadata } from 'next';
import { MapPin, MessageCircle, Sparkles, UsersRound } from 'lucide-react';
import SolutionPageLayout, { type SolutionPageContent } from '@/components/marketing/SolutionPageLayout';
import { buildSolutionMetadata } from '@/lib/solution-schema';
import type { Locale } from '@/lib/translations';
import { IllusSalon } from '../_components/sector-illustrations';

// ISR: inherits `revalidate = 3600` from `[locale]/layout.tsx`. Reads only
// `params`, so the page stays static. Sector "spa" drives the platform list
// (Google, Yandex) and the "After the service" survey template.

const SLUG = 'beauty-salon';

const CONTENT: Record<Locale, SolutionPageContent> = {
  tr: {
    name: 'Güzellik salonları',
    meta: {
      title: 'Güzellik salonları için QR ile müşteri yorumları',
      description:
        'Güzellik salonunuz için QR kod: müşteri işlem sonrası puan verir, eşiğin altında önce size yazabilir. Koltuk etiketli QR, Google ve Yandex bağlantıları.',
    },
    eyebrow: 'Güzellik salonları',
    h1: 'Güzellik salonları için QR ile müşteri geri bildirimi ve Google yorumları',
    lead:
      'Müşteri işlemi bittikten sonra ayna kenarındaki ya da kasadaki QR kodu okutur ve hizmeti puanlar. Eşik ve üzerindeki puanlarda Google yorum sayfanız açılır; eşiğin altında müşteri önce size yazabilir, herkese açık yorum bağlantısı aynı ekranda görünür.',
    flow: {
      title: 'Salonda QR ile geri bildirim akışı',
      steps: [
        {
          title: 'Koltuklar ve kasa için QR hazırlayın',
          body:
            'Her koltuk ya da hizmet alanı için ayrı QR oluşturup etiket verebilirsiniz (ör. Koltuk-1, Koltuk-2, Kasa). Etiket düşük puan e-postasında ve geri bildirim CSV dosyasında görünür.',
        },
        {
          title: 'Müşteri puan verir',
          body:
            'Müşteri QR kodu okutur ve 1–5 yıldız verir. Belirlediğiniz eşik ve üzerindeki puanlarda (varsayılan 5 yıldız) Google yorum sayfanız açılır. Eşiğin altındaki puanlarda müşteri önce size özel geri bildirim yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür.',
        },
        {
          title: 'Müşteri ayrılmadan ilgilenin',
          body:
            '1–3 yıldızlık geri bildirimde anında e-posta alırsınız. Müşteri hâlâ salondaysa konuyu yüz yüze konuşabilir; ayrıldıysa ve e-posta adresini bıraktıysa yanıtınızı yazılı gönderirsiniz.',
        },
      ],
    },
    placements: {
      title: 'Salonda QR kodu nereye koymalı',
      lead: 'Müşteri, işlemin sonucunu aynada gördüğü anda en net fikre sahiptir.',
      items: [
        {
          title: 'Ayna kenarı',
          body:
            'Aynanın köşesine yapıştırılan küçük bir QR etiketi işlem biter bitmez görünür. Her koltuğa ayrı etiketli QR koyabilirsiniz.',
        },
        {
          title: 'Kasa ve ödeme tezgâhı',
          body:
            'Ödeme sırasında tezgâhtaki stant, müşteri kartının onaylanmasını beklerken okutulur. Salonun tamamını değerlendirmek için iyi bir andır.',
        },
        {
          title: 'Randevu kartı',
          body:
            'Bir sonraki randevu tarihini yazdığınız karta QR kodu basın. Müşteri, saç boyası ya da cilt bakımı gibi işlemlerin birkaç gün sonraki sonucunu da değerlendirebilir.',
        },
        {
          title: 'Vestiyer veya çıkış kapısı',
          body:
            'Müşterinin ceketini alırken ya da çıkarken gördüğü QR kod, kasada aceleyle geçilen anlar için ikinci bir fırsattır.',
        },
      ],
      tip:
        'Etiket olarak uzman adı yerine koltuk numarası kullanabilirsiniz; ekipte değişiklik olduğunda QR kodları yeniden bastırmanız gerekmez.',
    },
    uses: {
      title: 'Salon panelinde işinize yarayanlar',
      items: [
        {
          icon: UsersRound,
          title: 'Düzenli müşterilerinizi tanıyın',
          body:
            'E-posta bırakan müşteriler müşteri listenize kendiliğinden eklenir; ziyaret sayısı, ortalama puan ve son konu görünür. Liste yeni, risk, VIP, düzenli ve kayıp olmak üzere beş segmente ayrılır.',
        },
        {
          icon: MessageCircle,
          title: 'WhatsApp’tan size yazabilsinler',
          body:
            'Düşük puan veren müşterinin teşekkür ekranında WhatsApp ile iletişime geçme düğmesi gösterebilirsiniz. Düğme, hazır bir mesajla sizin WhatsApp numaranıza sohbet açar; mesajı müşteri gönderir, Buaze göndermez.',
        },
        {
          icon: Sparkles,
          title: 'Yanıt taslağını Pulse AI hazırlar',
          body:
            'Pulse AI 2–4 cümlelik bir yanıt taslağı hazırlar. Sıcak, resmi veya özür dileyen tonu siz seçer, taslağı salonunuzun üslubuna göre düzenlersiniz. Siz onaylamadan hiçbir yanıt gönderilmez.',
        },
        {
          icon: MapPin,
          title: 'Google profilinizin eksiklerini görün',
          body:
            'Google Yorumları sayfasındaki 6 maddelik kontrol listesi telefon, web sitesi, çalışma saatleri, fotoğraflar, işletme durumu ve kategori bilgilerinizden eksik olanları gösterir. Google hesabıyla giriş gerekmez.',
        },
      ],
    },
    platforms: {
      title: 'Güzellik salonlarında öne çıkan yorum platformları',
      lead:
        'Sektör olarak “Güzellik & Spa”yı seçtiğinizde panel Google ve Yandex bağlantılarını gösterir. Müşterileriniz sizi haritada buluyorsa Google yorum sayfanız ana hedeftir.',
      note:
        'Instagram ve Facebook yorum platformu değildir: profil bağlantılarınızı panelde saklayabilirsiniz, ancak QR akışı müşteriyi bu hesaplara göndermez. Yandex bağlantınızı eklerseniz, özel geri bildirim bırakan müşterinin teşekkür ekranında “Yandex Haritalarda paylaş” seçeneği görünür.',
    },
    questions: {
      title: 'Müşterilere ne sormalı',
      lead:
        'Hazır “Hizmet sonrası” şablonu hizmetin kalitesini, uzmanın ilgisini ve salonu yeniden tercih edip etmeyeceklerini sorar. Kendi sorularınızı ekleyerek bekleme süresini veya fiyat bilgilendirmesini de öğrenebilirsiniz.',
      items: [
        { text: 'Hangi hizmeti aldınız?', type: 'multiple_choice' },
        { text: 'İşleminiz randevu saatinizde başladı mı?', type: 'multiple_choice' },
        { text: 'İşlemden önce ne yapılacağı size açıkça anlatıldı mı?', type: 'multiple_choice' },
        { text: 'Salonumuzun temizliğini nasıl değerlendirirsiniz?', type: 'rating' },
        { text: 'Salonumuzu bir arkadaşınıza önerme olasılığınız nedir?', type: 'nps' },
      ],
      audits: [
        {
          title: 'Güzellik salonu hijyen kontrolü',
          body: 'Saç, cilt, kuaför ve manikür işlemleri için günlük ve seans arası hijyen ile sterilizasyon kontrolü.',
        },
        {
          title: 'Haftalık randevu doğruluğu denetimi',
          body: 'Resepsiyonun her hafta randevu kayıtlarını ve gecikmeleri gözden geçirmesi için.',
        },
        {
          title: 'Usta beceri öz-değerlendirme',
          body: 'Kuaför ve uzmanların kendilerini değerlendirip yöneticiyle birlikte gelişim planı yapması için.',
        },
      ],
    },
    faq: {
      title: 'Güzellik salonları için sık sorulan sorular',
      items: [
        {
          q: 'Uzman bazında rapor alabilir miyim?',
          a: 'Hayır, uzman veya hizmet bazında rapor yoktur. Koltuk etiketleri düşük puan e-postasında ve CSV dosyasında görünür; analitik ekranları salonun tamamını gösterir.',
        },
        {
          q: 'Instagram yorumlarını ve mesajlarını panelde görebilir miyim?',
          a: 'Hayır. Buaze Instagram, Facebook ya da başka bir platformdan yorum veya mesaj çekmez. Panelde QR akışından gelen geri bildirimleri ve Google profilinizin özetini görürsünüz.',
        },
        {
          q: 'Randevu programımıza bağlanıyor mu?',
          a: 'Hayır. Buaze randevu yazılımlarına bağlanmaz ve müşterilere kendiliğinden mesaj göndermez. Müşteri QR kodu salondayken ya da randevu kartından okutur.',
        },
        {
          q: 'Yorum yapan müşteriye indirim verebilir miyim?',
          a: 'Yorum karşılığında indirim, hediye veya ücretsiz bakım vermeyin; Google yorum karşılığı teşviki yasaklar ve Buaze böyle bir özellik sunmaz. Anketlerde isteğe bağlı bir teşekkür kuponu gösterebilirsiniz; bu kupon herkese açık yorum yazmaya bağlanmamalıdır.',
        },
        {
          q: 'Düşük puan veren müşteri Google’da yorum yazabilir mi?',
          a: 'Evet. Eşiğin altında puan veren müşteri önce size özel geri bildirim yazabilir; Google yorum bağlantısı aynı ekranda görünür ve müşteri isterse oradan herkese açık yorum yazar. Buaze yorum silmez, gizlemez veya değiştirmez.',
        },
        {
          q: 'Ekibimi panele davet edebilir miyim?',
          a: 'Evet. Ekip üyelerini e-postayla davet edip yönetici, personel veya görüntüleyici rolü verirsiniz; davet 7 gün geçerlidir. Görüntüleyiciler geri bildirimleri görür ama değişiklik yapamaz.',
        },
      ],
    },
    ctaTitle: 'Salonunuzda müşteri geri bildirimi toplamaya başlayın',
  },
  en: {
    name: 'Beauty salons',
    meta: {
      title: 'QR client feedback and reviews for beauty salons',
      description:
        'QR codes for beauty salons: clients rate their treatment and can write to you first below your threshold. Chair-labelled codes plus Google and Yandex links.',
    },
    eyebrow: 'Beauty salons',
    h1: 'QR codes for client feedback and Google reviews at beauty salons',
    lead:
      'When the treatment is done, clients scan the QR code by the mirror or at the front desk and rate the service. At or above your threshold, your Google review page opens; below it, the client can write to you first, and the public review link is shown on the same screen.',
    flow: {
      title: 'How QR feedback works in a salon',
      steps: [
        {
          title: 'Prepare QR codes for chairs and the desk',
          body:
            'Create a separate QR code for each chair or service area and give it a label (for example Chair-1, Chair-2 or Desk). The label shows in the low-rating e-mail and the feedback CSV file.',
        },
        {
          title: 'The client gives a rating',
          body:
            'The client scans the QR code and gives 1–5 stars. At or above the threshold you set (5 stars by default), your Google review page opens. Below it, the client can first send you private feedback; the public review link is shown on the same screen.',
        },
        {
          title: 'Follow up before the client leaves',
          body:
            'Every 1–3★ piece of feedback sends you an instant e-mail. If the client is still in the salon, you can talk it over in person; if they have left and gave an e-mail address, you reply in writing.',
        },
      ],
    },
    placements: {
      title: 'Where to put the QR code in a salon',
      lead: 'Clients have the clearest view the moment they see the result in the mirror.',
      items: [
        {
          title: 'Mirror edge',
          body:
            'A small QR sticker in the corner of the mirror is visible as soon as the treatment ends. You can put a separately labelled code at each chair.',
        },
        {
          title: 'Front desk and payment counter',
          body:
            'A stand on the counter gets scanned while the client waits for the card payment to go through. It is a good moment to rate the salon as a whole.',
        },
        {
          title: 'Appointment card',
          body:
            'Print the QR code on the card where you write the next appointment date. Clients can then rate how a colour or a skin treatment looks a few days later.',
        },
        {
          title: 'Cloakroom or exit',
          body:
            'A QR code clients see as they collect their coat or walk out is a second chance when the payment was rushed.',
        },
      ],
      tip:
        'Use chair numbers rather than staff names as labels; when your team changes, you don’t need to reprint the QR codes.',
    },
    uses: {
      title: 'Panel features that help a salon',
      items: [
        {
          icon: UsersRound,
          title: 'Get to know your regulars',
          body:
            'Clients who leave an e-mail address are added to your customer list automatically, with visit count, average rating and last topic. The list is split into five segments: new, at risk, VIP, loyal and churned.',
        },
        {
          icon: MessageCircle,
          title: 'Let them message you on WhatsApp',
          body:
            'You can show a button for contacting you on WhatsApp on the thank-you screen of clients who give a low rating. It opens a chat with your WhatsApp number and a ready-made message; the client sends the message, not Buaze.',
        },
        {
          icon: Sparkles,
          title: 'Pulse AI drafts the reply',
          body:
            'Pulse AI prepares a 2–4 sentence reply draft; you choose a warm, formal or apologetic tone and edit the draft to sound like you. No reply is sent without your approval.',
        },
        {
          icon: MapPin,
          title: 'See what your Google profile is missing',
          body:
            'The 6-item checklist on the Google Reviews page shows which of your phone, website, opening hours, photos, business status and category details are missing. No Google sign-in needed.',
        },
      ],
    },
    platforms: {
      title: 'Review platforms that matter for beauty salons',
      lead:
        'When you pick “Beauty & Spa” as your industry, the panel shows Google and Yandex links. If clients find you on the map, your Google review page is the main target.',
      note:
        'Instagram and Facebook are not review platforms: you can store your profile links in the panel, but the QR flow doesn’t send clients to those accounts. If you add your Yandex link, clients who leave private feedback also see a “Share on Yandex Maps” option on the thank-you screen.',
    },
    questions: {
      title: 'What to ask your clients',
      lead:
        'The ready-made “After the service” template asks about the quality of the service, the specialist’s care and whether clients would choose you again. Add your own questions to learn about waiting times or how prices were explained.',
      items: [
        { text: 'Which service did you have?', type: 'multiple_choice' },
        { text: 'Did your treatment start at your appointment time?', type: 'multiple_choice' },
        { text: 'Was it clearly explained what would be done before the treatment?', type: 'multiple_choice' },
        { text: 'How would you rate the cleanliness of our salon?', type: 'rating' },
        { text: 'How likely are you to recommend our salon to a friend?', type: 'nps' },
      ],
      audits: [
        {
          title: 'Beauty salon hygiene check',
          body: 'A daily and between-session hygiene and sterilisation check for hair, skin and nail services.',
        },
        {
          title: 'Weekly appointment accuracy audit',
          body: 'For reception to review appointment records and delays every week.',
        },
        {
          title: 'Specialist skills self-assessment',
          body: 'Lets stylists and specialists assess themselves and plan their development with a manager.',
        },
      ],
    },
    faq: {
      title: 'Beauty salon FAQ',
      items: [
        {
          q: 'Can I get reports per specialist?',
          a: 'No, there are no per-specialist or per-service reports. Chair labels show in the low-rating e-mail and the CSV file; the analytics screens cover the whole salon.',
        },
        {
          q: 'Can I see Instagram comments and messages in the panel?',
          a: 'No. Buaze doesn’t import comments or messages from Instagram, Facebook or any other platform. In the panel you see the feedback from your QR flow and a summary of your Google profile.',
        },
        {
          q: 'Does it connect to our booking software?',
          a: 'No. Buaze doesn’t connect to booking software and doesn’t message clients on its own. Clients scan the QR code in the salon or from their appointment card.',
        },
        {
          q: 'Can I give a discount to clients who leave a review?',
          a: 'Don’t offer discounts, gifts or free treatments in exchange for reviews; Google prohibits incentives for reviews, and Buaze has no such feature. Surveys can show an optional thank-you coupon, but it must not be tied to posting a public review.',
        },
        {
          q: 'Can a client who gives a low rating still post on Google?',
          a: 'Yes. A client who rates below your threshold can first send you private feedback; the Google review link is shown on the same screen, and they can post a public review from there if they want. Buaze doesn’t delete, hide or edit reviews.',
        },
        {
          q: 'Can I invite my team to the panel?',
          a: 'Yes. You invite team members by e-mail and give them a manager, staff or viewer role; invitations are valid for 7 days. Viewers can see feedback but can’t make changes.',
        },
      ],
    },
    ctaTitle: 'Start collecting client feedback at your salon',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return buildSolutionMetadata({ locale, slug: SLUG, ...CONTENT[locale].meta });
}

export default async function BeautySalonSolutionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return (
    <SolutionPageLayout
      locale={locale}
      slug={SLUG}
      sector="spa"
      content={CONTENT[locale]}
      illustration={<IllusSalon />}
    />
  );
}
