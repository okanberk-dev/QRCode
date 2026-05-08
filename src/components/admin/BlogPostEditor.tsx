'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { parseBlogDate } from '@/lib/blog-date';
import BlogTranslationLink from '@/components/admin/BlogTranslationLink';
import {
  ArrowLeft,
  Bold,
  CheckCircle2,
  Eye,
  ExternalLink,
  FileText,
  Globe,
  Heading2,
  Heading3,
  Italic,
  ImagePlus,
  LayoutTemplate,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Pilcrow,
  Quote,
  Save,
  Sparkles,
  Tag,
  Trash2,
  User,
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
  authorBio?: string | null;
  authorRole?: string | null;
  tags?: string[] | null;
  pullQuote?: string | null;
  pullQuoteAuthor?: string | null;
  ctaTitle?: string | null;
  ctaSubtitle?: string | null;
  ctaButtonLabel?: string | null;
  translationGroupId?: string | null;
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

/** Mevcut form.date (human-readable veya ISO) → ISO YYYY-MM-DD picker value. */
function dateInputValue(humanOrIso: string): string {
  const parsed = parseBlogDate(humanOrIso);
  const d = parsed ?? new Date();
  // toISOString returns UTC, slice ilk 10 char "YYYY-MM-DD"
  return d.toISOString().slice(0, 10);
}

/** ISO YYYY-MM-DD → locale-aware human-readable ("15 Mart 2026" / "March 15, 2026"). */
function isoToHuman(iso: string, locale: string): string {
  if (!iso) return '';
  // Construct as UTC to avoid timezone drift on server rendering.
  const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(
    locale === 'en' ? 'en-US' : 'tr-TR',
    { day: 'numeric', month: 'long', year: 'numeric' },
  );
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
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM, date: defaultDate('tr') });
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editorMode, setEditorMode] = useState<'write' | 'preview'>('write');
  const [slugTouched, setSlugTouched] = useState(mode === 'edit');

  const syncEditorFromState = useCallback((content: string) => {
    if (editorRef.current) {
      editorRef.current.innerHTML = content || '<p></p>';
    }
  }, []);

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
        setTranslationGroupId(post.translationGroupId || null);
        window.setTimeout(() => syncEditorFromState(next.content), 0);
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
  }, [mode, postId, syncEditorFromState]);

  useEffect(() => {
    if (editorMode === 'write') {
      window.setTimeout(() => syncEditorFromState(form.content), 0);
    }
    // form.content is a controlled value — re-syncing on every content edit
    // would clobber the user's caret. Only mode toggle (write↔preview) should
    // trigger sync; intentional skip of form.content dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorMode, syncEditorFromState]);

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

  const [tagDraft, setTagDraft] = useState('');
  const [translationGroupId, setTranslationGroupId] = useState<string | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);
  const [slugSuggesting, setSlugSuggesting] = useState(false);
  const [readTimeSuggesting, setReadTimeSuggesting] = useState(false);

  const requestSlugSuggestion = async () => {
    if (slugSuggesting) return;
    setSlugSuggesting(true);
    try {
      const res = await fetch('/api/admin/blog/suggest-slug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          locale: form.locale,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.slug) {
        setSlugTouched(true);
        setForm((f) => ({ ...f, slug: data.slug as string }));
      } else {
        // Fallback to deterministic
        setSlugTouched(true);
        setForm((f) => ({ ...f, slug: createSlug(f.title) }));
      }
    } catch {
      setSlugTouched(true);
      setForm((f) => ({ ...f, slug: createSlug(f.title) }));
    } finally {
      setSlugSuggesting(false);
    }
  };

  const requestReadTimeSuggestion = async () => {
    if (readTimeSuggesting) return;
    setReadTimeSuggesting(true);
    try {
      const res = await fetch('/api/admin/blog/suggest-read-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: form.content,
          locale: form.locale,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.readTime) {
        setForm((f) => ({ ...f, readTime: data.readTime as string }));
      } else {
        setForm((f) => ({ ...f, readTime: estimateReadTime(f.content, f.locale) }));
      }
    } catch {
      setForm((f) => ({ ...f, readTime: estimateReadTime(f.content, f.locale) }));
    } finally {
      setReadTimeSuggesting(false);
    }
  };

  const handleCoverFileSelect = async (file: File) => {
    setCoverUploadError(null);
    if (!file.type.startsWith('image/')) {
      setCoverUploadError('Sadece görsel dosyası yüklenebilir.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCoverUploadError("Görsel 5 MB'dan büyük olamaz.");
      return;
    }
    setCoverUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/blog/upload-image', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        setCoverUploadError(data?.error || 'Görsel yüklenemedi.');
        return;
      }
      setForm((f) => ({ ...f, coverImage: data.url as string }));
    } catch {
      setCoverUploadError('Bağlantı hatası.');
    } finally {
      setCoverUploading(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    }
  };

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
    window.setTimeout(() => syncEditorFromState(nextContent), 0);
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
              {/* CLAUDE.md §38.164 (Stage 84): mobile keyboard hints (CLAUDE.md §25.5/§25.6 paterni) +
                  iOS auto-zoom önleme (text-[16px] mobile baseline). */}
              <input
                type="text"
                required
                maxLength={180}
                value={form.title}
                onChange={event => updateTitle(event.target.value)}
                placeholder="Okuyucunun merak edeceği net bir başlık yazın"
                inputMode="text"
                autoCapitalize="sentences"
                autoCorrect="on"
                spellCheck={true}
                enterKeyHint="next"
                className="mt-3 w-full border-0 bg-transparent text-[16px] sm:text-3xl font-medium leading-tight tracking-[-0.045em] text-[#0A0A0A] outline-none placeholder:text-[#D4D4D4] sm:text-5xl"
              />
              {/* SEO char counter — Google snippet ~60 char truncate eder. */}
              <div className="mt-2 flex items-center justify-between text-[11px] font-medium">
                <span className="text-[#737373]">
                  SEO ideal: 50–65 karakter
                </span>
                <span
                  className={
                    form.title.length === 0
                      ? 'text-[#737373]'
                      : form.title.length < 30
                        ? 'text-[#D97706]'
                        : form.title.length <= 65
                          ? 'text-[#16A34A]'
                          : 'text-[#DC2626]'
                  }
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {form.title.length} / 180
                </span>
              </div>
              {/* CLAUDE.md §38.164 (Stage 84): mobile keyboard hints. */}
              <textarea
                required
                rows={3}
                maxLength={280}
                value={form.description}
                onChange={event => setForm(f => ({ ...f, description: event.target.value }))}
                placeholder="Blog kartlarında ve arama sonuçlarında görünecek kısa açıklama..."
                inputMode="text"
                autoCapitalize="sentences"
                autoCorrect="on"
                spellCheck={true}
                enterKeyHint="next"
                className="mt-5 w-full resize-none rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] px-5 py-4 text-[16px] sm:text-base font-medium leading-7 text-[#525252] outline-none focus:border-[#C6F24E] focus:bg-white"
              />
              {/* Meta description SEO ideal 140–160 char. */}
              <div className="mt-2 flex items-center justify-between text-[11px] font-medium">
                <span className="text-[#737373]">
                  SEO ideal: 140–160 karakter
                </span>
                <span
                  className={
                    form.description.length === 0
                      ? 'text-[#737373]'
                      : form.description.length < 100
                        ? 'text-[#D97706]'
                        : form.description.length <= 160
                          ? 'text-[#16A34A]'
                          : form.description.length <= 200
                            ? 'text-[#D97706]'
                            : 'text-[#DC2626]'
                  }
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {form.description.length} / 280
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-[#EDEDED] bg-white shadow-sm">
              <div className="border-b border-[#EDEDED] bg-[#FAFAFA] p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditorMode('write')}
                      className={editorMode === 'write' ? 'bz-btn-primary bz-btn-sm' : 'bz-btn bz-btn-sm'}
                    >
                      Yaz
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorMode('preview')}
                      className={editorMode === 'preview' ? 'bz-btn-primary bz-btn-sm' : 'bz-btn bz-btn-sm'}
                    >
                      Public görünüm
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={insertStarterTemplate}
                    className="bz-btn-lime bz-btn-sm"
                  >
                    <LayoutTemplate size={15} />
                    Hazır iskelet
                  </button>
                </div>

                {editorMode === 'write' && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-[#EDEDED] bg-white p-2">
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
                        className="bz-btn bz-btn-sm"
                        title={label}
                      >
                        <Icon size={15} />
                        <span className="hidden sm:inline">{label}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={addLink}
                      className="bz-btn bz-btn-sm"
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
                  className="min-h-[620px] bg-white px-5 py-6 text-[17px] leading-8 text-[#0A0A0A] outline-none sm:px-8
                    [&_h2]:mt-9 [&_h2]:mb-3 [&_h2]:text-[30px] [&_h2]:font-medium [&_h2]:tracking-[-0.02em]
                    [&_h3]:mt-7 [&_h3]:mb-2 [&_h3]:text-[22px] [&_h3]:font-medium [&_h3]:tracking-[-0.01em]
                    [&_p]:mb-5 [&_p]:text-[#525252]
                    [&_a]:font-medium [&_a]:text-[#0A0A0A] [&_a]:underline [&_a]:decoration-[#C6F24E] [&_a]:decoration-2 [&_a]:underline-offset-4
                    [&_ul]:mb-5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-2 [&_li]:text-[#525252]
                    [&_blockquote]:my-7 [&_blockquote]:rounded-[18px] [&_blockquote]:border-l-4 [&_blockquote]:border-[#C6F24E] [&_blockquote]:bg-[#EAF9B8]/70 [&_blockquote]:px-5 [&_blockquote]:py-4 [&_blockquote]:font-medium [&_blockquote]:text-[#0A0A0A]"
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ __html: form.content || '<p></p>' }}
                />
              ) : (
                <div
                  className="pulse-blog-content min-h-[620px] bg-white px-5 py-6 prose prose-lg max-w-none sm:px-8
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
          </section>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[28px] border border-[#EDEDED] bg-[#FAFAFA] p-5">
              <p className="pulse-eyebrow text-[#737373]">YAYIN AYARLARI</p>
              <p className="mt-2 text-[11px] leading-[1.55] text-[#737373]">
                Yazının dili, URL adresi, yayın tarihi ve kapak görseli gibi içerik dışı
                ayarlar. Slug ve okuma süresi alanları yapay zekâ önerisi destekler.
              </p>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#737373]">Dil</label>
                  <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl border border-[#EDEDED] bg-white p-1.5">
                    {(['tr', 'en'] as const).map(locale => (
                      <button
                        key={locale}
                        type="button"
                        onClick={() =>
                          setForm((f) => {
                            // Locale değişince mevcut tarihi yeni dile uygun formata çevir
                            // (örn '15 Mart 2026' ↔ 'March 15, 2026'). Parse edilemiyorsa
                            // bugünün tarihini default olarak kullan.
                            const parsed = parseBlogDate(f.date);
                            const nextDate = parsed
                              ? parsed.toLocaleDateString(locale === 'en' ? 'en-US' : 'tr-TR', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                })
                              : f.date || defaultDate(locale);
                            return {
                              ...f,
                              locale,
                              date: nextDate,
                              readTime: estimateReadTime(f.content, locale),
                            };
                          })
                        }
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
                    {/* CLAUDE.md §38.164 (Stage 84): mobile keyboard hints + iOS auto-zoom önleme. */}
                    <input
                      type="text"
                      required
                      value={form.slug}
                      onChange={event => {
                        setSlugTouched(true);
                        setForm(f => ({ ...f, slug: createSlug(event.target.value) }));
                      }}
                      inputMode="text"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      enterKeyHint="next"
                      className="w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-[16px] sm:text-sm font-semibold outline-none focus:border-[#C6F24E]"
                    />
                    <button
                      type="button"
                      onClick={requestSlugSuggestion}
                      disabled={slugSuggesting || !form.title.trim()}
                      className="bz-btn bz-btn-sm disabled:opacity-60"
                      title="Yapay zekâ ile SEO uyumlu slug öner"
                    >
                      {slugSuggesting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          <Sparkles size={14} />
                          <span className="text-xs font-semibold">AI</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#737373]">Yazar</label>
                  {/* CLAUDE.md §38.164 (Stage 84): mobile keyboard hints + iOS auto-zoom önleme. */}
                  <input
                    type="text"
                    value={form.author}
                    onChange={event => setForm(f => ({ ...f, author: event.target.value }))}
                    inputMode="text"
                    autoCapitalize="words"
                    autoCorrect="off"
                    spellCheck={false}
                    autoComplete="name"
                    enterKeyHint="next"
                    className="mt-2 w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-[16px] sm:text-sm font-semibold outline-none focus:border-[#C6F24E]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#737373]">Yayın tarihi</label>
                  <input
                    type="date"
                    value={dateInputValue(form.date)}
                    onChange={(event) => {
                      const iso = event.target.value;
                      if (!iso) return;
                      setForm((f) => ({ ...f, date: isoToHuman(iso, f.locale) }));
                    }}
                    className="mt-2 w-full rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-sm font-semibold text-[#0A0A0A] outline-none focus:border-[#C6F24E]"
                  />
                  <p className="mt-2 text-[11px] text-[#737373]">
                    Sayfada görünüm: <strong className="text-[#0A0A0A]">{form.date || '—'}</strong>
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#737373]">Okuma süresi</label>
                    <button
                      type="button"
                      onClick={requestReadTimeSuggestion}
                      disabled={readTimeSuggesting}
                      className="bz-btn bz-btn-sm disabled:opacity-60"
                      title="Yapay zekâ ile içerik karmaşıklığına göre öner"
                    >
                      {readTimeSuggesting ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Hesaplanıyor…
                        </>
                      ) : (
                        <>
                          <Sparkles size={12} />
                          AI ile hesapla
                        </>
                      )}
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
                  <label className="text-xs font-semibold text-[#737373]">Kapak görseli</label>
                  {/* Preview — visible whenever coverImage is set */}
                  {form.coverImage && (
                    <div className="mt-2 relative overflow-hidden rounded-2xl border border-[#EDEDED] bg-[#FAFAFA]">
                      { }
                      <img
                        src={form.coverImage}
                        alt="Kapak önizlemesi"
                        className="h-40 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, coverImage: '' }))}
                        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[#0A0A0A] shadow-sm hover:bg-white"
                        aria-label="Kapağı kaldır"
                      >
                        <Trash2 size={11} /> Kaldır
                      </button>
                    </div>
                  )}

                  {/* Upload + URL hybrid */}
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => coverFileInputRef.current?.click()}
                      disabled={coverUploading}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-xs font-semibold text-[#0A0A0A] hover:border-[#0A0A0A] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      {coverUploading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Yükleniyor…
                        </>
                      ) : (
                        <>
                          <ImagePlus size={14} />
                          {form.coverImage ? 'Görseli değiştir' : 'Görsel yükle'}
                        </>
                      )}
                    </button>
                    <input
                      ref={coverFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) handleCoverFileSelect(file);
                      }}
                    />
                    <input
                      type="text"
                      value={form.coverImage}
                      onChange={(event) => setForm((f) => ({ ...f, coverImage: event.target.value }))}
                      placeholder="veya URL yapıştır: https://..."
                      className="flex-1 rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#C6F24E]"
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-[#737373] leading-[1.55]">
                    JPG/PNG/WebP, en fazla 5 MB. Otomatik 1600×900 (16:9) WebP&apos;ye çevrilir.
                  </p>
                  {coverUploadError && (
                    <p className="mt-2 text-[12px] font-semibold text-[#991B1B]">{coverUploadError}</p>
                  )}
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

            {/* Translation pair — TR↔EN eşleştirme. Sadece edit mode'da
                görünür (postId gerekli). Yeni yazıda info banner. */}
            {mode === 'edit' && postId ? (
              <BlogTranslationLink
                postId={postId}
                locale={form.locale === 'en' ? 'en' : 'tr'}
                translationGroupId={translationGroupId}
                onChanged={async () => {
                  // Sadece groupId'yi yenile — content'i tekrar editöre yazmamak için
                  // ayrı küçük fetch. Form içerik state'i dokunulmaz.
                  try {
                    const res = await fetch(`/api/admin/blog/${postId}`, { cache: 'no-store' });
                    const data = await res.json().catch(() => null);
                    if (data?.post) {
                      setTranslationGroupId(data.post.translationGroupId || null);
                    }
                  } catch {
                    // ignore — UI bir sonraki açılışta doğru değeri okur
                  }
                }}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-4 text-[12px] leading-[1.55] text-[#737373]">
                Yazıyı kaydettikten sonra <strong className="text-[#0A0A0A]">Dil
                eşleşmesi</strong> bölümünden diğer dildeki karşılığını
                bağlayabilirsin.
              </div>
            )}

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
