import Link from 'next/link';
import { DATA_COPY } from '@/lib/legal/subprocessors';

/**
 * Trust — the homepage's single place for the review rules and data
 * handling. Behaviour only, never a certification (spec D2): no "uyumlu",
 * no seals. The review flow is described with the owner's threshold (D1),
 * and the AI provider is named because data handling is discussed here.
 * Layout: "Ritim" gradient CTA panel (review flow) + cream panel (data).
 */

const COPY = {
  tr: {
    eyebrow: 'Güven ve veri',
    title: 'Google kuralları ve KVKK: Buaze neyi yapar, neyi yapmaz',
    lead: 'Yorum akışının nasıl çalıştığını ve müşteri verilerini nasıl işlediğimizi açıkça yazıyoruz.',
    reviews: {
      title: 'Yorum akışı',
      items: [
        'Herkese açık yorum bağlantısı her puanda gösterilir.',
        'Eşiğin altındaki puanlarda müşteri önce size özel geri bildirim yazabilir. Eşiği 4 ya da 5 yıldız olarak siz seçersiniz; varsayılan 5 yıldızdır.',
        'Buaze yorum silmez, gizlemez veya değiştirmez.',
        'Sahte yorum yazmaz, yazdırmaz.',
        'Yorum karşılığında indirim, hediye veya ödül sunmaz.',
      ],
      links: [{ path: '/google-compliance', label: 'Google yorum kuralları ve Buaze' }],
    },
    data: {
      title: 'Müşteri verisi',
      items: [
        'Müşteri formunda KVKK aydınlatma onayı alınır; pazarlama izni ayrıdır ve varsayılan olarak kapalıdır.',
        'IP adresleri 90 gün sonra anonimleştirilir.',
        DATA_COPY.hosting.tr,
        `Pulse AI taslakları ve analitikteki yapay zekâ konu özetleri için ${DATA_COPY.aiSent.tr}.`,
        'Hesap verilerinizi JSON olarak indirebilirsiniz; hesabınızı silerseniz 30 gün içinde geri alabilirsiniz.',
      ],
      links: [
        { path: '/kvkk', label: 'KVKK aydınlatma metni' },
        { path: '/veri-isleyici-sozlesmesi', label: 'Veri İşleyici Sözleşmesi' },
      ],
    },
  },
  en: {
    eyebrow: 'Trust and data',
    title: "Google's rules and data protection: what Buaze does and doesn't do",
    lead: 'We explain plainly how the review flow works and how we handle customer data.',
    reviews: {
      title: 'The review flow',
      items: [
        'The public review link is shown at every rating.',
        'Below your threshold, the customer can send you private feedback first. You set the threshold at 4 or 5 stars; the default is 5.',
        'Buaze does not delete, hide or edit reviews.',
        'It does not write fake reviews or have them written.',
        'It offers no discount, gift or reward in exchange for a review.',
      ],
      links: [{ path: '/google-compliance', label: "Google's review rules and Buaze" }],
    },
    data: {
      title: 'Customer data',
      items: [
        "The customer form asks for consent under KVKK, Turkey's data protection law; marketing consent is separate and off by default.",
        'IP addresses are anonymised after 90 days.',
        DATA_COPY.hosting.en,
        `For Pulse AI drafts and the AI topic summaries in analytics, ${DATA_COPY.aiSent.en}.`,
        'You can export your account data as JSON, and if you delete your account you can undo it within 30 days.',
      ],
      links: [
        { path: '/privacy', label: 'Privacy policy' },
        { path: '/veri-isleyici-sozlesmesi', label: 'Data Processing Agreement' },
      ],
    },
  },
} as const;

export default function HomeTrust({ locale }: { locale: 'tr' | 'en' }) {
  const copy = COPY[locale];
  const base = `/${locale}`;
  const [first, , ...rest] = copy.reviews.items;
  return (
    <section id="trust" className="rt-section rt-reveal" aria-labelledby="trust-title">
      <div className="rt-container">
        <div className="rt-cta-panel">
          <div className="rt-cta-panel__left">
            <div className="rt-mini-head">
              <p className="rt-eyebrow" style={{ color: '#fff' }}>
                {copy.eyebrow}
              </p>
              <h2 id="trust-title" className="rt-t-h1">
                {copy.title}
              </h2>
            </div>
            <p className="rt-t-body-lg">{copy.lead}</p>
          </div>
          <div className="rt-cta-panel__right">
            <ul className="rt-checklist rt-checklist--white">
              {[first, ...rest].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="rt-btn-group">
              {copy.reviews.links.map((l) => (
                <Link key={l.path} className="rt-btn rt-btn--white" href={`${base}${l.path}`}>
                  {l.label}
                </Link>
              ))}
              <Link className="rt-btn rt-btn--ghost-white" href={`${base}${copy.data.links[0].path}`}>
                {copy.data.links[0].label}
              </Link>
            </div>
          </div>
        </div>
        <div className="rt-surface-cream" style={{ marginTop: 24, padding: 'clamp(24px, 5vw, 48px)' }}>
          <h3 className="rt-t-h3">{copy.data.title}</h3>
          <ul className="rt-checklist" style={{ marginTop: 24 }}>
            {copy.data.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
            {copy.data.links.map((l) => (
              <Link key={l.path} className="rt-link-arrow" href={`${base}${l.path}`}>
                {l.label}
              </Link>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}
