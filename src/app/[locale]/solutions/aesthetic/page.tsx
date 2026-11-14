import type { Metadata } from 'next';
import { BarChart3, Sparkles, UserRoundCheck, Users } from 'lucide-react';
import SolutionPageLayout, { type SolutionPageContent } from '@/components/marketing/SolutionPageLayout';
import { IllusAesthetic } from '@/components/marketing/solution-illustrations';
import { buildSolutionMetadata } from '@/lib/solution-schema';
import type { Locale } from '@/lib/translations';

// ISR: inherits `revalidate = 3600` from `[locale]/layout.tsx` (CLAUDE.md
// §38.163). No request-time APIs here, so the page stays static.

const SLUG = 'aesthetic';

const CONTENT: Record<Locale, SolutionPageContent> = {
  tr: {
    name: 'Estetik klinikler',
    meta: {
      title: 'Estetik klinikler için QR ile hasta geri bildirimi',
      description:
        'Estetik kliniğiniz için QR kod: hasta kontrol randevusunda puan verir, eşiğin altında önce size yazabilir. Ad ve e-posta isteğe bağlıdır. 14 gün ücretsiz.',
    },
    eyebrow: 'Estetik klinikler',
    h1: 'Estetik klinikler için QR ile hasta geri bildirimi ve Google yorumları',
    lead:
      'Estetik uygulamalarda sonuç zamanla netleşir; geri bildirimi istemek için en doğru an çoğu zaman kontrol randevusudur. Hasta QR kodu okutup puan verir. Eşiğin altındaki puanlarda adını ya da e-postasını paylaşmadan önce size yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür.',
    flow: {
      title: 'Estetik kliniğinizde QR ile geri bildirim nasıl işler',
      steps: [
        {
          title: 'Kontrol randevusu için QR hazırlayın',
          body:
            'Panelde kliniğiniz için QR kod oluşturun ve Google yorum bağlantınızı ekleyin. Kontrol randevusunda vereceğiniz kart ya da resepsiyondaki stant için ayrı, etiketli QR kodlar hazırlayabilirsiniz.',
        },
        {
          title: 'Hasta puan verir',
          body:
            'Hasta QR kodu okutup 1–5 yıldız verir. Puan belirlediğiniz eşik ya da üzerindeyse (varsayılan 5 yıldız) Google yorum sayfanız açılır. Eşiğin altındaysa hasta önce size özel olarak yazabilir; herkese açık yorum bağlantısı da aynı ekranda yer alır.',
        },
        {
          title: 'Özenle yanıtlayın',
          body:
            '1–3 yıldızlık geri bildirimlerde anında e-posta alırsınız; hasta e-posta bıraktıysa yanıtınızı e-postayla gönderirsiniz. Buaze yanıtı göndermeden önce kontrol eder: tehdit, hakaret ya da T.C. kimlik numarası gibi kişisel veri içeren yanıtlar gönderilmez.',
        },
      ],
    },
    placements: {
      title: 'Estetik klinikte QR kodu nereye koymalı',
      lead:
        'Uygulamanın hemen ardından hasta sonucu henüz göremeyebilir. QR kodu, sonucu değerlendirebileceği anlara yakın yerlere koyun.',
      items: [
        {
          title: 'Kontrol randevusu',
          body:
            'Sonucu birlikte değerlendirdiğiniz kontrol görüşmesinin sonunda QR kodlu bir kart verin. Hasta süreci bir bütün olarak değerlendirebilir.',
        },
        {
          title: 'Bakım önerileri broşürü',
          body:
            'Uygulama sonrası verdiğiniz bakım broşürünün son sayfasına QR kodu ekleyin. Hasta değerlendirmeyi kendi zamanında, evden yapabilir.',
        },
        {
          title: 'Resepsiyon ve ödeme alanı',
          body:
            'Ödeme sırasında QR kod hastanın gözünün önünde olsun. Randevu, karşılama ve bekleme süresiyle ilgili görüşleri burada almak kolaydır.',
        },
        {
          title: 'Danışma odası çıkışı',
          body:
            'Ön görüşmeye gelip henüz karar vermemiş kişiler de danışma deneyimini puanlayabilir. Bu geri bildirim, danışma sürecinizdeki eksikleri görmenizi sağlar.',
        },
      ],
      tip:
        'Kontrol randevusu kartı ile resepsiyondaki stant için ayrı QR kodlar oluşturun. QR oluştururken “Masa numarası” alanına “Kontrol” veya “Resepsiyon” gibi bir etiket yazarsanız etiket düşük puan e-postasında ve CSV dosyasında görünür.',
    },
    uses: {
      title: 'Estetik kliniğe uygun panel araçları',
      items: [
        {
          icon: UserRoundCheck,
          title: 'Kimlik paylaşmak isteğe bağlı',
          body:
            'Formda ad ve e-posta zorunlu değildir. Kimliğini paylaşmak istemeyen hasta da görüşünü iletebilir; yanıt almak isteyen e-posta adresini bırakır.',
        },
        {
          icon: Sparkles,
          title: 'Pulse AI taslağı, son söz sizde',
          body:
            'Pulse AI geri bildirime 2–4 cümlelik bir yanıt taslağı hazırlar. Hassas konularda taslağı kendi ifadenizle düzenler, sonra onaylarsınız; hiçbir yanıt siz onaylamadan gönderilmez.',
        },
        {
          icon: BarChart3,
          title: 'Dönem dönem karşılaştırın',
          body:
            'Son 7, 30 veya 90 gün ya da 12 ay için ortalama puanı, geri bildirim sayısını ve ortalama yanıt sürenizi görürsünüz. Gün ve saat dağılımı, geri bildirimlerin hangi gün ve saatlerde yoğunlaştığını gösterir.',
        },
        {
          icon: Users,
          title: 'Ekip rolleri',
          body:
            'Hekimlere, asistanlara ve resepsiyona yönetici, personel veya görüntüleyici rolü verin. Davetler e-postayla gider ve 7 gün geçerlidir; görüntüleyici rolündeki kişi yalnızca okuyabilir.',
        },
      ],
    },
    platforms: {
      title: 'Estetik kliniklerde öne çıkan yorum platformları',
      lead:
        'Sektör olarak “Klinik & Sağlık”ı seçtiğinizde panel Google ve Yandex bağlantılarını gösterir. QR akışında Google’ı varsayılan platform yapmanızı öneririz; Yandex Haritalar’da da profiliniz varsa onu ikinci platform olarak ekleyebilirsiniz.',
      note:
        'Instagram profil bağlantınızı panelde saklayabilirsiniz, ancak Instagram bir yorum platformu değildir ve QR akışında gösterilmez. Hastalarınız herkese açık yorumlarını Google veya Yandex’te yazar.',
    },
    questions: {
      title: 'Estetik klinik hastalarına ne sormalı',
      lead:
        'Anketlerde uygulamanın kendisini veya sağlık durumunu değil, hizmet deneyimini sorun. Kısa anketler daha kolay tamamlanır.',
      items: [
        { text: 'Ön görüşmede size yapılan açıklamaları nasıl değerlendirirsiniz?', type: 'rating' },
        { text: 'Süreç boyunca sorularınıza ne kadar hızlı yanıt aldınız?', type: 'multiple_choice' },
        { text: 'Kliniğimizde kendinizi rahat hissettiniz mi?', type: 'multiple_choice' },
        { text: 'Bizi bir yakınınıza önerme olasılığınız nedir?', type: 'nps' },
        {
          text: 'Deneyiminizle ilgili eklemek istediğiniz bir şey var mı? (Lütfen sağlık bilgisi yazmayın.)',
          type: 'long_text',
        },
      ],
      audits: [
        {
          title: 'Müşteri konsültasyon akışı quiz',
          body: 'Danışma görüşmesini yürüten ekibin alerji sorgusu ve beklenti yönetimi gibi adımları bilip bilmediğini ölçmek için.',
        },
        {
          title: 'Klinik karşılama deneyimi değerlendirme',
          body: 'Karşılama, bilgilendirme ve bekleme süresini resepsiyon gözünden değerlendirmek için.',
        },
        {
          title: 'Sterilizasyon & hijyen günlük kontrolü',
          body: 'Uygulama odalarının hijyen ve sarf malzemesi kontrolünü her gün kayıt altına almak için.',
        },
      ],
    },
    privacy: {
      title: 'Hasta gizliliği ve KVKK',
      paragraphs: [
        'Estetik uygulamalar kişisel bir konudur ve bazı hastalar bunu paylaşmak istemez. Geri bildirim formunda ad ve e-posta isteğe bağlıdır. Google’da yorum yazmak ise tamamen hastanın kararıdır ve hastanın kendi Google hesabıyla yapılır; Buaze hasta adına hiçbir yerde yorum yayınlamaz.',
        'Formda sağlık bilgisi soran bir alan yoktur, ancak yorum alanına hasta istediğini yazabilir. Uygulama ayrıntısı içeren bir geri bildirimi yanıtlarken bu ayrıntıları tekrarlamayın. Form gönderilirken KVKK aydınlatma onayı alınır; pazarlama izni ayrıdır ve varsayılan olarak kapalıdır. IP adresleri 90 gün sonra anonimleştirilir.',
        'Veritabanı AB’de (Frankfurt) bulunur; e-posta gönderimi ve yapay zekâ gibi bazı hizmet sağlayıcılar ABD’dedir ve Veri İşleyici Sözleşmesi’nde listelenir. Yapay zekâ özellikleri (Pulse AI taslakları, geri bildirim özetleri, analitikteki öne çıkan konular ve haftalık özet e-postası) için geri bildirim metni OpenAI’a gönderilir; bu özelliklerin işletmeniz için kapatılmasını destek ekibimizden isteyebilirsiniz. Hasta yorumlarını tanıtımda kullanmadan önce sağlık tanıtım kurallarını hukuk danışmanınızla değerlendirin.',
      ],
    },
    faq: {
      title: 'Estetik klinikler için sık sorulan sorular',
      items: [
        {
          q: 'Uygulama türüne veya uzmana göre ayrı rapor alabilir miyim?',
          a: 'Hayır, Buaze’de uygulama türü veya uzman bazında rapor yoktur. Farklı noktalar için etiketli QR kodlar oluşturabilirsiniz; etiket düşük puan e-postasında ve CSV dosyasında görünür. Daha ayrıntılı geri bildirim için kısa bir anket hazırlayabilirsiniz; anketin sonuçları ayrı görünür. Ankette hangi uygulamanın yapıldığını değil, hizmet deneyimini sorun.',
        },
        {
          q: 'Uygulamadan birkaç hafta sonra hastaya otomatik mesaj gönderilebilir mi?',
          a: 'Hayır. Buaze hastalara mesaj göndermez ve zamanlanmış gönderim yapmaz. QR kodu kontrol randevusunda veya bakım broşüründe kullanırsınız; anket bağlantısını isterseniz kendi iletişim kanalınızdan da paylaşabilirsiniz.',
        },
        {
          q: 'Hasta adını vermeden geri bildirim bırakabilir mi?',
          a: 'Evet. Formda ad ve e-posta isteğe bağlıdır. E-posta bırakmayan hastaya yanıt iletilemez; yazdığınız yanıt panelde kayıt olarak kalır.',
        },
        {
          q: 'Düşük puan veren hasta Google’da yorum yazabilir mi?',
          a: 'Evet. Eşiğin altında puan veren hastaya önce size yazma seçeneği sunulur; Google yorum bağlantısı da aynı ekranda görünür. Hangisini kullanacağına hasta karar verir. Buaze hiçbir yorumu silmez, gizlemez veya değiştirmez.',
        },
        {
          q: 'Önce ve sonra fotoğraflarını geri bildirimle toplayabilir miyim?',
          a: 'Hayır. Geri bildirim formunda ve anketlerde fotoğraf yükleme alanı yoktur. Fotoğraf yükleme yalnızca Denetim Merkezi’nde, ekibinizin iç kontrolleri için bulunur.',
        },
        {
          q: 'Eşiği 4 yıldıza indirebilir miyim?',
          a: 'Evet. Eşik 4 veya 5 yıldız olabilir; varsayılan değer 5 yıldızdır. 4 yıldızı seçerseniz 4 ve 5 yıldız veren hastalar doğrudan Google yorum sayfanıza gider; diğerleri önce size yazabilir ve herkese açık bağlantıyı aynı ekranda görür.',
        },
      ],
    },
    ctaTitle: 'Kontrol randevularında geri bildirim toplamaya başlayın',
  },
  en: {
    name: 'Aesthetic clinics',
    meta: {
      title: 'QR feedback and reviews for aesthetic clinics',
      description:
        'QR codes for aesthetic clinics: patients rate their care at the follow-up visit and can write to you first below your threshold. Name and e-mail are optional.',
    },
    eyebrow: 'Aesthetic clinics',
    h1: 'QR codes for patient feedback and Google reviews at aesthetic clinics',
    lead:
      'Results of aesthetic treatments take time to show, so the follow-up visit is often the right moment to ask for feedback. The patient scans the QR code and gives a rating. Below your threshold, they can write to you first without sharing a name or e-mail address; the public review link is shown on the same screen.',
    flow: {
      title: 'How QR feedback works at an aesthetic clinic',
      steps: [
        {
          title: 'Prepare a QR code for follow-up visits',
          body:
            'Create a QR code for your clinic in the panel and add your Google review link. You can make separate, labelled QR codes for the card you hand out at follow-up visits and for the stand at reception.',
        },
        {
          title: 'The patient gives a rating',
          body:
            'The patient scans the QR code and gives 1–5 stars. If the rating is at or above your threshold (5 stars by default), your Google review page opens. If it is below, the patient can first write to you privately; the public review link is on the same screen.',
        },
        {
          title: 'Reply with care',
          body:
            'Every 1–3★ piece of feedback sends you an instant e-mail; if the patient left an e-mail address, you reply by e-mail. Buaze checks every reply before sending: replies with threats, insults or personal data such as Turkish ID numbers are not sent.',
        },
      ],
    },
    placements: {
      title: 'Where to put the QR code in an aesthetic clinic',
      lead:
        'Right after a treatment, patients may not see the result yet. Put the QR code where they can judge it.',
      items: [
        {
          title: 'Follow-up visit',
          body:
            'Hand out a card with the QR code at the end of the follow-up visit where you review the result together. Patients can rate the process as a whole.',
        },
        {
          title: 'Aftercare leaflet',
          body:
            'Add the QR code to the last page of the aftercare leaflet you give after a treatment. Patients can rate it in their own time, at home.',
        },
        {
          title: 'Reception and payment area',
          body:
            'Keep the QR code in view while patients pay. This is an easy place to collect feedback on booking, welcome and waiting time.',
        },
        {
          title: 'Consultation room exit',
          body:
            "People who came for a consultation but haven’t decided yet can rate the consultation too. Their feedback shows you where the consultation process falls short.",
        },
      ],
      tip:
        'Create separate QR codes for the follow-up card and the reception stand. If you type a label such as “Follow-up” or “Reception” in the “Table number” field when creating a QR code, the label shows in the low-rating e-mail and the CSV file.',
    },
    uses: {
      title: 'Panel tools that suit an aesthetic clinic',
      items: [
        {
          icon: UserRoundCheck,
          title: 'Sharing an identity is optional',
          body:
            "Name and e-mail aren’t required on the form. Patients who don’t want to share their identity can still give feedback; those who want a reply leave an e-mail address.",
        },
        {
          icon: Sparkles,
          title: 'Pulse AI drafts, you have the final word',
          body:
            'Pulse AI prepares a 2–4 sentence reply draft. On sensitive topics you rewrite it in your own words and then approve it; no reply is sent without you.',
        },
        {
          icon: BarChart3,
          title: 'Compare periods',
          body:
            'See average rating, feedback count and average reply time for the last 7, 30 or 90 days or 12 months. The day and hour breakdown shows when most feedback comes in.',
        },
        {
          icon: Users,
          title: 'Team roles',
          body:
            'Give doctors, assistants and reception a manager, staff or viewer role. Invitations go out by e-mail and last 7 days; viewers can only read.',
        },
      ],
    },
    platforms: {
      title: 'Review platforms that matter for aesthetic clinics',
      lead:
        'When you pick “Clinic & Health” as your industry, the panel shows Google and Yandex links. We recommend Google as the default platform in the QR flow; if you also have a profile on Yandex Maps, add it as a second platform.',
      note:
        "You can store your Instagram profile link in the panel, but Instagram isn’t a review platform and isn’t shown in the QR flow. Your patients write their public reviews on Google or Yandex.",
    },
    questions: {
      title: 'What to ask aesthetic clinic patients',
      lead:
        'In surveys, ask about the service experience, not the treatment itself or anyone’s health. Short surveys are easier to finish.',
      items: [
        { text: 'How would you rate the explanations you were given at the consultation?', type: 'rating' },
        { text: 'How quickly were your questions answered during the process?', type: 'multiple_choice' },
        { text: 'Did you feel comfortable at our clinic?', type: 'multiple_choice' },
        { text: 'How likely are you to recommend us to someone close to you?', type: 'nps' },
        {
          text: "Is there anything you’d like to add about your experience? (Please don’t include health details.)",
          type: 'long_text',
        },
      ],
      audits: [
        {
          title: 'Customer consultation flow quiz',
          body: 'Checks that the team running consultations knows steps such as the allergy check and managing expectations.',
        },
        {
          title: 'Clinic welcome experience review',
          body: 'Reviews welcome, information and waiting time from the reception desk’s point of view.',
        },
        {
          title: 'Daily sterilisation and hygiene check',
          body: 'Records the daily hygiene and supplies check of treatment rooms.',
        },
      ],
    },
    privacy: {
      title: 'Patient privacy and KVKK',
      paragraphs: [
        "Aesthetic treatments are personal, and some patients prefer not to talk about them. Name and e-mail are optional on the feedback form. Writing a Google review is entirely the patient’s choice and is done with their own Google account; Buaze never publishes a review on a patient’s behalf.",
        "No field on the form asks about health, but patients can write anything in the comment box. When you reply to feedback that mentions a treatment, don’t repeat those details. The form records the KVKK privacy notice acknowledgement; marketing consent is separate and off by default. IP addresses are anonymised after 90 days.",
        'The database is in the EU (Frankfurt); some service providers, such as e-mail delivery and AI, are in the US and are listed in the data processing agreement. For the AI features (Pulse AI drafts, feedback summaries, the highlighted topics in analytics and the weekly summary e-mail), feedback text is sent to OpenAI; you can ask our support team to switch these features off for your business. Before using patient reviews in promotion, review the healthcare advertising rules with your legal adviser.',
      ],
    },
    faq: {
      title: 'Aesthetic clinic FAQ',
      items: [
        {
          q: 'Can I get separate reports per treatment or specialist?',
          a: 'No, Buaze has no per-treatment or per-specialist reports. You can create labelled QR codes for different spots; the label shows in the low-rating e-mail and the CSV file. For more detailed feedback, build a short survey; its results are shown separately. Ask about the service experience, not about which treatment was done.',
        },
        {
          q: 'Can patients get an automatic message a few weeks after their treatment?',
          a: "No. Buaze doesn’t send messages to patients and has no scheduled sending. You use the QR code at the follow-up visit or in the aftercare leaflet, and you can share a survey link through your own channels.",
        },
        {
          q: 'Can a patient leave feedback without giving a name?',
          a: "Yes. Name and e-mail are optional on the form. A reply can’t reach a patient who left no e-mail address; it stays on record in the panel.",
        },
        {
          q: 'Can a patient who gives a low rating still post on Google?',
          a: "Yes. A patient who rates below your threshold is offered the option to write to you first, and the Google review link is shown on the same screen. The patient decides which to use. Buaze doesn’t delete, hide or edit any review.",
        },
        {
          q: 'Can I collect before-and-after photos with feedback?',
          a: 'No. The feedback form and surveys have no photo upload. Photo upload exists only in the Audit Center, for your team’s internal checks.',
        },
        {
          q: 'Can I lower the threshold to 4 stars?',
          a: 'Yes. The threshold can be 4 or 5 stars; the default is 5 stars. With 4 stars, patients who give 4 or 5 stars go straight to your Google review page; the rest can write to you first and see the public link on the same screen.',
        },
      ],
    },
    ctaTitle: 'Start collecting feedback at follow-up visits',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return buildSolutionMetadata({ locale, slug: SLUG, ...CONTENT[locale].meta });
}

export default async function AestheticSolutionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return (
    <SolutionPageLayout
      locale={locale}
      slug={SLUG}
      sector="clinic"
      content={CONTENT[locale]}
      illustration={<IllusAesthetic />}
    />
  );
}
