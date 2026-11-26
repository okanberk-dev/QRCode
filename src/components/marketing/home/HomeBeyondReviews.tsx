import Link from 'next/link';
import Image from 'next/image';
import { img } from '../ritim/media';

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
      body: 'Kafe, restoran, berber ve salonlar için dijital damga ya da puan kartı. Müşteri kasadaki QR ya da NFC etiketiyle kartını telefonunda açar, uygulama indirmez; siz kartını telefonunuzun kamerasıyla okutup damga eklersiniz. Şubelerde tek kart, ödül hazır bildirimi, seviyeler ve doğum günü hediyesi vardır.',
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
      body: 'A digital stamp or points card for cafés, restaurants, barbers and salons. Customers open it on their phone with the QR or an NFC tag at the counter — no app — and you scan their card with your phone’s camera to add a stamp. One card for all branches, reward-ready alerts, tiers and a birthday gift.',
      link: 'Explore the loyalty card',
      business: 'Sample Café',
      program: 'Coffee card',
      reward: 'Free coffee',
    },
  },
} as const;

/** Short card titles for the "Ritim" dark cards (the long bodies stay on the feature pages). */
const CARD_LINES = {
  tr: {
    audit: 'Hijyen, açılış ve vardiya devri için kontrol listeleri; fotoğraflı sorular.',
    survey: 'QR kodla açılan kısa anketler; 8 hazır şablon, CSV dışa aktarma.',
    loyalty: 'Damga ya da puan kartı; müşteri uygulama indirmez, şubelerde tek kart.',
  },
  en: {
    audit: 'Checklists for hygiene, opening and shift handover, with photo questions.',
    survey: 'Short surveys opened by QR code; 8 ready templates, CSV export.',
    loyalty: 'A stamp or points card; no app for customers, one card for all branches.',
  },
} as const;

export default function HomeBeyondReviews({ locale }: { locale: 'tr' | 'en' }) {
  const copy = COPY[locale];
  const lines = CARD_LINES[locale];
  const base = `/${locale}`;
  const tr = locale === 'tr';
  const cards = [
    { name: copy.audit.name, line: lines.audit, href: `${base}/features/audit-center`, img: img('mutfak-pisirme'), isNew: false },
    { name: copy.survey.name, line: lines.survey, href: `${base}/features/surveys`, img: img('grup-yemek'), isNew: false },
    { name: copy.loyalty.name, line: lines.loyalty, href: `${base}/features/loyalty`, img: img('kahve-tost'), isNew: true },
  ];
  return (
    <section id="beyond-reviews" className="rt-section rt-reveal" aria-labelledby="beyond-reviews-title">
      <div className="rt-container">
        <div className="rt-section-head">
          <div className="rt-section-head__text">
            <p className="rt-release-tag">
              <b>2026</b>
              {copy.eyebrow}
            </p>
            <h2 id="beyond-reviews-title" className="rt-t-h1">
              {copy.title}
            </h2>
            <p className="rt-t-lead">{copy.lead}</p>
          </div>
          <div className="rt-btn-group" style={{ flexDirection: 'column' }}>
            <Link className="rt-btn rt-btn--primary" href={`${base}/auth/register`} rel="nofollow">
              {tr ? 'Ücretsiz Dene' : 'Start free'}
            </Link>
            <Link className="rt-btn rt-btn--outline" href={`${base}/features`}>
              {tr ? 'Tüm özellikler' : 'All features'}
            </Link>
          </div>
        </div>
        <div className="rt-dark-grid">
          {cards.map((card) => (
            <Link key={card.name} className="rt-dark-card" href={card.href}>
              <Image src={card.img} alt="" fill sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 420px" />
              <div className="rt-dark-card__top">
                {card.isNew && <span className="rt-badge rt-badge--sun">{tr ? 'Yeni' : 'New'}</span>}
                {card.name}
                <span className="rt-circle-btn" aria-hidden="true" />
              </div>
              <h3 className="rt-dark-card__title">{card.line}</h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
