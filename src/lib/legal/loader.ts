import { prisma } from '@/lib/prisma';
import {
  LEGAL_DOCUMENT_KEYS,
  type LegalDocumentKey,
  type LegalLocale,
  isSupportedLegalKey,
  isSupportedLegalLocale,
} from './keys';
import { getLegalTemplateDefault, type LegalTemplateContent } from './templates';
import { loadLegalVariableMap, substituteLegalVariables } from './variables';

/**
 * In-process cache — Vercel serverless cold start'ta sıfırlanır, kabul
 * edilen eventual-consistency drift. MailTemplate copy-loader pattern'i
 * (CLAUDE.md §21.26) ile aynı 60sn TTL.
 */
const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  expiresAt: number;
  data: LegalDocumentSnapshot | null;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(key: LegalDocumentKey, locale: LegalLocale): string {
  return `${key}:${locale}`;
}

export interface LegalDocumentSnapshot {
  key: LegalDocumentKey;
  locale: LegalLocale;
  title: string;
  description: string;
  content: string;
  version: number;
  isActive: boolean;
  effectiveAt: Date | null;
  updatedAt: Date | null;
  source: 'db' | 'default';
}

/**
 * Aktif belgeyi döner. DB'de aktif satır yoksa (henüz seed edilmemiş veya
 * admin pasifleştirmiş) `templates/` altındaki kod-içi default'a düşer.
 *
 * Defaults için `version: 0` döner — kullanıcı onaylarken "v0" görmek
 * istemez, ConsentLog kayıtlarında bu da bilinçli sinyal: "kullanıcı
 * default şablonu kabul etti, henüz admin onaylanmış sürüm yok".
 */
export async function loadActiveLegalDocument(
  key: LegalDocumentKey,
  locale: LegalLocale,
): Promise<LegalDocumentSnapshot> {
  const k = cacheKey(key, locale);
  const cached = cache.get(k);
  if (cached && cached.expiresAt > Date.now() && cached.data) {
    return cached.data;
  }

  const fallback = (): LegalDocumentSnapshot => {
    const def = getLegalTemplateDefault(key, locale);
    return {
      key,
      locale,
      title: def.title,
      description: def.description,
      content: def.content,
      version: 0,
      isActive: true,
      effectiveAt: null,
      updatedAt: null,
      source: 'default',
    };
  };

  let snapshot: LegalDocumentSnapshot;
  try {
    const row = await prisma.legalDocument.findUnique({
      where: { key_locale: { key, locale } },
      select: {
        key: true,
        locale: true,
        title: true,
        description: true,
        content: true,
        version: true,
        isActive: true,
        effectiveAt: true,
        updatedAt: true,
      },
    });
    if (!row || !row.isActive) {
      snapshot = fallback();
    } else {
      snapshot = {
        key: row.key as LegalDocumentKey,
        locale: row.locale as LegalLocale,
        title: row.title,
        description: row.description ?? getLegalTemplateDefault(key, locale).description,
        content: row.content,
        version: row.version,
        isActive: row.isActive,
        effectiveAt: row.effectiveAt,
        updatedAt: row.updatedAt,
        source: 'db',
      };
    }
  } catch (err) {
    // DB hatası — fallback ver, sayfa kırılmasın. Console log analytics için.
    console.error('[legal] loadActiveLegalDocument failed', { key, locale, err });
    snapshot = fallback();
  }

  cache.set(k, { expiresAt: Date.now() + CACHE_TTL_MS, data: snapshot });
  return snapshot;
}

/**
 * Public surface'lerde kullanılır — ham metin değil, `{{KEY}}` placeholder'ları
 * gerçek değişken değerleriyle doldurulmuş hâli döner. Admin paneli ham (raw)
 * versiyonu görmeli; bu yüzden `loadActiveLegalDocument` ham döndürür ve
 * public sayfa bu helper'ı çağırır.
 */
export async function loadActiveLegalDocumentRendered(
  key: LegalDocumentKey,
  locale: LegalLocale,
): Promise<LegalDocumentSnapshot> {
  const [snapshot, vars] = await Promise.all([
    loadActiveLegalDocument(key, locale),
    loadLegalVariableMap(),
  ]);
  return {
    ...snapshot,
    title: substituteLegalVariables(snapshot.title, vars),
    description: substituteLegalVariables(snapshot.description, vars),
    content: substituteLegalVariables(snapshot.content, vars),
  };
}

/**
 * Liste view'da (footer link'ler vb.) sadece title + meta gerekir; gövde
 * substitute edilmez. `loadActiveLegalDocumentList` için title substitute
 * yeterli olduğundan tek round-trip kullanır.
 */

/**
 * Liste view (owner panel "Yasal metinler" / public footer link
 * üretimi için). Sadece aktif satırlar — pasifleri filtreler.
 */
export async function loadActiveLegalDocumentList(
  locale: LegalLocale,
): Promise<LegalDocumentSnapshot[]> {
  return Promise.all(
    LEGAL_DOCUMENT_KEYS.map((key) => loadActiveLegalDocument(key, locale)),
  );
}

export function invalidateLegalDocumentCache(key?: LegalDocumentKey, locale?: LegalLocale) {
  if (!key) {
    cache.clear();
    return;
  }
  if (!locale) {
    for (const l of ['tr', 'en'] as LegalLocale[]) {
      cache.delete(cacheKey(key, l));
    }
    return;
  }
  cache.delete(cacheKey(key, locale));
}

export {
  isSupportedLegalKey,
  isSupportedLegalLocale,
  type LegalDocumentKey,
  type LegalLocale,
  type LegalTemplateContent,
};
