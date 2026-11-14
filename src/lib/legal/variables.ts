import { prisma } from '@/lib/prisma';

/**
 * Hukuki metinlerde kullanılan placeholder değişkenleri için kanonik
 * katalog. Yeni placeholder eklemek için bu listeye girmek **şart**:
 *
 *  1) Burada `{ key, label, defaultValue, description, group }` ekle
 *  2) Template'lerde `{{KEY}}` syntax'ı ile referans ver
 *  3) Admin paneli `/admin/legal-documents/variables` üzerinden değer girer
 *
 * Tanımsız placeholder'lar template'te kalırsa render edilirken
 * `{{UNKNOWN_KEY}}` olarak ham basılır (sessiz fail; admin UI bunu yakalar).
 */
export interface LegalVariableDef {
  key: string;
  label: { tr: string; en: string };
  defaultValue: string;
  description: { tr: string; en: string };
  /** Admin UI gruplama */
  group: 'company' | 'contact' | 'commercial' | 'retention';
}

export const LEGAL_VARIABLE_CATALOG: LegalVariableDef[] = [
  // ─── Company ─────────────────────────────────────────────────────────
  {
    key: 'COMPANY_NAME',
    label: { tr: 'Şirket unvanı', en: 'Company name' },
    defaultValue: 'Buaze',
    description: {
      tr: 'Tüm metinlerde geçen tam ticari unvan (ör. "Buaze Bilişim A.Ş.").',
      en: 'Full registered company name used across documents.',
    },
    group: 'company',
  },
  {
    key: 'COMPANY_ADDRESS',
    label: { tr: 'Şirket adresi', en: 'Company address' },
    defaultValue: '[Şirket adresinizi buraya girin]',
    description: {
      tr: 'Tebligat adresi — KVKK başvuru ve mesafeli sözleşme için zorunlu.',
      en: 'Notification address — required for KVKK applications + distance contract.',
    },
    group: 'company',
  },
  {
    key: 'COMPANY_TAX_ID',
    label: { tr: 'Vergi / Mersis no', en: 'Tax / Mersis number' },
    defaultValue: '[VKN veya MERSIS]',
    description: {
      tr: 'Vergi numarası veya MERSIS numarası (TBK ve TKHK gereği).',
      en: 'Tax number or MERSIS registration number.',
    },
    group: 'company',
  },
  {
    key: 'COMPANY_PHONE',
    label: { tr: 'Şirket telefonu', en: 'Company phone' },
    defaultValue: '[Telefon]',
    description: {
      tr: 'Mesafeli Sözleşmeler Yönetmeliği gereği tüketicinin ulaşabileceği telefon.',
      en: 'Phone for consumers per Turkish Distance Contract Regulation.',
    },
    group: 'company',
  },
  {
    key: 'COMPANY_COURT_CITY',
    label: { tr: 'Yetkili mahkeme şehri', en: 'Jurisdiction city' },
    defaultValue: 'İstanbul',
    description: {
      tr: 'Tüketici sıfatı taşımayan ihtilaflarda yetkili mahkeme + icra dairesi şehri.',
      en: 'City whose courts have jurisdiction for non-consumer disputes.',
    },
    group: 'company',
  },

  // ─── Contact ────────────────────────────────────────────────────────
  {
    key: 'KVKK_CONTACT_EMAIL',
    label: { tr: 'KVKK iletişim e-postası', en: 'KVKK contact e-mail' },
    defaultValue: 'support@buaze.com',
    description: {
      tr: 'KVKK m.11 başvuruları + veri ihlali bildirimleri için.',
      en: 'For KVKK Art.11 applications + data breach notifications.',
    },
    group: 'contact',
  },
  {
    key: 'LEGAL_CONTACT_EMAIL',
    label: { tr: 'Hukuk iletişim e-postası', en: 'Legal contact e-mail' },
    defaultValue: 'support@buaze.com',
    description: {
      tr: 'Genel hukuki yazışma — sözleşme, fesih, cayma talepleri.',
      en: 'General legal correspondence — contracts, termination, withdrawal.',
    },
    group: 'contact',
  },
  {
    key: 'SUPPORT_EMAIL',
    label: { tr: 'Destek e-postası', en: 'Support e-mail' },
    defaultValue: 'support@buaze.com',
    description: {
      tr: 'Teknik destek talepleri için.',
      en: 'For technical support requests.',
    },
    group: 'contact',
  },

  // ─── Commercial ─────────────────────────────────────────────────────
  {
    key: 'PRICING_PAGE_URL',
    label: { tr: 'Fiyatlandırma URL', en: 'Pricing page URL' },
    defaultValue: 'https://www.buaze.com/tr/pricing',
    description: {
      tr: 'Mesafeli Sözleşme — KDV dahil bedellerin gösterildiği sayfa.',
      en: 'Distance Contract — page where VAT-inclusive prices are shown.',
    },
    group: 'commercial',
  },
  {
    key: 'PAYMENT_PROVIDER',
    label: { tr: 'Ödeme sağlayıcı', en: 'Payment provider' },
    defaultValue: 'Dodo Payments',
    description: {
      tr: 'Kart bilgilerini PCI-DSS standardında işleyen kuruluş.',
      en: 'Payment processor handling card data under PCI-DSS.',
    },
    group: 'commercial',
  },
  {
    key: 'BILLING_CYCLE',
    label: { tr: 'Faturalandırma dönemi', en: 'Billing cycle' },
    defaultValue: 'aylık',
    description: {
      tr: 'Aylık / yıllık (kullanıcının seçtiği plana göre adlandırma).',
      en: 'Monthly / yearly — labelling for the chosen plan.',
    },
    group: 'commercial',
  },
  {
    key: 'TRIAL_DAYS',
    label: { tr: 'Deneme süresi (gün)', en: 'Trial period (days)' },
    defaultValue: '14',
    description: {
      tr: 'Yeni abonelik için ücretsiz deneme süresi.',
      en: 'Free trial duration for new subscriptions.',
    },
    group: 'commercial',
  },
  {
    key: 'SLA_AVAILABILITY',
    label: { tr: 'SLA hedef erişilebilirlik (%)', en: 'SLA target availability (%)' },
    defaultValue: '99.5',
    description: {
      tr: 'Aylık ortalama erişilebilirlik hedefi.',
      en: 'Monthly average uptime target.',
    },
    group: 'commercial',
  },
  {
    key: 'SUPPORT_RESPONSE_HOURS',
    label: { tr: 'Destek ilk yanıt (saat)', en: 'Support first response (hours)' },
    defaultValue: '24',
    description: {
      tr: 'Destek talebine ilk yanıt taahhüdü.',
      en: 'Commitment for first response to support requests.',
    },
    group: 'commercial',
  },
  {
    key: 'TKHK_THRESHOLD_AMOUNT',
    label: { tr: 'Tüketici Hakem Heyeti eşiği (TL)', en: 'Consumer Arbitration threshold (TRY)' },
    defaultValue: '149.620',
    description: {
      tr: '6502 sayılı Kanun parasal sınır — Adalet Bakanlığı her yıl açıklar.',
      en: 'Statutory threshold updated annually by Turkish Ministry.',
    },
    group: 'commercial',
  },

  // ─── Retention ──────────────────────────────────────────────────────
  {
    key: 'IP_RETENTION_DAYS',
    label: { tr: 'IP saklama süresi (gün)', en: 'IP retention (days)' },
    defaultValue: '90',
    description: {
      tr: 'KVKK veri minimizasyonu — IP adresi anonimleştirme süresi.',
      en: 'IP anonymisation period under KVKK data minimisation.',
    },
    group: 'retention',
  },
  {
    key: 'REVIEW_RETENTION_MONTHS',
    label: { tr: 'Yorum saklama süresi (ay)', en: 'Review retention (months)' },
    defaultValue: '24',
    description: {
      tr: 'Müşteri yorumları için aktif iş ilişkisi sonrası saklama.',
      en: 'Customer review retention after active relationship ends.',
    },
    group: 'retention',
  },
  {
    key: 'ANALYTICS_PROVIDER',
    label: { tr: 'Analitik sağlayıcı', en: 'Analytics provider' },
    defaultValue: 'Vercel Analytics',
    description: {
      tr: 'Çerez politikasında listelenen analitik altyapısı.',
      en: 'Analytics infrastructure listed in the cookie policy.',
    },
    group: 'retention',
  },
];

export const LEGAL_VARIABLE_KEYS = LEGAL_VARIABLE_CATALOG.map((v) => v.key);

export function getDefaultLegalVariableMap(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const def of LEGAL_VARIABLE_CATALOG) out[def.key] = def.defaultValue;
  return out;
}

interface CacheEntry {
  expiresAt: number;
  data: Record<string, string>;
}

let cache: CacheEntry | null = null;
const CACHE_TTL_MS = 60_000;

/**
 * Tüm değişken değerlerini DB'den okur, eksikleri default'lardan tamamlar.
 * Sonuç memoize edilir (60sn TTL); admin PATCH sonrası invalidate çağrılır.
 */
export async function loadLegalVariableMap(): Promise<Record<string, string>> {
  if (cache && cache.expiresAt > Date.now()) return cache.data;

  const defaults = getDefaultLegalVariableMap();
  let stored: Record<string, string> = {};
  try {
    const rows = await prisma.legalVariable.findMany({
      select: { key: true, value: true },
    });
    stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  } catch (err) {
    console.error('[legal] loadLegalVariableMap failed; using defaults', err);
  }

  const merged = { ...defaults, ...stored };
  cache = { expiresAt: Date.now() + CACHE_TTL_MS, data: merged };
  return merged;
}

/**
 * Registered company name (admin → Hukuki metinler → Değişkenler →
 * COMPANY_NAME) for the public footer and Organization JSON-LD `legalName`.
 * Returns null while the value is still the plain-brand default or a
 * "[placeholder]", so no unregistered legal entity is ever published.
 */
export async function getCompanyLegalInfo(): Promise<{ name: string | null; address: string | null }> {
  const map = await loadLegalVariableMap();
  const clean = (v: string | undefined, plainDefault?: string) => {
    const t = (v ?? '').trim();
    if (!t || t.startsWith('[') || (plainDefault && t === plainDefault)) return null;
    return t;
  };
  return { name: clean(map.COMPANY_NAME, 'Buaze'), address: clean(map.COMPANY_ADDRESS) };
}

export function invalidateLegalVariableCache() {
  cache = null;
}

/**
 * Metin içindeki `{{KEY}}` placeholder'larını gerçek değerlerle değiştirir.
 * Tanımsız anahtarlar dokunulmaz (admin UI bunu yakalayıp uyarır).
 *
 * Whitelist: yalnız `LEGAL_VARIABLE_KEYS` katalogundaki anahtarlar substitute
 * edilir — admin DB'ye custom anahtar ekleyemez (sadece value değiştirebilir),
 * bu da içerik içine talimatsız enjeksiyon yapma riskini sıfırlar.
 */
const PLACEHOLDER_REGEX = /\{\{([A-Z][A-Z0-9_]+)\}\}/g;

export function substituteLegalVariables(
  content: string,
  vars: Record<string, string>,
): string {
  return content.replace(PLACEHOLDER_REGEX, (match, key) => {
    if (!Object.prototype.hasOwnProperty.call(vars, key)) return match;
    return vars[key];
  });
}

/** Bir metin içinde geçen tüm `{{KEY}}` token'larını döker (admin UI için). */
export function extractPlaceholders(content: string): string[] {
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(PLACEHOLDER_REGEX);
  while ((m = re.exec(content)) !== null) {
    found.add(m[1]);
  }
  return Array.from(found);
}
