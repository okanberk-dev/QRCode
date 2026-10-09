'use client';

import { useState, useEffect, type FormEvent, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Save, ArrowLeft, Trash2, ExternalLink, Mail, UtensilsCrossed, Eye, EyeOff, Building2, MapPin, Globe, AlertTriangle, CheckCircle2, QrCode, MessageSquare, Link2, Users, Sparkles, BarChart3, ClipboardList, ClipboardCheck, ShieldAlert, PauseCircle } from 'lucide-react';
import Link from 'next/link';
import PlatformUrlHelp from '@/components/admin/PlatformUrlHelp';
import CopyUrlButton from '@/components/dashboard/CopyUrlButton';
import { AlertBanner, APSwitch, useConfirmDialog } from '@/components/ui';
import { getSectorPlatforms } from '@/lib/sector-platforms';
import { MENU_THEMES, type MenuTheme as MenuThemeKey } from '@/lib/validations';

// Theme label map — matches owner builder copy (CLAUDE.md §12). TR-only here
// because admin panel is Turkish-first (no /en/admin equivalent).
const THEME_LABELS: Record<MenuThemeKey, string> = {
  classic: 'Klasik',
  modern: 'Modern',
  elegant: 'Zarif',
  gastronomy: 'Gastronomi',
  minimal: 'Minimal',
  bistro: 'Bistro',
  pulse: 'Pulse',
};

interface Owner {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  isActive: boolean;
}

interface RestaurantMeta {
  createdAt: string;
  updatedAt: string;
  user: Owner | null;
  _count: {
    feedbacks: number;
    menuItems: number;
    qrGenerations: number;
    adminUsers: number;
  };
}

type FeatureToggleKey =
  | 'googleReviewManagementEnabled'
  | 'pulseAiEnabled'
  | 'menuEnabled'
  | 'menuPublished'
  | 'aiAnalyticsEnabled'
  | 'externalPlatformsEnabled'
  | 'surveysEnabled';

// /api/admin/restaurants/[id]/overview — owner-side modules summary.
interface OwnerModulesOverview {
  surveys: {
    total: number;
    items: Array<{
      id: string;
      title: string;
      slug: string;
      isActive: boolean;
      isPublished: boolean;
      responseCount: number;
    }>;
  };
  audits: { templates: number; completedResponses: number; avgScorePercent: number | null };
  team: { active: number; invited: number };
  google: { connected: boolean; locationTitle: string | null; syncedAt: string | null };
  platformLinks: { failingProviders: string[] };
  qrCount: number;
  owner: { scheduledDeletionAt: string | null; isActive: boolean | null };
}

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmDialog, askConfirm] = useConfirmDialog();
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    category: 'Restoran',
    address: '',
    phone: '',
    googlePlaceId: '',
    googleReviewManagementEnabled: false,
    getirYemekUrl: '',
    yemekSepetiUrl: '',
    trendyolYemekUrl: '',
    notificationEmail: '',
    primaryColor: '#C6F24E',
    isActive: true,
    userId: '',
  });
  const [menuEnabled, setMenuEnabled] = useState(true);
  const [menuPublished, setMenuPublished] = useState(false);
  // Menu theme override (Stage 109 §A2) — superadmin can adjust theme/accent/
  // logo from admin panel without impersonating owner. Owner panel keeps
  // primary control; this is a support/operations override.
  const [menuTheme, setMenuTheme] = useState<MenuThemeKey>('classic');
  const [menuAccentColor, setMenuAccentColor] = useState<string | null>(null);
  const [menuLogoUrl, setMenuLogoUrl] = useState<string | null>(null);
  const [themeSaving, setThemeSaving] = useState(false);
  const [themeNotice, setThemeNotice] = useState<{ kind: 'success' | 'danger'; text: string } | null>(null);
  const [pulseAiEnabled, setPulseAiEnabled] = useState(true);
  const [aiAnalyticsEnabled, setAiAnalyticsEnabled] = useState(true);
  const [externalPlatformsEnabled, setExternalPlatformsEnabled] = useState(true);
  const [surveysEnabled, setSurveysEnabled] = useState(true);
  const [suspendedByAdmin, setSuspendedByAdmin] = useState(false);
  const [overview, setOverview] = useState<OwnerModulesOverview | null>(null);
  const [overviewError, setOverviewError] = useState(false);
  const [featureSaving, setFeatureSaving] = useState<FeatureToggleKey | null>(null);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [meta, setMeta] = useState<RestaurantMeta | null>(null);

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const res = await fetch(`/api/restaurants/${id}`);
        if (res.status === 403 || res.status === 401) {
          router.push('/admin/restaurants');
          return;
        }
        if (res.status === 404) {
          setError('İşletme bulunamadı');
          setLoading(false);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setFormData({
            name: data.name || '',
            slug: data.slug || '',
            category: data.category || 'Restoran',
            address: data.address || '',
            phone: data.phone || '',
            googlePlaceId: data.googlePlaceId || data.googleReviewUrl || '',
            googleReviewManagementEnabled: data.googleReviewManagementEnabled ?? false,
            getirYemekUrl: data.getirYemekUrl || '',
            yemekSepetiUrl: data.yemekSepetiUrl || '',
            trendyolYemekUrl: data.trendyolYemekUrl || '',
            notificationEmail: data.notificationEmail || '',
            primaryColor: data.primaryColor || '#C6F24E',
            isActive: data.isActive ?? true,
            userId: data.userId || '',
          });
          setMeta({
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            user: data.user || null,
            _count: {
              feedbacks: data._count?.feedbacks ?? 0,
              menuItems: data._count?.menuItems ?? 0,
              qrGenerations: data._count?.qrGenerations ?? 0,
              adminUsers: data._count?.adminUsers ?? 0,
            },
          });
          setMenuEnabled(data.menuEnabled ?? true);
          setMenuPublished(data.menuPublished ?? false);
          // Menu theme fields — defensive cast (server may return unknown value
          // after manual SQL or future enum change; fall back to classic).
          const theme = (MENU_THEMES as readonly string[]).includes(data.menuTheme)
            ? (data.menuTheme as MenuThemeKey)
            : 'classic';
          setMenuTheme(theme);
          setMenuAccentColor(data.menuAccentColor ?? null);
          setMenuLogoUrl(data.menuLogoUrl ?? null);
          setPulseAiEnabled(data.pulseAiEnabled ?? true);
          setAiAnalyticsEnabled(data.aiAnalyticsEnabled ?? true);
          setExternalPlatformsEnabled(data.externalPlatformsEnabled ?? true);
          setSurveysEnabled(data.surveysEnabled ?? true);
          setSuspendedByAdmin(Boolean(data.suspendedByAdmin));
        } else {
          setError('Bir hata oluştu');
        }
      } catch (e) {
        console.error(e);
        setError('Bağlantı hatası');
      }
      setLoading(false);
    };
    fetchRestaurant();
  }, [id, router]);

  // Owner-side modules (surveys, audits, team, Google, link
  // health, self-deletion) — read-only admin visibility.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/restaurants/${id}/overview`);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as OwnerModulesOverview;
        if (!cancelled) setOverview(data);
      } catch {
        if (!cancelled) setOverviewError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        // /api/admin/members answers with a `{ data, meta }` envelope and
        // never a bare array, so this parse always produced [] — the owner
        // selector was permanently empty and a superadmin could not attach a
        // business to a customer, even though PUT fully supports `userId`.
        const res = await fetch('/api/admin/members?perPage=100');
        if (res.ok) {
          const data = await res.json();
          setOwners(
            Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [],
          );
        }
      } catch {
        // Only superadmin can list owners; scoped users simply don't see the selector.
      }
    })();
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { userId, ...rest } = formData;
      const base = owners.length > 0 ? formData : rest;
      // Mirror the Google review link to both columns. The detail form edits
      // `googlePlaceId`, but the public review surface and the owner platforms
      // page read `googleReviewUrl` (CLAUDE.md §4 platforms).
      const payload = { ...base, googleReviewUrl: formData.googlePlaceId };
      const res = await fetch(`/api/restaurants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Güncelleme başarısız');
        setSaving(false);
        return;
      }

      if (typeof data.suspendedByAdmin === 'boolean') setSuspendedByAdmin(data.suspendedByAdmin);
      setSuccess('İşletme başarıyla güncellendi.');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Bağlantı hatası');
    }
    setSaving(false);
  };

  const applyFeatureState = (next: Partial<Record<FeatureToggleKey, boolean>>) => {
    if (next.googleReviewManagementEnabled !== undefined) {
      setFormData(prev => ({ ...prev, googleReviewManagementEnabled: Boolean(next.googleReviewManagementEnabled) }));
    }
    if (next.menuEnabled !== undefined) setMenuEnabled(Boolean(next.menuEnabled));
    if (next.menuPublished !== undefined) setMenuPublished(Boolean(next.menuPublished));
    if (next.pulseAiEnabled !== undefined) setPulseAiEnabled(Boolean(next.pulseAiEnabled));
    if (next.aiAnalyticsEnabled !== undefined) setAiAnalyticsEnabled(Boolean(next.aiAnalyticsEnabled));
    if (next.externalPlatformsEnabled !== undefined) {
      setExternalPlatformsEnabled(Boolean(next.externalPlatformsEnabled));
    }
    if (next.surveysEnabled !== undefined) setSurveysEnabled(Boolean(next.surveysEnabled));
  };

  const saveFeatureSetting = async (patch: Partial<Record<FeatureToggleKey, boolean>>) => {
    const savingKey = Object.keys(patch)[0] as FeatureToggleKey | undefined;
    if (!savingKey) return;
    setFeatureSaving(savingKey);
    setError('');
    setSuccess('');

    const prev = {
      googleReviewManagementEnabled: formData.googleReviewManagementEnabled,
      pulseAiEnabled,
      menuEnabled,
      menuPublished,
      aiAnalyticsEnabled,
      externalPlatformsEnabled,
      surveysEnabled,
    };
    const optimistic = { ...prev, ...patch };
    if (patch.menuEnabled === false) optimistic.menuPublished = false;
    applyFeatureState(optimistic);

    try {
      const res = await fetch(`/api/admin/restaurants/${id}/feature-access`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Güncellenemedi');
      applyFeatureState(data.restaurant);
      setSuccess('Özellik ayarı güncellendi');
      setTimeout(() => setSuccess(''), 2500);
    } catch (e) {
      applyFeatureState(prev);
      setError((e as Error).message);
    }
    setFeatureSaving(null);
  };

  // Menu theme save (Stage 109 §A2). Calls /api/admin/restaurants/[id]/menu-theme.
  // Optimistic — UI reverts on failure. Accepts partial patch ({ menuTheme?,
  // menuAccentColor?, menuLogoUrl? }). null accentColor clears override.
  const saveMenuTheme = async (patch: {
    menuTheme?: MenuThemeKey;
    menuAccentColor?: string | null;
    menuLogoUrl?: string | null;
  }) => {
    setThemeSaving(true);
    setThemeNotice(null);
    const prev = { theme: menuTheme, accent: menuAccentColor, logo: menuLogoUrl };
    if (patch.menuTheme !== undefined) setMenuTheme(patch.menuTheme);
    if (patch.menuAccentColor !== undefined) setMenuAccentColor(patch.menuAccentColor);
    if (patch.menuLogoUrl !== undefined) setMenuLogoUrl(patch.menuLogoUrl);

    try {
      const res = await fetch(`/api/admin/restaurants/${id}/menu-theme`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Tema güncellenemedi');
      setThemeNotice({ kind: 'success', text: 'Menü görünümü kaydedildi' });
      setTimeout(() => setThemeNotice(null), 3000);
    } catch (e) {
      // Revert optimistic change
      setMenuTheme(prev.theme);
      setMenuAccentColor(prev.accent);
      setMenuLogoUrl(prev.logo);
      setThemeNotice({ kind: 'danger', text: (e as Error).message });
    }
    setThemeSaving(false);
  };

  const handleDelete = () => {
    askConfirm({
      title: 'İşletmeyi kalıcı olarak sil?',
      body: 'DİKKAT: Bu işletme kalıcı olarak silinecek ve geri alınamayacak. QR, yorum, menü ve analitik verileri de silinir.',
      confirmLabel: 'Kalıcı sil',
      cancelLabel: 'İptal',
      variant: 'danger',
      onConfirm: doDelete,
    });
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`/api/restaurants/${id}`, { method: 'DELETE' });
      router.push('/admin/restaurants');
    } catch {
      setError('Silme başarısız');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-7 w-7 animate-spin text-[#0A0A0A]" />
      </div>
    );
  }

  const menuStateLabel = !menuEnabled ? 'Menü kapalı' : menuPublished ? 'Menü yayında' : 'Menü taslak';
  const menuStateTone = !menuEnabled
    ? { dot: 'bg-[#A3A3A3]', text: 'text-[#737373]' }
    : menuPublished
    ? { dot: 'bg-[#16A34A]', text: 'text-[#166534]' }
    : { dot: 'bg-[#D97706]', text: 'text-[#92400E]' };
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const feedbackUrl = `${origin}/r/${formData.slug}`;
  const menuUrl = `${origin}/menu/${formData.slug}`;
  const qrUrl = `${origin}/admin/qr?restaurant=${id}`;
  const ownerLabel = meta?.user?.name || meta?.user?.email || 'Sahip atanmamış';
  // Sector → platform whitelist; hides input groups irrelevant for the
  // restaurant's vertical. Live on formData.category — admin can change the
  // category dropdown to surface hidden platforms when needed.
  const allowedPlatforms = getSectorPlatforms(formData.category);
  const showDeliverySection =
    allowedPlatforms.has('getir') ||
    allowedPlatforms.has('yemeksepeti') ||
    allowedPlatforms.has('trendyol');

  return (
    <div className="mx-auto max-w-[1440px] space-y-5 px-4 sm:px-7 py-6 lg:py-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm">
        <div className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: formData.primaryColor }} aria-hidden />
        <div className="flex flex-col gap-5 p-6 sm:p-8">
          <Link
            href="/admin/restaurants"
            className="pulse-eyebrow inline-flex w-fit items-center gap-1.5 text-[#737373] transition-colors hover:text-[#0A0A0A]"
          >
            <ArrowLeft size={12} strokeWidth={2.25} />
            Tüm İşletmeler
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[22px] font-semibold text-white shadow-sm ring-1 ring-black/5"
                style={{ backgroundColor: formData.primaryColor }}
              >
                {(formData.name || '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-[24px] font-medium tracking-[-0.02em] text-[#0A0A0A] sm:text-[28px]">
                  {formData.name || 'İşletme Düzenle'}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#737373]">
                  <span className={`inline-flex items-center gap-1.5 ${formData.isActive ? 'text-[#166534]' : 'text-[#737373]'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${formData.isActive ? 'bg-[#16A34A]' : 'bg-[#A3A3A3]'}`} aria-hidden />
                    <span className="font-medium">{formData.isActive ? 'Aktif' : 'Pasif'}</span>
                  </span>
                  {suspendedByAdmin && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[11px] font-medium text-[#991B1B]">
                      <PauseCircle size={11} strokeWidth={2.25} />
                      Admin tarafından duraklatıldı
                    </span>
                  )}
                  <span className="h-1 w-1 rounded-full bg-[#EDEDED]" aria-hidden />
                  <span className={`inline-flex items-center gap-1.5 ${menuStateTone.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${menuStateTone.dot}`} aria-hidden />
                    <span className="font-medium">{menuStateLabel}</span>
                  </span>
                  {formData.slug && (
                    <>
                      <span className="h-1 w-1 rounded-full bg-[#EDEDED]" aria-hidden />
                      <span className="font-mono" style={{ fontFamily: 'var(--font-mono)' }}>/r/{formData.slug}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/r/${formData.slug}`}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-full border border-[#EDEDED] bg-white px-4 py-2 text-[13px] font-medium text-[#0A0A0A] transition-all hover:border-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95"
              >
                <ExternalLink size={14} strokeWidth={2} />
                Önizle
              </Link>
              <Link
                href={`/admin/restaurants/${id}/menu`}
                className="inline-flex items-center gap-2 rounded-full border border-[#EDEDED] bg-white px-4 py-2 text-[13px] font-medium text-[#0A0A0A] transition-all hover:border-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95"
              >
                <UtensilsCrossed size={14} strokeWidth={2} />
                Menü
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-3xl border border-[#EDEDED] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EAF9B8] text-[#0A0A0A]">
              <Link2 size={18} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="pulse-eyebrow text-[#737373]">Detay URL&apos;leri</p>
              <h2 className="mt-0.5 text-[16px] font-medium text-[#0A0A0A]">Müşteri ve yönetim bağlantıları</h2>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <UrlTile label="Geri Bildirim" url={feedbackUrl} href={`/r/${formData.slug}`} />
            <UrlTile label="Menü" url={menuUrl} href={`/menu/${formData.slug}`} />
            <UrlTile label="QR Yönetimi" url={qrUrl} href={`/admin/qr?restaurant=${id}`} />
          </div>
        </section>

        <section className="rounded-3xl border border-[#EDEDED] bg-white p-5 shadow-sm sm:p-6">
          <p className="pulse-eyebrow text-[#737373]">İşletme özeti</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Metric icon={<MessageSquare size={15} />} label="Yorum" value={String(meta?._count.feedbacks ?? 0)} />
            <Metric icon={<QrCode size={15} />} label="QR" value={String(meta?._count.qrGenerations ?? 0)} />
            <Metric icon={<UtensilsCrossed size={15} />} label="Menü Ürünü" value={String(meta?._count.menuItems ?? 0)} />
            <Metric icon={<Users size={15} />} label="Yetkili" value={String(meta?._count.adminUsers ?? 0)} />
          </div>
          {/* §38.76 — İşletme sahibi cross-link. meta.user.id varsa
              `/admin/members/[ownerId]` link sahibi profile'a götürür; admin
              "kim sahip → diğer işletmeleri ne?" akışı tek-tıkla. Owner Stage
              2 §38.72 cross-link paterni admin'e port. */}
          <div className="mt-4 rounded-2xl bg-[#FAFAFA] p-3">
            <p className="pulse-eyebrow text-[#737373]">İşletme Sahibi</p>
            {meta?.user?.id ? (
              <Link
                href={`/admin/members/${meta.user.id}`}
                className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0A0A0A] hover:underline underline-offset-2"
              >
                <span className="truncate">{ownerLabel}</span>
                <ExternalLink size={11} strokeWidth={2} className="shrink-0 text-[#737373]" />
              </Link>
            ) : (
              <p className="mt-1 truncate text-[13px] font-medium text-[#0A0A0A]">{ownerLabel}</p>
            )}
            {meta?.user?.email && <p className="truncate text-[11px] text-[#737373]">{meta.user.email}</p>}
          </div>

          {/* §38.76 — Yorum geçmişi filter'lı cross-link. /admin/reviews
              ?restaurantId=[id] ile bu restorana özel yorumlar. Owner /
              admin daha hızlı action: detail'de "X yorum" sayısı gör →
              tıkla → filter'lı liste. */}
          {meta && meta._count.feedbacks > 0 && (
            <div className="mt-3">
              <Link
                href={`/admin/reviews?restaurantId=${id}`}
                className="bz-btn-ghost inline-flex items-center gap-1.5 text-[12px] w-full justify-center"
              >
                <MessageSquare size={12} strokeWidth={2} />
                Yorum geçmişini gör ({meta._count.feedbacks})
                <ExternalLink size={11} strokeWidth={2} />
              </Link>
            </div>
          )}
        </section>

      </div>

      {error && (
        <AlertBanner kind="danger" icon={<AlertTriangle size={14} strokeWidth={2} className="mt-0.5" />}>
          {error}
        </AlertBanner>
      )}
      {success && (
        <AlertBanner kind="success" icon={<CheckCircle2 size={14} strokeWidth={2} className="mt-0.5" />}>
          {success}
        </AlertBanner>
      )}

      {/* Menu visual override — Stage 109 §A2. Superadmin'in tema + accent +
          logo'yu impersonation yapmadan ayarlayabildiği panel. Owner builder
          (/[locale]/dashboard/restaurants/[id]/menu) primary control sahibi;
          burası support/operations override için. Logo upload owner'a özel;
          admin sadece clear edebilir. */}
      <section className="overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#EDEDED] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EAF9B8] text-[#0A0A0A]">
              <UtensilsCrossed size={18} strokeWidth={2} />
            </div>
            <div>
              <p className="pulse-eyebrow text-[#737373]">Menü Görünümü</p>
              <h3 className="mt-0.5 text-[16px] font-medium text-[#0A0A0A]">Tema, renk ve logo</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-[#737373]">
                Süperadmin override. Owner panelinden de düzenlenebilir; burada yapılan değişiklik anında müşteriye yansır.
              </p>
            </div>
          </div>
          {themeSaving && (
            <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-[#737373]">
              <Loader2 size={12} className="animate-spin" />
              Kaydediliyor…
            </span>
          )}
        </div>

        <div className="space-y-5 p-6">
          {themeNotice && (
            <AlertBanner
              kind={themeNotice.kind}
              icon={
                themeNotice.kind === 'success' ? (
                  <CheckCircle2 size={14} strokeWidth={2} className="mt-0.5" />
                ) : (
                  <AlertTriangle size={14} strokeWidth={2} className="mt-0.5" />
                )
              }
              onDismiss={() => setThemeNotice(null)}
            >
              {themeNotice.text}
            </AlertBanner>
          )}

          {/* Theme selector — 7 chip horizontal scroll (compact, admin doesn't
              need thumbnails — owner panel has those). */}
          <div>
            <p className="pulse-eyebrow mb-2 text-[#737373]">Tema</p>
            <div className="flex flex-wrap gap-2">
              {MENU_THEMES.map((t) => {
                const active = menuTheme === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => saveMenuTheme({ menuTheme: t })}
                    disabled={themeSaving}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-all disabled:opacity-50 ${
                      active
                        ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white shadow-sm'
                        : 'border-[#EDEDED] bg-white text-[#525252] hover:border-[#0A0A0A] hover:text-[#0A0A0A]'
                    }`}
                  >
                    {THEME_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accent color — color input + reset (clears override → falls back
              to restaurant.primaryColor at render time). */}
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <p className="pulse-eyebrow text-[#737373]">Vurgu rengi</p>
              <span className="bz-mono text-[11px] text-[#A3A3A3]">
                {(menuAccentColor ?? formData.primaryColor ?? '#C6F24E').toUpperCase()}
                {!menuAccentColor && ' (varsayılan)'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative inline-flex h-9 cursor-pointer items-center gap-2 overflow-hidden rounded-full border border-[#EDEDED] bg-white px-3 text-[12px] font-medium text-[#525252] transition-colors hover:border-[#0A0A0A] hover:text-[#0A0A0A]">
                <input
                  type="color"
                  value={menuAccentColor ?? formData.primaryColor ?? '#C6F24E'}
                  onChange={(e) => saveMenuTheme({ menuAccentColor: e.target.value })}
                  disabled={themeSaving}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                <span
                  className="inline-block h-5 w-5 rounded-full shadow-inner ring-1 ring-black/5"
                  style={{ backgroundColor: menuAccentColor ?? formData.primaryColor ?? '#C6F24E' }}
                />
                Renk seç
              </label>
              {menuAccentColor && (
                <button
                  type="button"
                  onClick={() => saveMenuTheme({ menuAccentColor: null })}
                  disabled={themeSaving}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#EDEDED] bg-white px-3 py-1.5 text-[11px] font-medium text-[#525252] transition-all hover:border-[#0A0A0A] hover:text-[#0A0A0A] disabled:opacity-50"
                >
                  Sıfırla (marka rengini kullan)
                </button>
              )}
            </div>
          </div>

          {/* Logo — read-only preview with clear button. Upload akışı owner
              panel'e bırakılır (base64 sıkıştırma + sharp resize). Admin
              sadece bozuk/yanlış logo'yu temizleyebilir. */}
          <div>
            <p className="pulse-eyebrow mb-2 text-[#737373]">Logo</p>
            <div className="flex items-start gap-3 rounded-2xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-[#EDEDED]">
                {menuLogoUrl ? (
                  <img src={menuLogoUrl} alt="logo" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#A3A3A3]">
                    <UtensilsCrossed size={20} strokeWidth={1.75} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] leading-relaxed text-[#525252]">
                  {menuLogoUrl
                    ? 'Logo yüklü. Yeni logo yüklemek için owner panelini kullanın.'
                    : 'Logo yüklü değil. Owner panelinden yükleyebilir.'}
                </p>
                {menuLogoUrl && (
                  <button
                    type="button"
                    onClick={() => saveMenuTheme({ menuLogoUrl: null })}
                    disabled={themeSaving}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#EDEDED] bg-white px-3 py-1.5 text-[11px] font-medium text-[#525252] transition-all hover:border-[#0A0A0A] hover:text-[#0A0A0A] disabled:opacity-50"
                  >
                    Logoyu temizle
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <OwnerModulesCard
        ownerId={meta?.user?.id ?? null}
        overview={overview}
        failed={overviewError}
        surveysEnabled={surveysEnabled}
      />

      {/* Feature entitlements — package-ready master switches */}
      <section className="overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#EDEDED] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EAF9B8] text-[#0A0A0A]">
              <Sparkles size={18} strokeWidth={2} />
            </div>
            <div>
              <p className="pulse-eyebrow text-[#737373]">Paket Özellikleri</p>
              <h3 className="mt-0.5 text-[16px] font-medium text-[#0A0A0A]">Gelişmiş özellik yönetimi</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-[#737373]">
                Bu şalterler ileride abonelik paketlerine bağlanacak işletme bazlı yetkileri yönetir.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              href={`/admin/restaurants/${id}/menu`}
              className="bz-btn-ghost"
            >
              <Eye size={14} strokeWidth={2} />
              Menüyü Görüntüle
            </Link>
            <Link
              href={`/tr/dashboard/restaurants/${id}/menu`}
              className="bz-btn-primary"
            >
              <UtensilsCrossed size={14} strokeWidth={2} />
              Menüyü Düzenle
            </Link>
          </div>
        </div>

        <div className="grid gap-3 p-6 lg:grid-cols-2">
          <FeatureToggleCard
            icon={<MessageSquare size={17} strokeWidth={2.2} />}
            eyebrow="Google"
            title="Google yorum yönetimi"
            description="Business Profile yorumlarını çekme, yanıtlama ve Google yorum cevap taslakları."
            checked={formData.googleReviewManagementEnabled}
            loading={featureSaving === 'googleReviewManagementEnabled'}
            onChange={(next) => saveFeatureSetting({ googleReviewManagementEnabled: next })}
          />
          <FeatureToggleCard
            icon={<Sparkles size={17} strokeWidth={2.2} />}
            eyebrow="Pulse AI"
            title="Pulse AI kullanımı"
            description="Owner panelindeki manuel/otomatik AI yanıt taslakları ve Google AI yardımcıları."
            checked={pulseAiEnabled}
            loading={featureSaving === 'pulseAiEnabled'}
            onChange={(next) => saveFeatureSetting({ pulseAiEnabled: next })}
          />
          <FeatureToggleCard
            icon={<UtensilsCrossed size={17} strokeWidth={2.2} />}
            eyebrow="Menü"
            title="Menü oluşturma modülü"
            description="Kapalıyken owner menü builder kullanamaz; yayın otomatik taslağa alınır."
            checked={menuEnabled}
            loading={featureSaving === 'menuEnabled'}
            onChange={(next) => saveFeatureSetting({ menuEnabled: next })}
          />
          <FeatureToggleCard
            icon={<BarChart3 size={17} strokeWidth={2.2} />}
            eyebrow="Analitik"
            title="AI ile analiz"
            description="Kapalıyken owner analitikleri normal metriklerle devam eder, AI tema çıkarımı gizlenir."
            checked={aiAnalyticsEnabled}
            loading={featureSaving === 'aiAnalyticsEnabled'}
            onChange={(next) => saveFeatureSetting({ aiAnalyticsEnabled: next })}
          />
          <FeatureToggleCard
            icon={<Globe size={17} strokeWidth={2.2} />}
            eyebrow="Platformlar"
            title="Google dışı platformlar"
            description="Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Booking, Airbnb ve Yandex yönlendirmeleri."
            checked={externalPlatformsEnabled}
            loading={featureSaving === 'externalPlatformsEnabled'}
            onChange={(next) => saveFeatureSetting({ externalPlatformsEnabled: next })}
          />
          <FeatureToggleCard
            icon={<ClipboardList size={17} strokeWidth={2.2} />}
            eyebrow="Anketler"
            title="Anket modülü"
            description="Kapalıyken owner yeni anket oluşturamaz/yayınlayamaz ve yayındaki anket linkleri yanıt toplamayı durdurur."
            checked={surveysEnabled}
            loading={featureSaving === 'surveysEnabled'}
            onChange={(next) => saveFeatureSetting({ surveysEnabled: next })}
          />
          <FeatureToggleCard
            icon={menuPublished ? <Eye size={17} strokeWidth={2.2} /> : <EyeOff size={17} strokeWidth={2.2} />}
            eyebrow="Yayın"
            title="Menü yayın durumu"
            description="Menü modülü açıkken public menü sayfasının yayında olup olmadığını belirler."
            checked={menuPublished}
            loading={featureSaving === 'menuPublished'}
            disabled={!menuEnabled}
            onChange={(next) => saveFeatureSetting({ menuPublished: next })}
          />
        </div>
      </section>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Basic Info */}
        <section className="overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-[#EDEDED] px-6 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0A0A0A] text-[#C6F24E]">
              <Building2 size={18} strokeWidth={2} />
            </div>
            <div>
              <p className="pulse-eyebrow text-[#737373]">01 / Kimlik</p>
              <h3 className="mt-0.5 text-[16px] font-medium text-[#0A0A0A]">Temel Bilgiler</h3>
            </div>
          </div>
          <div className="space-y-4 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="pulse-eyebrow text-[#737373]">İşletme Adı</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="pulse-eyebrow text-[#737373]">URL Slug</label>
                <div className="flex items-center overflow-hidden rounded-2xl border border-[#EDEDED] bg-white transition-all focus-within:border-[#0A0A0A] focus-within:ring-2 focus-within:ring-[#C6F24E]/40">
                  <span className="select-none whitespace-nowrap border-r border-[#EDEDED] bg-[#FAFAFA] px-3.5 py-3 font-mono text-[12px] text-[#737373]" style={{ fontFamily: 'var(--font-mono)' }}>
                    buaze.com/r/
                  </span>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    className="min-w-0 flex-1 bg-transparent px-3.5 py-3 font-mono text-[14px] text-[#0A0A0A] outline-none placeholder:text-[#A3A3A3]"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {owners.length > 0 && (
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="pulse-eyebrow text-[#737373]">İşletme Sahibi</label>
                  <select
                    value={formData.userId}
                    onChange={(e) => setFormData(prev => ({ ...prev, userId: e.target.value }))}
                    className="bz-input w-full cursor-pointer rounded-2xl py-3 text-[14px]"
                  >
                    <option value="">Sahip atanmamış</option>
                    {owners.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {(owner.name || owner.email)} · {owner.plan}
                      </option>
                    ))}
                  </select>
                  <p className="text-[12px] leading-relaxed text-[#737373]">
                    Bu alan işletmenin hangi işletme sahibi hesabına bağlı olduğunu belirler.
                  </p>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="pulse-eyebrow text-[#737373]">Kategori</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="bz-input w-full cursor-pointer rounded-2xl py-3 text-[14px]"
                >
                  <option>Restoran</option>
                  <option>Kafe</option>
                  <option>Otel</option>
                  <option>Klinik</option>
                  <option>Güzellik Merkezi</option>
                  <option>Mağaza</option>
                  <option>Fast Food</option>
                  <option>Fine Dining</option>
                  <option>Meyhane</option>
                  <option>Pastane</option>
                  <option>Diğer</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="pulse-eyebrow text-[#737373]">Tema Rengi</label>
                <div className="flex items-center gap-3 rounded-2xl border border-[#EDEDED] bg-white px-3 py-2">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="h-9 w-9 shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-2 [&::-webkit-color-swatch]:border-white [&::-webkit-color-swatch]:shadow-sm"
                  />
                  <span className="font-mono text-[13px] tabular-nums text-[#525252]" style={{ fontFamily: 'var(--font-mono)' }}>
                    {formData.primaryColor.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#EDEDED] bg-white px-4 py-3">
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-[#0A0A0A]">İşletme Aktif</p>
                <p className="mt-0.5 text-[12px] text-[#737373]">
                  Pasifleştirildiğinde yeni QR taramaları cevap vermez. Buradan duraklatılan
                  işletmeyi owner kendi panelinden yeniden açamaz.
                </p>
              </div>
              <APSwitch
                checked={formData.isActive}
                onChange={(next) => setFormData(prev => ({ ...prev, isActive: next }))}
                ariaLabel="İşletme aktif"
              />
            </div>
          </div>
        </section>

        {/* Contact Info */}
        <section className="overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-[#EDEDED] px-6 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0A0A0A] text-[#C6F24E]">
              <MapPin size={18} strokeWidth={2} />
            </div>
            <div>
              <p className="pulse-eyebrow text-[#737373]">02 / İletişim</p>
              <h3 className="mt-0.5 text-[16px] font-medium text-[#0A0A0A]">Adres ve Telefon</h3>
            </div>
          </div>
          <div className="space-y-4 p-6">
            <div className="space-y-1.5">
              <label className="pulse-eyebrow text-[#737373]">Adres</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Mahall Ankara, Çankaya/Ankara"
                className="w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="pulse-eyebrow text-[#737373]">Telefon</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="0312 123 45 67"
                className="w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
              />
            </div>
          </div>
        </section>

        {/* Notification & Google */}
        <section className="overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-[#EDEDED] px-6 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0A0A0A] text-[#C6F24E]">
              <Mail size={18} strokeWidth={2} />
            </div>
            <div>
              <p className="pulse-eyebrow text-[#737373]">03 / Bildirim & Yönlendirme</p>
              <h3 className="mt-0.5 text-[16px] font-medium text-[#0A0A0A]">E-posta ve Google Bağlantısı</h3>
            </div>
          </div>
          <div className="space-y-4 p-6">
            <div className="space-y-1.5">
              <label className="pulse-eyebrow text-[#737373]">Bildirim E-postası</label>
              <input
                type="email"
                value={formData.notificationEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, notificationEmail: e.target.value }))}
                placeholder="isletme@email.com"
                className="w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
              />
              <p className="text-[12px] leading-relaxed text-[#737373]">
                1-2-3 yıldız puanlarında bu e-posta adresine bildirim gönderilir.
              </p>
            </div>

            {allowedPlatforms.has('google') && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="pulse-eyebrow text-[#737373]">Google Place ID veya Harita Linki</label>
                    <PlatformUrlHelp platform="google" />
                  </div>
                  <input
                    type="text"
                    value={formData.googlePlaceId}
                    onChange={(e) => setFormData(prev => ({ ...prev, googlePlaceId: e.target.value }))}
                    placeholder="ChIJ... veya https://maps.app.goo.gl/..."
                    className="w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 font-mono text-[13px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                  <p className="text-[12px] leading-relaxed text-[#737373]">
                    Mekan kimliğini ya da Google Haritalar yorum linkini direkt ekleyebilirsiniz. Olumlu geri bildirimler buraya yönlendirilir.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Delivery Platforms */}
        {showDeliverySection && (
        <section className="overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-[#EDEDED] px-6 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0A0A0A] text-[#C6F24E]">
              <Globe size={18} strokeWidth={2} />
            </div>
            <div>
              <p className="pulse-eyebrow text-[#737373]">04 / Paket Servis</p>
              <h3 className="mt-0.5 text-[16px] font-medium text-[#0A0A0A]">Teslimat Platformları</h3>
            </div>
          </div>
          <div className="space-y-4 p-6">
            {allowedPlatforms.has('getir') && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="pulse-eyebrow text-[#737373] inline-flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-[#5D3EBC]" aria-hidden />
                    Getir Yemek URL
                  </label>
                  <PlatformUrlHelp platform="getir" />
                </div>
                <input
                  type="url"
                  value={formData.getirYemekUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, getirYemekUrl: e.target.value }))}
                  placeholder="https://getir.com/yemek/..."
                  className="w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-[13px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#5D3EBC] focus:ring-2 focus:ring-[#5D3EBC]/30"
                />
              </div>
            )}

            {allowedPlatforms.has('yemeksepeti') && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="pulse-eyebrow text-[#737373] inline-flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-[#FA0050]" aria-hidden />
                    Yemek Sepeti URL
                  </label>
                  <PlatformUrlHelp platform="yemeksepeti" />
                </div>
                <input
                  type="url"
                  value={formData.yemekSepetiUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, yemekSepetiUrl: e.target.value }))}
                  placeholder="https://www.yemeksepeti.com/..."
                  className="w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-[13px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#FA0050] focus:ring-2 focus:ring-[#FA0050]/30"
                />
              </div>
            )}

            {allowedPlatforms.has('trendyol') && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="pulse-eyebrow text-[#737373] inline-flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-[#F27A1A]" aria-hidden />
                    Trendyol Yemek URL
                  </label>
                  <PlatformUrlHelp platform="trendyol" />
                </div>
                <input
                  type="url"
                  value={formData.trendyolYemekUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, trendyolYemekUrl: e.target.value }))}
                  placeholder="https://www.trendyol.com/..."
                  className="w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-[13px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#F27A1A] focus:ring-2 focus:ring-[#F27A1A]/30"
                />
              </div>
            )}
          </div>
        </section>
        )}

        {/* Sticky save bar */}
        <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-3xl border border-[#EDEDED] bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="bz-btn-danger disabled:opacity-50"
          >
            <Trash2 size={14} strokeWidth={2} />
            {deleting ? 'Siliniyor…' : 'İşletmeyi Sil'}
          </button>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href={`/r/${formData.slug}`}
              target="_blank"
              className="bz-btn-ghost"
            >
              <ExternalLink size={14} strokeWidth={2} />
              Önizle
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="bz-btn-primary disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={2} />}
              {saving ? 'Kaydediliyor…' : 'Değişiklikleri Kaydet'}
            </button>
          </div>
        </div>
      </form>
      {confirmDialog}
    </div>
  );
}

function UrlTile({ label, url, href }: { label: string; url: string; href: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="pulse-eyebrow text-[#737373]">{label}</p>
        <CopyUrlButton url={url} className="h-7 w-7" />
      </div>
      <p className="mt-2 truncate font-mono text-[12px] text-[#0A0A0A]" style={{ fontFamily: 'var(--font-mono)' }}>
        {url}
      </p>
      <Link
        href={href}
        target={href.startsWith('/admin') ? undefined : '_blank'}
        className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#0A0A0A] underline-offset-2 hover:underline"
      >
        Aç
        <ExternalLink size={12} strokeWidth={2} />
      </Link>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#EDEDED] bg-white p-3">
      <div className="flex items-center gap-2 text-[#737373]">
        {icon}
        <p className="pulse-eyebrow">{label}</p>
      </div>
      <p className="mt-2 font-heading text-[22px] font-medium text-[#0A0A0A]">
        {value}
      </p>
    </div>
  );
}

function FeatureToggleCard({
  icon,
  eyebrow,
  title,
  description,
  checked,
  loading,
  disabled,
  onChange,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  checked: boolean;
  loading?: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        checked ? 'border-[#D9EE7A] bg-[#EAF9B8]/35' : 'border-[#EDEDED] bg-white'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <div
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              checked ? 'bg-[#0A0A0A] text-[#C6F24E]' : 'bg-[#F5F5F5] text-[#737373]'
            }`}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className="pulse-eyebrow text-[#737373]">{eyebrow}</p>
            <p className="mt-1 text-[14px] font-medium text-[#0A0A0A]">{title}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#737373]">{description}</p>
          </div>
        </div>
        <APSwitch
          checked={checked}
          onChange={onChange}
          loading={loading}
          disabled={disabled}
          ariaLabel={title}
        />
      </div>
    </div>
  );
}

// Owner-side modules at a glance (2026-10 owner↔admin link). Read-only:
// admin control stays on the master switches below; this card answers
// "what is the owner actually running here?" without impersonating.
function OwnerModulesCard({
  ownerId,
  overview,
  failed,
  surveysEnabled,
}: {
  ownerId: string | null;
  overview: OwnerModulesOverview | null;
  failed: boolean;
  surveysEnabled: boolean;
}) {
  const deletionAt = overview?.owner.scheduledDeletionAt ? new Date(overview.owner.scheduledDeletionAt) : null;
  const deletionDays = deletionAt
    ? Math.max(0, Math.ceil((deletionAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;

  return (
    <section className="overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-[#EDEDED] px-6 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0A0A0A] text-[#C6F24E]">
          <ClipboardCheck size={18} strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p className="pulse-eyebrow text-[#737373]">Owner Modülleri</p>
          <h3 className="mt-0.5 text-[16px] font-medium text-[#0A0A0A]">İşletme sahibinin panelde kullandıkları</h3>
          <p className="mt-1 text-[12px] leading-relaxed text-[#737373]">
            Anket, denetim, ekip ve Google bağlantısı — owner gibi görmeden özet.
          </p>
        </div>
      </div>

      {failed && (
        <div className="px-6 py-5">
          <AlertBanner kind="warn">Owner modülleri özeti yüklenemedi.</AlertBanner>
        </div>
      )}

      {!failed && !overview && (
        <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[92px] rounded-2xl bg-[#F5F5F5]" />
          ))}
        </div>
      )}

      {overview && (
        <div className="space-y-4 p-6">
          {deletionAt && (
            <AlertBanner kind="danger" icon={<ShieldAlert size={14} strokeWidth={2} className="mt-0.5" />}>
              İşletme sahibi hesabını silme talebinde bulundu — {deletionDays} gün içinde
              ({deletionAt.toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })}) kalıcı olarak silinecek.
              Owner kendi panelinden iptal edebilir.
            </AlertBanner>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ModuleTile
              icon={<ClipboardList size={15} />}
              label="Anketler"
              value={String(overview.surveys.total)}
              hint={
                surveysEnabled
                  ? `${overview.surveys.items.filter((s) => s.isActive && s.isPublished).length} yayında`
                  : 'Modül kapalı'
              }
              tone={surveysEnabled ? 'neutral' : 'muted'}
            />
            <ModuleTile
              icon={<ClipboardCheck size={15} />}
              label="Denetim"
              value={String(overview.audits.templates)}
              hint={
                overview.audits.completedResponses > 0
                  ? `${overview.audits.completedResponses} yanıt · ort. %${overview.audits.avgScorePercent ?? '—'}`
                  : 'Henüz yanıt yok'
              }
            />
            <ModuleTile
              icon={<Users size={15} />}
              label="Ekip"
              value={String(overview.team.active)}
              hint={overview.team.invited > 0 ? `${overview.team.invited} davet bekliyor` : 'Aktif üye'}
            />
            <ModuleTile
              icon={<MessageSquare size={15} />}
              label="Google Business"
              value={overview.google.connected ? 'Bağlı' : 'Bağlı değil'}
              hint={
                overview.google.connected
                  ? overview.google.locationTitle ?? 'Konum seçilmedi'
                  : 'Owner hesabını bağlamamış'
              }
              tone={overview.google.connected ? 'neutral' : 'muted'}
            />
            <ModuleTile
              icon={<Link2 size={15} />}
              label="Platform linkleri"
              value={
                overview.platformLinks.failingProviders.length > 0
                  ? `${overview.platformLinks.failingProviders.length} sorunlu`
                  : 'Sağlıklı'
              }
              hint={
                overview.platformLinks.failingProviders.length > 0
                  ? overview.platformLinks.failingProviders.join(', ')
                  : 'Son 24 saatte hata yok'
              }
              tone={overview.platformLinks.failingProviders.length > 0 ? 'attention' : 'neutral'}
            />
          </div>

          {overview.surveys.items.length > 0 && (
            <div className="rounded-2xl border border-[#EDEDED]">
              <p className="pulse-eyebrow border-b border-[#EDEDED] px-4 py-2.5 text-[#737373]">Son anketler</p>
              <ul className="divide-y divide-[#EDEDED]">
                {overview.surveys.items.slice(0, 5).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[#0A0A0A]">{s.title}</p>
                      <p className="text-[11px] text-[#737373]">
                        {s.responseCount} yanıt · {s.isActive && s.isPublished ? 'Yayında' : s.isPublished ? 'Pasif' : 'Taslak'}
                      </p>
                    </div>
                    {s.isActive && s.isPublished && (
                      <Link
                        href={`/s/${s.slug}`}
                        target="_blank"
                        className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-[#0A0A0A] hover:underline underline-offset-2"
                      >
                        Aç <ExternalLink size={11} strokeWidth={2} />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/audits/stats`} className="bz-btn-ghost text-[12px]">
              <ClipboardCheck size={12} strokeWidth={2} />
              Denetim istatistikleri
            </Link>
            {ownerId && (
              // Owner-side + admin changes on this business are logged with
              // the owner's user id as targetId (writePanelAuditLog).
              <Link href={`/admin/audit-logs?targetId=${ownerId}`} className="bz-btn-ghost text-[12px]">
                <ShieldAlert size={12} strokeWidth={2} />
                İşlem kaydı
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function ModuleTile({
  icon,
  label,
  value,
  hint,
  tone = 'neutral',
  href,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  tone?: 'neutral' | 'muted' | 'attention';
  href?: string;
}) {
  const toneClass =
    tone === 'attention'
      ? 'border-[#FDE68A] bg-[#FFFBEB]'
      : tone === 'muted'
        ? 'border-[#EDEDED] bg-[#FAFAFA]'
        : 'border-[#EDEDED] bg-white';
  const body = (
    <>
      <div className="flex items-center gap-2 text-[#737373]">
        {icon}
        <p className="pulse-eyebrow">{label}</p>
      </div>
      <p className="mt-2 truncate text-[20px] font-medium text-[#0A0A0A]">{value}</p>
      <p className="mt-0.5 truncate text-[12px] text-[#737373]" title={hint}>
        {hint}
      </p>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={`block min-w-0 rounded-2xl border p-3 transition-colors hover:border-[#0A0A0A] ${toneClass}`}>
        {body}
      </Link>
    );
  }
  return <div className={`min-w-0 rounded-2xl border p-3 ${toneClass}`}>{body}</div>;
}
