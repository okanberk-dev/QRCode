// The business's customer panel (CLAUDE.md §61): one frame for the join
// page, the card page and the owner's live preview, so what the business
// designs is exactly what the customer sees. Colours come from the theme +
// card colour as CSS variables (--p-*); children use them. No hooks, no fetch.
import { Globe, MapPin, MessageCircle, Phone, UserRound, UtensilsCrossed } from 'lucide-react';
import {
  portalPalette,
  safeExternalUrl,
  telHref,
  type LoyaltyPortal,
} from '@/lib/loyalty-portal';

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
  /** Owner preview: links do nothing, no sticky positioning. */
  preview?: boolean;
  /** Extra block after the offers (rewards, how it works …). */
  info?: React.ReactNode;
  /** Small control on the cover, top left (the sound switch on /l pages). */
  headerStart?: React.ReactNode;
  children: React.ReactNode;
}

export function portalStyle(portal: LoyaltyPortal, accentColor: string | null): React.CSSProperties {
  const p = portalPalette(portal.theme, accentColor);
  return {
    ['--p-bg' as string]: p.bg,
    ['--p-surface' as string]: p.surface,
    ['--p-border' as string]: p.border,
    ['--p-text' as string]: p.text,
    ['--p-muted' as string]: p.muted,
    ['--p-accent' as string]: p.accent,
    ['--p-on-accent' as string]: p.onAccent,
    ['--p-band' as string]: p.band,
    ['--p-on-band' as string]: p.onBand,
    // Customer-content surface: never Clash Display (licence, CLAUDE.md §11).
    ['--font-heading' as string]: "var(--font-space-grotesk), var(--font-inter), system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    fontFamily: "var(--font-inter), system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    background: p.bg,
    color: p.text,
    colorScheme: portal.theme === 'dark' ? 'dark' : 'light',
  };
}

function mapsHref(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export default function LoyaltyPortalFrame({
  locale,
  slug,
  portal,
  business,
  accentColor,
  programName,
  account,
  preview = false,
  info,
  headerStart,
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

  return (
    <div style={portalStyle(portal, accentColor)} className={preview ? 'min-h-full' : 'min-h-dvh'}>
      <div
        className="mx-auto w-full max-w-[480px]"
        style={{ paddingBottom: preview ? '40px' : 'max(40px, calc(env(safe-area-inset-bottom) + 28px))' }}
      >
        {/* Header: cover photo or a living brand band */}
        <header className="relative">
          {portal.coverUrl ? (
            <div className="relative aspect-[16/10] w-full overflow-hidden sm:rounded-b-[28px]">
              <img src={portal.coverUrl} alt="" className="h-full w-full object-cover" decoding="async" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/25" />
            </div>
          ) : (
            <div aria-hidden className="relative h-[168px] w-full overflow-hidden sm:rounded-b-[28px]" style={{ background: 'var(--p-band)' }}>
              <div
                className={`${preview ? '' : 'bzl-aurora'} absolute -left-1/4 -top-1/2 h-[320px] w-[320px] rounded-full opacity-50 blur-3xl`}
                style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.55) 0%, transparent 62%)' }}
              />
              <div
                className="absolute inset-0 opacity-[0.16]"
                style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1.2px)', backgroundSize: '16px 16px', color: 'var(--p-on-band)' }}
              />
              <div className="absolute inset-x-0 bottom-0 h-16" style={{ background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.12))' }} />
            </div>
          )}
          <div
            className="absolute inset-x-3 flex items-center justify-between gap-2"
            style={{ top: preview ? '12px' : 'max(12px, env(safe-area-inset-top))' }}
          >
            <div>{headerStart}</div>
            <a
              href={link(accountHref)}
              className="bzl-tap inline-flex h-11 items-center gap-1.5 rounded-full bg-black/35 px-4 text-[14px] font-medium text-white backdrop-blur-md transition-colors duration-200 hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <UserRound size={15} aria-hidden />
              {account ? account.firstName : c.signIn}
            </a>
          </div>
        </header>

        <div className="px-4">
          <div className="-mt-11 flex items-end gap-3">
            <div
              className="bzl-pop relative flex h-[88px] w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-[24px] text-[34px] font-semibold shadow-[0_12px_28px_-14px_rgba(0,0,0,0.4)] ring-4"
              style={{ background: portal.logoUrl ? '#FFFFFF' : 'var(--p-accent)', color: 'var(--p-on-accent)', ['--tw-ring-color' as string]: 'var(--p-bg)' }}
            >
              {portal.logoUrl ? (
                <img src={portal.logoUrl} alt={business.name} className="h-full w-full object-contain p-1.5" decoding="async" />
              ) : (
                <span aria-hidden>{initial}</span>
              )}
            </div>
          </div>
          <h1 className="mt-3 text-[28px] font-semibold leading-[1.08] tracking-[-0.02em]">{business.name}</h1>
          <p className="mt-0.5 text-[15px] font-medium" style={{ color: 'var(--p-muted)' }}>
            {portal.headline ?? programName}
          </p>
          {portal.welcome && (
            <p className="mt-3 whitespace-pre-line text-[14.5px] leading-relaxed" style={{ color: 'var(--p-text)' }}>
              {portal.welcome}
            </p>
          )}

          <div className="mt-5">{children}</div>

          {portal.offers.length > 0 && (
            <section className="mt-7" aria-labelledby="portal-offers">
              <h2 id="portal-offers" className="text-[16px] font-semibold">
                {c.offers}
              </h2>
              <ul className="-mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
                {portal.offers.map((o) => (
                  <li
                    key={o.id}
                    className="w-[78%] shrink-0 snap-start rounded-[24px] p-5"
                    style={{ background: 'var(--p-surface)' }}
                  >
                    {o.badge && (
                      <span
                        className="mb-2 inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold"
                        style={{ background: 'var(--p-accent)', color: 'var(--p-on-accent)' }}
                      >
                        {o.badge}
                      </span>
                    )}
                    <p className="text-[15px] font-semibold leading-snug">{o.title}</p>
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

          {info && <div className="mt-7">{info}</div>}

          {hasContact && (
            <section className="mt-7" aria-labelledby="portal-contact">
              <h2 id="portal-contact" className="text-[16px] font-semibold">
                {c.contact}
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {menu && (
                  <a
                    href={link(menu)}
                    className="bzl-tap col-span-2 flex min-h-[52px] items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition-[opacity,transform] duration-200 hover:opacity-95 active:scale-[0.98] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--p-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--p-bg)]"
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
                <p className="mt-2 text-[12.5px]" style={{ color: 'var(--p-muted)' }}>
                  {address}
                </p>
              )}
            </section>
          )}

          <footer className="mt-8 space-y-1.5 text-center text-[12.5px]" style={{ color: 'var(--p-muted)' }}>
            <p>{c.noReview}</p>
            <p className="flex flex-wrap justify-center gap-x-3 gap-y-1">
              <a href={link(`/l/${slug}/kosullar${q}`)} className="inline-flex min-h-[40px] items-center underline underline-offset-2">
                {c.terms}
              </a>
              <a href={link(`/l/${slug}/aydinlatma${q}`)} className="inline-flex min-h-[40px] items-center underline underline-offset-2">
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
      className="bzl-tap flex min-h-[48px] items-center justify-center gap-2 rounded-full text-[14px] font-medium transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-[0.98] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--p-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--p-bg)]"
      style={{ background: 'var(--p-surface)', color: 'var(--p-text)' }}
    >
      {icon}
      {label}
    </a>
  );
}
