/**
 * Google reviews widget options (CLAUDE.md §53, §56). The public URL keeps
 * its query (`/embed/{slug}/google?theme=dark&limit=3&lang=en`, as owners
 * copied it); middleware rewrites it to a path segment
 * (`/embed/{slug}/google/dark-3-en`) so each variant is a cached (ISR) page
 * instead of a server render per view. Pure: used by middleware (edge) and
 * the page.
 */
export type EmbedTheme = 'light' | 'dark';
export type EmbedLang = 'tr' | 'en';

export interface EmbedOptions {
  theme: EmbedTheme;
  limit: number;
  lang: EmbedLang;
}

function clampLimit(raw: string | null | undefined): number {
  return Math.min(10, Math.max(1, Number.parseInt(raw ?? '', 10) || 5));
}

export function embedOptionsFromQuery(q: {
  theme?: string | null;
  limit?: string | null;
  lang?: string | null;
}): EmbedOptions {
  return {
    theme: q.theme === 'dark' ? 'dark' : 'light',
    limit: clampLimit(q.limit),
    lang: q.lang === 'en' ? 'en' : 'tr',
  };
}

export function embedVariant(o: EmbedOptions): string {
  return `${o.theme}-${o.limit}-${o.lang}`;
}

/** Path segment → options; anything unexpected falls back to the defaults. */
export function parseEmbedVariant(variant: string): EmbedOptions {
  const [theme, limit, lang] = variant.split('-');
  return embedOptionsFromQuery({ theme, limit, lang });
}

/** `/embed/{slug}/google` → slug, else null. */
export function embedGoogleSlug(pathname: string): string | null {
  const m = /^\/embed\/([^/]+)\/google\/?$/.exec(pathname);
  return m ? m[1] : null;
}
