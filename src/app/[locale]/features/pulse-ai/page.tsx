import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FileText, Languages, LifeBuoy, PenLine, SlidersHorizontal, Zap } from 'lucide-react';
import FeaturePageLayout, { type FeaturePageCopy, type FeatureSchemaInfo } from '@/components/marketing/FeaturePageLayout';
import { buildFeatureMetadata, isFeatureLocale, type FeatureLocale } from '@/lib/seo/feature-schema';
import { relatedFeatureLinks } from '../_components/feature-catalog';
import { PulseAiMock } from '../_components/mocks';

// /features/pulse-ai — reply drafts for QR feedback. Facts from
// src/lib/ai-draft.ts (3 tones, TR/EN, 2–4 sentences, ≤ 80 words, no
// freebies, no emoji), the inbox (drafts and replies only for 1–3★
// feedback), the reply risk gate (§48) and src/lib/scaffolding.ts (template
// fallback). No brand-voice learning, no order history, no quota or speed
// numbers (marketing spec §3).

const SLUG = 'pulse-ai';

const META = {
  tr: {
    title: 'Pulse AI: yapay zekâ ile yorum yanıtı taslağı',
    description:
      'Pulse AI, düşük puanlı geri bildirimlere sıcak, resmi veya özür dileyen tonda 2–4 cümlelik yanıt taslağı hazırlar. Onayınız olmadan hiçbir yanıt gönderilmez.',
  },
  en: {
    title: 'Pulse AI: AI reply drafts for customer feedback',
    description:
      'Pulse AI drafts 2–4 sentence replies to low-rated feedback in a warm, formal or apologetic tone, in Turkish or English. Nothing is sent without your approval.',
  },
} as const;

const SCHEMA: Record<FeatureLocale, FeatureSchemaInfo> = {
  tr: {
    name: 'Pulse AI',
    serviceType: 'Yapay zekâ destekli yanıt taslağı',
    howToName: 'Pulse AI ile yanıt taslağı nasıl hazırlanır',
  },
  en: {
    name: 'Pulse AI',
    serviceType: 'AI-assisted reply drafting',
    howToName: 'How to prepare a reply draft with Pulse AI',
  },
};

function getCopy(locale: FeatureLocale): FeaturePageCopy {
  const base = `/${locale}`;
  if (locale === 'tr') {
    return {
      eyebrow: 'Pulse AI',
      title: 'Yapay zekâ ile yorum yanıtı taslağı',
      lead: 'Pulse AI, düşük puanlı geri bildirimi okuyup seçtiğiniz tonda 2–4 cümlelik bir yanıt taslağı hazırlar; taslağı siz düzenler, siz onaylarsınız.',
      secondary: { href: `${base}/features/review-management`, label: 'Yorum yönetimini inceleyin' },
      mockCaption:
        'Örnek ekran: 2 yıldızlı bir QR geri bildirimi, ton seçimi ve Pulse AI’ın önerdiği yanıt taslağı.',
      definition: {
        eyebrow: 'Tanım',
        title: 'Pulse AI nedir?',
        paragraphs: [
          'Pulse AI, Buaze gelen kutusundaki yanıt yardımcısıdır. 1–3 yıldızlık bir geri bildirim için işletmenizin adını, müşterinin puanını ve yorumunu okur ve size bir yanıt taslağı önerir.',
          'Taslaklar 2–4 cümle ve en fazla 80 kelimedir; emoji içermez, olumsuz yorumlarda ikram, indirim ya da hediye vaat etmez. Tonu sıcak, resmi veya özür dileyen olarak siz seçersiniz; taslaklar Türkçe ya da İngilizce hazırlanır.',
          'Pulse AI yanıtı sizin yerinize göndermez. Taslağı olduğu gibi kullanabilir, düzenleyebilir ya da silip kendi yanıtınızı yazabilirsiniz; gönder düğmesine basan her zaman sizsiniz.',
        ],
        note: 'Taslak ve özet hazırlamak için geri bildirim metni yapay zekâ sağlayıcımız OpenAI’a gönderilir.',
        noteLink: { href: `${base}/veri-isleyici-sozlesmesi`, label: 'Alt işleyicileri görün' },
      },
      capabilities: {
        eyebrow: 'Neler var',
        title: 'Pulse AI neler yapar',
        items: [
          {
            icon: SlidersHorizontal,
            title: 'Üç ton',
            body: 'Sıcak, resmi veya özür dileyen tonu seçin. İşletmenizin varsayılan tonunu ayarlardan belirler, tek bir geri bildirim için değiştirebilirsiniz; ton değişince taslak yeniden yazılır.',
          },
          {
            icon: Languages,
            title: 'Türkçe ve İngilizce',
            body: 'Taslaklar Türkçe ya da İngilizce hazırlanır; elle istediğiniz taslak, paneli kullandığınız dildedir. Pulse AI başka dillerde yazmaz ve yorumun dilini tespit etmez.',
          },
          {
            icon: PenLine,
            title: 'Düzenleyin, sonra gönderin',
            body: 'Taslağı yanıt kutusuna aktarıp düzenleyin ya da olduğu gibi gönderin. Her gönderimde içerikten sorumlu olduğunuzu onaylarsınız; riskli ifadeler içeren yanıtlar gönderilmez.',
          },
          {
            icon: Zap,
            title: 'İsteğe bağlı otomatik taslak',
            body: 'Ayarlardan açarsanız yeni bir 1–3 yıldızlık geri bildirim geldiğinde taslak arka planda hazırlanır ve gelen kutusunda sizi bekler. Otomatik taslak da onayınız olmadan gönderilmez.',
          },
          {
            icon: FileText,
            title: 'Kısa özet',
            body: 'Yorum metni olan geri bildirimlerde Pulse AI olumlu noktaları, iyileştirme alanlarını ve müşterinin tekrar gelme ihtimalini kısa bir özetle gösterir.',
          },
          {
            icon: LifeBuoy,
            title: 'Yapay zekâ kullanılamazsa şablon',
            body: 'Yapay zekâ o an kullanılamazsa yerine genel bir şablon taslak gösterilir. Taslağı düzenleyip yanıtınızı yine gönderebilirsiniz.',
          },
        ],
      },
      steps: {
        eyebrow: 'Nasıl çalışır',
        title: 'Taslaktan gönderime dört adım',
        items: [
          {
            title: 'Geri bildirimi açın',
            body: 'Gelen kutusunda 1–3 yıldızlık bir geri bildirim seçin. Otomatik taslak açıksa Pulse AI’ın önerisi hazırdır; değilse tek tıkla taslak oluşturursunuz.',
          },
          {
            title: 'Tonu seçin',
            body: 'Sıcak, resmi veya özür dileyen tonu seçin; Pulse AI taslağı o tonda yeniden yazar.',
          },
          {
            title: 'Düzenleyin',
            body: 'Taslağı yanıt kutusuna aktarın ve işletmenize özgü ayrıntıları ekleyin.',
          },
          {
            title: 'Onaylayıp gönderin',
            body: 'İçerikten sorumlu olduğunuzu onaylayın ve gönderin. Müşteri e-posta bıraktıysa yanıt ona e-postayla gider.',
          },
        ],
      },
      facts: {
        eyebrow: 'Kısaca',
        title: 'Pulse AI bir bakışta',
        items: [
          { value: '3', label: 'Ton seçeneği: sıcak, resmi, özür dileyen' },
          { value: '2–4', label: 'Cümlelik taslak, en fazla 80 kelime' },
          { value: 'TR + EN', label: 'Taslak dilleri' },
          { value: '0', label: 'Onayınız olmadan gönderilen yanıt' },
        ],
      },
      sectors: {
        eyebrow: 'Sektörler',
        title: 'Hangi işletmelerde işe yarar',
        lead: 'Tonu, işletmenizin müşterileriyle konuşma biçimine göre seçersiniz.',
        items: [
          { slug: 'restaurants', use: 'Gecikme ya da lezzetle ilgili düşük puanlara kısa ve sakin yanıtlar.' },
          { slug: 'hotels', use: 'Misafir şikâyetlerine resmi tonda, özenli yanıtlar.' },
          { slug: 'healthcare', use: 'Hasta geri bildirimlerine resmi ve saygılı yanıtlar.' },
          { slug: 'beauty-salon', use: 'Randevu ve hizmet deneyimine sıcak tonda yanıtlar.' },
        ],
      },
      faq: {
        eyebrow: 'Sık sorulan sorular',
        title: 'Pulse AI hakkında sorular',
        items: [
          {
            q: 'Taslak onayım olmadan gönderilebilir mi?',
            a: 'Hayır. Pulse AI yalnızca taslak hazırlar. Yanıtı okuyan, gerekirse düzenleyen ve gönderen sizsiniz; göndermeden önce içerikten sorumlu olduğunuzu da onaylarsınız. Otomatik taslak açık olsa bile hiçbir yanıt kendiliğinden gönderilmez.',
          },
          {
            q: 'Pulse AI hangi dillerde taslak hazırlar?',
            a: 'Türkçe ve İngilizce. Elle istediğiniz taslak, paneli kullandığınız dilde hazırlanır. Pulse AI yorumun dilini tespit etmez ve başka dillerde taslak yazmaz.',
          },
          {
            q: 'Pulse AI işletmemin üslubunu öğrenir mi?',
            a: 'Hayır. Her taslakta seçtiğiniz ton (sıcak, resmi veya özür dileyen) ve sabit yazım kuralları kullanılır; Pulse AI geçmiş yanıtlarınızdan öğrenmez. Taslak için yalnızca işletmenizin adı ve türü, müşterinin adı, puanı, yorumu ve geldiği platform kullanılır.',
          },
          {
            q: 'Taslak indirim veya ikram önerir mi?',
            a: 'Hayır. Olumsuz yorumlara yanıt verirken ikram, indirim veya hediye vaat etmemek Pulse AI’ın yazım kurallarındandır; taslağı göndermeden önce siz de okursunuz. Yorum karşılığında ödül sözü içeren yanıtlar ayrıca gönderim öncesi kontrolde durdurulur.',
          },
          {
            q: 'Hangi yapay zekâ sağlayıcısı kullanılıyor?',
            a: 'Yapay zekâ sağlayıcımız OpenAI’dır. Taslak için işletmenizin adı ve türü ile müşterinin puanı, yorumu, geldiği platform ve varsa adı; özet için yalnızca puan ve yorum OpenAI’a gönderilir. Müşterinin e-posta adresi ve telefonu gönderilmez. Kullandığımız alt işleyiciler Veri İşleyici Sözleşmesi’nde listelenir.',
          },
          {
            q: 'Yapay zekâ kullanılamazsa ne olur?',
            a: 'Yapay zekâ o an yanıt veremezse genel bir şablon taslak gösterilir. Şablonu düzenleyip yanıtınızı yine gönderebilirsiniz; yanıt akışınız durmaz.',
          },
        ],
        more: { href: `${base}/faq`, label: 'Tüm soruları görün' },
      },
      related: {
        eyebrow: 'İlgili özellikler',
        title: 'Pulse AI ile birlikte çalışır',
        items: relatedFeatureLinks(['review-management', 'analytics-reports', 'surveys'], locale),
      },
      ctaTitle: 'İlk yanıt taslağınızı Pulse AI ile hazırlayın',
    };
  }

  return {
    eyebrow: 'Pulse AI',
    title: 'AI drafts for your review replies',
    lead: 'Pulse AI reads low-rated feedback and prepares a 2–4 sentence reply draft in the tone you choose; you edit it and you approve it.',
    secondary: { href: `${base}/features/review-management`, label: 'Explore review management' },
    mockCaption: 'Sample screen: a 2-star QR feedback entry, the tone picker and the reply draft Pulse AI suggests.',
    definition: {
      eyebrow: 'Definition',
      title: 'What is Pulse AI?',
      paragraphs: [
        'Pulse AI is the reply assistant in the Buaze inbox. For a piece of 1–3★ feedback, it reads your business name, the customer’s rating and their comment and suggests a reply draft.',
        'Drafts are 2–4 sentences and at most 80 words; they contain no emoji and never promise free items, discounts or gifts in reply to a negative review. You choose a warm, formal or apologetic tone, and drafts are written in Turkish or English.',
        'Pulse AI never sends a reply for you. You can use the draft as it is, edit it, or delete it and write your own; you are always the one who presses send.',
      ],
      note: 'To prepare drafts and summaries, the feedback text is sent to our AI provider, OpenAI.',
      noteLink: { href: `${base}/veri-isleyici-sozlesmesi`, label: 'See our sub-processors' },
    },
    capabilities: {
      eyebrow: 'What you get',
      title: 'What Pulse AI does',
      items: [
        {
          icon: SlidersHorizontal,
          title: 'Three tones',
          body: 'Choose a warm, formal or apologetic tone. Set your business’s default tone in settings and change it for a single piece of feedback; the draft is rewritten when the tone changes.',
        },
        {
          icon: Languages,
          title: 'Turkish and English',
          body: 'Drafts are written in Turkish or English; a draft you ask for yourself follows the language you use the panel in. Pulse AI does not write in other languages or detect the language of the comment.',
        },
        {
          icon: PenLine,
          title: 'Edit, then send',
          body: 'Copy the draft into the reply box and edit it, or send it as it is. Each time you send, you confirm you are responsible for the content, and replies with risky wording are not sent.',
        },
        {
          icon: Zap,
          title: 'Optional automatic drafts',
          body: 'Turn it on in settings and a draft is prepared in the background whenever new 1–3★ feedback arrives, ready in the inbox. Automatic drafts are never sent without your approval either.',
        },
        {
          icon: FileText,
          title: 'Short summary',
          body: 'For feedback with a written comment, Pulse AI shows a short summary: the positives, the areas to improve and how likely the customer is to come back.',
        },
        {
          icon: LifeBuoy,
          title: 'A template when AI is unavailable',
          body: 'If AI is unavailable at that moment, a general template draft is shown instead. You can edit it and still send your reply.',
        },
      ],
    },
    steps: {
      eyebrow: 'How it works',
      title: 'Four steps from draft to sent',
      items: [
        {
          title: 'Open the feedback',
          body: 'Pick a piece of 1–3★ feedback in the inbox. If automatic drafts are on, Pulse AI’s suggestion is already there; if not, you create a draft with one click.',
        },
        {
          title: 'Choose a tone',
          body: 'Choose warm, formal or apologetic, and Pulse AI rewrites the draft in that tone.',
        },
        {
          title: 'Edit',
          body: 'Copy the draft into the reply box and add the details that are specific to your business.',
        },
        {
          title: 'Approve and send',
          body: 'Confirm that you are responsible for the content and send. If the customer left an e-mail address, the reply goes to them by e-mail.',
        },
      ],
    },
    facts: {
      eyebrow: 'In short',
      title: 'Pulse AI at a glance',
      items: [
        { value: '3', label: 'Tone options: warm, formal, apologetic' },
        { value: '2–4', label: 'Sentences per draft, 80 words at most' },
        { value: 'TR + EN', label: 'Draft languages' },
        { value: '0', label: 'Replies sent without your approval' },
      ],
    },
    sectors: {
      eyebrow: 'Industries',
      title: 'Where it helps',
      lead: 'You pick the tone that matches the way your business talks to its customers.',
      items: [
        { slug: 'restaurants', use: 'Short, calm replies to low ratings about delays or taste.' },
        { slug: 'hotels', use: 'Careful replies to guest complaints in a formal tone.' },
        { slug: 'healthcare', use: 'Formal, respectful replies to patient feedback.' },
        { slug: 'beauty-salon', use: 'Warm replies about appointments and the service.' },
      ],
    },
    faq: {
      eyebrow: 'Frequently asked questions',
      title: 'Questions about Pulse AI',
      items: [
        {
          q: 'Can a draft be sent without my approval?',
          a: 'No. Pulse AI only prepares drafts. You read the reply, edit it if needed and send it; before sending you also confirm that you are responsible for its content. Even with automatic drafts on, no reply is ever sent on its own.',
        },
        {
          q: 'Which languages does Pulse AI write in?',
          a: 'Turkish and English. A draft you ask for yourself follows the language you use the panel in. Pulse AI does not detect the language of the comment and does not write drafts in other languages.',
        },
        {
          q: 'Does Pulse AI learn my business’s voice?',
          a: 'No. Every draft uses the tone you choose (warm, formal or apologetic) and fixed writing rules; Pulse AI does not learn from your past replies. A draft uses only your business name and type, the customer’s name, rating and comment, and the platform it came from.',
        },
        {
          q: 'Will a draft offer a discount or a free item?',
          a: 'No. Not promising free items, discounts or gifts in reply to a negative review is one of Pulse AI’s writing rules, and you read every draft before it goes out. Replies that offer a reward in exchange for a review are also stopped by the check before sending.',
        },
        {
          q: 'Which AI provider is used?',
          a: 'Our AI provider is OpenAI. For a draft, your business name and type and the customer’s rating, comment, platform and, if given, name are sent to OpenAI; for a summary, only the rating and the comment. The customer’s e-mail address and phone number are not sent. The sub-processors we use are listed in the Data Processing Agreement.',
        },
        {
          q: 'What happens if AI is unavailable?',
          a: 'If AI cannot respond at that moment, a general template draft is shown. You can edit the template and still send your reply, so your replies never stall.',
        },
      ],
      more: { href: `${base}/faq`, label: 'See all questions' },
    },
    related: {
      eyebrow: 'Related features',
      title: 'Works together with Pulse AI',
      items: relatedFeatureLinks(['review-management', 'analytics-reports', 'surveys'], locale),
    },
    ctaTitle: 'Prepare your first reply draft with Pulse AI',
  };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isFeatureLocale(locale)) return {};
  return buildFeatureMetadata({ locale, slug: SLUG, ...META[locale] });
}

export default async function PulseAiPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isFeatureLocale(locale)) notFound();
  return (
    <FeaturePageLayout
      locale={locale}
      slug={SLUG}
      copy={getCopy(locale)}
      mock={<PulseAiMock locale={locale} />}
      schema={SCHEMA[locale]}
    />
  );
}
