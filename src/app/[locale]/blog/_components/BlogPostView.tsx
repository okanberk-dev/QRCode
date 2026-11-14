import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import NewsletterSignup from '@/components/marketing/NewsletterSignup';
import BlogReadingProgress from '@/components/marketing/BlogReadingProgress';
import BlogCopyLinkButton from '@/components/marketing/BlogCopyLinkButton';
import { authorInitials } from '../_lib/author';

// Brand SVGs — lucide-react dropped Twitter/Linkedin/Whatsapp icons; inline
// glyph paths keep the share row dependency-free and recolour via currentColor.
const SHARE_ICONS = {
  twitter: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.11 2.06 2.06 0 0 1 0 4.11zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  ),
  whatsapp: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.966-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  ),
};

export interface BlogPostViewProps {
  lang: 'tr' | 'en';
  backLabel: string;
  post: {
    title: string;
    description: string;
    readTime: string;
    date: string;
    pullQuote: string | null;
  };
  publishedIso: string | null;
  author: string;
  authorRole: string | null;
  authorBio: string | null;
  pullQuoteAuthor: string;
  /** Sanitized article HTML with h2 anchors. */
  content: string;
  tocItems: Array<{ text: string; id: string }>;
  tags: string[];
  postUrl: string;
  ctaTitle: string;
  ctaSubtitle: string;
  ctaButtonLabel: string;
  relatedPosts: Array<{ slug: string; title: string; readTime: string; date: string }>;
}

/**
 * Presentational blog post body (everything inside <main>). The page loads
 * and prepares the data; keeping the markup here lets it render without a
 * database (e.g. for visual checks).
 */
export default function BlogPostView({
  lang,
  backLabel,
  post,
  publishedIso,
  author,
  authorRole,
  authorBio,
  pullQuoteAuthor,
  content,
  tocItems,
  tags,
  postUrl,
  ctaTitle,
  ctaSubtitle,
  ctaButtonLabel,
  relatedPosts,
}: BlogPostViewProps) {
  const isTr = lang === 'tr';
  const base = `/${lang}`;
  const shareText = encodeURIComponent(post.title);
  const shareUrl = encodeURIComponent(postUrl);
  const shareLinkClass =
    'inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#EDEDED] text-[#525252] transition-colors hover:border-[#0A0A0A] hover:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]';

  return (
    <>

      {/* ─── Hero · lime bg + read time + title + byline ─── */}
      <section className="relative overflow-hidden bg-[#C6F24E] px-5 sm:px-10 pt-[60px] sm:pt-16 pb-[60px] sm:pb-20">
        <svg
          aria-hidden
          viewBox="0 0 300 200"
          className="pointer-events-none absolute bottom-0 right-12 hidden w-[400px] opacity-[0.15] sm:block"
        >
          <path
            d="M0 150 L40 120 L80 140 L120 90 L160 100 L200 60 L240 80 L280 40 L300 30"
            fill="none"
            stroke="#0A0A0A"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="200" cy="60" r="12" fill="#0A0A0A" />
          <circle cx="280" cy="40" r="8" fill="#0A0A0A" />
        </svg>

        {/* Same grid as the content below, so the title lines up with the
            article column on desktop. */}
        <div className="relative mx-auto grid max-w-[1280px] grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_260px] lg:gap-x-14">
          <div className="lg:col-span-2 lg:col-start-2">
            <Link
              href={`${base}/blog`}
              className="pulse-eyebrow inline-flex min-h-[44px] items-center gap-2 text-[#0A0A0A]/80 hover:text-[#0A0A0A] mb-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] rounded-sm"
            >
              <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
              {backLabel}
            </Link>

            <div className="max-w-[820px]">
              <p className="pulse-eyebrow text-[#0A0A0A]">
                Blog · {post.readTime}
              </p>
              <h1 className="mt-3 sm:mt-4 text-balance text-[32px] sm:text-[44px] lg:text-[52px] leading-[1.05] tracking-[-0.03em] text-[#0A0A0A]">
                {post.title}
              </h1>

              <div className="mt-6 sm:mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
                <div className="flex items-center gap-2.5">
                  <div
                    aria-hidden="true"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A0A0A] text-[13px] font-semibold text-[#C6F24E]"
                  >
                    {authorInitials(author)}
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-[#0A0A0A]">{author}</div>
                    {authorRole ? <div className="text-[12px] text-[#0A0A0A]/75">{authorRole}</div> : null}
                  </div>
                </div>
                <div className="text-[13px] text-[#0A0A0A]/80">
                  {publishedIso ? <time dateTime={publishedIso}>{post.date}</time> : post.date}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Content grid · 3-col (TOC + article + meta) ─── */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-20">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 lg:grid-cols-[240px_minmax(0,1fr)_260px] lg:gap-14">
          {/* ── LEFT — TOC + reading progress + share (desktop) ── */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 flex flex-col gap-5">
              {tocItems.length > 0 && (
                <nav aria-label={isTr ? 'İçindekiler' : 'Contents'}>
                  <div className="pulse-eyebrow text-[#737373]">
                    {isTr ? 'İçindekiler' : 'Contents'}
                  </div>
                  <ol className="mt-3.5 flex flex-col border-l border-[#EDEDED]">
                    {tocItems.map((item, index) => (
                      <li key={`${item.id}-${index}`}>
                        <a
                          href={`#${item.id}`}
                          className="relative -ml-px block border-l-2 border-transparent py-2.5 pl-4 text-[13px] leading-[1.4] text-[#525252] transition-colors hover:border-[#C6F24E] hover:text-[#0A0A0A]"
                        >
                          <span
                            className="mr-2 text-[10px] tracking-[0.08em] text-[#737373]"
                            style={{ fontFamily: 'var(--font-mono)' }}
                          >
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          {item.text}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              )}

              <BlogReadingProgress readTime={post.readTime} locale={lang} />

              <div className="border-t border-[#EDEDED] pt-5">
                <div className="pulse-eyebrow text-[#737373]">
                  {isTr ? 'Paylaş' : 'Share'}
                </div>
                <div className="mt-3 flex gap-1.5">
                  <a
                    href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={isTr ? "X'te paylaş" : 'Share on X'}
                    className={shareLinkClass}
                  >
                    {SHARE_ICONS.twitter}
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={isTr ? "LinkedIn'de paylaş" : 'Share on LinkedIn'}
                    className={shareLinkClass}
                  >
                    {SHARE_ICONS.linkedin}
                  </a>
                  <a
                    href={`https://api.whatsapp.com/send?text=${shareText}%20${shareUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={isTr ? "WhatsApp'ta paylaş" : 'Share on WhatsApp'}
                    className={shareLinkClass}
                  >
                    {SHARE_ICONS.whatsapp}
                  </a>
                  <BlogCopyLinkButton url={postUrl} locale={lang} />
                </div>
              </div>
            </div>
          </aside>

          {/* ── CENTER — Article + CTA ── */}
          <div className="min-w-0 lg:max-w-[680px]">
            {tocItems.length > 1 && (
              <details className="group mb-8 rounded-[16px] border border-[#EDEDED] bg-[#FAFAFA] lg:hidden">
                <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 px-5 text-[15px] font-semibold text-[#0A0A0A] [&::-webkit-details-marker]:hidden">
                  {isTr ? 'İçindekiler' : 'Contents'}
                  <span aria-hidden="true" className="text-[18px] leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <ol className="space-y-1 px-5 pb-4">
                  {tocItems.map((item, index) => (
                    <li key={`m-${item.id}-${index}`}>
                      <a
                        href={`#${item.id}`}
                        className="flex min-h-[40px] items-center gap-3 text-[14px] leading-[1.4] text-[#333333] hover:text-[#0A0A0A]"
                      >
                        <span className="text-[11px] text-[#737373]" style={{ fontFamily: 'var(--font-mono)' }}>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        {item.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </details>
            )}

            <article id="article-body">
              <div className="pulse-blog-lead">{post.description}</div>

              <div
                className="pulse-blog-content prose prose-lg max-w-none
                  prose-headings:font-medium prose-headings:text-[#0A0A0A] prose-headings:tracking-[-0.02em]
                  prose-h2:text-[26px] sm:prose-h2:text-[32px] prose-h2:mt-12 prose-h2:mb-4 prose-h2:scroll-mt-24
                  prose-h3:text-[20px] prose-h3:mt-8 prose-h3:mb-3
                  prose-p:text-[#525252] prose-p:leading-[1.75] prose-p:mb-6 prose-p:text-[16px]
                  prose-strong:font-semibold prose-strong:text-[#0A0A0A]
                  prose-a:text-[#0A0A0A] prose-a:font-medium prose-a:underline prose-a:decoration-[#C6F24E] prose-a:decoration-2 prose-a:underline-offset-4 hover:prose-a:text-[#525252]
                  prose-li:text-[#525252] prose-li:leading-[1.7]
                  prose-blockquote:not-italic
                  prose-img:rounded-2xl prose-img:border prose-img:border-[#EDEDED]
                  prose-hr:border-[#EDEDED]
                  break-words"
                style={{ fontFamily: 'var(--font-body)' }}
                dangerouslySetInnerHTML={{ __html: content }}
              />

              {post.pullQuote && (
                <figure className="my-14 border-y border-[#0A0A0A] py-9">
                  <blockquote
                    className="text-[22px] sm:text-[28px] font-medium leading-[1.25] tracking-[-0.02em] text-[#0A0A0A]"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    <span aria-hidden="true" className="mr-1.5 text-[#A8D62E]">&ldquo;</span>
                    {post.pullQuote}
                    <span aria-hidden="true" className="ml-1 text-[#A8D62E]">&rdquo;</span>
                  </blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    <div
                      aria-hidden="true"
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A0A0A] text-[13px] font-semibold text-[#C6F24E]"
                    >
                      {authorInitials(pullQuoteAuthor)}
                    </div>
                    <div className="text-[14px] font-semibold text-[#0A0A0A]">{pullQuoteAuthor}</div>
                  </figcaption>
                </figure>
              )}

              <div className="mt-10 flex flex-wrap items-center gap-2">
                <span className="pulse-eyebrow text-[#737373] mr-1">
                  {isTr ? 'Etiketler' : 'Tags'}
                </span>
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#F2F2F2] px-3 py-1.5 text-[12px] tracking-[0.04em] text-[#525252]"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </article>

            <section
              aria-labelledby="post-cta-title"
              className="mt-12 grid grid-cols-1 gap-6 rounded-[20px] bg-[#0A0A0A] p-7 text-white sm:grid-cols-[1fr_auto] sm:items-center sm:gap-8 sm:p-9"
            >
              <div>
                <h2
                  id="post-cta-title"
                  className="text-balance text-[24px] sm:text-[28px] leading-[1.15] tracking-[-0.02em] text-white"
                >
                  {ctaTitle}
                </h2>
                <p className="mt-2 text-[14px] leading-[1.6] text-white/75">{ctaSubtitle}</p>
              </div>
              <Link
                href={`${base}/auth/register`}
                rel="nofollow"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 self-start rounded-full bg-[#C6F24E] px-6 text-[15px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#A8D62E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] sm:self-auto"
              >
                {ctaButtonLabel}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </section>
          </div>

          {/* ── RIGHT — Author + related + newsletter ── */}
          <aside aria-label={isTr ? 'Yazar ve ilgili yazılar' : 'Author and related posts'}>
            <div className="lg:sticky lg:top-24 flex flex-col gap-5">
              <div className="rounded-[16px] border border-[#EDEDED] bg-white p-5">
                <div className="pulse-eyebrow text-[#737373]">
                  {isTr ? 'Yazar' : 'Author'}
                </div>
                <div className="mt-3.5 flex items-center gap-3">
                  <div
                    aria-hidden="true"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0A0A0A] text-[14px] font-semibold text-[#C6F24E]"
                  >
                    {authorInitials(author)}
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-[#0A0A0A]">{author}</div>
                    {authorRole ? <div className="text-[12px] text-[#525252]">{authorRole}</div> : null}
                  </div>
                </div>
                {authorBio ? <p className="mt-3 text-[13px] leading-[1.55] text-[#525252]">{authorBio}</p> : null}
                <Link
                  href={`${base}/about`}
                  className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 text-[13px] font-semibold text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-4 hover:decoration-[#0A0A0A]"
                >
                  {isTr ? 'Buaze hakkında' : 'About Buaze'}
                  <ArrowRight size={13} aria-hidden="true" />
                </Link>
              </div>

              {relatedPosts.length > 0 && (
                <div className="rounded-[16px] border border-[#EDEDED] bg-white p-5">
                  <div className="pulse-eyebrow text-[#737373]">
                    {isTr ? 'İlgili yazılar' : 'Related posts'}
                  </div>
                  <ul className="mt-3.5 flex flex-col gap-3">
                    {relatedPosts.map((rp, i) => (
                      <li
                        key={rp.slug}
                        className={i < relatedPosts.length - 1 ? 'border-b border-[#EDEDED] pb-3' : ''}
                      >
                        <Link href={`${base}/blog/${rp.slug}`} className="group block">
                          <div
                            className="text-[14px] font-semibold leading-[1.3] tracking-[-0.01em] text-[#0A0A0A] group-hover:underline group-hover:decoration-[#C6F24E] group-hover:decoration-2 group-hover:underline-offset-4"
                            style={{ fontFamily: 'var(--font-heading)' }}
                          >
                            {rp.title}
                          </div>
                          <div className="mt-1.5 text-[12px] text-[#737373]">
                            {rp.readTime} · {rp.date}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-[16px] bg-[#0A0A0A] p-5 text-white">
                <div className="pulse-eyebrow text-[#C6F24E]">
                  {isTr ? 'Bülten' : 'Newsletter'}
                </div>
                <div
                  className="mt-2 text-[18px] font-medium leading-[1.2] tracking-[-0.015em]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {isTr ? 'Ayda bir e-posta' : 'One e-mail a month'}
                </div>
                <p className="mt-2 text-[13px] leading-[1.55] text-white/75">
                  {isTr
                    ? 'Son blog yazılarımızı ayda bir e-postayla gönderiyoruz. Her e-postada abonelikten çıkma bağlantısı bulunur.'
                    : 'We send our latest blog posts by e-mail once a month. Every e-mail has an unsubscribe link.'}
                </p>
                <div className="mt-3.5">
                  <NewsletterSignup locale={lang} source="blog_inline" stacked />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
