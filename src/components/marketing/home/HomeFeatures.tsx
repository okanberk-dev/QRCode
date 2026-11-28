import Image from 'next/image';
import Link from 'next/link';
import { RtSegmented } from '../ritim/interactive';
import { img } from '../ritim/media';

/**
 * Product cards ("Ritim" `.rt-product-grid`): section head with a segmented
 * control on the right, two panels of four 296×414 photo cards with the
 * brand gradient and a white centred title. Every card links to its feature
 * page; the one-line texts only state what the product does (§51).
 */
type Card = { title: string; text: string; img: string; href: string };

function cards(locale: 'tr' | 'en'): { reviews: Card[]; tools: Card[] } {
  const b = `/${locale}`;
  const tr = locale === 'tr';
  return {
    reviews: [
      {
        title: tr ? 'QR geri bildirim' : 'QR feedback',
        text: tr ? 'İstediğiniz kadar QR kod; yeniden basmadan yön değiştirin.' : 'As many QR codes as you need; redirect them without reprinting.',
        img: img('qr-telefon'),
        href: `${b}/features/review-management`,
      },
      {
        title: 'Pulse AI',
        text: tr ? 'Siz onaylayınca gönderilen yanıt taslakları.' : 'Reply drafts sent only after you approve.',
        img: img('ai-panel'),
        href: `${b}/features/pulse-ai`,
      },
      {
        title: tr ? 'Platform bağlantıları' : 'Platform links',
        text: tr ? '10 yorum platformu, her gün kontrol edilen bağlantılar.' : '10 review platforms, links checked every day.',
        img: img('misafirler'),
        href: `${b}/integrations`,
      },
      {
        title: tr ? 'Analitik' : 'Analytics',
        text: tr ? 'Puan trendi, platform ve saat dağılımı, CSV raporu.' : 'Rating trend, platform and hour breakdowns, CSV export.',
        img: img('entegrasyon'),
        href: `${b}/features/analytics-reports`,
      },
    ],
    tools: [
      {
        title: tr ? 'QR Menü' : 'QR Menu',
        text: tr ? 'Temalar, alerjen etiketleri ve menü analitiği.' : 'Themes, allergen labels and menu analytics.',
        img: img('menu-telefon'),
        href: `${b}/features/menu`,
      },
      {
        title: tr ? 'Anketler' : 'Surveys',
        text: tr ? 'QR kodla açılan kısa anketler, 8 hazır şablon.' : 'Short surveys opened by QR, 8 ready templates.',
        img: img('kafe-ic'),
        href: `${b}/features/surveys`,
      },
      {
        title: tr ? 'Sadakat kartı' : 'Loyalty card',
        text: tr ? 'Damga ya da puan kartı, uygulama indirmeden.' : 'A stamp or points card, no app to install.',
        img: img('kahve'),
        href: `${b}/features/loyalty`,
      },
      {
        title: tr ? 'Denetim Merkezi' : 'Audit Center',
        text: tr ? 'Hijyen, açılış ve vardiya devri kontrol listeleri.' : 'Checklists for hygiene, opening and shift handover.',
        img: img('mutfak-ekip'),
        href: `${b}/features/audit-center`,
      },
    ],
  };
}

function Grid({ items }: { items: Card[] }) {
  return (
    <div className="rt-product-grid">
      {items.map((c) => (
        <Link key={c.title} className="rt-product-card" href={c.href}>
          <Image src={c.img} alt="" fill sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 296px" />
          <span className="rt-product-card__arrow" aria-hidden="true" />
          <div className="rt-product-card__body">
            <h3 className="rt-product-card__title">{c.title}</h3>
            <p className="rt-product-card__text">{c.text}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function HomeFeatures({ locale }: { locale: 'tr' | 'en' }) {
  const tr = locale === 'tr';
  const { reviews, tools } = cards(locale);
  return (
    <section id="features" className="rt-section rt-reveal" aria-labelledby="features-title">
      <div className="rt-container">
        <RtSegmented
          label={tr ? 'Ürün grupları' : 'Product groups'}
          head={
            <div className="rt-section-head__text">
              <h2 id="features-title" className="rt-t-h1">
                {tr ? 'Geri bildirimi toplayın, yanıtlayın ve izleyin' : 'Collect, answer and track feedback'}
              </h2>
              <p className="rt-t-lead">
                {tr
                  ? 'QR kodlarınızdan gelen her geri bildirim panelinize düşer. Yanıtlar, takip eder ve işi ekibinizle paylaşırsınız.'
                  : 'Every piece of feedback from your QR codes lands in your panel. Reply, follow up and share the work with your team.'}
              </p>
            </div>
          }
          tabs={[
            { id: 'reviews', label: tr ? 'Yorumlar' : 'Reviews', content: <Grid items={reviews} /> },
            { id: 'tools', label: tr ? 'İşletme araçları' : 'Business tools', content: <Grid items={tools} /> },
          ]}
        />
      </div>
    </section>
  );
}
