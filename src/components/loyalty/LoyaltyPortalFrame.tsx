// The business's customer panel (CLAUDE.md §61): one frame for the join
// page, the card page and the owner's live preview, so what the business
// designs is exactly what the customer sees. Colours come from the theme +
// card colour as CSS variables (--p-*); children use them. No hooks, no fetch.
//
// Phone first: full bleed. On a wide screen (not in the owner preview) the
// page becomes a phone-width sheet on a soft backdrop of the brand colour.
import { Globe, MapPin, MessageCircle, Phone, UserRound, UtensilsCrossed } from 'lucide-react';
import {
  portalPalette,
  safeExternalUrl,
  telHref,
  type LoyaltyPortal,
} from '@/lib/loyalty-portal';
import { GRAIN_IMAGE, INK, alpha, contrast, inkOn, mix } from './portal-colors';
import PortalRings from './PortalRings';

export interface PortalBusiness {
  name: string;
  menuUrl: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  whatsappUrl: string | null;
}

type Locale = 'tr' | 'en';

const COPY = {
  tr: {
    offers: 'Kampanyalar ve haberler',
    contact: 'İletişim',
    menu: 'Menüyü gör',
    call: 'Ara',
    directions: 'Yol tarifi',
    website: 'Web sitesi',
    signIn: 'Giriş yap',
    terms: 'Üyelik koşulları',
    privacy: 'Aydınlatma metni',
    controller: (b: string) => `Program ${b} tarafından yürütülür. Altyapı: Buaze.`,
    noReview: 'Kart yalnız ziyaret ve alışverişle dolar; yorum ya da puan karşılığı damga verilmez.',
  },
  en: {
    offers: 'Offers and news',
    contact: 'Contact',
    menu: 'See the menu',
    call: 'Call',
    directions: 'Directions',
    website: 'Website',
    signIn: 'Sign in',
    terms: 'Membership terms',
    privacy: 'Privacy notice',
    controller: (b: string) => `The programme is run by ${b}. Powered by Buaze.`,
    noReview: 'The card fills with visits and purchases only — never for a review or rating.',
  },
} as const;

export interface LoyaltyPortalFrameProps {
  locale: Locale;
  slug: string;
  portal: LoyaltyPortal;
  business: PortalBusiness;
  accentColor: string | null;
  /** Shown under the business name when the business wrote no headline. */
  programName: string;
  /** Signed-in Buaze customer (first name) or null. */
  account?: { firstName: string } | null;
  /** Join page: the join form already signs in with Google; no second sign-in link. */
  hideSignIn?: boolean;
  /** Owner preview: links do nothing, no sticky positioning, no wide-screen sheet. */
  preview?: boolean;
  /** Extra block after the offers (rewards, how it works …). */
  info?: React.ReactNode;
  /** Small control on the cover, top left (the sound switch on /l pages). */
  headerStart?: React.ReactNode;
  /** Quiet block at the very end, above the footer (card settings on the card page). */
  end?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The --p-* variables of a theme + card colour. Beyond the palette:
 * --p-strong   accent when it reads on the page (≥ 3:1), else the text colour
 *              (thin bars, icons, focus rings: never lime on white, §64)
 * --p-accent-soft  a quiet tint of the accent, for highlighted rows
 * --p-band-2   the band's gradient companion
 * --p-chip-*   controls drawn over the header (cover photo or band)
 * --p-backdrop page background around the sheet on wide screens
 */
export function portalStyle(portal: LoyaltyPortal, accentColor: string | null): React.CSSProperties {
  const p = portalPalette(portal.theme, accentColor);
  const strong = contrast(p.accent, p.surface) >= 3 && contrast(p.accent, p.bg) >= 3 ? p.accent : p.text;
  const dark = portal.theme === 'dark';
  const bandLight = inkOn(p.band) === INK;
  const band2 = bandLight ? mix(p.band, '#000000', 0.1) : mix(p.band, '#FFFFFF', 0.12);
  const chip = portal.coverUrl
    ? { bg: 'rgba(0,0,0,0.42)', fg: '#FFFFFF', hover: 'rgba(0,0,0,0.56)' }
    : bandLight
      ? { bg: 'rgba(255,255,255,0.66)', fg: INK, hover: 'rgba(255,255,255,0.84)' }
      : { bg: 'rgba(0,0,0,0.3)', fg: '#FFFFFF', hover: 'rgba(0,0,0,0.44)' };
  const backdropBase = dark ? '#000000' : mix(p.bg, p.band, 0.1);
  return {
    ['--p-bg' as string]: p.bg,
    ['--p-surface' as string]: p.surface,
    ['--p-border' as string]: p.border,
    ['--p-text' as string]: p.text,
    ['--p-muted' as string]: p.muted,
    ['--p-accent' as string]: p.accent,
    ['--p-on-accent' as string]: p.onAccent,
    ['--p-accent-soft' as string]: mix(p.accent, p.surface, dark ? 0.8 : 0.84),
    ['--p-strong' as string]: strong,
    ['--p-band' as string]: p.band,
    ['--p-band-2' as string]: band2,
    ['--p-on-band' as string]: p.onBand,
    ['--p-chip-bg' as string]: chip.bg,
    ['--p-chip-fg' as string]: chip.fg,
    ['--p-chip-hover' as string]: chip.hover,
    ['--p-backdrop' as string]: `radial-gradient(1100px 560px at 50% -160px, ${alpha(p.band, dark ? 0.32 : 0.5)}, transparent 72%), ${backdropBase}`,
    // Customer-content surface: never Clash Display (licence, CLAUDE.md §11).
    ['--font-heading' as string]: "var(--font-space-grotesk), var(--font-inter), system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    fontFamily: "var(--font-inter), system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    background: p.bg,
    color: p.text,
    colorScheme: dark ? 'dark' : 'light',
  };
}

function mapsHref(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--p-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--p-bg)]';

export default function LoyaltyPortalFrame({
  locale,
  slug,
  portal,
  business,
  accentColor,
  programName,
  account,
  hideSignIn = false,
  preview = false,
  info,
  headerStart,
  end,
  children,
}: LoyaltyPortalFrameProps) {
  const c = COPY[locale];
  const q = locale === 'en' ? '?lang=en' : '';
  const link = (href: string | null) => (preview ? undefined : href ?? undefined);
  const initial = business.name.trim().charAt(0).toLocaleUpperCase(locale === 'tr' ? 'tr-TR' : 'en-GB') || 'B';
  const website = portal.showContact ? safeExternalUrl(business.website) : null;
  const phone = portal.showContact ? telHref(business.phone) : null;
  const address = portal.showContact ? business.address : null;
  const socials = portal.showSocial
    ? [
        { label: 'Instagram', href: safeExternalUrl(business.instagramUrl) },
        { label: 'Facebook', href: safeExternalUrl(business.facebookUrl) },
        { label: 'WhatsApp', href: safeExternalUrl(business.whatsappUrl) },
      ].filter((s): s is { label: string; href: string } => Boolean(s.href))
    : [];
  const menu = portal.showMenu ? business.menuUrl : null;
  const hasContact = Boolean(address || phone || website || menu || socials.length > 0);
  const accountHref = `/hesap${account ? '' : `?next=${encodeURIComponent(`/l/${slug}`)}`}`;
  // The page colour comes from classes here, so wide screens can swap it for the backdrop.
  const vars: React.CSSProperties = { ...portalStyle(portal, accentColor), background: undefined };

  return (
    <div
      style={vars}
      className={
        preview
          ? 'min-h-full bg-[var(--p-bg)]'
          : 'min-h-dvh bg-[var(--p-bg)] sm:px-6 sm:[background:var(--p-backdrop)]'
      }
    >
      <div
        className={
          preview
            ? 'mx-auto w-full max-w-[480px]'
            : 'relative mx-auto w-full max-w-[480px] bg-[var(--p-bg)] sm:my-10 sm:overflow-hidden sm:rounded-[32px] sm:shadow-[0_40px_90px_-40px_rgba(0,0,0,0.45),0_2px_6px_rgba(0,0,0,0.04)] sm:ring-1 sm:ring-[color:var(--p-border)]'
        }
        style={{ paddingBottom: preview ? '40px' : 'max(40px, calc(env(safe-area-inset-bottom) + 28px))' }}
      >
        {/* Header: cover photo or the brand band (gradient, grain, stamp rings). */}
        <header className="relative">
          {portal.coverUrl ? (
            <div className="relative aspect-[16/10] w-full overflow-hidden">
              <img src={portal.coverUrl} alt="" className="h-full w-full object-cover" decoding="async" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-black/30" />
            </div>
          ) : (
            <div
              aria-hidden
              className="relative isolate h-[176px] w-full overflow-hidden"
              style={{ background: 'linear-gradient(155deg, var(--p-band) 0%, var(--p-band) 38%, var(--p-band-2) 100%)', color: 'var(--p-on-band)' }}
            >
              <div
                className={`${preview ? '' : 'bzl-aurora'} absolute -left-1/4 -top-1/2 -z-10 h-[340px] w-[340px] rounded-full opacity-45 blur-3xl`}
                style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, transparent 62%)' }}
              />
              <div className="absolute inset-0 -z-10" style={{ backgroundImage: GRAIN_IMAGE, opacity: 0.12, mixBlendMode: 'soft-light' }} />
              <PortalRings className="absolute -right-16 -top-24 h-[260px] w-[260px]" style={{ opacity: 0.16 }} />
              <PortalRings className="absolute -bottom-28 -left-20 h-[200px] w-[200px]" style={{ opacity: 0.09 }} />
            </div>
          )}
          <div
            className="absolute inset-x-3 flex items-center justify-between gap-2"
            style={{ top: preview ? '12px' : 'max(12px, env(safe-area-inset-top))' }}
          >
            <div>{headerStart}</div>
            {(account || !hideSignIn) && (
              <a
                href={link(accountHref)}
                className="bzl-tap inline-flex h-11 items-center gap-1.5 rounded-full bg-[var(--p-chip-bg)] px-4 text-[14px] font-medium text-[color:var(--p-chip-fg)] backdrop-blur-md transition-colors duration-200 hover:bg-[var(--p-chip-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--p-chip-fg)]"
              >
                <UserRound size={15} aria-hidden />
                {account ? account.firstName : c.signIn}
              </a>
            )}
          </div>
        </header>

        <div className="px-4">
          {/* Identity: logo tile on the band edge, name, headline. */}
          <div className="flex flex-col items-center text-center">
            <div
              className="bzl-pop relative -mt-[46px] flex h-[92px] w-[92px] items-center justify-center overflow-hidden rounded-[28px] text-[38px] font-medium shadow-[0_14px_30px_-14px_rgba(0,0,0,0.45)] ring-[5px]"
              style={{
                background: portal.logoUrl ? '#FFFFFF' : 'var(--p-accent)',
                color: 'var(--p-on-accent)',
                fontFamily: 'var(--font-heading)',
                ['--tw-ring-color' as string]: 'var(--p-bg)',
              }}
            >
              {portal.logoUrl ? (
                <img src={portal.logoUrl} alt={business.name} className="h-full w-full object-contain p-2" decoding="async" />
              ) : (
                <span aria-hidden>{initial}</span>
              )}
            </div>
            <h1 className="mt-3.5 max-w-full text-[30px] font-medium leading-[1.05] tracking-[-0.03em] [overflow-wrap:anywhere]">
              {business.name}
            </h1>
            <p className="mt-1.5 max-w-[34ch] text-[15px] leading-snug" style={{ color: 'var(--p-muted)' }}>
              {portal.headline ?? programName}
            </p>
            {portal.welcome && (
              <p className="mt-3 max-w-[38ch] whitespace-pre-line text-[14.5px] leading-relaxed" style={{ color: 'var(--p-text)' }}>
                {portal.welcome}
              </p>
            )}
          </div>

          <div className="mt-6">{children}</div>

          {portal.offers.length > 0 && (
            <section className="mt-8" aria-labelledby="portal-offers">
              <h2 id="portal-offers" className="px-1 text-[17px] font-medium tracking-[-0.01em]">
                {c.offers}
              </h2>
              <ul className="-mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
                {portal.offers.map((o) => (
                  <li
                    key={o.id}
                    className={`relative ${portal.offers.length === 1 ? 'w-full' : 'w-[80%]'} shrink-0 snap-start overflow-hidden rounded-[24px] p-5`}
                    style={{ background: 'var(--p-surface)' }}
                  >
                    <span aria-hidden className="absolute inset-y-5 left-0 w-1 rounded-r-full" style={{ background: 'var(--p-strong)' }} />
                    {o.badge && (
                      <span
                        className="mb-2 inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold"
                        style={{ background: 'var(--p-accent)', color: 'var(--p-on-accent)' }}
                      >
                        {o.badge}
                      </span>
                    )}
                    <p className="text-[15.5px] font-semibold leading-snug">{o.title}</p>
                    {o.body && (
                      <p className="mt-1 whitespace-pre-line text-[13.5px] leading-relaxed" style={{ color: 'var(--p-muted)' }}>
                        {o.body}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {info && <div className="mt-8">{info}</div>}

          {hasContact && (
            <section className="mt-8" aria-labelledby="portal-contact">
              <h2 id="portal-contact" className="px-1 text-[17px] font-medium tracking-[-0.01em]">
                {c.contact}
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {menu && (
                  <a
                    href={link(menu)}
                    className={`bzl-tap col-span-2 flex min-h-[54px] items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition-[opacity,transform] duration-200 hover:opacity-95 active:scale-[0.98] motion-reduce:transition-none ${FOCUS}`}
                    style={{ background: 'var(--p-accent)', color: 'var(--p-on-accent)' }}
                  >
                    <UtensilsCrossed size={17} aria-hidden /> {c.menu}
                  </a>
                )}
                {phone && <ContactButton href={link(phone)} icon={<Phone size={16} aria-hidden />} label={c.call} />}
                {address && (
                  <ContactButton href={link(mapsHref(address))} icon={<MapPin size={16} aria-hidden />} label={c.directions} external />
                )}
                {website && <ContactButton href={link(website)} icon={<Globe size={16} aria-hidden />} label={c.website} external />}
                {socials.map((s) => (
                  <ContactButton key={s.label} href={link(s.href)} icon={<MessageCircle size={16} aria-hidden />} label={s.label} external />
                ))}
              </div>
              {address && (
                <p className="mt-2.5 text-center text-[12.5px]" style={{ color: 'var(--p-muted)' }}>
                  {address}
                </p>
              )}
            </section>
          )}

          {end && <div className="mt-8">{end}</div>}

          <footer className="mt-10 space-y-1.5 border-t pt-6 text-center text-[12.5px]" style={{ color: 'var(--p-muted)', borderColor: 'var(--p-border)' }}>
            <p className="mx-auto max-w-[40ch] leading-relaxed">{c.noReview}</p>
            <p className="flex flex-wrap justify-center gap-x-4 gap-y-0">
              <a href={link(`/l/${slug}/kosullar${q}`)} className="inline-flex min-h-[44px] items-center underline decoration-[color:var(--p-border)] underline-offset-4 transition-colors hover:text-[color:var(--p-text)]">
                {c.terms}
              </a>
              <a href={link(`/l/${slug}/aydinlatma${q}`)} className="inline-flex min-h-[44px] items-center underline decoration-[color:var(--p-border)] underline-offset-4 transition-colors hover:text-[color:var(--p-text)]">
                {c.privacy}
              </a>
            </p>
            <p className="opacity-80">{c.controller(business.name)}</p>
          </footer>
        </div>
      </div>
    </div>
  );
}

function ContactButton({ href, icon, label, external }: { href?: string; icon: React.ReactNode; label: string; external?: boolean }) {
  return (
    <a
      href={href}
      target={external && href ? '_blank' : undefined}
      rel={external && href ? 'noopener noreferrer' : undefined}
      className={`bzl-tap flex min-h-[50px] items-center justify-center gap-2 rounded-full text-[14px] font-medium transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-[0.98] motion-reduce:transition-none ${FOCUS}`}
      style={{ background: 'var(--p-surface)', color: 'var(--p-text)' }}
    >
      <span style={{ color: 'var(--p-strong)' }} className="flex">
        {icon}
      </span>
      {label}
    </a>
  );
}
