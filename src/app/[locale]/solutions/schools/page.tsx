import type { Metadata } from 'next';
import { Building2, ClipboardList, Mail, Users } from 'lucide-react';
import SolutionPageLayout, { type SolutionPageContent } from '@/components/marketing/SolutionPageLayout';
import { IllusSchool } from '@/components/marketing/solution-illustrations';
import { buildSolutionMetadata } from '@/lib/solution-schema';
import type { Locale } from '@/lib/translations';

// ISR: inherits `revalidate = 3600` from `[locale]/layout.tsx` (CLAUDE.md
// §38.163). No request-time APIs here, so the page stays static.

const SLUG = 'schools';

const CONTENT: Record<Locale, SolutionPageContent> = {
  tr: {
    name: 'Okullar ve kurslar',
    meta: {
      title: 'Okullar ve kurslar için QR ile veli geri bildirimi',
      description:
        'Okul ve kurslar için QR kod: veliler ve yetişkin katılımcılar puan verir, eşiğin altında önce size yazabilir. Sınıf ya da kurs başına ayrı anket hazırlayın.',
    },
    eyebrow: 'Okullar ve kurslar',
    h1: 'Okullar ve kurslar için QR ile veli geri bildirimi ve Google yorumları',
    lead:
      'Okulda geri bildirimi veliden, kursta yetişkin katılımcıdan isteyin. Veli toplantısında ya da kayıt ofisinde okutulan QR kod iletişim, güvenlik ve eğitim kalitesiyle ilgili görüşleri size ulaştırır; eşik ve üzerindeki puanlar Google yorum sayfanıza gider.',
    flow: {
      title: 'Okul ve kurslarda QR ile geri bildirim nasıl işler',
      steps: [
        {
          title: 'Velilere yönelik QR hazırlayın',
          body:
            'Panelde okulunuz için QR kod oluşturun ve Google yorum bağlantınızı ekleyin. Veli toplantısı, kayıt ofisi veya okul etkinlikleri için ayrı, etiketli QR kodlar hazırlayabilirsiniz.',
        },
        {
          title: 'Veli puan verir',
          body:
            'Veli QR kodu okutup 1–5 yıldız verir. Belirlediğiniz eşik ve üzerindeki puanlarda (varsayılan 5 yıldız) Google yorum sayfanız açılır. Eşiğin altında veli önce size özel geri bildirim yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür.',
        },
        {
          title: 'Yanıtlayın ve gidişatı izleyin',
          body:
            '1–3 yıldızlık geri bildirimde anında e-posta alırsınız ve veli e-posta bıraktıysa yanıtınızı e-postayla gönderirsiniz. Geri bildirim gelen haftalarda pazartesi günleri gelen özet, dönem boyunca gidişatı izlemenizi kolaylaştırır.',
        },
      ],
    },
    placements: {
      title: 'Okulda QR kodu nereye koymalı',
      lead: 'QR kodu öğrencilerin değil, velilerin göreceği yerlere koyun.',
      items: [
        {
          title: 'Veli toplantısı',
          body:
            'Toplantının sonunda dağıttığınız bilgilendirme notuna QR kodu ekleyin. Veli, öğretmenle görüştükten hemen sonra görüşünü iletebilir.',
        },
        {
          title: 'Kayıt ve danışma ofisi',
          body:
            'Kayıt görüşmesine gelen veliler okulu tanıtma ve bilgilendirme sürecini burada puanlayabilir.',
        },
        {
          title: 'Karne zarfı ve dönem sonu bülteni',
          body:
            'Karne zarfına ya da velilere gönderdiğiniz dönem sonu bültenine QR kodu basın; değerlendirme dönemin tamamını kapsar.',
        },
        {
          title: 'Kurs sertifikası ve sınıf kapısı',
          body:
            'Yetişkinlere yönelik kurslarda katılımcı, kursu bitirdiğinde sertifikasındaki ya da sınıf kapısındaki QR kodu okutabilir.',
        },
      ],
      tip:
        'Anaokulu, ilkokul veya kurs merkezi gibi farklı birimleriniz varsa her biri için ayrı QR oluşturup “Masa numarası” alanına birimin kısa adını yazın (ör. Anaokulu, Kurs-1; etikette boşluk ve Türkçe karakter kullanılmaz). Etiket düşük puan e-postasında ve CSV dosyasında görünür.',
    },
    uses: {
      title: 'Okul yönetimine yarayan panel özellikleri',
      items: [
        {
          icon: ClipboardList,
          title: 'Sınıf ya da kurs başına anket',
          body:
            'Öğretmen bazında rapor yoktur; ayrıntılı görüş almak için her sınıf ya da kurs için ayrı bir anket hazırlayabilirsiniz. Her anketin sonuçları ve CSV dosyası ayrıdır.',
        },
        {
          icon: Mail,
          title: 'Haftalık özet',
          body:
            'Geri bildirim gelen haftalarda her pazartesi geçen haftayı özetleyen bir e-posta gelir; dönem boyunca değişimi düzenli olarak izlersiniz.',
        },
        {
          icon: Building2,
          title: 'Kampüsleri karşılaştırın',
          body:
            'Birden çok kampüsünüz veya şubeniz varsa işletmeler tablosunda her birinin son 30 günlük yorum sayısını, ortalama puanını ve bekleyen düşük puanlarını yan yana görürsünüz.',
        },
        {
          icon: Users,
          title: 'Doğru kişilere erişim',
          body:
            'Müdür yardımcılarına yönetici, rehberlik servisine görüntüleyici rolü verebilirsiniz. Her kişinin hangi kampüslere erişeceğini siz seçersiniz; görüntüleyici yalnızca okuyabilir.',
        },
      ],
    },
    platforms: {
      title: 'Okullar için yorum platformu',
      lead:
        'Kurulumda “Eğitim” sektörünü seçtiğinizde panel yalnızca Google bağlantısını gösterir. Okul araştıran veliler için asıl hedef, Google İşletme Profilinizdeki yorumlardır.',
      note:
        'Google İşletme Profilinizi panelden adıyla aratıp seçtiğinizde Buaze resmi “yorum yaz” bağlantısını oluşturur. Google Yorumları sayfasında puanınızı, yorum sayınızı ve 6 maddelik profil kontrol listesini görürsünüz.',
    },
    questions: {
      title: 'Velilere ne sormalı',
      lead:
        'Çocuğun kendisi hakkında değil, okulun hizmetleri hakkında soru sorun. Kısa ve çoktan seçmeli sorular velilerin ankete kolayca yanıt vermesini sağlar.',
      items: [
        { text: 'Öğretmenlerle iletişimi nasıl değerlendirirsiniz?', type: 'rating' },
        { text: 'Okuldan gelen duyuru ve bilgilendirmeler yeterli mi?', type: 'multiple_choice' },
        { text: 'Okul servisi ve yemek hizmetini nasıl değerlendirirsiniz?', type: 'rating' },
        { text: 'Okulumuzu başka bir veliye önerme olasılığınız nedir?', type: 'nps' },
        { text: 'Önümüzdeki dönem için önerileriniz nelerdir?', type: 'long_text' },
      ],
      audits: [
        {
          title: 'Yeni personel 1. gün oryantasyon kontrolü',
          body: 'Yeni başlayan öğretmen veya idari personelle ilk gün yapılacak kontroller için.',
        },
        {
          title: 'KVKK öz-denetim (işletme)',
          body: 'Veli ve öğrenci verileri için aydınlatma metni, açık rıza ve personel eğitimini düzenli olarak kontrol etmek için.',
        },
        {
          title: 'Müşteri deneyimi haftalık özet',
          body: 'Okul yöneticisinin her hafta geri bildirimlere bakarak dolduracağı kısa değerlendirme için.',
        },
      ],
    },
    privacy: {
      title: 'Çocukların verileri ve KVKK',
      paragraphs: [
        'Okullarda geri bildirimi velilerden isteyin. Çocukların kişisel verileri ek özen gerektirir: QR kodları öğrencilerin değil velilerin göreceği yerlere koyun ve anketlerde öğrencinin adını, sınıfını veya sağlık durumunu sormayın.',
        'Formda ad ve e-posta isteğe bağlıdır. Form gönderilirken KVKK aydınlatma onayı alınır; pazarlama izni ayrıdır ve varsayılan olarak kapalıdır. IP adresleri 90 gün sonra anonimleştirilir.',
        'Veritabanı AB’de (Frankfurt) tutulur; e-posta gönderimi ve yapay zekâ gibi bazı hizmet sağlayıcılar ABD’dedir ve Veri İşleyici Sözleşmesi’nde listelenir. Yapay zekâ özellikleri (Pulse AI taslakları, geri bildirim özetleri, analitikteki öne çıkan konular ve haftalık özet e-postası) için geri bildirim metni OpenAI’a gönderilir; bu özelliklerin işletmeniz için kapatılmasını destek ekibimizden isteyebilirsiniz. Okulunuzun kendi aydınlatma yükümlülükleri için hukuk danışmanınıza başvurun.',
      ],
    },
    faq: {
      title: 'Okullar ve kurslar için sık sorulan sorular',
      items: [
        {
          q: 'Öğrencilerden geri bildirim almalı mıyız?',
          a: 'Okul çağındaki öğrenciler için geri bildirimi velilerden istemenizi öneririz; çocukların kişisel verileri ek özen gerektirir. Yetişkinlere yönelik kurslarda ise katılımcılar değerlendirmeyi kendileri yapabilir.',
        },
        {
          q: 'Öğretmen bazında rapor alabilir miyim?',
          a: 'Hayır, öğretmen veya personel bazında rapor yoktur. Ayrıntılı görüş için sınıf ya da kurs başına ayrı bir anket hazırlayabilirsiniz; her anketin sonuçları ayrı görünür.',
        },
        {
          q: 'Dönem bazında rapor alabilir miyiz?',
          a: 'Analitik ekranında son 7, 30 veya 90 günü, 12 ayı ya da istediğiniz bir tarih aralığını seçebilirsiniz. Dönemin başlangıç ve bitiş tarihlerini girerek dönemin tamamını görür, raporu CSV olarak indirirsiniz.',
        },
        {
          q: 'Düşük puan veren veli Google’da yorum yazabilir mi?',
          a: 'Evet. Eşiğin altında puan veren veli önce size yazabilir; Google yorum bağlantısı aynı ekranda görünür ve veli isterse oradan herkese açık yorum yazar. Buaze yorum silmez, gizlemez veya değiştirmez.',
        },
        {
          q: 'Anketi velilere nasıl ulaştırırız?',
          a: 'Anketin QR kodunu PNG veya SVG olarak indirip veli toplantısı notlarına basabilir ya da anket bağlantısını okulunuzun kendi iletişim kanallarından paylaşabilirsiniz. Buaze velilere mesaj göndermez.',
        },
        {
          q: 'Kurs merkezimizin birden çok şubesi var; ayrı ayrı izleyebilir miyiz?',
          a: 'Evet. Her şubeyi ayrı işletme olarak eklersiniz; her birinin kendi QR kodları ve analitiği olur. İşletmeler tablosu hepsini yan yana gösterir.',
        },
      ],
    },
    ctaTitle: 'Okulunuzda veli geri bildirimi toplamaya başlayın',
  },
  en: {
    name: 'Schools and courses',
    meta: {
      title: 'QR parent feedback and reviews for schools',
      description:
        'QR codes for schools and courses: parents and adult learners give a rating and, below your threshold, can write to you first. Run a survey per class or course.',
    },
    eyebrow: 'Schools and courses',
    h1: 'QR codes for parent feedback and Google reviews at schools and courses',
    lead:
      'At a school, ask parents for feedback; at a course, ask the adult learners. A QR code scanned at a parents’ evening or in the admissions office brings you views on communication, safety and teaching quality; ratings at or above your threshold go to your Google review page.',
    flow: {
      title: 'How QR feedback works at schools and courses',
      steps: [
        {
          title: 'Prepare QR codes for parents',
          body:
            'Create a QR code for your school in the panel and add your Google review link. You can prepare separate, labelled QR codes for parents’ evenings, the admissions office or school events.',
        },
        {
          title: 'The parent gives a rating',
          body:
            "The parent scans the QR code and gives 1–5 stars. At or above the threshold you set (5 stars by default), your Google review page opens. Below it, the parent can first send you private feedback; the public review link is shown on the same screen.",
        },
        {
          title: 'Reply and follow the trend',
          body:
            'A 1–3★ rating sends you an instant e-mail, and if the parent left an e-mail address, you reply by e-mail. In weeks with feedback, the summary that arrives on Monday helps you follow how the term is going.',
        },
      ],
    },
    placements: {
      title: 'Where to put the QR code at a school',
      lead: 'Put the QR code where parents, not students, will see it.',
      items: [
        {
          title: 'Parents’ evening',
          body:
            'Add the QR code to the handout you give at the end of the meeting. Parents can share their views right after talking to the teacher.',
        },
        {
          title: 'Admissions and information office',
          body:
            'Parents who come in for an admissions meeting can rate how the school was introduced and how well they were informed.',
        },
        {
          title: 'Report card envelope and end-of-term newsletter',
          body:
            'Print the QR code on the report card envelope or in the end-of-term newsletter for parents; the rating then covers the whole term.',
        },
        {
          title: 'Course certificate and classroom door',
          body:
            'On courses for adults, learners can scan the QR code on their certificate or on the classroom door when the course ends.',
        },
      ],
      tip:
        'If you run separate units, such as a kindergarten, a primary school or a course centre, create a QR code for each and type a short unit name in the “Table number” field (for example Kindergarten or Course-1; labels can’t contain spaces or accented letters). The label shows in the low-rating e-mail and the CSV file.',
    },
    uses: {
      title: 'Panel features that help school management',
      items: [
        {
          icon: ClipboardList,
          title: 'A survey per class or course',
          body:
            'There are no per-teacher reports; for detailed feedback, build a separate survey for each class or course. Each survey has its own results and CSV file.',
        },
        {
          icon: Mail,
          title: 'Weekly summary',
          body:
            'In weeks with feedback, an e-mail every Monday sums up the previous week, so you can follow changes through the term.',
        },
        {
          icon: Building2,
          title: 'Compare campuses',
          body:
            'With several campuses or branches, the businesses table shows each one’s last-30-day review count, average rating and pending low ratings side by side.',
        },
        {
          icon: Users,
          title: 'Access for the right people',
          body:
            'Give deputy heads the manager role and the counselling team the viewer role. You choose which campuses each person can access; viewers can only read.',
        },
      ],
    },
    platforms: {
      title: 'The review platform for schools',
      lead:
        'When you pick “Education” at setup, the panel shows only the Google link. For parents researching schools, the main target is the reviews on your Google Business Profile.',
      note:
        'Search for your Google Business Profile by name in the panel and pick it; Buaze builds the official “write a review” link. The Google Reviews page shows your rating, review count and a 6-item profile checklist.',
    },
    questions: {
      title: 'What to ask parents',
      lead:
        "Ask about the school’s services, not about the child. Short, multiple-choice questions make the survey easy for parents to answer.",
      items: [
        { text: 'How would you rate communication with teachers?', type: 'rating' },
        { text: 'Are the school’s announcements and updates enough for you?', type: 'multiple_choice' },
        { text: 'How would you rate the school bus and meal service?', type: 'rating' },
        { text: 'How likely are you to recommend our school to another parent?', type: 'nps' },
        { text: 'What suggestions do you have for next term?', type: 'long_text' },
      ],
      audits: [
        {
          title: 'New staff first-day onboarding check',
          body: 'First-day checklist for a new teacher or member of the admin staff.',
        },
        {
          title: 'KVKK self-check (business)',
          body: 'A regular check of the privacy notice, consent and staff training for parent and student data.',
        },
        {
          title: 'Weekly customer experience summary',
          body: 'A short weekly review the school manager fills in after reading the feedback.',
        },
      ],
    },
    privacy: {
      title: "Children’s data and KVKK",
      paragraphs: [
        "At schools, ask parents for feedback. Children’s personal data needs extra care: put QR codes where parents, not students, will see them, and don’t ask for a student’s name, class or health in surveys.",
        'Name and e-mail are optional on the form. The form records the KVKK privacy notice acknowledgement; marketing consent is separate and off by default. IP addresses are anonymised after 90 days.',
        "The database is kept in the EU (Frankfurt); some service providers, such as e-mail delivery and AI, are in the US and are listed in the data processing agreement. For the AI features (Pulse AI drafts, feedback summaries, the highlighted topics in analytics and the weekly summary e-mail), feedback text is sent to OpenAI; you can ask our support team to switch these features off for your business. For your school’s own privacy-notice obligations, consult your legal adviser.",
      ],
    },
    faq: {
      title: 'School and course FAQ',
      items: [
        {
          q: 'Should we ask students for feedback?',
          a: "For school-age students, we recommend asking parents instead; children’s personal data needs extra care. On courses for adults, learners can give feedback themselves.",
        },
        {
          q: 'Can I get reports per teacher?',
          a: 'No, there are no per-teacher or per-staff reports. For detailed feedback, build a separate survey for each class or course; each survey shows its own results.',
        },
        {
          q: 'Can we get a report for a whole term?',
          a: 'In analytics you can choose the last 7, 30 or 90 days, 12 months or any date range. Enter the first and last day of the term to see the whole term, and download the report as CSV.',
        },
        {
          q: 'Can a parent who gives a low rating still post on Google?',
          a: "Yes. A parent who rates below your threshold can write to you first; the Google review link is shown on the same screen, and they can post a public review from there if they want. Buaze doesn’t delete, hide or edit reviews.",
        },
        {
          q: 'How do we get the survey to parents?',
          a: "Download the survey’s QR code as PNG or SVG and print it on parents’ evening handouts, or share the survey link through your school’s own channels. Buaze doesn’t send messages to parents.",
        },
        {
          q: 'Our course centre has several branches. Can we track them separately?',
          a: 'Yes. You add each branch as a separate business, with its own QR codes and analytics. The businesses table shows them side by side.',
        },
      ],
    },
    ctaTitle: 'Start collecting parent feedback at your school',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return buildSolutionMetadata({ locale, slug: SLUG, ...CONTENT[locale].meta });
}

export default async function SchoolsSolutionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return (
    <SolutionPageLayout
      locale={locale}
      slug={SLUG}
      sector="education"
      content={CONTENT[locale]}
      illustration={<IllusSchool />}
    />
  );
}
