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
  /** Payment provider (CLAUDE.md §44). 'manual' tier'lar checkout butonu
   *  göstermez; 'dodo_payments' tier'lar `dodoProductId` slot'u kullanır. */
  paymentProvider: 'manual' | 'dodo_payments' | 'iyzico';
  dodoProductId: string;
}

const EMPTY_FORM: FormState = {
  nameTr: '',
  nameEn: '',
  descriptionTr: '',
  descriptionEn: '',
  priceTry: '0',
  priceUsd: '',
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
  dodoProductId: '',
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
    paymentProvider: (p.paymentProvider === 'dodo_payments' || p.paymentProvider === 'iyzico'
      ? p.paymentProvider
      : 'manual') as FormState['paymentProvider'],
    dodoProductId: p.dodoProductId ?? '',
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
    // Dodo Payments product ID — admin /admin/plans editöründen her tier
    // için 1 product ID set edilir. Boş = null (admin override clear).
    dodoProductId: f.dodoProductId.trim(),
  };
}

export default function PlansManager({ initialPlans }: { initialPlans: AdminPlanRow[] }) {
  const [plans, setPlans] = useState<AdminPlanRow[]>(initialPlans);
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

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/admin/plans/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false }),
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
          : `${data?.seeded ?? 3} varsayılan paket yüklendi.`,
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
    const tryPrice = parseInt(form.priceTry, 10);
    if (isNaN(tryPrice) || tryPrice < 0) return 'TRY fiyatı geçersiz.';
    if (form.priceUsd.trim() !== '') {
      const usd = parseInt(form.priceUsd, 10);
      if (isNaN(usd) || usd < 0) return 'USD fiyatı geçersiz.';
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
            Public fiyatlandırma sayfasında görünen paketler. Değişiklikler anında yansır.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {plans.length === 0 && (
            <button
              type="button"
              onClick={handleSeedDefaults}
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
        <div className="rounded-3xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-10 text-center">
          <p className="text-[14px] text-[#525252]">
            Henüz paket yok. <strong>Varsayılan paketleri yükle</strong> butonuyla 3 hazır paketi
            yükle veya <strong>Yeni paket</strong> ile sıfırdan oluştur.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedPlans.map((p, idx) => (
            <article
              key={p.id}
              className={`rounded-2xl border bg-white p-4 sm:p-5 ${
                p.isFeatured ? 'border-[#0A0A0A]' : 'border-[#EDEDED]'
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bz-h-tight text-[16px]">{p.nameTr}</span>
                    <span className="text-[12px] text-[#737373]">/ {p.nameEn}</span>
                    {p.isFeatured && (
                      <Badge kind="lime" dot={false}>
                        <span className="inline-flex items-center gap-1">
                          <Crown size={10} /> En popüler
                        </span>
                      </Badge>
                    )}
                    {!p.isActive && <Badge kind="off">Pasif</Badge>}
                    {p.discountActive && p.discountValue != null && (
                      <Badge kind="warn">
                        İndirim{' '}
                        {p.discountType === 'percent' ? `${p.discountValue}%` : `-${p.discountValue}`}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] leading-snug text-[#525252] line-clamp-2">
                    {p.descriptionTr}
                  </p>
                  {/* §38.219 Stage 139 — Inline editable price cells.
                      Click → input opens → Enter/blur saves → toast 'Marketing 30s'.
                      Eski 'Düzenle' modal'ı tam form için hâlâ açık (description,
                      features, discount, Lemon Squeezy variant). */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-[#737373]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-[#A3A3A3]">
                        Aylık
                      </span>
                      <InlinePriceCell
                        planId={p.id}
                        field="priceTry"
                        value={p.priceTry}
                        currency="TRY"
                        label="Aylık TRY fiyat"
                        busy={busyRowId === p.id}
                        onSave={savePriceInline}
                        required
                      />
                      <span className="text-[#D4D4D4]">·</span>
                      <InlinePriceCell
                        planId={p.id}
                        field="priceUsd"
                        value={p.priceUsd}
                        currency="USD"
                        label="Aylık USD fiyat"
                        busy={busyRowId === p.id}
                        onSave={savePriceInline}
                      />
                    </div>
                    <span className="text-[#D4D4D4]">·</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-[#A3A3A3]">
                        Yıllık
                      </span>
                      <InlinePriceCell
                        planId={p.id}
                        field="priceYearlyTry"
                        value={p.priceYearlyTry}
                        currency="TRY"
                        label="Yıllık TRY fiyat (toplam)"
                        busy={busyRowId === p.id}
                        onSave={savePriceInline}
                      />
                      <span className="text-[#D4D4D4]">·</span>
                      <InlinePriceCell
                        planId={p.id}
                        field="priceYearlyUsd"
                        value={p.priceYearlyUsd}
                        currency="USD"
                        label="Yıllık USD fiyat (toplam)"
                        busy={busyRowId === p.id}
                        onSave={savePriceInline}
                      />
                    </div>
                    <span className="text-[#D4D4D4]">·</span>
                    <span>{p.featuresTr.length} özellik</span>
                    <span className="text-[#D4D4D4]">·</span>
                    <span>Sıra {p.sortOrder}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0 || busyRowId === p.id}
                    className="bz-btn-icon"
                    aria-label="Yukarı taşı"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(idx)}
                    disabled={idx === sortedPlans.length - 1 || busyRowId === p.id}
                    className="bz-btn-icon"
                    aria-label="Aşağı taşı"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePlanField(p.id, { isFeatured: !p.isFeatured })}
                    disabled={busyRowId === p.id}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                      p.isFeatured
                        ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                        : 'border-[#EDEDED] text-[#525252] hover:border-[#0A0A0A]'
                    }`}
                  >
                    <Crown size={12} /> {p.isFeatured ? 'En popüler' : 'En popüler yap'}
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePlanField(p.id, { isActive: !p.isActive })}
                    disabled={busyRowId === p.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#EDEDED] px-3 py-1.5 text-[12px] font-semibold text-[#525252] hover:border-[#0A0A0A]"
                  >
                    {p.isActive ? 'Yayında' : 'Pasif'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    className="bz-btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px]"
                  >
                    <Pencil size={12} /> Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(p.id)}
                    disabled={busyRowId === p.id}
                    className="bz-btn-danger bz-btn-sm disabled:opacity-60"
                  >
                    <Trash2 size={12} /> Sil
                  </button>
                </div>
              </div>
            </article>
          ))}
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

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Aylık fiyat (TRY)" required>
              <input
                type="number"
                min={0}
                value={form.priceTry}
                onChange={(e) => {
                  const next = e.target.value;
                  setForm((f) => ({
                    ...f,
                    priceTry: next,
                    // CLAUDE.md §15.2 — yıllık override admin elle dokunmadıysa
                    // aylık değişince temizlenir → public sayfa formula
                    // (monthly × 12 × 0.8) yeniden geçerli olur.
                    priceYearlyTry: yearlyTryTouchedRef.current ? f.priceYearlyTry : '',
                  }));
                }}
                className="bz-input"
              />
            </Field>
            <Field label="Aylık fiyat (USD, opsiyonel)">
              <input
                type="number"
                min={0}
                value={form.priceUsd}
                onChange={(e) => {
                  const next = e.target.value;
                  setForm((f) => ({
                    ...f,
                    priceUsd: next,
                    priceYearlyUsd: yearlyUsdTouchedRef.current ? f.priceYearlyUsd : '',
                  }));
                }}
                className="bz-input"
                placeholder="EN sayfası için"
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

          {/* Yıllık fiyat — public pricing sayfasında "Yıllık" toggle'da
              gösterilir. Boş bırakılırsa frontend formula (aylık × 12 × 0.8)
              uygular; admin elle override ettiğinde DB değeri kullanılır.
              CLAUDE.md §15.2 yıllık fiyat override pattern.

              Stale override koruması: admin aylık fiyatı değiştirip yıllık'a
              dokunmazsa form yıllık'ı boşaltır (auto-clear) → kayıtta null
              → public sayfada formula geçerli olur. Admin yıllık'a elle
              değer girerse override "touched" sayılır ve aylık değişse de
              korunur. */}
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Yıllık fiyat (TRY, opsiyonel)"
              hint="Boş bırakılırsa aylık × 12 × 0.8 (≈%20 indirim) hesaplanır."
            >
              <div className="flex items-stretch gap-2">
                <input
                  type="number"
                  min={0}
                  value={form.priceYearlyTry}
                  onChange={(e) => {
                    yearlyTryTouchedRef.current = true;
                    setForm((f) => ({ ...f, priceYearlyTry: e.target.value }));
                  }}
                  className="bz-input flex-1"
                  placeholder={(() => {
                    const m = parseInt(form.priceTry, 10);
                    if (!Number.isFinite(m) || m <= 0) return 'örn. 4990';
                    return `Otomatik: ${Math.round(m * 12 * 0.8).toLocaleString('tr-TR')}`;
                  })()}
                />
                {form.priceYearlyTry.trim() !== '' && (
                  <button
                    type="button"
                    onClick={() => {
                      yearlyTryTouchedRef.current = false;
                      setForm((f) => ({ ...f, priceYearlyTry: '' }));
                    }}
                    className="bz-btn-ghost shrink-0 px-3"
                    title="Otomatik formüle dön (aylık × 12 × 0.8)"
                  >
                    <RotateCcw size={13} />
                  </button>
                )}
              </div>
              {/* Public sayfada gösterilecek "aylık eşdeğeri" canlı önizleme */}
              <YearlyDisplayHint
                monthly={form.priceTry}
                yearlyOverride={form.priceYearlyTry}
                currency="TRY"
              />
            </Field>
            <Field
              label="Yıllık fiyat (USD, opsiyonel)"
              hint="USD aylık dolu ise yıllık otomatik hesaplanabilir, ya da elle gir."
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
                    if (!Number.isFinite(u) || u <= 0) return 'EN sayfası için';
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
          </div>

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

          <div className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-4">
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

            {/* ── Ödeme sağlayıcı + Dodo Payments product mapping (CLAUDE.md §44, Stage 140) ── */}
            <div className="bz-card-soft p-4">
              <div className="mb-3">
                <p className="text-[13px] font-semibold text-[#0A0A0A]">Ödeme sağlayıcı</p>
                <p className="mt-0.5 text-[11px] text-[#737373]">
                  <strong>manual</strong> = admin elle yönetir (enterprise/legacy,
                  checkout butonu gizli). <strong>dodo_payments</strong> = self-service
                  checkout. Product ID&apos;yi Dodo Payments dashboard&apos;ından
                  (Products → seçilen product URL&apos;sinden) kopyalayın.
                </p>
              </div>
              <Field label="Sağlayıcı">
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
                  <option value="manual">manual (admin yönetir)</option>
                  <option value="dodo_payments">dodo_payments (self-service)</option>
                  <option value="iyzico">iyzico (yakında — Wave 3.5)</option>
                </select>
              </Field>
              {form.paymentProvider === 'dodo_payments' && (
                <div className="mt-3">
                  <Field
                    label="Dodo Product ID"
                    hint="Dodo Payments dashboard → Products → URL'deki ID (örn. pdt_abc123)"
                  >
                    <input
                      type="text"
                      value={form.dodoProductId}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, dodoProductId: e.target.value }))
                      }
                      placeholder="pdt_abc123"
                      className="bz-input bz-mono"
                    />
                  </Field>
                  <AlertBanner kind="info" className="mt-3">
                    <p className="text-[12px] leading-[1.5]">
                      Dodo product&apos;ında billing cycle (aylık/yıllık) ve
                      currency (USD/TRY) konfigürasyonu Dodo dashboard&apos;ında
                      tanımlanır. Owner checkout&apos;ta tek product ID ile
                      varyantlar arasında seçim yapar. Bu slot boş ise
                      checkout butonu owner panelinde gizli.
                    </p>
                  </AlertBanner>
                </div>
              )}
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
      <label className="text-[12px] font-semibold text-[#525252]">
        {label}
        {required && <span className="ml-1 text-[#DC2626]">*</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-[#737373]">{hint}</p>}
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
    <p className={`mt-1 text-[11px] ${stale ? 'text-[#92400E]' : 'text-[#525252]'}`}>
      Public sayfada gösterilecek: <strong>{formatted}/ay</strong> (yıllık){' '}
      <span className="text-[#737373]">
        — {isOverride ? 'manuel override' : 'aylık × 12 × 0.8'}
      </span>
      {stale && (
        <>
          {' '}
          <span className="font-semibold">— override aylıktan kopmuş olabilir, sıfırlamayı düşünün.</span>
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
        <p className="text-[13px] font-semibold text-[#0A0A0A]">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] text-[#737373]">{hint}</p>}
      </div>
      <APSwitch checked={value} onChange={onChange} ariaLabel={label} />
    </>
  );

  if (flush) {
    return <div className="flex items-start justify-between gap-3">{content}</div>;
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-[#EDEDED] bg-white px-4 py-3">
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
}: {
  planId: string;
  field: string;
  value: number | null;
  currency: 'TRY' | 'USD';
  label: string;
  busy: boolean;
  required?: boolean;
  onSave: (planId: string, field: string, nextValue: number | null) => Promise<boolean>;
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

  if (!editing) {
    return (
      <button
        type="button"
        onClick={startEdit}
        disabled={busy}
        title={`${label} — düzenlemek için tıkla`}
        className="group inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#FAFAFA] focus-visible:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] disabled:cursor-not-allowed disabled:opacity-50"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {value != null ? (
          formatDisplay(value)
        ) : (
          <span className="text-[#A3A3A3]">—</span>
        )}
        <Pencil
          size={9}
          className="opacity-0 transition-opacity group-hover:opacity-50 group-focus-visible:opacity-50"
          aria-hidden
        />
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-[#C6F24E] bg-white px-1 py-0.5 ring-2 ring-[#C6F24E]/30">
      <span className="text-[11px] text-[#737373]">{currency === 'TRY' ? '₺' : '$'}</span>
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
        className="w-16 border-0 bg-transparent p-0 text-[12px] font-medium text-[#0A0A0A] focus:outline-none disabled:opacity-50"
        style={{ fontFamily: 'var(--font-mono)' }}
      />
      {saving ? (
        <Loader2 size={10} className="animate-spin text-[#737373]" aria-hidden />
      ) : (
        <span className="text-[9px] text-[#A3A3A3]" aria-hidden>
          ↵
        </span>
      )}
    </span>
  );
}
