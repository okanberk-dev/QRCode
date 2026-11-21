import type { ReactNode } from 'react';
import { Clock, MapPin, Phone } from 'lucide-react';
import { menuEyebrow, monogramOf } from '../menu-labels';
import type { MenuRenderContext } from './types';

/** One wrapping meta line: address · hours · phone (tel: link, 44 px hit area). */
function MetaLine({ ctx, centered, onBanner }: { ctx: MenuRenderContext; centered: boolean; onBanner: boolean }) {
  const { restaurant, copy } = ctx;
  const items: { key: string; node: ReactNode }[] = [];
  const icon = 'shrink-0 translate-y-[3px]';
  if (restaurant.address) {
    items.push({ key: 'a', node: <><MapPin size={14} strokeWidth={2} aria-hidden className={icon} /><span>{restaurant.address}</span></> });
  }
  if (restaurant.workingHours) {
    items.push({ key: 'h', node: <><Clock size={14} strokeWidth={2} aria-hidden className={icon} /><span>{restaurant.workingHours}</span></> });
  }
  if (restaurant.phone) {
    items.push({
      key: 'p',
      node: (
        <a
          href={`tel:${restaurant.phone.replace(/[^\d+]/g, '')}`}
          aria-label={`${copy.call}: ${restaurant.phone}`}
          className="relative inline-flex gap-1.5 underline decoration-1 underline-offset-[3px] before:absolute before:-inset-x-1 before:-inset-y-3 before:content-[''] hover:decoration-2"
        >
          <Phone size={14} strokeWidth={2} aria-hidden className={icon} />
          <span>{restaurant.phone}</span>
        </a>
      ),
    });
  }
  if (items.length === 0) return null;
  return (
    // The icons already separate the parts; a "·" between them dangled at the
    // end of a wrapped line on phones, so the parts are spaced instead.
    <p className={`flex flex-wrap gap-x-4 gap-y-1 text-[13px] leading-5 ${onBanner ? 'text-(--m-on-banner)' : 'text-(--m-ink-2)'} ${centered ? 'justify-center' : ''}`}>
      {items.map((it) => (
        <span key={it.key} className="inline-flex min-w-0 gap-1.5">{it.node}</span>
      ))}
    </p>
  );
}

function Tagline({ text, className = '' }: { text: string | null; className?: string }) {
  if (!text) return null;
  return <p className={`bzm-tagline ${className}`}>{text}</p>;
}

/**
 * The four header variants (menu-design-final §9.4). Text never sits on a
 * photo; banner text uses `--m-on-banner` at full opacity.
 */
export default function Masthead({ ctx, maxWidth }: { ctx: MenuRenderContext; maxWidth: string }) {
  const { d, restaurant, locale } = ctx;
  const header = d.structure.header;
  const logo = restaurant.menuLogoUrl;
  const letter = monogramOf(restaurant.name, locale);
  const eyebrow = menuEyebrow(restaurant.category);
  const inner = `relative mx-auto w-full ${maxWidth} px-5 @md/menu:px-6`;

  if (header === 'banner') {
    return (
      <header className="bzm-on-banner relative overflow-hidden bg-[linear-gradient(160deg,var(--m-banner),var(--m-banner-end))] text-(--m-on-banner)">
        <div className={`${inner} pt-(--m-masthead-pt) pb-(--m-masthead-pb)`}>
          <div className="flex items-center gap-4 @md/menu:gap-5">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-(--m-r-card) bg-(--m-surface) shadow-[0_10px_24px_-12px_rgb(0_0_0/.45)] @xl/menu:size-20">
              {logo ? (
                <img src={logo} alt={restaurant.name} decoding="async" className="h-full w-full object-cover" />
              ) : (
                <span aria-hidden className="bzm-monogram-tile text-(--m-accent-text)">{letter}</span>
              )}
            </div>
            <div className="min-w-0">
              {eyebrow && <p className="bzm-label">{eyebrow}</p>}
              <h1 className={`bzm-name ${eyebrow ? 'mt-1' : ''}`}>{restaurant.name}</h1>
            </div>
          </div>
          <Tagline text={d.tagline} className="mt-5 max-w-[44ch]" />
          <div className={d.tagline ? 'mt-3' : 'mt-5'}>
            <MetaLine ctx={ctx} centered={false} onBanner />
          </div>
        </div>
      </header>
    );
  }

  if (header === 'compact') {
    return (
      <header className={`${inner} pt-(--m-masthead-pt)`}>
        <div className="border-b border-(--m-rule) pb-(--m-masthead-pb)">
          <div className="flex items-center gap-3.5">
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-(--m-r-card) bg-(--m-accent-fill) text-(--m-on-accent) shadow-[inset_0_0_0_1px_var(--m-accent-edge)]">
              {logo ? (
                <img src={logo} alt={restaurant.name} decoding="async" className="h-full w-full bg-(--m-surface) object-cover" />
              ) : (
                <span aria-hidden className="bzm-monogram-tile bzm-monogram-tile--sm">{letter}</span>
              )}
            </div>
            <div className="min-w-0">
              {eyebrow && <p className="bzm-label">{eyebrow}</p>}
              <h1 className="bzm-name">{restaurant.name}</h1>
            </div>
          </div>
          <Tagline text={d.tagline} className="mt-4 max-w-[48ch]" />
          <div className="mt-3">
            <MetaLine ctx={ctx} centered={false} onBanner={false} />
          </div>
        </div>
      </header>
    );
  }

  // centered + cover
  const cover = header === 'cover' ? restaurant.menuCoverUrl ?? null : null;
  return (
    <header className="relative">
      {d.scheme === 'dark' && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(120%_60%_at_50%_0%,var(--m-glow),transparent_70%)]" />
      )}
      {cover && (
        <div className="relative aspect-[4/3] max-h-[420px] w-full overflow-hidden bg-(--m-surface-2) @xl/menu:aspect-[16/9] @3xl/menu:aspect-[21/9]">
          <img src={cover} alt="" loading="eager" fetchPriority="high" decoding="async" className="h-full w-full object-cover" />
        </div>
      )}
      <div className={`${inner} flex flex-col items-center text-center ${cover ? 'pb-(--m-masthead-pb)' : 'pt-(--m-masthead-pt) pb-(--m-masthead-pb)'}`}>
        {logo ? (
          <div className={`size-[72px] shrink-0 overflow-hidden rounded-full bg-(--m-surface) ${
            cover ? '-mt-9 ring-[3px] ring-(--m-bg) shadow-[0_8px_20px_-10px_rgb(0_0_0/.4)]' : 'ring-1 ring-(--m-rule)'
          }`}>
            <img src={logo} alt={restaurant.name} decoding="async" className="h-full w-full object-cover" />
          </div>
        ) : cover ? <div className="h-8" /> : null}
        {eyebrow && <p className={`bzm-label ${logo ? 'mt-5' : ''}`}>{eyebrow}</p>}
        <h1 className={`bzm-display ${eyebrow ? 'mt-2' : logo ? 'mt-4' : ''}`}>{restaurant.name}</h1>
        <Tagline text={d.tagline} className="mt-3 max-w-[40ch]" />
        <span aria-hidden className="mt-6 block h-0.5 w-10 rounded-full bg-(--m-accent-ui)" />
        <div className="mt-5">
          <MetaLine ctx={ctx} centered onBanner={false} />
        </div>
      </div>
    </header>
  );
}
