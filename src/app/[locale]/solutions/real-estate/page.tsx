import type { Metadata } from 'next';
import { Mail, MapPin, ShieldCheck, Tag } from 'lucide-react';
import SolutionPageLayout, { type SolutionPageContent } from '@/components/marketing/SolutionPageLayout';
import { IllusRealEstate } from '@/components/marketing/solution-illustrations';
import { buildSolutionMetadata } from '@/lib/solution-schema';
import type { Locale } from '@/lib/translations';

// ISR: inherits `revalidate = 3600` from `[locale]/layout.tsx` (CLAUDE.md
// §38.163). No request-time APIs here, so the page stays static.

const SLUG = 'real-estate';

const CONTENT: Record<Locale, SolutionPageContent> = {
  tr: {
    name: 'Emlak ofisleri',
    meta: {
      title: 'Emlak ofisleri için QR ile müşteri geri bildirimi',
      description:
        'Emlak ofisiniz için QR kod: alıcı, satıcı ve kiracılar hizmetinizi puanlar; eşiğin altında önce size yazabilir. Danışman başına etiketli QR. 14 gün ücretsiz.',
    },
    eyebrow: 'Emlak ofisleri',
    h1: 'Emlak ofisleri için QR ile müşteri geri bildirimi ve Google yorumları',
    lead:
      'Emlak hizmeti en çok işlem tamamlandığında değerlendirilir: anahtar teslim edildiğinde ya da kira sözleşmesi imzalandığında. Müşteri QR kodu okutup hizmetinizi puanlar; eşik ve üzerindeki puanlar Google yorum sayfanıza gider.',
    flow: {
      title: 'Emlak ofisinde QR ile geri bildirim nasıl işler',
      steps: [
        {
          title: 'Danışman başına QR oluşturun',
          body:
            'Panelde ofisiniz için QR kod oluşturun ve Google yorum bağlantınızı ekleyin. Her danışman için ayrı bir QR hazırlayıp “Masa numarası” alanına danışmanın kısa kodunu yazabilirsiniz (ör. D01; etikette boşluk ve Türkçe karakter kullanılmaz).',
        },
        {
          title: 'Müşteri puan verir',
          body:
            'Müşteri QR kodu okutur ve 1–5 yıldız verir. Belirlediğiniz eşik ve üzerindeki puanlarda (varsayılan 5 yıldız) Google yorum sayfanız açılır. Eşiğin altında müşteri önce size özel geri bildirim yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür.',
        },
        {
          title: 'Geri bildirimi yanıtlayın',
          body:
            '1–3 yıldızlık geri bildirimde danışman etiketiyle birlikte anında e-posta alırsınız. Müşteri e-posta bıraktıysa yanıtınızı e-postayla gönderirsiniz; Pulse AI resmi tonda bir taslak hazırlayabilir.',
        },
      ],
    },
    placements: {
      title: 'Emlak ofisinde QR kodu nereye koymalı',
      lead:
        'Emlakta müşteriyle temas noktaları dağınıktır: ofis, gösterim ve teslim. QR kodu bu anların her birinde elinizin altında tutun.',
      items: [
        {
          title: 'Anahtar teslim zarfı',
          body:
            'Satış veya kiralama tamamlandığında anahtarları verdiğiniz zarfa QR kodu basın. Müşteri yeni evine yerleşirken süreci değerlendirebilir.',
        },
        {
          title: 'Danışman kartviziti',
          body:
            'Danışmanın kartvizitinin arkasındaki QR kod, gösterimlerden sonra da müşterinin elinde kalır.',
        },
        {
          title: 'Sözleşme ve evrak dosyası',
          body:
            'Tapu veya kira evraklarını teslim ettiğiniz dosyanın içine QR kodlu bir kart koyun.',
        },
        {
          title: 'Ofis girişi',
          body:
            'Ofise gelen alıcı, satıcı veya kiracı, görüşmeden sonra kapıdaki QR kodu okutarak deneyimini puanlayabilir.',
        },
      ],
      tip:
        'Danışman başına ayrı QR kullanırsanız etiket düşük puan e-postasında ve CSV dosyasında görünür. Danışmanları karşılaştıran bir rapor yoktur; analitik ekranları ofisin tamamını gösterir.',
    },
    uses: {
      title: 'Emlak ofisine yarayan panel özellikleri',
      items: [
        {
          icon: Tag,
          title: 'Danışman etiketli QR kodlar',
          body:
            'İşletme başına istediğiniz kadar QR oluşturabilir, her birini bir danışmana ayırabilirsiniz. Geri bildirimin hangi danışmanın QR kodundan geldiği düşük puan e-postasında ve CSV dosyasında görünür.',
        },
        {
          icon: MapPin,
          title: 'Google profilinizi kontrol edin',
          body:
            'Google Yorumları sayfasında puanınızı, yorum sayınızı ve telefon, web sitesi, çalışma saatleri gibi 6 maddelik profil kontrol listesini görürsünüz; Google hesabıyla giriş gerekmez.',
        },
        {
          icon: ShieldCheck,
          title: 'Yanıtlar gönderilmeden kontrol edilir',
          body:
            'IBAN, kart numarası veya T.C. kimlik numarası gibi kişisel veriler ya da ofisinize ait olmayan bağlantılar içeren yanıtlar gönderilmez. Her yanıt için bir sorumluluk onayı da istenir.',
        },
        {
          icon: Mail,
          title: 'Pazartesi özeti',
          body:
            'Geri bildirim gelen haftalarda her pazartesi geçen haftayı özetleyen bir e-posta gelir; haftalık ofis toplantısından önce durumu görürsünüz.',
        },
      ],
    },
    platforms: {
      title: 'Emlak ofisleri için yorum platformları',
      lead:
        'Emlak ofisleri için ayrı bir sektör seçeneği yoktur; kurulumda “Diğer”i seçtiğinizde panel Google, Tripadvisor ve Yandex bağlantılarını gösterir. Emlak ofisi için asıl hedef Google yorum sayfanızdır.',
      note:
        'Tripadvisor turizm işletmeleri içindir; emlak ofisleri için uygun değildir. Yandex Haritalar’da profiliniz varsa onu ikinci platform olarak ekleyebilirsiniz.',
    },
    questions: {
      title: 'Alıcı, satıcı ve kiracılara ne sormalı',
      lead:
        'Emlak hizmetini değerlendirmek için danışmanın ulaşılabilirliğini, bilgilendirmeyi ve süreç yönetimini sorun. Alıcılar, satıcılar ve kiracılar için ayrı anketler hazırlayabilirsiniz.',
      items: [
        { text: 'Danışmanımıza ihtiyaç duyduğunuzda ne kadar kolay ulaştınız?', type: 'multiple_choice' },
        { text: 'Mülk hakkında verilen bilgilerin doğruluğunu nasıl değerlendirirsiniz?', type: 'rating' },
        { text: 'Tapu veya sözleşme sürecinin yönetimini nasıl değerlendirirsiniz?', type: 'rating' },
        { text: 'Bizi bir yakınınıza önerme olasılığınız nedir?', type: 'nps' },
        { text: 'Sürecin hangi adımı sizin için daha kolay olabilirdi?', type: 'long_text' },
      ],
      audits: [
        {
          title: 'Müşteri deneyimi haftalık özet',
          body: 'Ofis yöneticisinin her hafta geri bildirimlere bakarak dolduracağı kısa değerlendirme için.',
        },
        {
          title: 'Yeni personel 1. gün oryantasyon kontrolü',
          body: 'Ekibe katılan yeni danışmanla ilk gün yapılacak kontroller için.',
        },
        {
          title: 'KVKK öz-denetim (işletme)',
          body: 'Müşteri verileri için aydınlatma metni ve personel eğitimini düzenli olarak kontrol etmek için.',
        },
      ],
    },
    privacy: {
      title: 'Müşteri verileri ve KVKK',
      paragraphs: [
        'Formda ad ve e-posta isteğe bağlıdır. Müşteriler yorumlarında adres veya fiyat gibi ayrıntılar yazabilir; yanıt verirken bu bilgileri tekrarlamayın.',
        'Form gönderilirken KVKK aydınlatma onayı alınır; pazarlama izni ayrıdır ve varsayılan olarak kapalıdır. IP adresleri 90 gün sonra anonimleştirilir. Veritabanı AB’de (Frankfurt) tutulur; e-posta gönderimi ve yapay zekâ gibi bazı hizmet sağlayıcılar ABD’dedir ve Veri İşleyici Sözleşmesi’nde listelenir. Yapay zekâ özellikleri (Pulse AI taslakları, geri bildirim özetleri, analitikteki öne çıkan konular ve haftalık özet e-postası) için geri bildirim metni OpenAI’a gönderilir; bu özelliklerin işletmeniz için kapatılmasını destek ekibimizden isteyebilirsiniz.',
      ],
    },
    faq: {
      title: 'Emlak ofisleri için sık sorulan sorular',
      items: [
        {
          q: 'Her danışmanın puanını ayrı ayrı görebilir miyim?',
          a: 'Hayır, danışman bazında puan veya karşılaştırma raporu yoktur. Danışman başına etiketli QR kodlar oluşturabilirsiniz; etiket düşük puan e-postasında ve tüm geri bildirimleri içeren CSV dosyasında görünür. CSV dosyasını kendi tablonuzda danışmana göre sıralayabilirsiniz.',
        },
        {
          q: 'Tapu veya kira işleminden sonra müşteriye otomatik istek gider mi?',
          a: 'Hayır. Buaze müşterilere mesaj göndermez ve emlak yazılımlarına bağlanmaz. QR kodu anahtar teslim zarfında, kartvizitte veya ofiste kullanırsınız; anket bağlantısını isterseniz kendi kanalınızdan paylaşırsınız.',
        },
        {
          q: 'Kiracılar ve ev sahipleri için ayrı geri bildirim toplayabilir miyim?',
          a: 'Evet. Kiracılar ve ev sahipleri için ayrı QR kodlar ve ayrı anketler oluşturabilirsiniz; her anketin sonuçları ve CSV dosyası ayrıdır.',
        },
        {
          q: 'Düşük puan veren müşteri Google’da yorum yazabilir mi?',
          a: 'Evet. Eşiğin altında puan veren müşteri önce size yazabilir; Google yorum bağlantısı da aynı ekranda görünür. Herkese açık yorum yazıp yazmamaya müşteri karar verir. Buaze yorum silmez, gizlemez veya değiştirmez.',
        },
        {
          q: 'Birden çok ofisimiz var. Hepsini tek hesapta yönetebilir miyiz?',
          a: 'Evet. Her ofisi ayrı işletme olarak eklersiniz; işletmeler tablosu her ofisin son 30 günlük yorum sayısını, ortalama puanını ve bekleyen düşük puanlarını yan yana gösterir.',
        },
        {
          q: 'Danışmanlar panele erişebilir mi?',
          a: 'Evet. Danışmanları e-postayla ekibe davet edip personel veya görüntüleyici rolü verebilirsiniz; davet 7 gün geçerlidir. Erişim işletme bazında verilir; yalnızca kendi QR kodundan gelen geri bildirimleri görme gibi bir ayar yoktur.',
        },
      ],
    },
    ctaTitle: 'Ofisinizde müşteri geri bildirimi toplamaya başlayın',
  },
  en: {
    name: 'Real estate agencies',
    meta: {
      title: 'QR feedback and reviews for real estate agencies',
      description:
        'QR codes for estate agents: buyers, sellers and tenants rate your service and, below your threshold, can write to you first. One labelled QR code per agent.',
    },
    eyebrow: 'Real estate agencies',
    h1: 'QR codes for client feedback and Google reviews at real estate agencies',
    lead:
      'Clients judge an estate agent most when the deal is done: when the keys are handed over or the lease is signed. The client scans the QR code and rates your service; ratings at or above your threshold go to your Google review page.',
    flow: {
      title: 'How QR feedback works at an estate agency',
      steps: [
        {
          title: 'Create a QR code per agent',
          body:
            "Create a QR code for your agency in the panel and add your Google review link. Make a separate QR code for each agent and type a short code for the agent in the “Table number” field (for example A01; labels can’t contain spaces or accented letters).",
        },
        {
          title: 'The client gives a rating',
          body:
            "The client scans the QR code and gives 1–5 stars. At or above the threshold you set (5 stars by default), your Google review page opens. Below it, the client can first send you private feedback; the public review link is shown on the same screen.",
        },
        {
          title: 'Reply to the feedback',
          body:
            'A 1–3★ rating sends you an instant e-mail with the agent label. If the client left an e-mail address, you reply by e-mail; Pulse AI can prepare a draft in a formal tone.',
        },
      ],
    },
    placements: {
      title: 'Where to put the QR code in an estate agency',
      lead:
        'In real estate, client contact is spread out: the office, viewings and the handover. Keep the QR code at hand at each of those moments.',
      items: [
        {
          title: 'Key handover envelope',
          body:
            'Print the QR code on the envelope that holds the keys when a sale or let completes. Clients can rate the process as they move in.',
        },
        {
          title: "Agent’s business card",
          body:
            "A QR code on the back of the agent’s business card stays with the client after viewings.",
        },
        {
          title: 'Contract and document folder',
          body: 'Put a card with the QR code in the folder you use to hand over the deed or lease documents.',
        },
        {
          title: 'Office entrance',
          body:
            'Buyers, sellers and tenants who visit the office can scan the QR code at the door after their meeting and rate the experience.',
        },
      ],
      tip:
        'If you use one QR code per agent, the label shows in the low-rating e-mail and the CSV file. There is no report comparing agents; the analytics screens cover the whole agency.',
    },
    uses: {
      title: 'Panel features that help an estate agency',
      items: [
        {
          icon: Tag,
          title: 'QR codes labelled by agent',
          body:
            "Create as many QR codes as you need per business and assign each to an agent. The low-rating e-mail and the CSV file show which agent’s QR code the feedback came from.",
        },
        {
          icon: MapPin,
          title: 'Check your Google profile',
          body:
            'The Google Reviews page shows your rating, review count and a 6-item profile checklist covering phone, website, opening hours and more; no Google sign-in needed.',
        },
        {
          icon: ShieldCheck,
          title: 'Replies are checked before they go out',
          body:
            "Replies containing personal data such as an IBAN, a card number or a Turkish ID number, or links that aren’t yours, are not sent. Each reply also asks you to confirm responsibility for its content.",
        },
        {
          icon: Mail,
          title: 'Monday summary',
          body:
            'In weeks with feedback, an e-mail every Monday sums up the previous week, so you see where things stand before the weekly team meeting.',
        },
      ],
    },
    platforms: {
      title: 'Review platforms for estate agencies',
      lead:
        "There is no separate industry option for estate agencies; when you pick “Other” at setup, the panel shows Google, Tripadvisor and Yandex links. For an estate agency, your Google review page is the main target.",
      note:
        "Tripadvisor is meant for travel businesses and doesn’t suit estate agencies. If you have a profile on Yandex Maps, add it as a second platform.",
    },
    questions: {
      title: 'What to ask buyers, sellers and tenants',
      lead:
        'To assess an agency, ask how easy it was to reach the agent, how well clients were informed and how the process was handled. You can build separate surveys for buyers, sellers and tenants.',
      items: [
        { text: 'How easily could you reach our agent when you needed them?', type: 'multiple_choice' },
        { text: 'How would you rate the accuracy of the information about the property?', type: 'rating' },
        { text: 'How would you rate how we handled the deed or contract process?', type: 'rating' },
        { text: 'How likely are you to recommend us to someone close to you?', type: 'nps' },
        { text: 'Which step of the process could have been easier for you?', type: 'long_text' },
      ],
      audits: [
        {
          title: 'Weekly customer experience summary',
          body: 'A short weekly review the office manager fills in after reading the feedback.',
        },
        {
          title: 'New staff first-day onboarding check',
          body: 'First-day checklist for a new agent joining the team.',
        },
        {
          title: 'KVKK self-check (business)',
          body: 'A regular check of the privacy notice and staff training for client data.',
        },
      ],
    },
    privacy: {
      title: 'Client data and KVKK',
      paragraphs: [
        "Name and e-mail are optional on the form. Clients may mention details such as an address or a price in their comments; don’t repeat them in your reply.",
        'The form records the KVKK privacy notice acknowledgement; marketing consent is separate and off by default. IP addresses are anonymised after 90 days. The database is kept in the EU (Frankfurt); some service providers, such as e-mail delivery and AI, are in the US and are listed in the data processing agreement. For the AI features (Pulse AI drafts, feedback summaries, the highlighted topics in analytics and the weekly summary e-mail), feedback text is sent to OpenAI; you can ask our support team to switch these features off for your business.',
      ],
    },
    faq: {
      title: 'Estate agency FAQ',
      items: [
        {
          q: "Can I see each agent’s rating separately?",
          a: 'No, there are no per-agent ratings or comparison reports. You can create a labelled QR code for each agent; the label shows in the low-rating e-mail and, for every piece of feedback, in the CSV file, and you can sort the CSV by agent in your own spreadsheet.',
        },
        {
          q: 'Do clients get an automatic request after a sale or let completes?',
          a: "No. Buaze doesn’t send messages to clients and doesn’t connect to property software. You use the QR code in the key envelope, on business cards or in the office, and you can share a survey link through your own channels.",
        },
        {
          q: 'Can I collect feedback from tenants and landlords separately?',
          a: 'Yes. Create separate QR codes and separate surveys for tenants and landlords; each survey has its own results and CSV file.',
        },
        {
          q: 'Can a client who gives a low rating still post on Google?',
          a: "Yes. A client who rates below your threshold can write to you first, and the Google review link is shown on the same screen. Whether to post a public review is the client’s decision. Buaze doesn’t delete, hide or edit reviews.",
        },
        {
          q: 'We have several offices. Can we manage them all in one account?',
          a: 'Yes. You add each office as a separate business; the businesses table shows each office’s last-30-day review count, average rating and pending low ratings side by side.',
        },
        {
          q: 'Can agents access the panel?',
          a: "Yes. Invite agents to your team by e-mail and give them the staff or viewer role; invitations last 7 days. Access is granted per business; there is no setting that limits an agent to feedback from their own QR code.",
        },
      ],
    },
    ctaTitle: 'Start collecting client feedback at your agency',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return buildSolutionMetadata({ locale, slug: SLUG, ...CONTENT[locale].meta });
}

export default async function RealEstateSolutionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return (
    <SolutionPageLayout
      locale={locale}
      slug={SLUG}
      sector="other"
      content={CONTENT[locale]}
      illustration={<IllusRealEstate />}
    />
  );
}
