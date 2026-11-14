import type { Metadata } from 'next';
import { Languages, Link2, MapPin, Sparkles } from 'lucide-react';
import SolutionPageLayout, { type SolutionPageContent } from '@/components/marketing/SolutionPageLayout';
import { IllusBoutique } from '@/components/marketing/solution-illustrations';
import { buildSolutionMetadata } from '@/lib/solution-schema';
import type { Locale } from '@/lib/translations';

// ISR: inherits `revalidate = 3600` from `[locale]/layout.tsx` (CLAUDE.md
// §38.163). No request-time APIs here, so the page stays static.

const SLUG = 'boutique-hotels';

const CONTENT: Record<Locale, SolutionPageContent> = {
  tr: {
    name: 'Butik oteller',
    meta: {
      title: 'Butik oteller için QR ile misafir geri bildirimi',
      description:
        'Butik oteliniz için QR kod: misafir odadan puan verir, eşiğin altında önce size yazabilir. Google, Tripadvisor ve Booking.com bağlantıları tek panelde.',
    },
    eyebrow: 'Butik oteller',
    h1: 'Butik oteller için QR ile misafir geri bildirimi ve yorum toplama',
    lead:
      'Butik otelde misafirle çoğu zaman siz ya da küçük bir ekip ilgilenir. Odadaki QR kod, misafirin bir sorunu konaklama sırasında size iletmesini kolaylaştırır; eşik ve üzerindeki puanlarda seçtiğiniz platformun yorum sayfası açılır.',
    flow: {
      title: 'Butik otelde QR ile geri bildirim akışı',
      steps: [
        {
          title: 'Oda ve ortak alan QR kodlarını hazırlayın',
          body:
            'Panelde her oda için ayrı bir QR kod oluşturabilir, “Masa numarası” alanına oda numarasını yazabilirsiniz. Her QR koda Google ya da Tripadvisor gibi farklı bir yorum platformu da sabitleyebilirsiniz.',
        },
        {
          title: 'Misafir puan verir',
          body:
            'Misafir QR kodu okutup 1–5 yıldız verir. Belirlediğiniz eşik ve üzerindeki puanlarda (varsayılan 5 yıldız) QR koda sabitlenen ya da varsayılan platformunuzun yorum sayfası açılır. Eşiğin altında misafir önce size özel geri bildirim yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür.',
        },
        {
          title: 'Misafir ayrılmadan ilgilenin',
          body:
            '1–3 yıldızlık geri bildirimde oda etiketiyle birlikte anında e-posta alırsınız. Sorunu konaklama bitmeden ele alabilir, misafir e-posta bıraktıysa yanıtınızı e-postayla gönderebilirsiniz.',
        },
      ],
    },
    placements: {
      title: 'Butik otelde QR kodu nereye koymalı',
      lead: 'Misafirin rahat olduğu ve acele etmediği yerler QR kod için en uygun yerlerdir.',
      items: [
        {
          title: 'Odadaki karşılama kartı',
          body:
            'Başucuna ya da masaya bıraktığınız karşılama kartına QR kodu ekleyin. Misafir odaya yerleştikten sonra ya da konaklama sırasında puan verebilir.',
        },
        {
          title: 'Kahvaltı salonu',
          body:
            'Kahvaltı masalarındaki küçük bir stant, kahvaltı ve servisle ilgili görüşleri toplar. Oda numarası yerine “Kahvalti” gibi bir etiket kullanabilirsiniz; etikette Türkçe karakter kullanılmaz.',
        },
        {
          title: 'Resepsiyon ve çıkış işlemi',
          body:
            'Hesap kapatılırken resepsiyondaki QR kod, konaklamanın tamamını değerlendirmek için doğal bir an yaratır.',
        },
        {
          title: 'Anahtar kartı kılıfı',
          body:
            'Anahtar kartının kılıfına basılan QR kod konaklama boyunca misafirin yanında olur ve her girişte yeniden görünür.',
        },
      ],
      tip:
        'Oda numarasını QR oluştururken “Masa numarası” alanına yazarsanız etiket düşük puan e-postasında ve CSV dosyasında görünür; hangi odada sorun yaşandığını hemen bilirsiniz.',
    },
    uses: {
      title: 'Küçük bir otel ekibine yarayan panel özellikleri',
      items: [
        {
          icon: Languages,
          title: 'Türkçe ve İngilizce',
          body:
            'Form misafirin telefon diline göre Türkçe veya İngilizce açılır. Pulse AI yabancı misafirlerinize İngilizce yanıt taslağı da hazırlar; başka dillerde taslak üretmez.',
        },
        {
          icon: Sparkles,
          title: 'Yanıt taslağı Pulse AI’dan',
          body:
            'Pulse AI geri bildirime göre 2–4 cümlelik bir taslak yazar; sıcak, resmi veya özür dileyen tonu seçersiniz. Taslağı kendi üslubunuza göre düzenler ve onaylarsınız.',
        },
        {
          icon: MapPin,
          title: 'Google profil kontrol listesi',
          body:
            'Google Yorumları sayfasında puanınızı, yorum sayınızı ve telefon, web sitesi, çalışma saatleri, fotoğraflar gibi 6 maddelik kontrol listesini görürsünüz. Profilinizde yeterli fotoğraf olup olmadığını buradan anlarsınız.',
        },
        {
          icon: Link2,
          title: 'Bağlantı kontrolleri',
          body:
            'Tripadvisor, Booking.com ve diğer yorum bağlantılarınız her gün otomatik olarak test edilir. Son 24 saatte bozuk çıkan bir bağlantı müşteri akışında atlanır.',
        },
      ],
    },
    platforms: {
      title: 'Butik otellerde öne çıkan yorum platformları',
      lead:
        'Kurulumda “Otel & Konaklama” sektörünü seçtiğinizde panel yedi platformun bağlantısını gösterir. Çoğu butik otel için Google ve Tripadvisor iyi bir başlangıçtır.',
      note:
        'Booking.com ve Airbnb’de yalnızca o platform üzerinden konaklayan misafirler yorum yazabilir; yorum davetini de bu platformlar kendileri gönderir. Bu yüzden QR akışında Google veya Tripadvisor’ı seçmek genellikle daha anlamlıdır.',
    },
    questions: {
      title: 'Misafirlere ne sormalı',
      lead:
        'Yıldız puanı konaklamanın bütününü özetler. Oda, kahvaltı ve personel gibi başlıkları ayrı ayrı öğrenmek için hazır “Konaklama sonrası” şablonundan başlayabilirsiniz.',
      items: [
        { text: 'Odanızın sessizliğini ve uyku konforunu nasıl değerlendirirsiniz?', type: 'rating' },
        { text: 'Kahvaltıyı nasıl değerlendirirsiniz?', type: 'rating' },
        { text: 'Otelimizi nereden buldunuz?', type: 'multiple_choice' },
        { text: 'Konaklamanızdan aklınızda en çok ne kaldı?', type: 'short_text' },
        { text: 'Otelimizi arkadaşlarınıza önerme olasılığınız nedir?', type: 'nps' },
      ],
      audits: [
        {
          title: 'Kat hizmetleri günlük açılış kontrolü',
          body: 'Vardiya başında oda hazırlığını ve temizlik standartlarını kontrol etmek için.',
        },
        {
          title: 'Check-out süreç değerlendirme',
          body: 'Misafirin ayrılırken yaşadığı deneyimi resepsiyon gözünden değerlendirmek için.',
        },
        {
          title: 'Açık büfe kahvaltı servisi açılış quiz',
          body: 'Kahvaltı servisinden önce gıda güvenliği ve sunum kontrol noktalarını gözden geçirmek için.',
        },
        {
          title: 'Otel resepsiyon — temel eğitim quiz',
          body: 'Yeni resepsiyon görevlileri için giriş işlemi ve misafir itirazı senaryoları.',
        },
      ],
    },
    privacy: {
      title: 'Misafir verileri ve KVKK',
      paragraphs: [
        'Formda ad ve e-posta isteğe bağlıdır; misafir yalnızca yanıt almak isterse e-posta bırakır. Form gönderilirken KVKK aydınlatma onayı alınır; pazarlama izni ayrıdır ve varsayılan olarak işaretsizdir. IP adresleri 90 gün sonra anonimleştirilir.',
        'Buaze rezervasyon sisteminize bağlanmaz ve misafir listenizi almaz. Veritabanı AB’de (Frankfurt) tutulur; e-posta gönderimi ve yapay zekâ gibi bazı hizmet sağlayıcılar ABD’dedir ve Veri İşleyici Sözleşmesi’nde listelenir. Yapay zekâ özellikleri (Pulse AI taslakları, geri bildirim özetleri, analitikteki öne çıkan konular ve haftalık özet e-postası) için geri bildirim metni OpenAI’a gönderilir; bu özelliklerin işletmeniz için kapatılmasını destek ekibimizden isteyebilirsiniz.',
      ],
    },
    faq: {
      title: 'Butik oteller için sık sorulan sorular',
      items: [
        {
          q: 'Booking.com ve Airbnb yorumlarını Buaze’ye aktarabilir miyim?',
          a: 'Hayır. Buaze hiçbir platformun yorumlarını gelen kutunuza aktarmaz; yalnızca yorum bağlantılarınızı yönetir ve misafiri seçtiğiniz platformun yorum sayfasına gönderir. Booking.com ve Airbnb’de yorum yazabilmek için misafirin o platform üzerinden konaklamış olması gerekir.',
        },
        {
          q: 'Oda bazında rapor alabilir miyim?',
          a: 'Hayır, oda bazında rapor yoktur. Oda numarasını QR etiketi olarak eklerseniz düşük puan e-postasında ve CSV dosyasında görünür; analitik ekranları otelin tamamını gösterir.',
        },
        {
          q: 'Konaklama sırasında misafire otomatik geri bildirim isteği gider mi?',
          a: 'Hayır. Buaze misafirlere mesaj göndermez ve zamanlanmış gönderim yapmaz. Misafir odadaki QR kodu istediği an okutabildiği için konaklama sırasında da geri bildirim alabilirsiniz.',
        },
        {
          q: 'Yabancı misafirler formu kendi dillerinde görür mü?',
          a: 'Form Türkçe ve İngilizce olarak hazırdır ve misafirin telefon diline göre açılır. Telefonu bu iki dil dışında bir dile ayarlı olan misafir formu Türkçe görür.',
        },
        {
          q: 'Düşük puan veren misafir Tripadvisor’da yorum yazabilir mi?',
          a: 'Evet. Eşiğin altında puan veren misafir önce size özel olarak yazabilir; aynı ekranda seçtiğiniz platformun yorum bağlantısı görünür. Tripadvisor bağlantınızı eklediyseniz teşekkür ekranında “Tripadvisor’da da paylaş” seçeneği de çıkar.',
        },
        {
          q: 'Birden çok otelimiz var; aynı hesaptan yönetebilir miyim?',
          a: 'Evet. Her oteli ayrı işletme olarak eklersiniz; işletme seçiciyle aralarında geçer, işletmeler tablosunda son 30 günün yorum sayısını ve puanını yan yana görürsünüz. Instagram, Facebook veya WhatsApp bağlantınızı diğer otellerinize tek seferde uygulayabilirsiniz.',
        },
      ],
    },
    ctaTitle: 'Butik otelinizde misafir geri bildirimi toplamaya başlayın',
  },
  en: {
    name: 'Boutique hotels',
    meta: {
      title: 'QR guest feedback and reviews for boutique hotels',
      description:
        'QR codes for boutique hotels: guests rate their stay from the room and, below your threshold, can write to you first. Google and Tripadvisor links in one panel.',
    },
    eyebrow: 'Boutique hotels',
    h1: 'QR codes for guest feedback and reviews at boutique hotels',
    lead:
      'In a boutique hotel, guests are usually looked after by you or a small team. A QR code in the room makes it easy for guests to raise a problem during their stay; ratings at or above your threshold open your chosen platform’s review page.',
    flow: {
      title: 'The QR feedback flow at a boutique hotel',
      steps: [
        {
          title: 'Prepare QR codes for rooms and shared areas',
          body:
            'Create a separate QR code for each room in the panel and type the room number in the “Table number” field. You can also pin a different review platform, such as Google or Tripadvisor, to each QR code.',
        },
        {
          title: 'The guest gives a rating',
          body:
            "The guest scans the QR code and gives 1–5 stars. At or above the threshold you set (5 stars by default), the review page of the platform pinned to the QR code, or of your default platform, opens. Below it, the guest can first send you private feedback; the public review link is shown on the same screen.",
        },
        {
          title: 'Act before the guest leaves',
          body:
            'A 1–3★ rating sends you an instant e-mail with the room label. You can deal with the problem before the stay ends, and if the guest left an e-mail address, reply by e-mail.',
        },
      ],
    },
    placements: {
      title: 'Where to put the QR code in a boutique hotel',
      lead: 'The best spots are the ones where guests are relaxed and not in a hurry.',
      items: [
        {
          title: 'Welcome card in the room',
          body:
            'Add the QR code to the welcome card you leave on the bedside table or desk. Guests can rate their stay once they have settled in, or at any point during it.',
        },
        {
          title: 'Breakfast room',
          body:
            'A small stand on the breakfast tables collects feedback on breakfast and service. Use a “Breakfast” label instead of a room number.',
        },
        {
          title: 'Reception and check-out',
          body:
            'A QR code at reception, while the bill is settled, is a natural moment to rate the whole stay.',
        },
        {
          title: 'Key card sleeve',
          body:
            'A QR code printed on the key card sleeve stays with the guest for the whole stay and comes into view every time they return.',
        },
      ],
      tip:
        'If you type the room number in the “Table number” field when creating a QR code, the label shows in the low-rating e-mail and the CSV file, so you know straight away which room had a problem.',
    },
    uses: {
      title: 'Panel features that help a small hotel team',
      items: [
        {
          icon: Languages,
          title: 'Turkish and English',
          body:
            "The form opens in Turkish or English, based on the language of the guest’s phone. Pulse AI also drafts replies in English for international guests; it doesn’t write drafts in other languages.",
        },
        {
          icon: Sparkles,
          title: 'Reply drafts from Pulse AI',
          body:
            'Pulse AI writes a 2–4 sentence draft based on the feedback, and you choose a warm, formal or apologetic tone. You adjust it to your own voice and approve it.',
        },
        {
          icon: MapPin,
          title: 'Google profile checklist',
          body:
            'The Google Reviews page shows your rating, review count and a 6-item checklist covering phone, website, opening hours, photos and more. It tells you whether your profile has enough photos.',
        },
        {
          icon: Link2,
          title: 'Link checks',
          body:
            'Your Tripadvisor, Booking.com and other review links are tested automatically every day. A link that failed in the last 24 hours is skipped in the customer flow.',
        },
      ],
    },
    platforms: {
      title: 'Review platforms that matter for boutique hotels',
      lead:
        'When you pick “Hotel & Hospitality” at setup, the panel shows links for seven platforms. For most boutique hotels, Google and Tripadvisor are a good place to start.',
      note:
        'On Booking.com and Airbnb, only guests who stayed through that platform can write a review, and those platforms send the review invitation themselves. That is why Google or Tripadvisor is usually the better choice for the QR flow.',
    },
    questions: {
      title: 'What to ask guests',
      lead:
        'A star rating sums up the whole stay. To learn about the room, breakfast and staff one by one, start from the ready-made “After the stay” template.',
      items: [
        { text: 'How would you rate how quiet and comfortable your room was for sleeping?', type: 'rating' },
        { text: 'How would you rate breakfast?', type: 'rating' },
        { text: 'How did you find our hotel?', type: 'multiple_choice' },
        { text: 'What stayed with you most from your stay?', type: 'short_text' },
        { text: 'How likely are you to recommend our hotel to friends?', type: 'nps' },
      ],
      audits: [
        {
          title: 'Daily housekeeping opening check',
          body: 'Checks room preparation and cleaning standards at the start of each shift.',
        },
        {
          title: 'Check-out process review',
          body: 'Reviews the guest’s departure experience from the reception desk’s point of view.',
        },
        {
          title: 'Buffet breakfast opening quiz',
          body: 'Goes through food safety and presentation checkpoints before breakfast service.',
        },
        {
          title: 'Hotel reception basic training quiz',
          body: 'Check-in and guest complaint scenarios for new receptionists.',
        },
      ],
    },
    privacy: {
      title: 'Guest data and KVKK',
      paragraphs: [
        'Name and e-mail are optional on the form; guests leave an e-mail address only if they want a reply. The form records the KVKK privacy notice acknowledgement; marketing consent is separate and unticked by default. IP addresses are anonymised after 90 days.',
        "Buaze doesn’t connect to your booking system or take your guest list. The database is kept in the EU (Frankfurt); some service providers, such as e-mail delivery and AI, are in the US and are listed in the data processing agreement. For the AI features (Pulse AI drafts, feedback summaries, the highlighted topics in analytics and the weekly summary e-mail), feedback text is sent to OpenAI; you can ask our support team to switch these features off for your business.",
      ],
    },
    faq: {
      title: 'Boutique hotel FAQ',
      items: [
        {
          q: 'Can I import my Booking.com and Airbnb reviews into Buaze?',
          a: "No. Buaze doesn’t bring reviews from any platform into your inbox; it manages your review links and sends the guest to the review page of the platform you choose. To review on Booking.com or Airbnb, a guest must have stayed through that platform.",
        },
        {
          q: 'Can I get reports per room?',
          a: 'No, there are no per-room reports. If you add the room number as a QR label, it shows in the low-rating e-mail and the CSV file; the analytics screens cover the whole hotel.',
        },
        {
          q: 'Do guests get an automatic feedback request during their stay?',
          a: "No. Buaze doesn’t send messages to guests and has no scheduled sending. Guests can scan the QR code in the room whenever they like, so you can get feedback during the stay too.",
        },
        {
          q: 'Do international guests see the form in their own language?',
          a: "The form is available in Turkish and English and opens in the language of the guest’s phone. Guests whose phones are set to another language see it in Turkish.",
        },
        {
          q: 'Can a guest who gives a low rating still post on Tripadvisor?',
          a: 'Yes. A guest who rates below your threshold can first write to you privately; the review link of your chosen platform is shown on the same screen. If you added your Tripadvisor link, a “Share on Tripadvisor” option also appears on the thank-you screen.',
        },
        {
          q: 'We run several hotels. Can I manage them from one account?',
          a: 'Yes. You add each hotel as a separate business, switch between them with the business switcher and compare last-30-day review counts and ratings in the businesses table. You can apply your Instagram, Facebook or WhatsApp link to your other hotels in one go.',
        },
      ],
    },
    ctaTitle: 'Start collecting guest feedback at your boutique hotel',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return buildSolutionMetadata({ locale, slug: SLUG, ...CONTENT[locale].meta });
}

export default async function BoutiqueHotelsSolutionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return (
    <SolutionPageLayout
      locale={locale}
      slug={SLUG}
      sector="hospitality"
      content={CONTENT[locale]}
      illustration={<IllusBoutique />}
    />
  );
}
