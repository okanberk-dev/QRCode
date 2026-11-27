'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Ban,
  CalendarClock,
  CreditCard,
  Loader2,
  Mail,
  MessageSquare,
  Power,
  RotateCcw,
  Store,
} from 'lucide-react';
import {
  AlertBanner,
  Badge,
  type BadgeKind,
  ConfirmDialog,
  PageHeader,
  StatCard,
  Tabs,
  type TabItem,
} from '@/components/ui';
import MemberInvoicesPanel from '@/components/admin/MemberInvoicesPanel';
import MemberRestaurantsPanel from '@/components/admin/MemberRestaurantsPanel';
import MemberTeamPanel from '@/components/admin/MemberTeamPanel';
import MemberAuditTimeline from '@/components/admin/MemberAuditTimeline';
import MemberBillingModal from '@/components/admin/MemberBillingModal';
import MemberActivationPanel from '@/components/admin/MemberActivationPanel';
import MemberSupportPanel from '@/components/admin/MemberSupportPanel';
import MemberRecentFeedbacksPanel from '@/components/admin/MemberRecentFeedbacksPanel';
import ImpersonateButton from '@/components/admin/ImpersonateButton';
import { resolveDisplayTimeZone } from '@/lib/timezone';

export interface MemberDetail {
  user: {
    id: string;
    email: string;
    name: string | null;
    plan: string;
    trialEndsAt: string | null;
    isActive: boolean;
    deactivatedAt: string | null;
    scheduledDeletionAt?: string | null;
    lastInvitedAt: string | null;
    locale: string;
    createdAt: string;
    updatedAt: string;
  };
  counts: {
    restaurants: number;
    feedbackLast30d: number;
    invoices: number;
    teamMembers: number;
  };
  subscription: {
    plan: string;
    status: string;
    renewsAt: string | null;
    amount: number | null;
    currency: string | null;
    billingCycle: string | null;
  } | null;
}

const PLAN_LABEL: Record<string, { label: string; kind: BadgeKind }> = {
  trial: { label: 'Deneme', kind: 'lime' },
  monthly: { label: 'Aylık', kind: 'info' },
  yearly: { label: 'Yıllık', kind: 'ok' },
  free: { label: 'Ücretsiz', kind: 'ghost' },
  enterprise: { label: 'Kurumsal', kind: 'info' },
};

const STATUS_LABEL: Record<string, { label: string; kind: BadgeKind }> = {
  active: { label: 'Aktif abonelik', kind: 'ok' },
  past_due: { label: 'Ödeme bekliyor', kind: 'warn' },
  canceled: { label: 'İptal', kind: 'danger' },
};

const TABS: TabItem[] = [
  { id: 'overview', label: 'Genel' },
  { id: 'billing', label: 'Plan & Adres' },
  { id: 'invoices', label: 'Faturalar' },
  { id: 'restaurants', label: 'İşletmeler' },
  { id: 'team', label: 'Ekip' },
  { id: 'audit', label: 'İşlem kaydı' },
];

const COOLDOWN_MS = 60 * 60 * 1000;

function dateLabel(iso: string | null): string {
  if (!iso) return '—';
  try {
    // Business time zone (CLAUDE.md §46): the server renders this page now,
    // so a browser-local date would not match it and break hydration.
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: resolveDisplayTimeZone(),
    });
  } catch {
    return iso;
  }
}

function fmtMoney(amount: number, currency: string | null): string {
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency || 'TRY',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency || 'TRY'} ${amount.toFixed(0)}`;
  }
}

export default function MemberDetailClient({
  id,
  initialData,
}: {
  id: string;
  /**
   * §40.10 server hydration — the same payload GET /api/admin/members/[id]
   * returns. With it the overview panels mount (and start their own
   * requests) on first paint instead of after a client round-trip.
   * Undefined keeps the client fetch.
   */
  initialData?: MemberDetail;
}) {
  const router = useRouter();

  const [data, setData] = useState<MemberDetail | null>(initialData ?? null);
  const [loading, setLoading] = useState(initialData === undefined);
  // Server data covers the first load; skip only that fetch (actions refetch).
  const skipFirstFetchRef = useRef(initialData !== undefined);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');

  const [actionRunning, setActionRunning] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'deactivate' | 'reactivate' | null>(null);
  const [showBillingModal, setShowBillingModal] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/members/${id}`);
      if (!res.ok) {
        if (res.status === 404) setError('İşletme sahibi bulunamadı.');
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
    if (skipFirstFetchRef.current) {
      skipFirstFetchRef.current = false;
      return;
    }
    fetchDetail();
  }, [fetchDetail]);

  const sendPasswordReset = async () => {
    setActionRunning('reset');
    setError(null);
    try {
      const res = await fetch(`/api/admin/members/${id}/send-password-reset`, {
        method: 'POST',
      });
      const j = await res.json();
      if (!res.ok) {
        if (res.status === 429 && j.retryAfter) {
          const min = Math.ceil(j.retryAfter / 60);
          setError(`Çok yakın zamanda bir davet gönderildi. ${min} dakika sonra tekrar dene.`);
        } else {
          setError(j.error || 'Mail gönderilemedi.');
        }
        return;
      }
      setSuccess(j.mailSent ? 'Şifre sıfırlama maili gönderildi.' : 'Mail gönderilemedi (link kopyalanabilir).');
      fetchDetail();
    } catch {
      setError('Bağlantı hatası.');
    } finally {
      setActionRunning(null);
    }
  };

  const performDeactivate = async () => {
    setActionRunning('deactivate');
    try {
      const res = await fetch(`/api/admin/members/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('Hesap pasifleştirildi.');
        fetchDetail();
      } else {
        setError('Silme işlemi başarısız.');
      }
    } catch {
      setError('Bağlantı hatası.');
    } finally {
      setActionRunning(null);
      setConfirmAction(null);
    }
  };

  const performReactivate = async () => {
    setActionRunning('reactivate');
    try {
      const res = await fetch(`/api/admin/members/${id}/reactivate`, { method: 'POST' });
      if (res.ok) {
        setSuccess('Hesap yeniden aktive edildi.');
        fetchDetail();
      } else {
        setError('Aktive etme başarısız.');
      }
    } catch {
      setError('Bağlantı hatası.');
    } finally {
      setActionRunning(null);
      setConfirmAction(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-4">
        <PageHeader eyebrow="İŞLETME SAHİPLERİ / DETAY" title="Yükleniyor…" />
        <div className="bz-card p-10 flex items-center justify-center text-[13px] text-[#737373] gap-2">
          <Loader2 size={14} className="animate-spin" />
          Hesap bilgileri yükleniyor…
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-4">
        <PageHeader eyebrow="İŞLETME SAHİPLERİ / DETAY" title="Hata" />
        <AlertBanner kind="danger">{error}</AlertBanner>
        <Link href="/admin/members" className="bz-btn-ghost inline-flex">
          <ArrowLeft size={14} strokeWidth={2} />
          Listeye dön
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const { user, counts, subscription } = data;
  const planMeta = PLAN_LABEL[user.plan] || { label: user.plan, kind: 'ghost' as BadgeKind };
  const subStatusMeta = subscription
    ? STATUS_LABEL[subscription.status] || { label: subscription.status, kind: 'ghost' as BadgeKind }
    : null;

  const cooldownActive =
    user.lastInvitedAt && Date.now() - new Date(user.lastInvitedAt).getTime() < COOLDOWN_MS;

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-4">
      <Link
        href="/admin/members"
        className="text-[12px] text-[#737373] hover:text-pn-ink inline-flex items-center gap-1.5"
      >
        <ArrowLeft size={12} strokeWidth={2} />
        Listeye dön
      </Link>

      <PageHeader
        eyebrow="İŞLETME SAHİPLERİ / DETAY"
        title={user.name || user.email}
        description={
          <span>
            {user.email} · Kayıt: {dateLabel(user.createdAt)}
            {!user.isActive && (
              <>
                {' · '}
                <span className="text-[#DC2626] font-medium">
                  Silinmiş (silinme tarihi: {dateLabel(user.deactivatedAt)})
                </span>
              </>
            )}
            {user.isActive && user.scheduledDeletionAt && (
              <>
                {' · '}
                <span className="text-[#DC2626] font-medium">
                  Owner hesabını silme talebinde bulundu — kalıcı silinme: {dateLabel(user.scheduledDeletionAt)}
                </span>
              </>
            )}
          </span>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Stage A4 §38.96 — "Owner gibi gör" support workflow.
                Modal açar; reason + KVKK consent + 30dk timer disclosure. */}
            {user.isActive && (
              <ImpersonateButton
                targetUserId={user.id}
                targetEmail={user.email}
                targetName={user.name}
              />
            )}
            <button
              type="button"
              onClick={sendPasswordReset}
              disabled={!user.isActive || actionRunning === 'reset' || !!cooldownActive}
              className="bz-btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                cooldownActive
                  ? `Son davet: ${dateLabel(user.lastInvitedAt)}. 1 saat sonra tekrar dene.`
                  : !user.isActive
                    ? 'Silinmiş hesaba mail gönderilemez'
                    : undefined
              }
            >
              {actionRunning === 'reset' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Mail size={14} strokeWidth={2} />
              )}
              <span className="hidden sm:inline">Şifre sıfırlama maili gönder</span>
              <span className="sm:hidden">Şifre maili</span>
            </button>
            {user.isActive ? (
              <button
                type="button"
                onClick={() => setConfirmAction('deactivate')}
                disabled={actionRunning === 'deactivate'}
                className="bz-btn-danger"
                title="Hesabı sil — veriler sistemde saklanır, geri alınabilir"
              >
                <Ban size={14} strokeWidth={2} />
                Sil
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmAction('reactivate')}
                disabled={actionRunning === 'reactivate'}
                className="bz-btn-ghost"
                title="Silinmiş hesabı geri getir"
              >
                <Power size={14} strokeWidth={2} />
                Geri getir
              </button>
            )}
          </div>
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

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="İşletme"
          value={String(counts.restaurants)}
          icon={<Store size={14} strokeWidth={2} />}
        />
        <StatCard
          label="Yorum / 30 gün"
          value={String(counts.feedbackLast30d)}
          icon={<MessageSquare size={14} strokeWidth={2} />}
        />
        <StatCard
          label="Plan"
          value={planMeta.label}
          icon={<CreditCard size={14} strokeWidth={2} />}
          accent={user.plan === 'yearly' ? '#5D3EBC' : undefined}
        />
        <StatCard
          label={subscription?.renewsAt ? 'Yenileme' : 'Deneme bitiş'}
          value={dateLabel(subscription?.renewsAt || user.trialEndsAt)}
          icon={<CalendarClock size={14} strokeWidth={2} />}
        />
      </div>

      {/* Tabs */}
      <div className="bz-card p-1.5">
        <Tabs items={TABS} active={activeTab} onChange={setActiveTab} ariaLabel="Detay sekmeleri" />
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <>
        <section className="bz-card mb-4 p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-[15px] font-medium text-pn-ink">Destek özeti</h3>
            <p className="text-[12px] text-[#737373]">Girişler, e-posta, platform linkleri, Google ve ödemeler</p>
          </div>
          <MemberSupportPanel userId={id} />
        </section>
        {/* CLAUDE.md §38.93 (Stage A1) — admin tier owner pulse:
            Activation snapshot + Recent feedbacks aggregate. Drill-down per
            restaurant → /admin/restaurants/[id] (existing §38.76). */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
          <section className="bz-card p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-[15px] font-medium text-pn-ink">Aktivasyon kontrol listesi</h3>
              <p className="text-[12px] text-[#737373]">Her işletme için 5 adımlık kurulum durumu</p>
            </div>
            <MemberActivationPanel userId={id} />
          </section>
          <section className="bz-card p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-[15px] font-medium text-pn-ink">Son yorumlar</h3>
              <p className="text-[12px] text-[#737373]">Tüm restoranlardan son 10 yorum</p>
            </div>
            <MemberRecentFeedbacksPanel userId={id} />
          </section>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
          <section className="bz-card p-5 sm:p-6">
            <h3 className="text-[15px] font-medium text-pn-ink mb-4">Hesap bilgileri</h3>
            <dl className="space-y-3 text-[13px]">
              <Row label="Email" value={user.email} mono />
              <Row label="İsim" value={user.name || '—'} />
              <Row label="Panel dili" value={user.locale.toUpperCase()} />
              <Row
                label="Plan"
                valueNode={<Badge kind={planMeta.kind}>{planMeta.label}</Badge>}
              />
              {subscription && subStatusMeta && (
                <Row
                  label="Abonelik"
                  valueNode={
                    <span className="flex items-center gap-2">
                      <Badge kind={subStatusMeta.kind}>{subStatusMeta.label}</Badge>
                      {subscription.amount != null && (
                        <span className="text-[12px] text-[#525252]">
                          {/* Yearly cycles store the annual total
                              (MemberBillingModal / §15.2), so label it
                              per year and show the monthly equivalent. */}
                          {fmtMoney(subscription.amount, subscription.currency)}
                          {subscription.billingCycle === 'yearly'
                            ? ` / yıl (≈ ${fmtMoney(subscription.amount / 12, subscription.currency)} / ay)`
                            : subscription.billingCycle === 'monthly'
                              ? ' / ay'
                              : ''}
                        </span>
                      )}
                    </span>
                  }
                />
              )}
              <Row
                label="Hesap"
                valueNode={
                  <Badge kind={user.isActive ? 'ok' : 'danger'}>
                    {user.isActive ? 'Aktif' : 'Silinmiş'}
                  </Badge>
                }
              />
              <Row label="Son güncelleme" value={dateLabel(user.updatedAt)} />
              <Row label="Son davet" value={dateLabel(user.lastInvitedAt)} />
            </dl>
            <div className="mt-5 pt-4 border-t border-pn-line">
              <button
                type="button"
                onClick={() => setShowBillingModal(true)}
                className="bz-btn-ghost"
              >
                <CreditCard size={14} strokeWidth={2} />
                Plan ve adresi düzenle
              </button>
            </div>
          </section>

          <section className="bz-card p-5 sm:p-6">
            <h3 className="text-[15px] font-medium text-pn-ink mb-4">Son işlemler</h3>
            <MemberAuditTimeline userId={id} max={5} />
            {counts.invoices === 0 ? null : (
              <button
                type="button"
                onClick={() => setActiveTab('audit')}
                className="mt-4 text-[12px] text-[#737373] hover:text-pn-ink underline"
              >
                Tüm işlem kaydını gör
              </button>
            )}
          </section>
        </div>
        </>
      )}

      {activeTab === 'billing' && (
        <div className="bz-card p-5 sm:p-6">
          <p className="text-[13px] text-[#525252] mb-3">
            Plan, ödeme yöntemi ve fatura adresi alanlarını düzenlemek için aşağıdaki butonu kullan.
            Tüm değişiklikler işlem kaydına yazılır.
          </p>
          <button
            type="button"
            onClick={() => setShowBillingModal(true)}
            className="bz-btn-primary"
          >
            <CreditCard size={14} strokeWidth={2} />
            Plan ve faturalandırmayı düzenle
          </button>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="bz-card p-5 sm:p-6">
          <MemberInvoicesPanel userId={id} />
        </div>
      )}

      {activeTab === 'restaurants' && <MemberRestaurantsPanel userId={id} />}

      {activeTab === 'team' && <MemberTeamPanel userId={id} />}

      {activeTab === 'audit' && (
        <div className="bz-card p-5 sm:p-6">
          <MemberAuditTimeline userId={id} />
        </div>
      )}

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmAction === 'deactivate'}
        title="Hesabı sil"
        body="Bu hesap silinecek (arşive alınacak). Kullanıcı listede gözükmeyecek, panele giriş yapamayacak. Veriler (işletmeler, faturalar, işlem kaydı) sistemde saklanır — istersen 'Silinmiş (arşiv)' filtresinden bulup 'Geri getir' diyebilirsin."
        confirmLabel="Sil"
        variant="danger"
        onConfirm={performDeactivate}
        onCancel={() => setConfirmAction(null)}
        loading={actionRunning === 'deactivate'}
      />
      <ConfirmDialog
        open={confirmAction === 'reactivate'}
        title="Hesabı geri getir"
        body="Bu hesap arşivden çıkarılacak; kullanıcı panele giriş yapabilecek ve aktif listede yeniden görünecek."
        confirmLabel={
          <span className="inline-flex items-center gap-1.5">
            <RotateCcw size={14} strokeWidth={2} />
            Geri getir
          </span>
        }
        onConfirm={performReactivate}
        onCancel={() => setConfirmAction(null)}
        loading={actionRunning === 'reactivate'}
      />


      {/* Billing modal — reuses Faz 3-4 modal */}
      {showBillingModal && (
        <MemberBillingModal
          userId={id}
          email={user.email}
          name={user.name}
          onClose={() => setShowBillingModal(false)}
          onSaved={() => {
            setSuccess('Faturalandırma güncellendi.');
            fetchDetail();
            router.refresh();
          }}
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
