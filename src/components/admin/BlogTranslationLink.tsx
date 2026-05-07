'use client';

import { useEffect, useState } from 'react';
import { Languages, Link2, Loader2, Unlink } from 'lucide-react';
import { AlertBanner } from '@/components/ui';

interface CandidatePost {
  id: string;
  slug: string;
  title: string;
  locale: 'tr' | 'en';
  isActive: boolean;
  translationGroupId: string | null;
}

interface Props {
  postId: string;
  locale: 'tr' | 'en';
  translationGroupId: string | null;
  /** Called when a link/unlink succeeds — parent should refetch the post. */
  onChanged: () => void;
}

/**
 * Admin paneli içinde bir blog yazısını karşı dildeki yazıya eşleştirme
 * widget'ı. Mevcut bağlantı varsa karşı yazıyı gösterir + "Bağlantıyı
 * kaldır"; yoksa karşı locale'deki adayları dropdown'da listeler +
 * "Eşleştir".
 *
 * Karşılığı: BlogPost.translationGroupId (Prisma schema). API:
 * /api/admin/blog/[id]/link-translation (POST/DELETE).
 */
export default function BlogTranslationLink({
  postId,
  locale,
  translationGroupId,
  onChanged,
}: Props) {
  const otherLocale: 'tr' | 'en' = locale === 'tr' ? 'en' : 'tr';

  const [counterpart, setCounterpart] = useState<CandidatePost | null>(null);
  const [candidates, setCandidates] = useState<CandidatePost[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Karşı locale'deki post'ları çek (mode'a göre filter):
  // - Eşleşme varsa, içlerinden translationGroupId === bizim grubumuz olanı
  //   "counterpart" olarak ayır; geri kalanlar dropdown'da gösterilmez.
  // - Eşleşme yoksa, hepsi dropdown'da görünür.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/blog?locale=${otherLocale}&limit=100`, {
          cache: 'no-store',
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || 'Liste alınamadı.');
        }
        if (cancelled) return;
        const posts: CandidatePost[] = (data.posts || []).map(
          (p: {
            id: string;
            slug: string;
            title: string;
            locale: string;
            isActive: boolean;
            translationGroupId: string | null;
          }) => ({
            id: p.id,
            slug: p.slug,
            title: p.title,
            locale: p.locale === 'en' ? 'en' : 'tr',
            isActive: p.isActive,
            translationGroupId: p.translationGroupId,
          }),
        );
        if (translationGroupId) {
          const match = posts.find((p) => p.translationGroupId === translationGroupId);
          setCounterpart(match || null);
          setCandidates(posts.filter((p) => p.id !== match?.id));
        } else {
          setCounterpart(null);
          setCandidates(posts);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Yükleme hatası.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [postId, otherLocale, translationGroupId]);

  const handleLink = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/blog/${postId}/link-translation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otherId: selectedId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || 'Eşleştirilemedi.');
        return;
      }
      setSelectedId('');
      onChanged();
    } catch {
      setError('Bağlantı hatası.');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/blog/${postId}/link-translation`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || 'Bağlantı kaldırılamadı.');
        return;
      }
      onChanged();
    } catch {
      setError('Bağlantı hatası.');
    } finally {
      setSaving(false);
    }
  };

  const otherLabel = otherLocale === 'tr' ? 'Türkçe' : 'İngilizce';

  return (
    <div className="rounded-2xl border border-[#EDEDED] bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        <Languages size={14} className="text-[#737373]" />
        <p className="pulse-eyebrow text-[#737373]">DİL EŞLEŞMESİ</p>
      </div>
      <p className="mb-4 text-[12px] leading-[1.55] text-[#737373]">
        Bu yazının {otherLabel.toLowerCase()} karşılığını seçin. Public sayfada
        kullanıcı dil değiştirdiğinde otomatik bu yazıya gider; aksi halde
        kör URL eşleşmesi 404 verir.
      </p>

      {error && (
        <div className="mb-3">
          <AlertBanner kind="danger" onDismiss={() => setError(null)}>
            {error}
          </AlertBanner>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-[12px] text-[#737373]">
          <Loader2 size={12} className="animate-spin" /> Adaylar yükleniyor…
        </div>
      ) : counterpart ? (
        <div className="rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="pulse-eyebrow text-[#737373]">
                {otherLabel.toUpperCase()} HALİ
              </p>
              <p className="mt-1 truncate text-[13px] font-semibold text-[#0A0A0A]">
                {counterpart.title}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-[#737373]">
                /{counterpart.locale}/blog/{counterpart.slug}
                {!counterpart.isActive && ' · Taslak'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleUnlink}
              disabled={saving}
              className="bz-btn-danger bz-btn-sm shrink-0 disabled:opacity-60"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Unlink size={12} />}
              Bağlantıyı kaldır
            </button>
          </div>
        </div>
      ) : candidates.length === 0 ? (
        <p className="text-[12px] text-[#737373]">
          Henüz {otherLabel.toLowerCase()} bir yazı yok. Önce karşı dilde bir
          yazı oluşturun, sonra buradan eşleştirin.
        </p>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="bz-input flex-1"
          >
            <option value="">— {otherLabel} yazıyı seç —</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
                {!c.isActive ? ' (taslak)' : ''}
                {c.translationGroupId ? ' · ⚠ başka grup' : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleLink}
            disabled={!selectedId || saving}
            className="bz-btn-primary inline-flex items-center gap-2"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
            Eşleştir
          </button>
        </div>
      )}
    </div>
  );
}
