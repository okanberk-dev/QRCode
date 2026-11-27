'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Eye,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import {
  AlertBanner,
  Badge,
  EmptyState,
  PageHeader,
  PulseMenu,
  PulseMenuDivider,
  PulseMenuItem,
  useConfirmDialog,
} from '@/components/ui';
import { SkTable } from '@/components/ui/skeletons/PageSkeleton';

interface BlogPost {
  id: string;
  slug: string;
  locale: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  author: string;
  coverImage: string;
  isActive: boolean;
  viewCount?: number;
}

interface AdminBlogClientProps {
  initialPosts?: BlogPost[];
  /** Total post count (server prefetch). Drives "Daha fazla yükle". */
  initialTotal?: number;
}

// /api/admin/blog caps a page at 100 rows.
const PAGE_SIZE = 100;

export default function AdminBlogClient({ initialPosts, initialTotal }: AdminBlogClientProps) {
  // §40.10 server-hydration — initialPosts undefined ise client'ta fetch yapılır,
  // doluysa çift skeleton flash önlenir (loading.tsx → mount → data hazır).
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts ?? []);
  const [loading, setLoading] = useState(initialPosts === undefined);
  const [total, setTotal] = useState<number>(initialTotal ?? initialPosts?.length ?? 0);
  const [loadedPage, setLoadedPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterLocale, setFilterLocale] = useState<'all' | 'tr' | 'en'>('all');
  const [confirmDialog, askConfirm] = useConfirmDialog();
  const [search, setSearch] = useState('');

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/blog?limit=${PAGE_SIZE}&page=1`);
      const data = await res.json();
      const list: BlogPost[] = Array.isArray(data?.posts) ? data.posts : [];
      setPosts(list);
      setTotal(typeof data?.meta?.total === 'number' ? data.meta.total : list.length);
      setLoadedPage(1);
    } catch {
      setError('Blog yazıları yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMorePosts = async () => {
    setLoadingMore(true);
    try {
      const nextPage = loadedPage + 1;
      const res = await fetch(`/api/admin/blog?limit=${PAGE_SIZE}&page=${nextPage}`);
      const data = await res.json();
      const list: BlogPost[] = Array.isArray(data?.posts) ? data.posts : [];
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...list.filter((p) => !seen.has(p.id))];
      });
      if (typeof data?.meta?.total === 'number') setTotal(data.meta.total);
      setLoadedPage(nextPage);
    } catch {
      setError('Blog yazıları yüklenemedi.');
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (initialPosts === undefined) {
      fetchPosts();
    }
  }, [fetchPosts, initialPosts]);

  // Outside-click + ESC + focus restore artık `PulseMenu` (Radix) tarafından
  // yönetilir; eski `openMenu` state + `data-action-menu-root` listener
  // pattern'i (Phase 11.18 paterni) kaldırıldı.

  const handleSeed = async () => {
    setSeeding(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/blog/seed');
      const data = await res.json();
      if (data.success) {
        setSuccess(`${data.seeded} blog yazısı veritabanına aktarıldı.`);
        fetchPosts();
      } else {
        setError(data.error || 'Seed başarısız oldu.');
      }
    } catch {
      setError('Seed sırasında hata oluştu.');
    } finally {
      setSeeding(false);
      setTimeout(() => setSuccess(''), 4000);
    }
  };

  const handleDelete = (id: string, title: string) => {
    askConfirm({
      variant: 'danger',
      title: 'Bu blog yazısını sil',
      body: `"${title}" yazısını kalıcı olarak silmek istediğinden emin misin? Bu işlem geri alınamaz.`,
      confirmLabel: 'Sil',
      cancelLabel: 'Vazgeç',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' });
          if (res.ok) {
            setPosts(prev => prev.filter(post => post.id !== id));
            setTotal(t => Math.max(0, t - 1));
            setSuccess('Yazı silindi.');
            setTimeout(() => setSuccess(''), 3000);
          } else {
            setError('Silme başarısız.');
          }
        } catch {
          setError('Silme başarısız.');
        }
        // PulseMenu (Radix DropdownMenu) onSelect sonrası kendi state'ini
        // kapatır — eski `setOpenMenu(null)` artık gereksiz.
      },
    });
  };

  const filtered = posts.filter(post => {
    const matchesLocale = filterLocale === 'all' || post.locale === filterLocale;
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [post.title, post.description, post.slug, post.author].some(value =>
        value.toLowerCase().includes(query),
      );
    return matchesLocale && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-3.5">
      <PageHeader
        eyebrow="BLOG"
        title="İçerik yönetimi"
        actions={
          <>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="bz-btn-ghost"
            >
              {seeding ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Örnekleri aktar
            </button>
            <Link href="/admin/blog/new" className="bz-btn-primary">
              <Plus size={14} strokeWidth={2} />
              Yeni yazı
            </Link>
          </>
        }
      />

      {/* Filters: search + locale tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A3A3A3]" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Başlık, yazar veya slug ara..."
            aria-label="Blog yazısı ara"
            className="bz-input"
            style={{ paddingLeft: 36 }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          {(['all', 'tr', 'en'] as const).map(locale => (
            <button
              key={locale}
              type="button"
              aria-pressed={filterLocale === locale}
              onClick={() => setFilterLocale(locale)}
              className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                filterLocale === locale
                  ? 'bg-pn-accent text-white'
                  : 'border border-pn-line bg-white text-[#525252] hover:border-pn-ink'
              }`}
            >
              {locale === 'all' ? 'Tümü' : locale.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError('')}>
          {error}
        </AlertBanner>
      )}
      {success && <AlertBanner kind="success">{success}</AlertBanner>}

      {/* Table — 1:1 design AdminBlog */}
      {loading && posts.length === 0 ? (
        <SkTable rows={6} cols={6} />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={22} />}
          title="Henüz blog yazısı yok"
          body="İlk yazını oluştur ya da hazır örnek yazıları içeri aktar."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link href="/admin/blog/new" className="bz-btn-primary">
                Yeni yazı oluştur
                <ArrowRight size={14} strokeWidth={2} />
              </Link>
              <button onClick={handleSeed} disabled={seeding} className="bz-btn-ghost">
                {seeding ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Örnekleri aktar
              </button>
            </div>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={22} />}
          title="Yazı bulunamadı"
          body="Arama veya dil filtresiyle eşleşen yazı yok."
          action={
            <button
              onClick={() => {
                setSearch('');
                setFilterLocale('all');
              }}
              className="bz-btn-ghost"
            >
              Filtreleri temizle
            </button>
          }
        />
      ) : (
        <div className="bz-card overflow-hidden">
          {/* Desktop: bz-table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="bz-table">
              <thead>
                <tr>
                  <th>Başlık</th>
                  <th>Yazar</th>
                  <th>Yayın tarihi</th>
                  <th>Görüntülenme</th>
                  <th>Durum</th>
                  <th aria-label="İşlemler" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(post => (
                  <tr key={post.id}>
                    <td style={{ maxWidth: 420 }}>
                      <Link href={`/admin/blog/${post.id}`} className="block">
                        <div className="font-medium text-pn-ink truncate" title={post.title}>
                          {post.title}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <Badge kind="ghost">{post.locale.toUpperCase()}</Badge>
                          <span className="text-[12px] text-[#737373] truncate">{post.description}</span>
                        </div>
                      </Link>
                    </td>
                    <td>{post.author}</td>
                    <td>{post.date || '—'}</td>
                    <td className="bz-mono">
                      {(post.viewCount ?? 0).toLocaleString('tr-TR')}
                    </td>
                    <td>
                      {post.isActive ? (
                        <Badge kind="ok">Yayında</Badge>
                      ) : (
                        <Badge kind="ghost">Taslak</Badge>
                      )}
                    </td>
                    <td>
                      <PulseMenu
                        trigger={
                          <button
                            type="button"
                            className="bz-btn-icon"
                            aria-label="İşlemler"
                          >
                            <MoreHorizontal size={14} strokeWidth={2} />
                          </button>
                        }
                        className="sm:w-48"
                      >
                        <PulseMenuItem
                          icon={<Eye size={13} strokeWidth={2} />}
                          onSelect={() => {
                            window.open(`/${post.locale}/blog/${post.slug}`, '_blank', 'noopener');
                          }}
                        >
                          Public görüntüle
                        </PulseMenuItem>
                        <PulseMenuItem
                          icon={<Pencil size={13} strokeWidth={2} />}
                          onSelect={() => {
                            window.location.href = `/admin/blog/${post.id}`;
                          }}
                        >
                          Düzenle
                        </PulseMenuItem>
                        <PulseMenuDivider />
                        <PulseMenuItem
                          icon={<Trash2 size={13} strokeWidth={2} />}
                          danger
                          onSelect={() => handleDelete(post.id, post.title)}
                        >
                          Sil
                        </PulseMenuItem>
                      </PulseMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: card list */}
          <div className="divide-y divide-pn-line lg:hidden">
            {filtered.map(post => (
              <article key={post.id} className="p-4 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <Badge kind="ghost">{post.locale.toUpperCase()}</Badge>
                  {post.isActive ? <Badge kind="ok">Yayında</Badge> : <Badge kind="ghost">Taslak</Badge>}
                </div>
                <Link href={`/admin/blog/${post.id}`} className="block">
                  <h3 className="text-[15px] font-medium text-pn-ink tracking-[-0.015em]">{post.title}</h3>
                  <p className="mt-0.5 line-clamp-2 text-[12px] text-[#737373]">{post.description}</p>
                </Link>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#A3A3A3]">
                  <span>{post.author}</span>
                  {post.date && <span>{post.date}</span>}
                  {post.readTime && <span>{post.readTime}</span>}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Link
                    href={`/${post.locale}/blog/${post.slug}`}
                    target="_blank"
                    className="bz-btn-icon"
                    aria-label="Public görüntüle"
                  >
                    <Eye size={14} />
                  </Link>
                  <Link
                    href={`/admin/blog/${post.id}`}
                    className="bz-btn-icon"
                    aria-label="Düzenle"
                  >
                    <Pencil size={14} />
                  </Link>
                  <button
                    onClick={() => handleDelete(post.id, post.title)}
                    className="bz-btn-icon"
                    aria-label="Sil"
                  >
                    <Trash2 size={14} className="text-[#991B1B]" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
      {!loading && posts.length < total && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-[12px] text-[#737373]">
            {posts.length} / {total} yazı yüklendi
            {search.trim() || filterLocale !== 'all' ? ' · filtreler yalnızca yüklenen yazılarda çalışır' : ''}
          </p>
          <button
            type="button"
            onClick={loadMorePosts}
            disabled={loadingMore}
            className="bz-btn-ghost disabled:opacity-50"
          >
            {loadingMore ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} strokeWidth={2} />}
            Daha fazla yükle
          </button>
        </div>
      )}
      {confirmDialog}
    </div>
  );
}
