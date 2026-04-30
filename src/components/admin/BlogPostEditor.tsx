'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  ExternalLink,
  FileText,
  Globe,
  LayoutTemplate,
  Loader2,
  Quote,
  Save,
  Sparkles,
  Tag,
  User,
  Wand2,
  X,
} from 'lucide-react';
import { sanitizeBlogContent } from '@/lib/blog-content';
import BlogContentEditor from './BlogContentEditor';

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
  authorBio?: string | null;
  authorRole?: string | null;
  tags?: string[] | null;
  pullQuote?: string | null;
  pullQuoteAuthor?: string | null;
  ctaTitle?: string | null;
  ctaSubtitle?: string | null;
  ctaButtonLabel?: string | null;
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
  authorBio: '',
  authorRole: '',
  tags: [] as string[],
  pullQuote: '',
  pullQuoteAuthor: '',
  ctaTitle: '',
  ctaSubtitle: '',
  ctaButtonLabel: '',
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

export default function BlogPostEditor({ mode, postId }: { mode: 'new' | 'edit'; postId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ ...EMPTY_FORM, date: defaultDate('tr') });
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editorMode, setEditorMode] = useState<'write' | 'preview'>('write');
  const [slugTouched, setSlugTouched] = useState(mode === 'edit');

  useEffect(() => {
    if (mode !== 'edit' || !postId) return;

    let mounted = true;
    setLoading(true);
    fetch(`/api/admin/blog/${postId}`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Yazı yüklenemedi.');
        return data.post as BlogPost;
      })
      .then(post => {
        if (!mounted) return;
        const next = {
          slug: post.slug,
          locale: post.locale,
          title: post.title,
          description: post.description,
          content: sanitizeBlogContent(post.content),
          date: post.date,
          readTime: post.readTime,
          author: post.author,
          coverImage: post.coverImage,
          isActive: post.isActive,
          authorBio: post.authorBio || '',
          authorRole: post.authorRole || '',
          tags: Array.isArray(post.tags) ? post.tags : [],
          pullQuote: post.pullQuote || '',
          pullQuoteAuthor: post.pullQuoteAuthor || '',
          ctaTitle: post.ctaTitle || '',
          ctaSubtitle: post.ctaSubtitle || '',
          ctaButtonLabel: post.ctaButtonLabel || '',
        };
        setForm(next);
      })
      .catch(err => {
        if (mounted) setError(err.message || 'Yazı yüklenemedi.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [mode, postId]);

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

  const [tagDraft, setTagDraft] = useState('');

  const addTag = (raw: string) => {
    const value = raw.trim().replace(/^#+/, '').replace(/\s+/g, ' ');
    if (!value) return;
    setForm(f => (f.tags.includes(value) ? f : { ...f, tags: [...f.tags, value] }));
    setTagDraft('');
  };

  const removeTag = (value: string) => {
    setForm(f => ({ ...f, tags: f.tags.filter(t => t !== value) }));
  };

  const handleTagKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag(tagDraft);
    } else if (event.key === 'Backspace' && !tagDraft && form.tags.length) {
      setForm(f => ({ ...f, tags: f.tags.slice(0, -1) }));
    }
  };

  const insertStarterTemplate = () => {
    const template = getStarterTemplate(form.locale);
    const nextContent = sanitizeBlogContent(form.content ? `${form.content}\n\n${template}` : template);
    setForm(f => ({
      ...f,
      content: nextContent,
      readTime: estimateReadTime(nextContent, f.locale),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const url = mode === 'edit' && postId ? `/api/admin/blog/${postId}` : '/api/admin/blog';
      const res = await fetch(url, {
        method: mode === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, content: sanitizeBlogContent(form.content) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Kaydetme başarısız.');
        return;
      }

      setSuccess(mode === 'edit' ? 'Yazı güncellendi.' : 'Yazı oluşturuldu.');
      if (mode === 'new') {
        const createdId = data.post?.id;
        if (createdId) {
          router.replace(`/admin/blog/${createdId}`);
        }
      }
      router.refresh();
    } catch {
      setError('Kaydetme sırasında bağlantı hatası oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const wordCount = stripHtml(form.content).split(' ').filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-[#FFFFFF]">
        <Loader2 size={32} className="animate-spin text-[#A8D62E]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex-1 bg-[#FFFFFF]">
      <form onSubmit={handleSubmit}>
        <div className="sticky top-0 z-30 border-b border-[#EDEDED] bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
            <div className="flex items-start gap-4">
              <Link
                href="/admin/blog"
                className="mt-1 bz-btn-icon"
                aria-label="Geri"
              >
                <ArrowLeft size={16} strokeWidth={2} />
              </Link>
              <div className="min-w-0">
                <p className="pulse-eyebrow text-[#737373]">
                  {mode === 'edit' ? 'BLOG DÜZENLE' : 'YENİ BLOG'}
                </p>
                <h1
                  className="bz-h-tight-2 mt-1 truncate"
                  style={{ fontSize: 22, lineHeight: 1.1 }}
                >
                  {form.title || 'Başlıksız yazı'}
                </h1>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {success && (
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 size={15} />
                  {success}
                </div>
              )}
              <Link
                href={form.slug ? `/${form.locale}/blog/${form.slug}` : '/admin/blog'}
                target={form.slug ? '_blank' : undefined}
                rel={form.slug ? 'noopener noreferrer' : undefined}
                className="bz-btn-ghost"
              >
                <Eye size={14} strokeWidth={2} />
                Önizle
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="bz-btn-primary"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={2} />}
                Kaydet
              </button>
            </div>
          </div>
        </div>

        <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-10">
          <section className="space-y-6">
            {error && (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <div className="rounded-[28px] border border-[#EDEDED] bg-white p-5 shadow-sm sm:p-7">
              <label className="pulse-eyebrow text-[#737373]">BAŞLIK</label>
              <input
                type="text"
                required
                maxLength={180}
                value={form.title}
                onChange={event => updateTitle(event.target.value)}
                placeholder="Okuyucunun merak edeceği net bir başlık yazın"
                className="mt-3 w-full border-0 bg-transparent text-3xl font-medium leading-tight tracking-[-0.045em] text-[#0A0A0A] outline-none placeholder:text-[#D4D4D4] sm:text-5xl"
              />
              <textarea
                required
                rows={3}
                maxLength={280}
                value={form.description}
                onChange={event => setForm(f => ({ ...f, description: event.target.value }))}
                placeholder="Blog kartlarında ve arama sonuçlarında görünecek kısa açıklama..."
                className="mt-5 w-full resize-none rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] px-5 py-4 text-base font-medium leading-7 text-[#525252] outline-none focus:border-[#C6F24E] focus:bg-white"
              />
            </div>

            <div className="overflow-hidden rounded-[28px] border border-[#EDEDED] bg-white shadow-sm">
              <div className="border-b border-[#EDEDED] bg-[#FAFAFA] p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditorMode('write')}
                      className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${editorMode === 'write' ? 'bg-[#0A0A0A] text-white' : 'text-[#737373] hover:bg-white'}`}
                    >
                      Yaz
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorMode('preview')}
                      className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${editorMode === 'preview' ? 'bg-[#0A0A0A] text-white' : 'text-[#737373] hover:bg-white'}`}
                    >
                      Public görünüm
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={insertStarterTemplate}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EAF9B8] px-4 py-2 text-xs font-semibold text-[#0A0A0A] hover:bg-[#C6F24E] transition-colors"
                  >
                    <LayoutTemplate size={15} />
                    Hazır iskelet
                  </button>
                </div>

              </div>

              {editorMode === 'write' ? (
                <div className="px-3 py-3 sm:px-5 sm:py-4">
                  <BlogContentEditor value={form.content} onChange={updateContent} />
                </div>
              ) : (
                <div
                  className="pulse-blog-content min-h-[620px] bg-white px-5 py-6 prose prose-lg max-w-none sm:px-8
                    prose-headings:font-medium prose-headings:text-[#0A0A0A] prose-headings:tracking-[-0.02em]
                    prose-h2:text-[28px] prose-h2:mt-10 prose-h2:mb-4
                    prose-h3:text-[21px] prose-h3:mt-8 prose-h3:mb-3
                    prose-p:text-[#525252] prose-p:leading-[1.7] prose-p:mb-6 prose-p:text-[16px]
                    prose-a:text-[#0A0A0A] prose-a:font-medium prose-a:underline prose-a:decoration-[#C6F24E] prose-a:decoration-2 prose-a:underline-offset-4
                    prose-li:text-[#525252] prose-li:leading-[1.7]
                    prose-blockquote:rounded-[20px] prose-blockquote:border-l-4 prose-blockquote:border-[#C6F24E] prose-blockquote:bg-[#EAF9B8]/75 prose-blockquote:px-6 prose-blockquote:py-5 prose-blockquote:text-[#0A0A0A] prose-blockquote:not-italic prose-blockquote:font-medium
                    [&_code]:rounded [&_code]:bg-[#F5F5F5] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[14px] [&_code]:font-mono [&_code]:text-[#0A0A0A]
                    [&_pre]:my-7 [&_pre]:rounded-2xl [&_pre]:bg-[#0A0A0A] [&_pre]:px-5 [&_pre]:py-4 [&_pre]:overflow-x-auto
                    [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[14px] [&_pre_code]:text-[#EDEDED]
                    [&_figure]:my-8 [&_figure]:flex [&_figure]:flex-col [&_figure]:gap-2
                    [&_figure_img]:m-0 [&_figure_img]:w-full
                    [&_figcaption]:text-[13px] [&_figcaption]:text-[#737373] [&_figcaption]:text-center
                    [&_aside]:my-7 [&_aside]:rounded-2xl [&_aside]:border [&_aside]:px-5 [&_aside]:py-4 [&_aside]:text-[15px]
                    [&_aside_p]:m-0 [&_aside_p]:text-[#0A0A0A]
                    [&_aside[data-variant=info]]:bg-[#F0F9FF] [&_aside[data-variant=info]]:border-[#BFDBFE]
                    [&_aside[data-variant=warn]]:bg-[#FFFBEB] [&_aside[data-variant=warn]]:border-[#FDE68A]
                    [&_aside[data-variant=tip]]:bg-[#EAF9B8] [&_aside[data-variant=tip]]:border-[#C6F24E]"
                  dangerouslySetInnerHTML={{ __html: sanitizeBlogContent(form.content) || '<p>Önizleme için içerik yazın.</p>' }}
                />
              )}
            </div>
          </section>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[28px] border border-[#EDEDED] bg-[#FAFAFA] p-5">
              <p className="pulse-eyebrow text-[#737373]">YAYIN AYARLARI</p>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#737373]">Dil</label>
                  <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl border border-[#EDEDED] bg-white p-1.5">
                    {(['tr', 'en'] as const).map(locale => (
                      <button
                        key={locale}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, locale, date: f.date || defaultDate(locale), readTime: estimateReadTime(f.content, locale) }))}
                        className={`rounded-xl py-2.5 text-xs font-semibold transition-colors ${form.locale === locale ? 'bg-[#0A0A0A] text-white' : 'text-[#737373] hover:bg-[#FAFAFA]'}`}
                      >
                        {locale.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#737373]">Slug</label>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      required
                      value={form.slug}
                      onChange={event => {
                        setSlugTouched(true);
                        setForm(f => ({ ...f, slug: createSlug(event.target.value) }));
                      }}
                      className="w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#C6F24E]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSlugTouched(false);
                        setForm(f => ({ ...f, slug: createSlug(f.title) }));
                      }}
                      className="rounded-2xl border border-[#EDEDED] bg-white px-4 text-[#737373] hover:text-[#0A0A0A]"
                      title="Başlıktan üret"
                    >
                      <Wand2 size={17} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#737373]">Yazar</label>
                  <input
                    type="text"
                    value={form.author}
                    onChange={event => setForm(f => ({ ...f, author: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#C6F24E]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#737373]">Yayın tarihi</label>
                  <input
                    type="text"
                    value={form.date}
                    onChange={event => setForm(f => ({ ...f, date: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#C6F24E]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#737373]">Okuma süresi</label>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, readTime: estimateReadTime(f.content, f.locale) }))}
                      className="text-xs font-semibold text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-4"
                    >
                      Hesapla
                    </button>
                  </div>
                  <input
                    type="text"
                    value={form.readTime}
                    onChange={event => setForm(f => ({ ...f, readTime: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#C6F24E]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#737373]">Kapak görseli URL</label>
                  <input
                    type="text"
                    value={form.coverImage}
                    onChange={event => setForm(f => ({ ...f, coverImage: event.target.value }))}
                    placeholder="https://... veya /images/..."
                    className="mt-2 w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#C6F24E]"
                  />
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-[#EDEDED] bg-white p-4">
                  <div>
                    <p className="text-sm font-semibold text-[#0A0A0A]">{form.isActive ? 'Yayında' : 'Taslak'}</p>
                    <p className="text-xs font-medium text-[#737373]">Public görünürlüğü</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                    className={`relative h-7 w-14 rounded-full transition-colors ${form.isActive ? 'bg-[#C6F24E]' : 'bg-[#D4D4D4]'}`}
                  >
                    <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${form.isActive ? 'translate-x-7' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] bg-[#C6F24E] p-5 text-[#0A0A0A]">
              <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em]">
                <Sparkles size={15} />
                İÇERİK DURUMU
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/45 p-4">
                  <FileText size={18} />
                  <p className="mt-2 text-2xl font-semibold">{wordCount}</p>
                  <p className="text-[11px] font-semibold text-[#0A0A0A]/65">Kelime</p>
                </div>
                <div className="rounded-2xl bg-white/45 p-4">
                  <Globe size={18} />
                  <p className="mt-2 text-2xl font-semibold">{form.locale.toUpperCase()}</p>
                  <p className="text-[11px] font-semibold text-[#0A0A0A]/65">Dil</p>
                </div>
              </div>
            </div>

            {/* Public görünüm — opsiyonel override'lar; boş bırakılırsa public sayfa default'a düşer */}
            <div className="rounded-[28px] border border-[#EDEDED] bg-white p-5">
              <p className="pulse-eyebrow text-[#737373]">PUBLIC GÖRÜNÜM</p>
              <p className="mt-2 text-[11px] leading-[1.55] text-[#737373]">
                Boş bırakılan alanlar public sayfada Buaze default&rsquo;larına düşer.
              </p>

              {/* Yazar bio */}
              <div className="mt-5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#737373]">
                  <User size={13} />
                  Yazar açıklaması
                </label>
                <textarea
                  rows={3}
                  maxLength={280}
                  value={form.authorBio}
                  onChange={event => setForm(f => ({ ...f, authorBio: event.target.value }))}
                  placeholder={form.locale === 'en'
                    ? 'Two short sentences shown next to the author chip on the public page.'
                    : 'Public sayfa sağ kenarda yazarın yanında görünen 2 cümlelik açıklama.'}
                  className="mt-2 w-full resize-none rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] px-4 py-3 text-sm leading-[1.55] text-[#0A0A0A] outline-none focus:border-[#C6F24E] focus:bg-white"
                />
              </div>

              {/* Yazar rolü */}
              <div className="mt-4">
                <label className="text-xs font-semibold text-[#737373]">Yazar rolü</label>
                <input
                  type="text"
                  maxLength={60}
                  value={form.authorRole}
                  onChange={event => setForm(f => ({ ...f, authorRole: event.target.value }))}
                  placeholder={form.locale === 'en' ? 'Buaze · Author' : 'Buaze · Yazar'}
                  className="mt-2 w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#C6F24E]"
                />
              </div>

              {/* Tags */}
              <div className="mt-4">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#737373]">
                  <Tag size={13} />
                  Etiketler
                </label>
                {form.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {form.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-[#F2F2F2] py-1 pl-3 pr-1 text-xs font-medium text-[#525252]"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          aria-label={`${tag} etiketini kaldır`}
                          className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[#737373] hover:bg-white hover:text-[#0A0A0A]"
                        >
                          <X size={11} strokeWidth={2.5} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  value={tagDraft}
                  onChange={event => setTagDraft(event.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => addTag(tagDraft)}
                  placeholder={form.locale === 'en'
                    ? 'Type and press Enter… (auto if empty)'
                    : 'Yaz, Enter\'a bas… (boşsa otomatik türetilir)'}
                  className="mt-2 w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-sm font-medium outline-none focus:border-[#C6F24E]"
                />
              </div>

              {/* Pull quote */}
              <div className="mt-4">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#737373]">
                  <Quote size={13} />
                  Vurgulu alıntı
                </label>
                <textarea
                  rows={3}
                  maxLength={280}
                  value={form.pullQuote}
                  onChange={event => setForm(f => ({ ...f, pullQuote: event.target.value }))}
                  placeholder={form.locale === 'en'
                    ? 'A single sharp sentence highlighted between graphite lines mid-article.'
                    : 'Makalenin ortasında graphite çizgiler arasında vurgulanan tek cümle.'}
                  className="mt-2 w-full resize-none rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] px-4 py-3 text-sm leading-[1.55] text-[#0A0A0A] outline-none focus:border-[#C6F24E] focus:bg-white"
                />
                <input
                  type="text"
                  maxLength={80}
                  value={form.pullQuoteAuthor}
                  onChange={event => setForm(f => ({ ...f, pullQuoteAuthor: event.target.value }))}
                  placeholder={form.locale === 'en'
                    ? 'Quote author (defaults to post author)'
                    : 'Alıntının sahibi (boşsa yazar adı)'}
                  className="mt-2 w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-sm font-medium outline-none focus:border-[#C6F24E]"
                />
              </div>

              {/* CTA override */}
              <div className="mt-4 rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-4">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#737373]">
                  <ExternalLink size={13} />
                  Dark CTA (opsiyonel)
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={form.ctaTitle}
                  onChange={event => setForm(f => ({ ...f, ctaTitle: event.target.value }))}
                  placeholder={form.locale === 'en'
                    ? 'Headline (default: Ready to grow…)'
                    : 'Başlık (default: Google politikalarına…)'}
                  className="mt-3 w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-[#C6F24E]"
                />
                <input
                  type="text"
                  maxLength={160}
                  value={form.ctaSubtitle}
                  onChange={event => setForm(f => ({ ...f, ctaSubtitle: event.target.value }))}
                  placeholder={form.locale === 'en' ? 'Subtitle' : 'Alt metin'}
                  className="mt-2 w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-[#C6F24E]"
                />
                <input
                  type="text"
                  maxLength={40}
                  value={form.ctaButtonLabel}
                  onChange={event => setForm(f => ({ ...f, ctaButtonLabel: event.target.value }))}
                  placeholder={form.locale === 'en' ? 'Button label (default: Start free)' : 'Buton etiketi (default: Ücretsiz başla)'}
                  className="mt-2 w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-[#C6F24E]"
                />
              </div>
            </div>
          </aside>
        </main>
      </form>
    </div>
  );
}
