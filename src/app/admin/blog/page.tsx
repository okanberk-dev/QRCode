'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { AlertBanner, Badge, EmptyState, PageHeader } from '@/components/ui';

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
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterLocale, setFilterLocale] = useState<'all' | 'tr' | 'en'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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

  const handleDelete = async (id: string) => {
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
      setDeleteConfirm(null);
    }
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

  const activeCount = posts.filter(post => post.isActive).length;
  const draftCount = posts.length - activeCount;

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-5">
      <PageHeader
        eyebrow="BLOG"
        title="İçerik yönetimi"
        description="Yazıları listele, düzenle ve yeni içerikleri tam sayfa editörde hazırla."
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

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="bz-card p-5">
          <p className="pulse-eyebrow" style={{ color: '#737373' }}>Toplam yazı</p>
          <p className="bz-h-tight-2 mt-2" style={{ fontSize: 28 }}>{posts.length}</p>
        </div>
        <div
          className="p-5"
          style={{ background: '#EAF9B8', borderRadius: 16, border: '1px solid #D9EE7A' }}
        >
          <p className="pulse-eyebrow" style={{ color: '#4D5C00' }}>Yayında</p>
          <p className="bz-h-tight-2 mt-2" style={{ fontSize: 28 }}>{activeCount}</p>
        </div>
        <div className="bz-card-soft p-5">
          <p className="pulse-eyebrow" style={{ color: '#737373' }}>Taslak</p>
          <p className="bz-h-tight-2 mt-2" style={{ fontSize: 28 }}>{draftCount}</p>
        </div>
      </section>

        <section className="grid gap-3 rounded-[24px] border border-[#EDEDED] bg-white p-3 shadow-sm lg:grid-cols-[minmax(260px,1fr)_auto] lg:items-center">
          <div className="relative">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#737373]" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Başlık, açıklama, yazar veya slug ara..."
              className="w-full rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] py-3 pl-11 pr-4 text-sm font-semibold outline-none focus:border-[#C6F24E] focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {(['all', 'tr', 'en'] as const).map(locale => (
              <button
                key={locale}
                onClick={() => setFilterLocale(locale)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                  filterLocale === locale
                    ? 'bg-[#0A0A0A] text-white'
                    : 'text-[#737373] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]'
                }`}
              >
                {locale === 'all' ? 'Tümü' : locale.toUpperCase()}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <AlertBanner kind="danger" onDismiss={() => setError('')}>
            {error}
          </AlertBanner>
        )}

        {success && <AlertBanner kind="success">{success}</AlertBanner>}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={32} className="animate-spin text-[#A8D62E]" />
          </div>
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
          <div className="space-y-3">
            {filtered.map(post => (
              <article
                key={post.id}
                className={`grid gap-4 rounded-[24px] border bg-white p-4 transition-all hover:border-[#C6F24E] hover:shadow-sm lg:grid-cols-[96px_minmax(0,1fr)_auto] lg:items-center ${
                  post.isActive ? 'border-[#EDEDED]' : 'border-[#EDEDED] opacity-70'
                }`}
              >
                <Link
                  href={`/admin/blog/${post.id}`}
                  className="h-20 w-24 overflow-hidden rounded-2xl border border-[#EDEDED] bg-[#FAFAFA]"
                >
                  {post.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.coverImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <BookOpen size={22} className="text-[#A3A3A3]" />
                    </div>
                  )}
                </Link>

                <Link href={`/admin/blog/${post.id}`} className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <Badge kind="ghost">{post.locale.toUpperCase()}</Badge>
                    <Badge kind={post.isActive ? 'ok' : 'off'}>
                      {post.isActive ? 'Yayında' : 'Taslak'}
                    </Badge>
                  </div>
                  <h2 className="truncate text-lg font-medium tracking-[-0.025em] text-[#0A0A0A]">
                    {post.title}
                  </h2>
                  <p className="mt-1 line-clamp-1 text-sm font-medium text-[#737373]">
                    {post.description}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#A3A3A3]">
                    <span>{post.date}</span>
                    <span>•</span>
                    <span>{post.readTime}</span>
                    <span>•</span>
                    <span>{post.author}</span>
                  </div>
                </Link>

                <div className="flex items-center gap-2 border-t border-[#EDEDED] pt-4 lg:border-t-0 lg:pt-0">
                  <Link
                    href={`/${post.locale}/blog/${post.slug}`}
                    target="_blank"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-[#EDEDED] text-[#737373] hover:text-[#0A0A0A] transition-colors"
                    title="Public görüntüle"
                  >
                    <Eye size={17} />
                  </Link>
                  <Link
                    href={`/admin/blog/${post.id}`}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-[#EDEDED] text-[#737373] hover:text-[#0A0A0A] transition-colors"
                    title="Düzenle"
                  >
                    <Pencil size={17} />
                  </Link>
                  {deleteConfirm === post.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
                      >
                        Sil
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="rounded-full bg-[#FAFAFA] px-4 py-2 text-xs font-semibold text-[#737373] hover:text-[#0A0A0A]"
                      >
                        Vazgeç
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(post.id)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      title="Sil"
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
    </div>
  );
}
