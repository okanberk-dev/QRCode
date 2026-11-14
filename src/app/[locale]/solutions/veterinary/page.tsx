import type { Metadata } from 'next';
import { Building2, Mail, MessageCircle, Sparkles } from 'lucide-react';
import SolutionPageLayout, { type SolutionPageContent } from '@/components/marketing/SolutionPageLayout';
import { IllusVet } from '@/components/marketing/solution-illustrations';
import { buildSolutionMetadata } from '@/lib/solution-schema';
import type { Locale } from '@/lib/translations';

// ISR: inherits `revalidate = 3600` from `[locale]/layout.tsx` (CLAUDE.md
// §38.163). No request-time APIs here, so the page stays static.

const SLUG = 'veterinary';

const CONTENT: Record<Locale, SolutionPageContent> = {
  tr: {
    name: 'Veteriner klinikleri',
    meta: {
      title: 'Veteriner klinikleri için QR ile geri bildirim',
      description:
        'Veteriner kliniğiniz için QR kod: hayvan sahibi ziyaretini puanlar, eşiğin altında önce size yazabilir. 1–3 yıldızlık puanlarda anında e-posta. 14 gün ücretsiz.',
    },
    eyebrow: 'Veteriner klinikleri',
    h1: 'Veteriner klinikleri için QR ile geri bildirim ve Google yorumları',
    lead:
      'Veteriner kliniğinde geri bildirimi evcil hayvanın sahibi verir: bekleme süresi, bilgilendirme, ücretler ve ekibin ilgisi. Hayvan sahibi QR kodu okutup ziyaretini puanlar; siz de düşük puanları aynı gün görüp yanıtlarsınız.',
    flow: {
      title: 'Veteriner kliniğinde QR ile geri bildirim adım adım',
      steps: [
        {
          title: 'QR kodunuzu oluşturup yerleştirin',
          body:
            'Panelde kliniğiniz için QR kod oluşturun ve Google yorum bağlantınızı ekleyin. QR kodu PNG olarak indirip etikete bastırabilir ya da PDF olarak yazdırabilirsiniz.',
        },
        {
          title: 'Hayvan sahibi puan verir',
          body:
            'Hayvan sahibi QR kodu okutur ve 1–5 yıldız verir. Belirlediğiniz eşik ve üzerindeki puanlarda (varsayılan 5 yıldız) seçtiğiniz platformun yorum sayfası açılır. Eşiğin altında önce size özel geri bildirim yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür.',
        },
        {
          title: 'Düşük puanı aynı gün ele alın',
          body:
            '1–3 yıldızlık her geri bildirimde anında e-posta alırsınız. Hayvan sahibi e-posta bıraktıysa yanıtınız e-postayla gider; isterseniz teşekkür ekranına bir “WhatsApp ile iletişime geç” düğmesi de ekleyebilirsiniz.',
        },
      ],
    },
    placements: {
      title: 'Veteriner kliniğinde QR kodu nereye koymalı',
      lead: 'Hayvan sahibi en çok ödeme yaparken ve taburcu sırasında bekler; QR kodu bu anlara yerleştirin.',
      items: [
        {
          title: 'Ödeme bankosu',
          body:
            'Muayene ücretini öderken QR kod hayvan sahibinin gözünün önünde olsun. Bekleme süresi, bilgilendirme ve ücretle ilgili görüşleri burada almak kolaydır.',
        },
        {
          title: 'Aşı karnesi',
          body:
            'Aşı karnesinin arka kapağına küçük bir QR etiketi yapıştırın. Hayvan sahibi karneyi her aşıda yanında getirdiği için QR kod da hep elinin altındadır.',
        },
        {
          title: 'Taburcu ve bakım talimatları',
          body:
            'Ameliyat veya yatış sonrası verdiğiniz bakım talimatlarının altına QR kodu basın. Hayvan sahibi, dostu evde iyileşirken deneyimini değerlendirebilir.',
        },
        {
          title: 'Bekleme alanı',
          body:
            'Kedi ve köpek sahiplerinin beklediği alanda, mama standının ya da bilgilendirme panosunun yanında bir QR stant bulunsun.',
        },
      ],
      tip:
        'Kliniğiniz muayenenin yanında pet kuaför veya pansiyon hizmeti de veriyorsa her bölüm için ayrı QR oluşturun ve “Masa numarası” alanına “Kuaför” gibi bir etiket yazın. Etiket, düşük puan e-postasında ve CSV dosyasında görünür.',
    },
    uses: {
      title: 'Veteriner kliniğine yarayan panel özellikleri',
      items: [
        {
          icon: Mail,
          title: 'Düşük puan e-postası',
          body:
            '1–3 yıldızlık geri bildirim gelir gelmez e-posta alırsınız. QR etiketi sayesinde geri bildirimin muayeneden mi yoksa kuaför bölümünden mi geldiğini görürsünüz.',
        },
        {
          icon: MessageCircle,
          title: 'İsteğe bağlı WhatsApp düğmesi',
          body:
            'Eşiğin altında puan veren hayvan sahibinin teşekkür ekranında “WhatsApp ile iletişime geç” düğmesi gösterebilirsiniz. Düğme, hayvan sahibinin size kendi WhatsApp’ından yazmasını sağlar; Buaze mesaj göndermez.',
        },
        {
          icon: Building2,
          title: 'Şubeleri yan yana görün',
          body:
            'Birden çok kliniğiniz varsa işletmeler tablosunda her birinin son 30 günlük yorum sayısını, ortalama puanını ve bekleyen düşük puanlarını yan yana görürsünüz.',
        },
        {
          icon: Sparkles,
          title: 'Pulse AI ile sakin bir yanıt',
          body:
            'Üzgün bir hayvan sahibine yanıt yazmak zordur. Pulse AI, özür dileyen ya da sıcak tonda 2–4 cümlelik bir taslak hazırlar; siz düzenler ve onaylarsınız.',
        },
      ],
    },
    platforms: {
      title: 'Veteriner kliniklerinde öne çıkan yorum platformları',
      lead:
        'Kurulumda “Klinik & Sağlık” sektörünü seçtiğinizde panel Google ve Yandex bağlantılarını gösterir. Kliniğinizi arayan hayvan sahipleri için asıl hedef Google yorum sayfanızdır.',
      note:
        'QR akışı hayvan sahibini tek bir yorum sayfasına gönderir; Google’ı varsayılan platform yapın. Yandex bağlantınızı eklerseniz özel geri bildirim gönderen hayvan sahibinin teşekkür ekranında ek bir seçenek olarak görünür.',
    },
    questions: {
      title: 'Hayvan sahiplerine ne sormalı',
      lead:
        'Hayvanın sağlığıyla ilgili soruları muayenede sorun; ankette ziyaret deneyimini ölçün. Anketi aşı karnesindeki QR kodla ya da bağlantı olarak paylaşabilirsiniz.',
      items: [
        { text: 'Muayene öncesindeki bekleme süresini nasıl değerlendirirsiniz?', type: 'rating' },
        { text: 'Hekimimiz tedavi seçeneklerini ve ücretleri anlaşılır biçimde açıkladı mı?', type: 'multiple_choice' },
        { text: 'Evcil hayvanınıza gösterilen ilgiyi nasıl değerlendirirsiniz?', type: 'rating' },
        { text: 'Kliniğimizi diğer hayvan sahiplerine önerme olasılığınız nedir?', type: 'nps' },
        { text: 'Bir sonraki ziyaretinizde neyi farklı yapmamızı istersiniz?', type: 'long_text' },
      ],
      audits: [
        {
          title: 'Sterilizasyon & hijyen günlük kontrolü',
          body: 'Muayene ve ameliyat alanlarının günlük hijyen, sarf malzemesi ve tıbbi atık kontrolü için.',
        },
        {
          title: 'Klinik karşılama deneyimi değerlendirme',
          body: 'Resepsiyonun hayvan sahibini karşılama, bilgilendirme ve bekletme biçimini değerlendirmek için.',
        },
        {
          title: 'Yeni personel 1. gün oryantasyon kontrolü',
          body: 'Yeni başlayan asistan veya resepsiyon görevlisiyle ilk gün yapılacak kontroller için.',
        },
      ],
    },
    privacy: {
      title: 'Hayvan sahibinin verileri ve KVKK',
      paragraphs: [
        'Formda ad ve e-posta isteğe bağlıdır; hayvan sahibi yanıt almak isterse e-posta adresini bırakır. Form gönderilirken KVKK aydınlatma onayı alınır; pazarlama izni ayrıdır ve varsayılan olarak kapalıdır. IP adresleri 90 gün sonra anonimleştirilir.',
        'Veritabanı AB’de (Frankfurt) tutulur. E-posta gönderimi ve yapay zekâ gibi bazı hizmet sağlayıcılar ABD’dedir ve Veri İşleyici Sözleşmesi’nde listelenir. Pulse AI ile taslak istediğinizde ya da otomatik taslakları açtığınızda geri bildirim metni, taslak üretmek için OpenAI’a gönderilir.',
      ],
    },
    faq: {
      title: 'Veteriner klinikleri için sık sorulan sorular',
      items: [
        {
          q: 'Veteriner hekim bazında rapor alabilir miyim?',
          a: 'Hayır, hekim veya personel bazında rapor yoktur. Farklı bölümler için etiketli QR kodlar oluşturabilirsiniz; etiket düşük puan e-postasında ve CSV dosyasında görünür, analitik ekranları ise kliniğin tamamını gösterir.',
        },
        {
          q: 'Kaybedilen bir hayvanın ardından geri bildirim istemeli miyiz?',
          a: 'Bu karar sizindir; böyle zor bir günde QR kodu göstermemek çoğu zaman daha doğrudur. Buaze kimseye kendiliğinden mesaj göndermez; geri bildirim yalnızca hayvan sahibi QR kodu okutursa ya da paylaştığınız bağlantıyı açarsa alınır.',
        },
        {
          q: 'Formda evcil hayvanın adını sorabilir miyim?',
          a: 'Geri bildirim formu sabittir ve hayvanın adını sormaz. Hayvanın adı veya türü gibi bilgiler istiyorsanız bir anket hazırlayıp kısa metin veya çoktan seçmeli soru ekleyebilirsiniz.',
        },
        {
          q: 'Düşük puan veren hayvan sahibi Google’da yorum yazabilir mi?',
          a: 'Evet. Eşiğin altında puan veren hayvan sahibi önce size yazabilir; Google yorum bağlantısı aynı ekranda görünür ve isterse oradan herkese açık yorum yazar. Buaze yorum silmez, gizlemez veya değiştirmez.',
        },
        {
          q: 'Pet kuaför ve pansiyon için ayrı QR kullanabilir miyim?',
          a: 'Evet. İşletme başına istediğiniz kadar QR kod oluşturabilir, her birine ayrı bir etiket ve isterseniz farklı bir yorum platformu atayabilirsiniz.',
        },
        {
          q: 'Kurulum için teknik bilgi gerekir mi?',
          a: 'Hayır. 5 adımlı kurulum sihirbazı işletmenizi, sektörünüzü, konumunuzu, yorum platformlarınızı ve ilk QR kodunuzu adım adım sorar. 14 gün ücretsiz deneyebilirsiniz; kredi kartı gerekmez.',
        },
      ],
    },
    ctaTitle: 'Hayvan sahiplerinden geri bildirim toplamaya başlayın',
  },
  en: {
    name: 'Veterinary clinics',
    meta: {
      title: 'QR feedback and reviews for veterinary clinics',
      description:
        'QR codes for vet clinics: pet owners rate their visit and, below your threshold, can write to you first. Instant e-mail for every 1–3★ rating. Free for 14 days.',
    },
    eyebrow: 'Veterinary clinics',
    h1: 'QR codes for pet owner feedback and Google reviews at veterinary clinics',
    lead:
      "At a vet clinic, feedback comes from the pet’s owner: waiting time, explanations, fees and how the team treated them. The owner scans the QR code and rates the visit; you see low ratings the same day and reply.",
    flow: {
      title: 'QR feedback at a vet clinic, step by step',
      steps: [
        {
          title: 'Create and place your QR code',
          body:
            'Create a QR code for your clinic in the panel and add your Google review link. Download it as PNG to print on a sticker, or print it to PDF.',
        },
        {
          title: 'The pet owner gives a rating',
          body:
            "The owner scans the QR code and gives 1–5 stars. At or above the threshold you set (5 stars by default), your chosen platform’s review page opens. Below it, the owner can first send you private feedback; the public review link is shown on the same screen.",
        },
        {
          title: 'Deal with low ratings the same day',
          body:
            'Every 1–3★ piece of feedback sends you an instant e-mail. If the owner left an e-mail address, your reply goes by e-mail; you can also add a “Message us on WhatsApp” button to the thank-you screen.',
        },
      ],
    },
    placements: {
      title: 'Where to put the QR code in a vet clinic',
      lead: 'Pet owners wait longest while paying and at discharge; place the QR code at those moments.',
      items: [
        {
          title: 'Payment desk',
          body:
            'Keep the QR code in view while owners pay for the visit. This is an easy place to collect feedback on waiting time, explanations and fees.',
        },
        {
          title: 'Vaccination booklet',
          body:
            'Stick a small QR label inside the back cover of the vaccination booklet. Owners bring the booklet to every vaccination, so the QR code is always at hand.',
        },
        {
          title: 'Discharge and aftercare sheet',
          body:
            'Print the QR code at the bottom of the aftercare instructions you give after surgery or a hospital stay. Owners can rate the visit while their pet recovers at home.',
        },
        {
          title: 'Waiting area',
          body:
            'Put a QR stand in the area where cat and dog owners wait, next to the food display or the notice board.',
        },
      ],
      tip:
        'If your clinic also offers grooming or boarding, create a QR code for each service and type a label such as “Grooming” in the “Table number” field. The label shows in the low-rating e-mail and the CSV file.',
    },
    uses: {
      title: 'Panel features that help a vet clinic',
      items: [
        {
          icon: Mail,
          title: 'Low-rating e-mail',
          body:
            'You get an e-mail as soon as a 1–3★ rating comes in. The QR label tells you whether it came from the exam room or from grooming.',
        },
        {
          icon: MessageCircle,
          title: 'Optional WhatsApp button',
          body:
            "You can show a “Message us on WhatsApp” button on the thank-you screen of owners who rate below your threshold. It lets the owner write to you from their own WhatsApp; Buaze doesn’t send messages.",
        },
        {
          icon: Building2,
          title: 'See your clinics side by side',
          body:
            'With several clinics, the businesses table shows each one’s last-30-day review count, average rating and pending low ratings side by side.',
        },
        {
          icon: Sparkles,
          title: 'A calm reply with Pulse AI',
          body:
            'Replying to an upset pet owner is hard. Pulse AI prepares a 2–4 sentence draft in an apologetic or warm tone; you edit and approve it.',
        },
      ],
    },
    platforms: {
      title: 'Review platforms that matter for vet clinics',
      lead:
        'When you pick “Clinic & Health” at setup, the panel shows Google and Yandex links. For pet owners looking for a clinic, your Google review page is the main target.',
      note:
        'The QR flow sends the owner to one review page, so make Google your default platform. If you add your Yandex link, it appears as an extra option on the thank-you screen of owners who send private feedback.',
    },
    questions: {
      title: 'What to ask pet owners',
      lead:
        "Ask about the animal’s health during the visit; use surveys to measure the visit experience. Share the survey with the QR code in the vaccination booklet or as a link.",
      items: [
        { text: 'How would you rate the waiting time before the examination?', type: 'rating' },
        { text: 'Did our vet explain the treatment options and fees clearly?', type: 'multiple_choice' },
        { text: 'How would you rate the care shown to your pet?', type: 'rating' },
        { text: 'How likely are you to recommend our clinic to other pet owners?', type: 'nps' },
        { text: 'What should we do differently on your next visit?', type: 'long_text' },
      ],
      audits: [
        {
          title: 'Daily sterilisation and hygiene check',
          body: 'Daily hygiene, supplies and medical waste check of exam and surgery areas.',
        },
        {
          title: 'Clinic welcome experience review',
          body: 'Reviews how reception greets, informs and seats pet owners.',
        },
        {
          title: 'New staff first-day onboarding check',
          body: 'First-day checklist for a new assistant or receptionist.',
        },
      ],
    },
    privacy: {
      title: "Pet owners’ data and KVKK",
      paragraphs: [
        'Name and e-mail are optional on the form; owners who want a reply leave an e-mail address. The form records the KVKK privacy notice acknowledgement; marketing consent is separate and off by default. IP addresses are anonymised after 90 days.',
        'The database is kept in the EU (Frankfurt). Some service providers, such as e-mail delivery and AI, are in the US and are listed in the data processing agreement. When you ask Pulse AI for a draft or turn on automatic drafts, the feedback text is sent to OpenAI to generate it.',
      ],
    },
    faq: {
      title: 'Veterinary clinic FAQ',
      items: [
        {
          q: 'Can I get reports per vet?',
          a: 'No, there are no per-vet or per-staff reports. You can create labelled QR codes for different services; the label shows in the low-rating e-mail and the CSV file, while the analytics screens cover the whole clinic.',
        },
        {
          q: 'Should we ask for feedback after a pet has died?',
          a: "That’s your call; on such a hard day, not showing the QR code is usually the kinder choice. Buaze never messages anyone on its own: feedback only comes in when the owner scans the QR code or opens a link you shared.",
        },
        {
          q: "Can the form ask for the pet’s name?",
          a: "The feedback form is fixed and doesn’t ask for the pet’s name. If you want details such as the pet’s name or species, build a survey and add a short-text or multiple-choice question.",
        },
        {
          q: 'Can a pet owner who gives a low rating still post on Google?',
          a: "Yes. An owner who rates below your threshold can write to you first; the Google review link is shown on the same screen, and they can post a public review from there if they want. Buaze doesn’t delete, hide or edit reviews.",
        },
        {
          q: 'Can I use separate QR codes for grooming and boarding?',
          a: 'Yes. You can create as many QR codes as you need per business and give each its own label and, if you like, a different review platform.',
        },
        {
          q: 'Do I need technical skills to set it up?',
          a: 'No. The 5-step setup wizard walks you through your business, industry, location, review platforms and first QR code. Try it free for 14 days; no credit card required.',
        },
      ],
    },
    ctaTitle: 'Start collecting feedback from pet owners',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return buildSolutionMetadata({ locale, slug: SLUG, ...CONTENT[locale].meta });
}

export default async function VeterinarySolutionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return (
    <SolutionPageLayout
      locale={locale}
      slug={SLUG}
      sector="clinic"
      content={CONTENT[locale]}
      illustration={<IllusVet />}
    />
  );
}
