'use client';

import { useCallback, useEffect, useState, use } from 'react';
import Link from 'next/link';
import { adminRoleLabel } from '@/components/admin/admin-nav';
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  Key,
  Loader2,
  Mail,
  ShieldCheck,
  Store,
  User as UserIcon,
} from 'lucide-react';
import {
  AlertBanner,
  Badge,
  type BadgeKind,
  EmptyState,
  PageHeader,
  StatCard,
} from '@/components/ui';
import UserAuditTimeline from '@/components/admin/UserAuditTimeline';

// CLAUDE.md §38.93 (Stage A1) — admin user detail page mirrors the members
// detail (CLAUDE.md §38.76) for AdminUser rows. Owner panel back-link is the
// counterpart on the user side; this page is the admin-side complement so
// superadmin can audit a manager's activity + jump to scoped restaurant in
// one click.

interface UserDetail {
  user: {
    id: string;
    username: string;
    email: string | null;
    role: string;
    restaurantId: string | null;
    passwordChangedAt: string | null;
  };
  restaurant: { id: string; name: string; slug: string; isActive: boolean } | null;
}

// `staff` is the granular sub-tier; per-resource grants live in
// /admin/users/[id]/permissions (CLAUDE.md §37.2 RBAC). Wording comes from
// the shared admin role labels.
const ROLE_KIND: Record<string, BadgeKind> = {
  superadmin: 'info',
  manager: 'ok',
  staff: 'lime',
};

function dateLabel(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function dateTimeLabel(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`);
      if (!res.ok) {
        if (res.status === 404) setError('Yönetici bulunamadı.');
        else if (res.status === 403) setError('Yetkisiz erişim.');
        else setError('Detay yüklenemedi.');
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
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-4">
        <PageHeader eyebrow="YÖNETİCİLER / DETAY" title="Yükleniyor…" />
        <div className="bz-card p-10 flex items-center justify-center text-[13px] text-[#737373] gap-2">
          <Loader2 size={14} className="animate-spin" />
          Yönetici bilgileri yükleniyor…
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-4">
        <PageHeader eyebrow="YÖNETİCİLER / DETAY" title="Hata" />
        <AlertBanner kind="danger">{error}</AlertBanner>
        <Link href="/admin/users" className="bz-btn-ghost inline-flex">
          <ArrowLeft size={14} strokeWidth={2} />
          Listeye dön
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const { user, restaurant } = data;
  const roleMeta = ROLE_KIND[user.role]
    ? { label: adminRoleLabel(user.role, 'tr'), kind: ROLE_KIND[user.role] }
    : { label: user.role, kind: 'ghost' as BadgeKind };

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-4">
      <Link
        href="/admin/users"
        className="text-[12px] text-[#737373] hover:text-pn-ink inline-flex items-center gap-1.5"
      >
        <ArrowLeft size={12} strokeWidth={2} />
        Listeye dön
      </Link>

      <PageHeader
        eyebrow="YÖNETİCİLER / DETAY"
        title={user.username}
        description={
          <span>
            {user.email || (
              <span className="text-[#D97706] inline-flex items-center gap-1">
                <Mail size={11} strokeWidth={2} />
                Kurtarma e-postası yok
              </span>
            )}
            {user.passwordChangedAt && (
              <>
                {' · '}Son şifre değişimi: {dateLabel(user.passwordChangedAt)}
              </>
            )}
          </span>
        }
      />

      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Rol"
          value={roleMeta.label}
          icon={<ShieldCheck size={14} strokeWidth={2} />}
          accent={user.role === 'superadmin' ? '#5D3EBC' : undefined}
        />
        <StatCard
          label="Kapsam"
          value={restaurant ? restaurant.name : 'Sistem geneli'}
          icon={<Store size={14} strokeWidth={2} />}
        />
        <StatCard
          label="Son şifre değişimi"
          value={dateLabel(user.passwordChangedAt)}
          icon={<Clock size={14} strokeWidth={2} />}
        />
        <StatCard
          label="Audit izleme"
          value="Aşağıda"
          icon={<CalendarClock size={14} strokeWidth={2} />}
        />
      </div>

      {/* Detail + Audit grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
        <section className="bz-card p-5 sm:p-6">
          <h3 className="text-[15px] font-medium text-pn-ink mb-4">Hesap bilgileri</h3>
          <dl className="space-y-3 text-[13px]">
            <Row label="Kullanıcı adı" value={user.username} mono />
            <Row label="Kurtarma e-postası" value={user.email || '—'} mono={!!user.email} />
            <Row
              label="Rol"
              valueNode={<Badge kind={roleMeta.kind}>{roleMeta.label}</Badge>}
            />
            {restaurant ? (
              <Row
                label="Restoran"
                valueNode={
                  <Link
                    href={`/admin/restaurants/${restaurant.id}`}
                    className="inline-flex items-center gap-1.5 text-pn-ink hover:underline"
                  >
                    <Store size={11} strokeWidth={2} />
                    {restaurant.name}
                    <Badge kind={restaurant.isActive ? 'ok' : 'danger'}>
                      {restaurant.isActive ? 'Aktif' : 'Pasif'}
                    </Badge>
                  </Link>
                }
              />
            ) : (
              <Row label="Restoran" value="Sistem geneli (kapsam yok)" />
            )}
            <Row label="Son şifre değişimi" value={dateTimeLabel(user.passwordChangedAt)} />
          </dl>
        </section>

        <section className="bz-card p-5 sm:p-6">
          <h3 className="text-[15px] font-medium text-pn-ink mb-4">Hızlı bağlantılar</h3>
          <div className="space-y-2">
            {/* Stage A2 §38.94 — RBAC permission management. Only meaningful
                for manager role; superadmin auto-bypass. Page itself shows
                an info banner if target is superadmin. */}
            <Link
              href={`/admin/users/${user.id}/permissions`}
              className="bz-btn-ghost w-full justify-start"
            >
              <Key size={14} strokeWidth={2} />
              <span>Yetkileri yönet</span>
            </Link>
            {restaurant ? (
              <Link
                href={`/admin/restaurants/${restaurant.id}`}
                className="bz-btn-ghost w-full justify-start"
              >
                <Store size={14} strokeWidth={2} />
                <span>Yönetici kapsamındaki restorana git</span>
              </Link>
            ) : (
              <p className="text-[12px] text-[#737373]">
                Bu yönetici sistem geneli (superadmin) — tek bir restoran kapsamı yok.
              </p>
            )}
            <Link href="/admin/users" className="bz-btn-ghost w-full justify-start">
              <UserIcon size={14} strokeWidth={2} />
              <span>Yöneticiler listesi</span>
            </Link>
          </div>

          {/* Active sessions panel — DEFER per task instructions:
              UserSession only tracks User auth (CLAUDE.md §38.79); AdminUser
              has no session table yet. passwordChangedAt is the equivalent
              staleness pivot (CLAUDE.md §37.3 #1 closure) and is shown above. */}
          <div className="mt-5 pt-4 border-t border-pn-line">
            <p className="text-[12px] text-[#737373]">
              <span className="font-medium text-pn-ink">Aktif oturumlar</span> —
              Şifre değiştiğinde bu yöneticinin önceki tüm oturumları kapanır. Üstteki
              &quot;Son şifre değişimi&quot; tarihi, önceki oturumların geçersiz kılındığı andır.
            </p>
          </div>
        </section>
      </div>

      {/* Audit history — actions THIS admin performed (actorId=id) */}
      <section className="bz-card p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-[15px] font-medium text-pn-ink">Yönetici aksiyon geçmişi</h3>
          <p className="text-[12px] text-[#737373]">Son 50 işlem (panele yansıyan)</p>
        </div>
        <UserAuditTimeline userId={id} />
      </section>

      {/* Empty state if user has no scope and no restaurant */}
      {!restaurant && user.role === 'manager' && (
        <EmptyState
          icon={<ShieldCheck size={20} strokeWidth={2} />}
          title="Bu yönetici hiçbir restorana atanmamış"
          body="Manager rolündeki kullanıcılar için bir restoran kapsamı zorunludur. Listeye dönüp düzenleyebilirsin."
          action={
            <Link href="/admin/users" className="bz-btn-primary">
              Listeye dön
            </Link>
          }
        />
      )}
    </div>
  );
}

function Row({
  label,
  value,
  valueNode,
  mono,
}: {
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <dt className="text-[13px] font-medium text-[#737373] shrink-0">{label}</dt>
      <dd
        className={`text-pn-ink text-right ${mono ? 'font-mono text-[12px]' : 'text-[13px] font-medium'}`}
      >
        {valueNode ?? value}
      </dd>
    </div>
  );
}
