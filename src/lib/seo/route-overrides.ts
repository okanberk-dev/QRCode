// Route-level priority + changefreq overrides for sitemap auto-discovery.
//
// Auto-discovery (route-discovery.ts) infers metadata from path heuristics.
// This map only carries explicit exceptions — leave alone for the heuristic
// default. Path key is relative to /[locale]/ (no leading slash, '' = home).
//
// CLAUDE.md §7 abstraction discipline: keep this map small. If a category
// grows, prefer a heuristic in route-discovery.ts over per-path entries.

export type ChangeFreq =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never';

export type RouteMeta = {
  priority?: number;
  changefreq?: ChangeFreq;
};

export const ROUTE_OVERRIDES: Record<string, RouteMeta> = {
  // Home + flagship surfaces
  '': { priority: 1.0, changefreq: 'weekly' },
  blog: { priority: 0.9, changefreq: 'weekly' },
  help: { priority: 0.85, changefreq: 'weekly' },
  pricing: { priority: 0.9, changefreq: 'monthly' },

  // Solutions index page (children inherit heuristic 0.9)
  solutions: { priority: 0.85, changefreq: 'monthly' },

  // Comparison surfaces
  compare: { priority: 0.8, changefreq: 'monthly' },
  'vs/individual-qr': { priority: 0.7, changefreq: 'monthly' },
  'vs/spreadsheet': { priority: 0.7, changefreq: 'monthly' },

  // Trust + content
  about: { priority: 0.8, changefreq: 'monthly' },
  contact: { priority: 0.8, changefreq: 'monthly' },
  press: { priority: 0.7, changefreq: 'monthly' },
  faq: { priority: 0.8, changefreq: 'monthly' },
  careers: { priority: 0.7, changefreq: 'monthly' },
  'how-it-works': { priority: 0.8, changefreq: 'monthly' },
  features: { priority: 0.85, changefreq: 'monthly' },
  'features/pulse-ai': { priority: 0.8, changefreq: 'monthly' },
  // Stage 135 §38.215 — Reputation OS suite (audit/surveys/campaigns)
  // detay sayfaları; 0.8 features/pulse-ai paterniyle parity. Tüm 3
  // FAQPage + Service + HowTo + BreadcrumbList JSON-LD taşır.
  'features/audit-center': { priority: 0.8, changefreq: 'monthly' },
  'features/surveys': { priority: 0.8, changefreq: 'monthly' },
  'features/campaigns': { priority: 0.8, changefreq: 'monthly' },
  // /features/review-management + /features/analytics-reports heuristic
  // default 0.7 ile çalışıyor — Stage 134 priority audit gerekiyorsa
  // ayrı PR (kapsam dışı).
  integrations: { priority: 0.8, changefreq: 'monthly' },
  // ROI + google-compliance now ship FAQPage JSON-LD (PR #298 and the
  // 2026-05 compliance copy parity pass); bumped to 0.8 to match `/faq`
  // because they're FAQ-rich-snippet eligible on Google and quotable by
  // AI search engines (Perplexity, Bing Chat, Gemini AIO).
  roi: { priority: 0.8, changefreq: 'monthly' },
  'google-compliance': { priority: 0.8, changefreq: 'monthly' },
  'case-study': { priority: 0.8, changefreq: 'monthly' },
  'customer-stories': { priority: 0.8, changefreq: 'monthly' },

  // Public utility tools
  'solutions/qr-generator': { priority: 0.85, changefreq: 'monthly' },

  // Legal pages — yearly review cycle, lower priority
  privacy: { priority: 0.5, changefreq: 'yearly' },
  terms: { priority: 0.5, changefreq: 'yearly' },
  cookie: { priority: 0.5, changefreq: 'yearly' },
  kvkk: { priority: 0.5, changefreq: 'yearly' },
  gizlilik: { priority: 0.5, changefreq: 'yearly' },
  'acik-riza': { priority: 0.4, changefreq: 'yearly' },
  'ticari-ileti': { priority: 0.4, changefreq: 'yearly' },
  'icerik-moderasyon': { priority: 0.4, changefreq: 'yearly' },
  'kabul-edilebilir-kullanim': { priority: 0.4, changefreq: 'yearly' },
  'kullanim-sozlesmesi': { priority: 0.5, changefreq: 'yearly' },
  'mesafeli-hizmet-sozlesmesi': { priority: 0.4, changefreq: 'yearly' },
  'iade-iptal-politikasi': { priority: 0.4, changefreq: 'yearly' },
  'veri-ihlali-mudahale': { priority: 0.4, changefreq: 'yearly' },
  'veri-isleyici-sozlesmesi': { priority: 0.4, changefreq: 'yearly' },
};
