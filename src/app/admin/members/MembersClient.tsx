'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDebouncedUrlInput, useUrlFilter } from '@/hooks/useUrlFilter';
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
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Store,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';
import {
  AlertBanner,
  APCheckbox,
  Badge,
  type BadgeKind,
  EmptyState,
  Modal,
  PageHeader,
  PanelSelectionBar,
  PulseMenu,
  PulseMenuItem,
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
  // Owner self-scheduled deletion (30-day grace) — cron hard-deletes after.
  scheduledDeletionAt?: string | null;
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
  enterprise: { label: 'Kurumsal', kind: 'info' },
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

interface MembersClientProps {
  initialMembers?: Member[];
  initialMeta?: Meta;
}

export default function MembersClient({ initialMembers, initialMeta }: MembersClientProps) {
  // §40.10 server-hydration — initialMembers undefined ise client'ta fetch yapılır,
  // doluysa çift skeleton flash önlenir (loading.tsx → mount → data hazır).
  const [members, setMembers] = useState<Member[]>(initialMembers ?? []);
  const [meta, setMeta] = useState<Meta>(
    initialMeta ?? { total: 0, page: 1, perPage: 25, totalPages: 1 },
  );
  const [loading, setLoading] = useState(initialMembers === undefined);
  // Track SSR snapshot consumption — first user-driven filter change still
  // triggers a fetch (URL is source of truth via useUrlFilter).
  const initialQueryRef = useRef<string | null>(null);

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
  // §38.238 — one setMany, not two set() calls (two writes in one tick
  // clobber each other). The hook keeps the field's own value, writes the
  // URL debounced and only copies URL changes it did not make back into the
  // field, so a trailing space mid-typing is not stripped.
  const search = useDebouncedUrlInput(debouncedSearch, (v) =>
    filters.setMany({ search: v, page: 1 }),
  );
  const searchInput = search.input;
  const planFilter = filters.values.plan;
  const statusFilter = filters.values.status;
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

  // Stage A — hard delete (KVKK right-to-be-forgotten) two-step UX state.
  // First step (askConfirm cascade warning) sets `hardDeleteOpen=true`; the
  // typing-confirm modal renders + holds the email input. doHardDelete()
  // verifies the typed string matches editingMember.email before POSTing.
  const [hardDeleteOpen, setHardDeleteOpen] = useState(false);
  const [hardDeleteInput, setHardDeleteInput] = useState('');
  const [hardDeleteError, setHardDeleteError] = useState<string | null>(null);
  const [hardDeleting, setHardDeleting] = useState(false);
  const HARD_DELETE_GRACE_DAYS = 7;

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
    // §40.10 — skip the first fetch when SSR hydrated data, but only if the
    // queryString matches what the server prefetched (default filters). Once
    // any filter changes the URL, queryString diverges → trigger fresh fetch.
    if (initialQueryRef.current === null && initialMembers !== undefined) {
      initialQueryRef.current = queryString;
      return;
    }
    fetchMembers();
  }, [fetchMembers, queryString, initialMembers]);

  const filtersActive = debouncedSearch || planFilter || statusFilter !== 'active' || attention;
  const clearFilters = () => {
    // §38.238 — chained set() calls clobber each other (see the debounce
    // effect above); previously only the last one survived, so "clear
    // filters" left every filter but `page` in place.
    search.replaceInput('');
    filters.setMany({ search: '', plan: '', status: 'active', attention: '', page: 1 });
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

  // Stage A — KVKK right-to-be-forgotten hard delete. Two-step UX:
  //   1. First confirm shows the cascade warning + "Kalıcı sil" CTA.
  //   2. Custom typing-confirm modal requires admin to type the e-mail address
  //      before the DELETE request is sent (lifted irreversibly-destructive
  //      action behind a deliberate friction layer).
  const handleHardDelete = () => {
    if (!editingMember || editingMember.isActive) return;
    const memberLabel = editingMember.name || editingMember.email;
    askConfirm({
      title: `"${memberLabel}" kalıcı olarak silinsin mi?`,
      body:
        'Tüm restoran kayıtları, yorumlar, menüler, QR analitiği ve oturumlar GERİ ALINAMAYACAK biçimde silinir. Faturalandırma kayıtları KVKK m.7 gereği saklanır ama kullanıcı bağlantısı kopartılır. Audit log girdileri de anonimleştirilir.',
      confirmLabel: 'Devam et',
      cancelLabel: 'Vazgeç',
      variant: 'danger',
      onConfirm: () => {
        setHardDeleteInput('');
        setHardDeleteError(null);
        setHardDeleteOpen(true);
      },
    });
  };

  const doHardDelete = async () => {
    if (!editingMember) return;
    if (hardDeleteInput.trim().toLowerCase() !== editingMember.email.toLowerCase()) {
      setHardDeleteError('Eşleşmedi — kullanıcının e-postasını birebir yazın.');
      return;
    }
    setHardDeleting(true);
    setHardDeleteError(null);
    try {
      const res = await fetch(`/api/admin/members/${editingMember.id}/hard-delete`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setHardDeleteOpen(false);
        setEditingMember(null);
        setSuccess('Kullanıcı kalıcı olarak silindi.');
        fetchMembers();
      } else {
        const data = await res.json().catch(() => null);
        if (data?.error === 'grace_period_active') {
          setHardDeleteError(
            data?.message ||
              `${data?.graceDays || 7}-gün bekleme süresi tamamlanmadı (${data?.elapsedDays ?? 0} gün geçti).`,
          );
        } else if (data?.error === 'must_deactivate_first') {
          setHardDeleteError('Kullanıcı önce pasifleştirilmelidir.');
        } else if (data?.error === 'rate_limited') {
          setHardDeleteError('Çok fazla istek. Bir dakika sonra tekrar deneyin.');
        } else {
          setHardDeleteError(data?.message || data?.error || 'Kalıcı silme başarısız.');
        }
      }
    } catch {
      setHardDeleteError('Bağlantı hatası.');
    } finally {
      setHardDeleting(false);
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
    <div className="mx-auto max-w-[1440px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow="İŞLETME SAHİPLERİ"
        title="İşletme sahipleri"
        description="Buaze'ye kayıtlı işletme sahibi hesaplarının plan, deneme süresi, erişim durumu ve bağlı işletme sayısını yönet."
        actions={
          <div className="flex items-center gap-2">
            {/* §49 — secondary actions in one menu; one primary button. */}
            <PulseMenu
              trigger={
                <button type="button" className="bz-btn-ghost" aria-label="Diğer işlemler">
                  <MoreHorizontal size={14} strokeWidth={2} />
                  <span className="hidden sm:inline">Diğer</span>
                </button>
              }
              className="min-w-[220px]"
            >
              <PulseMenuItem icon={<RefreshCw size={13} />} onSelect={fetchMembers} disabled={loading}>
                Listeyi yenile
              </PulseMenuItem>
              <PulseMenuItem icon={<Download size={13} />} onSelect={handleExport}>
                CSV indir
              </PulseMenuItem>
              {/* Stage A5 §38.97 — segment-based bulk mail (the modal picks the segment). */}
              <PulseMenuItem
                icon={<Mail size={13} />}
                onSelect={() => {
                  setMailSegment(selectedIds.size > 0 ? 'custom' : 'all');
                  setShowMailModal(true);
                }}
              >
                Toplu mail gönder
              </PulseMenuItem>
            </PulseMenu>
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
            onChange={(e) => search.setInput(e.target.value)}
            placeholder="İşletme sahibi ara (email veya isim)…"
            aria-label="İşletme sahibi ara"
            className="bz-input w-full pl-11"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <select
            value={planFilter}
            onChange={(e) => {
              // §38.238 — setMany: two set() calls in one tick clobber.
              filters.setMany({ plan: e.target.value, page: 1 });
            }}
            className="bz-input w-full sm:w-44"
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
              // §38.238 — setMany: two set() calls in one tick clobber.
              filters.setMany({
                status: e.target.value as 'active' | 'passive' | 'all',
                page: 1,
              });
            }}
            className="bz-input w-full sm:w-52"
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
      {loading ? null : members.length === 0 ? (
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
                <tr className="border-b border-pn-line text-[13px] font-medium text-[#737373]">
                  <th className="px-3 py-3 sm:pl-5 sm:pr-2 w-10">
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
                  <th className="px-3 py-3 sm:px-5">İşletme sahibi</th>
                  <th className="hidden md:table-cell px-3 py-3 sm:px-5">Plan</th>
                  <th className="hidden lg:table-cell px-3 py-3 sm:px-5">Deneme / bitiş</th>
                  <th className="hidden lg:table-cell px-3 py-3 sm:px-5">İşletmeler</th>
                  <th className="hidden md:table-cell px-3 py-3 sm:px-5">Durum</th>
                  <th className="px-3 py-3 sm:px-5 text-right"><span className="sr-only">İşlemler</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pn-line">
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
                      className={`cursor-pointer hover:bg-pn-canvas transition-all focus-visible:bg-pn-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-inset ${m.isActive ? '' : 'opacity-60'} ${isSelected ? 'bg-pn-accent-soft/40' : ''}`}
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
                          className="h-3.5 w-3.5 accent-pn-ink cursor-pointer"
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
                              className="text-[13px] font-medium text-pn-ink truncate hover:underline block"
                            >
                              {m.name || '—'}
                            </Link>
                            <p className="text-[12px] text-[#737373] truncate">{m.email}</p>
                            <div className="md:hidden flex items-center gap-1.5 flex-wrap mt-1.5">
                              <Badge kind={planMeta.kind}>{planMeta.label}</Badge>
                              <Badge kind={m.isActive ? 'ok' : 'danger'}>
                                {m.isActive ? 'Aktif' : 'Silinmiş'}
                              </Badge>
                              {m._count.restaurants > 0 && (
                                <Badge kind="ghost" dot={false}>{m._count.restaurants} işletme</Badge>
                              )}
                              {m.scheduledDeletionAt && (
                                <Badge kind="danger">Silinme planlandı</Badge>
                              )}
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
                        {m._count.restaurants > 0 ? (
                          <Link
                            href={`/admin/restaurants?owner=${encodeURIComponent(m.id)}&status=all`}
                            className="inline-flex items-center gap-1.5 rounded-full px-1.5 py-1 text-xs font-medium text-pn-ink hover:bg-pn-canvas"
                            title="Bu sahibin işletmelerini göster"
                          >
                            <Store size={13} strokeWidth={2} />
                            {m._count.restaurants}
                            {m._count.restaurants > 1 && <Badge kind="dark" dot={false} className="!h-[18px] !px-1.5 !text-[12px]">Zincir</Badge>}
                          </Link>
                        ) : (
                          <span className="text-xs text-[#A3A3A3]">0</span>
                        )}
                      </td>
                      <td className="hidden md:table-cell px-3 py-4 sm:px-5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge kind={m.isActive ? 'ok' : 'danger'}>
                            {m.isActive ? 'Aktif' : 'Silinmiş'}
                          </Badge>
                          {m.scheduledDeletionAt && <Badge kind="danger">Silinme planlandı</Badge>}
                        </div>
                      </td>
                      <td className="px-2 py-4 sm:px-5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEdit(m)}
                            className="bz-btn-ghost bz-btn-sm hidden sm:inline-flex"
                          >
                            Düzenle
                          </button>
                          <PulseMenu
                            trigger={
                              <button type="button" className="bz-btn-icon" aria-label={`${m.name || m.email} işlemleri`}>
                                <MoreHorizontal size={15} strokeWidth={2} />
                              </button>
                            }
                            className="min-w-[220px]"
                          >
                            <PulseMenuItem icon={<ChevronRight size={13} />} onSelect={() => router.push(`/admin/members/${m.id}`)}>
                              Detay
                            </PulseMenuItem>
                            <PulseMenuItem icon={<Pencil size={13} />} onSelect={() => openEdit(m)}>
                              Düzenle
                            </PulseMenuItem>
                            <PulseMenuItem icon={<CreditCard size={13} />} onSelect={() => setBillingMember(m)}>
                              Faturalandırma
                            </PulseMenuItem>
                            {m._count.restaurants > 0 && (
                              <PulseMenuItem
                                icon={<Store size={13} />}
                                onSelect={() => router.push(`/admin/restaurants?owner=${encodeURIComponent(m.id)}&status=all`)}
                              >
                                İşletmelerini gör ({m._count.restaurants})
                              </PulseMenuItem>
                            )}
                          </PulseMenu>
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
              <p className="text-[13px] font-medium text-[#737373]">Düzenle</p>
              <h2 className="mt-1 text-[20px] font-medium tracking-[-0.015em] text-pn-ink">
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
              <label className="text-[13px] font-medium text-[#737373]">Plan</label>
              <div className="grid grid-cols-2 gap-2">
                {(['trial', 'monthly', 'yearly', 'free'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setEditPlan(p)}
                    className={`py-3 rounded-[20px] border text-[13px] font-medium transition-all ${
                      editPlan === p
                        ? 'bg-pn-ink text-white border-pn-ink'
                        : 'bg-white text-[#525252] border-pn-line hover:border-pn-ink'
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
                <label className="text-[13px] font-medium text-[#737373]">Deneme bitiş tarihi</label>
                <input
                  type="date"
                  value={editTrialEndsAt}
                  onChange={(e) => setEditTrialEndsAt(e.target.value)}
                  className="bz-input w-full"
                />
              </div>
            )}

            {/* Active toggle */}
            <div className="flex items-center justify-between p-4 bg-pn-canvas rounded-[24px] border border-pn-line">
              <div>
                <p className="text-[13px] font-medium text-pn-ink">Hesap durumu</p>
                <p className="text-[12px] text-[#737373] mt-0.5">
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
                    ? 'text-pn-accent-ink hover:text-pn-ink'
                    : 'text-[#737373] hover:text-pn-ink'
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
              {!editingMember.isActive && (() => {
                // Pasif kullanıcı — kalıcı silme butonu. Mevcut soft-delete
                // tarihinden 7 gün geçmediyse buton disabled + countdown.
                const deactivatedTs = editingMember.deactivatedAt
                  ? new Date(editingMember.deactivatedAt).getTime()
                  : Date.now();
                const elapsedDays = Math.floor(
                  (Date.now() - deactivatedTs) / (1000 * 60 * 60 * 24),
                );
                const eligible = elapsedDays >= HARD_DELETE_GRACE_DAYS;
                const remaining = Math.max(0, HARD_DELETE_GRACE_DAYS - elapsedDays);
                return (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleHardDelete}
                      disabled={!eligible || saving || hardDeleting}
                      className="bz-btn-danger w-full disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                        eligible
                          ? 'Kullanıcı ve tüm verileri kalıcı olarak silinir (geri alınamaz)'
                          : `${remaining} gün sonra kalıcı silinebilir`
                      }
                    >
                      <Trash2 size={14} strokeWidth={2} />
                      Kalıcı sil (geri alınamaz)
                    </button>
                    {!eligible && (
                      <p className="text-[12px] text-[#737373]">
                        Pasifleştirme üzerinden {elapsedDays} gün geçti. Kalıcı silme {HARD_DELETE_GRACE_DAYS} gün sonra ({remaining} gün kaldı) açılır — KVKK gözden geçirme süresi.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </Modal>
      )}

      {/* Stage A — typing-confirm modal for irreversible hard-delete. Lifts
          the action behind a deliberate friction layer: admin must type the
          exact e-mail address before the DELETE call is fired. */}
      {hardDeleteOpen && editingMember && (
        <Modal
          size={520}
          onClose={() => {
            if (!hardDeleting) {
              setHardDeleteOpen(false);
              setHardDeleteInput('');
              setHardDeleteError(null);
            }
          }}
          title="Kalıcı silme onayı"
        >
          <div className="space-y-4">
            <AlertBanner kind="danger">
              Bu işlem GERİ ALINAMAZ. Kullanıcı ve tüm restoran verileri (yorumlar, menüler, QR kayıtları, analitikler, oturumlar) kalıcı olarak silinir.
            </AlertBanner>
            <p className="text-sm text-[#525252]">
              Onaylamak için kullanıcının e-postasını birebir yazın:
            </p>
            <p className="rounded-[14px] bg-pn-canvas border border-pn-line px-3 py-2 text-sm font-mono text-pn-ink">
              {editingMember.email}
            </p>
            <input
              type="email"
              value={hardDeleteInput}
              onChange={(e) => {
                setHardDeleteInput(e.target.value);
                if (hardDeleteError) setHardDeleteError(null);
              }}
              placeholder="kullanici@ornek.com"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              inputMode="email"
              className="bz-input w-full"
              disabled={hardDeleting}
            />
            {hardDeleteError && (
              <AlertBanner kind="danger">{hardDeleteError}</AlertBanner>
            )}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setHardDeleteOpen(false);
                  setHardDeleteInput('');
                  setHardDeleteError(null);
                }}
                disabled={hardDeleting}
                className="bz-btn-ghost flex-1"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={doHardDelete}
                disabled={
                  hardDeleting ||
                  hardDeleteInput.trim().toLowerCase() !==
                    editingMember.email.toLowerCase()
                }
                className="bz-btn-danger flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {hardDeleting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={14} strokeWidth={2} />
                )}
                Kalıcı sil
              </button>
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
        <PanelSelectionBar
          count={selectedIds.size}
          label="SAHİP SEÇİLDİ"
          ariaLabel="Toplu mail araç çubuğu"
          clearLabel="Seçimi temizle"
          onClear={() => setSelectedIds(new Set())}
          actions={[
            {
              key: 'mail',
              label: 'Toplu mail gönder',
              icon: <Mail size={13} strokeWidth={2.2} />,
              onClick: () => {
                setMailSegment('custom');
                setShowMailModal(true);
              },
              variant: 'primary',
            },
          ]}
        />
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
              <p className="text-[13px] font-medium text-[#737373]">Toplu mail</p>
              <h2 className="mt-1 text-[20px] font-medium tracking-[-0.015em] text-pn-ink">
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
              <label className="text-[13px] font-medium text-[#737373]">Hedef segmenti</label>
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
                      className={`flex items-start gap-3 rounded-[20px] border px-3 py-2.5 text-left transition-colors ${
                        mailSegment === s.key
                          ? 'border-pn-ink bg-pn-canvas'
                          : 'border-pn-line hover:border-[#A3A3A3]'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-pn-ink">{s.label}</div>
                        <div className="mt-0.5 text-[12px] text-[#737373]">{s.hint}</div>
                      </div>
                      {s.key === 'custom' && selectedIds.size > 0 && (
                        <Badge kind="lime">{selectedIds.size}</Badge>
                      )}
                    </button>
                  );
                })}
              </div>
              {mailSegment !== 'custom' && selectedIds.size > 0 && (
                <p className="text-[12px] text-[#737373] mt-1">
                  💡 Manuel seçimin (<strong>{selectedIds.size}</strong> kişi) preset filter ile kesişeceği için kapsam daralabilir. Sadece preset için seçimi temizle.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-medium text-[#737373]">Konu</label>
              <input
                type="text"
                value={mailSubject}
                onChange={(e) => setMailSubject(e.target.value)}
                maxLength={200}
                placeholder="Buaze'den önemli bir bilgi..."
                className="bz-input w-full"
                disabled={mailSending}
              />
              <p className="text-[12px] text-[#A3A3A3] tabular-nums text-right">{mailSubject.length}/200</p>
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-medium text-[#737373]">Mesaj</label>
              <textarea
                value={mailBody}
                onChange={(e) => setMailBody(e.target.value)}
                maxLength={8000}
                rows={8}
                placeholder="Merhaba,&#10;&#10;Buaze ekibinden..."
                className="bz-input w-full resize-y"
                disabled={mailSending}
              />
              <p className="text-[12px] text-[#A3A3A3] tabular-nums text-right">{mailBody.length}/8000</p>
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-medium text-[#737373]">Şablon dili</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMailLocale('tr')}
                  aria-pressed={mailLocale === 'tr'}
                  className={`py-2 rounded-[20px] border text-[13px] font-medium transition-colors ${
                    mailLocale === 'tr'
                      ? 'bg-pn-ink text-white border-pn-ink'
                      : 'bg-white text-[#525252] border-pn-line hover:border-pn-ink'
                  }`}
                >
                  TR
                </button>
                <button
                  type="button"
                  onClick={() => setMailLocale('en')}
                  aria-pressed={mailLocale === 'en'}
                  className={`py-2 rounded-[20px] border text-[13px] font-medium transition-colors ${
                    mailLocale === 'en'
                      ? 'bg-pn-ink text-white border-pn-ink'
                      : 'bg-white text-[#525252] border-pn-line hover:border-pn-ink'
                  }`}
                >
                  EN
                </button>
              </div>
              <p className="text-[12px] text-[#A3A3A3]">
                Owner&apos;ın User.locale tercihi varsa o öncelikli; bu sadece template chrome (greeting + CTA).
              </p>
            </div>

            <AlertBanner kind="info">
              <span>
                <strong>Resend rate limit:</strong> 600ms throttle/mail (free tier 2/sec). 100 mail ≈ 60sn.
                Tek run&apos;da max 500 alıcı. Audit log&apos;a tek satır kayıt + per-recipient send result.
              </span>
            </AlertBanner>

            <div className="flex flex-col-reverse justify-end gap-2 border-t border-pn-line pt-4 sm:flex-row">
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

      {/* Bulk mail success notice (5sn auto-dismiss).
          §38.171 Stage 91 — mobile bottom nav clearance CSS var ile. */}
      {mailNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-[calc(var(--dash-bottom-nav-h)+12px)] left-1/2 -translate-x-1/2 z-50 rounded-full bg-pn-ink text-white px-4 py-2 text-[12px] font-medium shadow-lg lg:bottom-20"
        >
          {mailNotice}
        </div>
      )}
    </div>
  );
}
