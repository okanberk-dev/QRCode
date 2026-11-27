'use client';

import { useCallback, useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  Loader2,
  Shield,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  AlertBanner,
  Badge,
  PageHeader,
  useConfirmDialog,
} from '@/components/ui';
import {
  RESOURCES,
  ACTIONS,
  PERMISSION_PRESETS,
  type AdminAction,
  type AdminResource,
} from '@/lib/rbac-constants';
import { formatFullDateTimeInTimeZone } from '@/lib/timezone';

// Stage A2 §38.94 — admin permission matrix UI.
// 11 resources × 3 actions = 33 cell grid + preset bundles + audit-aware
// grant/revoke buttons. Superadmin-only (server gate enforces, page also
// blocks superadmin target — helper bypasses anyway).

interface PermissionRow {
  id: string;
  resource: string;
  action: string;
  grantedById: string;
  grantedAt: string;
  expiresAt: string | null;
}

interface PermissionsPayload {
  target: { id: string; username: string; role: string };
  permissions: PermissionRow[];
}

const RESOURCE_LABELS: Record<AdminResource, string> = {
  reviews: 'Yorumlar',
  members: 'İşletmeler',
  users: 'Yöneticiler',
  customers: 'Müşteriler',
  plans: 'Planlar',
  site_settings: 'Site ayarları',
  mail_templates: 'Mail şablonları',
  announcements: 'Duyurular',
  blog: 'Blog',
  analytics: 'Analitik',
  audit_logs: 'Audit log',
  impersonation: 'Owner gibi gör',
};

const ACTION_LABELS: Record<AdminAction, string> = {
  read: 'Oku',
  write: 'Yaz',
  delete: 'Sil',
};

function permissionKey(r: string, a: string): string {
  return `${r}:${a}`;
}

export default function UserPermissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [data, setData] = useState<PermissionsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmDialog, askConfirm] = useConfirmDialog();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}/permissions`);
      if (!res.ok) {
        if (res.status === 404) setError('Yönetici bulunamadı.');
        else if (res.status === 403) setError('Yetkisiz erişim.');
        else setError('Yetki listesi yüklenemedi.');
        return;
      }
      const j = await res.json();
      setData(j);
      setError(null);
    } catch {
      setError('Bağlantı hatası.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build a Set of granted permission keys for fast lookup in the matrix.
  const grantedKeys = new Set(
    (data?.permissions ?? []).map((p) => permissionKey(p.resource, p.action)),
  );
  const grantedById = (resource: string, action: string): string | null => {
    const row = data?.permissions.find(
      (p) => p.resource === resource && p.action === action,
    );
    return row?.id ?? null;
  };

  const grantPermission = async (resource: AdminResource, action: AdminAction) => {
    const key = permissionKey(resource, action);
    setBusyKey(key);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource, action }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || 'Yetki verilemedi.');
      } else {
        setSuccess(`${RESOURCE_LABELS[resource]} → ${ACTION_LABELS[action]} verildi.`);
        await fetchData();
      }
    } catch {
      setError('Bağlantı hatası.');
    } finally {
      setBusyKey(null);
    }
  };

  const revokePermission = async (
    resource: string,
    action: string,
    permissionId: string,
  ) => {
    const key = permissionKey(resource, action);
    setBusyKey(key);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/users/${id}/permissions/${permissionId}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || 'Yetki kaldırılamadı.');
      } else {
        setSuccess(
          `${RESOURCE_LABELS[resource as AdminResource] || resource} → ${ACTION_LABELS[action as AdminAction] || action} geri alındı.`,
        );
        await fetchData();
      }
    } catch {
      setError('Bağlantı hatası.');
    } finally {
      setBusyKey(null);
    }
  };

  const askRevoke = (resource: string, action: string, permissionId: string) => {
    askConfirm({
      title: 'Yetki geri alınsın mı?',
      body: `${RESOURCE_LABELS[resource as AdminResource] || resource} → ${ACTION_LABELS[action as AdminAction] || action} izni bu yöneticiden kaldırılacak. Anında geçerli olur.`,
      confirmLabel: 'Geri al',
      cancelLabel: 'Vazgeç',
      variant: 'danger',
      onConfirm: () => revokePermission(resource, action, permissionId),
    });
  };

  const applyPreset = async (presetKey: string) => {
    const preset = PERMISSION_PRESETS[presetKey];
    if (!preset) return;
    setBusyKey(`preset:${presetKey}`);
    setError(null);
    try {
      // Sequentially apply grants (idempotent — re-grant just refreshes).
      // Failures don't abort the batch (Promise.allSettled paterni).
      const results = await Promise.allSettled(
        preset.grants.map((g) =>
          fetch(`/api/admin/users/${id}/permissions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resource: g.resource, action: g.action }),
          }),
        ),
      );
      const successCount = results.filter(
        (r) => r.status === 'fulfilled' && r.value.ok,
      ).length;
      const failCount = preset.grants.length - successCount;
      setSuccess(
        `${preset.label} uygulandı (${successCount} verildi${failCount ? `, ${failCount} başarısız` : ''}).`,
      );
      await fetchData();
    } catch {
      setError('Bağlantı hatası.');
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-4">
        <PageHeader eyebrow="YETKİLER" title="Yükleniyor…" />
        <div className="bz-card p-10 flex items-center justify-center text-[13px] text-[#737373] gap-2">
          <Loader2 size={14} className="animate-spin" />
          Yetkiler yükleniyor…
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-4">
        <PageHeader eyebrow="YETKİLER" title="Hata" />
        <AlertBanner kind="danger">{error}</AlertBanner>
        <Link href={`/admin/users/${id}`} className="bz-btn-ghost inline-flex">
          <ArrowLeft size={14} strokeWidth={2} />
          Detaya dön
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const isSuperadmin = data.target.role === 'superadmin';

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-4">
      <Link
        href={`/admin/users/${id}`}
        className="text-[12px] text-[#737373] hover:text-pn-ink inline-flex items-center gap-1.5"
      >
        <ArrowLeft size={12} strokeWidth={2} />
        Detaya dön
      </Link>

      <PageHeader
        eyebrow="YÖNETİCİLER / YETKİLER"
        title={`${data.target.username} yetkileri`}
        description={
          isSuperadmin
            ? 'Bu kullanıcı superadmin — tüm bölümlere otomatik olarak tam erişimi var.'
            : 'Bu yöneticinin hangi bölümleri görüp düzenleyebileceğini belirle. Değişiklikler en geç 1 dakika içinde geçerli olur.'
        }
      />

      {success && (
        <AlertBanner kind="success" onDismiss={() => setSuccess(null)}>
          {success}
        </AlertBanner>
      )}
      {error && data && (
        <AlertBanner kind="danger" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      )}

      {isSuperadmin && (
        <AlertBanner kind="info">
          <div className="flex items-start gap-2">
            <Shield size={14} strokeWidth={2} className="shrink-0 mt-0.5" />
            <div>
              <strong>Superadmin için yetki ataması gereksiz.</strong>
              <p className="text-[12px] mt-1 opacity-80">
                Superadmin her bölüme ve işleme her zaman erişebilir.
                Bu sayfayı yönetici veya görevli rolündeki kullanıcılar için kullan.
              </p>
            </div>
          </div>
        </AlertBanner>
      )}

      {/* Preset bundles */}
      {!isSuperadmin && (
        <section className="bz-card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-[15px] font-medium text-pn-ink">Hazır şablonlar</h3>
              <p className="mt-0.5 text-[12px] text-[#737373]">
                Sık kullanılan izin kombinasyonlarını tek tıkla ver. Tekrar uygulamak zarar vermez.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(PERMISSION_PRESETS).map(([key, preset]) => {
              const isBusy = busyKey === `preset:${key}`;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  disabled={isBusy || !!busyKey}
                  className="rounded-[20px] border border-pn-line bg-white p-4 text-left hover:border-pn-ink hover:bg-pn-canvas disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} strokeWidth={2} className="text-pn-accent-ink" />
                    <span className="text-[13px] font-medium text-pn-ink">
                      {preset.label}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-[#737373] leading-relaxed">
                    {preset.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {preset.grants.map((g) => (
                      <span
                        key={`${g.resource}:${g.action}`}
                        className="inline-flex items-center rounded-full bg-pn-canvas border border-pn-line px-2 py-0.5 text-[12px] text-[#525252]"
                      >
                        {RESOURCE_LABELS[g.resource] || g.resource} · {ACTION_LABELS[g.action] || g.action}
                      </span>
                    ))}
                  </div>
                  {isBusy && (
                    <div className="mt-2 flex items-center gap-1 text-[12px] text-[#737373]">
                      <Loader2 size={11} className="animate-spin" />
                      Uygulanıyor…
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Permission matrix */}
      {!isSuperadmin && (
        <section className="bz-card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-[15px] font-medium text-pn-ink">Yetki matrisi</h3>
              <p className="mt-0.5 text-[12px] text-[#737373]">
                {RESOURCES.length} bölüm × {ACTIONS.length} işlem. Bir hücreye tıklayarak izni ver
                veya geri al.
              </p>
            </div>
            <Badge kind="ghost">
              {grantedKeys.size}/{RESOURCES.length * ACTIONS.length} aktif
            </Badge>
          </div>

          <div className="overflow-x-auto rounded-[14px] border border-pn-line">
            <table className="w-full text-left text-[13px]" style={{ minWidth: 540 }}>
              <thead>
                <tr className="bg-pn-canvas border-b border-pn-line">
                  <th className="px-4 py-3 text-[13px] font-medium text-[#737373]">Bölüm</th>
                  {ACTIONS.map((a) => (
                    <th
                      key={a}
                      className="px-3 py-3 text-[13px] font-medium text-[#737373] text-center"
                      style={{ width: 110 }}
                    >
                      {ACTION_LABELS[a]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-pn-line">
                {RESOURCES.map((r) => (
                  <tr key={r} className="hover:bg-pn-canvas/60">
                    <td className="px-4 py-3">
                      <span className="text-[13px] font-medium text-pn-ink">
                        {RESOURCE_LABELS[r]}
                      </span>
                    </td>
                    {ACTIONS.map((a) => {
                      const key = permissionKey(r, a);
                      const granted = grantedKeys.has(key);
                      const permId = grantedById(r, a);
                      const isBusy = busyKey === key;
                      return (
                        <td key={a} className="px-3 py-3 text-center">
                          {isBusy ? (
                            <Loader2 size={16} className="animate-spin mx-auto text-[#737373]" />
                          ) : granted ? (
                            <button
                      type="button"
                      onClick={() => permId && askRevoke(r, a, permId)}
                      disabled={!!busyKey}
                      className="bz-btn-icon bg-pn-accent-soft text-pn-ink hover:bg-[#FEE2E2] hover:text-[#991B1B] disabled:opacity-50"
                      title="Geri al"
                              aria-label={`${RESOURCE_LABELS[r]} ${ACTION_LABELS[a]} yetkisini geri al`}
                            >
                              <Check size={14} strokeWidth={2.5} />
                            </button>
                          ) : (
                            <button
                      type="button"
                      onClick={() => grantPermission(r, a)}
                      disabled={!!busyKey}
                      className="bz-btn-icon border border-dashed border-pn-line text-[#A3A3A3] disabled:opacity-50"
                      title="Ver"
                              aria-label={`${RESOURCE_LABELS[r]} ${ACTION_LABELS[a]} yetkisi ver`}
                            >
                              <X size={14} strokeWidth={2} />
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Active grants list */}
      {!isSuperadmin && data.permissions.length > 0 && (
        <section className="bz-card p-5 sm:p-6">
          <h3 className="text-[15px] font-medium text-pn-ink mb-3">
            Aktif yetkiler ({data.permissions.length})
          </h3>
          <ul className="divide-y divide-pn-line">
            {data.permissions.map((p) => {
              const isBusy = busyKey === permissionKey(p.resource, p.action);
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <span className="text-[13px] font-medium text-pn-ink">
                      {RESOURCE_LABELS[p.resource as AdminResource] || p.resource} ·{' '}
                      {ACTION_LABELS[p.action as AdminAction] || p.action}
                    </span>
                    <p className="text-[12px] text-[#737373] mt-0.5">
                      Verildi: {formatFullDateTimeInTimeZone(p.grantedAt, 'tr')}
                      {p.expiresAt && (
                        <>
                          {' · '}
                          Sona erer: {formatFullDateTimeInTimeZone(p.expiresAt, 'tr')}
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => askRevoke(p.resource, p.action, p.id)}
                    disabled={isBusy || !!busyKey}
                    className="bz-btn-danger disabled:opacity-50"
                    title="Yetkiyi kaldır"
                  >
                    {isBusy ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} strokeWidth={2} />
                    )}
                    Kaldır
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {confirmDialog}
    </div>
  );
}
