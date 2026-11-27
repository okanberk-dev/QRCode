'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

// CLAUDE.md §38.93 (Stage A1) — owner panel'inde admin actor (source='admin')
// için "Admin paneline dön" sticky link. Account/dashboard surface'lerinde
// mount edilir; user-source actor'lar için render etmez (transparent).
//
// Manager scope (restaurantId set) → /admin/restaurants/[managerScope] yolu;
// superadmin (no scope) → /admin/dashboard. Aksi halde gizli.
//
// Future Stage A4 impersonation flow için hazır altyapı: backend endpoint
// `/api/account/actor-context` actor source'unu döndürür, owner UI küçük
// banner ile admin user'a "geri dön" yolu sağlar.

interface ActorContext {
  source: 'admin' | 'user';
  role: string;
  restaurantId: string | null;
}

interface Props {
  /** Optional className for layout positioning (sticky placement etc.). */
  className?: string;
}

export default function AdminBackLink({ className = '' }: Props) {
  const [actor, setActor] = useState<ActorContext | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/account/actor-context')
      .then(async (res) => {
        if (!res.ok) {
          // 401/403 — owner-source veya unauth; transparent render.
          if (!cancelled) setLoaded(true);
          return null;
        }
        return res.json();
      })
      .then((payload: ActorContext | null) => {
        if (!cancelled && payload) setActor(payload);
        if (!cancelled) setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Hide for owner-source actors or until loaded (no flicker).
  if (!loaded || !actor || actor.source !== 'admin') {
    return null;
  }

  // Routing: manager (scoped) → /admin/restaurants/[id]; superadmin → /admin/dashboard
  const href =
    actor.role === 'manager' && actor.restaurantId
      ? `/admin/restaurants/${actor.restaurantId}`
      : '/admin/dashboard';

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full border border-pn-ink bg-white px-3 py-1.5 text-[13px] font-medium text-pn-ink hover:bg-pn-canvas transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2 ${className}`}
      title="Admin oturumundasın — admin paneline geri dön"
    >
      <ShieldCheck size={11} strokeWidth={2.5} />
      Admin paneline dön
      <ArrowLeft size={11} strokeWidth={2.5} className="rotate-180" />
    </Link>
  );
}
