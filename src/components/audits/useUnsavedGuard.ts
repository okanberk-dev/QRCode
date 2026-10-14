'use client';

// Denetim Merkezi — kaydedilmemiş değişiklik koruması (builder).
//
// İki yol kapatılır:
//   • sekmeyi kapatma / yenileme / dış bağlantı → tarayıcının `beforeunload` uyarısı
//   • uygulama içi bağlantı (kenar çubuğu, geri bağlantısı, breadcrumb) →
//     Next'in istemci yönlendirmesi `beforeunload` tetiklemez, bu yüzden tıklama
//     yakalama aşamasında durdurulur ve `onBlocked(href)` çağrılır; üst bileşen
//     onay diyaloğunu açıp onaylanırsa kendisi yönlendirir.
//
// `active=false` iken hiçbir dinleyici yoktur (temiz form ya da kaydedip çıkış).
// Ortam tuşlarıyla (Ctrl/Cmd/Shift/Alt, orta tık) açılan yeni sekme bağlantılarına
// ve aynı sayfadaki `#hash` bağlantılarına dokunulmaz.

import { useEffect, useRef } from 'react';

export function useUnsavedGuard({
  active,
  onBlocked,
}: {
  active: boolean;
  /** Engellenen uygulama içi hedef (`/tr/dashboard/...?...#...`). */
  onBlocked: (href: string) => void;
}): void {
  const blockedRef = useRef(onBlocked);
  blockedRef.current = onBlocked;

  useEffect(() => {
    if (!active) return;

    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Eski tarayıcılar için; modern olanlar kendi metnini gösterir.
      e.returnValue = '';
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target instanceof Element ? e.target : null;
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
      // Dış bağlantılar `beforeunload` ile korunur.
      if (url.origin !== window.location.origin) return;
      // Aynı sayfa (yalnız #hash farkı) gezinme sayılmaz.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      e.preventDefault();
      e.stopPropagation();
      blockedRef.current(`${url.pathname}${url.search}${url.hash}`);
    };

    window.addEventListener('beforeunload', beforeUnload);
    // Yakalama aşaması: Next `<Link>`'in kendi onClick'inden ÖNCE çalışır.
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [active]);
}
