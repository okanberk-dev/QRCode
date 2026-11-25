/**
 * Google reviews widget options (CLAUDE.md §53, §56). The public URL keeps
 * its query (`/embed/{slug}/google?theme=dark&limit=3&lang=en`, as owners
 * copied it); next.config rewrites it to a path segment
 * (`/embed/{slug}/google/dark-3-en`) so each variant is a cached (ISR) page
 * instead of a server render per view. A middleware rewrite would not do:
 * Next renders middleware-rewritten requests dynamically (no ISR cache).
 * Pure: used by next.config and the page.
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

type HasCondition = { type: 'query'; key: string; value?: string };
export interface EmbedRewrite {
  source: string;
  has?: HasCondition[];
  missing?: HasCondition[];
  destination: string;
}

const EMBED_PARAMS = [
  { key: 'theme', re: '(?<theme>light|dark)', fallback: 'light' },
  { key: 'limit', re: '(?<limit>[1-9]|10)', fallback: '5' },
  { key: 'lang', re: '(?<lang>tr|en)', fallback: 'tr' },
] as const;

/**
 * next.config `beforeFiles` rewrites: one rule per combination of present /
 * missing valid options (8), then a catch-all with the defaults for any
 * other query (e.g. an out-of-range limit).
 */
export function embedGoogleRewrites(): EmbedRewrite[] {
  const rules: EmbedRewrite[] = [];
  for (let mask = 7; mask >= 0; mask--) {
    const has: HasCondition[] = [];
    const missing: HasCondition[] = [];
    const parts: string[] = [];
    EMBED_PARAMS.forEach((p, i) => {
      if (mask & (1 << i)) {
        has.push({ type: 'query', key: p.key, value: p.re });
        parts.push(`:${p.key}`);
      } else {
        missing.push({ type: 'query', key: p.key });
        parts.push(p.fallback);
      }
    });
    rules.push({
      source: '/embed/:slug/google',
      ...(has.length ? { has } : {}),
      ...(missing.length ? { missing } : {}),
      destination: `/embed/:slug/google/${parts.join('-')}`,
    });
  }
  rules.push({ source: '/embed/:slug/google', destination: '/embed/:slug/google/light-5-tr' });
  return rules;
}
