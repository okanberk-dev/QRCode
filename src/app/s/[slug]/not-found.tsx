// Public survey link that is not accepting responses: unknown slug, draft,
// paused, or switched off by Buaze. The HTTP status stays 404 (a distinct
// answer per cause would let anyone probe which slugs exist); the person who
// scanned a printed QR code just sees a calm, correct explanation instead of
// the generic Buaze 404.
//
// This is the only public survey surface in two languages: the survey itself
// has no language field, but the link may be opened by anyone, so the
// Accept-Language header decides (default Turkish). No link back into the
// site — nothing internal is exposed.

import { headers } from 'next/headers';
import { detectLocaleFromAcceptLanguage } from '@/lib/translations';

const COPY = {
  tr: {
    title: 'Bu anket şu anda yanıt almıyor',
    body: 'Bağlantı doğru olabilir; anket kapatılmış ya da henüz yayınlanmamış olabilir. Ayrıntı için işletmeye sorabilirsin.',
  },
  en: {
    title: "This survey isn't accepting responses right now",
    body: 'The link may be right — the survey may be closed or not published yet. You can ask the business for details.',
  },
} as const;

export default async function SurveyNotAccepting() {
  const requestHeaders = await headers();
  const locale = detectLocaleFromAcceptLanguage(requestHeaders.get('accept-language'));
  const copy = COPY[locale];

  return (
    <main
      lang={locale}
      className="bz-survey-stage flex min-h-dvh items-center justify-center"
      style={
        {
          fontFamily: 'var(--font-body)',
          '--bz-survey-stage-mobile': '#5D3EBC',
        } as React.CSSProperties
      }
    >
      <div className="bz-survey-frame" style={{ background: '#5D3EBC' }}>
        <div
          className="relative flex flex-1 flex-col items-center justify-center text-center"
          style={{ padding: '48px 28px', color: '#fff' }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: '10%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 340,
              height: 340,
              borderRadius: 999,
              background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)',
              pointerEvents: 'none',
            }}
          />
          <div
            aria-hidden
            className="relative flex items-center justify-center"
            style={{
              width: 72,
              height: 72,
              borderRadius: 999,
              marginBottom: 28,
              background: '#fff',
              color: '#5D3EBC',
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <rect x="6.5" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" />
              <rect x="13.9" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" />
            </svg>
          </div>
          <div
            className="bz-survey-eyebrow relative mb-3"
            style={{ color: 'rgba(255,255,255,0.85)' }}
          >
            Buaze
          </div>
          <h1
            className="bz-survey-head relative"
            style={{ margin: 0, fontSize: 28, color: '#fff', maxWidth: 340 }}
          >
            {copy.title}
          </h1>
          <p
            className="relative"
            style={{
              margin: '16px 0 0',
              maxWidth: 330,
              fontSize: 15,
              lineHeight: 1.55,
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            {copy.body}
          </p>
        </div>
      </div>
    </main>
  );
}
