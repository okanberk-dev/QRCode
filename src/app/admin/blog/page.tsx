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
import { AlertBanner, Badge, EmptyState, PageHeader, TableSkeleton, useConfirmDialog } from '@/components/ui';

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

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterLocale, setFilterLocale] = useState<'all' | 'tr' | 'en'>('all');
  const [confirmDialog, askConfirm] = useConfirmDialog();
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/blog');
      const data = await res.json();
      setPosts(Array.isArray(data?.posts) ? data.posts : []);
    } catch {
      setError('Blog yazıları yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Outside click + Escape dismiss the action menu.
  useEffect(() => {
    if (!openMenu) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-action-menu-root]')) {
        setOpenMenu(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [openMenu]);

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
            setSuccess('Yazı silindi.');
            setTimeout(() => setSuccess(''), 3000);
          } else {
            setError('Silme başarısız.');
          }
        } catch {
          setError('Silme başarısız.');
        } finally {
          setOpenMenu(null);
        }
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
    <div className="mx-auto max-w-[1280px] px-4 sm:px-7 py-6 lg:py-8 space-y-3.5">
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
              onClick={() => setFilterLocale(locale)}
              className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                filterLocale === locale
                  ? 'bg-[#0A0A0A] text-white'
                  : 'border border-[#EDEDED] bg-white text-[#525252] hover:border-[#0A0A0A]'
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
      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={22} />}
          title="Yazı bulunamadı"
          body="Filtreleri temizleyin veya yeni bir blog yazısı oluşturun."
          action={
            <Link href="/admin/blog/new" className="bz-btn-primary">
              Yeni yazı oluştur
              <ArrowRight size={14} strokeWidth={2} />
            </Link>
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
                        <div className="font-semibold text-[#0A0A0A] truncate" title={post.title}>
                          {post.title}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <Badge kind="ghost">{post.locale.toUpperCase()}</Badge>
                          <span className="text-[11px] text-[#737373] truncate">{post.description}</span>
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
                      <div className="relative inline-block" data-action-menu-root>
                        <button
                          className="bz-btn-icon"
                          onClick={() => setOpenMenu(openMenu === post.id ? null : post.id)}
                          aria-label="İşlemler"
                          aria-haspopup="menu"
                          aria-expanded={openMenu === post.id}
                        >
                          <MoreHorizontal size={14} strokeWidth={2} />
                        </button>
                        {openMenu === post.id && (
                          <div
                            role="menu"
                            className="bz-menu absolute right-0 top-9 z-30 w-48"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link
                              role="menuitem"
                              href={`/${post.locale}/blog/${post.slug}`}
                              target="_blank"
                              className="bz-menu-item"
                              onClick={() => setOpenMenu(null)}
                            >
                              <Eye size={13} strokeWidth={2} />
                              Public görüntüle
                            </Link>
                            <Link
                              role="menuitem"
                              href={`/admin/blog/${post.id}`}
                              className="bz-menu-item"
                              onClick={() => setOpenMenu(null)}
                            >
                              <Pencil size={13} strokeWidth={2} />
                              Düzenle
                            </Link>
                            <div className="bz-menu-divider" />
                            <button
                              role="menuitem"
                              onClick={() => {
                                setOpenMenu(null);
                                handleDelete(post.id, post.title);
                              }}
                              className="bz-menu-item danger"
                            >
                              <Trash2 size={13} strokeWidth={2} />
                              Sil
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: card list */}
          <div className="divide-y divide-[#EDEDED] lg:hidden">
            {filtered.map(post => (
              <article key={post.id} className="p-4 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <Badge kind="ghost">{post.locale.toUpperCase()}</Badge>
                  {post.isActive ? <Badge kind="ok">Yayında</Badge> : <Badge kind="ghost">Taslak</Badge>}
                </div>
                <Link href={`/admin/blog/${post.id}`} className="block">
                  <h3 className="text-[15px] font-medium text-[#0A0A0A] tracking-[-0.015em]">{post.title}</h3>
                  <p className="mt-0.5 line-clamp-2 text-[12px] text-[#737373]">{post.description}</p>
                </Link>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#A3A3A3]">
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
      {confirmDialog}
    </div>
  );
}
