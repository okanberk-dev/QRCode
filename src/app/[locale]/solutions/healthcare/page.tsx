import type { Metadata } from 'next';
import { Building2, Mail, ShieldCheck, Stethoscope } from 'lucide-react';
import SolutionPageLayout, { type SolutionPageContent } from '@/components/marketing/SolutionPageLayout';
import { buildSolutionMetadata } from '@/lib/solution-schema';
import type { Locale } from '@/lib/translations';
import { IllusClinic } from '../_components/sector-illustrations';

// ISR: inherits `revalidate = 3600` from `[locale]/layout.tsx`. Reads only
// `params`, so the page stays static. Sector "clinic" drives the platform
// list (Google, Yandex) and the "After the appointment" survey template.
// Written for general and multi-department clinics; dentists, aesthetic and
// veterinary clinics have their own pages.

const SLUG = 'healthcare';

const CONTENT: Record<Locale, SolutionPageContent> = {
  tr: {
    name: 'Sağlık klinikleri',
    meta: {
      title: 'Sağlık klinikleri için QR ile hasta geri bildirimi',
      description:
        'Klinik bölümleri için QR kod: hasta puan verir, eşiğin altında önce size yazabilir. Formda sağlık bilgisi sorulmaz, IP adresleri 90 gün sonra anonimleştirilir.',
    },
    eyebrow: 'Sağlık klinikleri',
    h1: 'Sağlık klinikleri için QR ile hasta geri bildirimi',
    lead:
      'Klinikte hastanın deneyimini randevu, bekleme süresi ve ekibin iletişimi belirler. Bölümlere koyduğunuz QR kodlarla hasta bunları ayrılmadan puanlar; eşik ve üzerindeki puanlarda Google yorum sayfanız açılır, eşiğin altında hasta önce size yazabilir ve herkese açık yorum bağlantısını aynı ekranda görür.',
    flow: {
      title: 'Klinikte QR ile geri bildirim akışı',
      steps: [
        {
          title: 'Bölümler için QR oluşturun',
          body:
            'Her bölümün bekleme alanı için ayrı QR kod oluşturup etiket verin (ör. Kardiyoloji, Lab, Kat2). Etiket düşük puan e-postasında ve CSV dosyasında görünür; şikâyetin hangi bölümden geldiğini bilirsiniz.',
        },
        {
          title: 'Hasta puan verir',
          body:
            'Hasta QR kodu okutur ve 1–5 yıldız verir. Belirlediğiniz eşik ve üzerindeki puanlarda (varsayılan 5 yıldız) Google yorum sayfanız açılır. Eşiğin altındaki puanlarda hasta önce size özel geri bildirim yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür.',
        },
        {
          title: 'Aynı gün geri dönün',
          body:
            '1–3 yıldızlık her geri bildirimde bölüm etiketiyle birlikte anında e-posta alırsınız. Hasta e-posta adresini bıraktıysa yanıtınızı e-postayla gönderirsiniz; ayrıntıları telefonda ya da yüz yüze konuşmak çoğu zaman daha uygundur.',
        },
      ],
    },
    placements: {
      title: 'Klinikte QR kodu nereye koymalı',
      lead: 'QR kod, hastanın işlemi bittikten sonra kısa bir süre beklediği yerlerde en iyi sonucu verir.',
      items: [
        {
          title: 'Çıkış ve sekreterlik bankosu',
          body:
            'Hasta muayeneden çıkıp sekreterlikte işlemlerini tamamlarken QR kodu görür. Ziyaretin tamamını değerlendirmek için en doğal andır.',
        },
        {
          title: 'Bölüm bekleme alanları',
          body:
            'Her bölümün bekleme alanına etiketli bir QR koyarak geri bildirimleri bölüme göre ayırırsınız. Bekleme süresiyle ilgili görüşler de çoğunlukla burada yazılır.',
        },
        {
          title: 'Bilgilendirme broşürü ve sonuç zarfı',
          body:
            'Hastaya verdiğiniz bilgilendirme broşürünün ya da sonuç zarfının arka yüzüne basılan QR kod, hastanın evde de değerlendirme yapmasını sağlar.',
        },
        {
          title: 'Fizik tedavi ve seans salonları',
          body:
            'Birden çok seansa gelen hastalar için seans salonundaki QR kod, tedavi süreci boyunca deneyimlerini paylaşmalarını kolaylaştırır.',
        },
      ],
      tip:
        '“Masa numarası” alanını bölüm etiketi olarak kullanabilirsiniz; harf, rakam ve kısa çizgi yazılır, boşluk ve Türkçe karakter kullanılmaz. Etikete hasta adı, protokol numarası veya başka bir kişisel bilgi yazmayın.',
    },
    uses: {
      title: 'Klinik panelinde işinize yarayanlar',
      items: [
        {
          icon: Stethoscope,
          title: 'Kliniğe uygun panel dili',
          body:
            'Sektör olarak “Klinik & Sağlık”ı seçtiğinizde paneldeki adlar kliniğe göre değişir: “Yorumlar” yerine “Hasta geri bildirimleri”, “Müşteriler” yerine “Hastalar” yazar ve QR Menü bölümü gizlenir.',
        },
        {
          icon: ShieldCheck,
          title: 'Yanıtlar gönderilmeden kontrol edilir',
          body:
            'Hastaya e-postayla yanıt göndermeden önce Buaze metni kontrol eder: T.C. kimlik numarası, IBAN veya kart numarası, hakaret ya da tehdit içeren yanıtlar gönderilmez. Her yanıtta içerikten sorumlu olduğunuzu ayrıca onaylarsınız.',
        },
        {
          icon: Mail,
          title: 'Uyarılar hasta ilişkilerine gitsin',
          body:
            'Uyarıların gideceği adresi işletme ayarlarından seçersiniz; hasta ilişkileri biriminin adresini yazarsanız 1–3 yıldızlık her geri bildirim doğrudan o ekibe gider. Boş bırakırsanız hesabınızın e-posta adresi kullanılır.',
        },
        {
          icon: Building2,
          title: 'Birden çok klinik tek hesapta',
          body:
            'Her kliniği ayrı işletme olarak eklersiniz. İşletmeler tablosunda son 30 günün yorum sayısını, ortalama puanı ve bekleyen düşük puanları yan yana görür, ekip üyelerine yalnızca ilgili kliniğe erişim verirsiniz.',
        },
      ],
    },
    platforms: {
      title: 'Sağlık kliniklerinde yorum platformları',
      lead:
        'Sektör olarak “Klinik & Sağlık”ı seçtiğinizde panel Google ve Yandex bağlantılarını gösterir. Eşik ve üzerindeki puanlarda hasta varsayılan platformunuza gider; çoğu klinik için bu, Google yorum sayfasıdır.',
      note:
        'Google İşletme Profilinizi adıyla aratıp seçtiğinizde Buaze resmi “yorum yaz” bağlantısını oluşturur. Google Yorumları sayfasında puanınızı, yorum sayınızı, Google’ın gösterdiği en fazla 5 yorumu ve 6 maddelik profil kontrol listesini Google hesabıyla giriş yapmadan görürsünüz.',
    },
    questions: {
      title: 'Hastalara ne sormalı',
      lead:
        'Hazır “Randevu sonrası” şablonu randevu sürecini, ekibin iletişimini ve tavsiye isteğini sorar; açık uçlu sorusunda hastadan sağlık bilgisi yazmamasını ister. Kendi sorularınızı eklerken de tanı, tedavi veya ilaç sormayın.',
      items: [
        { text: 'Randevu alma sürecini nasıl değerlendirirsiniz?', type: 'rating' },
        { text: 'Muayeneye girmeden önce ne kadar beklediniz?', type: 'multiple_choice' },
        { text: 'Hekiminizin size ayırdığı zamanı nasıl değerlendirirsiniz?', type: 'rating' },
        { text: 'Kliniğimizin temizliğini nasıl değerlendirirsiniz?', type: 'rating' },
        { text: 'Kliniğimizi bir yakınınıza önerme olasılığınız nedir?', type: 'nps' },
      ],
      audits: [
        {
          title: 'Hemşire / asistan davranış quiz',
          body: 'Yeni hemşire ve asistan adaylarına iletişim, hasta mahremiyeti ve acil durum soruları.',
        },
        {
          title: 'Klinik karşılama deneyimi değerlendirme',
          body: 'Ön büronun hastayı karşılama, bilgilendirme ve yönlendirme biçimini değerlendirmek için.',
        },
        {
          title: 'KVKK hasta verisi öz-denetim',
          body: 'Hasta verilerine erişim ve saklama düzenini her ay gözden geçirmek için; hukuki danışmanlığın yerini tutmaz.',
        },
      ],
    },
    privacy: {
      title: 'Sağlık verisi, KVKK ve tanıtım kuralları',
      paragraphs: [
        'Geri bildirim formu sağlık bilgisi sormaz; ad ve e-posta isteğe bağlıdır. Yorum alanı ise serbest metindir ve hasta tanısından ya da tedavisinden söz edebilir. Sağlık verisi özel nitelikli kişisel veridir; geri bildirimlere erişimi yalnızca gerekli ekip üyeleriyle sınırlayın.',
        'Form gönderilirken KVKK aydınlatma onayı alınır; pazarlama izni ayrı bir kutudur ve varsayılan olarak işaretsizdir. Onaylar kayıt altına alınır, IP adresleri 90 gün sonra anonimleştirilir.',
        'Veritabanı AB’de (Frankfurt) tutulur; e-posta gönderimi ve yapay zekâ gibi bazı hizmet sağlayıcılar ABD’dedir ve Veri İşleyici Sözleşmesi’nde listelenir. Yapay zekâ özellikleri (Pulse AI taslakları, geri bildirim özetleri, analitikteki öne çıkan konular ve haftalık özet e-postası) için geri bildirim metni OpenAI’a gönderilir. Bu özelliklerin kliniğiniz için kapatılmasını destek ekibimizden isteyebilirsiniz; sağlık bilgisi içeren yorumlara yanıtı kendiniz yazmayı da tercih edebilirsiniz.',
        'Sağlık hizmetlerinin tanıtımı ayrıca düzenlenmiştir. Hasta yorumlarını web sitenizde veya reklamlarınızda kullanmadan önce ve kurumunuzun kendi aydınlatma yükümlülükleri için hukuk danışmanınıza başvurun.',
      ],
    },
    faq: {
      title: 'Sağlık klinikleri için sık sorulan sorular',
      items: [
        {
          q: 'Hekim veya bölüm bazında rapor alabilir miyim?',
          a: 'Hekim ya da bölüm bazında rapor yoktur. Bölümler için ayrı etiketli QR kodlar oluşturursanız etiket düşük puan e-postasında ve CSV dosyasında görünür; analitik ekranları kliniğin tamamını gösterir.',
        },
        {
          q: 'Randevu veya hastane bilgi sistemimize bağlanıyor mu?',
          a: 'Hayır. Buaze randevu ya da hastane bilgi sistemlerine bağlanmaz ve hastalara SMS veya e-postayla anket göndermez. Hasta QR kodu klinikteyken ya da kendisine verdiğiniz belgeden okutur.',
        },
        {
          q: 'Formu doldurmak için hastanın hesap açması gerekir mi?',
          a: 'Hayır. Hasta QR kodu okutup puan verir; ad ve e-posta isteğe bağlıdır. Yanıt almak isteyen hasta e-posta adresini bırakır, bırakmazsa yanıtınız panelde kayıt olarak kalır.',
        },
        {
          q: 'Hasta formu hangi dillerde?',
          a: 'Form Türkçe ve İngilizce olarak hazırdır ve hastanın telefon diline göre açılır; diğer dillerde form yoktur. Yurt dışından gelen hastalarınız için İngilizce form ve İngilizce Pulse AI taslakları kullanılabilir.',
        },
        {
          q: 'Hasta yorumuna yanıt verirken nelere dikkat etmeliyim?',
          a: 'Yanıtta hastanın tanısından, tedavisinden ya da kimlik bilgilerinden söz etmeyin. Kısa bir teşekkür ve iletişim daveti çoğu durumda yeterlidir; ayrıntıları telefonda ya da yüz yüze konuşun.',
        },
        {
          q: 'Düşük puan veren hasta Google’da yorum yazabilir mi?',
          a: 'Evet. Eşiğin altında puan veren hasta önce size özel geri bildirim yazabilir; Google yorum bağlantısı aynı ekranda görünür ve hasta isterse oradan herkese açık yorum yazar. Buaze yorum silmez, gizlemez veya değiştirmez.',
        },
      ],
    },
    ctaTitle: 'Hasta geri bildirimini kliniğinizin her bölümünde toplayın',
  },
  en: {
    name: 'Healthcare clinics',
    meta: {
      title: 'QR patient feedback for healthcare clinics',
      description:
        'QR codes for clinic departments: patients rate their visit and can write to you first below your threshold. No health questions; IPs anonymised after 90 days.',
    },
    eyebrow: 'Healthcare clinics',
    h1: 'QR patient feedback for healthcare clinics',
    lead:
      'In a clinic, the patient’s experience is shaped by booking, waiting time and how the team communicates. With QR codes in each department, patients rate these before they leave; at or above your threshold your Google review page opens, and below it the patient can write to you first and sees the public review link on the same screen.',
    flow: {
      title: 'How QR feedback works in a clinic',
      steps: [
        {
          title: 'Create QR codes for each department',
          body:
            'Create a separate QR code for each department’s waiting area and give it a label (for example Cardiology, Lab or Floor2). The label shows in the low-rating e-mail and the CSV file, so you know which department a complaint came from.',
        },
        {
          title: 'The patient gives a rating',
          body:
            'The patient scans the QR code and gives 1–5 stars. At or above the threshold you set (5 stars by default), your Google review page opens. Below it, the patient can first send you private feedback; the public review link is shown on the same screen.',
        },
        {
          title: 'Follow up the same day',
          body:
            'Every 1–3★ piece of feedback sends you an instant e-mail with the department label. If the patient left an e-mail address, you reply by e-mail; details are often better discussed by phone or in person.',
        },
      ],
    },
    placements: {
      title: 'Where to put the QR code in a clinic',
      lead: 'A QR code works best where patients wait for a short while after their visit is done.',
      items: [
        {
          title: 'Checkout and front desk',
          body:
            'Patients see the QR code as they leave the consultation and finish their paperwork at the front desk. It is the most natural moment to rate the whole visit.',
        },
        {
          title: 'Department waiting areas',
          body:
            'A labelled QR code in each department’s waiting area keeps feedback separate by department. Comments about waiting times are usually written here, too.',
        },
        {
          title: 'Information leaflets and result envelopes',
          body:
            'A QR code printed on the back of an information leaflet or a results envelope lets patients rate their visit at home as well.',
        },
        {
          title: 'Physiotherapy and session rooms',
          body:
            'For patients who come for several sessions, a QR code in the treatment room makes it easy to share their experience during the course of treatment.',
        },
      ],
      tip:
        'You can use the “Table number” field as a department label; it takes letters, numbers and hyphens, without spaces or accented letters. Never put a patient’s name, file number or other personal details in the label.',
    },
    uses: {
      title: 'Panel features that help a clinic',
      items: [
        {
          icon: Stethoscope,
          title: 'Panel wording that fits a clinic',
          body:
            'When you pick “Clinic & Health” as your industry, the panel’s labels change to suit a clinic: “Reviews” becomes “Patient feedback”, “Customers” becomes “Patients”, and the QR Menu section is hidden.',
        },
        {
          icon: ShieldCheck,
          title: 'Replies are checked before they go out',
          body:
            'Before an e-mail reply goes to a patient, Buaze checks the text: replies containing a Turkish ID number, an IBAN or card number, insults or threats are not sent. With every reply you also confirm that you are responsible for its content.',
        },
        {
          icon: Mail,
          title: 'Alerts go to patient relations',
          body:
            'You choose the alert address in your business settings; enter your patient relations team’s address and every 1–3★ piece of feedback goes straight to them. If you leave it empty, your account e-mail is used.',
        },
        {
          icon: Building2,
          title: 'Several clinics in one account',
          body:
            'You add each clinic as a separate business. The businesses table shows last-30-day review counts, average rating and pending low ratings side by side, and you can give team members access to their own clinic only.',
        },
      ],
    },
    platforms: {
      title: 'Review platforms for healthcare clinics',
      lead:
        'When you pick “Clinic & Health” as your industry, the panel shows Google and Yandex links. At or above your threshold, the patient goes to your default platform; for most clinics that is the Google review page.',
      note:
        'Search for your Google Business Profile by name and select it, and Buaze builds the official “write a review” link. The Google Reviews page shows your rating, review count, up to 5 reviews Google returns and a 6-item profile checklist, with no Google sign-in.',
    },
    questions: {
      title: 'What to ask patients',
      lead:
        'The ready-made “After the appointment” template asks about the booking process, the team’s communication and willingness to recommend, and its open question asks patients not to include health details. When you add your own questions, don’t ask about diagnoses, treatment or medication either.',
      items: [
        { text: 'How would you rate the booking process?', type: 'rating' },
        { text: 'How long did you wait before your consultation?', type: 'multiple_choice' },
        { text: 'How would you rate the time your doctor spent with you?', type: 'rating' },
        { text: 'How would you rate the cleanliness of our clinic?', type: 'rating' },
        { text: 'How likely are you to recommend our clinic to someone close to you?', type: 'nps' },
      ],
      audits: [
        {
          title: 'Nurse / assistant conduct quiz',
          body: 'Questions on communication, patient privacy and emergencies for new nurse and assistant candidates.',
        },
        {
          title: 'Clinic welcome experience review',
          body: 'Reviews how the front office greets, informs and directs patients.',
        },
        {
          title: 'KVKK patient data self-check',
          body: 'A monthly review of how patient data is accessed and stored; it does not replace legal advice.',
        },
      ],
    },
    privacy: {
      title: 'Health data, KVKK and advertising rules',
      paragraphs: [
        'The feedback form asks no health questions; name and e-mail are optional. The comment box is free text, though, and patients may mention their diagnosis or treatment. Health data is a special category of personal data, so limit access to feedback to the team members who need it.',
        'The form records the KVKK privacy notice acknowledgement; marketing consent is a separate box and is unticked by default. Consents are logged, and IP addresses are anonymised after 90 days.',
        'The database is kept in the EU (Frankfurt); some service providers, such as e-mail delivery and AI, are in the US and are listed in the data processing agreement. For the AI features (Pulse AI drafts, feedback summaries, the highlighted topics in analytics and the weekly summary e-mail), feedback text is sent to OpenAI. You can ask our support team to switch these features off for your clinic, and you may prefer to write replies to comments with health details yourself.',
        'Advertising by healthcare providers is separately regulated. Check with your legal adviser before using patient reviews on your website or in ads, and for your organisation’s own privacy-notice obligations.',
      ],
    },
    faq: {
      title: 'Healthcare clinic FAQ',
      items: [
        {
          q: 'Can I get reports per doctor or department?',
          a: 'There are no per-doctor or per-department reports. If you create separately labelled QR codes for departments, the label shows in the low-rating e-mail and the CSV file; the analytics screens cover the whole clinic.',
        },
        {
          q: 'Does it connect to our booking or hospital information system?',
          a: 'No. Buaze doesn’t connect to booking or hospital information systems and doesn’t send patients surveys by SMS or e-mail. Patients scan the QR code at the clinic or from a document you give them.',
        },
        {
          q: 'Does a patient need an account to fill in the form?',
          a: 'No. The patient scans the QR code and gives a rating; name and e-mail are optional. Patients who want a reply leave their e-mail address; otherwise your reply stays on record in the panel.',
        },
        {
          q: 'Which languages is the patient form in?',
          a: 'The form is available in Turkish and English and opens based on the language of the patient’s phone; there is no form in other languages. For patients from abroad, the English form and English Pulse AI drafts are available.',
        },
        {
          q: 'What should I keep in mind when replying to a patient?',
          a: 'Don’t mention the patient’s diagnosis, treatment or identity in your reply. A short thank-you and an invitation to get in touch is usually enough; discuss the details by phone or in person.',
        },
        {
          q: 'Can a patient who gives a low rating still post on Google?',
          a: 'Yes. A patient who rates below your threshold can first send you private feedback; the Google review link is shown on the same screen, and they can post a public review from there if they want. Buaze doesn’t delete, hide or edit reviews.',
        },
      ],
    },
    ctaTitle: 'Collect patient feedback in every department of your clinic',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return buildSolutionMetadata({ locale, slug: SLUG, ...CONTENT[locale].meta });
}

export default async function HealthcareSolutionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return (
    <SolutionPageLayout
      locale={locale}
      slug={SLUG}
      sector="clinic"
      content={CONTENT[locale]}
      illustration={<IllusClinic />}
    />
  );
}
