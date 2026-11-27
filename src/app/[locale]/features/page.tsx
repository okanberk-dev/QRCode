import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import {
  FEATURE_CARD,
  FEATURE_CONTAINER,
  FEATURE_SECTION_Y,
  FEATURE_TEXT_LINK,
  FeatureCtaSection,
  FeatureFaqSection,
  FeatureHero,
  FeaturePageShell,
  FeatureSectionHeading,
  type FeatureFaq,
} from '@/components/marketing/FeaturePageLayout';
import { SITE_URL } from '@/lib/site';
import {
  buildFeatureHubJsonLd,
  buildFeatureMetadata,
  isFeatureLocale,
  type FeatureLocale,
} from '@/lib/seo/feature-schema';
import { FEATURE_CATALOG, type FeatureCatalogEntry } from './_components/feature-catalog';
import { HubMock } from './_components/mocks';

// /features — the index of every product surface. Each card carries two or
// three sentences that are true today (copy lives in feature-catalog.ts, so
// a surface is described the same way here and in "related features").
// JSON-LD: ItemList with URLs + BreadcrumbList; no HowTo (spec D12).

const META = {
  tr: {
    title: 'Özellikler: QR geri bildirim, Pulse AI ve analitik',
    description:
      'QR geri bildirim gelen kutusu, Pulse AI yanıt taslakları, analitik, QR Menü, anketler ve Denetim Merkezi; 10 yorum platformunun bağlantısı tek panelde.',
  },
  en: {
    title: 'Features: QR feedback, Pulse AI and analytics',
    description:
      'A QR feedback inbox, Pulse AI reply drafts, analytics, QR Menu, surveys and the Audit Center, with links to 10 review platforms managed in one panel.',
  },
} as const;

interface HubCopy {
  eyebrow: string;
  title: string;
  lead: string;
  secondary: { href: string; label: string };
  mockCaption: string;
  listName: string;
  feedback: { eyebrow: string; title: string; lead: string };
  tools: { eyebrow: string; title: string; lead: string };
  freeBadge: string;
  faq: { eyebrow: string; title: string; items: readonly FeatureFaq[]; more: { href: string; label: string } };
  ctaTitle: string;
}

function getCopy(locale: FeatureLocale): HubCopy {
  const base = `/${locale}`;
  if (locale === 'tr') {
    return {
      eyebrow: 'Özellikler',
      title: 'QR geri bildirim ve yorum yönetimi özellikleri',
      lead: 'QR kodla gelen geri bildirimleri toplayın, yanıtlayın ve ölçün; menünüzü, anketlerinizi ve denetimlerinizi de aynı panelden yönetin.',
      secondary: { href: `${base}/how-it-works`, label: 'Nasıl çalıştığını görün' },
      mockCaption:
        'Örnek ekran: Buaze panelinin bölümleri; bir geri bildirim, Pulse AI önerisi, ortalama puan ve menü QR kodu.',
      listName: 'Buaze özellikleri',
      feedback: {
        eyebrow: 'Geri bildirim',
        title: 'Geri bildirimi toplayın, yanıtlayın ve ölçün',
        lead: 'Müşteri QR kodunuzu okutup puan verir. Her müşteri herkese açık yorum bağlantısını görür; belirlediğiniz eşiğin altındaki puanlarda önce size yazabilir.',
      },
      tools: {
        eyebrow: 'İşletme araçları',
        title: 'Menü, anket ve denetim araçları',
        lead: 'QR Menü, Anketler ve Denetim Merkezi aynı hesapta çalışır; ücretsiz QR kod oluşturucuyu ise hesap açmadan kullanabilirsiniz.',
      },
      freeBadge: 'Ücretsiz · hesap gerekmez',
      faq: {
        eyebrow: 'Sık sorulan sorular',
        title: 'Özellikler hakkında sorular',
        items: [
          {
            q: 'Ücretsiz denemede hangi özellikleri kullanabilirim?',
            a: '14 günlük denemede yorum yönetimi, Pulse AI, analitik, QR Menü, Anketler ve Denetim Merkezi açıktır; kredi kartı istenmez. Google yorumlarına panelden yanıt vermek ise Google’ın erişim onayına bağlıdır ve şu an genel kullanıma açık değildir.',
          },
          {
            q: 'Panelde hangi yorumları görürüm?',
            a: 'QR kodunuzla gelen geri bildirimleri ve Google işletme profilinizin özetini görürsünüz: Google puanınız, yorum sayınız ve Google’ın paylaştığı en fazla 5 yorum. Yemeksepeti, Tripadvisor veya Booking.com gibi platformlardaki yorumlar panele aktarılmaz; Buaze bu platformlar için yorum sayfasının bağlantısını tutar.',
          },
          {
            q: 'Özellikler hangi dillerde çalışır?',
            a: 'Panel, müşteri geri bildirim formu, denetimler ve e-postalar Türkçe ve İngilizcedir; Pulse AI taslakları da bu iki dilde hazırlanır. Anket formundaki düğmeler ve onay metinleri şu an Türkçedir.',
          },
          {
            q: 'Ekibimle birlikte kullanabilir miyim?',
            a: 'Evet. Ekip üyelerini e-postayla davet edip yönetici, personel veya görüntüleyici rolü verirsiniz; davet 7 gün geçerlidir. Her üyenin hangi işletmelere erişeceğini siz seçersiniz.',
          },
        ],
        more: { href: `${base}/faq`, label: 'Tüm soruları görün' },
      },
      ctaTitle: 'Buaze’yi kendi işletmenizde deneyin',
    };
  }

  return {
    eyebrow: 'Features',
    title: 'QR feedback and review management features',
    lead: 'Collect, answer and measure the feedback that comes in through your QR codes, and run your menu, surveys and audits from the same panel.',
    secondary: { href: `${base}/how-it-works`, label: 'See how it works' },
    mockCaption:
      'Sample screen: sections of the Buaze panel, with a piece of feedback, a Pulse AI suggestion, the average rating and the menu QR code.',
    listName: 'Buaze features',
    feedback: {
      eyebrow: 'Feedback',
      title: 'Collect, answer and measure feedback',
      lead: 'The customer scans your QR code and gives a rating. Every customer sees the public review link; below your threshold they can write to you first.',
    },
    tools: {
      eyebrow: 'Business tools',
      title: 'Menu, survey and audit tools',
      lead: 'QR Menu, Surveys and the Audit Center run in the same account; the free QR code generator works without one.',
    },
    freeBadge: 'Free · no account needed',
    faq: {
      eyebrow: 'Frequently asked questions',
      title: 'Questions about the features',
      items: [
        {
          q: 'Which features can I use during the free trial?',
          a: 'The 14-day trial includes review management, Pulse AI, analytics, QR Menu, Surveys and the Audit Center, and no credit card is required. Replying to Google reviews from the panel depends on Google’s access approval and is not generally available yet.',
        },
        {
          q: 'Which reviews do I see in the panel?',
          a: 'You see the feedback that comes through your QR codes and an overview of your Google Business Profile: your Google rating, your review count and up to 5 reviews Google shares. Reviews on platforms such as Yemeksepeti, Tripadvisor or Booking.com are not imported; for those platforms Buaze keeps the link to the review page.',
        },
        {
          q: 'Which languages do the features work in?',
          a: 'The panel, the customer feedback form, audits and e-mails are in Turkish and English, and Pulse AI drafts are written in these two languages. The buttons and consent text on the survey form are in Turkish for now.',
        },
        {
          q: 'Can I use it with my team?',
          a: 'Yes. Invite teammates by e-mail and give them a manager, staff or viewer role; invitations are valid for 7 days. You choose which businesses each member can access.',
        },
      ],
      more: { href: `${base}/faq`, label: 'See all questions' },
    },
    ctaTitle: 'Try Buaze with your own business',
  };
}

function CatalogCard({
  entry,
  locale,
  badge,
}: {
  entry: FeatureCatalogEntry;
  locale: FeatureLocale;
  badge?: string;
}) {
  const Icon = entry.icon;
  return (
    <li>
      <article className={`flex h-full flex-col ${FEATURE_CARD}`}>
        <div className="flex items-start justify-between gap-3">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#EAF9B8] text-[#0A0A0A]"
          >
            <Icon size={20} strokeWidth={2} />
          </span>
          {badge ? (
            <span className="rounded-full border border-[#E5E5E5] bg-[#FAFAFA] px-2.5 py-1 text-[12px] font-medium text-[#525252]">
              {badge}
            </span>
          ) : null}
        </div>
        <h3 className="mt-5 text-[22px] leading-[1.2] text-[#0A0A0A]">{entry.name[locale]}</h3>
        <p className="mt-3 text-[15px] leading-[1.65] text-[#525252]">{entry.summary[locale]}</p>
        <p className="mt-auto pt-5">
          <Link href={`/${locale}${entry.path}`} className={FEATURE_TEXT_LINK}>
            {entry.linkLabel[locale]}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </p>
      </article>
    </li>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isFeatureLocale(locale)) return {};
  return buildFeatureMetadata({ locale, slug: '', ...META[locale] });
}

export default async function FeaturesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isFeatureLocale(locale)) notFound();
  const copy = getCopy(locale);

  const feedbackEntries = FEATURE_CATALOG.filter((f) => f.group === 'feedback');
  const toolEntries = FEATURE_CATALOG.filter((f) => f.group !== 'feedback');

  const jsonLd = buildFeatureHubJsonLd({
    locale,
    listName: copy.listName,
    items: FEATURE_CATALOG.map((entry) => ({
      name: entry.name[locale],
      description: entry.summary[locale],
      url: `${SITE_URL}/${locale}${entry.path}`,
    })),
    faqs: copy.faq.items,
  });

  return (
    <FeaturePageShell locale={locale} jsonLd={jsonLd}>
      <FeatureHero
        locale={locale}
        eyebrow={copy.eyebrow}
        title={copy.title}
        lead={copy.lead}
        secondary={copy.secondary}
        mock={<HubMock locale={locale} />}
        mockCaption={copy.mockCaption}
      />

      <section aria-labelledby="features-feedback-title" className={`bg-[#FAFAFA] ${FEATURE_SECTION_Y}`}>
        <div className={FEATURE_CONTAINER}>
          <FeatureSectionHeading
            id="features-feedback-title"
            eyebrow={copy.feedback.eyebrow}
            title={copy.feedback.title}
            lead={copy.feedback.lead}
          />
          <ul className="mt-12 grid grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-6">
            {feedbackEntries.map((entry) => (
              <CatalogCard key={entry.id} entry={entry} locale={locale} />
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="features-tools-title" className={`bg-white ${FEATURE_SECTION_Y}`}>
        <div className={FEATURE_CONTAINER}>
          <FeatureSectionHeading
            id="features-tools-title"
            eyebrow={copy.tools.eyebrow}
            title={copy.tools.title}
            lead={copy.tools.lead}
          />
          <ul className="mt-12 grid grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-6">
            {toolEntries.map((entry) => (
              <CatalogCard
                key={entry.id}
                entry={entry}
                locale={locale}
                badge={entry.group === 'free' ? copy.freeBadge : undefined}
              />
            ))}
          </ul>
        </div>
      </section>

      <FeatureFaqSection
        locale={locale}
        eyebrow={copy.faq.eyebrow}
        title={copy.faq.title}
        items={copy.faq.items}
        more={copy.faq.more}
      />

      <FeatureCtaSection locale={locale} title={copy.ctaTitle} />
    </FeaturePageShell>
  );
}
