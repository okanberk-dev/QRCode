import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';

// Stage 83 §38.163 — lightweight auth probe for marketing surface.
//
// Marketing layout/navbar/footer used to read `cookies()` server-side which
// pinned the entire `[locale]/*` tree to dynamic rendering (CLAUDE.md §38.159
// + §38.103). This endpoint shifts auth detection to a client-side probe so
// the marketing surface can ship as ISR (`revalidate=N`) and hit Vercel CDN
// edge cache for anonymous traffic (≥90% of cold marketing visits).
//
// Contract:
//   - Returns 200 always (NEVER 401) — fail-soft for anonymous users so
//     marketing components don't surface noisy console errors.
//   - `isLoggedIn: false` when neither user_token nor admin_token verifies.
//   - `source: 'user' | 'admin' | null` — UI components decide which CTA
//     to show (e.g. mobile bottom nav center FAB: Panel vs Try-Free).
//   - Cache-Control: `private, max-age=30` — within-tab dedupe window;
//     post-logout reflects within 30s on the next page load.
//
// Security: PII-free (no email, no name); only the auth state. The cookie
// itself is the source of truth — this endpoint is just the client-side
// readout. force-dynamic intentional: per-cookie response, not cacheable
// at the CDN edge.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userToken = req.cookies.get('user_token')?.value;
  const adminToken = req.cookies.get('admin_token')?.value;

  let source: 'user' | 'admin' | null = null;

  if (userToken) {
    const payload = await verifyJwt(userToken);
    if (payload && typeof payload.userId === 'string') {
      source = 'user';
    }
  }

  if (!source && adminToken) {
    const payload = await verifyJwt(adminToken);
    if (payload && typeof payload.role === 'string') {
      source = 'admin';
    }
  }

  return NextResponse.json(
    {
      isLoggedIn: source !== null,
      source,
    },
    {
      headers: {
        // Per-cookie response cannot be shared across users → `private`.
        // 30s within-tab dedupe + post-logout reflection window.
        'Cache-Control': 'private, max-age=30',
      },
    },
  );
}
