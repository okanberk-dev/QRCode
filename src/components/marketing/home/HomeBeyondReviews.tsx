import Link from 'next/link';
import { ArrowRight, Camera, Check, ClipboardCheck, Gift, MessageCircleQuestionMark } from 'lucide-react';
import LoyaltyCardFace from '@/components/loyalty/LoyaltyCardFace';
import SectionHeader from './SectionHeader';

/**
 * "Yorumların ötesinde" — Denetim Merkezi, Anketler and Sadakat kartı
 * (CLAUDE.md §60), each described once
 * with verifiable numbers (6 question types / 3 scoring modes; 5 question
 * types / up to 30 questions / 8 templates / 0–10 recommend question). The
 * small mockups are labelled sample screens with generic content.
 */

const COPY = {
  tr: {
    eyebrow: 'Yorumların ötesinde',
    title: 'Ekibiniz için denetimler, müşterileriniz için anket ve sadakat kartı',
    lead: "Ekibinizin kontrol listelerini Denetim Merkezi'nde yürütün, müşterilerinize puandan fazlasını kısa bir ankette sorun, düzenli gelenleri dijital damga ya da puan kartıyla ödüllendirin.",
    sample: 'Örnek ekran',
    audit: {
      name: 'Denetim Merkezi',
      body: 'Hijyen, açılış ve vardiya devri için kontrol listeleri, işe alım için testler hazırlayın. 6 soru tipi (fotoğraf dahil), 3 puanlama modu ve 6 sektöre özel hazır şablonlar vardır. Ekibiniz giriş yapmadan, paylaştığınız bağlantıdan doldurur; puan otomatik hesaplanır, gerektiğinde metin yanıtlarını elle puanlarsınız.',
      link: "Denetim Merkezi'ni inceleyin",
      mockTitle: 'Açılış kontrolü',
      items: ['Tezgâh ve yüzeyler temiz', 'Buzdolabı sıcaklığı kaydedildi', 'Mutfak girişinin fotoğrafı'],
      scoring: 'Puanlama: geçti / kaldı',
    },
    survey: {
      name: 'Anketler',
      body: 'QR kodla açılan kısa anketler hazırlayın: yıldız, 0–10 tavsiye sorusu, kısa ve uzun metin, çoktan seçmeli sorular. Anket başına en fazla 30 soru ekleyebilir, 8 hazır şablondan başlayabilirsiniz; sonuçları panelde görür, CSV olarak indirirsiniz.',
      link: "Anketler'i inceleyin",
      question: 'Bizi bir arkadaşınıza önerir misiniz?',
      low: 'Hiç',
      high: 'Kesinlikle',
    },
    loyalty: {
      name: 'Sadakat kartı',
      body: 'Kafe, restoran, berber ve salonlar için dijital damga ya da puan kartı. Müşteri kasadaki QR ile kartını telefonunda açar, uygulama indirmez; siz kasada ziyaret ekler, ödülü verirsiniz. Seviyeler, doğum günü hediyesi ve 6 hazır şablon vardır.',
      link: 'Sadakat kartını inceleyin',
      business: 'Örnek Kafe',
      program: 'Kahve kartı',
      reward: 'Ücretsiz kahve',
    },
  },
  en: {
    eyebrow: 'Beyond reviews',
    title: 'Audits for your team, surveys and a loyalty card for your customers',
    lead: "Run your team's checklists in the Audit Center, ask customers more than a rating in a short survey, and reward your regulars with a digital stamp or points card.",
    sample: 'Sample screen',
    audit: {
      name: 'Audit Center',
      body: 'Build checklists for hygiene, opening and shift handovers, and tests for hiring. There are 6 question types (photos included), 3 scoring modes and ready templates for 6 sectors. Your team fills them in from a link you share, without signing in; the score is calculated automatically, and you can score text answers by hand where needed.',
      link: 'Explore the Audit Center',
      mockTitle: 'Opening checklist',
      items: ['Counters and surfaces clean', 'Fridge temperature logged', 'Photo of the kitchen entrance'],
      scoring: 'Scoring: pass / fail',
    },
    survey: {
      name: 'Surveys',
      body: 'Build short surveys that open from a QR code, with star, 0–10 recommendation, short and long text and multiple-choice questions. Add up to 30 questions per survey or start from 8 ready templates; see the results in the panel and export them as CSV.',
      link: 'Explore Surveys',
      question: 'Would you recommend us to a friend?',
      low: 'Not at all',
      high: 'Definitely',
    },
    loyalty: {
      name: 'Loyalty card',
      body: 'A digital stamp or points card for cafés, restaurants, barbers and salons. Customers open it on their phone with the QR at the counter — no app — and you add visits and give rewards at the counter. Tiers, a birthday gift and 6 ready templates included.',
      link: 'Explore the loyalty card',
      business: 'Sample Café',
      program: 'Coffee card',
      reward: 'Free coffee',
    },
  },
} as const;

type Copy = (typeof COPY)[keyof typeof COPY];

function AuditMock({ copy }: { copy: Copy }) {
  return (
    <div className="rounded-[12px] border border-[#EDEDED] bg-white p-4">
      <p className="text-[14px] font-semibold text-[#0A0A0A]">{copy.audit.mockTitle}</p>
      <ul className="mt-3 space-y-2.5">
        {copy.audit.items.map((item, i) => (
          <li key={item} className="flex items-center gap-2.5 text-[13px] text-[#333333]">
            {i < 2 ? (
              <span
                aria-hidden="true"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] bg-[#0A0A0A] text-[#C6F24E]"
              >
                <Check size={12} strokeWidth={3} />
              </span>
            ) : (
              <span
                aria-hidden="true"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border border-[#D4D4D4] text-[#525252]"
              >
                <Camera size={12} />
              </span>
            )}
            {item}
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-[#EDEDED] pt-3 text-[12px] text-[#525252]">{copy.audit.scoring}</p>
    </div>
  );
}

function SurveyMock({ copy }: { copy: Copy }) {
  return (
    <div className="rounded-[12px] border border-[#EDEDED] bg-white p-4">
      <p className="text-[14px] font-semibold text-[#0A0A0A]">{copy.survey.question}</p>
      <div className="mt-3 grid grid-cols-11 gap-1" aria-hidden="true">
        {Array.from({ length: 11 }, (_, n) => (
          <span
            key={n}
            className={`flex aspect-square items-center justify-center rounded-[6px] text-[11px] font-medium ${
              n === 9 ? 'bg-[#0A0A0A] text-[#C6F24E]' : 'border border-[#EDEDED] bg-[#FAFAFA] text-[#525252]'
            }`}
          >
            {n}
          </span>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-[#737373]">
        <span>{copy.survey.low}</span>
        <span>{copy.survey.high}</span>
      </div>
    </div>
  );
}

export default function HomeBeyondReviews({ locale }: { locale: 'tr' | 'en' }) {
  const copy = COPY[locale];
  const base = `/${locale}`;
  const cards = [
    {
      key: 'audit',
      icon: ClipboardCheck,
      name: copy.audit.name,
      body: copy.audit.body,
      href: `${base}/features/audit-center`,
      link: copy.audit.link,
      mock: <AuditMock copy={copy} />,
    },
    {
      key: 'survey',
      icon: MessageCircleQuestionMark,
      name: copy.survey.name,
      body: copy.survey.body,
      href: `${base}/features/surveys`,
      link: copy.survey.link,
      mock: <SurveyMock copy={copy} />,
    },
    {
      key: 'loyalty',
      icon: Gift,
      name: copy.loyalty.name,
      body: copy.loyalty.body,
      href: `${base}/features/loyalty`,
      link: copy.loyalty.link,
      mock: (
        <LoyaltyCardFace
          businessName={copy.loyalty.business}
          programName={copy.loyalty.program}
          kind="stamps"
          balance={6}
          rewards={[{ title: copy.loyalty.reward, cost: 9 }]}
          memberName={locale === 'tr' ? 'Ayşe' : 'Alex'}
          code="KX7M42"
          locale={locale}
        />
      ),
    },
  ];

  return (
    <section id="beyond-reviews" aria-labelledby="beyond-reviews-title" className="bg-white py-[60px] sm:py-24">
      <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-10">
        <SectionHeader id="beyond-reviews-title" eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} />

        <div className="mt-12 grid grid-cols-1 gap-4 sm:mt-14 sm:gap-6 lg:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.key}
                className="flex flex-col rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8"
              >
                <div className="flex min-h-[220px] flex-col rounded-[16px] border border-[#EDEDED] bg-[#FAFAFA] p-4 lg:min-h-[268px]">
                  <p className="pulse-eyebrow text-[#737373]">{copy.sample}</p>
                  <div className="flex flex-1 flex-col justify-center pt-3">{card.mock}</div>
                </div>
                <div className="mt-7 flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#0A0A0A] text-[#C6F24E]"
                  >
                    <Icon size={20} strokeWidth={2} />
                  </span>
                  <h3 className="text-[22px] leading-[1.2] text-[#0A0A0A] sm:text-[24px]">{card.name}</h3>
                </div>
                <p className="mt-4 text-[15px] leading-[1.65] text-[#525252]">{card.body}</p>
                <div className="mt-auto pt-4">
                  <Link
                    href={card.href}
                    className="inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-semibold text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-4 transition-colors hover:decoration-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
                  >
                    {card.link}
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
