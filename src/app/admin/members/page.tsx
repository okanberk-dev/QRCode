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
  Mail,
  Plus,
  RefreshCw,
  Search,
  Send,
  Store,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from 'lucide-react';
import {
  AlertBanner,
  APCheckbox,
  Badge,
  type BadgeKind,
  EmptyState,
  Modal,
  PageHeader,
  TableSkeleton,
  useConfirmDialog,
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

// Stage A5 §38.97 — owner segment presets for bulk mail (lib/admin-owner-segments.ts ile parite).
type SegmentPreset = 'all' | 'trial_expiring_3d' | 'inactive_14d' | 'high_volume' | 'custom';
const SEGMENT_OPTIONS: Array<{ key: SegmentPreset; label: string; hint: string }> = [
  { key: 'custom', label: 'Özel seçim', hint: 'Tablodan seçtiklerin' },
  { key: 'all', label: 'Tüm aktif sahipler', hint: 'isActive=true tüm hesaplar' },
  { key: 'trial_expiring_3d', label: 'Trial 3g kalan', hint: 'Conversion fırsatı' },
  { key: 'inactive_14d', label: 'Pasif (14g+)', hint: 'updatedAt 14+ gün önce' },
  { key: 'high_volume', label: 'Yüksek hacim (>50 yorum)', hint: 'Engagement > tipik' },
];

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, perPage: 25, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // filters — PR4 URL synced (Linear/Stripe pattern, useUrlFilter §28)
  // attention: deeplink from /admin/dashboard "Needs attention" widget
  // (CLAUDE.md §11.36). When set, backend forces matching subset and the
  // ATTENTION_LABELS notice surfaces an active filter pill.
  const filters = useUrlFilter({
    search: '',
    plan: '',
    status: 'active' as 'active' | 'passive' | 'all',
    attention: '' as '' | 'trial_expiring' | 'trial_expired' | 'stale',
    page: 1,
  });
  const debouncedSearch = filters.values.search;
  const [searchInput, setSearchInput] = useState(debouncedSearch);
  const setDebouncedSearch = (v: string) => filters.set('search', v);
  const planFilter = filters.values.plan;
  const setPlanFilter = (v: string) => filters.set('plan', v);
  const statusFilter = filters.values.status;
  const setStatusFilter = (v: 'active' | 'passive' | 'all') => filters.set('status', v);
  const attention = filters.values.attention;
  const clearAttention = () => filters.set('attention', '');
  const page = filters.values.page;
  const setPage = (v: number) => filters.set('page', v);

  // edit + billing + create modals
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Stage A5 §38.97 — bulk mail multi-select + compose modal state.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMailModal, setShowMailModal] = useState(false);
  const [mailSegment, setMailSegment] = useState<SegmentPreset>('custom');
  const [mailSubject, setMailSubject] = useState('');
  const [mailBody, setMailBody] = useState('');
  const [mailLocale, setMailLocale] = useState<'tr' | 'en'>('tr');
  const [mailSending, setMailSending] = useState(false);
  const [mailNotice, setMailNotice] = useState<string | null>(null);

  const [editPlan, setEditPlan] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  // §38.76 — useConfirmDialog primitive (CLAUDE.md §11.18 paterni). Native
  // window.confirm() yerine accessible Modal-tabanlı confirmation. Diğer
  // admin destructive aksiyonları (restaurants delete, blog delete) zaten bu
  // primitive'i kullanıyor; members soft-delete tutarsızlık intact'tı.
  const [confirmDialog, askConfirm] = useConfirmDialog();
  const [editTrialEndsAt, setEditTrialEndsAt] = useState('');
  const [billingMember, setBillingMember] = useState<Member | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // URL'den gelen filter (browser back / deeplink) input'a yansımalı; aksi
  // halde mount'taki debouncedSearch snapshot'ı korunur ve liste filtreli
  // ama input boş görünür.
  useEffect(() => {
    setSearchInput(debouncedSearch);
  }, [debouncedSearch]);

  // Debounce search input by 300ms — matches admin/customers pattern.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
    // setDebouncedSearch + setPage are useUrlFilter wrapper proxies — new
    // reference each render (CLAUDE.md §36). Adding to deps would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const queryString = useMemo(() => {
    const qp = new URLSearchParams();
    if (debouncedSearch) qp.set('search', debouncedSearch);
    if (planFilter) qp.set('plan', planFilter);
    if (attention) qp.set('attention', attention);
    qp.set('status', statusFilter);
    qp.set('page', String(page));
    qp.set('perPage', '25');
    return qp.toString();
  }, [debouncedSearch, planFilter, statusFilter, attention, page]);

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

  const filtersActive = debouncedSearch || planFilter || statusFilter !== 'active' || attention;
  const clearFilters = () => {
    setSearchInput('');
    setPlanFilter('');
    setStatusFilter('active');
    clearAttention();
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

  const handleSoftDelete = () => {
    if (!editingMember) return;
    // §38.76 — useConfirmDialog (CLAUDE.md §11.18). Native confirm() yerine
    // accessible Modal-tabanlı; AlertTriangle icon + danger style + body text
    // (kullanıcı silmenin yan etkilerini net görür).
    const memberLabel = editingMember.name || editingMember.email;
    askConfirm({
      title: `"${memberLabel}" silinsin mi?`,
      body:
        "Kullanıcı listede gizlenecek ama veriler (restoranlar, faturalar, audit log) DB'de korunacak. \"Silinmiş (arşiv)\" filtresinden bulup geri getirebilirsin.",
      confirmLabel: 'Sil (yumuşak)',
      cancelLabel: 'Vazgeç',
      variant: 'danger',
      onConfirm: () => doSoftDelete(),
    });
  };

  const doSoftDelete = async () => {
    if (!editingMember) return;
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

  // Stage A5 §38.97 — clear selection on filter change (CLAUDE.md §11.21
  // bulk selection stale fix paterni reuse).
  useEffect(() => {
    setSelectedIds(new Set());
  }, [debouncedSearch, planFilter, statusFilter, attention, page]);

  // Auto-dismiss bulk mail notice (5sn — CLAUDE.md §38.15 dwell timing).
  useEffect(() => {
    if (!mailNotice) return;
    const t = setTimeout(() => setMailNotice(null), 5000);
    return () => clearTimeout(t);
  }, [mailNotice]);

  const sendBulkMail = async () => {
    if (mailSending) return;
    if (!mailSubject.trim() || !mailBody.trim()) {
      setError('Konu ve mesaj boş bırakılamaz.');
      return;
    }
    if (mailSegment === 'custom' && selectedIds.size === 0) {
      setError('Özel seçim için en az 1 işletme sahibi seçilmeli.');
      return;
    }
    setMailSending(true);
    setError('');
    try {
      const res = await fetch('/api/admin/members/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_email',
          segment: mailSegment,
          ids: selectedIds.size > 0 ? Array.from(selectedIds) : undefined,
          payload: {
            subject: mailSubject.trim(),
            body: mailBody.trim(),
            locale: mailLocale,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMailNotice(
          `${data.sentCount}/${data.totalCount} mail gönderildi${data.failedCount > 0 ? ` (${data.failedCount} başarısız)` : ''}.`,
        );
        setShowMailModal(false);
        setMailSubject('');
        setMailBody('');
        setSelectedIds(new Set());
      } else {
        setError(data.error || data.message || 'Toplu mail başarısız.');
      }
    } catch (e) {
      console.error(e);
      setError('Bağlantı hatası — mail gönderilemedi.');
    } finally {
      setMailSending(false);
    }
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
            {/* Stage A5 §38.97 — segment-bazlı toplu mail (selection bağımsız;
                modal içinde admin segment seçer) */}
            <button
              onClick={() => {
                setMailSegment(selectedIds.size > 0 ? 'custom' : 'all');
                setShowMailModal(true);
              }}
              className="bz-btn-ghost"
              title="Tüm sahiplere veya segmente toplu mail gönder"
            >
              <Mail size={14} strokeWidth={2} />
              Toplu mail
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

      {attention && (
        <AlertBanner kind="info" onDismiss={clearAttention}>
          {attention === 'trial_expiring' && 'Yalnızca 7 gün içinde denemesi bitecek hesaplar gösteriliyor.'}
          {attention === 'trial_expired' && 'Yalnızca deneme süresi dolmuş hesaplar gösteriliyor.'}
          {attention === 'stale' && '14 günden uzun süredir giriş kaydı olmayan hesaplar gösteriliyor.'}
        </AlertBanner>
      )}

      {/* Filter row */}
      <div className="bz-card flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#737373]" />
          {/* §38.77 — Mobile input UX (CLAUDE.md §38.74 paterni reuse).
              inputMode="search" Safari klavye'de magnifier icon, autoCorrect
              off (email/isim arama için autocorrect karışıklık yaratır). */}
          <input
            type="text"
            inputMode="search"
            autoCorrect="off"
            spellCheck={false}
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
              className="bz-btn bz-btn-sm"
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
        <div className="bz-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse sm:min-w-[600px]">
              <thead>
                <tr className="bg-[#0A0A0A] pulse-eyebrow text-white/60">
                  <th className="px-3 py-4 sm:pl-5 sm:pr-2 w-10">
                    {/* Stage A5 §38.97 — bulk select-all (with indeterminate).
                        Stage 47 §38.128 — APCheckbox primitive entegre
                        (manuel ref-based pattern → primitive). Pulse §11
                        lime fill + Indeterminate Minus. */}
                    {(() => {
                      const allSelected =
                        members.length > 0 && members.every((m) => selectedIds.has(m.id));
                      const someSelected =
                        !allSelected && members.some((m) => selectedIds.has(m.id));
                      return (
                        <APCheckbox
                          size="sm"
                          checked={allSelected}
                          indeterminate={someSelected}
                          onChange={(next) => {
                            if (next) {
                              setSelectedIds(new Set(members.map((m) => m.id)));
                            } else {
                              setSelectedIds(new Set());
                            }
                          }}
                          ariaLabel="Tümünü seç"
                        />
                      );
                    })()}
                  </th>
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
                  const isSelected = selectedIds.has(m.id);
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
                      className={`cursor-pointer hover:bg-[#FAFAFA] transition-all focus-visible:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-inset ${m.isActive ? '' : 'opacity-60'} ${isSelected ? 'bg-[#EAF9B8]/40' : ''}`}
                    >
                      <td className="px-3 py-4 sm:pl-5 sm:pr-2 w-10">
                        <input
                          type="checkbox"
                          aria-label={`${m.name || m.email} seç`}
                          checked={isSelected}
                          onChange={(e) => {
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(m.id);
                              else next.delete(m.id);
                              return next;
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-3.5 w-3.5 accent-[#0A0A0A] cursor-pointer"
                        />
                      </td>
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
                            className="bz-btn-ghost min-h-[44px] sm:min-h-[36px] !px-3 !py-1.5 text-[12px]"
                            title="Detay"
                          >
                            <span className="hidden sm:inline">Detay</span>
                            <ChevronRight size={12} strokeWidth={2} />
                          </Link>
                          <button
                            onClick={() => setBillingMember(m)}
                            className="bz-btn-ghost min-h-[44px] sm:min-h-[36px] !px-3 !py-1.5 text-[12px]"
                            title="Faturalandırma"
                          >
                            <CreditCard size={12} strokeWidth={2} />
                            <span className="hidden sm:inline">Fatura</span>
                          </button>
                          <button
                            onClick={() => openEdit(m)}
                            className="bz-btn-ghost min-h-[44px] sm:min-h-[36px] !px-3 !py-1.5 text-[12px]"
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
          {/* §38.75 — Pagination button mobile 44px touch target (Stage 4
              §38.74 paterni reuse). sm:+ 36px Pulse compact density korunur. */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={meta.page <= 1}
              className="bz-btn-ghost min-h-[44px] sm:min-h-[36px] text-[12px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} strokeWidth={2} />
              Önceki
            </button>
            <span className="px-2 text-[12px] text-[#737373]">
              {meta.page} / {meta.totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
              disabled={meta.page >= meta.totalPages}
              className="bz-btn-ghost min-h-[44px] sm:min-h-[36px] text-[12px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sonraki
              <ChevronRight size={14} strokeWidth={2} />
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
                  className="bz-btn-ghost flex-1"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="bz-btn-primary flex-1 disabled:opacity-50"
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
                  className="bz-btn-danger w-full disabled:opacity-50"
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
      {/* §38.76 — useConfirmDialog Modal mount (CLAUDE.md §11.18). */}
      {confirmDialog}

      {/* Stage A5 §38.97 — bulk mail floating toolbar (Stripe pattern §11.19) */}
      {selectedIds.size > 0 && !showMailModal && (
        <div
          role="region"
          aria-label="Toplu mail araç çubuğu"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-wrap items-center gap-2 rounded-2xl border border-[#0A0A0A] bg-white px-3 py-2 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.4)] inset-x-4 sm:inset-x-auto sm:left-1/2 sm:max-w-[640px]"
        >
          <span aria-live="polite" className="text-[12px] font-semibold text-[#0A0A0A] px-2">
            {selectedIds.size} sahip seçildi
          </span>
          <button
            type="button"
            onClick={() => {
              setMailSegment('custom');
              setShowMailModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#A8D62E] bg-[#EAF9B8] px-3 py-1 text-[11px] font-medium text-[#0A0A0A] hover:bg-[#C6F24E]/40 transition-colors"
          >
            <Mail size={11} strokeWidth={2.2} />
            Toplu mail gönder
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            aria-label="Seçimi temizle"
            className="ml-1 rounded-md p-1 hover:bg-[#FAFAFA] transition-colors"
          >
            <X size={14} strokeWidth={2.2} />
          </button>
        </div>
      )}

      {/* Stage A5 §38.97 — opening with no selection: segment-bazlı toplu mail */}
      {!selectedIds.size && !showMailModal && (
        <div className="hidden">
          {/* Reserved for future "Send to segment" CTA in PageHeader actions; not visible by default. */}
        </div>
      )}

      {/* Stage A5 §38.97 — bulk mail compose modal */}
      {showMailModal && (
        <Modal
          size={640}
          onClose={() => {
            if (!mailSending) setShowMailModal(false);
          }}
          title={
            <div>
              <p className="pulse-eyebrow text-[#737373]">Toplu mail</p>
              <h2 className="mt-1 text-[20px] font-medium tracking-[-0.015em] text-[#0A0A0A]">
                İşletme sahiplerine mesaj gönder
              </h2>
              <p className="mt-1 text-[12px] text-[#525252]">
                Pulse şablonu (Buaze logo + lime accent) ile sarılır. Her gönderim audit log&apos;a yazılır.
              </p>
            </div>
          }
        >
          <div className="space-y-5">
            {error && <AlertBanner kind="danger">{error}</AlertBanner>}

            <div className="space-y-2">
              <label className="pulse-eyebrow text-[#737373]">Hedef segmenti</label>
              <div className="grid gap-1.5">
                {SEGMENT_OPTIONS.map((s) => {
                  const disabled = s.key === 'custom' && selectedIds.size === 0;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => !disabled && setMailSegment(s.key)}
                      disabled={disabled}
                      aria-pressed={mailSegment === s.key}
                      className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                        mailSegment === s.key
                          ? 'border-[#0A0A0A] bg-[#FAFAFA]'
                          : 'border-[#EDEDED] hover:border-[#A3A3A3]'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-[#0A0A0A]">{s.label}</div>
                        <div className="mt-0.5 text-[11px] text-[#737373]">{s.hint}</div>
                      </div>
                      {s.key === 'custom' && selectedIds.size > 0 && (
                        <Badge kind="lime">{selectedIds.size}</Badge>
                      )}
                    </button>
                  );
                })}
              </div>
              {mailSegment !== 'custom' && selectedIds.size > 0 && (
                <p className="text-[11px] text-[#737373] mt-1">
                  💡 Manuel seçimin (<strong>{selectedIds.size}</strong> kişi) preset filter ile kesişeceği için kapsam daralabilir. Sadece preset için seçimi temizle.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="pulse-eyebrow text-[#737373]">Konu</label>
              <input
                type="text"
                value={mailSubject}
                onChange={(e) => setMailSubject(e.target.value)}
                maxLength={200}
                placeholder="Buaze'den önemli bir bilgi..."
                className="bz-input w-full"
                disabled={mailSending}
              />
              <p className="text-[10px] text-[#A3A3A3] tabular-nums text-right">{mailSubject.length}/200</p>
            </div>

            <div className="space-y-2">
              <label className="pulse-eyebrow text-[#737373]">Mesaj</label>
              <textarea
                value={mailBody}
                onChange={(e) => setMailBody(e.target.value)}
                maxLength={8000}
                rows={8}
                placeholder="Merhaba,&#10;&#10;Buaze ekibinden..."
                className="bz-input w-full resize-y"
                disabled={mailSending}
              />
              <p className="text-[10px] text-[#A3A3A3] tabular-nums text-right">{mailBody.length}/8000</p>
            </div>

            <div className="space-y-2">
              <label className="pulse-eyebrow text-[#737373]">Şablon dili</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMailLocale('tr')}
                  aria-pressed={mailLocale === 'tr'}
                  className={`py-2 rounded-xl border pulse-eyebrow transition-colors ${
                    mailLocale === 'tr'
                      ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                      : 'bg-white text-[#525252] border-[#EDEDED] hover:border-[#0A0A0A]'
                  }`}
                >
                  TR
                </button>
                <button
                  type="button"
                  onClick={() => setMailLocale('en')}
                  aria-pressed={mailLocale === 'en'}
                  className={`py-2 rounded-xl border pulse-eyebrow transition-colors ${
                    mailLocale === 'en'
                      ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                      : 'bg-white text-[#525252] border-[#EDEDED] hover:border-[#0A0A0A]'
                  }`}
                >
                  EN
                </button>
              </div>
              <p className="text-[10px] text-[#A3A3A3]">
                Owner&apos;ın User.locale tercihi varsa o öncelikli; bu sadece template chrome (greeting + CTA).
              </p>
            </div>

            <AlertBanner kind="info">
              <span>
                <strong>Resend rate limit:</strong> 600ms throttle/mail (free tier 2/sec). 100 mail ≈ 60sn.
                Tek run&apos;da max 500 alıcı. Audit log&apos;a tek satır kayıt + per-recipient send result.
              </span>
            </AlertBanner>

            <div className="flex flex-col-reverse justify-end gap-2 border-t border-[#EDEDED] pt-4 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowMailModal(false)}
                className="bz-btn-ghost"
                disabled={mailSending}
              >
                İptal
              </button>
              <button
                type="button"
                onClick={sendBulkMail}
                disabled={mailSending}
                className="bz-btn-primary disabled:opacity-50"
              >
                {mailSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={2.2} />}
                {mailSending ? 'Gönderiliyor…' : 'Gönder'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk mail success notice (5sn auto-dismiss) */}
      {mailNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-full bg-[#0A0A0A] text-white px-4 py-2 text-[12px] font-semibold shadow-lg"
        >
          {mailNotice}
        </div>
      )}
    </div>
  );
}
