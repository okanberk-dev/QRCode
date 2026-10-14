'use client';

// Surveys editor — leave-page protection.
//
// While the form has unsaved changes:
//   - closing / reloading the tab raises the browser's own prompt
//     (`beforeunload`); the browser cannot be given our text;
//   - a click on any in-app link (sidebar, topbar, "← Anketler") is stopped in
//     the CAPTURE phase — before Next's <Link> handler runs, because client-side
//     navigation never fires `beforeunload` — and a confirm dialog asks first.
//     Confirming continues with `router.push`.
// The Cancel / Discard buttons use `requestLeave(href)`, which asks the same way.
// Browser Back / Forward are only covered by `beforeunload` (accepted).
//
// Text is explicit TR / EN here: `Modal.closeGuard`'s default copy is Turkish
// only, so this hook uses `useConfirmDialog` instead.

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirmDialog } from '@/components/ui';

type GuardLocale = 'tr' | 'en';

export interface UnsavedGuard {
  /** Render this once in the component tree. */
  dialog: React.ReactNode;
  /** Go to `href`, asking first when there are unsaved changes. */
  requestLeave: (href: string) => void;
  /** Switch the guard off (just before a deliberate hard reload). */
  releaseGuard: () => void;
}

export function useUnsavedGuard(dirty: boolean, locale: GuardLocale): UnsavedGuard {
  const router = useRouter();
  const [dialog, askConfirm] = useConfirmDialog();
  const bypassRef = useRef(false);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  const isTr = locale === 'tr';

  const ask = useCallback(
    (href: string) => {
      askConfirm({
        title: isTr ? 'Kaydedilmemiş değişikliklerin var. Çıkılsın mı?' : 'You have unsaved changes. Leave?',
        body: isTr
          ? 'Kaydetmediğin değişiklikler kaybolacak.'
          : "Changes you haven't saved will be lost.",
        variant: 'danger',
        confirmLabel: isTr ? 'Çık' : 'Leave',
        cancelLabel: isTr ? 'Kal' : 'Stay',
        onConfirm: () => {
          bypassRef.current = true;
          router.push(href);
        },
      });
    },
    [askConfirm, isTr, router],
  );

  const askRef = useRef(ask);
  askRef.current = ask;

  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (bypassRef.current) return;
      event.preventDefault();
      // Older browsers need a return value; modern ones show their own text.
      event.returnValue = '';
    };

    const onClick = (event: MouseEvent) => {
      if (bypassRef.current || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>('a[href]') ?? null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      // Other origins leave through `beforeunload`.
      if (url.origin !== window.location.origin) return;
      // Same page (only the #hash differs) is not leaving.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      event.preventDefault();
      event.stopPropagation();
      askRef.current(`${url.pathname}${url.search}${url.hash}`);
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    // Capture phase: runs before React / Next handle the same click.
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty]);

  const requestLeave = useCallback(
    (href: string) => {
      if (!dirtyRef.current || bypassRef.current) {
        router.push(href);
        return;
      }
      askRef.current(href);
    },
    [router],
  );

  const releaseGuard = useCallback(() => {
    bypassRef.current = true;
  }, []);

  return { dialog, requestLeave, releaseGuard };
}
