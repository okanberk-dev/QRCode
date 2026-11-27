'use client';

import { usePathname } from 'next/navigation';
import { ArrowRight, Folder } from 'lucide-react';
import Link from '@/components/navigation/IntentLink';

/**
 * Folder breadcrumb over the page title (docs/design/DASHBOARD_DESIGN.md
 * §5.2, reference "Home Page → Dashboard"): the panel home, an arrow, the
 * current page. The home crumb is a link back to the panel home.
 */
export function PanelBreadcrumb({ current }: { current?: string }) {
  const pathname = usePathname();
  if (!pathname) return null;
  const isAdmin = pathname.startsWith('/admin');
  const home = isAdmin ? '/admin/dashboard' : pathname.replace(/^(\/(?:tr|en)\/dashboard).*$/, '$1');
  const isEn = pathname.startsWith('/en/');
  const homeLabel = isEn ? 'Dashboard' : 'Panel';

  return (
    <nav aria-label={isEn ? 'Breadcrumb' : 'Konum'} className="pn-crumbs">
      <Link href={home} className="pn-crumb">
        <Folder size={17} aria-hidden="true" />
        {homeLabel}
      </Link>
      {current && (
        <>
          <ArrowRight size={17} aria-hidden="true" />
          <span className="pn-crumb" aria-current="page">
            <Folder size={17} aria-hidden="true" />
            {current}
          </span>
        </>
      )}
    </nav>
  );
}

export default PanelBreadcrumb;
