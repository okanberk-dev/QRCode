'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, BookOpen, Globe, Eye, EyeOff, X, Save, Loader2, RefreshCw } from 'lucide-react';

interface BlogPost {
  id: string;
  slug: string;
  locale: string;
  title: string;
  description: string;
  content: string;
  date: string;
  readTime: string;
  author: string;
  coverImage: string;
  isActive: boolean;
  createdAt: string;
}

const EMPTY_FORM = {
  slug: '',
  locale: 'tr',
  title: '',
  description: '',
  content: '',
  date: '',
  readTime: '',
  author: 'Buaze İçerik Ekibi',
  coverImage: '',
  isActive: true,
};

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterLocale, setFilterLocale] = useState<'all' | 'tr' | 'en'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/blog');
      const data = await res.json();
      setPosts(data.posts || []);
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
        setSuccess(`${data.seeded} blog yazısı veritabanına aktarıldı!`);
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

  const openNew = () => {
    setEditingPost(null);
    setForm({ ...EMPTY_FORM, date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) });
    setShowForm(true);
    setError('');
  };

  const openEdit = (post: BlogPost) => {
    setEditingPost(post);
    setForm({
      slug: post.slug,
      locale: post.locale,
      title: post.title,
      description: post.description,
      content: post.content,
      date: post.date,
      readTime: post.readTime,
      author: post.author,
      coverImage: post.coverImage,
      isActive: post.isActive,
    });
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const url = editingPost ? `/api/admin/blog/${editingPost.id}` : '/api/admin/blog';
      const method = editingPost ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'İşlem başarısız.');
        return;
      }
      setSuccess(editingPost ? 'Yazı güncellendi!' : 'Yeni yazı oluşturuldu!');
      setShowForm(false);
      fetchPosts();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Kaydetme sırasında hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPosts(p => p.filter(x => x.id !== id));
        setSuccess('Yazı silindi.');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch {
      setError('Silme başarısız.');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const filtered = filterLocale === 'all' ? posts : posts.filter(p => p.locale === filterLocale);

  return (
    <div className="flex-1 overflow-y-auto bg-[#0f1117] min-h-screen p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#FDBF1D]/10 border border-[#FDBF1D]/30 rounded-2xl flex items-center justify-center">
            <BookOpen size={24} className="text-[#FDBF1D]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Blog Yönetimi</h1>
            <p className="text-gray-500 text-sm">{posts.length} yazı kayıtlı</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl text-sm font-bold transition-all"
          >
            {seeding ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Mevcut Yazıları Aktar
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#FDBF1D] text-[#111827] rounded-xl font-black text-sm hover:bg-[#f5b914] transition-all shadow-lg shadow-[#FDBF1D]/20"
          >
            <Plus size={18} strokeWidth={3} />
            Yeni Yazı
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4 text-red-400 font-bold flex items-center justify-between">
          {error}
          <button onClick={() => setError('')}><X size={16} /></button>
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-2xl px-5 py-4 text-green-400 font-bold">
          {success}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2 mb-6">
        {(['all', 'tr', 'en'] as const).map(l => (
          <button
            key={l}
            onClick={() => setFilterLocale(l)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              filterLocale === l
                ? 'bg-[#FDBF1D] text-[#111827]'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {l === 'all' ? 'Tümü' : l === 'tr' ? '🇹🇷 Türkçe' : '🇺🇸 English'}
          </button>
        ))}
      </div>

      {/* Blog Posts Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-[#FDBF1D]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-gray-500 space-y-3">
          <BookOpen size={48} className="mx-auto opacity-20" />
          <p className="text-lg font-bold">Henüz yazı yok</p>
          <p className="text-sm">Yukarıdan "Mevcut Yazıları Aktar" butonuna tıklayarak mevcut blog yazılarınızı veritabanına ekleyin veya "Yeni Yazı" ile başlayın.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(post => (
            <div
              key={post.id}
              className={`bg-[#1a1f2e] border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-all ${
                post.isActive ? 'border-white/10' : 'border-white/5 opacity-60'
              }`}
            >
              {/* Cover Thumb */}
              <div className="w-20 h-14 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 border border-white/10">
                {post.coverImage ? (
                  <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen size={20} className="text-gray-600" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    post.locale === 'tr' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {post.locale === 'tr' ? '🇹🇷 TR' : '🇺🇸 EN'}
                  </span>
                  {!post.isActive && (
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400">
                      Pasif
                    </span>
                  )}
                </div>
                <h3 className="text-white font-bold text-sm leading-tight truncate">{post.title}</h3>
                <p className="text-gray-500 text-xs mt-1 truncate">{post.slug} • {post.date} • {post.readTime}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={`https://buaze.com/${post.locale}/blog/${post.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                  title="Siteyi Görüntüle"
                >
                  <Eye size={16} />
                </a>
                <button
                  onClick={() => openEdit(post)}
                  className="p-2.5 rounded-xl bg-[#FDBF1D]/10 text-[#FDBF1D] hover:bg-[#FDBF1D]/20 transition-all"
                  title="Düzenle"
                >
                  <Pencil size={16} />
                </button>
                {deleteConfirm === post.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="px-3 py-1.5 text-xs font-black text-white bg-red-600 hover:bg-red-500 rounded-lg transition-all"
                    >
                      Sil
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-3 py-1.5 text-xs font-black text-gray-400 bg-white/5 rounded-lg transition-all"
                    >
                      İptal
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(post.id)}
                    className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                    title="Sil"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[#1a1f2e] border border-white/10 rounded-3xl w-full max-w-3xl my-8 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FDBF1D]/10 rounded-xl flex items-center justify-center">
                  {editingPost ? <Pencil size={18} className="text-[#FDBF1D]" /> : <Plus size={18} className="text-[#FDBF1D]" />}
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">{editingPost ? 'Yazıyı Düzenle' : 'Yeni Blog Yazısı'}</h2>
                  <p className="text-gray-500 text-xs">{editingPost ? editingPost.title : 'Yeni bir içerik yazısı oluştur'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm font-bold">{error}</div>
              )}

              {/* Locale + Slug */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Dil</label>
                  <div className="flex gap-2">
                    {(['tr', 'en'] as const).map(l => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, locale: l }))}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all border ${
                          form.locale === l
                            ? 'bg-[#FDBF1D] text-[#111827] border-[#FDBF1D]'
                            : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {l === 'tr' ? '🇹🇷 TR' : '🇺🇸 EN'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Slug (URL)</label>
                  <input
                    type="text"
                    required
                    value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                    placeholder="how-to-get-5-stars"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-mono placeholder-gray-600 focus:outline-none focus:border-[#FDBF1D]/50 transition-all"
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Başlık</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder={form.locale === 'tr' ? "Müşterilerinize 5 Yıldız Nasıl Kazandırırsınız?" : "How to Get 5 Stars on Google?"}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FDBF1D]/50 transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Açıklama (SEO Meta)</label>
                <textarea
                  required
                  rows={2}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Kısa, dikkat çekici bir SEO meta açıklaması..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FDBF1D]/50 transition-all resize-none"
                />
              </div>

              {/* Cover Image + Meta row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Kapak Görseli (URL)</label>
                  <input
                    type="url"
                    value={form.coverImage}
                    onChange={e => setForm(f => ({ ...f, coverImage: e.target.value }))}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FDBF1D]/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Yazar</label>
                  <input
                    type="text"
                    value={form.author}
                    onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FDBF1D]/50 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Tarih</label>
                  <input
                    type="text"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    placeholder={form.locale === 'tr' ? "15 Mart 2026" : "March 15, 2026"}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FDBF1D]/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Okuma Süresi</label>
                  <input
                    type="text"
                    value={form.readTime}
                    onChange={e => setForm(f => ({ ...f, readTime: e.target.value }))}
                    placeholder={form.locale === 'tr' ? "4 dk okuma" : "4 min read"}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FDBF1D]/50 transition-all"
                  />
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                  className={`relative w-11 h-6 rounded-full transition-all ${form.isActive ? 'bg-green-500' : 'bg-gray-600'}`}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isActive ? 'translate-x-5' : ''}`} />
                </button>
                <div>
                  <p className="text-white text-sm font-bold">{form.isActive ? 'Yayında' : 'Taslak'}</p>
                  <p className="text-gray-500 text-xs">{form.isActive ? 'Yazı sitede görüntüleniyor' : 'Yazı gizli, sitede görünmüyor'}</p>
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  İçerik (HTML)
                </label>
                <p className="text-gray-600 text-xs mb-2">
                  &lt;h2&gt;, &lt;h3&gt;, &lt;p&gt;, &lt;strong&gt;, &lt;img&gt;, &lt;ul&gt;, &lt;li&gt; taglarını kullanabilirsiniz.
                </p>
                <textarea
                  required
                  rows={14}
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder={`<h2>Başlık</h2>\n<p>İçerik metni...</p>\n<img src="https://..." alt="Açıklama" style="border-radius: 12px; margin: 2rem 0;" />`}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono placeholder-gray-700 focus:outline-none focus:border-[#FDBF1D]/50 transition-all resize-y leading-relaxed"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 text-gray-400 hover:text-white font-bold text-sm transition-all"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#FDBF1D] text-[#111827] rounded-xl font-black text-sm hover:bg-[#f5b914] transition-all shadow-lg disabled:opacity-60"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {editingPost ? 'Kaydet' : 'Yayınla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
