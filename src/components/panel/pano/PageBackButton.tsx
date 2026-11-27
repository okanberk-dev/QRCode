'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

/**
 * Round back button left of the page title (docs/design/DASHBOARD_DESIGN.md
 * §5.2). Hidden on the panel home pages; goes back in history when the
 * previous page is inside the panel, otherwise to the panel home.
 */
const ROOTS = /^\/(tr|en)\/dashboard\/?$|^\/admin\/dashboard\/?$|^\/admin\/?$/;

export function PageBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  if (!pathname || ROOTS.test(pathname)) return null;
  const home = pathname.startsWith('/admin') ? '/admin/dashboard' : pathname.replace(/^(\/(?:tr|en)\/dashboard).*$/, '$1');
  const isTr = !pathname.startsWith('/en/');

  const goBack = () => {
    let sameOrigin = false;
    try {
      sameOrigin = !!document.referrer && new URL(document.referrer).origin === window.location.origin;
    } catch {
      sameOrigin = false;
    }
    if (window.history.length > 1 && (sameOrigin || !document.referrer)) router.back();
    else router.push(home);
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className="pn-icon-btn pn-back-btn hidden sm:inline-flex"
      aria-label={isTr ? 'Geri' : 'Back'}
      title={isTr ? 'Geri' : 'Back'}
    >
      <ArrowLeft size={19} aria-hidden="true" />
    </button>
  );
}

export default PageBackButton;
