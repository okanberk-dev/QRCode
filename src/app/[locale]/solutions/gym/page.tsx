import type { Metadata } from 'next';
import { Building2, CalendarDays, Mail, Users } from 'lucide-react';
import SolutionPageLayout, { type SolutionPageContent } from '@/components/marketing/SolutionPageLayout';
import { IllusGym } from '@/components/marketing/solution-illustrations';
import { buildSolutionMetadata } from '@/lib/solution-schema';
import type { Locale } from '@/lib/translations';

// ISR: inherits `revalidate = 3600` from `[locale]/layout.tsx` (CLAUDE.md
// §38.163). No request-time APIs here, so the page stays static.

const SLUG = 'gym';

const CONTENT: Record<Locale, SolutionPageContent> = {
  tr: {
    name: 'Spor salonları',
    meta: {
      title: 'Spor salonları için QR ile üye geri bildirimi',
      description:
        'Spor salonunuz için QR kod: üye çıkışta puan verir, eşiğin altında önce size yazabilir. Şubeleri tek panelde karşılaştırın, düşük puanda e-posta alın.',
    },
    eyebrow: 'Spor salonları',
    h1: 'Spor salonları için QR ile üye geri bildirimi ve Google yorumları',
    lead:
      'Spor salonu şikâyetleri çoğu zaman küçük ve somuttur: bozuk bir cihaz, temizlenmemiş bir alan, kalabalık bir saat. QR kod, üyenin bunu salondan çıkarken size iletmesini kolaylaştırır; eşik ve üzerindeki puanlar Google yorum sayfanıza gider.',
    flow: {
      title: 'Spor salonunda QR ile geri bildirim nasıl işler',
      steps: [
        {
          title: 'QR kodlarınızı yerleştirin',
          body:
            'Panelde salonunuz için QR kod oluşturun ve Google yorum bağlantınızı ekleyin. Resepsiyon, stüdyo ve soyunma odası koridoru için ayrı, etiketli QR kodlar hazırlayabilirsiniz.',
        },
        {
          title: 'Üye puan verir',
          body:
            'Üye QR kodu okutup 1–5 yıldız verir. Belirlediğiniz eşik ve üzerindeki puanlarda (varsayılan 5 yıldız) Google yorum sayfanız açılır. Eşiğin altında üye önce size özel geri bildirim yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür.',
        },
        {
          title: 'Sorunu hızla ele alın',
          body:
            '1–3 yıldızlık her geri bildirimde e-posta alırsınız; QR etiketi sorunun hangi alanda olduğunu gösterir. Üye e-posta bıraktıysa yanıtınızı ve yaptığınız düzeltmeyi kendisine iletebilirsiniz.',
        },
      ],
    },
    placements: {
      title: 'Spor salonunda QR kodu nereye koymalı',
      lead:
        'QR kodu antrenmanın bittiği ve üyenin bir dakika durduğu yerlere koyun; soyunma odasının içine değil, girişine.',
      items: [
        {
          title: 'Resepsiyon ve turnike çıkışı',
          body:
            'Üye salondan çıkarken resepsiyonun önünden geçer. Çıkıştaki bir stant, genel deneyimi puanlamak için doğal bir yerdir.',
        },
        {
          title: 'Soyunma odası koridoru',
          body:
            'Temizlik ve dolap sorunlarını en hızlı fark eden üyelerdir. QR kodu soyunma odasının girişine veya koridora asın; içeride telefon kullanımı rahatsız edici olabilir.',
        },
        {
          title: 'Su ve havlu istasyonu',
          body:
            'Setler arasında üyelerin uğradığı su sebili veya havlu noktası, ekipman ve kalabalıkla ilgili görüşleri toplamak için uygundur.',
        },
        {
          title: 'Grup dersi stüdyosunun kapısı',
          body:
            'Ders bittiğinde çıkışta görünen bir QR kod, ders programı, stüdyo düzeni ve ders deneyimiyle ilgili görüşleri toplar.',
        },
      ],
      tip:
        'Stüdyo, soyunma odası ve resepsiyon için ayrı QR kodlar oluşturun ve “Masa numarası” alanına alanın adını yazın. Etiket, düşük puan e-postasında ve CSV dosyasında görünür; böylece bir şikâyetin nereden geldiğini hemen anlarsınız.',
    },
    uses: {
      title: 'Salon yönetimini kolaylaştıran panel özellikleri',
      items: [
        {
          icon: Building2,
          title: 'Şubeleri karşılaştırın',
          body:
            'Birden çok şubeniz varsa işletmeler tablosunda her şubenin son 30 günlük yorum sayısını, ortalama puanını, bekleyen düşük puanlarını ve bağlantı sağlığını yan yana görürsünüz.',
        },
        {
          icon: CalendarDays,
          title: 'Geri bildirimin geldiği saatleri görün',
          body:
            'Analitikteki gün ve saat dağılımı, geri bildirimlerin hangi gün ve saatlerde yoğunlaştığını gösterir. Bunu salonun kalabalık saatleriyle birlikte değerlendirebilirsiniz.',
        },
        {
          icon: Mail,
          title: 'Haftalık özet e-postası',
          body:
            'Her pazartesi geçen haftanın geri bildirimlerini özetleyen bir e-posta gelir. 1–3 yıldızlık geri bildirimler için ayrıca anında uyarı alırsınız.',
        },
        {
          icon: Users,
          title: 'Ekibe doğru erişim',
          body:
            'Şube müdürlerine yönetici, eğitmenlere görüntüleyici rolü verebilirsiniz. Her kişinin hangi şubelere erişeceğini siz seçersiniz; görüntüleyici yalnızca okuyabilir.',
        },
      ],
    },
    platforms: {
      title: 'Spor salonları için yorum platformu',
      lead:
        'Kurulumda “Spor & Fitness” sektörünü seçtiğinizde panel yalnızca Google bağlantısını gösterir. Spor salonu için asıl hedef, Google İşletme Profilinizdeki yorumlardır.',
      note:
        'Google İşletme Profilinizi panelden adıyla aratıp seçtiğinizde Buaze resmi “yorum yaz” bağlantısını oluşturur. Google Yorumları sayfasında puanınızı, yorum sayınızı ve çalışma saatleri, fotoğraflar gibi 6 maddelik profil kontrol listesini görürsünüz.',
    },
    questions: {
      title: 'Üyelere ne sormalı',
      lead:
        'Yıldız puanı genel memnuniyeti gösterir. Ekipman, temizlik ve ders programı gibi konuları ayrı ayrı öğrenmek için kısa bir anket hazırlayın.',
      items: [
        { text: 'Ekipmanların bakımını ve çalışır durumda olmasını nasıl değerlendirirsiniz?', type: 'rating' },
        { text: 'Soyunma odaları ve duşların temizliğini nasıl değerlendirirsiniz?', type: 'rating' },
        { text: 'Genellikle hangi saatlerde antrenman yapıyorsunuz?', type: 'multiple_choice' },
        { text: 'Salonumuzu bir arkadaşınıza önerme olasılığınız nedir?', type: 'nps' },
        { text: 'Hangi grup derslerini veya hizmetleri eklememizi istersiniz?', type: 'short_text' },
      ],
      audits: [
        {
          title: 'Yeni personel 1. gün oryantasyon kontrolü',
          body: 'Yeni başlayan resepsiyon görevlisi veya eğitmenle ilk gün yapılacak kontroller için.',
        },
        {
          title: 'Müşteri deneyimi haftalık özet',
          body: 'Şube yöneticisinin her hafta geri bildirimlere bakarak dolduracağı kısa değerlendirme için.',
        },
        {
          title: 'KVKK öz-denetim (işletme)',
          body: 'Üye verileri için aydınlatma metni, açık rıza ve personel eğitimini düzenli kontrol etmek için.',
        },
      ],
    },
    privacy: {
      title: 'Üye verileri ve sağlık bilgisi',
      paragraphs: [
        'Geri bildirim formunda sağlık sorusu yoktur, ancak üyeler yorumlarında sakatlık gibi sağlık bilgilerinden söz edebilir. Sağlık verisi özel nitelikli kişisel veridir; anketlerinizde sağlık durumu sormayın.',
        'Formda ad ve e-posta isteğe bağlıdır. Form gönderilirken KVKK aydınlatma onayı alınır; pazarlama izni ayrıdır ve varsayılan olarak kapalıdır. IP adresleri 90 gün sonra anonimleştirilir. Veritabanı AB’de (Frankfurt) tutulur; bazı hizmet sağlayıcılar ABD’dedir ve Veri İşleyici Sözleşmesi’nde listelenir.',
      ],
    },
    faq: {
      title: 'Spor salonları için sık sorulan sorular',
      items: [
        {
          q: 'Eğitmen bazında rapor alabilir miyim?',
          a: 'Hayır, eğitmen veya personel bazında rapor yoktur. Grup dersi stüdyosu gibi alanlar için etiketli QR kodlar oluşturabilirsiniz; etiket düşük puan e-postasında ve CSV dosyasında görünür. Belirli bir ders hakkında görüş almak için o derse özel bir anket de hazırlayabilirsiniz.',
        },
        {
          q: 'Üyelere düzenli geri bildirim hatırlatması gönderebilir miyim?',
          a: 'Hayır. Buaze üyelere mesaj göndermez ve zamanlanmış gönderim yapmaz. Geri bildirim, üye QR kodu okuttuğunda ya da paylaştığınız anket bağlantısını açtığında alınır.',
        },
        {
          q: 'Birden çok şubemiz var; ayrı ayrı izleyebilir miyiz?',
          a: 'Evet. Her şubeyi ayrı işletme olarak eklersiniz; her şubenin kendi QR kodları, geri bildirimleri ve analitiği olur. İşletmeler tablosu tüm şubeleri tek ekranda karşılaştırır.',
        },
        {
          q: 'Düşük puan veren üye Google’da yorum yazabilir mi?',
          a: 'Evet. Eşiğin altında puan veren üye önce size yazabilir ve aynı ekranda Google yorum bağlantısını görür; hangisini kullanacağına kendisi karar verir. Buaze yorum silmez, gizlemez veya değiştirmez.',
        },
        {
          q: 'Buaze üyelik sistemimize bağlanıyor mu?',
          a: 'Hayır. Buaze üyelik veya turnike sisteminize bağlanmaz, salon girişlerini ve üyelik iptallerini görmez. Yalnızca QR akışından ve anketlerden gelen geri bildirimleri toplar.',
        },
        {
          q: 'Yorum karşılığında ücretsiz ders veya indirim verebilir miyim?',
          a: 'Buaze yorum karşılığında ödül sunmaz; Google da yorum karşılığı teşviki yasaklar. Anketlerde isteğe bağlı bir teşekkür kuponu gösterebilirsiniz, ancak bu kupon herkese açık yorum yazmaya bağlanmamalıdır.',
        },
      ],
    },
    ctaTitle: 'Salonunuzda üye geri bildirimi toplamaya başlayın',
  },
  en: {
    name: 'Gyms and fitness studios',
    meta: {
      title: 'QR member feedback and reviews for gyms',
      description:
        'QR codes for gyms: members rate their visit on the way out and, below your threshold, can write to you first. Compare branches and get low-rating e-mails.',
    },
    eyebrow: 'Gyms and fitness studios',
    h1: 'QR codes for member feedback and Google reviews at gyms',
    lead:
      'Gym complaints are usually small and concrete: a broken machine, an area that was not cleaned, a crowded hour. A QR code makes it easy for members to tell you on the way out; ratings at or above your threshold go to your Google review page.',
    flow: {
      title: 'How QR feedback works at a gym',
      steps: [
        {
          title: 'Place your QR codes',
          body:
            'Create a QR code for your gym in the panel and add your Google review link. You can prepare separate, labelled QR codes for reception, the studio and the locker-room corridor.',
        },
        {
          title: 'The member gives a rating',
          body:
            "The member scans the QR code and gives 1–5 stars. At or above the threshold you set (5 stars by default), your Google review page opens. Below it, the member can first send you private feedback; the public review link is shown on the same screen.",
        },
        {
          title: 'Act on problems quickly',
          body:
            'You get an e-mail for every 1–3★ piece of feedback, and the QR label shows which area it is about. If the member left an e-mail address, you can tell them how you replied and what you fixed.',
        },
      ],
    },
    placements: {
      title: 'Where to put the QR code in a gym',
      lead:
        'Put the QR code where the workout ends and members pause for a moment: at the locker-room entrance, not inside.',
      items: [
        {
          title: 'Reception and turnstile exit',
          body:
            'Members pass reception on their way out. A stand at the exit is a natural place to rate the overall visit.',
        },
        {
          title: 'Locker-room corridor',
          body:
            'Members are the first to notice cleaning and locker problems. Hang the QR code at the locker-room entrance or in the corridor; using a phone inside can feel intrusive.',
        },
        {
          title: 'Water and towel station',
          body:
            'The water dispenser or towel point members visit between sets is a good place to collect feedback on equipment and crowding.',
        },
        {
          title: 'Group class studio door',
          body:
            'A QR code at the studio exit collects feedback on the class timetable, the studio set-up and the class itself.',
        },
      ],
      tip:
        'Create separate QR codes for the studio, the locker rooms and reception, and type the area name in the “Table number” field. The label shows in the low-rating e-mail and the CSV file, so you know at once where a complaint came from.',
    },
    uses: {
      title: 'Panel features that make running a gym easier',
      items: [
        {
          icon: Building2,
          title: 'Compare branches',
          body:
            'With several branches, the businesses table shows each branch’s last-30-day review count, average rating, pending low ratings and link health side by side.',
        },
        {
          icon: CalendarDays,
          title: 'See when feedback comes in',
          body:
            'The day and hour breakdown in analytics shows on which days and at what times most feedback arrives. Read it alongside your busiest hours.',
        },
        {
          icon: Mail,
          title: 'Weekly summary e-mail',
          body:
            'Every Monday you get an e-mail summarising the previous week’s feedback. 1–3★ feedback also triggers an instant alert.',
        },
        {
          icon: Users,
          title: 'The right access for your team',
          body:
            'Give branch managers the manager role and trainers the viewer role. You choose which branches each person can access; viewers can only read.',
        },
      ],
    },
    platforms: {
      title: 'The review platform for gyms',
      lead:
        'When you pick “Sports & Fitness” at setup, the panel shows only the Google link. For a gym, the main target is the reviews on your Google Business Profile.',
      note:
        'Search for your Google Business Profile by name in the panel and pick it; Buaze builds the official “write a review” link. The Google Reviews page shows your rating, review count and a 6-item profile checklist that includes opening hours and photos.',
    },
    questions: {
      title: 'What to ask members',
      lead:
        'A star rating shows overall satisfaction. To learn about equipment, cleanliness and the class timetable one by one, build a short survey.',
      items: [
        { text: 'How would you rate the upkeep and working order of the equipment?', type: 'rating' },
        { text: 'How would you rate the cleanliness of the locker rooms and showers?', type: 'rating' },
        { text: 'When do you usually train?', type: 'multiple_choice' },
        { text: 'How likely are you to recommend our gym to a friend?', type: 'nps' },
        { text: 'Which group classes or services would you like us to add?', type: 'short_text' },
      ],
      audits: [
        {
          title: 'New staff first-day onboarding check',
          body: 'First-day checklist for a new receptionist or trainer.',
        },
        {
          title: 'Weekly customer experience summary',
          body: 'A short weekly review the branch manager fills in after reading the feedback.',
        },
        {
          title: 'KVKK self-check (business)',
          body: 'A regular check of the privacy notice, consent and staff training for member data.',
        },
      ],
    },
    privacy: {
      title: 'Member data and health information',
      paragraphs: [
        "The feedback form has no health questions, but members may mention injuries or other health details in their comments. Health data is a special category of personal data, so don’t ask about health in your surveys.",
        'Name and e-mail are optional on the form. The form records the KVKK privacy notice acknowledgement; marketing consent is separate and off by default. IP addresses are anonymised after 90 days. The database is kept in the EU (Frankfurt); some service providers are in the US and are listed in the data processing agreement.',
      ],
    },
    faq: {
      title: 'Gym and fitness studio FAQ',
      items: [
        {
          q: 'Can I get reports per trainer?',
          a: 'No, there are no per-trainer or per-staff reports. You can create labelled QR codes for areas such as the group class studio; the label shows in the low-rating e-mail and the CSV file. To get feedback on a specific class, build a survey just for that class.',
        },
        {
          q: 'Can I send members regular feedback reminders?',
          a: "No. Buaze doesn’t send messages to members and has no scheduled sending. Feedback comes in when a member scans the QR code or opens a survey link you shared.",
        },
        {
          q: 'We have several branches. Can we track them separately?',
          a: 'Yes. You add each branch as a separate business, with its own QR codes, feedback and analytics. The businesses table compares all branches on one screen.',
        },
        {
          q: 'Can a member who gives a low rating still post on Google?',
          a: "Yes. A member who rates below your threshold can write to you first and sees the Google review link on the same screen; they decide which to use. Buaze doesn’t delete, hide or edit reviews.",
        },
        {
          q: 'Does Buaze connect to our membership system?',
          a: "No. Buaze doesn’t connect to your membership or turnstile system and doesn’t see check-ins or cancellations. It only collects feedback from the QR flow and surveys.",
        },
        {
          q: 'Can I offer a free class or a discount for a review?',
          a: "Buaze doesn’t offer rewards for reviews, and Google prohibits incentives for reviews. Surveys can show an optional thank-you coupon, but it must not be tied to posting a public review.",
        },
      ],
    },
    ctaTitle: 'Start collecting member feedback at your gym',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return buildSolutionMetadata({ locale, slug: SLUG, ...CONTENT[locale].meta });
}

export default async function GymSolutionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return (
    <SolutionPageLayout
      locale={locale}
      slug={SLUG}
      sector="fitness"
      content={CONTENT[locale]}
      illustration={<IllusGym />}
    />
  );
}
