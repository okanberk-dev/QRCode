'use client';

import { useEffect, useState } from 'react';

/**
 * Which category section the owner is reading (chips, preview follow, "N"
 * adds there). The topmost section crossing a line just under the sticky bars.
 */
export function useScrollSpy(sectionIds: string[], topOffset: number): string | null {
  const [active, setActive] = useState<string | null>(sectionIds[0] ?? null);
  const key = sectionIds.join('|');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const ids = key ? key.split('|') : [];
    const visible = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.sectionId;
          if (!id) continue;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        const first = ids.find((id) => visible.has(id));
        if (first) setActive(first);
      },
      { rootMargin: `-${topOffset + 8}px 0px -55% 0px` },
    );
    for (const id of ids) {
      const el = document.querySelector(`[data-section-id="${CSS.escape(id)}"]`);
      if (el) io.observe(el);
    }
    setActive((cur) => (cur && ids.includes(cur) ? cur : (ids[0] ?? null)));
    return () => io.disconnect();
  }, [key, topOffset]);

  return active;
}
