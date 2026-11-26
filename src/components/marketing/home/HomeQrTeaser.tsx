import Image from 'next/image';
import Link from 'next/link';
import { img } from '../ritim/media';

/**
 * Free QR generator teaser — the homepage's second (and last) dark block,
 * as a contained card on a light section. Only what the free tool does
 * today: static code, 4 card themes, PNG download or A5 print-to-PDF, no
 * account. The fanned cards on the right are a decorative preview of the
 * generator's card (eyebrow, headline, QR on a white tile, footer line) in
 * three of its themes (aria-hidden).
 */

const COPY = {
  tr: {
    eyebrow: 'Ücretsiz araç',
    title: 'Hesap açmadan QR kod oluşturun',
    lead: 'Web siteniz, menünüz veya Google yorum bağlantınız için statik bir QR kod oluşturun. 4 kart temasından birini seçin, kartı PNG olarak indirin ya da A5 sayfaya PDF olarak yazdırın. Kod herhangi bir hesaba bağlı değildir ve süresi dolmaz.',
    cta: 'QR kod oluşturucuyu açın',
  },
  en: {
    eyebrow: 'Free tool',
    title: 'Create a QR code without an account',
    lead: "Make a static QR code for your website, menu or Google review link. Pick one of 4 card themes, then download the card as a PNG or print it on an A5 page as a PDF. The code isn't tied to any account and never expires.",
    cta: 'Open the QR code generator',
  },
} as const;

export default function HomeQrTeaser({ locale }: { locale: 'tr' | 'en' }) {
  const copy = COPY[locale];
  return (
    <section id="qr-generator" className="rt-section rt-reveal" aria-labelledby="qr-teaser-title">
      <div className="rt-container">
        <div className="rt-banner">
          <div className="rt-banner__text">
            <span className="rt-badge">{copy.eyebrow}</span>
            <h2 id="qr-teaser-title" className="rt-t-h3">
              {copy.title}
            </h2>
            <p className="rt-t-muted">{copy.lead}</p>
            <Link className="rt-btn rt-btn--primary" href={`/${locale}/solutions/qr-generator`}>
              {copy.cta}
            </Link>
          </div>
          <div className="rt-banner__img" style={{ position: 'relative', minHeight: 220 }}>
            <Image src={img('kafe-sayac')} alt="" fill sizes="(max-width: 1023px) 100vw, 360px" />
          </div>
        </div>
      </div>
    </section>
  );
}
