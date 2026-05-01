'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Crown,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Store,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';
import {
  AlertBanner,
  Badge,
  type BadgeKind,
  EmptyState,
  Modal,
  PageHeader,
  TableSkeleton,
} from '@/components/ui';
import MemberBillingModal from '@/components/admin/MemberBillingModal';
import MemberCreateModal from '@/components/admin/MemberCreateModal';

interface Member {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  trialEndsAt: string | null;
  isActive: boolean;
  deactivatedAt?: string | null;
  lastInvitedAt?: string | null;
  createdAt: string;
  _count: { restaurants: number };
}

interface Meta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

function daysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const PLAN_BADGE: Record<string, { label: string; kind: BadgeKind }> = {
  trial: { label: 'Deneme', kind: 'lime' },
  monthly: { label: 'Aylık', kind: 'info' },
  yearly: { label: 'Yıllık', kind: 'ok' },
  free: { label: 'Ücretsiz', kind: 'ghost' },
};

const PLAN_FILTER_OPTIONS = [
  { v: '', l: 'Tüm planlar' },
  { v: 'trial', l: 'Deneme' },
  { v: 'monthly', l: 'Aylık' },
  { v: 'yearly', l: 'Yıllık' },
  { v: 'free', l: 'Ücretsiz' },
];

const STATUS_FILTER_OPTIONS = [
  { v: 'active', l: 'Aktif' },
  // 'Silinmiş' = soft delete (isActive=false + deactivatedAt set). Kayıt
  // DB'de duruyor; aktif listede gizli; arşivden geri getirilebilir.
  { v: 'passive', l: 'Silinmiş (arşiv)' },
  { v: 'all', l: 'Tümü (silinmiş dahil)' },
];

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, perPage: 25, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // filters — PR4 URL synced (Linear/Stripe pattern, useUrlFilter §28)
  const filters = useUrlFilter({
    search: '',
    plan: '',
    status: 'active' as 'active' | 'passive' | 'all',
    page: 1,
  });
  const debouncedSearch = filters.values.search;
  const [searchInput, setSearchInput] = useState(debouncedSearch);
  const setDebouncedSearch = (v: string) => filters.set('search', v);
  const planFilter = filters.values.plan;
  const setPlanFilter = (v: string) => filters.set('plan', v);
  const statusFilter = filters.values.status;
  const setStatusFilter = (v: 'active' | 'passive' | 'all') => filters.set('status', v);
  const page = filters.values.page;
  const setPage = (v: number) => filters.set('page', v);

  // edit + billing + create modals
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editPlan, setEditPlan] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editTrialEndsAt, setEditTrialEndsAt] = useState('');
  const [billingMember, setBillingMember] = useState<Member | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Debounce search input by 300ms — matches admin/customers pattern.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const queryString = useMemo(() => {
    const qp = new URLSearchParams();
    if (debouncedSearch) qp.set('search', debouncedSearch);
    if (planFilter) qp.set('plan', planFilter);
    qp.set('status', statusFilter);
    qp.set('page', String(page));
    qp.set('perPage', '25');
    return qp.toString();
  }, [debouncedSearch, planFilter, statusFilter, page]);

  const [fetchError, setFetchError] = useState<string | null>(null);
  const router = useRouter();

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/admin/members?${queryString}`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.data || []);
        if (data.meta) setMeta(data.meta);
      } else {
        setFetchError('İşletme sahipleri getirilemedi. Lütfen sayfayı yenileyin.');
      }
    } catch (e) {
      console.error(e);
      setFetchError('Bağlantı hatası — işletme sahipleri şu an gelmiyor.');
    }
    setLoading(false);
  }, [queryString]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const filtersActive = debouncedSearch || planFilter || statusFilter !== 'active';
  const clearFilters = () => {
    setSearchInput('');
    setPlanFilter('');
    setStatusFilter('active');
    setPage(1);
  };

  const openEdit = (member: Member) => {
    setEditingMember(member);
    setEditPlan(member.plan);
    setEditIsActive(member.isActive);
    setEditTrialEndsAt(
      member.trialEndsAt ? new Date(member.trialEndsAt).toISOString().split('T')[0] : '',
    );
    setError('');
    setSuccess('');
  };

  const handleSoftDelete = async () => {
    if (!editingMember) return;
    const confirmed = window.confirm(
      `"${editingMember.name || editingMember.email}" silinsin mi?\n\nKullanıcı listede gizlenecek ama veriler (restoranlar, faturalar, audit log) DB'de korunacak. "Silinmiş (arşiv)" filtresinden bulup geri getirebilirsin.`,
    );
    if (!confirmed) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/members/${editingMember.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setEditingMember(null);
        fetchMembers();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || 'Silinemedi.');
      }
    } catch {
      alert('Bağlantı hatası.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!editingMember) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/members/${editingMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: editPlan,
          isActive: editIsActive,
          trialEndsAt: editTrialEndsAt || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('İşletme sahibi güncellendi.');
        setEditingMember(null);
        fetchMembers();
      } else {
        setError(data.error || 'Güncelleme başarısız.');
      }
    } catch {
      setError('Bağlantı hatası.');
    }
    setSaving(false);
  };

  const handleExport = () => {
    const qp = new URLSearchParams();
    if (debouncedSearch) qp.set('search', debouncedSearch);
    if (planFilter) qp.set('plan', planFilter);
    qp.set('status', statusFilter);
    window.location.href = `/api/admin/members/export?${qp.toString()}`;
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow="İŞLETME SAHİPLERİ"
        title="İşletme sahipleri"
        description="Buaze'ye kayıtlı işletme sahibi hesaplarının plan, deneme süresi, erişim durumu ve bağlı işletme sayısını yönet."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={fetchMembers} className="bz-btn-ghost" disabled={loading}>
              <RefreshCw size={14} strokeWidth={2} />
              Yenile
            </button>
            <button onClick={handleExport} className="bz-btn-ghost">
              <Download size={14} strokeWidth={2} />
              CSV
            </button>
            <button onClick={() => setShowCreate(true)} className="bz-btn-primary">
              <Plus size={14} strokeWidth={2} />
              Yeni İşletme Sahibi
            </button>
          </div>
        }
      />

      {fetchError && (
        <AlertBanner kind="danger" onDismiss={() => setFetchError(null)}>
          {fetchError}
        </AlertBanner>
      )}

      {success && (
        <AlertBanner kind="success" onDismiss={() => setSuccess('')}>
          {success}
        </AlertBanner>
      )}

      {/* Filter row */}
      <div className="bz-card flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#737373]" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="İşletme sahibi ara (email veya isim)…"
            aria-label="İşletme sahibi ara"
            className="bz-input w-full pl-11"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setPage(1);
            }}
            className="bz-input"
            aria-label="Plan filtresi"
          >
            {PLAN_FILTER_OPTIONS.map((p) => (
              <option key={p.v} value={p.v}>
                {p.l}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as 'active' | 'passive' | 'all');
              setPage(1);
            }}
            className="bz-input"
            aria-label="Durum filtresi"
          >
            {STATUS_FILTER_OPTIONS.map((s) => (
              <option key={s.v} value={s.v}>
                {s.l}
              </option>
            ))}
          </select>
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-[12px] text-[#737373] hover:text-[#0A0A0A] underline"
            >
              Filtreleri temizle
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : members.length === 0 ? (
        <EmptyState
          icon={<Store size={20} strokeWidth={2} />}
          title={filtersActive ? 'Filtreyle eşleşen sonuç yok' : 'Henüz kayıtlı işletme sahibi yok'}
          body={
            filtersActive
              ? 'Filtreleri değiştir veya temizle.'
              : 'Yeni İşletme Sahibi butonu ile davetli olarak ilk hesabı oluştur.'
          }
        />
      ) : (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-[#EDEDED] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse sm:min-w-[600px]">
              <thead>
                <tr className="bg-[#0A0A0A] pulse-eyebrow text-white/60">
                  <th className="px-3 py-4 sm:px-5">İŞLETME SAHİBİ</th>
                  <th className="hidden md:table-cell px-3 py-4 sm:px-5">PLAN</th>
                  <th className="hidden lg:table-cell px-3 py-4 sm:px-5">DENEME / BİTİŞ</th>
                  <th className="hidden lg:table-cell px-3 py-4 sm:px-5">İŞLETME</th>
                  <th className="hidden md:table-cell px-3 py-4 sm:px-5">DURUM</th>
                  <th className="px-3 py-4 sm:px-5 text-right">EYLEM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDEDED]">
                {members.map((m) => {
                  const dl = daysLeft(m.trialEndsAt);
                  const trialExpired = m.plan === 'trial' && dl !== null && dl <= 0;
                  const trialSoon = m.plan === 'trial' && dl !== null && dl > 0 && dl <= 3;
                  const planMeta = PLAN_BADGE[m.plan] || { label: m.plan, kind: 'ghost' as const };

                  const memberHref = `/admin/members/${m.id}`;
                  return (
                    <tr
                      key={m.id}
                      role="link"
                      tabIndex={0}
                      aria-label={`${m.name || m.email} detayını aç`}
                      onClick={(e) => {
                        // Action butonları + iç Link kendi click handler'larıyla
                        // çalışsın; bubbling row-level navigate'i tetiklemesin.
                        if ((e.target as HTMLElement).closest('button, a, input')) return;
                        router.push(memberHref);
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== ' ') return;
                        if ((e.target as HTMLElement).closest('button, a, input')) return;
                        e.preventDefault();
                        router.push(memberHref);
                      }}
                      className={`cursor-pointer hover:bg-[#FAFAFA] transition-all focus-visible:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-inset ${m.isActive ? '' : 'opacity-60'}`}
                    >
                      <td className="px-3 py-4 sm:px-5">
                        <div className="flex items-center gap-3">
                          <div className="bz-avatar" style={{ width: 36, height: 36 }}>
                            {(m.name || m.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/admin/members/${m.id}`}
                              className="text-[13px] font-semibold text-[#0A0A0A] truncate hover:underline block"
                            >
                              {m.name || '—'}
                            </Link>
                            <p className="text-[11px] text-[#737373] truncate">{m.email}</p>
                            <div className="md:hidden flex items-center gap-1.5 flex-wrap mt-1.5">
                              <Badge kind={planMeta.kind}>{planMeta.label}</Badge>
                              <Badge kind={m.isActive ? 'ok' : 'danger'}>
                                {m.isActive ? 'Aktif' : 'Silinmiş'}
                              </Badge>
                              {m.plan === 'trial' && m.trialEndsAt && (
                                <Badge
                                  kind={trialExpired ? 'danger' : trialSoon ? 'warn' : 'ghost'}
                                >
                                  {trialExpired ? 'Süresi doldu' : `${dl}g kaldı`}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-3 py-4 sm:px-5">
                        <Badge kind={planMeta.kind}>
                          <Crown size={10} strokeWidth={2} />
                          {planMeta.label}
                        </Badge>
                      </td>
                      <td className="hidden lg:table-cell px-3 py-4 sm:px-5">
                        {m.plan === 'trial' && m.trialEndsAt ? (
                          <span
                            className="text-xs font-medium flex items-center gap-1.5"
                            style={{
                              color: trialExpired
                                ? '#DC2626'
                                : trialSoon
                                  ? '#D97706'
                                  : '#525252',
                            }}
                          >
                            {trialExpired ? <AlertTriangle size={12} strokeWidth={2} /> : null}
                            {trialExpired
                              ? `Süresi doldu (${Math.abs(dl!)} gün önce)`
                              : `${dl} gün kaldı`}
                          </span>
                        ) : (
                          <span className="text-xs text-[#737373]">—</span>
                        )}
                      </td>
                      <td className="hidden lg:table-cell px-3 py-4 sm:px-5">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-[#0A0A0A]">
                          <Store size={13} strokeWidth={2} />
                          {m._count.restaurants}
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-3 py-4 sm:px-5">
                        <Badge kind={m.isActive ? 'ok' : 'danger'}>
                          {m.isActive ? 'Aktif' : 'Silinmiş'}
                        </Badge>
                      </td>
                      <td className="px-2 py-4 sm:px-5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/admin/members/${m.id}`}
                            className="bz-btn-ghost"
                            style={{ padding: '6px 12px', fontSize: 12 }}
                            title="Detay"
                          >
                            <span className="hidden sm:inline">Detay</span>
                            <ChevronRight size={12} strokeWidth={2} />
                          </Link>
                          <button
                            onClick={() => setBillingMember(m)}
                            className="bz-btn-ghost"
                            style={{ padding: '6px 12px', fontSize: 12 }}
                            title="Faturalandırma"
                          >
                            <CreditCard size={12} strokeWidth={2} />
                            <span className="hidden sm:inline">Fatura</span>
                          </button>
                          <button
                            onClick={() => openEdit(m)}
                            className="bz-btn-ghost"
                            style={{ padding: '6px 12px', fontSize: 12 }}
                          >
                            Düzenle
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && members.length > 0 && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-[12px] text-[#525252] flex-wrap gap-2">
          <span>
            {(meta.page - 1) * meta.perPage + 1}–
            {Math.min(meta.page * meta.perPage, meta.total)} / {meta.total}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={meta.page <= 1}
              className="bz-btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              <ChevronLeft size={12} strokeWidth={2} />
              Önceki
            </button>
            <span className="px-2 text-[12px] text-[#737373]">
              {meta.page} / {meta.totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
              disabled={meta.page >= meta.totalPages}
              className="bz-btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              Sonraki
              <ChevronRight size={12} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingMember && (
        <Modal
          size={440}
          onClose={() => setEditingMember(null)}
          title={
            <div>
              <p className="pulse-eyebrow text-[#737373]">Düzenle</p>
              <h2 className="mt-1 text-[20px] font-medium tracking-[-0.015em] text-[#0A0A0A]">
                İşletme sahibini düzenle
              </h2>
              <p className="mt-1 text-[12px] text-[#525252]">{editingMember.email}</p>
            </div>
          }
        >
          <div className="space-y-6">
            {error && <AlertBanner kind="danger">{error}</AlertBanner>}

            {/* Plan */}
            <div className="space-y-2">
              <label className="pulse-eyebrow text-[#737373]">Plan</label>
              <div className="grid grid-cols-2 gap-2">
                {(['trial', 'monthly', 'yearly', 'free'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setEditPlan(p)}
                    className={`py-3 rounded-xl border pulse-eyebrow transition-all ${
                      editPlan === p
                        ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                        : 'bg-white text-[#525252] border-[#EDEDED] hover:border-[#0A0A0A]'
                    }`}
                  >
                    {PLAN_BADGE[p]?.label.toUpperCase() || p.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Trial End Date */}
            {editPlan === 'trial' && (
              <div className="space-y-2">
                <label className="pulse-eyebrow text-[#737373]">Deneme bitiş tarihi</label>
                <input
                  type="date"
                  value={editTrialEndsAt}
                  onChange={(e) => setEditTrialEndsAt(e.target.value)}
                  className="bz-input w-full"
                />
              </div>
            )}

            {/* Active toggle */}
            <div className="flex items-center justify-between p-4 bg-[#FAFAFA] rounded-2xl border border-[#EDEDED]">
              <div>
                <p className="text-[13px] font-medium text-[#0A0A0A]">Hesap durumu</p>
                <p className="text-[11px] text-[#737373] mt-0.5">
                  {editIsActive
                    ? 'Kullanıcı sisteme girebilir.'
                    : 'Kullanıcı erişimi engellendi.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditIsActive((v) => !v)}
                aria-pressed={editIsActive}
                aria-label={editIsActive ? 'Aktif' : 'Silinmiş'}
                className={`transition-all duration-200 active:scale-95 ${
                  editIsActive
                    ? 'text-[#A8D62E] hover:text-[#0A0A0A]'
                    : 'text-[#737373] hover:text-[#0A0A0A]'
                }`}
              >
                {editIsActive ? (
                  <ToggleRight size={36} strokeWidth={1.5} />
                ) : (
                  <ToggleLeft size={36} strokeWidth={1.5} />
                )}
              </button>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="flex-1 py-3 rounded-full border border-[#EDEDED] text-[13px] font-medium text-[#525252] hover:bg-[#FAFAFA] transition-colors"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 rounded-full bg-[#0A0A0A] text-white text-[13px] font-semibold hover:bg-[#1A1A1A] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={2} />}
                  Kaydet
                </button>
              </div>
              {editingMember.isActive && (
                <button
                  type="button"
                  onClick={handleSoftDelete}
                  disabled={saving}
                  className="w-full py-3 rounded-full border border-[#FECACA] text-[13px] font-semibold text-[#991B1B] hover:bg-[#FEF2F2] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} strokeWidth={2} />
                  Hesabı sil (geri alınabilir)
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Faturalandırma Modal */}
      {billingMember && (
        <MemberBillingModal
          userId={billingMember.id}
          email={billingMember.email}
          name={billingMember.name}
          onClose={() => setBillingMember(null)}
          onSaved={() => {
            setSuccess('Faturalandırma güncellendi.');
            fetchMembers();
          }}
        />
      )}

      {/* Create Modal */}
      {showCreate && (
        <MemberCreateModal
          onClose={() => setShowCreate(false)}
          onCreated={(msg) => {
            setSuccess(msg);
            fetchMembers();
          }}
        />
      )}
    </div>
  );
}
