'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { useAdminTranslation } from './AdminTranslationProvider';

type State = 'loading' | 'allowed' | 'blocked';

/**
 * Client-side gate for admin pages whose UI only makes sense for a
 * workspace (restaurant_owner / manager). When a superadmin lands on
 * such a page via direct URL, we render a neutral "not applicable"
 * card instead of surfacing confusing owner-scoped content
 * (Trial / Upgrade / Your plan / Invite your team, etc.).
 *
 * The sidebar already hides these entries for superadmin — this is the
 * second line of defence for bookmarks and deep links.
 */
export default function SuperadminBlock({ children }: { children: React.ReactNode }) {
  const { locale } = useAdminTranslation();
  const isTr = locale === 'tr';
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        setState(d?.role === 'superadmin' ? 'blocked' : 'allowed');
      })
      .catch(() => {
        if (!cancelled) setState('allowed');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'loading') {
    return <div className="h-40" aria-hidden />;
  }

  if (state === 'blocked') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-[#EDEDED] bg-white p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF9B8] text-[#0A0A0A]">
            <ShieldCheck size={20} strokeWidth={2} />
          </div>
          <h2
            className="mt-4 text-[20px] font-medium text-[#0A0A0A]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {isTr ? 'Yönetici için değil' : 'Not for admin'}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[#525252]">
            {isTr
              ? 'Bu sayfa işletme hesapları için çalışma-alanı özelliğidir. Superadmin için ilgili ayarlar Site Ayarları, İşletmeler ve Yöneticiler sayfalarında.'
              : 'This page is a workspace feature for business accounts. Superadmin controls live under Site Settings, Businesses and Admins.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#C6F24E] px-4 py-2 text-[12px] font-semibold text-[#0A0A0A] hover:bg-[#A8D62E]"
            >
              {isTr ? 'Panele dön' : 'Back to dashboard'}
            </Link>
            <Link
              href="/admin/site-settings"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#EDEDED] bg-white px-4 py-2 text-[12px] font-medium text-[#525252] hover:border-[#0A0A0A]"
            >
              {isTr ? 'Site Ayarları' : 'Site Settings'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
