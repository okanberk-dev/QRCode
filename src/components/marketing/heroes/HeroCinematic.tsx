import Image from 'next/image';
import Link from 'next/link';
import { RtCapture } from '../ritim/interactive';
import { Scribble } from '../ritim/icons';
import { SITE_VIDEOS, img } from '../ritim/media';

/**
 * Homepage hero — "Ritim" design (CLAUDE.md §62): 720 px full-width photo
 * (or the optional background video, ritim/media.ts) with the bottom corners
 * rounded 48 px, dark radial + linear scrim, white copy on the left: play
 * pill → 100/80 h1 → 28/39 subline → e-mail capture → note → aside link.
 * The H1 keeps the keyword-led title (§35.11). Server component; the only
 * client part is the e-mail capture.
 */
const COPY = {
  tr: {
    pill: 'Nasıl çalıştığını görün',
    titleA: 'Google yorumlarınızı QR kodla ',
    titleB: 'toplayın',
    subtitle:
      'Müşteriniz QR kodu okutup puan verir. Her müşteri herkese açık yorum bağlantınızı görür; belirlediğiniz eşiğin altındaki puanlarda önce size özel geri bildirim yazabilir.',
    label: 'E-posta adresi',
    placeholder: 'E-posta adresiniz*',
    button: 'Ücretsiz Dene',
    note: '14 gün ücretsiz · Kredi kartı gerekmez · 10 yorum platformu · Ayrıntılar: ',
    noteLink: 'KVKK aydınlatma metni',
    aside: 'Fiyatları önce görmek mi istersiniz?',
    asideLink: 'Paketleri gör',
    alt: 'Servis sırasında tabak hazırlayan şef',
  },
  en: {
    pill: 'See how it works',
    titleA: 'Collect Google reviews with ',
    titleB: 'QR codes',
    subtitle:
      'Your customers scan the QR code and give a rating. Every customer sees your public review link; below the threshold you set, they can send you private feedback first.',
    label: 'E-mail address',
    placeholder: 'Your e-mail*',
    button: 'Start free',
    note: '14-day free trial · No credit card · 10 review platforms · Details: ',
    noteLink: 'privacy notice',
    aside: 'Want to see the prices first?',
    asideLink: 'See plans',
    alt: 'A chef plating a dish during service',
  },
} as const;

export default function HeroCinematic({ locale }: { locale: 'tr' | 'en' }) {
  const c = COPY[locale];
  return (
    <section className="rt-hero" aria-labelledby="hero-title">
      <div className="rt-hero__media">
        {SITE_VIDEOS.hero ? (
          <video autoPlay muted loop playsInline poster={img('hero-sef')} aria-hidden="true">
            <source src={SITE_VIDEOS.hero} type="video/mp4" />
          </video>
        ) : (
          <Image src={img('hero-sef')} alt={c.alt} fill priority sizes="100vw" />
        )}
      </div>
      <div className="rt-container">
        <div className="rt-hero__content">
          <a className="rt-pill-play" href="#nasil-calisir">
            <span className="rt-pill-play__icon" aria-hidden="true" />
            {c.pill}
          </a>
          <h1 id="hero-title" className="rt-hero__title">
            {c.titleA}
            <Scribble>{c.titleB}</Scribble>
          </h1>
          <p className="rt-hero__sub">{c.subtitle}</p>
          <RtCapture locale={locale} button={c.button} placeholder={c.placeholder} label={c.label} />
          <p className="rt-hero__note">
            {c.note}
            <Link href={`/${locale}/kvkk`} prefetch={false}>
              {c.noteLink}
            </Link>
          </p>
          <p className="rt-hero__aside">
            {c.aside}{' '}
            <Link href={`/${locale}/pricing`}>{c.asideLink}</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
