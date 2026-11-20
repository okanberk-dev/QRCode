'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { getMenuCopy, type MenuCopy } from '../menu-i18n';

/** The builder copy for the route locale (`/en/...` → English, everything else Turkish). */
export function useMenuCopy(): MenuCopy {
  const params = useParams();
  const locale: 'tr' | 'en' = params?.locale === 'en' ? 'en' : 'tr';
  return useMemo(() => getMenuCopy(locale), [locale]);
}
