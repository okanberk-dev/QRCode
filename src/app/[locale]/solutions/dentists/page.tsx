import type { Metadata } from 'next';
import { MapPin, Mail, Sparkles, Stethoscope } from 'lucide-react';
import SolutionPageLayout, { type SolutionPageContent } from '@/components/marketing/SolutionPageLayout';
import { IllusDentist } from '@/components/marketing/solution-illustrations';
import { buildSolutionMetadata } from '@/lib/solution-schema';
import type { Locale } from '@/lib/translations';

// ISR: inherits `revalidate = 3600` from `[locale]/layout.tsx` (CLAUDE.md
// §38.163). No request-time APIs here, so the page stays static.

const SLUG = 'dentists';

const CONTENT: Record<Locale, SolutionPageContent> = {
  tr: {
    name: 'Diş klinikleri',
    meta: {
      title: 'Diş klinikleri için QR ile hasta geri bildirimi',
      description:
        'Diş kliniğiniz için QR kod: hasta puan verir, eşiğin altındaki puanlarda önce size yazabilir. 1–3 yıldızlık her geri bildirimde anında e-posta alırsınız.',
    },
    eyebrow: 'Diş klinikleri',
    h1: 'Diş klinikleri için QR ile hasta geri bildirimi ve Google yorumları',
    lead:
      'Hasta muayeneden sonra kliniğinizdeki QR kodu okutur ve deneyimini puanlar. Eşik ve üzerindeki puanlar Google yorum sayfanıza gider; eşiğin altında hasta önce size yazabilir ve herkese açık yorum bağlantısını aynı ekranda görür.',
    flow: {
      title: 'Diş kliniğinde QR ile geri bildirim üç adımda işler',
      steps: [
        {
          title: 'QR kodunuzu oluşturun',
          body:
            'Panelde kliniğiniz için QR kod oluşturun ve Google yorum bağlantınızı ekleyin. Google İşletme Profilinizi adıyla aratıp seçmeniz yeterli; Buaze resmi “yorum yaz” bağlantısını sizin için hazırlar.',
        },
        {
          title: 'Hasta puan verir',
          body:
            'Hasta QR kodu okutur ve 1–5 yıldız verir. Belirlediğiniz eşik ve üzerindeki puanlarda (varsayılan 5 yıldız) Google yorum sayfanız açılır. Eşiğin altındaki puanlarda hasta önce size özel geri bildirim yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür.',
        },
        {
          title: 'Aynı gün yanıtlayın',
          body:
            '1–3 yıldızlık her geri bildirim için anında e-posta alırsınız. Hasta e-posta adresini bıraktıysa yanıtınızı e-postayla gönderirsiniz; Pulse AI isterseniz bir taslak hazırlar, göndermeye siz karar verirsiniz.',
        },
      ],
    },
    placements: {
      title: 'Diş kliniğinde QR kodu nereye koymalı',
      lead: 'QR kod en iyi, hastanın tedavisi bittikten sonra birkaç dakika durduğu yerde çalışır.',
      items: [
        {
          title: 'Ödeme ve randevu bankosu',
          body:
            'Hasta ödeme yaparken ya da bir sonraki randevusunu alırken birkaç dakika bekler. Bankodaki küçük bir standa konan QR kod, deneyim tazeyken puan vermeyi kolaylaştırır.',
        },
        {
          title: 'Bekleme salonu',
          body:
            'Kontrol randevusuna gelen hastalar önceki tedavileri hakkında rahatça görüş bildirebilir. QR kodu sehpaya ya da su sebilinin yanına koyabilirsiniz.',
        },
        {
          title: 'Tedavi sonrası bakım kartı',
          body:
            'Diş çekimi veya implant sonrası verdiğiniz bakım önerileri kartının arkasına QR kodu basın. Hasta evde, kendini daha iyi hissettiğinde de değerlendirme yapabilir.',
        },
        {
          title: 'Randevu hatırlatma kartı',
          body:
            'Bir sonraki kontrol tarihini yazdığınız kartta QR kod bulunsun. Hasta kartı sakladığı için QR kod da yanında kalır.',
        },
      ],
      tip:
        'Birden çok muayene odanız varsa her oda için ayrı QR oluşturabilirsiniz. QR oluştururken “Masa numarası” alanına “Oda-2” gibi bir etiket yazın (etikette boşluk ve Türkçe karakter kullanılmaz); bu etiket düşük puan e-postasında ve geri bildirim CSV dosyasında görünür.',
    },
    uses: {
      title: 'Diş kliniği panelinde işinize yarayanlar',
      items: [
        {
          icon: Mail,
          title: 'Düşük puanı aynı gün görün',
          body:
            '1–3 yıldızlık her geri bildirimde size anında e-posta gelir ve QR etiketi e-postada yer alır. Sorunun hangi odada ya da bankoda yaşandığını hemen anlarsınız.',
        },
        {
          icon: Sparkles,
          title: 'Yanıtı Pulse AI ile hazırlayın',
          body:
            'Pulse AI geri bildirime 2–4 cümlelik bir yanıt taslağı yazar; sıcak, resmi veya özür dileyen tonu seçersiniz. Taslağı düzenler ve onaylarsınız; hiçbir yanıt siz onaylamadan gönderilmez.',
        },
        {
          icon: Stethoscope,
          title: 'Kliniğe uygun panel dili',
          body:
            'Sektör olarak “Klinik & Sağlık”ı seçtiğinizde panel geri bildirimleri “Hasta geri bildirimleri”, müşteri listesini “Hastalar” olarak adlandırır ve QR Menü bölümünü gizler.',
        },
        {
          icon: MapPin,
          title: 'Google profilinizi tek ekranda görün',
          body:
            'Google Yorumları sayfasında Google puanınızı, yorum sayınızı, Google’ın gösterdiği en fazla 5 yorumu ve telefon, çalışma saatleri, fotoğraflar gibi 6 maddelik profil kontrol listesini görürsünüz. Google hesabıyla giriş gerekmez.',
        },
      ],
    },
    platforms: {
      title: 'Diş kliniklerinde öne çıkan yorum platformları',
      lead:
        'Sektör olarak “Klinik & Sağlık”ı seçtiğinizde panel Google ve Yandex bağlantılarını gösterir. Google yorum sayfanız çoğu klinik için ana hedeftir; Yandex Haritalar’da da profiliniz varsa onu ikinci platform olarak ekleyebilirsiniz.',
      note:
        'QR akışında hasta tek bir platforma gönderilir: QR kodda sabitlediğiniz platform ya da varsayılan platformunuz. Yandex bağlantınızı eklerseniz, özel geri bildirim gönderen hastanın teşekkür ekranında “Yandex Haritalarda paylaş” seçeneği de görünür.',
    },
    questions: {
      title: 'Hastalara ne sormalı',
      lead:
        'Yıldız puanı genel memnuniyeti gösterir. Neyi iyileştireceğinizi öğrenmek için kısa bir anket hazırlayıp aynı QR yöntemiyle paylaşabilirsiniz. Anketlerde sağlık bilgisi sormayın.',
      items: [
        { text: 'Randevu saatine uyulmasını nasıl değerlendirirsiniz?', type: 'rating' },
        { text: 'Tedavi öncesinde yapılan açıklamalar anlaşılır mıydı?', type: 'multiple_choice' },
        { text: 'Ücret hakkında işlemden önce bilgilendirildiniz mi?', type: 'multiple_choice' },
        { text: 'Kliniğimizi yakınlarınıza tavsiye etme olasılığınız nedir?', type: 'nps' },
        {
          text: 'Bir sonraki ziyaretinizi daha iyi hale getirmek için ne önerirsiniz? (Lütfen sağlık bilgisi yazmayın.)',
          type: 'long_text',
        },
      ],
      audits: [
        {
          title: 'Sterilizasyon & hijyen günlük kontrolü',
          body: 'Otoklav kaydı, eldiven ve maske stoku, tıbbi atık ayrıştırması gibi maddeleri her gün kontrol etmek için.',
        },
        {
          title: 'Klinik karşılama deneyimi değerlendirme',
          body: 'Resepsiyonun hastayı karşılama, bilgilendirme ve bekletme biçimini değerlendirmek için.',
        },
        {
          title: 'KVKK hasta verisi öz-denetim',
          body: 'Hasta dosyalarına erişim ve aydınlatma metni gibi konularda düzenli bir öz-denetim için; hukuki danışmanlığın yerini tutmaz.',
        },
      ],
    },
    privacy: {
      title: 'Hasta verisi ve KVKK',
      paragraphs: [
        'Geri bildirim formunda ad ve e-posta isteğe bağlıdır ve sağlık bilgisi soran bir alan yoktur. Yorum alanı ise serbest metindir; hasta tedavisiyle ilgili ayrıntı yazabilir. Sağlık verisi özel nitelikli kişisel veridir, bu yüzden hastalarınıza tedavi ayrıntısı yazmamalarını hatırlatın. Hazır “Randevu sonrası” anket şablonu, açık uçlu sorusunda bunu hastadan açıkça ister.',
        'Form gönderilirken KVKK aydınlatma onayı alınır; pazarlama izni ayrı bir kutudur ve varsayılan olarak işaretsizdir. Onaylar kayıt altına alınır, IP adresleri 90 gün sonra anonimleştirilir.',
        'Veritabanı AB’de (Frankfurt) tutulur. E-posta gönderimi ve yapay zekâ gibi bazı hizmet sağlayıcılar ABD’dedir ve Veri İşleyici Sözleşmesi’nde listelenir. Yapay zekâ özellikleri (Pulse AI taslakları, geri bildirim özetleri, analitikteki öne çıkan konular ve haftalık özet e-postası) için geri bildirim metni OpenAI’a gönderilir; bu özelliklerin işletmeniz için kapatılmasını destek ekibimizden isteyebilirsiniz.',
        'Sağlık kuruluşlarının tanıtım faaliyetleri ayrıca düzenlenmiştir. Hasta yorumlarını web sitenizde veya reklamlarınızda kullanmadan önce ve kliniğinizin kendi aydınlatma yükümlülükleri için hukuk danışmanınıza başvurun.',
      ],
    },
    faq: {
      title: 'Diş klinikleri için sık sorulan sorular',
      items: [
        {
          q: 'Hekim bazında rapor alabilir miyim?',
          a: 'Hayır, Buaze’de hekim veya personel bazında rapor yoktur. Her muayene odası için ayrı etiketli QR oluşturabilirsiniz; etiket düşük puan e-postasında ve CSV dosyasında görünür, analitik ekranları ise kliniğin tamamını gösterir.',
        },
        {
          q: 'Düşük puan veren hasta Google’da yorum yazabilir mi?',
          a: 'Evet. Eşiğin altında puan veren hasta önce size özel geri bildirim yazabilir; aynı ekranda Google yorum bağlantısı da görünür ve hasta isterse oradan herkese açık yorum yazar. Buaze yorum silmez, gizlemez veya değiştirmez.',
        },
        {
          q: 'Eşiği nasıl belirlerim?',
          a: 'Eşik 4 ya da 5 yıldız olabilir; varsayılan değer 5 yıldızdır. Eşiği panelden istediğiniz zaman değiştirebilirsiniz. QR kod Buaze sayfanızı açtığından, eşiği değiştirdiğinizde QR’ı yeniden basmanız gerekmez.',
        },
        {
          q: 'Yorum karşılığında indirim veya hediye sunabilir miyim?',
          a: 'Buaze yorum karşılığında indirim, hediye veya ödül sunmaz; Google da yorum karşılığı teşviki yasaklar. Anketlerde isteğe bağlı bir teşekkür kuponu gösterebilirsiniz, ancak bu kupon herkese açık yorum yazmaya bağlanmamalıdır.',
        },
        {
          q: 'Hasta formu hangi dilde görür?',
          a: 'Form, hastanın telefon diline göre Türkçe veya İngilizce açılır. Pulse AI taslakları da Türkçe veya İngilizce hazırlanır.',
        },
        {
          q: 'Birden çok şubemiz var; hepsini tek hesaptan yönetebilir miyim?',
          a: 'Evet. Her şubeyi ayrı işletme olarak eklersiniz. İşletmeler tablosunda son 30 günün yorum sayısını, ortalama puanı, bekleyen düşük puanları ve bağlantı sağlığını yan yana görürsünüz. Ekip üyelerine yönetici, personel veya görüntüleyici rolü verip yalnızca ilgili şubeye erişim tanıyabilirsiniz.',
        },
        {
          q: 'Hasta e-posta bırakmazsa yanıt verebilir miyim?',
          a: 'Yanıtınızı panelde kayıt olarak tutabilirsiniz, ancak hastaya iletilmez. Yanıtın e-postayla gitmesi için hastanın formda e-posta adresini bırakmış olması gerekir.',
        },
      ],
    },
    ctaTitle: 'Kliniğinizde hasta geri bildirimi toplamaya başlayın',
  },
  en: {
    name: 'Dental clinics',
    meta: {
      title: 'QR patient feedback and reviews for dental clinics',
      description:
        'QR codes for dental clinics: patients rate their visit, and below your threshold they can write to you first. Get an instant e-mail for every 1–3★ rating.',
    },
    eyebrow: 'Dental clinics',
    h1: 'QR codes for patient feedback and Google reviews at dental clinics',
    lead:
      'After their appointment, patients scan the QR code in your clinic and rate their visit. Ratings at or above your threshold go to your Google review page; below it, the patient can write to you first and sees the public review link on the same screen.',
    flow: {
      title: 'Patient feedback by QR code works in three steps',
      steps: [
        {
          title: 'Create your QR code',
          body:
            'Create a QR code for your clinic in the panel and add your Google review link. Search for your Google Business Profile by name and pick it; Buaze builds the official “write a review” link for you.',
        },
        {
          title: 'The patient gives a rating',
          body:
            "The patient scans the QR code and gives 1–5 stars. At or above the threshold you set (5 stars by default), your Google review page opens. Below it, the patient can first send you private feedback; the public review link is shown on the same screen.",
        },
        {
          title: 'Reply the same day',
          body:
            'You get an instant e-mail for every 1–3★ piece of feedback. If the patient left an e-mail address, you reply by e-mail; Pulse AI can prepare a draft if you want, and you decide whether to send it.',
        },
      ],
    },
    placements: {
      title: 'Where to put the QR code in a dental clinic',
      lead: 'A QR code works best where patients pause for a few minutes after their treatment.',
      items: [
        {
          title: 'Payment and booking desk',
          body:
            'Patients wait a few minutes while they pay or book their next appointment. A QR code on a small stand at the desk makes it easy to rate the visit while it is still fresh.',
        },
        {
          title: 'Waiting room',
          body:
            'Patients coming in for a check-up can comfortably comment on their earlier treatment. Place the QR code on the coffee table or next to the water dispenser.',
        },
        {
          title: 'Aftercare card',
          body:
            'Print the QR code on the back of the aftercare card you hand out after an extraction or an implant. Patients can rate their visit at home, once they feel better.',
        },
        {
          title: 'Appointment reminder card',
          body:
            'Add the QR code to the card where you write the next check-up date. Patients keep the card, so the QR code stays with them.',
        },
      ],
      tip:
        'If you have several treatment rooms, create a separate QR code for each. When you create one, type a label such as “Room-2” in the “Table number” field (labels can’t contain spaces or accented letters); the label appears in the low-rating e-mail and in the feedback CSV file.',
    },
    uses: {
      title: 'Panel features that help a dental clinic',
      items: [
        {
          icon: Mail,
          title: 'See low ratings the same day',
          body:
            'Every 1–3★ piece of feedback sends you an instant e-mail that includes the QR label, so you know right away which room or desk it came from.',
        },
        {
          icon: Sparkles,
          title: 'Draft replies with Pulse AI',
          body:
            'Pulse AI writes a 2–4 sentence reply draft, and you choose a warm, formal or apologetic tone. You edit and approve it; no reply is sent without you.',
        },
        {
          icon: Stethoscope,
          title: 'Panel wording that fits a clinic',
          body:
            'When you pick “Clinic & Health” as your industry, the panel calls feedback “Patient feedback” and the customer list “Patients”, and hides the QR Menu section.',
        },
        {
          icon: MapPin,
          title: 'Your Google profile on one screen',
          body:
            "The Google Reviews page shows your Google rating, review count, up to 5 reviews Google returns and a 6-item profile checklist covering phone, opening hours, photos and more. No Google sign-in needed.",
        },
      ],
    },
    platforms: {
      title: 'Review platforms that matter for dental clinics',
      lead:
        'When you pick “Clinic & Health” as your industry, the panel shows Google and Yandex links. Your Google review page is the main target for most clinics; if you also have a profile on Yandex Maps, add it as a second platform.',
      note:
        'In the QR flow the patient is sent to one platform: the one pinned to the QR code, or your default platform. If you add your Yandex link, patients who send private feedback also see a “Share on Yandex Maps” option on the thank-you screen.',
    },
    questions: {
      title: 'What to ask patients',
      lead:
        "A star rating shows overall satisfaction. To learn what to improve, build a short survey and share it the same way, with a QR code. Don’t ask about health in surveys.",
      items: [
        { text: 'How would you rate how well we kept to your appointment time?', type: 'rating' },
        { text: 'Were the explanations before your treatment clear?', type: 'multiple_choice' },
        { text: 'Were you told about the cost before the procedure?', type: 'multiple_choice' },
        { text: 'How likely are you to recommend our clinic to friends and family?', type: 'nps' },
        {
          text: "What would make your next visit better? (Please don’t include health details.)",
          type: 'long_text',
        },
      ],
      audits: [
        {
          title: 'Daily sterilisation and hygiene check',
          body: 'A daily check of items such as the autoclave log, glove and mask stock, and medical waste separation.',
        },
        {
          title: 'Clinic welcome experience review',
          body: 'Reviews how reception greets, informs and seats patients.',
        },
        {
          title: 'KVKK patient data self-check',
          body: 'A regular self-check of access to patient files and your privacy notice; it does not replace legal advice.',
        },
      ],
    },
    privacy: {
      title: 'Patient data and KVKK',
      paragraphs: [
        "Name and e-mail are optional on the feedback form, and no field asks about health. The comment box is free text, though, and patients may write about their treatment. Health data is a special category of personal data, so remind patients not to include treatment details. The ready-made “After the appointment” survey template asks for exactly that in its open question.",
        'The form records the KVKK privacy notice acknowledgement; marketing consent is a separate box and is unticked by default. Consents are logged, and IP addresses are anonymised after 90 days.',
        'The database is kept in the EU (Frankfurt). Some service providers, such as e-mail delivery and AI, are in the US and are listed in the data processing agreement. For the AI features (Pulse AI drafts, feedback summaries, the highlighted topics in analytics and the weekly summary e-mail), feedback text is sent to OpenAI; you can ask our support team to switch these features off for your business.',
        "Advertising by healthcare providers is separately regulated. Check with your legal adviser before using patient reviews on your website or in ads, and for your clinic’s own privacy-notice obligations.",
      ],
    },
    faq: {
      title: 'Dental clinic FAQ',
      items: [
        {
          q: 'Can I get reports per dentist?',
          a: 'No, Buaze has no per-dentist or per-staff reports. You can create a labelled QR code for each treatment room; the label shows in the low-rating e-mail and the CSV file, while the analytics screens cover the whole clinic.',
        },
        {
          q: 'Can a patient who gives a low rating still post on Google?',
          a: "Yes. A patient who rates below your threshold can first send you private feedback, and the Google review link is shown on the same screen; they can post a public review from there if they want. Buaze doesn’t delete, hide or edit reviews.",
        },
        {
          q: 'How do I set the threshold?',
          a: "The threshold can be 4 or 5 stars; the default is 5 stars. You can change it in the panel at any time. The QR code opens your Buaze page, so you don’t need to reprint it.",
        },
        {
          q: 'Can I offer a discount or gift for a review?',
          a: "Buaze doesn’t offer discounts, gifts or rewards for reviews, and Google prohibits incentives for reviews. Surveys can show an optional thank-you coupon, but it must not be tied to posting a public review.",
        },
        {
          q: 'Which language does the patient see?',
          a: "The form opens in Turkish or English, based on the language of the patient’s phone. Pulse AI drafts are written in Turkish or English too.",
        },
        {
          q: 'We have several branches. Can I manage them all from one account?',
          a: 'Yes. You add each branch as a separate business. The businesses table shows last-30-day review counts, average rating, pending low ratings and link health side by side. You can give team members a manager, staff or viewer role and limit them to their own branch.',
        },
        {
          q: "Can I reply if the patient didn’t leave an e-mail address?",
          a: "You can keep your reply on record in the panel, but it won’t reach the patient. To send a reply by e-mail, the patient needs to have left an e-mail address on the form.",
        },
      ],
    },
    ctaTitle: 'Start collecting patient feedback at your clinic',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return buildSolutionMetadata({ locale, slug: SLUG, ...CONTENT[locale].meta });
}

export default async function DentistsSolutionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return (
    <SolutionPageLayout
      locale={locale}
      slug={SLUG}
      sector="clinic"
      content={CONTENT[locale]}
      illustration={<IllusDentist />}
    />
  );
}
