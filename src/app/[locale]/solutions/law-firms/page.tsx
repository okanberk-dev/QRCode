import type { Metadata } from 'next';
import { Building2, FileDown, ShieldCheck, Sparkles } from 'lucide-react';
import SolutionPageLayout, { type SolutionPageContent } from '@/components/marketing/SolutionPageLayout';
import { buildSolutionMetadata } from '@/lib/solution-schema';
import type { Locale } from '@/lib/translations';
import { IllusLaw } from '../_components/sector-illustrations';

// ISR: inherits `revalidate = 3600` from `[locale]/layout.tsx`. Reads only
// `params`, so the page stays static. Sector "legal" drives the platform list
// (Google only); there is no legal-specific survey template, so the layout
// shows the universal ones.
//
// The reply examples in the FAQ were checked against `checkReplyRisk`
// (src/lib/reply-risk.ts): "Avukatımız sizi arayacak." and "Our lawyer will
// call you tomorrow." are blocked, "Yarın sizi arayacağız." passes.

const SLUG = 'law-firms';

const CONTENT: Record<Locale, SolutionPageContent> = {
  tr: {
    name: 'Hukuk büroları',
    meta: {
      title: 'Hukuk büroları için QR ile müvekkil geri bildirimi',
      description:
        'Hukuk büronuz için QR kod: müvekkil görüşmeden sonra puan verir, eşiğin altında önce size yazabilir. Google yorum bağlantısı, yanıt kontrolü, gizlilik notları.',
    },
    eyebrow: 'Hukuk büroları',
    h1: 'Hukuk büroları için QR ile müvekkil geri bildirimi ve Google yorumları',
    lead:
      'Müvekkil görüşmeden sonra resepsiyondaki ya da kartvizitinizin arkasındaki QR kodu okutur ve hizmetinizi puanlar. Eşik ve üzerindeki puanlarda Google yorum sayfanız açılır; eşiğin altında müvekkil önce size yazabilir, herkese açık yorum bağlantısı aynı ekranda görünür. Müvekkile gönderdiğiniz yanıtlar ise çıkmadan önce kontrol edilir.',
    flow: {
      title: 'Büroda QR ile geri bildirim akışı',
      steps: [
        {
          title: 'Ofisiniz için QR hazırlayın',
          body:
            'Her ofis ya da kullanım yeri için ayrı QR oluşturup etiket verebilirsiniz (ör. Resepsiyon, Kartvizit, E-posta). Etiket düşük puan e-postasında ve geri bildirim CSV dosyasında görünür.',
        },
        {
          title: 'Müvekkil puan verir',
          body:
            'Müvekkil QR kodu okutur ve 1–5 yıldız verir. Belirlediğiniz eşik ve üzerindeki puanlarda (varsayılan 5 yıldız) Google yorum sayfanız açılır. Eşiğin altındaki puanlarda müvekkil önce size özel geri bildirim yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür.',
        },
        {
          title: 'Düşük puanlardan hemen haberdar olun',
          body:
            '1–3 yıldızlık geri bildirimde anında e-posta alırsınız. Müvekkil e-posta adresini bıraktıysa yanıtınızı panelden yazılı gönderirsiniz; dosyayla ilgili konuları telefonda ya da yüz yüze konuşmak daha doğru olur.',
        },
      ],
    },
    placements: {
      title: 'Büroda QR kodu nereye koymalı',
      lead: 'Müvekkil hizmeti çoğu zaman görüşmeden çıkarken ya da birkaç gün sonra değerlendirir.',
      items: [
        {
          title: 'Bekleme alanı ve resepsiyon',
          body:
            'Resepsiyondaki bir QR standı, görüşmeden çıkan müvekkilin gözüne çarpar. Müvekkil isterse hemen, isterse daha sonra okutur.',
        },
        {
          title: 'Kartvizit arkası',
          body:
            'Kartvizitinizin arka yüzündeki QR kod, müvekkile görüşmeyi düşünüp sonra değerlendirme fırsatı verir.',
        },
        {
          title: 'Belge teslim zarfı',
          body:
            'Sözleşme veya belge örneklerini teslim ettiğiniz zarfa küçük bir QR etiketi yapıştırabilirsiniz.',
        },
        {
          title: 'Görüşme sonrası e-posta',
          body:
            'Paneldeki QR kartından bağlantıyı kopyalayıp görüşme sonrası e-postanıza ekleyebilirsiniz. Ayrı bir etiket verirseniz bu kanaldan gelen geri bildirimleri ayırırsınız.',
        },
      ],
      tip:
        'Etiketlerde müvekkil adı, dosya numarası veya dava türü kullanmayın; etiket uyarı e-postasında ve dışa aktarılan dosyalarda görünür.',
    },
    uses: {
      title: 'Büro panelinde işinize yarayanlar',
      items: [
        {
          icon: ShieldCheck,
          title: 'Yanıtlar gönderilmeden kontrol edilir',
          body:
            'Müvekkile giden her yanıt; hakaret, tehdit, yasal işlemle korkutma ve T.C. kimlik, IBAN ya da kart numarası gibi kişisel veriler açısından kontrol edilir. Takılan yanıt gönderilmez ve hangi kuralın tetiklendiği gösterilir.',
        },
        {
          icon: Sparkles,
          title: 'Pulse AI taslakları yalnız istediğinizde',
          body:
            'Otomatik taslaklar varsayılan olarak kapalıdır. Taslak istediğinizde 2–4 cümlelik bir metin hazırlanır; metni düzenler, onaylarsanız gönderirsiniz.',
        },
        {
          icon: Building2,
          title: 'Her ofisi ayrı izleyin',
          body:
            'Her ofisi ayrı işletme olarak ekleyip İşletmeler tablosunda son 30 günün geri bildirim sayısını ve ortalama puanını karşılaştırırsınız. Ekip üyelerine yalnız çalıştıkları ofislere erişim verebilirsiniz.',
        },
        {
          icon: FileDown,
          title: 'Kayıtlarınızı dışa aktarın',
          body:
            'Geri bildirimleri CSV dosyası olarak indirebilir, işletmeleriniz ve geri bildirimleriniz dahil hesap verilerinizi JSON dosyası olarak dışa aktarabilirsiniz.',
        },
      ],
    },
    platforms: {
      title: 'Hukuk büroları için yorum platformu',
      lead:
        'Sektör olarak “Hukuk Ofisi”ni seçtiğinizde panel yalnız Google yorum bağlantısını önerir. Büronuzu Google’da arayan biri, yorumlarınızı Google İşletme Profilinizde görür.',
      note:
        'Google yorumlarına panelden yanıt vermek Google’ın erişim onayına bağlıdır ve şu an genel kullanıma açık değildir; Google yorumlarına İşletme Profilinizden yanıt verirsiniz. Google puanınızı, yorum sayınızı ve Google’ın gösterdiği en fazla 5 yorumu ise panelde Google hesabıyla giriş yapmadan görebilirsiniz.',
    },
    questions: {
      title: 'Müvekkillere ne sormalı',
      lead:
        'Hukuk büroları için ayrı bir hazır anket şablonu yok; genel şablonlardan biriyle başlayıp kendi sorularınızı eklersiniz. Sorularda dosya ayrıntısı istemeyin.',
      items: [
        { text: 'Görüşmeniz randevu saatinde başladı mı?', type: 'multiple_choice' },
        { text: 'Dosyanızdaki sonraki adımlar size açıkça anlatıldı mı?', type: 'multiple_choice' },
        { text: 'Ücret ve masraflar hakkında yeterince bilgilendirildiniz mi?', type: 'multiple_choice' },
        { text: 'Bize ulaşmanın kolaylığını nasıl değerlendirirsiniz?', type: 'rating' },
        { text: 'Büromuzu bir yakınınıza önerme olasılığınız nedir?', type: 'nps' },
      ],
      audits: [
        {
          title: 'KVKK öz-denetim (işletme)',
          body: 'Büronun kendi KVKK durumunu gözden geçirmesi için kısa liste: aydınlatma metni, açık rıza, personel eğitimi, VERBİS ve veri ihlali bildirimi.',
        },
        {
          title: 'Yeni personel 1. gün oryantasyon kontrolü',
          body: 'Yeni başlayan avukat, stajyer ve asistanların ilk gün listesinin tamamlandığını kontrol etmek için.',
        },
      ],
    },
    privacy: {
      title: 'Müvekkil gizliliği ve meslek kuralları',
      paragraphs: [
        'Geri bildirim formunda dosya bilgisi için bir alan yoktur, ancak müvekkil serbest metin alanına istediğini yazabilir. Bu metin hiçbir yorum platformuna gönderilmez; panelinizde görünür.',
        'Formda KVKK aydınlatma metninin bağlantısı yer alır ve pazarlama izni varsayılan olarak işaretsizdir. IP adresleri 90 gün sonra anonimleştirilir.',
        'Veritabanı AB’de (Frankfurt) tutulur. E-posta gönderimi ve yapay zekâ gibi bazı hizmet sağlayıcılar ABD’dedir ve Veri İşleyici Sözleşmesi’nde listelenir. Yapay zekâ özellikleri (Pulse AI taslakları, geri bildirim özetleri, analitikteki öne çıkan konular ve haftalık özet e-postası) için geri bildirim metni OpenAI’a gönderilir; bu özelliklerin işletmeniz için kapatılmasını destek ekibimizden isteyebilirsiniz.',
        'Avukatlık mesleğinde reklam ve iş sağlama yasakları vardır (Avukatlık Kanunu ve Türkiye Barolar Birliği kuralları). Müvekkillerden yorum istemeden ya da yorumları tanıtımda kullanmadan önce bağlı olduğunuz baronun görüşünü alın; Buaze bu konuda hukuki değerlendirme yapmaz.',
      ],
    },
    faq: {
      title: 'Hukuk büroları için sık sorulan sorular',
      items: [
        {
          q: 'Avukat bazında rapor alabilir miyim?',
          a: 'Hayır, avukat bazında rapor yoktur. QR etiketi (ör. Resepsiyon, Kartvizit) düşük puan e-postasında ve CSV dosyasında görünür. Ofisleri ayrı işletme olarak eklerseniz her ofisin analitiğini ayrı görürsünüz.',
        },
        {
          q: 'Yanıtım neden gönderilmedi?',
          a: 'Yanıt kontrolü, aynı cümlede “dava”, “mahkeme”, “avukat” veya “icra” gibi bir terimle “sizi”, “sizinle”, “hakkınızda” gibi müvekkile yönelen bir ifade geçtiğinde yanıtı durdurur; amaç müşteriyi yasal işlemle korkutan yanıtları engellemektir. Örneğin “Avukatımız sizi arayacak.” cümlesi gönderilmez, “Yarın sizi arayacağız.” cümlesi gönderilir. Kontrol geçersiz kılınamaz; dosyayla ilgili konuları telefonda ya da yüz yüze konuşun.',
        },
        {
          q: 'Google yorumlarına panelden yanıt verebilir miyim?',
          a: 'Bu özellik Google’ın erişim onayına bağlıdır ve şu an genel kullanıma açık değildir. Google yorumlarına Google İşletme Profiliniz üzerinden yanıt vermeye devam edersiniz.',
        },
        {
          q: 'Müvekkil yorumlarını tanıtımda kullanabilir miyim?',
          a: 'Bu konu avukatlık mesleğinin reklam kurallarına tabidir; kullanmadan önce baronuzun görüşünü alın. Buaze hukuki uygunluk değerlendirmesi yapmaz.',
        },
        {
          q: 'Düşük puan veren müvekkil Google’da yorum yazabilir mi?',
          a: 'Evet. Eşiğin altında puan veren müvekkil önce size özel geri bildirim yazabilir; Google yorum bağlantısı aynı ekranda görünür ve müvekkil isterse oradan herkese açık yorum yazar. Buaze yorum silmez, gizlemez veya değiştirmez.',
        },
        {
          q: 'Yabancı müvekkillerimiz formu hangi dilde görür?',
          a: 'Form, telefonun dili İngilizce ise İngilizce, diğer dillerde Türkçe açılır. Buaze şu an yalnız Türkçe ve İngilizce destekler.',
        },
      ],
    },
    ctaTitle: 'Büronuzda müvekkil geri bildirimi toplamaya başlayın',
  },
  en: {
    name: 'Law firms',
    meta: {
      title: 'QR client feedback and Google reviews for law firms',
      description:
        'QR codes for law firms: clients rate you after a meeting and can write to you first below your threshold. Google review link, reply checks and privacy notes.',
    },
    eyebrow: 'Law firms',
    h1: 'QR client feedback and Google reviews for law firms',
    lead:
      'After a meeting, clients scan the QR code at reception or on the back of your business card and rate your service. At or above your threshold, your Google review page opens; below it, the client can write to you first, and the public review link is shown on the same screen. Replies you send to clients are checked before they go out.',
    flow: {
      title: 'How QR feedback works at a law firm',
      steps: [
        {
          title: 'Prepare QR codes for your office',
          body:
            'Create a separate QR code for each office or place you use it and give it a label (for example Reception, Card or E-mail). The label shows in the low-rating e-mail and the feedback CSV file.',
        },
        {
          title: 'The client gives a rating',
          body:
            'The client scans the QR code and gives 1–5 stars. At or above the threshold you set (5 stars by default), your Google review page opens. Below it, the client can first send you private feedback; the public review link is shown on the same screen.',
        },
        {
          title: 'Hear about low ratings at once',
          body:
            'Every 1–3★ piece of feedback sends you an instant e-mail. If the client left an e-mail address, you reply in writing from the panel; matters about the case itself are better discussed by phone or in person.',
        },
      ],
    },
    placements: {
      title: 'Where to put the QR code at a law firm',
      lead: 'Clients often judge the service as they leave a meeting, or a few days later.',
      items: [
        {
          title: 'Waiting area and reception',
          body:
            'A QR stand at reception catches the eye of clients leaving a meeting. They can scan it right away or later.',
        },
        {
          title: 'Back of the business card',
          body:
            'A QR code on the back of your business card lets clients think the meeting over and rate it later.',
        },
        {
          title: 'Document envelope',
          body:
            'You can put a small QR sticker on the envelope you use to hand over contracts or copies of documents.',
        },
        {
          title: 'Follow-up e-mail',
          body:
            'Copy the link from the QR card in the panel and add it to your follow-up e-mail. Give it its own label to tell feedback from this channel apart.',
        },
      ],
      tip:
        'Don’t use client names, case numbers or case types in labels; the label appears in the alert e-mail and in exported files.',
    },
    uses: {
      title: 'Panel features that help a law firm',
      items: [
        {
          icon: ShieldCheck,
          title: 'Replies are checked before they are sent',
          body:
            'Every reply to a client is checked for insults, threats, intimidation with legal action, and personal data such as Turkish ID, IBAN or card numbers. A reply that is caught is not sent, and you see which rule it triggered.',
        },
        {
          icon: Sparkles,
          title: 'Pulse AI drafts only when you ask',
          body:
            'Automatic drafts are off by default. When you ask for a draft, a 2–4 sentence text is prepared; you edit it and send it once you approve.',
        },
        {
          icon: Building2,
          title: 'Track each office separately',
          body:
            'Add each office as its own business and compare the last 30 days’ feedback count and average rating in the businesses table. You can give team members access only to the offices they work in.',
        },
        {
          icon: FileDown,
          title: 'Export your records',
          body:
            'Download feedback as a CSV file, or export your account data, including your businesses and feedback, as a JSON file.',
        },
      ],
    },
    platforms: {
      title: 'The review platform for law firms',
      lead:
        'When you pick “Legal” as your industry, the panel only suggests a Google review link. People who search for your firm on Google see your reviews on your Google Business Profile.',
      note:
        'Replying to Google reviews from the panel depends on Google granting access and is not generally available yet; you reply to Google reviews from your Business Profile. You can still see your Google rating, review count and up to 5 reviews Google shows in the panel, without a Google sign-in.',
    },
    questions: {
      title: 'What to ask your clients',
      lead:
        'There is no ready-made survey template for law firms; you start from one of the general templates and add your own questions. Don’t ask for details about the case.',
      items: [
        { text: 'Did your meeting start at the scheduled time?', type: 'multiple_choice' },
        { text: 'Were the next steps in your matter clearly explained?', type: 'multiple_choice' },
        { text: 'Were you given enough information about fees and expenses?', type: 'multiple_choice' },
        { text: 'How would you rate how easy it was to reach us?', type: 'rating' },
        { text: 'How likely are you to recommend our firm to someone close to you?', type: 'nps' },
      ],
      audits: [
        {
          title: 'KVKK self-check (business)',
          body: 'A short list for the firm to review its own data protection position: privacy notice, explicit consent, staff training, VERBİS and breach notification.',
        },
        {
          title: 'New staff day-one orientation check',
          body: 'To check that the first-day list is complete for new lawyers, trainees and assistants.',
        },
      ],
    },
    privacy: {
      title: 'Client confidentiality and professional rules',
      paragraphs: [
        'The feedback form has no field for case details, but clients can write anything in the free-text box. That text is not sent to any review platform; you see it in your panel.',
        'The form links to the KVKK privacy notice, and the marketing consent box is unticked by default. IP addresses are anonymised after 90 days.',
        'The database is kept in the EU (Frankfurt). Some service providers, such as e-mail delivery and AI, are in the US and are listed in the data processing agreement. For the AI features (Pulse AI drafts, feedback summaries, the highlighted topics in analytics and the weekly summary e-mail), feedback text is sent to OpenAI; you can ask our support team to switch these features off for your business.',
        'Lawyers in Turkey are bound by bans on advertising and soliciting work (the Attorneys’ Act and the rules of the Union of Turkish Bar Associations). Ask your bar association before you ask clients for reviews or use reviews in promotion; Buaze doesn’t give legal advice on this.',
      ],
    },
    faq: {
      title: 'Law firm FAQ',
      items: [
        {
          q: 'Can I get reports per lawyer?',
          a: 'No, there are no per-lawyer reports. The QR label (for example Reception or Card) shows in the low-rating e-mail and the CSV file. If you add each office as its own business, you see analytics for each office separately.',
        },
        {
          q: 'Why wasn’t my reply sent?',
          a: 'The reply check stops replies that read like a legal threat to the client, such as “we will sue you” or “our lawyers will…”, and it can also catch ordinary sentences: “Our lawyer will call you tomorrow.” is not sent, while “We will call you tomorrow.” is. In Turkish replies, a sentence that combines a term such as “dava”, “mahkeme” or “avukat” with a word aimed at the client, such as “sizi” or “sizinle”, is stopped too. The check can’t be overridden, so discuss the case itself by phone or in person.',
        },
        {
          q: 'Can I reply to Google reviews from the panel?',
          a: 'This depends on Google granting access and is not generally available yet. You keep replying to Google reviews from your Google Business Profile.',
        },
        {
          q: 'Can I use client reviews in our promotion?',
          a: 'This falls under the advertising rules for lawyers, so ask your bar association first. Buaze doesn’t assess legal compliance.',
        },
        {
          q: 'Can a client who gives a low rating still post on Google?',
          a: 'Yes. A client who rates below your threshold can first send you private feedback; the Google review link is shown on the same screen, and they can post a public review from there if they want. Buaze doesn’t delete, hide or edit reviews.',
        },
        {
          q: 'Which language do foreign clients see the form in?',
          a: 'The form opens in English if the phone is set to English, and in Turkish for every other language. Buaze currently supports only Turkish and English.',
        },
      ],
    },
    ctaTitle: 'Start collecting client feedback at your firm',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return buildSolutionMetadata({ locale, slug: SLUG, ...CONTENT[locale].meta });
}

export default async function LawFirmsSolutionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = raw === 'en' ? 'en' : 'tr';
  return (
    <SolutionPageLayout
      locale={locale}
      slug={SLUG}
      sector="legal"
      content={CONTENT[locale]}
      illustration={<IllusLaw />}
    />
  );
}
