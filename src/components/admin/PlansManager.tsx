'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Crown,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { AlertBanner, APSwitch, Badge, Modal } from '@/components/ui';
import type { AdminPlanRow } from '@/lib/subscription-plans';
import { PLAN_MODULES } from '@/lib/plan-modules-catalog';

interface FormState {
  nameTr: string;
  nameEn: string;
  descriptionTr: string;
  descriptionEn: string;
  priceTry: string;
  priceUsd: string;
  /** Yıllık fiyat (TRY) — boş bırakılırsa public sayfa formula fallback
   *  uygular (aylık × 12 × 0.8). Admin override istediğinde elle girer. */
  priceYearlyTry: string;
  priceYearlyUsd: string;
  period: 'month' | 'year' | 'one-time';
  featuresTr: string;
  featuresEn: string;
  buttonTextTr: string;
  buttonTextEn: string;
  buttonHref: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: string;
  discountActive: boolean;
  discountType: 'percent' | 'fixed';
  discountValue: string;
  discountLabelTr: string;
  discountLabelEn: string;
  /** Payment provider (CLAUDE.md §44). 'manual' = admin yönetir;
   *  'paynkolay' = owner kartla öder (TL fiyat gerekir). */
  paymentProvider: 'manual' | 'paynkolay';
  /** Package modules (§5.2) applied to the owner's businesses. */
  moduleKeys: string[];
  modulesManaged: boolean;
  maxBusinesses: string;
}

const EMPTY_FORM: FormState = {
  nameTr: '',
  nameEn: '',
  descriptionTr: '',
  descriptionEn: '',
  // §38.225 Stage 145 — USD-only. priceTry hep '0' (schema field korunur,
  // UI'da girilmez). priceUsd primary required field.
  priceTry: '0',
  priceUsd: '0',
  priceYearlyTry: '',
  priceYearlyUsd: '',
  period: 'month',
  featuresTr: '',
  featuresEn: '',
  buttonTextTr: 'Başla',
  buttonTextEn: 'Start',
  buttonHref: '/auth/register',
  isActive: true,
  isFeatured: false,
  sortOrder: '10',
  discountActive: false,
  discountType: 'percent',
  discountValue: '',
  discountLabelTr: '',
  discountLabelEn: '',
  paymentProvider: 'manual',
  moduleKeys: [],
  modulesManaged: false,
  maxBusinesses: '',
};

function rowToForm(p: AdminPlanRow): FormState {
  return {
    nameTr: p.nameTr,
    nameEn: p.nameEn,
    descriptionTr: p.descriptionTr,
    descriptionEn: p.descriptionEn,
    priceTry: String(p.priceTry),
    priceUsd: p.priceUsd != null ? String(p.priceUsd) : '',
    priceYearlyTry: p.priceYearlyTry != null ? String(p.priceYearlyTry) : '',
    priceYearlyUsd: p.priceYearlyUsd != null ? String(p.priceYearlyUsd) : '',
    period: (p.period === 'year' || p.period === 'one-time' ? p.period : 'month') as FormState['period'],
    featuresTr: p.featuresTr.join('\n'),
    featuresEn: p.featuresEn.join('\n'),
    buttonTextTr: p.buttonTextTr,
    buttonTextEn: p.buttonTextEn,
    buttonHref: p.buttonHref,
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    sortOrder: String(p.sortOrder),
    discountActive: p.discountActive,
    discountType: (p.discountType === 'fixed' ? 'fixed' : 'percent') as FormState['discountType'],
    discountValue: p.discountValue != null ? String(p.discountValue) : '',
    discountLabelTr: p.discountLabelTr || '',
    discountLabelEn: p.discountLabelEn || '',
    // Stage 149 §38.229 — 'iyzico' provider iptal edildi; legacy DB row'larda
    // bu değer kalmış olabilir, defansif olarak 'manual'a düşür.
    paymentProvider: (p.paymentProvider === 'paynkolay' ? 'paynkolay' : 'manual') as FormState['paymentProvider'],
    moduleKeys: p.moduleKeys ?? [],
    modulesManaged: p.modulesManaged === true,
    maxBusinesses: p.maxBusinesses != null ? String(p.maxBusinesses) : '',
  };
}

function formToBody(f: FormState) {
  return {
    nameTr: f.nameTr.trim(),
    nameEn: f.nameEn.trim(),
    descriptionTr: f.descriptionTr.trim(),
    descriptionEn: f.descriptionEn.trim(),
    priceTry: parseInt(f.priceTry, 10) || 0,
    priceUsd: f.priceUsd.trim() === '' ? null : parseInt(f.priceUsd, 10),
    priceYearlyTry: f.priceYearlyTry.trim() === '' ? null : parseInt(f.priceYearlyTry, 10),
    priceYearlyUsd: f.priceYearlyUsd.trim() === '' ? null : parseInt(f.priceYearlyUsd, 10),
    period: f.period,
    featuresTr: f.featuresTr.split('\n').map((s) => s.trim()).filter(Boolean),
    featuresEn: f.featuresEn.split('\n').map((s) => s.trim()).filter(Boolean),
    buttonTextTr: f.buttonTextTr.trim(),
    buttonTextEn: f.buttonTextEn.trim(),
    buttonHref: f.buttonHref.trim(),
    isActive: f.isActive,
    isFeatured: f.isFeatured,
    sortOrder: parseInt(f.sortOrder, 10) || 0,
    discountActive: f.discountActive,
    discountType: f.discountActive ? f.discountType : null,
    discountValue:
      f.discountActive && f.discountValue.trim() !== '' ? parseInt(f.discountValue, 10) : null,
    discountLabelTr: f.discountActive ? f.discountLabelTr.trim() || null : null,
    discountLabelEn: f.discountActive ? f.discountLabelEn.trim() || null : null,
    paymentProvider: f.paymentProvider,
    moduleKeys: f.moduleKeys,
    modulesManaged: f.modulesManaged,
    maxBusinesses: f.maxBusinesses.trim() ? Math.max(1, Math.floor(Number(f.maxBusinesses))) : null,
  };
}

interface PlansManagerProps {
  initialPlans: AdminPlanRow[];
  /** Per-plan user count (planId → count). §38.224 — Each tier card shows
   *  "X işletme bu paketi kullanıyor" badge. Server-side compute in
   *  /admin/plans/page.tsx; live updates not wired (planUsage is a snapshot,
   *  refreshing the page recalculates it). */
  initialUsage?: Record<string, number>;
}

export default function PlansManager({ initialPlans, initialUsage }: PlansManagerProps) {
  const [plans, setPlans] = useState<AdminPlanRow[]>(initialPlans);
  const planUsage = initialUsage ?? {};
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'danger'; message: string } | null>(null);
  const [seeding, setSeeding] = useState(false);
  // Track whether admin has explicitly typed in yearly override fields during
  // the current modal session. If untouched, changing monthly price auto-clears
  // yearly so the public formula fallback (monthly × 12 × 0.8) reapplies —
  // prevents stale overrides from drifting away from monthly. CLAUDE.md §15.2.
  const yearlyTryTouchedRef = useRef(false);
  const yearlyUsdTouchedRef = useRef(false);

  useEffect(() => {
    if (!notice || notice.kind !== 'success') return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const sortedPlans = useMemo(
    () =>
      [...plans].sort(
        (a, b) =>
          a.sortOrder - b.sortOrder || a.createdAt.toString().localeCompare(b.createdAt.toString()),
      ),
    [plans],
  );

  const refreshPlans = async () => {
    try {
      const res = await fetch('/api/admin/plans', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data?.data)) {
        setPlans(
          data.data.map(
            (p: AdminPlanRow & { createdAt: string; updatedAt: string }) => ({
              ...p,
              createdAt: new Date(p.createdAt),
              updatedAt: new Date(p.updatedAt),
            }),
          ),
        );
      }
    } catch {
      /* noop */
    }
  };

  const handleSeedDefaults = async (force = false) => {
    if (
      force &&
      !window.confirm(
        'Başlangıç, Büyüme ve Zincir paketleri önerilen fiyat, işletme sınırı ve modüllerle güncellenecek. Bu paketlerdeki sahiplerin modülleri de yeniden ayarlanır. Devam edilsin mi?',
      )
    ) {
      return;
    }
    setSeeding(true);
    try {
      const res = await fetch('/api/admin/plans/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setNotice({ kind: 'danger', message: data?.error || 'Seed başarısız.' });
        return;
      }
      await refreshPlans();
      setNotice({
        kind: 'success',
        message: data?.skipped
          ? 'Tablo zaten dolu — atlandı.'
          : `Önerilen yapı uygulandı: ${data?.updated ?? 0} paket güncellendi, ${data?.created ?? 0} paket eklendi.`,
      });
    } catch {
      setNotice({ kind: 'danger', message: 'Bağlantı hatası.' });
    } finally {
      setSeeding(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      sortOrder: String((plans[plans.length - 1]?.sortOrder ?? 0) + 10),
    });
    yearlyTryTouchedRef.current = false;
    yearlyUsdTouchedRef.current = false;
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (p: AdminPlanRow) => {
    setEditingId(p.id);
    setForm(rowToForm(p));
    yearlyTryTouchedRef.current = false;
    yearlyUsdTouchedRef.current = false;
    setError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const validateForm = (): string | null => {
    if (!form.nameTr.trim() || !form.nameEn.trim()) return 'TR ve EN paket adı zorunlu.';
    if (!form.descriptionTr.trim() || !form.descriptionEn.trim())
      return 'TR ve EN açıklama zorunlu.';
    // §38.225 Stage 145 — USD-only. priceTry validation kaldırıldı (form
    // hidden; formToBody içinde '0' fallback). priceUsd primary required.
    if (form.priceUsd.trim() === '') return 'USD fiyatı zorunlu.';
    const usd = parseInt(form.priceUsd, 10);
    if (isNaN(usd) || usd < 0) return 'USD fiyatı geçersiz.';
    // PayNKolay settles in TRY only (§44).
    if (form.paymentProvider === 'paynkolay' && !(parseInt(form.priceTry, 10) > 0)) {
      return 'PayNKolay ile ödeme için aylık TL fiyatı girin.';
    }
    if (form.discountActive) {
      const v = parseInt(form.discountValue, 10);
      if (isNaN(v) || v <= 0) return 'İndirim değeri sıfırdan büyük olmalı.';
      if (form.discountType === 'percent' && v > 100) return 'Yüzde indirim 100 ile sınırlı.';
    }
    return null;
  };

  const handleSave = async () => {
    const err = validateForm();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const body = formToBody(form);
      const url = editingId ? `/api/admin/plans/${editingId}` : '/api/admin/plans';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || 'Kaydedilemedi.');
        return;
      }
      await refreshPlans();
      setModalOpen(false);
      setNotice({
        kind: 'success',
        message: editingId ? 'Paket güncellendi.' : 'Paket oluşturuldu.',
      });
    } catch {
      setError('Bağlantı hatası.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setBusyRowId(deleteId);
    try {
      const res = await fetch(`/api/admin/plans/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setNotice({ kind: 'danger', message: data?.error || 'Silinemedi.' });
        return;
      }
      await refreshPlans();
      setNotice({ kind: 'success', message: 'Paket silindi.' });
    } catch {
      setNotice({ kind: 'danger', message: 'Bağlantı hatası.' });
    } finally {
      setBusyRowId(null);
      setDeleteId(null);
    }
  };

  const togglePlanField = async (id: string, payload: Record<string, unknown>) => {
    setBusyRowId(id);
    try {
      const res = await fetch(`/api/admin/plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setNotice({ kind: 'danger', message: data?.error || 'Güncellenemedi.' });
        return;
      }
      await refreshPlans();
    } catch {
      setNotice({ kind: 'danger', message: 'Bağlantı hatası.' });
    } finally {
      setBusyRowId(null);
    }
  };

  /**
   * §38.219 Stage 139 — Inline price field PATCH. Modal'a girmeden tek
   * field güncellenir; success notice'da marketing /pricing'in 30s içinde
   * yansıyacağı bilgisi verilir (admin "değişmedi" hissini önler).
   */
  const savePriceInline = async (id: string, field: string, nextValue: number | null) => {
    setBusyRowId(id);
    try {
      const res = await fetch(`/api/admin/plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: nextValue }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setNotice({
          kind: 'danger',
          message: data?.error || 'Fiyat güncellenemedi. Lütfen tekrar deneyin.',
        });
        return false;
      }
      await refreshPlans();
      setNotice({
        kind: 'success',
        message:
          'Fiyat güncellendi. Marketing /pricing sayfasında 30 saniye içinde yansıyacak.',
      });
      return true;
    } catch {
      setNotice({ kind: 'danger', message: 'Bağlantı hatası.' });
      return false;
    } finally {
      setBusyRowId(null);
    }
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const a = sortedPlans[idx];
    const b = sortedPlans[idx - 1];
    void togglePlanField(a.id, { sortOrder: b.sortOrder });
    void togglePlanField(b.id, { sortOrder: a.sortOrder });
  };
  const moveDown = (idx: number) => {
    if (idx === sortedPlans.length - 1) return;
    const a = sortedPlans[idx];
    const b = sortedPlans[idx + 1];
    void togglePlanField(a.id, { sortOrder: b.sortOrder });
    void togglePlanField(b.id, { sortOrder: a.sortOrder });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="bz-h-tight text-[20px] sm:text-[22px]">Paket yönetimi</h2>
          <p className="text-[13px] text-[#737373]">
            Fiyatlandırma sayfasında görünen paketler. Değişiklikler anında yansır.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {plans.length > 0 && (
            <button
              type="button"
              onClick={() => handleSeedDefaults(true)}
              disabled={seeding}
              className="bz-btn-ghost inline-flex items-center gap-2"
            >
              {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Önerilen yapıyı uygula
            </button>
          )}
          {plans.length === 0 && (
            <button
              type="button"
              onClick={() => handleSeedDefaults(false)}
              disabled={seeding}
              className="bz-btn-ghost inline-flex items-center gap-2"
            >
              {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Varsayılan paketleri yükle
            </button>
          )}
          <button
            type="button"
            onClick={openCreate}
            className="bz-btn-primary inline-flex items-center gap-2"
          >
            <Plus size={15} /> Yeni paket
          </button>
        </div>
      </div>

      {notice && (
        <AlertBanner kind={notice.kind} onDismiss={() => setNotice(null)}>
          {notice.message}
        </AlertBanner>
      )}

      {sortedPlans.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-pn-line bg-pn-canvas p-10 text-center">
          <p className="text-[14px] text-[#525252]">
            Henüz paket yok. <strong>Varsayılan paketleri yükle</strong> butonuyla 3 hazır paketi
            yükle veya <strong>Yeni paket</strong> ile sıfırdan oluştur.
          </p>
        </div>
      ) : (
        /* §38.224 — Tier card grid (marketing /pricing parity).
           Featured tier dark variant (bg-pn-ink + lime accent), normal tier
           white + EDEDED border. InlinePriceCell'lar hero price'ın altında —
           Stage 139 inline edit pattern korunur, modal full-form ile aynı. */
        <div
          className={`grid gap-5 ${
            sortedPlans.length === 1
              ? 'grid-cols-1 max-w-[420px]'
              : sortedPlans.length === 2
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {sortedPlans.map((p, idx) => {
            const isDark = p.isFeatured;
            const userCount = planUsage[p.id] ?? 0;
            const hasDiscount =
              p.discountActive && p.discountValue != null && p.discountValue > 0;
            return (
              <article
                key={p.id}
                className={`relative flex flex-col rounded-[28px] p-6 sm:p-7 ${
                  isDark
                    ? 'bg-pn-ink text-white shadow-[0_20px_60px_rgba(10,10,10,0.18)]'
                    : 'border border-pn-line bg-white'
                } ${!p.isActive ? 'opacity-70' : ''}`}
              >
                {/* "En popüler" badge — top-center (featured) */}
                {isDark && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-[13px] font-medium whitespace-nowrap rounded-full bg-pn-accent px-4 py-1.5 text-pn-ink">
                      <Crown size={10} className="inline mr-1 -mt-0.5" /> EN POPÜLER
                    </span>
                  </div>
                )}

                {/* Status badges row — Pasif / İndirim */}
                {(!p.isActive || hasDiscount) && (
                  <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    {!p.isActive && <Badge kind="off">Pasif</Badge>}
                    {hasDiscount && p.discountValue != null && (
                      <Badge kind="warn">
                        İndirim{' '}
                        {p.discountType === 'percent'
                          ? `${p.discountValue}%`
                          : `-${p.discountValue}`}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Hero: Tier name + Description + User count */}
                <div className={`${isDark ? 'pt-2' : ''} mb-5`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2
                        className={`bz-h-tight text-[22px] ${isDark ? 'text-white' : 'text-pn-ink'}`}
                      >
                        {p.nameTr}
                      </h2>
                      <p
                        className={`text-[12px] mt-0.5 ${isDark ? 'text-white/60' : 'text-[#A3A3A3]'}`}
                      >
                        / {p.nameEn}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`mt-2.5 text-[13px] leading-snug line-clamp-2 ${
                      isDark ? 'text-white/70' : 'text-[#525252]'
                    }`}
                  >
                    {p.descriptionTr || '—'}
                  </p>
                  {/* Per-plan user count badge */}
                  <div className="mt-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${
                        isDark
                          ? 'bg-white/10 text-white'
                          : userCount > 0
                            ? 'bg-pn-accent-soft text-pn-ink'
                            : 'bg-pn-canvas text-[#737373]'
                      }`}
                    >
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${
                          isDark ? 'bg-pn-accent' : userCount > 0 ? 'bg-pn-accent-hover' : 'bg-[#A3A3A3]'
                        }`}
                      />
                      {userCount > 0
                        ? `${userCount} işletme bu paketi kullanıyor`
                        : 'Henüz kullanan yok'}
                    </span>
                  </div>
                </div>

                {/* Price hero — Aylık USD (large) + Yıllık USD (sub).
                    §38.225 Stage 145: USD-only. TRY field'ları schema'da kalır
                    (backwards-compat) ama admin UI'da gösterilmez. */}
                <div
                  className={`mb-5 border-b pb-5 ${isDark ? 'border-white/10' : 'border-pn-line'}`}
                >
                  <div className="flex items-baseline gap-2">
                    <InlinePriceCell
                      planId={p.id}
                      field="priceUsd"
                      value={p.priceUsd}
                      currency="USD"
                      label="Aylık USD fiyat"
                      busy={busyRowId === p.id}
                      onSave={savePriceInline}
                      required
                      variant="hero"
                      dark={isDark}
                    />
                    <span
                      className={`text-[13px] font-medium ${isDark ? 'text-white/60' : 'text-[#737373]'}`}
                    >
                      /ay
                    </span>
                  </div>
                  {/* Yıllık USD row */}
                  <div
                    className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] ${
                      isDark ? 'text-white/60' : 'text-[#525252]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[12px] ${
                          isDark ? 'text-white/40' : 'text-[#A3A3A3]'
                        }`}
                      >
                        Yıllık toplam
                      </span>
                      <InlinePriceCell
                        planId={p.id}
                        field="priceYearlyUsd"
                        value={p.priceYearlyUsd}
                        currency="USD"
                        label="Yıllık USD fiyat (toplam)"
                        busy={busyRowId === p.id}
                        onSave={savePriceInline}
                        dark={isDark}
                      />
                    </div>
                    {p.priceYearlyUsd == null && p.priceUsd != null && p.priceUsd > 0 && (
                      <>
                        <span className={isDark ? 'text-white/20' : 'text-[#D4D4D4]'}>·</span>
                        <span
                          className={`text-[12px] ${
                            isDark ? 'text-white/40' : 'text-[#A3A3A3]'
                          }`}
                          title="Formula fallback: monthly × 12 × 0.8 (≈%20 indirim)"
                        >
                          Otomatik ${Math.round(p.priceUsd * 12 * 0.8)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Features list — first 5 + "+ N daha" */}
                <ul className="mb-5 flex-1 space-y-2">
                  {p.featuresTr.slice(0, 5).map((feat, fi) => (
                    <li
                      key={`${p.id}-feat-${fi}`}
                      className={`flex items-start gap-2.5 text-[13px] ${
                        isDark ? 'text-white' : 'text-pn-ink'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                          isDark ? 'bg-pn-accent' : 'bg-pn-accent-soft'
                        }`}
                      >
                        <Crown size={9} className="text-pn-ink" strokeWidth={3} />
                      </span>
                      <span className="line-clamp-2">{feat}</span>
                    </li>
                  ))}
                  {p.featuresTr.length > 5 && (
                    <li
                      className={`text-[12px] ${
                        isDark ? 'text-white/50' : 'text-[#737373]'
                      } pl-6`}
                    >
                      + {p.featuresTr.length - 5} özellik daha
                    </li>
                  )}
                  {p.featuresTr.length === 0 && (
                    <li
                      className={`text-[12px] italic ${
                        isDark ? 'text-white/40' : 'text-[#A3A3A3]'
                      }`}
                    >
                      Henüz özellik eklenmemiş — Düzenle ile ekle
                    </li>
                  )}
                </ul>

                {/* Meta + actions footer */}
                <div
                  className={`flex flex-col gap-3 pt-4 border-t ${
                    isDark ? 'border-white/10' : 'border-pn-line'
                  }`}
                >
                  <div
                    className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] ${
                      isDark ? 'text-white/50' : 'text-[#737373]'
                    }`}
                  >
                    <span>Sıra {p.sortOrder}</span>
                    <span className={isDark ? 'text-white/20' : 'text-[#D4D4D4]'}>·</span>
                    <span>{p.featuresTr.length} özellik</span>
                    {p.paymentProvider !== 'manual' && (
                      <>
                        <span className={isDark ? 'text-white/20' : 'text-[#D4D4D4]'}>·</span>
                        <span
                          className={`font-medium ${
                            isDark ? 'text-pn-accent' : 'text-pn-ink'
                          }`}
                        >
                          PayNKolay
                          {p.priceTry > 0 ? ` · ₺${p.priceTry}` : ' (TL fiyat eksik)'}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0 || busyRowId === p.id}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                        isDark
                          ? 'border border-white/15 text-white/70 hover:bg-white/10 disabled:opacity-30'
                          : 'border border-pn-line text-[#525252] hover:border-pn-ink disabled:opacity-40'
                      }`}
                      aria-label="Yukarı taşı"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(idx)}
                      disabled={idx === sortedPlans.length - 1 || busyRowId === p.id}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                        isDark
                          ? 'border border-white/15 text-white/70 hover:bg-white/10 disabled:opacity-30'
                          : 'border border-pn-line text-[#525252] hover:border-pn-ink disabled:opacity-40'
                      }`}
                      aria-label="Aşağı taşı"
                    >
                      <ArrowDown size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePlanField(p.id, { isFeatured: !p.isFeatured })}
                      disabled={busyRowId === p.id}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors ${
                        p.isFeatured
                          ? isDark
                            ? 'bg-pn-accent text-pn-ink'
                            : 'bg-pn-ink text-white'
                          : isDark
                            ? 'border border-white/15 text-white/70 hover:bg-white/10'
                            : 'border border-pn-line text-[#525252] hover:border-pn-ink'
                      }`}
                      aria-label={p.isFeatured ? 'En popüler tier' : 'En popüler yap'}
                    >
                      <Crown size={10} />
                      {p.isFeatured ? 'Popüler' : 'Popüler yap'}
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePlanField(p.id, { isActive: !p.isActive })}
                      disabled={busyRowId === p.id}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors ${
                        isDark
                          ? 'border border-white/15 text-white/70 hover:bg-white/10'
                          : 'border border-pn-line text-[#525252] hover:border-pn-ink'
                      }`}
                    >
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${
                          p.isActive ? 'bg-pn-accent-hover' : 'bg-[#A3A3A3]'
                        }`}
                      />
                      {p.isActive ? 'Yayında' : 'Pasif'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors ${
                        isDark
                          ? 'border border-white/15 text-white/80 hover:bg-white/10'
                          : 'border border-pn-line text-pn-ink hover:bg-pn-canvas'
                      }`}
                    >
                      <Pencil size={10} /> Düzenle
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(p.id)}
                      disabled={busyRowId === p.id}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors disabled:opacity-60 ${
                        isDark
                          ? 'border border-white/10 text-white/50 hover:bg-red-500/20 hover:text-red-200'
                          : 'border border-[#FECACA] bg-white text-[#991B1B] hover:bg-[#FEF2F2]'
                      }`}
                      aria-label="Paketi sil"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {modalOpen && (
      <Modal
        onClose={closeModal}
        size={720}
        title={editingId ? `${form.nameTr || 'Paket'} düzenle` : 'Yeni paket oluştur'}
        footer={
          <>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setDeleteId(editingId);
                }}
                disabled={saving}
                className="bz-btn-danger mr-auto text-[12px] disabled:opacity-60"
              >
                <Trash2 size={12} /> Bu paketi sil
              </button>
            )}
            <button type="button" onClick={closeModal} disabled={saving} className="bz-btn-ghost">
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bz-btn-primary inline-flex items-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editingId ? 'Kaydet' : 'Oluştur'}
            </button>
          </>
        }
      >
        <div className="-mx-6 -my-6 max-h-[70vh] space-y-5 overflow-y-auto px-6 py-6">
          {error && <AlertBanner kind="danger">{error}</AlertBanner>}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Paket adı (TR)" required>
              <input
                type="text"
                value={form.nameTr}
                onChange={(e) => setForm((f) => ({ ...f, nameTr: e.target.value }))}
                className="bz-input"
                placeholder="Growth"
              />
            </Field>
            <Field label="Paket adı (EN)" required>
              <input
                type="text"
                value={form.nameEn}
                onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
                className="bz-input"
                placeholder="Growth"
              />
            </Field>
            <Field label="Açıklama (TR)" required>
              <textarea
                rows={2}
                value={form.descriptionTr}
                onChange={(e) => setForm((f) => ({ ...f, descriptionTr: e.target.value }))}
                className="bz-input"
              />
            </Field>
            <Field label="Açıklama (EN)" required>
              <textarea
                rows={2}
                value={form.descriptionEn}
                onChange={(e) => setForm((f) => ({ ...f, descriptionEn: e.target.value }))}
                className="bz-input"
              />
            </Field>
          </div>

          {/* §38.225 Stage 145 — USD-only fiyatlandırma. TRY field'ları
              schema'da kalır ama admin UI'da gizli; her create/edit'te
              priceTry: 0 olarak otomatik set edilir (formToBody içinde). */}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Aylık fiyat (USD)" required>
              <input
                type="number"
                min={0}
                value={form.priceUsd}
                onChange={(e) => {
                  const next = e.target.value;
                  setForm((f) => ({
                    ...f,
                    priceUsd: next,
                    // CLAUDE.md §15.2 — yıllık override admin elle dokunmadıysa
                    // aylık değişince temizlenir → public sayfa formula
                    // (monthly × 12 × 0.8) yeniden geçerli olur.
                    priceYearlyUsd: yearlyUsdTouchedRef.current ? f.priceYearlyUsd : '',
                  }));
                }}
                className="bz-input"
                placeholder="örn. 40"
              />
            </Field>
            <Field label="Periyot">
              <select
                value={form.period}
                onChange={(e) =>
                  setForm((f) => ({ ...f, period: e.target.value as FormState['period'] }))
                }
                className="bz-input"
              >
                <option value="month">Aylık</option>
                <option value="year">Yıllık</option>
                <option value="one-time">Tek seferlik</option>
              </select>
            </Field>
          </div>

          {/* Yıllık fiyat (USD, opsiyonel) — public pricing sayfasında "Yıllık"
              toggle'da gösterilir. Boş bırakılırsa frontend formula
              (aylık × 12 × 0.8) uygular; admin elle override ettiğinde DB
              değeri kullanılır. CLAUDE.md §15.2 yıllık fiyat override pattern.

              Stale override koruması: admin aylık fiyatı değiştirip yıllık'a
              dokunmazsa form yıllık'ı boşaltır (auto-clear) → kayıtta null
              → public sayfada formula geçerli olur. Admin yıllık'a elle
              değer girerse override "touched" sayılır ve aylık değişse de
              korunur. */}
          <Field
            label="Yıllık fiyat (USD, opsiyonel)"
            hint="Boş bırakılırsa aylık × 12 × 0.8 (≈%20 indirim) hesaplanır."
          >
            <div className="flex items-stretch gap-2">
              <input
                type="number"
                min={0}
                value={form.priceYearlyUsd}
                onChange={(e) => {
                  yearlyUsdTouchedRef.current = true;
                  setForm((f) => ({ ...f, priceYearlyUsd: e.target.value }));
                }}
                className="bz-input flex-1"
                placeholder={(() => {
                  const u = parseInt(form.priceUsd, 10);
                  if (!Number.isFinite(u) || u <= 0) return 'örn. 384';
                  return `Otomatik: ${Math.round(u * 12 * 0.8)}`;
                })()}
              />
              {form.priceYearlyUsd.trim() !== '' && (
                <button
                  type="button"
                  onClick={() => {
                    yearlyUsdTouchedRef.current = false;
                    setForm((f) => ({ ...f, priceYearlyUsd: '' }));
                  }}
                  className="bz-btn-ghost shrink-0 px-3"
                  title="Otomatik formüle dön (aylık × 12 × 0.8)"
                >
                  <RotateCcw size={13} />
                </button>
              )}
            </div>
            <YearlyDisplayHint
              monthly={form.priceUsd}
              yearlyOverride={form.priceYearlyUsd}
              currency="USD"
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Özellikler (TR) — her satıra bir madde">
              <textarea
                rows={5}
                value={form.featuresTr}
                onChange={(e) => setForm((f) => ({ ...f, featuresTr: e.target.value }))}
                className="bz-input font-mono text-[13px]"
                placeholder={'Sınırsız QR kod\nBuaze Pulse AI\nÇoklu lokasyon'}
              />
            </Field>
            <Field label="Özellikler (EN) — one item per line">
              <textarea
                rows={5}
                value={form.featuresEn}
                onChange={(e) => setForm((f) => ({ ...f, featuresEn: e.target.value }))}
                className="bz-input font-mono text-[13px]"
                placeholder={'Unlimited QR codes\nBuaze Pulse AI\nMulti-location'}
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Buton metni (TR)">
              <input
                type="text"
                value={form.buttonTextTr}
                onChange={(e) => setForm((f) => ({ ...f, buttonTextTr: e.target.value }))}
                className="bz-input"
              />
            </Field>
            <Field label="Buton metni (EN)">
              <input
                type="text"
                value={form.buttonTextEn}
                onChange={(e) => setForm((f) => ({ ...f, buttonTextEn: e.target.value }))}
                className="bz-input"
              />
            </Field>
            <Field label="Buton hedefi (path)">
              <input
                type="text"
                value={form.buttonHref}
                onChange={(e) => setForm((f) => ({ ...f, buttonHref: e.target.value }))}
                className="bz-input"
                placeholder="/auth/register"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <SwitchCard
              label="Yayında"
              hint="Pasif paketler public sayfada gizli"
              value={form.isActive}
              onChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
            />
            <SwitchCard
              label="En popüler"
              hint="Aynı anda tek paket öne çıkarılabilir"
              value={form.isFeatured}
              onChange={(v) => setForm((f) => ({ ...f, isFeatured: v }))}
            />
            <Field label="Sıralama">
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                className="bz-input"
              />
            </Field>
          </div>

          <div className="rounded-[24px] border border-pn-line bg-pn-canvas p-4">
            <SwitchCard
              label="İndirim aktif"
              hint="Yüzde veya sabit tutar indirim"
              value={form.discountActive}
              onChange={(v) => setForm((f) => ({ ...f, discountActive: v }))}
              flush
            />
            {form.discountActive && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="İndirim tipi">
                  <select
                    value={form.discountType}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, discountType: e.target.value as FormState['discountType'] }))
                    }
                    className="bz-input"
                  >
                    <option value="percent">Yüzde (%)</option>
                    <option value="fixed">Sabit tutar</option>
                  </select>
                </Field>
                <Field label={form.discountType === 'percent' ? 'Yüzde değeri (1–100)' : 'Tutar'}>
                  <input
                    type="number"
                    min={0}
                    max={form.discountType === 'percent' ? 100 : undefined}
                    value={form.discountValue}
                    onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                    className="bz-input"
                  />
                </Field>
                <Field label="İndirim etiketi (TR)">
                  <input
                    type="text"
                    value={form.discountLabelTr}
                    onChange={(e) => setForm((f) => ({ ...f, discountLabelTr: e.target.value }))}
                    placeholder="%30 indirim"
                    className="bz-input"
                  />
                </Field>
                <Field label="İndirim etiketi (EN)">
                  <input
                    type="text"
                    value={form.discountLabelEn}
                    onChange={(e) => setForm((f) => ({ ...f, discountLabelEn: e.target.value }))}
                    placeholder="30% off"
                    className="bz-input"
                  />
                </Field>
              </div>
            )}

            {/* ── Ödeme (PayNKolay) + paket modülleri (CLAUDE.md §44, §5.2) ── */}
            <div className="bz-card-soft p-4">
              <div className="mb-3">
                <p className="text-[13px] font-medium text-pn-ink">Ödeme ve paket modülleri</p>
                <p className="mt-0.5 text-[12px] text-[#737373]">
                  <strong>Elle</strong> = admin üyenin faturasını yönetir.{' '}
                  <strong>PayNKolay</strong> = işletme sahibi kartla öder; TL fiyatı girin
                  (PayNKolay yalnız TL tahsil eder). Her ödeme bir dönem (ay / yıl) açar,
                  otomatik çekim yoktur.
                </p>
              </div>
              <Field label="Ödeme">
                <select
                  value={form.paymentProvider}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      paymentProvider: e.target.value as FormState['paymentProvider'],
                    }))
                  }
                  className="bz-input"
                >
                  <option value="manual">Elle (admin yönetir)</option>
                  <option value="paynkolay">PayNKolay (kartla ödeme)</option>
                </select>
              </Field>
              {form.paymentProvider === 'paynkolay' && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Aylık fiyat (TL)" required hint="Kartla tahsil edilen tutar, KDV dahil">
                    <input
                      type="number"
                      min={0}
                      value={form.priceTry}
                      onChange={(e) => setForm((f) => ({ ...f, priceTry: e.target.value }))}
                      className="bz-input"
                    />
                  </Field>
                  <Field label="Yıllık toplam (TL)" hint="Boş: aylık × 12 × 0,8">
                    <input
                      type="number"
                      min={0}
                      value={form.priceYearlyTry}
                      onChange={(e) => setForm((f) => ({ ...f, priceYearlyTry: e.target.value }))}
                      className="bz-input"
                    />
                  </Field>
                </div>
              )}
              <div className="mt-4 border-t border-pn-line pt-3">
                <Field label="İşletme sınırı" hint="Boş: sınırsız. Sahip bu sayıdan fazla işletme ekleyemez.">
                  <input
                    type="number"
                    min={1}
                    value={form.maxBusinesses}
                    onChange={(e) => setForm((f) => ({ ...f, maxBusinesses: e.target.value }))}
                    className="bz-input"
                  />
                </Field>
              </div>
              <div className="mt-4 border-t border-pn-line pt-3">
                <label className="flex items-start gap-2 text-[12px] text-pn-ink">
                  <input
                    type="checkbox"
                    checked={form.modulesManaged}
                    onChange={(e) => setForm((f) => ({ ...f, modulesManaged: e.target.checked }))}
                    className="mt-0.5"
                  />
                  <span>
                    <strong>Modülleri bu paket belirlesin.</strong> Paket atandığında ya da ödendiğinde
                    sahibin tüm işletmelerindeki özellik anahtarları aşağıdaki seçime göre ayarlanır.
                  </span>
                </label>
                {form.modulesManaged && (
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {PLAN_MODULES.map((m) => (
                      <label key={m.key} className="flex items-center gap-2 text-[12px] text-[#525252]">
                        <input
                          type="checkbox"
                          checked={form.moduleKeys.includes(m.key)}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              moduleKeys: e.target.checked
                                ? [...f.moduleKeys, m.key]
                                : f.moduleKeys.filter((k) => k !== m.key),
                            }))
                          }
                        />
                        {m.tr}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>
      )}

      {deleteId !== null && (
      <Modal
        onClose={() => setDeleteId(null)}
        size={420}
        title="Paket silinsin mi?"
        footer={
          <>
            <button type="button" onClick={() => setDeleteId(null)} className="bz-btn-ghost">
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={busyRowId !== null}
              className="bz-btn-danger disabled:opacity-60"
            >
              {busyRowId && <Loader2 size={14} className="animate-spin" />} Sil
            </button>
          </>
        }
      >
        <p className="text-[13px] text-[#525252]">
          Bu işlem geri alınamaz. Public sayfada bu paket artık görünmez.
        </p>
      </Modal>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[12px] font-medium text-[#525252]">
        {label}
        {required && <span className="ml-1 text-[#DC2626]">*</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[12px] text-[#737373]">{hint}</p>}
    </div>
  );
}

/**
 * Live preview of the "per-month under annual" price that will show on the
 * public /pricing page. Mirrors `toPublicPlan()` logic (CLAUDE.md §15.2):
 *   override ? override / 12 : monthly × 0.8
 * Helps admin spot stale overrides at a glance.
 */
function YearlyDisplayHint({
  monthly,
  yearlyOverride,
  currency,
}: {
  monthly: string;
  yearlyOverride: string;
  currency: 'TRY' | 'USD';
}) {
  const m = parseInt(monthly, 10);
  const y = parseInt(yearlyOverride, 10);
  const hasMonthly = Number.isFinite(m) && m > 0;
  const hasOverride = Number.isFinite(y) && y > 0;
  if (!hasMonthly && !hasOverride) return null;

  const perMonthYearly = hasOverride
    ? Math.round(y / 12)
    : hasMonthly
      ? Math.round(m * 0.8)
      : 0;
  const isOverride = hasOverride;
  const symbol = currency === 'TRY' ? '₺' : '$';
  const formatted =
    currency === 'TRY'
      ? `${symbol}${perMonthYearly.toLocaleString('tr-TR')}`
      : `${symbol}${perMonthYearly.toLocaleString('en-US')}`;

  // Stale check: if override leaks more than 30% off vs monthly × 0.8 formula,
  // flag it so admin notices when monthly was bumped without yearly being
  // re-synced. 30% threshold avoids noise on legit deeper discounts.
  const formulaPerMonth = hasMonthly ? Math.round(m * 0.8) : 0;
  const stale =
    isOverride && hasMonthly && formulaPerMonth > 0 && perMonthYearly < formulaPerMonth * 0.7;

  return (
    <p className={`mt-1 text-[12px] ${stale ? 'text-[#92400E]' : 'text-[#525252]'}`}>
      Public sayfada gösterilecek: <strong>{formatted}/ay</strong> (yıllık){' '}
      <span className="text-[#737373]">
        — {isOverride ? 'manuel override' : 'aylık × 12 × 0.8'}
      </span>
      {stale && (
        <>
          {' '}
          <span className="font-medium">— override aylıktan kopmuş olabilir, sıfırlamayı düşünün.</span>
        </>
      )}
    </p>
  );
}

/**
 * Plan/feature toggle card with the canonical `APSwitch` primitive.
 * `flush` variant drops the card chrome when used inside an existing
 * surface (örn. discount alt-grid'i).
 */
function SwitchCard({
  label,
  hint,
  value,
  onChange,
  flush = false,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  flush?: boolean;
}) {
  const content = (
    <>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-pn-ink">{label}</p>
        {hint && <p className="mt-0.5 text-[12px] text-[#737373]">{hint}</p>}
      </div>
      <APSwitch checked={value} onChange={onChange} ariaLabel={label} />
    </>
  );

  if (flush) {
    return <div className="flex items-start justify-between gap-3">{content}</div>;
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-[24px] border border-pn-line bg-white px-4 py-3">
      {content}
    </div>
  );
}

/**
 * §38.219 Stage 139 — Inline editable price cell.
 *
 * Initial: read-only formatted price (mono font, hover shows pencil hint).
 * Click → switches to controlled <input>, auto-focus + select.
 * Enter or blur → commit (PATCH single field via onSave handler).
 * Esc → revert + close without save.
 * Loading: inline spinner.
 *
 * `required` field (e.g. priceTry) cannot be cleared to null — empty input
 * reverts to original value. Optional fields (USD, yearly) accept empty
 * input which serializes as null (admin "clear override" intent).
 */
function InlinePriceCell({
  planId,
  field,
  value,
  currency,
  label,
  busy,
  required = false,
  onSave,
  variant = 'inline',
  dark = false,
}: {
  planId: string;
  field: string;
  value: number | null;
  currency: 'TRY' | 'USD';
  label: string;
  busy: boolean;
  required?: boolean;
  onSave: (planId: string, field: string, nextValue: number | null) => Promise<boolean>;
  /** 'inline' (default): small text (12px); 'hero': large display price
   *  (40-52px Space Grotesk) for tier card hero. §38.224 */
  variant?: 'inline' | 'hero';
  /** Dark variant for featured tier cards (white text on graphite bg). */
  dark?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEdit = () => {
    if (busy) return;
    setDraft(value != null ? String(value) : '');
    setEditing(true);
  };

  const cancel = () => {
    setDraft(value != null ? String(value) : '');
    setEditing(false);
  };

  const commit = async () => {
    const trimmed = draft.trim();
    let nextValue: number | null;
    if (trimmed === '') {
      if (required) {
        // Required field cannot be cleared; revert silently.
        cancel();
        return;
      }
      nextValue = null;
    } else {
      const n = parseInt(trimmed, 10);
      if (!Number.isFinite(n) || n < 0) {
        // Invalid input — revert + close (notice handled at parent if needed).
        cancel();
        return;
      }
      nextValue = n;
    }
    // No change → just close, skip PATCH.
    if (nextValue === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const success = await onSave(planId, field, nextValue);
    setSaving(false);
    setEditing(false);
    if (!success) {
      // Parent shows the error notice; we already closed the editor.
    }
  };

  const formatDisplay = (v: number) =>
    currency === 'TRY' ? `₺${v.toLocaleString('tr-TR')}` : `$${v}`;

  // §38.224 — Hero variant: large display price (40-52px Space Grotesk) for
  // tier card hero section. Inline variant: small mono price (12px) for
  // secondary cells (USD, yearly).
  const isHero = variant === 'hero';

  if (!editing) {
    if (isHero) {
      return (
        <button
          type="button"
          onClick={startEdit}
          disabled={busy}
          title={`${label} — düzenlemek için tıkla`}
          className={`group inline-flex items-baseline rounded-[10px] px-2 py-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent disabled:cursor-not-allowed disabled:opacity-50 ${
            dark
              ? 'hover:bg-white/5 focus-visible:bg-white/5 text-pn-accent'
              : 'hover:bg-pn-canvas focus-visible:bg-pn-canvas text-pn-ink'
          }`}
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 500,
            letterSpacing: '-0.03em',
          }}
        >
          <span className="text-[40px] sm:text-[48px] leading-none">
            {value != null ? formatDisplay(value) : '—'}
          </span>
          <Pencil
            size={12}
            className={`ml-1.5 opacity-0 transition-opacity group-hover:opacity-50 group-focus-visible:opacity-60 ${
              dark ? 'text-white' : 'text-[#737373]'
            }`}
            aria-hidden
          />
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={startEdit}
        disabled={busy}
        title={`${label} — düzenlemek için tıkla`}
        className={`group inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent disabled:cursor-not-allowed disabled:opacity-50 ${
          dark
            ? 'text-white hover:bg-white/10 focus-visible:bg-white/10'
            : 'text-pn-ink hover:bg-pn-canvas focus-visible:bg-pn-canvas'
        }`}
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {value != null ? (
          formatDisplay(value)
        ) : (
          <span className={dark ? 'text-white/40' : 'text-[#A3A3A3]'}>—</span>
        )}
        <Pencil
          size={9}
          className={`opacity-0 transition-opacity group-hover:opacity-50 group-focus-visible:opacity-50 ${
            dark ? 'text-white' : ''
          }`}
          aria-hidden
        />
      </button>
    );
  }

  // Editor — hero variant uses larger input; both share ring-lime active state.
  if (isHero) {
    return (
      <span
        className={`inline-flex items-baseline gap-1 rounded-[10px] border-2 border-pn-accent px-2 py-1 ring-2 ring-pn-accent/30 ${
          dark ? 'bg-white/5' : 'bg-white'
        }`}
      >
        <span
          className={`text-[28px] ${dark ? 'text-pn-accent' : 'text-pn-ink'}`}
          style={{ fontFamily: 'var(--font-heading)', fontWeight: 500 }}
        >
          {currency === 'TRY' ? '₺' : '$'}
        </span>
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          min={0}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void commit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
          }}
          disabled={saving}
          aria-label={label}
          className={`w-24 border-0 bg-transparent p-0 text-[36px] sm:text-[44px] leading-none focus:outline-none disabled:opacity-50 ${
            dark ? 'text-pn-accent' : 'text-pn-ink'
          }`}
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 500,
            letterSpacing: '-0.03em',
          }}
        />
        {saving ? (
          <Loader2 size={14} className="animate-spin text-[#737373]" aria-hidden />
        ) : (
          <span className={`text-[12px] ${dark ? 'text-white/40' : 'text-[#A3A3A3]'}`} aria-hidden>
            ↵
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-pn-accent px-1 py-0.5 ring-2 ring-pn-accent/30 ${
        dark ? 'bg-white/10' : 'bg-white'
      }`}
    >
      <span className={`text-[12px] ${dark ? 'text-white/60' : 'text-[#737373]'}`}>
        {currency === 'TRY' ? '₺' : '$'}
      </span>
      <input
        ref={inputRef}
        type="number"
        inputMode="numeric"
        min={0}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
          }
        }}
        disabled={saving}
        aria-label={label}
        className={`w-16 border-0 bg-transparent p-0 text-[12px] font-medium focus:outline-none disabled:opacity-50 ${
          dark ? 'text-white' : 'text-pn-ink'
        }`}
        style={{ fontFamily: 'var(--font-mono)' }}
      />
      {saving ? (
        <Loader2 size={10} className="animate-spin text-[#737373]" aria-hidden />
      ) : (
        <span className={`text-[12px] ${dark ? 'text-white/40' : 'text-[#A3A3A3]'}`} aria-hidden>
          ↵
        </span>
      )}
    </span>
  );
}
