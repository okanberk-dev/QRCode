'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Globe2, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui';

const AdminBiSection = dynamic(() => import('@/components/admin/AdminBiSection'), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full rounded-[24px]" />,
});

interface GoogleIntegrationRestaurant {
  restaurantId: string;
  restaurantName: string;
  ownerEmail: string | null;
  selectedLocation: {
    title: string;
  } | null;
}

interface GoogleIntegrationRow {
  integrationId: string;
  integrationOwner: string;
  ownerEmail: string | null;
  hasRefreshToken: boolean;
  accessTokenExpired: boolean;
  syncedAt: string | null;
  restaurants: GoogleIntegrationRestaurant[];
}

interface GoogleIntegrationsResp {
  integrations: GoogleIntegrationRow[];
  meta: { total: number; withRefreshToken: number; expiredAccess: number };
}

export default function AdminAnalyticsExtras({ isTr }: { isTr: boolean }) {
  const [googleData, setGoogleData] = useState<GoogleIntegrationsResp | null>(null);
  const [googleLoading, setGoogleLoading] = useState(true);
  const [googleError, setGoogleError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setGoogleLoading(true);
      setGoogleError(null);
      try {
        const res = await fetch('/api/admin/google-integrations');
        if (cancelled) return;
        if (res.status === 403) {
          setGoogleData(null);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setGoogleData((await res.json()) as GoogleIntegrationsResp);
      } catch (err) {
        if (!cancelled) setGoogleError(err instanceof Error ? err.message : 'unknown');
      } finally {
        if (!cancelled) setGoogleLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {googleData && googleData.integrations.length > 0 && (
        <section className="min-w-0 rounded-[20px] border border-pn-line bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pn-accent-soft text-pn-ink">
                <Globe2 size={14} />
              </span>
              <div>
                <h2 className="text-[13px] font-medium text-[#737373]">
                  {isTr ? 'GOOGLE BUSINESS BAĞLANTILARI' : 'GOOGLE BUSINESS CONNECTIONS'}
                </h2>
                <p className="text-[12px] text-[#525252]">
                  {isTr
                    ? `${googleData.meta.total} bağlantı · ${googleData.meta.withRefreshToken} aktif refresh token · ${googleData.meta.expiredAccess} access token süresi dolmuş`
                    : `${googleData.meta.total} connections · ${googleData.meta.withRefreshToken} active refresh tokens · ${googleData.meta.expiredAccess} expired access tokens`}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-pn-accent px-2 py-1 text-[12px] font-medium text-white">
              {isTr ? 'SADECE SÜPERADMIN' : 'SUPERADMIN ONLY'}
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[12px]">
              <thead>
                <tr className="border-b border-pn-line text-[12px] text-[#737373]">
                  <th className="py-2 pr-3 font-medium">{isTr ? 'Bağlantı sahibi' : 'Connected by'}</th>
                  <th className="py-2 pr-3 font-medium">{isTr ? 'Token durumu' : 'Token status'}</th>
                  <th className="py-2 pr-3 font-medium">{isTr ? 'Restoran' : 'Restaurant'}</th>
                  <th className="py-2 pr-3 font-medium">{isTr ? 'Seçili konum' : 'Selected location'}</th>
                  <th className="py-2 pr-3 font-medium">{isTr ? 'Son sync' : 'Last sync'}</th>
                </tr>
              </thead>
              <tbody>
                {googleData.integrations.flatMap((row) => {
                  const tokenLabel = !row.hasRefreshToken
                    ? isTr ? 'Reauth gerek' : 'Reauth required'
                    : row.accessTokenExpired
                      ? isTr ? 'Yenileme bekliyor' : 'Pending refresh'
                      : isTr ? 'Aktif' : 'Active';
                  const tokenTone = !row.hasRefreshToken
                    ? 'bg-[#FEE2E2] text-[#991B1B]'
                    : row.accessTokenExpired
                      ? 'bg-[#FEF3C7] text-[#92400E]'
                      : 'bg-[#DCFCE7] text-[#166534]';
                  const tokenIcon = !row.hasRefreshToken
                    ? <AlertTriangle size={11} />
                    : row.accessTokenExpired
                      ? <Loader2 size={11} />
                      : <CheckCircle2 size={11} />;
                  const restaurants = row.restaurants.length > 0
                    ? row.restaurants
                    : [{ restaurantId: `${row.integrationId}-empty`, restaurantName: '—', ownerEmail: null, selectedLocation: null }];
                  return restaurants.map((restaurant, index) => (
                    <tr key={`${row.integrationId}-${restaurant.restaurantId}`} className="border-b border-pn-line">
                      {index === 0 ? (
                        <>
                          <td className="py-3 pr-3" rowSpan={restaurants.length}>
                            <div className="flex flex-col">
                              <span className="font-medium text-pn-ink">{row.ownerEmail ?? row.integrationOwner}</span>
                              {row.ownerEmail ? <span className="text-[12px] text-[#737373]">{row.integrationOwner}</span> : null}
                            </div>
                          </td>
                          <td className="py-3 pr-3" rowSpan={restaurants.length}>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium ${tokenTone}`}>
                              {tokenIcon}
                              {tokenLabel}
                            </span>
                          </td>
                        </>
                      ) : null}
                      <td className="py-3 pr-3 font-medium text-pn-ink">{restaurant.restaurantName}</td>
                      <td className="py-3 pr-3 text-[#525252]">{restaurant.selectedLocation?.title ?? '—'}</td>
                      <td className="py-3 pr-3 text-[#737373] tabular-nums">
                        {row.syncedAt
                          ? new Date(row.syncedAt).toLocaleString(isTr ? 'tr-TR' : 'en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : isTr ? 'Hiç' : 'Never'}
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {googleLoading && !googleData && (
        <section className="flex items-center gap-2 rounded-[20px] border border-pn-line bg-white p-5 text-[12px] text-[#737373]">
          <Loader2 size={14} className="animate-spin" />
          {isTr ? 'Google Business bağlantıları yükleniyor…' : 'Loading Google Business connections…'}
        </section>
      )}

      {googleError && (
        <section className="rounded-[20px] border border-[#FECACA] bg-[#FEF2F2] p-4 text-[12px] text-[#991B1B]">
          {isTr
            ? `Google Business bağlantıları alınamadı (${googleError})`
            : `Could not load Google Business connections (${googleError})`}
        </section>
      )}

      <AdminBiSection />
    </>
  );
}
