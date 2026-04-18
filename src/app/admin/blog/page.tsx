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
    <div className="flex-1 min-h-screen bg-[#FCFBF7] p-3 sm:p-6 md:p-10 space-y-8">
      {/* Banner Header */}
      <div className="bg-[#111827] rounded-[24px] sm:rounded-[32px] border border-gray-800 p-6 sm:p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 bg-[#FDBF1D]/10 text-[#FDBF1D] px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em]">
            ✦ İÇERİK YÖNETİMİ
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Blog Yazıları
          </h1>
          <p className="text-[#ada89f] text-sm sm:text-base font-bold max-w-md">
            Sitenizdeki içerikleri yönetin ve yeni yazılar yayınlayın.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center relative z-10">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/10 text-center">
            <p className="text-2xl font-black text-white">{posts.length}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Toplam Yazı</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-[20px] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {(['all', 'tr', 'en'] as const).map(l => (
            <button
              key={l}
              onClick={() => setFilterLocale(l)}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                filterLocale === l
                  ? 'bg-[#111827] text-white shadow-md'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {l === 'all' ? 'TÜMÜ' : l === 'tr' ? '🇹🇷 TÜRKÇE' : '🇺🇸 ENGLISH'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-5 py-3 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm disabled:opacity-50"
          >
            {seeding ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Örnekleri Aktar
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-6 py-3 bg-[#FDBF1D] text-[#111827] rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#f5b914] transition-all shadow-lg shadow-[#FDBF1D]/10 active:scale-95"
          >
            <Plus size={18} strokeWidth={3} />
            Yeni Yazı
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-6 py-4 text-red-600 text-sm font-bold flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            {error}
          </div>
          <button onClick={() => setError('')} className="p-1 hover:bg-red-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-6 py-4 text-emerald-600 text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          {success}
        </div>
      )}

      {/* Blog Posts Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-[#FDBF1D]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-16 text-center space-y-4">
          <div className="w-20 h-20 bg-gray-50 rounded-[28px] flex items-center justify-center mx-auto">
            <BookOpen size={40} className="text-gray-200" />
          </div>
          <p className="text-xl font-black text-gray-900">Henüz yazı bulunamadı</p>
          <p className="text-gray-500 text-sm max-w-sm mx-auto font-medium">
            Yukarıdaki "Örnekleri Aktar" butonuna tıklayarak demo içerikleri yükleyebilir veya yeni bir yazı oluşturabilirsiniz.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(post => (
            <div
              key={post.id}
              className={`group bg-white border rounded-[24px] p-4 flex flex-col sm:flex-row sm:items-center gap-5 transition-all hover:shadow-md hover:border-[#FDBF1D]/30 ${
                post.isActive ? 'border-gray-100' : 'border-gray-100 opacity-60 grayscale-[0.5]'
              }`}
            >
              {/* Cover Thumb */}
              <div className="w-24 h-16 rounded-[16px] overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100 relative group-hover:scale-105 transition-transform duration-500">
                {post.coverImage ? (
                  <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen size={20} className="text-gray-300" />
                  </div>
                )}
                {!post.isActive && (
                  <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[1px] flex items-center justify-center">
                    <span className="text-[8px] font-black text-white uppercase tracking-widest px-1.5 py-0.5 bg-gray-900/60 rounded-full">Taslak</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[10px] font-black uppercase tracking-[0.1em] px-2.5 py-1 rounded-lg ${
                    post.locale === 'tr' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {post.locale === 'tr' ? 'TÜRKÇE 🇹🇷' : 'ENGLISH 🇺🇸'}
                  </span>
                  {post.isActive ? (
                    <span className="text-[10px] font-black uppercase tracking-[0.1em] px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600">Aktif</span>
                  ) : (
                    <span className="text-[10px] font-black uppercase tracking-[0.1em] px-2.5 py-1 rounded-lg bg-gray-50 text-gray-500">Pasif</span>
                  )}
                </div>
                <h3 className="text-gray-900 font-bold text-[15px] leading-tight group-hover:text-[#111827] transition-colors">{post.title}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">{post.date}</p>
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">{post.readTime}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0 border-t sm:border-t-0 sm:border-l border-gray-100 pt-4 sm:pt-0 sm:pl-4">
                <a
                  href={`https://buaze.com/${post.locale}/blog/${post.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 hover:text-[#111827] hover:bg-gray-100 flex items-center justify-center transition-all"
                  title="Görüntüle"
                >
                  <Eye size={18} strokeWidth={2.5} />
                </a>
                <button
                  onClick={() => openEdit(post)}
                  className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center transition-all"
                  title="Düzenle"
                >
                  <Pencil size={18} strokeWidth={2.5} />
                </button>
                {deleteConfirm === post.id ? (
                  <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="px-4 py-2 text-[10px] font-black text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-lg shadow-red-500/20"
                    >
                      SİL
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-4 py-2 text-[10px] font-black text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                    >
                      İPTAL
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(post.id)}
                    className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-all"
                    title="Sil"
                  >
                    <Trash2 size={18} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-[#111827]/60 backdrop-blur-md z-[100] flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[32px] w-full max-w-4xl my-8 shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-8 border-b border-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#FDBF1D]/10 rounded-2xl flex items-center justify-center">
                  {editingPost ? <Pencil size={20} className="text-[#FDBF1D]" strokeWidth={3} /> : <Plus size={20} className="text-[#FDBF1D]" strokeWidth={3} />}
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#111827]">{editingPost ? 'Yazıyı Düzenle' : 'Yeni Blog Yazısı'}</h2>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-0.5">{editingPost ? editingPost.title : 'Harika bir içerik oluşturun'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-[#111827] hover:bg-gray-50 rounded-xl transition-all"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* Locale + Slug */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">DİL SEÇİMİ</label>
                  <div className="flex gap-2 p-1.5 bg-gray-50 rounded-[18px]">
                    {(['tr', 'en'] as const).map(l => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, locale: l }))}
                        className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${
                          form.locale === l
                            ? 'bg-[#111827] text-white shadow-lg'
                            : 'text-gray-400 hover:text-[#111827]'
                        }`}
                      >
                        {l === 'tr' ? '🇹🇷 TÜRKÇE' : '🇺🇸 ENGLISH'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">URL SLUG</label>
                  <input
                    type="text"
                    required
                    value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                    placeholder="ornek-yazi-basligi"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3.5 text-gray-900 text-sm font-bold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FDBF1D] focus:bg-white transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">BAŞLIK</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder={form.locale === 'tr' ? "Başlığı buraya girin..." : "Enter title here..."}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3.5 text-gray-900 text-sm font-bold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FDBF1D] focus:bg-white transition-all shadow-sm"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">SEO AÇIKLAMASI (META)</label>
                <textarea
                  required
                  rows={2}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Arama sonuçlarında görünecek kısa açıklama..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3.5 text-gray-900 text-sm font-bold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FDBF1D] focus:bg-white transition-all shadow-sm resize-none"
                />
              </div>

              {/* Cover Image + Author */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">KAPAK GÖRSELİ URL</label>
                  <input
                    type="url"
                    value={form.coverImage}
                    onChange={e => setForm(f => ({ ...f, coverImage: e.target.value }))}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3.5 text-gray-900 text-sm font-bold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FDBF1D] focus:bg-white transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">YAZAR</label>
                  <input
                    type="text"
                    value={form.author}
                    onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3.5 text-gray-900 text-sm font-bold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FDBF1D] focus:bg-white transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">YAYIN TARİHİ</label>
                  <input
                    type="text"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    placeholder={form.locale === 'tr' ? "15 Mart 2026" : "March 15, 2026"}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3.5 text-gray-900 text-sm font-bold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FDBF1D] focus:bg-white transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">OKUMA SÜRESİ</label>
                  <input
                    type="text"
                    value={form.readTime}
                    onChange={e => setForm(f => ({ ...f, readTime: e.target.value }))}
                    placeholder={form.locale === 'tr' ? "4 dk okuma" : "4 min read"}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3.5 text-gray-900 text-sm font-bold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FDBF1D] focus:bg-white transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between p-5 bg-gray-50 rounded-[20px] border border-gray-100">
                <div className="space-y-0.5">
                  <p className="text-[#111827] text-[13px] font-black uppercase tracking-tight">{form.isActive ? 'YAYINDA' : 'TASLAK'}</p>
                  <p className="text-gray-500 text-[11px] font-bold">{form.isActive ? 'Yazı sitede tüm ziyaretçilere görünür.' : 'Yazı sadece panelde görünür.'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                  className={`relative w-12 h-6.5 rounded-full transition-all duration-300 ${form.isActive ? 'bg-[#FDBF1D]' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-1 left-1 w-4.5 h-4.5 bg-white rounded-full shadow-md transition-all duration-300 ${form.isActive ? 'translate-x-5.5' : ''}`} />
                </button>
              </div>

              {/* Content */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">İÇERİK (HTML)</label>
                <textarea
                  required
                  rows={12}
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-100 rounded-[20px] px-5 py-4 text-gray-900 text-sm font-mono placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FDBF1D] focus:bg-white transition-all shadow-inner leading-relaxed"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-8 py-3.5 text-gray-500 hover:text-[#111827] font-black text-xs uppercase tracking-widest transition-all"
                >
                  İPTAL
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-10 py-3.5 bg-[#111827] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 disabled:opacity-50 active:scale-95"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {editingPost ? 'GÜNCELLE' : 'YAYINLA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
