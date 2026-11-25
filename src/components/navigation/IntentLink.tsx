'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { forwardRef, useCallback, useRef, type ComponentProps } from 'react';

type IntentLinkProps = ComponentProps<typeof Link>;

/**
 * Panel navigation link (CLAUDE.md §56). Next.js prefetches every visible
 * `<Link>` as soon as the page hydrates; in the panel shell that is ~13 server
 * renders of the dashboard layout at the exact moment the page loads its own
 * data, all on one Node process. Measured live: the page's API calls went from
 * ~10 ms to 80–160 ms while the prefetches ran.
 *
 * This link prefetches on intent instead — pointer over it, keyboard focus or
 * the start of a touch — which is still well ahead of the click. The shell
 * also prefetches the main sections once the page is idle
 * (`useIdlePrefetch`). An explicit `prefetch` prop is respected.
 */
const IntentLink = forwardRef<HTMLAnchorElement, IntentLinkProps>(function IntentLink(
  { prefetch, onMouseEnter, onFocus, onTouchStart, href, ...rest },
  ref,
) {
  const router = useRouter();
  const done = useRef(false);
  const target = typeof href === 'string' ? href : null;
  const warm = useCallback(() => {
    if (done.current || !target || prefetch === false) return;
    done.current = true;
    router.prefetch(target);
  }, [prefetch, router, target]);

  return (
    <Link
      ref={ref}
      href={href}
      prefetch={prefetch === true ? true : false}
      onMouseEnter={(e) => {
        warm();
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        warm();
        onFocus?.(e);
      }}
      onTouchStart={(e) => {
        warm();
        onTouchStart?.(e);
      }}
      {...rest}
    />
  );
});

export default IntentLink;
