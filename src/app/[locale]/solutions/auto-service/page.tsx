import type { Metadata } from 'next';
import { Building2, MapPin, MessageCircle, Sparkles } from 'lucide-react';
import SolutionPageLayout, { type SolutionPageContent } from '@/components/marketing/SolutionPageLayout';
import { IllusAuto } from '@/components/marketing/solution-illustrations';
import { buildSolutionMetadata } from '@/lib/solution-schema';
import type { Locale } from '@/lib/translations';

// ISR: inherits `revalidate = 3600` from `[locale]/layout.tsx` (CLAUDE.md
// §38.163). No request-time APIs here, so the page stays static.

const SLUG = 'auto-service';

const CONTENT: Record<Locale, SolutionPageContent> = {
  tr: {
    name: 'Oto servisler',
    meta: {
      title: 'Oto servisler için QR ile müşteri geri bildirimi',
      description:
        'Oto servisiniz için QR kod: müşteri aracını teslim alırken puan verir, eşiğin altında önce size yazabilir. 1–3 yıldızda anında e-posta. 14 gün ücretsiz.',
    },
    eyebrow: 'Oto servisler',
    h1: 'Oto servisler için QR ile müşteri geri bildirimi ve Google yorumları',
    lead:
      'Müşteri aracını teslim alırken iki şeye bakar: işin kalitesine ve size duyduğu güvene. Aynadaki ya da faturadaki QR kod, müşterinin bu değerlendirmeyi o anda yapmasını sağlar; eşik ve üzerindeki puanlar Google yorum sayfanıza gider.',
    flow: {
      title: 'Oto serviste QR ile geri bildirim nasıl işler',
      steps: [
        {
          title: 'QR kodunuzu hazırlayın',
          body:
            'Panelde servisiniz için QR kod oluşturun ve Google yorum bağlantınızı ekleyin. QR kodu PNG olarak indirip ayna askısına, anahtarlık etiketine ya da faturaya bastırabilirsiniz.',
        },
        {
          title: 'Müşteri puan verir',
          body:
            'Müşteri aracını teslim alırken QR kodu okutup 1–5 yıldız verir. Belirlediğiniz eşik ve üzerindeki puanlarda (varsayılan 5 yıldız) Google yorum sayfanız açılır. Eşiğin altında müşteri önce size özel geri bildirim yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür.',
        },
        {
          title: 'Sorunu müşteri uzaklaşmadan konuşun',
          body:
            '1–3 yıldızlık geri bildirimde anında e-posta alırsınız. İsterseniz teşekkür ekranına bir “WhatsApp ile iletişime geç” düğmesi ekleyerek müşterinin size kendi telefonundan yazmasını kolaylaştırırsınız.',
        },
      ],
    },
    placements: {
      title: 'Oto serviste QR kodu nereye koymalı',
      lead: 'En iyi an, müşterinin aracını teslim aldığı andır. QR kodu bu ana denk gelecek yerlere koyun.',
      items: [
        {
          title: 'Dikiz aynası askısı',
          body:
            'Servis sonrası aynaya astığınız kart, müşteri araca bindiği anda görünür. Kartın arka yüzüne QR kodu basın.',
        },
        {
          title: 'Fatura ve iş emri',
          body:
            'Faturanın veya iş emrinin altındaki QR kod, ödeme sırasında ve sonrasında müşterinin elinde kalır.',
        },
        {
          title: 'Anahtarlık etiketi',
          body:
            'Anahtara takılan servis etiketi teslimde müşterinin eline geçer; etiketin arkasına küçük bir QR kod ekleyin.',
        },
        {
          title: 'Müşteri bekleme salonu',
          body:
            'Aracının bitmesini bekleyen müşteri, karşılama ve bekleme deneyimini burada puanlayabilir.',
        },
      ],
      tip:
        'Kaporta, mekanik ve lastik gibi bölümler için ayrı QR kodlar oluşturup “Masa numarası” alanına bölümün adını yazabilirsiniz (ör. Kaporta, Mekanik, Lastik; etikette boşluk ve Türkçe karakter kullanılmaz). Etiket düşük puan e-postasında ve CSV dosyasında görünür.',
    },
    uses: {
      title: 'Oto servise yarayan panel özellikleri',
      items: [
        {
          icon: MessageCircle,
          title: 'İsteğe bağlı WhatsApp düğmesi',
          body:
            'Eşiğin altında puan veren müşterinin teşekkür ekranında “WhatsApp ile iletişime geç” düğmesi gösterebilirsiniz. Müşteri size kendi WhatsApp’ından yazar; Buaze kimseye mesaj göndermez.',
        },
        {
          icon: MapPin,
          title: 'Google profil kontrol listesi',
          body:
            'Google Yorumları sayfası çalışma saatleri, telefon ve fotoğraflar dahil 6 maddelik profil kontrol listesini gösterir. Eksik bir çalışma saati ya da telefon numarasını buradan fark edersiniz.',
        },
        {
          icon: Building2,
          title: 'Şubeleri tek ekranda görün',
          body:
            'Birden çok servis noktanız varsa işletmeler tablosunda her birinin son 30 günlük yorum sayısını, puanını ve bekleyen düşük puanlarını yan yana görürsünüz.',
        },
        {
          icon: Sparkles,
          title: 'Gecikme ve ücret şikâyetlerine taslak',
          body:
            'Pulse AI, gecikme veya ücret şikâyetine 2–4 cümlelik bir yanıt taslağı hazırlar; resmi ya da özür dileyen tonu seçersiniz. Taslaklar ücretsiz hizmet veya indirim vaat etmeyecek biçimde hazırlanır; düzenleyip onaylayan sizsiniz.',
        },
      ],
    },
    platforms: {
      title: 'Oto servisler için yorum platformları',
      lead:
        'Oto servisler için ayrı bir sektör seçeneği yoktur; kurulumda “Diğer”i seçtiğinizde panel Google, Tripadvisor ve Yandex bağlantılarını gösterir. Servis arayan sürücüler için asıl hedef Google yorum sayfanızdır.',
      note:
        'Yandex Haritalar’da profiliniz varsa onu ikinci platform olarak ekleyin. Tripadvisor ise turizm işletmelerine yöneliktir; oto servis için kullanmanız gerekmez.',
    },
    questions: {
      title: 'Servis müşterilerine ne sormalı',
      lead:
        'Yıldız puanı genel memnuniyeti gösterir. Teslim süresi, fiyat şeffaflığı ve aracın temizliği gibi konuları bir anketle ayrı ayrı öğrenebilirsiniz.',
      items: [
        { text: 'Aracınız söz verilen saatte teslim edildi mi?', type: 'multiple_choice' },
        { text: 'Yapılan işlemlerin ve ücretin size açıklanmasını nasıl değerlendirirsiniz?', type: 'rating' },
        { text: 'Aracınızın teslimdeki temizliğini nasıl değerlendirirsiniz?', type: 'rating' },
        { text: 'Servisimizi bir arkadaşınıza önerme olasılığınız nedir?', type: 'nps' },
        { text: 'Bir sonraki servis ziyaretinizde neyi farklı yapmamızı istersiniz?', type: 'long_text' },
      ],
      audits: [
        {
          title: 'Müşteri itirazı senaryo değerlendirme',
          body: 'Garanti, iade ve ücret itirazlarında danışmanların doğru yanıtı bilip bilmediğini ölçen senaryolar için.',
        },
        {
          title: 'Yeni personel 1. gün oryantasyon kontrolü',
          body: 'Yeni başlayan teknisyen veya servis danışmanıyla ilk gün yapılacak kontroller için.',
        },
        {
          title: 'Müşteri deneyimi haftalık özet',
          body: 'Servis müdürünün her hafta geri bildirimlere bakarak dolduracağı kısa değerlendirme için.',
        },
      ],
    },
    privacy: {
      title: 'Müşteri ve araç bilgileri',
      paragraphs: [
        'Plaka, bir kişiyle ilişkilendirildiğinde kişisel veri sayılabilir. Anketlerde plaka sormak isterseniz soruyu isteğe bağlı bırakın ve neden sorduğunuzu açıklayın.',
        'Geri bildirim formunda ad ve e-posta isteğe bağlıdır. Form gönderilirken KVKK aydınlatma onayı alınır; pazarlama izni ayrıdır ve varsayılan olarak kapalıdır. IP adresleri 90 gün sonra anonimleştirilir. Veritabanı AB’de (Frankfurt) tutulur; bazı hizmet sağlayıcılar ABD’dedir ve Veri İşleyici Sözleşmesi’nde listelenir. Yapay zekâ özellikleri (Pulse AI taslakları, geri bildirim özetleri, analitikteki öne çıkan konular ve haftalık özet e-postası) için geri bildirim metni OpenAI’a gönderilir; bu özelliklerin işletmeniz için kapatılmasını destek ekibimizden isteyebilirsiniz.',
      ],
    },
    faq: {
      title: 'Oto servisler için sık sorulan sorular',
      items: [
        {
          q: 'Teknisyen bazında rapor alabilir miyim?',
          a: 'Hayır, teknisyen veya personel bazında rapor yoktur. Bölüm başına etiketli QR kodlar oluşturabilirsiniz; etiket düşük puan e-postasında ve CSV dosyasında görünür, analitik ekranları ise servisin tamamını gösterir.',
        },
        {
          q: 'Araç teslim edilince müşteriye otomatik mesaj gider mi?',
          a: 'Hayır. Buaze servis yazılımınıza bağlanmaz ve müşterilere mesaj göndermez. Geri bildirim, müşteri QR kodu okuttuğunda alınır; bu yüzden QR kodu teslim anında müşterinin göreceği bir yere koymak önemlidir.',
        },
        {
          q: 'WhatsApp düğmesi nasıl çalışır?',
          a: 'Panelde WhatsApp numaranızı ekleyip düğmeyi açarsınız; mesaj metnini de kendiniz düzenlersiniz. Düğme yalnızca eşiğin altında puan veren müşterinin teşekkür ekranında görünür. Müşteri dokunduğunda kendi WhatsApp’ı hazır mesajla açılır ve göndermeye kendisi karar verir.',
        },
        {
          q: 'Düşük puan veren müşteri Google’da yorum yazabilir mi?',
          a: 'Evet. Eşiğin altında puan veren müşteri önce size yazabilir ve Google yorum bağlantısını aynı ekranda görür; herkese açık yorum yazmak isterse oradan yazar. Buaze yorum silmez, gizlemez veya değiştirmez.',
        },
        {
          q: 'Yorum karşılığında indirim veya ücretsiz yıkama sunabilir miyim?',
          a: 'Buaze yorum karşılığında ödül sunmaz; Google da yorum karşılığı teşviki yasaklar. Anketlerde isteğe bağlı bir teşekkür kuponu gösterebilirsiniz, ancak bu kupon herkese açık yorum yazmaya bağlanmamalıdır.',
        },
        {
          q: 'Yorum platformunu değiştirirsem QR kodu yeniden bastırmam gerekir mi?',
          a: 'Hayır. QR kod Buaze sayfanızı açar; yorum platformunu veya eşiği panelden değiştirdiğinizde basılı QR kodlar çalışmaya devam eder.',
        },
      ],
    },
    ctaTitle: 'Servisinizde teslim anında geri bildirim toplayın',
  },
  en: {
    name: 'Auto repair shops',
    meta: {
      title: 'QR feedback and reviews for auto repair shops',
      description:
        'QR codes for auto repair shops: customers rate the service when they collect their car and, below your threshold, can write to you first. Free for 14 days.',
    },
    eyebrow: 'Auto repair shops',
    h1: 'QR codes for customer feedback and Google reviews at auto repair shops',
    lead:
      'When customers collect their car, they judge two things: the quality of the work and how much they trust you. A QR code on the mirror hanger or the invoice lets them rate it right then; ratings at or above your threshold go to your Google review page.',
    flow: {
      title: 'How QR feedback works at a repair shop',
      steps: [
        {
          title: 'Prepare your QR code',
          body:
            'Create a QR code for your shop in the panel and add your Google review link. Download it as PNG and print it on a mirror hanger, a key tag or the invoice.',
        },
        {
          title: 'The customer gives a rating',
          body:
            "The customer scans the QR code when collecting the car and gives 1–5 stars. At or above the threshold you set (5 stars by default), your Google review page opens. Below it, the customer can first send you private feedback; the public review link is shown on the same screen.",
        },
        {
          title: 'Talk before the customer is gone',
          body:
            'A 1–3★ rating sends you an instant e-mail. You can also add a “Message us on WhatsApp” button to the thank-you screen so the customer can write to you from their own phone.',
        },
      ],
    },
    placements: {
      title: 'Where to put the QR code in a repair shop',
      lead: 'The best moment is when the customer collects the car. Put the QR code where it meets them at that moment.',
      items: [
        {
          title: 'Rear-view mirror hanger',
          body:
            'The card you hang on the mirror after a service is the first thing the customer sees on getting in. Print the QR code on its back.',
        },
        {
          title: 'Invoice and job card',
          body:
            'A QR code at the bottom of the invoice or job card stays in the customer’s hands during and after payment.',
        },
        {
          title: 'Key tag',
          body:
            'The service tag on the key reaches the customer at handover; add a small QR code to its back.',
        },
        {
          title: 'Customer waiting room',
          body:
            'Customers waiting for their car can rate the welcome and the wait right there.',
        },
      ],
      tip:
        'Create separate QR codes for departments such as bodywork, mechanical and tyres, and type the department name in the “Table number” field (for example Bodywork, Mechanical or Tyres; labels can’t contain spaces or accented letters). The label shows in the low-rating e-mail and the CSV file.',
    },
    uses: {
      title: 'Panel features that help a repair shop',
      items: [
        {
          icon: MessageCircle,
          title: 'Optional WhatsApp button',
          body:
            "You can show a “Message us on WhatsApp” button on the thank-you screen of customers who rate below your threshold. The customer writes to you from their own WhatsApp; Buaze doesn’t message anyone.",
        },
        {
          icon: MapPin,
          title: 'Google profile checklist',
          body:
            'The Google Reviews page shows a 6-item profile checklist that includes opening hours, phone and photos. It is where you spot missing opening hours or a missing phone number.',
        },
        {
          icon: Building2,
          title: 'All your branches on one screen',
          body:
            'With several locations, the businesses table shows each one’s last-30-day review count, rating and pending low ratings side by side.',
        },
        {
          icon: Sparkles,
          title: 'Drafts for delay and price complaints',
          body:
            "Pulse AI prepares a 2–4 sentence reply draft for a delay or price complaint, and you choose a formal or apologetic tone. Drafts are written not to promise free work or discounts; you edit and approve them.",
        },
      ],
    },
    platforms: {
      title: 'Review platforms for repair shops',
      lead:
        'There is no separate industry option for repair shops; when you pick “Other” at setup, the panel shows Google, Tripadvisor and Yandex links. For drivers looking for a garage, your Google review page is the main target.',
      note:
        "If you have a profile on Yandex Maps, add it as a second platform. Tripadvisor is aimed at travel businesses, so you don’t need it for a repair shop.",
    },
    questions: {
      title: 'What to ask service customers',
      lead:
        'A star rating shows overall satisfaction. A survey lets you ask about turnaround time, price transparency and how clean the car was, one by one.',
      items: [
        { text: 'Was your car ready at the time we promised?', type: 'multiple_choice' },
        { text: 'How would you rate how we explained the work and the cost?', type: 'rating' },
        { text: 'How would you rate how clean your car was at handover?', type: 'rating' },
        { text: 'How likely are you to recommend us to a friend?', type: 'nps' },
        { text: 'What should we do differently on your next visit?', type: 'long_text' },
      ],
      audits: [
        {
          title: 'Customer objection scenario review',
          body: 'Scenarios that check whether service advisers know the right answer to warranty, return and price complaints.',
        },
        {
          title: 'New staff first-day onboarding check',
          body: 'First-day checklist for a new technician or service adviser.',
        },
        {
          title: 'Weekly customer experience summary',
          body: 'A short weekly review the service manager fills in after reading the feedback.',
        },
      ],
    },
    privacy: {
      title: 'Customer and vehicle details',
      paragraphs: [
        'A licence plate can count as personal data when it is linked to a person. If you want to ask for the plate in a survey, make the question optional and explain why you ask.',
        'Name and e-mail are optional on the feedback form. The form records the KVKK privacy notice acknowledgement; marketing consent is separate and off by default. IP addresses are anonymised after 90 days. The database is kept in the EU (Frankfurt); some service providers are in the US and are listed in the data processing agreement. For the AI features (Pulse AI drafts, feedback summaries, the highlighted topics in analytics and the weekly summary e-mail), feedback text is sent to OpenAI; you can ask our support team to switch these features off for your business.',
      ],
    },
    faq: {
      title: 'Auto repair shop FAQ',
      items: [
        {
          q: 'Can I get reports per technician?',
          a: 'No, there are no per-technician or per-staff reports. You can create labelled QR codes per department; the label shows in the low-rating e-mail and the CSV file, while the analytics screens cover the whole shop.',
        },
        {
          q: 'Does the customer get an automatic message when the car is handed over?',
          a: "No. Buaze doesn’t connect to your workshop software and doesn’t send messages to customers. Feedback comes in when the customer scans the QR code, which is why it matters to put the code where they see it at handover.",
        },
        {
          q: 'How does the WhatsApp button work?',
          a: 'You add your WhatsApp number in the panel, switch the button on and edit the message text yourself. The button appears only on the thank-you screen of customers who rate below your threshold. When they tap it, their own WhatsApp opens with the prepared message, and they decide whether to send it.',
        },
        {
          q: 'Can a customer who gives a low rating still post on Google?',
          a: "Yes. A customer who rates below your threshold can write to you first and sees the Google review link on the same screen; if they want to post a public review, they do it from there. Buaze doesn’t delete, hide or edit reviews.",
        },
        {
          q: 'Can I offer a discount or a free car wash for a review?',
          a: "Buaze doesn’t offer rewards for reviews, and Google prohibits incentives for reviews. Surveys can show an optional thank-you coupon, but it must not be tied to posting a public review.",
        },
        {
          q: 'If I change the review platform, do I need to reprint the QR code?',
          a: 'No. The QR code opens your Buaze page, so printed codes keep working when you change the review platform or the threshold in the panel.',
        },
      ],
    },
    ctaTitle: 'Collect feedback at handover in your shop',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return buildSolutionMetadata({ locale, slug: SLUG, ...CONTENT[locale].meta });
}

export default async function AutoServiceSolutionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return (
    <SolutionPageLayout
      locale={locale}
      slug={SLUG}
      sector="other"
      content={CONTENT[locale]}
      illustration={<IllusAuto />}
    />
  );
}
