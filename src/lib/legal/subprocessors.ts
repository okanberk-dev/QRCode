/**
 * Single source of truth for where Buaze runs and which outside services
 * process data (CLAUDE.md §55, §59). The DPA, the Google-compliance page,
 * the Pulse AI page and the home "Customer data" block all read from here;
 * legal templates use the {{SUBPROCESSOR_TABLE}} / {{SUBPROCESSOR_TRANSFER_LIST}}
 * placeholders, filled in by the legal loader.
 */

export type LegalLang = 'tr' | 'en';

type Text = Record<LegalLang, string>;

export interface Subprocessor {
  name: string;
  purpose: Text;
  region: Text;
  /** Data leaves Türkiye/EU for a country without an adequacy decision. */
  transfer: boolean;
}

/** App server, database, files and cache: one server, self-managed. */
export const HOSTING = {
  provider: 'Vultr',
  region: { tr: 'Frankfurt, Almanya (AB)', en: 'Frankfurt, Germany (EU)' } as Text,
  short: { tr: 'AB (Frankfurt)', en: 'EU (Frankfurt)' } as Text,
};

/**
 * AI providers as used in code (src/lib/openai.ts): Anthropic (Claude) is
 * the primary provider for every AI feature; OpenAI is only a backup when
 * no Anthropic key is configured.
 */
export const AI_PRIMARY = 'Anthropic';
export const AI_BACKUP = 'OpenAI';

export const SUBPROCESSORS: Subprocessor[] = [
  {
    name: 'Vultr',
    purpose: {
      tr: 'Sunucu: uygulama, PostgreSQL veritabanı, dosyalar, önbellek ve yedekler (Buaze tarafından yönetilir)',
      en: 'Server: application, PostgreSQL database, files, cache and backups (operated by Buaze)',
    },
    region: HOSTING.region,
    transfer: false,
  },
  {
    name: 'Anthropic',
    purpose: {
      tr: 'Yapay zekâ (Claude): Pulse AI yanıt taslakları, geri bildirim özetleri, analitik konuları, haftalık özet ve yanıt içerik kontrolü',
      en: 'AI (Claude): Pulse AI reply drafts, feedback summaries, analytics topics, the weekly summary and reply content checks',
    },
    region: { tr: 'ABD', en: 'USA' },
    transfer: true,
  },
  {
    name: 'OpenAI',
    purpose: {
      tr: 'Yedek yapay zekâ sağlayıcısı; yalnız Anthropic yapılandırılmadığında aynı işler için',
      en: 'Backup AI provider; used for the same tasks only when Anthropic is not configured',
    },
    region: { tr: 'ABD', en: 'USA' },
    transfer: true,
  },
  {
    name: 'Resend',
    purpose: { tr: 'İşlemsel e-posta gönderimi', en: 'Transactional e-mail' },
    region: { tr: 'ABD', en: 'USA' },
    transfer: true,
  },
  {
    name: 'Sentry',
    purpose: { tr: 'Hata izleme ve performans', en: 'Error tracking and performance' },
    region: { tr: 'ABD', en: 'USA' },
    transfer: true,
  },
  {
    name: 'Google Firebase',
    purpose: { tr: 'Google ile oturum açma', en: 'Sign in with Google' },
    region: { tr: 'AB / ABD', en: 'EU / USA' },
    transfer: true,
  },
  {
    name: 'Google APIs',
    purpose: {
      tr: 'Google Places (işletme arama, puan ve yorum gösterimi) ve Google Business Profile (yorum listeleme ve yanıt)',
      en: 'Google Places (business search, rating and review display) and Google Business Profile (review listing and replies)',
    },
    region: { tr: 'ABD', en: 'USA' },
    transfer: true,
  },
  {
    name: 'Google reCAPTCHA Enterprise',
    purpose: { tr: 'Form ve giriş için bot koruması', en: 'Bot protection on forms and sign-in' },
    region: { tr: 'ABD', en: 'USA' },
    transfer: true,
  },
  {
    name: 'Google Tag Manager / Google Analytics',
    purpose: { tr: 'Site ziyaret ölçümü; yalnız çerez onayıyla', en: 'Website analytics; only with cookie consent' },
    region: { tr: 'ABD', en: 'USA' },
    transfer: true,
  },
  {
    name: 'Yandex Metrica',
    purpose: { tr: 'Site ziyaret ölçümü; yalnız çerez onayıyla', en: 'Website analytics; only with cookie consent' },
    region: { tr: 'Rusya / AB', en: 'Russia / EU' },
    transfer: true,
  },
  {
    name: 'PayNKolay (Nkolay Ödeme Kuruluşu)',
    purpose: {
      tr: 'Kartla ödeme; kart bilgisi Buaze’ye gelmez',
      en: 'Card payments; card details never reach Buaze',
    },
    region: { tr: 'Türkiye', en: 'Türkiye' },
    transfer: false,
  },
];

/**
 * Previous providers, kept only during the rollback window after the move
 * to our own server (CLAUDE.md §55). Remove after the date.
 */
export const TRANSITION = {
  until: '2026-12-08',
  names: ['Supabase', 'Upstash'],
  note: {
    tr: 'Geçiş dönemi: 8 Aralık 2026’ya kadar eski sağlayıcılarda (Supabase, Upstash) yalnız geri dönüş için kopya tutulur; yeni veri yazılmaz. Bu tarihten sonra silinir.',
    en: 'Transition period: until 8 December 2026 a copy is kept at the previous providers (Supabase, Upstash) for rollback only; no new data is written. It is deleted after that date.',
  } as Text,
};

export function transitionActive(now: Date = new Date()): boolean {
  return now.getTime() < Date.parse(`${TRANSITION.until}T23:59:59Z`);
}

function cell(value: string): string {
  return value.replace(/\|/g, '/');
}

export function subprocessorTable(lang: LegalLang, now: Date = new Date()): string {
  const head =
    lang === 'tr'
      ? '| Alt yüklenici | Hizmet kategorisi | Veri lokasyonu |'
      : '| Sub-processor | Service category | Data region |';
  const rows = SUBPROCESSORS.map((s) => `| ${cell(s.name)} | ${cell(s.purpose[lang])} | ${cell(s.region[lang])} |`);
  const table = [head, '|---|---|---|', ...rows].join('\n');
  return transitionActive(now) ? `${table}\n\n${TRANSITION.note[lang]}` : table;
}

/** "Anthropic, OpenAI, Resend, …" — sub-processors that transfer data abroad. */
export function transferList(): string {
  return SUBPROCESSORS.filter((s) => s.transfer).map((s) => s.name).join(', ');
}

/** Values injected into every legal document (not admin-editable). */
export function subprocessorLegalVars(lang: LegalLang, now: Date = new Date()): Record<string, string> {
  return {
    SUBPROCESSOR_TABLE: subprocessorTable(lang, now),
    SUBPROCESSOR_TRANSFER_LIST: transferList(),
    HOSTING_PROVIDER: HOSTING.provider,
    HOSTING_REGION: HOSTING.region[lang],
  };
}

/** Marketing copy, kept here so pages never drift from the table above. */
export const DATA_COPY = {
  hosting: {
    tr: `Veritabanı, dosyalar ve önbellek kendi sunucumuzda, ${HOSTING.provider} ${HOSTING.region.tr} veri merkezinde çalışır; bazı alt işleyiciler ABD’dedir ve Veri İşleyici Sözleşmesi’nde listelenir.`,
    en: `The database, files and cache run on our own server in ${HOSTING.provider}’s ${HOSTING.region.en} data centre; some sub-processors are in the US and are listed in the Data Processing Agreement.`,
  } as Text,
  aiProvider: {
    tr: `${AI_PRIMARY} (Claude); yalnız yedek olarak ${AI_BACKUP}`,
    en: `${AI_PRIMARY} (Claude), with ${AI_BACKUP} only as a backup`,
  } as Text,
  aiSent: {
    tr: `geri bildirim metni yapay zekâ sağlayıcımıza (${AI_PRIMARY}, yedek olarak ${AI_BACKUP}) gönderilir`,
    en: `the feedback text is sent to our AI provider (${AI_PRIMARY}, with ${AI_BACKUP} as a backup)`,
  } as Text,
};
