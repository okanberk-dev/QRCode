import { prisma } from '@/lib/prisma';
import type { LegalDocumentKey, LegalLocale } from './keys';
import { loadActiveLegalDocument } from './loader';
import type { ConsentSource, ConsentSubjectType } from './keys';

/**
 * Onay log'u kaydeder. Admin paneli "Müşteri X bu sözleşmenin Y. versiyonuna
 * Z tarihinde onay verdi" sorusunu cevaplayabilsin diye snapshot fields
 * (documentKey/locale/version) denormalize tutulur — belge silinse bile
 * audit log kalır.
 *
 * Hata fırlatmaz; consent yazımı sırasındaki herhangi bir patlama
 * çağıran request'i (kayıt, feedback submit) kırmamalı. console.error ile
 * Sentry'ye düşer (CLAUDE.md §26).
 */
export async function recordConsent(input: {
  key: LegalDocumentKey;
  locale: LegalLocale;
  subjectType: ConsentSubjectType;
  subjectId: string;
  source: ConsentSource;
  granted?: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    const snapshot = await loadActiveLegalDocument(input.key, input.locale);
    await prisma.legalConsent.create({
      data: {
        documentId: snapshot.source === 'db'
          ? await resolveDocumentId(input.key, input.locale)
          : null,
        documentKey: input.key,
        locale: input.locale,
        version: snapshot.version,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        source: input.source,
        granted: input.granted ?? true,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (err) {
    console.error('[legal] recordConsent failed', {
      key: input.key,
      locale: input.locale,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      err,
    });
  }
}

async function resolveDocumentId(
  key: LegalDocumentKey,
  locale: LegalLocale,
): Promise<string | null> {
  try {
    const row = await prisma.legalDocument.findUnique({
      where: { key_locale: { key, locale } },
      select: { id: true },
    });
    return row?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Birden çok belge için tek seferde consent log'u (review form aynı
 * anda KVKK + ticari ileti onayı topluyor). Concurrent execute'lu — her
 * kayıt bağımsız, biri hata atarsa diğeri etkilenmez.
 */
export async function recordConsentBatch(
  base: Omit<Parameters<typeof recordConsent>[0], 'key' | 'granted'>,
  items: Array<{ key: LegalDocumentKey; granted?: boolean }>,
): Promise<void> {
  await Promise.allSettled(
    items.map((item) =>
      recordConsent({
        ...base,
        key: item.key,
        granted: item.granted,
      }),
    ),
  );
}
