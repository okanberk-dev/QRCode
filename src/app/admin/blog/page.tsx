'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bold,
  BookOpen,
  Eye,
  FileText,
  Globe,
  Heading2,
  Heading3,
  Italic,
  LayoutTemplate,
  Link2,
  List,
  Loader2,
  ListOrdered,
  Pilcrow,
  Pencil,
  Plus,
  Quote,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import { plainTextToBlogContent, sanitizeBlogContent } from '@/lib/blog-content';

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

function createSlug(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function estimateReadTime(content: string, locale: string) {
  const text = stripHtml(content);
  const words = text ? text.split(' ').length : 1;
  const minutes = Math.max(1, Math.ceil(words / 180));
  return locale === 'en' ? `${minutes} min read` : `${minutes} dk okuma`;
}

function defaultDate(locale: string) {
  return new Date().toLocaleDateString(locale === 'en' ? 'en-US' : 'tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getStarterTemplate(locale: string) {
  if (locale === 'en') {
    return `<h2>Why this matters</h2>
<p>Open with the concrete business problem this article solves. Keep the first paragraph practical, specific, and easy to scan.</p>

<blockquote>Use quotes for sharp takeaways, customer observations, or a short expert note. The public page will render this in the Pulse quote style automatically.</blockquote>

<h2>What changes in the daily workflow?</h2>
<p>Explain the operational impact for restaurants, teams, and guests. Use examples instead of abstract claims.</p>

<h2>How to apply it with Buaze</h2>
<p>Describe the recommended setup, the safe review flow, and the measurable outcome.</p>`;
  }

  return `<h2>Bu neden önemli?</h2>
<p>Yazının çözdüğü işletme problemini net ve pratik bir girişle anlatın. İlk paragraf doğrudan faydayı göstermeli.</p>

<blockquote>Keskin çıkarımlar, müşteri gözlemleri veya kısa uzman notları için alıntı kullanın. Public sayfa bunu otomatik Pulse alıntı stilinde gösterir.</blockquote>

<h2>Günlük operasyonu nasıl değiştirir?</h2>
<p>Restoran ekibi, misafir ve yönetici açısından etkisini örneklerle açıklayın. Soyut vaat yerine uygulanabilir öneriler kullanın.</p>

<h2>Buaze ile nasıl uygulanır?</h2>
<p>Önerilen kurulumu, güvenli yorum akışını ve ölçülebilir sonucu anlatın.</p>`;
}

export default function AdminBlogPage() {
  const editorRef = useRef<HTMLDivElement | null>(null);
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
  const [search, setSearch] = useState('');
  const [editorMode, setEditorMode] = useState<'write' | 'preview'>('write');
  const [slugTouched, setSlugTouched] = useState(false);

  const syncEditorFromState = useCallback((content: string) => {
    if (editorRef.current) {
      editorRef.current.innerHTML = content || '<p></p>';
    }
  }, []);

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

  useEffect(() => {
    if (showForm) {
      window.setTimeout(() => syncEditorFromState(form.content), 0);
    }
  }, [showForm, editingPost?.id, editorMode, syncEditorFromState]);

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
    setForm({ ...EMPTY_FORM, date: defaultDate('tr') });
    setShowForm(true);
    setEditorMode('write');
    setSlugTouched(false);
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
    setEditorMode('write');
    setSlugTouched(true);
    setError('');
  };

  const updateTitle = (title: string) => {
    setForm(f => ({
      ...f,
      title,
      slug: slugTouched ? f.slug : createSlug(title),
    }));
  };

  const updateContent = (content: string) => {
    const cleanContent = sanitizeBlogContent(content);
    setForm(f => ({
      ...f,
      content: cleanContent,
      readTime: f.readTime ? f.readTime : estimateReadTime(cleanContent, f.locale),
    }));
  };

  const handleEditorInput = () => {
    updateContent(editorRef.current?.innerHTML || '');
  };

  const runEditorCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleEditorInput();
  };

  const addLink = () => {
    const url = window.prompt('Bağlantı adresi (https://... veya /sayfa)');
    if (!url) return;
    runEditorCommand('createLink', url);
  };

  const handleEditorPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    document.execCommand('insertHTML', false, plainTextToBlogContent(text));
    handleEditorInput();
  };

  const insertStarterTemplate = () => {
    const template = getStarterTemplate(form.locale);
    const nextContent = sanitizeBlogContent(form.content ? `${form.content}\n\n${template}` : template);
    setForm(f => ({
      ...f,
      content: nextContent,
      readTime: estimateReadTime(nextContent, f.locale),
    }));
    window.setTimeout(() => syncEditorFromState(nextContent), 0);
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
        body: JSON.stringify({ ...form, content: sanitizeBlogContent(form.content) }),
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

  const filtered = posts.filter(post => {
    const matchesLocale = filterLocale === 'all' || post.locale === filterLocale;
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [post.title, post.description, post.slug].some(value => value.toLowerCase().includes(query));
    return matchesLocale && matchesSearch;
  });
  const activeCount = posts.filter(post => post.isActive).length;
  const draftCount = posts.length - activeCount;

  return (
    <div className="flex-1 min-h-screen bg-[#FFFFFF] p-3 sm:p-6 md:p-10 space-y-8">
      {/* Banner Header */}
      <div className="bg-[#0A0A0A] rounded-2xl sm:rounded-2xl border border-white/10 p-6 sm:p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden text-white shadow-2xl">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 bg-[#C6F24E]/10 text-[#C6F24E] px-4 py-1.5 rounded-full pulse-eyebrow">
            ✦ İÇERİK YÖNETİMİ
          </div>
          <h1 className="text-2xl sm:text-4xl font-semibold text-white tracking-tight leading-tight">
            Blog Yazıları
          </h1>
          <p className="text-white/80 text-sm sm:text-base font-medium max-w-md">
            Sitenizdeki içerikleri yönetin ve yeni yazılar yayınlayın.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 self-start md:self-center relative z-10">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/10 text-center">
            <p className="text-2xl font-semibold text-white">{posts.length}</p>
            <p className="text-[10px] pulse-eyebrow text-white/60 mt-1">Toplam Yazı</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/10 text-center">
            <p className="text-2xl font-semibold text-[#C6F24E]">{activeCount}</p>
            <p className="text-[10px] pulse-eyebrow text-white/60 mt-1">Yayında</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/10 text-center">
            <p className="text-2xl font-semibold text-white/70">{draftCount}</p>
            <p className="text-[10px] pulse-eyebrow text-white/60 mt-1">Taslak</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="grid gap-3 bg-white p-3 sm:p-4 rounded-xl border border-[#EDEDED] shadow-sm xl:grid-cols-[minmax(260px,1fr)_auto_auto] xl:items-center">
        <div className="relative">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#737373]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Başlık, açıklama veya slug ara..."
            className="w-full rounded-xl border border-[#EDEDED] bg-[#FAFAFA] py-3 pl-11 pr-4 text-sm font-semibold outline-none transition-all focus:border-[#C6F24E] focus:bg-white focus:shadow-[0_0_0_4px_rgba(198,242,78,0.16)]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {(['all', 'tr', 'en'] as const).map(l => (
            <button
              key={l}
              onClick={() => setFilterLocale(l)}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl pulse-eyebrow transition-all whitespace-nowrap ${
                filterLocale === l
                  ? 'bg-[#0A0A0A] text-white shadow-md'
                  : 'bg-[#FFFFFF] text-[#6B7280] hover:bg-[#EDEDED]'
              }`}
            >
              {l === 'all' ? 'TÜMÜ' : l === 'tr' ? 'TR' : 'EN'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-5 py-2.5 sm:py-3 bg-white text-[#1A1A1A] border border-[#EDEDED] hover:bg-[#FFFFFF] rounded-xl pulse-eyebrow transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {seeding ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            <span className="hidden sm:inline">Örnekleri Aktar</span>
            <span className="sm:hidden">Örnek</span>
          </button>
          <button
            onClick={openNew}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-[#C6F24E] text-[#0A0A0A] rounded-xl font-semibold text-[10px] hover:bg-[#A8D62E] transition-all shadow-lg shadow-[#C6F24E]/10 active:scale-95 whitespace-nowrap"
          >
            <Plus size={18} strokeWidth={2} />
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
          <Loader2 size={32} className="animate-spin text-[#C6F24E]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#EDEDED] p-16 text-center space-y-4">
          <div className="w-20 h-20 bg-[#FFFFFF] rounded-2xl flex items-center justify-center mx-auto">
            <BookOpen size={40} className="text-[#EDEDED]" />
          </div>
          <p className="text-xl font-semibold text-[#0A0A0A]">Henüz yazı bulunamadı</p>
          <p className="text-[#6B7280] text-sm max-w-sm mx-auto font-medium">
            Yukarıdaki "Örnekleri Aktar" butonuna tıklayarak demo içerikleri yükleyebilir veya yeni bir yazı oluşturabilirsiniz.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(post => (
            <div
              key={post.id}
              className={`group bg-white border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-5 transition-all hover:shadow-md hover:border-[#C6F24E]/30 ${
                post.isActive ? 'border-[#EDEDED]' : 'border-[#EDEDED] opacity-60 grayscale-[0.5]'
              }`}
            >
              {/* Cover Thumb */}
              <div className="w-24 h-16 rounded-[16px] overflow-hidden bg-[#FFFFFF] flex-shrink-0 border border-[#EDEDED] relative group-hover:scale-105 transition-transform duration-500">
                {post.coverImage ? (
                  <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen size={20} className="text-[#C9D0DB]" />
                  </div>
                )}
                {!post.isActive && (
                  <div className="absolute inset-0 bg-[#0A0A0A]/40 backdrop-blur-[1px] flex items-center justify-center">
                    <span className="text-[8px] font-semibold text-white  px-1.5 py-0.5 bg-[#0A0A0A]/60 rounded-full">Taslak</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[10px] font-semibold uppercase tracking-[0.1em] px-2.5 py-1 rounded-lg ${
                    post.locale === 'tr' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {post.locale === 'tr' ? 'TÜRKÇE 🇹🇷' : 'ENGLISH 🇺🇸'}
                  </span>
                  {post.isActive ? (
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600">Aktif</span>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] px-2.5 py-1 rounded-lg bg-[#FFFFFF] text-[#6B7280]">Pasif</span>
                  )}
                </div>
                <h3 className="text-[#0A0A0A] font-bold text-[15px] leading-tight group-hover:text-[#0A0A0A] transition-colors">{post.title}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-[#6B7280] text-[11px] font-bold uppercase tracking-wider">{post.date}</p>
                  <span className="w-1 h-1 rounded-full bg-[#C9D0DB]" />
                  <p className="text-[#6B7280] text-[11px] font-bold uppercase tracking-wider">{post.readTime}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0 border-t sm:border-t-0 sm:border-l border-[#EDEDED] pt-4 sm:pt-0 sm:pl-4">
                <a
                  href={`https://buaze.com/${post.locale}/blog/${post.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-[#FFFFFF] text-[#6B7280] hover:text-[#0A0A0A] hover:bg-[#EDEDED] flex items-center justify-center transition-all"
                  title="Görüntüle"
                >
                  <Eye size={18} strokeWidth={2} />
                </a>
                <button
                  onClick={() => openEdit(post)}
                  className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center transition-all"
                  title="Düzenle"
                >
                  <Pencil size={18} strokeWidth={2} />
                </button>
                {deleteConfirm === post.id ? (
                  <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="px-4 py-2 text-[10px] font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-lg shadow-red-500/20"
                    >
                      SİL
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-4 py-2 text-[10px] font-semibold text-[#6B7280] bg-[#EDEDED] hover:bg-[#EDEDED] rounded-xl transition-all"
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
                    <Trash2 size={18} strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-[#0A0A0A]/60 backdrop-blur-md z-60 flex items-start justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-[28px] w-full max-w-7xl my-4 sm:my-8 shadow-2xl border border-[#EDEDED] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="flex flex-col gap-5 border-b border-[#EDEDED] bg-[#FAFAFA] p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#0A0A0A] text-[#C6F24E] rounded-2xl flex items-center justify-center">
                  {editingPost ? <Pencil size={20} strokeWidth={2} /> : <Plus size={20} strokeWidth={2} />}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[#0A0A0A]">{editingPost ? 'Yazıyı Düzenle' : 'Yeni Blog Yazısı'}</h2>
                  <p className="text-[#737373] text-xs font-semibold mt-0.5">
                    {editingPost ? editingPost.title : 'SEO uyumlu ve tasarıma hazır içerik oluşturun'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 rounded-full border border-[#EDEDED] bg-white px-3 py-2 text-[11px] font-semibold text-[#737373]">
                  <FileText size={14} />
                  {stripHtml(form.content).split(' ').filter(Boolean).length} kelime
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="w-10 h-10 flex items-center justify-center text-[#737373] hover:text-[#0A0A0A] hover:bg-white rounded-xl transition-all"
                >
                  <X size={20} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_420px]">
              <div className="space-y-6 p-5 sm:p-7">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#737373] uppercase tracking-[0.2em] mb-3">DİL SEÇİMİ</label>
                    <div className="flex gap-2 rounded-[18px] border border-[#EDEDED] bg-[#FAFAFA] p-1.5">
                      {(['tr', 'en'] as const).map(l => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, locale: l, date: f.date || defaultDate(l), readTime: estimateReadTime(f.content, l) }))}
                          className={`flex-1 rounded-xl py-3 text-xs font-semibold transition-all ${
                            form.locale === l ? 'bg-[#0A0A0A] text-white shadow-lg' : 'text-[#737373] hover:text-[#0A0A0A]'
                          }`}
                        >
                          {l === 'tr' ? 'TR' : 'EN'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-[#737373] uppercase tracking-[0.2em] mb-3">URL SLUG</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={form.slug}
                        onChange={e => {
                          setSlugTouched(true);
                          setForm(f => ({ ...f, slug: createSlug(e.target.value) }));
                        }}
                        placeholder="ornek-yazi-basligi"
                        className="w-full rounded-xl border border-[#EDEDED] bg-[#FAFAFA] px-5 py-3.5 text-sm font-semibold text-[#0A0A0A] outline-none transition-all focus:border-[#C6F24E] focus:bg-white focus:ring-2 focus:ring-[#C6F24E]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSlugTouched(false);
                          setForm(f => ({ ...f, slug: createSlug(f.title) }));
                        }}
                        className="rounded-xl border border-[#EDEDED] px-4 text-[#737373] hover:bg-[#EAF9B8] hover:text-[#0A0A0A] transition-colors"
                        title="Başlıktan üret"
                      >
                        <Wand2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-[#737373] uppercase tracking-[0.2em] mb-3">BAŞLIK</label>
                  <input
                    type="text"
                    required
                    maxLength={180}
                    value={form.title}
                    onChange={e => updateTitle(e.target.value)}
                    placeholder={form.locale === 'tr' ? 'Başlığı buraya girin...' : 'Enter title here...'}
                    className="w-full rounded-2xl border border-[#EDEDED] bg-white px-5 py-4 text-xl font-semibold tracking-[-0.02em] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#C6F24E] focus:ring-2 focus:ring-[#C6F24E]"
                  />
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <label className="block text-[10px] font-semibold text-[#737373] uppercase tracking-[0.2em]">SEO AÇIKLAMASI</label>
                    <span className={`text-[11px] font-semibold ${form.description.length > 160 ? 'text-amber-600' : 'text-[#737373]'}`}>
                      {form.description.length}/160 önerilen
                    </span>
                  </div>
                  <textarea
                    required
                    rows={3}
                    maxLength={280}
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Arama sonuçlarında ve blog kartlarında görünecek kısa açıklama..."
                    className="w-full resize-none rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] px-5 py-4 text-sm font-semibold leading-6 text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#C6F24E] focus:bg-white focus:ring-2 focus:ring-[#C6F24E]"
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#737373] uppercase tracking-[0.2em] mb-3">KAPAK GÖRSELİ URL</label>
                    <input
                      type="text"
                      value={form.coverImage}
                      onChange={e => setForm(f => ({ ...f, coverImage: e.target.value }))}
                      placeholder="https://... veya /images/..."
                      className="w-full rounded-xl border border-[#EDEDED] bg-[#FAFAFA] px-5 py-3.5 text-sm font-semibold text-[#0A0A0A] outline-none transition-all focus:border-[#C6F24E] focus:bg-white focus:ring-2 focus:ring-[#C6F24E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#737373] uppercase tracking-[0.2em] mb-3">YAZAR</label>
                    <input
                      type="text"
                      value={form.author}
                      onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
                      className="w-full rounded-xl border border-[#EDEDED] bg-[#FAFAFA] px-5 py-3.5 text-sm font-semibold text-[#0A0A0A] outline-none transition-all focus:border-[#C6F24E] focus:bg-white focus:ring-2 focus:ring-[#C6F24E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#737373] uppercase tracking-[0.2em] mb-3">YAYIN TARİHİ</label>
                    <input
                      type="text"
                      value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      placeholder={form.locale === 'tr' ? '15 Mart 2026' : 'March 15, 2026'}
                      className="w-full rounded-xl border border-[#EDEDED] bg-[#FAFAFA] px-5 py-3.5 text-sm font-semibold text-[#0A0A0A] outline-none transition-all focus:border-[#C6F24E] focus:bg-white focus:ring-2 focus:ring-[#C6F24E]"
                    />
                  </div>
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <label className="block text-[10px] font-semibold text-[#737373] uppercase tracking-[0.2em]">OKUMA SÜRESİ</label>
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, readTime: estimateReadTime(f.content, f.locale) }))}
                        className="text-[11px] font-semibold text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-4"
                      >
                        Hesapla
                      </button>
                    </div>
                    <input
                      type="text"
                      value={form.readTime}
                      onChange={e => setForm(f => ({ ...f, readTime: e.target.value }))}
                      placeholder={form.locale === 'tr' ? '4 dk okuma' : '4 min read'}
                      className="w-full rounded-xl border border-[#EDEDED] bg-[#FAFAFA] px-5 py-3.5 text-sm font-semibold text-[#0A0A0A] outline-none transition-all focus:border-[#C6F24E] focus:bg-white focus:ring-2 focus:ring-[#C6F24E]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5">
                    <p className="text-[#0A0A0A] text-[13px] font-semibold uppercase tracking-tight">{form.isActive ? 'YAYINDA' : 'TASLAK'}</p>
                    <p className="text-[#737373] text-[12px] font-semibold">{form.isActive ? 'Yazı sitede tüm ziyaretçilere görünür.' : 'Yazı sadece panelde görünür.'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                    className={`relative h-7 w-14 rounded-full transition-all duration-300 ${form.isActive ? 'bg-[#C6F24E]' : 'bg-[#D4D4D4]'}`}
                  >
                    <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-all duration-300 ${form.isActive ? 'translate-x-7' : ''}`} />
                  </button>
                </div>

                <div className="rounded-2xl border border-[#EDEDED] overflow-hidden">
                  <div className="flex flex-col gap-3 border-b border-[#EDEDED] bg-[#FAFAFA] p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditorMode('write')}
                          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${editorMode === 'write' ? 'bg-[#0A0A0A] text-white' : 'text-[#737373] hover:bg-white'}`}
                        >
                          Zengin Metin
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditorMode('preview')}
                          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${editorMode === 'preview' ? 'bg-[#0A0A0A] text-white' : 'text-[#737373] hover:bg-white'}`}
                        >
                          Public Önizleme
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={insertStarterTemplate}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EAF9B8] px-4 py-2 text-xs font-semibold text-[#0A0A0A] hover:bg-[#C6F24E] transition-colors"
                      >
                        <LayoutTemplate size={15} />
                        Hazır iskelet ekle
                      </button>
                    </div>

                    {editorMode === 'write' && (
                      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#EDEDED] bg-white p-2">
                        {[
                          { label: 'Paragraf', icon: Pilcrow, command: 'formatBlock', value: 'p' },
                          { label: 'H2', icon: Heading2, command: 'formatBlock', value: 'h2' },
                          { label: 'H3', icon: Heading3, command: 'formatBlock', value: 'h3' },
                          { label: 'Kalın', icon: Bold, command: 'bold' },
                          { label: 'İtalik', icon: Italic, command: 'italic' },
                          { label: 'Liste', icon: List, command: 'insertUnorderedList' },
                          { label: 'Numara', icon: ListOrdered, command: 'insertOrderedList' },
                          { label: 'Alıntı', icon: Quote, command: 'formatBlock', value: 'blockquote' },
                        ].map(({ label, icon: Icon, command, value }) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => runEditorCommand(command, value)}
                            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#525252] hover:bg-[#EAF9B8] hover:text-[#0A0A0A] transition-colors"
                            title={label}
                          >
                            <Icon size={15} />
                            <span className="hidden sm:inline">{label}</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={addLink}
                          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#525252] hover:bg-[#EAF9B8] hover:text-[#0A0A0A] transition-colors"
                          title="Bağlantı"
                        >
                          <Link2 size={15} />
                          <span className="hidden sm:inline">Link</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {editorMode === 'write' ? (
                    <div
                      ref={editorRef}
                      contentEditable
                      role="textbox"
                      aria-label="Blog içeriği"
                      onInput={handleEditorInput}
                      onBlur={handleEditorInput}
                      onPaste={handleEditorPaste}
                      className="min-h-[420px] bg-white px-5 py-5 text-[16px] leading-7 text-[#0A0A0A] outline-none
                        [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-[28px] [&_h2]:font-medium [&_h2]:tracking-[-0.02em]
                        [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-[21px] [&_h3]:font-medium [&_h3]:tracking-[-0.01em]
                        [&_p]:mb-5 [&_p]:text-[#525252]
                        [&_a]:font-medium [&_a]:text-[#0A0A0A] [&_a]:underline [&_a]:decoration-[#C6F24E] [&_a]:decoration-2 [&_a]:underline-offset-4
                        [&_ul]:mb-5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-2 [&_li]:text-[#525252]
                        [&_blockquote]:my-7 [&_blockquote]:rounded-[18px] [&_blockquote]:border-l-4 [&_blockquote]:border-[#C6F24E] [&_blockquote]:bg-[#EAF9B8]/70 [&_blockquote]:px-5 [&_blockquote]:py-4 [&_blockquote]:font-medium [&_blockquote]:text-[#0A0A0A]"
                      suppressContentEditableWarning
                      dangerouslySetInnerHTML={{ __html: form.content || '<p></p>' }}
                    />
                  ) : (
                    <div
                      className="pulse-blog-content min-h-[420px] bg-white px-5 py-5 prose prose-lg max-w-none
                        prose-headings:font-medium prose-headings:text-[#0A0A0A] prose-headings:tracking-[-0.02em]
                        prose-h2:text-[28px] prose-h2:mt-10 prose-h2:mb-4
                        prose-h3:text-[21px] prose-h3:mt-8 prose-h3:mb-3
                        prose-p:text-[#525252] prose-p:leading-[1.7] prose-p:mb-6 prose-p:text-[16px]
                        prose-a:text-[#0A0A0A] prose-a:font-medium prose-a:underline prose-a:decoration-[#C6F24E] prose-a:decoration-2 prose-a:underline-offset-4
                        prose-li:text-[#525252] prose-li:leading-[1.7]
                        prose-blockquote:rounded-[20px] prose-blockquote:border-l-4 prose-blockquote:border-[#C6F24E] prose-blockquote:bg-[#EAF9B8]/75 prose-blockquote:px-6 prose-blockquote:py-5 prose-blockquote:text-[#0A0A0A] prose-blockquote:not-italic prose-blockquote:font-medium"
                      dangerouslySetInnerHTML={{ __html: sanitizeBlogContent(form.content) || '<p>Önizleme için içerik yazın.</p>' }}
                    />
                  )}
                </div>
              </div>

              <aside className="border-t border-[#EDEDED] bg-[#FAFAFA] p-5 sm:p-7 lg:border-l lg:border-t-0">
                <div className="sticky top-6 space-y-5">
                  <div className="rounded-2xl bg-[#C6F24E] p-5 text-[#0A0A0A]">
                    <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em]">
                      <Sparkles size={15} />
                      CANLI BLOG ÖNİZLEME
                    </div>
                    <h3 className="mt-4 text-[32px] font-medium leading-none tracking-[-0.045em]">
                      {form.title || 'Yazı başlığı'}
                    </h3>
                    <p className="mt-4 text-sm font-medium leading-6 text-[#0A0A0A]/75">
                      {form.description || 'SEO açıklaması ve blog kartı özeti burada görünür.'}
                    </p>
                    <div className="mt-5 flex items-center gap-3 text-xs font-semibold text-[#0A0A0A]/70">
                      <Globe size={15} />
                      <span>{form.locale.toUpperCase()}</span>
                      <span>{form.readTime || estimateReadTime(form.content, form.locale)}</span>
                    </div>
                  </div>

                  {form.coverImage ? (
                    <div className="overflow-hidden rounded-2xl border border-[#EDEDED] bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.coverImage} alt="" className="h-40 w-full object-cover" />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#D4D4D4] bg-white p-5 text-center text-sm font-semibold text-[#737373]">
                      Kapak görseli eklenirse OG/blog kartlarında kullanılır.
                    </div>
                  )}

                  <div className="rounded-2xl border border-[#EDEDED] bg-white p-5">
                    <p className="pulse-eyebrow text-[#737373]">SEO KONTROL</p>
                    <div className="mt-4 space-y-3 text-sm font-semibold">
                      <div className="flex items-center justify-between">
                        <span className="text-[#737373]">Başlık</span>
                        <span className={form.title.length >= 35 && form.title.length <= 70 ? 'text-emerald-600' : 'text-amber-600'}>
                          {form.title.length || 0} karakter
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#737373]">Açıklama</span>
                        <span className={form.description.length >= 90 && form.description.length <= 160 ? 'text-emerald-600' : 'text-amber-600'}>
                          {form.description.length || 0} karakter
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#737373]">Slug</span>
                        <span className={form.slug ? 'text-emerald-600' : 'text-amber-600'}>
                          {form.slug ? 'Hazır' : 'Eksik'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-5 py-3 text-[#737373] hover:text-[#0A0A0A] font-semibold text-xs transition-all"
                    >
                      İPTAL
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-2 px-7 py-3 bg-[#0A0A0A] text-white rounded-xl font-semibold text-xs hover:bg-[#1A1A1A] transition-all disabled:opacity-50 active:scale-95"
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {editingPost ? 'GÜNCELLE' : 'YAYINLA'}
                    </button>
                  </div>
                </div>
              </aside>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
