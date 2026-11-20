'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { monogramOf, type MenuLocale } from '../menu-labels';

/**
 * Fixed-size media box. A monogram (accent-soft tile, display face) is always
 * painted underneath, so a missing, slow or broken photo never changes the
 * layout: the photo simply covers it once loaded, and is removed on error.
 * `className` sets the box size / aspect ratio and radius.
 */
export default function ItemMedia({
  src, name, locale, alt = '', eager = false, highPriority = false, soldOut = false, className = '', children,
}: {
  src: string | null;
  name: string;
  locale: MenuLocale;
  /** Cards repeat the name next to the photo, so it is decorative there; the sheet passes the name. */
  alt?: string;
  eager?: boolean;
  highPriority?: boolean;
  soldOut?: boolean;
  className?: string;
  /** Overlay content (price chip), drawn above the photo. */
  children?: ReactNode;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  useEffect(() => {
    // An image that failed before hydration never fires onError again.
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setBroken(true);
  }, [src]);

  const showImg = Boolean(src) && !broken;

  return (
    <div
      data-sold-out={soldOut || undefined}
      className={`bzm-media @container relative isolate shrink-0 overflow-hidden bg-(--m-accent-soft) ${className}`}
    >
      <span
        aria-hidden
        className="bzm-monogram absolute inset-0 flex items-center justify-center text-(--m-accent-mark)"
      >
        {monogramOf(name, locale)}
      </span>
      {showImg && (
        <img
          ref={imgRef}
          src={src ?? undefined}
          alt={alt}
          decoding="async"
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={highPriority ? 'high' : undefined}
          onError={() => setBroken(true)}
          className="bzm-media-img absolute inset-0 h-full w-full object-cover"
        />
      )}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-black/[.06] ring-inset group-data-[scheme=dark]/menu:ring-white/[.08]"
      />
      {children}
    </div>
  );
}
