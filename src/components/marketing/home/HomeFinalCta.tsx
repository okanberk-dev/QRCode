import Image from 'next/image';
import Link from 'next/link';
import { RtCapture } from '../ritim/interactive';
import { Scribble } from '../ritim/icons';
import { SITE_VIDEOS, img } from '../ritim/media';

/**
 * Closing lime band. Two CTAs only; facts are verifiable (14-day trial, no
 * card at sign-up, cancel any time with access to the end of the period).
 * Register links carry rel="nofollow" (spec §5: /auth/* is noindex).
 */

const COPY = {
  tr: {
    title: 'QR kodla geri bildirim toplamaya bugün başlayın',
    facts: ['14 gün ücretsiz', 'Kredi kartı gerekmez', 'İstediğiniz zaman iptal edebilirsiniz'],
    primary: 'Ücretsiz deneyin',
    secondary: 'Fiyatları inceleyin',
  },
  en: {
    title: 'Start collecting feedback with QR codes today',
    facts: ['14-day free trial', 'No credit card', 'Cancel anytime'],
    primary: 'Start free trial',
    secondary: 'See pricing',
  },
} as const;

export default function HomeFinalCta({ locale }: { locale: 'tr' | 'en' }) {
  const copy = COPY[locale];
  const tr = locale === 'tr';
  return (
    <section className="rt-closing" aria-labelledby="final-cta-title">
      {SITE_VIDEOS.closing ? (
        <video autoPlay muted loop playsInline poster={img('restoran-aksam')} aria-hidden="true" className="rt-img-fill" style={{ zIndex: -2 }}>
          <source src={SITE_VIDEOS.closing} type="video/mp4" />
        </video>
      ) : (
        <Image src={img('restoran-aksam')} alt="" fill sizes="(max-width: 1320px) 100vw, 1320px" />
      )}
      <div className="rt-closing__inner">
        <h2 id="final-cta-title" className="rt-t-display">
          {tr ? 'Hadi ' : "Let's get "}
          <Scribble>{tr ? 'başlayalım' : 'started'}</Scribble>
        </h2>
        <p className="rt-t-lead" style={{ color: '#fff' }}>
          {copy.title}
        </p>
        <ul className="rt-checklist rt-checklist--white">
          {copy.facts.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <RtCapture
          locale={locale}
          button={copy.primary}
          placeholder={tr ? 'E-posta adresiniz*' : 'Your e-mail*'}
          label={tr ? 'E-posta adresi' : 'E-mail address'}
        />
        <p className="rt-hero__note">
          <Link href={`/${locale}/pricing`}>{copy.secondary}</Link>
        </p>
      </div>
    </section>
  );
}
