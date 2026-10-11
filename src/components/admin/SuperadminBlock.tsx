'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { useAdminTranslation } from './AdminTranslationProvider';
import {
  SkCard,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

type State = 'loading' | 'allowed' | 'blocked';

function stateForRole(role: string | null): State {
  return role === 'superadmin' ? 'blocked' : 'allowed';
}

/**
 * Client-side gate for admin pages whose UI only makes sense for a
 * workspace (restaurant_owner / manager). When a superadmin lands on
 * such a page via direct URL, we render a neutral "not applicable"
 * card instead of surfacing confusing owner-scoped content
 * (Trial / Upgrade / Your plan / Invite your team, etc.).
 *
 * The sidebar already hides these entries for superadmin — this is the
 * second line of defence for bookmarks and deep links.
 *
 * Pass `initialRole` from a server component (admin cookie JWT) to decide
 * on the first render with no /api/admin/me round-trip. Without it the
 * gate fetches the role and shows a skeleton (never a blank page) meanwhile.
 */
export default function SuperadminBlock({
  children,
  initialRole,
  fallback,
}: {
  children: ReactNode;
  /** Role resolved server-side; `undefined` = resolve on the client. */
  initialRole?: string | null;
  /** Skeleton shown while the role resolves (defaults to a generic page skeleton). */
  fallback?: ReactNode;
}) {
  const { locale } = useAdminTranslation();
  const isTr = locale === 'tr';
  const [state, setState] = useState<State>(() =>
    initialRole === undefined ? 'loading' : stateForRole(initialRole),
  );

  useEffect(() => {
    if (initialRole !== undefined) return;
    let cancelled = false;
    fetch('/api/admin/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        setState(stateForRole(typeof d?.role === 'string' ? d.role : null));
      })
      .catch(() => {
        if (!cancelled) setState('allowed');
      });
    return () => {
      cancelled = true;
    };
  }, [initialRole]);

  if (state === 'loading') {
    return (
      <>
        {fallback ?? (
          <SkPageShell max={1440} space={4}>
            <SkPageHeader withActions titleWidth="w-48" />
            <SkCard titleWidth="w-40" lines={4} />
          </SkPageShell>
        )}
      </>
    );
  }

  if (state === 'blocked') {
    return (
      // Canonical narrow error-state wrapper (§42.3) — keeps a side gutter
      // on mobile instead of the card touching both screen edges.
      <div className="mx-auto flex w-full max-w-[640px] items-center justify-center px-4 py-12 sm:px-7 lg:min-h-[60vh] lg:py-16">
        <div className="w-full rounded-2xl border border-[#EDEDED] bg-white p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF9B8] text-[#0A0A0A]">
            <ShieldCheck size={20} strokeWidth={2} />
          </div>
          {/* CLAUDE.md §38.164 (Stage 84): inline fontFamily redundancy kaldırıldı —
              h2 globals.css :where(h1..h6) auto-applies. */}
          <h2 className="mt-4 text-[20px] font-medium text-[#0A0A0A]">
            {isTr ? 'Yönetici için değil' : 'Not for admin'}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[#525252]">
            {isTr
              ? 'Bu sayfa işletme hesapları için çalışma-alanı özelliğidir. Superadmin için ilgili ayarlar Site Ayarları, İşletmeler ve Yöneticiler sayfalarında.'
              : 'This page is a workspace feature for business accounts. Superadmin controls live under Site Settings, Businesses and Admins.'}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
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
