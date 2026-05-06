'use client';

import { useState, useEffect, type FormEvent, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Save, ArrowLeft, Trash2, ExternalLink, Mail, UtensilsCrossed, Eye, EyeOff, Building2, MapPin, Globe, AlertTriangle, CheckCircle2, QrCode, MessageSquare, Link2, Users, Sparkles, Code, BarChart3, Send } from 'lucide-react';
import Link from 'next/link';
import PlatformUrlHelp from '@/components/admin/PlatformUrlHelp';
import CopyUrlButton from '@/components/dashboard/CopyUrlButton';
import { AlertBanner, Toggle, useConfirmDialog } from '@/components/ui';
import { getSectorPlatforms } from '@/lib/sector-platforms';

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
  | 'campaignsEnabled';

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
  const [pulseAiEnabled, setPulseAiEnabled] = useState(true);
  const [aiAnalyticsEnabled, setAiAnalyticsEnabled] = useState(true);
  const [externalPlatformsEnabled, setExternalPlatformsEnabled] = useState(true);
  const [campaignsEnabled, setCampaignsEnabled] = useState(true);
  const [featureSaving, setFeatureSaving] = useState<FeatureToggleKey | null>(null);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [meta, setMeta] = useState<RestaurantMeta | null>(null);
  const [embedStats, setEmbedStats] = useState<{ totalViews: number; byDomain: { domain: string; count: number; lastSeen: string | null }[] } | null>(null);
  const [embedStatsLoading, setEmbedStatsLoading] = useState(false);

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
          setPulseAiEnabled(data.pulseAiEnabled ?? true);
          setAiAnalyticsEnabled(data.aiAnalyticsEnabled ?? true);
          setExternalPlatformsEnabled(data.externalPlatformsEnabled ?? true);
          setCampaignsEnabled(data.campaignsEnabled ?? true);
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

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/members');
        if (res.ok) {
          const data = await res.json();
          setOwners(Array.isArray(data) ? data : []);
        }
      } catch {
        // Only superadmin can list owners; scoped users simply don't see the selector.
      }
    })();
  }, []);

  // Widget embed stats — hangi domain bu işletmenin widget'ını yüklüyor
  useEffect(() => {
    if (!id || loading) return;
    let cancelled = false;
    setEmbedStatsLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/restaurants/${id}/embed-stats?days=30&limit=15`);
        if (!cancelled && res.ok) setEmbedStats(await res.json());
      } catch { /* sessiz hata */ } finally {
        if (!cancelled) setEmbedStatsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, loading]);

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
    if (next.campaignsEnabled !== undefined) setCampaignsEnabled(Boolean(next.campaignsEnabled));
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
      campaignsEnabled,
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
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6 md:p-10">
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

        {/* Widget embed kullanımı — admin-only */}
        <section className="rounded-3xl border border-[#EDEDED] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EAF9B8] text-[#0A0A0A]">
              <Globe size={18} strokeWidth={2} />
            </div>
            <div>
              <p className="pulse-eyebrow text-[#737373]">Widget</p>
              <h2 className="mt-0.5 text-[16px] font-medium text-[#0A0A0A]">Kullanan siteler</h2>
              <p className="mt-0.5 text-[12px] text-[#737373]">Son 30 günde bu işletmenin widget&apos;ını yükleyen alan adları.</p>
            </div>
          </div>
          {embedStatsLoading ? (
            <div className="flex items-center gap-2 text-[13px] text-[#737373] py-4">
              <Loader2 size={14} className="animate-spin" />
              Yükleniyor…
            </div>
          ) : !embedStats || embedStats.byDomain.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-6 text-center">
              <Code size={22} className="mx-auto mb-2 text-[#A3A3A3]" />
              <p className="text-[12px] text-[#737373]">Widget henüz hiçbir siteden yüklenmedi.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#EDEDED]">
              <table className="w-full text-[13px]">
                <thead className="bg-[#FAFAFA]">
                  <tr className="text-left">
                    <th className="px-4 py-2.5 pulse-eyebrow text-[#737373]">ALAN ADI</th>
                    <th className="px-4 py-2.5 pulse-eyebrow text-[#737373] text-right">GÖRÜNTÜ</th>
                    <th className="px-4 py-2.5 pulse-eyebrow text-[#737373] text-right">SON</th>
                  </tr>
                </thead>
                <tbody>
                  {embedStats.byDomain.map((d) => (
                    <tr key={d.domain} className="border-t border-[#EDEDED] hover:bg-[#FAFAFA]">
                      <td className="px-4 py-3 font-medium truncate max-w-[300px]" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{d.domain}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">{d.count.toLocaleString('tr-TR')}</td>
                      <td className="px-4 py-3 text-right text-[#737373] text-[12px]">
                        {d.lastSeen ? `${Math.max(0, Math.floor((Date.now() - new Date(d.lastSeen).getTime()) / 60000))} dk önce` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-[#EDEDED] bg-[#FAFAFA] px-4 py-2 text-[11px] text-[#737373]">
                Toplam {embedStats.totalViews.toLocaleString('tr-TR')} görüntü · son 30 gün
              </div>
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
              className="inline-flex items-center gap-2 rounded-full border border-[#EDEDED] bg-white px-4 py-2 text-[13px] font-medium text-[#0A0A0A] shadow-sm transition-all hover:border-[#0A0A0A] active:scale-95"
            >
              <Eye size={14} strokeWidth={2} />
              Menüyü Görüntüle
            </Link>
            <Link
              href={`/tr/dashboard/restaurants/${id}/menu`}
              className="inline-flex items-center gap-2 rounded-full bg-[#0A0A0A] px-4 py-2 text-[13px] font-medium text-white shadow-sm transition-all hover:bg-[#1A1A1A] active:scale-95"
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
            icon={<Send size={17} strokeWidth={2.2} />}
            eyebrow="Pazarlama"
            title="Kampanyalar"
            description="Owner panelden müşterilere e-posta kampanyası gönderme. Sadece pazarlama onayı veren müşteriler hedef alınır."
            checked={campaignsEnabled}
            loading={featureSaving === 'campaignsEnabled'}
            onChange={(next) => saveFeatureSetting({ campaignsEnabled: next })}
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
                    className="w-full cursor-pointer rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
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
                  className="w-full cursor-pointer rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
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

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 transition-colors hover:bg-[#FAFAFA]">
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-[#0A0A0A]">İşletme Aktif</p>
                <p className="mt-0.5 text-[12px] text-[#737373]">
                  Pasifleştirildiğinde yeni QR taramaları cevap vermez.
                </p>
              </div>
              <div className="relative shrink-0">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-[#EDEDED] transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-[''] peer-checked:bg-[#0A0A0A] peer-checked:after:translate-x-full peer-focus-visible:ring-2 peer-focus-visible:ring-[#C6F24E]/60" />
              </div>
            </label>
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
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#FECACA] bg-white px-4 py-2.5 text-[13px] font-medium text-[#DC2626] transition-all hover:border-[#FCA5A5] hover:bg-[#FEF2F2] active:scale-95 disabled:opacity-50"
          >
            <Trash2 size={14} strokeWidth={2} />
            {deleting ? 'Siliniyor…' : 'İşletmeyi Sil'}
          </button>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href={`/r/${formData.slug}`}
              target="_blank"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#EDEDED] bg-white px-5 py-2.5 text-[13px] font-medium text-[#0A0A0A] transition-all hover:border-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95"
            >
              <ExternalLink size={14} strokeWidth={2} />
              Önizle
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 py-2.5 text-[13px] font-medium text-white shadow-sm transition-all hover:bg-[#1A1A1A] active:scale-95 disabled:opacity-50"
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
        <Toggle
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
