import type { Metadata } from 'next';
import { BellRing, Mail, UsersRound, UtensilsCrossed } from 'lucide-react';
import SolutionPageLayout, { type SolutionPageContent } from '@/components/marketing/SolutionPageLayout';
import { buildSolutionMetadata } from '@/lib/solution-schema';
import type { Locale } from '@/lib/translations';
import { IllusHotel } from '../_components/sector-illustrations';

// ISR: inherits `revalidate = 3600` from `[locale]/layout.tsx`. Reads only
// `params`, so the page stays static. Sector "hospitality" drives the
// platform list (seven platforms) and the "After the stay" survey template.
// Written for hotels with several outlets (rooms, restaurant, spa); the
// boutique-hotels page covers small, owner-run properties.

const SLUG = 'hotels';

const CONTENT: Record<Locale, SolutionPageContent> = {
  tr: {
    name: 'Oteller',
    meta: {
      title: 'Oteller için QR ile misafir geri bildirimi',
      description:
        'Oteller için oda, restoran ve resepsiyon QR kodu: misafir puan verir, eşiğin altında önce size yazabilir. Google, Tripadvisor ve Booking.com bağlantıları.',
    },
    eyebrow: 'Oteller',
    h1: 'Oteller için QR kodlu misafir geri bildirim sistemi',
    lead:
      'Oda, restoran ve resepsiyondaki QR kodlarla misafir görüşünü konaklama sırasında iletir. Eşik ve üzerindeki puanlarda Google veya Tripadvisor gibi seçtiğiniz platformun yorum sayfası açılır; eşiğin altında misafir önce size yazabilir, herkese açık yorum bağlantısı aynı ekranda görünür.',
    flow: {
      title: 'Otelde QR ile geri bildirim nasıl işler',
      steps: [
        {
          title: 'Her alan için QR oluşturun',
          body:
            'Odalar, restoran, havuz barı ve resepsiyon için ayrı QR kodlar oluşturun; etiket olarak oda numarasını ya da alanın adını yazın (ör. 204, Restoran, Spa). İsterseniz her koda farklı bir yorum platformu sabitleyebilirsiniz.',
        },
        {
          title: 'Misafir puan verir',
          body:
            'Misafir QR kodu okutur ve 1–5 yıldız verir. Belirlediğiniz eşik ve üzerindeki puanlarda (varsayılan 5 yıldız) seçtiğiniz platformun yorum sayfası açılır. Eşiğin altındaki puanlarda misafir önce size özel geri bildirim yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür.',
        },
        {
          title: 'Misafir ilişkileri hemen görsün',
          body:
            'Uyarıların gideceği adresi işletme ayarlarından seçersiniz. Misafir ilişkileri ekibinin adresini yazarsanız 1–3 yıldızlık her geri bildirim, alan etiketiyle birlikte doğrudan onlara gider; misafir otelden ayrılmadan ilgilenebilirsiniz.',
        },
      ],
    },
    placements: {
      title: 'Otelde QR kodu nereye koymalı',
      lead: 'Misafirin bir hizmeti kullandıktan hemen sonra rahatça durduğu yerler en uygun yerlerdir.',
      items: [
        {
          title: 'Oda bilgi dosyası',
          body:
            'Odadaki bilgi dosyasına veya televizyonun yanındaki karta basılan QR kod, misafirin konaklama sırasında yaşadığı bir sorunu ayrılmadan iletmesini sağlar. Oda numarasını etiket olarak kullanın.',
        },
        {
          title: 'Restoran ve bar',
          body:
            'Hesap kapatılırken ya da kahvaltı çıkışında masadaki QR kod, yeme-içme deneyimini ayrı bir etiketle toplar. Restoranınızın kendi Google profili varsa onu ayrı işletme olarak da ekleyebilirsiniz.',
        },
        {
          title: 'Spa, havuz ve ortak alanlar',
          body:
            'Spa resepsiyonundaki ya da havuz barındaki QR kod, bu alanlara özgü geri bildirimleri “Spa” veya “Havuz” etiketiyle ayırır.',
        },
        {
          title: 'Lobi ve çıkış bankosu',
          body:
            'Çıkış işlemi sırasında bankodaki QR kod, konaklamanın tamamını değerlendirmek için doğal bir andır. Transfer beklenirken lobideki bir stant da işe yarar.',
        },
      ],
      tip:
        'Etiket alanına harf, rakam ve kısa çizgi yazılabilir; boşluk ve Türkçe karakter kullanılmaz (ör. 204, Spa, Havuz-Bar). Etiket düşük puan e-postasında ve geri bildirim CSV dosyasında görünür; analitik ekranları ise oteli bütün olarak gösterir.',
    },
    uses: {
      title: 'Otel panelinde işinize yarayanlar',
      items: [
        {
          icon: Mail,
          title: 'Şikâyet doğru ekibe gider',
          body:
            '1–3 yıldızlık geri bildirimde oda veya alan etiketi, puan ve yorum anında e-postayla gelir; panelde de bildirim görünür. Misafir e-posta bıraktıysa yanıtınızı e-postayla gönderirsiniz.',
        },
        {
          icon: UtensilsCrossed,
          title: 'Restoran ve oda servisi için QR Menü',
          body:
            'Otel restoranınızın ya da oda servisinizin menüsünü QR Menü ile yayınlayabilirsiniz; 7 tema, 12 rozet ve 12 alerjen etiketi hazır. Menü tek dilde yayımlanır ve sipariş almaz.',
        },
        {
          icon: UsersRound,
          title: 'Ekip ve erişim',
          body:
            'Ön büro ve misafir ilişkileri ekibini e-postayla davet edin; yönetici, personel veya görüntüleyici rolü verip hangi otellere erişeceklerini seçin. Etkinlik günlüğünde kimin neyi değiştirdiğini görürsünüz.',
        },
        {
          icon: BellRing,
          title: 'Haftalık özet ve puan düşüşü uyarısı',
          body:
            'Geri bildirim gelen haftalarda her pazartesi geçen haftanın özetini e-postayla alırsınız. Son 7 günün ortalama puanı, ondan önceki üç haftanın ortalamasından en az 0,5 yıldız düşükse (her iki dönemde en az 5 geri bildirimle) ayrıca uyarı e-postası gelir.',
        },
      ],
    },
    platforms: {
      title: 'Otellerde öne çıkan yorum platformları',
      lead:
        'Sektör olarak “Otel & Konaklama”yı seçtiğinizde panel yedi platformun bağlantısını gösterir: Google, Tripadvisor, Booking.com, Airbnb, Yelp, Foursquare ve Yandex. Hangi QR kodun hangi platforma gideceğini siz seçersiniz.',
      note:
        'Booking.com ve Airbnb’de yalnızca o platformdan rezervasyon yapan misafirler yorum yazabilir ve davetlerini platformun kendisi gönderir; QR akışında genellikle Google veya Tripadvisor’ı seçmek daha anlamlıdır. Tripadvisor veya Yandex bağlantınızı eklerseniz, özel geri bildirim bırakan misafirin teşekkür ekranında bu platformlarda da paylaşma seçeneği görünür. Buaze rezervasyon sisteminize ya da kanal yöneticinize bağlanmaz.',
    },
    questions: {
      title: 'Misafirlere ne sormalı',
      lead:
        'Hazır “Konaklama sonrası” şablonu oda temizliğini, personelin ilgisini ve tavsiye isteğini sorar. Restoran veya spa için ayrı birer kısa anket hazırlayıp o alanlardaki QR kodlarla paylaşabilirsiniz.',
      items: [
        { text: 'Giriş işleminiz ne kadar sürdü?', type: 'multiple_choice' },
        { text: 'Odanızdaki internet bağlantısını nasıl değerlendirirsiniz?', type: 'rating' },
        { text: 'Konaklamanızın amacı neydi?', type: 'multiple_choice' },
        { text: 'Restoranımızın kahvaltısını nasıl değerlendirirsiniz?', type: 'rating' },
        { text: 'Bir sonraki konaklamanızda neyin farklı olmasını istersiniz?', type: 'long_text' },
      ],
      audits: [
        {
          title: 'Kat hizmetleri günlük açılış kontrolü',
          body: 'Vardiya başında ekip liderinin oda hazırlığını ve temizlik standartlarını işaretlemesi için.',
        },
        {
          title: 'Check-out süreç değerlendirme',
          body: 'Çıkış işlemindeki deneyimi resepsiyon temsilcisinin gözünden değerlendirmek için.',
        },
        {
          title: 'Açık büfe kahvaltı servisi açılış quiz',
          body: 'Kahvaltı servisi açılmadan önce gıda güvenliği ve sunum noktalarını gözden geçirmek için.',
        },
      ],
    },
    faq: {
      title: 'Oteller için sık sorulan sorular',
      items: [
        {
          q: 'Booking.com, Airbnb veya Tripadvisor yorumlarını panelde görebilir miyim?',
          a: 'Hayır. Buaze bu platformlardan yorum çekmez; yorum bağlantılarınızı saklar ve misafiri seçtiğiniz platformun yorum sayfasına gönderir. Panelde QR akışından gelen geri bildirimleri ve Google profilinizin özetini (puan, yorum sayısı ve Google’ın gösterdiği en fazla 5 yorum) görürsünüz.',
        },
        {
          q: 'Oda veya departman bazında rapor alabilir miyim?',
          a: 'Hayır, oda ya da departman bazında rapor yoktur. Oda numarası ve alan etiketleri düşük puan e-postasında ve CSV dosyasında görünür; dosyayı bir tabloda etikete göre sıralayabilirsiniz. Restoran veya spa gibi ayrı tutmak istediğiniz bölümleri ayrı işletme olarak da ekleyebilirsiniz.',
        },
        {
          q: 'Check-out sonrasında misafire otomatik yorum daveti gider mi?',
          a: 'Hayır. Buaze misafirlere SMS, WhatsApp ya da e-postayla yorum daveti göndermez ve otel yönetim sisteminize bağlanmaz. Misafir QR kodu odada, restoranda ya da lobide istediği an okutur.',
        },
        {
          q: 'Yabancı misafirler formu kendi dillerinde görür mü?',
          a: 'Form Türkçe ve İngilizce olarak hazırdır ve misafirin telefon diline göre açılır. Telefonu Almanca ya da Rusça gibi başka bir dile ayarlı olan misafir formu Türkçe görür; başka diller için form yoktur. Pulse AI taslakları da Türkçe veya İngilizce hazırlanır.',
        },
        {
          q: 'Düşük puan veren misafir Tripadvisor’da yorum yazabilir mi?',
          a: 'Evet. Eşiğin altında puan veren misafir önce size özel geri bildirim yazabilir; aynı ekranda seçtiğiniz platformun yorum bağlantısı görünür ve misafir isterse oradan herkese açık yorum yazar. Buaze yorum silmez, gizlemez veya değiştirmez.',
        },
        {
          q: 'Misafir verileri nerede saklanır?',
          a: 'Veritabanı AB’de (Frankfurt) tutulur; e-posta gönderimi ve yapay zekâ gibi bazı hizmet sağlayıcılar ABD’dedir ve Veri İşleyici Sözleşmesi’nde listelenir. Yapay zekâ özellikleri (Pulse AI taslakları, geri bildirim özetleri, analitikteki öne çıkan konular ve haftalık özet e-postası) için geri bildirim metni yapay zekâ sağlayıcımıza (Anthropic, yedek olarak OpenAI) gönderilir; bu özelliklerin işletmeniz için kapatılmasını destek ekibimizden isteyebilirsiniz. Formda ad ve e-posta isteğe bağlıdır, pazarlama izni ayrı ve varsayılan olarak işaretsizdir; IP adresleri 90 gün sonra anonimleştirilir.',
        },
      ],
    },
    ctaTitle: 'Otelinizde misafir geri bildirimi toplamaya başlayın',
  },
  en: {
    name: 'Hotels',
    meta: {
      title: 'Hotel guest feedback system with QR codes',
      description:
        'Hotel room, restaurant and reception QR codes: guests rate the stay and can write to you first below your threshold. Google, Tripadvisor and Booking.com links.',
    },
    eyebrow: 'Hotels',
    h1: 'QR guest feedback system for hotels',
    lead:
      'With QR codes in rooms, the restaurant and reception, guests share their views during their stay. At or above your threshold, the review page of your chosen platform, such as Google or Tripadvisor, opens; below it, the guest can write to you first, and the public review link is shown on the same screen.',
    flow: {
      title: 'How QR feedback works in a hotel',
      steps: [
        {
          title: 'Create a QR code for each area',
          body:
            'Create separate QR codes for rooms, the restaurant, the pool bar and reception, and use the room number or the area’s name as the label (for example 204, Restaurant or Spa). If you like, pin a different review platform to each code.',
        },
        {
          title: 'The guest gives a rating',
          body:
            'The guest scans the QR code and gives 1–5 stars. At or above the threshold you set (5 stars by default), your chosen platform’s review page opens. Below it, the guest can first send you private feedback; the public review link is shown on the same screen.',
        },
        {
          title: 'Guest relations sees it right away',
          body:
            'You choose the alert address in your business settings. Enter your guest relations team’s address and every 1–3★ piece of feedback goes straight to them with the area label, so you can follow up before the guest leaves.',
        },
      ],
    },
    placements: {
      title: 'Where to put the QR code in a hotel',
      lead: 'The best spots are where guests pause comfortably right after using a service.',
      items: [
        {
          title: 'In-room guest directory',
          body:
            'A QR code in the room’s guest directory or on a card by the TV lets guests report a problem during their stay, before they leave. Use the room number as the label.',
        },
        {
          title: 'Restaurant and bar',
          body:
            'A QR code on the table when the bill is settled or on the way out of breakfast collects food and drink feedback under its own label. If your restaurant has its own Google profile, you can also add it as a separate business.',
        },
        {
          title: 'Spa, pool and shared areas',
          body:
            'A QR code at the spa reception or the pool bar keeps feedback about those areas apart with a “Spa” or “Pool” label.',
        },
        {
          title: 'Lobby and checkout desk',
          body:
            'A QR code on the desk during checkout is a natural moment to rate the whole stay. A stand in the lobby also works while guests wait for their transfer.',
        },
      ],
      tip:
        'The label field takes letters, numbers and hyphens, without spaces or accented letters (for example 204, Spa or Pool-Bar). The label shows in the low-rating e-mail and the feedback CSV file; the analytics screens cover the hotel as a whole.',
    },
    uses: {
      title: 'Panel features that help a hotel',
      items: [
        {
          icon: Mail,
          title: 'Complaints reach the right team',
          body:
            'For every 1–3★ piece of feedback, the room or area label, rating and comment arrive by e-mail at once, and a notification appears in the panel. If the guest left an e-mail address, you reply by e-mail.',
        },
        {
          icon: UtensilsCrossed,
          title: 'QR Menu for the restaurant and room service',
          body:
            'Publish your hotel restaurant’s or room service menu with QR Menu; 7 themes, 12 badges and 12 allergen labels are ready to use. The menu is published in one language and doesn’t take orders.',
        },
        {
          icon: UsersRound,
          title: 'Team and access',
          body:
            'Invite your front office and guest relations team by e-mail, give them a manager, staff or viewer role and choose which hotels they can access. The activity log shows who changed what.',
        },
        {
          icon: BellRing,
          title: 'Weekly summary and rating-drop alert',
          body:
            'In weeks with feedback, you receive a summary of the past week by e-mail every Monday. If the last 7 days’ average rating is at least 0.5 stars below the average of the three weeks before (with at least 5 pieces of feedback in each period), you also get an alert e-mail.',
        },
      ],
    },
    platforms: {
      title: 'Review platforms that matter for hotels',
      lead:
        'When you pick “Hotel & Hospitality” as your industry, the panel shows links for seven platforms: Google, Tripadvisor, Booking.com, Airbnb, Yelp, Foursquare and Yandex. You decide which QR code goes to which platform.',
      note:
        'On Booking.com and Airbnb, only guests who booked through that platform can write a review, and the platform sends the invitation itself, so in the QR flow Google or Tripadvisor is usually the better choice. If you add your Tripadvisor or Yandex link, guests who leave private feedback also see the option to share on those platforms on the thank-you screen. Buaze doesn’t connect to your booking system or channel manager.',
    },
    questions: {
      title: 'What to ask your guests',
      lead:
        'The ready-made “After the stay” template asks about room cleanliness, staff care and willingness to recommend. You can build a short survey for the restaurant or spa as well and share it with the QR codes in those areas.',
      items: [
        { text: 'How long did your check-in take?', type: 'multiple_choice' },
        { text: 'How would you rate the internet connection in your room?', type: 'rating' },
        { text: 'What was the purpose of your stay?', type: 'multiple_choice' },
        { text: 'How would you rate breakfast in our restaurant?', type: 'rating' },
        { text: 'What would you like to be different on your next stay?', type: 'long_text' },
      ],
      audits: [
        {
          title: 'Daily housekeeping opening check',
          body: 'For the team leader to tick off room preparation and cleaning standards at the start of each shift.',
        },
        {
          title: 'Check-out process review',
          body: 'Reviews the checkout experience through the eyes of the reception agent.',
        },
        {
          title: 'Buffet breakfast opening quiz',
          body: 'Goes over food safety and presentation points before breakfast service opens.',
        },
      ],
    },
    faq: {
      title: 'Hotel FAQ',
      items: [
        {
          q: 'Can I see Booking.com, Airbnb or Tripadvisor reviews in the panel?',
          a: 'No. Buaze doesn’t import reviews from these platforms; it stores your review links and sends the guest to the review page of the platform you choose. In the panel you see the feedback from your QR flow and a summary of your Google profile (rating, review count and up to 5 reviews Google returns).',
        },
        {
          q: 'Can I get reports per room or department?',
          a: 'No, there are no per-room or per-department reports. Room numbers and area labels show in the low-rating e-mail and the CSV file, which you can sort by label in a spreadsheet. You can also add parts you want to keep separate, such as the restaurant or spa, as separate businesses.',
        },
        {
          q: 'Do guests get an automatic review invitation after checkout?',
          a: 'No. Buaze doesn’t send guests review invitations by SMS, WhatsApp or e-mail, and it doesn’t connect to your property management system. Guests scan the QR code whenever they like, in the room, at the restaurant or in the lobby.',
        },
        {
          q: 'Do international guests see the form in their own language?',
          a: 'The form is available in Turkish and English and opens based on the language of the guest’s phone. Guests whose phone is set to another language, such as German or Russian, see it in Turkish; there is no form in other languages. Pulse AI drafts are written in Turkish or English too.',
        },
        {
          q: 'Can a guest who gives a low rating still post on Tripadvisor?',
          a: 'Yes. A guest who rates below your threshold can first send you private feedback; the review link of your chosen platform is shown on the same screen, and they can post a public review from there if they want. Buaze doesn’t delete, hide or edit reviews.',
        },
        {
          q: 'Where is guest data stored?',
          a: 'The database is kept in the EU (Frankfurt); some service providers, such as e-mail delivery and AI, are in the US and are listed in the data processing agreement. For the AI features (Pulse AI drafts, feedback summaries, the highlighted topics in analytics and the weekly summary e-mail), feedback text is sent to our AI provider (Anthropic, with OpenAI as a backup); you can ask our support team to switch these features off for your business. Name and e-mail are optional on the form, marketing consent is a separate box that is unticked by default, and IP addresses are anonymised after 90 days.',
        },
      ],
    },
    ctaTitle: 'Start collecting guest feedback at your hotel',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return buildSolutionMetadata({ locale, slug: SLUG, ...CONTENT[locale].meta });
}

export default async function HotelsSolutionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return (
    <SolutionPageLayout
      locale={locale}
      slug={SLUG}
      sector="hospitality"
      content={CONTENT[locale]}
      illustration={<IllusHotel />}
    />
  );
}
