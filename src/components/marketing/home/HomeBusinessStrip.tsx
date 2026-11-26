/**
 * Business-type strip under the hero ("Ritim" `.rt-logos` marquee). Words,
 * not customer logos: these are the kinds of businesses Buaze is built for,
 * never a claim about who uses it (§51).
 */
const WORDS = {
  tr: ['Restoran', 'KAFE', 'Pastane', 'OTEL', 'Kuaför', 'Klinik', 'MAĞAZA', 'Paket servis', 'Bar', 'BERBER', 'Güzellik salonu', 'Market'],
  en: ['Restaurant', 'CAFÉ', 'Bakery', 'HOTEL', 'Hair salon', 'Clinic', 'RETAIL', 'Delivery', 'Bar', 'BARBER', 'Beauty salon', 'Grocery'],
} as const;

const STYLES = ['rt-logo-word--serif', 'rt-logo-word--caps', 'rt-logo-word--script', 'rt-logo-word--heavy', 'rt-logo-word--plain'];

export default function HomeBusinessStrip({ locale }: { locale: 'tr' | 'en' }) {
  const words = WORDS[locale];
  const row = (hidden: boolean) =>
    words.map((w, i) => (
      <span key={`${hidden}-${w}`} className={`rt-logo-word ${STYLES[i % STYLES.length]}`} aria-hidden={hidden || undefined}>
        {w}
      </span>
    ));
  return (
    <div
      className="rt-logos rt-reveal"
      role="region"
      aria-label={locale === 'tr' ? "Buaze'nin uygun olduğu işletme tipleri" : 'Business types Buaze is built for'}
    >
      <div className="rt-logos__track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
