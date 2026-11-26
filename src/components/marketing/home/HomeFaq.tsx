import Link from 'next/link';
import { RtFaqList } from '../ritim/interactive';
import { SUPPORT_EMAIL, SUPPORT_HOURS } from '@/lib/company-constants';
import { HOME_FAQ } from './home-faq';

/**
 * Homepage FAQ — six questions from HOME_FAQ (the same array feeds the
 * FAQPage JSON-LD). Native <details>/<summary>: keyboard-operable, no JS,
 * every answer is in the server HTML. The first item starts open.
 *
 * Grid order: on phones the questions come right after the header and the
 * "another question?" card closes the section; on large screens the card
 * sits under the header in the left column.
 */

const COPY = {
  tr: {
    eyebrow: 'Sık sorulan sorular',
    title: 'QR ile yorum toplama hakkında sorular',
    lead: 'Aradığınız yanıt burada yoksa tüm soruları inceleyebilir ya da bize yazabilirsiniz.',
    all: 'Tüm soruları görün',
    contactTitle: 'Başka bir sorunuz mu var?',
  },
  en: {
    eyebrow: 'FAQ',
    title: 'Questions about collecting reviews with QR codes',
    lead: "If your question isn't answered here, browse the full FAQ or write to us.",
    all: 'See all questions',
    contactTitle: 'Have another question?',
  },
} as const;

export default function HomeFaq({ locale }: { locale: 'tr' | 'en' }) {
  const copy = COPY[locale];
  const faqs = HOME_FAQ[locale];
  return (
    <section id="faq" className="rt-section rt-reveal" aria-labelledby="faq-title">
      <div className="rt-container">
        <div className="rt-faq">
          <div className="rt-mini-head" style={{ alignContent: 'start' }}>
            <h2 id="faq-title" className="rt-t-h2">
              {copy.eyebrow}
            </h2>
            <p className="rt-t-muted">{copy.lead}</p>
            <Link className="rt-link-arrow" href={`/${locale}/faq`}>
              {copy.all}
            </Link>
            <p className="rt-t-sm rt-t-muted" style={{ marginTop: 16 }}>
              {copy.contactTitle}{' '}
              <a className="rt-link" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>{' '}
              · {SUPPORT_HOURS[locale]}
            </p>
          </div>
          <RtFaqList items={faqs.map((f) => ({ q: f.q, a: f.a }))} firstOpen />
        </div>
      </div>
    </section>
  );
}
